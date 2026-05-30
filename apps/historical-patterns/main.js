import { fetchJson } from "/apps/shared/data-access.js";

const selectEl = document.getElementById('concept-select');
const summaryEl = document.getElementById('concept-summary');
const comparisonsEl = document.getElementById('event-comparisons');

async function loadData() {
  const [events, concepts] = await Promise.all([
    fetchJson('/data/events.json', 'events'),
    fetchJson('/data/concepts.json', 'concepts'),
  ]);
  return { events, concepts };
}

function getEventsForConcept(events, conceptId) {
  return events
    .filter((ev) => ev.concept_ids?.includes(conceptId))
    .sort((a, b) => (a.time?.year_start ?? 0) - (b.time?.year_start ?? 0));
}

function renderEvents(events) {
  comparisonsEl.innerHTML = events.map((ev) => `
    <article class="event-card">
      <h3>${ev.label}</h3>
      <p class="meta">${ev.time?.year_start ?? 'Unknown year'}</p>
      <p>${ev.summary_short ?? ''}</p>
    </article>
  `).join('');
}

function renderConcept(concept, events) {
  summaryEl.innerHTML = `<h2>${concept.label}</h2><p>${concept.description}</p><p class="meta">${events.length} linked events</p>`;
  renderEvents(events);
}

async function init() {
  const data = await loadData();
  selectEl.innerHTML = data.concepts.map((c) => `<option value="${c.id}">${c.label}</option>`).join('');
  const onSelect = () => {
    const concept = data.concepts.find((c) => c.id === selectEl.value);
    if (!concept) {
      summaryEl.innerHTML = '<h2>No concept available</h2>';
      comparisonsEl.innerHTML = '';
      return;
    }
    renderConcept(concept, getEventsForConcept(data.events, concept.id));
  };
  selectEl.addEventListener('change', onSelect);
  onSelect();
}

init().catch((error) => {
  summaryEl.innerHTML = `<h2>Loading failed</h2><p>${error.message}</p>`;
  comparisonsEl.innerHTML = '';
});
