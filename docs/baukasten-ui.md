# Baukasten UI direction

This app uses Baukasten's published UI guidance as the visual reference for learner-facing screens.

## Design source

Reference repository: `Josh-Temple/Baukasten` → `UI_GUIDELINES.md`.

The direction is **Engineered Play & Logic / Toy-like precision / Minimal archive**: generous spacing, focused white surfaces, restrained geometric accents, strong typography, and short tactile interaction feedback.

## Shared tokens

- Background: `#F0F2F5`
- Primary ink: `#1A1A1A`
- Surface: `#FFFFFF`
- Primary accent: `#BD5B5B`
- Secondary accent: `#5B7A96`
- Tertiary accent: `#DCA258`
- Borders: `#D9DEE7`

## Two visual contexts

The Home page is the expressive/gallery context. It may use larger cards, stronger framing, and a more poster-like hierarchy.

Every route under `/apps/` is the learning/work context. `apps/shared/baukasten-theme.js` automatically marks these pages with `data-baukasten-context="learning"` and `body.learning-page`, then loads `styles/baukasten-learning.css` after the base theme.

The learning context follows the Session Runner direction established in PR #147:

- use rules, spacing, labels, and typography for structure before adding a card;
- keep setup, metadata, progress, and secondary controls visually quiet;
- reserve a white rounded surface for the actual question, comparison, writing, or manipulation area;
- avoid nested cards and competing borders around embedded activities;
- keep mobile layouts compact enough that the task appears quickly;
- preserve the red/blue/yellow accent, strong black type, and tactile controls without making the surrounding chrome louder than the learning task.

## Implementation

- `styles/baukasten-ui.css` contains shared tokens, typography, controls, and the expressive/default surface treatment.
- `styles/baukasten-learning.css` contains the quieter cross-app learning hierarchy.
- `apps/shared/baukasten-theme.js` applies the base theme and automatically opts `/apps/` routes into the learning context.
- `apps/shared/app-boot.js` applies it to boot-guarded learner apps.
- `pwa/register-sw.js` applies it to top-level and inline PWA pages that register the Service Worker.
- The two classic-script tools (`causal-explanation` and `comparison-trainer`) declare the learning context and both stylesheets directly.
- The Service Worker keeps both shared theme assets available for normal offline recovery.

## Guardrails

- Do not change learning logic to achieve a visual effect.
- Preserve semantic success/error colors when they communicate answer state.
- Prefer whitespace and hierarchy over extra decoration.
- A card should represent a real interactive object or primary work surface, not merely a section boundary.
- Use geometric accents sparingly.
- Keep motion short and respect `prefers-reduced-motion`.
- Keep Session Runner's current bespoke hierarchy stable unless a deliberate redesign is requested.
- New shared colors should be added here and to `styles/baukasten-ui.css` before ad-hoc use.
