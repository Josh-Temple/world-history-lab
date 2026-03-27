import { filterDerivedEvents, loadDerivedEvents, loadUnitsIndex } from "../shared/data-access.js";
import { isCausalityReady } from "../shared/event-filters.js";
import { recordResult } from "../shared/mastery-store.js";

const sourceYearEl = document.getElementById('source-year');
const sourceLabelEl = document.getElementById('source-label');
const sourceSummaryEl = document.getElementById('source-summary');
const choicesEl = document.getElementById('choices');
const feedbackEl = document.getElementById('feedback');
const explanationEl = document.getElementById('explanation');
const nextButton = document.getElementById('next-button');
const statusLineEl = document.getElementById('status-line');
const questionCountEl = document.getElementById('question-count');
const nextStepEl = document.getElementById('next-step');
const nextStepTextEl = document.getElementById('next-step-text');
const nextStepLinkEl = document.getElementById('next-step-link');
const unitSelectEl = document.getElementById('unit-select');
const setupHintEl = document.getElementById('setup-hint');
const SELECTED_UNIT_KEY = 'selected_unit';

const PRACTICE_LOOP_THRESHOLD = 5;

const state = {
  events: [],
  units: [],
  eventMap: new Map(),
  pool: [],
  currentQuestion: null,
  answered: 0,
};

function isValidEvent(event) {
  return Boolean(
    event
    && typeof event.id === "string"
    && typeof event.label === "string"
    && Number.isFinite(event?.time?.year_start)
    && typeof event.summary_short === "string"
    && event.summary_short.trim().length > 0
  );
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function getEffectIds(event) {
  return (Array.isArray(event.effects) ? event.effects : [])
    .map((effect) => {
      if (typeof effect === 'string') return effect;
      if (effect && typeof effect === 'object' && typeof effect.event_id === 'string') return effect.event_id;
      return null;
    })
    .filter(Boolean);
}

function shareAUnit(leftId, rightId) {
  const left = state.eventMap.get(leftId);
  const right = state.eventMap.get(rightId);
  const leftUnits = new Set(left?.unit_ids || []);
  for (const unitId of right?.unit_ids || []) {
    if (leftUnits.has(unitId)) {
      return true;
    }
  }
  return false;
}

function getDistractors(source, correct, pool) {
  const sameUnit = pool.filter((event) => event.id !== source.id && event.id !== correct.id && shareAUnit(source.id, event.id));
  const fallback = pool.filter((event) => event.id !== source.id && event.id !== correct.id && !sameUnit.some((candidate) => candidate.id === event.id));
  return [...shuffle(sameUnit), ...shuffle(fallback)].slice(0, 2);
}

function generateQuestion(pool) {
  const playableSources = shuffle(pool).filter((source) => getEffectIds(source).some((effectId) => state.eventMap.has(effectId)));

  for (const source of playableSources) {
    const correctId = getEffectIds(source).find((effectId) => state.eventMap.has(effectId));
    const correct = state.eventMap.get(correctId);
    if (!correct) continue;

    const distractors = getDistractors(source, correct, pool);
    if (distractors.length < 2) continue;

    return {
      source,
      correct,
      options: shuffle([correct, ...distractors]),
    };
  }

  return null;
}

function getScopedPool() {
  const selectedUnitId = unitSelectEl.value || null;
  const unresolvedEffects = [];
  const scoped = filterDerivedEvents(state.events, {
    status: "reviewed",
    unitId: selectedUnitId,
    predicate: (event) => {
      if (!isCausalityReady(event)) return false;
      const resolvableEffects = getEffectIds(event).filter((effectId) => state.eventMap.has(effectId));
      if (resolvableEffects.length === 0) {
        unresolvedEffects.push(event.id);
        return false;
      }
      return true;
    },
  });

  if (unresolvedEffects.length > 0) {
    console.warn('[Causality Builder] skipped events with unresolved effects', unresolvedEffects);
  }

  return scoped;
}

function populateUnitOptions() {
  unitSelectEl.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All units';
  unitSelectEl.append(allOption);

  for (const unit of state.units) {
    const option = document.createElement('option');
    option.value = unit.id;
    option.textContent = unit.title || unit.id;
    unitSelectEl.append(option);
  }

  const savedUnitId = localStorage.getItem(SELECTED_UNIT_KEY) || '';
  const isKnownUnit = state.units.some((unit) => unit.id === savedUnitId);
  unitSelectEl.value = isKnownUnit ? savedUnitId : '';
}

function refreshPool() {
  state.pool = getScopedPool();
  const selectedUnitId = unitSelectEl.value;
  localStorage.setItem(SELECTED_UNIT_KEY, selectedUnitId);
  setupHintEl.textContent = selectedUnitId
    ? `Focused on ${unitSelectEl.selectedOptions[0]?.textContent || selectedUnitId}.`
    : 'Using all units.';
  questionCountEl.textContent = `Question ${state.answered + 1}`;
  renderQuestion();
}

function setFeedback(message, kind = '') {
  feedbackEl.textContent = message;
  feedbackEl.className = `feedback ${kind}`.trim();
}

function updateNextStep() {
  if (state.answered < PRACTICE_LOOP_THRESHOLD) {
    nextStepEl.hidden = true;
    return;
  }

  nextStepTextEl.textContent = 'Review the full narrative sequence next in History Player.';
  nextStepLinkEl.href = '../history-player/';
  nextStepEl.hidden = false;
}

function renderQuestion() {
  const question = generateQuestion(state.pool);
  state.currentQuestion = question;
  nextButton.disabled = true;
  choicesEl.innerHTML = '';
  explanationEl.textContent = '';

  if (!question) {
    sourceYearEl.textContent = '—';
    sourceLabelEl.textContent = 'No playable causality question found.';
    sourceSummaryEl.textContent = 'The current dataset has causal links, but this slice could not form a full 3-choice question.';
    setFeedback('Unable to generate a question.', 'incorrect');
    statusLineEl.textContent = 'Try refreshing after adding more linked effects.';
    updateNextStep();
    return;
  }

  sourceYearEl.textContent = String(question.source.time.year_start);
  sourceLabelEl.textContent = question.source.label;
  sourceSummaryEl.textContent = question.source.summary_short || 'No short summary available for this event yet.';
  setFeedback('Choose the event that most directly follows from the source event.');
  statusLineEl.textContent = `${state.pool.length} causality-ready source events available.`;
  questionCountEl.textContent = `Question ${state.answered + 1}`;
  updateNextStep();

  for (const option of question.options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    button.textContent = option.label;
    button.addEventListener('click', () => handleAnswer(button, option));
    choicesEl.appendChild(button);
  }
}

function handleAnswer(selectedButton, option) {
  if (!state.currentQuestion || nextButton.disabled === false) return;

  const { source, correct } = state.currentQuestion;
  const buttons = [...choicesEl.querySelectorAll('.choice')];
  for (const button of buttons) button.disabled = true;

  const isCorrect = option.id === correct.id;
  if (isCorrect) {
    selectedButton.classList.add('correct');
    setFeedback('Correct.', 'correct');
  } else {
    selectedButton.classList.add('incorrect');
    const correctIndex = state.currentQuestion.options.findIndex((candidate) => candidate.id === correct.id);
    if (buttons[correctIndex]) buttons[correctIndex].classList.add('correct');
    setFeedback('Incorrect.', 'incorrect');
  }

  recordResult(source.id, isCorrect);
  explanationEl.textContent = `${source.label} (${source.time.year_start}) led toward ${correct.label} (${correct.time.year_start}).`;
  nextButton.disabled = false;
  state.answered += 1;
  updateNextStep();
}

async function init() {
  try {
    const [events, units] = await Promise.all([loadDerivedEvents(), loadUnitsIndex()]);
    const safeEvents = (Array.isArray(events) ? events : []).filter(isValidEvent);
    state.events = safeEvents;
    state.units = units;
    state.eventMap = new Map(safeEvents.map((event) => [event.id, event]));
    if (safeEvents.length === 0) {
      sourceLabelEl.textContent = "No valid events available.";
      sourceSummaryEl.textContent = "Please regenerate data or add complete records.";
      setFeedback("No valid events available.", "incorrect");
      statusLineEl.textContent = "Causality practice is unavailable until valid events are present.";
      nextButton.disabled = true;
      return;
    }
    populateUnitOptions();
    refreshPool();
  } catch (error) {
    sourceLabelEl.textContent = 'Could not load causality data.';
    sourceSummaryEl.textContent = error.message;
    setFeedback('Loading failed.', 'incorrect');
    statusLineEl.textContent = 'Check the console for more details.';
  }
}

nextButton.addEventListener('click', renderQuestion);
unitSelectEl.addEventListener('change', () => {
  state.answered = 0;
  refreshPool();
});

init();
