export type StatsPeriod = "weekly" | "monthly" | "quarterly" | "yearly";

export type RingMetric = {
  id: string;
  label: string;
  value: number;
  display: string;
  percent: number;
  hidePercent?: boolean;
};

export type WeekDayStat = {
  dayKey: string;
  weekday: string;
  hoursMs: number;
  booksOpened: number;
};

export type ActivityCardSummary = {
  headlinePrimary: string;
  headlinePrimaryLabel: string;
  headlineSecondary: string;
  headlineSecondaryLabel: string;
  rings: RingMetric[];
  peakDay?: string | null;
  weekDays?: WeekDayStat[] | null;
  chart: "bars" | "rings";
};

export type StatisticsSummary = {
  period: StatsPeriod;
  libraryCount: number;
  time: ActivityCardSummary;
  books: ActivityCardSummary;
};

export type BookStats = {
  bookId: string;
  title: string;
  author: string;
  startedAt: string | null;
  finishedAt: string | null;
  totalReadMs: number;
  openCount: number;
};

export type SearchHit = {
  bookId: string;
  title: string;
  author: string;
  kind: "title" | "author" | "phrase";
  snippet?: string | null;
  coverUrl?: string | null;
  format?: string | null;
  path?: string | null;
};

export type IndexStatus = {
  indexed: boolean;
  needsFrontendChunks: boolean;
};
