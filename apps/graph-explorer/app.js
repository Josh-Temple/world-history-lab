import { getNormalizedEvents, getUnits } from "../shared/data-store.js";

const MAX_VISIBLE_NODES = 80;

const els = {
  unitFilter: document.getElementById("unit-filter"),
  count: document.getElementById("count"),
  graph: document.getElementById("graph"),
  details: document.getElementById("details"),
};

const state = {
  events: [],
  eventsById: new Map(),
  units: [],
  selectedUnitId: "",
  selectedEventId: "",
};

function getEventYear(event) {
  return Number.isFinite(event?.time?.year_start) ? event.time.year_start : null;
}

function getEffectTargetId(effectRef) {
  if (typeof effectRef === "string") return effectRef;
  if (effectRef && typeof effectRef === "object" && typeof effectRef.event_id === "string") return effectRef.event_id;
  return null;
}

function getFilteredEvents() {
  const unitId = state.selectedUnitId;
  if (!unitId) return state.events;
  return state.events.filter((event) => Array.isArray(event.unit_ids) && event.unit_ids.includes(unitId));
}

function buildConnectedIds(event) {
  const outgoing = (Array.isArray(event.effects) ? event.effects : [])
    .map(getEffectTargetId)
    .filter((id) => typeof id === "string" && state.eventsById.has(id));
  const incoming = Array.isArray(event.caused_by) ? event.caused_by.filter((id) => state.eventsById.has(id)) : [];
  return {
    outgoing: Array.from(new Set(outgoing)),
    incoming: Array.from(new Set(incoming)),
  };
}

function renderUnitFilter() {
  const options = ['<option value="">All units</option>']
    .concat(
      state.units.map((unit) => `<option value="${unit.id}">${unit.title || unit.label || unit.id}</option>`)
    );
  els.unitFilter.innerHTML = options.join("");
  els.unitFilter.value = state.selectedUnitId;
}

function renderDetails(eventId) {
  const event = state.eventsById.get(eventId);
  if (!event) {
    els.details.innerHTML = "<p class='muted'>Select an event to inspect incoming and outgoing links.</p>";
    return;
  }

  const { incoming, outgoing } = buildConnectedIds(event);
  const connectionsCount = incoming.length + outgoing.length;
  const year = getEventYear(event);

  const renderList = (ids) => {
    if (ids.length === 0) return "<p class='muted'>None</p>";
    const rows = ids
      .map((id) => {
        const linked = state.eventsById.get(id);
        if (!linked) return "";
        return `<li><button class="related-btn" data-target-id="${id}">${linked.label}</button></li>`;
      })
      .filter(Boolean)
      .join("");
    return `<ul class="related-list">${rows}</ul>`;
  };

  els.details.innerHTML = `
    <h2>${event.label}</h2>
    <p class="muted">${year ?? "Unknown year"} · Connections: ${connectionsCount}</p>
    <p>${event.summary_short || ""}</p>
    <h3>Causes this event (incoming)</h3>
    ${renderList(incoming)}
    <h3>Leads to (outgoing)</h3>
    ${renderList(outgoing)}
  `;

  els.details.querySelectorAll("[data-target-id]").forEach((button) => {
    button.addEventListener("click", () => {
      focusEvent(button.getAttribute("data-target-id") || "");
    });
  });
}

function renderGraph() {
  const filtered = getFilteredEvents();
  const visible = filtered.slice(0, MAX_VISIBLE_NODES);

  els.count.textContent = `${filtered.length} events${filtered.length > MAX_VISIBLE_NODES ? ` (showing first ${MAX_VISIBLE_NODES})` : ""}`;

  if (visible.length === 0) {
    els.graph.innerHTML = "<p class='muted'>No events in this filter.</p>";
    renderDetails("");
    return;
  }

  const html = visible
    .map((event) => {
      const { incoming, outgoing } = buildConnectedIds(event);
      const cls = event.id === state.selectedEventId ? "node active" : "node";
      return `
        <button class="${cls}" data-event-id="${event.id}">
          <div class="node-title">${event.label}</div>
          <div class="node-meta">${getEventYear(event) ?? "?"} · in ${incoming.length} / out ${outgoing.length}</div>
        </button>
      `;
    })
    .join("");
  els.graph.innerHTML = html;

  els.graph.querySelectorAll("[data-event-id]").forEach((button) => {
    button.addEventListener("click", () => focusEvent(button.getAttribute("data-event-id") || ""));
  });

  if (!state.selectedEventId || !filtered.some((event) => event.id === state.selectedEventId)) {
    focusEvent(visible[0].id);
  } else {
    renderDetails(state.selectedEventId);
  }
}

function focusEvent(eventId) {
  if (!eventId || !state.eventsById.has(eventId)) return;
  state.selectedEventId = eventId;
  renderGraph();
  renderDetails(eventId);
}

function bindEvents() {
  els.unitFilter.addEventListener("change", () => {
    state.selectedUnitId = els.unitFilter.value || "";
    const filtered = getFilteredEvents();
    state.selectedEventId = filtered[0]?.id || "";
    renderGraph();
    renderDetails(state.selectedEventId);
  });
}

async function init() {
  els.details.innerHTML = "<p class='muted'>Loading graph…</p>";

  const [events, units] = await Promise.all([getNormalizedEvents(), getUnits()]);
  state.events = events
    .slice()
    .sort((a, b) => (getEventYear(a) ?? Number.MAX_SAFE_INTEGER) - (getEventYear(b) ?? Number.MAX_SAFE_INTEGER) || a.label.localeCompare(b.label));
  state.eventsById = new Map(state.events.map((event) => [event.id, event]));
  state.units = units;

  renderUnitFilter();
  bindEvents();
  renderGraph();
}

init().catch((error) => {
  els.graph.innerHTML = "";
  els.details.innerHTML = `<p class="muted">Failed to load graph: ${error.message}</p>`;
});
