const KEY = 'whl_mastery_v1';
const REVIEW_QUEUE_KEY = 'whl_review_queue_v1';
const CONCEPT_KEY = 'whl_concept_mastery_v1';
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

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
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
    ...(stats?.last_answer && typeof stats.last_answer === 'object' ? { last_answer: stats.last_answer } : {}),
  };
}

function loadFromKey(key) {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveToKey(key, data) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

function load() {
  const parsed = loadFromKey(KEY);
  return Object.fromEntries(
    Object.entries(parsed)
      .filter(([eventId]) => typeof eventId === 'string' && eventId.length > 0)
      .map(([eventId, stats]) => [eventId, sanitizeStats(stats)])
  );
}

function save(data) { saveToKey(KEY, data); }
function loadReviewQueue() { return loadFromKey(REVIEW_QUEUE_KEY); }
function saveReviewQueue(queue) { saveToKey(REVIEW_QUEUE_KEY, queue); }

export function loadConceptMastery() {
  return loadFromKey(CONCEPT_KEY);
}

export function saveConceptMastery(store) {
  saveToKey(CONCEPT_KEY, store || {});
}

export function updateConceptMastery({ conceptId, correct = false, confidence = 'skip' } = {}) {
  if (!conceptId) return null;
  const store = loadConceptMastery();
  const existing = store[conceptId] || { score: 0.35, attempts: 0, lastReviewed: null, confidence_history: [] };
  const confidenceBoost = confidence === 'easy' ? 0.05 : confidence === 'hard' ? -0.02 : 0;
  const delta = correct ? 0.08 : -0.12;
  const score = clamp01((Number(existing.score) || 0.35) + delta + confidenceBoost);
  const history = Array.isArray(existing.confidence_history) ? existing.confidence_history.slice(-19) : [];
  history.push(confidence);
  const next = { ...existing, score, attempts: (Number(existing.attempts) || 0) + 1, lastReviewed: Date.now(), confidence_history: history };
  store[conceptId] = next;
  saveConceptMastery(store);
  return next;
}

export function getWeakestConcepts({ limit = 5 } = {}) {
  const now = Date.now();
  return Object.entries(loadConceptMastery())
    .map(([conceptId, row]) => {
      const score = Number(row?.score || 0);
      const lastReviewed = Number(row?.lastReviewed || 0);
      const staleDays = lastReviewed ? (now - lastReviewed) / (1000 * 60 * 60 * 24) : 365;
      const risk = clamp01((1 - score) * 0.7 + Math.min(1, staleDays / 21) * 0.3);
      return { conceptId, score, lastReviewed, risk };
    })
    .sort((a, b) => b.risk - a.risk)
    .slice(0, Math.max(0, limit));
}

export function getConceptMasterySummary() {
  const rows = Object.entries(loadConceptMastery());
  if (!rows.length) return { weakest: null, strongest: null, avgScore: 0, trackedConcepts: 0 };
  const scored = rows.map(([conceptId, row]) => ({ conceptId, score: Number(row?.score || 0) }));
  scored.sort((a, b) => a.score - b.score);
  const avgScore = scored.reduce((sum, row) => sum + row.score, 0) / scored.length;
  return { weakest: scored[0], strongest: scored[scored.length - 1], avgScore, trackedConcepts: scored.length };
}

function updateReviewQueue(eventId, correct) { const queue = loadReviewQueue(); const existing = queue[eventId] || { count: 0, last_incorrect: null, last_seen: null }; const now = Date.now(); if (correct) { if (existing.count <= 1) delete queue[eventId]; else queue[eventId] = { ...existing, count: existing.count - 1, last_seen: now }; } else { queue[eventId] = { count: existing.count + 1, last_incorrect: now, last_seen: now }; } saveReviewQueue(queue); }
export function recordResult(eventId, correct, details = {}) { if (typeof eventId !== 'string' || eventId.length === 0) return; const data = load(); const existing = sanitizeStats(data[eventId] || EMPTY_STATS); const numericError = Number.isFinite(details?.error) ? Math.max(0, details.error) : 0; const numericScore = Number.isFinite(details?.score) ? Math.max(0, details.score) : (correct ? 1 : 0); const next = { ...existing, seen: existing.seen + 1, correct: existing.correct + (correct ? 1 : 0), incorrect: existing.incorrect + (correct ? 0 : 1), total_error: existing.total_error + numericError, total_score: existing.total_score + numericScore, attempts: existing.seen + 1, last_seen: Date.now(), ...(details?.answer ? { last_answer: details.answer } : {}) }; data[eventId] = next; save(data); updateReviewQueue(eventId, correct); return next; }
export function getStats(eventId) { if (typeof eventId !== 'string' || eventId.length === 0) return { ...EMPTY_STATS }; const data = load(); return sanitizeStats(data[eventId] || EMPTY_STATS); }
export function getAllStats() { return load(); }
export function getAccuracy(eventId) { const stats = getStats(eventId); const total = stats.correct + stats.incorrect; if (total === 0) return null; return stats.correct / total; }
export function getWeight(eventId) { const accuracy = getAccuracy(eventId); if (accuracy === null) return 3; return 1 + (1 - accuracy) * 3; }
export function isWeakEvent(eventId, threshold = 0.6) { const accuracy = getAccuracy(eventId); return accuracy === null || accuracy < threshold; }
export function getReviewQueueEventIds(limit = 20) { const queue = loadReviewQueue(); return Object.entries(queue).sort(([, left], [, right]) => right.count - left.count || (right.last_incorrect || 0) - (left.last_incorrect || 0)).slice(0, limit).map(([eventId]) => eventId); }
