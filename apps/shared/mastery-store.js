const KEY = 'whl_mastery_v1';
const EMPTY_STATS = Object.freeze({ correct: 0, incorrect: 0, last_seen: null });

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function sanitizeStats(stats) {
  return {
    correct: Number.isFinite(stats?.correct) ? Math.max(0, stats.correct) : 0,
    incorrect: Number.isFinite(stats?.incorrect) ? Math.max(0, stats.incorrect) : 0,
    last_seen: Number.isFinite(stats?.last_seen) ? stats.last_seen : null,
  };
}

function load() {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([eventId]) => typeof eventId === 'string' && eventId.length > 0)
        .map(([eventId, stats]) => [eventId, sanitizeStats(stats)])
    );
  } catch (error) {
    console.warn('[mastery-store] Falling back to empty mastery state.', error);
    return {};
  }
}

function save(data) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[mastery-store] Could not persist mastery state.', error);
  }
}

export function recordResult(eventId, correct) {
  if (typeof eventId !== 'string' || eventId.length === 0) {
    return;
  }

  const data = load();
  const existing = sanitizeStats(data[eventId] || EMPTY_STATS);
  const next = {
    ...existing,
    correct: existing.correct + (correct ? 1 : 0),
    incorrect: existing.incorrect + (correct ? 0 : 1),
    last_seen: Date.now(),
  };

  data[eventId] = next;
  save(data);
  return next;
}

export function getStats(eventId) {
  if (typeof eventId !== 'string' || eventId.length === 0) {
    return { ...EMPTY_STATS };
  }

  const data = load();
  return sanitizeStats(data[eventId] || EMPTY_STATS);
}

export function getAllStats() {
  return load();
}
