function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function showFeedback(container, {
  correct,
  event,
  correctAnswer,
  summary,
  unitTitle,
  year,
  extra = [],
} = {}) {
  if (!container) return;

  const eventLabel = event?.label || correctAnswer?.label || 'Unknown event';
  const safeSummary = (typeof summary === 'string' && summary.trim())
    || (typeof event?.summary_short === 'string' && event.summary_short.trim())
    || 'No summary available.';

  const lines = [
    `<p><strong>${correct ? 'Correct.' : 'Incorrect.'}</strong></p>`,
    `<p><strong>${escapeHtml(eventLabel)}</strong>${Number.isFinite(year) ? ` (${year})` : ''}${unitTitle ? ` · ${escapeHtml(unitTitle)}` : ''}</p>`,
    `<p>${escapeHtml(safeSummary)}</p>`,
  ];

  if (!correct && correctAnswer?.label) {
    lines.push(`<p><strong>Correct answer:</strong> ${escapeHtml(correctAnswer.label)}</p>`);
  }

  for (const note of extra) {
    if (typeof note === 'string' && note.trim()) {
      lines.push(`<p>${escapeHtml(note.trim())}</p>`);
    }
  }

  container.innerHTML = lines.join('');
  container.className = `feedback ${correct ? 'correct' : 'incorrect'}`.trim();
}
