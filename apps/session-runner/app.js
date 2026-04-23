import { getUnits, setStoredUnitId } from "../shared/data-store.js";

const modes = [
  { key: "timeline", name: "Timeline", app: "/apps/timeline-trainer/index.html" },
  { key: "sequence", name: "Sequence", app: "/apps/sequence-reconstruction/index.html" },
  { key: "causality", name: "Causality", app: "/apps/causal-chain/index.html" },
  { key: "causality-drill", name: "Causality Drill", app: "/apps/causality-drill/index.html" },
  { key: "comparison", name: "Comparison", app: "/apps/event-comparison/index.html" },
];

const QUESTIONS_PER_MODE = 5;
const COMPLETED_UNITS_KEY = "completed_units";

const appContainer = document.getElementById("app");
const progressEl = document.getElementById("progress");
const modeHelpEl = document.getElementById("mode-help");
const modeLabelEl = document.getElementById("mode-label");
const unitLabelEl = document.getElementById("unit-label");
const unitProgressTextEl = document.getElementById("unit-progress-text");
const progressTrackEl = document.getElementById("progress-track");
const progressFillEl = document.getElementById("progress-fill");
const nextStepButton = document.getElementById("next-step");
const restartButton = document.getElementById("restart");

let modeIndex = 0;
let questionCount = 0;
let iframe = null;
let selectedUnitId = "";
let units = [];
let completedUnits = readCompletedUnits();

function getCurrentMode() {
  return modes[modeIndex];
}

function updateModeLabel() {
  const mode = getCurrentMode();
  if (!modeLabelEl) return;

  if (!mode) {
    modeLabelEl.textContent = "Mode: Complete";
    return;
  }

  modeLabelEl.textContent = `Mode: ${mode.name}`;
}

function readCompletedUnits() {
  try {
    const parsed = JSON.parse(localStorage.getItem(COMPLETED_UNITS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string" && id.trim() !== "") : [];
  } catch {
    return [];
  }
}

function saveCompletedUnits() {
  localStorage.setItem(COMPLETED_UNITS_KEY, JSON.stringify(completedUnits));
}

function getSelectedUnit() {
  return units.find((unit) => unit.id === selectedUnitId) || null;
}

function getTotalQuestionsPerUnit() {
  return modes.length * QUESTIONS_PER_MODE;
}

function getAnsweredQuestionCount() {
  const completedModes = Math.min(modeIndex, modes.length);
  const answeredInCurrentMode = modeIndex < modes.length ? Math.min(questionCount, QUESTIONS_PER_MODE) : 0;
  return (completedModes * QUESTIONS_PER_MODE) + answeredInCurrentMode;
}

function updateUnitProgressUi() {
  const total = getTotalQuestionsPerUnit();
  const answered = modeIndex >= modes.length ? total : getAnsweredQuestionCount();
  const progressRatio = total > 0 ? Math.max(0, Math.min(1, answered / total)) : 0;
  const progressPercent = Math.round(progressRatio * 100);

  if (progressFillEl) {
    progressFillEl.style.width = `${progressPercent}%`;
  }
  if (progressTrackEl) {
    progressTrackEl.setAttribute("aria-valuenow", String(progressPercent));
  }
  if (unitProgressTextEl) {
    unitProgressTextEl.textContent = `Progress: ${progressPercent}% (${answered}/${total} questions)`;
  }
}

function updateUnitLabel() {
  if (!unitLabelEl) return;
  const selectedUnit = getSelectedUnit();
  if (!selectedUnit) {
    unitLabelEl.textContent = "Unit: Not selected";
    return;
  }

  const status = completedUnits.includes(selectedUnit.id) ? "completed" : "in progress";
  unitLabelEl.textContent = `Unit: ${selectedUnit.label || selectedUnit.id} (${status})`;
}

function updateProgress() {
  if (modeIndex >= modes.length) {
    progressEl.textContent = `Session complete • ${modes.length}/${modes.length} modes finished`;
    updateModeLabel();
    updateUnitProgressUi();
    updateUnitLabel();
    return;
  }

  progressEl.textContent = `Mode ${modeIndex + 1}/${modes.length} • Question ${questionCount + 1}/${QUESTIONS_PER_MODE}`;
  updateModeLabel();
  updateUnitProgressUi();
  updateUnitLabel();
}

function buildIframeSrc(modePath) {
  const url = new URL(modePath, window.location.origin);
  if (selectedUnitId) {
    url.searchParams.set("unit", selectedUnitId);
  }
  return url.toString();
}

function isUnitAvailable(unitId, loadedUnits = units) {
  const unit = loadedUnits.find((candidate) => candidate.id === unitId);
  if (!unit) return false;
  const prerequisites = Array.isArray(unit.prerequisites) ? unit.prerequisites : [];
  if (prerequisites.length === 0) {
    return true;
  }
  return prerequisites.every((id) => completedUnits.includes(id));
}

function sortUnitsByCurriculum(left, right) {
  const leftDifficulty = Number.isFinite(left?.difficulty) ? left.difficulty : Number.MAX_SAFE_INTEGER;
  const rightDifficulty = Number.isFinite(right?.difficulty) ? right.difficulty : Number.MAX_SAFE_INTEGER;
  if (leftDifficulty !== rightDifficulty) {
    return leftDifficulty - rightDifficulty;
  }

  const leftOrder = Number.isFinite(left?.order) ? left.order : Number.MAX_SAFE_INTEGER;
  const rightOrder = Number.isFinite(right?.order) ? right.order : Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return (left?.id || "").localeCompare(right?.id || "");
}

function getAvailableUnits(loadedUnits = units) {
  return (Array.isArray(loadedUnits) ? loadedUnits : [])
    .filter((unit) => isUnitAvailable(unit.id, loadedUnits))
    .sort(sortUnitsByCurriculum);
}

function completeCurrentUnit() {
  if (!selectedUnitId || completedUnits.includes(selectedUnitId)) {
    return;
  }

  completedUnits = [...completedUnits, selectedUnitId];
  saveCompletedUnits();
}

function getNextRecommendedUnitId() {
  const available = getAvailableUnits(units);
  const incompleteAvailable = available.filter((unit) => !completedUnits.includes(unit.id));
  if (incompleteAvailable.length > 0) {
    return incompleteAvailable[0].id;
  }
  return available[0]?.id || "";
}

function renderMode() {
  const mode = getCurrentMode();
  if (!mode) {
    showCompletion();
    return;
  }

  appContainer.innerHTML = "";
  iframe = document.createElement("iframe");
  iframe.title = `Guided mode: ${mode.name}`;
  iframe.src = buildIframeSrc(mode.app);
  appContainer.appendChild(iframe);

  modeHelpEl.textContent = `Mode: ${mode.name}. Complete ${QUESTIONS_PER_MODE} questions, then continue.`;
  nextStepButton.disabled = false;
  updateProgress();
}

function showCompletion() {
  completeCurrentUnit();
  const nextUnitId = getNextRecommendedUnitId();
  const nextUnit = units.find((unit) => unit.id === nextUnitId) || null;

  appContainer.innerHTML = "";
  const message = document.createElement("div");
  message.textContent = "Session complete. Great work — return home or restart this guided run.";
  appContainer.appendChild(message);

  if (nextUnit?.id && nextUnit.id !== selectedUnitId) {
    const wrap = document.createElement("div");
    wrap.style.marginTop = "0.9rem";
    wrap.innerHTML = `
      <p>Recommended next unit: <strong>${nextUnit.label || nextUnit.id}</strong></p>
      <button id="next-unit" type="button">Start next unit</button>
    `;
    appContainer.appendChild(wrap);

    const nextUnitButton = wrap.querySelector("#next-unit");
    nextUnitButton?.addEventListener("click", () => {
      selectedUnitId = nextUnit.id;
      setStoredUnitId(selectedUnitId);
      restart();
    });

    modeHelpEl.textContent = "You finished all guided modes. Continue to the next unit when ready.";
  } else {
    modeHelpEl.textContent = "You finished all guided modes and reached the end of the current unit sequence.";
  }

  nextStepButton.disabled = true;
  updateProgress();
}

function advanceMode() {
  modeIndex += 1;
  questionCount = 0;
}

function next() {
  if (modeIndex >= modes.length) {
    return;
  }

  questionCount += 1;

  if (questionCount >= QUESTIONS_PER_MODE) {
    advanceMode();
    if (modeIndex < modes.length) {
      renderMode();
      return;
    }

    showCompletion();
    return;
  }

  updateProgress();
}

function restart() {
  modeIndex = 0;
  questionCount = 0;
  renderMode();
}

async function init() {
  const urlUnit = new URLSearchParams(window.location.search).get("unit") || "";
  const savedUnit = localStorage.getItem("selected_unit") || "";
  units = await getUnits().catch(() => []);
  const known = new Set((Array.isArray(units) ? units : []).map((unit) => unit.id));
  const canUseUrlUnit = known.has(urlUnit) && isUnitAvailable(urlUnit, units);
  const canUseSavedUnit = known.has(savedUnit) && isUnitAvailable(savedUnit, units);
  selectedUnitId = canUseUrlUnit ? urlUnit : (canUseSavedUnit ? savedUnit : "");

  if (!selectedUnitId) {
    selectedUnitId = getNextRecommendedUnitId();
  }

  if (!selectedUnitId && Array.isArray(units) && units.length > 0) {
    selectedUnitId = [...units].sort(sortUnitsByCurriculum)[0].id;
  }

  if (selectedUnitId) {
    setStoredUnitId(selectedUnitId);
  }

  updateUnitLabel();
  updateUnitProgressUi();
  renderMode();
}

nextStepButton.addEventListener("click", next);
restartButton.addEventListener("click", restart);

init();
