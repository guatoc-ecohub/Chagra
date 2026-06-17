# src/components — Árbol de componentes

## Pantallas principales

| Componente | Ruta | Descripción |
|-----------|------|-------------|
| `AgentScreen/` | `/agent` | Chat con el agente Chagra |
| `LoginScreen.jsx` | `/login` | OAuth2 PKCE login |
| `ProfileScreen.jsx` | `/profile` | Perfil del campesino |
| `InformesScreen.jsx` | `/informes` | Reportes y exportación |
| `AssetsDashboard.jsx` | `/assets` | Dashboard de assets |
| `AssetDetailView.jsx` | `/asset/:id` | Detalle de asset individual |
| `AssetTimeline.jsx` | — | Timeline de eventos del asset |
| `TaskScreen.jsx` | `/tasks` | Tareas pendientes |
| `TaskLogScreen.jsx` | — | Log de tareas |
| `ObservationScreen.jsx` | `/observaciones` | Observaciones / bitácora |
| `CicloCultivoScreen.jsx` | `/ciclo/:id` | Ciclo de cultivo |
| `CicloDetalle.jsx` | — | Detalle de etapa del ciclo |
| `CicloFotos.jsx` | — | Fotos del ciclo |
| `CicloObservacion.jsx` | — | Observaciones del ciclo |
| `SoilDiagnosticScreen.jsx` | `/suelo` | Diagnóstico de suelo |
| `ExtensionistaScreen.jsx` | `/extensionista` | Vista del extensionista |
| `InventoryDashboard.jsx` | `/inventario` | Inventario de insumos |
| `InventoryAuditDashboard.jsx` | — | Auditoría de inventario |
| `InventoryAuditTrail.jsx` | — | Trazabilidad de inventario |
| `InventoryEventTimeline.jsx` | — | Timeline de eventos de inventario |
| `GlaciarReporteScreen.jsx` | `/glaciar` | Reportes glaciar |
| `GlaciarHistorialScreen.jsx` | — | Historial glaciar |
| `BiodiversidadView.jsx` | — | Vista de biodiversidad |
| `CaseStudyScreen.jsx` | — | Casos de estudio |
| `PlantaPorVozScreen.jsx` | — | Registro de planta por voz |
| `ProcesosPorVozScreen.jsx` | — | Registro de procesos por voz |
| `SeguimientoProcesoScreen.jsx` | — | Seguimiento de procesos |
| `LocationDetectedScreen.jsx` | — | Pantalla de ubicación detectada |
| `HelpHomeScreen.jsx` | — | Ayuda: home |
| `HelpCicloScreen.jsx` | — | Ayuda: ciclo |
| `HelpDatosScreen.jsx` | — | Ayuda: datos |
| `HelpVozScreen.jsx` | — | Ayuda: voz |
| `HelpUsoScreen.jsx` | — | Ayuda: uso |
| `MaintenanceScreen.jsx` | — | Mantenimiento |

## Widgets y cards

| Componente | Descripción |
|-----------|-------------|
| `FincaCard.jsx` | Card de finca activa |
| `PendingTasksWidget.jsx` | Widget de tareas pendientes |
| `WelcomeStatsHero.jsx` | Hero de estadísticas de bienvenida |
| `DailyTasksView.jsx` | Vista de tareas del día |
| `EnvironmentalCard.jsx` | Card de condiciones ambientales |
| `DeepResearchCard.jsx` | Card de deep research |
| `CaseStudyTopWidget.jsx` | Widget superior de caso de estudio |
| `HytaPanel.jsx` | Panel HYTA (herramientas) |
| `IoTSensorCard.jsx` | Card de sensor IoT |
| `HelpTipCard.jsx` | Card de tip de ayuda |
| `ContextTip.jsx` | Tip contextual |
| `GuildSuggestions.jsx` | Sugerencias del gremio |

## Logs y registros

| Componente | Descripción |
|-----------|-------------|
| `HarvestLog.jsx` | Registro de cosecha |
| `SeedingLog.jsx` | Registro de siembra |
| `InputLog.jsx` | Registro de insumo |
| `InputLogForm.jsx` | Formulario de insumo |
| `InvasiveObservationLog.jsx` | Observación de invasoras |
| `BitacoraEntryDetail.jsx` | Detalle de entrada de bitácora |
| `FarmProcessConfirmCard.jsx` | Confirmación de proceso |
| `FarmProcessSummary.jsx` | Resumen de proceso |

## Voz y captura

| Componente | Descripción |
|-----------|-------------|
| `VoiceCapture.jsx` | Captura de voz |
| `VoiceConfirmation.jsx` | Confirmación de voz |
| `PhotoCaptureField.jsx` | Campo de captura de foto |
| `PhotoViewer.jsx` | Visor de fotos |
| `EvidenceCapture.jsx` | Captura de evidencia |
| `BeforeAfterPhoto.jsx` | Foto antes/después |

## Agente

| Componente | Descripción |
|-----------|-------------|
| `ChagraAgentAvatar.jsx` | Avatar del agente |
| `ChagraAgentAvatarColibri.jsx` | Avatar colibrí |
| `ChagraAgentAvatarColibri3D.jsx` | Avatar colibrí 3D |
| `ChagraAgentAvatarColibriPhoto.jsx` | Avatar colibrí con foto |
| `ChagraAgentAvatarMaiz.jsx` | Avatar maíz |
| `AgentFab.jsx` | Botón flotante del agente |
| `AgentDemoExample.jsx` | Demo del agente |
| `AIBetaBadge.jsx` | Badge "AI Beta" |
| `FeedbackButtons.jsx` | Botones de feedback |
| `FeedbackConsentModal.jsx` | Modal de consentimiento feedback |
| `FieldFeedback.jsx` | Feedback de campo |

## UI común y layout

| Componente | Descripción |
|-----------|-------------|
| `TopBar.jsx` | Barra superior |
| `QuickChipsBar.jsx` | Barra de chips rápidos |
| `ChipsToolbar.jsx` | Toolbar de chips |
| `NetworkStatusBar.jsx` | Barra de estado de red |
| `SyncIndicator.jsx` | Indicador de sincronización |
| `OfflineChip.jsx` | Chip "offline" |
| `StatusBadge.jsx` | Badge de estado |
| `ErrorBoundary.jsx` | Error boundary por ruta |
| `CriticalAlertBanner.jsx` | Banner de alerta crítica |
| `DataLossBanner.jsx` | Banner de pérdida de datos |
| `DemoModeBanner.jsx` | Banner de modo demo |
| `UpdateAvailableBanner.jsx` | Banner de actualización disponible |
| `AndroidInstallBanner.jsx` | Banner de instalación Android |
| `IosInstallBanner.jsx` | Banner de instalación iOS |
| `GpsFincaBanner.jsx` | Banner de GPS/finca |
| `OnboardingHero.jsx` | Hero de onboarding |
| `OnboardingModal.jsx` | Modal de onboarding |
| `OnboardingPiloto.jsx` | Onboarding piloto |
| `OnboardingProfile.jsx` | Perfil de onboarding |
| `GeolocationButton.jsx` | Botón de geolocalización |
| `NotificationsBell.jsx` | Campana de notificaciones |
| `NotifPermissionPrompt.jsx` | Prompt de permiso notificaciones |
| `TelemetryAlerts.jsx` | Alertas de telemetría |
| `LegalLinks.jsx` | Enlaces legales |
| `ChagraGrowLoader.jsx` | Loader animado |
| `DateField.jsx` | Campo de fecha |

## Formularios y selección

| Componente | Descripción |
|-----------|-------------|
| `SpeciesSelect.jsx` | Selector de especies |
| `MapPicker.jsx` | Selector de mapa |
| `MultiFincaModal.jsx` | Modal multi-finca |
| `MultiFincaGlobe.jsx` | Globo multi-finca |
| `ActionConfirmModal.jsx` | Modal de confirmación |
| `CaseLinkModal.jsx` | Modal de enlace de caso |
| `PlantCemeteryModal.jsx` | Modal de cementerio de plantas |
| `BiopreparadoSuggestionModal.jsx` | Sugerencia de biopreparado |
| `SplitFlow.jsx` | Flujo de división |
| `RecountDrawer.jsx` | Drawer de recuento |
| `PlanEditor.jsx` | Editor de planes |

## Visualización

| Componente | Descripción |
|-----------|-------------|
| `FarmMap.jsx` | Mapa de la finca |
| `PhenologyTimeline.jsx` | Timeline de fenología |
| `PestMonitoringWindow.jsx` | Ventana de monitoreo de plagas |
| `BiopreparadoDiagrama.jsx` | Diagrama de biopreparado |
| `BiopreparadoRecetasGallery.jsx` | Galería de recetas |
| `CarbonoPsaSubvista.jsx` | Subvista carbono/PSA |
| `CycleContentRenderer.jsx` | Render de contenido de ciclo |
| `NativeSubstituteSuggestion.jsx` | Sugerencia de sustituto nativo |
| `AltitudeBadge.jsx` | Badge de altitud |
| `HomeRegionalGreeting.jsx` | Saludo regional |
| `HelpAgentSection.jsx` | Sección de ayuda del agente |
| `HelpCycleSection.jsx` | Sección de ayuda de ciclo |
| `HelpDictionary.jsx` | Diccionario de ayuda |
| `HelpManual.jsx` | Manual de ayuda |
| `HelpRegionSelector.jsx` | Selector de región |
| `HelpVoiceQuestion.jsx` | Pregunta de voz |
| `HelpVoiceRegionalDemo.jsx` | Demo regional de voz |
| `WorkerDashboard.jsx` | Dashboard de trabajador |
| `WorkerHistory.jsx` | Historial de trabajador |
| `BackupExportButton.jsx` | Botón de backup/export |
| `CuadernoPDFButton.jsx` | Botón de PDF |
| `RestauracionPlanPDFButton.jsx` | Botón de plan de restauración |
| `OAuthCallback.jsx` | Callback OAuth |
| `Settings/` | Configuración de la app |
| `charts/` | Componentes de gráficos |
| `common/` | Componentes UI compartidos |
| `dashboard/` | Widgets de dashboard |
| `hoy/` | Módulo "Hoy en la finca" |
| `juego/` | Componentes de ludificación |
