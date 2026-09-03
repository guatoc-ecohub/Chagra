#!/usr/bin/env python3
"""Build unified manifest (BRACOL + RoCoLe) with class mapping + leaf/plant-group split.

Classes (canonical, Spanish, matches Chagra domain):
  sana        - healthy leaf
  roya        - Hemileia vastatrix (BRACOL 'rust', RoCoLe 'unhealthy/E' per paper text)
  minador     - Leucoptera coffeella (BRACOL 'miner')
  cercospora  - Cercospora coffeicola / "ojo de gallo" Brazil convention (BRACOL 'cercospora')
  phoma       - Phoma sp. (BRACOL 'phoma')

Explicitly excluded:
  BRACOL rows with predominant_stress==5 ("mixed"/tie between two diseases): ambiguous
    single-label ground truth, dropped from single-label training. Reported as excluded count.

Mapping decision documented:
  RoCoLe dataset description (Mendeley/paper) states: "1560 robusta coffee leaf images with
  visible mites and spots (denoting coffee leaf rust presence) for infection cases and images
  without such structures for healthy cases." I.e. RoCoLe's binary healthy/unhealthy split is
  RUST-SPECIFIC (roya), not a generic "sick" label. Filenames encode E=unhealthy(enferma/roya),
  H=healthy(sana). This is an assumption inherited from the dataset's own documentation, NOT
  independently re-verified against the raw annotations (RoCoLe's full file listing/severity
  xlsx could not be retrieved -- Mendeley's files API silently caps at 100 items regardless of
  pagination params, see ops/VISION-CAFE-2026-07-15.md for the full account). Only the 100
  images successfully downloaded before this was discovered are used here.

Leaf/plant grouping (anti-contamination):
  RoCoLe filenames encode plant id explicitly: C<n>P<m><E|H><k>.jpg -> group = "roco_C<n>P<m>".
  Multiple images of the same plant/leaf are kept in the SAME split (never split across
  train/val/test) via group-aware assignment.
  BRACOL's dataset.csv exposes only a flat sequential `id` column with NO leaf/plant identifier
  -- there is no way to know from the released metadata whether two ids are photos of the same
  physical leaf. This is a real limitation, stated explicitly: BRACOL split is IMAGE-level, not
  leaf-level. If BRACOL in fact contains repeated photos of the same leaf under different ids,
  the BRACOL portion of the test metric could be optimistic. RoCoLe's portion is leaf-safe.
"""
import csv
import json
import os
import random
import re

random.seed(1337)

BRACOL_CSV = "/home/kortux/datasets/cafe/raw/bracol/extracted/coffee-datasets/coffee-datasets/leaf/dataset.csv"
BRACOL_IMG_DIR = "/home/kortux/datasets/cafe/raw/bracol/extracted/coffee-datasets/coffee-datasets/leaf/images"
ROCOLE_DIR = "/home/kortux/datasets/cafe/raw/rocole"
OUT_DIR = "/home/kortux/datasets/cafe/manifests"
os.makedirs(OUT_DIR, exist_ok=True)

PRED_MAP = {"0": "sana", "1": "minador", "2": "roya", "3": "phoma", "4": "cercospora"}
# "5" = mixed/tie -> excluded

rows = []  # dict: path, cls, group, source

# ---- BRACOL ----
bracol_total = 0
bracol_excluded_mixed = 0
bracol_missing_file = 0
bracol_kept = 0
with open(BRACOL_CSV) as f:
    for r in csv.DictReader(f):
        bracol_total += 1
        ps = r["predominant_stress"]
        if ps == "5":
            bracol_excluded_mixed += 1
            continue
        cls = PRED_MAP.get(ps)
        if cls is None:
            continue
        fn = r["id"] + ".jpg"
        path = os.path.join(BRACOL_IMG_DIR, fn)
        if not os.path.exists(path):
            bracol_missing_file += 1
            continue
        rows.append({
            "path": path,
            "cls": cls,
            "group": f"bracol_{r['id']}",  # no leaf id available -> 1 image = 1 group (documented limitation)
            "source": "bracol",
            "severity": r["severity"],
        })
        bracol_kept += 1

# ---- RoCoLe ----
rocole_total = 0
rocole_kept = 0
rocole_unparsed = 0
pat = re.compile(r"^C(\d+)P(\d+)([EH])(\d+)\.jpg$", re.IGNORECASE)
if os.path.isdir(ROCOLE_DIR):
    for fn in sorted(os.listdir(ROCOLE_DIR)):
        if not fn.lower().endswith(".jpg"):
            continue
        rocole_total += 1
        m = pat.match(fn)
        if not m:
            rocole_unparsed += 1
            continue
        c, p, eh, k = m.groups()
        cls = "roya" if eh.upper() == "E" else "sana"
        rows.append({
            "path": os.path.join(ROCOLE_DIR, fn),
            "cls": cls,
            "group": f"roco_C{c}P{p}",
            "source": "rocole",
            "severity": "",
        })
        rocole_kept += 1

print(f"BRACOL: total_rows={bracol_total} excluded_mixed={bracol_excluded_mixed} "
      f"missing_file={bracol_missing_file} kept={bracol_kept}")
print(f"RoCoLe: total_files={rocole_total} unparsed={rocole_unparsed} kept={rocole_kept}")

# class distribution
from collections import Counter
cls_count = Counter(r["cls"] for r in rows)
print("Class distribution (combined):", dict(cls_count))
src_cls = Counter((r["source"], r["cls"]) for r in rows)
print("By source:", dict(src_cls))

# ---- group-aware split 70/15/15 ----
groups = sorted(set(r["group"] for r in rows))
random.shuffle(groups)
n = len(groups)
n_train = int(n * 0.70)
n_val = int(n * 0.15)
train_groups = set(groups[:n_train])
val_groups = set(groups[n_train:n_train + n_val])
test_groups = set(groups[n_train + n_val:])

for r in rows:
    if r["group"] in train_groups:
        r["split"] = "train"
    elif r["group"] in val_groups:
        r["split"] = "val"
    else:
        r["split"] = "test"

split_count = Counter(r["split"] for r in rows)
print("Split sizes (images):", dict(split_count))
split_cls = Counter((r["split"], r["cls"]) for r in rows)
for s in ["train", "val", "test"]:
    d = {k[1]: v for k, v in split_cls.items() if k[0] == s}
    print(f"  {s}: {d}")

manifest_path = os.path.join(OUT_DIR, "manifest.csv")
with open(manifest_path, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["path", "cls", "group", "source", "severity", "split"])
    w.writeheader()
    for r in rows:
        w.writerow(r)

classes = sorted(cls_count.keys())
with open(os.path.join(OUT_DIR, "classes.json"), "w") as f:
    json.dump(classes, f, indent=2)

summary = {
    "bracol_total_rows": bracol_total,
    "bracol_excluded_mixed": bracol_excluded_mixed,
    "bracol_missing_file": bracol_missing_file,
    "bracol_kept": bracol_kept,
    "rocole_total_files": rocole_total,
    "rocole_unparsed": rocole_unparsed,
    "rocole_kept": rocole_kept,
    "class_distribution": dict(cls_count),
    "by_source_class": {f"{k[0]}|{k[1]}": v for k, v in src_cls.items()},
    "split_sizes": dict(split_count),
    "split_by_class": {f"{k[0]}|{k[1]}": v for k, v in split_cls.items()},
    "n_groups": n, "n_train_groups": len(train_groups), "n_val_groups": len(val_groups),
    "n_test_groups": len(test_groups),
    "classes": classes,
}
with open(os.path.join(OUT_DIR, "prep_summary.json"), "w") as f:
    json.dump(summary, f, indent=2, ensure_ascii=False)

print(f"\nWrote manifest: {manifest_path} ({len(rows)} rows)")
print(f"Wrote summary: {OUT_DIR}/prep_summary.json")
