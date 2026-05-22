# HANDOFF (2026-05-17)

## What was completed today

- Added adaptive sequencing metadata in `data/concepts.json` (`difficulty`, `prerequisite_concept_ids`) and introduced `concept_state_formation` as a foundational prerequisite anchor.
- Added `data/learning-paths.json` with three initial progression paths and level recommendations (`beginner`, `intermediate`, `advanced`).
- Updated `apps/dashboard/index.html` + `apps/dashboard/main.js` to show progression summary and concept-gated recommended learning paths.
- Extended `scripts/validate-data.mjs` with: concept difficulty validation, prerequisite existence checks, concept dependency cycle detection, and learning-path requirement validation.
- Extended `scripts/derive.mjs` to emit progression dependency map outputs: `derived/progression-map.json` and `data/derived/progression-map.json`.
- Added new learner-facing app `apps/big-picture-history/` with thematic macro-history timeline sections, turning-point highlights, and cross-unit narrative links.
- Updated `index.html` to include discoverability links for Big Picture History.
- Updated `README.md` with a new 2026-05-17 update section summarizing sequencing and synthesis improvements.

## Validation status

- `node scripts/validate-data.mjs`
- `node scripts/derive.mjs`

## Suggested next session priorities

1. Replace dashboard placeholder mastery-to-concept mapping with event-to-concept mastery aggregation from persisted review/mastery stores.
2. Add concept-level completion state (locked/in-progress/unlocked) and show per-path readiness percentages.
3. Expand Big Picture History with map overlays and narrative filters by region + era.
4. Add concise pedagogy guardrails for prerequisite breadth to avoid over-constraining valid alternative learning paths.

## Strategic direction update (for next session)

Use the weekly strategic assessment as an execution filter:

- Build toward **historical synthesis** (eras, transitions, divergence), not just discrete-event throughput.
- Treat these as forced priorities:
  - macro-history / era synthesis,
  - continuity/change learning,
  - broader regional coverage in canonical learning paths.
- Near-term deliverables to target:
  1. A curated `World History Overview` unit scaffold (start with a high-quality 15-event backbone, then expand toward 30–40).
  2. Era/transformation tags wired through derive output and visible in at least one app view.
  3. One concise continuity/change prompt in Timeline Trainer post-answer feedback.
- Deprioritize for now: styling-only polish, deep validation-only expansion, and unrelated standalone apps.


## Incremental update (2026-05-18 · learner-state + misconception challenge)

- Added concept-level mastery store helpers and weakest-concept inference in `apps/shared/mastery-store.js`.
- Added dashboard concept-mastery summary and adaptive weak-area callouts in `apps/dashboard/main.js`.
- Added session-runner concept mastery update hooks for confidence interactions in `apps/session-runner/app.js`.
- Added new `apps/misconception-challenge/` mode with confidence-based misconception judgment and explanatory feedback.
- Added `data/misconceptions.json` seed dataset and linked app from root navigation.


## Incremental update (2026-05-19 · Indian Ocean unit + process chains)

- Added a new Indian Ocean trade unit (`data/units/indian-ocean-trade.json`) and registered it in `data/units/index.json`.
- Added substantial Indian Ocean event coverage and directional prerequisite/consequence links in `data/events.json`.
- Added linked person records for major Indian Ocean actors in `data/people.json` and introduced `reg_indian_ocean` in `data/regions.json`.
- Updated trade-network learning-path sequencing in `data/learning-paths.json` to include the new unit.
- Added `scripts/derive-process-chains.mjs` and wired it into `scripts/derive.mjs` to emit `process-chains.json` into both derive output trees.

### Next-session checks

1. Review event factual phrasing for consistency with the project's evidence standards and add/normalize `source_refs` where needed.
2. Evaluate process-chain heuristics (especially branching simplification) and tune for interpretability in reasoning/synthesis apps.
3. Expand non-Western balancing further via Sub-Saharan inland networks, Southeast Asian inland-polity links, and pre-Columbian American macro-process chains.


## Incremental update (2026-05-21 · guided orchestration + onboarding map)

- Implemented guided session orchestration scaffolding via shared controller + handoff store and wired dashboard launch entry.
- Updated session-runner to consume guided plans (`?guided=1`) and provide compact concept-practice summary text on completion.
- Added a new beginner concept onboarding map app and linked it from root navigation for clearer first-step orientation.
- Ran validation + derive scripts after integration.
