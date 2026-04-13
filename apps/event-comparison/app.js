import {
  getAllEvents,
  getEventUnitMap,
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
let units = [];
let allClusters = [];
let unitByEventId = new Map();
let currentEvents = [];
let currentQuestion = null;
let roundCount = 0;

const appHeader = mountHeader({
  container: document.querySelector('main') || document.body,
  mode: 'Event Comparison',
  progress: 'Round 0',
});

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

function getSelectedUnitIds() {
  const raw = unitSelect.value || '';
  return raw ? raw.split(',').filter(Boolean) : [];
}

function formatUnitSelectionLabel(unitIds) {
  if (!unitIds.length) return 'All units';
  if (unitIds.length === 1) {
    const unit = units.find((entry) => entry.id === unitIds[0]);
    return unit?.label || unitIds[0];
  }
  return `${unitIds.length} units`;
}

function getUnitForEvent(eventId) {
  const unitId = unitByEventId.get(eventId);
  const unit = units.find((entry) => entry.id === unitId);
  return unit?.label || unitId || 'Unknown unit';
}

function refreshHeader() {
  const selectedUnitIds = getSelectedUnitIds();
  appHeader.update({
    unit: formatUnitSelectionLabel(selectedUnitIds),
    progress: `Round ${roundCount}`,
  });
}

function pickCrossUnitPair(events) {
  if (events.length < 2) return [];
  const first = randomItem(events);
  const firstTags = Array.isArray(first.tags) ? first.tags : [];

  const candidates = events.filter((event) => (
    event.id !== first.id
    && getUnitForEvent(event.id) !== getUnitForEvent(first.id)
    && firstTags.some((tag) => (event.tags || []).includes(tag))
  ));

  if (!candidates.length) return [];
  return [first, randomItem(candidates)];
}

function buildCrossUnitChronologyQuestion(events) {
  const pair = pickCrossUnitPair(events);
  if (pair.length < 2) return null;

  const [left, right] = pair;
  const options = shuffle([left, right]);
  const correct = left.time.year_start <= right.time.year_start ? left : right;
  return {
    type: 'cross_unit_earlier',
    prompt: 'Which came earlier across units?',
    options,
    correctId: correct.id,
    explanation: `${correct.label} (${getUnitForEvent(correct.id)}) happened in ${correct.time.year_start}.`,
  };
}

function buildCrossUnitOwnershipQuestion(events) {
  const pair = pickCrossUnitPair(events);
  if (pair.length < 2) return null;

  const target = randomItem(pair);
  const targetUnitLabel = getUnitForEvent(target.id);
  const otherUnitLabel = getUnitForEvent(pair.find((event) => event.id !== target.id).id);
  return {
    type: 'cross_unit_membership',
    prompt: `Which war did this event belong to: ${target.label}?`,
    options: shuffle([
      { id: `${target.id}::correct`, label: targetUnitLabel, time: { year_start: target.time.year_start }, isLabelOption: true },
      { id: `${target.id}::distractor`, label: otherUnitLabel, time: { year_start: target.time.year_start }, isLabelOption: true },
    ]),
    correctId: `${target.id}::correct`,
    explanation: `${target.label} belongs to ${targetUnitLabel}.`,
    targetEventId: target.id,
  };
}

function buildClusterQuestion(clusterEvents) {
  const sorted = clusterEvents
    .slice()
    .sort((a, b) => a.time.year_start - b.time.year_start || a.id.localeCompare(b.id));
  const correct = sorted[0];
  return {
    type: 'chronology',
    prompt: 'Which event came first?',
    options: clusterEvents,
    correctId: correct.id,
    explanation: `${correct.label} (${getUnitForEvent(correct.id)}) came first in ${correct.time.year_start}.`,
  };
}

function pickClusterEvents(events) {
  const scopeIds = new Set(events.map((event) => event.id));
  const candidates = allClusters
    .map((cluster) => cluster
      .filter((id) => scopeIds.has(id))
      .map((id) => events.find((event) => event.id === id))
      .filter(Boolean))
    .filter((cluster) => cluster.length >= 2);

  if (!candidates.length) return [];
  return randomItem(candidates).slice(0, 3);
}

function buildQuestion(events) {
  const crossUnit = getSelectedUnitIds().length >= 2;

  if (crossUnit) {
    const builders = [buildCrossUnitChronologyQuestion, buildCrossUnitOwnershipQuestion];
    const picked = randomItem(builders)(events);
    if (picked) return picked;
  }

  const cluster = pickClusterEvents(events);
  if (cluster.length >= 2) return buildClusterQuestion(cluster);

  return null;
}

function renderQuestion() {
  roundCount += 1;
  feedbackEl.textContent = '';
  explanationEl.textContent = '';
  optionsEl.innerHTML = '';

  if (currentEvents.length < 2) {
    questionEl.textContent = 'Not enough events in the selected units yet.';
    nextButton.disabled = true;
    refreshHeader();
    return;
  }

  currentQuestion = buildQuestion(currentEvents);
  if (!currentQuestion) {
    questionEl.textContent = 'No cross-unit comparison pair is available for this selection yet.';
    nextButton.disabled = true;
    refreshHeader();
    return;
  }

  questionEl.textContent = currentQuestion.prompt;
  currentQuestion.options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    const suffix = option.isLabelOption ? '' : ` (${option.time.year_start}) · ${getUnitForEvent(option.id)}`;
    button.textContent = `${option.label}${suffix}`;
    button.addEventListener('click', () => checkAnswer(option.id));
    optionsEl.append(button);
  });

  nextButton.disabled = false;
  refreshHeader();
}

function checkAnswer(selectedId) {
  if (!currentQuestion) return;

  const isCorrect = selectedId === currentQuestion.correctId;
  const correctOption = currentQuestion.options.find((option) => option.id === currentQuestion.correctId);

  showFeedback(feedbackEl, {
    correct: isCorrect,
    event: correctOption,
    correctAnswer: { label: correctOption?.label || 'Unknown' },
    summary: isCorrect
      ? 'Correct comparison.'
      : `Incorrect. ${correctOption?.label || 'Unknown'} is correct.`,
  });

  explanationEl.textContent = currentQuestion.explanation;

  if (currentQuestion.type === 'cross_unit_membership') {
    const targetId = currentQuestion.targetEventId;
    if (targetId) {
      recordResult(targetId, isCorrect, {
        mode: 'event_comparison_cross_unit_membership',
        question_type: 'cross_unit_membership',
      });
    }
    return;
  }

  currentQuestion.options.forEach((event) => {
    if (event.isLabelOption) return;
    const correctForEvent = isCorrect && event.id === currentQuestion.correctId;
    recordResult(event.id, correctForEvent, {
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

function updateProgressionHint(selectedUnitIds) {
  if (!selectedUnitIds.length) {
    unitHint.textContent = 'Using all units (cross-unit pairing enabled).';
    nextUnitHint.textContent = 'Tip: Shift-select two units for focused cross-war comparison.';
    return;
  }

  if (selectedUnitIds.length === 1) {
    const selected = units.find((unit) => unit.id === selectedUnitIds[0]);
    unitHint.textContent = `Focused on ${selected?.label || selectedUnitIds[0]}.`;
    nextUnitHint.textContent = 'Select multiple units to unlock cross-unit questions.';
    return;
  }

  unitHint.textContent = `Cross-unit mode across ${selectedUnitIds.length} units.`;
  nextUnitHint.textContent = 'Question mix now includes unit-identification and cross-unit chronology.';
}

async function applyUnitSelection() {
  const selectedUnitIds = getSelectedUnitIds();

  if (!selectedUnitIds.length) {
    currentEvents = allEvents.slice();
  } else {
    const allowed = new Set(selectedUnitIds);
    currentEvents = allEvents.filter((event) => allowed.has(unitByEventId.get(event.id)));
  }

  currentEvents = currentEvents.filter(isValidEvent);
  updateProgressionHint(selectedUnitIds);
  renderQuestion();
}

async function init() {
  try {
    const [events, loadedUnits, clusters, eventMap] = await Promise.all([
      getAllEvents(),
      getUnits(),
      getTagClusters(),
      getEventUnitMap(),
    ]);

    allEvents = (Array.isArray(events) ? events : []).filter(isValidEvent);
    units = Array.isArray(loadedUnits) ? loadedUnits : [];
    allClusters = Array.isArray(clusters) ? clusters : [];
    unitByEventId = eventMap instanceof Map ? eventMap : new Map();

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
  const selected = Array.from(unitSelect.selectedOptions)
    .map((option) => option.value)
    .filter(Boolean);
  const persisted = selected.length === 1 ? selected[0] : '';
  setStoredUnitId(persisted);
  await applyUnitSelection();
});

nextButton.addEventListener('click', renderQuestion);

init();
refreshHeader();
