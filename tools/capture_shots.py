"""Capture showcase screenshots of each mode page for the home page."""
from playwright.sync_api import sync_playwright
from PIL import Image
from pathlib import Path

BASE = "http://localhost:8799"
OUT = Path(__file__).resolve().parent.parent / "assets" / "shots"
OUT.mkdir(parents=True, exist_ok=True)

# (url, name, mode-specific tweak)
SHOTS = [
    ("read.html?id=001",   "read",    None),
    ("listen.html?id=001", "listen",  "listen"),
    ("watch.html?id=007",  "watch",   "watch"),
    ("library.html",       "library", None),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 820}, device_scale_factor=2)
    for url, name, mode in SHOTS:
        page.goto(f"{BASE}/{url}", wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(1400)
        if mode == "listen":
            # show the live-highlight feature on a sentence near the top
            page.evaluate("""() => {
                const segs = document.querySelectorAll('.seg');
                const i = Math.min(8, segs.length - 1);
                if (segs[i]) { segs[i].classList.add('active');
                    const b = document.getElementById('transcript');
                    const br = segs[i].getBoundingClientRect(), cr = b.getBoundingClientRect();
                    b.scrollTop += (br.top - cr.top) - b.clientHeight/2 + br.height/2; }
            }""")
            page.wait_for_timeout(400)
        if mode == "watch":
            page.wait_for_timeout(1000)  # let poster/first frame settle
        png = OUT / f"{name}.png"
        page.screenshot(path=str(png))
        # downscale to ~1180px wide JPEG to keep the repo light
        with Image.open(png) as im:
            w, h = im.size
            tw = 1180
            im = im.convert("RGB").resize((tw, round(h * tw / w)), Image.LANCZOS)
            im.save(OUT / f"{name}.jpg", "JPEG", quality=86, optimize=True)
        png.unlink()
        print(f"captured {name}.jpg")
    browser.close()
print("done")
