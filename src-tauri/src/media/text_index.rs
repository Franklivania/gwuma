use std::io::Read;
use std::path::Path;
use zip::ZipArchive;

const CHUNK_SIZE: usize = 1800;

pub fn chunk_text(text: &str) -> Vec<(i64, String)> {
    let normalized = text.split_whitespace().collect::<Vec<_>>().join(" ");
    if normalized.is_empty() {
        return Vec::new();
    }

    let mut chunks = Vec::new();
    let mut index: i64 = 0;
    let chars: Vec<char> = normalized.chars().collect();
    let mut start = 0usize;
    while start < chars.len() {
        let end = (start + CHUNK_SIZE).min(chars.len());
        let slice: String = chars[start..end].iter().collect();
        chunks.push((index, slice));
        index += 1;
        start = end;
    }
    chunks
}

pub fn extract_txt_chunks(path: &Path) -> Result<Vec<(i64, String)>, String> {
    let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&bytes);
    Ok(chunk_text(&text))
}

fn strip_html(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len());
    let mut in_tag = false;
    for ch in raw.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }
    out.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
}

pub fn extract_epub_chunks(path: &Path) -> Result<Vec<(i64, String)>, String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    let mut combined = String::new();

    let mut names: Vec<String> = Vec::new();
    for i in 0..archive.len() {
        if let Ok(file) = archive.by_index(i) {
            let name = file.name().replace('\\', "/").to_ascii_lowercase();
            if name.ends_with(".xhtml")
                || name.ends_with(".html")
                || name.ends_with(".htm")
                || name.ends_with(".xml")
            {
                if name.contains("meta-inf") || name.ends_with("container.xml") {
                    continue;
                }
                names.push(file.name().to_string());
            }
        }
    }
    names.sort();

    for name in names {
        let mut entry = match archive.by_name(&name) {
            Ok(e) => e,
            Err(_) => continue,
        };
        let mut buf = String::new();
        if entry.read_to_string(&mut buf).is_err() {
            continue;
        }
        let text = strip_html(&buf);
        if !text.trim().is_empty() {
            if !combined.is_empty() {
                combined.push(' ');
            }
            combined.push_str(&text);
        }
    }

    Ok(chunk_text(&combined))
}
