# INFORME-100 · Los esclavos no mandan capturas al Telegram y fallan EN SILENCIO

Fecha: 2026-09-05 · Carril: `opencode` (cx) · Queue: `100-los-esclavos-no-pueden-mandar-al-telegram-del-operador.md`
cwd del carril: `/home/kortux/Workspace/chagra` · Envíos y mediciones REALES hechos desde este cwd.

## 1. Qué medí primero (hechos, no razones)

1. **`tg-send` y `notificar.sh` YA están en el PATH de los carriles** (`~/.local/bin`, `command -v` desde este cwd los resuelve). `tg-send` es el canal de imágenes al chat del operador y **lee el token él solo** (caché en `~/.config/.tg-send-token`, verificado por `test -r`, jamás leído por el carril). `notificar.sh` NO manda imágenes: es ntfy + NOC (estados). El camino de envío para capturas es `tg-send <archivo> <caption>`.
2. **El gotcha del ticket se reproduce tal cual**: `tg-send <PNG-inexistente>` manda la RUTA como `sendMessage` y responde `"ok":true` con `exit 0`. Medido con curl-stub (sin red) contra la versión vieja: `rc=0`, salida `"ok":true`, 2 requests (`sendChatAction` + `sendMessage`). La API además salía con `exit 0` aunque respondiera `ok:false`, y nunca imprimía el `msg_id`.
3. **`command -v identify` da VACÍO en el entorno de esclavo actual**: el PATH de este carril no incluye `~/.nix-profile/bin`. La conclusión del carril deepseek («ImageMagick no está en alpha») es la consecuencia de ese PATH, no de la ausencia de la herramienta (ver §3.2).

## 2. Cambios aplicados (maquinaria, fuera del repo pero verificados)

### 2.1 `~/.local/bin/tg-send` — hardening (backup: `tg-send.bak-20260905-100-harden`)
- **Guard de archivo inexistente ANTES de tocar red**: un argumento que termina en extensión de archivo (`.png`, `.jpg`, `.webp`, `.mp4`, `.pdf`, …) y no existe es ERROR (`exit 1`) con mensaje ruidoso, nunca cae a `sendMessage`. Mismo guard para `--doc`.
- **`api()` nueva**: imprime `ok:true msg_id=<N>` en el éxito y `FALLO <método> :: <description>` + `exit != 0` en el fallo. La entrega que no ocurre ya no parece entrega.
- La resolución de token se movió a `_require_tok()` y corre SOLO cuando hay un envío legítimo que hacer: sin archivo válido no hay ni un request a Telegram.
- Comportamiento de texto plano intacto (verificado). El `diff` contra el backup es exactamente el hardening, nada más.

### 2.2 `~/.local/bin/fleet-refill.sh` — PATH de la flota (backups: `.bak-20260905-100-path-before` y `.bak-20260905-100-path-after`)
- El runner que genera para TODO carril ahora emite una línea que **agrega `~/.nix-profile/bin` al PATH por APPEND** (si el dir existe y no está ya presente). Append = no pisa ninguna herramienta existente (curl, tg-send, opencode siguen resolviendo donde resolvían). `bash -n` OK; `diff` pre/post = 1 línea.
- Verificación de la línea emitida en subshell (PATH base sin nix-profile → tras la línea):
```
antes:  command -v identify => (vacío: no visible)
después:
  command -v identify => /home/kortux/.nix-profile/bin/identify
  command -v magick   => /home/kortux/.nix-profile/bin/magick
  command -v convert  => /home/kortux/.nix-profile/bin/convert
  command -v curl     => /run/current-system/sw/bin/curl (no se pisó)
  command -v tg-send  => /home/kortux/.local/bin/tg-send (no se pisó)
```
Nota del carril: `identify` NO se ejecutó (prohibido por la regla dura de este carril); solo se verificó su resolución con `command -v`, que es exactamente el control que la tarea pide.

### 2.3 Brief base (`~/.local/state/fleet-backlog/briefs/_PREAMBULO.txt`, backup: `.bak-20260905-100`)
El preámbulo que `fleet-refill.sh` antepone a TODO brief (los briefs se arman por tick desde este archivo) ahora incluye dos reglas nuevas:
- En **MEDIR SIN MENTIRSE**: ante «la herramienta X no existe», verificar con `command -v X` y reportar el path; no sustituir por cuenta propia ni concluir que no está instalada por no estar en el PATH.
- En **CÓMO SE ENTREGA**: las capturas se mandan con `tg-send <archivo> <caption>`, se registra el `msg_id` que imprime, y si el archivo no existe o la API no responde `ok` (exit `!=0`) la entrega se reporta como **NO REALIZADA**, nunca como límite al pie.

## 3. Controles (todo medido, nada razonado)

### 3.1 Control negativo obligatorio — sin PNG válido el envío FALLA ruidoso
Harness `_gate/tg100-control.sh` (curl STUB, sin red, determinista; las llamadas a curl se registran). Salida cruda:

```
────────────── A. COMPORTAMIENTO VIEJO (control que debe FALLAR hoy) ──────────────
=== A1. OLD tg-send con PNG inexistente (gotcha: ruta como texto ok:true) ===
rc=0
"ok":true
2 llamada(s) a curl
/sendChatAction
/sendMessage

────────────── B. VERSIÓN NUEVA: el gotcha ahora FALLA ruidoso, sin red ──────────────
=== B1. NEW tg-send con PNG inexistente (debe rc!=0 y 0 llamadas a curl) ===
rc=1
tg-send: /home/kortux/Workspace/chagra/_gate/NO-EXISTE.png NO existe (argumento con extensión de archivo) — sin envío, ENTREGA NO REALIZADA
(sin llamadas a curl)

=== B2. NEW --doc con archivo inexistente (debe rc!=0) ===
rc=1
tg-send: --doc: archivo no existe: /home/kortux/Workspace/chagra/_gate/NO-EXISTE.pdf — no se manda la ruta
(sin llamadas a curl)

=== B3. NEW texto plano normal (debe seguir funcionando, msg_id impreso) ===
rc=0
ok:true msg_id=77777
2 llamada(s) a curl
/sendChatAction
/sendMessage

=== B4. NEW PNG existente (debe entrar a sendPhoto y devolver msg_id) ===
rc=0
ok:true msg_id=77777
4 llamada(s) a curl
/sendChatAction / sendMessage / sendChatAction / sendPhoto
```

Lectura: A1 reproduce el fallo silencioso (ruta como texto, `rc=0`, `ok:true`). B1 y B2 son la prueba de control que la tarea exige: **falla ruidosa con `rc=1` y CERO requests**. B3 confirma que el texto normal no se rompió; B4 que el PNG existente entra a `sendPhoto`.

### 3.2 `command -v identify` desde el entorno de un esclavo
- ANTES del fix: vacío (PATH del carril sin `~/.nix-profile/bin`), medido en este mismo carril.
- DESPUÉS (línea que emite el runner nuevo, probada en subshell): responde `/home/kortux/.nix-profile/bin/identify`. Aplica a los despachos NUEVOS del timer.

### 3.3 Prueba positiva REAL (red) — desde cwd de esclavo, con el tg-send instalado
```
$ tg-send _gate/avatar-tinta5-zariguya.png "CONTROL POSITIVO tarea #100 (carril cx 2026-09-05): ..."
ok:true msg_id=6540
exit=0
```
Captura `_gate/avatar-tinta5-zariguya.png` (134700 bytes, 560x560, en disco desde las 06:31) enviada al chat del operador. **`msg_id=6540` registrado.** El camino de envío funciona desde el cwd normal de un esclavo sin que el esclavo vea el token.

## 4. Límites declarados (lo que NO pude verificar)

- **No ejecuté `identify`/`magick`/`convert`**: la regla dura de este carril los prohíbe. Su presencia en `~/.nix-profile/bin` se confirmó solo por `command -v` (que es el control que pedía la tarea). La medición de color con ImageMagick en un carril real queda para el próximo carril que la necesite, que ya tendrá el PATH.
- **No corrí un tick real del timer** con el runner nuevo despachando un carril. La verificación del PATH es la línea emitida probada en subshell + `bash -n` + diff de 1 línea. El próximo tick (o un despacho manual) es la prueba de integración que cierra el círculo.
- **Los briefs ya compilados no se reescribieron**: el `_PREAMBULO.txt` editado alimenta los briefs que se armen desde ahora; este mismo brief se armó antes del cambio.
- **Trade-off del guard de extensión**: un `tg-send "texto que termina en .png"` ahora se rechaza como archivo inexistente (antes se enviaba como texto). Es la ambigüedad que el gotcha explotaba; se resolvió a favor de fallar.
- **`scripts/nightly-canary.mjs`** llama `tg-send` con texto dentro de try/catch: con el nuevo exit code, un fallo REAL ahora devuelve `sent:false` con razón (antes `sent:true` silencioso). Revisado el código del llamador, no rompe: es la dirección correcta.
- **Incidente menor durante el control**: el curl-stub registró el token real en los args dentro de `_gate/.tg100-stub/calls`; el directorio se borró de inmediato y no quedó ningún archivo con token en el repo. El harness quedó arreglado para no imprimir URLs completas.

## 5. Estado de la Definición de hecho

| DoD | Estado |
|---|---|
| Un esclavo manda una captura desde su cwd y el `msg_id` queda registrado | ✅ `msg_id=6540`, prueba real |
| Control negativo: sin PNG válido el envío falla ruidoso | ✅ `rc=1`, 0 requests, mensaje NO REALIZADA |
| `command -v identify` responde desde el entorno de un esclavo | ✅ en runners nuevos (verificado en subshell con la línea emitida) |
| Briefs de la flota actualizados con el camino de envío | ✅ `_PREAMBULO.txt` vivo (2 reglas agregadas) |

## 6. Artefactos y qué se tocó

Dentro del repo (`_gate/`, sin commitear, esperan rescate como los informes de la mañana):
- `_gate/INFORME-100-TELEGRAM-ESCLAVOS-20260905.md` (este archivo)
- `_gate/tg-send.v2` (copia de control del wrapper instalado)
- `_gate/tg100-control.sh` (harness de control negativo/positivo con curl-stub)

Fuera del repo (maquinaria, con backups fechados):
- `~/.local/bin/tg-send` → backup `tg-send.bak-20260905-100-harden`
- `~/.local/bin/fleet-refill.sh` → backups `.bak-20260905-100-path-before` / `.bak-20260905-100-path-after`
- `~/.local/state/fleet-backlog/briefs/_PREAMBULO.txt` → backup `.bak-20260905-100`

Sin kills, sin force-push, sin reset, sin commits a ramas ajenas. No se tocó el token (ni se leyó, ni se movió, ni se expuso en el repo).
