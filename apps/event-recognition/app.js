import { filterDerivedEvents, loadDerivedEvents, loadUnitsIndex } from "../shared/data-access.js";
import { isRecognitionReady } from "../shared/event-filters.js";
import { getReviewQueueEventIds, getWeight, isWeakEvent, recordResult } from "../shared/mastery-store.js";
import { createSession, weightedPick } from "../shared/session-engine.js";
import { showFeedback } from "../shared/feedback.js";
import { mountHeader } from "../shared/header.js";

const questionElement = document.getElementById("question");
const choicesElement = document.getElementById("choices");
const feedbackElement = document.getElementById("feedback");
const answerMetaElement = document.getElementById("answer-meta");
const nextButton = document.getElementById("next");
const practiceModeSelect = document.getElementById("practice-mode");
const unitSelect = document.getElementById("unit-select");
const qualitySelect = document.getElementById("quality-select");
const sessionLengthSelect = document.getElementById("session-length");
const eligibilityHint = document.getElementById("eligibility-hint");
const progressElement = document.getElementById("progress");
const sessionStatusElement = document.getElementById("session-status");
const adaptiveModeElement = document.getElementById("adaptive-mode");
const adaptiveIndicatorElement = document.getElementById("adaptive-indicator");
const summaryElement = document.getElementById("summary");
const nextStepElement = document.getElementById("next-step");
const nextStepTextElement = document.getElementById("next-step-text");
const nextStepLinkElement = document.getElementById("next-step-link");
const SELECTED_UNIT_KEY = "selected_unit";

const state = {
  eventsById: new Map(),
  units: [],
  currentQuestion: null,
  currentQuestionIndex: 0,
  totalQuestions: 10,
  correctAnswers: 0,
  sessionActive: false,
  recentAnswerIds: [],
  session: null,
};

const appHeader = mountHeader({
  container: document.querySelector("main") || document.body,
  mode: "Event Recognition",
  progress: "0/0",
});

function refreshHeader() {
  const unitLabel = practiceModeSelect.value === "unit"
    ? (unitSelect.selectedOptions[0]?.textContent || "Selected unit")
    : "All units";
  appHeader.update({
    unit: unitLabel,
    progress: `${Math.min(state.currentQuestionIndex + 1, state.totalQuestions)}/${state.totalQuestions}`,
  });
}

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

function randomInt(max) { return Math.floor(Math.random() * max); }
function shuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getRecognitionPool() {
  return filterDerivedEvents([...state.eventsById.values()], {
    status: qualitySelect.value,
    predicate: isRecognitionReady,
  });
}

function getScopedPool() {
  const scopedEvents = filterDerivedEvents(getRecognitionPool(), {
    unitId: practiceModeSelect.value === "unit" ? unitSelect.value : null,
  });

  if (!adaptiveModeElement.checked) {
    return { pool: scopedEvents, adaptiveActive: false, adaptiveMessage: "" };
  }

  const adaptive = getAdaptivePool(scopedEvents);
  return { pool: adaptive.pool, adaptiveActive: adaptive.active, adaptiveMessage: adaptive.reason };
}


const RECENT_ANSWER_LIMIT = 3;

function getAdaptivePool(events) {
  const weakEvents = events.filter((event) => isWeakEvent(event.id));
  if (weakEvents.length === 0) {
    return {
      pool: events,
      active: false,
      reason: "Focused mode requested, but no weak events found. Using full pool.",
    };
  }

  return {
    pool: weakEvents.length >= 4 ? weakEvents : events,
    active: weakEvents.length >= 4,
    reason: weakEvents.length >= 4
      ? "Focused mode active: weak events."
      : "Focused mode requested, but too few weak events were available for 4 choices. Using full pool.",
  };
}

function updateAdaptiveIndicator(message = '') {
  if (!adaptiveModeElement.checked) {
    adaptiveIndicatorElement.hidden = true;
    adaptiveIndicatorElement.textContent = '';
    return;
  }

  adaptiveIndicatorElement.hidden = false;
  adaptiveIndicatorElement.textContent = message || 'Adaptive mode active.';
}

function clearChoices() { choicesElement.innerHTML = ""; }
function disableChoices() { choicesElement.querySelectorAll("button").forEach((button) => { button.disabled = true; }); }
function buildClue(event) {
  return `"${typeof event?.summary_short === "string" ? event.summary_short.trim() : "No summary available."}"`;
}
function unitForEvent(event) {
  const unitId = Array.isArray(event.unit_ids) ? event.unit_ids[0] : null;
  return state.units.find((candidate) => candidate.id === unitId) || null;
}

function updateEligibilityHint(pool) {
  const scopeLabel = practiceModeSelect.value === "all" ? "all units" : "this unit";
  if (pool.length === 0 && qualitySelect.value === "reviewed") {
    eligibilityHint.textContent = `No recognition-eligible events found for ${scopeLabel} at Reviewed+ quality. Switch to Include drafts.`;
    return;
  }
  eligibilityHint.textContent = `Usable events under current settings: ${pool.length}.`;
}

function buildDistractors(answer, activePool, broaderPool) {
  const sameUnitCandidates = activePool.filter((event) => event.id !== answer.id);
  const distractors = [];
  const seen = new Set([answer.id]);

  for (const event of shuffle(sameUnitCandidates)) {
    if (distractors.length >= 3) break;
    distractors.push(event);
    seen.add(event.id);
  }

  if (distractors.length < 3) {
    for (const event of shuffle(broaderPool)) {
      if (distractors.length >= 3) break;
      if (seen.has(event.id)) continue;
      distractors.push(event);
      seen.add(event.id);
    }
  }

  return distractors;
}

function pickAnswerEvent(activePool) {
  const reviewIds = getReviewQueueEventIds(25);
  if (reviewIds.length > 0) {
    const activeById = new Map(activePool.map((event) => [event.id, event]));
    const eligibleReviewEvents = reviewIds
      .map((eventId) => activeById.get(eventId))
      .filter((event) => Boolean(event) && !state.recentAnswerIds.includes(event.id));
    if (eligibleReviewEvents.length > 0) {
      return { event: eligibleReviewEvents[0], fromReviewQueue: true };
    }
  }

  return { event: weightedPick(activePool, (event) => getWeight(event.id)), fromReviewQueue: false };
}

function getFeedbackMessage(accuracy) {
  if (accuracy >= 85) return "Strong recognition. You are ready to move into causality practice.";
  if (accuracy >= 60) return "Good progress. Another short recognition session should make recall feel faster.";
  return "Keep building the basics. A return to Timeline Trainer may help before another recognition session.";
}

function updateProgress() {
  progressElement.textContent = `Question ${Math.min(state.currentQuestionIndex + 1, state.totalQuestions)} of ${state.totalQuestions}`;
  refreshHeader();
}

function resetRoundUi() {
  feedbackElement.textContent = "";
  answerMetaElement.textContent = "";
  nextButton.disabled = true;
}

function hideNextStep() {
  nextStepElement.hidden = true;
}

function showNextStep() {
  nextStepTextElement.textContent = "Now practice cause-and-effect relationships in Causality Builder.";
  nextStepLinkElement.href = "../causality-builder/";
  nextStepElement.hidden = false;
}

function showSummary() {
  state.sessionActive = false;
  state.currentQuestion = null;
  const accuracy = Math.round((state.correctAnswers / state.totalQuestions) * 100);
  questionElement.textContent = "Session complete.";
  clearChoices();
  feedbackElement.textContent = "";
  answerMetaElement.textContent = "";
  nextButton.hidden = true;
  progressElement.textContent = `Completed ${state.totalQuestions} of ${state.totalQuestions}`;
  appHeader.update({ progress: `${state.totalQuestions}/${state.totalQuestions}` });
  sessionStatusElement.textContent = "Review your result, then retry or continue to the next learning step.";
  summaryElement.hidden = false;
  summaryElement.innerHTML = `
    <h2>Session complete</h2>
    <p><strong>Score:</strong> ${state.correctAnswers}/${state.totalQuestions}</p>
    <p><strong>Accuracy:</strong> ${accuracy}%</p>
    <p>${getFeedbackMessage(accuracy)}</p>
    <div class="summary-actions">
      <button type="button" class="summary-button" id="retry-session">Retry session</button>
    </div>
  `;
  showNextStep();

  const retryButton = document.getElementById("retry-session");
  if (retryButton) {
    retryButton.addEventListener("click", () => {
      startSession();
    });
  }
}

function renderQuestion() {
  const { pool: activePool, adaptiveActive, adaptiveMessage } = getScopedPool();
  const broaderPool = getRecognitionPool();
  updateEligibilityHint(activePool);
  updateAdaptiveIndicator(adaptiveMessage);

  if (activePool.length < 4) {
    state.sessionActive = false;
    state.currentQuestion = null;
    questionElement.textContent = "Not enough eligible events for a 4-option question in the current setup.";
    clearChoices();
    feedbackElement.textContent = "Adjust setup options to continue.";
    answerMetaElement.textContent = "";
    sessionStatusElement.textContent = "Change the setup to start a session.";
    summaryElement.hidden = true;
    nextButton.hidden = false;
    nextButton.disabled = true;
    return;
  }

  const { event: answer, fromReviewQueue } = pickAnswerEvent(activePool);
  const distractors = buildDistractors(answer, activePool, broaderPool).slice(0, 3);
  if (distractors.length < 3) {
    state.sessionActive = false;
    state.currentQuestion = null;
    questionElement.textContent = "Could not build enough distinct distractors.";
    clearChoices();
    feedbackElement.textContent = "Try All units or Include drafts.";
    answerMetaElement.textContent = "";
    sessionStatusElement.textContent = "Change the setup to start a session.";
    summaryElement.hidden = true;
    nextButton.hidden = false;
    nextButton.disabled = true;
    return;
  }

  const options = shuffle([answer, ...distractors]);
  const nextQuestion = { answer, options };
  state.currentQuestion = nextQuestion;
  if (state.session) {
    state.currentQuestion = state.session.nextQuestion() || nextQuestion;
  }
  questionElement.textContent = buildClue(answer);
  sessionStatusElement.textContent = adaptiveActive
    ? `Adaptive mode is active. Focus on weaker events while you finish all ${state.totalQuestions} questions.`
    : (fromReviewQueue
      ? `Review resurfacing active: this clue comes from a past mistake.`
      : `Answer the clue, then continue until you finish all ${state.totalQuestions} questions.`);
  summaryElement.hidden = true;
  hideNextStep();
  nextButton.hidden = false;
  resetRoundUi();
  updateProgress();
  clearChoices();

  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.dataset.eventId = option.id;
    button.textContent = option.label;
    button.addEventListener("click", () => handleChoice(button, option));
    choicesElement.appendChild(button);
  }
}

function handleChoice(choiceButton, option) {
  if (!state.currentQuestion || !state.sessionActive) return;

  disableChoices();
  nextButton.disabled = false;

  const { answer } = state.currentQuestion;
  const answerUnit = unitForEvent(answer);
  const result = state.session?.submitAnswer(option) || { isCorrect: option.id === answer.id };
  const isCorrect = Boolean(result.isCorrect);
  const feedbackMeta = state.session?.getFeedback() || {
    safeSummary: typeof answer?.summary_short === "string" ? answer.summary_short.trim() : "No summary available.",
    year: answer?.time?.year_start,
    unitTitle: answerUnit?.title || "Unassigned unit",
  };

  if (isCorrect) {
    state.correctAnswers += 1;
    choiceButton.classList.add("correct");
    showFeedback(feedbackElement, {
      correct: true,
      event: answer,
      year: feedbackMeta.year,
      unitTitle: feedbackMeta.unitTitle,
      summary: feedbackMeta.safeSummary,
    });
  } else {
    choiceButton.classList.add("incorrect");
    showFeedback(feedbackElement, {
      correct: false,
      event: option,
      correctAnswer: answer,
      year: feedbackMeta.year,
      unitTitle: feedbackMeta.unitTitle,
      summary: feedbackMeta.safeSummary,
    });
    const answerButton = choicesElement.querySelector(`[data-event-id="${CSS.escape(answer.id)}"]`);
    if (answerButton) answerButton.classList.add("correct");
  }

  recordResult(answer.id, isCorrect);
  state.recentAnswerIds.unshift(answer.id);
  state.recentAnswerIds = state.recentAnswerIds.filter((eventId, index, array) => array.indexOf(eventId) === index).slice(0, RECENT_ANSWER_LIMIT);

  answerMetaElement.textContent = `${answer.label} (${feedbackMeta.year}) · ${feedbackMeta.unitTitle}. ${feedbackMeta.safeSummary}`;
}

function refreshUnitVisibility() {
  unitSelect.disabled = practiceModeSelect.value !== "unit";
}

function populateUnitOptions() {
  unitSelect.innerHTML = "";
  for (const unit of state.units) {
    const option = document.createElement("option");
    option.value = unit.id;
    option.textContent = unit.title || unit.id;
    unitSelect.appendChild(option);
  }
  if (state.units.length === 0) {
    return;
  }

  const savedUnitId = localStorage.getItem(SELECTED_UNIT_KEY);
  const fallbackUnitId = state.units[0].id;
  const defaultUnitId = state.units.some((unit) => unit.id === savedUnitId) ? savedUnitId : fallbackUnitId;
  unitSelect.value = defaultUnitId;
  localStorage.setItem(SELECTED_UNIT_KEY, defaultUnitId);
}

function startSession() {
  state.totalQuestions = Number.parseInt(sessionLengthSelect.value, 10) || 10;
  state.currentQuestionIndex = 0;
  state.correctAnswers = 0;
  state.sessionActive = true;
  state.recentAnswerIds = [];
  state.session = createSession({
    getQuestion: () => state.currentQuestion,
    evaluate: (question, selectedOption) => ({
      isCorrect: Boolean(question && selectedOption && selectedOption.id === question.answer.id),
      answer: question?.answer || null,
    }),
    getFeedback: (question) => {
      const answer = question?.answer;
      const answerUnit = unitForEvent(answer);
      return {
        safeSummary: typeof answer?.summary_short === "string" ? answer.summary_short.trim() : "No summary available.",
        year: answer?.time?.year_start ?? "—",
        unitTitle: answerUnit?.title || "Unassigned unit",
      };
    },
  });
  summaryElement.hidden = true;
  hideNextStep();
  nextButton.hidden = false;
  renderQuestion();
}

function handleAdvance() {
  if (!state.sessionActive || !state.currentQuestion) return;

  state.currentQuestionIndex += 1;
  if (state.currentQuestionIndex >= state.totalQuestions) {
    showSummary();
    return;
  }

  renderQuestion();
}

function handleSetupChange() {
  refreshUnitVisibility();
  if (unitSelect.value) {
    localStorage.setItem(SELECTED_UNIT_KEY, unitSelect.value);
  }
  refreshHeader();
  startSession();
}

async function init() {
  try {
    const [events, units] = await Promise.all([loadDerivedEvents(), loadUnitsIndex()]);
    const safeEvents = (Array.isArray(events) ? events : []).filter(isValidEvent);
    const skippedCount = (Array.isArray(events) ? events.length : 0) - safeEvents.length;
    if (skippedCount > 0) {
      console.warn(`[Event Recognition] Skipping ${skippedCount} invalid event(s).`);
    }
    if (safeEvents.length === 0) {
      questionElement.textContent = "No valid events available.";
      feedbackElement.textContent = "No valid events available.";
      sessionStatusElement.textContent = "Please regenerate data or add complete records.";
      nextButton.disabled = true;
      return;
    }
    state.eventsById = new Map(safeEvents.map((event) => [event.id, event]));
    state.units = units;
    populateUnitOptions();
    refreshUnitVisibility();
    startSession();
  } catch (error) {
    questionElement.textContent = "Could not load event data.";
    feedbackElement.textContent = error.message;
    sessionStatusElement.textContent = "Unable to start a session.";
    progressElement.textContent = "Question unavailable";
  }
}

nextButton.addEventListener("click", handleAdvance);
practiceModeSelect.addEventListener("change", handleSetupChange);
unitSelect.addEventListener("change", handleSetupChange);
qualitySelect.addEventListener("change", handleSetupChange);
adaptiveModeElement.addEventListener("change", handleSetupChange);
sessionLengthSelect.addEventListener("change", startSession);

init();
refreshHeader();
