/**
 * Anti-Fragile Shield Visualization
 * Clean shield design with subscore indicators
 */

class AntiFragileShield {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.visualContainer = this.container?.querySelector('.antifragile-visual');
        this.initialized = false;
        this.currentData = null;
    }

    /**
     * Update the visualization with new data
     */
    update(data, animate = true) {
        if (!this.visualContainer) return;
        
        this.currentData = data;
        const { score, maxScore, minScore, rank, subScores, tier } = data;
        const percentage = ((score - minScore) / (maxScore - minScore)) * 100;
        
        // Create the visualization
        const svg = this.createVisualization(score, percentage, subScores, tier, rank);
        
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
    createVisualization(score, percentage, subScores, tier, rank) {
        const tierColor = this.getTierColor(tier);
        const tierName = this.getTierName(tier);
        
        return `
            <div class="antifragile-visualization" data-tier="${tier}">
                ${rank ? `
                    <div class="rank-badge-visual">
                        <span class="rank-number">#${rank}</span>
                        <span class="rank-total">of 118</span>
                    </div>
                ` : ''}
                
                <div class="shield-container">
                    <svg viewBox="0 0 200 220" class="shield-svg">
                        <defs>
                            <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="${tierColor}" stop-opacity="0.8"/>
                                <stop offset="100%" stop-color="${tierColor}" stop-opacity="0.3"/>
                            </linearGradient>
                            <filter id="shieldGlow">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                            <pattern id="shieldPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                                <line x1="0" y1="0" x2="20" y2="20" stroke="${tierColor}" stroke-width="0.5" opacity="0.1"/>
                                <line x1="20" y1="0" x2="0" y2="20" stroke="${tierColor}" stroke-width="0.5" opacity="0.1"/>
                            </pattern>
                        </defs>
                        
                        <!-- Shield background pattern -->
                        <rect x="0" y="0" width="200" height="220" fill="url(#shieldPattern)"/>
                        
                        <!-- Main shield shape -->
                        <path d="${this.getShieldPath()}"
                              fill="rgba(255, 255, 255, 0.02)"
                              stroke="url(#shieldGradient)"
                              stroke-width="3"
                              filter="url(#shieldGlow)"
                              class="shield-main"/>
                        
                        <!-- Inner shield -->
                        <path d="${this.getShieldPath(0.85)}"
                              fill="none"
                              stroke="${tierColor}"
                              stroke-width="1"
                              opacity="0.3"/>
                        
                        <!-- Shield emblem based on tier -->
                        ${this.createShieldEmblem(tier, tierColor)}
                        
                        <!-- Score display -->
                        <text x="100" y="90" text-anchor="middle" class="score-display">
                            <tspan class="score-value" fill="${tierColor}" font-size="48" font-weight="bold">
                                ${score > 0 ? '+' : ''}${score}
                            </tspan>
                        </text>
                        
                        <!-- Tier name -->
                        <text x="100" y="115" text-anchor="middle" fill="${tierColor}" font-size="12" font-weight="600" opacity="0.8" text-transform="uppercase" letter-spacing="2">
                            ${tierName}
                        </text>
                    </svg>
                </div>
                
                <!-- Subscore meters -->
                <div class="subscore-meters">
                    ${this.createSubscoreMeter('Strategic Core', subScores.strategicCore, tierColor)}
                    ${this.createSubscoreMeter('Financial Fortitude', subScores.financialFortitude, tierColor)}
                    ${this.createSubscoreMeter('Skin in the Game', subScores.skinInGame, tierColor)}
                </div>
                
                <!-- Shield strength indicator -->
                <div class="shield-strength">
                    <div class="strength-bar">
                        <div class="strength-fill" style="width: ${percentage}%; background: linear-gradient(90deg, ${tierColor}, ${tierColor}88)">
                            <span class="strength-label">${Math.round(percentage)}% Shield Integrity</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get shield path
     */
    getShieldPath(scale = 1) {
        const cx = 100;
        const cy = 80;
        const width = 70 * scale;
        const height = 90 * scale;
        
        return `
            M ${cx} ${cy - height/2}
            Q ${cx - width/2} ${cy - height/2} ${cx - width/2} ${cy - height/4}
            L ${cx - width/2} ${cy + height/4}
            Q ${cx - width/2} ${cy + height/2} ${cx} ${cy + height * 0.6}
            Q ${cx + width/2} ${cy + height/2} ${cx + width/2} ${cy + height/4}
            L ${cx + width/2} ${cy - height/4}
            Q ${cx + width/2} ${cy - height/2} ${cx} ${cy - height/2}
            Z
        `;
    }

    /**
     * Create shield emblem based on tier
     */
    createShieldEmblem(tier, color) {
        const cx = 100;
        const cy = 140;
        
        if (tier === 0) {
            // Shattered - crack lines
            return `
                <g opacity="0.5">
                    <path d="M ${cx-15} ${cy} L ${cx-5} ${cy-10} L ${cx+5} ${cy+10} L ${cx+15} ${cy}" 
                          stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>
                </g>
            `;
        } else if (tier === 1) {
            // Wooden - simple bars
            return `
                <g opacity="0.5">
                    <rect x="${cx-15}" y="${cy-5}" width="30" height="3" fill="${color}"/>
                    <rect x="${cx-15}" y="${cy+2}" width="30" height="3" fill="${color}"/>
                </g>
            `;
        } else if (tier === 2) {
            // Iron - crossed swords
            return `
                <g opacity="0.6">
                    <line x1="${cx-15}" y1="${cy-10}" x2="${cx+15}" y2="${cy+10}" stroke="${color}" stroke-width="3"/>
                    <line x1="${cx-15}" y1="${cy+10}" x2="${cx+15}" y2="${cy-10}" stroke="${color}" stroke-width="3"/>
                </g>
            `;
        } else if (tier === 3) {
            // Titanium - diamond
            return `
                <g opacity="0.7">
                    <path d="M ${cx} ${cy-12} L ${cx+10} ${cy} L ${cx} ${cy+12} L ${cx-10} ${cy} Z"
                          fill="${color}" opacity="0.5"/>
                    <path d="M ${cx} ${cy-12} L ${cx+10} ${cy} L ${cx} ${cy+12} L ${cx-10} ${cy} Z"
                          stroke="${color}" stroke-width="2" fill="none"/>
                </g>
            `;
        } else {
            // Mythic - star
            return `
                <g opacity="0.8">
                    <path d="M ${cx} ${cy-15} L ${cx+5} ${cy-5} L ${cx+15} ${cy-3} L ${cx+7} ${cy+5} L ${cx+10} ${cy+15} L ${cx} ${cy+8} L ${cx-10} ${cy+15} L ${cx-7} ${cy+5} L ${cx-15} ${cy-3} L ${cx-5} ${cy-5} Z"
                          fill="${color}" opacity="0.6"/>
                    <circle cx="${cx}" cy="${cy}" r="5" fill="${color}"/>
                </g>
            `;
        }
    }

    /**
     * Create subscore meter using existing metric-bar system
     */
    createSubscoreMeter(label, subscore, color) {
        const { value, max, min } = subscore;
        
        // Use the existing renderMetricBar function if available
        if (window.renderMetricBar) {
            return window.renderMetricBar(label, value, max, { min });
        }
        
        // Fallback implementation using existing metric-bar classes
        const range = max - min;
        const normalizedValue = value - min;
        const percentage = (normalizedValue / range) * 100;
        const displayValue = value > 0 ? `+${value}` : value;
        const shimmerClass = percentage >= 80 ? 'shimmer-effect' : '';
        
        return `
            <div class="subscore-item">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs muted-heading">${label}</span>
                    <span class="text-xs font-semibold">
                        <span style="color: ${color}">${displayValue}</span>
                        <span class="text-xs subtle-text"> (${min} to ${max})</span>
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
     * Get tier-based color using existing system
     */
    getTierColor(tier) {
        // Anti-Fragile uses different tier mapping
        const percentages = {
            0: 20,  // Shattered
            1: 40,  // Wooden  
            2: 60,  // Iron
            3: 70,  // Titanium
            4: 85   // Mythic (Purple tier)
        };
        
        const percentage = percentages[tier] || 20;
        
        // Use the existing getScoreColor function if available
        if (window.getScoreColor) {
            const colorData = window.getScoreColor(percentage);
            return colorData.color;
        }
        
        // Fallback
        const colors = {
            0: '#ef4444', // Shattered - Red
            1: '#f97316', // Wooden - Orange
            2: '#eab308', // Iron - Yellow
            3: '#22c55e', // Titanium - Green
            4: '#a855f7'  // Mythic - Purple
        };
        return colors[tier] || colors[0];
    }

    /**
     * Get tier name
     */
    getTierName(tier) {
        const names = {
            0: 'Shattered',
            1: 'Wooden',
            2: 'Iron',
            3: 'Titanium',
            4: 'Mythic'
        };
        return names[tier] || 'Unknown';
    }

    /**
     * Animate entrance
     */
    animateEntrance() {
        const shield = this.visualContainer.querySelector('.shield-main');
        const meters = this.visualContainer.querySelectorAll('.meter-fill');
        const strengthFill = this.visualContainer.querySelector('.strength-fill');
        
        if (shield) {
            shield.style.animation = 'drawShield 1s ease-out forwards';
        }
        
        meters.forEach((meter, index) => {
            meter.style.animation = `slideIn 0.5s ease-out ${0.5 + index * 0.1}s forwards`;
        });
        
        if (strengthFill) {
            strengthFill.style.animation = 'slideIn 0.8s ease-out 0.8s forwards';
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
window.AntiFragileShield = AntiFragileShield;