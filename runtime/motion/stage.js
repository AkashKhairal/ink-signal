// Ink & Signal — Signal Motion engine: the stage (back / world / front / cursor layers) and the camera.
// World coordinates are pixels with (0,0) at the centre of the frame when the camera is at rest.
// screen = centre + zoom · R(rot) · (world − camera)
import { h, css, tf } from './dom.js';
import { T, hex2rgb } from './engine.js';

const C = T.color;
export const col = (c, accent) => (c === 'accent' ? accent || C.signal : C[c] && typeof C[c] === 'string' ? C[c] : c);

export class Camera {
  constructor(stage) { this.stage = stage; this.x = 0; this.y = 0; this.zoom = 1; this.rot = 0; this.tiltX = 0; this.tiltY = 0; this.cx = stage.W / 2; this.cy = stage.H / 2; }
  /** set any of x, y, zoom, rot (deg), tiltX/tiltY (deg), cx/cy (screen centre) and apply */
  set(o = {}) { Object.assign(this, o); this.apply(); return this; }
  apply() {
    const { world, tilt } = this.stage;
    const z = this.zoom;
    css(world, { transform: `translate(${this.cx.toFixed(3)}px,${this.cy.toFixed(3)}px) rotate(${this.rot.toFixed(4)}deg) scale(${z.toFixed(5)}) translate(${(-this.x).toFixed(3)}px,${(-this.y).toFixed(3)}px)` });
    css(tilt, { transform: this.tiltX || this.tiltY ? `perspective(${(this.stage.H * 1.6).toFixed(0)}px) rotateX(${this.tiltX.toFixed(3)}deg) rotateY(${this.tiltY.toFixed(3)}deg)` : 'none' });
  }
  /** world → screen point (ignores tilt) */
  toScreen(wx, wy) {
    const a = (this.rot * Math.PI) / 180, dx = (wx - this.x) * this.zoom, dy = (wy - this.y) * this.zoom;
    return { x: this.cx + dx * Math.cos(a) - dy * Math.sin(a), y: this.cy + dx * Math.sin(a) + dy * Math.cos(a) };
  }
  toWorld(sx, sy) {
    const a = (-this.rot * Math.PI) / 180, dx = (sx - this.cx) / this.zoom, dy = (sy - this.cy) / this.zoom;
    return { x: this.x + dx * Math.cos(a) - dy * Math.sin(a), y: this.y + dx * Math.sin(a) + dy * Math.cos(a) };
  }
  /** zoom that makes a w×h world box fill `frac` of the frame */
  fit(w, h, frac = 0.8) { return Math.min((this.stage.W * frac) / w, (this.stage.H * frac) / h); }
}

/**
 * createStage(root, { W, H, theme: 'paper'|'night', bg: token|css|null (transparent), grid: 'line'|'dot'|null, gridSize, accent })
 * Layers (bottom → top): back (screen space) · tilt › world (camera) · front (screen space) · cursor
 */
export function createStage(root, { W, H, theme = 'paper', bg = 'canvas', grid = null, gridSize, accent = C.signal } = {}) {
  const u = Math.min(W, H) / 1080;
  const ui = T.ui[theme];
  const bgColor = bg === null ? 'transparent' : col(bg === 'canvas' ? ui.canvas : bg, accent);
  root.innerHTML = '';
  root.className = `is-stage is-${theme}`;
  css(root, {
    position: 'relative', width: W + 'px', height: H + 'px', overflow: 'hidden', background: bgColor,
    fontFamily: '"IS ui", "IS body", system-ui, sans-serif', color: 'var(--ui-text)', '--accent': accent,
    '--accent-soft': `rgba(${hex2rgb(accent).slice(0, 3).join(',')},0.16)`, '--u': String(u),
    fontVariationSettings: '"wdth" 100', fontFeatureSettings: '"tnum" 1', WebkitFontSmoothing: 'antialiased',
  });
  const abs = { position: 'absolute', left: '0px', top: '0px' };
  const back = h('div', { class: 'is-back', style: { ...abs, width: W + 'px', height: H + 'px' } });
  const tilt = h('div', { class: 'is-tilt', style: { ...abs, width: W + 'px', height: H + 'px', transformOrigin: '50% 50%' } });
  const world = h('div', { class: 'is-world', style: { ...abs, width: '0px', height: '0px', transformOrigin: '0 0' } });
  const front = h('div', { class: 'is-front', style: { ...abs, width: W + 'px', height: H + 'px', pointerEvents: 'none' } });
  const top = h('div', { class: 'is-top', style: { ...abs, width: W + 'px', height: H + 'px', pointerEvents: 'none' } });
  tilt.appendChild(world);
  root.append(back, tilt, front, top);
  const stage = { root, back, tilt, world, front, top, W, H, u, theme, ui, accent, bgColor, transparent: bg === null };
  stage.cam = new Camera(stage);
  stage.cam.apply();
  if (grid) stage.grid = worldGrid(stage, { kind: grid, size: gridSize });
  return stage;
}

/** a grid that lives in world space so camera moves read (line grid = graph paper, dot grid = night canvas) */
export function worldGrid(stage, { kind = 'line', size, color, extent = 14, parent } = {}) {
  const { W, H, u, ui } = stage;
  const s = size ?? Math.round((kind === 'dot' ? 46 : 54) * u);
  const c = color || (kind === 'dot' ? ui.dot : ui.grid);
  const w = W * extent, hh = H * extent;
  const img = kind === 'dot'
    ? `radial-gradient(circle at 50% 50%, ${c} ${(1.6 * u).toFixed(2)}px, transparent ${(2.1 * u).toFixed(2)}px)`
    : `linear-gradient(${c} ${Math.max(1, u).toFixed(2)}px, transparent ${Math.max(1, u).toFixed(2)}px), linear-gradient(90deg, ${c} ${Math.max(1, u).toFixed(2)}px, transparent ${Math.max(1, u).toFixed(2)}px)`;
  const el = h('div', { class: 'is-grid', style: { position: 'absolute', left: -w / 2 + 'px', top: -hh / 2 + 'px', width: w + 'px', height: hh + 'px', backgroundImage: img, backgroundSize: `${s}px ${s}px`, backgroundPosition: kind === 'dot' ? `${(w / 2) % s - s / 2}px ${(hh / 2) % s - s / 2}px` : `${(w / 2) % s}px ${(hh / 2) % s}px` } });
  (parent || stage.world).prepend(el);
  return el;
}

/** absolutely positioned box in a layer: place(parent, {x, y, w, h, anchor}) — x,y is the anchor point */
export function box(parent, { x = 0, y = 0, w, h: hh, anchor = 'c', cls, style = {}, html } = {}) {
  const [fx, fy] = { tl: [0, 0], tc: [0.5, 0], tr: [1, 0], cl: [0, 0.5], c: [0.5, 0.5], cr: [1, 0.5], bl: [0, 1], bc: [0.5, 1], br: [1, 1] }[anchor] || [0.5, 0.5];
  const el = h('div', { class: cls, html, style: { position: 'absolute', left: (x - (w || 0) * fx) + 'px', top: (y - (hh || 0) * fy) + 'px', ...(w != null ? { width: w + 'px' } : {}), ...(hh != null ? { height: hh + 'px' } : {}), ...style } });
  parent.appendChild(el);
  return el;
}

/** a centred node at world/screen point (x, y): children are positioned around its centre; transform via update */
export function node(parent, { x = 0, y = 0, cls, style = {} } = {}) {
  const el = h('div', { class: cls, style: { position: 'absolute', left: x + 'px', top: y + 'px', width: '0px', height: '0px', ...style } });
  parent.appendChild(el);
  return el;
}

export { tf };
