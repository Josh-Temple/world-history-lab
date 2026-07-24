import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildTimelineAnswerRecord } from "../apps/timeline-trainer/src/logic/answer-recording.js";

function question(count, correctOptionIndex = 0) {
  return { type: count === 2 ? "timeline_before_after" : "timeline_earliest_of_3", correctOptionIndex, options: Array.from({ length: count }, (_, index) => ({ id: `event-${index}` })) };
}
for (const count of [2, 3]) {
  const right = buildTimelineAnswerRecord(question(count), 0, "easy");
  assert.deepEqual(right.masteryUpdates, [{ eventId: "event-0", correct: true }]);
  assert.equal(right.answer.questionType, question(count).type);
  assert.equal(right.answer.selectedItemId, "event-0");
  assert.equal(right.answer.correctItemId, "event-0");
  assert.equal(right.answer.itemIds.length, count);

  const wrong = buildTimelineAnswerRecord(question(count), 1, "unsure");
  assert.deepEqual(wrong.masteryUpdates, [{ eventId: "event-1", correct: false }]);
  assert.equal(wrong.answer.correctItemId, "event-0");
  assert.equal(wrong.answer.selectedItemId, "event-1");
}

const events = JSON.parse(await readFile(new URL("../data/events.json", import.meta.url)));
const forbidden = new Set(["concept_imperial_overstretch", "concept_bureaucratic_centralization", "concept_succession_crisis", "concept_legitimacy_crisis"]);
const industrialIds = new Set(["ev_flying_shuttle_patent_1733", "ev_bridgewater_canal_opens_1761", "ev_spinning_jenny_invented_1764", "ev_water_frame_patent_1769", "ev_watt_condenser_patent_1769"]);
for (const event of events) {
  if (event.primary_skill) assert.ok(event.skills?.includes(event.primary_skill), `${event.id}: primary_skill must be in skills`);
  assert.equal(new Set(event.concept_ids || []).size, (event.concept_ids || []).length, `${event.id}: duplicate concept_ids`);
  assert.equal(new Set(event.themes || []).size, (event.themes || []).length, `${event.id}: duplicate themes`);
  if (industrialIds.has(event.id)) {
    assert.equal(event.primary_skill, "timeline", `${event.id}: invention must not default to geography`);
    assert.ok(event.themes.includes("industrialization"), `${event.id}: missing industrialization theme`);
    assert.ok(!(event.concept_ids || []).some((id) => forbidden.has(id)), `${event.id}: unrelated political concept regression`);
  }
}
assert.equal(industrialIds.size, events.filter((event) => industrialIds.has(event.id)).length, "all audited events must exist");

const storage = new Map();
globalThis.window = { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
const { recordResult } = await import("../apps/shared/mastery-store.js");
const sample = buildTimelineAnswerRecord(question(3), 1, "guess");
for (const update of sample.masteryUpdates) recordResult(update.eventId, update.correct, { answer: sample.answer });
const mastery = JSON.parse(storage.get("whl_mastery_v1"));
const queue = JSON.parse(storage.get("whl_review_queue_v1"));
assert.deepEqual(Object.keys(mastery), ["event-1"], "only the selected wrong event receives mastery");
assert.deepEqual(Object.keys(queue), ["event-1"], "the existing review queue still receives the missed event");
assert.equal(mastery["event-1"].last_answer.correctItemId, "event-0");

console.log("Learning integrity tests passed (timeline recording and audited event semantics).");
