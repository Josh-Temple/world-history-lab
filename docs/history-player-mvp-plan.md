# History Player MVP Plan

## Objective

Add a **History Player** view inside `world-history-lab` (not a separate app) to help learners understand world history as a flow across time and space.

- Primary role: big-picture overview and narrative flow.
- Complementary role: Timeline Trainer remains focused on retention and drills.

## Scope decision

### In scope (MVP)
- New `/player` view in this repository.
- Reuse `data/events.json` as the single source of truth.
- Event-sequence playback (not year-by-year stepping).
- World map with current-event marker and recent faded markers.
- Timeline controls: previous / play-pause / next / speed / slider.
- Bottom event log (up to current point).
- Importance level filter (`importance <= selectedLevel`).

### Out of scope (MVP)
- Animated historical borders.
- Causality link lines.
- Advanced period-event visualization.
- Learning history sync/bookmarks.
- 3D globe.

## Data extension proposal

Extend event records with minimal additional fields:

- `importance` (`1..4`)
- `category` (`politics | war | religion | technology | economy | culture | exploration`)
- `summary_short` (one-sentence learning summary)
- `location`:
  - `label`
  - `lat`
  - `lng`
  - `precision` (`exact | city | region | country | approx`)

### Coordinate policy

Use representative points for learning clarity over geodetic precision.

- City event -> city representative point.
- Empire/dynasty change -> capital or primary city point.
- Broad phenomenon -> regional representative point.

## Implementation phases

### Phase 0: Lock MVP behavior (0.5-1 day)
- Freeze rules for playback unit, density, and filter behavior.
- Write acceptance checklist before coding.

### Phase 1: Build the first high-value dataset slice (1-2 days)
- Curate top 50 major events.
- Add `importance`, `category`, `summary_short`, `location`.
- Validate chronological ordering and required fields.

### Phase 2: Core player mechanics (2-3 days)
- Add player route/shell.
- Implement event normalization/filter/sort helpers.
- Add play/pause, step controls, speed, and slider by event index.

### Phase 3: Map + log integration (1-2 days)
- Render current marker strongly.
- Fade recent history markers (recommended: past 20 years).
- Add cumulative log; clicking a log item selects/focuses event.

### Phase 4: Polish and release gate (1 day)
- Tune speed presets and overlap behavior.
- Add empty-state messages for strict filters.
- Confirm first-time usability (quick comprehension target).

## Success criteria for MVP

- First-time users can understand controls quickly.
- Playback feels smooth and meaningful.
- Log + map together communicate historical flow.
- Users want to increase detail level after the first run.

## Suggested component split (implementation guidance)

- `PlayerPage`
- `FilterBar`
- `HistoryMap`
- `TimelineControls`
- `EventLog`
- `EventPopup`

## Notes for next execution session

1. Start with data quality and event selection before UI complexity.
2. Keep local state simple for MVP; avoid state-library overhead.
3. Prioritize readability and maintainability over feature breadth.
