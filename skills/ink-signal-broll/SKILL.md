---
name: ink-signal-broll
description: Turn a talking-head video and its transcript into Ink & Signal motion-graphic B-roll timed to the speaker's words — one shape that never cuts, driven by a cursor and springs — as full-frame cutaways or transparent panels, with TIMING.md, a preview composite, a review page and an optional sound pass.
---

# Motion B-roll with Ink & Signal

Library root = the folder with `tokens/ink-signal.tokens.json`. Read the root `SKILL.md` and `docs/BROLL.md` first.
If it isn't attached or on disk, ask the user to attach the `ink-signal` folder/zip, or clone
https://github.com/AkashKhairal/ink-signal; then `npm install && npx playwright install chromium` inside it
(needs Node 18+, ffmpeg, python3 with numpy + Pillow).

## 1. Interview (one round, AskUserQuestion when available)

The video (path), the transcript (SRT/VTT, or get word times with faster-whisper), density (light 2–4/min,
medium 4–7 default, heavy), look (Ink & Signal paper or their accent), anything to avoid or include (real numbers,
names, product screenshots). Skip what they already answered.

## 2. Inspect

```bash
python3 tools/inspect_video.py talk.mp4 work/         # Read work/contact.png; video.json has full / pip / black sections (+ panel_center)
python3 tools/words.py talk.srt --out work/words.json  # word estimates (±0.2 s)
```

## 3. Plan and get approval before any render

Table: `# | in–out | the line | what the shape does, on which words | treatment | why`. Treatment per clip:
full-frame cutaway (3–10 s, a line about something to see; not in the hook's first second, not on personal lines,
≥ 2 s of face between), transparent panel (`"kind": "panel"`, `"center"` in the empty area of a PiP section), or nothing.
Map ideas to the vocabulary: `mb-launch` (pill → card → picker), `mb-terminal`, `mb-doc`, `mb-slider`, `mb-versus`,
`mb-checklist`, `mb-search`, `mb-chart`, `mb-chapter`, `mb-drop`, `mb-toggles` — params in `docs/CATALOG.md`.
Never invent numbers, quotes, prices or results; list what is illustrative in `notes`.

## 4. Build

Write `broll.plan.json` (schema in `docs/BROLL.md`). Each state change lands on its word: `at` times are clip-local
(word time − clip in). Check stills on the key words before rendering:

```bash
node render/cli.mjs sheet mb-terminal --params '{…}' --times 0.5,1.9,2.8,5.4,7.6 --out work/02.png   # Read it
```
Fix anything cramped, clipped, unreadable, off-word, or a cursor leaving the frame. Then:

```bash
node render/broll.mjs broll.plan.json --draft     # quick review renders (no motion blur)
node render/broll.mjs broll.plan.json             # final (4 subframes per frame; slower than real time)
```

## 5. Deliver

From `out/`: the clips (named by in-point; panels are ProRes 4444 `.mov`), `TIMING.md`, `preview.mp4` (their video with
the clips cut in, original audio), `review.html` (step through clips, before/after side by side / stacked / wipe).
Say plainly the preview is for review: for the final cut they place the clips in their editor.
Optional sound: `python3 render/sound.py --video out/preview.mp4 --cues out/cues.json --voice auto --out out/sound`.
