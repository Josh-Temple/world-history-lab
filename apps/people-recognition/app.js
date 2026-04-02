import { REVIEWED_PLUS, loadDerivedEvents, loadUnitsIndex } from "../shared/data-access.js";
import { getAllPeople } from "../shared/data-store.js";
import { showFeedback } from "../shared/feedback.js";

const personNameElement = document.getElementById("person-name");
const personSummaryElement = document.getElementById("person-summary");
const choicesElement = document.getElementById("choices");
const feedbackElement = document.getElementById("feedback");
const answerMetaElement = document.getElementById("answer-meta");
const nextButton = document.getElementById("next");
const practiceModeSelect = document.getElementById("practice-mode");
const unitSelect = document.getElementById("unit-select");
const qualitySelect = document.getElementById("quality-select");
const sessionLengthSelect = document.getElementById("session-length");
const eligibilityHint = document.getElementById("eligibility-hint");
const progressElement = document.getElementById("progress");
const sessionStatusElement = document.getElementById("session-status");
const summaryElement = document.getElementById("summary");

const state = {
  people: [],
  units: [],
  eventsById: new Map(),
  eventsByPerson: new Map(),
  currentQuestion: null,
  currentQuestionIndex: 0,
  totalQuestions: 10,
  correctAnswers: 0,
  sessionActive: false,
};

function isValidEvent(event) {
  return Boolean(
    event
    && typeof event.id === "string"
    && typeof event.label === "string"
    && Number.isFinite(event?.time?.year_start)
    && typeof event.summary_short === "string"
    && event.summary_short.trim().length > 0
  );
}

function isValidPerson(person) {
  return Boolean(person && typeof person.id === "string" && person.id.trim().length > 0);
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function shuffle(items) {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function isQualityAllowed(record) {
  if (qualitySelect.value !== "reviewed") return true;
  return REVIEWED_PLUS.has(record.status);
}

function personLabel(person) {
  return person.label || person.name || person.id;
}

function unitForEvent(event) {
  const unitId = Array.isArray(event.unit_ids) ? event.unit_ids[0] : null;
  return state.units.find((candidate) => candidate.id === unitId) || null;
}

function buildPeopleIndex(events, people) {
  state.eventsByPerson = new Map();

  for (const event of events) {
    if (!Array.isArray(event.people_ids)) continue;
    for (const personId of event.people_ids) {
      if (!state.eventsByPerson.has(personId)) {
        state.eventsByPerson.set(personId, []);
      }
      state.eventsByPerson.get(personId).push(event);
    }
  }

  state.people = people.filter((person) => state.eventsByPerson.has(person.id));
}

function getScopedPeople() {
  return state.people.filter((person) => {
    if (!isQualityAllowed(person)) return false;
    return getEligibleEventsForPerson(person).length > 0;
  });
}

function getEligibleEventsForPerson(person) {
  const linkedEvents = state.eventsByPerson.get(person.id) || [];
  return linkedEvents.filter((event) => {
    if (!isQualityAllowed(event)) return false;
    if (practiceModeSelect.value !== "unit") return true;
    return Array.isArray(event.unit_ids) && event.unit_ids.includes(unitSelect.value);
  });
}

function updateEligibilityHint(peoplePool) {
  const scopeLabel = practiceModeSelect.value === "all" ? "all units" : "this unit";
  if (peoplePool.length === 0 && qualitySelect.value === "reviewed") {
    eligibilityHint.textContent = `No linked people found for ${scopeLabel} at Reviewed+ quality. Switch to Include drafts or a different unit.`;
    return;
  }
  eligibilityHint.textContent = `Usable people under current settings: ${peoplePool.length}.`;
}

function pickCanonicalEvent(person, eligibleEvents) {
  const preferredIds = Array.isArray(person.related_events) ? person.related_events : [];
  for (const eventId of preferredIds) {
    const preferredEvent = eligibleEvents.find((event) => event.id === eventId);
    if (preferredEvent) return preferredEvent;
  }
  return eligibleEvents[0] || null;
}

function buildDistractors(correctEvent, relatedEvents) {
  const correctUnitIds = Array.isArray(correctEvent.unit_ids) ? correctEvent.unit_ids : [];
  const relatedIds = new Set(relatedEvents.map((event) => event.id));
  const sameUnit = [];
  const fallback = [];

  for (const event of state.eventsById.values()) {
    if (!isQualityAllowed(event)) continue;
    if (relatedIds.has(event.id)) continue;

    const matchesUnit = correctUnitIds.length > 0
      && Array.isArray(event.unit_ids)
      && event.unit_ids.some((unitId) => correctUnitIds.includes(unitId));

    if (matchesUnit) {
      sameUnit.push(event);
    } else {
      fallback.push(event);
    }
  }

  const distractors = [];
  for (const event of shuffle(sameUnit)) {
    if (distractors.length >= 3) break;
    distractors.push(event);
  }
  for (const event of shuffle(fallback)) {
    if (distractors.length >= 3) break;
    distractors.push(event);
  }
  return distractors;
}

function clearChoices() {
  choicesElement.innerHTML = "";
}

function disableChoices() {
  choicesElement.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
}

function updateProgress() {
  progressElement.textContent = `Question ${Math.min(state.currentQuestionIndex + 1, state.totalQuestions)} of ${state.totalQuestions}`;
}

function resetRoundUi() {
  feedbackElement.textContent = "";
  answerMetaElement.textContent = "";
  nextButton.disabled = true;
}

function getFeedbackMessage(accuracy) {
  if (accuracy >= 85) return "Strong actor-event recall. Move into Causality Builder or History Player to deepen connections.";
  if (accuracy >= 60) return "Good progress. Another short people-recognition session should make key actors feel easier to place.";
  return "Keep reinforcing the basics. Timeline Trainer or Event Recognition can help before another actor-based session.";
}

function showSummary() {
  state.sessionActive = false;
  state.currentQuestion = null;
  const accuracy = Math.round((state.correctAnswers / state.totalQuestions) * 100);
  personNameElement.textContent = "Session complete.";
  personSummaryElement.textContent = "Review your result and decide the next learning step.";
  clearChoices();
  feedbackElement.textContent = "";
  answerMetaElement.textContent = "";
  nextButton.hidden = true;
  progressElement.textContent = `Completed ${state.totalQuestions} of ${state.totalQuestions}`;
  sessionStatusElement.textContent = "Use the result to decide whether to repeat people practice or move forward.";
  summaryElement.hidden = false;
  summaryElement.innerHTML = `
    <h2>Session complete</h2>
    <p><strong>Score:</strong> ${state.correctAnswers}/${state.totalQuestions}</p>
    <p><strong>Accuracy:</strong> ${accuracy}%</p>
    <p>${getFeedbackMessage(accuracy)}</p>
    <div class="summary-actions">
      <button type="button" class="summary-button" id="retry-session">Retry session</button>
      <a class="summary-link" href="../history-player/">Next step: History Player</a>
    </div>
  `;

  document.getElementById("retry-session")?.addEventListener("click", () => {
    startSession();
  });
}

function renderQuestion() {
  const peoplePool = getScopedPeople();
  updateEligibilityHint(peoplePool);

  if (peoplePool.length === 0) {
    state.sessionActive = false;
    state.currentQuestion = null;
    personNameElement.textContent = "No linked people available.";
    personSummaryElement.textContent = "Adjust practice scope or quality settings to continue.";
    clearChoices();
    feedbackElement.textContent = "People Recognition needs at least one linked person in the current setup.";
    answerMetaElement.textContent = "";
    sessionStatusElement.textContent = "Change the setup to start a session.";
    summaryElement.hidden = true;
    nextButton.hidden = false;
    nextButton.disabled = true;
    return;
  }

  const person = peoplePool[randomInt(peoplePool.length)];
  const relatedEvents = getEligibleEventsForPerson(person);
  const correct = pickCanonicalEvent(person, relatedEvents);
  const distractors = buildDistractors(correct, relatedEvents).slice(0, 3);

  if (!correct || distractors.length < 3) {
    state.sessionActive = false;
    state.currentQuestion = null;
    personNameElement.textContent = personLabel(person);
    personSummaryElement.textContent = person.summary_short || "";
    clearChoices();
    feedbackElement.textContent = "Could not build enough distinct distractors for this setup.";
    answerMetaElement.textContent = "Try All units or Include drafts.";
    sessionStatusElement.textContent = "Change the setup to start a session.";
    summaryElement.hidden = true;
    nextButton.hidden = false;
    nextButton.disabled = true;
    return;
  }

  const options = shuffle([correct, ...distractors]);
  state.currentQuestion = { person, correct, options, relatedEvents };
  personNameElement.textContent = personLabel(person);
  personSummaryElement.textContent = person.summary_short || "No summary available.";
  sessionStatusElement.textContent = `Answer the actor-to-event prompt, then continue until you finish all ${state.totalQuestions} questions.`;
  summaryElement.hidden = true;
  nextButton.hidden = false;
  resetRoundUi();
  updateProgress();
  clearChoices();

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

function handleChoice(choiceButton, option) {
  if (!state.currentQuestion || !state.sessionActive) return;

  disableChoices();
  nextButton.disabled = false;

  const { correct, person } = state.currentQuestion;
  const isCorrect = option.id === correct.id;
  const correctUnit = unitForEvent(correct);
  const eventYear = correct?.derived?.year_start ?? correct?.time?.year_start ?? "—";

  if (isCorrect) {
    state.correctAnswers += 1;
    choiceButton.classList.add("correct");
    showFeedback(feedbackElement, {
      correct: true,
      event: correct,
      year: Number.isFinite(eventYear) ? eventYear : undefined,
      unitTitle: correctUnit?.title,
      summary: correct.summary_short || "No summary available.",
    });
  } else {
    choiceButton.classList.add("incorrect");
    showFeedback(feedbackElement, {
      correct: false,
      event: option,
      correctAnswer: correct,
      year: Number.isFinite(eventYear) ? eventYear : undefined,
      unitTitle: correctUnit?.title,
      summary: correct.summary_short || "No summary available.",
    });
    const answerButton = choicesElement.querySelector(`[data-event-id="${CSS.escape(correct.id)}"]`);
    if (answerButton) answerButton.classList.add("correct");
  }

  answerMetaElement.textContent = `${personLabel(person)} is associated with ${correct.label} (${eventYear})${correctUnit ? ` in ${correctUnit.title}` : ""}. ${correct.summary_short || ""}`;
}

function populateUnitOptions() {
  unitSelect.innerHTML = "";
  for (const unit of state.units) {
    const option = document.createElement("option");
    option.value = unit.id;
    option.textContent = unit.title || unit.id;
    unitSelect.appendChild(option);
  }
  if (state.units.some((unit) => unit.id === "unit_french_revolution_napoleon")) {
    unitSelect.value = "unit_french_revolution_napoleon";
  }
}

function refreshUnitVisibility() {
  unitSelect.disabled = practiceModeSelect.value !== "unit";
}

function startSession() {
  state.totalQuestions = Number.parseInt(sessionLengthSelect.value, 10) || 10;
  state.currentQuestionIndex = 0;
  state.correctAnswers = 0;
  state.sessionActive = true;
  summaryElement.hidden = true;
  nextButton.hidden = false;
  renderQuestion();
}

function handleAdvance() {
  if (!state.sessionActive || !state.currentQuestion) return;
  state.currentQuestionIndex += 1;
  if (state.currentQuestionIndex >= state.totalQuestions) {
    showSummary();
    return;
  }
  renderQuestion();
}

async function init() {
  try {
    const [people, events, unitsIndex] = await Promise.all([
      getAllPeople(),
      loadDerivedEvents(),
      loadUnitsIndex(),
    ]);

    const safeEvents = (Array.isArray(events) ? events : []).filter(isValidEvent);
    const safePeople = (Array.isArray(people) ? people : []).filter(isValidPerson);
    state.units = Array.isArray(unitsIndex?.units) ? unitsIndex.units : [];
    state.eventsById = new Map(safeEvents.map((event) => [event.id, event]));
    buildPeopleIndex(safeEvents, safePeople);

    if (safeEvents.length === 0) {
      personNameElement.textContent = "No valid events available.";
      personSummaryElement.textContent = "Please regenerate data or add complete records.";
      feedbackElement.textContent = "No valid events available.";
      nextButton.disabled = true;
      return;
    }

    populateUnitOptions();
    refreshUnitVisibility();
    startSession();
  } catch (error) {
    console.error(error);
    personNameElement.textContent = "Could not load people data.";
    personSummaryElement.textContent = "Open the console for details.";
    feedbackElement.textContent = "Loading failed.";
  }
}

practiceModeSelect.addEventListener("change", () => {
  refreshUnitVisibility();
  startSession();
});
unitSelect.addEventListener("change", startSession);
qualitySelect.addEventListener("change", startSession);
sessionLengthSelect.addEventListener("change", startSession);
nextButton.addEventListener("click", handleAdvance);

init();
