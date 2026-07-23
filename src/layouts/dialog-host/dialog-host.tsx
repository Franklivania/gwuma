import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { useDialogStore } from "@/stores/dialog.store";
import type { DialogEntry } from "@/types";
import type { CSSProperties } from "react";
import styles from "./dialog-host.module.css";
import type { DialogHostProps } from "./dialog-host.types";

function dialogBody(entry: DialogEntry) {
  switch (entry.id) {
    case "about":
      return (
        <p>
          Gwuma is an offline-first desktop reading app. Your books stay on your
          machine.
        </p>
      );
    case "confirm":
      return <p>{String(entry.payload?.message ?? "Are you sure?")}</p>;
    case "folder-picker":
      return <p>Folder picker will connect to the Tauri file dialog.</p>;
    case "bookmark":
      return <p>Bookmark dialog placeholder.</p>;
    case "settings":
      return <p>Settings can also open as a stacked dialog.</p>;
    default:
      return null;
  }
}

function dialogTitle(entry: DialogEntry) {
  if (entry.title) return entry.title;
  switch (entry.id) {
    case "about":
      return "About Gwuma";
    case "confirm":
      return "Confirm";
    case "folder-picker":
      return "Choose folder";
    case "bookmark":
      return "Bookmark";
    case "settings":
      return "Settings";
    default:
      return "Dialog";
  }
}

export function DialogHost({ className }: DialogHostProps) {
  const dialogStack = useDialogStore((state) => state.dialogStack);
  const close = useDialogStore((state) => state.close);
  const classes = [styles.host, className].filter(Boolean).join(" ");

  if (dialogStack.length === 0) return null;

  return (
    <div className={classes}>
      {dialogStack.map((entry, index) => (
        <div
          key={`${entry.id}-${index}`}
          className={styles.layer}
          style={
            {
              "--dialog-layer": index + 1,
            } as CSSProperties
          }
        >
          <Modal
            open
            title={dialogTitle(entry)}
            onClose={index === dialogStack.length - 1 ? close : undefined}
          >
            {dialogBody(entry)}
            {index === dialogStack.length - 1 ? (
              <div className={styles.actions}>
                <Button variant="secondary" onClick={close}>
                  Close
                </Button>
              </div>
            ) : null}
          </Modal>
        </div>
      ))}
    </div>
  );
}
