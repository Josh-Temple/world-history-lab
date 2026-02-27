function hasTimelineBeforeAfter(eventRecord) {
  return (
    eventRecord &&
    Array.isArray(eventRecord.question_types) &&
    eventRecord.question_types.includes("timeline_before_after")
  );
}

function hasQuestionType(eventRecord, questionType) {
  if (!eventRecord || !Array.isArray(eventRecord.question_types)) {
    return false;
  }

  if (Array.isArray(questionType)) {
    return questionType.some((type) => eventRecord.question_types.includes(type));
  }

  return eventRecord.question_types.includes(questionType);
}

function hasNumericYearStart(eventRecord) {
  return (
    eventRecord &&
    eventRecord.time &&
    typeof eventRecord.time.year_start === "number" &&
    Number.isFinite(eventRecord.time.year_start)
  );
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function pickDistinctPair(events) {
  const firstIndex = randomInt(events.length);
  let secondIndex = randomInt(events.length - 1);
  if (secondIndex >= firstIndex) {
    secondIndex += 1;
  }

  return [events[firstIndex], events[secondIndex]];
}

function pickDistinctTriplet(events) {
  const pickedIndices = new Set();
  while (pickedIndices.size < 3) {
    pickedIndices.add(randomInt(events.length));
  }
  return Array.from(pickedIndices).map((index) => events[index]);
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

export function resolveUnitEvents(events, unit) {
  const eventById = new Map(events.map((eventRecord) => [eventRecord.id, eventRecord]));

  const missingIds = [];
  const resolvedEvents = [];

  for (const eventId of unit.event_ids) {
    const eventRecord = eventById.get(eventId);
    if (!eventRecord) {
      missingIds.push(eventId);
      continue;
    }
    resolvedEvents.push(eventRecord);
  }

  return { resolvedEvents, missingIds };
}

export function filterTimelineCandidateEvents(events) {
  return events.filter((eventRecord) => {
    return hasTimelineBeforeAfter(eventRecord) && hasNumericYearStart(eventRecord);
  });
}

export function filterQuestionTypeCandidates(events, questionType) {
  return events.filter((eventRecord) => hasNumericYearStart(eventRecord) && hasQuestionType(eventRecord, questionType));
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
