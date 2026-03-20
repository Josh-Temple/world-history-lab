# Handoff

## What changed
- Updated every record in `data/events.json` to use `status: "reviewed"`, replacing the previous mix of `draft`, `reviewed`, and `approved` states.
- Regenerated the derived artifacts so app consumers see the updated reviewed-only event status set immediately.
- Added a root README note documenting the 2026-03-20 event-status refresh.

## Validation completed
- Ran `node scripts/validate-data.mjs` successfully after the event status update.
- Ran `node scripts/derive.mjs` successfully and refreshed `/derived` outputs.

## Suggested next steps
1. Decide whether people and unit records should also move to `reviewed` for consistency with the events dataset.
2. If you still need a stronger distinction than Reviewed+, consider introducing a separate readiness flag instead of relying on `approved` event statuses.
3. Spot-check any learner-facing copy that mentions `approved` content as a special tier, because the dataset no longer uses that status for events.
