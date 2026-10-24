// t-behind — the title sits BEHIND the subject: footage at the back, the big word in the middle, the subject
// cut out by its mask on top. Masks come from tools/separate.py (SAM 2, on your machine) or a chroma key.
import { defineScene } from '../scene.js';
import { h, css, textWidth } from '../dom.js';
import { T, seg, clamp, lerp, spr, ease, ep } from '../engine.js';
import { kline, maskRise, fstyle, caseOf, decode } from '../type.js';
import { ts } from '../ui.js';

export const tBehind = defineScene({
  name: 't-behind', kind: 'title', title: 'Title behind the subject', theme: 'night', formats: ['reel', 'yt', 'square'],
  description: 'Your footage, a huge display word that rises between the background and you, and you on top (cut out frame by frame from masks made by tools/separate.py).',
  defaults: { format: 'reel', src: null, masks: null, start: 0, dur: 4, text: 'Focus', kicker: 'Chapter 03', color: 'accent', y: 0.42, size: null, dim: 0.15 },
  media: (p) => [p.src ? { key: 'src', src: p.src, start: p.start || 0, frames: Math.ceil((p.dur + 0.5) * 30), w: null, h: null } : null, p.masks ? { key: 'mask', dir: p.masks, start: Math.round((p.start || 0) * 30) } : null].filter(Boolean),
  duration: (p) => p.dur,
  build(ctx) {
    const { S, p } = ctx; const u = S.u; const W = S.W, H = S.H;
    const mk = (z) => { const i = h('img', { style: { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', objectFit: 'cover', zIndex: z } }); S.back.appendChild(i); return i; };
    const bg = mk(1), fg = mk(3);
    const shade = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', background: `rgba(11,11,12,${p.dim})`, zIndex: 1 } }); S.back.appendChild(shade);
    let size = p.size || (ctx.reel ? 330 : 380);
    if (!p.size) while (size > 40 && textWidth(caseOf('display', p.text), `400 ${size * u}px "IS display"`) > W * 0.92) size -= 4;
    const mid = h('div', { style: { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', zIndex: 2 } }); S.back.appendChild(mid);
    const word = kline(S, mid, { x: W / 2, y: H * p.y, text: p.text, font: 'display', size, color: p.color === 'accent' ? S.accent : p.color, split: 'chars', mask: true });
    const kick = h('div', { style: { position: 'absolute', left: W / 2 + 'px', top: H * p.y - size * u * 0.62 + 'px', transform: 'translate(-50%,-100%)', ...ts(S, 26, { mono: true, color: '#FFFFFF' }), letterSpacing: '0.14em', zIndex: 4 } }); S.back.appendChild(kick);
    const seq = ctx.seq.src, mseq = ctx.seq.mask;
    const frameURL = (q, f, ext = 'jpg', start = 1) => `${q.dir}/${String(Math.max(0, Math.min(q.count - 1, Math.floor(f))) + start).padStart(5, '0')}.${ext}`;
    if (!seq) { css(bg, { display: 'none' }); css(fg, { display: 'none' }); }
    ctx.after.push(async (f) => {
      const jobs = [];
      if (seq) { const u1 = seq.image || frameURL(seq, f); if (bg.__u !== u1) { bg.__u = u1; bg.src = u1; fg.src = u1; jobs.push(bg.decode().catch(() => {})); } }
      if (mseq) { const mu = frameURL(mseq, f + (mseq.offset || 0), 'png', 0); if (fg.__m !== mu) { fg.__m = mu; css(fg, { WebkitMaskImage: `url("${mu}")`, maskImage: `url("${mu}")`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' }); const im = new Image(); im.src = mu; jobs.push(im.decode().catch(() => {})); } }
      else css(fg, { display: 'none' });
      await Promise.all(jobs);
    });
    ctx.add((t) => { maskRise(word.units, t, 0.35, 0.05, 0.55, 'snap', 1.1); const s = 1 + 0.04 * ep(t, 0.35, p.dur, 'drift'); css(word.el, { transform: `translate(-50%,-50%) scale(${s.toFixed(4)})` }); decode(kick, caseOf('label', p.kicker), t, 0.1, 0.5); });
    ctx.cue(0.35, 'slam', 'word rises'); ctx.cue(0.1, 'typing', 'kicker', { dur: 0.5 });
  },
});
