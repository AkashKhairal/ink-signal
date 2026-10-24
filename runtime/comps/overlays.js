// Overlays (transparent background) for compositing over your own footage in any NLE or ffmpeg.
import { Comp } from '../spec.js';
import { T } from '../core.js';
import * as C from '../components.js';
import { DEMO_WORDS } from './aroll.js';

const F = (c, n) => Math.round((n * c.fps) / 30);
const mk = (name, p) => new Comp({ name, format: p.format, duration: p.duration, accent: p.accent, params: p });

export const ovTitle = {
  name: 'ov-title', kind: 'overlay', formats: ['reel', 'yt', 'square'], title: 'Selection title (overlay)',
  description: 'Just the selected title + optional subtitle, transparent. Put it over blurred footage.',
  defaults: { format: 'reel', duration: 75, title: 'Setup', sub: null, y: null, size: null, accent: null },
  build(p) {
    const c = mk('ov-title', p);
    const y = p.y ?? c.H / 2;
    const s = C.selectionTitle(c, { text: p.title, x: c.W / 2, y, size: p.size ?? c.ts.hero, at: 0 });
    if (p.sub) c.text({ id: 'sub', text: p.sub, font: 'display', size: c.ts.subtitle, color: 'accent', x: c.W / 2, y: s.y1 + 44, anchor: 'tc', reveal: { mode: 'x', p: { k: [[s.landed - 4, 0, 'wipe'], [s.landed + 5, 1]] } } });
    return c;
  },
};

export const ovTicker = {
  name: 'ov-ticker', kind: 'overlay', formats: ['reel', 'yt', 'square'], title: 'Ticker band (overlay)',
  description: 'A single linear ticker band. Loopable: set duration to a multiple of the cycle or let it run.',
  defaults: { format: 'reel', duration: 150, items: ['Process', 'Daily'], y: null, dir: -1, accent: null },
  build(p) {
    const c = mk('ov-ticker', p);
    C.ticker(c, { y: p.y ?? (c.format === 'yt' ? c.H - c.ts.tickerBand : 150), items: p.items, dir: p.dir });
    return c;
  },
};

export const ovHud = {
  name: 'ov-hud', kind: 'overlay', formats: ['reel', 'yt', 'square'], title: 'HUD corners (overlay)',
  description: 'Four corner labels typing on, 1 character per frame.',
  defaults: { format: 'reel', duration: 120, hud: { tl: 'Portfolio of @yourhandle', tr: 'Ultimate\nEdit Mode', bl: '00°00′00″ N, 00°00′00″ E', br: 'EP 04 / 2026' }, accent: null },
  build(p) { const c = mk('ov-hud', p); C.hudCorners(c, { ...p.hud }); return c; },
};

export const ovLowerThird = {
  name: 'ov-lowerthird', kind: 'overlay', formats: ['yt', 'reel'], title: 'Lower third (overlay)',
  description: 'Name bar + role/handle bar sliding in, glyph stamp, sliding out.',
  defaults: { format: 'yt', duration: 120, name: '[Your Name]', role: 'Creator · Editor', handle: '@yourhandle', accent: null },
  build(p) {
    const c = mk('ov-lowerthird', p); const reel = c.format !== 'yt';
    C.lowerThird(c, { name: p.name, role: p.role, handle: p.handle, x: reel ? c.edge : 96, y: reel ? c.H - c.safe.bottom - 30 : c.H - 110, at: 0, hold: c.duration - F(c, 14), size: reel ? 52 : 60 });
    return c;
  },
};

export const ovCaptions = {
  name: 'ov-captions', kind: 'overlay', formats: ['reel', 'yt', 'square'], title: 'Word captions (overlay)',
  description: 'Word-timed captions from a transcript ([{text,start,end}] in seconds). Active word on a red plate.',
  defaults: { format: 'reel', duration: 165, words: DEMO_WORDS, y: null, lines: 2, offset: 0, accent: null },
  build(p) {
    const c = mk('ov-captions', p);
    const last = p.words.length ? p.words[p.words.length - 1].end : 1;
    if (!p.durationFixed) c.duration = Math.max(p.duration, Math.ceil((last + p.offset + 0.4) * c.fps));
    C.captions(c, { words: p.words, y: p.y ?? (c.format === 'yt' ? 900 : 1290), lines: p.lines, offset: p.offset });
    return c;
  },
};

export const ovPunch = {
  name: 'ov-punch', kind: 'overlay', formats: ['reel', 'yt', 'square'], title: 'Punch word (overlay)',
  description: 'A red sticker word slams in (scale 220→94→100, rotate −30°→−6°) and jitters.',
  defaults: { format: 'reel', duration: 45, text: 'Wait.', x: null, y: null, accent: null },
  build(p) { const c = mk('ov-punch', p); C.punchWord(c, { text: p.text, x: p.x ?? c.W / 2, y: p.y ?? c.H / 2, at: 0 }); return c; },
};

export const ovCallout = {
  name: 'ov-callout', kind: 'overlay', formats: ['reel', 'yt', 'square'], title: 'Callout box (overlay)',
  description: 'Selection rectangle with handles, tag and live dimensions around anything in your shot.',
  defaults: { format: 'reel', duration: 75, x: 300, y: 600, w: 470, h: 380, tag: 'OBJECT 01', note: null, accent: null },
  build(p) {
    const c = mk('ov-callout', p);
    C.callout(c, { x: p.x, y: p.y, w: p.w, h: p.h, tag: p.tag, at: 0 });
    if (p.note) C.handNote(c, { text: p.note, x: p.x, y: p.y + p.h + 40, color: 'white', size: 54, at: F(c, 8) });
    return c;
  },
};

export const ovChip = {
  name: 'ov-chip', kind: 'overlay', formats: ['reel', 'yt', 'square'], title: 'Step chip (overlay)',
  description: '"STEP 03 / 05" band sliding in from the left edge.',
  defaults: { format: 'reel', duration: 90, text: 'Step 03', accentText: '/ 05', y: null, accent: null },
  build(p) { const c = mk('ov-chip', p); C.stepChip(c, { text: p.text, accentText: p.accentText, y: p.y ?? (c.format === 'yt' ? 80 : 260), at: 0 }); return c; },
};

export const ovNote = {
  name: 'ov-note', kind: 'overlay', formats: ['reel', 'yt', 'square'], title: 'Handwritten aside (overlay)',
  description: 'Caveat note writing on with an arrow drawing toward a point.',
  defaults: { format: 'reel', duration: 60, text: 'this bit is the secret', x: 120, y: 900, to: [700, 760], color: 'white', accent: null },
  build(p) {
    const c = mk('ov-note', p);
    C.handNote(c, { text: p.text, x: p.x, y: p.y, color: p.color, at: 0 });
    if (p.to) C.arrow(c, { from: [p.x + 300, p.y - 10], to: p.to, color: p.color, at: F(c, 6) });
    return c;
  },
};
void T;
