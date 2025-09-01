// Universal Tooltip (v1) – restricted to rank badges for initial rollout
// Theme-aware via CSS variables; uses a single fixed-position node appended to <body>

(function() {
  const MARGIN = 8;
  const ID = 'ui-tooltip';

  let tooltipEl = null;
  let currentTrigger = null;
  let rafId = null;

  function createTooltip() {
    if (tooltipEl) return tooltipEl;
    const el = document.createElement('div');
    el.id = ID;
    el.setAttribute('role', 'tooltip');
    el.className = 'ui-tooltip';
    el.style.position = 'fixed';
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.style.transform = 'translate3d(0,0,0)';
    el.style.visibility = 'hidden';
    document.body.appendChild(el);
    tooltipEl = el;
    return el;
  }

  function setTooltipContent(text, percentile) {
    if (!tooltipEl) return;
    const content = percentile ? `${text}\n${percentile}` : text;
    tooltipEl.textContent = content;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function positionTooltip(trigger) {
    if (!tooltipEl || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Measure tooltip
    tooltipEl.style.visibility = 'hidden';
    tooltipEl.style.opacity = '0';
    tooltipEl.style.maxWidth = `min(320px, calc(100vw - ${MARGIN * 2}px))`;
    // Force layout to measure
    const tw = tooltipEl.offsetWidth;
    const th = tooltipEl.offsetHeight;

    // Default: bottom placement
    let x = rect.left + rect.width / 2 - tw / 2;
    x = clamp(x, MARGIN, vw - tw - MARGIN);
    let y = rect.bottom + MARGIN;

    // Flip to top if overflowing bottom
    if (y + th + MARGIN > vh) {
      y = rect.top - th - MARGIN;
      if (y < MARGIN) {
        // If still overflowing, clamp to viewport top margin
        y = MARGIN;
      }
    }

    tooltipEl.style.left = `${Math.round(x)}px`;
    tooltipEl.style.top = `${Math.round(y)}px`;
    tooltipEl.style.visibility = 'visible';
    tooltipEl.style.opacity = '1';
  }

  function showTooltip(trigger) {
    createTooltip();
    if (!tooltipEl) return;
    currentTrigger = trigger;
    const text = trigger.getAttribute('data-tooltip') || '';
    const percentile = trigger.getAttribute('data-percentile') || '';
    setTooltipContent(text, percentile);
    trigger.setAttribute('aria-describedby', ID);
    // Position on next frame to ensure content is measured
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => positionTooltip(trigger));
  }

  function hideTooltip(trigger) {
    if (!tooltipEl) return;
    tooltipEl.style.opacity = '0';
    tooltipEl.style.visibility = 'hidden';
    if (trigger) trigger.removeAttribute('aria-describedby');
    currentTrigger = null;
  }

  function onPointerEnter(e) {
    const trigger = e.target.closest('[data-tooltip]');
    if (!trigger) return;
    showTooltip(trigger);
  }

  function onPointerLeave(e) {
    const trigger = e.target.closest('[data-tooltip]');
    if (!trigger) return;
    // Ensure we only hide when leaving the same element
    if (currentTrigger === trigger) hideTooltip(trigger);
  }

  function onFocusIn(e) {
    const trigger = e.target.closest('[data-tooltip]');
    if (!trigger) return;
    showTooltip(trigger);
  }

  function onFocusOut(e) {
    const trigger = e.target.closest('[data-tooltip]');
    if (!trigger) return;
    if (currentTrigger === trigger) hideTooltip(trigger);
  }

  function onScrollOrResize() {
    if (currentTrigger && tooltipEl && tooltipEl.style.visibility === 'visible') {
      positionTooltip(currentTrigger);
    }
  }

  function init() {
    createTooltip();
    // Delegated listeners so dynamically-updated rank badges work
    document.addEventListener('pointerenter', onPointerEnter, true);
    document.addEventListener('pointerleave', onPointerLeave, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
