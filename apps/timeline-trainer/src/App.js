import { loadTimelineSeedData } from "./data/loaders.js";
import {
  explainQuestionAnswer,
  filterTimelineCandidateEvents,
  generateBeforeAfterQuestion,
  resolveUnitEvents,
} from "./logic/question-generator.js";

const RECENT_PAIR_WINDOW = 15;

const state = {
  unit: null,
  candidates: [],
  currentQuestion: null,
  totalAnswered: 0,
  correctAnswered: 0,
  hasAnswered: false,
  selectedOptionIndex: null,
  correctOptionIndex: null,
  recentPairKeys: [],
};

const ui = {
  unitTitle: document.getElementById("unit-title"),
  questionText: document.getElementById("question-text"),
  optionA: document.getElementById("option-a"),
  optionB: document.getElementById("option-b"),
  resultText: document.getElementById("result-text"),
  nextButton: document.getElementById("next-button"),
  statTotal: document.getElementById("stat-total"),
  statCorrect: document.getElementById("stat-correct"),
  errorPanel: document.getElementById("error-panel"),
  errorText: document.getElementById("error-text"),
  retryButton: document.getElementById("retry-button"),
};

function getOptionByIndex(optionIndex) {
  return optionIndex === 0 ? ui.optionA : ui.optionB;
}

function setAnswerButtonsEnabled(enabled) {
  ui.optionA.disabled = !enabled;
  ui.optionB.disabled = !enabled;
}

function clearAnswerButtonStates() {
  for (const button of [ui.optionA, ui.optionB]) {
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
}

function renderQuestion(question) {
  state.currentQuestion = question;
  state.hasAnswered = false;
  state.selectedOptionIndex = null;
  state.correctOptionIndex = null;
  clearError();

  ui.questionText.textContent = "Which event happened earlier?";
  ui.optionA.textContent = question.options[0].label;
  ui.optionB.textContent = question.options[1].label;
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

function generateAndRenderNextQuestion() {
  clearError();

  try {
    const question = generateBeforeAfterQuestion(state.candidates, {
      recentPairKeys: state.recentPairKeys,
    });
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
  recordRecentPair(state.currentQuestion.pairKey);
  state.totalAnswered += 1;

  if (isCorrect) {
    state.correctAnswered += 1;
  }

  updateStats();
  setAnswerButtonsEnabled(false);
  applyAnswerButtonStates();
  ui.nextButton.disabled = false;

  const explanation = explainQuestionAnswer(state.currentQuestion);
  setResultMessage(`${isCorrect ? "Correct" : "Incorrect"}. ${explanation}`, isCorrect ? "correct" : "incorrect");
}

function validateAndPrepareData(events, unit) {
  const { resolvedEvents, missingIds } = resolveUnitEvents(events, unit);
  if (missingIds.length > 0) {
    console.warn("[Timeline Trainer] Missing unit event ids:", missingIds);
    setError(`Some unit event IDs were not found in events.json: ${missingIds.join(", ")}`);
    return false;
  }

  const candidates = filterTimelineCandidateEvents(resolvedEvents);
  console.debug(
    `[Timeline Trainer] Candidate filter result: resolved=${resolvedEvents.length} candidates=${candidates.length}`
  );

  if (candidates.length < 2) {
    setError("Not enough valid timeline events available right now.");
    return false;
  }

  state.candidates = candidates;
  return true;
}

function bindEvents() {
  ui.optionA.addEventListener("click", () => {
    handleAnswer(0);
  });

  ui.optionB.addEventListener("click", () => {
    handleAnswer(1);
  });

  ui.nextButton.addEventListener("click", () => {
    generateAndRenderNextQuestion();
  });

  ui.retryButton.addEventListener("click", () => {
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
