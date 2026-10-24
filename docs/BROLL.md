# Motion B-roll for talking-head videos

Every clip is **one shape that never cuts**: it morphs size, corners and colour from state to state while its
content swaps with a short blur. A cursor drives the changes with real clicks and drags, and every change lands on
a spoken word. You get clips to drop into an editor, a preview of the video with them cut in, and a review page.

## 1. Inputs

- **The video** (any resolution / fps; clips render to match).
- **The transcript** with timestamps: SRT/VTT (`python3 tools/words.py talk.srt --out words.json`, ±0.2 s per word)
  or real word times from Whisper (`pip install faster-whisper`).
- **Density**: light 2–4 clips/min · medium 4–7 (default) · heavy (most lines, short gaps of face).
- **Look**: Ink & Signal paper (default) or their accent. **Anything to avoid or include** (real numbers, names).

## 2. Inspect

```bash
python3 tools/inspect_video.py talk.mp4 work/        # specs, contact.png, layout sections: full | pip | black
```

Look at `work/contact.png`. `pip` sections (speaker in a box, rest empty) take **panels**; `full` sections take
**cutaways**; `black` is a fade, intro or outro.

## 3. Plan — get approval before rendering

One row per clip: `# | in–out | the line it covers | what the shape does, on which words | treatment | why`.

- **Full-frame cutaway** when the line describes something to *see* (a product, a process, a comparison, a number,
  a chapter change). 3–10 s, then give the face back. Not in the first second of the hook, not on personal or
  emotional lines, at least ~2 s of face between cutaways.
- **Panel in the empty space** when the edit already leaves room: transparent clip centred in the empty area
  (`"kind": "panel", "center": [x, y]` in the video's pixels), sized to stay clear of the speaker; it can run long (15 s+).
  Clips render at the video's resolution and frame rate (720p, 1080p, 4K — the layout is identical, only sharper).
- **Nothing** when the line is about the speaker, or too close to another clip.

Content rules: show the subject's real objects (the folder, the terminal, the file, the result), taken from the
words. Map each idea onto the vocabulary below. **Never invent numbers, quotes, prices or results** — relative bars,
skeleton lines and labels from the transcript; list what is illustrative in `notes`. One idea per clip; pace to
speech: one change per spoken beat, 0.4–1.2 s apart.

| Vocabulary | Scene |
|---|---|
| primary action (pill + click), option picker | `mb-launch` |
| folder → terminal typing → agent steps | `mb-terminal` |
| notes → document → file chip dragged into a session | `mb-doc` |
| slider (direct manipulation) building a result | `mb-slider` |
| side-by-side comparison with a verdict | `mb-versus` |
| checklist ticking off → confirmation | `mb-checklist` |
| search → filter → pick | `mb-search` |
| chart card (bars / line + tooltip) | `mb-chart` |
| chapter card | `mb-chapter` |
| file drag → drop → upload | `mb-drop` |
| settings toggles | `mb-toggles` |

Put each state change on its word: `at` times are clip-local (word time − clip in-point). Word estimates from an
SRT drift within a cue: put important changes on the first or last word of a cue.

## 4. Build, check, render, deliver

```json
{ "title": "Opus vs Max", "video": "talk.mp4",
  "clips": [
    { "id": "01", "scene": "mb-launch", "in": 0.30, "out": 6.75, "kind": "full", "line": "“… just came out …”",
      "params": { "name": "Opus 5.5", "card": { "title": "Age of Empires II", "sub": "Browser replica", "icon": "castle" },
                  "at": { "badge": 0.63, "card": 2.17, "picker": 4.06, "clicks": [4.5, 4.85, 5.3] } } },
    { "id": "02", "scene": "mb-terminal", "in": 6.75, "out": 22.5, "kind": "panel", "center": [1300, 540], "line": "“I created a blank folder …”" }
  ],
  "notes": ["The typed prompt is illustrative."] }
```

```bash
node render/cli.mjs sheet mb-launch --params '{…}' --times 0.4,1.2,2.2,4.1,5.4 --out check.png   # stills on the key words
node render/broll.mjs broll.plan.json --draft          # fast review renders
node render/broll.mjs broll.plan.json                  # final: 4 subframes of motion blur per frame
python3 render/sound.py --video out/preview.mp4 --cues out/cues.json --voice auto --out out/sound   # optional SFX pass
```

`out/` gets the clips (named by in-point, `0m32s40` = 0:32.40; panels as ProRes 4444 `.mov`), `TIMING.md`,
`preview.mp4` (their video with the clips cut in, original audio), `review.html` (step through clips + before/after
side by side, stacked or wipe) and `cues.json`. Say plainly that the preview is for review: for the final cut they
place the clips in their editor, where they can nudge timing and mix audio.

## Style

Paper canvas `#ECEBE6`, white surfaces with a rule border and soft shadow, ink controls, one accent; Archivo for UI,
JetBrains Mono for code and file names; Lucide line icons at one stroke weight. Springs with a tiny overshoot at
most; leading and trailing edges ride different springs so indicators stretch; the camera zooms so each state fills
the frame. Banned: bouncy easing, particles, glows, gradients on UI chrome, mixed icon strokes, dead time, made-up data.
