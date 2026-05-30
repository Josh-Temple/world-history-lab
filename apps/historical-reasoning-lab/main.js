import { fetchJson } from '/apps/shared/data-access.js';
import { loadReviewStore, saveReviewStore, updateReviewItem } from '/apps/shared/review-store.js';
import { getConfidenceLabel, getEvidenceBadge } from '/apps/shared/evidence-utils.js';

const APP_KEY = 'whl_reasoning_lab_v1';
const promptPanel = document.getElementById('prompt-panel');
const evidencePanel = document.getElementById('evidence-panel');
const reflectionPanel = document.getElementById('reflection-panel');

const state = { events: [], concepts: [], current: null, selectedEvidence: new Set(), local: loadLocal(), review: loadReviewStore() };

function loadLocal() { try { return JSON.parse(localStorage.getItem(APP_KEY) || '{"history":[]}'); } catch { return { history: [] }; } }
function saveLocal() { localStorage.setItem(APP_KEY, JSON.stringify(state.local)); }
function pick(list) { return list[Math.floor(Math.random() * list.length)] || null; }
function getPrerequisites(eventId) { return state.events.find((e) => e.id === eventId)?.prerequisite_event_ids || []; }
function getConsequences(eventId) { return state.events.find((e) => e.id === eventId)?.consequence_event_ids || []; }

function generateReasoningPrompt(event) {
  return `Why did ${event.label} occur, and which historical conditions most strongly contributed to it?`;
}

function counterfactualPrompt(event) {
  const options = [
    `What might have changed if ${event.label} had happened 20 years earlier?`,
    `Would nearby regions likely have followed the same trajectory if ${event.label} failed?`,
    `What downstream consequences become less likely without ${event.label}?`,
  ];
  return pick(options);
}

function render() {
  const event = state.current;
  const prereq = getPrerequisites(event.id).map((id) => state.events.find((e) => e.id === id)).filter(Boolean);
  const related = (event.related_event_ids || []).map((id) => state.events.find((e) => e.id === id)).filter(Boolean).slice(0, 8);
  const conceptById = new Map(state.concepts.map((c) => [c.id, c]));
  const concepts = (event.concept_ids || []).map((id) => conceptById.get(id)).filter(Boolean);

  const evidence = getEvidenceBadge(event.evidence_strength);
  const weakEvidenceWarning = prereq.length + related.length < 2 ? '<p><strong>Weak-evidence diagnostic:</strong> This claim currently has sparse linked evidence. Compare with more sources before settling on one explanation.</p>' : '';
  promptPanel.innerHTML = `<h2>Prompt</h2><p>${generateReasoningPrompt(event)}</p><small>Counterfactual: ${counterfactualPrompt(event)}</small>`;

  const buttons = [...prereq, ...related].slice(0, 12).map((ev) => `<button class="evidence-item ${state.selectedEvidence.has(ev.id) ? 'selected' : ''}" data-id="${ev.id}">${ev.label}</button>`).join('');
  const conceptButtons = concepts.map((c) => `<button class="evidence-item ${state.selectedEvidence.has(c.id) ? 'selected' : ''}" data-id="${c.id}">${c.label}</button>`).join('');

  evidencePanel.innerHTML = `<h2>Evidence selection</h2><p>Pick relevant events and concepts before writing your explanation.</p><div class="evidence-list">${buttons}${conceptButtons}</div>`;

  reflectionPanel.innerHTML = `<h2>Reflection</h2><p><span class="evidence-badge ${evidence.level}">${evidence.label}</span> · ${getConfidenceLabel(event.confidence_level)}</p>${weakEvidenceWarning}<div class="grid"><section class="comparison-block"><h3>Stronger explanation</h3><p>Connects multiple causal factors, references evidence, and explains mechanisms (how/why).</p></section><section class="comparison-block"><h3>Weaker explanation</h3><p>Lists isolated facts, lacks evidence links, or assumes one single deterministic cause.</p></section></div><textarea id="reflection-text" placeholder="Write a 4–6 sentence explanation."></textarea><div style="margin-top:.5rem"><button id="save-reflection">Save reflection</button> <button id="next-prompt">Next prompt</button></div>`;

  evidencePanel.querySelectorAll('.evidence-item').forEach((btn) => btn.onclick = () => {
    const id = btn.dataset.id;
    if (state.selectedEvidence.has(id)) state.selectedEvidence.delete(id); else state.selectedEvidence.add(id);
    render();
  });

  document.getElementById('save-reflection').onclick = () => {
    const text = document.getElementById('reflection-text').value.trim();
    if (!text) return;
    state.local.history.unshift({ event_id: event.id, text, evidence: [...state.selectedEvidence], at: Date.now(), consequences: getConsequences(event.id) });
    state.local.history = state.local.history.slice(0, 40);
    saveLocal();
    state.review[event.id] = updateReviewItem(state.review[event.id], { correct: true, confidence: 'hard' });
    saveReviewStore(state.review);
  };
  document.getElementById('next-prompt').onclick = nextPrompt;
}

function nextPrompt() { state.selectedEvidence.clear(); state.current = pick(state.events.filter((e) => e.status === 'approved')); render(); }

async function init() {
  const [events, concepts] = await Promise.all([
    fetchJson('/data/events.json', 'events'),
    fetchJson('/data/concepts.json', 'concepts'),
  ]);
  state.events = Array.isArray(events) ? events : [];
  state.concepts = Array.isArray(concepts) ? concepts : [];
  nextPrompt();
}

init().catch((error) => {
  promptPanel.innerHTML = `<h2>Loading failed</h2><p>${error.message}</p>`;
  evidencePanel.innerHTML = '';
  reflectionPanel.innerHTML = '';
});
