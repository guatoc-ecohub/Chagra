#!/usr/bin/env python3
# pixel-fps-boletin.py — fps REAL del boletín 2D de clima en el Pixel 6 Pro (Mali-G78) por
# Chrome DevTools, con la piel que se pida por query (?clima=nublado&luz=dia).
# Receta: `adb reverse` para que el teléfono vea el vite de alpha en localhost:<port>; Chrome
# por COMPONENTE (el intent VIEW cae en Brave, sin devtools); sesión E2E sembrada por CDP
# (token falso en localforage 'Chagra'/'syncQueue' + perfil de páramo) y la API JSON:API de
# farmOS interceptada a vacío con Fetch.fulfillRequest (si no, el 401 real cierra sesión);
# espera la pantalla, 10 s de asentamiento, dos conteos rAF de 5 s (mediana), screencap.
# Uso: pixel-fps-boletin.py --port 5390 --clima nublado --luz dia --out ./pixel [--reducido]
import base64, json, os, socket, struct, subprocess, sys, time, urllib.request

args = sys.argv[1:]
def opt(nombre, defecto=None):
    if nombre in args:
        i = args.index(nombre); v = args[i + 1]; del args[i:i + 2]; return v
    return defecto
PORT = opt('--port', '5390'); CLIMA = opt('--clima', 'nublado'); LUZ = opt('--luz', 'dia')
OUT = os.path.abspath(opt('--out', './pixel')); REDUCIDO = '--reducido' in args
SERIAL = os.environ.get('RAVEN_SERIAL', '1A261FDEE003G6')
HOST, CDP = 'localhost', 9222
os.makedirs(OUT, exist_ok=True)
TAG = f'{CLIMA}-{LUZ}' + ('-reducido' if REDUCIDO else '')

def adb(*a, timeout=40):
    return subprocess.run(['adb', '-s', SERIAL] + list(a), capture_output=True, text=True, timeout=timeout)

def log(*m): print('[pixel', TAG + ']', *m, file=sys.stderr)

adb('shell', 'svc', 'power', 'stayon', 'true'); adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
adb('reverse', f'tcp:{PORT}', f'tcp:{PORT}')
adb('forward', f'tcp:{CDP}', 'localabstract:chrome_devtools_remote')
adb('shell', 'am', 'force-stop', 'com.android.chrome'); time.sleep(1)
BASE = f'http://localhost:{PORT}'
URL_LOGIN = f'{BASE}/#login'
r = adb('shell', 'am', 'start', '-n', 'com.android.chrome/com.google.android.apps.chrome.Main',
        '-a', 'android.intent.action.VIEW', '-d', f"'{URL_LOGIN}'")
log('am start:', (r.stdout + r.stderr).strip().replace('\n', ' | ')[:160])

page = None; t0 = time.time()
while time.time() - t0 < 40 and page is None:
    try:
        for p in json.load(urllib.request.urlopen(f'http://{HOST}:{CDP}/json', timeout=6)):
            if p.get('type') == 'page' and p.get('webSocketDebuggerUrl') and f'localhost:{PORT}' in (p.get('url') or ''):
                page = p; break
    except Exception:
        pass
    if page is None: time.sleep(1.5)
if page is None:
    log('ERROR: Chrome no expone la pestaña por DevTools'); sys.exit(2)
log('PAGE:', page.get('url'))

path = page['webSocketDebuggerUrl'].split(str(CDP), 1)[1]
log('ws:', path[:60])
s = socket.create_connection((HOST, CDP), timeout=15)
s.settimeout(15)
key = base64.b64encode(os.urandom(16)).decode()
s.sendall((f'GET {path} HTTP/1.1\r\nHost:{HOST}:{CDP}\r\nUpgrade:websocket\r\nConnection:Upgrade\r\n'
           f'Sec-WebSocket-Key:{key}\r\nSec-WebSocket-Version:13\r\n\r\n').encode())
b = b''
while b'\r\n\r\n' not in b: b += s.recv(4096)

def send(o):
    p = json.dumps(o).encode(); h = bytearray([0x81]); n = len(p)
    if n < 126: h.append(0x80 | n)
    elif n < 65536: h.append(0x80 | 126); h += struct.pack('>H', n)
    else: h.append(0x80 | 127); h += struct.pack('>Q', n)
    m = os.urandom(4); h += m; s.sendall(bytes(h) + bytes(x ^ m[i % 4] for i, x in enumerate(p)))
buf = b''
def frame():
    global buf
    s.settimeout(20)
    while True:
        while len(buf) < 2: buf += s.recv(65536)
        b0, b1 = buf[0], buf[1]; ln = b1 & 0x7f; off = 2
        if ln == 126:
            while len(buf) < 4: buf += s.recv(65536)
            ln = struct.unpack('>H', buf[2:4])[0]; off = 4
        elif ln == 127:
            while len(buf) < 10: buf += s.recv(65536)
            ln = struct.unpack('>Q', buf[2:10])[0]; off = 10
        while len(buf) < off + ln: buf += s.recv(65536)
        pl = buf[off:off + ln]; buf = buf[off + ln:]
        op = b0 & 0x0f
        if op == 0x8: return None
        if op in (0x9, 0xa): continue
        return pl.decode('utf-8', 'replace')

_id = 0; page_errors = []; interceptadas = 0
VACIO = base64.b64encode(b'{"data":[]}').decode()
TOKEN = base64.b64encode(json.dumps({'access_token': 'e2e-fake-access', 'refresh_token': 'e2e-fake-refresh', 'expires_in': 3600, 'token_type': 'Bearer'}).encode()).decode()

def evento(o):
    """Eventos CDP: intercepción de red (la clave para no perder la sesión) y errores."""
    global interceptadas
    m = o.get('method'); p = o.get('params', {})
    if m == 'Fetch.requestPaused':
        url = p.get('request', {}).get('url', ''); rid = p['requestId']
        if '/oauth/token' in url:
            send({'id': 0, 'method': 'Fetch.fulfillRequest', 'params': {'requestId': rid, 'responseCode': 200,
                  'responseHeaders': [{'name': 'Content-Type', 'value': 'application/json'}], 'body': TOKEN}})
            interceptadas += 1
        elif '/api/' in url and not any(k in url for k in ('/api/mcp/', '/api/whisper', '/api/kokoro', '/api/ollama', '/api/ha/')):
            send({'id': 0, 'method': 'Fetch.fulfillRequest', 'params': {'requestId': rid, 'responseCode': 200,
                  'responseHeaders': [{'name': 'Content-Type', 'value': 'application/vnd.api+json'}], 'body': VACIO}})
            interceptadas += 1
        else:
            send({'id': 0, 'method': 'Fetch.continueRequest', 'params': {'requestId': rid}})
    elif m == 'Runtime.exceptionThrown':
        d = p.get('exceptionDetails', {}); page_errors.append(str((d.get('exception') or {}).get('description') or d.get('text'))[:200])

def call(method, params=None, to=40):
    global _id
    _id += 1; idn = _id
    send({'id': idn, 'method': method, 'params': params or {}})
    t = time.time()
    while time.time() - t < to:
        f = frame()
        if f is None: raise RuntimeError('ws cerrado')
        o = json.loads(f)
        if o.get('method'): evento(o)
        if o.get('id') == idn: return o.get('result', o)
    raise TimeoutError(method)

def bombear(segundos):
    """Espera atendiendo eventos (sin esto la intercepción no responde y la app se cuelga)."""
    fin = time.time() + segundos
    while time.time() < fin:
        s.settimeout(max(0.2, fin - time.time()))
        try:
            f = frame()
        except socket.timeout:
            continue
        if f is None: return
        o = json.loads(f)
        if o.get('method'): evento(o)

def evaluar(js, to=40):
    r = call('Runtime.evaluate', {'expression': js, 'returnByValue': True, 'awaitPromise': True}, to)
    return r.get('result', {}).get('value')

call('Runtime.enable'); log('Runtime.enable ok'); call('Page.enable'); call('Network.enable'); log('Network.enable ok')
# el service worker de la PWA re-emite los fetch desde SU contexto y el dominio Fetch de la
# página no los ve (memoria feedback-sw-shadows-playwright-route): se puentea el SW.
call('Network.setBypassServiceWorker', {'bypass': True})
call('Fetch.enable', {'patterns': [{'urlPattern': '*'}]})
if REDUCIDO:
    call('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-reduced-motion', 'value': 'reduce'}]})

# 1) sesión sembrada por CDP: perfil en localStorage + token en localforage (IDB Chagra/syncQueue)
PERFIL = json.dumps({'nombre': 'Finca de prueba', 'municipio': 'Guatavita, Cundinamarca', 'departamento': 'Cundinamarca',
                     'vereda': 'Páramo alto', 'ubicacion_lat': 4.935, 'ubicacion_lng': -73.833, 'finca_altitud': 2900,
                     'piso_termico': 'páramo', 'cultivos_actuales': 'papa, mora'})
bombear(4)
evaluar(f"""(() => {{ const ls = localStorage; const p = {json.dumps(PERFIL)};
  for (const k of ['chagra:profile:done:v1:e2e-operator','chagra:profile:done:v1']) ls.setItem(k, '1');
  for (const k of ['chagra:profile:v1:e2e-operator','chagra:profile:v1']) ls.setItem(k, p);
  ls.setItem('chagra:tenant:active', 'e2e-operator'); return 'ok'; }})()""")
# login por el formulario real (la app guarda el token; /oauth/token está interceptado)
listo = False
for _ in range(20):
    ok = evaluar("""(() => { const u = document.getElementById('login-username'); const c = document.getElementById('login-password');
      if (!u || !c) return false;
      const set = (el, v) => { const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; d.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
      set(u, 'e2e-operator'); set(c, 'e2e-pass');
      const b = [...document.querySelectorAll('button[type=submit]')].find((x) => /ingresar/i.test(x.textContent)); if (!b) return false; b.click(); return true; })()""")
    if ok: listo = True; break
    bombear(1.5)
log('formulario de login enviado:', listo, 'interceptadas:', interceptadas)
bombear(6)
# 2) la pantalla con la piel pedida
call('Page.navigate', {'url': f'{BASE}/?clima={CLIMA}&luz={LUZ}#/clima-boletin'})
t0 = time.time(); vista = False
while time.time() - t0 < 60:
    bombear(1.5)
    try:
        if evaluar("!!document.querySelector('[data-testid=\"clima-boletin-screen\"]')", 10): vista = True; break
    except Exception: pass
log('pantalla del boletín visible:', vista, f'en {time.time()-t0:.1f}s', 'interceptadas:', interceptadas)
if not vista:
    txt = evaluar('document.body.innerText.slice(0, 240)')
    log('texto:', repr(txt)); adb('exec-out', 'screencap', '-p')
bombear(10)  # asentamiento (como pixel-fps.py: ARRANQUE + 10 s)

estado = evaluar("""JSON.stringify((() => { const r = document.querySelector('.ca-atmosfera'); const op = (q) => { const e = document.querySelector(q); return e ? getComputedStyle(e).opacity : 'ausente'; };
  return { clima: r && r.dataset.clima, luz: r && r.dataset.luz, capaNubes: op('.ca-capa--nubes'), techo: op('.ca-techo'), nube: op('.ca-nube'), dpr: devicePixelRatio, w: innerWidth, h: innerHeight, ua: navigator.userAgent.slice(0, 80),
    reducido: matchMedia('(prefers-reduced-motion: reduce)').matches, animaciones: document.getAnimations().length }; })())""")
log('estado:', estado)
def medir():
    return evaluar("""new Promise((res) => { let n = 0; const t0 = performance.now();
      const tick = () => { n++; if (performance.now() - t0 < 5000) requestAnimationFrame(tick); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); };
      requestAnimationFrame(tick); })""", 20)
f1 = medir(); bombear(1); f2 = medir()
mediana = sorted([f1, f2])[0] if abs(f1 - f2) < 0.01 else (f1 + f2) / 2
log(f'fps: {f1} y {f2} → mediana {mediana}')
cap = os.path.join(OUT, f'{TAG}-pixel.png')
subprocess.run(['adb', '-s', SERIAL, 'exec-out', 'screencap', '-p'], stdout=open(cap, 'wb'), timeout=60)
log('screencap:', cap, os.path.getsize(cap), 'bytes')
res = {'tag': TAG, 'url': f'{BASE}/?clima={CLIMA}&luz={LUZ}#/clima-boletin', 'vista': vista, 'fps': [f1, f2], 'fpsMediana': mediana,
       'estado': json.loads(estado) if estado else None, 'pageErrors': page_errors[:10], 'interceptadas': interceptadas, 'screencap': cap,
       'fecha': time.strftime('%Y-%m-%dT%H:%M:%S')}
open(os.path.join(OUT, f'{TAG}-pixel.json'), 'w').write(json.dumps(res, indent=2, ensure_ascii=False))
print(json.dumps(res, ensure_ascii=False))
try:
    urllib.request.urlopen(f'http://{HOST}:{CDP}/json/close/{page["id"]}', timeout=6).read()
except Exception: pass
adb('shell', 'am', 'force-stop', 'com.android.chrome')
sys.exit(0 if vista else 1)
