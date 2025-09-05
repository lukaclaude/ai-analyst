// Index Page Controller: grid/list/table views, filters, sorting, pagination, CSV export
// Depends on: DataService, Formatters, UniversalSidebar, ThemeService

(function() {
  const state = {
    all: [],
    filtered: [],
    view: 'list', // grid | list | table
    sort: { key: 'lastUpdateDate', dir: 'desc' },
    page: 1,
    perPage: 24,
    search: '',
    filters: {
      sector: '',
      marketCap: '', // micro, small, mid, large, mega
      overall: { min: null, max: null },
      quality: { min: null, max: null },
      idq: { min: null, max: null },
      af: { min: null, max: null },
    },
    sectors: [],
    industries: [],
    favorites: new Set(),
    filterFavorites: false,
  };

  function byId(id) { return document.getElementById(id); }
  function parseNum(v) { if (v == null) return null; const n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? null : n; }
  function toDateSafe(s) {
    if (!s) return new Date(0);
    // Try DD/MM/YYYY
    const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) {
      const a = parseInt(m[1],10), b = parseInt(m[2],10), y = parseInt(m[3],10);
      // Heuristic: if first segment > 12 => DD/MM, else assume MM/DD
      if (a > 12) return new Date(y, b-1, a);
      return new Date(y, a-1, b);
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }

  function extractLastUpdated(data) {
    // Prefer display text from Summaries_Group like company page
    const summariesLU = data?.LLM_Research_and_Comments?.Summaries_Group?.lastUpdate;
    let displayText = '';
    if (summariesLU && typeof summariesLU === 'string') {
      const lines = summariesLU.split('\n').map(s => s.trim()).filter(Boolean);
      if (lines.length) displayText = lines[0].split(' - ')[0].trim();
    }
    // Prefer sort date from IDQ_Report.lastUpdated (ISO-like, reliable)
    const idqLU = data?.LLM_Reports?.IDQ_Report?.lastUpdated || data?.LLM_Reports?.IDQ_Report?.lastUpdate || '';
    if (idqLU) return { text: displayText || String(idqLU), date: toDateSafe(idqLU) };
    // Fallbacks
    const pLU = data?.Portfolio?.lastUpdate || data?.API_Financials?.General?.lastUpdated || displayText || '';
    return { text: String(pLU), date: toDateSafe(pLU) };
  }
  function computeTierScore(quality, idq, af) {
    const q = ((parseFloat(quality)||0) / 109) * 100;
    const i = (((parseFloat(idq)||0) + 3) / 15) * 100;
    const a = (((parseFloat(af)||0) + 7) / 24) * 100;
    return (q*0.4) + (i*0.35) + (a*0.25);
  }
  function tierName(score) {
    if (score >= 85) return 'Apex Performer';
    if (score >= 78) return 'Industry Powerhouse';
    if (score >= 65) return 'Quality Compounder';
    if (score >= 55) return 'Mixed Signals';
    if (score >= 32) return 'Positionally Challenged';
    return 'High Risk';
  }

  async function loadData() {
    const db = window.DataService.initFirestore();
    const snapshot = await db.collection('stocks').get();
    const all = [];
    const sectors = new Set();
    const industries = new Set();
    snapshot.forEach((doc) => {
      const d = doc.data();
      const p = d?.Portfolio || {};
      const gen = d?.API_Financials?.General || {};
      const hs = d?.API_Financials?.Health_Scores || {};
      const ticker = (p.ticker || '').toUpperCase();
      const name = p.companyName || '';
      if (!ticker || !name) return;
      const quality = parseFloat(p.qualityScore) || 0;
      const idq = parseFloat(d?.LLM_Reports?.IDQ_Report?.idqScore) || 0;
      const af = parseFloat(d?.Anti_Fragile_Score?.totalScore) || 0;
      const price = parseNum(p.stockPriceNow);
      const currency = (gen.currency || 'USD').toUpperCase();
      const website = gen.companyWebsite || p.companyWebsite || '';
      const sector = gen.sector || '';
      const industry = gen.industry || '';
      const marketCap = parseNum(hs.marketCap);
      const { text: lastUpdatedText, date: lastUpdateDate } = extractLastUpdated(d);
      const overall = computeTierScore(quality, idq, af);
      // Build metrics summary using aliases/utilities
      const ttm = d?.API_Financials?.TTM || {};
      const metrics = {
        pe: window.Aliases?.getAliasedRatio ? window.Aliases.getAliasedRatio(ttm, 'pe') : null,
        evEbitda: window.Aliases?.getAliasedRatio ? window.Aliases.getAliasedRatio(ttm, 'evEbitda') : null,
        operatingMargin: window.Aliases?.computeOperatingMargin ? window.Aliases.computeOperatingMargin(d?.API_Financials) : null,
        netMargin: window.Aliases?.getAliasedRatio ? window.Aliases.getAliasedRatio(ttm, 'netMargin') : null,
        revGrowth: window.Aliases?.computeRevenueGrowth ? window.Aliases.computeRevenueGrowth(d?.API_Financials) : null,
        epsGrowth: window.Aliases?.computeEpsGrowth ? window.Aliases.computeEpsGrowth(d?.API_Financials) : null,
      };
      const item = { ticker, name, quality, idq, af, price, currency, website, sector, industry, marketCap, lastUpdatedText, lastUpdateDate, overall, metrics };
      all.push(item);
      if (sector) sectors.add(sector);
      if (industry) industries.add(industry);
    });
    state.all = all;
    state.sectors = Array.from(sectors).sort();
    state.industries = Array.from(industries).sort();
  }

  function populateSectorFilter() {
    const sel = byId('filter-sector');
    if (!sel) return;
    const opts = ['<option value="">All sectors</option>'].concat(state.sectors.map(s => `<option value="${s}">${s}</option>`));
    sel.innerHTML = opts.join('');
  }

  function populateIndustryFilter() {
    const sel = byId('filter-industry');
    if (!sel) return;
    const opts = ['<option value="">All industries</option>'].concat(state.industries.map(s => `<option value="${s}">${s}</option>`));
    sel.innerHTML = opts.join('');
  }

  function updateIndustryOptionsForSector(sector) {
    const sel = byId('filter-industry');
    if (!sel) return;
    let industries = state.industries;
    if (sector) {
      const set = new Set();
      state.all.forEach(x => { if (x.sector === sector && x.industry) set.add(x.industry); });
      industries = Array.from(set).sort();
    }
    const opts = ['<option value="">All industries</option>'].concat(industries.map(s => `<option value="${s}">${s}</option>`));
    sel.innerHTML = opts.join('');
  }

  function inCapBucket(val, bucket) {
    if (val == null) return false;
    switch (bucket) {
      case 'mega': return val > 200e9;
      case 'large': return val > 10e9 && val <= 200e9;
      case 'mid': return val > 2e9 && val <= 10e9;
      case 'small': return val > 300e6 && val <= 2e9;
      case 'micro': return val <= 300e6;
      default: return true;
    }
  }

  function applyFilters() {
    const q = state.search.trim().toLowerCase();
    const f = state.filters;
    let list = state.all.filter(x => {
      if (q && !(x.ticker.toLowerCase().includes(q) || x.name.toLowerCase().includes(q))) return false;
      if (f.sector && x.sector !== f.sector) return false;
      if (f.marketCap && !inCapBucket(x.marketCap, f.marketCap)) return false;
      if (f.industry && x.industry !== f.industry) return false;
      if (f.overall.min != null && x.overall < f.overall.min) return false;
      if (f.overall.max != null && x.overall > f.overall.max) return false;
      if (f.quality.min != null && x.quality < f.quality.min) return false;
      if (f.quality.max != null && x.quality > f.quality.max) return false;
      if (f.idq.min != null && x.idq < f.idq.min) return false;
      if (f.idq.max != null && x.idq > f.idq.max) return false;
      if (f.af.min != null && x.af < f.af.min) return false;
      if (f.af.max != null && x.af > f.af.max) return false;
      if (state.filterFavorites && !state.favorites.has(x.ticker)) return false;
      return true;
    });
    state.filtered = list;
  }

  function sortList() {
    const { key, dir } = state.sort;
    const mul = dir === 'asc' ? 1 : -1;
    const numKeys = ['overall','quality','idq','af','marketCap','price','metrics.pe','metrics.evEbitda','metrics.operatingMargin','metrics.netMargin','metrics.revGrowth','metrics.epsGrowth'];
    const dateKeys = ['lastUpdateDate'];
    state.filtered.sort((a,b) => {
      let va, vb;
      if (key.includes('.')) {
        const [k1,k2] = key.split('.');
        va = a[k1]?.[k2]; vb = b[k1]?.[k2];
      } else { va = a[key]; vb = b[key]; }
      if (dateKeys.includes(key)) { va = a[key].getTime(); vb = b[key].getTime(); }
      if (numKeys.includes(key)) { va = parseFloat(va)||0; vb = parseFloat(vb)||0; }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return -1*mul;
      if (va > vb) return 1*mul;
      return 0;
    });
  }

  function paginateList() {
    const total = state.filtered.length;
    const per = state.perPage;
    const pages = Math.max(1, Math.ceil(total / per));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * per;
    const end = start + per;
    const slice = state.filtered.slice(start, end);
    const pageInfo = byId('page-info');
    const pag = byId('pagination-controls');
    if (pageInfo) pageInfo.textContent = `Page ${state.page} of ${pages} • ${total} results`;
    if (pag) pag.style.display = pages > 1 ? 'flex' : 'none';
    return slice;
  }

  function logoTag(x) {
    if (!x.website) return `<div class="logo-fallback-mini"><span>${x.ticker.charAt(0)}</span></div>`;
    try {
      const host = new URL(x.website).hostname;
      const src = `https://logo.clearbit.com/${host}`;
      return `<img src="${src}" alt="${x.ticker}" width="28" height="28" style="width:28px;height:28px;border-radius:6px;background:#fff;object-fit:contain;" onerror="this.remove()"/>`;
    } catch (_) {
      return `<div class="logo-fallback-mini"><span>${x.ticker.charAt(0)}</span></div>`;
    }
  }

  function renderGrid(list) {
    const cont = byId('content-container');
    if (!cont) return;
    if (!list.length) { cont.innerHTML = `<div class="mini-meta">No results</div>`; return; }
    cont.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">${list.map(x => {
      const priceStr = x.price != null ? window.Formatters.formatCurrency(x.price, 2, x.currency) : '';
      const overallStr = `${tierName(x.overall)} • ${x.overall.toFixed(1)}`;
      const qPct = Math.round((x.quality/109)*100);
      const iPct = Math.round(((x.idq+3)/15)*100);
      const aPct = Math.round(((x.af+7)/24)*100);
      const fav = state.favorites.has(x.ticker);
      const tierColor = colorForPercent(x.overall);
      const tlabel = tierName(x.overall);
      return `
        <div class="preview-card block text-inherit no-underline" data-ticker="${x.ticker}">
          <button class="fav-btn" data-ticker="${x.ticker}" aria-label="Toggle favorite" aria-pressed="${fav ? 'true' : 'false'}" data-tooltip="Toggle favorite" style="position:absolute;top:8px;right:8px;background:transparent;border:none;color:${fav?'#f5c518':'var(--color-text-secondary)'};cursor:pointer;z-index:3;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
          </button>
          <div class="chart-container" style="z-index:0;"><canvas id="chart-${x.ticker}"></canvas></div>
          <a class="card-header" href="/company-card-fixed.html?ticker=${encodeURIComponent(x.ticker)}">
            ${logoTag(x)}
            <div class="card-header-text">
              <div class="card-name" data-tooltip="${x.name}">${x.name}</div>
              <div class="card-tkr">${x.ticker}</div>
            </div>
          </a>
          <div class="tier-row" data-tooltip="Overall ${x.overall.toFixed(1)} • ${tlabel}">
            <div class="overall-score">${x.overall.toFixed(1)}</div>
            <div class="tier-label" style="color:${tierColor}">${tlabel}</div>
          </div>
          <div class="card-meta">
            <div class="mini-meta">${priceStr || ''}</div>
          </div>
          <div class="grid grid-cols-3 gap-2 text-[11px] mt-2 mini-stats">
            <div class="mini-meta"><strong>Q</strong> ${x.quality ?? 'N/A'}<span class="opacity-60">/109</span></div>
            <div class="mini-meta"><strong>IDQ</strong> ${x.idq ?? 'N/A'}<span class="opacity-60">/12</span></div>
            <div class="mini-meta"><strong>AF</strong> ${x.af ?? 'N/A'}<span class="opacity-60">/17</span></div>
          </div>
          <div class="grid grid-cols-3 gap-2 mt-2 mini-bars">
            <div class="bar-bg"><div class="bar-fill" style="width:${qPct}%;background:var(--color-score-purple);"></div></div>
            <div class="bar-bg"><div class="bar-fill" style="width:${iPct}%;background:var(--color-score-blue);"></div></div>
            <div class="bar-bg"><div class="bar-fill" style="width:${aPct}%;background:var(--color-score-green);"></div></div>
          </div>
        </div>`;
    }).join('')}</div>`;
    wireCardSparklines();
    wireFavoriteButtons();
  }

  function th(label, key) {
    const active = state.sort.key === key;
    const dir = state.sort.dir;
    const arrow = active ? (dir === 'asc' ? '↑' : '↓') : '';
    return `<th class="sort-header" data-sort="${key}">${label} <span class="sort-indicator">${arrow}</span></th>`;
  }

  // Color helpers per blueprint/company rules
  function colorForPercent(pct) {
    if (pct >= 80) return 'var(--color-score-purple)';
    if (pct >= 74) return 'var(--color-score-blue)';
    if (pct >= 65) return 'var(--color-score-green)';
    if (pct >= 55) return 'var(--color-score-yellow)';
    if (pct >= 32) return 'var(--color-score-orange)';
    return 'var(--color-score-red)';
  }
  // Mini visuals sourced via tiny helpers
  function miniQualitySVG(score) { return (window.MiniVisuals && window.MiniVisuals.quality) ? window.MiniVisuals.quality(score) : ''; }
  function miniIdqSVG(score) { return (window.MiniVisuals && window.MiniVisuals.idq) ? window.MiniVisuals.idq(score) : ''; }
  function miniAfSVG(score) { return (window.MiniVisuals && window.MiniVisuals.af) ? window.MiniVisuals.af(score) : ''; }

  function renderList(list) {
    const cont = byId('content-container');
    if (!cont) return;
    if (!list.length) { cont.innerHTML = `<div class="mini-meta">No results</div>`; return; }
    cont.innerHTML = list.map(x => {
      const priceStr = x.price != null ? window.Formatters.formatCurrency(x.price, 2, x.currency) : '—';
      const mcapStr = x.marketCap != null ? window.Formatters.formatMarketCap(x.marketCap, x.currency) : '—';
      const updated = x.lastUpdatedText || '';
      const hover = `Overall ${x.overall.toFixed(1)} | Q ${x.quality}/109 | IDQ ${x.idq}/12 | AF ${x.af}/17`;
      const overallPct = x.overall; // already 0..100
      const overallColor = colorForPercent(overallPct);
      const tier = tierName(x.overall);
      const tierColor = overallColor;
      const tierTooltip = `Tier: ${tier} • Overall = 40% Q, 35% IDQ, 25% AF • Ranges: ≥80 purple, ≥74 blue, ≥65 green, ≥55 yellow, ≥32 orange, else red`;
      const fav = state.favorites.has(x.ticker);
      return `
        <div class="glass-morphism list-row-card rounded-xl p-3 mb-2 block text-inherit no-underline" data-tooltip="${hover}">
          <a class="block" href="/company-card-fixed.html?ticker=${encodeURIComponent(x.ticker)}">
          <div class="flex items-start gap-3">
            ${logoTag(x)}
            <div class="min-w-0">
              <div class="list-row-title" style="font-weight:600;">${x.ticker} • ${x.name}</div>
            </div>
            <div class="ml-auto list-meta flex items-center gap-3">
              <div class="mini-meta">${priceStr}</div>
              <div class="mini-meta">${mcapStr}</div>
              <div class="mini-meta">Updated: ${updated}</div>
              <button class="fav-btn" data-ticker="${x.ticker}" aria-label="Toggle favorite" aria-pressed="${fav ? 'true' : 'false'}" data-tooltip="Toggle favorite" style="background:transparent;border:none;color:${fav?'#f5c518':'var(--color-text-secondary)'};cursor:pointer;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
              </button>
            </div>
          </div>
          <div class="flex items-center gap-4 mt-2 text-xs">
            <div class="flex items-center gap-2"><span>${miniQualitySVG(x.quality)}</span><span class="mini-meta"><strong>Q</strong> ${x.quality}/109</span></div>
            <div class="flex items-center gap-2"><span>${miniIdqSVG(x.idq)}</span><span class="mini-meta"><strong>IDQ</strong> ${x.idq}/12</span></div>
            <div class="flex items-center gap-2"><span>${miniAfSVG(x.af)}</span><span class="mini-meta"><strong>AF</strong> ${x.af}/17</span></div>
            <div class="ml-auto flex items-center gap-2">
              <div class="mini-meta" style="font-weight:600;color:${overallColor}">Overall ${x.overall.toFixed(1)}</div>
              <span class="tier-badge-mini" data-tooltip="${tierTooltip}"><span class="dot" style="color:${tierColor};background:${tierColor}"></span><span>${tier}</span></span>
            </div>
          </div>
          </a>
        </div>`;
    }).join('');
    wireFavoriteButtons();
  }

  function renderTable(list) {
    const cont = byId('content-container');
    if (!cont) return;
    if (!list.length) { cont.innerHTML = `<div class="mini-meta">No results</div>`; return; }
    cont.innerHTML = `
      <div class="data-table-container">
        <table class="data-table">
          <thead><tr>
            ${th('Ticker','ticker')}
            ${th('Company','name')}
            ${th('Sector','sector')}
            ${th('Industry','industry')}
            ${th('Market Cap','marketCap')}
            ${th('Overall','overall')}
            ${th('Quality','quality')}
            ${th('IDQ','idq')}
            ${th('AF','af')}
            ${th('P/E','metrics.pe')}
            ${th('EV/EBITDA','metrics.evEbitda')}
            ${th('Op. Margin %','metrics.operatingMargin')}
            ${th('Net Margin %','metrics.netMargin')}
            ${th('Rev. Growth %','metrics.revGrowth')}
            ${th('EPS Growth %','metrics.epsGrowth')}
            ${th('Price','price')}
            ${th('Updated','lastUpdateDate')}
          </tr></thead>
          <tbody>
            ${list.map(x => `
              <tr>
                <td class="ticker-cell"><a href="/company-card-fixed.html?ticker=${encodeURIComponent(x.ticker)}">${x.ticker}</a></td>
                <td>${x.name}</td>
                <td>${x.sector || ''}</td>
                <td>${x.industry || ''}</td>
                <td>${x.marketCap != null ? window.Formatters.formatMarketCap(x.marketCap, x.currency) : 'N/A'}</td>
                <td>${x.overall.toFixed(1)}</td>
                <td>${x.quality}</td>
                <td>${x.idq}</td>
                <td>${x.af}</td>
                <td>${x.metrics.pe != null ? Number(x.metrics.pe).toFixed(1) : 'N/A'}</td>
                <td>${x.metrics.evEbitda != null ? Number(x.metrics.evEbitda).toFixed(1) : 'N/A'}</td>
                <td>${x.metrics.operatingMargin != null ? Number(x.metrics.operatingMargin).toFixed(1) : 'N/A'}</td>
                <td>${x.metrics.netMargin != null ? Number(x.metrics.netMargin).toFixed(1) : 'N/A'}</td>
                <td>${x.metrics.revGrowth != null ? Number(x.metrics.revGrowth).toFixed(1) : 'N/A'}</td>
                <td>${x.metrics.epsGrowth != null ? Number(x.metrics.epsGrowth).toFixed(1) : 'N/A'}</td>
                <td>${x.price != null ? window.Formatters.formatCurrency(x.price, 2, x.currency) : 'N/A'}</td>
                <td>${x.lastUpdatedText ? x.lastUpdatedText : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
    cont.querySelectorAll('.sort-header').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort');
        if (state.sort.key === key) state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
        else { state.sort.key = key; state.sort.dir = (key === 'name' || key === 'sector' || key === 'industry') ? 'asc' : 'desc'; }
        render();
      });
    });
  }

  function renderMeta() {
    const meta = byId('dataset-meta');
    if (!meta) return;
    meta.textContent = `${state.filtered.length} of ${state.all.length}`;
  }

  function render() {
    applyFilters();
    sortList();
    const slice = paginateList();
    renderMeta();
    if (state.view === 'grid') renderGrid(slice);
    else if (state.view === 'list') renderList(slice);
    else renderTable(slice);
    // After render, attach recent-company tracking on link click
    try {
      document.querySelectorAll('a[href*="company-card-fixed.html?ticker="]').forEach(a => {
        a.addEventListener('click', () => {
          const url = new URL(a.href, window.location.href);
          const t = url.searchParams.get('ticker');
          const x = state.filtered.find(it => it.ticker === t);
          if (t && x && window.DataService && typeof window.DataService.addRecentCompany === 'function') {
            window.DataService.addRecentCompany({ ticker: x.ticker, companyName: x.name, website: x.website });
          }
        }, { once: true });
      });
    } catch (_) {}
  }

  const FAV_KEY = 'indexFavorites';
  function loadFavorites() {
    try { state.favorites = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); } catch (_) { state.favorites = new Set(); }
  }
  function saveFavorites() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(state.favorites))); } catch (_) {}
  }
  function wireFavoriteButtons() {
    document.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const t = btn.getAttribute('data-ticker');
        if (!t) return;
        if (state.favorites.has(t)) state.favorites.delete(t); else state.favorites.add(t);
        saveFavorites();
        // Toggle color
        btn.style.color = state.favorites.has(t) ? '#f5c518' : getComputedStyle(document.body).getPropertyValue('--color-text-secondary');
        // Reflect accessibility state
        btn.setAttribute('aria-pressed', state.favorites.has(t) ? 'true' : 'false');
      });
    });
  }

  function buildHoverSummary(x) {
    const num = (v) => v == null ? '—' : parseFloat(String(v).replace(/%/g,'')).toFixed(1);
    const pct = (v) => v == null ? '—' : `${parseFloat(String(v).replace(/%/g,'')).toFixed(1)}%`;
    const html = `
      <div class="tooltip-title">${x.ticker} • ${x.name}</div>
      <div class="tooltip-grid">
        <div>Overall</div><div>${x.overall.toFixed(1)}</div>
        <div>Quality</div><div>${x.quality}/109</div>
        <div>IDQ</div><div>${x.idq}/12</div>
        <div>Anti‑Fragile</div><div>${x.af}/17</div>
        <div>Market Cap</div><div>${x.marketCap != null ? window.Formatters.formatMarketCap(x.marketCap, x.currency) : '—'}</div>
        <div>P/E</div><div>${num(x.metrics.pe)}</div>
        <div>EV/EBITDA</div><div>${num(x.metrics.evEbitda)}</div>
        <div>Op. Margin</div><div>${pct(x.metrics.operatingMargin)}</div>
        <div>Net Margin</div><div>${pct(x.metrics.netMargin)}</div>
        <div>Rev. Growth</div><div>${pct(x.metrics.revGrowth)}</div>
        <div>EPS Growth</div><div>${pct(x.metrics.epsGrowth)}</div>
      </div>`;
    return html.replace(/\n/g,' ');
  }

  // Hover sparkline logic (Canvas 2D, fetch data from function if available)
  const chartCache = {};
  function wireCardSparklines() {
    const cont = byId('content-container');
    if (!cont) return;
    cont.addEventListener('mouseenter', (e) => {
      const card = e.target.closest('.preview-card');
      if (!card) return;
      const t = card.getAttribute('data-ticker');
      if (!t) return;
      fetchAndDrawMiniChart(t);
    }, true);
  }
  async function fetchAndDrawMiniChart(ticker) {
    const canvas = byId(`chart-${ticker}`);
    if (!canvas) return;
    if (chartCache[ticker]) return drawMiniChart(canvas, chartCache[ticker]);
    const url = `https://getchartdata-py46mxz5aq-uc.a.run.app?ticker=${encodeURIComponent(ticker)}&timeframe=1M`;
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      const json = await resp.json();
      const data = Array.isArray(json?.data) ? json.data : [];
      if (data.length) { chartCache[ticker] = data; drawMiniChart(canvas, data); }
    } catch (_) { /* silent fail, no chart */ }
  }
  function drawMiniChart(canvas, data) {
    const ctx = canvas.getContext('2d');
    const prices = [...data].reverse().map(d => parseFloat(d.close));
    const isUp = prices[prices.length - 1] >= prices[0];
    const upColor = getComputedStyle(document.body).getPropertyValue('--chart-positive')?.trim() || 'rgba(34,197,94,.8)';
    const downColor = getComputedStyle(document.body).getPropertyValue('--chart-negative')?.trim() || 'rgba(239,68,68,.8)';
    const upFill = 'rgba(34,197,94,.25)';
    const downFill = 'rgba(239,68,68,.25)';
    const w = canvas.width = canvas.parentElement.offsetWidth;
    const h = canvas.height = canvas.parentElement.offsetHeight;
    const max = Math.max(...prices), min = Math.min(...prices), r = (max - min) || 1;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.moveTo(0, h - ((prices[0] - min)/r)*h);
    prices.forEach((p,i) => {
      const x = (i/(prices.length-1))*w; const y = h - ((p-min)/r)*h; ctx.lineTo(x,y);
    });
    ctx.strokeStyle = isUp ? upColor : downColor; ctx.lineWidth = 2; ctx.stroke();
    const g = ctx.createLinearGradient(0,0,0,h); g.addColorStop(0, isUp? upFill: downFill); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  }

  function wireViewToggles() {
    const g = byId('view-toggle-grid');
    const l = byId('view-toggle-list');
    const t = byId('view-toggle-table');
    if (g) g.addEventListener('click', () => { state.view = 'grid'; render(); g.setAttribute('aria-pressed','true'); l.removeAttribute('aria-pressed'); t.removeAttribute('aria-pressed'); });
    if (l) l.addEventListener('click', () => { state.view = 'list'; render(); l.setAttribute('aria-pressed','true'); g.removeAttribute('aria-pressed'); t.removeAttribute('aria-pressed'); });
    if (t) t.addEventListener('click', () => { state.view = 'table'; render(); t.setAttribute('aria-pressed','true'); g.removeAttribute('aria-pressed'); l.removeAttribute('aria-pressed'); });
  }

  function wirePagination() {
    const prev = byId('prev-page');
    const next = byId('next-page');
    const per = byId('items-per-page');
    if (prev) prev.addEventListener('click', () => { if (state.page > 1) { state.page--; render(); } });
    if (next) next.addEventListener('click', () => { const pages = Math.ceil(state.filtered.length / state.perPage); if (state.page < pages) { state.page++; render(); } });
    if (per) per.addEventListener('change', () => { state.perPage = parseInt(per.value,10) || 24; state.page = 1; render(); });
  }

  function wireSidebarSearch() {
    const input = byId('sidebar-search');
    const results = byId('sidebar-search-results');
    if (!input || !results) return;
    let to = null;
    input.addEventListener('input', (e) => {
      const q = String(e.target.value || '');
      state.search = q;
      render();
      clearTimeout(to);
      if (q.trim().length < 2) { results.style.display = 'none'; results.innerHTML=''; return; }
      to = setTimeout(async () => {
        try {
          const items = await window.DataService.searchStocks(q.trim());
          results.innerHTML = `<div class="search-results-list">${items.slice(0,10).map(r => `<div class=\"search-result-item\" data-ticker=\"${r.ticker}\"><div class=\"search-result-main\"><div class=\"search-result-ticker\">${r.ticker}</div><div class=\"search-result-name\">${r.name}</div></div>${r.score ? `<div class=\"search-result-score\">${r.score}</div>` : ''}</div>`).join('')}</div>`;
          results.style.display = 'block';
          results.querySelectorAll('.search-result-item').forEach((el) => {
            el.addEventListener('click', () => {
              const t = el.getAttribute('data-ticker');
              input.value = t;
              state.search = t;
              results.style.display = 'none';
              render();
            });
          });
        } catch (_) { results.style.display = 'none'; }
      }, 250);
    });
    input.addEventListener('focus', () => { if (results.innerHTML) results.style.display = 'block'; });
    input.addEventListener('blur', () => setTimeout(()=>{ results.style.display = 'none'; }, 150));
  }

  function wireMobileSort() {
    const sel = byId('mobile-sort');
    if (!sel) return;
    sel.addEventListener('change', () => {
      const val = sel.value; // format key-dir
      const [key, dir] = val.split('-');
      state.sort.key = key; state.sort.dir = dir;
      // Reflect on chips (arrow + active)
      const bar = byId('quick-sort-chips');
      if (bar) {
        bar.querySelectorAll('button[data-sort]').forEach(b => {
          const base = b.getAttribute('data-label') || b.textContent.trim();
          const isActive = b.getAttribute('data-sort').startsWith(key);
          b.setAttribute('data-sort', `${key}-${dir}`);
          b.classList.toggle('active', isActive);
          b.textContent = isActive ? base + (dir === 'asc' ? ' ↑' : ' ↓') : base;
        });
      }
      render();
    });
  }

  function readNum(id) { const el = byId(id); if (!el) return null; const v = el.value; if (v === '' || v == null) return null; const n = parseFloat(v); return isNaN(n) ? null : n; }

  function wireFilters() {
    const apply = byId('apply-filters');
    const reset = byId('reset-filters');
    const openFilters = byId('open-filters');
    if (apply) apply.addEventListener('click', () => {
      state.filters.sector = (byId('filter-sector')?.value) || '';
      state.filters.industry = (byId('filter-industry')?.value) || '';
      state.filters.marketCap = (byId('filter-marketcap')?.value) || '';
      state.filters.overall.min = readNum('filter-overall-min');
      state.filters.overall.max = readNum('filter-overall-max');
      state.filters.quality.min = readNum('filter-quality-min');
      state.filters.quality.max = readNum('filter-quality-max');
      state.filters.idq.min = readNum('filter-idq-min');
      state.filters.idq.max = readNum('filter-idq-max');
      state.filters.af.min = readNum('filter-af-min');
      state.filters.af.max = readNum('filter-af-max');
      state.page = 1;
      saveFilterPrefs();
      render();
    });
    if (reset) reset.addEventListener('click', () => {
      const ids = ['filter-sector','filter-industry','filter-marketcap','filter-overall-min','filter-overall-max','filter-quality-min','filter-quality-max','filter-idq-min','filter-idq-max','filter-af-min','filter-af-max'];
      ids.forEach(id => { const el = byId(id); if (el) el.value = ''; });
      state.filters = { sector:'', industry:'', marketCap:'', overall:{min:null,max:null}, quality:{min:null,max:null}, idq:{min:null,max:null}, af:{min:null,max:null} };
      state.search = '';
      const si = byId('sidebar-search'); if (si) si.value='';
      state.page = 1;
      saveFilterPrefs();
      render();
    });
    const sectorSel = byId('filter-sector');
    if (sectorSel) sectorSel.addEventListener('change', () => {
      updateIndustryOptionsForSector(sectorSel.value || '');
    });
    if (openFilters) openFilters.addEventListener('click', () => {
      const sidebar = document.getElementById('universal-sidebar-container');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar && overlay) {
        sidebar.classList.add('active'); overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  }

  const PREFS_KEY = 'indexFiltersV1';
  function saveFilterPrefs() {
    try {
      const payload = { filters: state.filters, sort: state.sort, perPage: state.perPage, view: state.view, favOnly: state.filterFavorites };
      localStorage.setItem(PREFS_KEY, JSON.stringify(payload));
    } catch (_) {}
  }
  function loadFilterPrefs() {
    try {
      const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
      if (!raw) return;
      state.filters = Object.assign(state.filters, raw.filters || {});
      state.sort = Object.assign(state.sort, raw.sort || {});
      if (raw.perPage) state.perPage = raw.perPage;
      if (raw.view) state.view = raw.view;
      if (typeof raw.favOnly === 'boolean') state.filterFavorites = raw.favOnly;
      // Reflect to UI
      const setVal = (id, val) => { const el = byId(id); if (el && val != null) el.value = val; };
      setVal('filter-sector', state.filters.sector);
      updateIndustryOptionsForSector(state.filters.sector);
      setVal('filter-industry', state.filters.industry);
      setVal('filter-marketcap', state.filters.marketCap);
      setVal('filter-overall-min', state.filters.overall.min);
      setVal('filter-overall-max', state.filters.overall.max);
      setVal('filter-quality-min', state.filters.quality.min);
      setVal('filter-quality-max', state.filters.quality.max);
      setVal('filter-idq-min', state.filters.idq.min);
      setVal('filter-idq-max', state.filters.idq.max);
      setVal('filter-af-min', state.filters.af.min);
      setVal('filter-af-max', state.filters.af.max);
      const per = byId('items-per-page'); if (per) per.value = String(state.perPage);
    } catch (_) {}
  }

  function wireExport() {
    const btn = byId('export-csv');
    if (!btn) return;
    btn.addEventListener('click', () => {
      // Ensure we export the current filtered set (all, not just current page)
      const rows = [['Ticker','Company Name','Sector','Industry','Overall','Tier','Quality','IDQ','Anti-Fragile','Market Cap','Price','Website']].concat(
        state.filtered.map(x => [x.ticker, x.name, x.sector||'', x.industry||'', x.overall.toFixed(1), tierName(x.overall), x.quality, x.idq, x.af, x.marketCap != null ? x.marketCap : '', x.price != null ? x.price : '', x.website||''])
      );
      const csv = rows.map(r => r.map(v => {
        const s = String(v==null?'':v).replace(/"/g,'""');
        return s.includes(',') ? `"${s}"` : s;
      }).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'finalysis_companies.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  function wireFavoritesOnly() {
    const btn = byId('favorites-only-toggle'); if (!btn) return;
    const reflect = () => {
      btn.classList.toggle('active', !!state.filterFavorites);
      btn.setAttribute('aria-pressed', state.filterFavorites ? 'true' : 'false');
      btn.setAttribute('data-tooltip', state.filterFavorites ? 'Show all' : 'Show favorites only');
      const ind = document.getElementById('fav-only-indicator');
      if (ind) ind.style.display = state.filterFavorites ? 'block' : 'none';
    };
    reflect();
    btn.addEventListener('click', () => {
      state.filterFavorites = !state.filterFavorites;
      saveFilterPrefs();
      reflect();
      render();
    });
  }

  function wireQuickSortChips() {
    const bar = byId('quick-sort-chips');
    if (!bar) return;
    // reflect current sort
    const reflect = () => {
      const current = `${state.sort.key}-${state.sort.dir}`;
      bar.querySelectorAll('button[data-sort]').forEach(b => {
        const base = b.getAttribute('data-label') || b.textContent.trim();
        const isActive = b.getAttribute('data-sort') === current;
        b.classList.toggle('active', isActive);
        if (isActive) {
          const arrow = state.sort.dir === 'asc' ? ' ↑' : ' ↓';
          const sr = state.sort.dir === 'asc' ? '<span class="sr-only"> ascending</span>' : '<span class="sr-only"> descending</span>';
          b.innerHTML = `${base}${arrow}${sr}`;
        } else {
          b.textContent = base;
        }
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    };
    reflect();
    bar.querySelectorAll('button[data-sort]').forEach(btn => {
      btn.addEventListener('click', () => {
        // Toggle direction if clicking same key; else pick a sensible default
        const attr = btn.getAttribute('data-sort') || '';
        const [key] = attr.split('-');
        let newDir = 'desc';
        if (state.sort.key === key) {
          newDir = state.sort.dir === 'desc' ? 'asc' : 'desc';
        } else {
          // default: strings asc, numbers desc
          newDir = (key === 'name' || key === 'sector' || key === 'industry') ? 'asc' : 'desc';
        }
        state.sort.key = key; state.sort.dir = newDir; state.page = 1;
        btn.setAttribute('data-sort', `${key}-${newDir}`);
        reflect();
        render();
      });
    });
  }

  async function init() {
    try {
      loadFavorites();
      await loadData();
      populateSectorFilter();
      populateIndustryFilter();
      loadFilterPrefs();
      wireViewToggles();
      wirePagination();
      wireQuickSortChips();
      wireMobileSort();
      wireFilters();
      wireFavoritesOnly();
      wireExport();
      document.addEventListener('keydown', (e) => {
        if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) {
          e.preventDefault();
          const el = byId('global-search') || byId('sidebar-search');
          if (el) el.focus();
        }
      });
      render();
    } catch (e) {
      const cont = byId('content-container');
      if (cont) cont.innerHTML = `<div class="mini-meta">Failed to load data. Please refresh.</div>`;
      console.error('Index init failed', e);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
