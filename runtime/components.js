// Ink & Signal — component library (pure JS). Each component adds layers to a Comp.
// Timing comes from tokens (frames @30fps); easing names come from tokens.ease.
import { T, anim, layoutText, measure, applyCase, GLYPH, scalePath, tornPanelPath, arrowPaths, scribbleEllipse, rng, wrap } from './core.js';
import { anchorFrac, round } from './spec.js';

const D = T.duration;
const fpsScale = (c) => c.fps / 30; // token durations are authored at 30fps
const fr = (c, n) => Math.round(n * fpsScale(c));

/* ═════════════════════════ backgrounds ═════════════════════════ */

/** Night world: footage (or placeholder) blurred + darkened + slow push, dark grid, grain */
export function bgNight(c, { src = null, seed = 7, push = true, look = 'behindTitles', grid = true, grain = true, inF = 0, outF = c.duration } = {}) {
  const F = T.footage[look];
  c.add('solid', { id: 'night', color: 'night', size: [c.W, c.H], in: inF, out: outF });
  c.add('footage', {
    id: 'footage', src, seed, size: [c.W + 80, c.H + 80], fit: 'cover', in: inF, out: outF,
    blur: F.blurPx, exposure: F.exposure, saturation: F.saturation,
    t: {
      anchor: [(c.W + 80) / 2, (c.H + 80) / 2], position: [c.W / 2, c.H / 2],
      scale: push ? anim([inF, [F.pushFrom * 100, F.pushFrom * 100], 'drift'], [outF, [F.pushTo * 100, F.pushTo * 100]]) : [100, 100],
    },
  });
  if (grid) c.add('texture', { id: 'nightGrid', kind: 'grid', size: [c.W, c.H], grid: T.grid.night[c.format === 'yt' ? 'yt' : 'reel'], line: c.c(T.grid.night.line), in: inF, out: outF });
  if (grain) c.add('texture', { id: 'grain', kind: 'grain', size: [c.W, c.H], amount: T.footage.grain.amount, seed, blend: 'screen', in: inF, out: outF });
}

/** Paper world: off-white, graph grid, crumple light */
export function bgPaper(c, { seed = 11, grid = true, crumple = true, inF = 0, outF = c.duration } = {}) {
  c.add('solid', { id: 'paper', color: 'paper', size: [c.W, c.H], in: inF, out: outF });
  if (grid) c.add('texture', { id: 'paperGrid', kind: 'grid', size: [c.W, c.H], grid: T.grid.paper[c.format === 'yt' ? 'yt' : 'reel'], line: c.c(T.grid.paper.line), in: inF, out: outF });
  if (crumple) c.add('texture', { id: 'crumple', kind: 'crumple', size: [c.W, c.H], seed, opacity: T.footage.crumple.opacity, blend: 'multiply', in: inF, out: outF });
}

/* ═════════════════════════ the selection ═════════════════════════ */

/**
 * Title entering as a design-tool selection:
 * box draws (6f, snap) → handles pop (4f, stamp) → type lands 112%→100% (12f, snap).
 */
export function selectionTitle(c, {
  text, x = c.W / 2, y = c.H / 2, size = c.ts.hero, font = 'display', color = 'accent', boxColor = 'accent',
  at = 0, out, handles = 8, pad, sw, hs, label = null, labelColor, id = 'title',
} = {}) {
  const t = c.text({ id, text, font, size, color, x, y, anchor: 'c', in: at, out: out ?? c.duration });
  const L = t._layout;
  const small = size < 90;
  const strokeW = sw ?? (small ? T.stroke.selection.small : T.stroke.selection.reel);
  const handleS = hs ?? (small ? T.stroke.handle.small : T.stroke.handle.reel);
  const [px, py] = pad ?? [Math.round(size * 0.11), Math.round(size * 0.06)];
  const bw = L.width + px * 2, bh = L.height + py * 2;
  const x0 = x - bw / 2, y0 = y - bh / 2;
  const d0 = at, d1 = at + fr(c, D.selectionDraw), d2 = d1 + fr(c, D.handlePop);
  const tl0 = at + fr(c, 4), tl1 = tl0 + fr(c, D.titleLand);
  t.t.scale = anim([tl0, [112, 112], 'snap'], [tl1, [100, 100]]);
  t.t.opacity = anim([tl0, 0, 'linear'], [tl0 + fr(c, 3), 100]);
  t.t.anchor = [round(L.width / 2), round(L.height * 0.6)];
  t.t.position = [x, y - L.height / 2 + L.height * 0.6];

  const box = c.add('rect', {
    id: id + '_box', size: [round(bw), round(bh)], stroke: boxColor, sw: strokeW, in: at, out: out ?? c.duration,
    t: { position: [round(x0), round(y0)] },
    reveal: { mode: 'box', p: anim([d0, 0, 'snap'], [d1, 1]) },
  });
  const pts = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]].slice(0, handles);
  pts.forEach(([fx, fy], i) => {
    c.add('rect', {
      id: `${id}_h${i}`, size: [handleS, handleS], fill: 'white', stroke: boxColor, sw: strokeW, in: at, out: out ?? c.duration,
      t: {
        anchor: [handleS / 2, handleS / 2], position: [round(x0 + bw * fx), round(y0 + bh * fy)],
        scale: anim([d1, [0, 0], 'stamp'], [d2, [100, 100]]),
      },
    });
  });
  if (label) {
    c.text({
      id: id + '_dims', text: label, font: 'data', size: Math.max(14, Math.round(size * 0.085)), color: labelColor || boxColor,
      x: round(x0 + bw - 12), y: round(y0 + bh + Math.max(16, size * 0.09)), anchor: 'tr', in: d2, out: out ?? c.duration,
    });
  }
  return { x0, y0, x1: x0 + bw, y1: y0 + bh, w: bw, h: bh, landed: tl1, layer: t, box };
}

/* ═════════════════════════ ticker ═════════════════════════ */

/** marquee band. Linear, never eases. dir -1 = moves left, 1 = moves right */
export function ticker(c, { y, items = ['Ink', 'Signal'], height = c.ts.tickerBand, size = c.ts.ticker, speed = T.speed.tickerPxPerSec, dir = -1, at = 0, out, band = 'ink', textColor = 'white', font = 'label', id, phase = 0, x = 0, width = c.W } = {}) {
  return c.add('ticker', {
    id: id || `ticker_${y}`, in: at, out: out ?? c.duration,
    size: [width, height], band, rule: c.c('nightLine'), items: items.map((s) => applyCase(s, font)),
    font, fontSize: size, color: textColor, gap: Math.round(size * 1.15), sep: 'cluster', sepHeight: Math.round(size * 0.66),
    speed, dir, phase,
    t: { position: [x, y] },
  });
}

/* ═════════════════════════ HUD ═════════════════════════ */

export function hud(c, { text, x, y, anchor = 'tl', font = 'hud', size = c.ts.hud, color = 'accent', at = 0, out, typeon = true, id }) {
  const n = [...String(text)].length;
  return c.text({
    id, text, font, size, color, x, y, anchor, in: at, out: out ?? c.duration,
    chars: typeon ? { mode: 'typeon', at, perChar: fr(c, D.typeOnPerChar), count: n } : undefined,
  });
}

/** four corner labels, inset from edges, safe-zone aware */
export function hudCorners(c, { tl, tr, bl, br, at = 0, out, color = 'accent', inset, top, bottom } = {}) {
  const e = inset ?? c.edge;
  const yt = top ?? (c.format === 'reel' ? c.safe.top + 50 : 110);
  const yb = bottom ?? (c.format === 'reel' ? c.H - c.safe.bottom - 100 : c.H - 110);
  const outF = out ?? c.duration;
  if (tl) hud(c, { id: 'hud_tl', text: tl, x: e, y: yt, anchor: 'tl', color, at, out: outF });
  if (tr) hud(c, { id: 'hud_tr', text: tr, x: c.W - e, y: yt, anchor: 'tr', color, at: at + 2, out: outF });
  if (bl) hud(c, { id: 'hud_bl', text: bl, x: e, y: yb, anchor: 'bl', color, at: at + 4, out: outF, font: 'data' });
  if (br) hud(c, { id: 'hud_br', text: br, x: c.W - e, y: yb, anchor: 'br', color, at: at + 6, out: outF });
}

/* ═════════════════════════ glyphs ═════════════════════════ */

/** the glyph trio stamping in: rotate −90°→0°, scale 0→100 with overshoot, staggered */
export function glyphRow(c, { glyphs = ['star', 'sparkle', 'plus'], x = c.W / 2, y, size = 56, gap = 20, color = 'ink', at = 0, out, stagger = D.stampStagger, id = 'glyph' }) {
  const total = glyphs.length * size + (glyphs.length - 1) * gap;
  glyphs.forEach((g, i) => {
    const s = at + fr(c, stagger) * i, e = s + fr(c, D.stampSpin);
    c.add('path', {
      id: `${id}_${i}`, d: scalePath(GLYPH[g], size / 40), fill: color, box: [size, size], in: at, out: out ?? c.duration,
      t: {
        anchor: [size / 2, size / 2], position: [round(x - total / 2 + i * (size + gap) + size / 2), y],
        rotation: anim([s, -90, 'stamp'], [e, 0]), scale: anim([s, [0, 0], 'stamp'], [e, [100, 100]]),
      },
    });
  });
  return { width: total };
}

/* ═════════════════════════ handwriting ═════════════════════════ */

export function handNote(c, { text, x, y, size = c.ts.note, color = 'pen', rotation = -4, at = 0, out, dur = D.writeOn, anchor = 'tl', font = 'note', id }) {
  const L = c.text({
    id, text, font, size, color, x, y, anchor, in: at, out: out ?? c.duration,
    reveal: { mode: 'x', p: anim([at, 0, 'write'], [at + fr(c, dur), 1]) },
  });
  L.t.rotation = rotation;
  return L;
}

export function arrow(c, { from, to, bend = 0.3, color = 'pen', sw = T.stroke.pen, at = 0, out, dur = D.arrowDraw, head = 26, id = 'arrow' }) {
  const { shaft, head: hd } = arrowPaths(from, to, { bend, head });
  const e1 = at + fr(c, dur);
  c.add('path', { id: id + '_shaft', d: shaft, stroke: color, sw, cap: 'round', join: 'round', in: at, out: out ?? c.duration, trim: anim([at, 0, 'write'], [e1, 1]) });
  c.add('path', { id: id + '_head', d: hd, stroke: color, sw, cap: 'round', join: 'round', in: at, out: out ?? c.duration, trim: anim([e1 - 2, 0, 'write'], [e1 + 3, 1]) });
}

export function circleMark(c, { x, y, w, h, color = 'signalDeep', sw = 4, at = 0, out, dur = D.circleDraw, seed = 3, id = 'circle' }) {
  c.add('path', {
    id, d: scribbleEllipse(w, h, seed), stroke: color, sw, cap: 'round', join: 'round', box: [w, h], in: at, out: out ?? c.duration,
    t: { position: [x - w / 2, y - h / 2] }, trim: anim([at, 0, 'write'], [at + fr(c, dur), 1]),
  });
}

/* ═════════════════════════ polaroid ═════════════════════════ */

export function polaroid(c, { x, y, w = 380, imgH, caption = '', rotation = -6, at = 0, out, src = null, seed = 5, capSize, id = 'polaroid' }) {
  const ih = imgH ?? Math.round(w * 0.79);
  const pad = Math.round(w * 0.047), padB = Math.round(w * 0.2);
  const h = pad + ih + padB;
  const s = at, e = at + fr(c, D.polaroidDrop);
  return c.group({
    id, size: [w, h], in: at, out: out ?? c.duration,
    t: {
      anchor: [w / 2, h / 2],
      position: anim([s, [x, y - 60], 'stamp'], [e, [x, y]]),
      rotation: anim([s, rotation - 10, 'stamp'], [e, rotation]),
      opacity: anim([s, 0, 'linear'], [s + fr(c, 4), 100]),
    },
  }, () => {
    c.add('rect', { id: id + '_card', size: [w, h], fill: 'white', shadow: { blur: 40, dy: 18, color: '#00000080' }, in: at, out: out ?? c.duration });
    c.add('footage', { id: id + '_img', src, seed, size: [w - pad * 2, ih], fit: 'cover', in: at, out: out ?? c.duration, t: { position: [pad, pad] } });
    if (caption) c.text({ id: id + '_cap', text: caption, font: 'noteSoft', size: capSize ?? Math.round(w * 0.09), color: 'ink', x: pad, y: pad + ih + Math.round(padB * 0.18), anchor: 'tl', in: at, out: out ?? c.duration });
  });
}

/* ═════════════════════════ cutout portrait ═════════════════════════ */

export function cutout(c, { x, y, d = 176, ring = 'accent', gapColor = 'paper', at = 0, out, src = null, id = 'cutout' }) {
  const R = d + 40, s = at, e = at + fr(c, D.stampSpin);
  return c.group({
    id, size: [R, R], in: at, out: out ?? c.duration,
    t: { anchor: [R / 2, R / 2], position: [x, y], rotation: anim([s, -90, 'stamp'], [e, 0]), scale: anim([s, [0, 0], 'stamp'], [e, [100, 100]]) },
  }, () => {
    c.add('ellipse', { id: id + '_ring', size: [R, R], fill: ring, in: at, out: out ?? c.duration });
    c.add('ellipse', { id: id + '_gap', size: [d + 18, d + 18], fill: gapColor, in: at, out: out ?? c.duration, t: { position: [11, 11] } });
    c.group({ id: id + '_photo', size: [d, d], clip: 'ellipse', in: at, out: out ?? c.duration, t: { position: [20, 20] } }, () => {
      c.add('footage', { id: id + '_img', src, seed: 2, kind: 'portrait', size: [d, d], fit: 'cover', in: at, out: out ?? c.duration });
    });
  });
}

/* ═════════════════════════ transitions ═════════════════════════ */

/** 2-frame flash. Put the cut on `at`. */
export function flash(c, { at, frames = D.flash, color = 'white', id } = {}) {
  c.add('solid', { id: id || `flash_${at}`, color, size: [c.W, c.H], in: at, out: at + fr(c, frames) });
}

/** torn-paper panel wipes across and fully covers the frame at `at` (cut underneath), then exits */
export function tornWipe(c, { at, dur = D.tornWipe, color = 'ink', dir = 'up', seed = 4, hold = 2, id } = {}) {
  const ph = Math.round(c.H * 1.3), rough = Math.round(c.W * 0.06);
  const d = tornPanelPath(c.W, ph, { rough, seed, top: true, bottom: true });
  const covered = -Math.round(c.H * 0.15);
  const k = dir === 'up'
    ? [[at - fr(c, dur), [0, c.H + 10], 'wipe'], [at, [0, covered], 'hold'], [at + hold, [0, covered], 'wipe'], [at + hold + fr(c, dur), [0, -ph - 10]]]
    : [[at - fr(c, dur), [0, -ph - 10], 'wipe'], [at, [0, covered], 'hold'], [at + hold, [0, covered], 'wipe'], [at + hold + fr(c, dur), [0, c.H + 10]]];
  c.add('path', { id: id || `torn_${at}`, d, fill: color, box: [c.W, ph], in: at - fr(c, dur), out: at + hold + fr(c, dur) + 1, t: { position: anim(...k) } });
}

/** a ticker band that grows to fill the frame (cover at `at`) and collapses */
export function tickerWipe(c, { at, dur = 9, items = ['Next', 'Up'], band = 'ink', id = 'tickerWipe' }) {
  const h0 = c.ts.tickerBand, s = at - fr(c, dur), e = at + 2 + fr(c, dur);
  c.group({ id, size: [c.W, c.H], in: s, out: e + 1, clip: true }, () => {
    c.add('rect', {
      id: id + '_band', size: [c.W, c.H], fill: band, in: s, out: e + 1,
      t: { anchor: [c.W / 2, c.H / 2], position: [c.W / 2, c.H / 2], scale: anim([s, [100, (h0 / c.H) * 100], 'wipe'], [at, [100, 100], 'hold'], [at + 2, [100, 100], 'wipe'], [e, [100, 0]]) },
    });
    ticker(c, { id: id + '_tk', y: c.H / 2 - h0 / 2, items, at: s, out: e + 1, band: '#00000000' });
  });
}

/* ═════════════════════════ captions ═════════════════════════ */

/**
 * Word-timed captions. words: [{ text, start, end }] in seconds.
 * Active word gets a signal plate and ink text; pages hold up to `lines` lines.
 */
export function captions(c, { words, x = c.W / 2, y, maxWidth, size = c.ts.caption, font = 'display', lines = 2, color = 'white', plate = 'accent', activeColor = 'ink', offset = 0, id = 'cap' }) {
  const mw = maxWidth ?? (c.W - c.edge * 2 - (c.format === 'reel' ? c.safe.right - c.edge : 0));
  const padX = Math.round(size * 0.18), padY = Math.round(size * 0.06);
  const space = measure(' ', font, size) + padX * 0.6;
  const lh = Math.round(size * 1.18);
  const W = words.map((w) => ({ ...w, t: applyCase(w.text, font), f0: Math.round((w.start + offset) * c.fps), f1: Math.round((w.end + offset) * c.fps) }));
  W.forEach((w) => { w.w = measure(w.t, font, size) + padX * 2; });
  // paginate
  const pages = []; let page = [[]]; let lineW = 0;
  W.forEach((w, i) => {
    const gapBreak = i > 0 && w.f0 - W[i - 1].f1 > c.fps * 0.6;
    const punct = i > 0 && /[.!?]$/.test(W[i - 1].text);
    const fits = lineW + (page[page.length - 1].length ? space : 0) + w.w <= mw;
    if ((gapBreak || punct) && page[0].length) { pages.push(page); page = [[]]; lineW = 0; }
    else if (!fits) {
      if (page.length >= lines) { pages.push(page); page = [[]]; } else page.push([]);
      lineW = 0;
    }
    const ln = page[page.length - 1];
    lineW += (ln.length ? space : 0) + w.w; ln.push(w);
  });
  if (page[0].length) pages.push(page);
  pages.forEach((pg, pi) => {
    const p0 = pg[0][0].f0;
    const last = pg[pg.length - 1]; const p1 = pi < pages.length - 1 ? pages[pi + 1][0][0].f0 : last[last.length - 1].f1 + fr(c, 6);
    const blockH = pg.length * lh;
    pg.forEach((ln, li) => {
      const lw = ln.reduce((s, w, i) => s + w.w + (i ? space : 0), 0);
      let cx = x - lw / 2; const cy = y - blockH / 2 + li * lh + lh / 2;
      ln.forEach((w, wi) => {
        const wx = cx + w.w / 2;
        const wEnd = Math.max(w.f1, w.f0 + fr(c, D.captionMinWord));
        c.add('rect', { id: `${id}_p${pi}_${li}_${wi}_plate`, size: [round(w.w), round(size * 1.02 + padY * 2)], fill: plate, in: w.f0, out: Math.min(wEnd, p1),
          t: { anchor: [round(w.w / 2), round((size * 1.02 + padY * 2) / 2)], position: [round(wx), round(cy)], scale: anim([w.f0, [94, 94], 'stamp'], [w.f0 + 3, [106, 106]]) } });
        c.text({ id: `${id}_p${pi}_${li}_${wi}`, text: w.t, font, size, color, x: round(wx), y: round(cy), anchor: 'c', in: p0, out: p1 });
        c.text({ id: `${id}_p${pi}_${li}_${wi}_on`, text: w.t, font, size, color: activeColor, x: round(wx), y: round(cy), anchor: 'c', in: w.f0, out: Math.min(wEnd, p1),
          t: { scale: anim([w.f0, [94, 94], 'stamp'], [w.f0 + 3, [106, 106]]) } });
        cx += w.w + space;
      });
    });
  });
  return { pages: pages.length };
}

/* ═════════════════════════ bars, chips, punches ═════════════════════════ */

export function lowerThird(c, { name, role, handle, x = 96, y, at = 0, hold = 90, size = 60, id = 'lt' }) {
  const by = y ?? c.H - 110;
  const nameW = measure(applyCase(name, 'display'), 'display', size) + 30 * 2 + 24 + 40;
  const nameH = Math.round(size * 0.9 + 32);
  const roleSize = Math.round(size * 0.43), dataSize = Math.round(size * 0.37);
  const roleW = 30 * 2 + measure(applyCase(role, 'label'), 'label', roleSize) + (handle ? 20 + measure(handle, 'data', dataSize) : 0);
  const roleH = Math.round(roleSize * 1.0 + 22);
  const inA = at, inB = at + fr(c, 4), outA = at + hold, outB = at + hold + fr(c, 4);
  const slide = (s, e, w) => anim([s, [-w - 10, 0], 'snap'], [s + fr(c, D.slideIn), [0, 0], 'hold'], [e, [0, 0], 'exit'], [e + fr(c, D.slideOut), [-w - 10, 0]]);
  const top = by - roleH - nameH;
  c.group({ id: id + '_name', size: [round(nameW) + 2, nameH + 2], clip: true, in: inA, out: outA + fr(c, D.slideOut) + 1, t: { position: [x, top] } }, () => {
    c.group({ id: id + '_nameIn', size: [round(nameW), nameH], in: inA, out: outA + fr(c, D.slideOut) + 1, t: { position: slide(inA, outA, nameW) } }, () => {
      c.add('rect', { id: id + '_nameBar', size: [round(nameW), nameH], fill: 'ink', stroke: 'nightLine', sw: 1, in: inA, out: outA + fr(c, D.slideOut) + 1 });
      c.text({ id: id + '_nameTxt', text: name, font: 'display', size, color: 'white', x: 30, y: nameH / 2 + 2, anchor: 'cl', in: inA, out: outA + fr(c, D.slideOut) + 1 });
      c.add('path', { id: id + '_star', d: scalePath(GLYPH.star, 1), fill: 'accent', box: [40, 40], in: inA, out: outA + fr(c, D.slideOut) + 1,
        t: { anchor: [20, 20], position: [round(nameW - 50), nameH / 2], rotation: anim([inA + 6, -90, 'stamp'], [inA + 14, 0]), scale: anim([inA + 6, [0, 0], 'stamp'], [inA + 14, [100, 100]]) } });
    });
  });
  c.group({ id: id + '_role', size: [round(roleW) + 2, roleH], clip: true, in: inB, out: outB + fr(c, D.slideOut) + 1, t: { position: [x, top + nameH] } }, () => {
    c.group({ id: id + '_roleIn', size: [round(roleW), roleH], in: inB, out: outB + fr(c, D.slideOut) + 1, t: { position: slide(inB, outB, roleW) } }, () => {
      c.add('rect', { id: id + '_roleBar', size: [round(roleW), roleH], fill: 'accent', in: inB, out: outB + fr(c, D.slideOut) + 1 });
      const rt = c.text({ id: id + '_roleTxt', text: role, font: 'label', size: roleSize, color: 'ink', x: 30, y: roleH / 2, anchor: 'cl', in: inB, out: outB + fr(c, D.slideOut) + 1 });
      if (handle) c.text({ id: id + '_handle', text: handle, font: 'data', size: dataSize, color: 'ink', x: 30 + rt.box[0] + 20, y: roleH / 2, anchor: 'cl', in: inB, out: outB + fr(c, D.slideOut) + 1 });
    });
  });
}

export function stepChip(c, { text = 'Step 01', accentText = '/ 03', y, at = 0, out, size = c.ts.label, id = 'chip' }) {
  const h = Math.round(size * 2.15);
  const tw = measure(applyCase(text, 'label'), 'label', size), aw = measure(applyCase(accentText, 'label'), 'label', size);
  const sepW = Math.round(size * 2.25);
  const w = c.edge + tw + 18 + aw + 18 + sepW + 30;
  c.group({ id, size: [round(w), h], clip: true, in: at, out: out ?? c.duration, t: { position: [0, y] } }, () => {
    c.group({ id: id + '_in', size: [round(w), h], in: at, out: out ?? c.duration, t: { position: anim([at, [-w, 0], 'snap'], [at + fr(c, D.slideIn), [0, 0]]) } }, () => {
      c.add('rect', { id: id + '_bar', size: [round(w), h], fill: 'ink', in: at, out: out ?? c.duration });
      c.add('rect', { id: id + '_rule', size: [round(w), 1], fill: 'nightLine', in: at, out: out ?? c.duration });
      c.text({ id: id + '_t', text, font: 'label', size, color: 'white', x: c.edge, y: h / 2, anchor: 'cl', in: at, out: out ?? c.duration });
      c.text({ id: id + '_a', text: accentText, font: 'label', size, color: 'accent', x: c.edge + tw + 18, y: h / 2, anchor: 'cl', in: at, out: out ?? c.duration });
      cluster(c, { x: c.edge + tw + 18 + aw + 18, y: h / 2 - sepW * 0.143, height: Math.round(sepW * 0.2857), color: 'white', id: id + '_sep', at, out });
    });
  });
}

/** the three glyphs packed as a separator (static) */
export function cluster(c, { x, y, height = 20, color = 'white', at = 0, out, id = 'cluster' }) {
  const s = height / 40, gap = T.glyph.clusterGap * s;
  ['star', 'sparkle', 'plus'].forEach((g, i) => {
    c.add('path', { id: `${id}_${i}`, d: scalePath(GLYPH[g], s), fill: color, box: [height, height], in: at, out: out ?? c.duration, t: { position: [round(x + i * (height + gap)), round(y)] } });
  });
  return 3 * height + 2 * gap;
}

export function punchWord(c, { text = 'Wait.', x, y, size = c.ts.punch, rotation = -6, at = 0, out, id = 'punch' }) {
  const tw = measure(applyCase(text, 'display'), 'display', size);
  const w = tw + 56, h = Math.round(size * 0.92 + 16);
  return c.group({
    id, size: [round(w + 16), h + 16], in: at, out: out ?? c.duration,
    wiggle: { amp: 1.2, freq: 15, seed: 3 },
    t: {
      anchor: [round((w + 16) / 2), (h + 16) / 2], position: [x, y],
      scale: anim([at, [220, 220], 'snap'], [at + fr(c, 4), [94, 94], 'snap'], [at + fr(c, D.punchSlam), [100, 100]]),
      rotation: anim([at, -30, 'snap'], [at + fr(c, 4), -2, 'snap'], [at + fr(c, D.punchSlam), rotation]),
      opacity: anim([at, 0, 'hold'], [at + 1, 100]),
    },
  }, () => {
    c.add('rect', { id: id + '_outline', size: [round(w + 16), h + 16], fill: 'white', in: at, out: out ?? c.duration });
    c.add('rect', { id: id + '_plate', size: [round(w), h], fill: 'accent', in: at, out: out ?? c.duration, t: { position: [8, 8] } });
    c.text({ id: id + '_t', text, font: 'display', size, color: 'ink', x: round((w + 16) / 2), y: (h + 16) / 2 + 2, anchor: 'c', in: at, out: out ?? c.duration });
  });
}

/** letters rise one by one out of a mask line */
export function letterRise(c, { text, x, y, size = c.ts.hero, font = 'display', color = 'ink', at = 0, out, stagger = 2, dur = 12, anchor = 'c', id = 'rise' }) {
  return c.text({ id, text, font, size, color, x, y, anchor, in: at, out: out ?? c.duration, chars: { mode: 'rise', at, stagger: fr(c, stagger), dur: fr(c, dur), ease: 'snap' } });
}

/** callout: a selection rectangle around a region of the frame + a tag */
export function callout(c, { x, y, w, h, tag = 'OBJECT 01', at = 0, out, color = 'accent', id = 'callout' }) {
  const d1 = at + fr(c, D.selectionDraw), d2 = d1 + fr(c, D.handlePop), hs = T.stroke.handle.reel, sw = T.stroke.selection.reel;
  c.add('rect', { id: id + '_box', size: [w, h], stroke: color, sw, in: at, out: out ?? c.duration, t: { position: [x, y] }, reveal: { mode: 'box', p: anim([at, 0, 'snap'], [d1, 1]) } });
  [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0.5, 1]].forEach(([fx, fy], i) => c.add('rect', {
    id: `${id}_h${i}`, size: [hs, hs], fill: 'white', stroke: color, sw, in: at, out: out ?? c.duration,
    t: { anchor: [hs / 2, hs / 2], position: [x + w * fx, y + h * fy], scale: anim([d1, [0, 0], 'stamp'], [d2, [100, 100]]) },
  }));
  const tagSize = 20, tw = measure(tag, 'data', tagSize) + 28;
  c.add('rect', { id: id + '_tagBg', size: [round(tw), 36], fill: color, in: at, out: out ?? c.duration, t: { position: [x - sw / 2, y - 48] }, reveal: { mode: 'x', p: anim([at, 0, 'snap'], [d1, 1]) } });
  c.text({ id: id + '_tag', text: tag, font: 'data', size: tagSize, color: 'ink', x: x + 14 - sw / 2, y: y - 30, anchor: 'cl', in: d1, out: out ?? c.duration });
  c.text({ id: id + '_dims', text: `W ${Math.round(w)} · H ${Math.round(h)}`, font: 'dataSoft', size: 17, color, x: x + w - 14, y: y + h - 14, anchor: 'br', in: d2, out: out ?? c.duration });
}

/** 3D layer rendered by the three.js runtime (NLEs import its rendered pass) */
export function three(c, { scene, params = {}, at = 0, out, id = 'three3d', size }) {
  return c.add('three', { id, scene, params, size: size || [c.W, c.H], in: at, out: out ?? c.duration });
}

/** preview-only guide showing the Reels UI zones (never rendered in final output) */
export function safeGuides(c) {
  if (c.format !== 'reel') return;
  const s = c.safe, col = '#2B44E02E';
  c.add('rect', { id: 'guide_top', guide: true, size: [c.W, s.top], fill: col });
  c.add('rect', { id: 'guide_bottom', guide: true, size: [c.W, s.bottom], fill: col, t: { position: [0, c.H - s.bottom] } });
  c.add('rect', { id: 'guide_right', guide: true, size: [s.right, c.H - s.top - s.bottom], fill: col, t: { position: [c.W - s.right, s.top] } });
}

export { wrap, rng, layoutText, anchorFrac };
