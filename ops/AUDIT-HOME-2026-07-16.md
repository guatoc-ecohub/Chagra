# AUDITORÍA DE DISEÑO/UX — El HOME "finca-viva" contra la vara Nintendo Switch

> Fecha: 2026-07-16 · Rama base: `fable/laminas-botanicas-b4` · App v1.0.55
> Alcance: **solo lectura** — auditoría que GUÍA las tomas de fable que reescriben el home.
> Método: código (`src/components/dashboard/`, `src/mockups/valle/`, `src/mockups/CaraProd3D.jsx`) +
> capturas existentes (`shots/antes-*.png`, `shots/iter1..3-*.png`, `shots/valle-*.png`).
> No se renderizó en vivo (WebGL headless no pinta el valle 3D — el fondo sale plano en captura);
> la evidencia visual son las capturas ya tomadas por las tomas anteriores.

## Referentes de la vara
- **Animal Crossing** — home acogedor, legible, jerarquía suave, "mismo mundo" en todas partes.
- **Zelda BOTW** — entrada épica: una cámara que abre el mundo antes de dejarte tocar nada.
- **Age of Empires** — los actores/íconos se leen de un golpe, sin texto, por silueta y color.

---

## El mapa de lo que hay (para no confundir piezas)

El "home" NO es una sola pantalla: es un **flujo de tres actos** que hoy viven en dos registros
visuales distintos.

| Acto | Componente | Registro visual | Captura |
|---|---|---|---|
| 1. Entrada / login | `mockups/CaraProd3D.jsx` (letrero-tranquera) | letrero de madera + form crema sobre fondo | `antes-caraprod-entrada.png` |
| 2. Portada / dashboard | `components/dashboard/FincaVivaHero.jsx` (escena 2D + 6 puertas) | **biopunk neón nocturno 2D** (SVG isométrico) | `antes-home-movil.png`, `iter1-puertas.png`, `iter2-*` |
| 3. El valle como casa | `mockups/valle/Valle3D.jsx` + `EntradaValle3D.jsx` | **andino cálido low-poly 3D** (paleta madre) | `iter3-cruce-home.png`, `valle-final-calma-c22-desk.png` |
| Cruce (2→3) | `CaraProd3D` velo dorado / `EntradaValle3D` "Levantando…" | luz que crece / **spinner de carga** | `iter3-cruce-velo.png` |

**El estándar aprobado es el VALLE** (`src/mockups/valle/DIRECCION-VALLE.md`): casa-ancla encalada,
senderos de tierra pisada, patios como afordancia diegética, jerarquía de personajes (Angelita
protagonista), velos Odyssey, paleta madre andina (`encalado #f3ecdc`, `zócalo #a35a3c`,
`teja #b0603f`). Todo lo demás se mide contra eso.

---

## Los 5 hallazgos que más mueven la aguja

1. **Congruencia rota**: la portada 2D es biopunk **neón nocturno**; el valle 3D es andino **cálido diurno** — leen como *dos juegos distintos*. Norte único: la paleta madre del valle.
2. **Los portales "la mano" no tienen jerarquía**: 6 tarjetas de igual peso con un **arcoíris de 6 tintes** (verde/teja/cielo/ámbar/uva/menta) → nada manda. Y en código siguen siendo **emojis** (dependientes de plataforma) que rompen el arte.
3. **La entrada no tiene "wow"**: el letrero de tranquera flota sobre **fondo plano oscuro** — el valle vivo que el código promete detrás NO respira en la captura. Falta la primera impresión BOTW.
4. **La transición es media magia**: el velo dorado del cruce (`cprod-velo`, 2.1s) SÍ es cine, pero entrar al valle muestra un **spinner "Levantando su finca…" + botón "Toque un lugar para entrar"** = pantalla de carga, no cámara que te mete caminando.
5. **El orden de lectura en móvil sepulta lo importante**: los 6 portales (grilla 2×3, ~112px) empujan la acción dominante, las alertas y "SU GUARDIÁN" fuera del primer pantallazo.

---

## EJE 1 — Los portales "la mano": ¿claros y vivos?

**Qué hay** (`FincaVivaHero.jsx` `buildPuertas`, líneas ~1281-1290): SEIS puertas —
Mis matas · Mis animales · El tiempo · Vender · Aprender · Toda mi finca. Grilla `2×1fr`
(móvil) / `3×1fr` (≥720px), `min-height: 112px` (cumple el target ≥96px). Cada una con un
**tinte de borde distinto** (`t-verde/teja/cielo/ambar/uva/menta`, todos `rgba(...,0.6)`).

### 1.1 — Seis colores = cero jerarquía (la "mano" se diluye) 🔴 alto impacto
- **Hallazgo**: el operador piensa en "**la mano**" (4 dedos + palma = pocas acciones fuertes),
  pero la implementación son **6 tarjetas idénticas en peso**, cada una gritando en su propio
  color. Sin un primario claro, el ojo no sabe por dónde empezar — lo contrario de Age of Empires,
  donde el actor principal se lee primero por tamaño y contraste.
- **Evidencia**: `iter1-puertas.png` / `iter2-puertas-noche.png` — 6 rectángulos gemelos, 6 halos
  de color. `.fvh-puerta.t-*` (CSS 1394-1399).
- **Recomendación concreta**:
  1. Bajar a **una sola familia de color** (verdes de la paleta madre) + **una** acento cálida
     (teja/ámbar) reservada para la acción del día. Matar el arcoíris.
  2. Jerarquía "mano": **4 portales grandes** (Matas · Animales · Tiempo · Vender) en fila/2×2
     protagonista + **2 secundarios** más chicos (Aprender · Toda mi finca) como "meñique y pulgar".
     Distintos por *tamaño y peso*, no por color.
  3. La "palma" es el agente (**Pregunte**) — que quede en el centro de la mano, no como sexta
     opción competidora.

### 1.2 — Emojis en el código rompen la dirección de arte 🔴 alto impacto
- **Hallazgo**: la versión **committeada** dibuja `<span class="fvh-puerta-emoji">{p.emoji}</span>`
  con `🌱🐔🌦️🧺📖🏡` (líneas 785, 1283-1288). Los emojis se renderizan distinto en cada SO/navegador
  (mezcla de planos, 3D, brillos), no comparten grosor de línea ni paleta, y **no son andinos**.
  En `antes-home-full.png` se ve la inconsistencia (pollo casi-3D junto a libro plano).
- **Evidencia**: `antes-home-full.png` (emoji) VS `iter1-puertas.png` (line-art de fable).
- **Recomendación**: **committear los íconos line-art de fable** (iter1/iter2) — mismo grosor de
  trazo, silueta legible, paleta madre. Es el mayor salto de legibilidad ya prototipado; solo
  falta reemplazar `p.emoji` por el componente SVG. Silueta reconocible a 40px = prueba AoE.

### 1.3 — Título "¿A dónde va?" bien, pero el actor y su destino no se anticipan 🟡
- **Hallazgo**: las tarjetas dicen el nombre pero no *muestran a dónde llevan*. "Toda mi finca"
  con casita-en-montañas es la única que insinúa un lugar; el resto son objetos sueltos.
- **Recomendación**: que cada ícono cargue **una pizca del mundo destino** (Animal Crossing:
  el ícono ya es un pedacito del sitio). Ej.: "El tiempo" con el cielo del valle detrás; "Vender"
  con el toldo del mercado. Micro-diégesis > pictograma aislado.

### 1.4 — En móvil los portales empujan lo urgente fuera de vista 🟡
- **Hallazgo**: 6 puertas en 2×3 (≥ ~600px de alto) + hero-texto + toggle "Claro/Con detalle"
  antes de ellas → la alerta glaciar, "SU GUARDIÁN" y las tareas pendientes caen muy abajo
  (`antes-home-full.png` los muestra recién tras scroll largo).
- **Recomendación**: orden de lectura del primer pantallazo: **escena viva → LA acción (Pregunte)
  → alertas del día → los 4 portales**. Aprender/Toda-mi-finca pueden vivir un peldaño abajo.

---

## EJE 2 — La escena de entrada: ¿la más mágica?

**Qué hay**: `CaraProd3D` promete (comentario de cabecera) el valle 3D vivo respirando detrás del
letrero de tranquera ("modo portada"), Angelita posada en la tabla, ciclo real del día. La
captura `antes-caraprod-entrada.png` muestra el **letrero de madera + form crema sobre un fondo
navy plano** — sin valle, sin profundidad, sin fauna.

### 2.1 — La promesa 3D no se ve: fondo plano donde debería respirar el valle 🔴 alto impacto
- **Hallazgo**: el diorama que da el "wow" (montañas, luz de la vereda, criaturas) **no está
  presente** en la entrada capturada. Sin él, la tranquera es un login bonito pero *quieto* — no
  la apertura de mundo estilo BOTW que el operador pide.
- **Evidencia**: `antes-caraprod-entrada.png` (fondo navy plano) VS el potencial en
  `valle-final-calma-c22-desk.png` (el valle sí tiene atmósfera).
- **Recomendación**:
  1. Garantizar que el valle 3D (o su **fallback 2D**) se monte **detrás** del letrero en la
     entrada real, no solo en el mockup — con parallax lento y niebla de profundidad.
  2. El **fallback 2D debe ser igual de atmosférico** que `antes-valle-ref.png` (pavas + morphos
     azules + bruma), que hoy es la entrada MÁS mágica de todas las capturas. Ese es el piso de
     calidad, no un plano B triste.
  3. **Cámara establishing**: un barrido corto (el `camaraDirector` que `DIRECCION-VALLE.md` ya
     encendió en `EntradaValle3D`) también en la portada — mostrar el valle *antes* de pedir login.

### 2.2 — Dos entradas compiten (tranquera vs. valle-ref) sin decidir cuál es 🟡
- **Hallazgo**: `antes-caraprod-entrada.png` (letrero de madera "Buenos días Chagra", cálido,
  diurno) y `antes-valle-ref.png` (logo colibrí+brote en círculo, bosque de niebla, tono verde-
  esmeralda nocturno) son **dos identidades de marca distintas** para el mismo momento.
- **Recomendación**: elegir UNA y que sea la del valle. La tranquera de madera casa con la paleta
  madre (`teja/madera/encalado`); la esmeralda-neón de `valle-ref` empuja hacia el biopunk. Si el
  norte es el valle andino cálido, la tranquera gana — pero llevándose la **atmósfera de fauna/
  bruma** de valle-ref para no perder magia.

### 2.3 — Angelita en el letrero: aprovechar la cara viva 🟢 mejora
- **Hallazgo**: `DIRECCION-VALLE.md` (pendiente #5) nota que el chip usa `AbejaAngelita` cruda,
  no la Angelita v2 (9 estados, mirada que sigue). En la entrada, una Angelita que *mira al
  usuario y saluda por la hora real* sería el detalle "vivo" que hace sonreír (Animal Crossing:
  el personaje te reconoce al entrar).
- **Recomendación**: cablear `<Angelita estado="saluda">` en el letrero, con el saludo por franja
  (`SALUDO` ya existe en `CaraProd3D`: Buenos días/tardes/noches por hora de vereda).

---

## EJE 3 — La transición al valle 3D: ¿fluida o corte seco?

**Qué hay** (dos caminos, calidad desigual):
- **CaraProd3D → valle** (cruzar la tranquera): velo dorado radial `.cprod-velo`
  (`#fff8e4→#ffd98a→#ff9d4d`, `cprod-cruce` 2.1s, swap bajo el pico a 950ms) — "la luz del valle
  crece hasta cubrirlo todo y del otro lado ya está el home". **Esto SÍ es cine.**
- **Volver al valle / entrar a un lugar**: `EntradaValle3D` usa `VeloOdyssey` (bien) PERO el
  estado de arranque capturado es un **spinner "Levantando su finca…" + botón "Toque un lugar
  para entrar"** (`iter3-cruce-velo.png`).

### 3.1 — El velo dorado del cruce es excelente — protegerlo 🟢
- **Hallazgo**: `cprod-cruce` cumple la regla de oro de las transiciones (el swap nunca se ve:
  cubre → intercambia bajo el pico → revela). "De día es el sol; de noche, el farol de la casa"
  (CSS 379). Coherente con la casa-ancla.
- **Recomendación**: mantener. Extender ese MISMO velo dorado a *todos* los cruces de entrada
  para unidad (hoy conviven New Donk + Odyssey + genérico según origen — `DIRECCION-VALLE.md`
  pendiente #2).

### 3.2 — El spinner "Levantando su finca…" mata la ilusión 🔴 alto impacto
- **Hallazgo**: `iter3-cruce-velo.png` se lee como **pantalla de carga** (aro girando + texto +
  botón), no como cámara que te mete caminando hacia la luz. Rompe la ficción de "entrar a la
  finca" que el resto del flujo construye con tanto cuidado.
- **Recomendación**:
  1. Reemplazar el spinner por el **velo dirigido**: la luz crece desde la **ventana de la casa**
     (ese `emissiveIntensity: 0.8` cálido de `CasaCampesina`) como faro que te jala adentro.
  2. Quitar "Toque un lugar para entrar" del momento de carga — la entrada debe *pasar sola*
     (cámara establishing 6s acelerable), no pedir un toque para arrancar.
  3. Si hay latencia real de montaje 3D, esconderla **debajo** del velo (precargar el chunk
     `Valle3D` durante el velo dorado, como el comentario de `CaraProd3D` ya intenta:
     "cruzar la tranquera no vuelve a descargar nada").

### 3.3 — Entrar y volver deben sentirse distinto (ya está la ley, verificar que corra) 🟡
- **Hallazgo**: `DIRECCION-VALLE.md` define entrar decidido (lerp 0.07) vs. volver que "exhala"
  (0.042, abre a 18u). Es la decisión correcta. Pero varios pendientes (#2, #6) dicen que en la
  entrada real algunos beats/velos aún no corren.
- **Recomendación**: validar en vivo que el barrido de director y el velo Odyssey de "vuelta a
  casa" disparen en `EntradaValle3D` (no solo en `EscenaValle`). Es cableado, no arte nuevo.

---

## EJE 4 — Congruencia: ¿parece el mismo juego?

**El hallazgo estructural de toda la auditoría.** Hoy conviven **dos lenguajes visuales opuestos**:

| | Portada 2D (`FincaVivaHero` biopunk2) | Valle 3D (estándar aprobado) |
|---|---|---|
| Luz | **noche** bioluminiscente | **día** cálido / noche con farol |
| Color | neón navy/teal/magenta (`#0c1830`, `#26404d`) | tierra andina (`#f3ecdc`, `#a35a3c`, `#b0603f`) |
| Técnica | SVG plano isométrico | low-poly 3D con sombras |
| Ánimo | organismo/ciencia-ficción | finca campesina real |

### 4.1 — Biopunk-neón vs. andino-cálido: dos juegos 🔴 el más importante
- **Hallazgo**: la escena "Finca Organismo" (`antes-home-movil.png`: corazón-semilla verde neón,
  lombrices fluorescentes, cielo navy) es preciosa pero pertenece a **otro producto** que el valle
  cálido de `iter3-cruce-home.png`. Un usuario que cruza del home 2D al valle 3D siente que
  **cambió de app**. Animal Crossing jamás te hace eso: el buzón, la casa y la isla son el mismo
  mundo.
- **Evidencia**: `antes-home-movil.png` (biopunk) vs `valle-final-calma-c22-desk.png` (andino).
- **Recomendación** (decisión de producto, para el operador):
  - **Opción A (recomendada)** — El norte es el valle. La portada 2D adopta la **paleta madre**
    (`7440f602 feat(paleta): sistema visual madre`): día cálido, verdes andinos, la casa-ancla
    como motivo. El biopunk queda como *un tema opcional*, no el default del home.
  - **Opción B** — Si el biopunk se queda de default, entonces el **cruce debe narrar el salto**
    (de noche-neón a día-cálido) como un amanecer deliberado, no un corte. Más caro y frágil.
  - En cualquier caso: **una sola paleta de acento** entre portada y valle (hoy el home tiene
    arcoíris de 6, el valle tiene tierra). El velo dorado ya es el puente cromático natural.

### 4.2 — La marca oscila (A roja vs. colibrí-brote vs. abeja) 🟡
- **Hallazgo**: el ícono de marca cambia según pantalla: **A roja** en el header del home
  (`iter2-home-desktop.png`), **colibrí+brote** en `valle-ref`, **abeja Angelita** en el valle y
  el login-tranquera. Tres marcas para un producto.
- **Recomendación**: fijar UNA criatura insignia. Angelita (la abeja angelita, *Tetragonisca
  angustula*, ya es "el espíritu de su finca" en el guardián) es la candidata natural y ya vive
  en el valle. Que sea ella en el header, el login y el cruce.

### 4.3 — Tipografía y "voz" sí están alineadas 🟢
- **Hallazgo positivo**: Baloo 2 + Nunito, tono "usted" campesino ("¿A dónde va?", "Camine a un
  lugar de la finca"), copy sin jerga — **coherente y cálido** en las tres pantallas. Es el
  pegamento que hoy salva la congruencia. No tocar.

---

## Prioridad sugerida para las tomas de fable

| # | Acción | Eje | Esfuerzo | Impacto |
|---|---|---|---|---|
| 1 | Committear íconos line-art (iter1) reemplazando emojis en `buildPuertas` | 1 | bajo | 🔴🔴 |
| 2 | Jerarquía "mano": 4 primarias + 2 secundarias, matar arcoíris de 6 tintes | 1 | medio | 🔴🔴 |
| 3 | Portada 2D → paleta madre del valle (Opción A) | 4 | alto | 🔴🔴🔴 |
| 4 | Reemplazar spinner "Levantando…" por velo dirigido (luz de la ventana) | 3 | medio | 🔴🔴 |
| 5 | Encender el valle/fallback atmosférico detrás del letrero de entrada | 2 | medio | 🔴 |
| 6 | Fijar marca única (Angelita) en header/login/cruce | 4 | bajo | 🟡 |
| 7 | Micro-diégesis en los íconos de portal (pizca del mundo destino) | 1 | medio | 🟡 |

---

## Anexo — Piezas leídas
- `src/components/dashboard/FincaVivaHero.jsx` (2115 líneas) + `finca-viva-hero.css`
- `src/components/dashboard/homeModuleSelector.js`, `fincaVivaHomeFlag.js`
- `src/mockups/valle/DIRECCION-VALLE.md` (el estándar) + `composicionValle3D.jsx` + `Valle3D.jsx`
- `src/mockups/CaraProd3D.jsx` + `caraProd3D.css` (velo dorado) + `EntradaValle3D.jsx`
- Capturas: `shots/antes-home-{movil,full,desktop,puertas}.png`, `antes-caraprod-entrada.png`,
  `antes-valle-ref.png`, `iter1-puertas.png`, `iter2-{home-desktop,puertas-noche}.png`,
  `iter3-cruce-{home,velo}.png`, `valle-final-calma-c22-desk.png`
</content>
</invoke>
