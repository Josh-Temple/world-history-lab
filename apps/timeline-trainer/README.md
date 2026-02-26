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

## Sprint 2 lightweight review improvements

- Wrongly answered timeline pairs are queued for in-session re-practice.
- Re-asks are delayed by a short gap (2-4 questions) and shown with a "Review" badge.
- Review frequency is modest (probabilistic ~30% when eligible questions exist).
- Review attempts are capped per pair and removed once corrected.
- Added in-session review stats: `review_answered` and `review_correct`.

## Sprint 3 timeline modes

- Added `timeline_earliest_of_3` and `timeline_latest_of_3` generators (3 distinct events, unique years, minimum span guard).
- Added a mode selector: `Before / After`, `Earliest of 3`, `Latest of 3`, and `Mixed`.
- Mixed mode safely skips unavailable or temporarily ungeneratable types.
- Added per-type in-session stats (`answered_by_type`, `correct_by_type`) in the stats panel.
- If a selected mode lacks eligible data, the app shows a friendly in-session message instead of crashing.

## Known limitations

- New 3-option modes require event records tagged with `timeline_earliest_of_3` / `timeline_latest_of_3`.
- Unit selection is fixed to `french-revolution-napoleon`.
- Progress is in-memory only (resets on refresh).
- No schema validator integration yet.
