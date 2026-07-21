#!/usr/bin/env python3
"""
Evalua un modelo E5 (base HF id o path local) sobre pairs_test.jsonl sacado
del split HONESTO por especie, con corpus.jsonl completo (742 especies)
como universo de recuperacion. Reporta recall@1, recall@5, MRR global y
sobre el subconjunto de "confundibles" (papa/papaya/papayuela, passifloras,
tomate/tomate de arbol, brassica oleracea, arracacha/yuca).
"""
import argparse, json, sys
from pathlib import Path

import torch

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
    ap.add_argument("--model", required=True, help="HF id o path local")
    ap.add_argument("--device", default=None)
    ap.add_argument("--dtype", default="float32", choices=["float32", "bfloat16"])
    ap.add_argument("--pairs", default=str(BASE / "pairs_test.jsonl"))
    ap.add_argument("--out", default=None, help="path JSON de salida")
    ap.add_argument("--tag", default="model")
    args = ap.parse_args()

    device = args.device or ("cuda" if torch.cuda.is_available() else "cpu")
    dtype = torch.bfloat16 if args.dtype == "bfloat16" else torch.float32

    corpus_rows = load_jsonl(BASE / "corpus.jsonl")
    pairs = load_jsonl(args.pairs)
    confusable = json.loads((BASE / "confusable_ids.json").read_text(encoding="utf-8"))
    confusable_flat = set(confusable["flat"])
    # mapa species_id -> nombre de grupo confundible
    id_to_group = {}
    for gname, ids in confusable["groups"].items():
        for sid in ids:
            id_to_group[sid] = gname

    sid_list = [r["species_id"] for r in corpus_rows]
    doc_texts = [r["text"] for r in corpus_rows]
    nombre_by_sid = {}
    # recuperar nombre_comun de species.jsonl para reporte legible
    with open(BASE / "species.jsonl", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line in ("LOAD", "SET"):
                continue
            d = json.loads(line)
            nombre_by_sid[d.get("id")] = d.get("nombre_comun", d.get("id"))

    print(f"[eval:{args.tag}] cargando modelo {args.model} en {device} ({args.dtype})", flush=True)
    tok, model = load_model(args.model, device=device, dtype=dtype)
    model.eval()

    print(f"[eval:{args.tag}] encodeando corpus ({len(doc_texts)} docs)...", flush=True)
    doc_emb = encode_texts(doc_texts, tok, model, device, "passage: ", max_length=128, batch_size=32, grad=False)

    queries = [p["query"] for p in pairs]
    true_sids = [p["species_id"] for p in pairs]
    print(f"[eval:{args.tag}] encodeando {len(queries)} queries de test...", flush=True)
    q_emb = encode_texts(queries, tok, model, device, "query: ", max_length=32, batch_size=32, grad=False)

    sim = q_emb @ doc_emb.t()  # [Q, D]
    ranks = []
    top1_sid = []
    for i in range(sim.shape[0]):
        order = torch.argsort(sim[i], descending=True).tolist()
        ranked_sids = [sid_list[j] for j in order]
        true_sid = true_sids[i]
        rank = ranked_sids.index(true_sid) + 1
        ranks.append(rank)
        top1_sid.append(ranked_sids[0])

    def metrics(idxs):
        if not idxs:
            return {"n": 0, "recall_at_1": None, "recall_at_5": None, "mrr": None}
        rs = [ranks[i] for i in idxs]
        n = len(rs)
        r1 = sum(1 for r in rs if r == 1) / n
        r5 = sum(1 for r in rs if r <= 5) / n
        mrr = sum(1.0 / r for r in rs) / n
        return {"n": n, "recall_at_1": r1, "recall_at_5": r5, "mrr": mrr}

    all_idx = list(range(len(pairs)))
    conf_idx = [i for i in all_idx if true_sids[i] in confusable_flat]

    global_metrics = metrics(all_idx)
    confusable_metrics = metrics(conf_idx)

    by_source = {}
    for i in all_idx:
        src = pairs[i].get("source", "?")
        by_source.setdefault(src, []).append(i)
    source_metrics = {src: metrics(idxs) for src, idxs in by_source.items()}

    by_group = {}
    for i in conf_idx:
        g = id_to_group.get(true_sids[i], "?")
        by_group.setdefault(g, []).append(i)
    group_metrics = {g: metrics(idxs) for g, idxs in by_group.items()}

    confusable_details = []
    for i in conf_idx:
        confusable_details.append({
            "query": queries[i],
            "true_species": true_sids[i],
            "true_nombre": nombre_by_sid.get(true_sids[i], true_sids[i]),
            "group": id_to_group.get(true_sids[i], "?"),
            "rank": ranks[i],
            "top1_species": top1_sid[i],
            "top1_nombre": nombre_by_sid.get(top1_sid[i], top1_sid[i]),
            "correct": ranks[i] == 1,
        })

    result = {
        "tag": args.tag,
        "model": args.model,
        "n_test_pairs": len(pairs),
        "n_corpus_docs": len(doc_texts),
        "global": global_metrics,
        "confusable": confusable_metrics,
        "by_source": source_metrics,
        "by_confusable_group": group_metrics,
        "confusable_details": confusable_details,
    }

    print(json.dumps({k: v for k, v in result.items() if k != "confusable_details"}, indent=2, ensure_ascii=False))

    if args.out:
        Path(args.out).write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"[eval:{args.tag}] guardado en {args.out}", flush=True)


if __name__ == "__main__":
    main()
