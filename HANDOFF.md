# Handoff Notes (Next Session)

## Session context
- The user asked for a concrete forward plan after prior documentation-only updates.
- This session refined planning docs to focus on executable next sessions.

## Changes made
1. Updated README with a concrete 3-session execution plan
   - `README.md`
   - Added a new section: **History Player immediate execution plan (next 3 sessions)**.
   - Includes Session A (data freeze), Session B (player core), Session C (map + log integration), and first-release definition of done.

2. Updated handoff for implementation readiness
   - `HANDOFF.md`
   - Replaced the previous seed-only handoff with an action-oriented sequence and release gate checks.

## Validation performed
- `git diff -- README.md HANDOFF.md`

## Next steps (ordered)
1. Execute Session A data freeze on a limited approved event subset.
2. Run and fix all issues from:
   - `node scripts/validate.mjs`
   - `node scripts/derive.mjs`
3. Start Session B route/core implementation only after data scripts pass.
4. Keep `/player` MVP scope fixed (no causality lines, no animated borders) until first release criteria are met.

## UX content density guardrail (for next implementation)
- Reduce on-screen text as much as possible to lower cognitive load.
- Keep only high-frequency controls and one-line status text visible by default.
- Move secondary explanations, long labels, and edge-case guidance into collapsible sections (`<details>`/accordion).
- Move advanced controls to a dedicated "Details" / "Advanced" menu instead of the primary surface.
- Prefer concise labels and icon+tooltip patterns over persistent multi-line helper text.
- Apply this rule first on the top page and History Player controls before adding new UI copy.
