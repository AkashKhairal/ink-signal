// sr-zoom — screen-recording polish for SaaS explainers: the recording sits in a browser frame on the paper
// canvas; the camera glides into regions (zooms), clicks get signal ripples, a spotlight dims everything
// else, a selection gizmo marks the UI element, and handwritten notes point at things.
import { defineScene } from '../scene.js';
import { h, css } from '../dom.js';
import { T, kf, seg, clamp, lerp, ease, eo } from '../engine.js';
import { browser } from '../ui.js';
import { spotlight, gizmo, note } from '../fx.js';

export const srZoom = defineScene({
  name: 'sr-zoom', kind: 'screen', title: 'Screen recording: zooms, clicks, spotlight, notes',
  description: 'Your screen recording (video or image) in a browser frame on paper; the camera eases into each zoom region and back, clicks ripple, a spotlight + selection box marks the element, handwritten notes point at it. Coordinates are in recording pixels.',
  formats: ['yt', 'reel', 'square'], theme: 'paper', grid: 'line',
  defaults: {
    format: 'yt', src: null, srcW: 1920, srcH: 1080, start: 0, dur: 8, url: 'app.example.com', frame: true,
    zooms: [{ t0: 1.0, t1: 4.2, x: 120, y: 160, w: 900, h: 520 }, { t0: 5.0, t1: 7.2, x: 1100, y: 560, w: 700, h: 400 }],
    clicks: [{ t: 2.4, x: 520, y: 420 }, { t: 6.0, x: 1450, y: 760 }],
    spotlight: [{ t0: 2.2, t1: 4.0, x: 380, y: 360, w: 300, h: 120, label: 'BUTTON 01' }],
    notes: [{ t: 2.7, text: 'one click', x: 760, y: 560, toX: 600, toY: 450 }],
  },
  media: (p) => (p.src ? [{ key: 'src', src: p.src, start: p.start || 0, frames: Math.ceil((p.dur + 0.5) * 30), w: p.srcW, h: p.srcH }] : []),
  duration: (p) => p.dur,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const W = S.W, H = S.H;
    // fit the recording (plus browser chrome) into ~84% of the frame at zoom 1
    const chrome = p.frame ? 64 : 0;
    const k = Math.min((W * 0.84) / p.srcW, (H * 0.8 - chrome * u) / p.srcH);
    const bw = p.srcW * k, bh = p.srcH * k + chrome * u;
    let host, content;
    if (p.frame) { const b = browser(S, S.world, { x: 0, y: 0, anchor: 'c', w: bw / u, h: bh / u, url: p.url, r: 'panel' }); host = b.el; content = b.content; }
    else { host = h('div', { style: { position: 'absolute', left: -bw / 2 + 'px', top: -bh / 2 + 'px', width: bw + 'px', height: bh + 'px', borderRadius: 16 * u + 'px', overflow: 'hidden', boxShadow: 'var(--ui-shadow)' } }); S.world.appendChild(host); content = host; }
    const ox = -bw / 2, oy = -bh / 2 + chrome * u;                 // world position of recording pixel (0,0)
    const W2 = (x) => ox + x * k, H2 = (y) => oy + y * k;
    // the recording: image sequence prepared by the renderer, a still image, or a placeholder UI
    const img = h('img', { style: { position: 'absolute', left: '0px', top: '0px', width: bw + 'px', height: (bh - chrome * u) + 'px', objectFit: 'cover', display: 'block' } });
    content.appendChild(img);
    const seq = ctx.seq.src;
    if (!seq) {
      const ph = h('div', { style: { position: 'absolute', inset: '0', background: 'repeating-linear-gradient(0deg, transparent 0 46px, rgba(14,14,14,.05) 46px 48px)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `400 ${28 * u}px "IS dataSoft"`, color: 'var(--ui-textMuted)' }, text: 'your screen recording' });
      content.appendChild(ph); css(img, { display: 'none' });
    } else if (seq.image) { img.src = seq.image; ctx.ready.push(img.decode().catch(() => {})); }
    else {
      const cache = new Map();
      ctx.after.push(async (f) => {
        const i = Math.max(1, Math.min(seq.count, Math.floor(f) + 1)); const url = `${seq.dir}/${String(i).padStart(5, '0')}.jpg`;
        if (img.__u !== url) { img.__u = url; img.src = url; if (!cache.has(url)) { cache.set(url, 1); } await img.decode().catch(() => {}); }
      });
    }
    // camera: full view → each zoom region (fills 80% of the frame) → back
    const keys = [[0, { x: 0, y: 0, z: 1 }]];
    for (const z of p.zooms) {
      const cx = W2(z.x + z.w / 2), cy = H2(z.y + z.h / 2), zz = Math.min((W * 0.8) / (z.w * k), (H * 0.8) / (z.h * k));
      keys.push([z.t0, keys[keys.length - 1][1]], [z.t0 + 0.9, { x: cx, y: cy, z: zz }], [z.t1, { x: cx, y: cy, z: zz * 1.03 }], [z.t1 + 0.9, { x: 0, y: 0, z: 1 }]);
      ctx.cue(z.t0, 'movement', 'zoom in'); ctx.cue(z.t1, 'movement', 'zoom out');
    }
    const kk = keys.sort((a, b) => a[0] - b[0]);
    const KX = kf(kk.map(([t, v]) => [t, v.x, 'wipe'])), KY = kf(kk.map(([t, v]) => [t, v.y, 'wipe']));
    const KZ = kf(kk.map(([t, v]) => [t, Math.log(v.z), 'wipe']));
    ctx.add((t) => S.cam.set({ x: KX(t), y: KY(t), zoom: Math.exp(KZ(t)) }));
    // clicks: ring ripple in world space (scales with the camera, like the UI)
    const rings = p.clicks.map((c) => { const r = h('div', { style: { position: 'absolute', borderRadius: '50%', border: `${3 * u}px solid var(--accent)`, display: 'none', zIndex: 8 } }); S.world.appendChild(r); ctx.cue(c.t, 'click', 'click'); return { r, c }; });
    ctx.add((t) => rings.forEach(({ r, c }) => { const q = seg(t, c.t, c.t + 0.6); if (q <= 0 || q >= 1) { css(r, { display: 'none' }); return; } const R = (10 + 40 * eo(q)) * u * Math.max(0.6, k * 1.4); css(r, { display: '', left: W2(c.x) - R + 'px', top: H2(c.y) - R + 'px', width: 2 * R + 'px', height: 2 * R + 'px', opacity: 1 - q }); }));
    // spotlight + gizmo per region
    for (const sp of p.spotlight || []) {
      const box = [W2(sp.x), H2(sp.y), sp.w * k, sp.h * k];
      const sl = ctx.add(spotlight(S, S.world, { rects: [[sp.t0, ...box]], on: sp.t0, off: sp.t1, dim: 0.55, radius: 10 }));
      css(sl.el, { zIndex: 6 });
      const gz = ctx.add(gizmo(S, S.world, { x: box[0] - 6 * u, y: box[1] - 6 * u, w: box[2] + 12 * u, h: box[3] + 12 * u, at: sp.t0 + 0.15, out: sp.t1, label: sp.label || null, sw: 2.2, hs: 11 }));
      css(gz.el, { zIndex: 7 });
      ctx.cue(sp.t0, 'appear', 'spotlight');
    }
    for (const n of p.notes || []) {
      const nt = ctx.add(note(S, S.world, { x: W2(n.x), y: H2(n.y), text: n.text, size: (n.size || 52) * Math.max(0.55, k * 1.2), at: n.t, arrow: n.toX != null ? { from: [W2(n.x) - 10 * u, H2(n.y) + 10 * u], to: [W2(n.toX), H2(n.toY)], bend: -0.3 } : null }));
      css(nt.el, { zIndex: 9 }); ctx.cue(n.t, 'appear', 'note');
    }
  },
});
