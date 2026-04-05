import { loadDerivedEvents } from "../shared/data-access.js";
import { getEventsForUnit, getNextUnit, getUnits } from "../shared/data-store.js";
import { recordResult } from "../shared/mastery-store.js";
import { showFeedback } from "../shared/feedback.js";

const listEl = document.getElementById("event-list");
const checkBtn = document.getElementById("check");
const nextBtn = document.getElementById("next");
const feedbackEl = document.getElementById("feedback");
const explanationEl = document.getElementById("explanation");
const promptEl = document.getElementById("prompt");
const unitSelect = document.getElementById("unit-select");
const unitHint = document.getElementById("unit-hint");
const nextUnitHint = document.getElementById("next-unit-hint");
const SELECTED_UNIT_KEY = "selected_unit";

const state = {
  eventMap: new Map(),
  allChains: [],
  chains: [],
  chain: [],
  units: [],
};

function isValidEvent(event) {
  return Boolean(
    event
    && typeof event.id === "string"
    && typeof event.label === "string"
    && Number.isFinite(event?.time?.year_start)
  );
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isValidChain(chain) {
  return Array.isArray(chain)
    && chain.length >= 3
    && chain.length <= 5
    && chain.every((id) => typeof id === "string" && state.eventMap.has(id));
}

function setFeedback(message, kind = "") {
  feedbackEl.textContent = message;
  feedbackEl.className = `feedback ${kind}`.trim();
}

function getEventLabel(id) {
  const event = state.eventMap.get(id);
  if (!event) return id;
  const year = Number.isFinite(event?.time?.year_start) ? ` (${event.time.year_start})` : "";
  const label = typeof event?.label === "string" && event.label.trim().length > 0
    ? event.label
    : "Unknown event";
  return `${label}${year}`;
}

function createItem(eventId) {
  const li = document.createElement("li");
  li.className = "chain-item";
  li.dataset.id = eventId;
  li.draggable = true;
  li.textContent = getEventLabel(eventId);

  li.addEventListener("dragstart", () => {
    li.classList.add("dragging");
  });

  li.addEventListener("dragend", () => {
    li.classList.remove("dragging");
    li.classList.remove("drag-over");
  });

  li.addEventListener("dragover", (event) => {
    event.preventDefault();
    li.classList.add("drag-over");
  });

  li.addEventListener("dragleave", () => {
    li.classList.remove("drag-over");
  });

  li.addEventListener("drop", (event) => {
    event.preventDefault();
    li.classList.remove("drag-over");
    const dragging = listEl.querySelector(".dragging");
    if (!dragging || dragging === li) return;

    const items = [...listEl.children];
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

function renderChain(shuffledChain) {
  listEl.innerHTML = "";
  for (const id of shuffledChain) {
    listEl.appendChild(createItem(id));
  }
}

function pickChain() {
  const randomIndex = Math.floor(Math.random() * state.chains.length);
  return state.chains[randomIndex];
}

function explainChain(chain) {
  return chain
    .map((id, idx) => `${idx + 1}. ${getEventLabel(id)}`)
    .join(" → ");
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
  unitSelect.value = known ? saved : (state.units[0]?.id || "");
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

function newRound() {
  if (state.chains.length === 0) {
    state.chain = [];
    listEl.innerHTML = "";
    promptEl.textContent = "No causality chains available for this unit. Try another unit or switch to All units.";
    setFeedback("No chains available.", "incorrect");
    explanationEl.textContent = "";
    checkBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  state.chain = pickChain();
  renderChain(shuffle(state.chain));
  setFeedback("Arrange the events, then press Check.");
  explanationEl.textContent = "";
  checkBtn.disabled = false;
  nextBtn.disabled = false;
}

function checkOrder() {
  if (state.chain.length === 0) return;

  const userOrder = [...listEl.children].map((li) => li.dataset.id);
  const correct = state.chain.every((id, i) => id === userOrder[i]);

  for (const eventId of state.chain) {
    recordResult(eventId, correct);
  }

  if (correct) {
    showFeedback(feedbackEl, {
      correct: true,
      event: state.eventMap.get(state.chain[0]),
      summary: "You reconstructed the chain in the correct causal order.",
      extra: [`Correct order: ${state.chain.map(getEventLabel).join(" → ")}`],
    });
    explanationEl.textContent = `Chain confirmed: ${explainChain(state.chain)}`;
    return;
  }

  showFeedback(feedbackEl, {
    correct: false,
    event: state.eventMap.get(userOrder[0]),
    correctAnswer: state.eventMap.get(state.chain[0]),
    summary: "The order was not fully causal.",
    extra: [`Correct order: ${state.chain.map(getEventLabel).join(" → ")}`],
  });
  explanationEl.textContent = `Expected order: ${explainChain(state.chain)}`;
}

async function init() {
  try {
    const [events, chainsRaw, units] = await Promise.all([
      loadDerivedEvents(),
      fetch("/derived/causality_chains.json", { cache: "no-store" }).then((response) => {
        if (!response.ok) {
          throw new Error(`causality_chains: HTTP ${response.status}`);
        }
        return response.json();
      }),
      getUnits(),
    ]);

    const eventList = (Array.isArray(events) ? events : []).filter(isValidEvent);
    if (eventList.length === 0) {
      throw new Error("No valid events available.");
    }
    state.eventMap = new Map(
      eventList
        .map((event) => [event.id, event])
    );

    state.units = Array.isArray(units) ? units : [];
    state.allChains = (Array.isArray(chainsRaw) ? chainsRaw : []).filter(isValidChain);

    populateUnitOptions();
    localStorage.setItem(SELECTED_UNIT_KEY, unitSelect.value);
    await applyUnitSelection();
  } catch (error) {
    console.error("[sequence-reconstruction] load failed", error);
    listEl.innerHTML = "";
    promptEl.textContent = "Could not load chain data.";
    setFeedback("Loading failed.", "incorrect");
    explanationEl.textContent = error.message;
    checkBtn.disabled = true;
    nextBtn.disabled = true;
  }
}

checkBtn.addEventListener("click", checkOrder);
nextBtn.addEventListener("click", newRound);
unitSelect.addEventListener("change", async () => {
  localStorage.setItem(SELECTED_UNIT_KEY, unitSelect.value);
  await applyUnitSelection();
});

init();
