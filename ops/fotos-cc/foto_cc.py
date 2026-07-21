#!/usr/bin/env python3
"""
foto_cc.py — Pipeline curado de fotos con licencia abierta (CC / dominio publico).

INDEPENDIENTE y REUSABLE. Apunte el pipeline a CUALQUIER manifiesto de "sujetos"
que necesiten foto y hace, en cuatro pasos desacoplados:

  1) buscar    — Wikimedia Commons (API oficial, sin scraping, sin cuenta premium):
                 candidatas por sujeto, ya filtradas a licencias ABIERTAS.
  2) bajar     — miniaturas (800px) al directorio de staging.
  3) verificar — COMPUERTA DE VISION: pregunta a un modelo de vision (ollama) o
                 deja una hoja para revision humana/Claude: "esta foto MUESTRA de
                 verdad el sujeto?". Es el corazon del pipeline.
  4) commitear — solo las APROBADAS pasan a <destino>/<slug>.jpg + creditos.json.

POR QUE existe (no es un DR de disparar-y-olvidar): el 2026-07-09 una auditoria
de vision encontro 8 fotos de biopreparados que mostraban lo que NO era (un
espacimen mineral en vez del caldo, compost ingles en vez de estiercol). Se
retiraron: "mejor sin foto (cae al icono) que con desinformacion". Este tool
reintroduce fotos SOLO cruzando la compuerta de vision, para no repetir el error.

Solo stdlib: urllib, json, base64, argparse, html, re, os, shutil. Sin deps.

Uso tipico:
  python3 foto_cc.py buscar    -m manifests/biopreparados.json -o work/candidatas.json
  python3 foto_cc.py bajar     -c work/candidatas.json -d work/staging
  python3 foto_cc.py verificar -c work/candidatas.json -d work/staging \
                               --modo ollama --host http://alpha:11434 --model qwen2.5vl:7b \
                               -o work/veredictos.json
      (o --modo manual  -> escribe work/veredictos.json con aprobado=null para llenar a mano/vision)
  python3 foto_cc.py commitear -v work/veredictos.json -m manifests/biopreparados.json
"""
import argparse
import base64
import html
import json
import os
import re
import shutil
import time
import urllib.parse
import urllib.request

UA = "chagra-fotos-cc/1.0 (agroecologia; contacto via repo guatoc-ecohub/Chagra)"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"

# Licencias que ACEPTAMOS (reutilizables con credito). Todo lo demas se descarta.
LIC_ABIERTAS = re.compile(
    r"\b(cc0|cc[\s-]?by([\s-]?sa)?|public\s*domain|dominio\s*publico|pd(-|\b)|no\s*restrictions)\b",
    re.IGNORECASE,
)
# Senales de NO-libre: si aparecen, descartar aunque el otro campo diga CC.
LIC_VETO = re.compile(r"\b(fair\s*use|non[\s-]?free|copyright(ed)?|all\s*rights)\b", re.IGNORECASE)


def _get(url, params=None, binary=False, timeout=30):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
    return data if binary else json.loads(data.decode("utf-8"))


def _limpiar(txt):
    """Quita HTML/entidades de los campos de credito de Commons."""
    if not txt:
        return ""
    txt = re.sub(r"<[^>]+>", "", txt)
    return html.unescape(txt).strip()


def _licencia_ok(short, restr):
    blob = f"{short} {restr}"
    if LIC_VETO.search(blob):
        return False
    return bool(LIC_ABIERTAS.search(blob))


def cmd_buscar(args):
    manifiesto = json.load(open(args.manifest, encoding="utf-8"))
    por_sujeto = args.por_sujeto
    salida = {"catalogo": manifiesto.get("catalogo"), "sujetos": []}
    for suj in manifiesto["sujetos"]:
        cands, vistos = [], set()
        for q in suj.get("busquedas", [suj["nombre"]]):
            try:
                data = _get(
                    COMMONS_API,
                    {
                        "action": "query", "format": "json", "generator": "search",
                        "gsrsearch": q, "gsrnamespace": "6", "gsrlimit": str(por_sujeto + 4),
                        "prop": "imageinfo", "iiprop": "url|extmetadata|mediatype", "iiurlwidth": "800",
                    },
                )
            except Exception as e:  # noqa: BLE001
                print(f"  [!] busqueda '{q}' fallo: {e}")
                time.sleep(args.pausa)
                continue
            time.sleep(args.pausa)  # respeta el rate-limit de Commons (evita 429)
            pages = (data.get("query") or {}).get("pages") or {}
            for pg in pages.values():
                ii = (pg.get("imageinfo") or [None])[0]
                if not ii:
                    continue
                # Solo fotos reales: descartar PDFs, oficina, audio (matchean por
                # el titulo: "biol"->papers "biological"). BITMAP/DRAWING = imagen.
                if ii.get("mediatype") not in ("BITMAP", "DRAWING"):
                    continue
                thumb = ii.get("thumburl")
                if not thumb or thumb in vistos:
                    continue
                meta = ii.get("extmetadata") or {}
                short = _limpiar((meta.get("LicenseShortName") or {}).get("value"))
                restr = _limpiar((meta.get("Restrictions") or {}).get("value"))
                if not _licencia_ok(short, restr):
                    continue
                vistos.add(thumb)
                cands.append({
                    "titulo": pg.get("title"),
                    "thumb": thumb,
                    "descripcion_commons": _limpiar((meta.get("ImageDescription") or {}).get("value"))[:200],
                    "autor": _limpiar((meta.get("Artist") or {}).get("value")) or "desconocido",
                    "licencia": short or "abierta",
                    "url": ii.get("descriptionurl") or ii.get("url"),
                    "busqueda": q,
                })
                if len(cands) >= por_sujeto:
                    break
            if len(cands) >= por_sujeto:
                break
        print(f"  {suj['slug']}: {len(cands)} candidata(s) con licencia abierta")
        salida["sujetos"].append({**{k: suj[k] for k in ("slug", "nombre", "descripcion_visual")}, "candidatas": cands})
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    json.dump(salida, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"[buscar] -> {args.out}")


def cmd_bajar(args):
    cj = json.load(open(args.candidates, encoding="utf-8"))
    os.makedirs(args.dir, exist_ok=True)
    n = 0
    for suj in cj["sujetos"]:
        for i, c in enumerate(suj["candidatas"]):
            dest = os.path.join(args.dir, f"{suj['slug']}__{i}.jpg")
            c["archivo"] = None
            datos = None
            for intento in range(3):  # retry con backoff (upload.wikimedia rate-limita)
                try:
                    datos = _get(c["thumb"], binary=True)
                    if datos and len(datos) > 1024:  # NO aceptar 0-byte / basura
                        break
                    datos = None
                except Exception as e:  # noqa: BLE001
                    if intento == 2:
                        print(f"  [!] {dest}: {e}")
                time.sleep(args.pausa * (intento + 1))
            if datos:
                open(dest, "wb").write(datos)
                c["archivo"] = dest
                n += 1
            elif os.path.exists(dest):
                os.remove(dest)  # limpia cualquier 0-byte previo
    json.dump(cj, open(args.candidates, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"[bajar] {n} miniatura(s) con contenido -> {args.dir}")


def _ollama_visio(host, model, img_path, descripcion):
    b64 = base64.b64encode(open(img_path, "rb").read()).decode()
    prompt = (
        "Responda en la PRIMERA linea solo SI o NO, y en la segunda una razon corta.\n"
        f"Pregunta: ¿esta foto muestra {descripcion}? "
        "Si muestra otra cosa (otro objeto, un mineral distinto, un grafico, texto), responda NO."
    )
    body = json.dumps({"model": model, "prompt": prompt, "images": [b64], "stream": False}).encode()
    req = urllib.request.Request(host.rstrip("/") + "/api/generate", data=body,
                                 headers={"Content-Type": "application/json", "User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        resp = json.loads(r.read().decode()).get("response", "")
    primera = resp.strip().splitlines()[0].upper() if resp.strip() else ""
    aprob = primera.startswith("SI") or primera.startswith("SÍ") or primera.startswith("YES")
    return aprob, resp.strip()[:200]


def cmd_verificar(args):
    cj = json.load(open(args.candidates, encoding="utf-8"))
    veredictos = {"catalogo": cj.get("catalogo"), "modo": args.modo, "items": []}
    for suj in cj["sujetos"]:
        for c in suj["candidatas"]:
            if not c.get("archivo"):
                continue
            item = {
                "slug": suj["slug"], "archivo": c["archivo"], "descripcion_visual": suj["descripcion_visual"],
                "autor": c["autor"], "licencia": c["licencia"], "url": c["url"],
                "aprobado": None, "razon": "",
            }
            if args.modo == "ollama":
                try:
                    ok, razon = _ollama_visio(args.host, args.model, c["archivo"], suj["descripcion_visual"])
                    item["aprobado"], item["razon"] = ok, razon
                    print(f"  {suj['slug']} {'SI' if ok else 'NO'}: {razon[:70]}")
                except Exception as e:  # noqa: BLE001
                    item["razon"] = f"vision fallo: {e}"
                    print(f"  [!] {suj['slug']}: vision fallo: {e}")
            veredictos["items"].append(item)
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    json.dump(veredictos, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    if args.modo == "manual":
        print(f"[verificar] modo MANUAL: llene 'aprobado' (true/false) en {args.out} "
              "mirando cada 'archivo' con ojo/vision. Luego 'commitear'.")
    else:
        print(f"[verificar] -> {args.out}")


def cmd_commitear(args):
    ver = json.load(open(args.verdicts, encoding="utf-8"))
    manifiesto = json.load(open(args.manifest, encoding="utf-8"))
    destino = manifiesto["destino"]
    os.makedirs(destino, exist_ok=True)
    creditos, aprob = [], 0
    hechos = set()
    for it in ver["items"]:
        if it.get("aprobado") is not True or it["slug"] in hechos:
            continue
        dest = os.path.join(destino, f"{it['slug']}.jpg")
        shutil.copyfile(it["archivo"], dest)
        hechos.add(it["slug"])
        aprob += 1
        creditos.append({"slug": it["slug"], "autor": it["autor"], "lic": it["licencia"], "url": it["url"]})
        print(f"  + {dest}  ({it['autor']}, {it['licencia']})")
    cred_path = os.path.join(os.path.dirname(args.verdicts) or ".", "creditos.json")
    json.dump(creditos, open(cred_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"[commitear] {aprob} foto(s) verificada(s) -> {destino}")
    print(f"[commitear] creditos -> {cred_path} (pegar en el array de creditos del data file)")
    faltan = [s["slug"] for s in manifiesto["sujetos"] if s["slug"] not in hechos]
    if faltan:
        print(f"[commitear] SIN foto verificada (se quedan con icono, honesto): {', '.join(faltan)}")


def main():
    ap = argparse.ArgumentParser(description="Pipeline curado de fotos CC (Wikimedia Commons + compuerta de vision).")
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("buscar"); b.add_argument("-m", "--manifest", required=True); b.add_argument("-o", "--out", default="work/candidatas.json"); b.add_argument("--por-sujeto", type=int, default=3); b.add_argument("--pausa", type=float, default=1.5, help="segundos entre llamadas a Commons (rate-limit)"); b.set_defaults(f=cmd_buscar)
    d = sub.add_parser("bajar"); d.add_argument("-c", "--candidates", required=True); d.add_argument("-d", "--dir", default="work/staging"); d.add_argument("--pausa", type=float, default=1.2, help="segundos entre descargas (rate-limit)"); d.set_defaults(f=cmd_bajar)
    v = sub.add_parser("verificar"); v.add_argument("-c", "--candidates", required=True); v.add_argument("-d", "--dir", default="work/staging"); v.add_argument("--modo", choices=["manual", "ollama"], default="manual"); v.add_argument("--host", default="http://localhost:11434"); v.add_argument("--model", default="qwen2.5vl:7b"); v.add_argument("-o", "--out", default="work/veredictos.json"); v.set_defaults(f=cmd_verificar)
    c = sub.add_parser("commitear"); c.add_argument("-v", "--verdicts", required=True); c.add_argument("-m", "--manifest", required=True); c.set_defaults(f=cmd_commitear)
    args = ap.parse_args()
    args.f(args)


if __name__ == "__main__":
    main()
