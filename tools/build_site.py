#!/usr/bin/env python3
"""
Build the static site's data + images from the collected year files.

- Reads year_<YYYY>_v3.json (canonical plant names) for the given years.
- Writes site/data/posts.json (one object per post, sorted by date).
- Collects a local thumbnail for every post it can:
    1. copies from export_v1/images/ and thumbs/ when present;
    2. downloads from the verified CDN URL maps (cdn_batch*_ok.json,
       cdn_batch1.json) and re-encodes to max 800px, JPEG q72.
- Prints a coverage summary. Posts without an image get "image": null
  and the site renders a styled placeholder for them.

Re-run any time: it only fetches images that are still missing.
"""
import json, subprocess, sys
from pathlib import Path
from PIL import Image
import io

import os
REPO = Path(__file__).resolve().parent.parent          # the site root (this repo)
ROOT = Path(os.environ.get("GADI_SRC", REPO.parent))    # collected source data (year_*.json, cdn_*.json)
SITE = REPO
IMG_DIR = SITE / "images"
DATA_DIR = SITE / "data"
IMG_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

YEARS = [2017, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]

posts = []
for y in YEARS:
    posts += json.load(open(ROOT / f"year_{y}_v3.json"))
posts.sort(key=lambda p: p["local_date"])
print(f"posts: {len(posts)}")

# --- gather URL maps (later files win) ---
url_map = {}
for name in ["cdn_batch1.json", "cdn_batch3_ok.json", "cdn_batch4_ok.json", "cdn_batch5_ok.json", "cdn_batch6_ok.json", "cdn_batch7_ok.json", "cdn_batch8_ok.json", "cdn_batch9_ok.json", "cdn_batch10_ok.json", "cdn_batch11_ok.json", "cdn_batch12_ok.json"]:
    f = ROOT / name
    if f.exists():
        url_map.update(json.load(open(f)))
print(f"cdn urls known: {len(url_map)}")

def save_thumb(pid: str, raw: bytes) -> bool:
    try:
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        im.thumbnail((800, 800))
        im.save(IMG_DIR / f"{pid}.jpg", "JPEG", quality=72)
        return True
    except Exception as e:
        print(f"  ! {pid}: {e}")
        return False

have = 0
for p in posts:
    pid = p["fb_post_id"]
    out = IMG_DIR / f"{pid}.jpg"
    if out.exists():
        have += 1
        continue
    # local copies first
    for src in [ROOT / "export_v1" / "images" / f"{pid}.jpg", ROOT / "thumbs" / f"{pid}.jpg"]:
        if src.exists():
            subprocess.run(["cp", str(src), str(out)])
            have += 1
            break
    else:
        url = url_map.get(pid)
        if url:
            r = subprocess.run(["curl", "-s", "--max-time", "30", url], capture_output=True)
            if r.stdout[:3] == b"\xff\xd8\xff" and save_thumb(pid, r.stdout):
                have += 1

out_posts = []
for p in posts:
    pid = p["fb_post_id"]
    d = p["local_date"]
    out_posts.append({
        "id": pid,
        "date": d,
        "month": int(d[5:7]),
        "caption": p.get("caption", ""),
        "plants": p.get("plants", []),
        "url": p.get("post_url", ""),
        "image": f"images/{pid}.jpg" if (IMG_DIR / f"{pid}.jpg").exists() else None,
    })

json.dump(out_posts, open(DATA_DIR / "posts.json", "w"), ensure_ascii=False, indent=1)
print(f"images: {have}/{len(posts)} posts have a local thumbnail")
missing = [p["id"] for p in out_posts if not p["image"]]
print(f"missing image ids ({len(missing)}): {missing[:20]}{'...' if len(missing)>20 else ''}")
