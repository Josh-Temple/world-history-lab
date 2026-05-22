const KEY = 'whl_session_handoff_v1';

export function loadSessionHandoff() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSessionHandoff(payload = {}) {
  const next = {
    currentConceptCluster: payload.currentConceptCluster || '',
    activeRegions: Array.isArray(payload.activeRegions) ? payload.activeRegions : [],
    weakConcepts: Array.isArray(payload.weakConcepts) ? payload.weakConcepts : [],
    sessionProgress: payload.sessionProgress || { modeIndex: 0, answered: 0, total: 0 },
    recentModes: Array.isArray(payload.recentModes) ? payload.recentModes : [],
    updatedAt: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
