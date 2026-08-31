# AUDITORÍA DE DISEÑO DE JUEGOS — Chagra

**Fecha:** 2026-07-16 · **Versión app:** 1.0.55 · **Alcance:** todos los modos de juego 2D/simulador (la revisión 3D va aparte) · **Modo:** solo lectura.

Ejes de calificación (1-10), nombrados por el operador:
- **ESP** = espectacularidad (¿impresiona, calibre Switch?)
- **FUN** = funcionalidad (¿funciona, es jugable, corre en Android barato?)
- **AGR** = valor agroecológico para el campesino (¿enseña agroecología real, útil para su proceso?)

---

## (a) Inventario: estado real + calificaciones + veredicto

| # | Juego | Ruta / estado | ESP | FUN | AGR | Veredicto |
|---|-------|---------------|:---:|:---:|:---:|-----------|
| 1 | **MiFincaViva** (HUB) | `juego` · **cableado + accesible** (Dashboard, Hoy, HomeCard) | 6 | 9 | 9 | **Pulir + anclar.** Es la columna. |
| 2 | **DefensoresFinca** | `defensores` · **cableado** (desde el hub) | 6 | 8 | 9 | **Pulir** (arte). Muy sólido. |
| 3 | **MilpaSimulator** | `milpa` · **cableado** (desde el hub) | 5 | 9 | 10 | **Pulir** (hacerlo más juego). Máximo valor agro. |
| 4 | **DoomFinca** | `doom_finca` · **cableado** (desde el hub) | 7 | 7 | 8 | **Pulir** + resuavizar marco "Doom". |
| 5 | **MundoSubsuelo** | `subsuelo` · **cableado** (rescatado de ux-audit P1-1) | 5 | 8 | 8 | **Integrar** más hondo en el hub. |
| 6 | **JuegoMiFincaOdyssey** | `mockup_juego_mi_finca` · **URL-only** (no está en ningún menú) | 9 | 7 | 7 | **Promover/integrar.** Joya escondida. |
| 7 | **MetalSlugCampo** | `mockup_metal_slug_campo` · **URL-only**, prototipo nivel 1/4 | 8 | 6 | 8 | **Terminar + promover.** Falta niveles 2-4 y jefes. |
| 8 | **JuegoLaMilpa** | `mockup_juego_la_milpa` · **URL-only**, mockup | 6 | 7 | 6 | **Fusionar** con MilpaSimulator (redundante). |
| 9 | **AvatarGame** ×3 (Biopunk/VerdeVivo/Libre) | `mockup_avatar_*` · **URL-only**, EXCLUIDO en prod | 7 | 3 | 5 | **Archivar como juegos.** Concepto ya vive en Espíritu Guardián. |
| 10 | **MonoVsPoliSimulator** | **sin ruta** — solo `export` en `juego/index.js` | 4 | 7 | 9 | **Cablear o fusionar.** Activo muerto de alto valor. |

**Componentes de soporte (no son juegos autónomos):** `FincaWorldScene` (SVG del mundo que crece), `CriaturaCollection` (Pokédex), `MisionCard`, `LevelUpCelebration`. **`NivelCompartirSwitch` NO es un juego** — es la compuerta opt-in de 3 niveles de privacidad de la red humana (`red/CierreTratoSheet`).

**Motores puros (bien arquitecturados, testeados):** `defensoresGameEngine` (349), `milpaGameEngine` (1097), `metalSlugCampoEngine` (200), `mundoSubsueloEngine` (76), `fincaGameService` (555). Tests presentes para casi todos los juegos cableados; los mockups (Odyssey, LaMilpa, Avatar) no tienen tests — consistente con su estatus.

---

## Ficha por juego (detalle)

### 1. MiFincaViva — el HUB (`juego`)
- **Qué es:** capa lúdica ENCIMA del motor de evolución de finca. Mundo SVG que florece por nivel Gliessman 0-4, criaturas coleccionables (Pokédex), misiones ligadas a acciones reales + fichas, insignias por hitos, celebración + TTS. Pensado para una niña que lee poco (botones 44-56px, audio en todo).
- **Estado:** cableado y accesible desde 3 puntos. Es la puerta a Defensores, Milpa, Doom y Subsuelo. Offline-first; sin datos → invita a sembrar (nunca mundo muerto).
- **ESP 6:** cálido/acogedor tipo Animal Crossing-lite, pero no "wow" 3D.
- **FUN 9:** grounded en indicadores REALES (`buildFincaGameState`), tested, accesible, corre en Android barato (SVG/DOM). "No inventa premios."
- **AGR 9:** todo atado a datos reales; misiones rutean a acciones reales; criaturas llegan con biodiversidad real.
- **Veredicto:** PULIR y mantener como ancla del sistema de juegos.

### 2. DefensoresFinca (`defensores`)
- **Qué es:** plataformero 2D real (canvas + física + cámara). Recoge cultivos, suelta el benéfico que controla EXACTO a cada plaga. 4 niveles por piso térmico (huerta → ladera → cafetal → maizal), dificultad progresiva, mini-jefes, progreso en localStorage.
- **Estado:** cableado; motor puro `defensoresGameEngine` testeado.
- **ESP 6** · **FUN 8** (física real, touch; algo pesado en gama muy baja) · **AGR 9** (pares plaga↔benéfico 100% grounded: grafo/Cenicafé/CIAT-EMBRAPA-ICA; cada control enseña el PORQUÉ).
- **Veredicto:** PULIR arte; contenido MIP excelente.

### 3. MilpaSimulator (`milpa`)
- **Qué es:** simulador de policultivo por parcelas. 5 sistemas reales: milpa (3 hermanas), SAF café, SAF cacao, frutal+cobertura, hortalizas. Cifras LER/N/carbono grounded en DOIs.
- **Estado:** cableado; `milpaGameEngine` (1097 líneas, puro, testeado).
- **ESP 5** (grid + paneles + números; estrategia, no vistoso) · **FUN 9** (determinista, offline) · **AGR 10** (la agronomía más honda del repo; decisiones que el campesino toma de verdad).
- **Veredicto:** PULIR para que se sienta más juego (ritmo, feedback táctil). Máximo valor agro.

### 4. DoomFinca (`doom_finca`)
- **Qué es:** raycaster en primera persona en Canvas 2D puro (motor propio, sin librerías 3D). Recorre la finca andina, identifica la plaga y lanza el benéfico/biopreparado correcto. 3 escenarios (maíz → café → hortalizas).
- **Estado:** cableado; res lógica 240×180 + niebla, afinado para gama baja. Historial de fixes UX (spawn dentro de pared).
- **ESP 7** (impresiona que un raycaster corra en el teléfono) · **FUN 7** (raycaster pesa en lo más barato; mitigado con baja res) · **AGR 8** (identificar + control correcto, con fichas del porqué).
- **Veredicto:** PULIR; gran gancho técnico. El marco "Doom" puede resuavizarse para el público niño/campesino.

### 5. MundoSubsuelo (`subsuelo`)
- **Qué es:** juego de cartas de decisión sobre la vida del suelo. Compost/cobertura/no-labrar/micorriza/rotación/biopreparado (suben la vida) vs labranza intensa/exceso químico (la bajan). Medidor de vida del suelo + guías Lombricita/Miquito.
- **Estado:** cableado (rescatado de ux-audit — antes existía sin ruta ni entrada); `mundoSubsueloEngine` testeado.
- **ESP 5** · **FUN 8** (simple, robusto) · **AGR 8** (causa-efecto de la vida del suelo, enfocado).
- **Veredicto:** INTEGRAR más hondo en MiFincaViva; buen complemento.

### 6. JuegoMiFincaOdyssey (`mockup_juego_mi_finca`) — URL-only
- **Qué es:** el CRUCE ODYSSEY 2D↔3D. La finca 3D (three.js) guarda un túnel; al tocarlo la cámara hace dolly + estrecha FOV 46→15 (se "aplana") y un iris (clip-path DOM) revela el plano 2D jugable side-scroll. 4 cuidados reales: riego al pie, tres hermanas, observar la aliada (mariquita), cosecha selectiva. Sin puntos/vidas/timers (anti-gamificación). Rubber-hose andino (Angelita guía).
- **Estado:** real y jugable, PERO solo alcanzable escribiendo `#/mockups/juego-mi-finca`; **no está enlazado en ningún menú/vitrina.** Tiers de dispositivo (tier bajo no monta Canvas → portada DOM), reduced-motion. Sin tests (mockup).
- **ESP 9** (la magia 2D↔3D es lo más calibre-Switch del repo) · **FUN 7** (WebGL riesgoso en lo más barato, mitigado con fallback) · **AGR 7** (4 cuidados reales, liviano en profundidad).
- **Veredicto:** PROMOVER/INTEGRAR. **El mayor potencial desaprovechado.**

### 7. MetalSlugCampo (`mockup_metal_slug_campo`) — URL-only, prototipo nivel 1/4
- **Qué es:** run-and-gun SIN violencia. Angelita recorre la ladera, "combate" plagas lanzando el control biológico correcto, LIBERA fauna cazada (rehenes estilo POW: oso andino, borugo, jaguar, morrocoy — con lección de conservación IUCN) y jefes = amenazas estructurales (sequía / deforestación / agroquímico). Reúsa física de `defensoresGameEngine` vía `metalSlugCampoEngine` (paso fijo 1/60s), sprites rubber-hose canónicos.
- **Estado:** prototipo jugable **solo nivel 1 (NIVELES[0])**; la data completa diseña 4 niveles + 4 rehenes + 3 jefes, pero el JSX no los monta. URL-only. DOM/SVG (sin canvas) → gama baja OK. Engine testeado.
- **ESP 8** · **FUN 6** (inconcluso: falta 2-4 + jefes) · **AGR 8** (plagas+control + conservación de fauna + amenazas estructurales: une agroecología y conservación).
- **Veredicto:** TERMINAR (niveles 2-4 + jefes) y promover a ruta real. Potencial enorme.

### 8. JuegoLaMilpa (`mockup_juego_la_milpa`) — URL-only
- **Qué es:** mini-juego SVG de sembrar las tres hermanas y ver la sinergia (maíz da soporte, fríjol fija N, ahuyama cubre). Estética Cuphead-andina, reductores puros, confeti determinista, anti-gamificación.
- **Estado:** mockup, URL-only, sin tests.
- **ESP 6** · **FUN 7** · **AGR 6** (más angosto que MilpaSimulator y lo SOLAPA).
- **Veredicto:** FUSIONAR con MilpaSimulator (quedarse con el arte más lindo, plegarlo al simulador más hondo) o archivar.

### 9. AvatarGame ×3 (`mockup_avatar_*`) — URL-only, EXCLUIDO en prod
- **Qué es:** 3 variantes (biopunk / verde-vivo / libre) del "Espíritu de tu finca": avatar de especie nativa que evoluciona semilla→espíritu y cuyo brillo refleja la salud real (agua/suelo/biodiversidad/constancia) a 5 años.
- **Estado:** MOCKUPS de dirección — datos hardcodeados, SIN servicios reales, SIN loop de juego. Marcados EXCLUIDO en el manifiesto de prod (duplican al Espíritu Guardián real).
- **ESP 7** (biopunk/verde-vivo son mockups lujosos) · **FUN 3** (no funcionan como juego) · **AGR 5** (buen concepto, no cableado a datos).
- **Veredicto:** ARCHIVAR como juegos (guardar como referencia de arte). 3 variantes son 2 de más.

### 10. MonoVsPoliSimulator — SIN ruta (construido-pero-no-cableado)
- **Qué es:** comparador monocultivo vs policultivo lado a lado (rendimiento/LER, N fijado, ahorro de insumos, control de plaga) grounded en `asociaciones-comparativa.json`, con fuente y nivel de confianza.
- **Estado:** exportado en `juego/index.js` pero **no aparece en ningún `case` de App.jsx ni en prodApp** → inalcanzable. Es más un infográfico que un juego (sin interacción). Tiene test.
- **ESP 4** · **FUN 7** como componente / **0** como feature (no hay ruta) · **AGR 9** (contenido de decisión buenísimo).
- **Veredicto:** CABLEAR (como pestaña dentro de MilpaSimulator o de Asociaciones) o fusionar su data. Activo muerto de alto valor.

---

## (b) Referentes de consola → qué mecánica robar y en cuál juego

| Referente | Mecánica a robar | Llevarla a… |
|-----------|------------------|-------------|
| **Sakuna** (agronomía real = valor + belleza) | Que el cultivo real se VEA hermoso y responda al cuidado (etapas fenológicas visibles, feedback táctil de sembrar/cosechar). | **MilpaSimulator** y **MiFincaViva** — vestir la agronomía real (ya la tienen) con la belleza que hoy le falta. |
| **Terra Nil** (restaurar ecosistema, sin huella) | Loop "restaurar → dejar irse". Reforestar/recuperar microcuenca y que el sistema se sostenga solo. | Jefe de **MetalSlugCampo** (deforestación→reforestar) + un **modo restauración/microcuenca NUEVO** (aprovechar `restauracion-especies.json` y el arte reciente del ciclo del agua). |
| **Zelda BOTW** (mundo vivo + exploración) | La finca como mundo explorable con travesía mágica. | **JuegoMiFincaOdyssey** (el túnel 2D↔3D YA es ese momento) + el valle 3D. |
| **Ori** (atmósfera) | Iluminación de ánimo, hora dorada, capas. | **Odyssey**, **Defensores**, **Doom** — ya usan `atmosferaMadre`/paletas por piso térmico; empujar el mood. |
| **Animal Crossing** (loop diario acogedor + colección) | Cadencia DIARIA + calidez (visitas, cartas). Criaturas que llegan solas. | **MiFincaViva** — convertir la Pokédex de criaturas + misiones en un ritual diario con calor humano. |
| **Mulaka** (cosmología indígena / guardianes) | Guardianes-guía y estructura de misión mítica. | Guías **Lombricita/Miquito/Angelita** + Espíritu Guardián + Ent + jaguar místico ya son la base; darles estructura de quest. |
| **Stardew Valley** (ritmo de cultivo + relaciones) | Calendario estacional + loop de relaciones/trueque. | **MilpaSimulator** (temporadas) + la **RED humana** campesino↔campesino (monetizar la transacción, no el saber). |

---

## (c) Top 5 con más potencial (ESP × FUN × AGR)

Producto de los tres ejes (proxy de potencial):

1. **MiFincaViva** — 6×9×9 = **486** · el hub; ya vivo, pulir arte.
2. **MilpaSimulator** — 5×9×10 = **450** · máxima agronomía; hacerlo más juego.
3. **JuegoMiFincaOdyssey** — 9×7×7 = **441** · magia 2D↔3D; sacarlo del URL-only.
4. **DefensoresFinca** — 6×8×9 = **432** · MIP excelente; uplift visual.
5. **DoomFinca** — 7×7×8 = **392** · gancho técnico; resuavizar marco.

*(MetalSlugCampo queda 6º con 384 — el más cercano; sube al top si se terminan los niveles 2-4.)*

---

## (d) Construido-pero-no-cableado

1. **MonoVsPoliSimulator** — el caso más claro: existe, tiene test, AGR 9, y **no tiene ninguna ruta**. Solo `export` colgado en `juego/index.js`. Inalcanzable para el usuario.
2. **JuegoMiFincaOdyssey**, **MetalSlugCampo**, **JuegoLaMilpa** — cableados a un `case` de App.jsx pero **solo alcanzables por URL directa `#/mockups/...`**; ningún menú, vitrina ni botón los enlaza. Descubribles solo por quien sepa la URL → "cableado a medias".
3. **MetalSlugCampo** además está **inconcluso**: 4 niveles + 4 rehenes + 3 jefes diseñados en data, pero el JSX solo monta el nivel 1.
4. **AvatarGame ×3** — cableados a rutas mockup pero EXCLUIDOS de prod y sin datos reales (no funcionan como juego).

En el manifiesto `config/rutasProdChagraApp.js`, TODOS los juegos 2D están en `PENDIENTE_DECISION` (ninguno entra aún a prod.chagra.app); los AvatarGame están en `EXCLUIDO`. Es decir: en el frontend 3D-first de producción, **hoy no entra ningún juego** — la decisión está congelada esperando al operador.

---

## Hallazgos top

1. **Los 5 juegos cableados (hub + Defensores + Milpa + Doom + Subsuelo) son sólidos y honestos:** todo el contenido está grounded (grafo AGE, Cenicafé, CIAT/ICA/EMBRAPA, DOIs), con motores puros testeados. El valor agroecológico es real, no decorativo. El problema NO es la profundidad — es la belleza/espectacularidad (ESP promedio ~6).
2. **La joya más desaprovechada es JuegoMiFincaOdyssey:** el cruce 2D↔3D estilo Odyssey es lo más calibre-Switch del proyecto y está escondido detrás de una URL, sin enlace en ningún menú.
3. **MonoVsPoliSimulator está literalmente muerto:** AGR 9, testeado, y sin una sola ruta que lo alcance. Cablearlo es trabajo de minutos, alto retorno.
4. **Hay solape Milpa:** MilpaSimulator (hondo, cableado, 5 sistemas) vs JuegoLaMilpa (mockup bonito, angosto, URL-only). Fusionar: quedarse con el arte de LaMilpa dentro del motor de MilpaSimulator.
5. **En prod (3D-first) no entra ningún juego todavía:** el manifiesto los tiene todos en PENDIENTE_DECISION. Se necesita una decisión de producto: ¿sección "Juegos" en prod.chagra.app, sí o no?

## Juego con MÁS potencial desaprovechado

**JuegoMiFincaOdyssey.** ESP 9 (la única mecánica verdaderamente calibre-Switch del repo: túnel 2D↔3D con dolly + iris), técnicamente real y con fallback para gama baja — y sin embargo **solo se alcanza escribiendo la URL a mano**, sin datos reales conectados y sin un puesto en ningún menú. Si se promueve a ruta de verdad, se le conecta la finca real del usuario (como ya hace MiFincaViva) y se le enlaza desde el hub, salta directo al #1 en potencial. Segundo lugar: **MetalSlugCampo** (mismo problema de descubribilidad + inconcluso en niveles/jefes).
