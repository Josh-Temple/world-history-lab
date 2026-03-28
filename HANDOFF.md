# Handoff

## What changed (2026-03-24)
- Added a new French Revolution-focused unit file at `data/units/fr_french_revolution.json` with 14 events spanning 1789-1799 and app profiles for timeline, event recognition, people recognition, and causality builder.
- Registered the new unit in `data/units/index.json` and synchronized `data/metadata.json` (`scope.included_units`) so validation/derive include it.
- Expanded `data/events.json` with six new reviewed French Revolution events:
  - `ev_womens_march_versailles_1789`
  - `ev_civil_constitution_clergy_1790`
  - `ev_flight_to_varennes_1791`
  - `ev_september_massacres_1792`
  - `ev_battle_of_valmy_1792`
  - `ev_directory_established_1795`
- Ensured each newly added event includes `summary_short`, `status`, `content_origin`, `time.year_start`, `effects`, and `people_ids`.
- Expanded `data/people.json` with reviewed French Revolution figures:
  - `pe_marie_antoinette`
  - `pe_georges_danton`
- Updated existing linked French Revolution figures to `reviewed`:
  - `pe_louis_xvi`
  - `pe_maximilien_robespierre`
  - `pe_napoleon_bonaparte`
- Updated `README.md` with a new "Recent updates (2026-03-24)" section reflecting this dataset expansion.

## Validation completed
- `node scripts/validate-data.mjs` ✅ (passes; existing repo-level warnings remain for older records outside this task).
- `node scripts/derive.mjs` ✅
- `node scripts/smoke-timeline-trainer.mjs` ✅

## Suggested next steps
1. Fill `summary_short` gaps on older Imperialism events to reduce baseline dataset warnings and improve recognition quality.
2. Add additional French Revolution people for richer person-event distractor quality (for example, `pe_lafayette`, `pe_jean_paul_marat`, `pe_abbe_sieyes`).
3. Consider adding `source_refs` for the newly added French Revolution events and people to match the richer provenance style used in earlier seed records.

## Incremental update (2026-03-24 · CI question-type fix)
- Resolved GitHub Action failure in `node scripts/validate.mjs` caused by unknown question type `event_recognition` on six French Revolution events.
- Updated those six event records in `data/events.json` to use metadata-supported `what_happened`.
- Updated `data/units/fr_french_revolution.json` (`event-recognition.question_types`) from `event_recognition` to `what_happened` to keep app-profile taxonomy consistent.
- Re-ran validation and derive scripts to confirm CI-green data integrity after the taxonomy correction.


## Incremental update (2026-03-25 · Year Estimation mode)
- Added a new learner-facing app at `apps/year-estimation/` with standalone HTML/CSS/JS for rapid date-guessing practice from `data/events.json`.
- Implemented year-guess submission flow with numeric input validation, absolute-error calculation, and graded feedback bands:
  - **Excellent** for ≤5 years
  - **Close** for ≤20 years
  - **Far off** for >20 years
- Added a temporal scoring helper (`scoreFromError`) and passed score/error context into mastery persistence for each attempt.
- Extended `apps/shared/mastery-store.js` to keep additive temporal metrics (`total_error`, `total_score`, `attempts`) in addition to existing `correct`/`incorrect` counters.
- Updated `index.html` learning cards to include a direct Year Estimation entry point.

## Validation completed (2026-03-25)
- `node scripts/derive.mjs` ✅

## Suggested next steps
1. Add an optional setup control for era/unit scoping in Year Estimation to keep guesses context-focused during targeted review.
2. Introduce a short fixed-length Year Estimation session mode with summary stats (mean error, best streak) for retention-focused loops.
3. Consider exposing weak-event weighting in Year Estimation using existing mastery signals so temporal practice aligns with adaptive review across apps.

## Incremental update (2026-03-26 · Guided entry + unit-first flow)
- Reworked `index.html` into a guided homepage with:
  - clear primary CTA (**Start with Timeline**),
  - skill-based grouping (Chronology / Recall / Understanding / Survey bridge),
  - dynamic **Study by unit** cards loaded from `/data/units/index.json`.
- Added homepage unit cards that store `localStorage.selected_unit` before opening Timeline Trainer, creating an explicit unit-first entry path.
- Added/standardized unit persistence (`selected_unit`) in:
  - `apps/timeline-trainer/src/App.js`
  - `apps/event-recognition/app.js`
  - `apps/causality-builder/app.js`
  - `apps/year-estimation/app.js`
- Added new unit setup UIs for:
  - `apps/causality-builder/index.html` (+ styles) with filtered causality pool by selected unit.
  - `apps/year-estimation/index.html` (+ styles) with unit-based event filtering and no-data guardrails.

## Validation completed (2026-03-26)
- `node scripts/validate-data.mjs` ✅
- `node scripts/derive.mjs` ✅

## Suggested next steps
1. Consider adding a shared unit-selector helper under `apps/shared/` to reduce repeated setup/persistence logic across apps.
2. Optionally add query-string support (`?unit=<id>`) so deep links can open directly into a chosen unit without relying on localStorage.
3. Add a lightweight UX smoke test that checks unit selector presence/behavior across Timeline, Event Recognition, Causality, and Year Estimation.

## Incremental update (2026-03-27 · Validation + runtime reliability)
- Added strict cross-reference validation in `scripts/derive.mjs` for:
  - every `unit.event_ids` entry,
  - every `event.effects` reference (string or object `{ event_id }` form),
  - every `event.people_ids` reference.
- Derive now throws descriptive, fail-fast errors for invalid links (for example: invalid unit event id, effect target, or people id).
- Added runtime event-shape guards to all active practice apps so incomplete events are filtered out before session logic runs:
  - `apps/timeline-trainer/src/App.js`
  - `apps/event-recognition/app.js`
  - `apps/people-recognition/app.js`
  - `apps/causality-builder/app.js`
  - `apps/year-estimation/app.js`
- Added user-facing fallback behavior for empty valid datasets (for example: **No valid events available**) to avoid hard crashes/blank states.

## Validation completed (2026-03-27)
- `node scripts/validate-data.mjs` ✅
- `node scripts/derive.mjs` ✅
- `node scripts/smoke-timeline-trainer.mjs` ✅

## Suggested next steps
1. Centralize duplicated runtime event guards into a shared helper (for example `apps/shared/event-guards.js`) to reduce drift.
2. Add smoke tests for malformed-data scenarios in each app (missing `summary_short`, missing `time.year_start`, broken `people_ids`/`effects`).
3. Consider showing a consistent inline recovery CTA (for example “Switch unit” / “Include drafts”) on all empty-state fallback screens.

## Incremental update (2026-03-28 · Sequence Reconstruction + causality chains)
- Extended `scripts/derive.mjs` to build deduplicated causality chains from the `effects` graph:
  - supports effect references in both string form and object `{ event_id }` form,
  - avoids loops by skipping IDs already present in the current DFS path,
  - limits output to path lengths 3-5,
  - writes output to `derived/causality_chains.json`.
- Added a new learner-facing app at `apps/sequence-reconstruction/`:
  - loads `derived/causality_chains.json`,
  - picks a random chain and shuffles it,
  - supports drag-and-drop reordering in a simple list UI,
  - checks sequence correctness and shows expected chain feedback,
  - records mastery results for each event in attempted chains.
- Updated homepage mode links (`index.html`) to include **Sequence Reconstruction** under the Understanding skill cluster.
- Updated `README.md` to document the new derive artifact and new learning mode.

## Validation completed (2026-03-28)
- `node scripts/validate-data.mjs` ✅
- `node scripts/derive.mjs` ✅
- `node scripts/smoke-timeline-trainer.mjs` ✅

## Suggested next steps
1. Add optional unit-scoped chain selection so sequence reconstruction can follow the same focused-study workflow as other apps.
2. Add explanatory text enrichment for each chain edge (for example, effect rationale) to improve feedback depth beyond ordering correctness.
3. Add a lightweight app smoke test that verifies `derived/causality_chains.json` is non-empty and that the sequence route can render at least one playable chain.
