import { loadTimelineSeedData } from "./data/loaders.js";
import { recordResult } from "../../shared/mastery-store.js";
import { filterEvents as filterSharedEvents } from "../../shared/event-filters.js";
import { mountHeader } from "../../shared/header.js";
import {
  createPairKey,
  explainQuestionAnswer,
  filterEligibleEvents,
  generateBeforeAfterQuestion,
  generateEarliestOfThreeQuestion,
  generateLatestOfThreeQuestion,
  resolveUnitEvents,
} from "./logic/question-generator.js";

const QUESTION_TYPES = {
  BEFORE_AFTER: "timeline_before_after",
  EARLIEST_OF_3: "timeline_earliest_of_3",
  LATEST_OF_3: "timeline_latest_of_3",
};

const QUESTION_TYPE_ALIASES = {
  [QUESTION_TYPES.EARLIEST_OF_3]: [QUESTION_TYPES.EARLIEST_OF_3, "timeline_ordering"],
  [QUESTION_TYPES.LATEST_OF_3]: [QUESTION_TYPES.LATEST_OF_3, "timeline_ordering"],
};

const MODE = {
  BEFORE_AFTER: "before_after",
  EARLIEST_OF_3: "earliest_of_3",
  LATEST_OF_3: "latest_of_3",
  MIXED: "mixed",
};

const PRACTICE_MODE = {
  UNIT: "unit",
  ALL: "all",
};

const RECENT_PAIR_WINDOW = 15;
const RECENT_TRIPLET_WINDOW = 12;
const REVIEW_PROBABILITY = 0.3;
const REVIEW_DELAY_MIN = 2;
const REVIEW_DELAY_MAX = 4;
const REVIEW_MAX_ATTEMPTS = 2;
const MIN_TRIPLET_YEAR_SPAN = 10;
const DIFFICULTY = {
  BEGINNER: "beginner",
  INTERMEDIATE: "intermediate",
  FULL: "full",
};
const DIFFICULTY_MULTIPLIER = {
  [DIFFICULTY.BEGINNER]: 1,
  [DIFFICULTY.INTERMEDIATE]: 1.2,
  [DIFFICULTY.FULL]: 1.5,
};
const BEGINNER_EVENT_LIMIT = 10;

const state = {
  eventsById: new Map(),
  units: [],
  unitById: new Map(),
  poolsByUnitId: new Map(),
  availableTypes: new Set(),
  scope: {
    mode: PRACTICE_MODE.UNIT,
    unitId: null,
    minStatus: "reviewed",
    difficulty: DIFFICULTY.BEGINNER,
    enabledQuestionTypes: [QUESTION_TYPES.BEFORE_AFTER, QUESTION_TYPES.EARLIEST_OF_3, QUESTION_TYPES.LATEST_OF_3],
  },
  currentQuestion: null,
  totalAnswered: 0,
  correctAnswered: 0,
  score: 0,
  reviewAnswered: 0,
  reviewCorrect: 0,
  answeredByType: {
    [QUESTION_TYPES.BEFORE_AFTER]: 0,
    [QUESTION_TYPES.EARLIEST_OF_3]: 0,
    [QUESTION_TYPES.LATEST_OF_3]: 0,
  },
  correctByType: {
    [QUESTION_TYPES.BEFORE_AFTER]: 0,
    [QUESTION_TYPES.EARLIEST_OF_3]: 0,
    [QUESTION_TYPES.LATEST_OF_3]: 0,
  },
  hasAnswered: false,
  selectedOptionIndex: null,
  correctOptionIndex: null,
  recentPairKeys: [],
  recentTripletKeys: [],
  wrongQueue: new Map(),
  questionIndex: 0,
};

const ui = {
  unitTitle: document.getElementById("unit-title"),
  modeSelect: document.getElementById("mode-select"),
  practiceModeSelect: document.getElementById("practice-mode-select"),
  unitSelectWrap: document.getElementById("unit-select-wrap"),
  unitSelect: document.getElementById("unit-select"),
  qualitySelect: document.getElementById("quality-select"),
  difficultySelect: document.getElementById("difficulty-select"),
  difficultyLabel: document.getElementById("difficulty-label"),
  availabilityHint: document.getElementById("availability-hint"),
  modeHelp: document.getElementById("mode-help"),
  questionTitle: document.getElementById("question-title"),
  questionText: document.getElementById("question-text"),
  questionBadge: document.getElementById("question-badge"),
  optionA: document.getElementById("option-a"),
  optionB: document.getElementById("option-b"),
  optionC: document.getElementById("option-c"),
  resultText: document.getElementById("result-text"),
  nextStep: document.getElementById("next-step"),
  nextStepText: document.getElementById("next-step-text"),
  nextStepLink: document.getElementById("next-step-link"),
  nextButton: document.getElementById("next-button"),
  statTotal: document.getElementById("stat-total"),
  statCorrect: document.getElementById("stat-correct"),
  statAccuracy: document.getElementById("stat-accuracy"),
  statReviewAnswered: document.getElementById("stat-review-answered"),
  statReviewCorrect: document.getElementById("stat-review-correct"),
  statBeforeAfterAnswered: document.getElementById("stat-before-after-answered"),
  statBeforeAfterCorrect: document.getElementById("stat-before-after-correct"),
  statEarliestAnswered: document.getElementById("stat-earliest-answered"),
  statEarliestCorrect: document.getElementById("stat-earliest-correct"),
  statLatestAnswered: document.getElementById("stat-latest-answered"),
  statLatestCorrect: document.getElementById("stat-latest-correct"),
  errorPanel: document.getElementById("error-panel"),
  errorText: document.getElementById("error-text"),
  retryButton: document.getElementById("retry-button"),
};

const appHeader = mountHeader({
  container: document.querySelector(".container") || document.body,
  mode: "Timeline Trainer",
  progress: "0 answered",
});

function refreshHeader() {
  const unitLabel = state.scope.mode === PRACTICE_MODE.ALL
    ? "All units"
    : (state.unitById.get(state.scope.unitId)?.title || "Selected unit");
  appHeader.update({
    unit: unitLabel,
    progress: `${state.totalAnswered} answered`,
  });
}

const PRACTICE_LOOP_THRESHOLD = 5;
const SELECTED_UNIT_KEY = "selected_unit";

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

function getQuestionTypeLabel(type) {
  if (type === QUESTION_TYPES.EARLIEST_OF_3) {
    return "Earliest of 3";
  }
  if (type === QUESTION_TYPES.LATEST_OF_3) {
    return "Latest of 3";
  }
  return "Before / After";
}

function getQuestionPrompt(type) {
  if (type === QUESTION_TYPES.EARLIEST_OF_3) {
    return {
      title: "Which happened earliest?",
      text: "Choose the event that happened first.",
    };
  }
  if (type === QUESTION_TYPES.LATEST_OF_3) {
    return {
      title: "Which happened latest?",
      text: "Choose the event that happened last.",
    };
  }
  return {
    title: "Which happened earlier?",
    text: "Choose the earlier event.",
  };
}


function getModeHelpText(mode) {
  if (mode === MODE.EARLIEST_OF_3) {
    return "Select the earliest event.";
  }
  if (mode === MODE.LATEST_OF_3) {
    return "Select the latest event.";
  }
  if (mode === MODE.MIXED) {
    return "Rotates between the available question modes.";
  }
  return "Choose which event happened earlier.";
}

function getDifficultyLabelText(difficulty) {
  if (difficulty === DIFFICULTY.INTERMEDIATE) return "Intermediate";
  if (difficulty === DIFFICULTY.FULL) return "Full";
  return "Beginner";
}

function filterByDifficulty(events, difficulty) {
  if (difficulty === DIFFICULTY.BEGINNER) {
    return filterSharedEvents(events, { status: "reviewed" }).slice(0, BEGINNER_EVENT_LIMIT);
  }
  if (difficulty === DIFFICULTY.INTERMEDIATE) {
    return filterSharedEvents(events, { status: "draft" });
  }
  return events;
}

function getMinYearSpanForDifficulty(difficulty) {
  if (difficulty === DIFFICULTY.BEGINNER) return 15;
  if (difficulty === DIFFICULTY.INTERMEDIATE) return 12;
  return MIN_TRIPLET_YEAR_SPAN;
}

function getScopeEligibleCount() {
  if (state.scope.mode === PRACTICE_MODE.UNIT) {
    const pool = state.poolsByUnitId.get(state.scope.unitId);
    if (!pool) {
      return 0;
    }
    return pool.byType[QUESTION_TYPES.BEFORE_AFTER].length;
  }

  const uniqueIds = new Set();
  for (const pool of state.poolsByUnitId.values()) {
    for (const eventRecord of pool.byType[QUESTION_TYPES.BEFORE_AFTER]) {
      uniqueIds.add(eventRecord.id);
    }
  }
  return uniqueIds.size;
}

function updateModeHelp() {
  ui.modeHelp.textContent = getModeHelpText(ui.modeSelect.value);
}

function updateAvailabilityHint() {
  const eligibleCount = getScopeEligibleCount();
  if (eligibleCount === 0 && state.scope.minStatus === "reviewed") {
    ui.availabilityHint.textContent = "No reviewed items available. Switch to Include drafts.";
    return;
  }
  if (eligibleCount === 0) {
    ui.availabilityHint.textContent = "No eligible items available for this selection.";
    return;
  }
  ui.availabilityHint.textContent = `${eligibleCount} eligible events available in ${getDifficultyLabelText(state.scope.difficulty)} mode.`;
}


function getOptionButtons() {
  return [ui.optionA, ui.optionB, ui.optionC];
}

function getOptionByIndex(optionIndex) {
  return getOptionButtons()[optionIndex] ?? null;
}

function setAnswerButtonsEnabled(enabled) {
  for (const button of getOptionButtons()) {
    if (button.hidden) {
      continue;
    }
    button.disabled = !enabled;
  }
}

function clearAnswerButtonStates() {
  for (const button of getOptionButtons()) {
    button.classList.remove("selected", "correct", "incorrect");
    button.removeAttribute("data-marker");
  }
}

function applyAnswerButtonStates() {
  clearAnswerButtonStates();

  if (!state.hasAnswered || state.selectedOptionIndex === null || state.correctOptionIndex === null) {
    return;
  }

  const selectedButton = getOptionByIndex(state.selectedOptionIndex);
  const correctButton = getOptionByIndex(state.correctOptionIndex);
  if (!selectedButton || !correctButton) {
    return;
  }

  selectedButton.classList.add("selected");

  if (state.selectedOptionIndex === state.correctOptionIndex) {
    selectedButton.classList.add("correct");
    selectedButton.dataset.marker = "Selected • ✓ Correct";
    return;
  }

  selectedButton.classList.add("incorrect");
  selectedButton.dataset.marker = "Selected • ✗ Incorrect";

  correctButton.classList.add("correct");
  correctButton.dataset.marker = "✓ Correct answer";
}

function setResultMessage(message, resultType = "neutral") {
  ui.resultText.textContent = message;
  ui.resultText.classList.toggle("correct", resultType === "correct");
  ui.resultText.classList.toggle("incorrect", resultType === "incorrect");
}

function updateNextStepVisibility() {
  if (state.totalAnswered < PRACTICE_LOOP_THRESHOLD) {
    ui.nextStep.hidden = true;
    return;
  }

  ui.nextStepText.textContent = "Now test your recall with Event Recognition.";
  ui.nextStepLink.href = "../event-recognition/";
  ui.nextStep.hidden = false;
}

function setError(message, { allowRetry = false } = {}) {
  ui.errorText.textContent = message;
  ui.errorPanel.hidden = false;
  ui.retryButton.hidden = !allowRetry;
  setAnswerButtonsEnabled(false);
  ui.nextButton.disabled = !allowRetry;
  console.error("[Timeline Trainer]", message);
}

function clearError() {
  ui.errorText.textContent = "";
  ui.errorPanel.hidden = true;
  ui.retryButton.hidden = true;
}

function updateStats() {
  ui.statTotal.textContent = String(state.totalAnswered);
  ui.statCorrect.textContent = `${state.correctAnswered} (${state.score.toFixed(1)} pts)`;
  ui.statAccuracy.textContent =
    state.totalAnswered === 0 ? "—" : `${Math.round((state.correctAnswered / state.totalAnswered) * 100)}%`;
  ui.statReviewAnswered.textContent = String(state.reviewAnswered);
  ui.statReviewCorrect.textContent = String(state.reviewCorrect);
  ui.statBeforeAfterAnswered.textContent = String(state.answeredByType[QUESTION_TYPES.BEFORE_AFTER]);
  ui.statBeforeAfterCorrect.textContent = String(state.correctByType[QUESTION_TYPES.BEFORE_AFTER]);
  ui.statEarliestAnswered.textContent = String(state.answeredByType[QUESTION_TYPES.EARLIEST_OF_3]);
  ui.statEarliestCorrect.textContent = String(state.correctByType[QUESTION_TYPES.EARLIEST_OF_3]);
  ui.statLatestAnswered.textContent = String(state.answeredByType[QUESTION_TYPES.LATEST_OF_3]);
  ui.statLatestCorrect.textContent = String(state.correctByType[QUESTION_TYPES.LATEST_OF_3]);
  updateNextStepVisibility();
  refreshHeader();
}

function renderQuestion(question) {
  state.currentQuestion = question;
  state.hasAnswered = false;
  state.selectedOptionIndex = null;
  state.correctOptionIndex = null;
  clearError();

  const prompt = getQuestionPrompt(question.type);
  ui.questionTitle.textContent = prompt.title;
  ui.questionText.textContent = prompt.text;
  ui.questionBadge.hidden = !question.isReview;

  const optionButtons = getOptionButtons();
  for (let index = 0; index < optionButtons.length; index += 1) {
    const button = optionButtons[index];
    const option = question.options[index];
    button.hidden = !option;
    if (!option) {
      button.textContent = "";
      continue;
    }
    button.textContent = option.label;
    button.disabled = false;
  }

  clearAnswerButtonStates();
  setAnswerButtonsEnabled(true);
  ui.nextButton.disabled = true;
  setResultMessage("Choose one option.");
}

function recordRecentPair(pairKey) {
  if (!pairKey) {
    return;
  }
  state.recentPairKeys.unshift(pairKey);
  state.recentPairKeys = state.recentPairKeys.slice(0, RECENT_PAIR_WINDOW);
}

function recordRecentTriplet(tripletKey) {
  if (!tripletKey) {
    return;
  }
  state.recentTripletKeys.unshift(tripletKey);
  state.recentTripletKeys = state.recentTripletKeys.slice(0, RECENT_TRIPLET_WINDOW);
}

function getRandomDelay() {
  return REVIEW_DELAY_MIN + Math.floor(Math.random() * (REVIEW_DELAY_MAX - REVIEW_DELAY_MIN + 1));
}

function createReviewQuestion(eventIds) {
  const firstEvent = state.eventsById.get(eventIds[0]);
  const secondEvent = state.eventsById.get(eventIds[1]);

  if (!firstEvent || !secondEvent) {
    return null;
  }

  const pairKey = createPairKey(firstEvent.id, secondEvent.id);
  if (state.recentPairKeys.includes(pairKey) || firstEvent.time.year_start === secondEvent.time.year_start) {
    return null;
  }

  const earlierFirst = firstEvent.time.year_start < secondEvent.time.year_start;
  const earlierEvent = earlierFirst ? firstEvent : secondEvent;
  const laterEvent = earlierFirst ? secondEvent : firstEvent;
  const showEarlierFirst = Math.random() < 0.5;
  const optionsView = showEarlierFirst ? [earlierEvent, laterEvent] : [laterEvent, earlierEvent];
  const correctOptionIndex = optionsView[0].id === earlierEvent.id ? 0 : 1;

  return {
    type: QUESTION_TYPES.BEFORE_AFTER,
    options: [
      { key: "A", ...optionsView[0] },
      { key: "B", ...optionsView[1] },
    ],
    correctOptionIndex,
    pairKey,
    isReview: true,
  };
}

function getEligibleReviewEntries() {
  const entries = [];
  for (const [pairKey, entry] of state.wrongQueue.entries()) {
    if (entry.attempts >= REVIEW_MAX_ATTEMPTS) {
      continue;
    }
    if (state.questionIndex < entry.nextEligibleAt) {
      continue;
    }
    if (state.recentPairKeys.includes(pairKey)) {
      continue;
    }
    entries.push({ pairKey, ...entry });
  }

  entries.sort(
    (entryA, entryB) => entryA.nextEligibleAt - entryB.nextEligibleAt || entryA.lastAskedAt - entryB.lastAskedAt
  );
  return entries;
}

function pickReviewQuestion(enabledTypes) {
  if (!enabledTypes.includes(QUESTION_TYPES.BEFORE_AFTER)) {
    return null;
  }

  const eligibleEntries = getEligibleReviewEntries();
  if (eligibleEntries.length === 0 || Math.random() >= REVIEW_PROBABILITY) {
    return null;
  }

  for (const entry of eligibleEntries) {
    const question = createReviewQuestion(entry.eventIds);
    if (!question) {
      continue;
    }

    const queueEntry = state.wrongQueue.get(entry.pairKey);
    if (!queueEntry) {
      continue;
    }
    queueEntry.attempts += 1;
    queueEntry.lastAskedAt = state.questionIndex;
    state.wrongQueue.set(entry.pairKey, queueEntry);
    return question;
  }

  return null;
}

function queueWrongPair(question) {
  if (question.type !== QUESTION_TYPES.BEFORE_AFTER) {
    return;
  }

  const pairKey = createPairKey(question.options[0].id, question.options[1].id);
  const existing = state.wrongQueue.get(pairKey);
  const nextEligibleAt = state.questionIndex + getRandomDelay();

  if (!existing) {
    state.wrongQueue.set(pairKey, {
      eventIds: [question.options[0].id, question.options[1].id],
      wrongCount: 1,
      nextEligibleAt,
      lastAskedAt: state.questionIndex,
      attempts: 0,
    });
    return;
  }

  existing.wrongCount += 1;
  existing.nextEligibleAt = nextEligibleAt;
  existing.lastAskedAt = state.questionIndex;
  state.wrongQueue.set(pairKey, existing);
}

function hasTripletCapacity(events) {
  if (events.length < 3) {
    return false;
  }

  const sortedYears = [...new Set(events.map((eventRecord) => eventRecord.time.year_start))].sort((left, right) => left - right);
  for (let startIndex = 0; startIndex < sortedYears.length - 2; startIndex += 1) {
    for (let endIndex = startIndex + 2; endIndex < sortedYears.length; endIndex += 1) {
      if (sortedYears[endIndex] - sortedYears[startIndex] >= MIN_TRIPLET_YEAR_SPAN) {
        return true;
      }
    }
  }

  return false;
}

function getQuestionTypeFilter(type) {
  return QUESTION_TYPE_ALIASES[type] || type;
}

function buildPoolsForScope() {
  const poolsByUnitId = new Map();

  for (const unit of state.units) {
    const { resolvedEvents, missingIds } = resolveUnitEvents(unit, state.eventsById);
    if (missingIds.length > 0) {
      console.warn("[Timeline Trainer] Missing unit event ids:", unit.id, missingIds);
    }

    const difficultyFilteredEvents = filterByDifficulty(resolvedEvents, state.scope.difficulty);
    const beforeAfterCandidates = filterEligibleEvents(
      difficultyFilteredEvents,
      state.scope,
      getQuestionTypeFilter(QUESTION_TYPES.BEFORE_AFTER)
    );
    const earliestCandidates = filterEligibleEvents(
      difficultyFilteredEvents,
      state.scope,
      getQuestionTypeFilter(QUESTION_TYPES.EARLIEST_OF_3)
    );
    const latestCandidates = filterEligibleEvents(
      difficultyFilteredEvents,
      state.scope,
      getQuestionTypeFilter(QUESTION_TYPES.LATEST_OF_3)
    );

    const availableTypes = new Set();
    if (beforeAfterCandidates.length >= 2) {
      availableTypes.add(QUESTION_TYPES.BEFORE_AFTER);
    }
    if (hasTripletCapacity(earliestCandidates)) {
      availableTypes.add(QUESTION_TYPES.EARLIEST_OF_3);
    }
    if (hasTripletCapacity(latestCandidates)) {
      availableTypes.add(QUESTION_TYPES.LATEST_OF_3);
    }

    poolsByUnitId.set(unit.id, {
      unit,
      byType: {
        [QUESTION_TYPES.BEFORE_AFTER]: beforeAfterCandidates,
        [QUESTION_TYPES.EARLIEST_OF_3]: earliestCandidates,
        [QUESTION_TYPES.LATEST_OF_3]: latestCandidates,
      },
      availableTypes,
      eligibleCount: {
        [QUESTION_TYPES.BEFORE_AFTER]: beforeAfterCandidates.length,
        [QUESTION_TYPES.EARLIEST_OF_3]: earliestCandidates.length,
        [QUESTION_TYPES.LATEST_OF_3]: latestCandidates.length,
      },
    });
  }

  state.poolsByUnitId = poolsByUnitId;
}

function refreshScopeAvailability() {
  const availableTypes = new Set();

  if (state.scope.mode === PRACTICE_MODE.UNIT) {
    const selectedPool = state.poolsByUnitId.get(state.scope.unitId);
    if (selectedPool) {
      for (const type of selectedPool.availableTypes) {
        availableTypes.add(type);
      }
    }
  } else {
    for (const unitPool of state.poolsByUnitId.values()) {
      for (const type of unitPool.availableTypes) {
        availableTypes.add(type);
      }
    }
  }

  state.availableTypes = availableTypes;
}

function isQuestionTypeAvailable(questionType) {
  return state.availableTypes.has(questionType);
}

function getRequestedTypesFromQuestionMode() {
  const selectedMode = ui.modeSelect.value;
  if (selectedMode === MODE.BEFORE_AFTER) {
    return [QUESTION_TYPES.BEFORE_AFTER];
  }
  if (selectedMode === MODE.EARLIEST_OF_3) {
    return [QUESTION_TYPES.EARLIEST_OF_3];
  }
  if (selectedMode === MODE.LATEST_OF_3) {
    return [QUESTION_TYPES.LATEST_OF_3];
  }
  return [QUESTION_TYPES.BEFORE_AFTER, QUESTION_TYPES.EARLIEST_OF_3, QUESTION_TYPES.LATEST_OF_3];
}

function getEnabledTypesForScope() {
  return state.scope.enabledQuestionTypes.filter(isQuestionTypeAvailable);
}

function generateByTypeWithPool(questionType, candidatePool) {
  if (questionType === QUESTION_TYPES.EARLIEST_OF_3) {
    return {
      ...generateEarliestOfThreeQuestion(candidatePool, {
        recentTripletKeys: state.recentTripletKeys,
        minYearSpan: getMinYearSpanForDifficulty(state.scope.difficulty),
      }),
      isReview: false,
    };
  }

  if (questionType === QUESTION_TYPES.LATEST_OF_3) {
    return {
      ...generateLatestOfThreeQuestion(candidatePool, {
        recentTripletKeys: state.recentTripletKeys,
        minYearSpan: getMinYearSpanForDifficulty(state.scope.difficulty),
      }),
      isReview: false,
    };
  }

  return {
    ...generateBeforeAfterQuestion(candidatePool, {
      recentPairKeys: state.recentPairKeys,
    }),
    isReview: false,
  };
}

function pickTypeWithWeights(types) {
  const weighted = types.map((type) => {
    if (type === QUESTION_TYPES.BEFORE_AFTER) {
      return { type, weight: 50 };
    }
    return { type, weight: 25 };
  });

  let totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  const attempts = [];
  while (weighted.length > 0) {
    let roll = Math.random() * totalWeight;
    let pickedIndex = 0;
    for (let index = 0; index < weighted.length; index += 1) {
      roll -= weighted[index].weight;
      if (roll <= 0) {
        pickedIndex = index;
        break;
      }
    }

    const [picked] = weighted.splice(pickedIndex, 1);
    attempts.push(picked.type);
    totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  }

  return attempts;
}

function pickUnitPoolForType(questionType) {
  const eligibleUnitPools = [];
  for (const unitPool of state.poolsByUnitId.values()) {
    if (unitPool.availableTypes.has(questionType)) {
      eligibleUnitPools.push(unitPool);
    }
  }

  if (eligibleUnitPools.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * eligibleUnitPools.length);
  return eligibleUnitPools[index];
}

function generateFreshQuestion(enabledTypes) {
  if (enabledTypes.length === 0) {
    if (state.scope.mode === PRACTICE_MODE.ALL) {
      throw new Error("No units have enough eligible events for this mode/settings.");
    }
    throw new Error("This unit has no eligible events for the current settings.");
  }

  const orderedTypes = ui.modeSelect.value === MODE.MIXED ? pickTypeWithWeights(enabledTypes) : enabledTypes;

  if (state.scope.mode === PRACTICE_MODE.UNIT) {
    const selectedUnitPool = state.poolsByUnitId.get(state.scope.unitId);
    if (!selectedUnitPool) {
      throw new Error("Selected unit could not be loaded.");
    }

    for (const questionType of orderedTypes) {
      try {
        return generateByTypeWithPool(questionType, selectedUnitPool.byType[questionType]);
      } catch (error) {
        console.warn(`[Timeline Trainer] ${getQuestionTypeLabel(questionType)} generation skipped:`, error.message);
      }
    }
  }

  for (const questionType of orderedTypes) {
    const pickedUnitPool = pickUnitPoolForType(questionType);
    if (!pickedUnitPool) {
      continue;
    }

    try {
      return generateByTypeWithPool(questionType, pickedUnitPool.byType[questionType]);
    } catch (error) {
      console.warn(
        `[Timeline Trainer] ${pickedUnitPool.unit.title} / ${getQuestionTypeLabel(questionType)} generation skipped:`,
        error.message
      );
    }
  }

  throw new Error("No units have enough eligible events for this mode/settings.");
}

function generateAndRenderNextQuestion() {
  clearError();
  state.questionIndex += 1;

  try {
    const enabledTypes = getEnabledTypesForScope();
    const reviewQuestion = pickReviewQuestion(enabledTypes);
    const question = reviewQuestion || generateFreshQuestion(enabledTypes);
    renderQuestion(question);
  } catch (error) {
    state.currentQuestion = null;
    setError(error.message, { allowRetry: true });
    setResultMessage("Could not load the next question. Use Try again to retry.", "incorrect");
  }
}

function recordTimelineMastery(question, isCorrect) {
  if (!question || !Array.isArray(question.options)) {
    return;
  }

  const seenIds = new Set();
  for (const option of question.options) {
    if (!option?.id || seenIds.has(option.id)) {
      continue;
    }

    seenIds.add(option.id);
    recordResult(option.id, isCorrect);
  }
}

function handleAnswer(optionIndex) {
  if (!state.currentQuestion || state.hasAnswered) {
    return;
  }

  const isCorrect = optionIndex === state.currentQuestion.correctOptionIndex;

  state.hasAnswered = true;
  state.selectedOptionIndex = optionIndex;
  state.correctOptionIndex = state.currentQuestion.correctOptionIndex;

  if (state.currentQuestion.pairKey) {
    recordRecentPair(state.currentQuestion.pairKey);
  }
  if (state.currentQuestion.tripletKey) {
    recordRecentTriplet(state.currentQuestion.tripletKey);
  }

  state.totalAnswered += 1;
  state.answeredByType[state.currentQuestion.type] += 1;

  if (state.currentQuestion.isReview) {
    state.reviewAnswered += 1;
  }

  recordTimelineMastery(state.currentQuestion, isCorrect);

  if (isCorrect) {
    state.correctAnswered += 1;
    state.score += DIFFICULTY_MULTIPLIER[state.scope.difficulty] ?? 1;
    state.correctByType[state.currentQuestion.type] += 1;
    if (state.currentQuestion.isReview) {
      state.reviewCorrect += 1;
      state.wrongQueue.delete(state.currentQuestion.pairKey);
    }
  } else {
    queueWrongPair(state.currentQuestion);
  }

  updateStats();
  setAnswerButtonsEnabled(false);
  applyAnswerButtonStates();
  ui.nextButton.disabled = false;

  const explanation = explainQuestionAnswer(state.currentQuestion);
  setResultMessage(`${isCorrect ? "Correct" : "Incorrect"}. ${explanation}`, isCorrect ? "correct" : "incorrect");
}

function populateUnitSelector() {
  ui.unitSelect.innerHTML = "";
  for (const unit of state.units) {
    const option = document.createElement("option");
    option.value = unit.id;
    option.textContent = unit.title;
    ui.unitSelect.append(option);
  }
}

function updateHeaderScopeLabel() {
  if (state.scope.mode === PRACTICE_MODE.ALL) {
    ui.unitTitle.textContent = `Scope: All units (${state.units.length})`;
    return;
  }

  const unit = state.unitById.get(state.scope.unitId);
  ui.unitTitle.textContent = unit ? `Unit: ${unit.title}` : "Unit: Not selected";
}

function syncSettingsUI() {
  ui.practiceModeSelect.value = state.scope.mode;
  if (state.scope.unitId) {
    ui.unitSelect.value = state.scope.unitId;
  }
  ui.qualitySelect.value = state.scope.minStatus;
  ui.difficultySelect.value = state.scope.difficulty;
  ui.difficultyLabel.textContent = `Difficulty: ${getDifficultyLabelText(state.scope.difficulty)}`;
  ui.unitSelectWrap.hidden = state.scope.mode !== PRACTICE_MODE.UNIT;
  updateHeaderScopeLabel();
  updateModeHelp();
  updateAvailabilityHint();
}

function resetSessionState() {
  state.currentQuestion = null;
  state.totalAnswered = 0;
  state.correctAnswered = 0;
  state.score = 0;
  state.reviewAnswered = 0;
  state.reviewCorrect = 0;
  state.answeredByType = {
    [QUESTION_TYPES.BEFORE_AFTER]: 0,
    [QUESTION_TYPES.EARLIEST_OF_3]: 0,
    [QUESTION_TYPES.LATEST_OF_3]: 0,
  };
  state.correctByType = {
    [QUESTION_TYPES.BEFORE_AFTER]: 0,
    [QUESTION_TYPES.EARLIEST_OF_3]: 0,
    [QUESTION_TYPES.LATEST_OF_3]: 0,
  };
  state.hasAnswered = false;
  state.selectedOptionIndex = null;
  state.correctOptionIndex = null;
  state.recentPairKeys = [];
  state.recentTripletKeys = [];
  state.wrongQueue = new Map();
  state.questionIndex = 0;
  updateStats();
}

function areScopesEqual(left, right) {
  return (
    left.mode === right.mode &&
    left.unitId === right.unitId &&
    left.minStatus === right.minStatus &&
    left.difficulty === right.difficulty &&
    JSON.stringify(left.enabledQuestionTypes) === JSON.stringify(right.enabledQuestionTypes)
  );
}

function applyScope(nextScope) {
  if (areScopesEqual(state.scope, nextScope)) {
    return;
  }

  state.scope = nextScope;
  if (nextScope.unitId) {
    localStorage.setItem(SELECTED_UNIT_KEY, nextScope.unitId);
  }
  syncSettingsUI();
  buildPoolsForScope();
  refreshScopeAvailability();
  updateAvailabilityHint();
  resetSessionState();
  generateAndRenderNextQuestion();
}

function bindEvents() {
  ui.optionA.addEventListener("click", () => {
    handleAnswer(0);
  });

  ui.optionB.addEventListener("click", () => {
    handleAnswer(1);
  });

  ui.optionC.addEventListener("click", () => {
    handleAnswer(2);
  });

  ui.nextButton.addEventListener("click", () => {
    generateAndRenderNextQuestion();
  });

  ui.retryButton.addEventListener("click", () => {
    generateAndRenderNextQuestion();
  });

  ui.modeSelect.addEventListener("change", () => {
    updateModeHelp();
    applyScope({
      ...state.scope,
      enabledQuestionTypes: getRequestedTypesFromQuestionMode(),
    });
  });

  ui.practiceModeSelect.addEventListener("change", () => {
    applyScope({
      ...state.scope,
      mode: ui.practiceModeSelect.value,
      unitId: ui.practiceModeSelect.value === PRACTICE_MODE.UNIT ? ui.unitSelect.value : null,
    });
  });

  ui.unitSelect.addEventListener("change", () => {
    applyScope({
      ...state.scope,
      unitId: ui.unitSelect.value,
    });
  });

  ui.qualitySelect.addEventListener("change", () => {
    applyScope({
      ...state.scope,
      minStatus: ui.qualitySelect.value,
    });
  });

  ui.difficultySelect.addEventListener("change", () => {
    applyScope({
      ...state.scope,
      difficulty: ui.difficultySelect.value,
    });
  });
}

export async function startApp() {
  bindEvents();

  if (window.location.protocol === "file:") {
    ui.unitTitle.textContent = "Unit could not be loaded";
    ui.questionText.textContent = "Start a local web server and reopen this app over http://localhost.";
    setResultMessage("Data files cannot be fetched over file:// URLs.", "incorrect");
    setError(
      "This app must be opened via HTTP. Example: run `python3 -m http.server` in the repo root and open http://localhost:8000/apps/timeline-trainer/."
    );
    return;
  }

  try {
    clearError();
    ui.unitTitle.textContent = "Loading units...";

    const { events, units } = await loadTimelineSeedData();
    const safeEvents = (Array.isArray(events) ? events : []).filter(isValidEvent);
    if (safeEvents.length === 0) {
      throw new Error("No valid events available.");
    }
    state.eventsById = new Map(safeEvents.map((eventRecord) => [eventRecord.id, eventRecord]));
    state.units = units;
    state.unitById = new Map(units.map((unit) => [unit.id, unit]));

    populateUnitSelector();
    const savedUnitId = localStorage.getItem(SELECTED_UNIT_KEY);
    const defaultUnitId = units.some((unit) => unit.id === savedUnitId) ? savedUnitId : (units[0]?.id || null);
    state.scope = {
      ...state.scope,
      mode: PRACTICE_MODE.UNIT,
      unitId: defaultUnitId,
      minStatus: "reviewed",
      difficulty: DIFFICULTY.BEGINNER,
      enabledQuestionTypes: getRequestedTypesFromQuestionMode(),
    };

    syncSettingsUI();
    buildPoolsForScope();
    refreshScopeAvailability();
    updateAvailabilityHint();
    resetSessionState();
    generateAndRenderNextQuestion();
    refreshHeader();
  } catch (error) {
    ui.unitTitle.textContent = "Unit could not be loaded";
    ui.questionText.textContent = "Question data failed to load.";
    setResultMessage("Could not start Timeline Trainer.", "incorrect");
    setError(error.message);
  }
}
