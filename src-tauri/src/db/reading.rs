use super::library::get_book;
use super::models::BookRow;
use chrono::Utc;
use rusqlite::{params, Connection, Result as SqlResult};

pub fn open_book(conn: &Connection, id: &str) -> SqlResult<Option<BookRow>> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE books SET last_opened = ?1 WHERE id = ?2",
        params![now, id],
    )?;
    get_book(conn, id)
}

pub fn save_reading_state(
    conn: &Connection,
    id: &str,
    progress: f64,
    last_position: Option<&str>,
) -> SqlResult<Option<BookRow>> {
    let progress = progress.clamp(0.0, 100.0);
    let status = if progress >= 99.5 {
        "completed"
    } else if progress > 0.0 {
        "reading"
    } else {
        "unread"
    };

    let completed_at = if status == "completed" {
        Some(Utc::now().to_rfc3339())
    } else {
        None
    };

    conn.execute(
        "UPDATE books SET progress = ?1, last_position = ?2, status = ?3,
         completed_at = CASE WHEN ?4 IS NOT NULL THEN ?4 ELSE completed_at END
         WHERE id = ?5",
        params![progress, last_position, status, completed_at, id],
    )?;

    get_book(conn, id)
}

pub fn set_book_favourite(
    conn: &Connection,
    id: &str,
    favourite: bool,
) -> SqlResult<Option<BookRow>> {
    conn.execute(
        "UPDATE books SET favourite = ?1 WHERE id = ?2",
        params![if favourite { 1 } else { 0 }, id],
    )?;
    get_book(conn, id)
}
