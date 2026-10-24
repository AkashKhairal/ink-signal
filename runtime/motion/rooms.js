// Ink & Signal — rooms: a sequence of scenes, each with its own world and camera, joined by a short
// blur-dissolve on the plain canvas. The camera is the editor inside a room (push in, ride, pull back).
import { h, css } from './dom.js';
import { Camera, worldGrid } from './stage.js';
import { T, seg, eo, eio, clamp, kf } from './engine.js';

/**
 * rooms(ctx, [{ name, dur, bg?, grid?: 'line'|'dot'|null, build(room) → update(t) }], { dissolve, start })
 * room = { el, world, cam, t0, t1, S } — build() places content in room.world (world px, origin at centre).
 * Returns { rooms, end } (end = time the last room ends).
 */
export function rooms(ctx, list, { dissolve = T.motion.dissolve.dur, start = 0, blur = T.motion.dissolve.blurPx, parent = null } = {}) {
  const { S } = ctx;
  let t = start;
  const out = list.map((r) => {
    const el = h('div', { class: 'is-room', style: { position: 'absolute', left: '0px', top: '0px', width: S.W + 'px', height: S.H + 'px', overflow: 'hidden', transformOrigin: '50% 50%', background: r.bg === undefined ? 'transparent' : r.bg } });
    const world = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: '0px', height: '0px', transformOrigin: '0 0' } });
    el.appendChild(world);
    (parent || S.tilt).appendChild(el);
    const pseudo = { W: S.W, H: S.H, world, tilt: h('div') };
    const cam = new Camera(pseudo);
    cam.apply();
    const room = { ...r, el, world, cam, S, t0: t, t1: t + r.dur, ctx };
    if (r.grid) worldGrid({ ...S, world }, { kind: r.grid, parent: world });
    t += r.dur;
    return room;
  });
  out.forEach((room) => { room.update = room.build(room) || (() => {}); });
  const d = dissolve;
  ctx.add((tt) => {
    for (const room of out) {
      const a = room === out[0] && room.t0 <= start ? 1 : eo(seg(tt, room.t0 - d / 2, room.t0 + d / 2));
      const b = room === out[out.length - 1] ? 0 : eio(seg(tt, room.t1 - d / 2, room.t1 + d / 2));
      const o = a * (1 - b);
      if (o <= 0.001) { css(room.el, { display: 'none' }); continue; }
      css(room.el, { display: '', opacity: o, filter: (1 - a) + b > 0.01 ? `blur(${(((1 - a) + b) * blur).toFixed(2)}px)` : 'none' });
      room.update(tt);
    }
  });
  return { rooms: out, end: t };
}

/** camera keys helper for a room: [[t, { x, y, zoom }, ease?], ...] → applies with kf easing */
export function camKeys(room, keys, def = 'drift') {
  const fx = kf(keys.map(([t, v, e]) => [t, v.x ?? 0, e])), fy = kf(keys.map(([t, v, e]) => [t, v.y ?? 0, e])), fz = kf(keys.map(([t, v, e]) => [t, v.zoom ?? 1, e]));
  const fr = kf(keys.map(([t, v, e]) => [t, v.rot ?? 0, e]));
  void def;
  return (t) => room.cam.set({ x: fx(t), y: fy(t), zoom: fz(t), rot: fr(t) });
}

export { clamp };
