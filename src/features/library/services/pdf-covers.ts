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

const CONCURRENCY = 2;

let enriching = false;

async function mapPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
    run(),
  );
  await Promise.all(runners);
}

/**
 * After library refresh, generate missing PDF page-1 cover thumbnails.
 * Updates the library store via `onBook` as each cover is saved.
 */
export async function enrichPdfCovers(
  onBook: (book: Book) => void,
): Promise<void> {
  if (enriching) return;
  enriching = true;
  try {
    const missing = await listBooksMissingPdfCovers();
    if (missing.length === 0) return;

    await mapPool(missing, CONCURRENCY, async (book) => {
      try {
        const bytes = await getBookBytes(book.path, () =>
          readFileBytes(book.path),
        );
        const jpeg = await renderPdfCoverThumbnail(bytes);
        if (!jpeg) return;
        const updated = await saveCoverBytes(book.id, jpeg, "jpg");
        onBook(updated);
      } catch (err) {
        console.error(`PDF cover failed for ${book.path}`, err);
      }
    });
  } finally {
    enriching = false;
  }
}
