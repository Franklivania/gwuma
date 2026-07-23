import { EmptyState } from "@/components/empty-state";

export function ReaderView() {
  return (
    <EmptyState
      title="No book open"
      description="Open a book from your library to start reading."
    />
  );
}
