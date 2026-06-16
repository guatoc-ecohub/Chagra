# src/services — Catálogo de servicios

Capa de lógica de negocio. Cada archivo es un módulo ES con funciones exportadas (sin clases, sin DI).

## Core API & Auth

| Archivo | Responsabilidad |
|--------|----------------|
| `apiService.js` | Cliente HTTP para FarmOS JSON:API (GET/POST/PATCH assets, logs) |
| `authService.js` | OAuth2 PKCE flow: login, refresh, logout, token storage |
| `sidecarClient.js` | Cliente del Agro-MCP sidecar (FastAPI): `/api/chat`, `/api/extract`, tool chain |
| `syncManager.js` | Cola `pending_transactions` con backoff exponencial para sync offline→online |
| `payloadService.js` | Construye payloads JSON:API con resolución de relationships inline |

## Agent & NLU

| Archivo | Responsabilidad |
|--------|----------------|
| `agentService.js` | Orquestación del agente: prompt assembly, grounding, guard invocation |
| `agentIntentParser.js` | Detecta intenciones accionables (cosecha, riego, aplicación, observación) |
| `agentNluFallback.js` | Fallback cuando el LLM no entiende la intención |
| `agentPromptBase.js` | Prompt base del agente con contexto de finca, altitud, perfil |
| `agentRequestQueue.js` | Cola IndexedDB de requests del agente (status, grounding, latency) |
| `agentRequestSender.js` | Envío de requests al sidecar con retry |
| `agentCapabilities.js` | Capacidades del agente (tools disponibles, flujos) |
| `agentOutboxService.js` | Outbox de mensajes del agente para entrega diferida |
| `agentOutboxAttachment.js` | Adjuntos (fotos) en mensajes del outbox |
| `agentOutboxPhoto.js` | Procesamiento de fotos en el outbox |
| `agentPartialMerge.js` | Merge incremental de respuestas parciales del stream |
| `promptAssembler.js` | Ensambla el prompt completo con RAG + grounding + perfil |
| `knowledgeIntentRouter.js` | Ruteo de intenciones de conocimiento (no accionables) |

## AI / LLM

| Archivo | Responsabilidad |
|--------|----------------|
| `aiService.js` | Reconocimiento de especies por visión + chat general |
| `ollamaStream.js` | Streaming SSE desde Ollama local |
| `openaiStream.js` | Streaming SSE desde OpenAI-compatible API |
| `streamChatViaSidecar.js` | Streaming de chat via sidecar agro-mcp |
| `llmRouter.js` | Ruteo entre modelos (local Ollama vs remoto) |
| `llmTools.js` | Tool calling del LLM (function calling) |
| `llmGuardrails.js` | Guardrails pre-prompt (instrucciones de seguridad) |
| `ragRetriever.js` | Recuperación de pasajes del corpus (RAG) |
| `ragSynonyms.js` | Expansión de sinónimos campesinos para queries RAG |
| `ragWithPhotos.js` | RAG enriquecido con contexto visual (fotos) |
| `ragTelemetry.js` | Telemetría de efectividad del RAG |
| `corpusLoader.js` | Carga del corpus de documentos desde data/ |

## Output Guards (anti-alucinación)

| Archivo | Responsabilidad |
|--------|----------------|
| `outputGuards.js` | 40+ guards deterministas post-LLM: sintéticos, altitud, especies, dosis, etc. |
| `streamGuards.js` | Guards aplicados en tiempo real durante el streaming |

## Telemetry (privacy-safe)

| Archivo | Responsabilidad |
|--------|----------------|
| `llmTelemetryService.js` | Métricas LLM (modelo, latencia, tokens, processor) — sin prompts |
| `voiceTelemetryService.js` | Métricas de voz (event_type, duration_ms, accepted) — sin audio |
| `voiceTelemetry.js` | Eventos de sesión de voz (sessionStorage + localStorage) |
| `agentTelemetrySync.js` | Sincronización de telemetría del agente al backend |
| `gpuTelemetryService.js` | Métricas de GPU (temperatura, utilización, memoria) |

## Agroecology / Diagnóstico

| Archivo | Responsabilidad |
|--------|----------------|
| `climaService.js` | Pronóstico del tiempo, datos históricos, ENSO |
| `climateCycleService.js` | Ciclos climáticos y su efecto en cultivos |
| `soilDiagnostic.js` | Diagnóstico de suelo (textura, pH, MO, nutrientes) |
| `waterDiagnostic.js` | Diagnóstico de agua (riego, calidad, disponibilidad) |
| `animalDiagnostic.js` | Diagnóstico animal (sanidad, alimentación, reproducción) |
| `biodiversidadMonitor.js` | Monitoreo de biodiversidad en la finca |
| `phenologyCalculator.js` | Cálculo de fenología por cultivo y piso térmico |
| `pisoTermicoClassifier.js` | Clasificación de piso térmico por altitud |
| `altitudeService.js` | Servicio de altitud (GPS + lookup) |
| `ensoService.js` | Datos del fenómeno ENSO (El Niño/La Niña) |
| `ensoContext.js` | Contexto ENSO para prompts del agente |
| `ensoModulador.js` | Modulación de recomendaciones según ENSO |
| `skyConditionService.js` | Condiciones del cielo (nubosidad, radiación) |
| `atmosphereService.js` | Datos atmosféricos (presión, humedad) |
| `incendioRiskService.js` | Riesgo de incendios forestales |
| `lunarPestService.js` | Calendario lunar para manejo de plagas |

## Inventory & Materials

| Archivo | Responsabilidad |
|--------|----------------|
| `inventoryService.js` | Gestión de inventario de insumos (material) |
| `inventoryReconcile.js` | Reconciliación de inventario (teórico vs real) |
| `inventoryEvents.js` | Eventos de inventario (entradas, salidas, ajustes) |

## Finca & Game

| Archivo | Responsabilidad |
|--------|----------------|
| `fincaActiveStore.js` | Finca activa seleccionada por el usuario |
| `fincaEvolutionService.js` | Evolución de la finca en el tiempo |
| `fincaGameService.js` | Lógica de ludificación (Julieta) |
| `fincaGameStateService.js` | Estado del juego (niveles, logros) |

## Social & Extension

| Archivo | Responsabilidad |
|--------|----------------|
| `extensionistaService.js` | Vista y funciones del extensionista |
| `socialPrefiltro.js` | Prefiltro de contenido social |
| `guildService.js` | Gestión de grupos/comunidades de campesinos |

## Export & Reports

| Archivo | Responsabilidad |
|--------|----------------|
| `exportService.js` | Exportación CSV de trazabilidad (UTF-8 BOM, separador ;) |
| `cuadernoPDF.js` | Generación de cuaderno de campo PDF |
| `cuadernoPDFTemplates.js` | Plantillas para el PDF del cuaderno |
| `glaciarExport.js` | Exportación para el sistema glaciar |
| `glaciarCaaml.js` | Formato CAAML para reportes de avalanchas/nieve |
| `glaciarSafety.js` | Validaciones de seguridad para reportes glaciar |
| `glaciarZenodoMeta.js` | Metadatos Zenodo para datasets glaciar |
| `dataBackup.js` | Backup de datos locales (IndexedDB → JSON) |

## Restoration & Carbon

| Archivo | Responsabilidad |
|--------|----------------|
| `restauracionDiagnostic.js` | Diagnóstico de restauración ecológica |
| `restauracionPlanPDF.js` | Plan de restauración en PDF |
| `restauracionRecetaFormatter.js` | Formateo de recetas de restauración |
| `carbonoAlerta.js` | Alertas de mercado de carbono |
| `carbonoSeguimiento.js` | Seguimiento de proyectos de carbono |
| `psaElegibilidad.js` | Elegibilidad para Pagos por Servicios Ambientales |

## Voice & TTS

| Archivo | Responsabilidad |
|--------|----------------|
| `voiceService.js` | Servicio de voz (grabar, transcribir) |
| `voiceObservationService.js` | Observaciones por voz |
| `voiceTaskService.js` | Tareas por voz |
| `voiceRagEnricher.js` | Enriquecimiento RAG de transcripciones |
| `voiceToDraft.js` | Conversión de voz a borrador de log |
| `ttsService.js` | Text-to-speech (voz colombiana) |
| `ttsHelpers.js` | Utilidades TTS |
| `voseoFilter.js` | Filtro de voseo → ustedeo/tuteo |

## Misc

| Archivo | Responsabilidad |
|--------|----------------|
| `pushService.js` | Notificaciones push |
| `notificationsService.js` | Gestión de notificaciones |
| `feedbackService.js` | Feedback del usuario al agente |
| `operatorIdentityService.js` | Identidad del operador |
| `operatorPhotoService.js` | Foto del operador |
| `photoService.js` | Servicio de fotos (captura, compresión) |
| `photoCycleService.js` | Fotos del ciclo de cultivo |
| `visionCacheService.js` | Cache de resultados de visión |
| `visionQueueService.js` | Cola de procesamiento de visión |
| `visionWarmService.js` | Precalentamiento del modelo de visión |
| `locationService.js` | Servicio de ubicación |
| `veredaService.js` | Datos de veredas |
| `gpsFincaDetector.js` | Detección de finca por GPS |
| `demoProfile.js` | Perfil demo para onboarding |
| `homeModuleSelector.js` | Selección de módulos en home |
| `profileChipSelector.js` | Selección de chips de perfil |
| `tipsService.js` | Tips contextuales para el usuario |
| `contextTips.js` | Tips basados en contexto |
| `conversationCaptureService.js` | Captura de conversaciones |
| `conversationMemory.js` | Memoria de conversación |
| `episodicMemoryService.js` | Memoria episódica del agente |
| `entityExtractor.js` | Extracción de entidades del texto |
| `speciesResolver.js` | Resolución de especies contra el catálogo |
| `tierService.js` | Sistema de tiers para especies |
| `cycleTaskService.js` | Tareas del ciclo de cultivo |
| `splitService.js` | División de logs (multi-asset) |
| `stageConfirmationService.js` | Confirmación de etapas |
| `stageSuggestionService.js` | Sugerencias de etapas |
| `observationService.js` | Servicio de observaciones |
| `farmEventService.js` | Eventos de finca |
| `farmProcessSync.js` | Sincronización de procesos |
| `glosarioCaucaService.js` | Glosario de términos del Cauca |
| `regionalismsService.js` | Regionalismos colombianos |
| `institutionalSources.js` | Fuentes institucionales (ICA, Agrosavia, IDEAM) |
| `caseStudyDemoLoader.js` | Carga de casos de estudio demo |
| `caseStudyLessonsSummarizer.js` | Resumen de lecciones de casos de estudio |
| `caseStudyTreatmentRecommender.js` | Recomendaciones de tratamiento |
| `caseStudyVoiceExtractor.js` | Extracción de voz de casos de estudio |
| `deepResearchClient.js` | Cliente de deep research |
| `planGeneratorService.js` | Generador de planes de cultivo |
| `plantDossierService.js` | Dossier de plantas |
| `iotMockService.js` | Mock de sensores IoT |
| `iotCostCalculator.js` | Calculadora de costos IoT |
| `iotValeLaPena.js` | Análisis costo-beneficio IoT |
| `emptyDbDetector.js` | Detector de BD vacía (primer uso) |
| `chipIntentRouter.js` | Ruteo de intención por chips |
| `queryComplexityAnalyzer.js` | Análisis de complejidad de queries |
| `proactiveGreeting.js` | Saludo proactivo del agente |
| `hoyEnFincaService.js` | Contenido "Hoy en la finca" |
| `alertEngine.js` | Motor de alertas |
| `cropAlertEngine.js` | Alertas de cultivos |
| `actionExecutor.js` | Ejecutor de acciones del agente |
| `externalAiPromptBuilder.js` | Builder de prompts para AI externa |
| `capabilityHealth.js` | Health check de capacidades |
| `pageReload.js` | Recarga de página controlada |
| `swRegistration.js` | Registro del Service Worker |
| `swUpdateAck.js` | Acknowledgement de actualización del SW |
| `tenantContext.js` | Contexto de tenant (multi-finca) |
| `buildDraftFromSeeding.js` | Construcción de borrador desde siembra |
| `sanitizeError.js` | Sanitización de errores para el usuario |
| `streamDeadline.js` | Timeout/abort de streams |
| `subgrafoToText.js` | Conversión de subgrafo AGE a texto |
