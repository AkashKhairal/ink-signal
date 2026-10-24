# Premiere Pro

Make the package: `node render/nle.mjs plan.json --out pkg`

## No scripting

File › Import… → `pkg/timeline.xml` (FCP7 XML). You get a sequence with V1 picture, V2 overlays (ProRes 4444 alpha),
V3 transitions, clip audio, music and markers. Install the fonts only if you'll also edit in After Effects.

## With a Premiere Pro MCP that runs ExtendScript (CEP bridge)

```js
$.evalFile("/abs/ink-signal/integrations/premiere-pro/InkSignal.premiere.jsx");
InkSignalPPro.assemble("/abs/pkg");
```
Single overlay at the playhead of the active sequence:
```js
$.evalFile("/abs/ink-signal/integrations/premiere-pro/InkSignal.premiere.jsx");
InkSignalPPro.placeOverlay("/abs/lt.mov", 1);   // node render/cli.mjs render ov-lowerthird --format yt --out lt.mov
```

## With an MCP that only has media/timeline tools

Read `pkg/manifest.json` and, for every item in `tracks.V1`, `V2`, `V3`, `A2`:

1. `import_media` → `item.file`
2. `add_to_timeline` → track V1/V2/V3 (index 0/1/2) or A2, at `item.startSec`, source in `item.srcInFrames / fps`,
   duration `(item.end - item.start) / fps`
3. markers from `manifest.markers` (`frame / fps`)

## Notes

- Graphics are rendered by Ink & Signal, so they look identical to the web renders; edit the plan and re-run
  `nle.mjs` to change copy, then relink or re-import.
- Adobe is moving Premiere scripting to UXP; this adapter uses ExtendScript, which current CEP-based MCPs use.
  The manifest route above works with either.
