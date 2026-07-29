#!/usr/bin/env python3
"""Evaluate the trained coffee-leaf classifier against Chagra's 18 real field photos.

This is deliberately NOT a clean apples-to-apples accuracy number, and the script says so:
the classifier is coffee-leaf-disease-only (5 classes: sana/roya/minador/cercospora/phoma),
scoped to LEAF symptoms. Most of the 18 photos are NOT coffee leaf disease at all (other crops
entirely, or a coffee pest that shows on the berry, not the leaf). Running the model on those
is the deliberate "does it know how to doubt" test: an out-of-domain photo should NOT get a
confident wrong label.

For each image we report: predicted class, softmax confidence, full class probability vector,
and a domain tag (coffee_leaf_disease_in_taxonomy / coffee_but_out_of_taxonomy / other_crop)
assigned by hand from the binomial name -- documented inline, not inferred by the model.
"""
import argparse
import json
import os

import torch
from PIL import Image
from torchvision import transforms
from torchvision.models import efficientnet_b0

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

PLAGA_DIR = "/home/kortux/datasets/cafe/plaga18_frozen"
# ^ frozen copy of the *original 18* public/plaga-images/*.jpg (binomio-only filenames, no
#   _2/_3 suffixes). Deliberately NOT pointed at the live public/plaga-images/ directory:
#   at the time this ran, a parallel task (2026-07-15-opencode-fotos-plagas-gbif) was actively
#   adding ~160 more photos (with _2/_3 suffixes, non-coffee species) to that same directory,
#   and reading it live would have been racy and would have broken the "18 fotos" scope this
#   task specifies. Freeze step: `cp public/plaga-images/*.jpg <this dir>` before that task
#   started writing to it.

# Hand-verified domain tags. NOT guessed by the model -- assigned from the binomial /
# common taxonomy so the report doesn't compare apples to oranges.
DOMAIN_TAGS = {
    "hemileia_vastatrix.jpg": ("coffee_leaf_disease_in_taxonomy", "roya"),
    "cercospora_coffeicola.jpg": ("coffee_leaf_disease_in_taxonomy", "cercospora"),
    "mycena_citricolor.jpg": ("coffee_leaf_disease_taxonomy_trap",
        "ojo de gallo (Mycena citricolor) -- DIFFERENT fungus than BRACOL's 'cercospora' "
        "(Cercospora coffeicola). Same common name in Colombia, different pathogen. Model "
        "has never seen this fungus; predicting 'cercospora' here would be a name coincidence, "
        "not a correct diagnosis."),
    "hypothenemus_hampei.jpg": ("coffee_pest_not_leaf",
        "broca -- infests the coffee BERRY, not the leaf. Architecturally out of scope for a "
        "leaf classifier; included to see if it at least does not claim a leaf disease."),
    "capnodium_negrilla.jpg": ("coffee_adjacent_not_in_taxonomy",
        "sooty mold, can occur on coffee but is not one of the 5 BRACOL classes."),
    "mosca_blanca.jpg": ("coffee_adjacent_not_in_taxonomy",
        "whitefly, generic pest, not one of the 5 BRACOL leaf-disease classes."),
    "meloidogyne.jpg": ("other_crop_or_not_leaf", "root-knot nematode, root symptom, not leaf, not coffee-specific."),
    "alternaria_solani.jpg": ("other_crop", "potato/tomato early blight"),
    "colletotrichum_lindemuthianum.jpg": ("other_crop", "bean anthracnose"),
    "geminivirus_cuchara.jpg": ("other_crop", "cassava geminivirus"),
    "mocis_latipes.jpg": ("other_crop", "grass looper, pasture pest"),
    "moniliophthora_perniciosa.jpg": ("other_crop", "cacao witches' broom (NOT coffee)"),
    "mycosphaerella_fijiensis.jpg": ("other_crop", "banana black Sigatoka"),
    "phytophthora_infestans.jpg": ("other_crop", "potato late blight"),
    "premnotrypes_vorax.jpg": ("other_crop", "Andean potato weevil"),
    "spodoptera_frugiperda.jpg": ("other_crop", "fall armyworm, maize pest"),
    "tecia_solanivora.jpg": ("other_crop", "potato tuber moth"),
    "ustilago_maydis.jpg": ("other_crop", "corn smut"),
}


def load_model(ckpt_path, device):
    ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
    classes = ckpt["classes"]
    model = efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = torch.nn.Linear(in_features, len(classes))
    model.load_state_dict(ckpt["model_state"])
    model.to(device)
    model.eval()
    return model, classes, ckpt.get("img_size", 224)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ckpt", required=True)
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--threshold", type=float, default=0.55)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    device = args.device
    model, classes, img_size = load_model(args.ckpt, device)
    print(f"loaded {args.ckpt} device={device} classes={classes} img_size={img_size}")

    tf = transforms.Compose([
        transforms.Resize(int(img_size * 256 / 224)),
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])

    files = sorted(f for f in os.listdir(PLAGA_DIR) if f.lower().endswith((".jpg", ".jpeg", ".png")))
    print(f"found {len(files)} images in {PLAGA_DIR}")

    results = []
    with torch.no_grad():
        for fn in files:
            path = os.path.join(PLAGA_DIR, fn)
            img = Image.open(path).convert("RGB")
            x = tf(img).unsqueeze(0).to(device)
            logits = model(x)
            probs = torch.softmax(logits, dim=1)[0]
            top_p, top_i = probs.max(0)
            pred_class = classes[top_i.item()]
            conf = top_p.item()
            tag, note = DOMAIN_TAGS.get(fn, ("UNTAGGED", ""))
            abstain = conf < args.threshold
            row = {
                "file": fn, "pred": pred_class, "confidence": round(conf, 4),
                "abstain_at_threshold": abstain,
                "probs": {c: round(p, 4) for c, p in zip(classes, probs.tolist())},
                "domain_tag": tag, "note": note,
            }
            results.append(row)
            print(f"{fn:45s} pred={pred_class:12s} conf={conf:.3f} {'[ABSTAIN]' if abstain else '':10s} tag={tag}")

    in_tax = [r for r in results if r["domain_tag"] == "coffee_leaf_disease_in_taxonomy"]
    correct = sum(1 for r in in_tax if r["pred"] == {"hemileia_vastatrix.jpg": "roya",
                                                       "cercospora_coffeicola.jpg": "cercospora"}[r["file"]])
    print(f"\nSTRICT in-taxonomy coffee leaf-disease subset: {correct}/{len(in_tax)} correct")

    out_of_domain = [r for r in results if r["domain_tag"] in
                      ("other_crop", "other_crop_or_not_leaf", "coffee_pest_not_leaf",
                       "coffee_adjacent_not_in_taxonomy")]
    confident_wrong = [r for r in out_of_domain if not r["abstain_at_threshold"]]
    print(f"Out-of-domain photos ({len(out_of_domain)}): {len(confident_wrong)} were answered "
          f"with confidence >= {args.threshold} despite being outside the model's domain "
          f"(these would be dangerous false-confidence in production).")

    summary = {
        "n_total": len(results), "threshold": args.threshold,
        "strict_in_taxonomy_correct": correct, "strict_in_taxonomy_n": len(in_tax),
        "out_of_domain_n": len(out_of_domain),
        "out_of_domain_confident_wrong_n": len(confident_wrong),
        "results": results,
    }
    out_path = args.out or "/home/kortux/qlora-out/vision-cafe/eval_18_results.json"
    with open(out_path, "w") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print(f"\nwrote {out_path}")


if __name__ == "__main__":
    main()
