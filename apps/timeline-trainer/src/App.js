import { loadTimelineSeedData } from "./data/loaders.js";
import {
  createPairKey,
  explainQuestionAnswer,
  filterQuestionTypeCandidates,
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

const MODE = {
  BEFORE_AFTER: "before_after",
  EARLIEST_OF_3: "earliest_of_3",
  LATEST_OF_3: "latest_of_3",
  MIXED: "mixed",
};

const RECENT_PAIR_WINDOW = 15;
const RECENT_TRIPLET_WINDOW = 12;
const REVIEW_PROBABILITY = 0.3;
const REVIEW_DELAY_MIN = 2;
const REVIEW_DELAY_MAX = 4;
const REVIEW_MAX_ATTEMPTS = 2;
const MIN_TRIPLET_YEAR_SPAN = 10;

const state = {
  unit: null,
  resolvedEvents: [],
  candidatesByType: {},
  availableTypes: new Set(),
  currentQuestion: null,
  totalAnswered: 0,
  correctAnswered: 0,
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
  eventById: new Map(),
};

const ui = {
  unitTitle: document.getElementById("unit-title"),
  modeSelect: document.getElementById("mode-select"),
  questionTitle: document.getElementById("question-title"),
  questionText: document.getElementById("question-text"),
  questionBadge: document.getElementById("question-badge"),
  optionA: document.getElementById("option-a"),
  optionB: document.getElementById("option-b"),
  optionC: document.getElementById("option-c"),
  resultText: document.getElementById("result-text"),
  nextButton: document.getElementById("next-button"),
  statTotal: document.getElementById("stat-total"),
  statCorrect: document.getElementById("stat-correct"),
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
  ui.statCorrect.textContent = String(state.correctAnswered);
  ui.statReviewAnswered.textContent = String(state.reviewAnswered);
  ui.statReviewCorrect.textContent = String(state.reviewCorrect);
  ui.statBeforeAfterAnswered.textContent = String(state.answeredByType[QUESTION_TYPES.BEFORE_AFTER]);
  ui.statBeforeAfterCorrect.textContent = String(state.correctByType[QUESTION_TYPES.BEFORE_AFTER]);
  ui.statEarliestAnswered.textContent = String(state.answeredByType[QUESTION_TYPES.EARLIEST_OF_3]);
  ui.statEarliestCorrect.textContent = String(state.correctByType[QUESTION_TYPES.EARLIEST_OF_3]);
  ui.statLatestAnswered.textContent = String(state.answeredByType[QUESTION_TYPES.LATEST_OF_3]);
  ui.statLatestCorrect.textContent = String(state.correctByType[QUESTION_TYPES.LATEST_OF_3]);
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
  const firstEvent = state.eventById.get(eventIds[0]);
  const secondEvent = state.eventById.get(eventIds[1]);

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

function isQuestionTypeAvailable(questionType) {
  return state.availableTypes.has(questionType);
}

function getEnabledTypesForMode() {
  const selectedMode = ui.modeSelect.value;
  if (selectedMode === MODE.BEFORE_AFTER) {
    return [QUESTION_TYPES.BEFORE_AFTER].filter(isQuestionTypeAvailable);
  }
  if (selectedMode === MODE.EARLIEST_OF_3) {
    return [QUESTION_TYPES.EARLIEST_OF_3].filter(isQuestionTypeAvailable);
  }
  if (selectedMode === MODE.LATEST_OF_3) {
    return [QUESTION_TYPES.LATEST_OF_3].filter(isQuestionTypeAvailable);
  }

  return [QUESTION_TYPES.BEFORE_AFTER, QUESTION_TYPES.EARLIEST_OF_3, QUESTION_TYPES.LATEST_OF_3].filter(
    isQuestionTypeAvailable
  );
}

function generateByType(questionType) {
  if (questionType === QUESTION_TYPES.EARLIEST_OF_3) {
    return {
      ...generateEarliestOfThreeQuestion(state.candidatesByType[QUESTION_TYPES.EARLIEST_OF_3], {
        recentTripletKeys: state.recentTripletKeys,
        minYearSpan: MIN_TRIPLET_YEAR_SPAN,
      }),
      isReview: false,
    };
  }

  if (questionType === QUESTION_TYPES.LATEST_OF_3) {
    return {
      ...generateLatestOfThreeQuestion(state.candidatesByType[QUESTION_TYPES.LATEST_OF_3], {
        recentTripletKeys: state.recentTripletKeys,
        minYearSpan: MIN_TRIPLET_YEAR_SPAN,
      }),
      isReview: false,
    };
  }

  return {
    ...generateBeforeAfterQuestion(state.candidatesByType[QUESTION_TYPES.BEFORE_AFTER], {
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

function generateFreshQuestion(enabledTypes) {
  if (enabledTypes.length === 0) {
    throw new Error("Not enough events for this mode yet. Try a different mode.");
  }

  const orderedTypes = ui.modeSelect.value === MODE.MIXED ? pickTypeWithWeights(enabledTypes) : enabledTypes;

  for (const questionType of orderedTypes) {
    try {
      return generateByType(questionType);
    } catch (error) {
      console.warn(`[Timeline Trainer] ${getQuestionTypeLabel(questionType)} generation skipped:`, error.message);
    }
  }

  throw new Error("Not enough events for this mode yet. Try a different mode.");
}

function generateAndRenderNextQuestion() {
  clearError();
  state.questionIndex += 1;

  try {
    const enabledTypes = getEnabledTypesForMode();
    const reviewQuestion = pickReviewQuestion(enabledTypes);
    const question = reviewQuestion || generateFreshQuestion(enabledTypes);
    renderQuestion(question);
  } catch (error) {
    state.currentQuestion = null;
    setError(error.message, { allowRetry: true });
    setResultMessage("Could not load the next question. Use Try again to retry.", "incorrect");
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

  if (isCorrect) {
    state.correctAnswered += 1;
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

function validateAndPrepareData(events, unit) {
  const { resolvedEvents, missingIds } = resolveUnitEvents(events, unit);
  if (missingIds.length > 0) {
    console.warn("[Timeline Trainer] Missing unit event ids:", missingIds);
    setError(`Some unit event IDs were not found in events.json: ${missingIds.join(", ")}`);
    return false;
  }

  state.resolvedEvents = resolvedEvents;
  state.eventById = new Map(resolvedEvents.map((eventRecord) => [eventRecord.id, eventRecord]));

  const beforeAfterCandidates = filterQuestionTypeCandidates(resolvedEvents, QUESTION_TYPES.BEFORE_AFTER);
  const earliestCandidates = filterQuestionTypeCandidates(resolvedEvents, QUESTION_TYPES.EARLIEST_OF_3);
  const latestCandidates = filterQuestionTypeCandidates(resolvedEvents, QUESTION_TYPES.LATEST_OF_3);

  state.candidatesByType = {
    [QUESTION_TYPES.BEFORE_AFTER]: beforeAfterCandidates,
    [QUESTION_TYPES.EARLIEST_OF_3]: earliestCandidates,
    [QUESTION_TYPES.LATEST_OF_3]: latestCandidates,
  };

  state.availableTypes = new Set();
  if (beforeAfterCandidates.length >= 2) {
    state.availableTypes.add(QUESTION_TYPES.BEFORE_AFTER);
  }
  if (hasTripletCapacity(earliestCandidates)) {
    state.availableTypes.add(QUESTION_TYPES.EARLIEST_OF_3);
  }
  if (hasTripletCapacity(latestCandidates)) {
    state.availableTypes.add(QUESTION_TYPES.LATEST_OF_3);
  }

  if (state.availableTypes.size === 0) {
    setError("No timeline question modes have enough events right now.");
    return false;
  }

  return true;
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
    state.currentQuestion = null;
    generateAndRenderNextQuestion();
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
    ui.unitTitle.textContent = "Loading unit...";

    const { events, unit } = await loadTimelineSeedData();
    state.unit = unit;
    ui.unitTitle.textContent = `Unit: ${unit.title}`;

    const ready = validateAndPrepareData(events, unit);
    if (!ready) {
      return;
    }

    updateStats();
    generateAndRenderNextQuestion();
  } catch (error) {
    ui.unitTitle.textContent = "Unit could not be loaded";
    ui.questionText.textContent = "Question data failed to load.";
    setResultMessage("Could not start Timeline Trainer.", "incorrect");
    setError(error.message);
  }
}
