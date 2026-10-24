<p align="center">
  <img src="docs/media/banner.jpg" alt="Ink & Signal — a red selection-box title over dark footage between two tickers" width="100%">
</p>

<h3 align="center">A motion design system you can render.</h3>

<p align="center">
  Graph-paper daylight, blacked-out night footage and one signal red.<br>
  Titles move like objects selected in a design tool, product UI glides on springs, tickers keep the beat,
  handwriting keeps it human — in 2D and 3D, with sound.
</p>

<p align="center">
  <img alt="v3" src="https://img.shields.io/badge/version-3.0-F2362B?style=flat-square">
  <img alt="MIT" src="https://img.shields.io/badge/license-MIT-0E0E0E?style=flat-square">
  <img alt="Scenes" src="https://img.shields.io/badge/templates-65-0E0E0E?style=flat-square">
  <img alt="three.js" src="https://img.shields.io/badge/3D-three.js-F2362B?style=flat-square">
  <img alt="Sound" src="https://img.shields.io/badge/sound-−14%20LUFS%20measured-0E0E0E?style=flat-square">
  <img alt="After Effects" src="https://img.shields.io/badge/After%20Effects-native%20rebuild-0E0E0E?style=flat-square">
  <img alt="Premiere Pro" src="https://img.shields.io/badge/Premiere%20Pro-timeline-0E0E0E?style=flat-square">
  <img alt="DaVinci Resolve" src="https://img.shields.io/badge/DaVinci%20Resolve-timeline-0E0E0E?style=flat-square">
  <img alt="Formats" src="https://img.shields.io/badge/formats-Reels%20·%20YouTube%20·%20Square-ECEBE6?style=flat-square">
</p>

---

**Ink & Signal** is a library for making Instagram Reels, YouTube videos and SaaS explainers that all look like they
came from the same studio. Every graphic is code: a deterministic runtime renders it frame by frame in the browser,
and the same data rebuilds it in **After Effects**, **Premiere Pro** and **DaVinci Resolve**. It ships with Claude
skills, so Claude can cut your reels, build your product video, add motion B-roll to your talking head and mix the
sound — in your brand, with your accent colour.

**New in v3** — the **Signal Motion engine** (springs, a camera, a cursor, a rounded *interface layer* for product UI,
charts and kinetic type) and 42 new scenes on top of it: three explainer templates, eleven B-roll clips, eight
infographics, six card animations, nine kinetic titles and four object transitions. Plus a measured sound pass with
103 CC0 sounds, a B-roll pipeline for talking-head videos and titles that sit behind the subject.

## Explainers

Full product videos from one params file: a beat-locked hype promo, a calm homepage demo with the product UI rebuilt
and filmed up close, and a one-take loop. [Guide →](docs/EXPLAINERS.md)

<table>
  <tr>
    <td align="center" colspan="2"><img src="docs/media/gif/x-hype-yt.gif" alt="Hype promo: a red dot floods the frame, SIGNAL slams in letter by letter, a kinetic word triplet, a rippling 3D cube field, a tilted product card with a cursor and a toast, an end card" width="100%"><br><b>Hype promo</b> · <code>x-hype</code> · 15 s on 8 bars at 128 BPM, HUD viewfinder, 3D signature</td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="docs/media/gif/x-demo-yt.gif" alt="Product demo: the camera pushes into a line and highlights a phrase, then glides into a prompt box that types while the camera rides the caret" width="100%"><br><b>Product demo</b> · <code>x-demo</code> · 30–90 s, the camera is the editor</td>
    <td align="center" width="50%"><img src="docs/media/gif/x-journey-yt.gif" alt="One-take journey: a ball rolls a slider to 100, bounces down notification cards, types a word on a keyboard and is launched back as the camera reveals the course" width="100%"><br><b>One-take journey</b> · <code>x-journey</code> · a seamless loop</td>
  </tr>
</table>

## Motion B-roll

One shape that never cuts: it morphs from state to state while a cursor drives real clicks and drags, and every
change lands on a spoken word. Full-frame cutaways or transparent panels for a talking-head video, with timing notes,
a preview of your video with the clips cut in and a review page. [Guide →](docs/BROLL.md)

<table>
  <tr>
    <td align="center" width="50%"><img src="docs/media/gif/mb-launch-yt.gif" alt="A dark pill with a New badge morphs into a white card and then into a segmented picker the cursor clicks through" width="100%"><br><b>Launch: pill → card → picker</b> · <code>mb-launch</code></td>
    <td align="center" width="50%"><img src="docs/media/gif/mb-terminal-yt.gif" alt="A folder opens into a terminal, a prompt types out and the shape becomes a checklist that ticks off" width="100%"><br><b>Folder → terminal → agent</b> · <code>mb-terminal</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/media/gif/mb-slider-yt.gif" alt="The cursor drags a slider and a row of tiles lights up as the value crosses thresholds" width="100%"><br><b>Slider builds a result</b> · <code>mb-slider</code></td>
    <td align="center"><img src="docs/media/gif/mb-versus-yt.gif" alt="A pill becomes an A versus B card with relative bars and a verdict badge" width="100%"><br><b>Side by side + verdict</b> · <code>mb-versus</code></td>
  </tr>
</table>

<table>
  <tr>
    <td align="center" width="33%"><img src="docs/media/gif/mb-search-reel.gif" alt="A search pill types a query and opens into a results list that filters; the cursor picks a row" width="100%"><br><b>Search → filter → pick</b><br><code>mb-search</code></td>
    <td align="center" width="33%"><img src="docs/media/gif/mb-drop-reel.gif" alt="A file tile is dragged onto a drop zone that becomes an upload bar and checks" width="100%"><br><b>Drag → drop → upload</b><br><code>mb-drop</code></td>
    <td align="center" width="33%">Also: <code>mb-doc</code> notes → doc → drag into a session · <code>mb-checklist</code> · <code>mb-chart</code> · <code>mb-chapter</code> · <code>mb-toggles</code><br><br>Every clip renders at your video's size and frame rate, as MP4 or transparent ProRes 4444.</td>
  </tr>
</table>

## Infographics

Real numbers only: bars on springs, odometers that carry digits, lines drawing behind a leading dot, one accent.

<table>
  <tr>
    <td align="center" width="50%"><img src="docs/media/gif/ig-bars-yt.gif" alt="Bars rise one after another with counting values and one red accent bar" width="100%"><br><b>Bar chart</b> · <code>ig-bars</code></td>
    <td align="center" width="50%"><img src="docs/media/gif/ig-line-yt.gif" alt="A headline number rolls up like an odometer while a line chart draws with a tooltip on the last point" width="100%"><br><b>Line + headline number</b> · <code>ig-line</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/media/gif/ig-compare-yt.gif" alt="Two columns count up; the winner gets the accent, a selection box and a handwritten verdict" width="100%"><br><b>Before / after</b> · <code>ig-compare</code></td>
    <td align="center"><img src="docs/media/gif/ig-ranking-yt.gif" alt="Horizontal bars grow and re-sort, the highlighted item climbs to the top" width="100%"><br><b>Ranking race</b> · <code>ig-ranking</code></td>
  </tr>
  <tr>
    <td align="center" colspan="2"><img src="docs/media/gif/ig-flow-yt.gif" alt="Numbered process nodes stamp in with icons while connectors draw between them" width="50%"><br><b>Process / how it works</b> · <code>ig-flow</code></td>
  </tr>
</table>

<table>
  <tr>
    <td align="center" width="33%"><img src="docs/media/gif/ig-counter-reel.gif" alt="One big number rolls up in the display face, a label types in and a bar fills" width="100%"><br><b>Big number</b><br><code>ig-counter</code></td>
    <td align="center" width="33%"><img src="docs/media/gif/ig-donut-reel.gif" alt="A donut ring draws segment by segment with a counting centre number and a legend" width="100%"><br><b>Donut + legend</b><br><code>ig-donut</code></td>
    <td align="center" width="33%"><img src="docs/media/gif/ig-timeline-reel.gif" alt="A vertical timeline draws down; milestone dots stamp as the line reaches them" width="100%"><br><b>Timeline</b><br><code>ig-timeline</code></td>
  </tr>
</table>

## Cards

<table>
  <tr>
    <td align="center" width="50%"><img src="docs/media/gif/card-bento-yt.gif" alt="A bento grid of tiles assembles, each with a live mini UI: a counter, bars, a toggle, a ring, avatars" width="100%"><br><b>Bento grid</b> · <code>card-bento</code></td>
    <td align="center" width="50%"><img src="docs/media/gif/card-flip-yt.gif" alt="A card drops in and flips in 3D to reveal the answer on the accent side" width="100%"><br><b>Card flip</b> · <code>card-flip</code></td>
  </tr>
  <tr>
    <td align="center" colspan="2"><img src="docs/media/gif/card-deal-yt.gif" alt="Cards fly out of a deck into a fanned row; the chosen card lifts and gets the selection box" width="50%"><br><b>Deal a hand</b> · <code>card-deal</code></td>
  </tr>
</table>

<table>
  <tr>
    <td align="center" width="33%"><img src="docs/media/gif/card-stack-reel.gif" alt="A stack of feature cards in perspective; the front card flicks away on each beat" width="100%"><br><b>Stack flick-through</b><br><code>card-stack</code></td>
    <td align="center" width="33%"><img src="docs/media/gif/card-notify-reel.gif" alt="Notifications drop in at the top and compress into a stack like a lock screen" width="100%"><br><b>Notification stack</b><br><code>card-notify</code></td>
    <td align="center" width="33%"><img src="docs/media/gif/card-quote-reel.gif" alt="A quote card: the quote mark stamps, words blur in, the key phrase gets the red plate" width="100%"><br><b>Quote</b><br><code>card-quote</code></td>
  </tr>
</table>

## Kinetic titles

<table>
  <tr>
    <td align="center" width="50%"><img src="docs/media/gif/t-slam-yt.gif" alt="A mono kicker decodes, SIGNAL rises letter by letter, a full stop stamps and a handwritten line writes on" width="100%"><br><b>Brand slam</b> · <code>t-slam</code></td>
    <td align="center" width="50%"><img src="docs/media/gif/t-morph-yt.gif" alt="A word morphs on the variable font axes from thin and condensed to black and expanded" width="100%"><br><b>Weight / width morph</b> · <code>t-morph</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/media/gif/t-decode-yt.gif" alt="A title scrambles through glyphs and locks left to right, an accent rule draws under it" width="100%"><br><b>Signal decode</b> · <code>t-decode</code></td>
    <td align="center"><img src="docs/media/gif/t-highlight-yt.gif" alt="A short line fades in word by word, the camera pushes in and the key phrase gets the red plate" width="100%"><br><b>Line + push-in + highlight</b> · <code>t-highlight</code></td>
  </tr>
  <tr>
    <td align="center" colspan="2"><img src="docs/media/gif/t-rotator-yt.gif" alt="A sentence with a slot whose word cycles on a red plate while the line re-flows" width="50%"><br><b>Rotating word</b> · <code>t-rotator</code></td>
  </tr>
</table>

<table>
  <tr>
    <td align="center" width="33%"><img src="docs/media/gif/t-wall-reel.gif" alt="Outlined rows of a word slide in alternate directions and the solid word slams in on a band" width="100%"><br><b>Outline wall + slam</b><br><code>t-wall</code></td>
    <td align="center" width="33%"><img src="docs/media/gif/t-stack-reel.gif" alt="Short lines stack up, each sliding out of its own mask from alternating sides" width="100%"><br><b>Stacked lines</b><br><code>t-stack</code></td>
    <td align="center" width="33%"><img src="docs/media/gif/t-countdown-reel.gif" alt="3, 2, 1 slam on each beat from alternating sides, a flash, then the word lands" width="100%"><br><b>Countdown</b><br><code>t-countdown</code></td>
  </tr>
</table>

Plus **`t-behind`**: a huge word rises between the background and the person in your shot, cut out frame by frame
with SAM 2 or a chroma key (`tools/separate.py`).

## Object transitions

<p align="center"><img src="docs/media/gif/motion-transitions.gif" alt="Four transitions from a night title to a paper chart: a red line floods the frame, a dot irises, staggered bars close and open, a word flies through the camera" width="80%"></p>
<p align="center"><code>tr-flood</code> · <code>tr-dot</code><br><code>tr-bars</code> · <code>tr-zoom</code><br>Transparent ProRes 4444 with a <code>CUT</code> marker where the frame is covered.</p>

## Titles, overlays and 3D (IS Spec)

The original Ink & Signal compositions: rebuilt natively in After Effects, with real text layers and keyframes.

<table>
  <tr>
    <td align="center" width="33%"><img src="docs/media/gif/chapter-reel.gif" alt="Chapter card: blurred footage, tickers, a red title drawn as a selection with handles" width="100%"><br><b>Chapter card</b><br><code>chapter</code></td>
    <td align="center" width="33%"><img src="docs/media/gif/hook-reel.gif" alt="Hook: HELLO rising letter by letter on graph paper with a cutout circle as the O and a handwritten aside" width="100%"><br><b>Hook / intro</b><br><code>hook</code></td>
    <td align="center" width="33%"><img src="docs/media/gif/talking-reel.gif" alt="Talking head: word-timed captions with a red plate on the active word, a callout box and a WAIT punch word" width="100%"><br><b>Captions & callouts</b><br><code>talking</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/media/gif/3d-popup-reel.gif" alt="3D: CHAPTER 02 pops up off graph paper like a pop-up book" width="100%"><br><b>3D pop-up paper</b><br><code>3d-popup</code></td>
    <td align="center"><img src="docs/media/gif/3d-polaroids-reel.gif" alt="3D: the camera moves between polaroids hanging in the dark" width="100%"><br><b>3D polaroid fly-through</b><br><code>3d-polaroids</code></td>
    <td align="center"><img src="docs/media/gif/endcard-reel.gif" alt="End card: SEE YA rising on graph paper, follow button stamping in" width="100%"><br><b>End card</b><br><code>endcard</code></td>
  </tr>
</table>

<table>
  <tr>
    <td align="center" width="50%"><img src="docs/media/gif/3d-title-yt.gif" alt="3D: an extruded red SETUP lands inside a red 3D selection gizmo while the camera swings to the front" width="100%"><br><b>3D gizmo title</b> · <code>3d-title</code></td>
    <td align="center" width="50%"><img src="docs/media/gif/3d-ring-yt.gif" alt="3D: SIGNAL with a ticker band orbiting it like a planet ring" width="100%"><br><b>3D ticker ring</b> · <code>3d-ring</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/media/gif/chapter-yt.gif" alt="Chapter card in 16:9" width="100%"><br><b>Chapter card</b> · <code>chapter</code></td>
    <td align="center"><img src="docs/media/gif/lowerthird-yt.gif" alt="Lower third sliding in, a notebook card dropping in and a B-roll polaroid" width="100%"><br><b>Lower third + B-roll</b> · <code>lowerthird</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/media/gif/tr-paper-roll.gif" alt="Transition: a graph-paper page unrolls over the frame with CHAPTER 02 and rolls away" width="100%"><br><b>3D paper roll transition</b> · <code>tr-paper-roll</code></td>
    <td align="center"><img src="docs/media/gif/tr-torn.gif" alt="Transition: a torn paper panel covers the 3D title and reveals the next shot" width="100%"><br><b>Torn-paper wipe</b> · <code>tr-torn</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/media/gif/endcard-yt.gif" alt="End card: SEE YA rising, end-screen slots and a subscribe circle stamping in" width="100%"><br><b>End card</b> · <code>endcard</code></td>
    <td align="center"><img src="docs/media/gif/tr-ticker.gif" alt="Transition: a ticker band grows to fill the frame and collapses" width="100%"><br><b>Ticker wipe</b> · <code>tr-ticker</code></td>
  </tr>
</table>

Every template, its formats and its params: [`docs/CATALOG.md`](docs/CATALOG.md).

## Quick start

```bash
git clone https://github.com/AkashKhairal/ink-signal.git && cd ink-signal
npm install && npx playwright install chromium     # headless renderer (ffmpeg + python3 with numpy, Pillow on PATH)

node render/serve.mjs                               # live gallery + scrubbable stage in your browser
node render/cli.mjs list                            # every template and what it does

# a title, an infographic, a product promo
node render/cli.mjs render t-slam --format reel --params '{"text":"Orbit","kicker":"Introducing — 2026"}' --out slam.mp4
node render/cli.mjs render ig-bars --format yt --params-file my-chart.json --blur 4 --out chart.mp4
node render/cli.mjs render x-hype --format yt --params '{"product":"Orbit","accent":"#2B6BF2"}' --blur 4 --out promo.mp4

# look before you render: a contact sheet of 9 moments
node render/cli.mjs sheet x-demo --params-file demo.json --auto 9 --out check.png

# overlays and transitions with alpha
node render/cli.mjs render tr-flood --format yt --params '{"transparent":true}' --out flood.mov   # ProRes 4444 + .markers.json
```

A whole reel — your clips, captions, motion scenes, transitions, music — from one plan file:

```bash
python3 render/beats.py track.mp3 --out beats.json         # tempo, beats, downbeats, the drop
python3 tools/words.py talk.srt --out words.json           # transcript → word-timed captions
node render/build-reel.mjs examples/reel.plan.json --out reel.mp4 --beats   # cuts on downbeats, −14 LUFS
```

Sound on anything, measured:

```bash
node render/cli.mjs render x-hype --blur 4 --out promo_silent.mp4          # also writes promo_silent.cues.json
python3 render/sound.py --video promo_silent.mp4 --cues promo_silent.cues.json \
  --music track.mp3 --music-source "…" --music-license "…" --align --out sound/
# → sound/after.mp4 (−14 LUFS, < −1.5 dBTP), beatgrid.png, cue proofs, report.html (swap any sound), CREDITS.txt
```

## Use it with Claude

Attach the repo (or a zip of it) to a Claude project and ask in plain words. [`SKILL.md`](SKILL.md) routes the request
to one of four skills in [`skills/`](skills):

| Ask | Skill | What Claude does |
|---|---|---|
| *"Make a Reel from these clips, transcript and track."* | [`ink-signal-reels`](skills/ink-signal-reels/SKILL.md) | beats + words → storyboard on the beat grid → edit plan mixing clips, titles, infographics and transitions → review sheet → render → NLE package |
| *"Make a 15-second launch promo for my app"* / *"a 60-second homepage demo"* | [`ink-signal-explainer`](skills/ink-signal-explainer/SKILL.md) | reads your site, writes the beat sheet, fills the template params with your real wording, draft → final → sound |
| *"Add motion graphics to my talking-head video."* | [`ink-signal-broll`](skills/ink-signal-broll/SKILL.md) | inspects the layout, plans clips on your words, renders cutaways or panels, preview + review page |
| *"Add sound effects and music, ready to post."* | [`ink-signal-sound`](skills/ink-signal-sound/SKILL.md) | licence check, cue list, beat grid, one real sound per cue, measured mix, five timestamps to check |

The rules Claude follows are the brand's: one loud colour, real numbers only, no invented testimonials or logos, and
a contact sheet it actually looks at before every render.

## How it works

```mermaid
flowchart LR
  T["tokens.json<br/>colour · type · easing · springs · UI · sound"] --> A["IS Spec comps<br/>titles · overlays · 3D · transitions"]
  T --> M["Signal Motion scenes<br/>explainers · B-roll · infographics · cards · kinetic titles"]
  E["edit plan<br/>reel.json"] --> A
  E --> M
  A --> W["Renderer<br/>canvas / DOM + three.js · seek(frame)"]
  M --> W
  W --> V["MP4 · ProRes 4444 · PNG<br/>+ markers + sound cues"]
  V --> S["sound.py<br/>CC0 SFX · beat grid · −14 LUFS"]
  A --> AE["After Effects<br/>native, editable comps"]
  V --> PR["Premiere Pro<br/>timeline / FCP XML"]
  V --> DR["DaVinci Resolve<br/>timeline / FCP XML / Text+"]
```

- **Deterministic.** Every frame is a pure function of time: no clocks, no `Math.random`, no CSS transitions.
  Render a frame twice and you get the same pixels; render frames in any order.
- **Two engines, one plan.** IS Spec comps (canvas, layers + keyframes as data, rebuilt natively in After Effects)
  and Signal Motion scenes (DOM, springs, camera, cursor) render through the same CLI and sit in the same edit plan.
- **Springs in closed form.** A value that changes target many times is a sum of springs, so motion blur
  (`--blur N` subframes) and seamless loops come for free. [Engine guide →](docs/MOTION-ENGINE.md)
- **One source of truth.** [`tokens/ink-signal.tokens.json`](tokens/ink-signal.tokens.json) holds every colour, font,
  easing curve, spring, UI radius, chart rule and sound gain. Change the accent once and every scene follows.
- **Real footage, real sound.** Clips are pre-extracted to frame-exact image sequences; sounds are recorded CC0
  files placed on cue frames and measured on the exported file.

## The system

<p align="center"><img src="docs/media/tokens.png" alt="Tokens sheet: palette, the four typefaces, and the seven easing curves" width="100%"></p>

**Brand layer** — square devices: the selection box, tickers, HUD corners, signal plates, handwriting with arrows,
the glyph trio. **Interface layer** (v3) — product UI rebuilt in the brand: white surfaces with a rule border and a
soft shadow on paper (raised panels on night), Archivo for UI, JetBrains Mono for code and numbers, Lucide line icons
at one stroke, rounded corners only here.

| Beat | Timing | Motion |
|---|---|---|
| Selection box draws → handles pop → title lands 112 → 100 % | 6 · 4 · 12 frames | `snap`, `stamp` (the only overshoot) |
| The one shape morphs between states | ~0.5 s | spring `morph` (ω 15, ζ .84) |
| Content swaps inside it | out 0.07 s · in 0.26 s, 12 px blur | never a cross-fade |
| Moving indicator | leading edge `fast`, trailing edge `slow` | it stretches like liquid |
| Camera push / ride / pull back | 1.0 / follow / 0.9 s | spring `camera` (no overshoot) |
| Cursor | arrives 0.3 s before a click, press 0.14 s, ripple 0.55 s | constant size at every zoom |
| Typing / HUD type-on | 25 cps / 1 frame per character | linear |
| Ticker | 120 px/s forever | linear, never eases |

**Rules.** One loud colour. Titles are one or two words in Archivo Expanded Black. Big moves on beats, type on 1/16
notes, cuts on downbeats; in calm pieces the camera is the editor. Transitions are objects. Real numbers only.
No gradients on type, glows, lens flares, RGB split, camera shake, emoji or bouncy cameras. The full spec is in
[`docs/MOTION-SPEC.md`](docs/MOTION-SPEC.md); structures for reels, YouTube and SaaS explainers in
[`docs/RECIPES.md`](docs/RECIPES.md).

### 3D

Extruded type with signal-red faces and ink sides, a long lens (28°), a key light from the top-left, and the selection
gizmo as the hero device. Scenes: `gizmoTitle`, `popupPaper`, `tickerRing`, `polaroidFlythrough`, `paperRoll`, and the
cube field inside `x-hype`.

## The edit plan

Clips, IS Spec comps and motion scenes in one timeline; motion scenes work as items, overlays and transitions.

```json
{
  "name": "launch-reel", "format": "reel", "fps": 30, "accent": "#F2362B",
  "audio": { "music": "music/track.mp3", "musicGainDb": -9, "lufs": -14 },
  "snap": "downbeat",
  "timeline": [
    { "type": "comp", "comp": "t-countdown", "params": { "word": "Ship" } },
    { "type": "transition", "comp": "tr-bars" },
    { "type": "clip", "src": "clips/talk.mp4", "in": 4.2, "out": 9.8,
      "overlays": [ { "comp": "ov-captions", "params": { "words": [ { "text": "First", "start": 0.1, "end": 0.45 } ] } } ] },
    { "type": "comp", "comp": "ig-counter", "params": { "value": 12400, "label": "signups in week one" } },
    { "type": "transition", "comp": "tr-flood" },
    { "type": "comp", "comp": "chapter", "duration": 2.4, "params": { "title": "Setup", "src": "clips/desk.mp4" } },
    { "type": "comp", "comp": "endcard", "duration": 3 }
  ]
}
```

## After Effects · Premiere Pro · DaVinci Resolve

```bash
node render/nle.mjs plan.json --out pkg   # renders/ (ProRes 422 HQ, 4444 + alpha) · manifest.json · timeline.xml · edit.spec.json · plates/
```

| | No scripting | Scripted or through an MCP server |
|---|---|---|
| **After Effects** | Import `pkg/renders/*.mov` | `$.evalFile(".../InkSignal.jsx"); InkSignal.buildFromPackage("/abs/pkg")` rebuilds IS Spec comps as **native, editable comps** (text layers, shape layers, keyframes with the exact curves); motion scenes arrive as ProRes footage layers in place |
| **Premiere Pro** | File › Import › `pkg/timeline.xml` | `InkSignalPPro.assemble("/abs/pkg")` through the MCP's ExtendScript tool |
| **DaVinci Resolve** | File › Import › Timeline › `pkg/timeline.xml` | `assemble("/abs/pkg")` through the MCP's Python tool · `add_title("Setup")` for native Fusion Text+ |

Motion overlays and transitions land on their own tracks with alpha and markers. Details:
[`integrations/after-effects`](integrations/after-effects) · [`integrations/premiere-pro`](integrations/premiere-pro) ·
[`integrations/davinci-resolve`](integrations/davinci-resolve).

## Build your own scene

```js
import { defineScene } from '../scene.js';
import { morph } from '../morph.js';
import { segmented } from '../ui.js';

export const mbExample = defineScene({
  name: 'mb-example', kind: 'broll', title: 'Example', formats: ['yt', 'reel'],
  defaults: { at: { card: 1.2, click: 2.4 }, end: 4 },
  duration: (p) => p.end,
  build(ctx) {
    const { S, p } = ctx;
    const m = ctx.add(morph(S, { states: { pill: { w: 420, h: 110, r: 55, bg: 'control', cam: 1.8 },
                                          card: { w: 900, h: 320, r: 40, bg: 'surface', cam: 1.4 } },
                                 start: 'pill', seq: [[p.at.card, 'card']] }));
    ctx.add(segmented(S, m.layer({ tin: p.at.card }), { items: ['Low', 'High'], index: [[p.at.click, 1]] }));
    ctx.cursor({ keys: [[0, 500, 300], [p.at.click - 0.25, 115, 0], [p.end, 200, 120]], clicks: [p.at.click] });
  },
});
```

The engine: springs, tracks, keyframes, swaps, cursor paths, typing, counters, beat grids, baked physics, slow-mo
(`engine.js`) · stage, camera and rooms · the one-shape `morph` · a UI kit of 25 components · charts · kinetic type ·
brand effects. [Guide →](docs/MOTION-ENGINE.md)

## Layout

```
tokens/        ink-signal.tokens.json (source of truth) · tokens.css · icons.json (Lucide)
fonts/         Archivo (variable + Expanded), Caveat, JetBrains Mono (OFL) + 3D typeface
runtime/       IS Spec: core · spec · components · render2d · player · three/ · comps/ · gsap-bridge
runtime/motion Signal Motion: engine · dom · stage · rooms · morph · cursor · ui · charts · type · fx · scenes/
stage/         index.html (IS Spec) · motion.html (motion scenes, scrubbable preview)
render/        cli.mjs · build-reel.mjs · broll.mjs · cues.mjs · sound.py · beats.py · nle.mjs · serve.mjs
sound/         sfx/ (103 CC0 sounds + manifest) · LICENSES.md · MUSIC.md
skills/        ink-signal-reels · ink-signal-explainer · ink-signal-broll · ink-signal-sound
integrations/  after-effects/ · premiere-pro/ · davinci-resolve/
docs/          CATALOG · MOTION-SPEC · MOTION-ENGINE · EXPLAINERS · BROLL · SOUND · RECIPES · library.html
templates/     review.html (B-roll review page)
tools/         build.py · catalog.mjs · words.py · inspect_video.py · separate.py · readme_gifs.mjs · ttf_to_typeface.py
```

After editing the tokens, run `python3 tools/build.py`; after adding a scene, `node tools/catalog.mjs`.

## Credits & licence

Code: MIT. v3's motion vocabulary, B-roll method, explainer structures, object separation and sound pass build on
[Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics) (MIT), rewritten for this system; its CC0
sound library ships in `sound/sfx/` (Kenney and Freesound, per-file credits in
[`sound/LICENSES.md`](sound/LICENSES.md)); the sound-pass method is credited to Vox (@Voxyz_ai). Icons:
[Lucide](https://lucide.dev) (ISC). Fonts: [Archivo](https://github.com/Omnibus-Type/Archivo),
[Caveat](https://github.com/googlefonts/caveat) and [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono),
SIL Open Font License 1.1. [three.js](https://threejs.org) (MIT). [GSAP](https://gsap.com) (GreenSock standard
no-charge licence). Rendering pipeline ideas from
[awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos). The visual language was inspired by
Raagav Sundar's *Graphic Design Portfolio 2026* on Behance; no artwork from it is included. Full notices:
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
