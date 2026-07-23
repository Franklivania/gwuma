import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/button";
import { useDialogStore } from "@/stores/dialog.store";
import { Separator } from "@/components/separator";
import { Bookmark03Icon, FolderLibraryIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import styles from "./library-view.module.css";

export function LibraryView() {
  const open = useDialogStore((state) => state.open);

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderTitle}>
            <HugeiconsIcon icon={Bookmark03Icon} size={18} />
            <h3>Bookmarks</h3>
          </div>
          <Separator decorative className={styles.headerRule} />
        </div>

        <EmptyState
          title="Your Bookmarks is empty"
          description="Add a bookmark from your list of books"
          // action={<Button onClick={() => open("folder-picker")}>Add folder</Button>}
        />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderTitle}>
            <HugeiconsIcon icon={FolderLibraryIcon} size={18} />
            <h3>Library</h3>
          </div>
          <Separator decorative className={styles.headerRule} />
        </div>

        <EmptyState
          title="Your library is empty"
          description="Add a folder of books to start reading. Gwuma indexes files in place and never copies them."
          action={
            <Button onClick={() => open("folder-picker")}>Add folder</Button>
          }
        />
      </section>
    </div>
  );
}
