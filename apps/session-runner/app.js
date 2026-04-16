import { getEventsForUnit, getNextUnit, getUnits, setStoredUnitId } from "../shared/data-store.js";
import { getAllStats } from "../shared/mastery-store.js";

const modes = [
  { key: "timeline", name: "Timeline", app: "/apps/timeline-trainer/index.html" },
  { key: "sequence", name: "Sequence", app: "/apps/sequence-reconstruction/index.html" },
  { key: "causality", name: "Causality", app: "/apps/causal-chain/index.html" },
  { key: "comparison", name: "Comparison", app: "/apps/event-comparison/index.html" },
];

const QUESTIONS_PER_MODE = 5;

const appContainer = document.getElementById("app");
const progressEl = document.getElementById("progress");
const modeHelpEl = document.getElementById("mode-help");
const modeLabelEl = document.getElementById("mode-label");
const nextStepButton = document.getElementById("next-step");
const restartButton = document.getElementById("restart");

let modeIndex = 0;
let questionCount = 0;
let iframe = null;
let selectedUnitId = "";
let units = [];

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

function updateProgress() {
  if (modeIndex >= modes.length) {
    progressEl.textContent = `Session complete • ${modes.length}/${modes.length} modes finished`;
    updateModeLabel();
    return;
  }

  progressEl.textContent = `Mode ${modeIndex + 1}/${modes.length} • Question ${questionCount + 1}/${QUESTIONS_PER_MODE}`;
  updateModeLabel();
}

function buildIframeSrc(modePath) {
  const url = new URL(modePath, window.location.origin);
  if (selectedUnitId) {
    url.searchParams.set("unit", selectedUnitId);
  }
  return url.toString();
}

function scoreUnitWeakness(unit) {
  if (!unit || !Array.isArray(unit.event_ids) || unit.event_ids.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const mastery = getAllStats();
  const eventsInUnit = unit.event_ids.filter((eventId) => typeof eventId === "string" && eventId.length > 0);
  if (eventsInUnit.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const sorted = [...eventsInUnit].sort((left, right) => {
    const leftStats = mastery[left] || {};
    const rightStats = mastery[right] || {};
    const leftAttempts = (leftStats.correct || 0) + (leftStats.incorrect || 0);
    const rightAttempts = (rightStats.correct || 0) + (rightStats.incorrect || 0);
    const leftAccuracy = leftAttempts > 0 ? (leftStats.correct || 0) / leftAttempts : 0;
    const rightAccuracy = rightAttempts > 0 ? (rightStats.correct || 0) / rightAttempts : 0;
    if (leftAccuracy !== rightAccuracy) {
      return leftAccuracy - rightAccuracy;
    }
    return leftAttempts - rightAttempts;
  });

  const weakSliceSize = Math.max(1, Math.ceil(sorted.length * 0.4));
  const weakEventIds = sorted.slice(0, weakSliceSize);
  const recent = new Set();
  let weightedWeakness = 0;

  for (let index = 0; index < weakEventIds.length; index += 1) {
    const eventId = weakEventIds[index];
    const stats = mastery[eventId] || {};
    const attempts = (stats.correct || 0) + (stats.incorrect || 0);
    const accuracy = attempts > 0 ? (stats.correct || 0) / attempts : 0;
    const seenPenalty = recent.has(eventId) ? 0.15 : 0;
    weightedWeakness += (1 - accuracy) + seenPenalty;

    recent.add(eventId);
    if (recent.size > 5) {
      recent.clear();
    }
  }

  return weightedWeakness / weakEventIds.length;
}

async function pickBestStartingUnit(loadedUnits) {
  if (!Array.isArray(loadedUnits) || loadedUnits.length === 0) {
    return "";
  }

  const withEvents = await Promise.all(
    loadedUnits.map(async (unit) => {
      const events = await getEventsForUnit(unit.id).catch(() => []);
      return {
        ...unit,
        event_ids: Array.isArray(events) ? events.map((event) => event.id) : [],
      };
    })
  );

  const ranked = withEvents
    .map((unit) => ({ unit, score: scoreUnitWeakness(unit) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.unit?.id || loadedUnits[0].id;
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
  const nextUnit = getNextUnit(units, selectedUnitId);

  appContainer.innerHTML = "";
  const message = document.createElement("div");
  message.textContent = "Session complete. Great work — return home or restart this guided run.";
  appContainer.appendChild(message);

  if (nextUnit?.id) {
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
  selectedUnitId = known.has(urlUnit) ? urlUnit : (known.has(savedUnit) ? savedUnit : "");

  if (!selectedUnitId) {
    selectedUnitId = await pickBestStartingUnit(units);
  }

  if (selectedUnitId) {
    setStoredUnitId(selectedUnitId);
  }

  renderMode();
}

nextStepButton.addEventListener("click", next);
restartButton.addEventListener("click", restart);

init();
