# After Effects

`InkSignal.jsx` rebuilds Ink & Signal specs as **native, editable** After Effects comps: real text layers (Archivo
Expanded, Caveat, JetBrains Mono), shape layers, keyframes carrying the exact Ink & Signal curves (cubic-bezier →
KeyframeEase speed/influence), text animators with expression selectors for type-on and letter rise, rectangle masks
for reveals, Trim Paths for strokes, precomps for groups and tickers. 3D scenes and procedural plates come in as
renders from the package.

Install the fonts in `ink-signal/fonts/` first.

## With an After Effects MCP

Any AE MCP with a "run script / execute ExtendScript" tool works. Paths must be absolute.

```js
$.evalFile("/abs/ink-signal/integrations/after-effects/InkSignal.jsx");
InkSignal.buildFromPackage("/abs/pkg");                       // whole edit (node render/nle.mjs plan.json --out pkg)
```
```js
$.evalFile("/abs/ink-signal/integrations/after-effects/InkSignal.jsx");
InkSignal.buildFromSpec("/abs/chapter.spec.json");            // one graphic (node render/cli.mjs spec chapter --params '{...}' --out chapter.spec.json)
```
```js
$.evalFile("/abs/ink-signal/integrations/after-effects/InkSignal.jsx");
InkSignal.selectionTitle("Setup", { size: 200, atSec: 1.0 }); // native selection title on the active comp, no Node needed
```
If the MCP can only send script text, send the file's contents followed by the call, or
`InkSignal.buildFromSpecString(<spec JSON>)`.

Every call returns `{ comp, layers, errors }`; layers that fail are listed instead of stopping the build.

## Without an MCP

File › Scripts › Run Script File… → `InkSignal.jsx`, then run the same calls from the ExtendScript Toolkit /
VS Code ExtendScript debugger, or import `pkg/renders/*.mov` directly (`InkSignal.importPackage("/abs/pkg")`
lays them out on a timeline for you).

## Notes

- Keyframes are written at the spec frames; temporal ease = the token curve. Overshoot (`stamp`) is reproduced on
  non-spatial properties (scale, rotation); position paths are made linear (no spatial auto-bezier).
- Tracking is exact; After Effects applies metric kerning, the web runtime doesn't, so widths can differ by a few
  pixels — selection boxes have padding for this.
- Not tested in every AE version here; built against the ExtendScript DOM of AE 2023–2025. If a layer fails, the
  error list names it and the rest of the comp still builds.
