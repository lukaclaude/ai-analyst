(function() {
  async function injectFooterIfNeeded() {
    try {
      const cont = document.getElementById('universal-footer-container');
      if (!cont || cont.dataset.loaded === '1') return;
      const resp = await fetch('./components/universal-footer.html');
      cont.innerHTML = await resp.text();
      cont.dataset.loaded = '1';
    } catch(_) {}
  }

  function wireFooterBehaviors() {
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

  async function init() {
    await injectFooterIfNeeded();
    // If the footer markup loads after a short delay, run behaviors again
    wireFooterBehaviors();
    setTimeout(wireFooterBehaviors, 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
