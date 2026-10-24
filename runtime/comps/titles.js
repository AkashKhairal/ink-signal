// Title compositions: chapter card, hook / intro, end card. Each works for 'reel' and 'yt'.
import { Comp } from '../spec.js';
import { T, anim, measure, applyCase, GLYPH, scalePath, tornPanelPath } from '../core.js';
import * as C from '../components.js';

const F = (c, n) => Math.round((n * c.fps) / 30);

/* ───────────── chapter card ───────────── */
export const chapter = {
  name: 'chapter', kind: 'title', formats: ['reel', 'yt', 'square'],
  title: 'Chapter card',
  description: 'Blurred night footage, HUD corners, two tickers, red title selected in a gizmo box, wiped subtitle, 2-frame flash in.',
  defaults: {
    format: 'reel', duration: 105, chapter: 'Chapter 02', title: 'Setup', sub: 'Light · Desk · Cam',
    hud: { tl: 'Portfolio of @yourhandle', tr: 'Ultimate\nDesk Setup\nSeries', bl: '00°00′00″ N, 00°00′00″ E', br: 'EP 04 / 2026' },
    tickerTop: ['Chapter 02', 'The Setup'], tickerBottom: ['Setup', 'Process'], src: null, bg: true, flash: true, accent: null,
  },
  build(p) {
    const c = new Comp({ name: 'chapter', format: p.format, duration: p.duration, accent: p.accent, params: p });
    const reel = c.format !== 'yt';
    const fit = (txt, font, max, start) => { let s = start; while (s > 40 && measure(applyCase(txt, font), font, s) > max) s -= 4; return s; };
    const maxW = c.W - c.edge * 2 - (reel ? 40 : 160);
    if (p.bg) C.bgNight(c, { src: p.src });
    const tTopY = reel ? 150 : 0, tBotY = reel ? 1390 : c.H - c.ts.tickerBand;
    if (p.tickerTop) C.ticker(c, { y: tTopY, items: p.tickerTop, dir: -1 });
    if (p.tickerBottom) C.ticker(c, { y: tBotY, items: p.tickerBottom, dir: 1 });
    if (p.hud) C.hudCorners(c, { ...p.hud, at: F(c, 2), top: reel ? 270 : 110, bottom: reel ? 1340 : c.H - 110 });
    const cy = reel ? 900 : 470;
    const size = fit(p.title, 'display', maxW, c.ts.hero);
    if (p.chapter) C.hud(c, { id: 'chapterLabel', text: p.chapter, font: 'label', size: c.ts.label, color: 'white', x: c.W / 2, y: cy - size * 0.86 / 2 - (reel ? 70 : 64), anchor: 'bc', at: F(c, 2) });
    const sel = C.selectionTitle(c, { text: p.title, x: c.W / 2, y: cy, size, at: F(c, 3) });
    if (p.sub) {
      const ss = fit(p.sub, 'display', maxW, c.ts.subtitle);
      c.text({ id: 'sub', text: p.sub, font: 'display', size: ss, color: 'accent', x: c.W / 2, y: sel.y1 + (reel ? 48 : 40), anchor: 'tc', in: 0,
        reveal: { mode: 'x', p: anim([sel.landed - F(c, 4), 0, 'wipe'], [sel.landed - F(c, 4) + F(c, T.duration.subtitleWipe), 1]) } });
    }
    if (p.flash) C.flash(c, { at: 0 });
    c.marker(sel.landed, 'title landed');
    return c;
  },
};

/* ───────────── hook / intro ───────────── */
export const hook = {
  name: 'hook', kind: 'title', formats: ['reel', 'yt'],
  title: 'Hook / intro',
  description: 'Graph paper. A big word rises letter by letter with your cutout as the last letter, a handwritten aside points at you, the glyph trio stamps, then a torn night panel brings in two polaroids.',
  defaults: {
    format: 'reel', duration: 180, kicker: 'Creator / Editor', year: '2026', word: 'Hell', cutout: true, src: null,
    note: "yep, that's me", name: '[Your Name]', line: "I make [what you make]. In the next 60 seconds I'll show you exactly how.",
    polaroids: [{ caption: "day 01. no idea what I'm doing" }, { caption: 'day 90. okay, it worked' }], accent: null, bg: true,
  },
  build(p) {
    const c = new Comp({ name: 'hook', format: p.format, duration: p.duration, accent: p.accent, params: p });
    const reel = c.format !== 'yt';
    if (p.bg) C.bgPaper(c);
    const e = c.edge;
    const top = reel ? 270 : 80;
    c.text({ id: 'kicker', text: p.kicker, font: 'label', size: reel ? 26 : 22, color: 'ink', x: e, y: top, anchor: 'tl' });
    c.text({ id: 'year', text: p.year, font: 'label', size: reel ? 26 : 22, color: 'ink', x: c.W - e, y: top, anchor: 'tr' });
    // word + cutout as the last letter
    let size = reel ? 196 : 210;
    const D = reel ? 176 : 190;
    const wordW = () => measure(applyCase(p.word, 'display'), 'display', size);
    while (wordW() + (p.cutout ? D + 50 : 0) > c.W - e * 2 && size > 60) size -= 6;
    const total = wordW() + (p.cutout ? D + 50 : 0);
    const wy = reel ? 420 : 300;
    const x0 = c.W / 2 - total / 2;
    C.letterRise(c, { id: 'word', text: p.word, x: x0, y: wy, size, anchor: 'cl', at: F(c, 2), stagger: 2 });
    let cx = x0 + wordW() + 30 + (D + 40) / 2;
    if (p.cutout) C.cutout(c, { x: cx, y: wy, d: D, at: F(c, 12), src: p.src });
    // aside + arrow
    const ny = wy + (reel ? 270 : 230);
    C.handNote(c, { id: 'aside', text: p.note, x: reel ? 120 : c.W / 2 - 520, y: ny, size: reel ? 66 : 60, at: F(c, 40), rotation: -4 });
    C.arrow(c, { from: [reel ? 510 : c.W / 2 - 80, ny + 40], to: [cx - 10, wy + D / 2 + 34], bend: -0.35, at: F(c, 46) });
    C.glyphRow(c, { y: ny + (reel ? 160 : 150), size: reel ? 58 : 50, at: F(c, 30) });
    if (p.name || p.line) {
      const by = ny + (reel ? 250 : 220);
      c.text({ id: 'name', text: `Hi, I'm ${p.name}.`, font: 'label', size: reel ? 34 : 30, color: 'ink', x: e, y: by, anchor: 'tl', in: F(c, 56),
        t: { opacity: anim([F(c, 56), 0, 'snap'], [F(c, 66), 100]) } });
      const body = C.wrap(p.line, 'body', reel ? 30 : 28, reel ? c.W - e - 212 : c.W / 2);
      c.text({ id: 'line', text: body, font: 'body', size: reel ? 30 : 28, color: 'ink', x: e, y: by + (reel ? 52 : 46), anchor: 'tl', in: F(c, 60),
        t: { opacity: anim([F(c, 60), 0, 'snap'], [F(c, 70), 100]) } });
    }
    // torn night panel with polaroids
    if (p.polaroids && p.polaroids.length) {
      const py = reel ? 1130 : 760;
      const a = F(c, 84);
      const ph = c.H - py + 80;
      const torn = tornPanelPath(c.W, ph, { rough: 60, seed: 4, top: true });
      c.group({ id: 'nightPanel', size: [c.W, ph], in: a, t: { position: anim([a, [0, c.H + 70], 'wipe'], [a + F(c, 12), [0, py]]) } }, () => {
        c.add('path', { id: 'nightPanel_bg', d: torn, fill: 'ink', box: [c.W, ph], in: a });
        c.add('texture', { id: 'nightPanel_grid', kind: 'grid', size: [c.W, ph], grid: T.grid.night.reel, line: c.c(T.grid.night.line), in: a, t: { position: [0, 60] } });
        const n = p.polaroids.length;
        p.polaroids.slice(0, 3).forEach((pl, i) => {
          const w = reel ? 380 : 300;
          const px = reel ? (i === 0 ? 300 : 780) : c.W / 2 + (i - (n - 1) / 2) * 420;
          C.polaroid(c, { id: `pol${i}`, x: px, y: (reel ? 320 : 260) + (i % 2) * 40, w, caption: pl.caption, rotation: i % 2 ? 5 : -6, at: a + F(c, 10) + F(c, 4) * i, src: pl.src || null, seed: 5 + i });
        });
      });
    }
    return c;
  },
};

/* ───────────── end card ───────────── */
export const endcard = {
  name: 'endcard', kind: 'title', formats: ['reel', 'yt'],
  title: 'End card',
  description: 'Graph paper sign-off: glyph trio, a giant word rising, YouTube end-screen slots (yt) or a follow CTA (reel), a handwritten nudge and a contact row.',
  defaults: { format: 'yt', duration: 300, word: 'See ya', handle: '@yourhandle', email: '[your@email.com]', channel: '/yourchannel', cta: 'Follow for part 2', note: "tap the circle,\nit's free", accent: null, bg: true },
  build(p) {
    const c = new Comp({ name: 'endcard', format: p.format, duration: p.duration, accent: p.accent, params: p });
    const reel = c.format !== 'yt';
    if (p.bg) C.bgPaper(c, { seed: 31 });
    const e = c.edge;
    const top = reel ? 270 : 60;
    c.text({ id: 'hudL', text: `Portfolio of ${p.handle}`, font: 'hud', size: 18, color: 'ink', x: e, y: top, anchor: 'tl' });
    c.text({ id: 'hudR', text: '2026', font: 'hud', size: 18, color: 'ink', x: c.W - e, y: top, anchor: 'tr' });
    C.glyphRow(c, { y: reel ? 560 : 157, size: 54, gap: 18, at: 0 });
    let size = reel ? 190 : 230;
    const word = p.word + '.';
    while (measure(applyCase(word, 'display'), 'display', size) > c.W - e * 2 && size > 60) size -= 6;
    C.letterRise(c, { id: 'word', text: word, x: c.W / 2, y: reel ? 740 : 310, size, at: F(c, 2), stagger: 2 });
    if (!reel) {
      const sy = 520, sw = 560, sh = 315;
      [['[YT END-SCREEN VIDEO]', 'Watch next'], ['[YT END-SCREEN PLAYLIST]', 'The full series']].forEach(([ph, lab], i) => {
        const x = 240 + i * (sw + 80), a = F(c, 22) + F(c, 4) * i;
        c.group({ id: `slot${i}`, size: [sw, sh + 60], in: a, t: { anchor: [sw / 2, sh / 2], position: [x + sw / 2, sy + sh / 2], scale: anim([a, [60, 60], 'stamp'], [a + F(c, 12), [100, 100]]), opacity: anim([a, 0, 'linear'], [a + F(c, 4), 100]) } }, () => {
          c.add('rect', { id: `slot${i}_r`, size: [sw, sh], fill: 'ink', in: a });
          c.text({ id: `slot${i}_ph`, text: ph, font: 'dataSoft', size: 20, color: '#FFFFFF8C', x: sw / 2, y: sh / 2, anchor: 'c', in: a });
          c.text({ id: `slot${i}_l`, text: lab, font: 'label', size: 24, color: 'ink', x: 0, y: sh + 16, anchor: 'tl', in: a });
        });
      });
      const sx = 240 + 2 * (sw + 80) + 110, scy = sy + 40 + 110, a = F(c, 30);
      c.group({ id: 'subscribe', size: [260, 260], in: a, t: { anchor: [130, 130], position: [sx, scy], scale: anim([a, [0, 0], 'stamp'], [a + F(c, 10), [100, 100]]) } }, () => {
        c.add('ellipse', { id: 'sub_ring', size: [260, 260], fill: 'accent', in: a });
        c.add('ellipse', { id: 'sub_gap', size: [238, 238], fill: 'paper', in: a, t: { position: [11, 11] } });
        c.add('ellipse', { id: 'sub_c', size: [220, 220], fill: 'ink', in: a, t: { position: [20, 20] } });
        c.text({ id: 'sub_t', text: '[SUBSCRIBE]', font: 'dataSoft', size: 16, color: '#FFFFFF8C', x: 130, y: 130, anchor: 'c', in: a });
      });
      C.handNote(c, { id: 'nudge', text: p.note, x: sx - 120, y: sy - 90, size: 52, at: F(c, 40), rotation: -5 });
      C.arrow(c, { from: [sx - 10, sy - 0], to: [sx + 10, scy - 140], bend: -0.4, at: F(c, 48) });
    } else {
      const cy = 1000;
      const ctaS = 64;
      const ctaW = measure(applyCase(p.cta, 'display'), 'display', ctaS) + 70;
      c.group({ id: 'cta', size: [ctaW + 16, 120], in: F(c, 24), t: { anchor: [(ctaW + 16) / 2, 60], position: [c.W / 2, cy], scale: anim([F(c, 24), [0, 0], 'stamp'], [F(c, 34), [100, 100]]) } }, () => {
        c.add('rect', { id: 'cta_o', size: [ctaW + 16, 120], fill: 'ink', in: F(c, 24) });
        c.add('rect', { id: 'cta_p', size: [ctaW, 104], fill: 'accent', in: F(c, 24), t: { position: [8, 8] } });
        c.text({ id: 'cta_t', text: p.cta, font: 'display', size: ctaS, color: 'ink', x: (ctaW + 16) / 2, y: 62, anchor: 'c', in: F(c, 24) });
      });
      C.handNote(c, { id: 'nudge', text: p.note.replace('the circle', 'follow'), x: 150, y: 1170, size: 60, at: F(c, 40), rotation: -4 });
      C.arrow(c, { from: [500, 1200], to: [700, 1080], bend: 0.35, at: F(c, 48) });
    }
    // contact row
    const items = [['mail', p.email], ['camera', p.handle], ['play', p.channel]];
    const iy = reel ? 1400 : c.H - 72, isz = 22, gap = 64;
    const widths = items.map(([, t]) => 36 + measure(t, 'dataSoft', 20));
    let x = c.W / 2 - (widths.reduce((a, b) => a + b, 0) + gap * 2) / 2;
    items.forEach(([ic, t], i) => {
      c.add('path', { id: `ic_${ic}`, d: ICON[ic], stroke: 'ink', sw: 2, join: 'round', box: [24, 24], in: F(c, 50), t: { position: [x, iy - 12], opacity: anim([F(c, 50), 0], [F(c, 60), 100]) } });
      c.text({ id: `ct_${ic}`, text: t, font: 'dataSoft', size: 20, color: 'ink', x: x + 36, y: iy, anchor: 'cl', in: F(c, 50), t: { opacity: anim([F(c, 50), 0], [F(c, 60), 100]) } });
      x += widths[i] + gap;
    });
    void isz;
    return c;
  },
};

/** simple 24px stroke icons (no brand marks) */
export const ICON = {
  mail: 'M3 5H21V19H3Z M3 6L12 13L21 6',
  camera: 'M8 3H16C18.8 3 21 5.2 21 8V16C21 18.8 18.8 21 16 21H8C5.2 21 3 18.8 3 16V8C3 5.2 5.2 3 8 3Z M12 8C14.2 8 16 9.8 16 12C16 14.2 14.2 16 12 16C9.8 16 8 14.2 8 12C8 9.8 9.8 8 12 8Z M17.5 6.2L17.6 6.3',
  play: 'M2 5H22V19H2Z M10 9L15 12L10 15Z',
};
void GLYPH; void scalePath;
