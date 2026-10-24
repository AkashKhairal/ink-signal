// x-demo — the calm product demo (30–90 s). Airy paper canvas, one short line at a time that the camera
// pushes into (key phrase gets a signal plate), the product's UI rebuilt and filmed up close while it is used,
// pull-backs that show where you are, integrations, a rotating-word closer and an end card.
// Structure adapted from explainer-default (Barty-Bart/motion-graphics, MIT), rebuilt in Ink & Signal.
import { defineScene } from '../scene.js';
import { h, css, setText, icon, textWidth } from '../dom.js';
import { T, track, vis, seg, clamp, lerp, spr, ease, ep, typed, kf, eo, eio, hash01, pulse } from '../engine.js';
import { ts, text as uiText, input as inputUI, chips as chipsUI, button as buttonUI, steps as stepsUI, table as tableUI, chat as chatUI, appShell, fontStr, badge } from '../ui.js';
import { lineChart, odometer } from '../charts.js';
import { blurIn, highlight, rotator, fstyle, caseOf, kline, maskRise } from '../type.js';
import { gizmo, glyphRow, note } from '../fx.js';
import { cursor } from '../cursor.js';
import { rooms, camKeys } from '../rooms.js';
import { crumplePlate } from '../../render2d.js';

const C = T.color;
const DUR = { open: 4.4, line: 3.0, prompt: 8.4, steps: 7.6, table: 8.4, chat: 7.6, chart: 7.0, integrations: 5.2, closer: 6.2, end: 3.4 };
const uiDur = (f) => f.dur ?? DUR[f.ui] ?? 7.5;

/** room plan (pure): durations in order → used for duration() and build() */
export function demoPlan(p) {
  const list = [{ k: 'open', dur: DUR.open }];
  if (p.problem) list.push({ k: 'line', dur: DUR.line, text: p.problem, key: p.problemKey });
  for (const f of p.features) { list.push({ k: 'line', dur: DUR.line, text: f.title, key: f.key }); list.push({ k: f.ui, dur: uiDur(f), f }); }
  if (p.integrations && p.integrations.length) list.push({ k: 'integrations', dur: DUR.integrations });
  if (p.closer) list.push({ k: 'closer', dur: DUR.closer });
  list.push({ k: 'end', dur: DUR.end });
  let t = 0; list.forEach((r) => { r.t0 = t; t += r.dur; r.t1 = t; });
  return { list, end: t };
}

/** a line of small text that the camera pushes into; the key phrase becomes one unit (for the highlight) */
function lineEl(S, parent, text, key, size = 30) {
  const el = h('div', { style: { position: 'absolute', left: '0px', top: '0px', transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'baseline', whiteSpace: 'pre', ...fstyle(S, 'ui', size, { wght: 540, wdth: 100, color: C.ink, tracking: -0.02 }) } });
  const parts = []; let rest = text;
  const ki = key ? text.indexOf(key) : -1;
  const push = (s, isKey) => { if (!s) return; if (isKey) parts.push({ s, key: true }); else s.split(/(\s+)/).filter(Boolean).forEach((w) => parts.push({ s: w, space: /^\s+$/.test(w) })); };
  if (ki >= 0) { push(text.slice(0, ki)); push(key, true); push(text.slice(ki + key.length)); } else push(rest);
  const units = parts.map((q) => { const sp = h('span', { text: q.s, style: { display: 'inline-block', whiteSpace: 'pre' } }); el.appendChild(sp); return { el: sp, inner: sp, ch: q.s, space: !!q.space, key: !!q.key }; });
  parent.appendChild(el);
  return { el, units, keyU: units.find((x) => x.key), width: el.offsetWidth };
}

export const xDemo = defineScene({
  name: 'x-demo', kind: 'explainer', title: 'Product demo (30–90 s)',
  description: 'Calm SaaS demo: “Introducing”, the name in a selection box, short lines the camera pushes into with a signal highlight, the product UI rebuilt up close (prompt typing, agent steps, a table filling, chat, a real chart), integrations, a rotating-word closer and an end card.',
  formats: ['yt', 'reel'], theme: 'paper',
  defaults: {
    format: 'yt', product: 'Signal', intro: 'Introducing', screen: 'New video',
    problem: 'Still editing every reel by hand?', problemKey: 'by hand',
    features: [
      { title: 'Describe the video you want.', key: 'Describe', ui: 'prompt', heading: 'What should we make?', prompt: 'A 30 second reel about my morning routine', chips: ['Talking head', 'Beat-synced', 'Captions'], button: 'Make it' },
      { title: 'An agent plans every cut.', key: 'every cut', ui: 'steps', prompt: 'A 30 second reel about my morning routine', agent: 'Signal agent', steps: ['Transcribing 4 clips', 'Finding the hook', 'Cutting on the beat', 'Adding captions and sound'], result: 'Plan ready', resultMeta: '14 shots · 0:30', button: 'Open plan' },
      { title: 'Review it like a doc.', key: 'like a doc', ui: 'table', heading: 'Edit plan', cols: [{ label: 'Shot', w: 0.12, mono: true }, { label: 'Line', w: 0.48 }, { label: 'Graphic', w: 0.22 }, { label: 'Sound', w: 0.18, accent: true }], rows: [['01', 'Five things I do before 7am', 'Hook title', 'Impact'], ['02', 'First, no phone for an hour', 'Captions', 'Pop'], ['03', 'Cold water, then coffee', 'Lower third', 'Whoosh'], ['04', 'Ten minutes of writing', 'Note + arrow', 'Click'], ['05', 'Then the hardest task', 'Chapter card', 'Riser']], think: 3, button: 'Export' },
    ],
    integrations: ['Premiere Pro', 'After Effects', 'DaVinci Resolve', 'YouTube', 'Instagram', 'TikTok', 'Drive', 'Dropbox'],
    integrationsLine: 'Built for the tools you already use.',
    closer: { before: 'Do all your', words: ['editing', 'captions', 'sound design'], after: 'in Signal.' },
    tagline: 'Edit at the speed of thought.', taglineKey: 'speed of thought', cta: 'signal.app',
  },
  duration: (p) => demoPlan(p).end,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const W = S.W, H = S.H; const reel = ctx.reel;
    const plan = demoPlan(p);
    const shellW = reel ? 980 : 1600, shellH = reel ? 1500 : 940, SB = reel ? 0 : 300, TB = 84;
    const fitZoom = (w, hh, frac = 0.9) => Math.min((W * frac) / w, (H * frac) / hh);
    const crum = crumplePlate(W, H, 11);
    const crumpleBg = (room) => { const c = h('canvas', { width: crum.width, height: crum.height, style: { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', mixBlendMode: 'multiply', opacity: '0.3' } }); c.getContext('2d').drawImage(crum, 0, 0); room.el.insertBefore(c, room.el.firstChild); };

    const builders = {
      /* Introducing → the name, selected like an object in a design tool */
      open: (r) => (room) => {
        crumpleBg(room);
        const intro = lineEl(S, room.world, p.intro, null, reel ? 44 : 40);
        const nameSize = Math.min(reel ? 150 : 170, (W * 0.7) / Math.max(1, textWidth(caseOf('display', p.product), `400 100px "IS display"`) / 100));
        const nm = kline(S, room.world, { x: 0, y: 0, anchor: 'c', text: p.product, font: 'display', size: nameSize, color: C.ink, split: 'chars', mask: true });
        const bw = nm.el.offsetWidth, bh = nm.el.offsetHeight;
        const gz = gizmo(S, room.world, { x: -bw / 2 - 26 * u, y: -bh / 2 - 18 * u, w: bw + 52 * u, h: bh + 36 * u, at: room.t0 + 2.1, label: `${Math.round(bw)} × ${Math.round(bh)}` });
        const gr = glyphRow(S, room.world, { y: bh / 2 + 110 * u, size: 40, at: room.t0 + 2.6, color: 'accent' });
        const cam = camKeys(room, [[room.t0, { zoom: 1.0 }], [room.t1, { zoom: 1.06 }]]);
        ctx.cue(room.t0 + 0.3, 'appear', 'introducing'); ctx.cue(room.t0 + 1.7, 'reveal', 'name'); ctx.cue(room.t0 + 2.1, 'tick', 'selection'); ctx.cue(room.t0 + 2.6, 'stamp', 'glyphs');
        return (t) => {
          cam(t);
          const iv = vis(t, room.t0 + 0.25, room.t0 + 1.45, { lin: 0.4 }); css(intro.el, { opacity: iv.o, filter: iv.blur > 0.05 ? `blur(${iv.blur}px)` : 'none' });
          css(nm.el, { display: t >= room.t0 + 1.6 ? 'flex' : 'none' }); maskRise(nm.units, t, room.t0 + 1.65, 0.035, 0.45);
          gz.update(t); gr.update(t);
        };
      },
      /* one short line, pushed into, key phrase highlighted */
      line: (r) => (room) => {
        const ln = lineEl(S, room.world, r.text, r.key, reel ? 32 : 30);
        const z1 = Math.min(5, (W * (reel ? 0.84 : 0.72)) / ln.width);
        const hl = ln.keyU ? highlight(S, ln.keyU.inner, { at: room.t0 + 1.45, textOn: C.ink, color: S.accent }) : null;
        if (ln.keyU) { css(ln.keyU.inner, { color: C.ink }); }
        const cam = camKeys(room, [[room.t0, { zoom: 1 }], [room.t0 + 0.55, { zoom: 1 }, 'wipe'], [room.t0 + 1.55, { zoom: z1 }, 'linear'], [room.t1 + 0.3, { zoom: z1 * 1.05 }]]);
        ctx.cue(room.t0 + 0.55, 'movement', 'push in'); if (hl) ctx.cue(room.t0 + 1.45, 'appear', 'highlight');
        return (t) => { cam(t); blurIn(ln.units, t, room.t0 + 0.1, 0.07, { dy: 0.25, lin: 0.32, blur: 10 }); if (hl) hl(t); };
      },
      /* the prompt box: type (camera rides the caret), chips, pull back, click */
      prompt: (r) => (room) => {
        const f = r.f; const t0 = room.t0;
        const sh = appShell(S, room.world, { x: 0, y: 0, anchor: 'c', w: shellW, h: shellH, product: p.product, title: f.screen || p.screen, sidebar: !reel, nav: ['Home', 'Videos', 'Brand kit', 'Settings'], navIcons: ['house', 'clapperboard', 'shapes', 'settings'], active: 1 });
        const cW = shellW - SB, left = -shellW / 2 + SB, top = -shellH / 2 + TB;
        const pad = reel ? 50 : 90, iy = reel ? 220 : 170, iw = cW - pad * 2;
        uiText(S, sh.content, { x: pad * u, y: (iy - 92) * u, text: f.heading, size: reel ? 52 : 50, w: 'bold', track: -0.03 });
        const typeT = t0 + 0.75, cps = T.motion.typing.cps, tEnd = typeT + f.prompt.length / cps;
        const inp = inputUI(S, sh.content, { x: pad * u, y: iy * u, anchor: 'tl', w: iw, h: 112, text: f.prompt, t0: typeT, cps, placeholder: 'Describe your video…', icon: 'sparkles', size: reel ? 30 : 30, submit: { at: tEnd + 2.35 }, r: 'panel' });
        const chT = tEnd + 0.25;
        const ch = chipsUI(S, sh.content, { x: pad * u, y: (iy + 140) * u, anchor: 'tl', items: f.chips || [], at: chT, stagger: 0.09 });
        const clickT = tEnd + 2.35;
        const sent = h('div', { html: `<span class="sp" style="display:inline-block;width:${26 * u}px;height:${26 * u}px;border-radius:50%;border:${4 * u}px solid var(--ui-skeleton);border-top-color:var(--accent)"></span><span>${f.after || 'Planning your edit…'}</span>`, style: { position: 'absolute', left: pad * u + 'px', top: (iy + 250) * u + 'px', display: 'flex', alignItems: 'center', gap: 14 * u + 'px', ...ts(S, 26, { color: 'var(--ui-textMuted)' }) } });
        sh.content.appendChild(sent);
        // world positions
        const iL = left + pad, iY = top + iy + 56, sendX = left + pad + iw - 46, sendY = iY;
        const z0 = reel ? 1.75 : 1.85, zFull = fitZoom(shellW, shellH, 0.92);
        const caretX = (t) => { let s = 0; for (let k = 0; k < 10; k++) s += inp.caretX(t - k * 0.03); return s / 10; };
        const camX = (t) => { const view = W / z0, lo = iL + view / 2 - 70, hi = iL + iw - view / 2 + 70; const want = iL + caretX(t) - view * 0.12; return lo > hi ? iL + iw / 2 : clamp(want, lo, hi); };
        const pullA = tEnd + 0.15, pullB = pullA + 1.05;
        ctx.cue(typeT, 'typing', 'prompt', { dur: tEnd - typeT }); ctx.cue(chT, 'appear', 'chips'); ctx.cue(pullA, 'movement', 'pull back'); ctx.cue(clickT, 'click', 'submit'); ctx.cue(clickT + 0.1, 'success', 'sent');
        const cur = cursor(S, { keys: [[pullB - 0.2, sendX + 260, sendY + 300], [clickT - 0.35, sendX + 4, sendY + 6], [clickT + 0.4, sendX + 4, sendY + 6], [room.t1, sendX + 120, sendY + 200]], clicks: [clickT], cam: room.cam, layer: room.el, show: [pullB - 0.4, room.t1 + 0.3] });
        return (t) => {
          const k = ep(t, pullA, pullB, 'wipe');
          const fx = lerp(camX(Math.min(t, pullA)), 0, k), fy = lerp(iY, 0, k), z = lerp(z0, zFull, k) * (1 + 0.012 * seg(t, pullB, room.t1));
          room.cam.set({ x: fx, y: fy, zoom: z });
          inp.update(t); ch.update(t);
          const sv = vis(t, clickT + 0.1, null, { din: 0 }); css(sent, { opacity: sv.o, filter: sv.blur > 0.05 ? `blur(${sv.blur}px)` : 'none' }); css(sent.firstChild, { transform: `rotate(${(t * 400) % 360}deg)` });
          cur.update(t);
        };
      },
      /* agent steps under the user's message, camera rides the active row, result card, pull back */
      steps: (r) => (room) => {
        const f = r.f; const t0 = room.t0;
        const sh = appShell(S, room.world, { x: 0, y: 0, anchor: 'c', w: shellW, h: shellH, product: p.product, title: f.screen || 'Plan', sidebar: !reel, nav: ['Home', 'Videos', 'Brand kit', 'Settings'], navIcons: ['house', 'clapperboard', 'shapes', 'settings'], active: 1 });
        const cW = shellW - SB, left = -shellW / 2 + SB, top = -shellH / 2 + TB, pad = reel ? 50 : 90;
        const bub = chatUI(S, sh.content, { x: (cW - pad) * u, y: 50 * u, anchor: 'tr', w: reel ? 760 : 900, msgs: [{ who: 'user', text: f.prompt, t: t0 + 0.2 }], size: 'small' });
        const ay = 50 + bub.height / u + 40;
        uiText(S, sh.content, { x: pad * u, y: ay * u, text: f.agent || 'Agent', size: 18, label: true, color: 'var(--ui-textMuted)' });
        const n = f.steps.length, s0 = t0 + 0.9, gap = 0.78;
        const items = f.steps.map((s, i) => ({ label: s, t0: s0 + i * 0.16, t1: s0 + 0.55 + i * gap }));
        const st = stepsUI(S, sh.content, { x: pad * u, y: (ay + 44) * u, w: cW - pad * 2, gap: 70, items, size: 28 });
        const resT = s0 + 0.55 + (n - 1) * gap + 0.45;
        const ry = ay + 44 + n * 70 + 30;
        const res = h('div', { style: { position: 'absolute', left: pad * u + 'px', top: ry * u + 'px', width: (cW - pad * 2) * u + 'px', height: 110 * u + 'px', borderRadius: 20 * u + 'px', background: 'var(--ui-surfaceAlt)', outline: `${1.5 * u}px solid var(--ui-border)`, outlineOffset: -1.5 * u + 'px', display: 'flex', alignItems: 'center', gap: 18 * u + 'px', padding: `0 ${28 * u}px`, boxSizing: 'border-box' } });
        res.innerHTML = `<div style="width:${56 * u}px;height:${56 * u}px;border-radius:${14 * u}px;background:var(--accent);display:flex;align-items:center;justify-content:center">${icon('clapperboard', 30 * u, '#FFFFFF')}</div><div><div style="font:620 ${28 * u}px 'IS ui';letter-spacing:-0.01em">${f.result}</div><div style="font:400 ${20 * u}px 'IS dataSoft';color:var(--ui-textMuted);margin-top:${4 * u}px">${f.resultMeta || ''}</div></div>`;
        sh.content.appendChild(res);
        const btn = buttonUI(S, res, { x: (cW - pad * 2 - 28) * u, y: 55 * u, anchor: 'cr', label: f.button || 'Open', variant: 'control', h: 58, size: 'small', presses: [resT + 1.25] });
        const rowY = (i) => top + ay + 44 + i * 70 + 35;
        const z0 = reel ? 1.55 : 1.7, zFull = fitZoom(shellW, shellH, 0.92);
        const active = (t) => { let k = 0; items.forEach((it, i) => { if (t >= it.t1 - 0.3) k = Math.min(n - 1, i + 1); }); return k; };
        const fy = track(top + 50 + 40, [[s0 - 0.2, rowY(0), 'soft'], ...items.slice(1).map((it, i) => [items[i].t1 - 0.25, rowY(i + 1), 'soft']), [resT - 0.2, top + ry + 55, 'soft']]);
        const fxw = left + pad + (reel ? 380 : 520);
        const pullA = resT + 0.7, pullB = pullA + 1.0;
        items.forEach((it) => ctx.cue(it.t1, 'success', 'step done')); ctx.cue(resT, 'appear', 'result'); ctx.cue(pullA, 'movement', 'pull back'); ctx.cue(resT + 1.25, 'click', 'open');
        const bx = left + pad + (cW - pad * 2) - 28 - btn.w / u / 2, by = top + ry + 55;
        const cur = cursor(S, { keys: [[pullA, bx + 220, by + 240], [resT + 1.0, bx, by + 6], [resT + 1.6, bx, by + 6], [room.t1, bx + 100, by + 160]], clicks: [resT + 1.25], cam: room.cam, layer: room.el, show: [pullA - 0.1, room.t1 + 0.3] });
        void active;
        return (t) => {
          const k = ep(t, pullA, pullB, 'wipe');
          room.cam.set({ x: lerp(fxw, 0, k), y: lerp(fy(t), 0, k), zoom: lerp(z0, zFull, k) });
          bub.update(t); st.update(t);
          const v = vis(t, resT, null, { din: 0 }); css(res, { opacity: v.o, transform: `translateY(${(1 - v.a) * 16 * u}px)`, filter: v.blur > 0.05 ? `blur(${v.blur}px)` : 'none' });
          btn.update(t); cur.update(t);
        };
      },
      /* a table filling row by row; one column "thinks" before its values appear */
      table: (r) => (room) => {
        const f = r.f; const t0 = room.t0;
        const sh = appShell(S, room.world, { x: 0, y: 0, anchor: 'c', w: shellW, h: shellH, product: p.product, title: f.screen || 'Plan', sidebar: !reel, nav: ['Home', 'Videos', 'Brand kit', 'Settings'], navIcons: ['house', 'clapperboard', 'shapes', 'settings'], active: 1 });
        const cW = shellW - SB, left = -shellW / 2 + SB, top = -shellH / 2 + TB, pad = reel ? 40 : 70;
        uiText(S, sh.content, { x: pad * u, y: 48 * u, text: f.heading || 'Table', size: 40, w: 'bold', track: -0.03 });
        const rowH = 84, every = 0.32, at = t0 + 0.6;
        const tb = tableUI(S, sh.content, { x: pad * u, y: 120 * u, w: cW - pad * 2, cols: f.cols, rows: f.rows, at, every, rowH, size: reel ? 20 : 'small', think: f.think != null ? { col: f.think, t0: at + 0.35, each: 0.3, dur: 0.7 } : null, hi: [[at + every * f.rows.length + 1.4, 1]] });
        const btn = buttonUI(S, sh.content, { x: (cW - pad) * u, y: 48 * u, anchor: 'tr', label: f.button || 'Export', icon: 'download', variant: 'accent', h: 60, size: 'small', presses: [at + every * f.rows.length + 2.9] });
        const n = f.rows.length, tY = top + 120 + 58, endFill = at + every * n + 0.35 + 0.3 * n + 0.7;
        const z0 = reel ? 1.45 : 1.6, zFull = fitZoom(shellW, shellH, 0.92);
        const fy = kf([[at, tY + 84, 'drift'], [endFill - 0.4, tY + 84 * (n - 0.5)]]);
        const fx = kf([[at, left + pad + (cW - pad * 2) * 0.32, 'drift'], [endFill - 0.4, left + pad + (cW - pad * 2) * 0.62]]);
        const pullA = endFill - 0.1, pullB = pullA + 1.0, clickT = at + every * n + 2.9;
        const bx = left + cW - pad - btn.w / u / 2, by = top + 48 + 30;
        f.rows.forEach((_, i) => ctx.cue(at + i * every, 'tick', 'row'));
        ctx.cue(pullA, 'movement', 'pull back'); ctx.cue(clickT, 'click', 'export'); ctx.cue(clickT + 0.15, 'success', 'exported');
        const cur = cursor(S, { keys: [[pullB - 0.3, bx - 260, by + 380], [clickT - 0.3, bx + 6, by + 4], [clickT + 0.5, bx + 6, by + 4], [room.t1, bx - 60, by + 160]], clicks: [clickT], cam: room.cam, layer: room.el, show: [pullB - 0.4, room.t1 + 0.3] });
        return (t) => {
          const k = ep(t, pullA, pullB, 'wipe');
          room.cam.set({ x: lerp(fx(t), 0, k), y: lerp(fy(t), 0, k), zoom: lerp(z0, zFull, k) });
          tb.update(t); btn.update(t); cur.update(t);
        };
      },
      /* a chat thread: the camera follows the newest message */
      chat: (r) => (room) => {
        const f = r.f; const t0 = room.t0;
        const sh = appShell(S, room.world, { x: 0, y: 0, anchor: 'c', w: shellW, h: shellH, product: p.product, title: f.screen || 'Chat', sidebar: !reel, active: 2 });
        const cW = shellW - SB, left = -shellW / 2 + SB, top = -shellH / 2 + TB, pad = reel ? 40 : 90;
        const msgs = f.messages.map((m, i) => ({ ...m, t: t0 + (m.at ?? 0.4 + i * 1.6) }));
        const ch = chatUI(S, sh.content, { x: pad * u, y: 50 * u, w: cW - pad * 2, msgs, size: 'small' });
        const z0 = reel ? 1.4 : 1.55, zFull = fitZoom(shellW, shellH, 0.92);
        const pullA = room.t1 - 1.6, pullB = pullA + 1.0;
        msgs.forEach((m) => ctx.cue(m.t, m.who === 'user' ? 'appear' : 'notify', 'message'));
        const fy = (t) => top + 50 + Math.max(200, ch.bottomAt(t) - 120);
        let sm = null;
        return (t) => { const k = ep(t, pullA, pullB, 'wipe'); let y = 0; for (let q = 0; q < 8; q++) y += fy(t - q * 0.05); y /= 8; room.cam.set({ x: lerp(left + cW / 2, 0, k), y: lerp(y, 0, k), zoom: lerp(z0, zFull, k) }); ch.update(t); void sm; };
      },
      /* a real number and its chart (only with real figures) */
      chart: (r) => (room) => {
        const f = r.f; const t0 = room.t0;
        const sh = appShell(S, room.world, { x: 0, y: 0, anchor: 'c', w: shellW, h: shellH, product: p.product, title: f.screen || 'Insights', sidebar: !reel, active: 0 });
        const cW = shellW - SB, pad = reel ? 50 : 90;
        uiText(S, sh.content, { x: pad * u, y: 50 * u, text: f.statLabel || 'Total', size: 18, label: true, color: 'var(--ui-textMuted)' });
        const od = odometer(S, sh.content, { x: pad * u, y: 84 * u, anchor: 'tl', value: (t) => lerp(0, f.stat, ease('snap')(seg(t, t0 + 0.6, t0 + 2.0))), size: 110, font: 'ui', digits: String(Math.floor(f.stat)).length, prefix: f.prefix || '', suffix: f.suffix || '' });
        const lc = lineChart(S, sh.content, { x: pad * u, y: 260 * u, anchor: 'tl', w: cW - pad * 2, h: (reel ? 900 : 520), values: f.values, labels: f.labels, at: t0 + 1.2, dur: 2.2, tooltip: f.tooltip ? { i: f.values.length - 1, text: f.tooltip } : null });
        const z0 = 1.3, zFull = fitZoom(shellW, shellH, 0.92);
        ctx.cue(t0 + 0.6, 'count', 'count up', { dur: 1.4 }); ctx.cue(t0 + 1.2, 'build_up', 'line', { dur: 2.2 }); if (lc.tipAt) ctx.cue(lc.tipAt, 'appear', 'tooltip');
        const cam = camKeys(room, [[t0, { zoom: z0, x: -shellW / 2 + SB + 400, y: -shellH / 2 + TB + 200 }], [t0 + 1.2, { zoom: z0, x: -shellW / 2 + SB + 400, y: -shellH / 2 + TB + 200 }, 'wipe'], [t0 + 3.6, { zoom: zFull, x: 0, y: 0 }]]);
        return (t) => { cam(t); od.update(t); lc.update(t); };
      },
      /* app tiles float in at different depths around a line */
      integrations: (r) => (room) => {
        const t0 = room.t0;
        const ln = lineEl(S, room.world, p.integrationsLine, null, reel ? 44 : 46);
        const names = p.integrations; const tiles = [];
        const count = Math.max(10, names.length);
        for (let i = 0; i < count; i++) {
          const nm = names[i % names.length];
          const depth = 0.55 + hash01(i, 3) * 0.9;                     // 0.55 far … 1.45 near
          const ang = (i / count) * Math.PI * 2 + hash01(i, 7) * 0.5, rx = (reel ? 360 : 690) * (0.85 + hash01(i, 5) * 0.3), ry = (reel ? 640 : 330) * (0.85 + hash01(i, 9) * 0.3);
          const tx = Math.cos(ang) * rx; let ty = Math.sin(ang) * ry;
          if (Math.abs(tx) < (reel ? 420 : 560)) ty = Math.sign(ty || 1) * Math.max(Math.abs(ty), reel ? 300 : 230);
          const s = (reel ? 200 : 190) * depth;
          const tile = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: s * u + 'px', height: s * u + 'px', marginLeft: -s / 2 * u + 'px', marginTop: -s / 2 * u + 'px', borderRadius: 34 * depth * u + 'px', background: '#FFFFFF', boxShadow: 'var(--ui-shadow)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 * depth * u + 'px' } });
          tile.innerHTML = `<div style="width:${44 * depth * u}px;height:${44 * depth * u}px;border-radius:${12 * depth * u}px;background:${i % 4 === 0 ? 'var(--accent)' : 'var(--ui-control)'};display:flex;align-items:center;justify-content:center;font:400 ${20 * depth * u}px 'IS label';color:#fff">${nm.trim()[0].toUpperCase()}</div><div style="font:600 ${17 * depth * u}px 'IS ui';color:var(--ui-textMuted);white-space:nowrap">${nm}</div>`;
          room.world.appendChild(tile);
          tiles.push({ tile, tx, ty, depth, i, from: 1.9 + 0.5 * depth });
        }
        ctx.cue(t0 + 0.3, 'movement', 'tiles drift in');
        return (t) => {
          const lt = t - t0;
          css(ln.el, { transform: `translate(-50%,-50%) scale(${(1 + 0.4 * ep(t, t0 + 0.2, room.t1, 'drift')).toFixed(4)})` });
          blurIn(ln.units, t, t0 + 0.15, 0.05, { dy: 0.25 });
          tiles.forEach(({ tile, tx, ty, depth, i, from }) => {
            const k = ease('snap')(seg(lt, 0.1 + i * 0.05, 1.3 + i * 0.05));
            const drift = lt * 18 * depth;
            const x = tx * lerp(from, 1, k) + Math.sin(lt * 0.7 + i) * 10 * depth - drift * Math.sign(tx) * 0.2, y = ty * lerp(from, 1, k) + Math.cos(lt * 0.6 + i) * 8 * depth;
            const near = clamp((depth - 1.1) / 0.35);
            css(tile, { transform: `translate(${(x * u).toFixed(2)}px,${(y * u).toFixed(2)}px)`, opacity: clamp(k * 1.3), filter: near > 0.05 ? `blur(${(near * 5).toFixed(2)}px)` : 'none', zIndex: Math.round(depth * 10) });
          });
        };
      },
      /* "Do all your [editing / captions / sound] in Product." then the tagline */
      closer: (r) => (room) => {
        crumpleBg(room);
        const t0 = room.t0, c = p.closer, sz = reel ? 52 : 64;
        const row = h('div', { style: { position: 'absolute', left: '0px', top: '0px', transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', gap: '0.28em', whiteSpace: 'nowrap', ...fstyle(S, 'ui', sz, { wght: 600, color: C.ink, tracking: -0.03 }) } });
        const a = h('span', { text: c.before }); row.appendChild(a);
        const slot = h('span', { style: { position: 'relative', display: 'inline-block', height: '1.1em' } }); row.appendChild(slot);
        const b2 = h('span', { text: c.after }); row.appendChild(b2);
        room.world.appendChild(row);
        const swaps = c.words.map((_, i) => t0 + 1.25 + i * 1.0);
        const rot = rotator(S, slot, { x: 0, y: 0, anchor: 'cl', words: c.words, times: swaps.slice(1), font: 'ui', size: sz, wght: 600, color: '#FFFFFF', plate: true, tracking: -0.03 });
        css(rot.el, { position: 'relative', left: '0px', top: '0.55em' });
        const ww = rot.words.map((d) => d.offsetWidth); const slotW = track(ww[0], swaps.slice(1).map((tt, i) => [tt, ww[i + 1], 'fast']));
        css(slot, { width: ww[0] + 'px' }); css(rot.el, { width: '100%' });
        const tagT = swaps[swaps.length - 1] + 1.2;
        const tg = lineEl(S, room.world, p.tagline, p.taglineKey, reel ? 46 : 54);
        const hl = tg.keyU ? highlight(S, tg.keyU.inner, { at: tagT + 0.65, textOn: C.ink }) : null;
        swaps.forEach((tt, i) => i && ctx.cue(tt, 'tick', 'word swap')); ctx.cue(tagT, 'movement', 'tagline'); ctx.cue(tagT + 0.65, 'appear', 'highlight');
        const cam = camKeys(room, [[t0, { zoom: 0.96 }], [room.t1, { zoom: 1.04 }]]);
        return (t) => {
          cam(t);
          const v = vis(t, t0 + 0.1, tagT, { lin: 0.35 }); css(row, { display: v.o < 0.002 ? 'none' : 'flex', opacity: v.o, filter: v.blur > 0.05 ? `blur(${v.blur}px)` : 'none' });
          rot.update(t); css(slot, { width: slotW(t).toFixed(2) + 'px' });
          css(tg.el, { display: t >= tagT ? 'flex' : 'none' }); blurIn(tg.units, t, tagT + 0.05, 0.06, { dy: 0.25 }); if (hl) hl(t);
        };
      },
      /* end card: name, selection box, CTA */
      end: (r) => (room) => {
        const t0 = room.t0;
        const nameSize = Math.min(reel ? 130 : 140, (W * 0.6) / Math.max(1, textWidth(caseOf('display', p.product), `400 100px "IS display"`) / 100));
        const nm = kline(S, room.world, { x: 0, y: -40 * u, anchor: 'c', text: p.product, font: 'display', size: nameSize, color: C.ink, split: 'chars', mask: true });
        const bw = nm.el.offsetWidth, bh = nm.el.offsetHeight;
        const gz = gizmo(S, room.world, { x: -bw / 2 - 22 * u, y: -40 * u - bh / 2 - 16 * u, w: bw + 44 * u, h: bh + 32 * u, at: t0 + 0.55, out: room.t1 });
        const url = h('div', { style: { position: 'absolute', left: '0px', top: bh / 2 + 10 * u + 'px', transform: 'translateX(-50%)', ...ts(S, 28, { mono: true, color: 'var(--accent)' }), letterSpacing: '0.12em' } }); room.world.appendChild(url);
        ctx.cue(t0 + 0.2, 'reveal', 'end card'); ctx.cue(t0 + 0.55, 'tick', 'selection'); ctx.cue(t0 + 1.0, 'typing', 'url', { dur: p.cta.length / 20 });
        return (t) => { maskRise(nm.units, t, t0 + 0.15, 0.035, 0.45); gz.update(t); setText(url, p.cta.slice(0, typed(t, t0 + 1.0, p.cta.length, 20))); };
      },
    };

    rooms(ctx, plan.list.map((r) => ({ name: r.k, dur: r.dur, grid: r.k === 'open' || r.k === 'closer' ? null : 'line', build: builders[r.k] ? builders[r.k](r) : () => () => {} })));
  },
});
