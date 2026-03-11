# Handoff Notes (Next Session)

## Session context
- Completed the health-review hardening pass for data/derive reliability that remained in scope.
- Verified unit metadata normalization and strict reference checks remain enforced and passing.
- Added missing derive-time guard for duplicate people IDs.

## Changes made
1. Added people duplicate-ID validation in derive pipeline
   - Updated `scripts/derive.mjs`:
     - New `validatePeople(people)` routine validates each person is an object with non-empty string `id`.
     - Derive now throws on duplicate person IDs (`Duplicate person id: ...`).

2. Updated documentation
   - Updated `README.md` derive section to document that duplicate person IDs now fail derive-time validation.

## Validation performed
- `node scripts/validate.mjs`
- `node scripts/derive.mjs`
- `git diff --exit-code -- derived`
- `node scripts/smoke-timeline-trainer.mjs`

## Next steps (ordered)
1. Decide whether to promote selected `data/people.json` entries from `draft` to `reviewed` after factual review.
2. If people-linked runtime features are planned, add a people-derived runtime artifact (for example a people index) and wire at least one app consumer.
3. Continue Timeline Trainer UX polish with mobile readability checks and wording refinements.
