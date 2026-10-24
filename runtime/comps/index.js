// Registry of every Ink & Signal composition.
import { chapter, hook, endcard } from './titles.js';
import { talking, lowerthird } from './aroll.js';
import { ovTitle, ovTicker, ovHud, ovLowerThird, ovCaptions, ovPunch, ovCallout, ovChip, ovNote } from './overlays.js';
import { trTorn, trFlash, trTicker } from './transitions.js';
import { g3dTitle, g3dPopup, g3dRing, g3dPolaroids, trPaperRoll } from './three3d.js';
import { makeEdit, DEMO_PLAN } from './edit.js';

export const COMPS = {};
for (const d of [chapter, hook, talking, lowerthird, endcard, g3dTitle, g3dPopup, g3dRing, g3dPolaroids,
  ovTitle, ovTicker, ovHud, ovLowerThird, ovCaptions, ovPunch, ovCallout, ovChip, ovNote,
  trTorn, trFlash, trTicker, trPaperRoll]) COMPS[d.name] = d;
COMPS.edit = makeEdit(COMPS);

/** build a comp by name → IS Spec JSON */
export function buildSpec(name, params = {}) {
  const def = COMPS[name];
  if (!def) throw new Error(`Unknown comp "${name}". Available: ${Object.keys(COMPS).join(', ')}`);
  const p = { ...def.defaults, ...params };
  if (params.hud && def.defaults.hud) p.hud = { ...params.hud };
  return def.build(p).toJSON();
}

export { DEMO_PLAN };
