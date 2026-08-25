import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type {
  BookStats,
  IndexStatus,
  SearchHit,
  StatisticsSummary,
  StatsPeriod,
} from "@/types";

function toDisplayCoverUrl(
  cover: string | null | undefined,
): string | undefined {
  if (!cover) return undefined;
  if (
    cover.startsWith("asset:") ||
    cover.startsWith("http://") ||
    cover.startsWith("https://") ||
    cover.startsWith("blob:") ||
    cover.startsWith("data:")
  ) {
    return cover;
  }
  try {
    return convertFileSrc(cover);
  } catch {
    return cover;
  }
}

function normalizeSearchHit(raw: SearchHit): SearchHit {
  return {
    ...raw,
    coverUrl: toDisplayCoverUrl(raw.coverUrl ?? undefined) ?? null,
    snippet: raw.snippet ?? null,
  };
}

export async function getStatisticsSummary(
  period: StatsPeriod,
): Promise<StatisticsSummary> {
  return invoke<StatisticsSummary>("get_statistics_summary", { period });
}

export async function listBookStats(
  period?: StatsPeriod | null,
): Promise<BookStats[]> {
  return invoke<BookStats[]>("list_book_stats", {
    period: period ?? null,
  });
}

export async function pingReadingSession(sessionId: string): Promise<void> {
  await invoke("ping_reading_session", { sessionId });
}

export async function endReadingSession(sessionId: string): Promise<void> {
  await invoke("end_reading_session", { sessionId });
}

export async function searchLibrary(
  query: string,
  limit = 20,
): Promise<SearchHit[]> {
  const hits = await invoke<SearchHit[]>("search_library", { query, limit });
  return hits.map(normalizeSearchHit);
}

export async function ensureBookIndexed(id: string): Promise<IndexStatus> {
  return invoke<IndexStatus>("ensure_book_indexed", { id });
}

export async function upsertBookTextChunks(
  id: string,
  chunks: string[],
): Promise<void> {
  await invoke("upsert_book_text_chunks", { id, chunks });
}
