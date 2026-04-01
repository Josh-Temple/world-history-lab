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
