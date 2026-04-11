import {
  getAllEvents,
  getEventsForUnit,
  getNextUnit,
  getTagClusters,
  getUnits,
  getStoredUnitId,
  setStoredUnitId,
} from '../shared/data-store.js';
import { recordResult } from '../shared/mastery-store.js';
import { showFeedback } from '../shared/feedback.js';
import { mountHeader } from '../shared/header.js';

const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const feedbackEl = document.getElementById('feedback');
const explanationEl = document.getElementById('explanation');
const nextButton = document.getElementById('next');
const unitSelect = document.getElementById('unit-select');
const unitHint = document.getElementById('unit-hint');
const nextUnitHint = document.getElementById('next-unit-hint');

let allEvents = [];
let eventsById = new Map();
let units = [];
let currentEvents = [];
let allClusters = [];
let currentQuestion = null;
let roundCount = 0;

const appHeader = mountHeader({
  container: document.querySelector('main') || document.body,
  mode: 'Event Comparison',
  progress: 'Round 0',
});

function refreshHeader() {
  appHeader.update({
    unit: unitSelect.selectedOptions[0]?.textContent || 'All units',
    progress: `Round ${roundCount}`,
  });
}

function isValidEvent(event) {
  return Boolean(
    event
    && typeof event.id === 'string'
    && typeof event.label === 'string'
    && Number.isFinite(event?.time?.year_start)
  );
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const items = list.slice();
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function pickEventsFromCluster(cluster) {
  const scopedIds = new Set(currentEvents.map((event) => event.id));
  const selected = cluster
    .filter((id) => scopedIds.has(id))
    .map((id) => eventsById.get(id))
    .filter(Boolean)
    .slice(0, 3);

  return selected.length >= 2 ? selected : [];
}

function buildChronologyQuestion(selected) {
  const sorted = selected
    .slice()
    .sort((a, b) => a.time.year_start - b.time.year_start || a.id.localeCompare(b.id));
  const correct = sorted[0];
  return {
    type: 'chronology',
    prompt: 'Which event came first?',
    options: selected,
    correctId: correct.id,
    explanation: `${correct.label} came first (${correct.time.year_start}). ${correct.summary_short || 'No summary available.'}`,
  };
}

function buildImpactQuestion(selected) {
  const scored = selected
    .map((event) => ({ event, score: Number.isFinite(event.importance) ? event.importance : 0 }))
    .sort((a, b) => b.score - a.score || a.event.id.localeCompare(b.event.id));
  const correct = scored[0].event;
  return {
    type: 'impact',
    prompt: 'Which event had greater impact in this set?',
    options: selected,
    correctId: correct.id,
    explanation: `${correct.label} is marked as highest impact in this cluster. ${correct.summary_short || 'No summary available.'}`,
  };
}

function buildSimilarityQuestion(selected) {
  const anchor = selected[0];
  const [correct, ...rest] = selected.slice(1);
  const options = shuffle([correct, ...rest]);
  return {
    type: 'similarity',
    prompt: `Which event is most similar to ${anchor.label}?`,
    options,
    correctId: correct.id,
    explanation: `${correct.label} shares the same thematic tag cluster as ${anchor.label}. ${correct.summary_short || 'No summary available.'}`,
    anchor,
  };
}

function buildQuestion(selected) {
  const builders = [buildChronologyQuestion, buildImpactQuestion, buildSimilarityQuestion];
  return randomItem(builders)(selected);
}

function renderQuestion() {
  roundCount += 1;
  feedbackEl.textContent = '';
  explanationEl.textContent = '';
  optionsEl.innerHTML = '';

  const viableClusters = allClusters.filter((cluster) => pickEventsFromCluster(cluster).length >= 2);
  if (viableClusters.length === 0) {
    questionEl.textContent = 'No comparison clusters are available for this unit yet.';
    nextButton.disabled = true;
    refreshHeader();
    return;
  }

  const cluster = randomItem(viableClusters);
  const selected = pickEventsFromCluster(cluster);
  currentQuestion = buildQuestion(selected);

  questionEl.textContent = currentQuestion.prompt;
  currentQuestion.options.forEach((event) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${event.label} (${event.time.year_start})`;
    button.addEventListener('click', () => checkAnswer(event.id));
    optionsEl.append(button);
  });

  nextButton.disabled = false;
  refreshHeader();
}

function checkAnswer(selectedId) {
  if (!currentQuestion) return;

  const selected = eventsById.get(selectedId);
  const correct = eventsById.get(currentQuestion.correctId);
  const isCorrect = selectedId === currentQuestion.correctId;

  showFeedback(feedbackEl, {
    correct: isCorrect,
    event: selected || correct,
    correctAnswer: { label: correct?.label || 'Unknown event' },
    summary: isCorrect ? 'Correct comparison.' : `Incorrect. ${correct?.label || 'Unknown event'} is correct.`,
  });
  explanationEl.textContent = currentQuestion.explanation;

  currentQuestion.options.forEach((event) => {
    recordResult(event.id, isCorrect && event.id === currentQuestion.correctId, {
      mode: `event_comparison_${currentQuestion.type}`,
      question_type: currentQuestion.type,
    });
  });
}

function populateUnitOptions() {
  unitSelect.innerHTML = '';

  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All units';
  unitSelect.append(allOption);

  units.forEach((unit) => {
    const option = document.createElement('option');
    option.value = unit.id;
    option.textContent = unit.era ? `${unit.label} (${unit.era})` : unit.label;
    unitSelect.append(option);
  });

  const saved = getStoredUnitId();
  const known = units.some((unit) => unit.id === saved);
  unitSelect.value = known ? saved : '';
}

function updateProgressionHint() {
  const selectedUnitId = unitSelect.value;
  const next = getNextUnit(units, selectedUnitId);

  if (!selectedUnitId) {
    unitHint.textContent = 'Using all units.';
    nextUnitHint.textContent = units[0] ? `Suggested start: ${units[0].label}.` : '';
    return;
  }

  const selected = units.find((unit) => unit.id === selectedUnitId);
  unitHint.textContent = `Focused on ${selected?.label || selectedUnitId}.`;
  nextUnitHint.textContent = next ? `Next unit: ${next.label}.` : 'You are on the last unit in the current sequence.';
}

async function applyUnitSelection() {
  const selectedUnitId = unitSelect.value;
  currentEvents = selectedUnitId ? await getEventsForUnit(selectedUnitId) : allEvents.slice();
  currentEvents = currentEvents.filter(isValidEvent);
  updateProgressionHint();
  renderQuestion();
}

async function init() {
  try {
    const [events, loadedUnits, clusters] = await Promise.all([
      getAllEvents(),
      getUnits(),
      getTagClusters(),
    ]);

    allEvents = (Array.isArray(events) ? events : []).filter(isValidEvent);
    eventsById = new Map(allEvents.map((event) => [event.id, event]));
    units = Array.isArray(loadedUnits) ? loadedUnits : [];
    allClusters = Array.isArray(clusters) ? clusters : [];

    populateUnitOptions();
    setStoredUnitId(unitSelect.value);
    await applyUnitSelection();
  } catch (error) {
    console.error('[event-comparison] Failed to initialize', error);
    questionEl.textContent = 'No data available.';
    feedbackEl.textContent = 'Loading failed. Please reload the page.';
    nextButton.disabled = true;
  }
}

unitSelect.addEventListener('change', async () => {
  setStoredUnitId(unitSelect.value);
  await applyUnitSelection();
});

nextButton.addEventListener('click', renderQuestion);

init();
refreshHeader();
