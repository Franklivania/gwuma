mod db;

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
fn refresh_library(state: State<'_, AppState>) -> Result<LibrarySnapshot, String> {
    with_db(&state, |conn| {
        let folders = library::list_folders(conn).map_err(|e| e.to_string())?;

        for folder in &folders {
            let scanned = scan_folder_path(&folder.path)?;
            library::reconcile_scan(conn, &folder.id, &scanned).map_err(|e| e.to_string())?;
        }

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
            open_book,
            save_reading_state,
            set_book_favourite,
            get_setting,
            set_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
