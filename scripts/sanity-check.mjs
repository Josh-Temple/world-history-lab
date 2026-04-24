import { readFile } from "node:fs/promises";

async function readJson(path) {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

function sampleEvent(events) {
  return events[Math.floor(Math.random() * events.length)];
}

async function main() {
  const events = await readJson("data/events.json");
  const unitRegistry = await readJson("data/units/index.json");

  if (!Array.isArray(events) || events.length === 0) {
    throw new Error("Events not array or empty");
  }

  if (!unitRegistry || !Array.isArray(unitRegistry.units)) {
    throw new Error("Unit registry missing units array");
  }

  const eventMap = new Map(events.map((event) => [event.id, event]));
  if (eventMap.size !== events.length) {
    throw new Error("Duplicate event ids found while building map");
  }

  const units = [];
  for (const entry of unitRegistry.units) {
    if (!entry || typeof entry.path !== "string") {
      throw new Error("Invalid unit registry entry");
    }
    const unit = await readJson(entry.path);
    units.push(unit);
  }

  for (let i = 0; i < 20; i += 1) {
    const event = sampleEvent(events);
    if (!event || typeof event.id !== "string") {
      throw new Error("Sampling produced invalid event");
    }

    const effects = Array.isArray(event.effects) ? event.effects : [];
    for (const effectRef of effects) {
      const targetId = typeof effectRef === "string"
        ? effectRef
        : (effectRef && typeof effectRef === "object" ? effectRef.event_id : null);

      if (typeof targetId !== "string") {
        continue;
      }

      if (!eventMap.has(targetId)) {
        throw new Error(`Broken effect: ${event.id} -> ${targetId}`);
      }
    }
  }

  for (const unit of units) {
    if (!Array.isArray(unit.event_ids) || unit.event_ids.length === 0) {
      throw new Error(`Empty unit: ${unit.id || "unknown"}`);
    }

    for (const eventId of unit.event_ids) {
      if (!eventMap.has(eventId)) {
        throw new Error(`Unit ${unit.id} references missing event: ${eventId}`);
      }
    }
  }

  console.log(`Sanity check passed (${events.length} events, ${units.length} units)`);
}

main().catch((error) => {
  console.error(`[sanity-check] Failed: ${error.message}`);
  process.exitCode = 1;
});
