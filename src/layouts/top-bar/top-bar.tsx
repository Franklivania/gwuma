import { Button } from "@/components/button";
import { useNavigationStore } from "@/stores/navigation.store";
import { SettingsIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import styles from "./top-bar.module.css";
import type { TopBarProps } from "./top-bar.types";

export function TopBar({ title, className }: TopBarProps) {
  const push = useNavigationStore((state) => state.push);
  const classes = [styles.topBar, className].filter(Boolean).join(" ");

  return (
    <header className={classes}>
      {title ? <h1 className={styles.title}>{title}</h1> : null}

      <Button
        variant="plain"
        size="icon"
        className={styles.settings}
        aria-label="Open settings"
        onClick={() => push("settings")}
      >
        <HugeiconsIcon icon={SettingsIcon} size={18} />
      </Button>
    </header>
  );
}
