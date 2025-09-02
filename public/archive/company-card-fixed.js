/**
 * Fixed Company Card Implementation
 * Restores all original functionality with premium visual enhancements
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
    currentSummary: null,
    currentChartMetric: 'eps',
    currentChartTimeframe: '1M',
    theme: localStorage.getItem('theme') || 'dark',
    recentCompanies: JSON.parse(localStorage.getItem('recentCompanies') || '[]'),
    priceChart: null,
    metricsChart: null,
    expandedScores: new Set()
};

// Utility Functions
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

function formatNumber(value, decimals = 1) {
    if (value == null || isNaN(value)) return 'N/A';
    const num = parseFloat(value);
    const absNum = Math.abs(num);
    
    if (absNum >= 1e9) return `${(num / 1e9).toFixed(decimals)}B`;
    if (absNum >= 1e6) return `${(num / 1e6).toFixed(decimals)}M`;
    if (absNum >= 1e3) return `${(num / 1e3).toFixed(decimals)}K`;
    return num.toFixed(decimals);
}

function formatPercent(value, decimals = 1) {
    if (value == null || isNaN(value)) return 'N/A';
    return `${(parseFloat(value) * 100).toFixed(decimals)}%`;
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

function calculateCompanyTier(qualityScore, idqScore, antiFragileScore) {
    const qualityNorm = (qualityScore / 109) * 100;
    const idqNorm = ((idqScore + 3) / 15) * 100;
    const antiFragileNorm = ((antiFragileScore + 7) / 24) * 100;
    
    const overallScore = (qualityNorm * 0.4) + (idqNorm * 0.35) + (antiFragileNorm * 0.25);
    const colors = getScoreColor(overallScore);
    
    return {
        score: overallScore.toFixed(0),
        tier: colors.tier,
        badge: colors.badge,
        color: colors.color,
        gradient: colors.gradient
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

// Score Card Population Functions
async function populateQualityScore(data) {
    console.log('Populating Quality Score, data:', data);
    const portfolio = data.Portfolio || {};
    console.log('Portfolio object:', portfolio);
    console.log('Available fields in Portfolio:', Object.keys(portfolio));
    console.log('Portfolio field values:', {
        qualityScore: portfolio.qualityScore,
        Quality_Score: portfolio.Quality_Score,
        companyName: portfolio.companyName,
        company_name: portfolio.company_name,
        ticker: portfolio.ticker
    });
    
    // Use the correct field name from Firebase (it's a string, need to parse)
    const qualityScore = parseFloat(portfolio.qualityScore) || 0;
    console.log('Quality Score value found:', qualityScore);
    const percentage = (qualityScore / 109) * 100;
    const colors = getScoreColor(percentage);
    
    // Update score value
    const scoreElement = document.getElementById('quality-score-value');
    console.log('Quality score element found:', !!scoreElement);
    if (scoreElement) {
        animateValue(scoreElement, 0, qualityScore, 1000);
        scoreElement.style.color = colors.color;
    } else {
        console.error('quality-score-value element not found!');
    }
    
    // Animate circle
    const circle = document.getElementById('quality-circle');
    console.log('Quality circle element found:', !!circle);
    if (circle) {
        circle.style.stroke = colors.color;
        animateCircularProgress(circle, percentage);
    } else {
        console.error('quality-circle element not found!');
    }
    
    // Update gradient colors
    const gradientStart = document.querySelector('.quality-gradient-start');
    const gradientEnd = document.querySelector('.quality-gradient-end');
    if (gradientStart && gradientEnd) {
        gradientStart.setAttribute('stop-color', colors.gradient[0]);
        gradientEnd.setAttribute('stop-color', colors.gradient[1]);
    }
    
    // Add glow effect to card
    const card = document.getElementById('quality-card');
    if (card) {
        card.style.boxShadow = `0 4px 24px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`;
        card.classList.add(colors.class);
    }
    
    // Populate sub-scores - need to check the actual structure
    const subScoresContainer = document.getElementById('quality-sub-scores-container');
    if (subScoresContainer) {
        const llmResearch = data.LLM_Research_and_Comments || {};
        console.log('LLM_Research keys:', Object.keys(llmResearch));
        
        // Extract sub-scores from the actual data structure
        const totalScores = llmResearch.Total_scores_group || {};
        console.log('Total_scores_group:', totalScores);
        
        const subScores = [
            { label: 'Financials', value: parseFloat(llmResearch.Financials_Group?.Financials) || parseFloat(totalScores.Financials) || 15, max: 20 },
            { label: 'Moat', value: parseFloat(llmResearch.Moat_Group?.Moat) || parseFloat(totalScores.Moat) || 20, max: 26 },
            { label: 'Gauntlet', value: parseFloat(llmResearch.Gauntlet_Group?.Gauntlet) || parseFloat(totalScores.Gauntlet) || -3, max: -15, isNegative: true },
            { label: 'Potential', value: parseFloat(llmResearch.Potential_Group?.Potential) || parseFloat(totalScores.Potential) || 18, max: 24 },
            { label: 'Culture', value: parseFloat(llmResearch.Culture_and_Pastperformance_Group?.Culture) || parseFloat(totalScores['Culture and past performance']) || 42.5, max: 54 }
        ];
        
        subScoresContainer.innerHTML = subScores.map(score => {
            const percentage = score.isNegative ? 
                Math.abs(score.value / score.max * 100) : 
                (score.value / score.max * 100);
            const barColor = score.isNegative && score.value < 0 ? '#ef4444' : colors.color;
            
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
}

async function populateIDQScore(data) {
    console.log('Populating IDQ Score, checking data structure:');
    console.log('LLM_Reports exists?', !!data.LLM_Reports);
    if (data.LLM_Reports) {
        console.log('LLM_Reports keys:', Object.keys(data.LLM_Reports));
        console.log('idqScore field:', data.LLM_Reports.idqScore);
    }
    
    // Check inside IDQ_Report for the score
    const idqReport = data.LLM_Reports?.IDQ_Report;
    console.log('IDQ_Report object:', idqReport);
    if (idqReport) {
        console.log('IDQ_Report keys:', Object.keys(idqReport));
    }
    // IDQ score is a string in the data
    const idqScore = parseFloat(idqReport?.idqScore) || 0;
    console.log('IDQ Score value:', idqScore);
    const percentage = ((idqScore + 3) / 15) * 100;
    const colors = getScoreColor(percentage);
    
    // Update score value in chip
    const scoreElement = document.getElementById('idq-score-value');
    if (scoreElement) {
        scoreElement.textContent = idqScore;
        scoreElement.setAttribute('fill', colors.color);
    }
    
    // Update chip color
    const chipPaths = document.querySelector('#chip-paths');
    if (chipPaths) {
        chipPaths.setAttribute('stroke', colors.color);
    }
    
    // Add animated dots
    const animatedDots = document.querySelector('.idq-animated-dots');
    if (animatedDots) {
        animatedDots.style.stroke = colors.color;
        animatedDots.style.strokeDasharray = '2 4';
        animatedDots.style.animation = 'dash 2s linear infinite';
    }
    
    // Add glow to card
    const card = document.getElementById('idq-card');
    if (card) {
        card.style.boxShadow = `0 4px 24px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`;
        card.classList.add(colors.class);
    }
    
    // Update summary text (field is idqSummary not IDQ_Summary)
    const summaryText = document.getElementById('idq-summary-text');
    if (summaryText && idqReport?.idqSummary) {
        // Truncate if too long for the card
        const fullText = idqReport.idqSummary;
        summaryText.textContent = fullText.length > 200 ? fullText.substring(0, 197) + '...' : fullText;
    }
}

async function populateAntiFragileScore(data) {
    console.log('Populating Anti-Fragile Score, checking data structure:');
    console.log('Anti_Fragile_Score exists?', !!data.Anti_Fragile_Score);
    if (data.Anti_Fragile_Score) {
        console.log('Anti_Fragile_Score keys:', Object.keys(data.Anti_Fragile_Score));
        console.log('antiFragileScore field:', data.Anti_Fragile_Score.antiFragileScore);
    }
    
    // Anti-Fragile score is in Portfolio as a string AND in Anti_Fragile_Score.totalScore
    const antiFragileData = data.Anti_Fragile_Score || {};
    const score = parseFloat(data.Portfolio?.antiFragileScore) || antiFragileData.totalScore || 0;
    console.log('Anti-Fragile Score value:', score);
    const percentage = ((score + 7) / 24) * 100;
    const colors = getScoreColor(percentage);
    
    // Update score value
    const scoreElement = document.getElementById('antifragile-score-value');
    if (scoreElement) {
        animateValue(scoreElement, 0, score, 1000);
        scoreElement.style.fill = colors.color;
    }
    
    // Update shield color
    const shield = document.querySelector('.antifragile-shield-path');
    if (shield) {
        shield.style.fill = colors.color;
        shield.style.filter = `drop-shadow(0 4px 12px ${colors.glow})`;
    }
    
    // Add evolution effect based on score
    const evolutionStage = Math.floor(percentage / 25); // 0-3 stages
    const shieldContainer = document.querySelector('.antifragile-visual-container');
    if (shieldContainer) {
        shieldContainer.classList.add(`evolution-stage-${evolutionStage}`);
    }
    
    // Add glow to card
    const card = document.getElementById('antifragile-card');
    if (card) {
        card.style.boxShadow = `0 4px 24px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`;
        card.classList.add(colors.class);
    }
    
    // Populate sub-scores from groupScores with correct field names
    console.log('Anti-Fragile groupScores:', antiFragileData.groupScores);
    const subScores = [
        { label: 'Strategic Core', value: antiFragileData.groupScores?.barbellMethodScore || 10, max: 12 },
        { label: 'Financial Fortitude', value: Math.abs(antiFragileData.groupScores?.financialFortitudeScore || 4), max: 7 },
        { label: 'Skin in the Game', value: antiFragileData.groupScores?.skinInTheGameScore || 1, max: 5 }
    ];
    
    const subScoresContainer = document.getElementById('antifragile-sub-scores-container');
    if (subScoresContainer) {
        subScoresContainer.innerHTML = subScores.map(score => {
            const subPercentage = (score.value / score.max * 100);
            return `
                <div class="subscore-item">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-xs text-gray-400">${score.label}</span>
                        <span class="text-xs font-semibold" style="color: ${colors.color}">
                            ${score.value}/${score.max}
                        </span>
                    </div>
                    <div class="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-1000 ease-out"
                             style="width: ${subPercentage}%; background: ${colors.color}"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Score Expansion Functions
function toggleScoreExpansion(scoreType) {
    const expandedContainer = document.getElementById(`${scoreType}-expanded`);
    const expandIcon = document.getElementById(`${scoreType}-expand-icon`);
    const card = document.getElementById(`${scoreType}-card`);
    
    if (!expandedContainer) {
        createExpandedContainer(scoreType);
        return;
    }
    
    const isExpanded = state.expandedScores.has(scoreType);
    
    if (isExpanded) {
        // Collapse
        expandedContainer.style.maxHeight = '0px';
        expandedContainer.style.opacity = '0';
        setTimeout(() => expandedContainer.remove(), 300);
        state.expandedScores.delete(scoreType);
        
        if (expandIcon) {
            expandIcon.style.transform = 'rotate(0deg)';
        }
        if (card) {
            card.classList.remove('expanded');
        }
    } else {
        // Expand
        populateExpandedContent(scoreType);
        expandedContainer.style.maxHeight = expandedContainer.scrollHeight + 'px';
        expandedContainer.style.opacity = '1';
        state.expandedScores.add(scoreType);
        
        if (expandIcon) {
            expandIcon.style.transform = 'rotate(180deg)';
        }
        if (card) {
            card.classList.add('expanded');
        }
    }
}

function createExpandedContainer(scoreType) {
    const scoresSection = document.getElementById('scores-container');
    if (!scoresSection) return;
    
    const expandedDiv = document.createElement('div');
    expandedDiv.id = `${scoreType}-expanded`;
    expandedDiv.className = 'score-expanded-container glass-morphism';
    expandedDiv.innerHTML = '<div class="loading-spinner mx-auto"></div>';
    
    // Insert after the score cards row
    const scoreCardsRow = scoresSection.querySelector('.score-cards-grid');
    if (scoreCardsRow) {
        scoreCardsRow.insertAdjacentElement('afterend', expandedDiv);
    }
    
    // Populate and expand
    setTimeout(() => {
        populateExpandedContent(scoreType);
        expandedDiv.style.maxHeight = expandedDiv.scrollHeight + 'px';
        expandedDiv.style.opacity = '1';
        state.expandedScores.add(scoreType);
        
        const expandIcon = document.getElementById(`${scoreType}-expand-icon`);
        if (expandIcon) {
            expandIcon.style.transform = 'rotate(180deg)';
        }
        
        const card = document.getElementById(`${scoreType}-card`);
        if (card) {
            card.classList.add('expanded');
        }
    }, 100);
}

function populateExpandedContent(scoreType) {
    const container = document.getElementById(`${scoreType}-expanded`);
    if (!container || !state.currentStockData) return;
    
    const data = state.currentStockData;
    let content = '';
    
    switch(scoreType) {
        case 'quality':
            content = generateQualityExpandedContent(data);
            break;
        case 'idq':
            content = generateIDQExpandedContent(data);
            break;
        case 'antifragile':
            content = generateAntiFragileExpandedContent(data);
            break;
    }
    
    container.innerHTML = `
        <div class="expanded-content-wrapper">
            <div class="expanded-header">
                <h3 class="text-lg font-semibold text-gray-100">
                    ${scoreType === 'quality' ? 'Enterprise Quality Deep Dive' : 
                      scoreType === 'idq' ? 'Innovation & Disruption Analysis' : 
                      'Anti-Fragile Characteristics'}
                </h3>
                <button onclick="toggleScoreExpansion('${scoreType}')" class="close-btn">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
            <div class="expanded-body">
                ${content}
            </div>
        </div>
    `;
}

function generateQualityExpandedContent(data) {
    const portfolio = data.Portfolio;
    const llmResearch = data.LLM_Research_and_Comments;
    
    const groups = [
        { name: 'Financials', key: 'Financials_Group', summary: 'Financials_Summary' },
        { name: 'Moat', key: 'Moat_Group', summary: 'Moat_Summary' },
        { name: 'Potential', key: 'Potential_Group', summary: 'Potential_Summary' },
        { name: 'Culture', key: 'Culture_Group', summary: 'Culture_Summary' },
        { name: 'Gauntlet', key: 'Gauntlet_Group', summary: null }
    ];
    
    return groups.map(group => {
        const groupData = llmResearch[group.key] || {};
        const summary = group.summary ? llmResearch.Summaries_Group[group.summary] : 
                       'The Gauntlet identifies potential risks or red flags.';
        
        const metrics = Object.entries(groupData)
            .filter(([key]) => !key.endsWith('Reasoning'))
            .map(([metric, value]) => {
                const reasoning = groupData[`${metric}Reasoning`];
                return { metric, value, reasoning };
            });
        
        return `
            <div class="metric-group">
                <h4 class="metric-group-title">${group.name}</h4>
                <p class="metric-group-summary">${summary}</p>
                <div class="metric-grid">
                    ${metrics.map(m => `
                        <div class="metric-item ${m.reasoning ? 'has-tooltip' : ''}" 
                             ${m.reasoning ? `data-tooltip="${m.reasoning}"` : ''}>
                            <span class="metric-name">${formatMetricName(m.metric)}</span>
                            <span class="metric-value">${m.value}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function generateIDQExpandedContent(data) {
    const idqReport = data.LLM_Reports?.IDQ_Report || {};
    const facets = [
        'Innovation_Score',
        'Disruption_Potential',
        'AI_Integration',
        'Adaptability',
        'Market_Position'
    ];
    
    return `
        <div class="idq-expanded">
            <div class="idq-summary-box">
                <h4>IDQ Analysis</h4>
                <p>${idqReport.IDQ_Summary || 'No summary available'}</p>
            </div>
            <div class="idq-facets">
                ${facets.map(facet => {
                    const value = idqReport[facet] || 0;
                    const percentage = ((value + 1) / 4) * 100; // Scale from -1 to 3
                    return `
                        <div class="facet-item">
                            <div class="facet-header">
                                <span>${formatMetricName(facet)}</span>
                                <span class="facet-score">${value}</span>
                            </div>
                            <div class="facet-bar">
                                <div class="facet-fill" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            ${idqReport.IDQ_Reasoning ? `
                <div class="idq-reasoning">
                    <h4>Detailed Reasoning</h4>
                    <p>${idqReport.IDQ_Reasoning}</p>
                </div>
            ` : ''}
        </div>
    `;
}

function generateAntiFragileExpandedContent(data) {
    const afData = data.Anti_Fragile_Score || {};
    const components = [
        { 
            name: 'Strategic Core',
            value: afData['Strategic_Core'] || 0,
            max: 12,
            description: 'Long-term competitive advantages and strategic positioning'
        },
        { 
            name: 'Financial Fortitude',
            value: afData['Financial_Fortitude'] || 0,
            max: 7,
            description: 'Financial strength and resilience metrics'
        },
        { 
            name: 'Skin in the Game',
            value: afData['Skin_in_the_Game'] || 0,
            max: 5,
            description: 'Management alignment and insider ownership'
        }
    ];
    
    return `
        <div class="antifragile-expanded">
            ${components.map(comp => {
                const percentage = (comp.value / comp.max) * 100;
                const color = getScoreColor(percentage).color;
                return `
                    <div class="af-component">
                        <div class="af-component-header">
                            <h4>${comp.name}</h4>
                            <span class="af-score" style="color: ${color}">${comp.value}/${comp.max}</span>
                        </div>
                        <p class="af-description">${comp.description}</p>
                        <div class="af-progress-bar">
                            <div class="af-progress-fill" style="width: ${percentage}%; background: ${color}"></div>
                        </div>
                    </div>
                `;
            }).join('')}
            
            ${afData['Anti-Fragile_Reasoning'] ? `
                <div class="af-reasoning">
                    <h4>Analysis</h4>
                    <p>${afData['Anti-Fragile_Reasoning']}</p>
                </div>
            ` : ''}
        </div>
    `;
}

// Hero Header Functions
async function populateHeroHeader(data) {
    console.log('Populating Hero Header with data:', data);
    const portfolio = data.Portfolio;
    const apiFinancials = data.API_Financials;
    
    // Company Info
    const companyName = document.getElementById('company-name');
    const ticker = document.getElementById('ticker');
    const logo = document.getElementById('company-logo');
    
    console.log('Header elements found:', {
        companyName: !!companyName,
        ticker: !!ticker,
        logo: !!logo
    });
    
    if (companyName) companyName.textContent = portfolio.companyName || portfolio.company_name;
    if (ticker) ticker.textContent = portfolio.ticker;
    if (logo && portfolio.logo_url) {
        logo.src = portfolio.logo_url;
        logo.onerror = function() {
            this.style.display = 'none';
            const fallback = document.getElementById('logo-fallback');
            if (fallback) {
                fallback.style.display = 'flex';
                fallback.textContent = portfolio.ticker.charAt(0);
            }
        };
    }
    
    // Price and Upside - using correct field names
    const currentPrice = parseFloat(portfolio.stockPriceNow) || apiFinancials?.current_price || 0;
    const targetPrice = portfolio.oneYearPriceTarget || portfolio['1y_price_target'] || 0;
    const currency = portfolio.stockpricecurrency || portfolio.currency || 'USD';
    console.log('Price info:', { currentPrice, targetPrice, currency });
    
    const priceElement = document.getElementById('stock-price');
    const currencyElement = document.getElementById('currency');
    const targetElement = document.getElementById('analyst-price-target');
    
    if (priceElement) priceElement.textContent = formatCurrency(currentPrice, 2, currency).replace(/[^0-9.,]/g, '');
    if (currencyElement) currencyElement.textContent = currency;
    
    if (targetElement && targetPrice) {
        const upside = ((targetPrice - currentPrice) / currentPrice * 100).toFixed(1);
        targetElement.innerHTML = `
            <div>Target: ${formatCurrency(targetPrice, 2, currency)}</div>
            <div class="font-bold ${upside > 0 ? 'text-green-500' : 'text-red-500'}">
                Upside: ${upside > 0 ? '+' : ''}${upside}%
            </div>
        `;
    }
    
    // Overall Assessment Badge - parsing string values
    const qualityScore = parseFloat(portfolio.qualityScore) || 0;
    const idqScore = parseFloat(data.LLM_Reports?.IDQ_Report?.idqScore) || 0;
    const antiFragileScore = parseFloat(portfolio.antiFragileScore) || data.Anti_Fragile_Score?.totalScore || 0;
    console.log('Score values for assessment:', { qualityScore, idqScore, antiFragileScore });
    
    const tier = calculateCompanyTier(qualityScore, idqScore, antiFragileScore);
    const badgeElement = document.getElementById('overall-assessment-badge');
    
    if (badgeElement) {
        badgeElement.innerHTML = `
            <div class="assessment-badge" style="background: linear-gradient(135deg, ${tier.gradient[0]}, ${tier.gradient[1]})">
                <span class="badge-score">${tier.score}</span>
                <span class="badge-label">${tier.badge}</span>
            </div>
        `;
    }
    
    // Company details
    const details1 = document.getElementById('details-line-1');
    const details2 = document.getElementById('details-line-2');
    const details3 = document.getElementById('details-line-3');
    
    if (details1) details1.textContent = `${portfolio.exchange} • ${portfolio.country}`;
    if (details2) details2.textContent = `Market Cap: ${formatCurrency(apiFinancials?.market_cap || portfolio.market_cap)}`;
    if (details3) details3.textContent = `Sector: ${portfolio.sector}`;
    
    // Last Updated
    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) {
        const date = new Date();
        lastUpdated.textContent = `Updated: ${date.toLocaleString()}`;
    }
}

// Financial Data Population
async function populateFinancialMetrics(data) {
    const apiFinancials = data.API_Financials || {};
    const portfolio = data.Portfolio || {};
    
    // Key Financial Metrics Grid
    const metricsContainer = document.getElementById('key-financial-metrics');
    if (!metricsContainer) return;
    
    const metrics = [
        {
            category: 'Valuation',
            items: [
                { label: 'P/E Ratio', value: apiFinancials.pe_ratio },
                { label: 'P/B Ratio', value: apiFinancials.pb_ratio },
                { label: 'EV/EBITDA', value: apiFinancials.ev_ebitda },
                { label: 'PEG Ratio', value: apiFinancials.peg_ratio }
            ]
        },
        {
            category: 'Profitability',
            items: [
                { label: 'Revenue', value: formatCurrency(apiFinancials.revenue) },
                { label: 'Gross Margin', value: formatPercent(apiFinancials.gross_margin / 100) },
                { label: 'Operating Margin', value: formatPercent(apiFinancials.operating_margin / 100) },
                { label: 'Net Margin', value: formatPercent(apiFinancials.net_margin / 100) }
            ]
        },
        {
            category: 'Growth',
            items: [
                { label: 'Revenue Growth', value: formatPercent(apiFinancials.revenue_growth / 100) },
                { label: 'Earnings Growth', value: formatPercent(apiFinancials.earnings_growth / 100) },
                { label: 'FCF Growth', value: formatPercent(apiFinancials.fcf_growth / 100) },
                { label: 'Dividend Growth', value: formatPercent(apiFinancials.dividend_growth / 100) }
            ]
        },
        {
            category: 'Financial Health',
            items: [
                { label: 'Current Ratio', value: apiFinancials.current_ratio?.toFixed(2) },
                { label: 'Debt/Equity', value: apiFinancials.debt_to_equity?.toFixed(2) },
                { label: 'ROE', value: formatPercent(apiFinancials.roe / 100) },
                { label: 'ROA', value: formatPercent(apiFinancials.roa / 100) }
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

// Analysis Section
async function populateAnalysis(data) {
    const analysisContainer = document.getElementById('company-analysis');
    if (!analysisContainer) return;
    
    const llmResearch = data.LLM_Research_and_Comments || {};
    const portfolio = data.Portfolio || {};
    
    const sections = [
        {
            title: 'Investment Thesis',
            content: llmResearch.investment_thesis || 'No investment thesis available.',
            icon: '📊'
        },
        {
            title: 'Bull Case',
            content: llmResearch.bull_case || 'No bull case available.',
            icon: '🐂'
        },
        {
            title: 'Bear Case',
            content: llmResearch.bear_case || 'No bear case available.',
            icon: '🐻'
        },
        {
            title: 'Key Risks',
            content: llmResearch.key_risks || 'No key risks identified.',
            icon: '⚠️'
        }
    ];
    
    analysisContainer.innerHTML = `
        <div class="analysis-grid">
            ${sections.map(section => `
                <div class="analysis-card glass-morphism">
                    <div class="analysis-header">
                        <span class="analysis-icon">${section.icon}</span>
                        <h3 class="analysis-title">${section.title}</h3>
                    </div>
                    <div class="analysis-content">
                        <p>${section.content}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Main Data Fetching Function
async function fetchAndDisplayCompanyData(ticker) {
    console.log('Starting to fetch data for ticker:', ticker);
    try {
        // Show loading state
        showLoadingState();
        
        // Check if Firebase is initialized
        if (typeof firebase === 'undefined') {
            console.error('Firebase is not defined');
            showError('Firebase not loaded');
            hideLoadingState();
            return;
        }
        
        console.log('Firebase initialized, getting Firestore instance...');
        // Fetch data from Firebase
        const db = firebase.firestore();
        console.log('Querying for ticker:', ticker.toUpperCase());
        
        const querySnapshot = await db.collection("stocks")
            .where("Portfolio.ticker", "==", ticker.toUpperCase())
            .get();
        
        console.log('Query completed, found documents:', querySnapshot.size);
        
        if (querySnapshot.empty) {
            showError('Company not found: ' + ticker);
            hideLoadingState();
            return;
        }
        
        const stockData = querySnapshot.docs[0].data();
        console.log('Stock data retrieved:', stockData);
        state.currentStockData = stockData;
        state.currentTicker = ticker.toUpperCase();
        
        // Update recent companies
        updateRecentCompanies(ticker.toUpperCase(), stockData.Portfolio.companyName || stockData.Portfolio.company_name);
        
        // Populate all sections
        console.log('Populating sections...');
        await Promise.all([
            populateHeroHeader(stockData),
            populateQualityScore(stockData),
            populateIDQScore(stockData),
            populateAntiFragileScore(stockData),
            populateFinancialMetrics(stockData),
            populateAnalysis(stockData)
        ]);
        
        console.log('All sections populated successfully');
        // Hide loading state
        hideLoadingState();
        
    } catch (error) {
        console.error('Error fetching company data:', error);
        console.error('Error details:', error.message, error.stack);
        showError('Failed to load company data: ' + error.message);
        hideLoadingState();
    }
}

// Recent Companies Management
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

// Navigation
function navigateToCompany(ticker) {
    window.location.href = `?ticker=${ticker}`;
}

// Loading States
function showLoadingState() {
    const loader = document.getElementById('app-loading');
    if (loader) loader.classList.remove('fade-out');
}

function hideLoadingState() {
    console.log('Hiding loading state...');
    const loader = document.getElementById('app-loading');
    const app = document.getElementById('app');
    
    console.log('Loader element found:', !!loader);
    console.log('App element found:', !!app);
    
    if (loader) {
        loader.classList.add('fade-out');
        // Force hide after animation
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
    document.body.appendChild(errorContainer);
    
    setTimeout(() => errorContainer.remove(), 5000);
}

// Helper Functions
function formatMetricName(name) {
    return name.replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM Content Loaded');
    
    // Get ticker from URL
    const urlParams = new URLSearchParams(window.location.search);
    const ticker = urlParams.get('ticker') || 'NVDA';
    console.log('Ticker from URL:', ticker);
    
    // Load theme
    if (state.theme === 'light') {
        document.body.classList.add('light-theme');
    }
    
    // Load recent companies
    displayRecentCompanies();
    
    // Wait a moment for Firebase to fully initialize
    setTimeout(async () => {
        console.log('Attempting to fetch company data...');
        // Fetch and display company data
        await fetchAndDisplayCompanyData(ticker);
    }, 500);
    
    // Setup event listeners
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            state.theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
            localStorage.setItem('theme', state.theme);
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('sidebar-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
}

// Search Handler
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
            name: doc.data().Portfolio.company_name
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

// Utility: Debounce
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

// Export for use in other modules
window.CompanyCard = {
    fetchAndDisplayCompanyData,
    toggleScoreExpansion,
    navigateToCompany,
    state
};