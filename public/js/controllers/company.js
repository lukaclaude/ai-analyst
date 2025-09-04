(function() {
  function refreshChartsAndText() {
    try {
      if (!window.state || !window.state.currentStockData) return;
      if (typeof window.createEarningsChart === 'function') {
        try { window.createEarningsChart(window.currentChartMetric); } catch(_) {}
      }
      const d = window.state.currentStockData || {};
      const q = d?.Portfolio?.Quality_Score || 0;
      const i = d?.LLM_Reports?.IDQ_Report?.totalIDQScore || 0;
      const a = d?.Anti_Fragile_Score?.totalScore || 0;
      if (typeof window.calculateCompanyTier === 'function' && typeof window.drawScoreBreakdownChart === 'function') {
        const tier = window.calculateCompanyTier(q, i, a);
        window.drawScoreBreakdownChart(q, i, a, tier);
      }
      const cs = getComputedStyle(document.body);
      const textPrimary = (cs.getPropertyValue('--color-text-primary') || '#E6EDF3').trim();
      const qEl = document.getElementById('quality-score-value');
      if (qEl) qEl.style.color = textPrimary;
      const idqEl = document.getElementById('idq-score-value');
      if (idqEl) idqEl.setAttribute('fill', textPrimary);
      const afEl = document.getElementById('antifragile-score-value');
      if (afEl) { afEl.setAttribute('fill', textPrimary); afEl.style.color = textPrimary; }
    } catch (_) {}
  }

  function onThemeChanged() {
    try { if (typeof updateCompactHeroBar === 'function') updateCompactHeroBar(true); } catch(_) {}
    refreshChartsAndText();
  }
  function onResizeOrOrientation() {
    requestAnimationFrame(() => {
      try { if (typeof updateCompactHeroBar === 'function') updateCompactHeroBar(true); } catch(_) {}
      try { if (window.state && window.state.currentStockData && typeof window.createEarningsChart === 'function') window.createEarningsChart(window.currentChartMetric); } catch(_) {}
    });
  }

  function init() {
    window.addEventListener('themeChanged', onThemeChanged);
    window.addEventListener('resize', onResizeOrOrientation);
    window.addEventListener('orientationchange', onResizeOrOrientation);
    onResizeOrOrientation();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.CompanyController = { init };
})();
