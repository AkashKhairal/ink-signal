#!/usr/bin/env node
// Builds the website's data and preview videos (index.html + site/ is the GitHub Pages site).
//   node tools/build_site.mjs                 # site/data.json from the registries + tokens (fast)
//   node tools/build_site.mjs --media         # + a looping MP4 preview and a poster for every template (slow)
//   node tools/build_site.mjs --media t-      # only templates whose name contains "t-"
// Previews: 960×540 H.264 (featured explainers 1280×720), no audio. Overlays are composited over the stand-in
// footage plate; transitions cut from a night title to a paper chart under their cover frames.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const MEDIA = path.join(SITE, 'media');
const CACHE = path.join(ROOT, '.ink-signal-cache', 'site');
const args = process.argv.slice(2);
const withMedia = args.includes('--media');
const only = args.find((a) => !a.startsWith('--'));

const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'tokens/ink-signal.tokens.json'), 'utf8'));
const { COMPS, buildSpec } = await import(path.join(ROOT, 'runtime/comps/index.js'));
const { SCENES } = await import(path.join(ROOT, 'runtime/motion/scenes/index.js'));
const { sceneFrames } = await import(path.join(ROOT, 'runtime/motion/scene.js'));

/* ───────── categories and "best for" copy ───────── */
const GROUPS = [
  ['explainers', 'Explainers', 'Whole product videos from one params file, plus polish for real screen recordings.'],
  ['broll', 'Motion B-roll', 'One shape that never cuts, driven by a cursor, timed to the speaker’s words.'],
  ['infographics', 'Infographics', 'Real numbers on springs: bars, lines, donuts, odometers, timelines.'],
  ['cards', 'Cards', 'Feature cards that stack, flip, deal, assemble and notify.'],
  ['titles', 'Kinetic titles', 'Type that slams, decodes, morphs, rotates and hides behind you.'],
  ['transitions', 'Transitions', 'Objects that cover the cut — no cross-dissolves.'],
  ['reels', 'Titles & A-roll', 'The original selection-box system for Reels and YouTube.'],
  ['3d', '3D', 'Extruded type, a selection gizmo, pop-up paper, polaroids — three.js.'],
  ['overlays', 'Overlays', 'Transparent ProRes 4444 layers for your own footage in any editor.'],
];
const groupOf = (engine, kind) => ({ explainer: 'explainers', screen: 'explainers', broll: 'broll', infographic: 'infographics', card: 'cards',
  title: engine === 'motion' ? 'titles' : 'reels', aroll: 'reels', transition: 'transitions', '3d': '3d', overlay: 'overlays' }[kind]);

const BEST = {
  'x-hype': 'Launch teasers, Product Hunt and social ads — 15 seconds that land on every beat.',
  'x-demo': 'Homepage hero videos, feature walkthroughs, sales and investor demos.',
  'x-journey': 'Landing-page loops that show a whole workflow in one take.',
  'sr-zoom': 'Polishing a real screen recording: tutorials, release notes, support videos.',
  'mb-launch': 'Announcing a model, plan or feature; choosing between options.',
  'mb-terminal': 'Developer tools, CLIs and AI agents doing the work.',
  'mb-doc': 'Notes becoming a document; briefs and specs handed to an AI session.',
  'mb-slider': 'Effort, quality or price levels — “more of X gives you Y”.',
  'mb-versus': 'Model vs model, plan vs plan, old way vs new way.',
  'mb-checklist': 'Setup steps, launch lists, “everything I do before I post”.',
  'mb-search': 'Finding something: search, filter, pick a result.',
  'mb-chart': 'A trend or number the speaker mentions in passing.',
  'mb-chapter': 'Chapter breaks inside a talking-head video.',
  'mb-drop': 'Uploading, importing, dragging a file into a tool.',
  'mb-toggles': 'Settings, switches, features turned on.',
  'ig-bars': 'Comparing a handful of values: days, categories, channels.',
  'ig-line': 'Growth over time with one headline number.',
  'ig-donut': 'Shares of a whole: traffic sources, budget splits.',
  'ig-counter': 'One big real stat: views, users, revenue, hours saved.',
  'ig-compare': 'Before / after and old way / new way, as two numbers.',
  'ig-timeline': 'Roadmaps, histories and launch plans.',
  'ig-flow': '“How it works” in three to five steps.',
  'ig-ranking': 'Leaderboards and rankings that change over time.',
  'card-stack': 'Feature lists and tips, flicked through on the beat.',
  'card-flip': 'Question → answer, myth → fact, before → after.',
  'card-deal': 'Picking one option out of several: plans, tools, picks.',
  'card-bento': 'A product overview: every feature at a glance.',
  'card-notify': 'Activity, alerts and “what happens next”.',
  'card-quote': 'A real customer or press quote with the key line on the plate.',
  't-slam': 'Brand intros and sign-offs; the name of a product or series.',
  't-morph': 'Intros where the word itself transforms.',
  't-decode': 'Tech launches, drops and “incoming transmission” openers.',
  't-highlight': 'Calm explainer lines and the one phrase to remember.',
  't-rotator': 'One sentence, many use cases: “Do all your ___ in Product.”',
  't-wall': 'The loudest beat of a hype edit; a one-word manifesto.',
  't-stack': 'Reels hooks and recaps in three or four short lines.',
  't-countdown': 'Openers, launches and “three things” intros.',
  't-behind': 'Episode and chapter titles that sit behind the person in shot.',
  'tr-flood': 'Bold section changes in the brand colour.',
  'tr-dot': 'Focusing on one point, then revealing the next shot.',
  'tr-bars': 'Rhythmic section changes on a downbeat.',
  'tr-zoom': 'Flying into the next chapter through a word.',
  chapter: 'Chapter cards over your own blurred footage.',
  hook: 'Reel intros with your cutout as a letter.',
  talking: 'Talking-head A-roll: captions, callouts and punch words.',
  lowerthird: 'Introducing a speaker, with a REC HUD and a B-roll polaroid.',
  endcard: 'YouTube end screens and Reels follow CTAs.',
  '3d-title': 'Section titles inside a 3D selection gizmo.',
  '3d-popup': 'Chapter openers that pop up off graph paper.',
  '3d-ring': 'Channel and brand idents with an orbiting ticker.',
  '3d-polaroids': 'Story recaps, milestones, behind the scenes.',
  'ov-title': 'A selected title over any footage in your editor.',
  'ov-ticker': 'A running ticker band over footage.',
  'ov-hud': 'Viewfinder HUD corners over footage.',
  'ov-lowerthird': 'Name and role bars over your own A-roll.',
  'ov-captions': 'Word-timed captions with the active word on the plate.',
  'ov-punch': 'One-word sticker emphasis — “Wait.” “Nope.”',
  'ov-callout': 'Pointing at an object in your shot, with live dimensions.',
  'ov-chip': '“Step 02 / 05” progress chips.',
  'ov-note': 'Handwritten asides with an arrow to the thing.',
  'tr-torn': 'Torn-paper cuts between night and paper.',
  'tr-flash': 'A 2-frame hit on a downbeat cut.',
  'tr-ticker': 'A ticker band that fills the frame on the cut.',
  'tr-paper-roll': 'Chapter changes that unroll a page in 3D.',
};
const FEATURED = ['x-hype', 'x-demo', 'x-journey'];
const NEEDS_FOOTAGE = { 'sr-zoom': 'your screen recording (video or image)', 't-behind': 'your clip + masks from tools/separate.py' };

/* ───────── templates ───────── */
const clean = (d) => { const o = { ...d }; for (const k of Object.keys(o)) if (k.startsWith('__')) delete o[k]; return o; };
const templates = [];
for (const [name, d] of Object.entries(SCENES)) {
  const { frames, fps } = sceneFrames(d, {});
  templates.push({ name, engine: 'motion', kind: d.kind, group: groupOf('motion', d.kind), title: d.title, description: d.description,
    formats: d.formats, duration: +(frames / fps).toFixed(2), transparent: !!d.transparent, loop: !!d.loop, defaults: clean(d.defaults),
    best: BEST[name] || '', live: !NEEDS_FOOTAGE[name], footage: NEEDS_FOOTAGE[name] || null, featured: FEATURED.includes(name) });
}
for (const [name, d] of Object.entries(COMPS)) {
  if (name === 'edit') continue;
  let duration = null;
  try { const s = buildSpec(name, { format: 'yt' }); duration = +(s.duration / s.fps).toFixed(2); } catch { /* sizes only */ }
  templates.push({ name, engine: 'spec', kind: d.kind, group: groupOf('spec', d.kind), title: d.title, description: d.description,
    formats: d.formats, duration, transparent: d.kind === 'overlay' || d.kind === 'transition', loop: false, defaults: clean(d.defaults),
    best: BEST[name] || '', live: true, footage: null, featured: false });
}
for (const t of templates) {
  const f = path.join(MEDIA, t.name + '.mp4');
  t.preview = fs.existsSync(f) || withMedia ? `site/media/${t.name}.mp4` : null;
  t.poster = fs.existsSync(f.replace(/\.mp4$/, '.jpg')) || withMedia ? `site/media/${t.name}.jpg` : null;
  if (!t.best) console.warn('no best-for copy: ' + t.name);
}

/* ───────── tokens for the system section ───────── */
const tokens = {
  colors: Object.entries(T.color).filter(([, v]) => typeof v === 'string').map(([k, v]) => ({ name: k, hex: v })),
  accentOptions: T.color.accentOptions,
  colorRule: T.colorRoles.rule,
  fonts: Object.fromEntries(Object.entries(T.font).map(([k, v]) => [k, { family: v.family, style: v.style, case: v.case }])),
  eases: Object.entries(T.ease).filter(([, v]) => v.bezier).map(([k, v]) => ({ name: k, bezier: v.bezier, use: v.use })),
  springs: Object.entries(T.springs).filter(([k, v]) => Array.isArray(v) && k !== 'instant').map(([k, v]) => ({ name: k, w: v[0], z: v[1], use: T.springs.use[k] })),
  durations: T.duration,
  motion: { swap: T.motion.swap, cursor: T.motion.cursor, typing: T.motion.typing, read: T.motion.read, camera: T.motion.camera },
  ui: { radius: T.ui.radius, border: T.ui.border },
  sound: { cueMap: T.sound.cueMap, mix: T.sound.mix },
  rules: T.rules,
};
const counts = { templates: templates.length, motion: templates.filter((t) => t.engine === 'motion').length, spec: templates.filter((t) => t.engine === 'spec').length,
  sounds: JSON.parse(fs.readFileSync(path.join(ROOT, 'sound/sfx/manifest.json'), 'utf8')).bundled?.length ?? null };
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
fs.mkdirSync(SITE, { recursive: true });
fs.writeFileSync(path.join(SITE, 'data.json'), JSON.stringify({ version: pkg.version, groups: GROUPS.map(([id, label, blurb]) => ({ id, label, blurb })), templates, tokens, counts }));
console.log(`site/data.json — ${templates.length} templates (${counts.motion} motion, ${counts.spec} IS Spec)`);

/* ───────── preview media ───────── */
if (withMedia) {
  fs.mkdirSync(MEDIA, { recursive: true }); fs.mkdirSync(CACHE, { recursive: true });
  const run = (cmd, a, opt = {}) => execFileSync(cmd, a, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], ...opt });
  const cli = (...a) => run('node', ['render/cli.mjs', ...a]);
  const encode = (src, name, w = 960, h = 540, extra = []) => {
    const out = path.join(MEDIA, name + '.mp4');
    run('ffmpeg', ['-y', '-v', 'error', '-i', src, ...extra, '-vf', `scale=${w}:${h}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', w > 960 ? '25' : '27',
      '-movflags', '+faststart', '-an', out]);
    const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString());
    run('ffmpeg', ['-y', '-v', 'error', '-ss', String((dur * 0.62).toFixed(2)), '-i', out, '-frames:v', '1', '-vf', 'scale=960:-2', '-q:v', '4', out.replace(/\.mp4$/, '.jpg')]);
    return (fs.statSync(out).size / 1e6).toFixed(2);
  };
  const P = (o) => JSON.stringify(o);
  // stills shared by composites: A (night title), B (paper chart), plate (stand-in footage)
  const A = path.join(CACHE, 'A.png'), B = path.join(CACHE, 'B.png'), PLATE = path.join(CACHE, 'plate.png');
  if (!fs.existsSync(A)) cli('still', 't-decode', '--format', 'yt', '--params', P({ width: 960, height: 540 }), '--frame', '88', '--out', A);
  if (!fs.existsSync(B)) cli('still', 'ig-bars', '--format', 'yt', '--params', P({ width: 960, height: 540 }), '--frame', '140', '--out', B);
  if (!fs.existsSync(PLATE)) { cli('still', 'talking', '--format', 'yt', '--frame', '0', '--out', PLATE + '.full.png'); run('ffmpeg', ['-y', '-v', 'error', '-i', PLATE + '.full.png', '-vf', 'scale=960:540', PLATE]); }
  // t-behind: masks from the green-screen stand-in
  const behindBase = path.join(CACHE, 'behind');
  if (!fs.existsSync(path.join(behindBase, 'masks', '00000.png'))) {
    fs.mkdirSync(behindBase, { recursive: true });
    fs.copyFileSync(path.join(SITE, 'fixtures/stand-in.mp4'), path.join(behindBase, 'clip.mp4'));
    run('python3', ['tools/separate.py', path.join(SITE, 'fixtures/stand-in-green.mp4'), '--chroma', '0x00FF00', '--out', path.join(behindBase, 'masks')]);
  }

  const cutComposite = (mov, name, cutS) => {
    const out = path.join(CACHE, name + '.cut.mp4');
    run('ffmpeg', ['-y', '-v', 'error', '-loop', '1', '-framerate', '30', '-i', A, '-loop', '1', '-framerate', '30', '-i', B, '-i', mov, '-filter_complex',
      `[2]scale=960:540,format=rgba,tpad=start_duration=0.7:stop_duration=1.1:color=black@0[tr];[0][1]overlay=enable='gte(t,${(0.7 + cutS).toFixed(3)})'[bg];[bg][tr]overlay=shortest=1`,
      '-r', '30', '-c:v', 'libx264', '-crf', '14', out]);
    return out;
  };
  const overComposite = (mov, name) => {
    const out = path.join(CACHE, name + '.over.mp4');
    run('ffmpeg', ['-y', '-v', 'error', '-loop', '1', '-framerate', '30', '-i', PLATE, '-i', mov, '-filter_complex', '[1]scale=960:540,format=rgba[o];[0][o]overlay=shortest=1', '-r', '30', '-c:v', 'libx264', '-crf', '14', out]);
    return out;
  };
  const cutOf = (markersFile, fps, frames) => {
    try { const m = JSON.parse(fs.readFileSync(markersFile, 'utf8')); const c = (m.markers || []).find((x) => /CUT/i.test(x.label || x.name || x.comment || '')); if (c) return (c.frame ?? c.f ?? c.t * fps) / fps; } catch { /* no markers */ }
    return frames / fps / 2;
  };

  for (const t of templates) {
    if (only && !t.name.includes(only)) continue;
    const t0 = Date.now(); const raw = path.join(CACHE, t.name);
    let src;
    if (t.engine === 'motion') {
      const big = t.featured; const [w, h] = big ? [1280, 720] : [960, 540];
      if (t.name === 't-behind') {
        cli('render', 't-behind', '--format', 'reel', '--base', behindBase, '--params', P({ width: 540, height: 960, src: 'clip.mp4', masks: 'masks', start: 0, dur: 4 }), '--blur', '1', '--out', raw + '.mp4', '--noMarkers');
        src = raw + '.pad.mp4';
        run('ffmpeg', ['-y', '-v', 'error', '-i', raw + '.mp4', '-vf', 'scale=-2:540,pad=960:540:(ow-iw)/2:0:color=0x0B0B0C', '-c:v', 'libx264', '-crf', '14', src]);
      } else if (t.transparent) {
        cli('render', t.name, '--format', 'yt', '--params', P({ width: 960, height: 540, transparent: true }), '--blur', '2', '--out', raw + '.mov');
        const m = JSON.parse(fs.readFileSync(raw + '.markers.json', 'utf8'));
        src = cutComposite(raw + '.mov', t.name, cutOf(raw + '.markers.json', m.fps, m.duration));
      } else {
        const extra = t.name === 'sr-zoom' ? { src: 'app-screen.png', url: 'signal.app/plan',
          zooms: [{ t0: 1.0, t1: 4.2, x: 470, y: 250, w: 1300, h: 540 }, { t0: 5.0, t1: 7.2, x: 1380, y: 120, w: 500, h: 230 }],
          clicks: [{ t: 2.4, x: 820, y: 453 }, { t: 6.0, x: 1650, y: 214 }],
          spotlight: [{ t0: 2.2, t1: 4.0, x: 508, y: 410, w: 1222, h: 88, label: 'SHOT 02' }],
          notes: [{ t: 2.7, text: 'one click', x: 980, y: 660, toX: 860, toY: 505 }] } : {};
        cli('render', t.name, '--format', 'yt', '--base', path.join(SITE, 'fixtures'), '--params', P({ width: w, height: h, ...extra }), '--blur', '1', '--out', raw + '.mp4', '--noMarkers', '--no-grain');
        src = raw + '.mp4';
      }
      console.log(`${t.name}.mp4  ${encode(src, t.name, big ? 1280 : 960, big ? 720 : 540)} MB  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    } else {
      if (t.kind === 'overlay') { cli('render', t.name, '--format', 'yt', '--out', raw + '.mov', '--alpha'); src = overComposite(raw + '.mov', t.name); }
      else if (t.kind === 'transition') {
        cli('render', t.name, '--format', 'yt', '--out', raw + '.mov', '--alpha');
        const m = JSON.parse(fs.readFileSync(raw + '.markers.json', 'utf8'));
        src = cutComposite(raw + '.mov', t.name, cutOf(raw + '.markers.json', m.fps, m.duration));
      } else { cli('render', t.name, '--format', 'yt', '--out', raw + '.mp4', '--no-grain'); src = raw + '.mp4'; }
      console.log(`${t.name}.mp4  ${encode(src, t.name)} MB  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
  }
  const total = fs.readdirSync(MEDIA).reduce((s, f) => s + fs.statSync(path.join(MEDIA, f)).size, 0);
  console.log(`site/media — ${(total / 1e6).toFixed(1)} MB`);
}
