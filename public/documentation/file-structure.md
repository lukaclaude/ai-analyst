# Repository File Structure & Responsibilities

Purpose: Provide a clear, up-to-date map of files and their roles to help future contributors quickly understand and extend the app. Keep this updated as restructuring progresses.

## Top-Level
- `README.md`: Living guide (current status, architecture, QA). Entry point for developers.
- `blueprint.md`: Stable product/experience/visual blueprint and long-term plan.
- `index.html`: Explore companies (list/grid/table). Loads universals, services, and `js/index-page.js`.
- `company-card-fixed.html`: Detailed company analysis page. Loads universals, views, and company controller script.
  - Includes `#compact-hero`: a sticky, compact company summary bar (logo, ticker, price, overall/tier) that appears below the header when the main hero scrolls out. Behavior wired in JS.
- `assets/`: Favicons and static assets.
- `components/`: HTML partials for universal header and sidebar.
- `css/`: Theme tokens (shared), component primitives, and page-specific styles.
- `js/`: Application scripts: services, universals, libs, views, visualizations.
- `documentation/`: Project docs, this file, and restructuring TODO.
- `archive/`, `_backups/`: Historical or legacy code and snapshots.

## components/
- `universal-header.html`: Header markup + styles; contains global search, theme toggle, (company chip gated by page context).
- `universal-sidebar.html`: Sidebar skeleton; top content is context-aware, bottom lists recent companies and theme toggle.

## css/
- `theme.css`: Design tokens (colors, type, radii, shadows, breakpoints). Also shared utilities and layout primitives.
- `components.css`: Shared component styles and primitives (header, universal sidebar shell, mobile bottom nav, container-centered, mobile nav trigger, minimal utilities, shared pills/badges, input styles).
  - Utilities: `.sr-only` (screen-reader only)
- `index.css`: Index page scoped styles (grid/list/table, filters, sort chips, sparklines).
  - List row: optional `.tier-badge-mini` pill next to Overall (hidden on mobile)
- `company-card-fixed.css`: Company page scoped styles (hero, score cards, analysis, tables).
  - Styles for `#compact-hero` sticky bar (layout, theme, responsive behavior).
  - Avoid redeclaring header search dropdown; header component owns `.search-results-dropdown` styles.

## js/services/
- `ThemeService.js`: Theme source of truth (light/dark). Applies body class, persists to localStorage, emits `themeChanged`.
- `DataService.js`: Firestore init, search index builder, recent companies (localStorage + pub/sub).
  - Search index fields: `{ ticker, name, score, websiteHost }` (websiteHost used for tiny logos in header search)
- `NavigationService.js`: Navigation entry points (goToCompany/goHome/open). Replaces per-page routing progressively.
- `AnalyticsService.js`: GA4 lightweight wrapper. Dynamically loads `gtag.js` with measurement ID, logs `page_view` on load, and exposes `logEvent`/`logPageView` for future use. Centralized and reversible.

## js/lib/
- `aliases.js`: Central alias lookups for key ratios and computed helpers (TTM & YoY).
- `formatters.js`: Currency/quantity/market cap formatting; consistent across pages.
- `tiers.js`: Tier/color mappings for scores and labels.

## js/ (universals + entry + bootstraps)
- `tooltip.js`: Single DOM-node, theme-aware tooltip for `[data-tooltip]`; keyboard and mobile tap-to-pin support.
- `universal-header.js`: Loads header partial; controls theme toggle, global search, chip visibility, and search behavior.
  - Search results include a tiny logo at left (favicon via Google S2) with letter fallback. Classes: `.search-result-left`, `.search-result-logo-wrap`, `.search-result-logo`, `.search-result-logo-fallback`.
  - `universal-sidebar.js`: Self-hydrates markup into `#universal-sidebar-container`, renders context-aware top section, manages recents, filters mini-button, and collapse behavior (delegated handler). Mobile drawer close handled universally.
- `company-boot.js`: Thin bootstrap for the company page; wires view initializers (e.g., score card tabs/sticky offsets) and delegates lifecycle to `js/controllers/company.js`. Adds lazy-load boundaries (Detailed Financials tables and deferred chart draws) with safe proxies/skeletons.

## js/views/
- `score-cards.js`: Score card reveal panel behavior; sticky offsets; details rendering handoff.
- `analysis.js`: Company analysis panel content and interactions.
- `tables.js`: Detailed financial data tables (income/balance/cash flow; TTM and historical).

## js/visualizations/
- `score-visualization-engine.js`: Orchestrates quality/IDQ/anti-fragile visualizations; responsive handling.
- `quality-orbital.js`: Quality score visualization module; exposes update/handleResize.
- `idq-processor.js`: IDQ score visualization module; exposes update/handleResize.
- `antifragile-shield.js`: Anti-Fragile visualization module; exposes update/handleResize.
- `mini-visuals.js`: Tiny inline SVG helpers for list/grid previews (`window.MiniVisuals.{quality,idq,af}`)

## Page Controllers
- `js/controllers/company.js`: Centralizes company page lifecycle (theme/resize/orientation); coordinates compact hero refresh.
- `js/controllers/index.js`: Hooks for theme/lifecycle on index; keeps entry points slim.

## assets/favicons/
- Web app manifest, pinned tab, icons set for platforms. Ensure `site.webmanifest` uses AI-Analyst name/short_name and desired theme/background.

## documentation/
- `TODO-RESTRUCTURE.md`: Working checklist and checkpoints for the refactor.
- `file-structure.md`: This document; keep updated as files move/change. Treat as the structural library.
- `AGENT_HANDOFF.md`: At-a-glance brief for the next agent (how to run, architecture summary, next steps).
- `docs/`:
  - `index.md`: Index page developer guide (behaviors, structures, change log).
  - `universal-components.md`: Universals architecture note and contracts.
  - `company.md`: Company page developer guide (structure, lifecycle, planned modularization/lazy‑load).
- `archive/`: Legacy docs retained for history (e.g., `CONSOLIDATED_PROJECT_STATUS.md`, `PHASE_0_COMPLETION_STATUS.md`, `NEXT_AGENT_HANDOFF.md`, `universal-cleanup.md`, and `readme-index.md`).

## Documentation Taxonomy (authoritative)
- Product spec: `blueprint.md` (stable vision/requirements)
- Living guide: `README.md` (current truth + links)
- Structural map: `documentation/file-structure.md` (authoritative layout, ownership, planned changes)
- Active plan: `documentation/TODO-RESTRUCTURE.md` (workstreams + checkpoints)
- Handoff: `documentation/AGENT_HANDOFF.md` (quick start + next steps)
- Page docs: `documentation/docs/*` (index/universals specifics)

## Known Integration Points
- Theme: Components and canvases should listen to `themeChanged` and re-read CSS tokens from `document.body`.
- Context: Universals must rely on `body[data-page-context]` (e.g., `index`, `company-card`). No path-based fallbacks.
- Navigation: All routes (header search results, sidebar recents, list/grid/table rows) should go through NavigationService (planned).
  - Implemented for header search and sidebar recents; anchor links in index grid intentionally link to the company page.
  
## Planned Changes (Next Phase)
- Company page modularization
  - JS: move remaining logic from `js/company-card-complete-fix.js` into `js/views/score-cards.js`, `js/views/analysis.js`, `js/views/tables.js`; thin company bootstrap now lives at `js/company-boot.js` and wires services/controllers/visualizations.
  - Lazy-load: dynamically import heavy modules (charts and historical tables) on first interaction/visibility. Initial boundary in place for Detailed Financials (loads `js/views/tables.js` on first visibility with skeleton), and earnings/mini charts draw only when visible, all wired via `js/company-boot.js`.
  - Note: Chart.js is not used (earnings chart uses Canvas 2D), so it is not loaded to reduce payload.
  - CSS: extract shared primitives (badges/pills, mini bars, universal sidebar shell, bottom nav, container-centered) to `css/components.css`; keep page-specific polish in `css/company-card-fixed.css`.
- Ownership
  - Universals: `components/*`, `js/universal-*`, `css/components.css` (shared)
  - Company: `company-card-fixed.html`, `js/controllers/company.js`, `js/views/*`, `css/company-card-fixed.css`
  - Index: `index.html`, `js/index-page.js`, `css/index.css`
## Index Page Structure (key classes)
- Grid cards rendered by `js/index-page.js`:
  - `.card-header` → left: logo, right: `.card-header-text`
    - `.card-name` (top full row; truncated)
    - `.card-tkr` (second row aligned to logo)
  - `.tier-row` → overall score + colored tier label (above bottom rows)
  - `.mini-stats` → Q/IDQ/AF compact stats
  - `.mini-bars` → slim progress bars for Q/IDQ/AF
  - `.fav-btn` → pinned top-right; SVG star; aria-pressed and data-tooltip

## Company Page Structure (compact hero)
- `#compact-hero` (sticky summary under universal header):
  - `.ch-left` → logo • `#ch-ticker` • `#ch-name`
  - `.ch-right` → `#ch-price` `#ch-currency` • `#ch-overall` • `#ch-tier`
  - Appears when main `.hero-header` scrolls out (IntersectionObserver)
  - Shifts with sidebar/drawer states via `body.sidebar-expanded` and `body.sidebar-drawer-open`

## Update Log
- 2025-09-05 — H3: Moved shared layout into `components.css` (container-centered, app layout, universal sidebar shell, mobile bottom nav, mobile nav trigger). Pages no longer need `company-card-fixed.css` for these primitives.
- 2025-09-05 — H3: Extracted shared pills/badges into `components.css` (`.tier-badge-mini`, `.ch-tier-badge`, `.tier-badge-compact`), removed duplicates from page CSS.
- 2025-09-05 — H1: Score Cards view extracted to `js/views/score-cards.js` and thin page bootstrap added at `js/company-boot.js` (wires tabs/sticky offsets). No functional changes; contracts preserved.
- 2025-09-05 — Header search includes tiny logos; search index adds `websiteHost`. Added `.sr-only` utility. Index list: mini tier badge tooltip; sidebar favorites-only indicator. Added `js/visualizations/mini-visuals.js`.
- 2025-09-03 — Initial skeleton created; to be expanded during restructuring.
