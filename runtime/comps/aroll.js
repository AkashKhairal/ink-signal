// A-roll compositions: talking-head captions & callouts, lower third with B-roll and notes.
import { Comp } from '../spec.js';
import { T, anim, measure, applyCase, wrap } from '../core.js';
import * as C from '../components.js';

const F = (c, n) => Math.round((n * c.fps) / 30);

export const DEMO_WORDS = [
  { text: 'This', start: 0.4, end: 0.8 }, { text: 'is', start: 0.8, end: 1.05 }, { text: 'the', start: 1.05, end: 1.3 },
  { text: 'one', start: 1.3, end: 1.8 }, { text: 'setting', start: 2.05, end: 2.6 }, { text: 'you', start: 2.6, end: 2.85 },
  { text: 'need.', start: 2.85, end: 3.6 }, { text: 'Trust', start: 3.9, end: 4.3 }, { text: 'me', start: 4.3, end: 4.9 },
];

/* ───────────── talking head: captions + callout + punch ───────────── */
export const talking = {
  name: 'talking', kind: 'aroll', formats: ['reel', 'yt'],
  title: 'Talking head — captions & callouts',
  description: 'A-roll with word-timed captions (active word on a red plate), a step chip, a selection-box callout around an object, a handwritten note with an arrow and a punch-in word.',
  defaults: {
    format: 'reel', duration: 165, words: DEMO_WORDS, src: null,
    step: { text: 'Step 03', accent: '/ 05' }, callout: { tag: 'OBJECT 01 · [PRODUCT NAME]' }, note: 'this changed\neverything',
    punch: { text: 'Wait.', at: 1.7 }, accent: null, bg: true,
  },
  build(p) {
    const c = new Comp({ name: 'talking', format: p.format, duration: p.duration, accent: p.accent, params: p });
    const reel = c.format !== 'yt';
    if (p.bg) C.bgNight(c, { src: p.src, look: 'aroll', grid: false });
    if (p.step) C.stepChip(c, { text: p.step.text, accentText: p.step.accent, y: reel ? 260 : 80, at: F(c, 0) });
    const box = p.callout && (reel ? { x: 300, y: 500, w: 470, h: 380 } : { x: 1080, y: 210, w: 560, h: 420 });
    if (box) C.callout(c, { ...box, ...(p.callout.box || {}), tag: p.callout.tag, at: F(c, 8) });
    if (p.note && box) {
      const nx = reel ? 640 : box.x + 40, ny = reel ? 1030 : box.y + box.h + 70;
      C.arrow(c, { from: [nx + 130, ny - 10], to: [box.x + box.w * 0.62, box.y + box.h + 18], bend: 0.3, color: 'white', at: F(c, 20) });
      C.handNote(c, { id: 'note', text: p.note, x: nx, y: ny, size: reel ? 58 : 50, color: 'white', rotation: -3, at: F(c, 16) });
    }
    if (p.punch) C.punchWord(c, { text: p.punch.text, x: reel ? 330 : 360, y: reel ? 1010 : 300, at: Math.round(p.punch.at * c.fps), size: c.ts.punch });
    if (p.words && p.words.length) C.captions(c, { words: p.words, y: reel ? 1290 : 900, lines: 2 });
    return c;
  },
};

/** paper note card torn from a notebook: Caveat lines in pen blue, one word circled */
function noteCard(c, { x, y, w = 540, h = 400, title = 'Project:', lines = [], circle = null, at = 0, id = 'noteCard' }) {
  const s = at, e = at + F(c, 14);
  return c.group({
    id, size: [w, h], in: at,
    t: { anchor: [w / 2, h / 2], position: anim([s, [x + w / 2, y + h / 2 - h * 1.3], 'stamp'], [e, [x + w / 2, y + h / 2]]), rotation: anim([s, 8, 'stamp'], [e, 2]) },
  }, () => {
    c.add('rect', { id: id + '_p', size: [w, h], fill: 'paperNote', shadow: { blur: 40, dy: 20, color: '#00000073' }, in: at });
    c.add('texture', { id: id + '_g', kind: 'grid', size: [w, h], grid: T.grid.note.size, line: c.c(T.grid.note.line), in: at });
    const fs = Math.round(w * 0.067);
    c.text({ id: id + '_t', text: title, font: 'note', size: Math.round(fs * 1.28), color: 'pen', x: 34, y: 30, anchor: 'tl', in: at,
      reveal: { mode: 'x', p: anim([e, 0, 'write'], [e + F(c, 10), 1]) } });
    lines.forEach((ln, i) => {
      const a = e + F(c, 8) + i * F(c, 8);
      c.text({ id: `${id}_l${i}`, text: ln, font: 'note', size: fs, color: 'pen', x: 34, y: 30 + fs * 1.45 + i * fs * 1.12, anchor: 'tl', in: a,
        reveal: { mode: 'x', p: anim([a, 0, 'write'], [a + F(c, 12), 1]) } });
    });
    if (circle) {
      const li = circle.line, ln = lines[li];
      const pre = ln.slice(0, ln.indexOf(circle.word));
      const wx = 34 + measure(pre, 'note', fs), ww = measure(circle.word, 'note', fs);
      const cy = 30 + fs * 1.45 + li * fs * 1.12 + fs * 0.5;
      C.circleMark(c, { id: id + '_circle', x: wx + ww / 2, y: cy, w: ww + 40, h: fs * 1.3, at: e + F(c, 8) + lines.length * F(c, 8) + F(c, 6) });
    }
  });
}

/* ───────────── lower third + B-roll ───────────── */
export const lowerthird = {
  name: 'lowerthird', kind: 'aroll', formats: ['yt', 'reel'],
  title: 'Lower third + B-roll',
  description: 'A-roll with a REC timecode HUD, a notebook card dropping in, a B-roll polaroid and a two-bar lower third (name / role + handle).',
  defaults: {
    format: 'yt', duration: 210, name: '[Your Name]', role: 'Creator · Editor', handle: '@yourhandle', src: null, broll: null,
    note: { title: 'Project: [Video Name]', lines: ['→ hook in the first 2 sec', '→ cut every 1.5 sec', '→ only one red on screen', '→ end on a question'], circle: { line: 2, word: 'one red' } },
    polaroid: 'B-roll · the desk at 2am', accent: null, bg: true,
  },
  build(p) {
    const c = new Comp({ name: 'lowerthird', format: p.format, duration: p.duration, accent: p.accent, params: p });
    const reel = c.format !== 'yt';
    if (p.bg) C.bgNight(c, { src: p.src, look: 'aroll', grid: false });
    // REC + running timecode
    const rx = c.edge, ry = reel ? 270 : 76;
    const blink = []; for (let f = 0; f <= c.duration; f += F(c, 15)) blink.push([f, (f / F(c, 15)) % 2 ? 15 : 100, 'hold']);
    c.add('ellipse', { id: 'rec_dot', size: [16, 16], fill: 'accent', t: { position: [rx, ry - 8], opacity: { k: blink } } });
    c.text({ id: 'rec', text: 'REC', font: 'data', size: 22, color: 'white', x: rx + 28, y: ry, anchor: 'cl' });
    c.text({ id: 'tc', text: '00:04:12:08', font: 'data', size: 22, color: '#FFFFFFB3', x: rx + 92, y: ry, anchor: 'cl', counter: { mode: 'timecode', start: Math.round((4 * 60 + 12) * c.fps + 8) } });
    if (p.note) {
      const w = reel ? 600 : 540, h = reel ? 440 : 400;
      noteCard(c, { x: reel ? c.W - w - 150 : c.W - w - 80, y: reel ? 360 : 70, w, h, title: p.note.title, lines: p.note.lines, circle: p.note.circle, at: F(c, 18) });
    }
    if (p.polaroid) C.polaroid(c, { id: 'broll', x: reel ? 330 : 1650, y: reel ? 1010 : 760, w: reel ? 380 : 340, caption: p.polaroid, rotation: -5, at: F(c, 40), src: p.broll });
    C.lowerThird(c, { name: p.name, role: p.role, handle: p.handle, x: reel ? c.edge : 96, y: reel ? c.H - c.safe.bottom - 30 : c.H - 110, at: F(c, 6), hold: c.duration - F(c, 30), size: reel ? 52 : 60 });
    return c;
  },
};

export { noteCard, wrap, applyCase };
