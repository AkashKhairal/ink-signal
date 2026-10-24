---
name: ink-signal-reels
description: Edit Instagram Reels and YouTube videos in the Ink & Signal motion style (graph paper, night footage, one signal red, selection-box titles, tickers, handwriting, 3D gizmo titles) using the ink-signal library, and hand edits to After Effects, Premiere Pro or DaVinci Resolve.
---

# Ink & Signal — making Reels and YouTube videos

The `ink-signal/` library (attached folder or zip) is a deterministic motion system: tokens → components →
compositions → renders / NLE timelines. Use it for every Reel or YouTube edit the user asks for so their
videos stay consistent. Never restyle by hand; change tokens or params instead.

## 0. Set up (first time in a session)

- Find the library root (folder containing `tokens/ink-signal.tokens.json`). If it came as a zip, unzip it.
- Check tools: `node -v` (18+), `ffmpeg -version`, `python3 -c "import numpy"`. Install what's missing:
  `npm install && npx playwright install chromium` inside the library.
- Read `tokens/ink-signal.tokens.json` (rules at the bottom) and `docs/RECIPES.md` once.
- `node render/cli.mjs list` shows every composition and its params live in `runtime/comps/*.js` (`defaults`).

## 1. Inputs to collect

Clips (paths), what the video is about, the hook line, chapter titles, handle (@...), accent (default
signal red #F2362B), music (licensed for the platform), and a transcript (SRT/VTT or Whisper JSON) for captions.
If something is missing and the user is present, ask once; otherwise use placeholders like `[Your Name]` and say so.

## 2. Analyse

```bash
ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate -of compact clip.mp4
python3 render/beats.py music.mp3 --out beats.json          # bpm, beats, downbeats, drop
python3 tools/words.py talk.srt --from 4.2 --to 9.8 --out words_talk.json   # words for one clip window
```

## 3. Storyboard on the beat grid

Pick a structure from `docs/RECIPES.md`. Every cut on a downbeat (`"snap": "downbeat"` + beats in the plan),
hook in the first 2 s, one idea per shot, titles held ≥ 18 frames after they land. When the user is present,
show the storyboard as a short table (time · shot · graphic) before rendering.

## 4. Write the edit plan (`plan.json`, next to the clips)

```json
{ "name": "...", "format": "reel", "fps": 30, "accent": "#F2362B",
  "audio": { "music": "music.mp3", "musicGainDb": -9, "lufs": -14 },
  "beats": [...], "downbeats": [...], "snap": "downbeat",
  "timeline": [
    { "type": "comp", "comp": "hook", "duration": 3.0, "params": { "word": "Hell", "note": "yep, that's me", "src": "clips/me_cutout.png" } },
    { "type": "transition", "comp": "tr-torn", "params": { "color": "ink" } },
    { "type": "clip", "src": "clips/talk.mp4", "in": 4.2, "out": 9.8, "look": "aroll",
      "overlays": [ { "comp": "ov-captions", "at": 0, "params": { "words": "<contents of words_talk.json>" } },
                    { "comp": "ov-chip", "at": 0.2, "params": { "text": "Step 01", "accentText": "/ 03" } } ] },
    { "type": "comp", "comp": "chapter", "duration": 2.4, "params": { "title": "Setup", "sub": "Light · Desk · Cam", "src": "clips/broll.mp4" } },
    { "type": "transition", "comp": "tr-flash" },
    { "type": "comp", "comp": "endcard", "duration": 3.0, "params": { "handle": "@..." } }
  ] }
```

- `comp` items: any composition; `params` override its `defaults`; `src` puts real footage behind titles.
- `clip` items: `in`/`out` in source seconds; `look` = `aroll` (clean) or `behindTitles` (blur, −0.3 EV, push-in).
- `overlays` play over a clip (`at` = seconds into the clip). `transition` items sit on the cut between neighbours.
- Words for `ov-captions` are seconds relative to the overlay start.

## 5. Review before the full render

```bash
node render/cli.mjs sheet plan.json --frames 0,30,60,90,120,150,180 --out review.png
```
Look at the sheet (Read the PNG). Fix: text inside Reels safe zones (top 220, bottom 420, right 140 px),
nothing overlapping, titles fit (comps auto-shrink, but keep titles to 1–2 words), captions ≤ 2 lines.

## 6. Render and deliver

```bash
node render/build-reel.mjs plan.json --out final.mp4 --blur 3      # graphics + clips + music, −14 LUFS / −1 dBTP
```
Check duration and loudness (`ffmpeg -i final.mp4 -af loudnorm=print_format=summary -f null -`), then send the MP4.

## 7. Hand-off to After Effects / Premiere Pro / DaVinci Resolve

```bash
node render/nle.mjs plan.json --out pkg      # renders/ (ProRes, 4444 alpha for overlays), manifest.json, timeline.xml, edit.spec.json, plates/
```
- After Effects (native, editable): run `integrations/after-effects/InkSignal.jsx`, then `InkSignal.buildFromPackage("/abs/pkg")`.
  Single graphic: `node render/cli.mjs spec chapter --params '{...}' --out chapter.spec.json` → `InkSignal.buildFromSpec("/abs/chapter.spec.json")`.
- Premiere Pro: `InkSignalPPro.assemble("/abs/pkg")` via the MCP's ExtendScript tool, or import `timeline.xml`.
- DaVinci Resolve: `exec(open(".../ink_signal_resolve.py").read()); assemble("/abs/pkg")` (or import it as a module; see its README) via the MCP's Python tool, or import `timeline.xml`.
- Single overlays for any NLE: `node render/cli.mjs render ov-lowerthird --format yt --params '{"name":"..."}' --out lt.mov` (alpha).
See `integrations/*/README.md` for exact MCP calls.

## Style rules (non-negotiable)

- One loud colour: the accent. Ink #0E0E0E, paper #ECEBE6, pen blue #2B44E0 for handwriting only.
- Titles: Archivo Expanded Black, caps, 1–2 words, enter as a selection (box 6f → handles 4f → land 12f).
- Subtitles: 2–3 words joined with " · ". HUD labels in corners. Handwriting lowercase, with an arrow to the thing.
- Tickers linear, never eased. Cuts on downbeats. Transitions: hard cut, 2-frame flash, torn wipe, ticker wipe, paper roll.
- Behind titles footage is blurred, darkened and pushed in. A-roll stays clean.
- 3D: long lens, eased move-then-hold cameras, red faces / ink sides, key light top-left. No chrome, glow, neon, lens flares, camera shake, emoji.
- No full stops in titles; punch words and the end card may use one.

## Going beyond the templates

Need a moment that doesn't exist? Add a composition in `runtime/comps/` built from `runtime/components.js`
(selectionTitle, ticker, hud, glyphRow, handNote, arrow, circleMark, polaroid, cutout, captions, lowerThird,
stepChip, punchWord, letterRise, callout, tornWipe, tickerWipe, flash, three) and register it in
`runtime/comps/index.js`. New 3D scenes go in `runtime/three/scenes.js` using `three/kit.js`
(materials, lights, floor, textMesh, glyphMesh, gizmo, cameraRig, orbit, fitDistance).
Keep it deterministic: no `Math.random` (use `rng(seed)`), no clocks, no CSS animations — every value from the frame.
Durations come from `tokens.duration`, easing names from `tokens.ease`. Render a sheet and look at it before using it.

## Gotchas

- Fonts must exist in `fonts/`; NLEs need them installed on the machine.
- Videos are pre-extracted to JPEG frames in `.ink-signal-cache/` next to the plan (exact seeking, any codec); delete it to free space.
- 3D renders on CPU WebGL in headless mode: fine for Reels, slower with `--blur`. Use `--blur 1` for previews.
- `edit` plans with beats: if `snap` moves a cut, durations change; re-check overlay timing on the sheet.
- Music must be licensed for the platform; loudness target −14 LUFS integrated, −1 dBTP.
