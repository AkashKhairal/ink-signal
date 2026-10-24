#!/usr/bin/env node
// Ink & Signal CLI
//   node render/cli.mjs list
//   node render/cli.mjs spec   <comp> [--format reel] [--params '{"title":"Setup"}'] [--params-file p.json] [--out spec.json]
//   node render/cli.mjs render <comp | x.spec.json | x.plan.json> [--format reel] [--params ...] --out out.mp4|out.mov|out.webm|frames/
//                              [--alpha] [--blur 4] [--from 0] [--to N] [--guides] [--no-grain]
//   node render/cli.mjs still  <comp | spec | plan> --frame 30 --out still.png [--format] [--params] [--guides]
//   node render/cli.mjs sheet  <comp | spec | plan> --frames 0,15,30,60 --out sheet.png [--cols 4] [--scale 0.3]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { startServer, LIB_ROOT } from './serve.mjs';

const require = createRequire(import.meta.url);

export function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const s = argv[i];
    if (s.startsWith('--')) { const k = s.slice(2); const n = argv[i + 1]; if (n === undefined || n.startsWith('--')) a[k] = true; else { a[k] = n; i++; } }
    else a._.push(s);
  }
  return a;
}

function readParams(a) {
  let p = {};
  if (a['params-file']) p = JSON.parse(fs.readFileSync(a['params-file'], 'utf8'));
  if (a.params) p = { ...p, ...JSON.parse(a.params) };
  if (a.format) p.format = a.format;
  if (a.accent) p.accent = a.accent;
  return p;
}

const fsUrl = (abs) => '/@fs/' + path.resolve(abs).replace(/\\/g, '/').replace(/^\//, '');

const VIDEO = /\.(mp4|mov|m4v|webm|mkv|avi|mts)$/i;

/** Build the IS Spec in Node (comps are pure) from a comp name, a .spec.json or an edit plan .json */
export async function resolveSpec(target, a) {
  const { buildSpec } = await import('../runtime/comps/index.js');
  if (target.endsWith('.json')) {
    const abs = path.resolve(target);
    const j = JSON.parse(fs.readFileSync(abs, 'utf8'));
    if (j.spec && j.layers) return { spec: j, base: path.dirname(abs) };
    return { spec: buildSpec('edit', { plan: j }), base: path.dirname(abs) };
  }
  return { spec: buildSpec(target, readParams(a)), base: path.resolve(a.base || process.cwd()) };
}

/**
 * Browsers decode H.264/HEVC unreliably and seek imprecisely, so every video used by the spec is
 * pre-extracted to a JPEG sequence (only the frames the edit uses) and swapped in frame by frame.
 */
export function prepareFootage(spec, base, cacheRoot) {
  const fps = spec.fps;
  const visit = (ls) => ls.forEach((L) => {
    if (L.type === 'footage' && L.src && VIDEO.test(L.src)) {
      const file = path.resolve(base, L.src);
      if (!fs.existsSync(file)) throw new Error('Footage not found: ' + file);
      const srcIn = L.srcIn || 0, frames = L.out - L.in;
      const [w, h] = L.size;
      const key = Buffer.from(`${file}|${fs.statSync(file).mtimeMs}|${srcIn}|${frames}|${fps}|${w}x${h}`).toString('base64url').slice(-40);
      const dir = path.join(cacheRoot, key);
      if (!fs.existsSync(path.join(dir, 'done'))) {
        fs.mkdirSync(dir, { recursive: true });
        execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(srcIn), '-i', file, '-frames:v', String(frames + 1), '-vf',
          `fps=${fps},scale=${Math.round(w)}:${Math.round(h)}:force_original_aspect_ratio=increase,crop=${Math.round(w)}:${Math.round(h)}`,
          '-q:v', '2', path.join(dir, '%05d.jpg')]);
        fs.writeFileSync(path.join(dir, 'done'), '1');
      }
      const count = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).length;
      L.seq = { dir: fsUrl(dir), count };
    }
    if (L.layers) visit(L.layers);
  });
  visit(spec.layers);
  return spec;
}

/** drop animated grain (smaller GIFs / previews) */
function stripGrain(layers) {
  return layers.filter((l) => !(l.type === 'texture' && l.kind === 'grain')).map((l) => (l.layers ? { ...l, layers: stripGrain(l.layers) } : l));
}

/** stage URL: the spec is written to a temp file and loaded by path */
export async function stageQuery(target, a) {
  const { spec, base } = await resolveSpec(target, a);
  if (a['no-grain']) spec.layers = stripGrain(spec.layers);
  const cache = path.resolve(a.cache || path.join(base, '.ink-signal-cache'));
  prepareFootage(spec, base, cache);
  fs.mkdirSync(cache, { recursive: true });
  const specFile = path.join(cache, `stage-${process.pid}-${Date.now()}.spec.json`);
  fs.writeFileSync(specFile, JSON.stringify(spec));
  const q = new URLSearchParams();
  q.set('spec', fsUrl(specFile));
  q.set('base', fsUrl(base) + '/');
  if (a.only) q.set('only', a.only);
  if (a.guides) q.set('guides', '1');
  return { query: q.toString(), specFile };
}

export async function openStage(target, a) {
  const { chromium } = require('playwright');
  const srv = await startServer();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1280 } });
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[page]', e.message));
  // a bespoke page (e.g. a GSAP scene using runtime/gsap-bridge.js) or the standard stage
  const sq = target.endsWith('.html') ? { query: '', specFile: null, page: fsUrl(path.resolve(target)) } : await stageQuery(target, a);
  await page.goto(sq.page ? `http://127.0.0.1:${srv.port}${sq.page}` : `http://127.0.0.1:${srv.port}/stage/index.html?${sq.query}`);
  await page.waitForFunction(() => window.__IS_READY || window.__IS_ERROR, null, { timeout: 180000 });
  const err = await page.evaluate(() => window.__IS_ERROR);
  if (err) { await browser.close(); srv.close(); throw new Error(err); }
  await page.evaluate(() => {
    // subframe accumulation for real motion blur (premultiplied average)
    window.__grab = async (f, n = 1, shutter = 0.5) => {
      const c = window.IS.canvas;
      if (n <= 1) { await window.IS.seek(f); return c.toDataURL('image/png'); }
      const w = c.width, h = c.height, ctx = c.getContext('2d');
      const acc = new Float32Array(w * h * 4);
      for (let i = 0; i < n; i++) {
        await window.IS.seek(f - shutter / 2 + (shutter * (i + 0.5)) / n);
        const d = ctx.getImageData(0, 0, w, h).data;
        for (let j = 0; j < d.length; j += 4) { const al = d[j + 3] / 255; acc[j] += d[j] * al; acc[j + 1] += d[j + 1] * al; acc[j + 2] += d[j + 2] * al; acc[j + 3] += al; }
      }
      const out = new ImageData(w, h);
      for (let j = 0; j < acc.length; j += 4) { const al = acc[j + 3]; if (al > 0) { out.data[j] = acc[j] / al; out.data[j + 1] = acc[j + 1] / al; out.data[j + 2] = acc[j + 2] / al; } out.data[j + 3] = (al / n) * 255; }
      const t = document.createElement('canvas'); t.width = w; t.height = h; t.getContext('2d').putImageData(out, 0, 0);
      return t.toDataURL('image/png');
    };
  });
  const meta = await page.evaluate(() => ({ width: IS.spec.width, height: IS.spec.height, fps: IS.spec.fps, duration: IS.spec.duration, name: IS.spec.name, background: IS.spec.background, markers: IS.spec.markers }));
  return { page, browser, srv, meta, close: async () => { await browser.close(); srv.close(); if (sq.specFile) fs.rmSync(sq.specFile, { force: true }); } };
}

const b64png = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');

function ffmpegArgs(out, meta, a) {
  const ext = path.extname(out).toLowerCase();
  const alpha = a.alpha || (!meta.background && ext !== '.mp4');
  const inp = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(meta.fps), '-c:v', 'png', '-i', '-'];
  if (ext === '.mov') return [...inp, '-c:v', 'prores_ks', '-profile:v', alpha ? '4444' : '3', '-pix_fmt', alpha ? 'yuva444p10le' : 'yuv422p10le', '-vendor', 'apl0', out];
  if (ext === '.webm') return [...inp, '-c:v', 'libvpx-vp9', '-pix_fmt', alpha ? 'yuva420p' : 'yuv420p', '-b:v', '0', '-crf', '24', '-auto-alt-ref', '0', out];
  return [...inp, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', out];
}

export async function render(target, a) {
  const st = await openStage(target, a);
  const { page, meta } = st;
  const from = parseInt(a.from ?? 0, 10), to = Math.min(parseInt(a.to ?? meta.duration, 10), meta.duration);
  const n = parseInt(a.blur ?? 1, 10);
  const out = a.out || `${meta.name}.mp4`;
  const t0 = Date.now();
  const asFrames = out.endsWith('/') || path.extname(out) === '';
  let ff = null;
  if (asFrames) fs.mkdirSync(out, { recursive: true });
  else {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    ff = spawn('ffmpeg', ffmpegArgs(out, meta, a), { stdio: ['pipe', 'inherit', 'inherit'] });
  }
  for (let f = from; f < to; f++) {
    const png = b64png(await page.evaluate(([fr, nn]) => window.__grab(fr, nn), [f, n]));
    if (asFrames) fs.writeFileSync(path.join(out, `${meta.name}_${String(f).padStart(5, '0')}.png`), png);
    else if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - from) % 15 === 0) process.stdout.write(`\r${meta.name}: frame ${f + 1}/${to}`);
  }
  if (ff) { ff.stdin.end(); await new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg exited ' + c))))); }
  await st.close();
  process.stdout.write(`\r${meta.name}: ${to - from} frames → ${out} (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
  if (!a.noMarkers) fs.writeFileSync(out.replace(/\/?$/, '').replace(/\.[^.]+$/, '') + '.markers.json', JSON.stringify({ fps: meta.fps, duration: meta.duration, markers: meta.markers }, null, 1));
  return { out, meta };
}

export async function still(target, a) {
  const st = await openStage(target, a);
  const f = parseFloat(a.frame ?? 0);
  const png = b64png(await st.page.evaluate(([fr, nn]) => window.__grab(fr, nn), [f, parseInt(a.blur ?? 1, 10)]));
  const out = a.out || `${st.meta.name}_${f}.png`;
  fs.writeFileSync(out, png);
  await st.close();
  console.log(`still → ${out}`);
}

/** contact sheet of several frames, for review */
export async function sheet(target, a) {
  const st = await openStage(target, a);
  const frames = String(a.frames || '0,15,30,45,60,90').split(',').map(Number).filter((f) => f < st.meta.duration);
  const cols = parseInt(a.cols || Math.min(frames.length, 6), 10), sc = parseFloat(a.scale || (st.meta.width > st.meta.height ? 0.25 : 0.2));
  const urls = [];
  for (const f of frames) urls.push(await st.page.evaluate(([fr]) => window.__grab(fr, 1), [f]));
  const data = await st.page.evaluate(async ([urls, frames, cols, sc, w, h]) => {
    const cw = Math.round(w * sc), ch = Math.round(h * sc), rows = Math.ceil(urls.length / cols), pad = 8, lab = 22;
    const c = document.createElement('canvas'); c.width = cols * (cw + pad) + pad; c.height = rows * (ch + pad + lab) + pad;
    const x = c.getContext('2d'); x.fillStyle = '#1A1A1B'; x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < urls.length; i++) {
      const img = new Image(); img.src = urls[i]; await img.decode();
      const cx = pad + (i % cols) * (cw + pad), cy = pad + Math.floor(i / cols) * (ch + pad + lab);
      x.fillStyle = '#2a2a2a'; x.fillRect(cx, cy, cw, ch); x.drawImage(img, cx, cy, cw, ch);
      x.fillStyle = '#ECEBE6'; x.font = '14px monospace'; x.fillText('f ' + frames[i], cx, cy + ch + 16);
    }
    return c.toDataURL('image/png');
  }, [urls, frames, cols, sc, st.meta.width, st.meta.height]);
  const out = a.out || `${st.meta.name}_sheet.png`;
  fs.writeFileSync(out, b64png(data));
  await st.close();
  console.log(`sheet → ${out}`);
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const cmd = a._[0];
  if (cmd === 'list' || !cmd) {
    const { COMPS } = await import('../runtime/comps/index.js');
    for (const [k, d] of Object.entries(COMPS)) console.log(`${k.padEnd(15)} [${d.kind}] (${d.formats.join('/')})  ${d.description}`);
    if (!cmd) console.log('\nCommands: list | spec | render | still | sheet  (see header of render/cli.mjs)');
    return;
  }
  if (cmd === 'spec') {
    const { spec } = await resolveSpec(a._[1], a);
    const out = a.out || `${spec.name}.spec.json`;
    fs.writeFileSync(out, JSON.stringify(spec, null, a.min ? 0 : 1));
    console.log(`spec → ${out}  (${spec.width}x${spec.height} @${spec.fps}, ${spec.duration} frames)`);
    return;
  }
  if (cmd === 'render') return void (await render(a._[1], a));
  if (cmd === 'still') return void (await still(a._[1], a));
  if (cmd === 'sheet') return void (await sheet(a._[1], a));
  console.error('unknown command ' + cmd);
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(LIB_ROOT, 'render', 'cli.mjs')) {
  main().catch((e) => { console.error(e.stack || e); process.exit(1); });
}
