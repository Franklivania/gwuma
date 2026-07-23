import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { Book, Folder } from "@/types";

const STORAGE_KEY = "gwuma.watched-folders";

type ScannedBook = {
  path: string;
  title: string;
  format: "pdf" | "epub" | "txt" | string;
};

function folderNameFromPath(path: string): string {
  const trimmed = path.replace(/[/\\]+$/, "");
  const parts = trimmed.split(/[/\\]/);
  return parts[parts.length - 1] || trimmed;
}

function isBookFormat(format: string): format is Book["format"] {
  return format === "pdf" || format === "epub" || format === "txt";
}

/** Clean filename stems for display: hyphens/underscores → spaces, Title Case. */
export function formatBookTitle(raw: string): string {
  return raw
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function loadFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Folder[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (folder) =>
        typeof folder?.id === "string" &&
        typeof folder?.name === "string" &&
        typeof folder?.path === "string",
    );
  } catch {
    return [];
  }
}

export function saveFolders(folders: Folder[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

export async function pickFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Choose a books folder",
  });

  if (selected === null) return null;
  return typeof selected === "string" ? selected : null;
}

export async function scanFolder(path: string): Promise<Book[]> {
  const scanned = await invoke<ScannedBook[]>("scan_folder", { path });

  const books: Book[] = [];
  for (const entry of scanned) {
    if (!isBookFormat(entry.format)) continue;
    books.push({
      id: entry.path,
      title: formatBookTitle(entry.title),
      author: "Unknown",
      path: entry.path,
      format: entry.format,
      progress: 0,
    });
  }
  return books;
}

export function folderFromPath(path: string): Folder {
  return {
    id: path,
    name: folderNameFromPath(path),
    path,
  };
}

export async function readTextFile(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}
