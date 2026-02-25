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
