Archived: 2025-09-05 — See documentation/docs/universal-components.md

Universal Items Cleanup Notes

Context: During index page modernization, a few company‑specific UI elements were embedded in “universal” components. These work today, but should be cleaned up to make universals page‑agnostic and easier to extend.

Items to address

- Universal header — company chip
  - Current: The header markup always includes a company “chip”. Visibility is controlled at runtime via hero detection/intersection observer. For index (and non‑company pages) we now hard‑disable it in code.
  - Risk: Page heuristics in the header JS couple the header to content structure (e.g., presence of `.hero-header`).
  - Proposal: Make the chip an optional slot/partial included only on company pages (server‑side or via a small boot flag like `data-page-context="company"`). Remove chip markup from the universal header for non‑company pages entirely.

- Universal sidebar — context detection by pathname
  - Current: The sidebar decides its “top” content via `window.location.pathname` heuristics. Root `/` now maps to `index` (was defaulting to company page), and other pages match by substrings.
  - Risk: Path‑based detection is brittle for rewrites or route changes.
  - Proposal: Drive context via an explicit `data-page-context` attribute on `<body>` or a global bootstrap variable. The sidebar should render top content based on this explicit context rather than guessing from the URL.

- Search result anchors — header vs sidebar
  - Current: Header search uses anchor links with `?ticker=...`; index intercepts and routes to `/company-card-fixed.html`. Sidebar search filters inline on index.
  - Proposal: Introduce a tiny `NavigationService` to unify navigation decisions and avoid per‑page event interception.

- Shared CSS names used by multiple pages
  - Observation: Names like `.search-results-dropdown` and `.data-table` are used across pages. Styling is currently compatible, but namespace collisions are possible as we add more pages.
  - Proposal: Scope shared styles under higher‑level containers (e.g., `#index`, `#company`) or move page‑specific styles to per‑page CSS (e.g., `css/index.css` done here).

Impact

- All changes can be made incrementally without breaking the company page: add opt‑in flags first, then remove heuristics.

Suggested next steps

1) Add `data-page-context` to `<body>` in index/company pages and refactor universal header/sidebar to read it.
2) Extract the company chip into a small include (or gated render) used only on company pages.
3) Add a light `NavigationService` for consistent cross‑page navigation.
4) Audit and namespace page‑specific CSS selectors.
