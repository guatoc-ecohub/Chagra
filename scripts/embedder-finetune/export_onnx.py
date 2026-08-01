#!/usr/bin/env python3
"""Exporta el embedder fine-tuneado a ONNX (mean-pooling + L2-normalize
incluidos en el grafo) para poder servirlo sin torch/CUDA. Best-effort:
si algo falla, el HF format (config.json+model.safetensors+tokenizer)
sigue siendo el artefacto principal y ya se verifico que corre en CPU.
"""
import sys
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel

MODEL_DIR = Path.home() / "qlora-out" / "embedder" / "finetuned"
OUT_DIR = Path.home() / "qlora-out" / "embedder" / "onnx"
OUT_DIR.mkdir(parents=True, exist_ok=True)


class E5Embedder(nn.Module):
    def __init__(self, base):
        super().__init__()
        self.base = base

    def forward(self, input_ids, attention_mask):
        out = self.base(input_ids=input_ids, attention_mask=attention_mask)
        last_hidden = out.last_hidden_state
        mask = attention_mask[..., None].bool()
        summed = last_hidden.masked_fill(~mask, 0.0).sum(dim=1)
        counts = attention_mask.sum(dim=1)[..., None].clamp(min=1)
        pooled = summed / counts
        return F.normalize(pooled, p=2, dim=1)


def main():
    tok = AutoTokenizer.from_pretrained(MODEL_DIR)
    base = AutoModel.from_pretrained(MODEL_DIR, dtype=torch.float32)
    base.eval()
    model = E5Embedder(base)
    model.eval()

    sample = tok(["query: papa criolla", "passage: la papa es un tuberculo andino"],
                 padding=True, truncation=True, max_length=64, return_tensors="pt")

    onnx_path = OUT_DIR / "model.onnx"
    torch.onnx.export(
        model,
        (sample["input_ids"], sample["attention_mask"]),
        str(onnx_path),
        input_names=["input_ids", "attention_mask"],
        output_names=["embedding"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "seq"},
            "attention_mask": {0: "batch", 1: "seq"},
            "embedding": {0: "batch"},
        },
        opset_version=17,
        do_constant_folding=True,
        dynamo=False,
    )
    print(f"[onnx] exportado a {onnx_path}", flush=True)

    import onnx
    onnx.checker.check_model(str(onnx_path))
    print("[onnx] checker.check_model OK", flush=True)

    tok.save_pretrained(OUT_DIR)
    print(f"[onnx] tokenizer guardado en {OUT_DIR}", flush=True)

    try:
        import onnxruntime as ort
        import numpy as np
        sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
        feed = {
            "input_ids": sample["input_ids"].numpy().astype("int64"),
            "attention_mask": sample["attention_mask"].numpy().astype("int64"),
        }
        result = sess.run(["embedding"], feed)[0]
        print(f"[onnxruntime] inferencia OK, shape={result.shape}", flush=True)
        with torch.no_grad():
            torch_out = model(sample["input_ids"], sample["attention_mask"]).numpy()
        diff = abs(result - torch_out).max()
        print(f"[onnxruntime] max abs diff vs torch = {diff:.6f}", flush=True)
    except ImportError:
        print("[onnxruntime] no instalado -- se omite verificacion de inferencia end-to-end", flush=True)
    except Exception as e:
        print(f"[onnxruntime] fallo verificacion: {e}", flush=True)


if __name__ == "__main__":
    main()
