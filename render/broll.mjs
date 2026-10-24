#!/usr/bin/env node
// Ink & Signal — motion B-roll for a talking-head video.
//
//   node render/broll.mjs broll.plan.json [--out out/] [--blur 4] [--skip-renders] [--draft]
//
// broll.plan.json
// { "title": "My video", "video": "source.mp4",
//   "clips": [ { "id": "01", "scene": "mb-launch", "in": 0.30, "out": 6.75, "kind": "full" | "panel",
//                "line": "“…the words this clip covers…”", "center": [1300, 540], "params": { … } } ],
//   "notes": ["What is illustrative"] }
//
// Every clip renders at the video's resolution and frame rate, named by its timeline in-point
// (01-mb-launch_0m00s30.mp4; panels → .mov ProRes 4444 with alpha). Then:
//   TIMING.md   file · in · out · treatment · the line it covers · notes
//   preview.mp4 the video with the clips cut in (hard cuts, original audio) — for review only
//   review.html step through the clips + before/after compare (side by side, stacked, wipe)
//   cues.json   every clip's sound cues on the video timeline (feed to render/sound.py with --voice auto)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs, render, motionScenes, openStage } from './cli.mjs';
import { LIB_ROOT } from './serve.mjs';

const probe = (f) => {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f]).toString());
  const v = j.streams.find((s) => s.codec_type === 'video');
  const [n, d] = v.r_frame_rate.split('/').map(Number);
  return { w: v.width, h: v.height, fpsStr: v.r_frame_rate, fps: n / (d || 1), duration: parseFloat(j.format.duration), audio: j.streams.some((s) => s.codec_type === 'audio') };
};
const stamp = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}m${String(Math.floor(s)).padStart(2, '0')}s${String(Math.round((s % 1) * 100)).padStart(2, '0')}`; };
const fmt = (t) => { const cs = Math.round(t * 100); return `${Math.floor(cs / 6000)}:${((cs % 6000) / 100).toFixed(2).padStart(5, '0')}`; };

export async function buildBroll(planPath, a = {}) {
  const planAbs = path.resolve(planPath), dir = path.dirname(planAbs);
  const plan = JSON.parse(fs.readFileSync(planAbs, 'utf8'));
  const out = path.resolve(a.out || path.join(dir, 'out'));
  fs.mkdirSync(out, { recursive: true });
  const video = path.resolve(dir, plan.video);
  const V = probe(video);
  const SC = await motionScenes();
  const format = V.w >= V.h ? 'yt' : 'reel';
  const done = [];
  for (const c of plan.clips) {
    const def = SC[c.scene];
    if (!def) throw new Error(`Unknown motion scene "${c.scene}"`);
    const panel = c.kind === 'panel';
    const slot = c.out - c.in;
    const params = { format, width: V.w, height: V.h, fps: V.fps, ...(c.params || {}) };
    if (panel) { params.transparent = true; if (c.center) params.center = c.center; }
    if (def.defaults && 'end' in def.defaults && !(c.params && c.params.end)) params.end = slot;
    const file = path.join(out, `${c.id}-${c.scene}_${stamp(c.in)}.${panel ? 'mov' : 'mp4'}`);
    if (!a['skip-renders']) await render(c.scene, { params: JSON.stringify(params), out: file, blur: a.draft ? 1 : (a.blur ?? 4), base: dir, alpha: panel });
    const cj = file.replace(/\.[^.]+$/, '.cues.json');
    const cues = fs.existsSync(cj) ? JSON.parse(fs.readFileSync(cj, 'utf8')).cues : [];
    done.push({ ...c, file, params, cues });
  }
  // TIMING.md
  const rows = ['| File | In | Out | Treatment | Covers the line |', '|---|---|---|---|---|', ...done.map((c) => `| ${path.basename(c.file)} | ${fmt(c.in)} | ${fmt(c.out)} | ${c.kind === 'panel' ? 'transparent panel (ProRes 4444, track above the video)' : 'full-frame cutaway'} | ${c.line || ''} |`)];
  const notes = plan.notes || [];
  fs.writeFileSync(path.join(out, 'TIMING.md'), `# Motion B-roll for ${plan.title || path.basename(video)}\n\nEach file name ends with its timeline in-point (\`0m32s40\` = 0:32.40). Full-frame cutaways replace the picture for their slot; transparent panels sit on a track above the video. Clips hold their last frame if the slot is longer.\n\n${rows.join('\n')}\n${notes.length ? '\nNotes\n' + notes.map((n) => '- ' + n).join('\n') + '\n' : ''}`);
  // cues on the video timeline
  const allCues = done.flatMap((c) => [{ t: c.in, type: c.kind === 'panel' ? 'appear' : 'scene_cut', desc: `${c.id} in` }, ...c.cues.filter((q) => q.t <= c.out - c.in).map((q) => ({ ...q, t: +(q.t + c.in).toFixed(3), desc: `${c.id}: ${q.desc}` })), ...(c.kind === 'panel' ? [] : [{ t: c.out, type: 'scene_cut', desc: `${c.id} out` }])]).sort((x, y) => x.t - y.t);
  fs.writeFileSync(path.join(out, 'cues.json'), JSON.stringify({ fps: V.fps, duration: V.duration, cues: allCues }, null, 1));
  // preview composite: hard cuts, original audio
  const preview = path.join(out, 'preview.mp4');
  const args = ['-v', 'error', '-y', '-i', video]; const fc = []; let last = '0:v';
  done.forEach((c, i) => {
    args.push('-i', c.file);
    fc.push(`[${i + 1}:v]format=yuva444p,tpad=stop_mode=clone:stop_duration=${(c.out - c.in).toFixed(3)},setpts=PTS-STARTPTS+${c.in}/TB[c${i}]`);
    fc.push(`[${last}][c${i}]overlay=enable='between(t,${c.in},${c.out})':eof_action=pass[v${i}]`); last = `v${i}`;
  });
  fc.push(`[${last}]format=yuv420p[v]`);
  execFileSync('ffmpeg', [...args, '-filter_complex', fc.join(';'), '-map', '[v]', '-map', '0:a?', '-c:v', 'libx264', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', preview], { stdio: 'inherit' });
  // review page (clips + before/after). Browsers can't play ProRes → on-black H.264 previews for panels
  const assets = path.join(out, 'assets'); fs.mkdirSync(assets, { recursive: true });
  for (const f of ['ArchivoExpanded-Black.ttf', 'Archivo-Variable.woff2', 'JetBrainsMono-Medium.ttf']) fs.copyFileSync(path.join(LIB_ROOT, 'fonts', f), path.join(assets, f));
  const clips = done.map((c) => {
    let src = path.basename(c.file);
    if (c.kind === 'panel') {
      const pv = c.file.replace(/\.mov$/, '_preview.mp4');
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=0x0B0B0C:s=${V.w}x${V.h}`, '-i', c.file, '-filter_complex', '[0][1]overlay=shortest=1', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', pv]);
      src = path.basename(pv);
    }
    return { n: c.id, t: c.title || c.scene, tc: `${fmt(c.in)} – ${fmt(c.out)}`, q: c.line || '', f: path.basename(c.file), src, alpha: c.kind === 'panel' };
  });
  clips.unshift({ n: '▶', t: 'Full preview · your video with every clip', tc: 'whole video', q: 'Composite for review. For the final cut, place the clips in your editor.', f: 'preview.mp4', src: 'preview.mp4' });
  const js = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const page = fs.readFileSync(path.join(LIB_ROOT, 'templates', 'review.html'), 'utf8')
    .replaceAll('/*TITLE*/', esc(plan.title || 'Video')).replace('/*SUB*/', esc(`${done.length} clips · ${V.w}×${V.h} @ ${V.fps.toFixed(3)} fps`))
    .replace('/*CLIPS*/[]', js(clips)).replace('/*MARKS*/[]', js(done.map((c) => [c.in, c.out]))).replace('/*DUR*/0', V.duration.toFixed(2))
    .replace("'/*ORIG*/'", js(path.relative(out, video))).replace("'/*PREV*/'", js('preview.mp4'));
  fs.writeFileSync(path.join(out, 'review.html'), page);
  console.log(`B-roll → ${out}\n  ${done.length} clips, TIMING.md, preview.mp4, review.html, cues.json`);
  return { out, clips: done };
}

if (process.argv[1] && process.argv[1].endsWith('broll.mjs')) {
  const a = parseArgs(process.argv.slice(2));
  buildBroll(a._[0], a).catch((e) => { console.error(e.stack || e); process.exit(1); });
}
void openStage;
