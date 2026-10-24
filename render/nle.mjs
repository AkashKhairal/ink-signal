// Ink & Signal — NLE package: one edit plan → renders + manifest + FCP7 XML + IS Spec.
//
//   node render/nle.mjs plan.json --out pkg/ [--blur 1] [--skip-renders]
//
// pkg/
//   renders/        every graphic item as its own file: comps → ProRes 422 HQ, overlays/transitions → ProRes 4444 + alpha,
//                   3D layers → individual 4444 passes (for the After Effects native rebuild)
//   manifest.json   the timeline as tracks (V1 picture, V2 overlays, V3 transitions, A1 clip audio, A2 music) in frames + seconds
//   timeline.xml    FCP7 XML: File › Import in Premiere Pro or DaVinci Resolve (no scripting needed)
//   edit.spec.json  the full IS Spec (After Effects adapter rebuilds it as native, editable comps)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs, render, still } from './cli.mjs';
import { LIB_ROOT } from './serve.mjs';

const probe = (file) => {
  try {
    const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString());
    const v = j.streams.find((s) => s.codec_type === 'video');
    const a = j.streams.find((s) => s.codec_type === 'audio');
    return { duration: parseFloat(j.format.duration), width: v && v.width, height: v && v.height, hasAudio: !!a, audioRate: a ? parseInt(a.sample_rate, 10) : 48000, audioChannels: a ? a.channels : 2 };
  } catch { return { duration: 0, hasAudio: false }; }
};

export async function buildPackage(planPath, a = {}) {
  const { buildSpec } = await import('../runtime/comps/index.js');
  const planAbs = path.resolve(planPath);
  const planDir = path.dirname(planAbs);
  const plan = JSON.parse(fs.readFileSync(planAbs, 'utf8'));
  const spec = buildSpec('edit', { plan });
  const out = path.resolve(a.out || path.join(planDir, 'ink-signal-package'));
  const rdir = path.join(out, 'renders');
  fs.mkdirSync(rdir, { recursive: true });
  const fps = spec.fps;
  const items = [];
  for (const it of spec.timeline) {
    const item = { ...it, startSec: it.start / fps, endSec: it.end / fps, frames: it.end - it.start };
    if (it.kind === 'clip') {
      item.file = path.resolve(planDir, it.src);
      item.srcInFrames = Math.round(it.srcIn * fps);
      const p = probe(item.file); item.sourceFrames = Math.round(p.duration * fps); item.hasAudio = p.hasAudio;
    } else {
      const alpha = it.kind !== 'comp';
      const file = path.join(rdir, `${it.id}.mov`);
      item.file = file; item.alpha = alpha; item.srcInFrames = 0;
      if (!a['skip-renders']) {
        const params = { ...it.params };
        if (it.kind === 'comp') params.duration = it.end - it.start;
        await render(it.comp, { params: JSON.stringify(params), out: file, alpha, blur: a.blur, base: planDir, noMarkers: true });
      }
      item.sourceFrames = it.kind === 'comp' ? it.end - it.start : it.end - it.start;
    }
    items.push(item);
  }
  // 3D passes for After Effects (each three layer alone, transparent)
  const passes = {};
  const walk = (ls) => ls.forEach((l) => { if (l.type === 'three') passes[l.id] = path.join(rdir, `pass_${l.id.replace(/[^\w-]+/g, '_')}.mov`); if (l.layers) walk(l.layers); });
  walk(spec.layers);
  if (!a['skip-renders'] && !a['skip-passes']) {
    const specFile = path.join(out, 'edit.spec.json');
    fs.writeFileSync(specFile, JSON.stringify(spec));
    for (const [id, file] of Object.entries(passes)) {
      const lay = findLayer(spec.layers, id);
      await render(specFile, { out: file, alpha: true, only: id, from: lay.in, to: lay.out, noMarkers: true });
    }
  }
  // plates for the After Effects rebuild: paper/grid textures and footage placeholders, rendered in their own local space
  const pdir = path.join(out, 'plates');
  fs.mkdirSync(pdir, { recursive: true });
  const plateLayers = [];
  const walkP = (ls) => ls.forEach((l) => { if ((l.type === 'texture' && l.kind !== 'grain') || (l.type === 'footage' && !l.src)) plateLayers.push(l); if (l.layers) walkP(l.layers); });
  walkP(spec.layers);
  if (!a['skip-renders']) {
    for (const l of plateLayers) {
      const [w, h] = l.size;
      const mini = { spec: 'ink-signal/1', name: 'plate', width: Math.round(w), height: Math.round(h), fps, duration: 1, background: null, accent: spec.accent, markers: [],
        layers: [{ ...l, in: 0, out: 1, blend: undefined, t: { anchor: [0, 0], position: [0, 0], scale: [100, 100], rotation: 0, opacity: 100 } }] };
      const tmpSpec = path.join(pdir, `_${l.id.replace(/[^\w-]+/g, '_')}.spec.json`);
      fs.writeFileSync(tmpSpec, JSON.stringify(mini));
      await still(tmpSpec, { frame: 0, out: path.join(pdir, `${l.id.replace(/[^\w-]+/g, '_')}.png`) });
      fs.rmSync(tmpSpec);
    }
  }
  const music = plan.audio && plan.audio.music ? path.resolve(planDir, plan.audio.music) : null;
  const tracks = { V1: [], V2: [], V3: [], A1: [], A2: [] };
  for (const it of items) {
    tracks[it.track].push(it);
    if (it.kind === 'clip' && it.audio !== false && it.hasAudio) tracks.A1.push({ ...it, track: 'A1', kind: 'clip-audio' });
  }
  if (music) tracks.A2.push({ track: 'A2', kind: 'music', file: music, start: 0, end: spec.duration, startSec: 0, endSec: spec.duration / fps, srcInFrames: Math.round((plan.audio.musicIn || 0) * fps), sourceFrames: Math.round(probe(music).duration * fps), gainDb: plan.audio.musicGainDb ?? -6 });
  const manifest = {
    format: 'ink-signal/manifest@1', name: plan.name || 'Ink & Signal edit', fps, width: spec.width, height: spec.height, duration: spec.duration,
    durationSec: spec.duration / fps, accent: spec.accent, markers: spec.markers, tracks, passes,
    audio: { lufs: plan.audio?.lufs ?? -14, truePeak: -1 },
    spec: path.join(out, 'edit.spec.json'),
    base: planDir,
  };
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
  fs.writeFileSync(path.join(out, 'edit.spec.json'), JSON.stringify(spec));
  fs.writeFileSync(path.join(out, 'timeline.xml'), fcp7xml(manifest));
  console.log(`package → ${out}\n  manifest.json · timeline.xml · edit.spec.json · renders/ (${items.filter((i) => i.kind !== 'clip').length} graphics, ${Object.keys(passes).length} 3D passes)`);
  return { out, manifest };
}

function findLayer(layers, id) { for (const l of layers) { if (l.id === id) return l; if (l.layers) { const r = findLayer(l.layers, id); if (r) return r; } } return null; }

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pathurl = (p) => 'file://localhost' + encodeURI((p.startsWith('/') ? '' : '/') + p.replace(/\\/g, '/'));

/** FCP7 XML (xmeml v4). Imports in Premiere Pro (File › Import) and DaVinci Resolve (File › Import › Timeline). */
export function fcp7xml(m) {
  const rate = `<rate><timebase>${m.fps}</timebase><ntsc>FALSE</ntsc></rate>`;
  const files = new Map(); let fid = 0, cid = 0;
  const fileEl = (it) => {
    if (files.has(it.file)) return `<file id="${files.get(it.file)}"/>`;
    const id = `file-${++fid}`; files.set(it.file, id);
    const p = it.kind === 'music' ? { hasAudio: true } : null;
    const vid = it.kind === 'music' ? '' : `<video><samplecharacteristics>${rate}<width>${m.width}</width><height>${m.height}</height><pixelaspectratio>square</pixelaspectratio></samplecharacteristics></video>`;
    const aud = it.hasAudio || p ? `<audio><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics><channelcount>2</channelcount></audio>` : '';
    return `<file id="${id}"><name>${esc(path.basename(it.file))}</name><pathurl>${esc(pathurl(it.file))}</pathurl>${rate}<duration>${it.sourceFrames || it.end - it.start}</duration><media>${vid}${aud}</media></file>`;
  };
  const clip = (it, type) => {
    const id = `clipitem-${++cid}`;
    const srcIn = it.srcInFrames || 0;
    const extra = type === 'audio' ? `<sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack>` : '';
    const gain = type === 'audio' && it.gainDb ? `<filter><effect><name>Audio Levels</name><effectid>audiolevels</effectid><effectcategory>audiolevels</effectcategory><effecttype>audiolevels</effecttype><mediatype>audio</mediatype><parameter><parameterid>level</parameterid><name>Level</name><valuemin>0</valuemin><valuemax>3.98109</valuemax><value>${Math.pow(10, it.gainDb / 20).toFixed(5)}</value></parameter></effect></filter>` : '';
    return `<clipitem id="${id}"><name>${esc(it.comp || path.basename(it.file))}</name><enabled>TRUE</enabled><duration>${it.sourceFrames || it.end - it.start}</duration>${rate}<start>${it.start}</start><end>${it.end}</end><in>${srcIn}</in><out>${srcIn + (it.end - it.start)}</out>${fileEl(it)}${extra}${gain}</clipitem>`;
  };
  const vtrack = (list) => `<track>${list.map((it) => clip(it, 'video')).join('')}<enabled>TRUE</enabled><locked>FALSE</locked></track>`;
  const atrack = (list) => `<track>${list.map((it) => clip(it, 'audio')).join('')}<enabled>TRUE</enabled><locked>FALSE</locked></track>`;
  const markers = (m.markers || []).map((k) => `<marker><name>${esc(k.label)}</name><comment></comment><in>${k.frame}</in><out>-1</out></marker>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4"><sequence id="ink-signal-seq"><name>${esc(m.name)}</name><duration>${m.duration}</duration>${rate}
<timecode>${rate}<string>00:00:00:00</string><frame>0</frame><displayformat>NDF</displayformat></timecode>
<media><video><format><samplecharacteristics>${rate}<width>${m.width}</width><height>${m.height}</height><pixelaspectratio>square</pixelaspectratio><fielddominance>none</fielddominance></samplecharacteristics></format>
${vtrack(m.tracks.V1)}
${vtrack(m.tracks.V2)}
${vtrack(m.tracks.V3)}
</video><audio>${atrack(m.tracks.A1)}${atrack(m.tracks.A2)}</audio></media>${markers}</sequence></xmeml>
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(LIB_ROOT, 'render', 'nle.mjs')) {
  const a = parseArgs(process.argv.slice(2));
  buildPackage(a._[0], a).catch((e) => { console.error(e.stack || e); process.exit(1); });
}
