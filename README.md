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
  - **Timeline Trainer** (MVP focus; before/after playable).
  - **Causality Builder** (planned for the next phase after timeline basics).

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

Next:

- [x] Start Timeline Trainer MVP implementation under `apps/`.
- [x] Add initial app scaffold and run instructions.
- [ ] Begin Causality Builder planning after timeline MVP baseline.

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

## How to run

This repository currently serves static files, so you can preview it locally with any static server.

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

Timeline Trainer MVP is available at `http://localhost:4173/apps/timeline-trainer/`.

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
- `/data/units/french-revolution-napoleon.json`: **single object** for the current unit.

Current app code assumes those top-level shapes (`Array`, `Array`, `Object`) and treats shape mismatches as load errors.

### Top page summary logic

`/index.html` fetches all three datasets in parallel with `Promise.allSettled` and updates:

- `#count-events` = `events.length`
- `#count-people` = `people.length`
- `#count-units` = `1` (for the single current unit JSON object)

If any request fails or a JSON shape is unexpected, the page shows `—` for that count and logs a clear console error.

### Safe data updates

When adding/editing data:

1. Keep top-level JSON shapes stable (`events`/`people` arrays, unit file object).
2. Add new events in `/data/events.json` and ensure IDs are unique.
3. Add new people in `/data/people.json` and keep references consistent.
4. Update unit files under `/data/units/` and ensure `event_ids` reference existing event IDs.
5. Re-open `/` and `/apps/timeline-trainer/` to verify counts and app loading.

(Recommended future enhancement: add `/data/units/index.json` for multi-unit counting.)

## License

TBD
