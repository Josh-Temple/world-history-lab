import { filterDerivedEvents, loadDerivedEvents, loadUnitsIndex } from "../shared/data-access.js";
import { isRecognitionReady } from "../shared/event-filters.js";
import { getAllStats, recordResult } from "../shared/mastery-store.js";

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

const state = {
  eventsById: new Map(),
  units: [],
  currentQuestion: null,
  currentQuestionIndex: 0,
  totalQuestions: 10,
  correctAnswers: 0,
  sessionActive: false,
  recentAnswerIds: [],
};

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


const ADAPTIVE_POOL_SIZE = 10;
const RECENT_ANSWER_LIMIT = 3;

function getAttemptCount(stats) {
  return stats.correct + stats.incorrect;
}

function getAccuracy(stats) {
  const attempts = getAttemptCount(stats);
  if (attempts === 0) return null;
  return stats.correct / attempts;
}

function rankByWeakness(events) {
  const stats = getAllStats();

  return [...events].sort((left, right) => {
    const leftStats = stats[left.id] || { correct: 0, incorrect: 0, last_seen: null };
    const rightStats = stats[right.id] || { correct: 0, incorrect: 0, last_seen: null };
    const leftAttempts = getAttemptCount(leftStats);
    const rightAttempts = getAttemptCount(rightStats);

    if (leftAttempts === 0 && rightAttempts > 0) return 1;
    if (rightAttempts === 0 && leftAttempts > 0) return -1;

    const leftAccuracy = getAccuracy(leftStats) ?? 1;
    const rightAccuracy = getAccuracy(rightStats) ?? 1;
    if (leftAccuracy !== rightAccuracy) return leftAccuracy - rightAccuracy;

    if (leftAttempts !== rightAttempts) return rightAttempts - leftAttempts;

    const leftSeen = leftStats.last_seen ?? 0;
    const rightSeen = rightStats.last_seen ?? 0;
    if (leftSeen !== rightSeen) return leftSeen - rightSeen;

    return left.label.localeCompare(right.label);
  });
}

function getAdaptivePool(events) {
  const stats = getAllStats();
  const attemptedEvents = events.filter((event) => getAttemptCount(stats[event.id] || { correct: 0, incorrect: 0 }) > 0);

  if (attemptedEvents.length < 4) {
    return {
      pool: events,
      active: false,
      reason: 'Not enough mastery history yet. Using normal random practice.',
    };
  }

  const ranked = rankByWeakness(attemptedEvents);
  const weakestIds = new Set(ranked.slice(0, Math.min(ADAPTIVE_POOL_SIZE, ranked.length)).map((event) => event.id));
  const recentAnswerIds = new Set(state.recentAnswerIds);
  const preferred = events.filter((event) => weakestIds.has(event.id) && !recentAnswerIds.has(event.id));
  const fallbackWeak = events.filter((event) => weakestIds.has(event.id));
  const finalPool = preferred.length >= 4 ? preferred : fallbackWeak;

  return {
    pool: finalPool.length >= 4 ? finalPool : events,
    active: finalPool.length >= 4,
    reason: finalPool.length >= 4 ? 'Adaptive mode: focusing on weak events.' : 'Adaptive mode requested, but too few weak-event candidates were available. Using the full pool.',
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
function buildClue(event) { return `"${event.summary_short.trim()}"`; }
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

function getFeedbackMessage(accuracy) {
  if (accuracy >= 85) return "Strong recognition. You are ready to move into causality practice.";
  if (accuracy >= 60) return "Good progress. Another short recognition session should make recall feel faster.";
  return "Keep building the basics. A return to Timeline Trainer may help before another recognition session.";
}

function updateProgress() {
  progressElement.textContent = `Question ${Math.min(state.currentQuestionIndex + 1, state.totalQuestions)} of ${state.totalQuestions}`;
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

  const answer = activePool[randomInt(activePool.length)];
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
  state.currentQuestion = { answer, options };
  questionElement.textContent = buildClue(answer);
  sessionStatusElement.textContent = adaptiveActive
    ? `Adaptive mode is active. Focus on weaker events while you finish all ${state.totalQuestions} questions.`
    : `Answer the clue, then continue until you finish all ${state.totalQuestions} questions.`;
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
  const isCorrect = option.id === answer.id;

  if (isCorrect) {
    state.correctAnswers += 1;
    choiceButton.classList.add("correct");
    feedbackElement.textContent = "Correct.";
  } else {
    choiceButton.classList.add("incorrect");
    feedbackElement.textContent = `Incorrect. Correct answer: ${answer.label}.`;
    const answerButton = choicesElement.querySelector(`[data-event-id="${CSS.escape(answer.id)}"]`);
    if (answerButton) answerButton.classList.add("correct");
  }

  recordResult(answer.id, isCorrect);
  state.recentAnswerIds.unshift(answer.id);
  state.recentAnswerIds = state.recentAnswerIds.filter((eventId, index, array) => array.indexOf(eventId) === index).slice(0, RECENT_ANSWER_LIMIT);

  answerMetaElement.textContent = `${answer.label} (${answer.time.year_start}) · ${answerUnit?.title || "Unassigned unit"}. ${answer.summary_short.trim()}`;
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
  if (state.units.some((unit) => unit.id === "unit_french_revolution_napoleon")) {
    unitSelect.value = "unit_french_revolution_napoleon";
  }
}

function startSession() {
  state.totalQuestions = Number.parseInt(sessionLengthSelect.value, 10) || 10;
  state.currentQuestionIndex = 0;
  state.correctAnswers = 0;
  state.sessionActive = true;
  state.recentAnswerIds = [];
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
  startSession();
}

async function init() {
  try {
    const [events, units] = await Promise.all([loadDerivedEvents(), loadUnitsIndex()]);
    state.eventsById = new Map(events.map((event) => [event.id, event]));
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
