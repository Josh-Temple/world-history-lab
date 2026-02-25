import { loadTimelineSeedData } from "./data/loaders.js";
import {
  explainQuestionAnswer,
  filterTimelineCandidateEvents,
  generateBeforeAfterQuestion,
  resolveUnitEvents,
} from "./logic/question-generator.js";

const state = {
  unit: null,
  candidates: [],
  currentQuestion: null,
  totalAnswered: 0,
  correctAnswered: 0,
  hasAnsweredCurrent: false,
  previousPairKey: null,
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
};

function setAnswerButtonsEnabled(enabled) {
  ui.optionA.disabled = !enabled;
  ui.optionB.disabled = !enabled;
}

function clearAnswerButtonStates() {
  ui.optionA.classList.remove("selected", "correct", "incorrect");
  ui.optionB.classList.remove("selected", "correct", "incorrect");
}

function applyAnswerButtonStates(selectedId, correctId) {
  clearAnswerButtonStates();

  const selectedButton = selectedId === state.currentQuestion?.left.id ? ui.optionA : ui.optionB;
  const correctButton = correctId === state.currentQuestion?.left.id ? ui.optionA : ui.optionB;

  selectedButton.classList.add("selected");
  if (selectedButton === correctButton) {
    selectedButton.classList.add("correct");
    return;
  }

  selectedButton.classList.add("incorrect");
  correctButton.classList.add("correct");
}

function setResultMessage(message, resultType = "neutral") {
  ui.resultText.textContent = message;
  ui.resultText.classList.toggle("correct", resultType === "correct");
  ui.resultText.classList.toggle("incorrect", resultType === "incorrect");
}

function setError(message, { allowRetry = false } = {}) {
  ui.errorText.textContent = message;
  ui.errorPanel.hidden = false;
  setAnswerButtonsEnabled(false);
  ui.nextButton.disabled = !allowRetry;
  console.error("[Timeline Trainer]", message);
}

function clearError() {
  ui.errorText.textContent = "";
  ui.errorPanel.hidden = true;
}

function updateStats() {
  ui.statTotal.textContent = String(state.totalAnswered);
  ui.statCorrect.textContent = String(state.correctAnswered);
}

function renderQuestion(question) {
  state.currentQuestion = question;
  state.hasAnsweredCurrent = false;
  clearError();

  ui.questionText.textContent = "Which event happened earlier?";
  ui.optionA.textContent = question.left.label;
  ui.optionB.textContent = question.right.label;
  clearAnswerButtonStates();
  setAnswerButtonsEnabled(true);
  ui.nextButton.disabled = true;
  setResultMessage("Choose one option.");
}

function generateAndRenderNextQuestion() {
  clearError();

  try {
    const question = generateBeforeAfterQuestion(state.candidates, state.previousPairKey);
    renderQuestion(question);
  } catch (error) {
    state.currentQuestion = null;
    setError(error.message, { allowRetry: true });
    setResultMessage("Could not load the next question. Use Next question to retry.", "incorrect");
  }
}

function handleAnswer(selectedId) {
  if (!state.currentQuestion || state.hasAnsweredCurrent) {
    return;
  }

  const isCorrect = selectedId === state.currentQuestion.correctId;
  state.hasAnsweredCurrent = true;
  state.previousPairKey = state.currentQuestion.pairKey;
  state.totalAnswered += 1;
  if (isCorrect) {
    state.correctAnswered += 1;
  }
  updateStats();

  setAnswerButtonsEnabled(false);
  applyAnswerButtonStates(selectedId, state.currentQuestion.correctId);
  ui.nextButton.disabled = false;

  const explanation = explainQuestionAnswer(state.currentQuestion);
  setResultMessage(
    `${isCorrect ? "✅ Correct" : "❌ Incorrect"}. ${explanation}`,
    isCorrect ? "correct" : "incorrect"
  );
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
    setError("No valid timeline events available for before/after questions.");
    return false;
  }

  state.candidates = candidates;
  return true;
}

function bindEvents() {
  ui.optionA.addEventListener("click", () => {
    if (!state.currentQuestion) return;
    handleAnswer(state.currentQuestion.left.id);
  });

  ui.optionB.addEventListener("click", () => {
    if (!state.currentQuestion) return;
    handleAnswer(state.currentQuestion.right.id);
  });

  ui.nextButton.addEventListener("click", () => {
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
    setError(error.message);
  }
}
