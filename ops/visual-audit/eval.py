#!/usr/bin/env python3
# Evaluador visual LOCAL — qwen3-vl:8b en ollama (Ampere). Cero IA externa.
# Lee el manifest + cada PNG, pide a qwen3-vl un veredicto JSON por captura:
#   renderiza (bien/parcial/roto/blanco) · texto_encimado (bool) ·
#   espectacularidad (1-5) · problemas ([...]).
# Guarda results.jsonl + summary.json. Opus sintetiza después.
#
# Uso: python eval.py <dir-con-manifest.json> [modelo]
import base64, json, sys, time, urllib.request

DIR = sys.argv[1] if len(sys.argv) > 1 else "/tmp/visual-audit"
MODEL = sys.argv[2] if len(sys.argv) > 2 else "qwen3-vl:8b"
OLLAMA = "http://localhost:11434/api/generate"

PROMPT = (
    "Eres un auditor visual de una app 3D agroecologica (Chagra). Mira la captura de "
    "pantalla y evalua SOLO con JSON, sin texto extra. Campos:\n"
    '{"renderiza":"bien|parcial|roto|blanco", "texto_encimado":true|false, '
    '"espectacularidad":1-5, "problemas":["..."]}\n'
    "Reglas:\n"
    "- renderiza='roto' si ves 'Cargando...', un spinner, pantalla negra/vacia, un mensaje de error "
    "o 'el 3D no bajo'. 'blanco' si esta en blanco. 'parcial' si hay UI pero el 3D no se ve. 'bien' si "
    "se ve una escena 3D con relieve/objetos.\n"
    "- texto_encimado=true SOLO si hay textos superpuestos/encimados ilegibles.\n"
    "- espectacularidad: 5=impresionante (iluminacion, profundidad, detalle), 3=correcto, 1=plano/pobre.\n"
    "- problemas: lista corta y concreta de lo que esta mal (vacia si todo bien)."
)


def evaluar(png_path):
    with open(png_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    body = json.dumps({
        "model": MODEL, "prompt": PROMPT, "images": [b64],
        "stream": False, "format": "json",
        "options": {"temperature": 0, "num_predict": 220},
    }).encode()
    req = urllib.request.Request(OLLAMA, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        resp = json.loads(r.read()).get("response", "{}")
    try:
        return json.loads(resp)
    except Exception:
        return {"renderiza": "?", "texto_encimado": None, "espectacularidad": None,
                "problemas": ["parse-fail: " + resp[:120]]}


def main():
    manifest = json.load(open(f"{DIR}/manifest.json"))
    shots = [m for m in manifest if m.get("shot")]
    print(f"[eval] {len(shots)} capturas con {MODEL}", flush=True)
    out = open(f"{DIR}/results.jsonl", "w")
    agg = {"total": 0, "roto": 0, "encimado": 0, "espec_baja": 0, "por_ruta": {}}
    for i, m in enumerate(shots):
        t0 = time.time()
        try:
            v = evaluar(f"{DIR}/{m['shot']}")
        except Exception as e:
            v = {"renderiza": "ERR", "problemas": [f"{type(e).__name__}: {str(e)[:80]}"]}
        rec = {**m, "veredicto": v, "dt": round(time.time() - t0, 1)}
        out.write(json.dumps(rec, ensure_ascii=False) + "\n"); out.flush()
        agg["total"] += 1
        r = v.get("renderiza", "?")
        if r in ("roto", "blanco", "parcial"):
            agg["roto"] += 1
        if v.get("texto_encimado") is True:
            agg["encimado"] += 1
        esp = v.get("espectacularidad")
        if isinstance(esp, (int, float)) and esp <= 2:
            agg["espec_baja"] += 1
        agg["por_ruta"].setdefault(m["route"], []).append({"estado": m["estado"], "r": r,
            "enc": v.get("texto_encimado"), "esp": esp, "probs": v.get("problemas", [])})
        flag = ""
        if r in ("roto", "blanco"): flag += " <<ROTO"
        if v.get("texto_encimado") is True: flag += " <<TEXTO-ENCIMADO"
        print(f"[{i+1}/{len(shots)}] {m['shot'][:44]:44} r={r} esp={esp} {round(time.time()-t0)}s{flag}", flush=True)
    out.close()
    json.dump(agg, open(f"{DIR}/summary.json", "w"), ensure_ascii=False, indent=1)
    print("\n=== RESUMEN ===")
    print(f"total={agg['total']} rotos/parciales={agg['roto']} texto-encimado={agg['encimado']} espectacularidad-baja={agg['espec_baja']}")
    print("VISUAL_AUDIT_DONE " + f"{DIR}/results.jsonl")


if __name__ == "__main__":
    main()
