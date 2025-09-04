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
- Central metric aliasing: unified fallbacks for P/E, EV/EBITDA, Operating Margin, and Debt/Equity via `js/lib/aliases.js` so values don’t show N/A when alternates exist.
- Quality gauge ticks and refined hover states (respect `prefers-reduced-motion`).
- IDQ label pill (tier dot reflects mapping); Anti‑Fragile shield neutral background fill for clarity across themes. Removed redundant static IDQ caption under chip (kept moving label above the position bar).
- “Copy Insight” action in Company Analysis copies the synthesized thesis with clipboard fallback.
- Finalysis branding and favicon/PWA setup: header brand switched to “Finalysis”; transparent favicon pack wired (ico/svg/png/apple-touch), Safari pinned-tab, MS tile, and site.webmanifest (maskable icons, theme/background colors) for proper tabs/bookmarks/PWA icons.
- Universal header + Compact hero: the header is truly universal (logo + brand, anchored search, actions). On company pages, when the main hero scrolls out of view, a sticky compact hero bar appears below the header showing logo, ticker, company name, price, overall score and tier label (with tooltip). The old header chip is deprecated. Mobile search focus is handled programmatically for Safari/Chrome: tapping the bottom Search icon reveals and focuses the header search input with an immediate attempt and short retry loop for reliability.
- Rank badges: copy reads “#Y of N • Top X%” where Top X% = round(rank/total×100) (lower is better). Fallback ranks no longer include a tilde (~).
- Sub‑score rounding: quality sub‑scores display rounded to 1 decimal to prevent float artifacts (e.g., 12.3999999 → 12.4).
- Detailed Financial Data tables: tooltips added to common rows across Income/Profit/Balance/Cash Flow (Revenue, Net Income, EPS, Net/EBITDA margin, Operating/Investing/Financing CF, CapEx, FCF, Dividends, Repurchases, Debt Repayment, etc.).
- Header search uses `DataService.searchStocks()` (single Firestore init + 5‑min cached index) rather than initializing Firebase in components.
- index.html placeholder now loads (fixed resource paths to `/main.js` and `/main.css`).

Score Cards Revamp (done)
- Visual polish: glass gradients, tier glow, stronger active states; numerals read theme text color; ranking badges clarified.
- Interactions: reveal panel with sticky top tabs + chip bars (Quality/AF); keyboard Enter/Esc; lazy render to avoid layout shift.
- Consistency: IDQ/AF detail blocks now use the same panel wrapper and rhythm as Quality.
- Accessibility: universal tooltip replaces legacy pseudo‑tooltips; better contrast for labels and meters.

Recent mobile fixes (score details panel)
- Sticky tabs/chips: content now reserves correct space; no overlap under header. Added dynamic `--tabs-offset` and moved chip spacing to content only.
- Mobile close UX: top‑level tabs do not close the panel when tapping the active tab; a dedicated “✕” button closes it (accessibility label included).
- Consistent panel layout: IDQ and Anti‑Fragile detail blocks use the same inner panel as Quality.
- Anti‑Fragile header spacing: matched to IDQ for consistent rhythm.
- Stronger active states: clearer active highlight on top tabs and Quality/AF chips.
- Gauntlet: user‑friendly labels mapped; negatives are red using theme tokens; zero/positive use normal text color.

Known issues / gaps
- Mobile responsiveness: layout still desktop‑first in places (score card stacking, tables, hero compact mode)
- Sidebar drawer on mobile: needs a visible close control and refined drawer width/behavior
- Favorites page is not built (placeholder toast)
- Universal sidebar (context‑aware top content) not implemented yet
- Mobile tooltips: tap-to-pin supported; visual affordance added (dotted underline/icon), but we may want a richer bottom-sheet for long content
- Universal header: consider additional quick actions on mobile (e.g., favorite toggle or quick nav) in later iterations.
- Financial metrics mapping: EV/EBITDA and some ratios vary by source; we added fallbacks (enterpriseValueOverEBITDA, computed margins), but confirm field names across collections
 - Score Cards (mobile) density: additional cascade still influences card height/transform. We added overrides, but a follow‑up pass should verify no later rules restore larger min‑height.
 - Tabs/Chips seam (visual): decide whether to remove one border to present as a single bar.
 - Typography consistency: align mobile h3/h4 scale and margins across Quality/IDQ/AF.
 - Hero header (mobile): final pass to tighten spacing without harming clarity.

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
- `js/lib/aliases.js` — Central metric aliasing + fallbacks
- `js/lib/formatters.js` — Currency/quantity/market cap formatting
- `js/lib/tiers.js` — IDQ tier mapping by raw score
- `js/views/score-cards.js` — Score card orchestration + details panel
- `js/views/analysis.js` — Analysis view (render)
- `js/views/tables.js` — Detailed Financials view (render)
- `company-card-fixed.html` — Working page markup (scores, analysis, financials)
- `archive/` — Non-runtime references (original single-file versions, variants, manual tests, historical docs). Nothing here is imported by the app.

## Housekeeping Plan (Safe Archival)
- Purpose: reduce top-level clutter without risking regressions.
- Create folders under `archive/`:
  - `archive/original/` — `company-card_OLD-*` and (later) old `index.html` for reference only
  - `archive/variants/` — previous `company-card-*.(html|css|js)` that are not loaded
  - `archive/manual-tests/` — `test-company.html`, `test-nvda.html`, `debug.html`
  - `archive/docs/` — `IMPLEMENTATION_FIX_SUMMARY.md`, `PROJECT_STATUS_README.md` now superseded by this README
- Nothing in `archive/` should be imported by production code.
- Timing: after current desktop polish; before componentization. We’ll move files in a single patch and verify no references remain (ripgrep checks).

### Recent Mobile Refinements (2025‑09‑03)
- Performance Trends: mobile canvas height scales with container; HiDPI backing store for sharper rendering; fewer x‑axis labels and smaller points; redraws on resize/theme.
- Key Financial Metrics: on mobile, category tiles render as a two‑column grid with compact padding/typography.
- Financial Health tooltips: labels use the universal tooltip (tap‑to‑pin), avoiding ephemeral touch tooltips.
- Universal header: brand label set to “./AI/ANALYST” (monospace); chip logo background transparent for dark theme.
- Company chip alignment (desktop): chip offset respects expanded sidebar (body.sidebar-expanded toggled by sidebar control).
- Mobile search focus: bottom Search focuses header search and places the caret via `window.focusHeaderSearch()`.

## Architecture Fundamentals
Universal header contract
- Single structure across all pages: Left (logo + brand), Middle (anchored search), Right (actions). No per‑page shifts.
- Anchored search: fixed horizontal position aligned with content (desktop). Mobile shows the search only when invoked.

Compact hero (company page)
- Sticky bar below the header; appears when the main hero scrolls away.
- Desktop: single row — logo • TICKER • Company Name | price • overall • tier badge.
- Mobile: two rows — Row 1: logo • TICKER • Company Name; Row 2: price • overall • tier badge.
- Tier badge tooltip explains tier ranges and the overall formula (40% Q, 35% IDQ, 25% AF).
- Light/dark theme aware; no stacked shadows in light mode; compact entrance animation.

Theme system
- CSS variables live in `css/theme.css`; light theme overrides via `body.light-theme`
- Theme toggling through `ThemeService` (get/set/toggle + localStorage)
- Consumers listen to `window` `themeChanged` to redraw canvas (charts)
- Always read live CSS vars via `getComputedStyle(document.body)`

Universal tooltip
- Single node appended to `body`; positions and clamps to viewport edges
- Triggers: `[data-tooltip]` elements (rank badges, metric items, etc.)
- Pseudo‑element tooltips disabled globally to avoid clipping/stacking problems
 - Policy: never use native `title` attributes for UI hints; always use `data-tooltip` so content is styled, theme-aware, clamped and accessible.

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
  - See also: documentation/docs/index.md for index page structure.
  - Universal components contract: documentation/docs/universal-components.md

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
 - [ ] Score details panel: verify tabs/chips sticky offsets on scroll/orientation/theme change; ensure active tab click does not close (✕ only)
 - [ ] Score cards (mobile) density: finalize min-height/padding/active transform and audit cascade so overrides always apply
 - [ ] Active states: confirm stronger highlight for both top tabs and Quality/AF chips across themes

Phase 3 — Visual Polish
- [ ] Typography scale and rhythm; depth system (consistent shadows/elevations) (blueprint.md §4.x)
- [ ] Performance: reduce blur intensity on mobile; use `content-visibility` where helpful
 - [ ] Tabs/Chips seam: optional visual unification (single bar) pending decision
 - [ ] Hero header (mobile): tune logo size, name/ticker/price clamp values for compactness (verify legibility)

Phase 4 — Premium Effects
- [ ] Enhance score visualizations; progressive enhancement (desktop‑first), respect reduced‑motion (blueprint.md §4.1)

## Testing & QA Checklist

Functionality
- Load with `?ticker=NVDA`; verify scores, analysis, financials
- Header search (desktop/mobile) and sidebar search suggestions; click/tap navigates
- Score card expansions (revelation panel)
- Theme toggle persists; charts/canvas redraw
- No console errors
 - Mobile close UX: active top tab does NOT close panel; ✕ closes
 - Gauntlet: negatives show red (theme token), zeros/positives use normal text color; labels use user‑friendly names

Visual & Responsive
- Section surfaces visible and subtle in both themes
- Mobile: text readable, touch targets ≥44px, score cards stack, drawer close control (pending)
- Tablet/Desktop: grids and tables align; no overflow issues
- Sticky stack (mobile): Header → Tabs → Chips → Content (no overlap); verify on scroll/orientation/theme change
- Performance Trends (mobile): chart height readable; labels/points legible; redraws on rotate/theme change
- Key Financial Metrics (mobile): category tiles in two columns; no overflow; tap targets ≥44px
- Financial Health tooltips: tap‑to‑pin works; no native title tooltips
- Header chip alignment (desktop): chip offset updates when sidebar expands/collapses

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
- Use `window.focusHeaderSearch()` to reveal + focus header search on mobile and place caret at end (reusable helper).
- Sidebar collapse/expand toggles `body.sidebar-expanded` on desktop so header can align the company chip predictably.

Do not break:
- `fetchAndDisplayCompanyData()`, `revealScoreDetails()`, calculation and chart flows
- Theme redraw behavior for canvas charts
- Rank badges and IDQ tier labels; metric bar color tiers

Start with (next steps):
1) Phase B — Modularization (in progress): split monolith into `js/views/*` and `js/lib/*`; consume `js/visualizations/*`
2) Phase C — Mobile responsiveness (stacking, condensed tables, sidebar drawer close, tooltip affordances)
3) Phase D — Index shell reuse (header/sidebar/DataService; small NavigationService; no duplicate logic)

## Roadmap (Desktop → Mobile → Index)
- Phase A — Desktop lock (done):
  - Score cards: finalize visuals (Quality ticks/stroke), confirm IDQ label pill/caption, Anti‑Fragile single‑column rhythm.
  - Company Analysis: anchors/dividers; optional chips/copy‑action; keep content.
  - Details panel: lazy load, no layout shift; keyboard Enter/Esc.
- Phase B — Componentization (in progress next):
  - Split monolith into views (`js/views/score-cards.js`, `analysis.js`, `tables.js`) and libs (`js/lib/formatters.js`, `aliases.js`, `tiers.js`).
  - Consume `js/visualizations/*` with a small, consistent interface.
- Mobile pass: stack cards, condensed tables, sidebar drawer close, tooltip affordance/tap‑to‑pin.
- Index shell: reuse header/sidebar/DataService and, where useful, score previews that call the same visualizations.

## Change Log

- 2025‑09‑03: Mobile refinements — Performance Trends canvas now scales in height with HiDPI support; reduced label density and smaller points. Key Financial Metrics render as two‑column tiles on mobile; Financial Health tooltips use the universal tooltip with tap‑to‑pin. Brand label changed to “./AI/ANALYST”; chip logo background transparent; company chip alignment respects expanded sidebar (desktop). Shared `window.focusHeaderSearch()` added to focus header search on mobile.
- 2025‑09‑02: Desktop‑first landing polish. Added Quality gauge tick marks and restrained hover glow (reduced‑motion aware). IDQ label pill + caption with tier dot; Anti‑Fragile shield neutral fill in both themes. Centralized metric aliasing (`js/lib/aliases.js`) with fallbacks for P/E, EV/EBITDA, Operating Margin, Debt/Equity; metrics grid and detailed tables use aliases to avoid N/A when alternates exist. Added “Copy Insight” action in analysis with clipboard fallback and feedback. Began Phase B: added `js/lib/formatters.js`, `js/lib/tiers.js`, and `js/views/score-cards.js`; libs are loaded before the main app.

## Change Log (Reverse Chronological)

- 2025‑09‑02: Mobile sticky/layout fixes — added dynamic `--tabs-offset`, moved chip spacing to content only, removed legacy section padding for chip sections; consistent panel wrappers for IDQ/AF; Anti‑Fragile header spacing aligned with IDQ; mobile close UX (✕) and prevented active tab from closing; stronger active states for top tabs and chips; Gauntlet label mapping and negative‑only red using theme tokens; initial mobile density pass for cards and compact hero header. Files: css/company-card-fixed.css, js/views/score-cards.js, js/company-card-complete-fix.js
- 2025‑09‑02: Header chip + ranks + IDQ caption — add universal header company chip (logo/ticker/overall score/price on scroll); fix overall score event flow and tier color; remove redundant IDQ caption; correct rank Top% math (Top = rank/total), keep copy order “#Y of N • Top X%”, and remove tilde for fallback ranks. Files: components/universal-header.html, js/universal-header.js, company-card-fixed.html, js/company-card-complete-fix.js
- 2025‑09‑02: Branding & icons — header brand updated to “Finalysis”; transparent favicon pack wired (ico/svg/png/apple‑touch), Safari pinned‑tab, MS tile; site.webmanifest updated (maskable icons, theme/background). Ensures correct icons for tabs, bookmarks, and PWA installs. Files: components/universal-header.html, index.html, company-card-fixed.html, assets/favicons/*
- 2025‑09‑02: Views extraction (Phase B) — moved Company Analysis and Detailed Financials rendering into `js/views/analysis.js` and `js/views/tables.js`; bootstrapping prefers new views but keeps legacy fallbacks. No behavior changes.
- 2025‑09‑02: Sub‑score display fix — round Quality sub‑scores in score cards to 1 decimal to avoid float overflow/artifacts. File: js/company-card-complete-fix.js
- 2025‑09‑02: Archived original single‑file breakdowns and manual test pages. Files moved to `archive/original/` (company-card_OLD-*.html) and `archive/manual-tests/` (test-company.html, test-nvda.html, debug.html). Historical docs moved to `archive/docs/` (IMPLEMENTATION_FIX_SUMMARY.md, PROJECT_STATUS_README.md). Root README remains the living guide; archive/README.md explains archive usage.
- 2025‑09‑01: IDQ chip/label corrected to raw‑score tier mapping; IDQ label restyled as pill (tier dot) with caption; removed score toolbar; kept keyboard toggles. Quality sub‑scores: 2‑col desktop; Anti‑Fragile: single‑col. Expanded tooltips across Key Financial Metrics and Detailed Financial Data. Debt/Equity aliasing fixed. Header search uses DataService (cached index); index.html now loads. Files: company-card-fixed.html, css/company-card-fixed.css, js/company-card-complete-fix.js, js/services/DataService.js, js/universal-header.js
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
