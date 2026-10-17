import { Button } from "@/components/button";
import { BookCover } from "@/components/book-cover";
import { ConfirmModal } from "@/components/confirm-modal";
import { EmptyState } from "@/components/empty-state";
import { Separator } from "@/components/separator";
import { VirtualBookGrid } from "@/features/library/components/virtual-book-grid";
import {
  openBook as openBookCommand,
  setBookFavourite,
} from "@/features/library/services/library-service";
import {
  pauseLibraryCovers,
  resumeLibraryCovers,
  useLibraryStore,
} from "@/stores/library.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { useReaderStore } from "@/stores/reader.store";
import { useReadingSessionStore } from "@/stores/reading-session.store";
import type { Book } from "@/types";
import { Clock01Icon, FolderLibraryIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
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
  const addBooks = useLibraryStore((state) => state.addBooks);
  const removeBook = useLibraryStore((state) => state.removeBook);
  const upsertBook = useLibraryStore((state) => state.upsertBook);
  const push = useNavigationStore((state) => state.push);

  const [pendingRemove, setPendingRemove] = useState<Book | null>(null);

  const visibleBooks = folderId
    ? books.filter((book) => book.folderId === folderId)
    : books;
  const recent = recentlyReadBooks(books);

  useEffect(() => {
    resumeLibraryCovers();
    return () => {
      pauseLibraryCovers();
    };
  }, []);

  async function openBook(book: Book) {
    try {
      pauseLibraryCovers();
      const { book: opened, sessionId } = await openBookCommand(book.id);
      useReaderStore.getState().applyBookState(opened);
      useReadingSessionStore.getState().setSessionId(sessionId);
      upsertBook(opened);
      push("reader");
    } catch (error) {
      console.error("Failed to open book", error);
      resumeLibraryCovers();
    }
  }

  async function toggleFavourite(book: Book) {
    try {
      const updated = await setBookFavourite(book.id, !book.favourite);
      upsertBook(updated);
    } catch (error) {
      console.error("Failed to update bookmark", error);
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
          <div className={styles.headerActions}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void addBooks()}
            >
              Add book
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void addFolder()}
            >
              Add folder
            </Button>
          </div>
        </div>

        {visibleBooks.length === 0 ? (
          <EmptyState
            title="Your library is empty"
            description="Add a book or a folder to start reading. Gwuma indexes files in place and never copies them."
            action={
              <div className={styles.headerActions}>
                <Button onClick={() => void addBooks()}>Add book</Button>
                <Button variant="secondary" onClick={() => void addFolder()}>
                  Add folder
                </Button>
              </div>
            }
          />
        ) : (
          <VirtualBookGrid
            books={visibleBooks}
            onOpen={(book) => void openBook(book)}
            onRemove={setPendingRemove}
            onToggleFavourite={(book) => void toggleFavourite(book)}
          />
        )}
      </section>

      <ConfirmModal
        open={pendingRemove !== null}
        title="Remove book"
        message={
          pendingRemove
            ? `Remove “${pendingRemove.title}” from Gwuma? The file on disk is not deleted.`
            : ""
        }
        confirmLabel="Remove"
        danger
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          if (!pendingRemove) return;
          const id = pendingRemove.id;
          setPendingRemove(null);
          void removeBook(id).catch((error) => {
            console.error("Failed to remove book", error);
          });
        }}
      />
    </div>
  );
}
