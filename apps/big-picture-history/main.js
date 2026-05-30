import { fetchJson } from "/apps/shared/data-access.js";

const THEMES = [
  { key: 'state_power', label: 'Rise of States' },
  { key: 'trade', label: 'Trade-Network Integration' },
  { key: 'religion', label: 'Religious Diffusion' },
  { key: 'industrialization', label: 'Industrialization' },
  { key: 'imperialism', label: 'Empire and Fragmentation' },
];

function renderTheme(theme, events) {
  const rows = events
    .filter((event) => Array.isArray(event.themes) && event.themes.includes(theme.key))
    .sort((a, b) => (a.time?.year_start || 0) - (b.time?.year_start || 0))
    .slice(0, 8);
  return `<section><h2>${theme.label}</h2>${rows.length ? rows.map((e) => `<p><strong>${e.time?.year_start ?? 'n/a'}</strong> · ${e.label}</p>`).join('') : '<p>No events tagged yet.</p>'}</section>`;
}

async function main() {
  const root = document.getElementById('history-container');
  const events = await fetchJson('/data/events.json', 'events').catch(() => []);
  root.innerHTML = `<h1>Big Picture History</h1><p><small>Macro-historical synthesis across units and eras.</small></p>
    <section class="turning-point"><h2>Turning Point: Industrial Revolution</h2><p>Atlantic trade integration and industrial technology accelerated global power shifts and imperial competition.</p></section>
    <section class="turning-point"><h2>Turning Point: Silk Road to Black Death</h2><p>Interconnected Afro-Eurasian exchange expanded commerce and intensified epidemiological vulnerability.</p></section>
    ${THEMES.map((theme) => renderTheme(theme, Array.isArray(events) ? events : [])).join('')}
    <section><h2>Cross-unit Narrative Links</h2><p>Silk Road exchange → Mongol integration → Black Death → state restructuring.</p><p>Atlantic trade → industrialization → imperialism → nationalist resistance.</p></section>`;
}

main().catch((error) => {
  const root = document.getElementById('history-container');
  if (root) root.innerHTML = `<h1>Big Picture History</h1><p>Unable to load history data: ${error.message}</p>`;
});
