import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const ALLOWED_STATUS = new Set(["draft", "reviewed", "approved"]);
const ALLOWED_CAUSAL_CATEGORIES = new Set([
  "political",
  "economic",
  "social",
  "military",
  "intellectual",
  "technological",
  "cultural",
  "diplomatic",
  "environmental",
]);

async function readJson(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const raw = await readFile(absolutePath, "utf8");
  return JSON.parse(raw);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : null;
}

function describeRecordId(record, fallback) {
  return typeof record?.id === "string" && record.id.trim() !== "" ? record.id : fallback;
}

function validateCausalLinks(event, fieldName, eventIdSet, errors, warnings) {
  const links = event[fieldName];
  if (links === undefined) {
    return;
  }

  if (!Array.isArray(links)) {
    errors.push(`Event ${event.id} has invalid ${fieldName}; expected an array.`);
    return;
  }

  for (const [index, link] of links.entries()) {
    if (typeof link === "string") {
      if (!eventIdSet.has(link)) {
        errors.push(`Event ${event.id} has invalid ${fieldName} reference at index ${index}: ${link}`);
      }
      continue;
    }

    if (!isObject(link)) {
      errors.push(`Event ${event.id} has invalid ${fieldName} entry at index ${index}; expected a string id or object.`);
      continue;
    }

    if (typeof link.event_id === "string" && !eventIdSet.has(link.event_id)) {
      errors.push(`Event ${event.id} has invalid ${fieldName}.event_id at index ${index}: ${link.event_id}`);
    }

    if (typeof link.label !== "string" || link.label.trim() === "") {
      warnings.push(`Event ${event.id} has ${fieldName} entry ${index} without a usable label.`);
    }

    if (link.category !== undefined) {
      if (typeof link.category !== "string" || link.category.trim() === "") {
        warnings.push(`Event ${event.id} has ${fieldName} entry ${index} with an invalid category.`);
      } else if (!ALLOWED_CAUSAL_CATEGORIES.has(link.category)) {
        warnings.push(`Event ${event.id} has ${fieldName} entry ${index} with unexpected category: ${link.category}`);
      }
    }
  }
}

export async function validateData({ log = false } = {}) {
  const errors = [];
  const warnings = [];

  const [events, people, unitRegistry, metadata] = await Promise.all([
    readJson("data/events.json"),
    readJson("data/people.json"),
    readJson("data/units/index.json"),
    readJson("data/metadata.json"),
  ]);

  const eventList = asArray(events);
  const peopleList = asArray(people);

  if (!isObject(metadata)) {
    errors.push("data/metadata.json must be an object.");
  }
  if (!eventList) {
    errors.push("data/events.json must be an array.");
  }
  if (!peopleList) {
    errors.push("data/people.json must be an array.");
  }
  if (!isObject(unitRegistry) || !Array.isArray(unitRegistry.units)) {
    errors.push("data/units/index.json must be an object with a units array.");
  }

  const personIdSet = new Set();
  if (peopleList) {
    for (const [index, person] of peopleList.entries()) {
      if (!isObject(person)) {
        errors.push(`people[${index}] must be an object.`);
        continue;
      }
      if (typeof person.id !== "string" || person.id.trim() === "") {
        errors.push(`people[${index}] must include a non-empty id.`);
        continue;
      }
      if (personIdSet.has(person.id)) {
        errors.push(`Duplicate person id found: ${person.id}`);
      }
      personIdSet.add(person.id);
      if (!person.id.startsWith("pe_")) {
        warnings.push(`Person id does not use pe_ prefix: ${person.id}`);
      }
    }
  }

  const eventIdSet = new Set();
  const eventSourcePath = "data/events.json";
  if (eventList) {
    for (const [index, event] of eventList.entries()) {
      if (!isObject(event)) {
        errors.push(`events[${index}] must be an object.`);
        continue;
      }

      const eventLabel = describeRecordId(event, `[index ${index}]`);
      if (typeof event.id !== "string" || event.id.trim() === "") {
        errors.push(`${eventSourcePath} events[${index}] must include a non-empty id.`);
      } else {
        if (eventIdSet.has(event.id)) {
          errors.push(`Duplicate event id found in ${eventSourcePath}: ${event.id}`);
        }
        eventIdSet.add(event.id);
        if (!event.id.startsWith("ev_")) {
          warnings.push(`Event id does not use ev_ prefix: ${event.id}`);
        }
      }

      if (typeof event.label !== "string" || event.label.trim() === "") {
        errors.push(`${eventSourcePath} event ${eventLabel} is missing a valid label.`);
      }
      if (!isObject(event.time) || typeof event.time.year_start !== "number") {
        errors.push(`${eventSourcePath} event ${eventLabel} must include time.year_start as a number.`);
      }
      if (typeof event.status !== "string" || !ALLOWED_STATUS.has(event.status)) {
        errors.push(`Event ${eventLabel} has invalid status: ${String(event.status)}`);
      }
      if (typeof event.summary_short !== "string" || event.summary_short.trim() === "") {
        warnings.push(`Event ${eventLabel} is missing summary_short.`);
      }

      if (event.people_ids !== undefined) {
        if (!Array.isArray(event.people_ids)) {
          errors.push(`Event ${eventLabel} has invalid people_ids; expected an array of person ids.`);
        } else {
          const peopleIdsSeen = new Set();
          for (const personId of event.people_ids) {
            if (typeof personId !== "string") {
              errors.push(`Event ${eventLabel} has a non-string people_ids entry.`);
              continue;
            }
            if (peopleIdsSeen.has(personId)) {
              errors.push(`Event ${eventLabel} includes duplicate people_ids entry: ${personId}`);
            }
            peopleIdsSeen.add(personId);
            if (!personIdSet.has(personId)) {
              errors.push(`Event ${eventLabel} references unknown person id in people_ids: ${personId}`);
            }
          }
        }
      }
    }

    if (eventIdSet.size !== eventList.length) {
      errors.push(`Duplicate event IDs detected in ${eventSourcePath}: expected ${eventList.length} unique ids but found ${eventIdSet.size}.`);
    }
  }

  if (eventList) {
    for (const event of eventList) {
      if (!isObject(event) || typeof event.id !== "string" || event.id.trim() === "") {
        continue;
      }
      validateCausalLinks(event, "effects", eventIdSet, errors, warnings);
      validateCausalLinks(event, "causes", eventIdSet, errors, warnings);
    }
  }

  for (const personId of personIdSet) {
    if (eventIdSet.has(personId)) {
      errors.push(`Duplicate ID found across events and people: ${personId}`);
    }
  }

  let unitsCount = 0;
  const usedEventIds = new Set();
  if (isObject(unitRegistry) && Array.isArray(unitRegistry.units)) {
    unitsCount = unitRegistry.units.length;
    for (const [index, unitEntry] of unitRegistry.units.entries()) {
      if (!isObject(unitEntry) || typeof unitEntry.path !== "string" || unitEntry.path.trim() === "") {
        errors.push(`units[${index}] in data/units/index.json must include a non-empty path.`);
        continue;
      }

      let unit;
      try {
        unit = await readJson(unitEntry.path);
      } catch (error) {
        errors.push(`Unable to read unit file ${unitEntry.path}: ${error.message}`);
        continue;
      }

      if (!isObject(unit)) {
        errors.push(`${unitEntry.path} must contain an object.`);
        continue;
      }
      if (!Array.isArray(unit.event_ids)) {
        errors.push(`${unitEntry.path} must include event_ids as an array.`);
        continue;
      }

      const unitId = describeRecordId(unit, unitEntry.path);
      const unitEventIdSet = new Set();
      for (const eventId of unit.event_ids) {
        if (typeof eventId !== "string") {
          errors.push(`${unitEntry.path} contains a non-string event id reference.`);
          continue;
        }
        if (unitEventIdSet.has(eventId)) {
          errors.push(`Unit ${unitId} includes duplicate event id: ${eventId}`);
        }
        unitEventIdSet.add(eventId);
        usedEventIds.add(eventId);
        if (!eventIdSet.has(eventId)) {
          errors.push(`Unit ${unitId} (${unitEntry.path}) references missing event ${eventId} in ${eventSourcePath}`);
        }
      }
    }
  }

  for (const eventId of eventIdSet) {
    if (!usedEventIds.has(eventId)) {
      warnings.push(`Unused event id in ${eventSourcePath}: ${eventId}`);
    }
  }

  if (isObject(metadata) && isObject(unitRegistry) && Array.isArray(unitRegistry.units)) {
    const scopeUnits = asArray(metadata?.scope?.included_units);
    if (!scopeUnits) {
      errors.push("data/metadata.json scope.included_units must be an array.");
    } else {
      const registryUnitIds = unitRegistry.units
        .map((unit) => (isObject(unit) ? unit.id : null))
        .filter((id) => typeof id === "string");

      const scopeSet = new Set(scopeUnits);
      for (const registryId of registryUnitIds) {
        if (!scopeSet.has(registryId)) {
          errors.push(`metadata scope missing registered unit: ${registryId}`);
        }
      }
      for (const scopeId of scopeUnits) {
        if (!registryUnitIds.includes(scopeId)) {
          errors.push(`metadata scope includes unknown unit id: ${scopeId}`);
        }
      }
    }
  }

  const summary = {
    events: eventList ? eventList.length : 0,
    people: peopleList ? peopleList.length : 0,
    units: unitsCount,
    warnings,
    errors,
  };

  if (log) {
    for (const warning of warnings) {
      console.warn(`[validate-data] Warning: ${warning}`);
    }
    if (errors.length > 0) {
      for (const error of errors) {
        console.error(`[validate-data] Error: ${error}`);
      }
    }
    if (errors.length === 0) {
      console.log("Dataset validation passed");
      console.log(`events: ${summary.events}`);
      console.log(`people: ${summary.people}`);
      console.log(`units: ${summary.units}`);
      if (warnings.length > 0) {
        console.log(`warnings: ${warnings.length}`);
      }
    }
  }

  return summary;
}

async function runCli() {
  try {
    const summary = await validateData({ log: true });
    if (summary.errors.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`[validate-data] Failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
