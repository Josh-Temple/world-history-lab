# Handoff

## What changed
- Added `apps/shared/mastery-store.js` as a shared browser-side persistence layer for per-event mastery stats, stored in `localStorage` under `whl_mastery_v1`.
- Integrated mastery tracking into `apps/event-recognition/app.js`, `apps/causality-builder/app.js`, and `apps/timeline-trainer/src/App.js` so learner performance now persists across reloads.
- Extended Event Recognition with an adaptive **Focus on weak areas** toggle, an in-app adaptive-status indicator, weak-event ranking, and recent-answer diversity protection.
- Updated `apps/event-recognition/index.html` and `apps/event-recognition/styles.css` to expose the new adaptive practice control in the learner-facing UI.
- Updated `README.md` so the documented project status now reflects persistent mastery tracking and adaptive weak-area practice.

## Validation completed
- Ran `node scripts/derive.mjs` successfully.
- Ran `node scripts/smoke-timeline-trainer.mjs` successfully.
- Ran `node --check apps/shared/mastery-store.js apps/event-recognition/app.js apps/causality-builder/app.js apps/timeline-trainer/src/App.js` unsuccessfully because Node's `--check` accepts only one script at a time; run the command once per file instead.
- Ran per-file `node --check` validation successfully for the updated JavaScript modules.

## Suggested next steps
1. Build a shared progress summary surface so learners can see weakest events, strongest events, and recent practice activity across apps.
2. Add a lightweight spaced-repetition scheduler on top of `last_seen`, accuracy, and attempt count instead of relying only on raw weakness ranking.
3. Extend adaptive retrieval beyond Event Recognition so Timeline Trainer and Causality Builder can also target weak material intentionally.
