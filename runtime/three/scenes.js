// Ink & Signal — 3D scenes. Each scene: create(ctx) → { render(frame) → canvas, duration }.
// ctx = { w, h, fps, accent, params, assets, root }. Frames are local to the layer (0 = layer in-point).
import {
  THREE, loadTypeface, makeRenderer, materials, lights, floor, textMesh, glyphMesh, gizmo, cameraRig, orbit,
  fitDistance, liveTexture, drawTickerStrip, placeholderPlate, rng, valueAt, easeFn,
} from './kit.js';
import { T, anim, layoutText, M } from '../core.js';

const D = T.duration;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const seg = (f, a, b, ease = 'snap') => easeFn(ease)(clamp01((f - a) / Math.max(1e-6, b - a)));

function base(ctx, world) {
  const renderer = makeRenderer(ctx.w, ctx.h);
  const scene = new THREE.Scene();
  if (world === 'paper') scene.background = new THREE.Color(T.color.paper);
  else if (world === 'night') scene.background = new THREE.Color(T.color.night);
  const mats = materials(ctx.accent);
  const rig = cameraRig(ctx.w, ctx.h);
  return { renderer, scene, mats, rig, aspect: ctx.w / ctx.h };
}

/* ═══════════════ 3D-01 · Gizmo Title ═══════════════
   An extruded title lands inside a red 3D selection gizmo; camera swings from a 3/4 view to front.
   params: text, world ('night'|'paper'), ticker (array|null), hold */
export const gizmoTitle = {
  defaults: { text: 'SETUP', world: 'night', ticker: ['Chapter 02', 'The Setup'], duration: 105 },
  async create(ctx) {
    const p = { ...this.defaults, ...ctx.params };
    await loadTypeface(ctx.root + 'fonts/ArchivoExpanded-Black.typeface.json');
    const { renderer, scene, mats, rig, aspect } = base(ctx, p.world);
    const k = ctx.fps / 30;
    const face = p.world === 'paper' ? mats.ink : mats.signal;
    const title = textMesh(p.text, { size: 1, face, side: mats.ink });
    const sz = title.userData.size;
    const holder = new THREE.Group(); holder.add(title); scene.add(holder);
    const giz = gizmo({ w: sz.x + 0.42, h: sz.y + 0.42, d: sz.z + 0.42, mats, thickness: 0.03 * Math.max(1, sz.x / 5), handle: 0.13 * Math.max(1, sz.x / 5) });
    giz.position.z = -sz.z / 2; scene.add(giz);
    const floorY = -sz.y / 2 - 0.85;
    floor(scene, { world: p.world, y: floorY, gridPx: 64 });
    lights(scene, { world: p.world, accent: ctx.accent, target: new THREE.Vector3(0, 0, 0), radius: 14, shadowSize: Math.max(8, sz.x) });
    let tk = null;
    if (p.ticker) {
      tk = liveTexture(4096, 128);
      // a ticker strip standing behind the title, slightly tilted: the title occludes it
      const band = new THREE.Mesh(new THREE.PlaneGeometry(13.44, 0.42), new THREE.MeshBasicMaterial({ map: tk.tex, toneMapped: false }));
      band.position.set(0, -sz.y / 2 - 0.56, -sz.z - 1.7); band.rotation.z = -0.035; scene.add(band);
    }
    const dist = fitDistance(sz.x * 1.32, sz.y * 4.2, aspect);
    const tgt = [0, -0.05, 0];
    const cam = {
      pos: anim([0, orbit(tgt, dist * 1.18, -34, 22), 'wipe'], [Math.round(34 * k), orbit(tgt, dist, -6, 9), 'drift'], [Math.round(p.duration * k), orbit(tgt, dist * 0.96, 7, 6)]),
      look: tgt,
    };
    const landA = Math.round(4 * k), landB = landA + Math.round(D.titleLand * k * 1.4);
    return {
      duration: Math.round(p.duration * k),
      render(f) {
        giz.userData.update(f, 0, ctx.fps);
        const e = seg(f, landA, landB, 'snap');
        title.visible = f >= landA;
        holder.position.z = (1 - e) * 1.6;
        holder.scale.setScalar(1.12 - 0.12 * e);
        if (tk) { drawTickerStrip(tk.ctx, 4096, 128, { items: p.ticker, offset: (f / ctx.fps) * 240, accent: ctx.accent }); tk.tex.needsUpdate = true; }
        rig.set(f, cam);
        renderer.render(scene, rig.cam);
        return renderer.domElement;
      },
    };
  },
};

/* ═══════════════ 3D-02 · Pop-up Paper ═══════════════
   A title lying flat on graph paper pops up like a pop-up book; the glyph trio stamps in above it. */
export const popupPaper = {
  defaults: { text: 'CHAPTER 02', glyphs: true, duration: 105 },
  async create(ctx) {
    const p = { ...this.defaults, ...ctx.params };
    await loadTypeface(ctx.root + 'fonts/ArchivoExpanded-Black.typeface.json');
    const { renderer, scene, mats, rig, aspect } = base(ctx, 'paper');
    const k = ctx.fps / 30;
    const lines = String(p.text).split('\n');
    const pivot = new THREE.Group(); scene.add(pivot);
    let maxW = 0; const lh = 1.05;
    lines.forEach((ln, i) => {
      const m = textMesh(ln, { size: 1, face: i === lines.length - 1 && lines.length > 1 ? mats.signal : mats.ink, side: mats.ink });
      maxW = Math.max(maxW, m.userData.size.x);
      m.position.y = m.userData.size.y / 2 + (lines.length - 1 - i) * lh;
      m.position.z = m.userData.size.z;
      pivot.add(m);
    });
    const totalH = (lines.length - 1) * lh + 0.69;
    floor(scene, { world: 'paper', y: 0, gridPx: 64, size: 160 });
    const lk = lights(scene, { world: 'paper', target: new THREE.Vector3(0, 0.5, 0), radius: 14, shadowSize: Math.max(8, maxW) });
    // pop-up cards: light from behind-left so the shadow falls forward and grounds the letters
    lk.key.position.set(-5, 9, -7);
    const glyphs = [];
    if (p.glyphs) {
      ['star', 'sparkle', 'plus'].forEach((g, i) => {
        const m = glyphMesh(g, { size: 0.62, depth: 0.22, face: i === 0 ? mats.signal : mats.ink, side: mats.ink });
        m.position.set((i - 1) * 0.95, totalH + 0.95, 0.2);
        scene.add(m); glyphs.push(m);
      });
    }
    const dist = fitDistance(maxW * 1.42, (totalH + 1.8) * 1.9, aspect);
    const tgt = [0, totalH * 0.55, 0];
    const cam = {
      pos: anim([0, orbit(tgt, dist * 1.1, -10, 62), 'wipe'], [Math.round(30 * k), orbit(tgt, dist, -4, 21), 'drift'], [Math.round(p.duration * k), orbit(tgt, dist * 0.97, 6, 19)]),
      look: anim([0, [0, 0, 0], 'wipe'], [Math.round(30 * k), tgt]),
    };
    const upA = Math.round(6 * k), upB = upA + Math.round(16 * k);
    return {
      duration: Math.round(p.duration * k),
      render(f) {
        pivot.rotation.x = -Math.PI / 2 * (1 - seg(f, upA, upB, 'stamp'));
        glyphs.forEach((g, i) => {
          const a = upB - Math.round(4 * k) + Math.round(D.stampStagger * k) * i;
          const e = seg(f, a, a + Math.round(D.stampSpin * k * 1.4), 'stamp');
          g.scale.setScalar(Math.max(0.0001, e)); g.visible = e > 0.001;
          g.rotation.y = (1 - e) * -Math.PI / 2; g.rotation.z = (1 - e) * 0.6;
        });
        rig.set(f, cam);
        renderer.render(scene, rig.cam);
        return renderer.domElement;
      },
    };
  },
};

/* ═══════════════ 3D-03 · Ticker Ring ═══════════════
   An extruded word with a ticker band orbiting it like a planetary ring. Night world. */
export const tickerRing = {
  defaults: { text: 'SIGNAL', items: ['Ink', 'Signal', 'Process', 'Daily'], duration: 150 },
  async create(ctx) {
    const p = { ...this.defaults, ...ctx.params };
    await loadTypeface(ctx.root + 'fonts/ArchivoExpanded-Black.typeface.json');
    const { renderer, scene, mats, rig, aspect } = base(ctx, 'night');
    const k = ctx.fps / 30;
    const title = textMesh(p.text, { size: 1, face: mats.signal, side: mats.ink });
    const sz = title.userData.size; title.position.z = sz.z / 2;
    const holder = new THREE.Group(); holder.add(title); scene.add(holder);
    const R = sz.x * 0.68, bandH = 0.42;
    const tk = liveTexture(4096, 128);
    drawTickerStrip(tk.ctx, 4096, 128, { items: [...p.items, ...p.items], accent: ctx.accent });
    tk.tex.wrapS = THREE.RepeatWrapping; tk.tex.needsUpdate = true;
    const ringGeo = new THREE.CylinderGeometry(R, R, bandH, 160, 1, true);
    const ringMat = new THREE.MeshBasicMaterial({ map: tk.tex, side: THREE.DoubleSide, toneMapped: false });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    const ringHolder = new THREE.Group(); ringHolder.add(ring); ringHolder.rotation.set(0.32, 0, 0.21); scene.add(ringHolder);
    // the inside of the band is darker so front/back read clearly
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.995, R * 0.995, bandH, 160, 1, true), new THREE.MeshBasicMaterial({ color: '#050505', side: THREE.BackSide }));
    ring.add(inner);
    floor(scene, { world: 'night', y: -sz.y / 2 - 1.3, gridPx: 64 });
    lights(scene, { world: 'night', accent: ctx.accent, radius: 14, shadowSize: R * 2 });
    const dist = fitDistance(R * 2.5, R * 1.6, aspect);
    const tgt = [0, 0, 0];
    const dur = Math.round(p.duration * k);
    const cam = { pos: anim([0, orbit(tgt, dist * 1.15, -24, 16), 'wipe'], [Math.round(30 * k), orbit(tgt, dist, -10, 11), 'drift'], [dur, orbit(tgt, dist * 0.95, 14, 8)]), look: tgt };
    const circ = 2 * Math.PI * R;
    return {
      duration: dur,
      render(f) {
        const e = seg(f, 0, Math.round(16 * k), 'snap');
        ringHolder.scale.set(Math.max(0.0001, e), 1, Math.max(0.0001, e));
        ring.rotation.y = -((f / ctx.fps) * T.speed.tickerPxPerSecFast / 100) / R; // linear, never eases
        const l = seg(f, Math.round(6 * k), Math.round(22 * k), 'snap');
        title.visible = f >= Math.round(6 * k);
        holder.position.y = (1 - l) * 1.2; holder.scale.setScalar(1.12 - 0.12 * l);
        void circ;
        rig.set(f, cam);
        renderer.render(scene, rig.cam);
        return renderer.domElement;
      },
    };
  },
};

/* ═══════════════ 3D-04 · Polaroid Fly-through ═══════════════
   Polaroids hang in the dark; the camera moves-and-holds from one to the next (wipe ease), landing on the hero. */
export const polaroidFlythrough = {
  defaults: { count: 6, captions: ['day 01', 'the first try', 'week 3', 'it clicked', 'day 60', 'okay, it worked'], srcs: [], hold: 22, move: 16, seed: 9, duration: null },
  async create(ctx) {
    const p = { ...this.defaults, ...ctx.params };
    const { renderer, scene, mats, rig, aspect } = base(ctx, 'night');
    const k = ctx.fps / 30, r = rng(p.seed);
    floor(scene, { world: 'night', y: -2.4, size: 140, gridPx: 64 });
    lights(scene, { world: 'night', accent: ctx.accent, target: new THREE.Vector3(0, 0, -p.count * 2.5), radius: 30, shadowSize: 30 });
    const cards = [];
    const capCanvas = (txt) => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
      x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, 512, 128); x.fillStyle = T.color.ink; x.font = '64px "IS noteSoft"'; x.textBaseline = 'middle'; x.fillText(txt, 18, 64);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    };
    for (let i = 0; i < p.count; i++) {
      const g = new THREE.Group();
      const card = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.24, 0.02), mats.polaroid); card.castShadow = true; g.add(card);
      let tex;
      const a = p.srcs[i] && ctx.assets[p.srcs[i]];
      if (a) tex = new THREE.Texture(a); else tex = new THREE.CanvasTexture(placeholderPlate(512, 512, 30 + i * 7, i % 3 === 2 ? 'portrait' : 'room'));
      tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
      const img = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.88), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
      img.position.set(0, 0.1, 0.0111); g.add(img);
      const cap = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.22), new THREE.MeshStandardMaterial({ map: capCanvas(p.captions[i % p.captions.length] || ''), roughness: 0.8 }));
      cap.position.set(0, -0.47, 0.0111); g.add(cap);
      const last = i === p.count - 1;
      g.position.set(last ? 0 : (i % 2 ? 1 : -1) * (0.9 + r() * 0.9), (r() - 0.5) * 0.8, -i * 5);
      g.rotation.set((r() - 0.5) * 0.12, last ? 0 : (i % 2 ? -1 : 1) * (0.25 + r() * 0.2), last ? -0.05 : (r() - 0.5) * 0.3);
      scene.add(g); cards.push(g);
    }
    const H = Math.round(p.hold * k), Mv = Math.round(p.move * k);
    const dist = fitDistance(1.25, 1.6, aspect);
    const pos = [], look = [];
    cards.forEach((g, i) => {
      const n = new THREE.Vector3(0, 0, 1).applyEuler(g.rotation).multiplyScalar(dist);
      const cp = g.position.clone().add(n);
      const f0 = i * (H + Mv);
      const lk = [g.position.x, g.position.y, g.position.z];
      pos.push([f0, [cp.x, cp.y, cp.z], 'drift'], [f0 + H, [cp.x + n.x * -0.04, cp.y, cp.z - 0.12], 'wipe']);
      look.push([f0, lk, 'drift'], [f0 + H, lk, 'wipe']);
    });
    const dur = p.duration ? Math.round(p.duration * k) : cards.length * (H + Mv) - Mv + Math.round(20 * k);
    // final hold drifts slowly toward the hero
    const lastP = pos[pos.length - 1][1]; pos[pos.length - 1] = [pos[pos.length - 1][0], lastP, 'drift']; pos.push([dur, [lastP[0], lastP[1], lastP[2] - 0.35]]);
    const cam = { pos: { k: pos }, look: { k: look } };
    return {
      duration: dur,
      render(f) {
        cards.forEach((g, i) => { g.position.y += 0; g.userData.sway = Math.sin((f / ctx.fps) * 0.9 + i) * 0.02; g.rotation.z += 0; });
        rig.set(f, cam);
        renderer.render(scene, rig.cam);
        return renderer.domElement;
      },
    };
  },
};

/* ═══════════════ 3D-05 · Paper Roll (transition, alpha) ═══════════════
   A graph-paper page unrolls up over the frame (covering it at `cover`), holds, then rolls away upward.
   Doubles as a 3D chapter card: the page can carry a title. Transparent outside the page. */
export const paperRoll = {
  defaults: { title: 'CHAPTER 02', sub: 'The setup', cover: 16, hold: 30, out: 16, duration: null },
  async create(ctx) {
    const p = { ...this.defaults, ...ctx.params };
    const k = ctx.fps / 30;
    const renderer = makeRenderer(ctx.w, ctx.h);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(T.three.camera.fov, ctx.w / ctx.h, 0.1, 100);
    const vh = 2 * 10 * Math.tan(((T.three.camera.fov / 2) * Math.PI) / 180), vw = vh * (ctx.w / ctx.h);
    cam.position.set(0, 0, 10); cam.lookAt(0, 0, 0);
    // page texture: paper, grid, crumple, title
    const tw = Math.min(2048, ctx.w), th = Math.round(tw * ctx.h / ctx.w);
    const tc = document.createElement('canvas'); tc.width = tw; tc.height = th; const x = tc.getContext('2d');
    const { gridPlate, crumplePlate } = await import('../render2d.js');
    x.fillStyle = T.color.paper; x.fillRect(0, 0, tw, th);
    x.drawImage(gridPlate(tw, th, Math.round(tw / 24), T.grid.paper.line), 0, 0);
    x.globalCompositeOperation = 'multiply'; x.globalAlpha = T.footage.crumple.opacity; x.drawImage(crumplePlate(tw, th, 21), 0, 0);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    if (p.title) {
      let s = Math.round(tw * (ctx.w > ctx.h ? 0.09 : 0.15));
      let title = String(p.title);
      const fits = () => layoutText({ text: title, font: 'display', size: s }).width <= tw * 0.84;
      while (!fits() && s > 20) s -= 2;
      if (s < tw * 0.1 && title.includes(' ') && !title.includes('\n')) {
        const sp = title.lastIndexOf(' ', Math.ceil(title.length / 2) + 2); title = title.slice(0, sp) + '\n' + title.slice(sp + 1);
        s = Math.round(tw * (ctx.w > ctx.h ? 0.09 : 0.15)); while (!fits() && s > 20) s -= 2;
      }
      const L = layoutText({ text: title, font: 'display', size: s, align: 'center' });
      x.font = `${s}px "IS display"`; x.fontKerning = 'none'; x.fillStyle = T.color.ink;
      const y0 = th / 2 - L.height / 2;
      L.lines.forEach((ln, li) => { x.fillStyle = li === L.lines.length - 1 && L.lines.length > 1 ? ctx.accent : T.color.ink; ln.chars.forEach((c) => c.ch !== ' ' && x.fillText(c.ch, (tw - L.width) / 2 + ln.x + c.x, y0 + ln.baseline)); });
      if (p.sub) {
        const s2 = Math.round(s * 0.36); const L2 = layoutText({ text: p.sub, font: 'note', size: s2 * 1.4 });
        x.font = `${Math.round(s2 * 1.4)}px "IS note"`; x.fillStyle = T.color.pen;
        L2.lines[0].chars.forEach((c) => c.ch !== ' ' && x.fillText(c.ch, (tw - L2.width) / 2 + c.x, y0 + L.height + s2 * 1.6));
      }
    }
    const tex = new THREE.CanvasTexture(tc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const segX = 40, segY = 120;
    const geo = new THREE.PlaneGeometry(vw * 1.02, vh * 1.02, segX, segY);
    const flat = geo.attributes.position.array.slice();
    const front = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, side: THREE.FrontSide }));
    const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: T.color.paperNote, roughness: 0.95, side: THREE.BackSide }));
    scene.add(front, back);
    const key = new THREE.DirectionalLight('#FFF4EA', 2.4); key.position.set(-4, 6, 8); scene.add(key);
    scene.add(new THREE.AmbientLight('#FFFFFF', 0.9));
    const Hp = vh * 1.02, rad = vh * 0.035;
    const A0 = 0, A1 = Math.round(p.cover * k), B0 = A1 + Math.round(p.hold * k), B1 = B0 + Math.round(p.out * k);
    const pos = geo.attributes.position;
    const deform = (sIn, sOut, lift) => {
      for (let i = 0; i < pos.count; i++) {
        const fx = flat[i * 3], fy = flat[i * 3 + 1];
        const u = fy + Hp / 2; // 0 at bottom
        let y = fy, z = 0;
        if (u > sIn) { const ph = (u - sIn) / rad; y = sIn - Hp / 2 + rad * Math.sin(ph); z = rad - rad * Math.cos(ph); }
        else if (u < sOut) { const ph = (sOut - u) / rad; y = sOut - Hp / 2 - rad * Math.sin(ph); z = rad - rad * Math.cos(ph); }
        pos.setXYZ(i, fx, y + lift, z);
      }
      pos.needsUpdate = true; geo.computeVertexNormals();
    };
    return {
      duration: B1 + 1,
      render(f) {
        let sIn = Hp, sOut = 0, lift = 0;
        if (f < A1) { const e = seg(f, A0, A1, 'wipe'); sIn = Hp * e; lift = -(1 - e) * rad * 3; }
        else if (f >= B0) { const e = seg(f, B0, B1, 'wipe'); sOut = Hp * e; lift = e * rad * 3; }
        deform(sIn, sOut, lift);
        front.visible = back.visible = !(f >= B1);
        renderer.render(scene, cam);
        return renderer.domElement;
      },
    };
  },
};

export const SCENES = { gizmoTitle, popupPaper, tickerRing, polaroidFlythrough, paperRoll };
