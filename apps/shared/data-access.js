import { filterEvents, REVIEWED_PLUS } from "./event-filters.js";

function appUrl(relativePath) {
  return new URL(relativePath, window.location.href).toString();
}

async function fetchJson(relativePath, label) {
  const response = await fetch(appUrl(relativePath), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status}`);
  }
  return response.json();
}

export async function loadDerivedEvents() {
  return fetchJson("../../derived/events.normalized.json", "derived events");
}

export async function loadUnitsIndex() {
  return fetchJson("../../derived/index.units.json", "derived units");
}

export { filterEvents, REVIEWED_PLUS };

export function filterDerivedEvents(events, options = {}) {
  return filterEvents(events, {
    status: options.reviewedOnly ? "reviewed" : options.status,
    unit: options.unitId,
    predicate: options.predicate,
    requireSummary: options.requireSummary,
  });
}
