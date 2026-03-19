const REVIEWED_PLUS = new Set(["reviewed", "approved"]);

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
const summaryElement = document.getElementById("summary");

const state = {
  eventsById: new Map(),
  units: [],
  currentQuestion: null,
  currentQuestionIndex: 0,
  totalQuestions: 10,
  correctAnswers: 0,
  sessionActive: false,
};

function randomInt(max) { return Math.floor(Math.random() * max); }
function appUrl(relativePath) { return new URL(relativePath, window.location.href).toString(); }
function shuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isRecognitionEligible(event) {
  if (!event || !Number.isFinite(event?.time?.year_start)) return false;
  if (typeof event.summary_short !== "string" || !event.summary_short.trim()) return false;
  const types = new Set(event.question_types || []);
  return types.has("what_happened") || types.has("significance") || types.has("cause_and_effect");
}

function statusAllows(event) {
  return qualitySelect.value === "draft" || REVIEWED_PLUS.has(event.status);
}

async function fetchJson(path, label) {
  const response = await fetch(appUrl(path), { cache: "no-store" });
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
  return response.json();
}

async function loadData() {
  const [events, unitIndex] = await Promise.all([
    fetchJson("../../data/events.json", "events"),
    fetchJson("../../data/units/index.json", "unit index"),
  ]);

  const units = await Promise.all(
    (unitIndex.units || []).map((entry) => fetchJson(`../../${entry.path.replace(/^\.?\/?/, "")}`, entry.id || "unit"))
  );

  return { events, units };
}

function clearChoices() { choicesElement.innerHTML = ""; }
function disableChoices() { choicesElement.querySelectorAll("button").forEach((button) => { button.disabled = true; }); }

function buildClue(event) {
  return `"${event.summary_short.trim()}"`;
}

function unitForEvent(eventId) {
  const unit = state.units.find((candidate) => (candidate.event_ids || []).includes(eventId));
  return unit || null;
}

function getRecognitionPool() {
  return [...state.eventsById.values()].filter((event) => isRecognitionEligible(event) && statusAllows(event));
}

function getScopedPool() {
  const recognized = getRecognitionPool();

  if (practiceModeSelect.value === "all") return recognized;

  const activeUnit = state.units.find((unit) => unit.id === unitSelect.value);
  const unitIds = new Set(activeUnit?.event_ids || []);
  return recognized.filter((event) => unitIds.has(event.id));
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
      <a class="summary-link" href="../causality-builder/">Next step: Causality Builder</a>
    </div>
  `;

  const retryButton = document.getElementById("retry-session");
  if (retryButton) {
    retryButton.addEventListener("click", () => {
      startSession();
    });
  }
}

function renderQuestion() {
  const activePool = getScopedPool();
  const broaderPool = getRecognitionPool();
  updateEligibilityHint(activePool);

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
  sessionStatusElement.textContent = `Answer the clue, then continue until you finish all ${state.totalQuestions} questions.`;
  summaryElement.hidden = true;
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
  const answerUnit = unitForEvent(answer.id);
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
  summaryElement.hidden = true;
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
    const { events, units } = await loadData();
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
sessionLengthSelect.addEventListener("change", startSession);

init();
