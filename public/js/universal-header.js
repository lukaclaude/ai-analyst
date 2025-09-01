/**
 * Universal Header Component JavaScript
 * Handles all functionality for the universal header across all pages
 */

class UniversalHeader {
    constructor() {
        this.searchTimeout = null;
        this.init();
    }
    
    init() {
        this.loadHeader();
        this.setupEventListeners();
    }
    
    async loadHeader() {
        const container = document.getElementById('universal-header-container');
        if (!container) return;
        
        try {
            const response = await fetch('/components/universal-header.html');
            const html = await response.text();
            
            // Extract just the header HTML (not the style)
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const header = doc.querySelector('.universal-header');
            const styles = doc.querySelector('style');
            
            // Add styles to head if not already present
            if (styles && !document.getElementById('universal-header-styles')) {
                styles.id = 'universal-header-styles';
                document.head.appendChild(styles);
            }
            
            // Add header to container
            if (header) {
                container.innerHTML = header.outerHTML;
                this.setupEventListeners();
            }
        } catch (error) {
            console.error('Failed to load universal header:', error);
        }
    }
    
    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('universal-theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Global search
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
            searchInput.addEventListener('focus', () => this.showSearchResults());
            searchInput.addEventListener('blur', () => {
                setTimeout(() => this.hideSearchResults(), 200);
            });
        }
        
        // Markets dropdown
        const marketsButton = document.getElementById('markets-button');
        if (marketsButton) {
            marketsButton.addEventListener('click', () => this.toggleMarketsDropdown());
        }
        
        // Watchlist
        const watchlistButton = document.getElementById('watchlist-button');
        if (watchlistButton) {
            watchlistButton.addEventListener('click', () => this.openWatchlist());
        }
        
        // User menu
        const userButton = document.getElementById('user-menu-button');
        if (userButton) {
            userButton.addEventListener('click', () => this.toggleUserMenu());
        }
        
        // Scroll effect
        window.addEventListener('scroll', () => this.handleScroll());
    }
    
    toggleTheme() {
        if (window.ThemeService && typeof window.ThemeService.toggle === 'function') {
            window.ThemeService.toggle();
        } else {
            // Fallback if ThemeService not loaded
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: isLight ? 'light' : 'dark' } }));
        }
    }
    
    handleSearch(query) {
        clearTimeout(this.searchTimeout);
        
        if (query.length < 2) {
            this.hideSearchResults();
            return;
        }
        
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    }
    
    async performSearch(query) {
        const resultsContainer = document.getElementById('global-search-results');
        if (!resultsContainer) return;
        resultsContainer.innerHTML = `
            <div class="search-loading">
                <div class="spinner"></div>
                <span>Searching...</span>
            </div>
        `;
        resultsContainer.classList.add('active');
        try {
            if (!window.DataService || typeof window.DataService.searchStocks !== 'function') {
                throw new Error('DataService unavailable');
            }
            const results = await window.DataService.searchStocks(query);
            this.displaySearchResults(results.slice(0, 10));
        } catch (error) {
            console.error('Search failed:', error);
            resultsContainer.innerHTML = `
                <div class="search-error">
                    <span>Search failed. Please try again.</span>
                </div>
            `;
        }
    }
    
    displaySearchResults(results) {
        const resultsContainer = document.getElementById('global-search-results');
        if (!resultsContainer) return;
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-empty">
                    <span>No companies found</span>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = `
            <div class="search-results-list">
                ${results.map(r => `
                    <a href="?ticker=${r.ticker}" class="search-result-item search-result-item--header">
                        <div class="search-result-main">
                            <div class="search-result-ticker">${r.ticker}</div>
                            <div class="search-result-name">${r.name}</div>
                        </div>
                        ${r.score ? `<div class="search-result-score">${r.score}</div>` : ''}
                    </a>
                `).join('')}
            </div>
        `;
    }
    
    showSearchResults() {
        const resultsContainer = document.getElementById('global-search-results');
        const searchInput = document.getElementById('global-search');
        if (resultsContainer && searchInput && searchInput.value.length >= 2) {
            resultsContainer.classList.add('active');
        }
    }
    
    hideSearchResults() {
        const resultsContainer = document.getElementById('global-search-results');
        if (resultsContainer) {
            resultsContainer.classList.remove('active');
        }
    }
    
    toggleMarketsDropdown() {
        // TODO: Implement markets dropdown
        console.log('Markets dropdown clicked');
    }
    
    openWatchlist() {
        // TODO: Implement watchlist
        console.log('Watchlist clicked');
    }
    
    toggleUserMenu() {
        // TODO: Implement user menu
        console.log('User menu clicked');
    }
    
    handleScroll() {
        const header = document.querySelector('.universal-header');
        if (!header) return;
        
        if (window.scrollY > 50) {
            header.style.background = 'rgba(13, 17, 23, 0.95)';
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        } else {
            header.style.background = 'rgba(13, 17, 23, 0.85)';
            header.style.boxShadow = 'none';
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.universalHeader = new UniversalHeader();
    });
} else {
    window.universalHeader = new UniversalHeader();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalHeader;
}
