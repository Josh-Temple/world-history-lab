import { fetchJson } from "/apps/shared/data-access.js";

const PROMPTS = [
  "What similarities do these events share?",
  "How are the causes different?",
  "What broader historical patterns connect these events?",
  "How did geography affect each event?",
];

function toYear(ev) { return Number(ev?.time?.year_start); }
function sample(list) { return list[Math.floor(Math.random() * list.length)]; }

async function loadEvents() {
  const events = await fetchJson('/data/events.json', 'events');
  return (Array.isArray(events) ? events : []).filter((ev) => ev?.id && ev?.label && Number.isFinite(toYear(ev)));
}

function randomPair(events, mode) {
  if (events.length < 2) throw new Error('Not enough events');
  for (let i = 0; i < 200; i += 1) {
    const a = sample(events);
    const b = sample(events);
    if (a.id === b.id) continue;
    const diff = Math.abs(toYear(a) - toYear(b));
    if (mode === 'same_era' && diff <= 25) return [a, b];
    if (mode === 'different_era' && diff >= 80) return [a, b];
  }
  return [sample(events), sample(events.filter((ev) => ev.id !== events[0].id))];
}

function renderEvent(el, ev) {
  const tags = Array.isArray(ev.themes) && ev.themes.length ? ev.themes : (Array.isArray(ev.tags) ? ev.tags : []);
  el.innerHTML = `
    <h3>${ev.label}</h3>
    <p class="meta"><strong>Year:</strong> ${toYear(ev)}</p>
    <p>${ev.summary_short || 'No short summary available.'}</p>
    <p class="meta"><strong>Themes:</strong> ${tags.length ? tags.join(', ') : 'N/A'}</p>
  `;
}

function buildExplanation(a, b) {
  const sharedThemes = (a.themes || []).filter((t) => (b.themes || []).includes(t));
  const yearGap = Math.abs(toYear(a) - toYear(b));
  const sharedText = sharedThemes.length ? `Shared themes: ${sharedThemes.join(', ')}.` : 'No explicit shared themes tagged yet.';
  return `${sharedText} Year gap: ${yearGap} years. Compare institutions, social groups, and outcomes to build a stronger analogy.`;
}

const SESSION_TARGET = 10;

async function init() {
  const eventAEl = document.getElementById('event-a');
  const eventBEl = document.getElementById('event-b');
  const promptEl = document.getElementById('prompt');
  const explanationEl = document.getElementById('explanation');
  const modeEl = document.getElementById('mode');
  const nextBtn = document.getElementById('next-btn');
  const progressEl = document.getElementById('session-progress');
  const summaryEl = document.getElementById('session-summary');
  const summaryScoreEl = document.getElementById('summary-score');
  const retryWeakBtn = document.getElementById('retry-weak-items');
  const feedbackEl = document.getElementById('feedback');

  const events = await loadEvents();
  const results = [];
  let questionIndex = 0;
  let currentPair = null;

  function updateProgress() {
    progressEl.textContent = `${Math.min(questionIndex + 1, SESSION_TARGET)} / ${SESSION_TARGET}`;
  }

  function next() {
    if (questionIndex >= SESSION_TARGET) return;
    const [a, b] = randomPair(events, modeEl.value);
    currentPair = [a, b];
    renderEvent(eventAEl, a);
    renderEvent(eventBEl, b);
    promptEl.textContent = sample(PROMPTS);
    explanationEl.textContent = buildExplanation(a, b);
    feedbackEl.textContent = "Rate your confidence and continue.";
    feedbackEl.className = "meta";
    updateProgress();
  }

  function finishSession() {
    const total = results.length;
    const weak = results.filter((r) => !r.correct || r.confidence !== "easy");
    summaryEl.hidden = false;
    summaryScoreEl.textContent = `${total - weak.length} strong / ${total} total · ${weak.length} weak items`;
    nextBtn.disabled = true;
  }

  document.querySelectorAll("[data-confidence]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!currentPair || questionIndex >= SESSION_TARGET) return;
      const confidence = btn.dataset.confidence;
      const correct = confidence === "easy" || confidence === "unsure";
      results.push({ event_id: currentPair[0].id, correct, confidence });
      feedbackEl.textContent = correct ? "Saved. Keep going." : "Saved as weak item for review.";
      feedbackEl.className = correct ? "feedback-correct" : "feedback-incorrect";
      questionIndex += 1;
      if (questionIndex >= SESSION_TARGET) {
        finishSession();
      } else {
        next();
      }
    });
  });

  retryWeakBtn.addEventListener("click", () => {
    questionIndex = 0;
    results.length = 0;
    summaryEl.hidden = true;
    nextBtn.disabled = false;
    next();
  });

  nextBtn.addEventListener('click', next);
  modeEl.addEventListener('change', next);
  next();
}

init().catch((error) => {
  document.body.innerHTML = `<main style="font-family:system-ui;padding:16px;"><h1>Historical Comparison</h1><p>Failed to load data.</p><pre>${error.message}</pre></main>`;
});
