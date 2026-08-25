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
import { Clock01Icon, FolderLibraryIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import styles from "./library-view.module.css";

function recentlyReadBooks(books: Book[], limit = 8): Book[] {
  return books
    .filter((book) => Boolean(book.lastOpened))
    .slice()
    .sort((a, b) => {
      const aTime = a.lastOpened ? Date.parse(a.lastOpened) : 0;
      const bTime = b.lastOpened ? Date.parse(b.lastOpened) : 0;
      return bTime - aTime;
    })
    .slice(0, limit);
}

export function LibraryView() {
  const books = useLibraryStore((state) => state.books);
  const folderId = useLibraryStore((state) => state.filters.folderId);
  const addFolder = useLibraryStore((state) => state.addFolder);
  const upsertBook = useLibraryStore((state) => state.upsertBook);
  const push = useNavigationStore((state) => state.push);

  const visibleBooks = folderId
    ? books.filter((book) => book.folderId === folderId)
    : books;
  const recent = recentlyReadBooks(books);

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
            <HugeiconsIcon icon={Clock01Icon} size={18} />
            <h3>Recently read</h3>
          </div>
          <Separator decorative className={styles.headerRule} />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => push("bookmarks")}
          >
            Bookmarks
          </Button>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="No recent books"
            description="Open a book from your library and it will show up here."
          />
        ) : (
          <ul className={styles.grid}>
            {recent.map((book) => (
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
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
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

        {visibleBooks.length === 0 ? (
          <EmptyState
            title="Your library is empty"
            description="Add a folder of books to start reading. Gwuma indexes files in place and never copies them."
            action={
              <Button onClick={() => void addFolder()}>Add folder</Button>
            }
          />
        ) : (
          <ul className={styles.grid}>
            {visibleBooks.map((book) => (
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
