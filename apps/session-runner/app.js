import { getEventsForUnit, getUnits, setStoredUnitId } from "../shared/data-store.js";
import { getReviewQueueEventIds } from "../shared/mastery-store.js";
import { getModeMeta, recommendNextStep } from "../shared/next-step-engine.js";

const MODE_LIBRARY = Object.freeze([
  { key: "timeline", name: "Timeline", app: "/apps/timeline-trainer/index.html", skill: "timeline" },
  { key: "sequence", name: "Sequence", app: "/apps/sequence-reconstruction/index.html", skill: "timeline" },
  { key: "causality-drill", name: "Causality Drill", app: "/apps/causality-drill/index.html", skill: "causality" },
  { key: "comparison", name: "Comparison", app: "/apps/event-comparison/index.html", skill: "comparison" },
  { key: "event-recognition", name: "Event Recognition", app: "/apps/event-recognition/index.html", skill: "recognition" },
  { key: "people-recognition", name: "People Recognition", app: "/apps/people-recognition/index.html", skill: "people" },
  { key: "map-quiz", name: "Map Quiz", app: "/apps/map-quiz/index.html", skill: "geography" },
]);

const DEFAULT_MODE_KEYS = ["timeline", "causality-drill", "event-recognition", "comparison"];
const MODE_BY_KEY = new Map(MODE_LIBRARY.map((mode) => [mode.key, mode]));

const QUESTIONS_PER_MODE = 5;
const COMPLETED_UNITS_KEY = "completed_units";

const appContainer = document.getElementById("app");
const progressEl = document.getElementById("progress");
const modeHelpEl = document.getElementById("mode-help");
const nextRecommendationEl = document.getElementById("next-recommendation");
const modeLabelEl = document.getElementById("mode-label");
const modeSelectorEl = document.getElementById("mode-selector");
const unitLabelEl = document.getElementById("unit-label");
const unitProgressTextEl = document.getElementById("unit-progress-text");
const progressTrackEl = document.getElementById("progress-track");
const progressFillEl = document.getElementById("progress-fill");
const nextStepButton = document.getElementById("next-step");
const restartButton = document.getElementById("restart");

let modeIndex = 0;
let sessionModes = DEFAULT_MODE_KEYS.map((key) => MODE_BY_KEY.get(key)).filter(Boolean);
const modeProgress = new Map();
let iframe = null;
let selectedUnitId = "";
let units = [];
let completedUnits = readCompletedUnits();

function resetModeProgress() {
  modeProgress.clear();
  for (const mode of sessionModes) {
    modeProgress.set(mode.key, 0);
  }
}

function composeBalancedSessionModes(events = []) {
  const skillCounts = new Map();
  const recognizedSkills = new Set(["timeline", "causality", "comparison", "geography", "people", "recognition"]);

  for (const event of Array.isArray(events) ? events : []) {
    const eventSkills = Array.isArray(event?.skills) && event.skills.length > 0
      ? event.skills
      : ["timeline"];
    for (const skill of eventSkills) {
      if (!recognizedSkills.has(skill)) continue;
      skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
    }
  }

  const prioritySkills = Array.from(skillCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([skill]) => skill);

  const selected = [];
  const selectedKeys = new Set();
  for (const skill of prioritySkills) {
    const match = MODE_LIBRARY.find((mode) => mode.skill === skill && !selectedKeys.has(mode.key));
    if (!match) continue;
    selected.push(match);
    selectedKeys.add(match.key);
    if (selected.length >= 4) break;
  }

  for (const fallbackKey of DEFAULT_MODE_KEYS) {
    if (selected.length >= 4) break;
    const fallback = MODE_BY_KEY.get(fallbackKey);
    if (!fallback || selectedKeys.has(fallback.key)) continue;
    selected.push(fallback);
    selectedKeys.add(fallback.key);
  }

  const selectedSkillCount = new Set(selected.map((mode) => mode.skill)).size;
  const uniqueSkillCount = new Set(prioritySkills).size;
  if (selectedSkillCount < 3 && uniqueSkillCount >= 3) {
    for (const mode of MODE_LIBRARY) {
      if (selected.length >= 4) break;
      if (selectedKeys.has(mode.key)) continue;
      selected.push(mode);
      selectedKeys.add(mode.key);
      if (new Set(selected.map((item) => item.skill)).size >= 3) break;
    }
  }

  const result = selected.length > 0 ? selected.slice(0, 4) : DEFAULT_MODE_KEYS.map((key) => MODE_BY_KEY.get(key)).filter(Boolean);
  const sampledSkills = result.map((mode) => mode.skill);
  console.log('[session-runner] Session skill distribution', {
    modeKeys: result.map((mode) => mode.key),
    skills: sampledSkills,
    distinctSkills: new Set(sampledSkills).size,
    availableSkills: prioritySkills,
  });
  return result;
}


function getCurrentMode() {
  return sessionModes[modeIndex];
}

function getCurrentQuestionCount() {
  const currentMode = getCurrentMode();
  if (!currentMode) return 0;
  return modeProgress.get(currentMode.key) || 0;
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
  return sessionModes.length * QUESTIONS_PER_MODE;
}

function getAnsweredQuestionCount() {
  return sessionModes.reduce((sum, mode) => sum + Math.min(modeProgress.get(mode.key) || 0, QUESTIONS_PER_MODE), 0);
}

function updateUnitProgressUi() {
  const total = getTotalQuestionsPerUnit();
  const answered = modeIndex >= sessionModes.length ? total : getAnsweredQuestionCount();
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


function updateModeRecommendation() {
  if (!nextRecommendationEl) return;
  const mode = getCurrentMode();
  if (!mode) {
    nextRecommendationEl.innerHTML = "";
    return;
  }

  const answered = modeProgress.get(mode.key) || 0;
  if (answered === 0) {
    nextRecommendationEl.innerHTML = "";
    return;
  }

  const completionRatio = Math.max(0, Math.min(1, answered / QUESTIONS_PER_MODE));
  const reviewQueueCount = getReviewQueueEventIds(50).length;
  const nextStep = recommendNextStep({
    currentMode: mode.key === "comparison" ? "recognition" : mode.key,
    accuracy: completionRatio,
    reviewQueueCount,
  });
  nextRecommendationEl.innerHTML = `Next recommended mode: <a href="${nextStep.href}">${nextStep.label}</a> · ${nextStep.reason}`;
}

function updateProgress() {
  if (modeIndex >= sessionModes.length) {
    progressEl.textContent = `Session complete • ${sessionModes.length}/${sessionModes.length} modes finished`;
    updateModeLabel();
    updateUnitProgressUi();
    updateUnitLabel();
    updateModeRecommendation();
    return;
  }

  const questionCount = getCurrentQuestionCount();
  progressEl.textContent = `Mode ${modeIndex + 1}/${sessionModes.length} • Question ${Math.min(questionCount + 1, QUESTIONS_PER_MODE)}/${QUESTIONS_PER_MODE}`;
  updateModeLabel();
  updateModeSelector();
  updateUnitProgressUi();
  updateUnitLabel();
  updateModeRecommendation();
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

  const canonical = getModeMeta(mode.key);
  modeHelpEl.textContent = `Mode: ${mode.name}. Complete ${QUESTIONS_PER_MODE} questions, then continue.` + (canonical ? ` (${canonical.label})` : "");
  nextStepButton.disabled = modeProgress.get(mode.key) >= QUESTIONS_PER_MODE;
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
  if (nextRecommendationEl) {
    const reviewQueueCount = getReviewQueueEventIds(50).length;
    const nextStep = recommendNextStep({ currentMode: "recognition", accuracy: 0.9, reviewQueueCount });
    nextRecommendationEl.innerHTML = `Recommended continuation: <a href="${nextStep.href}">${nextStep.label}</a> · ${nextStep.reason}`;
  }
  updateModeSelector();
  updateProgress();
}

function findNextIncompleteModeIndex(startIndex = modeIndex) {
  for (let offset = 1; offset <= sessionModes.length; offset += 1) {
    const index = (startIndex + offset) % sessionModes.length;
    const mode = sessionModes[index];
    if ((modeProgress.get(mode.key) || 0) < QUESTIONS_PER_MODE) {
      return index;
    }
  }
  return -1;
}

function next() {
  if (modeIndex >= sessionModes.length) {
    return;
  }

  const mode = getCurrentMode();
  if (!mode) {
    return;
  }
  const currentCount = modeProgress.get(mode.key) || 0;
  if (currentCount >= QUESTIONS_PER_MODE) {
    const nextIndex = findNextIncompleteModeIndex(modeIndex);
    if (nextIndex < 0) {
      modeIndex = sessionModes.length;
      showCompletion();
    } else {
      modeIndex = nextIndex;
      renderMode();
    }
    return;
  }

  modeProgress.set(mode.key, currentCount + 1);

  const totalAnswered = getAnsweredQuestionCount();
  if (totalAnswered >= getTotalQuestionsPerUnit()) {
    modeIndex = sessionModes.length;
    showCompletion();
    return;
  }

  if ((modeProgress.get(mode.key) || 0) >= QUESTIONS_PER_MODE) {
    const nextIndex = findNextIncompleteModeIndex(modeIndex);
    if (nextIndex >= 0) {
      modeIndex = nextIndex;
      renderMode();
      return;
    }
  }

  updateProgress();
}

function restart() {
  modeIndex = 0;
  resetModeProgress();
  renderMode();
}

function setMode(modeKey) {
  const index = sessionModes.findIndex((mode) => mode.key === modeKey);
  if (index < 0 || modeIndex >= sessionModes.length) return;
  modeIndex = index;
  renderMode();
}

function updateModeSelector() {
  if (!modeSelectorEl) return;
  const currentMode = getCurrentMode();
  modeSelectorEl.dataset.mode = currentMode?.key || "complete";

  const html = sessionModes.map((mode) => {
    const count = Math.min(modeProgress.get(mode.key) || 0, QUESTIONS_PER_MODE);
    const done = count >= QUESTIONS_PER_MODE ? "✓" : `${count}/${QUESTIONS_PER_MODE}`;
    const active = currentMode?.key === mode.key ? "mode-chip active" : "mode-chip";
    return `<button type="button" class="${active}" data-mode-key="${mode.key}">${mode.name} · ${done}</button>`;
  }).join("");

  modeSelectorEl.innerHTML = html;
  modeSelectorEl.querySelectorAll("[data-mode-key]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.getAttribute("data-mode-key") || ""));
  });
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

  const unitEvents = await getEventsForUnit(selectedUnitId).catch(() => []);
  sessionModes = composeBalancedSessionModes(unitEvents);
  resetModeProgress();

  updateUnitLabel();
  updateUnitProgressUi();
  updateModeSelector();
  renderMode();
}

nextStepButton.addEventListener("click", next);
restartButton.addEventListener("click", restart);

init();
