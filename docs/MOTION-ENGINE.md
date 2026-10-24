# Signal Motion engine

The browser engine behind every explainer, B-roll clip, infographic, card animation, kinetic title and object
transition in Ink & Signal v3. It sits next to the IS Spec canvas renderer: same tokens, same CLI, same edit
plans, same NLE packages.

**The contract:** a scene builds its DOM once, then `update(t)` sets every element for time `t` (seconds).
No CSS transitions, no timers, no `Math.random`, no state carried between frames. Any frame renders
correctly on its own, in any order, which is what makes subframe motion blur and parallel renders possible.
Measuring layout inside `update` is fine (it is deterministic).

```
runtime/motion/
  engine.js   time math: springs, tracks, keyframes, swaps, cursor paths, typing, counters, beat grids, bake, slow-mo
  dom.js      h(), css() (writes only on change), tf(), applyVis(), icon(), glyph(), textWidth()
  stage.js    createStage(): back / world (camera) / front / top layers; Camera; worldGrid(); box(); node()
  rooms.js    rooms(): a sequence of scenes with their own world + camera, joined by a blur-dissolve
  morph.js    morph(): the one shape that never cuts (states, seq, layers, camera that fits each state)
  cursor.js   cursor(): constant-size arrow / hand, arcs, press dips, signal ripples, drags
  ui.js       the Interface layer: card, button, toggle, slider, segmented, input, chips, badge, toast, notif,
              steps, progress, skeleton, table, terminal, chat, fileTile, keyboard, browser, phone, appShell, list, avatar, stat
  charts.js   barChart, lineChart (+tooltip), donut, odometer, ranking, milestones, flow, ring
  type.js     kline (split lines), maskRise, blurIn, typeOn, slam, morphAxes (variable font), decode, handwrite,
              highlight / highlightInline (signal plate), rotator, outlineWall
  fx.js       hudFrame, grain, vignette, ticker, gizmo (selection box), stamp / glyphRow, note (+arrow, circle),
              flood, dotGrow, barsWipe, tornWipe, zoomThrough, spotlight
  scene.js    defineScene(), mountScene(), sceneFrames()
  scenes/     the templates (index.js is the registry)
stage/motion.html   the page the renderer drives (preview mode without ?render: scrub + play)
```

## A scene

```js
import { defineScene } from '../scene.js';
import { morph } from '../morph.js';
import { segmented } from '../ui.js';

export const mbExample = defineScene({
  name: 'mb-example', kind: 'broll', title: 'Example', formats: ['yt', 'reel'], theme: 'paper',
  description: 'One line for the catalog.',
  defaults: { format: 'yt', label: 'Ship it', at: { card: 1.2, click: 2.4 }, end: 4 },
  duration: (p) => p.end,                       // seconds, pure (no DOM): used by plans and the CLI
  build(ctx) {                                  // DOM work happens here only
    const { S, p } = ctx;                       // S = stage, p = resolved params
    const m = ctx.add(morph(S, { states: { pill: { w: 420, h: 110, r: 55, bg: 'control', cam: 1.8 },
                                          card: { w: 900, h: 320, r: 40, bg: 'surface', cam: 1.4 } },
                                 start: 'pill', seq: [[p.at.card, 'card']], intro: 0.1 }));
    const L = m.layer({ tin: p.at.card });      // content swaps in with the standard blur
    ctx.add(segmented(S, L, { items: ['Low', 'High'], index: [[p.at.click, 1]] }));
    ctx.cursor({ keys: [[0, 500, 300], [p.at.click - 0.25, 115, 0], [p.end, 200, 120]], clicks: [p.at.click] });
    ctx.cue(p.at.card, 'movement', 'morph');    // sound cue (types: tokens.sound.cueMap)
  },
});
```

Register it in `runtime/motion/scenes/index.js`, then:

```bash
node render/cli.mjs sheet mb-example --auto 9 --out sheet.png      # look at it
node render/cli.mjs render mb-example --format reel --blur 4 --out clip.mp4   # + clip.cues.json
open "http://127.0.0.1:<port>/stage/motion.html?scene=mb-example"   # live preview (node render/serve.mjs)
```

## ctx

| | |
|---|---|
| `ctx.S` | the stage: `W`, `H`, `u` (scale, 1 at 1080 on the short side), `back` / `world` / `front` / `top` layers, `cam` (Camera), `theme`, `accent` |
| `ctx.p` | params merged over `defaults` (`format`, `accent`, `theme`, `transparent`, `width`, `height`, `fps` are always accepted) |
| `ctx.add(c)` | register a component (`{ update }`) or an updater `(t) => {}`; returns it |
| `ctx.late(c)` | runs after everything else (anything that reads the camera) |
| `ctx.cursor(o)` | cursor with automatic click cues |
| `ctx.cue(t, type, desc, { dur })` | a sound cue; written to `<out>.cues.json` by the renderer |
| `ctx.marker(t, label)` | a marker (`CUT` on transitions tells edit plans where the cut goes) |
| `ctx.ready.push(promise)` | async setup (three.js, images) awaited before the first frame |
| `ctx.after.push(async f => …)` | async per-frame work (image sequences) |
| `ctx.seq[key]` | footage prepared by the CLI from `def.media(p)` → `{ dir, count }` (JPEG sequence) or `{ image }` |
| `ctx.reel` / `ctx.yt`, `ctx.safe`, `ctx.edge`, `ctx.duration`, `ctx.fps` | layout helpers |

## Time math (engine.js)

| Call | Use |
|---|---|
| `S(tau, ω, ζ)` | closed-form spring step 0→1 |
| `spr(t, at, preset)` | spring progress since `at`; presets `morph fast slow soft camera pop stamp settle drop instant` (tokens.springs) |
| `track(v0, [[t, v, preset?]], def, period)` | a value that changes target many times = sum of springs (numbers or arrays); `period` loops seamlessly |
| `ctrack('#hex', [[t, '#hex']])` | colour track |
| `kf([[t, v, ease?]], def)` | eased keyframes; the ease on a key shapes the segment that leaves it (token eases: snap stamp wipe write drift exit linear) |
| `vis(t, tin, tout, o)` | content swap → `{ o, blur, s, a, b }`; `applyVis(el, v)` |
| `path([[t, x, y]])` | point path with a human arc; `presses(clicks, drags)` |
| `typed(t, t0, n, cps)`, `caretOn()`, `count()`, `fmtNum()` | typing and numbers |
| `beats(bpm, offset)` | `.at(n)`, `.bar(n)`, `.sub(n, 16)`, `.snap(t)` — put big moves on beats, type on 1/16 |
| `bake(init, step, T)` | anything with history (lagging cameras, physics) baked once at 240 Hz, sampled by time |
| `follow(v, vel, target, ω, dt)` | critically damped follow step (for bake) |
| `slowmo(a, b, depth)` | time warp that is slowest in the middle (launch arcs) |

## Patterns

| Pattern | How | See |
|---|---|---|
| Pill → card → control | `morph` states + layers with `tin`/`tout` | `mb-launch` |
| Liquid indicator | leading edge on `fast`, trailing edge on `slow` springs | `segmented` in ui.js |
| Typing with a camera that rides the caret | `input().caretX(t)` smoothed over 0.3 s → camera x | `x-demo` prompt room |
| Push in → ride → pull back | `rooms()` + `camKeys` / `ep` blends between a close camera and the full view | `x-demo` |
| Rows appearing on words | `vis(t, wordTime)` per row + spring sizes | `steps`, `table`, `mb-doc` |
| Direct manipulation | value from the cursor position while held; `crossTimes` to fire springs at thresholds | `mb-slider` |
| Drag and drop | `geom` moves the shape with the cursor; a world drop slot | `mb-doc`, `mb-drop` |
| Transparent panel | `transparent: true` + `center: [x, y]` in the empty area; zooms fit that region | any `mb-*` |
| One-take hero | contacts at beat times, parabolas between, baked follow camera, reveal + dive, `loop: true` | `x-journey` |
| Transitions that are objects | `flood`, `dotGrow`, `barsWipe`, `zoomThrough`, `tornWipe` covering at a time | `x-hype`, `tr-*` |
| 3D inside a DOM scene | `import('../../three/kit.js')` in `ctx.ready`, render to a canvas in `S.back` per frame | `x-hype` signature |
| Footage | `media(p)` → the CLI extracts JPEG frames; `ctx.after` swaps `<img>` per frame | `sr-zoom`, `t-behind` |

## Gotchas

- Never put `will-change` on anything the camera scales: text rasterises blurry.
- Text swapping inside a morphing container needs its own enter/exit (`vis` din/lin/lout) or old and new text overlap.
- `mix-blend-mode: difference` labels must sit in a layer that has the blend itself (a filtered parent isolates them).
- Items that slide under a highlight need `fast` springs or the highlight sits empty for a moment.
- Keep the cursor inside the frame at every zoom, including mid-morph. Cursor keys are world coordinates (relative to the shape centre in B-roll).
- Large CSS blurs are slow to screenshot; blur only small swaps. Grain is added by ffmpeg at render time (deterministic), not in the page.
- Loops: `def.loop = true` makes `seek` use `t % duration`; anything straddling the seam must be drawn at both ends.
- Rendering is a screenshot per subframe (~0.15–0.5 s each). Preview with `--blur 1`, final with `--blur 4`.
- Any output size: the renderer lays every scene out at the design size (short side 1080, so `S.u` = 1) and Chromium
  draws it at the requested resolution through its device scale factor — 720p, 4K and GIF-sized renders are the same
  picture, vector-sharp. Params in output pixels (B-roll `center`) are divided by `p.__scale`. Canvases you create
  (3D, textures) should allocate `devicePixelRatio`× pixels when it is above 1.
