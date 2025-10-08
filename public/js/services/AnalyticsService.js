(function() {
  // Minimal GA4 wrapper with safe, centralized initialization
  const DEFAULT_MEASUREMENT_ID = 'G-QQW25R6FB8';

  function getMeasurementId() {
    try {
      // Allow override via global if ever provided
      if (window.__GA_MEASUREMENT_ID) return String(window.__GA_MEASUREMENT_ID);
    } catch(_) {}
    return DEFAULT_MEASUREMENT_ID;
  }

  function injectGtag(id) {
    if (!id) return false;
    if (window.dataLayer && typeof window.gtag === 'function') return true; // already loaded
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // Optional: basic consent mode; can be adjusted later if you add a consent banner
    try { window.gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'granted' }); } catch(_) {}
    // Enable debug via URL flag `?ga_debug=1`
    const debug = /[?&]ga_debug=1\b/.test(window.location.search);
    window.gtag('config', id, { send_page_view: false, debug_mode: debug });
    // Inject gtag.js
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s);
    return true;
  }

  function logPageView() {
    try {
      const id = getMeasurementId();
      if (!window.gtag || !id) return;
      window.gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname + window.location.search
      });
    } catch(_) {}
  }

  function logEvent(name, params) {
    try { if (window.gtag) window.gtag('event', name, params || {}); } catch(_) {}
  }

  function init() {
    const id = getMeasurementId();
    if (!id) return;
    if (!injectGtag(id)) return;
    // Log initial page view
    logPageView();
  }

  // Expose for use in NavigationService or other modules if needed
  window.AnalyticsService = { init, logPageView, logEvent };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

