# rigs2d/oso — capas de arte para rig 2.5D del oso del bastón (2026-08-19)

Todas las capas son PNG con alfa de **615×630** (mismo lienzo que
`compai/laminas/oso.png`): comparten registración — se apilan tal cual, sin
cuentas de UV. El color sale de la lámina real salvo lo documentado abajo.
Los cortes de CABEZA / OREJAS / MANDÍBULA / CORONA son puerto 1:1 de lo
APROBADO en `chagra/src/visual/creatures/osoLamina/{anatomia,capas}.js` — el
cuello/cabeza NO se corta distinto ni se redibuja. Lo NUEVO medido (crops con
grilla + runs oscuros por columna, `_build/`): piernas, brazo+bastón, roca.

## Entregables

| capa | qué es |
|---|---|
| `pierna-cercana.png` | Pierna viewer-izquierda (lado cercano del animal: la testa ¾ va girada a la derecha del oso ⇒ su costado derecho mira a cámara), separada LIMPIA por blob oscuro + relleno de huecos (las garras blancas entran completas por su contorno de tinta, cero redibujo). Banda de raíz y355→398 con piel real de la panza = respaldo de cadera. |
| `pierna-ocluida.png` | Pierna viewer-derecha, la raíz del muslo más comida por la panza. Misma técnica; banda de raíz y352→402. |
| `brazo-baston.png` | Deltoide + bíceps + zarpa que empuña + palo + orquídeas y tallos, UNA pieza (la zarpa va encima del palo y las orquídeas se funden con él — separarlos no tiene señal, límite ya documentado en anatomia.js). Deja el arranque del palo de respaldo bajo la corona (`hard(coronaSub)`). |
| `cuerpo-inpaint.png` | El oso SIN piernas/brazo+bastón/corona/roca, CON cabeza y cuello INTACTOS (la cabeza se sigue cortando en runtime con la polilínea aprobada). Rellenos por clonado dirigido de la propia lámina: caderas/pelvis tras los muslos (espejo vertical sobre el borde real de la panza + arco de tinta) y flanco tras el deltoide (clon sesgado a pelaje, capado a la silueta del torso-sin-brazo). Al balancear una pierna se ve cuerpo arriba y FONDO abajo, como corresponde (precedente jaguar). |
| `roca.png` | La roca sola: píxeles ocultos tras pies/palo rellenados por clonado horizontal de la propia roca + borde trasero y pliegue redibujados en tinta (color muestreado del trazo real) a través de los huecos. En marcha/roam el rig la SUELTA. |
| `cara.png` | Cabeza-render aprobada: cabeza menos orejas (solo su `baseSub` — la base queda de respaldo) menos mandíbula, restas DURAS. |
| `oreja-izq.png` / `oreja-der.png` | Piezas de oreja aprobadas (pivotes [270,58] / [410,62]). |
| `mandibula-inferior.png` | La mandíbula tal cual (corte aprobado, pivote-charnela [296,152]). |
| `corona.png` | La corona del bastón (frailejón + remate). ⚠️ En este rig viaja como **HIJA del brazo+bastón** (el palo ya no es del cuerpo). Pivote [545,178]. |
| `boca-interior.png` | **Único arte 100% nuevo del set**: fauces en técnica de grabado dentro de la ELIPSE APROBADA del runtime (`BOCA` cx336 cy158 ancho78 giro14°): cavidad con achurado cruzado, encía, 2 colmillos modestos + incisivos, lengua con surco y achurado en arcos. Paleta: crema y tinta MUESTREADAS (bezuda blanca y189-204 / trufa); lengua ladrillo apagado. |
| `boca-{cerrada,entreabierta,abierta,ancha}.png` | Visemas listos para swap: interior + dientes inferiores (viajan con la mandíbula en abierta/ancha) + mandíbula transformada sobre la charnela: cerrada 0°, entreabierta 3.5°/+6px, abierta 8°/+14px, ancha 4°/+9px/escalaX 1.08. |
| `hoja-contacto.png` | Hoja de contacto para revisión del operador (capas + recomposición + poses de prueba + visemas). |

## Orden Z propuesto en el rig

```
roca                    (FONDO; en marcha/roam se suelta)
cuerpo-inpaint
pierna-ocluida
pierna-cercana          (las piernas ENCIMA del cuerpo: la banda de raíz es
                         respaldo — en reposo la panza la tapa exacto y al
                         rotar desde la cadera la raíz sigue cubierta; el
                         relleno de pelvis del cuerpo queda DEBAJO)
brazo-baston
corona                  (HIJA del transform del brazo)
cara (+ orejas / párpado / mandíbula-o-visemas encima — como en runtime)
```

## Pivotes (px de lámina)

- `pierna-cercana`: **[222, 398]** (cadera) · corte de rodilla sugerido y470
- `pierna-ocluida`: **[348, 400]** (cadera) · corte de rodilla sugerido y450
- `brazo-baston`: **[432, 208]** (deltoide/hombro)
- `corona`: [545, 178] (aprobado) · mandíbula/visemas: [296, 152] (aprobado)
- amplitudes probadas: piernas ±6° (idle, con roca) y ±14-16° (zancada, sin
  roca); brazo +9° con corona a cuestas. Ver `_build/crops/pose-*.png`.

## Control de calidad (verificado acá, NO certificado por ojo del operador)

Recomposición en reposo (orden Z de arriba, compuesta en float) contra la
lámina original — `node _build/build-cuerpo.mjs` imprime la métrica y deja
`_build/crops/dbg-dif.png`:
**déficit 373 px** (bandas de transición de 1-2px en los filos duros, máx
39/255 puntual) · **exceso fuera de silueta 3 px** · **color distinto
1.393 px** (anillos AA de 1-2px bajo los pies: el inpaint de la roca pierde la
sombra proyectada — decisión deliberada: la sombra pertenece al pie y debe
irse con él al levantarlo; conservar el anillo dejaba un pie FANTASMA dibujado
en la roca).

Limitaciones conocidas — puntos a mirar en el gate GPU-headed + ojo del operador:
1. Muesca de la línea de la roca en el borde de las canillas (el corredor que
   separa la línea del pie muerde 2-4px donde ambos se funden). Con la roca
   detrás (reposo/idle) es invisible; en marcha se rellena con el fondo real.
2. Zancadas >±12° ensanchan el arco de la entrepierna con un borde de raíz
   algo recto (la pinza del muslo). Bajar amplitud o pedir arte de muslo
   interior si molesta.
3. El respaldo de flanco tras el deltoide clona pelaje/pecho — en levantadas
   grandes del brazo (>~12°) puede asomar un borde recto en x=480.
4. Los visemas abren la boca DENTRO del grin (elipse aprobada); a zoom 3× la
   abierta se ve ruda — a escala avatar (~150-300px) lee bien. Juicio final
   del operador en la hoja.

## Regenerar

```
node _build/build-piernas.mjs && node _build/build-brazo.mjs \
  && node _build/build-cuerpo.mjs && node _build/build-boca.mjs \
  && node _build/build-cara.mjs && node _build/render-reposo.mjs \
  && node _build/test-articulacion.mjs && node _build/build-hoja.mjs
```
(sharp se toma de `~/Workspace/chagra/node_modules`; TODA la geometría
compartida pieza↔hueco vive en `_build/lib.mjs` — si se toca una máscara hay
que rehornear piernas/brazo Y cuerpo/roca.)
