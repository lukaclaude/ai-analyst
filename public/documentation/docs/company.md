# Company Page — Developer Guide

Purpose
- Provide a premium, data‑rich company analysis experience that showcases the Score Trinity (Quality, IDQ, Anti‑Fragile), analysis, key metrics, trends, and detailed financials.
- Share universals (header/sidebar/theme/tooltip) and keep page logic modular via controllers, views, and visualization modules.

Key Behaviors
- Compact Hero: sticky bar appears below the header when the main hero scrolls out; shows logo • TICKER • name | price • overall • tier badge (tooltip with ranges/formula).
- Score Cards: reveal panel (sticky tabs + chips), keyboard (Enter/Esc), lazy content render to avoid layout shift.
- Tooltips: universal tooltip for all `[data-tooltip]`; no native titles. Tap‑to‑pin on mobile; clamped to viewport.
- Theme/Resize/Orientation: score numerals and charts redraw; visuals read CSS tokens from `document.body`.

Architecture
- Page: `company-card-fixed.html` (uses `body#company[data-page-context="company-card"]`).
- Controller: `js/controllers/company.js` (handles theme/resize/orientation updates, compact hero refresh, charts redraw coordination).
- Legacy monolith (to be decomposed): `js/company-card-complete-fix.js`.
- Views (modular targets): `js/views/score-cards.js`, `js/views/analysis.js`, `js/views/tables.js`.
- Visualizations: `js/visualizations/*` (quality-orbital, idq-processor, antifragile-shield, plus engine).
- Styles: `css/company-card-fixed.css` (scoped to company page where helpful); shared primitives in `css/components.css`.
- Universals: `components/universal-header.html` + `js/universal-header.js`; `components/universal-sidebar.html` + `js/universal-sidebar.js`.

Lifecycle
- Theme: listen to `window` `themeChanged`; redraw charts/score numerals and refresh compact hero.
- Resize/Orientation: redraw compact hero and charts via controller; use `IntersectionObserver` for compact hero visibility.
- Page context: universals rely on `body[data-page-context]="company-card"` (no URL/path heuristics).

Planned Changes (Phase H)
- H1 — Views moved: extract remaining logic from `js/company-card-complete-fix.js` into `js/views/*`; add thin company bootstrap to wire services/controllers/visualizations.
- H2 — Lazy‑load: dynamically import heavy modules (charts and historical tables) on first interaction/visibility; provide lightweight loaders.
- H3 — CSS: extract shared primitives (badges/pills, mini bars) into `css/components.css`; prune duplicates; scope under `#company` where helpful.
- H4 — Prune & measure: remove dead selectors/helpers; record before/after sizes (see TODO‑RESTRUCTURE for targets) and add a Change Log entry.
- H5 — Docs: update `documentation/file-structure.md`, `documentation/AGENT_HANDOFF.md`, and README Change Log when H‑checkpoints complete.

Accessibility
- Keyboard: Enter toggles reveal; Esc closes pinned tooltip and closes details panel.
- Focus: visible focus styles; `[data-tooltip]` supports keyboard and mobile tap‑to‑pin.
- Reduced Motion: respect `prefers-reduced-motion`; avoid heavy transitions; disable animated shimmers as needed.

QA Checklist (company)
- Compact hero: appears/disappears with hysteresis; content stays readable with sidebar states; sticky stack doesn’t overlap.
- Score cards: tab/chip sticky offsets correct on scroll/theme/orientation; no layout shift on reveal; keyboard support.
- Charts: redraw on theme and orientation changes; read CSS tokens from `document.body`.
- Tooltips: universal only; no native titles; mobile tap‑to‑pin works.
- Data presentation: Aliases and Formatters consistent; Working Capital uses statement currency.

Change Log (selected)
- 2025‑09‑02: Compact hero added; header chip deprecated; mobile sticky/layout fixes; density pass.
- 2025‑09‑01: Universal tooltip hardened; ThemeService centralized; expanded financial tooltips and aliasing.

