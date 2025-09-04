(function() {
  function onThemeChanged() {
    // Placeholder: grid uses CSS variables; no explicit redraw needed.
  }
  function init() {
    window.addEventListener('themeChanged', onThemeChanged);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.IndexController = { init };
})();

