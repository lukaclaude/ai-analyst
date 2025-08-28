/**
 * Company Card Module
 * Premium Financial Analysis Platform
 * 
 * This module handles the company view page, including:
 * - Score calculations and display
 * - Firebase data fetching
 * - Chart rendering
 * - Interactive components
 */

// Import Company Sections module
import { CompanySections } from './company-sections.js';

// ============================================
// FIREBASE CONFIGURATION
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyAjllbzGx8QK3L7mePVk0uZ0R-ccenxElA",
    authDomain: "sheets-to-firestore-sync-v2.firebaseapp.com",
    projectId: "sheets-to-firestore-sync-v2",
    storageBucket: "sheets-to-firestore-sync-v2.firebasestorage.app",
    messagingSenderId: "1035123111291",
    appId: "1:1035123111291:web:30c0f5ee30f001c1a739de",
    measurementId: "G-QQW25R6FB8"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ============================================
// GLOBAL STATE
// ============================================

const state = {
    currentStockData: null,
    currentTicker: null,
    currentExpanded: null,
    currentSummary: null,
    currentChartMetric: 'eps',
    currentChartTimeframe: '1M',
    theme: localStorage.getItem('theme') || 'dark',
    recentCompanies: JSON.parse(localStorage.getItem('recentCompanies') || '[]')
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const Utils = {
    formatCurrency(value, decimals = 1, currency = 'USD') {
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
    },

    formatNumber(value, decimals = 1) {
        if (value == null || isNaN(value)) return 'N/A';
        const num = parseFloat(value);
        const absNum = Math.abs(num);
        
        if (absNum >= 1e9) return `${(num / 1e9).toFixed(decimals)}B`;
        if (absNum >= 1e6) return `${(num / 1e6).toFixed(decimals)}M`;
        if (absNum >= 1e3) return `${(num / 1e3).toFixed(decimals)}K`;
        return num.toFixed(decimals);
    },

    formatPercent(value, decimals = 1) {
        if (value == null || isNaN(value)) return 'N/A';
        return `${(parseFloat(value) * 100).toFixed(decimals)}%`;
    },

    getScoreColor(percentage) {
        if (percentage >= 80) return { 
            color: '#a855f7', 
            glow: 'var(--glow-purple)', 
            class: 'score-card--purple',
            tier: 'Apex',
            badge: 'EXCEPTIONAL'
        };
        if (percentage >= 74) return { 
            color: '#3b82f6', 
            glow: 'var(--glow-blue)', 
            class: 'score-card--blue',
            tier: 'Powerhouse',
            badge: 'EXCELLENT'
        };
        if (percentage >= 65) return { 
            color: '#22c55e', 
            glow: 'var(--glow-green)', 
            class: 'score-card--green',
            tier: 'Compounder',
            badge: 'STRONG'
        };
        if (percentage >= 55) return { 
            color: '#eab308', 
            glow: 'var(--glow-yellow)', 
            class: 'score-card--yellow',
            tier: 'Mixed',
            badge: 'MODERATE'
        };
        if (percentage >= 32) return { 
            color: '#f97316', 
            glow: 'var(--glow-orange)', 
            class: 'score-card--orange',
            tier: 'Challenged',
            badge: 'CHALLENGED'
        };
        return { 
            color: '#ef4444', 
            glow: 'var(--glow-red)', 
            class: 'score-card--red',
            tier: 'High Risk',
            badge: 'HIGH RISK'
        };
    },

    animateValue(element, start, end, duration = 1000) {
        if (!element) return;
        
        const range = end - start;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = start + (range * easeOutQuart);
            
            element.textContent = Math.round(current);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    },

    isMobile() {
        return window.innerWidth <= 768;
    },

    debounce(func, wait) {
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
};

// ============================================
// FIREBASE SERVICE
// ============================================

class FirebaseService {
    async getStockData(ticker) {
        try {
            const querySnapshot = await db.collection("stocks")
                .where("Portfolio.ticker", "==", ticker)
                .get();
            
            if (!querySnapshot.empty) {
                const data = querySnapshot.docs[0].data();
                return data;
            }
            
            throw new Error(`Stock ${ticker} not found`);
        } catch (error) {
            console.error("Error fetching stock data:", error);
            throw error;
        }
    }

    async getLivePrice(ticker) {
        const functionUrl = 'https://getstockprice-py46mxz5aq-uc.a.run.app';
        
        try {
            const response = await fetch(`${functionUrl}?ticker=${ticker}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const result = await response.json();
            return result.price;
        } catch (error) {
            console.error("Error fetching live price:", error);
            return null;
        }
    }

    async getChartData(ticker, timeframe = '1M') {
        const functionUrl = 'https://getchartdata-py46mxz5aq-uc.a.run.app';
        
        try {
            const response = await fetch(`${functionUrl}?ticker=${ticker}&timeframe=${timeframe}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error("Error fetching chart data:", error);
            return null;
        }
    }
}

// ============================================
// SCORE CALCULATIONS
// ============================================

class ScoreCalculator {
    static calculateOverallScore(qualityScore, idqScore, antiFragileScore) {
        // Normalize scores to 0-100 scale
        const qualityNorm = (qualityScore / 109) * 100;
        const idqNorm = ((idqScore + 3) / 15) * 100;
        const antiFragileNorm = ((antiFragileScore + 7) / 24) * 100;
        
        // Calculate weighted average (Quality 40%, IDQ 35%, Anti-Fragile 25%)
        const overallScore = (qualityNorm * 0.4) + (idqNorm * 0.35) + (antiFragileNorm * 0.25);
        
        return {
            score: overallScore,
            normalized: {
                quality: qualityNorm,
                idq: idqNorm,
                antiFragile: antiFragileNorm
            }
        };
    }

    static getQualityBreakdown(data) {
        const portfolio = data.Portfolio;
        
        return {
            financials: parseFloat(portfolio.financialsSubScore || 0),
            moat: parseFloat(portfolio.moatSubScore || 0),
            potential: parseFloat(portfolio.potentialSubScore || 0),
            culture: parseFloat(portfolio.cultureSubScore || 0),
            gauntlet: parseFloat(portfolio.gauntletSubScore || 0),
            total: parseFloat(portfolio.qualityScore || 0)
        };
    }

    static getIDQBreakdown(data) {
        const idqData = data.LLM_Reports?.IDQ_Report || {};
        
        return {
            score: parseFloat(idqData.score || 0),
            facets: {
                market: idqData.market_creation || 'N/A',
                disruption: idqData.disruption_potential || 'N/A',
                innovation: idqData.innovation_engine || 'N/A',
                strategy: idqData.strategic_positioning || 'N/A',
                adaptability: idqData.adaptability || 'N/A'
            }
        };
    }

    static getAntiFragileBreakdown(data) {
        const afData = data.Anti_Fragile_Score || {};
        
        return {
            score: parseFloat(afData.Total_Score || 0),
            components: {
                strategicCore: parseFloat(afData.Strategic_Core || 0),
                financialFortitude: parseFloat(afData.Financial_Fortitude || 0),
                skinInTheGame: parseFloat(afData.Skin_in_the_Game || 0)
            }
        };
    }
}

// ============================================
// COMPONENT RENDERERS
// ============================================

class ComponentRenderer {
    static renderUniversalHeader() {
        const header = document.getElementById('universal-header');
        if (!header) return;

        header.innerHTML = `
            <div class="universal-header__logo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                </svg>
                <span>FinAnalysis</span>
            </div>
            
            <div class="universal-header__search">
                <svg class="universal-header__search-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
                </svg>
                <input type="search" 
                       class="universal-header__search-input" 
                       placeholder="Search companies..."
                       id="global-search">
            </div>
            
            <nav class="universal-header__nav">
                <a href="/" class="universal-header__nav-item">Dashboard</a>
                <a href="?view=list" class="universal-header__nav-item">All Stocks</a>
                <a href="#" class="universal-header__nav-item">Watchlist</a>
            </nav>
        `;

        // Add search functionality
        const searchInput = header.querySelector('#global-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.handleGlobalSearch(e.target.value);
            }, 300));
        }
    }

    static renderHeroHeader(data) {
        const header = document.getElementById('hero-header');
        if (!header) return;

        const portfolio = data.Portfolio;
        const financials = data.API_Financials?.General || {};
        
        const currentPrice = parseFloat(portfolio.stockPriceNow);
        const targetPrice = parseFloat(portfolio.targetPrice);
        const upside = ((targetPrice - currentPrice) / currentPrice) * 100;
        const currency = portfolio.stockpricecurrency || 'USD';
        
        // Calculate overall score
        const qualityScore = parseFloat(portfolio.qualityScore);
        const idqScore = parseFloat(data.LLM_Reports?.IDQ_Report?.score || 0);
        const antiFragileScore = parseFloat(data.Anti_Fragile_Score?.Total_Score || 0);
        const overall = ScoreCalculator.calculateOverallScore(qualityScore, idqScore, antiFragileScore);
        const scoreColors = Utils.getScoreColor(overall.score);
        
        header.innerHTML = `
            <div class="hero-header__container">
                <div class="hero-header__logo">
                    <img src="${financials.companyLogo || '/assets/images/default-logo.png'}" 
                         alt="${portfolio.companyName}" 
                         onerror="this.src='/assets/images/default-logo.png'">
                </div>
                
                <div class="hero-header__info">
                    <div class="hero-header__name">
                        ${portfolio.companyName}
                        <span class="hero-header__ticker">${portfolio.ticker}</span>
                    </div>
                    
                    <div class="hero-header__price-container">
                        <span class="hero-header__price">
                            ${Utils.formatCurrency(currentPrice, 2, currency)}
                        </span>
                        <span class="hero-header__price-change hero-header__price-change--${upside >= 0 ? 'positive' : 'negative'}">
                            ${upside >= 0 ? '+' : ''}${upside.toFixed(1)}%
                        </span>
                    </div>
                    
                    <div class="hero-header__target">
                        <span>Target: ${Utils.formatCurrency(targetPrice, 2, currency)}</span>
                        <span class="hero-header__target-value">
                            Upside: ${upside.toFixed(1)}%
                        </span>
                    </div>
                </div>
                
                <div class="hero-header__overall">
                    <div class="hero-header__overall-score" 
                         style="--score-color-start: ${scoreColors.color}; --score-color-end: ${scoreColors.glow};">
                        ${overall.score.toFixed(0)}
                    </div>
                    <div class="hero-header__overall-badge" 
                         style="background: ${scoreColors.color};">
                        ${scoreColors.badge}
                    </div>
                </div>
            </div>
        `;
        
        // Set hero header glow color
        header.style.setProperty('--score-glow-color', scoreColors.color);
    }

    static renderSidebar(data) {
        const sidebar = document.getElementById('navigation-sidebar');
        if (!sidebar) return;

        sidebar.innerHTML = `
            <div class="sidebar__sections">
                <div class="sidebar__section-title">Analysis</div>
                <a href="#score-trinity" class="sidebar__nav-item active" data-section="scores">
                    <svg class="sidebar__nav-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                        <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100-4h2a1 1 0 100-2 2 2 0 00-2 2v11a2 2 0 002 2h4a2 2 0 002-2V5a2 2 0 00-2-2H6z" clip-rule="evenodd"/>
                    </svg>
                    Score Trinity
                </a>
                <a href="#company-analysis" class="sidebar__nav-item" data-section="analysis">
                    <svg class="sidebar__nav-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                    </svg>
                    Company Analysis
                </a>
                <a href="#financial-metrics" class="sidebar__nav-item" data-section="metrics">
                    <svg class="sidebar__nav-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                    </svg>
                    Key Metrics
                </a>
                <a href="#detailed-tables" class="sidebar__nav-item" data-section="tables">
                    <svg class="sidebar__nav-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clip-rule="evenodd"/>
                    </svg>
                    Financial Tables
                </a>
            </div>
            
            <div class="sidebar__recent">
                <div class="sidebar__section-title">Recent Companies</div>
                ${this.renderRecentCompanies()}
            </div>
        `;

        // Add navigation functionality
        const navItems = sidebar.querySelectorAll('.sidebar__nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('href').substring(1);
                this.scrollToSection(section);
                
                // Update active state
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    static renderRecentCompanies() {
        const recent = state.recentCompanies.slice(0, 5);
        
        if (recent.length === 0) {
            return '<div class="text-muted text-sm p-3">No recent companies</div>';
        }
        
        return recent.map(company => `
            <a href="?ticker=${company.ticker}" class="sidebar__recent-item">
                <span class="sidebar__recent-ticker">${company.ticker}</span>
                <span>${company.name}</span>
            </a>
        `).join('');
    }

    static renderScoreTrinity(data) {
        const section = document.getElementById('score-trinity');
        if (!section) return;

        const qualityBreakdown = ScoreCalculator.getQualityBreakdown(data);
        const idqBreakdown = ScoreCalculator.getIDQBreakdown(data);
        const antiFragileBreakdown = ScoreCalculator.getAntiFragileBreakdown(data);
        
        const qualityPercentage = (qualityBreakdown.total / 109) * 100;
        const idqPercentage = ((idqBreakdown.score + 3) / 15) * 100;
        const antiFragilePercentage = ((antiFragileBreakdown.score + 7) / 24) * 100;
        
        const qualityColors = Utils.getScoreColor(qualityPercentage);
        const idqColors = Utils.getScoreColor(idqPercentage);
        const antiFragileColors = Utils.getScoreColor(antiFragilePercentage);
        
        section.innerHTML = `
            <!-- Quality Score Card -->
            <div class="score-card score-card--quality ${qualityColors.class}" 
                 data-score-type="quality">
                <div class="score-card__header">
                    <h3 class="score-card__title">Enterprise Quality Score</h3>
                    <button class="score-card__expand-btn" aria-label="Expand details">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
                
                <div class="score-card__value-container">
                    <div class="score-card__value">${qualityBreakdown.total}</div>
                    <span class="score-card__max">/ 109</span>
                </div>
                
                <div class="score-card__metrics">
                    <div class="score-card__metric">
                        <span class="score-card__metric-label">Financials</span>
                        <span class="score-card__metric-value">${qualityBreakdown.financials}/30</span>
                    </div>
                    <div class="score-card__metric">
                        <span class="score-card__metric-label">Moat</span>
                        <span class="score-card__metric-value">${qualityBreakdown.moat}/30</span>
                    </div>
                    <div class="score-card__metric">
                        <span class="score-card__metric-label">Potential</span>
                        <span class="score-card__metric-value">${qualityBreakdown.potential}/29</span>
                    </div>
                    <div class="score-card__metric">
                        <span class="score-card__metric-label">Culture</span>
                        <span class="score-card__metric-value">${qualityBreakdown.culture}/30</span>
                    </div>
                    <div class="score-card__metric">
                        <span class="score-card__metric-label">Gauntlet</span>
                        <span class="score-card__metric-value">-${Math.abs(qualityBreakdown.gauntlet)}/10</span>
                    </div>
                </div>
                
                <div class="score-card__details">
                    <!-- Detailed breakdown will be added here when expanded -->
                </div>
            </div>
            
            <!-- IDQ Score Card -->
            <div class="score-card score-card--idq ${idqColors.class}" 
                 data-score-type="idq">
                <div class="score-card__header">
                    <h3 class="score-card__title">Innovation & Disruption Quotient</h3>
                    <button class="score-card__expand-btn" aria-label="Expand details">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
                
                <div class="score-card__value-container">
                    <div class="score-card__value">${idqBreakdown.score}</div>
                    <span class="score-card__max">/ 12</span>
                </div>
                
                <div class="score-card__metrics">
                    <div class="score-card__metric">
                        <span class="score-card__metric-label">Market Creation</span>
                        <span class="score-card__metric-value">${idqBreakdown.facets.market}</span>
                    </div>
                    <div class="score-card__metric">
                        <span class="score-card__metric-label">Disruption</span>
                        <span class="score-card__metric-value">${idqBreakdown.facets.disruption}</span>
                    </div>
                    <div class="score-card__metric">
                        <span class="score-card__metric-label">Innovation</span>
                        <span class="score-card__metric-value">${idqBreakdown.facets.innovation}</span>
                    </div>
                </div>
                
                <div class="score-card__details">
                    <!-- Detailed breakdown will be added here when expanded -->
                </div>
            </div>
            
            <!-- Anti-Fragile Score Card -->
            <div class="score-card score-card--antifragile ${antiFragileColors.class}" 
                 data-score-type="antifragile">
                <div class="score-card__header">
                    <h3 class="score-card__title">Anti-Fragile Score</h3>
                    <button class="score-card__expand-btn" aria-label="Expand details">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
                
                <div class="score-card__value-container">
                    <div class="score-card__value">${antiFragileBreakdown.score}</div>
                    <span class="score-card__max">/ 17</span>
                </div>
                
                <div class="score-card__metrics">
                    <div class="score-card__metric">
                        <span class="score-card__metric-label">Strategic Core</span>
                        <span class="score-card__metric-value">${antiFragileBreakdown.components.strategicCore}/6</span>
                    </div>
                    <div class="score-card__metric">
                        <span class="score-card__metric-label">Financial Fortitude</span>
                        <span class="score-card__metric-value">${antiFragileBreakdown.components.financialFortitude}/8</span>
                    </div>
                    <div class="score-card__metric">
                        <span class="score-card__metric-label">Skin in the Game</span>
                        <span class="score-card__metric-value">${antiFragileBreakdown.components.skinInTheGame}/10</span>
                    </div>
                </div>
                
                <div class="score-card__details">
                    <!-- Detailed breakdown will be added here when expanded -->
                </div>
            </div>
        `;
        
        // Add expand functionality
        const scoreCards = section.querySelectorAll('.score-card');
        scoreCards.forEach(card => {
            const expandBtn = card.querySelector('.score-card__expand-btn');
            expandBtn.addEventListener('click', () => {
                this.toggleScoreExpansion(card);
            });
            
            // Add click handler for showing details in summary panel
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.score-card__expand-btn')) {
                    const scoreType = card.dataset.scoreType;
                    this.showScoreDetails(scoreType, data);
                }
            });
        });
    }

    static toggleScoreExpansion(card) {
        card.classList.toggle('expanded');
        const expandBtn = card.querySelector('.score-card__expand-btn');
        expandBtn.style.transform = card.classList.contains('expanded') ? 'rotate(180deg)' : '';
    }

    static showScoreDetails(scoreType, data) {
        const panel = document.getElementById('shared-summary-panel');
        if (!panel) return;
        
        // Implementation would show detailed breakdown in the summary panel
        // This is a simplified version
        panel.classList.add('show');
        panel.innerHTML = `
            <div class="summary-panel__content">
                <div class="summary-panel__header">
                    <h2 class="summary-panel__title">${scoreType.toUpperCase()} Score Details</h2>
                    <button class="summary-panel__close" onclick="this.closest('.summary-panel').classList.remove('show')">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
                <div class="summary-panel__metrics">
                    <!-- Detailed metrics would go here -->
                    <p>Detailed breakdown and analysis for ${scoreType} score...</p>
                </div>
            </div>
        `;
    }

    static scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const offset = Utils.isMobile() ? 60 : 100;
            const top = section.offsetTop - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    }

    static async handleGlobalSearch(query) {
        if (query.length < 2) return;
        
        // This would implement search functionality
        console.log('Searching for:', query);
    }
}

// ============================================
// THEME MANAGER
// ============================================

class ThemeManager {
    static init() {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;
        
        // Set initial theme
        this.applyTheme(state.theme);
        
        // Add toggle listener
        themeToggle.addEventListener('click', () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', state.theme);
            this.applyTheme(state.theme);
        });
    }
    
    static applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.classList.toggle('light-theme', theme === 'light');
        
        // Update toggle icon
        const darkIcon = document.querySelector('.theme-icon--dark');
        const lightIcon = document.querySelector('.theme-icon--light');
        
        if (theme === 'dark') {
            darkIcon?.classList.remove('hidden');
            lightIcon?.classList.add('hidden');
        } else {
            darkIcon?.classList.add('hidden');
            lightIcon?.classList.remove('hidden');
        }
    }
}

// ============================================
// APPLICATION INITIALIZATION
// ============================================

class CompanyCardApp {
    constructor() {
        this.firebaseService = new FirebaseService();
        this.renderer = ComponentRenderer;
    }
    
    async init() {
        try {
            console.log('CompanyCardApp: Initializing...');
            
            // Show loading state
            this.showLoading(true);
            
            // Get ticker from URL
            const params = new URLSearchParams(window.location.search);
            const ticker = params.get('ticker');
            console.log('CompanyCardApp: Ticker from URL:', ticker);
            
            if (!ticker) {
                console.error('CompanyCardApp: No ticker provided, redirecting to home');
                window.location.href = './index.html';
                return;
            }
            
            state.currentTicker = ticker;
            
            // Fetch stock data
            console.log('CompanyCardApp: Fetching data for ticker:', ticker);
            const data = await this.firebaseService.getStockData(ticker);
            console.log('CompanyCardApp: Data received:', data);
            state.currentStockData = data;
            
            // Update recent companies
            this.updateRecentCompanies(data);
            
            // Render all components
            console.log('CompanyCardApp: Rendering components...');
            this.renderer.renderUniversalHeader();
            this.renderer.renderHeroHeader(data);
            this.renderer.renderSidebar(data);
            this.renderer.renderScoreTrinity(data);
            
            // Render additional sections
            const sections = new CompanySections(data);
            sections.renderCompanyAnalysis();
            sections.renderFinancialMetrics();
            sections.renderDetailedTables();
            
            // Initialize theme
            ThemeManager.init();
            
            // Hide loading state
            this.showLoading(false);
            
            // Mark app as loaded
            document.getElementById('app').classList.add('loaded');
            
            // Start live price updates
            this.startLivePriceUpdates();
            
        } catch (error) {
            console.error('CompanyCardApp: Failed to initialize:', error);
            console.error('Stack trace:', error.stack);
            this.showError(error.message || 'An unexpected error occurred');
        }
    }
    
    updateRecentCompanies(data) {
        const company = {
            ticker: data.Portfolio.ticker,
            name: data.Portfolio.companyName,
            website: data.API_Financials?.General?.companyWebsite
        };
        
        // Remove if exists, add to beginning, keep max 5
        state.recentCompanies = state.recentCompanies.filter(c => c.ticker !== company.ticker);
        state.recentCompanies.unshift(company);
        state.recentCompanies = state.recentCompanies.slice(0, 5);
        
        localStorage.setItem('recentCompanies', JSON.stringify(state.recentCompanies));
    }
    
    async startLivePriceUpdates() {
        // Update price every 30 seconds
        setInterval(async () => {
            try {
                const livePrice = await this.firebaseService.getLivePrice(state.currentTicker);
                if (livePrice) {
                    this.updateLivePrice(livePrice);
                }
            } catch (error) {
                console.error('Failed to update live price:', error);
            }
        }, 30000);
    }
    
    updateLivePrice(price) {
        const priceElement = document.querySelector('.hero-header__price');
        if (priceElement) {
            const currency = state.currentStockData.Portfolio.stockpricecurrency || 'USD';
            priceElement.textContent = Utils.formatCurrency(price, 2, currency);
            
            // Add pulse animation
            priceElement.classList.add('animate-pulse');
            setTimeout(() => priceElement.classList.remove('animate-pulse'), 2000);
        }
    }
    
    showLoading(show) {
        const loadingEl = document.getElementById('app-loading');
        if (loadingEl) {
            if (show) {
                loadingEl.classList.remove('fade-out');
            } else {
                loadingEl.classList.add('fade-out');
                setTimeout(() => loadingEl.style.display = 'none', 300);
            }
        }
    }
    
    showError(message) {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div class="error-container" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    padding: var(--space-6);
                    text-align: center;
                ">
                    <h2 style="color: var(--color-score-red); margin-bottom: var(--space-4);">
                        Error Loading Company Data
                    </h2>
                    <p style="color: var(--color-text-secondary); margin-bottom: var(--space-6);">
                        ${message}
                    </p>
                    <a href="/" style="
                        padding: var(--space-3) var(--space-6);
                        background: var(--color-score-purple);
                        color: white;
                        border-radius: var(--radius-lg);
                        text-decoration: none;
                    ">
                        Return to Dashboard
                    </a>
                </div>
            `;
        }
    }
}

// ============================================
// START APPLICATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const app = new CompanyCardApp();
    app.init();
});

// Export for debugging
window.CompanyCardApp = {
    state,
    Utils,
    ScoreCalculator,
    FirebaseService
};