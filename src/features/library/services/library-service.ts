import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { Book, Folder, LibrarySnapshot } from "@/types";

function isBookFormat(format: string): format is Book["format"] {
  return format === "pdf" || format === "epub" || format === "txt";
}

function normalizeBook(raw: Book): Book | null {
  if (!isBookFormat(raw.format)) return null;
  return {
    ...raw,
    format: raw.format,
    coverUrl: raw.coverUrl ?? undefined,
    lastPosition: raw.lastPosition ?? null,
    lastOpened: raw.lastOpened ?? null,
  };
}

function normalizeSnapshot(snapshot: LibrarySnapshot): LibrarySnapshot {
  return {
    folders: snapshot.folders,
    books: snapshot.books
      .map(normalizeBook)
      .filter((book): book is Book => book !== null),
  };
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

export async function addFolder(path: string): Promise<Folder> {
  return invoke<Folder>("add_folder", { path });
}

export async function removeFolder(id: string): Promise<void> {
  await invoke("remove_folder", { id });
}

export async function listFolders(): Promise<Folder[]> {
  return invoke<Folder[]>("list_folders");
}

export async function refreshLibrary(): Promise<LibrarySnapshot> {
  const snapshot = await invoke<LibrarySnapshot>("refresh_library");
  return normalizeSnapshot(snapshot);
}

export async function openBook(id: string): Promise<Book> {
  const book = await invoke<Book>("open_book", { id });
  const normalized = normalizeBook(book);
  if (!normalized) throw new Error(`Unsupported book format: ${book.format}`);
  return normalized;
}

export async function saveReadingState(
  id: string,
  progress: number,
  lastPosition: string | null,
): Promise<Book> {
  const book = await invoke<Book>("save_reading_state", {
    id,
    progress,
    lastPosition,
  });
  const normalized = normalizeBook(book);
  if (!normalized) throw new Error(`Unsupported book format: ${book.format}`);
  return normalized;
}

export async function setBookFavourite(
  id: string,
  favourite: boolean,
): Promise<Book> {
  const book = await invoke<Book>("set_book_favourite", { id, favourite });
  const normalized = normalizeBook(book);
  if (!normalized) throw new Error(`Unsupported book format: ${book.format}`);
  return normalized;
}

export async function readTextFile(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}

export async function getSetting(key: string): Promise<string | null> {
  return invoke<string | null>("get_setting", { key });
}

export async function setSetting(key: string, value: string): Promise<void> {
  await invoke("set_setting", { key, value });
}
