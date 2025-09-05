# Restructuring & Documentation TODO

Purpose: Guide the incremental refactor toward a maintainable, componentized app while preserving functionality. This list is the working plan and source of truth for tasks and checkpoints.

## Objectives
- Preserve current functionality (company and index pages) during refactor.
- Centralize navigation, theme, and data access into services.
- Remove path-based heuristics; use `body[data-page-context]` consistently.
- Scope CSS to pages; keep shared primitives minimal and reusable.
- Unify tooltips and formatting logic across the app.
- Keep documentation consolidated in README.md, with blueprint.md as the stable product spec.

## Workstream A — Architecture & Services
- [x] Add `js/services/NavigationService.js` with `goToCompany(ticker)`, `goHome()`, `open(path|url)`.
- [x] Replace direct `window.location` writes and per-page click handlers with NavigationService (header search + sidebar recents). Anchor links remain for SEO and are acceptable.
  - Files: `js/index-page.js`, `js/universal-header.js`, `js/universal-sidebar.js`, any in-page handlers.
- [x] Require explicit page context via `body[data-page-context]` in universals; remove URL/path heuristics.
  - Files: `js/universal-sidebar.js`, `js/universal-header.js` (company chip visibility).
- [ ] Add `js/controllers/company.js` and `js/controllers/index.js` to centralize lifecycle (theme/resize/orientation) and rendering orchestration.
- [ ] Visualization lifecycle: wire `themeChanged`, `resize`, `orientationchange` into `js/visualizations/score-visualization-engine.js` and fan out to viz modules via `onThemeChange/handleResize`.
  - [x] Engine listens to theme/orientation and adds `refreshVisuals()`.
 - [x] Company compact hero: sticky bar scaffolded and wired (show/hide on scroll, populated from state, mirrors live price, theme-aware).

## Workstream B — CSS Scoping & Components
- [x] Add page wrappers: `body#company[data-page-context="company-card"]`, `body#index[data-page-context="index"]`.
- [ ] Scope page-specific selectors under `#index` and `#company` to avoid collisions (e.g., `.search-results-dropdown`).
- [ ] Move truly shared styles (header/sidebar primitives) to `css/components.css`; keep page polish in `css/index.css` and `css/company-card-fixed.css`.
 - [ ] Header chip placement & search alignment (mobile + desktop): ensure chip shows on scroll on company pages and search position remains consistent across pages without altering header universality. To be tackled after core refactors.
   - [x] Company (desktop): anchored search to sidebar edge (256px) and reserved space to prevent layout hops.
   - [x] Mobile header: hide Watchlist icon (available in bottom nav) and show brand text next to logo for continuity.
   - [x] Chip responsive styles: compact chip on mobile (hide price line); constrained width on desktop to avoid overlap.
   - [x] Compact hero (CSS): sticky bar styles added (desktop single row, mobile two rows).
 - [ ] Sidebar close handle placement: ensure the close/collapse arrow is positioned outside content (mid-edge), both desktop and mobile; universal CSS solution.
   - [x] Desktop: widened sidebar to 256px; button centered vertically at right inside; main content offset matches width.
   - [x] Mobile/Tablet: button centered vertically at right inside; no overlay overlap.
   - [x] Sidebar overflow-x hidden to avoid horizontal scrollbars.

## Workstream C — Tooltips & Accessibility
- [x] Ensure all tooltips use `data-tooltip`; remove residual `title` attributes`.
  - Files: `components/universal-header.html`, `components/universal-sidebar.html`, `index.html`, `js/index-page.js`, company compact hero badge.
  - Verified no remaining `title="..."` in non-archive sources.
  - [x] Replaced titles in index grid (card-name, tier-row) with data-tooltip.
- [ ] Keyboard/accessibility: focus styles for icon buttons, ensure `aria-pressed` used consistently on toggles (favorites-only, sort chips if toggling, view toggles).
- [ ] Confirm Esc closes pinned tooltip and details panel; Enter/Space toggles chips/tabs.

## Workstream D — Data, Aliases & Formatters
- [x] Enforce ratio lookups via `Aliases.getAliasedRatio(ttm, group)` in company metrics (P/E, EV/EBITDA, P/B, margins, D/E); use `computeRevenueGrowth/EpsGrowth` for growth.
- [x] Normalize percent strings before formatting; use `Formatters` for currency/market cap consistently.
- [ ] Continue sweeping remaining inline formatters in `js/company-card-complete-fix.js` (non-critical).

## Workstream E — Docs Unification
- [ ] README.md: Keep as the “living guide”. Add Architecture, Pages, and QA sections links.
- [ ] Migrate/merge `readme-index.md` into `docs/index.md` (or fold into README “Pages → Index”).
- [ ] Move `documentation/universal-cleanup.md` content under Architecture → Universal Components (in README or `docs/architecture/universal-components.md`).
- [ ] blueprint.md: Keep as stable product spec; append “Implementation Status” pointer back to README.
- [ ] Maintain `documentation/file-structure.md` (this repo-wide map) as we change structure.

## Workstream F — Branding & Manifest
- [x] Update `assets/favicons/site.webmanifest` name/short_name to “AI-Analyst”; verify icon set and theme/background.

## Workstream G — UI Polish (Index Grid)
- [x] Replace emoji star with SVG icon (menus + sorting chip + cards).
- [x] Two-row header in grid cards (Name on top line, Ticker below aligned to logo).
- [x] Tier row (Overall + colored tier label) above bottom stats/bars.
- [x] Tighten spacing; preserve modern gradient/shadows; prevent overlay collisions.
- [ ] Purpose redesign: Reevaluate grid view’s role vs list/table. Define a clear use case (e.g., trend previews, comparisons, or grouping), then redesign visuals accordingly and document the decision.

## Checkpoints & Pauses
We will pause after each checkpoint for verification before proceeding:

1) Docs scaffolding created; no code changes yet. (This file + file-structure skeleton)
2) Add page-context to company page and wrappers `#index/#company`; no behavior change. (IN PROGRESS/DONE)
3) Introduce NavigationService and swap it for header search and sidebar recents (both pages still navigate correctly). (IN PROGRESS)
4) Remove URL heuristics in universals; rely on `data-page-context` only.
5) Tooltip audit (titles → data-tooltip) and A11y improvements for toggles/buttons.
6) Visualization lifecycle hooks: theme/orientation/resize verified.
7) CSS scoping adjustments and shared styles consolidation.

## Status Summary (Phase wrap)
- Universal header refactored; compact hero added on company page; header chip deprecated.
- Sidebar: widened to 256px on desktop; close handle aligned mid-edge; no x-scroll.
- Navigation centralized via NavigationService; universals rely on `data-page-context`.
- Tooltips standardized for header/sidebar/index; remaining audit in legacy tables.
- Index grid polished (two-row header, SVG favorites star, tier row).

## Next Steps (Proposed)
1) Controllers: add `js/controllers/company.js` and `js/controllers/index.js` to centralize lifecycle hooks and redraws.
2) Data discipline: finalize tooltip audit in legacy tables; ensure all ratios go through `Aliases` and all formatting through `Formatters`.
3) Shared styles: extract any remaining shared primitives from page CSS into `css/components.css` (without regressions).
4) Performance: optional virtualize index list when dataset grows; debounce filters; consider content-visibility for heavy sections.
5) Accessibility: final sweep on aria-pressed consistency; ensure focus ordering and announcements (aria-live) are correct for updates.
6) Docs consolidation: fold `readme-index.md` into `docs/index.md` and link from README; add a short “Universal Components” architecture note.
7) Testing/QA: write a concise manual QA checklist for compact hero + index grid; ensure no regressions on both themes and common breakpoints.

## Definition of Done
- All navigation uses NavigationService.
- No path-based context detection remains in universals.
- Tooltips are uniform; no native titles used for UI hints.
- Visualizations redraw on theme/orientation/resize.
- README is the single living guide; blueprint is stable spec; file-structure doc is complete and current.
- No regressions on index or company pages (manually verified per README QA checklist).
