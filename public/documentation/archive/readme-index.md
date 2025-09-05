Archived: 2025-09-05 — See documentation/docs/index.md

Index Page — Notes & Changes (Current)

Note: This content has been consolidated into documentation/docs/index.md (with an appendix). Please refer there for the up‑to‑date developer guide.

Overview
- Purpose: A premium, performant landing page for exploring companies using the Score Trinity, true to blueprint.md and reusing universal services.
- Tech: Universal header/sidebar + ThemeService + DataService (single Firestore init). Index-specific logic in js/index-page.js; styles in css/index.css.
- Views: List (default), Grid (cards w/ hover sparkline), Table (data-rich, fully sortable).

What’s new (since the legacy index)
- List view (default; leftmost in the toggle)
  - Focused content: Score Trinity only + Overall. No ratios; rows stay fast to scan.
  - Mini visuals: compact SVGs for Q (radial arc), IDQ (chip ring, raw-score color via Tiers.getIdqTierColors), AF (shield outline). Overall label color matches 6-tier mapping (purple→red).
  - Right meta group: Price • Market cap • Updated • Favorite star.
  - Hover summary (universal tooltip): “Overall | Q | IDQ | AF”. Plain text tooltips to ensure consistency.

- Sorting
  - Quick sort chips (Updated • Overall • Quality • IDQ • AF • Mkt Cap • Price).
  - Double-press toggles direction; active chip shows an arrow (↑ asc / ↓ desc).
  - Mobile sort dropdown mirrors/updates chip state.

- Grid view
  - Premium preview-card with hover sparkline (canvas 2D; graceful fallback), tier bars, favorite star (top-right).

- Table view
  - Fully sortable, sticky header; includes P/E, EV/EBITDA, Op/Net margins, Revenue/EPS growth, Price, Updated.
  - Uses alias helpers on TTM for ratios: Aliases.getAliasedRatio(ttm, group). Percent fields are normalized for rendering.

- Filters & Search (sidebar top)
  - Sector and Industry (Industry options auto-narrow by Sector).
  - Market Cap buckets: micro/small/mid/large/mega.
  - Score ranges: Overall (0–100), Quality (0–109), IDQ (−3–12), AF (−7–17).
  - Search field filters inline; the header search navigates to company page.

- Sidebar UX
  - Page-context enforced by body[data-page-context="index"].
  - Collapsed (desktop): filters hidden; compact “Filters” button appears to expand the sidebar.
  - Recent Companies click (index): navigates to /company-card-fixed.html?ticker=… (company page).

- Quality-of-life
  - Favorites: star in List/Grid; persisted. “⭐ Favorites” toggle filters the dataset.
  - CSV export of the current filtered set.
  - Preferences persisted: filters, sort (key+dir), view, per-page, favorites-only.
  - “/” focuses search (header or sidebar) for quick access.

Data & Calculations
- Overall score = 40% Quality + 35% IDQ + 25% Anti‑Fragile; input ranges normalized per blueprint.
- Color rules
  - Quality & AF: 6-tier mapping by percentile (≥80 purple, ≥74 blue, ≥65 green, ≥55 yellow, ≥32 orange, else red).
  - IDQ: use raw-score tiers via Tiers.getIdqTierColors (Pioneer/Leader/Integrator/Follower/Lagging).
- Last Updated date
  - Sorts by `LLM_Reports.IDQ_Report.lastUpdated` (ISO‑like) for consistency.
  - Displays the first line of `LLM_Research_and_Comments.Summaries_Group.lastUpdate` (up to any “ - …” suffix) when available; falls back to Portfolio/General.
- Table metrics (via aliases)
  - P/E: pe alias group; EV/EBITDA: evEbitda; margins: netMargin/operatingMargin (computeOperatingMargin as fallback); growth: computeRevenueGrowth/computeEpsGrowth.

Design notes
- Uses theme tokens (css/theme.css), section surfaces for premium feel. Index-specific styles are isolated in css/index.css.
- List rows emphasize Q/IDQ/AF + Overall, keeping to the blueprint’s information hierarchy.
- Grid sparklines redraw with theme; mobile behavior is restrained and performant.

Universal components — observations & to address
- Header: Company chip
  - Now disabled on index via data-page-context. Long-term: gate rendering via a component slot or a page-context check to avoid header-runtime heuristics.
- Sidebar: Context detection
  - Uses body[data-page-context] only. Remove any residual path heuristics if encountered.
- Sidebar (collapsed desktop)
  - Filter UI hides and a compact “Filters” button appears. Consider a richer collapsed state (icons + counts) later.
- Navigation consistency
  - Recent Companies in the universal sidebar routes via NavigationService. Ensure any remaining per-page click handlers are centralized through it.
- CSS scope
  - Maintain page-scoped styles for index (css/index.css) to avoid collisions with company page.

Known limitations / next ideas
- Mini visuals currently use compact inline SVGs; swap for tiny versions sourced from visualization modules for perfect parity.
- Add a small tier badge with a tooltip showing tier ranges on list rows.
- “Favorites only” indicator in the sidebar could mirror the top control for discoverability (optional).
- Consider virtualized list if dataset grows, and debounce filter inputs.

Implementation map (files)
- index.html — page context, view toggles, sort chips (with arrows), favorites toggle, mobile sort, pagination. Loads aliases.js for ratios.
- js/index-page.js — all index logic: data load, filters/search, sorting (including arrows), pagination, CSV, favorites, hover summaries, and persistence.
- css/index.css — index-specific styles (grid/list/table; filters; sort chips).
- js/universal-sidebar.js — context-aware top content; collapsed filters mini-button; context-aware recents navigation.
- js/universal-header.js — chip hidden on index via page-context.
- documentation/universal-cleanup.md — outstanding universal component cleanups.

## Change Log

- 2025‑09‑03: Mobile List two‑row layout; sort chips hidden on mobile (dropdown controls sorting and reflects on chips); favorites‑only toggle; removed index sidebar search; “Last Update” corrected (sort by IDQ lastUpdated, display using Summaries_Group first line); mobile search focus helper added.
