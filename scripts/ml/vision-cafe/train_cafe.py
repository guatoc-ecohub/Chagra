#!/usr/bin/env python3
"""Fine-tune EfficientNet-B0 (ImageNet pretrained) for coffee leaf disease classification.

Backbone choice (EfficientNet-B0) justification:
  - Dataset is small (~1400 images across 5 classes) -> CNN inductive bias generalizes better
    than a ViT with no extra regularization/data.
  - Must run WITHOUT the RTX 3090 afterwards (CPU or Quadro M6000 sm_52, which torch 2.11 does
    not even carry CUDA kernels for) -> need a cheap-at-inference backbone. EfficientNet-B0 is
    5.3M params / ~20MB, ConvNeXt-Tiny is 28M, ViT-B/16 is 86M. B0 is the only one of the three
    that is comfortably fast on a laptop CPU.
  - Strong precedent in the coffee-leaf-disease literature (BRACOL/RoCoLe papers themselves
    benchmark EfficientNet/MobileNet-class models for this exact task).

Handles the RAM constraint (alpha has 15GB, was near 0 free): DataLoader reads from disk per
batch via PIL, no full-dataset preloading into RAM. num_workers kept modest.
"""
import argparse
import csv
import json
import os
import time
from collections import Counter, defaultdict

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = False  # we want to KNOW if a file is bad, not silently pad it

MANIFEST = "/home/kortux/datasets/cafe/manifests/manifest.csv"
CLASSES_JSON = "/home/kortux/datasets/cafe/manifests/classes.json"
OUT_DIR = "/home/kortux/qlora-out/vision-cafe"
os.makedirs(OUT_DIR, exist_ok=True)

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def load_rows():
    with open(MANIFEST) as f:
        return list(csv.DictReader(f))


class CafeLeafDataset(Dataset):
    """Reads images from disk on __getitem__ (no RAM preload). Skips unreadable files by
    remapping to a random valid index + logging -- keeps training alive on a partially
    corrupted archive (BRACOL zip was truncated on disk, see prep_manifest.py docstring)."""

    def __init__(self, rows, classes, transform):
        self.rows = rows
        self.cls_to_idx = {c: i for i, c in enumerate(classes)}
        self.transform = transform
        self.bad_files = set()

    def __len__(self):
        return len(self.rows)

    def _load(self, idx):
        r = self.rows[idx]
        img = Image.open(r["path"]).convert("RGB")
        img = self.transform(img)
        label = self.cls_to_idx[r["cls"]]
        return img, label

    def __getitem__(self, idx):
        try:
            return self._load(idx)
        except Exception as e:
            if self.rows[idx]["path"] not in self.bad_files:
                self.bad_files.add(self.rows[idx]["path"])
                print(f"[WARN] unreadable image, skipping: {self.rows[idx]['path']} ({e})")
            # deterministic fallback: next index (wrap around), avoids infinite recursion storms
            return self._load((idx + 1) % len(self.rows))


def _downupsample(img, lo=64, hi=160):
    """Simulate a cheap-phone / heavily-compressed photo: downsample hard then upsample back,
    introducing blur+aliasing that JPEG-quality/low-megapixel field photos actually have.
    Chagra's real plaga-images are 540-720px and a few KB (visibly more compressed than the
    2048x1024 BRACOL/RoCoLe source photos) -- run1 was never trained on that degradation."""
    import random as _r
    w, h = img.size
    s = _r.randint(lo, hi)
    small = img.resize((s, s), Image.BILINEAR)
    return small.resize((w, h), Image.BILINEAR)


def build_transforms(img_size=224, strong=False):
    train_ops = [
        # strong=True: wider crop range so the model learns from PARTIAL leaf views (a hand
        # holding the leaf, or the leaf off-center against a busy background, both push the
        # leaf itself into a fraction of the frame -- run1's crops rarely went below 0.6 of
        # the frame, but BRACOL/RoCoLe photos are already leaf-filling-frame, so run1 never
        # saw a "leaf occupies 30% of frame" example).
        transforms.RandomResizedCrop(img_size, scale=(0.3, 1.0) if strong else (0.6, 1.0), ratio=(0.7, 1.4)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.15),
        transforms.RandomRotation(35 if strong else 30),
        transforms.RandomAffine(degrees=0, translate=(0.15, 0.15) if strong else (0, 0)),  # off-center leaf
        transforms.RandomPerspective(distortion_scale=0.4 if strong else 0.35, p=0.45),  # "ángulos raros"
        transforms.ColorJitter(brightness=0.6 if strong else 0.5, contrast=0.5 if strong else 0.4,
                                saturation=0.5 if strong else 0.4, hue=0.08 if strong else 0.06),  # "mala luz"
        transforms.RandomApply([transforms.GaussianBlur(kernel_size=5, sigma=(0.3, 2.5))], p=0.35),  # "desenfoque"
        transforms.RandomAdjustSharpness(sharpness_factor=0.3, p=0.2),
    ]
    if strong:
        train_ops.append(transforms.RandomApply(
            [transforms.Lambda(lambda im: _downupsample(im))], p=0.4))  # "celular barato"
        train_ops.append(transforms.RandomGrayscale(p=0.05))
    train_ops += [
        transforms.ToTensor(),
        transforms.RandomErasing(p=0.5 if strong else 0.3,
                                  scale=(0.02, 0.35) if strong else (0.02, 0.15),
                                  ratio=(0.3, 3.3)),  # "oclusión parcial" (mano, otra hoja)
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ]
    train_tf = transforms.Compose(train_ops)
    eval_tf = transforms.Compose([
        transforms.Resize(int(img_size * 256 / 224)),
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])
    return train_tf, eval_tf


def macro_prf1(y_true, y_pred, num_classes):
    tp = [0] * num_classes
    fp = [0] * num_classes
    fn = [0] * num_classes
    for t, p in zip(y_true, y_pred):
        if t == p:
            tp[t] += 1
        else:
            fp[p] += 1
            fn[t] += 1
    precisions, recalls, f1s = [], [], []
    for c in range(num_classes):
        prec = tp[c] / (tp[c] + fp[c]) if (tp[c] + fp[c]) > 0 else 0.0
        rec = tp[c] / (tp[c] + fn[c]) if (tp[c] + fn[c]) > 0 else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0.0
        precisions.append(prec)
        recalls.append(rec)
        f1s.append(f1)
    return precisions, recalls, f1s, sum(f1s) / num_classes


def confusion_matrix(y_true, y_pred, num_classes):
    cm = [[0] * num_classes for _ in range(num_classes)]
    for t, p in zip(y_true, y_pred):
        cm[t][p] += 1
    return cm


def evaluate(model, loader, device, num_classes):
    model.eval()
    y_true, y_pred = [], []
    with torch.no_grad():
        for x, y in loader:
            x = x.to(device, non_blocking=True)
            logits = model(x)
            pred = logits.argmax(1).cpu().tolist()
            y_pred.extend(pred)
            y_true.extend(y.tolist())
    precisions, recalls, f1s, macro_f1 = macro_prf1(y_true, y_pred, num_classes)
    acc = sum(int(t == p) for t, p in zip(y_true, y_pred)) / max(1, len(y_true))
    cm = confusion_matrix(y_true, y_pred, num_classes)
    return {"acc": acc, "macro_f1": macro_f1, "precisions": precisions, "recalls": recalls,
            "f1s": f1s, "cm": cm, "n": len(y_true)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--batch-size", type=int, default=32)
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--img-size", type=int, default=224)
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--tag", type=str, default="run1")
    ap.add_argument("--strong-aug", action="store_true",
                     help="wider crop/translate/erasing + downsample-upsample, targets the "
                          "leaf-fills-frame / plain-background bias of BRACOL+RoCoLe photos")
    args = ap.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"device={device} epochs={args.epochs} batch_size={args.batch_size} tag={args.tag}", flush=True)

    classes = json.load(open(CLASSES_JSON))
    num_classes = len(classes)
    print("classes:", classes, flush=True)

    rows = load_rows()
    by_split = defaultdict(list)
    for r in rows:
        by_split[r["split"]].append(r)
    print({k: len(v) for k, v in by_split.items()}, flush=True)

    train_tf, eval_tf = build_transforms(args.img_size, strong=args.strong_aug)
    train_ds = CafeLeafDataset(by_split["train"], classes, train_tf)
    val_ds = CafeLeafDataset(by_split["val"], classes, eval_tf)
    test_ds = CafeLeafDataset(by_split["test"], classes, eval_tf)

    # class-imbalance handling: weighted CE loss (inverse frequency)
    cls_counts = Counter(r["cls"] for r in by_split["train"])
    weights = torch.tensor([1.0 / cls_counts[c] for c in classes], dtype=torch.float32)
    weights = weights / weights.sum() * num_classes
    print("class weights:", dict(zip(classes, weights.tolist())), flush=True)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True,
                               num_workers=args.workers, pin_memory=(device == "cuda"),
                               drop_last=True, persistent_workers=(args.workers > 0))
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False,
                             num_workers=args.workers, pin_memory=(device == "cuda"),
                             persistent_workers=(args.workers > 0))
    test_loader = DataLoader(test_ds, batch_size=args.batch_size, shuffle=False,
                              num_workers=args.workers, pin_memory=(device == "cuda"),
                              persistent_workers=(args.workers > 0))

    weights_enum = EfficientNet_B0_Weights.IMAGENET1K_V1
    model = efficientnet_b0(weights=weights_enum)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss(weight=weights.to(device))
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    scaler = torch.amp.GradScaler("cuda", enabled=(device == "cuda"))

    best_val_f1 = -1.0
    history = []
    ckpt_path = os.path.join(OUT_DIR, f"efficientnet_b0_cafe_{args.tag}_best.pt")
    log_path = os.path.join(OUT_DIR, f"train_log_{args.tag}.json")

    t0 = time.time()
    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss, n_seen = 0.0, 0
        ep_t0 = time.time()
        for x, y in train_loader:
            x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda", enabled=(device == "cuda")):
                logits = model(x)
                loss = criterion(logits, y)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            running_loss += loss.item() * x.size(0)
            n_seen += x.size(0)
        scheduler.step()

        val_metrics = evaluate(model, val_loader, device, num_classes)
        ep_time = time.time() - ep_t0
        train_loss = running_loss / max(1, n_seen)
        print(f"epoch {epoch}/{args.epochs} loss={train_loss:.4f} val_acc={val_metrics['acc']:.3f} "
              f"val_macroF1={val_metrics['macro_f1']:.3f} time={ep_time:.1f}s", flush=True)
        history.append({"epoch": epoch, "train_loss": train_loss, "val_acc": val_metrics["acc"],
                         "val_macro_f1": val_metrics["macro_f1"], "val_f1_per_class":
                         dict(zip(classes, val_metrics["f1s"])), "epoch_time_s": ep_time})

        if val_metrics["macro_f1"] > best_val_f1:
            best_val_f1 = val_metrics["macro_f1"]
            torch.save({"model_state": model.state_dict(), "classes": classes,
                        "epoch": epoch, "val_macro_f1": best_val_f1,
                        "img_size": args.img_size}, ckpt_path)
            print(f"  -> new best (val_macro_f1={best_val_f1:.3f}), saved {ckpt_path}", flush=True)

        with open(log_path, "w") as f:
            json.dump({"history": history, "classes": classes, "best_val_f1": best_val_f1}, f, indent=2)

    total_time = time.time() - t0
    print(f"training done in {total_time:.1f}s. best_val_macro_f1={best_val_f1:.3f}", flush=True)

    # final test evaluation using BEST checkpoint (not last epoch)
    best = torch.load(ckpt_path, map_location=device, weights_only=False)
    model.load_state_dict(best["model_state"])
    test_metrics = evaluate(model, test_loader, device, num_classes)
    print("TEST metrics (leaf-group-safe test split):", flush=True)
    print(f"  acc={test_metrics['acc']:.3f} macro_f1={test_metrics['macro_f1']:.3f} n={test_metrics['n']}", flush=True)
    for c, p, r, f1 in zip(classes, test_metrics["precisions"], test_metrics["recalls"], test_metrics["f1s"]):
        print(f"  {c}: precision={p:.3f} recall={r:.3f} f1={f1:.3f}", flush=True)
    print("confusion matrix (rows=true, cols=pred), classes order:", classes, flush=True)
    for row in test_metrics["cm"]:
        print("  ", row, flush=True)

    result = {
        "tag": args.tag, "classes": classes, "best_val_macro_f1": best_val_f1,
        "test_acc": test_metrics["acc"], "test_macro_f1": test_metrics["macro_f1"],
        "test_precisions": dict(zip(classes, test_metrics["precisions"])),
        "test_recalls": dict(zip(classes, test_metrics["recalls"])),
        "test_f1s": dict(zip(classes, test_metrics["f1s"])),
        "confusion_matrix": test_metrics["cm"], "confusion_matrix_classes": classes,
        "test_n": test_metrics["n"], "total_train_time_s": total_time,
        "train_bad_files": sorted(train_ds.bad_files), "epochs_run": args.epochs,
    }
    with open(os.path.join(OUT_DIR, f"test_results_{args.tag}.json"), "w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print("wrote", os.path.join(OUT_DIR, f"test_results_{args.tag}.json"), flush=True)


if __name__ == "__main__":
    main()
