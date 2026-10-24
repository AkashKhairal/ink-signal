# Ink & Signal — recipes

Structures that keep every video consistent. Times assume ~120 BPM (one bar = 2 s); with `"snap": "downbeat"`
cuts move to the nearest bar line.

## Reels

### 15 s — one tip
| bar | shot | graphics |
|---|---|---|
| 1 | `hook` (word + cutout) or A-roll with `ov-punch` | hook line in ≤ 2 s |
| 2–3 | A-roll | `ov-captions`, `ov-chip` "Step 01 / 01" |
| — | `tr-flash` on the downbeat | |
| 4–6 | B-roll, `look: behindTitles` | `ov-title` (1 word) + `ov-note` with arrow |
| 7 | A-roll | captions, `ov-punch` on the key word |
| 8 | `endcard` (reel) | follow CTA |

### 30 s — process / tutorial (3 steps)
`hook` (1 bar) → `tr-torn` → per step: `chapter` (1 bar, `src` = B-roll of that step) → A-roll with captions +
`ov-chip "Step n / 3"` + `ov-callout` on the object (2 bars) → `tr-flash` → … → `3d-title` "Done" (1 bar) → `endcard`.

### 60 s — story / journey
`hook` → `3d-polaroids` (captions = milestones) → `tr-paper-roll` (Chapter 01) → A-roll + captions → `chapter` →
B-roll montage on beats (cut every bar, `ov-hud` on top) → `tr-ticker` → A-roll payoff with `ov-punch` → `endcard`.

## YouTube

- **Cold open** (0–8 s): A-roll + captions, `ov-punch` on the stakes word.
- **Title** (8–12 s): `3d-title` or `3d-ring` with the video's one-word theme.
- **Chapters**: `chapter` (yt) or `tr-paper-roll` with the chapter name — add a marker per chapter for YouTube chapters.
- **Talking**: `ov-lowerthird` once in the first minute, `ov-callout` for anything on the desk, `ov-note` for asides.
- **End**: `endcard` (yt) — slots are positioned for YouTube end-screen elements (video, playlist, subscribe).

## Copy rules

- Titles: 1–2 words, nouns or verbs ("Setup", "Done", "Light"). No full stops.
- Subtitles: 2–3 words with " · ". HUD: `PORTFOLIO OF @handle`, a series name, coordinates, `EP 04 / 2026`.
- Notes: lowercase, conversational, ≤ 4 words per line ("this changed everything").
- Punch words: one word + full stop ("Wait." "Nope." "Done.").

## Prompt template for Claude

```
<inputs>
Clips: ~/Videos/reel-12/*.mp4 · transcript: talk.srt · music: track.mp3 (licensed) · handle: @...
</inputs>
<direction>
Ink & Signal. 30 s tutorial structure from RECIPES.md. Hook in 2 s. Cut on downbeats. One idea per shot.
</direction>
<build>
Use the ink-signal library: beats.py → words.py → plan.json → sheet review → build-reel.mjs.
Also export the NLE package for Premiere.
</build>
<start>
Show me the storyboard on the beat grid and a review sheet before the full render.
</start>
```
