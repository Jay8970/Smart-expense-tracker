const REPORT_CACHE_TTL_MS = 1000 * 60 * 10;
const reportCache = new Map();

function normalizeUserId(userId) {
  return String(userId);
}

function getCacheKey(userId, year, month) {
  return `${normalizeUserId(userId)}:${year}:${month}`;
}

export function getCachedReportData(userId, year, month) {
  const key = getCacheKey(userId, year, month);
  const cached = reportCache.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    reportCache.delete(key);
    return null;
  }

  return cached.value;
}

export function setCachedReportData(userId, year, month, value) {
  reportCache.set(getCacheKey(userId, year, month), {
    value,
    expiresAt: Date.now() + REPORT_CACHE_TTL_MS
  });
  return value;
}

export function clearReportCacheForUser(userId) {
  const userKeyPrefix = `${normalizeUserId(userId)}:`;

  for (const key of reportCache.keys()) {
    if (key.startsWith(userKeyPrefix)) {
      reportCache.delete(key);
    }
  }
}
