# Handoff

## What changed
- Strengthened the validation layer so `node scripts/validate-data.mjs` now checks event/effect/cause references, duplicate IDs across events and people, duplicate unit event links, and missing `summary_short` coverage warnings.
- Extended the derive pipeline so normalized events now include `status`, `question_types`, `unit_ids`, `effects`, `causes`, and `time.year_start`, making `derived/events.normalized.json` a more complete app-facing source of truth.
- Added a shared browser-side data access helper under `apps/shared/` and moved Event Recognition plus Causality Builder onto derived-data loading instead of mixing raw event/unit fetches.

## Validation completed
- Ran `node scripts/validate-data.mjs` successfully on the clean dataset.
- Ran `node scripts/derive.mjs` successfully and regenerated the derived artifacts.
- Performed a temporary broken-reference check to confirm validation fails on invalid causal links, then restored the dataset and re-ran validation.

## Suggested next steps
1. Move History Player and any future apps onto the same shared derived-data access helper so all learner modes use identical event normalization.
2. Consider adding a dedicated derived index for causality-ready events or resolved effect targets if Causality Builder grows more complex.
3. If you want fewer warnings over time, backfill `summary_short` on remaining null events so every normalized record is immediately usable in clue-based modes.
