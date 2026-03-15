import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const ALLOWED_STATUS = new Set(["draft", "reviewed", "approved"]);

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
  if (eventList) {
    for (const [index, event] of eventList.entries()) {
      if (!isObject(event)) {
        errors.push(`events[${index}] must be an object.`);
        continue;
      }

      if (typeof event.id !== "string" || event.id.trim() === "") {
        errors.push(`events[${index}] must include a non-empty id.`);
      } else {
        if (eventIdSet.has(event.id)) {
          errors.push(`Duplicate event id found: ${event.id}`);
        }
        eventIdSet.add(event.id);
        if (!event.id.startsWith("ev_")) {
          warnings.push(`Event id does not use ev_ prefix: ${event.id}`);
        }
      }

      if (typeof event.label !== "string" || event.label.trim() === "") {
        errors.push(`Event ${event.id || `[index ${index}]`} is missing a valid label.`);
      }

      if (!isObject(event.time) || typeof event.time.year_start !== "number") {
        errors.push(`Event ${event.id || `[index ${index}]`} must include time.year_start as a number.`);
      }

      if (typeof event.status !== "string" || !ALLOWED_STATUS.has(event.status)) {
        errors.push(`Event ${event.id || `[index ${index}]`} has invalid status: ${String(event.status)}`);
      }

      if (event.people_ids !== undefined) {
        if (!Array.isArray(event.people_ids)) {
          errors.push(`Event ${event.id || `[index ${index}]`} has invalid people_ids; expected an array of person ids.`);
        } else {
          for (const personId of event.people_ids) {
            if (typeof personId !== "string") {
              errors.push(`Event ${event.id || `[index ${index}]`} has a non-string people_ids entry.`);
              continue;
            }
            if (!personIdSet.has(personId)) {
              errors.push(`Event ${event.id || `[index ${index}]`} references unknown person id in people_ids: ${personId}`);
            }
          }
        }
      }
    }
  }

  let unitsCount = 0;
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

      for (const eventId of unit.event_ids) {
        if (typeof eventId !== "string") {
          errors.push(`${unitEntry.path} contains a non-string event id reference.`);
          continue;
        }

        if (!eventIdSet.has(eventId)) {
          errors.push(`Missing event reference: ${unit.id || unitEntry.path} -> ${eventId}`);
        }
      }
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
