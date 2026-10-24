---
name: ink-signal
description: Make videos in the Ink & Signal motion design system with the ink-signal library — Instagram Reels and YouTube edits, SaaS promos and product demos, motion B-roll for talking heads, infographics, card animations, kinetic titles, sound design — and hand them to After Effects, Premiere Pro or DaVinci Resolve.
---

# Ink & Signal

The `ink-signal/` library (attached folder or zip) is a deterministic motion design system:
**tokens → two engines → templates → renders, sound and NLE timelines.** Use it for every video the user asks
for so their work stays consistent. Never restyle by hand: change params, or tokens for the whole brand.

- **IS Spec engine** (canvas; rebuilt natively in After Effects): titles, A-roll overlays, captions, transitions, 3D.
- **Signal Motion engine** (browser; springs, camera, cursor, UI kit, charts, kinetic type): explainers, B-roll,
  infographics, cards, kinetic titles, object transitions. Both render through the same CLI and mix in one edit plan.

## 0. Set up (once per session)

1. Find the library root (the folder with `tokens/ink-signal.tokens.json`); unzip it if it came as a zip.
2. Check tools: `node -v` (18+), `ffmpeg -version`, `python3 -c "import numpy, PIL"`. Inside the library:
   `npm install && npx playwright install chromium` if Playwright is missing.
3. `node render/cli.mjs list` prints every template; `docs/CATALOG.md` has their params.

## 1. Route the request

| The user wants… | Read, then follow |
|---|---|
| a Reel / YouTube edit from their clips (captions, chapters, beat cuts, titles) | `skills/ink-signal-reels/SKILL.md` |
| a SaaS promo, launch sting, product demo, “how it works”, a one-take loop | `skills/ink-signal-explainer/SKILL.md` (+ `docs/EXPLAINERS.md`) |
| motion graphics / B-roll / cutaways over a talking-head video | `skills/ink-signal-broll/SKILL.md` (+ `docs/BROLL.md`) |
| sound effects, music, a mix that's ready to post | `skills/ink-signal-sound/SKILL.md` (+ `docs/SOUND.md`) |
| one graphic: a chart, a big number, a card animation, a title, a transition | pick from `docs/CATALOG.md`, render it (below) |
| a moment no template covers | `docs/MOTION-ENGINE.md` (write a scene) or `runtime/comps/` (IS Spec comp) |
| title behind the person | `tools/separate.py` → `t-behind` (see the reels skill) |

## 2. The commands

```bash
node render/cli.mjs sheet <name|plan.json> --format reel|yt|square --params '{…}' --auto 9 --out check.png   # LOOK at it
node render/cli.mjs render <name|plan.json> --params-file p.json --blur 1 --out draft.mp4                    # review copy
node render/cli.mjs render <name|plan.json> --params-file p.json --blur 4 --out final.mp4                    # + .cues.json
node render/cli.mjs render <overlay> --params '{"transparent":true}' --out overlay.mov                       # ProRes 4444 alpha
node render/build-reel.mjs plan.json --out reel.mp4 --blur 3          # clips + graphics + music, −14 LUFS
node render/broll.mjs broll.plan.json                                  # B-roll clips + TIMING + preview + review page
python3 render/sound.py --video x.mp4 --cues x.cues.json --out sound/  # measured SFX pass
node render/nle.mjs plan.json --out pkg/                               # After Effects / Premiere / Resolve package
```

Always render a sheet and look at it (Read the PNG) before a full render; fix anything clipped, overlapping,
unreadable, off-brand or empty. Send a draft before the final when the user is around; finals with `--blur 4`
take minutes (each subframe is a screenshot) — say so before starting.

## 3. Design rules (non-negotiable)

**Brand layer.** One loud colour: the accent (signal red `#F2362B` unless the user's brand replaces it). Ink
`#0E0E0E`, paper `#ECEBE6` with a graph grid, night `#0B0B0C`. Titles in Archivo Expanded Black, caps, 1–2 words,
entering as a design-tool selection (box 6f → handles 4f → land 12f). HUD labels in corners (JetBrains Mono /
Archivo Expanded), tickers linear, handwriting (Caveat, pen blue `#2B44E0` on paper, white on night) with an arrow
to the thing, the glyph trio (star · sparkle · plus) as the stamp. Brand devices have square edges.

**Interface layer** (product UI rebuilt in the brand). Paper canvas, white surfaces with a 1.5 px rule border and a
soft shadow (night: raised panels, hairline), Archivo for UI text, JetBrains Mono for code/numbers, Lucide line
icons at one stroke, one accent. Rounded corners only here (`tokens.ui.radius`). Springs (`tokens.springs`), never
bouncy cameras; content swaps with a short blur; the cursor arrives a beat before it clicks.

**Motion.** One idea per shot; titles hold ≥ 18 frames after landing; big moves on beats, type on 1/16 notes; cuts
on downbeats; transitions are objects (flood, dot, bars, torn paper, zoom-through, ticker) or a 2-frame flash. In
calm pieces the camera is the editor (push in, ride, pull back), no hard cuts.

**Truth.** Never invent numbers, customer counts, ratings, testimonials, quotes or logos. Without real figures use
relative bars, skeleton lines and labels from the script; say what is illustrative. Calls to action only with a URL
or offer the user gave. Third-party logos only when supplied.

**Sound.** Real recorded sounds only (bundled CC0), one per interaction, measured to −14 LUFS / < −1.5 dBTP on the
exported file; never claim it sounds good — give five timestamps to check.

Banned: second loud colour, gradients on type, glows, lens flares, RGB split, camera shake, emoji, bouncy
easing on large moves, text in the Reels UI zones (top 220, bottom 420, right 140 px).

## 4. Gotchas

- Fonts live in `fonts/`; NLEs need them installed. Videos are pre-extracted to JPEG frames in `.ink-signal-cache/`
  next to the plan (delete it to free space); motion scenes inside plans are cached there as PNG sequences.
- Motion-scene params named `accent` are colours; chart highlight indices are `focus`.
- B-roll `at` times are clip-local seconds (word time − clip in). Edit-plan overlay words are relative to the overlay start.
- 3D renders on CPU WebGL in headless mode: fine, slower with blur.
- Motion scenes render at any size (`"width"`, `"height"`, `"fps"` params, e.g. a 4K or 720p video's): the layout is
  the same picture as 1080p, drawn at that resolution.
