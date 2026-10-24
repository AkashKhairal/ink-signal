#!/usr/bin/env node
// Renders the README GIFs of the motion scenes into docs/media/gif.
//   node tools/readme_gifs.mjs            # all
//   node tools/readme_gifs.mjs x-hype     # only names containing "x-hype"
// Scenes render small (960×540 / 540×960) at 15 fps with 2 subframes of motion blur and no grain (grain makes
// GIFs huge), then become GIFs (640 or 360 wide, 128-colour palette). Transitions are composited over two stills so the cut reads.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/media/gif');
const TMP = path.join(ROOT, '.ink-signal-cache/gif');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
const FPS = 15;
const only = process.argv[2];

// [scene, format, params, fromSeconds, toSeconds, gif options {w, fps, colors}]
const LIST = [
  ['x-hype', 'yt', {}, 0, 15.3, { w: 560, fps: 12, colors: 96 }],
  ['x-demo', 'yt', {}, 7.4, 18.8, { w: 560, fps: 12, colors: 96 }],
  ['x-journey', 'yt', {}, null, null, { w: 560, fps: 12, colors: 96 }],
  ['mb-launch', 'yt', {}],
  ['mb-terminal', 'yt', {}],
  ['mb-slider', 'yt', {}],
  ['mb-search', 'reel', {}],
  ['mb-versus', 'yt', {}],
  ['mb-drop', 'reel', {}],
  ['ig-bars', 'yt', {}],
  ['ig-line', 'yt', {}],
  ['ig-counter', 'reel', {}],
  ['ig-donut', 'reel', {}],
  ['ig-compare', 'yt', {}],
  ['ig-ranking', 'yt', {}],
  ['ig-flow', 'yt', {}],
  ['ig-timeline', 'reel', {}],
  ['card-stack', 'reel', {}],
  ['card-flip', 'yt', {}],
  ['card-deal', 'yt', {}],
  ['card-bento', 'yt', {}],
  ['card-notify', 'reel', {}],
  ['card-quote', 'reel', {}],
  ['t-slam', 'yt', {}],
  ['t-morph', 'yt', {}],
  ['t-decode', 'yt', {}],
  ['t-highlight', 'yt', {}],
  ['t-rotator', 'yt', {}],
  ['t-wall', 'reel', {}, null, null, { fps: 12, colors: 64 }],
  ['t-stack', 'reel', {}],
  ['t-countdown', 'reel', {}],
];
const TRANSITIONS = ['tr-flood', 'tr-dot', 'tr-bars', 'tr-zoom'];

const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
const size = (fmt) => (fmt === 'reel' ? [540, 960] : [960, 540]);
const gifW = (fmt) => (fmt === 'reel' ? 360 : 640);

function toGif(src, dst, w, { fps = FPS, colors = 128 } = {}) {
  run('ffmpeg', ['-y', '-v', 'error', '-i', src, '-vf',
    `fps=${fps},scale=${w}:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=${colors}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
    '-loop', '0', dst]);
  return (fs.statSync(dst).size / 1e6).toFixed(2);
}

for (const [scene, fmt, extra, from, to, go = {}] of LIST) {
  if (only && !scene.includes(only)) continue;
  const [width, height] = size(fmt);
  const mp4 = path.join(TMP, `${scene}-${fmt}.mp4`);
  const args = ['render/cli.mjs', 'render', scene, '--format', fmt, '--params', JSON.stringify({ width, height, fps: FPS, ...extra }), '--blur', '2', '--out', mp4, '--noMarkers', '--no-grain'];
  if (from != null) args.push('--from', String(Math.round(from * FPS)), '--to', String(Math.round(to * FPS)));
  const t0 = Date.now();
  run('node', args);
  const mb = toGif(mp4, path.join(OUT, `${scene}-${fmt}.gif`), go.w || gifW(fmt), go);
  console.log(`${scene}-${fmt}.gif  ${mb} MB  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

// Transitions: shot A (night title) → transition (alpha) → shot B (paper chart), cut under the cover.
if (!only || TRANSITIONS.some((n) => n.includes(only)) || only === 'tr') {
  const A = path.join(TMP, 'A.png'), B = path.join(TMP, 'B.png');
  run('node', ['render/cli.mjs', 'still', 't-decode', '--format', 'yt', '--params', JSON.stringify({ width: 960, height: 540, fps: FPS }), '--frame', '44', '--out', A]);
  run('node', ['render/cli.mjs', 'still', 'ig-bars', '--format', 'yt', '--params', JSON.stringify({ width: 960, height: 540, fps: FPS }), '--frame', '70', '--out', B]);
  const cells = [];
  for (const tr of TRANSITIONS) {
    const mov = path.join(TMP, `${tr}.mov`);
    run('node', ['render/cli.mjs', 'render', tr, '--format', 'yt', '--params', JSON.stringify({ width: 960, height: 540, fps: FPS, transparent: true }), '--blur', '2', '--out', mov]);
    const marks = JSON.parse(fs.readFileSync(mov.replace(/\.mov$/, '.markers.json'), 'utf8'));
    const cut = (marks.markers.find((m) => /CUT/i.test(m.label || m.name || '')) || { t: marks.duration / 2 / FPS });
    const cutS = 0.6 + (cut.t ?? cut.frame / FPS);
    const cell = path.join(TMP, `${tr}-cell.mp4`);
    run('ffmpeg', ['-y', '-v', 'error', '-loop', '1', '-framerate', String(FPS), '-i', A, '-loop', '1', '-framerate', String(FPS), '-i', B, '-i', mov, '-filter_complex',
      `[2]format=rgba,tpad=start_duration=0.6:stop_duration=0.9:color=black@0[tr];[0][1]overlay=enable='gte(t,${cutS.toFixed(3)})'[bg];[bg][tr]overlay=shortest=1,scale=480:270:flags=lanczos,format=yuv420p`,
      '-r', String(FPS), '-c:v', 'libx264', '-crf', '16', cell]);
    cells.push(cell);
  }
  const grid = path.join(TMP, 'transitions.mp4');
  run('ffmpeg', ['-y', '-v', 'error', ...cells.flatMap((c) => ['-i', c]), '-filter_complex',
    '[0][1][2][3]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0:shortest=1:fill=0x0E0E0E', '-c:v', 'libx264', '-crf', '16', grid]);
  console.log(`motion-transitions.gif  ${toGif(grid, path.join(OUT, 'motion-transitions.gif'), 640)} MB`);
}
