import { getNormalizedEvents, weightedSample } from "../shared/data-store.js";

const questionEl = document.getElementById("question");
const optionsEl = document.getElementById("options");
const feedbackEl = document.getElementById("feedback");

let events = [];

function extractEffectEventId(effectRef) {
  if (typeof effectRef === "string") return effectRef;
  if (effectRef && typeof effectRef === "object" && typeof effectRef.event_id === "string") {
    return effectRef.event_id;
  }
  return null;
}

function getForwardTargets(eventRecord, eventById) {
  if (!Array.isArray(eventRecord?.effects)) return [];
  return eventRecord.effects
    .map((effectRef) => extractEffectEventId(effectRef))
    .filter((eventId) => typeof eventId === "string" && eventById.has(eventId));
}

function buildQuestionPool(sourceEvents, eventById) {
  return sourceEvents.filter((eventRecord) => {
    const hasForward = getForwardTargets(eventRecord, eventById).length > 0;
    const hasReverse = Array.isArray(eventRecord.caused_by) && eventRecord.caused_by.length > 0;
    return hasForward || hasReverse;
  });
}

function generateQuestion(pool, eventById) {
  const eventRecord = weightedSample(pool);
  const forwardTargets = getForwardTargets(eventRecord, eventById);
  const reverseTargets = Array.isArray(eventRecord.caused_by)
    ? eventRecord.caused_by.filter((eventId) => eventById.has(eventId))
    : [];

  const useForward = Math.random() > 0.5;
  if (useForward && forwardTargets.length > 0) {
    return {
      type: "forward",
      prompt: eventRecord.label,
      correctId: forwardTargets[0],
    };
  }

  if (reverseTargets.length > 0) {
    return {
      type: "reverse",
      prompt: eventRecord.label,
      correctId: reverseTargets[0],
    };
  }

  if (forwardTargets.length > 0) {
    return {
      type: "forward",
      prompt: eventRecord.label,
      correctId: forwardTargets[0],
    };
  }

  return generateQuestion(pool, eventById);
}

function shuffle(items) {
  return [...items]
    .map((item) => ({ item, sortKey: Math.random() }))
    .sort((left, right) => left.sortKey - right.sortKey)
    .map(({ item }) => item);
}

function buildOptions(correctId, sourceEvents) {
  const options = new Set([correctId]);
  while (options.size < 4 && options.size < sourceEvents.length) {
    options.add(sourceEvents[Math.floor(Math.random() * sourceEvents.length)].id);
  }
  return shuffle(Array.from(options));
}

function nextQuestion() {
  const eventById = new Map(events.map((eventRecord) => [eventRecord.id, eventRecord]));
  const pool = buildQuestionPool(events, eventById);
  if (pool.length === 0) {
    questionEl.textContent = "No causality drill questions are available yet for this unit.";
    optionsEl.innerHTML = "";
    return;
  }

  const question = generateQuestion(pool, eventById);
  const optionIds = buildOptions(question.correctId, events);

  questionEl.textContent = question.type === "forward"
    ? `What happened next after: ${question.prompt}?`
    : `What caused: ${question.prompt}?`;

  feedbackEl.textContent = "";
  feedbackEl.className = "";
  optionsEl.innerHTML = "";

  for (const optionId of optionIds) {
    const optionEvent = eventById.get(optionId);
    if (!optionEvent) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = optionEvent.label;
    button.addEventListener("click", () => {
      const isCorrect = optionId === question.correctId;
      feedbackEl.textContent = isCorrect ? "Correct" : "Incorrect";
      feedbackEl.className = isCorrect ? "correct" : "incorrect";
      window.setTimeout(nextQuestion, 800);
    });
    optionsEl.appendChild(button);
  }
}

async function init() {
  try {
    const queryUnitId = new URLSearchParams(window.location.search).get("unit") || "";
    const normalized = await getNormalizedEvents();
    events = queryUnitId
      ? normalized.filter((eventRecord) => Array.isArray(eventRecord.unit_ids) && eventRecord.unit_ids.includes(queryUnitId))
      : normalized;

    if (!events.length) {
      questionEl.textContent = "No events available for the selected unit.";
      return;
    }

    nextQuestion();
  } catch (error) {
    console.error("[causality-drill] init failed", error);
    questionEl.textContent = "Could not load causality drill data.";
  }
}

init();
