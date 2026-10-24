// Kinetic titles for the motion engine (in addition to the IS Spec titles: chapter, hook, endcard).
// Backgrounds: 'accent' | 'night' | 'paper', or transparent: true to lay over footage.
import { defineScene } from '../scene.js';
import { h, css, setText, textWidth } from '../dom.js';
import { T, beats, track, vis, seg, clamp, lerp, spr, ease, ep, typed } from '../engine.js';
import { ts } from '../ui.js';
import { kline, maskRise, blurIn, slam, handwrite, highlight, rotator, outlineWall, fstyle, caseOf, decode, morphAxes } from '../type.js';
import { glyphRow, stamp, flood } from '../fx.js';
import { col } from '../stage.js';

const C = T.color;
const ink = (bg) => (bg === 'paper' || bg === 'accent' ? C.ink : '#FFFFFF');
const fit = (S, s, font, max, frac = 0.84, w = 400) => { const fam = { display: '"IS display"', ui: '"IS ui"', note: '"IS note"' }[font]; let z = max; while (z > 24 && textWidth(caseOf(font, s), `${w} ${z * S.u}px ${fam}`) > S.W * frac) z -= 3; return z; };
const bgOf = (p) => (p.transparent ? null : p.bg === 'accent' ? 'accent' : p.bg === 'paper' ? C.paper : C.night);
const themeOf = (p) => (p.bg === 'paper' ? 'paper' : 'night');
const titleScene = (def) => defineScene({ formats: ['yt', 'reel', 'square'], kind: 'title', ...def, build(ctx) { if (!ctx.p.transparent) { ctx.S.root.style.background = col(bgOf(ctx.p), ctx.S.accent); } return def.build(ctx); } });

export const tSlam = titleScene({
  name: 't-slam', title: 'Brand slam', theme: 'night',
  description: 'A mono kicker decodes, the name rises letter by letter on sixteenth notes, a full stop stamps, a handwritten line writes on underneath.',
  defaults: { format: 'yt', bg: 'accent', bpm: 128, kicker: 'Introducing — 2026', text: 'Signal', dot: true, human: 'made for creators', glyphs: false, end: 3.2 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const W = S.W, H = S.H; const B = beats(p.bpm); const c = ink(p.bg);
    const size = fit(S, p.text + '.', 'display', ctx.reel ? 230 : 260, ctx.reel ? 0.86 : 0.74);
    const cy = H * 0.5;
    const kick = h('div', { style: { position: 'absolute', left: W / 2 + 'px', top: cy - size * u * 0.62 + 'px', transform: 'translate(-50%,-100%)', ...ts(S, 24, { mono: true, color: c }), letterSpacing: '0.12em' } }); S.front.appendChild(kick);
    const nm = kline(S, S.front, { x: W / 2, y: cy, text: p.text, font: 'display', size, color: c, split: 'chars', mask: true });
    const dot = h('span', { style: { display: p.dot ? 'inline-block' : 'none', width: 0.2 * size * u + 'px', height: 0.2 * size * u + 'px', background: p.bg === 'accent' ? C.ink : S.accent, borderRadius: '50%', marginLeft: 0.06 * size * u + 'px', alignSelf: 'flex-end', marginBottom: 0.02 * size * u + 'px' } }); nm.el.appendChild(dot);
    const hum = h('div', { text: p.human || '', style: { position: 'absolute', left: W / 2 + 'px', top: cy + size * u * 0.55 + 'px', transform: 'translateX(-50%) rotate(-3deg)', ...fstyle(S, 'note', ctx.reel ? 80 : 88, { color: c }) } }); S.front.appendChild(hum);
    const lt = (i) => 0.25 + i * B.sub(1, 16);
    const gr = p.glyphs ? glyphRow(S, S.front, { x: W / 2, y: cy + size * u * 0.55 + 190 * u, size: 44, at: 1.6, color: p.bg === 'accent' ? 'ink' : 'accent' }) : null;
    ctx.add((t) => { decode(kick, caseOf('label', p.kicker), t, 0.05, 0.6); maskRise(nm.units, t, lt(0), B.sub(1, 16), 0.38, 'snap', 1.12); css(dot, { transform: `scale(${Math.max(0, spr(t, lt(nm.letters.length) + 0.05, 'stamp')).toFixed(4)})` }); handwrite(hum, t, lt(nm.letters.length) + 0.35, 0.6); if (gr) gr.update(t); });
    ctx.cue(0.05, 'typing', 'kicker decode', { dur: 0.6 }); ctx.cue(lt(0), 'slam', 'name'); ctx.cue(lt(nm.letters.length) + 0.05, 'stamp', 'dot'); ctx.cue(lt(nm.letters.length) + 0.35, 'appear', 'handwriting');
  },
});

export const tMorph = titleScene({
  name: 't-morph', title: 'Weight / width morph', theme: 'night',
  description: 'The brand face morphs on its axes: thin and condensed with wide tracking → black and expanded (the display cut), then the second word lands in the accent.',
  defaults: { format: 'yt', bg: 'night', text: 'Signal', second: 'Motion', end: 3.4 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const W = S.W, H = S.H; const c = ink(p.bg);
    const size = fit(S, p.text.toUpperCase(), 'ui', ctx.reel ? 200 : 230, ctx.reel ? 0.86 : 0.7, 900);
    const a = kline(S, S.front, { x: W / 2, y: H / 2 - (p.second ? size * u * 0.45 : 0), text: p.text.toUpperCase(), font: 'ui', size, wght: 100, wdth: 62, tracking: 0.3, color: c, split: null });
    const m = morphAxes(a.el, [[0.3, { wght: 900, wdth: 125 }, [7, 0.95]]], { wght: 100, wdth: 62 });
    const tr = track(0.3, [[0.3, -0.01, [7, 0.95]]]);
    let b = null, bm = null;
    if (p.second) { b = kline(S, S.front, { x: W / 2, y: H / 2 + size * u * 0.5, text: p.second.toUpperCase(), font: 'ui', size, wght: 900, wdth: 125, tracking: -0.01, color: S.accent, split: 'chars', mask: true }); bm = b; }
    ctx.add((t) => { m(t); css(a.el, { letterSpacing: tr(t).toFixed(4) + 'em', opacity: clamp(t / 0.25) }); if (bm) maskRise(bm.units, t, 1.5, 0.04, 0.4); });
    ctx.cue(0.3, 'build_up', 'morph', { dur: 0.9 }); if (p.second) ctx.cue(1.5, 'slam', 'second word');
  },
});

export const tDecode = titleScene({
  name: 't-decode', title: 'Signal decode', theme: 'night',
  description: 'Mono kicker and a display title scramble through glyphs and lock left to right like a signal coming in; an accent rule draws under it; corner brackets frame it.',
  defaults: { format: 'yt', bg: 'night', kicker: 'Transmission 04', text: 'New drop', sub: 'Friday · 6 PM', end: 3.2 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const W = S.W, H = S.H; const c = ink(p.bg);
    const size = fit(S, p.text, 'display', ctx.reel ? 190 : 210, 0.82);
    const k = h('div', { style: { position: 'absolute', left: W / 2 + 'px', top: H / 2 - size * u * 0.75 + 'px', transform: 'translate(-50%,-100%)', ...ts(S, 26, { mono: true, color: S.accent }), letterSpacing: '0.16em' } });
    const tt = h('div', { style: { position: 'absolute', left: W / 2 + 'px', top: H / 2 + 'px', transform: 'translate(-50%,-50%)', ...fstyle(S, 'display', size, { color: c }) } });
    const rule = h('div', { style: { position: 'absolute', left: W / 2 + 'px', top: H / 2 + size * u * 0.6 + 'px', height: 6 * u + 'px', width: Math.min(W * 0.8, textWidth(caseOf('display', p.text), `400 ${size * u}px "IS display"`)) + 'px', background: S.accent, transform: 'translateX(-50%)', transformOrigin: '0 50%' } });
    const sub = h('div', { style: { position: 'absolute', left: W / 2 + 'px', top: H / 2 + size * u * 0.6 + 40 * u + 'px', transform: 'translateX(-50%)', ...ts(S, 30, { mono: true, color: c }), letterSpacing: '0.08em' } });
    S.front.append(k, tt, rule, sub);
    const br = h('div', { html: `<svg width="${W}" height="${H}">${[[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => { const x = W / 2 - dx * W * 0.42, y = H / 2 - dy * size * u * 1.25, L = 40 * u; return `<path d="M${x} ${y + dy * L}L${x} ${y}L${x + dx * L} ${y}" stroke="${c}" stroke-opacity=".6" stroke-width="${2.5 * u}" fill="none"/>`; }).join('')}</svg>`, style: { position: 'absolute', left: '0px', top: '0px' } }); S.front.appendChild(br);
    ctx.add((t) => { decode(k, caseOf('label', p.kicker), t, 0.1, 0.5, { seed: 2 }); decode(tt, caseOf('display', p.text), t, 0.35, 0.9, { seed: 7, set: 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789' }); css(rule, { transform: `translateX(-50%) scaleX(${ep(t, 1.2, 1.6, 'wipe')})` }); decode(sub, p.sub, t, 1.4, 0.5, { seed: 4 }); css(br, { opacity: clamp(t / 0.3) }); });
    ctx.cue(0.1, 'typing', 'decode', { dur: 1.2 }); ctx.cue(1.25, 'reveal', 'locked'); ctx.cue(1.2, 'movement', 'rule');
  },
});

export const tHighlight = titleScene({
  name: 't-highlight', title: 'Line + push-in + highlight', theme: 'paper',
  description: 'One short line fades in word by word, the camera pushes in until it spans the frame, the key phrase gets the signal plate. The calm-explainer title.',
  defaults: { format: 'yt', bg: 'paper', text: 'Call the decision maker. Directly.', key: 'Directly.', end: 3.2 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u;
    const el = h('div', { style: { position: 'absolute', left: '0px', top: '0px', transform: 'translate(-50%,-50%)', display: 'flex', whiteSpace: 'pre', ...fstyle(S, 'ui', 30, { wght: 540, color: ink(p.bg), tracking: -0.02 }) } });
    const ki = p.key ? p.text.indexOf(p.key) : -1; const parts = [];
    const pw = (s) => s.split(/(\s+)/).filter(Boolean).forEach((w) => parts.push({ s: w, sp: /^\s+$/.test(w) }));
    if (ki >= 0) { pw(p.text.slice(0, ki)); parts.push({ s: p.key, key: true }); pw(p.text.slice(ki + p.key.length)); } else pw(p.text);
    const units = parts.map((q) => { const sp = h('span', { text: q.s, style: { display: 'inline-block', whiteSpace: 'pre' } }); el.appendChild(sp); return { el: sp, inner: sp, ch: q.s, space: q.sp, key: q.key }; });
    S.world.appendChild(el);
    const z1 = (S.W * (ctx.reel ? 0.84 : 0.74)) / el.offsetWidth;
    const kU = units.find((x) => x.key); const hl = kU ? highlight(S, kU.inner, { at: 1.45, textOn: C.ink }) : null;
    ctx.add((t) => { const z = lerp(1, z1, ease('wipe')(seg(t, 0.55, 1.55))) * (1 + 0.04 * seg(t, 1.55, p.end)); S.cam.set({ zoom: z }); blurIn(units, t, 0.1, 0.07, { dy: 0.25, blur: 10 }); if (hl) hl(t); });
    ctx.cue(0.55, 'movement', 'push in'); if (hl) ctx.cue(1.45, 'appear', 'highlight');
  },
});

export const tRotator = titleScene({
  name: 't-rotator', title: 'Rotating word', theme: 'paper',
  description: 'A sentence with a slot: the word in the slot (on a signal plate) cycles through the list; the line re-flows smoothly as the slot changes width.',
  defaults: { format: 'yt', bg: 'paper', before: 'Make', words: ['reels', 'shorts', 'ads', 'explainers'], after: 'in minutes.', every: 0.75, end: 4.2 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const W = S.W, H = S.H; const c = ink(p.bg);
    const sz = ctx.reel ? 92 : 110;
    const row = h('div', { style: { position: 'absolute', left: W / 2 + 'px', top: H / 2 + 'px', transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', gap: '0.26em', whiteSpace: 'nowrap', flexWrap: ctx.reel ? 'wrap' : 'nowrap', justifyContent: 'center', width: ctx.reel ? W * 0.86 + 'px' : 'auto', rowGap: '0.1em', ...fstyle(S, 'ui', sz, { wght: 760, wdth: 108, color: c, tracking: -0.035 }) } });
    const a = h('span', { text: p.before }); const slot = h('span', { style: { position: 'relative', display: 'inline-block', height: '1.12em' } }); const b = h('span', { text: p.after });
    row.append(a, slot, b); S.front.appendChild(row);
    const times = p.words.slice(1).map((_, i) => 0.6 + (i + 1) * p.every);
    const rot = rotator(S, slot, { x: 0, y: 0, anchor: 'cl', words: p.words, times, font: 'ui', size: sz, wght: 760, wdth: 108, color: p.bg === 'accent' ? C.ink : '#FFFFFF', plate: true, tracking: -0.035 });
    css(rot.el, { position: 'relative', left: '0px', top: '0.56em', width: '100%' });
    const ww = rot.words.map((d) => d.offsetWidth); const sw = track(ww[0], times.map((t0, i) => [t0, ww[i + 1], 'fast']));
    ctx.add((t) => { const v = vis(t, 0.1, null, { lin: 0.35 }); css(row, { opacity: v.o, filter: v.blur > 0.05 ? `blur(${v.blur}px)` : 'none' }); rot.update(t); css(slot, { width: sw(t).toFixed(2) + 'px' }); });
    times.forEach((t0) => ctx.cue(t0, 'tick', 'swap'));
  },
});

export const tWall = titleScene({
  name: 't-wall', title: 'Outline wall + slam', theme: 'night',
  description: 'The word repeated as outlined rows sliding in alternate directions fills the frame; the solid word slams in on a band. The loudest beat in a hype piece.',
  defaults: { format: 'yt', bg: 'night', text: 'Build', end: 2.4 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const W = S.W, H = S.H;
    const wall = outlineWall(S, S.front, { word: p.text, rows: ctx.reel ? 11 : 6, size: ctx.reel ? 150 : 180, speed: 380, color: S.accent });
    const size = fit(S, p.text, 'display', ctx.reel ? 230 : 300, 0.86);
    const band = h('div', { style: { position: 'absolute', left: '0px', top: H / 2 - size * u * 0.62 + 'px', width: W + 'px', height: size * u * 1.24 + 'px', background: col(bgOf(p) || C.night, S.accent) } }); S.front.appendChild(band);
    const k = kline(S, S.front, { x: W / 2, y: H / 2, text: p.text, font: 'display', size, color: S.accent, split: null });
    ctx.add((t) => { wall.update(t); css(wall.el, { opacity: String(0.85 * clamp(t / 0.2)) }); css(band, { transform: `scaleY(${ep(t, 0.15, 0.4, 'snap')})` }); slam(k.el, t, 0.2, { from: 1.8, rot: -6, base: 'translate(-50%,-50%)' }); });
    ctx.cue(0.2, 'slam', 'word');
  },
});

export const tStack = titleScene({
  name: 't-stack', title: 'Stacked kinetic lines', theme: 'paper',
  description: 'Three or four short lines stack up, each sliding out of its own mask from alternating sides on the beat; one line sits on a signal plate. Built for Reels.',
  defaults: { format: 'reel', bg: 'paper', lines: ['Stop', 'editing', 'by hand.'], plate: 1, bpm: 120, end: 3.0 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const W = S.W, H = S.H; const B = beats(p.bpm); const c = ink(p.bg);
    const n = p.lines.length;
    const size = Math.min(...p.lines.map((l) => fit(S, l, 'display', ctx.reel ? 200 : 170, 0.84)));
    const lh = size * u * 0.98, y0 = H / 2 - ((n - 1) * lh) / 2;
    const ls = p.lines.map((l, i) => {
      const y = y0 + i * lh;
      const plate = i === p.plate ? h('div', { style: { position: 'absolute', left: '0px', top: y - lh * 0.5 + 'px', width: W + 'px', height: lh + 'px', background: S.accent, transformOrigin: i % 2 ? '100% 50%' : '0 50%' } }) : null;
      if (plate) S.front.appendChild(plate);
      const k = kline(S, S.front, { x: W / 2, y, text: l, font: 'display', size, color: i === p.plate ? C.ink : c, split: null, mask: true });
      return { k, plate, t0: 0.15 + i * B.spb, dir: i % 2 ? 1 : -1 };
    });
    ctx.add((t) => ls.forEach(({ k, plate, t0, dir }) => { const q = ease('snap')(seg(t, t0, t0 + 0.42)); css(k.units[0].inner, { transform: `translate(${((1 - q) * dir * 60).toFixed(2)}%,${((1 - q) * 30).toFixed(2)}%)` }); if (plate) css(plate, { transform: `scaleX(${ep(t, t0 - 0.12, t0 + 0.2, 'wipe')})` }); }));
    ls.forEach(({ t0 }) => ctx.cue(t0, 'slam', 'line'));
  },
});

export const tCountdown = titleScene({
  name: 't-countdown', title: 'Countdown 3 · 2 · 1', theme: 'night',
  description: 'Numbers slam on each beat with a tick, rotating in from alternating sides, a 2-frame flash, then the word lands.',
  defaults: { format: 'yt', bg: 'night', from: 3, word: 'Go', bpm: 100, end: 3.0 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const W = S.W, H = S.H; const B = beats(p.bpm); const c = ink(p.bg);
    const items = [...Array.from({ length: p.from }, (_, i) => String(p.from - i)), p.word];
    const size = ctx.reel ? 420 : 460;
    const els = items.map((s, i) => { const k = kline(S, S.front, { x: W / 2, y: H / 2, text: s, font: 'display', size: i === items.length - 1 ? fit(S, s, 'display', size * 0.7, 0.8) : size, color: i === items.length - 1 ? S.accent : c, split: null }); return { k, t0: 0.15 + i * B.spb, t1: 0.15 + (i + 1) * B.spb }; });
    const fl = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', background: '#FFFFFF' } }); S.front.appendChild(fl);
    const last = els[els.length - 1].t0;
    ctx.add((t) => { els.forEach(({ k, t0, t1 }, i) => { const on = t >= t0 && (i === els.length - 1 || t < t1); css(k.el, { display: on ? 'flex' : 'none' }); if (on) slam(k.el, t, t0, { from: 1.6, rot: i % 2 ? 8 : -8, base: 'translate(-50%,-50%)' }); }); css(fl, { display: t >= last && t < last + 2 / 30 ? '' : 'none' }); });
    els.forEach(({ t0 }, i) => ctx.cue(t0, i === els.length - 1 ? 'reveal' : 'tick', 'count'));
  },
});

export const TITLES = [tSlam, tMorph, tDecode, tHighlight, tRotator, tWall, tStack, tCountdown];
