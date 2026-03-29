import { getAllEvents, getUnitById, getUnits } from "../../../shared/data-store.js";

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

async function resolveUnits() {
  const unitsIndex = await getUnits();
  const unitIds = unitsIndex
    .map((entry) => (entry && typeof entry.id === "string" ? entry.id : null))
    .filter(Boolean);

  const unitResults = await Promise.allSettled(unitIds.map((unitId) => getUnitById(unitId)));
  const units = [];

  for (const result of unitResults) {
    if (result.status !== "fulfilled") {
      console.warn("[Timeline Trainer] Skipping unit due to load error:", result.reason?.message || result.reason);
      continue;
    }

    if (!result.value) {
      continue;
    }

    try {
      assertUnitShape(result.value, result.value.id || "unit");
      units.push(result.value);
    } catch (error) {
      console.warn("[Timeline Trainer] Skipping invalid unit shape:", error?.message || error);
    }
  }

  return units;
}

export async function loadTimelineSeedData() {
  const events = await getAllEvents();
  assertEventShape(events);

  const units = await resolveUnits();
  if (units.length === 0) {
    throw new Error("No valid unit files could be loaded.");
  }

  return { events, units };
}
