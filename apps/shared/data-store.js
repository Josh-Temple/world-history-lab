let eventsCache = null;
let unitsIndexCache = null;
let unitFilesCache = null;
let peopleCache = null;

function isValidEvent(event) {
  return Boolean(
    event
    && typeof event.id === "string"
    && typeof event.label === "string"
    && Number.isFinite(event?.time?.year_start)
  );
}

async function fetchJson(path, label) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status}`);
  }
  return response.json();
}

export async function getAllEvents() {
  if (eventsCache) return eventsCache;
  const events = await fetchJson("/data/events.json", "events");
  eventsCache = (Array.isArray(events) ? events : []).filter(isValidEvent);
  return eventsCache;
}

export async function getUnits() {
  if (unitsIndexCache) return unitsIndexCache;
  const unitsIndex = await fetchJson("/data/units/index.json", "units index");
  unitsIndexCache = Array.isArray(unitsIndex?.units)
    ? unitsIndex.units
    : (Array.isArray(unitsIndex) ? unitsIndex : []);
  return unitsIndexCache;
}

export async function getUnitById(unitId) {
  if (!unitId) return null;
  if (!unitFilesCache) {
    unitFilesCache = new Map();
  }
  if (unitFilesCache.has(unitId)) {
    return unitFilesCache.get(unitId);
  }

  const units = await getUnits();
  const entry = units.find((unit) => unit?.id === unitId);
  if (!entry?.path) {
    return null;
  }

  const path = `/${String(entry.path).replace(/^\/+/, "")}`;
  const unit = await fetchJson(path, `unit ${unitId}`);
  unitFilesCache.set(unitId, unit);
  return unit;
}

export async function getEventsForUnit(unitId) {
  if (!unitId) {
    return getAllEvents();
  }

  const [events, unit] = await Promise.all([getAllEvents(), getUnitById(unitId)]);
  if (!unit || !Array.isArray(unit.event_ids)) {
    return [];
  }

  const eventIds = new Set(unit.event_ids.filter((id) => typeof id === "string"));
  return events.filter((event) => eventIds.has(event.id));
}

export async function getAllPeople() {
  if (peopleCache) return peopleCache;
  const people = await fetchJson("/data/people.json", "people");
  peopleCache = Array.isArray(people) ? people : [];
  return peopleCache;
}
