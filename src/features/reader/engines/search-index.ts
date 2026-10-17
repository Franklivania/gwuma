import { readFileBytes } from "@/features/library/services/library-service";
import {
  ensureBookIndexed,
  upsertBookTextChunks,
} from "@/features/statistics/services/statistics-service";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

const CHUNK_SIZE = 1800;

function chunkText(text: string): string[] {
  const normalized = text.split(/\s+/).filter(Boolean).join(" ");
  if (!normalized) return [];
  const chunks: string[] = [];
  for (let i = 0; i < normalized.length; i += CHUNK_SIZE) {
    chunks.push(normalized.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

export type IndexBookOptions = {
  signal?: AbortSignal;
};

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Indexing aborted", "AbortError");
  }
}

/** Index book text for search. PDF extraction uses pdf.js (engine boundary). */
export async function indexBookForSearch(
  bookId: string,
  format: string,
  path: string,
  options: IndexBookOptions = {},
): Promise<void> {
  const { signal } = options;
  try {
    throwIfAborted(signal);
    const status = await ensureBookIndexed(bookId);
    throwIfAborted(signal);
    if (status.indexed || !status.needsFrontendChunks) return;
    if (format !== "pdf") return;

    const bytes = await readFileBytes(path);
    throwIfAborted(signal);
    const doc = await getDocument({ data: bytes }).promise;
    const parts: string[] = [];
    const maxPages = Math.min(doc.numPages, 200);
    for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
      throwIfAborted(signal);
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? String(item.str) : ""))
        .join(" ");
      if (pageText.trim()) parts.push(pageText);
    }
    throwIfAborted(signal);
    await doc.cleanup();
    const chunks = chunkText(parts.join(" "));
    if (chunks.length > 0) {
      throwIfAborted(signal);
      await upsertBookTextChunks(bookId, chunks);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    console.error("Failed to index book for search", error);
  }
}
