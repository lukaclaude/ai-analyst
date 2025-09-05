# Agent Handoff — AI‑Analyst

This document gives an at‑a‑glance brief so any agent (or non‑coder owner) can continue smoothly.

## How to Run
- Serve `public/` locally: `cd public && python3 -m http.server 8000`
- Company page: `http://localhost:8000/company-card-fixed.html?ticker=NVDA`
- Index page: `http://localhost:8000/`

## Architecture Summary
- Universal Header (components/universal-header.html + js/universal-header.js)
  - Desktop: anchored search; Mobile: programmatic focus for Chrome/Safari.
  - Tooltip policy: use `data-tooltip`; never native `title`.
  - Search results: tiny favicon logo at left (fallback chain: Clearbit → Google S2 → DuckDuckGo) with letter fallback; works on mobile/desktop.
  - Alignment: brand/logo remain pinned to left on ultra-wide screens; search position is stable and not sidebar-coupled.
- Compact Hero (company only)
  - Sticky summary below header (logo/ticker/name/price/overall/tier). Hysteresis prevents flicker.
- Universal Sidebar (js/universal-sidebar.js)
  - Desktop: 256px (expanded) / 80px (collapsed); mobile/tablet: drawer overlay.
  - Body flags: `sidebar-expanded` (desktop), `sidebar-drawer-open` (mobile), `data-page-context` (‘index’, ‘company-card’, etc.).
- Universal Footer (components/universal-footer.html + js/universal-footer.js)
  - Sits at bottom; aligned next to sidebar on pages that have one; stacked on mobile.
  - Small legal banner (localStorage); Disclaimer and Privacy links.
- Services
  - ThemeService (js/services/ThemeService.js): theme state + `themeChanged` event.
  - DataService (js/services/DataService.js): unified overall score for search; search cache V2; search index includes `websiteHost` for logos.
  - NavigationService (js/services/NavigationService.js): goToCompany/goHome/open; `handleHeaderSearchResult(e)` centralizes header result navigation and updates recents.
- Controllers
  - Company (js/controllers/company.js): centralizes theme/resize/orientation redraws; refreshes compact hero; redraws charts/score breakdown.
  - Index (js/controllers/index.js): placeholder for future lifecycle.

## Visual & Data Rules
- Overall = 40% Quality + 35% IDQ + 25% Anti‑Fragile (normalized).
- Ratios via `Aliases.getAliasedRatio`; growth via `computeRevenueGrowth/EpsGrowth`.
- Currency formatting via `Formatters`; Working Capital uses statement currency (TTM.reportedCurrency).
- Universal Tooltip for all `data-tooltip` (no native titles).

## Recent Changes (high‑level)
- Universal header finalized; compact hero added; header chip deprecated.
- Mobile search focus fixed for Chrome/Safari; performance chart widened on mobile.
- Sidebar fixed width + handle; footer aligned next to sidebar on relevant pages.
- Data discipline enforced for company metrics; search scores unified and colored dot added.
- Legal and About pages integrated with universal components; content placeholders ready for visual overhaul.

## Known TODOs / Next Steps
1) About & Legal (visual overhaul)
   - Rebuild pages using the same section‑surface and layout rhythm; match header/body spacing.
   - Add explanatory visuals/mini‑interactions to walk through Score Trinity, Score Cards, Analysis, and Trends.
   - Consider embedded, interactive examples (e.g., mini score card with tooltips).
2) Shared styles
   - Extract a tiny shared pill/badge style (tier badges) into `css/components.css`.
3) Final formatting cleanup
   - Remove remaining non‑critical inline formatting in `js/company-card-complete-fix.js`.
4) Index performance (optional)
   - Debounce filters/search; consider list/table virtualization for large datasets.
5) Accessibility
   - Final aria-pressed/state checks; verify focus order/visibility with sticky + drawer interactions.
6) Analytics/cookies (if enabled later)
   - If adding analytics, introduce a consent banner (opt‑in) and document the cookie policy.
7) Company modularization & payload (next phase)
   - Move remaining logic from `js/company-card-complete-fix.js` into `js/views/*` with a thin company bootstrap.
   - Lazy-load heavy blocks (charts, historical tables) on first interaction/visibility; provide loaders and ensure theme/resize hooks.
   - Extract shared CSS primitives to `css/components.css`; prune duplicates in `css/company-card-fixed.css`.

## Where to Start (Agent)
- Read README.md (architecture fundamentals, contracts) and docs:
  - documentation/docs/universal-components.md (contracts)
  - documentation/docs/index.md (index structure)
  - documentation/docs/company.md (company page structure & lifecycle)
  - documentation/file-structure.md (structural library & planned changes)
- Pick up TODOs in documentation/TODO-RESTRUCTURE.md and the list above.
- Keep to:
  - No native `title`; use `data-tooltip`.
  - Use ThemeService + `themeChanged` for redraws; read CSS tokens from `document.body`.
  - Use Aliases/Formatters for data presentation.
  - Preserve universal component contracts and body flags.

## Test Checklist (quick)
- Mobile: bottom Search focuses header input (Chrome/Safari); chart width; compact hero transition.
- Desktop: sidebar expand/collapse → footer/header alignment correct.
- Company metrics: ratios/growth formatted consistently; Working Capital currency/units.
- Header search results: score matches overall; colored tier dot; tiny logo or letter fallback visible on mobile/desktop.
- Legal/About: theme toggling works; footer at bottom; no sidebar offset.
