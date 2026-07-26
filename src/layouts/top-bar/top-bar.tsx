import { Button } from "@/components/button";
import { useLibraryStore } from "@/stores/library.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { Refresh01Icon, SettingsIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TopBarProps } from "./top-bar.types";
import styles from "./top-bar.module.css";

export function TopBar({ title, className }: TopBarProps) {
  const push = useNavigationStore((state) => state.push);
  const refresh = useLibraryStore((state) => state.refresh);
  const activity = useLibraryStore((state) => state.activity);
  const classes = [styles.topBar, className].filter(Boolean).join(" ");
  const busy = activity === "scanning" || activity === "indexing";

  return (
    <header className={classes}>
      {title ? <h1 className={styles.title}>{title}</h1> : null}

      <aside className={styles.actions}>
        <Button
          variant="plain"
          size="icon"
          className={styles.refresh}
          aria-label="Refresh library"
          disabled={busy}
          onClick={() => void refresh()}
        >
          <HugeiconsIcon icon={Refresh01Icon} size={18} />
        </Button>

        <Button
          variant="plain"
          size="icon"
          className={styles.settings}
          aria-label="Open settings"
          onClick={() => push("settings")}
        >
          <HugeiconsIcon icon={SettingsIcon} size={18} />
        </Button>
      </aside>
    </header>
  );
}
