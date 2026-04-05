import { getAllEvents, getEventsForUnit, getNextUnit, getUnits } from '../shared/data-store.js';
import { recordResult } from '../shared/mastery-store.js';
import { showFeedback } from '../shared/feedback.js';

const eventA = document.getElementById('event-a');
const eventB = document.getElementById('event-b');
const choices = document.getElementById('choices');
const feedback = document.getElementById('feedback');
const explanation = document.getElementById('explanation');
const nextButton = document.getElementById('next');
const unitSelect = document.getElementById('unit-select');
const unitHint = document.getElementById('unit-hint');
const nextUnitHint = document.getElementById('next-unit-hint');

const DOMAIN_TAGS = ['political', 'technological', 'economic', 'social'];
const SELECTED_UNIT_KEY = 'selected_unit';

let allEvents = [];
let units = [];
let events = [];
let currentPair = null;
let correctTag = null;

function isValidEvent(event) {
  return Boolean(
    event
    && typeof event.id === 'string'
    && typeof event.label === 'string'
    && Number.isFinite(event?.time?.year_start)
  );
}

function safeLabel(event) {
  return typeof event?.label === 'string' && event.label.trim().length > 0
    ? event.label
    : 'Unknown event';
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getSharedTags(a, b) {
  const aTags = Array.isArray(a.tags) ? a.tags : [];
  const bTags = new Set(Array.isArray(b.tags) ? b.tags : []);
  return aTags.filter((tag) => bTags.has(tag));
}

function getPair() {
  if (events.length < 2) return null;

  // Prefer pairs with an overlapping domain tag so similarity is meaningful.
  for (let i = 0; i < 40; i += 1) {
    const a = randomItem(events);
    let b = randomItem(events);
    while (b.id === a.id) {
      b = randomItem(events);
    }

    const shared = getSharedTags(a, b);
    const domainShared = shared.find((tag) => DOMAIN_TAGS.includes(tag));
    if (domainShared) {
      return { a, b, shared, correct: domainShared };
    }
  }

  const a = randomItem(events);
  let b = randomItem(events);
  while (b.id === a.id) {
    b = randomItem(events);
  }
  const shared = getSharedTags(a, b);
  const correct = shared[0] || 'historical_change';
  return { a, b, shared, correct };
}

function generateChoices(correct) {
  const distractors = DOMAIN_TAGS.filter((tag) => tag !== correct);
  const optionPool = correct && DOMAIN_TAGS.includes(correct)
    ? [correct, ...distractors]
    : [correct, ...DOMAIN_TAGS];

  return shuffle(Array.from(new Set(optionPool))).slice(0, 4);
}

function renderRound() {
  currentPair = getPair();

  if (!currentPair) {
    eventA.textContent = 'Not enough events to compare yet.';
    eventB.textContent = 'Select another unit or use All units to continue.';
    choices.innerHTML = '';
    feedback.textContent = '';
    explanation.textContent = '';
    nextButton.disabled = true;
    return;
  }

  const { a, b } = currentPair;
  correctTag = currentPair.correct;

  eventA.textContent = safeLabel(a);
  eventB.textContent = safeLabel(b);
  feedback.textContent = '';
  explanation.textContent = '';
  choices.innerHTML = '';
  nextButton.disabled = false;

  const options = generateChoices(correctTag);
  for (const option of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option;
    button.addEventListener('click', () => evaluate(option));
    choices.append(button);
  }
}

function evaluate(selected) {
  if (!currentPair) return;

  const isCorrect = selected === correctTag;
  showFeedback(feedback, {
    correct: isCorrect,
    event: currentPair.a,
    correctAnswer: { label: correctTag },
    summary: `Similarity tag: ${correctTag}.`,
    extra: [`Event A: ${safeLabel(currentPair.a)}`, `Event B: ${safeLabel(currentPair.b)}`],
  });

  const summaryA = currentPair.a.summary_short || 'No summary available.';
  const summaryB = currentPair.b.summary_short || 'No summary available.';
  explanation.textContent = `Similarity tag: ${correctTag}. Event A: ${summaryA} Event B: ${summaryB}`;

  recordResult(currentPair.a.id, isCorrect, { mode: 'event_comparison', tag: correctTag });
  recordResult(currentPair.b.id, isCorrect, { mode: 'event_comparison', tag: correctTag });
}

function populateUnitOptions() {
  unitSelect.innerHTML = '';

  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All units';
  unitSelect.append(allOption);

  for (const unit of units) {
    const option = document.createElement('option');
    option.value = unit.id;
    option.textContent = unit.era ? `${unit.label} (${unit.era})` : unit.label;
    unitSelect.append(option);
  }

  const saved = localStorage.getItem(SELECTED_UNIT_KEY) || '';
  const known = units.some((unit) => unit.id === saved);
  unitSelect.value = known ? saved : (units[0]?.id || '');
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

  if (!selectedUnitId) {
    events = allEvents.slice();
  } else {
    const scopedEvents = await getEventsForUnit(selectedUnitId);
    events = (Array.isArray(scopedEvents) ? scopedEvents : []).filter(isValidEvent);
  }

  updateProgressionHint();
  renderRound();
}

async function init() {
  try {
    const [loadedEvents, loadedUnits] = await Promise.all([getAllEvents(), getUnits()]);
    allEvents = (Array.isArray(loadedEvents) ? loadedEvents : []).filter(isValidEvent);
    units = Array.isArray(loadedUnits) ? loadedUnits : [];

    populateUnitOptions();
    localStorage.setItem(SELECTED_UNIT_KEY, unitSelect.value);
    await applyUnitSelection();
  } catch (error) {
    console.error('[event-comparison] Failed to load events', error);
    eventA.textContent = 'No data available.';
    eventB.textContent = 'An error occurred. Please reload.';
    feedback.textContent = 'Loading failed.';
    nextButton.disabled = true;
  }
}

unitSelect.addEventListener('change', async () => {
  localStorage.setItem(SELECTED_UNIT_KEY, unitSelect.value);
  await applyUnitSelection();
});

nextButton.addEventListener('click', renderRound);

init();
