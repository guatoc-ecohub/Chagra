#!/usr/bin/env python3
"""
Construye pares (query, species_id) reales desde el grafo AGE de Chagra
(RegionalLabel + Species.nombres_comunes), mas indices de familia/genero
para negativos duros, y hace split HONESTO por especie.

Entradas (ya volcadas desde postgres-farm/chagra_kg):
  ~/embedder-ft/species.jsonl          -- properties(s) por cada Species
  ~/embedder-ft/regional_labels.jsonl  -- properties(r) por cada RegionalLabel
  ~/embedder-ft/species_family.psv     -- "species_id"|"Family" (psql -t -A, pipe-sep)

Salidas:
  ~/embedder-ft/corpus.jsonl        -- {species_id, text} documento por especie (TODAS, 742)
  ~/embedder-ft/pairs_train.jsonl   -- {query, species_id, source}
  ~/embedder-ft/pairs_test.jsonl    -- {query, species_id, source}
  ~/embedder-ft/family.json         -- {species_id: family_name}
  ~/embedder-ft/genus.json          -- {species_id: genus}
  ~/embedder-ft/confusable_ids.json -- lista de species_id del set de confundibles
  ~/embedder-ft/split_report.json   -- stats del split para el reporte
"""
import json, re, random, sys
from pathlib import Path
from collections import defaultdict

BASE = Path.home() / "embedder-ft"
random.seed(1337)

# ---------- 1. cargar species.jsonl ----------
species = {}
with open(BASE / "species.jsonl", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line in ("LOAD", "SET"):
            continue
        try:
            props = json.loads(line)
        except json.JSONDecodeError:
            continue
        sid = props.get("id")
        if not sid:
            continue
        species[sid] = props

print(f"[species] cargadas {len(species)} especies", file=sys.stderr)

# ---------- 2. cargar regional_labels.jsonl ----------
raw_labels = []
with open(BASE / "regional_labels.jsonl", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line in ("LOAD", "SET"):
            continue
        try:
            props = json.loads(line)
        except json.JSONDecodeError:
            continue
        raw_labels.append(props)

print(f"[regional_labels] cargados {len(raw_labels)} nodos", file=sys.stderr)

# ---------- 3. cargar species_family.psv ----------
family_of = {}
with open(BASE / "species_family.psv", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line in ("LOAD", "SET"):
            continue
        parts = line.split("|")
        if len(parts) != 2:
            continue
        sid = parts[0].strip('"')
        fam = parts[1].strip('"')
        family_of[sid] = fam

print(f"[family] {len(family_of)} especies con familia", file=sys.stderr)

# ---------- 4. genero desde nombre_cientifico ----------
def genus_of(sci_name: str) -> str:
    if not sci_name:
        return ""
    tok = sci_name.strip().split()
    if not tok:
        return ""
    g = tok[0].strip(".,").lower()
    if g in ("x", "×"):
        g = tok[1].strip(".,").lower() if len(tok) > 1 else g
    return g

genus_of_species = {}
for sid, props in species.items():
    genus_of_species[sid] = genus_of(props.get("nombre_cientifico", ""))

# ---------- 5. normalizar RegionalLabel -> (query, species_id, confidence) ----------
skipped_missing_species = 0
seen_pairs = set()
positives = []  # (query, species_id, source)

def add_pair(query, sid, source):
    global skipped_missing_species
    query = (query or "").strip()
    if not query or not sid:
        return
    if sid not in species:
        skipped_missing_species += 1
        return
    key = (query.lower(), sid)
    if key in seen_pairs:
        return
    seen_pairs.add(key)
    positives.append({"query": query, "species_id": sid, "source": source})

for props in raw_labels:
    sid = props.get("canonical_species_id") or props.get("species_id")
    surface = props.get("surface_form") or props.get("label")
    add_pair(surface, sid, "regional_label")

n_regional = len(positives)
print(f"[regional_label] {n_regional} pares validos, {skipped_missing_species} descartados (species_id inexistente)", file=sys.stderr)

# ---------- 6. nombres_comunes por especie ----------
n_before = len(positives)
for sid, props in species.items():
    ncs = props.get("nombres_comunes") or []
    if isinstance(ncs, str):
        ncs = [ncs]
    for nc in ncs:
        add_pair(nc, sid, "nombres_comunes")
    nc1 = props.get("nombre_comun")
    if nc1:
        add_pair(nc1, sid, "nombre_comun")

print(f"[nombres_comunes+nombre_comun] +{len(positives) - n_before} pares nuevos", file=sys.stderr)
print(f"[total] {len(positives)} pares (query, species_id) unicos", file=sys.stderr)

# ---------- 7. set de confundibles (forzado a TEST) ----------
CONFUSABLE_GROUPS = {
    "papa_vs_papaya_vs_papayuela": [
        "solanum_tuberosum", "solanum_tuberosum_argentina", "solanum_tuberosum_carrera_negra",
        "solanum_tuberosum_diacol_capiro", "solanum_tuberosum_pastusa_suprema", "solanum_tuberosum_sabanera",
        "solanum_phureja",
        "carica_papaya",
        "vasconcellea_pubescens", "vasconcellea_goudotiana",
    ],
    "passifloras": [
        "passiflora_edulis_flavicarpa", "passiflora_edulis_amarilla_colombia", "passiflora_edulis_morada",
        "passiflora_ligularis", "passiflora_tripartita_mollissima", "passiflora_quadrangularis",
        "passiflora_incarnata", "passiflora_maliformis", "passiflora_tarminiana",
    ],
    "tomate_vs_tomate_de_arbol": [
        "solanum_lycopersicum", "solanum_lycopersicum_cerasiforme", "solanum_lycopersicum_cerasiforme_uvalina",
        "solanum_lycopersicum_san_marzano", "solanum_lycopersicum_sungold",
        "solanum_betaceum", "solanum_betaceum_morado", "solanum_betaceum_naranja",
    ],
    "brassica_oleracea": [
        "brassica_oleracea_acephala_curly", "brassica_oleracea_acephala_lacinato",
        "brassica_oleracea_acephala_red_russian", "brassica_oleracea_botrytis",
        "brassica_oleracea_capitata_alba", "brassica_oleracea_capitata_rubra",
        "brassica_oleracea_gemmifera", "brassica_oleracea_italica",
        "brassica_oleracea_sabauda", "brassica_oleracea_sabellica",
        "brassica_oleracea_var_acephala", "brassica_oleracea_var_capitata",
    ],
    "arracacha_vs_yuca": [
        "arracacia_xanthorrhiza", "arracacia_xanthorrhiza_amarilla",
        "manihot_esculenta", "manihot_glaziovii",
    ],
}
confusable_ids = set()
for grp in CONFUSABLE_GROUPS.values():
    for sid in grp:
        if sid in species:
            confusable_ids.add(sid)
        else:
            print(f"  [warn] confusable id no existe en grafo: {sid}", file=sys.stderr)

print(f"[confusables] {len(confusable_ids)} species_id forzados a TEST", file=sys.stderr)

# ---------- 8. split por ESPECIE (no por par) ----------
all_species_with_pairs = sorted({p["species_id"] for p in positives})
pool = [s for s in all_species_with_pairs if s not in confusable_ids]
random.shuffle(pool)
n_test_target = round(0.18 * len(all_species_with_pairs))
n_test_from_pool = max(0, n_test_target - len(confusable_ids & set(all_species_with_pairs)))
test_species = set(pool[:n_test_from_pool]) | (confusable_ids & set(all_species_with_pairs))
train_species = set(all_species_with_pairs) - test_species

pairs_train = [p for p in positives if p["species_id"] in train_species]
pairs_test = [p for p in positives if p["species_id"] in test_species]

print(f"[split] especies train={len(train_species)} test={len(test_species)} (de {len(all_species_with_pairs)} con pares)", file=sys.stderr)
print(f"[split] pares train={len(pairs_train)} test={len(pairs_test)}", file=sys.stderr)

# ---------- 9. corpus: un documento por CADA especie (742) ----------
def doc_text(props):
    nombre = props.get("nombre_comun", "")
    sci = props.get("nombre_cientifico", "")
    teaser = props.get("teaser", "") or ""
    parts = [x for x in [nombre, f"({sci})" if sci else "", teaser] if x]
    return " ".join(parts).strip()

corpus = [{"species_id": sid, "text": doc_text(props)} for sid, props in species.items()]

# ---------- 10. escribir salidas ----------
with open(BASE / "corpus.jsonl", "w", encoding="utf-8") as f:
    for row in corpus:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")

with open(BASE / "pairs_train.jsonl", "w", encoding="utf-8") as f:
    for row in pairs_train:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")

with open(BASE / "pairs_test.jsonl", "w", encoding="utf-8") as f:
    for row in pairs_test:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")

with open(BASE / "family.json", "w", encoding="utf-8") as f:
    json.dump(family_of, f, ensure_ascii=False)

with open(BASE / "genus.json", "w", encoding="utf-8") as f:
    json.dump(genus_of_species, f, ensure_ascii=False)

with open(BASE / "confusable_ids.json", "w", encoding="utf-8") as f:
    json.dump({"groups": CONFUSABLE_GROUPS, "flat": sorted(confusable_ids)}, f, ensure_ascii=False, indent=2)

report = {
    "n_species_total": len(species),
    "n_species_with_nombres_comunes": sum(1 for p in species.values() if p.get("nombres_comunes")),
    "n_regional_labels_raw": len(raw_labels),
    "n_regional_label_pairs_valid": n_regional,
    "n_regional_label_pairs_skipped_missing_species": skipped_missing_species,
    "n_pairs_total": len(positives),
    "n_species_with_pairs": len(all_species_with_pairs),
    "n_species_train": len(train_species),
    "n_species_test": len(test_species),
    "n_pairs_train": len(pairs_train),
    "n_pairs_test": len(pairs_test),
    "n_confusable_species": len(confusable_ids),
    "n_families": len(set(family_of.values())),
    "split_seed": 1337,
}
with open(BASE / "split_report.json", "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print(json.dumps(report, ensure_ascii=False, indent=2))
