#!/usr/bin/env python3
"""
build_site.py  --  Anaesthesia Compendium site data generator.

Scans the pipeline "work" folder for completed topics and emits the
lightweight data the website needs (everything EXCEPT the heavy mp3/mp4,
which live in the Cloudflare R2 bucket).

For every topic it produces:
  data/topics/NNN.json   - cues (for synced highlight), Q&A pairs, metadata
  captions/NNN.vtt       - WebVTT copy (used by the <video>/<audio> <track>)
  assets/covers/NNN.jpg  - downscaled cover thumbnail
and a master index:
  data/topics.json

Re-run any time you add new topics toward 350 -- it is idempotent.

Usage:
  python tools/build_site.py --work "<path to work folder>"
"""
import argparse, json, os, re, sys, subprocess
from pathlib import Path

ROLE_RE   = re.compile(r'^\*\*(EXAMINER|CANDIDATE):\*\*\s*(.*)$')
TIME_RE   = re.compile(r'(\d{2}):(\d{2}):(\d{2})[.,](\d{3})')
CUE_RE    = re.compile(r'(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})')

SCRIPT_SUFFIX = "_Podcast_Script.md"


def ts_to_sec(ts: str) -> float:
    m = TIME_RE.search(ts)
    h, mn, s, ms = (int(x) for x in m.groups())
    return h * 3600 + mn * 60 + s + ms / 1000.0


def parse_vtt(path: Path):
    """Return list of {start,end,text} cues."""
    cues = []
    if not path.exists():
        return cues
    block = []
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if raw.strip() == "":
            if block:
                cues.append(block); block = []
        else:
            block.append(raw)
    if block:
        cues.append(block)
    out = []
    for b in cues:
        timing_idx = next((i for i, l in enumerate(b) if "-->" in l), None)
        if timing_idx is None:
            continue
        m = CUE_RE.search(b[timing_idx])
        if not m:
            continue
        text = " ".join(l.strip() for l in b[timing_idx + 1:]).strip()
        if not text:
            continue
        out.append({"s": round(ts_to_sec(m.group(1)), 3),
                    "e": round(ts_to_sec(m.group(2)), 3),
                    "t": text})
    return out


def parse_script(path: Path):
    """Return (title, turns) where turns = [{role, text}]."""
    title = None
    turns = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if title is None and line.startswith("# "):
            title = line[2:].strip()
            continue
        m = ROLE_RE.match(line.strip())
        if m:
            turns.append({"role": m.group(1), "text": m.group(2).strip()})
    return title, turns


def pair_qa(turns):
    """Group the linear EXAMINER/CANDIDATE stream into Q&A blocks.
    A block = one or more EXAMINER lines (the question / prompt) followed by
    the CANDIDATE answer(s). Intro/outro examiner-only lines become their own
    blocks with no answer."""
    blocks = []
    i = 0
    n = len(turns)
    while i < n:
        if turns[i]["role"] == "EXAMINER":
            q = []
            while i < n and turns[i]["role"] == "EXAMINER":
                q.append(turns[i]["text"]); i += 1
            a = []
            while i < n and turns[i]["role"] == "CANDIDATE":
                a.append(turns[i]["text"]); i += 1
            blocks.append({"q": " ".join(q), "a": "\n\n".join(a)})
        else:  # stray candidate line
            a = []
            while i < n and turns[i]["role"] == "CANDIDATE":
                a.append(turns[i]["text"]); i += 1
            blocks.append({"q": "", "a": "\n\n".join(a)})
    return blocks


def load_turns(path: Path):
    """Return list of {speaker,start,end} from turns.json, or []."""
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8", errors="replace"))
        return data.get("turns", [])
    except Exception:
        return []


def role_at(turns, t):
    """Speaker active at time t (seconds). Falls back to nearest turn."""
    for tn in turns:
        if tn["start"] <= t < tn["end"]:
            return tn["speaker"]
    # nearest by start
    best, bd = None, 1e9
    for tn in turns:
        d = abs(tn["start"] - t)
        if d < bd:
            bd, best = d, tn["speaker"]
    return best


def media_duration(path: Path):
    """Seconds via ffprobe, or None."""
    if not path.exists():
        return None
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, timeout=60)
        return round(float(out.stdout.strip()), 2)
    except Exception:
        return None


def make_cover(src: Path, dst: Path, size=480):
    from PIL import Image
    with Image.open(src) as im:
        im = im.convert("RGB")
        w, h = im.size
        side = min(w, h)
        im = im.crop(((w - side) // 2, (h - side) // 2,
                      (w - side) // 2 + side, (h - side) // 2 + side))
        im = im.resize((size, size), Image.LANCZOS)
        im.save(dst, "JPEG", quality=82, optimize=True)


def fmt_dur(sec):
    if not sec:
        return ""
    sec = int(sec)
    return f"{sec // 60}:{sec % 60:02d}"


def section_for(num: int) -> str:
    if num <= 35:
        return "Pharmacology"
    if num <= 87:
        return "Physiology"
    return "Physics & Equipment"


def main():
    ap = argparse.ArgumentParser()
    here = Path(__file__).resolve().parent.parent
    ap.add_argument("--work", required=True, help="path to the pipeline work folder")
    ap.add_argument("--out", default=str(here), help="repo root (default: parent of tools/)")
    ap.add_argument("--no-covers", action="store_true", help="skip cover thumbnails")
    ap.add_argument("--no-probe", action="store_true", help="skip ffprobe durations")
    args = ap.parse_args()

    work = Path(args.work)
    out = Path(args.out)
    (out / "data" / "topics").mkdir(parents=True, exist_ok=True)
    (out / "captions").mkdir(parents=True, exist_ok=True)
    (out / "assets" / "covers").mkdir(parents=True, exist_ok=True)

    scripts = sorted(work.glob("*" + SCRIPT_SUFFIX))
    if not scripts:
        print(f"!! no '*{SCRIPT_SUFFIX}' files found in {work}", file=sys.stderr)
        sys.exit(1)

    index = []
    for sp in scripts:
        base = sp.name[:-len(SCRIPT_SUFFIX)]          # 001_Principles…  or  040b_Smooth_Muscle…
        m = re.match(r'^(\d{3})([A-Za-z]?)_(.*)$', base)
        if not m:
            print(f"   skip (bad name): {sp.name}"); continue
        num = int(m.group(1)); suffix = m.group(2).lower(); nid = m.group(1) + suffix

        title, turns = parse_script(sp)
        if not title:
            title = m.group(3).replace("_", " ")
        cues = parse_vtt(work / f"{base}_Podcast.vtt")
        speaker_turns = load_turns(work / f"{base}_turns.json")
        if speaker_turns:
            for c in cues:
                c["r"] = "E" if role_at(speaker_turns, c["s"]) == "EXAMINER" else "C"
        qa = pair_qa(turns)

        audio_file = f"{base}_Podcast.mp3"
        video_file = f"{base}_LyricVideo.mp4"
        dur = None
        if not args.no_probe:
            dur = media_duration(work / audio_file)
        if not dur and cues:
            dur = cues[-1]["e"]

        # caption copy for native track
        vtt_src = work / f"{base}_Podcast.vtt"
        if vtt_src.exists():
            (out / "captions" / f"{nid}.vtt").write_text(
                vtt_src.read_text(encoding="utf-8", errors="replace"), encoding="utf-8")

        # cover thumb
        cover_rel = f"assets/covers/{nid}.jpg"
        if not args.no_covers:
            csrc = work / f"{base}_Cover_3000.png"
            if csrc.exists():
                try:
                    make_cover(csrc, out / "assets" / "covers" / f"{nid}.jpg")
                except Exception as e:
                    print(f"   cover fail {nid}: {e}"); cover_rel = ""
            else:
                cover_rel = ""

        topic = {
            "id": nid, "num": num, "title": title,
            "section": section_for(num),
            "duration": dur, "durationText": fmt_dur(dur),
            "audio": audio_file, "video": video_file,
            "cover": cover_rel,
            "vtt": f"captions/{nid}.vtt",
            "cues": cues, "qa": qa,
            "questionCount": sum(1 for b in qa if b["q"]),
        }
        (out / "data" / "topics" / f"{nid}.json").write_text(
            json.dumps(topic, ensure_ascii=False), encoding="utf-8")

        index.append({"id": nid, "num": num, "suffix": suffix, "title": title,
                      "section": section_for(num),
                      "durationText": fmt_dur(dur),
                      "questionCount": topic["questionCount"],
                      "cover": cover_rel,
                      "audio": audio_file, "video": video_file})
        print(f"  [{nid}] {title}  ({len(cues)} cues, {topic['questionCount']} Q, {fmt_dur(dur)})")

    index.sort(key=lambda t: (t["num"], t.get("suffix", "")))
    (out / "data" / "topics.json").write_text(
        json.dumps({"count": len(index), "topics": index}, ensure_ascii=False, indent=0),
        encoding="utf-8")
    print(f"\nDONE: {len(index)} topics -> {out/'data'/'topics.json'}")


if __name__ == "__main__":
    main()
