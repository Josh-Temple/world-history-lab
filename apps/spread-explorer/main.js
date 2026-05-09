const regionCoords = {
  reg_britain: { x: 290, y: 120, label: 'Britain' },
  reg_france: { x: 305, y: 135, label: 'France' },
  reg_western_europe: { x: 320, y: 130, label: 'W. Europe' },
  reg_eastern_europe: { x: 370, y: 130, label: 'E. Europe' },
  reg_russia: { x: 460, y: 110, label: 'Russia' },
  reg_north_america: { x: 170, y: 150, label: 'N. America' },
  reg_east_asia: { x: 620, y: 160, label: 'E. Asia' },
  reg_middle_east: { x: 430, y: 180, label: 'Middle East' },
  reg_global: { x: 430, y: 250, label: 'Global' }
};
const themeMap = { empire: 'imperialism', trade: 'trade', religion: 'religion', migration: 'migration' };
async function loadEvents() { const res = await fetch('/data/events.json'); return res.json(); }
function filterEvents(events, year, theme) { const t = themeMap[theme] || theme; return events.filter((ev) => (ev.time?.year_start ?? Infinity) <= year && ev.themes?.includes(t) && Array.isArray(ev.region_ids)); }
function renderEvents(events) { const panel = document.getElementById('event-panel'); panel.innerHTML = events.slice(0, 20).map((ev) => `<div class="event-card"><strong>${ev.label}</strong><div>${ev.time.year_start}</div></div>`).join('') || '<div class="event-card">No matching events.</div>'; }
function renderMap(events){const map=document.getElementById('map-container');map.innerHTML='';const active=new Set(events.flatMap(e=>e.region_ids||[]));for(const [id,region] of Object.entries(regionCoords)){const dot=document.createElement('div');dot.className='region-marker'+(active.has(id)?'':' is-dim');dot.style.left=`${region.x}px`;dot.style.top=`${region.y}px`;map.appendChild(dot);const label=document.createElement('div');label.className='region-label';label.style.left=`${region.x}px`;label.style.top=`${region.y}px`;label.textContent=region.label;map.appendChild(label);}}
function yearLabel(year){return year<0?`${Math.abs(year)} BCE`:`${year} CE`;}
async function init(){const events=await loadEvents();const slider=document.getElementById('year-slider');const themeSelect=document.getElementById('theme-select');const yearDisplay=document.getElementById('year-display');const update=()=>{const year=Number(slider.value);const filtered=filterEvents(events,year,themeSelect.value);yearDisplay.textContent=`Showing through ${yearLabel(year)} · ${filtered.length} event(s)`;renderMap(filtered);renderEvents(filtered);};slider.addEventListener('input',update);themeSelect.addEventListener('change',update);update();}
init();
