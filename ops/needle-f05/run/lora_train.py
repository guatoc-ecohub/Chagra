"""Needle 2 LoRA trainer: instrumented repro of the F0 `nan` + fp32 stabilised fix.

Reuses the official needle training primitives (load_checkpoint, tokenizer,
load_jsonl, lora_target_paths, merge_lora, SimpleAttentionNetwork). The only
things this driver changes vs the stock `needle finetune` path are the LoRA
parameter precision, gradient clipping and the loss dtype -- exactly the knobs
under test. No cloud calls, no data generation (OPENROUTER never touched).
"""
import argparse
import os
import pickle
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/needle-src")

import jax
import jax.numpy as jnp
import optax
from flax.traverse_util import flatten_dict

from needle.model.run import load_checkpoint
from needle.model.tokenizer import get_tokenizer
from needle.model.finetune import (
    load_jsonl, lora_target_paths, merge_lora, LORA_TARGETS,
)
from needle.model.architecture import SimpleAttentionNetwork


def init_lora(params, paths, rank, key, dtype):
    """Same shapes as stock init_lora, but the adapter dtype is a knob.

    stock  -> dtype = weight.dtype  (float16)  == the F0 configuration
    fixed  -> dtype = float32
    """
    flat = flatten_dict(params)
    lora = {}
    for path in paths:
        weight = flat[path]
        in_dim, out_dim = weight.shape[-2], weight.shape[-1]
        lead = weight.shape[:-2]
        key, sub = jax.random.split(key)
        lora[path] = {
            "A": (jax.random.normal(sub, lead + (in_dim, rank), jnp.float32) / rank).astype(dtype),
            "B": jnp.zeros(lead + (rank, out_dim), dtype),
        }
    return lora


def finite_report(tree, label):
    flat = flatten_dict(tree)
    bad = []
    for path, v in flat.items():
        v = np.asarray(v, dtype=np.float32)
        n = int((~np.isfinite(v)).sum())
        if n:
            mx = np.nanmax(np.abs(np.where(np.isfinite(v), v, np.nan))) if np.isfinite(v).any() else float("nan")
            bad.append(("/".join(str(p) for p in path), n, v.size, mx))
    if bad:
        print(f"    [{label}] NON-FINITE tensors:")
        for name, n, sz, mx in bad[:8]:
            print(f"      {name}: {n}/{sz} non-finite, max|finite|={mx:.3e}")
    return len(bad)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["stock", "fixed"], required=True)
    ap.add_argument("--data", default="run/lora-50.jsonl")
    ap.add_argument("--checkpoint", default="models/needle2.pkl")
    ap.add_argument("--epochs", type=int, default=8)
    ap.add_argument("--batch-size", type=int, default=16)
    ap.add_argument("--lr", type=float, default=1e-4)
    ap.add_argument("--lora-rank", type=int, default=16)
    ap.add_argument("--lora-alpha", type=float, default=32.0)
    ap.add_argument("--max-len", type=int, default=256)
    ap.add_argument("--clip", type=float, default=0.0, help="global-norm grad clip (0=off)")
    ap.add_argument("--fp32-loss", action="store_true", help="cast logits to fp32 before CE")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    print(f"=== mode={args.mode} lr={args.lr} rank={args.lora_rank} alpha={args.lora_alpha} "
          f"clip={args.clip} fp32_loss={args.fp32_loss} ===", flush=True)

    params, config = load_checkpoint(args.checkpoint)
    params = jax.device_put(params)
    tokenizer = get_tokenizer(config.vocab_size)
    seqs, masks = load_jsonl(args.data, tokenizer, args.max_len)
    print(f"loaded {len(seqs)} examples, seq_len {args.max_len}, LoRA targets {LORA_TARGETS}", flush=True)

    model = SimpleAttentionNetwork(config)
    paths = lora_target_paths(params)
    scale = args.lora_alpha / args.lora_rank
    lora_dtype = jnp.float32 if args.mode == "fixed" else jnp.float16
    lora = init_lora(params, paths, args.lora_rank, jax.random.PRNGKey(0), lora_dtype)
    print(f"LoRA on {len(paths)} weight groups, adapter dtype={lora_dtype.__name__}, scale={scale}", flush=True)

    if args.clip and args.clip > 0:
        optimizer = optax.chain(optax.clip_by_global_norm(args.clip), optax.adamw(args.lr))
    else:
        optimizer = optax.adamw(args.lr)
    opt_state = optimizer.init(lora)

    def loss_fn(lora, ids, mask):
        logits = model.apply({"params": merge_lora(params, lora, scale)}, ids)
        if args.fp32_loss:
            logits = logits.astype(jnp.float32)
        logits, targets, mask = logits[:, :-1], ids[:, 1:], mask[:, 1:]
        ce = optax.softmax_cross_entropy_with_integer_labels(logits, targets)
        return (ce * mask).sum() / jnp.maximum(mask.sum(), 1.0)

    @jax.jit
    def train_step(lora, opt_state, ids, mask):
        loss, grads = jax.value_and_grad(loss_fn)(lora, ids, mask)
        gnorm = optax.global_norm(grads)
        updates, opt_state = optimizer.update(grads, opt_state, lora)
        new_lora = optax.apply_updates(lora, updates)
        return new_lora, opt_state, loss, gnorm, grads

    count = len(seqs)
    batch = args.batch_size
    total_steps = args.epochs * (-(-count // batch))
    step_i = 0
    first_nan_reported = False
    for epoch in range(args.epochs):
        order = np.random.RandomState(epoch).permutation(count)
        for start in range(0, count, batch):
            idx = order[start:start + batch]
            prev_lora = lora
            lora, opt_state, loss, gnorm, grads = train_step(
                lora, opt_state, jnp.asarray(seqs[idx]), jnp.asarray(masks[idx]))
            step_i += 1
            lval, gval = float(loss), float(gnorm)
            print(f"step {step_i}/{total_steps}  loss {lval:.4f}  grad_norm {gval:.4e}", flush=True)
            if (not np.isfinite(lval) or not np.isfinite(gval)) and not first_nan_reported:
                first_nan_reported = True
                print(f"  >>> FIRST NON-FINITE at step {step_i} (loss={lval}, grad_norm={gval})", flush=True)
                print("  --- grads finiteness ---")
                finite_report(grads, "grads")
                print("  --- NEW lora params finiteness ---")
                finite_report(lora, "lora")
                print("  --- PREV lora params finiteness (input to this step) ---")
                finite_report(prev_lora, "prev_lora")

    nbad = finite_report(lora, "final-lora")
    status = "DIVERGED (nan/inf)" if nbad else "STABLE (all finite)"
    print(f"=== RESULT mode={args.mode}: {status} ===", flush=True)

    if args.out:
        os.makedirs(os.path.dirname(args.out), exist_ok=True)
        with open(args.out, "wb") as h:
            pickle.dump({
                "lora": {"/".join(str(x) for x in p): {"A": np.asarray(v["A"]), "B": np.asarray(v["B"])}
                         for p, v in lora.items()},
                "scale": float(scale), "base": args.checkpoint, "rank": args.lora_rank,
            }, h)
        print(f"saved adapter -> {args.out}", flush=True)


if __name__ == "__main__":
    main()
