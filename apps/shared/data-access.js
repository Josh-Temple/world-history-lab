export const REVIEWED_PLUS = new Set(["reviewed", "approved"]);

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

export function filterEvents(events, options = {}) {
  return events.filter((event) => {
    if (options.reviewedOnly && !REVIEWED_PLUS.has(event.status)) {
      return false;
    }
    if (options.unitId && !Array.isArray(event.unit_ids)) {
      return false;
    }
    if (options.unitId && !event.unit_ids.includes(options.unitId)) {
      return false;
    }
    if (typeof options.predicate === "function" && !options.predicate(event)) {
      return false;
    }
    return true;
  });
}
