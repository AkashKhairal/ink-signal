// Embed mode for the stages (?embed=1): the page fills its frame, loops on its own, and takes commands from the
// page that hosts it (the website's live player). Messages are tagged so other postMessage traffic is ignored.
//   parent → stage  { target: 'ink-signal', cmd: 'play' | 'pause' | 'toggle' | 'seek', f }
//   stage → parent  { source: 'ink-signal', type: 'ready' | 'time' | 'error', f, duration, fps, playing, … }
export function runEmbed({ el, width, height, duration, fps, seek, name }) {
  const q = new URLSearchParams(location.search);
  document.documentElement.classList.add('embed');
  document.body.classList.add('embed');
  if (q.get('bg')) document.body.dataset.bg = q.get('bg');
  const fit = () => {
    const k = Math.min(innerWidth / width, innerHeight / height);
    el.style.position = 'absolute'; el.style.left = '0px'; el.style.top = '0px'; el.style.transformOrigin = '0 0';
    el.style.transform = `translate(${((innerWidth - width * k) / 2).toFixed(2)}px,${((innerHeight - height * k) / 2).toFixed(2)}px) scale(${k.toFixed(5)})`;
  };
  fit(); addEventListener('resize', fit);
  const post = (m) => { if (parent !== window) parent.postMessage({ source: 'ink-signal', name, duration, fps, width, height, ...m }, '*'); };
  let f = 0, playing = q.get('autoplay') !== '0', last = performance.now(), busy = false, shown = -1;
  addEventListener('message', (e) => {
    const m = e.data || {};
    if (m.target !== 'ink-signal') return;
    if (m.cmd === 'play') playing = true;
    else if (m.cmd === 'pause') playing = false;
    else if (m.cmd === 'toggle') playing = !playing;
    else if (m.cmd === 'seek') { f = Math.max(0, Math.min(duration - 0.001, +m.f || 0)); shown = -1; }
    post({ type: 'time', f, playing });
  });
  const tick = async (now) => {
    if (!busy) {
      busy = true;
      const dt = Math.min(0.1, (now - last) / 1000);
      if (playing) f = (f + dt * fps) % duration;
      last = now;
      if (playing || shown !== f) { await seek(f); shown = f; post({ type: 'time', f, playing }); }
      busy = false;
    }
    requestAnimationFrame(tick);
  };
  post({ type: 'ready', f: 0, playing });
  requestAnimationFrame(tick);
}

export function embedError(err) {
  if (parent !== window) parent.postMessage({ source: 'ink-signal', type: 'error', message: String(err && err.message || err) }, '*');
}
