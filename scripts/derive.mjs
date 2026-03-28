import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateData } from "./validate-data.mjs";

const ROOT = process.cwd();
const DERIVED_DIR = path.join(ROOT, "derived");

const FALLBACK_UNIT_FILES = [
  { id: "unit_french_revolution_napoleon", path: "data/units/french-revolution-napoleon.json" },
  { id: "unit_industrial_revolution", path: "data/units/industrial-revolution.json" },
  { id: "unit_meiji_restoration", path: "data/units/meiji-restoration.json" },
];

function toJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJson(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const raw = await readFile(absolutePath, "utf8");
  return JSON.parse(raw);
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toSortKey(year, month, day) {
  return (year * 10000) + (month * 100) + day;
}

function parseYearString(value) {
  if (/^\d{4}$/.test(value)) {
    const year = Number(value);
    return {
      sort_start: toSortKey(year, 1, 1),
      sort_end: toSortKey(year, 12, 31),
      derived_precision: "year",
      derived_certainty: "exact",
      canonical_start: value,
      canonical_end: value,
      year_start: year,
    };
  }
  return null;
}

function parseYearMonthString(value) {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return null;
  }

  return {
    sort_start: toSortKey(year, month, 1),
    sort_end: toSortKey(year, month, lastDayOfMonth(year, month)),
    derived_precision: "month",
    derived_certainty: "exact",
    canonical_start: value,
    canonical_end: value,
    year_start: year,
  };
}

function parseDateString(value) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) {
    return null;
  }
  if (day < 1 || day > lastDayOfMonth(year, month)) {
    return null;
  }

  return {
    sort_start: toSortKey(year, month, day),
    sort_end: toSortKey(year, month, day),
    derived_precision: "day",
    derived_certainty: "exact",
    canonical_start: value,
    canonical_end: value,
    year_start: year,
  };
}

function parseYearRangeString(value) {
  const match = value.match(/^(\d{4})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (endYear < startYear) {
    return null;
  }

  return {
    sort_start: toSortKey(startYear, 1, 1),
    sort_end: toSortKey(endYear, 12, 31),
    derived_precision: "range",
    derived_certainty: "exact",
    canonical_start: String(startYear),
    canonical_end: String(endYear),
    year_start: startYear,
  };
}

function parseApproxYearString(value) {
  const match = value.match(/^(\d{4})~$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  return {
    sort_start: toSortKey(year, 1, 1),
    sort_end: toSortKey(year, 12, 31),
    derived_precision: "year",
    derived_certainty: "approx",
    canonical_start: value,
    canonical_end: value,
    year_start: year,
  };
}

function parseUncertainYearString(value) {
  const match = value.match(/^(\d{4})\?$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  return {
    sort_start: toSortKey(year, 1, 1),
    sort_end: toSortKey(year, 12, 31),
    derived_precision: "year",
    derived_certainty: "uncertain",
    canonical_start: value,
    canonical_end: value,
    year_start: year,
  };
}

function parseSingleEdtfLike(value) {
  return (
    parseYearRangeString(value)
    || parseDateString(value)
    || parseYearMonthString(value)
    || parseApproxYearString(value)
    || parseUncertainYearString(value)
    || parseYearString(value)
  );
}

function parseEventTime(event) {
  const time = event.time || {};

  if (typeof time.start === "string" || typeof time.end === "string") {
    const startRaw = typeof time.start === "string" ? time.start : null;
    const endRaw = typeof time.end === "string" ? time.end : startRaw;

    if (startRaw && !endRaw) {
      const single = parseSingleEdtfLike(startRaw);
      if (single) {
        return single;
      }
      return null;
    }

    if (startRaw && endRaw && startRaw.includes("/") && !time.end) {
      const range = parseYearRangeString(startRaw);
      if (range) {
        return range;
      }
    }

    const startParsed = startRaw ? parseSingleEdtfLike(startRaw) : null;
    const endParsed = endRaw ? parseSingleEdtfLike(endRaw) : null;
    if (!startParsed || !endParsed) {
      return null;
    }

    const precision = time.precision || (startRaw === endRaw ? startParsed.derived_precision : "range");
    const certainty = time.certainty || (startParsed.derived_certainty === "exact" && endParsed.derived_certainty === "exact"
      ? "exact"
      : startParsed.derived_certainty);

    return {
      sort_start: startParsed.sort_start,
      sort_end: endParsed.sort_end,
      derived_precision: precision,
      derived_certainty: certainty,
      canonical_start: startRaw,
      canonical_end: endRaw,
      year_start: startParsed.year_start,
    };
  }

  if (typeof time.year_start === "number") {
    const year = time.year_start;
    return {
      sort_start: toSortKey(year, 1, 1),
      sort_end: toSortKey(year, 12, 31),
      derived_precision: "year",
      derived_certainty: "exact",
      canonical_start: String(year),
      canonical_end: String(year),
      year_start: year,
    };
  }

  return null;
}

function validateEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new Error("Each event must be an object");
  }
  if (typeof event.id !== "string" || event.id.trim() === "") {
    throw new Error("Each event must include a non-empty id");
  }
  if (typeof event.label !== "string" || event.label.trim() === "") {
    throw new Error(`Event ${event.id}: label is required`);
  }

  const hasYearStart = typeof event.time?.year_start === "number";
  const hasStart = typeof event.time?.start === "string";
  if (!hasYearStart && !hasStart) {
    throw new Error(`Event ${event.id}: requires time.year_start or time.start`);
  }
}

function validatePeople(people) {
  const personIdSet = new Set();
  for (const person of people) {
    if (!person || typeof person !== "object" || Array.isArray(person)) {
      throw new Error("Each person must be an object");
    }
    if (typeof person.id !== "string" || person.id.trim() === "") {
      throw new Error("Each person must include a non-empty id");
    }
    if (personIdSet.has(person.id)) {
      throw new Error(`Duplicate person id: ${person.id}`);
    }
    personIdSet.add(person.id);
  }
  return personIdSet;
}

function validateCrossReferences({ events, eventIdSet, peopleIdSet, units }) {
  for (const unit of units) {
    for (const eventId of unit.event_ids) {
      if (!eventIdSet.has(eventId)) {
        throw new Error(`Invalid event_id in unit ${unit.id}: ${eventId}`);
      }
    }
  }

  for (const event of events) {
    const effectIds = Array.isArray(event.effects) ? event.effects : [];
    for (const effectRef of effectIds) {
      if (typeof effectRef === "string") {
        if (!eventIdSet.has(effectRef)) {
          throw new Error(`Invalid effect reference in ${event.id}: ${effectRef}`);
        }
        continue;
      }

      if (effectRef && typeof effectRef === "object" && Object.hasOwn(effectRef, "event_id")) {
        if (typeof effectRef.event_id !== "string" || effectRef.event_id.trim() === "") {
          throw new Error(`Invalid effect reference format in ${event.id}: ${JSON.stringify(effectRef)}`);
        }
        if (!eventIdSet.has(effectRef.event_id)) {
          throw new Error(`Invalid effect reference in ${event.id}: ${effectRef.event_id}`);
        }
      }
    }

    const eventPeopleIds = Array.isArray(event.people_ids) ? event.people_ids : [];
    for (const personId of eventPeopleIds) {
      if (!peopleIdSet.has(personId)) {
        throw new Error(`Invalid people_id in ${event.id}: ${personId}`);
      }
    }
  }
}

function buildUnitIdsByEventId(units) {
  const unitIdsByEventId = new Map();
  for (const unit of units) {
    for (const eventId of unit.event_ids) {
      if (!unitIdsByEventId.has(eventId)) {
        unitIdsByEventId.set(eventId, []);
      }
      unitIdsByEventId.get(eventId).push(unit.id);
    }
  }

  for (const unitIds of unitIdsByEventId.values()) {
    unitIds.sort();
  }

  return unitIdsByEventId;
}

function normalizeEvent(event, unitIdsByEventId = new Map()) {
  const parsed = parseEventTime(event);
  if (!parsed) {
    if (typeof event.time?.year_start === "number") {
      const year = event.time.year_start;
      console.warn(`[derive] Unsupported time string for event ${event.id}; falling back to year_start=${year}`);
      return {
        id: event.id,
        label: event.label,
        summary_short: typeof event.summary_short === "string" ? event.summary_short : null,
        status: typeof event.status === "string" ? event.status : null,
        category: typeof event.category === "string" ? event.category : null,
        importance: Number.isFinite(event.importance) ? event.importance : null,
        location: event.location && typeof event.location === "object" ? event.location : null,
        question_types: Array.isArray(event.question_types) ? event.question_types : [],
        people_ids: Array.isArray(event.people_ids) ? event.people_ids : [],
        unit_ids: unitIdsByEventId.get(event.id) || [],
        effects: Array.isArray(event.effects) ? event.effects : [],
        causes: Array.isArray(event.causes) ? event.causes : [],
        time: {
          start: String(year),
          end: String(year),
          year_start: year,
          calendar: event.time?.calendar || "gregorian",
        },
        derived: {
          sort_start: toSortKey(year, 1, 1),
          sort_end: toSortKey(year, 12, 31),
          derived_precision: "year",
          derived_certainty: "exact",
          year_start: year,
        },
      };
    }

    console.warn(`[derive] Excluding event ${event.id}: unsupported time format and no fallback year_start.`);
    return null;
  }

  return {
    id: event.id,
    label: event.label,
    summary_short: typeof event.summary_short === "string" ? event.summary_short : null,
    status: typeof event.status === "string" ? event.status : null,
    category: typeof event.category === "string" ? event.category : null,
    importance: Number.isFinite(event.importance) ? event.importance : null,
    location: event.location && typeof event.location === "object" ? event.location : null,
    question_types: Array.isArray(event.question_types) ? event.question_types : [],
    people_ids: Array.isArray(event.people_ids) ? event.people_ids : [],
    unit_ids: unitIdsByEventId.get(event.id) || [],
    effects: Array.isArray(event.effects) ? event.effects : [],
    causes: Array.isArray(event.causes) ? event.causes : [],
    time: {
      start: parsed.canonical_start,
      end: parsed.canonical_end,
      year_start: typeof event.time?.year_start === "number" ? event.time.year_start : parsed.year_start,
      calendar: event.time?.calendar || "gregorian",
    },
    derived: {
      sort_start: parsed.sort_start,
      sort_end: parsed.sort_end,
      derived_precision: parsed.derived_precision,
      derived_certainty: parsed.derived_certainty,
      year_start: typeof event.time?.year_start === "number" ? event.time.year_start : parsed.year_start,
    },
  };
}

function buildEventsByYear(normalizedEvents) {
  const byYear = {};
  for (const event of normalizedEvents) {
    const year = event.derived.year_start;
    if (typeof year !== "number") {
      continue;
    }
    const key = String(year);
    if (!byYear[key]) {
      byYear[key] = [];
    }
    byYear[key].push(event.id);
  }

  for (const ids of Object.values(byYear)) {
    ids.sort();
  }

  return Object.fromEntries(
    Object.entries(byYear).sort((a, b) => Number(a[0]) - Number(b[0]))
  );
}

function buildEventsSorted(normalizedEvents) {
  return normalizedEvents
    .slice()
    .sort((a, b) => (a.derived.sort_start - b.derived.sort_start) || a.id.localeCompare(b.id))
    .map((event) => event.id);
}

function buildUnitEventPool(units, canonicalEventLookup, normalizedEventLookup, enabledQuestionTypeSet) {
  const pool = {};

  for (const unit of units) {
    const eligibleIds = {};

    for (const eventId of unit.event_ids) {
      const event = canonicalEventLookup.get(eventId);
      const normalized = normalizedEventLookup.get(eventId);
      if (!event || !normalized) {
        continue;
      }

      if (typeof normalized.derived?.year_start !== "number") {
        continue;
      }

      const questionTypes = Array.isArray(event.question_types) ? event.question_types : [];
      for (const type of questionTypes) {
        if (!enabledQuestionTypeSet.has(type)) {
          continue;
        }

        if (!eligibleIds[type]) {
          eligibleIds[type] = [];
        }
        eligibleIds[type].push(eventId);
      }
    }

    const orderedEligible = Object.fromEntries(
      Object.entries(eligibleIds)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([type, ids]) => [type, Array.from(new Set(ids)).sort()])
    );

    pool[unit.id] = { eligible_ids: orderedEligible };
  }

  return pool;
}

function getEffectEventId(effectRef) {
  if (typeof effectRef === "string") {
    return effectRef;
  }

  if (effectRef && typeof effectRef === "object" && typeof effectRef.event_id === "string") {
    return effectRef.event_id;
  }

  return null;
}

function buildCausalityChains(events, minLength = 3, maxLength = 5) {
  const eventIdSet = new Set(events.map((event) => event.id));
  const graph = new Map();

  for (const event of events) {
    const next = (Array.isArray(event.effects) ? event.effects : [])
      .map(getEffectEventId)
      .filter((eventId) => typeof eventId === "string" && eventIdSet.has(eventId));
    graph.set(event.id, Array.from(new Set(next)).sort());
  }

  const encodedChains = new Set();

  function dfs(currentId, path) {
    if (path.length >= minLength) {
      encodedChains.add(path.join(","));
    }

    if (path.length >= maxLength) {
      return;
    }

    const nextIds = graph.get(currentId) || [];
    for (const nextId of nextIds) {
      if (path.includes(nextId)) {
        continue;
      }
      dfs(nextId, [...path, nextId]);
    }
  }

  for (const event of events) {
    dfs(event.id, [event.id]);
  }

  return Array.from(encodedChains)
    .map((encoded) => encoded.split(","))
    .filter((chain) => chain.length >= minLength && chain.length <= maxLength)
    .sort((a, b) => {
      if (a.length !== b.length) {
        return a.length - b.length;
      }
      return a.join(",").localeCompare(b.join(","));
    });
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function validateUnitSchema(unit, sourcePath) {
  assertArray(unit.regions, `${sourcePath}: unit.regions`);
  if (unit.regions.length === 0) {
    throw new Error(`${sourcePath}: unit.regions must contain at least one region id`);
  }
  for (const region of unit.regions) {
    if (typeof region !== "string") {
      throw new Error(`${sourcePath}: unit.regions must be an array of strings`);
    }
    if (!region.startsWith("reg_")) {
      throw new Error(`${sourcePath}: invalid region id \"${region}\" (expected reg_* format)`);
    }
  }

  assertObject(unit.app_profiles, `${sourcePath}: unit.app_profiles`);
  if (!Object.hasOwn(unit.app_profiles, "timeline-trainer")) {
    throw new Error(`${sourcePath}: unit.app_profiles.timeline-trainer is required`);
  }

  for (const [appId, profile] of Object.entries(unit.app_profiles)) {
    assertObject(profile, `${sourcePath}: unit.app_profiles.${appId}`);
    if (typeof profile.enabled !== "boolean") {
      throw new Error(`${sourcePath}: unit.app_profiles.${appId}.enabled must be a boolean`);
    }
  }
}

async function loadUnits() {
  let registry;

  try {
    registry = await readJson("data/units/index.json");
  } catch {
    registry = { units: FALLBACK_UNIT_FILES };
    console.warn("[derive] data/units/index.json not found. Using fallback unit list.");
  }

  if (!registry || !Array.isArray(registry.units)) {
    throw new Error("data/units/index.json must contain { units: [] }");
  }

  const units = [];
  const unitIdSet = new Set();
  for (const entry of registry.units) {
    if (!entry || typeof entry.path !== "string") {
      throw new Error("Each unit registry entry must include a path string");
    }

    const unit = await readJson(entry.path);
    if (!unit || typeof unit !== "object" || Array.isArray(unit)) {
      throw new Error(`${entry.path} must be a top-level object`);
    }
    if (typeof unit.id !== "string" || unit.id.trim() === "") {
      throw new Error(`${entry.path}: unit.id must be a non-empty string`);
    }
    if (typeof unit.title !== "string" || unit.title.trim() === "") {
      throw new Error(`${entry.path}: unit.title must be a non-empty string`);
    }
    if (!Array.isArray(unit.event_ids) || unit.event_ids.some((id) => typeof id !== "string")) {
      throw new Error(`${entry.path}: unit.event_ids must be an array of strings`);
    }
    if (unitIdSet.has(unit.id)) {
      throw new Error(`${entry.path}: duplicate unit.id \"${unit.id}\"`);
    }
    unitIdSet.add(unit.id);

    const uniqueEventIds = new Set(unit.event_ids);
    if (uniqueEventIds.size !== unit.event_ids.length) {
      throw new Error(`${entry.path}: unit.event_ids contains duplicates`);
    }

    validateUnitSchema(unit, entry.path);
    units.push(unit);
  }

  return units;
}

async function main() {
  const validationSummary = await validateData({ log: true });
  if (validationSummary.errors.length > 0) {
    throw new Error(`Dataset validation failed with ${validationSummary.errors.length} error(s).`);
  }

  const metadata = await readJson("data/metadata.json");
  const enabledQuestionTypes = metadata?.app_support?.enabled_question_types;
  if (!Array.isArray(enabledQuestionTypes)) {
    throw new Error("data/metadata.json must contain app_support.enabled_question_types as an array");
  }
  const enabledQuestionTypeSet = new Set(enabledQuestionTypes);

  const events = await readJson("data/events.json");
  assertArray(events, "data/events.json");

  const people = await readJson("data/people.json");
  assertArray(people, "data/people.json");
  const peopleIdSet = validatePeople(people);

  const units = await loadUnits();

  const unitIdsByEventId = buildUnitIdsByEventId(units);

  const normalizedEvents = [];
  const eventLookup = new Map();
  const eventIdSet = new Set();
  for (const event of events) {
    validateEvent(event);
    if (eventLookup.has(event.id)) {
      throw new Error(`Duplicate event id: ${event.id}`);
    }
    eventLookup.set(event.id, event);
    eventIdSet.add(event.id);

    const normalized = normalizeEvent(event, unitIdsByEventId);
    if (normalized) {
      normalizedEvents.push(normalized);
    }
  }

  validateCrossReferences({ events, eventIdSet, peopleIdSet, units });

  normalizedEvents.sort((a, b) => a.id.localeCompare(b.id));
  const normalizedEventLookup = new Map(normalizedEvents.map((event) => [event.id, event]));

  const eventsByYear = buildEventsByYear(normalizedEvents);
  const eventsSorted = buildEventsSorted(normalizedEvents);
  const unitsIndex = units
    .map((unit) => ({ id: unit.id, title: unit.title, event_ids: unit.event_ids.slice() }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const unitEventPool = buildUnitEventPool(units, eventLookup, normalizedEventLookup, enabledQuestionTypeSet);
  const causalityChains = buildCausalityChains(events);
  const unitEventPoolTypeCount = Object.values(unitEventPool)
    .reduce((acc, item) => acc + Object.keys(item.eligible_ids || {}).length, 0);

  await mkdir(DERIVED_DIR, { recursive: true });
  await writeFile(path.join(DERIVED_DIR, "events.normalized.json"), toJson(normalizedEvents), "utf8");
  await writeFile(path.join(DERIVED_DIR, "index.events_by_year.json"), toJson(eventsByYear), "utf8");
  await writeFile(path.join(DERIVED_DIR, "index.events_sorted.json"), toJson(eventsSorted), "utf8");
  await writeFile(path.join(DERIVED_DIR, "index.units.json"), toJson(unitsIndex), "utf8");
  await writeFile(path.join(DERIVED_DIR, "index.unit_event_pool.json"), toJson(unitEventPool), "utf8");
  await writeFile(path.join(DERIVED_DIR, "causality_chains.json"), toJson(causalityChains), "utf8");

  console.log(
    `[derive] Validation summary: ${events.length} events, ${people.length} people, ${units.length} units. Generated ${normalizedEvents.length} normalized events, ${Object.keys(eventsByYear).length} year buckets, ${unitEventPoolTypeCount} unit/type eligibility pools, and ${causalityChains.length} causality chains in /derived.`
  );
}

main().catch((error) => {
  console.error(`[derive] Failed: ${error.message}`);
  process.exitCode = 1;
});
