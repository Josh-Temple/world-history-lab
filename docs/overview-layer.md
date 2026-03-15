# Overview Layer Scaffold (Survey Learning)

## Why this layer exists
The existing dataset and apps are strong for event-level recall and timeline ordering. The overview layer adds a lightweight survey step so learners can first build a coarse mental map by era and region before diving into specific events.

## How it differs from event-level data
- `data/events.json` remains the source for detailed event practice.
- `data/overview/*` is intentionally coarse and short-form.
- Overview entries summarize patterns (era × region), not full dated event records.

## Progressive granularity model
1. Era
2. Region
3. Representative anchors (states/civilizations/phenomena)
4. Keyword recall

Later phases can add:
- comparison prompts across regions/eras
- simple causal thread prompts
- eventual links back to detailed events/people/dates

## In scope now
- Minimal design note (this document)
- Small seed schema under `data/overview/`
- Tiny starter content for a few era/region cells

## Out of scope now
- Full overview trainer app
- Scoring/progression logic
- Exhaustive global content coverage
- Changes to existing timeline/event trainer architecture

## Planned connection to later layers
This scaffold is designed to feed future read-only overview viewing first, then hide/reveal recall practice, then comparison and causality prompts after basic survey fluency is stable.
