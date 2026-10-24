// 3D compositions: a three.js scene layer + the 2D system on top (HUD, tickers, notes).
import { Comp } from '../spec.js';
import * as C from '../components.js';

const F = (c, n) => Math.round((n * c.fps) / 30);
const DUR = { gizmoTitle: 105, popupPaper: 105, tickerRing: 150, polaroidFlythrough: null, paperRoll: 63 };

export const g3dTitle = {
  name: '3d-title', kind: '3d', formats: ['reel', 'yt', 'square'], title: '3D gizmo title',
  description: 'Extruded title (red face, ink sides) lands inside a red 3D selection gizmo; camera swings from 3/4 to front; ticker on the floor; HUD on top.',
  defaults: { format: 'reel', duration: 105, text: 'Setup', world: 'night', ticker: ['Chapter 02', 'The Setup'], hud: { tl: 'Chapter 02', tr: 'Ink & Signal\n3D', bl: '00°00′00″ N, 00°00′00″ E', br: 'EP 04 / 2026' }, accent: null },
  build(p) {
    const c = new Comp({ name: '3d-title', format: p.format, duration: p.duration, accent: p.accent, params: p });
    C.three(c, { scene: 'gizmoTitle', params: { text: p.text, world: p.world, ticker: p.ticker, duration: p.duration } });
    if (p.hud) C.hudCorners(c, { ...p.hud, at: F(c, 6), color: p.world === 'paper' ? 'ink' : 'accent' });
    C.flash(c, { at: 0 });
    return c;
  },
};

export const g3dPopup = {
  name: '3d-popup', kind: '3d', formats: ['reel', 'yt', 'square'], title: '3D pop-up paper',
  description: 'Title lying on graph paper pops up like a pop-up book; glyph trio stamps in above it.',
  defaults: { format: 'reel', duration: 105, text: 'Chapter\n02', note: 'the part everyone skips', accent: null },
  build(p) {
    const c = new Comp({ name: '3d-popup', format: p.format, duration: p.duration, accent: p.accent, params: p });
    C.three(c, { scene: 'popupPaper', params: { text: p.text, duration: p.duration } });
    const reel = c.format !== 'yt';
    c.text({ id: 'k', text: 'Ink & Signal', font: 'label', size: 22, color: 'ink', x: c.edge, y: reel ? 270 : 64, anchor: 'tl' });
    c.text({ id: 'y', text: '2026', font: 'label', size: 22, color: 'ink', x: c.W - c.edge, y: reel ? 270 : 64, anchor: 'tr' });
    if (p.note) C.handNote(c, { text: p.note, x: c.W / 2 - (reel ? 300 : 360), y: reel ? 1330 : c.H - 170, size: reel ? 64 : 56, at: F(c, 36) });
    return c;
  },
};

export const g3dRing = {
  name: '3d-ring', kind: '3d', formats: ['reel', 'yt', 'square'], title: '3D ticker ring',
  description: 'An extruded word with a ticker band orbiting it like a planet ring. Night world, red rim light.',
  defaults: { format: 'reel', duration: 150, text: 'Signal', items: ['Ink', 'Signal', 'Process', 'Daily'], hud: { tl: 'Portfolio of @yourhandle', br: '2026' }, accent: null },
  build(p) {
    const c = new Comp({ name: '3d-ring', format: p.format, duration: p.duration, accent: p.accent, params: p });
    C.three(c, { scene: 'tickerRing', params: { text: p.text, items: p.items, duration: p.duration } });
    if (p.hud) C.hudCorners(c, { ...p.hud, at: F(c, 8) });
    return c;
  },
};

export const g3dPolaroids = {
  name: '3d-polaroids', kind: '3d', formats: ['reel', 'yt', 'square'], title: '3D polaroid fly-through',
  description: 'Polaroids hang in the dark; the camera moves-and-holds from one to the next and lands on the hero shot.',
  defaults: { format: 'reel', count: 5, captions: ['day 01', 'the first try', 'week 3', 'it clicked', 'okay, it worked'], srcs: [], hold: 22, move: 16, chip: { text: 'The journey', accent: '/ 90 days' }, accent: null },
  build(p) {
    const k = 30;
    const dur = p.count * (p.hold + p.move) - p.move + 20;
    const c = new Comp({ name: '3d-polaroids', format: p.format, duration: p.duration || dur, accent: p.accent, params: p });
    C.three(c, { scene: 'polaroidFlythrough', params: { count: p.count, captions: p.captions, srcs: p.srcs, hold: p.hold, move: p.move } });
    if (p.chip) C.stepChip(c, { text: p.chip.text, accentText: p.chip.accent, y: c.format === 'yt' ? 80 : 260, at: F(c, 4) });
    void k;
    return c;
  },
};

export const trPaperRoll = {
  name: 'tr-paper-roll', kind: 'transition', formats: ['reel', 'yt', 'square'], title: '3D paper roll (chapter transition)',
  description: 'A graph-paper page unrolls up over the frame carrying a chapter title, holds, then rolls away. Transparent outside the page; cut under the hold.',
  defaults: { format: 'reel', title: 'Chapter 02', sub: 'the setup', cover: 16, hold: 30, out: 16, accent: null },
  build(p) {
    const d = p.cover + p.hold + p.out + 1;
    const c = new Comp({ name: 'tr-paper-roll', format: p.format, duration: d, accent: p.accent, params: p });
    C.three(c, { scene: 'paperRoll', params: { title: p.title, sub: p.sub, cover: p.cover, hold: p.hold, out: p.out } });
    c.marker(F(c, p.cover), 'CUT (page covers frame)');
    return c;
  },
};
void DUR;
