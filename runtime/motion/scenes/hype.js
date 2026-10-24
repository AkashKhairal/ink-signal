// x-hype — the high-energy explainer: 12–20 s, beat-locked, a shape carries the eye across every transition.
// spark → flood → brand slam → kinetic triplet → 3D signature → product micro-moment → bridge → end card.
// Structure adapted from explainer-high-energy (Barty-Bart/motion-graphics, MIT), rebuilt in Ink & Signal.
import { defineScene } from '../scene.js';
import { h, css, setText, icon, glyph, textWidth } from '../dom.js';
import { T, beats, track, vis, seg, clamp, lerp, spr, ease, ep, typed, caretOn, pulse, eo, eio, hash01, rng } from '../engine.js';
import { ts, input as inputUI, button as buttonUI, progress as progressUI, toast as toastUI } from '../ui.js';
import { kline, maskRise, blurIn, slam, handwrite, highlight, outlineWall, fstyle, caseOf, decode } from '../type.js';
import { hudFrame, grain, vignette, flood, dotGrow, barsWipe, stamp, note } from '../fx.js';
import { col } from '../stage.js';

const C = T.color;
const panel = (S, bg, z = 0) => { const d = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: S.W + 'px', height: S.H + 'px', background: col(bg, S.accent), overflow: 'hidden', zIndex: z } }); S.back.appendChild(d); return d; };
const showIn = (el, t, a, b) => css(el, { display: t >= a && t < b ? '' : 'none' });
const dotGridCSS = (S, c = 'rgba(255,255,255,0.10)', s = 46) => ({ backgroundImage: `radial-gradient(circle, ${c} ${1.6 * S.u}px, transparent ${2.1 * S.u}px)`, backgroundSize: `${s * S.u}px ${s * S.u}px`, backgroundPosition: 'center' });
const lineGridCSS = (S, c = 'rgba(14,14,14,0.07)', s = 54) => ({ backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`, backgroundSize: `${s * S.u}px ${s * S.u}px`, backgroundPosition: 'center' });
/** biggest display size ≤ max that fits `frac` of the width */
const fitSize = (S, s, font, max, frac = 0.84) => { const fam = { display: '"IS display"', label: '"IS label"', note: '"IS note"' }[font] || '"IS display"'; let z = max; while (z > 30 && textWidth(caseOf(font, s), `400 ${z * S.u}px ${fam}`) > S.W * frac) z -= 4; return z; };

export const xHype = defineScene({
  name: 'x-hype', kind: 'explainer', title: 'High-energy promo (12–20 s)',
  description: 'Beat-locked hype piece: a spark floods into the brand slam, a kinetic triplet, a 3D cube-field signature, a product micro-moment with cursor and toast, a morph bridge and an end card. HUD viewfinder throughout.',
  formats: ['yt', 'reel'], theme: 'night',
  defaults: {
    format: 'yt', bpm: 128, offset: 0,
    product: 'Signal', kicker: 'Introducing — 2026', human: 'type it. ship it.', label: 'signal / launch — 2026',
    triplet: [{ word: 'Describe', style: 'ink' }, { word: 'Build', style: 'wall' }, { word: 'live', style: 'hand' }],
    signature: 'Ideas into apps', signatureKey: 'apps',
    ui: { app: 'Signal Agent', heading: 'What will you build?', prompt: 'A booking app for my yoga studio', button: 'Start', busy: 'Building', done: 'Done', progressLabel: 'Publishing', toastTitle: 'Live', toastBody: 'yoga-studio.signal.app' },
    end: { tagline: 'from idea to live app', cta: 'SIGNAL.APP' },
    hud: true, grain: true,
  },
  duration: (p) => (beats(p.bpm, p.offset).at(32) + 0.25),
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const W = S.W, H = S.H; const reel = ctx.reel;
    const B = beats(p.bpm, p.offset); const b = (n) => B.at(n); const sub = (n) => B.sub(n, 16);
    const accent = S.accent;
    // scene windows (beats)
    const W1 = [0, b(3)], W2 = [b(3), b(8)], W3 = [b(8), b(14)], W4 = [b(14), b(20)], W5 = [b(20), b(26)], W6 = [b(26), ctx.duration + 1];

    /* ── backgrounds ── */
    const night = panel(S, C.night); css(night, dotGridCSS(S));
    const red = panel(S, 'accent');
    const t1 = panel(S, C.ink), t2 = panel(S, C.night), t3 = panel(S, C.paper); css(t3, lineGridCSS(S));
    const sig = panel(S, C.night); const ui = panel(S, C.night); css(ui, dotGridCSS(S, 'rgba(255,255,255,0.08)'));
    const endP = panel(S, C.night); css(endP, dotGridCSS(S, 'rgba(255,255,255,0.06)'));
    const triT = [b(8), b(10), b(12), b(14)];
    ctx.add((t) => {
      showIn(night, t, W1[0], W1[1]); showIn(red, t, W2[0], W2[1]);
      showIn(t1, t, triT[0], triT[1]); showIn(t2, t, triT[1], triT[2]); showIn(t3, t, triT[2], triT[3]);
      showIn(sig, t, W4[0], W4[1]); showIn(ui, t, W5[0], W5[1]); showIn(endP, t, W6[0], W6[1]);
    });
    const layer = (z = 1) => { const d = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', zIndex: z } }); S.world.parentNode.appendChild(d); return d; };
    const L = layer(1);

    /* ── S1 spark → line → flood ── */
    const dot = h('div', { style: { position: 'absolute', borderRadius: '50%', background: accent } }); L.appendChild(dot);
    ctx.add((t) => {
      const on = t >= 0.12 && t < b(1.6);
      if (!on) { css(dot, { display: 'none' }); return; }
      const k = spr(t, 0.12, 'pop'), p2 = 1 + 0.35 * pulse(t, b(1) - 0.1, 0.08); const r = 9 * u * k * p2;
      css(dot, { display: '', left: W / 2 - r + 'px', top: H / 2 - r + 'px', width: 2 * r + 'px', height: 2 * r + 'px' });
    });
    const fl = ctx.add(flood(S, L, { at: b(2.3), dur: b(3) - b(2.3), lineAt: b(1.5), color: 'accent', label: p.label }));
    ctx.cue(0.12, 'appear', 'spark'); ctx.cue(b(1.5), 'movement', 'line draws'); ctx.cue(b(2.3) - 0.6, 'build_up', 'riser into flood', { dur: 0.6 }); ctx.cue(b(3), 'reveal', 'flood covers');
    ctx.add((t) => css(fl.el, { display: t >= b(3) + 0.05 ? 'none' : fl.el.style.display }));

    /* ── S2 brand slam ── */
    const nameSize = fitSize(S, p.product + '.', 'display', reel ? 210 : 250, reel ? 0.86 : 0.72);
    const cy = H * (reel ? 0.47 : 0.5);
    const kick = h('div', { style: { position: 'absolute', left: W / 2 + 'px', top: cy - nameSize * u * 0.62 + 'px', transform: 'translate(-50%,-100%)', ...ts(S, reel ? 26 : 24, { mono: true, color: C.ink }), letterSpacing: '0.12em' } }); L.appendChild(kick);
    const name = kline(S, L, { x: W / 2, y: cy, anchor: 'c', text: p.product, font: 'display', size: nameSize, color: C.ink, split: 'chars', mask: true });
    const period = h('span', { style: { display: 'inline-block', width: 0.22 * nameSize * u + 'px', height: 0.22 * nameSize * u + 'px', background: C.ink, borderRadius: '50%', marginLeft: 0.06 * nameSize * u + 'px', alignSelf: 'flex-end', marginBottom: 0.02 * nameSize * u + 'px' } });
    name.el.appendChild(period);
    const human = h('div', { text: p.human, style: { position: 'absolute', left: W / 2 + 'px', top: cy + nameSize * u * 0.55 + 'px', transform: 'translateX(-50%) rotate(-3deg)', ...fstyle(S, 'note', reel ? 84 : 92, { color: C.ink }) } }); L.appendChild(human);
    const s2 = [kick, name.el, human];
    const letterT = (i) => b(3) + 0.12 + i * (B.spb / 4);
    ctx.add((t) => {
      const on = t >= W2[0] && t < W2[1] + 0.02; s2.forEach((e) => css(e, { display: on ? '' : 'none' }));
      if (!on) return;
      decode(kick, caseOf('label', p.kicker), t, b(3) + 0.05, B.spb * 1.5, { seed: 5 });
      maskRise(name.units, t, letterT(0), B.spb / 4, 0.38, 'snap', 1.12);
      const pk = spr(t, letterT(name.letters.length) + 0.05, 'stamp'); css(period, { transform: `scale(${Math.max(0, pk).toFixed(4)})` });
      handwrite(human, t, b(5.5), 0.6);
    });
    name.letters.forEach((_, i) => i % 2 === 0 && ctx.cue(letterT(i), 'tick', 'letter'));
    ctx.cue(letterT(0), 'slam', 'name'); ctx.cue(b(5.5), 'appear', 'human line');
    // the full stop grows into the next background (ink)
    const pdot = ctx.add(dotGrow(S, L, { at: b(7.2), dur: b(8) - b(7.2), color: C.ink, r0: 0.11 * nameSize, e: [0.7, 0, 0.3, 1] }));
    ctx.add((t) => { if (t >= b(7.2) - 0.01 && t < b(8.05)) { const r = period.getBoundingClientRect(), rr = S.root.getBoundingClientRect(); const sc = rr.width / W || 1; pdot.el.__x = (r.left - rr.left + r.width / 2) / sc; pdot.el.__y = (r.top - rr.top + r.height / 2) / sc; } });
    // re-centre the growing dot on the period (measured in seek: layout is deterministic)
    const R = Math.hypot(W, H);
    ctx.add((t) => { if (t >= b(7.2) && t < b(8.05) && pdot.el.__x != null) { const g = ease([0.7, 0, 0.3, 1])(seg(t, b(7.2), b(8))); const r = 0.11 * nameSize * u + (R - 0.11 * nameSize * u) * g; css(pdot.el, { display: '', left: pdot.el.__x - r + 'px', top: pdot.el.__y - r + 'px', width: 2 * r + 'px', height: 2 * r + 'px' }); } else if (t >= b(8.05)) css(pdot.el, { display: 'none' }); });
    ctx.cue(b(7.2), 'movement', 'dot grows'); ctx.cue(b(8), 'scene_cut', 'triplet');

    /* ── S3 kinetic triplet (two beats each; the handwritten one gets three) ── */
    const trip = p.triplet.slice(0, 3);
    const tw = trip.map((w, i) => {
      const t0 = triT[i], host = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', overflow: 'hidden' } }); L.appendChild(host);
      let el, wall = null, upd;
      if (w.style === 'wall') {
        wall = outlineWall(S, host, { word: w.word, rows: reel ? 11 : 6, size: reel ? 150 : 180, speed: 380, color: accent });
        css(wall.el, { opacity: '0.85' });
        const sz = fitSize(S, w.word, 'display', reel ? 230 : 300, 0.86);
        el = kline(S, host, { x: W / 2, y: H / 2, text: w.word, font: 'display', size: sz, color: accent, split: null }).el;
        const pl = h('div', { style: { position: 'absolute', left: '0px', top: H / 2 - sz * u * 0.62 + 'px', width: W + 'px', height: sz * u * 1.24 + 'px', background: C.night } }); host.insertBefore(pl, el);
        upd = (t) => { wall.update(t); slam(el, t, t0 + 0.02, { from: 1.7, rot: -6, base: 'translate(-50%,-50%)' }); };
      } else if (w.style === 'hand') {
        const sz = reel ? 260 : 300;
        el = h('div', { text: w.word, style: { position: 'absolute', left: W / 2 + 'px', top: H / 2 + 'px', transform: 'translate(-50%,-55%) rotate(-4deg)', ...fstyle(S, 'note', sz, { color: C.pen }) } }); host.appendChild(el);
        const ul = h('div', { style: { position: 'absolute', left: W / 2 - textWidth(w.word, `700 ${sz * u}px "IS note"`) * 0.48 + 'px', top: H / 2 + sz * u * 0.32 + 'px', height: 6 * u + 'px', background: accent, transformOrigin: '0 50%', width: textWidth(w.word, `700 ${sz * u}px "IS note"`) * 0.96 + 'px' } }); host.appendChild(ul);
        upd = (t) => { handwrite(el, t, t0 + 0.04, B.spb * 1.4); css(ul, { transform: `scaleX(${ep(t, t0 + B.spb * 1.4, t0 + B.spb * 2.1, 'write')})` }); };
      } else {
        const sz = fitSize(S, w.word, 'display', reel ? 230 : 300, 0.86);
        const k = kline(S, host, { x: W / 2, y: H / 2, text: w.word, font: 'display', size: sz, color: '#FFFFFF', split: 'chars' });
        el = k.el;
        const br = h('div', { html: `<svg width="${W}" height="${H}">${[[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => { const x = W / 2 - dx * W * 0.38, y = H / 2 - dy * sz * u * 1.1, L2 = 40 * u; return `<path d="M${x} ${y + dy * L2}L${x} ${y}L${x + dx * L2} ${y}" stroke="${accent}" stroke-width="${3 * u}" fill="none"/>`; }).join('')}</svg>`, style: { position: 'absolute', left: '0px', top: '0px' } });
        host.appendChild(br);
        const dims = h('div', { text: `${ctx.W} × ${ctx.H}`, style: { position: 'absolute', left: W / 2 + W * 0.38 + 'px', top: H / 2 + sz * u * 1.1 + 14 * u + 'px', transform: 'translateX(-100%)', ...ts(S, 18, { mono: true, color: accent }) } }); host.appendChild(dims);
        upd = (t) => { blurIn(k.units, t, t0, 0.025, { dx: -0.6, dy: 0, lin: 0.22, blur: 18 }); const s = 1 + 0.05 * (1 - clamp(spr(t, t0 + 0.15, 'stamp'))); css(el, { transform: `translate(-50%,-50%) scale(${s.toFixed(4)})` }); css(br, { opacity: clamp((t - t0 - 0.1) / 0.1) }); };
      }
      ctx.cue(t0, w.style === 'hand' ? 'appear' : 'slam', `word ${i + 1}`);
      return { host, t0, t1: triT[i + 1], upd };
    });
    ctx.add((t) => tw.forEach((w) => { const on = t >= w.t0 && t < w.t1 + 0.02; css(w.host, { display: on ? '' : 'none' }); if (on) w.upd(t); }));
    const bw = ctx.add(barsWipe(S, L, { at: b(14), dur: 0.32, n: reel ? 5 : 7, color: C.ink, alt: 'accent', stagger: 0.035 }));
    void bw; ctx.cue(b(14) - 0.35, 'movement', 'bars wipe');

    /* ── S4 signature: 3D cube field rippling from the centre ── */
    const cv = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px' } }); sig.appendChild(cv);
    let three = null;
    ctx.ready.push((async () => {
      const kit = await import('../../three/kit.js'); const { THREE } = kit;
      const dpr = Math.max(1, window.devicePixelRatio || 1); // 4K renders: draw the 3D at the output resolution
      const r = kit.makeRenderer(Math.round(W * dpr), Math.round(H * dpr)); cv.appendChild(r.domElement); css(r.domElement, { width: W + 'px', height: H + 'px' });
      const scene = new THREE.Scene(); scene.fog = new THREE.Fog(C.night, 18, 46);
      const cam = new THREE.PerspectiveCamera(T.three.camera.fov, W / H, 0.1, 200);
      kit.lights(scene, { world: 'night', accent, radius: 30, shadowSize: 16 });
      const N = reel ? 13 : 17, sp = 1.12, M = N * N;
      const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0 });
      const mesh = new THREE.InstancedMesh(geo, mat, M); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
      const floorM = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.35 })); floorM.rotation.x = -Math.PI / 2; floorM.receiveShadow = true; scene.add(floorM);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), c = new THREE.Color();
      const cInk = new THREE.Color('#202022'), cMid = new THREE.Color('#5A5A58'), cSig = new THREE.Color(accent), cWhite = new THREE.Color('#ECEBE6');
      const rr = rng(9); const jit = Array.from({ length: M }, () => rr());
      three = {
        render(t) {
          const lt = t - W4[0];
          for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
            const k = i * N + j, x = (i - (N - 1) / 2) * sp, z = (j - (N - 1) / 2) * sp, rd = Math.hypot(x, z);
            const front = lt * 9 - 1.5;            // ripple ring radius
            const ring = Math.exp(-Math.pow((rd - front) / 1.6, 2));
            const gather = clamp((lt - 1.4) / 1.0) * Math.exp(-rd * rd / 6);
            const idle = 0.12 + 0.08 * Math.sin(lt * 3 + jit[k] * 6.28 + rd);
            const hgt = 0.15 + idle + 2.4 * ring * (1 - clamp((lt - 1.6) / 0.8)) + 4.2 * ease('stamp')(clamp((lt - 1.3) / 0.9)) * Math.exp(-rd * rd / 3.2) + 1.2 * gather;
            pv.set(x, 0, z); sv.set(0.92, Math.max(0.05, hgt), 0.92); m4.compose(pv, q, sv); mesh.setMatrixAt(k, m4);
            const e = clamp(hgt / 4);
            c.copy(cInk).lerp(cMid, clamp(e * 2)).lerp(e > 0.55 ? cSig : cMid, clamp((e - 0.35) * 3)); if (e > 0.9) c.lerp(cWhite, (e - 0.9) * 5);
            mesh.setColorAt(k, c);
          }
          mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
          const az = (38 + 14 * ease('drift')(seg(lt, 0, W4[1] - W4[0]))) * Math.PI / 180, el = (reel ? 40 : 30) * Math.PI / 180, dist = reel ? 36 : 27;
          cam.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist); cam.lookAt(0, reel ? 1.2 : 0.8, 0);
          r.render(scene, cam);
        },
      };
    })());
    ctx.add((t) => { if (three && t >= W4[0] - 0.05 && t < W4[1] + 0.05) three.render(t); });
    const sigY = reel ? H * 0.8 : H * 0.84;
    const sline = kline(S, L, { x: W / 2, y: sigY, anchor: 'c', text: p.signature, font: 'display', size: reel ? 76 : 84, color: '#FFFFFF', split: 'words', mask: true });
    const keyWord = sline.units.find((x) => x.ch.toLowerCase() === caseOf('display', p.signatureKey).toLowerCase());
    const hl = keyWord ? highlight(S, keyWord.inner, { at: b(17.5), textOn: C.ink }) : null;
    ctx.add((t) => { const on = t >= W4[0] && t < W4[1]; css(sline.el, { display: on ? '' : 'none' }); if (!on) return; maskRise(sline.units, t, b(15), B.spb / 2, 0.4); if (hl) hl(t); });
    ctx.cue(b(14), 'scene_cut', 'signature'); ctx.cue(b(15), 'movement', 'ripple'); ctx.cue(b(17.5), 'reveal', 'highlight');
    const fl2 = ctx.add(flood(S, L, { at: b(19.4), dur: b(20) - b(19.4), lineAt: b(18.8), color: 'accent', exit: b(20) + 0.04, y: H / 2 }));
    void fl2; ctx.cue(b(18.8), 'movement', 'bar'); ctx.cue(b(20), 'scene_cut', 'product');

    /* ── S5 product micro-moment: tilted card, ghost cards, cursor, progress, toast ── */
    const cardW = reel ? 860 : 980, cardH = 520;
    const tilt = h('div', { style: { position: 'absolute', left: W / 2 + 'px', top: H / 2 + 'px', width: '0px', height: '0px', perspective: 2200 * u + 'px' } }); L.appendChild(tilt);
    const stack = h('div', { style: { position: 'absolute', left: '0px', top: '0px', transformStyle: 'preserve-3d' } }); tilt.appendChild(stack);
    const cardEl = (z, o) => { const d = h('div', { style: { position: 'absolute', left: -cardW / 2 * u + 'px', top: -cardH / 2 * u + 'px', width: cardW * u + 'px', height: cardH * u + 'px', borderRadius: 28 * u + 'px', background: C.nightPanel, outline: `${1.5 * u}px solid ${C.nightLine}`, boxShadow: '0 40px 80px -30px rgba(0,0,0,.8)', transform: `translate3d(${z * 26 * u}px,${-z * 30 * u}px,${-z * 90 * u}px)`, opacity: String(o) } }); stack.appendChild(d); return d; };
    cardEl(2, 0.35); cardEl(1, 0.6); const card = cardEl(0, 1);
    card.classList.add('is-night'); css(card, { color: '#FFFFFF' });
    const t5 = W5[0] + 0.15;
    card.appendChild(h('div', { html: `<span style="display:inline-block;width:${10 * u}px;height:${10 * u}px;border-radius:50%;background:${accent}"></span><span>${caseOf('label', p.ui.app)}</span>`, style: { position: 'absolute', left: 48 * u + 'px', top: 44 * u + 'px', display: 'flex', alignItems: 'center', gap: 10 * u + 'px', ...ts(S, 18, { label: true, color: C.fog }) } }));
    card.appendChild(h('div', { text: p.ui.heading, style: { position: 'absolute', left: 48 * u + 'px', top: 82 * u + 'px', ...ts(S, 50, { w: 'bold', color: '#FFFFFF', track: -0.03 }) } }));
    const typeT = t5 + 0.5, cps = 30, tEnd = typeT + p.ui.prompt.length / cps;
    const inp = ctx.add(inputUI(S, card, { x: 48 * u, y: 172 * u, anchor: 'tl', w: cardW - 96, h: 120, text: p.ui.prompt, t0: typeT, cps, placeholder: 'Describe your app…', r: 'control', multiline: true, size: 28 }));
    css(inp.el, { background: C.nightRaised });
    const clickT = Math.max(tEnd + 0.25, b(22.5)), doneT = Math.min(b(25) - 0.1, clickT + 1.7);
    const btn = ctx.add(buttonUI(S, card, { x: (cardW - 48) * u, y: 352 * u, anchor: 'tr', label: p.ui.button, variant: 'accent', h: 64, states: [[clickT + 0.05, p.ui.busy, 'ghost'], [doneT, p.ui.done + ' ✓', 'control']], presses: [clickT], size: 'small' }));
    const pr = ctx.add(progressUI(S, card, { x: 48 * u, y: 344 * u, anchor: 'tl', w: cardW - 96 - btn.w / u - 40, p: (t) => ease('drift')(seg(t, clickT + 0.1, doneT)), label: caseOf('label', p.ui.progressLabel) }));
    void pr;
    const tst = ctx.add(toastUI(S, L, { x: W - (reel ? 60 : 90) * u, y: reel ? 300 * u : 100 * u, anchor: 'tr', icon: 'globe', title: p.ui.toastTitle, body: p.ui.toastBody, at: doneT + 0.12, w: reel ? 600 : 560 }));
    tst.el.classList.add('is-night'); css(tst.el, { color: '#FFFFFF' });
    const bridgeT = b(26); const cardScale = reel ? 1.0 : 1.18; let endDot = null;
    ctx.add((t) => {
      const on = t >= W5[0] && t < bridgeT + 0.55; css(tilt, { display: on ? '' : 'none' }); css(tst.el, { display: t >= doneT + 0.12 && t < bridgeT ? 'flex' : 'none' });
      if (!on) return;
      const k = spr(t, W5[0], 'soft'); const drift = seg(t, W5[0], bridgeT);
      const rx = lerp(26, 12, k) - 2 * drift, ry = lerp(-30, -16, k) + 6 * drift;
      // bridge: the card collapses into the accent dot
      const c2 = ease([0.7, 0, 0.3, 1])(seg(t, bridgeT, bridgeT + 0.45));
      const travel = ease('wipe')(seg(t, bridgeT + 0.2, bridgeT + 0.5)); const ex = endDot ? (endDot.x - W / 2) * travel : 0, ey2 = endDot ? (endDot.y - H / 2) * travel : 0;
      css(stack, { transform: `translate(${ex.toFixed(2)}px,${(ey2 + (1 - k) * 220 * u).toFixed(2)}px) rotateX(${rx * (1 - c2)}deg) rotateY(${ry * (1 - c2)}deg) scale(${(lerp(1, 0.04, c2) * cardScale).toFixed(4)})`, opacity: String(clamp(k * 1.5)) });
      css(card, { borderRadius: lerp(28 * u, cardH * u / 2, c2) + 'px', background: c2 > 0.3 ? accent : C.nightPanel });
      [...card.children].forEach((ch) => css(ch, { opacity: String(1 - clamp(c2 * 3)) }));
    });
    ctx.cue(W5[0] + 0.1, 'appear', 'card'); ctx.cue(typeT, 'typing', 'prompt', { dur: tEnd - typeT }); ctx.cue(clickT, 'click', 'start'); ctx.cue(doneT, 'success', 'done'); ctx.cue(doneT + 0.12, 'notify', 'toast'); ctx.cue(bridgeT, 'movement', 'collapse');
    const cursorKeys = [[W5[0], W / 2 + 300 * u, H / 2 + 420 * u], [clickT - 0.55, W / 2 + 300 * u, H / 2 + 300 * u], [clickT - 0.1, W / 2 + (cardW / 2 - 48 - btn.w / u / 2) * u * 0.92 * cardScale, H / 2 + 118 * u * cardScale], [clickT + 0.5, W / 2 + (cardW / 2 - 48 - btn.w / u / 2) * u * 0.92 * cardScale, H / 2 + 118 * u * cardScale], [bridgeT, W / 2 + 380 * u, H / 2 + 330 * u]];
    ctx.cursor({ keys: cursorKeys, clicks: [clickT], space: 'screen', show: [W5[0] + 0.3, bridgeT] });

    /* ── S6 end card: the dot becomes the brand mark ── */
    const eSize = fitSize(S, p.product, 'display', reel ? 170 : 190, reel ? 0.8 : 0.6);
    const ey = H * (reel ? 0.45 : 0.46);
    const ename = kline(S, L, { x: W / 2, y: ey, anchor: 'c', text: p.product, font: 'display', size: eSize, color: '#FFFFFF', split: 'chars', mask: true });
    const edot = h('span', { style: { display: 'inline-block', width: 0.2 * eSize * u + 'px', height: 0.2 * eSize * u + 'px', background: accent, borderRadius: '50%', marginLeft: 0.06 * eSize * u + 'px', alignSelf: 'flex-end', marginBottom: 0.02 * eSize * u + 'px' } }); ename.el.appendChild(edot);
    const etag = h('div', { text: p.end.tagline, style: { position: 'absolute', left: W / 2 + 'px', top: ey + eSize * u * 0.5 + 'px', transform: 'translateX(-50%) rotate(-3deg)', ...fstyle(S, 'note', reel ? 72 : 76, { color: '#FFFFFF' }) } }); L.appendChild(etag);
    const rule = h('div', { style: { position: 'absolute', left: W / 2 + 'px', top: ey + eSize * u * 0.5 + (reel ? 150 : 140) * u + 'px', height: 1.5 * u + 'px', width: (reel ? 520 : 600) * u + 'px', marginLeft: -(reel ? 260 : 300) * u + 'px', background: C.nightLine, transformOrigin: '50% 50%' } }); L.appendChild(rule);
    const cta = h('div', { style: { position: 'absolute', left: W / 2 + 'px', top: ey + eSize * u * 0.5 + (reel ? 178 : 168) * u + 'px', transform: 'translateX(-50%)', ...ts(S, 26, { mono: true, color: accent }), letterSpacing: '0.24em' } }); L.appendChild(cta);
    const ring = h('div', { style: { position: 'absolute', borderRadius: '50%', border: `${3 * u}px solid ${accent}` } }); L.appendChild(ring);
    const eT = bridgeT + 0.5;
    { const er = edot.getBoundingClientRect(), rb = S.root.getBoundingClientRect(), sc = rb.width / W || 1; endDot = { x: (er.left - rb.left + er.width / 2) / sc, y: (er.top - rb.top + er.height / 2) / sc }; }
    ctx.add((t) => {
      const on = t >= eT - 0.2; [ename.el, etag, rule, cta, ring].forEach((e) => css(e, { display: on ? '' : 'none' }));
      if (!on) return;
      maskRise(ename.units, t, eT, 0.035, 0.42);
      const dk = spr(t, eT - 0.15, 'stamp'); css(edot, { transform: `scale(${Math.max(0, dk).toFixed(4)})` });
      const rk = seg(t, eT - 0.15, eT + 0.6); const er = edot.getBoundingClientRect(), rb = S.root.getBoundingClientRect(), sc = rb.width / W || 1; const cx = (er.left - rb.left + er.width / 2) / sc, cyy = (er.top - rb.top + er.height / 2) / sc; const RR = (20 + 220 * eo(rk)) * u;
      css(ring, { left: cx - RR + 'px', top: cyy - RR + 'px', width: 2 * RR + 'px', height: 2 * RR + 'px', opacity: String((1 - rk) * 0.9), display: rk > 0 && rk < 1 ? '' : 'none' });
      handwrite(etag, t, eT + 0.45, 0.6);
      css(rule, { transform: `scaleX(${ep(t, eT + 0.7, eT + 1.2, 'wipe')})` });
      setText(cta, p.end.cta.slice(0, typed(t, eT + 0.95, p.end.cta.length, 22)));
    });
    ctx.cue(eT - 0.15, 'reveal', 'end card'); ctx.cue(eT + 0.95, 'typing', 'cta', { dur: p.end.cta.length / 22 }); ctx.cue(eT + 0.45, 'success', 'tagline');

    /* ── HUD, grain, vignette ── */
    if (p.hud) {
      const cats = T.hudFrame.categories;
      ctx.add(hudFrame(S, { scenes: [[0, 1, 'SIGNAL'], [W2[0], 2, 'BRAND'], [W3[0], 3, cats[0]], [W4[0], 4, 'SYSTEM'], [W5[0], 5, cats[1]], [W6[0], 6, 'SIGNAL']], total: 6, at: 0.2, colors: [[0, '#FFFFFF'], [W2[0], C.ink], [triT[0], '#FFFFFF'], [triT[2], C.ink], [W4[0], '#FFFFFF']], safe: reel ? { top: ctx.safe.top - 60, bottom: ctx.safe.bottom - 80, right: ctx.safe.right - 60 } : null }));
    }
    vignette(S, { strength: 0.32 });
    if (p.grain) ctx.add(grain(S, { amount: 0.1, seed: 11, fps: ctx.fps }));
  },
});
