// Card animations: stacks that flick through, flips, decks that deal, bento grids that assemble,
// notification stacks, quote cards. Interface-layer surfaces in paper or night.
import { defineScene } from '../scene.js';
import { h, css, setText, icon } from '../dom.js';
import { T, track, vis, seg, clamp, lerp, spr, ease, ep, fmtNum, hash01 } from '../engine.js';
import { ts, surface, toggle, avatar, notif } from '../ui.js';
import { barChart, ring, odometer } from '../charts.js';
import { blurIn, fstyle, highlight, highlightInline, caseOf } from '../type.js';
import { gizmo } from '../fx.js';

const P = (S, n) => n * S.u;
/** a feature card: accent icon tile, kicker, title, body */
function featureCard(S, parent, { w, hh, icon: ic = 'sparkles', kicker = '', title = '', body = '', tone = 'surface', big = false }) {
  const u = S.u;
  const el = h('div', { style: { position: 'absolute', left: -w / 2 * u + 'px', top: -hh / 2 * u + 'px', width: w * u + 'px', height: hh * u + 'px', ...surface(S, { r: 'card', tone }), overflow: 'hidden', boxSizing: 'border-box', padding: `${48 * u}px` } });
  el.innerHTML = `<div style="width:${(big ? 96 : 84) * u}px;height:${(big ? 96 : 84) * u}px;border-radius:${22 * u}px;background:var(--accent);display:flex;align-items:center;justify-content:center">${icon(ic, (big ? 52 : 46) * u, '#FFFFFF')}</div>`;
  if (kicker) el.appendChild(h('div', { text: caseOf('label', kicker), style: { ...ts(S, 20, { label: true, color: 'var(--ui-textMuted)' }), marginTop: 40 * u + 'px' } }));
  el.appendChild(h('div', { text: title, style: { ...ts(S, big ? 64 : 54, { w: 'bold', track: -0.03, wrap: true, lh: 1.08 }), marginTop: 14 * u + 'px' } }));
  if (body) el.appendChild(h('div', { text: body, style: { ...ts(S, 28, { color: 'var(--ui-textMuted)', wrap: true, lh: 1.35 }), marginTop: 18 * u + 'px' } }));
  parent.appendChild(el);
  return el;
}
const holder = (S, x, y) => { const d = h('div', { style: { position: 'absolute', left: x + 'px', top: y + 'px', width: '0px', height: '0px' } }); S.front.appendChild(d); return d; };

export const cardStack = defineScene({
  name: 'card-stack', kind: 'card', title: 'Card stack flick-through', theme: 'paper', formats: ['yt', 'reel', 'square'],
  description: 'A stack of feature cards in perspective; the front card flicks away on each beat and the stack springs forward, ending on the last card.',
  defaults: { format: 'yt', theme: 'paper', cards: [{ icon: 'clapperboard', kicker: '01', title: 'Cut on the beat', body: 'Every cut lands on a downbeat.' }, { icon: 'captions', kicker: '02', title: 'Captions that pop', body: 'Word-timed, two lines, your font.' }, { icon: 'audio-lines', kicker: '03', title: 'Real sound design', body: 'One recorded sound per move.' }, { icon: 'rocket', kicker: '04', title: 'Post everywhere', body: 'Reels, Shorts and TikTok.' }], every: 1.1, start: 0.9, end: 5.4 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const reel = ctx.reel;
    const w = reel ? 820 : 900, hh = reel ? 1000 : 640;
    const host = holder(S, S.W / 2, S.H / 2 + (reel ? 20 : 30) * u);
    css(host, { perspective: 2400 * u + 'px' });
    const n = p.cards.length;
    const cards = p.cards.map((c) => featureCard(S, host, { w, hh, ...c, big: true }));
    // card i leaves at start + i*every (except the last); position in stack = i − number gone
    const gone = (t) => p.cards.filter((_, i) => i < n - 1 && t >= p.start + i * p.every).length;
    const depth = cards.map((_, i) => track(i, Array.from({ length: Math.min(i, n - 1) }, (_, k) => [p.start + k * p.every, i - (k + 1), 'drop'])));
    ctx.add((t) => {
      cards.forEach((el, i) => {
        const leave = i < n - 1 ? p.start + i * p.every : Infinity;
        const d = Math.max(0, depth[i](t));
        const intro = spr(t, 0.1 + (n - 1 - i) * 0.08, 'drop');
        const fl = ease([0.5, 0, 0.75, 0.3])(seg(t, leave, leave + 0.45));
        const x = fl * S.W * 0.9, rot = fl * 22, y = -d * 44 * u - fl * 120 * u + (1 - intro) * 300 * u;
        const sc = (1 - d * 0.06) * (0.9 + 0.1 * intro);
        css(el, { transform: `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${(-d * 60 * u).toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`, opacity: String(clamp(intro * 2) * (1 - clamp((d - 2.6) * 2)) * (1 - fl * 0.6)), zIndex: String(100 - i), filter: d > 0.05 ? `brightness(${(1 - d * 0.04).toFixed(3)})` : 'none' });
      });
    });
    ctx.cue(0.1, 'appear', 'stack'); p.cards.forEach((_, i) => i < n - 1 && ctx.cue(p.start + i * p.every, 'movement', 'flick'));
    void gone;
  },
});

export const cardFlip = defineScene({
  name: 'card-flip', kind: 'card', title: 'Card flip (front → back)', theme: 'paper', formats: ['yt', 'reel', 'square'],
  description: 'A card drops in showing a question or a before; it flips in 3D to reveal the answer or the after on the accent side.',
  defaults: { format: 'yt', theme: 'paper', front: { icon: 'circle-alert', kicker: 'Before', title: '3 hours per reel', body: 'Cutting, captions, music, exports.' }, back: { icon: 'zap', kicker: 'After', title: '10 minutes', body: 'Describe it. Review it. Post it.' }, flip: 1.8, end: 4.2 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const reel = ctx.reel;
    const w = reel ? 800 : 820, hh = reel ? 900 : 620;
    const host = holder(S, S.W / 2, S.H / 2); css(host, { perspective: 2600 * u + 'px' });
    const card = h('div', { style: { position: 'absolute', left: '0px', top: '0px', transformStyle: 'preserve-3d' } }); host.appendChild(card);
    const f = featureCard(S, card, { w, hh, ...p.front, big: true });
    const b = featureCard(S, card, { w, hh, ...p.back, big: true, tone: 'accent' });
    css(f, { backfaceVisibility: 'hidden' }); css(b, { backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', color: '#FFFFFF' });
    b.querySelectorAll('div').forEach((d) => { if (d.style.color) css(d, { color: d.style.color.includes('Muted') ? 'rgba(255,255,255,.8)' : '#FFFFFF' }); });
    css(b.firstChild, { background: '#FFFFFF' }); b.firstChild.innerHTML = icon(p.back.icon, 52 * u, 'var(--accent)');
    ctx.add((t) => {
      const intro = spr(t, 0.1, 'drop'), fl = ease('wipe')(seg(t, p.flip, p.flip + 0.7));
      const dip = 1 - 0.08 * Math.sin(Math.PI * fl);
      css(card, { transform: `translateY(${((1 - intro) * 260 * u).toFixed(2)}px) rotateY(${(fl * 180).toFixed(3)}deg) rotateZ(${(Math.sin(Math.PI * fl) * -4).toFixed(2)}deg) scale(${(dip * (0.9 + 0.1 * intro)).toFixed(4)})`, opacity: String(clamp(intro * 2)) });
    });
    ctx.cue(0.1, 'appear', 'card'); ctx.cue(p.flip, 'movement', 'flip'); ctx.cue(p.flip + 0.6, 'reveal', 'back');
  },
});

export const cardDeal = defineScene({
  name: 'card-deal', kind: 'card', title: 'Deal a hand of cards', theme: 'night', formats: ['yt', 'reel', 'square'],
  description: 'Cards fly out of a deck one by one into a fanned row (a column on Reels), settle on drop springs, then the chosen card lifts and gets the selection box.',
  defaults: { format: 'yt', theme: 'night', cards: [{ icon: 'clapperboard', title: 'Hook' }, { icon: 'captions', title: 'Captions' }, { icon: 'audio-lines', title: 'Sound' }, { icon: 'chart-line', title: 'Data' }, { icon: 'rocket', title: 'Launch' }], pick: 2, at: 0.4, each: 0.22, end: 4.6 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const reel = ctx.reel; const n = p.cards.length;
    const cw = reel ? 360 : 300, ch = reel ? 220 : 400;
    const host = holder(S, S.W / 2, S.H / 2);
    const slots = p.cards.map((_, i) => { const k = i - (n - 1) / 2; return reel ? { x: (i % 2 ? 1 : -1) * 24, y: k * (ch + 40), r: (i % 2 ? 1 : -1) * 1.5 } : { x: k * (cw + 36), y: Math.abs(k) * 18, r: k * 4 }; });
    const deckY = reel ? S.H / 2 / u + 300 : S.H / 2 / u + 260;
    const els = p.cards.map((c, i) => {
      const el = h('div', { style: { position: 'absolute', left: -cw / 2 * u + 'px', top: -ch / 2 * u + 'px', width: cw * u + 'px', height: ch * u + 'px', ...surface(S, { r: 'tile', tone: 'surface' }), display: 'flex', flexDirection: reel ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: 22 * u + 'px' } });
      el.innerHTML = `<div style="width:${96 * u}px;height:${96 * u}px;border-radius:${24 * u}px;background:${i === p.pick ? 'var(--accent)' : 'var(--ui-surfaceAlt)'};display:flex;align-items:center;justify-content:center">${icon(c.icon, 50 * u, i === p.pick ? '#FFFFFF' : 'var(--ui-text)')}</div>`;
      el.appendChild(h('div', { text: c.title, style: ts(S, 40, { w: 'bold', track: -0.02 }) }));
      host.appendChild(el); return el;
    });
    const liftT = p.at + n * p.each + 0.7;
    const sl = slots[p.pick];
    const gz = gizmo(S, host, { x: (sl.x - cw / 2 - 16) * u, y: (sl.y - ch / 2 - 16 - 30) * u, w: (cw + 32) * u, h: (ch + 32) * u, at: liftT + 0.15, label: caseOf('label', p.cards[p.pick].title) });
    ctx.add(gz);
    ctx.add((t) => {
      els.forEach((el, i) => {
        const t0 = p.at + i * p.each, k = spr(t, t0, 'drop'), m = ease('snap')(seg(t, t0, t0 + 0.4));
        const s = slots[i];
        const x = lerp(0, s.x, m), y = lerp(deckY, s.y, m) , r = lerp(-12 + i * 3, s.r, k);
        const lift = i === p.pick ? spr(t, liftT, 'pop') : 0, dim = i !== p.pick && t > liftT ? clamp((t - liftT) / 0.3) : 0;
        css(el, { display: t >= t0 - 0.05 ? 'flex' : 'none', transform: `translate(${(x * u).toFixed(2)}px,${((y - 30 * lift) * u).toFixed(2)}px) rotate(${(r * (1 - lift)).toFixed(2)}deg) scale(${(0.9 + 0.1 * clamp(k) + 0.06 * lift).toFixed(4)})`, opacity: String(1 - 0.55 * dim), zIndex: String(i === p.pick && lift > 0 ? 50 : i) });
      });
    });
    p.cards.forEach((_, i) => ctx.cue(p.at + i * p.each, 'movement', 'deal')); ctx.cue(liftT, 'stamp', 'pick'); ctx.cue(liftT + 0.15, 'tick', 'selection');
  },
});

export const cardBento = defineScene({
  name: 'card-bento', kind: 'card', title: 'Bento grid assembles', theme: 'paper', formats: ['yt', 'reel', 'square'],
  description: 'A feature grid of tiles that blur-scale in one after another, each with a live mini-UI: a counter, bars, a toggle, a ring, avatars, a line of copy.',
  defaults: { format: 'yt', theme: 'paper', tiles: [{ kind: 'title', title: 'Everything your reel needs', span: [2, 1] }, { kind: 'stat', title: 'Formats', value: 4, suffix: '' }, { kind: 'toggle', title: 'Auto-captions' }, { kind: 'bars', title: 'Retention', values: [0.4, 0.55, 0.5, 0.8, 0.95] }, { kind: 'ring', title: 'Render', value: 1 }, { kind: 'avatars', title: 'Made for teams' }, { kind: 'text', title: 'One accent. One idea per shot.', span: [1, 1] }], at: 0.3, each: 0.12, end: 4.4 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const reel = ctx.reel;
    const cols = reel ? 2 : 4, gap = 24, padX = reel ? 70 : 120;
    const cell = (S.W / u - padX * 2 - gap * (cols - 1)) / cols, rowH = reel ? cell * 1.0 : cell * 0.78;
    // pack tiles left→right, top→bottom
    const grid = []; const place = (sp) => { for (let r = 0; ; r++) for (let c = 0; c <= cols - sp[0]; c++) { let ok = true; for (let dy = 0; dy < sp[1]; dy++) for (let dx = 0; dx < sp[0]; dx++) if ((grid[r + dy] || [])[c + dx]) ok = false; if (ok) { for (let dy = 0; dy < sp[1]; dy++) for (let dx = 0; dx < sp[0]; dx++) { grid[r + dy] = grid[r + dy] || []; grid[r + dy][c + dx] = 1; } return [c, r]; } } };
    const pos = p.tiles.map((tl) => ({ tl, sp: [Math.min(cols, (tl.span || [1, 1])[0]), (tl.span || [1, 1])[1]] })).map((o) => ({ ...o, at: place(o.sp) }));
    const rows = Math.max(...pos.map((o) => o.at[1] + o.sp[1]));
    const totH = rows * rowH + (rows - 1) * gap, oy = (S.H / u - totH) / 2;
    const els = pos.map(({ tl, sp, at: [c, r] }, i) => {
      const x = padX + c * (cell + gap), y = oy + r * (rowH + gap), w = sp[0] * cell + (sp[0] - 1) * gap, hh = sp[1] * rowH + (sp[1] - 1) * gap;
      const el = h('div', { style: { position: 'absolute', left: x * u + 'px', top: y * u + 'px', width: w * u + 'px', height: hh * u + 'px', ...surface(S, { r: 'tile', tone: tl.kind === 'title' ? 'control' : 'surface' }), overflow: 'hidden', boxSizing: 'border-box', padding: `${30 * u}px` } });
      S.front.appendChild(el);
      const lab = (s, col = 'var(--ui-textMuted)') => el.appendChild(h('div', { text: caseOf('label', s), style: ts(S, 18, { label: true, color: col }) }));
      const t0 = p.at + i * p.each; let upd = null;
      if (tl.kind === 'title') el.appendChild(h('div', { text: tl.title, style: { ...ts(S, reel ? 54 : 58, { w: 'bold', track: -0.03, wrap: true, lh: 1.05, color: 'var(--ui-onControl)' }), position: 'absolute', left: 30 * u + 'px', bottom: 28 * u + 'px', right: 30 * u + 'px' } }));
      else if (tl.kind === 'stat') { lab(tl.title); const o = odometer(S, el, { x: 30 * u, y: hh * u - 30 * u, anchor: 'bl', value: (t) => lerp(0, tl.value, ease('snap')(seg(t, t0 + 0.2, t0 + 1.2))), size: reel ? 150 : 130, font: 'display', digits: String(tl.value).length, suffix: tl.suffix || '', color: 'var(--accent)' }); css(o.el, { position: 'absolute' }); upd = (t) => o.update(t); }
      else if (tl.kind === 'toggle') { lab(tl.title); const tg = toggle(S, el, { x: 30 * u, y: hh * u - 30 * u, anchor: 'bl', on: [[t0 + 0.7, true]], size: 1.6 }); upd = (t) => tg.update(t); }
      else if (tl.kind === 'bars') { lab(tl.title); const bc = barChart(S, el, { x: 30 * u, y: 56 * u, anchor: 'tl', w: w - 60, h: hh - 86, values: tl.values, labels: [], accent: tl.values.length - 1, showValues: false, axis: false, at: t0 + 0.3, stagger: 0.06 }); upd = (t) => bc.update(t); }
      else if (tl.kind === 'ring') { lab(tl.title); const rg = ring(S, el, { x: w / 2 * u, y: (hh / 2 + 16) * u, size: Math.min(w, hh) * 0.62, p: (t) => tl.value * ease('drift')(seg(t, t0 + 0.3, t0 + 1.8)) }); upd = (t) => rg.update(t); }
      else if (tl.kind === 'avatars') { lab(tl.title); ['AK', 'MR', 'JS', 'TN'].forEach((ini, k) => { const a = avatar(S, el, { x: (30 + k * 52) * u, y: hh * u - 30 * u, anchor: 'bl', size: 76, initials: ini, tone: k === 0 ? 'accent' : k % 2 ? 'control' : 'sunken' }); css(a, { outline: `${4 * u}px solid var(--ui-surface)` }); }); }
      else el.appendChild(h('div', { text: tl.title, style: { ...ts(S, reel ? 36 : 34, { w: 'semibold', track: -0.02, wrap: true, lh: 1.15 }) } }));
      return { el, t0, upd };
    });
    ctx.add((t) => els.forEach(({ el, t0, upd }) => { const v = vis(t, t0, null, { din: 0, lin: 0.34, blur: 16 }); css(el, { opacity: v.o, filter: v.blur > 0.05 ? `blur(${v.blur.toFixed(2)}px)` : 'none', transform: `scale(${(0.9 + 0.1 * clamp(spr(t, t0, 'drop'))).toFixed(4)})` }); if (upd) upd(t); }));
    els.forEach(({ t0 }) => ctx.cue(t0, 'appear', 'tile'));
  },
});

export const cardNotify = defineScene({
  name: 'card-notify', kind: 'card', title: 'Notification stack', theme: 'night', formats: ['yt', 'reel', 'square'],
  description: 'Notifications drop in at the top one by one; older ones slide down and compress into a stack behind, like a lock screen.',
  defaults: { format: 'reel', theme: 'night', items: [{ app: 'Instagram', title: 'Your reel hit 10k views', ic: 'heart' }, { app: 'Signal', title: 'New edit ready to review', ic: 'clapperboard' }, { app: 'YouTube', title: 'Short published', ic: 'circle-play' }, { app: 'Analytics', title: 'Best week this month', ic: 'trending-up' }], at: 0.4, each: 0.9, end: 4.8 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const reel = ctx.reel; const n = p.items.length;
    const w = reel ? 900 : 760, x = S.W / 2, top = reel ? ctx.safe.top + 120 : 160;
    const cards = p.items.map((it, i) => notif(S, S.front, { x, y: top, anchor: 'tc', w, app: it.app, title: it.title, body: it.body || '', time: 'now', ic: it.ic, at: 0 }));
    const rowH = (cards[0].h / u + 22);
    ctx.add((t) => cards.forEach((c, i) => {
      const t0 = p.at + i * p.each;
      if (t < t0) { css(c.el, { display: 'none' }); return; }
      const newer = p.items.filter((_, k) => k > i && t >= p.at + k * p.each).length;
      const pos = track(0, Array.from({ length: n - 1 - i }, (_, k) => [p.at + (i + k + 1) * p.each, k + 1, 'drop']))(t);
      const k = spr(t, t0, 'pop');
      const comp = Math.max(0, pos - 2);
      css(c.el, { display: 'flex', zIndex: String(100 + i), opacity: String(clamp(k * 1.6) * (1 - clamp(comp * 0.6))), transform: `translateY(${((Math.min(pos, 2) * rowH + comp * 18) * u - (1 - k) * 60 * u).toFixed(2)}px) scale(${((0.9 + 0.1 * k) * (1 - comp * 0.05)).toFixed(4)})`, transformOrigin: '50% 0%' });
      void newer;
    }));
    p.items.forEach((_, i) => ctx.cue(p.at + i * p.each, 'notify', 'notification'));
  },
});

export const cardQuote = defineScene({
  name: 'card-quote', kind: 'card', title: 'Quote card', theme: 'paper', formats: ['yt', 'reel', 'square'],
  description: 'A quote card: the accent quote mark stamps, the words blur in, the key phrase gets the signal plate, then the name and role. Use real quotes only.',
  defaults: { format: 'yt', theme: 'paper', quote: 'Put a real quote from a real person here, with the line that matters highlighted.', key: 'the line that matters', name: 'Their Name', role: 'Their role · Company', initials: 'TN', end: 5.2 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const reel = ctx.reel;
    const w = reel ? 900 : 1300, hh = reel ? 1100 : 640;
    const host = holder(S, S.W / 2, S.H / 2);
    const card = h('div', { style: { position: 'absolute', left: -w / 2 * u + 'px', top: -hh / 2 * u + 'px', width: w * u + 'px', height: hh * u + 'px', ...surface(S, { r: 'card' }), boxSizing: 'border-box', padding: `${70 * u}px` } });
    host.appendChild(card);
    const qm = h('div', { text: '“', style: { fontFamily: '"IS display"', fontSize: 220 * u + 'px', lineHeight: '0.8', color: 'var(--accent)', height: 120 * u + 'px' } }); card.appendChild(qm);
    const qt = h('div', { style: { ...ts(S, reel ? 58 : 54, { w: 'semibold', track: -0.025, wrap: true, lh: 1.18 }), marginTop: 10 * u + 'px' } }); card.appendChild(qt);
    const ki = p.key ? p.quote.indexOf(p.key) : -1; const parts = [];
    const pushW = (s) => s.split(/(\s+)/).filter(Boolean).forEach((x) => parts.push({ s: x, sp: /^\s+$/.test(x) }));
    if (ki >= 0) { pushW(p.quote.slice(0, ki)); parts.push({ s: p.key, key: true }); pushW(p.quote.slice(ki + p.key.length)); } else pushW(p.quote);
    const units = parts.map((q) => { const sp = h('span', { text: q.s, style: { display: 'inline', whiteSpace: q.key ? 'normal' : 'pre' } }); qt.appendChild(sp); return { el: sp, inner: sp, ch: q.s, space: q.sp, key: q.key }; });
    const kU = units.find((x) => x.key);
    const wEnd = 0.6 + units.filter((x) => !x.space).length * 0.05;
    const hl = kU ? highlightInline(kU.inner, { at: wEnd + 0.3, textOn: T.color.ink, dur: 0.7 }) : null;
    const by = h('div', { style: { position: 'absolute', left: 70 * u + 'px', bottom: 60 * u + 'px', display: 'flex', alignItems: 'center', gap: 20 * u + 'px' } });
    by.innerHTML = `<div style="width:${80 * u}px;height:${80 * u}px;border-radius:50%;background:var(--ui-control);color:var(--ui-onControl);display:flex;align-items:center;justify-content:center;font:620 ${30 * u}px 'IS ui'">${p.initials}</div><div><div style="font:680 ${32 * u}px 'IS ui';letter-spacing:-0.01em">${p.name}</div><div style="font:400 ${24 * u}px 'IS ui';color:var(--ui-textMuted);margin-top:${4 * u}px">${p.role}</div></div>`;
    card.appendChild(by);
    ctx.add((t) => {
      const k = spr(t, 0.1, 'drop'); css(card, { transform: `translateY(${((1 - k) * 200 * u).toFixed(2)}px)`, opacity: String(clamp(k * 2)) });
      const q = spr(t, 0.35, 'stamp'); css(qm, { transform: `scale(${Math.max(0, q).toFixed(4)})`, transformOrigin: '20% 60%' });
      let i = 0; units.forEach((x) => { if (x.space) return; const v = vis(t, 0.6 + i * 0.05, null, { din: 0, lin: 0.3, blur: 10 }); css(x.el, { opacity: v.o, filter: v.blur > 0.05 ? `blur(${v.blur.toFixed(2)}px)` : 'none' }); i++; });
      if (hl) hl(t);
      const bv = vis(t, wEnd + 0.7, null, { din: 0 }); css(by, { opacity: bv.o, transform: `translateY(${(1 - bv.a) * 16 * u}px)` });
    });
    ctx.cue(0.1, 'appear', 'card'); ctx.cue(0.35, 'stamp', 'quote mark'); if (hl) ctx.cue(wEnd + 0.3, 'appear', 'highlight'); ctx.cue(wEnd + 0.7, 'appear', 'byline');
  },
});

export const CARDS = [cardStack, cardFlip, cardDeal, cardBento, cardNotify, cardQuote];
