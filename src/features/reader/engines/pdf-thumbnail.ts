import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

const THUMB_WIDTH = 360;
const MAX_PAGES_TO_TRY = 5;
/** Fraction of sampled pixels that must be non-near-white to accept a page. */
const MIN_CONTENT_RATIO = 0.02;

function isBlankCanvas(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;

  const { width, height } = canvas;
  if (width < 1 || height < 1) return true;

  const sample = Math.min(4000, width * height);
  const step = Math.max(1, Math.floor((width * height) / sample));
  const data = ctx.getImageData(0, 0, width, height).data;

  let nonWhite = 0;
  let counted = 0;
  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    counted += 1;
    if (r < 250 || g < 250 || b < 250) nonWhite += 1;
  }

  if (counted === 0) return true;
  return nonWhite / counted < MIN_CONTENT_RATIO;
}

async function renderPageToJpeg(
  doc: PDFDocumentProxy,
  pageNumber: number,
): Promise<{ bytes: Uint8Array; blank: boolean } | null> {
  const page = await doc.getPage(pageNumber);
  try {
    const base = page.getViewport({ scale: 1 });
    const scale = THUMB_WIDTH / base.width;
    const viewport = page.getViewport({ scale: Math.min(2, scale) });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) return null;

    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;

    const blank = isBlankCanvas(canvas);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82);
    });
    if (!blob) return null;
    return { bytes: new Uint8Array(await blob.arrayBuffer()), blank };
  } finally {
    try {
      page.cleanup();
    } catch {
      // ignore
    }
  }
}

/** Render the first non-blank PDF page (among 1..5) to a JPEG for library covers. */
export async function renderPdfCoverThumbnail(
  bytes: Uint8Array,
): Promise<Uint8Array | null> {
  const data = bytes.slice();
  const doc = await getDocument({ data }).promise;
  try {
    const limit = Math.min(MAX_PAGES_TO_TRY, doc.numPages);
    let fallback: Uint8Array | null = null;

    for (let n = 1; n <= limit; n += 1) {
      const rendered = await renderPageToJpeg(doc, n);
      if (!rendered) continue;
      if (!fallback) fallback = rendered.bytes;
      if (!rendered.blank) return rendered.bytes;
    }

    return fallback;
  } finally {
    await doc.cleanup();
  }
}
