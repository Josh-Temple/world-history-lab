# HANDOFF (2026-08-17 · learning-page visual hierarchy)

## What changed and why

The shared Baukasten theme promoted every direct section, `.panel`, and `.card` to the same white, rounded, shadowed surface. That broad selector erased the quieter hierarchy already present in apps such as Timeline Trainer and made Session Runner stack five equally prominent containers around an already card-like iframe application.

Priority learning pages now opt into `body.learning-page`. The shared theme keeps its tokens, type, controls, and small three-color title accent, but flattens structural cards into divider-led sections. Setup and secondary statistics end with a thin rule; the actual session/question container remains the prominent white surface. This opt-in affects Timeline Trainer, Event Recognition, People Recognition, and Causality Drill, while Home and non-opted-in showcase pages retain the existing graphical treatment.

Session Runner received a purpose-built stylesheet and semantic structure. Its title is compact, progress and current-mode information are grouped into quiet ruled sections, mode switching is an unboxed label/description/chip row, and only the embedded activity receives a large surface. The iframe border is removed to avoid a competing outer/inner card edge. Confidence and navigation controls sit below a divider without a containing card, with two-column chips and touch-sized controls on mobile. No application logic, data, state, mastery, review, attempt ID, question generation, or boot-guard behavior changed.

## Validation and follow-up

- Run `npm run check` for syntax, route/runtime, Service Worker, learning-integrity, derive, and data validation coverage.
- Screenshot capture could not be completed in this container: no browser executable or browser automation package is installed, and the Playwright registry request was rejected with HTTP 403. Static structure, responsive CSS, clean app routes, and runtime startup contracts were verified instead; desktop and mobile visual review remains the first preview follow-up.
- The new Runner CSS is listed in the optional Service Worker shell. Future visual work should keep learning tools opted in deliberately rather than weakening the more expressive Home treatment globally.

Potential follow-ups: (1) evaluate whether secondary setup controls should collapse on small screens after observing real learners, (2) standardize inline styles that remain in older learning-app markup, and (3) add automated visual snapshots if a browser dependency becomes part of the repository toolchain.

---

# HANDOFF (2026-07-27 · cross-app startup and offline-cache recovery)

## Reproduction and confirmed causes

The clean-URL audit reproduced the URL-resolution defect structurally: at `/apps/session-runner` the former `./app.js` resolves to `/apps/app.js`, while the actual module is `/apps/session-runner/app.js`. The same unsafe external-entry form existed in 27 HTML files (24 module entries and three classic-script entries); History Player and Overview use inline modules. A production-like HTTP regression now proves all 29 learner app indexes resolve through `/apps/name`, `/apps/name/`, and `/apps/name/index.html`, and that representative JavaScript is served with JavaScript MIME rather than HTML. The complete inventory, root-link, iframe, loading, and failure-display status is in `docs/app-startup-audit.md`.

The prior Service Worker independently amplified failures: shell `addAll` was all-or-nothing; JSON was cached without status/MIME checks; all other assets used cache-first stale-while-revalidate and cached 404, redirected, or HTML fallback responses under JavaScript URLs. Thus every same-origin learner app could be affected after one bad response. The local production server deliberately does not HTML-fallback 404s; no legitimate JavaScript request returned HTML after this fix. External Vercel Preview was not available in this environment.

## Implementation

- Replaced 24 external module tags with absolute dynamic entries routed through the shared boot guard and changed three classic entries to absolute paths. The guard exposes common `loading`, `ready`, and `error` states, structured phase/app/entry diagnostics, visible Reload and Reset app cache controls, and never touches localStorage.
- Session Runner retains `sessionRunnerState`, mirrors it into `appState`, and now ships Restart and Complete Question disabled. Its existing initializer enables controls only at the appropriate phase and its iframe routes were already root absolute.
- Cache names are now `world-history-lab-shell-v6` and `world-history-lab-runtime-v2`. HTML/navigation, JS, and JSON use network-first with validated exact-cache fallback; other assets use validated stale-while-revalidate. Status, redirect, and resource-specific Content-Type checks reject HTML-as-JS/JSON. Activation deletes older `world-history-lab-*` caches.
- Install fetches four required shell resources serially and fails clearly if one is invalid; optional resources are isolated, logged, and cannot abort installation. Cache reset deletes only `world-history-lab-*` Cache Storage plus Service Worker registrations, preserving `whl_mastery_v1`, `whl_review_queue_v1`, `whl_review_store_v1`, `whl_concept_mastery_v1`, selected units, and all other learning localStorage.
- Static resilience now audits all 29 app indexes, rejects missing HTML/scripts/local static or dynamic imports and relative entry tags, requires boot-failure handling for placeholders, and checks Session controls. Service-worker policy tests cover bad status/MIME, valid JS/JSON, cache fallback/install policy, version migration, and storage preservation. The production-like runtime test covers all three URL forms and MIME/HTML confusion.

## Browser and remaining verification

A Chromium dependency could not be installed because the environment's npm registry policy returned HTTP 403, and no system Chromium was present. Therefore no genuine browser, Android viewport, Service Worker-controlled reload, screenshot, GitHub Actions result, or Vercel Preview result can honestly be reported from this session. The runtime test covered Session Runner, Timeline Trainer, Event/People Recognition, Causality Drill, Event/Comparison Trainers, Map Quiz, Dashboard, Overview, and all remaining app routes at the HTTP layer; browser execution remains the highest-priority preview verification. Next: (1) run the browser assertions and capture Session Runner on an environment with Chromium, (2) verify the reset flow in an installed Android PWA, and (3) inspect CI/Preview results. Historical data, learning metadata, answer protocol, attempt IDs, mastery/review semantics, new modes, backend, and broad UI/CSS were intentionally unchanged.

---
# HANDOFF (2026-07-26 · Meiji Restoration metadata audit)

## Scope and event-level concept decisions

Individually audited the ten baseline records in `unit_meiji_restoration`: Perry (1853), Kanagawa (1854), Boshin War (1868), Charter Oath (1868), abolition of han (1871), conscription (1873), Constitution (1889), Diet (1890), Korea annexation (1910), and Emperor Meiji's death (1912). Perry, Kanagawa, Boshin, Charter Oath, and the Constitution retain only `concept_legitimacy_crisis`, because each directly exposes, contests, declares, or codifies a basis for governing authority. Han abolition retains only `concept_bureaucratic_centralization`; conscription retains that concept plus `concept_military_reform`. Korea annexation retains only `concept_frontier_expansion`. The Diet and emperor's death retain no registry concept.

All ten lost `concept_imperial_overstretch`: coercive diplomacy, war, state building, and acquiring Korea do not establish expansion beyond sustainable capacity. Succession was not contested in any of these records, so all lost `concept_succession_crisis`. Centralization was removed except where nationwide administrative or military capacity is the event's substance (han abolition and conscription). Legitimacy was removed from administrative/military reforms, the Diet's institutional implementation, colonial annexation, and an orderly imperial succession because those events do not themselves represent a crisis over the right to rule.

## Themes, skills, people, and relationships

- Themes are event-specific: Perry, Kanagawa, han abolition, conscription, Constitution, and Diet use `state_power`; Boshin uses `revolution`, `war`, and `state_power`; Charter Oath uses `revolution` and `state_power`; annexation uses `imperialism` and `colonialism`; the emperor's death has no forced political theme.
- Unsupported geography was removed from all ten. Timeline remains on all. Causality remains primary for Perry, Kanagawa, Boshin, han abolition, conscription, Constitution, Diet, and annexation because each has structured cause/effect data plus `cause_and_effect` or `causality_chain`; Charter Oath and the emperor's death are timeline-only. No comparison, recognition, or people skill was added.
- The registry has no Perry, Emperor Meiji, Tokugawa Yoshinobu, or Itō Hirobumi record. Rather than expand scope by creating people, all ten use empty `people_ids`/`related_people`; the regression also rejects any stale one-way person link to these audited events. Registering those directly involved people remains optional future enrichment.
- Perry → Kanagawa remains the direct cause/effect and prerequisite/consequence pair. Boshin and Charter Oath remain related context, but their misleading direct event-causal edge was removed. Charter Oath ↔ han abolition is broad context. Han abolition → conscription is now the direct capacity-building pair. Constitution → Diet remains direct. Russo-Japanese settlement → Korea annexation is represented reciprocally as cause/effect and prerequisite/consequence, while the annexation-to-emperor-death chronological link was removed. No other event metadata was retagged; only the Russo-Japanese settlement's inverse annexation links changed for consistency.

## Regression and derived output

`scripts/test-learning-integrity.mjs` now freezes exact concepts, themes, skills, primary skill, people, related events, prerequisites, consequences, and event IDs embedded in causes/effects for each of the ten records. It checks all ten exist, scoped arrays are duplicate-free, primary skill membership, causal eligibility, person existence/reciprocity, and more than one concept set. The repository-wide relationship existence/duplicate/self-reference checks from PR #143, Congress protections, five French expectations, and eleven Industrial Revolution expectations remain intact. Derivation regenerated normalized events, concept indexes, causal graph/chains/pairs, process chains, unit event pools, and people/event projections in both derived locations.

## Baseline recount and next work

The baseline remains the **42 events carrying all four suspect concepts immediately after commit `7a3ffa1`'s initial five-event Industrial Revolution correction**. Before this pass, six baseline Industrial Revolution records and five French records had been audited, leaving 31. This pass audited the remaining ten Meiji baseline records. A fresh query of canonical `data/events.json` now finds **21** records still carrying all four concepts: **9** in `unit_age_of_imperialism` and **12** in `unit_silk_road_exchange`; no scoped Meiji record remains. Audit the nine Age of Imperialism records next, then the twelve Silk Road Exchange records.

Intentionally unchanged: the other two Meiji events' concepts/skills, Age of Imperialism and Silk Road metadata, global schemas/taxonomies, Timeline Trainer, Session Runner, attempt IDs, localStorage, UI, backend, workflow, and unrelated relationships. Browser automation is not configured, so Concept Explorer, Historical Patterns, Causality Drill, People Recognition, Timeline Trainer, and Industrialization Pathways Comparison were not runtime-tested in a browser.

---

# HANDOFF (2026-07-26 · French Revolution/Napoleon relation follow-up)

## Completed relation cleanup

`ev_congress_of_vienna_1814_1815` and `ev_congress_vienna_1815` described the same diplomatic settlement rather than two instructionally distinct events. The fuller 1814–1815 record is canonical, and the duplicate 1815 record was deleted. Its memberships in Foundations, Industrial Revolution, and French Revolution/Napoleon units were redirected to the canonical ID and deduplicated. The Napoleonic Wars and Concert of Europe causal references were also redirected. The spurious Congress → railway-boom link was removed rather than carried onto the canonical record.

The Congress now uses `ev_napoleonic_wars_1803_1815` as its direct causal-event and prerequisite link and `ev_concert_of_europe_1815_1848` as its direct effect and consequence. Its structured cause explicitly describes the allied victory and collapse of Napoleonic dominance. `ev_napoleon_emperor_1804` remains only in Congress `related_events` as broad context; the coronation's direct `effects` and `consequence_event_ids` links to Congress were removed. No Congress themes, concepts, skills, primary skill, or people links changed.

The September Massacres show revolutionary radicalization but do not directly explain the decision reached through Louis XVI's later trial. Because the dataset has no sufficiently direct trial, abolition, or republic event for this purpose, `ev_execution_louis_xvi_1793.prerequisite_event_ids` is now empty. The September Massacres' matching effect/consequence links to the execution were removed. The execution's structured prose causes remain intact, and its effect/consequence link to the Reign of Terror remains directionally consistent.

Regression coverage now extracts event IDs from strings and `{ event_id }` objects in `related_events`, prerequisites, consequences, causes, and effects. It checks existence, uniqueness, and self-reference for every record, freezes exact relationships for the five audited French Revolution/Napoleon events, prevents restoration of the duplicate Congress or the two rejected direct links, and retains the eleven-event Industrial Revolution and audited concept/theme/skill/person assertions. Derivation continues to build process chains from `prerequisite_event_ids`; regenerated process-chain outputs contain only the canonical Congress ID, retain stage order, and preserve the Estates-General chain's `concept_legitimacy_crisis` anchor.

## Recalculated audit inventory

The baseline is the **42 events carrying all four suspect concepts immediately after commit `7a3ffa1`'s initial five-event Industrial Revolution correction**. Six of the later eleven-event Industrial Revolution audit were members of that 42-record baseline; the other five were found through the broader technology follow-up and therefore cannot be subtracted from 42. All five events in the focused French Revolution/Napoleon audit were baseline members. Thus **42 - 6 - 5 = 31** baseline records remain. The Meiji Restoration unit contains 12 events total; **10** are in the remaining baseline inventory and should be the next concept-metadata audit batch. This session did not perform that audit.

No UI, learning-record logic, Timeline Trainer, Session Runner, localStorage, schema, concepts, themes, people metadata, GitHub Actions workflow, or unrelated bulk event metadata was changed. Browser automation is not configured, so the learner-facing Causality Drill, Timeline Trainer, Historical Patterns, and concept displays were not runtime-tested in a browser.

---

# HANDOFF (2026-07-25 · French Revolution/Napoleon metadata audit)

## Completed scope and decisions

Audited only `ev_estates_general_1789`, `ev_tennis_court_oath_1789`, `ev_execution_louis_xvi_1793`, `ev_napoleon_coup_18_brumaire_1799`, and `ev_congress_of_vienna_1814_1815`. The Estates-General, Tennis Court Oath, execution, and coup retain only `concept_legitimacy_crisis`: each directly contests the source or holder of governing authority. Congress of Vienna retains no current concept because postwar restoration and balance-of-power diplomacy do not, by themselves, make the meeting a representative example of the registry's crisis concept. All five lost `concept_imperial_overstretch`, `concept_bureaucratic_centralization`, and `concept_succession_crisis`; the events are not directly about capacity-exceeding expansion, administrative consolidation, or contested succession. Congress also lost `concept_legitimacy_crisis` for the distinction above.

- Themes remain event-specific within the allowed vocabulary: the four revolutionary transitions use `revolution` and `state_power`; Congress uses `war` and `state_power` as a post-Napoleonic settlement.
- All five retain timeline and causality skills with causality primary because each has structured causes/effects and causal question types that the current drill/derived indexes can use. People remains only for the Estates-General/Louis XVI, the execution/Louis XVI, and the coup/Napoleon. Unsupported geography, comparison, and recognition skills were removed.
- Tennis Court Oath's unsupported Louis XVI event-side people link was removed. Congress's Napoleon link was removed on both the event and person records because Napoleon did not participate in the congress. Marie Antoinette's stale person-side link to Louis XVI's execution was also removed.
- The coup's broad Thermidor relationship was replaced with the Directory, preserving the directly explainable Directory → coup → Consulate/Empire sequence. Existing structured directional links were otherwise retained: Estates-General → Tennis Court Oath → Bastille, September Massacres → execution → Reign of Terror, Directory → coup → empire/wars, and imperial rule → Congress → settlement.
- Canonical derive output was regenerated. The explicit regression fixture now freezes concepts, themes, skills, primary skill, people links, causal eligibility, and reciprocal person links for all five while preserving the eleven-event Industrial Revolution fixture.

## Remaining audit inventory

The original four-concept query now returns **31 unaudited events**. As clarified in the 2026-07-26 update above, this is 42 minus six Industrial Revolution baseline members and five French Revolution/Napoleon records—not minus all eleven records in the broader Industrial Revolution audit. Next audit the ten Meiji Restoration events in that baseline, followed by Age of Imperialism and then Silk Road exchange. No UI, learning record, Session Runner, localStorage, schema, non-target event metadata, or GitHub Actions workflow was changed. Browser automation remains unavailable, so browser runtime checks were not performed.

---

# HANDOFF (2026-07-25 · attempt integrity and Industrial Revolution follow-up)

## Current state

- PR #140 already corrected Timeline Trainer's selected-mistake targeting, removed unsupported causal skills from nine audited Industrial Revolution records, removed Session Runner's unused concept-mastery code, and added the `npm run check` GitHub Actions workflow.
- This follow-up gives every generated Timeline Trainer question one `timeline-${crypto.randomUUID()}` attempt ID. Rich review records store it as `last_attempt_id` and in `mistake_history`; a repeat of an ID already present anywhere in `whl_review_store_v1` returns that store unchanged. This answer-wide policy prevents one answer from creating multiple independent event mistakes. Legacy history entries without attempt IDs remain readable and can receive new attempts.
- Store roles remain separate: `whl_mastery_v1` is the event-attempt ledger, `whl_review_queue_v1` is the lightweight queue written by mastery results, `whl_review_store_v1` schedules rich mistake metadata, and `whl_concept_mastery_v1` is concept-granular. No key or migration was added.

## Audited Industrial Revolution records

Eleven records are now scoped to supported event metadata: `ev_flying_shuttle_patent_1733`, `ev_bridgewater_canal_opens_1761`, `ev_spinning_jenny_invented_1764`, `ev_water_frame_patent_1769`, `ev_watt_condenser_patent_1769`, `ev_spinning_jenny_patented_1770`, `ev_spinning_mule_invented_1779`, `ev_power_loom_patented_1785`, `ev_cotton_gin_invented_1793`, `ev_rainhill_trials_rocket_1829`, and `ev_bessemer_process_patent_1856`.

- Power loom and Rainhill Trials now advertise only timeline practice, use industrialization/technology/economic-change themes, and carry no unsupported political or technological-diffusion concepts. Rainhill directly links George Stephenson; Edmund Cartwright has no person record, so Power loom has no person link.
- Henry Bessemer already exists. The patent event now links him instead of Andrew Carnegie and J. P. Morgan. Their reciprocal links were also removed because People Recognition derives event/person questions from `event.people_ids`; associating them with the 1856 patent would imply direct participation. Henry Bessemer's stale related-event ID was corrected.
- The original 42-record suspect inventory therefore has 36 unaudited records remaining. Next audit French Revolution/Napoleon, then Meiji Restoration, then Age of Imperialism; do not bulk-edit the remainder.

## Deferred work and boundaries

1. Audit the remaining suspect records in coherent unit batches, beginning with French Revolution/Napoleon.
2. Implement the validated answer-result `postMessage` protocol before Session Runner writes embedded-mode mastery. Session Runner communication remains unimplemented.
3. Inventory all review-store readers/writers before any consolidation of `whl_review_queue_v1` and `whl_review_store_v1`.

Browser automation is not configured in this repository, so no browser runtime check was performed in this follow-up. No new mode, UI, backend, storage key/migration, Session Runner communication, or metadata changes outside the two requested events and Bessemer/person-link corrections were made.

---

# Superseded history (2026-07-24 · state before PR #140)

## Root causes and completed work

- The early Industrial Revolution bundle had evidently received a mechanical metadata backfill: the same four state-crisis concepts, `state_power`, and geography-primary skill appeared on inventions whose labels and summaries describe textile or steam technology. Five high-confidence records were corrected; no broad rewrite of all 342 events was attempted.
- Timeline Trainer passed one question-level boolean to `recordResult()` for every option. Answer recording is now isolated in `logic/answer-recording.js`: a correct answer updates only the correct event; an incorrect answer updates only the selected event. The persisted `last_answer` distinguishes all item IDs, correct/selected IDs, correctness, question type, and confidence. A missed selected event still enters the existing review queue.
- Timeline mastery persistence is deferred until the confidence selection so the same structured record contains the real confidence value.
- Session Runner had no child-answer channel and treated `easy`/`unsure` confidence as correctness. It now keeps confidence only in its in-memory session summary and makes no mastery or review-store write. This is the conservative option B; implementing a trustworthy cross-frame protocol across seven child apps is intentionally deferred.

## Historical data audit

Corrected `ev_flying_shuttle_patent_1733`, `ev_bridgewater_canal_opens_1761`, `ev_spinning_jenny_invented_1764`, `ev_water_frame_patent_1769`, and `ev_watt_condenser_patent_1769`:

- All five now use `industrialization`, `technology`, and `economic_change`, and use timeline as the primary skill with causality as a secondary skill. Patents/inventions no longer default to geography.
- The four unrelated state-crisis concepts were removed. The canal retains only `concept_trade_network_expansion`, because lower transport costs and the coal connection directly exemplify network expansion. The inventions have no concept IDs: the current registry's `technological_diffusion` concept is not automatically established merely by an invention/patent occurring.
- Audit search after correction found the suspect concepts still widespread: imperial overstretch 83 events, bureaucratic centralization 87, succession crisis 67, legitimacy crisis 96, and 42 events containing all four. This strongly suggests a larger generated backfill, but contextual review is required before editing them. The focused search found four additional `state_power` records tagged as an invention/patent/technology (`ev_spinning_jenny_patented_1770`, `ev_spinning_mule_invented_1779`, `ev_cotton_gin_invented_1793`, and `ev_bessemer_process_patent_1856`). They remain an explicit follow-up set because this change avoids expanding five audited records into an unsupported bulk rewrite.

## Store ownership and duplication

- `whl_mastery_v1` (shared mastery store): per-event attempts/correct/incorrect; updated by modes calling `recordResult`. It now also retains the most recent structured answer context.
- `whl_review_queue_v1` (same module): lightweight mistake pressure/count queue, automatically updated by `recordResult`.
- `whl_review_store_v1` (shared review store): scheduling/mastery plus rich mistake metadata. Timeline mistakes are written here separately, so missed-event identity is duplicated with the lightweight queue.
- `whl_concept_mastery_v1` (shared mastery store): concept-level score, separate in granularity but Session Runner contains a concept-update helper, but no current call site was found; any future caller must use actual result data rather than confidence inference.

Recommended migration: make `whl_mastery_v1` the canonical event attempt ledger and `whl_review_store_v1` the canonical scheduling/metadata projection. Stop direct writers to `whl_review_queue_v1`, derive queue pressure from review-store records, then migrate old queue counts once with an idempotent schema-version marker. Keep concept mastery separate, but update it only from actual answer-result concept IDs. Do not migrate until call sites and old-data conflict rules are inventoried.

## Deferred answer-result protocol

Implement a shared validator for `{ type: "whl-answer-result", mode, itemIds, correctItemId, selectedItemId, correct, questionType, confidence }`. Child frames should emit once per answer with an `attemptId`; Runner must accept only messages where `event.source === iframe.contentWindow`, validate the expected mode and known item IDs, and deduplicate attempt IDs. `postMessage` is not an authentication boundary: same-origin scripts/local modification remain possible, so treat records as learner-local telemetry, not trusted assessment. Confidence should be a later message keyed to the same attempt or included after confidence selection. Only validated actual results may update event/review/concept stores.

## Tests and remaining priorities

`npm run check` now includes `scripts/test-learning-integrity.mjs`, covering two- and three-option correct/wrong update isolation, correct/selected IDs, question type/confidence, existing review-queue behavior, structural uniqueness, primary-skill membership, and the five semantic regressions. Data validation now treats primary skill outside skills as an error rather than a warning.

Priorities:
1. Contextually audit the 42 events carrying all four suspect political concepts, in coherent unit-sized batches with reviewed evidence and explicit regression fixtures.
2. Implement and test the shared answer-result protocol in one child mode and Session Runner before rolling it across remaining modes.
3. Inventory every writer/reader of the two review stores and implement the staged canonical-store migration above.

Intentionally unchanged: no new mode/UI, no backend, no wholesale event retagging, no store migration, and no attempt to infer semantic validity universally. Browser automation is not currently configured; perform manual local HTTP verification of Timeline, Session Runner, and Historical Patterns Explorer when browser tooling is available.

---

## Handoff update (2026-06-03 · Wednesday feature mode)

### Repository access and health

- Local repository inspection succeeded despite the prior failed-retrieval note. Required paths were available for review, including `README.md`, `HANDOFF.md`, `package.json`, `index.html`, `data/events.json`, `data/people.json`, `data/units/index.json`, `data/metadata.json`, `derived/*`, `scripts/derive.mjs`, validation/smoke scripts, and `apps/*`.
- Current inspected footprint: 342 events, 142 people, 13 registered units, 17 root derived JSON artifacts, 10 mirrored `data/derived` JSON artifacts, 10 event theme tags, and 29 learner-facing app directories plus `apps/shared`.

### Completed this session

- Added `apps/theme-lens/` as the Wednesday new learning mode. It loads `data/events.json` and `data/regions.json` through the shared timeout-aware fetch helper, builds theme and region filters from actual data, and renders a theme overview, timeline arc, and reasoning prompts.
- Added a root `index.html` Practice link for Theme Lens so the new mode is discoverable from the main app shell.
- Updated `README.md` and this handoff with the actual repository inspection result, the new feature summary, and next-session context.

### Suggested next session priorities

1. Run a browser-level smoke check for Theme Lens to verify the generated controls and prompt cards render correctly in the deployed/static hosting environment.
2. Consider replacing the local `FALLBACK_THEME_LABELS` map in `apps/theme-lens/main.js` with a shared controlled-theme metadata file if more theme-facing apps need consistent labels/descriptions.
3. Add optional concept filters or learner-state recommendations so Theme Lens can route weak concepts from dashboard/session history into a specific thematic lens.

# HANDOFF (2026-06-01 · Monday strategy + first push)

## Section 1 — prerequisite repository check

- Today's weekday emphasis is Monday strategy plus first push: make a concise evidence-based repo check first, then choose only work that advances the strongest strategic learning loop.
- Repository inspection is now available in the local working tree. The previously reported retrieval failure is not applicable to this session.
- Required paths were verified as present: `README.md`, `HANDOFF.md`, `package.json`, `index.html`, `data/events.json`, `data/people.json`, `data/units/index.json`, `data/units/*`, `data/metadata.json`, `derived/*`, `scripts/derive.mjs`, validation/test scripts, and `apps/*`.
- Current file-backed footprint: 342 events, 142 people, 13 registered units, 17 root derived JSON artifacts, 10 mirrored `data/derived` JSON artifacts, and 28 learner-facing app directories plus `apps/shared`.

## Concise repo health summary

- Actual repository state is inspectable and substantially implemented: source data, unit metadata, derived artifacts, validation scripts, and a broad mini-app portfolio are present.
- The full aggregate check passed in this session via `npm run check`, covering app syntax, loading-resilience smoke checks, data smoke loading, sanity checks, derive generation, derived validation, data validation, and legacy validation.
- The active strategic risk remains learner-flow integration rather than basic repository availability: keep pushing the mistake/review/recommendation loop across modes before starting unrelated apps.

## Implemented vs missing summary

- Implemented: core data files, unit registry and unit files, derived data outputs, derive and validation scripts, root launcher, dashboard/session/review infrastructure, and multiple practice apps for chronology, causality, comparison, evidence, maps, systems, patterns, people, and source work.
- Missing or still incomplete: browser-level loading regression coverage, broader mistake-to-review integration outside Timeline Trainer, richer Session Runner display of review metadata, and continued intentional refinement of default `question_types` where content supports specialized practice.

## Neglect warning for today's priorities

- Do not spend Monday's first push on cosmetic-only polish or a new standalone app unless it directly feeds the cross-mode learner state.
- Favor a small integration improvement that connects existing modes, review metadata, recommendations, or validation around the learner loop.

# HANDOFF (2026-05-31 · cross-mode reinforcement loop)

## Recent updates

- Implemented the first visible mistake-to-review routing slice for the weekly strategic priority: missed Timeline Trainer answers now write event-level mistake records into `whl_review_store_v1` via shared review-store helpers.
- Added a lightweight Timeline Trainer completion recommendations panel that suggests either mistake review, adaptive recognition, and causality practice after errors, or alternate retrieval practice after a clean session.
- Updated the shared review store to preserve learner-facing mistake metadata (`source`, `reason`, `label`, `related_event_ids`, `mistake_count`, and immediate `due_at`) so later modes can route their own errors without bespoke storage.

## Validation notes

- Ran `npm run smoke-app-syntax` successfully after the app changes.
- Run the full `npm run check` before or during the next broader integration pass if more data or derived-output changes are added.

## Next-session follow-up

1. Extend the same `recordReviewMistake` pattern to Event Recognition and Causality Drill so more modes feed the shared review queue.
2. Let Session Runner's review UI display `reason` and `related_event_ids` from the review store so remediation explains adjacent knowledge, not only the missed event.
3. Consider adding a small automated storage-unit test for review-store mistake metadata once the project has a test harness beyond smoke scripts.

# HANDOFF (2026-05-31 · Sunday review / cleanup / next-week preparation)

## Recent updates

- Re-inspected the actual working tree and verified that the required repository paths are present: `README.md`, `package.json`, `index.html`, `data/events.json`, `data/people.json`, `data/units/index.json`, `data/units/*`, `data/metadata.json`, `derived/*`, validation scripts, `scripts/derive.mjs`, and `apps/*`.
- Ran `npm run check` successfully on Sunday review cadence. The suite covered app JavaScript syntax, static loading resilience, smoke loading, sanity checks, derive generation, derived validation, data validation, and legacy validation.
- Cleaned up the known generated-output churn issue by replacing wall-clock `generated_at` values in derive summary artifacts with a deterministic timestamp. This keeps validation-only derive runs from producing timestamp-only diffs.

## Repository health summary

- Health is currently good based on the aggregate check: 342 events, 142 people, and 13 units validate and derive successfully.
- Loading resilience remains guarded by static smoke coverage, but true browser-level regression coverage is still missing.
- The prior failed-retrieval/unknown-repository assessment is not applicable to this local working tree.

## Next-session follow-up

1. Add browser-level coverage for linked apps when a browser runner is available, asserting each app exits initial loading text with content or an explicit error.
2. Continue refining Indian Ocean `question_types` beyond default fallback formats where specialized chronology, causality, or comparison practice is supported.
3. Keep source-data tags aligned with the broad derived taxonomy when new tag families are introduced.
4. Preserve deterministic generated artifacts unless a future data-versioning scheme provides a more meaningful stable build timestamp.

# HANDOFF (2026-07-21 · Guided Session startup recovery)

## Recent updates

- Investigated the reported Guided Session state where the unit stayed unset and the question frame remained blank.
- The runner previously left `#app` empty while it awaited data initialization and called `init()` without a rejection handler, so a slow request or any unexpected startup exception produced no actionable UI.
- Added an immediate startup status, a top-level initialization failure handler, and a retry path through **Restart Session**.
- Added Session Runner HTML, JavaScript, and its shared imports to the versioned PWA shell cache. Navigation fetches now have a timeout and prefer the requested cached page during fallback instead of always returning the root page.

## Validation notes

- Run `npm run check` after follow-up changes.
- Browser tooling is not installed in this environment, so the visual state was verified through the HTML/JavaScript startup contract and repository smoke checks rather than a captured local browser screenshot.

## Next-session follow-up

1. Add browser-level coverage that opens `/apps/session-runner/?guided=1` and asserts `data-session-runner-state` reaches `ready` or `error` within the request timeout.
2. Consider exposing which data resource failed in a collapsible diagnostics area while keeping the learner-facing error concise.

# HANDOFF (2026-05-30 · loading resilience audit)

## Recent updates

- Re-inspected the actual repository contents. The previously noted inability to inspect required files is no longer applicable in this working tree; `README.md`, `package.json`, `index.html`, `data/events.json`, `data/people.json`, `data/units/index.json`, unit files, `scripts/derive.mjs`, validation scripts, derived outputs, and `apps/*` are present.
- Added `scripts/smoke-loading-resilience.mjs`, a dependency-free static smoke audit for the active loading-resilience pillar. It discovers root-linked app pages, confirms their app entry files exist, verifies pages with loading placeholders have detectable failure/error states, and flags direct `fetch()` calls that lack timeout/AbortController context.
- Added `npm run smoke-loading-resilience` and wired it into `npm run check` immediately after JavaScript syntax checks.

## Validation notes

- Run `npm run check` after changes; it now includes `smoke-app-syntax`, `smoke-loading-resilience`, smoke, sanity, derive, derived validation, data validation, and legacy validation.
- This audit is not a substitute for true browser-level regression coverage. It is a fast guardrail until a headless-browser or hosted-browser check can assert that every app leaves initial loading text with content or visible errors.

## Next-session follow-up

1. Add real browser-level coverage when a browser runner is available, using the app list and expectations established by `scripts/smoke-loading-resilience.mjs`.
2. Keep the Saturday underdeveloped-pillar focus on loading-state reliability until every mode has runtime coverage, not just static detection.
3. If new apps are linked from `index.html`, ensure their loading placeholders have explicit failure states and that data requests use shared timeout-aware loaders or AbortController.

# HANDOFF (2026-05-29 · loading resilience follow-up)

## Recent updates

- Fixed `apps/timeline-trainer/src/logic/question-generator.js`, which had a malformed weighted-pick function and returned an undefined `picked` value for triplet questions. This could prevent Timeline Trainer from booting and leave users on loading text.
- Added timeout-aware `fetchJson` to `apps/shared/data-access.js` and moved high-traffic learning modes to it so JSON fetches fail fast with explicit UI messages instead of hanging indefinitely.
- Added timeout handling for inline Overview/History Player loaders and service-worker network-first JSON requests.
- Added `npm run smoke-app-syntax` to catch app JavaScript parse errors and wired it into `npm run check`.

## Important active issue: loading resilience

Most learning modes should now fail fast instead of staying on loading placeholders, but this remains an important priority until browser-level regression coverage exists for every mode. Next session should add a smoke/regression script that opens each linked mode and asserts that initial `Loading...` text is replaced by either playable content or a visible error message.

## Validation notes

- Run `npm run check` after this update.
- `npm run check` now includes the app JavaScript syntax pass because a Timeline Trainer parse error was one root cause of loading lockups.

# HANDOFF (2026-05-29)

## Recent updates (2026-05-29 · validation and data integrity hardening)

- Per Friday validation/integration priority, inspected the actual repository files instead of relying on the previous failed-retrieval summary. Core paths are present, including `README.md`, `package.json`, `index.html`, `data/events.json`, `data/people.json`, `data/units/index.json`, `data/units/*`, `scripts/derive.mjs`, validation scripts, and the `apps/*` mini-app directories.
- Fixed the legacy `scripts/validate.mjs` failure by adding default practice coverage (`timeline_before_after`, `what_happened`, `cause_and_effect`) to 48 Indian Ocean event records that were missing `question_types`.
- Removed the known `validate-data` warnings for Meiji causal links by remapping the non-canonical `international` category to the allowed `diplomatic` category.
- Added npm shortcuts for `validate-data` and `validate`, then regenerated derived outputs with `npm run derive`.
- Resolved the high-volume derive unknown-tag warnings by adding semantic aliases for broad taxonomy tags and a context-only allowlist for region/period/actor source tags.

## Validation notes

- Passing checks: `npm run smoke`, `npm run sanity`, `npm run derive`, `npm run validate-derived`, `npm run validate-data`, `npm run validate`, and the new aggregate `npm run check`.
- `npm run derive` now completes without unknown-tag fallback warnings; source-only region/period/actor tags are accepted without becoming derived tag clusters.
- Environment note: npm emits `Unknown env config "http-proxy"`; it does not block the scripts in this run.

## Current unresolved priorities

1. Continue expanding question-type metadata beyond the default fallback for the Indian Ocean events where a more specialized practice format would be useful.
2. Keep future source-data tags aligned with the broad derived taxonomy by extending semantic aliases or context-only tags as new tag families are introduced.
3. Consider making derived artifact timestamps deterministic if generated-output churn becomes distracting during validation-only runs.

## Next-session follow-up

1. Use `npm run check` for one-command Friday verification after any data or derivation changes.
2. Re-run `npm run derive` before committing content changes that affect `data/*` or derived outputs.
3. If new source tags appear, decide whether they should map to a broad cluster or remain source-only context before accepting them.

# HANDOFF (2026-05-28)

## Recent updates (2026-05-28 · adaptive next-session routing layer)

- Added `apps/shared/next-session-router.js` to aggregate learner-state signals (mastery gaps, recent-mode history, fatigue heuristic, continuity memory) and produce next-session recommendations.
- Updated dashboard UI to render a learner-centric **Recommended Next Session** card with why/explanation text, duration estimates, target skill, and alternate session options.
- Added continuity memory persistence (`whl_next_session_memory_v1`) to reduce interrupted-flow friction and maintain focus context between sessions.
- Extended derive output with `session-recommendations.json` in both `derived/` and `data/derived/` for recommendation-category and rotation summary diagnostics.

## Next-session follow-up

1. Wire misconception signals into next-session routing once cross-app misconception registry is landed.
2. Add lightweight click-through telemetry for recommendation acceptance and completion rates.
3. Tune fatigue heuristics with observed session duration distributions rather than static thresholds.

# HANDOFF (2026-05-27)

## Recent updates (2026-05-27 · systems simulator + migration pathways)

- Added new `apps/historical-systems-simulator/` mode with multi-turn constrained decision flows, structural pressure indicators, delayed consequence queues, and local replay persistence.
- Added shared `apps/shared/systems-simulation-engine.js` with scenario initialization, turn advancement, decision application, and structural pressure calculation helpers.
- Added `data/systems-scenarios.json` seed scenario for Late Roman frontier governance tradeoffs.
- Added `data/migration-diaspora-pathways.json` with migration-system records, diffusion dimensions, comparison links, and reasoning prompts.
- Extended validation (`scripts/validate-data.mjs`) to verify migration pathway dataset shape.
- Extended derive pipeline (`scripts/derive.mjs`) to output migration network summaries at `derived/migration-network-summary.json` and `data/derived/migration-network-summary.json`.

# HANDOFF (2026-05-26)

## Recent updates (2026-05-26 · Indian Ocean world-system expansion)

- Added new `data/units/indian-ocean-world-system.json` and registered it in `data/units/index.json` for a cross-regional Indian Ocean macro-history learning unit.
- Added new event bundle in `data/events.json` for Swahili trade growth, Chola maritime expansion, Malacca ascent, Islamic oceanic exchange networks, Zheng He voyages, and Portuguese intervention.
- Added linked people records in `data/people.json` for Zheng He, Ibn Battuta, Parameswara, and Rajendra Chola I focused on Indian Ocean system coverage.
- Extended `data/thematic-pathways.json` to connect the new unit/events into trade, diffusion, and imperial-expansion pathway flows.

## Recent updates (2026-05-26 · argument builder + thematic pathways)

- Added new `apps/historical-argument-builder/` mode with structured thesis/evidence/causal/counterargument/synthesis workflow, local draft persistence, revision timestamps, and lightweight rubric heuristics.
- Added shared rubric helpers in `apps/shared/argument-rubric-utils.js` for claim clarity, evidence usage, and counterargument presence feedback.
- Added `data/thematic-pathways.json` with cross-era macro-history journeys and explanatory metadata (`why_it_matters`, transitions, recurring structures).
- Updated dashboard integration to surface featured thematic journeys with level and estimated length (`apps/dashboard/index.html`, `apps/dashboard/main.js`).
- Updated derive pipeline to emit `derived/thematic-pathways-summary.json` and linked root navigation entry for Historical Argument Builder.

# HANDOFF (2026-07-20)

## Incremental update (2026-07-20 · Timeline Trainer default-question recovery)

- Root cause: the default Core Essentials filter required a numeric `importance <= 1`; 19 of 20 events in Industrialization Pathways Comparison had no importance metadata, leaving only one candidate when Before / After needs at least two.
- Moved difficulty filtering into `apps/timeline-trainer/src/logic/difficulty-filter.js` and made missing importance values backward-compatible at Core and Standard difficulty, while retaining reviewed/approved quality filtering.
- Extended `scripts/smoke-timeline-trainer.mjs` with a data-backed regression that verifies the exact reported unit has at least two default eligible candidates, and wired the smoke test into `npm run check`.
- Follow-up: progressively backfill explicit `importance` values so legacy compatibility can eventually be narrowed without making units unplayable.

# Previous handoff (2026-05-17)

## Incremental update (2026-05-24 · thematic comparison reinforcement + onboarding cognition framing)

- Updated `apps/timeline-trainer/src/App.js` to surface concise post-answer comparison prompts when question options share one or more `themes` tags (for example: “how were they similar, and what changed?”).
- Updated `apps/concept-onboarding-map/index.html` with a beginner pathway framed by cognitive goals: chronology, comparison, causality, and review.
- Updated `apps/concept-onboarding-map/main.js` so each concept cluster includes an explicit “Thinking skill” line to make mode purpose visible to learners.
- Updated `README.md` with a matching release-note entry for this incremental slice.

### Next-session follow-up

1. Extend thematic comparison prompts to pull a third “related event” from the same theme and include cross-region preference.
2. Define/lock a learner-visible controlled theme vocabulary page and link it from onboarding.
3. Backfill or normalize missing `themes` tags for high-frequency timeline events to increase comparison prompt hit-rate.

## What was completed today

- Added adaptive sequencing metadata in `data/concepts.json` (`difficulty`, `prerequisite_concept_ids`) and introduced `concept_state_formation` as a foundational prerequisite anchor.
- Added `data/learning-paths.json` with three initial progression paths and level recommendations (`beginner`, `intermediate`, `advanced`).
- Updated `apps/dashboard/index.html` + `apps/dashboard/main.js` to show progression summary and concept-gated recommended learning paths.
- Extended `scripts/validate-data.mjs` with: concept difficulty validation, prerequisite existence checks, concept dependency cycle detection, and learning-path requirement validation.
- Extended `scripts/derive.mjs` to emit progression dependency map outputs: `derived/progression-map.json` and `data/derived/progression-map.json`.
- Added new learner-facing app `apps/big-picture-history/` with thematic macro-history timeline sections, turning-point highlights, and cross-unit narrative links.
- Updated `index.html` to include discoverability links for Big Picture History.
- Updated `README.md` with a new 2026-05-17 update section summarizing sequencing and synthesis improvements.

## Validation status

- `node scripts/validate-data.mjs`
- `node scripts/derive.mjs`

## Suggested next session priorities

1. Replace dashboard placeholder mastery-to-concept mapping with event-to-concept mastery aggregation from persisted review/mastery stores.
2. Add concept-level completion state (locked/in-progress/unlocked) and show per-path readiness percentages.
3. Expand Big Picture History with map overlays and narrative filters by region + era.
4. Add concise pedagogy guardrails for prerequisite breadth to avoid over-constraining valid alternative learning paths.

## Strategic direction update (for next session)

Use the weekly strategic assessment as an execution filter:

- Build toward **historical synthesis** (eras, transitions, divergence), not just discrete-event throughput.
- Treat these as forced priorities:
  - macro-history / era synthesis,
  - continuity/change learning,
  - broader regional coverage in canonical learning paths.
- Near-term deliverables to target:
  1. A curated `World History Overview` unit scaffold (start with a high-quality 15-event backbone, then expand toward 30–40).
  2. Era/transformation tags wired through derive output and visible in at least one app view.
  3. One concise continuity/change prompt in Timeline Trainer post-answer feedback.
- Deprioritize for now: styling-only polish, deep validation-only expansion, and unrelated standalone apps.


## Incremental update (2026-05-18 · learner-state + misconception challenge)

- Added concept-level mastery store helpers and weakest-concept inference in `apps/shared/mastery-store.js`.
- Added dashboard concept-mastery summary and adaptive weak-area callouts in `apps/dashboard/main.js`.
- Added session-runner concept mastery update hooks for confidence interactions in `apps/session-runner/app.js`.
- Added new `apps/misconception-challenge/` mode with confidence-based misconception judgment and explanatory feedback.
- Added `data/misconceptions.json` seed dataset and linked app from root navigation.


## Incremental update (2026-05-19 · Indian Ocean unit + process chains)

- Added a new Indian Ocean trade unit (`data/units/indian-ocean-trade.json`) and registered it in `data/units/index.json`.
- Added substantial Indian Ocean event coverage and directional prerequisite/consequence links in `data/events.json`.
- Added linked person records for major Indian Ocean actors in `data/people.json` and introduced `reg_indian_ocean` in `data/regions.json`.
- Updated trade-network learning-path sequencing in `data/learning-paths.json` to include the new unit.
- Added `scripts/derive-process-chains.mjs` and wired it into `scripts/derive.mjs` to emit `process-chains.json` into both derive output trees.

### Next-session checks

1. Review event factual phrasing for consistency with the project's evidence standards and add/normalize `source_refs` where needed.
2. Evaluate process-chain heuristics (especially branching simplification) and tune for interpretability in reasoning/synthesis apps.
3. Expand non-Western balancing further via Sub-Saharan inland networks, Southeast Asian inland-polity links, and pre-Columbian American macro-process chains.


## Incremental update (2026-05-21 · guided orchestration + onboarding map)

- Implemented guided session orchestration scaffolding via shared controller + handoff store and wired dashboard launch entry.
- Updated session-runner to consume guided plans (`?guided=1`) and provide compact concept-practice summary text on completion.
- Added a new beginner concept onboarding map app and linked it from root navigation for clearer first-step orientation.
- Ran validation + derive scripts after integration.


## Recent updates (2026-05-23 · historical source lab + evidence confidence layer)

- Added new app `apps/historical-source-lab/` with source-context panels, interpretation prompts, reliability discussion, and cross-source comparison workflow.
- Added `data/sources.json` seed primary-source fragment dataset and `data/perspectives.json` for perspective-level evidence metadata scaffolding.
- Added shared evidence helpers in `apps/shared/evidence-utils.js` (`getEvidenceBadge`, `getConfidenceLabel`).
- Added evidence/confidence indicators and weak-evidence diagnostic messaging in `apps/historical-reasoning-lab/main.js`.
- Extended `scripts/validate-data.mjs` to validate `evidence_strength` and `confidence_level` fields on events/sources/perspectives.
- Added root navigation link for **Historical Source Lab** in `index.html`.

## Incremental update (2026-05-23 · quiz generation health check)

- Ran end-to-end project checks to verify that question-serving prerequisites remain healthy:
  - `node scripts/smoke-test.mjs`
  - `node scripts/sanity-check.mjs`
  - `node scripts/derive.mjs`
  - `node scripts/validate-derived.mjs`
- Confirmed the dataset currently supports quiz generation flow with **336 events / 12 units** and derive output emitted without hard errors.
- Noted existing non-blocking warnings only:
  - `validate-data` warnings on `international` cause/effect category usage in several Meiji events.
  - `derive` unknown-tag fallback warnings for multiple events (category fallback succeeds).

### Next-session follow-up

1. Decide whether `international` should be added as a first-class allowed causal category or remapped to an existing taxonomy bucket.
2. Reduce derive unknown-tag warning volume by normalizing frequently recurring tags (e.g., region and period tags) into the canonical tag dictionary.
3. Add a lightweight automated "question generation snapshot" script that explicitly samples each question type per unit and validates candidate pool sizes.

## Incremental update (2026-05-23 · loading-stuck mitigation for question apps)

- Addressed a reported issue where apps could remain in "Loading..." and not surface questions when data fetch requests stalled.
- Updated shared fetch utility in `apps/shared/data-store.js` to apply a 10-second timeout using `AbortController`.
- Timeout errors now fail fast with explicit messages instead of hanging indefinitely, allowing each app's existing load-failure UI path to activate.

### Next-session follow-up

1. Add lightweight UI regression checks for at least Timeline Trainer and Map Quiz to assert loading states resolve to either question or explicit error.


## Incremental update (2026-05-24 · retention orchestration + pattern transfer mode)

- Added shared retention engine at `apps/shared/retention-engine.js` with forgetting-risk scoring, retention-queue building, interleaving, and reinforcement route recommendations.
- Updated guided-session orchestration to compute retention queues and expose reinforcement guidance in `apps/shared/guided-session-controller.js`.
- Updated dashboard to show concise highest-risk retention summary and reinforcement recommendation links.
- Extended derive output to emit `derived/retention-priority.json`.
- Added new learner mode `apps/historical-pattern-transfer/` and seed dataset `data/pattern-transfer.json`.
- Added root navigation link for **Historical Pattern Transfer** in `index.html`.

## Incremental update (2026-05-24 · timeline trainer loading-question troubleshooting note)

- Investigated a user report where Timeline Trainer can remain at "Loading question..." in several modes.
- Confirmed likely root causes from code path:
  - mode/scope/quality/difficulty filters yielding zero eligible events,
  - data fetch timeout or HTTP failure while loading seed data (including PWA/network edge cases).
- Follow-up fix now updates the question panel text explicitly on generation failure so users are not left at a stale "Loading question..." message.
