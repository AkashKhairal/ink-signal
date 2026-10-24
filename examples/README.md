# Examples

- `demo.plan.json` — a 20-second reel that strings the system together with placeholder footage. Renders as-is:
  `node render/cli.mjs render examples/demo.plan.json --out demo.mp4 --blur 3`
- `reel.plan.json` — a real-footage template. Put your files at the paths it names (`clips/…`, `music/track.mp3`,
  relative to this folder) or edit the paths, then:
  `node render/build-reel.mjs examples/reel.plan.json --out reel.mp4 --beats`
- Turn a transcript into caption words: `python3 tools/words.py talk.srt --from 2.0 --to 6.0 --out words.json`
  (`--from/--to` = the clip's in/out, so word times start at 0 for the overlay).
