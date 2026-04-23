import { filterEvents as filterSharedEvents, isTimelineReady } from "../../../shared/event-filters.js";

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function getEventWeight(event) {
  const value = Number(event?.weight);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function weightedPickIndex(events, excludedIndices = new Set()) {
  const candidates = [];
  let total = 0;

  for (let index = 0; index < events.length; index += 1) {
    if (excludedIndices.has(index)) continue;
    const weight = getEventWeight(events[index]);
    total += weight;
    candidates.push({ index, weight });
  }

  if (candidates.length === 0) {
    return -1;
  }

  if (!Number.isFinite(total) || total <= 0) {
    return candidates[randomInt(candidates.length)].index;
  }
  return events[events.length - 1];
}

  let roll = Math.random() * total;
  for (const candidate of candidates) {
    roll -= candidate.weight;
    if (roll <= 0) {
      return candidate.index;
    }
  }

  return candidates[candidates.length - 1].index;
}

function pickDistinctPair(events) {
  const firstIndex = weightedPickIndex(events);
  const secondIndex = weightedPickIndex(events, new Set([firstIndex]));

  return [events[firstIndex], events[secondIndex]];
}

function pickDistinctTriplet(events) {
  const pickedIndices = new Set();
  while (pickedIndices.size < 3) {
    pickedIndices.add(weightedPickIndex(events, pickedIndices));
  }
  return picked;
}

function orderByYear(eventA, eventB) {
  if (eventA.time.year_start <= eventB.time.year_start) {
    return { earlierEvent: eventA, laterEvent: eventB };
  }
  return { earlierEvent: eventB, laterEvent: eventA };
}

export function createPairKey(eventAId, eventBId) {
  return [eventAId, eventBId].sort().join("|");
}

export function createTripletKey(eventIds) {
  return [...eventIds].sort().join("|");
}

export function resolveUnitEvents(unit, eventsById) {
  const missingIds = [];
  const resolvedEvents = [];

  for (const eventId of unit.event_ids) {
    const eventRecord = eventsById.get(eventId);
    if (!eventRecord) {
      missingIds.push(eventId);
      continue;
    }
    resolvedEvents.push(eventRecord);
  }

  return { resolvedEvents, missingIds };
}

export function filterEligibleEvents(events, scope, questionType) {
  return filterSharedEvents(events, {
    status: scope.minStatus,
    predicate: (eventRecord) => isTimelineReady(eventRecord, questionType),
  });
}

export function filterTimelineCandidateEvents(events) {
  return filterSharedEvents(events, {
    predicate: (eventRecord) => isTimelineReady(eventRecord, "timeline_before_after"),
  });
}

export function filterQuestionTypeCandidates(events, questionType) {
  return filterSharedEvents(events, {
    predicate: (eventRecord) => isTimelineReady(eventRecord, questionType),
  });
}

export function generateBeforeAfterQuestion(events, options = {}) {
  const recentPairKeys = Array.isArray(options.recentPairKeys) ? options.recentPairKeys : [];
  const maxAttempts = Number.isFinite(options.maxAttempts) ? options.maxAttempts : 120;

  if (events.length < 2) {
    throw new Error("Need at least two valid events to generate a question.");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const [eventA, eventB] = pickDistinctPair(events);
    const pairKey = createPairKey(eventA.id, eventB.id);

    if (recentPairKeys.includes(pairKey)) {
      continue;
    }

    if (eventA.time.year_start === eventB.time.year_start) {
      continue;
    }

    const { earlierEvent, laterEvent } = orderByYear(eventA, eventB);
    const showEarlierFirst = Math.random() < 0.5;
    const optionsView = showEarlierFirst ? [earlierEvent, laterEvent] : [laterEvent, earlierEvent];
    const correctOptionIndex = optionsView[0].id === earlierEvent.id ? 0 : 1;

    return {
      type: "timeline_before_after",
      options: [
        { key: "A", ...optionsView[0] },
        { key: "B", ...optionsView[1] },
      ],
      correctOptionIndex,
      pairKey,
    };
  }

  console.warn("[Timeline Trainer] question generation failed", {
    attempts: maxAttempts,
    candidatePool: events.length,
    filters: {
      requiresQuestionType: "timeline_before_after",
      requiresNumericYearStart: true,
      excludesSameYearPairs: true,
      excludesRecentPairs: true,
    },
    recentHistoryLength: recentPairKeys.length,
  });

  throw new Error("Not enough suitable questions right now.");
}

function generateThreeOptionQuestion(events, targetType, options = {}) {
  const recentTripletKeys = Array.isArray(options.recentTripletKeys) ? options.recentTripletKeys : [];
  const maxAttempts = Number.isFinite(options.maxAttempts) ? options.maxAttempts : 160;
  const minYearSpan = Number.isFinite(options.minYearSpan) ? options.minYearSpan : 10;

  if (events.length < 3) {
    throw new Error("Need at least three valid events to generate this question type.");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const selectedEvents = pickDistinctTriplet(events);
    const yearSet = new Set(selectedEvents.map((eventRecord) => eventRecord.time.year_start));
    if (yearSet.size < selectedEvents.length) {
      continue;
    }

    const years = selectedEvents.map((eventRecord) => eventRecord.time.year_start);
    const yearSpan = Math.max(...years) - Math.min(...years);
    if (yearSpan < minYearSpan) {
      continue;
    }

    const tripletKey = createTripletKey(selectedEvents.map((eventRecord) => eventRecord.id));
    if (recentTripletKeys.includes(tripletKey)) {
      continue;
    }

    const sortedEvents = [...selectedEvents].sort((left, right) => left.time.year_start - right.time.year_start);
    const answerEvent =
      targetType === "timeline_earliest_of_3" ? sortedEvents[0] : sortedEvents[sortedEvents.length - 1];

    const shuffledOptions = [...selectedEvents]
      .sort(() => Math.random() - 0.5)
      .map((eventRecord, index) => ({ key: ["A", "B", "C"][index], ...eventRecord }));
    const correctOptionIndex = shuffledOptions.findIndex((eventRecord) => eventRecord.id === answerEvent.id);

    return {
      type: targetType,
      options: shuffledOptions,
      correctOptionIndex,
      tripletKey,
    };
  }

  throw new Error("Not enough suitable questions for this mode right now.");
}

export function generateEarliestOfThreeQuestion(events, options = {}) {
  return generateThreeOptionQuestion(events, "timeline_earliest_of_3", options);
}

export function generateLatestOfThreeQuestion(events, options = {}) {
  return generateThreeOptionQuestion(events, "timeline_latest_of_3", options);
}

export function explainQuestionAnswer(question) {
  if (question.type === "timeline_before_after") {
    const earlier = question.options[question.correctOptionIndex];
    const later = question.options[question.correctOptionIndex === 0 ? 1 : 0];
    return `${earlier.label} (${earlier.time.year_start}) happened earlier than ${later.label} (${later.time.year_start}).`;
  }

  const answer = question.options[question.correctOptionIndex];
  const others = question.options.filter((_, index) => index !== question.correctOptionIndex);
  if (question.type === "timeline_earliest_of_3") {
    return `${answer.label} (${answer.time.year_start}) is earlier than ${others[0].label} (${others[0].time.year_start}) and ${others[1].label} (${others[1].time.year_start}).`;
  }

  return `${answer.label} (${answer.time.year_start}) is later than ${others[0].label} (${others[0].time.year_start}) and ${others[1].label} (${others[1].time.year_start}).`;
}
