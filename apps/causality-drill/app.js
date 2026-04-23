import { getEventsForUnit, getNormalizedEvents, getStoredUnitId, weightedSample } from "../shared/data-store.js";
import { mountHeader } from "../shared/header.js";

const questionEl = document.getElementById("question");
const optionsEl = document.getElementById("options");
const feedbackEl = document.getElementById("feedback");

const url = new URL(window.location.href);
const requestedUnitId = url.searchParams.get("unit") || getStoredUnitId() || "";

const appHeader = mountHeader({
  container: document.querySelector("main") || document.body,
  mode: "Causality Drill",
  progress: "Rapid Recall",
});

const state = {
  events: [],
  eventsById: new Map(),
  candidateEvents: [],
  currentQuestion: null,
  lock: false,
};

function getLinkedIds(effectRefs, eventsById) {
  const refs = Array.isArray(effectRefs) ? effectRefs : [];
  return refs
    .map((ref) => {
      if (typeof ref === "string") return ref;
      if (ref && typeof ref === "object" && typeof ref.event_id === "string") return ref.event_id;
      return null;
    })
    .filter((id) => typeof id === "string" && eventsById.has(id));
}

function generateQuestion() {
  const maxAttempts = Math.max(20, state.candidateEvents.length * 2);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const picked = weightedSample(state.candidateEvents);
    if (!picked) break;

    const forwardTargets = getLinkedIds(picked.effects, state.eventsById);
    const reverseTargets = Array.isArray(picked.caused_by)
      ? picked.caused_by.filter((id) => state.eventsById.has(id))
      : [];

    const useForward = Math.random() > 0.5;
    if (useForward && forwardTargets.length > 0) {
      return {
        type: "forward",
        prompt: picked.label,
        eventId: picked.id,
        correctId: weightedSample(forwardTargets.map((id) => state.eventsById.get(id)))?.id || forwardTargets[0],
      };
    }

    if (reverseTargets.length > 0) {
      return {
        type: "reverse",
        prompt: picked.label,
        eventId: picked.id,
        correctId: weightedSample(reverseTargets.map((id) => state.eventsById.get(id)))?.id || reverseTargets[0],
      };
    }

    if (forwardTargets.length > 0) {
      return {
        type: "forward",
        prompt: picked.label,
        eventId: picked.id,
        correctId: weightedSample(forwardTargets.map((id) => state.eventsById.get(id)))?.id || forwardTargets[0],
      };
    }
  }

  return null;
}

function buildOptions(correctId) {
  const totalNeeded = Math.min(4, state.events.length);
  const ids = new Set([correctId]);

  while (ids.size < totalNeeded) {
    const sampled = weightedSample(state.events);
    if (!sampled) break;
    ids.add(sampled.id);
  }

  const options = Array.from(ids)
    .map((id) => state.eventsById.get(id))
    .filter(Boolean);

  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return options;
}

function handleAnswer(selectedId) {
  if (!state.currentQuestion || state.lock) return;

  state.lock = true;
  const isCorrect = selectedId === state.currentQuestion.correctId;

  feedbackEl.textContent = isCorrect ? "Correct" : "Incorrect";
  feedbackEl.className = isCorrect ? "correct" : "incorrect";

  optionsEl.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
    const optionId = button.dataset.optionId;
    if (optionId === state.currentQuestion.correctId) {
      button.style.borderColor = "#16a34a";
      button.style.background = "#f0fdf4";
    }
    if (!isCorrect && optionId === selectedId) {
      button.style.borderColor = "#ef4444";
      button.style.background = "#fef2f2";
    }
  });

  setTimeout(() => {
    state.lock = false;
    nextQuestion();
  }, 800);
}

function renderQuestion(question) {
  state.currentQuestion = question;
  feedbackEl.textContent = "";
  feedbackEl.className = "";

  questionEl.textContent = question.type === "forward"
    ? `What happened next after: ${question.prompt}?`
    : `What caused: ${question.prompt}?`;

  const options = buildOptions(question.correctId);
  optionsEl.innerHTML = "";

  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.optionId = option.id;
    button.textContent = option.label;
    button.addEventListener("click", () => handleAnswer(option.id));
    optionsEl.append(button);
  }
}

function nextQuestion() {
  const question = generateQuestion();
  if (!question) {
    questionEl.textContent = "Not enough causal links to generate a drill question.";
    optionsEl.innerHTML = "";
    feedbackEl.textContent = "Add events with effects/caused_by links and retry.";
    return;
  }

  renderQuestion(question);
}

async function init() {
  const [allEvents, normalizedEvents] = await Promise.all([getEventsForUnit(requestedUnitId), getNormalizedEvents()]);

  state.events = (requestedUnitId
    ? normalizedEvents.filter((event) => Array.isArray(event.unit_ids) && event.unit_ids.includes(requestedUnitId))
    : normalizedEvents
  );

  if (state.events.length === 0) {
    state.events = allEvents;
  }

  state.eventsById = new Map(state.events.map((event) => [event.id, event]));
  state.candidateEvents = state.events.filter((event) => {
    const hasForward = getLinkedIds(event.effects, state.eventsById).length > 0;
    const hasReverse = Array.isArray(event.caused_by) && event.caused_by.some((id) => state.eventsById.has(id));
    return hasForward || hasReverse;
  });

  const unitLabel = requestedUnitId ? `Unit: ${requestedUnitId}` : "All units";
  appHeader.update({ unit: unitLabel, progress: "Rapid Recall" });

  nextQuestion();
}

init().catch((error) => {
  questionEl.textContent = "Failed to load causality drill data.";
  optionsEl.innerHTML = "";
  feedbackEl.textContent = error?.message || "Try refreshing the page.";
});
