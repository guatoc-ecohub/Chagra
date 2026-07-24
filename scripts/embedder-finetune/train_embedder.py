#!/usr/bin/env python3
"""
Fine-tune contrastivo de intfloat/multilingual-e5-large sobre pares
(query regional/nombre-comun -> especie) del grafo AGE de Chagra,
con negativos duros por genero/familia botanica.

InfoNCE manual (equivalente a MultipleNegativesRankingLoss) porque NO
instalamos sentence-transformers en el venv qlora-dpo (riesgo de clobbear
el torch CUDA -- ver CLAUDE.md). Solo transformers + torch puro.
"""
import argparse, json, random, time, sys
from pathlib import Path

import torch
import torch.nn.functional as F

sys.path.insert(0, str(Path(__file__).parent))
from e5_common import load_model, encode_texts

BASE = Path.home() / "embedder-ft"


def load_jsonl(p):
    out = []
    with open(p, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-model", default="intfloat/multilingual-e5-large")
    ap.add_argument("--epochs", type=int, default=4)
    ap.add_argument("--batch-size", type=int, default=16)
    ap.add_argument("--neg-k", type=int, default=2)
    ap.add_argument("--lr", type=float, default=2e-5)
    ap.add_argument("--max-length-doc", type=int, default=128)
    ap.add_argument("--max-length-query", type=int, default=32)
    ap.add_argument("--out-dir", default=str(Path.home() / "qlora-out" / "embedder" / "finetuned"))
    ap.add_argument("--scale", type=float, default=20.0)
    ap.add_argument("--seed", type=int, default=1337)
    args = ap.parse_args()

    random.seed(args.seed)
    torch.manual_seed(args.seed)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[env] device={device} torch={torch.__version__}", flush=True)
    if device == "cuda":
        print(f"[env] gpu={torch.cuda.get_device_name(0)}", flush=True)

    pairs = load_jsonl(BASE / "pairs_train.jsonl")
    corpus_rows = load_jsonl(BASE / "corpus.jsonl")
    corpus = {r["species_id"]: r["text"] for r in corpus_rows}
    genus = json.loads((BASE / "genus.json").read_text(encoding="utf-8"))
    family = json.loads((BASE / "family.json").read_text(encoding="utf-8"))

    all_species = list(corpus.keys())

    genus_to_species = {}
    for sid, g in genus.items():
        if not g:
            continue
        genus_to_species.setdefault(g, []).append(sid)
    family_to_species = {}
    for sid, fam in family.items():
        family_to_species.setdefault(fam, []).append(sid)

    rng = random.Random(args.seed)

    def sample_hard_negs(sid, k):
        chosen = []
        g = genus.get(sid, "")
        cand = [s for s in genus_to_species.get(g, []) if s != sid] if g else []
        rng.shuffle(cand)
        chosen.extend(cand[:k])
        if len(chosen) < k:
            fam = family.get(sid, "")
            cand2 = [s for s in family_to_species.get(fam, []) if s != sid and s not in chosen] if fam else []
            rng.shuffle(cand2)
            chosen.extend(cand2[: (k - len(chosen))])
        while len(chosen) < k:
            s = rng.choice(all_species)
            if s != sid and s not in chosen:
                chosen.append(s)
        return chosen[:k]

    print(f"[data] {len(pairs)} pares de train, {len(corpus)} docs en corpus, {len(genus_to_species)} generos, {len(family_to_species)} familias", flush=True)

    tok, model = load_model(args.base_model, device=device, dtype=torch.bfloat16)
    model.train()

    optim = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)
    steps_per_epoch = (len(pairs) + args.batch_size - 1) // args.batch_size
    total_steps = steps_per_epoch * args.epochs
    warmup_steps = max(1, int(0.1 * total_steps))

    def lr_lambda(step):
        if step < warmup_steps:
            return step / warmup_steps
        prog = (step - warmup_steps) / max(1, total_steps - warmup_steps)
        return max(0.05, 1.0 - prog)

    sched = torch.optim.lr_scheduler.LambdaLR(optim, lr_lambda)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    global_step = 0
    t0 = time.time()
    for epoch in range(args.epochs):
        rng.shuffle(pairs)
        epoch_loss = 0.0
        n_batches = 0
        for i in range(0, len(pairs), args.batch_size):
            batch = pairs[i:i + args.batch_size]
            B = len(batch)
            queries = [p["query"] for p in batch]
            pos_sids = [p["species_id"] for p in batch]

            doc_sids_flat = []
            for sid in pos_sids:
                doc_sids_flat.append(sid)
                doc_sids_flat.extend(sample_hard_negs(sid, args.neg_k))
            doc_texts_flat = [corpus.get(sid, "") for sid in doc_sids_flat]

            q_emb = encode_texts(queries, tok, model, device, "query: ",
                                  max_length=args.max_length_query, batch_size=len(queries), grad=True)
            d_emb = encode_texts(doc_texts_flat, tok, model, device, "passage: ",
                                  max_length=args.max_length_doc, batch_size=len(doc_texts_flat), grad=True)

            sim = q_emb @ d_emb.t() * args.scale
            labels = torch.tensor([j * (1 + args.neg_k) for j in range(B)], device=device, dtype=torch.long)
            loss = F.cross_entropy(sim, labels)

            optim.zero_grad(set_to_none=True)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optim.step()
            sched.step()

            epoch_loss += loss.item()
            n_batches += 1
            global_step += 1
            if global_step % 20 == 0 or global_step == 1:
                elapsed = time.time() - t0
                print(f"[step {global_step}/{total_steps}] epoch={epoch} loss={loss.item():.4f} "
                      f"lr={sched.get_last_lr()[0]:.2e} elapsed={elapsed:.0f}s", flush=True)

        print(f"[epoch {epoch}] loss_avg={epoch_loss/max(1,n_batches):.4f} ({n_batches} batches)", flush=True)
        ckpt_dir = out_dir.parent / f"ckpt-epoch{epoch}"
        model.save_pretrained(ckpt_dir)
        tok.save_pretrained(ckpt_dir)
        print(f"[epoch {epoch}] checkpoint guardado en {ckpt_dir}", flush=True)

    model.save_pretrained(out_dir)
    tok.save_pretrained(out_dir)
    meta = {
        "base_model": args.base_model,
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "neg_k": args.neg_k,
        "lr": args.lr,
        "n_train_pairs": len(pairs),
        "total_steps": global_step,
        "train_seconds": time.time() - t0,
        "seed": args.seed,
    }
    (out_dir / "train_meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[done] modelo final guardado en {out_dir}", flush=True)
    print(json.dumps(meta, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
