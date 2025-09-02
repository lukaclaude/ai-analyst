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
      currentRevealed = null; return;
    }
    if (!activeSection.innerHTML || activeSection.innerHTML.trim() === '') {
      if (typeof window.generateExpandedContent === 'function') {
        activeSection.innerHTML = window.generateExpandedContent(scoreType);
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
    currentRevealed = scoreType;
    try { updatePanelTabsActive(); } catch (_) {}
    if (window.innerWidth <= 768) { setTimeout(() => { panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100); }
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

