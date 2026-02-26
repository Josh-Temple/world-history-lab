function hasTimelineBeforeAfter(eventRecord) {
  return (
    eventRecord &&
    Array.isArray(eventRecord.question_types) &&
    eventRecord.question_types.includes("timeline_before_after")
  );
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

function orderByYear(eventA, eventB) {
  if (eventA.time.year_start <= eventB.time.year_start) {
    return { earlierEvent: eventA, laterEvent: eventB };
  }
  return { earlierEvent: eventB, laterEvent: eventA };
}

function createPairKey(eventAId, eventBId) {
  return [eventAId, eventBId].sort().join("|");
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

export function explainQuestionAnswer(question) {
  const earlier = question.options[question.correctOptionIndex];
  const later = question.options[question.correctOptionIndex === 0 ? 1 : 0];

  return `${earlier.label} (${earlier.time.year_start}) happened earlier than ${later.label} (${later.time.year_start}).`;
}
