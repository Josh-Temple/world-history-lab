# Handoff

## What changed
- Added a new `apps/people-recognition/` learning mode for actor-to-event recall, including setup controls, multiple-choice questions, explanation feedback, and session summaries.
- Exposed People Recognition from the homepage and updated the learning path so actor recall now sits between event recognition and narrative review.
- Confirmed the existing `people_ids` event linkages remain available through validation and derived data, which now power the new app without breaking existing modes.
- Refreshed the README so the shipped app list and current challenge notes include the new people-based learning flow.

## Validation completed
- Ran `node scripts/validate-data.mjs` successfully.
- Ran `node scripts/derive.mjs` successfully.
- Ran `node scripts/smoke-timeline-trainer.mjs` successfully.
- Ran a local static server plus a scripted HTTP fetch of `/apps/people-recognition/` to confirm the new route serves.

## Suggested next steps
1. Expand `people_ids` coverage to more units so People Recognition has a deeper pool and better all-units variety.
2. Consider adding alternate prompts later, such as event-to-person recall or multi-person association questions.
3. If you want browser-level QA next session, capture a visual pass of the new route and verify mobile spacing plus answer-state affordances.
