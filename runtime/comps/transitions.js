// Transitions (transparent). Put the cut at frame `cover` (marker "CUT") — the frame is fully covered there.
import { Comp } from '../spec.js';
import * as C from '../components.js';

const F = (c, n) => Math.round((n * c.fps) / 30);

export const trTorn = {
  name: 'tr-torn', kind: 'transition', formats: ['reel', 'yt', 'square'], title: 'Torn-paper wipe',
  description: 'A torn panel (ink or paper) sweeps across, fully covers the frame for 2 frames (cut underneath) and exits.',
  defaults: { format: 'reel', color: 'ink', dir: 'up', seed: 4, accent: null },
  build(p) {
    const fps = 30; const dur = 10; const cover = dur;
    const c = new Comp({ name: 'tr-torn', format: p.format, duration: cover + 2 + dur + 1, accent: p.accent, params: p });
    C.tornWipe(c, { at: F(c, cover), color: p.color, dir: p.dir, seed: p.seed });
    c.marker(F(c, cover), 'CUT');
    void fps;
    return c;
  },
};

export const trFlash = {
  name: 'tr-flash', kind: 'transition', formats: ['reel', 'yt', 'square'], title: '2-frame flash',
  description: 'White (or red) for 2 frames. Place frame 0 on the cut.',
  defaults: { format: 'reel', color: 'white', frames: 2, accent: null },
  build(p) {
    const c = new Comp({ name: 'tr-flash', format: p.format, duration: p.frames, accent: p.accent, params: p });
    C.flash(c, { at: 0, frames: p.frames, color: p.color });
    c.marker(0, 'CUT');
    return c;
  },
};

export const trTicker = {
  name: 'tr-ticker', kind: 'transition', formats: ['reel', 'yt', 'square'], title: 'Ticker wipe',
  description: 'A ticker band grows to fill the frame, holds 2 frames for the cut, collapses.',
  defaults: { format: 'reel', items: ['Next', 'Up'], accent: null },
  build(p) {
    const c = new Comp({ name: 'tr-ticker', format: p.format, duration: 9 + 2 + 9 + 1, accent: p.accent, params: p });
    C.tickerWipe(c, { at: F(c, 9), items: p.items });
    c.marker(F(c, 9), 'CUT');
    return c;
  },
};
