# Ink & Signal — motion spec

All numbers are frames at 30 fps (scale them for 24/60; the runtime does this automatically).
Easing names refer to `tokens.ease`:

| ease | cubic-bezier | use |
|---|---|---|
| `snap` | .16, 1, .3, 1 | titles landing, boxes drawing, slides |
| `stamp` | .34, 1.56, .64, 1 | glyph stamps, handle pops, polaroid drops — the only overshoot |
| `wipe` | .76, 0, .24, 1 | torn wipes, panel pushes, 3D camera moves between holds |
| `write` | .4, 0, .2, 1 | handwriting, arrows, circles |
| `drift` | .45, 0, .55, 1 | footage push-ins, 3D holds |
| `exit` | .7, 0, .84, 0 | leaving frame |
| `linear` | 0, 0, 1, 1 | tickers, type-on, counters |
| `hold` | — | step |

## Worlds

**Night** — footage (or the stand-in "dark room" plate) blurred 18 px, −0.3 EV, saturation .85, pushed 100 → 106 %
over the shot (`drift`); 54/60 px white grid at 4.5 %; animated grain 14 % (screen).

**Paper** — #ECEBE6, 45/40 px ink grid at 8 %, crumpled-paper plate (faceted Voronoi normals lit from azimuth 130°,
elevation 58°, multiply 55 %).

## Components (runtime/components.js)

| component | anatomy | timing |
|---|---|---|
| `selectionTitle` | display text, 3 px accent box (pad 11 % × 6 % of size), 8 white handles 16 px with 3 px accent stroke, optional `W · H` label | box reveals from its top-left corner 0→6 (`snap`) · handles scale 0→100 6→10 (`stamp`) · text 112→100 % and 0→100 opacity from 4→16 (`snap`), scaled around 50 % / 60 % |
| `ticker` | 64 px ink band, 1 px #2A2A2A rules, label font caps, separator = star·sparkle·plus cluster at 66 % of cap size, gap 1.15 em | linear 120 px/s (fast 220), never eases; direction alternates between bands |
| `hud` / `hudCorners` | HUD font 22 px caps in accent; coordinates in JetBrains Mono; 72 px from the sides, Reels: 270 px from top, above the bottom UI zone | type-on 1 char/frame, corners staggered 0/2/4/6 |
| `glyphRow` | star, sparkle, plus (40-unit paths) | each: rotate −90→0 and scale 0→100 over 8 (`stamp`), stagger 3 |
| `handNote` | Caveat Bold, pen blue (on paper) or white (on night), rotated −3…−5° | write-on reveal left→right over 18 (`write`) |
| `arrow` | quadratic shaft + 2-stroke head, 5 px round caps | shaft trims 0→1 over 12 (`write`), head draws after |
| `circleMark` | loose hand ellipse that overshoots its start, signalDeep 4 px | trims over 14 (`write`) |
| `polaroid` | white card, pad 4.7 %, bottom 20 %, Caveat caption, soft shadow | drops 60 px and −10° → final rotation over 14 (`stamp`) |
| `cutout` | ink circle photo, paper gap 9 px, accent ring 11 px | stamps in like a glyph |
| `captions` | display font 62 px caps (reel), lines ≤ 2, word plates pad 18 % | page appears on its first word; active word: accent plate + ink text 94→106 % over 3 (`stamp`); min word 5 frames |
| `lowerThird` | name bar (ink, display 60 px, star stamp) + role bar (accent, label + mono handle) | each bar slides in from the left 10 (`snap`), role 4 later; slides out 8 (`exit`) |
| `stepChip` | ink band from the left edge: "STEP 03" white + "/ 05" accent + cluster | slides in 10 (`snap`) |
| `punchWord` | accent plate, ink text, 8 px white outline, −6° | 220 → 94 → 100 % and −30° → −2° → −6° over 6, 1.2 px wiggle at 15 Hz |
| `letterRise` | display word, each letter rising out of a line mask | 12 per letter (`snap`), stagger 2 |
| `callout` | accent selection rect around a region, 6 handles, mono tag plate, live `W · H` | like `selectionTitle` |
| `flash` | white solid | 2 frames, cut on frame 0 |
| `tornWipe` | torn panel 130 % frame height, torn both ends | in 10 (`wipe`) → covers 2 frames (cut here) → out 10 (`wipe`) |
| `tickerWipe` | ticker band scales to full frame and back | 9 in, 2 hold, 9 out |

## 3D (runtime/three)

- Units: the title's cap height ≈ 0.69 units; cameras are framed with `fitDistance()`.
- Camera: fov 28 (long lens). Move with `wipe`, hold with `drift`. Never spin continuously; only tickers and rings rotate linearly.
- Materials: signal (accent, roughness .42, emissive 6 %), ink (#0E0E0E, roughness .62), paper (roughness .95), polaroid (white .8).
- Extrusion: depth .32 × size, bevel .012 / .01, 2 segments. Faces signal or ink, sides ink.
- Light: key from top-left (azimuth 130°, elevation 58°, 3.2), cool fill .55, accent rim 1.0 on night, ACES tone mapping, soft PCF shadows.
- Gizmo: 12 edges (3 % of a unit) draw from the top-left-front corner over ~10 frames (`snap`), 8 white cube handles pop (`stamp`).
- Scenes: `gizmoTitle`, `popupPaper`, `tickerRing`, `polaroidFlythrough`, `paperRoll` (transition with alpha).

## IS Spec (ink-signal/1)

```
{ spec, name, format, width, height, fps, duration (frames), background|null, accent, markers[{frame,label}],
  timeline? (edit only), layers: Layer[] (bottom → top) }

Layer = { id, type, in, out (frames, absolute), t: { anchor:[x,y], position:[x,y], scale:[sx,sy] (%), rotation (deg), opacity (0–100) },
          reveal?: { mode: 'box'|'x'|'y'|'x-rev', p: Anim 0..1 }, blend?: 'multiply'|'screen', wiggle?: { amp, freq, seed }, guide? }
Anim  = { k: [[frame, value, ease?], ...] }   // ease shapes the segment to the next key

solid   { color, size }                         rect    { size, fill?, stroke?, sw?, shadow? }
ellipse { size, fill?, stroke?, sw? }            path    { d (SVG, absolute M/L/H/V/C/Q/Z), fill?, stroke?, sw?, cap?, join?, trim?: Anim 0..1 }
text    { text, font (token key), size, color, align, tracking (em), lineHeight (×size), box:[w,h], baseline,
          chars?: { mode:'typeon', at, perChar } | { mode:'rise', at, stagger, dur, ease }, counter?: { mode:'timecode', start } }
ticker  { size, band, rule, items[], font, fontSize, color, gap, sepHeight, speed (px/s), dir (−1 left / 1 right), phase }
footage { src?, srcIn?, size, fit, blur, exposure (EV), saturation, kind? }   image { src, size }
texture { kind:'grid'|'crumple'|'grain', size, grid?, line?, seed?, opacity?, amount? }
group   { size, clip?: true|'ellipse', layers[] }          three { scene, params, size }
```
Text layout: origin = top-left of the text block; each line box is `lineHeight × size`; caps are centred in it;
advances come from `runtime/metrics.js` (no kerning, identical everywhere).

## NLE mapping

| IS Spec | After Effects (InkSignal.jsx) | Premiere / Resolve |
|---|---|---|
| text | text layer, real font, tracking ×1000, leading, justification; anchor offset to the first baseline | rendered (alpha) · Resolve `add_title()` native Text+ (beta) |
| chars typeon / rise | text animator + Expression Selector (exact per-character timing and bezier) | rendered |
| rect / ellipse / path | shape layer (rect / ellipse / bezier path), fill, stroke, Trim Paths for `trim` | rendered |
| reveal | rectangle mask with keyed mask path | rendered |
| Anim + ease | keyframes with KeyframeEase speed/influence from the cubic-bezier; `hold` → HOLD; spatial tangents zeroed | rendered |
| group | precomp (ellipse clip → mask) | rendered |
| ticker | precomp: text + glyph shape layers parented to a null with a linear position expression | rendered |
| footage | precomp with the footage cover-scaled, Gaussian Blur, Exposure | V1 clip / rendered |
| texture grid / crumple, placeholders | `plates/*.png` | rendered |
| grain | adjustment layer + Noise | rendered |
| three | `renders/pass_*.mov` (ProRes 4444) | rendered |
| markers | comp markers | sequence / timeline markers |
