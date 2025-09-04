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

  window.NavigationService = { goToCompany, goHome, open };
})();

