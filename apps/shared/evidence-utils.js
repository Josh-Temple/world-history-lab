const EVIDENCE_LABELS = {
  weak: 'Weak Evidence',
  moderate: 'Moderate Evidence',
  strong: 'Strong Evidence',
};

const CONFIDENCE_LABELS = {
  low: 'Interpretation remains debated',
  medium: 'Interpretation has mixed support',
  high: 'Interpretation is widely supported',
};

export function getEvidenceBadge(level = 'moderate') {
  const key = EVIDENCE_LABELS[level] ? level : 'moderate';
  return {
    level: key,
    label: EVIDENCE_LABELS[key],
  };
}

export function getConfidenceLabel(level = 'medium') {
  const key = CONFIDENCE_LABELS[level] ? level : 'medium';
  return CONFIDENCE_LABELS[key];
}
