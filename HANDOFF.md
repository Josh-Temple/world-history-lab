# Handoff Notes (Next Session)

## Session context
- This session added a **small, reversible scaffold** for a new overview/survey learning layer.
- Existing direction was preserved: Timeline Trainer, Event Recognition Trainer, and History Player planning remain unchanged.
- The overview layer is designed to complement event-level and timeline learning, not replace them.

## Changes made
1. Added overview design note
   - New file: `docs/overview-layer.md`
   - Clarifies purpose, progressive granularity intent (current scope: stages 1–4), in-scope/out-of-scope boundaries, and later connection to comparison/causality.

2. Added overview data scaffold
   - New folder: `data/overview/`
   - New files:
     - `data/overview/eras.json`
     - `data/overview/regions.json`
     - `data/overview/survey-grid.json`

3. Seeded tiny first slice (intentionally small)
   - Eras: `ancient`, `medieval`
   - Regions: `east_asia`, `europe`, `west_asia`
   - Survey cells: 6 records (2 eras × 3 regions)
   - Cell shape is lightweight and human-editable:
     - `era_id`
     - `region_id`
     - `summary` (one sentence)
     - `anchors` (2–3 items)
     - `keywords` (3 items)
     - `connections` (1 note)

4. Updated roadmap messaging
   - `README.md` now includes a brief roadmap-level mention of the overview layer as scaffold-stage and complementary to event/timeline learning.

## Intentionally not built yet
- No overview trainer UI
- No scoring/progression logic
- No compare mode
- No causality trainer logic for overview data
- No migration/refactor of existing event/person/unit systems
- No merge of overview records into `data/events.json`

## Next smallest logical step
1. Add a **minimal read-only overview viewer** (simple filter by era/region and card display of summary/anchors/keywords/connections).
2. Add a **lightweight hide/reveal recall mode** for summary/anchors/keywords only (no scoring).
3. Add comparison prompts later.
4. Add causal-thread prompts later.

## Validation performed
- `node scripts/validate-data.mjs`
- `node scripts/derive.mjs`

No existing app architecture changes were introduced in this session.
