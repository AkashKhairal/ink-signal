// x-journey — the one-take explainer: one hero (a white ball that starts as a toggle's knob) travels through
// the product's workflow laid out as stations on one canvas; the camera follows, each station reacts, the
// camera pulls out to reveal the whole course and dives back. Seamless loop.
// Structure adapted from explainer-engaging (Barty-Bart/motion-graphics, MIT), rebuilt in Ink & Signal.
import { defineScene } from '../scene.js';
import { h, css, setText, icon } from '../dom.js';
import { T, track, vis, seg, clamp, lerp, spr, ease, ep, kf, bake, follow, slowmo, pulse, eo, eio } from '../engine.js';
import { ts, toggle as toggleUI, notif, keyboard, toast as toastUI } from '../ui.js';

const C = T.color;
const G = 2600; // gravity px/s²

export const xJourney = defineScene({
  name: 'x-journey', kind: 'explainer', title: 'One-take journey (10–16 s loop)',
  description: 'A white ball starts as a toggle’s knob, rolls a slider to 100, bounces down notification cards that pop as it hits them, hops across a keyboard typing a word, hits return and is launched back while the camera pulls out to reveal the whole course, then dives back. Loops seamlessly.',
  formats: ['yt', 'reel', 'square'], theme: 'night', grid: 'dot', loop: true,
  defaults: {
    format: 'yt', duration: 11,
    toggle: 'Auto-build', slider: 'Agent · Building',
    cards: [{ app: 'Agent', title: 'Writing 12 files', ic: 'code' }, { app: 'Tests', title: 'All 48 passing', ic: 'shield-check' }, { app: 'Preview', title: 'Ready to ship', ic: 'eye' }],
    word: 'ship', inputLabel: 'Command', toastTitle: 'Live', toastBody: 'yoga-studio.signal.app',
  },
  duration: (p) => p.duration,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const W = S.W, H = S.H; const D = ctx.duration;
    const sc = D / 12; // all times are authored for 12 s and scale with the requested duration
    const R = 35;      // hero radius = the toggle knob
    const XS = 29;     // knob centre offset in the toggle
    const tt = (x) => x * sc;
    /* ── stations ── */
    const lab = (x, y, s) => { const d = h('div', { html: s, style: { position: 'absolute', left: x * u + 'px', top: y * u + 'px', ...ts(S, 22, { w: 'semibold', color: '#FFFFFF' }), whiteSpace: 'nowrap' } }); S.world.appendChild(d); return d; };
    lab(-70, -110, `<span style="color:${C.fog}">Toggle · </span>${p.toggle}`);
    // slider
    const X0 = 29, X1 = 860;
    const strack = h('div', { style: { position: 'absolute', left: X0 * u + 'px', top: (R - 4) * u + 'px', width: (X1 - X0) * u + 'px', height: 8 * u + 'px', borderRadius: 4 * u + 'px', background: C.nightSkeleton } });
    const sfill = h('div', { style: { position: 'absolute', left: X0 * u + 'px', top: (R - 4) * u + 'px', height: 8 * u + 'px', borderRadius: 4 * u + 'px', background: S.accent } });
    S.world.append(strack, sfill);
    for (let i = 0; i <= 10; i++) S.world.appendChild(h('div', { style: { position: 'absolute', left: (X0 + ((X1 - X0) * i) / 10) * u - 1 + 'px', top: (R + 18) * u + 'px', width: 2 * u + 'px', height: (i % 5 ? 10 : 16) * u + 'px', background: C.nightLine } }));
    lab(260, -110, `<span style="color:${C.fog}">${p.slider.split('·')[0]}· </span>${(p.slider.split('·')[1] || '').trim()}`);
    const tip = h('div', { style: { position: 'absolute', padding: `${6 * u}px ${12 * u}px`, borderRadius: 10 * u + 'px', background: '#FFFFFF', ...ts(S, 20, { mono: true, color: C.ink }) } }); S.world.appendChild(tip);
    // notification staircase
    const cardsAt = [[1120, 330], [1590, 620], [2060, 910]];
    const cw = 430;
    const nt = p.cards.slice(0, 3).map((c, i) => notif(S, S.world, { x: cardsAt[i][0], y: cardsAt[i][1], anchor: 'c', w: cw, app: c.app, title: c.title, time: 'now', ic: c.ic, at: 0 }));
    const cardTop = (i) => cardsAt[i][1] - nt[i].h / 2 / u;
    // keyboard + input
    const KB = { x: 2760, y: 1420, w: 900 };
    const kb = keyboard(S, S.world, { x: KB.x, y: KB.y, anchor: 'c', w: KB.w });
    const kL = KB.x - kb.W / 2 / u, kT = KB.y - kb.H / 2 / u;
    const keyPos = (ch) => { const k = kb.keys[ch]; return { x: kL + k.cx / u, y: kT + k.cy / u - 26 }; };
    const inp = h('div', { style: { position: 'absolute', left: (KB.x - 330) * u + 'px', top: (kT - 150) * u + 'px', width: 660 * u + 'px', height: 92 * u + 'px', borderRadius: 18 * u + 'px', background: C.nightRaised, outline: `${1.5 * u}px solid ${C.nightLine}`, outlineOffset: -1.5 * u + 'px', display: 'flex', alignItems: 'center', gap: 14 * u + 'px', padding: `0 ${26 * u}px`, boxSizing: 'border-box', ...ts(S, 30, { mono: true, color: '#FFFFFF' }) } });
    inp.innerHTML = `<span style="color:${S.accent}">›</span><span class="v"></span><span class="c" style="display:inline-block;width:${3 * u}px;height:${34 * u}px;background:${S.accent}"></span>`;
    S.world.appendChild(inp); lab(KB.x - 330, kT - 196, `<span style="color:${C.fog}">${p.inputLabel}</span>`);
    const tst = toastUI(S, S.world, { x: KB.x + 330, y: kT - 330, anchor: 'tr', icon: 'globe', title: p.toastTitle, body: p.toastBody, at: 0, w: 560 });

    /* ── the hero's path: rest → slide → roll → hops (contacts) → launch (slow-mo) → land in the slot ── */
    const tA0 = tt(0.25), tA1 = tt(0.62), tB1 = tt(2.45);
    const word = [...p.word.toLowerCase()].filter((c) => kb.keys[c]);
    const contacts = [[tB1, X1, 0]];
    let tc = tB1 + tt(0.45);
    cardsAt.forEach((c, i) => { contacts.push([tc, c[0] - cw * 0.22, cardTop(i) - R]); tc += tt(0.46); });
    tc += tt(0.08);
    word.forEach((ch) => { const q = keyPos(ch); contacts.push([tc, q.x, q.y - R + 26]); tc += tt(0.34); });
    const rq = keyPos('\n'); contacts.push([tc, rq.x, rq.y - R + 26]);
    const tRet = tc, tHold = tRet + tt(0.6), tL = tHold;          // payoff hold, then launch
    const tLand = D - tt(0.35);                                    // lands back in the slot just before the seam
    const xR = rq.x, yR = rq.y - R + 26, xS = -XS, yS = 0, yApex = -980;
    const v0 = -Math.sqrt(2 * G * (yR - yApex)), ta = -v0 / G, td = Math.sqrt((2 * (yS - yApex)) / G), Tf = ta + td;
    const warp = slowmo(tL, tLand, 0.86, 0.7);
    const hops = contacts.map((c, i) => (i ? [contacts[i - 1], c] : null)).filter(Boolean);
    const heroAt = (t) => {
      if (t < tA0 || t >= tLand) return { x: xS, y: yS, vx: 0, vy: 0 };
      if (t < tA1) { const k = ease('snap')(seg(t, tA0, tA1)); return { x: lerp(xS, XS, k), y: 0, vx: 200, vy: 0 }; }
      if (t < tB1) { const q = seg(t, tA1, tB1); const e = 0.3 * q + 0.7 * q * q; return { x: lerp(XS, X1, e), y: 0, vx: ((X1 - XS) * (0.3 + 1.4 * q)) / (tB1 - tA1), vy: 0 }; }
      for (const [a, b] of hops) {
        if (t < b[0]) {
          const T0 = b[0] - a[0], tau = t - a[0];
          const vy = (b[2] - a[2] - 0.5 * G * T0 * T0) / T0;
          return { x: lerp(a[1], b[1], tau / T0), y: a[2] + vy * tau + 0.5 * G * tau * tau, vx: (b[1] - a[1]) / T0, vy: vy + G * tau };
        }
      }
      if (t < tL) return { x: xR, y: yR, vx: 0, vy: 0 };
      const ph = ((warp(t) - tL) / (tLand - tL)) * Tf;
      return { x: lerp(xR, xS, ph / Tf), y: yR + v0 * ph + 0.5 * G * ph * ph, vx: (xS - xR) / Tf, vy: v0 + G * ph };
    };
    const contactTimes = [tA1, ...contacts.map((c) => c[0]), tLand];

    /* ── camera: baked follow (critically damped) blending hero and station anchors, then reveal + dive ── */
    const fitW = (wWorld, frac) => (W * frac) / wWorld;
    const tallF = ctx.reel ? 1.45 : 1;
    const zToggle = Math.min(fitW(520, 0.55 * tallF), (H * 0.5) / 300), zSlider = Math.min(fitW(1000, 0.82 * tallF), 1.6), zCards = Math.min(fitW(900, 0.75 * tallF), 1.3), zKeys = Math.min(fitW(1050, 0.86 * (ctx.reel ? 1.12 : 1)), 1.25);
    const anchors = [
      [0, { x: 120, y: -20, z: zToggle, w: 0.85 }], [tA1, { x: 450, y: -20, z: zSlider, w: 0.7 }], [tB1 - tt(0.1), { x: 1300, y: 380, z: zCards, w: 0.2 }],
      [contacts[3][0] - tt(0.05), { x: KB.x, y: KB.y - 200, z: zKeys, w: 0.55 }], [tRet, { x: KB.x, y: kT - 200, z: zKeys * 0.95, w: 0.85 }],
    ];
    const anc = (t) => { let a = anchors[0][1]; for (const [ts0, v] of anchors) if (t >= ts0) a = v; return a; };
    const AX = track(anchors[0][1].x, anchors.slice(1).map(([t0, v]) => [t0, v.x, 'soft'])), AY = track(anchors[0][1].y, anchors.slice(1).map(([t0, v]) => [t0, v.y, 'soft']));
    const AW = track(anchors[0][1].w, anchors.slice(1).map(([t0, v]) => [t0, v.w, 'soft'])), AZ = track(anchors[0][1].z, anchors.slice(1).map(([t0, v]) => [t0, v.z, 'camera']));
    void anc;
    const camF = bake({ x: anchors[0][1].x, y: anchors[0][1].y, vx: 0, vy: 0 }, (s, t, dt) => {
      const hp = heroAt(t), lead = 0.15, wA = AW(t);
      const tx = lerp(hp.x + hp.vx * lead, AX(t), wA), ty = lerp(hp.y + hp.vy * lead * 0.5, AY(t), wA);
      const [x, vx] = follow(s.x, s.vx, tx, 6, dt), [y, vy] = follow(s.y, s.vy, ty, 6, dt);
      return { x, y, vx, vy };
    }, tL + 0.1);
    const courseZ = Math.min((W * 0.86) / 3500, (H * 0.8) / 2300);
    const tRev = tL + tt(1.1), tDive = tLand - tt(1.45);
    const camAt = (t) => {
      if (t < tL) { const f = camF(t); return { x: f.x, y: f.y, z: AZ(t), tilt: 0 }; }
      const f = camF(tL), zL = AZ(tL);
      if (t < tDive) { const k = ease('wipe')(seg(t, tL, tRev)); return { x: lerp(f.x, 1450, k), y: lerp(f.y, 520, k), z: lerp(zL, courseZ, k), tilt: 18 * k }; }
      const k = ease([0.55, 0, 0.25, 1])(seg(t, tDive, tLand));
      // zoom in log space so position and scale arrive together
      return { x: lerp(1450, anchors[0][1].x, k), y: lerp(520, anchors[0][1].y, k), z: Math.exp(lerp(Math.log(courseZ), Math.log(zToggle), k)), tilt: 18 * (1 - k) };
    };

    /* ── the hero ── */
    const hero = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: 2 * R * u + 'px', height: 2 * R * u + 'px', marginLeft: -R * u + 'px', marginTop: -R * u + 'px', borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 6px 18px rgba(0,0,0,.45)', zIndex: 10 } });
    const halo = h('div', { style: { position: 'absolute', left: '0px', top: '0px', borderRadius: '50%', border: `${3 * u}px solid rgba(255,255,255,.5)`, zIndex: 9 } });
    S.world.append(halo, hero);

    /* ── resets during the reveal hold ── */
    const resetT = tRev + tt(0.3);
    const tog = toggleUI(S, S.world, { x: 0, y: 0, anchor: 'c', start: false, on: [[tA0 + 0.05, true], [resetT, false]], size: 1.7 });
    css(tog.el.firstChild, { opacity: '0' }); // the hero is the knob
    S.world.insertBefore(tog.el, S.world.firstChild.nextSibling);
    const slot = h('div', { style: { position: 'absolute', width: 2 * R * u + 'px', height: 2 * R * u + 'px', borderRadius: '50%', border: `${2 * u}px dashed rgba(255,255,255,.4)`, top: -R * u + 'px', boxSizing: 'border-box' } }); S.world.insertBefore(slot, hero);
    ctx.add((t) => {
      const c = camAt(t); S.cam.set({ x: c.x, y: c.y, zoom: c.z, tiltX: c.tilt });
      const hp = heroAt(t);
      // squash on contacts, stretch in flight
      let sx = 1, sy = 1; const lastC = contactTimes.filter((x) => x <= t).pop();
      if (lastC != null && t - lastC < 0.18) { const q = Math.exp(-(t - lastC) * 26) * Math.cos((t - lastC) * 40); sx = 1 + 0.25 * q; sy = 1 - 0.2 * q; }
      const sp2 = Math.hypot(hp.vx, hp.vy); const flight = clamp(sp2 / 2400) * 0.15;
      const ang = Math.atan2(hp.vy, hp.vx) * 180 / Math.PI;
      const big = t >= tL && t < tLand ? 1 + 1.2 * ease('drift')(seg(t, tL, tRev)) * (1 - ease('wipe')(seg(t, tDive, tLand))) : 1;
      css(hero, { transform: `translate(${hp.x * u}px,${hp.y * u}px) rotate(${ang.toFixed(2)}deg) scale(${(big * (sx + flight)).toFixed(4)},${(big * (sy - flight * 0.6)).toFixed(4)}) rotate(${(-ang).toFixed(2)}deg)` });
      const hr = R * u * big * 1.9; const hv = t >= tL && t < tLand ? clamp(seg(t, tL, tL + 0.3)) * (1 - seg(t, tLand - 0.4, tLand)) : 0;
      css(halo, { left: hp.x * u - hr + 'px', top: hp.y * u - hr + 'px', width: 2 * hr + 'px', height: 2 * hr + 'px', opacity: hv * 0.6, display: hv > 0.01 ? '' : 'none' });
      // toggle + empty slot
      tog.update(t);
      const away = t >= tA1 && t < tLand - 0.05;
      css(slot, { opacity: away ? 0.9 : 0, left: (t < resetT ? XS - R : -XS - R) * u + 'px' });
      // slider value (counts down on reset)
      const v = t < tA1 ? 0 : t < tB1 ? clamp((hp.x - XS) / (X1 - XS)) : t < resetT ? 1 : 1 - ease('wipe')(seg(t, resetT, resetT + 0.6));
      css(sfill, { width: (X1 - X0) * v * u + 'px' }); setText(tip, `${Math.round(v * 100)}%`);
      css(tip, { left: (X0 + (X1 - X0) * v) * u + 'px', top: -78 * u + 'px', transform: 'translateX(-50%)', opacity: t > tA1 - 0.1 ? 1 : 0.4 });
      // cards pop when hit, dismiss on reset
      nt.forEach((n, i) => { const hit = contacts[i + 1][0]; n.update(t < hit - 0.12 || t > resetT + 0.25 + i * 0.08 ? -1 : t - (hit - 0.12)); });
      // keyboard + input
      kb.update(t);
      const typedN = word.filter((_, i) => t >= contacts[4 + i][0]).length;
      setText(inp.querySelector('.v'), t >= resetT + 0.4 ? '' : word.slice(0, typedN).join(''));
      css(inp.querySelector('.c'), { opacity: Math.floor(t * 4) % 2 ? 1 : 0 });
      tst.update(t < tRet + 0.1 || t > resetT + 0.3 ? -1 : t - tRet);
    });
    // keyboard presses come from the hops
    word.forEach((ch, i) => { const k = kb.keys[ch]; const tk = contacts[4 + i][0]; ctx.add((t) => { const pp = pulse(t, tk + 0.03, 0.06); if (pp > 0.01) css(k.k, { transform: `translateY(${pp * 4 * u}px)`, background: C.nightSkeleton }); }); });
    ctx.add((t) => { const k = kb.keys['\n'], pp = pulse(t, tRet + 0.03, 0.07); css(k.k, { transform: `translateY(${pp * 5 * u}px)` }); });
    // sounds: every contact is the instrument
    ctx.cue(tA0, 'click', 'toggle'); ctx.cue(tA1, 'toggle', 'toggle on');
    for (let i = 1; i <= 10; i++) { const q = i / 10; const tq = tA1 + (Math.sqrt(0.09 + 2.8 * q) - 0.3) / 1.4 * (tB1 - tA1); ctx.cue(tq, 'tick', `slider ${i * 10}`); }
    contacts.slice(1, 4).forEach((c, i) => ctx.cue(c[0], 'notify', `card ${i + 1}`));
    word.forEach((_, i) => ctx.cue(contacts[4 + i][0], 'click', 'key'));
    ctx.cue(tRet, 'click', 'return'); ctx.cue(tRet + 0.1, 'success', 'live');
    ctx.cue(tL, 'movement', 'launch + reveal'); ctx.cue(tDive, 'movement', 'dive'); ctx.cue(tLand, 'stamp', 'lands in the slot');
    ctx.marker(tL, 'launch'); ctx.marker(tLand, 'loop seam');
  },
});
