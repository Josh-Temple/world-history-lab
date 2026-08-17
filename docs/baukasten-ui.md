# Baukasten UI direction

This app uses Baukasten's published UI guidance as the visual reference for learner-facing screens.

## Design source

Reference repository: `Josh-Temple/Baukasten` → `UI_GUIDELINES.md`.

The direction is **Engineered Play & Logic / Toy-like precision / Minimal archive**: generous spacing, focused white cards, restrained geometric accents, strong typography, and short tactile interaction feedback.

## Shared tokens

- Background: `#F0F2F5`
- Primary ink: `#1A1A1A`
- Surface: `#FFFFFF`
- Primary accent: `#BD5B5B`
- Secondary accent: `#5B7A96`
- Tertiary accent: `#DCA258`
- Borders: `#D9DEE7`

## Implementation

- `styles/baukasten-ui.css` contains the shared visual layer.
- `apps/shared/baukasten-theme.js` applies the theme without changing learning behavior.
- `apps/shared/app-boot.js` applies it to boot-guarded learner apps.
- `pwa/register-sw.js` applies it to top-level and inline PWA pages that register the Service Worker.
- The Service Worker keeps the theme assets available for normal offline recovery.

## Guardrails

- Do not change learning logic to achieve a visual effect.
- Preserve semantic success/error colors when they communicate answer state.
- Prefer whitespace and hierarchy over extra decoration.
- Use geometric accents sparingly.
- Keep motion short and respect `prefers-reduced-motion`.
- New shared colors should be added here and to `styles/baukasten-ui.css` before ad-hoc use.
