import { Button } from "@/components/button";
import { useDialogStore } from "@/stores/dialog.store";
import { useSettingsStore } from "@/stores/settings.store";
import { THEME_IDS, THEME_LABELS, type ThemeId } from "@/types";
import styles from "./settings-view.module.css";

export function SettingsView() {
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const open = useDialogStore((state) => state.open);

  return (
    <div className={styles.section}>
      <h2 className={styles.heading}>Appearance</h2>
      <p className={styles.description}>
        You can change the appearance of the app to your liking here
      </p>

      <div className={styles.themeGrid}>
        {THEME_IDS.map((id: ThemeId) => {
          const isActive = theme === id;
          return (
            <button
              key={id}
              type="button"
              className={[styles.themeCard, isActive ? styles.themeActive : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setTheme(id)}
              aria-pressed={isActive}
            >
              <span className={styles.themeName}>{THEME_LABELS[id]}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => open("about")}>
          About Gwuma
        </Button>
      </div>
    </div>
  );
}
