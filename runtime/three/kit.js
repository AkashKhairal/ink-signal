// Ink & Signal — 3D kit for three.js. Materials, lights, worlds, extruded type, glyphs, the gizmo.
// Everything is driven by seek(frame): no clocks, no Math.random.
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { T, valueAt, easeFn, rng, layoutText, M } from '../core.js';
import { gridPlate, crumplePlate, placeholderPlate } from '../render2d.js';

export { THREE };
const X = T.three;

let FONT = null;
export async function loadTypeface(url) {
  if (FONT) return FONT;
  const json = await (await fetch(url)).json();
  FONT = new FontLoader().parse(json);
  return FONT;
}

export function makeRenderer(w, h) {
  const canvas = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  r.setPixelRatio(1);
  r.setSize(w, h, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = X.light.exposure;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.setClearColor(0x000000, 0);
  return r;
}

export function materials(accent) {
  const m = X.material;
  const std = (o) => new THREE.MeshStandardMaterial({ color: o.color, roughness: o.roughness, metalness: o.metalness ?? 0 });
  const signal = std({ ...m.signal, color: accent || m.signal.color });
  signal.emissive = new THREE.Color(accent || m.signal.emissive); signal.emissiveIntensity = m.signal.emissiveIntensity;
  return {
    ink: std(m.ink), signal, paper: std(m.paper), polaroid: std(m.polaroid),
    white: new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.5 }),
    gizmo: new THREE.MeshBasicMaterial({ color: accent || m.gizmo.color, toneMapped: false }),
    handleFill: new THREE.MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false }),
  };
}

/** key light from the top-left (azimuth 130°, elevation 58°) relative to the camera's initial view */
export function lights(scene, { world = 'night', accent, target = new THREE.Vector3(), radius = 12, shadowSize = 14 } = {}) {
  const L = X.light;
  const az = (L.key.azimuth * Math.PI) / 180, el = (L.key.elevation * Math.PI) / 180;
  const dir = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el) * 0.9 + 0.1, Math.sin(az) * Math.cos(el) * 0.6 + 0.6).normalize();
  const key = new THREE.DirectionalLight(L.key.color, L.key.intensity);
  key.position.copy(target).addScaledVector(dir, radius);
  key.target.position.copy(target);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const s = shadowSize; Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: radius * 3 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 6;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(L.fill.color, L.fill.intensity);
  fill.position.set(target.x + radius * 0.8, target.y + radius * 0.2, target.z + radius * 0.6);
  scene.add(fill);
  scene.add(new THREE.AmbientLight('#FFFFFF', world === 'paper' ? L.ambient * 2.6 : L.ambient));
  if (world === 'paper') { key.intensity = L.key.intensity * 0.8; fill.intensity = L.fill.intensity * 2.4; }
  if (world === 'night' && L.rim.useOnNight) {
    const rim = new THREE.DirectionalLight(accent || L.rim.color, L.rim.intensity);
    rim.position.set(target.x + radius * 0.7, target.y + radius * 0.18, target.z - radius);
    scene.add(rim);
  }
  return { key, fill };
}

/** floor plane textured as paper (grid + crumple) or night (dark grid) */
export function floor(scene, { world = 'night', size = 60, y = 0, gridPx = 54 } = {}) {
  const px = 2048;
  const c = document.createElement('canvas'); c.width = c.height = px;
  const x = c.getContext('2d');
  if (world === 'paper') {
    x.fillStyle = T.color.paper; x.fillRect(0, 0, px, px);
    x.drawImage(gridPlate(px, px, gridPx, T.grid.paper.line), 0, 0);
    x.globalCompositeOperation = 'multiply'; x.globalAlpha = T.footage.crumple.opacity;
    x.drawImage(crumplePlate(px, px, 11), 0, 0);
  } else {
    x.fillStyle = T.color.night; x.fillRect(0, 0, px, px);
    x.drawImage(gridPlate(px, px, gridPx, 'rgba(255,255,255,0.07)'), 0, 0);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(size / 12, size / 12);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: world === 'paper' ? 0.95 : 0.9, metalness: 0 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; mesh.receiveShadow = true;
  scene.add(mesh);
  if (world === 'night') { scene.fog = new THREE.Fog(T.color.night, size * 0.25, size * 0.7); }
  else { scene.fog = new THREE.Fog(T.color.paper, size * 0.35, size * 0.5); }
  return mesh;
}

/** extruded display type. face = signal/ink, sides = ink. Centered on its bounding box. */
export function textMesh(text, { size = 1, depth = X.extrude.depth, face, side } = {}) {
  const geo = new TextGeometry(String(text).toUpperCase(), {
    font: FONT, size, depth: depth * size, curveSegments: X.extrude.curveSegments,
    bevelEnabled: true, bevelThickness: X.extrude.bevelThickness * size, bevelSize: X.extrude.bevelSize * size, bevelSegments: X.extrude.bevelSegments,
  });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  // centre on caps (x centred, caps centred vertically, front face at z=0)
  const capH = (M.display.capHeight / M.display.upm) * size;
  geo.translate(-(bb.min.x + bb.max.x) / 2, -capH / 2, -depth * size);
  geo.computeBoundingBox();
  const mesh = new THREE.Mesh(geo, [face, side]);
  mesh.castShadow = true; mesh.receiveShadow = true;
  const b = geo.boundingBox;
  mesh.userData.size = new THREE.Vector3(b.max.x - b.min.x, capH, b.max.z - b.min.z);
  return mesh;
}

/** SVG path (M/L/C/H/V/Z, absolute) → THREE.Shape, y flipped, scaled from the 40-unit glyph box */
export function svgShape(d, scale = 1 / 40) {
  const shape = new THREE.Shape(); let cx = 0, cy = 0; let cmd = '';
  const toks = d.match(/[MLCHVZ]|-?\d*\.?\d+/gi); let i = 0;
  const n = () => parseFloat(toks[i++]);
  const P = (x, y) => [x * scale - 0.5, -(y * scale - 0.5)];
  while (i < toks.length) {
    const t = toks[i];
    if (/[MLCHVZ]/i.test(t)) { cmd = t.toUpperCase(); i++; if (cmd === 'Z') { shape.closePath(); continue; } }
    if (cmd === 'M') { cx = n(); cy = n(); shape.moveTo(...P(cx, cy)); cmd = 'L'; }
    else if (cmd === 'L') { cx = n(); cy = n(); shape.lineTo(...P(cx, cy)); }
    else if (cmd === 'H') { cx = n(); shape.lineTo(...P(cx, cy)); }
    else if (cmd === 'V') { cy = n(); shape.lineTo(...P(cx, cy)); }
    else if (cmd === 'C') { const a = P(n(), n()), b = P(n(), n()); cx = n(); cy = n(); shape.bezierCurveTo(...a, ...b, ...P(cx, cy)); }
    else i++;
  }
  return shape;
}

export function glyphMesh(name, { size = 1, depth = 0.3, face, side } = {}) {
  const geo = new THREE.ExtrudeGeometry(svgShape(T.glyph[name]), { depth, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2, curveSegments: 16 });
  geo.translate(0, 0, -depth / 2);
  geo.scale(size, size, size);
  const mesh = new THREE.Mesh(geo, [face, side]);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

/**
 * The selection gizmo in 3D: 12 thick edges that draw in, 8 white cube handles that pop.
 * update(f, at) animates it like the 2D selection: edges 6f (snap), handles 4f (stamp).
 */
export function gizmo({ w, h, d, mats, thickness = 0.035, handle = 0.16 }) {
  const g = new THREE.Group();
  const edges = [];
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const E = [
    // [start, end] — ordered so the box "draws" from the top-left-front corner
    [[-hx, hy, hz], [hx, hy, hz]], [[-hx, hy, hz], [-hx, -hy, hz]], [[hx, hy, hz], [hx, -hy, hz]], [[-hx, -hy, hz], [hx, -hy, hz]],
    [[-hx, hy, hz], [-hx, hy, -hz]], [[hx, hy, hz], [hx, hy, -hz]], [[-hx, -hy, hz], [-hx, -hy, -hz]], [[hx, -hy, hz], [hx, -hy, -hz]],
    [[-hx, hy, -hz], [hx, hy, -hz]], [[-hx, hy, -hz], [-hx, -hy, -hz]], [[hx, hy, -hz], [hx, -hy, -hz]], [[-hx, -hy, -hz], [hx, -hy, -hz]],
  ];
  for (const [a, b] of E) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B);
    const geo = new THREE.BoxGeometry(thickness, thickness, len); geo.translate(0, 0, len / 2);
    const m = new THREE.Mesh(geo, mats.gizmo);
    m.position.copy(A); m.lookAt(B);
    g.add(m); edges.push(m);
  }
  const handles = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(handle, handle, handle), mats.handleFill);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicMaterial({ color: mats.gizmo.color }));
    cube.add(edge);
    cube.position.set(sx * hx, sy * hy, sz * hz);
    g.add(cube); handles.push(cube);
  }
  const snap = easeFn('snap'), stamp = easeFn('stamp');
  g.userData.update = (f, at = 0, fps = 30) => {
    const k = fps / 30;
    const dEnd = at + T.duration.selectionDraw * k * 1.6, hEnd = dEnd + T.duration.handlePop * k;
    edges.forEach((m, i) => {
      const s0 = at + (i / edges.length) * (dEnd - at) * 0.5;
      const p = Math.max(0, Math.min(1, (f - s0) / ((dEnd - at) * 0.6)));
      const e = snap(p);
      m.scale.set(1, 1, Math.max(0.0001, e)); m.visible = e > 0.001;
    });
    handles.forEach((hnd) => {
      const p = Math.max(0, Math.min(1, (f - dEnd) / (hEnd - dEnd)));
      const e = stamp(p); hnd.scale.setScalar(Math.max(0.0001, e)); hnd.visible = e > 0.001;
    });
  };
  return g;
}

/** keyed camera: pos/target/fov anims (in frames) */
export function cameraRig(w, h, { fov = X.camera.fov } = {}) {
  const cam = new THREE.PerspectiveCamera(fov, w / h, X.camera.near, X.camera.far);
  const target = new THREE.Vector3();
  return {
    cam,
    set(f, { pos, look, fov: fv, roll = 0 }) {
      const p = valueAt(pos, f), l = valueAt(look, f);
      cam.position.set(p[0], p[1], p[2]);
      target.set(l[0], l[1], l[2]);
      cam.up.set(Math.sin((valueAt(roll, f) * Math.PI) / 180), Math.cos((valueAt(roll, f) * Math.PI) / 180), 0);
      cam.lookAt(target);
      if (fv) { cam.fov = valueAt(fv, f); cam.updateProjectionMatrix(); }
    },
  };
}

/** orbit helper: spherical (deg) around a target → [x,y,z] */
export function orbit(target, dist, azDeg, elDeg) {
  const a = (azDeg * Math.PI) / 180, e = (elDeg * Math.PI) / 180;
  return [target[0] + dist * Math.sin(a) * Math.cos(e), target[1] + dist * Math.sin(e), target[2] + dist * Math.cos(a) * Math.cos(e)];
}

/** distance needed to frame a w×h (world units) box with a perspective camera */
export function fitDistance(wu, hu, aspect, fov = X.camera.fov) {
  const v = Math.tan(((fov / 2) * Math.PI) / 180);
  return Math.max(hu / 2 / v, wu / 2 / (v * aspect));
}

/** canvas texture you can redraw every frame */
export function liveTexture(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { canvas: c, ctx: c.getContext('2d'), tex };
}

/** draw a ticker strip into a 2D context (same look as the 2D ticker) */
export function drawTickerStrip(ctx, w, h, { items, offset = 0, band = T.color.ink, color = '#FFFFFF', size, accent } = {}) {
  const fsz = size || Math.round(h * 0.46);
  ctx.fillStyle = band; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = T.color.nightLine; ctx.fillRect(0, 0, w, 2); ctx.fillRect(0, h - 2, w, 2);
  ctx.font = `${fsz}px "IS label"`; ctx.fontKerning = 'none'; ctx.textBaseline = 'alphabetic';
  const cap = (M.label.capHeight / M.label.upm) * fsz, gap = fsz * 1.15, sepH = fsz * 0.66, sepS = sepH / 40;
  const sepW = 3 * sepH + 2 * T.glyph.clusterGap * sepS;
  const lay = items.map((s) => layoutText({ text: s, font: 'label', size: fsz }));
  const unit = lay.reduce((a, l) => a + l.width + gap * 2 + sepW, 0);
  let x = -(((offset % unit) + unit) % unit);
  while (x < w) {
    lay.forEach((l, idx) => {
      ctx.fillStyle = color;
      for (const c of l.lines[0].chars) if (c.ch !== ' ') ctx.fillText(c.ch, x + c.x, h / 2 + cap / 2);
      x += l.width + gap;
      ctx.save(); ctx.translate(x, h / 2 - sepH / 2); ctx.scale(sepS, sepS); ctx.fillStyle = idx % 2 ? color : (accent || color);
      ['star', 'sparkle', 'plus'].forEach((g, i) => { ctx.save(); ctx.translate(i * (40 + T.glyph.clusterGap), 0); ctx.fill(new Path2D(T.glyph[g])); ctx.restore(); });
      ctx.restore();
      x += sepW + gap;
    });
  }
  return unit;
}

export { gridPlate, crumplePlate, placeholderPlate, rng, valueAt, easeFn };
