// Registry of Signal Motion scenes (DOM engine). Definitions are pure; DOM work happens in build().
import { BROLL } from './broll.js';
import { xHype } from './hype.js';
import { xDemo } from './demo.js';
import { xJourney } from './journey.js';
import { srZoom } from './screen.js';

export const SCENES = {};
for (const d of [xHype, xDemo, xJourney, srZoom, ...BROLL]) SCENES[d.name] = d;
