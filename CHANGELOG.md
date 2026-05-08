# Changelog

Todas las novedades user-facing de Chagra. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/), versionado en [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added
- **Manual rediseñado**: 3 sub-vistas grandes (voz / uso / aprende sembrando) en lugar de 12 secciones planas apiladas. Tap targets ≥80px en home, tono `tú` cercano, anti-ladrillo. (PR #202, queue/039 + UX feedback 2026-05-08)
- **Ayuda interactiva por especie**: accordion individual para lechuga, fresa, tomate chonto. Aguacate y café aparecen con badge `Por agregar` + nota educativa contextual sobre cómo contribuir corpus desde Bitácora. (PR #201)
- **Voz IA con guardrails RAG estrictos**: Whisper STT + Ollama responde solo con corpus consolidado de la especie como contexto. Detecta dosis fuera de corpus → mensaje "Respuesta inválida, fuera de corpus" (anti-alucinación). (PR #195)
- **Tips dinámicos rotantes en HelpManual**: 31 tips agroecológicos por categoría (riego, sustrato, plagas, observación, paciencia, errores). (PRs #192, #193)

### Changed
- **Toast post-voz condicional al path de sync**: si la siembra se sincronizó directo con FarmOS, el copy dice "Sincronizado con FarmOS" (sin link a bitácora). Si quedó offline pendiente, copy "Bitácora → Recientes" + botón visible. Antes mentía siempre asumiendo path offline. (PR #197)
- **Banner sincronización clickeable + dismissable**: click en el banner de sincronización (offline/syncing/error/pendientes) ahora navega a Bitácora para ver/resolver pendientes. Botón X explícito permite cerrar manualmente. Antes el click no hacía nada y el banner tapaba la TopBar persistente sin opción de cerrar. (PR #200)
- **Asset sync pagination**: `/api/asset/{type}` ahora trae las 200 más recientes con `sort=-created`, garantizando que plantas recién creadas aparezcan en el dashboard. Antes el endpoint sin `sort` ni `page[limit]` traía solo 50 items en orden indeterminado, perdiendo plantas nuevas en repos con >50 assets. (PR #199)
- **AssetTimeline virtualizado** con react-virtuoso: paginación temporal por mes, smoothscroll en logs largos. (PR #194)
- **TypeScript-lite vía JSDoc + checkJs**: typedefs centralizados (`ChagraAsset`, `ChagraLog`, `ChagraInventoryEvent`, `ChagraSpecies`, `ChagraBiopreparado`) sin migrar archivos a `.ts`. 70% del valor de TypeScript pleno. (PR #196)

### Fixed
- **Plan Generator post-seeding**: cuando agregas planta (manzana, fresa) por voz o formulario, aparece toast con plan de alimentación sugerido. Lo encuentras en Bodega → Planes. (PR #191)

## Sugerencias inteligentes (mayo 2026)

Cambios anteriores a este changelog explícito, todos opt-in (la app sugiere, no impone):

- **Plan de alimentación al crear planta**: cuando agregas una mata (manzana, fresa, etc.), aparece toast con plan sugerido. Está en Bodega → Planes.
- **Sugerencia de biopreparados al agregar insumo**: si agregas melaza, suero de leche o similares a la bodega, modal sugiere qué biopreparados puedes hacer (Bocashi, Biol) con receta inline.
- **Companions que ya tienes primero**: en panel de gremios, los compañeros que ya están en tu finca aparecen primero con marca verde. No tienes que comprar, ya los tienes.

## Adaptive defaults (memoria de uso)

- **TaskScreen** recuerda última prioridad + zona usada.
- **HarvestLog** sugiere cantidad como mediana de cosechas pasadas para esa especie.
- **InputLogForm** pre-fillea último biopreparado aplicado.
- **Invasoras**: las relevantes a tu piso térmico aparecen marcadas con ★ primero.
- **InventoryDashboard**: banner amber cuando hay insumos bajo umbral, low-stock se ordenan primero.

## IA experimental (BETA)

Marcadas con badge BETA: funcionan pero pueden errar. Cada feature tiene botón "Reportar diagnóstico defectuoso" que registra el caso para revisar.

- **Identificar especie por foto** en SpeciesSelect → cámara → IA propone especie + alternativas. Confianza ≥70% auto-selecciona si match el catálogo.
- **Analizar foto de bitácora con IA**: en cualquier evento con foto adjunta (presente o pasado) aparece botón "Analizar foto con IA" que detecta enfermedades, deficiencias, salud general.
- Estas features requieren conexión al stack IA local (Ollama gemma3:4b en alpha). Si no responden, está fuera de servicio temporalmente.

## Galería + IA externa

- **Galería de la especie**: en el detalle de cualquier planta, ahora ves todas las fotos del operador para esa especie en tu finca (no cross-farm).
- **Consultar IA externa**: botón en plant detail copia un prompt completo (especie + piso térmico + altitud) listo para pegar en Gemini, ChatGPT o Claude.

---

Este changelog es vivo. Cada release agrega entradas en la sección `[Unreleased]`; al cortar versión semver se promueve a una entrada con número y fecha. Si encuentras un bug o quieres pedir una mejora, toca el botón flotante 💬 en la app — tu feedback construye Chagra.
