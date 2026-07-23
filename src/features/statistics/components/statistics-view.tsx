import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/badge";
import { useStatisticsStore } from "@/stores/statistics.store";

export function StatisticsView() {
  const booksRead = useStatisticsStore((state) => state.booksRead);
  const readingTimeMinutes = useStatisticsStore(
    (state) => state.readingTimeMinutes,
  );

  return (
    <EmptyState
      title="Statistics"
      description="Reading stats will appear here as you use Gwuma."
      action={
        <>
          <Badge variant="accent">{booksRead} books read</Badge>{" "}
          <Badge>{readingTimeMinutes} min</Badge>
        </>
      }
    />
  );
}
