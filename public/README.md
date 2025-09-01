# Premium Financial Analysis Platform — Project Guide (Living)

This is the single, living guide for the codebase. It consolidates the operational content previously spread across CONSOLIDATED_PROJECT_STATUS.md, PHASE_0_COMPLETION_STATUS.md, and NEXT_AGENT_HANDOFF.md. The product specification (vision, design requirements, models) remains in blueprint.md.

Use this file as your starting point. Refer to blueprint.md when you need the deeper, stable spec.

## Project Overview

An institutional‑grade web app for evaluating companies using a Score Trinity:
- Enterprise Quality (0–109)
- Innovation & Disruption (IDQ) (−3 to 12)
- Anti‑Fragile (−7 to 17)

These combine into an overall assessment tier and inform the analysis views. The current working page is company‑card‑fixed.html, which presents a hero header, the score cards, the analysis, and financial data.

Primary goals:
- Preserve all working functionality and data integrity
- Centralize theming and core utilities for reuse across pages
- Evolve to responsive, componentized pages (index, comparison, portfolio)

## Quick Start

- Run server: `cd public && python3 -m http.server 8000`
- Test URL: `http://localhost:8000/company-card-fixed.html?ticker=NVDA`
- Breakpoints to watch: 375px (mobile), 768px (tablet), 1024px (desktop), 1920px (wide)
- Theme toggle: universal header moon/sun button (ThemeService)
- Mobile Search: tap bottom Search; a header search input appears below the header (readable, solid background). Suggestions are tap‑navigable.

## Current Status (Truth Today)

What works (100%)
- Data loads from Firestore; Score Trinity calculations render
- Theme system centralized (ThemeService + CSS tokens); charts/canvas redraw on theme change
- Universal tooltip (single DOM node, theme-aware); legacy pseudo‑tooltips disabled
- Section surfaces (.section‑surface) applied to major sections (subtle ambient visuals, tuned for both themes)
- Header search (desktop + mobile reveal): suggestions styled and tap/click navigable
- Sidebar search: suggestions work; clicking updates the current page; consistent dropdown behavior (active/hidden)
- Bottom mobile nav: Home navigates to index, Search triggers header search reveal, Favorites is a placeholder, Menu opens the sidebar
- Company Analysis (desktop): Bullish/Bearish traits show inline “text pull”; (i) icons hidden on desktop and shown on mobile
- Score Composition: uses universal tooltip for segment details and label; center text uses theme tokens
- Tier badge: tier name shows universal tooltip with tier ranges and formula (old popup disabled)
- Score Cards: main score numerals now use theme text color (light on dark, dark on light) instead of tier color; Anti‑Fragile shield background is neutral per theme (no gray block in light theme); IDQ/Quality visuals still use tier colors for strokes/gradients
- Performance Trends: chart fills container, redraws on resize, visible on mobile
- Health Indicators: Working Capital displays bn/tn/m units (with currency)
- Detailed Financials: shares outstanding pulls from multiple possible keys (weightedAverageShares / Outstanding / Diluted)
- IDQ tiers (raw‑score mapping): 11–12 Pioneer (purple), 9–10 Leader (blue), 6–8 Integrator (green), 3–5 Follower (yellow), ≤2 Lagging (orange). The IDQ chip, IDQ label pill, and indicator dot all use the same mapping; indicator position uses normalized percent for layout only.
- Key Financial Metrics: tooltips added for Revenue, Net Income, EPS, Gross/Operating/Net margins, P/E, P/B, EV/EBITDA, Current Ratio, Debt/Equity, ROE, ROA, Revenue/EPS growth. Grid values formatted with tn/bn/m/k.
- Detailed Financial Data tables: tooltips added to common rows across Income/Profit/Balance/Cash Flow (Revenue, Net Income, EPS, Net/EBITDA margin, Operating/Investing/Financing CF, CapEx, FCF, Dividends, Repurchases, Debt Repayment, etc.).
- Header search uses `DataService.searchStocks()` (single Firestore init + 5‑min cached index) rather than initializing Firebase in components.
- index.html placeholder now loads (fixed resource paths to `/main.js` and `/main.css`).

Known issues / gaps
- Mobile responsiveness: layout still desktop‑first in places (score card stacking, tables, hero compact mode)
- Sidebar drawer on mobile: needs a visible close control and refined drawer width/behavior
- Favorites page is not built (placeholder toast)
- Universal sidebar (context‑aware top content) not implemented yet
- Mobile tooltips: tap-to-pin supported; visual affordance added (dotted underline/icon), but we may want a richer bottom-sheet for long content
- Financial metrics mapping: EV/EBITDA and some ratios vary by source; we added fallbacks (enterpriseValueOverEBITDA, computed margins), but confirm field names across collections

Critical warnings
- Many numeric values are strings; always `parseFloat()` when needed
- Field name inconsistency across collections (camelCase/snake_case/Mixed)
- Chart data ordering: reverse/normalize where required (oldest → newest)

## Code Map (Where to Look First)

- `css/theme.css` — Shared theme tokens (dark + light), universal helpers, universal tooltip styles, `.section-surface`
- `css/company-card-fixed.css` — Page‑specific layout and component styling for the working page
- `components/universal-header.html` — Header markup + header‑scoped styles
- `js/universal-header.js` — Header logic (theme toggle via ThemeService, global search)
- `js/services/ThemeService.js` — Centralized theme (apply/persist/emit `themeChanged`)
- `js/services/DataService.js` — Firestore init + cached search index + recent companies
- `js/tooltip.js` — Universal tooltip (single element appended to `body`, [data-tooltip] triggers)
- `js/company-card-complete-fix.js` — Main page logic (data fetch, charts, analysis, sidebar search, score “revelation panel”)
- `company-card-fixed.html` — Working page markup (scores, analysis, financials)

## Architecture Fundamentals

Theme system
- CSS variables live in `css/theme.css`; light theme overrides via `body.light-theme`
- Theme toggling through `ThemeService` (get/set/toggle + localStorage)
- Consumers listen to `window` `themeChanged` to redraw canvas (charts)
- Always read live CSS vars via `getComputedStyle(document.body)`

Universal tooltip
- Single node appended to `body`; positions and clamps to viewport edges
- Triggers: `[data-tooltip]` elements (rank badges, metric items, etc.)
- Pseudo‑element tooltips disabled globally to avoid clipping/stacking problems

Section surfaces
- `.section-surface` applies a subtle, theme‑aware glass background with ambient gradients
- Motion respects `prefers-reduced-motion`; tuned differently for dark vs light themes

Universal components (plan)
- Universal header (done)
- Universal sidebar (next): one component with a page‑specific top area; always includes “Recent Companies” at bottom
- Mobile bottom nav (present but basic): hook up favorites when page exists; refine active state

Services (plan)
- `DataService` — single Firestore init; search; recent companies; caching (implemented)
- `NavigationService` — page navigation with query params and history
- `StateService` — lightweight pub/sub for cross‑component state

## Design Quick Reference (Summaries + Links)

- Score Trinity visuals (see blueprint.md §4.1, §4.4):
  - Quality: conic gauge with readable min/max; subtle glow at higher tiers; legible center text.
  - IDQ: chip ring with animated dots; gradient position bar; tier label visible; summary not truncated.
  - Anti‑Fragile: shield with tiered strength classes; subtle force‑field/glow at higher tiers.
- Glass & section surfaces (see blueprint.md §4.1, §4.3):
  - Use `.section-surface` for top‑level sections; whisper‑level ambient mesh; respect reduced motion; lower blur on mobile.
- Responsive strategy (see blueprint.md §4.2):
  - Cards: 1‑col mobile; 2‑col tablet; 3‑col desktop.
  - Tables: card view (mobile); condensed (tablet); full (desktop).
  - Hero: simplified on mobile; mini chart desktop‑only.
- Universal sidebar behavior (see blueprint.md §3.3, §7.1):
  - Context‑aware top content per page; always “Recent Companies” at bottom.

## Must‑Preserve Visuals & Interactions

- ThemeService is the only way to toggle theme; charts/canvas redraw on `themeChanged`.
- Universal tooltip only (js/tooltip.js); no CSS `::after` tooltips.
- Section surfaces use `.section-surface`; keep effects subtle and performance‑aware.
- Score visuals: Quality min/max readable; IDQ tier label visible; Anti‑Fragile shield classes applied.
- Header and sidebar search: dropdowns show via `active` class; desktop links navigate; sidebar clicks update inline.
- Bottom Search (mobile): reveals header search input and keeps suggestions tappable.

## Data Model Snapshot

See `public/FireStore-TSM JSON example.json` for a complete, real structure. Minimal snapshot:

```
stocks (collection)
└── [document_id]
    ├── Portfolio { ticker, companyName, qualityScore, antiFragileScore, stockPriceNow, ... }
    ├── Scores { qualityScore, growthIdqScore, antiFragileScore }
    ├── API_Financials { General, TTM, Y[1-4], Estimates, ... }
    ├── LLM_Reports { IDQ_Report, Trend_Analysis, ... }
    └── Anti_Fragile_Score { totalScore, ... }
```

Notes:
- Many numeric values are stored as strings; `parseFloat()` them
- Field names vary by casing; guard against missing subtrees

## Next Steps (Prioritized)

Phase 1 — Universal Components & Shared Styles
- [ ] Universal Sidebar skeleton (context‑aware)
  - Company page: section navigation at top; Recent Companies at bottom
  - Index page: filters at top; Recent Companies at bottom
  - See: README “Architecture Fundamentals > Universal components”, blueprint.md §3.3, §7.1
- [ ] Extract shared component styles into `css/components.css` (header, sidebar, bottom nav)
  - See: README “Code Map”
- [ ] `DataService` (single Firestore init + search + recent companies)
  - See: README “Services (plan)”

Phase 2 — Mobile Responsiveness
- [ ] Score cards: stack on mobile, 2‑col on tablet, 3‑col on desktop (blueprint.md §4.2)
- [ ] Tables: card view (mobile), condensed (tablet), full (desktop) (blueprint.md §4.2)
- [ ] Hero header: simplified on mobile; mini chart desktop‑only (blueprint.md §4.2)
- [ ] Sidebar drawer: add close control and refine width/behavior per breakpoint (README “Known issues / gaps”)

Phase 3 — Visual Polish
- [ ] Typography scale and rhythm; depth system (consistent shadows/elevations) (blueprint.md §4.x)
- [ ] Performance: reduce blur intensity on mobile; use `content-visibility` where helpful

Phase 4 — Premium Effects
- [ ] Enhance score visualizations; progressive enhancement (desktop‑first), respect reduced‑motion (blueprint.md §4.1)

## Testing & QA Checklist

Functionality
- Load with `?ticker=NVDA`; verify scores, analysis, financials
- Header search (desktop/mobile) and sidebar search suggestions; click/tap navigates
- Score card expansions (revelation panel)
- Theme toggle persists; charts/canvas redraw
- No console errors

Visual & Responsive
- Section surfaces visible and subtle in both themes
- Mobile: text readable, touch targets ≥44px, score cards stack, drawer close control (pending)
- Tablet/Desktop: grids and tables align; no overflow issues

Accessibility
- Focus states visible; contrast sufficient; tooltips readable; reduced motion respected

## Handoff Summary (For the Next Agent)

If you only read one section, read this:
- Theming is centralized (ThemeService + CSS tokens). Always read vars from `document.body`. Redraw canvas charts on `themeChanged`.
- Tooltips are universal (js/tooltip.js). Do not add CSS `::after` tooltips; they are disabled.
- Mobile tooltips: tap once to pin; tap outside to dismiss. Avoid adding `title` attributes which trigger native tooltips and conflict with the universal system.
- Section surfaces are standardized. Use `.section-surface` for premium, theme‑aware section backgrounds.
- Header search (desktop/mobile) and sidebar search are both working. Sidebar shows results that update the page inline; header navigates via links.
- Bottom nav: Home and Search wired; Favorites is a placeholder; Menu opens the sidebar (mobile close control to be implemented in Phase 2).
- IDQ color logic: use raw IDQ score for tiers — see `getIdqTierColors(idqScore)` in `js/company-card-complete-fix.js`. Do not use percent tiers for IDQ color.
- Score numerals: on `themeChanged`, reapply `--color-text-primary` to `#quality-score-value`, `#idq-score-value`, `#antifragile-score-value`.
- Anti‑Fragile sub‑scores: single column (3 metrics). Quality sub‑scores: 2‑column on desktop. This avoids awkward gaps.
- Key financials: tn/bn/m/k formatting; shares outstanding as quantities; Debt/Equity aliasing across `debtEquityRatio|debtToEquityRatio|debtToEquity`.
- Header search: `DataService` provides a 5‑min cached index and single Firestore init.

Do not break:
- `fetchAndDisplayCompanyData()`, `revealScoreDetails()`, calculation and chart flows
- Theme redraw behavior for canvas charts
- Rank badges and IDQ tier labels; metric bar color tiers

Start with:
1) Universal Sidebar skeleton (context-aware) + `DataService`
2) Extract `css/components.css` and route header/sidebar styles there
3) Add mobile sidebar close control; prepare for full responsiveness
4) Desktop polish: Company Analysis card dividers, score card stacking rules, table variants
5) Quality gauge: add subtle tick marks and refine arc thickness; keep perf in mind
6) Expand table tooltips across any remaining rows; keep copy concise (“What it is / Why it matters”)
7) Field alias map: centralize and extend for ratios (P/E, EV/EBITDA, margins) and per‑ticker differences
5) Expand tooltips coverage across Key Financial Metrics and Detailed Financial Data

## Change Log (Reverse Chronological)

- 2025‑09‑01: Universal sidebar is now default; legacy sidebar removed. Desktop collapse (icon‑only) added with mid‑edge handle; collapsed state centers the clock and recent logos, and shows only sun/moon icon for theme. Top item shows [tiny logo] TICKER aligned with other icons. Files: company-card-fixed.html, js/company-card-complete-fix.js, components/universal-sidebar.html, js/universal-sidebar.js, css/components.css
- 2025‑09‑01: Universal sidebar (flag `useNewSidebar=1`) — added scrollspy with animated indicator, renamed links (Top/Ticker, Score Trinity, Analysis, Key Metrics → `#health-scores`, Raw Financials), anchored Recent Companies + Theme at bottom, added mobile close handle; files: components/universal-sidebar.html, js/universal-sidebar.js, css/components.css
- 2025‑09‑01: Sidebar search aligned with header (dropdown `active`/`hidden`); removed duplicate handler; header results restyled; mobile header search delay on blur so taps work; sidebar search positioned below header via padding; files: js/company-card-complete-fix.js, components/universal-header.html, css/company-card-fixed.css, js/universal-header.js
- 2025‑09‑01: Section surfaces refined (ambient mesh; dark theme strengthened); applied to Scores, Analysis, Health Indicators, Performance Trends, Key Metrics, Detailed Financials; files: css/theme.css, company-card-fixed.html
- 2025‑09‑01: Centralized ThemeService; charts read CSS vars from `document.body`; unified toggles; files: js/services/ThemeService.js, js/universal-header.js, js/company-card-complete-fix.js
- 2025‑09‑01: Universal tooltip implemented across `[data-tooltip]`; disabled pseudo-tooltips; files: js/tooltip.js, css/theme.css, css/company-card-fixed.css
- 2025‑09‑01: Investment Synthesis moved inside Company Analysis (same section surface); files: js/company-card-complete-fix.js, company-card-fixed.html
- 2025‑09‑01: Mobile search reveal (header) added; readable non‑glass styling; files: components/universal-header.html, js/company-card-complete-fix.js
- 2025‑08‑30: Score cards ranking badges (#X of N), IDQ tier labels, metric bar tier colors; theme polish; session 5 fixes; files: js/company-card-complete-fix.js, css/company-card-fixed.css
- 2024‑11‑30: Light theme fixes; dynamic score colors; tab/button contrast; metric bar gradients; logo fallback/caching improvements; files: css/company-card-fixed.css, js/company-card-complete-fix.js

## Links

- Spec: `blueprint.md`
- Data example: `public/FireStore-TSM JSON example.json`
- 2025‑09‑01: Tooltip system hardened; removed native `title` fallbacks to prevent double-tooltips; mobile tap-to-pin added; dotted underline indicator on mobile. Score Composition now uses universal tooltip (segments and label), center text reads theme tokens. Tier name uses universal tooltip; legacy tier popup disabled. Traits show inline text on desktop and tooltip-only on mobile. Fixed duplicate universal sidebar container. Files: js/tooltip.js, js/company-card-complete-fix.js, css/theme.css, css/company-card-fixed.css, company-card-fixed.html
- 2025‑09‑01: DataService refactor: single Firestore init + cached search index (5‑min TTL). universal‑header now uses DataService for search. Expanded financial tooltips in metrics grid and detailed tables. Unit formatting for Market Cap, Revenue, Working Capital; shares outstanding displayed as quantities. Theme change updates score numerals live. Files: js/services/DataService.js, js/universal-header.js, js/company-card-complete-fix.js, README.md
- 2025‑09‑01: IDQ chip/label corrected to raw‑score tier mapping; IDQ label restyled as readable pill (tier dot); added grade caption under chip. Removed score toolbar (kept keyboard toggles). Quality sub‑scores: 2‑column desktop; Anti‑Fragile sub‑scores: single column. Expanded tooltips across Key Financial Metrics and Detailed Financial Data. Debt/Equity aliasing fixed. index.html now loads. Files: company-card-fixed.html, css/company-card-fixed.css, js/company-card-complete-fix.js, js/services/DataService.js, js/universal-header.js
