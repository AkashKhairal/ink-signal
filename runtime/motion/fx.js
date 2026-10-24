// Ink & Signal — brand devices and effects for the motion engine: HUD frame, grain, vignette, ticker,
// selection gizmo, glyph stamps, handwritten notes with arrows, and transitions that are objects
// (flood, dot, bars, torn paper, zoom-through word), plus a spotlight for screen recordings.
import { h, css, setText, glyph } from './dom.js';
import { T, track, vis, seg, eo, eio, clamp, lerp, spr, ease, rng, kf, pulse } from './engine.js';
import { tornPanelPath, arrowPaths, scribbleEllipse, fmtTC, applyCase } from '../core.js';
import { px, ts } from './ui.js';
import { fstyle, caseOf } from './type.js';
import { col } from './stage.js';

const full = (S) => ({ position: 'absolute', left: '0px', top: '0px', width: S.W + 'px', height: S.H + 'px' });

/* ═════════ HUD frame (viewfinder) ═════════ */
/**
 * hudFrame(S, { scenes: [[t, n, 'CATEGORY']], total, at, tl, color, inset, fps })
 * Thin corner brackets, SCENE nn / tt top right, category bottom left, running timecode with a red dot bottom right.
 */
export function hudFrame(S, { scenes = [[0, 1, 'SIGNAL']], total = 6, at = 0, tl = null, color = null, colors = null, inset = null, fps = 30, layer = null, safe = null } = {}) {
  const HF = T.hudFrame, c = 'currentColor', c0 = col(color || (S.theme === 'night' ? '#FFFFFF' : T.color.ink), S.accent);
  const I = px(S, inset ?? HF.inset), B = px(S, HF.bracket), sw = px(S, HF.strokePx);
  const top = safe ? Math.max(I, safe.top) : I, bot = safe ? Math.max(I, safe.bottom) : I, right = safe ? Math.max(I, safe.right) : I;
  const el = h('div', { style: { ...full(S), opacity: String(HF.opacity), color: c0 } });
  const corners = [[I, top, 1, 1], [S.W - right, top, -1, 1], [I, S.H - bot, 1, -1], [S.W - right, S.H - bot, -1, -1]];
  el.innerHTML = `<svg width="${S.W}" height="${S.H}" style="position:absolute;left:0;top:0">${corners.map(([x, y, dx, dy]) => `<path d="M${x} ${y + dy * B}L${x} ${y}L${x + dx * B} ${y}" fill="none" stroke="${c}" stroke-width="${sw}"/>`).join('')}</svg>`;
  const tsz = px(S, HF.textPx);
  const lab = (styles) => { const d = h('div', { style: { position: 'absolute', fontFamily: '"IS dataSoft"', fontSize: tsz + 'px', color: c, letterSpacing: '0.08em', whiteSpace: 'nowrap', ...styles } }); el.appendChild(d); return d; };
  const off = B * 0.35 + px(S, 10);
  const sc = lab({ right: right + off + 'px', top: top + px(S, 2) + 'px' });
  const cat = lab({ left: I + off + 'px', bottom: bot + px(S, 2) + 'px' });
  const tc = lab({ right: right + off + 'px', bottom: bot + px(S, 2) + 'px', display: 'flex', alignItems: 'center', gap: px(S, 8) + 'px' });
  const dot = h('span', { style: { width: tsz * 0.6 + 'px', height: tsz * 0.6 + 'px', borderRadius: '50%', background: T.color.signal } }); const tct = h('span'); tc.append(dot, tct);
  if (tl) lab({ left: I + off + 'px', top: top + px(S, 2) + 'px' }).textContent = tl;
  (layer || S.front).appendChild(el);
  return {
    el,
    update(t) {
      const v = clamp((t - at) / 0.3); css(el, { opacity: (HF.opacity * v).toFixed(3) });
      if (colors) { let cc = c0; for (const [tt, k] of colors) if (t >= tt) cc = col(k, S.accent); css(el, { color: cc }); }
      let cur = scenes[0]; for (const s of scenes) if (t >= s[0]) cur = s;
      setText(sc, `SCENE ${String(cur[1]).padStart(2, '0')} / ${String(total).padStart(2, '0')}`);
      setText(cat, cur[2] || '');
      setText(tct, fmtTC(Math.max(0, Math.floor(t * fps)), fps));
      css(dot, { opacity: Math.floor(t * 2) % 2 === 0 ? 1 : 0.25 });
    },
  };
}

/* ═════════ grain & vignette ═════════ */
/** film grain: seeded tiles generated once, cycled per frame (deterministic) */
export function grain(S, { amount = T.footage.grain.amount, seed = 7, fps = 30, layer = null, tiles = 6 } = {}) {
  const TS = 256, r = rng(seed);
  const pats = [];
  const cv = h('canvas', { width: Math.ceil(S.W / 2), height: Math.ceil(S.H / 2), style: { ...full(S), mixBlendMode: 'overlay', opacity: String(amount * 2.2), imageRendering: 'pixelated' } });
  const x = cv.getContext('2d');
  for (let k = 0; k < tiles; k++) {
    const c = document.createElement('canvas'); c.width = TS; c.height = TS; const cx = c.getContext('2d'); const img = cx.createImageData(TS, TS);
    for (let i = 0; i < img.data.length; i += 4) { const v = (r() * 255) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    cx.putImageData(img, 0, 0); pats.push(x.createPattern(c, 'repeat'));
  }
  (layer || S.top).appendChild(cv);
  let last = -1;
  return { el: cv, update(t) { const f = Math.floor(t * fps); if (f === last) return; last = f; const k = ((f % tiles) + tiles) % tiles; x.save(); x.fillStyle = pats[k]; x.translate((f * 37) % TS, (f * 91) % TS); x.fillRect(-TS, -TS, cv.width + TS, cv.height + TS); x.restore(); } };
}
/** soft radial vignette drawn once on a canvas (cheap to screenshot) */
export function vignette(S, { strength = 0.35, layer = null, color = '0,0,0' } = {}) {
  const cv = h('canvas', { width: Math.ceil(S.W / 4), height: Math.ceil(S.H / 4), style: { ...full(S) } });
  const x = cv.getContext('2d'); const w = cv.width, hh = cv.height;
  const g = x.createRadialGradient(w / 2, hh / 2, Math.min(w, hh) * 0.35, w / 2, hh / 2, Math.hypot(w, hh) * 0.62);
  g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(1, `rgba(${color},${strength})`);
  x.fillStyle = g; x.fillRect(0, 0, w, hh);
  (layer || S.front).appendChild(cv);
  return { el: cv, update() {} };
}

/* ═════════ ticker band ═════════ */
/** linear marquee with the glyph cluster as separator. Never eases. */
export function ticker(S, parent, { y = 0, x = 0, w = null, items = ['Ink', 'Signal'], h: hh = T.typeScale.reel.tickerBand, size = T.typeScale.reel.ticker, speed = T.speed.tickerPxPerSec, dir = -1, band = 'ink', color = 'white', font = 'label', at = null } = {}) {
  const W = w ?? S.W, H = px(S, hh);
  const el = h('div', { style: { position: 'absolute', left: x + 'px', top: y + 'px', width: W + 'px', height: H + 'px', overflow: 'hidden', background: band ? col(band, S.accent) : 'transparent', borderTop: `1px solid ${T.color.nightLine}`, borderBottom: `1px solid ${T.color.nightLine}` } });
  const strip = h('div', { style: { position: 'absolute', left: '0px', top: '0px', height: H + 'px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' } });
  const gap = px(S, size) * 1.15, sepH = px(S, size) * 0.66;
  const unit = () => { const u = h('div', { style: { display: 'flex', alignItems: 'center' } }); items.forEach((s) => { u.appendChild(h('span', { text: caseOf(font, s), style: { ...fstyle(S, font, size, { color: col(color, S.accent) }), lineHeight: '1', marginRight: gap + 'px' } })); u.appendChild(h('span', { html: ['star', 'sparkle', 'plus'].map((g) => glyph(g, sepH, col(color, S.accent))).join(`<i style="display:inline-block;width:${sepH * 0.25}px"></i>`), style: { display: 'flex', marginRight: gap + 'px' } })); }); return u; };
  const units = [unit(), unit(), unit(), unit(), unit(), unit()];
  units.forEach((u) => strip.appendChild(u));
  el.appendChild(strip); parent.appendChild(el);
  let U = null;
  return { el, update(t) { if (U == null) U = units[0].offsetWidth; const travel = (((t * speed * S.u) % U) + U) % U; css(strip, { transform: `translateX(${(dir < 0 ? -travel : travel - U).toFixed(2)}px)` }); if (at != null) css(el, { opacity: t >= at ? 1 : 0 }); } };
}

/* ═════════ selection gizmo ═════════ */
/**
 * gizmo(S, parent, { x, y, w, h, at, color, handles, label, out }) — the brand's hero device in 2D:
 * box draws (6f, snap) → handles pop (4f, stamp). Coordinates are the box's top-left in the parent layer.
 */
export function gizmo(S, parent, { x = 0, y = 0, w = 300, h: hh = 120, at = 0, out = null, color = 'accent', handles = 8, label = null, sw = T.stroke.selection.reel, hs = T.stroke.handle.reel, track: trk = null } = {}) {
  const c = col(color, S.accent);
  const el = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: '0px', height: '0px', zIndex: 5 } });
  const boxEl = h('div', { style: { position: 'absolute', outline: `${px(S, sw)}px solid ${c}`, outlineOffset: '0px' } });
  el.appendChild(boxEl);
  const pts = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]].slice(0, handles);
  const H = pts.map(() => { const d = h('div', { style: { position: 'absolute', width: px(S, hs) + 'px', height: px(S, hs) + 'px', marginLeft: -px(S, hs) / 2 + 'px', marginTop: -px(S, hs) / 2 + 'px', background: '#FFFFFF', outline: `${px(S, sw)}px solid ${c}`, outlineOffset: -px(S, sw) / 2 + 'px' } }); el.appendChild(d); return d; });
  let lab = null;
  if (label) { lab = h('div', { text: label, style: { position: 'absolute', fontFamily: '"IS data"', fontSize: px(S, 18) + 'px', color: '#FFFFFF', background: c, padding: `${px(S, 4)}px ${px(S, 10)}px`, whiteSpace: 'nowrap' } }); el.appendChild(lab); }
  parent.appendChild(el);
  const d1 = at + T.duration.selectionDraw / 30, d2 = d1 + T.duration.handlePop / 30;
  return {
    el, landed: d2,
    update(t) {
      let X = x, Y = y, Wd = w, Ht = hh;
      if (trk) ({ x: X, y: Y, w: Wd, h: Ht } = trk(t));
      const o = out != null ? 1 - seg(t, out, out + 0.15) : 1;
      if (t < at || o <= 0) { css(el, { display: 'none' }); return; }
      css(el, { display: '', opacity: o });
      const p = ease('snap')(seg(t, at, d1));
      css(boxEl, { left: X + 'px', top: Y + 'px', width: Wd * p + 'px', height: Ht * p + 'px' });
      const k = spr(t, d1, 'stamp');
      pts.forEach(([fx, fy], i) => css(H[i], { left: X + Wd * fx + 'px', top: Y + Ht * fy + 'px', transform: `scale(${Math.max(0, t >= d1 ? k : 0).toFixed(4)})` }));
      if (lab) css(lab, { left: X - px(S, sw) / 2 + 'px', top: Y - px(S, 34) + 'px', opacity: t >= d1 ? 1 : 0 });
    },
  };
}

/* ═════════ glyph stamps ═════════ */
/** star / sparkle / plus stamp in: rotate −90°→0°, scale 0→1 with overshoot */
export function stamp(S, parent, { x = 0, y = 0, name = 'star', size = 60, color = 'accent', at = 0, out = null } = {}) {
  const D = px(S, size);
  const el = h('div', { html: glyph(name, D, col(color, S.accent)), style: { position: 'absolute', left: x - D / 2 + 'px', top: y - D / 2 + 'px', width: D + 'px', height: D + 'px' } });
  parent.appendChild(el);
  return { el, update(t) { if (t < at || (out != null && t > out + 0.2)) { css(el, { opacity: 0 }); return; } const k = spr(t, at, 'stamp'); const o = out != null ? 1 - seg(t, out, out + 0.2) : 1; css(el, { opacity: o, transform: `rotate(${lerp(-90, 0, clamp(k)).toFixed(2)}deg) scale(${Math.max(0, k).toFixed(4)})` }); } };
}
export function glyphRow(S, parent, { x = 0, y = 0, size = 56, gap = 20, at = 0, color = 'ink', stagger = T.duration.stampStagger / 30 } = {}) {
  const names = ['star', 'sparkle', 'plus']; const tot = 3 * px(S, size) + 2 * px(S, gap);
  const ss = names.map((n, i) => stamp(S, parent, { x: x - tot / 2 + px(S, size) / 2 + i * (px(S, size) + px(S, gap)), y, name: n, size, color, at: at + i * stagger }));
  return { update(t) { ss.forEach((s) => s.update(t)); } };
}

/* ═════════ handwritten note + arrow ═════════ */
/**
 * note(S, parent, { x, y, text, size, color, rot, at, arrow: { from: [x,y], to: [x,y], bend }, circle: { x, y, w, h } })
 * Caveat in pen blue (white on night), written on left → right; the arrow draws after the words.
 */
export function note(S, parent, { x = 0, y = 0, text = 'this part', size = 62, color = null, rot = -4, at = 0, dur = T.duration.writeOn / 30, arrow = null, circle = null, anchor = 'tl' } = {}) {
  const c = color ? col(color, S.accent) : S.theme === 'night' ? '#FFFFFF' : T.color.pen;
  const el = h('div', { text, style: { position: 'absolute', left: x + 'px', top: y + 'px', ...fstyle(S, 'note', size, { color: c }), transform: `translate(${anchor[1] === 'c' ? '-50%' : anchor[1] === 'r' ? '-100%' : '0'},${anchor[0] === 'c' ? '-50%' : anchor[0] === 'b' ? '-100%' : '0'}) rotate(${rot}deg)`, transformOrigin: '0 50%' } });
  parent.appendChild(el);
  let svg = null, shaft = null, head = null, ring = null, L1 = 0, L2 = 0, L3 = 0;
  if (arrow || circle) {
    svg = h('svg', { width: S.W * 3, height: S.H * 3, style: { position: 'absolute', left: '0px', top: '0px', overflow: 'visible' } });
    if (arrow) { const ap = arrowPaths(arrow.from, arrow.to, { bend: arrow.bend ?? 0.3, head: px(S, 26) }); shaft = h('path', { d: ap.shaft, fill: 'none', stroke: c, 'stroke-width': px(S, T.stroke.pen), 'stroke-linecap': 'round' }); head = h('path', { d: ap.head, fill: 'none', stroke: c, 'stroke-width': px(S, T.stroke.pen), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); svg.append(shaft, head); }
    if (circle) { ring = h('path', { d: scribbleEllipse(circle.w, circle.h, 3), transform: `translate(${circle.x - circle.w / 2},${circle.y - circle.h / 2})`, fill: 'none', stroke: T.color.signalDeep, 'stroke-width': px(S, 4), 'stroke-linecap': 'round' }); svg.appendChild(ring); }
    parent.appendChild(svg);
    if (shaft) { L1 = shaft.getTotalLength(); L2 = head.getTotalLength(); }
    if (ring) L3 = ring.getTotalLength();
  }
  const aT = at + dur * 0.7, aD = T.duration.arrowDraw / 30, cT = at + dur * 0.5, cD = T.duration.circleDraw / 30;
  return {
    el,
    update(t) {
      const p = ease('write')(seg(t, at, at + dur));
      css(el, { clipPath: `inset(-30% ${((1 - p) * 100).toFixed(2)}% -40% -5%)`, opacity: t >= at ? 1 : 0 });
      if (shaft) { const q = ease('write')(seg(t, aT, aT + aD)), r = ease('write')(seg(t, aT + aD - 0.06, aT + aD + 0.1)); css(shaft, { strokeDasharray: `${L1 * q} ${L1 + 10}` }); css(head, { strokeDasharray: `${L2 * r} ${L2 + 10}` }); }
      if (ring) { const q = ease('write')(seg(t, cT, cT + cD)); css(ring, { strokeDasharray: `${L3 * q} ${L3 + 10}` }); }
    },
  };
}

/* ═════════ transitions as objects ═════════ */
/**
 * flood(S, parent, { at, dur, color, y, from: 'line'|'centre' }) — a thin accent line across the frame
 * expands vertically into a full-screen flood that becomes the next background. Covered from `at`.
 */
export function flood(S, parent, { at = 1, dur = 0.42, color = 'accent', y = null, lineAt = null, hold = null, exit = null, label = null } = {}) {
  const c = col(color, S.accent), Y = y ?? S.H / 2, lt = lineAt ?? at - 0.5;
  const el = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: S.W + 'px', height: S.H + 'px', pointerEvents: 'none' } });
  const bar = h('div', { style: { position: 'absolute', left: '0px', width: S.W + 'px', background: c } });
  el.appendChild(bar);
  let lab = null; if (label) { lab = h('div', { text: label, style: { position: 'absolute', ...ts(S, 'micro', { mono: true, color: c }), letterSpacing: '0.1em' } }); el.appendChild(lab); }
  parent.appendChild(el);
  const th = px(S, 3);
  return {
    el, covered: at + dur,
    update(t) {
      if (t < lt || (exit != null && t > exit + dur)) { css(el, { display: 'none' }); return; }
      css(el, { display: '' });
      const draw = ease('wipe')(seg(t, lt, lt + 0.4));
      const wob = Math.sin((t - lt) * 30) * Math.exp(-(t - lt - 0.4) * 8) * px(S, 6) * (t > lt + 0.4 ? 1 : 0);
      const grow = ease('wipe')(seg(t, at, at + dur));
      const hgt = th + (S.H * 1.02 - th) * grow;
      let top = Y - hgt / 2 + wob * (1 - grow);
      top = lerp(top, 0, grow) ; // centre the flood on the frame as it grows
      const ex = exit != null ? ease('wipe')(seg(t, exit, exit + dur)) : 0;
      css(bar, { top: top + S.H * ex + 'px', height: hgt + 'px', width: S.W * draw + 'px', left: (S.W * (1 - draw)) / 2 + 'px' });
      if (lab) css(lab, { left: S.W / 2 + px(S, 20) + 'px', top: Y - px(S, 34) + 'px', opacity: clamp(draw * 2) * (1 - grow) });
    },
  };
}

/** dot grows from a point into a full-frame disc (the next background); optional shrink-out (iris) */
export function dotGrow(S, parent, { x = null, y = null, at = 0, dur = 0.5, color = 'accent', r0 = 10, exit = null, e = 'wipe' } = {}) {
  const c = col(color, S.accent), X = x ?? S.W / 2, Y = y ?? S.H / 2;
  const R = Math.hypot(Math.max(X, S.W - X), Math.max(Y, S.H - Y)) + 4;
  const el = h('div', { style: { position: 'absolute', borderRadius: '50%', background: c } });
  parent.appendChild(el);
  return {
    el, covered: at + dur,
    update(t) {
      const g = ease(e)(seg(t, at, at + dur)), x2 = exit != null ? ease('exit')(seg(t, exit, exit + dur)) : 0;
      const r = (px(S, r0) + (R - px(S, r0)) * g) * (1 - x2);
      if (t < at || r <= 0.5) { css(el, { display: 'none' }); return; }
      css(el, { display: '', left: X - r + 'px', top: Y - r + 'px', width: 2 * r + 'px', height: 2 * r + 'px' });
    },
  };
}

/** staggered bars wipe: n bars cover the frame (covered at `at`), hold, then clear the other way */
export function barsWipe(S, parent, { at = 1, dur = 0.38, n = 6, color = 'ink', hold = 2 / 30, stagger = 0.04, vertical = true, alt = 'accent' } = {}) {
  const el = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: S.W + 'px', height: S.H + 'px', pointerEvents: 'none' } });
  const bars = Array.from({ length: n }, (_, i) => { const b = h('div', { style: { position: 'absolute', background: col(alt && i % 3 === 1 ? alt : color, S.accent), ...(vertical ? { top: '0px', height: S.H + 'px', left: (S.W * i) / n - 1 + 'px', width: S.W / n + 2 + 'px' } : { left: '0px', width: S.W + 'px', top: (S.H * i) / n - 1 + 'px', height: S.H / n + 2 + 'px' }) } }); el.appendChild(b); return b; });
  parent.appendChild(el);
  const start = at - dur - stagger * (n - 1), end = at + hold;
  return {
    el, covered: at, start, end: end + dur + stagger * (n - 1),
    update(t) {
      if (t < start || t > end + dur + stagger * (n - 1)) { css(el, { display: 'none' }); return; }
      css(el, { display: '' });
      bars.forEach((b, i) => {
        const a = ease('wipe')(seg(t, start + i * stagger, start + i * stagger + dur)), x = ease('wipe')(seg(t, end + i * stagger, end + i * stagger + dur));
        css(b, { transform: vertical ? `scaleY(${(a * (1 - x)).toFixed(4)})` : `scaleX(${(a * (1 - x)).toFixed(4)})`, transformOrigin: vertical ? (t < end ? '50% 100%' : '50% 0%') : (t < end ? '0% 50%' : '100% 50%') });
      });
    },
  };
}

/** torn paper panel sweeps up across the frame (covered at `at`), holds, exits */
export function tornWipe(S, parent, { at = 1, dur = T.duration.tornWipe / 30, color = 'ink', hold = 2 / 30, seed = 4, dir = 'up' } = {}) {
  const ph = Math.round(S.H * 1.3), rough = Math.round(S.W * 0.06);
  const d = tornPanelPath(S.W, ph, { rough, seed, top: true, bottom: true });
  const el = h('div', { html: `<svg width="${S.W}" height="${ph}" style="display:block"><path d="${d}" fill="${col(color, S.accent)}"/></svg>`, style: { position: 'absolute', left: '0px', top: '0px' } });
  parent.appendChild(el);
  const covered = -Math.round(S.H * 0.15);
  const k = dir === 'up' ? [[at - dur, S.H + 10, 'wipe'], [at, covered, 'hold'], [at + hold, covered, 'wipe'], [at + hold + dur, -ph - 10]] : [[at - dur, -ph - 10, 'wipe'], [at, covered, 'hold'], [at + hold, covered, 'wipe'], [at + hold + dur, S.H + 10]];
  const Y = kf(k);
  return { el, covered: at, update(t) { if (t < at - dur || t > at + hold + dur) { css(el, { display: 'none' }); return; } css(el, { display: '', transform: `translateY(${Y(t).toFixed(2)}px)` }); } };
}

/**
 * zoomThrough(S, parent, { text, at, dur, font, size, color, fill }) — a word flies at the camera and its
 * letters swallow the frame; `fill` colour takes over at the end (becomes the next background).
 */
export function zoomThrough(S, parent, { text = 'NEXT', at = 0, dur = 0.7, size = 180, color = 'accent', fill = 'accent', focus = 0.5, font = 'display' } = {}) {
  const el = h('div', { text: caseOf(font, text), style: { position: 'absolute', left: S.W / 2 + 'px', top: S.H / 2 + 'px', ...fstyle(S, font, size, { color: col(color, S.accent) }), transformOrigin: `${(focus * 100).toFixed(1)}% 55%`, whiteSpace: 'nowrap' } });
  const cover = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: S.W + 'px', height: S.H + 'px', background: col(fill, S.accent) } });
  parent.append(el, cover);
  return {
    el, covered: at + dur,
    update(t) {
      if (t < at - 0.25) { css(el, { display: 'none' }); css(cover, { display: 'none' }); return; }
      const intro = spr(t, at - 0.25, 'pop');
      const z = Math.pow(60, ease([0.7, 0, 0.84, 0])(seg(t, at, at + dur)));
      css(el, { display: '', transform: `translate(-${(focus * 100).toFixed(1)}%,-55%) scale(${(intro * z).toFixed(4)})` });
      css(cover, { display: t >= at + dur ? '' : 'none' });
    },
  };
}

/* ═════════ spotlight (screen recordings, UI callouts) ═════════ */
/**
 * spotlight(S, parent, { rects: [[t, x, y, w, h]], off: [t...], dim, radius }) — darkens everything outside
 * a rounded rect that springs from target to target. Pair with gizmo() for the brand callout.
 */
export function spotlight(S, parent, { rects = [], dim = 0.62, radius = 18, on = null, off = null } = {}) {
  const el = h('div', { style: { position: 'absolute', borderRadius: px(S, radius) + 'px', boxShadow: `0 0 0 ${S.W * 4}px rgba(11,11,12,${dim})`, pointerEvents: 'none' } });
  parent.appendChild(el);
  const k0 = rects[0];
  const X = track(k0[1], rects.map((r) => [r[0], r[1], 'soft'])), Y = track(k0[2], rects.map((r) => [r[0], r[2], 'soft'])), Wt = track(k0[3], rects.map((r) => [r[0], r[3], 'soft'])), Ht = track(k0[4], rects.map((r) => [r[0], r[4], 'soft']));
  const t0 = on ?? k0[0];
  return {
    el, rect: (t) => ({ x: X(t), y: Y(t), w: Wt(t), h: Ht(t) }),
    update(t) {
      const a = clamp((t - t0) / 0.3) * (off != null ? 1 - clamp((t - off) / 0.3) : 1);
      if (a <= 0) { css(el, { display: 'none' }); return; }
      css(el, { display: '', left: X(t) + 'px', top: Y(t) + 'px', width: Wt(t) + 'px', height: Ht(t) + 'px', boxShadow: `0 0 0 ${S.W * 4}px rgba(11,11,12,${(dim * a).toFixed(3)})` });
    },
  };
}

export { pulse, vis };
