let state = {
  pairs: [],
  eventsById: new Map(),
  currentPair: null,
};

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  return response.json();
}

async function loadData() {
  const [pairs, events] = await Promise.all([
    fetchJson('/derived/index.causal_pairs.json'),
    fetchJson('/derived/events.normalized.json'),
  ]);
  const eventsById = new Map(events.map((event) => [event.id, event]));
  return { pairs, eventsById };
}

function pickPair(pairs) {
  return pairs[Math.floor(Math.random() * pairs.length)];
}

function getEventLabel(eventId) {
  return state.eventsById.get(eventId)?.label || eventId;
}

function showPrompt(pair) {
  const causeLabel = getEventLabel(pair.cause_id);
  const effectLabel = getEventLabel(pair.effect_id);
  document.getElementById('prompt').innerText = `Explain why "${causeLabel}" led to "${effectLabel}".`;
  document.getElementById('reference').innerText = '';
  document.getElementById('feedback').innerText = '';
  document.getElementById('answer').value = '';
}

function getReference(pair) {
  const cause = state.eventsById.get(pair.cause_id);
  const effect = state.eventsById.get(pair.effect_id);
  const causeSummary = cause?.summary_short || cause?.label || pair.cause_id;
  const effectSummary = effect?.summary_short || effect?.label || pair.effect_id;
  return `Reference: ${causeSummary} This helped produce ${effectSummary}`;
}

function submitAnswer() {
  const text = document.getElementById('answer').value.trim();
  if (!state.currentPair) {
    return;
  }
  if (!text) {
    document.getElementById('feedback').innerText = 'Please write an explanation before submitting.';
    return;
  }

  document.getElementById('reference').innerText = getReference(state.currentPair);
  document.getElementById('feedback').innerText = 'Self-assess: mark your answer as Correct / Partial / Incorrect.';

  const key = 'whl_causal_explanation_progress_v1';
  const raw = localStorage.getItem(key);
  const progress = raw ? JSON.parse(raw) : { attempts: 0 };
  progress.attempts += 1;
  localStorage.setItem(key, JSON.stringify(progress));
}

function showNextPair() {
  state.currentPair = pickPair(state.pairs);
  showPrompt(state.currentPair);
}

(async function init() {
  try {
    const { pairs, eventsById } = await loadData();
    state.pairs = pairs;
    state.eventsById = eventsById;

    if (!pairs.length) {
      document.getElementById('prompt').innerText = 'No causal pairs available yet. Run derive and try again.';
      return;
    }

    document.getElementById('submit-btn').addEventListener('click', submitAnswer);
    document.getElementById('next-btn').addEventListener('click', showNextPair);
    showNextPair();
  } catch (error) {
    console.error('[causal-explanation] load failed', error);
    document.getElementById('prompt').innerText = 'Could not load causal explanation data.';
  }
})();
