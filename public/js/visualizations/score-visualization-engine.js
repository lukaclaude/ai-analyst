/**
 * Score Visualization Engine
 * Main orchestrator for premium score card visualizations
 * Handles initialization, updates, and responsive behavior
 */

class ScoreVisualizationEngine {
    constructor() {
        this.visualizations = {};
        this.isInitialized = false;
        this.currentBreakpoint = this.getBreakpoint();
        this.animationEnabled = !this.prefersReducedMotion();
        
        // Listen for resize events
        this.setupResponsiveHandling();

        // Listen for theme/orientation to keep visuals in sync with tokens/layout
        this.setupThemeAndOrientationHandling();
    }

    /**
     * Initialize all score visualizations
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Check if modules are already loaded
            if (window.QualityOrbital && window.IDQProcessor && window.AntiFragileShield) {
                // Use already loaded modules
                this.visualizations.quality = new window.QualityOrbital('quality-card');
                this.visualizations.idq = new window.IDQProcessor('idq-card');
                this.visualizations.antifragile = new window.AntiFragileShield('antifragile-card');
                
                this.isInitialized = true;
                console.log('Score Visualization Engine initialized with pre-loaded modules');
            } else {
                // Try to load modules dynamically as fallback
                const [QualityOrbital, IDQProcessor, AntiFragileShield] = await Promise.all([
                    this.loadModule('quality-orbital.js'),
                    this.loadModule('idq-processor.js'),
                    this.loadModule('antifragile-shield.js')
                ]);
                
                // Initialize each visualization
                this.visualizations.quality = new QualityOrbital('quality-card');
                this.visualizations.idq = new IDQProcessor('idq-card');
                this.visualizations.antifragile = new AntiFragileShield('antifragile-card');
                
                this.isInitialized = true;
                console.log('Score Visualization Engine initialized with dynamically loaded modules');
            }
        } catch (error) {
            console.error('Failed to initialize visualizations:', error);
            // Fallback to original visualizations
            this.isInitialized = false;
        }
    }

    /**
     * Load a visualization module
     */
    async loadModule(moduleName) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `/js/visualizations/${moduleName}`;
            script.onload = () => {
                // Module should expose its class on window
                const className = moduleName.split('.')[0]
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join('');
                resolve(window[className]);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Update Quality Score visualization
     */
    updateQuality(score, subScores, rank) {
        if (!this.isInitialized || !this.visualizations.quality) return;
        
        const data = {
            score: score,
            maxScore: 109,
            rank: rank || null,
            subScores: {
                financials: { value: subScores?.financials || 0, max: 17 },
                moat: { value: subScores?.moat || 0, max: 20 },
                potential: { value: subScores?.potential || 0, max: 45 },
                culture: { value: subScores?.culture || 0, max: 25 },
                gauntlet: { value: subScores?.gauntlet || 0, max: -30 }
            },
            tier: this.calculateTier(score / 109)
        };
        
        this.visualizations.quality.update(data, this.animationEnabled);
    }

    /**
     * Update IDQ Score visualization
     */
    updateIDQ(score, grade, summary, rank) {
        if (!this.isInitialized || !this.visualizations.idq) return;
        
        const data = {
            score: score,
            maxScore: 12,
            minScore: -3,
            rank: rank || null,
            grade: grade || this.getIDQGrade(score),
            summary: summary || '',
            tier: this.calculateIDQTier(score)
        };
        
        this.visualizations.idq.update(data, this.animationEnabled);
    }

    /**
     * Update Anti-Fragile Score visualization
     */
    updateAntiFragile(score, subScores, rank) {
        if (!this.isInitialized || !this.visualizations.antifragile) return;
        
        const data = {
            score: score,
            maxScore: 17,
            minScore: -7,
            rank: rank || null,
            subScores: {
                strategicCore: { value: subScores?.strategicCore || 0, max: 13, min: -1 },
                financialFortitude: { value: subScores?.financialFortitude || 0, max: 1, min: -4 },
                skinInGame: { value: subScores?.skinInGame || 0, max: 3, min: -2 }
            },
            tier: this.calculateAntiFragileTier(score)
        };
        
        this.visualizations.antifragile.update(data, this.animationEnabled);
    }

    /**
     * Calculate tier based on percentage
     */
    calculateTier(percentage) {
        if (percentage >= 0.80) return 5; // Exceptional
        if (percentage >= 0.74) return 4; // Excellent
        if (percentage >= 0.65) return 3; // Strong
        if (percentage >= 0.55) return 2; // Moderate
        if (percentage >= 0.32) return 1; // Challenged
        return 0; // High Risk
    }

    /**
     * Calculate IDQ tier
     */
    calculateIDQTier(score) {
        if (score >= 11) return 4; // Visionary
        if (score >= 9) return 3;  // Pioneer
        if (score >= 6) return 2;  // Leader
        if (score >= 3) return 1;  // Follower
        return 0; // Passive
    }

    /**
     * Calculate Anti-Fragile tier
     */
    calculateAntiFragileTier(score) {
        if (score >= 14) return 4; // Mythic
        if (score >= 11) return 3; // Titanium
        if (score >= 7) return 2;  // Iron
        if (score >= 4) return 1;  // Wooden
        return 0; // Shattered
    }

    /**
     * Get IDQ grade from score
     */
    getIDQGrade(score) {
        if (score >= 11) return 'Visionary';
        if (score >= 9) return 'Pioneer';
        if (score >= 6) return 'Leader';
        if (score >= 3) return 'Follower';
        return 'Passive';
    }

    /**
     * Get current breakpoint
     */
    getBreakpoint() {
        const width = window.innerWidth;
        if (width < 768) return 'mobile';
        if (width < 1024) return 'tablet';
        if (width < 1920) return 'desktop';
        return 'wide';
    }

    /**
     * Setup responsive handling
     */
    setupResponsiveHandling() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const newBreakpoint = this.getBreakpoint();
                if (newBreakpoint !== this.currentBreakpoint) {
                    this.currentBreakpoint = newBreakpoint;
                    this.handleBreakpointChange();
                }
            }, 250);
        });
    }

    /**
     * Setup theme/orientation handling
     */
    setupThemeAndOrientationHandling() {
        // On theme change, let visuals re-read CSS tokens or refresh their style
        window.addEventListener('themeChanged', () => {
            this.refreshVisuals();
        });
        // Orientation change may affect layout similarly to a breakpoint change
        window.addEventListener('orientationchange', () => {
            this.handleBreakpointChange();
        });
    }

    /**
     * Handle breakpoint changes
     */
    handleBreakpointChange() {
        Object.values(this.visualizations).forEach(viz => {
            if (viz && viz.handleResize) {
                viz.handleResize(this.currentBreakpoint);
            }
        });
    }

    /**
     * Ask visualizations to refresh colors/styles after theme change
     */
    refreshVisuals() {
        Object.values(this.visualizations).forEach(viz => {
            if (!viz) return;
            if (viz.refreshStyle) viz.refreshStyle();
            else if (viz.handleResize) viz.handleResize(this.currentBreakpoint);
        });
    }

    /**
     * Check if user prefers reduced motion
     */
    prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Cleanup and destroy visualizations
     */
    destroy() {
        Object.values(this.visualizations).forEach(viz => {
            if (viz && viz.destroy) {
                viz.destroy();
            }
        });
        this.visualizations = {};
        this.isInitialized = false;
    }
}

// Export for use
window.ScoreVisualizationEngine = ScoreVisualizationEngine;
