// Centralized alias helpers for common financial metrics
// Exposes window.Aliases with helpers that avoid N/A when alternates exist

(function() {
  function get(obj, path) {
    try {
      return path.split('.').reduce((acc, key) => acc && acc[key] != null ? acc[key] : undefined, obj);
    } catch (_) { return undefined; }
  }

  function pickFirst(obj, paths) {
    for (const p of paths) {
      const v = get(obj, p);
      if (v !== undefined && v !== null && v !== '' && v !== 'N/A') return v;
    }
    return null;
  }

  function toNumber(val) {
    if (val == null) return null;
    if (typeof val === 'string') {
      const s = val.replace(/,/g, '').replace(/%/g, '');
      const n = parseFloat(s);
      return isNaN(n) ? null : n;
    }
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  }

  function getRatio(ttm, keys) {
    const ratios = ttm?.Ratios || {};
    return pickFirst({ Ratios: ratios }, keys.map(k => `Ratios.${k}`));
  }

  function computeOperatingMargin(apiFinancials) {
    const ttm = apiFinancials?.TTM || {};
    const op = toNumber(ttm?.Income_Statement?.operatingIncome);
    const rev = toNumber(ttm?.Income_Statement?.revenue);
    if (op != null && rev && rev !== 0) return (op / rev) * 100;
    return null;
  }

  function computeRevenueGrowth(apiFinancials) {
    const ttm = apiFinancials?.TTM || {};
    const y1 = apiFinancials?.Y1 || {};
    const a = toNumber(ttm?.Income_Statement?.revenue);
    const b = toNumber(y1?.Income_Statement?.revenue);
    if (a != null && b != null && b !== 0) return ((a - b) / Math.abs(b)) * 100;
    return null;
  }

  function computeEpsGrowth(apiFinancials) {
    const ttm = apiFinancials?.TTM || {};
    const y1 = apiFinancials?.Y1 || {};
    const a = toNumber(ttm?.Income_Statement?.ePS);
    const b = toNumber(y1?.Income_Statement?.ePS);
    if (a != null && b != null && b !== 0) return ((a - b) / Math.abs(b)) * 100;
    return null;
  }

  // Predefined alias groups
  const aliasGroups = {
    pe: ['priceEarningsRatio','peRatio','trailingPE'],
    evEbitda: ['evToEBITDA','enterpriseValueOverEBITDA','EVtoEBITDA'],
    debtEquity: ['debtEquityRatio','debtToEquityRatio','debtToEquity'],
    grossMargin: ['grossProfitMargin','grossMargin'],
    operatingMargin: ['operatingMargin','operatingProfitMargin'],
    netMargin: ['netProfitMargin','profitMargin','netMargin'],
    priceToBook: ['priceToBookRatio','pbRatio','priceBook']
  };

  function getAliasedRatio(ttm, group) {
    const keys = aliasGroups[group];
    if (!keys) return null;
    return getRatio(ttm, keys);
  }

  window.Aliases = {
    get,
    pickFirst,
    toNumber,
    getRatio,
    getAliasedRatio,
    computeOperatingMargin,
    computeRevenueGrowth,
    computeEpsGrowth,
    aliasGroups
  };
})();

