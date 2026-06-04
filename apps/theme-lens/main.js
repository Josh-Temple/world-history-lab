import { fetchJson } from "/apps/shared/data-access.js";

const themeSelect = document.getElementById("theme-select");
const regionSelect = document.getElementById("region-select");
const statusPanel = document.getElementById("status-panel");
const overviewEl = document.getElementById("theme-overview");
const timelineEl = document.getElementById("timeline-arc");
const promptsEl = document.getElementById("comparison-prompts");

const FALLBACK_THEME_LABELS = {
  economic_change: "Economic change",
  industrialization: "Industrialization",
  migration: "Migration",
  religion: "Religion",
  revolution: "Revolution",
  state_power: "State power",
  technology: "Technology",
  trade: "Trade",
  war: "War",
};

function titleCase(value) {
  return String(value || "Unknown")
    .replace(/^reg_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function yearOf(event) {
  return Number(event?.time?.year_start ?? event?.year ?? 0);
}

function getEventRegions(event) {
  return event.region_ids?.length ? event.region_ids : event.regions || [];
}

function getThemeOptions(events) {
  const counts = new Map();
  for (const event of events) {
    for (const theme of event.themes || []) {
      counts.set(theme, (counts.get(theme) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, count]) => ({ id, count, label: FALLBACK_THEME_LABELS[id] || titleCase(id) }));
}

function getRegionOptions(events, regionLabels) {
  const counts = new Map();
  for (const event of events) {
    for (const region of getEventRegions(event)) {
      counts.set(region, (counts.get(region) || 0) + 1);
    }
  }
  return [
    { id: "all", count: events.length, label: "All regions" },
    ...[...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([id, count]) => ({ id, count, label: regionLabels.get(id) || titleCase(id) })),
  ];
}

function summarizeYears(events) {
  const years = events.map(yearOf).filter(Boolean).sort((a, b) => a - b);
  if (!years.length) return "Unknown range";
  return `${years[0]} to ${years[years.length - 1]}`;
}

function pickArcEvents(events) {
  const sorted = [...events].sort((a, b) => yearOf(a) - yearOf(b));
  if (sorted.length <= 3) return sorted;
  const middle = sorted[Math.floor(sorted.length / 2)];
  return [sorted[0], middle, sorted[sorted.length - 1]];
}

function renderOverview(theme, filteredEvents) {
  const regions = new Set(filteredEvents.flatMap(getEventRegions));
  const concepts = new Set(filteredEvents.flatMap((event) => event.concept_ids || []));
  overviewEl.innerHTML = `
    <article class="stat-card"><strong>${filteredEvents.length}</strong><span>events in this lens</span></article>
    <article class="stat-card"><strong>${regions.size}</strong><span>regions represented</span></article>
    <article class="stat-card"><strong>${concepts.size}</strong><span>linked concepts</span></article>
    <article class="stat-card"><strong>${summarizeYears(filteredEvents)}</strong><span>chronological span</span></article>
  `;
  statusPanel.className = "panel status-panel ready";
  statusPanel.textContent = `${theme.label} lens ready.`;
}

function renderTimeline(events, regionLabels) {
  const arcEvents = pickArcEvents(events);
  if (!arcEvents.length) {
    timelineEl.innerHTML = `<p class="muted">No events match this theme and region filter yet.</p>`;
    return;
  }
  const eraLabels = arcEvents.length === 1 ? ["Selected event"] : ["Earlier anchor", "Middle comparison", "Later anchor"];
  timelineEl.innerHTML = arcEvents.map((event, index) => {
    const regions = getEventRegions(event).map((id) => regionLabels.get(id) || titleCase(id)).slice(0, 3);
    return `
      <article class="event-card" data-era="${eraLabels[index] || "Arc event"}">
        <h3>${event.label}</h3>
        <div class="card-meta"><span class="pill">${yearOf(event) || "Unknown year"}</span>${regions.map((region) => `<span class="pill">${region}</span>`).join("")}</div>
        <p>${event.summary_short || "No summary available."}</p>
      </article>
    `;
  }).join("");
}

function renderPrompts(theme, events) {
  const arcEvents = pickArcEvents(events);
  const [first, second, third] = arcEvents;
  const prompts = [
    {
      title: "Continuity/change",
      body: first && third
        ? `What stayed similar, and what changed, between ${first.label} and ${third.label} as examples of ${theme.label.toLowerCase()}?`
        : `What continuity/change question would help explain ${theme.label.toLowerCase()} across this dataset?`,
    },
    {
      title: "Causation",
      body: second
        ? `Which pressures, incentives, or institutions made ${second.label} possible, and what consequences followed?`
        : `Identify one cause and one consequence for a representative ${theme.label.toLowerCase()} event.`,
    },
    {
      title: "Regional comparison",
      body: `Choose two regions in this lens. How did geography, institutions, or networks make ${theme.label.toLowerCase()} operate differently?`,
    },
    {
      title: "Transfer warning",
      body: `Name one tempting but false analogy that could appear when comparing ${theme.label.toLowerCase()} across distant eras.`,
    },
  ];
  promptsEl.innerHTML = prompts.map((prompt) => `
    <article class="prompt-card">
      <h3>${prompt.title}</h3>
      <p>${prompt.body}</p>
    </article>
  `).join("");
}

function render(data) {
  const theme = data.themes.find((option) => option.id === themeSelect.value) || data.themes[0];
  const regionId = regionSelect.value || "all";
  const filteredEvents = data.events.filter((event) => {
    const themeMatch = event.themes?.includes(theme.id);
    const regionMatch = regionId === "all" || getEventRegions(event).includes(regionId);
    return themeMatch && regionMatch;
  });

  renderOverview(theme, filteredEvents);
  renderTimeline(filteredEvents, data.regionLabels);
  renderPrompts(theme, filteredEvents);
}

async function init() {
  const [events, regions] = await Promise.all([
    fetchJson("/data/events.json", "events"),
    fetchJson("/data/regions.json", "regions"),
  ]);
  const regionLabels = new Map(regions.map((region) => [region.id, region.label]));
  const themes = getThemeOptions(events);
  const regionOptions = getRegionOptions(events, regionLabels);

  themeSelect.innerHTML = themes.map((theme) => `<option value="${theme.id}">${theme.label} (${theme.count})</option>`).join("");
  regionSelect.innerHTML = regionOptions.map((region) => `<option value="${region.id}">${region.label} (${region.count})</option>`).join("");

  const data = { events, regionLabels, themes };
  themeSelect.addEventListener("change", () => render(data));
  regionSelect.addEventListener("change", () => render(data));
  render(data);
}

init().catch((error) => {
  statusPanel.className = "panel status-panel error";
  statusPanel.innerHTML = `<strong>Loading failed.</strong> ${error.message}`;
  overviewEl.innerHTML = "";
  timelineEl.innerHTML = "";
  promptsEl.innerHTML = "";
});
