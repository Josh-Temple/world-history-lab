function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }

export function initializeScenario(scenario) {
  return {
    turn: 1,
    scenarioId: scenario.id,
    title: scenario.title,
    state: { ...scenario.starting_conditions },
    history: [],
    deferred: [],
  };
}

export function applyDecision(session, decision) {
  const next = structuredClone(session);
  for (const [k, d] of Object.entries(decision.immediate || {})) next.state[k] = clamp((next.state[k] || 0) + d);
  if (Array.isArray(decision.deferred)) next.deferred.push(...decision.deferred.map((d) => ({ ...d, resolve_turn: next.turn + (d.in_turns || 1) })));
  next.history.push({ turn: next.turn, decision_id: decision.id, label: decision.label });
  return next;
}

export function advanceTurn(session) {
  const next = structuredClone(session);
  next.turn += 1;
  const remaining = [];
  for (const item of next.deferred) {
    if (item.resolve_turn <= next.turn) {
      for (const [k, d] of Object.entries(item.effects || {})) next.state[k] = clamp((next.state[k] || 0) + d);
    } else remaining.push(item);
  }
  next.deferred = remaining;
  return next;
}

export function calculateStructuralPressure(state) {
  const legitimacy = clamp((state.political_stability + state.economic_stability - state.elite_fragmentation) / 2);
  const administrativeStrain = clamp((state.military_pressure + state.elite_fragmentation + (100 - state.treasury)) / 3);
  return { legitimacy, administrative_strain: administrativeStrain };
}
