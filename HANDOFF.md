# Handoff Notes (Next Session)

## Session context
- This pass focused on **documentation + structure cleanup** for the overview/survey scaffold.
- Goal: make the scaffold visible in repo docs and safer for future incremental implementation.

## Changes made
1. **README roadmap alignment**
   - Added a short roadmap note that the overview/survey layer exists, is scaffold-stage, and complements (does not replace) event/timeline learning.

2. **Overview design note cleanup**
   - Reformatted `docs/overview-layer.md` into concise, readable sections for purpose, scope boundaries, and future integration path.

3. **Overview seed data readability pass**
   - Pretty-printed `data/overview/eras.json`, `data/overview/regions.json`, and `data/overview/survey-grid.json` with stable formatting.
   - No schema changes and no content expansion.

## What is not built yet
- No overview viewer route/app yet.
- No recall/scoring/progression engine.
- No comparison prompt flow.
- No causal-thread workflow.
- No migration of overview records into event-level datasets.

## Validation/checks performed
- `node scripts/validate-data.mjs`
- `node scripts/derive.mjs`

## Next steps (smallest logical order)
1. Add a **minimal read-only overview viewer** (era/region filter + card output).
2. Add a **lightweight hide/reveal recall mode** (summary/anchors/keywords only, no scoring).
3. Add **comparison prompts** after survey fluency is stable.
4. Add **causal-thread support** later as a follow-on layer.
