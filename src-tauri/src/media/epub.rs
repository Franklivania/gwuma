use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use zip::ZipArchive;

pub struct EpubMeta {
    pub author: Option<String>,
    pub cover_bytes: Option<Vec<u8>>,
    pub cover_ext: Option<String>,
}

fn read_zip_entry<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
    name: &str,
) -> Result<Vec<u8>, String> {
    let mut file = archive
        .by_name(name)
        .map_err(|e| format!("Missing zip entry {name}: {e}"))?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf)
        .map_err(|e| format!("Failed reading {name}: {e}"))?;
    Ok(buf)
}

fn find_zip_entry_ignore_case<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
    target: &str,
) -> Option<String> {
    let target_norm = target.replace('\\', "/").to_ascii_lowercase();
    for i in 0..archive.len() {
        if let Ok(file) = archive.by_index(i) {
            let name = file.name().replace('\\', "/");
            if name.to_ascii_lowercase() == target_norm {
                return Some(name);
            }
        }
    }
    None
}

fn resolve_href(base_dir: &str, href: &str) -> String {
    let href = href.trim().split(['#', '?']).next().unwrap_or(href).trim();
    if href.starts_with('/') {
        return href.trim_start_matches('/').to_string();
    }
    if base_dir.is_empty() {
        return href.to_string();
    }
    let mut parts: Vec<&str> = base_dir.split('/').filter(|p| !p.is_empty()).collect();
    for seg in href.split('/') {
        if seg.is_empty() || seg == "." {
            continue;
        }
        if seg == ".." {
            parts.pop();
        } else {
            parts.push(seg);
        }
    }
    parts.join("/")
}

fn parent_dir(path: &str) -> String {
    match path.rsplit_once('/') {
        Some((dir, _)) => dir.to_string(),
        None => String::new(),
    }
}

fn ext_from_path_or_media(path: &str, media: &str) -> String {
    if let Some(ext) = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
    {
        if matches!(
            ext.as_str(),
            "jpg" | "jpeg" | "png" | "gif" | "webp" | "svg"
        ) {
            return if ext == "jpeg" { "jpg".into() } else { ext };
        }
    }
    match media {
        "image/png" => "png".into(),
        "image/gif" => "gif".into(),
        "image/webp" => "webp".into(),
        "image/svg+xml" => "svg".into(),
        _ => "jpg".into(),
    }
}

fn decode_xml(value: &str) -> String {
    value
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
}

fn attr<'a>(tag: &'a str, name: &str) -> Option<&'a str> {
    let pattern = format!("{name}=\"");
    let start = tag.find(&pattern)? + pattern.len();
    let end = tag[start..].find('"')? + start;
    Some(&tag[start..end])
}

fn attr_ci<'a>(tag: &'a str, name: &str) -> Option<&'a str> {
    let lower = tag.to_ascii_lowercase();
    let pattern = format!("{name}=\"");
    let start = lower.find(&pattern)? + pattern.len();
    let end = tag[start..].find('"')? + start;
    Some(&tag[start..end])
}

fn extract_full_path(container_xml: &str) -> Option<String> {
    let lower = container_xml.to_ascii_lowercase();
    let key = "full-path=\"";
    let start = lower.find(key)? + key.len();
    let end = container_xml[start..].find('"')? + start;
    Some(decode_xml(&container_xml[start..end]).replace('\\', "/"))
}

fn extract_creator(opf: &str) -> Option<String> {
    let lower = opf.to_ascii_lowercase();
    let mut from = 0;
    while let Some(rel) = lower[from..].find("creator") {
        let abs = from + rel;
        let head = &opf[..abs];
        let Some(lt) = head.rfind('<') else {
            from = abs + 7;
            continue;
        };
        let tag = &opf[lt..];
        if tag.starts_with("</") {
            from = abs + 7;
            continue;
        }
        let name_end = tag[1..].find([' ', '>', '/']).map(|i| i + 1).unwrap_or(1);
        let qname = &tag[1..name_end];
        let local = qname.rsplit(':').next().unwrap_or(qname);
        if local != "creator" {
            from = abs + 7;
            continue;
        }
        let Some(gt) = tag.find('>') else {
            from = abs + 7;
            continue;
        };
        if tag.as_bytes().get(gt.saturating_sub(1)) == Some(&b'/') {
            from = abs + 7;
            continue;
        }
        let content_start = lt + gt + 1;
        let rest = &opf[content_start..];
        let rest_lower = rest.to_ascii_lowercase();
        let Some(end_rel) = rest_lower.find("creator>") else {
            from = abs + 7;
            continue;
        };
        let end_slice = &rest[..end_rel];
        let Some(close_lt) = end_slice.rfind("</") else {
            from = abs + 7;
            continue;
        };
        let text = end_slice[..close_lt].trim();
        if !text.is_empty() {
            return Some(decode_xml(text));
        }
        from = abs + 7;
    }
    None
}

fn parse_opf_cover_and_author(
    opf: &str,
    opf_path: &str,
) -> (Option<String>, Option<String>, Option<String>) {
    let author = extract_creator(opf);
    let opf_dir = parent_dir(opf_path);
    let lower = opf.to_ascii_lowercase();

    let mut items: Vec<(String, String, String)> = Vec::new();
    let mut from = 0;
    while let Some(rel) = lower[from..].find("<item") {
        let abs = from + rel;
        let rest = &opf[abs..];
        let Some(gt) = rest.find('>') else {
            break;
        };
        let tag = &rest[..=gt];
        let tag_lower = tag.to_ascii_lowercase();
        if tag_lower.starts_with("<itemref") {
            from = abs + 5;
            continue;
        }

        let id = attr_ci(tag, "id").map(decode_xml);
        let href = attr_ci(tag, "href").map(decode_xml);
        let media = attr_ci(tag, "media-type")
            .or_else(|| attr_ci(tag, "mediatype"))
            .map(decode_xml)
            .unwrap_or_default();
        let props = attr_ci(tag, "properties")
            .map(decode_xml)
            .unwrap_or_default();

        if let (Some(id), Some(href)) = (id, href) {
            if props.split_whitespace().any(|p| p == "cover-image") {
                let path = resolve_href(&opf_dir, &href);
                return (
                    author,
                    Some(path),
                    Some(ext_from_path_or_media(&href, &media)),
                );
            }
            items.push((id, href, media));
        }
        from = abs + gt + 1;
    }

    let mut cover_id: Option<String> = None;
    from = 0;
    while let Some(rel) = lower[from..].find("<meta") {
        let abs = from + rel;
        let rest = &opf[abs..];
        let Some(gt) = rest.find('>') else {
            break;
        };
        let tag = &rest[..=gt];
        let name = attr_ci(tag, "name").map(|s| s.to_ascii_lowercase());
        let content = attr_ci(tag, "content").map(decode_xml);
        if name.as_deref() == Some("cover") {
            cover_id = content;
            break;
        }
        from = abs + gt + 1;
    }

    if let Some(id) = cover_id {
        if let Some((_, href, media)) = items.iter().find(|(i, _, _)| i == &id) {
            let path = resolve_href(&opf_dir, href);
            return (
                author,
                Some(path),
                Some(ext_from_path_or_media(href, media)),
            );
        }
    }

    if let Some((_, href, media)) = items
        .iter()
        .find(|(_, _, media)| media.starts_with("image/"))
    {
        let path = resolve_href(&opf_dir, href);
        return (
            author,
            Some(path),
            Some(ext_from_path_or_media(href, media)),
        );
    }

    let _ = attr;
    (author, None, None)
}

pub fn extract_epub_meta(epub_path: &Path) -> Result<EpubMeta, String> {
    let file = std::fs::File::open(epub_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

    let container_name = find_zip_entry_ignore_case(&mut archive, "META-INF/container.xml")
        .ok_or_else(|| "EPUB missing META-INF/container.xml".to_string())?;
    let container_xml =
        String::from_utf8_lossy(&read_zip_entry(&mut archive, &container_name)?).into_owned();

    let opf_path = extract_full_path(&container_xml)
        .ok_or_else(|| "EPUB container.xml missing full-path".to_string())?;
    let opf_name =
        find_zip_entry_ignore_case(&mut archive, &opf_path).unwrap_or_else(|| opf_path.clone());
    let opf_xml = String::from_utf8_lossy(&read_zip_entry(&mut archive, &opf_name)?).into_owned();

    let (author, cover_path, cover_ext) = parse_opf_cover_and_author(&opf_xml, &opf_path);

    let mut cover_bytes = None;
    let mut ext = cover_ext;
    if let Some(path) = cover_path {
        let name = find_zip_entry_ignore_case(&mut archive, &path).unwrap_or(path);
        if let Ok(bytes) = read_zip_entry(&mut archive, &name) {
            if !bytes.is_empty() {
                if ext.is_none() {
                    ext = Some(ext_from_path_or_media(&name, ""));
                }
                cover_bytes = Some(bytes);
            }
        }
    }

    Ok(EpubMeta {
        author,
        cover_bytes,
        cover_ext: ext,
    })
}

pub fn write_cover_file(
    covers_dir: &Path,
    book_id: &str,
    bytes: &[u8],
    ext: &str,
) -> Result<PathBuf, String> {
    std::fs::create_dir_all(covers_dir).map_err(|e| e.to_string())?;
    let safe_ext = match ext.to_ascii_lowercase().as_str() {
        "png" => "png",
        "gif" => "gif",
        "webp" => "webp",
        "jpg" | "jpeg" => "jpg",
        _ => "jpg",
    };
    let path = covers_dir.join(format!("{book_id}.{safe_ext}"));
    let mut file = std::fs::File::create(&path).map_err(|e| e.to_string())?;
    file.write_all(bytes).map_err(|e| e.to_string())?;
    Ok(path)
}
