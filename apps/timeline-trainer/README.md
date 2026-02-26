# Timeline Trainer MVP

A minimal static timeline quiz that uses the shared seed dataset.

## What this MVP supports

- Loads `data/events.json` and `data/units/french-revolution-napoleon.json`.
- Resolves `unit.event_ids` to event records.
- Filters events to records that have:
  - `question_types` including `timeline_before_after`
  - numeric `time.year_start`
- Generates random "Which happened earlier?" questions with two events.
- Lets the user answer by clicking one of two buttons.
- Locks answer buttons after submission until the user taps "Next question".
- Shows explicit answer markers on buttons (selected/correct) using text labels, not color only.
- Avoids recently used pairs using an in-memory recent-history window.
- Supports next-question flow and in-memory session stats.
- Shows user-facing errors for invalid/missing data or when generation cannot find suitable pairs.

## How to run locally

From the repository root:

```bash
python3 -m http.server 4173
```

Open:

- Top page: `http://localhost:4173/`
- Timeline Trainer: `http://localhost:4173/apps/timeline-trainer/`

## Sprint 1 quality improvements

- Better answer feedback clarity (single Correct/Incorrect line + explicit explanation).
- Safer generation with bounded retries and retryable user-facing error state.
- Reduced immediate repeats by excluding recent event pairs (A|B treated same as B|A).

## Known limitations

- Only one question type is implemented: `timeline_before_after`.
- Unit selection is fixed to `french-revolution-napoleon`.
- Progress is in-memory only (resets on refresh).
- No schema validator integration yet.
