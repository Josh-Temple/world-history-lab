const STORAGE_KEY = 'whl_review_store_v1';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function loadReviewStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveReviewStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store || {}));
}

export function updateReviewItem(item = {}, { correct = false, confidence = 'skip' } = {}) {
  const next = { ...item };
  const delta = correct && confidence === 'easy' ? 0.15 : correct ? 0.08 : -0.12;
  next.mastery = clamp01((Number(next.mastery) || 0.3) + delta);
  next.attempts = (Number(next.attempts) || 0) + 1;
  next.correct = (Number(next.correct) || 0) + (correct ? 1 : 0);
  const history = Array.isArray(next.confidence_history) ? next.confidence_history.slice(-19) : [];
  history.push(confidence);
  next.confidence_history = history;
  next.last_reviewed = Date.now();

  const interval = next.mastery > 0.8
    ? 1000 * 60 * 60 * 24 * 14
    : next.mastery > 0.5
      ? 1000 * 60 * 60 * 24 * 5
      : 1000 * 60 * 60 * 24;
  next.due_at = Date.now() + interval;
  return next;
}

export function getDueItems(store = {}) {
  const now = Date.now();
  return Object.entries(store)
    .filter(([, item]) => Number(item?.due_at || 0) <= now)
    .map(([id]) => id);
}

export function getWeakItems(store = {}, limit = 10) {
  return Object.entries(store)
    .sort((a, b) => (Number(a[1]?.mastery || 0) - Number(b[1]?.mastery || 0)))
    .slice(0, Math.max(0, limit));
}
