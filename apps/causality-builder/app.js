const CAUSAL_TYPES = new Set(["causality_chain", "causality_categorize_causes", "causality_match_effects", "cause_and_effect"]);
const REVIEWED_PLUS = new Set(["reviewed", "approved"]);

const qualitySelect = document.getElementById("quality-select");
const unitSelect = document.getElementById("unit-select");
const modeSelect = document.getElementById("mode-select");
const statusLine = document.getElementById("status-line");
const questionEl = document.getElementById("question");
const choicesEl = document.getElementById("choices");
const feedbackEl = document.getElementById("feedback");
const explanationEl = document.getElementById("explanation");
const nextButton = document.getElementById("next");

const state = { eventsById: new Map(), units: [], eligibleUnits: [], currentQuestion: null };

function randomInt(max) { return Math.floor(Math.random() * max); }
function shuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function appUrl(relativePath) { return new URL(relativePath, window.location.href).toString(); }
function formatEvent(event) { return `${event.label} (${event.time.year_start})`; }
function setStatusLine(message) { statusLine.textContent = message; }

function isCausalityReady(event) {
  const hasTypes = Array.isArray(event.question_types) && event.question_types.some((type) => CAUSAL_TYPES.has(type));
  const hasLinks = (Array.isArray(event.causes) && event.causes.length > 0) || (Array.isArray(event.effects) && event.effects.length > 0);
  return Number.isFinite(event?.time?.year_start) && hasTypes && hasLinks;
}

function statusAllows(event, minimumQuality) {
  if (minimumQuality === "draft") return true;
  return REVIEWED_PLUS.has(event.status);
}

async function fetchJson(path, label) {
  const response = await fetch(appUrl(path), { cache: "no-store" });
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
  return response.json();
}

async function loadData() {
  const [events, unitRegistry] = await Promise.all([
    fetchJson("../../data/events.json", "events"),
    fetchJson("../../data/units/index.json", "units/index"),
  ]);
  const units = await Promise.all(
    (unitRegistry.units || []).map((entry) => fetchJson(`../../${entry.path.replace(/^\.?\/?/, "")}`, entry.id || "unit"))
  );
  return { events, units };
}

function clearChoices() { choicesEl.innerHTML = ""; }
function disableChoices() { choicesEl.querySelectorAll("button").forEach((button) => { button.disabled = true; }); }

function getCausalityReadyEventsForUnit(unit, minimumQuality) {
  if (!unit) return [];
  return (unit.event_ids || [])
    .map((id) => state.eventsById.get(id))
    .filter((event) => event && isCausalityReady(event) && statusAllows(event, minimumQuality));
}

function getEligibleUnits(minimumQuality) {
  return state.units.filter((unit) => getCausalityReadyEventsForUnit(unit, minimumQuality).length >= 4);
}

function computeCategoryPool(events) {
  const categories = new Set();
  for (const event of events) {
    for (const cause of event.causes || []) {
      if (cause && typeof cause === "object" && typeof cause.category === "string" && cause.category.trim()) {
        categories.add(cause.category.trim());
      }
    }
  }
  return [...categories];
}

function buildDirectEffectQuestion(eventsInUnit) {
  const candidates = eventsInUnit.map((source) => {
    const effectTargets = (source.effects || [])
      .filter((effect) => typeof effect === "string")
      .map((effectId) => state.eventsById.get(effectId))
      .filter((event) => event && eventsInUnit.some((candidate) => candidate.id === event.id));
    return { source, effectTargets };
  }).filter((candidate) => candidate.effectTargets.length > 0);

  if (candidates.length === 0) return null;

  const picked = candidates[randomInt(candidates.length)];
  const answer = picked.effectTargets[randomInt(picked.effectTargets.length)];
  const distractors = shuffle(eventsInUnit.filter((event) => event.id !== picked.source.id && event.id !== answer.id)).slice(0, 2);
  if (distractors.length < 2) return null;

  return {
    answer,
    options: shuffle([answer, ...distractors]),
    prompt: `Which event is a direct effect of ${formatEvent(picked.source)}?\n${picked.source.summary_short || ""}`,
    explanation: `${formatEvent(picked.source)} directly leads toward ${formatEvent(answer)} in this unit's causal chain.`,
  };
}

function buildCauseCategoryQuestion(eventsInUnit) {
  const candidates = eventsInUnit.map((source) => {
    const objectCauses = (source.causes || []).filter((cause) => cause && typeof cause === "object" && typeof cause.category === "string" && cause.category.trim());
    return { source, objectCauses };
  }).filter((candidate) => candidate.objectCauses.length > 0);

  if (candidates.length === 0) return { unavailable: "No categorized causes are available in this unit." };

  const categories = computeCategoryPool(eventsInUnit);
  if (categories.length < 4) {
    return { unavailable: "Cause category mode needs at least 4 unique cause categories in this unit and quality filter." };
  }

  const picked = candidates[randomInt(candidates.length)];
  const cause = picked.objectCauses[randomInt(picked.objectCauses.length)];
  const answer = cause.category.trim();
  const distractors = shuffle(categories.filter((category) => category !== answer)).slice(0, 3);
  if (distractors.length < 3) return { unavailable: "Not enough alternative categories are available for this question." };

  return {
    answer,
    options: shuffle([answer, ...distractors]),
    prompt: `Which category best matches this cause for ${formatEvent(picked.source)}?\nCause: ${cause.label}`,
    explanation: `The cause “${cause.label}” is categorized as ${answer} for ${formatEvent(picked.source)}.`,
  };
}

function renderChoices(options, getLabel, onSelect) {
  clearChoices();
  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.dataset.option = String(option.id || option);
    button.textContent = getLabel(option);
    button.addEventListener("click", () => onSelect(button, option));
    choicesEl.appendChild(button);
  }
}

function updateStatusText(eventsInUnit, helperText) {
  setStatusLine(`Eligible units: ${state.eligibleUnits.length} · Eligible events: ${eventsInUnit.length} · ${helperText}`);
}

function showUnavailable(message) {
  questionEl.textContent = message;
  clearChoices();
  feedbackEl.textContent = "";
  explanationEl.textContent = "";
  nextButton.disabled = true;
}

function renderQuestion() {
  const activeUnit = state.units.find((unit) => unit.id === unitSelect.value);
  const eventsInUnit = getCausalityReadyEventsForUnit(activeUnit, qualitySelect.value);

  if (eventsInUnit.length < 4) {
    updateStatusText(eventsInUnit, "Not enough causality-ready events for questions.");
    showUnavailable("This unit does not have enough causality-ready events with current filters.");
    return;
  }

  const question = modeSelect.value === "cause_category"
    ? buildCauseCategoryQuestion(eventsInUnit)
    : buildDirectEffectQuestion(eventsInUnit);

  if (!question || question.unavailable) {
    const helper = question?.unavailable || "No question could be generated.";
    updateStatusText(eventsInUnit, helper);
    showUnavailable(helper);
    return;
  }

  state.currentQuestion = question;
  questionEl.textContent = question.prompt;
  feedbackEl.textContent = "";
  explanationEl.textContent = "";
  nextButton.disabled = true;

  const helperText = modeSelect.value === "cause_category"
    ? "Cause category mode: classify one specific cause statement."
    : "Direct effect mode: choose a downstream event in the same unit.";
  updateStatusText(eventsInUnit, helperText);

  renderChoices(question.options, (option) => (typeof option === "string" ? option : option.label), (button, option) => handleAnswer(button, option));
}

function handleAnswer(choiceButton, option) {
  if (!state.currentQuestion) return;

  disableChoices();
  nextButton.disabled = false;

  const chosenValue = typeof option === "string" ? option : option.id;
  const answerValue = typeof state.currentQuestion.answer === "string" ? state.currentQuestion.answer : state.currentQuestion.answer.id;

  if (chosenValue === answerValue) {
    choiceButton.classList.add("correct");
    feedbackEl.textContent = "Correct.";
  } else {
    choiceButton.classList.add("incorrect");
    const answerButton = choicesEl.querySelector(`[data-option="${CSS.escape(String(answerValue))}"]`);
    if (answerButton) answerButton.classList.add("correct");
    feedbackEl.textContent = "Incorrect.";
  }

  explanationEl.textContent = state.currentQuestion.explanation;
}

function refreshUnitOptions() {
  state.eligibleUnits = getEligibleUnits(qualitySelect.value);
  unitSelect.innerHTML = "";

  if (state.eligibleUnits.length === 0) {
    setStatusLine("Eligible units: 0 · Eligible events: 0 · No playable causality unit for current filter.");
    showUnavailable("No units meet the causality-ready threshold (4 events). Try Include drafts.");
    return;
  }

  for (const unit of state.eligibleUnits) {
    const option = document.createElement("option");
    option.value = unit.id;
    option.textContent = unit.title || unit.id;
    unitSelect.appendChild(option);
  }

  unitSelect.value = state.eligibleUnits.some((unit) => unit.id === "unit_french_revolution_napoleon")
    ? "unit_french_revolution_napoleon"
    : state.eligibleUnits[0].id;

  renderQuestion();
}

async function init() {
  try {
    const { events, units } = await loadData();
    state.eventsById = new Map(events.map((event) => [event.id, event]));
    state.units = units;
    refreshUnitOptions();
  } catch (error) {
    setStatusLine(error.message);
    showUnavailable("Could not load causality data.");
  }
}

qualitySelect.addEventListener("change", refreshUnitOptions);
unitSelect.addEventListener("change", renderQuestion);
modeSelect.addEventListener("change", renderQuestion);
nextButton.addEventListener("click", renderQuestion);

init();
