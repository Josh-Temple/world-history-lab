export const EVENT_STATUS = {
  DRAFT: "draft",
  REVIEWED: "reviewed",
  APPROVED: "approved",
};

export const REVIEWED_PLUS = new Set([EVENT_STATUS.REVIEWED, EVENT_STATUS.APPROVED]);
export const ALL_STATUSES = new Set([EVENT_STATUS.DRAFT, EVENT_STATUS.REVIEWED, EVENT_STATUS.APPROVED]);

function normalizeStatusMode(status) {
  if (status === EVENT_STATUS.APPROVED) return EVENT_STATUS.APPROVED;
  if (status === EVENT_STATUS.DRAFT) return EVENT_STATUS.DRAFT;
  return EVENT_STATUS.REVIEWED;
}

export function matchesStatus(event, minimumStatus = EVENT_STATUS.REVIEWED) {
  if (typeof event?.status !== "string") {
    return false;
  }

  const normalizedStatus = normalizeStatusMode(minimumStatus);
  if (normalizedStatus === EVENT_STATUS.APPROVED) {
    return event.status === EVENT_STATUS.APPROVED;
  }
  if (normalizedStatus === EVENT_STATUS.DRAFT) {
    return ALL_STATUSES.has(event.status);
  }
  return REVIEWED_PLUS.has(event.status);
}

export function matchesUnit(event, unitId) {
  if (!unitId) return true;
  if (!Array.isArray(event?.unit_ids)) return true;
  return event.unit_ids.includes(unitId);
}

export function isRecognitionReady(event) {
  if (!Number.isFinite(event?.time?.year_start)) return false;
  if (typeof event?.summary_short !== "string" || !event.summary_short.trim()) return false;
  const types = new Set(Array.isArray(event?.question_types) ? event.question_types : []);
  return types.has("what_happened") || types.has("significance") || types.has("cause_and_effect");
}

export function isCausalityReady(event) {
  if (!Number.isFinite(event?.time?.year_start)) return false;
  return Array.isArray(event?.effects) && event.effects.length > 0;
}

export function isPeopleLinked(event) {
  return Array.isArray(event?.people_ids) && event.people_ids.length > 0;
}

export function isTimelineReady(event, questionType) {
  if (!Number.isFinite(event?.time?.year_start)) return false;
  if (!Array.isArray(event?.question_types)) return false;
  if (Array.isArray(questionType)) {
    return questionType.some((type) => event.question_types.includes(type));
  }
  if (typeof questionType === "string") {
    return event.question_types.includes(questionType);
  }
  return event.question_types.includes("timeline_before_after");
}

export function filterEvents(events, options = {}) {
  const collection = Array.isArray(events) ? events : [];
  return collection.filter((event) => {
    if (options.status && !matchesStatus(event, options.status)) {
      return false;
    }
    if (options.unit && !matchesUnit(event, options.unit)) {
      return false;
    }
    if (options.requireSummary && (typeof event?.summary_short !== "string" || !event.summary_short.trim())) {
      return false;
    }
    if (typeof options.predicate === "function" && !options.predicate(event)) {
      return false;
    }
    return true;
  });
}
