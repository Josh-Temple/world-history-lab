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
