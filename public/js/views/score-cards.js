// Score Cards View: orchestrates card reveal panel and tabs
// Depends on window.CompanyCard.state and existing generators

(function() {
  let currentRevealed = null;

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
    try {
      const header = document.querySelector('#universal-header') || document.querySelector('.universal-header');
      const tabs = panel.querySelector('.panel-tabs');
      const active = document.querySelector('.detail-section.active');
      const chips = active ? (active.querySelector('.quality-group-tabs') || active.querySelector('.af-group-tabs')) : null;
      const uh = header ? header.offsetHeight : 52;
      const th = tabs ? tabs.offsetHeight : 48;
      const ch = chips ? chips.offsetHeight : 0; // no chips for IDQ or when hidden
      panel.style.setProperty('--uh', uh + 'px');
      panel.style.setProperty('--tabs-h', th + 'px');
      panel.style.setProperty('--chips-h', ch + 'px');
    } catch (_) {}
    // Mobile: replace cards view with details view
    if (window.innerWidth <= 768) {
      const sec = document.querySelector('.scores-section');
      if (sec) sec.classList.add('details-open');
      const closeBtn = document.getElementById('panel-tab-close');
      if (closeBtn) closeBtn.textContent = 'Back';
      // Scroll section into view for immediate context
      const sectionEl = document.querySelector('.scores-section');
      if (sectionEl) sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      if (btn) { const target = btn.getAttribute('data-target'); if (target) revealScoreDetails(target); }
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

  window.ScoreCardsView = { revealScoreDetails, setupPanelTabs, updatePanelTabsActive, setupMobileCarousel };
  // Maintain global for inline handlers
  window.revealScoreDetails = revealScoreDetails;
  window.addEventListener('resize', () => { try { setupMobileCarousel(); } catch (_) {} });
})();
