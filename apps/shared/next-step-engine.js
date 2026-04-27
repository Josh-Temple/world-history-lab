const MODE_REGISTRY = Object.freeze({
  timeline: { label: 'Timeline Trainer', href: '/apps/timeline-trainer/' },
  sequence: { label: 'Sequence Reconstruction', href: '/apps/sequence-reconstruction/' },
  'causality-drill': { label: 'Causality Drill', href: '/apps/causality-drill/' },
  causality: { label: 'Causality Builder', href: '/apps/causality-builder/' },
  recognition: { label: 'Event Recognition', href: '/apps/event-recognition/' },
  people: { label: 'People Recognition', href: '/apps/people-recognition/' },
  comparison: { label: 'Event Comparison', href: '/apps/event-comparison/' },
  review: { label: 'Event Recognition Review', href: '/apps/event-recognition/?adaptive=1' },
});

function resolveMode(modeKey) {
  return MODE_REGISTRY[modeKey] || MODE_REGISTRY.recognition;
}

export function recommendNextStep({ currentMode = '', accuracy = null, reviewQueueCount = 0 } = {}) {
  const hasLowAccuracy = Number.isFinite(accuracy) && accuracy < 0.6;
  const strongAccuracy = Number.isFinite(accuracy) && accuracy >= 0.85;
  const hasReviewPressure = Number.isFinite(reviewQueueCount) && reviewQueueCount >= 3;

  if (hasLowAccuracy || hasReviewPressure) {
    const mode = resolveMode('review');
    return {
      ...mode,
      modeKey: 'review',
      reason: 'You have weak items to reinforce. Do a quick review block next.',
    };
  }

  if (currentMode === 'timeline' || currentMode === 'sequence') {
    const mode = resolveMode('causality-drill');
    return {
      ...mode,
      modeKey: 'causality-drill',
      reason: 'Chronology is freshest now; move immediately into cause-and-effect recall.',
    };
  }

  if (currentMode === 'recognition' || currentMode === 'people') {
    const mode = resolveMode(strongAccuracy ? 'comparison' : 'causality');
    return {
      ...mode,
      modeKey: strongAccuracy ? 'comparison' : 'causality',
      reason: strongAccuracy
        ? 'Your recall is strong, so switch to cross-event reasoning and comparison.'
        : 'Reinforce recall by connecting people/events into causal chains.',
    };
  }

  const mode = resolveMode('timeline');
  return {
    ...mode,
    modeKey: 'timeline',
    reason: 'Restart the loop with timeline ordering to keep spaced retrieval active.',
  };
}

export function getModeMeta(modeKey) {
  return resolveMode(modeKey);
}
