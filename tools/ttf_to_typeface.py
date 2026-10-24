"""Convert a static TrueType font to a three.js typeface JSON (FontLoader format).
Usage: python3 ttf_to_typeface.py in.ttf out.json
Only Latin glyphs used by Ink & Signal titles are exported (ASCII + a few symbols)."""
import sys, json
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

CHARS = [chr(c) for c in range(32, 127)] + list("·×—–’‘“”°•…éÉáÁñÑüÜ₹€£")

class TypefacePen(BasePen):
    def __init__(self, glyphSet):
        super().__init__(glyphSet); self.cmds = []
    def _moveTo(self, p): self.cmds += ["m", r(p[0]), r(p[1])]
    def _lineTo(self, p): self.cmds += ["l", r(p[0]), r(p[1])]
    def _qCurveToOne(self, c, p): self.cmds += ["q", r(p[0]), r(p[1]), r(c[0]), r(c[1])]
    def _curveToOne(self, c1, c2, p): self.cmds += ["b", r(p[0]), r(p[1]), r(c1[0]), r(c1[1]), r(c2[0]), r(c2[1])]
    def _closePath(self): pass

def r(v):
    v = round(v, 1)
    return str(int(v)) if v == int(v) else str(v)

def main(src, dst):
    f = TTFont(src); gs = f.getGlyphSet(); cmap = f.getBestCmap(); hmtx = f["hmtx"]
    upm = f["head"].unitsPerEm; glyphs = {}
    for ch in CHARS:
        gn = cmap.get(ord(ch))
        if not gn: continue
        pen = TypefacePen(gs); gs[gn].draw(pen)
        adv = hmtx[gn][0]
        g = f["glyf"][gn] if "glyf" in f else None
        xmin = getattr(g, "xMin", 0) if g is not None and hasattr(g, "xMin") else 0
        xmax = getattr(g, "xMax", adv) if g is not None and hasattr(g, "xMax") else adv
        glyphs[ch] = {"ha": adv, "x_min": xmin, "x_max": xmax, "o": " ".join(pen.cmds)}
    head = f["head"]; hhea = f["hhea"]; post = f["post"]; name = f["name"]
    out = {"glyphs": glyphs, "familyName": name.getDebugName(1), "ascender": hhea.ascent,
           "descender": hhea.descent, "underlinePosition": post.underlinePosition,
           "underlineThickness": post.underlineThickness,
           "boundingBox": {"yMin": head.yMin, "xMin": head.xMin, "yMax": head.yMax, "xMax": head.xMax},
           "resolution": upm, "original_font_information": {"format": 0, "fontFamily": name.getDebugName(1), "license": "SIL Open Font License 1.1"},
           "cssFontWeight": "normal", "cssFontStyle": "normal"}
    json.dump(out, open(dst, "w"), separators=(",", ":"))
    print("glyphs:", len(glyphs), "upm:", upm)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
