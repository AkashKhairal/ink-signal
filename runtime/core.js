// Ink & Signal — core (pure JS, no DOM). Runs in the browser and in Node.
// Everything here is a pure function of its inputs: no clocks, no Math.random.
import TOKENS from './tokens.js';
import METRICS from './metrics.js';

export const T = TOKENS;
export const M = METRICS;

/* ───────────────────────── easing ───────────────────────── */

export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-7) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-7) break;
      t -= e / d;
    }
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 40; i++) { const v = sx(t); if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return sy(t);
  };
}

const EASE_CACHE = {};
/** ease name ("snap", "stamp", ...), "hold", or [x1,y1,x2,y2] → f(0..1) */
export function easeFn(e) {
  if (!e) e = 'linear';
  if (Array.isArray(e)) return cubicBezier(...e);
  if (EASE_CACHE[e]) return EASE_CACHE[e];
  const def = T.ease[e];
  if (!def) throw new Error(`Unknown ease "${e}"`);
  const f = def.bezier ? cubicBezier(...def.bezier) : (x) => (x >= 1 ? 1 : 0);
  return (EASE_CACHE[e] = f);
}
export const easeBezier = (e) => (Array.isArray(e) ? e : (T.ease[e] && T.ease[e].bezier) || null);

/** Closed-form damped spring step response, 0 → 1. damping 0..1 (1 = critical), settle in seconds. */
export function spring(tSec, { damping = 0.7, settle = 0.4 } = {}) {
  if (tSec <= 0) return 0;
  const z = Math.min(Math.max(damping, 0.05), 1);
  const w = 4 / (z * settle);
  if (z >= 0.999) return 1 - Math.exp(-w * tSec) * (1 + w * tSec);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * tSec) * (Math.cos(wd * tSec) + ((z * w) / wd) * Math.sin(wd * tSec));
}

/* ───────────────────────── animation values ───────────────────────── */
// An animated property is { k: [[frame, value, ease?], ...] }.
// The ease on a key shapes the segment from that key to the next one.
// Values are numbers or arrays of numbers. Static values are plain numbers/arrays.

export const anim = (...keys) => ({ k: keys });
export const isAnim = (v) => v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.k);

const lerp = (a, b, t) => a + (b - a) * t;
function mix(a, b, t) {
  if (Array.isArray(a)) return a.map((x, i) => lerp(x, b[i], t));
  return lerp(a, b, t);
}

export function valueAt(v, f) {
  if (!isAnim(v)) return v;
  const k = v.k;
  if (!k.length) return undefined;
  if (f <= k[0][0]) return k[0][1];
  const last = k[k.length - 1];
  if (f >= last[0]) return last[1];
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i], b = k[i + 1];
    if (f >= a[0] && f < b[0]) {
      const span = b[0] - a[0];
      const p = span <= 0 ? 1 : (f - a[0]) / span;
      return mix(a[1], b[1], easeFn(a[2] || 'linear')(p));
    }
  }
  return last[1];
}

/** shift every key of an anim (or nested object of anims) by df frames */
export function shiftAnim(v, df) {
  if (!isAnim(v)) return v;
  return { ...v, k: v.k.map(([f, val, e]) => (e ? [f + df, val, e] : [f + df, val])) };
}

/* ───────────────────────── seeded randomness ───────────────────────── */

export function rng(seed = 1) {
  let a = (seed >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** deterministic value noise 1D, smooth, in [-1,1] */
export function noise1(x, seed = 1) {
  const h = (n) => { const r = rng((n * 374761393 + seed * 668265263) >>> 0); return r() * 2 - 1; };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}

/* ───────────────────────── colour ───────────────────────── */

/** resolve a token name ("signal"), "accent" (from opts) or a CSS colour to "#RRGGBB" / "#RRGGBBAA" */
export function color(c, accent) {
  if (c == null) return null;
  if (c === 'accent') return (accent || T.color.signal).toUpperCase();
  if (T.color[c] && typeof T.color[c] === 'string') return T.color[c];
  if (typeof c === 'string' && c.startsWith('rgba')) {
    const m = c.match(/rgba?\(([^)]+)\)/)[1].split(',').map((s) => parseFloat(s));
    const hx = (n) => Math.round(n).toString(16).padStart(2, '0');
    return ('#' + hx(m[0]) + hx(m[1]) + hx(m[2]) + hx((m[3] ?? 1) * 255)).toUpperCase();
  }
  return c.toUpperCase();
}
export function rgba(hex) {
  const h = hex.replace('#', '');
  const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return [n(0), n(2), n(4), h.length >= 8 ? n(6) : 1];
}

/* ───────────────────────── type metrics & layout ───────────────────────── */

export function fontOf(key) {
  const f = T.font[key];
  if (!f || typeof f !== 'object') throw new Error(`Unknown font "${key}"`);
  return f;
}
export function applyCase(text, key) {
  const c = fontOf(key).case;
  return c === 'upper' ? text.toUpperCase() : text;
}
/** advance of each char in px, using the real font metrics (no kerning, by design) */
export function charAdvances(text, key, size) {
  const m = M[key];
  return [...text].map((ch) => ((m.adv[ch] ?? m.fallback) / m.upm) * size);
}
export function measure(text, key, size, tracking = fontOf(key).tracking) {
  const a = charAdvances(text, key, size);
  return a.reduce((s, x) => s + x, 0) + tracking * size * Math.max(0, a.length - 1);
}

/**
 * Lay out a text block. Origin is the top-left of the block.
 * Each line box is lineHeight*size tall and the caps are centred in it.
 */
export function layoutText({ text, font, size, tracking, lineHeight, align = 'left' }) {
  const f = fontOf(font), m = M[font];
  const tr = tracking ?? f.tracking;
  const lh = (lineHeight ?? f.lineHeight) * size;
  const cap = (m.capHeight / m.upm) * size;
  const raw = applyCase(String(text), font).split('\n');
  const lines = raw.map((s) => {
    const adv = charAdvances(s, font, size);
    let x = 0; const chars = [];
    [...s].forEach((ch, i) => { chars.push({ ch, x, w: adv[i] }); x += adv[i] + tr * size; });
    const width = Math.max(0, x - (s.length ? tr * size : 0));
    return { text: s, width, chars };
  });
  const width = Math.max(0, ...lines.map((l) => l.width));
  lines.forEach((l, i) => {
    l.x = align === 'center' ? (width - l.width) / 2 : align === 'right' ? width - l.width : 0;
    l.baseline = i * lh + (lh + cap) / 2;
  });
  return { lines, width, height: lines.length * lh, lineHeight: lh, cap, ascent: (m.ascender / m.upm) * size, tracking: tr };
}

/** greedy word wrap using real metrics */
export function wrap(text, font, size, maxWidth, tracking) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const out = []; let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (line && measure(applyCase(test, font), font, size, tracking) > maxWidth) { out.push(line); line = w; } else line = test;
  }
  if (line) out.push(line);
  return out.join('\n');
}

/* ───────────────────────── shapes ───────────────────────── */

export const GLYPH = { star: T.glyph.star, sparkle: T.glyph.sparkle, plus: T.glyph.plus };

/** scale an SVG path made only of M/L/C/H/V/Q/Z absolute commands */
export function scalePath(d, s, ox = 0, oy = 0) {
  let cmd = '';
  let axis = 0;
  return d.replace(/([MLCHVQZ])|(-?\d*\.?\d+(?:e-?\d+)?)/gi, (tok, c, n) => {
    if (c) { cmd = c.toUpperCase(); axis = 0; return c; }
    const v = parseFloat(n);
    let out;
    if (cmd === 'H') out = v * s + ox;
    else if (cmd === 'V') out = v * s + oy;
    else { out = axis % 2 === 0 ? v * s + ox : v * s + oy; axis++; }
    return ' ' + +out.toFixed(2);
  }).replace(/\s+/g, ' ').trim();
}

/** jagged torn-paper edge across [0,w]; returns points [[x,y],...] with y in [0, rough] */
export function tornEdge(w, rough, seed = 4) {
  const r = rng(seed); const pts = []; let x = 0;
  while (x < w) {
    const big = r() < 0.25;
    pts.push([x, big ? 0.08 * rough + r() * 0.92 * rough : 0.25 * rough + r() * 0.5 * rough]);
    x += w * (0.006 + r() * 0.016);
  }
  pts.push([w, rough * 0.5]);
  return pts;
}
/** panel of size w×h with torn top (and optionally bottom) edge, as an SVG path */
export function tornPanelPath(w, h, { rough = 60, seed = 4, top = true, bottom = false } = {}) {
  const tp = top ? tornEdge(w, rough, seed) : [[0, 0], [w, 0]];
  const bp = bottom ? tornEdge(w, rough, seed + 7).map(([x, y]) => [x, h - y]) : [[0, h], [w, h]];
  const f = (n) => +n.toFixed(1);
  let d = `M${f(tp[0][0])} ${f(tp[0][1])}`;
  for (const [x, y] of tp.slice(1)) d += `L${f(x)} ${f(y)}`;
  const br = [...bp].reverse();
  for (const [x, y] of br) d += `L${f(x)} ${f(y)}`;
  return d + 'Z';
}

/** smooth hand-drawn arrow from a to b with a bend; returns { shaft, head } paths */
export function arrowPaths([x0, y0], [x1, y1], { bend = 0.3, head = 26 } = {}) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0;
  const cx = mx - dy * bend, cy = my + dx * bend;
  const f = (n) => +n.toFixed(1);
  const shaft = `M${f(x0)} ${f(y0)}Q${f(cx)} ${f(cy)} ${f(x1)} ${f(y1)}`;
  const ang = Math.atan2(y1 - cy, x1 - cx);
  const a1 = ang + Math.PI * 0.8, a2 = ang - Math.PI * 0.8;
  const hd = `M${f(x1 + Math.cos(a1) * head)} ${f(y1 + Math.sin(a1) * head)}L${f(x1)} ${f(y1)}L${f(x1 + Math.cos(a2) * head)} ${f(y1 + Math.sin(a2) * head)}`;
  return { shaft, head: hd };
}

/** loose hand-drawn ellipse that overshoots its start, for circling a word */
export function scribbleEllipse(w, h, seed = 3) {
  const r = rng(seed); const n = 48; const cx = w / 2, cy = h / 2;
  let d = '';
  for (let i = 0; i <= n + 8; i++) {
    const a = -Math.PI * 0.85 + (i / n) * Math.PI * 2;
    const j = 1 + (r() - 0.5) * 0.05 + (i > n ? 0.06 : 0);
    const x = cx + Math.cos(a) * (w / 2) * j, y = cy + Math.sin(a) * (h / 2) * j;
    d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  return d;
}

/* ───────────────────────── frames & time ───────────────────────── */

export const sec = (s, fps = 30) => Math.round(s * fps);
export const fmtTC = (f, fps = 30) => {
  const s = Math.floor(f / fps), fr = Math.floor(f % fps);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}:${p(fr)}`;
};
