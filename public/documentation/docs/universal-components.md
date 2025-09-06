# Universal Components — Architecture Contract

This note documents the behavior and contracts for the universal components so devs and non‑coders can reason about structure quickly.

## Universal Header (all pages)
- Zones: Left (logo + brand), Middle (anchored search), Right (actions).
- Desktop: search is anchored to align with content; never moves with sidebar.
- Mobile: tapping bottom Search reveals and focuses the header search input programmatically (works in Safari/Chrome).
- Tooltip policy: use `data-tooltip` only (no native `title`).

## Compact Hero (company page only)
- Sticky bar under the universal header; appears when the main hero scrolls out.
- Desktop: single row — logo • TICKER • Company Name | price • overall • tier badge.
- Mobile: two rows — Row 1 (logo • TICKER • Company Name), Row 2 (price • overall • tier badge).
- Tier badge has a tooltip describing tier ranges and the Overall formula (40% Q, 35% IDQ, 25% AF).
- Hysteresis prevents flicker: bar shows when the hero is < 15% visible and hides when > 45%.

## Universal Sidebar
- Desktop: fixed 256px; close handle at mid-edge; no horizontal scroll.
- Collapsed width: 80px; content aligns (header/compact hero unaffected).
- Mobile/Tablet: drawer overlay toggles `body.sidebar-drawer-open` so content (compact hero) shifts and remains readable.
- Top area contract: `#sidebar-top` is page-specific (filters on index, section nav on company); bottom area is universal (Recent Companies + Theme toggle).

## Class/Flag Summary
- `body[data-page-context]` → page context (e.g., `index`, `company-card`) for universal components.
- `body.sidebar-expanded` (desktop) → toggled based on collapsed/expanded state.
- `body.sidebar-drawer-open` (mobile/tablet) → drawer visible; compact hero shifts.
- `body.show-mobile-search` → mobile header search revealed.

## Navigation
- Programmatic navigation via `NavigationService` (header search, sidebar recents).
- Anchors in index grid intentionally link to company page.
