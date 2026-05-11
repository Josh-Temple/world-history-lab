import { loadReviewStore, getDueItems, getWeakItems } from '../shared/review-store.js';
import { getNormalizedEvents } from '../shared/data-store.js';

const reviewSummary = document.getElementById('review-summary');
const weakItemsEl = document.getElementById('weak-items');
const recentUnitsEl = document.getElementById('recent-units');
const quickActionsEl = document.getElementById('quick-actions');

function readRecentUnits() {
  try {
    const raw = JSON.parse(localStorage.getItem('whl_recent_units_v1') || '[]');
    return Array.isArray(raw) ? raw.slice(-5).reverse() : [];
  } catch {
    return [];
  }
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

  quickActionsEl.innerHTML = `
    <h2>Quick Actions</h2>
    <ul>
      <li><a href="/apps/session-runner/?mode=review">Start Review Session</a></li>
      <li><a href="/apps/session-runner/">Start Guided Session</a></li>
      <li><a href="/apps/timeline-trainer/">Practice Timeline Core</a></li>
    </ul>
  `;
}

render();
