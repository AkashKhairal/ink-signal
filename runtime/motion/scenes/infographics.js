// Infographics: charts and numbers as motion. One accent (the number the story is about), everything else
// ink on paper or white on night. Values are yours: defaults are labelled example data.
import { defineScene } from '../scene.js';
import { h, css, setText, icon } from '../dom.js';
import { T, track, vis, seg, clamp, lerp, spr, ease, ep, fmtNum, kf } from '../engine.js';
import { ts } from '../ui.js';
import { barChart, lineChart, donut, odometer, ranking, milestones, flow } from '../charts.js';
import { kline, maskRise, blurIn, fstyle, caseOf, highlight } from '../type.js';
import { stamp, glyphRow } from '../fx.js';

const EX = 'Example data. Replace with yours.';
const base = (o = {}) => ({ format: 'yt', theme: 'paper', kicker: 'The numbers', title: 'Watch time per week', source: EX, ...o });
/** kicker + title at the top, source at the bottom; returns content box { x, y, w, h } (screen px) */
function frame(ctx, { at = 0.1 } = {}) {
  const { S, p } = ctx; const u = S.u; const reel = ctx.reel;
  const top = reel ? ctx.safe.top + 40 : 90, side = reel ? 80 : 120;
  const k = h('div', { text: caseOf('label', p.kicker || ''), style: { position: 'absolute', left: side + 'px', top: top + 'px', ...ts(S, 22, { label: true, color: 'var(--accent)' }) } });
  const tl = kline(S, S.front, { x: side, y: top + 36 * u, anchor: 'tl', text: p.title, font: 'ui', size: reel ? 76 : 74, wght: 680, wdth: 104, tracking: -0.03, split: 'words', mask: true, color: 'var(--ui-text)' });
  const src = h('div', { text: p.source || '', style: { position: 'absolute', left: side + 'px', bottom: (reel ? ctx.safe.bottom - 40 : 70) + 'px', ...ts(S, 18, { mono: true, color: 'var(--ui-textMuted)' }) } });
  S.front.append(k, src);
  ctx.add((t) => { const v = vis(t, at, null, { din: 0 }); css(k, { opacity: v.o }); maskRise(tl.units, t, at + 0.1, 0.06, 0.45); css(src, { opacity: clamp((t - at - 0.6) / 0.4) }); });
  ctx.cue(at + 0.1, 'appear', 'title');
  const y0 = top + 36 * u + (reel ? 76 : 74) * u * 1.25 + (reel ? 120 : 70) * u;
  return { x: side, y: y0, w: ctx.W - side * 2, h: ctx.H - y0 - (reel ? ctx.safe.bottom : 140) };
}
const theme = (p) => p.theme;

export const igBars = defineScene({
  name: 'ig-bars', kind: 'infographic', title: 'Bar chart', theme: 'paper', formats: ['yt', 'reel', 'square'],
  description: 'Kicker + title, bars rise one after another on springs with values counting, one accent bar, optional note on the accent bar.',
  defaults: base({ labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [12, 18, 15, 24, 31, 44, 39], focus: 5, unit: 'k', decimals: 0, note: 'best day', end: 5 }),
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const B = frame(ctx);
    const bc = ctx.add(barChart(S, S.front, { x: B.x, y: B.y, anchor: 'tl', w: B.w / u, h: B.h / u, values: p.values, labels: p.labels, accent: p.focus, max: Math.max(...p.values) * 1.15, at: 0.9, fmt: (v) => fmtNum(v, { decimals: p.decimals, suffix: p.unit }), labelSize: ctx.reel ? 'small' : 'micro' }));
    p.values.forEach((_, i) => ctx.cue(0.9 + i * T.motion.stagger.bars, 'tick', 'bar'));
    if (p.note && p.focus != null) {
      const n = h('div', { text: p.note, style: { position: 'absolute', ...fstyle(S, 'note', ctx.reel ? 56 : 52, { color: S.theme === 'night' ? '#FFFFFF' : T.color.pen }), transform: 'translate(-50%,-100%) rotate(-4deg)' } }); S.front.appendChild(n);
      const tN = 0.9 + p.values.length * T.motion.stagger.bars + 0.8; ctx.cue(tN, 'appear', 'note');
      ctx.add((t) => { css(n, { left: B.x + bc.barX(p.focus) + 'px', top: B.y + bc.barTop(p.focus, t) - 70 * u + 'px', clipPath: `inset(-30% ${(100 - 100 * ep(t, tN, tN + 0.6, 'write')).toFixed(1)}% -30% -5%)` }); });
    }
  },
});

export const igLine = defineScene({
  name: 'ig-line', kind: 'infographic', title: 'Line chart + headline number', theme: 'paper', formats: ['yt', 'reel', 'square'],
  description: 'A headline number rolls up (odometer) while the line draws behind a leading dot; the tooltip pops on the last point.',
  defaults: base({ kicker: 'Growth', title: 'Subscribers this year', labels: ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'], values: [1.2, 2.1, 2.6, 4.4, 6.9, 10.4], stat: 10400, statLabel: 'Subscribers', tooltip: '10.4k', end: 5.2 }),
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const B = frame(ctx); const reel = ctx.reel;
    const lab = h('div', { text: caseOf('label', p.statLabel), style: { position: 'absolute', left: B.x + 'px', top: B.y + 'px', ...ts(S, 18, { label: true, color: 'var(--ui-textMuted)' }) } }); S.front.appendChild(lab);
    const od = ctx.add(odometer(S, S.front, { x: B.x, y: B.y + 30 * u, anchor: 'tl', value: (t) => lerp(0, p.stat, ease('snap')(seg(t, 0.8, 2.6))), size: reel ? 150 : 130, font: 'display', digits: String(Math.floor(p.stat)).length, color: 'var(--ui-text)' }));
    void od;
    const ch = reel ? B.h - 260 * u : B.h - 190 * u;
    const lc = ctx.add(lineChart(S, S.front, { x: B.x, y: B.y + (reel ? 240 : 180) * u, anchor: 'tl', w: B.w / u, h: ch / u, values: p.values, labels: p.labels, at: 0.9, dur: 2.4, tooltip: p.tooltip ? { i: p.values.length - 1, text: p.tooltip } : null }));
    ctx.cue(0.8, 'count', 'count up', { dur: 1.8 }); ctx.cue(0.9, 'build_up', 'line draws', { dur: 2.4 }); if (lc.tipAt) ctx.cue(lc.tipAt, 'appear', 'tooltip');
  },
});

export const igDonut = defineScene({
  name: 'ig-donut', kind: 'infographic', title: 'Donut + legend', theme: 'paper', formats: ['yt', 'reel', 'square'],
  description: 'A ring draws segment by segment (one accent segment), the centre number counts, the legend rows blur in with their shares.',
  defaults: base({ kicker: 'Where views come from', title: 'Traffic sources', segments: [{ label: 'Reels', value: 46, accent: true }, { label: 'Search', value: 24 }, { label: 'Profile', value: 18 }, { label: 'Other', value: 12 }], center: '46%', centerLabel: 'From Reels', end: 5 }),
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const B = frame(ctx); const reel = ctx.reel;
    const D = Math.min(reel ? B.w : B.h, reel ? B.h * 0.55 : B.w * 0.45) / u;
    const dx = reel ? B.x + B.w / 2 : B.x + D * u / 2 + 40 * u, dy = reel ? B.y + D * u / 2 : B.y + B.h / 2;
    ctx.add(donut(S, S.front, { x: dx, y: dy, size: D, segments: p.segments, at: 0.8, dur: 1.4, center: { text: p.center, label: p.centerLabel } }));
    ctx.cue(0.8, 'build_up', 'ring', { dur: 1.4 });
    const tot = p.segments.reduce((a, s) => a + s.value, 0);
    const lx = reel ? B.x + 40 * u : dx + D * u / 2 + 120 * u, ly = reel ? B.y + D * u + 90 * u : dy - (p.segments.length * 86 * u) / 2;
    const rows = p.segments.map((s, i) => {
      const r = h('div', { style: { position: 'absolute', left: lx + 'px', top: ly + i * 86 * u + 'px', display: 'flex', alignItems: 'center', gap: 20 * u + 'px', width: (reel ? B.w - 80 * u : B.x + B.w - lx) + 'px' } });
      r.innerHTML = `<span style="width:${22 * u}px;height:${22 * u}px;background:${s.accent ? 'var(--accent)' : S.theme === 'night' ? ['#FFFFFF', '#8E8E8B', '#4A4A4C', '#2C2C2E'][i % 4] : [T.color.ink, '#5A5A58', '#A9A7A1', '#D3D1CB'][i % 4]}"></span>`;
      r.appendChild(h('span', { text: s.label, style: ts(S, ctx.reel ? 36 : 32, { w: 'semibold', color: s.accent ? 'var(--accent)' : 'var(--ui-text)' }) }));
      r.appendChild(h('span', { text: Math.round((s.value / tot) * 100) + '%', style: { ...ts(S, ctx.reel ? 32 : 28, { mono: true, color: 'var(--ui-textMuted)' }), marginLeft: 'auto' } }));
      S.front.appendChild(r); return r;
    });
    ctx.add((t) => rows.forEach((r, i) => { const v = vis(t, 1.0 + i * 0.3, null, { din: 0 }); css(r, { opacity: v.o, filter: v.blur > 0.05 ? `blur(${v.blur}px)` : 'none', transform: `translateX(${(1 - v.a) * 20 * u}px)` }); }));
    p.segments.forEach((_, i) => ctx.cue(1.0 + i * 0.3, 'tick', 'legend'));
  },
});

export const igCounter = defineScene({
  name: 'ig-counter', kind: 'infographic', title: 'Big number', theme: 'night', formats: ['yt', 'reel', 'square'],
  description: 'One big number rolls up like an odometer in the display face, a label types in, a relative bar fills, the glyph trio stamps. For real stats only.',
  defaults: { format: 'yt', theme: 'night', value: 1250000, prefix: '', suffix: '+', label: 'Views in 30 days', context: 'Source: your analytics', dur: 1.8, end: 4.4 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const W = S.W, H = S.H; const reel = ctx.reel;
    const digits = String(Math.floor(p.value)).length;
    const size = Math.min(reel ? 240 : 300, (W * 0.84) / ((digits + Math.floor((digits - 1) / 3) * 0.4 + (p.prefix + p.suffix).length) * 0.78 * u));
    ctx.add(odometer(S, S.front, { x: W / 2, y: H / 2 - 30 * u, anchor: 'c', value: (t) => lerp(0, p.value, ease([0.2, 0.7, 0.2, 1])(seg(t, 0.4, 0.4 + p.dur))), size, font: 'display', digits, prefix: p.prefix, suffix: p.suffix, color: 'var(--ui-text)' }));
    const lab = h('div', { style: { position: 'absolute', left: W / 2 + 'px', top: H / 2 + size * u * 0.55 + 'px', transform: 'translateX(-50%)', ...ts(S, reel ? 40 : 36, { w: 'semibold', color: 'var(--accent)' }) } }); S.front.appendChild(lab);
    const ctxl = h('div', { text: p.context, style: { position: 'absolute', left: W / 2 + 'px', bottom: (reel ? ctx.safe.bottom - 40 : 80) + 'px', transform: 'translateX(-50%)', ...ts(S, 18, { mono: true, color: 'var(--ui-textMuted)' }) } }); S.front.appendChild(ctxl);
    const gr = glyphRow(S, S.front, { x: W / 2, y: H / 2 - size * u * 0.75 - 30 * u, size: 34, at: 0.4 + p.dur + 0.1, color: 'accent' });
    ctx.add((t) => { setText(lab, p.label.slice(0, Math.max(0, Math.floor((t - 0.6) * 30)))); gr.update(t); css(ctxl, { opacity: clamp((t - 1) / 0.4) }); });
    ctx.cue(0.4, 'count', 'roll', { dur: p.dur }); ctx.cue(0.4 + p.dur, 'reveal', 'lands'); ctx.cue(0.6, 'typing', 'label', { dur: p.label.length / 30 });
  },
});

export const igCompare = defineScene({
  name: 'ig-compare', kind: 'infographic', title: 'Before / after', theme: 'paper', formats: ['yt', 'reel', 'square'],
  description: 'Two columns: each number counts up with its bar; the winner gets the accent and a selection box; a handwritten verdict.',
  defaults: base({ kicker: 'Before vs after', title: 'Time to edit one reel', a: { label: 'By hand', value: 120, unit: ' min' }, b: { label: 'With Signal', value: 12, unit: ' min' }, winner: 'b', verdict: '10× faster', end: 5.2 }),
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const B = frame(ctx); const reel = ctx.reel;
    const M = Math.max(p.a.value, p.b.value);
    const cols = [p.a, p.b].map((c, i) => {
      const win = (i === 0 ? 'a' : 'b') === p.winner;
      const cx = reel ? B.x : B.x + (B.w / 2) * i, cy = reel ? B.y + (B.h / 2) * i : B.y, cw = reel ? B.w : B.w / 2 - 60 * u;
      const lab = h('div', { text: caseOf('label', c.label), style: { position: 'absolute', left: cx + 'px', top: cy + 'px', ...ts(S, 22, { label: true, color: win ? 'var(--accent)' : 'var(--ui-textMuted)' }) } });
      const num = h('div', { style: { position: 'absolute', left: cx + 'px', top: cy + 40 * u + 'px', ...fstyle(S, 'display', reel ? 150 : 140, { color: win ? 'var(--accent)' : 'var(--ui-text)' }) } });
      const trk = h('div', { style: { position: 'absolute', left: cx + 'px', top: cy + (reel ? 230 : 220) * u + 'px', width: cw + 'px', height: 22 * u + 'px', background: 'var(--ui-skeleton)' } });
      const bar = h('div', { style: { position: 'absolute', left: cx + 'px', top: cy + (reel ? 230 : 220) * u + 'px', height: 22 * u + 'px', background: win ? 'var(--accent)' : 'var(--ui-text)' } });
      S.front.append(lab, num, trk, bar);
      const t0 = 0.9 + i * 0.5;
      return { num, bar, c, cw, t0, win, cx, cy };
    });
    const vT = 3.0;
    const win = cols.find((c) => c.win);
    const nt = h('div', { text: p.verdict, style: { position: 'absolute', ...fstyle(S, 'note', reel ? 80 : 72, { color: S.theme === 'night' ? '#FFFFFF' : T.color.pen }), transform: 'rotate(-4deg)' } }); S.front.appendChild(nt);
    ctx.add((t) => {
      cols.forEach(({ num, bar, c, cw, t0 }) => { const k = ease('snap')(seg(t, t0, t0 + 1.2)); setText(num, fmtNum(c.value * k, { suffix: c.unit || '' })); css(bar, { width: cw * (c.value / M) * Math.max(0, spr(t, t0, 'settle')) + 'px' }); });
      if (win) css(nt, { left: win.cx + (reel ? win.cw * 0.42 : win.cw * 0.45) + 'px', top: win.cy + (reel ? 290 : 270) * u + 'px', clipPath: `inset(-30% ${(100 - 100 * ep(t, vT, vT + 0.6, 'write')).toFixed(1)}% -40% -5%)` });
    });
    cols.forEach((c) => ctx.cue(c.t0, 'count', 'count', { dur: 1.2 })); ctx.cue(vT, 'appear', 'verdict');
  },
});

export const igTimeline = defineScene({
  name: 'ig-timeline', kind: 'infographic', title: 'Timeline / roadmap', theme: 'paper', formats: ['yt', 'reel', 'square'],
  description: 'A line draws across (down on Reels); each milestone dot stamps as the line reaches it and its label blurs in; the last one is the accent.',
  defaults: base({ kicker: 'Roadmap', title: 'From idea to launch', items: [{ label: 'Week 1', sub: 'Script + shots' }, { label: 'Week 2', sub: 'First cut' }, { label: 'Week 3', sub: 'Sound + captions' }, { label: 'Week 4', sub: 'Launch' }], end: 5.4 }),
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const B = frame(ctx); const reel = ctx.reel;
    const ms = ctx.add(milestones(S, S.front, reel ? { x: B.x + 40 * u, y: B.y + 40 * u, w: (B.h - 140 * u) / u, anchor: 'tl', vertical: true, items: p.items, at: 0.9, dur: 2.6 } : { x: B.x + 80 * u, y: B.y + B.h / 2, w: (B.w - 160 * u) / u, anchor: 'cl', items: p.items, at: 0.9, dur: 2.6 }));
    ctx.cue(0.9, 'build_up', 'line', { dur: 2.6 }); ms.reach.forEach((t) => ctx.cue(t, 'stamp', 'milestone'));
  },
});

export const igFlow = defineScene({
  name: 'ig-flow', kind: 'infographic', title: 'Process / how it works', theme: 'paper', formats: ['yt', 'reel', 'square'],
  description: 'Numbered process: each node stamps in with its icon, the connector draws to the next, the last node is the accent result.',
  defaults: base({ kicker: 'How it works', title: 'Three steps, one reel', items: [{ icon: 'upload', label: 'Drop your clips', sub: 'Any camera' }, { icon: 'wand-sparkles', label: 'Describe the edit', sub: 'In plain words' }, { icon: 'rocket', label: 'Post it', sub: 'Reels, Shorts, TikTok' }], end: 4.6 }),
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const B = frame(ctx); const reel = ctx.reel;
    const fl = ctx.add(flow(S, S.front, reel ? { x: B.x + 40 * u, y: B.y + 30 * u, anchor: 'tl', vertical: true, w: (B.h - 160 * u) / u, items: p.items, at: 0.9, each: 0.6, node: 150 } : { x: B.x + B.w / 2, y: B.y + B.h / 2 - 60 * u, anchor: 'c', w: (B.w - 300 * u) / u, items: p.items, at: 0.9, each: 0.6, node: 170 }));
    void fl; p.items.forEach((_, i) => ctx.cue(0.9 + i * 0.6, 'appear', 'step'));
  },
});

export const igRanking = defineScene({
  name: 'ig-ranking', kind: 'infographic', title: 'Ranking race', theme: 'paper', formats: ['yt', 'reel', 'square'],
  description: 'Horizontal bars that grow and re-sort over time (bar-race lite); the item the story is about is the accent.',
  defaults: base({ kicker: 'Most used', title: 'Formats our viewers watch', labels: ['Reels', 'Shorts', 'TikTok', 'Long-form', 'Live'], frames: [[0.8, { Reels: 20, Shorts: 30, TikTok: 26, 'Long-form': 34, Live: 8 }], [2.0, { Reels: 48, Shorts: 40, TikTok: 37, 'Long-form': 36, Live: 10 }], [3.2, { Reels: 72, Shorts: 51, TikTok: 49, 'Long-form': 38, Live: 12 }]], focus: 'Reels', unit: '%', end: 5.2 }),
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const B = frame(ctx);
    const rowH = Math.min(110, B.h / u / p.labels.length);
    ctx.add(ranking(S, S.front, { x: B.x, y: B.y, w: B.w / u, labels: p.labels, frames: p.frames, rowH, accent: p.focus, fmt: (v) => fmtNum(v, { suffix: p.unit }) }));
    p.frames.forEach(([t]) => ctx.cue(t, 'movement', 'reorder'));
  },
});

export const INFOGRAPHICS = [igBars, igLine, igDonut, igCounter, igCompare, igTimeline, igFlow, igRanking];
