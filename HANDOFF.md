# Handoff Notes (Next Session)

## Session context
- Applied the Task 1 data-pipeline hardening follow-up to make derive failures more explicit and enforce stricter `app_profiles` shape checks.
- Re-ran validation and derive generation successfully after the change.

## Changes made
1. Derive strictness improvements
   - `scripts/derive.mjs`
     - Unit reference validation now fails immediately with a precise per-reference error:
       - `Missing event reference: <unit_id> -> <event_id>`
     - `app_profiles` validation is now stricter:
       - remains required to be an object when present
       - each app profile value must be an object
       - each app profile must include `enabled` as a boolean

2. Documentation update
   - `README.md`
     - Updated derive validation documentation to include the new `app_profiles.<app>.enabled` boolean requirement.

## Validation performed
- `node scripts/validate.mjs`
- `node scripts/derive.mjs`

## Suggested next steps
1. Add a machine-readable schema file for unit manifests to align editor/tooling checks with derive-time validations.
2. Consider adding CI automation to run `node scripts/validate.mjs && node scripts/derive.mjs` on every PR.
3. If future apps are added, document app-profile conventions (required keys beyond `enabled`) in a dedicated schema section.
