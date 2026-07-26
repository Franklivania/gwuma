import ePub, { type Book, type Rendition } from "epubjs";
import {
  loadLocationsCache,
  saveLocationsCache,
} from "@/features/library/services/library-service";
import type { ReadingMode } from "@/types";
import {
  formatEpubCfi,
  formatEpubHref,
  parseEpubTarget,
  type ReaderEngine,
  type ReaderEngineOpenInput,
} from "./types";

const DISPLAY_TIMEOUT_MS = 12_000;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export class EpubEngine implements ReaderEngine {
  private book: Book | null = null;
  private rendition: Rendition | null = null;
  private container: HTMLElement | null = null;
  private mode: ReadingMode = "paginated";
  private position = "";
  private progress = 0;
  private onChange: (() => void) | null = null;
  private pendingJump: string | null = null;
  private bookId: string | null = null;
  private locationsToken = 0;
  /** Bumped on close/teardown so in-flight open() aborts cleanly. */
  private openGeneration = 0;

  bind(container: HTMLElement, onChange?: () => void) {
    this.container = container;
    this.onChange = onChange ?? null;
  }

  async open({
    bytes,
    readingMode,
    bookId,
  }: ReaderEngineOpenInput): Promise<void> {
    this.teardownBook();
    const generation = ++this.openGeneration;

    if (readingMode) this.mode = readingMode;
    this.bookId = bookId ?? null;

    const copy = bytes.slice();
    this.book = ePub(toArrayBuffer(copy));
    await this.book.ready;
    this.assertOpen(generation);

    if (!this.container) {
      throw new Error("EpubEngine.bind(container) must be called before open");
    }

    await this.waitForContainerSize(this.container, generation);

    const measuredW = Math.floor(this.container.clientWidth);
    const measuredH = Math.floor(this.container.clientHeight);
    const hasSize = measuredW > 0 && measuredH > 0;

    this.rendition = this.book.renderTo(this.container, {
      width: hasSize ? measuredW : "100%",
      height: hasSize ? measuredH : "100%",
      flow: this.flowForMode(this.mode),
      allowScriptedContent: false,
    });
    this.assertOpen(generation);

    this.rendition.on(
      "relocated",
      (location: {
        start?: { cfi?: string; href?: string; percentage?: number };
      }) => {
        if (generation !== this.openGeneration) return;
        this.applyLocation(location);
        this.onChange?.();
      },
    );

    await this.displayInitial(generation);

    if (generation !== this.openGeneration) return;

    if (hasSize) {
      this.rendition.resize(measuredW, measuredH);
    }

    this.applyTheme();
    this.syncFromRendition();

    // Ready for reading — locations run in the background.
    void this.ensureLocations(generation);
  }

  async close(): Promise<void> {
    this.openGeneration += 1;
    this.locationsToken += 1;
    this.onChange = null;
    this.teardownBook();
    this.container = null;
    this.position = "";
    this.progress = 0;
    this.pendingJump = null;
    this.bookId = null;
  }

  async next(): Promise<void> {
    await this.rendition?.next();
  }

  async previous(): Promise<void> {
    await this.rendition?.prev();
  }

  async jumpTo(position: string): Promise<void> {
    const target = parseEpubTarget(position);
    if (!target) return;

    if (!this.rendition) {
      this.pendingJump = target;
      return;
    }

    await this.rendition.display(target);
    this.syncFromRendition();
  }

  getPosition(): string {
    return this.position;
  }

  getProgress(): number {
    return this.progress;
  }

  async setReadingMode(mode: ReadingMode): Promise<void> {
    if (this.mode === mode) return;
    this.mode = mode;
    if (!this.rendition) return;
    this.rendition.flow(this.flowForMode(mode));
    this.applyTheme();
  }

  /** Apply shell reader background into the EPUB iframe. */
  applyTheme(background: "theme" | "black" | "white" = "theme") {
    if (!this.rendition) return;

    let bg = "#fafafa";
    let ink = "#1a1a1a";

    if (background === "black") {
      bg = "#0a0a0a";
      ink = "#f2f2f2";
    } else if (background === "white") {
      bg = "#fafafa";
      ink = "#1a1a1a";
    } else if (typeof document !== "undefined") {
      const styles = getComputedStyle(document.documentElement);
      bg =
        styles.getPropertyValue("--reader-bg").trim() ||
        styles.getPropertyValue("--bg").trim() ||
        bg;
      ink =
        styles.getPropertyValue("--reader-text").trim() ||
        styles.getPropertyValue("--text-primary").trim() ||
        ink;
    }

    this.rendition.themes.default({
      body: {
        background: bg,
        color: ink,
      },
      a: {
        color: ink,
      },
    });
  }

  private flowForMode(mode: ReadingMode): string {
    return mode === "scroll" ? "scrolled" : "paginated";
  }

  private assertOpen(generation: number) {
    if (generation !== this.openGeneration || !this.book) {
      throw new Error("EPUB open cancelled");
    }
  }

  private async waitForContainerSize(
    container: HTMLElement,
    generation: number,
    timeoutMs = 2000,
  ) {
    const start = performance.now();
    while (container.clientWidth === 0 || container.clientHeight === 0) {
      this.assertOpen(generation);
      if (performance.now() - start > timeoutMs) break;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    }
  }

  private async displayInitial(generation: number) {
    const rendition = this.rendition;
    if (!rendition) return;

    const target = this.pendingJump;
    this.pendingJump = null;

    try {
      if (target) {
        await withTimeout(
          Promise.resolve(rendition.display(target)),
          DISPLAY_TIMEOUT_MS,
          "EPUB display (saved position)",
        );
      } else {
        await withTimeout(
          Promise.resolve(rendition.display()),
          DISPLAY_TIMEOUT_MS,
          "EPUB display",
        );
      }
    } catch (err) {
      this.assertOpen(generation);
      // Bad CFI / href often never resolves — fall back to the spine start.
      if (target) {
        await withTimeout(
          Promise.resolve(rendition.display()),
          DISPLAY_TIMEOUT_MS,
          "EPUB display (fallback)",
        );
        return;
      }
      throw err;
    }

    this.assertOpen(generation);
  }

  private applyLocation(location: {
    start?: { cfi?: string; href?: string; percentage?: number };
  }) {
    const cfi = location.start?.cfi;
    const href = location.start?.href;
    if (cfi) {
      this.position = formatEpubCfi(cfi);
    } else if (href) {
      this.position = formatEpubHref(href);
    }

    if (this.book && cfi && this.book.locations.length() > 0) {
      const pct = this.book.locations.percentageFromCfi(cfi);
      if (typeof pct === "number" && Number.isFinite(pct)) {
        this.progress = Math.min(100, Math.round(pct * 1000) / 10);
        return;
      }
    }

    if (typeof location.start?.percentage === "number") {
      this.progress = Math.min(
        100,
        Math.round(location.start.percentage * 1000) / 10,
      );
    }
  }

  private syncFromRendition() {
    const location = this.rendition?.location;
    if (location) this.applyLocation(location);
  }

  private async ensureLocations(generation: number) {
    const book = this.book;
    const bookId = this.bookId;
    if (!book) return;

    const token = ++this.locationsToken;

    try {
      if (bookId) {
        const cached = await loadLocationsCache(bookId);
        if (
          token !== this.locationsToken ||
          generation !== this.openGeneration ||
          this.book !== book
        ) {
          return;
        }
        if (cached) {
          book.locations.load(cached);
          this.syncFromRendition();
          this.onChange?.();
          return;
        }
      }

      await book.locations.generate(1600);
      if (
        token !== this.locationsToken ||
        generation !== this.openGeneration ||
        this.book !== book
      ) {
        return;
      }

      this.syncFromRendition();
      this.onChange?.();

      if (bookId) {
        const serialized = book.locations.save();
        void saveLocationsCache(bookId, serialized).catch((err) => {
          console.error("Failed to save EPUB locations cache", err);
        });
      }
    } catch {
      // Locations are best-effort for progress; reading still works.
    }
  }

  private teardownBook() {
    this.locationsToken += 1;

    try {
      this.rendition?.destroy();
    } catch {
      // ignore
    }
    this.rendition = null;

    try {
      this.book?.destroy();
    } catch {
      // ignore
    }
    this.book = null;

    if (this.container) {
      this.container.replaceChildren();
    }
  }
}
