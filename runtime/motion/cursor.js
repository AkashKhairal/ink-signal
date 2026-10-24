// Ink & Signal — Signal Motion engine: the cursor. Constant size on screen at every camera zoom,
// moves on gentle curves, arrives before it clicks, dips on press, leaves a signal ripple on the control.
import { h, css } from './dom.js';
import { T, path, presses, clamp, seg, eo } from './engine.js';

const CUR = T.motion.cursor;
const ARROW = 'M3 3 L3 41 L12.5 32 L19 47 L25.5 44.2 L19.2 29.8 L32 29.8 Z';
const HAND = 'M14 24V9.5a3 3 0 0 1 6 0V22M20 21.5v-4a3 3 0 0 1 6 0v5M26 22.5v-3a3 3 0 0 1 6 0v4M32 23.5v-1.8a3 3 0 0 1 6 0V33c0 7-5 12-12 12h-3.5c-4 0-6.6-1.7-8.9-4.6L7.3 33.2a3.2 3.2 0 0 1 4.7-4.3L14 31V24';

/**
 * cursor(stage, { keys: [[t, x, y], ...], clicks: [t...], drags: [[t0, t1]...], space: 'world'|'screen',
 *                 size, hand: [[t0, t1]...] (pointing-hand intervals), ripple: true, show: [t0, t1] })
 * returns { el, at(t) → world/screen point, update(t) }
 */
export function cursor(stage, { keys, clicks = [], drags = [], space = 'world', size, ripple = true, hand = [], show = null, color, cam = null, layer = null } = {}) {
  const u = stage.u;
  const S = (size ?? CUR.sizePx) * u;
  const fill = color || 'var(--ui-cursorFill)', stroke = 'var(--ui-cursorStroke)';
  const el = h('div', { class: 'is-cursor', style: { position: 'absolute', left: '0px', top: '0px', width: S + 'px', height: (S * 56) / 40 + 'px', transformOrigin: `${(3 / 40) * S}px ${(3 / 40) * S}px`, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.28))', zIndex: 20 } });
  el.innerHTML = `<svg viewBox="0 0 40 56" width="100%" height="100%" style="display:block;overflow:visible"><path class="arrow" d="${ARROW}" fill="${fill}" stroke="${stroke}" stroke-width="2.6" stroke-linejoin="round"/><path class="hand" d="${HAND}" fill="${fill}" stroke="${stroke}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" style="display:none"/></svg>`;
  const arrowP = el.querySelector('.arrow'), handP = el.querySelector('.hand');
  const rings = clicks.map(() => {
    const r = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: '0px', height: '0px', borderRadius: '50%', border: `${(3 * u).toFixed(2)}px solid var(--accent)`, display: 'none', zIndex: 19 } });
    (layer || stage.top).appendChild(r); return r;
  });
  (layer || stage.top).appendChild(el);
  const p = path(keys);
  const pr = presses(clicks, drags);
  const toScreen = (q) => (space === 'world' ? (cam || stage.cam).toScreen(q.x, q.y) : q);
  return {
    el, at: p, press: pr,
    update(t) {
      const vis = show ? t >= show[0] && t <= show[1] : true;
      if (!vis) { css(el, { display: 'none' }); rings.forEach((r) => css(r, { display: 'none' })); return; }
      const s = toScreen(p(t));
      const pressed = pr(t);
      const isHand = hand.some(([a, b]) => t >= a && t < b);
      css(arrowP, { display: isHand ? 'none' : '' }); css(handP, { display: isHand ? '' : 'none' });
      const ox = (3 / 40) * S;
      css(el, { display: '', transform: `translate(${(s.x - ox).toFixed(2)}px,${(s.y - ox).toFixed(2)}px) scale(${(1 - (1 - CUR.pressScale) * clamp(pressed)).toFixed(4)})` });
      if (ripple) clicks.forEach((c, i) => {
        const k = seg(t, c, c + CUR.rippleDur);
        if (k <= 0 || k >= 1) { css(rings[i], { display: 'none' }); return; }
        const q = toScreen(p(c)); const R = CUR.rippleRadius * u * (0.35 + 0.65 * eo(k));
        css(rings[i], { display: '', opacity: (1 - k) * 0.9, left: (q.x - R) + 'px', top: (q.y - R) + 'px', width: 2 * R + 'px', height: 2 * R + 'px' });
      });
    },
  };
}

/** cursor key helpers: arrive at (x, y) `lead` seconds before a click at t, stay until `hold` after */
export function clickAt(t, x, y, { lead = CUR.arriveLead, hold = 0.25 } = {}) { return [[t - lead, x, y], [t + hold, x, y]]; }
