// The edit: build a whole Reel / video from an edit plan (reel.json).
// One plan → one IS Spec → rendered in the browser, or rebuilt as a timeline in Premiere / Resolve / AE.
import { Comp } from '../spec.js';
import { T } from '../core.js';

/*
plan = {
  format: 'reel' | 'yt' | 'square' | 'portrait', fps: 30, accent: '#F2362B',
  beats: [seconds...] (optional), snap: 'beat' | 'downbeat' | false, downbeats: [seconds...] (optional),
  audio: { music, musicGainDb, voiceFromClips: true, lufs: -14 },   // used by build-reel (ffmpeg), ignored by the renderer
  timeline: [
    { type: 'comp', comp: 'hook', params: {...}, duration: 5.0 },                          // seconds
    { type: 'clip', src: 'clips/a.mp4', in: 2.0, out: 5.5, look: 'aroll', overlays: [ { comp: 'ov-captions', at: 0, params: {...} } ] },
    { type: 'transition', comp: 'tr-torn', params: { color: 'ink' } },                        // sits on the cut between neighbours
  ]
}
*/

export function snapTimes(plan, cuts) {
  const grid = plan.snap === 'downbeat' ? plan.downbeats : plan.beats;
  if (!plan.snap || !grid || !grid.length) return cuts;
  return cuts.map((t) => grid.reduce((best, b) => (Math.abs(b - t) < Math.abs(best - t) ? b : best), grid[0]));
}

export function makeEdit(registry) {
  return {
    name: 'edit', kind: 'sequence', formats: ['reel', 'yt', 'square', 'portrait'],
    title: 'Edit (whole video from a plan)',
    description: 'Builds a full Reel or YouTube video from an edit plan: comps, your clips with overlays, transitions on the cuts, optional beat snapping.',
    defaults: { plan: null },
    build(p) {
      const plan = p.plan || DEMO_PLAN;
      const fps = plan.fps || 30;
      const fmt = plan.format || p.format || 'reel';
      // 1. durations in seconds for every non-transition item
      const items = plan.timeline.filter((it) => it.type !== 'transition');
      const durs = items.map((it) => {
        if (it.type === 'clip') return (it.out ?? (it.in || 0) + 3) - (it.in || 0);
        if (it.duration) return it.duration;
        const def = registry[it.comp];
        const probe = def.build({ ...def.defaults, ...(it.params || {}), format: fmt }).toJSON();
        return probe.duration / probe.fps;
      });
      // 2. cut times (optionally snapped to the beat grid)
      let t = 0; const cuts = [];
      durs.forEach((d) => { t += d; cuts.push(t); });
      const snapped = snapTimes(plan, cuts.slice(0, -1)).concat([cuts[cuts.length - 1]]);
      const starts = [0, ...snapped.slice(0, -1)].map((s) => Math.round(s * fps));
      const ends = snapped.map((s) => Math.round(s * fps));
      const total = ends[ends.length - 1];
      const c = new Comp({ name: 'edit', format: fmt, fps, duration: total, accent: plan.accent, params: { plan } });
      c.background = T.color.night;
      // 3. place items
      let idx = 0; const placed = [];
      const tl = []; c.timeline = tl;
      plan.timeline.forEach((it) => {
        if (it.type === 'transition') { placed.push({ it, transitionAfter: idx - 1 }); return; }
        const s = starts[idx], e = ends[idx];
        if (it.type === 'clip') {
          c.group({ id: `clip${idx}`, size: [c.W, c.H], in: s, out: e, clip: true }, () => {
            const look = T.footage[it.look || 'aroll'];
            c.add('footage', {
              id: `clip${idx}_v`, src: it.src, srcIn: it.in || 0, size: [c.W + 40, c.H + 40], fit: 'cover', in: s, out: e,
              blur: look.blurPx, exposure: look.exposure, saturation: look.saturation, audio: it.audio !== false,
              t: { anchor: [(c.W + 40) / 2, (c.H + 40) / 2], position: [c.W / 2, c.H / 2], scale: { k: [[s, [look.pushFrom * 100, look.pushFrom * 100], 'drift'], [e, [look.pushTo * 100, look.pushTo * 100]]] } },
            });
            if (it.grain !== false) c.add('texture', { id: `clip${idx}_grain`, kind: 'grain', size: [c.W, c.H], amount: T.footage.grain.amount * 0.7, seed: idx + 1, blend: 'screen', in: s, out: e });
          });
          tl.push({ track: 'V1', kind: 'clip', id: `clip${idx}`, src: it.src, srcIn: it.in || 0, start: s, end: e, audio: it.audio !== false, look: it.look || 'aroll' });
          for (const [oi, ov] of (it.overlays || []).entries()) {
            const def = registry[ov.comp];
            const at = s + Math.round((ov.at || 0) * fps);
            const child = def.build({ ...def.defaults, ...(ov.params || {}), format: fmt, accent: plan.accent }).toJSON();
            const oe = Math.min(e, at + child.duration);
            c.include(child, { at, id: `clip${idx}_ov${oi}`, out: oe });
            tl.push({ track: 'V2', kind: 'overlay', id: `clip${idx}_ov${oi}`, comp: ov.comp, params: { ...(ov.params || {}), format: fmt, accent: plan.accent }, start: at, end: oe });
          }
        } else {
          const def = registry[it.comp];
          if (!def) throw new Error(`Unknown comp "${it.comp}"`);
          const child = def.build({ ...def.defaults, ...(it.params || {}), format: fmt, accent: plan.accent, duration: e - s }).toJSON();
          c.include(child, { at: s, id: `${it.comp}${idx}`, out: e });
          tl.push({ track: 'V1', kind: 'comp', id: `${it.comp}${idx}`, comp: it.comp, params: { ...(it.params || {}), format: fmt, accent: plan.accent, duration: e - s }, start: s, end: e });
        }
        c.marker(s, `${idx}: ${it.type === 'clip' ? it.src : it.comp}`);
        idx++;
      });
      // 4. transitions sit on the cut after item `transitionAfter`
      placed.forEach(({ it, transitionAfter }) => {
        if (transitionAfter < 0 || transitionAfter >= ends.length - 1) return;
        const cut = ends[transitionAfter];
        const def = registry[it.comp];
        const child = def.build({ ...def.defaults, ...(it.params || {}), format: fmt, accent: plan.accent }).toJSON();
        const cover = (child.markers.find((m) => /CUT/.test(m.label)) || { frame: 0 }).frame;
        c.include(child, { at: cut - cover, id: `tr${transitionAfter}_${it.comp}` });
        tl.push({ track: 'V3', kind: 'transition', id: `tr${transitionAfter}_${it.comp}`, comp: it.comp, params: { ...(it.params || {}), format: fmt, accent: plan.accent }, start: cut - cover, end: cut - cover + child.duration, cut });
      });
      return c;
    },
  };
}

/** a 20-second demo reel that strings the system together (placeholders stand in for your clips) */
export const DEMO_PLAN = {
  format: 'reel', fps: 30,
  timeline: [
    { type: 'comp', comp: 'hook', duration: 4.2, params: { polaroids: [] } },
    { type: 'transition', comp: 'tr-torn', params: { color: 'ink' } },
    { type: 'comp', comp: 'chapter', duration: 3.2 },
    { type: 'transition', comp: 'tr-flash' },
    { type: 'comp', comp: 'talking', duration: 5.0 },
    { type: 'transition', comp: 'tr-paper-roll', params: { title: 'Chapter 03', sub: 'in 3D', hold: 8 } },
    { type: 'comp', comp: '3d-title', duration: 3.4, params: { text: 'Done' } },
    { type: 'transition', comp: 'tr-ticker', params: { items: ['See', 'Ya'] } },
    { type: 'comp', comp: 'endcard', duration: 4.0 },
  ],
};
