import { loadDerivedEvents } from "../shared/data-access.js";
import { getEventsForUnit, getNextUnit, getUnits } from "../shared/data-store.js";
import { recordResult } from "../shared/mastery-store.js";
import { mountHeader } from "../shared/header.js";

const chainContainer = document.getElementById("chain-container");
const submitButton = document.getElementById("submit");
const nextButton = document.getElementById("next");
const feedback = document.getElementById("feedback");
const prompt = document.getElementById("prompt");
const unitSelect = document.getElementById("unit-select");
const unitHint = document.getElementById("unit-hint");
const nextUnitHint = document.getElementById("next-unit-hint");
const SELECTED_UNIT_KEY = "selected_unit";

const state = {
  allChains: [],
  chains: [],
  chain: [],
  eventMap: new Map(),
  units: [],
};

const appHeader = mountHeader({
  container: document.querySelector("main") || document.body,
  mode: "Causal Chain",
  progress: "Ready",
});

function refreshHeader() {
  appHeader.update({
    unit: unitSelect.selectedOptions[0]?.textContent || "All units",
    progress: state.chain.length > 0 ? `${state.chain.length} steps` : "No chain",
  });
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isValidEvent(event) {
  return Boolean(event && typeof event.id === "string" && typeof event.label === "string" && Number.isFinite(event?.time?.year_start));
}

function isValidChain(chain) {
  return Array.isArray(chain)
    && chain.length >= 3
    && chain.length <= 5
    && chain.every((id) => typeof id === "string" && state.eventMap.has(id));
}

function getEventLabel(eventId) {
  const event = state.eventMap.get(eventId);
  if (!event) return eventId;
  return `${event.label} (${event.time.year_start})`;
}

function isCorrectOrder(userOrder, correctOrder) {
  return userOrder.every((id, i) => id === correctOrder[i]);
}

function setFeedback(message, kind = "") {
  feedback.textContent = message;
  feedback.className = `feedback ${kind}`.trim();
}

function populateUnitOptions() {
  unitSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All units";
  unitSelect.append(allOption);

  for (const unit of state.units) {
    const option = document.createElement("option");
    option.value = unit.id;
    option.textContent = unit.era ? `${unit.label} (${unit.era})` : unit.label;
    unitSelect.append(option);
  }

  const saved = localStorage.getItem(SELECTED_UNIT_KEY) || "";
  const known = state.units.some((unit) => unit.id === saved);
  unitSelect.value = known ? saved : "";
}

function updateProgressionHint() {
  const selectedUnitId = unitSelect.value;
  const next = getNextUnit(state.units, selectedUnitId);

  if (!selectedUnitId) {
    unitHint.textContent = "Using all units.";
    nextUnitHint.textContent = state.units[0] ? `Suggested start: ${state.units[0].label}.` : "";
    return;
  }

  const selected = state.units.find((unit) => unit.id === selectedUnitId);
  unitHint.textContent = `Focused on ${selected?.label || selectedUnitId}.`;
  nextUnitHint.textContent = next ? `Next unit: ${next.label}.` : "You are on the last unit in the current sequence.";
}

function createItem(eventId) {
  const li = document.createElement("li");
  li.className = "chain-item";
  li.dataset.id = eventId;
  li.draggable = true;
  li.textContent = getEventLabel(eventId);

  li.addEventListener("dragstart", () => li.classList.add("dragging"));
  li.addEventListener("dragend", () => {
    li.classList.remove("dragging");
    li.classList.remove("drag-over");
  });
  li.addEventListener("dragover", (event) => {
    event.preventDefault();
    li.classList.add("drag-over");
  });
  li.addEventListener("dragleave", () => li.classList.remove("drag-over"));
  li.addEventListener("drop", (event) => {
    event.preventDefault();
    li.classList.remove("drag-over");
    const dragging = chainContainer.querySelector(".dragging");
    if (!dragging || dragging === li) return;

    const items = [...chainContainer.children];
    const draggingIndex = items.indexOf(dragging);
    const targetIndex = items.indexOf(li);
    if (draggingIndex < 0 || targetIndex < 0) return;

    if (draggingIndex < targetIndex) {
      li.after(dragging);
    } else {
      li.before(dragging);
    }
  });

  return li;
}

function renderChain(chain) {
  chainContainer.innerHTML = "";
  for (const id of chain) {
    chainContainer.append(createItem(id));
  }
}

function chooseChain() {
  return state.chains[Math.floor(Math.random() * state.chains.length)];
}

function newRound() {
  if (state.chains.length === 0) {
    state.chain = [];
    chainContainer.innerHTML = "";
    prompt.textContent = "No chains available for this unit. Try another unit or switch to All units.";
    setFeedback("No chains available.", "incorrect");
    submitButton.disabled = true;
    nextButton.disabled = true;
    refreshHeader();
    return;
  }

  state.chain = chooseChain();
  renderChain(shuffle(state.chain));
  prompt.textContent = "Drag to reorder events into the correct causal sequence, then submit.";
  setFeedback("Ready. Submit when you finish ordering.");
  submitButton.disabled = false;
  nextButton.disabled = false;
  refreshHeader();
}

function submit() {
  if (state.chain.length === 0) return;

  const userOrder = [...chainContainer.children].map((item) => item.dataset.id);
  const correct = isCorrectOrder(userOrder, state.chain);
  const correctLabels = state.chain.map(getEventLabel);

  if (correct) {
    setFeedback("Correct chain.", "correct");
  } else {
    setFeedback(`Incorrect. Correct order: ${correctLabels.join(" → ")}`, "incorrect");
  }

  state.chain.forEach((eventId) => recordResult(eventId, correct));
}

async function applyUnitSelection() {
  const selectedUnitId = unitSelect.value;

  if (!selectedUnitId) {
    state.chains = state.allChains.slice();
  } else {
    const scopedEvents = await getEventsForUnit(selectedUnitId);
    const scopedIds = new Set((Array.isArray(scopedEvents) ? scopedEvents : []).map((event) => event.id));
    state.chains = state.allChains.filter((chain) => chain.every((eventId) => scopedIds.has(eventId)));
  }

  updateProgressionHint();
  newRound();
}

async function init() {
  try {
    const [events, chainsRaw, units] = await Promise.all([
      loadDerivedEvents(),
      fetch("/data/derived/causal_chains.json", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error(`causal_chains: HTTP ${response.status}`);
        return response.json();
      }),
      getUnits(),
    ]);

    const eventList = (Array.isArray(events) ? events : []).filter(isValidEvent);
    state.eventMap = new Map(eventList.map((event) => [event.id, event]));
    state.units = Array.isArray(units) ? units : [];
    state.allChains = (Array.isArray(chainsRaw) ? chainsRaw : []).filter(isValidChain);

    populateUnitOptions();
    localStorage.setItem(SELECTED_UNIT_KEY, unitSelect.value);
    await applyUnitSelection();
  } catch (error) {
    console.error("[causal-chain] load failed", error);
    chainContainer.innerHTML = "";
    prompt.textContent = "Could not load causal chains.";
    setFeedback("Loading failed.", "incorrect");
    submitButton.disabled = true;
    nextButton.disabled = true;
  }
}

submitButton.addEventListener("click", submit);
nextButton.addEventListener("click", newRound);
unitSelect.addEventListener("change", async () => {
  localStorage.setItem(SELECTED_UNIT_KEY, unitSelect.value);
  await applyUnitSelection();
});

init();
refreshHeader();
