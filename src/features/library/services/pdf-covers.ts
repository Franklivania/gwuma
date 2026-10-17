import {
  listBooksMissingPdfCovers,
  readFileBytes,
  saveCoverBytes,
} from "@/features/library/services/library-service";
import {
  getBookBytes,
  renderPdfCoverThumbnail,
} from "@/features/reader/engines";
import type { Book } from "@/types";

const BATCH_SIZE = 5;
const BATCH_FLUSH_MS = 250;

export type PdfCoverEnrichOptions = {
  onBatch: (books: Book[]) => void;
  onStatus?: (detail: string) => void;
  onDone?: () => void;
};

let generation = 0;
let enriching = false;

function yieldIdle(): Promise<void> {
  return new Promise((resolve) => {
    const ric = (
      globalThis as unknown as {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
      }
    ).requestIdleCallback;
    if (typeof ric === "function") {
      ric(() => resolve(), { timeout: 500 });
      return;
    }
    setTimeout(resolve, 0);
  });
}

export function cancelPdfCoverEnrichment() {
  generation += 1;
  enriching = false;
}

/**
 * After library refresh, generate missing PDF page-1 cover thumbnails.
 * Idle-friendly: concurrency 1, yields between books, batches store updates.
 */
export async function enrichPdfCovers(
  options: PdfCoverEnrichOptions,
): Promise<void> {
  if (enriching) return;
  enriching = true;
  const token = ++generation;

  const pending: Book[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (pending.length === 0) return;
    const batch = pending.splice(0, pending.length);
    options.onBatch(batch);
  };

  const queue = (book: Book) => {
    pending.push(book);
    if (pending.length >= BATCH_SIZE) {
      flush();
      return;
    }
    if (flushTimer === null) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flush();
      }, BATCH_FLUSH_MS);
    }
  };

  try {
    options.onStatus?.("covers");
    const missing = await listBooksMissingPdfCovers();
    if (token !== generation) return;
    if (missing.length === 0) return;

    for (const book of missing) {
      if (token !== generation) return;
      await yieldIdle();
      if (token !== generation) return;

      try {
        const bytes = await getBookBytes(book.path, () =>
          readFileBytes(book.path),
        );
        if (token !== generation) return;
        const jpeg = await renderPdfCoverThumbnail(bytes);
        if (token !== generation) return;
        if (!jpeg) continue;
        const updated = await saveCoverBytes(book.id, jpeg, "jpg");
        if (token !== generation) return;
        queue(updated);
      } catch (err) {
        console.error(`PDF cover failed for ${book.path}`, err);
      }
    }

    flush();
  } finally {
    if (token === generation) {
      enriching = false;
      options.onDone?.();
    }
  }
}
