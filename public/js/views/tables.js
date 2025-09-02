// Detailed Financials View wrapper: delegates to existing implementation
(function() {
  function render(viewType) {
    if (typeof window.populateDetailedFinancials === 'function') {
      window.populateDetailedFinancials(viewType || 'income');
    } else {
      console.warn('populateDetailedFinancials() not found');
    }
  }
  window.TablesView = { render };
})();

