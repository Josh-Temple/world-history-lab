# Handoff

## What changed
- Added a simplified, playable `apps/causality-builder/` flow centered on event-to-event causal multiple-choice questions sourced from raw `data/events.json`.
- Added Beginner / Intermediate / Full difficulty tiers to Timeline Trainer, including filtered event pools, visible difficulty state, and weighted scoring.
- Updated root documentation/homepage copy to reflect the new learning mode behavior.

## Validation completed
- Ran the derive pipeline successfully.
- Ran a targeted data check to confirm causal effect IDs resolve and that at least one unit can produce playable causality questions.
- Launched a local static server and captured a screenshot of the updated homepage/app flow.

## Suggested next steps
1. Consider expanding Causality Builder beyond the first `effects[0]` target so multi-effect events can rotate answers more broadly.
2. Add a small in-app score readout label in Timeline Trainer if you want weighted points to be more prominent than the current stats text.
3. Consider unifying difficulty logic with Event Recognition so the homepage “path” feels consistent across all modes.
