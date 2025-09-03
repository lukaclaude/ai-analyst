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
- [ ] Add `js/services/NavigationService.js` with `goToCompany(ticker)`, `goHome()`, `open(path|url)`.
- [ ] Replace direct `window.location` writes and per-page click handlers with NavigationService.
  - Files: `js/index-page.js`, `js/universal-header.js`, `js/universal-sidebar.js`, any in-page handlers.
- [ ] Require explicit page context via `body[data-page-context]` in universals; remove URL/path heuristics.
  - Files: `js/universal-sidebar.js`, `js/universal-header.js` (company chip visibility).
- [ ] Add `js/controllers/company.js` and `js/controllers/index.js` to centralize lifecycle (theme/resize/orientation) and rendering orchestration.
- [ ] Visualization lifecycle: wire `themeChanged`, `resize`, `orientationchange` into `js/visualizations/score-visualization-engine.js` and fan out to viz modules via `onThemeChange/handleResize`.

## Workstream B — CSS Scoping & Components
- [ ] Add page wrappers: `body#company[data-page-context="company-card"]`, `body#index[data-page-context="index"]`.
- [ ] Scope page-specific selectors under `#index` and `#company` to avoid collisions (e.g., `.search-results-dropdown`).
- [ ] Move truly shared styles (header/sidebar primitives) to `css/components.css`; keep page polish in `css/index.css` and `css/company-card-fixed.css`.

## Workstream C — Tooltips & Accessibility
- [ ] Ensure all tooltips use `data-tooltip`; remove residual `title` attributes.
  - Files: `components/universal-header.html`, `components/universal-sidebar.html`, `index.html`, `js/index-page.js` renderers.
- [ ] Keyboard/accessibility: focus styles for icon buttons, ensure `aria-pressed` used consistently on toggles (favorites-only, sort chips if toggling, view toggles).
- [ ] Confirm Esc closes pinned tooltip and details panel; Enter/Space toggles chips/tabs.

## Workstream D — Data, Aliases & Formatters
- [ ] Enforce ratio lookups via `Aliases.getAliasedRatio(ttm, group)`; pass TTM object raw.
- [ ] Normalize percent strings before formatting; use `js/lib/formatters.js` throughout.
- [ ] Remove duplicate inline formatters in `js/company-card-complete-fix.js` where feasible.

## Workstream E — Docs Unification
- [ ] README.md: Keep as the “living guide”. Add Architecture, Pages, and QA sections links.
- [ ] Migrate `readme-index.md` into `docs/index.md` (or fold into README “Pages → Index”).
- [ ] Move `documentation/universal-cleanup.md` content under Architecture → Universal Components (in README or `docs/architecture/universal-components.md`).
- [ ] blueprint.md: Keep as stable product spec; append “Implementation Status” pointer back to README.
- [ ] Maintain `documentation/file-structure.md` (this repo-wide map) as we change structure.

## Workstream F — Branding & Manifest
- [ ] Update `assets/favicons/site.webmanifest` name/short_name to “Finalysis”; verify icon set and theme/background.

## Checkpoints & Pauses
We will pause after each checkpoint for verification before proceeding:

1) Docs scaffolding created; no code changes yet. (This file + file-structure skeleton)
2) Add page-context to company page and wrappers `#index/#company`; no behavior change.
3) Introduce NavigationService and swap it for header search and sidebar recents (both pages still navigate correctly).
4) Remove URL heuristics in universals; rely on `data-page-context` only.
5) Tooltip audit (titles → data-tooltip) and A11y improvements for toggles/buttons.
6) Visualization lifecycle hooks: theme/orientation/resize verified.
7) CSS scoping adjustments and shared styles consolidation.

## Definition of Done
- All navigation uses NavigationService.
- No path-based context detection remains in universals.
- Tooltips are uniform; no native titles used for UI hints.
- Visualizations redraw on theme/orientation/resize.
- README is the single living guide; blueprint is stable spec; file-structure doc is complete and current.
- No regressions on index or company pages (manually verified per README QA checklist).

