// Score Cards View: orchestrates card reveal panel and tabs
// Depends on window.CompanyCard.state and existing generators

(function() {
  let currentRevealed = null;

  // Measure sticky heights after layout and set CSS vars
  function updateStickyVars() {
    const panel = document.getElementById('score-revelation-panel');
    if (!panel) return;
    // Defer to next frame to ensure DOM is painted and offsets are correct
    requestAnimationFrame(() => {
      try {
        const header = document.querySelector('#universal-header') || document.querySelector('.universal-header');
        const tabs = panel.querySelector('.panel-tabs');
        const active = document.querySelector('.detail-section.active');
        const chips = active ? (active.querySelector('.quality-group-tabs') || active.querySelector('.af-group-tabs')) : null;
        const uh = header ? header.offsetHeight : 52;
        const th = tabs ? tabs.offsetHeight : 48;
        const ch = chips ? chips.offsetHeight : 0;
        // Detect if tabs are currently stuck beneath the header
        let tabsOffset = 0;
        if (tabs) {
          const rect = tabs.getBoundingClientRect();
          if (rect.top <= uh + 1) tabsOffset = uh; // add header height when stuck
        }
        panel.style.setProperty('--uh', uh + 'px');
        panel.style.setProperty('--tabs-h', th + 'px');
        panel.style.setProperty('--chips-h', ch + 'px');
        panel.style.setProperty('--tabs-offset', tabsOffset + 'px');
        // Fallback on root to help any global consumers
        document.documentElement.style.setProperty('--uh', uh + 'px');
        document.documentElement.style.setProperty('--tabs-h', th + 'px');
        document.documentElement.style.setProperty('--chips-h', ch + 'px');
        document.documentElement.style.setProperty('--tabs-offset', tabsOffset + 'px');
      } catch (_) {}
    });
  }

  function revealScoreDetails(scoreType) {
    const state = (window.CompanyCard && window.CompanyCard.state) || {};
    if (!state.currentStockData) { console.error('No stock data available'); return; }
    const panel = document.getElementById('score-revelation-panel');
    const allCards = document.querySelectorAll('.score-card');
    const activeCard = document.getElementById(`${scoreType}-card`);
    const allSections = document.querySelectorAll('.detail-section');
    const activeSection = document.getElementById(`${scoreType}-details`);
    if (!panel || !activeCard || !activeSection) { console.error('Required elements not found'); return; }
    if (currentRevealed === scoreType) {
      panel.classList.remove('revealed');
      allCards.forEach(card => {
        card.classList.remove('active', 'dimmed');
        const btn = card.querySelector('.reveal-text');
        if (btn) btn.textContent = 'View Details';
      });
      // Mobile: reveal cards grid again
      if (window.innerWidth <= 768) {
        const sec = document.querySelector('.scores-section');
        if (sec) sec.classList.remove('details-open');
        const closeBtn = document.getElementById('panel-tab-close');
        if (closeBtn) closeBtn.textContent = 'Collapse';
      }
      currentRevealed = null; return;
    }
    if (!activeSection.innerHTML || activeSection.innerHTML.trim() === '') {
      if (typeof window.generateExpandedContent === 'function') {
        activeSection.innerHTML = window.generateExpandedContent(scoreType);
      }
      // Default-open Financials for Quality so users land on useful content immediately
      if (scoreType === 'quality' && typeof window.showGroupDetails === 'function') {
        try { setTimeout(() => window.showGroupDetails('financials'), 0); } catch (_) {}
      }
      if (scoreType === 'antifragile' && typeof window.showAfGroupDetails === 'function') {
        try { setTimeout(() => window.showAfGroupDetails('sc'), 0); } catch (_) {}
      }
    }
    allCards.forEach(card => {
      const btn = card.querySelector('.reveal-text');
      if (card === activeCard) { card.classList.add('active'); card.classList.remove('dimmed'); if (btn) btn.textContent = 'Hide Details'; }
      else { card.classList.add('dimmed'); card.classList.remove('active'); if (btn) btn.textContent = 'View Details'; }
    });
    allSections.forEach(section => section.classList.remove('active'));
    activeSection.classList.add('active');
    const colorMap = { quality: '168, 85, 247', idq: '59, 130, 246', antifragile: '34, 197, 94' };
    panel.style.setProperty('--active-color-rgb', colorMap[scoreType]);
    panel.classList.add('revealed');
    // Toggle desktop layout classes for Quality and Anti-Fragile
    try {
      const content = panel.querySelector('.revelation-content');
      if (content) {
        content.classList.toggle('quality-layout', scoreType === 'quality');
        content.classList.toggle('af-layout', scoreType === 'antifragile');
      }
    } catch (_) {}
    // Measure sticky offsets for mobile to prevent overlap
    updateStickyVars();
    // Mobile: replace cards view with details view
    if (window.innerWidth <= 768) {
      const sec = document.querySelector('.scores-section');
      if (sec) sec.classList.add('details-open');
      const closeBtn = document.getElementById('panel-tab-close');
      if (closeBtn) { closeBtn.textContent = '✕'; closeBtn.setAttribute('aria-label','Close details'); }
      // Scroll section into view for immediate context
      const sectionEl = document.querySelector('.scores-section');
      if (sectionEl) sectionEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    currentRevealed = scoreType;
    try { updatePanelTabsActive(); } catch (_) {}
    // On desktop, ensure panel is visible; on mobile the sheet overlays
    if (window.innerWidth > 768) { setTimeout(() => { panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100); }
  }

  function setupPanelTabs() {
    const tabs = document.getElementById('panel-tabs');
    if (!tabs) return;
    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.panel-tab');
      const closeBtn = e.target.closest('#panel-tab-close');
      if (closeBtn) {
        const active = document.querySelector('.detail-section.active');
        if (active) { const type = active.id.replace('-details', ''); revealScoreDetails(type); }
        return;
      }
      if (btn) {
        const target = btn.getAttribute('data-target');
        if (target) {
          // On mobile, clicking the already-active tab should NOT close the panel; only the ✕ does
          if (window.innerWidth <= 768 && target === currentRevealed) { e.preventDefault(); return; }
          revealScoreDetails(target); updateStickyVars();
        }
      }
    });
  }

  function updatePanelTabsActive() {
    const tabs = document.getElementById('panel-tabs');
    if (!tabs) return;
    const active = document.querySelector('.detail-section.active');
    const activeId = active ? active.id.replace('-details', '') : null;
    tabs.querySelectorAll('.panel-tab').forEach((el) => {
      const t = el.getAttribute('data-target');
      const on = t === activeId; el.classList.toggle('active', on);
      if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
  }

  function setupMobileCarousel() {
    if (window.innerWidth > 768) return;
    const grid = document.querySelector('.score-cards-grid');
    if (!grid) return;
    let startX = 0; let scrollLeft = 0;
    grid.addEventListener('touchstart', (e) => { startX = e.touches[0].pageX - grid.offsetLeft; scrollLeft = grid.scrollLeft; });
    grid.addEventListener('touchmove', (e) => { const x = e.touches[0].pageX - grid.offsetLeft; const walk = (x - startX) * 2; grid.scrollLeft = scrollLeft - walk; });
    grid.addEventListener('scrollend', () => {
      const cards = grid.querySelectorAll('.score-card');
      const center = grid.scrollLeft + grid.offsetWidth / 2;
      cards.forEach(card => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        if (Math.abs(cardCenter - center) < card.offsetWidth / 2) {
          const scoreType = card.dataset.score; if (scoreType) revealScoreDetails(scoreType);
        }
      });
    });
  }

  window.ScoreCardsView = { revealScoreDetails, setupPanelTabs, updatePanelTabsActive, setupMobileCarousel, updateStickyVars };
  // Maintain global for inline handlers
  window.revealScoreDetails = revealScoreDetails;
  window.addEventListener('resize', () => { try { setupMobileCarousel(); updateStickyVars(); } catch (_) {} });
  window.addEventListener('orientationchange', () => { try { updateStickyVars(); } catch (_) {} });
  window.addEventListener('themeChanged', () => { try { updateStickyVars(); } catch (_) {} });
  // Light rAF-throttled scroll handler to keep --uh correct when header chip appears/disappears
  let __scvTicking = false;
  window.addEventListener('scroll', () => {
    if (__scvTicking) return;
    __scvTicking = true;
    requestAnimationFrame(() => { try { updateStickyVars(); } finally { __scvTicking = false; } });
  }, { passive: true });
})();
