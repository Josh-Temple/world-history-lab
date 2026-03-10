# Handoff Notes (Next Session)

## Session context
- Completed the requested health-review implementation focus with stricter derive-time unit validation.
- Confirmed unit metadata normalization remains consistent (`regions` as `reg_*`, object-based `app_profiles`).
- Synced README validation guidance with the stricter derive expectation.

## Changes made
1. Strengthened unit schema validation in derive pipeline
   - Updated `scripts/derive.mjs`:
     - `unit.regions` must be a non-empty array.
     - `unit.app_profiles.timeline-trainer` is now required.
     - Existing checks remain for `reg_*` formatting and `enabled` boolean per app profile.

2. Updated schema documentation
   - Updated `README.md` Unit schema expectations section:
     - Clarified that `app_profiles` must include `timeline-trainer`.

## Validation performed
- `node scripts/validate.mjs`
- `node scripts/derive.mjs`
- `git diff --exit-code -- derived`
- `node scripts/smoke-timeline-trainer.mjs`

## Next steps (ordered)
1. Decide whether to promote selected `data/people.json` records from `draft` to `reviewed`.
2. If people-linked runtime features are planned, add people-derived indexes and wire one app use-case.
3. Continue Timeline Trainer UX polish (microcopy and narrow-screen spacing checks).
