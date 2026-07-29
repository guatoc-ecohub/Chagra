#!/usr/bin/env python3
"""Download all RoCoLe files (Mendeley c5yvn32dzg v2) with metadata manifest."""
import json
import os
import subprocess
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

DATASET_ID = "c5yvn32dzg"
VERSION = 2
OUT_DIR = "/home/kortux/datasets/cafe/raw/rocole"
MANIFEST = "/home/kortux/datasets/cafe/manifests/rocole_files.json"

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)

UA = "Mozilla/5.0 (X11; Linux x86_64) chagra-dataset-fetch/1.0"

def fetch_page(start, end):
    url = f"https://data.mendeley.com/api/datasets/{DATASET_ID}/files?version={VERSION}"
    req = urllib.request.Request(url, headers={"Range": f"items={start}-{end}", "User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        cr = r.headers.get("Content-Range", "")
        data = json.loads(r.read())
        grand_total = None
        if "/" in cr:
            try:
                grand_total = int(cr.rsplit("/", 1)[1])
            except ValueError:
                pass
        return data, grand_total

# First page to learn total count
all_files = []
seen_ids = set()
start = 0
page = 99
grand_total = None
while True:
    end = start + page
    for attempt in range(5):
        try:
            batch, gt = fetch_page(start, end)
            break
        except Exception as e:
            print(f"retry {attempt} for {start}-{end}: {e}", file=sys.stderr)
            time.sleep(2)
    else:
        print(f"FAILED page {start}-{end}, aborting", file=sys.stderr)
        break
    if gt is not None:
        grand_total = gt
    if not batch:
        break
    new = 0
    for item in batch:
        if item["id"] not in seen_ids:
            seen_ids.add(item["id"])
            all_files.append(item)
            new += 1
    print(f"fetched {start}-{end}, total so far {len(all_files)} (grand_total={grand_total})", file=sys.stderr)
    if grand_total is not None and len(all_files) >= grand_total:
        break
    if new == 0:
        print("no new items in this page, stopping (avoid infinite loop)", file=sys.stderr)
        break
    if len(batch) < (end - start + 1):
        break
    start = end + 1
    time.sleep(0.2)

print(f"TOTAL FILES LISTED: {len(all_files)} (server reported grand_total={grand_total})", file=sys.stderr)
with open(MANIFEST, "w") as f:
    json.dump(all_files, f)

# Now download each file (skip if already present with correct size), parallel
def dl_one(entry):
    fn = entry["filename"]
    url = entry["content_details"]["download_url"]
    size = entry["size"]
    dest = os.path.join(OUT_DIR, fn)
    if os.path.exists(dest) and os.path.getsize(dest) == size:
        return (fn, True)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r, open(dest, "wb") as out:
                out.write(r.read())
            if os.path.getsize(dest) == size:
                return (fn, True)
            else:
                time.sleep(1)
        except Exception as e:
            time.sleep(1)
    return (fn, False)

ok, failed = 0, 0
done = 0
with ThreadPoolExecutor(max_workers=10) as ex:
    futs = {ex.submit(dl_one, e): e for e in all_files}
    for fut in as_completed(futs):
        fn, success = fut.result()
        done += 1
        if success:
            ok += 1
        else:
            failed += 1
            print(f"FAILED {fn}", file=sys.stderr)
        if done % 100 == 0 or done == len(all_files):
            print(f"progress {done}/{len(all_files)} ok={ok} failed={failed}", file=sys.stderr)

print(f"DONE. ok={ok} failed={failed} total={len(all_files)}", file=sys.stderr)
