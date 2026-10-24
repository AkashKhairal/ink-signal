#!/usr/bin/env node
// Ink & Signal — sound cues for a whole edit plan (or one IS Spec comp).
//   node render/cues.mjs plan.json --out cues.json        → feed to: python3 render/sound.py --video … --cues cues.json
//   node render/cues.mjs chapter --params '{"title":"Setup"}' --out chapter.cues.json
// Cuts → whoosh, transitions → whoosh + reveal on the cut, overlays → appear, IS Spec devices (selection boxes,
// stamps, handwriting, type-ons, punches, flashes, torn wipes) → their sounds, and every motion scene's own cues
// (clicks, slams, typing, ticks…) offset to where it sits on the timeline.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, openStage, motionScenes } from './cli.mjs';

const fpsOf = (spec) => spec.fps || 30;

/** cues from IS Spec layers (pure) */
export function specCues(spec, offsetF = 0) {
  const fps = fpsOf(spec); const out = [];
  const add = (f, type, desc, extra = {}) => out.push({ t: +((f + offsetF) / fps).toFixed(3), type, desc, ...extra });
  const k0 = (v) => (v && v.k && v.k.length ? v.k[0] : null);
  const walk = (ls) => ls.forEach((L) => {
    if (L.motion) return;
    if (L.reveal && L.reveal.mode === 'box' && /_box$/.test(L.id)) { const k = k0(L.reveal.p); if (k) add(k[0], 'tick', 'selection box'); }
    if (L.t && L.t.rotation && k0(L.t.rotation) && k0(L.t.rotation)[1] === -90) add(k0(L.t.rotation)[0], 'stamp', L.id);
    if (L.type === 'text' && L.reveal && L.reveal.mode === 'x' && /note|aside|hand/i.test(L.font + L.id)) { const k = k0(L.reveal.p); if (k) add(k[0], 'appear', 'handwriting'); }
    if (L.type === 'text' && L.chars && L.chars.mode === 'typeon' && L.chars.count > 8 && !/hud|chapterLabel/i.test(L.id)) add(L.chars.at, 'typing', L.id, { dur: (L.chars.count * (L.chars.perChar || 1)) / fps });
    if (/^punch/.test(L.id) && L.type === 'group') add(L.in, 'slam', 'punch word');
    if (/^flash/.test(L.id)) add(L.in, 'reveal', 'flash');
    if (/^torn/.test(L.id)) add(L.in, 'movement', 'torn wipe');
    if (/polaroid$|^polaroid/.test(L.id) && L.type === 'group') add(L.in, 'appear', 'polaroid drop');
    if (L.layers) walk(L.layers);
  });
  walk(spec.layers);
  for (const m of spec.markers || []) if (/landed/.test(m.label)) add(m.frame, 'reveal', m.label);
  return out.sort((a, b) => a.t - b.t);
}

async function sceneCues(name, params) {
  const st = await openStage(name, { params: JSON.stringify(params) });
  const cues = st.meta.cues || []; await st.close(); return cues;
}

export async function planCues(planPath) {
  const { buildSpec } = await import('../runtime/comps/index.js');
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const spec = buildSpec('edit', { plan }); const fps = fpsOf(spec);
  const cues = specCues(spec);
  for (const it of spec.timeline) {
    if (it.kind === 'clip' || it.kind === 'comp') { if (it.start > 0 && it.track === 'V1') cues.push({ t: +(it.start / fps).toFixed(3), type: 'scene_cut', desc: `cut to ${it.comp || path.basename(it.src)}` }); }
    if (it.kind === 'overlay') cues.push({ t: +(it.start / fps).toFixed(3), type: 'appear', desc: it.comp });
    if (it.kind === 'transition' && !it.motion) { cues.push({ t: +(it.start / fps).toFixed(3), type: 'movement', desc: it.comp }); cues.push({ t: +(it.cut / fps).toFixed(3), type: 'reveal', desc: it.comp + ' cut' }); }
    if (it.motion) { const sc = await sceneCues(it.comp, it.params); for (const c of sc) cues.push({ ...c, t: +(c.t + it.start / fps).toFixed(3), desc: `${it.comp}: ${c.desc}` }); }
  }
  cues.sort((a, b) => a.t - b.t);
  // dedupe: same type within 50 ms
  const out = []; for (const c of cues) { const p = out[out.length - 1]; if (p && p.type === c.type && Math.abs(p.t - c.t) < 0.05) continue; out.push(c); }
  return { fps, duration: spec.duration / fps, cues: out };
}

async function main() {
  const a = parseArgs(process.argv.slice(2)); const target = a._[0];
  let res;
  if (target.endsWith('.json')) res = await planCues(target);
  else if ((await motionScenes())[target]) { const cues = await sceneCues(target, a.params ? JSON.parse(a.params) : {}); res = { cues }; }
  else { const { buildSpec } = await import('../runtime/comps/index.js'); const spec = buildSpec(target, a.params ? JSON.parse(a.params) : {}); res = { fps: spec.fps, duration: spec.duration / spec.fps, cues: specCues(spec) }; }
  const out = a.out || 'cues.json'; fs.writeFileSync(out, JSON.stringify(res, null, 1));
  console.log(`${res.cues.length} cues → ${out}`);
}
if (process.argv[1] && process.argv[1].endsWith('cues.mjs')) main().catch((e) => { console.error(e.stack || e); process.exit(1); });
