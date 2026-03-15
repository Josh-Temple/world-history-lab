# Overview Layer Scaffold (Survey Learning)

## Purpose
The overview layer adds a lightweight survey step so learners can build a coarse era × region mental map before diving into detailed event practice.

## How it differs from event-level data
- `data/events.json` remains the source for detailed event/timeline learning.
- `data/overview/*` is intentionally short-form and pattern-oriented.
- Overview cells summarize broad context, not dated event records.

## Progressive granularity
1. Era
2. Region
3. Representative anchors (states/civilizations/phenomena)
4. Keyword recall

Potential later extensions:
- Comparison prompts across regions/eras
- Simple causal-thread prompts
- Links back to detailed events/people/dates

## In scope now
- This design note
- Minimal overview seed data under `data/overview/`
- Tiny starter set of era × region survey cells

## Out of scope now
- Full overview trainer app
- Scoring/progression logic
- Exhaustive global coverage
- Refactors to existing timeline/event trainer architecture

## Intended integration path
Start with read-only overview viewing, then add lightweight hide/reveal recall, then comparison prompts, and only later causal-thread support.
