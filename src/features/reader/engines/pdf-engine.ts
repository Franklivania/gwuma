import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type PDFPageProxy,
  type RenderTask,
} from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { ReadingMode } from "@/types";
import { acquirePdfDoc, releasePdfDoc } from "./pdf-doc-cache";
import {
  formatPdfPage,
  parsePdfPage,
  type ReaderEngine,
  type ReaderEngineOpenInput,
} from "./types";

GlobalWorkerOptions.workerSrc = pdfWorker;

const PAGE_GAP = 16;
const VISIBLE_BUFFER = 1;
const RESIZE_DEBOUNCE_MS = 150;

type PageSlot = {
  root: HTMLDivElement;
  canvas: HTMLCanvasElement;
  painted: boolean;
  height: number;
  renderTask: RenderTask | null;
};

export class PdfEngine implements ReaderEngine {
  private doc: PDFDocumentProxy | null = null;
  private docPath: string | null = null;
  private container: HTMLElement | null = null;
  private pageNum = 1;
  private mode: ReadingMode = "paginated";
  private onChange: (() => void) | null = null;
  private scrollHandler: (() => void) | null = null;
  private renderToken = 0;
  private openGeneration = 0;
  private slots: PageSlot[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private defaultPageHeight = 480;

  bind(container: HTMLElement, onChange?: () => void) {
    this.teardownObservers();
    this.container = container;
    this.onChange = onChange ?? null;
  }

  async open({
    bytes,
    path,
    readingMode,
    initialPosition,
  }: ReaderEngineOpenInput): Promise<void> {
    this.detachUi();
    this.releaseDocToCache();

    const generation = ++this.openGeneration;
    if (readingMode) this.mode = readingMode;

    const data = bytes.slice();
    const doc = await acquirePdfDoc(path, async () => {
      return getDocument({ data }).promise;
    });
    if (generation !== this.openGeneration) {
      releasePdfDoc(path, doc);
      throw new Error("PDF open cancelled");
    }
    this.doc = doc;
    this.docPath = path;

    const parsed = parsePdfPage(initialPosition ?? null);
    this.pageNum = Math.min(this.doc.numPages, Math.max(1, parsed ?? 1));

    await this.render();
    this.assertOpen(generation);

    // Heights settle after first paint — re-anchor scroll restore.
    if (this.mode === "scroll" && this.pageNum > 1) {
      this.scrollToPage(this.pageNum);
      await this.paintVisible();
      this.assertOpen(generation);
    }
  }

  async close(): Promise<void> {
    this.openGeneration += 1;
    this.onChange = null;
    this.detachUi();
    this.releaseDocToCache();
    this.container = null;
    this.pageNum = 1;
    this.slots = [];
  }

  async next(): Promise<void> {
    if (!this.doc) return;
    if (this.pageNum >= this.doc.numPages) return;
    this.pageNum += 1;
    if (this.mode === "scroll") {
      this.scrollToPage(this.pageNum);
      void this.paintVisible();
    } else {
      await this.render();
    }
    this.emit();
  }

  async previous(): Promise<void> {
    if (!this.doc) return;
    if (this.pageNum <= 1) return;
    this.pageNum -= 1;
    if (this.mode === "scroll") {
      this.scrollToPage(this.pageNum);
      void this.paintVisible();
    } else {
      await this.render();
    }
    this.emit();
  }

  async jumpTo(position: string): Promise<void> {
    if (!this.doc) return;
    const page = parsePdfPage(position);
    if (!page) return;
    this.pageNum = Math.min(this.doc.numPages, Math.max(1, page));
    if (this.mode === "scroll") {
      if (this.slots.length === 0) await this.render();
      this.scrollToPage(this.pageNum);
      await this.paintVisible();
    } else {
      await this.render();
    }
    this.emit();
  }

  getPosition(): string {
    return formatPdfPage(this.pageNum);
  }

  getProgress(): number {
    if (!this.doc || this.doc.numPages <= 0) return 0;
    return Math.min(
      100,
      Math.round((this.pageNum / this.doc.numPages) * 1000) / 10,
    );
  }

  async setReadingMode(mode: ReadingMode): Promise<void> {
    if (this.mode === mode) return;
    this.mode = mode;
    await this.render();
    this.emit();
  }

  private emit() {
    this.onChange?.();
  }

  private assertOpen(generation: number) {
    if (generation !== this.openGeneration || !this.doc) {
      throw new Error("PDF open cancelled");
    }
  }

  private detachUi() {
    this.teardownObservers();
    this.cancelAllRenders();
    this.renderToken += 1;
    if (this.container) this.container.replaceChildren();
    this.slots = [];
  }

  private releaseDocToCache() {
    const doc = this.doc;
    const path = this.docPath;
    this.doc = null;
    this.docPath = null;
    if (doc && path) {
      releasePdfDoc(path, doc);
    }
  }

  private teardownObservers() {
    this.unbindScroll();
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private unbindScroll() {
    if (this.container && this.scrollHandler) {
      this.container.removeEventListener("scroll", this.scrollHandler);
    }
    this.scrollHandler = null;
  }

  private cancelAllRenders() {
    for (const slot of this.slots) {
      try {
        slot.renderTask?.cancel();
      } catch {
        // ignore
      }
      slot.renderTask = null;
      slot.painted = false;
    }
  }

  private scrollToPage(page: number) {
    const slot = this.slots[page - 1];
    if (!slot || !this.container) return;
    // Prefer container scrollTop so restore works without relying on scrollIntoView
    // while layout is still settling.
    this.container.scrollTop = slot.root.offsetTop;
  }

  private async render(): Promise<void> {
    const doc = this.doc;
    const container = this.container;
    if (!doc || !container) return;

    const token = ++this.renderToken;
    this.teardownObservers();
    this.cancelAllRenders();
    container.replaceChildren();
    container.dataset.readingMode = this.mode;
    this.slots = [];

    if (this.mode === "scroll") {
      await this.renderScroll(doc, container, token);
      return;
    }

    container.style.overflow = "hidden";
    const canvas = document.createElement("canvas");
    canvas.dataset.pdfPage = String(this.pageNum);
    canvas.style.display = "block";
    canvas.style.maxWidth = "100%";
    canvas.style.height = "auto";
    canvas.style.marginInline = "auto";
    container.appendChild(canvas);
    await this.paintPage(this.pageNum, canvas, container.clientWidth, token);
  }

  private async renderScroll(
    doc: PDFDocumentProxy,
    container: HTMLElement,
    token: number,
  ) {
    container.style.overflow = "auto";
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.gap = `${PAGE_GAP}px`;
    wrap.style.padding = "0";
    wrap.style.width = "100%";
    container.appendChild(wrap);

    const width = Math.max(320, container.clientWidth);
    try {
      const first = await doc.getPage(1);
      if (token !== this.renderToken) return;
      const base = first.getViewport({ scale: 1 });
      const scale = Math.min(2, width / base.width);
      const viewport = first.getViewport({ scale });
      this.defaultPageHeight = Math.floor(viewport.height);
    } catch {
      this.defaultPageHeight = 480;
    }

    for (let n = 1; n <= doc.numPages; n += 1) {
      const root = document.createElement("div");
      root.dataset.pdfPage = String(n);
      root.style.width = "100%";
      root.style.display = "flex";
      root.style.justifyContent = "center";
      root.style.minHeight = `${this.defaultPageHeight}px`;
      root.style.background = "transparent";

      const canvas = document.createElement("canvas");
      canvas.style.display = "block";
      canvas.style.maxWidth = "100%";
      canvas.style.height = "auto";

      root.appendChild(canvas);
      wrap.appendChild(root);

      this.slots.push({
        root,
        canvas,
        painted: false,
        height: this.defaultPageHeight,
        renderTask: null,
      });
    }

    this.scrollHandler = () => {
      this.updatePageFromScroll();
      void this.paintVisible();
      this.emit();
    };
    container.addEventListener("scroll", this.scrollHandler, { passive: true });

    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeTimer) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.resizeTimer = null;
        void this.repaintVisibleAfterResize();
      }, RESIZE_DEBOUNCE_MS);
    });
    this.resizeObserver.observe(container);

    this.scrollToPage(this.pageNum);
    await this.paintVisible();
    // Re-apply after visible pages update slot heights.
    this.scrollToPage(this.pageNum);
  }

  private async repaintVisibleAfterResize() {
    const token = ++this.renderToken;
    for (const slot of this.slots) {
      try {
        slot.renderTask?.cancel();
      } catch {
        // ignore
      }
      slot.renderTask = null;
      slot.painted = false;
      const ctx = slot.canvas.getContext("2d");
      ctx?.clearRect(0, 0, slot.canvas.width, slot.canvas.height);
    }
    await this.paintVisible(token);
  }

  private visibleRange(): { start: number; end: number } {
    const container = this.container;
    if (!container || this.slots.length === 0) {
      return { start: 1, end: 1 };
    }

    const top = container.scrollTop;
    const bottom = top + container.clientHeight;
    let start = 1;
    let end = this.slots.length;

    for (let i = 0; i < this.slots.length; i += 1) {
      const el = this.slots[i].root;
      const elTop = el.offsetTop;
      const elBottom = elTop + el.offsetHeight;
      if (elBottom >= top) {
        start = i + 1;
        break;
      }
    }
    for (let i = this.slots.length - 1; i >= 0; i -= 1) {
      const el = this.slots[i].root;
      if (el.offsetTop <= bottom) {
        end = i + 1;
        break;
      }
    }

    return {
      start: Math.max(1, start - VISIBLE_BUFFER),
      end: Math.min(this.slots.length, end + VISIBLE_BUFFER),
    };
  }

  private async paintVisible(token = this.renderToken): Promise<void> {
    if (!this.doc || !this.container || this.mode !== "scroll") return;
    const { start, end } = this.visibleRange();
    const width = Math.max(320, this.container.clientWidth);

    for (let i = 0; i < this.slots.length; i += 1) {
      const page = i + 1;
      const slot = this.slots[i];
      const inView = page >= start && page <= end;

      if (!inView) {
        if (slot.painted || slot.renderTask) {
          try {
            slot.renderTask?.cancel();
          } catch {
            // ignore
          }
          slot.renderTask = null;
          slot.painted = false;
          const ctx = slot.canvas.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, slot.canvas.width, slot.canvas.height);
          slot.canvas.width = 0;
          slot.canvas.height = 0;
          slot.root.style.minHeight = `${slot.height}px`;
        }
        continue;
      }

      if (slot.painted || slot.renderTask) continue;
      if (token !== this.renderToken) return;
      await this.paintSlot(page, slot, width, token);
    }
  }

  private async paintSlot(
    pageNumber: number,
    slot: PageSlot,
    containerWidth: number,
    token: number,
  ) {
    if (!this.doc) return;
    let page: PDFPageProxy;
    try {
      page = await this.doc.getPage(pageNumber);
    } catch {
      return;
    }
    if (token !== this.renderToken) return;

    const base = page.getViewport({ scale: 1 });
    const width = Math.max(320, containerWidth || base.width);
    const scale = Math.min(2, width / base.width);
    const viewport = page.getViewport({ scale });
    const outputScale = window.devicePixelRatio || 1;

    const canvas = slot.canvas;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    slot.height = Math.floor(viewport.height);
    slot.root.style.minHeight = `${slot.height}px`;

    const context = canvas.getContext("2d");
    if (!context) return;

    const transform =
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

    const task = page.render({
      canvas,
      canvasContext: context,
      viewport,
      transform,
    });
    slot.renderTask = task;

    try {
      await task.promise;
      if (token !== this.renderToken) return;
      slot.painted = true;
      slot.renderTask = null;
      try {
        page.cleanup();
      } catch {
        // ignore
      }
    } catch {
      slot.renderTask = null;
    }
  }

  private updatePageFromScroll() {
    const container = this.container;
    if (!container || this.slots.length === 0) return;

    const mid = container.scrollTop + container.clientHeight / 2;
    let best = this.pageNum;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < this.slots.length; i += 1) {
      const el = this.slots[i].root;
      const top = el.offsetTop;
      const bottom = top + el.offsetHeight;
      const center = (top + bottom) / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i + 1;
      }
    }

    if (best !== this.pageNum) {
      this.pageNum = best;
    }
  }

  private async paintPage(
    pageNumber: number,
    canvas: HTMLCanvasElement,
    containerWidth: number,
    token: number,
  ) {
    if (!this.doc) return;
    const page = await this.doc.getPage(pageNumber);
    if (token !== this.renderToken) return;

    const base = page.getViewport({ scale: 1 });
    const width = Math.max(320, containerWidth || base.width);
    const scale = Math.min(2, width / base.width);
    const viewport = page.getViewport({ scale });
    const outputScale = window.devicePixelRatio || 1;

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const context = canvas.getContext("2d");
    if (!context) return;

    const transform =
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

    await page.render({
      canvas,
      canvasContext: context,
      viewport,
      transform,
    }).promise;
  }
}
