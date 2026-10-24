#!/usr/bin/env python3
"""Ink & Signal — beat grid from a song (numpy only; ffmpeg decodes the audio).

    python3 render/beats.py song.mp3 --out beats.json [--bpm-min 70 --bpm-max 180]

Writes { bpm, beats:[s], downbeats:[s], bars:[{start,end,energy}], drop, duration }.
Use it in an edit plan:  "beats": <beats>, "downbeats": <downbeats>, "snap": "downbeat"
so every cut lands on a downbeat (see runtime/comps/edit.js).
"""
import argparse, json, subprocess, sys
import numpy as np

SR = 22050
HOP = 256


def load(path):
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def stft_mag(y, n=1024, hop=HOP):
    win = np.hanning(n).astype(np.float32)
    frames = 1 + max(0, (len(y) - n) // hop)
    idx = np.arange(n)[None, :] + hop * np.arange(frames)[:, None]
    return np.abs(np.fft.rfft(y[idx] * win, axis=1)).astype(np.float32)


def onset_envelope(S):
    L = np.log1p(10 * S)
    flux = np.maximum(0, np.diff(L, axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    flux -= np.convolve(flux, np.ones(16) / 16, mode="same")  # local mean removal
    flux = np.maximum(flux, 0)
    return flux / (flux.max() + 1e-9)


def low_energy(S, sr=SR, n=1024):
    freqs = np.fft.rfftfreq(n, 1 / sr)
    band = (freqs > 30) & (freqs < 150)
    e = S[:, band].sum(axis=1)
    return e / (e.max() + 1e-9)


def tempo(onset, fps, bmin, bmax):
    o = onset - onset.mean()
    ac = np.correlate(o, o, mode="full")[len(o) - 1:]
    lags = np.arange(len(ac))
    bpm = 60 * fps / np.maximum(lags, 1)
    ok = (bpm >= bmin) & (bpm <= bmax)
    # prefer tempos around 120 (log-gaussian prior), like most beat trackers
    prior = np.exp(-0.5 * (np.log2(np.maximum(bpm, 1) / 120) / 0.9) ** 2)
    score = np.where(ok, ac * prior, -np.inf)
    lag = int(np.argmax(score))
    # refine with parabolic interpolation
    if 1 <= lag < len(ac) - 1:
        a, b, c = ac[lag - 1], ac[lag], ac[lag + 1]
        d = 0.5 * (a - c) / (a - 2 * b + c + 1e-9)
        lagf = lag + d
    else:
        lagf = lag
    return 60 * fps / lagf, lagf


def track(onset, period, tightness=100.0):
    """Ellis (2007) dynamic-programming beat tracker."""
    n = len(onset)
    score = onset.copy()
    back = -np.ones(n, dtype=int)
    lo, hi = int(round(period * 0.5)), int(round(period * 2))
    for i in range(hi, n):
        prev = np.arange(i - hi, i - lo)
        pen = -tightness * (np.log((i - prev) / period)) ** 2
        cand = score[prev] + pen
        j = int(np.argmax(cand))
        score[i] = onset[i] + cand[j]
        back[i] = prev[j]
    # start from the best of the last period
    i = int(np.argmax(score[-int(period):])) + n - int(period)
    beats = []
    while i >= 0:
        beats.append(i)
        i = back[i]
    return np.array(beats[::-1])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("--out", default="beats.json")
    ap.add_argument("--bpm-min", type=float, default=70)
    ap.add_argument("--bpm-max", type=float, default=180)
    a = ap.parse_args()
    y = load(a.audio)
    if len(y) < SR:
        sys.exit("audio too short")
    S = stft_mag(y)
    fps = SR / HOP
    on = onset_envelope(S)
    bpm, period = tempo(on, fps, a.bpm_min, a.bpm_max)
    beats_f = track(on, period)
    # beats sit on kicks, not hats: if the half-beat-shifted grid has more low-end onset, shift it
    freqs = np.fft.rfftfreq(1024, 1 / SR)
    lowS = S[:, (freqs > 30) & (freqs < 150)]
    low_on = onset_envelope(lowS)
    half = int(round(period / 2))
    shifted = beats_f + half
    shifted = shifted[shifted < len(low_on)]
    def at(fr, env):
        return np.array([env[max(0, f - 2): f + 3].max() for f in fr]).mean() if len(fr) else 0
    if at(shifted, low_on) > 1.2 * at(beats_f, low_on):
        beats_f = shifted
    # the DP starts late: extend the grid back to the start of the song
    first = list(beats_f)
    while first[0] - period > 0:
        g = int(round(first[0] - period))
        w = int(period * 0.1)
        seg = on[max(0, g - w): g + w + 1]
        first.insert(0, max(0, g - w) + int(np.argmax(seg)) if len(seg) else g)
    beats_f = np.array(first)
    beats = (beats_f * HOP + 512) / SR  # frame centre
    # downbeat phase: the beat-in-4 position with the most low-end (kick) energy
    low = low_energy(S)
    phase_scores = [low[beats_f[p::4]].mean() if len(beats_f[p::4]) else 0 for p in range(4)]
    ph = int(np.argmax(phase_scores))
    downbeats = beats[ph::4]
    # bar energies and the drop (largest jump in bar RMS)
    rms = np.sqrt(np.convolve(y ** 2, np.ones(HOP) / HOP, mode="same"))[::HOP]
    bars = []
    for i in range(len(downbeats)):
        s = downbeats[i]
        e = downbeats[i + 1] if i + 1 < len(downbeats) else len(y) / SR
        seg = rms[int(s * fps): int(e * fps)]
        bars.append({"start": round(float(s), 3), "end": round(float(e), 3), "energy": round(float(seg.mean()) if len(seg) else 0, 5)})
    drop = None
    if len(bars) > 2:
        en = np.array([b["energy"] for b in bars])
        jumps = en[1:] - en[:-1]
        drop = bars[int(np.argmax(jumps)) + 1]["start"]
    out = {
        "source": a.audio, "bpm": round(float(bpm), 2), "beatSec": round(60 / float(bpm), 4),
        "beats": [round(float(b), 3) for b in beats], "downbeats": [round(float(b), 3) for b in downbeats],
        "bars": bars, "drop": drop, "duration": round(len(y) / SR, 3),
    }
    json.dump(out, open(a.out, "w"), indent=1)
    print(f"{a.audio}: {out['bpm']} BPM, {len(beats)} beats, {len(downbeats)} bars, drop at {drop}s → {a.out}")


if __name__ == "__main__":
    main()
