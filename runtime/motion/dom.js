// Ink & Signal — Signal Motion engine: tiny DOM helpers. Styles are written only when they change,
// so a seek() that touches hundreds of elements stays cheap.
import { ICONS } from './icons.js';
import { T } from '../core.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g', 'defs', 'clipPath', 'mask', 'text', 'tspan', 'linearGradient', 'stop', 'use']);

/** h('div', { class, style: {...}, text, html, ...attrs }, ...children) */
export function h(tag, props = {}, ...children) {
  const isSvg = SVG_TAGS.has(tag);
  const el = isSvg ? document.createElementNS(SVGNS, tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'style') css(el, v);
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'class') el.setAttribute('class', v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  return el;
}

const PX = new Set(['left', 'top', 'right', 'bottom', 'width', 'height', 'borderRadius', 'fontSize', 'lineHeight', 'padding', 'margin', 'gap', 'borderWidth', 'minWidth', 'maxWidth', 'minHeight', 'letterSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'marginTop', 'marginLeft', 'outlineWidth', 'strokeWidth']);
/** set style properties; numbers get px where it makes sense; writes only on change */
export function css(el, obj) {
  const cache = el.__s || (el.__s = {});
  for (const [k, v0] of Object.entries(obj)) {
    let v = v0;
    if (typeof v === 'number' && PX.has(k)) v = (Math.round(v * 1000) / 1000) + 'px';
    else if (typeof v === 'number') v = String(Math.round(v * 10000) / 10000);
    if (cache[k] === v) continue;
    cache[k] = v;
    if (k.startsWith('--')) el.style.setProperty(k, v); else el.style[k] = v;
  }
  return el;
}
export function setText(el, s) { s = String(s); if (el.__t !== s) { el.textContent = s; el.__t = s; } return el; }
export function setHTML(el, s) { if (el.__h !== s) { el.innerHTML = s; el.__h = s; } return el; }
export function show(el, on) { css(el, { display: on ? '' : 'none' }); return on; }
const f3 = (n) => +n.toFixed(3);
/** transform string from parts: {x, y, s, sx, sy, r, rx, ry, z, ox, oy} */
export function tf({ x = 0, y = 0, z = 0, s = 1, sx, sy, r = 0, rx = 0, ry = 0, skx = 0 } = {}) {
  let out = `translate3d(${f3(x)}px,${f3(y)}px,${f3(z)}px)`;
  if (rx) out += ` rotateX(${f3(rx)}deg)`;
  if (ry) out += ` rotateY(${f3(ry)}deg)`;
  if (r) out += ` rotate(${f3(r)}deg)`;
  if (skx) out += ` skewX(${f3(skx)}deg)`;
  const X = sx ?? s, Y = sy ?? s;
  if (X !== 1 || Y !== 1) out += ` scale(${f3(X)},${f3(Y)})`;
  return out;
}
/** apply a vis() result: opacity, blur, scale (plus an extra transform). false when hidden */
export function applyVis(el, v, extra = '') {
  if (v.o < 0.002) { css(el, { display: 'none' }); return false; }
  css(el, { display: '', opacity: v.o, filter: v.blur > 0.05 ? `blur(${v.blur.toFixed(2)}px)` : 'none', transform: `${extra} scale(${v.s.toFixed(4)})` });
  return true;
}

/** line icon from the token set, stroke normalised so every icon has the same visual weight */
export function icon(name, size = 24, color = 'currentColor', sw) {
  const body = ICONS[name];
  if (!body) throw new Error(`Unknown icon "${name}"`);
  const w = sw ?? strokeFor(size);
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${((w * 24) / size).toFixed(3)}" stroke-linecap="round" stroke-linejoin="round" style="display:block">${body}</svg>`;
}
export const iconEl = (name, size, color, sw) => { const d = h('span', { style: { display: 'inline-block', width: size + 'px', height: size + 'px', lineHeight: 0 } }); d.innerHTML = icon(name, size, color, sw); return d; };
function strokeFor(size) {
  const m = T.icon.strokeAtPx; const ks = Object.keys(m).map(Number).sort((a, b) => a - b);
  if (size <= ks[0]) return m[ks[0]];
  for (let i = 1; i < ks.length; i++) if (size <= ks[i]) { const u = (size - ks[i - 1]) / (ks[i] - ks[i - 1]); return m[ks[i - 1]] + (m[ks[i]] - m[ks[i - 1]]) * u; }
  return m[ks[ks.length - 1]] * (size / ks[ks.length - 1]) ** 0.5;
}

/** brand glyph (star / sparkle / plus) as filled SVG */
export function glyph(name = 'star', size = 40, color = 'currentColor') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" style="display:block"><path d="${T.glyph[name]}" fill="${color}"/></svg>`;
}

/** measure text width with canvas (fonts must be loaded) */
const mctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
export function textWidth(s, font) { mctx.font = font; return mctx.measureText(s).width; }
