export function createTimelineAttemptId(randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto)) {
  if (typeof randomUUID !== "function") {
    throw new Error("Timeline attempt IDs require crypto.randomUUID()");
  }
  return `timeline-${randomUUID()}`;
}

export function buildTimelineAnswerRecord(question, selectedOptionIndex, confidence = null) {
  if (!question || !Array.isArray(question.options)) return null;
  const correctOptionIndex = question.correctOptionIndex;
  const correctItemId = question.options[correctOptionIndex]?.id;
  const selectedItemId = question.options[selectedOptionIndex]?.id;
  if (!correctItemId || !selectedItemId) return null;

  const correct = selectedOptionIndex === correctOptionIndex;
  const answer = {
    mode: "timeline",
    itemIds: [...new Set(question.options.map((option) => option?.id).filter(Boolean))],
    correctItemId,
    selectedItemId,
    correct,
    questionType: question.type,
    confidence,
    attemptId: question.attemptId || null,
  };

  // A correct response demonstrates knowledge of the target; a miss only demonstrates
  // difficulty with the chosen event. Unselected distractors must not gain or lose mastery.
  const masteryUpdates = correct
    ? [{ eventId: correctItemId, correct: true }]
    : [{ eventId: selectedItemId, correct: false }];

  return { answer, masteryUpdates };
}

export function buildTimelineMistakeRecord(question, selectedOptionIndex) {
  if (!question || !Array.isArray(question.options)) return null;
  const correctItem = question.options[question.correctOptionIndex];
  const selectedItem = question.options[selectedOptionIndex];
  if (!correctItem?.id || !selectedItem?.id || correctItem.id === selectedItem.id) return null;

  const relatedEventIds = [...new Set(question.options
    .map((option) => option?.id)
    .filter((id) => id && id !== selectedItem.id))];

  return {
    eventId: selectedItem.id,
    label: selectedItem.label || selectedItem.id,
    source: "timeline-trainer",
    reason: `Missed ${question.type} chronology question`,
    mistakeType: "chronology_relation",
    correctItemId: correctItem.id,
    relatedEventIds,
    questionType: question.type,
    attemptId: question.attemptId || "",
  };
}
