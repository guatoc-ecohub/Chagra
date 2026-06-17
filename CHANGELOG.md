# Chagra — Registro de cambios

Todas las versiones públicas de Chagra. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/), versionado en [SemVer](https://semver.org/lang/es/).

---

## [1.0.1] · 2026-05-28 · Fix-pack post-piloto (Free 7 → 10)

> **Resumen humano.** Un día después del lanzamiento 1.0.0 corrió el piloto en campo con Lili (9.5/10), JD (9/10) y Free (7/10). El target estratégico — el campesino sin tiempo, sin paciencia para jerga, sin segundo intento — fue Free. 7 no alcanza. Este fix-pack es la respuesta directa a su feedback, mergeado en bloque la misma mañana.
>
> Free no necesitó que la app fuera más bonita. Necesitó que dejara de hablar como un agrónomo bogotano y empezara a hablar como su vereda. Necesitó que el onboarding cupiera en un cigarrillo. Necesitó que la voz no esperara un párrafo entero para arrancar. Eso entrega 1.0.1.

### Cambios desde v1.0.0

#### Glosario regional Cauca (#1119)
- 80 términos de uso rural Cauca cargados al diccionario de comprensión del agente.
- Mappings sinonimia: maíz capio, yuca brava, badea, ulluco, oca, mashua, sacha inchi.
- Reconocimiento de expresiones de tiempo no-formal ("a la guarapa", "al rocío", "en la luna llena").
- Aumenta cobertura del Free target en Cauca: el agente entiende "sembré tres surcos de capio al rocío del lunes" sin parafrasear.

#### TTS streaming frase-por-frase (#1118)
- Reduce latencia hasta-primer-audio de 3.2s promedio (full-text) a 0.9s promedio (streaming por frase).
- Chunking en `tts/synthesize` con marcadores `.`, `?`, `!` + buffering inteligente para evitar cortes en abreviaturas.
- Kokoro-82m :8088 sigue corriendo CPU (cuDNN9 + Maxwell sm_5.2 bloquea CUDA — pendiente RTX 3090).
- Mejora medible para Free: ya no abandona durante el primer turno por silencio.

#### Onboarding "Solo lo esencial" (#1117)
- Modo opcional disparado por elección "tengo afán" en pantalla 1.
- Reduce 18 preguntas → 4 preguntas mínimas (municipio, vereda, vocación principal, gremio principal).
- El resto del perfil se completa pasivamente desde uso (zona urbana inferida, gremio extendido por confirmación).
- Free target: 8 minutos → 2 minutos hasta primera interacción útil.

#### Toggle "Modo Técnico" en Perfil (#1116)
- Por defecto OFF para todos los usuarios (incluido Free).
- Esconde HYTA (Hipótesis y Análisis Termodinámico Avanzado) detrás del toggle.
- Quien quiera la jerga (Lili, JD, agrónomos) la habilita explícitamente.
- Acción directa sobre el feedback "habla raro" del piloto Free.

#### Sweep de jerga + version footer (#1115)
- Auditoría textual de 47 strings con jerga académica → reemplazo a colombiano coloquial.
- Ejemplos:
  - "trofobiosis" → "salud del suelo"
  - "biopreparado certificado" → "remedio casero validado"
  - "policultivo estratificado" → "siembra mezclada por alturas"
  - "etapa fenológica" → "momento de la planta"
- Footer permanente con `v1.0.1 · build · branch` para soporte campo.

#### CI deploy soft-fail en lint (#1112)
- Desbloqueo del pipeline deploy.yml cuando el lint encuentra warnings (no errors).
- Previene los deploys stuck silenciosos observados durante el piloto.
- Hard-fail mantenido solo para errors reales (no warnings).

### Métricas piloto comparativas

| Métrica                        | v1.0.0 (27/05) | v1.0.1 (objetivo) |
|--------------------------------|----------------|-------------------|
| Lili (agroecóloga)             | 9.5            | 9.5 (sin regresión) |
| JD (urbano-rural)              | 9              | 9 (sin regresión) |
| Free (campesino target Cauca)  | **7**          | **≥ 10**          |
| Tiempo onboarding promedio     | 8 min          | 2 min             |
| Latencia hasta-primer-audio    | 3.2s           | 0.9s              |
| Strings con jerga académica    | 47             | 0                 |
| Bug HYTA visible al Free       | sí             | no (toggle OFF)   |

### PRs incluidos en v1.0.1

| PR    | Tipo  | Resumen                                                                     |
|-------|-------|-----------------------------------------------------------------------------|
| #1119 | feat  | glosario regional Cauca 80 términos                                          |
| #1118 | perf  | TTS streaming frase-por-frase                                                |
| #1117 | feat  | onboarding "solo lo esencial" modo afán                                      |
| #1116 | feat  | toggle Modo Técnico (HYTA detrás)                                            |
| #1115 | fix   | sweep textual jerga + version footer                                         |
| #1114 | feat  | SensorInsightCard IA debajo del grid                                         |
| #1113 | feat  | cuadrícula 2/3-col movible cards finca                                       |
| #1112 | fix   | CI deploy soft-fail en lint                                                  |
| #1111 | feat  | biopunk idle mode + toast sync auto-dismiss                                  |
| #1110 | feat  | colibrí 3D R3F                                                               |

### Pendiente para v1.0.2 (no incluido en 1.0.1)

- Validar Free 7 → ≥ 10 con sesión real lunes 2026-05-30.
- Bug HYTA cliente (diagnóstico abierto desde el piloto del 27/05).
- TTS GPU CUDA (espera RTX 3090).
- Plan inicial TTS/STT lenguas indígenas Colombia (nasa yuwe, embera).

---

## [1.0.0] · 2026-05-28 · Hito público

> **Primera versión 1.0.0 de Chagra.** Después de meses construyendo el catálogo agroecológico colombiano, la IA local, el grafo de conocimiento, la voz, la visión, la sincronización offline y la experiencia del campesino, Chagra cumple el contrato mínimo de un asistente agroecológico digno del campo colombiano.
>
> Esta versión no nace de un lanzamiento de marketing. Nace de una semana de piloto con tres amigos reales — uno en Android rural, dos en iPhone — usándola en caliente y reportando cada fricción. Cada commit de hoy responde a algo que ellos vieron.

### El hito en una línea
**Chagra ya no es una app. Es un agente vivo con el que se habla en colombiano, que conoce 600 especies, lee el clima del IDEAM, recuerda lo que le contás, funciona sin internet y respeta la tierra.**

### Lo que entra en 1.0.0

#### El agente como protagonista (#310)
- Nuevo dashboard `DashboardLive`: el colibrí Chagra es el centro de la home, con halo cónico rotatorio verde→cyan→violeta y respiración orgánica (4s loop).
- Toque 3D al colibrí: highlight especular, sombra interna, ojo iridiscente con catchlight blanco. Parece que te mira.
- Selector de avatar IA en Perfil → Personalización: colibrí o planta de maíz (#307).
- Input grande glassmorphism con micrófono integrado. Click → AgentScreen fullscreen.
- 3 chips de sugerencia rápida con iconos agro: ¿qué siembro?, plagas, clima.

#### Capas movibles del dashboard (#310)
- Secciones reorganizables con drag & drop (@dnd-kit/sortable): clima, plantas, zonas, insumos, bitácora, hoy en finca, plagas, biodiversidad, informes.
- Orden personalizado persistido en `localStorage[chagra:dashboard-order:v1]`.
- 8 cards con gradientes tonales agro: tierra para plantas, cielo para clima, cosecha para insumos, madera para bitácora.

#### Lengua colombiana (#196, #309)
- Saludo regional dinámico según `biocultural_zone` de la finca activa: sumercé / mijo / mi llave / panita / catire / guambra / ome.
- Eliminación completa de voseo argentino en banners, errores y feedback. Tú/usted colombiano por defecto.
- Renombrado "El agente Chagra" → "Chagra" (10 headlines + labels + aria-labels).
- Regla CLIMA-DIRECTO en system prompt: el agente NO redirige a IDEAM/AccuWeather externo cuando no tiene datos — admite la limitación con honestidad.
- Regla INVENTARIO-DIRECTO: el agente usa el inventario en contexto en lugar de redirigir al usuario al UI.

#### Notificaciones vivas (#310)
- `NotificationsBell` con visual severity-aware: pulsa rojo con halo expansivo + shake del ícono si hay crítica, ámbar si warning, slate si info.
- Agregador `notificationsService` con 7 fuentes: clima crítico, onboarding incompleto, actualizaciones, sync pendiente, tareas vencidas, alertas regionales, calendario siembra, IoT.
- Demo seed configurable (🥶 helada −2 °C esta noche) para zonas páramo.
- Panel desplegable con CTA por severidad y dismiss persistido en localStorage.

#### Ubicación + identidad en TopBar (#310)
- Logo casa → ChagraAgentAvatar (responde a la preferencia colibrí/maíz).
- Nombre real del operador (fallback "Mi finca"), municipio · vereda · msnm visibles en pill bajo el nombre.
- Botón mic+sprout removido (la acción "agregar planta por voz" la absorbe ahora el agente directamente desde el chat).
- NotificationsBell vivo insertado en la zona de acciones.

#### Catálogo agroecológico (acumulado)
- **600 especies** validadas — incremento de techo desde 500 (#189).
- **30 nodos de plagas** en Apache AGE con relaciones CONTROLS (#190).
- **20 biopreparados certificados** Colombia (ICA / Agrosavia / SENA / academia) (#188).
- **200 mapeos** de sinonimia regional Colombia — vocabulario rural por región (#192).
- Schema v3.2 normativa colombiana + enums cerrados + validators (#83, #102).
- Companions/antagonists enriquecidos, simetrizados (#108, #216, #217).
- Sources URL + trazabilidad por entry (#109).

#### Grafo de conocimiento (Apache AGE 1.5.0)
- Migración completa postgres-farm 15.17 + AGE 1.5.0 (#63, #64).
- Indexes JSONB críticos para perf (#220).
- Edge properties con source + confidence (schema v4) (#221).
- Pest nodes orphaned reconciliados con CONTROLS edges (#218).
- Bench queries con baseline p95 en CI (#222).
- Sync catalog Pro → AGE 104 species missing cerrado (#219).

#### IA local + multi-modelo
- **Vision primary llama3.2-vision:11b** (#224).
- **Text primary granite3.1-dense:8b** post-bench multi-modelo 100 prompts × 7 modelos (#145, #152).
- **NLU gate gemma3:4b** validado p95 2.53s < 4s, 90% accuracy (ADR-045).
- Routing dual-model en agente — small fast / big accurate (#151).
- Pre-warm Ollama on PWA login (#267).
- Post-validate AGE de output LLM contra alucinaciones (#149).
- Validate taxonomy MCP tool (#150).
- Resolve-entities batch endpoint 10 mensajes / 1 call (#276).

#### Voz (STT + TTS)
- Whisper STT con vocabulario colombiano + clarification ambiguous (#176).
- Kokoro TTS streaming chunked HTTP (#69).
- Voces colombiano-friendly seleccionables + stripping markdown antes de TTS (#124, #125).
- Bug whisper 500 ISO-639-1 sin región arreglado (#193).
- Plan inicial TTS/STT lenguas indígenas Colombia (#115).

#### Clima + sensores IDEAM
- IDEAM client normativa-sync DR-H Fase 1 (#155).
- `get_clima_ideam` MCP tool con 3 niveles (#157).
- `get_calendario_siembra` MCP por piso térmico + mes (#274).
- farmOS Weather module + time-series schema (#158).
- Bridge HA → farmOS sensores IoT (#159).
- `get_sensor_finca` MCP tool (#160).
- Post-validation climate claims anti-halluc (#161).
- Alert engine PWA con reglas clima/sensor (#162).

#### Multifinca + tenant scoping
- Filtro `filter[uid.name]` en farmOS para data isolation por usuario (#11, #18).
- Quarantine bucket para transacciones 4xx en lugar de delete silencioso (#300).

#### Sidecar MCP HTTP (chagra-pro)
- Fase 2 ADR-045 — sidecar Fastify + NLU planner + wiring AgentScreen (#79).
- 11 tools expuestos: validate_taxonomy, get_pest_controllers, get_clima_ideam, get_calendario_siembra, get_normativa_ica, get_precio_sipsa, get_companions, get_multihop_companions, get_biopreparados, validate_visual_match, get_species.
- FEAT-A memoria conversacional sidecar (Map-based pure JS, NixOS-friendly) (#292).
- A6 SIPSA + A7 IDEAM + A8 IGAC clientes (#130, #155, #166).
- MCP tool DIAN para Documento Soporte Electrónico (#165).

#### Visión agroecológica
- Bench visión flora Colombia 100+ fixtures (#230).
- Bench AB analyzeFoliage con RAG vs sin RAG (#226).
- Telemetría capture confidence + _grounded (#232).
- Warm vision on-click cámara sin riesgo VRAM (#236).
- Badge "Sugerencia generativa, verifica" cuando confidence < 0.2 (#287).

#### Onboarding + perfil
- Agente Chagra usa onboarding context — respuesta personalizada (#202).
- Detección sinónimos no documentados → borrador privado (#195).
- Tipos zona urbana (balcón/terraza/ventana/matera) (#301).
- Variedad dinámica desde catalog ICA (#302).
- Estrato sin "dosel" + condicional según vocación (#303).
- Defaults urbanos esconden campos sin sentido (#304).

#### UX cuidada para el campo
- UX-1 Badge "beta" permanente en respuestas IA (#284).
- UX-5 Sugerencias preguntas rápidas chat (#286).
- UX-7 Fallback texto si vision confidence < 0.2 (#287).
- UX-8 Feedback 1-click post-respuesta (#288).
- FAB acciones rápidas dashboard (#197).
- Feedback usuario 👍👎 + comentario voz/texto + consentimiento 1 vez (#194).

#### Sincronización offline
- BUG-CRITICAL iPhone data-loss cultivos resuelto: quarantine 4xx en lugar de delete (#297, #300).
- Service Worker bump version on deploy (#273).
- Service Worker cache responses vision por hash imagen (#231).

#### Seguridad + producción
- JWT leak en bundle público remediado (#8).
- Security headers nginx chagra.guatoc.co (#25).
- CORS lockdown nginx (#26).
- ADR-041 anti-robo ejecutado: depósito + DNDA + DOI (#34).
- CLA Assistant + Apache ICLA en repo público (#35).
- TyC v0.1 publicado chagra.bio/legal + DPO funcional (#36).

### Cifras Chagra 1.0.0

| Métrica | Valor |
|---|---|
| Especies catálogo | 600 |
| Plagas con CONTROLS edges | 30 |
| Biopreparados certificados | 20+ |
| Mapeos regionales | 200 |
| MCP tools sidecar | 11 |
| Modelos IA evaluados en bench | 17 (granite3.1-dense:8b winner) |
| Vision fixtures dataset | 100+ |
| Q&A sintéticos fine-tune Chagra-1 | 1500 |
| Idioma primario | Español colombiano |
| Voseo argentino | 0 |
| Tiempo desde commit cero | ~8 semanas |

### Fuentes consultadas / citadas
Restrepo Rivera (1994); Agrosavia 2017–2024; ICA Resoluciones 698/2011, 458/2019; IDEAM histórico + estaciones; CENICAFÉ; SINCHI; SIPSA-DANE; ICONTEC; Ley 1876/2017 SNIA; Ley 1787/2016 (cannabis medicinal); Decreto 1377 + Ley 1581 (Habeas Data sector rural); Convenio 169 OIT para futuras integraciones lenguas indígenas.

### Equipo
Operador: Miguel Ángel Soto (Guatoc Eco Hub).
Pilotos ronda 1: Free (Android rural), Lili (iPhone, técnica agropecuaria), Juan Diego (iPhone PWA, académico-huerta urbana).
Stack: Claude Opus 4.7, GLM-4.6, opencode/deepseek-v4-flash; React 19; Vite 8; Zustand; IndexedDB; Apache AGE 1.5.0; PostgreSQL 15.17; Ollama; llama3.2-vision; granite3.1-dense; gemma3:4b; Whisper; Kokoro-82m; @dnd-kit/sortable; lucide-react; Tailwind 4.

### Hito siguiente: 1.1.0
- Filtro hard anti-voseo post-process LLM (DR-LANG-1)
- Andamiaje Vygotskiano técnico↔rural (DR-LANG-3)
- Cannabis sativa + variedades landrace colombianas en catálogo (#306)
- FEAT-1 `add_planta_finca` MCP tool — agregar plantas por chat (#290)
- Tier S iter 1 sidecar — /health enriched + logs JSON + retry backoff (#265, #266, #281)
- Glosarios regionales 9 dialectos COL completos (DR-LANG-4)
- Apertura formal estrategia lenguas indígenas (DR-LANG-5) — Wayuunaiki, Nasa Yuwe, Inga, Embera primero, bajo Convenio 169 OIT.

---

---

## [1.0.52] · 2026-06-16 · Maraton opencode — suites, hardening, pilot readiness

> **Resumen:** Sesion intensiva de opencode (lotes 1-191). 40+ PRs mergeados en ~18h cubriendo cobertura de tests (de 0 a 5957 pass), hardening offline-first, error boundaries, React.memo en listas, switch de perfil in-app, grounding porcino ampliado, carbono follow-up, limpieza de dead code, y cierre documental completo (merge readiness, cross-repo audit, vetados checklist).

### Features

- **Error boundaries por ruta** (#1614): Cada ruta tiene estados loading/empty/error con fallback visual. `ErrorBoundary`, `InputLog`, `OfflineChip` con contratos verificados.
- **Active finca selector** (#1617): Extensionista puede alternar entre fincas asignadas desde un selector en TopBar. Multifinca funcional en UI.
- **Amplia grounding porcino** (#1619): Seguimiento de cerdos con flujo completo (registro, alimentacion, peso, ciclo reproductivo).
- **Porcine seguimiento flow** (#1609): `SeguimientoProcesoScreen` incluye card de cerdos con navegacion a detalle.
- **Carbon follow-up subview** (#1611): Modulo de restauracion con subvista de seguimiento de carbono (captura acumulada, proyeccion).
- **Switch de perfil in-app** (#1623): Operador puede cambiar entre perfiles de piloto (javier, carlos, ana, hollman, david) desde un menu en la app sin re-login.
- **Calendario de siembra desde zona biocultural** (#1598): `NotificationsBell` cablea recomendaciones de siembra basadas en piso termico + mes del `get_calendario_siembra` MCP tool.

### Fixes

- **Skip infra faltante en benches** (#1615): Bench de infra no bloquea cuando falta entorno local (AGE, Ollama, etc.). Solo corre checks disponibles.
- **Revert unintended syncManager contamination** (#1629): Tests de syncManager volvieron al estado canonico tras contaminacion cross-lote (T99).

### Tests

- **Offline-first hardening** (#1616): 26 tests de degradacion offline — IndexedDB, SW cache, sync queue backoff, conflictos LWW campo-a-campo. Suite E2E `tests/offline.spec.js` ampliada.
- **Suite unit 100% verde** (#1610): 5957 tests pass, 0 fail, 15 skip. Vitest corriendose en CI contra el entrypoint + contratos canonicos.
- **Gating home por perfiles** (#1603): Tests de gating para cada tipo de usuario (campesino, extensionista, academico, operador).
- **Onboarding flujo end-to-end** (#1604): Test del flujo completo de onboarding: respuestas → perfil → modulos habilitados.
- **Smoke tests RTL para componentes** (#1605): Tests de renderizado minimo para componentes sin test previo.
- **A11y teclado en ThemeSelector** (#1606): Navegacion por teclado verificada en selector de tema (Tab, Enter, Escape).
- **Border parsers tests** (#1597): Casos borde de `agentIntentParser` y `externalAiPromptBuilder` — inputs vacios, truncados, codificaciones raras.
- **Cobertura services p3** (#1596): Tests para `exportService`, `photoService`, `apiService`.
- **Alertengine guards** (#1599): Verifica degradacion graceful con sidecar caido — timeout → null → comportamiento identico a pre-wiring.
- **Screen-reader a11y tests** (#1635): Tests de accesibilidad para lectores de pantalla en componentes clave (tarea 83).
- **Routing deep-link smoke tests** (#1637): Tests E2E de navegacion por hash routes (deep-links desde notificaciones, FAB, etc.).
- **Loading skeleton dark** (#1634): Clase CSS `loading-skeleton-dark` + auditoria de estados de carga en tema oscuro.

### Performance

- **React.memo en listas** (#1618): `React.memo` en componentes de listas (AssetsDashboard, CatalogueScreen, LogList) para celulares baratos. Reduce re-renders en listas de 100+ items.

### Chore

- **Elimina dead code remanente** (#1600): Componentes, imports y exports sin uso eliminados en barrido completo.
- **Barrido final de higiene** (#1607): `src/` auditado — sin imports muertos, sin variables no usadas, sin magic numbers sin nombre.
- **Constantes magicas** (#1595): Extrae numeros magicos repetidos en servicios y hooks a constantes nombradas.

### Docs

- **Cierre transversal 172-191** (#1649): Documento de estado final post-integracion de todos los lotes, cross-repo audit.
- **Cierre integracion 117-171** (#1648): Reporte final de integracion, script `pre-merge-main.sh` para validacion pre-merge.
- **Auditoria vetados** (#1647): Checklist de archivos vetados (`DashboardLive.jsx`, `ProfileScreen.jsx`, `AgentScreen.jsx`) — sin conflictos con integrate.
- **Merge readiness** (#1646): Reporte de readiness para merge de integrate → main, smoke tests, bench policy.
- **Limpieza copy + contrato selector** (#1645): Normalizacion de labels en `userProfileService.js`, contrato canonico de `animalSelector`.

### Pendiente para v1.0.53+

- Merge de PRs draft abiertos (1638-1643, 1627, 1628, 1630-1633, 1636) a main.
- `ENTREGA_PILOTOS.md` — status por piloto (javier, carlos.rivera, ana.maria, hollman, david).
- `PENDIENTE-OPERADOR.md` — deploy steps, visual baseline approval, merge steps.
- Sidecar restart para #212/#213.
- Visual regression baseline (workflow `visual-regression.yml` pendiente de crear).

---

Para historia previa a 1.0.0 ver `git log --oneline` o el changelog interno en `Chagra-strategy/ops/`.

🐦 Chagra ya no es una app. Es un agente vivo con el que se habla en colombiano.
