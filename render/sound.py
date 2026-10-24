#!/usr/bin/env python3
"""Ink & Signal — measured sound pass for a rendered video.

    python3 render/sound.py --video silent.mp4 --cues silent.cues.json --out sound/ \\
        [--music track.mp3 --music-source "Track, Artist, link" --music-license "…"] [--align] \\
        [--voice auto|none|path.wav] [--lufs -14] [--tp -1.5] [--swaps swaps.json] [--use-case "Instagram Reels"]

Cues come from the renderer (every motion scene writes <out>.cues.json: clicks, slams, typing, whooshes…),
from render/cues.mjs for edit plans, or by hand: [{"t": 1.2, "type": "click", "desc": "…", "dur": 0.8}].
Cue types map to sound categories through tokens.sound.cueMap; gains, pre-rolls and gaps come from tokens.

Claude can't hear, so nothing here is judged by ear: the mix is measured on the exported MP4 (integrated
LUFS and true peak, stereo and mono), every cue gets a before/after frame + waveform proof image, and the
report names the 5 riskiest timestamps for a human to check with headphones.
Approach after Vox (@Voxyz_ai) and Barty-Bart/motion-graphics sound-effects (MIT); sounds: bundled CC0.
Needs: ffmpeg, numpy, Pillow (scipy optional).
"""
import argparse, html, json, os, re, shutil, subprocess, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOK = json.load(open(os.path.join(ROOT, "tokens", "ink-signal.tokens.json")))
SND = TOK["sound"]
SR = 48000

# Ink & Signal kit: one bundled CC0 sound per category (Mixkit entries are runtime-only, opt-in)
KIT = {
    "whoosh": "kit/whoosh.ogg", "click": "kit/click.ogg", "pop": "kit/pop.ogg", "riser": "kit/riser.ogg",
    "impact": "kit/impact.ogg", "tick": "kit/tick.ogg", "typing": "typing/fs-447909-keyboard-typing.ogg",
    "ding": "ding/kenney-interface-confirmation-001.ogg", "glitch": "glitch/kenney-interface-glitch-002.ogg",
    "transition": "transition/fs-786514-swoosh-v2.ogg", "ui-blip": "ui-blip/kenney-ui-rollover2.ogg",
    "ambience": "ambience/fs-426767-apartment-room-tone-wav.ogg",
}
# takes that rotate on repeats (close, neutral alternatives; everything else only through --swaps)
VARY = {
    "tick": ["kit/tick.ogg", "tick/fs528561.ogg", "tick/fs384187.ogg"], "pop": ["kit/pop.ogg", "pop/fs527522.ogg", "pop/kenney-interface-pluck-001.ogg"],
    "click": ["kit/click.ogg", "click/kenney-interface-click-001.ogg"], "whoosh": ["kit/whoosh.ogg", "whoosh/fs830856.ogg", "whoosh/fs810485.ogg"],
    "impact": ["kit/impact.ogg", "impact/kenney-impact-impactsoft-heavy-000.ogg"], "ding": ["ding/kenney-interface-confirmation-001.ogg", "ding/kenney-interface-confirmation-003.ogg"],
}
ALT = {"tick": ["tick", "ui-blip"], "click": ["click"], "pop": ["pop"], "whoosh": ["whoosh", "transition"], "riser": ["riser"],
       "impact": ["impact"], "typing": ["typing"], "ding": ["ding"], "glitch": ["glitch"], "transition": ["transition", "whoosh"],
       "ui-blip": ["ui-blip", "tick"], "ambience": ["ambience"]}


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def probe(path):
    j = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path]).stdout)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in j["streams"] if s["codec_type"] == "audio"), None)
    fps = eval(v["r_frame_rate"]) if v else 30.0
    return {"duration": float(j["format"]["duration"]), "fps": fps, "audio": a is not None, "w": v and v["width"], "h": v and v["height"]}


def decode(path, sr=SR, ch=2, start=0.0, dur=None):
    cmd = ["ffmpeg", "-v", "error"] + (["-ss", f"{start:.3f}"] if start else []) + ["-i", path] + (["-t", f"{dur:.3f}"] if dur else []) + ["-vn", "-ac", str(ch), "-ar", str(sr), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True).stdout
    a = np.frombuffer(raw, dtype=np.float32).copy()
    return a.reshape(-1, ch) if ch > 1 else a


def lowpass_env(y, sr, cut=120.0, hop=240):
    try:
        from scipy.signal import butter, sosfiltfilt
        lo = sosfiltfilt(butter(4, cut, "low", fs=sr, output="sos"), y)
    except Exception:
        k = int(sr / cut); lo = np.convolve(y, np.ones(k) / k, mode="same")
    e = np.abs(lo)
    n = len(e) // hop * hop
    return e[:n].reshape(-1, hop).max(1), hop / sr


def db(x):
    return 10 ** (x / 20)


def measure(path, mono=False):
    o = run(["ffmpeg", "-nostats", "-i", path] + (["-ac", "1"] if mono else []) + ["-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    I = float(re.findall(r"I:\s+([-\d.]+) LUFS", o)[-1]); P = float(re.findall(r"Peak:\s+([-\d.]+) dBFS", o)[-1])
    return I, P


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--video", required=True)
    ap.add_argument("--cues", required=True)
    ap.add_argument("--out", default="sound-pass")
    ap.add_argument("--music")
    ap.add_argument("--music-db", type=float, default=SND["mix"]["musicUnderSfxDb"])
    ap.add_argument("--music-in", type=float, default=None, help="start the music this many seconds into the track (else --align or 0)")
    ap.add_argument("--music-source"); ap.add_argument("--music-license")
    ap.add_argument("--align", action="store_true", help="move where the music starts so hard cuts land on beats")
    ap.add_argument("--voice", default="auto", help="auto = keep the video's own audio as the voice track; none; or a file")
    ap.add_argument("--lufs", type=float, default=SND["mix"]["lufs"]); ap.add_argument("--tp", type=float, default=SND["mix"]["truePeakMax"])
    ap.add_argument("--swaps"); ap.add_argument("--use-case"); ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--allow-runtime", action="store_true", help="allow Mixkit runtime downloads listed in the manifest")
    ap.add_argument("--bed", action="store_true", help="add a quiet room-tone bed under everything")
    A = ap.parse_args()
    out = os.path.abspath(A.out); os.makedirs(os.path.join(out, "checks"), exist_ok=True)
    V = probe(A.video); dur, fps = V["duration"], V["fps"]
    cj = json.load(open(A.cues)); cues = cj["cues"] if isinstance(cj, dict) else cj
    cues = sorted([c for c in cues if 0 <= c["t"] <= dur], key=lambda c: c["t"])
    sfxdir = os.path.join(ROOT, "sound", "sfx"); man = json.load(open(os.path.join(sfxdir, "manifest.json")))
    lib = {}
    for e in man["bundled"]: lib.setdefault(e["category"], []).append({**e, "path": os.path.join(sfxdir, e["file"])})
    for e in man.get("default_kit", []):
        if e.get("file") and e.get("bundled"): lib.setdefault(e["category"], []).insert(0, {**e, "path": os.path.join(sfxdir, e["file"]), "license": e.get("license", "CC0 1.0")})
    if A.allow_runtime:
        for e in man.get("runtime", []): lib.setdefault(e["category"], []).append({**e, "path": None})
    byfile = {e["file"]: e for c in lib.values() for e in c if e.get("file")}
    swaps = json.load(open(A.swaps)) if A.swaps else {}
    log = []

    # ── music + beat grid ──
    mus = None; mstart = 0.0; grid = None; resid = {}
    if A.music:
        bj = os.path.join(out, "beats.json")
        r = run([sys.executable, os.path.join(ROOT, "render", "beats.py"), A.music, "--out", bj])
        if r.returncode == 0:
            B = json.load(open(bj)); grid = np.array(B["beats"]); period = 60 / B["bpm"]
            log.append(f"Beat grid: {B['bpm']} BPM, {len(B['beats'])} beats (kick-phase checked by render/beats.py).")
            # kicks below 120 Hz vs the grid (first 4 bars) → beatgrid.png
            y = decode(A.music, 22050, 1, 0, min(60, period * 16 + 2))
            env, dt = lowpass_env(y, 22050)
            te = np.arange(len(env)) * dt
            pk = [te[i] for i in range(1, len(env) - 1) if env[i] > env[i - 1] and env[i] >= env[i + 1] and env[i] > env.max() * 0.5]
            offs = [min(pk, key=lambda k: abs(k - b)) - b for b in grid[grid < period * 16]] if pk else []
            med = float(np.median(offs)) if offs else 0.0
            if abs(med) > 0.03: grid = grid + med; log.append(f"Kicks sat {med * 1000:+.0f} ms off the grid → shifted the whole grid.")
            else: log.append(f"Kicks vs grid: median {med * 1000:+.0f} ms → grid OK.")
            draw_grid(os.path.join(out, "beatgrid.png"), env, dt, grid, period * 16)
            hard = [c["t"] for c in cues if c["type"] in ("scene_cut", "reveal", "slam")]
            if A.music_in is not None: mstart = A.music_in
            elif A.align and hard:
                best = None
                for s in np.arange(0, min(period * 8, max(0.0, grid[-1] - dur)) + 1e-9, 0.005):
                    e = sum(np.min(np.abs((grid - s) - t)) for t in hard)
                    if best is None or e < best[0]: best = (e, float(s))
                mstart = best[1] if best else 0.0
            if hard: resid = {t: float(np.min(np.abs((grid - mstart) - t))) for t in hard}
            if resid: log.append(f"Music starts {mstart:.3f}s into the track. Cut-to-beat error: " + ", ".join(f"{t:.2f}s={r * 1000:.0f}ms" for t, r in resid.items()))
        else:
            log.append("Beat tracking failed: " + r.stderr.strip()[-200:])
        mus = decode(A.music, SR, 2, mstart, dur + 0.2)

    # ── place one sound per cue ──
    N = int(dur * SR) + SR
    sfx = np.zeros((N, 2), np.float32)
    used = {}; last = {}; placed = []; cache = {}
    rot = {}

    def load_snd(p):
        if p not in cache: cache[p] = decode(p, SR, 2)
        return cache[p]

    def pick(cat, idx, want_len=None):
        sw = swaps.get(str(idx))
        pool = [e for c in ALT.get(cat, [cat]) for e in lib.get(c, []) if e.get("path")]
        if sw and sw != "auto":
            for e in pool:
                if e.get("file") == sw: return e
        if sw == "auto":
            cand = [e for e in pool if e.get("file") != KIT.get(cat)] or pool
            if want_len: cand = sorted(cand, key=lambda e: abs((e.get("duration_s") or 1) - want_len))[: max(3, len(cand) // 2)]
            return cand[(idx + A.seed) % len(cand)]
        if cat in used and cat in VARY:
            k = rot.get(cat, 0) + 1; rot[cat] = k
            f = VARY[cat][k % len(VARY[cat])]
            return byfile.get(f) or {"file": f, "path": os.path.join(sfxdir, f), "category": cat, "license": "CC0 1.0", "source_url": None}
        f = KIT.get(cat)
        return byfile.get(f) or {"file": f, "path": os.path.join(sfxdir, f), "category": cat, "license": "CC0 1.0", "source_url": None}

    gains = SND["gainDb"]; pre = SND["preRollFrames"]; gaps = SND["minGapSec"]
    for idx, c in enumerate(cues):
        typ = c["type"]; cat = SND["cueMap"].get(typ, typ if typ in KIT else "pop")
        if typ in ("count",): cat = "tick"
        if cat in gaps and cat in last and c["t"] - last[cat] < gaps[cat]:
            continue
        e = pick(cat, idx, c.get("dur") if cat in ("whoosh", "transition") else None)
        a = load_snd(e["path"]).copy()
        g = gains.get(cat, -8)
        start = c["t"] - pre.get(cat, 0) / fps
        if cat == "typing":
            need = int(max(0.2, c.get("dur", 1.0)) * SR); a = np.tile(a, (need // max(1, len(a)) + 1, 1))[:need]
            f = min(len(a), int(0.06 * SR)); a[-f:] *= np.linspace(1, 0, f)[:, None]
        elif cat == "riser":
            need = int(max(0.3, c.get("dur", 0.8)) * SR)
            if len(a) > need: a = a[-need:]
            f = min(len(a), int(0.03 * SR)); a[:f] *= np.linspace(0, 1, f)[:, None]
            start = c["t"] + c.get("dur", 0.8) - len(a) / SR
        elif cat == "count":
            pass
        i0 = max(0, int(start * SR)); a = a * db(g); n = min(len(a), N - i0)
        if n > 0: sfx[i0:i0 + n] += a[:n]
        used[cat] = used.get(cat, 0) + 1; last[cat] = c["t"]
        alts = [x for x in [e2 for cc in ALT.get(cat, [cat]) for e2 in lib.get(cc, [])] if x.get("file") != e.get("file")][:12]
        placed.append({**c, "idx": idx, "category": cat, "sfx": e.get("file"), "path": e.get("path"), "start": round(start, 3), "gain_db": g,
                       "license": e.get("license"), "source_url": e.get("source_url") or e.get("source_page"), "attribution": e.get("attribution") or e.get("credit"),
                       "alternatives": [{"id": x.get("file"), "path": x.get("path"), "license": x.get("license"), "source_url": x.get("source_url")} for x in alts]})
    if A.bed:
        bed = load_snd(os.path.join(sfxdir, KIT["ambience"])); reps = N // len(bed) + 1
        sfx += np.tile(bed, (reps, 1))[:N] * db(gains["ambience"])

    # ── voice + music, ducking ──
    voice = None
    if A.voice == "auto" and V["audio"]: voice = decode(A.video, SR, 2)
    elif A.voice not in ("auto", "none") and os.path.exists(A.voice): voice = decode(A.voice, SR, 2)
    mix = sfx.copy()
    if voice is not None:
        n = min(len(voice), N); mix[:n] += voice[:n]; log.append("Voice: the video's own audio kept at 0 dB (priority: voice > SFX > music).")
    if mus is not None:
        m = mus[: N].copy() * db(A.music_db)
        if voice is not None:
            hop = 480; vv = np.abs(voice[:, 0]) if voice.ndim > 1 else np.abs(voice); k = len(vv) // hop
            rms = np.sqrt((vv[: k * hop].reshape(-1, hop) ** 2).mean(1)); act = (rms > max(1e-4, np.percentile(rms, 60) * 0.5)).astype(np.float32)
            env = np.zeros_like(act); s = 0.0
            for i, x in enumerate(act): s = s + (x - s) * (0.5 if x > s else 0.03); env[i] = s
            duck = db(-SND["mix"]["duckUnderVoiceDb"] * env); dk = np.repeat(duck, hop)[: len(m)]
            if len(dk) < len(m): dk = np.concatenate([dk, np.ones(len(m) - len(dk))])
            m *= dk[:, None]; log.append(f"Music ducks up to {SND['mix']['duckUnderVoiceDb']} dB under the voice.")
        f = min(len(m), int(0.8 * SR)); m[-f:] *= np.linspace(1, 0, f)[:, None]
        mix[: len(m)] += m
    mix = mix[: int(dur * SR)]
    raw = os.path.join(out, "mix_raw.f32"); mix.astype(np.float32).tofile(raw)

    # ── export, measure on the MP4, adjust, repeat ──
    after = os.path.join(out, "after.mp4")
    def export(g, lim):
        af = f"volume={g:.2f}dB" + (f",alimiter=limit={lim:.4f}:level=false" if lim else "")
        r = run(["ffmpeg", "-y", "-v", "error", "-i", A.video, "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", raw, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "256k", "-shortest", after])
        if r.returncode: raise SystemExit(r.stderr)
    g, lim = 0.0, None
    for it in range(10):
        export(g, lim); I, P = measure(after)
        log.append(f"pass {it + 1}: gain {g:+.1f} dB, limiter {lim if lim else 'off'} → {I:.1f} LUFS, true peak {P:.1f} dBFS")
        if abs(I - A.lufs) <= 0.5 and P < A.tp: break
        if P >= A.tp: lim = round((lim or 0.89) * 0.9, 4)
        if abs(I - A.lufs) > 0.5: g += A.lufs - I
    Im, Pm = measure(after, mono=True)
    log.append(f"FINAL after.mp4: {I:.1f} LUFS integrated, true peak {P:.1f} dBFS · mono downmix {Im:.1f} LUFS, {Pm:.1f} dBFS (targets {A.lufs} LUFS, < {A.tp} dBTP).")
    os.remove(raw)

    # ── proof images ──
    au = decode(after, SR, 1)
    for k, c in enumerate(placed):
        proof(os.path.join(out, "checks", f"cue-{k:02d}.png"), after, au, c, dur)

    # ── licences, credits, report ──
    def free(l): l = l or ""; return "CC0" in l or ("Mixkit" in l and "Free" in l)
    seen = {}; unknown = []
    for c in placed:
        if c["sfx"] in seen: continue
        e = byfile.get(c["sfx"], {}); who = (c.get("attribution") or "Kenney / Freesound creator").split(" via ")[0].split(" (")[0]
        name = os.path.splitext(os.path.basename(c["sfx"] or "sound"))[0]
        seen[c["sfx"]] = f'"{name}" by {who}, {c.get("license") or "licence unknown"}' + (f' — {c["source_url"]}' if c.get("source_url") else "")
        if not free(c.get("license")): unknown.append(seen[c["sfx"]])
    music_line = (f"{A.music_source or os.path.basename(A.music)}, {A.music_license}" if A.music_license else f"{A.music_source or os.path.basename(A.music)} — LICENCE NOT CONFIRMED") if A.music else "No music."
    open(os.path.join(out, "CREDITS.txt"), "w").write("Sound effects\n" + "\n".join(seen.values()) + "\n\nMusic\n" + music_line + "\n\nSound design: Ink & Signal sound pass (after Vox @Voxyz_ai).\n")
    risk = sorted(placed, key=lambda c: -(resid.get(c["t"], 0) * 10 + {"typing": .5, "riser": .4, "impact": .3, "whoosh": .2}.get(c["category"], 0)))[:5]
    ts = [f"{c['t']:.2f}s — {c['type']} ({c.get('desc', '')}) → check {'beat sync' if c['t'] in resid else 'level / feel'}" for c in sorted(risk, key=lambda c: c["t"])]
    lic = ["All sound effects are bundled CC0 (or Mixkit Free License if you allowed runtime sounds). Sources can change their terms; check the source pages now and then."] if not unknown else ["UNKNOWN LICENCES — do not publish until checked:"] + unknown
    lic.append(("Music licence: " + A.music_license) if A.music_license else ("Music licence: NOT CONFIRMED — ask where the track is from." if A.music else "No music in this pass."))
    lic.append(("Use case: " + A.use_case) if A.use_case else "Use case: not given — ask where the video will be published.")
    md = ["# SOUND.md — Ink & Signal sound pass", "", "Claude can't hear: everything below is measured. Listen to the 5 timestamps at the end.", "", f"Video: {os.path.basename(A.video)} · {dur:.2f}s @ {fps:.3f} fps", f"Music: {music_line}", "", "## Licences"] + ["- " + l for l in lic] + ["- CREDITS.txt is ready to paste into a description (CC0 needs no credit; it doubles as proof of source).", "", "## Log"] + ["- " + l for l in log] + ["", "## Cues", "| time | cue | sound | starts | gain |", "|---|---|---|---|---|"] + [f"| {c['t']:.2f}s | {c['type']} — {c.get('desc', '')} | {c['sfx']} | {c['start']:.3f}s | {c['gain_db']} dB |" for c in placed] + ["", "## Check these 5 with headphones"] + ["- " + t for t in ts] + ["", "Proof images: checks/cue-XX.png (frame before, frame after, waveform around the cue)."]
    open(os.path.join(out, "SOUND.md"), "w").write("\n".join(md) + "\n")
    report(out, placed, I, P)
    print("\n".join(md))


def draw_grid(path, env, dt, grid, span):
    from PIL import Image, ImageDraw
    W, H = 1400, 260; im = Image.new("RGB", (W, H), "#0E0E0E"); d = ImageDraw.Draw(im)
    n = min(len(env), int(span / dt)); e = env[:n] / (env[:n].max() + 1e-9)
    for i in range(n): x = int(i / n * W); d.line([(x, H - 20), (x, H - 20 - int(e[i] * (H - 50)))], fill="#8E8E8B")
    for b in grid[grid < span]: x = int(b / span * W); d.line([(x, 10), (x, H - 10)], fill="#F2362B", width=2)
    d.text((10, 6), "music below 120 Hz (kicks) vs beat grid - first 4 bars. Kicks should sit on the red lines.", fill="#ECEBE6")
    im.save(path)


def proof(path, video, au, c, dur):
    from PIL import Image, ImageDraw
    tmp = path + ".f%d.png"
    for k, dt in enumerate((-0.1, 0.15)):
        run(["ffmpeg", "-y", "-v", "error", "-ss", f"{max(0, min(dur - 0.05, c['t'] + dt)):.3f}", "-i", video, "-frames:v", "1", "-vf", "scale=320:-2", tmp % k])
    W, H = 1280, 240; im = Image.new("RGB", (W, H), "#141414"); d = ImageDraw.Draw(im)
    x = 10
    for k in range(2):
        if os.path.exists(tmp % k):
            f = Image.open(tmp % k); f.thumbnail((300, 200)); im.paste(f, (x, 30)); os.remove(tmp % k)
        x += 310
    s0, s1 = max(0, c["t"] - 0.5), min(dur, c["t"] + 0.8); seg = au[int(s0 * SR): int(s1 * SR)]
    ww, x0 = W - x - 10, x
    if len(seg):
        pk = np.abs(seg); bins = np.array_split(pk, ww)
        for i, b in enumerate(bins):
            v = float(b.max()) if len(b) else 0; hgt = int(min(1, v) * 90); d.line([(x0 + i, 130 - hgt), (x0 + i, 130 + hgt)], fill="#ECEBE6")
    cx = x0 + int((c["t"] - s0) / (s1 - s0) * ww); d.line([(cx, 30), (cx, 230)], fill="#F2362B", width=2)
    d.text((10, 8), f"cue {c['idx']} @ {c['t']:.2f}s  {c['type']} -> {c['sfx']}   (before | after | waveform -0.5 .. +0.8 s)", fill="#ECEBE6")
    im.save(path)


def report(out, placed, lufs, peak):
    e = html.escape
    rel = lambda p: os.path.relpath(p, out) if p else ""
    rows = []
    for c in placed:
        opts = [f'<label><input type=radio name="c{c["idx"]}" value="" checked> keep</label>', f'<label><input type=radio name="c{c["idx"]}" value="auto"> let Claude pick</label>']
        for a in c["alternatives"]:
            opts.append(f'<div class=o><label><input type=radio name="c{c["idx"]}" value="{e(a["id"] or "")}"> {e(os.path.basename(a["id"] or ""))}</label> <audio controls preload=none src="{e(rel(a["path"]))}"></audio> <span class=m>{e(a["license"] or "")}</span></div>')
        rows.append(f'<tr><td><button onclick="seek({c["t"]})">{c["t"]:.2f}s</button></td><td>{e(c["type"])}<br><span class=m>{e(c.get("desc", ""))}</span></td><td><b>{e(c["category"])}</b></td><td>{e(os.path.basename(c["sfx"] or ""))}<br><audio controls preload=none src="{e(rel(c["path"]))}"></audio><br><span class=m>{e(c.get("license") or "")}</span></td><td><details><summary>swap ({len(c["alternatives"])})</summary>{"".join(opts)}</details></td></tr>')
    doc = f'''<!doctype html><meta charset=utf-8><title>Sound pass — Ink &amp; Signal</title>
<style>body{{font:14px system-ui;background:#0E0E0E;color:#ECEBE6;margin:24px}}h1{{font:800 28px system-ui;letter-spacing:-.02em}}table{{border-collapse:collapse;width:100%}}td{{border-bottom:1px solid #2A2A2A;padding:8px;vertical-align:top}}.m{{color:#8E8E8B;font-size:12px}}.o{{margin:4px 0}}audio{{height:28px;vertical-align:middle}}button{{background:#F2362B;color:#0E0E0E;border:0;padding:6px 10px;font-weight:700;cursor:pointer}}video{{max-height:420px;max-width:100%}}</style>
<h1>Sound pass</h1><p>Measured on the exported MP4: <b>{lufs:.1f} LUFS</b>, true peak <b>{peak:.1f} dBFS</b>. Click a time to jump. Pick swaps, then <button onclick="dl()">Download swaps.json</button> and re-run with <code>--swaps swaps.json</code>.</p>
<video id=v controls src="after.mp4"></video>
<table><tr><th>time</th><th>cue</th><th>category</th><th>sound</th><th>swap</th></tr>{"".join(rows)}</table>
<script>function seek(t){{const v=document.getElementById('v');v.currentTime=Math.max(0,t-0.5);v.play()}}
function dl(){{const s={{}};document.querySelectorAll('input[type=radio]:checked').forEach(i=>{{if(i.value)s[i.name.slice(1)]=i.value}});const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(s,null,1)],{{type:'application/json'}}));a.download='swaps.json';a.click()}}</script>'''
    open(os.path.join(out, "report.html"), "w").write(doc)


if __name__ == "__main__":
    main()
