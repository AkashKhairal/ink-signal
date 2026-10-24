// Ink & Signal — Interface layer: product UI rebuilt in the brand (paper / night), animated by time.
// Every component is { el, update(t) } (plus helpers). Sizes are px at 1080 on the short side × stage.u.
// Colours come from CSS variables set by the stage theme (--ui-surface, --ui-border, --ui-text, …, --accent).
import { h, css, setText, icon, applyVis, textWidth } from './dom.js';
import { T, track, ctrack, vis, seg, eo, eio, clamp, lerp, spr, typed, caretOn, pulse, ease, fmtNum, sp } from './engine.js';
import { box } from './stage.js';

const TY = T.ui.type;
export const rad = (S, k) => (typeof k === 'number' ? k : T.ui.radius[k]) * S.u;
const px = (S, n) => n * S.u;

/** UI text style. size: token name (h1,h2,h3,body,small,micro,mono,label,line) or px@1080 */
export function ts(S, size = 'body', { w = 'regular', color = 'var(--ui-text)', mono = false, label = false, track: tr, lh = 1.2, wrap = false } = {}) {
  const px1080 = typeof size === 'number' ? size : TY[size];
  const st = {
    fontFamily: label ? '"IS label"' : mono ? '"IS dataSoft"' : '"IS ui"', fontSize: px1080 * S.u + 'px',
    fontWeight: String(label || mono ? 400 : TY.weights[w] ?? w), color, lineHeight: String(lh),
    letterSpacing: (tr ?? (label ? TY.tracking.label : TY.tracking[size] ?? 0)) + 'em', whiteSpace: wrap ? 'normal' : 'nowrap',
  };
  if (label) st.textTransform = 'uppercase';
  return st;
}
/** font shorthand for canvas measuring (matches ts) */
export const fontStr = (S, size = 'body', { w = 'regular', mono = false, label = false } = {}) => `${label || mono ? 400 : TY.weights[w] ?? w} ${(typeof size === 'number' ? size : TY[size]) * S.u}px ${label ? '"IS label"' : mono ? '"IS dataSoft"' : '"IS ui"'}`;

export const surface = (S, { r = 'card', tone = 'surface', shadow = true, border = true } = {}) => ({
  background: tone === 'surface' ? 'var(--ui-surface)' : tone === 'alt' ? 'var(--ui-surfaceAlt)' : tone === 'sunken' ? 'var(--ui-sunken)' : tone === 'control' ? 'var(--ui-control)' : tone === 'accent' ? 'var(--accent)' : tone,
  borderRadius: rad(S, r) + 'px', boxShadow: shadow ? 'var(--ui-shadow)' : 'none',
  outline: border ? `${px(S, T.ui.border).toFixed(2)}px solid var(--ui-border)` : 'none', outlineOffset: `${(-px(S, T.ui.border)).toFixed(2)}px`,
});

/** a positioned text element; anchor tl/tc/tr/cl/c/cr/bl/bc/br is the point (x, y) of its own box */
export function text(S, parent, { x = 0, y = 0, anchor = 'tl', text: s = '', size = 'body', style = {}, ...o } = {}) {
  const el = h('div', { text: s, style: { position: 'absolute', left: x + 'px', top: y + 'px', transform: `translate(${anchorX(anchor)},${anchorY(anchor)})`, ...ts(S, size, o), ...style } });
  parent.appendChild(el);
  return el;
}
const anchorX = (a) => ({ l: '0', c: '-50%', r: '-100%' }[a.length === 1 ? 'c' : a[1]]);
const anchorY = (a) => ({ t: '0', c: '-50%', b: '-100%' }[a.length === 1 ? 'c' : a[0]]);

/** a card (rounded surface). Returns the element; put children inside with absolute positions */
export function card(S, parent, { x = 0, y = 0, w, h: hh, anchor = 'c', r = 'card', tone = 'surface', shadow = true, border = true, style = {} } = {}) {
  return box(parent, { x, y, w: px(S, w), h: px(S, hh), anchor, style: { ...surface(S, { r, tone, shadow, border }), overflow: 'hidden', ...style } });
}

/** show/hide/fade an element with the standard swap (blur in / out) */
export function swap(el, t, tin, tout, o, extra = '') { return applyVis(el, vis(t, tin, tout, o), extra); }

/* ═════════ controls ═════════ */

/**
 * button(S, parent, { x, y, anchor, label, icon, variant: 'control'|'accent'|'ghost', h, w, states: [[t, label, variant?, icon?]], presses: [t] })
 */
export function button(S, parent, { x = 0, y = 0, anchor = 'c', label = 'Continue', icon: ic = null, variant = 'control', h: hh = 64, w, states = [], presses = [], size = 'body', r = 'control', minW = 0 } = {}) {
  const H = px(S, hh);
  const all = [[-1, label, variant, ic], ...states];
  const widest = Math.max(...all.map(([, l, , i]) => textWidth(l, fontStr(S, size, { w: 'semibold' })) + (i ? px(S, 34) : 0))) + px(S, 56);
  const W = w ? px(S, w) : Math.max(px(S, minW), widest);
  const el = box(parent, { x, y, w: W, h: H, anchor, style: { borderRadius: rad(S, r) + 'px', overflow: 'hidden' } });
  const bgOf = (v) => (v === 'accent' ? 'var(--accent)' : v === 'ghost' ? 'transparent' : 'var(--ui-control)');
  const fgOf = (v) => (v === 'accent' ? '#FFFFFF' : v === 'ghost' ? 'var(--ui-text)' : 'var(--ui-onControl)');
  const layers = all.map(([t0, l, v, i], k) => {
    const n = h('div', { style: { position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: px(S, 12) + 'px', background: bgOf(v || variant), outline: (v || variant) === 'ghost' ? `${px(S, 1.5)}px solid var(--ui-border)` : 'none', outlineOffset: -px(S, 1.5) + 'px', borderRadius: rad(S, r) + 'px', ...ts(S, size, { w: 'semibold', color: fgOf(v || variant) }) } });
    if (i) n.insertAdjacentHTML('afterbegin', icon(i, px(S, 26), 'currentColor'));
    n.appendChild(document.createTextNode(l));
    el.appendChild(n);
    return { n, t0, t1: k + 1 < all.length ? all[k + 1][0] : null };
  });
  const pr = track(0, presses.flatMap((c) => [[c - 0.07, 1, [45, 1]], [c + 0.035, 0, [22, 0.72]]]));
  return {
    el, w: W, h: H,
    update(t) {
      css(el, { transform: `scale(${(1 - 0.06 * clamp(pr(t))).toFixed(4)})` });
      layers.forEach((L, k) => { const on = k === 0 ? t < (L.t1 ?? Infinity) : t >= L.t0 && (L.t1 == null || t < L.t1); const a = k === 0 ? 1 : clamp((t - L.t0) / 0.12); css(L.n, { display: on ? 'flex' : 'none', opacity: a }); });
    },
  };
}

/** toggle(S, parent, { x, y, anchor, on: [[t, bool]], start: false, size }) */
export function toggle(S, parent, { x = 0, y = 0, anchor = 'c', on = [], start = false, size = 1 } = {}) {
  const W = px(S, 84 * size), H = px(S, 50 * size), K = H - px(S, 8 * size);
  const el = box(parent, { x, y, w: W, h: H, anchor, style: { borderRadius: H / 2 + 'px' } });
  const knob = h('div', { style: { position: 'absolute', top: (H - K) / 2 + 'px', left: '0px', width: K + 'px', height: K + 'px', borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,.25)' } });
  el.appendChild(knob);
  const pos = track(start ? 1 : 0, on.map(([t, b]) => [t, b ? 1 : 0, 'fast']));
  const off = S.theme === 'night' ? T.color.nightSkeleton : T.color.paperDeep;
  const col = ctrack(start ? (S.accent) : off, on.map(([t, b]) => [t, b ? S.accent : off]), [20, 1]);
  return {
    el, value: pos,
    update(t) {
      const p = pos(t), m = (H - K) / 2;
      css(el, { background: col(t) });
      css(knob, { transform: `translateX(${(m + (W - K - 2 * m) * p).toFixed(2)}px)` });
    },
  };
}

/** slider(S, parent, { x, y, w, anchor, value: t → 0..1, tooltip: v → string, ticks: n, label }) */
export function slider(S, parent, { x = 0, y = 0, w = 600, anchor = 'c', value = () => 0, tooltip = null, ticks = 0, accent = true } = {}) {
  const W = px(S, w), TH = px(S, 12), KS = px(S, 40), H = KS + px(S, 70);
  const el = box(parent, { x, y, w: W, h: H, anchor });
  const ty = H - KS / 2 - TH / 2;
  const trackEl = h('div', { style: { position: 'absolute', left: '0px', top: ty + 'px', width: W + 'px', height: TH + 'px', borderRadius: TH / 2 + 'px', background: 'var(--ui-skeleton)' } });
  const fill = h('div', { style: { position: 'absolute', left: '0px', top: ty + 'px', height: TH + 'px', borderRadius: TH / 2 + 'px', background: accent ? 'var(--accent)' : 'var(--ui-control)' } });
  const knob = h('div', { style: { position: 'absolute', top: (ty + TH / 2 - KS / 2) + 'px', width: KS + 'px', height: KS + 'px', borderRadius: '50%', background: '#FFFFFF', outline: `${px(S, 4)}px solid ${accent ? 'var(--accent)' : 'var(--ui-control)'}`, outlineOffset: -px(S, 4) + 'px', boxShadow: '0 2px 6px rgba(0,0,0,.2)' } });
  el.append(trackEl, fill);
  for (let i = 0; i <= ticks && ticks; i++) el.appendChild(h('div', { style: { position: 'absolute', left: (W * i) / ticks - px(S, 1) + 'px', top: ty + TH + px(S, 14) + 'px', width: px(S, 2) + 'px', height: px(S, 10) + 'px', background: 'var(--ui-border)' } }));
  el.appendChild(knob);
  let tip = null, tipT = null;
  if (tooltip) {
    tip = h('div', { style: { position: 'absolute', top: '0px', padding: `${px(S, 6)}px ${px(S, 14)}px`, borderRadius: px(S, 10) + 'px', background: 'var(--ui-control)', ...ts(S, 'mono', { mono: true, color: 'var(--ui-onControl)' }) } });
    tipT = h('span'); tip.appendChild(tipT); el.appendChild(tip);
  }
  return {
    el,
    knobAt: (t) => clamp(value(t)) * W,
    update(t) {
      const v = clamp(value(t)), kx = v * W;
      css(fill, { width: kx + 'px' }); css(knob, { left: (kx - KS / 2) + 'px' });
      if (tip) { setText(tipT, tooltip(v, t)); css(tip, { left: kx + 'px', transform: 'translateX(-50%)' }); }
    },
  };
}

/**
 * segmented(S, parent, { x, y, anchor, items, index: [[t, i]], start: 0, h, segW }) — the liquid indicator:
 * the leading edge rides a fast spring, the trailing edge a slow one, so the pill stretches as it moves.
 */
export function segmented(S, parent, { x = 0, y = 0, anchor = 'c', items = ['Low', 'Medium', 'High'], index = [], start = 0, h: hh = 64, segW = 170, size = 'small' } = {}) {
  const H = px(S, hh), SW = px(S, segW), W = SW * items.length, P = px(S, 5);
  const el = box(parent, { x, y, w: W, h: H, anchor, style: { borderRadius: H / 2 + 'px', background: S.theme === 'night' ? 'var(--ui-surfaceAlt)' : 'var(--ui-sunken)', isolation: 'isolate' } });
  const pill = h('div', { style: { position: 'absolute', top: P + 'px', height: (H - 2 * P) + 'px', borderRadius: (H - 2 * P) / 2 + 'px', background: 'var(--ui-control)' } });
  el.appendChild(pill);
  const lab = h('div', { style: { position: 'absolute', inset: '0', mixBlendMode: 'difference' } });
  items.forEach((s, i) => lab.appendChild(h('div', { text: s, style: { position: 'absolute', left: i * SW + 'px', width: SW + 'px', top: '0px', height: H + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center', ...ts(S, size, { w: 'semibold', color: '#FFFFFF' }) } })));
  el.appendChild(lab);
  let prev = start; const lk = [], rk = [];
  for (const [t, i] of index) { const dir = Math.sign(i - prev); lk.push([t, i * SW + P, dir > 0 ? 'slow' : 'fast']); rk.push([t, (i + 1) * SW - P, dir > 0 ? 'fast' : 'slow']); prev = i; }
  const L = track(start * SW + P, lk), R = track((start + 1) * SW - P, rk);
  return { el, update(t) { const l = L(t), r = R(t); css(pill, { left: l + 'px', width: Math.max(0, r - l) + 'px' }); } };
}

/**
 * input(S, parent, { x, y, w, h, anchor, placeholder, text, t0, cps, icon, mono, submit: { at, label } })
 * → { el, update(t), caretX(t) (px from the input's left edge, for cameras that follow typing), done }
 */
export function input(S, parent, { x = 0, y = 0, w = 760, h: hh = 92, anchor = 'c', placeholder = 'Ask anything…', text: s = '', t0 = 0, cps = T.motion.typing.cps, icon: ic = null, mono = false, size = 'body', submit = null, r = 'panel', multiline = false } = {}) {
  const W = px(S, w), H = px(S, hh), pad = px(S, 28);
  const el = box(parent, { x, y, w: W, h: H, anchor, style: { ...surface(S, { r }), overflow: 'hidden' } });
  let left = pad;
  if (ic) { el.appendChild(h('div', { html: icon(ic, px(S, 30), 'var(--ui-textMuted)'), style: { position: 'absolute', left: pad + 'px', top: (multiline ? pad : (H - px(S, 30)) / 2) + 'px' } })); left += px(S, 46); }
  const st = { ...ts(S, size, { mono, color: 'var(--ui-text)', wrap: multiline, lh: 1.35 }), position: 'absolute', left: left + 'px', top: multiline ? pad + 'px' : '50%', transform: multiline ? 'none' : 'translateY(-50%)', width: multiline ? (W - left - pad - (submit ? px(S, 70) : 0)) + 'px' : 'auto' };
  const ph = h('div', { text: placeholder, style: { ...st, color: 'var(--ui-textMuted)' } });
  const tx = h('div', { style: st }); const tspan = h('span'); const caret = h('span', { style: { display: 'inline-block', width: Math.max(2, px(S, 3)) + 'px', height: '1.05em', marginLeft: px(S, 2) + 'px', verticalAlign: '-0.15em', background: 'var(--accent)' } });
  tx.append(tspan, caret); el.append(ph, tx);
  const n = [...s].length, t1 = t0 + n / cps;
  let btn = null;
  if (submit) {
    btn = h('div', { html: icon('arrow-up', px(S, 30), 'var(--ui-onControl)'), style: { position: 'absolute', right: px(S, 18) + 'px', bottom: (multiline ? px(S, 18) : (H - px(S, 56)) / 2) + 'px', width: px(S, 56) + 'px', height: px(S, 56) + 'px', borderRadius: '50%', background: 'var(--ui-control)', display: 'flex', alignItems: 'center', justifyContent: 'center' } });
    el.appendChild(btn);
  }
  const font = fontStr(S, size, { mono });
  return {
    el, t1,
    caretX: (t) => left + textWidth([...s].slice(0, typed(t, t0, n, cps)).join(''), font),
    update(t) {
      const k = typed(t, t0, n, cps);
      css(ph, { display: k > 0 || t >= t0 ? 'none' : '' });
      setText(tspan, [...s].slice(0, k).join(''));
      const sent = submit && t >= submit.at;
      css(caret, { opacity: !sent && t >= t0 - 0.4 && caretOn(t, t0, t1) ? 1 : 0 });
      if (btn) { const p = pulse(t, submit.at, 0.08); css(btn, { background: t >= t1 ? 'var(--accent)' : 'var(--ui-control)', transform: `scale(${1 - 0.12 * p})` }); }
    },
  };
}

/** chips(S, parent, { x, y, anchor, items, at, stagger, icon }) — suggestion chips under an input */
export function chips(S, parent, { x = 0, y = 0, anchor = 'tc', items = [], at = 0, stagger = 0.08, size = 'small', gap = 14 } = {}) {
  const el = box(parent, { x, y, anchor, style: { display: 'flex', gap: px(S, gap) + 'px', transform: `translate(${anchorX(anchor)},${anchorY(anchor)})` } });
  css(el, { left: x + 'px', top: y + 'px' });
  const cs = items.map((s) => { const c = h('div', { text: s, style: { padding: `${px(S, 12)}px ${px(S, 22)}px`, borderRadius: '999px', background: 'var(--ui-surface)', outline: `${px(S, 1.5)}px solid var(--ui-border)`, outlineOffset: -px(S, 1.5) + 'px', ...ts(S, size, { w: 'medium', color: 'var(--ui-textMuted)' }) } }); el.appendChild(c); return c; });
  return { el, update(t) { cs.forEach((c, i) => { const v = vis(t, at + i * stagger, null, { din: 0 }); css(c, { opacity: v.o, transform: `translateY(${((1 - v.a) * px(S, 14)).toFixed(2)}px)`, filter: v.blur > 0.05 ? `blur(${v.blur.toFixed(2)}px)` : 'none' }); }); } };
}

/** badge / tag (brand-square or pill) */
export function badge(S, parent, { x = 0, y = 0, anchor = 'tl', text: s = 'New', tone = 'accent', square = false, size = 'micro' } = {}) {
  const el = box(parent, { x, y, anchor, style: { padding: `${px(S, 6)}px ${px(S, 14)}px`, borderRadius: square ? '0px' : '999px', background: tone === 'accent' ? 'var(--accent)' : tone === 'control' ? 'var(--ui-control)' : 'var(--ui-sunken)', ...ts(S, size, { w: 'semibold', color: tone === 'accent' ? '#FFFFFF' : tone === 'control' ? 'var(--ui-onControl)' : 'var(--ui-textMuted)' }), transform: `translate(${anchorX(anchor)},${anchorY(anchor)})` } });
  css(el, { left: x + 'px', top: y + 'px' }); el.textContent = s; return el;
}

/* ═════════ feedback ═════════ */

/** toast(S, parent, { x, y, anchor, icon, title, body, at, out, w }) slides in from the right, springs */
export function toast(S, parent, { x = 0, y = 0, anchor = 'tr', icon: ic = 'circle-check', title = 'Done', body = '', at = 0, out = null, w = 520 } = {}) {
  const W = px(S, w), H = px(S, body ? 108 : 84);
  const el = box(parent, { x, y, w: W, h: H, anchor, style: { ...surface(S, { r: 'panel', shadow: true }), display: 'flex', alignItems: 'center', gap: px(S, 18) + 'px', padding: `0 ${px(S, 24)}px`, boxSizing: 'border-box' } });
  el.insertAdjacentHTML('afterbegin', `<div style="flex:none;width:${px(S, 48)}px;height:${px(S, 48)}px;border-radius:${px(S, 14)}px;background:var(--accent);display:flex;align-items:center;justify-content:center">${icon(ic, px(S, 28), '#FFFFFF')}</div>`);
  const tb = h('div', { style: { display: 'flex', flexDirection: 'column', gap: px(S, 4) + 'px', minWidth: '0' } }, h('div', { text: title, style: ts(S, 'small', { w: 'semibold' }) }), body ? h('div', { text: body, style: ts(S, 'micro', { color: 'var(--ui-textMuted)' }) }) : null);
  el.appendChild(tb);
  const sx = track(1, [[at, 0, 'pop'], ...(out != null ? [[out, 1, 'fast']] : [])]);
  return { el, update(t) { const k = sx(t); if (t < at) { css(el, { display: 'none' }); return; } css(el, { display: 'flex', transform: `translateX(${(k * (W * 0.35 + px(S, 60))).toFixed(2)}px)`, opacity: clamp(1 - k * 1.4) }); } };
}

/** notification card (app icon, title, body, "now"). pop: scale-in with spring at `at`, nudge on `hit` */
export function notif(S, parent, { x = 0, y = 0, anchor = 'c', w = 640, app = 'Agent', title = 'Something happened', body = '', time = 'now', ic = 'bell', at = 0, out = null, hit = null } = {}) {
  const W = px(S, w), H = px(S, body ? 132 : 104);
  const el = box(parent, { x, y, w: W, h: H, anchor, style: { ...surface(S, { r: 'panel', tone: S.theme === 'night' ? 'alt' : 'surface' }), boxSizing: 'border-box', padding: `${px(S, 22)}px ${px(S, 24)}px`, display: 'flex', gap: px(S, 18) + 'px' } });
  el.insertAdjacentHTML('afterbegin', `<div style="flex:none;width:${px(S, 54)}px;height:${px(S, 54)}px;border-radius:${px(S, 14)}px;background:var(--accent);display:flex;align-items:center;justify-content:center">${icon(ic, px(S, 30), '#FFFFFF')}</div>`);
  const col = h('div', { style: { flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: px(S, 4) + 'px' } });
  const row = h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: px(S, 10) + 'px' } }, h('div', { text: app, style: ts(S, 'micro', { w: 'semibold', color: 'var(--ui-textMuted)', label: false }) }), h('div', { text: time, style: ts(S, 'micro', { color: 'var(--ui-textMuted)' }) }));
  col.append(row, h('div', { text: title, style: ts(S, 'small', { w: 'semibold' }) }));
  if (body) col.appendChild(h('div', { text: body, style: { ...ts(S, 'micro', { color: 'var(--ui-textMuted)' }), overflow: 'hidden', textOverflow: 'ellipsis' } }));
  el.appendChild(col);
  const sc = track(0, [[at, 1, 'pop']]);
  const push = hit != null ? track(0, [[hit, 1, [45, 1]], [hit + 0.06, 0, [18, 0.6]]]) : () => 0;
  return { el, h: H, update(t) { if (t < at || (out != null && t > out + 0.2)) { css(el, { display: 'none' }); return; } const k = sc(t), o = out != null ? 1 - seg(t, out, out + 0.2) : 1; css(el, { display: 'flex', opacity: clamp(k * 1.6) * o, transform: `${el.__tf || ''} translateY(${(push(t) * px(S, 10)).toFixed(2)}px) scale(${(0.86 + 0.14 * k).toFixed(4)})` }); } };
}

/** agent steps: spinner → check per row. items: [{ label, t0, t1, meta }] */
export function steps(S, parent, { x = 0, y = 0, anchor = 'tl', w = 700, items = [], gap = 64, size = 'body' } = {}) {
  const W = px(S, w), G = px(S, gap), I = px(S, 36);
  const el = box(parent, { x, y, w: W, h: G * items.length, anchor });
  const rows = items.map((it, i) => {
    const r = h('div', { style: { position: 'absolute', left: '0px', top: i * G + 'px', width: W + 'px', height: G + 'px', display: 'flex', alignItems: 'center', gap: px(S, 18) + 'px' } });
    const ic = h('div', { style: { position: 'relative', width: I + 'px', height: I + 'px', flex: 'none' } });
    const spin = h('div', { html: `<svg viewBox="0 0 36 36" width="${I}" height="${I}"><circle cx="18" cy="18" r="14" fill="none" stroke="var(--ui-skeleton)" stroke-width="4"/><circle cx="18" cy="18" r="14" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-dasharray="22 66"/></svg>`, style: { position: 'absolute', inset: '0' } });
    const ok = h('div', { html: `<div style="width:${I}px;height:${I}px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center">${icon('check', I * 0.62, '#FFFFFF', px(S, 3.2))}</div>`, style: { position: 'absolute', inset: '0' } });
    ic.append(spin, ok);
    const lab = h('div', { text: it.label, style: ts(S, size, { w: 'medium' }) });
    const meta = it.meta ? h('div', { text: it.meta, style: { ...ts(S, 'small', { mono: true, color: 'var(--ui-textMuted)' }), marginLeft: 'auto' } }) : null;
    r.append(ic, lab); if (meta) r.appendChild(meta);
    el.appendChild(r);
    return { r, spin, ok, lab, meta, it };
  });
  return {
    el,
    update(t) {
      rows.forEach(({ r, spin, ok, lab, meta, it }) => {
        const v = vis(t, it.t0, null, { din: 0, lin: 0.22 });
        if (v.o < 0.002) { css(r, { display: 'none' }); return; }
        css(r, { display: 'flex', opacity: v.o, filter: v.blur > 0.05 ? `blur(${v.blur.toFixed(2)}px)` : 'none', transform: `translateY(${((1 - v.a) * px(S, 12)).toFixed(2)}px)` });
        const done = t >= it.t1, k = spr(t, it.t1, 'stamp');
        css(spin, { display: done ? 'none' : '', transform: `rotate(${((t - it.t0) * 420) % 360}deg)` });
        css(ok, { display: done ? '' : 'none', transform: `scale(${Math.max(0, k).toFixed(4)})` });
        css(lab, { color: done ? 'var(--ui-text)' : 'var(--ui-textMuted)' });
        if (meta) css(meta, { opacity: done ? 1 : 0 });
      });
    },
  };
}

/** progress bar with percentage. p: t → 0..1 */
export function progress(S, parent, { x = 0, y = 0, anchor = 'tl', w = 600, p = () => 0, label = null, pct = true, h: hh = 12, done = null } = {}) {
  const W = px(S, w), H = px(S, hh);
  const el = box(parent, { x, y, w: W, h: H + px(S, 44), anchor });
  const tr = h('div', { style: { position: 'absolute', left: '0px', bottom: '0px', width: W + 'px', height: H + 'px', borderRadius: H / 2 + 'px', background: 'var(--ui-skeleton)' } });
  const fl = h('div', { style: { position: 'absolute', left: '0px', bottom: '0px', height: H + 'px', borderRadius: H / 2 + 'px', background: 'var(--accent)' } });
  el.append(tr, fl);
  const lab = label != null ? h('div', { text: label, style: { position: 'absolute', left: '0px', top: '0px', ...ts(S, 'micro', { label: true, color: 'var(--ui-textMuted)' }) } }) : null;
  const pc = pct ? h('div', { style: { position: 'absolute', right: '0px', top: '0px', ...ts(S, 'small', { mono: true }) } }) : null;
  if (lab) el.appendChild(lab); if (pc) el.appendChild(pc);
  return { el, update(t) { const v = clamp(p(t)); css(fl, { width: W * v + 'px' }); if (pc) setText(pc, Math.round(v * 100) + '%'); if (lab && done) setText(lab, v >= 1 ? done : label); } };
}

/** skeleton lines that grow on: widths in px@1080, at, stagger */
export function skeleton(S, parent, { x = 0, y = 0, anchor = 'tl', widths = [420, 360, 300], gap = 34, h: hh = 14, at = 0, stagger = 0.07, dur = 0.3, color = 'var(--ui-skeleton)', first = null } = {}) {
  const el = box(parent, { x, y, anchor, w: px(S, Math.max(...widths)), h: px(S, gap) * widths.length });
  const ls = widths.map((w, i) => { const l = h('div', { style: { position: 'absolute', left: '0px', top: i * px(S, gap) + 'px', height: px(S, i === 0 && first ? first.h : hh) + 'px', borderRadius: px(S, hh) + 'px', background: i === 0 && first ? first.color : color } }); el.appendChild(l); return l; });
  return { el, update(t) { ls.forEach((l, i) => css(l, { width: px(S, widths[i]) * eio((t - at - stagger * i) / dur) + 'px' })); } };
}

/* ═════════ content ═════════ */

/**
 * table(S, parent, { x, y, w, anchor, cols: [{ label, w (fraction), align, mono, accent }], rows: [[cell...]],
 *                    at, every, think: { col, t0, each, dur } (shimmer cells "thinking" before the value) , hi: [[t, row]] })
 */
export function table(S, parent, { x = 0, y = 0, anchor = 'tl', w = 900, cols = [], rows = [], at = 0, every = 0.18, rowH = 76, think = null, hi = [], size = 'small' } = {}) {
  const W = px(S, w), RH = px(S, rowH), HH = px(S, 58);
  const el = box(parent, { x, y, w: W, h: HH + RH * rows.length, anchor, style: { ...surface(S, { r: 'panel' }), overflow: 'hidden' } });
  const cx = []; let acc = px(S, 28); const inner = W - px(S, 56);
  cols.forEach((c) => { cx.push(acc); acc += inner * c.w; });
  const head = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: HH + 'px', background: 'var(--ui-surfaceAlt)', borderBottom: `${px(S, 1.5)}px solid var(--ui-border)` } });
  cols.forEach((c, i) => head.appendChild(h('div', { text: c.label, style: { position: 'absolute', left: cx[i] + 'px', width: inner * c.w + 'px', top: '50%', transform: 'translateY(-50%)', textAlign: c.align || 'left', ...ts(S, 'micro', { label: true, color: 'var(--ui-textMuted)' }) } })));
  el.appendChild(head);
  const hiEl = h('div', { style: { position: 'absolute', left: '0px', width: W + 'px', height: RH + 'px', background: 'var(--accent-soft)', display: hi.length ? '' : 'none' } });
  el.appendChild(hiEl);
  const hiY = track(hi.length ? hi[0][1] : 0, hi.map(([t, r]) => [t, r, 'fast']));
  const R = rows.map((row, ri) => {
    const r = h('div', { style: { position: 'absolute', left: '0px', top: HH + ri * RH + 'px', width: W + 'px', height: RH + 'px', borderBottom: ri < rows.length - 1 ? `${px(S, 1.5)}px solid var(--ui-border)` : 'none' } });
    const cells = row.map((v, ci) => {
      const c = cols[ci] || {};
      const cell = h('div', { style: { position: 'absolute', left: cx[ci] + 'px', width: inner * (c.w || 0.2) + 'px', top: '50%', transform: 'translateY(-50%)', textAlign: c.align || 'left', overflow: 'hidden', textOverflow: 'ellipsis', ...ts(S, size, { mono: !!c.mono, w: ci === 0 ? 'semibold' : 'regular', color: c.accent ? 'var(--accent)' : 'var(--ui-text)' }) } });
      cell.textContent = v; r.appendChild(cell);
      let sh = null;
      if (think && think.col === ci) { sh = h('div', { style: { position: 'absolute', left: cx[ci] + (c.align === 'right' ? inner * c.w - px(S, 120) : 0) + 'px', top: '50%', width: px(S, 120) + 'px', height: px(S, 16) + 'px', marginTop: -px(S, 8) + 'px', borderRadius: px(S, 8) + 'px', overflow: 'hidden', background: 'var(--ui-skeleton)' } }); sh.appendChild(h('div', { style: { position: 'absolute', top: '0px', bottom: '0px', width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent)' } })); r.appendChild(sh); }
      return { cell, sh };
    });
    el.appendChild(r);
    return { r, cells, t: at + ri * every };
  });
  return {
    el, rowH: RH, headH: HH,
    update(t) {
      if (hi.length) css(hiEl, { top: HH + hiY(t) * RH + 'px', opacity: clamp((t - hi[0][0]) / 0.2) });
      R.forEach(({ r, cells, t: rt }, ri) => {
        const v = vis(t, rt, null, { din: 0, lin: 0.2 });
        css(r, { opacity: v.o, transform: `translateY(${((1 - v.a) * px(S, 10)).toFixed(2)}px)` });
        if (think) {
          const { cell, sh } = cells[think.col]; const t0 = think.t0 + ri * (think.each ?? 0.25), t1 = t0 + (think.dur ?? 0.6);
          const showVal = t >= t1;
          css(cell, { opacity: showVal ? clamp((t - t1) / 0.15) : 0 });
          if (sh) { css(sh, { display: t >= t0 && !showVal ? '' : 'none' }); css(sh.firstChild, { left: `${((((t - t0) * 1.6) % 1) * 160 - 40).toFixed(1)}%` }); }
        }
      });
    },
  };
}

/** terminal window. lines: [{ t, kind: 'cmd'|'out'|'ok'|'dim', text, cps }] typed or printed at t */
export function terminal(S, parent, { x = 0, y = 0, anchor = 'c', w = 980, h: hh = 600, title = 'zsh', lines = [], size = 'mono', lineH = 46 } = {}) {
  const W = px(S, w), H = px(S, hh), TB = px(S, 58), LH = px(S, lineH);
  const night = S.theme === 'night';
  const el = box(parent, { x, y, w: W, h: H, anchor, style: { ...surface(S, { r: 'panel', tone: night ? 'surface' : 'surface' }), overflow: 'hidden' } });
  const bar = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: TB + 'px', borderBottom: `${px(S, 1.5)}px solid var(--ui-border)` } });
  [0, 1, 2].forEach((i) => bar.appendChild(h('div', { style: { position: 'absolute', left: px(S, 24) + i * px(S, 26) + 'px', top: (TB - px(S, 14)) / 2 + 'px', width: px(S, 14) + 'px', height: px(S, 14) + 'px', borderRadius: '50%', background: 'var(--ui-skeleton)' } })));
  bar.appendChild(h('div', { text: title, style: { position: 'absolute', left: '0px', right: '0px', top: '50%', transform: 'translateY(-50%)', textAlign: 'center', ...ts(S, 'micro', { mono: true, color: 'var(--ui-textMuted)' }) } }));
  el.appendChild(bar);
  const body = h('div', { style: { position: 'absolute', left: px(S, 32) + 'px', top: TB + px(S, 26) + 'px', right: px(S, 32) + 'px' } });
  el.appendChild(body);
  const L = lines.map((ln, i) => {
    const row = h('div', { style: { position: 'absolute', left: '0px', top: i * LH + 'px', ...ts(S, size, { mono: true, color: ln.kind === 'ok' ? 'var(--accent)' : ln.kind === 'out' || ln.kind === 'dim' ? 'var(--ui-textMuted)' : 'var(--ui-text)' }) } });
    if (ln.kind === 'cmd') row.appendChild(h('span', { text: '› ', style: { color: 'var(--accent)' } }));
    const sp1 = h('span'); row.appendChild(sp1);
    const car = h('span', { style: { display: 'inline-block', width: '0.55em', height: '1.05em', verticalAlign: '-0.18em', background: 'var(--ui-text)', marginLeft: px(S, 2) + 'px' } });
    if (ln.kind === 'cmd') row.appendChild(car);
    body.appendChild(row);
    const n = [...ln.text].length, cps = ln.cps ?? (ln.kind === 'cmd' ? T.motion.typing.fastCps : 400);
    return { row, sp1, car, ln, n, cps, t1: ln.t + n / cps };
  });
  return {
    el,
    update(t) {
      L.forEach((l, i) => {
        if (t < l.ln.t) { css(l.row, { display: 'none' }); return; }
        css(l.row, { display: '' });
        setText(l.sp1, [...l.ln.text].slice(0, typed(t, l.ln.t, l.n, l.cps)).join(''));
        const next = L[i + 1];
        css(l.car, { opacity: (!next || t < next.ln.t) && caretOn(t, l.ln.t, l.t1) ? 1 : 0 });
      });
    },
  };
}

/** chat thread. msgs: [{ who: 'user'|'ai', text, t, typing (sec of dots before text) }] stacked from the top */
export function chat(S, parent, { x = 0, y = 0, anchor = 'tl', w = 760, msgs = [], gap = 22, size = 'small' } = {}) {
  const W = px(S, w);
  const el = box(parent, { x, y, w: W, h: px(S, 10), anchor });
  let yy = 0;
  const M = msgs.map((m) => {
    const user = m.who === 'user';
    const maxW = W * 0.82;
    const lines = wrapLines(m.text, fontStr(S, size), maxW - px(S, 48));
    const bh = lines.length * px(S, TY[size] * 1.35) + px(S, 34);
    const bw = Math.min(maxW, Math.max(...lines.map((l) => textWidth(l, fontStr(S, size)))) + px(S, 48));
    const b = h('div', { style: { position: 'absolute', top: yy + 'px', [user ? 'right' : 'left']: '0px', width: bw + 'px', height: bh + 'px', borderRadius: px(S, 22) + 'px', boxSizing: 'border-box', padding: `${px(S, 17)}px ${px(S, 24)}px`, background: user ? 'var(--ui-control)' : 'var(--ui-surface)', outline: user ? 'none' : `${px(S, 1.5)}px solid var(--ui-border)`, outlineOffset: -px(S, 1.5) + 'px', ...ts(S, size, { color: user ? 'var(--ui-onControl)' : 'var(--ui-text)', wrap: true, lh: 1.35 }) } });
    const tx = h('div'); b.appendChild(tx);
    const dots = h('div', { style: { display: 'flex', gap: px(S, 8) + 'px', alignItems: 'center', height: '100%' } });
    for (let i = 0; i < 3; i++) dots.appendChild(h('div', { style: { width: px(S, 10) + 'px', height: px(S, 10) + 'px', borderRadius: '50%', background: 'var(--ui-textMuted)' } }));
    b.appendChild(dots);
    el.appendChild(b);
    const top = yy; yy += bh + px(S, gap);
    return { b, tx, dots, m, lines, top, bh, bw };
  });
  css(el, { height: yy + 'px' });
  return {
    el, height: yy, bottomAt: (t) => { let b = 0; M.forEach((q) => { if (t >= q.m.t) b = q.top + q.bh; }); return b; },
    update(t) {
      M.forEach(({ b, tx, dots, m, lines }) => {
        if (t < m.t) { css(b, { display: 'none' }); return; }
        const k = spr(t, m.t, 'pop');
        css(b, { display: '', opacity: clamp(k * 1.5), transform: `translateY(${((1 - k) * px(S, 16)).toFixed(2)}px) scale(${(0.94 + 0.06 * k).toFixed(4)})`, transformOrigin: m.who === 'user' ? '100% 100%' : '0 100%' });
        const typing = m.typing && t < m.t + m.typing;
        css(dots, { display: typing ? 'flex' : 'none' });
        if (typing) [...dots.children].forEach((d, i) => css(d, { transform: `translateY(${(-Math.max(0, Math.sin((t - m.t) * 9 - i * 0.9)) * px(S, 6)).toFixed(2)}px)` }));
        css(tx, { display: typing ? 'none' : '' });
        if (!typing) { const full = lines.join('\n'); const t0 = m.t + (m.typing || 0); const n = m.who === 'user' ? full.length : typed(t, t0, full.length, m.cps || 60); setText(tx, full.slice(0, n)); css(tx, { whiteSpace: 'pre-wrap' }); }
      });
    },
  };
}
export function wrapLines(s, font, maxW) {
  const words = String(s).split(/\s+/); const out = []; let line = '';
  for (const w of words) { const test = line ? line + ' ' + w : w; if (line && textWidth(test, font) > maxW) { out.push(line); line = w; } else line = test; }
  if (line) out.push(line); return out;
}

/** file tile (icon + name), for drag and drop */
export function fileTile(S, parent, { x = 0, y = 0, anchor = 'c', name = 'brief.pdf', ic = 'file-text', w = 300 } = {}) {
  const W = px(S, w), H = px(S, 92);
  const el = box(parent, { x, y, w: W, h: H, anchor, style: { ...surface(S, { r: 'control' }), display: 'flex', alignItems: 'center', gap: px(S, 16) + 'px', padding: `0 ${px(S, 22)}px`, boxSizing: 'border-box' } });
  el.insertAdjacentHTML('afterbegin', `<div style="flex:none;width:${px(S, 50)}px;height:${px(S, 50)}px;border-radius:${px(S, 12)}px;background:var(--ui-sunken);display:flex;align-items:center;justify-content:center">${icon(ic, px(S, 28), 'var(--ui-text)')}</div>`);
  el.appendChild(h('div', { text: name, style: ts(S, 'small', { mono: true }) }));
  return el;
}

/** keyboard (3 letter rows + space/return). presses: [[t, 'k'], ...]; returns key centres for heroes */
export function keyboard(S, parent, { x = 0, y = 0, anchor = 'c', w = 900, presses = [], ret = null } = {}) {
  const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  const W = px(S, w), KW = W / 10.6, G = KW * 0.12, KH = KW * 1.12, H = (KH + G) * 4 + G;
  const el = box(parent, { x, y, w: W, h: H, anchor, style: { ...surface(S, { r: 'panel', tone: 'alt' }), boxSizing: 'border-box' } });
  const keys = {};
  rows.forEach((r, ri) => {
    const off = (W - (r.length * (KW + G) - G)) / 2;
    [...r].forEach((ch, ci) => { const k = h('div', { text: ch, style: { position: 'absolute', left: off + ci * (KW + G) + 'px', top: G + ri * (KH + G) + 'px', width: KW + 'px', height: KH + 'px', borderRadius: px(S, 10) + 'px', background: 'var(--ui-surface)', boxShadow: `0 ${px(S, 2)}px 0 var(--ui-border)`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...ts(S, 'small', { w: 'medium' }) } }); el.appendChild(k); keys[ch] = { k, cx: off + ci * (KW + G) + KW / 2, cy: G + ri * (KH + G) + KH / 2 }; });
  });
  const sp = h('div', { style: { position: 'absolute', left: (W - KW * 5) / 2 + 'px', top: G + 3 * (KH + G) + 'px', width: KW * 5 + 'px', height: KH + 'px', borderRadius: px(S, 10) + 'px', background: 'var(--ui-surface)', boxShadow: `0 ${px(S, 2)}px 0 var(--ui-border)` } });
  const rt = h('div', { text: 'return', style: { position: 'absolute', right: G * 2 + 'px', top: G + 3 * (KH + G) + 'px', width: KW * 2 + 'px', height: KH + 'px', borderRadius: px(S, 10) + 'px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...ts(S, 'micro', { w: 'semibold', color: '#FFFFFF' }) } });
  el.append(sp, rt); keys[' '] = { k: sp, cx: W / 2, cy: G + 3 * (KH + G) + KH / 2 }; keys['\n'] = { k: rt, cx: W - G * 2 - KW, cy: G + 3 * (KH + G) + KH / 2 };
  const all = [...presses, ...(ret != null ? [[ret, '\n']] : [])];
  return {
    el, keys, W, H,
    update(t) {
      for (const [ch, K] of Object.entries(keys)) {
        let p = 0; for (const [tt, c] of all) if (c === ch) p = Math.max(p, pulse(t, tt + 0.03, 0.06));
        css(K.k, { transform: `translateY(${(p * px(S, 4)).toFixed(2)}px)`, boxShadow: `0 ${(px(S, 2) * (1 - p)).toFixed(2)}px 0 var(--ui-border)`, background: ch === '\n' ? 'var(--accent)' : p > 0.3 ? 'var(--ui-sunken)' : 'var(--ui-surface)' });
      }
    },
  };
}

/** browser window chrome. → { el, content } */
export function browser(S, parent, { x = 0, y = 0, anchor = 'c', w = 1400, h: hh = 860, url = 'app.example.com', r = 'panel' } = {}) {
  const W = px(S, w), H = px(S, hh), TB = px(S, 64);
  const el = box(parent, { x, y, w: W, h: H, anchor, style: { ...surface(S, { r }), overflow: 'hidden' } });
  const bar = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: TB + 'px', background: 'var(--ui-surfaceAlt)', borderBottom: `${px(S, 1.5)}px solid var(--ui-border)` } });
  [0, 1, 2].forEach((i) => bar.appendChild(h('div', { style: { position: 'absolute', left: px(S, 26) + i * px(S, 26) + 'px', top: (TB - px(S, 14)) / 2 + 'px', width: px(S, 14) + 'px', height: px(S, 14) + 'px', borderRadius: '50%', background: 'var(--ui-skeleton)' } })));
  bar.appendChild(h('div', { html: `${icon('lock', px(S, 18), 'var(--ui-textMuted)')}<span>${url}</span>`, style: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', gap: px(S, 10) + 'px', padding: `${px(S, 8)}px ${px(S, 26)}px`, borderRadius: '999px', background: 'var(--ui-surface)', ...ts(S, 'micro', { mono: true, color: 'var(--ui-textMuted)' }) } }));
  el.appendChild(bar);
  const content = h('div', { style: { position: 'absolute', left: '0px', top: TB + 'px', width: W + 'px', height: (H - TB) + 'px', overflow: 'hidden' } });
  el.appendChild(content);
  return { el, content, W, H: H - TB };
}

/** phone frame. → { el, content } */
export function phone(S, parent, { x = 0, y = 0, anchor = 'c', w = 520, h: hh = 1060 } = {}) {
  const W = px(S, w), H = px(S, hh), B = px(S, 14);
  const el = box(parent, { x, y, w: W, h: H, anchor, style: { borderRadius: px(S, 72) + 'px', background: T.color.ink, boxShadow: 'var(--ui-shadow)' } });
  const content = h('div', { style: { position: 'absolute', left: B + 'px', top: B + 'px', width: W - 2 * B + 'px', height: H - 2 * B + 'px', borderRadius: px(S, 60) + 'px', overflow: 'hidden', background: 'var(--ui-canvas)' } });
  el.appendChild(content);
  el.appendChild(h('div', { style: { position: 'absolute', left: '50%', top: B + px(S, 16) + 'px', width: px(S, 130) + 'px', height: px(S, 36) + 'px', marginLeft: -px(S, 65) + 'px', borderRadius: '999px', background: T.color.ink } }));
  return { el, content, W: W - 2 * B, H: H - 2 * B };
}

/** app shell: sidebar with nav items + top bar; → { el, content, navY(i) } */
export function appShell(S, parent, { x = 0, y = 0, anchor = 'c', w = 1600, h: hh = 940, product = 'Product', nav = ['Home', 'Projects', 'Agents', 'Settings'], navIcons = ['house', 'folder', 'bot', 'settings'], active = 0, title = 'Home', sidebar = true } = {}) {
  const W = px(S, w), H = px(S, hh), SB = sidebar ? px(S, 300) : 0, TB = px(S, 84);
  const el = box(parent, { x, y, w: W, h: H, anchor, style: { ...surface(S, { r: 'panel' }), overflow: 'hidden' } });
  const side = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: SB + 'px', height: H + 'px', background: 'var(--ui-surfaceAlt)', borderRight: `${px(S, 1.5)}px solid var(--ui-border)` } });
  side.appendChild(h('div', { html: `<span style="display:inline-block;width:${px(S, 30)}px;height:${px(S, 30)}px;background:var(--accent)"></span><span>${product}</span>`, style: { position: 'absolute', left: px(S, 30) + 'px', top: px(S, 28) + 'px', display: 'flex', alignItems: 'center', gap: px(S, 14) + 'px', ...ts(S, 'small', { w: 'bold' }) } }));
  nav.forEach((n, i) => side.appendChild(h('div', { html: `${icon(navIcons[i] || 'circle', px(S, 24), i === active ? 'var(--ui-text)' : 'var(--ui-textMuted)')}<span>${n}</span>`, style: { position: 'absolute', left: px(S, 18) + 'px', right: px(S, 18) + 'px', top: px(S, 110) + i * px(S, 58) + 'px', height: px(S, 48) + 'px', borderRadius: px(S, 12) + 'px', padding: `0 ${px(S, 14)}px`, display: 'flex', alignItems: 'center', gap: px(S, 14) + 'px', background: i === active ? 'var(--ui-surface)' : 'transparent', ...ts(S, 'small', { w: i === active ? 'semibold' : 'regular', color: i === active ? 'var(--ui-text)' : 'var(--ui-textMuted)' }) } })));
  const top = h('div', { style: { position: 'absolute', left: SB + 'px', top: '0px', right: '0px', height: TB + 'px', borderBottom: `${px(S, 1.5)}px solid var(--ui-border)` } });
  top.appendChild(h('div', { text: title, style: { position: 'absolute', left: px(S, 36) + 'px', top: '50%', transform: 'translateY(-50%)', ...ts(S, 'h3', { w: 'semibold' }) } }));
  top.appendChild(h('div', { style: { position: 'absolute', right: px(S, 30) + 'px', top: '50%', width: px(S, 44) + 'px', height: px(S, 44) + 'px', marginTop: -px(S, 22) + 'px', borderRadius: '50%', background: 'var(--ui-sunken)' } }));
  if (sidebar) el.appendChild(side); else top.insertAdjacentHTML('afterbegin', `<span style="position:absolute;right:${px(S, 96)}px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:${px(S, 10)}px;${Object.entries(ts(S, 'small', { w: 'bold' })).map(([k, v]) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()) + ':' + v).join(';')}"><span style="display:inline-block;width:${px(S, 22)}px;height:${px(S, 22)}px;background:var(--accent)"></span>${product}</span>`);
  el.appendChild(top);
  const content = h('div', { style: { position: 'absolute', left: SB + 'px', top: TB + 'px', width: W - SB + 'px', height: H - TB + 'px', overflow: 'hidden' } });
  el.appendChild(content);
  return { el, content, W: W - SB, H: H - TB, sidebar: SB, topbar: TB };
}

/** list rows with icon, label, meta; highlight moves (fast spring); filter fades non-matching rows */
export function list(S, parent, { x = 0, y = 0, anchor = 'tl', w = 760, items = [], rowH = 84, hi = [], at = 0, stagger = 0.06, filter = [] } = {}) {
  const W = px(S, w), RH = px(S, rowH);
  const el = box(parent, { x, y, w: W, h: RH * items.length, anchor });
  const hiEl = h('div', { style: { position: 'absolute', left: '0px', width: W + 'px', height: RH + 'px', borderRadius: px(S, 14) + 'px', background: 'var(--accent-soft)', display: hi.length ? '' : 'none' } });
  el.appendChild(hiEl);
  const hy = track(hi.length ? hi[0][1] : 0, hi.map(([t, i]) => [t, i, 'fast']));
  const rows = items.map((it, i) => {
    const r = h('div', { style: { position: 'absolute', left: '0px', top: i * RH + 'px', width: W + 'px', height: RH + 'px', display: 'flex', alignItems: 'center', gap: px(S, 18) + 'px', padding: `0 ${px(S, 18)}px`, boxSizing: 'border-box' } });
    r.insertAdjacentHTML('afterbegin', `<div style="flex:none;width:${px(S, 48)}px;height:${px(S, 48)}px;border-radius:${px(S, 12)}px;background:var(--ui-sunken);display:flex;align-items:center;justify-content:center">${icon(it.icon || 'file', px(S, 26), 'var(--ui-text)')}</div>`);
    r.appendChild(h('div', { text: it.label, style: ts(S, 'small', { w: 'medium' }) }));
    if (it.meta) r.appendChild(h('div', { text: it.meta, style: { ...ts(S, 'micro', { mono: true, color: 'var(--ui-textMuted)' }), marginLeft: 'auto' } }));
    el.appendChild(r);
    return { r, it };
  });
  // filter: [[t, 'query']] → rows not matching fade and the rest slide up
  const keep = (q, it) => !q || it.label.toLowerCase().includes(q.toLowerCase());
  const order = rows.map((row, i) => { let last = i; return track(i, filter.map(([t, q]) => { const shown = rows.filter((r) => keep(q, r.it)); const idx = shown.indexOf(row); if (idx >= 0) last = idx; return [t, last, 'soft']; })); });
  const alive = rows.map((r) => track(1, filter.map(([t, q]) => [t, keep(q, r.it) ? 1 : 0, 'fast'])));
  return {
    el, rowH: RH,
    update(t) {
      if (hi.length) css(hiEl, { top: hy(t) * RH + 'px', opacity: clamp((t - hi[0][0]) / 0.15) });
      rows.forEach(({ r }, i) => { const v = vis(t, at + i * stagger, null, { din: 0, lin: 0.2 }); const a = clamp(alive[i](t)); css(r, { opacity: v.o * a, top: order[i](t) * RH + 'px', transform: `translateX(${((1 - v.a) * -px(S, 16)).toFixed(2)}px) scale(${(0.96 + 0.04 * a).toFixed(4)})` }); });
    },
  };
}

/** avatar circle with initials */
export function avatar(S, parent, { x = 0, y = 0, anchor = 'c', size = 64, initials = 'AK', tone = 'control' } = {}) {
  const D = px(S, size);
  const el = box(parent, { x, y, w: D, h: D, anchor, style: { borderRadius: '50%', background: tone === 'accent' ? 'var(--accent)' : tone === 'sunken' ? 'var(--ui-sunken)' : 'var(--ui-control)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...ts(S, size * 0.36, { w: 'semibold', color: tone === 'sunken' ? 'var(--ui-text)' : tone === 'accent' ? '#FFFFFF' : 'var(--ui-onControl)' }) } });
  el.textContent = initials; return el;
}

/** stat block: label, big number (counts), delta */
export function stat(S, parent, { x = 0, y = 0, anchor = 'tl', label = 'Revenue', value = () => 0, fmt = (v) => fmtNum(v), delta = null, size = 96, w = 420 } = {}) {
  const el = box(parent, { x, y, w: px(S, w), anchor });
  const lab = h('div', { text: label, style: ts(S, 'micro', { label: true, color: 'var(--ui-textMuted)' }) });
  const num = h('div', { style: { ...ts(S, size, { w: 'bold', track: -0.03, lh: 1.05 }), fontVariationSettings: '"wdth" 112', marginTop: px(S, 10) + 'px' } });
  el.append(lab, num);
  if (delta) el.appendChild(h('div', { html: `${icon(delta.startsWith('-') || delta.startsWith('−') ? 'trending-down' : 'trending-up', px(S, 22), 'var(--accent)')}<span>${delta}</span>`, style: { display: 'flex', alignItems: 'center', gap: px(S, 8) + 'px', marginTop: px(S, 8) + 'px', ...ts(S, 'small', { mono: true, color: 'var(--accent)' }) } }));
  return { el, update(t) { setText(num, fmt(value(t))); } };
}

export { anchorX, anchorY, px, sp, ease, lerp, eo, eio, seg };
