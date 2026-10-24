"""Build the publishable library page (artifact/index.html) from docs/library.html.
The artifact host wraps the page in its own <html>/<head>/<body>, so only the inner part is kept,
and paths change from ../ (docs/ inside the repo) to ./ (files published next to the page)."""
import os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, "docs", "library.html"), encoding="utf-8").read()
head = src.split("<!--IS:HEAD-END-->", 1)[1].split("<!--IS:BODY-START-->", 1)
body = head[1].split("<!--IS:BODY-END-->", 1)[0]
body = re.sub(r"^\s*</head>\s*<body>\s*", "", body)
out = head[0].strip() + "\n" + body.strip() + "\n"
out = out.replace('<meta name="is-root" content="../">', '<meta name="is-root" content="./">')
out = out.replace('"three": "../runtime/vendor/', '"three": "./runtime/vendor/').replace('"three/addons/": "../runtime/vendor/addons/"', '"three/addons/": "./runtime/vendor/addons/"')
os.makedirs(os.path.join(ROOT, "artifact"), exist_ok=True)
open(os.path.join(ROOT, "artifact", "index.html"), "w", encoding="utf-8").write(out)
print("artifact/index.html", len(out), "bytes")
