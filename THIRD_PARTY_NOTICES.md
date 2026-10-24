# Third-party notices

Ink & Signal is MIT-licensed (see `LICENSE`). It includes or adapts the following.

## Barty-Bart/motion-graphics (MIT)

https://github.com/Barty-Bart/motion-graphics — the motion vocabulary, B-roll method, explainer structures, object-separation and sound-pass workflows were studied and rewritten for Ink & Signal; the sound-effect library (`sound/sfx/`, with its manifest) and the music guide (`sound/MUSIC.md`) are adapted from its `skills/sound-effects`. No Geist fonts are included.

```
MIT License

Copyright (c) 2026 Bart

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Sound effects — CC0 1.0

Kenney audio packs and Freesound sounds marked CC0; per-file authors and sources in `sound/LICENSES.md`. Sound-pass method credited to Vox (@Voxyz_ai).

## Lucide icons (ISC)

Icon paths in `tokens/icons.json` / `runtime/motion/icons.js`. Full notice: `tokens/icons.LICENSE.txt`.

## Fonts — SIL Open Font License 1.1

Archivo (variable and static instances, Omnibus-Type), Caveat (Google Fonts), JetBrains Mono (JetBrains). Files in `fonts/`.

## three.js (MIT), GSAP (GreenSock standard no-charge licence)

Loaded by the 3D scenes and the GSAP bridge.

## Optional, not bundled

SAM 2 (Meta, Apache 2.0) through Hugging Face transformers, used by `tools/separate.py` when installed; faster-whisper (MIT) for word timings.
