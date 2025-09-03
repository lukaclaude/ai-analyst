// Universal Sidebar (skeleton): context-aware content + recent companies
// Not wired into existing page yet to avoid regressions.

(function() {
  let currentContext = null;
  function detectContext() {
    const ctxAttr = document.body && document.body.getAttribute && document.body.getAttribute('data-page-context');
    if (ctxAttr) return ctxAttr;
    const p = window.location.pathname;
    if (p === '/' || p === '' || /\/$/.test(p)) return 'index';
    if (p.includes('company')) return 'company-card';
    if (p.includes('index')) return 'index';
    if (p.includes('comparison')) return 'comparison';
    if (p.includes('portfolio')) return 'portfolio';
    return 'index';
  }

  function renderTop(context) {
    const top = document.getElementById('sidebar-top');
    if (!top) return;
    currentContext = context;
    if (context === 'company-card') {
      const params = new URLSearchParams(window.location.search);
      const urlTicker = (params.get('ticker') || '').toUpperCase();
      const tickerEl = document.getElementById('ticker');
      const logoEl = document.getElementById('company-logo');
      // Prefer live DOM ticker, fall back to URL param
      const ticker = ((tickerEl?.textContent || '').trim()) || urlTicker;
      const title = ticker || '';
      const logoSrc = (logoEl && logoEl.src) || '';
      const initial = (ticker || urlTicker || 'T').charAt(0);
      const logoHtml = `
        <img id="usb-top-logo" src="${logoSrc}" alt="${ticker}"
             style="${logoSrc ? '' : 'display:none;'}width:16px;height:16px;border-radius:4px;background:#fff;object-fit:contain;"/>
        <span id="usb-top-logo-fb"
              style="${logoSrc ? 'display:none;' : 'display:inline-flex;'}align-items:center;justify-content:center;width:16px;height:16px;border-radius:4px;background:var(--glass-bg);border:1px solid var(--glass-border);font-size:10px;font-weight:700;">
          ${initial}
        </span>`;
      top.innerHTML = `
        <nav class="sidebar-nav space-y-2" aria-label="Company sections">
          <div class="scrollspy-indicator" style="top:8px;height:0px"></div>
          <a href="#top" data-target="top" class="nav-link">${logoHtml}<span>${title}</span></a>
          <a href="#scores" data-target="scores" class="nav-link">${icon('scores')}<span>Score Trinity</span></a>
          <a href="#analysis" data-target="analysis" class="nav-link">${icon('analysis')}<span>Analysis</span></a>
          <a href="#health-scores" data-target="health-scores" class="nav-link">${icon('metrics')}<span>Key Metrics</span></a>
          <a href="#detailed-financials" data-target="detailed-financials" class="nav-link">${icon('raw')}<span>Raw Financials</span></a>
        </nav>`;
      wireNav();
    } else if (context === 'index') {
      // Index page: render search + filters UI in the top area
      top.innerHTML = `
        <div id="filters-mini" style="display:none;padding:6px 8px;">
          <button id="filters-mini-btn" class="nav-link w-full px-2 py-1 rounded-lg" aria-label="Show filters" title="Show filters">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 5h18v2l-7 7v5l-4-2v-3L3 7z"/></svg>
          </button>
        </div>
        <h3 class="sidebar-section-title sidebar-muted-text" style="display:flex;align-items:center;gap:8px;margin:4px 0 10px 0;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="opacity:.8;"><path d="M3 5h18v2l-7 7v5l-4-2v-3L3 7z"/></svg>
          <span class="sidebar-section-title-text">Filters</span>
        </h3>
        <div class="sidebar-search-container" style="margin-bottom: 10px;">
          <input id="sidebar-search" type="text" class="sidebar-input w-full px-3 py-2 rounded-md" placeholder="Search companies..." aria-label="Search companies" autocomplete="off" />
          <div id="sidebar-search-results" class="search-results-dropdown" style="display:none;"></div>
        </div>
        <div class="section-surface" style="padding:12px;border-radius:12px;">
          <div class="filter-group" style="margin-bottom:10px;">
            <label class="text-xs sidebar-muted-text" for="filter-sector">Sector</label>
            <select id="filter-sector" class="sidebar-input w-full px-3 py-2 rounded-md">
              <option value="">All sectors</option>
            </select>
          </div>
          <div class="filter-group" style="margin-bottom:10px;">
            <label class="text-xs sidebar-muted-text" for="filter-industry">Industry</label>
            <select id="filter-industry" class="sidebar-input w-full px-3 py-2 rounded-md">
              <option value="">All industries</option>
            </select>
          </div>
          <div class="filter-group" style="margin-bottom:10px;">
            <label class="text-xs sidebar-muted-text" for="filter-marketcap">Market Cap</label>
            <select id="filter-marketcap" class="sidebar-input w-full px-3 py-2 rounded-md">
              <option value="">Any size</option>
              <option value="mega">Mega (&gt;$200B)</option>
              <option value="large">Large ($10B–$200B)</option>
              <option value="mid">Mid ($2B–$10B)</option>
              <option value="small">Small ($300M–$2B)</option>
              <option value="micro">Micro (&lt;$300M)</option>
            </select>
          </div>
          <div class="filter-group" style="margin-bottom:10px;">
            <div class="text-xs sidebar-muted-text" style="margin-bottom:6px;">Overall (0–100)</div>
            <div class="flex items-center gap-2">
              <input id="filter-overall-min" type="number" class="sidebar-input w-full px-3 py-2 rounded-md" placeholder="Min" min="0" max="100" />
              <span class="sidebar-muted-text" style="font-size:12px;">to</span>
              <input id="filter-overall-max" type="number" class="sidebar-input w-full px-3 py-2 rounded-md" placeholder="Max" min="0" max="100" />
            </div>
          </div>
          <div class="filter-group" style="margin-bottom:10px;">
            <div class="text-xs sidebar-muted-text" style="margin-bottom:6px;">Quality (0–109)</div>
            <div class="flex items-center gap-2">
              <input id="filter-quality-min" type="number" class="sidebar-input w-full px-3 py-2 rounded-md" placeholder="Min" min="0" max="109" />
              <span class="sidebar-muted-text" style="font-size:12px;">to</span>
              <input id="filter-quality-max" type="number" class="sidebar-input w-full px-3 py-2 rounded-md" placeholder="Max" min="0" max="109" />
            </div>
          </div>
          <div class="filter-group" style="margin-bottom:10px;">
            <div class="text-xs sidebar-muted-text" style="margin-bottom:6px;">IDQ (−3–12)</div>
            <div class="flex items-center gap-2">
              <input id="filter-idq-min" type="number" class="sidebar-input w-full px-3 py-2 rounded-md" placeholder="Min" step="1" min="-3" max="12" />
              <span class="sidebar-muted-text" style="font-size:12px;">to</span>
              <input id="filter-idq-max" type="number" class="sidebar-input w-full px-3 py-2 rounded-md" placeholder="Max" step="1" min="-3" max="12" />
            </div>
          </div>
          <div class="filter-group" style="margin-bottom:10px;">
            <div class="text-xs sidebar-muted-text" style="margin-bottom:6px;">Anti‑Fragile (−7–17)</div>
            <div class="flex items-center gap-2">
              <input id="filter-af-min" type="number" class="sidebar-input w-full px-3 py-2 rounded-md" placeholder="Min" step="1" min="-7" max="17" />
              <span class="sidebar-muted-text" style="font-size:12px;">to</span>
              <input id="filter-af-max" type="number" class="sidebar-input w-full px-3 py-2 rounded-md" placeholder="Max" step="1" min="-7" max="17" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button id="apply-filters" class="nav-link px-3 py-2 rounded-lg" style="width:100%;">Apply Filters</button>
            <button id="reset-filters" class="nav-link px-3 py-2 rounded-lg" style="width:100%;">Clear</button>
          </div>
        </div>`;
    } else {
      top.innerHTML = `<div class="p-2 subtle-text">Context: ${context}</div>`;
    }
  }

  function icon(kind) {
    const base = 'width:16px;height:16px;color:currentColor;';
    if (kind === 'scores') return `<svg style="${base}" viewBox="0 0 20 20" fill="currentColor"><path d="M11 2a1 1 0 10-2 0v1H7a1 1 0 000 2h2v2H7a1 1 0 000 2h2v2H7a1 1 0 000 2h2v3a1 1 0 102 0v-3h2a1 1 0 000-2h-2v-2h2a1 1 0 000-2h-2V5h2a1 1 0 000-2h-2V2z"/></svg>`;
    if (kind === 'analysis') return `<svg style="${base}" viewBox="0 0 20 20" fill="currentColor"><path d="M2 4a2 2 0 012-2h7a2 2 0 012 2v3h3a2 2 0 012 2v7a2 2 0 01-2 2H9a2 2 0 01-2-2v-3H4a2 2 0 01-2-2V4z"/></svg>`;
    if (kind === 'metrics') return `<svg style="${base}" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3h2v14H3V3zm6 4h2v10H9V7zm6-3h2v13h-2V4z"/></svg>`;
    if (kind === 'raw') return `<svg style="${base}" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm1 3v2h10V6H5zm0 4v2h10v-2H5zm0 4v2h6v-2H5z"/></svg>`;
    return '';
  }

  function updateTopFromState() {
    try {
      const s = window.CompanyCard?.state;
      if (!s) return;
      const ticker = s.currentTicker || '';
      // Update label: second span in the top link is the label
      const labelSpan = document.querySelector('.sidebar-nav .nav-link[data-target="top"] > span:last-child');
      if (labelSpan && ticker) labelSpan.textContent = ticker;

      // Try to set top logo via providers
      const website = s.currentStockData?.API_Financials?.General?.companyWebsite || '';
      const img = document.getElementById('usb-top-logo');
      const fb = document.getElementById('usb-top-logo-fb');
      if (img && website) {
        try {
          const hostname = new URL(website).hostname;
          tryLogoProviders(img, fb, hostname, ticker);
        } catch (_) {}
      }
    } catch (_) {}
  }

  function wireNav() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;
    const links = Array.from(nav.querySelectorAll('.nav-link'));
    const indicator = nav.querySelector('.scrollspy-indicator');
    const sidebarContainer = document.getElementById('universal-sidebar-container');
    const overlay = document.getElementById('sidebar-overlay');
    const header = document.querySelector('.universal-header');
    const headerH = header ? header.offsetHeight : 45;

    // Click to scroll
    links.forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = a.getAttribute('data-target');
        if (target === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const el = document.getElementById(target);
          if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - (headerH + 8);
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }
        // Close drawer on mobile
        if (sidebarContainer && getComputedStyle(sidebarContainer).position === 'fixed') {
          sidebarContainer.classList.remove('active');
          if (overlay) overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });

    // Scrollspy
    const hero = document.querySelector('.hero-header');
    const sections = [
      { id: 'top', el: hero || document.getElementById('scores') || document.body },
      { id: 'scores', el: document.getElementById('scores') },
      { id: 'analysis', el: document.getElementById('analysis') },
      { id: 'health-scores', el: document.getElementById('health-scores') },
      { id: 'detailed-financials', el: document.getElementById('detailed-financials') },
    ].filter(s => s.el);

    let activeId = null;
    const io = new IntersectionObserver((entries) => {
      // Choose the most visible entry
      let best = null;
      entries.forEach((en) => {
        if (!best || en.intersectionRatio > best.intersectionRatio) best = en;
      });
      if (!best) return;
      let id = best.target.id;
      if (!id && best.target === hero) id = 'top';
      if (id && id !== activeId) {
        activeId = id;
        updateActive();
      }
    }, {
      root: null,
      rootMargin: `-${headerH + 8}px 0px 0px 0px`,
      threshold: [0.25, 0.5, 0.75]
    });

    sections.forEach(s => io.observe(s.el));

    function updateActive() {
      links.forEach((a) => {
        const t = a.getAttribute('data-target');
        const isActive = t === activeId;
        a.classList.toggle('active', isActive);
        if (isActive) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      const activeLink = links.find(a => a.getAttribute('data-target') === activeId) || links[0];
      if (indicator && activeLink) {
        const navRect = nav.getBoundingClientRect();
        const rect = activeLink.getBoundingClientRect();
        const top = rect.top - navRect.top + nav.scrollTop + 6; // small inset
        indicator.style.top = `${top}px`;
        indicator.style.height = `${rect.height - 12}px`;
      }
    }
    updateActive();
    window.addEventListener('resize', () => updateActive());
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
    // Click handlers (context-aware)
    cont.querySelectorAll('.recent-company-item').forEach((el) => {
      el.addEventListener('click', () => {
        const t = el.getAttribute('data-ticker');
        if (!t) return;
        const ctx = (window.UniversalSidebar && typeof window.UniversalSidebar.getContext === 'function') ? window.UniversalSidebar.getContext() : null;
        if (ctx === 'index') {
          window.location.href = `/company-card-fixed.html?ticker=${t}`;
          return;
        }
        if (typeof window.navigateToCompany === 'function') {
          window.navigateToCompany(t);
          return;
        }
        window.location.href = `?ticker=${t}`;
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
    // Filters mini expand (desktop collapsed)
    const mini = document.getElementById('filters-mini-btn');
    if (mini) mini.addEventListener('click', () => {
      const cont = document.getElementById('universal-sidebar-container');
      if (cont) cont.classList.remove('collapsed');
    });
  }

  // Expose for later wiring
  window.UniversalSidebar = {
    init,
    setContext: function(ctx) { renderTop(ctx || detectContext()); renderRecent(); },
    getContext: function() { return currentContext || detectContext(); },
    updateTopFromState
  };
})();
