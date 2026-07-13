# Inventario de Rutas y Componentes — Chagra PWA (rama dev)

> **Auditoría para `prod.chagra.app`** — frontend 3D-first limpio.
> Vista principal = valle 3D. Vista global = Sierra Nevada + galería de mundos por piso térmico.
> Fecha: 2026-07-13. Solo-lectura, sin modificar código.

---

## Índice

1. [Tabla maestra de rutas (109 rutas app + 68 mockups)](#1-tabla-maestra-de-rutas)
2. [Clasificación por categoría](#2-clasificación-por-categoría)
   - [2D NÚCLEO](#2d-núcleo)
   - [3D — valle, sierra, mundos, criaturas](#3d)
   - [Mockups (showcases)](#3d)
   - [LEGACY — candidatos a excluir](#legacy)
3. [Login / Auth / Backend](#3-login--auth--backend)

---

## 1. Tabla Maestra de Rutas

Router: `src/App.jsx` — patrón `case '<view>':` con `navigate(view, data)`. No React Router, es un state machine custom con 68 rutas mockup y 109 rutas app.

### 1.1 Rutas nucleares (no mockup)

| Ruta | Componente lazy | Tipo | ¿Va a prod? | Motivo |
|---|---|---|---|---|
| `loading` | `ChagraGrowLoader` (static) | 2D-app | **sí** | Splash de arranque |
| `login` | `LoginScreen` (lazy) | 2D-app | **sí** | Auth farmOS |
| `oauth-callback` | `OAuthCallback` (lazy) | 2D-app | **sí** | Callback OAuth2 PKCE |
| `dashboard` | `DashboardLive` (lazy) | 2D-app | **sí** | Home post-login con AgentHero + cards |
| `onboarding-perfil` | `OnboardingProfile` (lazy) | 2D-app | **sí** | Primer uso: crear perfil |
| `onboarding-perfil-clasico` | `OnboardingCondensado` (lazy) | 2D-app | **duda** | Variante clásica del onboarding |
| `ubicacion-detectada` | `LocationDetectedScreen` (lazy) | 2D-app | **sí** | Detección de ubicación GPS |
| `agente` | `AgentScreen` (lazy) | 2D-app | **sí** | Chat IA + herramientas |
| `perfil` | `ProfileScreen` (lazy) | 2D-app | **sí** | Perfil del operador |
| `hoy_finca` | `HoyEnFincaScreen` (lazy) | 2D-app | **sí** | "Qué hacer hoy" |
| `evolucion` | `MiFincaEvolucionScreen` (lazy) | 2D-app | **sí** | Evolución de la finca |
| `juego` | `MiFincaVivaScreen` (lazy) | 2D-app | **duda** | Juego "Mi finca viva" |
| `defensores` | `DefensoresFincaScreen` (lazy) | 2D-app | **duda** | Juego defensores finca |
| `milpa` | `MilpaSimulator` (lazy) | 2D-app | **duda** | Simulador milpa |
| `doom_finca` | `DoomFincaScreen` (lazy) | 2D-app | **duda** | Metal Slug del campo |
| `subsuelo` | `MundoSubsuelo` (lazy) | 3D-escena | **sí** | Diorama subsuelo vivo |
| `espiritu_pro` | `EspirituProScreen` (lazy) | 2D-app | **sí** | Selector de espíritu guardián |
| `valle3d` | `EntradaValle3DMockup` (lazy) | 3D-escena | **sí** | EL VALLE 3D — vista principal |
| `mundo` | `MundoScreen` (lazy) | 3D-escena | **sí** | Mundo 3D individual (cualquier mundoId) |
| `mundo_cultivos` | `MundoCultivosHub` (lazy) | 2D-app | **sí** | Hub de cultivos 2D |
| `ciclo_vivo` | — | 3D-escena | **sí** | Ciclo vivo de una planta en 3D |
| `mercado` | `MercadoScreen` (lazy) | 2D-app | **duda** | Mercado local (red humana) |
| `directorio` / `especies` | `DirectorioEspeciesScreen` (lazy) | 2D-app | **sí** | Directorio de especies |
| `plagas` | — | 2D-app | **sí** | Plagas y enfermedades |
| `toxicologia` | `ToxicologiaScreen` (lazy) | 2D-app | **sí** | Toxicología de biopreparados |
| `glaciar` | `GlaciarReporteScreen` (lazy) | 2D-app | **sí** | Módulo glaciar (La Cordada) |
| `glaciar_historial` | `GlaciarHistorialScreen` (lazy) | 2D-app | **sí** | Historial glaciar |
| `extensionista` | `ExtensionistaScreen` (lazy) | 2D-app | **sí** | Vista del extensionista |
| `casos` | `CaseStudyScreen` (lazy) | 2D-app | **sí** | Casos de estudio |
| `caso_detail` | `CaseStudyDetail` (lazy) | 2D-app | **sí** | Detalle de caso |
| `faq` / `help` / `ayuda` | `FaqScreen` | 2D-app | **sí** | FAQ + ayuda |
| `aprende` | `DirectorioEspeciesScreen` (reusado) | 2D-app | **sí** | Hub "Aprende" |
| `curso` | `CursoChagra` | 2D-app | **sí** | Curso de uso de Chagra |
| `mapa` | `MapPicker` (lazy) | 2D-app | **sí** | Mapa de la finca |
| `gestionar` / `activos` | `AssetsDashboard` (lazy) | 2D-app | **sí** | Gestión de activos |
| `bodega` | `InventoryPage` (lazy) | 2D-app | **sí** | Bodega / inventario |
| `auditoria_inventario` | `InventoryAuditDashboard` (lazy) | 2D-app | **duda** | Auditoría avanzada |
| `informes` | `InformesScreen` (lazy) | 2D-app | **sí** | Informes y reportes |
| `historial` / `bitacora` | `BitacoraEntryDetail` (wrappeado) | 2D-app | **sí** | Bitácora de la finca |
| `bitacora_detail` | `BitacoraEntryDetail` (lazy) | 2D-app | **sí** | Detalle de entrada |
| `biodiversidad` | `BiodiversidadView` (lazy) | 2D-app | **sí** | Vista de biodiversidad |
| `fermentos` | `FermentosView` (lazy) | 2D-app | **sí** | Fermentos y biopreparados |
| `voz` | `RegistroVozScreen` (lazy) | 2D-app | **sí** | Captura por voz |
| `voz_planta` | `PlantaPorVozScreen` (lazy) | 2D-app | **sí** | Registrar planta por voz |
| `procesos` | `ProcesosPorVozScreen` (lazy) | 2D-app | **sí** | Procesos por voz |
| `registro_voz` | `RegistroVozScreen` (lazy) | 2D-app | **sí** | Registro con voz |
| `registro_unificado` | `RegistroUnificadoScreen` (lazy) | 2D-app | **sí** | Registro unificado |
| `sembrar` | `SeedingLog` (lazy) | 2D-app | **sí** | Registrar siembra |
| `cosechar` | `HarvestLog` (lazy) | 2D-app | **sí** | Registrar cosecha |
| `mi_cosecha` | `MiCosechaScreen` (lazy) | 2D-app | **sí** | Panel de cosecha |
| `insumos` | `InputLog` (lazy) | 2D-app | **sí** | Registrar insumos |
| `biopreparados` | `BiopreparadosScreen` (lazy) | 2D-app | **sí** | Fichas de biopreparados |
| `plant_asset` | `AssetDetailView` | 2D-app | **sí** | Ficha de planta individual |
| `observacion` | `ObservationScreen` (lazy) | 2D-app | **sí** | Registrar observación |
| `reportar_invasora` | `InvasiveObservationLog` (lazy) | 2D-app | **sí** | Reportar especie invasora |
| `sanidad_sintoma` | `SanidadSintomaScreen` (lazy) | 2D-app | **sí** | Síntomas de sanidad |
| `mantenimiento` | `MaintenanceScreen` (lazy) | 2D-app | **sí** | Registrar mantenimiento |
| `task_log` / `new_task` / `edit_task` | `TaskScreen` (lazy) | 2D-app | **sí** | Tareas de la finca |
| `javier` | `WorkerDashboard` (lazy) | 2D-app | **duda** | Dashboard del trabajador |
| `usage_stats` | `UsageStatsDashboard` (lazy) | 2D-app | **no** | Dev tool: telemetría |
| `ciclo` | `CicloCultivoScreen` (lazy) | 2D-app | **sí** | Ciclo del cultivo |
| `germinacion` | `GerminacionScreen` (lazy) | 2D-app | **sí** | Germinación |
| `ciclo_nutrientes` | `CicloNutrientesScreen` (lazy) | 2D-app | **sí** | Ciclo de nutrientes |
| `calendario` / `calendario_finca` | `CalendarioFincaScreen` (lazy) | 2D-app | **sí** | Calendario de la finca |
| `ano_finca` | `AnoFincaScreen` (lazy) | 2D-app | **sí** | El año en la finca |
| `suelo` | `SoilDiagnosticScreen` (lazy) | 2D-app | **sí** | Diagnóstico de suelo |
| `salud_suelo` | `SaludSueloScreen` (lazy) | 2D-app | **sí** | Salud del suelo |
| `semilla` | `SemillaScreen` (lazy) | 2D-app | **sí** | Semillas |
| `poscosecha` | `PoscosechaScreen` (lazy) | 2D-app | **sí** | Poscosecha |
| `almacenamiento` | `AlmacenamientoScreen` (lazy) | 2D-app | **sí** | Almacenamiento |
| `platano` | `PlatanoBananoScreen` (lazy) | 2D-app | **sí** | Mundo plátano/banano |
| `nutricion` | `NutricionHumanaScreen` (lazy) | 2D-app | **sí** | Nutrición humana |
| `cacao` | `CacaoScreen` (lazy) | 2D-app | **sí** | Mundo cacao |
| `hortalizas` | `HortalizasScreen` (lazy) | 2D-app | **sí** | Mundo hortalizas |
| `tuberculos` | `TuberculosScreen` (lazy) | 2D-app | **sí** | Mundo tubérculos |
| `cromatografia` | `CromatografiaScreen` (lazy) | 2D-app | **sí** | Cromatografía de suelo |
| `agua` | `AguaScreen` (lazy) | 2D-app | **sí** | Módulo agua |
| `aromaticas` | `AromaticasScreen` (lazy) | 2D-app | **sí** | Mundo aromáticas |
| `almanaque` | `AlmanaqueScreen` (lazy) | 2D-app | **duda** | Almanaque lunar |
| `cafe` | `CafeScreen` (lazy) | 2D-app | **sí** | Mundo café |
| `uchuva` | `UchuvaScreen` (lazy) | 2D-app | **sí** | Mundo uchuva |
| `botica` | `BoticaScreen` (lazy) | 2D-app | **sí** | Botica campesina |
| `frutales` | `FrutalesScreen` (lazy) | 2D-app | **sí** | Frutales |
| `aguacate` | `AguacateScreen` (lazy) | 2D-app | **sí** | Mundo aguacate |
| `citricos` | `CitricosScreen` (lazy) | 2D-app | **sí** | Mundo cítricos |
| `cana` | `CanaScreen` (lazy) | 2D-app | **sí** | Mundo caña/panela |
| `mango` | `MangoScreen` (lazy) | 2D-app | **sí** | Mundo mango |
| `restauracion` | `RestauracionScreen` (lazy) | 2D-app | **sí** | Restauración ecológica |
| `fique` | `FiqueScreen` (lazy) | 2D-app | **sí** | Mundo fique |
| `milpa_cultivo` | `MilpaScreen` (lazy) | 2D-app | **sí** | Cultivo de milpa |
| `clima_boletin` | `ClimaBoletinScreen` (lazy) | 2D-app | **sí** | Boletín del clima |
| `animales` | `AnimalesScreen` (lazy) | 2D-app | **sí** | Módulo animales |
| `animales_gallinas` | `GallinasScreen` (lazy) | 2D-app | **sí** | Gallinas |
| `animales_abejas` | `AbejasScreen` (lazy) | 2D-app | **sí** | Abejas |
| `animales_vacas` | `VacasScreen` (lazy) | 2D-app | **sí** | Vacas |
| `animales_conejos` | `ConejosScreen` (lazy) | 2D-app | **sí** | Conejos |
| `animales_caprinos` | `CaprinosScreen` (lazy) | 2D-app | **sí** | Caprinos |
| `estiercol` | `EstiercolScreen` (lazy) | 2D-app | **sí** | Estiércol |
| `compost` | `CompostScreen` (lazy) | 2D-app | **sí** | Compost |
| `asociaciones` | `GuildSuggestions` (lazy) | 2D-app | **sí** | Asociaciones de cultivos |
| `mercados` | `MercadosScreen` (lazy) | 2D-app | **sí** | Red de mercados |

### 1.2 Rutas Mockup (68 — `mockup_*`)

Todas usan `React.lazy(() => import(...))`. Ninguna se toca del bundle inicial. Clasificadas abajo en §3.

---

## 2. Clasificación por Categoría

### 2D NÚCLEO

Componentes y pantallas 2D que son el corazón funcional de la app (no 3D, no mockup).

| Componente | Archivo | Estado | ¿Va? | Motivo |
|---|---|---|---|---|
| **LoginScreen** | `src/components/LoginScreen.jsx` | VIGENTE | sí | Auth farmOS (password grant) |
| **OAuthCallback** | `src/components/OAuthCallback.jsx` | VIGENTE | sí | Callback OAuth2 PKCE |
| **DashboardLive** | `src/components/dashboard/DashboardLive.jsx` | VIGENTE | sí | Home post-login |
| **AgentScreen** | `src/components/AgentScreen/AgentScreen.jsx` | VIGENTE | sí | Chat IA + tools |
| **AgentHero** | `src/components/dashboard/AgentHero.jsx` | VIGENTE | sí | Compositor del home ("pregúntele a la finca") |
| **AgentRedMenu** | `src/components/dashboard/AgentRedMenu.jsx` | VIGENTE | sí | Menú de herramientas IA |
| **ProfileScreen** | `src/components/ProfileScreen.jsx` | VIGENTE | sí | Perfil + avatar selector |
| **AvatarSelector** | `src/components/Settings/AvatarSelector.jsx` | VIGENTE | sí | Selector de avatar 3D |
| **OnboardingProfile** | `src/components/OnboardingProfile.jsx` | VIGENTE | sí | Onboarding primer uso |
| **OnboardingCondensado** | `src/components/OnboardingCondensado.jsx` | VIGENTE | duda | Variante condensada |
| **LocationDetectedScreen** | `src/components/LocationDetectedScreen.jsx` | VIGENTE | sí | GPS + altitud + piso térmico |
| **HoyEnFincaScreen** | `src/components/hoy/HoyEnFincaScreen.jsx` | VIGENTE | sí | Agenda del día |
| **MiFincaEvolucionScreen** | `src/components/hoy/MiFincaEvolucionScreen.jsx` | VIGENTE | sí | Evolución histórica |
| **DirectorioEspeciesScreen** | `src/components/DirectorioEspecies/DirectorioEspeciesScreen.jsx` | VIGENTE | sí | Catálogo de especies (581 sp) |
| **BiopreparadosScreen** | `src/components/biopreparados/BiopreparadosScreen.jsx` | VIGENTE | sí | Fichas biopreparados |
| **AguaScreen** | `src/components/agua/AguaScreen.jsx` | VIGENTE | sí | Módulo agua |
| **Suelo / SoilDiagnostic** | `src/components/SoilDiagnosticScreen.jsx` | VIGENTE | sí | Diagnóstico de suelo |
| **SaludSueloScreen** | `src/components/SaludSueloScreen.jsx` | VIGENTE | sí | Salud del suelo |
| **ClimaBoletinScreen** | `src/components/clima/ClimaBoletinScreen.jsx` | VIGENTE | sí | Boletín climático |
| **AlmanaqueScreen** | `src/components/almanaque/AlmanaqueScreen.jsx` | VIGENTE | duda | Almanaque lunar |
| **CicloCultivoScreen** | `src/components/CicloCultivoScreen.jsx` | VIGENTE | sí | Ciclo cultivo |
| **CalendarioFincaScreen** | `src/components/CalendarioFincaScreen.jsx` | VIGENTE | sí | Calendario anual |
| **RegistroVozScreen** | `src/components/RegistroVozScreen.jsx` | VIGENTE | sí | Captura por voz |
| **ExtensionistaScreen** | `src/components/ExtensionistaScreen.jsx` | VIGENTE | sí | Vista extensionista |
| **CaseStudyScreen** | `src/components/CaseStudyScreen.jsx` | VIGENTE | sí | Casos de estudio |
| **FaqScreen** | `src/components/FaqScreen.jsx` | VIGENTE | sí | FAQ + ayuda |
| **HelpManual** | `src/components/HelpManual.jsx` | VIGENTE | sí | Manual de uso |
| **AssetsDashboard** | `src/components/AssetsDashboard.jsx` | VIGENTE | sí | Gestión de activos |
| **InventoryPage** | `src/pages/InventoryPage.jsx` | VIGENTE | sí | Inventario / bodega |
| **TaskScreen** | `src/components/TaskScreen.jsx` | VIGENTE | sí | Tareas |
| **SeedingLog** | `src/components/SeedingLog.jsx` | VIGENTE | sí | Registro siembra |
| **HarvestLog** | `src/components/HarvestLog.jsx` | VIGENTE | sí | Registro cosecha |
| **InputLog** | `src/components/InputLog.jsx` | VIGENTE | sí | Registro insumos |
| **ObservationScreen** | `src/components/ObservationScreen.jsx` | VIGENTE | sí | Observaciones |
| **RegistroUnificadoScreen** | `src/components/RegistroUnificadoScreen.jsx` | VIGENTE | sí | Registro unificado |
| **AnoFincaScreen** | `src/components/anofinca/AnoFincaScreen.jsx` | VIGENTE | sí | Año en la finca |
| **MiCosechaScreen** | `src/components/cosecha/MiCosechaScreen.jsx` | VIGENTE | sí | Panel cosecha |
| **Crop screens (12)** | `src/components/{cafe, cacao, platano, etc}/` | VIGENTE | sí | Mundos de cultivo 2D |
| **Animal screens (5)** | `src/components/{Gallinas, Abejas, Vacas, etc}Screen.jsx` | VIGENTE | sí | Fichas de animales |
| **EstiercolScreen** | `src/components/EstiercolScreen.jsx` | VIGENTE | sí | Estiércol |
| **CompostScreen** | `src/components/CompostScreen.jsx` | VIGENTE | sí | Compost |
| **Mercado / Red humana** | `src/components/mercado/`, `src/components/red/` | VIGENTE | duda | Red campesina — ¿va en prod 3D-first? |
| **MiFincaVivaScreen** | `src/components/juego/MiFincaVivaScreen.jsx` | VIGENTE | duda | Juego — ¿secundario en prod? |
| **DefensoresFincaScreen** | `src/components/juego/DefensoresFincaScreen.jsx` | VIGENTE | duda | Juego |
| **DoomFincaScreen** | `src/components/juego/DoomFincaScreen.jsx` | VIGENTE | duda | Metal Slug campo |
| **MilpaSimulator** | `src/components/juego/MilpaSimulator.jsx` | VIGENTE | duda | Simulador |
| **GlaciarReporteScreen** | `src/components/GlaciarReporteScreen.jsx` | VIGENTE | sí | Módulo glaciar |
| **SemillaScreen** | `src/components/semilla/SemillaScreen.jsx` | VIGENTE | sí | Semillas |
| **PoscosechaScreen** | `src/components/PoscosechaScreen.jsx` | VIGENTE | sí | Poscosecha |
| **AlmacenamientoScreen** | `src/components/AlmacenamientoScreen.jsx` | VIGENTE | sí | Almacenamiento |
| **NutricionHumanaScreen** | `src/components/NutricionHumanaScreen.jsx` | VIGENTE | sí | Nutrición humana |
| **RestauracionScreen** | `src/components/restauracion/RestauracionScreen.jsx` | VIGENTE | sí | Restauración ecológica |
| **CromatografiaScreen** | `src/components/CromatografiaScreen.jsx` | VIGENTE | sí | Cromatografía |
| **Asociaciones** | `src/components/GuildSuggestions.jsx` | VIGENTE | sí | Guilds / policultivos |
| **PlantaPorVozScreen** | `src/components/PlantaPorVozScreen.jsx` | VIGENTE | sí | Planta por voz |
| **ProcesosPorVozScreen** | `src/components/ProcesosPorVozScreen.jsx` | VIGENTE | sí | Procesos por voz |
| **EspirituProScreen** | `src/components/EspirituProScreen.jsx` | VIGENTE | sí | Selector espíritu guardián |
| **UsageStatsDashboard** | `src/components/UsageStatsDashboard.jsx` | LEGACY | **no** | Dev tool telemetría |
| **Javier / WorkerDashboard** | `src/components/WorkerDashboard.jsx` | VIGENTE | duda | Dashboard trabajador — ¿rol específico? |

### 3D

Componentes 3D (escenas, mundos, criaturas, infraestructura).

| Componente | Archivo | Subtipo | ¿Va? | Motivo |
|---|---|---|---|---|
| **Valle3D** | `src/mockups/valle/Valle3D.jsx` | escena | **sí** | Vista PRINCIPAL de prod |
| **VistaGlobalSierra** | `src/visual/mundo3d/VistaGlobalSierra.jsx` | escena | **sí** | Sierra Nevada + galería por piso |
| **Mundo.jsx** (host) | `src/visual/mundo3d/Mundo.jsx` | framework | **sí** | Host 3D que monta cualquier mundo |
| **Mundo2D.jsx** | `src/visual/mundo3d/Mundo2D.jsx` | framework | **sí** | Fallback 2D para tier bajo |
| **EscenaBase3D** | `src/visual/mundo3d/escenas/EscenaBase3D.jsx` | framework | **sí** | Canvas wrapper compartido |
| **EscenaCutaway** | `src/visual/mundo3d/escenas/EscenaCutaway.jsx` | escena | **sí** | Suelo/compost/milpa |
| **EscenaFlujo** | `src/visual/mundo3d/escenas/EscenaFlujo.jsx` | escena | **sí** | Agua |
| **EscenaRecinto** | `src/visual/mundo3d/escenas/EscenaRecinto.jsx` | escena | **sí** | Animales/corral |
| **EscenaEstratos** | `src/visual/mundo3d/escenas/EscenaEstratos.jsx` | escena | **sí** | Diseño/pisos térmicos |
| **EscenaValle** | `src/visual/mundo3d/escenas/EscenaValle.jsx` | escena | **sí** | Valle navegable |
| **EscenaBoveda** | `src/visual/mundo3d/escenas/EscenaBoveda.jsx` | escena | **sí** | Clima/cielo |
| **EscenaCafe** | `src/visual/mundo3d/escenas/EscenaCafe.jsx` | escena | **sí** | Café |
| **EscenaMercado** | `src/visual/mundo3d/escenas/EscenaMercado.jsx` | escena | **sí** | Mercado |
| **EscenaSanidad** | `src/visual/mundo3d/escenas/EscenaSanidad.jsx` | escena | **sí** | Sanidad |
| **EscenaSemillero** | `src/visual/mundo3d/escenas/EscenaSemillero.jsx` | escena | **sí** | Semillero |
| **EscenaCalma3D** | `src/visual/mundo3d/escenas/EscenaCalma3D.jsx` | escena | **sí** | Empty state paz |
| **CorralVivo** | `src/visual/mundo3d/escenas/CorralVivo.jsx` | escena | **sí** | Animales vivos InstancedMesh |
| **FaunaEscena** | `src/visual/mundo3d/escenas/FaunaEscena.jsx` | escena | **sí** | Criaturas SVG en 3D |
| **CamaraDirector** | `src/visual/mundo3d/escenas/CamaraDirector.jsx` | framework | **sí** | Cámara cinematográfica |
| **BloomSutil** | `src/visual/mundo3d/escenas/BloomSutil.jsx` | efecto | **sí** | Post-proceso tier alto |
| **AnimalMomento** | `src/visual/mundo3d/escenas/AnimalMomento.jsx` | escena | **sí** | Nacimiento/venta/partida |
| **MomentosFinca** | `src/visual/mundo3d/MomentosFinca.jsx` | escena | **sí** | Momentos cinemáticos |
| **MicrofaunaSuelo** | `src/visual/mundo3d/MicrofaunaSuelo.jsx` | escena | **sí** | Microfauna tocable |
| **CapaVivaMundo** | `src/visual/mundo3d/CapaVivaMundo.jsx` | capa | **sí** | Polen/luciérnagas/nieve |
| **CielosHora** | `src/visual/mundo3d/CielosHora.jsx` | capa | **sí** | Cielo por hora real |
| **PisosTermicosBandas** | `src/visual/mundo3d/PisosTermicosBandas.jsx` | capa | **sí** | Bandas de altitud |
| **GemeloValle2D** | `src/visual/mundo3d/GemeloValle2D.jsx` | capa | **sí** | Gemelo 2D del valle |
| **HotspotFeedback** | `src/visual/mundo3d/HotspotFeedback.jsx` | capa | **sí** | Hotspots navegables |
| **TransicionMundoKit** | `src/visual/mundo3d/TransicionMundoKit.jsx` | framework | **sí** | Transiciones entre mundos |
| **TransicionSierraMundo** | `src/visual/mundo3d/TransicionSierraMundo.jsx` | framework | **sí** | Transición Sierra→mundo |
| **TunelOdyssey** | `src/visual/mundo3d/TunelOdyssey.jsx` | framework | **sí** | Túnel Mario Odyssey |
| **SombraContacto** | `src/visual/mundo3d/escenas/SombraContacto.jsx` | capa | **sí** | Sombra falsa AO |
| **infraestructura/** | `src/visual/mundo3d/infraestructura/` | framework | **sí** | Piezas 3D de infraestructura |
| **laminas2d/** | `src/visual/mundo3d/laminas2d/` | capa | **sí** | Láminas 2D en mundo 3D |
| **OnboardingDescubrir** | `src/visual/mundo3d/OnboardingDescubrir.jsx` | capa | **sí** | Onboarding al valle |

#### Criaturas SVG (rubber-hose)

| Criatura | Archivo | ¿Va? |
|---|---|---|
| Abeja Angelita | `src/visual/creatures/AbejaAngelita.jsx` | **sí** — avatar principal |
| Colibrí | `src/visual/creatures/Colibri.jsx` | **sí** |
| Oso Andino | `src/visual/creatures/OsoAndino.jsx` | **sí** |
| Rana Andina | `src/visual/creatures/RanaAndina.jsx` | **sí** |
| Perezoso | `src/visual/creatures/Perezoso.jsx` | **sí** |
| Ardilla | `src/visual/creatures/Ardilla.jsx` | **sí** |
| Jaguar | `src/visual/creatures/Jaguar.jsx` | **sí** |
| Morrocoy | `src/visual/creatures/Morrocoy.jsx` | **sí** |
| Borugo | `src/visual/creatures/Borugo.jsx` | **sí** |
| Lombriz | `src/visual/creatures/Lombriz.jsx` | **sí** |
| Mariposa | `src/visual/creatures/Mariposa.jsx` | **sí** |
| Escarabajo | `src/visual/creatures/Escarabajo.jsx` | **sí** |
| Ent del Páramo (Frailejón) | `src/visual/creatures/EntFrailejon.jsx` | **sí** — flora, no fauna |
| Espíritu Guardián | `src/visual/creatures/EspirituGuardian.jsx` | **sí** |
| Fauna Rubberhose (kit) | `src/visual/creatures/FaunaRubberhose.jsx` | **sí** |

#### 15 Mundos 3D (mundoData.js)

| ID | Nombre | Piso Térmico | Escena | ¿Va? |
|---|---|---|---|---|
| `suelo` | El Suelo Vivo | templado | cutaway | **sí** |
| `agua` | El Agua | páramo | flujo | **sí** |
| `animales` | Los Animales | cálido | recinto | **sí** |
| `disenio` | Diseño de la Finca | templado | estratos | **sí** |
| `valle` | El Valle | cálido | valle | **sí** — vista principal |
| `abono` | Estiércol y Compost | templado | cutaway | **sí** |
| `cultivos` | Cultivos | cálido | lamina | **sí** |
| `cafe` | El Café | templado | cafe | **sí** |
| `frutales` | Frutales | cálido | ficha | **sí** |
| `mercado` | Mercado y Despensa | cálido | mercado | **sí** |
| `sanidad` | Sanidad de la Mata | templado | sanidad | **sí** |
| `clima` | El Clima | páramo | boveda | **sí** |
| `milpa` | La Milpa | cálido | cutaway | **sí** |
| `pisos` | Pisos Térmicos | frío | estratos | **sí** |
| `semillero` | Semillero y Vivero | templado | semillero | **sí** |

#### 9 Animales del valle

| Animal | Archivo | ¿Va? |
|---|---|---|
| Vaca | `src/mockups/valle/animales.jsx` (AnimalesValle) | **sí** |
| Oveja | idem | **sí** |
| Gallina | idem | **sí** |
| Cerdo | idem | **sí** |
| SiluetaGallina | `src/visual/mundo3d/infraestructura/piezasInfra.jsx` | **sí** |
| SiluetaRes | idem | **sí** |
| + fauna SVG criaturas (13) | `src/visual/creatures/` | **sí** |

---

### 3. Mockups (Showcases — 68 rutas)

Clasificación: PROMOVER (integrar a navegación real) vs EXCLUIR (solo vitrina/gallery, no a prod).

#### Mockups a PROMOVER (ya casi listos para producción)

| Mockup | Ruta | Archivo | Motivo |
|---|---|---|---|
| **EntradaValle3D** | `mockup_entrada_3d` | `src/mockups/EntradaValle3D.jsx` | El valle 3D — la vista principal de prod |
| **VentanaValle3D** | `mockup_ventana_valle` | `src/components/VentanaValle3D.jsx` | Ventana emergente del valle |
| **VitrinaMaestraMundos** | `mockup_vitrina_maestra` | `src/mockups/VitrinaMaestraMundos.jsx` | Puerta maestra a 12 mundos 3D |
| **MontanaMundosCampesino** | `mockup_montana_mundos_campesino` | `src/mockups/MontanaMundosCampesino.jsx` | Navegación por piso térmico (elegida por auditoría) |
| **VistaGlobalSierra** | `mockup_sierra_global` | `src/visual/mundo3d/VistaGlobalSierra.jsx` | Sierra Nevada + galería |
| **CamaraDirectorDemo** | `mockup_camara_director` | `src/mockups/CamaraDirectorDemo.jsx` | Cámara director para el valle |
| **ArtesaniaAndinaDemo** | `mockup_artesania_andina` | `src/mockups/ArtesaniaAndinaDemo.jsx` | Lenguaje de forma 3D |
| **Mercado** | `mockup_mercado` | `src/mockups/Mercado.jsx` | Mercado campesino con rostros y altitud |
| **MetalSlugCampo** | `mockup_metal_slug_campo` | `src/mockups/MetalSlugCampo.jsx` | Juego didáctico nivel 1 |
| **JuegoLaMilpa** | `mockup_juego_la_milpa` | `src/mockups/JuegoLaMilpa.jsx` | Mini-juego las tres hermanas |
| **ConversacionVoz** | `mockup_conversacion_voz` | `src/mockups/ConversacionVoz.jsx` | UI de voz con IrisVoz |
| **VozConForma** | `mockup_voz_con_forma` | `src/mockups/VozConForma.jsx` | Visualización de voz |
| **EnsenaDibujando** | `mockup_ensena_dibujando` | `src/mockups/EnsenaDibujando.jsx` | Agente dibuja láminas |
| **EvidenciaIlustrada** | `mockup_evidencia_ilustrada` | `src/mockups/EvidenciaIlustrada.jsx` | Evidencia con lámina |
| **DiagnosticoSobreFoto** | `mockup_diagnostico_foto` | `src/mockups/DiagnosticoSobreFoto.jsx` | Diagnóstico sobre foto |
| **EfectosFuncionalesDemo** | `mockup_efectos_funcionales` | `src/mockups/EfectosFuncionalesDemo.jsx` | Efectos vivos de infraestructura |
| **CatalogoInfraDemo** | `mockup_catalogo_infra` | `src/mockups/CatalogoInfraDemo.jsx` | Catálogo 3D de infraestructura |
| **ColocarInfraestructura** | `mockup_colocar_infraestructura` | `src/mockups/ColocarInfraestructura.jsx` | Colocar infra en terreno |
| **Infraestructura3D** | `mockup_infraestructura_3d` | `src/mockups/Infraestructura3D.jsx` | Vitrina de infraestructura |
| **VitrinaInfraestructura** | `mockup_vitrina_infra` | `src/mockups/vitrina3d/VitrinaInfraestructura.jsx` | Galería de infra |
| **VitrinaMundos** | `mockup_vitrina_mundos` | `src/mockups/vitrina3d/VitrinaMundos.jsx` | Galería de mundos |
| **VitrinaCriaturas** | `mockup_vitrina_3d` | `src/mockups/vitrina3d/VitrinaCriaturas.jsx` | Galería de criaturas |
| **MundoAbejas3D** | `mockup_mundo_abejas_3d` | `src/mockups/MundoAbejas3D.jsx` | Diorama abejas |
| **MundoGallinero3D** | `mockup_mundo_gallinero_3d` | `src/mockups/MundoGallinero3D.jsx` | Diorama gallinero |
| **MundoMercado3D** | `mockup_mundo_mercado_3d` | `src/mockups/MundoMercado3D.jsx` | Diorama mercado |
| **MundoParamo3D** | `mockup_mundo_paramo_3d` | `src/mockups/MundoParamo3D.jsx` | Diorama páramo |
| **MundoAgua3D** | `mockup_mundo_agua_3d` | `src/mockups/MundoAgua3D.jsx` | Diorama agua |
| **MundoCafe3D** | `mockup_mundo_cafe_3d` | `src/mockups/MundoCafe3D.jsx` | Diorama café |
| **MundoCompost3D** | `mockup_mundo_compost_3d` | `src/mockups/MundoCompost3D.jsx` | Diorama compost |
| **MundoFermentos3D** | `mockup_mundo_fermentos_3d` | `src/mockups/MundoFermentos3D.jsx` | Diorama fermentos |
| **MundoSemillero3D** | `mockup_mundo_semillero_3d` | `src/mockups/MundoSemillero3D.jsx` | Diorama semillero |
| **MundoSueloVivo3D** | `mockup_mundo_suelo_vivo_3d` | `src/mockups/MundoSueloVivo3D.jsx` | Diorama suelo |
| **MundoMicrofauna3D** | `mockup_mundo_microfauna_3d` | `src/mockups/MundoMicrofauna3D.jsx` | Diorama microfauna |
| **GemelosMundos2D** | `mockup_gemelos_2d` | `src/mockups/GemelosMundos2D.jsx` | Gemelos 2D de mundos |
| **AliadosFinca3D** | `mockup_aliados_finca_3d` | `src/mockups/AliadosFinca3D.jsx` | Aliados funcionales |
| **MomentoVentaMercado3D** | `mockup_momento_venta_mercado_3d` | `src/mockups/MomentoVentaMercado3D.jsx` | Momentos del hato |
| **ValleLluvia3D** | `mockup_valle_lluvia_3d` | `src/mockups/ValleLluvia3D.jsx` | Valle bajo lluvia |
| **ValleNoche3D** | `mockup_valle_noche_3d` | `src/mockups/ValleNoche3D.jsx` | Valle de noche |
| **NewDonk2Den3D** | `mockup_new_donk` | `src/mockups/NewDonk2Den3D.jsx` | Mural 2D en 3D |
| **MuralesNewDonk** | `mockup_murales_new_donk` | `src/mockups/MuralesNewDonk.jsx` | Murales por mundo |

#### Mockups a PROMOVER como screens de cultivo 3D (los 12 "Mundo3D*")

Estos 12 mockups son encapsulados autocontenidos que montan `<Mundo mundoId="X">`. En prod, la navegación directa a un mundo 3D puede usar el componente `MundoScreen` con el mundoId en vez de rutas mockup separadas.

| Mockup | MundoId | Archivo |
|---|---|---|
| `mockup_mundo3d_agua` | `agua` | `src/mockups/Mundo3DAgua.jsx` |
| `mockup_mundo3d_suelo` | `suelo` | `src/mockups/Mundo3DSuelo.jsx` |
| `mockup_mundo3d_animales` | `animales` | `src/mockups/Mundo3DAnimales.jsx` |
| `mockup_mundo3d_milpa` | `milpa` | `src/mockups/Mundo3DMilpa.jsx` |
| `mockup_mundo3d_bosque` | `pisos` | `src/mockups/Mundo3DBosque.jsx` |
| `mockup_mundo3d_clima` | `clima` | `src/mockups/Mundo3DClima.jsx` |
| `mockup_mundo3d_sanidad` | `sanidad` | `src/mockups/Mundo3DSanidad.jsx` |
| `mockup_mundo3d_mercado` | `mercado` | `src/mockups/Mundo3DMercado.jsx` |
| `mockup_mundo3d_cafe` | `cafe` | `src/mockups/Mundo3DCafe.jsx` |
| `mockup_mundo3d_semillero` | `semillero` | `src/mockups/Mundo3DSemillero.jsx` |
| `mockup_juego_mi_finca` | (juego) | `src/mockups/JuegoMiFincaOdyssey.jsx` |

#### Mockups a EXCLUIR de prod (legacy / duplicados / experimentos)

| Mockup | Ruta | Motivo de exclusión |
|---|---|---|
| **VisualLib** | `mockup_visual_lib` | Storybook interno de dev — cero valor para usuario final |
| **MontanaMundos** (pass 1) | `mockup_montana_mundos` | Versión vieja, reemplazada por Campesino |
| **MontanaMundosCine** (pass 3) | `mockup_montana_mundos_cine` | Versión intermedia, reemplazada por Campesino |
| **EntradaCampesina** | `mockup_entrada_campesina` | Duplicado de EntradaValle3D (misma función, distinto estilo) |
| **HomeCampesino** | `mockup_home_campesino` | Home viejo, reemplazado por DashboardLive + AgentHero |
| **BotonAnarquia** | `mockup_boton_anarquia` | Prototipo de FAB Ⓐ — ya integrado como AgentFab real |
| **AvatarGameBiopunk** | `mockup_avatar_biopunk` | Experimento de juego de avatar, ya hay Espíritu Guardián real |
| **AvatarGameVerdeVivo** | `mockup_avatar_verde_vivo` | Variante verde-vivo, duplicado |
| **AvatarGameLibre** | `mockup_avatar_libre` | Variante libre, duplicado |
| **MapaAcuarela** | `mockup_mapa_acuarela` | Prototipo de mapa, reemplazado por MapPicker real |
| **ClimaAtmosfera** | `mockup_clima_atmosfera` | Prototipo clima, reemplazado por ClimaBoletinScreen + EscenaBoveda |
| **DiaEnFinca** | `mockup_dia_en_finca` | Prototipo "día en la finca", reemplazado por HoyEnFincaScreen |
| **SaludFinca** | `mockup_salud_finca` | Prototipo salud finca, ya integrado en DashboardLive |
| **PrimerCultivo** | `mockup_primer_cultivo` | Onboarding viejo, reemplazado por OnboardingSiembra |
| **OnboardingSiembra** | `mockup_onboarding_siembra` | Onboarding legacy — ¿mejor que el actual? Decisión de diseño |
| **MockupGuardianesNarrativos** | `mockup_guardianes` | Prototipo guardianes, ya integrado en Espíritu Guardián |
| **HojaVidaMataMockup** | `mockup_hoja_vida_mata` | Prototipo hoja de vida, integrado en AssetDetailView |

---

### 4. LEGACY — Candidatos a Excluir de prod

Componentes y temas viejos que contaminarían un home 3D limpio.

| Elemento | Archivo(s) | Por qué excluir |
|---|---|---|
| **BiopunkBackground** | `src/components/dashboard/BiopunkBackground.jsx` | Fondo animado canvas del tema biopunk. Para prod 3D-first, el fondo es el valle 3D, no un canvas de circuitos. |
| **FincaVivaHero** (tema viejo) | `src/components/dashboard/FincaVivaHero.jsx` | Hero antiguo del home pre-3D. Reemplazado por valle 3D como vista principal. |
| **SceneFincaOrganismo** | `src/components/dashboard/SceneFincaOrganismo.jsx` | Tema "finca como organismo" bioluminiscente. Reemplazado por valle 3D. |
| **SceneFincaNature** | `src/components/dashboard/SceneFincaNature.jsx` | Tema nature/verde. Reemplazado por valle 3D. |
| **SceneHuertoVivo** | `src/components/dashboard/SceneHuertoVivo.jsx` | Tema huerto. Reemplazado. |
| **SceneTrazoMinimal** | `src/components/dashboard/SceneTrazoMinimal.jsx` | Tema minimalista. Reemplazado. |
| **PanelVitalidadEspiritu** | `src/components/dashboard/PanelVitalidadEspiritu.jsx` | Panel de vitalidad del tema biopunk viejo. |
| **RelojFrailejon** | `src/components/dashboard/RelojFrailejon.jsx` | Reloj frailejón del tema viejo. |
| **ArbolDeMundos** | `src/components/dashboard/ArbolDeMundos.jsx` | Árbol de navegación viejo. Reemplazado por MontanaMundosCampesino. |
| **ManoChagraGlyph** | `src/components/dashboard/ManoChagraGlyph.jsx` | Glifo de mano del tema viejo. |
| **VisualLib** (librería visual) | `src/mockups/VisualLib.jsx` | Storybook interno, NO es para usuario final. |
| **Tema biopunk CSS legacy** | `src/styles/themes.css`, `src/styles/temas-fase2.css` | Estilos base del tema biopunk. En prod 3D-first, los estilos deben ser mínimos (el valle 3D es el fondo). |
| **EntradaCampesina** | `src/mockups/EntradaCampesina.jsx` | Entrada duplicada — EntradaValle3D es la definitiva. |
| **HomeCampesino** | `src/mockups/HomeCampesino.jsx` | Home duplicado — DashboardLive es el home real. |
| **Temas viejos de avatar** | `src/mockups/AvatarGame{Biopunk,VerdeVivo,Libre}.*` | 3 variantes de juego de avatar, solo 1 necesaria. |

---

## 5. Login / Auth / Backend

### 5.1 Flujo de autenticación

**Archivos clave:**
- `src/services/authService.js` — lógica OAuth2 (password grant + PKCE)
- `src/services/apiService.js` — fetch autenticado contra farmOS
- `src/components/LoginScreen.jsx` — formulario login
- `src/components/OAuthCallback.jsx` — callback OAuth2

**Mecanismo activo (producción):** OAuth2 Password Grant contra farmOS.
```
POST {FARMOS_URL}/oauth/token
  grant_type=password
  client_id=<from env>
  username=<user>
  password=<pass>
  scope=farm_manager
```

**Mecanismo planeado (no activo aún):** OAuth2 Authorization Code + PKCE.
- `initiateAuthorizationCodeFlow()` → redirect a farmOS
- `exchangeCodeForToken()` → callback
- Fecha de migración: 2026-09-25

**Tokens:** Almacenados en localforage (IndexedDB):
- `farmos_access_token` (JWT)
- `farmos_refresh_token`
- `farmos_token_expiry`

**Renovación silenciosa:** `refreshAccessToken()` — POST `grant_type=refresh_token`. Deduplicado con `refreshInFlight` promise.

**Logout:** Borra los 3 tokens de localforage + limpia tenant scope.

### 5.2 Backends

| Servicio | URL | Proxy |
|---|---|---|
| **farmOS** | `VITE_FARMOS_URL` (default: same-origin) | Nginx reverse proxy |
| **Ollama** | `/api/ollama/...` (relativo) | Nginx → `localhost:11434` |
| **Sidecar MCP** | `/api/mcp/agro` (relativo) | Nginx → `:7880` |

**Endpoints Ollama usados (todos relativos, proxied):**

| Servicio | Endpoint |
|---|---|
| Generación texto | `/api/ollama/api/generate` |
| Chat (OpenAI-compat) | `/api/ollama/v1/chat/completions` |
| Chat (formato Ollama) | `/api/ollama/api/chat` |
| Embeddings | `/api/ollama/api/embeddings` |
| GPU telemetry | `/api/ollama/api/ps`, `/api/ollama/api/tags` |

### 5.3 Offline-first

El Service Worker (`public/sw.js`) precachea 31 chunks de entrada (index.html, vendor-react, syncManager, dbCore, etc.) y cachea el resto `/assets/*` con cache-first cache-on-use. Catálogo SQLite precacheado. RAG embeddings y cycle-content con cache-on-use (no precache).

---

## Resumen para prod.chagra.app

### Lo que VA sí o sí

1. **Valle 3D** como vista principal (`EntradaValle3D` → `valle3d`)
2. **Sierra Nevada + galería** como vista global (`VistaGlobalSierra`)
3. **15 mundos 3D** navegables desde el valle
4. **Criaturas SVG** (13 animales + Ent) como avatares y fauna del valle
5. **DashboardLive** como home 2D post-login con AgentHero
6. **AgentScreen** para chat IA
7. **Todas las pantallas 2D núcleo** (directorio especies, registro, inventario, perfil...)
8. **Auth farmOS** (mismo flujo)

### Lo que NO va (o va como secundario oculto)

1. **Temas viejos:** BiopunkBackground, SceneFinca*, PanelVitalidad, ArbolDeMundos, RelojFrailejon
2. **Mockups legacy duplicados:** EntradaCampesina, HomeCampesino, MontanaMundos v1/v3, AvatarGame*
3. **Dev tools:** VisualLib, UsageStatsDashboard
4. **CSS biopunk viejo:** temas-fase2.css, themes.css (reducir a solo los tokens necesarios)

### Decisiones de diseño pendientes

1. ¿El onboarding es OnboardingProfile o OnboardingSiembra (mockup)?
2. ¿La navegación de mundos es MontanaMundosCampesino o VitrinaMaestraMundos?
3. ¿Los juegos (Milpa, Defensores, Metal Slug) van en prod o en una sección separada?
4. ¿Mercado / Red humana van en prod 3D-first o se dejan para v2?
5. ¿CSS base se reconstruye desde cero para 3D-first o se hereda del tema biopunk?
