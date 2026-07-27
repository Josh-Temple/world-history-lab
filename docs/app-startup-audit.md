# Learner app startup audit (2026-07-27)

All `apps/*/index.html` pages were audited. “Shared boot guard” means the HTML sets `data-app-state=loading`, dynamically imports an absolute entry through `apps/shared/app-boot.js`, reaches `ready` after module evaluation, and renders recovery controls on import/evaluation failure. Existing app initialization continues to replace its own placeholders; its existing fetch/error UI remains responsible for later data errors. The Service Worker may handle every same-origin row, using resource-aware validated caching rather than a fixed allow-only list.

| App | index | Entry | Script | Path | Initial loading | Boot failure UI | SW scope | Root link | Session iframe |
|---|---:|---|---|---|---:|---|---|---:|---:|
| `big-picture-history` | yes | /apps/big-picture-history/main.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `causal-chain` | yes | /apps/causal-chain/app.js<br>/pwa/register-sw.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `causal-explanation` | yes | /apps/causal-explanation/main.js | classic | absolute/inline | no | entry-managed/none | same-origin runtime | yes | no |
| `causality-builder` | yes | /apps/causality-builder/app.js<br>/pwa/register-sw.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `causality-drill` | yes | /apps/causality-drill/app.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | yes |
| `comparison-trainer` | yes | /apps/comparison-trainer/main.js | classic | absolute/inline | no | entry-managed/none | same-origin runtime | yes | no |
| `concept-onboarding-map` | yes | /apps/concept-onboarding-map/main.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `dashboard` | yes | /apps/dashboard/main.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `event-comparison` | yes | /apps/event-comparison/app.js<br>/pwa/register-sw.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | yes |
| `event-recognition` | yes | /apps/event-recognition/app.js<br>/pwa/register-sw.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | yes |
| `graph-explorer` | yes | /apps/graph-explorer/app.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `historical-argument-builder` | yes | /apps/historical-argument-builder/main.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `historical-pattern-transfer` | yes | /apps/historical-pattern-transfer/main.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `historical-patterns` | yes | /apps/historical-patterns/main.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `historical-reasoning-lab` | yes | /apps/historical-reasoning-lab/main.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `historical-source-lab` | yes | /apps/historical-source-lab/main.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `historical-systems-simulator` | yes | /apps/historical-systems-simulator/main.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `history-player` | yes | /pwa/register-sw.js | module | absolute/inline | yes | inline catch | same-origin runtime | yes | no |
| `map-quiz` | yes | /apps/map-quiz/app.js<br>/pwa/register-sw.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | yes |
| `map-reasoning` | yes | /apps/map-reasoning/main.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `misconception-challenge` | yes | /apps/misconception-challenge/main.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `overview` | yes | /pwa/register-sw.js | module | absolute/inline | no | inline catch | same-origin runtime | yes | no |
| `people-recognition` | yes | /apps/people-recognition/app.js<br>/pwa/register-sw.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | yes |
| `sequence-reconstruction` | yes | /apps/sequence-reconstruction/app.js<br>/pwa/register-sw.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | yes |
| `session-runner` | yes | /apps/session-runner/app.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `spread-explorer` | yes | /apps/spread-explorer/main.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `theme-lens` | yes | /apps/theme-lens/main.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |
| `timeline-trainer` | yes | /apps/timeline-trainer/src/main.js<br>/pwa/register-sw.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | yes |
| `year-estimation` | yes | /apps/year-estimation/app.js<br>/pwa/register-sw.js | module | absolute/inline | yes | shared boot guard | same-origin runtime | yes | no |

## Runtime transition and controls

Guarded entries replace `loading` with common `ready` after successful module evaluation or `error` plus Reload / Reset app cache controls after an entry/import/parse/evaluation failure. App-owned asynchronous initializers retain their existing success and error rendering. Session Runner additionally owns `data-session-runner-state`, only enables Restart after initialization, and creates its question iframe from root-absolute `/apps/.../index.html` URLs. Its Complete Question control remains disabled until a confidence choice is recorded. History Player and Overview are inline applications and retain their inline initialization/error catches; they do not have an external entry URL susceptible to clean-URL resolution. Classic-script entries were made root absolute but are outside the ESM import graph.
