import { recordResult } from '../shared/mastery-store.js';

const eventLabel = document.getElementById('event-label');
const eventSummary = document.getElementById('event-summary');
const unitSelect = document.getElementById('unit-select');
const setupHint = document.getElementById('setup-hint');
const yearInput = document.getElementById('year-input');
const submitButton = document.getElementById('submit');
const nextButton = document.getElementById('next');
const feedback = document.getElementById('feedback');
const SELECTED_UNIT_KEY = 'selected_unit';

let allEvents = [];
let units = [];
let usableEvents = [];
let currentEvent = null;

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function scoreFromError(error) {
  if (error <= 5) return 1.0;
  if (error <= 20) return 0.5;
  return 0;
}

function feedbackPrefix(error) {
  if (error <= 5) return 'Excellent (within 5 years).';
  if (error <= 20) return 'Close (within 20 years).';
  return 'Far off.';
}

function generateQuestion() {
  if (usableEvents.length === 0) return null;

  if (usableEvents.length === 1) {
    return usableEvents[0];
  }

  let next = randomItem(usableEvents);
  if (currentEvent && next.id === currentEvent.id) {
    const alternatives = usableEvents.filter((event) => event.id !== currentEvent.id);
    next = randomItem(alternatives);
  }

  return next;
}

function applyUnitFilter() {
  const selectedUnitId = unitSelect.value;
  if (!selectedUnitId) {
    usableEvents = allEvents.slice();
    setupHint.textContent = 'Using all units.';
    return;
  }

  const selectedUnit = units.find((unit) => unit.id === selectedUnitId);
  const eventIdSet = new Set(Array.isArray(selectedUnit?.event_ids) ? selectedUnit.event_ids : []);
  usableEvents = allEvents.filter((event) => eventIdSet.has(event.id));
  setupHint.textContent = `Focused on ${selectedUnit?.title || selectedUnitId}.`;
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
    option.textContent = unit.title || unit.id;
    unitSelect.append(option);
  }

  const savedUnit = localStorage.getItem(SELECTED_UNIT_KEY) || '';
  const isKnown = units.some((unit) => unit.id === savedUnit);
  unitSelect.value = isKnown ? savedUnit : '';
}

function renderQuestion(event) {
  currentEvent = event;
  eventLabel.textContent = event?.label || 'Unknown event';
  eventSummary.textContent = event?.summary_short || 'No summary available.';
  yearInput.value = '';
  feedback.textContent = '';
  yearInput.focus();
}

function submitGuess() {
  if (!currentEvent) return;

  const guess = Number.parseInt(yearInput.value, 10);
  if (!Number.isFinite(guess)) {
    feedback.textContent = 'Enter a valid numeric year before submitting.';
    return;
  }

  const correctYear = currentEvent.time.year_start;
  const error = Math.abs(guess - correctYear);
  const score = scoreFromError(error);
  const isCorrect = score >= 0.5;

  feedback.textContent = `${feedbackPrefix(error)} Correct year: ${correctYear}. You were off by ${error} year${error === 1 ? '' : 's'}.`;
  recordResult(currentEvent.id, isCorrect, { error, score, mode: 'year_estimation' });
}

async function init() {
  try {
    const [events, unitsIndex] = await Promise.all([
      fetch('/data/events.json', { cache: 'no-store' }).then((response) => {
        if (!response.ok) {
          throw new Error(`events: HTTP ${response.status}`);
        }
        return response.json();
      }),
      fetch('/data/units/index.json', { cache: 'no-store' }).then((response) => {
        if (!response.ok) {
          throw new Error(`units: HTTP ${response.status}`);
        }
        return response.json();
      }),
    ]);

    allEvents = (Array.isArray(events) ? events : []).filter((event) => (
      event && Number.isFinite(event?.time?.year_start)
    ));
    units = Array.isArray(unitsIndex?.units) ? unitsIndex.units : (Array.isArray(unitsIndex) ? unitsIndex : []);
    populateUnitOptions();
    applyUnitFilter();

    if (usableEvents.length === 0) {
      eventLabel.textContent = 'No events with years available.';
      eventSummary.textContent = 'Add records with time.year_start to enable this mode.';
      submitButton.disabled = true;
      nextButton.disabled = true;
      return;
    }

    renderQuestion(generateQuestion());
  } catch (error) {
    console.error('[year-estimation] Could not load events.', error);
    eventLabel.textContent = 'Could not load events.';
    eventSummary.textContent = 'Please reload and try again.';
    submitButton.disabled = true;
    nextButton.disabled = true;
  }
}

submitButton.addEventListener('click', submitGuess);
nextButton.addEventListener('click', () => renderQuestion(generateQuestion()));
yearInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    submitGuess();
  }
});
unitSelect.addEventListener('change', () => {
  localStorage.setItem(SELECTED_UNIT_KEY, unitSelect.value);
  applyUnitFilter();
  if (usableEvents.length === 0) {
    eventLabel.textContent = 'No events in this unit with numeric years.';
    eventSummary.textContent = 'Choose a different unit or switch to All units.';
    submitButton.disabled = true;
    nextButton.disabled = true;
    feedback.textContent = '';
    return;
  }
  submitButton.disabled = false;
  nextButton.disabled = false;
  renderQuestion(generateQuestion());
});

init();
