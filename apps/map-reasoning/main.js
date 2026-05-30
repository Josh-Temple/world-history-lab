import { fetchJson } from "../shared/data-access.js";
import { mountHeader } from "../shared/header.js";

const promptEl = document.getElementById("prompt");
const feedbackEl = document.getElementById("feedback");
const mapEl = document.getElementById("map");
const markerEl = document.getElementById("marker");
const answerMarkerEl = document.getElementById("answer-marker");
const submitButton = document.getElementById("submit-button");
const nextButton = document.getElementById("next-button");

mountHeader({
  container: document.body,
  mode: "Map Reasoning",
  progress: "Spatial",
});

const state = { pool: [], current: null, selection: null };

function toMapPoint(lat, lon) {
  return {
    x: ((lon + 180) / 360) * 100,
    y: ((90 - lat) / 180) * 100,
  };
}

function showPoint(el, lat, lon) {
  const p = toMapPoint(lat, lon);
  el.style.left = `${Math.max(0, Math.min(100, p.x))}%`;
  el.style.top = `${Math.max(0, Math.min(100, p.y))}%`;
  el.hidden = false;
}

async function loadEvents() {
  return fetchJson('/derived/events.normalized.json', 'normalized events');
}

function normalizeGeo(event) {
  if (event?.geo && Number.isFinite(event.geo.lat) && Number.isFinite(event.geo.lon)) return event.geo;
  if (event?.location && Number.isFinite(event.location.lat) && Number.isFinite(event.location.lon)) {
    return { lat: event.location.lat, lon: event.location.lon, region: event.location.region || "Unknown region" };
  }
  return null;
}

function filterGeo(events) {
  return events
    .map((e) => ({ ...e, geo: normalizeGeo(e) }))
    .filter((e) => e.geo && Number.isFinite(e.geo.lat) && Number.isFinite(e.geo.lon));
}

function pickEvent(events) {
  return events[Math.floor(Math.random() * events.length)];
}

function showPrompt(ev) {
  promptEl.innerText = `Where did this event occur?\n${ev.label}`;
}

function setFeedback(text) {
  feedbackEl.textContent = text;
}

function nextRound() {
  state.current = pickEvent(state.pool);
  state.selection = null;
  markerEl.hidden = true;
  answerMarkerEl.hidden = true;
  setFeedback("Tap the map to place your answer, then submit.");
  showPrompt(state.current);
}

function submitAnswer() {
  if (!state.current || !state.selection) {
    setFeedback("Place a marker on the map first.");
    return;
  }

  showPoint(answerMarkerEl, state.current.geo.lat, state.current.geo.lon);
  const explanation = state.current.geographic_significance
    || `This location mattered due to strategic geography in ${state.current.geo.region || "its region"}.`;
  setFeedback(explanation);
}

mapEl.addEventListener("click", (event) => {
  const rect = mapEl.getBoundingClientRect();
  const xPct = ((event.clientX - rect.left) / rect.width) * 100;
  const yPct = ((event.clientY - rect.top) / rect.height) * 100;
  markerEl.style.left = `${xPct}%`;
  markerEl.style.top = `${yPct}%`;
  markerEl.hidden = false;

  const lon = (xPct / 100) * 360 - 180;
  const lat = 90 - (yPct / 100) * 180;
  state.selection = { lat, lon };
});

submitButton.addEventListener("click", submitAnswer);
nextButton.addEventListener("click", nextRound);

(async function init() {
  try {
    const events = await loadEvents();
    const geoEvents = filterGeo(events);
    state.pool = geoEvents;
    if (!geoEvents.length) {
      setFeedback("No geo-enabled events found.");
      return;
    }
    nextRound();
  } catch (error) {
    promptEl.textContent = "Map data unavailable";
    setFeedback(`Unable to load map reasoning data: ${error.message}`);
  }
})();
