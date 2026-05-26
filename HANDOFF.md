# HANDOFF (2026-05-26)

## Recent updates (2026-05-26 · argument builder + thematic pathways)

- Added new `apps/historical-argument-builder/` mode with structured thesis/evidence/causal/counterargument/synthesis workflow, local draft persistence, revision timestamps, and lightweight rubric heuristics.
- Added shared rubric helpers in `apps/shared/argument-rubric-utils.js` for claim clarity, evidence usage, and counterargument presence feedback.
- Added `data/thematic-pathways.json` with cross-era macro-history journeys and explanatory metadata (`why_it_matters`, transitions, recurring structures).
- Updated dashboard integration to surface featured thematic journeys with level and estimated length (`apps/dashboard/index.html`, `apps/dashboard/main.js`).
- Updated derive pipeline to emit `derived/thematic-pathways-summary.json` and linked root navigation entry for Historical Argument Builder.

# HANDOFF (2026-05-17)

## Incremental update (2026-05-24 · thematic comparison reinforcement + onboarding cognition framing)

- Updated `apps/timeline-trainer/src/App.js` to surface concise post-answer comparison prompts when question options share one or more `themes` tags (for example: “how were they similar, and what changed?”).
- Updated `apps/concept-onboarding-map/index.html` with a beginner pathway framed by cognitive goals: chronology, comparison, causality, and review.
- Updated `apps/concept-onboarding-map/main.js` so each concept cluster includes an explicit “Thinking skill” line to make mode purpose visible to learners.
- Updated `README.md` with a matching release-note entry for this incremental slice.

### Next-session follow-up

1. Extend thematic comparison prompts to pull a third “related event” from the same theme and include cross-region preference.
2. Define/lock a learner-visible controlled theme vocabulary page and link it from onboarding.
3. Backfill or normalize missing `themes` tags for high-frequency timeline events to increase comparison prompt hit-rate.

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


## Recent updates (2026-05-23 · historical source lab + evidence confidence layer)

- Added new app `apps/historical-source-lab/` with source-context panels, interpretation prompts, reliability discussion, and cross-source comparison workflow.
- Added `data/sources.json` seed primary-source fragment dataset and `data/perspectives.json` for perspective-level evidence metadata scaffolding.
- Added shared evidence helpers in `apps/shared/evidence-utils.js` (`getEvidenceBadge`, `getConfidenceLabel`).
- Added evidence/confidence indicators and weak-evidence diagnostic messaging in `apps/historical-reasoning-lab/main.js`.
- Extended `scripts/validate-data.mjs` to validate `evidence_strength` and `confidence_level` fields on events/sources/perspectives.
- Added root navigation link for **Historical Source Lab** in `index.html`.

## Incremental update (2026-05-23 · quiz generation health check)

- Ran end-to-end project checks to verify that question-serving prerequisites remain healthy:
  - `node scripts/smoke-test.mjs`
  - `node scripts/sanity-check.mjs`
  - `node scripts/derive.mjs`
  - `node scripts/validate-derived.mjs`
- Confirmed the dataset currently supports quiz generation flow with **336 events / 12 units** and derive output emitted without hard errors.
- Noted existing non-blocking warnings only:
  - `validate-data` warnings on `international` cause/effect category usage in several Meiji events.
  - `derive` unknown-tag fallback warnings for multiple events (category fallback succeeds).

### Next-session follow-up

1. Decide whether `international` should be added as a first-class allowed causal category or remapped to an existing taxonomy bucket.
2. Reduce derive unknown-tag warning volume by normalizing frequently recurring tags (e.g., region and period tags) into the canonical tag dictionary.
3. Add a lightweight automated "question generation snapshot" script that explicitly samples each question type per unit and validates candidate pool sizes.

## Incremental update (2026-05-23 · loading-stuck mitigation for question apps)

- Addressed a reported issue where apps could remain in "Loading..." and not surface questions when data fetch requests stalled.
- Updated shared fetch utility in `apps/shared/data-store.js` to apply a 10-second timeout using `AbortController`.
- Timeout errors now fail fast with explicit messages instead of hanging indefinitely, allowing each app's existing load-failure UI path to activate.

### Next-session follow-up

1. Add lightweight UI regression checks for at least Timeline Trainer and Map Quiz to assert loading states resolve to either question or explicit error.


## Incremental update (2026-05-24 · retention orchestration + pattern transfer mode)

- Added shared retention engine at `apps/shared/retention-engine.js` with forgetting-risk scoring, retention-queue building, interleaving, and reinforcement route recommendations.
- Updated guided-session orchestration to compute retention queues and expose reinforcement guidance in `apps/shared/guided-session-controller.js`.
- Updated dashboard to show concise highest-risk retention summary and reinforcement recommendation links.
- Extended derive output to emit `derived/retention-priority.json`.
- Added new learner mode `apps/historical-pattern-transfer/` and seed dataset `data/pattern-transfer.json`.
- Added root navigation link for **Historical Pattern Transfer** in `index.html`.

## Incremental update (2026-05-24 · timeline trainer loading-question troubleshooting note)

- Investigated a user report where Timeline Trainer can remain at "Loading question..." in several modes.
- Confirmed likely root causes from code path:
  - mode/scope/quality/difficulty filters yielding zero eligible events,
  - data fetch timeout or HTTP failure while loading seed data (including PWA/network edge cases).
- Follow-up fix now updates the question panel text explicitly on generation failure so users are not left at a stale "Loading question..." message.
