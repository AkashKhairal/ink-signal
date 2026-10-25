// Ink & Signal — website behaviour. Data comes from site/data.json (node tools/build_site.mjs).
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (k === 'style') Object.assign(n.style, v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null) n.append(k.nodeType ? k : document.createTextNode(k));
  return n;
};
const svgUse = (id, cls) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); if (cls) s.setAttribute('class', cls); const u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#' + id); s.append(u); return s; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
document.documentElement.classList.add('js');

let DATA = null, BY = {};
try { DATA = await (await fetch('site/data.json')).json(); BY = Object.fromEntries(DATA.templates.map((t) => [t.name, t])); }
catch (e) { console.error('site/data.json could not be loaded', e); }

const GROUP_LABEL = Object.fromEntries((DATA?.groups || []).map((g) => [g.id, g.label]));
const KIND_LABEL = { explainer: 'Explainer', screen: 'Screen', broll: 'B-roll', infographic: 'Infographic', card: 'Card', title: 'Title', transition: 'Transition', aroll: 'A-roll', '3d': '3D', overlay: 'Overlay' };
const FMT_LABEL = { reel: 'Reel', yt: 'YouTube', square: 'Square' };
const secs = (s) => (s == null ? '—' : `${(+s).toFixed(s < 10 ? 1 : 1)} s`);

/* ───────── copy ───────── */
async function copyText(text, btn, selectEl) {
  try { await navigator.clipboard.writeText(text); }
  catch { if (selectEl) { const r = document.createRange(); r.selectNodeContents(selectEl); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } }
  if (btn) { btn.classList.add('ok'); const u = btn.querySelector('use'); const prev = u && u.getAttribute('href'); if (u) u.setAttribute('href', '#i-check'); setTimeout(() => { btn.classList.remove('ok'); if (u) u.setAttribute('href', prev); }, 1400); }
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (b) copyText(b.dataset.copy, b, b.previousElementSibling); });

/* ───────── counts ───────── */
if (DATA) {
  $$('[data-count="templates"]').forEach((n) => (n.textContent = DATA.counts.templates));
  $('#hud-count').textContent = `${DATA.counts.templates} templates`;
  $('#ver').textContent = 'v' + DATA.version.replace(/\.0$/, '');
  $('#ver2').textContent = DATA.version;
  const o = $('.stat .odo[data-odo="64"]'); if (o) o.dataset.odo = DATA.counts.templates;
  const so = $('.stat .odo[data-odo="103"]'); if (so && DATA.counts.sounds) so.dataset.odo = DATA.counts.sounds;
}

/* ───────── tickers ───────── */
const glyphs = () => el('i', { class: 'glyphs' }, svgUse('g-star'), svgUse('g-sparkle'), svgUse('g-plus'));
$$('[data-ticker]').forEach((track) => {
  const items = track.dataset.ticker.split('|');
  const half = () => { const f = document.createDocumentFragment(); for (let r = 0; r < 2; r++) for (const it of items) f.append(el('span', {}, it, glyphs())); return f; };
  track.append(half(), half());
});

/* ───────── odometers ───────── */
$$('.odo').forEach((o) => {
  const v = String(o.dataset.odo).replace('-', ''); const pre = o.dataset.prefix || (String(o.dataset.odo).startsWith('-') ? '−' : '');
  o.textContent = ''; o.setAttribute('aria-label', pre + v);
  if (pre) o.append(el('span', { 'aria-hidden': 'true' }, pre));
  for (const d of v) {
    const inner = el('span', { class: 'dg-in' }); for (let i = 0; i <= 9; i++) inner.append(el('span', { text: i }));
    const col = el('span', { class: 'dg', 'aria-hidden': 'true' }, inner); col.dataset.d = d; o.append(col);
  }
});
const rollOdo = (o) => $$('.dg', o).forEach((c, i) => { c.firstChild.style.transitionDelay = i * 0.08 + 's'; c.firstChild.style.transform = `translateY(${-(+c.dataset.d) * 0.9}em)`; });

/* ───────── reveal on view (selection boxes, plates, notes, HUD type-on, odometers) ───────── */
const typeOn = (n) => { const full = n.dataset.type; if (REDUCED) { n.textContent = full; return; } let i = 0; n.textContent = ''; const t = setInterval(() => { n.textContent = full.slice(0, ++i); if (i >= full.length) clearInterval(t); }, 1000 / 30); };
const measureSel = (s) => { const d = s.querySelector('.dim'); if (!d) return; const r = s.getBoundingClientRect(); d.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`; };
const io = new IntersectionObserver((ents) => ents.forEach((e) => {
  if (!e.isIntersecting) return;
  const n = e.target; io.unobserve(n);
  if (n.classList.contains('sel')) measureSel(n);
  if (n.classList.contains('odo')) rollOdo(n);
  if (n.dataset.type) typeOn(n);
  n.classList.add('in');
}), { threshold: 0.3, rootMargin: '0px 0px -6% 0px' });
// notes are clipped (clip-path) until they write on, so they only ever intersect a sliver: watch them with threshold 0
const ioNote = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { ioNote.unobserve(e.target); e.target.classList.add('in'); } }), { threshold: 0, rootMargin: '0px 0px -12% 0px' });
const watch = (root = document) => $$('.reveal, .odo, [data-type]', root).forEach((n) => (n.classList.contains('note') ? ioNote : io).observe(n));
watch();

/* ───────── hero timecode ───────── */
const tc = $('#tc'); const t0 = performance.now();
const pad = (n) => String(n).padStart(2, '0');
(function clock(now) { const f = Math.floor(((now - t0) / 1000) * 30); tc.textContent = `${pad(Math.floor(f / 108000))}:${pad(Math.floor(f / 1800) % 60)}:${pad(Math.floor(f / 30) % 60)}:${pad(f % 30)}`; requestAnimationFrame(clock); })(t0);

/* ───────── top bar: menu + scrollspy ───────── */
const nav = $('#nav'), menu = $('.menu');
menu.addEventListener('click', () => { const open = !nav.classList.contains('open'); nav.classList.toggle('open', open); menu.setAttribute('aria-expanded', String(open)); });
nav.addEventListener('click', (e) => { if (e.target.closest('a')) { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); } });
const spy = (links, ids, margin) => {
  const map = new Map(ids.map((id) => [id, links.find((a) => a.getAttribute('href') === '#' + id)]));
  const obs = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { links.forEach((a) => a.classList.remove('on')); map.get(e.target.id)?.classList.add('on'); } }), { rootMargin: margin });
  ids.forEach((id) => { const s = document.getElementById(id); if (s) obs.observe(s); });
};
spy($$('#nav a'), ['explainers', 'library', 'choose', 'start', 'system', 'claude'], '-45% 0px -50% 0px');
spy($$('.toc a'), $$('.toc a').map((a) => a.getAttribute('href').slice(1)), '-30% 0px -65% 0px');

/* ───────── video autoplay when in view ───────── */
const vio = new IntersectionObserver((ents) => ents.forEach((e) => {
  const v = e.target;
  if (e.isIntersecting) { if (!v.src && v.dataset.src) v.src = v.dataset.src; if (!REDUCED) v.play().catch(() => {}); }
  else if (!v.paused) v.pause();
}), { rootMargin: '120px 0px', threshold: 0.15 });
const lazyVideo = (t, attrs = {}) => {
  const v = el('video', { muted: true, loop: true, playsinline: true, preload: 'none', poster: t.poster || null, 'aria-hidden': 'true', ...attrs });
  v.muted = true; v.dataset.src = t.preview || '';
  if (t.preview) vio.observe(v);
  return v;
};

/* ───────── hero showreel ───────── */
(() => {
  if (!DATA) return;
  const list = ['x-hype', 'mb-launch', 'card-bento', 'ig-line', 't-decode', 'mb-terminal', 'card-stack', 'x-journey'].filter((n) => BY[n]?.preview);
  const v = $('#reel'); let i = 0;
  const show = (k) => {
    i = (k + list.length) % list.length; const t = BY[list[i]];
    v.src = t.preview; v.poster = t.poster || '';
    $('#reel-title').textContent = t.title.replace(/\s*\(.*\)$/, ''); $('#reel-name').textContent = t.name;
    if (!REDUCED) v.play().catch(() => {});
  };
  v.addEventListener('ended', () => show(i + 1));
  v.addEventListener('timeupdate', () => { $('#reel-prog').style.width = (v.duration ? (v.currentTime / v.duration) * 100 : 0) + '%'; });
  $('#reel-open').addEventListener('click', () => openPlayer(list[i]));
  $('.screen').addEventListener('click', () => openPlayer(list[i]));
  $('.screen').style.cursor = 'pointer';
  new IntersectionObserver(([e]) => { if (e.isIntersecting) { if (!REDUCED) v.play().catch(() => {}); } else v.pause(); }).observe(v);
  show(0);
})();

/* ───────── featured explainers ───────── */
const FEATURE_COPY = {
  'x-hype': { len: '12–20 s · on 8 bars', beats: ['Spark', 'Brand slam', 'Triplet', '3D signature', 'Product', 'End card'], text: 'A beat-locked launch sting. Objects carry the eye across every change: a dot floods the frame, a full stop becomes the next background, a card collapses into the brand mark. HUD viewfinder throughout.' },
  'x-demo': { len: '30–90 s · by feature count', beats: ['Introducing', 'Problem line', 'Feature + UI', '× 2–5', 'Integrations', 'Closer', 'End card'], text: 'The calm homepage demo. One short line at a time, the product UI rebuilt and filmed up close while it is used — the camera pushes in, rides the typing and pulls back. No hard cuts.' },
  'x-journey': { len: '10–16 s · seamless loop', beats: ['Toggle', 'Slider', 'Notification cards', 'Keyboard', 'Launch', 'Reveal', 'Loop'], text: 'The whole workflow in one take. A ball starts as a toggle’s knob, rolls a slider to 100, bounces down notification cards, types a word and is launched back while the camera reveals the course.' },
};
if (DATA) {
  const box = $('#featured');
  for (const t of DATA.templates.filter((x) => x.featured)) {
    const c = FEATURE_COPY[t.name] || { len: secs(t.duration), beats: [], text: t.description };
    const media = el('button', { class: 'fmedia', type: 'button', 'aria-label': `Open ${t.title} in the live player`, onclick: () => openPlayer(t.name) },
      lazyVideo(t), el('div', { class: 'vf', 'aria-hidden': 'true' }, el('i', { class: 'tl' }), el('i', { class: 'tr' }), el('i', { class: 'bl' }), el('i', { class: 'br' })));
    const cmd = `node render/cli.mjs render ${t.name} --params-file ${t.name.slice(2)}.json --blur 4 --out ${t.name.slice(2)}.mp4`;
    box.append(el('div', { class: 'frow' }, media, el('div', { class: 'ftext' },
      el('p', { class: 'fmeta' }, el('code', {}, t.name), el('span', {}, c.len), el('span', {}, t.formats.map((f) => FMT_LABEL[f]).join(', '))),
      el('h3', {}, t.title.replace(/\s*\(.*\)$/, '')),
      el('p', {}, c.text),
      el('ul', { class: 'beats', 'aria-label': 'Structure' }, c.beats.map((b) => el('li', {}, b))),
      el('div', { class: 'fbtns' },
        el('button', { class: 'btn btn-signal btn-sm', type: 'button', onclick: () => openPlayer(t.name) }, svgUse('i-play'), 'Live player'),
        el('button', { class: 'btn btn-line btn-sm', type: 'button', 'data-copy': cmd }, svgUse('i-copy'), 'Copy command')))));
  }
}

/* ───────── library ───────── */
const state = { group: 'all', q: '' };
let ORDER = [];
const fmtShort = (fs) => fs.map((f) => FMT_LABEL[f]).join(' · ');
function card(t) {
  const media = el('button', { class: 'tmedia', type: 'button', 'aria-label': `Open ${t.title}`, onclick: () => openPlayer(t.name) },
    lazyVideo(t), el('i', { class: 'hd' }), el('i', { class: 'hd' }), el('i', { class: 'hd' }), el('i', { class: 'hd' }),
    el('span', { class: 'tdim' }, `${t.formats.includes('yt') ? '1920 × 1080' : '1080 × 1920'}`), el('span', { class: 'open live' }, 'Open the live player'));
  return el('article', { class: 'tcard', 'data-name': t.name },
    media,
    el('div', { class: 'tmeta' }, el('code', {}, t.name), t.engine === 'spec' ? el('span', { class: 'tag', title: 'Rebuilt as native, editable layers in After Effects' }, 'AE native') : null),
    el('h4', {}, el('button', { type: 'button', onclick: () => openPlayer(t.name) }, t.title)),
    el('p', {}, t.best || t.description),
    el('div', { class: 'tfoot' }, el('span', {}, secs(t.duration)), el('span', {}, fmtShort(t.formats)), t.transparent ? el('span', {}, 'alpha') : null, t.footage ? el('span', {}, 'needs footage') : null, t.loop ? el('span', {}, 'loops') : null));
}
function renderLibrary() {
  if (!DATA) { $('#groups').append(el('p', { class: 'empty' }, 'The template data did not load. Serve the folder over http (node render/serve.mjs) or open the GitHub Pages site.')); return; }
  const chips = $('#chips');
  const mk = (id, label, n) => el('button', { class: 'chip', type: 'button', role: 'tab', 'aria-selected': String(state.group === id), 'data-g': id, onclick: () => { state.group = id; apply(); } }, label, el('span', {}, n));
  chips.append(mk('all', 'All', DATA.templates.length));
  for (const g of DATA.groups) { const n = DATA.templates.filter((t) => t.group === g.id).length; if (n) chips.append(mk(g.id, g.label, n)); }
  const groups = $('#groups');
  for (const g of DATA.groups) {
    const list = DATA.templates.filter((t) => t.group === g.id); if (!list.length) continue;
    groups.append(el('div', { class: 'group', 'data-g': g.id },
      el('div', { class: 'group-head' }, el('h3', {}, g.label), el('span', { class: 'n' }, `${list.length} templates`), el('p', {}, g.blurb)),
      el('div', { class: 'grid' }, list.map(card))));
  }
  const q = $('#q'); let tmr; q.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => { state.q = q.value.trim().toLowerCase(); apply(); }, 90); });
  apply();
}
function apply() {
  $$('#chips .chip').forEach((c) => c.setAttribute('aria-selected', String(c.dataset.g === state.group)));
  const words = state.q.split(/\s+/).filter(Boolean);
  ORDER = [];
  let shown = 0;
  $$('#groups .group').forEach((g) => {
    const okG = state.group === 'all' || g.dataset.g === state.group; let n = 0;
    $$('.tcard', g).forEach((c) => {
      const t = BY[c.dataset.name]; const hay = `${t.name} ${t.title} ${t.description} ${t.best} ${t.kind} ${GROUP_LABEL[t.group]}`.toLowerCase();
      const ok = okG && words.every((w) => hay.includes(w)); c.hidden = !ok; if (ok) { n++; ORDER.push(t.name); }
    });
    g.hidden = n === 0; shown += n;
  });
  $('#empty').hidden = shown > 0;
}
renderLibrary();

/* ───────── what to use ───────── */
const JOBS = [
  ['Launch a product in 15 seconds', 'A teaser, an ad, a Product Hunt video.', ['x-hype', 't-slam', 't-decode', 'tr-flood', 'endcard']],
  ['Explain how a SaaS works', 'A homepage demo or feature walkthrough.', ['x-demo', 'ig-flow', 'card-bento', 'mb-launch']],
  ['Show a workflow as a loop', 'Landing pages, GIFs, the top of a README.', ['x-journey', 'card-notify', 'mb-checklist']],
  ['Polish a real screen recording', 'Tutorials, release notes, support videos.', ['sr-zoom', 'ov-callout', 'ov-note', 'ov-chip']],
  ['Add visuals to a talking head', 'Cutaways and panels timed to the words.', ['mb-terminal', 'mb-doc', 'mb-search', 'mb-slider', 'mb-toggles', 'mb-drop', 'ov-captions']],
  ['Show one number that matters', 'Views, users, revenue, hours saved — real ones.', ['ig-counter', 'ig-line', 'mb-chart', 'ig-bars']],
  ['Compare two things', 'Before and after, plan vs plan, old way vs new.', ['ig-compare', 'mb-versus', 'card-flip']],
  ['Show shares, steps or a roadmap', 'Breakdowns, processes and timelines.', ['ig-donut', 'ig-flow', 'ig-timeline', 'ig-ranking']],
  ['Hook a Reel in two seconds', 'Openers that stop the scroll.', ['t-stack', 't-countdown', 't-wall', 'hook', 't-behind']],
  ['List features or tips', 'Fives, tens, “everything you need”.', ['card-stack', 'card-bento', 'card-deal', 'mb-checklist']],
  ['Quote a customer or the press', 'Real words, key line on the plate.', ['card-quote', 't-highlight']],
  ['Mark a chapter', 'Section breaks in YouTube videos and long Reels.', ['chapter', 'mb-chapter', '3d-popup', 'tr-paper-roll', '3d-title']],
  ['Cut between sections', 'On the downbeat, with an object — never a dissolve.', ['tr-bars', 'tr-flood', 'tr-torn', 'tr-flash', 'tr-dot', 'tr-zoom', 'tr-ticker']],
  ['Introduce yourself or a guest', 'Names, roles, handles.', ['lowerthird', 'ov-lowerthird', 't-slam']],
  ['End the video', 'End screens, follow and subscribe CTAs.', ['endcard', 't-slam', '3d-ring']],
];
if (DATA) {
  const ol = $('#jobs');
  JOBS.forEach(([job, sub, picks]) => {
    const ok = picks.filter((n) => BY[n]);
    ol.append(el('li', { class: 'job' }, el('div', {}, el('h3', {}, job), el('p', {}, sub)),
      el('div', { class: 'picks' }, ok.map((n, k) => el('button', { class: 'pick' + (k === 0 ? ' best' : ''), type: 'button', title: BY[n].title, onclick: () => openPlayer(n) }, n, k === 0 ? el('small', {}, 'best') : null)))));
  });
}

/* ───────── code blocks: bar, copy, light highlighting ───────── */
function highlight(src, lang) {
  const re = lang === 'json' ? /("(?:[^"\\\n]|\\.)*")(\s*:)?|\b(true|false|null)\b/g
    : /(^|\s)(#[^\n]*|\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\s)(--[a-z][a-z-]*)|\b(import|export|from|const|return|await|async)\b/g;
  let out = '', last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    if (lang === 'json') out += m[1] ? (m[2] ? `<span class="k">${esc(m[1])}</span>${m[2]}` : `<span class="s">${esc(m[1])}</span>`) : `<span class="f">${m[3]}</span>`;
    else if (m[2]) out += `${m[1]}<span class="c">${esc(m[2])}</span>`;
    else if (m[3]) out += `<span class="s">${esc(m[3])}</span>`;
    else if (m[5]) out += `${m[4]}<span class="f">${m[5]}</span>`;
    else out += `<span class="k">${m[6]}</span>`;
    last = re.lastIndex;
  }
  return out + esc(src.slice(last));
}
function decorate(pre) {
  if (pre.closest('.codebox') && pre.parentElement.querySelector('.codebar')) return;
  const code = pre.querySelector('code'); const lang = pre.dataset.lang || 'bash';
  let box = pre.parentElement.classList.contains('codebox') ? pre.parentElement : null;
  if (!box) { box = el('div', { class: 'codebox' }); pre.replaceWith(box); box.append(pre); }
  const btn = el('button', { class: 'copy', type: 'button', 'aria-label': 'Copy code' }, svgUse('i-copy'));
  btn.addEventListener('click', () => copyText(code.textContent, btn, code));
  box.prepend(el('div', { class: 'codebar' }, el('span', { class: 'hud' }, lang), btn));
  code.innerHTML = highlight(code.textContent, lang);
}
$$('pre.code').forEach(decorate);

/* sound cue types + engine API (docs) */
if (DATA) {
  const cues = $('#cues');
  for (const [k, v] of Object.entries(DATA.tokens.sound.cueMap)) cues.append(el('span', { class: 'cue' }, el('b', {}, k), ` → ${Array.isArray(v) ? v.join(' / ') : (v && v.category) || v}`));
}
const API = [
  ['spr(t, at, preset)', 'spring progress since a time; presets from the tokens'],
  ['track(v0, [[t, v]], spring)', 'a value that changes target many times (sum of springs)'],
  ['kf([[t, v, ease]])', 'eased keyframes with the brand curves'],
  ['vis(t, tin, tout)', 'content swap inside a morphing shape (blur out, blur in)'],
  ['morph(S, { states, seq })', 'the one shape that never cuts; the camera fits each state'],
  ['rooms(ctx, [...])', 'scenes with their own camera, joined by a blur dissolve'],
  ['ctx.cursor({ keys, clicks })', 'constant-size cursor on arcs, presses, ripples, drags'],
  ['beats(bpm, offset)', 'big moves on beats, type on sixteenth notes'],
  ['ui.js', 'card, toggle, slider, segmented, input, chips, table, terminal, chat, browser, phone, appShell…'],
  ['charts.js · type.js · fx.js', 'bars, lines, donuts, odometers · kinetic type · HUD, transitions, notes, stamps'],
];
const api = $('#api'); API.forEach(([a, b]) => api.append(el('div', {}, el('code', {}, a), el('span', {}, b))));

/* ───────── system ───────── */
const ROLE = { ink: 'Type and ink on paper', night: 'The night world', paper: 'The daylight world', signal: 'The one loud colour', pen: 'Handwriting only', signalDeep: 'Small red text on paper', white: 'Type on night, UI surfaces', nightPanel: 'Raised panels on night', nightLine: 'Hairlines on night', paperNote: 'Notes and cards on paper', rule: 'Rules and borders on paper', graphite: 'Muted labels', muted: 'Secondary text on paper', fog: 'Secondary text on night' };
const BIG = ['signal', 'ink', 'paper', 'night', 'pen'];
if (DATA) {
  const sw = $('#swatches');
  const cols = [...DATA.tokens.colors].sort((a, b) => (BIG.indexOf(a.name) + 1 || 99) - (BIG.indexOf(b.name) + 1 || 99));
  for (const c of cols) {
    const b = el('button', { class: 'sw' + (BIG.includes(c.name) ? ' big' : ''), type: 'button', title: `Copy ${c.hex}` }, el('i', { style: { background: c.hex } }), el('b', {}, c.name), el('span', {}, c.hex), ROLE[c.name] ? el('small', {}, ROLE[c.name]) : null);
    b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(c.hex); } catch { /* selection fallback not needed */ } b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 1200); });
    sw.append(b);
  }
  const acc = $('#accents');
  DATA.tokens.accentOptions.forEach((hex, i) => {
    const b = el('button', { class: 'acc', type: 'button', style: { background: hex }, 'aria-pressed': String(i === 0), 'aria-label': `Accent ${hex}` });
    b.addEventListener('click', () => { setAccent(i === 0 ? null : hex); $$('.acc', acc).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
    acc.append(b);
  });
  // easing curves
  const eases = $('#eases');
  for (const e of DATA.tokens.eases) {
    const [x1, y1, x2, y2] = e.bezier; const Y = (y) => 100 - y * 100;
    const svg = `<svg viewBox="-4 -40 108 180" preserveAspectRatio="none" aria-hidden="true"><path class="axis" d="M0 0V100H100"/><path class="diag" d="M0 100L100 0"/><path class="curve" d="M0 100C${x1 * 100} ${Y(y1)} ${x2 * 100} ${Y(y2)} 100 0"/></svg>`;
    eases.append(el('div', { class: 'ease', style: { '--bez': `cubic-bezier(${e.bezier.join(',')})` } }, el('b', {}, e.name, el('code', {}, e.bezier.join(', '))), el('div', { html: svg }), el('div', { class: 'track' }, el('i')), el('small', {}, e.use)));
  }
  // springs: closed-form step response, 0 → 1.2 s
  const S = (t, w, z) => { if (z < 1) { const wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t)); } return 1 - Math.exp(-w * t) * (1 + w * t); };
  const plot = $('#spring-plot'); const PW = 640, PH = 300, L = 40, R = 16, TOP = 24, B = 34, T = 1.2;
  const X = (t) => L + (t / T) * (PW - L - R), Yv = (v) => PH - B - (v / 1.35) * (PH - TOP - B);
  let g = '<g class="grid">'; for (let t = 0; t <= T + 1e-9; t += 0.2) g += `<line x1="${X(t)}" x2="${X(t)}" y1="${TOP}" y2="${PH - B}"/><text x="${X(t) - 8}" y="${PH - 12}">${t.toFixed(1)}</text>`;
  g += `<line class="one" x1="${L}" x2="${PW - R}" y1="${Yv(1)}" y2="${Yv(1)}"/><text x="8" y="${Yv(1) + 4}">1.0</text><text x="8" y="${Yv(0) + 4}">0</text></g>`;
  let paths = '';
  for (const s of DATA.tokens.springs) { let d = ''; for (let i = 0; i <= 160; i++) { const t = (i / 160) * T; d += (i ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Yv(S(t, s.w, s.z)).toFixed(1); } paths += `<path data-s="${s.name}" d="${d}"/>`; }
  plot.innerHTML = g + paths + `<text x="${PW - R - 4}" y="${TOP - 8}" text-anchor="end">seconds →</text>`;
  const list = $('#springs');
  const pickSpring = (name) => { $$('path', plot).forEach((p) => p.classList.toggle('on', p.dataset.s === name)); $$('.spr', list).forEach((b) => b.classList.toggle('on', b.dataset.s === name)); const on = plot.querySelector(`path[data-s="${name}"]`); if (on) plot.append(on); };
  for (const s of DATA.tokens.springs) {
    const b = el('button', { class: 'spr', type: 'button', 'data-s': s.name }, el('b', {}, s.name), el('code', {}, `ω ${s.w} · ζ ${s.z}`), el('span', {}, s.use || ''));
    b.addEventListener('mouseenter', () => pickSpring(s.name)); b.addEventListener('focus', () => pickSpring(s.name)); b.addEventListener('click', () => pickSpring(s.name));
    list.append(b);
  }
  pickSpring('morph');
  // rules
  const ru = (id, items, icon, cls) => { const ul = $(id); ul.classList.add(cls); items.forEach((r) => ul.append(el('li', {}, svgUse(icon), el('span', {}, r)))); };
  ru('#rules-do', DATA.tokens.rules.do || [], 'i-check', 'do');
  ru('#rules-dont', DATA.tokens.rules.dont || [], 'i-close', 'dont');
}
// interface-layer demo
const tg = $('.ui-toggle'); tg?.addEventListener('click', () => tg.setAttribute('aria-pressed', String(tg.getAttribute('aria-pressed') !== 'true')));
const seg = $('.ui-seg'); const segSet = (i) => { $$('button', seg).forEach((b, k) => b.setAttribute('aria-pressed', String(k === i))); $('.ui-ind', seg).style.transform = `translateX(${i * 100}%)`; };
$$('button', seg).forEach((b, i) => b.addEventListener('click', () => segSet(i))); segSet(1);

/* ───────── accent ───────── */
let ACCENT = null;
function setAccent(hex) { ACCENT = hex; if (hex) document.documentElement.style.setProperty('--accent', hex); else document.documentElement.style.removeProperty('--accent'); }

/* ───────── live player ───────── */
const pl = $('#pl'), stage = $('#pl-stage');
let cur = null, fmt = 'yt', params = {}, frame = null, video = null, meta = { duration: 1, fps: 30 }, playing = true;
const diff = (p, d) => Object.fromEntries(Object.entries(p).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(d[k])));
const editable = (t) => { const p = { ...t.defaults }; delete p.format; return p; };
function command(t) {
  const d = diff(params, editable(t)); if (ACCENT && t.defaults && 'accent' in t.defaults) d.accent = ACCENT;
  const ext = t.transparent ? 'mov' : 'mp4';
  if (!Object.keys(d).length) return `node render/cli.mjs render ${t.name} --format ${fmt} --blur 4 --out ${t.name}.${ext}`;
  return `node render/cli.mjs render ${t.name} --format ${fmt} --blur 4 --out ${t.name}.${ext} \\\n  --params '${JSON.stringify(d)}'`;
}
function planSnippet(t) {
  const d = diff(params, editable(t)); const P = Object.keys(d).length ? d : undefined;
  if (t.kind === 'transition') return JSON.stringify({ type: 'transition', comp: t.name, ...(P ? { params: P } : {}) });
  if (t.kind === 'overlay') return JSON.stringify({ type: 'clip', src: 'clips/talk.mp4', in: 0, out: 5, overlays: [{ comp: t.name, at: 0.2, ...(P ? { params: P } : {}) }] }, null, 1).replace(/\n\s*/g, ' ');
  return JSON.stringify({ type: 'comp', comp: t.name, ...(t.engine === 'spec' && t.duration ? { duration: t.duration } : {}), ...(P ? { params: P } : {}) });
}
function setCodes(t) {
  const c = $('#pl-cmd'); c.textContent = command(t); c.innerHTML = highlight(c.textContent, 'bash');
  const j = $('#pl-plan'); j.textContent = planSnippet(t); j.innerHTML = highlight(j.textContent, 'json');
}
function setTime(f) {
  const d = meta.duration / meta.fps; const s = f / meta.fps;
  $('#pl-scrub').value = String(Math.round((f / Math.max(1, meta.duration)) * 1000));
  $('#pl-time').textContent = `${s.toFixed(2)} / ${d.toFixed(2)} s`;
}
function setPlaying(p) { playing = p; const b = $('#pl-play'); b.querySelector('use').setAttribute('href', p ? '#i-pause' : '#i-play'); b.setAttribute('aria-label', p ? 'Pause' : 'Play'); }
function clearStage() { if (frame) { frame.src = 'about:blank'; frame.remove(); frame = null; } if (video) { video.pause(); video.remove(); video = null; } $$('.loading', stage).forEach((n) => n.remove()); }
function mountStage() {
  const t = BY[cur]; clearStage(); stage.dataset.fmt = fmt;
  const mode = $('#pl-mode');
  if (t.live) {
    const p = { ...diff(params, editable(t)) }; if (ACCENT && 'accent' in (t.defaults || {})) p.accent = ACCENT;
    const q = new URLSearchParams({ format: fmt, embed: '1' }); q.set(t.engine === 'motion' ? 'scene' : 'comp', t.name);
    if (Object.keys(p).length) q.set('params', JSON.stringify(p));
    if (t.transparent) q.set('bg', 'checker');
    frame = el('iframe', { title: `${t.title} — live`, src: (t.engine === 'motion' ? 'stage/motion.html?' : 'stage/index.html?') + q.toString(), allow: 'autoplay', loading: 'eager' });
    stage.append(el('div', { class: 'loading' }, 'loading the engine…'), frame);
    mode.className = 'pl-mode mono'; mode.textContent = t.engine === 'motion' ? 'Live — rendered in your browser by the Signal Motion engine, the same code that renders the MP4.' : 'Live — the IS Spec canvas renderer, the same spec After Effects rebuilds natively.';
    meta = { duration: Math.max(1, Math.round((t.duration || 3) * 30)), fps: 30 }; setTime(0); setPlaying(true);
  } else {
    video = el('video', { src: t.preview, poster: t.poster, muted: true, loop: true, playsinline: true, autoplay: true }); video.muted = true;
    video.addEventListener('timeupdate', () => { meta = { duration: Math.round(video.duration * 30) || 1, fps: 30 }; setTime(video.currentTime * 30); });
    stage.append(video); video.play().catch(() => {}); setPlaying(true);
    mode.className = 'pl-mode mono video'; mode.textContent = `Preview video. This template needs ${t.footage} — render it with your own to see it live.`;
  }
}
addEventListener('message', (e) => {
  const m = e.data || {}; if (m.source !== 'ink-signal' || !frame || e.source !== frame.contentWindow) return;
  if (m.type === 'error') { const t = BY[cur]; $$('.loading', stage).forEach((n) => (n.textContent = 'live player unavailable — showing the preview')); if (t.preview) { frame.remove(); frame = null; video = el('video', { src: t.preview, muted: true, loop: true, playsinline: true, autoplay: true }); stage.append(video); } return; }
  if (m.type === 'ready') $$('.loading', stage).forEach((n) => n.remove());
  meta = { duration: m.duration || meta.duration, fps: m.fps || 30 };
  setTime(m.f || 0); if (typeof m.playing === 'boolean' && m.playing !== playing) setPlaying(m.playing);
});
const send = (cmd, f) => frame?.contentWindow?.postMessage({ target: 'ink-signal', cmd, f }, '*');
$('#pl-play').addEventListener('click', () => { if (frame) { send('toggle'); setPlaying(!playing); } else if (video) { if (video.paused) { video.play(); setPlaying(true); } else { video.pause(); setPlaying(false); } } });
$('#pl-scrub').addEventListener('input', (e) => { const f = (+e.target.value / 1000) * meta.duration; if (frame) { send('pause'); send('seek', f); } else if (video) { video.pause(); video.currentTime = f / 30; } setPlaying(false); setTime(f); });
$$('#pl-fmt button').forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; fmt = b.dataset.f; syncFmt(); mountStage(); setCodes(BY[cur]); }));
const syncFmt = () => { const t = BY[cur]; $$('#pl-fmt button').forEach((b) => { const ok = t.live ? t.formats.includes(b.dataset.f) : b.dataset.f === 'yt'; b.disabled = !ok; b.setAttribute('aria-pressed', String(b.dataset.f === fmt)); }); };
$('#pl-apply').addEventListener('click', () => { try { params = JSON.parse($('#pl-json').value); $('#pl-err').textContent = ''; mountStage(); setCodes(BY[cur]); } catch (err) { $('#pl-err').textContent = 'Not valid JSON: ' + err.message; } });
$('#pl-reset').addEventListener('click', () => { params = editable(BY[cur]); $('#pl-json').value = JSON.stringify(params, null, 2); $('#pl-err').textContent = ''; mountStage(); setCodes(BY[cur]); });
const step = (k) => { const order = ORDER.length ? ORDER : DATA.templates.map((t) => t.name); const i = order.indexOf(cur); openPlayer(order[(i + k + order.length) % order.length]); };
$('#pl-prev').addEventListener('click', () => step(-1));
$('#pl-next').addEventListener('click', () => step(1));
$('#pl-close').addEventListener('click', () => pl.close());
pl.addEventListener('click', (e) => { if (e.target === pl) pl.close(); });
pl.addEventListener('close', () => { clearStage(); document.body.classList.remove('locked'); if (location.hash.startsWith('#t=')) history.replaceState(null, '', location.pathname + location.search); });
pl.addEventListener('keydown', (e) => {
  if (e.target.closest('textarea, input')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); step(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); } else if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); $('#pl-play').click(); }
});
function openPlayer(name) {
  const t = BY[name]; if (!t) return;
  cur = name; params = editable(t);
  fmt = t.live ? (t.formats.includes('yt') ? 'yt' : t.formats[0]) : 'yt';
  $('#pl-group').textContent = `${GROUP_LABEL[t.group] || ''} · ${(ORDER.indexOf(name) + 1) || ''}`.replace(/ · $/, '');
  $('#pl-name').textContent = t.name; $('#pl-engine').textContent = t.engine === 'motion' ? 'Signal Motion' : 'IS Spec · AE native'; $('#pl-dur').textContent = secs(t.duration);
  $('#pl-title').textContent = t.title; $('#pl-desc').textContent = t.description; $('#pl-best').textContent = t.best || '—';
  $('#pl-json').value = JSON.stringify(params, null, 2); $('#pl-pcount').textContent = `${Object.keys(params).length} keys`; $('#pl-err').textContent = '';
  syncFmt(); setCodes(t);
  if (!pl.open) { pl.showModal(); document.body.classList.add('locked'); pl.focus({ preventScroll: true }); }
  mountStage();
  history.replaceState(null, '', '#t=' + name);
}
window.openPlayer = openPlayer;
if (location.hash.startsWith('#t=') && DATA) openPlayer(decodeURIComponent(location.hash.slice(3)));
