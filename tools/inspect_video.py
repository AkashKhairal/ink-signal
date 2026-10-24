#!/usr/bin/env python3
"""Inspect a talking-head video: specs, a contact sheet, and the layout over time.

    python3 tools/inspect_video.py talk.mp4 work/

Writes work/contact.png (16 frames) and work/video.json:
  { width, height, fps, duration, sections: [{ from, to, layout: full|pip|black, subject_box?, box_changes? }] }
full  = the speaker fills the frame → full-frame cutaways
pip   = the speaker sits in a box and the rest is empty → transparent panels centred in the empty area
black = fade / intro / outro
Adapted from motion-broll (Barty-Bart/motion-graphics, MIT).
"""
import json, os, subprocess, sys
import numpy as np

v, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
p = json.loads(subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", v], capture_output=True, text=True).stdout)
vs = [s for s in p["streams"] if s["codec_type"] == "video"][0]
W, H = int(vs["width"]), int(vs["height"]); fps = vs["r_frame_rate"]; dur = float(p["format"]["duration"])
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", v, "-vf", f"fps=1/{max(1, dur / 16):.2f},scale=480:-1,tile=4x4:padding=4", "-frames:v", "1", f"{out}/contact.png"])
GW, GH = 96, max(16, round(96 * H / W))
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", v, "-vf", f"fps=4,scale={GW}:{GH},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, GH, GW)
def layout(f):
    if f.max() <= 20: return "black"
    third = GW * 3 // 8
    return "pip" if f[:, GW - third:].mean() < 8 or f[:, :third].mean() < 8 else "full"
sections = []; prev = None; start = 0
for i, f in enumerate(fr):
    lay = layout(f)
    if lay != prev:
        if prev is not None: sections.append({"from": start / 4, "to": i / 4, "layout": prev})
        start = i; prev = lay
sections.append({"from": start / 4, "to": len(fr) / 4, "layout": prev})
for s in sections:
    if s["layout"] != "pip": continue
    boxes = []
    for i in range(int(s["from"] * 4), int(s["to"] * 4)):
        f = fr[i]; cols = np.where(f.max(0) > 20)[0]; rows = np.where(f.max(1) > 20)[0]
        if len(cols): boxes.append((i / 4, [int(cols.min() * W / GW), int(rows.min() * H / GH), int((cols.max() + 1) * W / GW), int((rows.max() + 1) * H / GH)]))
    if not boxes: continue
    s["subject_box"] = [min(b[1][0] for b in boxes), min(b[1][1] for b in boxes), max(b[1][2] for b in boxes), max(b[1][3] for b in boxes)]
    bx = s["subject_box"]; free_l, free_r = bx[0], W - bx[2]
    s["panel_center"] = [round(bx[2] + free_r / 2), H // 2] if free_r >= free_l else [round(free_l / 2), H // 2]
    ch = []; ref = boxes[0][1]
    for t, b in boxes:
        if max(abs(b[k] - ref[k]) for k in range(4)) > 2 * W / GW: ch.append({"at": t, "box": b}); ref = b
    s["box_changes"] = ch
    if ch: print(f"WARNING: the speaker box moves/resizes inside {s['from']}-{s['to']}s at {[c['at'] for c in ch]}: size panels for the largest box or split the panel.")
info = {"width": W, "height": H, "fps": fps, "duration": dur, "sections": sections}
json.dump(info, open(f"{out}/video.json", "w"), indent=1)
print(json.dumps(info, indent=1))
