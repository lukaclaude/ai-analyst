// Formatting helpers (currency, quantities, market cap)
// Exposes window.Formatters and provides consistent formatting across views.

(function() {
  function formatCurrency(value, decimals = 1, currency = 'USD') {
    if (value == null || isNaN(value)) return 'N/A';
    const symbols = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', DKK: 'kr', CAD: 'C$', KRW: '₩', CHF: 'CHF', TWD: 'NT$' };
    const symbol = symbols[currency] || currency + ' ';
    const num = parseFloat(value);
    const abs = Math.abs(num);
    let formatted;
    if (abs >= 1e12) formatted = `${(num / 1e12).toFixed(decimals)}T`;
    else if (abs >= 1e9) formatted = `${(num / 1e9).toFixed(decimals)}B`;
    else if (abs >= 1e6) formatted = `${(num / 1e6).toFixed(decimals)}M`;
    else if (abs >= 1e3) formatted = `${(num / 1e3).toFixed(decimals)}K`;
    else formatted = num.toFixed(decimals);
    return ['USD','EUR','GBP','CAD','CHF'].includes(currency) ? `${symbol}${formatted}` : `${formatted} ${symbol}`;
  }

  function formatQuantity(value, decimals = 2) {
    if (value == null || isNaN(value)) return 'N/A';
    const num = parseFloat(value);
    const abs = Math.abs(num);
    if (abs >= 1e12) return `${(num / 1e12).toFixed(decimals)} tn`;
    if (abs >= 1e9) return `${(num / 1e9).toFixed(decimals)} bn`;
    if (abs >= 1e6) return `${(num / 1e6).toFixed(decimals)} m`;
    if (abs >= 1e3) return `${(num / 1e3).toFixed(decimals)} k`;
    return num.toFixed(decimals);
  }

  function formatMarketCap(value, currencyCode = 'USD') {
    if (!value || isNaN(value)) return 'N/A';
    let symbol = '';
    switch ((currencyCode || '').toUpperCase()) {
      case 'USD': symbol = '$'; break; case 'EUR': symbol = '€'; break; case 'GBP': symbol = '£'; break; case 'DKK': symbol = 'kr.'; break; default: symbol = currencyCode + ' '; break;
    }
    const num = parseFloat(value);
    let display;
    if (num >= 1e12) display = `${(num / 1e12).toFixed(1)} tn`;
    else if (num >= 1e9) display = `${(num / 1e9).toFixed(1)} bn`;
    else if (num >= 1e6) display = `${(num / 1e6).toFixed(1)} m`;
    else if (num >= 1e3) display = `${(num / 1e3).toFixed(1)} k`;
    else display = num.toFixed(2);
    return `${symbol}${display}`;
  }

  window.Formatters = { formatCurrency, formatQuantity, formatMarketCap };
})();

