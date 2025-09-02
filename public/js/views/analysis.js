// Analysis View: renders the Company Analysis section (moved from monolith)
(function() {
  function render() {
    const analysisContainer = document.getElementById('company-analysis');
    if (!analysisContainer || !window.CompanyCard || !window.CompanyCard.state || !window.CompanyCard.state.currentStockData) return;

    const state = window.CompanyCard.state;
    const trendAnalysis = state.currentStockData.LLM_Reports?.Trend_Analysis;
    const portfolio = state.currentStockData.Portfolio;
    if (!trendAnalysis) return;

    const qualityScore = parseFloat(portfolio.qualityScore) || 0;
    const idqScore = parseFloat(state.currentStockData.LLM_Reports?.IDQ_Report?.idqScore) || 0;
    const antiFragileScore = parseFloat(state.currentStockData.Anti_Fragile_Score?.totalScore) || 0;
    const companyTier = (typeof calculateCompanyTier === 'function') ? calculateCompanyTier(qualityScore, idqScore, antiFragileScore) : { color: '#a855f7', score: 0, name: '' };

    const thesisElements = [];
    if (qualityScore > 85) thesisElements.push(`With an exceptional Quality Score of ${qualityScore.toFixed(1)}, ${portfolio.companyName} demonstrates best-in-class operational excellence and financial strength.`);
    else if (qualityScore > 70) thesisElements.push(`The solid Quality Score of ${qualityScore.toFixed(1)} indicates ${portfolio.companyName} maintains strong fundamentals with room for improvement.`);
    else thesisElements.push(`The Quality Score of ${qualityScore.toFixed(1)} suggests ${portfolio.companyName} faces operational challenges that require monitoring.`);

    const idqGrade = state.currentStockData.LLM_Reports?.IDQ_Report?.grade;
    if (idqGrade) thesisElements.push(`As an innovation "${idqGrade}", the company ${idqScore >= 9 ? 'leads' : idqScore >= 6 ? 'actively participates in' : 'follows'} industry transformation through ${idqScore >= 9 ? 'pioneering' : 'strategic'} technology adoption.`);
    if (antiFragileScore >= 12) thesisElements.push(`The Anti-Fragile Score of ${antiFragileScore} reveals a company built to thrive in chaos, with exceptional resilience to market shocks.`);
    else if (antiFragileScore >= 7) thesisElements.push(`With an Anti-Fragile Score of ${antiFragileScore}, the company shows good adaptability to market stress.`);

    const llmResearch = state.currentStockData.LLM_Research_and_Comments;
    const financialResilience = parseFloat(llmResearch?.Financials_Group?.financialResilience || 0);
    const moatDirection = parseFloat(llmResearch?.Moat_Group?.moatDirection || 0);
    if (financialResilience === 5) thesisElements.push(`Achieving a perfect Financial Resilience score demonstrates fortress-like balance sheet strength.`);
    if (moatDirection === 5) thesisElements.push(`A maximum Moat Direction score indicates competitive advantages are rapidly expanding.`);

    let bullishTraits = [];
    let bearishTraits = [];
    try { if (trendAnalysis.bullishTraits) bullishTraits = JSON.parse(trendAnalysis.bullishTraits); } catch (_) {}
    try { if (trendAnalysis.bearishTraits) bearishTraits = JSON.parse(trendAnalysis.bearishTraits); } catch (_) {}

    let bigPicture = '';
    let coreDebate = '';
    if (trendAnalysis.companyAnalysis) {
      const companyAnalysis = trendAnalysis.companyAnalysis;
      const parts = companyAnalysis.split('## The Core Debate');
      bigPicture = parts[0].replace('## The Big Picture', '').replace(/^#+\s*/gm, '').trim();
      coreDebate = parts[1]?.replace(/^#+\s*/gm, '').trim() || '';
    }

    const antiFragileData = state.currentStockData?.Anti_Fragile_Score;
    const thesisSummary = (typeof generateSmartThesis === 'function') ? generateSmartThesis(qualityScore, idqScore, antiFragileScore, portfolio, llmResearch) : thesisElements;
    const exceptionalMetrics = (typeof findExceptionalMetrics === 'function') ? findExceptionalMetrics(llmResearch, antiFragileData) : [];

    const synthesisHTML = `
      <div class="synthesis-container" style="--tier-color: ${companyTier.color}; --tier-glow: ${companyTier.color}40;">
        <div class="synthesis-header">
          <svg class="synthesis-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/></svg>
          <span class="synthesis-title">AI-Powered Investment Synthesis</span>
          <span class="synthesis-subtitle">Based on comprehensive analysis</span>
          <button id="copy-insight-btn" class="synthesis-copy-btn" aria-label="Copy insight">Copy Insight</button>
        </div>
        <div class="synthesis-content">
          <div class="synthesis-narrative">${thesisSummary.map(sentence => `<p>${sentence}</p>`).join('')}</div>
          <div class="synthesis-visualization">
            <canvas id="score-breakdown-chart" class="score-breakdown-chart" width="140" height="140"></canvas>
            <span class="score-breakdown-label" data-tooltip="Composition: Quality 40%, IDQ 35%, Anti‑Fragile 25%.">Score Composition</span>
          </div>
        </div>
        <div class="synthesis-highlights">
          <div class="tier-badge-compact">
            <span class="tier-name" data-tooltip="Tiers: Apex (85+), Powerhouse (78–84.9), Compounder (65–77.9), Mixed (55–64.9), Challenged (32–54.9), High Risk (<32). Formula: 40% Quality, 35% IDQ, 25% Anti‑Fragile.">${companyTier.name}</span>
            <div class="tier-score"><span class="tier-score-value">${companyTier.score.toFixed(1)}</span><span class="tier-score-total">/100</span></div>
          </div>
          <div class="synthesis-metrics">${exceptionalMetrics.map(m => `<div class="metric-highlight ${m.isNegative ? 'metric-highlight-negative' : ''}"><span class="metric-highlight-icon">${m.isNegative ? '⚠' : '✓'}</span><span class="metric-highlight-text"><span class="metric-highlight-value">${m.value}</span> ${m.label}</span></div>`).join('')}</div>
        </div>
      </div>`;

    analysisContainer.innerHTML = `
      <div class="analysis-card glass-morphism mb-4">${synthesisHTML}</div>
      ${(bigPicture || coreDebate) ? `
        <div class="analysis-card glass-morphism mb-4">
          ${bigPicture ? `<div class="analysis-section"><div class="analysis-header border-l-4 border-green-500 pl-4"><h3 class="analysis-title text-lg font-semibold">The Big Picture</h3></div><div class="analysis-content mt-3"><p class="secondary-text leading-relaxed">${bigPicture}</p></div></div>` : ''}
          ${coreDebate ? `<div class="analysis-section ${bigPicture ? 'mt-6 pt-6 border-t border-gray-700/50' : ''}"><div class="analysis-header border-l-4 border-purple-500 pl-4"><h3 class="analysis-title text-lg font-semibold">The Core Debate</h3></div><div class="analysis-content mt-3"><p class="secondary-text leading-relaxed">${coreDebate}</p></div></div>` : ''}
        </div>
      ` : ''}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="analysis-card glass-morphism"><div class="analysis-header"><svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg><h3 class="analysis-title">Bullish Traits</h3></div><div class="analysis-content">${bullishTraits.length ? `<ul class="space-y-2">${bullishTraits.slice(0,5).map(trait => `<li class="text-sm flex items-start"><span class="text-green-400 mr-2 mt-1">•</span><span class="flex-1">${trait.headline ? `<strong>${trait.headline}</strong>: ` : ''}<span class="trait-detail-inline">${trait.description || trait.summary || ''}</span>${(trait.reasoning || trait.summary) ? `<span class="inline-block ml-1 cursor-help" tabindex="0" aria-label="Reasoning details" data-tooltip="${escapeAttr(trait.reasoning || trait.summary)}"><svg class="w-3 h-3 text-gray-400 inline" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg></span>` : ''}</span></li>`).join('')}</ul>` : '<p class="secondary-text">No bullish traits available.</p>'}</div></div>
        <div class="analysis-card glass-morphism"><div class="analysis-header"><svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg><h3 class="analysis-title">Bearish Traits</h3></div><div class="analysis-content">${bearishTraits.length ? `<ul class="space-y-2">${bearishTraits.slice(0,5).map(trait => `<li class="text-sm flex items-start"><span class="text-red-500 mr-2 mt-1">•</span><span class="flex-1">${trait.headline ? `<strong>${trait.headline}</strong>: ` : ''}<span class="trait-detail-inline">${trait.description || trait.summary || ''}</span>${(trait.reasoning || trait.summary) ? `<span class="inline-block ml-1 cursor-help" tabindex="0" aria-label="Reasoning details" data-tooltip="${escapeAttr(trait.reasoning || trait.summary)}"><svg class="w-3 h-3 text-gray-400 inline" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg></span>` : ''}</span></li>`).join('')}</ul>` : '<p class="secondary-text">No bearish traits available.</p>'}</div></div>
      </div>`;

    try {
      const copyBtn = analysisContainer.querySelector('#copy-insight-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          try {
            const text = thesisSummary.join(' ');
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
            else {
              const ta = document.createElement('textarea');
              ta.value = text; ta.setAttribute('readonly',''); ta.style.position='absolute'; ta.style.left='-9999px';
              document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
            }
            const prev = copyBtn.textContent; copyBtn.textContent = 'Copied!'; setTimeout(() => { copyBtn.textContent = prev; }, 1200);
          } catch(_) {}
        });
      }
    } catch(_) {}

    try { document.querySelectorAll('.analysis-content .cursor-help[data-tooltip]').forEach(el => { el.setAttribute('tabindex','0'); if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label','Reasoning details'); }); } catch(_) {}
    setTimeout(() => { if (typeof drawScoreBreakdownChart === 'function') drawScoreBreakdownChart(qualityScore, idqScore, antiFragileScore, companyTier); }, 100);
  }

  window.AnalysisView = { render };
})();
