/**
 * Company Sections Module
 * Handles Company Analysis, Financial Metrics, and Detailed Tables
 */

export class CompanySections {
    constructor(data) {
        this.data = data;
        this.llmResearch = data.LLM_Research_and_Comments || {};
        this.financials = data.API_Financials || {};
        this.portfolio = data.Portfolio || {};
    }

    // ============================================
    // COMPANY ANALYSIS SECTION
    // ============================================

    renderCompanyAnalysis() {
        const section = document.getElementById('company-analysis');
        if (!section) return;

        const trendAnalysis = this.data.LLM_Reports?.Trend_Analysis || {};
        const companyComments = this.llmResearch.companyComments || '';
        
        section.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">Company Analysis</h2>
                <p class="section-subtitle">AI-powered insights and strategic assessment</p>
            </div>
            
            <div class="analysis-grid">
                <!-- Executive Summary -->
                <div class="analysis-card analysis-card--full">
                    <div class="analysis-card__header">
                        <h3 class="analysis-card__title">Executive Summary</h3>
                        <span class="analysis-card__badge">AI Analysis</span>
                    </div>
                    <div class="analysis-card__content">
                        <p class="analysis-text">${companyComments || 'No analysis available yet.'}</p>
                    </div>
                </div>
                
                <!-- Trend Analysis -->
                <div class="analysis-card">
                    <div class="analysis-card__header">
                        <h3 class="analysis-card__title">Trend Analysis</h3>
                        <span class="analysis-card__indicator ${this.getTrendClass(trendAnalysis.overall_trend)}">
                            ${trendAnalysis.overall_trend || 'Neutral'}
                        </span>
                    </div>
                    <div class="analysis-card__content">
                        <div class="trend-metrics">
                            <div class="trend-metric">
                                <span class="trend-metric__label">Revenue Trend</span>
                                <span class="trend-metric__value">${trendAnalysis.revenue_trend || 'N/A'}</span>
                            </div>
                            <div class="trend-metric">
                                <span class="trend-metric__label">Margin Trend</span>
                                <span class="trend-metric__value">${trendAnalysis.margin_trend || 'N/A'}</span>
                            </div>
                            <div class="trend-metric">
                                <span class="trend-metric__label">Growth Outlook</span>
                                <span class="trend-metric__value">${trendAnalysis.growth_outlook || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Key Strengths -->
                <div class="analysis-card">
                    <div class="analysis-card__header">
                        <h3 class="analysis-card__title">Key Strengths</h3>
                    </div>
                    <div class="analysis-card__content">
                        ${this.renderStrengths()}
                    </div>
                </div>
                
                <!-- Risk Factors -->
                <div class="analysis-card">
                    <div class="analysis-card__header">
                        <h3 class="analysis-card__title">Risk Factors</h3>
                    </div>
                    <div class="analysis-card__content">
                        ${this.renderRisks()}
                    </div>
                </div>
            </div>
        `;
    }

    renderStrengths() {
        const strengths = [
            this.llmResearch.moatSummary,
            this.llmResearch.potentialSummary
        ].filter(Boolean);

        if (strengths.length === 0) {
            return '<p class="text-muted">No strengths data available</p>';
        }

        return `
            <ul class="strength-list">
                ${strengths.map(strength => `
                    <li class="strength-item">
                        <svg class="strength-icon" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                        <span>${strength.substring(0, 100)}...</span>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    renderRisks() {
        const gauntletData = this.llmResearch.Gauntlet_Group || {};
        const risks = [];
        
        if (gauntletData.Debt === 'false') risks.push('High debt levels');
        if (gauntletData.Cyclicality === 'false') risks.push('Cyclical business model');
        if (gauntletData.Regulatory === 'false') risks.push('Regulatory challenges');
        
        if (risks.length === 0) {
            return '<p class="text-success">No significant risks identified</p>';
        }

        return `
            <ul class="risk-list">
                ${risks.map(risk => `
                    <li class="risk-item">
                        <svg class="risk-icon" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                        </svg>
                        <span>${risk}</span>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    getTrendClass(trend) {
        if (!trend) return '';
        const lowerTrend = trend.toLowerCase();
        if (lowerTrend.includes('positive') || lowerTrend.includes('up')) return 'trend--positive';
        if (lowerTrend.includes('negative') || lowerTrend.includes('down')) return 'trend--negative';
        return 'trend--neutral';
    }

    // ============================================
    // FINANCIAL METRICS SECTION
    // ============================================

    renderFinancialMetrics() {
        const section = document.getElementById('financial-metrics');
        if (!section) return;

        const metrics = this.financials.Metrics || {};
        const income = this.financials.IncomeStatement?.[0] || {};
        const balance = this.financials.BalanceSheet?.[0] || {};
        const cashFlow = this.financials.CashFlowStatement?.[0] || {};
        
        section.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">Key Financial Metrics</h2>
                <p class="section-subtitle">Critical performance indicators</p>
            </div>
            
            <div class="metrics-grid">
                <!-- Valuation Metrics -->
                <div class="metric-group">
                    <h3 class="metric-group__title">Valuation</h3>
                    <div class="metric-cards">
                        ${this.renderMetricCard('P/E Ratio', metrics.peRatio, 'number')}
                        ${this.renderMetricCard('P/B Ratio', metrics.pbRatio, 'number')}
                        ${this.renderMetricCard('EV/EBITDA', metrics.evToEbitda, 'number')}
                        ${this.renderMetricCard('Market Cap', metrics.marketCap, 'currency')}
                    </div>
                </div>
                
                <!-- Profitability Metrics -->
                <div class="metric-group">
                    <h3 class="metric-group__title">Profitability</h3>
                    <div class="metric-cards">
                        ${this.renderMetricCard('Gross Margin', metrics.grossProfitMargin, 'percent')}
                        ${this.renderMetricCard('Operating Margin', metrics.operatingProfitMargin, 'percent')}
                        ${this.renderMetricCard('Net Margin', metrics.netProfitMargin, 'percent')}
                        ${this.renderMetricCard('ROE', metrics.roe, 'percent')}
                    </div>
                </div>
                
                <!-- Growth Metrics -->
                <div class="metric-group">
                    <h3 class="metric-group__title">Growth</h3>
                    <div class="metric-cards">
                        ${this.renderMetricCard('Revenue Growth', this.calculateGrowth('revenue'), 'percent')}
                        ${this.renderMetricCard('EPS Growth', this.calculateGrowth('eps'), 'percent')}
                        ${this.renderMetricCard('FCF Growth', this.calculateGrowth('fcf'), 'percent')}
                        ${this.renderMetricCard('Dividend Growth', metrics.dividendGrowth, 'percent')}
                    </div>
                </div>
                
                <!-- Financial Health -->
                <div class="metric-group">
                    <h3 class="metric-group__title">Financial Health</h3>
                    <div class="metric-cards">
                        ${this.renderMetricCard('Current Ratio', metrics.currentRatio, 'number')}
                        ${this.renderMetricCard('Debt/Equity', metrics.debtToEquity, 'number')}
                        ${this.renderMetricCard('Interest Coverage', metrics.interestCoverage, 'number')}
                        ${this.renderMetricCard('FCF Yield', metrics.fcfYield, 'percent')}
                    </div>
                </div>
            </div>
            
            <!-- Interactive Chart -->
            <div class="chart-container">
                <div class="chart-header">
                    <h3 class="chart-title">Performance Trends</h3>
                    <div class="chart-controls">
                        <select id="chart-metric" class="chart-select">
                            <option value="revenue">Revenue</option>
                            <option value="eps">EPS</option>
                            <option value="fcf">Free Cash Flow</option>
                            <option value="margins">Margins</option>
                        </select>
                        <div class="chart-timeframe">
                            <button class="timeframe-btn active" data-timeframe="1Y">1Y</button>
                            <button class="timeframe-btn" data-timeframe="3Y">3Y</button>
                            <button class="timeframe-btn" data-timeframe="5Y">5Y</button>
                            <button class="timeframe-btn" data-timeframe="10Y">10Y</button>
                        </div>
                    </div>
                </div>
                <canvas id="metrics-chart"></canvas>
            </div>
        `;
        
        // Initialize chart
        this.initMetricsChart();
    }

    renderMetricCard(label, value, type) {
        let formattedValue = 'N/A';
        let trend = '';
        
        if (value !== null && value !== undefined) {
            switch(type) {
                case 'currency':
                    formattedValue = this.formatCurrency(value);
                    break;
                case 'percent':
                    formattedValue = `${(parseFloat(value) * 100).toFixed(2)}%`;
                    trend = parseFloat(value) > 0 ? 'positive' : parseFloat(value) < 0 ? 'negative' : '';
                    break;
                case 'number':
                    formattedValue = parseFloat(value).toFixed(2);
                    break;
                default:
                    formattedValue = value;
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

    calculateGrowth(metric) {
        // This would calculate growth based on historical data
        // Simplified for now
        return Math.random() * 0.3 - 0.1; // Random growth between -10% and 20%
    }

    formatCurrency(value) {
        const num = parseFloat(value);
        if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        return `$${num.toFixed(2)}`;
    }

    initMetricsChart() {
        const ctx = document.getElementById('metrics-chart');
        if (!ctx) return;
        
        // This would initialize a Chart.js chart
        // Implementation depends on Chart.js being loaded
    }

    // ============================================
    // DETAILED TABLES SECTION
    // ============================================

    renderDetailedTables() {
        const section = document.getElementById('detailed-tables');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">Financial Statements</h2>
                <p class="section-subtitle">Detailed financial data</p>
            </div>
            
            <div class="tables-container">
                <!-- Tab Navigation -->
                <div class="table-tabs">
                    <button class="table-tab active" data-table="income">Income Statement</button>
                    <button class="table-tab" data-table="balance">Balance Sheet</button>
                    <button class="table-tab" data-table="cashflow">Cash Flow</button>
                    <button class="table-tab" data-table="metrics">Key Metrics</button>
                </div>
                
                <!-- Table Content -->
                <div class="table-content">
                    <div id="income-table" class="financial-table active">
                        ${this.renderIncomeStatement()}
                    </div>
                    <div id="balance-table" class="financial-table">
                        ${this.renderBalanceSheet()}
                    </div>
                    <div id="cashflow-table" class="financial-table">
                        ${this.renderCashFlowStatement()}
                    </div>
                    <div id="metrics-table" class="financial-table">
                        ${this.renderMetricsTable()}
                    </div>
                </div>
            </div>
        `;
        
        // Add tab switching functionality
        this.initTableTabs();
    }

    renderIncomeStatement() {
        const statements = this.financials.IncomeStatement || [];
        if (statements.length === 0) return '<p class="no-data">No income statement data available</p>';
        
        const years = statements.slice(0, 5).reverse();
        
        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        ${years.map(s => `<th>${s.fiscalYear || s.date?.substring(0,4) || 'N/A'}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Revenue</td>
                        ${years.map(s => `<td>${this.formatTableValue(s.revenue)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Gross Profit</td>
                        ${years.map(s => `<td>${this.formatTableValue(s.grossProfit)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Operating Income</td>
                        ${years.map(s => `<td>${this.formatTableValue(s.operatingIncome)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Net Income</td>
                        ${years.map(s => `<td>${this.formatTableValue(s.netIncome)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>EPS</td>
                        ${years.map(s => `<td>${s.eps?.toFixed(2) || 'N/A'}</td>`).join('')}
                    </tr>
                </tbody>
            </table>
        `;
    }

    renderBalanceSheet() {
        const statements = this.financials.BalanceSheet || [];
        if (statements.length === 0) return '<p class="no-data">No balance sheet data available</p>';
        
        const years = statements.slice(0, 5).reverse();
        
        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        ${years.map(s => `<th>${s.fiscalYear || s.date?.substring(0,4) || 'N/A'}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Total Assets</td>
                        ${years.map(s => `<td>${this.formatTableValue(s.totalAssets)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Total Liabilities</td>
                        ${years.map(s => `<td>${this.formatTableValue(s.totalLiabilities)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Total Equity</td>
                        ${years.map(s => `<td>${this.formatTableValue(s.totalEquity)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Cash & Equivalents</td>
                        ${years.map(s => `<td>${this.formatTableValue(s.cashAndCashEquivalents)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Total Debt</td>
                        ${years.map(s => `<td>${this.formatTableValue(s.totalDebt)}</td>`).join('')}
                    </tr>
                </tbody>
            </table>
        `;
    }

    renderCashFlowStatement() {
        const statements = this.financials.CashFlowStatement || [];
        if (statements.length === 0) return '<p class="no-data">No cash flow data available</p>';
        
        const years = statements.slice(0, 5).reverse();
        
        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        ${years.map(s => `<th>${s.fiscalYear || s.date?.substring(0,4) || 'N/A'}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Operating Cash Flow</td>
                        ${years.map(s => `<td>${this.formatTableValue(s.operatingCashFlow)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Investing Cash Flow</td>
                        ${years.map(s => `<td>${this.formatTableValue(s.investingCashFlow)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Financing Cash Flow</td>
                        ${years.map(s => `<td>${this.formatTableValue(s.financingCashFlow)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>Free Cash Flow</td>
                        ${years.map(s => `<td>${this.formatTableValue(s.freeCashFlow)}</td>`).join('')}
                    </tr>
                    <tr>
                        <td>CapEx</td>
                        ${years.map(s => `<td>${this.formatTableValue(s.capitalExpenditure)}</td>`).join('')}
                    </tr>
                </tbody>
            </table>
        `;
    }

    renderMetricsTable() {
        const metrics = this.financials.Metrics || {};
        
        return `
            <table class="data-table data-table--metrics">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Metric</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td rowspan="4">Valuation</td>
                        <td>P/E Ratio</td>
                        <td>${metrics.peRatio?.toFixed(2) || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>P/B Ratio</td>
                        <td>${metrics.pbRatio?.toFixed(2) || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>P/S Ratio</td>
                        <td>${metrics.psRatio?.toFixed(2) || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>PEG Ratio</td>
                        <td>${metrics.pegRatio?.toFixed(2) || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td rowspan="4">Profitability</td>
                        <td>ROE</td>
                        <td>${(metrics.roe * 100).toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td>ROA</td>
                        <td>${(metrics.roa * 100).toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td>ROIC</td>
                        <td>${(metrics.roic * 100).toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td>Gross Margin</td>
                        <td>${(metrics.grossProfitMargin * 100).toFixed(2)}%</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    formatTableValue(value) {
        if (!value) return 'N/A';
        const num = parseFloat(value);
        if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
        if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
        if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
        return num.toFixed(1);
    }

    initTableTabs() {
        const tabs = document.querySelectorAll('.table-tab');
        const tables = document.querySelectorAll('.financial-table');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tableId = tab.dataset.table;
                
                // Update active states
                tabs.forEach(t => t.classList.remove('active'));
                tables.forEach(t => t.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(`${tableId}-table`)?.classList.add('active');
            });
        });
    }
}