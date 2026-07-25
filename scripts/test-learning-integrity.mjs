import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildTimelineAnswerRecord, buildTimelineMistakeRecord, createTimelineAttemptId } from "../apps/timeline-trainer/src/logic/answer-recording.js";
import { recordReviewMistake } from "../apps/shared/review-store.js";

function question(count, correctOptionIndex = 0) {
  return { attemptId: `timeline-fixed-${count}`, type: count === 2 ? "timeline_before_after" : "timeline_earliest_of_3", correctOptionIndex, options: Array.from({ length: count }, (_, index) => ({ id: `event-${index}` })) };
}
assert.equal(createTimelineAttemptId(() => "fixed-uuid"), "timeline-fixed-uuid", "attempt ID generation is injectable");
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

  const mistake = buildTimelineMistakeRecord(question(count), 1);
  assert.equal(mistake.eventId, "event-1", `${count}-option miss targets only the selected distractor`);
  assert.equal(mistake.correctItemId, "event-0");
  assert.equal(mistake.mistakeType, "chronology_relation");
  assert.equal(mistake.attemptId, `timeline-fixed-${count}`);
  assert.deepEqual(mistake.relatedEventIds, count === 2 ? ["event-0"] : ["event-0", "event-2"]);
  assert.equal(new Set(mistake.relatedEventIds).size, mistake.relatedEventIds.length);
  assert.ok(!mistake.relatedEventIds.includes(mistake.eventId));

  const untouchedCorrect = { mistake_count: 2, last_incorrect: 123, due_at: 456, mastery: 0.8 };
  const reviewStore = recordReviewMistake({ "event-0": untouchedCorrect }, mistake);
  assert.deepEqual(reviewStore["event-0"], untouchedCorrect, `${count}-option miss does not degrade the correct event`);
  assert.deepEqual(Object.keys(reviewStore), ["event-0", "event-1"], `${count}-option miss creates only one new review item`);
  assert.equal(reviewStore["event-1"].correct_item_id, "event-0");
  assert.equal(reviewStore["event-1"].question_type, question(count).type);
}

const firstAttempt = buildTimelineMistakeRecord(question(2), 1);
const recordedOnce = recordReviewMistake({}, firstAttempt);
const firstSnapshot = structuredClone(recordedOnce["event-1"]);
const duplicateAttempt = recordReviewMistake(recordedOnce, firstAttempt);
assert.strictEqual(duplicateAttempt, recordedOnce, "a repeated answer returns the existing store unchanged");
assert.equal(duplicateAttempt["event-1"].mistake_count, 1);
assert.equal(duplicateAttempt["event-1"].mistake_history.length, 1);
assert.equal(duplicateAttempt["event-1"].last_incorrect, firstSnapshot.last_incorrect);
assert.equal(duplicateAttempt["event-1"].due_at, firstSnapshot.due_at);
assert.equal(duplicateAttempt["event-1"].mastery, firstSnapshot.mastery);

const nextAttempt = { ...firstAttempt, attemptId: "timeline-second-attempt" };
const recordedTwice = recordReviewMistake(recordedOnce, nextAttempt);
assert.equal(recordedTwice["event-1"].mistake_count, 2);
assert.equal(recordedTwice["event-1"].mistake_history.length, 2);
assert.equal(recordedTwice["event-1"].last_attempt_id, "timeline-second-attempt");

const reusedForAnotherEvent = recordReviewMistake(recordedOnce, { ...firstAttempt, eventId: "event-other" });
assert.strictEqual(reusedForAnotherEvent, recordedOnce, "one answer attempt cannot create mistakes for multiple events");
assert.ok(!reusedForAnotherEvent["event-other"]);

const legacyRecord = recordReviewMistake({ legacy: { mistake_count: 1, mistake_history: [{ at: 1 }] } }, {
  ...firstAttempt,
  eventId: "legacy",
  attemptId: "timeline-after-legacy",
});
assert.equal(legacyRecord.legacy.mistake_count, 2, "history without attempt IDs remains readable and recordable");

const duplicateOptions = question(3);
duplicateOptions.options[2].id = "event-0";
const deduplicatedMistake = buildTimelineMistakeRecord(duplicateOptions, 1);
assert.deepEqual(deduplicatedMistake.relatedEventIds, ["event-0"], "one answer cannot duplicate related IDs");

const events = JSON.parse(await readFile(new URL("../data/events.json", import.meta.url)));
const forbidden = new Set(["concept_imperial_overstretch", "concept_bureaucratic_centralization", "concept_succession_crisis", "concept_legitimacy_crisis"]);
const industrialIds = new Set(["ev_flying_shuttle_patent_1733", "ev_bridgewater_canal_opens_1761", "ev_spinning_jenny_invented_1764", "ev_water_frame_patent_1769", "ev_watt_condenser_patent_1769", "ev_spinning_jenny_patented_1770", "ev_spinning_mule_invented_1779", "ev_power_loom_patented_1785", "ev_cotton_gin_invented_1793", "ev_rainhill_trials_rocket_1829", "ev_bessemer_process_patent_1856"]);
for (const event of events) {
  if (event.primary_skill) assert.ok(event.skills?.includes(event.primary_skill), `${event.id}: primary_skill must be in skills`);
  assert.equal(new Set(event.concept_ids || []).size, (event.concept_ids || []).length, `${event.id}: duplicate concept_ids`);
  assert.equal(new Set(event.themes || []).size, (event.themes || []).length, `${event.id}: duplicate themes`);
  if (industrialIds.has(event.id)) {
    assert.equal(event.primary_skill, "timeline", `${event.id}: invention must not default to geography`);
    assert.ok(event.themes.includes("industrialization"), `${event.id}: missing industrialization theme`);
    assert.ok(!(event.concept_ids || []).some((id) => forbidden.has(id)), `${event.id}: unrelated political concept regression`);
    assert.deepEqual(event.skills, ["timeline"], `${event.id}: unsupported causality/geography/people skill regression`);
    assert.ok(!(event.question_types || []).some((type) => type.includes("cause")), `${event.id}: unexpected causal question type`);
    assert.equal((event.effects || []).length + (event.causes || []).length, 0, `${event.id}: causal data expectation changed; reassess skill`);
  }
}
assert.equal(industrialIds.size, events.filter((event) => industrialIds.has(event.id)).length, "all audited events must exist");
assert.deepEqual(events.find((event) => event.id === "ev_bessemer_process_patent_1856").people_ids, ["pe_henry_bessemer"]);

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
