// Ink & Signal — kinetic typography for the motion engine.
// Lines are split into per-character or per-word spans so each unit can move on its own beat.
import { h, css, setText } from './dom.js';
import { T, track, vis, seg, eo, eio, clamp, lerp, spr, ease, hash01, kf } from './engine.js';
import { applyCase } from '../core.js';
import { px } from './ui.js';

const FAM = { display: '"IS display"', label: '"IS label"', hud: '"IS hud"', note: '"IS note"', noteSoft: '"IS noteSoft"', data: '"IS data"', dataSoft: '"IS dataSoft"', body: '"IS body"', ui: '"IS ui"', italic: '"IS italic"' };
const LH = { display: 0.86, label: 1, hud: 1.05, note: 0.95, noteSoft: 1, data: 1.2, dataSoft: 1.2, body: 1.35, ui: 1.05, italic: 1.05 };

/** font style object for a role. ui/italic accept wght (100-900) and wdth (62-125) */
export function fstyle(S, font = 'display', size = 120, { wght = 800, wdth = 100, tracking = null, color = 'var(--ui-text)', lh = null } = {}) {
  const tok = T.font[font];
  const st = { fontFamily: FAM[font] || FAM.ui, fontSize: px(S, size) + 'px', lineHeight: String(lh ?? LH[font] ?? 1.1), color, whiteSpace: 'pre', letterSpacing: (tracking ?? (tok && tok.tracking) ?? (font === 'ui' || font === 'italic' ? -0.03 : 0)) + 'em' };
  if (font === 'ui' || font === 'italic') { st.fontVariationSettings = `"wght" ${wght}, "wdth" ${wdth}`; st.fontWeight = String(wght); }
  return st;
}
export const caseOf = (font, s) => (T.font[font] && T.font[font].case === 'upper' ? applyCase(s, font) : s);

/**
 * kline(S, parent, { x, y, anchor, text, font, size, split: 'chars'|'words'|null, mask: true, ...fstyle opts })
 * → { el, units: [{ el, inner, ch }], width, height }
 * mask: each unit sits in an overflow-hidden wrapper so it can rise out of a line.
 */
export function kline(S, parent, { x = 0, y = 0, anchor = 'c', text = '', font = 'display', size = 120, split = 'chars', mask = false, style = {}, ...o } = {}) {
  const s = caseOf(font, text);
  const el = h('div', { style: { position: 'absolute', left: x + 'px', top: y + 'px', display: 'flex', alignItems: 'baseline', transform: `translate(${{ l: '0', c: '-50%', r: '-100%' }[anchor.length === 1 ? 'c' : anchor[1]]},${{ t: '0', c: '-50%', b: '-100%' }[anchor.length === 1 ? 'c' : anchor[0]]})`, ...fstyle(S, font, size, o), ...style } });
  const parts = split === 'chars' ? [...s] : split === 'words' ? s.split(/(\s+)/).filter((w) => w.length) : [s];
  const units = parts.map((ch) => {
    const space = /^\s+$/.test(ch);
    const inner = h('span', { text: ch, style: { display: 'inline-block', whiteSpace: 'pre' } });
    if (mask && !space) {
      const wrap = h('span', { style: { display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', paddingBottom: '0.08em', marginBottom: '-0.08em', paddingTop: '0.06em', marginTop: '-0.06em' } }, inner);
      el.appendChild(wrap); return { el: wrap, inner, ch, space };
    }
    el.appendChild(inner); return { el: inner, inner, ch, space };
  });
  parent.appendChild(el);
  return { el, units: units, letters: units.filter((u) => !u.space), text: s };
}

/* ───────── effects (call inside update) ───────── */

/** letters rise out of their mask one by one */
export function maskRise(units, t, t0, each = 0.03, dur = 0.42, e = 'snap', from = 1.08) {
  let k = 0;
  for (const u of units) { if (u.space) continue; const p = ease(e)(seg(t, t0 + k * each, t0 + k * each + dur)); css(u.inner, { transform: `translateY(${((1 - p) * from * 100).toFixed(2)}%)` }); k++; }
}
/** units blur-slide in (direction dx, dy in em) */
export function blurIn(units, t, t0, each = 0.05, { dx = 0, dy = 0.35, lin = 0.3, blur = 14 } = {}) {
  let k = 0;
  for (const u of units) { if (u.space) continue; const v = vis(t, t0 + k * each, null, { din: 0, lin, blur }); css(u.el, { opacity: v.o, filter: v.blur > 0.05 ? `blur(${v.blur.toFixed(2)}px)` : 'none', transform: `translate(${((1 - v.a) * dx).toFixed(3)}em,${((1 - v.a) * dy).toFixed(3)}em)` }); k++; }
}
/** show the first n units (type-on) */
export function typeOn(units, t, t0, cps = 25) {
  const n = Math.floor((t - t0) * cps); let k = 0;
  for (const u of units) { css(u.el, { visibility: k < n ? 'visible' : 'hidden' }); k++; }
}
/** slam: lands from big with a rotate, stamp spring. el is the whole line (transform origin centre) */
export function slam(el, t, at, { from = 2.4, rot = -10, endRot = 0, base = '' } = {}) {
  if (t < at) { css(el, { opacity: 0 }); return; }
  const k = spr(t, at, 'stamp');
  css(el, { opacity: 1, transform: `${base} scale(${lerp(from, 1, k).toFixed(4)}) rotate(${lerp(rot, endRot, clamp(k)).toFixed(3)}deg)` });
}
/** variable-font morph: keys [[t, { wght, wdth }, preset?]] → sets font-variation-settings */
export function morphAxes(el, keys, start = { wght: 100, wdth: 62 }, preset = 'soft') {
  const W = track(start.wght, keys.map(([t, v, p]) => [t, v.wght ?? start.wght, p || preset]));
  const D = track(start.wdth, keys.map(([t, v, p]) => [t, v.wdth ?? start.wdth, p || preset]));
  return (t) => { const w = clamp(W(t), 100, 900), d = clamp(D(t), 62, 125); css(el, { fontVariationSettings: `"wght" ${w.toFixed(1)}, "wdth" ${d.toFixed(2)}`, fontWeight: String(Math.round(w)) }); return { w, d }; };
}
/** decode: characters scramble through a glyph set and lock left → right over [t0, t0+dur] */
export function decode(el, finalText, t, t0, dur = 0.9, { seed = 3, set = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=/<>', fps = 30, keep = ' ·,.-' } = {}) {
  const s = [...finalText]; const p = seg(t, t0, t0 + dur);
  if (t < t0) { setText(el, ''); return; }
  const lock = Math.floor(p * (s.length + 1)); const tick = Math.floor(t * fps / 2);
  setText(el, s.map((ch, i) => (i < lock || keep.includes(ch) ? ch : set[Math.floor(hash01(i * 131 + tick, seed) * set.length)])).join(''));
}
/** handwriting reveal (left → right clip) for note text */
export function handwrite(el, t, t0, dur = (T.duration.writeOn / 30), e = 'write') {
  const p = ease(e)(seg(t, t0, t0 + dur));
  css(el, { clipPath: `inset(-20% ${((1 - p) * 100).toFixed(2)}% -30% -5%)`, opacity: t >= t0 ? 1 : 0 });
}

/**
 * highlight(S, host, wordEl, { at, color, textOn, pad, dur }) — a square signal plate sweeps left → right
 * behind a word; the word turns ink as the plate passes. Returns update(t).
 */
export function highlight(S, wordEl, { at = 0, dur = T.motion.highlight.sweep, color = 'var(--accent)', textOn = T.color.ink, textOff = null, pad = T.motion.highlight.padEm, out = null } = {}) {
  const plate = h('span', { style: { position: 'absolute', left: `-${pad[0]}em`, right: `-${pad[0]}em`, top: `${-pad[1]}em`, bottom: `${-pad[1] - 0.04}em`, background: color, transformOrigin: '0 50%', zIndex: '-1' } });
  css(wordEl, { position: 'relative', zIndex: '0', isolation: 'isolate' });
  wordEl.insertBefore(plate, wordEl.firstChild);
  const base = textOff || wordEl.style.color || '';
  return (t) => {
    const p = ease('wipe')(seg(t, at, at + dur)) * (out != null ? 1 - ease('exit')(seg(t, out, out + dur * 0.8)) : 1);
    css(plate, { transform: `scaleX(${p.toFixed(4)})` });
    css(wordEl, { color: p > 0.55 ? textOn : base });
  };
}

/**
 * rotator(S, parent, { x, y, anchor, words, times, font, size, ...fstyle }) — slot that cycles words:
 * old word lifts out with blur, new word rises in. Returns { el, update(t), width }.
 */
export function rotator(S, parent, { x = 0, y = 0, anchor = 'cl', words = [], times = [], font = 'ui', size = 90, plate = false, ...o } = {}) {
  const el = h('div', { style: { position: 'absolute', left: x + 'px', top: y + 'px', display: 'inline-block', transform: `translate(${{ l: '0', c: '-50%', r: '-100%' }[anchor[1] || 'c']},-50%)` } });
  const ws = words.map((w) => { const d = h('div', { text: caseOf(font, w), style: { position: 'absolute', left: '0px', top: '0px', ...fstyle(S, font, size, o), padding: plate ? '0 0.12em' : '0', background: plate ? 'var(--accent)' : 'transparent' } }); el.appendChild(d); return d; });
  const sizer = h('div', { text: caseOf(font, words.reduce((a, b) => (b.length > a.length ? b : a), '')), style: { visibility: 'hidden', ...fstyle(S, font, size, o), padding: plate ? '0 0.12em' : '0' } });
  el.appendChild(sizer);
  parent.appendChild(el);
  return {
    el, words: ws,
    update(t) {
      ws.forEach((d, i) => {
        const tin = i === 0 ? null : times[i - 1], tout = times[i] ?? null;
        const a = tin == null ? 1 : eo(seg(t, tin, tin + 0.32)), b = tout == null ? 0 : eio(seg(t, tout, tout + 0.26));
        const o2 = a * (1 - b);
        css(d, { display: o2 < 0.002 ? 'none' : '', opacity: o2, transform: `translateY(${((1 - a) * 0.6 - b * 0.6).toFixed(3)}em)`, filter: (1 - a) + b > 0.02 ? `blur(${(((1 - a) + b) * 10).toFixed(2)}px)` : 'none' });
      });
    },
  };
}

/**
 * outlineWall(S, parent, { word, rows, size, at, speed, solidRow, color }) — the word repeated as outline
 * text in rows that slide in alternate directions, one row solid. Fills the frame for high-energy beats.
 */
export function outlineWall(S, parent, { word = 'SIGNAL', rows = 7, size = 200, speed = 260, solidRow = null, color = 'var(--accent)', stroke = 2.5, font = 'display', gapEm = 0.35 } = {}) {
  const s = caseOf(font, word);
  const el = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: S.W + 'px', height: S.H + 'px', overflow: 'hidden' } });
  const rowH = S.H / rows;
  const R = [];
  for (let r = 0; r < rows; r++) {
    const line = h('div', { style: { position: 'absolute', left: '0px', top: r * rowH + (rowH - px(S, size) * 0.86) / 2 + 'px', ...fstyle(S, font, size), whiteSpace: 'nowrap', color: r === solidRow ? color : 'transparent', WebkitTextStroke: r === solidRow ? '0' : `${px(S, stroke)}px ${color}` } });
    line.textContent = Array(12).fill(s).join(' ');
    el.appendChild(line); R.push(line);
  }
  parent.appendChild(el);
  const unit = () => R[0].scrollWidth / 12;
  let U = null;
  return { el, update(t) { if (U == null) U = unit(); R.forEach((line, r) => { const dir = r % 2 ? 1 : -1; const off = ((t * speed * S.u) % U + U) % U; css(line, { transform: `translateX(${(dir < 0 ? -off - U : off - 2 * U).toFixed(2)}px)` }); }); } };
}

export { kf, eo, eio, seg, clamp };
