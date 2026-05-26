import { loadReviewStore, getDueItems, getWeakItems } from '../shared/review-store.js';
import { getConceptMasterySummary, getWeakestConcepts } from '../shared/mastery-store.js';
import { buildGuidedSession } from '../shared/guided-session-controller.js';
import { recommendReviewMode } from '../shared/retention-engine.js';
import { saveSessionHandoff, loadSessionHandoff } from '../shared/session-handoff-store.js';
import { getNormalizedEvents } from '../shared/data-store.js';

const reviewSummary = document.getElementById('review-summary');
const weakItemsEl = document.getElementById('weak-items');
const recentUnitsEl = document.getElementById('recent-units');
const quickActionsEl = document.getElementById('quick-actions');
const progressionSummaryEl = document.getElementById('progression-summary');
const recommendedPathsEl = document.getElementById('recommended-paths');
const guidedSessionLaunchEl = document.getElementById('guided-session-launch');
const thematicPathwaysEl = document.getElementById('thematic-pathways');

function readRecentUnits() {
  try {
    const raw = JSON.parse(localStorage.getItem('whl_recent_units_v1') || '[]');
    return Array.isArray(raw) ? raw.slice(-5).reverse() : [];
  } catch {
    return [];
  }
}


function getRecommendedPaths({ masteredConcepts, availablePaths }) {
  const mastered = new Set(Array.isArray(masteredConcepts) ? masteredConcepts : []);
  return (Array.isArray(availablePaths) ? availablePaths : []).filter((path) => {
    const required = Array.isArray(path.required_concept_ids) ? path.required_concept_ids : [];
    return required.every((id) => mastered.has(id));
  });
}

async function loadProgressionData() {
  const [concepts, paths] = await Promise.all([
    fetch('/data/concepts.json').then((r) => r.json()).catch(() => []),
    fetch('/data/learning-paths.json').then((r) => r.json()).catch(() => []),
  ]);
  return { concepts: Array.isArray(concepts) ? concepts : [], paths: Array.isArray(paths) ? paths : [] };
}

function formatDate(ts) {
  if (!Number.isFinite(ts) || ts <= 0) return 'Never';
  return new Date(ts).toLocaleDateString();
}

async function render() {
  const store = loadReviewStore();
  const due = getDueItems(store);
  const weak = getWeakItems(store, 10);
  const events = await getNormalizedEvents().catch(() => []);
  const labelById = new Map((Array.isArray(events) ? events : []).map((event) => [event.id, event.label]));

  reviewSummary.innerHTML = `<h2>Reviews Due</h2><p><strong>${due.length}</strong> items ready for review</p>`;

  weakItemsEl.innerHTML = '<h2>Weak Items</h2>';
  if (weak.length === 0) {
    weakItemsEl.innerHTML += '<p>No tracked weak items yet. Complete a guided session first.</p>';
  } else {
    const list = document.createElement('ul');
    for (const [id, item] of weak) {
      if (!labelById.has(id) && id.includes("::")) continue;
      const li = document.createElement('li');
      const mastery = Math.round((Number(item?.mastery || 0) * 100));
      const label = labelById.get(id) || id;
      li.textContent = `${label} (${id}) · mastery ${mastery}% · last reviewed ${formatDate(Number(item?.last_reviewed || 0))}`;
      list.appendChild(li);
    }
    weakItemsEl.appendChild(list);
  }

  const recentUnits = readRecentUnits();
  recentUnitsEl.innerHTML = '<h2>Recently Practiced Units</h2>';
  recentUnitsEl.innerHTML += recentUnits.length
    ? `<ul>${recentUnits.map((unitId) => `<li>${unitId}</li>`).join('')}</ul>`
    : '<p>No recent unit history yet.</p>';

  const { concepts, paths } = await loadProgressionData();
  const conceptSummary = getConceptMasterySummary();
  const weakestConcepts = getWeakestConcepts({ limit: 3 });
  const masteredConcepts = concepts
    .filter((concept) => ['beginner','intermediate','advanced'].includes(concept?.difficulty))
    .filter((concept) => concept.difficulty === 'beginner')
    .map((concept) => concept.id);
  const recommended = getRecommendedPaths({ masteredConcepts, availablePaths: paths });

  const levels = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

  const thematicPaths = await fetch('/data/thematic-pathways.json').then((r) => r.json()).catch(() => []);
  thematicPathwaysEl.innerHTML = '<h2>Featured Thematic Journeys</h2>' + (Array.isArray(thematicPaths) && thematicPaths.length
    ? `<ul>${thematicPaths.slice(0,3).map((path) => `<li><strong>${path.title}</strong> · ${(path.recommended_level || 'all').toUpperCase()} · ~${path.estimated_steps || 0} steps<br/><span>${path.why_it_matters || path.summary || ''}</span></li>`).join('')}</ul>`
    : '<p>No thematic pathways loaded yet.</p>');

  progressionSummaryEl.innerHTML = `<h2>Progression Summary</h2><p>Recommended next concept cluster: ${masteredConcepts.length ? 'Foundations and early trade systems' : 'Start with beginner foundations'}.</p><p>Concept mastery: ${Math.round((conceptSummary.avgScore || 0) * 100)}% across ${conceptSummary.trackedConcepts} tracked concepts.</p>${weakestConcepts.length ? `<p>Weakest area now: ${weakestConcepts[0].conceptId}</p>` : '<p>No concept mastery data yet.</p>'}`;
  recommendedPathsEl.innerHTML = '<h2>Recommended Learning Paths</h2>' + (recommended.length
    ? `<ul>${recommended.slice(0,4).map((path) => `<li>Ready for ${levels[path.recommended_level] || 'Next'} · ${path.label}</li>`).join('')}</ul>`
    : '<p>Complete more foundations to unlock intermediate pathways.</p>');


  const guidedSession = buildGuidedSession({
    masteryState: { avgScore: conceptSummary.avgScore, weakConcepts: weakestConcepts.map((c) => c.conceptId) },
    recentActivity: loadSessionHandoff().recentModes || [],
    fatigueLevel: 0.35,
  });
  saveSessionHandoff({
    weakConcepts: guidedSession.weakConcepts,
    currentConceptCluster: guidedSession.weakConcepts[0] || 'foundations',
    activeRegions: [],
    sessionProgress: { modeIndex: 0, answered: 0, total: guidedSession.modes.length * 5 },
    recentModes: guidedSession.modes.map((mode) => mode.key),
  });
  const topRisk = guidedSession.retentionQueue?.[0];
  const reinforcementHref = recommendReviewMode({ conceptId: topRisk?.conceptId || '', forgettingRisk: Number(topRisk?.forgettingRisk || 0), weakness: 'factual' });
  guidedSessionLaunchEl.innerHTML = `<h2>Guided Session</h2><p>Recommended next action: <strong>${guidedSession.recommendation}</strong></p><p>Highest forgetting risk: <strong>${topRisk?.conceptId || 'n/a'}</strong>${topRisk ? ` (${Math.round(topRisk.forgettingRisk * 100)}%)` : ''}</p><p><a href="${reinforcementHref}">Reinforcement recommendation</a></p><button id="start-guided-session" type="button">Start Guided Session</button>`;
  document.getElementById('start-guided-session')?.addEventListener('click', () => {
    window.location.href = '/apps/session-runner/?guided=1';
  });


  quickActionsEl.innerHTML = `
    <h2>Quick Actions</h2>
    <ul>
      <li><a href="/apps/session-runner/?mode=review">Start Review Session</a></li>
      <li><a href="/apps/session-runner/">Start Guided Session</a></li>
      <li><a href="/apps/timeline-trainer/">Practice Timeline Core</a></li>
      <li><a href="/apps/historical-reasoning-lab/">Adaptive reasoning for weak concepts</a></li>
    </ul>
  `;
}

render();
