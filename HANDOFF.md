## Incremental update (2026-04-22 · causality drill + weighted connectivity sampling)
- Added new learner-facing route `apps/causality-drill/` with a continuous retrieval loop:
  - `apps/causality-drill/index.html`
  - `apps/causality-drill/app.js`
  - supports both causal directions (`cause → effect` and `effect → cause`) with 4-option MCQ prompts and immediate correctness feedback.
- Integrated Causality Drill into guided flow:
  - updated `apps/session-runner/app.js` to include Causality Drill as a first-class guided mode step.
- Added graph-connectivity weighting utilities in shared data layer:
  - `computeWeight(event)` counts outgoing + incoming causal links,
  - `weightedSample(items)` supports weighted random event selection with safe fallback behavior.
  - both exposed in `apps/shared/data-store.js`; normalized events now include `weight`.
- Applied weighted sampling in Timeline Trainer question generation:
  - updated `apps/timeline-trainer/src/data/loaders.js` to source normalized events,
  - updated `apps/timeline-trainer/src/logic/question-generator.js` so pair/triplet candidate selection uses weighted draws instead of uniform random picks.
- Added Causality Drill discoverability/support in app shell:
  - linked new mode from `index.html`,
  - added new app URLs to `service-worker.js` cache list and bumped shell cache version to `world-history-lab-shell-v2`.

## Validation completed (2026-04-22)
- `node scripts/derive.mjs` ✅

## Suggested next steps
1. Add a small distractor-quality heuristic in Causality Drill (same-era or same-tag alternatives) to improve option plausibility.
2. Consider exposing a per-mode weighting intensity knob so heavily central events do not dominate advanced learners’ sessions.
3. Add a smoke check that verifies Causality Drill can generate both forward and reverse prompts from current normalized data.

## Incremental update (2026-04-15 · geographic metadata + first map-based learning mode)
- Added location metadata to key WWI/WWII events in `data/events.json` using a normalized shape:
  - `location.region` (string)
  - `location.lat` / `location.lon` (approximate numeric coordinates)
- Covered key battles and turning points for initial geographic learning density (including Marne, Gallipoli, Verdun, Somme, Jutland, Armistice site, Versailles, Poland invasion, Midway, Stalingrad, Pearl Harbor, El Alamein, D-Day, Hiroshima).
- Extended derive integrity checks in `scripts/derive.mjs` with `validateEventLocations(events)`:
  - validates location object structure,
  - enforces coordinate range bounds,
  - preserves backward compatibility by accepting legacy `label` + `lng` location records.
- Extended shared data access in `apps/shared/data-store.js` with `getEventsWithLocation()`:
  - filters for location-ready events,
  - normalizes legacy location fields to `region` and `lon` for app consumption.
- Added new app route `apps/map-quiz/`:
  - `apps/map-quiz/index.html`
  - `apps/map-quiz/app.js`
  - renders a simple world map, plots event point, asks multiple-choice event identification, and provides immediate answer feedback.
- Updated discoverability/runtime support:
  - added Map Quiz link to `index.html`,
  - added map app assets to app-shell pre-cache list in `service-worker.js`.

## Validation completed (2026-04-15)
- `node scripts/derive.mjs` ✅ (passes; existing baseline warning noise remains for unknown tags/legacy summaries)
- `npm run smoke` ✅

## Suggested next steps
1. Expand `location` coverage from key WWI/WWII anchors to the broader event corpus so map mode has stronger replay variety.
2. Add explicit region taxonomy IDs in metadata (separate from free-text `region`) to support future clustering/filtering by continent/theater/front.
3. Integrate Map Quiz into `apps/session-runner/` as an optional spatial checkpoint after chronology mode.

## Incremental update (2026-04-14 · WWII relational density expansion)
- Expanded WW2 actor graph in `data/people.json`:
  - enriched existing WW2 people entries with `birth_year`, `death_year`, `regions`, `related_events`, and question metadata fields used by people-centric modes,
  - added 9 reviewed WW2 figures (`pe_heinrich_himmler`, `pe_ernst_kaltenbrunner`, `pe_vyacheslav_molotov`, `pe_bernard_montgomery`, `pe_erwin_rommel`, `pe_douglas_macarthur`, `pe_chester_nimitz`, `pe_isoroku_yamamoto`, `pe_george_patton`).
- Increased event-person linkage density in `data/events.json` across key WW2 arcs (diplomacy, Eastern Front, Holocaust policy chain, Pacific naval campaign, North Africa/Western Front, and war-end settlements).
- Added additional WW2 causal `effects` edges in `data/events.json` to strengthen multi-step branching and continuity between 1939 outbreak dynamics, 1942–44 turning points, and 1945 outcomes.
- Updated `data/units/unit_world_war_ii.json`:
  - expanded `person_ids` to include newly integrated WW2 figures,
  - bumped `updated_at` to `2026-04-14`.

## Validation completed (2026-04-14)
- `node scripts/derive.mjs` ✅
- `npm run smoke` ✅

## Suggested next steps
1. Add a derive-time per-unit people coverage metric (e.g., `% events with >=2 people_ids`) to keep relational density from regressing.
2. Add a focused WW2 people-recognition distractor strategy (role-aware + theater-aware) to fully exploit new actor coverage.
3. Add 1930s interwar bridge events in a dedicated prewar unit so Munich/Poland chains can be compared more explicitly against WWI postwar settlement dynamics.

## Incremental update (2026-04-13 · WW2 flagship unit + cross-unit comparison support)
- Added `data/units/unit_world_war_ii.json` with 40 reviewed WW2 events and app profiles aligned to timeline, recognition, causality, sequence, and year-estimation flows.
- Expanded `data/events.json` with 40 WW2 events (1938-1945) with causal `effects`, multi-tag coverage, and linked `people_ids`.
- Expanded `data/people.json` with WW2-linked figures required by new event references.
- Registered `unit_world_war_ii` in `data/units/index.json` and updated `data/metadata.json` (`scope.included_units`, curriculum order/prerequisites/next-units, `updated_at`).
- Updated `apps/shared/data-store.js` with `getEventUnitMap()` for event→unit lookup support across app modes.
- Updated `apps/event-comparison/index.html` + `apps/event-comparison/app.js` to enable multi-unit selection and new cross-unit prompt types with unit-aware feedback context.

## Validation completed (2026-04-13)
- `node scripts/derive.mjs` ✅
- `npm run smoke` ✅

## Suggested next steps
1. Add a light balancing heuristic in event-comparison so under-practiced units/tags are sampled more often in cross-unit mode.
2. Add dedicated WWI↔WWII authored comparison prompt pairs for higher-quality reasoning feedback than pure tag-overlap selection.
3. Extend concept tagging coverage across the new WW2 events so concept-mode features can generalize beyond the canonical backbone.

## Incremental update (2026-04-12 · concept layer v1 + History Player integration)
- Added `content_policy.concept_taxonomy` in `data/metadata.json` with 8 fixed concept themes to anchor cross-unit comparison and causal patterning.
- Tagged 27 canonical backbone events in `data/events.json` with new `concept_tags` so at least one active mode can surface conceptual patterns (not only chronology/category).
- Updated `scripts/derive.mjs` to:
  - validate `concept_tags` shape,
  - warn on concept IDs not found in metadata taxonomy,
  - pass `concept_tags` through into normalized derived events.
- Updated `apps/history-player/index.html` to surface concept pills, add concept filtering, and show up to 3 related events sharing the current event’s leading concept tag.

## Validation completed (2026-04-12)
- `node scripts/derive.mjs` ✅
- `npm run smoke` ✅

## Suggested next steps
1. Reuse `concept_tags` in Event Comparison prompt generation (cluster by concept first, then subtype by chronology/impact/similarity).
2. Add a derive artifact for concept links (`data/derived/concept_links.json`) to give timeline/recognition modes cheap cross-unit related-event lookup.
3. Expand concept tagging beyond the canonical 27 to priority modern units (French Revolution, Industrial Revolution, WWI) with consistency checks by concept density per unit.

## Incremental update (2026-04-11 · structured comparison reasoning + derive tag clusters)
- Rebuilt `apps/event-comparison/index.html` + `apps/event-comparison/app.js` into a structured comparison mode that now asks forced reasoning questions across related events:
  - **Chronology**: identify which event came first.
  - **Impact**: choose which event has greater impact within a cluster.
  - **Similarity**: select which event is most similar to an anchor event.
- Added explanatory feedback tied to `summary_short`, and persisted mastery signals for each event shown in a round (`event_comparison_<question_type>` metadata).
- Extended `apps/shared/data-store.js` with `getTagClusters()` for loading `/data/derived/tag_clusters.json`.
- Extended `scripts/derive.mjs` with tag-based cluster generation (deduped IDs, min cluster size 3, sorted output) and write-out to `data/derived/tag_clusters.json`.

## Validation completed (2026-04-11)
- `node scripts/derive.mjs` ✅
- `npm run smoke` ✅

## Suggested next steps
1. Add weighted cluster selection so under-practiced tags appear more often than already-mastered ones.
2. Improve impact prompts by introducing explicit comparative rationale fields in event data (beyond raw `importance`).
3. Add an app-level smoke test for Event Comparison question rendering + answer-key correctness across all three prompt types.

## Incremental update (2026-04-10 · derive integrity enforcement + smoke test runner)
- Updated `scripts/derive.mjs` to enforce required event fields (`id`, `label`, `time.year_start`) and fail fast on invalid references across:
  - `unit.event_ids` → `events.id`
  - `event.effects` → `events.id`
  - `event.people_ids` → `people.id`
- Standardized reference error messages for clearer debugging when data is malformed.
- Added explicit success confirmation line after derive-time validation checks pass.
- Added `scripts/smoke-test.mjs` to run basic cross-app data-flow checks against `data/events.json` and `data/derived/causal_chains.json` (non-empty pools, random selection shape, full chain-reference integrity scan).
- Added root `package.json` scripts for quick workflow commands:
  - `npm run derive`
  - `npm run smoke`

## Validation completed (2026-04-10)
- `node scripts/derive.mjs` ✅
- `npm run smoke` ✅
- negative-path validation check (intentional broken people reference) ✅ derive failed as expected

## Suggested next steps
1. Add this smoke test to CI so data PRs cannot merge with broken chain/event references.
2. Add a session-runner-focused smoke check that verifies guided mode links and unit handoff state.
3. Consider emitting a machine-readable validation report JSON from derive for richer PR diagnostics.

## Incremental update (2026-04-09 · Guided session flow + shared app header)

- Added a new guided route at `apps/session-runner/`:
  - `apps/session-runner/index.html`
  - `apps/session-runner/app.js`
- The guided runner now sequences a one-click flow across Timeline Trainer → Sequence Reconstruction → Causality Builder → Event Recognition with a simple mode/step progress indicator and completion state.
- Updated `index.html` to replace the previous start card link with a **Start Learning** button that opens `/apps/session-runner/index.html`.
- Added `apps/shared/header.js` and integrated it across active app scripts so each mode shows consistent, low-weight context for:
  - selected unit
  - mode label
  - progress summary
- Updated `apps/shared/data-store.js` with `getStoredUnitId()` and `setStoredUnitId()` helpers for safe unit persistence access.

## Validation completed (2026-04-09)
- `node scripts/derive.mjs` ✅ (passes; existing baseline unknown-tag and content warnings remain)
- `node scripts/validate-data.mjs` ✅ (passes with existing baseline warnings)

## Suggested next steps
1. Replace the session runner’s manual **Complete Step** button with app-emitted progress events (`postMessage`) so mode transitions occur automatically when actual question milestones are reached.
2. Unify header progress semantics (`x/y` consistently) across apps that currently show round/chain descriptors.
3. Add a lightweight smoke test that loads `/apps/session-runner/` and confirms all guided mode links resolve.

## Incremental update (2026-04-08 · Causal Chain Reconstruction mode)

- Added new learner-facing app route: `apps/causal-chain/` for multi-step causal chain reconstruction using drag-and-drop reordering.
- App loads precomputed chains from `data/derived/causal_chains.json`, supports unit-scoped filtering, validates chain order, and records per-event mastery outcomes.
- Extended derive pipeline (`scripts/derive.mjs`) to emit chain data to both `derived/causality_chains.json` and `data/derived/causal_chains.json` for compatibility with new and existing modes.
- Updated homepage (`index.html`) and offline precache list (`service-worker.js`) to include the new Causal Chain Reconstruction mode.

## Incremental update (2026-04-07 · WWI flagship density + people graph expansion)
- Expanded `data/units/unit_world_war_i.json` from 27 to 39 events to raise replay density for timeline, causality, and sequence modes.
- Added 12 reviewed WWI events in `data/events.json` covering additional fronts/theaters, home-front mobilization, propaganda, and diplomatic wartime transitions.
- Added multi-branch WWI causal links (additional `effects` edges on existing records) so chains are less linear and better suited for reconstruction practice.
- Added 21 reviewed WWI figures to `data/people.json` and linked both new + existing WWI events with richer `people_ids` coverage.
- Updated WWI unit `person_ids` and `updated_at` to keep unit metadata in sync with content expansion.

## Validation completed (2026-04-07)
- `node scripts/validate-data.mjs` ✅
- `node scripts/derive.mjs` ✅
- `node scripts/smoke-timeline-trainer.mjs` ✅

## Suggested next steps
1. Add a derive-time report for per-unit actor-link coverage (e.g., `% of events with people_ids`) to prevent regressions in people integration depth.
2. Add an explicit WWI comparison prompt set (Western vs Eastern vs Ottoman/front-home interactions) to reuse the new event density in Event Comparison.
3. Add a dedicated people-centered mode that asks for likely actors from event summaries, leveraging the expanded WWI person graph.

## Incremental update (2026-04-06 · World War I flagship unit + macro causality links)
- Added `data/units/unit_world_war_i.json` with 27 events and app profiles to serve as a high-density flagship unit across timeline, recognition, causality, sequence, and year estimation modes.
- Expanded `data/events.json` with 27 reviewed WWI events from long-term preconditions through 1920 settlement outcomes, each with `summary_short`, tags, and explicit causal `effects`.
- Added reviewed WWI people records to `data/people.json` and linked them to key WWI events via `people_ids`.
- Added cross-unit causal links from existing Industrial Revolution / Imperialism events into WWI precursors and from WWI outcomes into later global decolonization/diplomacy events.
- Updated `data/units/index.json` and `data/metadata.json` so `unit_world_war_i` is included in scope and curriculum sequencing.

## Validation completed (2026-04-06)
- `node scripts/validate-data.mjs` ✅
- `node scripts/derive.mjs` ✅
- `node scripts/smoke-timeline-trainer.mjs` ✅

## Suggested next steps
1. Add a dedicated WWI comparison prompt set (e.g., Western Front vs Eastern Front vs Ottoman theater) in `event-comparison`-compatible unit metadata.
2. Add WWI-to-interwar bridge events (1920s–1930s) to make Treaty outcomes less jumpy before 1945 anchors.
3. Add a small derive-time check for cross-unit link count so macro-causality does not regress silently.

## Incremental update (2026-04-05 · comparison-focused unit + event-comparison reinforcement)
- Added new unit file `data/units/industrialization-pathways-comparison.json` with 14 events spanning Britain, Qing China, and Meiji Japan for explicit comparative industrialization learning.
- Added `comparison_prompts` in that unit to encode shared drivers + contrast notes for targeted pairwise practice.
- Updated `data/units/index.json` and `data/metadata.json` so the new comparison unit is included in scope and curriculum sequencing.
- Updated `apps/event-comparison/index.html` and `apps/event-comparison/app.js`:
  - app now loads unit-level comparison prompts when present,
  - prompt pairs are prioritized over random pairing within the selected unit,
  - post-answer feedback now includes explicit shared-driver and contrast-note text for deeper "why differences" learning.

## Validation completed (2026-04-05)
- `node scripts/validate-data.mjs` ✅
- `node scripts/derive.mjs` ✅

## Suggested next steps
1. Reuse `comparison_prompts` in Causality Builder (e.g., dual-chain entry from selected comparison pair).
2. Add a second comparison unit (state formation or empire governance) to avoid overfitting comparison practice to industrialization only.
3. Consider adding optional answer-mode split in Event Comparison: first identify shared driver, then identify key divergence.


## Incremental update (2026-04-05 · curriculum map + unit-guided setup)
- Added explicit curriculum metadata to `data/metadata.json`:
  - new `curriculum` section with sequence assumptions,
  - ordered unit records with `order`, `era`, and `difficulty` for all IDs in `data/units/index.json`.
- Extended `apps/shared/data-store.js`:
  - added `getMetadata()` and curriculum-aware unit enrichment,
  - `getUnits()` now returns ordered units with `label`, `order`, `era`, `difficulty`, and loaded `event_ids`,
  - added `getNextUnit(units, currentUnitId)` helper for progression hints.
- Updated `apps/event-comparison/` with unit-aware onboarding flow:
  - added unit selector UI,
  - filtered event pool by selected unit,
  - persisted `selected_unit` in `localStorage`,
  - added next-unit guidance text.
- Updated `apps/sequence-reconstruction/` with unit-aware onboarding flow:
  - added unit selector UI,
  - filtered causality chains to selected-unit event sets,
  - persisted `selected_unit` in `localStorage`,
  - added next-unit guidance text.
- Updated `README.md` with a new dated section for this curriculum/progression update.

## Validation completed (2026-04-05)
- `node -e "..."` curriculum cross-check ✅ (`missing: [], extra: [], dup: []`).
- `node scripts/derive.mjs` ✅ (passes; existing baseline warnings remain for unknown tags and pre-existing summary/category gaps).
- `node scripts/validate-data.mjs` ✅ (passes with existing baseline warnings outside this task).

## Suggested next steps
1. Add a small shared unit-selector UI helper under `apps/shared/` so repeated setup rendering/event wiring is not duplicated across apps.
2. Consider surfacing unit progression status on the homepage (e.g., "current" + "next") using the new curriculum metadata.
3. Decide whether sequence mode should support partial-unit chains (at least N events in selected unit) instead of strict all-events-in-unit matching.

# Handoff



## Incremental update (2026-04-16 · WW2 validation fix for missing question_types)
- Resolved CI validation failure in `node scripts/validate.mjs` caused by missing `question_types` arrays on 40 World War II events (from `ev_munich_agreement_1938` through `ev_island_hopping_campaign_1943_1945`) in `data/events.json`.
- Backfilled all missing WW2 records with a consistent question-type set:
  - `timeline_before_after`
  - `what_happened`
  - `cause_and_effect`
- Added a matching dated update note in `README.md` under recent updates so repository history reflects the schema-alignment fix.

## Validation completed (2026-04-16)
- `node scripts/validate.mjs` ✅

## Suggested next steps
1. Add a small derive/validation guard that checks newly added events include `question_types` before merge to avoid repeat regressions.
2. Consider introducing unit-level defaults in tooling so repetitive fields (like `question_types`) can be auto-filled deterministically.

## Incremental update (2026-04-03 · validation + runtime guard hardening)
- Updated `scripts/derive.mjs` to add controlled tag vocabulary checks:
  - warns on unknown tags via `[derive] Unknown tag "..."`
  - fails fast only for invalid schema/reference issues (unchanged behavior for hard errors).
- Updated `apps/sequence-reconstruction/app.js`:
  - added strict event-shape guard (`id`, `label`, `time.year_start`),
  - added safe fallback label rendering (`Unknown event`),
  - added explicit no-valid-events error path to avoid fragile rendering states.
- Updated `apps/event-comparison/app.js`:
  - tightened event validation to require `time.year_start`,
  - added `safeLabel()` fallback for option/result rendering,
  - improved load-failure UI with explicit "No data available" + reload guidance.

## Validation completed (2026-04-03)
- `node scripts/derive.mjs` ✅
- `node scripts/validate-data.mjs` ✅ (passes with existing baseline warnings on older records)
- `node scripts/smoke-timeline-trainer.mjs` ✅

## Suggested next steps
1. Move tag vocabulary from hardcoded derive constant into `data/metadata.json` so content and validation stay aligned in one source of truth.
2. Add lightweight smoke tests for `event-comparison` and `sequence-reconstruction` empty/malformed-data fallbacks.
3. Decide whether unknown-tag warnings should eventually become CI-blocking once tag taxonomy is stabilized.

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

## Incremental update (2026-03-29 · shared data layer + session engine)
- Added `apps/shared/data-store.js` to centralize `/data` loading and caching:
  - `getAllEvents()`
  - `getUnits()`
  - `getUnitById(unitId)`
  - `getEventsForUnit(unitId)`
  - `getAllPeople()`
- Refactored raw-data consumers to use the new shared store:
  - `apps/year-estimation/app.js`
  - `apps/people-recognition/app.js`
  - `apps/timeline-trainer/src/data/loaders.js`
- Added `apps/shared/session-engine.js` with a reusable session abstraction:
  - `nextQuestion()`
  - `submitAnswer(answer)`
  - `getFeedback()`
- Migrated Event Recognition (`apps/event-recognition/app.js`) to use the shared session engine for answer evaluation and feedback retrieval while keeping existing UI/session flow.
- Updated `README.md` to document the new shared infrastructure changes under a new dated update section.

## Validation completed (2026-03-29)
- `node scripts/validate-data.mjs` ✅
- `node scripts/derive.mjs` ✅
- `node scripts/smoke-timeline-trainer.mjs` ✅

## Suggested next steps
1. Migrate remaining derived-data fetches (for example sequence chain loading) behind shared helpers for complete loader consistency.
2. Expand `session-engine` with optional lifecycle hooks (for example `onQuestionStart`, `onAnswer`) so mastery tracking can be fully plugin-based.
3. Add a cross-app smoke script that verifies all app entrypoints can load and render at least one question under default setup.

## Incremental update (2026-03-29 · global backbone + onboarding loop)
- Expanded `data/events.json` with 12 reviewed global-backbone events to broaden non-Eurocentric and pre-/post-modern coverage for shared app reuse:
  - `ev_mali_mansa_musa_hajj_1324`
  - `ev_ottoman_conquest_egypt_1517`
  - `ev_mughal_empire_akbar_consolidation_1570s`
  - `ev_tokugawa_shogunate_1603`
  - `ev_haitian_revolution_independence_1804`
  - `ev_abolition_british_slave_trade_1807`
  - `ev_qing_first_opium_war_1839`
  - `ev_indian_revolt_1857`
  - `ev_berlin_conference_1884`
  - `ev_pan_african_congress_1945`
  - `ev_india_independence_1947`
  - `ev_bandung_conference_1955`
- Added a new onboarding unit file `data/units/foundations-world-history.json` with 17 cross-era anchor events and app profiles for timeline, event recognition, and causality.
- Registered the unit in `data/units/index.json` and added it to `data/metadata.json` (`scope.included_units`) so derive/validation include it.
- Updated `apps/history-player/index.html`:
  - default canonical slice now starts at 25 events,
  - added explicit progression cues (era label + next-event preview) for narrative continuity.
- Updated `index.html` top section to an explicit 3-step learning path and changed primary CTA to start with History Player before drill modes.
- Updated `README.md` with a new dated section describing the global foundations expansion and player/onboarding changes.

## Validation completed (2026-03-29)
- `node scripts/validate-data.mjs` ✅
- `node scripts/derive.mjs` ✅
- `node scripts/smoke-timeline-trainer.mjs` ✅

## Suggested next steps
1. Add people links for new backbone events (for example Mansa Musa, Akbar, Toussaint Louverture, Sukarno, Nehru) to improve People Recognition coverage.
2. Add at least one regional comparison mode or prompt set (same-century cross-region contrasts) to make comparison learning explicit.
3. Consider splitting data-only and app-behavior changes into separate PRs in future for faster review cycles.

## Incremental update (2026-03-30 · industrial expansion + cross-unit bridges)
- Added `data/units/industrial_revolution.json` as a denser replacement config for `unit_industrial_revolution` and updated `data/units/index.json` to point the unit path to the underscore filename.
- Expanded `data/events.json` with new reviewed Industrial Revolution events and causal links spanning ~1750-1900, including:
  - textile/steam takeoff (`ev_spinning_jenny_1764`, `ev_watt_steam_engine_1776`, `ev_factory_system_rise_1780s`)
  - transport + communication (`ev_liverpool_manchester_railway_1830`, `ev_telegraph_invention_1837`, `ev_railway_boom_1840s`)
  - social/political responses (`ev_labor_movements_1830s_1840s`, `ev_factory_act_1847_ten_hours`, `ev_public_health_act_1848`, `ev_communist_manifesto_1848`)
  - late-century acceleration (`ev_bessemer_process_1856`, `ev_second_industrial_revolution_1870s`, `ev_electric_power_adoption_1880s`)
- Added cross-unit bridge events to extend continuity across previously isolated clusters:
  - `ev_napoleonic_wars_1803_1815`
  - `ev_congress_vienna_1815`
  - `ev_concert_of_europe_1815_1848`
  - `ev_revolutions_1848`
  - plus market/state bridge nodes (`ev_state_military_fiscal_expansion_1810s_1820s`, `ev_national_market_integration_1850s`, `ev_global_market_coordination_1860s`).
- Updated unit membership for bridge continuity across:
  - `data/units/french-revolution-napoleon.json`
  - `data/units/fr_french_revolution.json`
  - `data/units/foundations-world-history.json`
  - `data/units/age-of-imperialism.json`
- Added reviewed people records in `data/people.json` to support new `people_ids` references:
  - `pe_james_watt`
  - `pe_george_stephenson`
  - `pe_henry_bessemer`
  - `pe_samuel_morse`

## Validation completed (2026-03-30)
- `node scripts/validate-data.mjs` ✅ (passes; existing baseline warnings remain in older imperialism/meiji records outside this scope).
- `node scripts/derive.mjs` ✅
- `node scripts/smoke-timeline-trainer.mjs` ✅
- Cross-chain spot-check: 213 derived chains total; chains now include Napoleonic→Industrial multi-step paths.

## Suggested next steps
1. Backfill missing `summary_short` fields for older imperialism events to reduce warning noise and improve recognition quality.
2. Add the new bridge events to additional app profiles/question-type taxonomies if stricter mode-level curation is desired.
3. Consider deprecating or removing the legacy `data/units/industrial-revolution.json` file to avoid filename ambiguity now that the registry uses `industrial_revolution.json`.

## Incremental update (2026-03-31 · dense industrial unit + people expansion)
- Expanded `data/units/industrial_revolution.json` from 18 to 26 events to create a high-density unit suitable for timeline, causality, sequence reconstruction, and year-estimation practice.
- Added five reviewed events to `data/events.json` with linked `effects` and `people_ids`:
  - `ev_water_frame_1769`
  - `ev_cotton_gin_1793`
  - `ev_stockton_darlington_railway_1825`
  - `ev_internal_combustion_engine_1876`
  - `ev_matchgirls_strike_1888`
- Added/strengthened causal links across industrial stages (mechanization → factory growth → rail/telegraph integration → labor reform/mass politics → late-century production systems).
- Expanded `data/people.json` with 11 reviewed figures and aligned event links:
  - `pe_richard_arkwright`
  - `pe_james_hargreaves`
  - `pe_eli_whitney`
  - `pe_richard_trevithick`
  - `pe_isambard_kingdom_brunel`
  - `pe_robert_owen`
  - `pe_lord_shaftesbury`
  - `pe_karl_benz`
  - `pe_nikola_tesla`
  - `pe_henry_ford`
  - `pe_annie_besant`
- Updated existing industrial events to include additional `people_ids` coverage for technology, labor, and electrification clusters.
- Updated `README.md` with a new dated project update section for this expansion.

## Validation completed (2026-03-31)
- `node scripts/validate-data.mjs` ✅
- `node scripts/derive.mjs` ✅
- `node scripts/smoke-timeline-trainer.mjs` ✅

## Suggested next steps
1. Add 2-3 industrial-era public-health/urban-governance events (e.g., sanitation infrastructure milestones) to deepen social policy chains.
2. Extend people links in non-industrial units so People Recognition gains similar density outside this unit.
3. Add a small derive check for person-orphan reporting (warning-level) to keep newly added people actively connected to events over time.

## Incremental update (2026-03-31 · CI validation follow-up)
- Resolved CI failure in `node scripts/validate.mjs` by adding `question_types` arrays to the 33 industrial/bridge events that previously lacked the field.
- Normalized newly added `question_types` to metadata-enabled values (`timeline_before_after`, `what_happened`, `cause_and_effect`) to keep taxonomy consistent with `data/metadata.json`.
- Re-ran validation + derive + smoke checks after taxonomy repair.

## Incremental update (2026-04-01 · Event Comparison mode + controlled tags)
- Added a new learner-facing app at `apps/event-comparison/` with side-by-side event comparison flow:
  - renders two random events,
  - asks for a key similarity as multiple choice,
  - evaluates answer correctness,
  - shows summary-based explanation for both events,
  - records mastery results for both events under `mode: event_comparison`.
- Added route entry file `apps/event-comparison/index.html` and logic file `apps/event-comparison/app.js`.
- Updated homepage Understanding cluster in `index.html` with a new **Event Comparison** link.
- Added/standardized controlled classification tags for all events in the Industrial Revolution unit (`data/units/industrial_revolution.json` membership), appending labels such as:
  - type-like: `invention`, `movement`, `law`, `system`, `infrastructure`
  - domain-like: `technological`, `economic`, `social`, `political`
  - theme-like: `industrial`, `labor`, `transport`, `communication`, `public_health`
- Regenerated derived artifacts so normalized outputs reflect updated event tags.

## Validation completed (2026-04-01)
- `node scripts/derive.mjs` ✅
- `node scripts/validate-data.mjs` ✅ (passes with existing baseline warnings on older Imperialism/Meiji records outside this task)
- `node scripts/smoke-timeline-trainer.mjs` ✅

## Suggested next steps
1. Add unit-scoped comparison setup (All units vs selected unit) so Event Comparison matches the same focused-study workflow as other apps.
2. Expand controlled comparison tags to non-industrial units for broader cross-unit similarity quality.
3. Consider adding a second prompt type in Event Comparison ("key difference") for contrast reasoning alongside similarity.


## Incremental update (2026-04-02 · learning-path navigation + shared feedback UX)
- Reworked `index.html` app discovery into explicit progression stages:
  - **Start here**: Event Recognition
  - **Build understanding**: Timeline Trainer + Year Estimation
  - **Deep understanding**: Causality Builder, Sequence Reconstruction, Event Comparison, People Recognition, History Player, Overview
- Added section-level guidance copy and vertically stacked app-link presentation to reduce decision fatigue and improve mobile readability.
- Added shared feedback renderer `apps/shared/feedback.js` and integrated it into:
  - `apps/event-recognition/app.js`
  - `apps/people-recognition/app.js`
  - `apps/causality-builder/app.js`
  - `apps/event-comparison/app.js`
  - `apps/sequence-reconstruction/app.js`
  - `apps/year-estimation/app.js`
- Standardized answer feedback to consistently include correctness status, event/answer context, and concise explanation text; incorrect answers now clearly surface the correct answer label.

## Validation completed (2026-04-02)
- `node scripts/derive.mjs` ✅

## Suggested next steps
1. Extend the same shared feedback renderer to Timeline Trainer (currently its own message loop) for full parity.
2. Add a tiny shared style token (for feedback spacing/typography) so per-app feedback containers look identical without duplicating CSS.
3. Consider a lightweight smoke test that checks every app renders non-empty feedback after a simulated submit action.

## Incremental update (2026-04-04 · weighted repetition + focused weak-mode alignment)
- Extended `apps/shared/mastery-store.js` with reusable adaptive helpers:
  - `getAccuracy(eventId)`
  - `getWeight(eventId)`
  - `isWeakEvent(eventId, threshold = 0.6)`
- Extended `apps/shared/session-engine.js` with `weightedPick(items, getWeight)` for shared weighted random selection.
- Updated `apps/event-recognition/app.js` to:
  - use weighted answer selection (`weightedPick` + `getWeight`) so low-accuracy/unseen events surface more often,
  - apply focused weak-event filtering via `isWeakEvent` when **Focus on weak areas** is enabled,
  - keep graceful fallback to full-pool practice when too few weak events are available to build a 4-option question.

## Validation completed (2026-04-04)
- `node scripts/validate-data.mjs` ✅ (passes with existing baseline warnings outside this task)
- `node scripts/derive.mjs` ✅ (passes; existing unknown-tag warnings remain baseline)

## Suggested next steps
1. Reuse `weightedPick` in additional quiz generators (timeline/causality) to make adaptive weighting cross-app.
2. Add a lightweight in-app debug panel (dev-only) to show current event weight/accuracy while tuning thresholds.
3. Consider a mastery reset control in setup for deterministic testing and learner privacy control.

## Incremental update (2026-04-12 · curriculum progression graph + mastery-aware runner flow)
- Extended `data/metadata.json` curriculum units with explicit progression graph fields:
  - `prerequisites`
  - `next_units`
- Updated `apps/shared/data-store.js` to carry progression metadata into `getUnits()` and upgraded `getNextUnit()` to prefer `next_units` links (with ordered fallback for compatibility).
- Updated `apps/session-runner/app.js` to:
  - choose a starting unit using mastery-aware weak-area scoring when no unit is preselected,
  - display a completion-time **Start next unit** button that advances along curriculum links,
  - persist progression handoff via shared `setStoredUnitId()`.

## Validation completed (2026-04-12)
- `node scripts/derive.mjs` ✅
- `npm run smoke` ✅
- `node -e "..."` metadata progression reference check ✅ (`metadata progression references OK`)

## Suggested next steps
1. Pass a lightweight `focus=weak` query hint into each guided mode and implement optional handling in modes that support adaptive pools.
2. Add a small "path view" component in Session Runner so learners can preview completed/current/next units at a glance.
3. Add a smoke check for session-runner completion flow that verifies next-unit button visibility and localStorage unit handoff.

## Session handoff (2026-04-16)
### What changed
- Homepage (`index.html`) now uses a session-first entry layout:
  - one primary CTA: **Start Learning**
  - CTA routes to `/apps/session-runner/`
  - secondary “Practice Modes” list with concise mode descriptions.
- Session Runner (`apps/session-runner/`) now follows a fixed, guided mode sequence:
  - Timeline → Sequence → Causality → Comparison
  - transitions after `QUESTIONS_PER_MODE = 5`
  - visible current mode label added to the UI.

### Why this was done
- Reduce cognitive load at entry by removing equal-weight app choices.
- Make session runner the explicit default flow.
- Improve learning continuity with predictable multi-mode progression.

### Validation run
- `node scripts/derive.mjs`

### Notes for next session
- Current runner progression still uses manual **Complete Question** clicks; consider wiring iframe-to-parent events so real question completions trigger transitions automatically.
- If mode naming should match app labels exactly (e.g., “Sequence Reconstruction” vs “Sequence”), update display strings only (routing is already wired).
## Incremental update (2026-04-17 · Friday reliability hardening)
- Implemented stricter event-schema validation in `scripts/derive.mjs`:
  - `summary_short` is now required for all events,
  - `people_ids` must be an array of non-empty strings when present,
  - `effects` must be an array when present,
  - effect references now fail on self-reference and malformed entries,
  - effect entries still support both reference style (`event_id`) and descriptive style (`label`).
- Expanded app-side resilience in `apps/shared/data-store.js` with normalization utilities:
  - central `normalizeEvent()` now provides safe defaults,
  - invalid `effects`/`location` payloads are dropped safely,
  - one-time console warnings are emitted for malformed records,
  - added shared `getEventYear()` helper.
- Backfilled `summary_short` content for 15 Imperialism events in `data/events.json` that previously failed under stricter derive requirements.

## Validation completed (2026-04-17)
- `node scripts/derive.mjs` ✅
- `node scripts/validate.mjs` ✅
- `npm run smoke` ✅

## Suggested next steps
1. Add a CI negative-path fixture set (intentional broken `people_ids` / `effects` / `location`) to prove derive hard-fails correctly.
2. Expand tag taxonomy alignment (or downgrade noisy warnings) so derive output highlights genuinely actionable issues.
3. Consider applying the same normalization/warning pattern to people + unit payloads in `apps/shared/data-store.js`.

## Incremental update (2026-04-18 · Graph Explorer + reverse causal links)
- Added new app `apps/graph-explorer/` with:
  - unit filter,
  - event-node list (bounded render count),
  - click-to-focus details panel,
  - incoming (`caused_by`) + outgoing (`effects`) relationship traversal.
- Added reverse-link derivation in `scripts/derive.mjs`:
  - builds `caused_by` from all valid effect links,
  - deduplicates and sorts incoming IDs per event,
  - keeps `effects` untouched for backward compatibility.
- Added `getNormalizedEvents()` in `apps/shared/data-store.js` so graph apps can consume enriched derived event objects (including `unit_ids` and `caused_by`).
- Updated shell discoverability/caching:
  - linked Graph Explorer from `/index.html`,
  - added `/apps/graph-explorer/*` assets to `service-worker.js` pre-cache list.

## Validation completed (2026-04-18)
- `node scripts/derive.mjs` ✅
- `node scripts/validate.mjs` ✅
- `npm run smoke` ✅

## Suggested next steps
1. Add a lightweight legend and edge-type toggle in Graph Explorer (effects-only vs full related links) for clearer onboarding.
2. Add search (event label / tag) to complement unit filtering in large pools.
3. Consider adding mini-map clustering (by year bucket or unit) when graph size exceeds list-mode readability.

## Incremental update (2026-04-19 · Session runner curriculum progression)
- Reworked `apps/session-runner/app.js` so unit selection is now curriculum-aware:
  - checks `prerequisites` before allowing a unit to be selected,
  - sorts available units by metadata (`difficulty` then `order`),
  - tracks completed units in local storage (`completed_units`) and marks a unit complete at end-of-session.
- Added explicit next-unit recommendation based on newly unlocked incomplete units instead of simple flat progression.
- Added new unit context/progress UI to `apps/session-runner/index.html`:
  - current unit label + completion state,
  - per-unit session progress text,
  - visual progress bar (`#progress-fill`) with ARIA updates.

## Validation completed (2026-04-19)
- `node scripts/derive.mjs` ✅
- `node scripts/validate.mjs` ✅
- `npm run smoke` ✅

## Suggested next steps
1. Add a dedicated session-runner smoke test that simulates prerequisite lock/unlock behavior with a mocked localStorage state.
2. Add a small “Reset progression” button in session-runner settings for easier manual QA and learner control.
3. Consider blending progression state with mastery signals (e.g., minimum accuracy threshold before marking unit completed).
## Incremental update (2026-04-20 · persistence + review queue baseline)
- Updated `apps/shared/mastery-store.js` to strengthen longitudinal event tracking:
  - added explicit `seen` count (with backward compatibility to existing `attempts`),
  - retained and normalized `correct`, `incorrect`, and `last_seen`,
  - added persisted review queue storage (`whl_review_queue_v1`) keyed by event id with mistake count and last-incorrect timestamp.
- Updated `apps/event-recognition/app.js` to introduce automatic cross-session repetition:
  - imports and checks queued review event IDs at question generation time,
  - resurfaces eligible queued events before normal weighted selection,
  - shows session hint text when a question comes from resurfaced mistakes.
- Practical effect: learners now see previously-missed events reintroduced in later sessions without manually selecting a review mode.

## Validation completed (2026-04-20)
- `node scripts/derive.mjs` ✅
- `npm run smoke` ✅

## Suggested next steps
1. Reuse `getReviewQueueEventIds()` in `apps/timeline-trainer/src/App.js` to surface missed chronology pairs (not only recognition prompts).
2. Add a tiny diagnostics panel (or debug utility) to inspect/clear mastery + review state for easier QA.
3. Define an explicit “mastered” threshold (e.g., min seen + min accuracy) and integrate it into weighted selection for all modes.

## Incremental update (2026-04-21 · non-European expansion + tag normalization)
- Added `data/units/islamic_expansion.json` as a new reviewed unit centered on 7th–8th century Islamic state formation and expansion.
- Expanded `data/events.json` with 13 new linked events (from first revelation to Abbasid Revolution) and updated `ev_hijra_622` to connect into the new chain.
- Expanded `data/people.json` with 10 key figures (Muhammad, early caliphs, military and dynastic actors) and connected them via `people_ids` + `related_events`.
- Updated `data/units/index.json` and `data/metadata.json` to register the new unit and include it in curriculum progression after foundations.
- Updated `scripts/derive.mjs` tag handling:
  - moved to controlled theme tags (`war`, `revolution`, `empire`, `religion`, `politics`, `economy`, `exploration`, `colonization`, `state-formation`),
  - normalizes legacy/free-form tags into controlled tags during derive,
  - enforces at least one controlled tag per event in derived output.

## Validation completed (2026-04-21)
- `node scripts/derive.mjs` ✅
- `npm run smoke` ✅

## Suggested next steps
1. Add app-level UI filters for the controlled tag taxonomy so learners can explicitly practice by theme (e.g., all `empire` or all `religion` events).
2. Continue non-European data expansion with a companion unit (e.g., Tang-Song transitions or Abbasid-era trade/science) to strengthen cross-unit comparisons.
3. Gradually replace high-noise legacy tags in `data/events.json` with canonical tags directly at source so derive logs are cleaner.


## Incremental update (2026-04-22 · causality drill + weighted sampling)
- Added `apps/causality-drill/index.html` and `apps/causality-drill/app.js` for continuous causal recall practice:
  - forward (`cause → effect`) and reverse (`effect → cause`) prompts,
  - multiple-choice options (up to 4),
  - immediate correct/incorrect feedback and auto-advance loop.
- Updated `apps/shared/data-store.js`:
  - normalizes `caused_by` on base events,
  - computes `weight` from graph degree (`effects` + `caused_by`),
  - exports `weightedSample(items, getWeight?)` helper for weighted selection.
- Updated `apps/timeline-trainer/src/logic/question-generator.js`:
  - pair/triplet event sampling now uses weighted selection by event `weight`.
- Updated guided/discovery flows:
  - `apps/session-runner/app.js` now includes **Causality Drill** in guided mode list,
  - `index.html` adds Causality Drill to Practice Modes,
  - `service-worker.js` precaches Causality Drill assets and bumps shell cache version.

## Validation completed (2026-04-22)
- `node scripts/derive.mjs` ✅ (passes with existing dataset tag/category warnings)
- `npm run smoke` ✅

## Suggested next steps
1. Add optional distractor-quality filtering in Causality Drill (e.g., same unit/theme distractors first) to reduce trivial options.
2. Add a tiny in-app mode toggle to force forward-only or reverse-only drills for focused remediation.
3. Reuse `weightedSample()` in additional modes (e.g., event recognition/comparison) for consistent centrality-aware repetition.


## Incremental update (2026-04-23 · onboarding clarity + in-session mode switching)
- Updated `index.html` to improve onboarding clarity:
  - retained a dominant **Start Learning** CTA for guided entry,
  - split mode links into **Practice** vs **Explore**,
  - added concise role descriptions and visual de-emphasis for secondary tools.
- Updated `apps/session-runner/index.html` to include a mode selector strip.
- Updated `apps/session-runner/app.js` to support in-session mode switching without leaving the runner page:
  - mode switch preserves each mode's question count (`x/5`),
  - total unit progress remains aggregated across modes,
  - completion state still triggers when total target questions are met.

## Validation completed (2026-04-23)
- `node scripts/derive.mjs` ✅ (passes with existing dataset warnings)
- `node scripts/validate.mjs` ✅
- `npm run smoke` ✅

## Suggested next steps
1. Replace manual “Complete Question” clicks with message events emitted from embedded apps to reduce click overhead.
2. Add optional auto-rotate mode schedule (e.g., every N questions) to encourage varied retrieval practice.
3. Add a tiny tooltip/help legend explaining what each mode selector chip trains.


## Incremental update (2026-04-24 · strict graph validation + sanity integration check)
- Updated `scripts/derive.mjs` to add stricter graph integrity checks:
  - validates that every event belongs to at least one unit (orphan detection, hard-fail),
  - validates derived reverse causality (`caused_by`) remains consistent with source forward links (`effects`),
  - preserves existing hard-fail behavior for missing effects/people/unit references.
- Added `scripts/sanity-check.mjs` for lightweight integration coverage:
  - loads `data/events.json` + unit registry/files,
  - performs random sampling checks for causal references,
  - verifies unit event pools are non-empty and fully resolvable,
  - exits with error code on any runtime-breaking inconsistency.
- Added npm script entry: `npm run sanity`.

### Validation completed (2026-04-24)
- `node scripts/derive.mjs` ✅
- `node scripts/sanity-check.mjs` ✅
- `npm run smoke` ✅

### Notes for next session
1. Consider extending `sanity-check.mjs` to include minimal app-data adapters (e.g., normalized events/weights) so it catches regressions in shared data-store assumptions.
2. Add one negative-path fixture in CI that intentionally breaks a reference and asserts derive/sanity fail as expected.
3. If validation strictness blocks draft authoring, introduce an explicit draft-only bypass flag rather than weakening default checks.
## Incremental update (2026-04-25 · geographic metadata expansion + landing-page IA refresh)
- Expanded learner-facing route discoverability on the root page (`index.html`):
  - restructured mode sections to **Start**, **Practice**, and **Connections**,
  - added route links for existing apps that were previously hidden (Overview, History Player, Year Estimation, Event Recognition, People Recognition, Causality Builder),
  - added concise per-section helper notes and lightweight status badges (Core/Practice/Explore/Experimental),
  - preserved the primary CTA behavior: **Start Learning** still routes to `/apps/session-runner/`.
- Added first-pass geography metadata in `data/events.json` for approved events with clear anchors:
  - French Revolution/Napoleonic core events now have normalized `places` and representative `location` anchors for Paris/Versailles/Vienna where appropriate,
  - Industrial Revolution site-bound events now include anchors for Manchester/Cromford/Merthyr Tydfil/Rainhill/London,
  - Meiji events now include location anchors for Uraga/Shimoda/Kyoto/Tokyo as appropriate,
  - broad invention/patent records were kept conservative by adding `regions` without forcing ambiguous point coordinates.

## Validation completed (2026-04-25)
- `node scripts/validate-data.mjs` ✅
- `node scripts/derive.mjs` ✅
- route smoke checks via local server + curl for `/`, `/apps/map-quiz/`, `/apps/history-player/`, and newly linked app routes ✅

## Suggested next steps
1. Add a small derive/report artifact for location coverage by unit (e.g., `% events with location`) to keep map-readiness from regressing.
2. Consider showing “ready/not enough location data” messaging in Map Quiz per unit so learners understand sparse geography cases.
3. If desired, align README’s earlier “MVP focus” section with current portfolio language to reduce historical drift in project docs.
