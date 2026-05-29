import { getWeakestConcepts, getConceptMasterySummary, loadConceptMastery } from './mastery-store.js';
import { buildGuidedSession } from './guided-session-controller.js';
import { loadSessionHandoff } from './session-handoff-store.js';

const CONTINUITY_KEY = 'whl_next_session_memory_v1';

function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }

function loadContinuityMemory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONTINUITY_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveContinuityMemory(memory) {
  try { localStorage.setItem(CONTINUITY_KEY, JSON.stringify(memory || {})); } catch {}
}

export function calculateLearnerNeeds() {
  const weakestConcepts = getWeakestConcepts({ limit: 6 });
  const conceptSummary = getConceptMasterySummary();
  const conceptStore = loadConceptMastery();
  const recentModes = loadSessionHandoff().recentModes || [];
  const continuity = loadContinuityMemory();
  const avgAttempts = Object.values(conceptStore).reduce((sum, row) => sum + Number(row?.attempts || 0), 0) / Math.max(1, Object.keys(conceptStore).length);
  const fatigueRisk = clamp01((recentModes.length / 8) * 0.5 + (avgAttempts > 7 ? 0.35 : 0.1) + ((continuity.lastSessionMinutes || 0) > 25 ? 0.25 : 0));

  return {
    weakestConcepts,
    avgScore: conceptSummary.avgScore || 0,
    trackedConcepts: conceptSummary.trackedConcepts || 0,
    fatigueRisk,
    recentModes,
    continuity,
    weakCausalReasoning: weakestConcepts.some((row) => (row.conceptId || '').includes('cause') || (row.conceptId || '').includes('state_formation')),
  };
}

export function buildSessionMix(needs) {
  const base = [];
  if (needs.weakCausalReasoning) base.push({ app: '/apps/historical-systems-simulator/', label: 'Historical Systems Simulator', skill: 'causal reasoning', intensity: 'high', why: 'You need multi-causal systems practice.' });
  if (needs.fatigueRisk >= 0.65) base.push({ app: '/apps/timeline-trainer/', label: 'Timeline Trainer', skill: 'chronology recall', intensity: 'low', why: 'Short recall bursts reduce fatigue while preserving momentum.' });
  base.push({ app: '/apps/historical-source-lab/', label: 'Historical Source Lab', skill: 'evidence evaluation', intensity: 'medium', why: 'Evidence quality practice complements your concept gaps.' });
  base.push({ app: '/apps/historical-argument-builder/', label: 'Historical Argument Builder', skill: 'argument synthesis', intensity: 'high', why: 'Structured writing consolidates retention into explanation.' });
  const seen = new Set();
  return base.filter((entry) => {
    if (seen.has(entry.app)) return false;
    seen.add(entry.app);
    return !needs.recentModes.some((mode) => entry.app.includes(mode));
  }).slice(0, 3);
}

export function recommendNextSession() {
  const needs = calculateLearnerNeeds();
  const guided = buildGuidedSession({
    masteryState: { avgScore: needs.avgScore, weakConcepts: needs.weakestConcepts.map((c) => c.conceptId) },
    recentActivity: needs.recentModes,
    fatigueLevel: needs.fatigueRisk,
  });
  const mix = buildSessionMix(needs);
  const primary = mix[0] || { app: guided.modes[0]?.app || '/apps/session-runner/?guided=1', label: guided.recommendation, skill: 'adaptive review', intensity: 'medium', why: 'Fallback guided recommendation.' };
  const payload = {
    generatedAt: Date.now(),
    primary,
    alternates: mix.slice(1),
    estimatedMinutes: primary.intensity === 'high' ? 20 : primary.intensity === 'medium' ? 14 : 8,
    needs,
    guided,
    balanceMetrics: {
      varietyScore: new Set(mix.map((row) => row.intensity)).size / Math.max(1, mix.length),
      fatigueRisk: needs.fatigueRisk,
      recentModeCount: needs.recentModes.length,
    },
  };
  saveContinuityMemory({
    lastRecommendation: primary.label,
    lastSessionMinutes: payload.estimatedMinutes,
    lastFocusConcept: needs.weakestConcepts[0]?.conceptId || null,
    interrupted: false,
    updatedAt: Date.now(),
  });
  return payload;
}
