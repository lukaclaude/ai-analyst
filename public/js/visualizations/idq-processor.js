/**
 * IDQ Processor Visualization
 * Clean hexagonal tech design with grade display
 */

class IDQProcessor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.visualContainer = this.container?.querySelector('.idq-visual');
        this.initialized = false;
        this.currentData = null;
    }

    /**
     * Update the visualization with new data
     */
    update(data, animate = true) {
        if (!this.visualContainer) return;
        
        this.currentData = data;
        const { score, maxScore, minScore, rank, grade, summary, tier } = data;
        const percentage = ((score - minScore) / (maxScore - minScore)) * 100;
        
        // Create the visualization
        const svg = this.createVisualization(score, percentage, grade, tier, rank, summary);
        
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
    createVisualization(score, percentage, grade, tier, rank, summary) {
        const tierColor = this.getTierColor(tier);
        const size = 100;
        
        return `
            <div class="idq-visualization" data-tier="${tier}">
                ${rank ? `
                    <div class="rank-badge-visual">
                        <span class="rank-number">#${rank}</span>
                        <span class="rank-total">of 118</span>
                    </div>
                ` : ''}
                
                <div class="hexagon-container">
                    <svg viewBox="0 0 200 200" class="hexagon-svg">
                        <defs>
                            <linearGradient id="idqGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="${tierColor}" stop-opacity="0.8"/>
                                <stop offset="100%" stop-color="${tierColor}" stop-opacity="0.4"/>
                            </linearGradient>
                            <filter id="idqGlow">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                            <pattern id="techGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                                <rect x="0" y="0" width="20" height="20" fill="none" stroke="${tierColor}" stroke-width="0.2" opacity="0.3"/>
                                <circle cx="0" cy="0" r="1" fill="${tierColor}" opacity="0.5"/>
                                <circle cx="20" cy="0" r="1" fill="${tierColor}" opacity="0.5"/>
                                <circle cx="0" cy="20" r="1" fill="${tierColor}" opacity="0.5"/>
                                <circle cx="20" cy="20" r="1" fill="${tierColor}" opacity="0.5"/>
                            </pattern>
                        </defs>
                        
                        <!-- Background pattern -->
                        <rect x="0" y="0" width="200" height="200" fill="url(#techGrid)"/>
                        
                        <!-- Hexagon background -->
                        <path d="${this.getHexagonPath(100, 100, size)}"
                              fill="rgba(255, 255, 255, 0.03)"
                              stroke="rgba(255, 255, 255, 0.1)"
                              stroke-width="1"/>
                        
                        <!-- Main hexagon -->
                        <path d="${this.getHexagonPath(100, 100, size - 5)}"
                              fill="none"
                              stroke="url(#idqGradient)"
                              stroke-width="2"
                              filter="url(#idqGlow)"
                              class="hexagon-main"/>
                        
                        <!-- Inner hexagon -->
                        <path d="${this.getHexagonPath(100, 100, size - 20)}"
                              fill="rgba(255, 255, 255, 0.02)"
                              stroke="${tierColor}"
                              stroke-width="1"
                              opacity="0.5"/>
                        
                        <!-- Score display -->
                        <text x="100" y="95" text-anchor="middle" class="score-display">
                            <tspan class="score-value" fill="${tierColor}" font-size="48" font-weight="bold">
                                ${score > 0 ? '+' : ''}${score}
                            </tspan>
                        </text>
                        
                        <!-- Grade label -->
                        <text x="100" y="120" text-anchor="middle" fill="${tierColor}" font-size="14" font-weight="600" opacity="0.8">
                            ${grade}
                        </text>
                        
                        <!-- Corner indicators -->
                        ${this.createCornerIndicators(tierColor, percentage)}
                    </svg>
                </div>
                
                <!-- Summary text -->
                ${summary ? `
                    <div class="idq-summary">
                        <p class="summary-text">${this.truncateSummary(summary, 150)}</p>
                    </div>
                ` : ''}
                
                <!-- Scale indicator -->
                <div class="scale-indicator">
                    <div class="scale-track">
                        <div class="scale-fill" style="width: ${percentage}%; background: ${tierColor}"></div>
                        <div class="scale-marker" style="left: ${percentage}%">
                            <div class="marker-dot" style="background: ${tierColor}"></div>
                        </div>
                    </div>
                    <div class="scale-labels">
                        <span class="scale-min">-3</span>
                        <span class="scale-mid">Neutral</span>
                        <span class="scale-max">+12</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get hexagon path
     */
    getHexagonPath(cx, cy, size) {
        const angles = [30, 90, 150, 210, 270, 330];
        const points = angles.map(angle => {
            const radian = (angle * Math.PI) / 180;
            const x = cx + size * Math.cos(radian);
            const y = cy + size * Math.sin(radian);
            return `${x},${y}`;
        });
        return `M ${points.join(' L ')} Z`;
    }

    /**
     * Create corner indicators
     */
    createCornerIndicators(color, percentage) {
        const indicators = [];
        const angles = [30, 90, 150, 210, 270, 330];
        const activeCount = Math.floor((percentage / 100) * 6);
        
        angles.forEach((angle, index) => {
            const radian = (angle * Math.PI) / 180;
            const x = 100 + 85 * Math.cos(radian);
            const y = 100 + 85 * Math.sin(radian);
            const isActive = index < activeCount;
            
            indicators.push(`
                <circle cx="${x}" cy="${y}" r="3" 
                        fill="${isActive ? color : 'rgba(255, 255, 255, 0.2)'}"
                        opacity="${isActive ? '1' : '0.3'}"
                        class="corner-indicator">
                    ${isActive ? `
                        <animate attributeName="r" 
                                 values="3;5;3" 
                                 dur="${1.5 + index * 0.2}s" 
                                 repeatCount="indefinite"/>
                    ` : ''}
                </circle>
            `);
        });
        
        return indicators.join('');
    }

    /**
     * Truncate summary text
     */
    truncateSummary(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Get tier-based color using existing system
     */
    getTierColor(tier) {
        // IDQ uses different tier mapping
        const percentages = {
            0: 20,  // Passive
            1: 40,  // Follower
            2: 60,  // Leader
            3: 70,  // Pioneer
            4: 85   // Visionary
        };
        
        const percentage = percentages[tier] || 20;
        
        // Use the existing getScoreColor function if available
        if (window.getScoreColor) {
            const colorData = window.getScoreColor(percentage);
            return colorData.color;
        }
        
        // Fallback
        const colors = {
            0: '#ef4444', // Passive - Red
            1: '#f97316', // Follower - Orange
            2: '#eab308', // Leader - Yellow
            3: '#22c55e', // Pioneer - Green
            4: '#3b82f6'  // Visionary - Blue
        };
        return colors[tier] || colors[0];
    }

    /**
     * Animate entrance
     */
    animateEntrance() {
        const hexagon = this.visualContainer.querySelector('.hexagon-main');
        const indicators = this.visualContainer.querySelectorAll('.corner-indicator');
        const scaleFill = this.visualContainer.querySelector('.scale-fill');
        
        if (hexagon) {
            hexagon.style.animation = 'drawHexagon 1s ease-out forwards';
        }
        
        indicators.forEach((indicator, index) => {
            indicator.style.animation = `fadeIn 0.3s ease-out ${index * 0.1}s forwards`;
        });
        
        if (scaleFill) {
            scaleFill.style.animation = 'slideIn 0.8s ease-out 0.5s forwards';
        }
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
window.IDQProcessor = IDQProcessor;