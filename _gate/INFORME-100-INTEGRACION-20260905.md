# INFORME-100 · Verificación de integración (runner nuevo + difusión) · 2026-09-05

Carril: `opencode` (segundo carril de la tarea #100, después del cierre de cx).
cwd: `/home/kortux/Workspace/chagra` · Brief recibido: 2026-09-05T09:18 (generado por el tick).
Rol de este carril: cerrar lo que cx dejó como «pendiente de integración» desde un runner nuevo,
respetando su regla dura (NO tocar el token, NO ejecutar `tg-send` instalado ni `identify`/`magick`/`convert`).

## 1. Difusión de las 2 reglas del brief base → CONFIRMADA en un brief real

El pendiente de cx era: *«la difusión de las 2 reglas del brief base a los carriles que vengan»*.
Este carril ES uno de esos carriles, y el brief que recibí (generado 2026-09-05T09:18 por el runner nuevo)
trae las dos reglas verbatim:

1. En **MEDIR SIN MENTIRSE**: *«Ante "la herramienta X no existe": verificá con `command -v X` y reportá
   el path que responde. NO concluyas que no está instalada porque no está en tu PATH ni te fabriques un
   sustituto por cuenta propia»*.
2. En **CÓMO SE ENTREGA**: *«Capturas para el operador: mandalas con `tg-send <archivo> <caption>` … Registrá
   el `msg_id` que imprime en tu informe. Si el archivo no existe o la API no responde `ok`, el comando sale
   `!=0` y esa entrega es NO REALIZADA»*.

Conclusión: el `_PREAMBULO.txt` editado por cx ya alimenta los briefs compilados por tick. El canal
difusión → carril funciona de punta a punta.

## 2. PATH de la flota → CONFIRMADO en vivo (no en subshell)

Este carril fue despachado con el runner nuevo. Mi PATH de sesión termina en `~/.nix-profile/bin`
(APPEND, exactamente el diseño de cx) y NO pisó nada de lo que ya resolvía. Verificado con `command -v`
(regla que el propio brief pide; no ejecuté ninguna de las herramientas):

```
identify    => /home/kortux/.nix-profile/bin/identify
magick      => /home/kortux/.nix-profile/bin/magick
convert     => /home/kortux/.nix-profile/bin/convert
tg-send     => /home/kortux/.local/bin/tg-send
curl        => /run/current-system/sw/bin/curl   (no se pisó)
```

O sea: el falso negativo de deepseek («ImageMagick no está en alpha») ya no puede repetirse en un carril nuevo.
`identify` NO se ejecutó (prohibido por la regla dura de este carril); solo se confirmó su resolución.

## 3. Control negativo re-ejecutado en el repo, contra `_gate/tg-send.v2`

Re-corrí el control B (comportamiento NUEVO) 100% dentro del cwd: el wrapper en copia `_gate/tg-send.v2`,
curl stub propio dentro de `_gate/.t100-verify` (sin red, sin tocar el `~/.config` real, token dummy en un
HOME de arena). Resultado, crudo:

```
B1. PNG inexistente
  tg-send: .../_gate/NO-EXISTE.png NO existe (argumento con extensión de archivo) — sin envío, ENTREGA NO REALIZADA
  rc=1 · 0 llamadas a curl

B2. --doc inexistente
  tg-send: --doc: archivo no existe: .../NO-EXISTE.pdf — no se manda la ruta
  rc=1 · 0 llamadas a curl

B3. texto plano normal (no debe romperse)
  ok:true msg_id=77777 · rc=0 · llamadas: /sendChatAction + /sendMessage

B4. PNG existente (debe ir a sendPhoto)
  ok:true msg_id=77777 · rc=0 · llamadas: /sendChatAction + /sendPhoto
```

Lectura: el gotcha cerrado por cx se reproduce cerrado. Sin archivo válido no hay UN request a Telegram y el
envío es un error ruidoso `rc=1` con la marca ENTREGA NO REALIZADA (antes: ruta mandada como texto con
`ok:true` y `exit 0`). El texto plano y el PNG válido siguen funcionando y la API imprime `msg_id`.
La arena se borró al terminar (`_gate/.t100-verify` eliminado); no quedó token ni stub en el árbol.

## 4. Estado de los artefactos en el repo

Siguen SIN commitear, esperando el rescate del operador (igual que los de la mañana, #3154):
- `_gate/INFORME-100-TELEGRAM-ESCLAVOS-20260905.md` (cierre de cx)
- `_gate/tg-send.v2` (copia de control del wrapper endurecido)
- `_gate/tg100-control.sh` (harness A/B con curl-stub, referencias a rutas fuera del repo)
- `_gate/INFORME-100-INTEGRACION-20260905.md` (este archivo)

Este carril NO commitea: la rama activa del checkout principal (`fix/audit-symlink-colgante-20260905`) es del
operador y está en movimiento; el patrón de la casa es que el rescate de `_gate/` lo haga el operador con
plumbing (como #3154), no un carril sobre la rama ajena.

## 5. Límites declarados (lo que este carril NO pudo/quiso verificar)

- **No ejecuté el `tg-send` instalado** (`~/.local/bin/tg-send`) ni toqué el token: prohibidos por la regla
  dura de este carril. La prueba positiva REAL con `msg_id=6540` queda como la registró cx en su INFORME
  (§3.3), hecha en su carril que sí tenía permitido el camino.
- **No ejecuté el lado A (comportamiento viejo)**: el binario de respaldo (`tg-send.bak-20260905-100-harden`)
  está fuera del cwd y prohibido. La reproducción A1 (ruta como texto, `rc=0`, `"ok":true`) descansa en la
  salida cruda que cx dejó en su INFORME (§3.1).
- **La identidad instalado-`vs`-`.v2`** (que el wrapper instalado == `_gate/tg-send.v2`) es afirmación de cx
  (diff contra backup en su carril); acá solo pude verificar el comportamiento de la copia `.v2` en el repo.
- **No corrí el tick completo del timer**: lo que confirmo es (a) un brief real generado a las 09:18 trae las
  2 reglas, y (b) el entorno de un carril despachado después del fix ya resuelve las herramientas. El cierre
  del círculo (un tick entero despachando + capturando + mandando) es la pasada del operador.
- El trade-off del guard de extensión ya lo declaró cx y aplica igual: un texto que termina en `.png` se
  rechaza como archivo inexistente en lugar de enviarse como texto.

## 6. Veredicto de la Definición de hecho de la tarea #100

| DoD | Estado |
|---|---|
| Esclavo manda captura desde su cwd y `msg_id` queda registrado | ✅ cx: `msg_id=6540` (prueba real, red) |
| Sin PNG válido el envío falla ruidoso | ✅ re-verificado acá: `rc=1`, 0 requests, marca NO REALIZADA |
| `command -v identify` responde en un esclavo | ✅ re-verificado en vivo: runner nuevo resuelve `~/.nix-profile/bin/identify` |
| Briefs de la flota con el camino de envío | ✅ confirmado: brief real de las 09:18 trae la regla `tg-send` + `msg_id` + NO REALIZADA |

La tarea #100 está cerrada de hecho y de integración; queda pendiente solo el rescate-git de los artefactos
de `_gate/` (sección 4), que es del operador.
