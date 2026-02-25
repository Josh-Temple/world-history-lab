# World History Lab

A personal learning project for studying world history with **memory-friendly practice formats** beyond standard flashcards.

This repository is designed as a small **learning lab**:
- a shared history dataset (events, people, causal links)
- multiple mini apps (timeline, causality, comparison, etc.)
- local-first progress tracking
- AI-assisted authoring and implementation (with human review)

## Why this project exists

Traditional flashcards are powerful for recall, but world history also requires:
- chronology (what came before/after)
- causality (why events happened)
- connections across regions and actors
- comparison (similar institutions, revolutions, state systems)

This project explores a more structured approach:
- **Timeline Trainer** for chronological reasoning
- **Causality Builder** for cause/effect understanding
- (later) comparison, confusion drills, and map-based practice

## Project goals (MVP)

### Learning goals
- Build stronger chronological intuition
- Practice causal reasoning, not only fact recall
- Reduce confusion between similar events / actors
- Create a reusable study workflow for long-term learning

### Product goals
- Keep the system **simple, local-first, and maintainable**
- Use a **shared data model** across mini apps
- Make content authoring AI-friendly but **quality-controlled**
- Stay easy to host on GitHub Pages (and portable to Vercel later)

## MVP scope

Initial unit:
- **French Revolution to Napoleon**

Initial mini apps:
1. **Timeline Trainer**
   - before/after questions
   - ordering questions
   - century questions

2. **Causality Builder**
   - cause/effect chains
   - cause categorization
   - effect matching

## Repository structure (planned)

```text
world-history-lab/
├─ apps/
│  ├─ hub/
│  ├─ timeline-trainer/
│  └─ causality-builder/
├─ data/
│  ├─ metadata.json
│  ├─ events.json
│  ├─ people.json
│  ├─ links.json
│  └─ units/
├─ schemas/
├─ tools/
│  ├─ validate/
│  └─ import/
├─ docs/
└─ .github/

Data design principles

This project stores knowledge structure, not just question text.

Core entities:

Events (time, tags, causes, effects, related people)

People (roles, related events)

(later) Places/Regions

(optional) explicit Links for graph-like relations


Key idea:

One shared dataset can generate multiple practice formats.


Content and source policy

This is a personal study project.

General policy

Prefer structured external references (e.g. Wikidata) for factual scaffolding

Write short learning summaries in original wording

If AI assists with summaries, manually review before relying on them

Avoid copying long source text into the dataset


Status workflow

Records may be marked as:

draft

reviewed

approved


This allows the apps to later filter content quality if needed.

AI usage policy (practical)

AI is used as a tooling assistant, not a source of authority.

Recommended use:

schema drafting

data normalization

validation scripts

app implementation scaffolding

UI iteration


Human responsibilities:

final data review

learning design decisions

ambiguity checks

historical quality control (especially causal claims)


Current status

[x] Project concept defined

[x] Initial repository structure planned

[x] Event/Person schema drafted (MVP)

[x] Seed unit selected (French Revolution → Napoleon)

[ ] Seed dataset expanded and reviewed

[ ] Timeline Trainer MVP implemented

[ ] Causality Builder MVP implemented

[ ] GitHub Pages deployment


Roadmap (short version)

Phase 1 — MVP foundation

Seed dataset for one unit

Timeline Trainer MVP

Local progress tracking

Basic validation scripts


Phase 2 — Causality practice

Causality Builder MVP

Better cause/effect tagging

Error-aware re-practice logic


Phase 3 — Authoring workflow

Data validation improvements

AI-assisted import/normalization utilities

Better content review workflow


Phase 4 — Expansion

More units (e.g. Industrial Revolution, Reformation, Cold War)

Additional mini apps (comparison, confusion drills, geography)

Optional Vercel deployment / preview workflow


How to contribute (future / personal workflow note)

This is currently a personal project, but the structure is intentionally modular.

If this becomes public/open later, contributions will likely focus on:

data quality improvements

schema improvements

new mini-app modules

validation and testing


License

TBD

(Recommended approach later: separate code license and content/data policy if needed.)