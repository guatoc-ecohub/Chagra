# Fable · piel `nublado` del boletín 2D de clima — nube-masa con panza y rotura, y VIVA

Fecha: 2026-09-06 · Rama: `fable/clima-nublado-nube-masa-20260906` (desde `astra/2d-clima-fase2-20260906`, PR #3170)
Archivos tocados: `src/components/clima/EscenaAtmosfera.jsx`, `src/components/clima/escenaAtmosfera.css`,
`src/components/clima/EscenaAtmosfera.test.jsx`. Nada más de la pantalla.

**No certifico lo visual. Nombro lo que veo y lo que no me gusta; el operador juzga.**

## 1. Qué se pidió y qué pasó en el camino

- Encargo: la piel `nublado` de #3170 era un gris parejo. El operador la rechazó y pidió
  nube-masa con panza y rotura, ≥ 30 fps en el Pixel (Mali-G78) y contraste ≥ 4,5:1.
- Corrección 1 del operador (en vivo, ~20:40): «es 0 animada, no tiene vida, es solo un fondo».
  Tenía razón: la deriva era de 1,6 vw en 90 s (invisible) y las capas vivas existentes estaban
  apagadas en `nublado`.
- Corrección 2 (~21:00): «con la cantidad de texto cualquier cosa que hagas en el fondo se va a
  perder; retoma el ejemplo de los efectos de mundo clima 3d». Referencia capturada:
  `referencia/el-tiempo-niebla.png` (la niebla llena la pantalla y pasa POR ENCIMA de la UI).
  Cambio de plano: la nube cruza por delante del boletín (z 30, como el jirón sobre la UI, #18).

## 2. Qué hay ahora (v16)

Dos planos, todos por transform/opacity, cero JS por frame, cero canvas, cero filtro vivo:

**Detrás del contenido (z 9, encima de los scrims):** techo de nubes con borde deshecho por una
máscara de ruido fractal (un SVG de ~400 bytes con `feTurbulence`, rasterizado UNA vez como imagen
de máscara), su panza (copia oscura corrida 1,4 vh hacia abajo: sombra colgante en cada lóbulo),
la rotura (lo menos oscuro del techo, con el sol adivinándose detrás y rayos crepusculares —
capa #6 reusada, respira), un banco bajo sentado sobre las cumbres detrás de las pestañas, cuatro
hilachas que barren. Todo deriva a ritmos distintos (paralaje entre techo y panza).

**Delante del contenido (z 30):** cuatro masas de nube con panza (lomo claro topado en alfa,
vientre oscuro) que cruzan la pantalla entera de izquierda a derecha en 48-76 s, tres hilachas
oscuras más rápidas (22-28 s), la sombra de la nube que oscurece la pantalla al pasar (66 s) y una
bruma que lame el borde inferior. Esto es lo que se ve aunque el ojo esté en la cifra.

**Tope de luminancia:** la anomalía aparece y desaparece según el dato y las pestañas suben 9 vh
sin ella, así que el texto puede caer en cualquier parte. Ningún píxel de la capa trasera pasa de
L≈0,13 y las masas frontales claras van a alfa ≤ 0,22: blanco ≥ 5:1 y slate-300 tras el vidrio
0,5 de las pestañas ≥ 4,8:1, caiga donde caiga.

## 3. Evidencia (todas GPU headed, 390×844 @2x, sesión E2E con OAuth falso y API farmOS a vacío)

| Qué | Ruta |
|---|---|
| ANTES (#3170, gris parejo) nublado/día | `antes/nublado-dia.png` |
| ANTES despejado/día (para ver que eran casi iguales) | `antes/despejado-dia.png` |
| Referencia del operador (`el-tiempo`, niebla) | `referencia/el-tiempo-niebla.png` |
| DESPUÉS nublado/día, cuadro completo | `final/nublado-dia.png` |
| DESPUÉS despejado/día (sin tocar), para comparar | `final/despejado-dia.png` |
| DESPUÉS nublado amanecer / atardecer / noche | `final/nublado-amanecer.png`, `final/nublado-atardecer.png`, `final/nublado-noche.png` |
| La escena sola (contenido oculto), día / atardecer / noche | `final/fondo-nublado-dia.png`, `final/fondo-nublado-atardecer.png`, `final/fondo-nublado-noche.png` |
| `prefers-reduced-motion: reduce` | `final/nublado-dia-reducido.png` (0 animaciones corriendo) |
| **VIDEO** de 23 s (17 con boletín + 6 escena sola) | `v16/nublado-dia-vivo.webm` (enviado por `tg-send`, msg 6690) |
| Tira de 6 fotogramas del video | `v16/tira-movimiento.png` |
| Iteraciones (lo que se descartó; NO versionadas, quedan en el worktree) | `v1/` … `v15/` |

Herramientas (en esta carpeta): `captura-nublado.mjs` (captura + estado + fps + contraste real
+ video), `con-x.sh` (sesión X), `recorte.mjs` (lupa), `movimiento.mjs` (¿se mueve?),
`pixel-fps-boletin.py` (fps en el Pixel por CDP, con intercepción de red).

## 4. Números

### fps (rAF 4 s, ventana al frente, M6000 headed — NO es el gate)
nublado/día 60,1 · despejado/día 60,1 · nublado/amanecer 60,0 · nublado/noche 59,8.
En el escritorio no distingue nada: la GPU sobra. El gate es el Pixel (ver §6).

### Contraste real (texto vs píxeles detrás, contenido oculto y muestreado; `min` = peor píxel)
16 textos medidos, más que los del spec (cabecera y cifra): se añadieron «se siente», anomalía y
las tres pestañas.

| Estado | mín. | quién manda |
|---|---|---|
| nublado/día | **7,86** | anomalía |
| nublado/amanecer | 8,37 | anomalía |
| nublado/atardecer | 9,18 | anomalía |
| nublado/noche | 11,66 | cifra-label |
| nublado/día reducido | 8,38 | anomalía |
| **despejado/día (NO tocado, base de #3170)** | **3,48** | pestañas 4,24 / 3,55 / 3,48 |

⚠️ Hallazgo fuera de alcance: en la base de #3170 las **pestañas** («Hoy · 7-16 días · El Niño»,
slate-300 sobre vidrio 0,5) están por debajo de 4,5:1 en `despejado` (3,48-4,24). En `nublado`
pasan (≥ 7,9) porque el banco bajo las oscurece. No lo toqué: no es la piel `nublado`.

### Movimiento (`movimiento.mjs`, fotogramas a 4 s, umbral 6 niveles)
v13 (solo fondo): 1,2-3,8 % de píxeles cambian → lo que el operador llamó «0 animada».
v16: 4,8-10,9 % con el boletín encima (la UI tapa el 80 %), 10,9 % con la escena sola.

### Tests / lint / build
`EscenaAtmosfera.test.jsx` + `ClimaBoletinScreen.test.jsx`: 25/25. ESLint `--max-warnings=0`
limpio en los dos JSX. `npm run build` verde (21 s). El inventario del test ahora incluye las
capas nuevas (`.ca-techo`, `.ca-techo-sombra`, `.ca-claro`, `.ca-techo-bajo{,-lomo,-base}`,
`.ca-nube` ×6, `.ca-pegajoso`, `.ca-frente-nublado`, `.ca-nube-frente` ×7, `.ca-sombra-pasa`,
`.ca-bruma-frente`).

## 5. Defectos que veo yo (para que el operador juzgue)

1. **La escena sigue siendo oscura.** El tope de luminancia (L ≤ 0,13 atrás, alfa ≤ 0,22 delante)
   lo impone el contraste con un boletín que escribe en toda la pantalla. La rotura es «lo menos
   oscuro», no un claro blanco como en la referencia. Si el operador quiere el cielo de la
   referencia, hay que cambiar la pantalla (menos texto, vidrio claro con texto oscuro), no la piel.
2. **Las masas frontales son veladuras.** Se ven pasar (video), pero de frente, en un fotograma
   fijo, leen como bruma gris que cruza, no como cúmulos definidos. La panza oscura les da algo
   de cuerpo; el lomo claro casi no se nota por el tope de alfa.
3. **El sol y los rayos atrás casi no se distinguen** con las tarjetas encima; se adivinan en la
   escena sola (`final/fondo-nublado-dia.png`), en el boletín apenas.
4. **Los montes y la bruma de valle quedan detrás de las tarjetas**: solo asoman en las canaletas.
5. **`nublado/noche`** es nube oscura sobre cielo oscuro: la luna velada y las luciérnagas al 0,4
   son lo único que lo hace leer como noche cubierta. Puede parecer «apagado».
6. La hilacha frontal más baja (y 69 vh) pasa por encima de las tarjetas de índices; es oscura
   (sube el contraste) pero puede leerse como una franja que «ensucia» la tarjeta.
7. La captura de contraste es de UN instante; las masas cruzan. El tope está calculado para el
   peor caso teórico, pero no medí todos los instantes.

## 6. Lo que NO pude verificar

- **fps en el Pixel 6 Pro (Mali-G78), el gate real (CA-8).** El arnés `pixel-fps-boletin.py`
  llega hasta el boletín con la piel puesta (login E2E por CDP, intercepción de red, estado
  `data-clima=nublado`, 154 animaciones registradas), pero el rAF no dispara: el teléfono tiene el
  **bloqueo de pantalla activo** (`isKeyguardShowing=true`, `locksettings get-disabled → false`:
  bloqueo seguro; `wm dismiss-keyguard`, MENU y swipe no lo abren). Evidencia cruda:
  `pixel-bloqueo.txt`, `pixel-v16-log.txt`. **Hay que desbloquear el Pixel y correr:**
  `./pixel-fps-boletin.py --port <vite> --clima nublado --luz dia --out ./pixel` (y `--reducido`).
  Sin ese número, **no afirmo que quepa en los 30 fps**. Estimación de costo, para que se sepa
  qué se está comprando: ~15 capas compuestas nuevas (5 con máscara), todas transform/opacity,
  sin repintado; lo más pesado son las máscaras a dpr 3,5 (≈ 9 M px/frame).
- El **operador juzgando el video** más allá de lo que mandó en vivo (dos correcciones).
- Contraste en **todos los instantes** de la animación (medí un instante por estado).
- Cómo se ve en el **home 3D / la puerta «El tiempo»** (fases excluidas del PR).
- **`lluvia` y `niebla`** siguen sin capa frontal: solo `nublado` tiene la nube por delante. Si el
  operador quiere ese plano en todas las pieles, es otro encargo.

## 7. Cómo reproducir

```bash
# vite propio (cacheDir propio: node_modules simlinkeado comparte .vite)
cd <worktree> && npm exec vite -- --config vite.config.fable-nublado.mjs --host 127.0.0.1 --port 5390 --strictPort
cd _gate/nublado-nube-masa-20260906
./con-x.sh node captura-nublado.mjs --port 5390 --out ./final --clima nublado --luz dia --wait-ms 12000 --fps --video
node movimiento.mjs final/nublado-dia.webm final/tira.png
```
