// Company Boot: thin bootstrap to wire views and delegate lifecycle to the controller
(function() {
  // H2: Lazy-load boundaries (tables)
  let __tablesLoaded = false;
  let __tablesLoading = null;
  function loadTablesView() {
    if (__tablesLoaded) return Promise.resolve();
    if (__tablesLoading) return __tablesLoading;
    __tablesLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = './js/views/tables.js';
      s.onload = () => { __tablesLoaded = true; resolve(); };
      s.onerror = (e) => { console.error('Failed to load tables view', e); reject(e); };
      document.head.appendChild(s);
    });
    return __tablesLoading;
  }

  // Provide a proxy so legacy calls work even before script loads
  const TablesViewProxy = {
    render: function(viewType) {
      return loadTablesView().then(() => {
        if (window.TablesView && typeof window.TablesView.render === 'function') {
          window.TablesView.render(viewType);
        }
      });
    }
  };

  function setupTablesLazyLoad() {
    // If already defined, do nothing; else set proxy
    if (!window.TablesView) window.TablesView = TablesViewProxy;
    // Skeleton content until loaded
    const container = document.getElementById('financial-data-content');
    if (container && !container.dataset.skeleton) {
      container.dataset.skeleton = '1';
      container.setAttribute('role','status');
      container.setAttribute('aria-live','polite');
      container.innerHTML = '<div class="text-center muted-heading" style="padding: 16px;">Loading financial tables…</div>';
    }
    // Observe the Detailed Financials section
    const section = document.getElementById('detailed-financials');
    if (!section || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting) {
        loadTablesView().then(() => {
          if (container && container.dataset.skeleton) delete container.dataset.skeleton;
          // Initial render if monolith didn't already call it
          if (window.state && window.state.currentStockData && window.TablesView && typeof window.TablesView.render === 'function') {
            try { window.TablesView.render('income'); } catch (_) {}
          }
        });
        io.disconnect();
      }
    }, { root: null, rootMargin: '200px 0px', threshold: 0.01 });
    io.observe(section);
  }

  function init() {
    try {
      // Wire score card tabs and initial sticky offsets
      if (window.ScoreCardsView && typeof window.ScoreCardsView.setupPanelTabs === 'function') {
        window.ScoreCardsView.setupPanelTabs();
      }
      if (window.ScoreCardsView && typeof window.ScoreCardsView.updateStickyVars === 'function') {
        window.ScoreCardsView.updateStickyVars();
      }
      if (window.ScoreCardsView && typeof window.ScoreCardsView.setupMobileCarousel === 'function') {
        window.ScoreCardsView.setupMobileCarousel();
      }
      // H2: lazy-load Detailed Financials tables
      setupTablesLazyLoad();
      // H2: defer earnings chart render until visible
      setupChartLazyLoad();
      // H2: defer mini price chart fetch until mini canvas is visible
      setupMiniChartLazyLoad();
    } catch (_) {}
  }

  // Lazy-load earnings chart drawing by deferring createEarningsChart until section is visible
  function setupChartLazyLoad() {
    const section = document.getElementById('performance-trends');
    if (!section || !('IntersectionObserver' in window)) return;
    window.__chartVisible = false;
    window.__pendingChartMetric = null;

    // Patch createEarningsChart to defer until visible
    function patchChartIfNeeded() {
      if (!window.createEarningsChart || window.__createEarningsChartPatched) return;
      window.__origCreateEarningsChart = window.createEarningsChart;
      window.createEarningsChart = function(metricType) {
        if (!window.__chartVisible) {
          window.__pendingChartMetric = metricType || window.currentChartMetric || 'revenue';
          // ensure canvas has a minimal placeholder size
          try {
            const c = document.getElementById('earnings-chart');
            if (c) { c.width = c.width; /* clears */ }
          } catch(_) {}
          return;
        }
        return window.__origCreateEarningsChart(metricType);
      };
      window.__createEarningsChartPatched = true;
    }

    // Poll briefly until function appears, then patch
    const maxWaitMs = 5000;
    const start = Date.now();
    const poll = setInterval(() => {
      patchChartIfNeeded();
      if (window.__createEarningsChartPatched || Date.now() - start > maxWaitMs) clearInterval(poll);
    }, 50);

    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (entry.isIntersecting) {
        window.__chartVisible = true;
        // If function is available and metric is pending, render now
        if (window.__origCreateEarningsChart) {
          const metric = window.__pendingChartMetric || window.currentChartMetric || 'revenue';
          try { window.__origCreateEarningsChart(metric); } catch(_) {}
        }
        io.disconnect();
      }
    }, { root: null, rootMargin: '200px 0px', threshold: 0.05 });
    io.observe(section);
  }

  function setupMiniChartLazyLoad() {
    const canvas = document.getElementById('mini-price-chart');
    if (!canvas || !('IntersectionObserver' in window)) return;
    window.__miniChartVisible = false;
    window.__pendingMiniArgs = null;

    function patchMiniIfNeeded() {
      if (!window.fetchAndDrawPriceChart || window.__miniPatched) return;
      window.__origFetchAndDrawPriceChart = window.fetchAndDrawPriceChart;
      window.fetchAndDrawPriceChart = function(ticker, timeframe) {
        if (!window.__miniChartVisible) {
          window.__pendingMiniArgs = [ticker, timeframe];
          return;
        }
        return window.__origFetchAndDrawPriceChart(ticker, timeframe);
      };
      window.__miniPatched = true;
    }

    const maxWaitMs = 5000;
    const start = Date.now();
    const poll = setInterval(() => {
      patchMiniIfNeeded();
      if (window.__miniPatched || Date.now() - start > maxWaitMs) clearInterval(poll);
    }, 50);

    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (entry.isIntersecting) {
        window.__miniChartVisible = true;
        if (window.__origFetchAndDrawPriceChart && window.__pendingMiniArgs) {
          try { window.__origFetchAndDrawPriceChart.apply(null, window.__pendingMiniArgs); } catch(_) {}
          window.__pendingMiniArgs = null;
        }
        io.disconnect();
      }
    }, { root: null, rootMargin: '100px 0px', threshold: 0.05 });
    io.observe(canvas);
  }

  // Expose and initialize on DOM ready
  window.CompanyBoot = { init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
