import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

async function readJson(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const raw = await readFile(absolutePath, "utf8");
  return JSON.parse(raw);
}

function assertArray(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array.`);
    return false;
  }
  return true;
}

function assertObject(value, label, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${label} must be an object.`);
    return false;
  }
  return true;
}

async function validate() {
  const errors = [];

  const metadata = await readJson("data/metadata.json");
  if (!assertObject(metadata, "data/metadata.json", errors)) {
    return errors;
  }

  const enabledTypes = metadata.app_support?.enabled_question_types;
  if (!assertArray(enabledTypes, "data/metadata.json app_support.enabled_question_types", errors)) {
    return errors;
  }
  const enabledTypeSet = new Set(enabledTypes);

  const statusValues = metadata.content_policy?.status_values;
  if (!assertArray(statusValues, "data/metadata.json content_policy.status_values", errors)) {
    return errors;
  }
  const statusSet = new Set(statusValues);

  const events = await readJson("data/events.json");
  if (!assertArray(events, "data/events.json", errors)) {
    return errors;
  }

  const eventIdSet = new Set();
  for (const event of events) {
    if (!assertObject(event, "event", errors)) {
      continue;
    }

    if (typeof event.id !== "string" || event.id.trim() === "") {
      errors.push("Every event must include a non-empty id.");
      continue;
    }

    if (eventIdSet.has(event.id)) {
      errors.push(`Duplicate event id found: ${event.id}`);
    }
    eventIdSet.add(event.id);

    if (typeof event.status !== "string" || !statusSet.has(event.status)) {
      errors.push(`Event ${event.id} has invalid status: ${String(event.status)}`);
    }

    if (!Array.isArray(event.question_types)) {
      errors.push(`Event ${event.id} must include question_types as an array.`);
      continue;
    }

    for (const type of event.question_types) {
      if (typeof type !== "string") {
        errors.push(`Event ${event.id} includes non-string question type.`);
        continue;
      }
      if (!enabledTypeSet.has(type)) {
        errors.push(`Event ${event.id} uses unknown question type: ${type}`);
      }
    }
  }

  const registry = await readJson("data/units/index.json");
  if (!assertObject(registry, "data/units/index.json", errors)) {
    return errors;
  }

  if (!assertArray(registry.units, "data/units/index.json units", errors)) {
    return errors;
  }

  for (const unitEntry of registry.units) {
    if (!assertObject(unitEntry, "unit registry entry", errors)) {
      continue;
    }

    if (typeof unitEntry.path !== "string" || unitEntry.path.trim() === "") {
      errors.push("Each unit registry entry must include a non-empty path.");
      continue;
    }

    let unit;
    try {
      unit = await readJson(unitEntry.path);
    } catch (error) {
      errors.push(`Missing or invalid unit file at ${unitEntry.path}: ${error.message}`);
      continue;
    }

    if (!assertObject(unit, unitEntry.path, errors)) {
      continue;
    }

    if (!Array.isArray(unit.event_ids)) {
      errors.push(`${unitEntry.path} must include event_ids as an array.`);
      continue;
    }

    for (const eventId of unit.event_ids) {
      if (typeof eventId !== "string" || !eventIdSet.has(eventId)) {
        errors.push(`${unitEntry.path} references unknown event id: ${String(eventId)}`);
      }
    }
  }

  return errors;
}

validate()
  .then((errors) => {
    if (errors.length > 0) {
      for (const error of errors) {
        console.error(`[validate] ${error}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log("[validate] OK");
  })
  .catch((error) => {
    console.error(`[validate] Failed: ${error.message}`);
    process.exitCode = 1;
  });
