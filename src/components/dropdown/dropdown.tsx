import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import styles from "./dropdown.module.css";
import type { DropdownProps } from "./dropdown.types";

export function Dropdown({ label, value, options, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const labelId = useId();

  const selected =
    options.find((option) => option.value === value) ?? options[0];
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${selectedIndex}"]`,
    );
    active?.focus();
  }, [open, selectedIndex]);

  function selectValue(next: string) {
    onChange(next);
    setOpen(false);
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = (index + 1) % options.length;
      listRef.current
        ?.querySelector<HTMLElement>(`[data-index="${next}"]`)
        ?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = (index - 1 + options.length) % options.length;
      listRef.current
        ?.querySelector<HTMLElement>(`[data-index="${next}"]`)
        ?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      listRef.current?.querySelector<HTMLElement>(`[data-index="0"]`)?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      listRef.current
        ?.querySelector<HTMLElement>(`[data-index="${options.length - 1}"]`)
        ?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[index];
      if (option) selectValue(option.value);
    }
  }

  return (
    <div className={styles.field} ref={rootRef}>
      {label ? (
        <span className={styles.label} id={labelId}>
          {label}
        </span>
      ) : null}

      <div className={styles.control}>
        <button
          type="button"
          className={[styles.trigger, open ? styles.triggerOpen : ""]
            .filter(Boolean)
            .join(" ")}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={label ? labelId : undefined}
          onClick={() => setOpen((prev) => !prev)}
          onKeyDown={onTriggerKeyDown}
        >
          <span className={styles.triggerLabel}>
            {selected?.label ?? "Select"}
          </span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={16}
            className={[styles.chevron, open ? styles.chevronOpen : ""]
              .filter(Boolean)
              .join(" ")}
          />
        </button>

        {open ? (
          <ul
            ref={listRef}
            id={listId}
            className={styles.menu}
            role="listbox"
            aria-activedescendant={`${listId}-${selectedIndex}`}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    className={[
                      styles.option,
                      isSelected ? styles.optionSelected : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => selectValue(option.value)}
                    onKeyDown={(event) => onOptionKeyDown(event, index)}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
