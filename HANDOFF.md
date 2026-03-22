# Handoff

## What changed
- Added `apps/shared/event-filters.js` as the shared event-filtering layer for status thresholds, unit matching, and readiness helpers (`isRecognitionReady`, `isCausalityReady`, `isPeopleLinked`, `isTimelineReady`).
- Updated `apps/shared/data-access.js` so derived-data consumers can reuse the same shared filtering rules through `filterDerivedEvents(...)`.
- Refactored Event Recognition and Causality Builder to use the shared filter module instead of app-local status/readiness checks.
- Updated Timeline Trainer to reuse shared status-aware filtering for difficulty gating and timeline eligibility.
- Added optional "Next step" panels to Timeline Trainer, Event Recognition, and Causality Builder so learners are guided through the intended loop:
  1. Timeline Trainer → Event Recognition
  2. Event Recognition → Causality Builder
  3. Causality Builder → History Player
- Refreshed README project notes to reflect the new shared filter architecture and the guided practice-loop UI.

## Validation completed
- Ran `node scripts/validate-data.mjs` successfully. It still reports the pre-existing dataset warnings about missing `summary_short` values and a few unexpected causal categories, but there were no validation errors.
- Ran `node scripts/derive.mjs` successfully.
- Ran `node scripts/smoke-timeline-trainer.mjs` successfully.
- Ran `node --check` against the modified shared/app JavaScript modules successfully.
- Served the repo with `python3 -m http.server` and fetched the Timeline Trainer, Event Recognition, and Causality Builder routes to confirm the new `next-step` markup is present.

## Suggested next steps
1. Move People Recognition onto the shared filter layer as well so all learner-facing apps use one consistent status/unit/readiness policy.
2. Consider extracting a shared "practice loop" helper if more apps need end-of-session guidance or threshold logic.
3. If browser-based tooling is available next session, do a visual/mobile QA pass for the three new next-step panels and verify their appearance after actual in-browser completion flows.
