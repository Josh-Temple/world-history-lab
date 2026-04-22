const KEY = 'whl_mastery_v1';
const REVIEW_QUEUE_KEY = 'whl_review_queue_v1';
const EMPTY_STATS = Object.freeze({
  seen: 0,
  correct: 0,
  incorrect: 0,
  total_error: 0,
  total_score: 0,
  attempts: 0,
  last_seen: null,
});

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function sanitizeStats(stats) {
  const seen = Number.isFinite(stats?.seen)
    ? Math.max(0, stats.seen)
    : (Number.isFinite(stats?.attempts) ? Math.max(0, stats.attempts) : 0);
  return {
    seen,
    correct: Number.isFinite(stats?.correct) ? Math.max(0, stats.correct) : 0,
    incorrect: Number.isFinite(stats?.incorrect) ? Math.max(0, stats.incorrect) : 0,
    total_error: Number.isFinite(stats?.total_error) ? Math.max(0, stats.total_error) : 0,
    total_score: Number.isFinite(stats?.total_score) ? Math.max(0, stats.total_score) : 0,
    attempts: seen,
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

function loadReviewQueue() {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(REVIEW_QUEUE_KEY);
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
        .map(([eventId, row]) => [
          eventId,
          {
            count: Number.isFinite(row?.count) ? Math.max(0, row.count) : 0,
            last_incorrect: Number.isFinite(row?.last_incorrect) ? row.last_incorrect : null,
            last_seen: Number.isFinite(row?.last_seen) ? row.last_seen : null,
          },
        ])
        .filter(([, row]) => row.count > 0),
    );
  } catch (error) {
    console.warn('[mastery-store] Falling back to empty review queue.', error);
    return {};
  }
}

function saveReviewQueue(queue) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('[mastery-store] Could not persist review queue.', error);
  }
}

function updateReviewQueue(eventId, correct) {
  const queue = loadReviewQueue();
  const existing = queue[eventId] || { count: 0, last_incorrect: null, last_seen: null };
  const now = Date.now();

  if (correct) {
    if (existing.count <= 1) {
      delete queue[eventId];
    } else {
      queue[eventId] = {
        ...existing,
        count: existing.count - 1,
        last_seen: now,
      };
    }
  } else {
    queue[eventId] = {
      count: existing.count + 1,
      last_incorrect: now,
      last_seen: now,
    };
  }

  saveReviewQueue(queue);
}

export function recordResult(eventId, correct, details = {}) {
  if (typeof eventId !== 'string' || eventId.length === 0) {
    return;
  }

  const data = load();
  const existing = sanitizeStats(data[eventId] || EMPTY_STATS);
  const numericError = Number.isFinite(details?.error) ? Math.max(0, details.error) : 0;
  const numericScore = Number.isFinite(details?.score) ? Math.max(0, details.score) : (correct ? 1 : 0);
  const next = {
    ...existing,
    seen: existing.seen + 1,
    correct: existing.correct + (correct ? 1 : 0),
    incorrect: existing.incorrect + (correct ? 0 : 1),
    total_error: existing.total_error + numericError,
    total_score: existing.total_score + numericScore,
    attempts: existing.seen + 1,
    last_seen: Date.now(),
  };

  data[eventId] = next;
  save(data);
  updateReviewQueue(eventId, correct);
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

export function getAccuracy(eventId) {
  const stats = getStats(eventId);
  const total = stats.correct + stats.incorrect;
  if (total === 0) {
    return null;
  }
  return stats.correct / total;
}

export function getWeight(eventId) {
  const accuracy = getAccuracy(eventId);
  if (accuracy === null) {
    return 3;
  }
  return 1 + (1 - accuracy) * 3;
}

export function isWeakEvent(eventId, threshold = 0.6) {
  const accuracy = getAccuracy(eventId);
  return accuracy === null || accuracy < threshold;
}

export function getReviewQueueEventIds(limit = 20) {
  const queue = loadReviewQueue();
  return Object.entries(queue)
    .sort(([, left], [, right]) => right.count - left.count || (right.last_incorrect || 0) - (left.last_incorrect || 0))
    .slice(0, limit)
    .map(([eventId]) => eventId);
}
