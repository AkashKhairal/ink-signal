// Ink & Signal — IS Spec builder (pure JS).
// A composition is plain data: layers with keyframed transforms. The same data is
// rendered by the web runtime and rebuilt natively by the After Effects / Resolve adapters.
import { T, color, layoutText, isAnim, shiftAnim } from './core.js';

export const SPEC_VERSION = 'ink-signal/1';

const ANCHORS = {
  tl: [0, 0], tc: [0.5, 0], tr: [1, 0],
  cl: [0, 0.5], c: [0.5, 0.5], cr: [1, 0.5],
  bl: [0, 1], bc: [0.5, 1], br: [1, 1],
};
export const anchorFrac = (a) => (Array.isArray(a) ? a : ANCHORS[a || 'c']);

export class Comp {
  constructor({ name, format = 'reel', width, height, fps, duration, background = null, accent, params = {} }) {
    const fmt = T.format[format] || T.format.reel;
    this.name = name;
    this.format = format;
    this.fmt = fmt;
    this.W = width || fmt.width;
    this.H = height || fmt.height;
    this.fps = fps || fmt.fps;
    this.duration = duration;
    this.accent = (accent || T.color.signal).toUpperCase();
    this.background = background ? this.c(background) : null;
    this.params = params;
    this.ts = T.typeScale[format === 'yt' ? 'yt' : 'reel'];
    this.safe = fmt.safe;
    this.edge = fmt.edge;
    this.layers = [];
    this._stack = [this.layers];
    this._n = 0;
    this.assets = [];
    this.markers = [];
  }
  /** resolve a colour token / "accent" / css colour */
  c(v) { return color(v, this.accent); }

  /** add a layer of a given type. Frames are absolute comp frames. */
  add(type, props = {}) {
    const id = props.id || `${type}_${++this._n}`;
    const L = {
      id, type,
      in: props.in ?? 0,
      out: props.out ?? this.duration,
      ...props,
      t: { anchor: [0, 0], position: [0, 0], scale: [100, 100], rotation: 0, opacity: 100, ...(props.t || {}) },
    };
    L.id = id;
    for (const key of ['color', 'fill', 'stroke']) if (typeof L[key] === 'string') L[key] = this.c(L[key]);
    this._stack[this._stack.length - 1].push(L);
    return L;
  }

  /** group = nested layer list (AE: precomp). fn receives the group layer. */
  group(props, fn) {
    const g = this.add('group', { ...props, layers: [] });
    this._stack.push(g.layers);
    try { fn && fn(g); } finally { this._stack.pop(); }
    return g;
  }

  /** text layer positioned by an anchor on its own box */
  text({ text, font = 'display', size, color: col = 'ink', x = 0, y = 0, anchor = 'c', align, tracking, lineHeight, ...rest }) {
    const al = align || (anchor && String(anchor).endsWith('r') ? 'right' : String(anchor).endsWith('l') ? 'left' : 'center');
    const L = layoutText({ text, font, size, tracking, lineHeight, align: al });
    const [fx, fy] = anchorFrac(anchor);
    const layer = this.add('text', {
      text: L.lines.map((l) => l.text).join('\n'),
      font, size, color: col, align: al,
      tracking: L.tracking, lineHeight: L.lineHeight / size,
      box: [round(L.width), round(L.height)],
      baseline: round(L.lines[0] ? L.lines[0].baseline : 0),
      ...rest,
      t: { anchor: [round(L.width * fx), round(L.height * fy)], position: [x, y], ...(rest.t || {}) },
    });
    layer._layout = L;
    return layer;
  }

  marker(frame, label) { this.markers.push({ frame, label }); }

  /** nest another composition (its JSON) as a group starting at frame `at` */
  include(child, { at = 0, id, out } = {}) {
    const gid = id || `${child.name}_${at}`;
    const end = out ?? at + child.duration;
    const g = this.add('group', { id: gid, size: [this.W, this.H], in: at, out: end, layers: shiftLayers(child.layers, at, gid + '/'), comp: child.name });
    if (child.background) g.layers.unshift({ id: gid + '/bg', type: 'solid', color: child.background, size: [this.W, this.H], in: at, out: end, t: { anchor: [0, 0], position: [0, 0], scale: [100, 100], rotation: 0, opacity: 100 } });
    for (const m of child.markers || []) this.markers.push({ frame: m.frame + at, label: m.label });
    return g;
  }

  toJSON() {
    const strip = (layers) => layers.map((l) => {
      const { _layout, ...rest } = l;
      if (rest.layers) rest.layers = strip(rest.layers);
      return rest;
    });
    return {
      spec: SPEC_VERSION,
      name: this.name,
      format: this.format,
      width: this.W, height: this.H, fps: this.fps, duration: this.duration,
      background: this.background,
      accent: this.accent,
      params: this.params,
      markers: this.markers,
      ...(this.timeline ? { timeline: this.timeline } : {}),
      layers: strip(this.layers),
    };
  }
}

export const round = (n) => Math.round(n * 100) / 100;

/** shift every time value in a layer tree by df frames (and optionally prefix ids) */
export function shiftLayers(layers, df, prefix = '') {
  return layers.map((L) => {
    const n = { ...L, id: prefix + L.id, in: L.in + df, out: L.out + df };
    n.t = Object.fromEntries(Object.entries(L.t || {}).map(([k, v]) => [k, shiftAnim(v, df)]));
    if (L.reveal) n.reveal = { ...L.reveal, p: shiftAnim(L.reveal.p, df) };
    if (L.trim) n.trim = shiftAnim(L.trim, df);
    if (L.chars) n.chars = { ...L.chars, at: L.chars.at + df };
    if (L.layers) n.layers = shiftLayers(L.layers, df, prefix);
    return n;
  });
}

/** collect every layer (depth first) */
export function walk(layers, fn, parent = null) {
  for (const l of layers) { fn(l, parent); if (l.layers) walk(l.layers, fn, l); }
}
export { isAnim };
