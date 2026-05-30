import { fetchJson } from "/apps/shared/data-access.js";

const root = document.getElementById('pattern-transfer');
const KEY = 'whl_pattern_transfer_v1';

function loadState() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
function saveState(state) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }

function scoreLabel(choice) {
  if (choice === 'strong') return 'Strong Analogy';
  if (choice === 'partial') return 'Partial Analogy';
  return 'Weak Analogy';
}

async function run() {
  const patterns = await fetchJson('/data/pattern-transfer.json', 'pattern transfer data').catch(() => []);
  const pattern = patterns[Math.floor(Math.random() * patterns.length)] || null;
  if (!pattern) { root.innerHTML = '<p>Pattern data unavailable.</p>'; return; }

  const state = loadState();
  const prior = state[pattern.id] || { attempts: 0, misconceptions: 0, lastChoice: null };

  root.innerHTML = `<h1>Historical Pattern Transfer</h1>
  <p><strong>${pattern.pattern_label}</strong></p>
  <div class="row">
    <section><h3>Potentially transferable structure</h3><p>${(pattern.explanation || 'Identify what transfers and what does not.').slice(0, 220)}</p></section>
    <section><h3>Cross-era cases</h3><ul>${(pattern.cases || []).map((c) => `<li>${c}</li>`).join('')}</ul></section>
    <section><h3>False analogy traps</h3><ul>${(pattern.false_analogy_cases || []).map((c) => `<li>${c}</li>`).join('')}</ul></section>
    <section class="choices"><button data-choice="strong">Strong Analogy</button><button data-choice="partial">Partial Analogy</button><button data-choice="weak">Weak Analogy</button></section>
    <section id="feedback"><p>Prior choice: ${prior.lastChoice ? scoreLabel(prior.lastChoice) : 'none'} · attempts ${prior.attempts}</p></section>
  </div>`;

  root.querySelectorAll('[data-choice]').forEach((btn) => btn.addEventListener('click', () => {
    const choice = btn.getAttribute('data-choice');
    const falseTrap = choice === 'strong' && (pattern.false_analogy_cases || []).length > 0;
    const next = { attempts: prior.attempts + 1, misconceptions: prior.misconceptions + (falseTrap ? 1 : 0), lastChoice: choice };
    state[pattern.id] = next;
    saveState(state);
    document.getElementById('feedback').innerHTML = `<p>${falseTrap ? '⚠️ Possible false analogy: check context boundaries and causal structure.' : '✅ Good: now explain what transfers vs what does not.'}</p><p>Causal-structure reminder: analogies are conditional, not deterministic.</p>`;
  }));
}

run().catch((error) => {
  root.innerHTML = `<p>Unable to load pattern transfer data: ${error.message}</p>`;
});
