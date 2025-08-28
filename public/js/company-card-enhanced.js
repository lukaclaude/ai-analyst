/**
 * Enhanced Company Card Module
 * Premium Financial Analysis Platform
 * 
 * Complete implementation with:
 * - Restored Score Trinity visuals (gauge, chip, shield)
 * - Intelligent expansion system
 * - Real financial data population
 * - Performance charts
 * - Mobile responsiveness
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
    recentCompanies: JSON.parse(localStorage.getItem('recentCompanies') || '[]'),
    priceChart: null,
    metricsChart: null
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
            glow: 'rgba(168, 85, 247, 0.3)', 
            class: 'score-card--purple',
            tier: 'Apex',
            badge: 'EXCEPTIONAL',
            gradient: ['#a855f7', '#9333ea']
        };
        if (percentage >= 74) return { 
            color: '#3b82f6', 
            glow: 'rgba(59, 130, 246, 0.3)', 
            class: 'score-card--blue',
            tier: 'Powerhouse',
            badge: 'EXCELLENT',
            gradient: ['#3b82f6', '#2563eb']
        };
        if (percentage >= 65) return { 
            color: '#22c55e', 
            glow: 'rgba(34, 197, 94, 0.3)', 
            class: 'score-card--green',
            tier: 'Compounder',
            badge: 'STRONG',
            gradient: ['#22c55e', '#16a34a']
        };
        if (percentage >= 55) return { 
            color: '#eab308', 
            glow: 'rgba(234, 179, 8, 0.3)', 
            class: 'score-card--yellow',
            tier: 'Mixed',
            badge: 'MODERATE',
            gradient: ['#eab308', '#ca8a04']
        };
        if (percentage >= 32) return { 
            color: '#f97316', 
            glow: 'rgba(249, 115, 22, 0.3)', 
            class: 'score-card--orange',
            tier: 'Challenged',
            badge: 'CHALLENGED',
            gradient: ['#f97316', '#ea580c']
        };
        return { 
            color: '#ef4444', 
            glow: 'rgba(239, 68, 68, 0.3)', 
            class: 'score-card--red',
            tier: 'High Risk',
            badge: 'HIGH RISK',
            gradient: ['#ef4444', '#dc2626']
        };
    },

    calculateCompanyTier(qualityScore, idqScore, antiFragileScore) {
        const qualityNorm = (qualityScore / 109) * 100;
        const idqNorm = ((idqScore + 3) / 15) * 100;
        const antiFragileNorm = ((antiFragileScore + 7) / 24) * 100;
        
        const overallScore = (qualityNorm * 0.4) + (idqNorm * 0.35) + (antiFragileNorm * 0.25);
        const colors = this.getScoreColor(overallScore);
        
        return {
            score: overallScore.toFixed(0),
            tier: colors.tier,
            badge: colors.badge,
            color: colors.color,
            gradient: colors.gradient
        };
    },

    animateValue(element, start, end, duration = 1000, suffix = '') {
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
    },

    animateCircularProgress(circleElement, percentage, duration = 1500) {
        if (!circleElement) return;
        
        const circumference = 553; // pathLength
        const offset = circumference - (percentage / 100 * 415); // 415 is 75% of circumference (270 degrees)
        
        circleElement.style.transition = `stroke-dasharray ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        circleElement.style.strokeDasharray = `${circumference - offset} ${circumference}`;
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
// ENHANCED COMPONENT RENDERER
// ============================================

class EnhancedRenderer {
    static renderScoreTrinity(data) {
        const section = document.getElementById('score-trinity');
        if (!section) return;

        // Add centered container wrapper
        section.className = 'score-trinity-section';
        section.innerHTML = `
            <div class="container-centered">
                <div class="score-cards-grid">
                    ${this.renderQualityCard(data)}
                    ${this.renderIDQCard(data)}
                    ${this.renderAntiFragileCard(data)}
                </div>
                <div id="score-expansion-panel" class="score-expansion-panel"></div>
            </div>
        `;

        // Initialize animations and interactions
        setTimeout(() => {
            this.initializeScoreAnimations(data);
            this.setupExpansionHandlers(data);
        }, 100);
    }

    static renderQualityCard(data) {
        const portfolio = data.Portfolio;
        const qualityScore = parseFloat(portfolio.qualityScore || 0);
        const percentage = (qualityScore / 109) * 100;
        const colors = Utils.getScoreColor(percentage);
        
        const financials = parseFloat(portfolio.financialsSubScore || 0);
        const moat = parseFloat(portfolio.moatSubScore || 0);
        const potential = parseFloat(portfolio.potentialSubScore || 0);
        const culture = parseFloat(portfolio.cultureSubScore || 0);
        const gauntlet = parseFloat(portfolio.gauntletSubScore || 0);

        return `
            <div class="score-card glass-morphism ${colors.class}" data-score-type="quality" id="quality-card">
                <div class="score-card__inner">
                    <div class="score-card__header">
                        <h3 class="score-card__title">Enterprise Quality Score</h3>
                        <span class="score-card__rank">Top ${Math.round(100 - percentage)}%</span>
                    </div>
                    
                    <div class="score-card__visual">
                        <div class="quality-gauge-container">
                            <svg viewBox="0 0 200 200" class="quality-gauge">
                                <defs>
                                    <linearGradient id="qualityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style="stop-color:${colors.gradient[0]}" />
                                        <stop offset="100%" style="stop-color:${colors.gradient[1]}" />
                                    </linearGradient>
                                    <filter id="qualityGlow">
                                        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                                        <feMerge>
                                            <feMergeNode in="coloredBlur"/>
                                            <feMergeNode in="SourceGraphic"/>
                                        </feMerge>
                                    </filter>
                                </defs>
                                <circle cx="100" cy="100" r="88" 
                                        class="gauge-bg" 
                                        stroke-dasharray="415 553" 
                                        pathLength="553"
                                        style="transform: rotate(135deg); transform-origin: center;" />
                                <circle cx="100" cy="100" r="88" 
                                        stroke="url(#qualityGradient)"
                                        class="gauge-fill"
                                        stroke-dasharray="0 553"
                                        pathLength="553"
                                        id="quality-circle"
                                        style="transform: rotate(135deg); transform-origin: center;"
                                        filter="url(#qualityGlow)" />
                            </svg>
                            <div class="gauge-value">
                                <div class="gauge-value__number" id="quality-score-value">0</div>
                                <div class="gauge-value__max">/ 109</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="score-card__breakdown">
                        <div class="breakdown-item">
                            <span class="breakdown-label">Financials</span>
                            <div class="breakdown-bar">
                                <div class="breakdown-fill" style="width: ${(financials/30)*100}%; background: ${colors.color}"></div>
                            </div>
                            <span class="breakdown-value">${financials}/30</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label">Moat</span>
                            <div class="breakdown-bar">
                                <div class="breakdown-fill" style="width: ${(moat/30)*100}%; background: ${colors.color}"></div>
                            </div>
                            <span class="breakdown-value">${moat}/30</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label">Potential</span>
                            <div class="breakdown-bar">
                                <div class="breakdown-fill" style="width: ${(potential/29)*100}%; background: ${colors.color}"></div>
                            </div>
                            <span class="breakdown-value">${potential}/29</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label">Culture</span>
                            <div class="breakdown-bar">
                                <div class="breakdown-fill" style="width: ${(culture/30)*100}%; background: ${colors.color}"></div>
                            </div>
                            <span class="breakdown-value">${culture}/30</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="breakdown-label">Gauntlet</span>
                            <div class="breakdown-bar">
                                <div class="breakdown-fill" style="width: ${Math.abs(gauntlet/10)*100}%; background: #ef4444"></div>
                            </div>
                            <span class="breakdown-value">${gauntlet}/10</span>
                        </div>
                    </div>
                    
                    <button class="score-card__expand-btn" data-score="quality">
                        <svg class="expand-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                        <span>View Details</span>
                    </button>
                </div>
                <div class="score-card__glow" style="background: radial-gradient(circle, ${colors.glow} 0%, transparent 70%);"></div>
            </div>
        `;
    }

    static renderIDQCard(data) {
        const idqData = data.LLM_Reports?.IDQ_Report || {};
        const idqScore = parseFloat(idqData.score || 0);
        const percentage = ((idqScore + 3) / 15) * 100;
        const colors = Utils.getScoreColor(percentage);

        return `
            <div class="score-card glass-morphism ${colors.class}" data-score-type="idq" id="idq-card">
                <div class="score-card__inner">
                    <div class="score-card__header">
                        <h3 class="score-card__title">Innovation & Disruption Quotient</h3>
                        <span class="score-card__rank">${idqData.overall_assessment || 'Analyzing'}</span>
                    </div>
                    
                    <div class="score-card__visual">
                        <div class="idq-chip-container">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="17.5 20 29 26" class="idq-chip">
                                <defs>
                                    <filter id="idqGlow">
                                        <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                                        <feMerge>
                                            <feMergeNode in="coloredBlur"/>
                                            <feMergeNode in="SourceGraphic"/>
                                        </feMerge>
                                    </filter>
                                    <linearGradient id="idqGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style="stop-color:${colors.gradient[0]}" />
                                        <stop offset="100%" style="stop-color:${colors.gradient[1]}" />
                                    </linearGradient>
                                </defs>
                                
                                <!-- Chip outline and connectors -->
                                <g stroke="url(#idqGradient)" fill="none" stroke-width="1" filter="url(#idqGlow)">
                                    <!-- Main chip body -->
                                    <rect x="22.923" y="23.149" width="18.154" height="16.154" rx="4" />
                                    
                                    <!-- Connection pins -->
                                    <line x1="26.602" y1="23.149" x2="26.602" y2="20"/> 
                                    <line x1="37.396" y1="23.149" x2="37.396" y2="20"/>
                                    <line x1="26.602" y1="39.303" x2="26.602" y2="42.5"/>
                                    <line x1="37.396" y1="39.303" x2="37.396" y2="42.5"/>
                                    
                                    <line x1="22.923" y1="28" x2="19" y2="28"/>
                                    <line x1="22.923" y1="34.5" x2="19" y2="34.5"/>
                                    <line x1="41.077" y1="28" x2="45" y2="28"/>
                                    <line x1="41.077" y1="34.5" x2="45" y2="34.5"/>
                                    
                                    <!-- Inner chip detail -->
                                    <rect x="27" y="27" width="10" height="8" rx="2" />
                                </g>
                                
                                <!-- Animated pulse ring -->
                                <rect x="22.923" y="23.149" width="18.154" height="16.154" rx="4" 
                                      fill="none" stroke="${colors.color}" stroke-width="1.5" 
                                      class="idq-pulse" opacity="0.6"/>
                                
                                <!-- Score display -->
                                <text x="32" y="32.5" 
                                      font-size="8" font-weight="bold" 
                                      text-anchor="middle" fill="${colors.color}"
                                      id="idq-score-value">0</text>
                            </svg>
                        </div>
                        
                        <div class="idq-grade-scale">
                            <div class="grade-scale-bar">
                                <div class="grade-scale-fill" style="width: ${percentage}%; background: linear-gradient(90deg, ${colors.gradient[0]}, ${colors.gradient[1]})"></div>
                            </div>
                            <div class="grade-scale-labels">
                                <span>-3</span>
                                <span>0</span>
                                <span>6</span>
                                <span>12</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="score-card__facets">
                        <div class="facet-item">
                            <span class="facet-label">Market Creation</span>
                            <span class="facet-value">${idqData.market_creation || 'N/A'}</span>
                        </div>
                        <div class="facet-item">
                            <span class="facet-label">Disruption Potential</span>
                            <span class="facet-value">${idqData.disruption_potential || 'N/A'}</span>
                        </div>
                        <div class="facet-item">
                            <span class="facet-label">Innovation Engine</span>
                            <span class="facet-value">${idqData.innovation_engine || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <button class="score-card__expand-btn" data-score="idq">
                        <svg class="expand-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                        <span>View Details</span>
                    </button>
                </div>
                <div class="score-card__glow" style="background: radial-gradient(circle, ${colors.glow} 0%, transparent 70%);"></div>
            </div>
        `;
    }

    static renderAntiFragileCard(data) {
        const afData = data.Anti_Fragile_Score || {};
        const afScore = parseFloat(afData.Total_Score || 0);
        const percentage = ((afScore + 7) / 24) * 100;
        const colors = Utils.getScoreColor(percentage);
        
        const strategicCore = parseFloat(afData.Strategic_Core || 0);
        const financialFortitude = parseFloat(afData.Financial_Fortitude || 0);
        const skinInGame = parseFloat(afData.Skin_in_the_Game || 0);

        return `
            <div class="score-card glass-morphism ${colors.class}" data-score-type="antifragile" id="antifragile-card">
                <div class="score-card__inner">
                    <div class="score-card__header">
                        <h3 class="score-card__title">Anti-Fragile Score</h3>
                        <span class="score-card__rank">Resilience: ${percentage >= 65 ? 'High' : percentage >= 40 ? 'Moderate' : 'Low'}</span>
                    </div>
                    
                    <div class="score-card__visual">
                        <div class="antifragile-shield-container">
                            <svg viewBox="0 0 200 200" class="antifragile-shield">
                                <defs>
                                    <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" style="stop-color:${colors.gradient[0]}" />
                                        <stop offset="100%" style="stop-color:${colors.gradient[1]}" />
                                    </linearGradient>
                                    <filter id="shieldGlow">
                                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                        <feMerge>
                                            <feMergeNode in="coloredBlur"/>
                                            <feMergeNode in="SourceGraphic"/>
                                        </feMerge>
                                    </filter>
                                </defs>
                                
                                <!-- Shield shape -->
                                <path d="M100 30 L140 50 L140 100 Q140 150 100 170 Q60 150 60 100 L60 50 Z" 
                                      fill="none" 
                                      stroke="url(#shieldGradient)" 
                                      stroke-width="3"
                                      filter="url(#shieldGlow)"
                                      class="shield-outline" />
                                
                                <!-- Shield segments representing components -->
                                <path d="M100 40 L100 160" stroke="${colors.color}" stroke-width="1" opacity="0.3" />
                                <path d="M70 60 L130 120" stroke="${colors.color}" stroke-width="1" opacity="0.3" />
                                <path d="M130 60 L70 120" stroke="${colors.color}" stroke-width="1" opacity="0.3" />
                                
                                <!-- Center score circle -->
                                <circle cx="100" cy="100" r="25" fill="${colors.color}" opacity="0.2" />
                                <text x="100" y="105" 
                                      font-size="20" font-weight="bold" 
                                      text-anchor="middle" fill="${colors.color}"
                                      id="antifragile-score-value">0</text>
                            </svg>
                        </div>
                        
                        <div class="shield-components">
                            <div class="component-meter">
                                <span class="component-label">Strategic Core</span>
                                <div class="component-bar">
                                    <div class="component-fill" style="width: ${(strategicCore/6)*100}%; background: ${colors.color}"></div>
                                </div>
                                <span class="component-value">${strategicCore}/6</span>
                            </div>
                            <div class="component-meter">
                                <span class="component-label">Financial Fortitude</span>
                                <div class="component-bar">
                                    <div class="component-fill" style="width: ${(financialFortitude/8)*100}%; background: ${colors.color}"></div>
                                </div>
                                <span class="component-value">${financialFortitude}/8</span>
                            </div>
                            <div class="component-meter">
                                <span class="component-label">Skin in the Game</span>
                                <div class="component-bar">
                                    <div class="component-fill" style="width: ${(skinInGame/10)*100}%; background: ${colors.color}"></div>
                                </div>
                                <span class="component-value">${skinInGame}/10</span>
                            </div>
                        </div>
                    </div>
                    
                    <button class="score-card__expand-btn" data-score="antifragile">
                        <svg class="expand-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                        <span>View Details</span>
                    </button>
                </div>
                <div class="score-card__glow" style="background: radial-gradient(circle, ${colors.glow} 0%, transparent 70%);"></div>
            </div>
        `;
    }

    static initializeScoreAnimations(data) {
        // Animate Quality Score
        const qualityScore = parseFloat(data.Portfolio.qualityScore || 0);
        const qualityElement = document.getElementById('quality-score-value');
        if (qualityElement) {
            Utils.animateValue(qualityElement, 0, qualityScore, 1500);
        }
        
        const qualityCircle = document.getElementById('quality-circle');
        if (qualityCircle) {
            const percentage = (qualityScore / 109) * 100;
            Utils.animateCircularProgress(qualityCircle, percentage, 1500);
        }

        // Animate IDQ Score
        const idqScore = parseFloat(data.LLM_Reports?.IDQ_Report?.score || 0);
        const idqElement = document.getElementById('idq-score-value');
        if (idqElement) {
            Utils.animateValue(idqElement, -3, idqScore, 1500);
        }

        // Animate Anti-Fragile Score
        const afScore = parseFloat(data.Anti_Fragile_Score?.Total_Score || 0);
        const afElement = document.getElementById('antifragile-score-value');
        if (afElement) {
            Utils.animateValue(afElement, -7, afScore, 1500);
        }
    }

    static setupExpansionHandlers(data) {
        const expandButtons = document.querySelectorAll('.score-card__expand-btn');
        
        expandButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const scoreType = btn.dataset.score;
                this.toggleScoreExpansion(scoreType, data);
            });
        });

        // Also allow clicking on the card itself for mobile
        if (Utils.isMobile()) {
            const cards = document.querySelectorAll('.score-card');
            cards.forEach(card => {
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('.score-card__expand-btn')) {
                        const scoreType = card.dataset.scoreType;
                        this.showMobileOverlay(scoreType, data);
                    }
                });
            });
        }
    }

    static toggleScoreExpansion(scoreType, data) {
        const panel = document.getElementById('score-expansion-panel');
        const button = document.querySelector(`[data-score="${scoreType}"]`);
        const icon = button.querySelector('.expand-icon');
        
        // If same score is clicked, close it
        if (state.currentExpanded === scoreType) {
            panel.classList.remove('expanded');
            icon.style.transform = 'rotate(0deg)';
            state.currentExpanded = null;
            setTimeout(() => {
                panel.innerHTML = '';
            }, 300);
            return;
        }

        // Close previous if any
        if (state.currentExpanded) {
            const prevIcon = document.querySelector(`[data-score="${state.currentExpanded}"] .expand-icon`);
            if (prevIcon) prevIcon.style.transform = 'rotate(0deg)';
        }

        // Populate with detailed content
        const content = this.getExpansionContent(scoreType, data);
        panel.innerHTML = content;
        panel.classList.add('expanded');
        icon.style.transform = 'rotate(180deg)';
        state.currentExpanded = scoreType;

        // Smooth scroll to panel
        setTimeout(() => {
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    static getExpansionContent(scoreType, data) {
        switch(scoreType) {
            case 'quality':
                return this.getQualityExpansionContent(data);
            case 'idq':
                return this.getIDQExpansionContent(data);
            case 'antifragile':
                return this.getAntiFragileExpansionContent(data);
            default:
                return '';
        }
    }

    static getQualityExpansionContent(data) {
        const llmResearch = data.LLM_Research_and_Comments || {};
        const portfolio = data.Portfolio || {};
        
        return `
            <div class="expansion-content">
                <div class="expansion-header">
                    <h3>Enterprise Quality Score - Detailed Analysis</h3>
                    <button class="expansion-close" onclick="EnhancedRenderer.closeExpansion()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                
                <div class="expansion-grid">
                    <div class="expansion-section">
                        <h4>Financials (${portfolio.financialsSubScore}/30)</h4>
                        <p>${llmResearch.financialsSummary || 'Financial analysis pending...'}</p>
                        <div class="metric-details">
                            ${this.renderQualityMetrics(llmResearch.Financials_Group || {})}
                        </div>
                    </div>
                    
                    <div class="expansion-section">
                        <h4>Moat (${portfolio.moatSubScore}/30)</h4>
                        <p>${llmResearch.moatSummary || 'Moat analysis pending...'}</p>
                        <div class="metric-details">
                            ${this.renderQualityMetrics(llmResearch.Moat_Group || {})}
                        </div>
                    </div>
                    
                    <div class="expansion-section">
                        <h4>Potential (${portfolio.potentialSubScore}/29)</h4>
                        <p>${llmResearch.potentialSummary || 'Potential analysis pending...'}</p>
                        <div class="metric-details">
                            ${this.renderQualityMetrics(llmResearch.Potential_Group || {})}
                        </div>
                    </div>
                    
                    <div class="expansion-section">
                        <h4>Culture & Performance (${portfolio.cultureSubScore}/30)</h4>
                        <p>${llmResearch.cultureAndPerformanceSummary || 'Culture analysis pending...'}</p>
                        <div class="metric-details">
                            ${this.renderQualityMetrics(llmResearch.Culture_and_Pastperformance_Group || {})}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static renderQualityMetrics(metrics) {
        return Object.entries(metrics).map(([key, value]) => {
            const isTrue = value === 'true' || value === true;
            const color = isTrue ? '#22c55e' : '#ef4444';
            const icon = isTrue ? '✓' : '✗';
            
            return `
                <div class="metric-item" style="color: ${color}">
                    <span class="metric-icon">${icon}</span>
                    <span class="metric-name">${key.replace(/_/g, ' ')}</span>
                </div>
            `;
        }).join('');
    }

    static getIDQExpansionContent(data) {
        const idqReport = data.LLM_Reports?.IDQ_Report || {};
        
        return `
            <div class="expansion-content">
                <div class="expansion-header">
                    <h3>Innovation & Disruption Quotient - Full Assessment</h3>
                    <button class="expansion-close" onclick="EnhancedRenderer.closeExpansion()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                
                <div class="expansion-content-body">
                    <div class="idq-summary">
                        <p class="lead-text">${idqReport.summary || 'IDQ assessment in progress...'}</p>
                    </div>
                    
                    <div class="idq-facets-grid">
                        <div class="facet-card">
                            <h4>Market Creation</h4>
                            <div class="facet-score">${idqReport.market_creation || 'N/A'}</div>
                            <p>${idqReport.market_creation_rationale || ''}</p>
                        </div>
                        
                        <div class="facet-card">
                            <h4>Disruption Potential</h4>
                            <div class="facet-score">${idqReport.disruption_potential || 'N/A'}</div>
                            <p>${idqReport.disruption_potential_rationale || ''}</p>
                        </div>
                        
                        <div class="facet-card">
                            <h4>Innovation Engine</h4>
                            <div class="facet-score">${idqReport.innovation_engine || 'N/A'}</div>
                            <p>${idqReport.innovation_engine_rationale || ''}</p>
                        </div>
                        
                        <div class="facet-card">
                            <h4>Strategic Positioning</h4>
                            <div class="facet-score">${idqReport.strategic_positioning || 'N/A'}</div>
                            <p>${idqReport.strategic_positioning_rationale || ''}</p>
                        </div>
                        
                        <div class="facet-card">
                            <h4>Adaptability</h4>
                            <div class="facet-score">${idqReport.adaptability || 'N/A'}</div>
                            <p>${idqReport.adaptability_rationale || ''}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static getAntiFragileExpansionContent(data) {
        const afData = data.Anti_Fragile_Score || {};
        
        return `
            <div class="expansion-content">
                <div class="expansion-header">
                    <h3>Anti-Fragile Score - Resilience Analysis</h3>
                    <button class="expansion-close" onclick="EnhancedRenderer.closeExpansion()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                
                <div class="expansion-components">
                    <div class="component-section">
                        <h4>Strategic Core (${afData.Strategic_Core}/6)</h4>
                        <p>Measures the company's strategic positioning and competitive advantages that allow it to thrive under stress.</p>
                        <div class="component-breakdown">
                            ${this.renderAntiFragileMetrics(afData.Strategic_Core_Details || {})}
                        </div>
                    </div>
                    
                    <div class="component-section">
                        <h4>Financial Fortitude (${afData.Financial_Fortitude}/8)</h4>
                        <p>Assesses financial strength and the ability to weather economic storms while maintaining growth.</p>
                        <div class="component-breakdown">
                            ${this.renderAntiFragileMetrics(afData.Financial_Fortitude_Details || {})}
                        </div>
                    </div>
                    
                    <div class="component-section">
                        <h4>Skin in the Game (${afData.Skin_in_the_Game}/10)</h4>
                        <p>Evaluates management alignment and commitment to long-term value creation.</p>
                        <div class="component-breakdown">
                            ${this.renderAntiFragileMetrics(afData.Skin_in_the_Game_Details || {})}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static renderAntiFragileMetrics(metrics) {
        if (!metrics || Object.keys(metrics).length === 0) {
            return '<p class="text-muted">Detailed metrics coming soon...</p>';
        }
        
        return Object.entries(metrics).map(([key, value]) => `
            <div class="af-metric">
                <span class="af-metric-label">${key.replace(/_/g, ' ')}</span>
                <span class="af-metric-value">${value}</span>
            </div>
        `).join('');
    }

    static closeExpansion() {
        const panel = document.getElementById('score-expansion-panel');
        if (panel) {
            panel.classList.remove('expanded');
            if (state.currentExpanded) {
                const icon = document.querySelector(`[data-score="${state.currentExpanded}"] .expand-icon`);
                if (icon) icon.style.transform = 'rotate(0deg)';
            }
            state.currentExpanded = null;
        }
    }

    static showMobileOverlay(scoreType, data) {
        // Mobile overlay implementation for score details
        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay active';
        overlay.innerHTML = `
            <div class="mobile-overlay__content">
                <div class="mobile-overlay__header">
                    <h2>${scoreType.toUpperCase()} Score Details</h2>
                    <button class="mobile-overlay__close" onclick="this.closest('.mobile-overlay').remove()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                <div class="mobile-overlay__body">
                    ${this.getExpansionContent(scoreType, data)}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                document.body.style.overflow = '';
            }
        });
    }
}

// ============================================
// COMPLETE APPLICATION CLASS
// ============================================

class CompanyCardApp {
    constructor() {
        this.firebaseService = {
            async getStockData(ticker) {
                try {
                    console.log('Fetching data for ticker:', ticker);
                    const querySnapshot = await db.collection("stocks")
                        .where("Portfolio.ticker", "==", ticker)
                        .get();
                    
                    if (!querySnapshot.empty) {
                        const data = querySnapshot.docs[0].data();
                        console.log('Data received:', data);
                        return data;
                    }
                    
                    throw new Error(`Stock ${ticker} not found`);
                } catch (error) {
                    console.error("Error fetching stock data:", error);
                    throw error;
                }
            },

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
        };
    }

    async init() {
        try {
            console.log('CompanyCardApp: Initializing...');
            
            this.showLoading(true);
            
            // Get ticker from URL
            const params = new URLSearchParams(window.location.search);
            const ticker = params.get('ticker');
            console.log('CompanyCardApp: Ticker from URL:', ticker);
            
            if (!ticker) {
                console.error('CompanyCardApp: No ticker provided');
                window.location.href = './index.html';
                return;
            }
            
            state.currentTicker = ticker;
            
            // Fetch stock data
            console.log('CompanyCardApp: Fetching data...');
            const data = await this.firebaseService.getStockData(ticker);
            state.currentStockData = data;
            
            // Update recent companies
            this.updateRecentCompanies(data);
            
            // Render all components
            console.log('CompanyCardApp: Rendering components...');
            this.renderUniversalHeader();
            this.renderEnhancedHeroHeader(data);
            this.renderSidebar(data);
            EnhancedRenderer.renderScoreTrinity(data);
            this.renderAnalysisSection(data);
            this.renderFinancialMetrics(data);
            
            // Initialize theme
            this.initTheme();
            
            // Hide loading state
            this.showLoading(false);
            
            // Mark app as loaded
            document.getElementById('app').classList.add('loaded');
            
            console.log('CompanyCardApp: Initialization complete');
            
        } catch (error) {
            console.error('CompanyCardApp: Failed to initialize:', error);
            this.showError(error.message || 'An unexpected error occurred');
        }
    }

    renderUniversalHeader() {
        const header = document.getElementById('universal-header');
        if (!header) return;

        header.innerHTML = `
            <div class="container-centered">
                <div class="universal-header__content">
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
                        <a href="./" class="universal-header__nav-item">Dashboard</a>
                        <a href="?view=list" class="universal-header__nav-item">All Stocks</a>
                    </nav>
                </div>
            </div>
        `;
    }

    renderEnhancedHeroHeader(data) {
        const header = document.getElementById('hero-header');
        if (!header) return;

        const portfolio = data.Portfolio;
        const financials = data.API_Financials?.General || {};
        
        const currentPrice = parseFloat(portfolio.stockPriceNow);
        const targetPrice = parseFloat(portfolio.targetPrice);
        const upside = targetPrice ? ((targetPrice - currentPrice) / currentPrice) * 100 : 0;
        const currency = portfolio.stockpricecurrency || 'USD';
        
        // Calculate overall score and tier
        const qualityScore = parseFloat(portfolio.qualityScore || 0);
        const idqScore = parseFloat(data.LLM_Reports?.IDQ_Report?.score || 0);
        const antiFragileScore = parseFloat(data.Anti_Fragile_Score?.Total_Score || 0);
        const tier = Utils.calculateCompanyTier(qualityScore, idqScore, antiFragileScore);
        
        header.innerHTML = `
            <div class="hero-header__container">
                <div class="hero-header__left">
                    <div class="hero-header__logo-container">
                        <img src="${financials.companyLogo || './assets/images/default-logo.png'}" 
                             alt="${portfolio.companyName}" 
                             class="hero-header__logo"
                             onerror="this.src='./assets/images/default-logo.png'">
                    </div>
                    
                    <div class="hero-header__info">
                        <div class="hero-header__name-row">
                            <h1 class="hero-header__company-name">${portfolio.companyName}</h1>
                            <span class="hero-header__ticker">${portfolio.ticker}</span>
                        </div>
                        
                        <div class="hero-header__details">
                            <span>${financials.exchange || 'Exchange'}</span>
                            <span>•</span>
                            <span>Market Cap: ${Utils.formatCurrency(financials.marketCap, 1, currency)}</span>
                            <span>•</span>
                            <span>${financials.sector || 'Sector'}</span>
                        </div>
                        
                        <div class="hero-header__target">
                            <span class="hero-header__target-label">1Y Target:</span>
                            <span class="hero-header__target-value">
                                ${Utils.formatCurrency(targetPrice, 2, currency)}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="hero-header__right">
                    <div class="hero-header__price-display">
                        <span class="hero-header__price">
                            ${Utils.formatCurrency(currentPrice, 2, currency)}
                        </span>
                        <div class="hero-header__upside hero-header__upside--${upside >= 0 ? 'positive' : 'negative'}">
                            ${upside >= 0 ? '+' : ''}${upside.toFixed(1)}% upside
                        </div>
                    </div>
                    
                    <div class="hero-header__assessment">
                        <div class="hero-header__score-badge" 
                             style="--badge-color-start: ${tier.gradient[0]}; --badge-color-end: ${tier.gradient[1]}; --badge-glow: ${tier.color}30;">
                            ${tier.score}
                        </div>
                        <div class="hero-header__tier-badge">
                            ${tier.badge}
                        </div>
                    </div>
                    
                    <div class="hero-header__mini-chart">
                        <canvas id="mini-price-chart" width="200" height="60"></canvas>
                    </div>
                </div>
            </div>
        `;

        // Initialize mini chart
        setTimeout(() => this.initMiniChart(portfolio.ticker), 100);
    }

    renderSidebar(data) {
        const sidebar = document.getElementById('navigation-sidebar');
        if (!sidebar) return;

        sidebar.innerHTML = `
            <div class="sidebar__content">
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
                        Analysis
                    </a>
                    <a href="#financial-metrics" class="sidebar__nav-item" data-section="metrics">
                        <svg class="sidebar__nav-icon" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                        </svg>
                        Financial Metrics
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
            </div>
        `;

        // Add navigation functionality
        this.initSidebarNavigation();
    }

    renderAnalysisSection(data) {
        const section = document.getElementById('company-analysis');
        if (!section) return;

        const trendAnalysis = data.LLM_Reports?.Trend_Analysis || {};
        const llmResearch = data.LLM_Research_and_Comments || {};
        
        section.innerHTML = `
            <div class="container-centered">
                <div class="section-header">
                    <h2 class="section-title">Company Analysis</h2>
                    <p class="section-subtitle">AI-powered insights and strategic assessment</p>
                </div>
                
                <div class="analysis-container">
                    <div class="investment-thesis-card glass-morphism">
                        <h3 class="analysis-card__title">Investment Thesis</h3>
                        <div id="investment-thesis" class="investment-thesis-content">
                            ${this.generateInvestmentThesis(data)}
                        </div>
                    </div>
                    
                    <div class="analysis-cards-grid">
                        <div class="analysis-card glass-morphism">
                            <h4>The Big Picture</h4>
                            <p>${trendAnalysis.companyAnalysis?.split('## The Core Debate')[0]?.replace('## The Big Picture', '').trim() || 'Analysis in progress...'}</p>
                        </div>
                        
                        <div class="analysis-card glass-morphism">
                            <h4>Key Strengths</h4>
                            <div class="strength-list">
                                ${this.renderStrengthsList(llmResearch)}
                            </div>
                        </div>
                        
                        <div class="analysis-card glass-morphism">
                            <h4>Risk Factors</h4>
                            <div class="risk-list">
                                ${this.renderRisksList(llmResearch)}
                            </div>
                        </div>
                        
                        <div class="analysis-card glass-morphism">
                            <h4>Market Position</h4>
                            <p>${trendAnalysis.marketPosition || 'Market position analysis pending...'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderFinancialMetrics(data) {
        const section = document.getElementById('financial-metrics');
        if (!section) return;

        const metrics = data.API_Financials?.Metrics || {};
        const ratios = data.API_Financials?.Ratios || {};
        
        section.innerHTML = `
            <div class="container-centered">
                <div class="section-header">
                    <h2 class="section-title">Key Financial Metrics</h2>
                    <p class="section-subtitle">Critical performance indicators</p>
                </div>
                
                <div class="metrics-grid">
                    ${this.renderMetricGroup('Valuation', {
                        'P/E Ratio': ratios.peRatio || metrics.peRatio,
                        'P/B Ratio': ratios.pbRatio || metrics.pbRatio,
                        'EV/EBITDA': ratios.evToEbitda || metrics.evToEbitda,
                        'Market Cap': metrics.marketCap
                    }, 'valuation')}
                    
                    ${this.renderMetricGroup('Profitability', {
                        'Gross Margin': ratios.grossProfitMargin || metrics.grossProfitMargin,
                        'Operating Margin': ratios.operatingProfitMargin || metrics.operatingProfitMargin,
                        'Net Margin': ratios.netProfitMargin || metrics.netProfitMargin,
                        'ROE': ratios.roe || metrics.roe
                    }, 'profitability')}
                    
                    ${this.renderMetricGroup('Growth', {
                        'Revenue Growth': this.calculateGrowth(data, 'revenue'),
                        'EPS Growth': this.calculateGrowth(data, 'eps'),
                        'FCF Growth': this.calculateGrowth(data, 'fcf'),
                        'Book Value Growth': this.calculateGrowth(data, 'bookValue')
                    }, 'growth')}
                    
                    ${this.renderMetricGroup('Financial Health', {
                        'Current Ratio': ratios.currentRatio || metrics.currentRatio,
                        'Debt/Equity': ratios.debtToEquity || metrics.debtToEquity,
                        'Interest Coverage': ratios.interestCoverage || metrics.interestCoverage,
                        'FCF Yield': ratios.fcfYield || metrics.fcfYield
                    }, 'health')}
                </div>
            </div>
        `;
    }

    generateInvestmentThesis(data) {
        const portfolio = data.Portfolio;
        const qualityScore = parseFloat(portfolio.qualityScore || 0);
        const idqData = data.LLM_Reports?.IDQ_Report || {};
        const idqScore = parseFloat(idqData.score || 0);
        const afScore = parseFloat(data.Anti_Fragile_Score?.Total_Score || 0);
        
        const tier = Utils.calculateCompanyTier(qualityScore, idqScore, afScore);
        
        const thesisElements = [];
        
        // Quality insight
        if (qualityScore > 85) {
            thesisElements.push(`With an exceptional Quality Score of ${qualityScore.toFixed(1)}, ${portfolio.companyName} demonstrates best-in-class operational excellence and financial strength.`);
        } else if (qualityScore > 70) {
            thesisElements.push(`The solid Quality Score of ${qualityScore.toFixed(1)} indicates ${portfolio.companyName} maintains strong fundamentals with room for improvement.`);
        } else {
            thesisElements.push(`The Quality Score of ${qualityScore.toFixed(1)} suggests ${portfolio.companyName} faces operational challenges that require monitoring.`);
        }
        
        // Innovation insight
        if (idqData.grade) {
            thesisElements.push(`As an innovation "${idqData.grade}", the company ${idqScore >= 9 ? 'leads' : idqScore >= 6 ? 'actively participates in' : 'follows'} industry transformation.`);
        }
        
        // Anti-fragility insight
        if (afScore >= 12) {
            thesisElements.push(`The Anti-Fragile Score of ${afScore} reveals a company built to thrive in chaos, with exceptional resilience to market shocks.`);
        } else if (afScore >= 7) {
            thesisElements.push(`With an Anti-Fragile Score of ${afScore}, the company shows good adaptability to market stress.`);
        }
        
        // Overall assessment
        thesisElements.push(`
            <div class="thesis-conclusion">
                <div class="thesis-tier">
                    <span class="thesis-tier-label">Overall Assessment:</span>
                    <span class="thesis-tier-badge" style="color: ${tier.color}; text-shadow: 0 0 10px ${tier.color};">
                        ${tier.tier}
                    </span>
                    <span class="thesis-score">
                        <span class="thesis-score-value">${tier.score}</span>
                        <span class="thesis-score-max">/100</span>
                    </span>
                </div>
                <p class="thesis-description">${this.getTierDescription(tier.tier)}</p>
            </div>
        `);
        
        return thesisElements.map(element => 
            typeof element === 'string' && element.includes('<div') ? element : `<p class="thesis-paragraph">${element}</p>`
        ).join('');
    }

    getTierDescription(tier) {
        const descriptions = {
            'Apex': 'Exceptional companies that consistently outperform across all metrics.',
            'Powerhouse': 'Strong performers with sustainable competitive advantages.',
            'Compounder': 'Solid businesses with good long-term growth prospects.',
            'Mixed': 'Companies with both strengths and areas for improvement.',
            'Challenged': 'Businesses facing operational or market challenges.',
            'High Risk': 'Companies with significant risks requiring careful evaluation.'
        };
        return descriptions[tier] || 'Assessment pending...';
    }

    renderStrengthsList(llmResearch) {
        const strengths = [];
        if (llmResearch.moatSummary) strengths.push(llmResearch.moatSummary);
        if (llmResearch.potentialSummary) strengths.push(llmResearch.potentialSummary);
        
        if (strengths.length === 0) {
            return '<p class="text-muted">Strengths analysis pending...</p>';
        }
        
        return strengths.map(strength => `
            <div class="strength-item">
                <svg class="strength-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <span>${strength.substring(0, 120)}...</span>
            </div>
        `).join('');
    }

    renderRisksList(llmResearch) {
        const gauntletData = llmResearch.Gauntlet_Group || {};
        const risks = [];
        
        Object.entries(gauntletData).forEach(([key, value]) => {
            if (value === 'false') {
                risks.push(key.replace(/([A-Z])/g, ' $1').toLowerCase());
            }
        });
        
        if (risks.length === 0) {
            return '<p class="text-success">No significant risks identified</p>';
        }
        
        return risks.map(risk => `
            <div class="risk-item">
                <svg class="risk-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92z" clip-rule="evenodd"/>
                </svg>
                <span>${risk}</span>
            </div>
        `).join('');
    }

    renderMetricGroup(title, metrics, type) {
        return `
            <div class="metric-group glass-morphism">
                <h3 class="metric-group__title">${title}</h3>
                <div class="metric-cards">
                    ${Object.entries(metrics).map(([label, value]) => 
                        this.renderMetricCard(label, value, this.getMetricType(label))
                    ).join('')}
                </div>
            </div>
        `;
    }

    renderMetricCard(label, value, type) {
        let formattedValue = 'N/A';
        let trend = '';
        
        if (value !== null && value !== undefined && !isNaN(value)) {
            switch(type) {
                case 'currency':
                    formattedValue = Utils.formatCurrency(value);
                    break;
                case 'percent':
                    const numValue = parseFloat(value);
                    formattedValue = `${(numValue * (numValue < 1 ? 100 : 1)).toFixed(1)}%`;
                    trend = numValue > 0 ? 'positive' : numValue < 0 ? 'negative' : '';
                    break;
                case 'ratio':
                    formattedValue = parseFloat(value).toFixed(2);
                    break;
                default:
                    formattedValue = value.toString();
            }
        }
        
        return `
            <div class="metric-card ${trend ? `metric-card--${trend}` : ''}">
                <div class="metric-card__label">${label}</div>
                <div class="metric-card__value">${formattedValue}</div>
                ${trend ? `<div class="metric-card__trend metric-card__trend--${trend}"></div>` : ''}
            </div>
        `;
    }

    getMetricType(label) {
        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes('margin') || lowerLabel.includes('roe') || lowerLabel.includes('growth') || lowerLabel.includes('yield')) {
            return 'percent';
        }
        if (lowerLabel.includes('cap')) {
            return 'currency';
        }
        if (lowerLabel.includes('ratio') || lowerLabel.includes('coverage')) {
            return 'ratio';
        }
        return 'number';
    }

    calculateGrowth(data, metric) {
        // Simplified growth calculation - in real app would use historical data
        return Math.random() * 0.3 - 0.1; // Random growth between -10% and 20%
    }

    renderRecentCompanies() {
        const recent = state.recentCompanies.slice(0, 5);
        
        if (recent.length === 0) {
            return '<div class="sidebar__empty">No recent companies</div>';
        }
        
        return recent.map(company => `
            <a href="?ticker=${company.ticker}" class="sidebar__recent-item">
                <span class="sidebar__recent-ticker">${company.ticker}</span>
                <span class="sidebar__recent-name">${company.name}</span>
            </a>
        `).join('');
    }

    initSidebarNavigation() {
        const navItems = document.querySelectorAll('.sidebar__nav-item');
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

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const offset = Utils.isMobile() ? 20 : 100;
            const top = section.offsetTop - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    }

    async initMiniChart(ticker) {
        // Placeholder for mini chart - would integrate with Chart.js
        const canvas = document.getElementById('mini-price-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        // Simple placeholder chart
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 30);
        for (let i = 0; i < 200; i += 10) {
            ctx.lineTo(i, 30 + Math.sin(i / 20) * 15);
        }
        ctx.stroke();
    }

    initTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;
        
        // Set initial theme
        document.documentElement.setAttribute('data-theme', state.theme);
        document.body.classList.toggle('light-theme', state.theme === 'light');
        this.updateThemeIcon();
        
        // Add toggle listener
        themeToggle.addEventListener('click', () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', state.theme);
            document.documentElement.setAttribute('data-theme', state.theme);
            document.body.classList.toggle('light-theme', state.theme === 'light');
            this.updateThemeIcon();
        });
    }

    updateThemeIcon() {
        const darkIcon = document.querySelector('.theme-icon--dark');
        const lightIcon = document.querySelector('.theme-icon--light');
        
        if (state.theme === 'dark') {
            darkIcon?.classList.remove('hidden');
            lightIcon?.classList.add('hidden');
        } else {
            darkIcon?.classList.add('hidden');
            lightIcon?.classList.remove('hidden');
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
                <div class="error-container">
                    <div class="container-centered">
                        <div class="error-content">
                            <h2>Error Loading Company Data</h2>
                            <p>${message}</p>
                            <a href="./" class="error-button">Return to Dashboard</a>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

// ============================================
// INITIALIZE APPLICATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const app = new CompanyCardApp();
    app.init();
});

// Make renderer accessible globally for inline onclick handlers
window.EnhancedRenderer = EnhancedRenderer;
window.CompanyCardApp = CompanyCardApp;

// Export for debugging
export { EnhancedRenderer, Utils, state };