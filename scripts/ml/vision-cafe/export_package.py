#!/usr/bin/env python3
"""Package the trained checkpoint for survival without the RTX 3090.

- Copies the best .pt checkpoint to a stable name.
- Tries an ONNX export (best-effort, non-fatal if it fails).
- Verifies CPU-only load + single-image inference actually works (forces device='cpu',
  does NOT touch torch.cuda at all) -- this is the check the task calls non-negotiable:
  "si solo corre en la 3090, no sirve."
"""
import argparse
import json
import os
import shutil
import time

import torch
from torchvision.models import efficientnet_b0

OUT_DIR = "/home/kortux/qlora-out/vision-cafe"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ckpt", required=True)
    args = ap.parse_args()

    stable_pt = os.path.join(OUT_DIR, "model.pt")
    shutil.copy2(args.ckpt, stable_pt)
    print(f"copied {args.ckpt} -> {stable_pt}")

    # ---- CPU-only load + inference check (no CUDA calls at all) ----
    t0 = time.time()
    ckpt = torch.load(stable_pt, map_location="cpu", weights_only=False)
    classes = ckpt["classes"]
    img_size = ckpt.get("img_size", 224)
    model = efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = torch.nn.Linear(in_features, len(classes))
    model.load_state_dict(ckpt["model_state"])
    model.eval()
    load_time = time.time() - t0

    dummy = torch.randn(1, 3, img_size, img_size)
    t1 = time.time()
    with torch.no_grad():
        out = model(dummy)
    infer_time = time.time() - t1
    assert out.shape == (1, len(classes)), f"unexpected output shape {out.shape}"
    print(f"CPU-ONLY CHECK OK: load={load_time:.2f}s single-image-inference={infer_time*1000:.1f}ms "
          f"output_shape={tuple(out.shape)} classes={classes}")

    cpu_check = {
        "cpu_only_load_ok": True, "load_time_s": round(load_time, 3),
        "cpu_single_inference_ms": round(infer_time * 1000, 2),
        "torch_version": torch.__version__, "classes": classes, "img_size": img_size,
        "note": "Loaded and ran with map_location='cpu' and no CUDA calls anywhere in the "
                "path -- confirms the artifact survives without the RTX 3090 / works on the "
                "Quadro M6000 (sm_52) which torch 2.11 cannot even JIT CUDA kernels for.",
    }
    with open(os.path.join(OUT_DIR, "cpu_only_check.json"), "w") as f:
        json.dump(cpu_check, f, indent=2)

    # ---- Best-effort ONNX export ----
    onnx_path = os.path.join(OUT_DIR, "model.onnx")
    try:
        torch.onnx.export(
            model, dummy, onnx_path,
            input_names=["input"], output_names=["logits"],
            dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
            opset_version=17,
            dynamo=False,  # torch>=2.9 defaults to the dynamo exporter, which needs the
                            # optional 'onnxscript' package (not installed in this venv, and
                            # NOT pip-installable here without risking the CUDA torch build --
                            # see the hard rule against bare pip install in this venv). The
                            # legacy TorchScript-based exporter has no such dependency.
        )
        onnx_ok = True
        onnx_size = os.path.getsize(onnx_path)
        print(f"ONNX export OK: {onnx_path} ({onnx_size/1e6:.1f} MB)")
    except Exception as e:
        onnx_ok = False
        onnx_size = 0
        print(f"ONNX export FAILED (non-fatal, .pt is the primary artifact): {e}")

    with open(os.path.join(OUT_DIR, "classes.json"), "w") as f:
        json.dump(classes, f, indent=2, ensure_ascii=False)

    manifest = {
        "model_file": "model.pt", "onnx_file": "model.onnx" if onnx_ok else None,
        "onnx_export_ok": onnx_ok, "onnx_size_bytes": onnx_size,
        "architecture": "efficientnet_b0 (torchvision, ImageNet1K_V1 pretrained backbone)",
        "classes": classes, "img_size": img_size,
        "normalize_mean": [0.485, 0.456, 0.406], "normalize_std": [0.229, 0.224, 0.225],
        "preprocessing": f"Resize({int(img_size*256/224)}) -> CenterCrop({img_size}) -> ToTensor -> Normalize(imagenet)",
        "cpu_only_verified": True,
        "val_macro_f1_at_save": ckpt.get("val_macro_f1"),
        "trained_epoch": ckpt.get("epoch"),
    }
    with open(os.path.join(OUT_DIR, "MANIFEST.json"), "w") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"wrote {OUT_DIR}/MANIFEST.json")


if __name__ == "__main__":
    main()
