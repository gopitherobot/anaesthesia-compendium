# Anaesthesia Compendium

Viva-style oral-exam revision for anaesthesia. One GitHub Pages site, three
linked study modes for every topic:

| Page | File | What it does |
|------|------|--------------|
| **Library** | `index.html` | Searchable grid of all topics (Pharmacology / Physiology). |
| **Listen** | `listen.html?id=NNN` | MP3 player with a **real-time highlighted transcript** that scrolls in sync; click any line to jump. Examiner/Candidate colour-coded. |
| **Watch** | `watch.html?id=NNN` | MP4 lyric-video player with **subtitles** + a clickable synced transcript. |
| **Read** | `read.html?id=NNN` | The full **Q&A** (Examiner question → Candidate answer) as clean text, with find-in-topic and prev/next. |

## How it's hosted (important)

- **This repo (GitHub Pages)** holds only the *lightweight* layer: HTML/CSS/JS,
  the per-topic JSON (`data/`), WebVTT captions (`captions/`) and cover
  thumbnails (`assets/covers/`). ~65 MB even at the full 350 topics.
- **The heavy MP3 + MP4** live in a **Cloudflare R2** public bucket, streamed
  directly by the browser. Set the bucket's public URL once in
  [`config.js`](config.js) (`window.MEDIA_BASE`).

Audio URL  = `MEDIA_BASE/audio/<topic.audio>`
Video URL  = `MEDIA_BASE/video/<topic.video>`

## Adding new topics (toward 350)

1. Drop the new topic's files into the pipeline `work` folder (same naming
   convention: `NNN_Title_Podcast.mp3`, `..._LyricVideo.mp4`, `..._Podcast.vtt`,
   `..._Podcast_Script.md`, `..._turns.json`, `..._Cover_3000.png`).
2. Regenerate the site data:
   ```
   python tools/build_site.py --work "<path to work folder>"
   ```
3. Upload the new media to R2:
   ```
   pip install boto3
   python tools/upload_media.py --work "<path to work folder>" --only NNN
   ```
4. Commit & push. GitHub Pages redeploys automatically.

## Tooling

- `tools/build_site.py` — parses the `work` folder into `data/`, `captions/`,
  `assets/covers/`. Idempotent.
- `tools/upload_media.py` — uploads MP3/MP4 to R2 (S3 API via boto3). Skips
  files already present at the same size.

---
Educational content only — not clinical guidance. Narration is AI-generated.
© Anaesthesia Compendium.
