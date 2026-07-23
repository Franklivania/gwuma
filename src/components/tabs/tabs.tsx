import styles from "./tabs.module.css";
import type { TabsProps } from "./tabs.types";

export function Tabs({ items, activeId, onChange }: TabsProps) {
  const active = items.find((item) => item.id === activeId) ?? items[0];

  return (
    <div className={styles.root}>
      <div className={styles.list} role="tablist">
        {items.map((item) => {
          const isActive = item.id === active?.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={[styles.tab, isActive ? styles.active : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onChange(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className={styles.panel} role="tabpanel">
        {active?.content}
      </div>
    </div>
  );
}
