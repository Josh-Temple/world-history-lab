# Handoff

## What changed
- Added a guided homepage learning path with explicit Step 1→4 sequencing, clearer “when to use this” explanations, and next-step hints across all app cards.
- Reworked Event Recognition into session-based practice with selectable session lengths, visible progress, completion feedback, retry support, and a direct next-step path into Causality Builder.
- Regenerated derived artifacts so the repository stays aligned with the current data pipeline output.

## Validation completed
- Ran `node scripts/derive.mjs` successfully.
- Ran a local static-server smoke test and confirmed the homepage and Event Recognition routes return HTTP 200.
- Performed a code-level review of the mobile layout adjustments for the homepage path cards and Event Recognition summary/actions layout.

## Suggested next steps
1. Consider adding per-session review of missed Event Recognition answers so learners can focus on weak spots before retrying.
2. Consider carrying session framing into Causality Builder so app-to-app progression feels even more consistent.
3. If you want stronger onboarding, consider adding a “recommended daily loop” block on the homepage that suggests time or question counts per step.
