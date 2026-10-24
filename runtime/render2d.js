// Ink & Signal — Canvas 2D renderer for IS Spec. Browser only.
// render(frame) is a pure function of the frame number (given the same loaded assets).
import { T, M, valueAt, isAnim, easeFn, rng, noise1, fontOf } from './core.js';

const pathLenCache = new Map();
function pathLength(d) {
  if (pathLenCache.has(d)) return pathLenCache.get(d);
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  el.setAttribute('d', d);
  const len = el.getTotalLength();
  pathLenCache.set(d, len);
  return len;
}
const p2dCache = new Map();
const P2D = (d) => { if (!p2dCache.has(d)) p2dCache.set(d, new Path2D(d)); return p2dCache.get(d); };

function offscreen(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

/* ───────── procedural plates (cached) ───────── */
const plateCache = new Map();

function gridPlate(w, h, size, line) {
  const key = `grid${w}x${h}:${size}:${line}`;
  if (plateCache.has(key)) return plateCache.get(key);
  const c = offscreen(w, h), x = c.getContext('2d');
  x.fillStyle = line;
  for (let gx = 0; gx <= w; gx += size) x.fillRect(Math.round(gx), 0, 1, h);
  for (let gy = 0; gy <= h; gy += size) x.fillRect(0, Math.round(gy), w, 1);
  plateCache.set(key, c);
  return c;
}

/** crumpled paper: faceted planes (two Voronoi layers with tilted normals) + a soft fold, lit from the
    token light direction (azimuth 130°, elevation 58°). Returned as a light multiply plate. */
function crumplePlate(w, h, seed) {
  const key = `crumple${w}x${h}:${seed}`;
  if (plateCache.has(key)) return plateCache.get(key);
  const cf = T.footage.crumple;
  const sc = 2; const gw = Math.ceil(w / sc), gh = Math.ceil(h / sc);
  const r = rng(seed);
  const layer = (cell, tilt) => {
    const cw = Math.ceil(gw / cell) + 2, ch = Math.ceil(gh / cell) + 2;
    const px = new Float32Array(cw * ch), py = new Float32Array(cw * ch), tx = new Float32Array(cw * ch), ty = new Float32Array(cw * ch);
    for (let i = 0; i < cw * ch; i++) { px[i] = r(); py[i] = r(); const a = r() * Math.PI * 2, m = tilt * (0.35 + 0.65 * r()); tx[i] = Math.cos(a) * m; ty[i] = Math.sin(a) * m; }
    return { cell, cw, px, py, tx, ty };
  };
  const A = layer(150 / sc, 0.26), B = layer(52 / sc, 0.1);
  const nearest = (Lr, x, y) => {
    const gx = Math.floor(x / Lr.cell), gy = Math.floor(y / Lr.cell); let best = 1e9, bi = 0, second = 1e9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = gx + i + 1, cy = gy + j + 1; if (cx < 0 || cy < 0) continue;
      const k = cy * Lr.cw + cx; const sx = (gx + i + Lr.px[k]) * Lr.cell, sy = (gy + j + Lr.py[k]) * Lr.cell;
      const d = (sx - x) ** 2 + (sy - y) ** 2;
      if (d < best) { second = best; best = d; bi = k; } else if (d < second) second = d;
    }
    return { k: bi, edge: Math.sqrt(second) - Math.sqrt(best) };
  };
  const az = (cf.lightAzimuth * Math.PI) / 180, el = (cf.lightElevation * Math.PI) / 180;
  const L = [Math.cos(az) * Math.cos(el), -Math.sin(az) * Math.cos(el), Math.sin(el)];
  const img = new ImageData(gw, gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const a = nearest(A, x, y), b = nearest(B, x, y);
    // soft broad fold
    const fx = Math.sin((x / gw) * 2.3 + seed) * 0.05, fy = Math.cos((y / gh) * 1.7 + seed * 0.7) * 0.05;
    let nx = A.tx[a.k] + B.tx[b.k] + fx, ny = A.ty[a.k] + B.ty[b.k] + fy;
    const nl = Math.hypot(nx, ny, 1);
    let d = (nx * L[0] + ny * L[1] + L[2]) / nl;
    // crease lines: thin darker ridge where facets meet
    const crease = Math.max(0, 1 - a.edge / 1.6) * 0.07 + Math.max(0, 1 - b.edge / 1.0) * 0.03;
    const v = Math.round(255 * Math.max(0, Math.min(1, 0.5 + 0.6 * d - crease)));
    const i = (y * gw + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  const small = offscreen(gw, gh); small.getContext('2d').putImageData(img, 0, 0);
  const c = offscreen(w, h), cx = c.getContext('2d');
  cx.imageSmoothingQuality = 'high'; cx.drawImage(small, 0, 0, w, h);
  plateCache.set(key, c);
  return c;
}

function grainFrame(w, h, seed, frame) {
  const gw = Math.ceil(w / 2), gh = Math.ceil(h / 2);
  const key = `grainbuf${gw}x${gh}`;
  let c = plateCache.get(key);
  if (!c) { c = offscreen(gw, gh); plateCache.set(key, c); }
  const x = c.getContext('2d'); const img = x.createImageData(gw, gh); const r = rng(seed * 7919 + frame * 104729);
  for (let i = 0; i < img.data.length; i += 4) { const v = (r() * 255) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  return c;
}

/** stand-in for footage: moody lit-room blobs, or a portrait silhouette */
function placeholderPlate(w, h, seed, kind) {
  const key = `ph${w}x${h}:${seed}:${kind}`;
  if (plateCache.has(key)) return plateCache.get(key);
  const c = offscreen(w, h), x = c.getContext('2d'); const r = rng(seed);
  x.fillStyle = kind === 'portrait' ? '#0E0E0E' : '#141416'; x.fillRect(0, 0, w, h);
  if (kind === 'portrait') {
    x.fillStyle = '#3A3A3C';
    x.beginPath(); x.arc(w * 0.5, h * 0.4, w * 0.17, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.moveTo(w * 0.14, h); x.bezierCurveTo(w * 0.16, h * 0.78, w * 0.31, h * 0.66, w * 0.5, h * 0.66); x.bezierCurveTo(w * 0.69, h * 0.66, w * 0.84, h * 0.78, w * 0.86, h); x.closePath(); x.fill();
  } else {
    // a dark room lit by a desk lamp, a red sign, a blue monitor and a mint LED strip
    const lights = [['255,170,90', 0.6, 0.2], ['242,54,43', 0.55, 0.16], ['43,68,224', 0.55, 0.22], ['120,255,200', 0.22, 0.12], ['255,214,170', 0.35, 0.07]];
    x.fillStyle = '#0B0B0C'; x.fillRect(0, 0, w, h);
    const m = Math.max(w, h);
    lights.forEach(([rgb, a, rad], i) => {
      const cx = w * (0.15 + r() * 0.7), cy = h * (0.12 + r() * 0.76), rr = m * rad * (0.8 + r() * 0.4);
      x.save(); x.translate(cx, cy); x.scale(1, 0.6 + r() * 0.5);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, rr);
      g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.55, `rgba(${rgb},${a * 0.35})`); g.addColorStop(1, `rgba(${rgb},0)`);
      x.fillStyle = g; x.fillRect(-rr, -rr, rr * 2, rr * 2); x.restore();
      void i;
    });
  }
  plateCache.set(key, c);
  return c;
}

/* ───────── renderer ───────── */

export class Renderer2D {
  constructor(canvas, spec, { assets = {}, threeLayers = {}, guides = false, only = null } = {}) {
    this.canvas = canvas; this.spec = spec; this.assets = assets; this.threeLayers = threeLayers; this.guides = guides;
    // render a single layer (and the groups that contain it) — used to export 3D passes for NLEs
    this.only = null;
    if (only) {
      const path = [];
      const find = (ls, trail) => { for (const l of ls) { if (l.id === only) { path.push(...trail, l.id); return true; } if (l.layers && find(l.layers, [...trail, l.id])) return true; } return false; };
      find(spec.layers, []);
      this.only = { target: only, path: new Set(path) };
    }
    canvas.width = spec.width; canvas.height = spec.height;
    this.ctx = canvas.getContext('2d', { alpha: true });
  }

  render(f) {
    const { ctx, spec } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.clearRect(0, 0, spec.width, spec.height);
    if (spec.background) { ctx.fillStyle = spec.background; ctx.fillRect(0, 0, spec.width, spec.height); }
    this.drawLayers(spec.layers, f);
  }

  drawLayers(layers, f, inside = false) { for (const L of layers) this.drawLayer(L, f, inside); }

  drawLayer(L, f, inside = false) {
    if (f < L.in || f >= L.out) return;
    if (this.only && !inside && !this.only.path.has(L.id)) return;
    const insideNext = inside || (this.only && L.id === this.only.target);
    if (L.guide && !this.guides) return;
    const { ctx } = this;
    const t = L.t || {};
    const anchor = valueAt(t.anchor, f) || [0, 0];
    let pos = valueAt(t.position, f) || [0, 0];
    const sc = valueAt(t.scale, f) ?? [100, 100];
    const rot = valueAt(t.rotation, f) || 0;
    const op = valueAt(t.opacity, f) ?? 100;
    if (op <= 0) return;
    if (L.wiggle) {
      const w = L.wiggle, ts = (f / this.spec.fps) * w.freq;
      pos = [pos[0] + noise1(ts, w.seed || 1) * w.amp, pos[1] + noise1(ts, (w.seed || 1) + 17) * w.amp];
    }
    ctx.save();
    ctx.translate(pos[0], pos[1]);
    if (rot) ctx.rotate((rot * Math.PI) / 180);
    const sx = (Array.isArray(sc) ? sc[0] : sc) / 100, sy = (Array.isArray(sc) ? sc[1] : sc) / 100;
    if (sx === 0 || sy === 0) { ctx.restore(); return; }
    ctx.scale(sx, sy);
    ctx.translate(-anchor[0], -anchor[1]);
    ctx.globalAlpha *= op / 100;
    if (L.blend) ctx.globalCompositeOperation = L.blend;

    const box = (L.type === 'text' ? L.box : (Array.isArray(L.size) ? L.size : L.box)) || [this.spec.width, this.spec.height];
    if (L.reveal) {
      const p = Math.max(0, Math.min(1, valueAt(L.reveal.p, f)));
      if (p <= 0) { ctx.restore(); return; }
      if (p < 1) {
        const m = (L.sw || 0) + 2;
        const [w, h] = box;
        ctx.beginPath();
        if (L.reveal.mode === 'box') ctx.rect(-m, -m, (w + 2 * m) * p, (h + 2 * m) * p);
        else if (L.reveal.mode === 'y') ctx.rect(-m, -m, w + 2 * m, (h + 2 * m) * p);
        else if (L.reveal.mode === 'x-rev') ctx.rect(w + m - (w + 2 * m) * p, -m, (w + 2 * m) * p, h + 2 * m);
        else ctx.rect(-m - 40, -m - 200, (w + 2 * m + 40) * p, h + 2 * m + 400);
        ctx.clip();
      }
    }
    const fn = this['draw_' + L.type];
    if (fn) fn.call(this, L, f, box, insideNext);
    ctx.restore();
  }

  draw_solid(L) { const { ctx } = this; ctx.fillStyle = L.color; const [w, h] = L.size || [this.spec.width, this.spec.height]; ctx.fillRect(0, 0, w, h); }

  draw_rect(L) {
    const { ctx } = this; const [w, h] = L.size;
    if (L.shadow && L.fill) { ctx.save(); ctx.shadowColor = L.shadow.color || '#00000066'; ctx.shadowBlur = L.shadow.blur || 20; ctx.shadowOffsetY = L.shadow.dy || 10; ctx.fillStyle = L.fill; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    else if (L.fill) { ctx.fillStyle = L.fill; ctx.fillRect(0, 0, w, h); }
    if (L.stroke && L.sw) { ctx.strokeStyle = L.stroke; ctx.lineWidth = L.sw; ctx.lineJoin = 'miter'; ctx.strokeRect(0, 0, w, h); }
  }

  draw_ellipse(L) {
    const { ctx } = this; const [w, h] = L.size;
    ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    if (L.fill) { ctx.fillStyle = L.fill; ctx.fill(); }
    if (L.stroke && L.sw) { ctx.strokeStyle = L.stroke; ctx.lineWidth = L.sw; ctx.stroke(); }
  }

  draw_path(L, f) {
    const { ctx } = this; const p = P2D(L.d);
    if (L.fill) { ctx.fillStyle = L.fill; ctx.fill(p); }
    if (L.stroke && L.sw) {
      let tr = L.trim ? valueAt(L.trim, f) : 1;
      if (tr <= 0.001) return;
      ctx.strokeStyle = L.stroke; ctx.lineWidth = L.sw; ctx.lineCap = L.cap || 'butt'; ctx.lineJoin = L.join || 'miter';
      if (tr < 1) { const len = pathLength(L.d); ctx.setLineDash([len * tr, len + 10]); ctx.lineDashOffset = 0; }
      ctx.stroke(p);
      ctx.setLineDash([]);
    }
  }

  setFont(font, size) {
    const { ctx } = this;
    ctx.font = `${size}px "IS ${font}"`;
    ctx.fontKerning = 'none';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  draw_text(L, f) {
    const { ctx } = this;
    if (L.counter) L = { ...L, text: counterText(L, f, this.spec.fps) };
    const lay = L.counter ? layoutText({ text: L.text, font: L.font, size: L.size, tracking: L.tracking, lineHeight: L.lineHeight, align: L.align }) : layoutCached(L);
    this.setFont(L.font, L.size);
    ctx.fillStyle = L.color;
    const ch = L.chars;
    let idx = 0;
    let visible = Infinity;
    if (ch && ch.mode === 'typeon') visible = f < ch.at ? 0 : Math.floor((f - ch.at) / (ch.perChar || 1)) + 1;
    const riseE = ch && ch.mode === 'rise' ? easeFn(ch.ease || 'snap') : null;
    for (const line of lay.lines) {
      if (riseE) {
        ctx.save(); ctx.beginPath();
        ctx.rect(-50, line.baseline - lay.lineHeight * 1.05, lay.width + 100, lay.lineHeight * 1.25); ctx.clip();
      }
      for (const c of line.chars) {
        if (idx >= visible) { if (riseE) ctx.restore(); return; }
        let dy = 0;
        if (riseE) {
          const s = ch.at + idx * (ch.stagger || 2);
          const p = Math.max(0, Math.min(1, (f - s) / (ch.dur || 12)));
          dy = (1 - riseE(p)) * lay.lineHeight * 1.1;
        }
        if (c.ch !== ' ') ctx.fillText(c.ch, line.x + c.x, line.baseline + dy);
        idx++;
      }
      if (riseE) ctx.restore();
    }
  }

  draw_ticker(L, f) {
    const { ctx } = this; const [w, h] = L.size;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    if (L.band && !/^#[0-9A-F]{6}00$/.test(L.band)) { ctx.fillStyle = L.band; ctx.fillRect(0, 0, w, h); }
    if (L.rule) { ctx.fillStyle = L.rule; ctx.fillRect(0, 0, w, 1); ctx.fillRect(0, h - 1, w, 1); }
    const fsz = L.fontSize; const m = M[L.font]; const cap = (m.capHeight / m.upm) * fsz;
    const items = L.items.map((s) => ({ s, w: tickerMeasure(s, L.font, fsz) }));
    const sepH = L.sepHeight, sepS = sepH / 40, sepW = 3 * sepH + 2 * T.glyph.clusterGap * sepS;
    const unit = items.reduce((a, it) => a + it.w + L.gap + sepW + L.gap, 0);
    const travel = ((L.speed * f) / this.spec.fps + (L.phase || 0)) % unit;
    let x = L.dir < 0 ? -travel : travel - unit;
    this.setFont(L.font, fsz);
    const base = h / 2 + cap / 2;
    while (x < w) {
      for (const it of items) {
        ctx.fillStyle = L.color;
        drawTracked(ctx, it.s, L.font, fsz, x, base);
        x += it.w + L.gap;
        ctx.save(); ctx.translate(x, h / 2 - sepH / 2); ctx.scale(sepS, sepS);
        ctx.fillStyle = L.color;
        ['star', 'sparkle', 'plus'].forEach((g, i) => { ctx.save(); ctx.translate(i * (40 + T.glyph.clusterGap), 0); ctx.fill(P2D(T.glyph[g])); ctx.restore(); });
        ctx.restore();
        x += sepW + L.gap;
      }
    }
    ctx.restore();
  }

  draw_footage(L, f) {
    const { ctx } = this; const [w, h] = L.size;
    let a = this.assets[L.id] || (L.src && this.assets[L.src]);
    if (a === true) a = null;
    let src; let sw, sh;
    if (a) { src = a; sw = a.videoWidth || a.naturalWidth || a.width; sh = a.videoHeight || a.naturalHeight || a.height; }
    else { src = placeholderPlate(w, h, L.seed || 1, L.kind); sw = w; sh = h; }
    const s = L.fit === 'contain' ? Math.min(w / sw, h / sh) : Math.max(w / sw, h / sh);
    const dw = sw * s, dh = sh * s;
    const filters = [];
    if (L.blur) filters.push(`blur(${L.blur}px)`);
    if (L.exposure) filters.push(`brightness(${Math.pow(2, L.exposure).toFixed(3)})`);
    if (L.saturation != null && L.saturation !== 1) filters.push(`saturate(${L.saturation})`);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    if (filters.length) ctx.filter = filters.join(' ');
    ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
    ctx.restore();
  }

  draw_image(L) { const a = this.assets[L.src]; if (!a) return; const [w, h] = L.size; this.ctx.drawImage(a, 0, 0, w, h); }

  draw_texture(L, f) {
    const { ctx } = this; const [w, h] = L.size;
    if (L.opacity != null) ctx.globalAlpha *= L.opacity;
    if (L.kind === 'grid') ctx.drawImage(gridPlate(w, h, L.grid, L.line), 0, 0);
    else if (L.kind === 'crumple') ctx.drawImage(crumplePlate(w, h, L.seed || 11), 0, 0);
    else if (L.kind === 'grain') { ctx.globalAlpha *= L.amount ?? 0.14; ctx.imageSmoothingEnabled = false; ctx.drawImage(grainFrame(w, h, L.seed || 1, Math.floor(f)), 0, 0, w, h); ctx.imageSmoothingEnabled = true; }
  }

  draw_group(L, f, box, inside) {
    const { ctx } = this;
    if (L.clip) {
      const [w, h] = L.size; ctx.beginPath();
      if (L.clip === 'ellipse') ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); else ctx.rect(0, 0, w, h);
      ctx.clip();
    }
    this.drawLayers(L.layers, f, inside);
  }

  draw_three(L) {
    const src = this.threeLayers[L.id];
    if (!src) return;
    const [w, h] = L.size;
    this.ctx.drawImage(src, 0, 0, w, h);
  }
}

/* text helpers shared with ticker */
const layCache = new WeakMap();
import { layoutText, fmtTC } from './core.js';
function layoutCached(L) {
  let l = layCache.get(L);
  if (!l) { l = layoutText({ text: L.text, font: L.font, size: L.size, tracking: L.tracking, lineHeight: L.lineHeight, align: L.align }); layCache.set(L, l); }
  return l;
}
function counterText(L, f, fps) {
  const c = L.counter, n = Math.floor(f) - L.in + (c.start || 0);
  if (c.mode === 'timecode') return fmtTC(n, fps);
  if (c.mode === 'number') { const v = (c.from ?? 0) + ((c.to ?? 100) - (c.from ?? 0)) * Math.min(1, Math.max(0, (Math.floor(f) - L.in) / Math.max(1, c.frames || 30))); return (c.prefix || '') + Math.round(v).toLocaleString('en-US') + (c.suffix || ''); }
  return L.text;
}
function tickerMeasure(s, font, size) { return layoutText({ text: s, font, size }).width; }
function drawTracked(ctx, s, font, size, x, base) {
  const l = layoutText({ text: s, font, size });
  for (const c of l.lines[0].chars) if (c.ch !== ' ') ctx.fillText(c.ch, x + c.x, base);
}
export { fontOf };

export { gridPlate, crumplePlate, placeholderPlate };
