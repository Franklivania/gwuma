import type { ReadingMode } from "@/types";

export type ReaderEngineOpenInput = {
  bytes: Uint8Array;
  path: string;
  /** Prefer passing mode here to avoid a double first paint. */
  readingMode?: ReadingMode;
  /** Used for EPUB locations disk cache. */
  bookId?: string;
  /** Restore target before first paint (avoids page-1 flash / bad scroll). */
  initialPosition?: string | null;
};

/**
 * Format-agnostic reader adapter. UI components talk only to this surface —
 * never import pdfjs-dist / epubjs outside `src/features/reader/engines/`.
 */
export type ReaderEngine = {
  open(input: ReaderEngineOpenInput): Promise<void>;
  close(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  jumpTo(position: string): Promise<void>;
  getPosition(): string;
  getProgress(): number;
  setReadingMode(mode: ReadingMode): Promise<void>;
};

export function formatPdfPage(page: number): string {
  return `pdf:page:${page}`;
}

export function parsePdfPage(
  position: string | null | undefined,
): number | null {
  if (!position?.startsWith("pdf:page:")) return null;
  const n = Number(position.slice("pdf:page:".length));
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

export function formatEpubCfi(cfi: string): string {
  return `epub:cfi:${cfi}`;
}

export function formatEpubHref(href: string): string {
  return `epub:href:${href}`;
}

/** Returns a display target for epub.js (`cfi` string or `href`). */
export function parseEpubTarget(
  position: string | null | undefined,
): string | null {
  if (!position) return null;
  if (position.startsWith("epub:cfi:")) {
    return position.slice("epub:cfi:".length) || null;
  }
  if (position.startsWith("epub:href:")) {
    return position.slice("epub:href:".length) || null;
  }
  return null;
}
