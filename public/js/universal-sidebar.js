// Universal Sidebar (skeleton): context-aware content + recent companies
// Not wired into existing page yet to avoid regressions.

(function() {
  function detectContext() {
    const p = window.location.pathname;
    if (p.includes('company')) return 'company-card';
    if (p.includes('index')) return 'index';
    if (p.includes('comparison')) return 'comparison';
    if (p.includes('portfolio')) return 'portfolio';
    return 'company-card';
  }

  function renderTop(context) {
    const top = document.getElementById('sidebar-top');
    if (!top) return;
    if (context === 'company-card') {
      top.innerHTML = `
        <nav class="space-y-2" aria-label="Company sections">
          <a href="#scores" class="nav-link block px-4 py-2 rounded-lg">Scores</a>
          <a href="#analysis" class="nav-link block px-4 py-2 rounded-lg">Analysis</a>
          <a href="#financials" class="nav-link block px-4 py-2 rounded-lg">Financials</a>
          <a href="#detailed-financials" class="nav-link block px-4 py-2 rounded-lg">Detailed Financials</a>
        </nav>`;
    } else if (context === 'index') {
      top.innerHTML = `<div class="p-2 subtle-text">Filters (context-aware) – TBD</div>`;
    } else {
      top.innerHTML = `<div class="p-2 subtle-text">Context: ${context}</div>`;
    }
  }

  function renderRecent() {
    const cont = document.getElementById('sidebar-recent-companies');
    if (!cont || !window.DataService) return;
    const list = window.DataService.getRecentCompanies();
    cont.innerHTML = list.map((c, i) => `
      <div class="recent-company-item" data-ticker="${c.ticker}">
        <div class="company-info-row">
          <img class="company-mini-logo" id="usb-mini-logo-${i}" alt="${c.ticker}" style="display:none;" />
          <div id="usb-mini-fallback-${i}" class="logo-fallback-mini"><span>${(c.ticker||'?').charAt(0)}</span></div>
          <div class="company-text">
            <span class="ticker">${c.ticker}</span>
            <span class="name">${c.companyName || ''}</span>
          </div>
        </div>
      </div>
    `).join('');
    // Click handlers
    cont.querySelectorAll('.recent-company-item').forEach((el) => {
      el.addEventListener('click', () => {
        const t = el.getAttribute('data-ticker');
        if (t) window.location.href = `?ticker=${t}`;
      });
    });
    // Logo handlers
    list.forEach((c, i) => {
      const img = document.getElementById(`usb-mini-logo-${i}`);
      const fb = document.getElementById(`usb-mini-fallback-${i}`);
      if (!img) return;
      if (!c.website) { if (img) img.style.display = 'none'; if (fb) fb.style.display = 'flex'; return; }
      try {
        const hostname = new URL(c.website).hostname;
        tryLogoProviders(img, fb, hostname, c.ticker);
      } catch (_) {
        if (img) img.style.display = 'none'; if (fb) fb.style.display = 'flex';
      }
    });
  }

  function tryLogoProviders(logoEl, fallbackEl, hostname, ticker) {
    const providers = [
      { name: 'Clearbit', url: `https://logo.clearbit.com/${hostname}` },
      { name: 'Google Favicons', url: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128` },
      { name: 'DuckDuckGo', url: `https://icons.duckduckgo.com/ip3/${hostname}.ico` },
    ];
    const cacheKey = 'cachedCompanyLogos';
    const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
    let index = 0;

    if (cache[ticker]) {
      logoEl.src = cache[ticker];
      logoEl.onload = () => { logoEl.style.display = 'block'; if (fallbackEl) fallbackEl.style.display = 'none'; };
      logoEl.onerror = () => { delete cache[ticker]; localStorage.setItem(cacheKey, JSON.stringify(cache)); next(); };
      return;
    }

    function next() {
      if (index >= providers.length) {
        logoEl.style.display = 'none';
        if (fallbackEl) fallbackEl.style.display = 'flex';
        return;
      }
      const p = providers[index++];
      logoEl.src = p.url;
      logoEl.onload = () => {
        logoEl.style.display = 'block';
        if (fallbackEl) fallbackEl.style.display = 'none';
        cache[ticker] = p.url;
        localStorage.setItem(cacheKey, JSON.stringify(cache));
      };
      logoEl.onerror = next;
    }
    next();
  }

  function init() {
    const context = detectContext();
    renderTop(context);
    renderRecent();
    if (window.DataService && typeof window.DataService.subscribeRecent === 'function') {
      window.DataService.subscribeRecent(renderRecent);
    }
    // Theme toggle wiring
    const themeBtn = document.getElementById('universal-sidebar-theme-toggle');
    if (themeBtn && window.ThemeService && typeof window.ThemeService.toggle === 'function') {
      themeBtn.addEventListener('click', () => window.ThemeService.toggle());
    }
  }

  // Expose for later wiring
  window.UniversalSidebar = { init };
})();
