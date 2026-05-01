import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

async function readJson(relativePath) {
  const raw = await readFile(path.join(ROOT, relativePath), 'utf8');
  return JSON.parse(raw);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [events, people, unitsIndex, normalized, sortedIds, causalPairs, eventsByYear] = await Promise.all([
  readJson('data/events.json'),
  readJson('data/people.json'),
  readJson('data/units/index.json'),
  readJson('derived/events.normalized.json'),
  readJson('derived/index.events_sorted.json'),
  readJson('derived/index.causal_pairs.json'),
  readJson('derived/index.events_by_year.json'),
]);

const eventIds = new Set(events.map((e) => e.id));
const peopleIds = new Set(people.map((p) => p.id));
const normalizedIds = new Set(normalized.map((e) => e.id));

assert(normalized.length === eventIds.size, `Normalized event count mismatch: expected ${eventIds.size}, found ${normalized.length}`);

for (const ev of normalized) {
  assert(eventIds.has(ev.id), `Unknown normalized event id: ${ev.id}`);
  assert(Array.isArray(ev.places), `Event ${ev.id} has non-array places`);
  assert(Array.isArray(ev.regions), `Event ${ev.id} has non-array regions`);
  assert(Array.isArray(ev.people_ids), `Event ${ev.id} has non-array people_ids`);
  assert(typeof ev.time?.year_start === 'number', `Event ${ev.id} missing time.year_start`);
  for (const pid of ev.people_ids) {
    assert(peopleIds.has(pid), `Event ${ev.id} references unknown person id: ${pid}`);
  }
}

assert(Array.isArray(sortedIds), 'derived/index.events_sorted.json must be an array');
assert(sortedIds.length === normalized.length, 'events_sorted length mismatch with normalized events');
for (const id of sortedIds) {
  assert(normalizedIds.has(id), `events_sorted has unknown id: ${id}`);
}

for (let i = 1; i < sortedIds.length; i += 1) {
  const prev = normalized.find((e) => e.id === sortedIds[i - 1]);
  const curr = normalized.find((e) => e.id === sortedIds[i]);
  assert(curr.derived.sort_start >= prev.derived.sort_start, `Events not sorted correctly at index ${i - 1} (${prev.id}) -> ${i} (${curr.id})`);
}

for (const pair of causalPairs) {
  assert(eventIds.has(pair.cause_id), `Invalid cause_id: ${pair.cause_id}`);
  assert(eventIds.has(pair.effect_id), `Invalid effect_id: ${pair.effect_id}`);
}

for (const [year, ids] of Object.entries(eventsByYear)) {
  assert(Array.isArray(ids), `events_by_year[${year}] must be an array`);
  for (const id of ids) {
    assert(normalizedIds.has(id), `events_by_year[${year}] has unknown id: ${id}`);
  }
}

for (const unitEntry of unitsIndex.units || []) {
  const unit = await readJson(unitEntry.path);
  for (const id of unit.event_ids || []) {
    assert(eventIds.has(id), `Unit ${unit.id} references missing event ${id}`);
  }
}

console.log('Derived data validation passed');
