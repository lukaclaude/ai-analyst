# Index Page — Developer Guide

This document consolidates the current notes for the index (explore) page and reflects the latest structure and behavior.

## Purpose
Premium, performant landing page for exploring companies using the Score Trinity. Shares universals (header/sidebar/theme/tooltip) and keeps page logic in `js/index-page.js`.

## Views
- List (default): name/ticker, Score Trinity focus, compact visuals.
- Grid: preview cards with hover sparkline, tier row, favorites star.
- Table: sortable with extended metrics; header sticks; alias helpers used.

## Key Behaviors
- Sorting: chips (desktop) + mobile select; double-press toggles direction; arrows reflect state.
- Filters (sidebar): sector/industry, market cap, score ranges; persisted preferences.
- Search: sidebar inline filters; universal header search navigates to company page.
- Favorites: star toggles in List/Grid; favorites-only filter persists.
- CSV export: exports the current filtered dataset.

## Data & Calculations
- Overall = 40% Quality + 35% IDQ + 25% Anti‑Fragile; inputs normalized per blueprint.
- Tiers: color mapping by percentile; IDQ tier mapping via `Tiers.getIdqTierColors` (where needed).
- Last Updated: sort by `LLM_Reports.IDQ_Report.lastUpdated`; display first line of `Summaries_Group.lastUpdate`.

## Structure
- File: `js/index-page.js`
  - State: all, filtered, view, sort, pagination, filters, favorites.
  - Renderers: grid/list/table; helpers for SVG mini visuals; hover sparklines; CSV export.
  - Events: view toggles, pagination, sort chips/select, filters apply/reset, favorites-only.
- Markup (generated per view):
  - Grid `.card-header` (logo + `.card-header-text` → `.card-name` (top) + `.card-tkr` (second))
  - `.tier-row` (Overall + colored tier label)
  - `.mini-stats` + `.mini-bars`
  - `.fav-btn` (SVG star, aria-pressed/data-tooltip)

## Styling
- `css/index.css` carries page-specific polish. Shared primitives live in `css/components.css`.
- Grid hover sparkline uses canvas overlay below header/star (z-index layered).

## Accessibility
- aria-pressed on sort chips (active), favorites-only, and favorites star.
- Focus rings for interactive elements; universal tooltip for `[data-tooltip]`.
 - Live announcements: dataset meta and page info use `aria-live="polite"`.

## Next Enhancements
- Optional virtualization for large datasets; debounce filters/search.
- Minor polish: subtle hover motion on star; unify pill placement across views.
 - Grid view purpose: reevaluate role vs list/table; redesign to deliver unique value.


---

# Appendix — Consolidated Notes (from readme-index.md)

Overview
- Purpose: A premium, performant landing page for exploring companies using the Score Trinity, true to blueprint.md and reusing universal services.
- Tech: Universal header/sidebar + ThemeService + DataService (single Firestore init). Index-specific logic in js/index-page.js; styles in css/index.css.
- Views: List (default), Grid (cards w/ hover sparkline), Table (data-rich, fully sortable).

What’s new (since the legacy index)
- List view emphasizes Score Trinity and Overall; compact SVG mini visuals; hover summary via universal tooltip.
- Sorting: quick sort chips (desktop), mobile select mirrors chips.
- Grid: premium preview cards with hover sparkline; favorite star.
- Table: sortable, sticky header; alias helpers for ratios.

Filters & Search
- Sidebar filters for sector/industry, market cap, and score ranges.
- Header search navigates to company page; sidebar search filters inline.

Sidebar UX
- Page context enforced by body[data-page-context="index"].
- Collapsed (desktop): shows a compact filters button; recents navigate to company page.

Quality-of-life
- Favorites: star in List/Grid; persisted. Favorites-only toggle filters dataset.
- CSV export of current filtered dataset; preferences persisted (filters, sort, view, per-page, favorites-only).
- "/" focuses search (header or sidebar).

Data & calculations
- Overall = 40% Q + 35% IDQ + 25% AF (normalized inputs).
- Color tiers: percent-based for Quality/AF; raw-score tiers for IDQ.
- Last Updated: sort by IDQ_Report.lastUpdated; display first line of Summaries_Group.lastUpdate.

Design notes
- Uses theme tokens, section surfaces; index polish lives in css/index.css.
- Grid sparklines respect theme; mobile behavior restrained and performant.

Known limitations / ideas
- Consider virtualization; expand list/grid polish; optional secondary pill placement.

Implementation map
- index.html → toggles, sort chips, mobile controls, pagination; loads aliases.
- js/index-page.js → data, filters, sorting, pagination, CSV, favorites, hover summaries, persistence.
- css/index.css → index-specific styles (grid/list/table; filters; sort chips).
- js/universal-sidebar.js → context-aware top content; collapsed filters mini-button; recents navigation.
- js/universal-header.js → chip disabled for index via page-context; search focus helper.

Change Log (selected)
- 2025‑09‑03: Mobile list two‑row layout; sort chips hidden on mobile; favorites-only toggle; corrected Last Updated; search focus helper added.
 - 2025‑09‑05: Header search shows tiny logos; list rows gain mini tier badge with ranges tooltip; sidebar shows "Favorites only" indicator; a11y live-region and sort-chip SR labels added; mini visuals sourced from helpers.
