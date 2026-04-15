import { getEventsWithLocation } from "../shared/data-store.js";
import { mountHeader } from "../shared/header.js";

const questionElement = document.getElementById("question");
const optionsElement = document.getElementById("options");
const feedbackElement = document.getElementById("feedback");
const markerElement = document.getElementById("marker");
const nextButton = document.getElementById("next");

const appHeader = mountHeader({
  container: document.querySelector("main") || document.body,
  mode: "Map Quiz",
  progress: "Spatial",
});
appHeader.update({ unit: "All units", progress: "Spatial" });

const state = {
  pool: [],
  current: null,
  answered: false,
};

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function shuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function toMapPoint(lat, lon) {
  const x = ((lon + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };
}

function placeMarker(location) {
  const { x, y } = toMapPoint(location.lat, location.lon);
  markerElement.style.left = `${x}%`;
  markerElement.style.top = `${y}%`;
  markerElement.hidden = false;
}

function setFeedback(message, kind = "") {
  feedbackElement.textContent = message;
  feedbackElement.className = kind ? kind : "";
}

function buildOptions(target) {
  const distractors = shuffle(state.pool.filter((event) => event.id !== target.id)).slice(0, 3);
  return shuffle([target, ...distractors]);
}

function onAnswer(selectedId) {
  if (!state.current || state.answered) {
    return;
  }
  state.answered = true;

  const isCorrect = selectedId === state.current.id;
  if (isCorrect) {
    setFeedback(`Correct — ${state.current.label} (${state.current.location.region})`, "correct");
  } else {
    setFeedback(`Incorrect. Correct answer: ${state.current.label} (${state.current.location.region})`, "incorrect");
  }

  optionsElement.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
    if (button.dataset.eventId === state.current.id) {
      button.style.borderColor = "#16a34a";
      button.style.background = "#f0fdf4";
    }
  });

  nextButton.disabled = false;
}

function renderQuestion() {
  if (state.pool.length < 4) {
    questionElement.textContent = "Not enough location-tagged events to run Map Quiz (need at least 4).";
    optionsElement.innerHTML = "";
    setFeedback("Add more events with location metadata to continue.");
    markerElement.hidden = true;
    nextButton.disabled = true;
    return;
  }

  state.current = state.pool[randomInt(state.pool.length)];
  state.answered = false;

  questionElement.textContent = "Which event happened at this location?";
  setFeedback("");
  nextButton.disabled = true;

  placeMarker(state.current.location);

  const options = buildOptions(state.current);
  optionsElement.innerHTML = "";
  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.eventId = option.id;
    button.textContent = option.label;
    button.addEventListener("click", () => onAnswer(option.id));
    optionsElement.append(button);
  }
}

async function init() {
  try {
    state.pool = await getEventsWithLocation();
    renderQuestion();
  } catch {
    questionElement.textContent = "Failed to load event data.";
    setFeedback("Try refreshing the page.");
    nextButton.disabled = true;
  }
}

nextButton.addEventListener("click", renderQuestion);

init();
