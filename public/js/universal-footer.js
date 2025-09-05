(function() {
  function init() {
    try {
      const yearEl = document.getElementById('footer-year');
      if (yearEl) yearEl.textContent = new Date().getFullYear();
    } catch(_) {}

    const KEY = 'legalBannerAckV1';
    const banner = document.getElementById('legal-banner');
    const btn = document.getElementById('legal-banner-accept');
    const ack = localStorage.getItem(KEY);
    if (!ack && banner) {
      banner.hidden = false; banner.style.display = 'block';
    }
    if (btn) btn.addEventListener('click', () => {
      localStorage.setItem(KEY, String(Date.now()));
      if (banner) { banner.hidden = true; banner.style.display = 'none'; }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
