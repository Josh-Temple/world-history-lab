import { getUnits } from "../shared/data-store.js";

const modes = [
  { name: "Timeline", app: "/apps/timeline-trainer/index.html" },
  { name: "Sequence", app: "/apps/sequence-reconstruction/index.html" },
  { name: "Causality", app: "/apps/causality-builder/index.html" },
  { name: "Recognition", app: "/apps/event-recognition/index.html" },
];

const STEPS_PER_MODE = 3;

const appContainer = document.getElementById("app");
const progressEl = document.getElementById("progress");
const modeHelpEl = document.getElementById("mode-help");
const nextStepButton = document.getElementById("next-step");
const restartButton = document.getElementById("restart");

let currentMode = 0;
let step = 0;
let iframe = null;
let selectedUnitId = "";

function updateProgress() {
  const stepLabel = `${Math.min(step + 1, STEPS_PER_MODE)}/${STEPS_PER_MODE}`;
  if (currentMode >= modes.length) {
    progressEl.textContent = `Session complete • ${modes.length}/${modes.length} modes finished`;
    return;
  }

  progressEl.textContent = `Mode ${currentMode + 1}/${modes.length}: ${modes[currentMode].name} • Step ${stepLabel}`;
}

function buildIframeSrc(modePath) {
  const url = new URL(modePath, window.location.origin);
  if (selectedUnitId) {
    url.searchParams.set("unit", selectedUnitId);
  }
  return url.toString();
}

function renderMode() {
  appContainer.innerHTML = "";
  iframe = document.createElement("iframe");
  iframe.title = `Guided mode: ${modes[currentMode].name}`;
  iframe.src = buildIframeSrc(modes[currentMode].app);
  appContainer.appendChild(iframe);
  modeHelpEl.textContent = `Mode: ${modes[currentMode].name}. Complete ${STEPS_PER_MODE} short items, then continue.`;
  nextStepButton.disabled = false;
  updateProgress();
}

function showCompletion() {
  appContainer.innerHTML = "Session complete. Great work — return home or restart this guided run.";
  modeHelpEl.textContent = "You finished all guided modes.";
  nextStepButton.disabled = true;
  updateProgress();
}

function next() {
  if (currentMode >= modes.length) return;

  step += 1;
  if (step >= STEPS_PER_MODE) {
    currentMode += 1;
    step = 0;
  }

  if (currentMode < modes.length) {
    renderMode();
  } else {
    showCompletion();
  }
}

function restart() {
  currentMode = 0;
  step = 0;
  renderMode();
}

async function init() {
  const urlUnit = new URLSearchParams(window.location.search).get("unit") || "";
  const savedUnit = localStorage.getItem("selected_unit") || "";
  const units = await getUnits().catch(() => []);
  const known = new Set((Array.isArray(units) ? units : []).map((unit) => unit.id));
  selectedUnitId = known.has(urlUnit) ? urlUnit : (known.has(savedUnit) ? savedUnit : "");

  if (selectedUnitId) {
    localStorage.setItem("selected_unit", selectedUnitId);
  }

  renderMode();
}

nextStepButton.addEventListener("click", next);
restartButton.addEventListener("click", restart);

init();
