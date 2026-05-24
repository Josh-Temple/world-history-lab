const DAY_MS = 24 * 60 * 60 * 1000;

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function normalizeHistory(values = []) {
  return Array.isArray(values) ? values.filter((v) => typeof v === 'number') : [];
}

export function calculateForgettingRisk({
  lastReviewed = null,
  correctnessHistory = [],
  confidenceHistory = [],
  conceptComplexity = 0.5,
  repetitionSpacingDays = 0,
} = {}) {
  const now = Date.now();
  const last = Number(lastReviewed) || 0;
  const staleDays = last > 0 ? (now - last) / DAY_MS : 365;
  const accuracyHistory = normalizeHistory(correctnessHistory);
  const accuracy = accuracyHistory.length
    ? accuracyHistory.reduce((sum, value) => sum + clamp01(value), 0) / accuracyHistory.length
    : 0.45;

  const confidenceValues = normalizeHistory(confidenceHistory);
  const confidence = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + clamp01(value), 0) / confidenceValues.length
    : 0.5;

  const spacingFactor = Math.min(1, Math.max(0, repetitionSpacingDays) / 21);
  const staleFactor = Math.min(1, staleDays / 30);
  const complexityFactor = clamp01(conceptComplexity);

  return clamp01(
    (1 - accuracy) * 0.42 +
    (1 - confidence) * 0.18 +
    staleFactor * 0.22 +
    complexityFactor * 0.1 +
    (1 - spacingFactor) * 0.08,
  );
}

export function recommendInterleaving(items = []) {
  const pool = Array.isArray(items) ? [...items] : [];
  const output = [];
  while (pool.length) {
    const last = output[output.length - 1];
    const index = pool.findIndex((row) => {
      if (!last) return true;
      const sameRegion = row.regionId && row.regionId === last.regionId;
      const sameEra = row.era && row.era === last.era;
      const sameMode = row.reasoningMode && row.reasoningMode === last.reasoningMode;
      return !(sameRegion || sameEra || sameMode);
    });
    output.push(pool.splice(index >= 0 ? index : 0, 1)[0]);
  }
  return output;
}

export function buildRetentionQueue(items = [], { limit = 40 } = {}) {
  const ranked = (Array.isArray(items) ? items : [])
    .map((row) => ({ ...row, forgettingRisk: clamp01(row.forgettingRisk) }))
    .sort((a, b) => b.forgettingRisk - a.forgettingRisk);
  return recommendInterleaving(ranked).slice(0, Math.max(1, limit));
}

export function recommendReviewMode({ conceptId = '', forgettingRisk = 0, weakness = 'factual' } = {}) {
  if (weakness === 'causal') return '/apps/historical-reasoning-lab/';
  if (weakness === 'synthesis') return '/apps/big-picture-history/';
  if ((conceptId || '').includes('timeline') || forgettingRisk >= 0.75) return '/apps/timeline-trainer/';
  return '/apps/session-runner/?mode=review';
}
