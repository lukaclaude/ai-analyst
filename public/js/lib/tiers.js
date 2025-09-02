// Tier helpers, especially for IDQ tier mapping (raw score based)
(function() {
  function getIdqTierColors(idqScore) {
    if (idqScore >= 11) return { color: '#a855f7', glow: 'rgba(168,85,247,0.3)', rgb: '168,85,247', class: 'score-purple', tier: 'Pioneer' };
    if (idqScore >= 9)  return { color: '#3b82f6', glow: 'rgba(59,130,246,0.3)',  rgb: '59,130,246',  class: 'score-blue',   tier: 'Leader' };
    if (idqScore >= 6)  return { color: '#22c55e', glow: 'rgba(34,197,94,0.3)',   rgb: '34,197,94',   class: 'score-green',  tier: 'Integrator' };
    if (idqScore >= 3)  return { color: '#eab308', glow: 'rgba(234,179,8,0.3)',   rgb: '234,179,8',   class: 'score-yellow', tier: 'Follower' };
    return                { color: '#f97316', glow: 'rgba(249,115,22,0.3)',       rgb: '249,115,22',  class: 'score-orange', tier: 'Lagging' };
  }

  window.Tiers = { getIdqTierColors };
})();

