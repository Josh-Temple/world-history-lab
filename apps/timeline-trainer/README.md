# Timeline Trainer MVP

A minimal static timeline quiz that uses the shared seed dataset.

## What this MVP supports

- Loads `data/events.json` and `data/units/french-revolution-napoleon.json`.
- Resolves `unit.event_ids` to event records.
- Filters events to records that have:
  - `question_types` including `timeline_before_after`
  - numeric `time.year_start`
- Generates one random "Which happened earlier?" question with two events.
- Lets the user answer by clicking one of two buttons.
- Shows correctness and a short explanation with years.
- Supports next-question flow and in-memory session stats.
- Shows user-facing errors for invalid/missing data or invalid question state.

## How to run locally

From the repository root:

```bash
python3 -m http.server 4173
```

Open:

- Top page: `http://localhost:4173/`
- Timeline Trainer: `http://localhost:4173/apps/timeline-trainer/`

## Known limitations

- Only one question type is implemented: `timeline_before_after`.
- Unit selection is fixed to `french-revolution-napoleon`.
- Progress is in-memory only (resets on refresh).
- No schema validator integration yet.

## Next planned features

- Ordering questions (`timeline_ordering`)
- Century questions (`timeline_century`)
- Local progress persistence (localStorage)
