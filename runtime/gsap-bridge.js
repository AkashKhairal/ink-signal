// Ink & Signal — GSAP bridge for bespoke scenes (DOM / SVG / canvas) that don't fit the IS Spec.
// GSAP timelines are created paused and driven by seek(t), so renders stay deterministic.
//
//   <script src="../runtime/vendor/gsap.min.js"></script>
//   <script src="../runtime/vendor/CustomEase.min.js"></script>
//   import { registerEases, scene } from '../runtime/gsap-bridge.js';
//   registerEases(gsap, CustomEase);                 // "is.snap", "is.stamp", "is.wipe", ...
//   const tl = gsap.timeline({ paused: true });
//   tl.from('#title', { scale: 1.12, opacity: 0, duration: 12 / 30, ease: 'is.snap' });
//   scene({ fps: 30, duration: 90, timeline: tl });  // exposes window.IS.seek(frame) for the renderer
import { T } from './core.js';

export function registerEases(gsap, CustomEase) {
  gsap.registerPlugin(CustomEase);
  for (const [name, e] of Object.entries(T.ease)) {
    if (!e.bezier) continue;
    const [x1, y1, x2, y2] = e.bezier;
    CustomEase.create(`is.${name}`, `M0,0 C${x1},${y1} ${x2},${y2} 1,1`);
  }
  return Object.keys(T.ease).map((n) => `is.${n}`);
}

/** frames → seconds using token durations: dur('titleLand') = 0.4 */
export const dur = (name, fps = 30) => (T.duration[name] * (fps / 30)) / fps;

/**
 * Register a bespoke scene with the renderer. `draw(frame)` (optional) runs after the timeline seeks,
 * for canvas/three work. The page must contain a <canvas id="c"> OR set captureSelector for DOM capture.
 */
export function scene({ fps = 30, duration, timeline, draw, canvas = document.getElementById('c'), width, height, name = 'bespoke' }) {
  const spec = { spec: 'ink-signal/1', name, fps, duration, width: width || canvas.width, height: height || canvas.height, markers: [], layers: [] };
  window.IS = {
    spec, fps, duration, canvas,
    async seek(f) {
      if (timeline) timeline.seek(f / fps, false);
      if (draw) await draw(f);
    },
  };
  window.__IS_READY = true;
  return window.IS;
}
