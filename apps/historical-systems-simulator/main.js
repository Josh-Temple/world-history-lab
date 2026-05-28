import { initializeScenario, applyDecision, advanceTurn, calculateStructuralPressure } from '../shared/systems-simulation-engine.js';

const root = document.getElementById('systems-simulator');
const STORAGE_KEY = 'whl_systems_sim_v1';

function readSaved() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } }
function save(session) { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); }

function bars(state) {
  return Object.entries(state).map(([k,v]) => `<div class="bar-wrap"><div class="bar-label"><span>${k.replaceAll('_',' ')}</span><span>${v}</span></div><div class="bar"><span style="width:${v}%"></span></div></div>`).join('');
}

function render(session, scenario) {
  const pressure = calculateStructuralPressure(session.state);
  root.innerHTML = `<h1>Historical Systems Simulator</h1><p class="muted">${scenario.title} · Turn ${session.turn}</p>
  <section class="panel"><h2>System State</h2>${bars(session.state)}</section>
  <section class="panel"><h2>Structural Pressure</h2>${bars(pressure)}</section>
  <section class="panel"><h2>Decisions</h2>${scenario.decisions.map(d=>`<button class="decision-btn" data-id="${d.id}"><strong>${d.label}</strong><br><span class="muted">${d.summary}</span></button>`).join('')}</section>
  <section class="panel"><h2>History</h2><div class="muted">${session.history.map(h=>`T${h.turn}: ${h.label}`).join('<br>') || 'No decisions yet.'}</div></section>`;

  root.querySelectorAll('[data-id]').forEach((btn)=>btn.addEventListener('click', ()=>{
    const decision = scenario.decisions.find((d)=>d.id===btn.dataset.id); if (!decision) return;
    const next = advanceTurn(applyDecision(session, decision));
    save(next); render(next, scenario);
  }));
}

async function init(){
  const scenarios = await fetch('/data/systems-scenarios.json').then(r=>r.json());
  const scenario = scenarios[0];
  const session = readSaved()?.scenarioId === scenario.id ? readSaved() : initializeScenario(scenario);
  save(session); render(session, scenario);
}
init();
