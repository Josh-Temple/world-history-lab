export function evaluateClaimClarity(text = '') {
  const trimmed = text.trim();
  if (!trimmed) return 'Thesis missing: add a clear claim about change, continuity, or causation.';
  if (trimmed.length < 90) return 'Thesis is concise but may be too brief; add scope and argument direction.';
  if (!/(because|therefore|led to|resulted|due to)/i.test(trimmed)) return 'Consider adding causal language to strengthen claim clarity.';
  return 'Thesis clarity looks strong.';
}

export function evaluateEvidenceUsage(text = '') {
  const matches = text.match(/(source|evidence|document|event|according to)/gi) || [];
  if (!text.trim()) return 'Evidence section is empty.';
  if (matches.length < 2) return 'Add at least two specific evidence references (event, source, or document).' ;
  return 'Evidence usage appears present; verify each point supports the thesis directly.';
}

export function evaluateCounterargumentPresence(text = '') {
  if (!text.trim()) return 'Counterargument missing; include one plausible alternative interpretation.';
  if (!/(however|although|alternatively|critics|another view)/i.test(text)) return 'Add explicit counterargument language to improve balance.';
  return 'Counterargument presence detected.';
}
