#!/usr/bin/env python3
"""Turn a transcript into Ink & Signal caption words: [{text, start, end}] in seconds.

    python3 tools/words.py talk.srt --out words.json            # SRT / VTT: words spread across each cue
    python3 tools/words.py whisper.json --out words.json        # Whisper / WhisperX JSON with word timings
    python3 tools/words.py talk.srt --offset -1.0 --from 1.0 --to 4.0   # shift and trim to a clip's in/out

Feed the result to ov-captions / talking:  { "comp": "ov-captions", "params": { "words": <words.json> } }
"""
import argparse, json, re


def ts(s):
    s = s.strip().replace(",", ".")
    parts = s.split(":")
    while len(parts) < 3:
        parts.insert(0, "0")
    h, m, sec = parts
    return int(h) * 3600 + int(m) * 60 + float(sec)


def from_srt(text):
    words = []
    blocks = re.split(r"\n\s*\n", text.replace("\r", ""))
    for b in blocks:
        m = re.search(r"([\d:.,]+)\s*-->\s*([\d:.,]+)", b)
        if not m:
            continue
        s, e = ts(m.group(1)), ts(m.group(2))
        body = " ".join(l for l in b.split("\n")[b.split("\n").index(next(x for x in b.split("\n") if "-->" in x)) + 1:] if l.strip())
        body = re.sub(r"<[^>]+>", "", body)
        toks = body.split()
        if not toks:
            continue
        # weight each word by its length so long words hold longer
        weights = [max(2, len(t)) for t in toks]
        total = sum(weights)
        t = s
        for tok, w in zip(toks, weights):
            d = (e - s) * w / total
            words.append({"text": tok, "start": round(t, 3), "end": round(t + d, 3)})
            t += d
    return words


def from_whisper(data):
    words = []
    segs = data.get("segments", data if isinstance(data, list) else [])
    for seg in segs:
        for w in seg.get("words", []):
            txt = (w.get("word") or w.get("text") or "").strip()
            if txt and "start" in w and "end" in w:
                words.append({"text": txt, "start": round(w["start"], 3), "end": round(w["end"], 3)})
    if not words and "words" in data:
        words = [{"text": w["text"].strip(), "start": w["start"], "end": w["end"]} for w in data["words"]]
    return words


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("transcript")
    ap.add_argument("--out", default="words.json")
    ap.add_argument("--offset", type=float, default=0.0, help="seconds added to every word")
    ap.add_argument("--from", dest="t0", type=float, default=None, help="keep words starting at/after this source time")
    ap.add_argument("--to", dest="t1", type=float, default=None, help="keep words ending at/before this source time")
    a = ap.parse_args()
    raw = open(a.transcript, encoding="utf-8").read()
    words = from_whisper(json.loads(raw)) if a.transcript.endswith(".json") else from_srt(raw)
    if a.t0 is not None:
        words = [w for w in words if w["start"] >= a.t0 - 0.01]
    if a.t1 is not None:
        words = [w for w in words if w["end"] <= a.t1 + 0.01]
    shift = a.offset - (a.t0 or 0.0)
    for w in words:
        w["start"] = round(w["start"] + shift, 3)
        w["end"] = round(w["end"] + shift, 3)
    json.dump(words, open(a.out, "w"), indent=1)
    print(f"{len(words)} words → {a.out}")


if __name__ == "__main__":
    main()
