// Motion B-roll: one shape that never cuts, timed to the speaker's words. Full-frame cutaway (paper canvas)
// or transparent panel (transparent: true, center: [x, y] in the empty part of the frame → ProRes 4444 .mov).
// Every time in `at` is clip-local seconds (word time − clip in-point). Pattern adapted from motion-broll (MIT).
import { defineScene } from '../scene.js';
import { morph } from '../morph.js';
import { h, css, icon, setText } from '../dom.js';
import { T, track, vis, clamp, spr, seg, ease, typed, caretOn, crossTimes, path as cpath, pulse, eio, lerp, fmtNum } from '../engine.js';
import { ts, segmented, toggle, steps as stepsUI, skeleton, slider as sliderUI, list, fileTile } from '../ui.js';
import { barChart, lineChart } from '../charts.js';

/** zoom so a w×h state fills the frame without overflowing (pref = the zoom you'd use at 16:9) */
export const fitCam = (S, w, hh, pref) => Math.min(pref, (0.86 * S.W) / w, (0.62 * S.H) / hh);
const P = (S, n) => n * S.u;
const common = { transparent: false, center: null, accent: null };
const centerOf = (ctx) => ctx.p.center || [ctx.W / 2, ctx.H / 2];
/** absolutely positioned HTML snippet inside a layer */
const put = (L, html, style = {}) => { const d = h('div', { html, style: { position: 'absolute', ...style } }); L.appendChild(d); return d; };
const txt = (S, L, s, x, y, size, o = {}, extra = {}) => { const d = h('div', { text: s, style: { position: 'absolute', left: x + 'px', top: y + 'px', ...ts(S, size, o), ...extra } }); L.appendChild(d); return d; };

/* ───────── mb-launch: pill → card → option picker ───────── */
export const mbLaunch = defineScene({
  name: 'mb-launch', kind: 'broll', title: 'Launch: pill → card → picker',
  description: 'A dark pill with the name and a New badge morphs into a white card about it, then into a segmented picker the cursor clicks through.',
  formats: ['yt', 'reel', 'square'],
  defaults: {
    ...common, format: 'yt', name: 'Product 2', badge: 'New', icon: 'sparkles',
    card: { title: 'Build anything', sub: 'From one prompt to a live app', icon: 'rocket' },
    options: ['Low', 'Medium', 'High', 'Max'], picks: [1, 2, 3],
    at: { badge: 0.6, card: 2.1, picker: 4.0, clicks: [4.5, 4.9, 5.35] }, end: 6.4,
  },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const A = p.at; const u = S.u;
    const SW = 230, segW = SW * p.options.length + 40;
    const st = {
      pill: { w: 480, h: 120, r: 60, bg: 'control', cam: fitCam(S, 480, 120, 1.9) },
      card: { w: 860, h: 300, r: 44, bg: 'surface', cam: fitCam(S, 860, 300, 1.45) },
      seg: { w: segW, h: 124, r: 62, bg: 'surface', cam: fitCam(S, segW, 124, 1.5) },
    };
    const m = ctx.add(morph(S, { states: st, start: 'pill', seq: [[A.card, 'card'], [A.picker, 'seg']], intro: 0.1, center: centerOf(ctx) }));
    ctx.cue(0.1, 'appear', 'pill pops in'); ctx.cue(A.badge, 'stamp', 'badge'); ctx.cue(A.card, 'movement', 'morph to card'); ctx.cue(A.picker, 'movement', 'morph to picker');
    const Lp = m.layer({ tout: A.card });
    const row = h('div', { style: { position: 'absolute', left: '0px', top: '0px', transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', gap: 16 * u + 'px', ...ts(S, 46, { w: 'semibold', color: 'var(--ui-onControl)', track: -0.02 }) } });
    row.innerHTML = `${icon(p.icon, 40 * u, 'var(--accent)')}<span>${p.name}</span>`;
    const badge = h('span', { text: p.badge, style: { display: 'inline-block', background: 'var(--accent)', ...ts(S, 22, { w: 'semibold', color: '#FFFFFF' }), borderRadius: '999px', padding: `${6 * u}px ${14 * u}px` } });
    if (p.badge) row.appendChild(badge); Lp.appendChild(row);
    const bk = track(0, [[A.badge, 1, 'pop']]);
    ctx.add((t) => css(badge, { transform: `scale(${Math.max(0, bk(t)).toFixed(4)})`, opacity: clamp(bk(t) * 1.5) }));
    const Lc = m.layer({ tin: A.card, tout: A.picker });
    put(Lc, icon(p.card.icon, 120 * u, '#FFFFFF', 4.2 * u), { left: -400 * u + 'px', top: -108 * u + 'px', width: 216 * u + 'px', height: 216 * u + 'px', background: 'var(--accent)', borderRadius: 40 * u + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center' });
    txt(S, Lc, p.card.title, -150 * u, -70 * u, 56, { w: 'semibold', track: -0.025 });
    txt(S, Lc, p.card.sub, -148 * u, 6 * u, 26, { color: 'var(--ui-textMuted)' });
    const Ls = m.layer({ tin: A.picker });
    ctx.add(segmented(S, Ls, { items: p.options, segW: SW, h: 100, start: 0, index: A.clicks.map((t, i) => [t, p.picks[i] ?? i]), size: 30 }));
    const optX = (i) => -segW / 2 + 20 + SW * i + SW / 2;
    const keys = [[0, 520, 300], [A.picker + 0.1, 520, 300]];
    A.clicks.forEach((c, i) => { const x = optX(p.picks[i] ?? i); keys.push([c - 0.22, x, 26], [c + 0.08, x, 26]); });
    keys.push([p.end, optX(p.picks[p.picks.length - 1]) + 130, 140]);
    ctx.cursor({ keys, clicks: A.clicks });
  },
});

/* ───────── mb-terminal: folder → terminal (typing) → agent steps ───────── */
export const mbTerminal = defineScene({
  name: 'mb-terminal', kind: 'broll', title: 'Folder → terminal → agent steps',
  description: 'A folder is double-clicked open into a terminal, a prompt types out, the agent starts, the shape becomes a checklist that ticks off on words.',
  formats: ['yt', 'reel', 'square'],
  defaults: {
    ...common, format: 'yt', folder: 'yoga-app', title: 'yoga-app — agent', prompt: 'Build a booking app for my yoga studio with class sign-ups.',
    status: 'Working…', steps: ['Plan the app', 'Set up the database', 'Build the class schedule', 'Test sign-ups'],
    at: { open: 1.9, type: 2.7, run: 5.4, steps: 7.0, ticks: [7.6, 8.3, 9.0, 9.7] }, end: 11.0,
  },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const A = p.at; const u = S.u;
    const st = {
      folder: { w: 300, h: 220, r: 26, bg: 'accent', cam: fitCam(S, 300, 220, 1.6) },
      term: { w: 1060, h: 560, r: 26, bg: 'surface', cam: fitCam(S, 1060, 560, 1.12), border: true },
      steps: { w: 900, h: 140 + 76 * p.steps.length, r: 28, bg: 'surface', cam: fitCam(S, 900, 140 + 76 * p.steps.length, 1.15) },
    };
    const m = ctx.add(morph(S, { states: st, start: 'folder', seq: [[A.open, 'term'], [A.steps, 'steps']], intro: 0.2, center: centerOf(ctx), press: [A.open - 0.16, A.open - 0.02] }));
    ctx.cue(0.2, 'appear', 'folder'); ctx.cue(A.open, 'movement', 'open terminal'); ctx.cue(A.type, 'typing', 'prompt', { dur: p.prompt.length / T.motion.typing.fastCps }); ctx.cue(A.steps, 'movement', 'to checklist');
    // folder: flap + tab (world elements follow the shape) + name typed under it
    const Lf = m.layer({ tin: 0.2, tout: A.open, o: { din: 0 } });
    put(Lf, '', { left: -150 * u + 'px', top: -60 * u + 'px', width: 300 * u + 'px', height: 170 * u + 'px', borderRadius: `0 0 ${26 * u}px ${26 * u}px`, background: 'rgba(255,255,255,.16)' });
    const tab = h('div', { style: { position: 'absolute', width: 130 * u + 'px', height: 44 * u + 'px', borderRadius: 14 * u + 'px', background: T.color.signalDeep } });
    const fname = h('div', { style: { position: 'absolute', width: 400 * u + 'px', textAlign: 'center', ...ts(S, 30, { mono: true, color: 'var(--ui-text)' }) } });
    S.world.insertBefore(tab, m.el); S.world.appendChild(fname);
    ctx.add((t) => {
      const v = vis(t, 0.2, A.open, { din: 0 });
      css(tab, { display: v.o < 0.01 ? 'none' : '', opacity: v.o, left: -138 * u + 'px', top: -142 * u + 'px' });
      const nv = vis(t, 0.7, A.open, { din: 0 }); const n = typed(t, 0.8, p.folder.length, 18);
      css(fname, { display: nv.o < 0.01 ? 'none' : '', opacity: nv.o, left: -200 * u + 'px', top: 136 * u + 'px' }); setText(fname, p.folder.slice(0, n) || ' ');
    });
    // terminal
    const Lt = m.layer({ tin: A.open, tout: A.steps, anchor: 't' });
    [0, 1, 2].forEach((i) => put(Lt, '', { left: -500 * u + i * 24 * u + 'px', top: 24 * u + 'px', width: 14 * u + 'px', height: 14 * u + 'px', borderRadius: '50%', background: 'var(--ui-skeleton)' }));
    txt(S, Lt, p.title, -200 * u, 16 * u, 19, { mono: true, color: 'var(--ui-textMuted)' }, { width: 400 * u + 'px', textAlign: 'center' });
    put(Lt, '', { left: -530 * u + 'px', top: 58 * u + 'px', width: 1060 * u + 'px', height: 1.5 * u + 'px', background: 'var(--ui-border)' });
    put(Lt, `<span style="color:var(--accent)">✻</span> Welcome back`, { left: -470 * u + 'px', top: 92 * u + 'px', ...ts(S, 26, { w: 'medium' }), display: 'flex', gap: 12 * u + 'px' });
    const line = h('div', { style: { position: 'absolute', left: -470 * u + 'px', top: 160 * u + 'px', width: 940 * u + 'px', ...ts(S, 28, { mono: true, wrap: true, lh: 1.45 }) } });
    const typedS = h('span'); const car = h('span', { style: { display: 'inline-block', width: 13 * u + 'px', height: 30 * u + 'px', verticalAlign: '-5px', marginLeft: 2 * u + 'px', background: 'var(--ui-text)' } });
    line.append(h('span', { text: '› ', style: { color: 'var(--accent)' } }), typedS, car); Lt.appendChild(line);
    const run = h('div', { style: { position: 'absolute', left: -470 * u + 'px', top: 400 * u + 'px', display: 'flex', alignItems: 'center', gap: 14 * u + 'px', ...ts(S, 27, { w: 'medium' }) } });
    const star = h('span', { text: '✻', style: { color: 'var(--accent)', display: 'inline-block', fontSize: 32 * u + 'px' } }); const el2 = h('span', { style: ts(S, 24, { mono: true, color: 'var(--ui-textMuted)' }) });
    run.append(star, h('span', { text: p.status }), el2); Lt.appendChild(run);
    const cps = T.motion.typing.fastCps, tEnd = A.type + p.prompt.length / cps;
    ctx.add((t) => {
      setText(typedS, p.prompt.slice(0, typed(t, A.type, p.prompt.length, cps)));
      css(car, { opacity: t < A.run && caretOn(t, A.type, tEnd) ? 1 : 0 });
      const v = vis(t, A.run, null, { din: 0, lin: 0.2 }); css(run, { opacity: v.o, filter: v.blur > 0.05 ? `blur(${v.blur}px)` : 'none' });
      css(star, { transform: `rotate(${((t * 240) % 360).toFixed(1)}deg)` }); setText(el2, '0:0' + Math.max(0, Math.floor((t - A.run) * 2)) % 10);
    });
    // checklist
    const Ls = m.layer({ tin: A.steps, anchor: 't' });
    txt(S, Ls, p.folder, -390 * u, 44 * u, 30, { mono: true, color: 'var(--ui-textMuted)' });
    ctx.add(stepsUI(S, Ls, { x: -390 * u, y: 110 * u, w: 780, gap: 76, size: 30, items: p.steps.map((s, i) => ({ label: s, t0: A.steps + 0.25 + i * 0.12, t1: A.ticks[i] ?? A.steps + 1 + i * 0.6 })) }));
    (A.ticks || []).forEach((t, i) => ctx.cue(t, 'success', `step ${i + 1} done`));
    ctx.cursor({ keys: [[0, 330, 280], [1.2, 330, 280], [A.open - 0.45, 40, 30], [A.open + 0.3, 40, 30], [A.type, 420, 340], [p.end, 420, 340]], clicks: [A.open - 0.16, A.open - 0.02], show: [0, A.steps] });
  },
});

/* ───────── mb-doc: notes → document → file chip dragged into a session ───────── */
export const mbDoc = defineScene({
  name: 'mb-doc', kind: 'broll', title: 'Notes → document → drag into a session',
  description: 'A notes card fills section by section on words, becomes a document that writes itself, shrinks to a file chip the cursor drags into a session pill.',
  formats: ['yt', 'reel', 'square'],
  defaults: {
    ...common, format: 'yt', title: 'Build notes', doc: 'master-prompt.md', session: 'New session', tag: 'Low',
    sections: [{ icon: 'check', label: 'Liked' }, { icon: 'x', label: "Didn't like" }, { icon: 'plus', label: 'Missing', accent: true }],
    at: { sections: [1.6, 2.1, 3.4], doc: 5.0, chip: 6.8, drop: 7.8, tag: 8.3 }, end: 10.0,
  },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const A = p.at; const u = S.u;
    const st = {
      notes: { w: 780, h: 200 + 138 * p.sections.length, r: 36, bg: 'surface', cam: fitCam(S, 780, 200 + 138 * p.sections.length, 1.3) },
      doc: { w: 600, h: 720, r: 28, bg: 'surface', cam: fitCam(S, 600, 720, 1.2) },
      chip: { w: 440, h: 96, r: 48, bg: 'control', cam: fitCam(S, 440, 96, 1.5) },
      sess: { w: 760, h: 120, r: 60, bg: 'control', cam: fitCam(S, 760, 120, 1.75) },
    };
    const drag0 = A.chip + 0.1, drag1 = A.drop;
    const fx = track(0, [[A.chip + 0.05, 180, 'soft'], [A.drop - 0.2, 360, 'soft']]);
    const keys = [[0, 760, 460], [1.2, 760, 460], [1.9, 330, 250], [A.chip - 0.5, 330, 250], [A.chip, 0, 30], [drag0, 0, 30], [drag1, 360, 20], [drag1 + 0.3, 360, 20], [p.end, 470, 170]];
    const cur = cpath(keys);
    const m = ctx.add(morph(S, {
      states: st, start: 'notes', seq: [[A.doc, 'doc'], [A.chip, 'chip'], [A.drop, 'sess']], intro: 0.15, center: centerOf(ctx),
      geom: (t, g) => { g.fx = fx(t); if (t >= A.chip) { const c = t < drag1 ? cur(t) : cur(drag1); g.cx = c.x; g.cy = c.y - 30; if (t >= drag1) { g.cx = 360; g.cy = lerp(c.y - 30, 0, spr(t, drag1, [15, 0.84])); } } return g; },
    }));
    ctx.cue(0.15, 'appear', 'notes card'); ctx.cue(A.doc, 'movement', 'to document'); ctx.cue(A.chip, 'movement', 'to file chip'); ctx.cue(A.drop, 'reveal', 'dropped in'); ctx.cue(A.tag, 'stamp', 'tag');
    // ghost drop slot in the world
    const ghost = h('div', { text: p.session, style: { position: 'absolute', left: 10 * u + 'px', top: -60 * u + 'px', width: 700 * u + 'px', height: 120 * u + 'px', borderRadius: 60 * u + 'px', outline: `${3 * u}px dashed var(--ui-border)`, outlineOffset: -3 * u + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center', ...ts(S, 34, { w: 'medium', color: 'var(--ui-textMuted)' }) } });
    S.world.insertBefore(ghost, m.el);
    ctx.add((t) => { const v = vis(t, A.chip + 0.05, A.drop, { din: 0, lin: 0.2, lout: 0.15 }); css(ghost, { display: v.o < 0.01 ? 'none' : 'flex', opacity: v.o, transform: `scale(${v.s})` }); });
    // notes
    const Ln = m.layer({ tin: 0.15, tout: A.doc, anchor: 't', o: { din: 0.05 } });
    put(Ln, `${icon('pen-line', 32 * u, 'var(--ui-text)')}<span>${p.title}</span>`, { left: -330 * u + 'px', top: 40 * u + 'px', display: 'flex', alignItems: 'center', gap: 14 * u + 'px', ...ts(S, 34, { w: 'semibold', track: -0.02 }) });
    const secs = p.sections.map((s, i) => {
      const d = h('div', { style: { position: 'absolute', left: -330 * u + 'px', top: (124 + i * 138) * u + 'px', width: 660 * u + 'px', height: 120 * u + 'px' } });
      d.appendChild(h('div', { html: icon(s.icon, 24 * u, '#FFFFFF', 3 * u), style: { position: 'absolute', left: '0px', top: '0px', width: 40 * u + 'px', height: 40 * u + 'px', borderRadius: 12 * u + 'px', background: s.accent ? 'var(--accent)' : 'var(--ui-control)', display: 'flex', alignItems: 'center', justifyContent: 'center' } }));
      d.appendChild(h('div', { text: s.label, style: { position: 'absolute', left: 58 * u + 'px', top: 4 * u + 'px', ...ts(S, 27, { w: 'semibold' }) } }));
      const sk = skeleton(S, d, { x: 58 * u, y: 56 * u, widths: [520 - i * 40, 380 - i * 30], gap: 28, h: 14, at: (A.sections[i] ?? 0) + 0.15, stagger: 0.18, dur: 0.45 });
      Ln.appendChild(d); return { d, sk, t: A.sections[i] ?? 0 };
    });
    secs.forEach((s, i) => ctx.cue(s.t, 'appear', `section ${i + 1}`));
    ctx.add((t) => secs.forEach(({ d, sk, t: t0 }) => { const v = vis(t, t0, null, { din: 0, lin: 0.22 }); css(d, { opacity: v.o, filter: v.blur > 0.05 ? `blur(${v.blur}px)` : 'none', transform: `translateY(${(1 - v.a) * 12 * u}px)` }); sk.update(t); }));
    // doc
    const Ld = m.layer({ tin: A.doc, tout: A.chip, anchor: 't' });
    put(Ld, `${icon('file-text', 30 * u, 'var(--ui-text)')}<span>${p.doc}</span>`, { left: -230 * u + 'px', top: 38 * u + 'px', display: 'flex', alignItems: 'center', gap: 12 * u + 'px', ...ts(S, 25, { mono: true }) });
    put(Ld, '', { left: -300 * u + 'px', top: 96 * u + 'px', width: 600 * u + 'px', height: 1.5 * u + 'px', background: 'var(--ui-border)' });
    const LW = [430, 380, 440, 300, 0, 260, 420, 400, 350, 0, 300, 410, 240];
    const dl = LW.map((w, i) => put(Ld, '', { left: -230 * u + 'px', top: (130 + i * 42) * u + 'px', height: (i === 0 ? 20 : 12) * u + 'px', borderRadius: 6 * u + 'px', background: i === 0 ? 'var(--accent)' : 'var(--ui-skeleton)' }));
    ctx.add((t) => LW.forEach((w, i) => css(dl[i], { width: w * u * eio((t - A.doc - 0.25 - 0.075 * i) / 0.3) + 'px' })));
    // chip
    const Lc = m.layer({ tin: A.chip, tout: A.drop, o: { din: 0.04 } });
    put(Lc, `${icon('file-text', 30 * u, 'var(--ui-onControl)')}<span>${p.doc}</span>`, { left: '0px', top: '0px', transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', gap: 12 * u + 'px', ...ts(S, 26, { mono: true, color: 'var(--ui-onControl)' }) });
    // session pill
    const Lsx = m.layer({ tin: A.drop });
    const row = put(Lsx, '', { left: '0px', top: '0px', transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', gap: 18 * u + 'px', ...ts(S, 40, { w: 'semibold', color: 'var(--ui-onControl)', track: -0.02 }) });
    row.innerHTML = `${icon('sparkles', 38 * u, 'var(--accent)')}<span>${p.session}</span>`;
    const tag = h('span', { text: p.tag, style: { ...ts(S, 26, { w: 'semibold', color: '#FFFFFF' }), borderRadius: '999px', padding: `${6 * u}px ${16 * u}px` } });
    row.appendChild(tag); row.appendChild(h('span', { text: '+ ' + p.doc, style: ts(S, 22, { mono: true, color: 'var(--ui-textMuted)' }) }));
    const on = track(0, [[A.tag, 1, [18, 0.8]]]);
    ctx.add((t) => { const k = clamp(on(t)); css(tag, { background: `rgba(${hexA(S.accent)},${k})`, boxShadow: `inset 0 0 0 ${2 * u}px rgba(255,255,255,${0.35 * (1 - k)})`, transform: `scale(${1 + 0.12 * Math.sin(Math.PI * clamp((t - A.tag) / 0.3))})` }); });
    ctx.cursor({ keys, drags: [[drag0, drag1]], clicks: [] });
  },
});
const hexA = (hx) => [1, 3, 5].map((i) => parseInt(hx.slice(i, i + 2), 16)).join(',');

/* ───────── mb-slider: drag a value, things build as it crosses thresholds ───────── */
export const mbSlider = defineScene({
  name: 'mb-slider', kind: 'broll', title: 'Slider builds a result',
  description: 'A card with a slider: the cursor drags it from low to high and a row of tiles lights up as the value crosses each threshold, with a live tooltip.',
  formats: ['yt', 'reel', 'square'],
  defaults: { ...common, format: 'yt', title: 'Same prompt · different effort', low: 'Low', high: 'Max', tiles: ['Plan', 'Code', 'Test', 'Polish', 'Ship'], icons: ['list-checks', 'code', 'shield-check', 'wand-sparkles', 'rocket'], unit: '%', at: { grab: 1.6, release: 3.0 }, end: 3.9 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const A = p.at; const u = S.u;
    const m = ctx.add(morph(S, { states: { card: { w: 1000, h: 600, r: 40, bg: 'surface', cam: fitCam(S, 1000, 600, 1.35) } }, start: 'card', seq: [], intro: 0.05, center: centerOf(ctx) }));
    ctx.cue(0.05, 'appear', 'card');
    const L = m.layer({ tin: 0.05, anchor: 't', o: { din: 0.05 } });
    txt(S, L, p.title, -450 * u, 40 * u, 26, { color: 'var(--ui-textMuted)' });
    const KY = 200; const KX = [[0, 760, 470], [0.9, 760, 470], [A.grab - 0.25, -396, KY], [A.grab, -396, KY], [A.release - 0.1, 400, KY], [A.release + 0.3, 400, KY], [p.end, 470, 330]];
    const cur = cpath(KX);
    const val = (t) => (t < A.grab ? 0 : clamp((Math.min(cur(t).x, cur(A.release).x) + 400) / 800));
    const n = p.tiles.length, tw = 150, gap = 26, tot = n * tw + (n - 1) * gap;
    const th = crossTimes(val, 0, p.end, p.tiles.map((_, i) => (i + 0.5) / n));
    const tiles = p.tiles.map((s, i) => {
      const d = h('div', { style: { position: 'absolute', left: (-tot / 2 + i * (tw + gap)) * u + 'px', top: 120 * u + 'px', width: tw * u + 'px', height: 190 * u + 'px', borderRadius: 24 * u + 'px', background: 'var(--ui-sunken)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 * u + 'px' } });
      const ic = h('div', { html: icon(p.icons[i] || 'circle', 54 * u, 'currentColor'), style: { color: 'var(--ui-textMuted)' } });
      const lb = h('div', { text: s, style: ts(S, 22, { w: 'semibold', color: 'var(--ui-textMuted)' }) });
      d.append(ic, lb); L.appendChild(d); return { d, ic, lb, t: th[i] };
    });
    th.forEach((t, i) => isFinite(t) && ctx.cue(t, 'tick', `tile ${i + 1}`));
    ctx.add((t) => tiles.forEach(({ d, ic, lb, t: t0 }) => { const k = spr(t, t0, 'stamp'), on = t >= t0; css(d, { background: on ? 'var(--ui-control)' : 'var(--ui-sunken)', transform: `scale(${on ? 0.9 + 0.1 * k : 1})` }); css(ic, { color: on ? 'var(--accent)' : 'var(--ui-textMuted)' }); css(lb, { color: on ? 'var(--ui-onControl)' : 'var(--ui-textMuted)' }); }));
    const sl = ctx.add(sliderUI(S, L, { x: 0, y: 410 * u, w: 800, anchor: 'tc', value: val, tooltip: (v) => Math.round(v * 100) + p.unit, accent: true }));
    txt(S, L, p.low, -400 * u, 535 * u, 24, { w: 'semibold' }); txt(S, L, p.high, 300 * u, 535 * u, 24, { w: 'semibold' }, { width: 100 * u + 'px', textAlign: 'right' });
    void sl;
    ctx.cue(A.grab, 'click', 'grab'); ctx.cue(A.grab + 0.05, 'build_up', 'drag', { dur: A.release - A.grab });
    ctx.cursor({ keys: KX, drags: [[A.grab, A.release]], hand: [[A.grab - 0.1, A.release + 0.05]] });
  },
});

/* ───────── mb-versus: A vs B with relative bars ───────── */
export const mbVersus = defineScene({
  name: 'mb-versus', kind: 'broll', title: 'Side-by-side comparison',
  description: 'A pill names the setup, then morphs into an A vs B card: each side gets a relative bar on its word, the badge flips to the verdict.',
  formats: ['yt', 'reel', 'square'],
  defaults: { ...common, format: 'yt', intro: 'Same task, two ways', a: { name: 'Low', sub: '+ master prompt', value: 0.86 }, b: { name: 'Max', sub: 'default prompt', value: 0.86 }, metric: 'Result', verdict: '=', at: { vs: 1.0, a: 2.2, b: 1.6, verdict: 4.4 }, end: 5.6 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const A = p.at; const u = S.u; const tall = ctx.reel;
    const vsW = tall ? 760 : 1240, vsH = tall ? 820 : 330;
    const m = ctx.add(morph(S, { states: { pill: { w: 620, h: 120, r: 60, bg: 'control', cam: fitCam(S, 620, 120, 1.8) }, vs: { w: vsW, h: vsH, r: 40, bg: 'surface', cam: fitCam(S, vsW, vsH, 1.2) } }, start: 'pill', seq: [[A.vs, 'vs']], intro: 0.05, center: centerOf(ctx) }));
    ctx.cue(0.05, 'appear', 'pill'); ctx.cue(A.vs, 'movement', 'to versus'); ctx.cue(A.verdict, 'stamp', 'verdict');
    const Lp = m.layer({ tout: A.vs }); put(Lp, `<span>${p.intro}</span>`, { left: '0px', top: '0px', transform: 'translate(-50%,-50%)', ...ts(S, 38, { w: 'semibold', color: 'var(--ui-onControl)', track: -0.02 }) });
    const Lv = m.layer({ tin: A.vs, anchor: 't' });
    const sides = [p.a, p.b].map((s, i) => {
      const x = tall ? -300 : i === 0 ? -540 : 100, y = tall ? (i === 0 ? 70 : 470) : 80;
      txt(S, Lv, s.name, x * u, y * u, 52, { w: 'semibold', track: -0.025 });
      txt(S, Lv, s.sub, x * u, (y + 66) * u, 24, { color: 'var(--ui-textMuted)' });
      txt(S, Lv, p.metric, x * u, (y + 128) * u, 20, { label: true, color: 'var(--ui-textMuted)' });
      put(Lv, '', { left: x * u + 'px', top: (y + 168) * u + 'px', width: 440 * u + 'px', height: 18 * u + 'px', borderRadius: 9 * u + 'px', background: 'var(--ui-sunken)' });
      const fill = put(Lv, '', { left: x * u + 'px', top: (y + 168) * u + 'px', height: 18 * u + 'px', borderRadius: 9 * u + 'px', background: i === 0 ? 'var(--accent)' : 'var(--ui-control)' });
      return { fill, tr: track(0, [[i === 0 ? A.a : A.b, s.value, [11, 0.9]]]) };
    });
    ctx.cue(A.a, 'appear', 'A bar'); ctx.cue(A.b, 'appear', 'B bar');
    const vs = put(Lv, '', { left: (tall ? -48 : -48) * u + 'px', top: (tall ? 360 : 112) * u + 'px', width: 96 * u + 'px', height: 96 * u + 'px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...ts(S, 34, { w: 'semibold', color: '#FFFFFF' }) });
    const q = track(0, [[A.verdict, 1, [16, 0.7]]]);
    ctx.add((t) => { sides.forEach(({ fill, tr }) => css(fill, { width: 440 * u * Math.max(0, tr(t)) + 'px' })); const k = q(t); css(vs, { background: k > 0.5 ? 'var(--accent)' : 'var(--ui-control)', color: k > 0.5 ? '#FFFFFF' : 'var(--ui-onControl)', transform: `scale(${1 + 0.25 * Math.sin(Math.PI * clamp((t - A.verdict) / 0.35))})` }); setText(vs, t < A.verdict ? 'vs' : p.verdict); });
  },
});

/* ───────── mb-checklist: a card of tasks ticking off on words ───────── */
export const mbChecklist = defineScene({
  name: 'mb-checklist', kind: 'broll', title: 'Checklist ticks off',
  description: 'A titled card where each task appears with a spinner and turns into a check on its word; ends on a confirmation chip.',
  formats: ['yt', 'reel', 'square'],
  defaults: { ...common, format: 'yt', title: 'Launch checklist', items: ['Record the demo', 'Write the captions', 'Pick the music', 'Export for Reels'], at: { items: [0.5, 1.0, 1.5, 2.0], ticks: [1.4, 2.2, 3.0, 3.8], done: 4.6 }, doneLabel: 'Ready to post', end: 6.0 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const A = p.at; const u = S.u;
    const H = 150 + 86 * p.items.length;
    const m = ctx.add(morph(S, { states: { card: { w: 860, h: H, r: 36, bg: 'surface', cam: fitCam(S, 860, H, 1.25) }, done: { w: 620, h: 120, r: 60, bg: 'accent', cam: fitCam(S, 620, 120, 1.8) } }, start: 'card', seq: [[A.done, 'done']], intro: 0.05, center: centerOf(ctx) }));
    ctx.cue(0.05, 'appear', 'card'); ctx.cue(A.done, 'reveal', 'done');
    const L = m.layer({ tin: 0.05, tout: A.done, anchor: 't', o: { din: 0.05 } });
    put(L, `${icon('list-checks', 34 * u, 'var(--ui-text)')}<span>${p.title}</span>`, { left: -370 * u + 'px', top: 44 * u + 'px', display: 'flex', alignItems: 'center', gap: 14 * u + 'px', ...ts(S, 36, { w: 'semibold', track: -0.02 }) });
    ctx.add(stepsUI(S, L, { x: -370 * u, y: 120 * u, w: 740, gap: 86, size: 30, items: p.items.map((s, i) => ({ label: s, t0: A.items[i] ?? 0.5 + i * 0.4, t1: A.ticks[i] ?? 1.4 + i * 0.8 })) }));
    (A.ticks || []).forEach((t, i) => ctx.cue(t, 'success', `tick ${i + 1}`));
    const Ld = m.layer({ tin: A.done });
    put(Ld, `${icon('circle-check', 40 * u, '#FFFFFF')}<span>${p.doneLabel}</span>`, { left: '0px', top: '0px', transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', gap: 16 * u + 'px', ...ts(S, 38, { w: 'semibold', color: '#FFFFFF', track: -0.02 }) });
  },
});

/* ───────── mb-search: type a query, list filters, pick a result ───────── */
export const mbSearch = defineScene({
  name: 'mb-search', kind: 'broll', title: 'Search → filter → pick',
  description: 'A search pill types a query, opens into a results card that filters as it types, the highlight lands on a row and the cursor picks it.',
  formats: ['yt', 'reel', 'square'],
  defaults: { ...common, format: 'yt', query: 'invoice', placeholder: 'Search files…', items: [{ label: 'Invoice — March.pdf', icon: 'receipt', meta: '2.1 MB' }, { label: 'Brand guide.pdf', icon: 'book-open', meta: '8.4 MB' }, { label: 'Invoice — April.pdf', icon: 'receipt', meta: '2.0 MB' }, { label: 'Team photo.jpg', icon: 'image', meta: '4.6 MB' }, { label: 'Roadmap.key', icon: 'presentation', meta: '12 MB' }], pick: 'Invoice — April.pdf', at: { open: 0.7, type: 1.6, click: 4.1 }, end: 5.2 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const A = p.at; const u = S.u;
    const H = 150 + 84 * p.items.length;
    const nF = Math.max(1, p.items.filter((it) => it.label.toLowerCase().includes(p.query.toLowerCase())).length), HF = 160 + 84 * nF;
    const qEnd0 = A.type + p.query.length / 12;
    const m = ctx.add(morph(S, { states: { pill: { w: 760, h: 110, r: 55, bg: 'surface', cam: fitCam(S, 760, 110, 1.6), border: true }, list: { w: 860, h: H, r: 34, bg: 'surface', cam: fitCam(S, 860, H, 1.2), border: true }, filtered: { w: 860, h: HF, r: 34, bg: 'surface', cam: fitCam(S, 860, H, 1.2), border: true } }, start: 'pill', seq: [[A.open, 'list'], [qEnd0 + 0.1, 'filtered']], intro: 0.05, center: centerOf(ctx) }));
    ctx.cue(0.05, 'appear', 'search'); ctx.cue(A.open, 'movement', 'results open'); ctx.cue(A.type, 'typing', 'query', { dur: p.query.length / 12 });
    // search row lives at the top of the shape in both states
    const Lq = m.layer({ anchor: 't', tin: null });
    const row = put(Lq, '', { left: -350 * u + 'px', top: 28 * u + 'px', display: 'flex', alignItems: 'center', gap: 16 * u + 'px', ...ts(S, 34, { w: 'medium' }) });
    row.insertAdjacentHTML('afterbegin', icon('search', 36 * u, 'var(--ui-textMuted)'));
    const q = h('span'); const car = h('span', { style: { display: 'inline-block', width: 3 * u + 'px', height: 38 * u + 'px', background: 'var(--accent)' } }); row.append(q, car);
    const qEnd = A.type + p.query.length / 12;
    const filt = [...p.query].map((_, i) => [A.type + (i + 1) / 12, p.query.slice(0, i + 1)]);
    const pickIdx = () => p.items.filter((it) => it.label.toLowerCase().includes(p.query.toLowerCase())).findIndex((it) => it.label === p.pick);
    const Ll = m.layer({ tin: A.open, anchor: 't' });
    put(Ll, '', { left: -430 * u + 'px', top: 110 * u + 'px', width: 860 * u + 'px', height: 1.5 * u + 'px', background: 'var(--ui-border)' });
    const ls = ctx.add(list(S, Ll, { x: -400 * u, y: 128 * u, w: 800, rowH: 84, items: p.items, at: A.open + 0.1, filter: filt, hi: [[qEnd + 0.4, Math.max(0, pickIdx())]] }));
    void ls;
    ctx.add((t) => { const n = typed(t, A.type, p.query.length, 12); setText(q, n ? p.query.slice(0, n) : ''); if (!n) { setText(q, p.placeholder); css(q, { color: 'var(--ui-textMuted)' }); } else css(q, { color: 'var(--ui-text)' }); css(car, { opacity: t < A.click && caretOn(t, A.type, qEnd) ? 1 : 0 }); });
    const ry = -HF / 2 + 128 + 84 * Math.max(0, pickIdx()) + 42;
    ctx.cursor({ keys: [[0, 520, 300], [A.click - 0.6, 520, 300], [A.click - 0.15, 120, ry], [A.click + 0.3, 120, ry], [p.end, 200, ry + 60]], clicks: [A.click] });
    ctx.cue(qEnd + 0.4, 'hover', 'highlight');
  },
});

/* ───────── mb-chart: a chart card that grows on words ───────── */
export const mbChart = defineScene({
  name: 'mb-chart', kind: 'broll', title: 'Chart card',
  description: 'A card with a bar chart (or line chart) whose bars rise on their words, one accent bar, then a tooltip on the point that matters. Relative values unless you pass real ones.',
  formats: ['yt', 'reel', 'square'],
  defaults: { ...common, format: 'yt', kind: 'bars', title: 'Time to first draft', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], values: [0.32, 0.45, 0.4, 0.62, 0.95], focus: 4, showValues: false, tooltip: 'This week', at: { bars: 0.6, tooltip: 2.6 }, end: 4.4 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const A = p.at; const u = S.u;
    const m = ctx.add(morph(S, { states: { card: { w: 1100, h: 700, r: 36, bg: 'surface', cam: fitCam(S, 1100, 700, 1.15) } }, start: 'card', seq: [], intro: 0.05, center: centerOf(ctx) }));
    ctx.cue(0.05, 'appear', 'card');
    const L = m.layer({ tin: 0.05, anchor: 't', o: { din: 0.05 } });
    put(L, `${icon(p.kind === 'line' ? 'chart-spline' : 'chart-column', 32 * u, 'var(--ui-text)')}<span>${p.title}</span>`, { left: -490 * u + 'px', top: 44 * u + 'px', display: 'flex', alignItems: 'center', gap: 14 * u + 'px', ...ts(S, 34, { w: 'semibold', track: -0.02 }) });
    if (p.kind === 'line') {
      const lc = ctx.add(lineChart(S, L, { x: 0, y: 130 * u, anchor: 'tc', w: 960, h: 520, values: p.values, labels: p.labels, at: A.bars, dur: Math.max(1, A.tooltip - A.bars), tooltip: p.tooltip ? { i: p.focus ?? p.values.length - 1, text: p.tooltip } : null }));
      ctx.cue(A.bars, 'build_up', 'line draws', { dur: Math.max(1, A.tooltip - A.bars) }); if (lc.tipAt) ctx.cue(lc.tipAt, 'appear', 'tooltip');
    } else {
      const bc = ctx.add(barChart(S, L, { x: 0, y: 140 * u, anchor: 'tc', w: 940, h: 500, values: p.values, labels: p.labels, accent: p.focus, max: Math.max(...p.values) * 1.12, showValues: p.showValues, at: A.bars }));
      p.values.forEach((_, i) => ctx.cue(A.bars + i * T.motion.stagger.bars, 'tick', 'bar'));
      if (p.tooltip) {
        const tip = put(L, p.tooltip, { padding: `${10 * u}px ${18 * u}px`, borderRadius: 10 * u + 'px', background: 'var(--ui-control)', ...ts(S, 22, { mono: true, color: 'var(--ui-onControl)' }), transformOrigin: '50% 100%' });
        ctx.cue(A.tooltip, 'appear', 'tooltip');
        ctx.add((t) => { const k = spr(t, A.tooltip, 'pop'); const i = p.focus ?? 0; css(tip, { display: t >= A.tooltip ? '' : 'none', left: -470 * u + bc.barX(i) + 'px', top: 140 * u + bc.barTop(i, t) - 18 * u + 'px', transform: `translate(-50%,-100%) scale(${Math.max(0, k)})` }); });
      }
    }
  },
});

/* ───────── mb-chapter: "Up next" pill → chapter card ───────── */
export const mbChapter = defineScene({
  name: 'mb-chapter', kind: 'broll', title: 'Chapter card',
  description: 'A small “Up next →” pill grows into an ink chapter card: the number in the accent, the title, a muted subtitle.',
  formats: ['yt', 'reel', 'square'],
  defaults: { ...common, format: 'yt', kicker: 'Up next', n: '01', title: 'First build', sub: 'Low effort · 12 minutes', at: { card: 0.95 }, end: 2.9 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const A = p.at; const u = S.u;
    const m = ctx.add(morph(S, { states: { next: { w: 280, h: 92, r: 46, bg: 'control', cam: fitCam(S, 280, 92, 2.0) }, ch: { w: 860, h: 300, r: 48, bg: 'control', cam: fitCam(S, 860, 300, 1.5) } }, start: 'next', seq: [[A.card, 'ch']], intro: 0.08, center: centerOf(ctx) }));
    ctx.cue(0.08, 'appear', 'pill'); ctx.cue(A.card, 'reveal', 'chapter');
    const Ln = m.layer({ tin: 0.08, tout: A.card, o: { din: 0.03 } });
    put(Ln, `<span>${p.kicker}</span>${icon('arrow-right', 30 * u, 'var(--ui-onControl)')}`, { left: '0px', top: '0px', transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', gap: 12 * u + 'px', ...ts(S, 32, { w: 'medium', color: 'var(--ui-onControl)' }) });
    const Lc = m.layer({ tin: A.card });
    put(Lc, p.n, { left: -320 * u + 'px', top: -86 * u + 'px', fontFamily: '"IS display"', fontSize: 150 * u + 'px', lineHeight: '1', color: 'var(--accent)' });
    txt(S, Lc, p.title, -60 * u, -66 * u, 60, { w: 'semibold', color: 'var(--ui-onControl)', track: -0.03 });
    txt(S, Lc, p.sub, -58 * u, 14 * u, 28, { color: 'var(--ui-textMuted)' });
  },
});

/* ───────── mb-drop: drag a file onto a drop zone → upload → done ───────── */
export const mbDrop = defineScene({
  name: 'mb-drop', kind: 'broll', title: 'File drag → drop → upload',
  description: 'A file tile is dragged by the cursor onto a dashed drop zone, the zone accepts it, morphs into an upload bar that fills and checks.',
  formats: ['yt', 'reel', 'square'],
  defaults: { ...common, format: 'yt', file: 'quarterly-report.pdf', zone: 'Drop to analyse', done: 'Analysed · 24 pages', at: { grab: 0.9, drop: 2.2, done: 4.0 }, end: 5.2 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const A = p.at; const u = S.u; const tall = ctx.reel;
    const zx = tall ? 0 : 260, zy = tall ? 220 : 0, fx0 = tall ? 0 : -460, fy0 = tall ? -300 : 0;
    const m = ctx.add(morph(S, { states: { zone: { w: 640, h: 360, r: 36, bg: 'surface', cam: fitCam(S, tall ? 700 : 1300, tall ? 900 : 420, 1.2) }, up: { w: 760, h: 200, r: 36, bg: 'surface', cam: fitCam(S, 760, 200, 1.4) } }, start: 'zone', seq: [[A.drop + 0.05, 'up']], intro: 0.05, center: centerOf(ctx), geom: (t, g) => { g.cx = zx; g.cy = zy; const k = spr(t, A.drop + 0.05, 'soft'); g.fx = lerp(tall ? 0 : -100, zx, clamp(k)); g.fy = lerp(tall ? -40 : 0, zy, clamp(k)); return g; } }));
    ctx.cue(0.05, 'appear', 'zone'); ctx.cue(A.drop, 'reveal', 'drop'); ctx.cue(A.done, 'success', 'done');
    const Lz = m.layer({ tin: 0.05, tout: A.drop + 0.05 });
    const dash = put(Lz, `${icon('upload', 56 * u, 'var(--ui-textMuted)')}<div>${p.zone}</div>`, { left: -290 * u + 'px', top: -150 * u + 'px', width: 580 * u + 'px', height: 300 * u + 'px', borderRadius: 26 * u + 'px', outline: `${3 * u}px dashed var(--ui-border)`, outlineOffset: -3 * u + 'px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 * u + 'px', ...ts(S, 30, { w: 'medium', color: 'var(--ui-textMuted)' }) });
    const Lu = m.layer({ tin: A.drop + 0.05 });
    put(Lu, `${icon('file-text', 34 * u, 'var(--ui-text)')}<span>${p.file}</span>`, { left: -330 * u + 'px', top: -62 * u + 'px', display: 'flex', alignItems: 'center', gap: 14 * u + 'px', ...ts(S, 28, { mono: true }) });
    put(Lu, '', { left: -330 * u + 'px', top: 10 * u + 'px', width: 660 * u + 'px', height: 14 * u + 'px', borderRadius: 7 * u + 'px', background: 'var(--ui-sunken)' });
    const bar = put(Lu, '', { left: -330 * u + 'px', top: 10 * u + 'px', height: 14 * u + 'px', borderRadius: 7 * u + 'px', background: 'var(--accent)' });
    const st = put(Lu, '', { left: -330 * u + 'px', top: 42 * u + 'px', display: 'flex', alignItems: 'center', gap: 10 * u + 'px', ...ts(S, 24, { color: 'var(--ui-textMuted)' }) });
    // the file tile lives in the world and follows the cursor while dragged
    const keys = [[0, fx0 + 160, fy0 + 160], [A.grab - 0.3, fx0 + 40, fy0 + 10], [A.grab, fx0 + 40, fy0 + 10], [A.drop, zx, zy], [A.drop + 0.4, zx + 30, zy + 40], [p.end, zx + 300, zy + 200]];
    const cur = cpath(keys);
    const tile = fileTile(S, S.world, { x: 0, y: 0, anchor: 'c', name: p.file, w: 420 });
    ctx.add((t) => {
      const c = t < A.grab ? { x: fx0 + 40, y: fy0 + 10 } : cur(Math.min(t, A.drop));
      const lift = clamp((t - A.grab) / 0.15), drop = seg(t, A.drop - 0.02, A.drop + 0.12);
      css(tile, { left: c.x - 210 * u + 'px', top: c.y - 46 * u + 'px', opacity: 1 - drop, transform: `rotate(${-3 * lift}deg) scale(${1 + 0.05 * lift - 0.3 * drop})`, boxShadow: lift > 0 ? 'var(--is-shadow-lift)' : 'var(--ui-shadow)', zIndex: 3 });
      css(dash, { outlineColor: t > A.drop - 0.5 && t < A.drop + 0.1 ? 'var(--accent)' : 'var(--ui-border)', background: t > A.drop - 0.5 && t < A.drop + 0.1 ? 'var(--accent-soft)' : 'transparent' });
      const pr = ease('drift')(seg(t, A.drop + 0.3, A.done)); css(bar, { width: 660 * u * pr + 'px' });
      st.innerHTML = t >= A.done ? `${icon('circle-check', 26 * u, 'var(--accent)')}<span style="color:var(--ui-text)">${p.done}</span>` : `<span>Uploading… ${Math.round(pr * 100)}%</span>`;
    });
    ctx.cursor({ keys, drags: [[A.grab, A.drop]], hand: [[A.grab - 0.05, A.drop + 0.05]] });
  },
});

/* ───────── mb-toggles: a settings card, toggles flip on words ───────── */
export const mbToggles = defineScene({
  name: 'mb-toggles', kind: 'broll', title: 'Settings toggles',
  description: 'A settings card with labelled toggles; the cursor flips each one on its word, the last one turns on a highlighted feature.',
  formats: ['yt', 'reel', 'square'],
  defaults: { ...common, format: 'yt', title: 'Automations', rows: [{ label: 'Auto-captions', sub: 'Word-timed, two lines', on: true }, { label: 'Beat-synced cuts', sub: 'Snap to the downbeat', on: false }, { label: 'Sound design', sub: 'One real sound per move', on: false }], at: { flips: [1.4, 2.4] }, end: 3.8 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const A = p.at; const u = S.u;
    const H = 150 + 128 * p.rows.length;
    const m = ctx.add(morph(S, { states: { card: { w: 860, h: H, r: 36, bg: 'surface', cam: fitCam(S, 860, H, 1.25) } }, start: 'card', seq: [], intro: 0.05, center: centerOf(ctx) }));
    ctx.cue(0.05, 'appear', 'card');
    const L = m.layer({ tin: 0.05, anchor: 't', o: { din: 0.05 } });
    put(L, `${icon('sliders-horizontal', 34 * u, 'var(--ui-text)')}<span>${p.title}</span>`, { left: -370 * u + 'px', top: 44 * u + 'px', display: 'flex', alignItems: 'center', gap: 14 * u + 'px', ...ts(S, 36, { w: 'semibold', track: -0.02 }) });
    let fi = 0; const keys = [[0, 600, 400], [0.8, 600, 400]]; const clicks = [];
    p.rows.forEach((r, i) => {
      const y = 130 + i * 128;
      txt(S, L, r.label, -370 * u, y * u, 30, { w: 'semibold' });
      txt(S, L, r.sub, -370 * u, (y + 42) * u, 22, { color: 'var(--ui-textMuted)' });
      if (i < p.rows.length - 1) put(L, '', { left: -370 * u + 'px', top: (y + 100) * u + 'px', width: 740 * u + 'px', height: 1.5 * u + 'px', background: 'var(--ui-border)' });
      const flipAt = r.on ? null : A.flips[fi++];
      ctx.add(toggle(S, L, { x: 330 * u, y: (y + 34) * u, anchor: 'c', start: !!r.on, on: flipAt != null ? [[flipAt, true]] : [] }));
      if (flipAt != null) { keys.push([flipAt - 0.25, 330, -H / 2 + y + 34], [flipAt + 0.15, 330, -H / 2 + y + 34]); clicks.push(flipAt); ctx.cue(flipAt, 'toggle', r.label); }
    });
    keys.push([p.end, 520, H / 2 + 40]);
    ctx.cursor({ keys, clicks });
  },
});

export const BROLL = [mbLaunch, mbTerminal, mbDoc, mbSlider, mbVersus, mbChecklist, mbSearch, mbChart, mbChapter, mbDrop, mbToggles];
