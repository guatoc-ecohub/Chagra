#!/usr/bin/env python3
"""pixel-fps-clima2d.py — mide FPS de la página del tiempo 2D en el Pixel 6 Pro
REAL (Mali-G78) vía DevTools sobre Brave (socket sin pid = Brave; gotcha
2026-09-05), como pixel-fps-sierra.py, pero con el criterio de arranque de una
página CSS: existe `.ca-escena` y la raíz tiene el estado pedido. No hay WebGL.

Uso: pixel-fps-clima2d.py <url> <salida.png> [--espera 90] [--reduced 1] [--perfil 1]
Imprime RESULTADO {json} con dos conteos rAF de 5 s (CA-8).
"""
import base64, json, os, subprocess, sys, time, urllib.request
sys.path.insert(0, '/home/kortux/demos/3d/_gate/paquete-fable-sierra-costero-20260905')
import importlib.util
spec = importlib.util.spec_from_file_location('pfs', '/home/kortux/demos/3d/_gate/paquete-fable-sierra-costero-20260905/pixel-fps-sierra.py')
pfs = importlib.util.module_from_spec(spec); spec.loader.exec_module(pfs)

PERFIL = json.dumps({"rol": "campesino", "vocacion": "mixta", "finca_tipo": "integral", "nivel_respuestas": "simple",
    "nombre": "Rosa", "vereda": "El Volador", "municipio": "Guatavita", "departamento": "Cundinamarca",
    "ubicacion_lat": 4.9345, "ubicacion_lng": -73.8331, "finca_altitud": 2680, "piso_termico": "frio", "cultivos_actuales": "papa, mora"})
SEMILLA = ("(() => { try { localStorage.setItem('chagra:active_tenant_id','gate-clima-2d'); localStorage.setItem('chagra:theme','nature');"
           " localStorage.setItem('chagra:bienvenida-vista:v1','1'); localStorage.setItem('chagra:profile:v1', " + json.dumps(PERFIL) + "); localStorage.setItem('chagra:profile:v1:gate-clima-2d', " + json.dumps(PERFIL) + "); } catch (e) {} })();")

def main():
    args = sys.argv[1:]
    espera = int(pfs.take_option(args, "--espera", "90"))
    reduced = pfs.take_option(args, "--reduced", "0") == "1"
    con_perfil = pfs.take_option(args, "--perfil", "1") == "1"
    if len(args) < 2:
        print(__doc__, file=sys.stderr); return 2
    url, salida = args[0], args[1]
    maquina_sola, chromium_count, activos = pfs.run_screen_gate()
    dt = None
    rot_prev = None
    try:
        pfs.adb("shell", "svc", "power", "stayon", "true")
        pfs.adb("shell", "input", "keyevent", "KEYCODE_WAKEUP")
        # el campesino usa el teléfono en VERTICAL: se fija la rotación (0 = portrait)
        rot_prev = (pfs.adb("shell", "settings", "get", "system", "accelerometer_rotation").stdout or "").strip()
        pfs.adb("shell", "settings", "put", "system", "accelerometer_rotation", "0")
        pfs.adb("shell", "settings", "put", "system", "user_rotation", "0")
        try: subprocess.run([os.path.expanduser("~/.local/bin/pixel-unlock-interpolado")], capture_output=True, text=True, timeout=90)
        except Exception as e: print(f"unlock no disponible: {e}", file=sys.stderr)
        pfs.adb("forward", f"tcp:{pfs.PORT}", "localabstract:chrome_devtools_remote")
        # el teléfono alcanza el dev server de alpha por adb reverse
        puerto = urllib.parse.urlparse(url).port or 80
        pfs.adb("reverse", f"tcp:{puerto}", f"tcp:{puerto}")
        pfs.adb("shell", "am", "force-stop", "com.brave.browser"); time.sleep(1)
        pfs.adb("shell", "am", "start", "-n", "com.brave.browser/org.chromium.chrome.browser.ChromeTabbedActivity", "-a", "android.intent.action.VIEW", "-d", "about:blank")
        page = pfs.wait_for_page()
        dt = pfs.DevTools(page["webSocketDebuggerUrl"])
        dt.call("Runtime.enable"); dt.call("Page.enable"); dt.call("Network.enable")
        if con_perfil: dt.call("Page.addScriptToEvaluateOnNewDocument", {"source": SEMILLA})
        if reduced: dt.call("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
        dt.call("Page.navigate", {"url": url})
        t0 = time.time(); listo = False
        while time.time() - t0 < espera:
            try:
                ok = dt.evaluate("(() => { const r = document.querySelector('.ca-root'); const c = document.querySelector('[data-testid=\"clima-cifra-grande\"], [data-testid=\"clima-sin-dato\"]'); return !!(r && document.querySelector('.ca-escena') && c); })()", 10)
                if ok: listo = True; break
            except Exception: pass
            time.sleep(1.5)
        print(f"ARRANQUE_OK={listo} en {time.time()-t0:.1f}s", file=sys.stderr)
        time.sleep(10)
        fps_expr = "new Promise(resolve => { let frames = 0; const start = performance.now(); const tick = () => { frames++; const el = performance.now() - start; if (el < 5000) requestAnimationFrame(tick); else resolve(frames / (el / 1000)); }; requestAnimationFrame(tick); })"
        fps = [dt.evaluate(fps_expr, 40), dt.evaluate(fps_expr, 40)]
        estado = pfs.normalize_json(dt.evaluate("JSON.stringify((() => { const r = document.querySelector('.ca-root'); const o = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).opacity : null; }; return { clima: r && r.getAttribute('data-clima'), luz: r && r.getAttribute('data-luz'), forzado: r && r.getAttribute('data-forzado'), temp: (document.querySelector('[data-testid=\"clima-temp\"]')||{}).innerText || null, gotas: document.querySelectorAll('.ca-gota').length, lluviaOp: o('.ca-capa--lluvia'), nubesOp: o('.ca-capa--nubes'), dpr: devicePixelRatio, vw: innerWidth, vh: innerHeight, anim: getComputedStyle(document.querySelector('.ca-gota')).animationName, ua: navigator.userAgent.slice(0, 80) }; })())", 30))
        png = base64.b64decode(dt.call("Page.captureScreenshot", {"format": "png"}, 60).get("data"))
        os.makedirs(os.path.dirname(salida) or ".", exist_ok=True)
        open(salida, "wb").write(png)
        res = {"fps": fps, "medianaAprox": sorted(fps)[len(fps)//2], "arranque": listo, "estado": estado, "reduced": reduced,
               "pageErrors": dt.page_errors, "requestFailures": pfs.real_network_failures(dt.request_failures), "console": dt.console_messages[-10:],
               "maquinaSola": maquina_sola, "captura": salida, "bytes": len(png)}
        print("RESULTADO " + json.dumps(res, ensure_ascii=False))
        return 0 if listo else 1
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr); return 2
    finally:
        if dt: dt.close()
        try:
            if rot_prev in ("0", "1"): pfs.adb("shell", "settings", "put", "system", "accelerometer_rotation", rot_prev)
        except Exception: pass
        pfs.adb("shell", "am", "force-stop", "com.brave.browser")
        pfs.adb("forward", "--remove", f"tcp:{pfs.PORT}")
        pfs.adb("reverse", "--remove-all")
        pfs.adb("shell", "svc", "power", "stayon", "false")

if __name__ == "__main__":
    import urllib.parse
    raise SystemExit(main())
