// Registry of Signal Motion scenes (DOM engine). Definitions are pure; DOM work happens in build().
import { BROLL } from './broll.js';
import { xHype } from './hype.js';
import { xDemo } from './demo.js';
import { xJourney } from './journey.js';
import { srZoom } from './screen.js';
import { INFOGRAPHICS } from './infographics.js';
import { CARDS } from './cards.js';
import { TITLES } from './titles.js';
import { TRANSITIONS } from './transitions.js';
import { tBehind } from './behind.js';

export const SCENES = {};
for (const d of [xHype, xDemo, xJourney, srZoom, ...BROLL, ...INFOGRAPHICS, ...CARDS, ...TITLES, tBehind, ...TRANSITIONS]) SCENES[d.name] = d;
