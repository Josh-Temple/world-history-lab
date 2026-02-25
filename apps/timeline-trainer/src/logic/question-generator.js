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

export function generateBeforeAfterQuestion(events, lastPairKey = null) {
  if (events.length < 2) {
    throw new Error("Need at least two valid events to generate a question.");
  }

  const maxAttempts = 100;

  for (let i = 0; i < maxAttempts; i += 1) {
    const [eventA, eventB] = pickDistinctPair(events);
    const pairKey = createPairKey(eventA.id, eventB.id);

    if (lastPairKey && pairKey === lastPairKey) {
      continue;
    }

    if (eventA.time.year_start === eventB.time.year_start) {
      continue;
    }

    const { earlierEvent, laterEvent } = orderByYear(eventA, eventB);
    const showEarlierFirst = Math.random() < 0.5;
    const options = showEarlierFirst ? [earlierEvent, laterEvent] : [laterEvent, earlierEvent];
    const correctOptionIndex = options[0].id === earlierEvent.id ? 0 : 1;

    return {
      options: [
        { key: "A", ...options[0] },
        { key: "B", ...options[1] },
      ],
      left: options[0],
      right: options[1],
      correctId: earlierEvent.id,
      correctOptionIndex,
      pairKey,
    };
  }

  throw new Error(
    "We couldn't generate a new question right now. This can happen when the event pool is too small. Try again."
  );
}

export function explainQuestionAnswer(question) {
  const earlier = question.options[question.correctOptionIndex];
  const later = question.options[question.correctOptionIndex === 0 ? 1 : 0];

  return `${earlier.label} (${earlier.time.year_start}) happened before ${later.label} (${later.time.year_start}).`;
}
