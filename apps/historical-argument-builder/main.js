import { evaluateClaimClarity, evaluateEvidenceUsage, evaluateCounterargumentPresence } from '../shared/argument-rubric-utils.js';

const STORAGE_KEY = 'whl_argument_builder_v1';
const defaultState = { thesis:'', evidence:'', causal:'', counterargument:'', synthesis:'', revisions:[] };

function loadState() {
  try { return { ...defaultState, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')) }; } catch { return { ...defaultState }; }
}
function saveState(next) {
  const stamped = { ...next, revisions: [...(next.revisions || []), { timestamp: Date.now() }].slice(-20) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
  return stamped;
}

function render() {
  const root = document.getElementById('argument-builder');
  let state = loadState();
  root.innerHTML = `
    <section class="panel">
      <h1>Historical Argument Builder</h1>
      ${['thesis','evidence','causal','counterargument','synthesis'].map((k)=>`<section class="argument-section"><h2>${k[0].toUpperCase()+k.slice(1)}</h2><p class="prompt">${({thesis:'What is your central claim?',evidence:'Which specific sources/events support your claim?',causal:'What mechanisms connected these events?',counterargument:'What alternative explanation exists?',synthesis:'How does this argument matter in broader world history?'})[k]}</p><textarea data-key="${k}">${state[k]||''}</textarea></section>`).join('')}
      <div style="display:flex; gap:.5rem; flex-wrap:wrap;"><button id="save-draft">Save Draft</button><button id="clear-draft" class="secondary">Clear</button></div>
      <section class="feedback panel"><h2>Rubric Heuristics</h2><ul id="feedback-list"></ul></section>
    </section>
    <aside class="panel">
      <h2>Source Integration Panel</h2>
      <p class="prompt">Use these prompts while drafting:</p>
      <ul><li>Related sources: evidence strength, perspective, reliability.</li><li>Concepts: state formation, trade integration, migration systems.</li><li>Linked events: compare cause/effect chains across eras.</li><li>Perspectives: include at least one alternative lens.</li></ul>
      <p><strong>Revisions:</strong> ${(state.revisions || []).length}</p>
      <p class="prompt">Last saved: ${(state.revisions || []).length ? new Date(state.revisions[state.revisions.length-1].timestamp).toLocaleString() : 'Never'}</p>
    </aside>`;

  const refreshFeedback = () => {
    const list = document.getElementById('feedback-list');
    list.innerHTML = [
      evaluateClaimClarity(state.thesis),
      evaluateEvidenceUsage(state.evidence),
      evaluateCounterargumentPresence(state.counterargument),
    ].map((line) => `<li>${line}</li>`).join('');
  };
  refreshFeedback();

  root.querySelectorAll('textarea').forEach((el)=>el.addEventListener('input',(e)=>{ state[e.target.dataset.key]=e.target.value; refreshFeedback(); }));
  document.getElementById('save-draft')?.addEventListener('click', ()=>{ state = saveState(state); render(); });
  document.getElementById('clear-draft')?.addEventListener('click', ()=>{ localStorage.removeItem(STORAGE_KEY); state = { ...defaultState }; render(); });
}

render();
