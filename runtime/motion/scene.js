// Ink & Signal — Signal Motion engine: scene definitions and mounting.
// A scene is plain data + a build(ctx) function. build() creates DOM once and returns update(t);
// seek(frame) calls every registered updater with t = frame / fps. Pure function of time.
import { T } from '../core.js';
import { createStage } from './stage.js';
import { cursor as makeCursor } from './cursor.js';

/**
 * defineScene({ name, kind, formats, title, description, theme: 'paper'|'night', transparent,
 *               defaults, duration(p) → seconds, loop, build(ctx) → update(t) | void })
 */
export const defineScene = (def) => ({ kind: 'motion', formats: ['reel', 'yt'], theme: 'paper', ...def, motion: true });

/** resolve params against defaults; nested objects merge one level */
export function resolveParams(def, params = {}) {
  const p = { ...def.defaults };
  for (const [k, v] of Object.entries(params)) p[k] = v && typeof v === 'object' && !Array.isArray(v) && p[k] && typeof p[k] === 'object' && !Array.isArray(p[k]) ? { ...p[k], ...v } : v;
  if (!p.format) p.format = def.formats[0];
  return p;
}

/** seconds → frames for a scene with params */
export function sceneFrames(def, params = {}) {
  const p = resolveParams(def, params);
  const fps = p.fps || (T.format[p.format] || T.format.reel).fps;
  return { frames: Math.round(def.duration(p) * fps), fps, p };
}

/**
 * mountScene(root, def, params) → { meta, cues, markers, seek(frame) }
 */
export function mountScene(root, def, params = {}) {
  const p = resolveParams(def, params);
  const fmt = T.format[p.format] || T.format.reel;
  const W = p.width || fmt.width, H = p.height || fmt.height, fps = p.fps || fmt.fps;
  const theme = p.theme || def.theme || 'paper';
  const transparent = p.transparent ?? def.transparent ?? false;
  const accent = (typeof p.accent === 'string' && /^#[0-9a-f]{6}$/i.test(p.accent) ? p.accent : T.color.signal).toUpperCase();
  const S = createStage(root, { W, H, theme, bg: transparent ? null : p.bg || 'canvas', grid: p.grid === undefined ? def.grid ?? null : p.grid, accent, render: !!p.__render });
  const ups = [], late = [], cues = [], markers = [], ready = [], after = [];
  const duration = def.duration(p);
  const ctx = {
    S, W, H, u: S.u, fps, p, fmt, theme, accent, duration, ready, after,
    /** media prepared by the renderer (image sequences of footage): p.__seq[key] = { dir, count } */
    seq: p.__seq || {},
    reel: H > W, yt: W > H,
    safe: fmt.safe, edge: fmt.edge,
    /** register a component ({ update }) or an updater function; returns it */
    add(c) { if (c) ups.push(typeof c === 'function' ? c : (t) => c.update(t)); return c; },
    /** run after everything else (cursors read the camera) */
    late(c) { if (c) late.push(typeof c === 'function' ? c : (t) => c.update(t)); return c; },
    /** sound cue: type is a key of tokens.sound.cueMap (click, appear, whoosh-like movement, slam, typing…) */
    cue(t, type, desc = '', extra = {}) { if (t != null && isFinite(t) && t >= 0 && t <= duration + 0.5) cues.push({ t: +t.toFixed(3), type, desc, ...extra }); },
    marker(t, label) { markers.push({ frame: Math.round(t * fps), label }); },
    /** cursor with automatic click cues */
    cursor(o) { const c = makeCursor(S, o); (o.clicks || []).forEach((t) => ctx.cue(t, 'click', 'cursor click')); late.push((t) => c.update(t)); return c; },
  };
  const main = def.build(ctx);
  if (typeof main === 'function') ups.unshift(main);
  const frames = Math.round(duration * fps);
  const meta = { spec: 'ink-signal/motion', name: def.name, scene: def.name, format: p.format, width: W, height: H, fps, duration: frames, background: transparent ? null : S.bgColor, markers, params: p, dom: true, post: S.post };
  cues.sort((a, b) => a.t - b.t);
  const seek = (f) => {
    let t = f / fps;
    if (def.loop) t = ((t % duration) + duration) % duration;
    for (const fn of ups) fn(t);
    for (const fn of late) fn(t);
  };
  seek(0);
  return { meta, cues, markers, seek, S, ctx };
}
