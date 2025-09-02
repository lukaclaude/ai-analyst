// Analysis View wrapper: delegates to existing implementation
(function() {
  function render() {
    if (typeof window.populateAnalysis === 'function') {
      window.populateAnalysis();
    } else {
      console.warn('populateAnalysis() not found');
    }
  }
  window.AnalysisView = { render };
})();

