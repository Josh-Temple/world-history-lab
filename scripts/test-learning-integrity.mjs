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

const frenchAudit = {
  ev_estates_general_1789: {
    concepts: ["concept_legitimacy_crisis"],
    themes: ["revolution", "state_power"],
    skills: ["timeline", "causality", "people"],
    people: ["pe_louis_xvi"],
  },
  ev_tennis_court_oath_1789: {
    concepts: ["concept_legitimacy_crisis"],
    themes: ["revolution", "state_power"],
    skills: ["timeline", "causality"],
    people: [],
  },
  ev_execution_louis_xvi_1793: {
    concepts: ["concept_legitimacy_crisis"],
    themes: ["revolution", "state_power"],
    skills: ["timeline", "causality", "people"],
    people: ["pe_louis_xvi"],
  },
  ev_napoleon_coup_18_brumaire_1799: {
    concepts: ["concept_legitimacy_crisis"],
    themes: ["revolution", "state_power"],
    skills: ["timeline", "causality", "people"],
    people: ["pe_napoleon_bonaparte"],
  },
  ev_congress_of_vienna_1814_1815: {
    concepts: [],
    themes: ["war", "state_power"],
    skills: ["timeline", "causality"],
    people: [],
  },
};
const eventsById = new Map(events.map((event) => [event.id, event]));
const relationIds = (links = []) => links.flatMap((link) => {
  if (typeof link === "string") return [link];
  return typeof link?.event_id === "string" ? [link.event_id] : [];
});
const expectedRelations = {
  ev_estates_general_1789: {
    relatedEventIds: ["ev_tennis_court_oath_1789", "ev_storming_bastille_1789"], prerequisiteEventIds: [], consequenceEventIds: ["ev_tennis_court_oath_1789"], causeEventIds: [], effectEventIds: ["ev_tennis_court_oath_1789"],
  },
  ev_tennis_court_oath_1789: {
    relatedEventIds: ["ev_estates_general_1789", "ev_storming_bastille_1789"], prerequisiteEventIds: ["ev_estates_general_1789"], consequenceEventIds: ["ev_storming_bastille_1789"], causeEventIds: ["ev_estates_general_1789"], effectEventIds: ["ev_storming_bastille_1789"],
  },
  ev_execution_louis_xvi_1793: {
    relatedEventIds: ["ev_reign_of_terror_1793_1794"], prerequisiteEventIds: [], consequenceEventIds: ["ev_reign_of_terror_1793_1794"], causeEventIds: [], effectEventIds: ["ev_reign_of_terror_1793_1794"],
  },
  ev_napoleon_coup_18_brumaire_1799: {
    relatedEventIds: ["ev_directory_established_1795", "ev_napoleon_emperor_1804"], prerequisiteEventIds: ["ev_directory_established_1795"], consequenceEventIds: ["ev_napoleon_emperor_1804", "ev_napoleonic_wars_1803_1815"], causeEventIds: [], effectEventIds: ["ev_napoleon_emperor_1804", "ev_napoleonic_wars_1803_1815"],
  },
  ev_congress_of_vienna_1814_1815: {
    relatedEventIds: ["ev_napoleon_emperor_1804"], prerequisiteEventIds: ["ev_napoleonic_wars_1803_1815"], consequenceEventIds: ["ev_concert_of_europe_1815_1848"], causeEventIds: ["ev_napoleonic_wars_1803_1815"], effectEventIds: ["ev_concert_of_europe_1815_1848"],
  },
};
for (const event of events) {
  for (const [field, ids] of Object.entries({
    related_events: relationIds(event.related_events),
    prerequisite_event_ids: event.prerequisite_event_ids || [],
    consequence_event_ids: event.consequence_event_ids || [],
    causes: relationIds(event.causes),
    effects: relationIds(event.effects),
  })) {
    assert.equal(new Set(ids).size, ids.length, `${event.id}: duplicate ${field} event ID`);
    assert.ok(!ids.includes(event.id), `${event.id}: self-reference in ${field}`);
    for (const id of ids) assert.ok(eventsById.has(id), `${event.id}: unknown ${field} event ID ${id}`);
  }
}
assert.ok(!eventsById.has("ev_congress_vienna_1815"), "duplicate Congress settlement must stay removed");
assert.ok(!relationIds(eventsById.get("ev_napoleon_emperor_1804").effects).includes("ev_congress_of_vienna_1814_1815"), "Napoleon's coronation must not become a direct Congress cause");
assert.ok(!eventsById.get("ev_napoleon_emperor_1804").consequence_event_ids.includes("ev_congress_of_vienna_1814_1815"), "Napoleon's coronation must not become a Congress prerequisite");
assert.ok(!eventsById.get("ev_execution_louis_xvi_1793").prerequisite_event_ids.includes("ev_september_massacres_1792"), "September Massacres must not become an execution prerequisite");
const people = JSON.parse(await readFile(new URL("../data/people.json", import.meta.url)));
const peopleById = new Map(people.map((person) => [person.id, person]));
for (const [eventId, expected] of Object.entries(frenchAudit)) {
  const event = eventsById.get(eventId);
  assert.ok(event, `${eventId}: audited event must exist`);
  assert.deepEqual(event.concept_ids, expected.concepts, `${eventId}: audited concepts changed`);
  assert.deepEqual(event.themes, expected.themes, `${eventId}: audited themes changed`);
  assert.deepEqual(event.skills, expected.skills, `${eventId}: audited skills changed`);
  assert.equal(event.primary_skill, "causality", `${eventId}: audited primary skill changed`);
  assert.deepEqual(event.people_ids, expected.people, `${eventId}: audited people changed`);
  const expectedRelation = expectedRelations[eventId];
  assert.deepEqual(event.related_events || [], expectedRelation.relatedEventIds, `${eventId}: related events changed`);
  assert.deepEqual(event.prerequisite_event_ids || [], expectedRelation.prerequisiteEventIds, `${eventId}: prerequisites changed`);
  assert.deepEqual(event.consequence_event_ids || [], expectedRelation.consequenceEventIds, `${eventId}: consequences changed`);
  assert.deepEqual(relationIds(event.causes), expectedRelation.causeEventIds, `${eventId}: causal event links changed`);
  assert.deepEqual(relationIds(event.effects), expectedRelation.effectEventIds, `${eventId}: effect event links changed`);
  assert.ok(event.question_types.some((type) => type.startsWith("causality_")), `${eventId}: causality needs a supported question type`);
  assert.ok((event.causes?.length || 0) + (event.effects?.length || 0) > 0, `${eventId}: causality needs structured data`);
  for (const personId of event.people_ids) {
    const person = peopleById.get(personId);
    assert.ok(person, `${eventId}: missing person ${personId}`);
    assert.ok(person.related_events?.includes(eventId), `${eventId}: ${personId} reciprocal link missing`);
  }
}
assert.ok(new Set(Object.values(frenchAudit).map(({ concepts }) => JSON.stringify(concepts))).size > 1, "French audit must not regress to one mechanical concept set");
for (const person of people) {
  for (const eventId of person.related_events || []) {
    if (!Object.hasOwn(frenchAudit, eventId)) continue;
    assert.ok(eventsById.get(eventId).people_ids?.includes(person.id), `${person.id}: stale audited-event link ${eventId}`);
  }
}

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
