import { fetchJson } from '/apps/shared/data-access.js';
import { getConfidenceLabel, getEvidenceBadge } from '/apps/shared/evidence-utils.js';

const el = document.getElementById('source-lab');
const state = { sources: [], events: [], concepts: [], selected: new Set() };

const byId = (list) => new Map((Array.isArray(list) ? list : []).map((x) => [x.id, x]));

function render() {
  const eventMap = byId(state.events);
  const conceptMap = byId(state.concepts);
  const selected = state.sources.filter((s) => state.selected.has(s.id));
  const focus = selected[0] || state.sources[0];

  el.innerHTML = `
    <section class="panel"><h1>Historical Source Lab</h1><p>Inspect source fragments, compare interpretations, and reason about evidence quality.</p></section>
    <section class="panel"><h2>Choose source fragments</h2><div class="source-list">${state.sources.map((s) => `<button class="${state.selected.has(s.id) ? 'active' : ''}" data-id="${s.id}">${s.title}</button>`).join('')}</div></section>
    ${focus ? `<section class="panel"><h2>${focus.title}</h2><p><strong>Author:</strong> ${focus.author} · <strong>Date:</strong> ${focus.date_label}</p><p><em>${focus.excerpt}</em></p><div class="row"><div><h3>Context</h3><p>${focus.historical_context || 'Context unavailable.'}</p><p><strong>Audience:</strong> ${focus.intended_audience || 'Unknown'}</p></div><div><h3>Reliability discussion</h3><p>${focus.bias_considerations || 'Consider perspective limits.'}</p><p>Firsthand/secondhand: ${focus.firsthand_status || 'Mixed'}</p><p>Incentives: ${focus.political_incentives || 'Not explicit'}</p><span class="evidence-badge ${getEvidenceBadge(focus.evidence_strength).level}">${getEvidenceBadge(focus.evidence_strength).label}</span><p>${getConfidenceLabel(focus.confidence_level)}</p></div></div><section class="prompt"><p>What limitations might affect this source?</p><p>How could another source challenge this account?</p></section><p><strong>Related events:</strong> ${(focus.related_event_ids || []).map((id) => eventMap.get(id)?.label || id).join(', ') || 'None'}</p><p><strong>Related concepts:</strong> ${(focus.related_concept_ids || []).map((id) => conceptMap.get(id)?.label || id).join(', ') || 'None'}</p></section>` : ''}
    ${selected.length > 1 ? `<section class="panel"><h2>Cross-source comparison</h2>${selected.slice(0,4).map((s) => `<article><h3>${s.title}</h3><p><em>${s.excerpt}</em></p><p>${getConfidenceLabel(s.confidence_level)}</p></article>`).join('')}</section>` : '<section class="panel"><h2>Cross-source comparison</h2><p>Select at least two sources to compare contrasting perspectives.</p></section>'}
  `;

  el.querySelectorAll('button[data-id]').forEach((btn) => btn.onclick = () => {
    const { id } = btn.dataset;
    if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
    render();
  });
}

async function init() {
  const [sources, events, concepts] = await Promise.all([
    fetchJson('/data/sources.json', 'sources'),
    fetchJson('/data/events.json', 'events'),
    fetchJson('/data/concepts.json', 'concepts'),
  ]);
  state.sources = Array.isArray(sources) ? sources : [];
  state.events = Array.isArray(events) ? events : [];
  state.concepts = Array.isArray(concepts) ? concepts : [];
  if (state.sources[0]) state.selected.add(state.sources[0].id);
  render();
}
init().catch((error) => {
  el.innerHTML = `<section class="panel"><h1>Historical Source Lab</h1><p>Unable to load source data: ${error.message}</p></section>`;
});
