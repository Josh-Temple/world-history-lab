# World History Lab

World History Lab is a personal learning project for studying world history with practice formats that go beyond standard flashcards. The goal is to build stronger understanding of chronology, causality, and historical connections by using structured data that can power multiple mini apps in one repository.

## Core idea / approach

- **One shared dataset, many mini apps**: this repository is intended to host multiple mini apps in the same repo, all using the same core data and schemas.
- **Local-first workflow**: data and app development are designed to work locally without requiring a hosted backend.
- **AI-assisted, human-reviewed process**: AI helps with scaffolding, normalization, and implementation speed, while factual and learning-quality decisions stay with the human author.
- **Single-repo by default**: splitting apps into separate repositories may be considered later only if scaling or maintenance needs require it.

## Current scope (MVP focus)

- **Initial history unit**: French Revolution to Napoleon.
- **First mini apps**:
  - **Timeline Trainer** (MVP playable: Before/After, Earliest of 3, Latest of 3, Mixed mode, plus Unit/All practice scope and quality filtering).
  - **Event Recognition Trainer** (unit-scoped, quality-aware multiple-choice recognition from event clues).
  - **People Recognition** (actor-to-event recall with unit-aware distractors and explanation feedback).
  - **History Player** (canonical player slice: sequence playback, speed control, slider navigation, cumulative event log, importance filtering, and canonical coordinates where available).
  - **Causality Builder** (first playable MVP with direct-effect and cause-category practice).
- **Overview** (first shipped read-only bridge page under `apps/overview/`, backed by `data/overview/`, for coarse era × region mental-map practice that complements event/timeline learning).

## Repository structure (high-level)

Current repository status includes seed data files under `data/`.

Planned high-level layout:

```text
world-history-lab/
├─ apps/        # mini apps (timeline, causality, etc.)
├─ data/        # shared history dataset
├─ schemas/     # shared data schemas
├─ tools/       # validation and content tooling
└─ docs/        # project documentation
```

## Data model overview

The shared dataset is structured so apps can generate practice dynamically instead of storing only fixed question text.

- **Events**: core historical events with dates, tags, and relationships.
- **People**: key actors linked to events.
- **Units**: study units/groupings (for example, French Revolution to Napoleon).
- **Links (later)**: explicit relationship records for richer graph-style practice.

This structure allows different mini apps to reuse the same data in different learning modes.


### Event field notes

`data/events.json` supports an optional `people_ids` field:

```json
{
  "id": "ev_napoleon_emperor_1804",
  "label": "Napoleon Crowned Emperor",
  "time": { "year_start": 1804 },
  "people_ids": ["pe_napoleon_bonaparte"]
}
```

`people_ids` should contain valid IDs from `data/people.json` and is intended for people-event association learning modes.

## Content and source policy

- Short summaries should be written in original wording, or generated with AI and then reviewed.
- Avoid copying long passages from source materials.
- Keep source references in data records for traceability.
- Use status tracking (for example `draft`, `reviewed`, `approved`) when present in the data model to separate work-in-progress from trusted content.

## AI usage policy (practical)

Good uses of AI in this project:

- Project/app scaffolding
- Validation and consistency scripts
- Data normalization support
- UI implementation assistance

Human responsibility remains final for:

- Factual accuracy
- Ambiguity resolution
- Causal interpretation quality
- Learning design decisions

## Current status checklist

Already done:

- [x] Repository initialized.
- [x] Root README exists and is maintained.
- [x] Seed data files added:
  - `data/metadata.json`
  - `data/events.json`
  - `data/people.json`
  - `data/units/french-revolution-napoleon.json`
  - `data/units/industrial-revolution.json`

Next:

- [x] Start Timeline Trainer MVP implementation under `apps/`.
- [x] Add initial app scaffold and run instructions.
- [x] Ship first playable Causality Builder route and link it from the homepage.


## Recent updates (2026-03-12)

- Timeline Trainer setup flow was refined to reduce cognitive load (clear setup grouping, dynamic mode helper text, eligibility hint, tighter result→next loop, and reduced stats prominence).
- Added a new draft unit: **Age of Imperialism (1870–1914)** with 15 timeline-practice events.
- Regenerated derived artifacts after dataset expansion.

## Recent updates (2026-03-15)

- Added a first playable **History Player** route at `apps/history-player/`.
- Reworked the top page into a clearer learning-mode chooser with explicit "start here" guidance.
- Replaced sparse dataset messaging with live status counters (events, people, units, approved/reviewed+ counts).
- Updated `data/metadata.json` scope/app entries to match the actual four-unit dataset and shipped app set.


## Recent updates (2026-03-17)

- Expanded `data/people.json` with 12 reviewed figures tied to Industrial Revolution and Age of Imperialism study coverage.
- Added 12 new imperialism-era events (1869-1910) with summaries and causal metadata in `data/events.json`.
- Linked selected events to people via `people_ids` and expanded unit `person_ids` in Industrial Revolution and Age of Imperialism units.
- Regenerated derived artifacts after validation and dataset expansion.

## Recent updates (2026-03-16)

- Added first playable **Causality Builder** route at `apps/causality-builder/`.
- Causality Builder now loads raw events + unit files, gates units by causality-ready density, and supports Reviewed+/Include drafts filtering.
- Added two causality quiz modes: **Direct effect** and **Cause category** (with graceful mode-disable messaging when category diversity is insufficient).
- Rebuilt **Event Recognition Trainer** to use unit-aware + quality-aware setup instead of whole-corpus normalized randomization.
- Event Recognition now limits eligibility to recognition-suitable records and reveals year/unit/explanation metadata after each answer.
- Updated the homepage start-here guidance and app cards to include the new Causality Builder progression step.

## Recent updates (2026-03-19)

- Added a guided four-step learning path to the homepage with explicit "start here", step-by-step sequencing, and next-step hints across app cards.
- Reworked Event Recognition into fixed-length sessions with progress tracking, end-of-session feedback, retry flow, and a clearer bridge into Causality Builder.
- Regenerated derived artifacts after the UX/session-flow update.

## Recent updates (2026-03-21)

- Restored the event editorial workflow to the three-stage `draft` → `reviewed` → `approved` model for new work.
- Marked all current records in `data/events.json` as **approved** because the existing event set is treated as ready for learner-facing use.
- Regenerated derived artifacts after the status refresh so app-facing normalized data stays in sync with the source dataset.

## Recent updates (2026-03-21 · People Recognition)

- Added a new **People Recognition** app at `apps/people-recognition/` for actor-to-event retrieval practice.
- Expanded homepage learning-path guidance so people-based recall sits alongside chronology, recognition, causality, and narrative review.
- Kept `people_ids`-based event links flowing through validation and derived data so the new mode can safely reuse the shared dataset.

## Recent updates (2026-03-21 · PWA)

- Added a web app manifest, installable app metadata, and reusable app icons for the static site.
- Registered a root-scoped service worker that precaches the app shell and uses runtime caching for JSON data requests.
- Wired every app entry page to the shared PWA assets so World History Lab can be installed and reopened offline with cached content.

## Recent updates (2026-03-22)

- Added a shared `apps/shared/event-filters.js` module so Event Recognition, Causality Builder, and Timeline Trainer can reuse the same status-aware and eligibility-aware event filtering rules.
- Introduced lightweight cross-app "Next step" guidance inside Timeline Trainer, Event Recognition, and Causality Builder to reinforce the intended practice loop: chronology → recognition → causality → narrative review.
- Kept derive output current after the filtering/UI refactor so shared data artifacts stay aligned with the learner-facing apps.

## Recent updates (2026-03-22 · Canonical slice + overview)

- Added a first canonical cross-era History Player slice with 15 ancient-to-early-modern events spanning West Asia, South Asia, East Asia, Europe, the steppe, and the Atlantic world.
- Upgraded `apps/history-player/` to filter on `importance`, require canonical player fields, and use canonical coordinates for map markers when available.
- Shipped a first read-only `apps/overview/` route backed by `data/overview/*` so learners can bridge from drill practice into coarse survey learning.

## Recent updates (2026-03-23)

- Added a shared `apps/shared/mastery-store.js` module that persists per-event `{ correct, incorrect, last_seen }` practice stats in `localStorage` with safe empty-state and parse-fallback handling.
- Integrated mastery recording into Event Recognition, Timeline Trainer, and Causality Builder so retrieval performance now persists across sessions instead of resetting on reload.
- Added an adaptive **Focus on weak areas** mode to Event Recognition that reuses mastery data to prioritize lower-accuracy events while still falling back safely when history is sparse.

## Recent updates (2026-03-24)

- Added a new reviewed unit file: `data/units/fr_french_revolution.json` with 14 French Revolution events (1789-1799) designed for timeline, recognition, causality, and people-linked practice.
- Expanded French Revolution event coverage in `data/events.json` with six new reviewed events (including the Women's March on Versailles, Flight to Varennes, and Directory establishment) and explicit causal `effects` links.
- Expanded people coverage in `data/people.json` with reviewed records for Marie Antoinette and Georges Danton, and promoted existing French Revolution core figures to `reviewed` status for consistent linkage quality.
- Registered the new unit in `data/units/index.json`, synchronized `data/metadata.json` scope coverage, and regenerated `/derived` artifacts.


## Recent updates (2026-03-24 · CI validation fix)

- Fixed question-type taxonomy drift in French Revolution records by replacing the non-enabled `event_recognition` type with the existing metadata-enabled `what_happened` type.
- Updated `data/units/fr_french_revolution.json` event-recognition app profile to use `what_happened`, keeping unit config aligned with `data/metadata.json` and CI validation rules.


## Recent updates (2026-03-25)

- Added a new **Year Estimation** app at `apps/year-estimation/` for fast absolute-time practice through numeric year guessing.
- Introduced graded temporal feedback bands (excellent/close/far) and error-aware mastery recording for year estimation attempts.
- Extended shared mastery stats in `apps/shared/mastery-store.js` with aggregate fields (`total_error`, `total_score`, `attempts`) while preserving compatibility with existing apps.
- Added a new homepage learning card linking directly to Year Estimation so learners can include temporal estimation in their repetition loop.

## Recent updates (2026-03-26)

- Redesigned the homepage into a guided entry layout with a single primary start action, skill-grouped mode cards, and a dynamic **Study by unit** section sourced from `data/units/index.json`.
- Added cross-app unit-context persistence using `localStorage` (`selected_unit`) so the learner's last-used unit now carries from the homepage and between trainers.
- Added unit-focus setup controls to **Causality Builder** and **Year Estimation**, including safe all-units fallback and empty-unit handling to avoid runtime dead ends.

## Recent updates (2026-03-27)

- Strengthened `scripts/derive.mjs` with strict cross-reference checks so derive now fails fast on:
  - `unit.event_ids` that point to missing events,
  - `event.effects` links that point to missing events,
  - `event.people_ids` that point to missing people.
- Kept derive output deterministic while adding clearer, actionable validation errors for broken references.
- Added runtime data-safety guards across learner apps (`timeline-trainer`, `event-recognition`, `people-recognition`, `causality-builder`, and `year-estimation`) so malformed/partial events are skipped instead of crashing sessions.
- Added explicit learner-facing fallback messaging when no valid events remain after runtime filtering.

## Recent updates (2026-03-28)

- Extended `scripts/derive.mjs` to generate multi-step causal paths (length 3-5) from `event.effects` and emit them as `derived/causality_chains.json`.
- Added a new learner-facing **Sequence Reconstruction** mode at `apps/sequence-reconstruction/` where shuffled causal chains can be reordered with drag-and-drop and checked against the expected sequence.
- Integrated Sequence Reconstruction into the homepage under the **Understanding** skill group.
- Added mastery recording for sequence attempts so chain events now contribute to persisted practice signals.

## Current challenges (today)

- **Keep CI green for data integrity**: PRs now run validation + derive checks, so changes must pass both scripts and keep `/derived` reproducible.
- **People links need continued expansion**: the new People Recognition mode is live, but more units and figures still need structured `people_ids` coverage for broader actor practice.
- **Keep learning-flow consistency across apps**: Timeline Trainer, Event Recognition, People Recognition, Overview, Causality Builder, and History Player should keep aligned setup language and progress expectations.
- **Finish shared filtering adoption across remaining apps**: People Recognition still has some app-local eligibility logic that could move onto the new shared filter layer next.
- **Mastery is now local-only**: progress tracking is live in the browser via `localStorage`, but there is still no cross-device sync or true spaced-repetition scheduler yet.

## Roadmap (short)

- **Phase 1: Timeline MVP**
  - Build first playable timeline trainer.
  - Connect it to the shared seed dataset.
  - Add basic local progress handling.

- **Phase 2: Causality MVP**
  - Build first causality practice prototype.
  - Reuse the same event/person/unit dataset.

- **Phase 3+: Data and expansion**
  - Improve validation tooling.
  - Add more units.
  - Add additional mini apps as needed.
  - Extend the shipped overview/survey layer from read-only survey guidance into richer bridge activities over time (not a replacement for core event data).



## History Player planning (new)

A practical MVP plan for adding a new in-repo `History Player` view is now documented here:

- `docs/history-player-mvp-plan.md`

Key decision: keep a **single shared data source** (`data/events.json`) and ship a focused MVP centered on event-sequence playback + map markers + event log + importance filtering.


Additional planning assets for future extension beyond the first shipped canonical slice:

- `docs/history-player-top50-candidate-seed.md` (first-pass major 50 event candidates with category, representative coordinates, and one-line summaries)
- `docs/history-player-event-extension-sample.json` (drop-in JSON examples for the proposed event schema extension fields)


## History Player immediate execution plan (next 3 sessions)

1. **Session A: Data freeze for first playable slice**
   - Finalize 50 events from `docs/history-player-top50-candidate-seed.md`.
   - Add `importance`, `category`, `summary_short`, and `location` for the approved subset in `data/events.json`.
   - Run `node scripts/validate-data.mjs` and `node scripts/derive.mjs`; treat failures as blockers before UI work.

2. **Session B: Player route + playback core**
   - Add `/player` page shell and local player state (`currentIndex`, `isPlaying`, `playbackSpeed`, filters).
   - Implement helper utilities: normalize, filter, chronological sort, visible-event derivation, log-event derivation.
   - Implement controls: previous / play-pause / next / speed / timeline slider (event-index based).

3. **Session C: Map + log MVP completion**
   - Add map marker rendering for current event plus faded recent events.
   - Add bottom event log with click-to-select behavior.
   - Ship first MVP pass behind `importance <= 1` default and then expand to level switching (1..4).

### Definition of done for first release

- `/player` is reachable and functional from first load. ✅
- Playback works in event-sequence mode (not year-by-year stepping).
- Importance filtering changes playable event set predictably.
- Validation + derivation scripts pass after data updates.

## Timeline Trainer modes: implemented vs planned

Implemented now in `main`:

- `timeline_before_after`
- `timeline_earliest_of_3`
- `timeline_latest_of_3`
- UI mode selector: Before / After, Earliest of 3, Latest of 3, Mixed

Planned (not yet implemented in the current Timeline Trainer UI):

- `timeline_ordering`
- `timeline_century`

The metadata file may list broader future question types for roadmap purposes, but the current shipped trainer only supports the modes above.

Timeline Trainer now supports scope controls:
- Practice **Unit** (single unit) or **All units** (unit-first sampling per question).
- Set minimum content quality (`Reviewed+` default, or `Include drafts`).
- Changing scope/settings resets in-memory session stats and review queues to avoid cross-scope contamination.

## UI design direction (current)

- **Top page and Timeline Trainer now share one visual language**: the root page reuses Timeline Trainer typography, palette, and spacing so navigation feels continuous.
- **Operational clarity remains primary**: the top page still prioritizes quick app entry and live dataset counts.
- **Timeline Trainer remains the main interactive surface** under `apps/timeline-trainer/`.

## CI data integrity checks

GitHub Actions now runs data integrity checks on pushes to `main` and on pull requests:

- `node scripts/validate-data.mjs`
- `node scripts/derive.mjs`
- `git diff --exit-code -- derived`
- `node scripts/smoke-timeline-trainer.mjs`

If derive output changes, regenerate locally and commit updated files under `derived/` before opening/refreshing a PR.

## How to run

This repository currently serves static files, so you can preview it locally with any static server.

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

Timeline Trainer MVP is available at `http://localhost:4173/apps/timeline-trainer/`.

PWA installability is available when the site is served over `http://localhost` during local development or over HTTPS in deployment.

## Deploy to Vercel

This repository is deployment-ready for Vercel as a static site.

1. Push this repository to GitHub.
2. In Vercel, click **Add New... → Project** and import the repository.
3. Keep Framework Preset as **Other** (or leave auto-detected static settings).
4. Build Command: **(empty)**
5. Output Directory: **(empty)**
6. Deploy.

After deployment, the root page (`/`) and JSON files under `/data` are served directly.

The `vercel.json` in this repo adds lightweight cache headers for `/data/*` responses.


## How it works (data + top page counts)

### Data files and JSON shapes

The app is static and reads JSON directly from `/data`:

- `/data/events.json`: **array** of event records.
- `/data/people.json`: **array** of people records.
- `/data/units/french-revolution-napoleon.json`: **single object** for one unit.
- `/data/units/industrial-revolution.json`: **single object** for one unit.

Current app code assumes those top-level shapes (`Array`, `Array`, `Object`) and treats shape mismatches as load errors.

### Top page summary logic

`/index.html` fetches `events.json`, `people.json`, and `units/index.json` in parallel and updates:

- `#count-events` = `events.length`
- `#count-people` = `people.length`
- `#count-units` = `units/index.json` entry count

The page also provides direct links to Timeline Trainer and raw dataset endpoints for quick sanity checks.

If any request fails or a JSON shape is unexpected, the page shows `—` for all counts and logs a clear console error.

### Safe data updates

When adding/editing data:

1. Keep top-level JSON shapes stable (`events`/`people` arrays, unit file object).
2. Add new events in `/data/events.json` and ensure IDs are unique.
3. Add new people in `/data/people.json` and keep references consistent.
4. Update unit files under `/data/units/` and ensure `event_ids` reference existing event IDs.
5. Re-open `/` and `/apps/timeline-trainer/` to verify counts and app loading.

`/data/units/index.json` is now used as the primary unit registry for both app loading and derivation.


## Unit schema expectations (validation-critical)

`node scripts/derive.mjs` now enforces strict unit metadata validation. Keep every unit file under `data/units/*.json` aligned with these rules:

- `regions`: required array of canonical region IDs using `reg_` prefix (for example `reg_france`, `reg_britain`, `reg_europe`, `reg_north_america`, `reg_japan`, `reg_east_asia`).
- `app_profiles`: required object keyed by app ID and must include `timeline-trainer`.
- Each `app_profiles.<appId>` entry must be an object that includes `enabled` as a boolean.
- `event_ids` must only contain valid existing event IDs and must not contain duplicates.
- `unit.id` values must be unique across all units in `data/units/index.json`.

Derive now fails fast (non-zero exit) on schema/reference violations so broken unit metadata cannot silently pass.

Derive now runs `scripts/validate-data.mjs` first, so duplicate IDs, missing unit event references, invalid status values, and required event fields are blocked before index generation.

## Derived artifacts (build-time)

Canonical data under `/data` remains human-authored and backward-compatible (`time.year_start` still works for MVP).
A lightweight Node script generates runtime-friendly numeric indexes under `/derived`.

Regenerate derived artifacts with:

```bash
node scripts/validate-data.mjs
node scripts/derive.mjs
```

Generated files:

- `derived/events.normalized.json`
- `derived/index.events_by_year.json`
- `derived/index.events_sorted.json`
- `derived/index.units.json`
- `derived/index.unit_event_pool.json`
- `derived/causality_chains.json`

Unit files are loaded from `data/units/index.json` (with fallback defaults inside the script).

Derive now validates unit manifests more strictly: missing `unit.event_ids` references fail the run, `regions` must use canonical `reg_*` identifiers, and `app_profiles` must be an object keyed by app id where each profile includes a boolean `enabled` field, and duplicate person IDs in `data/people.json` now fail derive-time validation.

## License

TBD



## Recent updates (2026-03-20)

- Strengthened `scripts/validate-data.mjs` with cross-reference checks for causal links, duplicate ID detection across entity types, unit-event integrity enforcement, and warnings for incomplete event summaries.
- Extended the derive pipeline so `derived/events.normalized.json` carries status, question types, causal links, and unit membership for downstream apps.
- Standardized Event Recognition and Causality Builder to read from the derived dataset through a shared app-side data access helper, reducing raw-vs-derived drift across learning modes.
