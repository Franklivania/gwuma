import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Separator } from "@/components/separator";
import { openBook as openBookCommand } from "@/features/library/services/library-service";
import { useLibraryStore } from "@/stores/library.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { useReaderStore } from "@/stores/reader.store";
import type { Book } from "@/types";
import { Bookmark03Icon, FolderLibraryIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import styles from "./library-view.module.css";

export function LibraryView() {
  const books = useLibraryStore((state) => state.books);
  const addFolder = useLibraryStore((state) => state.addFolder);
  const upsertBook = useLibraryStore((state) => state.upsertBook);

  async function openBook(book: Book) {
    try {
      const opened = await openBookCommand(book.id);
      useReaderStore.getState().applyBookState(opened);
      upsertBook(opened);
      useNavigationStore.getState().push("reader");
    } catch (error) {
      console.error("Failed to open book", error);
    }
  }

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
        />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderTitle}>
            <HugeiconsIcon icon={FolderLibraryIcon} size={18} />
            <h3>Library</h3>
          </div>
          <Separator decorative className={styles.headerRule} />
          {books.length > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void addFolder()}
            >
              Add folder
            </Button>
          ) : null}
        </div>

        {books.length === 0 ? (
          <EmptyState
            title="Your library is empty"
            description="Add a folder of books to start reading. Gwuma indexes files in place and never copies them."
            action={
              <Button onClick={() => void addFolder()}>Add folder</Button>
            }
          />
        ) : (
          <ul className={styles.grid}>
            {books.map((book) => (
              <li key={book.id}>
                <button
                  type="button"
                  className={styles.book}
                  onClick={() => void openBook(book)}
                >
                  <BookCover
                    title={book.title}
                    src={book.coverUrl ?? undefined}
                    size="lg"
                  />
                  <span className={styles.bookMeta}>
                    <span className={styles.bookTitle}>{book.title}</span>
                    <span className={styles.bookAuthor}>{book.author}</span>
                    <span className={styles.bookFormat}>
                      {book.format.toUpperCase()}
                      {book.progress > 0
                        ? ` · ${Math.round(book.progress)}%`
                        : null}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
