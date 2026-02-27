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

function assertEventShape(events) {
  if (!Array.isArray(events)) {
    throw new Error("events.json must be a top-level array");
  }
  console.debug(`[Timeline Trainer] Parsed events type=array length=${events.length}`);
}

function assertUnitShape(unit) {
  const isObject = unit !== null && typeof unit === "object" && !Array.isArray(unit);
  if (!isObject) {
    throw new Error("unit JSON must be a top-level object");
  }
  if (!Array.isArray(unit.event_ids)) {
    throw new Error("unit.event_ids must be an array");
  }
  console.debug(
    `[Timeline Trainer] Parsed unit type=object title=${unit.title || "(no title)"} event_ids=${unit.event_ids.length}`
  );
}

export async function loadTimelineSeedData() {
  const eventsUrl = "/data/events.json";
  const unitUrl = "/data/units/french-revolution-napoleon.json";

  const [events, unit] = await Promise.all([
    fetchJson(eventsUrl, "events.json"),
    fetchJson(unitUrl, "french-revolution-napoleon.json"),
  ]);

  assertEventShape(events);
  assertUnitShape(unit);

  return { events, unit };
}
