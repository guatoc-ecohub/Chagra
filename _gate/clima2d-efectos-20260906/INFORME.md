# Los efectos vivos del clima 2D — encendidos, no dibujados encima

**Rama** `feat/clima2d-efectos-vivos-20260906` · commit `86e86cb84` sobre `c4830b88b` (base de #3170)
**Fecha** 2026-09-06 · **Instrumento** `_gate/clima2d-efectos-20260906/barrido-clima.mjs` (headed, GPU real)

🔴 **No certifico nada visual.** Abajo van los números crudos y la lista de defectos que yo mismo veo.
Las capturas van por Telegram. **Juzga el operador.**

---

## 1. Lo que estaba roto (medido antes de tocar nada)

El diagnóstico del brief era correcto pero incompleto. Medido con el barrido sobre las 16
combinaciones (`medidas/barrido-ANTES-mismo-instrumento.json`), hay **tres** defectos, no uno:

**(a) El gating de las capas.** `nublado` de día, amanecer y atardecer: **CERO partículas
visibles**. Y las cuatro luces de `lluvia` daban el mismo cuadro entre sí, igual que las cuatro
de `niebla`, salvo el grade de noche.

**(b) La escena estaba tapada.** `.ca-scrim--alto` cubre 65 vh a opacidad 0,92 sobre un
`#06121b`: el cielo de las **16** combinaciones quedaba aplastado. Hasta el despejado de
mediodía se leía como noche. Ése es el vacío que llevó al carril anterior a pintar una nube
encima: debajo no se veía nada.

**(c) El primer plano nunca se vio.** `.ca-frente` —suelo, pasto y los cuatro frailejones—
se renderiza en y 828–921 con una ventana de 844. La escena pide `100dvh` pero vive dentro
del área que scrollea, 77 px más corta por la cabecera de la app. **Fuera de pantalla en las
16 combinaciones.**

Y de paso: `.ca-jiron` se pintaba bajo lluvia pero **nunca arrancaba** (faltaba en la regla de
`animation-play-state`); y `data-enso` se escribía en la raíz sin que **ninguna** regla lo
leyera — atributo muerto.

---

## 2. La tabla de las 16 combinaciones

Partículas con opacidad efectiva > 0,02 y su animación corriendo. Medición, no lectura del CSS.

| combinación | ANTES: qué se encendía | DESPUÉS: qué se enciende |
|---|---|---|
| `despejado` / `amanecer` | motas 16, rayos 6, astro 1, grade dorada 1 | estrellas 7, motas 16, rayos 6, astro 1, grade dorada 1 |
| `despejado` / `dia` | motas 16, rayos 6, astro 1 | motas 16, rayos 6, astro 1 |
| `despejado` / `atardecer` | motas 16, rayos 6, astro 1, grade dorada 1 | estrellas 7, motas 16, luciérnagas 11, rayos 6, astro 1, grade dorada 1 |
| `despejado` / `noche` | estrellas 26, luciérnagas 11, astro 1 | estrellas 26, luciérnagas 11, astro 1 |
| `nublado` / `amanecer` | grade dorada 0.45 | bancos 9, jirones 7, grade dorada 0.6 |
| `nublado` / `dia` | **nada** | bancos 9, jirones 7 |
| `nublado` / `atardecer` | grade dorada 0.45 | bancos 9, jirones 7, luciérnagas 11, grade dorada 0.6 |
| `nublado` / `noche` | luciérnagas 11 | bancos 9, jirones 7, luciérnagas 11, astro 0.24 |
| `lluvia` / `amanecer` | gotas 30, bancos 6, jirones 4, astro 0.12 _(jirones sin animar)_ | gotas 30, bancos 9, jirones 7, astro 0.2, grade dorada 0.3 |
| `lluvia` / `dia` | gotas 30, bancos 6, jirones 4, astro 0.12 _(jirones sin animar)_ | gotas 30, bancos 9, jirones 7, astro 0.12 |
| `lluvia` / `atardecer` | gotas 30, bancos 6, jirones 4, astro 0.12 _(jirones sin animar)_ | gotas 30, bancos 9, jirones 7, astro 0.2, grade dorada 0.3 |
| `lluvia` / `noche` | gotas 30, bancos 6, jirones 4, astro 0.12 _(jirones sin animar)_ | gotas 30, bancos 9, jirones 7, luciérnagas 11, astro 0.12 |
| `niebla` / `amanecer` | bancos 6, jirones 4, astro 0.25, jirón-UI 0.55 | bancos 9, jirones 7, rayos 6, astro 0.25, grade dorada 0.34, jirón-UI 0.34 |
| `niebla` / `dia` | bancos 6, jirones 4, astro 0.25, jirón-UI 0.55 | bancos 9, jirones 7, rayos 6, astro 0.25, jirón-UI 0.34 |
| `niebla` / `atardecer` | bancos 6, jirones 4, astro 0.25, jirón-UI 0.55 | bancos 9, jirones 7, luciérnagas 11, rayos 6, astro 0.25, grade dorada 0.34, jirón-UI 0.34 |
| `niebla` / `noche` | bancos 6, jirones 4, astro 0.25, jirón-UI 0.55 | bancos 9, jirones 7, luciérnagas 11, astro 0.25, jirón-UI 0.34 |


### 2.b Prueba de que están vivas, no solo presentes

Una partícula «encendida» cuenta solo si su opacidad efectiva supera 0,02 **y** su animación está
en `running`. El mismo `barrido.json` lo registra por grupo (`particulas[grupo].visibles` y
`.animando`); esto es su resumen:

| combinación | partículas visibles Y animando: ANTES | DESPUÉS |
|---|---:|---:|
| `despejado/amanecer` | 22 | 29 |
| `despejado/dia` | 22 | 22 |
| `despejado/atardecer` | 22 | 40 |
| `despejado/noche` | 37 | 37 |
| `nublado/amanecer` | **0** | 16 |
| `nublado/dia` | **0** | 16 |
| `nublado/atardecer` | **0** | 27 |
| `nublado/noche` | 11 | 27 |
| `lluvia/amanecer` | 36 | 46 |
| `lluvia/dia` | 36 | 46 |
| `lluvia/atardecer` | 36 | 46 |
| `lluvia/noche` | 36 | 57 |
| `niebla/amanecer` | 10 | 22 |
| `niebla/dia` | 10 | 22 |
| `niebla/atardecer` | 10 | 33 |
| `niebla/noche` | 10 | 27 |

Combinaciones sin una sola partícula viva — ANTES 3/16, DESPUÉS 0/16.

Ese es el número que resuelve el encargo: **ninguna de las 16 se queda sin una sola partícula
viva.** El caso extremo era `nublado` de día, amanecer y atardecer, con cero.

## 3. Contraste — el mismo instrumento en las dos columnas

⚠️ **El instrumento heredado mentía.** Ocultaba todo el contenido (`visibility: hidden`) antes
de muestrear, así que medía *texto contra cielo* e ignoraba el fondo propio de la pastilla. Daba
aprobados falsos. El corregido vuelve transparente **solo el glifo**, y se valida en cada corrida
contra dos controles de valor analítico conocido: devuelve **21,00:1** y **4,54:1** exactos.

El gate ya no son 8 objetivos curados sino **los 27 nodos de texto** de la pantalla.

| combinación | peor texto ANTES | peor texto DESPUÉS |
|---|---|---|
| `despejado` / `amanecer` | **3.07:1** | 8.33:1 |
| `despejado` / `dia` | **1.71:1** | 6.15:1 |
| `despejado` / `atardecer` | **3.07:1** | 8.48:1 |
| `despejado` / `noche` | 8.92:1 | 10.90:1 |
| `nublado` / `amanecer` | **2.08:1** | 6.67:1 |
| `nublado` / `dia` | **1.97:1** | 5.29:1 |
| `nublado` / `atardecer` | **2.08:1** | 6.67:1 |
| `nublado` / `noche` | 7.44:1 | 10.57:1 |
| `lluvia` / `amanecer` | **3.57:1** | 8.90:1 |
| `lluvia` / `dia` | **3.58:1** | 8.92:1 |
| `lluvia` / `atardecer` | **3.59:1** | 8.90:1 |
| `lluvia` / `noche` | 5.47:1 | 10.66:1 |
| `niebla` / `amanecer` | **1.49:1** | 7.29:1 |
| `niebla` / `dia` | **1.38:1** | 7.01:1 |
| `niebla` / `atardecer` | **1.34:1** | 7.28:1 |
| `niebla` / `noche` | **2.00:1** | 8.65:1 |

Combinaciones por debajo de 4,5:1 — **ANTES 13/16, DESPUÉS 0/16**. Mínimo global **1.34:1 → 5.29:1**.

Las dos columnas miden el **mismo conjunto**: `nTextos` = 27 en la referencia y 27 después, en las 16. `flotantesApartados` = 1 y 1 respectivamente — el compai flotante queda **fuera del muestreo en las dos columnas**, y el JSON lo registra por combinación.

El **compai flotante** (z-index 40, 84×84, sin clase) se pasea por encima del boletín y tumba
cualquier texto que le quede debajo hasta **1,17:1**. Es un elemento de la app, ajeno a la escena
de clima, y va con posición dependiente del tiempo: se aparta del muestreo en **las dos** columnas
para no contaminar la comparación, y cada corrida lo deja registrado en `flotantesApartados`.
**Lo reporto, no lo toqué.** Con él en pantalla el mínimo medido baja a **1,10:1**
(`medidas/barrido-DESPUES-con-compai-flotante.json`, `flotantesApartados: 0` en las 16): golpea
solo a las combinaciones sobre las que le toca pasar, y cambia de una corrida a otra porque su
posición depende del tiempo. Es un techo que ninguna mejora de la escena puede levantar.

## 4. fps en el Pixel 6 Pro (Mali-G78) — el gate real

Por Chrome DevTools sobre el equipo físico, dos conteos rAF de 5 s cada uno.

| combinación | base | shippeado |
|---|---|---|
| `nublado` / `dia` | 51,9 · 53,4 → **52,65** | 53,1 · 49,1 → **51,1** |
| `lluvia` / `noche` | 55,3 · 52 → **53,65** | 52,7 · 49,3 → **51** |
| `despejado` / `noche` | 52,6 · 57,1 → **54,85** | 47,5 · 51,2 → **49,35** |
| `niebla` / `atardecer` | — | 53,1 · 52,9 → **53** |

**Gate ≥30 fps: pasa con margen** — la peor mediana es 49,35. Las cuatro medidas «shippeado» son
sobre el código que va en el PR. El costo real está entre 1,6 y 5,5 fps, mayor en
`despejado/noche` (−5,5). La varianza entre los dos conteos de un mismo estado llega a 4 fps, así
que para `nublado` y `lluvia` la diferencia está dentro del ruido; para `despejado/noche` no.

## 5. Qué reasigné y con qué criterio

| capa | antes | ahora | por qué |
|---|---|---|---|
| bancos + jirones | solo niebla (y congelados con lluvia) | + techo de nubes en `nublado`, re-tintado gris y 1,9× más lento; ampliados 6→9 y 4→7 | Es el único material de la escena que sabe parecer masa de aire en movimiento. Un cielo cubierto ES eso visto desde abajo. |
| parche claro del cubierto | no existía | dentro de `.ca-cielo--nublado`, debajo del techo | Lo primero que se reconoce de un cielo cubierto es dónde está el sol. Va en el cielo y no en el disco del astro **porque un disco tiene borde y un estrato no** (§6). |
| estrellas | solo noche despejada | + crepúsculo despejado, solo las brillantes (`:nth-child(4n+1)`, 7 de 26) | A media luz solo se ven los astros de primera magnitud. El arreglo ya marcaba las grandes en los índices múltiplos de 4. |
| rayos | mediodía y hora dorada despejados | + sol atravesando la niebla, y **por encima** de ella | El haz volumétrico solo se ve si hay partículas que lo revelen: su sitio natural no es el cielo limpio, es la niebla. Estaba en z 2, debajo de dos capas casi opacas. |
| luciérnagas | solo noche despejada | + atardecer despejado y cubierto, noche y atardecer de niebla, apenas 0,14 bajo aguacero | Salen al caer la tarde y su mejor noche es la húmeda y cubierta; la lluvia fuerte las apaga. |
| motas doradas | soleado y dorada | **sin cambio** | Una mota dorada exige un haz. Bajo cielo cubierto no lo hay: darle polvo dorado al nublado habría sido decorar, no describir. Al nublado le toca el techo de nubes. |
| grade dorada | solo despejado y nublado crepusculares | + lluvia y niebla crepusculares | El aguacero de las cinco tiene luz cálida por debajo; la niebla del amanecer es la postal del páramo. |
| astro | 0 en nublado | disco velado en la noche cubierta; posición espejada según amanezca o atardezca | El sol sale por el oriente. Antes amanecer y atardecer eran el mismo cuadro. |
| `data-enso` | **ninguna regla lo leía** | multiplica la humedad de la escena (Niño 0,84 · Niña 1,14) | El Niño en piso frío despeja el cielo —por eso hiela de madrugada—; La Niña lo carga. |

## 6. Defectos que yo mismo veo y no resolví

1. **El techo de nubes lee a bandas horizontales.** Nueve bancos anchos a distinta altura
   producen franjas. Lo suavicé bajando el cuerpo, pero **sigue ahí y es lo que más se le nota
   al `nublado`**. Arreglarlo de verdad pide otro material, no otro token.
2. **En el teléfono la escena es casi toda telón.** La columna de cartas ocupa la pantalla; el
   cielo se ve en la banda de la cabecera y en los huecos entre cartas. Encender las capas no
   cambia eso: es la composición de la pantalla. Se ve en la captura del Pixel.
3. **Los rayos en la niebla del amanecer no los veo**, aunque estén encendidos y animando: el
   haz cálido sobre niebla cálida casi no tiene contraste. En `niebla/dia` sí se ven.
4. **Los frailejones quedan chicos.** La regla móvil del original le da a `.ca-frente` un
   `aspect-ratio` que en 390 px lo deja en 93 px de alto: se leen como matas, no como
   frailejones. Ya no están fuera de pantalla, que era el defecto grave, pero de ahí a que se
   luzcan hay un trecho.
5. **El descuento de 77 px de la cabecera está quemado en un token** (`--ca-tope-app`). Es la
   altura medida de un chrome ajeno a esta pantalla. Si esa cabecera cambia, el primer plano se
   descuadra. Lo correcto sería medir el alto real del área que scrollea.
6. **El compai flotante tumba el contraste a 1,17:1** cuando se para encima de un texto. No es
   de la escena de clima y no lo toqué.
7. Las pestañas quedaron con fondo **sólido** (antes translúcido). Es lo que las vuelve legibles
   con cualquier cielo detrás, pero es un cambio de aspecto: si el operador prefiere el vidrio,
   se revierte y se paga con contraste.

## 7. Cómo reproducir

```
npx vite --port 5391 --strictPort                     # en la raíz del worktree
_gate/clima2d-efectos-20260906/con-x.sh node \
  _gate/clima2d-efectos-20260906/barrido-clima.mjs \
  --port 5391 --out ./salida --shots --fps            # las 16, contraste y capturas
python3 _gate/clima2d-efectos-20260906/pixel-fps-boletin.py \
  --port 5391 --clima nublado --luz dia --out ./pixel # fps en el Pixel
```

Gates de código: `vitest` 30/30 · `eslint --max-warnings=0` limpio · `npm run build` en verde.
