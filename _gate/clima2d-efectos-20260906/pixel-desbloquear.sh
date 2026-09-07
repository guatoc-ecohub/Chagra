#!/usr/bin/env bash
# Desbloqueo ATOMICO del Pixel: despertar -> swipe desde muy abajo -> dump ->
# trazar el patron guardado, todo seguido. Entre comandos la pantalla vuelve
# atras y el dump pierde la grilla (eso tumbo dos intentos hoy).
# UN SOLO INTENTO: el lockout escala. El patron NUNCA se imprime.
set -uo pipefail
S=1A261FDEE003G6
CFG=$HOME/.config/pixel-unlock
A(){ adb -s "$S" "$@"; }
is_locked(){ A shell dumpsys window 2>/dev/null | grep -q "isKeyguardShowing=true"; }

A shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1; sleep 1
if ! is_locked; then echo "ya estaba desbloqueado"; A shell svc power stayon true >/dev/null 2>&1; exit 0; fi
[ -r "$CFG" ] || { echo "sin $CFG" >&2; exit 1; }
A shell input swipe 720 2900 720 1500 200 >/dev/null 2>&1; sleep 1
A shell uiautomator dump /sdcard/gate-lock.xml >/dev/null 2>&1
A pull /sdcard/gate-lock.xml /tmp/gate-lock.xml >/dev/null 2>&1
PIXEL_SERIAL="$S" CFG="$CFG" python3 - <<'PY'
import re, os, subprocess, sys
S = os.environ["PIXEL_SERIAL"]
pat = ""
for line in open(os.environ["CFG"], encoding="utf-8", errors="replace"):
    if line.startswith("PATTERN"):
        pat = "".join(c for c in line.split("=", 1)[1] if c in "123456789"); break
if not pat: print("PATTERN vacio", file=sys.stderr); sys.exit(1)
xml = open("/tmp/gate-lock.xml", encoding="utf-8", errors="replace").read()
m = re.search(r'lockPatternView[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', xml)
if not m: print("no aparece lockPatternView en el dump", file=sys.stderr); sys.exit(1)
x0, y0, x1, y1 = map(int, m.groups())
def node(d):
    r, c = (d - 1) // 3, (d - 1) % 3
    return x0 + (x1 - x0) * (2 * c + 1) // 6, y0 + (y1 - y0) * (2 * r + 1) // 6
pts = [node(int(d)) for d in pat]
def me(kind, x, y):
    subprocess.run(["adb", "-s", S, "shell", "input", "motionevent", kind, str(x), str(y)],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
me("DOWN", *pts[0])
for p in pts[1:]: me("MOVE", *p)
me("UP", *pts[-1])
print("patron trazado")
PY
sleep 2
if is_locked; then echo "SIGUE BLOQUEADO — no se reintenta"; exit 73; fi
A shell svc power stayon true >/dev/null 2>&1
echo "desbloqueado"
