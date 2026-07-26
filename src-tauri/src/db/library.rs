use super::models::{BookRow, FolderRow, LibrarySnapshot, ScannedBook};
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension, Result as SqlResult};
use uuid::Uuid;

fn folder_name_from_path(path: &str) -> String {
    let trimmed = path.trim_end_matches(['/', '\\']);
    trimmed
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or(trimmed)
        .to_string()
}

pub fn format_book_title(raw: &str) -> String {
    raw.replace(['-', '_'], " ")
        .split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => {
                    first.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase()
                }
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn add_folder(conn: &Connection, path: &str) -> SqlResult<FolderRow> {
    if let Some(existing) = conn
        .query_row(
            "SELECT id, path FROM folders WHERE path = ?1",
            params![path],
            |row| {
                let id: String = row.get(0)?;
                let path: String = row.get(1)?;
                Ok(FolderRow {
                    id,
                    name: folder_name_from_path(&path),
                    path,
                })
            },
        )
        .optional()?
    {
        return Ok(existing);
    }

    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO folders (id, path, created_at) VALUES (?1, ?2, ?3)",
        params![id, path, created_at],
    )?;

    Ok(FolderRow {
        id,
        name: folder_name_from_path(path),
        path: path.to_string(),
    })
}

pub fn remove_folder(conn: &Connection, id: &str) -> SqlResult<()> {
    conn.execute("DELETE FROM folders WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn list_folders(conn: &Connection) -> SqlResult<Vec<FolderRow>> {
    let mut stmt = conn.prepare("SELECT id, path FROM folders ORDER BY path ASC")?;
    let rows = stmt.query_map([], |row| {
        let id: String = row.get(0)?;
        let path: String = row.get(1)?;
        Ok(FolderRow {
            id,
            name: folder_name_from_path(&path),
            path,
        })
    })?;

    rows.collect()
}

fn map_book_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<BookRow> {
    let favourite: i64 = row.get(10)?;
    let available: i64 = row.get(11)?;
    Ok(BookRow {
        id: row.get(0)?,
        folder_id: row.get(1)?,
        title: row.get(2)?,
        author: row.get(3)?,
        path: row.get(4)?,
        format: row.get(5)?,
        cover_url: row.get(6)?,
        status: row.get(7)?,
        progress: row.get(8)?,
        last_position: row.get(9)?,
        last_opened: row.get::<_, Option<String>>(12)?,
        favourite: favourite != 0,
        available: available != 0,
    })
}

const BOOK_SELECT: &str = "
  SELECT id, folder_id, title, author, path, format, cover, status, progress,
         last_position, favourite, available, last_opened
  FROM books
";

pub fn list_books(conn: &Connection, available_only: bool) -> SqlResult<Vec<BookRow>> {
    let sql = if available_only {
        format!("{BOOK_SELECT} WHERE available = 1 ORDER BY title COLLATE NOCASE ASC")
    } else {
        format!("{BOOK_SELECT} ORDER BY title COLLATE NOCASE ASC")
    };

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], map_book_row)?;
    rows.collect()
}

pub fn get_book(conn: &Connection, id: &str) -> SqlResult<Option<BookRow>> {
    let sql = format!("{BOOK_SELECT} WHERE id = ?1");
    conn.query_row(&sql, params![id], map_book_row).optional()
}

pub fn reconcile_scan(
    conn: &Connection,
    folder_id: &str,
    scanned: &[ScannedBook],
) -> SqlResult<()> {
    let tx = conn.unchecked_transaction()?;

    tx.execute(
        "UPDATE books SET available = 0 WHERE folder_id = ?1",
        params![folder_id],
    )?;

    for book in scanned {
        let title = format_book_title(&book.title);
        let existing: Option<String> = tx
            .query_row(
                "SELECT id FROM books WHERE path = ?1",
                params![book.path],
                |row| row.get(0),
            )
            .optional()?;

        if let Some(id) = existing {
            tx.execute(
                "UPDATE books SET folder_id = ?1, title = ?2, format = ?3, available = 1 WHERE id = ?4",
                params![folder_id, title, book.format, id],
            )?;
        } else {
            let id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO books (
                    id, folder_id, path, title, author, cover, format, status,
                    progress, last_position, last_opened, completed_at, favourite, available
                 ) VALUES (?1, ?2, ?3, ?4, 'Unknown', NULL, ?5, 'unread', 0, NULL, NULL, NULL, 0, 1)",
                params![id, folder_id, book.path, title, book.format],
            )?;
        }
    }

    tx.commit()?;
    Ok(())
}

pub fn set_book_cover(conn: &Connection, id: &str, cover_path: &str) -> SqlResult<Option<BookRow>> {
    conn.execute(
        "UPDATE books SET cover = ?1 WHERE id = ?2",
        params![cover_path, id],
    )?;
    get_book(conn, id)
}

pub fn set_book_cover_and_author(
    conn: &Connection,
    id: &str,
    cover_path: Option<&str>,
    author: Option<&str>,
) -> SqlResult<Option<BookRow>> {
    match (cover_path, author) {
        (Some(cover), Some(author)) => {
            conn.execute(
                "UPDATE books SET cover = ?1, author = ?2 WHERE id = ?3",
                params![cover, author, id],
            )?;
        }
        (Some(cover), None) => {
            conn.execute(
                "UPDATE books SET cover = ?1 WHERE id = ?2",
                params![cover, id],
            )?;
        }
        (None, Some(author)) => {
            conn.execute(
                "UPDATE books SET author = ?1 WHERE id = ?2",
                params![author, id],
            )?;
        }
        (None, None) => {}
    }
    get_book(conn, id)
}

/// Books that still need EPUB media enrichment (missing cover and/or Unknown author).
pub fn list_epubs_needing_media(conn: &Connection) -> SqlResult<Vec<BookRow>> {
    let sql = format!(
        "{BOOK_SELECT}
         WHERE available = 1 AND format = 'epub'
           AND (cover IS NULL OR cover = '' OR author = 'Unknown' OR author = '')
         ORDER BY title COLLATE NOCASE ASC"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], map_book_row)?;
    rows.collect()
}

pub fn list_pdfs_missing_cover(conn: &Connection) -> SqlResult<Vec<BookRow>> {
    let sql = format!(
        "{BOOK_SELECT}
         WHERE available = 1 AND format = 'pdf'
         ORDER BY title COLLATE NOCASE ASC"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], map_book_row)?;
    let mut out = Vec::new();
    for row in rows {
        let book = row?;
        let needs = match book.cover_url.as_deref() {
            None | Some("") => true,
            Some(path) => match std::fs::metadata(path) {
                // Blank white thumbs are typically ~1–2KB; regenerate those.
                Ok(meta) => meta.len() < 4096,
                Err(_) => true,
            },
        };
        if needs {
            out.push(book);
        }
    }
    Ok(out)
}

pub fn library_snapshot(conn: &Connection) -> SqlResult<LibrarySnapshot> {
    Ok(LibrarySnapshot {
        folders: list_folders(conn)?,
        books: list_books(conn, true)?,
    })
}
