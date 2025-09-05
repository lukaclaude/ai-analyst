// DataService: recent companies + Firestore init + search + simple pub/sub

(function() {
  const RECENT_KEY = 'recentCompanies';
  const SEARCH_CACHE_KEY = 'searchIndexCacheV2';
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  const listeners = new Set();

  let db = null;
  let searchIndex = null; // in-memory [{ticker,name,score?}]
  let lastIndexAt = 0;

  const firebaseConfig = {
    apiKey: "AIzaSyAjllbzGx8QK3L7mePVk0uZ0R-ccenxElA",
    authDomain: "sheets-to-firestore-sync-v2.firebaseapp.com",
    projectId: "sheets-to-firestore-sync-v2",
    storageBucket: "sheets-to-firestore-sync-v2.firebasestorage.app",
    messagingSenderId: "1035123111291",
    appId: "1:1035123111291:web:30c0f5ee30f001c1a739de",
    measurementId: "G-QQW25R6FB8"
  };

  function initFirestore() {
    if (typeof firebase === 'undefined') throw new Error('Firebase not loaded');
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    if (!db) db = firebase.firestore();
    return db;
  }

  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
    catch { return []; }
  }

  function setRecent(list) {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    listeners.forEach((cb) => { try { cb(list); } catch (_) {} });
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

  function loadIndexFromCache() {
    try {
      const raw = JSON.parse(localStorage.getItem(SEARCH_CACHE_KEY) || 'null');
      if (raw && Array.isArray(raw.index) && raw.ts && (Date.now() - raw.ts) < CACHE_TTL_MS) {
        searchIndex = raw.index;
        lastIndexAt = raw.ts;
      }
    } catch (_) {}
  }

  function saveIndexToCache() {
    try {
      localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify({ index: searchIndex, ts: Date.now() }));
    } catch (_) {}
  }

  async function buildSearchIndex() {
    if (searchIndex && (Date.now() - lastIndexAt) < CACHE_TTL_MS) return searchIndex;
    if (!db) initFirestore();
    // Try cache first
    if (!searchIndex) loadIndexFromCache();
    if (searchIndex && (Date.now() - lastIndexAt) < CACHE_TTL_MS) return searchIndex;
    const snapshot = await db.collection('stocks').get();
    const idx = [];
    snapshot.forEach((doc) => {
      const d = doc.data();
      const ticker = d?.Portfolio?.ticker;
      const name = d?.Portfolio?.companyName;
      if (!ticker || !name) return;
      // Website host for tiny logos in search
      let websiteHost = '';
      try {
        const raw = d?.API_Financials?.General?.companyWebsite || d?.Portfolio?.companyWebsite || '';
        if (raw) {
          try { websiteHost = new URL(raw).hostname; }
          catch { websiteHost = new URL('https://' + raw).hostname; }
        }
      } catch (_) { websiteHost = ''; }
      // Compute overall using unified formula: 40% Q + 35% IDQ + 25% AF
      const qRaw = parseFloat(d?.Portfolio?.qualityScore) || 0;
      const idqRaw = parseFloat(d?.LLM_Reports?.IDQ_Report?.idqScore) || 0;
      const afRaw = parseFloat(d?.Anti_Fragile_Score?.totalScore) || 0;
      const qPct = Math.max(0, Math.min(100, (qRaw/109)*100));
      const iPct = Math.max(0, Math.min(100, ((idqRaw + 3)/15)*100));
      const aPct = Math.max(0, Math.min(100, ((afRaw + 7)/24)*100));
      const overall = (qPct*0.40) + (iPct*0.35) + (aPct*0.25);
      idx.push({ ticker, name, score: isNaN(overall) ? 0 : parseFloat(overall.toFixed(1)), websiteHost });
    });
    searchIndex = idx;
    lastIndexAt = Date.now();
    saveIndexToCache();
    return idx;
  }

  async function searchStocks(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];
    await buildSearchIndex();
    const results = searchIndex
      .filter(r => r.ticker.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))
      .sort((a,b) => {
        if (a.ticker.toLowerCase() === q) return -1;
        if (b.ticker.toLowerCase() === q) return 1;
        return (b.score||0) - (a.score||0);
      })
      .slice(0, 20);
    return results;
  }

  window.DataService = {
    // recents
    getRecentCompanies: getRecent,
    addRecentCompany: addRecent,
    subscribeRecent,
    // firestore
    initFirestore,
    searchStocks,
  };
})();
