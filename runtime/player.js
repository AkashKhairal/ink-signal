// Ink & Signal — player. Loads fonts, assets and 3D scenes for a spec and exposes seek(frame).
import { T } from './core.js';
import { Renderer2D } from './render2d.js';
import { COMPS, buildSpec } from './comps/index.js';
import { walk } from './spec.js';

let fontsReady = null;
export function loadFonts(root) {
  if (fontsReady) return fontsReady;
  const list = Object.entries(T.font).filter(([, v]) => v && typeof v === 'object');
  // fetched as data so it works under strict font-src policies (published artifacts, sandboxes)
  fontsReady = Promise.all(list.map(async ([key, f]) => {
    const buf = await (await fetch(root + f.file)).arrayBuffer();
    const ff = new FontFace(`IS ${key}`, buf);
    await ff.load(); document.fonts.add(ff);
  }));
  return fontsReady;
}

const VIDEO = /\.(mp4|mov|m4v|webm|mkv)$/i;

/** resolve a media path: absolute paths go through the dev server's /@fs/ route; relative ones are relative to `base` */
export function resolveSrc(src, base) {
  if (!src) return src;
  if (/^(https?:|data:|blob:)/.test(src)) return src;
  if (src.startsWith('/') || /^[A-Za-z]:[\\/]/.test(src)) return '/@fs/' + src.replace(/\\/g, '/').replace(/^\//, '');
  return base ? base.replace(/\/?$/, '/') + src : src;
}

async function loadMedia(url) {
  if (VIDEO.test(url)) {
    const v = document.createElement('video');
    v.muted = true; v.preload = 'auto'; v.playsInline = true; v.crossOrigin = 'anonymous'; v.src = url;
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('Cannot load video ' + url)); });
    return v;
  }
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url;
  await img.decode();
  return img;
}

function seekVideo(v, t) {
  return new Promise((res) => {
    if (Math.abs(v.currentTime - t) < 0.0005 && v.readyState >= 2) return res();
    const done = () => { v.removeEventListener('seeked', done); res(); };
    v.addEventListener('seeked', done);
    v.currentTime = Math.min(Math.max(0, t), Math.max(0, (v.duration || t) - 0.001));
  });
}

/**
 * boot({ canvas, root, comp, params, spec, base, guides })
 * → { spec, duration, fps, seek(frame) }
 */
export async function boot({ canvas, root = '../', comp, params = {}, spec, base = '', guides = false, only = null }) {
  await loadFonts(root);
  if (!spec) spec = buildSpec(comp, params);
  const assets = {};
  const videos = [];
  const threes = [];
  const seqs = [];
  const jobs = [];
  walk(spec.layers, (L) => {
    if (L.type === 'footage' && L.seq) { seqs.push(L); return; }
    if ((L.type === 'footage' || L.type === 'image') && L.src) {
      const url = resolveSrc(L.src, base);
      if (VIDEO.test(url)) jobs.push(loadMedia(url).then((v) => { assets[L.id] = v; videos.push(L); }));
      else if (!assets[L.src]) { assets[L.src] = true; jobs.push(loadMedia(url).then((img) => { assets[L.src] = img; })); }
    }
    if (L.type === 'three') threes.push(L);
    if (L.type === 'three' && L.params && L.params.srcs) for (const s of L.params.srcs) if (s && !assets[s]) { assets[s] = true; jobs.push(loadMedia(resolveSrc(s, base)).then((img) => { assets[s] = img; })); }
  });
  await Promise.all(jobs);
  const threeCanvases = {};
  const threeInst = {};
  if (threes.length) {
    const { SCENES } = await import('./three/scenes.js');
    for (const L of threes) {
      const def = SCENES[L.scene];
      if (!def) throw new Error(`Unknown 3D scene "${L.scene}"`);
      threeInst[L.id] = await def.create({ w: L.size[0], h: L.size[1], fps: spec.fps, accent: spec.accent, params: L.params || {}, assets, root });
      threeInst[L.id].canvas = threeInst[L.id].render(0);
    }
  }
  const r2d = new Renderer2D(canvas, spec, { assets, threeLayers: threeCanvases, guides, only });
  if (only) spec = { ...spec, background: null };
  r2d.spec = spec;
  const seqCache = new Map();
  const seqFrame = (L, i) => {
    const url = `${L.seq.dir}/${String(i + 1).padStart(5, '0')}.jpg`;
    if (!seqCache.has(url)) { const img = new Image(); img.src = url; seqCache.set(url, img.decode().then(() => img)); if (seqCache.size > 240) seqCache.delete(seqCache.keys().next().value); }
    return seqCache.get(url);
  };
  const seek = async (f) => {
    await Promise.all(seqs.filter((L) => f >= L.in && f < L.out).map(async (L) => {
      const i = Math.min(L.seq.count - 1, Math.max(0, Math.floor(f) - L.in));
      assets[L.id] = await seqFrame(L, i);
      if (i + 1 < L.seq.count) seqFrame(L, i + 1);
    }));
    await Promise.all(videos.filter((L) => f >= L.in && f < L.out).map((L) => seekVideo(assets[L.id], (Math.floor(f) - L.in) / spec.fps + (L.srcIn || 0))));
    for (const L of threes) {
      if (f >= L.in && f < L.out) threeCanvases[L.id] = threeInst[L.id].render(f - L.in);
    }
    r2d.render(f);
  };
  /** release WebGL contexts (call before booting another comp on the same page) */
  const dispose = () => {
    for (const k of Object.keys(threeInst)) {
      const c = threeInst[k].canvas; if (!c) continue;
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      const ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
    }
  };
  return { spec, duration: spec.duration, fps: spec.fps, seek, canvas, comps: COMPS, dispose };
}
