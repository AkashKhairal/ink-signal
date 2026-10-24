# Sound design

Every visible interaction gets one real sound: clicks click, toggles tick, cards pop, slams hit, camera moves
whoosh, risers end on the hit. Claude can't hear, so the pass never judges by feel: it measures every step and
hands the user five timestamps to check with headphones. It never says “it sounds good”.

## Where cues come from

- **Motion scenes** write their own: `node render/cli.mjs render x-hype --out promo.mp4` → `promo.cues.json`
  (every click, slam, typing run, whoosh, success, with times).
- **Edit plans**: `node render/cues.mjs plan.json --out cues.json` — cuts, transitions, overlays, IS Spec devices
  (selection boxes, stamps, handwriting, type-ons, punches, flashes, torn wipes) and every motion scene's own cues.
- **B-roll**: `render/broll.mjs` writes `out/cues.json` on the video timeline.
- **By hand**: `[{ "t": 2.0, "type": "scene_cut", "desc": "cut to card" }, { "t": 4.2, "type": "typing", "dur": 1.3 }]`.

Cue types → categories (tokens `sound.cueMap`): movement / scene_cut / transition → whoosh (2 frames early) ·
appear / stamp → pop · click / toggle → click · typing → typing (looped to `dur`) · build_up → riser (ends on the
hit) · reveal / slam → impact · success / notify → ding · error → glitch · hover / tick / count → tick · bed → room tone.

## The pass

```bash
python3 render/sound.py --video silent.mp4 --cues silent.cues.json --out sound/ \
  --music track.mp3 --music-source "Track, Artist, link" --music-license "…" --align \
  --use-case "Instagram Reels and YouTube"
# a video that already has voice/music (a built reel, a B-roll preview): --voice auto keeps it and adds the SFX
```

1. **Beat grid**: `render/beats.py` finds the tempo and downbeats; the kicks below 120 Hz are checked against the
   grid (`beatgrid.png`) and the grid is shifted if they sit off it.
2. **Cuts on the beat**: `--align` moves where the music starts so hard cuts and reveals land on beats (or change the
   animation timings and re-render). The error per cut is reported in ms.
3. **One sound per cue** from the bundled CC0 library (`sound/sfx`, Ink & Signal kit first, a few close takes rotate
   on repeats so they don't sound robotic). Gains per category, whoosh pre-roll and minimum gaps come from tokens.
4. **Mix**: voice > SFX > music. Music about 12 dB under the effects, ducking up to 10 dB under the voice.
5. **Loudness on the exported MP4**: −14 LUFS integrated, true peak below −1.5 dBTP (stereo and mono), measured,
   adjusted, measured again (tokens `sound.mix`).
6. **Proof**: `checks/cue-XX.png` (frame before, frame after, waveform around the cue); the 5 riskiest timestamps.

Outputs: `after.mp4`, `SOUND.md` (licences, log, cue table, loudness, the 5 timestamps), `CREDITS.txt` (paste-ready),
`report.html` (play every sound, swap any cue for an alternative or “let Claude pick”, download `swaps.json`, re-run
with `--swaps swaps.json`), `beatgrid.png`, `checks/`.

## Licences (step 0, before the final export)

Only CC0 and the Mixkit Free License count as free and safe. The bundled library is CC0 (Freesound / Kenney, see
`sound/LICENSES.md`). Mixkit sounds are never bundled (no redistribution): `--allow-runtime` lets the pass download
them into the project. Music: the user's track (ask where it came from and its licence) or one from `sound/MUSIC.md`
(Mixkit, downloaded at runtime, never committed). Ask where the video will be published and check each source's
current terms for that use; report it one line per source. Without `--music-license` the run marks the music
LICENCE NOT CONFIRMED — say so plainly. Recommend `CREDITS.txt` once (optional for CC0; proof of source if a
platform flags the audio).

## Report to the user

The licence check, the use case, the music source and licence (or that it is not confirmed), the beat-grid result,
the cut-to-beat errors, final LUFS and true peak (stereo and mono), and the five timestamps. Don't say it sounds good.
