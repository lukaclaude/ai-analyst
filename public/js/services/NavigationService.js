// NavigationService: centralize cross-page navigation decisions
// - goToCompany(ticker): If on company page and an inline updater exists, use it; else navigate to company page URL
// - goHome(): Navigate to index/home
// - open(url): Basic open helper for future use

(function() {
  function getContext() {
    try { return document.body && document.body.getAttribute && document.body.getAttribute('data-page-context'); }
    catch (_) { return null; }
  }

  function goToCompany(ticker) {
    const t = (ticker || '').toUpperCase();
    if (!t) return;
    const ctx = getContext();
    // Prefer in-place update when on company page
    if (ctx === 'company-card' && typeof window.navigateToCompany === 'function') {
      try { window.navigateToCompany(t); return; } catch (_) {}
    }
    // Fallback to hard navigation to company page
    window.location.href = `/company-card-fixed.html?ticker=${encodeURIComponent(t)}`;
  }

  function goHome() {
    window.location.href = '/';
  }

  function open(url) {
    if (!url) return;
    window.location.href = url;
  }

  function handleHeaderSearchResult(e) {
    if (!e) return;
    const link = e.target && e.target.closest && e.target.closest('a.search-result-item--header');
    if (!link) return;
    e.preventDefault();
    try {
      const url = new URL(link.getAttribute('href'), window.location.href);
      const t = url.searchParams.get('ticker');
      if (!t) return;
      // Optionally add to recents if we have metadata
      const name = link.dataset.name || '';
      const host = link.dataset.host || '';
      if (window.DataService && typeof window.DataService.addRecentCompany === 'function') {
        const website = host ? `https://${host}` : '';
        try { window.DataService.addRecentCompany({ ticker: t, companyName: name, website }); } catch(_) {}
      }
      goToCompany(t);
    } catch (_) {
      // fallback hard nav
      try { window.location.href = link.getAttribute('href'); } catch(_) {}
    }
  }

  function handleRecentClick(ticker) { goToCompany(ticker); }

  window.NavigationService = { goToCompany, goHome, open, handleHeaderSearchResult, handleRecentClick };
})();
