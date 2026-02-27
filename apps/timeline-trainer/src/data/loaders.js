async function fetchJson(url, label) {
  console.debug(`[Timeline Trainer] Fetching ${label}: ${url}`);
  const response = await fetch(url, { cache: "no-store" });
  console.debug(`[Timeline Trainer] ${label} response status: ${response.status}`);
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`${label}: JSON parse failed (${error.message})`);
  }
}

function appUrl(relativePath) {
  return new URL(relativePath, window.location.href).toString();
}

const UNIT_FILES = [
  "../../data/units/french-revolution-napoleon.json",
  "../../data/units/industrial-revolution.json",
];

function assertEventShape(events) {
  if (!Array.isArray(events)) {
    throw new Error("events.json must be a top-level array");
  }
  console.debug(`[Timeline Trainer] Parsed events type=array length=${events.length}`);
}

function assertUnitShape(unit, label = "unit") {
  const isObject = unit !== null && typeof unit === "object" && !Array.isArray(unit);
  if (!isObject) {
    throw new Error(`${label} JSON must be a top-level object`);
  }
  if (typeof unit.id !== "string" || unit.id.trim().length === 0) {
    throw new Error(`${label}.id must be a non-empty string`);
  }
  if (typeof unit.title !== "string" || unit.title.trim().length === 0) {
    throw new Error(`${label}.title must be a non-empty string`);
  }
  if (!Array.isArray(unit.event_ids) || unit.event_ids.some((eventId) => typeof eventId !== "string")) {
    throw new Error(`${label}.event_ids must be an array of strings`);
  }
  console.debug(`[Timeline Trainer] Parsed unit id=${unit.id} title=${unit.title} event_ids=${unit.event_ids.length}`);
}

export async function loadTimelineSeedData() {
  const eventsUrl = appUrl("../../data/events.json");
  const events = await fetchJson(eventsUrl, "events.json");
  assertEventShape(events);

  const unitResults = await Promise.allSettled(
    UNIT_FILES.map(async (unitFile) => {
      const unitUrl = appUrl(unitFile);
      const unit = await fetchJson(unitUrl, unitFile.split("/").pop() || unitFile);
      assertUnitShape(unit, unitFile);
      return unit;
    })
  );

  const units = [];
  for (const result of unitResults) {
    if (result.status === "fulfilled") {
      units.push(result.value);
      continue;
    }
    console.warn("[Timeline Trainer] Skipping unit file:", result.reason?.message || result.reason);
  }

  if (units.length === 0) {
    throw new Error("No valid unit files could be loaded.");
  }

  return { events, units };
}
