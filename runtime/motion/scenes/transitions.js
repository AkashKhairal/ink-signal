// Transitions that are objects (transparent; put the cut under the CUT marker). They plug into edit plans
// like the IS Spec transitions: { "type": "transition", "comp": "tr-flood" } sits on the cut between neighbours.
import { defineScene } from '../scene.js';
import { h, css } from '../dom.js';
import { T, seg, ease } from '../engine.js';
import { flood, dotGrow, barsWipe, zoomThrough } from '../fx.js';

const trScene = (def) => defineScene({ kind: 'transition', formats: ['yt', 'reel', 'square'], transparent: true, theme: 'night', ...def });
const exitDot = (S, el, t, a, b) => css(el, { display: t > b ? 'none' : '' });

export const trFlood = trScene({
  name: 'tr-flood', title: 'Line → flood', description: 'A thin accent line draws across, wobbles, then floods the frame (cover at CUT) and slides away to reveal the next shot.',
  defaults: { format: 'yt', color: 'accent', label: '', cover: 0.75 },
  duration: (p) => p.cover + 0.5,
  build(ctx) { const { S, p } = ctx; const f = ctx.add(flood(S, S.front, { at: p.cover - 0.32, dur: 0.32, lineAt: p.cover - 0.72, color: p.color, exit: p.cover + 2 / 30, label: p.label })); void f; ctx.marker(p.cover, 'CUT'); ctx.cue(p.cover - 0.72, 'movement', 'line'); ctx.cue(p.cover, 'reveal', 'flood'); },
});
export const trDot = trScene({
  name: 'tr-dot', title: 'Dot → iris', description: 'A dot grows from a point into a full-frame disc (cover at CUT), then irises out to reveal the next shot.',
  defaults: { format: 'yt', color: 'accent', x: null, y: null, cover: 0.5 },
  duration: (p) => p.cover + 0.6,
  build(ctx) { const { S, p } = ctx; ctx.add(dotGrow(S, S.front, { x: p.x ?? S.W / 2, y: p.y ?? S.H / 2, at: p.cover - 0.45, dur: 0.45, color: p.color, exit: p.cover + 2 / 30, e: [0.7, 0, 0.3, 1] })); ctx.marker(p.cover, 'CUT'); ctx.cue(p.cover - 0.45, 'movement', 'dot'); ctx.cue(p.cover, 'reveal', 'covered'); },
});
export const trBars = trScene({
  name: 'tr-bars', title: 'Bars wipe', description: 'Staggered ink bars (one in the accent) close over the frame, hold 2 frames for the cut, then open the other way.',
  defaults: { format: 'yt', color: 'ink', alt: 'accent', n: 6, cover: 0.6 },
  duration: (p) => p.cover + 0.7,
  build(ctx) { const { S, p } = ctx; ctx.add(barsWipe(S, S.front, { at: p.cover, dur: 0.34, n: p.n, color: p.color, alt: p.alt, stagger: 0.035 })); ctx.marker(p.cover, 'CUT'); ctx.cue(p.cover - 0.4, 'movement', 'bars in'); ctx.cue(p.cover + 0.07, 'movement', 'bars out'); },
});
export const trZoom = trScene({
  name: 'tr-zoom', title: 'Word zooms through', description: 'A word pops in and flies at the camera until its letters swallow the frame; the fill colour takes over at CUT, then wipes away.',
  defaults: { format: 'yt', text: 'Next', color: 'accent', fill: 'accent', cover: 0.95 },
  duration: (p) => p.cover + 0.5,
  build(ctx) {
    const { S, p } = ctx; const z = ctx.add(zoomThrough(S, S.front, { text: p.text, at: p.cover - 0.6, dur: 0.6, color: p.color, fill: p.fill }));
    ctx.add((t) => { const k = ease('wipe')(seg(t, p.cover + 2 / 30, p.cover + 0.4)); css(z.el.nextSibling, { transform: `translateY(${(-k * S.H).toFixed(2)}px)` }); if (t > p.cover) css(z.el, { display: 'none' }); });
    ctx.marker(p.cover, 'CUT'); ctx.cue(p.cover - 0.85, 'appear', 'word'); ctx.cue(p.cover - 0.6, 'movement', 'zoom'); ctx.cue(p.cover, 'reveal', 'covered');
  },
});

export const TRANSITIONS = [trFlood, trDot, trBars, trZoom];
