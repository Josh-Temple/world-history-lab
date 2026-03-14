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

function sampleDistinct(events, count, excludeId) {
  const pool = events.filter((event) => event.id !== excludeId);
  const sampled = [];

  while (sampled.length < count && pool.length > 0) {
    const index = randomInt(pool.length);
    sampled.push(pool[index]);
    pool.splice(index, 1);
  }

  return sampled;
}

function buildClue(event) {
  if (typeof event.summary_short === "string" && event.summary_short.trim() !== "") {
    return `\"${event.summary_short.trim()}\"`;
  }
  return `\"${event.label}\"`;
}

async function fetchEvents() {
  const response = await fetch("/derived/events.normalized.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load events: HTTP ${response.status}`);
  }
  const events = await response.json();
  if (!Array.isArray(events)) {
    throw new Error("Unexpected events payload.");
  }
  if (events.length < 4) {
    throw new Error("Need at least 4 events to generate quiz options.");
  }
  return events;
}

const questionElement = document.getElementById("question");
const choicesElement = document.getElementById("choices");
const feedbackElement = document.getElementById("feedback");
const nextButton = document.getElementById("next");

let events = [];
let currentQuestion = null;

function setFeedback(message) {
  feedbackElement.textContent = message;
}

function clearChoices() {
  choicesElement.innerHTML = "";
}

function disableChoices() {
  const buttons = choicesElement.querySelectorAll("button");
  for (const button of buttons) {
    button.disabled = true;
  }
}

function handleChoice(choiceButton, option) {
  if (!currentQuestion) {
    return;
  }

  disableChoices();
  nextButton.disabled = false;

  if (option.id === currentQuestion.answer.id) {
    choiceButton.classList.add("correct");
    setFeedback("Correct!");
    return;
  }

  choiceButton.classList.add("incorrect");

  const answerButton = choicesElement.querySelector(`[data-event-id="${currentQuestion.answer.id}"]`);
  if (answerButton) {
    answerButton.classList.add("correct");
  }

  setFeedback(`Incorrect. The correct answer is: ${currentQuestion.answer.label}`);
}

function renderQuestion() {
  const answer = events[randomInt(events.length)];
  const distractors = sampleDistinct(events, 3, answer.id);
  const options = shuffle([answer, ...distractors]);

  currentQuestion = { answer, options };
  questionElement.textContent = buildClue(answer);
  clearChoices();
  setFeedback("");
  nextButton.disabled = true;

  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.dataset.eventId = option.id;
    button.textContent = option.label;
    button.addEventListener("click", () => handleChoice(button, option));
    choicesElement.appendChild(button);
  }
}

async function init() {
  try {
    events = await fetchEvents();
    renderQuestion();
  } catch (error) {
    questionElement.textContent = "Could not load event data.";
    setFeedback(error.message);
  }
}

nextButton.addEventListener("click", renderQuestion);

init();
