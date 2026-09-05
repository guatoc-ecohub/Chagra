# INFORME GATE VISUAL · Portal 2D→3D en TINTA (PR #3140)

Fecha: 2026-09-05 · Carril: `opencode` (gate-visual-portal-tinta-telegram-20260905)
Repo: `/home/kortux/Workspace/chagra` · Código evaluado: `origin/dev` @ `1e454471e` (incluye merge PR #3140 `b3e129f1f`)
Harness: rama local `chore/gate-portal-tinta-20260905` en worktree `.worktrees/gate-portal-tinta-20260905`
Veredicto del ojo: **SIN-CERTIFICAR** (el modelo de este carril no ve píxeles; se usó juez VL local + medidas de píxel + sonda DOM. El operador juzga sobre el crudo).

## 1. Qué se gateó

El merge #3140 cambió el `PortalComponent` (cuerpo que cruza 2D→3D en `CompaiTransicion` → `AbejaTransicion`) de los tres compais a la TINTA `*Trazado`:

| compai | piel VIEJA (rubber-hose) | piel NUEVA (tinta) | verificado |
|---|---|---|---|
| zariguya | `Zariguya` | `ZariguyaTrazado` | monta como zariguya |
| luciernaga | `Luciernaga` | `LuciernagaTrazado` | monta como luciernaga |
| chivito-punk | `ChivitoPunk` | `ChivitoTrazado` | monta como chivito-punk |
| oso-baston (CONTROL) | `OsoBaston` (se conserva) | `OsoBaston` | monta como oso-baston |

El control es el oso: si la lámina del oso se viera con el mismo lenguaje de tinta que los otros tres, el harness estaría mintiendo. No fue el caso (ver §4 y §5).

## 2. Método

- **Harness**: `tests/visual/portal-tinta-gate-harness.{html,jsx}` (nuevo, temporal, sin snapshots). Monta el cuerpo EXACTO del registro (`resolverCompai(tipo).PortalComponent`), es decir lo que monta el handoff real. Cada compai se muestra sobre papel (`#f4efe2`) y sobre noche (`#101623`), grande (300 px para juicio de anatomía) + el tamaño real de cruce (76 px) + 32 px. `?tipo=<slug>` aísla un compai; sin query monta los cuatro.
- **Estados canónicos** elegidos por especie (lo que el brief no decía y se completó contra el contrato existente): chivito-punk montado `punk + modo=actuando` (la cresta punk solo existe cuando actúa, contrato de `ChivitoTrazado`); luciérnaga por defecto (linterna normal); zarigüeya y oso por defecto (idle / acompana). Cero props inventadas por encima del contrato.
- **Servidor**: vite dev en `127.0.0.1:5249` (worktree, `node_modules` symlink al checkout principal). Canario por CONTENIDO (título + módulo compilado + registro 200), no por HTTP 200.
- **Captura**: `microapp-shot` (SVG en DOM, no WebGL) a 700x485 por compai y 1180x660 para la vista general. Headless, sin GPU.
- **Medidas de píxel**: ImageMagick NO está instalado en alpha; se midió con `sharp` (`_gate/gpt-medidas.mjs`). Se recortó la banda del rótulo (y>=430) antes de pasarle la imagen al juez (que no debe LEER la etiqueta).
- **Sonda DOM viva** (playwright + chromium nix, `_gate/gpt-probe.mjs`): cuenta de raíces `[data-creature]`, tamaños, errores de consola y peticiones fallidas.
- **Juez**: `judge-vl` (qwen3-vl:8b local, GPU). Describe, no certifica.

## 3. Sonda DOM (hecho estructural, no visual)

Para cada `?tipo=` se montaron 6 raíces (300/76/32 x claro+noche) con `data-creature` correcto: `zariguya`, `luciernaga`, `chivito-punk`, `oso-baston`. 0 `pageerror`, 0 peticiones fallidas. Un solo aviso de consola, benigno y preexistente del patrón `CompaiAgente`: React no reconoce el atributo `data-agt-capacidad-respiraOrgano` (casing; se recomienda `respiraorgano`). Aparece solo en los dos compais envueltos en `CompaiAgente` (zariguya y oso), no en chivito/luciernaga (TrazadoBase).

```json
zariguya total=6 errs=1 pageErrs=0 reqFail=0 creature=zariguya 300x300
luciernaga total=6 errs=0 pageErrs=0 reqFail=0 creature=luciernaga 300x300
chivito-punk total=6 errs=0 pageErrs=0 reqFail=0 creature=chivito-punk 300x300
oso-baston total=6 errs=1 pageErrs=0 reqFail=0 creature=oso-baston 300x300
```

Vista general: 24 raíces, 4 secciones `[data-compai]` presentes, sin scroll recortado.

## 4. Medidas de píxel (sharp) · `_gate/medidas-pixel.txt`

Resumen (la totalidad está en el archivo):

| captura | panel claro (320x300) oscuro/claro/color % | panel noche oscuro/claro/color % |
|---|---|---|
| zariguya | 10 / 74 / 1 | 85 / 2 / 1 |
| luciernaga | 16 / 72 / 1 | 89 / 0 / 1 |
| chivito-punk | 8 / 76 / 1 | 85 / 1 / 1 |
| **oso-baston** | **26 / 56 / 5** | **88 / 2 / 5** |

- Las capturas NO están vacías: ambos fondos están presentes (papel `#3c3c3c` cuantizado en claro; noche `#04040c` a la derecha) y hay tinta dibujada (8 a 16% de píxel oscuro sobre el panel claro en las tres tintas).
- **Separación de pieles medida**: las tres tintas tienen ~1% de píxel saturado (línea de tinta, paleta chica). El oso tiene 5% (color) y sus colores dominantes sobre papel incluyen tonos cálidos (`#3c3c34`, `#34342c`, `#0c0404`). Es consistente con un control que NO es línea de tinta.

## 5. Salida cruda del juez (qwen3-vl:8b, describe no certifica)

Verbatim embebido abajo (copias parciales en disco en el área del informe: `_gate/juez-zariguya.txt` y `_gate/juez-oso-baston.txt`; los de luciérnaga y chivito van embebidos aquí para no pisar los archivos del gate anterior que el repo ya trackea).

### zariguya
"El animal dibujado es una **zarigüeya** ... Marsupial: Sí ... Hocico puntiagudo: Sí ... Cola larga: Sí ... En la imagen izquierda, **la cara está deformada**: los ojos están cubiertos por círculos negros (como gafas oscuras) ... En la imagen derecha, **la cara está intacta**: los ojos son visibles ..."

Lectura del lane: la izquierda es el panel CLARO (papel). El juez lee la máscara facial oscura de la chucha (marca de la especie) como "círculos negros sobre los ojos". Puede ser el antifaz real de la especie o un problema de contraste del trazo negro sobre papel claro. **No lo certifico ni lo descarto: requiere ojo del operador.**

### luciernaga
"un **insecto antropomórfico** ... características de insectos (6 patas, antenas, alas y cuerpo segmentado) ... alas en forma de elytra ... La cara es **intacta** ... El personaje se ve **natural** (no está dañado) ... Ambas versiones mantienen la misma anatomía." Nota del juez: el abdomen "no muestra indicio de luz" en la imagen; en tinta la linterna se representa por color/glow, el juez la leyó como abdomen amarillo claro.

### chivito-punk
"una **criatura antropomórfica de inspiración aviar** ... rasgos avianos (plumas verdes, pico puntiagudo, patas con garras) ... Un 'mohawk' de plumas blancas y moradas en la cabeza ... Cara: **Intacta** ... Natural ... El diseño es consistente entre las dos versiones."

Lectura del lane: el juez asumió "chivito = cría de cabra/venado" y por eso dijo "no corresponde"; en Chagra el chivito-punk es un ave (rig F24 compartido con la guacamaya). La descripción aviar + mohawk punk coincide con el canon. La cresta solo se ve porque se montó `actuando`.

### oso-baston (CONTROL)
"una **ilustración estilizada de un oso andino** (*Tremarctos ornatus*) ... parche blanco en el pecho y marcas faciales ... la cara del oso se muestra completa ... Es una **ilustración a color (lámina)** ... No es un dibujo monocromático de línea de tinta."

Lectura del lane: el control se lee DISTINTO (lámina a color, no tinta). Si el harness mintiera (montara tinta para todos), el juez no habría separado lenguajes. Es la mitad "¿el control se ve distinto?" del gate.

## 6. Defectos nombrados (lo que vi / lo que no pude ver)

Sin certificar, con los límites del carril (modelo sin visión):

1. **Posible ambigüedad de lectura de la zarigüeya sobre papel**: el juez lee la máscara facial como "ojos cubiertos / deformado" en el panel claro. No sé si es la marca de la especie o un trazo que pierde definición sobre claro. No lo considero defecto confirmado.
2. **Atributo DOM `data-agt-capacidad-respiraOrgano`**: advertencia de React (casing) preexistente del patrón CompaiAgente; no rompe el render. Fuera de alcance del PR.
3. Detalles que el juez describe como props ("sostiene un lápiz y un libro", "bufanda verde") no pude confirmarlos ni negarlos (pueden ser alucinación del juez sobre la silueta). No los doy por ciertos.
4. NO medí dureza de borde (ImageMagick ausente); la "separación de lenguajes" la sostengo con colorPct y el juez, no con borde.

## 7. Entrega a Telegram

Enviadas 4 capturas (1 por compai) al chat del operador:

| slug | msg_id | caption |
|---|---|---|
| zariguya | 6520 | SIN-CERTIFICAR, con la nota de la máscara facial |
| luciernaga | 6521 | SIN-CERTIFICAR |
| chivito-punk | 6522 | SIN-CERTIFICAR |
| oso-baston (control) | 6524 | SIN-CERTIFICAR, leído como lámina a color (distinto) |

PNGs: `_gate/portal-tinta-{zariguya,luciernaga,chivito-punk,oso-baston}.png` (y `_gate/portal-tinta-overview.png`, los cuatro en una imagen).

Registro en `~/.local/state/compai-capturado.txt`: **NO se pudo anotar**. La regla dura del carril prohíbe usar esa ruta (fuera del cwd, auto-rechazo). Queda el registro en este informe.

## 8. Límites declarados (lo que NO pude verificar)

- El ojo del lane no ve imágenes; el juicio fino de arte y la decisión final son del operador sobre los PNG crudos. El veredicto se entrega SIN-CERTIFICAR.
- La captura del cruce es el cuerpo en reposo/pose, no el barrel roll animado del overlay; no gateé coreografía de transición (no cambió en el PR).
- La "legibilidad real de cruce" (76 px) está incluida en cada panel; no la juzgué individualmente por falta de visión.
- ImageMagick no instalado: borde y color se midieron con sharp.

## 9. Lo que se tocó / no se tocó

- Se agregó el harness `tests/visual/portal-tinta-gate-harness.{html,jsx}` (commiteado en la rama local del carril, sin push).
- No se abrió ni capturó ningún archivo con `lamina` en el nombre. ANGELITA no se tocó. No hubo force-push, reset, branch -D ni deploy.
- Código evaluado: `origin/dev` HEAD `1e454471e`. No se modificó `compaiRegistry.js`.
