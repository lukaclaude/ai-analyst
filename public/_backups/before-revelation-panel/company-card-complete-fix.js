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
    metricsChart: null
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

function getScoreColor(percentage) {
    if (percentage >= 80) return { 
        color: '#a855f7', 
        glow: 'rgba(168, 85, 247, 0.3)', 
        class: 'score-purple',
        tier: 'Apex',
        badge: 'EXCEPTIONAL',
        gradient: ['#a855f7', '#9333ea']
    };
    if (percentage >= 74) return { 
        color: '#3b82f6', 
        glow: 'rgba(59, 130, 246, 0.3)', 
        class: 'score-blue',
        tier: 'Powerhouse',
        badge: 'EXCELLENT',
        gradient: ['#3b82f6', '#2563eb']
    };
    if (percentage >= 65) return { 
        color: '#22c55e', 
        glow: 'rgba(34, 197, 94, 0.3)', 
        class: 'score-green',
        tier: 'Compounder',
        badge: 'STRONG',
        gradient: ['#22c55e', '#16a34a']
    };
    if (percentage >= 55) return { 
        color: '#eab308', 
        glow: 'rgba(234, 179, 8, 0.3)', 
        class: 'score-yellow',
        tier: 'Mixed',
        badge: 'MODERATE',
        gradient: ['#eab308', '#ca8a04']
    };
    if (percentage >= 32) return { 
        color: '#f97316', 
        glow: 'rgba(249, 115, 22, 0.3)', 
        class: 'score-orange',
        tier: 'Challenged',
        badge: 'CHALLENGED',
        gradient: ['#f97316', '#ea580c']
    };
    return { 
        color: '#ef4444', 
        glow: 'rgba(239, 68, 68, 0.3)', 
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
    
    // Logo
    if (financials?.General?.companyWebsite) {
        const logoUrl = `https://logo.clearbit.com/${new URL(financials.General.companyWebsite).hostname}`;
        const logoEl = document.getElementById('company-logo');
        if (logoEl) {
            logoEl.src = logoUrl;
            logoEl.onerror = function() {
                this.style.display = 'none';
                const fallback = document.getElementById('logo-fallback');
                if (fallback) {
                    fallback.style.display = 'flex';
                    fallback.textContent = portfolio.ticker[0];
                }
            };
        }
    }
    
    // Company details
    if (financials?.General) {
        const g = financials.General;
        const employeeCount = g.fulltimeEmployees ? Number(g.fulltimeEmployees).toLocaleString() : 'N/A';
        
        const details1 = document.getElementById('details-line-1');
        const details2 = document.getElementById('details-line-2');
        const details3 = document.getElementById('details-line-3');
        
        if (details1) details1.textContent = `${g.stockExchange || 'N/A'} • ${g.country || 'N/A'}`;
        if (details2) details2.innerHTML = `CEO: ${g.cEO || 'N/A'} • Employees: ${employeeCount}`;
        if (details3) details3.textContent = `${g.industry || 'N/A'} • ${g.sector || 'N/A'}`;
    }
    
    // Price and upside
    const currentPrice = parseFloat(portfolio.stockPriceNow) || 0;
    const currency = portfolio.stockpricecurrency || 'USD';
    
    const priceEl = document.getElementById('stock-price');
    const currencyEl = document.getElementById('currency');
    if (priceEl) priceEl.textContent = formatCurrency(currentPrice, 2, currency).replace(/[^0-9.,]/g, '');
    if (currencyEl) currencyEl.textContent = currency;
    
    // Parse fair price range for target
    let targetPrice = 0;
    if (portfolio.fairPriceRangeBullcase15) {
        const match = portfolio.fairPriceRangeBullcase15.match(/\$(\d+)/);
        if (match) targetPrice = parseFloat(match[1]);
    }
    
    const targetEl = document.getElementById('analyst-price-target');
    if (targetEl && targetPrice > 0) {
        const upside = ((targetPrice - currentPrice) / currentPrice * 100).toFixed(1);
        targetEl.innerHTML = `
            <div>Target: ${formatCurrency(targetPrice, 0, currency)}</div>
            <div class="font-bold ${upside > 0 ? 'text-green-500' : 'text-red-500'}">
                Upside: ${upside > 0 ? '+' : ''}${upside}%
            </div>
        `;
    }
    
    // Overall assessment badge using proper tier calculation
    const qualityScore = parseFloat(portfolio.qualityScore) || 0;
    const idqScore = parseFloat(llmReports?.IDQ_Report?.idqScore) || 0;
    const antiFragileScore = parseFloat(portfolio.antiFragileScore) || antiFragile?.totalScore || 0;
    
    const companyTier = calculateCompanyTier(qualityScore, idqScore, antiFragileScore);
    
    const badgeEl = document.getElementById('overall-assessment-badge');
    if (badgeEl) {
        badgeEl.innerHTML = `
            <div class="assessment-badge" style="background: linear-gradient(135deg, ${companyTier.color}, ${companyTier.color}dd)">
                <span class="badge-score">${Math.round(companyTier.score)}</span>
                <span class="badge-label">${companyTier.name}</span>
            </div>
        `;
    }
    
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
    
    // Card glow
    const qualityCard = document.getElementById('quality-card');
    if (qualityCard) {
        qualityCard.style.boxShadow = `0 4px 24px ${qualityColors.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`;
        qualityCard.classList.add(qualityColors.class);
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
        
        subScoresContainer.innerHTML = subScores.map(score => {
            const percentage = score.isNegative ? 
                Math.abs(score.value / score.max * 100) : 
                (score.value / score.max * 100);
            const barColor = score.isNegative && score.value < 0 ? '#ef4444' : qualityColors.color;
            
            return `
                <div class="subscore-item">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-xs text-gray-400">${score.label}</span>
                        <span class="text-xs font-semibold" style="color: ${barColor}">
                            ${score.value}${score.isNegative ? '' : `/${score.max}`}
                        </span>
                    </div>
                    <div class="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-1000 ease-out"
                             style="width: ${percentage}%; background: ${barColor}"></div>
                    </div>
                </div>
            `;
        }).join('');
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
    
    // Card glow
    const idqCard = document.getElementById('idq-card');
    if (idqCard) {
        idqCard.style.boxShadow = `0 4px 24px ${idqColors.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`;
        idqCard.classList.add(idqColors.class);
    }
    
    // Update summary text
    const idqSummaryEl = document.getElementById('idq-summary-text');
    if (idqSummaryEl && idqReport?.idqSummary) {
        const fullText = idqReport.idqSummary.replace(/\*\*/g, '');
        idqSummaryEl.textContent = fullText.length > 200 ? fullText.substring(0, 197) + '...' : fullText;
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
        afValueEl.style.fill = afColors.color;
    }
    
    // Update shield color
    const shield = document.querySelector('.antifragile-shield-path');
    if (shield) {
        shield.style.fill = afColors.color;
        shield.style.filter = `drop-shadow(0 4px 12px ${afColors.glow})`;
    }
    
    // Card glow
    const afCard = document.getElementById('antifragile-card');
    if (afCard) {
        afCard.style.boxShadow = `0 4px 24px ${afColors.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`;
        afCard.classList.add(afColors.class);
    }
    
    // Populate Anti-Fragile sub-scores
    const afSubScoresContainer = document.getElementById('antifragile-sub-scores-container');
    if (afSubScoresContainer && antiFragile?.groupScores) {
        const subScores = [
            { label: 'Strategic Core', value: antiFragile.groupScores.barbellMethodScore || 0, max: 13 },
            { label: 'Financial Fortitude', value: antiFragile.groupScores.financialFortitudeScore || 0, max: 7 },
            { label: 'Skin in the Game', value: antiFragile.groupScores.skinInTheGameScore || 0, max: 5 }
        ];
        
        afSubScoresContainer.innerHTML = subScores.map(score => {
            const percentage = Math.abs(score.value / score.max * 100);
            const barColor = score.value < 0 ? '#ef4444' : afColors.color;
            
            return `
                <div class="subscore-item">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-xs text-gray-400">${score.label}</span>
                        <span class="text-xs font-semibold" style="color: ${barColor}">
                            ${score.value}/${score.max}
                        </span>
                    </div>
                    <div class="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-1000 ease-out"
                             style="width: ${percentage}%; background: ${barColor}"></div>
                    </div>
                </div>
            `;
        }).join('');
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
            name: 'Turnaround Candidate', 
            color: '#f97316', 
            class: 'text-orange-500', 
            description: 'Companies requiring significant improvements but with potential for recovery',
            score: overallScore
        };
    } else {
        tier = { 
            name: 'Deep Value Play', 
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
    
    analysisContainer.innerHTML = `
        <div class="analysis-grid">
            <div class="analysis-card glass-morphism">
                <div class="analysis-header">
                    <h3 class="analysis-title">Investment Thesis</h3>
                </div>
                <div class="analysis-content">
                    ${thesisElements.map(element => `<p class="mb-3">${element}</p>`).join('')}
                    
                    <div class="mt-4 pt-4 border-t border-gray-700">
                        <div class="flex items-center gap-3">
                            <span class="text-sm text-gray-400">Overall Assessment:</span>
                            <span class="font-bold text-lg ${companyTier.class}" style="text-shadow: 0 0 10px ${companyTier.color};">
                                ${companyTier.name}
                            </span>
                            <span class="thesis-score">
                                <span class="thesis-score-value">${companyTier.score.toFixed(1)}</span>
                                <span class="thesis-score-total">/100</span>
                            </span>
                        </div>
                        <p class="text-xs text-gray-400 mt-1">${companyTier.description}</p>
                    </div>
                </div>
            </div>
            
            ${bigPicture ? `
            <div class="analysis-card glass-morphism border-l-4 border-green-500">
                <div class="analysis-header">
                    <h3 class="analysis-title">The Big Picture</h3>
                </div>
                <div class="analysis-content">
                    <p class="text-gray-300 leading-relaxed">${bigPicture}</p>
                </div>
            </div>
            ` : ''}
            
            ${coreDebate ? `
            <div class="analysis-card glass-morphism border-l-4 border-purple-500">
                <div class="analysis-header">
                    <h3 class="analysis-title">The Core Debate</h3>
                </div>
                <div class="analysis-content">
                    <p class="text-gray-300 leading-relaxed">${coreDebate}</p>
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
                        ${category.items.map(item => `
                            <div class="metric-item">
                                <span class="metric-label">${item.label}</span>
                                <span class="metric-value">${item.value || 'N/A'}</span>
                            </div>
                        `).join('')}
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
        
        // Update recent companies
        updateRecentCompanies(ticker.toUpperCase(), stockData.Portfolio.companyName);
        
        // Populate everything
        await populateCompanyCard();
        
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

function updateRecentCompanies(ticker, companyName) {
    const recent = state.recentCompanies.filter(c => c.ticker !== ticker);
    recent.unshift({ ticker, companyName });
    state.recentCompanies = recent.slice(0, 5);
    localStorage.setItem('recentCompanies', JSON.stringify(state.recentCompanies));
    displayRecentCompanies();
}

function displayRecentCompanies() {
    const container = document.getElementById('recent-companies');
    if (!container) return;
    
    container.innerHTML = state.recentCompanies.map(company => `
        <div class="recent-company-item" onclick="navigateToCompany('${company.ticker}')">
            <span class="ticker">${company.ticker}</span>
            <span class="name">${company.companyName}</span>
        </div>
    `).join('');
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
        container.innerHTML = '<p class="text-center text-gray-400">No financial data available</p>';
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
                    <thead class="bg-gradient-to-r from-gray-900 to-gray-800">
                        <tr>
                            <th class="text-left px-4 py-3 font-medium text-gray-400">Metric</th>
        `;
        
        periods.forEach(p => {
            html += `<th class="text-right px-4 py-3 font-medium text-gray-400">${p.label}</th>`;
        });
        
        html += '</tr></thead><tbody class="divide-y divide-gray-700">';
        
        metrics.forEach(metric => {
            html += `<tr class="hover:bg-gray-800/50 transition-colors">`;
            html += `<td class="px-4 py-3 text-gray-300">${metric.name}</td>`;
            
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

    // Theme-aware colors
    const isLightTheme = document.body.classList.contains('light-theme');
    const gridColor = isLightTheme ? '#dee2e6' : '#30363D';
    const textColor = isLightTheme ? '#535a5f' : '#8B949E';
    const pointColor = isLightTheme ? '#2e3338' : '#E6EDF3';
    const estimatePointColor = isLightTheme ? '#0d6efd' : '#3b82f6';
    const upColor = isLightTheme ? 'rgba(22, 163, 74, 0.9)' : 'rgba(34, 197, 94, 0.9)';
    const downColor = isLightTheme ? 'rgba(220, 53, 69, 0.9)' : 'rgba(239, 68, 68, 0.9)';
    const neutralColor = isLightTheme ? 'rgba(108, 117, 125, 0.9)' : 'rgba(139, 148, 158, 0.9)';
    const labelColor = isLightTheme ? '#2e3338' : '#E6EDF3';
    const estimateTextColor = isLightTheme ? '#0d6efd' : '#3b82f6';

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
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const ticker = urlParams.get('ticker') || 'NVDA';
    
    // Load theme
    if (state.theme === 'light') {
        document.body.classList.add('light-theme');
    }
    
    // Load recent companies
    displayRecentCompanies();
    
    // Fetch and display company data
    await fetchAndDisplayCompanyData(ticker);
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            state.theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
            localStorage.setItem('theme', state.theme);
            // Redraw chart with new theme colors
            if (state.currentStockData) {
                createEarningsChart(currentChartMetric);
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
// SCORE EXPANSION FUNCTIONALITY
// ============================================

// Track currently expanded score
let currentExpanded = null;

function toggleScoreExpansion(scoreType) {
    console.log('=== TOGGLE EXPANSION CALLED ===');
    console.log('Score type:', scoreType);
    console.log('Current expanded:', currentExpanded);
    console.log('Stock data available:', !!state.currentStockData);
    
    // Ensure we have data before proceeding
    if (!state.currentStockData) {
        console.error('No stock data available for expansion');
        alert('No data loaded yet. Please wait for data to load.');
        return;
    }
    
    const card = document.getElementById(`${scoreType}-card`);
    const expandedPanel = document.getElementById(`${scoreType}-expanded`);
    const expandIcon = document.getElementById(`${scoreType}-expand-icon`);
    
    if (!expandedPanel) {
        console.error('Expanded panel not found for:', scoreType);
        return;
    }
    
    // Populate content if not already populated
    if (!expandedPanel.innerHTML || expandedPanel.innerHTML.trim() === '') {
        expandedPanel.innerHTML = generateExpandedContent(scoreType);
    }
    
    // Check if we're on tablet (for special positioning)
    const isTablet = window.innerWidth >= 769 && window.innerWidth <= 1023;
    
    // EXPANSION LOGIC
    if (currentExpanded === scoreType) {
        // COLLAPSE CURRENT PANEL
        expandedPanel.classList.remove('show');
        if (expandIcon) {
            expandIcon.style.transform = 'rotate(0deg)';
        }
        if (card) {
            card.classList.remove('expanded', 'active-parent');
        }
        currentExpanded = null;
        
        // On tablet, move panel back to original position
        if (isTablet) {
            const scoresContainer = document.getElementById('scores-container');
            scoresContainer.appendChild(expandedPanel);
        }
    } else {
        // EXPAND NEW PANEL
        
        // First, collapse any previously opened panel
        if (currentExpanded) {
            const prevPanel = document.getElementById(`${currentExpanded}-expanded`);
            const prevIcon = document.getElementById(`${currentExpanded}-expand-icon`);
            const prevCard = document.getElementById(`${currentExpanded}-card`);
            
            if (prevPanel) prevPanel.classList.remove('show');
            if (prevIcon) prevIcon.style.transform = 'rotate(0deg)';
            if (prevCard) prevCard.classList.remove('expanded', 'active-parent');
            
            // On tablet, move the previously open panel back
            if (isTablet) {
                const scoresContainer = document.getElementById('scores-container');
                scoresContainer.appendChild(prevPanel);
            }
        }
        
        // On tablet, move the panel right after its card
        if (isTablet && card) {
            card.after(expandedPanel);
        }
        
        // Show the new panel
        expandedPanel.classList.add('show');
        if (expandIcon) {
            expandIcon.style.transform = 'rotate(180deg)';
        }
        if (card) {
            card.classList.add('expanded', 'active-parent');
        }
        currentExpanded = scoreType;
        
        // Scroll to expanded content smoothly
        setTimeout(() => {
            expandedPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
}

// Cleanup function to close all expansions
function closeAllExpansions() {
    if (currentExpanded) {
        toggleScoreExpansion(currentExpanded);
    }
}

// Helper function to get gradient fill based on percentage
function getGradientFill(percentage) {
    if (percentage >= 80) return 'var(--color-purple)';
    if (percentage >= 60) return 'var(--color-blue)';
    if (percentage >= 40) return 'var(--color-green)';
    if (percentage >= 20) return 'var(--color-yellow)';
    return 'var(--color-red)';
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

// Populate Quality expanded content with full breakdown
function populateQualityExpanded() {
    const llmResearch = state.currentStockData.LLM_Research_and_Comments;
    const groupScores = llmResearch.Total_scores_group.Group_Scores;
    const qualityScore = parseFloat(state.currentStockData.Portfolio.qualityScore);
    const qualityPercentage = (qualityScore / 109) * 100;
    const qualityColors = getScoreColor(qualityPercentage);

    let html = '<h3 class="text-xl font-bold mb-6">Enterprise Quality Breakdown</h3>';

    html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">';

    // Added max scores to this map
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
            <div class="summary-metric-card bg-gradient-to-br from-[#161B22] to-[#1C2128] rounded-lg p-4 border border-[#30363D] flex flex-col text-center transition-all duration-300">
                <h4 class="font-medium text-secondary">${group.name}</h4>
                <div class="text-4xl font-bold text-gray-200 my-2">${formatNumber(group.score)}<span class="text-lg text-gray-500"> / ${group.max}</span></div>
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
        <div class="summary-metric-card bg-gradient-to-br from-[#1C2128] to-[#242B33] rounded-lg p-3 border border-[#30363D] flex items-center justify-between transition-all duration-300 mb-8">
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
            <p class="text-gray-400 leading-relaxed">${idqReport.idqSummary || 'No summary available.'}</p>
        </div>
    `;
    
    // Detailed Facet Analysis Section
    if (detailedAnalysisText.includes('--- DETAILED FACET ANALYSIS ---')) {
        html += `
            <div class="idq-section">
                <h4 class="idq-section-title">Facet Breakdown</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
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
                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-sm font-medium text-gray-300">${title}</span>
                            <span class="text-sm font-mono"><span class="font-bold text-white">${score}</span>/${maxScore}</span>
                        </div>
                        <div class="metric-bar mb-2">
                            <div class="metric-fill ${shimmerClass}" style="width: ${percentage}%; background: ${barColor};"></div>
                        </div>
                        <p class="text-xs text-gray-400 leading-relaxed">${description}</p>
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
                <div class="text-xs text-gray-500 mb-3">Last Updated: ${idqReport.lastUpdated || 'N/A'}</div>
                <div class="border-l-2 border-gray-600 pl-4 space-y-2">
                    ${idqReport.catalystWatch.split('•').filter(line => line.trim()).map(line => `<p class="text-gray-400 leading-relaxed">${line.trim()}</p>`).join('')}
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
            <div class="summary-metric-card bg-gradient-to-br from-[#161B22] to-[#1C2128] rounded-lg p-4 border border-[#30363D] flex flex-col text-center">
                <h4 class="font-medium text-gray-400">${group.name}</h4>
                <div class="text-4xl font-bold text-gray-200 my-2">${formatNumber(group.score)}<span class="text-lg text-gray-500"> / ${group.max}</span></div>
            </div>
        `;
    });
    html += '</div>';

    // --- Detailed Breakdown ---
    html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">';

    // Helper function to render a single metric
    const renderMetric = (name, score, max, reasoning, isPenalty = false, colorPercentageOverride = null) => {
        let metricHtml = '';
        const hasReasoning = reasoning ? 'has-reasoning' : '';
        const tooltip = reasoning || '';
        const reasoningIcon = reasoning ? '<span class="reasoning-icon">💡</span>' : '';

        if (isPenalty) {
            metricHtml += `
                <div class="metric-item ${hasReasoning}" data-tooltip="${tooltip}">
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-400">${name}${reasoningIcon}</span>
                        <span class="text-sm font-mono"><span class="font-bold ${score < 0 ? 'text-red-400' : 'text-white'}">${formatNumber(score, 0)}</span> / 0</span>
                    </div>
                </div>`;
        } else {
            const percentageForWidth = max > 0 ? (score / max) * 100 : 0;
            const percentageForColor = colorPercentageOverride !== null ? colorPercentageOverride : percentageForWidth;
            const gradient = getGradientFill(percentageForColor);
            const shimmerClass = percentageForWidth >= 80 ? 'shimmer-effect' : '';
            metricHtml += `
                <div class="metric-item ${hasReasoning}" data-tooltip="${tooltip}">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-sm text-gray-400">${name}${reasoningIcon}</span>
                        <span class="text-sm font-mono"><span class="font-bold text-white">${formatNumber(score)}</span>/${max}</span>
                    </div>
                    <div class="metric-bar">
                        <div class="metric-fill ${shimmerClass}" style="width: ${percentageForWidth}%; background: ${gradient};"></div>
                    </div>
                </div>`;
        }
        return metricHtml;
    };

    // Strategic Core Metrics
    const sc = antiFragile.metricScores.barbellMethod;
    html += '<div><h4 class="font-semibold text-gray-300 mb-3">Strategic Core</h4><div class="space-y-4">';

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
    html += '<div><h4 class="font-semibold text-gray-300 mb-3">Financial Fortitude</h4><div class="space-y-4">';
    html += renderMetric('Cash, Debt, FCF', ff.cashDebtFreeCashFlow, 1, llmResearch.Financials_Group?.financialResilienceReasoning);
    html += renderMetric('Concentration Penalty', ff.concentration, 0, llmResearch.Gauntlet_Group?.customerConcentrationReasoning, true);
    html += '</div></div>';

    // Skin in the Game Metrics
    const sitg = antiFragile.metricScores.skinInTheGame;
    html += '<div class="md:col-span-2"><h4 class="font-semibold text-gray-300 mb-3 mt-4">Skin in the Game</h4><div class="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">';
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

// Function to show group details (called from quality expansion)
function showGroupDetails(groupName) {
    console.log('Show group details for:', groupName);
    const panel = document.getElementById('shared-summary-panel');
    if (!panel) return;
    
    const llmResearch = state.currentStockData.LLM_Research_and_Comments;
    let content = '';
    
    // Get the appropriate group data and summary
    let groupData = {};
    let summary = '';
    
    switch(groupName.toLowerCase()) {
        case 'financials':
            groupData = llmResearch.Financials_Group || {};
            summary = llmResearch.Summaries_Group?.financialsSummary || 'Financial strength metrics';
            break;
        case 'moat':
            groupData = llmResearch.Moat_Group || {};
            summary = llmResearch.Summaries_Group?.moatSummary || 'Competitive advantage analysis';
            break;
        case 'potential':
            groupData = llmResearch.Potential_Group || {};
            summary = llmResearch.Summaries_Group?.potentialSummary || 'Growth and innovation potential';
            break;
        case 'culture':
            groupData = llmResearch.Culture_and_Pastperformance_Group || {};
            summary = llmResearch.Summaries_Group?.cultureSummary || 'Culture and past performance metrics';
            break;
        case 'gauntlet':
            groupData = llmResearch.Gauntlet_Group || {};
            summary = llmResearch.Summaries_Group?.gauntletSummary || 'Risk and warning indicators';
            break;
    }
    
    // Build the content
    content = `
        <div class="p-6 bg-gradient-to-br from-[#161B22] to-[#1C2128] rounded-lg border border-[#30363D]">
            <h4 class="text-lg font-semibold mb-3 capitalize">${groupName} Details</h4>
            <p class="text-sm text-gray-400 mb-4">${summary}</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    `;
    
    // Add metrics
    Object.entries(groupData).forEach(([metric, value]) => {
        if (!metric.endsWith('Reasoning') && typeof value !== 'object') {
            const reasoning = groupData[`${metric}Reasoning`];
            content += `
                <div class="flex justify-between items-center p-3 bg-[#0D1117] rounded ${reasoning ? 'cursor-help' : ''}" 
                     ${reasoning ? `title="${reasoning}"` : ''}>
                    <span class="text-sm text-gray-400">${formatMetricName(metric)}</span>
                    <span class="font-semibold text-white">${value}</span>
                </div>
            `;
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
// GLOBAL EXPORTS
// ============================================

// Export main module
window.CompanyCard = {
    fetchAndDisplayCompanyData,
    navigateToCompany,
    state
};

// Export expansion functions
window.toggleScoreExpansion = toggleScoreExpansion;
window.closeAllExpansions = closeAllExpansions;
window.showGroupDetails = showGroupDetails;

// Debug: Verify functions are available
console.log('=== EXPANSION FUNCTIONS LOADED ===');
console.log('window.toggleScoreExpansion:', typeof window.toggleScoreExpansion);
console.log('Test call: window.toggleScoreExpansion("quality") in console to debug');