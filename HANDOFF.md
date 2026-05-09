# HANDOFF (2026-05-05)

## What was completed today

- Focused Tuesday data/content expansion on the **French Revolution** unit.
- Added **31 new events** to `data/events.json` (1787–1799) to increase within-unit practice density and reduce shallow/repetitive sessions.
- Added **12 key figures** to `data/people.json` and linked them meaningfully in new event `people_ids` fields.
- Updated `data/units/fr_french_revolution.json`:
  - appended new event IDs,
  - appended new person IDs,
  - bumped `updated_at` to `2026-05-05T00:00:00Z`.
- Ran full data checks and derive regeneration.

## Validation status

- `node scripts/validate-data.mjs` ✅ pass (existing baseline warnings remain in Meiji cause/effect category vocabulary).
- `node scripts/derive.mjs` ✅ pass (existing baseline unknown-tag fallback warnings remain across legacy records).

## Why this matters

- French Revolution now has a denser event pool, which should improve:
  - timeline variety,
  - sequencing quality,
  - causality practice depth,
  - guided session-runner diversity for this unit.

## Suggested next session priorities

1. **Quality pass on the 31 newly added events**
   - replace generic `summary_short` placeholders with specific, high-signal summaries.
2. **Add causality edges (`effects` / `caused_by`)** across the newly added French Revolution events for stronger chain-based modes.
3. **Backfill question metadata** (skills/primary_skill, tags normalization) for better adaptive balancing.
4. Repeat the same density-first process for next sparse unit (likely `unit_meiji_restoration` or `unit_islamic_expansion`).


## Additional fix in this session (2026-05-05)

- Resolved CI validation failure from `node scripts/validate.mjs` caused by missing `question_types` on 31 newly added French Revolution events.
- Backfilled each affected event with: `timeline_before_after`, `what_happened`, `cause_and_effect`.
- Re-ran `node scripts/validate.mjs` and confirmed `[validate] OK`.


## Additional progress in this session (2026-05-06)

- Implemented `apps/comparison-trainer/` (new historical comparison learning mode):
  - side-by-side event cards,
  - same-era / different-era pair generation,
  - rotating reflection prompts,
  - explanation helper text showing shared themes and year-gap context.
- Added root navigation link and service-worker pre-cache entries for the new app.
- Added controlled `themes` support:
  - tagged 50 events in `data/events.json`,
  - added strict `themes` validation in `scripts/validate-data.mjs`,
  - preserved `themes` in `scripts/derive.mjs` normalized output.
- Verification completed:
  - `node scripts/validate-data.mjs` pass,
  - `node scripts/derive.mjs` pass,
  - `node scripts/validate.mjs` pass.

## Suggested next session priorities

1. Expand `themes` tagging from 50 events to all reviewed events in high-traffic units.
2. Add answer-capture UI to `comparison-trainer` (typed reflection or checklist) with local persistence.
3. Add theme-based pairing controls (e.g., force shared theme vs force contrast theme).

## Additional progress in this session (2026-05-07)

- Added session-level confidence capture controls (`Easy`, `Unsure`, `Guess`, optional `Skip`) to `apps/session-runner/`.
- Added session completion summary and weak-response continuation CTA to `apps/session-runner/`.
- Upgraded `apps/comparison-trainer/` with:
  - a visible session header/progress indicator,
  - lightweight feedback states,
  - confidence capture controls,
  - completion summary with weak-item practice restart.
- Verified repository integrity with validation + derive regeneration.

## Suggested next session priorities

1. Wire confidence captures into shared persistence (`mastery-store`) rather than in-memory session arrays.
2. Add equivalent session header/summary treatment to `apps/timeline-trainer/` to complete parity.
3. Replace session-runner manual "Complete Question" gating with embedded app event-based completion signals.

## Additional progress in this session (2026-05-08)

- Upgraded `apps/timeline-trainer/` with session-level UX parity:
  - added visible session header progress (`x / 10`),
  - added post-answer confidence capture controls (`Easy`, `Unsure`, `Guess`, `Skip`),
  - added end-of-session summary with weak-item continuation CTA.
- Updated timeline trainer behavior so confidence capture is part of the feedback loop before moving on.
- Kept existing data pipeline healthy by re-running validation and derive.

## Suggested next session priorities

1. Persist timeline-trainer confidence signals to shared mastery persistence for cross-app adaptation.
2. Align wording/semantics of "weak" vs "incorrect" across timeline/comparison/session-runner summaries.
3. Replace any remaining manual completion gating in session-runner with child-app completion events for tighter UX continuity.

## Additional progress in this session (2026-05-09)

- Implemented `apps/spread-explorer/` (Historical Spread Explorer):
  - year slider + theme selector,
  - lightweight region-marker map (no heavy GIS dependency),
  - filtered event side panel,
  - mobile-responsive layout.
- Added root navigation link to `/apps/spread-explorer/`.
- Added canonical region metadata file `data/regions.json`.
- Added `region_ids` to geo-tagged events in `data/events.json` (supports multi-region arrays).
- Added validation for `region_ids` in `scripts/validate-data.mjs` using `data/regions.json` as source-of-truth.
- Added derived region index output in `scripts/derive.mjs`:
  - `derived/index.events_by_region.json`
  - `data/derived/index.events_by_region.json`

## Validation status (this session)

- `node scripts/validate-data.mjs` ✅ pass.
- `node scripts/derive.mjs` ✅ pass.

## Suggested next session priorities

1. Expand `region_ids` coverage from geo-tagged subset to all high-value global events.
2. Add optional region-legend toggles and richer overlay semantics (density/paths) to spread explorer.
3. Integrate spread-explorer with shared app shell caching if offline use is required.
