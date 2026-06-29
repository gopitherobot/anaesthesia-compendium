#!/usr/bin/env python3
"""
upload_media.py  --  push all topic audio/video to the Cloudflare R2 bucket.

Reads data/topics.json, then uploads each topic's MP3 to  audio/<file>.mp3
and MP4 to  video/<file>.mp4  in the bucket, with public-friendly content
types and long cache headers. Skips files already present with the same size.

Credentials (R2 -> S3 API) are read from environment variables:
  R2_ACCOUNT_ID        e.g. a1b2c3...           (used to build the endpoint)
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_BUCKET            e.g. anaesthesia-media
  R2_ENDPOINT          (optional) overrides https://<account>.r2.cloudflarestorage.com

Usage:
  pip install boto3
  python tools/upload_media.py --work "<path to work folder>" [--only 001,002] [--video-only] [--audio-only]
"""
import argparse, json, os, sys
from pathlib import Path

def main():
    ap = argparse.ArgumentParser()
    here = Path(__file__).resolve().parent.parent
    ap.add_argument("--work", required=True)
    ap.add_argument("--repo", default=str(here))
    ap.add_argument("--only", default="", help="comma list of topic ids, e.g. 001,002")
    ap.add_argument("--audio-only", action="store_true")
    ap.add_argument("--video-only", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    try:
        import boto3
        from botocore.config import Config
    except ImportError:
        sys.exit("boto3 not installed.  Run:  pip install boto3")

    acct   = os.environ.get("R2_ACCOUNT_ID", "")
    key    = os.environ.get("R2_ACCESS_KEY_ID")
    secret = os.environ.get("R2_SECRET_ACCESS_KEY")
    bucket = os.environ.get("R2_BUCKET")
    endpoint = os.environ.get("R2_ENDPOINT") or (f"https://{acct}.r2.cloudflarestorage.com" if acct else None)
    if not all([key, secret, bucket, endpoint]):
        sys.exit("Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, "
                 "R2_SECRET_ACCESS_KEY, R2_BUCKET (or R2_ENDPOINT).")

    s3 = boto3.client("s3", endpoint_url=endpoint,
                      aws_access_key_id=key, aws_secret_access_key=secret,
                      config=Config(signature_version="s3v4", region_name="auto"))

    work = Path(args.work)
    topics = json.loads((Path(args.repo) / "data" / "topics.json").read_text(encoding="utf-8"))["topics"]
    only = set(x.strip() for x in args.only.split(",") if x.strip())
    if only:
        topics = [t for t in topics if t["id"] in only]

    def head_size(keyname):
        try:
            return s3.head_object(Bucket=bucket, Key=keyname)["ContentLength"]
        except Exception:
            return None

    def put(local: Path, keyname: str, ctype: str):
        if not local.exists():
            print(f"   MISSING {local.name}"); return
        sz = local.stat().st_size
        if head_size(keyname) == sz:
            print(f"   skip  {keyname} (already {sz//1048576}MB)"); return
        print(f"   up    {keyname}  ({sz//1048576}MB){'  [dry]' if args.dry_run else ''}")
        if args.dry_run:
            return
        s3.upload_file(str(local), bucket, keyname,
                       ExtraArgs={"ContentType": ctype,
                                  "CacheControl": "public, max-age=31536000, immutable"})

    for t in topics:
        print(f"[{t['id']}] {t['title']}")
        if not args.video_only:
            put(work / t["audio"], f"audio/{t['audio']}", "audio/mpeg")
        if not args.audio_only:
            put(work / t["video"], f"video/{t['video']}", "video/mp4")
    print("\nUpload pass complete.")

if __name__ == "__main__":
    main()
