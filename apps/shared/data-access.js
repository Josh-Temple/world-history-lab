import { filterEvents, REVIEWED_PLUS } from "./event-filters.js";

const DEFAULT_FETCH_TIMEOUT_MS = 10000;

function appUrl(relativePath) {
  return new URL(relativePath, window.location.href).toString();
}

export async function fetchJson(relativePath, label = relativePath, options = {}) {
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetch(appUrl(relativePath), {
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`${label}: request timed out after ${timeoutMs}ms (${relativePath})`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

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
