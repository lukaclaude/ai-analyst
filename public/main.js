/**
 * Premium Financial Analysis Platform
 * Main Application Entry Point
 * 
 * This file initializes the application, sets up Firebase,
 * and coordinates all components.
 */

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

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================================
// APPLICATION STATE
// ============================================

class AppState {
    constructor() {
        this.currentView = 'list'; // 'list' or 'company'
        this.currentTicker = null;
        this.currentData = null;
        this.theme = this.loadTheme();
        this.recentCompanies = this.loadRecentCompanies();
        this.cache = new Map();
    }

    loadTheme() {
        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return saved || (prefersDark ? 'dark' : 'light');
    }

    saveTheme(theme) {
        this.theme = theme;
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }

    loadRecentCompanies() {
        const saved = localStorage.getItem('recentCompanies');
        return saved ? JSON.parse(saved) : [];
    }

    saveRecentCompany(ticker, name, website) {
        // Remove if exists, add to beginning, keep max 5
        this.recentCompanies = this.recentCompanies.filter(c => c.ticker !== ticker);
        this.recentCompanies.unshift({ ticker, name, website });
        this.recentCompanies = this.recentCompanies.slice(0, 5);
        localStorage.setItem('recentCompanies', JSON.stringify(this.recentCompanies));
    }
}

// Global state instance
const appState = new AppState();

// ============================================
// CORE UTILITIES
// ============================================

const Utils = {
    // Format currency values
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

    // Get score color based on percentage
    getScoreColor(percentage) {
        if (percentage >= 80) return { 
            color: '#a855f7', 
            glow: 'var(--glow-purple)', 
            class: 'score-card--purple' 
        };
        if (percentage >= 74) return { 
            color: '#3b82f6', 
            glow: 'var(--glow-blue)', 
            class: 'score-card--blue' 
        };
        if (percentage >= 65) return { 
            color: '#22c55e', 
            glow: 'var(--glow-green)', 
            class: 'score-card--green' 
        };
        if (percentage >= 55) return { 
            color: '#eab308', 
            glow: 'var(--glow-yellow)', 
            class: 'score-card--yellow' 
        };
        if (percentage >= 32) return { 
            color: '#f97316', 
            glow: 'var(--glow-orange)', 
            class: 'score-card--orange' 
        };
        return { 
            color: '#ef4444', 
            glow: 'var(--glow-red)', 
            class: 'score-card--red' 
        };
    },

    // Animate value counting
    animateValue(element, start, end, duration = 1000) {
        if (!element) return;
        
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(timer);
            }
            element.textContent = Math.round(current);
        }, 16);
    },

    // Debounce function
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
        // Check cache first
        if (appState.cache.has(ticker)) {
            return appState.cache.get(ticker);
        }

        try {
            const querySnapshot = await db.collection("stocks")
                .where("Portfolio.ticker", "==", ticker)
                .get();
            
            if (!querySnapshot.empty) {
                const data = querySnapshot.docs[0].data();
                appState.cache.set(ticker, data); // Cache the result
                return data;
            }
            
            throw new Error(`Stock ${ticker} not found`);
        } catch (error) {
            console.error("Error fetching stock data:", error);
            throw error;
        }
    }

    async getAllStocks() {
        try {
            const querySnapshot = await db.collection("stocks").get();
            const stocks = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.Portfolio?.ticker) {
                    stocks.push({
                        ticker: data.Portfolio.ticker,
                        name: data.Portfolio.companyName,
                        qualityScore: parseFloat(data.Portfolio.qualityScore),
                        stockPrice: parseFloat(data.Portfolio.stockPriceNow),
                        currency: data.Portfolio.stockpricecurrency
                    });
                }
            });
            
            return stocks;
        } catch (error) {
            console.error("Error fetching all stocks:", error);
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
// COMPONENT LOADER
// ============================================

class ComponentLoader {
    async loadComponent(name, targetId) {
        try {
            // This will be replaced with actual component loading logic
            const response = await fetch(`/components/templates/${name}.template.html`);
            const html = await response.text();
            
            const target = document.getElementById(targetId);
            if (target) {
                target.innerHTML = html;
                this.initializeComponent(name, target);
            }
        } catch (error) {
            console.error(`Error loading component ${name}:`, error);
        }
    }

    initializeComponent(name, element) {
        // Component-specific initialization
        switch(name) {
            case 'nav-sidebar':
                this.initNavigation(element);
                break;
            case 'header':
                this.initHeader(element);
                break;
            case 'score-card':
                this.initScoreCard(element);
                break;
        }
    }

    initNavigation(element) {
        // Add navigation event listeners
        const navItems = element.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.scrollToSection(section);
            });
        });
    }

    initHeader(element) {
        // Initialize search functionality
        const searchInput = element.querySelector('#search-input');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
        }
    }

    initScoreCard(element) {
        // Initialize score card interactions
        const expandBtn = element.querySelector('.expand-button');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                element.classList.toggle('expanded');
            });
        }
    }

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    async handleSearch(query) {
        if (query.length < 2) return;
        
        // Search implementation
        const results = await this.searchStocks(query);
        this.displaySearchResults(results);
    }

    async searchStocks(query) {
        // This will be replaced with actual search logic
        return [];
    }

    displaySearchResults(results) {
        // Display search results
    }
}

// ============================================
// THEME MANAGER
// ============================================

class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.init();
    }

    init() {
        // Set initial theme
        document.documentElement.setAttribute('data-theme', appState.theme);
        this.updateToggleIcon();

        // Add event listener
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                appState.saveTheme(e.matches ? 'dark' : 'light');
                this.updateToggleIcon();
            }
        });
    }

    toggleTheme() {
        const newTheme = appState.theme === 'dark' ? 'light' : 'dark';
        appState.saveTheme(newTheme);
        this.updateToggleIcon();
    }

    updateToggleIcon() {
        if (!this.themeToggle) return;
        
        const darkIcon = this.themeToggle.querySelector('.theme-icon--dark');
        const lightIcon = this.themeToggle.querySelector('.theme-icon--light');
        
        if (appState.theme === 'dark') {
            darkIcon?.classList.remove('hidden');
            lightIcon?.classList.add('hidden');
        } else {
            darkIcon?.classList.add('hidden');
            lightIcon?.classList.remove('hidden');
        }
    }
}

// ============================================
// ROUTER
// ============================================

class Router {
    constructor() {
        this.routes = {
            'list': this.showListView,
            'company': this.showCompanyView
        };
        this.init();
    }

    init() {
        // Handle browser back/forward
        window.addEventListener('popstate', () => this.handleRoute());
        
        // Handle initial route
        this.handleRoute();
    }

    handleRoute() {
        const params = new URLSearchParams(window.location.search);
        const ticker = params.get('ticker');
        
        if (ticker) {
            this.navigate('company', { ticker });
        } else {
            this.navigate('list');
        }
    }

    navigate(view, params = {}) {
        appState.currentView = view;
        
        // Update URL
        const url = new URL(window.location);
        if (view === 'company' && params.ticker) {
            url.searchParams.set('ticker', params.ticker);
        } else {
            url.searchParams.delete('ticker');
        }
        
        window.history.pushState({}, '', url);
        
        // Load view
        this.routes[view]?.(params);
    }

    async showListView() {
        const contentView = document.getElementById('content-view');
        contentView.innerHTML = '<div class="loading">Loading stocks...</div>';
        
        try {
            const stocks = await new FirebaseService().getAllStocks();
            // Render list view (to be implemented)
            contentView.innerHTML = `<h2>Available Stocks (${stocks.length})</h2>`;
        } catch (error) {
            contentView.innerHTML = '<div class="error">Error loading stocks</div>';
        }
    }

    async showCompanyView({ ticker }) {
        const contentView = document.getElementById('content-view');
        contentView.innerHTML = '<div class="loading">Loading company data...</div>';
        
        try {
            const data = await new FirebaseService().getStockData(ticker);
            appState.currentData = data;
            appState.currentTicker = ticker;
            
            // Update recent companies
            appState.saveRecentCompany(
                ticker,
                data.Portfolio.companyName,
                data.API_Financials?.General?.companyWebsite
            );
            
            // Render company view (to be implemented)
            contentView.innerHTML = `<h2>${data.Portfolio.companyName} (${ticker})</h2>`;
        } catch (error) {
            contentView.innerHTML = '<div class="error">Error loading company data</div>';
        }
    }
}

// ============================================
// APPLICATION INITIALIZATION
// ============================================

class Application {
    constructor() {
        this.firebaseService = new FirebaseService();
        this.componentLoader = new ComponentLoader();
        this.themeManager = null;
        this.router = null;
    }

    async init() {
        try {
            // Show loading state
            this.showLoading(true);
            
            // Initialize theme
            this.themeManager = new ThemeManager();
            
            // Load core components
            await this.loadCoreComponents();
            
            // Initialize router (handles navigation)
            this.router = new Router();
            
            // Hide loading state
            this.showLoading(false);
            
            // Mark app as loaded
            document.getElementById('app').classList.add('loaded');
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to load application. Please refresh the page.');
        }
    }

    async loadCoreComponents() {
        // For now, we'll create placeholder components
        // These will be replaced with actual component loading
        
        const navSidebar = document.getElementById('navigation-sidebar');
        if (navSidebar) {
            navSidebar.innerHTML = `
                <div class="p-4">
                    <h3 class="text-lg font-bold mb-4">Navigation</h3>
                    <nav class="space-y-2">
                        <a href="?view=list" class="block p-2 hover:bg-gray-700 rounded">All Stocks</a>
                        <div class="mt-4">
                            <h4 class="text-sm text-muted mb-2">Recent</h4>
                            ${this.renderRecentCompanies()}
                        </div>
                    </nav>
                </div>
            `;
        }
        
        const mainHeader = document.getElementById('main-header');
        if (mainHeader) {
            mainHeader.innerHTML = `
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold">Financial Analysis Platform</h1>
                    <input type="search" placeholder="Search stocks..." 
                           class="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700"
                           id="search-input">
                </div>
            `;
        }
    }

    renderRecentCompanies() {
        return appState.recentCompanies.map(company => `
            <a href="?ticker=${company.ticker}" 
               class="block p-2 text-sm hover:bg-gray-700 rounded">
                ${company.ticker} - ${company.name}
            </a>
        `).join('');
    }

    showLoading(show) {
        const loadingEl = document.getElementById('app-loading');
        if (loadingEl) {
            if (show) {
                loadingEl.classList.remove('fade-out');
            } else {
                loadingEl.classList.add('fade-out');
                setTimeout(() => loadingEl.remove(), 300);
            }
        }
    }

    showError(message) {
        const contentView = document.getElementById('content-view');
        if (contentView) {
            contentView.innerHTML = `
                <div class="error-container p-8 text-center">
                    <h2 class="text-2xl font-bold text-red-500 mb-4">Error</h2>
                    <p class="text-gray-400">${message}</p>
                </div>
            `;
        }
    }
}

// ============================================
// START APPLICATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const app = new Application();
    app.init();
});

// Export for use in other modules
window.PremiumFinancialApp = {
    appState,
    Utils,
    FirebaseService,
    ComponentLoader
};