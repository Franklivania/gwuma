use serde::Serialize;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScannedBook {
    pub path: String,
    pub title: String,
    pub format: String,
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

#[tauri::command]
fn scan_folder(path: String) -> Result<Vec<ScannedBook>, String> {
    let root = PathBuf::from(&path);
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![scan_folder, read_text_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
