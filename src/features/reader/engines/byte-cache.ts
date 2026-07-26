const MAX_ENTRIES = 4;

/** In-session LRU of book file bytes keyed by absolute path. */
const cache = new Map<string, Uint8Array>();

export function peekBookBytes(path: string): Uint8Array | null {
  const hit = cache.get(path);
  if (!hit) return null;
  cache.delete(path);
  cache.set(path, hit);
  return hit;
}

export function putBookBytes(path: string, bytes: Uint8Array): void {
  if (cache.has(path)) cache.delete(path);
  cache.set(path, bytes);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export async function getBookBytes(
  path: string,
  loader: () => Promise<Uint8Array>,
): Promise<Uint8Array> {
  const hit = peekBookBytes(path);
  if (hit) return hit;
  const bytes = await loader();
  putBookBytes(path, bytes);
  return bytes;
}
