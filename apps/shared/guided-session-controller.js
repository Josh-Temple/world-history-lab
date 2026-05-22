const MODE_LIBRARY = Object.freeze([
  { key: 'timeline-review', app: '/apps/timeline-trainer/index.html', type: 'recall', intensity: 1 },
  { key: 'event-recognition', app: '/apps/event-recognition/index.html', type: 'recall', intensity: 1 },
  { key: 'comparison-trainer', app: '/apps/comparison-trainer/index.html', type: 'synthesis', intensity: 2 },
  { key: 'causality-drill', app: '/apps/causality-drill/index.html', type: 'reasoning', intensity: 2 },
  { key: 'reasoning-lab', app: '/apps/historical-reasoning-lab/index.html', type: 'reasoning', intensity: 3 },
  { key: 'big-picture-history', app: '/apps/big-picture-history/index.html', type: 'synthesis', intensity: 2 },
]);

function normalizeWeakConcepts(masteryState = {}) {
  if (Array.isArray(masteryState.weakConcepts)) return masteryState.weakConcepts;
  const conceptScores = masteryState?.conceptScores || {};
  return Object.entries(conceptScores)
    .filter(([, score]) => Number(score) < 0.6)
    .map(([conceptId]) => conceptId)
    .slice(0, 8);
}

function rotateForFatigue(candidates, fatigueLevel) {
  const maxIntensity = fatigueLevel >= 0.7 ? 2 : 3;
  const filtered = candidates.filter((mode) => mode.intensity <= maxIntensity);
  const result = [];
  for (const mode of filtered) {
    const last = result[result.length - 1];
    if (last && last.type === mode.type) continue;
    result.push(mode);
  }
  return result;
}

export function buildGuidedSession({ masteryState = {}, recentActivity = [], fatigueLevel = 0.35 } = {}) {
  const weakConcepts = normalizeWeakConcepts(masteryState);
  const recentModes = new Set((Array.isArray(recentActivity) ? recentActivity : []).slice(-4));
  const masteryHigh = Number(masteryState.avgScore || 0) >= 0.72;

  const preferred = [];
  if (weakConcepts.length > 3) {
    preferred.push('timeline-review', 'event-recognition');
  }
  preferred.push('comparison-trainer', masteryHigh ? 'reasoning-lab' : 'causality-drill', 'big-picture-history');

  const candidates = preferred
    .map((key) => MODE_LIBRARY.find((mode) => mode.key === key))
    .filter(Boolean)
    .filter((mode) => !recentModes.has(mode.key));

  const rotated = rotateForFatigue(candidates, Math.max(0, Math.min(1, Number(fatigueLevel) || 0)));
  const modes = rotated.length >= 3 ? rotated.slice(0, 4) : MODE_LIBRARY.slice(0, 4);

  return {
    createdAt: Date.now(),
    fatigueLevel,
    weakConcepts,
    masteryHigh,
    modes,
    recommendation: modes[0]?.key || 'timeline-review',
  };
}
