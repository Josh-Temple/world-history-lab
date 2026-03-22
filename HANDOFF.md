# Handoff

## What changed
- Added 15 approved cross-era canonical History Player events to `data/events.json`, covering ancient through early-modern anchors across West Asia, South Asia, East Asia, Europe, the steppe, and the Atlantic world.
- Updated `scripts/derive.mjs` so normalized events now carry `category`, `importance`, and `location` alongside `summary_short`, allowing downstream apps to consume canonical player fields directly from derived data.
- Rebuilt `apps/history-player/index.html` so the player now:
  - filters to canonical player-ready events,
  - supports `importance <= N` selection,
  - uses canonical coordinates on the map when available,
  - exposes category/location metadata in the event panel.
- Shipped a first learner-facing `apps/overview/index.html` route backed by `data/overview/*` as a read-only survey bridge into Timeline Trainer and History Player.
- Updated `index.html`, `data/metadata.json`, and `README.md` so homepage routing, enabled app metadata, and project documentation reflect Overview + People Recognition + the canonical player slice.

## Validation completed
- Ran `node scripts/validate-data.mjs` successfully.
- Ran `node scripts/derive.mjs` successfully.
- Ran `node scripts/smoke-timeline-trainer.mjs` successfully.
- Ran `node --check apps/history-player/index.html` unsuccessfully because `node --check` does not parse inline HTML module scripts; use browser/manual route checks instead.
- Ran `python3 -m http.server 4173` and fetched `/apps/history-player/` plus `/apps/overview/` to confirm the new learner-facing copy is present.

## Suggested next steps
1. Extend the canonical player slice beyond the first 15 events so History Player can move smoothly from early world-history anchors into the repo’s modern unit cluster.
2. Add validation that homepage-linked apps are present in `data/metadata.json` and that canonical player slice events include `importance`, `category`, `summary_short`, and `location`.
3. Move People Recognition onto the shared filter layer so all learner-facing apps use one consistent readiness policy.
