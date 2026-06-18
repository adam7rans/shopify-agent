const DEFAULT_TTL_MS = 5 * 60 * 1000;
const SESSION_EXPIRY_MS = 30 * 60 * 1000;

interface CacheEntry {
  result: unknown;
  timestamp: number;
}

interface SessionCache {
  entries: Map<string, CacheEntry>;
  lastAccess: number;
}

const sessions = new Map<string, SessionCache>();

function getSession(sessionId: string): SessionCache {
  let session = sessions.get(sessionId);
  if (!session) {
    session = { entries: new Map(), lastAccess: Date.now() };
    sessions.set(sessionId, session);
  }
  session.lastAccess = Date.now();
  return session;
}

export function buildCacheKey(
  toolName: string,
  args: Record<string, unknown>,
): string {
  const sorted = Object.keys(args)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      if (args[k] !== undefined && args[k] !== null) acc[k] = args[k];
      return acc;
    }, {});
  return `${toolName}:${JSON.stringify(sorted)}`;
}

export function getCachedResult(
  sessionId: string,
  key: string,
): { result: unknown; ageMs: number } | null {
  const session = getSession(sessionId);
  const entry = session.entries.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > DEFAULT_TTL_MS) {
    session.entries.delete(key);
    return null;
  }

  return { result: entry.result, ageMs: age };
}

export function setCachedResult(
  sessionId: string,
  key: string,
  result: unknown,
): void {
  const session = getSession(sessionId);
  session.entries.set(key, { result, timestamp: Date.now() });
}

export function cleanExpiredSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastAccess > SESSION_EXPIRY_MS) {
      sessions.delete(id);
    }
  }
}

setInterval(cleanExpiredSessions, SESSION_EXPIRY_MS);
