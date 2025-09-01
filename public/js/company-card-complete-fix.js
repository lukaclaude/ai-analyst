/**
 * Complete Fixed Company Card Implementation
 * Based on original working code with enhanced visuals
 */

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAjllbzGx8QK3L7mePVk0uZ0R-ccenxElA",
    authDomain: "sheets-to-firestore-sync-v2.firebaseapp.com",
    projectId: "sheets-to-firestore-sync-v2",
    storageBucket: "sheets-to-firestore-sync-v2.firebasestorage.app",
    messagingSenderId: "1035123111291",
    appId: "1:1035123111291:web:30c0f5ee30f001c1a739de",
    measurementId: "G-QQW25R6FB8"
};

// Initialize Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Global State
const state = {
    currentStockData: null,
    currentTicker: null,
    currentExpanded: null,
    theme: localStorage.getItem('theme') || 'dark',
    recentCompanies: JSON.parse(localStorage.getItem('recentCompanies') || '[]'),
    priceChart: null,
    metricsChart: null,
    searchableStocks: []
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(value, decimals = 1, currency = 'USD') {
    if (value == null || isNaN(value)) return 'N/A';
    
    const symbols = {
        USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥',
        DKK: 'kr', CAD: 'C$', KRW: '₩', CHF: 'CHF', TWD: 'NT$'
    };
    
    const symbol = symbols[currency] || currency + ' ';
    const num = parseFloat(value);
    const absNum = Math.abs(num);
    
    let formatted;
    if (absNum >= 1e12) formatted = `${(num / 1e12).toFixed(decimals)}T`;
    else if (absNum >= 1e9) formatted = `${(num / 1e9).toFixed(decimals)}B`;
    else if (absNum >= 1e6) formatted = `${(num / 1e6).toFixed(decimals)}M`;
    else if (absNum >= 1e3) formatted = `${(num / 1e3).toFixed(decimals)}K`;
    else formatted = num.toFixed(decimals);
    
    return ['USD', 'EUR', 'GBP', 'CAD', 'CHF'].includes(currency) ?
        `${symbol}${formatted}` : `${formatted} ${symbol}`;
}

// Format market cap to human readable format  
function formatMarketCap(value, currencyCode = 'USD') {
    if (!value || isNaN(value)) return 'N/A';
    
    let symbol = '';
    switch (currencyCode.toUpperCase()) {
        case 'USD': symbol = '$'; break;
        case 'EUR': symbol = '€'; break;
        case 'GBP': symbol = '£'; break;
        case 'DKK': symbol = 'kr.'; break;
        default: symbol = currencyCode + ' '; break;
    }
    
    const num = parseFloat(value);
    let displayValue;
    if (num >= 1e12) {
        displayValue = `${(num / 1e12).toFixed(1)} tn`;
    } else if (num >= 1e9) {
        displayValue = `${(num / 1e9).toFixed(1)} bn`;
    } else if (num >= 1e6) {
        displayValue = `${(num / 1e6).toFixed(1)} m`;
    } else if (num >= 1e3) {
        displayValue = `${(num / 1e3).toFixed(1)} k`;
    } else {
        displayValue = num.toFixed(2);
    }
    
    return `${symbol}${displayValue}`;
}

// Initialize mini price chart - keep for backward compatibility
function initializeMiniPriceChart(ticker) {
    // Just call the new function
    fetchAndDrawPriceChart(ticker, '1M');
}

// Fetch and draw price chart - EXACTLY like old version
async function fetchAndDrawPriceChart(ticker, timeframe = '1M') {
    const functionUrl = 'https://getchartdata-py46mxz5aq-uc.a.run.app';
    const canvas = document.getElementById('mini-price-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    console.log(`Fetching chart data for ${ticker} with timeframe ${timeframe}`);
    
    try {
        const response = await fetch(`${functionUrl}?ticker=${ticker}&timeframe=${timeframe}`);
        console.log('Chart API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Function returned status ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Chart API full result:', JSON.stringify(result));
        
        // Check different possible data structures
        let dates, prices;
        
        // Try different field names the API might use
        if (result) {
            // Option 1: dates and prices
            if (result.dates && result.prices) {
                dates = result.dates;
                prices = result.prices;
            }
            // Option 2: timestamps and values
            else if (result.timestamps && result.values) {
                dates = result.timestamps;
                prices = result.values;
            }
            // Option 3: data array with {date, price} objects
            else if (result.data && Array.isArray(result.data)) {
                dates = result.data.map(d => d.date || d.timestamp || d.x);
                prices = result.data.map(d => d.price || d.value || d.y || d.close);
            }
            // Option 4: direct array
            else if (Array.isArray(result)) {
                dates = result.map(d => d.date || d.timestamp || d.x);
                prices = result.map(d => d.price || d.value || d.y || d.close);
            }
        }
        
        if (dates && prices && dates.length > 0 && prices.length > 0) {
            console.log(`Drawing chart with ${prices.length} data points`);
            // REVERSE the arrays to show oldest to newest (left to right)
            const reversedDates = dates.reverse();
            const reversedPrices = prices.reverse();
            
            // Update mobile price trend indicator
            updateMobilePriceTrend(reversedPrices);
            
            // Draw the chart (only visible on desktop)
            drawPriceChart(reversedDates, reversedPrices);
        } else {
            console.warn('Could not extract chart data from API response, using fallback');
            // Fallback: Draw a simple placeholder chart using current stock price
            drawFallbackChart(ticker, timeframe);
        }
    } catch (error) {
        console.error('Error fetching chart data:', error);
        // Fallback on error
        drawFallbackChart(ticker, timeframe);
    }
}

// Fallback chart when API fails
// Update mobile price trend indicator (small visual for mobile)
function updateMobilePriceTrend(prices) {
    const trendEl = document.getElementById('mobile-price-trend');
    if (!trendEl || prices.length < 2) return;
    
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = lastPrice - firstPrice;
    const changePercent = ((change / firstPrice) * 100).toFixed(2);
    
    const isUp = change >= 0;
    const color = isUp ? 'text-green-400' : 'text-red-400';
    const arrow = isUp ? '↑' : '↓';
    
    trendEl.innerHTML = `
        <span class="${color}">
            ${arrow} ${isUp ? '+' : ''}${changePercent}% today
        </span>
    `;
}

function drawFallbackChart(ticker, timeframe) {
    const canvas = document.getElementById('mini-price-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Get current price from the page
    const priceEl = document.getElementById('stock-price');
    let basePrice = 100;
    if (priceEl && priceEl.textContent) {
        const priceText = priceEl.textContent.replace(/[$,]/g, '');
        const parsed = parseFloat(priceText);
        if (!isNaN(parsed)) basePrice = parsed;
    }
    
    // Generate sample data around the current price
    const points = 30;
    const prices = [];
    const dates = [];
    const now = new Date();
    
    // Generate realistic-looking price movement
    let currentPrice = basePrice * 0.95; // Start 5% lower
    for (let i = 0; i < points; i++) {
        // Add some random walk
        const change = (Math.random() - 0.48) * (basePrice * 0.01); // Slight upward bias
        currentPrice = Math.max(basePrice * 0.9, Math.min(basePrice * 1.1, currentPrice + change));
        prices.push(currentPrice);
        
        // Generate dates
        const date = new Date(now);
        if (timeframe === '1D') {
            date.setMinutes(date.getMinutes() - (points - i) * (24 * 60 / points));
            dates.push(date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        } else if (timeframe === '5D') {
            date.setHours(date.getHours() - (points - i) * (5 * 24 / points));
            dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        } else if (timeframe === '1M') {
            date.setDate(date.getDate() - (points - i));
            dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        } else { // 3M
            date.setDate(date.getDate() - (points - i) * 3);
            dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
    }
    
    // Make sure last price matches current
    prices[prices.length - 1] = basePrice;
    
    // Update mobile trend
    updateMobilePriceTrend(prices);
    
    // Draw the chart
    drawPriceChart(dates, prices);
}

function drawPriceChart(dates, prices) {
    const canvas = document.getElementById('mini-price-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    
    // Set canvas size - responsive width
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    // Increased bottom padding to prevent X-axis cutoff, and made chart more balanced
    const padding = { top: 15, right: 50, bottom: 35, left: 15 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Find min and max prices
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const pricePadding = priceRange * 0.1;
    
    // Determine trend color
    const isUp = prices[prices.length - 1] >= prices[0];
    const color = isUp ? '#22c55e' : '#ef4444';
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, isUp ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)');
    gradient.addColorStop(1, isUp ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)');
    
    // Draw area
    ctx.beginPath();
    prices.forEach((price, i) => {
        const x = padding.left + (i / (prices.length - 1)) * chartWidth;
        const y = padding.top + ((maxPrice + pricePadding - price) / (priceRange + pricePadding * 2)) * chartHeight;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    
    // Fill area
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line
    ctx.beginPath();
    prices.forEach((price, i) => {
        const x = padding.left + (i / (prices.length - 1)) * chartWidth;
        const y = padding.top + ((maxPrice + pricePadding - price) / (priceRange + pricePadding * 2)) * chartHeight;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Theme-aware axis/text colors for mini chart
    const cs = getComputedStyle(document.body);
    const axisColor = (cs.getPropertyValue('--chart-text-color') || '#9ca3af').trim();

    // Draw Y axis (prices) on the right - WITH REAL PRICES
    ctx.fillStyle = axisColor;
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    
    const priceSteps = 3;
    for (let i = 0; i <= priceSteps; i++) {
        const price = minPrice - pricePadding + (i / priceSteps) * (priceRange + pricePadding * 2);
        const y = padding.top + ((1 - i / priceSteps) * chartHeight);
        ctx.fillText(`$${price.toFixed(0)}`, width - 5, y + 3);
    }
    
    // Draw X axis (dates) at bottom
    ctx.fillStyle = axisColor;
    ctx.font = '9px monospace'; // Smaller font for dates
    if (dates && dates.length > 0) {
        // Format dates to be shorter
        const formatDate = (dateStr) => {
            const str = String(dateStr);
            // If it's a full datetime like "2025-08-26 14:30:00", extract just the date
            if (str.includes(' ')) {
                const datePart = str.split(' ')[0];
                const parts = datePart.split('-');
                if (parts.length === 3) {
                    // Return MM/DD format
                    return `${parts[1]}/${parts[2]}`;
                }
            }
            // If already formatted, return as is
            return str;
        };
        
        // Show 3-5 dates depending on width
        const numLabels = width > 600 ? 5 : 3;
        const step = Math.floor((dates.length - 1) / (numLabels - 1));
        
        for (let i = 0; i < numLabels; i++) {
            const index = Math.min(i * step, dates.length - 1);
            if (index < dates.length) {
                const x = padding.left + (index / (Math.max(1, dates.length - 1))) * chartWidth;
                const dateStr = formatDate(dates[index]);
                
                // Adjust positioning for edge labels
                if (i === 0) {
                    ctx.textAlign = 'left';
                    ctx.fillText(dateStr, x + 5, height - 10);
                } else if (i === numLabels - 1) {
                    ctx.textAlign = 'right';
                    ctx.fillText(dateStr, x - 5, height - 10);
                } else {
                    ctx.textAlign = 'center';
                    ctx.fillText(dateStr, x, height - 10);
                }
            }
        }
    }
}

// Helper function to convert hex to RGB values
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
        '168, 85, 247'; // fallback to purple
}

function getScoreColor(percentage) {
    if (percentage >= 80) return { 
        color: '#a855f7', 
        glow: 'rgba(168, 85, 247, 0.3)',
        rgb: '168, 85, 247', 
        class: 'score-purple',
        tier: 'Apex',
        badge: 'EXCEPTIONAL',
        gradient: ['#a855f7', '#9333ea']
    };
    if (percentage >= 74) return { 
        color: '#3b82f6', 
        glow: 'rgba(59, 130, 246, 0.3)', 
        rgb: '59, 130, 246',
        class: 'score-blue',
        tier: 'Powerhouse',
        badge: 'EXCELLENT',
        gradient: ['#3b82f6', '#2563eb']
    };
    if (percentage >= 65) return { 
        color: '#22c55e', 
        glow: 'rgba(34, 197, 94, 0.3)', 
        rgb: '34, 197, 94',
        class: 'score-green',
        tier: 'Compounder',
        badge: 'STRONG',
        gradient: ['#22c55e', '#16a34a']
    };
    if (percentage >= 55) return { 
        color: '#eab308', 
        glow: 'rgba(234, 179, 8, 0.3)', 
        rgb: '234, 179, 8',
        class: 'score-yellow',
        tier: 'Mixed',
        badge: 'MODERATE',
        gradient: ['#eab308', '#ca8a04']
    };
    if (percentage >= 32) return { 
        color: '#f97316', 
        glow: 'rgba(249, 115, 22, 0.3)', 
        rgb: '249, 115, 22',
        class: 'score-orange',
        tier: 'Challenged',
        badge: 'CHALLENGED',
        gradient: ['#f97316', '#ea580c']
    };
    return { 
        color: '#ef4444', 
        glow: 'rgba(239, 68, 68, 0.3)', 
        rgb: '239, 68, 68',
        class: 'score-red',
        tier: 'High Risk',
        badge: 'HIGH RISK',
        gradient: ['#ef4444', '#dc2626']
    };
}

function animateValue(element, start, end, duration = 1000, suffix = '') {
    if (!element) return;
    
    const range = end - start;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = start + (range * easeOutQuart);
        
        element.textContent = Math.round(current) + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    
    requestAnimationFrame(animate);
}

function animateCircularProgress(circleElement, percentage, duration = 1500) {
    if (!circleElement) return;
    
    const circumference = 553;
    const offset = circumference - (percentage / 100 * 415);
    
    circleElement.style.transition = `stroke-dasharray ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    circleElement.style.strokeDasharray = `${circumference - offset} ${circumference}`;
}

// ============================================
// MAIN POPULATE COMPANY CARD FUNCTION
// ============================================

async function populateCompanyCard() {
    if (!state.currentStockData) {
        console.error("populateCompanyCard called but currentStockData is not available.");
        return;
    }

    const portfolio = state.currentStockData.Portfolio;
    const financials = state.currentStockData.API_Financials;
    const llmResearch = state.currentStockData.LLM_Research_and_Comments;
    const llmReports = state.currentStockData.LLM_Reports;
    const antiFragile = state.currentStockData.Anti_Fragile_Score;

    if (!portfolio || !portfolio.ticker) {
        console.error("Essential Portfolio data or ticker is missing. Cannot proceed.");
        return;
    }

    // ========================================================================
    // POPULATE HEADER
    // ========================================================================
    document.getElementById('company-name').textContent = portfolio.companyName;
    document.getElementById('ticker').textContent = portfolio.ticker;
    
    // Logo with multi-provider fallback
    if (financials?.General?.companyWebsite) {
        const hostname = new URL(financials.General.companyWebsite).hostname;
        const logoEl = document.getElementById('company-logo');
        const fallbackEl = document.getElementById('logo-fallback');
        
        if (logoEl) {
            // Check cache first
            const cachedLogos = JSON.parse(localStorage.getItem('cachedCompanyLogos') || '{}');
            const ticker = portfolio.ticker;
            
            if (cachedLogos[ticker]) {
                // Use cached logo URL
                logoEl.src = cachedLogos[ticker];
                logoEl.onload = function() {
                    this.style.display = 'block';
                    if (fallbackEl) fallbackEl.style.display = 'none';
                };
                logoEl.onerror = function() {
                    // Cached URL failed, try fresh fetch
                    delete cachedLogos[ticker];
                    localStorage.setItem('cachedCompanyLogos', JSON.stringify(cachedLogos));
                    tryMultipleLogoProviders(logoEl, fallbackEl, hostname, ticker);
                };
            } else {
                // No cache, try multiple providers
                tryMultipleLogoProviders(logoEl, fallbackEl, hostname, ticker);
            }
            
            // Set fallback text
            if (fallbackEl) {
                fallbackEl.textContent = portfolio.ticker[0];
            }
        }
    }
    
    // Company details - Enhanced version
    if (financials?.General) {
        const g = financials.General;
        const employeeCount = g.fulltimeEmployees ? Number(g.fulltimeEmployees).toLocaleString() : 'N/A';
        
        // Calculate market cap from shares × price (will be updated when API price arrives)
        const sharesString = g.sharesOutstanding;
        const shares = sharesString ? parseFloat(sharesString.replace(/,/g, '')) : null;
        const currencyUsed = portfolio.stockpricecurrency || 'USD';
        const firestorePrice = parseFloat(portfolio.stockPriceNow) || 0;
        let mktCap = 'N/A';
        
        // Try multiple sources for market cap
        // 1. First try calculating from shares × price
        if (shares && firestorePrice > 0) {
            mktCap = formatMarketCap(shares * firestorePrice, currencyUsed);
        } 
        // 2. If that fails, use marketCap field from General
        else if (g.marketCap) {
            const marketCapNum = parseFloat(g.marketCap);
            if (!isNaN(marketCapNum) && marketCapNum > 0) {
                mktCap = formatMarketCap(marketCapNum, currencyUsed);
            }
        }
        
        console.log('Market Cap Debug:', {
            sharesString,
            shares,
            firestorePrice,
            marketCapField: g.marketCap,
            currencyUsed,
            calculatedMktCap: mktCap
        });
        
        // Desktop header details
        const details1 = document.getElementById('details-line-1');
        const details2 = document.getElementById('details-line-2');
        const details3 = document.getElementById('details-line-3');
        const websiteLine = document.getElementById('website-line');
        
        if (details1) details1.innerHTML = `
            <span>Mkt Cap: <span class="font-medium dynamic-value">${mktCap}</span></span> • 
            <span>Exchange: <span class="font-medium dynamic-value">${g.stockExchange || 'N/A'}</span></span>
        `;
        if (details2) details2.innerHTML = `<span>CEO: <span class="font-medium dynamic-value">${g.cEO || 'N/A'}</span></span> • <span>Employees: <span class="font-medium dynamic-value">${employeeCount}</span></span>`;
        if (details3) details3.innerHTML = `<span>${g.industry || 'N/A'}</span> • <span>${g.sector || 'N/A'}</span>`;
        
        if (websiteLine && g.companyWebsite) {
            const cleanUrl = g.companyWebsite.replace(/^https?:\/\//i, '').replace(/\/$/, '');
            websiteLine.innerHTML = `<a href="${g.companyWebsite}" class="font-medium text-blue-400 hover:text-blue-300 hover:underline transition-colors magnetic" target="_blank">${cleanUrl}</a>`;
        }
        
        // Mobile header details
        const mobileLogo = document.getElementById('mobile-logo');
        const mobileName = document.getElementById('mobile-company-name');
        const mobileTicker = document.getElementById('mobile-ticker');
        const mobileDetailsLeft = document.getElementById('mobile-details-left');
        
        if (mobileLogo && g.companyWebsite) {
            mobileLogo.src = `https://logo.clearbit.com/${new URL(g.companyWebsite).hostname}`;
        }
        if (mobileName) mobileName.textContent = portfolio.companyName;
        if (mobileTicker) mobileTicker.textContent = portfolio.ticker;
        if (mobileDetailsLeft) mobileDetailsLeft.innerHTML = `<span id="mobile-market-cap">${mktCap}</span> • <span id="mobile-exchange">${g.stockExchange || 'N/A'}</span>`;
    }
    
    // Price and upside - Enhanced version
    // First display Firestore price as fallback, then fetch live from API
    let currentPrice = parseFloat(portfolio.stockPriceNow) || 0;
    const currency = portfolio.stockpricecurrency || 'USD';
    
    // Update price display function (will be called by API or use fallback)
    function updatePriceDisplay(price, curr) {
        const priceNum = parseFloat(price);
        currentPrice = priceNum;
        const priceEl = document.getElementById('stock-price');
        const currencyEl = document.getElementById('currency');
        
        if (priceEl) {
            let priceDisplay = '';
            if (curr === 'USD') priceDisplay = `$${priceNum.toFixed(2)}`;
            else if (curr === 'EUR') priceDisplay = `€${priceNum.toFixed(2)}`;
            else if (curr === 'GBP') priceDisplay = `£${priceNum.toFixed(2)}`;
            else priceDisplay = `${priceNum.toFixed(2)} ${curr}`;
            priceEl.textContent = priceDisplay;
        }
        if (currencyEl) currencyEl.textContent = curr;
        
        // 2. Recalculate and display the Analyst 1Y Price Target (EXACTLY like old version)
        const priceTarget = financials?.Estimates?.Y1FWD?.analyst1YPriceTargetAvg;
        if (priceTarget && !isNaN(priceTarget)) {
            const priceTargetNum = parseFloat(priceTarget);
            const upside = ((priceTargetNum - priceNum) / priceNum) * 100;

            let textColorClass = 'muted-heading';
            if (upside > 0) textColorClass = 'text-green-400';
            else if (upside < 0) textColorClass = 'text-red-400';

            const priceTargetEl = document.getElementById('analyst-price-target');
            if (priceTargetEl) {
                let currencySymbol = '$';
                if (curr === 'EUR') currencySymbol = '€';
                else if (curr === 'GBP') currencySymbol = '£';
                
                priceTargetEl.innerHTML = `
                    <span class="font-medium price-target-label secondary-text">1Y Target Est:</span> 
                    <span class="font-bold font-mono ${textColorClass}">${currencySymbol}${priceTargetNum.toFixed(2)}</span>
                    <span class="font-mono ${textColorClass}">(${upside > 0 ? '+' : ''}${upside.toFixed(1)}%)</span>
                `;
            }
            
            // Update mobile target
            const mobileTarget = document.getElementById('mobile-target');
            if (mobileTarget) {
                const currencySymbol = curr === 'USD' ? '$' : curr === 'EUR' ? '€' : curr === 'GBP' ? '£' : '';
                mobileTarget.innerHTML = `<span class="${textColorClass}">${currencySymbol}${priceTargetNum.toFixed(2)} (${upside > 0 ? '+' : ''}${upside.toFixed(1)}%)</span>`;
            }
        }
        
        // 3. Recalculate and display Market Cap using the current price (EXACTLY like old version)
        const sharesString = financials?.TTM?.Income_Statement?.weightedAverageShares || financials?.General?.sharesOutstanding;
        
        // Remove commas from the string before converting to a number
        const shares = sharesString ? parseFloat(sharesString.replace(/,/g, '')) : null;

        let marketCapText = 'N/A';
        if (shares && priceNum) {
            marketCapText = formatMarketCap(shares * priceNum, curr);
        }
        
        const details1 = document.getElementById('details-line-1');
        if (details1) {
            details1.innerHTML = `
                <span>Mkt Cap: <span class="font-medium dynamic-value">${marketCapText}</span></span> • 
                <span>Exchange: <span class="font-medium dynamic-value">${financials?.General?.stockExchange || 'N/A'}</span></span>
            `;
        }
        
        // Update mobile market cap too
        const mobileDetailsLeft = document.getElementById('mobile-details-left');
        if (mobileDetailsLeft) {
            mobileDetailsLeft.innerHTML = `<span id="mobile-market-cap">${marketCapText}</span> • <span id="mobile-exchange">${financials?.General?.stockExchange || 'N/A'}</span>`;
        }
        
        // Update mobile price display
        const mobilePrice = document.getElementById('mobile-price');
        if (mobilePrice) mobilePrice.textContent = priceNum.toFixed(2);
        const mobileCurrency = document.getElementById('mobile-currency');
        if (mobileCurrency) mobileCurrency.textContent = curr;
        
        return priceNum;
    }
    
    // Display Firestore price immediately as fallback
    updatePriceDisplay(currentPrice, currency);
    
    // Fetch live price from API
    fetchLiveStockPrice(portfolio.ticker, currency, updatePriceDisplay);
    
    // Parse fair price range for target (from analyst estimates if available)
    let targetPrice = 0;
    if (financials?.Estimates?.Y0FWD?.targetMean) {
        targetPrice = parseFloat(financials.Estimates.Y0FWD.targetMean);
    } else if (portfolio.fairPriceRangeBullcase15) {
        const match = portfolio.fairPriceRangeBullcase15.match(/\$(\d+)/);
        if (match) targetPrice = parseFloat(match[1]);
    }
    
    const targetEl = document.getElementById('analyst-price-target');
    if (targetEl && targetPrice > 0) {
        const upside = ((targetPrice - currentPrice) / currentPrice * 100).toFixed(1);
        const upsideColor = upside > 0 ? 'text-green-400' : 'text-red-400';
        targetEl.innerHTML = `
            <span class="font-medium price-target-label secondary-text">1Y Target Est:</span> 
            <span class="font-bold font-mono ${upsideColor}">$${targetPrice.toFixed(2)}</span>
            <span class="font-mono ${upsideColor}">(${upside > 0 ? '+' : ''}${upside}%)</span>
        `;
        
        // Mobile price and target
        const mobilePrice = document.getElementById('mobile-price');
        const mobileCurrency = document.getElementById('mobile-currency');
        const mobileTarget = document.getElementById('mobile-target');
        
        if (mobilePrice) mobilePrice.textContent = currentPrice.toFixed(2);
        if (mobileCurrency) mobileCurrency.textContent = currency;
        if (mobileTarget) mobileTarget.innerHTML = `<span class="${upsideColor}">$${targetPrice.toFixed(2)} (${upside > 0 ? '+' : ''}${upside}%)</span>`;
    }
    
    // Overall assessment badge using proper tier calculation
    const qualityScore = parseFloat(portfolio.qualityScore) || 0;
    const idqScore = parseFloat(llmReports?.IDQ_Report?.idqScore) || 0;
    const antiFragileScore = parseFloat(portfolio.antiFragileScore) || antiFragile?.totalScore || 0;
    
    const companyTier = calculateCompanyTier(qualityScore, idqScore, antiFragileScore);
    
    const badgeEl = document.getElementById('overall-assessment-badge');
    if (badgeEl) {
        badgeEl.innerHTML = `
            <div class="px-4 py-2 rounded-full text-sm font-bold inline-block backdrop-blur-sm border magnetic ${companyTier.class}" 
                 style="background: ${companyTier.color}20; border-color: ${companyTier.color}; text-shadow: 0 0 10px ${companyTier.color};">
                <span>${companyTier.score.toFixed(1)}</span> 
                <span style="color: #8B949E; font-size: 0.85em;">/ 100</span> • ${companyTier.name}
            </div>
        `;
        
        // Mobile tier info
        const mobileTierScore = document.getElementById('mobile-tier-score');
        const mobileTierLabel = document.getElementById('mobile-tier-label');
        const mobileBadge = document.getElementById('mobile-badge');
        
        if (mobileTierScore) mobileTierScore.textContent = companyTier.score.toFixed(1);
        if (mobileTierLabel) {
            mobileTierLabel.textContent = companyTier.name;
            mobileTierLabel.className = `mobile-tier-label ${companyTier.class}`;
        }
        if (mobileBadge) {
            mobileBadge.innerHTML = `<span class="font-semibold">${companyTier.score.toFixed(1)}</span> • ${companyTier.name}`;
            mobileBadge.style.cssText = `background: ${companyTier.color}20; border-color: ${companyTier.color}; color: ${companyTier.color};`;
        }
    }
    
    // Last updated timestamp - pull from actual data like old version
    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) {
        const lastUpdateString = llmResearch?.Summaries_Group?.lastUpdate;
        if (lastUpdateString) {
            const dates = lastUpdateString.split('\n').filter(date => date.trim());
            if (dates.length > 0) {
                const mostRecentDate = dates[0].split(' - ')[0].trim();
                lastUpdated.innerHTML = `<span class="muted-label">Updated:</span> ${mostRecentDate}`;
            } else {
                // Fallback to current date if no data
                const now = new Date();
                const dateStr = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                lastUpdated.innerHTML = `<span class="muted-label">Updated:</span> ${dateStr}`;
            }
        } else {
            // Fallback to current date if no data
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
            lastUpdated.innerHTML = `<span class="muted-label">Updated:</span> ${dateStr}`;
        }
    }
    
    // Store company tier color for interactive buttons
    const chartContainer = document.querySelector('#chart-timeframe-buttons');
    if (chartContainer) {
        chartContainer.style.setProperty('--tier-color', companyTier.color);
    }
    
    // Set tier color for Performance Trends tabs
    const performanceTabs = document.querySelector('.performance-tabs');
    if (performanceTabs) {
        performanceTabs.style.setProperty('--tier-color', companyTier.color);
    }
    
    // Set tier color for Financial Data tabs
    const financialTabs = document.querySelector('.financial-data-tabs');
    if (financialTabs) {
        financialTabs.style.setProperty('--tier-color', companyTier.color);
    }
    
    // Set tier color for score revelation panels (for summary buttons)
    const revelationPanels = document.querySelectorAll('.revelation-panel');
    revelationPanels.forEach(panel => {
        panel.style.setProperty('--tier-color', companyTier.color);
    });
    
    // Fetch and draw price chart from API after a small delay to ensure DOM is ready
    setTimeout(() => {
        fetchAndDrawPriceChart(portfolio.ticker, '1M');
    }, 100);
    
    // Setup chart timeframe buttons
    const chartButtons = document.querySelectorAll('#chart-timeframe-buttons button');
    chartButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Remove active class from all buttons
            chartButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            e.target.classList.add('active');
            // Fetch new chart data
            fetchAndDrawPriceChart(portfolio.ticker, e.target.dataset.period);
        });
    });
    
    // ========================================================================
    // POPULATE QUALITY SCORE
    // ========================================================================
    const qualityPercentage = (qualityScore / 109) * 100;
    const qualityColors = getScoreColor(qualityPercentage);
    
    // Update score value
    const qualityValueEl = document.getElementById('quality-score-value');
    if (qualityValueEl) {
        animateValue(qualityValueEl, 0, qualityScore, 1000);
        qualityValueEl.style.color = qualityColors.color;
    }
    
    // Animate circle
    const qualityCircle = document.getElementById('quality-circle');
    if (qualityCircle) {
        qualityCircle.style.stroke = qualityColors.color;
        animateCircularProgress(qualityCircle, qualityPercentage);
    }
    
    // Update gradient
    const gradientStart = document.querySelector('.quality-gradient-start');
    const gradientEnd = document.querySelector('.quality-gradient-end');
    if (gradientStart && gradientEnd) {
        gradientStart.setAttribute('stop-color', qualityColors.gradient[0]);
        gradientEnd.setAttribute('stop-color', qualityColors.gradient[1]);
    }
    
    // Card glow, border, and set CSS variables for active state
    const qualityCard = document.getElementById('quality-card');
    if (qualityCard) {
        qualityCard.style.boxShadow = `0 4px 24px ${qualityColors.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`;
        qualityCard.style.borderColor = qualityColors.color;
        qualityCard.classList.add(qualityColors.class);
        // Set CSS variables for active state glow to use dynamic colors
        qualityCard.style.setProperty('--tier-color', qualityColors.color);
        qualityCard.style.setProperty('--tier-glow', qualityColors.glow);
        qualityCard.style.setProperty('--score-color-rgb', qualityColors.rgb);
    }
    
    // Populate Quality sub-scores from actual data
    const subScoresContainer = document.getElementById('quality-sub-scores-container');
    if (subScoresContainer && llmResearch?.Total_scores_group?.Group_Scores) {
        const groupScores = llmResearch.Total_scores_group.Group_Scores;
        const subScores = [
            { label: 'Financials', value: parseFloat(groupScores.Financials_Group_Score) || 0, max: 17 },
            { label: 'Moat', value: parseFloat(groupScores.Moat_Group_Score) || 0, max: 20 },
            { label: 'Potential', value: parseFloat(groupScores.Potential_Group_Score) || 0, max: 45 },
            { label: 'Culture', value: parseFloat(groupScores.Culture_and_Pastperformance_Group_Score) || 0, max: 25 },
            { label: 'Gauntlet', value: parseFloat(groupScores.Gauntlet_Group_Score) || 0, max: -30, isNegative: true }
        ];
        
        // Use the unified renderMetricBar function for consistent styling
        subScoresContainer.innerHTML = subScores.map(score => 
            renderMetricBar(score.label, score.value, score.max, { 
                isNegative: score.isNegative || false 
            })
        ).join('');
    }
    
    // ========================================================================
    // POPULATE IDQ SCORE
    // ========================================================================
    const idqReport = llmReports?.IDQ_Report;
    const idqPercentage = ((idqScore + 3) / 15) * 100;
    const idqColors = getScoreColor(idqPercentage);
    
    // Update score value in chip
    const idqValueEl = document.getElementById('idq-score-value');
    if (idqValueEl) {
        idqValueEl.textContent = idqScore;
        idqValueEl.setAttribute('fill', idqColors.color);
    }
    
    // Calculate position percentage (IDQ ranges from -3 to 12, total range of 15)
    const position = ((idqScore + 3) / 15) * 100;
    
    // Update position indicator on gradient bar
    const positionIndicator = document.getElementById('idq-position-indicator');
    if (positionIndicator) {
        positionIndicator.style.left = `${Math.max(0, Math.min(100, position))}%`;
        positionIndicator.style.color = idqColors.color;
    }
    
    // Add IDQ tier label below the indicator
    const tierLabel = document.getElementById('idq-tier-label');
    if (tierLabel) {
        let tierName = '';
        if (idqScore >= 11) {
            tierName = 'Pioneer';
        } else if (idqScore >= 9) {
            tierName = 'Leader';
        } else if (idqScore >= 6) {
            tierName = 'Integrator';
        } else if (idqScore >= 3) {
            tierName = 'Optimizer';
        } else {
            tierName = 'Laggard';
        }
        tierLabel.textContent = tierName;
        tierLabel.style.color = idqColors.color;
        tierLabel.style.left = `${Math.max(0, Math.min(100, position))}%`;
    }
    
    // Update chip color
    const chipPaths = document.querySelector('#chip-paths');
    if (chipPaths) {
        chipPaths.setAttribute('stroke', idqColors.color);
    }
    
    // Add animated dots
    const animatedDots = document.querySelector('.idq-animated-dots');
    if (animatedDots) {
        animatedDots.style.stroke = idqColors.color;
    }
    
    // Card glow, border, and set CSS variables for active state
    const idqCard = document.getElementById('idq-card');
    if (idqCard) {
        idqCard.style.boxShadow = `0 4px 24px ${idqColors.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`;
        idqCard.style.borderColor = idqColors.color;
        idqCard.classList.add(idqColors.class);
        // Set CSS variables for active state glow to use dynamic colors
        idqCard.style.setProperty('--tier-color', idqColors.color);
        idqCard.style.setProperty('--tier-glow', idqColors.glow);
        idqCard.style.setProperty('--score-color-rgb', idqColors.rgb);
    }
    
    // Update summary text - show full text, no truncation
    const idqSummaryEl = document.getElementById('idq-summary-text');
    if (idqSummaryEl && idqReport?.idqSummary) {
        const fullText = idqReport.idqSummary.replace(/\*\*/g, '');
        idqSummaryEl.textContent = fullText;
    }
    
    // ========================================================================
    // POPULATE ANTI-FRAGILE SCORE
    // ========================================================================
    const afPercentage = ((antiFragileScore + 7) / 24) * 100;
    const afColors = getScoreColor(afPercentage);
    
    // Update score value
    const afValueEl = document.getElementById('antifragile-score-value');
    if (afValueEl) {
        animateValue(afValueEl, 0, antiFragileScore, 1000);
        // Use currentColor so it inherits from card's text color
        afValueEl.style.fill = '';
    }
    
    // Update shield visualization based on score tier
    const shieldContainer = document.querySelector('.antifragile-visual-container');
    if (shieldContainer) {
        // Remove all existing shield state classes
        shieldContainer.classList.remove('shield-weak', 'shield-basic', 'shield-strong', 'shield-legendary');
        
        // Add appropriate class based on score
        if (antiFragileScore < 0) {
            shieldContainer.classList.add('shield-weak');
        } else if (antiFragileScore <= 5) {
            shieldContainer.classList.add('shield-basic');
        } else if (antiFragileScore <= 11) {
            shieldContainer.classList.add('shield-strong');
        } else {
            shieldContainer.classList.add('shield-legendary');
        }
        
        // Set CSS variable for tier color
        const cardEl = document.getElementById('antifragile-card');
        if (cardEl) {
            cardEl.style.setProperty('--tier-color', afColors.color);
            cardEl.style.setProperty('--tier-color-dark', afColors.class.replace('text-', '#'));
        }
    }
    
    // Card glow, border, and set CSS variables for active state
    const afCard = document.getElementById('antifragile-card');
    if (afCard) {
        afCard.style.boxShadow = `0 4px 24px ${afColors.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`;
        afCard.style.borderColor = afColors.color;
        afCard.classList.add(afColors.class);
        // Set CSS variables for active state glow to use dynamic colors
        afCard.style.setProperty('--tier-color', afColors.color);
        afCard.style.setProperty('--tier-glow', afColors.glow);
        afCard.style.setProperty('--score-color-rgb', afColors.rgb);
    }
    
    // Populate Anti-Fragile sub-scores
    const afSubScoresContainer = document.getElementById('antifragile-sub-scores-container');
    if (afSubScoresContainer && antiFragile?.groupScores) {
        const subScores = [
            { label: 'Strategic Core', value: antiFragile.groupScores.barbellMethodScore || 0, max: 13, min: -1 },
            { label: 'Financial Fortitude', value: antiFragile.groupScores.financialFortitudeScore || 0, max: 1, min: -4 },
            { label: 'Skin in the Game', value: antiFragile.groupScores.skinInTheGameScore || 0, max: 3, min: -2 }
        ];
        
        // Use the unified renderMetricBar function for consistent styling
        afSubScoresContainer.innerHTML = subScores.map(score => 
            renderMetricBar(score.label, score.value, score.max, { 
                isNegative: false,
                min: score.min 
            })
        ).join('');
    }
    
    // ========================================================================
    // POPULATE ANALYSIS SECTION
    // ========================================================================
    populateAnalysis();
    
    // ========================================================================
    // POPULATE HEALTH SCORES
    // ========================================================================
    populateHealthScores();
    
    // ========================================================================
    // POPULATE FINANCIAL METRICS
    // ========================================================================
    populateFinancialMetrics();
    
    // ========================================================================
    // CREATE PERFORMANCE CHART
    // ========================================================================
    createEarningsChart('revenue');
    
    // ========================================================================
    // POPULATE DETAILED FINANCIALS
    // ========================================================================
    populateDetailedFinancials('income');
}

// ============================================
// POPULATE ANALYSIS FUNCTION
// ============================================

// Helper function to calculate company tier
function calculateCompanyTier(qualityScore, idqScore, antiFragileScore) {
    // Normalize scores to 0-100 scale
    const qualityNorm = (qualityScore / 109) * 100;
    const idqNorm = ((idqScore + 3) / 15) * 100; // IDQ range is -3 to 12
    const antiFragileNorm = ((antiFragileScore + 7) / 24) * 100; // Anti-Fragile range is -7 to 17
    
    // Weighted average: Quality 40%, IDQ 35%, Anti-Fragile 25%
    const overallScore = (qualityNorm * 0.4) + (idqNorm * 0.35) + (antiFragileNorm * 0.25);
    
    let tier = {};
    if (overallScore >= 85) {
        tier = { 
            name: 'Apex Performer', 
            color: '#a855f7', 
            class: 'text-purple-500', 
            description: 'Elite companies with exceptional fundamentals, pioneering innovation, and fortress-like resilience',
            score: overallScore
        };
    } else if (overallScore >= 78) {
        tier = { 
            name: 'Industry Powerhouse', 
            color: '#3b82f6', 
            class: 'text-blue-500', 
            description: 'Strong companies leading their industries with robust competitive advantages',
            score: overallScore
        };
    } else if (overallScore >= 65) {
        tier = { 
            name: 'Quality Compounder', 
            color: '#22c55e', 
            class: 'text-green-500', 
            description: 'Solid companies with good fundamentals and steady growth potential',
            score: overallScore
        };
    } else if (overallScore >= 55) {
        tier = { 
            name: 'Mixed Signals', 
            color: '#eab308', 
            class: 'text-yellow-500', 
            description: 'Companies with mixed signals showing both promise and challenges',
            score: overallScore
        };
    } else if (overallScore >= 32) {
        tier = { 
            name: 'Positionally Challenged', 
            color: '#f97316', 
            class: 'text-orange-500', 
            description: 'Companies requiring significant improvements but with turnaround potential',
            score: overallScore
        };
    } else {
        tier = { 
            name: 'High Risk', 
            color: '#ef4444', 
            class: 'text-red-500', 
            description: 'High-risk companies that may offer value for contrarian investors',
            score: overallScore
        };
    }
    
    return tier;
}

function populateAnalysis() {
    const analysisContainer = document.getElementById('company-analysis');
    if (!analysisContainer || !state.currentStockData) return;
    
    const trendAnalysis = state.currentStockData.LLM_Reports?.Trend_Analysis;
    const portfolio = state.currentStockData.Portfolio;
    
    if (!trendAnalysis) return;
    
    // Generate investment thesis
    const qualityScore = parseFloat(portfolio.qualityScore) || 0;
    const idqScore = parseFloat(state.currentStockData.LLM_Reports?.IDQ_Report?.idqScore) || 0;
    const antiFragileScore = parseFloat(state.currentStockData.Anti_Fragile_Score?.totalScore) || 0;
    
    // Calculate the company tier
    const companyTier = calculateCompanyTier(qualityScore, idqScore, antiFragileScore);
    
    let thesisStrength = 'moderate';
    if (qualityScore > 90 && idqScore > 10) thesisStrength = 'strong';
    else if (qualityScore < 60 || idqScore < 3) thesisStrength = 'weak';
    
    const thesisElements = [];
    
    // Quality-based insight
    if (qualityScore > 85) {
        thesisElements.push(`With an exceptional Quality Score of ${qualityScore.toFixed(1)}, ${portfolio.companyName} demonstrates best-in-class operational excellence and financial strength.`);
    } else if (qualityScore > 70) {
        thesisElements.push(`The solid Quality Score of ${qualityScore.toFixed(1)} indicates ${portfolio.companyName} maintains strong fundamentals with room for improvement.`);
    } else {
        thesisElements.push(`The Quality Score of ${qualityScore.toFixed(1)} suggests ${portfolio.companyName} faces operational challenges that require monitoring.`);
    }
    
    // Innovation insight
    const idqGrade = state.currentStockData.LLM_Reports?.IDQ_Report?.grade;
    if (idqGrade) {
        thesisElements.push(`As an innovation "${idqGrade}", the company ${idqScore >= 9 ? 'leads' : idqScore >= 6 ? 'actively participates in' : 'follows'} industry transformation through ${idqScore >= 9 ? 'pioneering' : 'strategic'} technology adoption.`);
    }
    
    // Anti-fragility insight
    if (antiFragileScore >= 12) {
        thesisElements.push(`The Anti-Fragile Score of ${antiFragileScore} reveals a company built to thrive in chaos, with exceptional resilience to market shocks.`);
    } else if (antiFragileScore >= 7) {
        thesisElements.push(`With an Anti-Fragile Score of ${antiFragileScore}, the company shows good adaptability to market stress.`);
    }
    
    // Add peak metrics insight
    const llmResearch = state.currentStockData.LLM_Research_and_Comments;
    const financialResilience = parseFloat(llmResearch?.Financials_Group?.financialResilience || 0);
    const moatDirection = parseFloat(llmResearch?.Moat_Group?.moatDirection || 0);
    
    if (financialResilience === 5) {
        thesisElements.push(`Achieving a perfect Financial Resilience score demonstrates fortress-like balance sheet strength.`);
    }
    
    if (moatDirection === 5) {
        thesisElements.push(`A maximum Moat Direction score indicates competitive advantages are rapidly expanding.`);
    }
    
    // Parse bull and bear cases from JSON strings
    let bullishTraits = [];
    let bearishTraits = [];
    
    try {
        if (trendAnalysis.bullishTraits) {
            bullishTraits = JSON.parse(trendAnalysis.bullishTraits);
        }
    } catch (e) {
        console.error('Failed to parse bullish traits');
    }
    
    try {
        if (trendAnalysis.bearishTraits) {
            bearishTraits = JSON.parse(trendAnalysis.bearishTraits);
        }
    } catch (e) {
        console.error('Failed to parse bearish traits');
    }
    
    // Parse company analysis to get both Big Picture and Core Debate sections
    let bigPicture = '';
    let coreDebate = '';
    
    if (trendAnalysis.companyAnalysis) {
        const companyAnalysis = trendAnalysis.companyAnalysis;
        const parts = companyAnalysis.split('## The Core Debate');
        bigPicture = parts[0].replace('## The Big Picture', '').trim();
        coreDebate = parts[1]?.trim() || '';
    }
    
    // Get antiFragile data from state
    const antiFragileData = state.currentStockData?.Anti_Fragile_Score;
    
    // Create more intelligent, concise thesis
    const thesisSummary = generateSmartThesis(qualityScore, idqScore, antiFragileScore, portfolio, llmResearch);
    
    // Find exceptional metrics to highlight
    const exceptionalMetrics = findExceptionalMetrics(llmResearch, antiFragileData);
    
    // Create Investment Synthesis Card
    const investmentSynthesis = document.createElement('section');
    investmentSynthesis.className = 'investment-synthesis-section';
    investmentSynthesis.innerHTML = `
        <div class="investment-synthesis-card">
            <div class="synthesis-container" style="--tier-color: ${companyTier.color}; --tier-glow: ${companyTier.color}40;">
                <div class="synthesis-header">
                    <svg class="synthesis-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                    </svg>
                    <span class="synthesis-title">AI-Powered Investment Synthesis</span>
                    <span class="synthesis-subtitle">Based on comprehensive analysis</span>
                </div>
                
                <div class="synthesis-content">
                    <div class="synthesis-narrative">
                        ${thesisSummary.map((sentence, index) => 
                            `<p>${sentence}</p>`
                        ).join('')}
                    </div>
                    
                    <div class="synthesis-visualization">
                        <canvas id="score-breakdown-chart" class="score-breakdown-chart" width="140" height="140"></canvas>
                        <span class="score-breakdown-label">Score Composition</span>
                    </div>
                </div>
                
                <div class="synthesis-highlights">
                    <div class="tier-badge-compact">
                        <span class="tier-name">${companyTier.name}</span>
                        <div class="tier-score">
                            <span class="tier-score-value">${companyTier.score.toFixed(1)}</span>
                            <span class="tier-score-total">/100</span>
                        </div>
                        <div class="tier-tooltip">
                            <h4>Overall Assessment Tiers:</h4>
                            <div class="tier-list">
                                <div class="tier-list-item"><strong>Apex Performer (85+):</strong> Elite companies with exceptional fundamentals</div>
                                <div class="tier-list-item"><strong>Industry Powerhouse (78-84.9):</strong> Strong companies leading their industries</div>
                                <div class="tier-list-item"><strong>Quality Compounder (65-77.9):</strong> Solid companies with steady growth</div>
                                <div class="tier-list-item"><strong>Mixed Signals (55-64.9):</strong> Companies showing both promise and challenges</div>
                                <div class="tier-list-item"><strong>Positionally Challenged (32-54.9):</strong> Turnaround potential</div>
                                <div class="tier-list-item"><strong>High Risk (0-31.9):</strong> Significant headwinds</div>
                            </div>
                            <div class="tier-formula">Calculated: Quality (40%) + IDQ (35%) + Anti-Fragile (25%)</div>
                        </div>
                    </div>
                    
                    <div class="synthesis-metrics">
                        ${exceptionalMetrics.map(metric => `
                            <div class="metric-highlight ${metric.isNegative ? 'metric-highlight-negative' : ''}">
                                <span class="metric-highlight-icon">${metric.isNegative ? '⚠' : '✓'}</span>
                                <span class="metric-highlight-text">
                                    <span class="metric-highlight-value">${metric.value}</span> ${metric.label}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    </section>`;
    
    // Insert Synthesis Card after scores section
    const scoresSection = document.querySelector('.scores-section');
    if (scoresSection && scoresSection.nextSibling) {
        scoresSection.parentNode.insertBefore(investmentSynthesis, scoresSection.nextSibling);
    }
    
    // Draw the score breakdown chart
    setTimeout(() => drawScoreBreakdownChart(qualityScore, idqScore, antiFragileScore, companyTier), 100);
    
    // Generate the rest of the analysis sections (without Investment Thesis)
    analysisContainer.innerHTML = `
        <div class="analysis-grid">
            ${bigPicture ? `
            <div class="analysis-card glass-morphism border-l-4 border-green-500">
                <div class="analysis-header">
                    <h3 class="analysis-title">The Big Picture</h3>
                </div>
                <div class="analysis-content">
                    <p class="secondary-text leading-relaxed">${bigPicture}</p>
                </div>
            </div>
            ` : ''}
            
            ${coreDebate ? `
            <div class="analysis-card glass-morphism border-l-4 border-purple-500">
                <div class="analysis-header">
                    <h3 class="analysis-title">The Core Debate</h3>
                </div>
                <div class="analysis-content">
                    <p class="secondary-text leading-relaxed">${coreDebate}</p>
                </div>
            </div>
            ` : ''}
            
            <div class="analysis-card glass-morphism">
                <div class="analysis-header">
                    <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                    </svg>
                    <h3 class="analysis-title">Bull Case</h3>
                </div>
                <div class="analysis-content">
                    ${bullishTraits.length > 0 ? 
                        `<ul class="space-y-2">
                            ${bullishTraits.slice(0, 3).map(trait => 
                                `<li class="text-sm">• <strong>${trait.headline || ''}</strong>: ${trait.description || ''}</li>`
                            ).join('')}
                        </ul>` : 
                        '<p>No bull case data available.</p>'
                    }
                </div>
            </div>
            
            <div class="analysis-card glass-morphism">
                <div class="analysis-header">
                    <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                    <h3 class="analysis-title">Bear Case</h3>
                </div>
                <div class="analysis-content">
                    ${bearishTraits.length > 0 ? 
                        `<ul class="space-y-2">
                            ${bearishTraits.slice(0, 3).map(trait => 
                                `<li class="text-sm">• <strong>${trait.headline || ''}</strong>: ${trait.description || ''}</li>`
                            ).join('')}
                        </ul>` : 
                        '<p>No bear case data available.</p>'
                    }
                </div>
            </div>
            
            <div class="analysis-card glass-morphism">
                <div class="analysis-header">
                    <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                    <h3 class="analysis-title">Key Risks</h3>
                </div>
                <div class="analysis-content">
                    ${trendAnalysis.companyAnalysis ? 
                        `<p>${trendAnalysis.companyAnalysis.substring(0, 300)}...</p>` :
                        '<p>No risk analysis available.</p>'
                    }
                </div>
            </div>
        </div>
    `;
}

// ============================================
// POPULATE HEALTH SCORES
// ============================================

function populateHealthScores() {
    if (!state.currentStockData) return;
    
    const financials = state.currentStockData.API_Financials;
    const healthScores = financials?.Health_Scores || {};
    const currency = state.currentStockData.Portfolio?.stockpricecurrency || 'USD';
    
    // Piotroski F-Score
    const pScore = parseInt(healthScores.piotroskiFScore);
    const pElement = document.getElementById('piotroski-score');
    const pInterpretation = document.getElementById('piotroski-interpretation');
    
    if (pElement && !isNaN(pScore)) {
        pElement.textContent = pScore;
        
        // Apply color scheme based on score
        let colorClass = '';
        let interpretation = '';
        
        if (pScore === 9) {
            colorClass = 'text-purple-400';
            interpretation = 'Exceptional financial strength';
        } else if (pScore === 8) {
            colorClass = 'text-blue-400';
            interpretation = 'Very strong financial health';
        } else if (pScore >= 6) {
            colorClass = 'text-green-400';
            interpretation = 'Good financial position';
        } else if (pScore >= 4) {
            colorClass = 'text-yellow-500';
            interpretation = 'Fair financial health - monitor closely';
        } else if (pScore >= 2) {
            colorClass = 'text-orange-500';
            interpretation = 'Weak financial position - caution advised';
        } else {
            colorClass = 'text-red-500';
            interpretation = 'Poor financial health - high risk';
        }
        
        pElement.className = 'text-5xl font-bold ' + colorClass;
        if (pInterpretation) pInterpretation.textContent = interpretation;
    }
    
    // Altman Z-Score
    const altmanScore = parseFloat(healthScores.altmanZScore);
    const altmanElement = document.getElementById('altman-score');
    const altmanInterpretation = document.getElementById('altman-interpretation');
    
    if (altmanElement && !isNaN(altmanScore)) {
        altmanElement.textContent = altmanScore.toFixed(2);
        
        let colorClass = '';
        let interpretation = '';
        
        if (altmanScore > 3) {
            colorClass = 'text-green-400';
            interpretation = 'Safe zone - low bankruptcy risk';
        } else if (altmanScore >= 1.8) {
            colorClass = 'text-yellow-500';
            interpretation = 'Grey zone - moderate risk';
        } else {
            colorClass = 'text-red-500';
            interpretation = 'Distress zone - high bankruptcy risk';
        }
        
        altmanElement.className = 'text-5xl font-bold ' + colorClass;
        if (altmanInterpretation) altmanInterpretation.textContent = interpretation;
    }
    
    // Working Capital
    const workingCapitalValue = healthScores.workingCapital;
    const wcElement = document.getElementById('working-capital');
    const wcInterpretation = document.getElementById('working-capital-interpretation');
    
    if (wcElement && workingCapitalValue !== undefined) {
        const workingCapital = parseFloat(workingCapitalValue);
        
        if (!isNaN(workingCapital)) {
            wcElement.textContent = formatCurrency(workingCapital, 1, currency);
            wcElement.className = 'text-4xl font-bold ' + (workingCapital > 0 ? 'text-green-400' : 'text-red-400');
            
            if (wcInterpretation) {
                if (workingCapital > 0) {
                    wcInterpretation.textContent = 'Positive working capital - can meet short-term obligations';
                } else {
                    wcInterpretation.textContent = 'Negative working capital - potential liquidity concerns';
                }
            }
        }
    }
}

// ============================================
// POPULATE FINANCIAL METRICS
// ============================================

function populateFinancialMetrics() {
    const metricsContainer = document.getElementById('key-financial-metrics');
    if (!metricsContainer || !state.currentStockData) return;
    
    const apiFinancials = state.currentStockData.API_Financials;
    const healthScores = apiFinancials?.Health_Scores || {};
    const ttm = apiFinancials?.TTM || {};
    const ratios = ttm.Ratios || {};
    const income = ttm.Income_Statement || {};
    
    const metrics = [
        {
            category: 'Valuation',
            items: [
                { label: 'Market Cap', value: formatCurrency(parseFloat(healthScores.marketCap)) },
                { label: 'P/E Ratio', value: ratios.peRatio ? parseFloat(ratios.peRatio).toFixed(2) : 'N/A' },
                { label: 'P/B Ratio', value: ratios.priceToBookRatio ? parseFloat(ratios.priceToBookRatio).toFixed(2) : 'N/A' },
                { label: 'EV/EBITDA', value: ratios.evToEBITDA ? parseFloat(ratios.evToEBITDA).toFixed(2) : 'N/A' }
            ]
        },
        {
            category: 'Profitability',
            items: [
                { label: 'Revenue', value: formatCurrency(parseFloat(income.revenue)) },
                { label: 'Gross Margin', value: ratios.grossProfitMargin ? `${parseFloat(ratios.grossProfitMargin).toFixed(1)}%` : 'N/A' },
                { label: 'Operating Margin', value: ratios.operatingMargin ? `${parseFloat(ratios.operatingMargin).toFixed(1)}%` : 'N/A' },
                { label: 'Net Margin', value: ratios.netProfitMargin ? `${parseFloat(ratios.netProfitMargin).toFixed(1)}%` : 'N/A' }
            ]
        },
        {
            category: 'Growth',
            items: [
                { label: 'Revenue Growth', value: ratios.revenueGrowth ? `${parseFloat(ratios.revenueGrowth).toFixed(1)}%` : 'N/A' },
                { label: 'EPS Growth', value: ratios.epsGrowth ? `${parseFloat(ratios.epsGrowth).toFixed(1)}%` : 'N/A' },
                { label: 'Altman Z-Score', value: healthScores.altmanZScore || 'N/A' },
                { label: 'Piotroski F-Score', value: healthScores.piotroskiFScore || 'N/A' }
            ]
        },
        {
            category: 'Financial Health',
            items: [
                { label: 'Current Ratio', value: ratios.currentRatio ? parseFloat(ratios.currentRatio).toFixed(2) : 'N/A' },
                { label: 'Debt/Equity', value: ratios.debtToEquityRatio ? parseFloat(ratios.debtToEquityRatio).toFixed(2) : 'N/A' },
                { label: 'ROE', value: ratios.returnOnEquity ? `${parseFloat(ratios.returnOnEquity).toFixed(1)}%` : 'N/A' },
                { label: 'ROA', value: ratios.returnOnAssets ? `${parseFloat(ratios.returnOnAssets).toFixed(1)}%` : 'N/A' }
            ]
        }
    ];
    
    metricsContainer.innerHTML = `
        <div class="metrics-grid">
            ${metrics.map(category => `
                <div class="metric-category glass-morphism">
                    <h3 class="category-title">${category.category}</h3>
                    <div class="metric-items">
                        ${category.items.map(item => {
                            let valueClass = 'metric-value';
                            let displayValue = item.value || 'N/A';
                            
                            // Add color to growth metrics
                            if (item.label.includes('Growth') && item.value && item.value !== 'N/A') {
                                const growth = parseFloat(item.value);
                                if (growth > 0) valueClass += ' text-green-400';
                                else if (growth < 0) valueClass += ' text-red-400';
                            }
                            // Add color to scores
                            else if (item.label.includes('Score') && item.value && item.value !== 'N/A') {
                                const score = parseFloat(item.value);
                                if (item.label.includes('Piotroski')) {
                                    if (score >= 7) valueClass += ' text-green-400';
                                    else if (score >= 4) valueClass += ' text-yellow-500';
                                    else valueClass += ' text-red-400';
                                } else if (item.label.includes('Altman')) {
                                    if (score > 3) valueClass += ' text-green-400';
                                    else if (score >= 1.8) valueClass += ' text-yellow-500';
                                    else valueClass += ' text-red-400';
                                }
                            }
                            // Add color to ROE/ROA
                            else if ((item.label === 'ROE' || item.label === 'ROA') && item.value && item.value !== 'N/A') {
                                const returnVal = parseFloat(item.value);
                                if (returnVal > 15) valueClass += ' text-green-400';
                                else if (returnVal > 5) valueClass += ' text-yellow-500';
                                else if (returnVal < 0) valueClass += ' text-red-400';
                            }
                            
                            return `
                            <div class="metric-item">
                                <span class="metric-label">${item.label}</span>
                                <span class="${valueClass}">${displayValue}</span>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ============================================
// MAIN DATA FETCHING
// ============================================

async function fetchAndDisplayCompanyData(ticker) {
    try {
        showLoadingState();
        
        const db = firebase.firestore();
        const querySnapshot = await db.collection("stocks")
            .where("Portfolio.ticker", "==", ticker.toUpperCase())
            .get();
        
        if (querySnapshot.empty) {
            showError('Company not found: ' + ticker);
            hideLoadingState();
            return;
        }
        
        const stockData = querySnapshot.docs[0].data();
        state.currentStockData = stockData;
        state.currentTicker = ticker.toUpperCase();
        
        // Update recent companies with website if available
        const website = stockData.API_Financials?.General?.companyWebsite || null;
        updateRecentCompanies(ticker.toUpperCase(), stockData.Portfolio.companyName, website);
        
        // Populate everything
        await populateCompanyCard();
        
        // Calculate rankings now that data is loaded
        calculateScoreRankings().catch(err => {
            console.error('Failed to calculate rankings:', err);
        });
        
        hideLoadingState();
        
    } catch (error) {
        console.error('Error fetching company data:', error);
        showError('Failed to load company data: ' + error.message);
        hideLoadingState();
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function updateRecentCompanies(ticker, companyName, website = null) {
    const recent = state.recentCompanies.filter(c => c.ticker !== ticker);
    recent.unshift({ ticker, companyName, website });
    state.recentCompanies = recent.slice(0, 5);
    localStorage.setItem('recentCompanies', JSON.stringify(state.recentCompanies));
    displayRecentCompanies();
}

// Helper function to try multiple logo providers
function tryMultipleLogoProviders(logoEl, fallbackEl, hostname, ticker) {
    const providers = [
        {
            name: 'Clearbit',
            url: `https://logo.clearbit.com/${hostname}`,
            size: 'high'
        },
        {
            name: 'Google Favicons',
            url: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
            size: 'medium'
        },
        {
            name: 'DuckDuckGo',
            url: `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
            size: 'low'
        }
    ];
    
    let providerIndex = 0;
    const cachedLogos = JSON.parse(localStorage.getItem('cachedCompanyLogos') || '{}');
    
    function tryNextProvider() {
        if (providerIndex >= providers.length) {
            // All providers failed
            console.log(`All logo providers failed for ${ticker}`);
            logoEl.style.display = 'none';
            if (fallbackEl) fallbackEl.style.display = 'flex';
            return;
        }
        
        const provider = providers[providerIndex];
        console.log(`Trying ${provider.name} for ${ticker}: ${provider.url}`);
        
        logoEl.src = provider.url;
        logoEl.onload = function() {
            console.log(`${provider.name} loaded successfully for ${ticker}`);
            this.style.display = 'block';
            if (fallbackEl) fallbackEl.style.display = 'none';
            
            // Cache the successful URL
            cachedLogos[ticker] = provider.url;
            localStorage.setItem('cachedCompanyLogos', JSON.stringify(cachedLogos));
        };
        
        logoEl.onerror = function() {
            console.log(`${provider.name} failed for ${ticker}`);
            providerIndex++;
            tryNextProvider();
        };
    }
    
    tryNextProvider();
}

function displayRecentCompanies() {
    const container = document.getElementById('recent-companies');
    if (!container) return;
    
    // Clear localStorage if old format detected (for testing)
    const firstItem = state.recentCompanies[0];
    if (firstItem && !('website' in firstItem)) {
        console.log('Clearing old recent companies format');
        state.recentCompanies = [];
        localStorage.removeItem('recentCompanies');
    }
    
    container.innerHTML = state.recentCompanies.map((company, index) => {
        return `
            <div class="recent-company-item" onclick="navigateToCompany('${company.ticker}')">
                <div class="company-info-row">
                    <img class="company-mini-logo" 
                         id="mini-logo-${index}"
                         alt="${company.ticker}"
                         style="display:none;">
                    <div id="mini-logo-fallback-${index}" class="logo-fallback-mini">
                        <span>${company.ticker.charAt(0)}</span>
                    </div>
                    <div class="company-text">
                        <span class="ticker">${company.ticker}</span>
                        <span class="name">${company.companyName}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Now set the logo sources and handlers after rendering
    state.recentCompanies.forEach((company, index) => {
        const logoEl = document.getElementById(`mini-logo-${index}`);
        const fallbackEl = document.getElementById(`mini-logo-fallback-${index}`);
        
        console.log(`Processing ${company.ticker}: website="${company.website}", logoEl=${!!logoEl}`);
        
        if (logoEl && company.website) {
            try {
                const hostname = new URL(company.website).hostname;
                
                // Check if we have a cached logo URL
                const cachedLogos = JSON.parse(localStorage.getItem('cachedCompanyLogos') || '{}');
                
                if (cachedLogos[company.ticker]) {
                    // Use cached logo URL
                    console.log(`Using cached logo for ${company.ticker}: ${cachedLogos[company.ticker]}`);
                    logoEl.src = cachedLogos[company.ticker];
                    logoEl.onload = function() {
                        this.style.display = 'block';
                        if (fallbackEl) fallbackEl.style.display = 'none';
                    };
                    logoEl.onerror = function() {
                        // Cached URL failed, try fresh fetch
                        delete cachedLogos[company.ticker];
                        localStorage.setItem('cachedCompanyLogos', JSON.stringify(cachedLogos));
                        tryMultipleLogoProviders(logoEl, fallbackEl, hostname, company.ticker);
                    };
                } else {
                    // No cache, try multiple providers
                    tryMultipleLogoProviders(logoEl, fallbackEl, hostname, company.ticker);
                }
            } catch (e) {
                console.log(`Invalid URL for ${company.ticker}: ${company.website}`, e);
            }
        } else if (!company.website) {
            console.log(`No website stored for ${company.ticker}`);
        }
    });
}

function navigateToCompany(ticker) {
    window.location.href = `?ticker=${ticker}`;
}

function showLoadingState() {
    const loader = document.getElementById('app-loading');
    if (loader) {
        loader.style.display = 'flex';
        loader.classList.remove('fade-out');
    }
}

function hideLoadingState() {
    const loader = document.getElementById('app-loading');
    const app = document.getElementById('app');
    
    if (loader) {
        loader.classList.add('fade-out');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 300);
    }
    if (app) {
        app.classList.add('loaded');
    }
}

function showError(message) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-message';
    errorContainer.textContent = message;
    errorContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: rgba(239, 68, 68, 0.9);
        color: white;
        border-radius: 8px;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(errorContainer);
    
    setTimeout(() => errorContainer.remove(), 5000);
}

// ============================================
// DETAILED FINANCIALS FUNCTIONALITY
// ============================================

let currentFinancialView = 'income';

function populateDetailedFinancials(viewType = 'income') {
    currentFinancialView = viewType;
    const container = document.getElementById('financial-data-content');
    if (!container || !state.currentStockData) return;
    
    const financials = state.currentStockData.API_Financials;
    if (!financials) {
        container.innerHTML = '<p class="text-center muted-heading">No financial data available</p>';
        return;
    }
    
    const currentYear = new Date().getFullYear();
    
    // Helper function to get nested values
    const getValue = (root, path) => path.split('.').reduce((obj, key) => obj?.[key], root);
    
    // Helper to build table HTML
    const buildTable = (title, periods, metrics) => {
        let html = `
            <div class="financial-table-wrapper">
                <h3 class="text-lg font-semibold mb-4">${title}</h3>
                <table class="w-full text-sm">
                    <thead class="table-header">
                        <tr>
                            <th class="text-left px-4 py-3 font-medium secondary-text">Metric</th>
        `;
        
        periods.forEach(p => {
            html += `<th class="text-right px-4 py-3 font-medium secondary-text">${p.label}</th>`;
        });
        
        html += '</tr></thead><tbody class="divide-y divide-gray-700">';
        
        metrics.forEach(metric => {
            html += `<tr class="hover:bg-gray-800/50 transition-colors">`;
            html += `<td class="px-4 py-3 secondary-text">${metric.name}</td>`;
            
            let previousValue = null;
            periods.forEach(period => {
                const fullPath = period.isEstimate ? 
                    `Estimates.${period.key}.${metric.key}` : 
                    `${period.key}.${metric.key}`;
                const value = getValue(financials, fullPath);
                
                let displayValue = 'N/A';
                let trendClass = '';
                
                if (value != null) {
                    const numValue = parseFloat(String(value).replace(/,/g, ''));
                    
                    if (!isNaN(numValue)) {
                        if (metric.format === 'currency') {
                            displayValue = formatCurrency(numValue, 1, period.currency || 'USD');
                        } else if (metric.format === 'percent') {
                            // Check if value is already a percentage
                            displayValue = typeof value === 'string' && value.includes('%') ? 
                                value : `${numValue.toFixed(1)}%`;
                        } else {
                            displayValue = numValue.toFixed(2);
                        }
                        
                        // Determine trend
                        if (previousValue !== null && !period.isEstimate) {
                            if (numValue > previousValue * 1.05) trendClass = 'text-green-400';
                            else if (numValue < previousValue * 0.95) trendClass = 'text-red-400';
                        }
                        previousValue = numValue;
                    }
                }
                
                const estimateClass = period.isEstimate ? 'text-blue-400' : '';
                html += `<td class="px-4 py-3 text-right font-mono ${trendClass} ${estimateClass}">${displayValue}</td>`;
            });
            
            html += '</tr>';
        });
        
        html += '</tbody></table></div>';
        return html;
    };
    
    // Define periods
    const historicalPeriods = [
        { key: 'Y4', label: `${currentYear - 4}`, currency: financials.Y4?.reportedCurrency },
        { key: 'Y3', label: `${currentYear - 3}`, currency: financials.Y3?.reportedCurrency },
        { key: 'Y2', label: `${currentYear - 2}`, currency: financials.Y2?.reportedCurrency },
        { key: 'Y1', label: `${currentYear - 1}`, currency: financials.Y1?.reportedCurrency },
        { key: 'TTM', label: 'TTM', currency: financials.TTM?.reportedCurrency }
    ];
    
    const estimatePeriods = [
        { key: 'Y0FWD', label: `${currentYear}E`, isEstimate: true, currency: 'USD' },
        { key: 'Y1FWD', label: `${currentYear + 1}E`, isEstimate: true, currency: 'USD' },
        { key: 'Y2FWD', label: `${currentYear + 2}E`, isEstimate: true, currency: 'USD' }
    ];
    
    let html = '<div class="overflow-x-auto">';
    
    switch(viewType) {
        case 'income':
            const incomeMetrics = [
                { name: 'Revenue', key: 'Income_Statement.revenue', format: 'currency' },
                { name: 'Cost of Revenue', key: 'Income_Statement.costOfRevenue', format: 'currency' },
                { name: 'Gross Profit', key: 'Income_Statement.grossProfit', format: 'currency' },
                { name: 'Operating Expenses', key: 'Income_Statement.operatingExpenses', format: 'currency' },
                { name: 'Operating Income', key: 'Income_Statement.operatingIncome', format: 'currency' },
                { name: 'EBITDA', key: 'Income_Statement.eBITDA', format: 'currency' },
                { name: 'Net Income', key: 'Income_Statement.netIncome', format: 'currency' },
                { name: 'EPS', key: 'Income_Statement.ePS', format: 'number' },
                { name: 'Shares Outstanding', key: 'Income_Statement.weightedAverageSharesOutstanding', format: 'number' }
            ];
            
            const marginMetrics = [
                { name: 'Gross Margin', key: 'Ratios.grossProfitMargin', format: 'percent' },
                { name: 'Operating Margin', key: 'Ratios.operatingProfitMargin', format: 'percent' },
                { name: 'Net Margin', key: 'Ratios.netProfitMargin', format: 'percent' },
                { name: 'EBITDA Margin', key: 'Ratios.eBITDAMargin', format: 'percent' }
            ];
            
            if (financials.Estimates) {
                const estimateMetrics = [
                    { name: 'Revenue', key: 'revenueAvg', format: 'currency' },
                    { name: 'EBITDA', key: 'eBITDAAvg', format: 'currency' },
                    { name: 'Net Income', key: 'netIncomeAvg', format: 'currency' },
                    { name: 'EPS', key: 'ePSAvg', format: 'number' }
                ];
                html += buildTable('Forward Estimates', estimatePeriods, estimateMetrics);
            }
            
            html += buildTable('Income Statement', historicalPeriods, incomeMetrics);
            html += buildTable('Profit Margins', historicalPeriods, marginMetrics);
            break;
            
        case 'balance':
            const assetMetrics = [
                { name: 'Total Assets', key: 'Balance_Sheet.totalAssets', format: 'currency' },
                { name: 'Current Assets', key: 'Balance_Sheet.totalCurrentAssets', format: 'currency' },
                { name: 'Cash & Equivalents', key: 'Balance_Sheet.cashAndCashEquivalents', format: 'currency' },
                { name: 'Short-term Investments', key: 'Balance_Sheet.shortTermInvestments', format: 'currency' },
                { name: 'Inventory', key: 'Balance_Sheet.inventory', format: 'currency' },
                { name: 'Property Plant Equipment', key: 'Balance_Sheet.propertyPlantEquipmentNet', format: 'currency' }
            ];
            
            const liabilityMetrics = [
                { name: 'Total Liabilities', key: 'Balance_Sheet.totalLiabilities', format: 'currency' },
                { name: 'Current Liabilities', key: 'Balance_Sheet.totalCurrentLiabilities', format: 'currency' },
                { name: 'Total Debt', key: 'Balance_Sheet.totalDebt', format: 'currency' },
                { name: 'Long-term Debt', key: 'Balance_Sheet.longTermDebt', format: 'currency' },
                { name: 'Stockholder Equity', key: 'Balance_Sheet.totalStockholderEquity', format: 'currency' },
                { name: 'Retained Earnings', key: 'Balance_Sheet.retainedEarnings', format: 'currency' }
            ];
            
            const ratioMetrics = [
                { name: 'Current Ratio', key: 'Ratios.currentRatio', format: 'number' },
                { name: 'Quick Ratio', key: 'Ratios.quickRatio', format: 'number' },
                { name: 'Debt to Equity', key: 'Ratios.debtEquityRatio', format: 'number' },
                { name: 'Debt to Assets', key: 'Ratios.debtToAssets', format: 'number' }
            ];
            
            html += buildTable('Assets', historicalPeriods, assetMetrics);
            html += buildTable('Liabilities & Equity', historicalPeriods, liabilityMetrics);
            html += buildTable('Balance Sheet Ratios', historicalPeriods, ratioMetrics);
            break;
            
        case 'cashflow':
            const operatingMetrics = [
                { name: 'Operating Cash Flow', key: 'Cash_Flow.netCashProvidedByOperatingActivities', format: 'currency' },
                { name: 'Capital Expenditures', key: 'Cash_Flow.capitalExpenditures', format: 'currency' },
                { name: 'Free Cash Flow', key: 'Cash_Flow.freeCashflow', format: 'currency' },
                { name: 'Depreciation & Amortization', key: 'Cash_Flow.depreciationAndAmortization', format: 'currency' }
            ];
            
            const investingMetrics = [
                { name: 'Investing Cash Flow', key: 'Cash_Flow.netCashUsedForInvestingActivities', format: 'currency' },
                { name: 'Acquisitions', key: 'Cash_Flow.acquisitionsNet', format: 'currency' },
                { name: 'Investments', key: 'Cash_Flow.investmentsInPropertyPlantAndEquipment', format: 'currency' }
            ];
            
            const financingMetrics = [
                { name: 'Financing Cash Flow', key: 'Cash_Flow.netCashUsedProvidedByFinancingActivities', format: 'currency' },
                { name: 'Dividends Paid', key: 'Cash_Flow.dividendsPaid', format: 'currency' },
                { name: 'Stock Repurchased', key: 'Cash_Flow.stockRepurchased', format: 'currency' },
                { name: 'Debt Repayment', key: 'Cash_Flow.debtRepayment', format: 'currency' }
            ];
            
            html += buildTable('Operating Activities', historicalPeriods, operatingMetrics);
            html += buildTable('Investing Activities', historicalPeriods, investingMetrics);
            html += buildTable('Financing Activities', historicalPeriods, financingMetrics);
            break;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// PERFORMANCE CHART FUNCTIONALITY
// ============================================

let currentChartMetric = 'revenue';

function createEarningsChart(metricType = 'revenue') {
    currentChartMetric = metricType;
    const canvas = document.getElementById('earnings-chart');
    if (!canvas || !state.currentStockData) return;

    const financials = state.currentStockData.API_Financials;
    const portfolio = state.currentStockData.Portfolio;
    const ctx = canvas.getContext('2d');

    // Get theme-aware colors from CSS variables (read from body to pick up light-theme overrides)
    const computedStyle = getComputedStyle(document.body);
    const gridColor = computedStyle.getPropertyValue('--chart-grid-color').trim();
    const textColor = computedStyle.getPropertyValue('--chart-text-color').trim();
    const pointColor = computedStyle.getPropertyValue('--color-text-primary').trim();
    const estimatePointColor = computedStyle.getPropertyValue('--chart-line-color').trim();
    const upColor = computedStyle.getPropertyValue('--chart-positive').trim();
    const downColor = computedStyle.getPropertyValue('--chart-negative').trim();
    const neutralColor = computedStyle.getPropertyValue('--color-text-muted').trim();
    const labelColor = computedStyle.getPropertyValue('--color-text-primary').trim();
    const estimateTextColor = computedStyle.getPropertyValue('--chart-line-color').trim();

    const metricConfigs = {
        revenue: { path: 'Income_Statement.revenue', label: 'Revenue' },
        netIncome: { path: 'Income_Statement.netIncome', label: 'Net Income' },
        eps: { path: 'Income_Statement.ePS', label: 'EPS' }
    };
    
    const config = metricConfigs[metricType];
    const isCurrency = metricType !== 'eps';

    const parseValue = (val) => val != null ? parseFloat(String(val).replace(/,/g, '')) : null;
    const getValue = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);

    let dataPoints = [], years = [], currencies = [];

    // Get historical data
    ['Y4', 'Y3', 'Y2', 'Y1', 'TTM'].forEach((period, index) => {
        const periodData = financials?.[period];
        if (periodData) {
            const value = getValue(periodData, config.path);
            if (value != null) {
                dataPoints.push(parseValue(value));
                years.push(new Date().getFullYear() - 4 + index);
                currencies.push(periodData.reportedCurrency || 'USD');
            }
        }
    });
    
    const historicalDataCount = dataPoints.length;

    // Get forecast data
    const estimatePaths = { 
        revenue: 'revenueAvg', 
        netIncome: 'netIncomeAvg', 
        eps: 'ePSAvg' 
    };
    const estimateKey = estimatePaths[metricType];
    
    if (financials?.Estimates && estimateKey) {
        ['Y0FWD', 'Y1FWD', 'Y2FWD'].forEach((period, index) => {
            const value = financials.Estimates[period]?.[estimateKey];
            if (value != null) {
                dataPoints.push(parseValue(value));
                years.push(new Date().getFullYear() + index);
                currencies.push(currencies[currencies.length - 1] || 'USD');
            }
        });
    }

    // Set canvas size
    const width = canvas.width = canvas.offsetWidth || 800;
    const height = canvas.height = 400;
    const padding = 60;
    
    ctx.clearRect(0, 0, width, height);

    if (dataPoints.length < 2) {
        ctx.fillStyle = textColor;
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Insufficient data for chart', width / 2, height / 2);
        return;
    }

    // Calculate scale
    const maxVal = Math.max(...dataPoints) * 1.1;
    const minVal = Math.min(...dataPoints, 0) * 0.9;
    const range = maxVal - minVal || 1;

    // Draw grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
        const y = padding + (height - 2 * padding) * i / 4;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        // Y-axis labels
        const value = maxVal - (range * i / 4);
        ctx.fillStyle = textColor;
        ctx.font = '11px Inter';
        ctx.textAlign = 'right';
        const label = isCurrency ? formatCurrency(value, 1, currencies[0]) : value.toFixed(2);
        ctx.fillText(label, padding - 10, y + 4);
    }

    // Draw line chart
    ctx.lineWidth = 2.5;
    for (let i = 1; i < dataPoints.length; i++) {
        const x1 = padding + (width - 2 * padding) * (i - 1) / (dataPoints.length - 1);
        const y1 = padding + ((maxVal - dataPoints[i - 1]) / range) * (height - 2 * padding);
        const x2 = padding + (width - 2 * padding) * i / (dataPoints.length - 1);
        const y2 = padding + ((maxVal - dataPoints[i]) / range) * (height - 2 * padding);
        
        // Color based on trend
        if (dataPoints[i] > dataPoints[i - 1]) ctx.strokeStyle = upColor;
        else if (dataPoints[i] < dataPoints[i - 1]) ctx.strokeStyle = downColor;
        else ctx.strokeStyle = neutralColor;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // Draw data points and labels
    dataPoints.forEach((val, i) => {
        const x = padding + (width - 2 * padding) * i / (dataPoints.length - 1);
        const y = padding + ((maxVal - val) / range) * (height - 2 * padding);
        
        // Draw point
        ctx.fillStyle = i >= historicalDataCount ? estimatePointColor : pointColor;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Year label
        ctx.fillStyle = textColor;
        ctx.font = '11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(years[i], x, height - padding + 20);
        
        // Value label
        ctx.fillStyle = i >= historicalDataCount ? estimateTextColor : labelColor;
        ctx.font = '10px Inter';
        const valueLabel = isCurrency ? formatCurrency(val, 1, currencies[i]) : val.toFixed(2);
        ctx.fillText(valueLabel, x, y - 10);
    });

    // Add estimates label
    if (dataPoints.length > historicalDataCount) {
        ctx.fillStyle = estimateTextColor;
        ctx.font = '12px Inter';
        ctx.textAlign = 'right';
        ctx.fillText('Estimates →', width - padding, 30);
    }

    // Chart title
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(config.label + ' Trend', padding, 30);
}

// ============================================
// TOOLTIP EDGE DETECTION
// ============================================

function setupTooltipEdgeDetection() {
    // Use event delegation for dynamically created rank badges
    document.addEventListener('mouseover', function(e) {
        if (e.target.classList.contains('rank-badge') && e.target.hasAttribute('data-tooltip')) {
            const badge = e.target;
            const rect = badge.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            
            // Check if badge is in the left third of viewport
            if (rect.left < viewportWidth / 3) {
                badge.classList.add('tooltip-right');
                badge.classList.remove('tooltip-left', 'tooltip-center');
            }
            // Check if badge is in the right third of viewport
            else if (rect.right > (viewportWidth * 2) / 3) {
                badge.classList.add('tooltip-left');
                badge.classList.remove('tooltip-right', 'tooltip-center');
            }
            // Badge is in the center
            else {
                badge.classList.add('tooltip-center');
                badge.classList.remove('tooltip-left', 'tooltip-right');
            }
        }
    });
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const ticker = urlParams.get('ticker') || 'NVDA';
    
    // Load theme
    if (state.theme === 'light') {
        document.body.classList.add('light-theme');
    }
    
    // Setup dynamic tooltip positioning
    setupTooltipEdgeDetection();
    
    // Load searchable stocks from Firestore
    await loadSearchableStocks();
    
    // Setup search bar
    setupSearchBar();
    
    // Load recent companies
    displayRecentCompanies();
    
    // Fetch and display company data
    await fetchAndDisplayCompanyData(ticker);
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup mobile carousel
    setupMobileCarousel();
});

function setupEventListeners() {
    // Mobile navigation toggle
    const mobileNavTrigger = document.getElementById('mobile-nav-trigger');
    const sidebar = document.getElementById('navigation-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (mobileNavTrigger) {
        mobileNavTrigger.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
            // Prevent body scroll when sidebar is open
            document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
        });
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Close mobile nav on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            state.theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
            localStorage.setItem('theme', state.theme);
            // Redraw charts with new theme colors
            if (state.currentStockData) {
                createEarningsChart(currentChartMetric);
                
                // Also redraw the score breakdown chart with correct text color
                const qualityScore = state.currentStockData?.Portfolio?.Quality_Score || 0;
                const idqScore = state.currentStockData?.LLM_Reports?.IDQ_Report?.totalIDQScore || 0;
                const antiFragileScore = state.currentStockData?.Anti_Fragile_Score?.totalScore || 0;
                const companyTier = calculateCompanyTier(qualityScore, idqScore, antiFragileScore);
                drawScoreBreakdownChart(qualityScore, idqScore, antiFragileScore, companyTier);
            }
        });
    }
    
    // Setup chart tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const metric = e.target.dataset.metric;
            if (metric) {
                // Update active state
                document.querySelectorAll('.tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Redraw chart with new metric
                createEarningsChart(metric);
            }
        });
    });
    
    // Setup financial data tab switching
    document.querySelectorAll('.data-tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const statement = e.target.dataset.statement;
            if (statement) {
                // Update active state
                document.querySelectorAll('.data-tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Load new financial statement
                populateDetailedFinancials(statement);
            }
        });
    });
    
    // Search
    const searchInput = document.getElementById('sidebar-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
}

async function handleSearch(e) {
    const query = e.target.value.trim().toUpperCase();
    if (!query) {
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) resultsContainer.classList.add('hidden');
        return;
    }
    
    try {
        const db = firebase.firestore();
        const querySnapshot = await db.collection("stocks")
            .where("Portfolio.ticker", ">=", query)
            .where("Portfolio.ticker", "<=", query + '\uf8ff')
            .limit(5)
            .get();
        
        const results = querySnapshot.docs.map(doc => ({
            ticker: doc.data().Portfolio.ticker,
            name: doc.data().Portfolio.companyName
        }));
        
        displaySearchResults(results);
    } catch (error) {
        console.error('Search error:', error);
    }
}

function displaySearchResults(results) {
    const container = document.getElementById('search-results');
    if (!container) return;
    
    if (results.length === 0) {
        container.innerHTML = '<div class="no-results">No companies found</div>';
    } else {
        container.innerHTML = results.map(result => `
            <div class="search-result-item" onclick="navigateToCompany('${result.ticker}')">
                <span class="ticker">${result.ticker}</span>
                <span class="name">${result.name}</span>
            </div>
        `).join('');
    }
    
    container.classList.remove('hidden');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// REVELATION PANEL FUNCTIONALITY
// ============================================

// Track currently revealed score
let currentRevealed = null;

function revealScoreDetails(scoreType) {
    console.log('=== REVEAL SCORE DETAILS ===');
    console.log('Score type:', scoreType);
    console.log('Current revealed:', currentRevealed);
    
    // Ensure we have data before proceeding
    if (!state.currentStockData) {
        console.error('No stock data available');
        return;
    }
    
    const panel = document.getElementById('score-revelation-panel');
    const allCards = document.querySelectorAll('.score-card');
    const activeCard = document.getElementById(`${scoreType}-card`);
    const allSections = document.querySelectorAll('.detail-section');
    const activeSection = document.getElementById(`${scoreType}-details`);
    
    if (!panel || !activeCard || !activeSection) {
        console.error('Required elements not found');
        return;
    }
    
    // If clicking the same score, close the panel
    if (currentRevealed === scoreType) {
        panel.classList.remove('revealed');
        allCards.forEach(card => {
            card.classList.remove('active', 'dimmed');
            // Update button text back to "View Details"
            const btn = card.querySelector('.reveal-text');
            if (btn) btn.textContent = 'View Details';
        });
        currentRevealed = null;
        return;
    }
    
    // Populate content if not already populated
    if (!activeSection.innerHTML || activeSection.innerHTML.trim() === '') {
        activeSection.innerHTML = generateExpandedContent(scoreType);
    }
    
    // Update card states and button text
    allCards.forEach(card => {
        const btn = card.querySelector('.reveal-text');
        if (card === activeCard) {
            card.classList.add('active');
            card.classList.remove('dimmed');
            // Update active card button to "Hide Details"
            if (btn) btn.textContent = 'Hide Details';
        } else {
            card.classList.add('dimmed');
            card.classList.remove('active');
            // Update other cards to "View Details"
            if (btn) btn.textContent = 'View Details';
        }
    });
    
    // Update section visibility
    allSections.forEach(section => {
        section.classList.remove('active');
    });
    activeSection.classList.add('active');
    
    // Set the active color for the panel
    const colorMap = {
        quality: '168, 85, 247',
        idq: '59, 130, 246',
        antifragile: '34, 197, 94'
    };
    panel.style.setProperty('--active-color-rgb', colorMap[scoreType]);
    
    // Reveal the panel
    panel.classList.add('revealed');
    currentRevealed = scoreType;
    
    // Smooth scroll to panel on mobile
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
}

// Mobile swipe detection for carousel
function setupMobileCarousel() {
    if (window.innerWidth > 768) return;
    
    const grid = document.querySelector('.score-cards-grid');
    if (!grid) return;
    
    let startX = 0;
    let scrollLeft = 0;
    
    grid.addEventListener('touchstart', (e) => {
        startX = e.touches[0].pageX - grid.offsetLeft;
        scrollLeft = grid.scrollLeft;
    });
    
    grid.addEventListener('touchmove', (e) => {
        const x = e.touches[0].pageX - grid.offsetLeft;
        const walk = (x - startX) * 2;
        grid.scrollLeft = scrollLeft - walk;
    });
    
    // Detect which card is centered after scroll
    grid.addEventListener('scrollend', () => {
        const cards = grid.querySelectorAll('.score-card');
        const center = grid.scrollLeft + grid.offsetWidth / 2;
        
        cards.forEach(card => {
            const cardCenter = card.offsetLeft + card.offsetWidth / 2;
            if (Math.abs(cardCenter - center) < card.offsetWidth / 2) {
                const scoreType = card.dataset.score;
                if (scoreType && scoreType !== currentRevealed) {
                    revealScoreDetails(scoreType);
                }
            }
        });
    });
}

// Reinitialize on resize
window.addEventListener('resize', () => {
    setupMobileCarousel();
});

// Helper function to format numbers
function formatNumber(value, decimals = 1) {
    if (value === null || value === undefined) return '0';
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return num.toFixed(decimals);
}

// Generate smarter, more substantial thesis
function generateSmartThesis(qualityScore, idqScore, antiFragileScore, portfolio, llmResearch) {
    const thesis = [];
    const companyName = portfolio.companyName;
    
    // Analyze all three scores
    const qualityPercentile = (qualityScore / 109) * 100;
    const idqPercentile = ((idqScore + 3) / 15) * 100;
    const afPercentile = ((antiFragileScore + 7) / 24) * 100;
    
    // Calculate overall score for sentiment determination
    const qualityNorm = (qualityScore / 109) * 100;
    const idqNorm = ((idqScore + 3) / 15) * 100;
    const antiFragileNorm = ((antiFragileScore + 7) / 24) * 100;
    const overallScore = (qualityNorm * 0.4) + (idqNorm * 0.35) + (antiFragileNorm * 0.25);
    
    // Find the standout characteristic
    const scores = [
        { name: 'quality', value: qualityScore, percentile: qualityPercentile, threshold: 85, label: 'operational excellence' },
        { name: 'innovation', value: idqScore, percentile: idqPercentile, threshold: 9, label: 'innovation leadership' },
        { name: 'resilience', value: antiFragileScore, percentile: afPercentile, threshold: 12, label: 'anti-fragile characteristics' }
    ].sort((a, b) => b.percentile - a.percentile);
    
    const leadScore = scores[0];
    const secondScore = scores[1];
    const weakestScore = scores[2];
    
    // First sentence: Be objective based on actual scores
    if (overallScore < 32) {
        // High Risk tier - be clear about challenges
        thesis.push(`${companyName} faces significant operational challenges with a Quality Score of ${qualityScore.toFixed(1)}/109 (${qualityPercentile.toFixed(0)}th percentile), limited innovation capacity (IDQ: ${idqScore}/12), and concerning resilience metrics (Anti-Fragile: ${antiFragileScore}/17).`);
    } else if (overallScore < 55) {
        // Positionally Challenged tier - acknowledge problems while noting any positives
        if (leadScore.percentile >= 50) {
            thesis.push(`${companyName} shows ${leadScore.label} (${leadScore.value}/${leadScore.name === 'quality' ? '109' : leadScore.name === 'innovation' ? '12' : '17'}) but faces material headwinds with ${weakestScore.percentile < 30 ? 'particularly weak' : 'lagging'} ${weakestScore.label} and operational challenges requiring significant improvement.`);
        } else {
            thesis.push(`${companyName} presents a challenged investment profile with below-median scores across quality (${qualityScore.toFixed(1)}/109), innovation (IDQ: ${idqScore}/12), and resilience (${antiFragileScore}/17) metrics, indicating structural issues requiring resolution.`);
        }
    } else if (overallScore < 65) {
        // Mixed Signals tier - balanced perspective
        thesis.push(`${companyName} exhibits mixed fundamentals with a Quality Score of ${qualityScore.toFixed(1)}/109, ${idqScore >= 6 ? 'moderate' : 'developing'} innovation capacity (IDQ: ${idqScore}/12), and ${antiFragileScore >= 7 ? 'adequate' : 'improving'} resilience metrics (${antiFragileScore}/17).`);
    } else if (leadScore.name === 'quality' && qualityScore >= 85) {
        thesis.push(`${companyName} achieves an exceptional Quality Score of ${qualityScore.toFixed(1)}/109, demonstrating best-in-class operational excellence and financial discipline that places it among the elite operators.`);
    } else if (leadScore.name === 'innovation' && idqScore >= 9) {
        const grade = state.currentStockData.LLM_Reports?.IDQ_Report?.grade || 'Pioneer';
        thesis.push(`As an innovation "${grade}" with an IDQ of ${idqScore}/12, ${companyName} stands at the forefront of technological disruption, actively shaping rather than following industry trends.`);
    } else if (leadScore.name === 'resilience' && antiFragileScore >= 12) {
        thesis.push(`With a remarkable Anti-Fragile Score of ${antiFragileScore}/17, ${companyName} exhibits rare resilience characteristics - positioned to strengthen during market turbulence rather than merely survive.`);
    } else {
        // Good but not exceptional
        thesis.push(`${companyName} demonstrates solid fundamentals with a Quality Score of ${qualityScore.toFixed(1)}/109, ${idqScore >= 6 ? 'meaningful' : 'developing'} innovation capacity (IDQ: ${idqScore}), and ${antiFragileScore >= 7 ? 'strong' : 'improving'} resilience metrics.`);
    }
    
    // Second sentence: Highlight concerns for low scores or strengths for high scores
    const moatDirection = parseFloat(llmResearch?.Moat_Group?.moatDirection || 0);
    const financialResilience = parseFloat(llmResearch?.Financials_Group?.financialResilience || 0);
    const cultureFactor = parseFloat(llmResearch?.Culture_Group?.cultureFactor || 0);
    
    if (overallScore < 32) {
        // Focus on key concerns
        if (financialResilience < 2) {
            thesis.push(`Critical financial weaknesses (resilience: ${financialResilience}/5) combined with ${moatDirection < 2 ? 'eroding competitive position' : 'unclear moat dynamics'} raise substantial viability concerns requiring immediate management action.`);
        } else if (moatDirection < 2) {
            thesis.push(`The deteriorating competitive position (moat direction: ${moatDirection}/5) and ${cultureFactor < 2 ? 'weak organizational culture' : 'execution challenges'} suggest continued market share losses and margin pressure ahead.`);
        } else {
            thesis.push(`Multiple red flags including ${qualityScore < 40 ? 'poor operational metrics' : 'weak fundamentals'}, ${idqScore < 0 ? 'negative innovation trajectory' : 'limited R&D capacity'}, and ${antiFragileScore < 0 ? 'fragile balance sheet' : 'inadequate risk management'} warrant extreme caution.`);
        }
    } else if (overallScore < 55) {
        // Highlight main concern but note any positive
        if (moatDirection >= 3) {
            thesis.push(`Despite improving competitive dynamics (moat: ${moatDirection}/5), persistent operational challenges and ${financialResilience < 3 ? 'weak' : 'modest'} financial resilience (${financialResilience}/5) limit near-term recovery potential.`);
        } else {
            thesis.push(`The combination of ${moatDirection < 2 ? 'eroding' : 'stagnant'} competitive position and ${financialResilience < 3 ? 'concerning' : 'mediocre'} financial metrics suggests continued underperformance until structural issues are addressed.`);
        }
    } else if (moatDirection === 5 && financialResilience === 5) {
        thesis.push(`The combination of maximum moat expansion and perfect financial resilience creates a rare competitive fortress with accelerating advantages.`);
    } else if (qualityScore >= 85 && idqScore >= 9) {
        thesis.push(`This rare blend of operational excellence and innovation leadership positions the company to both dominate current markets and capture emerging opportunities.`);
    } else if (antiFragileScore >= 12 && financialResilience >= 4) {
        thesis.push(`Strong balance sheet fundamentals combined with anti-fragile characteristics suggest exceptional downside protection with asymmetric upside potential.`);
    } else if (moatDirection >= 4) {
        thesis.push(`The expanding competitive moat (${moatDirection}/5) indicates strengthening market position and pricing power that should drive sustained outperformance.`);
    } else if (secondScore.percentile >= 70) {
        const label = secondScore.name === 'quality' ? 'solid fundamentals' : 
                     secondScore.name === 'innovation' ? 'innovation capacity' : 
                     'resilience factors';
        thesis.push(`Supporting ${label} (${secondScore.value}/${secondScore.name === 'quality' ? '109' : secondScore.name === 'innovation' ? '12' : '17'}) provide ${overallScore >= 65 ? 'additional conviction' : 'some offset to current challenges'}.`);
    }
    
    // Third sentence: Risk focus for low scores, opportunity for high scores
    if (thesis.length < 3) {
        if (overallScore < 32) {
            thesis.push(`Investment requires extremely high risk tolerance and conviction in dramatic turnaround execution - suitable only for deep value specialists.`);
        } else if (overallScore < 55) {
            thesis.push(`Key monitoring points include evidence of operational improvement, margin recovery, and successful execution of strategic initiatives.`);
        } else if (qualityScore < 60) {
            thesis.push(`Focus areas include operational efficiency improvements and margin expansion initiatives to reach peer-level performance.`);
        } else if (idqScore >= 10 && state.currentStockData.LLM_Reports?.Trend_Analysis?.nextQuarterProjection) {
            thesis.push(`Innovation momentum suggests potential for positive earnings surprises in upcoming quarters.`);
        } else if (antiFragileScore >= 15) {
            thesis.push(`The exceptional anti-fragile profile makes this a compelling portfolio hedge during uncertain market conditions.`);
        }
    }
    
    // Return 2-3 most impactful sentences
    return thesis.slice(0, 3);
}

// Find exceptional metrics to highlight (both positive and concerning)
function findExceptionalMetrics(llmResearch, antiFragile) {
    const metrics = [];
    
    // Check scores
    const financialResilience = parseFloat(llmResearch?.Financials_Group?.financialResilience || 0);
    const moatDirection = parseFloat(llmResearch?.Moat_Group?.moatDirection || 0);
    const moatStability = parseFloat(llmResearch?.Moat_Group?.moatStability || 0);
    const skinInGame = antiFragile?.groupScores?.skinInTheGameScore || 0;
    const cultureFactor = parseFloat(llmResearch?.Culture_Group?.cultureFactor || 0);
    const leadershipRating = parseFloat(llmResearch?.Culture_Group?.leadershipRating || 0);
    const executionRating = parseFloat(llmResearch?.Culture_Group?.executionRating || 0);
    
    // Financial metrics from state
    const financials = state.currentStockData?.API_Financials || {};
    const profitMargin = financials.profitMargin;
    const roeValue = financials.returnOnEquity;
    const revenueGrowth = financials.revenueGrowth;
    const debtToEquity = financials.debtToEquity;
    
    // Calculate overall score to determine general sentiment
    const qualityScore = state.currentStockData?.Portfolio?.Quality_Score || 0;
    const idqScore = state.currentStockData?.LLM_Reports?.IDQ_Report?.totalIDQScore || 0;
    const antiFragileScore = antiFragile?.totalScore || 0;
    
    const qualityNorm = (qualityScore / 109) * 100;
    const idqNorm = ((idqScore + 3) / 15) * 100;
    const antiFragileNorm = ((antiFragileScore + 7) / 24) * 100;
    const overallScore = (qualityNorm * 0.4) + (idqNorm * 0.35) + (antiFragileNorm * 0.25);
    
    // Evaluate ALL metrics regardless of overall score, then prioritize
    // Check positive metrics
    if (financialResilience >= 4.5) {
        metrics.push({ value: 'Excellent', label: 'Financial Resilience', priority: 1, isPositive: true });
    } else if (financialResilience >= 4) {
        metrics.push({ value: 'Strong', label: 'Financial Resilience', priority: 2, isPositive: true });
    } else if (financialResilience < 2) {
        metrics.push({ value: 'Weak', label: 'Financial Health', priority: 1, isNegative: true });
    }
    
    if (moatDirection >= 4.5) {
        metrics.push({ value: 'Expanding', label: 'Competitive Moat', priority: 1, isPositive: true });
    } else if (moatDirection >= 4) {
        metrics.push({ value: 'Strong', label: 'Competitive Moat', priority: 2, isPositive: true });
    } else if (moatDirection < 2) {
        metrics.push({ value: 'Eroding', label: 'Competitive Position', priority: 1, isNegative: true });
    } else if (moatDirection < 3 && overallScore < 55) {
        metrics.push({ value: 'Stagnant', label: 'Market Position', priority: 3, isNegative: true });
    }
    
    if (moatStability >= 4.5) {
        metrics.push({ value: 'Fortress', label: 'Market Position', priority: 1, isPositive: true });
    }
    
    if (skinInGame >= 4) {
        metrics.push({ value: 'Very High', label: 'Insider Ownership', priority: 1, isPositive: true });
    } else if (skinInGame >= 3) {
        metrics.push({ value: 'High', label: 'Insider Ownership', priority: 2, isPositive: true });
    } else if (skinInGame < 0 && overallScore < 55) {
        metrics.push({ value: 'Minimal', label: 'Insider Ownership', priority: 3, isNegative: true });
    }
    
    if (cultureFactor >= 4.5) {
        metrics.push({ value: 'Elite', label: 'Corporate Culture', priority: 1, isPositive: true });
    } else if (cultureFactor > 0 && cultureFactor < 2 && overallScore < 55) {
        metrics.push({ value: 'Poor', label: 'Culture Score', priority: 2, isNegative: true });
    }
    
    if (leadershipRating >= 4.5) {
        metrics.push({ value: 'Visionary', label: 'Leadership', priority: 1, isPositive: true });
    }
    
    if (executionRating >= 4.5) {
        metrics.push({ value: 'Superior', label: 'Execution Track Record', priority: 1, isPositive: true });
    }
    
    // Financial percentage metrics
    if (profitMargin) {
        if (profitMargin > 0.3) {
            metrics.push({ value: `${(profitMargin * 100).toFixed(0)}%`, label: 'Profit Margin', priority: 1, isPositive: true });
        } else if (profitMargin > 0.2) {
            metrics.push({ value: `${(profitMargin * 100).toFixed(0)}%`, label: 'Profit Margin', priority: 2, isPositive: true });
        } else if (profitMargin < 0) {
            metrics.push({ value: 'Negative', label: 'Profit Margin', priority: 1, isNegative: true });
        } else if (profitMargin < 0.05 && overallScore < 55) {
            metrics.push({ value: `${(profitMargin * 100).toFixed(1)}%`, label: 'Profit Margin', priority: 3, isNegative: true });
        }
    }
    
    if (roeValue) {
        if (roeValue > 0.3) {
            metrics.push({ value: `${(roeValue * 100).toFixed(0)}%`, label: 'Return on Equity', priority: 1, isPositive: true });
        } else if (roeValue > 0.2) {
            metrics.push({ value: `${(roeValue * 100).toFixed(0)}%`, label: 'Return on Equity', priority: 2, isPositive: true });
        } else if (roeValue < 0) {
            metrics.push({ value: 'Negative', label: 'Return on Equity', priority: 1, isNegative: true });
        }
    }
    
    if (revenueGrowth) {
        if (revenueGrowth > 0.25) {
            metrics.push({ value: `${(revenueGrowth * 100).toFixed(0)}%`, label: 'Revenue Growth', priority: 1, isPositive: true });
        } else if (revenueGrowth > 0.15) {
            metrics.push({ value: `${(revenueGrowth * 100).toFixed(0)}%`, label: 'Revenue Growth', priority: 2, isPositive: true });
        } else if (revenueGrowth < -0.1) {
            metrics.push({ value: `${(revenueGrowth * 100).toFixed(0)}%`, label: 'Revenue Decline', priority: 1, isNegative: true });
        }
    }
    
    if (debtToEquity && debtToEquity > 2 && overallScore < 55) {
        metrics.push({ value: `${debtToEquity.toFixed(1)}x`, label: 'Debt/Equity', priority: 2, isNegative: true });
    } else if (debtToEquity && debtToEquity < 0.5 && debtToEquity > 0) {
        metrics.push({ value: `${debtToEquity.toFixed(1)}x`, label: 'Low Debt/Equity', priority: 3, isPositive: true });
    }
    
    // Smart selection logic:
    // For high-scoring companies (>65), prioritize positives but include major negatives
    // For mid-scoring companies (55-65), show balanced mix
    // For low-scoring companies (<55), show negatives but include any standout positives
    
    let positiveMetrics = metrics.filter(m => m.isPositive);
    let negativeMetrics = metrics.filter(m => m.isNegative);
    
    // Sort each group by priority
    positiveMetrics.sort((a, b) => (a.priority || 3) - (b.priority || 3));
    negativeMetrics.sort((a, b) => (a.priority || 3) - (b.priority || 3));
    
    let finalMetrics = [];
    
    if (overallScore >= 65) {
        // High scoring: Show best positives, but include critical negatives if any
        finalMetrics = positiveMetrics.slice(0, 3);
        // Add a critical negative (priority 1) if exists and we have room
        if (negativeMetrics.length > 0 && negativeMetrics[0].priority === 1 && finalMetrics.length < 4) {
            finalMetrics.push(negativeMetrics[0]);
        }
    } else if (overallScore >= 55) {
        // Mixed: Balance of best from both
        finalMetrics = [
            ...positiveMetrics.slice(0, 2),
            ...negativeMetrics.slice(0, 2)
        ].slice(0, 4);
    } else {
        // Low scoring: Show negatives but include exceptional positives
        finalMetrics = negativeMetrics.slice(0, 3);
        // Add an exceptional positive (priority 1) if exists
        if (positiveMetrics.length > 0 && positiveMetrics[0].priority === 1 && finalMetrics.length < 4) {
            finalMetrics.push(positiveMetrics[0]);
        }
    }
    
    // If we don't have enough metrics, fill with what we have
    if (finalMetrics.length < 3) {
        const allMetrics = [...positiveMetrics, ...negativeMetrics];
        allMetrics.sort((a, b) => (a.priority || 3) - (b.priority || 3));
        finalMetrics = allMetrics.slice(0, 4);
    }
    
    return finalMetrics;
}

// Draw score breakdown chart
function drawScoreBreakdownChart(qualityScore, idqScore, antiFragileScore, companyTier) {
    const canvas = document.getElementById('score-breakdown-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = 70;
    const centerY = 70;
    const radius = 50;
    
    // Normalize scores
    const qualityNorm = (qualityScore / 109) * 100;
    const idqNorm = ((idqScore + 3) / 15) * 100;
    const antiFragileNorm = ((antiFragileScore + 7) / 24) * 100;
    
    // Calculate weighted contributions
    const qualityContrib = qualityNorm * 0.4;
    const idqContrib = idqNorm * 0.35;
    const afContrib = antiFragileNorm * 0.25;
    
    // Data for the chart with raw scores
    const data = [
        { 
            label: 'Quality', 
            value: qualityContrib, 
            color: '#a855f7',
            rawScore: qualityScore,
            maxScore: 109,
            weight: 40,
            percentage: qualityNorm
        },
        { 
            label: 'IDQ', 
            value: idqContrib, 
            color: '#3b82f6',
            rawScore: idqScore,
            maxScore: 12,
            minScore: -3,
            weight: 35,
            percentage: idqNorm
        },
        { 
            label: 'Anti-Fragile', 
            value: afContrib, 
            color: '#22c55e',
            rawScore: antiFragileScore,
            maxScore: 17,
            minScore: -7,
            weight: 25,
            percentage: antiFragileNorm
        }
    ];
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Store segment paths for hit detection
    const segments = [];
    let currentAngle = -Math.PI / 2;
    
    data.forEach((segment, index) => {
        const angle = (segment.value / 100) * Math.PI * 2;
        
        // Store segment info for hover detection
        segments.push({
            startAngle: currentAngle,
            endAngle: currentAngle + angle,
            ...segment
        });
        
        // Create gradient for segment
        const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.6, centerX, centerY, radius);
        gradient.addColorStop(0, segment.color + 'dd'); // Slightly transparent at center
        gradient.addColorStop(0.7, segment.color);
        gradient.addColorStop(1, segment.color + 'ee'); // Slightly lighter at edge
        
        // Draw segment with gradient
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
        ctx.arc(centerX, centerY, radius * 0.6, currentAngle + angle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add subtle separator line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        currentAngle += angle;
    });
    
    // Draw center text with proper color - MUCH darker for light theme
    // Check multiple ways to detect theme
    const htmlElement = document.documentElement;
    const isLightTheme = htmlElement.getAttribute('data-theme') === 'light' || 
                         htmlElement.classList.contains('light') ||
                         localStorage.getItem('theme') === 'light';
    
    // Force black text for light theme, white for dark
    ctx.fillStyle = isLightTheme ? '#000000' : '#e5e7eb';
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Debug: log what we're using
    console.log('Theme detection - isLightTheme:', isLightTheme, 'fillStyle:', ctx.fillStyle);
    
    ctx.fillText(companyTier.score.toFixed(1), centerX, centerY);
    
    // Create or get tooltip element
    let tooltip = document.getElementById('chart-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'chart-tooltip';
        tooltip.className = 'chart-tooltip';
        document.body.appendChild(tooltip);
    }
    
    // Add mouse event listeners
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Calculate distance and angle from center
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if within donut bounds
        if (distance >= radius * 0.6 && distance <= radius) {
            // Calculate angle (adjust for canvas coordinate system)
            let angle = Math.atan2(dy, dx);
            // Normalize to start from top (-PI/2)
            angle = angle + Math.PI / 2;
            if (angle < 0) angle += Math.PI * 2;
            
            // Find which segment we're hovering over
            const hoveredSegment = segments.find(seg => {
                let startAngle = seg.startAngle + Math.PI / 2;
                let endAngle = seg.endAngle + Math.PI / 2;
                
                // Normalize angles
                if (startAngle < 0) startAngle += Math.PI * 2;
                if (endAngle < 0) endAngle += Math.PI * 2;
                
                // Handle wrap-around
                if (startAngle > endAngle) {
                    return angle >= startAngle || angle <= endAngle;
                }
                return angle >= startAngle && angle <= endAngle;
            });
            
            if (hoveredSegment) {
                // Format score display
                let scoreDisplay = hoveredSegment.rawScore;
                if (hoveredSegment.minScore !== undefined && hoveredSegment.minScore < 0) {
                    scoreDisplay = `${hoveredSegment.rawScore}/${hoveredSegment.maxScore}`;
                } else {
                    scoreDisplay = `${hoveredSegment.rawScore}/${hoveredSegment.maxScore}`;
                }
                
                // Build tooltip content
                tooltip.innerHTML = `
                    <div style="color: ${hoveredSegment.color}; font-weight: bold; margin-bottom: 4px;">
                        ${hoveredSegment.label} Score
                    </div>
                    <div style="color: var(--color-text-primary);">
                        Score: ${scoreDisplay}
                    </div>
                    <div style="color: var(--color-text-secondary); font-size: 0.9em;">
                        ${hoveredSegment.percentage.toFixed(1)}% of maximum
                    </div>
                    <div style="color: var(--color-text-secondary); font-size: 0.9em;">
                        Contributes ${hoveredSegment.value.toFixed(1)}% to overall
                    </div>
                    <div style="color: var(--color-text-muted); font-size: 0.85em; margin-top: 4px;">
                        Weight: ${hoveredSegment.weight}%
                    </div>
                `;
                
                // Position tooltip
                tooltip.style.display = 'block';
                tooltip.style.left = `${e.clientX + 10}px`;
                tooltip.style.top = `${e.clientY - 10}px`;
                
                // Adjust if tooltip goes off screen
                const tooltipRect = tooltip.getBoundingClientRect();
                if (tooltipRect.right > window.innerWidth) {
                    tooltip.style.left = `${e.clientX - tooltipRect.width - 10}px`;
                }
                if (tooltipRect.bottom > window.innerHeight) {
                    tooltip.style.top = `${e.clientY - tooltipRect.height - 10}px`;
                }
            } else {
                tooltip.style.display = 'none';
            }
        } else {
            tooltip.style.display = 'none';
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    });
}

// Helper function to get gradient fill based on percentage
function getGradientFill(percentage) {
    // 6-tier color system matching original
    if (percentage >= 80) return 'linear-gradient(90deg, #a855f7, #9333ea)'; // Purple (Excellent)
    if (percentage >= 74) return 'linear-gradient(90deg, #3b82f6, #2563eb)'; // Blue (Very Good)
    if (percentage >= 65) return 'linear-gradient(90deg, #22c55e, #16a34a)'; // Green (Good)
    if (percentage >= 55) return 'linear-gradient(90deg, #eab308, #f59e0b)'; // Yellow (Average)
    if (percentage >= 32) return 'linear-gradient(90deg, #f97316, #ea580c)'; // Orange (Below Average)
    return 'linear-gradient(90deg, #ef4444, #dc2626)'; // Red (Poor)
}

// Unified function to render metric bars with consistent styling
function renderMetricBar(label, value, max, options = {}) {
    const { 
        isNegative = false, 
        showReasoning = false, 
        reasoning = '',
        customClass = '',
        min = 0  // Add min parameter for handling negative ranges
    } = options;
    
    // Calculate percentage for metrics with negative ranges
    let percentage;
    if (min < 0) {
        // For metrics with negative range, calculate percentage from the full range
        const range = max - min;
        const adjustedValue = value - min;
        percentage = (adjustedValue / range) * 100;
    } else {
        // Original calculation for positive-only ranges
        percentage = isNegative ? 
            Math.abs(value / max * 100) : 
            (value / max * 100);
    }
    
    // Get color data based on percentage
    const scoreData = getScoreColor(percentage);
    const gradient = getGradientFill(percentage);
    const shimmerClass = percentage >= 80 ? 'shimmer-effect' : '';
    
    // Determine bar color (red for negative values, gradient for positive)
    const barColor = (isNegative && value < 0) ? 
        'linear-gradient(90deg, #ef4444, #dc2626)' : gradient;
    
    // Format value display - show actual range for negative min
    const valueDisplay = min < 0 ? 
        value.toString() : 
        (isNegative && value < 0 ? value.toString() : `${value}/${max}`);
    
    return `
        <div class="subscore-item metric-item ${customClass} ${showReasoning ? 'has-reasoning' : ''}" 
             ${showReasoning ? `data-tooltip="${reasoning}"` : ''}>
            <div class="flex justify-between items-center mb-1">
                <span class="text-xs muted-heading">
                    ${label}
                    ${showReasoning ? '<span class="reasoning-icon">ⓘ</span>' : ''}
                </span>
                <span class="text-xs font-semibold">
                    <span style="color: ${percentage >= 90 ? '#a855f7' : (percentage <= 20 && value !== 0) || value < 0 ? '#ef4444' : 'white'}; font-weight: bold;">${value}</span>
                    ${min < 0 ? 
                        `<span class="text-xs subtle-text"> (${min} to ${max})</span>` : 
                        `<span class="subtle-text">/${max}</span>`
                    }
                </span>
            </div>
            <div class="metric-bar">
                <div class="metric-fill ${shimmerClass}" 
                     style="width: ${percentage}%; 
                            background: ${barColor};
                            box-shadow: ${percentage >= 80 ? `0 0 8px ${scoreData.glow}` : 'none'};">
                </div>
            </div>
        </div>
    `;
}

// Helper function to get score color
function getScoreTextColor(percentage) {
    // 6-tier color system matching original
    if (percentage >= 80) return '#a855f7'; // Purple (Excellent)
    if (percentage >= 74) return '#3b82f6'; // Blue (Very Good)
    if (percentage >= 65) return '#22c55e'; // Green (Good)
    if (percentage >= 55) return '#eab308'; // Yellow (Average)
    if (percentage >= 32) return '#f97316'; // Orange (Below Average)
    return '#ef4444'; // Red (Poor)
}

// Helper function to render a metric with bar
function renderMetric(name, score, max, reasoning, isPenalty = false, colorOverride = null) {
    let metricHtml = '';
    const hasReasoning = reasoning ? 'has-reasoning' : '';
    // Properly escape HTML entities in tooltips
    const tooltip = reasoning ? reasoning.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    const reasoningIcon = reasoning ? '<span class="reasoning-icon">💡</span>' : '';
    
    if (isPenalty) {
        // For penalty metrics, show a red bar from right if negative
        if (score < 0) {
            const penaltyPercentage = Math.min(Math.abs(score) * 10, 100); // Scale for visibility
            metricHtml = `
                <div class="metric-item ${hasReasoning}" data-tooltip="${tooltip}">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-sm muted-heading">${name}${reasoningIcon}</span>
                        <span class="text-sm font-mono">
                            <span class="font-bold" style="color: ${score < 0 ? '#ef4444' : 'white'};">${formatNumber(score, 0)}</span>
                            <span class="subtle-text"> / 0</span>
                        </span>
                    </div>
                    <div class="metric-bar">
                        <div class="metric-fill-negative" style="width: ${penaltyPercentage}%; background: linear-gradient(90deg, #dc2626, #ef4444);"></div>
                    </div>
                </div>`;
        } else {
            metricHtml = `
                <div class="metric-item ${hasReasoning}" data-tooltip="${tooltip}">
                    <div class="flex justify-between items-center">
                        <span class="text-sm muted-heading">${name}${reasoningIcon}</span>
                        <span class="text-sm font-mono">
                            <span class="font-bold" style="color: ${score < 0 ? '#ef4444' : 'white'};">${formatNumber(score, 0)}</span>
                            <span class="subtle-text"> / 0</span>
                        </span>
                    </div>
                </div>`;
        }
    } else {
        const percentage = max > 0 ? (score / max) * 100 : 0;
        const colorPercentage = colorOverride !== null ? colorOverride : percentage;
        const gradient = getGradientFill(colorPercentage);
        const shimmerClass = percentage >= 80 ? 'shimmer-effect' : '';
        
        metricHtml = `
            <div class="metric-item ${hasReasoning}" data-tooltip="${tooltip}">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-sm muted-heading">${name}${reasoningIcon}</span>
                    <span class="text-sm font-mono">
                        <span class="font-bold" style="color: ${percentage >= 90 ? '#a855f7' : (percentage <= 20 && score !== 0) ? '#ef4444' : 'white'};">${formatNumber(score)}</span>
                        <span class="subtle-text">/${max}</span>
                    </span>
                </div>
                <div class="metric-bar">
                    <div class="metric-fill ${shimmerClass}" style="width: ${percentage}%; background: ${gradient};"></div>
                </div>
            </div>`;
    }
    return metricHtml;
}

// Main function to generate expanded content
function generateExpandedContent(scoreType) {
    if (!state.currentStockData) return '<p>No data available</p>';
    
    // Call the specific populate function based on scoreType
    switch(scoreType) {
        case 'quality':
            return populateQualityExpanded();
        case 'idq':
            return populateIDQExpanded();
        case 'antifragile':
            return populateAntiFragileExpanded();
        default:
            return '<p>Unknown score type</p>';
    }
}

// Score ranges for max values
const scoreRanges = {
    financials: { 
        financialResilience: [0, 5], 
        grossMargin: [0, 3], 
        returnsOnCapital: [0, 3], 
        freeCashFlow: [0, 3], 
        earningsPerShare: [0, 3] 
    },
    moat: { 
        networkEffectProductEcosystem: [0, 15], 
        switchingCosts: [0, 15], 
        durableCostAdvantage: [0, 15], 
        intangibles: [0, 15], 
        counterPosition: [0, 10], 
        moatDirection: [0, 5] 
    },
    potential: { 
        optionality: [0, 7], 
        organicGrowthRunway: [0, 4], 
        operatingLeverageAhead: [0, 4], 
        recurringRevenue: [0, 5], 
        pricingPower: [0, 5], 
        dependence: [0, 5], 
        acquisition: [0, 5], 
        innovationDisruptionQuotient: [-3, 12] 
    },
    culture: { 
        soulInTheGame: [0, 4], 
        insideOwnership: [0, 3], 
        glassdoorRatings: [0, 4], 
        missionStatement: [0, 3], 
        fiveYearPerformanceVsSP500: [0, 4], 
        consistentlyBeatsExpectations: [0, 4], 
        shareholderFriendlyActions: [0, 3] 
    },
    gauntlet: {
        customerConcentration: [0, -10],
        regulatoryRisk: [0, -5],
        obsoletionRisk: [0, -5]
    }
};

// Populate Quality expanded content with full breakdown
function populateQualityExpanded() {
    const llmResearch = state.currentStockData.LLM_Research_and_Comments;
    const groupScores = llmResearch.Total_scores_group.Group_Scores;
    const qualityScore = parseFloat(state.currentStockData.Portfolio.qualityScore);
    const qualityPercentage = (qualityScore / 109) * 100;
    const qualityColors = getScoreColor(qualityPercentage);

    let html = '<h3 class="text-xl font-bold mb-6">Enterprise Quality Breakdown</h3>';

    html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">';

    // Fixed max scores per requirements
    const groupDataMap = {
        'Financials': { name: 'Financials', score: groupScores.Financials_Group_Score, max: 17 },
        'Moat': { name: 'Moat', score: groupScores.Moat_Group_Score, max: 20 },
        'Potential': { name: 'Potential', score: groupScores.Potential_Group_Score, max: 45 },
        'Culture': { name: 'Culture', score: groupScores.Culture_and_Pastperformance_Group_Score, max: 25 }
    };

    for (const key in groupDataMap) {
        const group = groupDataMap[key];
        const groupNameLower = group.name.toLowerCase();

        html += `
            <div class="summary-metric-card glass-morphism rounded-lg p-4 border flex flex-col text-center transition-all duration-300">
                <h4 class="font-medium text-secondary">${group.name}</h4>
                <div class="text-4xl font-bold dynamic-value my-2">${formatNumber(group.score)}<span class="text-lg subtle-text"> / ${group.max}</span></div>
                <div class="mt-auto">
                    <button 
                        class="summary-button mt-2 w-full" 
                        data-group="${groupNameLower}"
                        style="--card-color: ${qualityColors.color}" 
                        onclick="showGroupDetails('${groupNameLower}')">
                        <span class="relative z-10">View Details</span>
                    </button>
                </div>
            </div>
        `;
    }
    html += '</div>';

    const gauntletScore = groupScores.Gauntlet_Group_Score;
    html += `
        <div class="summary-metric-card glass-morphism rounded-lg p-3 border flex items-center justify-between transition-all duration-300 mb-8">
            <h4 class="font-medium text-red-400">Gauntlet Score</h4>
            <div class="flex items-center gap-4">
                <div class="text-2xl font-bold text-red-400">${gauntletScore}</div>
                <button 
                    class="summary-button" 
                    data-group="gauntlet"
                    style="--card-color: var(--color-red); padding: 6px 12px; font-size: 12px;" 
                    onclick="showGroupDetails('gauntlet')">
                    <span class="relative z-10">View Details</span>
                </button>
            </div>
        </div>
    `;

    html += '<div id="shared-summary-panel" class="summary-content my-6" style="grid-column: 1 / -1;"></div>';

    return html;
}

// Populate IDQ expanded content
function populateIDQExpanded() {
    const idqReport = state.currentStockData.LLM_Reports?.IDQ_Report;
    const detailedAnalysisText = state.currentStockData.LLM_Research_and_Comments?.Summaries_Group?.idqSummary || '';
    
    if (!idqReport) {
        return '<p>IDQ data is currently unavailable.</p>';
    }

    const scoringTooltipText = "The final IDQ score is a holistic judgment based on five key facets. Significant weight is given to Disruptive Innovation & Core Technology Moat and Market Opportunity for Disruption, as these are primary engines of transformative potential.";

    let html = `
        <div class="flex items-center gap-2 mb-6">
            <h3 class="text-xl font-bold">Innovation Disruption Quotient (IDQ)</h3>
            <span class="has-reasoning" data-tooltip="${scoringTooltipText}">
                 <span class="reasoning-icon text-lg">💡</span>
            </span>
        </div>
    `;
    
    // Overall Summary Section
    html += `
        <div class="idq-section">
            <h4 class="idq-section-title">Overall Summary</h4>
            <p class="muted-heading leading-relaxed">${idqReport.idqSummary || 'No summary available.'}</p>
        </div>
    `;
    
    // Detailed Facet Analysis Section
    if (detailedAnalysisText.includes('--- DETAILED FACET ANALYSIS ---')) {
        html += `
            <div class="idq-section mt-6">
                <h4 class="idq-section-title mb-4">Facet Breakdown</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        `;
        
        const analysisBlock = detailedAnalysisText.split('--- DETAILED FACET ANALYSIS ---')[1] || '';
        const facetItems = analysisBlock.split('**').filter(s => s.trim() && s.includes('.')).map(s => s.trim());

        for (let i = 0; i < facetItems.length; i += 2) {
            const titleAndScore = facetItems[i];
            const description = facetItems[i+1] || 'No description available.';
            
            const scoreMatch = titleAndScore.match(/\(Facet Score: (\d+\.?\d*)\/(\d+)\)/);
            const title = titleAndScore.replace(/\(Facet Score:.*\):?/, '').trim();
            
            if (scoreMatch) {
                const score = parseFloat(scoreMatch[1]);
                const maxScore = parseInt(scoreMatch[2], 10);
                const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                
                // Color logic based on score
                const barColor = score === 5 ? 'var(--color-purple)' : 
                               score >= 4 ? 'var(--color-blue)' : 
                               score >= 3 ? 'var(--color-green)' : 
                               score >= 2 ? 'var(--color-yellow)' : 'var(--color-red)';
                const shimmerClass = score === 5 ? 'shimmer-effect' : '';

                html += `
                    <div class="idq-facet-item">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm font-medium secondary-text">${title}</span>
                            <span class="text-sm font-mono"><span class="font-bold text-white">${score}</span>/${maxScore}</span>
                        </div>
                        <div class="metric-bar mb-3">
                            <div class="metric-fill ${shimmerClass}" style="width: ${percentage}%; background: ${barColor};"></div>
                        </div>
                        <p class="text-xs muted-heading leading-relaxed">${description}</p>
                    </div>
                `;
            }
        }
        
        html += '</div></div>';
    }
    
    // Catalyst Watch Section
    if (idqReport.catalystWatch) {
        html += `
            <div class="idq-section">
                <h4 class="idq-section-title">Catalyst Watch</h4>
                <div class="text-xs subtle-text mb-3">Last Updated: ${idqReport.lastUpdated || 'N/A'}</div>
                <div class="border-l-2 border-gray-600 pl-4 space-y-2">
                    ${idqReport.catalystWatch.split('•').filter(line => line.trim()).map(line => `<p class="muted-heading leading-relaxed">${line.trim()}</p>`).join('')}
                </div>
            </div>
        `;
    }
    
    return html;
}

// Populate Anti-Fragile expanded content with enhanced visuals
function populateAntiFragileExpanded() {
    const antiFragile = state.currentStockData.Anti_Fragile_Score;
    const llmResearch = state.currentStockData.LLM_Research_and_Comments;

    const tooltipText = "Anti-Fragile scores are derived from Quality Score metrics using specific formulas. Click on metrics below to see their reasoning.";

    let html = `
        <div class="flex items-center gap-2 mb-8">
            <h3 class="text-xl font-bold">Anti-Fragile Score Breakdown</h3>
            <span class="has-reasoning" data-tooltip="${tooltipText}">
                 <span class="reasoning-icon text-lg">💡</span>
            </span>
        </div>
    `;

    // --- Card Grid Layout ---
    html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">';

    const groupData = [
        { name: 'Strategic Core', score: antiFragile.groupScores.barbellMethodScore, max: 13 },
        { name: 'Financial Fortitude', score: antiFragile.groupScores.financialFortitudeScore, max: 1 },
        { name: 'Skin in the Game', score: antiFragile.groupScores.skinInTheGameScore, max: 3 }
    ];

    groupData.forEach(group => {
        html += `
            <div class="summary-metric-card glass-morphism rounded-lg p-4 border flex flex-col text-center">
                <h4 class="font-medium muted-heading">${group.name}</h4>
                <div class="text-4xl font-bold dynamic-value my-2">${formatNumber(group.score)}<span class="text-lg subtle-text"> / ${group.max}</span></div>
            </div>
        `;
    });
    html += '</div>';

    // --- Detailed Breakdown ---
    html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">';

    // Strategic Core Metrics
    const sc = antiFragile.metricScores.barbellMethod;
    html += '<div><h4 class="font-semibold secondary-text mb-3">Strategic Core</h4><div class="space-y-4">';

    // Special logic for Mission Statement color
    let missionColorPercentage = null;
    if (sc.missionStatement === 1) {
        missionColorPercentage = 55; // Force Yellow tier color
    } else if (sc.missionStatement === 2) {
        missionColorPercentage = 80; // Force Purple tier color
    }
    html += renderMetric('Mission Statement', sc.missionStatement, 2, llmResearch.Culture_and_Pastperformance_Group?.missionStatementReasoning, false, missionColorPercentage);

    const moatSummary = llmResearch.Summaries_Group?.moatSummary || 'Derived from multiple Moat Group metrics. See Moat section for detailed reasoning.';
    html += renderMetric('Moat', sc.moat, 8, moatSummary);
    html += renderMetric('Optionality', sc.optionality, 3, llmResearch.Potential_Group?.optionalityReasoning);
    html += '</div></div>';

    // Financial Fortitude Metrics
    const ff = antiFragile.metricScores.financialFortitude;
    html += '<div><h4 class="font-semibold secondary-text mb-3">Financial Fortitude</h4><div class="space-y-4">';
    html += renderMetric('Cash, Debt, FCF', ff.cashDebtFreeCashFlow, 1, llmResearch.Financials_Group?.financialResilienceReasoning);
    html += renderMetric('Concentration Penalty', ff.concentration, 0, llmResearch.Gauntlet_Group?.customerConcentrationReasoning, true);
    html += '</div></div>';

    // Skin in the Game Metrics
    const sitg = antiFragile.metricScores.skinInTheGame;
    html += '<div class="md:col-span-2"><h4 class="font-semibold secondary-text mb-3 mt-4">Skin in the Game</h4><div class="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">';
    html += renderMetric('Glassdoor', sitg.glassdoor, 1, llmResearch.Culture_and_Pastperformance_Group?.glassdoorRatingsReasoning, sitg.glassdoor < 0);
    html += renderMetric('Founder-Led', sitg.founder, 1, llmResearch.Culture_and_Pastperformance_Group?.soulInTheGameReasoning);
    html += renderMetric('Ownership', sitg.ownership, 1, llmResearch.Culture_and_Pastperformance_Group?.insideOwnershipReasoning, sitg.ownership < 0);
    html += '</div></div>';

    html += '</div>'; // Close grid

    return html;
}

function formatMetricName(name) {
    return name.replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Metric display names mapping
const metricDisplayNames = {
    // Financials
    financialResilience: 'Financial Resilience',
    grossMargin: 'Gross Margin',
    returnsOnCapital: 'Returns on Capital',
    freeCashFlow: 'Free Cash Flow',
    earningsPerShare: 'Earnings Per Share',
    
    // Moat
    networkEffectProductEcosystem: 'Network Effects & Ecosystem',
    switchingCosts: 'Switching Costs',
    durableCostAdvantage: 'Durable Cost Advantage',
    intangibles: 'Intangibles',
    counterPosition: 'Counter Position',
    moatDirection: 'Moat Direction',
    
    // Potential
    optionality: 'Optionality',
    organicGrowthRunway: 'Organic Growth Runway',
    operatingLeverageAhead: 'Operating Leverage Ahead',
    recurringRevenue: 'Recurring Revenue',
    pricingPower: 'Pricing Power',
    dependence: 'Dependence',
    acquisition: 'Acquisition Potential',
    innovationDisruptionQuotient: 'Innovation Disruption (IDQ)',
    
    // Culture
    soulInTheGame: 'Soul in the Game',
    insideOwnership: 'Inside Ownership',
    glassdoorRatings: 'Glassdoor Ratings',
    missionStatement: 'Mission Statement',
    fiveYearPerformanceVsSP500: '5-Year vs S&P 500',
    consistentlyBeatsExpectations: 'Beats Expectations',
    shareholderFriendlyActions: 'Shareholder Friendly',
    
    // Gauntlet
    customerConcentration: 'Customer Concentration',
    regulatoryRisk: 'Regulatory Risk',
    obsoletionRisk: 'Obsoletion Risk'
};

// Track expanded state for group details
const expandedGroups = new Set();

// Function to toggle group details (called from quality expansion)
function showGroupDetails(groupName) {
    console.log('Toggle group details for:', groupName);
    const panel = document.getElementById('shared-summary-panel');
    if (!panel) return;
    
    // Get the button that was clicked
    const button = document.querySelector(`button[data-group="${groupName.toLowerCase()}"]`);
    
    // Check if this group is already expanded
    if (expandedGroups.has(groupName.toLowerCase())) {
        // Collapse it
        expandedGroups.delete(groupName.toLowerCase());
        panel.innerHTML = '';
        panel.style.display = 'none';
        
        // Update button text
        if (button) {
            const textSpan = button.querySelector('span');
            if (textSpan) textSpan.textContent = 'View Details';
        }
        return;
    }
    
    // Clear other expanded groups
    expandedGroups.clear();
    expandedGroups.add(groupName.toLowerCase());
    
    // Update all buttons to show "View Details"
    document.querySelectorAll('.summary-button span').forEach(span => {
        span.textContent = 'View Details';
    });
    
    // Update clicked button to show "Hide Details"
    if (button) {
        const textSpan = button.querySelector('span');
        if (textSpan) textSpan.textContent = 'Hide Details';
    }
    
    const llmResearch = state.currentStockData.LLM_Research_and_Comments;
    let content = '';
    
    // Get the appropriate group data and summary
    let groupData = {};
    let summary = '';
    let rangeKey = '';
    
    switch(groupName.toLowerCase()) {
        case 'financials':
            groupData = llmResearch.Financials_Group || {};
            summary = llmResearch.Summaries_Group?.financialsSummary || 'A comprehensive assessment of financial health, focusing on resilience, profitability margins, capital efficiency, cash generation, and earnings quality.';
            rangeKey = 'financials';
            break;
        case 'moat':
            groupData = llmResearch.Moat_Group || {};
            summary = llmResearch.Summaries_Group?.moatSummary || 'Analysis of sustainable competitive advantages that protect the business from competition and enable long-term value creation.';
            rangeKey = 'moat';
            break;
        case 'potential':
            groupData = llmResearch.Potential_Group || {};
            summary = llmResearch.Summaries_Group?.potentialSummary || 'Forward-looking assessment of growth opportunities, operational leverage, and innovation capabilities that could drive future performance.';
            rangeKey = 'potential';
            break;
        case 'culture':
            groupData = llmResearch.Culture_and_Pastperformance_Group || {};
            summary = llmResearch.Summaries_Group?.cultureAndPerformanceSummary || 'Evaluation of organizational culture, management alignment, employee satisfaction, and historical execution track record.';
            rangeKey = 'culture';
            break;
        case 'gauntlet':
            groupData = llmResearch.Gauntlet_Group || {};
            summary = llmResearch.Summaries_Group?.gauntletSummary || 'Critical risk factors that could impair business performance or threaten long-term viability.';
            rangeKey = 'gauntlet';
            break;
    }
    
    // Build the content
    content = `
        <div class="p-6 glass-morphism rounded-lg border">
            <h4 class="text-lg font-semibold mb-3 capitalize">${groupName} Details</h4>
            <p class="text-sm muted-heading mb-6 leading-relaxed">${summary}</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
    `;
    
    // Add metrics with special handling for Gauntlet
    const ranges = scoreRanges[rangeKey] || {};
    
    Object.entries(groupData).forEach(([metric, value]) => {
        if (!metric.endsWith('Reasoning') && typeof value !== 'object') {
            const reasoning = groupData[`${metric}Reasoning`];
            const displayName = metricDisplayNames[metric] || formatMetricName(metric);
            
            // Special handling for Gauntlet metrics (no progress bars, color-coded)
            if (rangeKey === 'gauntlet') {
                const scoreColorClass = value === 0 ? 'text-white' : 'text-red-400';
                const hasReasoning = reasoning && value !== 0;
                const tooltipText = hasReasoning ? reasoning.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
                const reasoningIcon = hasReasoning ? '<span class="reasoning-icon">💡</span>' : '';
                
                content += `
                    <div class="metric-item ${hasReasoning ? 'has-reasoning' : ''}" ${hasReasoning ? `data-tooltip="${tooltipText}"` : ''}>
                        <div class="flex justify-between items-center">
                            <span class="text-sm muted-heading">${displayName}${reasoningIcon}</span>
                            <span class="text-sm font-bold ${scoreColorClass}">${value}</span>
                        </div>
                    </div>
                `;
            } else {
                // Regular metrics with progress bars
                const range = ranges[metric];
                if (range) {
                    const max = range[1];
                    content += renderMetric(displayName, value, max, reasoning, false);
                } else {
                    // Fallback for metrics without defined ranges
                    const tooltipText = reasoning ? reasoning.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
                    content += `
                        <div class="metric-item ${reasoning ? 'has-reasoning' : ''}" ${reasoning ? `data-tooltip="${tooltipText}"` : ''}>
                            <div class="flex justify-between items-center">
                                <span class="text-sm muted-heading">${displayName}${reasoning ? '<span class="reasoning-icon">💡</span>' : ''}</span>
                                <span class="text-sm font-mono font-bold text-white">${formatNumber(value)}</span>
                            </div>
                        </div>
                    `;
                }
            }
        }
    });
    
    content += `
            </div>
        </div>
    `;
    
    // Show the panel with animation
    panel.innerHTML = content;
    panel.style.display = 'block';
    setTimeout(() => {
        panel.classList.add('show');
    }, 10);
}

// ============================================
// SCORE RANKINGS CALCULATION
// ============================================

async function calculateScoreRankings() {
    try {
        // Get current company scores from state.currentStockData
        if (!state.currentStockData) {
            console.log('No stock data available yet');
            return;
        }
        
        const currentStockData = state.currentStockData;
        const qualityScore = parseFloat(currentStockData.Portfolio?.qualityScore || 0);
        const idqScore = parseFloat(currentStockData.LLM_Reports?.IDQ_Report?.idqScore || 0);
        const antiFragileScore = parseFloat(currentStockData.Anti_Fragile_Score?.totalScore || 0);
        
        console.log('Current scores from state:', { qualityScore, idqScore, antiFragileScore });
        
        // Fetch all stocks to calculate rankings
        const db = firebase.firestore();
        const querySnapshot = await db.collection("stocks").get();
        
        const allScores = {
            quality: [],
            idq: [],
            antiFragile: []
        };
        
        // Collect all scores with their values
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.Portfolio?.qualityScore) {
                allScores.quality.push(parseFloat(data.Portfolio.qualityScore));
            }
            if (data.LLM_Reports?.IDQ_Report?.idqScore) {
                allScores.idq.push(parseFloat(data.LLM_Reports.IDQ_Report.idqScore));
            }
            if (data.Anti_Fragile_Score?.totalScore) {
                allScores.antiFragile.push(parseFloat(data.Anti_Fragile_Score.totalScore));
            }
        });
        
        // Sort arrays in descending order (highest first)
        allScores.quality.sort((a, b) => b - a);
        allScores.idq.sort((a, b) => b - a);
        allScores.antiFragile.sort((a, b) => b - a);
        
        // Calculate current stock's position (1-based)
        const qualityRank = allScores.quality.findIndex(s => s <= qualityScore) + 1;
        const idqRank = allScores.idq.findIndex(s => s <= idqScore) + 1;
        const antiFragileRank = allScores.antiFragile.findIndex(s => s <= antiFragileScore) + 1;
        
        // Update UI with rankings and tooltips
        const qualityRankEl = document.getElementById('quality-rank');
        const idqRankEl = document.getElementById('idq-rank-placeholder');
        const antiFragileRankEl = document.getElementById('antifragile-rank-placeholder');
        
        console.log('Rank elements found:', {
            qualityRankEl: !!qualityRankEl,
            idqRankEl: !!idqRankEl,
            antiFragileRankEl: !!antiFragileRankEl
        });
        
        console.log('Rankings:', { qualityRank, idqRank, antiFragileRank });
        
        if (qualityRankEl && qualityRank > 0) {
            // For non-medal ranks, make the rank number bold white
            if (qualityRank > 30) {
                qualityRankEl.innerHTML = `<span style="font-weight: bold; color: white;">#${qualityRank}</span> of ${allScores.quality.length}`;
            } else {
                qualityRankEl.textContent = `#${qualityRank} of ${allScores.quality.length}`;
            }
            qualityRankEl.setAttribute('data-tooltip', `This company ranks ${qualityRank} out of ${allScores.quality.length} companies in Enterprise Quality`);
            qualityRankEl.classList.add('rank-badge');
            
            // Add special class for top rankings
            if (qualityRank <= 10) qualityRankEl.classList.add('rank-gold');
            else if (qualityRank <= 20) qualityRankEl.classList.add('rank-silver');
            else if (qualityRank <= 30) qualityRankEl.classList.add('rank-bronze');
            
            // Add percentile for context
            const percentile = Math.round(((allScores.quality.length - qualityRank + 1) / allScores.quality.length) * 100);
            qualityRankEl.setAttribute('data-percentile', `Top ${percentile}%`);
        }
        
        if (idqRankEl && idqRank > 0) {
            // For non-medal ranks, make the rank number bold white
            if (idqRank > 30) {
                idqRankEl.innerHTML = `<span style="font-weight: bold; color: white;">#${idqRank}</span> of ${allScores.idq.length}`;
            } else {
                idqRankEl.textContent = `#${idqRank} of ${allScores.idq.length}`;
            }
            idqRankEl.setAttribute('data-tooltip', `This company ranks ${idqRank} out of ${allScores.idq.length} companies in IDQ Ranking`);
            idqRankEl.classList.add('rank-badge');
            
            // Add special class for top rankings
            if (idqRank <= 10) idqRankEl.classList.add('rank-gold');
            else if (idqRank <= 20) idqRankEl.classList.add('rank-silver');
            else if (idqRank <= 30) idqRankEl.classList.add('rank-bronze');
            
            const percentile = Math.round(((allScores.idq.length - idqRank + 1) / allScores.idq.length) * 100);
            idqRankEl.setAttribute('data-percentile', `Top ${percentile}%`);
        }
        
        if (antiFragileRankEl && antiFragileRank > 0) {
            // For non-medal ranks, make the rank number bold white
            if (antiFragileRank > 30) {
                antiFragileRankEl.innerHTML = `<span style="font-weight: bold; color: white;">#${antiFragileRank}</span> of ${allScores.antiFragile.length}`;
            } else {
                antiFragileRankEl.textContent = `#${antiFragileRank} of ${allScores.antiFragile.length}`;
            }
            antiFragileRankEl.setAttribute('data-tooltip', `This company ranks ${antiFragileRank} out of ${allScores.antiFragile.length} companies in Anti-Fragile Score`);
            antiFragileRankEl.classList.add('rank-badge');
            
            // Add special class for top rankings
            if (antiFragileRank <= 10) antiFragileRankEl.classList.add('rank-gold');
            else if (antiFragileRank <= 20) antiFragileRankEl.classList.add('rank-silver');
            else if (antiFragileRank <= 30) antiFragileRankEl.classList.add('rank-bronze');
            
            const percentile = Math.round(((allScores.antiFragile.length - antiFragileRank + 1) / allScores.antiFragile.length) * 100);
            antiFragileRankEl.setAttribute('data-percentile', `Top ${percentile}%`);
        }
        
        console.log(`Rankings calculated - Quality: #${qualityRank}, IDQ: #${idqRank}, Anti-Fragile: #${antiFragileRank}`);
        
    } catch (error) {
        console.error('Error calculating score rankings:', error);
        
        // Use estimated rankings based on score percentiles as fallback
        if (!state.currentStockData) return;
        
        const qualityScore = parseFloat(state.currentStockData.Portfolio?.qualityScore || 0);
        const idqScore = parseFloat(state.currentStockData.LLM_Reports?.IDQ_Report?.idqScore || 0);
        const antiFragileScore = parseFloat(state.currentStockData.Anti_Fragile_Score?.totalScore || 0);
        
        // Estimate rankings based on typical distributions
        const totalCompanies = 118; // Known total from your data
        
        // Quality Score: 0-109, estimate rank based on percentile
        const qualityPercentile = qualityScore / 109;
        const qualityRank = Math.max(1, Math.round((1 - qualityPercentile) * totalCompanies));
        
        // IDQ Score: -3 to 12, estimate rank
        const idqPercentile = (idqScore + 3) / 15;
        const idqRank = Math.max(1, Math.round((1 - idqPercentile) * totalCompanies));
        
        // Anti-Fragile Score: -7 to 17, estimate rank
        const afPercentile = (antiFragileScore + 7) / 24;
        const antiFragileRank = Math.max(1, Math.round((1 - afPercentile) * totalCompanies));
        
        // Update UI with estimated rankings
        const qualityRankEl = document.getElementById('quality-rank');
        const idqRankEl = document.getElementById('idq-rank-placeholder');
        const antiFragileRankEl = document.getElementById('antifragile-rank-placeholder');
        
        if (qualityRankEl) {
            qualityRankEl.textContent = `~#${qualityRank} of ${totalCompanies}`;
            qualityRankEl.setAttribute('data-tooltip', `Estimated rank ${qualityRank} out of ${totalCompanies} companies in Enterprise Quality`);
            if (qualityRank <= 10) qualityRankEl.classList.add('rank-gold');
            else if (qualityRank <= 20) qualityRankEl.classList.add('rank-silver');
            else if (qualityRank <= 30) qualityRankEl.classList.add('rank-bronze');
        }
        
        if (idqRankEl) {
            idqRankEl.textContent = `~#${idqRank} of ${totalCompanies}`;
            idqRankEl.setAttribute('data-tooltip', `Estimated rank ${idqRank} out of ${totalCompanies} companies in IDQ Ranking`);
            if (idqRank <= 10) idqRankEl.classList.add('rank-gold');
            else if (idqRank <= 20) idqRankEl.classList.add('rank-silver');
            else if (idqRank <= 30) idqRankEl.classList.add('rank-bronze');
        }
        
        if (antiFragileRankEl) {
            antiFragileRankEl.textContent = `~#${antiFragileRank} of ${totalCompanies}`;
            antiFragileRankEl.setAttribute('data-tooltip', `Estimated rank ${antiFragileRank} out of ${totalCompanies} companies in Anti-Fragile Score`);
            if (antiFragileRank <= 10) antiFragileRankEl.classList.add('rank-gold');
            else if (antiFragileRank <= 20) antiFragileRankEl.classList.add('rank-silver');
            else if (antiFragileRank <= 30) antiFragileRankEl.classList.add('rank-bronze');
        }
        
        console.log('Using estimated rankings due to Firebase error');
    }
}

// ============================================
// GLOBAL EXPORTS
// ============================================

// Export main module
window.CompanyCard = {
    fetchAndDisplayCompanyData,
    navigateToCompany,
    state
};

// Export revelation functions
window.revealScoreDetails = revealScoreDetails;
window.showGroupDetails = showGroupDetails;

// ============================================
// API PRICE FETCHING
// ============================================

async function fetchLiveStockPrice(ticker, currency, updateCallback) {
    const functionUrl = 'https://getstockprice-py46mxz5aq-uc.a.run.app';
    
    console.log(`Fetching live price for ${ticker} via HTTP Function`);
    try {
        const response = await fetch(`${functionUrl}?ticker=${ticker}`);
        console.log('Price API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Function returned status ${response.status}`);
        }
        const result = await response.json();
        console.log('Price API result:', result);
        
        if (result && result.price) {
            console.log(`Updating price to ${result.price} ${currency}`);
            updateCallback(result.price, currency);
        } else {
            console.warn('HTTP function did not return a price. Using Firestore fallback.');
        }
    } catch (error) {
        console.error('Error calling getStockPrice HTTP function:', error);
    }
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

async function loadSearchableStocks() {
    try {
        const db = firebase.firestore();
        const querySnapshot = await db.collection("stocks").get();
        state.searchableStocks = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.Portfolio?.ticker && data.Portfolio?.companyName) {
                state.searchableStocks.push({
                    ticker: data.Portfolio.ticker,
                    name: data.Portfolio.companyName
                });
            }
        });
        console.log(`Loaded ${state.searchableStocks.length} searchable stocks`);
    } catch (error) {
        console.error("Error loading searchable stocks:", error);
    }
}

function setupSearchBar() {
    const searchInput = document.getElementById('sidebar-search');
    const searchResults = document.getElementById('search-results');
    let searchTimeout;
    
    if (!searchInput || !searchResults) return;
    
    // Handle search input
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            searchResults.classList.add('hidden');
            searchResults.innerHTML = '';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            const matches = state.searchableStocks.filter(stock => 
                stock.ticker.toLowerCase().includes(query) || 
                stock.name.toLowerCase().includes(query)
            ).slice(0, 10); // Limit to 10 results
            
            if (matches.length === 0) {
                searchResults.innerHTML = '<div class="p-3 text-sm muted-heading text-center">No stocks found</div>';
            } else {
                searchResults.innerHTML = matches.map(stock => `
                    <div class="search-result-item cursor-pointer hover:bg-gray-800 p-2 rounded" data-ticker="${stock.ticker}">
                        <div class="font-bold text-sm">${stock.ticker}</div>
                        <div class="text-xs muted-heading">${stock.name}</div>
                    </div>
                `).join('');
                
                // Add click handlers to search results
                searchResults.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const ticker = item.dataset.ticker;
                        searchInput.value = '';
                        searchResults.classList.add('hidden');
                        fetchAndDisplayCompanyData(ticker);
                    });
                });
            }
            
            searchResults.classList.remove('hidden');
        }, 300);
    });
    
    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
}

// Debug: Verify functions are available
console.log('=== REVELATION PANEL LOADED ===');
console.log('window.revealScoreDetails:', typeof window.revealScoreDetails);
console.log('Click any score card to reveal details');
