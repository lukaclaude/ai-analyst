# Repository File Structure & Responsibilities

Purpose: Provide a clear, up-to-date map of files and their roles to help future contributors quickly understand and extend the app. Keep this updated as restructuring progresses.

## Top-Level
- `README.md`: Living guide (current status, architecture, QA). Entry point for developers.
- `blueprint.md`: Stable product/experience/visual blueprint and long-term plan.
- `readme-index.md`: Index page notes (to be merged into README/docs).
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
- `components.css`: Shared component styles (header/sidebar/bottom-nav/minimal primitives).
- `index.css`: Index page scoped styles (grid/list/table, filters, sort chips, sparklines).
- `company-card-fixed.css`: Company page scoped styles (hero, score cards, analysis, tables).
  - Styles for `#compact-hero` sticky bar (layout, theme, responsive behavior).

## js/services/
- `ThemeService.js`: Theme source of truth (light/dark). Applies body class, persists to localStorage, emits `themeChanged`.
- `DataService.js`: Firestore init, search index builder, recent companies (localStorage + pub/sub).
- `NavigationService.js`: Navigation entry points (goToCompany/goHome/open). Replaces per-page routing progressively.

## js/lib/
- `aliases.js`: Central alias lookups for key ratios and computed helpers (TTM & YoY).
- `formatters.js`: Currency/quantity/market cap formatting; consistent across pages.
- `tiers.js`: Tier/color mappings for scores and labels.

## js/ (universals + entry)
- `tooltip.js`: Single DOM-node, theme-aware tooltip for `[data-tooltip]`; keyboard and mobile tap-to-pin support.
- `universal-header.js`: Loads header partial; controls theme toggle, global search, chip visibility, and search behavior.
- `universal-sidebar.js`: Renders context-aware top section; manages recents, filters mini-button, and collapse behavior.

## js/views/
- `score-cards.js`: Score card reveal panel behavior; sticky offsets; details rendering handoff.
- `analysis.js`: Company analysis panel content and interactions.
- `tables.js`: Detailed financial data tables (income/balance/cash flow; TTM and historical).

## js/visualizations/
- `score-visualization-engine.js`: Orchestrates quality/IDQ/anti-fragile visualizations; responsive handling.
- `quality-orbital.js`: Quality score visualization module; exposes update/handleResize.
- `idq-processor.js`: IDQ score visualization module; exposes update/handleResize.
- `antifragile-shield.js`: Anti-Fragile visualization module; exposes update/handleResize.

## Page Controllers (planned)
- `js/controllers/company.js`: Centralizes company page lifecycle (theme/resize/orientation); coordinates compact hero refresh.
- `js/controllers/index.js`: Future hooks for theme/lifecycle on index; keeps entry points slim.

## assets/favicons/
- Web app manifest, pinned tab, icons set for platforms. Ensure `site.webmanifest` uses Finalysis name/short_name and desired theme/background.

## documentation/
- `TODO-RESTRUCTURE.md`: Working checklist and checkpoints for the refactor.
- `file-structure.md`: This document; keep updated as files move/change.
- `universal-cleanup.md`: Past notes on universal components cleanup (to be folded into Architecture docs).

## Known Integration Points
- Theme: Components and canvases should listen to `themeChanged` and re-read CSS tokens from `document.body`.
- Context: Universals must rely on `body[data-page-context]` (e.g., `index`, `company-card`).
- Navigation: All routes (header search results, sidebar recents, list/grid/table rows) should go through NavigationService (planned).
  - Implemented for header search and sidebar recents; anchor links in index grid intentionally link to the company page.

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
- 2025-09-03 — Initial skeleton created; to be expanded during restructuring.
