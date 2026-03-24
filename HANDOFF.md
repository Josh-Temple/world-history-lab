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
