import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Separator } from "@/components/separator";
import { openBook as openBookCommand } from "@/features/library/services/library-service";
import { useLibraryStore } from "@/stores/library.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { useReaderStore } from "@/stores/reader.store";
import { useReadingSessionStore } from "@/stores/reading-session.store";
import type { Book } from "@/types";
import { Bookmark03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import styles from "./library-view.module.css";

export function BookmarksView() {
  const books = useLibraryStore((state) => state.books);
  const upsertBook = useLibraryStore((state) => state.upsertBook);
  const push = useNavigationStore((state) => state.push);
  const favourites = books.filter((book) => book.favourite);

  async function openBook(book: Book) {
    try {
      const { book: opened, sessionId } = await openBookCommand(book.id);
      useReaderStore.getState().applyBookState(opened);
      useReadingSessionStore.getState().setSessionId(sessionId);
      upsertBook(opened);
      push("reader");
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
          <Button variant="secondary" size="sm" onClick={() => push("library")}>
            Library
          </Button>
        </div>

        {favourites.length === 0 ? (
          <EmptyState
            title="No bookmarked books"
            description="Favourite a book from the reader preferences to see it here."
          />
        ) : (
          <ul className={styles.grid}>
            {favourites.map((book) => (
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
