import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styles from "./action-menu.module.css";

export type ActionMenuItem = {
  id: string;
  label: string;
  danger?: boolean;
  onSelect: () => void;
};

export type ActionMenuProps = {
  items: ActionMenuItem[];
  label?: string;
  /** When true, shows a ⋯ trigger button. */
  showTrigger?: boolean;
  children?: ReactNode;
  className?: string;
};

type MenuCoords = { x: number; y: number };

function clampMenuPosition(
  x: number,
  y: number,
  menuWidth: number,
  menuHeight: number,
): MenuCoords {
  const pad = 8;
  const maxX = window.innerWidth - menuWidth - pad;
  const maxY = window.innerHeight - menuHeight - pad;
  return {
    x: Math.max(pad, Math.min(x, maxX)),
    y: Math.max(pad, Math.min(y, maxY)),
  };
}

export function ActionMenu({
  items,
  label = "Actions",
  showTrigger = true,
  children,
  className,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

  useLayoutEffect(() => {
    if (!open || !coords || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const next = clampMenuPosition(coords.x, coords.y, rect.width, rect.height);
    if (next.x !== coords.x || next.y !== coords.y) {
      setCoords(next);
    }
  }, [open, coords]);

  useEffect(() => {
    if (!open) return;

    // Defer so the opening click does not immediately dismiss the menu.
    let active = false;
    const armTimer = window.setTimeout(() => {
      active = true;
    }, 0);

    function onPointerDown(event: PointerEvent) {
      if (!active) return;
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
      setCoords(null);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setCoords(null);
      }
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(armTimer);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openAt(x: number, y: number) {
    setCoords({ x, y });
    setOpen(true);
  }

  function onTriggerClick(event: ReactMouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (open) {
      setOpen(false);
      setCoords(null);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    openAt(rect.left, rect.bottom + 4);
  }

  function onContextMenu(event: ReactMouseEvent) {
    if (items.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    openAt(event.clientX, event.clientY);
  }

  const menu =
    open && coords && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={menuRef}
            id={menuId}
            className={styles.menu}
            role="menu"
            style={{ left: coords.x, top: coords.y }}
          >
            {items.map((item) => (
              <li key={item.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={[styles.item, item.danger ? styles.danger : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setOpen(false);
                    setCoords(null);
                    item.onSelect();
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(" ")}
      onContextMenu={onContextMenu}
    >
      {children}
      {showTrigger && items.length > 0 ? (
        <button
          type="button"
          className={styles.trigger}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={label}
          onClick={onTriggerClick}
          onPointerDown={(event) => event.stopPropagation()}
        >
          ⋯
        </button>
      ) : null}
      {menu}
    </div>
  );
}
