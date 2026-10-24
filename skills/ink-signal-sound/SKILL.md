---
name: ink-signal-sound
description: Add a measured sound pass to a video made with the ink-signal library (or any motion-graphics video) — cue list from the renders, beat grid checked against the kicks, cuts on the beat, one real CC0 sound per cue, mixed to −14 LUFS and below −1.5 dBTP measured on the exported MP4, with proof images, a swap report and five timestamps for a human to check.
---

# Sound pass with Ink & Signal

Library root = the folder with `tokens/ink-signal.tokens.json`. Full guide: `docs/SOUND.md`. Needs ffmpeg, numpy, Pillow.
If it isn't attached or on disk, ask the user to attach the `ink-signal` folder/zip, or clone
https://github.com/AkashKhairal/ink-signal; then `npm install && npx playwright install chromium` inside it
(needs Node 18+, ffmpeg, python3 with numpy + Pillow).

Claude can't hear: never judge by feel, never say it sounds good. Measure every step and hand over five timestamps.

1. **Licence check first.** Ask where the video will be published (YouTube, Instagram, TikTok, ads, client work,
   TV…). Ask where the music came from and its licence. Bundled SFX are CC0. Mixkit (runtime only, `--allow-runtime`)
   is fine in videos but never redistributed. Check each source's current terms for this use, one line per source.
2. **Cues.** Motion renders write `<out>.cues.json`; edit plans: `node render/cues.mjs plan.json --out cues.json`;
   B-roll: `out/cues.json`; otherwise write `[{"t":…, "type":"click|appear|movement|scene_cut|typing|build_up|reveal|slam|stamp|success|notify|tick|error", "desc":…, "dur":…}]`
   (or detect cuts: `ffmpeg -i in.mp4 -vf "select='gt(scene,0.3)',showinfo" -f null -`).
3. **Run.**
   ```bash
   python3 render/sound.py --video silent.mp4 --cues cues.json --out sound/ --music track.mp3 \
     --music-source "Track, Artist, link" --music-license "…" --align --use-case "…"
   # a video that already has voice: --voice auto keeps it (voice > SFX > music, music ducks under it)
   ```
4. **Read `sound/SOUND.md`** and look at `beatgrid.png` (kicks on the red lines?) and a few `checks/cue-XX.png`.
   Fix anything over target; if you changed animation timings, re-render first.
5. **Swaps.** Open `report.html` for the user: they can play every sound, pick alternatives or “let Claude pick”,
   download `swaps.json`; re-run with `--swaps swaps.json` (cue indices stay stable).
6. **Report**: licences (all known, or each unknown sound by name), use case, music source + licence (or NOT
   CONFIRMED), beat-grid result, cut-to-beat errors in ms, final LUFS and true peak (stereo and mono), the five
   timestamps, and that `CREDITS.txt` is there if they want it for the description.
