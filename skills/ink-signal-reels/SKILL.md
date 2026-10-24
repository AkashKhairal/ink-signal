---
name: ink-signal-reels
description: Edit Instagram Reels and YouTube videos in the Ink & Signal motion style with the ink-signal library (beat-cut edit plans, captions, chapter cards, titles, infographics, cards, title-behind-subject, sound), and hand edits to After Effects, Premiere Pro or DaVinci Resolve.
---

# Reels and YouTube edits with Ink & Signal

Library root = the folder with `tokens/ink-signal.tokens.json`. Read the root `SKILL.md` design rules first.
If it isn't attached or on disk, ask the user to attach the `ink-signal` folder/zip, or clone
https://github.com/AkashKhairal/ink-signal; then `npm install && npx playwright install chromium` inside it
(needs Node 18+, ffmpeg, python3 with numpy + Pillow).

## 1. Inputs to collect (one message)

Clips (paths), what the video is about, the hook line, chapter titles, handle (@…), accent (default #F2362B),
music (and where it's from / its licence), a transcript (SRT/VTT/Whisper JSON) for captions, and where it will be
posted. Missing and the user is present → ask once; otherwise placeholders like `[Your Name]`, and say so.

## 2. Analyse

```bash
ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate -of compact clip.mp4
python3 render/beats.py music.mp3 --out beats.json                     # bpm, beats, downbeats, drop
python3 tools/words.py talk.srt --from 4.2 --to 9.8 --out words_talk.json   # words for one clip window
python3 tools/inspect_video.py talk.mp4 work/                          # layout: full / pip / black + contact sheet
```

## 3. Storyboard on the beat grid

Structures are in `docs/RECIPES.md`. Hook in the first 2 s, one idea per shot, every cut on a downbeat, titles held
≥ 18 frames after they land. Show the storyboard as a short table (time · shot · graphic · sound) before rendering.

## 4. Write the edit plan (`plan.json` next to the clips)

```json
{ "name": "…", "format": "reel", "fps": 30, "accent": "#F2362B",
  "audio": { "music": "music.mp3", "musicGainDb": -9, "lufs": -14 },
  "beats": [], "downbeats": [], "snap": "downbeat",
  "timeline": [
    { "type": "comp", "comp": "t-slam", "params": { "text": "Morning", "human": "my 5am routine", "bg": "accent" } },
    { "type": "transition", "comp": "tr-flood" },
    { "type": "clip", "src": "clips/talk.mp4", "in": 4.2, "out": 9.8, "look": "aroll",
      "overlays": [ { "comp": "ov-captions", "at": 0, "params": { "words": "<words_talk.json>" } },
                    { "comp": "ov-chip", "at": 0.2, "params": { "text": "Step 01", "accentText": "/ 03" } } ] },
    { "type": "comp", "comp": "chapter", "duration": 2.4, "params": { "title": "Setup", "sub": "Light · Desk · Cam", "src": "clips/broll.mp4" } },
    { "type": "transition", "comp": "tr-flash" },
    { "type": "comp", "comp": "ig-counter", "params": { "value": 12000, "label": "Views this week", "context": "Source: Instagram Insights" } },
    { "type": "transition", "comp": "tr-bars" },
    { "type": "comp", "comp": "endcard", "duration": 3.0, "params": { "handle": "@…" } }
  ] }
```

- `comp` items: any template in `docs/CATALOG.md` — IS Spec comps (`chapter`, `hook`, `endcard`, `talking`, `3d-*`…) and
  motion scenes (`t-*` titles, `ig-*` infographics, `card-*`, `mb-*`, `x-*`). `params` override defaults; `src` puts real
  footage behind IS titles. Motion scenes set their own length (pass `end`/`dur` params to change it).
- `clip` items: `in`/`out` in source seconds; `look` `aroll` (clean) or `behindTitles` (blur, −0.3 EV, push-in).
- `overlays` play over a clip (`at` = seconds into the clip): IS overlays (`ov-*`) or transparent motion scenes
  (`mb-*`, `card-notify`, `ig-*` with `"transparent": true`).
- `transition` items sit on the cut: `tr-flash`, `tr-torn`, `tr-ticker`, `tr-paper-roll` (IS) or `tr-flood`, `tr-dot`,
  `tr-bars`, `tr-zoom` (motion). Words for `ov-captions` are seconds relative to the overlay start.

Title behind the person: `python3 tools/separate.py clip.mp4 --preview work/` (pick points) →
`python3 tools/separate.py clip.mp4 --out work/masks --start 2 --end 6 --points 480,270 --labels 1` (or `--chroma 0x00FF00`
for green screen) → comp `t-behind` with `{"src":"clip.mp4","masks":"work/masks","start":2,"dur":4,"text":"Focus"}`.
SAM 2 runs on the user's machine (CPU works, slowly); say what the scan found before running it.

## 5. Review before the full render

```bash
node render/cli.mjs sheet plan.json --frames 0,30,60,90,120,150,180 --out review.png
```
Read the PNG. Fix: text inside Reels safe zones (top 220, bottom 420, right 140 px), nothing overlapping, titles fit,
captions ≤ 2 lines, every infographic number real or labelled as an example.

## 6. Render, sound, deliver

```bash
node render/build-reel.mjs plan.json --out reel.mp4 --blur 3        # picture + clip audio + music, −14 LUFS / −1 dBTP
node render/cues.mjs plan.json --out cues.json                      # every graphic's sound cue on the timeline
python3 render/sound.py --video reel.mp4 --cues cues.json --voice auto --out sound/ --use-case "Instagram Reels"
```
`sound/after.mp4` is the deliverable; report loudness, licences and the five timestamps from `sound/SOUND.md`.

## 7. Hand-off to After Effects / Premiere Pro / DaVinci Resolve

```bash
node render/nle.mjs plan.json --out pkg      # renders/ (ProRes; 4444 alpha for overlays), manifest.json, timeline.xml, edit.spec.json, plates/
```
- After Effects: run `integrations/after-effects/InkSignal.jsx`, then `InkSignal.buildFromPackage("/abs/pkg")` — IS Spec
  layers rebuild as native comps; motion scenes come in as their rendered plates.
- Premiere Pro: `InkSignalPPro.assemble("/abs/pkg")` via the MCP's ExtendScript tool, or import `timeline.xml`.
- DaVinci Resolve: `exec(open(".../ink_signal_resolve.py").read()); assemble("/abs/pkg")` via the MCP's Python tool, or import `timeline.xml`.
See `integrations/*/README.md` for exact MCP calls.

## Style rules (non-negotiable)

- One loud colour: the accent. Ink #0E0E0E, paper #ECEBE6, pen blue #2B44E0 for handwriting only.
- Titles: Archivo Expanded Black, caps, 1–2 words, entering as a selection (box 6f → handles 4f → land 12f), or a
  kinetic title (`t-*`). Subtitles 2–3 words joined with " · ". HUD labels in corners. Handwriting lowercase, with an arrow.
- Big moves on beats, type on 1/16 notes, cuts on downbeats. Transitions are objects (flash, torn, ticker, paper roll,
  flood, dot, bars, zoom-through), never dissolves between unrelated shots.
- Product UI and B-roll use the interface layer: white surfaces, rule border, soft shadow, Lucide icons, springs,
  a cursor that arrives before it clicks. Rounded corners only there.
- Behind titles footage is blurred, darkened and pushed in. A-roll stays clean.
- Real numbers only in infographics (or label them as examples); no invented quotes, ratings or logos.
- No gradients on type, glows, lens flares, RGB split, camera shake, emoji, bouncy cameras; no text in the Reels UI
  zones (top 220, bottom 420, right 140 px).

## Going beyond the templates

A moment no template covers: a motion scene (`docs/MOTION-ENGINE.md`: springs, `morph`, `rooms`, cursor, UI kit,
charts, kinetic type, fx) registered in `runtime/motion/scenes/index.js`, or an IS Spec comp in `runtime/comps/`
(native in After Effects). Keep it deterministic — every value a function of time, no `Math.random`, no CSS
animations — and render a sheet and look at it before using it.

## Gotchas

- Fonts live in `fonts/`; NLEs need them installed. Videos are pre-extracted to frames in `.ink-signal-cache/` next to
  the plan (delete it to free space); motion scenes inside plans are cached there too.
- Motion scenes render at any size (`width`/`height`/`fps` params); B-roll and plan renders follow the video.
- Finals with motion blur take minutes (one screenshot per subframe): send a `--blur 1` draft first, say so before the final.
- `snap` moves cuts to downbeats, which changes durations: re-check overlay timing on the sheet.
- Music must be licensed for the platform; loudness target −14 LUFS integrated, below −1 dBTP (−1.5 after the sound pass).
