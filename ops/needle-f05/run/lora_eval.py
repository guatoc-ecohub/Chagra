"""Base vs LoRA-tuned evaluation on the 50-example agro corpus, in JAX.

Teacher-forced metrics over the masked (assistant target) tokens only:
  - mean cross-entropy loss
  - next-token argmax accuracy
Base = merged with zero adapter (identity). Tuned = merged with saved adapter.
No quantization / .cact export needed; measures the fp16 model directly.
"""
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
from needle.model.finetune import load_jsonl, merge_lora


def load_adapter(path):
    d = pickle.load(open(path, "rb"))
    lora = {tuple(k.split("/")): {"A": jnp.asarray(v["A"], jnp.float32),
                                  "B": jnp.asarray(v["B"], jnp.float32)}
            for k, v in d["lora"].items()}
    return lora, float(d["scale"])


def metrics(model, params, seqs, masks, batch=8):
    tot_ce, tot_tok, tot_correct = 0.0, 0.0, 0.0
    for s in range(0, len(seqs), batch):
        ids = jnp.asarray(seqs[s:s + batch])
        m = jnp.asarray(masks[s:s + batch])
        logits = model.apply({"params": params}, ids).astype(jnp.float32)
        logits, targets, m = logits[:, :-1], ids[:, 1:], m[:, 1:]
        ce = optax.softmax_cross_entropy_with_integer_labels(logits, targets)
        pred = jnp.argmax(logits, axis=-1)
        correct = (pred == targets).astype(jnp.float32)
        tot_ce += float((ce * m).sum())
        tot_correct += float((correct * m).sum())
        tot_tok += float(m.sum())
    return tot_ce / tot_tok, tot_correct / tot_tok


def main():
    ckpt = sys.argv[1] if len(sys.argv) > 1 else "models/needle2.pkl"
    adapter = sys.argv[2] if len(sys.argv) > 2 else "run/ckpt/needle_lora_fixed.pkl"
    data = sys.argv[3] if len(sys.argv) > 3 else "run/lora-50.jsonl"

    params, config = load_checkpoint(ckpt)
    params = jax.device_put(params)
    tok = get_tokenizer(config.vocab_size)
    seqs, masks = load_jsonl(data, tok, 256)
    from needle.model.architecture import SimpleAttentionNetwork
    model = SimpleAttentionNetwork(config)

    lora, scale = load_adapter(adapter)
    # base = zero adapter (identity); reuse merge with B=0 -> just use base params
    base_ce, base_acc = metrics(model, params, seqs, masks)
    tuned_params = merge_lora(params, lora, scale)
    tuned_ce, tuned_acc = metrics(model, tuned_params, seqs, masks)

    print(f"examples={len(seqs)}  target-token teacher-forced metrics")
    print(f"  BASE :  loss {base_ce:.4f}   next-token acc {base_acc*100:.1f}%")
    print(f"  TUNED:  loss {tuned_ce:.4f}   next-token acc {tuned_acc*100:.1f}%")
    print(f"  delta:  loss {tuned_ce-base_ce:+.4f}   acc {(tuned_acc-base_acc)*100:+.1f} pts")


if __name__ == "__main__":
    main()
