# Auditoría de BOTONES + DISTRIBUCIÓN del home F2 "Finca Viva"

Fecha: 2026-06-26
Lente: 4º complementario (sobre las 3 base agroeco/UX/integración) — **solo botones, labels y distribución**.
Tipo: DIAGNÓSTICO (no se cambió código).
Usuario objetivo: **campesino colombiano**.
Archivos auditados:
- `src/components/dashboard/DashboardLive.jsx` (la hoja "El resto de su finca")
- `src/components/dashboard/FincaVivaHero.jsx` (los 4 portales del hero F2)
- `src/components/dashboard/FincaCards.jsx` (las tarjetas del "vistazo")
- `src/components/dashboard/AgentHero.jsx` (toggle Campesino/Experto — solo en flag OFF)
- `src/components/dashboard/AIStatusFooter.jsx`, `AnalisisProactivoIA.jsx`
- `src/config/seguimientoProcesos.js`

---

## 1. INVENTARIO COMPLETO

### A. HERO F2 — `FincaVivaHero.jsx` (la portada inmersiva)

| # | Elemento | Label real | Destino | Archivo:línea |
|---|----------|-----------|---------|---------------|
| 1 | Marca | "Chagra / Su finca viva" | — | FincaVivaHero.jsx:183-186 |
| 2 | Chip ubicación | "Vereda X · Municipio · msnm · Piso" / "Ubicar mi finca" | `perfil` | :190-223 |
| 3 | Pill ayuda | (ícono ?) | `ayuda` | :226-238 |
| 4 | Pill perfil | (ícono persona) | `perfil` | :239-250 |
| 5 | Globo colibrí | "Buenas, soy Chagra…" | abre agente | :286-298 |
| 6 | Compositor | "Pregúntele a Chagra…" + 🎙️ | abre agente | :333-349 |
| 7 | **Portal 1** | **"Gestionar"** — "Registre y cuide sus siembras, zonas y animales." | scroll a `#finca-gestion` | :716-729 |
| 8 | **Portal 2** | **"Aprender"** — "Suelo vivo, milpa, biopreparados, MIP y fenología." | `aprende` | :730-740 |
| 9 | **Portal 3** | **"Jugar"** — "Haga crecer su finca y defiéndala jugando." | `juego` | :741-751 |
| 10 | **Portal 4** | **"Agente"** — "Pregunte lo que sea: respuestas con su fuente." | abre agente | :752-762 |

Rótulo de los portales: **"Lugares de su finca"** (:362).

### B. HOJA "EL RESTO DE SU FINCA" — `DashboardLive.jsx`

Rótulo general: **"El resto de su finca"** + subtítulo "Sus herramientas, registros y el estado de un vistazo…" (:543-547).

| # | Sección (rótulo) | Tiles / contenido | Archivo:línea |
|---|------------------|-------------------|---------------|
| S0 | (banner) Reporte de Punto Glaciar | gateado whitelist | :562-581 |
| S1 | **"Seguimiento de procesos"** | Reforestación 🌳 · Silvopastoreo 🐄 · Páramo · Cerdos | :621-634 / seguimientoProcesos.js:33+ |
| S2 | **"Lo más sólido de Chagra"** | **Especies** (tile grande) · **Calendario** (tile grande) | :649-672 / DESTACADO_TILES:144 |
| S3 | **"Aprender"** | Casos de estudio · Ciclo de nutrientes · Biopreparados · Suelo · Seguridad · Preguntas frecuentes (el tile "Aprender" se filtra en F2) | :680-705 / APRENDER_TILES:167 |
| S4 | **"Mi finca · gestión"** | Semilleros · Cosechar · Insumos aplicados · Mantenimiento | :715-743 / GESTION_TILES:180 |
| S5 | **"Vender y comprar"** | Mercado | :749-772 / MERCADO_TILE:191 |
| S6 | (banner) Campo, Javier | gateado operador | :777-797 |
| S7 | **"Animales de la finca"** | Animales (Gallinas, cerdos y abejas) | :803-814 |
| S8 | **"Su finca de un vistazo"** | grid draggable (ver C) | :836-860 |
| S9 | hint reorganizar | "Mantén presionado el ⋮⋮…" | :862-864 |
| S10 | **AIStatusFooter** — "Status proactivo IA" | Sensores · Clima · Agente | :872 / AIStatusFooter.jsx:181 |

### C. GRID "Su finca de un vistazo" — `FincaCards.jsx` (draggable)

| Tile | Label real | Subtítulo | Destino |
|------|-----------|-----------|---------|
| hoyfinca | "Hoy en finca" (strip) | — | — |
| clima | (ClimaStrip) | — | — |
| analisis | **"Análisis Chagra · IA local"** | narrativa IA | AnalisisProactivoIA.jsx:283 |
| plantas | "Mis plantas" | N plantas sembradas | activos |
| zonas | "Mis zonas" | N áreas de tu finca | zonas |
| insumos | **"Insumos"** | N | insumos |
| bitacora | "Bitácora" | "Todo lo que has hecho en tu finca" | bitacora |
| hoy | "Hoy en finca" | "El día, las alertas y lo que toca" | — |
| plagas | "Plagas" | "Reporta y consulta" | plagas |
| biodiversidad | **"Flora y fauna"** | "Ecosistema de tu chagra" | biodiversidad |
| asociaciones | "Asociaciones" | "Policultivos y compañía de plantas" | asociaciones |
| fermentos | "Fermentos" | "Recetas tradicionales y seguridad" | — |
| informes | **"Informes"** | "Descarga reportes en CSV" | informes |

### CONTEO TOTAL

- **Hero**: 4 portales + globo + compositor + 4 utilidades de barra = **~10 puntos de toque**.
- **Hoja "resto"**: 10 secciones con rótulo, dentro de ellas:
  - Seguimiento: hasta 4 tiles
  - Destacado: 2 tiles grandes
  - Aprender: 6 tiles
  - Gestión: 4 tiles
  - Mercado: 1 tile
  - Animales: 1 tarjeta
  - Vistazo: hasta 13 tarjetas/strips
  - Footer status: 3 chips
- **GRAN TOTAL en el scroll del home (perfil operador, todo visible)**: ~**44 destinos navegables** + ~12 rótulos de sección.

> **Diagnóstico de volumen:** un campesino que entra ve la portada limpia (bien), pero al hacer **un solo scroll** se topa con **44 botones repartidos en 10 bloques con título**. Es una página de "todo Chagra", no un home. La portada F2 es excelente; la hoja de abajo es un volcado del dashboard viejo apenas reagrupado.

---

## 2. CADA LABEL: ¿le habla a un campesino?

| Label actual | ¿Concreto para campesino? | Veredicto | Propuesta campesina | Ref |
|---|---|---|---|---|
| **"Lo más sólido de Chagra"** | NO. Marketing abstracto. Un campesino no sabe qué es "sólido" ni le importa la fortaleza interna del producto. | ❌ CRÍTICO | **"Consulte su finca"** o **"Plantas y calendario"** o **"Qué sembrar y cuándo"** | DashboardLive.jsx:655 |
| **"Status proactivo IA"** | NO. "Status", "proactivo" e "IA" son tres palabras técnicas en inglés/jerga. | ❌ CRÍTICO | **"Cómo va su finca hoy"** o **"Avisos del día"** | AIStatusFooter.jsx:181 |
| **"Análisis Chagra · IA local"** | NO. "IA local" no significa nada para el usuario. | ❌ ALTO | **"Lo que Chagra ve en su finca"** o **"Recomendación de hoy"** | AnalisisProactivoIA.jsx:283-286 |
| **"El resto de su finca"** | Débil. "El resto" = "lo que sobró"; suena a cajón de sastre (y lo es). | ⚠️ MEDIO | Eliminar el rótulo genérico; que cada bloque se nombre solo. Si se conserva: **"Todo lo de su finca"** | DashboardLive.jsx:543 |
| **"Seguimiento de procesos"** | Parcial. "Procesos" es palabra de oficina. "Seguimiento" pasa. | ⚠️ ALTO | **"Sus proyectos de finca"** o **"Proyectos en marcha"** | DashboardLive.jsx:629 |
| **"Flora y fauna"** | Aceptable pero culto. Subtítulo "Ecosistema de tu chagra" sube el registro. | ⚠️ MEDIO | Título **"Plantas y animales del monte"**; subtítulo "Lo vivo de su finca" | FincaCards.jsx:436 |
| **"Insumos" / "Insumos aplicados"** | Tibio. "Insumo" es palabra de almacén agrícola; muchos campesinos dicen "abonos", "venenos", "lo que le echo". | ⚠️ ALTO | **"Abonos y aplicaciones"** (registro) / **"Mis abonos e insumos"** (inventario) | FincaCards.jsx:379, DashboardLive.jsx:183 |
| **"Informes" / "Descarga reportes en CSV"** | NO. "CSV" es jerga pura; un campesino nunca pidió un CSV. | ❌ ALTO | **"Sacar reportes"**; subtítulo "Para imprimir o llevar al banco/cooperativa" | FincaCards.jsx:462-463 |
| **"Calendario"** (Especies/Calendario) | OK pero la desc es buena. | ✅ | Mantener; quizás "Calendario de la finca" | DashboardLive.jsx:150 |
| **"Especies"** | Tibio. "Especies" es palabra de biólogo; el campesino dice "plantas", "matas", "cultivos". | ⚠️ MEDIO | **"Catálogo de plantas"** o **"Qué puedo sembrar"** | DashboardLive.jsx:145 |
| **"Toxicología" → label "Seguridad"** | El label "Seguridad" sí pasa. ✅ | ✅ | Mantener "Seguridad" | DashboardLive.jsx:173 |
| **"Mantenimiento"** | Genérico de oficina. | ⚠️ MEDIO | **"Labores de la finca"** o **"Arreglos y mantenimiento"** | DashboardLive.jsx:184 |
| **"Mercado"** + "sin intermediarios" | ✅ Buen copy campesino. | ✅ | Mantener | DashboardLive.jsx:191 |
| Portal **"Gestionar"** | Tibio. "Gestionar" es palabra administrativa. | ⚠️ ALTO | **"Mi finca"** o **"Registrar"** o **"Cuidar"** | FincaVivaHero.jsx:718 |
| Portal **"Agente"** | NO para campesino. "Agente" suena a seguros/policía. | ❌ ALTO | **"Pregúntele a Chagra"** o **"Hablar con Chagra"** | FincaVivaHero.jsx:754 |
| Rótulo portales **"Lugares de su finca"** | ✅ Excelente, concreto y cálido. | ✅ | Mantener | FincaVivaHero.jsx:362 |

---

## 3. REDUNDANCIA / DUPLICACIÓN (solapes reales)

1. **"Insumos aplicados" (Gestión, registro)** vs **"Insumos" (vistazo, inventario)** — mismo dominio, dos entradas en dos bloques distintos. El campesino no distingue "aplicar" de "ver". → **Solape ALTO.** Ref: DashboardLive.jsx:183 vs FincaCards.jsx:379.
2. **"Plagas" (vistazo)** vs **"Seguridad/Toxicología" (Aprender)** vs **chip plaga del agente** — tres puertas al manejo sanitario. → Solape MEDIO.
3. **"Cosechar" (Gestión)** vs **"Hoy en finca" (vistazo, "lo que toca")** vs **calendario de cosecha (Destacado)** — la cosecha aparece en 3 lugares. → Solape MEDIO.
4. **"Mis plantas" + "Asociaciones" + "Flora y fauna" + "Plagas" + "Especies"** — cinco superficies sobre "las plantas de mi finca" y "plantas en general", revueltas entre el grid del vistazo y el bloque Destacado. El campesino no sabe cuál abrir para "ver mis matas". → **Solape ALTO / sobrecarga.**
5. **"Aprender" portal (hero)** → entra a `aprende`; **bloque "Aprender" (hoja)** → 6 tiles de contenido. Hay DOS "Aprender" en la misma pantalla (el código ya filtra el tile duplicado, pero el **rótulo** se repite). → Confusión de duplicado de nombre. Ref: FincaVivaHero.jsx:731 vs DashboardLive.jsx:686.
6. **"Animales" (S7, tarjeta propia)** vs **"Cerdos" (S1, seguimiento)** vs **"Gallinas, cerdos y abejas" (subtítulo de Animales)** — los cerdos viven en dos bloques. → Solape MEDIO.
7. **"Análisis Chagra IA local" (en el grid draggable)** vs **"Status proactivo IA" (footer)** — dos paneles de "lo que la IA opina de tu finca", uno arriba del grid y otro al pie. → **Solape ALTO** (dos veces la misma idea de "IA proactiva").
8. **"Hoy en finca"** aparece DOS veces: como strip `hoyfinca` (full) y como tile `hoy` en el mismo grid. Ref: FincaCards.jsx:410 y DashboardLive.jsx:99/106. → **Duplicado literal.**

---

## 4. DISTRIBUCIÓN / SOBRECARGA

- **Demasiados bloques con rótulo (10) y demasiados tiles (44).** El home se lee como un índice del producto, no como "mi finca".
- **El orden NO sigue el flujo mental del campesino.** Hoy: Seguimiento → "lo sólido" → Aprender → Gestión → Mercado → Animales → vistazo → status. El campesino piensa: **(1) ¿cómo va mi finca hoy? (2) ¿qué tengo? (3) ¿qué hago/registro? (4) consultar/aprender (5) vender.** El "vistazo" (lo que tengo + cómo va) está HASTA EL FONDO; debería ir ARRIBA.
- **"Seguimiento de procesos" (Reforestación/Páramo/Silvopastoreo/Cerdos) abre el resto** — y para la mayoría de campesinos **no aplica** (proyectos de nicho: restauración, glaciar, ganadería específica). Ya hay gating por perfil, pero cuando aplica está demasiado arriba, robándole el primer scroll a lo cotidiano (mis plantas, hoy). → **Bajarlo**, debajo de lo cotidiano.
- **El grid draggable mezcla 13 cosas heterogéneas** (clima, IA, plantas, zonas, insumos, bitácora, plagas, asociaciones, flora/fauna, informes, fermentos…). Es el "cajón de sastre" original del dashboard 0.1. → **Partir** en "Mi finca hoy" (estado) vs "Mis registros" (inventario) vs "Consultas".
- **Dos paneles de IA** (Análisis + Status footer) compiten. → **Fundir en uno solo**: "Cómo va su finca hoy".
- **Lo que se puede COLAPSAR/ELIMINAR de entrada:** Informes (CSV), Fermentos, "Flora y fauna" detallado, Seguridad/Toxicología como tile suelto — son de consulta ocasional, no merecen tile permanente en el primer scroll. Van bajo "Aprender/Consultar" o detrás de un "Ver más".

---

## 5. TOGGLE Campesino/Experto

**Hallazgo crítico de distribución:** el toggle vive en `AgentHero.jsx:1768-1786`, que es la **portada del flag OFF**. En el home **F2 (flag ON, `FincaVivaHero.jsx`) el toggle NO EXISTE** — no aparece ni en el hero ni en ningún portal. Grep confirma: "Campesino"/"Experto" no están en FincaVivaHero. El usuario F2 llega al agente vía el compositor/portal, que abre `AgentScreen`; el nivel solo se podría cambiar dentro de esa pantalla (si está cableado allí) o desde perfil. **En el home F2 el toggle es invisible/no descubrible.**

- **¿Claro?** El label `🌾 Campesino` / `🔬 Experto` es claro como concepto, pero **estigmatiza**: obliga al usuario a auto-clasificarse como "campesino" (= "no experto"). Un campesino con orgullo profesional puede leerlo como condescendiente. Es un nombre sobre la PERSONA, no sobre la RESPUESTA.
- **¿Descubrible?** En F2: **NO** (ni existe en la portada). En flag OFF: sí, está en la barra del hero.
- **¿Bien ubicado?** Conceptualmente debería estar **junto al agente** (es una preferencia de cómo responde el agente), no como decoración de la barra superior.
- **Recomendación:** **REUBICAR + RENOMBRAR.**
  - Renombrar a algo sobre la RESPUESTA, no sobre la persona: **"Claro y corto" / "Con detalle"** (o "Sencillo" / "A fondo"). Quita el estigma.
  - Llevarlo al **compositor del agente del hero F2** (junto al 🎙️) o como primer control dentro de `AgentScreen`, para que viaje con el agente y sea descubrible en F2.
  - Mantener el cableado real a `nivel_respuestas` (ya funciona).

---

## TABLA DE HALLAZGOS PRIORIZADOS

| Sev | Hallazgo | Archivo:línea | Acción |
|-----|----------|---------------|--------|
| 🔴 CRÍTICO | "Lo más sólido de Chagra" — marketing abstracto, no le dice nada al campesino | DashboardLive.jsx:655 | Renombrar → "Consulte su finca" / "Plantas y calendario" |
| 🔴 CRÍTICO | "Status proactivo IA" — 3 palabras de jerga | AIStatusFooter.jsx:181 | Renombrar → "Cómo va su finca hoy" |
| 🔴 CRÍTICO | Toggle Campesino/Experto AUSENTE en home F2 + estigmatizante | AgentHero.jsx:1768 / FincaVivaHero.jsx (no existe) | Reubicar al agente F2 + renombrar "Claro y corto / Con detalle" |
| 🔴 CRÍTICO | 44 botones en 10 bloques bajo el hero — sobrecarga (cajón de sastre) | DashboardLive.jsx:524-880 | Reorganizar a 4-5 bloques (ver propuesta) |
| 🟠 ALTO | "Análisis IA local" + "Status proactivo IA" = dos paneles de IA duplicados | AnalisisProactivoIA.jsx:283 + AIStatusFooter.jsx:181 | Fundir en uno: "Cómo va su finca hoy" |
| 🟠 ALTO | "Hoy en finca" duplicado literal (strip `hoyfinca` + tile `hoy`) | FincaCards.jsx:410 + DashboardLive.jsx:99/106 | Eliminar uno |
| 🟠 ALTO | "Insumos aplicados" (gestión) vs "Insumos" (vistazo) solapados | DashboardLive.jsx:183 + FincaCards.jsx:379 | Unificar en "Abonos e insumos" con dos acciones (ver/registrar) |
| 🟠 ALTO | Portal "Agente" — suena a seguros/policía | FincaVivaHero.jsx:754 | Renombrar → "Pregúntele a Chagra" / "Hablar con Chagra" |
| 🟠 ALTO | "Informes / CSV" — jerga pura | FincaCards.jsx:462 | "Sacar reportes" + "para imprimir o llevar a la cooperativa" |
| 🟠 ALTO | "Seguimiento de procesos" arriba del todo aunque sea de nicho | DashboardLive.jsx:621-634 | Bajarlo; renombrar "Sus proyectos de finca" |
| 🟠 ALTO | Cinco superficies de "plantas" revueltas (Mis plantas/Asociaciones/Flora-fauna/Plagas/Especies) | FincaCards + DESTACADO | Agrupar bajo un solo bloque "Sus plantas" |
| 🟡 MEDIO | Portal "Gestionar" administrativo | FincaVivaHero.jsx:718 | "Mi finca" / "Registrar" |
| 🟡 MEDIO | "El resto de su finca" suena a sobras | DashboardLive.jsx:543 | Eliminar rótulo genérico o "Todo lo de su finca" |
| 🟡 MEDIO | "Especies" / "Flora y fauna" / "Mantenimiento" cultos | varios | "Plantas" / "Plantas y animales" / "Labores de la finca" |
| 🟡 MEDIO | Dos rótulos "Aprender" (portal + bloque) en la misma pantalla | FincaVivaHero.jsx:731 + DashboardLive.jsx:686 | Renombrar el bloque "Consultar y aprender" |

---

## PROPUESTA DE REORGANIZACIÓN DEL HOME

**Principio:** menos bloques, orden = flujo mental del campesino, labels concretos. De ~10 bloques / 44 tiles → **5 bloques** ordenados por lo que el campesino piensa al entrar.

### Hero (se mantiene — está bien)
4 portales: **"Mi finca"** (antes Gestionar) · **"Aprender"** · **"Jugar"** · **"Pregúntele a Chagra"** (antes Agente).
Mover el toggle de respuesta al compositor del agente, renombrado **"Claro y corto / Con detalle"**.

### Hoja de abajo — 5 bloques (en este orden):

**1. "Cómo va su finca hoy"** (antes: Status proactivo IA + Análisis IA local + Hoy en finca + Clima — FUNDIDOS)
- Un solo panel: el día, el clima, el aviso/recomendación de Chagra. Elimina el duplicado de los dos paneles de IA y los dos "Hoy en finca".

**2. "Sus plantas y animales"** (antes: Mis plantas + Mis zonas + Plagas + Asociaciones + Flora y fauna + Animales — AGRUPADOS)
- "Mis matas" (plantas) · "Mis zonas" · "Plagas" · "Asociaciones" · "Animales".
- "Especies/Catálogo" se queda como acceso de consulta dentro de este bloque o en Aprender.

**3. "Registrar en la finca"** (antes: Semilleros + Cosechar + Insumos aplicados + Mantenimiento + Bitácora — el bloque de ACCIÓN)
- "Semilleros" · "Cosechar" · "Abonos e insumos" (unifica los dos insumos) · "Labores de la finca" · "Bitácora".
- (Encaja con la tarea #23 "botón único de voz para registrar".)

**4. "Consultar y aprender"** (antes: bloque Aprender + Especies/Calendario + Informes + Fermentos + Seguridad)
- "Qué puedo sembrar" (catálogo/especies) · "Calendario de la finca" · "Casos reales" · "Biopreparados" · "Suelo" · "Seguridad" · "Sacar reportes" · "Preguntas frecuentes".
- Colapsable / "Ver más" — son de consulta ocasional, no del primer scroll.

**5. "Vender y comprar"** (Mercado — se mantiene al fondo, ya está bien)

**Bloque condicional (solo si el perfil lo usa, y MÁS ABAJO que hoy):**
- **"Sus proyectos de finca"** (antes "Seguimiento de procesos"): Reforestación · Silvopastoreo · Páramo · Cerdos. Solo para quien los tenga; ya hay gating, solo cambia el orden (baja) y el nombre.

### Copy nuevo de títulos de sección (resumen)

| Antes | Después |
|-------|---------|
| "Lo más sólido de Chagra" | **"Consulte su finca"** (o se funde en "Consultar y aprender") |
| "Status proactivo IA" / "Análisis Chagra · IA local" | **"Cómo va su finca hoy"** |
| "Seguimiento de procesos" | **"Sus proyectos de finca"** |
| "Mi finca · gestión" | **"Registrar en la finca"** |
| "Su finca de un vistazo" | **"Sus plantas y animales"** (parte estado) + repartir el resto |
| "El resto de su finca" | (eliminar el rótulo genérico) |
| "Aprender" (bloque) | **"Consultar y aprender"** |
| Portal "Agente" | **"Pregúntele a Chagra"** |
| Portal "Gestionar" | **"Mi finca"** |

**Resultado:** de 10 bloques/44 tiles a **5 bloques principales + 1 condicional**, ordenados por el flujo del campesino (estado → tengo → hago → consulto → vendo), con labels que nombran cosas de finca, no conceptos de producto ni jerga de IA.
