import type { PDFDocumentProxy } from "pdfjs-dist";

const MAX_ENTRIES = 3;

/** In-session LRU of parsed pdf.js documents keyed by absolute path. */
const cache = new Map<string, PDFDocumentProxy>();

/**
 * Take a warm document out of the cache, or load a new one.
 * While held by an engine, the entry is not in the cache.
 */
export async function acquirePdfDoc(
  path: string,
  loader: () => Promise<PDFDocumentProxy>,
): Promise<PDFDocumentProxy> {
  const hit = cache.get(path);
  if (hit) {
    cache.delete(path);
    return hit;
  }
  return loader();
}

/**
 * Park a parsed document for reuse. Evicts oldest with cleanup() when over cap.
 */
export function releasePdfDoc(path: string, doc: PDFDocumentProxy): void {
  const existing = cache.get(path);
  if (existing && existing !== doc) {
    void existing.cleanup().catch(() => {
      // ignore
    });
  }
  if (cache.has(path)) cache.delete(path);
  cache.set(path, doc);

  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    const evicted = cache.get(oldest);
    cache.delete(oldest);
    if (evicted) {
      void evicted.cleanup().catch(() => {
        // ignore
      });
    }
  }
}
