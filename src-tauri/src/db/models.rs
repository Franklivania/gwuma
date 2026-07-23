use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderRow {
    pub id: String,
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookRow {
    pub id: String,
    pub folder_id: String,
    pub title: String,
    pub author: String,
    pub path: String,
    pub format: String,
    pub cover_url: Option<String>,
    pub status: String,
    pub progress: f64,
    pub last_position: Option<String>,
    pub last_opened: Option<String>,
    pub favourite: bool,
    pub available: bool,
}

#[derive(Debug, Clone)]
pub struct ScannedBook {
    pub path: String,
    pub title: String,
    pub format: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibrarySnapshot {
    pub folders: Vec<FolderRow>,
    pub books: Vec<BookRow>,
}
