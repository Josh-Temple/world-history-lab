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
  };

  // A correct response demonstrates knowledge of the target; a miss only demonstrates
  // difficulty with the chosen event. Unselected distractors must not gain or lose mastery.
  const masteryUpdates = correct
    ? [{ eventId: correctItemId, correct: true }]
    : [{ eventId: selectedItemId, correct: false }];

  return { answer, masteryUpdates };
}
