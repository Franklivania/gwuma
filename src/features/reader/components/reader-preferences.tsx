import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { setBookFavourite } from "@/features/library/services/library-service";
import { useLibraryStore } from "@/stores/library.store";
import { useReaderStore } from "@/stores/reader.store";
import { useSettingsStore } from "@/stores/settings.store";
import {
  SCROLL_SPEED_NOTCHES,
  type ReaderBackground,
  type ReadingMode,
  type ScrollSpeedPreset,
} from "@/types";
import { useEffect, useRef, useState } from "react";
import styles from "./reader-preferences.module.css";

type ReaderPreferencesProps = {
  open: boolean;
  onClose: () => void;
};

export function ReaderPreferences({ open, onClose }: ReaderPreferencesProps) {
  const panelRef = useRef<HTMLElement>(null);
  const currentBook = useReaderStore((state) => state.currentBook);
  const applyBookState = useReaderStore((state) => state.applyBookState);
  const upsertBook = useLibraryStore((state) => state.upsertBook);

  const readingMode = useSettingsStore((state) => state.readingMode);
  const scrollSpeed = useSettingsStore((state) => state.scrollSpeed);
  const scrollSpeedPreset = useSettingsStore(
    (state) => state.scrollSpeedPreset,
  );
  const readerBackground = useSettingsStore((state) => state.readerBackground);
  const nightLight = useSettingsStore((state) => state.nightLight);
  const setReadingMode = useSettingsStore((state) => state.setReadingMode);
  const setScrollSpeedPreset = useSettingsStore(
    (state) => state.setScrollSpeedPreset,
  );
  const setScrollSpeedCustom = useSettingsStore(
    (state) => state.setScrollSpeedCustom,
  );
  const setReaderBackground = useSettingsStore(
    (state) => state.setReaderBackground,
  );
  const setNightLight = useSettingsStore((state) => state.setNightLight);

  const [customSpeed, setCustomSpeed] = useState(String(scrollSpeed));
  const [favouriteBusy, setFavouriteBusy] = useState(false);
  const lastNotchRef = useRef<Exclude<ScrollSpeedPreset, "custom">>(80);
  const isCustom = scrollSpeedPreset === "custom";
  const scrollControlsEnabled = readingMode === "scroll";

  useEffect(() => {
    if (scrollSpeedPreset !== "custom") {
      lastNotchRef.current = scrollSpeedPreset;
    }
  }, [scrollSpeedPreset]);

  useEffect(() => {
    setCustomSpeed(String(scrollSpeed));
  }, [scrollSpeed]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  async function handleFavouriteToggle() {
    if (!currentBook || favouriteBusy) return;
    setFavouriteBusy(true);
    try {
      const updated = await setBookFavourite(
        currentBook.id,
        !currentBook.favourite,
      );
      applyBookState(updated);
      upsertBook(updated);
    } catch (error) {
      console.error("Failed to update favourite", error);
    } finally {
      setFavouriteBusy(false);
    }
  }

  function handleCustomSpeedCommit() {
    const value = Number(customSpeed);
    if (!Number.isFinite(value)) {
      setCustomSpeed(String(scrollSpeed));
      return;
    }
    setScrollSpeedCustom(value);
  }

  function handleCustomToggle() {
    if (!scrollControlsEnabled) return;
    if (isCustom) {
      setScrollSpeedPreset(lastNotchRef.current);
      return;
    }
    lastNotchRef.current = scrollSpeedPreset;
    setScrollSpeedPreset("custom");
  }

  function handleNotchSelect(notch: Exclude<ScrollSpeedPreset, "custom">) {
    lastNotchRef.current = notch;
    setScrollSpeedPreset(notch);
  }

  const modes: { id: ReadingMode; label: string }[] = [
    { id: "scroll", label: "Scroll" },
    { id: "paginated", label: "Pagination" },
  ];

  const backgrounds: { id: ReaderBackground; label: string }[] = [
    { id: "theme", label: "Theme" },
    { id: "black", label: "Black" },
    { id: "white", label: "White" },
  ];

  return (
    <>
      <button
        type="button"
        className={[styles.backdrop, open ? styles.backdropVisible : ""]
          .filter(Boolean)
          .join(" ")}
        aria-label="Close reading preferences"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className={[styles.root, open ? styles.rootOpen : ""]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-preferences-title"
        aria-hidden={!open}
        tabIndex={-1}
      >
        <div className={styles.container}>
          <header className={styles.header}>
            <h3 id="reader-preferences-title" className={styles.title}>
              Reading Preferences
            </h3>
          </header>

          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Read type</h4>
            <div
              className={styles.segment}
              role="radiogroup"
              aria-label="Read type"
            >
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  role="radio"
                  aria-checked={readingMode === mode.id}
                  className={[
                    styles.segmentOption,
                    readingMode === mode.id ? styles.segmentOptionActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setReadingMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </section>

          <section
            className={styles.section}
            aria-disabled={!scrollControlsEnabled}
          >
            <h4 className={styles.sectionTitle}>Scroll speed</h4>
            <section className={styles.scrollSpeedSection}>
              <p className={styles.hint}>Wheel and trackpad step size</p>

              <Button
                variant={isCustom ? "primary" : "plain"}
                size="sm"
                disabled={!scrollControlsEnabled}
                aria-pressed={isCustom}
                onClick={handleCustomToggle}
              >
                Custom
              </Button>
            </section>
            <div
              className={[
                styles.notchTrack,
                !scrollControlsEnabled || isCustom ? styles.disabled : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="radiogroup"
              aria-label="Scroll speed"
            >
              {SCROLL_SPEED_NOTCHES.map((notch) => (
                <button
                  key={notch}
                  type="button"
                  role="radio"
                  aria-checked={!isCustom && scrollSpeedPreset === notch}
                  disabled={!scrollControlsEnabled || isCustom}
                  className={[
                    styles.notch,
                    !isCustom && scrollSpeedPreset === notch
                      ? styles.notchActive
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleNotchSelect(notch)}
                >
                  <span className={styles.notchDot} />
                  <span className={styles.notchLabel}>{notch}</span>
                </button>
              ))}
            </div>
            <div className={styles.customRow}>
              {isCustom && scrollControlsEnabled ? (
                <Input
                  label="Speed %"
                  type="number"
                  min={1}
                  max={200}
                  value={customSpeed}
                  onChange={(event) => setCustomSpeed(event.target.value)}
                  onBlur={handleCustomSpeedCommit}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleCustomSpeedCommit();
                  }}
                />
              ) : null}
            </div>
          </section>

          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Library</h4>
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={Boolean(currentBook?.favourite)}
                disabled={!currentBook || favouriteBusy}
                onChange={() => void handleFavouriteToggle()}
              />
              <span>Favourite this book</span>
            </label>
          </section>

          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Reading background</h4>
            <div
              className={styles.segment}
              role="radiogroup"
              aria-label="Reading background"
            >
              {backgrounds.map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  role="radio"
                  aria-checked={readerBackground === bg.id}
                  className={[
                    styles.segmentOption,
                    readerBackground === bg.id
                      ? styles.segmentOptionActive
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setReaderBackground(bg.id)}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Night light</h4>
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={nightLight}
                onChange={(event) => setNightLight(event.target.checked)}
              />
              <span>Warm tint on the reading screen</span>
            </label>
          </section>
        </div>
      </aside>
    </>
  );
}
