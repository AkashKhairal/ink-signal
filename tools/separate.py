#!/usr/bin/env python3
"""Ink & Signal — separate the subject (a person, product or hand) from the background, on your own machine.

    # 1. scan the machine, save the first frame with a grid so you can pick click points
    python3 tools/separate.py clip.mp4 --preview work/
    # 2. separate: points on the subject (label 1) and on things to leave out (label 0), in 960-wide pixels
    python3 tools/separate.py clip.mp4 --out work/masks --start 0 --end 4.0 --points 480,270 100,60 --labels 1 0
    # green-screen footage: no model needed
    python3 tools/separate.py clip.mp4 --out work/masks --chroma 0x00FF00 --start 0 --end 4

Writes one PNG per frame (white = subject, alpha = subject) named 00000.png, 00001.png… counted from --start,
plus work/masks/separated.mp4 (the subject highlighted, to check it). Then put the title behind the subject:

    node render/cli.mjs render t-behind --params '{"src":"clip.mp4","masks":"work/masks","start":0,"dur":4,"text":"Focus"}' --out behind.mp4

Model (SAM 2 via 🤗 transformers), picked from the machine: NVIDIA ≥12 GB → sam2.1-hiera-large (898 MB);
smaller NVIDIA or Apple Silicon → base-plus (323 MB); CPU → tiny (156 MB, ~5 s per frame). Everything stays local;
only the first run downloads the model. Setup in a folder you can delete:
    python3 -m venv .separate && .separate/bin/pip install torch transformers opencv-python-headless pillow numpy
Adapted from object-separation (Barty-Bart/motion-graphics, MIT).
"""
import argparse, os, subprocess, sys
import numpy as np


def fps_of(video):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", video], capture_output=True, text=True).stdout.strip()
    n, d = (out.split("/") + ["1"])[:2]
    return float(n) / float(d or 1)


def write_mask(path, m, size=None):
    from PIL import Image
    a = (m.astype(np.uint8) * 255)
    im = Image.fromarray(a, "L")
    if size: im = im.resize(size, Image.BILINEAR)
    rgba = Image.merge("RGBA", (im, im, im, im))
    rgba.save(path)


def chroma(args, fps):
    """green/blue screen → masks with ffmpeg's chromakey (alpha) — no model, any machine"""
    os.makedirs(args.out, exist_ok=True)
    key = args.chroma
    dur = (args.end - args.start) if args.end else None
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", str(args.start), "-i", args.video] + (["-t", f"{dur:.3f}"] if dur else []) + [
        "-vf", f"format=yuva444p,chromakey={key}:{args.similarity}:{args.blend},alphaextract,format=gray", "-start_number", "0", os.path.join(args.out, "%05d_a.png")]
    subprocess.run(cmd, check=True)
    from PIL import Image
    for f in sorted(x for x in os.listdir(args.out) if x.endswith("_a.png")):
        a = Image.open(os.path.join(args.out, f)).convert("L")
        Image.merge("RGBA", (a, a, a, a)).save(os.path.join(args.out, f.replace("_a", "")))
        os.remove(os.path.join(args.out, f))
    print(f"masks → {args.out} (chroma key {key})")


def sam(args, fps):
    import platform, cv2, torch
    from transformers import Sam2VideoModel, Sam2VideoProcessor
    print("system:", platform.system(), platform.machine())
    if torch.cuda.is_available():
        gb = torch.cuda.get_device_properties(0).total_memory / 1e9
        dev, model_id = "cuda", "facebook/sam2.1-hiera-" + ("large" if gb >= 12 else "base-plus"); print("gpu:", torch.cuda.get_device_name(0), f"{gb:.0f} GB")
    elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        dev, model_id = "mps", "facebook/sam2.1-hiera-base-plus"
    else:
        dev, model_id = "cpu", "facebook/sam2.1-hiera-tiny"
    print("device:", dev, "| model:", model_id)
    W = 960
    def read_frames(a, b):
        cap = cv2.VideoCapture(args.video); cap.set(cv2.CAP_PROP_POS_FRAMES, a); out = []
        for _ in range(a, b + 1):
            ok, im = cap.read()
            if not ok: break
            out.append(cv2.cvtColor(cv2.resize(im, (W, int(im.shape[0] * W / im.shape[1]))), cv2.COLOR_BGR2RGB))
        return out
    if args.preview:
        os.makedirs(args.preview, exist_ok=True)
        im = cv2.cvtColor(read_frames(int(args.start * fps), int(args.start * fps))[0], cv2.COLOR_RGB2BGR)
        for x in range(0, im.shape[1], 80): cv2.line(im, (x, 0), (x, im.shape[0]), (0, 255, 255), 1); cv2.putText(im, str(x), (x + 2, 12), 0, 0.4, (0, 255, 255), 1)
        for y in range(0, im.shape[0], 60): cv2.line(im, (0, y), (im.shape[1], y), (0, 255, 255), 1); cv2.putText(im, str(y), (2, y - 2), 0, 0.4, (0, 255, 255), 1)
        p = os.path.join(args.preview, "preview.jpg"); cv2.imwrite(p, im); print("pick click points on", p, "(960-wide pixels)"); return
    model = Sam2VideoModel.from_pretrained(model_id).to(dev).eval(); proc = Sam2VideoProcessor.from_pretrained(model_id)
    pts = [[float(v) for v in p.split(",")] for p in args.points]; lbl = [int(v) for v in args.labels]
    def chunk(frames, points=None, labels=None, mask=None):
        H = frames[0].shape[0]
        s = proc.init_video_session(video=frames, inference_device=dev, video_storage_device="cpu", inference_state_device="cpu", dtype=torch.float32)
        if mask is None: proc.add_inputs_to_inference_session(inference_session=s, frame_idx=0, obj_ids=1, input_points=[[points]], input_labels=[[labels]])
        else: proc.add_inputs_to_inference_session(inference_session=s, frame_idx=0, obj_ids=1, input_masks=mask.astype(np.uint8))
        res = {}
        with torch.inference_mode():
            model(inference_session=s, frame_idx=0)
            for o in model.propagate_in_video_iterator(s, start_frame_idx=0):
                m = proc.post_process_masks([o.pred_masks], original_sizes=[[H, W]], binarize=True)[0]
                res[o.frame_idx] = m.squeeze().cpu().numpy().astype(bool)
        return res
    a0 = int(round(args.start * fps)); a1 = int(round(args.end * fps)) if args.end else a0 + int(4 * fps)
    cap = cv2.VideoCapture(args.video); size = (int(cap.get(3)), int(cap.get(4)))
    os.makedirs(args.out, exist_ok=True)
    a, seed, n = a0, None, 0
    while a < a1:
        b = min(a1, a + 60); fr = read_frames(a, b)
        r = chunk(fr, points=pts, labels=lbl) if seed is None else chunk(fr, mask=seed)
        for k, m in r.items(): write_mask(os.path.join(args.out, f"{a - a0 + k:05d}.png"), m, size); n += 1
        seed, a = r[len(fr) - 1], b
        print(f"\r{a - a0}/{a1 - a0} frames", end="")
    print(f"\nmasks → {args.out} ({n} frames)")


def check_video(args, fps):
    """the clip with the subject tinted in the accent, so you can see exactly what was separated"""
    out = os.path.join(args.out, "separated.mp4")
    dur = (args.end - args.start) if args.end else None
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", str(args.start), "-i", args.video, "-framerate", str(fps), "-i", os.path.join(args.out, "%05d.png")] + (["-t", f"{dur:.3f}"] if dur else []) + [
        "-filter_complex", "[1:v]alphaextract,format=gray,scale=iw:ih[m];[0:v][m]scale2ref[v][mm];[mm]format=gray,lutrgb=r=val*0.35:g=val*0.08:b=val*0.06[tint];[v][tint]blend=all_mode=addition[o]", "-map", "[o]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-shortest", out]
    r = subprocess.run(cmd, capture_output=True, text=True)
    print("check →", out if r.returncode == 0 else "(could not build the check video: " + r.stderr.strip()[-160:] + ")")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video"); ap.add_argument("--out", default="work/masks"); ap.add_argument("--preview")
    ap.add_argument("--start", type=float, default=0.0); ap.add_argument("--end", type=float, default=None)
    ap.add_argument("--points", nargs="*", default=["480,270"]); ap.add_argument("--labels", nargs="*", default=["1"])
    ap.add_argument("--chroma", help="key colour for green/blue screen, e.g. 0x00FF00 (skips the model)")
    ap.add_argument("--similarity", type=float, default=0.18); ap.add_argument("--blend", type=float, default=0.06)
    a = ap.parse_args(); fps = fps_of(a.video)
    if a.chroma: chroma(a, fps)
    else: sam(a, fps)
    if not a.preview: check_video(a, fps)


if __name__ == "__main__":
    main()
