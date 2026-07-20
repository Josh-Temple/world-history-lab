import { filterEvents as filterSharedEvents } from "../../../shared/event-filters.js";

export const DIFFICULTY = {
  CORE: "core",
  STANDARD: "standard",
  FULL: "full",
};

export function filterByDifficulty(events, difficulty) {
  if (difficulty === DIFFICULTY.CORE) {
    return filterSharedEvents(events, {
      status: "reviewed",
      // Most legacy records predate the importance tier. Keep them playable at
      // the default difficulty rather than reducing otherwise healthy units to
      // fewer than the two events needed for a timeline question.
      predicate: (event) => !Number.isFinite(event?.importance) || event.importance <= 1,
    });
  }
  if (difficulty === DIFFICULTY.STANDARD) {
    return filterSharedEvents(events, {
      status: "reviewed",
      predicate: (event) => !Number.isFinite(event?.importance) || event.importance <= 2,
    });
  }
  return events;
}
