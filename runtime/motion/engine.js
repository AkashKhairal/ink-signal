// Ink & Signal — Signal Motion engine: time math. Pure functions, no DOM, works in Node and the browser.
// Every value on screen is a function of time t (seconds). No clocks, no Math.random, no CSS transitions.
// Spring and swap model adapted from Barty-Bart/motion-graphics (MIT): closed-form springs summed per change.
import { T, cubicBezier, rng, noise1 } from '../core.js';

export { T, rng, noise1 };

/* ───────── basics ───────── */
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const mix = (a, b, u) => (Array.isArray(a) ? a.map((x, i) => lerp(x, b[i], u)) : lerp(a, b, u));
/** progress 0..1 of t through [a, b] */
export const seg = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
export const eo = (x) => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
export const eio = (x) => { x = clamp(x); return x * x * x * (x * (6 * x - 15) + 10); };
export const ei = (x) => { x = clamp(x); return x * x * x; };
/** gaussian bump centred on `at` (1 at the centre), width in seconds */
export const pulse = (t, at, width = 0.12) => Math.exp(-Math.pow((t - at) / width, 2));
/** 0→1→0 over [a, b] (sin arch) */
export const arch = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));

const EASES = {};
/** token ease ("snap", "stamp", "wipe", "write", "drift", "exit", "linear") or bezier array → f(0..1) */
export function ease(e = 'wipe') {
  if (typeof e === 'function') return e;
  if (Array.isArray(e)) return cubicBezier(...e);
  if (e === 'eo') return eo;
  if (e === 'eio') return eio;
  if (EASES[e]) return EASES[e];
  const d = T.ease[e];
  if (!d) throw new Error(`Unknown ease "${e}"`);
  return (EASES[e] = d.bezier ? cubicBezier(...d.bezier) : (x) => (x >= 1 ? 1 : 0));
}
/** eased progress of t through [a, b] */
export const ep = (t, a, b, e = 'snap') => ease(e)(seg(t, a, b));

/* ───────── springs ───────── */
/** closed-form spring step response 0 → 1 (zero initial velocity). w = ω (rad/s), z = ζ */
export function S(tau, w, z) {
  if (tau <= 0) return 0;
  if (!isFinite(w) || w >= 1e5) return 1;
  if (z < 1) { const wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * tau) * (Math.cos(wd * tau) + ((z * w) / wd) * Math.sin(wd * tau)); }
  if (z > 1 + 1e-6) { const q = w * Math.sqrt(z * z - 1), r1 = -z * w + q, r2 = -z * w - q; return 1 - (r2 * Math.exp(r1 * tau) - r1 * Math.exp(r2 * tau)) / (r2 - r1); }
  return 1 - Math.exp(-w * tau) * (1 + w * tau);
}
/** spring presets from tokens: morph, fast, slow, soft, camera, pop, stamp, settle, drop, instant */
export const SP = Object.fromEntries(Object.entries(T.springs).filter(([, v]) => Array.isArray(v)));
export const sp = (p) => (Array.isArray(p) ? p : SP[p] || SP.settle);
/** spring progress since `at` */
export const spr = (t, at, preset = 'settle') => { const [w, z] = sp(preset); return S(t - at, w, z); };

/**
 * A value that changes target many times: the sum of one spring per change.
 * keys: [[t, value, preset?], ...]; values may be numbers or arrays. period > 0 makes a seamless loop.
 */
export function track(v0, keys, def = 'settle', period = 0) {
  if (Array.isArray(v0)) {
    const tr = v0.map((x, i) => track(x, keys.map((k) => [k[0], k[1][i], k[2]]), def, period));
    return (t) => tr.map((f) => f(t));
  }
  let prev = v0; const ks = [];
  for (const k of keys) { const d = k[1] - prev; prev = k[1]; const [w, z] = sp(k[2] || def); if (d !== 0) ks.push([k[0], d, w, z]); }
  const loop = period > 0 && Math.abs(prev - v0) < 1e-9;
  return (t) => {
    let v = v0;
    for (const k of ks) { v += k[1] * S(t - k[0], k[2], k[3]); if (loop) v += k[1] * (S(t + period - k[0], k[2], k[3]) - 1); }
    return v;
  };
}
/** step: the latest value whose time has passed */
export const step = (v0, keys) => (t) => { let v = v0; for (const k of keys) if (t >= k[0]) v = k[1]; return v; };

/* ───────── colour ───────── */
const tok = (c) => (T.color[c] && typeof T.color[c] === 'string' ? T.color[c] : c);
export function hex2rgb(h) {
  h = tok(h).replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = (i) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length >= 8 ? n(6) / 255 : 1];
}
export const rgbStr = (c) => (c[3] >= 0.999 ? `rgb(${c.slice(0, 3).map((x) => Math.round(clamp(x, 0, 255))).join(',')})` : `rgba(${c.slice(0, 3).map((x) => Math.round(clamp(x, 0, 255))).join(',')},${clamp(c[3]).toFixed(3)})`);
/** colour with alpha: alpha('signal', .18) → rgba() */
export const alpha = (c, a) => { const v = hex2rgb(c); v[3] = a; return rgbStr(v); };
export const mixColor = (a, b, u) => rgbStr(mix(hex2rgb(a), hex2rgb(b), clamp(u)));
/** colour track: ctrack('#fff', [[t, 'signal', preset?]]) → t => 'rgb(...)' */
export function ctrack(c0, keys, def = [20, 1], period = 0) {
  const tr = track(hex2rgb(c0), keys.map((k) => [k[0], hex2rgb(k[1]), k[2]]), def, period);
  return (t) => rgbStr(tr(t));
}

/* ───────── keyframes ───────── */
/**
 * Precise eased keyframes (cameras, wipes): kf([[t0, v0, ease?], [t1, v1, ease?], ...]).
 * The ease on a key shapes the segment that LEAVES it (same convention as IS Spec anims).
 */
export function kf(keys, def = 'wipe') {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [a, va, e] = keys[i - 1], [b, vb] = keys[i];
      if (t <= b) return mix(va, vb, ease(e || def)(seg(t, a, b)));
    }
    return keys[keys.length - 1][1];
  };
}

/* ───────── content swap (enter / exit with blur) ───────── */
const SW = T.motion.swap;
/**
 * vis(t, tin, tout): enter waits din then blurs in over lin; exit blurs out over lout.
 * Returns { o, blur, s, a, b } (a = enter progress, b = exit progress).
 */
export function vis(t, tin, tout, o = {}) {
  const din = o.din ?? SW.din, lin = o.lin ?? SW.lin, lout = o.lout ?? SW.lout, bl = o.blur ?? SW.blurPx, s0 = o.scale ?? SW.scaleFrom;
  const a = tin == null ? 1 : eo((t - tin - din) / lin);
  const b = tout == null ? 0 : eo((t - tout) / lout);
  return { o: a * (1 - b), blur: (1 - a) * bl + b * bl * 0.8, s: (s0 + (1 - s0) * a) * (1 - 0.03 * b), a, b };
}

/* ───────── cursor paths & presses ───────── */
/** point path [[t, x, y], ...] eased between keys with a slight human arc → t => {x, y} */
export function path(keys, arc = T.motion.cursor.arc) {
  return (t) => {
    if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] };
    const L = keys[keys.length - 1]; if (t >= L[0]) return { x: L[1], y: L[2] };
    let i = 0; while (t >= keys[i + 1][0]) i++;
    const [t0, x0, y0] = keys[i], [t1, x1, y1] = keys[i + 1];
    const u = eio((t - t0) / (t1 - t0)), dx = x1 - x0, dy = y1 - y0, k = Math.sin(Math.PI * u) * arc;
    return { x: x0 + dx * u - dy * k, y: y0 + dy * u + dx * k };
  };
}
/** press amount 0..1 around clicks and held drags */
export function presses(clicks = [], drags = []) {
  const k = [];
  for (const c of clicks) k.push([c - 0.07, 1, [45, 1]], [c + 0.035, 0, [22, 0.72]]);
  for (const [a, b] of drags) k.push([a - 0.04, 1, [45, 1]], [b, 0, [22, 0.72]]);
  k.sort((a, b) => a[0] - b[0]);
  return track(0, k);
}
/** times at which a rising function first crosses each threshold (1 ms resolution) */
export const crossTimes = (f, t0, t1, ths) => ths.map((th) => { for (let t = t0; t <= t1; t += 0.001) if (f(t) >= th) return t; return Infinity; });

/* ───────── typing, counting ───────── */
/** number of characters visible when typing `n` chars from t0 at cps */
export const typed = (t, t0, n, cps = T.motion.typing.cps) => Math.max(0, Math.min(n, Math.floor((t - t0) * cps)));
/** duration of typing a string */
export const typeDur = (s, cps = T.motion.typing.cps) => [...String(s)].length / cps;
/** caret visible? solid while typing, blinks otherwise */
export const caretOn = (t, t0, t1, hz = T.motion.typing.caretBlinkHz) => (t >= t0 - 0.05 && t <= t1 + 0.15) || Math.floor(t * hz * 2) % 2 === 0;
/** eased count between a and b over [t0, t1] */
export const count = (t, t0, t1, a, b, e = 'snap') => lerp(a, b, ease(e)(seg(t, t0, t1)));
/** format a number like the source: decimals, thousands separators, prefix/suffix */
export function fmtNum(v, { decimals = 0, sep = ',', prefix = '', suffix = '' } = {}) {
  const s = Math.abs(v).toFixed(decimals);
  const [i, d] = s.split('.');
  const ii = i.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return (v < 0 ? '−' : '') + prefix + ii + (d ? '.' + d : '') + suffix;
}

/* ───────── beat grids ───────── */
/** beat grid helper: b = beats(128); b.at(4) = time of beat 4; b.sub(4, 16) = 4 sixteenth-notes; b.snap(t) */
export function beats(bpm = T.motion.beat.hypeBpm, offset = 0, grid = null) {
  const spb = 60 / bpm;
  const at = (n) => (grid && Number.isInteger(n) && grid[n] != null ? grid[n] : offset + n * spb);
  return {
    bpm, spb, offset,
    at, beat: at,
    bar: (n) => at(n * 4),
    sub: (n, div = 16) => offset + n * spb * (4 / div),
    snap: (t, div = 4) => { const q = spb * (4 / div); return offset + Math.round((t - offset) / q) * q; },
  };
}

/* ───────── baked simulations ───────── */
/**
 * Bake anything with history (a lagging camera, physics) once at load: step(state, t, dt) from 0 to T at dt,
 * then sample by time with interpolation. state values must be numbers.
 */
export function bake(init, stepFn, T1, dt = 1 / 240) {
  const n = Math.ceil(T1 / dt) + 2; const keys = Object.keys(init); const buf = keys.map(() => new Float64Array(n));
  let s = { ...init };
  for (let i = 0; i < n; i++) { keys.forEach((k, j) => { buf[j][i] = s[k]; }); s = stepFn(s, i * dt, dt) || s; }
  return (t) => {
    const x = clamp(t / dt, 0, n - 1), i = Math.floor(x), u = x - i, j = Math.min(n - 1, i + 1);
    const o = {}; keys.forEach((k, m) => { o[k] = lerp(buf[m][i], buf[m][j], u); }); return o;
  };
}
/** critically damped follow (for bake): moves v toward target with spring ω */
export function follow(v, vel, target, w, dt) {
  const a = w * w * (target - v) - 2 * w * vel;
  vel += a * dt; v += vel * dt; return [v, vel];
}

/* ───────── time warps ───────── */
/** slow-motion warp over [a, b]: local speed 1 - depth·sin(πu)^p; returns warped time */
export function slowmo(a, b, depth = 0.85, p = 0.6, n = 400) {
  const tbl = new Float64Array(n + 1); let acc = 0;
  for (let i = 0; i <= n; i++) { tbl[i] = acc; const u = i / n; acc += (1 - depth * Math.pow(Math.sin(Math.PI * u), p)) / n; }
  const total = tbl[n];
  // maps real time in [a,b] → story time in [a, a + (b-a)*total] … rescaled so b ↦ b
  return (t) => { if (t <= a || t >= b) return t; const x = ((t - a) / (b - a)) * n, i = Math.floor(x); const v = lerp(tbl[i], tbl[Math.min(n, i + 1)], x - i) / total; return a + v * (b - a); };
}

/* ───────── stagger helpers ───────── */
export const stagger = (i, base, each = T.motion.stagger.list) => base + i * each;
/** deterministic pseudo-random in [0,1) for an integer key */
export const hash01 = (n, seed = 1) => rng(((n + 1) * 2654435761 + seed * 97) >>> 0)();
