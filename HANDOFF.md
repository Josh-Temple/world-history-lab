# HANDOFF (2026-05-13)

## What was completed today

- Integrated `related_event_ids` into `apps/graph-explorer/app.js` rendering so users can inspect causal links and broader network links in one place.
- Added a dedicated **Related events (network)** panel in graph detail view and `rel` counts in node cards.
- Updated root `README.md` with a new 2026-05-13 recent-updates note documenting graph relationship visibility.

## Validation status

- `node scripts/validate-data.mjs` ✅ pass (existing Meiji category warnings unchanged).
- `node scripts/derive.mjs` ✅ pass (existing unknown-tag fallback warnings unchanged).

## Suggested next session priorities

1. Add relationship-type metadata (e.g., `diffusion`, `trade`, `intellectual`, `disease`) to strengthen graph filtering and causality pedagogy.
2. Add UI toggle/filter in Graph Explorer for causal-only vs network-related edges.
3. Expand `related_event_ids` coverage to older existing units for more even graph density across the curriculum.

---

# HANDOFF (2026-05-12)

## What was completed today

- Added new unit file `data/units/unit_silk_road_exchange.json` for Silk Road and Afro-Eurasian exchange coverage.
- Expanded `data/events.json` with 41 new exchange-network events spanning Han through 19th-century steamship-era integration.
- Expanded `data/people.json` with 22 exchange-network figures (travelers, rulers, scholars, intermediaries).
- Registered the new unit in `data/units/index.json` and synced `data/metadata.json` scope/curriculum inclusion.
- Added optional `related_event_ids` support in validation (`scripts/validate-data.mjs`) including:
  - shape checks,
  - duplicate detection,
  - unknown-ID hard errors,
  - non-reciprocal relationship warnings.
- Added relationship graph derivation in `scripts/derive.mjs` and generated:
  - `derived/event-relationships.json`
  - `data/derived/event-relationships.json`
- Added/linked bidirectional relationship edges across newly added exchange events.

## Validation status

- `node scripts/validate-data.mjs` ✅ pass (baseline existing Meiji category warnings remain).
- `node scripts/derive.mjs` ✅ pass (baseline legacy unknown-tag fallback warnings remain).

## Why this matters

- Improves content density for trade/religion/technology diffusion learning.
- Strengthens graph/comparison/causality/spread modes with explicit cross-event links.
- Provides broader Afro-Eurasian balance for global-history study flow.

## Suggested next session priorities

1. Add more `region_ids` granularity by expanding `data/regions.json` (e.g., Central Asia, South Asia, Middle East, East Africa) and retag exchange events accordingly.
2. Add targeted `related_event_ids` coverage to preexisting high-traffic units (WWI/WWII/Meiji/Imperialism) to raise graph quality uniformly.
3. Optionally wire `derived/event-relationships.json` into `apps/graph-explorer/` edge rendering if not yet consumed directly.
4. Improve summary specificity for newly added Silk Road events (replace template-like phrasing with event-specific educational wording).
