# HANDOFF (2026-05-16)

## What was completed today

- Added `apps/historical-reasoning-lab/` with prompt generation, evidence selection interactions, stronger/weaker explanation guidance, counterfactual prompts, and local reflection persistence.
- Added directional metadata in `data/events.json` (`prerequisite_event_ids`, `consequence_event_ids`) and backfilled links from existing causal relationships.
- Extended `scripts/validate-data.mjs` with directional-link validation and reciprocal warning checks.
- Extended `scripts/derive.mjs` to keep directional links in normalized events and write `derived/causal-graph.json` + `data/derived/causal-graph.json`.
- Updated `index.html` navigation and `README.md` recent updates section.

## Validation status

- `node scripts/validate-data.mjs`
- `node scripts/derive.mjs`

## Suggested next session priorities

1. Add adaptive reasoning difficulty (event complexity tiers + evidence scaffolding fade).
2. Add historiography mode with alternative interpretations and source weighting prompts.
3. Add graph-explorer overlay toggle for prerequisite/consequence arrows from `derived/causal-graph.json`.
4. Evaluate reflection quality rubric and integrate optional mentor feedback prompts.
