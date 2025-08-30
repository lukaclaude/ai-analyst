/**
 * Quality Score Visualization
 * Clean radial progress design with subscore indicators
 */

class QualityOrbital {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.visualContainer = this.container?.querySelector('.quality-visual');
        this.initialized = false;
        this.currentData = null;
    }

    /**
     * Update the visualization with new data
     */
    update(data, animate = true) {
        if (!this.visualContainer) return;
        
        this.currentData = data;
        const { score, maxScore, rank, subScores, tier } = data;
        const percentage = (score / maxScore) * 100;
        
        // Create the visualization
        const svg = this.createVisualization(score, maxScore, percentage, subScores, tier, rank);
        
        // Replace existing content
        this.visualContainer.innerHTML = svg;
        
        // Add tier class to card
        this.container.setAttribute('data-tier', tier);
        
        // Animate if enabled
        if (animate) {
            this.animateEntrance();
        }
        
        this.initialized = true;
    }

    /**
     * Create the visualization SVG
     */
    createVisualization(score, maxScore, percentage, subScores, tier, rank) {
        const tierColor = this.getTierColor(tier);
        const radius = 70;
        const strokeWidth = 12;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;
        
        return `
            <div class="quality-visualization" data-tier="${tier}">
                ${rank ? `
                    <div class="rank-badge-visual">
                        <span class="rank-number">#${rank}</span>
                        <span class="rank-total">of 118</span>
                    </div>
                ` : ''}
                
                <div class="radial-score-container">
                    <svg viewBox="0 0 200 200" class="radial-score-svg">
                        <defs>
                            <linearGradient id="qualityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="${tierColor}" stop-opacity="1"/>
                                <stop offset="100%" stop-color="${tierColor}" stop-opacity="0.6"/>
                            </linearGradient>
                            <filter id="qualityGlow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        
                        <!-- Background circle -->
                        <circle cx="100" cy="100" r="${radius}"
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.1)"
                                stroke-width="${strokeWidth}"/>
                        
                        <!-- Progress circle -->
                        <circle cx="100" cy="100" r="${radius}"
                                fill="none"
                                stroke="url(#qualityGradient)"
                                stroke-width="${strokeWidth}"
                                stroke-linecap="round"
                                stroke-dasharray="${circumference}"
                                stroke-dashoffset="${strokeDashoffset}"
                                transform="rotate(-90 100 100)"
                                filter="url(#qualityGlow)"
                                class="progress-ring"/>
                        
                        <!-- Center content -->
                        <text x="100" y="95" text-anchor="middle" class="score-display">
                            <tspan class="score-value" fill="${tierColor}" font-size="42" font-weight="bold">${score.toFixed(0)}</tspan>
                        </text>
                        <text x="100" y="115" text-anchor="middle" fill="rgba(255, 255, 255, 0.5)" font-size="14">
                            of ${maxScore}
                        </text>
                    </svg>
                </div>
                
                <!-- Subscore bars -->
                <div class="subscore-bars">
                    ${this.createSubscoreBar('Financials', subScores.financials.value, subScores.financials.max, tierColor)}
                    ${this.createSubscoreBar('Moat', subScores.moat.value, subScores.moat.max, tierColor)}
                    ${this.createSubscoreBar('Potential', subScores.potential.value, subScores.potential.max, tierColor)}
                    ${this.createSubscoreBar('Culture', subScores.culture.value, subScores.culture.max, tierColor)}
                    ${subScores.gauntlet.value < 0 ? this.createSubscoreBar('Gauntlet', subScores.gauntlet.value, -30, '#ef4444', true) : ''}
                </div>
            </div>
        `;
    }

    /**
     * Create subscore bar using existing metric-bar system
     */
    createSubscoreBar(label, value, max, color, isNegative = false) {
        // Use the existing renderMetricBar function if available
        if (window.renderMetricBar) {
            return window.renderMetricBar(label, value, max, { isNegative });
        }
        
        // Fallback implementation using existing metric-bar classes
        const percentage = isNegative ? Math.abs(value / max) * 100 : (value / max) * 100;
        const shimmerClass = percentage >= 80 ? 'shimmer-effect' : '';
        
        return `
            <div class="subscore-item">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs muted-heading">${label}</span>
                    <span class="text-xs font-semibold">
                        <span style="color: ${color}">${value}</span>
                        <span class="subtle-text">/${max}</span>
                    </span>
                </div>
                <div class="metric-bar">
                    <div class="metric-fill ${shimmerClass}" 
                         style="width: ${percentage}%; background: linear-gradient(90deg, ${color}, ${color}88)">
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get tier-based color using existing getScoreColor function
     */
    getTierColor(tier) {
        // Convert tier back to percentage to use existing color system
        const percentages = {
            0: 20,  // < 32%
            1: 40,  // 32-55%
            2: 60,  // 55-65%
            3: 70,  // 65-74%
            4: 76,  // 74-80%
            5: 85   // >= 80%
        };
        
        const percentage = percentages[tier] || 20;
        
        // Use the existing getScoreColor function if available
        if (window.getScoreColor) {
            const colorData = window.getScoreColor(percentage);
            return colorData.color;
        }
        
        // Fallback if function not available
        const colors = {
            0: '#ef4444', // Red
            1: '#f97316', // Orange
            2: '#eab308', // Yellow
            3: '#22c55e', // Green
            4: '#3b82f6', // Blue
            5: '#a855f7'  // Purple
        };
        return colors[tier] || colors[0];
    }

    /**
     * Animate entrance
     */
    animateEntrance() {
        const progressRing = this.visualContainer.querySelector('.progress-ring');
        const subscoreFills = this.visualContainer.querySelectorAll('.subscore-fill');
        
        if (progressRing) {
            progressRing.style.animation = 'drawProgress 1s ease-out forwards';
        }
        
        subscoreFills.forEach((fill, index) => {
            fill.style.animation = `slideIn 0.5s ease-out ${index * 0.1}s forwards`;
        });
    }

    /**
     * Handle responsive resize
     */
    handleResize(breakpoint) {
        // Visualization is already responsive
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.visualContainer) {
            this.visualContainer.innerHTML = '';
        }
    }
}

// Export for use
window.QualityOrbital = QualityOrbital;