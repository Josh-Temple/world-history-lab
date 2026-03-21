# Handoff

## What changed
- Restored the event editorial workflow to the three-stage `draft` -> `reviewed` -> `approved` model for future event additions.
- Updated every record in `data/events.json` to use `status: "approved"`, replacing the temporary reviewed-only event state.
- Regenerated the derived artifacts so app consumers immediately see the approved event set.
- Updated the root README to document the 2026-03-21 workflow reset and approved-status refresh.

## Validation completed
- Ran `node scripts/validate-data.mjs` successfully after the event status update.
- Ran `node scripts/derive.mjs` successfully and refreshed `/derived` outputs.

## Suggested next steps
1. Decide whether people and unit records should continue using their current mixed status distribution or also adopt a stricter promotion workflow.
2. Spot-check learner-facing copy and counters that refer to Reviewed+ content so they still read naturally now that all current events are approved.
3. When adding the next batch of events, start them at `draft` and only promote them after review.
