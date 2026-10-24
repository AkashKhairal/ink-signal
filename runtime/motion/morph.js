// Ink & Signal — Signal Motion engine: the one shape that never cuts.
// A single container morphs size, corner radius and colour from state to state (springs), its content swaps
// with a short blur, and the camera zooms so each state fills the frame. Adapted from motion-broll (MIT).
import { h, css, applyVis } from './dom.js';
import { T, track, ctrack, vis, S, clamp, sp } from './engine.js';
import { col } from './stage.js';

/**
 * morph(stage, {
 *   states: { name: { w, h, r, bg, cam, border? } },  start: 'name', seq: [[t, 'name'], ...],
 *   intro: t | null (pop in at t; null = already on screen), spring: 'morph', camSpring: 'camera',
 *   center: [sx, sy] (screen point the camera centres on), camera: true, press: [t...] (shape press dips),
 *   geom(t, g) → g (move g.cx/g.cy, focus g.fx/g.fy), extra(t, g)
 * })
 * Coordinates: world px. The shape is centred at (g.cx, g.cy) = (0, 0) unless geom moves it.
 * → { el, layer({ anchor, tin, tout, o, update, html, style }) → element, update(t) → g }
 */
export function morph(stage, cfg) {
  const { states, start, seq = [] } = cfg;
  const u = stage.u;
  const S0 = states[start];
  const spring = cfg.spring || 'morph';
  const tr = (k, def) => track(S0[k] ?? def, seq.map(([t, n]) => [t, states[n][k] ?? def]), spring);
  const W = tr('w'), H = tr('h'), R = tr('r', 24 * u);
  const bgOf = (s) => col(s.bg ?? 'surface' , stage.accent);
  const resolveBg = (c) => (c === 'surface' ? (stage.theme === 'night' ? T.color.nightPanel : '#FFFFFF') : c === 'control' ? (stage.theme === 'night' ? '#FFFFFF' : T.color.ink) : col(c, stage.accent));
  const BG = ctrack(resolveBg(bgOf(S0)), seq.map(([t, n]) => [t, resolveBg(bgOf(states[n]))]), [20, 1]);
  const CAM = track(S0.cam ?? 1, seq.map(([t, n]) => [t, states[n].cam ?? 1]), cfg.camSpring || 'camera');
  const BORDER = track(S0.border ? 1 : 0, seq.map(([t, n]) => [t, states[n].border ? 1 : 0]), [20, 1]);
  const press = track(0, (cfg.press || []).flatMap((c) => [[c - 0.07, 1, [45, 1]], [c + 0.035, 0, [22, 0.72]]]));
  const intro = cfg.intro === undefined ? 0.02 : cfg.intro;
  const [CX, CY] = cfg.center || [stage.W / 2, stage.H / 2];
  const el = h('div', { class: 'is-shape', style: { position: 'absolute', overflow: 'hidden', isolation: 'isolate', boxShadow: stage.transparent ? 'none' : 'var(--ui-shadow)' } });
  stage.world.appendChild(el);
  const layers = [];
  const api = {
    el,
    /** add a content layer anchored inside the shape: anchor 'c' centre, 't' top-centre, 'l' left-centre, 'tl' top-left, 'b' bottom-centre */
    layer({ anchor = 'c', tin = null, tout = null, o = {}, update, html, style = {}, cls } = {}) {
      const n = h('div', { class: cls, html, style: { position: 'absolute', width: '0px', height: '0px', transformOrigin: '0 0', ...style } });
      el.appendChild(n);
      layers.push({ n, anchor, tin, tout, o, update });
      return n;
    },
    update(t) {
      let g = { t, w: W(t), h: H(t), r: R(t), bg: BG(t), s: CAM(t), cx: 0, cy: 0, fx: null, fy: null, sc: 1 - 0.035 * press(t), op: 1, border: BORDER(t) };
      if (intro != null) { const a = S(t - intro, 13, 0.78); g.sc *= 0.55 + 0.45 * a; g.op = clamp((t - intro) / 0.12); }
      if (cfg.geom) g = cfg.geom(t, g) || g;
      if (g.fx == null) g.fx = g.cx; if (g.fy == null) g.fy = g.cy;
      g.r = Math.min(g.r, g.h / 2, g.w / 2);
      if (cfg.camera !== false) stage.cam.set({ x: g.fx, y: g.fy, zoom: g.s, cx: CX, cy: CY });
      css(el, {
        left: (g.cx - g.w / 2) + 'px', top: (g.cy - g.h / 2) + 'px', width: g.w + 'px', height: g.h + 'px', borderRadius: g.r + 'px',
        background: g.bg, transform: `scale(${g.sc.toFixed(5)})`, opacity: g.op,
        outline: g.border > 0.01 ? `${(1.5 * u).toFixed(2)}px solid rgba(${stage.theme === 'night' ? '255,255,255' : '14,14,14'},${(0.12 * g.border).toFixed(3)})` : 'none', outlineOffset: `${(-1.5 * u).toFixed(2)}px`,
      });
      for (const L of layers) {
        const v = vis(t, L.tin, L.tout, L.o);
        if (applyVis(L.n, v)) {
          const an = L.anchor;
          css(L.n, { left: (an === 'l' || an === 'tl' ? 0 : g.w / 2) + 'px', top: (an === 't' || an === 'tl' ? 0 : an === 'b' ? g.h : g.h / 2) + 'px' });
          if (L.update) L.update(t, g, v);
        }
      }
      if (cfg.extra) cfg.extra(t, g);
      return g;
    },
  };
  return api;
}

export { sp };
