export function createSession({ getQuestion, evaluate, getFeedback = () => null }) {
  let currentQuestion = null;
  let lastResult = null;

  return {
    nextQuestion() {
      currentQuestion = getQuestion();
      lastResult = null;
      return currentQuestion;
    },

    submitAnswer(answer) {
      if (!currentQuestion) {
        return null;
      }
      lastResult = evaluate(currentQuestion, answer);
      return lastResult;
    },

    getFeedback() {
      if (!currentQuestion) return null;
      return getFeedback(currentQuestion, lastResult);
    },
  };
}

export function weightedPick(items, getWeight) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const safeWeights = items.map((item) => {
    const weight = Number(getWeight?.(item));
    return Number.isFinite(weight) && weight > 0 ? weight : 1;
  });
  const totalWeight = safeWeights.reduce((sum, weight) => sum + weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return items[Math.floor(Math.random() * items.length)] || null;
  }

  let cursor = Math.random() * totalWeight;
  for (let index = 0; index < items.length; index += 1) {
    if (cursor < safeWeights[index]) {
      return items[index];
    }
    cursor -= safeWeights[index];
  }

  return items[items.length - 1] || null;
}
