---
name: ink-signal-explainer
description: Make SaaS and product explainer videos in the Ink & Signal style with the ink-signal library — a 12–20 s beat-locked hype promo, a 30–90 s calm product demo with the UI rebuilt and filmed up close, a looping one-take journey, or polished screen recordings — rendered from code with motion blur and a measured sound pass.
---

# Explainers with Ink & Signal

Library root = the folder with `tokens/ink-signal.tokens.json`. Read the root `SKILL.md` (design rules) and
`docs/EXPLAINERS.md` (beat sheets and structure) first.
If it isn't attached or on disk, ask the user to attach the `ink-signal` folder/zip, or clone
https://github.com/AkashKhairal/ink-signal; then `npm install && npx playwright install chromium` inside it
(needs Node 18+, ffmpeg, python3 with numpy + Pillow).

## 1. Brief — one message, then work

Ask in one message (only the product is required; decide the rest and say what you chose): product + what it does
(a URL is better), the one thing to remember, brand (accent, logo file, fonts — or Ink & Signal), format 16:9 or
9:16, length, music (their track + its licence, or none), direction (tagline, CTA, scenes, things to avoid). For
demos also the 3–5 features or workflow steps and what it connects to. If they gave a URL, read it for their real
wording, features and colours before writing anything.

**Never invent facts**: no customer counts, revenue, ratings, testimonials, quotes, offers. Example UI content
(prompts, file names, project names) is fine and should be believable. CTA = a URL/offer they gave, else name +
tagline. Logos only if supplied; integrations as neutral name tiles.

## 2. Choose the template

| Want | Template | Length |
|---|---|---|
| hype reel, launch sting, teaser | `x-hype` | 12–20 s at 120–140 BPM (8 bars ≈ 15 s at 128) |
| homepage demo, feature walkthrough, “how it works” | `x-demo` | 30–90 s (2–5 features) |
| playful loop that shows the workflow in one take | `x-journey` | 10–16 s loop |
| their real product, recorded | `sr-zoom` (+ `mb-*` clips, `ig-*` charts) | any |
| a longer video | an edit plan mixing `x-*`, `t-*`, `ig-*`, `card-*`, `tr-*` (see `skills/ink-signal-reels`) | any |

## 3. Write the beat sheet / script first

Show it as a table before rendering: time · scene · what's on screen (exact words) · what carries in/out · sound.
- `x-hype`: map the product onto spark → brand slam → kinetic triplet (3 words, two beats each) → 3D signature →
  product micro-moment (their real UI labels) → bridge → end card. Set `bpm`/`offset` from `render/beats.py` on their track.
- `x-demo`: every on-screen line (short; it is the only voice) and which UI moment follows it (`prompt`, `steps`,
  `table`, `chat`, `chart` with real numbers only); add up the time against the budget (45 s → 2–3 features).
- `x-journey`: the workflow as stations with witty 2–4-word labels (`Agent · Writing 12 files`), the typed word, the result toast.

## 4. Params file → look → draft → final

```bash
cat > promo.json   # params for the template (see docs/CATALOG.md for every key), e.g. {"format":"yt","product":"…",…}
node render/cli.mjs sheet x-hype --params-file promo.json --auto 12 --out check.png      # Read it; fix and repeat
node render/cli.mjs render x-hype --params-file promo.json --blur 1 --out draft.mp4      # send for review
node render/cli.mjs render x-hype --params-file promo.json --blur 4 --out promo_silent.mp4   # final (+ promo_silent.cues.json)
python3 render/sound.py --video promo_silent.mp4 --cues promo_silent.cues.json --music track.mp3 \
  --music-source "…" --music-license "…" --align --out sound/ --use-case "…"
```

Check every sheet for anything clipped, overlapping, unreadable, off-brand, badly framed or empty. Finals with motion
blur take minutes; say so before starting. Brand: their accent replaces signal red everywhere via `"accent"`.

## 5. Deliver

`sound/after.mp4`, the params file (they can change any word and re-render), `sound/SOUND.md` + `CREDITS.txt`, and a
short note: the beat sheet, what is placeholder, the loudness numbers, the five timestamps to check with headphones,
and one alternative direction in a sentence. For editors: put the scene in an edit plan and run `node render/nle.mjs`.

## Going further

Need a scene the templates don't have? Write one with the motion engine (`docs/MOTION-ENGINE.md`): `rooms()` for
camera scenes, `morph()` for one-shape sequences, the UI kit for product screens, `charts.js` for data, `type.js`
for kinetic type, `fx.js` for HUD, transitions and brand devices. Keep it a pure function of time.
