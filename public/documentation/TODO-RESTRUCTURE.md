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
- [x] Add `js/controllers/company.js` and `js/controllers/index.js` to centralize lifecycle (theme/resize/orientation) and rendering orchestration.
- [x] Visualization lifecycle: wire `themeChanged`, `resize`, `orientationchange` into `js/visualizations/score-visualization-engine.js` and fan out to viz modules via `onThemeChange/handleResize`.
  - [x] Engine listens to theme/orientation and adds `refreshVisuals()`.
  - [x] Company compact hero: sticky bar scaffolded and wired (show/hide on scroll, populated from state, mirrors live price, theme-aware).

## Workstream B — CSS Scoping & Components
- [x] Add page wrappers: `body#company[data-page-context="company-card"]`, `body#index[data-page-context="index"]`.
- [x] Prevent header dropdown CSS collisions; header owns `.search-results-dropdown` styling (company CSS no longer overrides).
- [ ] Broader selector scoping audit under `#index/#company` (deferred; no current collisions).
- [ ] Move truly shared styles (header/sidebar primitives) to `css/components.css`; keep page polish in `css/index.css` and `css/company-card-fixed.css`.
 - [x] Header chip placement & search alignment (mobile + desktop): brand pinned left on ultra-wide; chip shows on scroll on company pages; search position stable and not sidebar-coupled.
   - [x] Company (desktop): anchored search to sidebar edge (256px) and reserved space to prevent layout hops.
   - [x] Mobile header: hide Watchlist icon (available in bottom nav) and show brand text next to logo for continuity.
   - [x] Chip responsive styles: compact chip on mobile (hide price line); constrained width on desktop to avoid overlap.
   - [x] Compact hero (CSS): sticky bar styles added (desktop single row, mobile two rows).
 - [ ] Sidebar close handle placement: ensure the close/collapse arrow is positioned outside content (mid-edge), both desktop and mobile; universal CSS solution.
 - [x] Desktop: widened sidebar to 256px; button centered vertically at right inside; main content offset matches width.
 - [x] Mobile/Tablet: button centered vertically at right inside; no overlay overlap.
 - [x] Sidebar overflow-x hidden to avoid horizontal scrollbars.
  - [x] Main task complete.

## Workstream C — Tooltips & Accessibility
- [x] Ensure all tooltips use `data-tooltip`; remove residual `title` attributes`.
  - Files: `components/universal-header.html`, `components/universal-sidebar.html`, `index.html`, `js/index-page.js`, company compact hero badge.
  - Verified no remaining `title="..."` in non-archive sources.
  - [x] Replaced titles in index grid (card-name, tier-row) with data-tooltip.
- [x] Keyboard/accessibility: focus styles present; `aria-pressed` consistent on favorites-only, sort chips (with SR labels), and view toggles.
- [x] Confirmed: Esc closes pinned tooltip; score details panel supports Enter/Esc; chips/tabs toggle via keyboard.

## Workstream D — Data, Aliases & Formatters
- [x] Enforce ratio lookups via `Aliases.getAliasedRatio(ttm, group)` in company metrics (P/E, EV/EBITDA, P/B, margins, D/E); use `computeRevenueGrowth/EpsGrowth` for growth.
- [x] Normalize percent strings before formatting; use `Formatters` for currency/market cap consistently.
- [ ] Continue sweeping remaining inline formatters in `js/company-card-complete-fix.js` (non-critical).

## Workstream E — Docs Unification
- [x] README.md: updated recent changes, a11y, and body flags.
 - [x] Migrate/merge `readme-index.md` into `docs/index.md` (or fold into README “Pages → Index”).
- [ ] Move `documentation/universal-cleanup.md` content under Architecture → Universal Components (in README or `docs/architecture/universal-components.md`).
- [ ] blueprint.md: Keep as stable product spec; append “Implementation Status” pointer back to README.
- [x] Maintain `documentation/file-structure.md` (repo-wide map) — updated with mini-visuals, header logo classes, `.sr-only`, and search index `websiteHost`.
- [x] Archive stale docs under `documentation/archive/` (CONSOLIDATED_PROJECT_STATUS.md, PHASE_0_COMPLETION_STATUS.md, NEXT_AGENT_HANDOFF.md, universal-cleanup.md, readme-index.md).

## Workstream F — Branding & Manifest
- [x] Update `assets/favicons/site.webmanifest` name/short_name to “AI-Analyst”; verify icon set and theme/background.

## Workstream G — UI Polish (Index Grid)
- [x] Replace emoji star with SVG icon (menus + sorting chip + cards).
- [x] Two-row header in grid cards (Name on top line, Ticker below aligned to logo).
- [x] Tier row (Overall + colored tier label) above bottom stats/bars.
- [x] Tighten spacing; preserve modern gradient/shadows; prevent overlay collisions.
- [ ] Purpose redesign: Reevaluate grid view’s role vs list/table. Define a clear use case (e.g., trend previews, comparisons, or grouping), then redesign visuals accordingly and document the decision.

## Workstream H — Company Modularization & Payload
- Goals: reduce monolith size, improve maintainability, and defer heavy work with lazy loading while preserving behavior.
- JS modularization
  - [x] H1 — Score Cards extracted to `js/views/score-cards.js`; tabs/sticky offsets wired via `js/company-boot.js`.
  - [ ] Move Analysis view to `js/views/analysis.js` (complete wiring via bootstrap/controller). (Most logic already modular; verify residuals only.)
  - [x] Move Tables view to `js/views/tables.js` (complete wiring via bootstrap/controller).
  - [x] Create a thin bootstrap (`js/company-boot.js`) that wires views and delegates lifecycle to controller.
- Lazy-load boundaries
  - [x] Detailed Financials (tables) lazy-loaded on first visibility; skeleton inserted; legacy calls proxied via Company Boot (safe fallback).
  - [x] Charts: earnings trend drawing deferred until first visibility; legacy calls proxied; ensure theme/resize/orientation calls are safe (render occurs after visible). Mini price chart fetch also deferred until first visible. Chart.js not used.
- CSS consolidation
  - [x] Extract shared primitives to `css/components.css`: universal sidebar shell (off‑canvas container + overlay), centered container, app layout, mobile bottom nav, mobile nav trigger, input styles.
  - [x] Extract shared pills/badges: `.tier-badge-mini`, `.ch-tier-badge`, `.tier-badge-compact` moved to `css/components.css`.
  - [x] Final sweep: table/cell primitives remain page‑scoped; no additional shared extraction needed.
  - [x] Pruned duplicates and removed page overrides; docs updated.
- Dead code pruning
  - [ ] Remove unused selectors/helpers left behind after the move; keep changes scoped to the refactor.
- Size budget & measurement
  - [ ] Document size targets (guidelines): per‑page JS ≲ 100–150 KB unminified; CSS ≲ 50–80 KB; larger acceptable if lazy-loaded.
  - [ ] Add a quick measurement note (e.g., `wc -c` or devtools coverage) and record before/after.
- QA & docs
  - [x] Verify no regressions (themes, mobile/desktop, compact hero, tooltips, charts) and that lazy-load sections handle theme/resize.
  - [x] Update `documentation/file-structure.md` to reflect final module boundaries and lazy-load points.
  - [x] Update README Change Log and `documentation/AGENT_HANDOFF.md` with migration summary and test checklist.

### Checkpoints (H)
1) Views moved (boot in place)
2) Lazy-load for charts/tables
3) CSS extraction complete
4) Prune & measure
5) Docs updated

## Checkpoints & Pauses
We will pause after each checkpoint for verification before proceeding:

1) Docs scaffolding created; no code changes yet. (This file + file-structure skeleton)
2) Add page-context to company page and wrappers `#index/#company`; no behavior change. (IN PROGRESS/DONE)
3) Introduce NavigationService and swap it for header search and sidebar recents (both pages still navigate correctly). (COMPLETED)
4) Remove URL heuristics in universals; rely on `data-page-context` only. (COMPLETED)
5) Tooltip audit (titles → data-tooltip) and A11y improvements for toggles/buttons. (COMPLETED)
6) Visualization lifecycle hooks: theme/orientation/resize verified. (COMPLETED)
7) CSS scoping adjustments and shared styles consolidation. (PARTIAL — collisions resolved; broader scoping audit deferred)

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
