function asYear(event) {
  return Number(event?.time?.year_start) || null;
}

function inferStage(index, total) {
  if (index === 0) return "preconditions";
  if (index <= Math.floor(total / 3)) return "acceleration";
  if (index <= Math.floor((2 * total) / 3)) return "system_transformation";
  return "secondary_effects";
}

function conceptChainLabel(conceptId) {
  return conceptId.replace(/^concept_/, "").split("_").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
}

export function deriveProcessChains(events, { generatedAt = "2000-01-01T00:00:00.000Z" } = {}) {
  const eventMap = new Map(events.map((e) => [e.id, e]));
  const incoming = new Map();
  const outgoing = new Map();

  for (const event of events) {
    const prereqs = Array.isArray(event.prerequisite_event_ids) ? event.prerequisite_event_ids : [];
    for (const prereqId of prereqs) {
      if (!eventMap.has(prereqId)) continue;
      if (!outgoing.has(prereqId)) outgoing.set(prereqId, new Set());
      outgoing.get(prereqId).add(event.id);
      if (!incoming.has(event.id)) incoming.set(event.id, new Set());
      incoming.get(event.id).add(prereqId);
    }
  }

  const starts = events.filter((e) => (incoming.get(e.id)?.size || 0) === 0 && (outgoing.get(e.id)?.size || 0) > 0);
  const chains = [];
  const used = new Set();

  for (const start of starts) {
    const chain = [start.id];
    let cur = start.id;
    const seen = new Set([cur]);
    while (outgoing.get(cur)?.size) {
      const next = [...outgoing.get(cur)]
        .map((id) => eventMap.get(id))
        .filter(Boolean)
        .sort((a, b) => (asYear(a) || 0) - (asYear(b) || 0))[0];
      if (!next || seen.has(next.id)) break;
      chain.push(next.id);
      seen.add(next.id);
      cur = next.id;
      if (chain.length >= 8) break;
    }
    if (chain.length >= 3) {
      chain.forEach((id) => used.add(id));
      const concept = (eventMap.get(chain[0]).concept_ids || ["concept_trade_network_expansion"])[0];
      chains.push({
        id: `chain_${chain[0].replace(/^ev_/, "")}`,
        label: `${conceptChainLabel(concept)} Transformation`,
        event_ids: chain,
        concept_anchor_id: concept,
        stages: chain.map((id, idx) => ({ stage: inferStage(idx, chain.length), event_id: id }))
      });
    }
  }

  const orphanWarnings = events.filter((e) => !used.has(e.id) && ((incoming.get(e.id)?.size || 0) + (outgoing.get(e.id)?.size || 0) > 0))
    .slice(0, 40)
    .map((e) => `isolated_or_short_chain:${e.id}`);

  return { generated_at: generatedAt, chains, warnings: orphanWarnings };
}
