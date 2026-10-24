// Ink & Signal — data components: bars, lines, donuts, odometer counters, rankings, timelines, step flows.
// One accent bar / segment (the one the story is about); everything else ink (paper) or white (night).
// Never invent numbers: pass real values, or relative values with showValues: false.
import { h, css, setText, icon } from './dom.js';
import { T, track, vis, seg, eo, eio, clamp, lerp, spr, fmtNum, ease, pulse } from './engine.js';
import { box } from './stage.js';
import { ts, px } from './ui.js';

const CH = T.chart;
let CLIP = 0;
const baseCol = (S) => (S.theme === 'night' ? '#FFFFFF' : T.color.ink);
const mutedCol = (S) => (S.theme === 'night' ? T.color.nightSkeleton : T.color.skeleton);
const isAcc = (accent, i) => (Array.isArray(accent) ? accent.includes(i) : accent === i);

/**
 * barChart(S, parent, { x, y, w, h, anchor, values, labels, accent: i | [i], max, at, stagger, showValues, fmt, axis, baseColor })
 * Bars rise on springs one after another; value labels count with their bar.
 */
export function barChart(S, parent, { x = 0, y = 0, w = 900, h: hh = 560, anchor = 'c', values = [], labels = [], accent = null, max = null, at = 0, stagger = T.motion.stagger.bars, showValues = true, fmt = (v) => fmtNum(v), axis = true, spring = 'settle', muted = false, labelSize = 'micro' } = {}) {
  const W = px(S, w), H = px(S, hh), LB = px(S, 64), VT = showValues ? px(S, 56) : px(S, 8);
  const el = box(parent, { x, y, w: W, h: H, anchor });
  const n = values.length, gapF = CH.barGap, bw = W / (n + (n - 1) * gapF), gap = bw * gapF;
  const M = max ?? Math.max(...values) * 1.0;
  const plotH = H - LB - VT;
  if (axis) el.appendChild(h('div', { style: { position: 'absolute', left: '0px', top: (H - LB) + 'px', width: W + 'px', height: px(S, 2) + 'px', background: S.theme === 'night' ? T.color.nightLine : T.color.rule } }));
  const bars = values.map((v, i) => {
    const acc = isAcc(accent, i);
    const b = h('div', { style: { position: 'absolute', left: i * (bw + gap) + 'px', width: bw + 'px', borderRadius: `${px(S, CH.barRadius)}px ${px(S, CH.barRadius)}px ${px(S, 2)}px ${px(S, 2)}px`, background: acc ? 'var(--accent)' : muted ? mutedCol(S) : baseCol(S) } });
    const lab = labels[i] != null ? h('div', { text: labels[i], style: { position: 'absolute', left: i * (bw + gap) + bw / 2 + 'px', top: (H - LB + px(S, 18)) + 'px', transform: 'translateX(-50%)', ...ts(S, labelSize, { label: true, color: acc ? 'var(--accent)' : 'var(--ui-textMuted)' }) } }) : null;
    const val = showValues ? h('div', { style: { position: 'absolute', left: i * (bw + gap) + bw / 2 + 'px', transform: 'translate(-50%,-100%)', ...ts(S, 'small', { mono: true, color: acc ? 'var(--accent)' : 'var(--ui-text)' }) } }) : null;
    el.appendChild(b); if (lab) el.appendChild(lab); if (val) el.appendChild(val);
    return { b, lab, val, v, tr: track(0, [[at + i * stagger, v / M, spring]]) };
  });
  return {
    el, barX: (i) => i * (bw + gap) + bw / 2, barTop: (i, t) => H - LB - plotH * Math.max(0, bars[i].tr(t)),
    update(t) {
      bars.forEach(({ b, val, v, tr, lab }, i) => {
        const k = Math.max(0, tr(t)), bh = plotH * k;
        css(b, { top: (H - LB - bh) + 'px', height: bh + 'px', opacity: t >= at + i * stagger ? 1 : 0 });
        if (lab) css(lab, { opacity: clamp((t - at - i * stagger) / 0.2) });
        if (val) { setText(val, fmt(v * clamp(k / Math.max(1e-6, v / M)))); css(val, { top: (H - LB - bh - px(S, 12)) + 'px', opacity: clamp((t - at - i * stagger - 0.1) / 0.2) }); }
      });
    },
  };
}

/** smooth path through points (Catmull-Rom → cubic Bézier) */
export function smoothPath(pts, k = 0.18) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k], c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += `C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

/**
 * lineChart(S, parent, { x, y, w, h, anchor, values, labels, at, dur, area, tooltip: { i, text }, min, max, grid, bars: values2 })
 * The line draws on behind a leading dot; the tooltip pops when the dot reaches its point.
 */
export function lineChart(S, parent, { x = 0, y = 0, w = 1000, h: hh = 560, anchor = 'c', values = [], labels = [], at = 0, dur = 1.6, area = true, tooltip = null, min = null, max = null, grid = 4, e = 'write' } = {}) {
  const W = px(S, w), H = px(S, hh), LB = labels.length ? px(S, 58) : px(S, 10), PT = px(S, 70);
  const el = box(parent, { x, y, w: W, h: H, anchor });
  const lo = min ?? Math.min(...values) * 0.9, hi = max ?? Math.max(...values) * 1.08;
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * W, PT + (H - LB - PT) * (1 - (v - lo) / (hi - lo))]);
  const d = smoothPath(pts);
  const axisC = S.theme === 'night' ? T.color.nightLine : T.color.rule;
  const lineC = S.theme === 'night' ? '#FFFFFF' : T.color.ink;
  let gl = '';
  for (let i = 0; i <= grid; i++) { const yy = PT + ((H - LB - PT) * i) / grid; gl += `<line x1="0" x2="${W}" y1="${yy}" y2="${yy}" stroke="${axisC}" stroke-width="${px(S, i === grid ? 2 : 1.2)}" ${i === grid ? '' : `stroke-dasharray="${px(S, 4)} ${px(S, 8)}"`}/>`; }
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;left:0;top:0;overflow:visible">${gl}<defs><clipPath id="isclip${++CLIP}"><rect class="clipr" x="0" y="0" width="0" height="${H}"/></clipPath></defs><path class="area" clip-path="url(#isclip${CLIP})" d="${d}L${W} ${H - LB}L0 ${H - LB}Z" fill="var(--accent)" fill-opacity="0.12"/><path class="ln" d="${d}" fill="none" stroke="var(--accent)" stroke-width="${px(S, CH.lineStroke)}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const svg = el.firstChild, ln = svg.querySelector('.ln'), ar = svg.querySelector('.area'), clipR = svg.querySelector('.clipr');
  if (!area) ar.remove();
  const L = ln.getTotalLength();
  css(ln, { strokeDasharray: `${L} ${L + 10}` });
  const dot = h('div', { style: { position: 'absolute', width: px(S, CH.dot) + 'px', height: px(S, CH.dot) + 'px', borderRadius: '50%', background: 'var(--accent)', boxShadow: `0 0 0 ${px(S, 6)}px ${S.theme === 'night' ? 'rgba(11,11,12,.9)' : 'rgba(255,255,255,.9)'}` } });
  el.appendChild(dot);
  labels.forEach((l, i) => el.appendChild(h('div', { text: l, style: { position: 'absolute', left: pts[i][0] + 'px', top: (H - LB + px(S, 16)) + 'px', transform: 'translateX(-50%)', ...ts(S, 'micro', { label: true, color: 'var(--ui-textMuted)' }) } })));
  let tip = null, tipAt = null;
  if (tooltip) {
    tip = h('div', { text: tooltip.text, style: { position: 'absolute', padding: `${px(S, 10)}px ${px(S, 18)}px`, borderRadius: px(S, CH.tooltip.radius) + 'px', background: S.theme === 'night' ? '#FFFFFF' : T.color.ink, ...ts(S, 'small', { mono: true, color: S.theme === 'night' ? T.color.ink : '#FFFFFF' }), transformOrigin: '50% 100%' } });
    el.appendChild(tip);
    // time the dot reaches point i (by x)
    const fx = pts[tooltip.i][0] / W; tipAt = at + dur * invEase(e, fx);
  }
  // x-progress from length progress is close enough for monotone x; the clip rect reveals the area under the line
  return {
    el, pts, tipAt,
    update(t) {
      const p = ease(e)(seg(t, at, at + dur));
      css(ln, { strokeDashoffset: (L * (1 - p)).toFixed(2) });
      const q = ln.getPointAtLength(L * p);
      css(dot, { left: (q.x - px(S, CH.dot) / 2) + 'px', top: (q.y - px(S, CH.dot) / 2) + 'px', opacity: t >= at ? 1 : 0 });
      if (area) clipR.setAttribute('width', Math.max(0, q.x).toFixed(2));
      if (tip) { const k = spr(t, tipAt, 'pop'); const P = pts[tooltip.i]; css(tip, { display: t >= tipAt ? '' : 'none', left: P[0] + 'px', top: (P[1] - px(S, 26)) + 'px', transform: `translate(-50%,-100%) scale(${Math.max(0, k).toFixed(4)})` }); }
    },
  };
}
function invEase(e, y) { const f = ease(e); let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (f(m) < y) lo = m; else hi = m; } return (lo + hi) / 2; }

/**
 * donut(S, parent, { x, y, size, anchor, segments: [{ value, label, accent }], at, dur, center: { text | value, label }, gapDeg })
 */
export function donut(S, parent, { x = 0, y = 0, size = 520, anchor = 'c', segments = [], at = 0, dur = 1.2, thickness = CH.donutThickness, center = null, gapDeg = 2.5 } = {}) {
  const D = px(S, size), R = D / 2 - (D * thickness) / 2, sw = D * thickness, C = 2 * Math.PI * R;
  const el = box(parent, { x, y, w: D, h: D, anchor });
  const tot = segments.reduce((a, s) => a + s.value, 0);
  let acc = 0;
  const segs = segments.map((s, i) => { const f0 = acc / tot, f1 = (acc + s.value) / tot; acc += s.value; return { ...s, f0, f1, i }; });
  const col = (s, i) => (s.accent ? 'var(--accent)' : S.theme === 'night' ? ['#FFFFFF', '#8E8E8B', '#4A4A4C', '#2C2C2E'][i % 4] : [T.color.ink, '#5A5A58', '#A9A7A1', '#D3D1CB'][i % 4]);
  el.innerHTML = `<svg width="${D}" height="${D}" viewBox="0 0 ${D} ${D}" style="position:absolute;left:0;top:0;transform:rotate(-90deg)"><circle cx="${D / 2}" cy="${D / 2}" r="${R}" fill="none" stroke="${mutedCol(S)}" stroke-width="${sw}"/>${segs.map((s, i) => `<circle class="s${i}" cx="${D / 2}" cy="${D / 2}" r="${R}" fill="none" stroke="${col(s, i)}" stroke-width="${sw}"/>`).join('')}</svg>`;
  const cs = segs.map((s, i) => el.querySelector('.s' + i));
  let cv = null, cl = null;
  if (center) {
    cv = h('div', { style: { position: 'absolute', left: '50%', top: '47%', transform: 'translate(-50%,-50%)', ...ts(S, D * 0.2, { w: 'bold', track: -0.03 }), fontVariationSettings: '"wdth" 112' } });
    el.appendChild(cv);
    if (center.label) { cl = h('div', { text: center.label, style: { position: 'absolute', left: '50%', top: '64%', transform: 'translate(-50%,-50%)', ...ts(S, 'micro', { label: true, color: 'var(--ui-textMuted)' }) } }); el.appendChild(cl); }
  }
  const gap = (gapDeg / 360) * C;
  return {
    el,
    update(t) {
      const p = ease('wipe')(seg(t, at, at + dur));
      segs.forEach((s, i) => {
        const a = clamp((p - s.f0) / (s.f1 - s.f0)), len = Math.max(0, (s.f1 - s.f0) * C * a - gap);
        css(cs[i], { strokeDasharray: `${len.toFixed(2)} ${C}`, strokeDashoffset: (-(s.f0 * C)).toFixed(2), opacity: a > 0 ? 1 : 0 });
      });
      if (cv) setText(cv, center.text != null ? center.text : center.fmt ? center.fmt(center.value * p) : Math.round(center.value * p) + (center.suffix || ''));
      if (cl) css(cl, { opacity: clamp((t - at) / 0.3) });
    },
  };
}

/**
 * odometer(S, parent, { x, y, anchor, value: t → number, decimals, prefix, suffix, size, font, color, sep })
 * Each digit is a rolling column; the value can be any function of time (count-up, spring, live data).
 */
export function odometer(S, parent, { x = 0, y = 0, anchor = 'c', value = () => 0, digits = null, decimals = 0, prefix = '', suffix = '', size = 220, font = 'display', color = 'var(--ui-text)', sep = ',', blur = true } = {}) {
  const fam = font === 'display' ? '"IS display"' : font === 'mono' ? '"IS data"' : '"IS ui"';
  const el = h('div', { style: { position: 'absolute', left: x + 'px', top: y + 'px', display: 'flex', alignItems: 'flex-start', fontFamily: fam, fontSize: px(S, size) + 'px', lineHeight: '1', color, fontWeight: font === 'ui' ? '800' : '400', fontVariationSettings: font === 'ui' ? '"wdth" 118' : 'normal', transform: `translate(${{ l: '0', c: '-50%', r: '-100%' }[anchor.length === 1 ? 'c' : anchor[1]]},${{ t: '0', c: '-50%', b: '-100%' }[anchor.length === 1 ? 'c' : anchor[0]]})`, whiteSpace: 'nowrap', letterSpacing: font === 'display' ? '-0.01em' : '-0.03em' } });
  parent.appendChild(el);
  const maxV = digits ?? 6;
  const pre = h('span', { text: prefix }); el.appendChild(pre);
  const cols = [];
  const intDigits = maxV;
  for (let i = intDigits - 1; i >= -decimals; i--) {
    if (i === -1) el.appendChild(h('span', { text: '.' }));
    const wrap = h('span', { style: { display: 'inline-block', height: '1em', overflow: 'hidden', position: 'relative', width: '0.72em' } });
    const strip = h('span', { style: { position: 'absolute', left: '0px', top: '0px', display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'center' } });
    for (let d = 0; d <= 10; d++) strip.appendChild(h('span', { text: String(d % 10), style: { height: '1em', lineHeight: '1em' } }));
    wrap.appendChild(strip);
    const sp = (i > 0 && i % 3 === 0 && sep) ? h('span', { text: sep, style: { display: 'inline-block' } }) : null;
    el.appendChild(wrap); if (sp) el.appendChild(sp);
    cols.push({ i, wrap, strip, sp });
  }
  el.appendChild(h('span', { text: suffix }));
  return {
    el,
    update(t) {
      const v = Math.max(0, value(t));
      const lead = Math.max(1, Math.floor(Math.log10(Math.max(1, v + 1e-9))) + 1);
      let lowerPos = 0;
      for (let k = cols.length - 1; k >= 0; k--) {
        const { i, wrap, strip, sp } = cols[k];
        const show = i < lead;
        css(wrap, { display: show ? 'inline-block' : 'none' }); if (sp) css(sp, { display: show && i < lead ? 'inline-block' : 'none' });
        const raw = v / Math.pow(10, i);
        const pos = k === cols.length - 1 ? raw % 10 : (Math.floor(raw) % 10) + clamp(lowerPos - 9);
        lowerPos = pos;
        css(strip, { transform: `translateY(${(-pos).toFixed(4)}em)` });
      }
    },
  };
}

/** ranking: horizontal bars that re-sort over time. frames: [[t, { label: value }]] */
export function ranking(S, parent, { x = 0, y = 0, w = 900, anchor = 'tl', labels = [], frames = [], rowH = 86, accent = null, fmt = (v) => fmtNum(v), max = null } = {}) {
  const W = px(S, w), RH = px(S, rowH), LW = px(S, 200);
  const el = box(parent, { x, y, w: W, h: RH * labels.length, anchor });
  const M = max ?? Math.max(...frames.flatMap(([, f]) => Object.values(f)));
  const rows = labels.map((l, i) => {
    const r = h('div', { style: { position: 'absolute', left: '0px', width: W + 'px', height: RH + 'px' } });
    const lab = h('div', { text: l, style: { position: 'absolute', left: '0px', width: LW - px(S, 20) + 'px', top: '50%', transform: 'translateY(-50%)', textAlign: 'right', ...ts(S, 24, { label: true, color: l === accent ? 'var(--accent)' : 'var(--ui-text)' }) } });
    const bar = h('div', { style: { position: 'absolute', left: LW + 'px', top: RH * 0.2 + 'px', height: RH * 0.6 + 'px', borderRadius: `0 ${px(S, 6)}px ${px(S, 6)}px 0`, background: l === accent ? 'var(--accent)' : baseCol(S) } });
    const val = h('div', { style: { position: 'absolute', top: '50%', transform: 'translateY(-50%)', ...ts(S, 26, { mono: true }) } });
    r.append(lab, bar, val); el.appendChild(r);
    const vt = track(0, frames.map(([t, f]) => [t, f[l] ?? 0, 'settle']));
    const order = track(i, frames.map(([t, f]) => { const sorted = [...labels].sort((a, b) => (f[b] ?? 0) - (f[a] ?? 0)); return [t, sorted.indexOf(l), 'soft']; }));
    return { r, bar, val, vt, order };
  });
  return { el, update(t) { rows.forEach(({ r, bar, val, vt, order }) => { const v = Math.max(0, vt(t)), bw = (W - LW - px(S, 140)) * (v / M); css(r, { top: order(t) * RH + 'px' }); css(bar, { width: bw + 'px' }); css(val, { left: LW + bw + px(S, 14) + 'px' }); setText(val, fmt(v)); }); } };
}

/**
 * milestones(S, parent, { x, y, w, anchor, items: [{ label, sub, t }], at, dur, vertical })
 * A line draws across; each milestone dot stamps when the line reaches it, its label blurs in.
 */
export function milestones(S, parent, { x = 0, y = 0, w = 1400, anchor = 'cl', items = [], at = 0, dur = 2.4, vertical = false, accentLast = true } = {}) {
  const L = px(S, w), D = px(S, 26);
  const el = box(parent, { x, y, w: vertical ? px(S, 10) : L, h: vertical ? L : px(S, 10), anchor });
  const line = h('div', { style: { position: 'absolute', left: vertical ? -px(S, 1.5) + 'px' : '0px', top: vertical ? '0px' : -px(S, 1.5) + 'px', width: vertical ? px(S, 3) + 'px' : '0px', height: vertical ? '0px' : px(S, 3) + 'px', background: 'var(--ui-text)' } });
  el.appendChild(line);
  const n = items.length;
  const M = items.map((it, i) => {
    const f = n === 1 ? 0.5 : i / (n - 1);
    const pos = f * L;
    const reach = at + dur * f;
    const dot = h('div', { style: { position: 'absolute', left: (vertical ? 0 : pos) - D / 2 + 'px', top: (vertical ? pos : 0) - D / 2 + 'px', width: D + 'px', height: D + 'px', borderRadius: '50%', background: accentLast && i === n - 1 ? 'var(--accent)' : 'var(--ui-text)', boxShadow: `0 0 0 ${px(S, 8)}px var(--ui-canvas)` } });
    const lab = h('div', { style: { position: 'absolute', ...(vertical ? { left: px(S, 44) + 'px', top: pos + 'px', transform: 'translateY(-50%)' } : { left: pos + 'px', top: (i % 2 ? px(S, 46) : -px(S, 46)) + 'px', transform: `translate(-50%, ${i % 2 ? '0' : '-100%'})`, textAlign: 'center' }) } });
    lab.appendChild(h('div', { text: it.label, style: ts(S, 'h3', { w: 'bold', color: accentLast && i === n - 1 ? 'var(--accent)' : 'var(--ui-text)' }) }));
    if (it.sub) lab.appendChild(h('div', { text: it.sub, style: { ...ts(S, 'small', { color: 'var(--ui-textMuted)' }), marginTop: px(S, 6) + 'px' } }));
    el.append(dot, lab);
    return { dot, lab, reach, pos };
  });
  return {
    el, reach: M.map((m) => m.reach), pos: M.map((m) => m.pos),
    update(t) {
      const p = ease('wipe')(seg(t, at, at + dur));
      css(line, vertical ? { height: L * p + 'px' } : { width: L * p + 'px' });
      M.forEach(({ dot, lab, reach }) => {
        const k = spr(t, reach, 'stamp');
        css(dot, { transform: `scale(${Math.max(0, k).toFixed(4)})`, opacity: t >= reach ? 1 : 0 });
        const v = vis(t, reach, null, { din: 0.05 });
        css(lab, { opacity: v.o, filter: v.blur > 0.05 ? `blur(${v.blur.toFixed(2)}px)` : 'none' });
      });
    },
  };
}

/**
 * flow(S, parent, { x, y, anchor, items: [{ icon, label, sub }], at, each, w, vertical })
 * Process steps: each node stamps in, the connector draws to the next one.
 */
export function flow(S, parent, { x = 0, y = 0, anchor = 'c', items = [], at = 0, each = 0.55, w = 1500, vertical = false, node = 150 } = {}) {
  const n = items.length, N = px(S, node), L = px(S, w);
  const step = n > 1 ? (L - N) / (n - 1) : 0;
  const el = box(parent, { x, y, w: vertical ? N : L, h: vertical ? L : N, anchor });
  const parts = items.map((it, i) => {
    const off = i * step;
    const nd = h('div', { style: { position: 'absolute', left: (vertical ? 0 : off) + 'px', top: (vertical ? off : 0) + 'px', width: N + 'px', height: N + 'px', borderRadius: px(S, T.ui.radius.tile) + 'px', background: i === n - 1 ? 'var(--accent)' : 'var(--ui-surface)', boxShadow: 'var(--ui-shadow)', outline: i === n - 1 ? 'none' : `${px(S, 1.5)}px solid var(--ui-border)`, outlineOffset: -px(S, 1.5) + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center' }, html: icon(it.icon || 'circle', N * 0.42, i === n - 1 ? '#FFFFFF' : 'var(--ui-text)') });
    const lab = h('div', { style: { position: 'absolute', ...(vertical ? { left: N + px(S, 30) + 'px', top: off + N / 2 + 'px', transform: 'translateY(-50%)' } : { left: off + N / 2 + 'px', top: N + px(S, 30) + 'px', transform: 'translateX(-50%)', textAlign: 'center' }) } });
    lab.appendChild(h('div', { text: it.label, style: ts(S, 'body', { w: 'semibold' }) }));
    if (it.sub) lab.appendChild(h('div', { text: it.sub, style: { ...ts(S, 'small', { color: 'var(--ui-textMuted)' }), marginTop: px(S, 6) + 'px' } }));
    let con = null;
    if (i < n - 1) {
      const len = step - N - px(S, 24);
      con = h('div', { style: { position: 'absolute', ...(vertical ? { left: N / 2 - px(S, 1.5) + 'px', top: off + N + px(S, 12) + 'px', width: px(S, 3) + 'px' } : { top: N / 2 - px(S, 1.5) + 'px', left: off + N + px(S, 12) + 'px', height: px(S, 3) + 'px' }), background: 'var(--ui-text)' } });
      con.__len = len;
      el.appendChild(con);
    }
    el.append(nd, lab);
    return { nd, lab, con, t0: at + i * each };
  });
  return {
    el,
    update(t) {
      parts.forEach(({ nd, lab, con, t0 }) => {
        const k = spr(t, t0, 'pop');
        css(nd, { opacity: clamp(k * 2), transform: `scale(${(0.6 + 0.4 * k).toFixed(4)})` });
        const v = vis(t, t0 + 0.05, null, { din: 0 }); css(lab, { opacity: v.o, filter: v.blur > 0.05 ? `blur(${v.blur.toFixed(2)}px)` : 'none' });
        if (con) { const p = ease('wipe')(seg(t, t0 + 0.2, t0 + each)); css(con, vertical ? { height: con.__len * p + 'px' } : { width: con.__len * p + 'px' }); }
      });
    },
  };
}

/** progress ring (single value) */
export function ring(S, parent, { x = 0, y = 0, size = 300, anchor = 'c', p = () => 0, thickness = 0.12, label = null } = {}) {
  const D = px(S, size), sw = D * thickness, R = D / 2 - sw / 2, C = 2 * Math.PI * R;
  const el = box(parent, { x, y, w: D, h: D, anchor });
  el.innerHTML = `<svg width="${D}" height="${D}" style="position:absolute;transform:rotate(-90deg)"><circle cx="${D / 2}" cy="${D / 2}" r="${R}" fill="none" stroke="${mutedCol(S)}" stroke-width="${sw}"/><circle class="f" cx="${D / 2}" cy="${D / 2}" r="${R}" fill="none" stroke="var(--accent)" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="0 ${C}"/></svg>`;
  const f = el.querySelector('.f');
  const lab = h('div', { style: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', ...ts(S, D * 0.22, { w: 'bold', track: -0.03 }) } }); el.appendChild(lab);
  return { el, update(t) { const v = clamp(p(t)); css(f, { strokeDasharray: `${(C * v).toFixed(2)} ${C}` }); setText(lab, label ? label(v) : Math.round(v * 100) + '%'); } };
}

export { pulse, eo, eio, lerp };
