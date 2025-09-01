// DataService (minimal): recent companies + simple pub/sub
// Intentionally does not duplicate Firestore init yet.

(function() {
  const KEY = 'recentCompanies';
  const listeners = new Set();

  function getRecent() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  }

  function setRecent(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
    listeners.forEach((cb) => {
      try { cb(list); } catch (_) {}
    });
  }

  function addRecent({ ticker, companyName, website }) {
    const list = getRecent().filter((c) => c.ticker !== ticker);
    list.unshift({ ticker, companyName, website });
    setRecent(list.slice(0, 5));
  }

  function subscribeRecent(cb) {
    if (typeof cb === 'function') listeners.add(cb);
    return () => listeners.delete(cb);
  }

  window.DataService = {
    getRecentCompanies: getRecent,
    addRecentCompany: addRecent,
    subscribeRecent,
  };
})();

