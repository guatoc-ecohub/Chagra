# Chagra — Registro de cambios

Todas las versiones públicas de Chagra. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/), versionado en [SemVer](https://semver.org/lang/es/).

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

Para historia previa a 1.0.0 ver `git log --oneline` o el changelog interno en `Chagra-strategy/ops/`.

🐦 Chagra ya no es una app. Es un agente vivo con el que se habla en colombiano.
