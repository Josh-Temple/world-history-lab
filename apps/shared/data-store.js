let eventsCache = null;
let unitsIndexCache = null;
let unitFilesCache = null;
let peopleCache = null;
let metadataCache = null;
let tagClustersCache = null;
let eventUnitMapCache = null;

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

export async function getMetadata() {
  if (metadataCache) return metadataCache;
  metadataCache = await fetchJson("/data/metadata.json", "metadata");
  return metadataCache;
}

function buildCurriculumMap(metadata) {
  const rows = Array.isArray(metadata?.curriculum?.units) ? metadata.curriculum.units : [];
  const map = new Map();

  const sanitizeStringList = (value) => (Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.length > 0)
    : []);

  for (const row of rows) {
    if (!row || typeof row.id !== "string") continue;
    map.set(row.id, {
      order: Number.isFinite(row.order) ? row.order : Number.MAX_SAFE_INTEGER,
      era: typeof row.era === "string" ? row.era : "",
      difficulty: Number.isFinite(row.difficulty) ? row.difficulty : null,
      prerequisites: sanitizeStringList(row.prerequisites),
      next_units: sanitizeStringList(row.next_units),
    });
  }

  return map;
}

export async function getUnits() {
  if (unitsIndexCache) return unitsIndexCache;

  const [unitsIndex, metadata] = await Promise.all([
    fetchJson("/data/units/index.json", "units index"),
    getMetadata().catch(() => null),
  ]);

  const unitsRaw = Array.isArray(unitsIndex?.units)
    ? unitsIndex.units
    : (Array.isArray(unitsIndex) ? unitsIndex : []);

  const curriculumById = buildCurriculumMap(metadata);

  const units = await Promise.all(
    unitsRaw
      .filter((unit) => unit && typeof unit.id === "string" && typeof unit.path === "string")
      .map(async (entry) => {
        const path = `/${String(entry.path).replace(/^\/+/, "")}`;
        let unitFile = null;
        try {
          unitFile = await fetchJson(path, `unit ${entry.id}`);
        } catch {
          unitFile = null;
        }

        const curriculum = curriculumById.get(entry.id) || {};
        return {
          ...entry,
          title: typeof unitFile?.title === "string" ? unitFile.title : entry.id,
          label: typeof unitFile?.title === "string" ? unitFile.title : entry.id,
          event_ids: Array.isArray(unitFile?.event_ids) ? unitFile.event_ids : [],
          order: Number.isFinite(curriculum.order) ? curriculum.order : Number.MAX_SAFE_INTEGER,
          era: typeof curriculum.era === "string" ? curriculum.era : "",
          difficulty: Number.isFinite(curriculum.difficulty) ? curriculum.difficulty : null,
          prerequisites: Array.isArray(curriculum.prerequisites) ? curriculum.prerequisites : [],
          next_units: Array.isArray(curriculum.next_units) ? curriculum.next_units : [],
        };
      })
  );

  unitsIndexCache = units.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });

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

export async function getEventUnitMap() {
  if (eventUnitMapCache) return eventUnitMapCache;

  const units = await getUnits();
  const map = new Map();

  for (const unit of units) {
    const ids = Array.isArray(unit?.event_ids) ? unit.event_ids : [];
    for (const eventId of ids) {
      if (typeof eventId === "string" && eventId.length > 0 && !map.has(eventId)) {
        map.set(eventId, unit.id);
      }
    }
  }

  eventUnitMapCache = map;
  return eventUnitMapCache;
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

export async function getTagClusters() {
  if (tagClustersCache) return tagClustersCache;
  const clusters = await fetchJson('/data/derived/tag_clusters.json', 'tag clusters');
  tagClustersCache = (Array.isArray(clusters) ? clusters : [])
    .map((cluster) => Array.isArray(cluster) ? cluster.filter((id) => typeof id === 'string') : [])
    .filter((cluster) => cluster.length >= 2);
  return tagClustersCache;
}

export function getNextUnit(units, currentUnitId) {
  if (!Array.isArray(units) || units.length === 0 || !currentUnitId) return null;

  const currentUnit = units.find((unit) => unit?.id === currentUnitId);
  const nextFromMetadata = currentUnit?.next_units?.find((unitId) => typeof unitId === "string" && unitId.length > 0);
  if (nextFromMetadata) {
    return units.find((unit) => unit?.id === nextFromMetadata) || null;
  }

  const currentIndex = units.findIndex((unit) => unit?.id === currentUnitId);
  if (currentIndex < 0 || currentIndex + 1 >= units.length) return null;
  return units[currentIndex + 1];
}

export function getStoredUnitId() {
  try {
    return localStorage.getItem("selected_unit") || "";
  } catch {
    return "";
  }
}

export function setStoredUnitId(unitId) {
  try {
    localStorage.setItem("selected_unit", unitId || "");
  } catch {
    // ignore storage failures (private browsing / disabled storage)
  }
}
