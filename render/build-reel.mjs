// Ink & Signal — one command from edit plan to a finished, loudness-normalised MP4.
//
//   node render/build-reel.mjs plan.json --out reel.mp4 [--blur 3] [--preview] [--beats]
//
// 1. (optional --beats) analyse plan.audio.music → beat grid, snap cuts to downbeats
// 2. render the whole edit (graphics + your clips) in the browser, frame by frame
// 3. mix audio: clip audio at its timeline position, music under it (ducked), loudnorm to -14 LUFS / -1 dBTP
// 4. mux → reel.mp4 (H.264 CRF 16 + AAC 320k)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { parseArgs, render } from './cli.mjs';
import { LIB_ROOT } from './serve.mjs';

const hasAudio = (f) => { try { return execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', f]).toString().trim().length > 0; } catch { return false; } };

export async function buildReel(planPath, a = {}) {
  const { buildSpec } = await import('../runtime/comps/index.js');
  const planAbs = path.resolve(planPath), dir = path.dirname(planAbs);
  let plan = JSON.parse(fs.readFileSync(planAbs, 'utf8'));
  if (a.beats && plan.audio && plan.audio.music) {
    const bfile = path.join(dir, 'beats.json');
    execFileSync('python3', [path.join(LIB_ROOT, 'render', 'beats.py'), path.resolve(dir, plan.audio.music), '--out', bfile], { stdio: 'inherit' });
    const b = JSON.parse(fs.readFileSync(bfile, 'utf8'));
    plan = { ...plan, beats: b.beats, downbeats: b.downbeats, snap: plan.snap || 'downbeat' };
    const snapped = path.join(dir, path.basename(planAbs, '.json') + '.snapped.json');
    fs.writeFileSync(snapped, JSON.stringify(plan, null, 1));
    planPath = snapped;
  }
  const spec = buildSpec('edit', { plan });
  const out = path.resolve(a.out || path.join(dir, (plan.name || 'reel').replace(/\W+/g, '-') + '.mp4'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-signal-'));
  const silent = path.join(tmp, 'video.mp4');
  await render(path.resolve(planPath), { out: silent, blur: a.blur || (a.preview ? 1 : 2), to: a.to });
  const fps = spec.fps, total = spec.duration / fps;
  // audio graph
  const inputs = ['-i', silent]; const filters = []; const mix = []; let n = 1;
  for (const it of spec.timeline.filter((t) => t.kind === 'clip' && t.audio)) {
    const f = path.resolve(dir, it.src);
    if (!hasAudio(f)) continue;
    inputs.push('-i', f);
    const dur = (it.end - it.start) / fps, delay = Math.round((it.start / fps) * 1000);
    filters.push(`[${n}:a]atrim=start=${it.srcIn}:duration=${dur},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, dur - 0.03)}:d=0.03,adelay=${delay}|${delay},aformat=channel_layouts=stereo[v${n}]`);
    mix.push(`[v${n}]`); n++;
  }
  let musicLabel = null;
  if (plan.audio && plan.audio.music) {
    inputs.push('-i', path.resolve(dir, plan.audio.music));
    const g = plan.audio.musicGainDb ?? (mix.length ? -9 : 0);
    filters.push(`[${n}:a]atrim=start=${plan.audio.musicIn || 0}:duration=${total},asetpts=PTS-STARTPTS,volume=${g}dB,afade=t=out:st=${Math.max(0, total - 1)}:d=1,aformat=channel_layouts=stereo[mus]`);
    musicLabel = '[mus]'; n++;
  }
  const L = plan.audio?.lufs ?? -14;
  let final;
  if (mix.length && musicLabel) {
    filters.push(`${mix.join('')}amix=inputs=${mix.length}:normalize=0,apad=whole_dur=${total}[voice]`);
    filters.push(`[voice]asplit[vo][sc]`);
    filters.push(`${musicLabel}[sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[duck]`);
    filters.push(`[vo][duck]amix=inputs=2:normalize=0,loudnorm=I=${L}:TP=-1:LRA=11[aout]`);
    final = '[aout]';
  } else if (mix.length) {
    filters.push(`${mix.join('')}amix=inputs=${mix.length}:normalize=0,apad=whole_dur=${total},loudnorm=I=${L}:TP=-1:LRA=11[aout]`); final = '[aout]';
  } else if (musicLabel) {
    filters.push(`${musicLabel}loudnorm=I=${L}:TP=-1:LRA=11[aout]`); final = '[aout]';
  }
  if (final) {
    execFileSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', filters.join(';'), '-map', '0:v', '-map', final, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-t', String(total), '-movflags', '+faststart', out], { stdio: 'inherit' });
  } else fs.copyFileSync(silent, out);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`reel → ${out}  (${total.toFixed(2)}s, ${spec.width}x${spec.height} @${fps})`);
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(LIB_ROOT, 'render', 'build-reel.mjs')) {
  const a = parseArgs(process.argv.slice(2));
  buildReel(a._[0], a).catch((e) => { console.error(e.stack || e); process.exit(1); });
}
