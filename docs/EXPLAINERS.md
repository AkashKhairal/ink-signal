# Explainers: SaaS promos, product demos, one-take journeys

Three explainer templates, each a full video from one params file, all in the Ink & Signal look. Pick by what
the viewer should feel; the brief is the same for all three.

| | `x-hype` | `x-demo` | `x-journey` |
|---|---|---|---|
| Feel | launch sting, showreel energy | calm, premium homepage demo | playful, “now I get it” |
| Length | 12–20 s (8 bars at 128 BPM ≈ 15 s) | 30–90 s (by feature count) | 10–16 s, seamless loop |
| World | night + signal floods | paper, graph grid, crumple light | night, dot grid |
| Engine | beat grid, objects as transitions, HUD | rooms, camera push / ride / pull back | one hero, baked follow camera |
| Default format | 16:9 (also 9:16) | 16:9 (also 9:16) | 16:9 (also 9:16, square) |

## 1. The brief (one message, then work)

Ask everything in one message; only the product is required. For anything left blank, decide and say what you chose.

1. **Product**: name and what it does (a URL is better; read it for real wording, features, colours, fonts).
2. **The one thing** the viewer must remember (“type an idea, get a live app”).
3. **Brand**: accent colour (replaces signal red), logo file, fonts — or “use Ink & Signal”.
4. **Format**: 16:9 or 9:16. **Length**. **Music**: their track (and its licence) or none.
5. **Direction**: scenes they want, tagline, call to action, anything to avoid.
6. For demos: the **3–5 features or workflow steps** to show, and what it connects to.

**Never invent facts.** No made-up customer counts, revenue, ratings, testimonials or quotes. Numbers only if the
user or the website states them; otherwise relative bars, progress and skeleton lines. Example content inside the
UI (a prompt, a file name, a project name) is fine and should be believable; claims about the product are not.
Calls to action use only a URL or offer they gave; with none, end on the name and tagline.
**Logos** only when supplied (their own product). Otherwise the name in the display face; integrations as neutral
tiles with the name.

## 2. x-hype — the high-energy promo

Beat sheet (128 BPM, beat = 0.469 s). Every half-second something lands on the beat, but a shape carries the eye
across every transition:

| Beats | Scene | Carries in → out | Sound |
|---|---|---|---|
| 0–3 | **Spark**: a signal dot pulses on night, stretches into a line with a mono label, floods the frame | dot → flood | pop, whoosh, riser → impact |
| 3–8 | **Brand slam**: kicker decodes, the name rises letter by letter on 1/16 notes, full stop stamps, handwritten human line | the full stop grows into the next background | ticks, impact, pop |
| 8–14 | **Kinetic triplet**: three words, 2 beats each (handwritten one 3): white on ink with viewfinder brackets · red outline wall + solid word · pen-blue handwriting on paper | bars wipe | slam, slam, pop, whoosh |
| 14–20 | **Signature**: 3D cube field rippling from the centre, gathering into a tower; a line with the key word on a signal plate | a bar floods and slides away | whoosh, impact |
| 20–26 | **Product micro-moment**: tilted UI card with ghost cards, prompt types, cursor clicks Start, progress fills, Done ✓, toast | the card collapses into a dot | pop, typing, click, ding, ding |
| 26–32 | **End card**: the dot becomes the brand mark, name rises, tagline writes on, URL types | — | impact, ding, typing |

Params: `product`, `kicker`, `human`, `label`, `triplet: [{word, style: ink|wall|hand}]`, `signature`, `signatureKey`,
`ui {app, heading, prompt, button, busy, done, progressLabel, toastTitle, toastBody}`, `end {tagline, cta}`, `bpm`,
`offset` (seconds to the first downbeat of your track), `hud`, `grain`, `accent`.

Rules: transitions are objects, not cuts (hard cuts only inside the triplet, on the beat). Big changes on beats,
type on 1/16. HUD viewfinder on every scene (brackets, SCENE nn / tt, category, timecode with a red dot).
Overshoot only on small things. Never more than 3 colours in a scene (ink, paper, signal; pen blue for handwriting).

## 3. x-demo — the calm product demo

Restraint: an airy paper canvas, one short line at a time, the product's own UI rebuilt and filmed up close while
it is used. The camera is the editor: it pushes into a line, rides along with typing, pulls back to show where
you are, glides on. Rooms dissolve into each other with a short blur.

Structure (built from `features`):

1. **Open** — “Introducing” fades up, the name rises inside a selection box (the brand's hero device), glyph trio stamps.
2. **Problem** — one recognisable line, pushed into, key phrase on the signal plate.
3. **Feature chapters** — each is a **title line** (push in + highlight) and a **UI moment**:
   - `ui: 'prompt'` — app shell, heading, the input types (camera follows the caret), chips appear, pull back, cursor sends.
   - `ui: 'steps'` — the user's message, agent steps spinning to checks (camera rides the active row), result card, pull back, click.
   - `ui: 'table'` — a table fills row by row, one column “thinks” (shimmer) before its values, a row highlights, export.
   - `ui: 'chat'` — a thread with typing dots and replies typing out; the camera follows the newest message.
   - `ui: 'chart'` — a real number rolls up (odometer) and its line chart draws with a tooltip. Real figures only.
4. **Integrations** — tiles float in at different depths around one line (near = big and soft, far = small and sharp).
5. **Closer** — “Do all your [editing / captions / sound] in Product.” (rotating word on a plate), then the tagline with its key phrase highlighted.
6. **End** — name in a selection box, URL types.

Budget: 45 s → 2–3 features; 60 s → 3–4; 90 s → 4–5 plus integrations. Each title line holds about 2 s after it
lands; UI runs at real speed (typing 25 cps) with ~0.5 s pauses after results. Nothing bounces; one accent.

## 4. x-journey — the one-take loop

A white ball starts as a toggle's knob. It rolls along a slider pushing it to 100 %, falls and bounces down a
staircase of notification cards that pop as it hits them, hops across a keyboard typing a word, hits return and
is launched back in slow motion while the camera pulls out (with a slight tilt) to reveal the whole course; the
stations reset behind it; the camera dives back as the ball lands in its slot. The loop point is that landing.

Params: `toggle`, `slider`, `cards: [{app, title, ic}]` (the workflow, told in a few words each, with some wit),
`word`, `inputLabel`, `toastTitle`, `toastBody`, `duration`. The hero's contacts are the main instrument: every
impact, key and notification has a sound on its frame.

## 5. Screen recordings — sr-zoom

When the product UI already exists, film it and polish it: the recording sits in a browser frame on paper, the
camera eases into regions (`zooms: [{t0, t1, x, y, w, h}]` in recording pixels), clicks ripple, a spotlight dims
everything else and a selection box marks the element, handwritten notes point at things.

## 6. Check, render, deliver

```bash
node render/cli.mjs sheet x-demo --params-file demo.json --auto 12 --out check.png     # look at every scene
node render/cli.mjs render x-demo --params-file demo.json --blur 1 --out draft.mp4     # review copy (fast)
node render/cli.mjs render x-demo --params-file demo.json --blur 4 --out demo_silent.mp4   # final (+ demo_silent.cues.json)
python3 render/sound.py --video demo_silent.mp4 --cues demo_silent.cues.json --music track.mp3 \
  --music-source "…" --music-license "…" --align --out sound/                         # → sound/after.mp4
```

Send the draft first and ask for changes; renders with motion blur take minutes (each subframe is a screenshot).
Deliver: the MP4, the params file (they can change words and re-render), SOUND.md, CREDITS.txt, and a short note:
the beat sheet, what is placeholder, one alternative direction in a sentence.

For After Effects / Premiere / Resolve: put the scene in an edit plan and run `node render/nle.mjs plan.json`; motion
scenes arrive as rendered ProRes plates on the right tracks, with markers.
