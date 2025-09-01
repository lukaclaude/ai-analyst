// ThemeService: single source of truth for theme state (light/dark)
// - Applies body class
// - Persists to localStorage
// - Emits `themeChanged` CustomEvent on window with { theme }

(function() {
  const STORAGE_KEY = 'theme';
  const LIGHT_CLASS = 'light-theme';

  function getStoredTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  }

  function applyTheme(theme) {
    if (theme === 'light') document.body.classList.add(LIGHT_CLASS);
    else document.body.classList.remove(LIGHT_CLASS);
    localStorage.setItem(STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
  }

  function getCurrentTheme() {
    return document.body.classList.contains(LIGHT_CLASS) ? 'light' : 'dark';
  }

  function setTheme(theme) {
    const t = theme === 'light' ? 'light' : 'dark';
    applyTheme(t);
  }

  function toggle() {
    const next = getCurrentTheme() === 'light' ? 'dark' : 'light';
    applyTheme(next);
  }

  function init() {
    // Apply stored theme on load (idempotent)
    const stored = getStoredTheme();
    if (stored === 'light') document.body.classList.add(LIGHT_CLASS);
    else document.body.classList.remove(LIGHT_CLASS);
  }

  // Expose globally
  window.ThemeService = {
    init,
    getCurrentTheme,
    setTheme,
    toggle,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

