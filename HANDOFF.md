# Handoff Notes (Next Session)

## Session context
- This pass focused on **Monday forward progress**: shipping the missing causality mode and making Event Recognition align with unit-first learner flow.
- Goal: close the largest learner-facing gap without breaking data validation/derive workflows.

## Changes made
1. **New Causality Builder MVP shipped**
   - Added `apps/causality-builder/index.html`, `apps/causality-builder/app.js`, and `apps/causality-builder/styles.css`.
   - Loads raw data from `data/events.json`, `data/units/index.json`, and each referenced unit file.
   - Implements causality-ready gating (`time.year_start` + causal links + causal question types).
   - Unit selector includes only units with at least 4 causality-ready events.
   - Default unit prefers `unit_french_revolution_napoleon` when eligible.
   - Includes quality filter (`Reviewed+` / `Include drafts`).
   - Includes two playable modes:
     - **Direct effect**: match source event to downstream event.
     - **Cause category**: classify a selected cause label by category.
   - Graceful fallback if cause categories are too sparse.

2. **Event Recognition rebuilt for learner flow**
   - Replaced normalized whole-corpus loading with raw events + unit registry + unit files.
   - Added setup controls: practice scope (unit/all), unit selection, and quality filter.
   - Recognition eligibility now requires:
     - non-empty `summary_short`
     - numeric `time.year_start`
     - at least one of `what_happened`, `significance`, `cause_and_effect`
   - Distractors prefer same-unit records first, then fallback to broader filtered pool.
   - Answer reveal now includes year, active unit title, and one-line summary explanation.
   - Added eligibility hint and clear empty state guidance.

3. **Homepage onboarding updated**
   - Added Causality Builder card and link on root `index.html`.
   - Updated start-here copy to place Causality Builder in the progression.

4. **Docs refreshed**
   - Updated `README.md` current scope and recent updates to reflect the new Causality Builder route and Event Recognition flow.

## Validation/checks performed
- `node scripts/validate-data.mjs`
- `node scripts/derive.mjs`

## Next steps (smallest logical order)
1. Add lightweight smoke checks for Causality Builder and Event Recognition setup states.
2. Consider integrating `people_ids` into at least one mode (recognition distractor context or causality explanation enrichment).
3. Expand causality-ready coverage for non-French units so more units pass the 4-event causality threshold.
4. Review copy consistency across app setup cards to keep learner cognitive load low.
