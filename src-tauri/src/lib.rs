mod db;
mod media;

use db::models::{BookRow, FolderRow, LibrarySnapshot, ScannedBook};
use db::{library, reading, settings};
use rusqlite::Connection;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use walkdir::WalkDir;

pub struct AppState {
    pub db: Mutex<Connection>,
}

fn book_format(path: &Path) -> Option<&'static str> {
    let ext = path.extension()?.to_str()?.to_ascii_lowercase();
    match ext.as_str() {
        "pdf" => Some("pdf"),
        "epub" => Some("epub"),
        "txt" => Some("txt"),
        _ => None,
    }
}

fn scan_folder_path(path: &str) -> Result<Vec<ScannedBook>, String> {
    let root = PathBuf::from(path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {path}"));
    }

    let mut books = Vec::new();

    for entry in WalkDir::new(&root)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if !entry.file_type().is_file() {
            continue;
        }

        let file_path = entry.path();
        let Some(format) = book_format(file_path) else {
            continue;
        };

        let title = file_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled")
            .to_string();

        books.push(ScannedBook {
            path: file_path.to_string_lossy().into_owned(),
            title,
            format: format.to_string(),
        });
    }

    books.sort_by_key(|a| a.title.to_lowercase());
    Ok(books)
}

fn with_db<T>(
    state: &State<'_, AppState>,
    f: impl FnOnce(&Connection) -> Result<T, String>,
) -> Result<T, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Database lock poisoned".to_string())?;
    f(&conn)
}

fn app_data_subdir(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {e}"))?
        .join(name);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn enrich_epub_media(conn: &Connection, covers_dir: &Path) -> Result<(), String> {
    let books = library::list_epubs_needing_media(conn).map_err(|e| e.to_string())?;
    for book in books {
        let meta = match media::epub::extract_epub_meta(Path::new(&book.path)) {
            Ok(meta) => meta,
            Err(err) => {
                eprintln!("EPUB media extract failed for {}: {err}", book.path);
                continue;
            }
        };

        let mut cover_path: Option<String> = None;
        if book
            .cover_url
            .as_ref()
            .map(|c| c.is_empty())
            .unwrap_or(true)
        {
            if let (Some(bytes), Some(ext)) = (meta.cover_bytes, meta.cover_ext) {
                match media::epub::write_cover_file(covers_dir, &book.id, &bytes, &ext) {
                    Ok(path) => cover_path = Some(path.to_string_lossy().into_owned()),
                    Err(err) => eprintln!("Failed writing cover for {}: {err}", book.id),
                }
            }
        }

        let author = meta.author.filter(|a| !a.trim().is_empty());
        let author_update = if book.author == "Unknown" || book.author.is_empty() {
            author.as_deref()
        } else {
            None
        };

        if cover_path.is_some() || author_update.is_some() {
            library::set_book_cover_and_author(
                conn,
                &book.id,
                cover_path.as_deref(),
                author_update,
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn list_folders(state: State<'_, AppState>) -> Result<Vec<FolderRow>, String> {
    with_db(&state, |conn| {
        library::list_folders(conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
fn add_folder(path: String, state: State<'_, AppState>) -> Result<FolderRow, String> {
    with_db(&state, |conn| {
        library::add_folder(conn, &path).map_err(|e| e.to_string())
    })
}

#[tauri::command]
fn remove_folder(id: String, state: State<'_, AppState>) -> Result<(), String> {
    with_db(&state, |conn| {
        library::remove_folder(conn, &id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
fn refresh_library(app: AppHandle, state: State<'_, AppState>) -> Result<LibrarySnapshot, String> {
    let covers_dir = app_data_subdir(&app, "covers")?;
    with_db(&state, |conn| {
        let folders = library::list_folders(conn).map_err(|e| e.to_string())?;

        for folder in &folders {
            let scanned = scan_folder_path(&folder.path)?;
            library::reconcile_scan(conn, &folder.id, &scanned).map_err(|e| e.to_string())?;
        }

        enrich_epub_media(conn, &covers_dir)?;
        library::library_snapshot(conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    let file_path = PathBuf::from(&path);
    let Some(format) = book_format(&file_path) else {
        return Err("Only .txt files can be read in the text reader".into());
    };
    if format != "txt" {
        return Err("Only .txt files can be read in the text reader".into());
    }

    let bytes = std::fs::read(&file_path).map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    let file_path = PathBuf::from(&path);
    let Some(format) = book_format(&file_path) else {
        return Err("Unsupported book format".into());
    };
    if format != "pdf" && format != "epub" {
        return Err("read_file_bytes is for PDF and EPUB files".into());
    }

    std::fs::read(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_book(id: String, state: State<'_, AppState>) -> Result<BookRow, String> {
    with_db(&state, |conn| {
        reading::open_book(conn, &id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Book not found: {id}"))
    })
}

#[tauri::command]
fn save_reading_state(
    id: String,
    progress: f64,
    last_position: Option<String>,
    state: State<'_, AppState>,
) -> Result<BookRow, String> {
    with_db(&state, |conn| {
        reading::save_reading_state(conn, &id, progress, last_position.as_deref())
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Book not found: {id}"))
    })
}

#[tauri::command]
fn set_book_favourite(
    id: String,
    favourite: bool,
    state: State<'_, AppState>,
) -> Result<BookRow, String> {
    with_db(&state, |conn| {
        reading::set_book_favourite(conn, &id, favourite)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Book not found: {id}"))
    })
}

#[tauri::command]
fn get_setting(key: String, state: State<'_, AppState>) -> Result<Option<String>, String> {
    with_db(&state, |conn| {
        settings::get_setting(conn, &key).map_err(|e| e.to_string())
    })
}

#[tauri::command]
fn set_setting(key: String, value: String, state: State<'_, AppState>) -> Result<(), String> {
    with_db(&state, |conn| {
        settings::set_setting(conn, &key, &value).map_err(|e| e.to_string())
    })
}

#[tauri::command]
fn save_cover_bytes(
    id: String,
    bytes: Vec<u8>,
    ext: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<BookRow, String> {
    if bytes.is_empty() {
        return Err("Cover bytes are empty".into());
    }
    let covers_dir = app_data_subdir(&app, "covers")?;
    let path = media::epub::write_cover_file(&covers_dir, &id, &bytes, &ext)?;
    let path_str = path.to_string_lossy().into_owned();
    with_db(&state, |conn| {
        library::set_book_cover(conn, &id, &path_str)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Book not found: {id}"))
    })
}

#[tauri::command]
fn list_books_missing_pdf_covers(state: State<'_, AppState>) -> Result<Vec<BookRow>, String> {
    with_db(&state, |conn| {
        library::list_pdfs_missing_cover(conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
fn load_locations_cache(id: String, app: AppHandle) -> Result<Option<String>, String> {
    let dir = app_data_subdir(&app, "locations")?;
    let path = dir.join(format!("{id}.json"));
    if !path.is_file() {
        return Ok(None);
    }
    let data = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    Ok(Some(data))
}

#[tauri::command]
fn save_locations_cache(id: String, data: String, app: AppHandle) -> Result<(), String> {
    let dir = app_data_subdir(&app, "locations")?;
    let path = dir.join(format!("{id}.json"));
    std::fs::write(path, data).map_err(|e| e.to_string())
}

fn init_database(app: &AppHandle) -> Result<Connection, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;
    let db_path = dir.join("gwuma.db");
    db::open_database(&db_path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let _ = app_data_subdir(app.handle(), "covers");
            let _ = app_data_subdir(app.handle(), "locations");
            let conn = init_database(app.handle())?;
            app.manage(AppState {
                db: Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_folders,
            add_folder,
            remove_folder,
            refresh_library,
            read_text_file,
            read_file_bytes,
            open_book,
            save_reading_state,
            set_book_favourite,
            get_setting,
            set_setting,
            save_cover_bytes,
            list_books_missing_pdf_covers,
            load_locations_cache,
            save_locations_cache,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
