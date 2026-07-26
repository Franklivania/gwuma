pub mod library;
pub mod models;
pub mod reading;
pub mod settings;

use rusqlite::Connection;
use std::path::Path;

const MIGRATION_V1: &str = r#"
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY NOT NULL,
  path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY NOT NULL,
  folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  path TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Unknown',
  cover TEXT,
  format TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  progress REAL NOT NULL DEFAULT 0,
  last_position TEXT,
  last_opened TEXT,
  completed_at TEXT,
  favourite INTEGER NOT NULL DEFAULT 0,
  available INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_books_folder_id ON books(folder_id);
CREATE INDEX IF NOT EXISTS idx_books_available ON books(available);
"#;

pub fn open_database(path: &Path) -> Result<Connection, String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create app data dir: {e}"))?;
    }

    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| e.to_string())?;
    conn.execute_batch(MIGRATION_V1)
        .map_err(|e| e.to_string())?;
    Ok(conn)
}
