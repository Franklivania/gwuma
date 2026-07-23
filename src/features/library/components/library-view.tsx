import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/button";
import { useDialogStore } from "@/stores/dialog.store";

export function LibraryView() {
  const open = useDialogStore((state) => state.open);

  return (
    <EmptyState
      title="Your library is empty"
      description="Add a folder of books to start reading. Gwuma indexes files in place and never copies them."
      action={<Button onClick={() => open("folder-picker")}>Add folder</Button>}
    />
  );
}
