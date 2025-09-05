// Mini Visuals: Tiny inline SVGs for list views without loading full engines
// Exposes window.MiniVisuals.{quality,idq,af}

(function() {
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function colorForPercent(pct) {
    if (pct >= 80) return 'var(--color-score-purple)';
    if (pct >= 74) return 'var(--color-score-blue)';
    if (pct >= 65) return 'var(--color-score-green)';
    if (pct >= 55) return 'var(--color-score-yellow)';
    if (pct >= 32) return 'var(--color-score-orange)';
    return 'var(--color-score-red)';
  }

  function quality(score) {
    const pct = clamp(((Number(score) || 0) / 109) * 100, 0, 100);
    const stroke = colorForPercent(pct);
    const dash = (pct / 100) * 41.5;
    return `<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false" style="transform:rotate(135deg)"><circle cx="10" cy="10" r="8.8" fill="none" stroke="#30363D" stroke-width="2" stroke-dasharray="41.5 55.3"/><circle cx="10" cy="10" r="8.8" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${dash} 55.3"/></svg>`;
  }

  function idq(score) {
    const raw = Number(score) || 0;
    let color;
    if (window.Tiers && typeof window.Tiers.getIdqTierColors === 'function') {
      color = window.Tiers.getIdqTierColors(raw)?.color;
    }
    if (!color) {
      const pct = clamp(((raw + 3) / 15) * 100, 0, 100);
      color = colorForPercent(pct);
    }
    return `<svg viewBox="20 22 24 22" width="20" height="20" aria-hidden="true" focusable="false"><g fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M26.962,23.149h10.077c2.23,0,4.038,1.808,4.038,4.038v8.077c0,2.23-1.808,4.038-4.038,4.038h-10.077c-2.23,0-4.038-1.808-4.038-4.038v-8.077C22.923,24.957,24.731,23.149,26.962,23.149z" /><path d="M28.97,27.166h6.06c1.121,0,2.03,0.909,2.03,2.03v4.06c0,1.121-0.909,2.03-2.03,2.03h-6.06c-1.121,0-2.03-0.909-2.03-2.03v-4.06C26.94,28.075,27.849,27.166,28.97,27.166z"/></g></svg>`;
  }

  function af(score) {
    const pct = clamp(((Number(score) || 0) + 7) / 24 * 100, 0, 100);
    const stroke = colorForPercent(pct);
    return `<svg viewBox="10 20 180 150" width="20" height="20" aria-hidden="true" focusable="false"><path d="M40,40 L100,25 L160,40 L160,100 C160,130 130,150 100,160 C70,150 40,130 40,100 Z" fill="none" stroke="${stroke}" stroke-width="6" stroke-linejoin="round"/></svg>`;
  }

  window.MiniVisuals = { quality, idq, af };
})();

