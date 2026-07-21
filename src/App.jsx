/*
 * i18n (ADR-050): App.jsx contiene etiquetas de navegación en español Colombia
 * (Plantas, Mapa, Insumos, Perfil, títulos de módulos…) pendientes de migrar a
 * src/config/messages.js. La regla chagra-i18n es soft (warn); se desactiva a
 * nivel de archivo para no bloquear el pre-commit con deuda preexistente. Los
 * errores reales de ESLint siguen activos.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import React, { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Eye, Package, CheckCircle, WifiOff, Mic, Network, Beaker, Scale } from 'lucide-react';
import localforage from 'localforage';
import { useTheme } from './hooks/useTheme';
import { useClimaAtmosphere } from './hooks/useClimaAtmosphere';
import useIdleDetection from './hooks/useIdleDetection';
import useGlobalKeyboardShortcuts from './hooks/useGlobalKeyboardShortcuts';
import BiopunkBackground from './components/dashboard/BiopunkBackground';

import { isAuthenticated, logoutUser } from './services/authService';
import useAssetStore from './store/useAssetStore';
import { fetchFromFarmOS } from './services/apiService';
import { PRIMARY_WORKER_NAME } from './config/workerConfig';
import { tieneAccesoGlaciarActual, esOperadorActual } from './config/glaciarAccess';
import { getProfile } from './services/userProfileService';
import { parseSeguimientoView } from './config/seguimientoProcesos';
import NetworkStatusBar from './components/NetworkStatusBar';
import PendingTasksWidget from './components/PendingTasksWidget';
import SyncProgressIndicator from './components/common/SyncProgressIndicator';
import useOllamaWarmStore from './store/useOllamaWarmStore';
import { prewarmCorpus } from './services/ragRetriever';
import { syncAgentTelemetry } from './services/agentTelemetrySync';
import { syncUsageTelemetry } from './services/usageTelemetrySync';
import { recordScreenView } from './services/usageTelemetryService';
import useThemeBackgroundStore, { getBackgroundSrc } from './store/useThemeBackgroundStore';
import useAlertStore from './store/useAlertStore';
import { alertEngine } from './services/alertEngine';
// PERF-1 (medido 2026-07): `cropAlertEngine.js` → `farmProcessCache.js` →
// `catalogDB.js` (~217KB + WASM sqlite). Un import ESTÁTICO aquí lo metía en
// el grafo crítico de arranque (App.jsx es el entry-point) aunque
// cropAlertEngine.start() solo corre en background. Import dinámico en el
// call site, ver useEffect de "motor de alertas" más abajo.
// FieldFeedback ya no se monta globalmente en App; vive embebido en
// HelpUsoScreen como sección de Ayuda (decisión 2026-05-21, ver
// comentario abajo donde se removió el render).
// import FieldFeedback from './components/FieldFeedback';
import AgentFab from './components/AgentFab';
// EscuchaFab (el FAB de tap "barbudito de páramo") DESHABILITADO por decisión
// del operador 2026-07-07: modo campo = WAKE-WORD SOLO ("hola chagra"). El
// único FAB visible es el colibrí (AgentFab). El overlay SÍ se importa: lo abre
// el wake-word vía activarEscucha() (useModoCampo/onWake). Para re-habilitar el
// tap, descomentar el import y el render de <EscuchaFab /> más abajo.
// import EscuchaFab from './components/escucha/EscuchaFab';
import EscuchaOverlay from './components/escucha/EscuchaOverlay';
import AgentOfflineGuard from './components/AgentScreen/AgentOfflineGuard';
// Transición home→conversación: el colibrí en video (~2s). Eager (debe
// aparecer al instante al enviar desde el hero).
import ColibriTransition from './components/agent/ColibriTransition';
import { ScreenShell } from './components/common/ScreenShell';
import ChagraGrowLoader from './components/ChagraGrowLoader';
import Confetti from './components/common/Confetti';
import IosInstallBanner from './components/IosInstallBanner';
import AndroidInstallBanner from './components/AndroidInstallBanner';
import UpdateAvailableBanner from './components/UpdateAvailableBanner';
import GpsFincaBanner from './components/GpsFincaBanner';
import DataLossBanner from './components/DataLossBanner';
import DemoModeBanner from './components/DemoModeBanner';
import CriticalAlertBanner from './components/CriticalAlertBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorFallback } from './components/common/ErrorFallback';

// Lazy-loaded route components
const LoginScreen = lazy(() => import('./components/LoginScreen'));
const OAuthCallback = lazy(() => import('./components/OAuthCallback'));
// Vitrina pública de la librería visual reutilizable (`src/visual/`). Ruta
// #/mockups/visual-lib, resuelta ANTES del check de sesión (no requiere auth).
const VisualLib = lazy(() => import('./mockups/VisualLib'));
// ── Galería de mockups aspiracionales (diseño) ──────────────────────────────
// Rutas públicas `#/mockups/<slug>`: vitrinas de discovery sin gate ni sesión
// (datos de muestra, no tocan datos reales). Todas resuelven vía
// MOCKUP_HASH_ROUTES ANTES del check de auth. Chunks perezosos.
// 3D: "El valle de mi finca" (R3F/WebGL2, degrada a SVG sin WebGL).
const EntradaValle3DMockup = lazy(() => import('./mockups/EntradaValle3D'));
// 3D: "El mundo del agua" — monta <Mundo mundoId="agua"> del framework
// (src/visual/mundo3d) con device-tiering real. El 3D va perezoso (vendor-three).
const Mundo3DAguaMockup = lazy(() => import('./mockups/Mundo3DAgua'));
const Mundo3DSueloMockup = lazy(() => import('./mockups/Mundo3DSuelo'));
// 3D: "El mundo de los animales" — monta <Mundo mundoId="animales"> del framework
// (recinto: el corral y su ciclo cerrado del abono). 3D perezoso (vendor-three).
const Mundo3DAnimalesMockup = lazy(() => import('./mockups/Mundo3DAnimales'));
const Mundo3DMilpaMockup = lazy(() => import('./mockups/Mundo3DMilpa'));
const Mundo3DBosqueMockup = lazy(() => import('./mockups/Mundo3DBosque'));
// 3D: "El mundo del clima" — monta <Mundo mundoId="clima"> del framework: la
// bóveda del cielo (arquetipo nuevo `boveda`). El 3D va perezoso (vendor-three).
const Mundo3DClimaMockup = lazy(() => import('./mockups/Mundo3DClima'));
// 3D: "El mundo de la sanidad" — monta <Mundo mundoId="sanidad"> del framework:
// la huerta-clínica (arquetipo nuevo `sanidad`, familia recinto): trampas,
// biocontrol y enemigos naturales. El 3D va perezoso (vendor-three).
const Mundo3DSanidadMockup = lazy(() => import('./mockups/Mundo3DSanidad'));
// 3D: "El mundo del mercado" — monta <Mundo mundoId="mercado"> del framework:
// el mercado campesino (arquetipo nuevo `mercado`, familia flujo): la ruta corta
// campo→mesa, puestos, canastos, procedencia y precio justo. El 3D va perezoso
// (vendor-three).
const Mundo3DMercadoMockup = lazy(() => import('./mockups/Mundo3DMercado'));
// 3D: "El mundo del café" — monta <Mundo mundoId="cafe"> del framework: el
// cafetal bajo sombra (arquetipo nuevo `cafe`, familia recinto): café de sombra
// (guamo/nogal), el grano cereza→pergamino→oro (sin tostar en finca), roya/broca
// con manejo agroecológico y el beneficio. El 3D va perezoso (vendor-three).
const Mundo3DCafeMockup = lazy(() => import('./mockups/Mundo3DCafe'));
// 3D: "El mundo del semillero" — monta <Mundo mundoId="semillero"> del
// framework: el semillero/vivero (arquetipo nuevo `semillero`, familia recinto):
// germinación en bandeja, repique a bolsa, endurecimiento, semilla propia vs
// comprada y el túnel de media-sombra. El 3D va perezoso (vendor-three).
const Mundo3DSemilleroMockup = lazy(() => import('./mockups/Mundo3DSemillero'));
// 3D: "La infraestructura de su finca" — vitrina de la LIBRERÍA de construcciones
// (src/visual/mundo3d/infraestructura): invernaderos, galpón, establo, bodega,
// compostera, tanque, secadero, media-sombra. Grilla data-driven con device-tier
// real; el 3D va perezoso (vendor-three), 2D digno en equipo humilde.
const Infraestructura3DMockup = lazy(() => import('./mockups/Infraestructura3D'));
// Modo COLOCAR: el usuario elige una construcción del catálogo y la ubica en el
// terreno (snapping a la ladera, girar en pasos, confirmar); persiste local.
const ColocarInfraestructuraMockup = lazy(() => import('./mockups/ColocarInfraestructura'));
// Voz: superficies de voz con forma viva (iris que reacciona al volumen).
const VozConFormaMockup = lazy(() => import('./mockups/VozConForma'));
const ConversacionVozMockup = lazy(() => import('./mockups/ConversacionVoz'));
const EnsenaDibujandoMockup = lazy(() => import('./mockups/EnsenaDibujando'));
// Superficies definitivas y flujos ilustrados.
const DiaEnFincaMockup = lazy(() => import('./mockups/DiaEnFinca'));
const SaludFincaMockup = lazy(() => import('./mockups/SaludFinca'));
const PrimerCultivoMockup = lazy(() => import('./mockups/PrimerCultivo'));
const MercadoMockup = lazy(() => import('./mockups/Mercado'));
const OnboardingSiembraMockup = lazy(() => import('./mockups/OnboardingSiembra'));
// Navegación como paisaje (montaña de los mundos) + variantes.
const MontanaMundosMockup = lazy(() => import('./mockups/MontanaMundos'));
const MontanaMundosCineMockup = lazy(() => import('./mockups/MontanaMundosCine'));
const MontanaMundosCampesinoMockup = lazy(() => import('./mockups/MontanaMundosCampesino'));
// Entrada campesina definitiva + home + avatares del espíritu de la finca.
const EntradaCampesinaMockup = lazy(() => import('./mockups/EntradaCampesina'));
const HomeCampesinoMockup = lazy(() => import('./mockups/HomeCampesino'));
const BotonAnarquiaMockup = lazy(() => import('./mockups/BotonAnarquia'));
const AvatarGameBiopunk = lazy(() => import('./mockups/AvatarGameBiopunk'));
const AvatarGameVerdeVivo = lazy(() => import('./mockups/AvatarGameVerdeVivo'));
const AvatarGameLibre = lazy(() => import('./mockups/AvatarGameLibre'));
// Piezas de decisión visual (acuarela, clima, diagnóstico, evidencia, guardianes).
const MapaAcuarelaMockup = lazy(() => import('./mockups/MapaAcuarela'));
const ClimaAtmosferaMockup = lazy(() => import('./mockups/ClimaAtmosfera'));
const DiagnosticoSobreFoto = lazy(() => import('./mockups/DiagnosticoSobreFoto'));
const EvidenciaIlustrada = lazy(() => import('./mockups/EvidenciaIlustrada'));
const MockupGuardianesNarrativos = lazy(() => import('./mockups/MockupGuardianesNarrativos'));
const HojaVidaMataMockup = lazy(() => import('./components/mockups/HojaVidaMataMockup'));
const VitrinaCriaturasMockup = lazy(() => import('./mockups/vitrina3d/VitrinaCriaturas'));
// 3D: vitrina JUGABLE de las piezas de construcción (invernaderos, galpón,
// establo, bodega, tanque, secadero…) con control de tamaño por pieza y el
// mini demo del modo colocar (snapping sobre la ladera).
const VitrinaInfraestructuraMockup = lazy(() => import('./mockups/vitrina3d/VitrinaInfraestructura'));
// 3D: vitrina/galería de los MUNDOS del valle (valle, café, sanidad, mercado,
// animales, semillero, clima). Cada tarjeta previsualiza el mundo en su diorama
// con su encuadre de cámara curado (camaraDioramas) + botón «Entrar» al host real.
const VitrinaMundosMockup = lazy(() => import('./mockups/vitrina3d/VitrinaMundos'));
const SierraGlobalMockup = lazy(() => import('./visual/mundo3d/VistaGlobalSierra'));
// El camino del agua en la finca: nacimiento → canal → reservorio → riego →
// suelo, con el ciclo (vapor/nube/lluvia) cerrándose. Didáctico, hora dorada.
const MundoAguaMockup = lazy(() => import('./mockups/MundoAgua3D'));
// 3D: el valle DE NOCHE — luna, cielo estrellado andino, luciérnagas, grillos
// sintetizados (0 KB, opt-in) y Angelita dormida. La finca en reposo.
const ValleNoche3DMockup = lazy(() => import('./mockups/ValleNoche3D'));
// 2D: mini-juego educativo "La milpa" — las tres hermanas (maiz + frijol +
// ahuyama). El jugador siembra en cada monticulo y ve la sinergia del
// policultivo. Estetica Cuphead andina (linea que respira, squash & stretch),
// SVG puro, offline, sin gamificacion toxica.
const JuegoLaMilpaMockup = lazy(() => import('./mockups/JuegoLaMilpa'));
// 3D: el PÁRAMO altoandino — el ecosistema de la niebla (frailejones, musgo,
// quenuas, aves) y el NACIMIENTO del agua. Didáctico: la fábrica de agua.
const MundoParamo3DMockup = lazy(() => import('./mockups/MundoParamo3D'));
// 2D (SVG, three-free): el lenguaje de forma "artesanía andina" — paleta,
// trazo, patrones de telar, banda chumbe, greca escalonada, marco de tarjeta
// y siluetas de cerámica low-poly. Rescate de huérfano (ArtesaniaAndina.jsx
// no tenía consumidor); ver su cabecera para el contrato de cableo.
const ArtesaniaAndinaTelarMockup = lazy(() => import('./mockups/ArtesaniaAndinaTelarDemo'));
const HarvestLog = lazy(() => import('./components/HarvestLog'));
const SeedingLog = lazy(() => import('./components/SeedingLog'));
const InputLog = lazy(() => import('./components/InputLog'));
const ObservationScreen = lazy(() => import('./components/ObservationScreen'));
const InvasiveObservationLog = lazy(() => import('./components/InvasiveObservationLog'));
const MaintenanceScreen = lazy(() => import('./components/MaintenanceScreen'));
const TaskLogScreen = lazy(() => import('./components/TaskLogScreen'));
const TaskScreen = lazy(() => import('./components/TaskScreen'));
const AssetsDashboard = lazy(() => import('./components/AssetsDashboard'));
const WorkerHistory = lazy(() => import('./components/WorkerHistory'));
const BitacoraEntryDetail = lazy(() => import('./components/BitacoraEntryDetail'));
const InformesScreen = lazy(() => import('./components/InformesScreen'));
const InventoryDashboard = lazy(() => import('./components/InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
// InventoryPage orquesta la capa de auditoría/reconciliación de inventario
// (InventoryAuditTrail + InventoryAuditDashboard + InventoryEventTimeline),
// completa pero huérfana (0 rutas) antes de este wiring — descubribilidad
// 2026-06-30. Se alcanza desde 'bodega' vía el botón "Auditoría y
// reconciliación", o directo por hash (#auditoria-inventario).
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const BiopreparadosScreen = lazy(() => import('./components/biopreparados/BiopreparadosScreen'));
const FarmMap = lazy(() => import('./components/FarmMap'));
const WorkerDashboard = lazy(() => import('./components/WorkerDashboard').then(m => ({ default: m.WorkerDashboard })));
const UsageStatsDashboard = lazy(() => import('./components/UsageStatsDashboard'));
const BiodiversidadView = lazy(() => import('./components/BiodiversidadView'));
const Asociaciones = lazy(() => import('./components/Asociaciones'));
const FermentosView = lazy(() => import('./components/FermentosView'));
const AnimalesScreen = lazy(() => import('./components/AnimalesScreen'));
const GallinasScreen = lazy(() => import('./components/GallinasScreen'));
const AbejasScreen = lazy(() => import('./components/AbejasScreen'));
const VacasScreen = lazy(() => import('./components/VacasScreen'));
const ConejosScreen = lazy(() => import('./components/ConejosScreen'));
const CaprinosScreen = lazy(() => import('./components/CaprinosScreen'));
const EstiercolScreen = lazy(() => import('./components/EstiercolScreen'));
const CompostScreen = lazy(() => import('./components/CompostScreen'));
const AgentScreen = lazy(() => import('./components/AgentScreen/AgentScreen'));
const OnboardingProfile = lazy(() => import('./components/OnboardingProfile'));
const OnboardingCondensado = lazy(() => import('./components/OnboardingCondensado'));
const LocationDetectedScreen = lazy(() => import('./components/LocationDetectedScreen'));
const VoiceCapture = lazy(() => import('./components/VoiceCapture'));
const PlantaPorVozScreen = lazy(() => import('./components/PlantaPorVozScreen'));
const ProcesosPorVozScreen = lazy(() => import('./components/ProcesosPorVozScreen'));
const RegistroVozScreen = lazy(() => import('./components/RegistroVozScreen'));
const RegistroUnificadoScreen = lazy(() => import('./components/RegistroUnificadoScreen'));
const CicloCultivoScreen = lazy(() => import('./components/CicloCultivoScreen'));
const GerminacionScreen = lazy(() => import('./components/GerminacionScreen'));
const CicloNutrientesScreen = lazy(() => import('./components/CicloNutrientesScreen'));
const CalendarioFincaScreen = lazy(() => import('./components/CalendarioFincaScreen'));
const AlmanaqueScreen = lazy(() => import('./components/almanaque/AlmanaqueScreen'));
const AnoFincaScreen = lazy(() => import('./components/anofinca/AnoFincaScreen'));
const SeguimientoProcesoScreen = lazy(() => import('./components/SeguimientoProcesoScreen'));
const SoilDiagnosticScreen = lazy(() => import('./components/SoilDiagnosticScreen'));
// Módulo "Agua de la finca": cosecha de lluvia (calculadora determinista),
// riego con medida (ETc; Kc/ETo = slots grounded-pendiente) y cuidar el agua
// (calidad + nacimiento, caso "se me seca el nacimiento en verano").
const AguaScreen = lazy(() => import('./components/agua/AguaScreen'));
// "Aromáticas y condimentarias": la huerta de la cocina campesina (8 hierbas,
// photo-forward). Cultivo groundeado en el catálogo Chagra; cocina sin claims
// medicinales. Vive dentro del mundo Cultivos y semillas.
const AromaticasScreen = lazy(() => import('./components/aromaticas/AromaticasScreen'));
// Mundo "El café": el cultivo bandera del campesino colombiano, contado por su
// ciclo (variedad/roya, almácigo, sombra, broca+roya, cosecha selectiva y
// beneficio). Photo-forward (patrón Agua) y groundeado en el grafo
// (species.coffea_arabica) + Cenicafé; la pulpa cierra ciclo hacia el compost.
const CafeScreen = lazy(() => import('./components/cafe/CafeScreen'));
// Mundo "La uchuva" (dentro de Cultivos y semillas): la fruta andina de
// exportación, de CLIMA FRÍO de altura (óptimo 1.800–2.800 msnm) — contraste
// didáctico con mango/cítricos (tierra caliente). 6 estaciones photo-forward:
// clima+altura / semilla+siembra / tutorado+poda / plagas (pulgón, polilla,
// minador, marchitez por Fusarium — sin dosis) / cosecha por el color del
// capacho (NTC 4580) / poscosecha de exportación. Groundeado al grafo
// (species.physalis_peruviana, pest edges → AFFECTS) + cycle-content Tier A
// (AGROSAVIA/ICA/POWO/GBIF). Fotos CC reales con crédito visible.
const UchuvaScreen = lazy(() => import('./components/uchuva/UchuvaScreen'));
// Mundo "La botica campesina": la huerta MEDICINAL de la finca andina
// (caléndula, manzanilla, toronjil, cidrón, saúco, ortiga, llantén; la ruda
// como planta de respeto). Photo-forward (patrón Café/Agua) con fotos CC.
// Dominio de salud: todo enmarcado como USO TRADICIONAL (saber popular), nunca
// medicina/cura/dosis; cultivo groundeado en el catálogo Chagra. Complementa
// —no duplica— la huerta de aromáticas de la cocina.
const BoticaScreen = lazy(() => import('./components/botica/BoticaScreen'));
// Mundo "Frutales de la finca con vida": los frutales del solar campesino
// (cítricos, aguacate, mango, guayaba, mora, lulo, tomate de árbol, papaya),
// cada uno con su ficha de cultivo. Photo-forward (patrón Café/Agua) y
// groundeado en el grafo (pest_controllers) + perennialCycles (AGROSAVIA).
const FrutalesScreen = lazy(() => import('./components/frutales/FrutalesScreen'));
// Mundo "El aguacate": la profundización dedicada del cultivo bandera de alto
// valor (Hass y criollos de montaña). Photo-forward (patrón Café) y groundeado
// en el grafo (species.persea_americana: pest_controllers, compatible_with,
// antagonist_of, biopreparados) + perennialCycles (AGROSAVIA). NO es duplicado:
// el aguacate sigue teniendo su ficha rápida dentro del mundo Frutales; aquí se
// profundiza (injerto/patrón, drenaje contra Phytophthora, floración tipo A/B).
const AguacateScreen = lazy(() => import('./components/aguacate/AguacateScreen'));
// Mundo "Los cítricos": profundización DEDICADA del frutal cítrico (naranja,
// mandarina, limón y lima) en 5 estaciones photo-forward (patrón Café). Refuerza
// el grounding térmico: el cítrico es de clima cálido-templado (0–1800 msnm; el
// limón Tahití hasta ~2100), NO de frío alto. Groundeado en el grafo
// (citrus_sinensis/reticulata/latifolia + pest_controllers) + AGROSAVIA/ICA.
const CitricosScreen = lazy(() => import('./components/citricos/CitricosScreen'));
// Mundo "La caña y la panela" (5 estaciones: la caña / siembra y manejo /
// plagas / corte / la panela). Photo-forward (patrón Café) y groundeado en el
// grafo (Diatraea AFFECTS caña; Cotesia/Trichogramma CONTROLS Diatraea) +
// Cenicaña/AGROSAVIA/FEDEPANELA/INVIMA; el bagazo cierra ciclo hacia el compost.
const CanaScreen = lazy(() => import('./components/cana/CanaScreen'));
// Mundo "El mango" (5 estaciones: variedad+siembra / piso térmico+agua /
// floración+cuaje / plagas / cosecha+despensa). Profundización dedicada del
// mango (como el café o la caña), más allá de la ficha en Frutales.
// Photo-forward (patrón Café) y groundeado en el grafo (mangifera_indica:
// pest_controllers → antracnosis/Anastrepha; compatible_with) + perennialCycles
// (AGROSAVIA); honestidad térmica (tierra cálida <1200 msnm; >1800 NO va).
const MangoScreen = lazy(() => import('./components/mango/MangoScreen'));
const RestauracionScreen = lazy(() => import('./components/restauracion/RestauracionScreen'));
// Mundo "Quinua y granos andinos": recuperación de los granos ancestrales de la
// montaña (quinua, amaranto/bledo, chía, cañihua y tarwi). Photo-forward (patrón
// Café) y groundeado en las fichas de ciclo (cycle-content) + nutrición ICBF; el
// desaponificado de la quinua es el paso clave; mildiú sin dosis químicas.
const QuinuaScreen = lazy(() => import('./components/quinua/QuinuaScreen'));
// Mundo "El fique y las fibras": el cultivo de ladera (Furcraea andina/cabuya)
// contado por su ciclo — planta+ladera (control de erosión), cría/manejo,
// desfibrado (penca→fibra), usos/cultura (cabuya, empaques, artesanía) y el
// aprovechamiento del bagazo/jugo sin contaminar el agua. Photo-forward (patrón
// Café) y groundeado en el catálogo (furcraea_andina.json) + Agrosavia; sin
// plagas ni dosis inventadas (lo que el grafo no tiene = "dato en camino").
const FiqueScreen = lazy(() => import('./components/fique/FiqueScreen'));
const MilpaScreen = lazy(() => import('./components/milpa/MilpaScreen'));
// "El clima que viene": traductor campesino de los boletines IDEAM/ENSO. Lee la
// fase ENSO en vivo (ensoService) y remite a la Mesa Técnica Agroclimática — no
// reimplementa el motor de clima ni pronostica.
const ClimaBoletinScreen = lazy(() => import('./components/clima/ClimaBoletinScreen'));
const SaludSueloScreen = lazy(() => import('./components/SaludSueloScreen'));
// Mini-app "Semilla" (soberanía de semilla): seleccionar (plantas madre),
// guardar (rama ortodoxa vs recalcitrante + Harrington) y probar germinación
// (rag-doll + ajuste de densidad). Calculadoras deterministas en
// src/services/semillaCalculator.js.
const SemillaScreen = lazy(() => import('./components/semilla/SemillaScreen'));
// Módulo "Poscosecha y Despensa" (mundo Mercado y despensa): cosechar en punto
// (índices de madurez), guardar bien (curado + calculadora determinista de
// secado de grano a humedad segura) y transformar el excedente con su punto
// crítico de inocuidad. Cifras grounded al DR nacional/internacional.
const PoscosechaScreen = lazy(() => import('./components/PoscosechaScreen'));
// Tablero "Mi cosecha": producción y rendimiento del piloto con SU dato propio
// (por cultivo, mes a mes y por lote), agregado por cosechaService sobre los
// log--harvest que HarvestLog ya registra (offline-first). Solo VISTA: el
// registro sigue viviendo en 'cosechar'.
const MiCosechaScreen = lazy(() => import('./components/cosecha/MiCosechaScreen'));
// Módulo "Almacenamiento y Conservación de Alimentos" (mundo Mercado y despensa):
// EXTIENDE/absorbe la poscosecha, enfocado en guardar a mediano/largo plazo. 4
// pilares — almacenar (troja/silo hermético + calculadora de pérdida evitada y
// capacidad + rotación PEPS), conservar (con el GUARD DE BOTULISMO pH 4,6 / olla
// a presión, autoridad institucional), plagas de almacén (Sitophilus/Prostephanus)
// y micotoxinas. Fotos CC con crédito visible. Cifras grounded al DR TRIPLE.
const AlmacenamientoScreen = lazy(() => import('./components/AlmacenamientoScreen'));
// Módulo "La comida que alimenta" (mundo Mercado y despensa): aporte
// nutricional (ICBF TCAC 2015) por cultivo, exportado del grafo chagra_kg a
// public/nutricion-humana.json (la PWA no consulta el grafo en vivo).
const NutricionHumanaScreen = lazy(() => import('./components/NutricionHumanaScreen'));
// Módulo "Plátano y banano" (mundo Cultivos y semillas): el pancoger clave del
// campesino colombiano, foto-forward. 4 pilares — variedades y la mata como
// sistema (madre-hijo-nieto + deshije), siembra y compañía (colino/cormo,
// distancias con calculadora de densidad, sombra café/cacao, hambre de potasio),
// sigatoka y picudo (reconocer + manejo agroecológico, sin dosis inventadas) y
// cosecha + aprovechamiento del pseudotallo/hoja (enlaza al mundo del abono).
// Datos grounded al catálogo/grafo (cycle-content musa, grafo-relations,
// sanidadData). Fotos CC con crédito visible.
const PlatanoBananoScreen = lazy(() => import('./components/PlatanoBananoScreen'));
// Mundo "El cacao" (dentro de Cultivos y semillas): cultivo bandera de la paz y
// la sustitución. 5 estaciones photo-forward — el árbol/clones, la sombra (SAF),
// siembra e injerto + poda, monilia y escoba de bruja (manejo cultural, sin dosis
// inventadas) y cosecha + beneficio (fermentación/secado + cáscara→abono).
// Groundeado al catálogo/grafo (theobroma_cacao, moniliophthora_*) + FEDECACAO/
// AGROSAVIA/ICA. Fotos CC reales con crédito visible (public/cacao/creditos.json).
const CacaoScreen = lazy(() => import('./components/cacao/CacaoScreen'));
// Módulo "Hortalizas de la huerta" (mundo Cultivos y semillas): la comida diaria
// de la casa campesina. Ficha de cultivo por hortaliza (siembra, luz/agua/piso
// térmico, vecinas, plagas con manejo agroecológico, cosecha y conservación).
// Vecinas + plagas del grafo chagra_kg (public/grafo-relations.json); cero dosis
// químicas; "dato en camino" donde el grafo aún no respalda. Fotos CC con crédito.
const HortalizasScreen = lazy(() => import('./components/HortalizasScreen'));
// Módulo "Tubérculos y raíces" (mundo Cultivos y semillas): el pancoger de raíz.
// Ficha de cultivo por tubérculo (siembra tubérculo-semilla/esqueje/colino,
// luz/agua/piso térmico, aporque, vecinas, plagas con manejo agroecológico,
// cosecha y conservación/curado) para papa, papa criolla, yuca, arracacha, ñame,
// batata, oca, cubio y ulluco. Vecinas + plagas del grafo chagra_kg
// (public/grafo-relations.json); cero dosis químicas; "dato en camino" donde el
// grafo aún no respalda. Fotos CC con crédito visible.
const TuberculosScreen = lazy(() => import('./components/TuberculosScreen'));
// LOS MUNDOS DE MI FINCA (reestructuración 2.0 del home): un mundo por dentro —
// las funciones existentes agrupadas por lugar. Re-rutea, no reimplementa.
const MundoScreen = lazy(() => import('./components/MundoScreen'));
// Mini-app insignia del mundo Sanidad: síntoma folk → plaga/enfermedad →
// manejo agroecológico (grounded DR AGROSAVIA/Cenicafé/SciELO + FAO/IPM).
const SanidadSintomaScreen = lazy(() => import('./components/sanidad/SanidadSintomaScreen'));
// Portada a medida del mundo 🌱 CULTIVOS Y SEMILLAS: hub que orienta por
// región/clima, agrupa las funciones existentes (directorio, ciclo, germinación,
// calendario, siembra, cosecha) y suma una calculadora de grados-día. Re-rutea,
// no reimplementa.
const MundoCultivosHub = lazy(() => import('./components/cultivos/MundoCultivosHub'));
const CromatografiaScreen = lazy(() => import('./components/CromatografiaScreen'));
const CicloVivoFullView = lazy(() => import('./components/CicloVivo/CicloVivoFullView'));
const ToxicologiaScreen = lazy(() => import('./components/ToxicologiaScreen'));
const MercadosScreen = lazy(() => import('./components/MercadosScreen'));
const GlaciarReporteScreen = lazy(() => import('./components/GlaciarReporteScreen'));
const GlaciarHistorialScreen = lazy(() => import('./components/GlaciarHistorialScreen'));
const ProfileScreen = lazy(() => import('./components/ProfileScreen'));
const CaseStudyScreen = lazy(() => import('./components/CaseStudyScreen'));
const CaseStudyDetail = lazy(() => import('./components/CaseStudyDetail'));
const FaqScreen = lazy(() => import('./components/FaqScreen'));
const HelpManual = lazy(() => import('./components/HelpManual'));
// Chunks del HOME (TopBar + DashboardLive): son la PRIMERA pantalla tras el
// login y se cargan como lazy para no pesar sobre el paint del login. Pero eso
// abre una carrera: si la red se cae (ej. el gate offline-first hace
// context.setOffline apenas ve la barra global "Cola de tareas" —que vive fuera
// del Suspense, así que aparece antes de que el chunk del dashboard termine—)
// el import dinámico en vuelo se ABORTA y React.lazy tira "Failed to fetch
// dynamically imported module", cayendo al ErrorBoundary. En dev/CI el grafo de
// módulos es grande y la ventana de la carrera se ensancha. Fix: memoizamos el
// import y lo PREcargamos mientras el usuario está en el login (ver useEffect de
// prefetch del home), de modo que al navegar al dashboard el módulo ya está en
// caché del navegador y no depende de la red. `lazy` reusa la MISMA promesa
// memoizada (prefetchHomeChunks) → sin doble fetch.
// Memoiza el import dinámico pero SIN cachear un rechazo: si el fetch se aborta
// (ej. la red se cae con el import en vuelo), limpia la promesa para que el
// siguiente intento (render de React.lazy o un nuevo preload al reconectar)
// vuelva a importar en vez de quedar envenenado con la promesa rechazada.
const makeLazyLoader = (factory) => {
  let promise = null;
  return () => {
    if (!promise) {
      promise = factory().catch((err) => {
        promise = null;
        throw err;
      });
    }
    return promise;
  };
};
const prefetchTopBar = makeLazyLoader(() => import('./components/TopBar'));
const prefetchDashboardLive = makeLazyLoader(() => import('./components/dashboard/DashboardLive'));
// Precarga los chunks del home fuera del render (se dispara desde el login).
const prefetchHomeChunks = () => {
  prefetchTopBar().catch(() => {});
  prefetchDashboardLive().catch(() => {});
};
const TopBar = lazy(() => prefetchTopBar());
const DashboardLive = lazy(() => prefetchDashboardLive());
const AprenderConAgente = lazy(() => import('./components/Aprende/AprenderConAgente'));
const CursoChagra = lazy(() => import('./components/curso/CursoChagra'));
const DirectorioEspeciesScreen = lazy(() => import('./components/DirectorioEspecies/DirectorioEspeciesScreen'));
const HoyEnFincaScreen = lazy(() => import('./components/hoy/HoyEnFincaScreen'));
const MiFincaEvolucionScreen = lazy(() => import('./components/hoy/MiFincaEvolucionScreen'));
const MiFincaVivaScreen = lazy(() => import('./components/juego/MiFincaVivaScreen'));
const DefensoresFincaScreen = lazy(() => import('./components/juego/DefensoresFincaScreen'));
const MilpaSimulator = lazy(() => import('./components/juego/MilpaSimulator'));
const DoomFincaScreen = lazy(() => import('./components/juego/DoomFincaScreen'));
const MundoSubsuelo = lazy(() => import('./components/juego/MundoSubsuelo'));
// Modo extensionista (panel supervisor multi-finca, ADR-048 MVP). Gateado por
// feature flag VITE_FEATURE_EXTENSIONISTA + rol (ver config/extensionistaAccess).
const ExtensionistaScreen = lazy(() => import('./components/ExtensionistaScreen'));
// Entrada Pro GATED por capability `avatar-espiritu` (módulo del repo privado
// chagra-pro). La pantalla pública NO contiene código visual: solo consulta el
// registry y monta el módulo Pro si está presente; si no, fallback discreto.
const EspirituProScreen = lazy(() => import('./components/EspirituProScreen'));
import HomeRegionalGreeting from './components/HomeRegionalGreeting';
import { fincaVivaHomePerfilActivo } from './config/fincaVivaHomeFlag';
import { esExtensionistaActual } from './config/extensionistaAccess';

localforage.config({
  name: 'Chagra',
  storeName: 'syncQueue'
});

// Etiquetas contextuales del fallback de Suspense (perceived performance):
// mientras baja el chunk lazy de la vista destino, el loader dice A DÓNDE
// vas en lugar del "Chagra..." genérico — la espera se siente intencional.
// Vistas sin entrada caen al label genérico (abajo).
const VIEW_LOADING_LABELS = {
  loading: 'Preparando tu chagra…',
  dashboard: 'Preparando tu chagra…',
  hoy_finca: 'Preparando tu chagra…',
  agente: 'Despertando al agente…',
  voz: 'Preparando el modo voz…',
  voz_planta: 'Preparando el modo voz…',
  directorio: 'Abriendo el catálogo de especies…',
  especies: 'Abriendo el catálogo de especies…',
  toxicologia: 'Abriendo el catálogo de especies…',
  mundo: 'Abriendo el mundo…',
  mundo_cultivos: 'Abriendo tus cultivos…',
  agua: 'Abriendo el mundo del agua…',
  suelo: 'Abriendo el mundo del suelo…',
  salud_suelo: 'Abriendo el mundo del suelo…',
  semilla: 'Abriendo el mundo de la semilla…',
  poscosecha: 'Abriendo la poscosecha…',
  almacenamiento: 'Abriendo el almacenamiento…',
  nutricion: 'Abriendo la comida que alimenta…',
  animales: 'Abriendo tus animales…',
  ciclo_vivo: 'Abriendo el ciclo vivo…',
  calendario: 'Abriendo el calendario…',
  calendario_finca: 'Abriendo el calendario…',
  almanaque: 'Abriendo el almanaque…',
  ano_finca: 'Recorriendo su año…',
  mapa: 'Abriendo el mapa…',
  mercado: 'Abriendo el mercado…',
  mercados: 'Abriendo el mercado…',
  aprende: 'Abriendo los cursos…',
  bitacora: 'Abriendo la bitácora…',
  historial: 'Abriendo la bitácora…',
  informes: 'Preparando los informes…',
};

// Si el chunk tarda más que esto, mostramos una línea de calma (UX paciente:
// típico en campo con señal débil o en la primera visita sin caché).
const SLOW_LOAD_HINT_MS = 4000;

const LoadingFallback = ({ view = null }) => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_LOAD_HINT_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className="h-[100dvh] bg-slate-950 flex flex-col items-center justify-center gap-3 text-muzo-glow"
      data-testid="app-suspense-fallback"
    >
      <ChagraGrowLoader size={80} showLabel labelText={VIEW_LOADING_LABELS[view] || 'Cargando…'} />
      {slow && (
        <p
          className="text-xs text-slate-400 text-center px-8 max-w-xs"
          data-testid="app-suspense-slow-hint"
          aria-live="polite"
        >
          Sigue cargando — con señal de campo puede tardar un poco más. No se perdió nada.
        </p>
      )}
    </div>
  );
};

// CÓDIGO MUERTO REMOVIDO 2026-06-24 (descubribilidad): `NAV_TILES` +
// `ACCENT_CLASSES` solo los consumía `DashboardView` (la grilla de 16 tiles del
// dashboard legacy), que NUNCA se montaba — `case 'dashboard'` renderiza
// `DashboardLiveView`. La home viva es `DashboardLive.jsx` (HERRAMIENTAS_TILES +
// FincaCards + mano radial). Los launchers que SOLO vivían en ese código muerto
// (`casos` vía CaseStudyTopWidget, `javier` vía el tile) se rescataron a la home
// viva (HERRAMIENTAS_TILES en DashboardLive). Las rutas `casos`/`caso_detail`/
// `javier`/`usage_stats` siguen vivas en el router (más abajo) y por hash.
// Ref: CAPABILITIES_STATUS.md §4 (deuda de navegación) + §2 (huérfanos).

// Rutas PÚBLICAS de mockups (vitrinas de discovery). Se resuelven ANTES del
// check de sesión — cualquiera con el enlace las abre sin cuenta, igual que
// #onboarding-piloto. El hash llega ya normalizado (sin `#`/`#/`).
const MOCKUP_HASH_ROUTES = {
  'mockups/visual-lib': 'mockup_visual_lib',
  // Galería aspiracional (3D + voz + superficies definitivas + piezas de diseño).
  'mockups/entrada-3d': 'mockup_entrada_3d',
  'mockups/mundo3d-agua': 'mockup_mundo3d_agua',
  'mockups/mundo3d-suelo': 'mockup_mundo3d_suelo',
  'mockups/mundo3d-animales': 'mockup_mundo3d_animales',
  'mockups/mundo3d-milpa': 'mockup_mundo3d_milpa',
  'mockups/mundo3d-bosque': 'mockup_mundo3d_bosque',
  'mockups/mundo3d-clima': 'mockup_mundo3d_clima',
  'mockups/voz-con-forma': 'mockup_voz_con_forma',
  'mockups/conversacion-voz': 'mockup_conversacion_voz',
  'mockups/ensena-dibujando': 'mockup_ensena_dibujando',
  'mockups/dia-en-finca': 'mockup_dia_en_finca',
  'mockups/salud-finca': 'mockup_salud_finca',
  'mockups/primer-cultivo': 'mockup_primer_cultivo',
  'mockups/mercado': 'mockup_mercado',
  'mockups/onboarding-siembra': 'mockup_onboarding_siembra',
  'mockups/montana-mundos': 'mockup_montana_mundos',
  'mockups/montana-mundos-cine': 'mockup_montana_mundos_cine',
  'mockups/montana-mundos-campesino': 'mockup_montana_mundos_campesino',
  'mockups/entrada-campesina': 'mockup_entrada_campesina',
  'mockups/home-campesino': 'mockup_home_campesino',
  'mockups/boton-anarquia': 'mockup_boton_anarquia',
  'mockups/avatar-biopunk': 'mockup_avatar_biopunk',
  'mockups/avatar-verde-vivo': 'mockup_avatar_verde_vivo',
  'mockups/avatar-libre': 'mockup_avatar_libre',
  'mockups/mapa-acuarela': 'mockup_mapa_acuarela',
  'mockups/clima-atmosfera': 'mockup_clima_atmosfera',
  'mockups/diagnostico-foto': 'mockup_diagnostico_foto',
  'mockups/evidencia-ilustrada': 'mockup_evidencia_ilustrada',
  'mockups/guardianes-narrativos': 'mockup_guardianes',
  'mockups/hoja-vida-mata': 'mockup_hoja_vida_mata',
  // (anti-conflicto de merge) rutas nuevas SIEMPRE al final del bloque:
  'mockups/mundo3d-sanidad': 'mockup_mundo3d_sanidad',
  'mockups/mundo3d-mercado': 'mockup_mundo3d_mercado',
  'mockups/mundo3d-cafe': 'mockup_mundo3d_cafe',
  'mockups/mundo3d-semillero': 'mockup_mundo3d_semillero',
  'mockups/infraestructura-3d': 'mockup_infraestructura_3d',
  'mockups/colocar-infraestructura': 'mockup_colocar_infraestructura',
  'mockups/vitrina-3d': 'mockup_vitrina_3d',
  'mockups/vitrina-infra': 'mockup_vitrina_infra',
  'mockups/vitrina-mundos': 'mockup_vitrina_mundos',
  'mockups/sierra-global': 'mockup_sierra_global',
  'mockups/mundo-agua-3d': 'mockup_mundo_agua_3d',
  'mockups/valle-noche-3d': 'mockup_valle_noche_3d',
  'mockups/juego-la-milpa': 'mockup_juego_la_milpa',
  'mockups/mundo-paramo-3d': 'mockup_mundo_paramo_3d',
  'mockups/artesania-andina-telar': 'mockup_artesania_andina_telar',
};

const HASH_VIEW_ROUTES = {
  agente: 'agente',
  'ciclo-vivo': 'ciclo_vivo',
  faq: 'faq',
  inventario: 'activos',
  activos: 'activos',
  bodega: 'bodega',
  'auditoria-inventario': 'auditoria_inventario',
  'inventario-auditoria': 'auditoria_inventario',
  biodiversidad: 'biodiversidad',
  ayuda: 'ayuda',
  perfil: 'perfil',
  informes: 'informes',
  'case-studies': 'casos',
  casos: 'casos',
  extensionista: 'extensionista',
  tareas: 'task_log',
  task_log: 'task_log',
  hoy: 'hoy_finca',
  'hoy-en-finca': 'hoy_finca',
  evolucion: 'evolucion',
  glaciar: 'glaciar',
  'glaciar-historial': 'glaciar_historial',
  fermentos: 'fermentos',
  cromatografia: 'cromatografia',
  germinacion: 'germinacion',
  'ciclo-nutrientes': 'ciclo_nutrientes',
  calendario: 'calendario_finca',
  'calendario-finca': 'calendario_finca',
  almanaque: 'almanaque',
  'almanaque-campesino': 'almanaque',
  'ano-finca': 'ano_finca',
  'ano-de-la-finca': 'ano_finca',
  animales: 'animales',
  'animales-gallinas': 'animales_gallinas',
  'animales-abejas': 'animales_abejas',
  abejas: 'animales_abejas',
  polinizacion: 'animales_abejas',
  polinizadores: 'animales_abejas',
  meliponicultura: 'animales_abejas',
  'animales-vacas': 'animales_vacas',
  'animales-conejos': 'animales_conejos',
  conejos: 'animales_conejos',
  'animales-caprinos': 'animales_caprinos',
  'cabras-ovejas': 'animales_caprinos',
  cabras: 'animales_caprinos',
  estiercol: 'estiercol',
  'del-corral-al-abono': 'estiercol',
  abono: 'estiercol',
  biodigestor: 'estiercol',
  compost: 'compost',
  'estiercol-compost': 'compost',
  'compost-paso-a-paso': 'compost',
  'doom-finca': 'doom_finca',
  subsuelo: 'subsuelo',
  'mundo-subsuelo': 'subsuelo',
  toxicologia: 'toxicologia',
  suelo: 'suelo',
  agua: 'agua',
  'manejo-agua': 'agua',
  aromaticas: 'aromaticas',
  'aromaticas-condimentarias': 'aromaticas',
  condimentarias: 'aromaticas',
  'huerta-aromaticas': 'aromaticas',
  cafe: 'cafe',
  café: 'cafe',
  'el-cafe': 'cafe',
  cafetal: 'cafe',
  cafeto: 'cafe',
  uchuva: 'uchuva',
  'la-uchuva': 'uchuva',
  aguaymanto: 'uchuva',
  uvilla: 'uchuva',
  guchuva: 'uchuva',
  physalis: 'uchuva',
  botica: 'botica',
  'botica-campesina': 'botica',
  medicinales: 'botica',
  'plantas-medicinales': 'botica',
  'huerta-medicinal': 'botica',
  frutales: 'frutales',
  frutal: 'frutales',
  'arboles-frutales': 'frutales',
  'frutales-finca': 'frutales',
  aguacate: 'aguacate',
  'el-aguacate': 'aguacate',
  palta: 'aguacate',
  cura: 'aguacate',
  hass: 'aguacate',
  persea: 'aguacate',
  citricos: 'citricos',
  cítricos: 'citricos',
  'los-citricos': 'citricos',
  citrico: 'citricos',
  naranja: 'citricos',
  mandarina: 'citricos',
  limon: 'citricos',
  limón: 'citricos',
  lima: 'citricos',
  cana: 'cana',
  caña: 'cana',
  'la-cana': 'cana',
  panela: 'cana',
  trapiche: 'cana',
  canaveral: 'cana',
  cañaveral: 'cana',
  mango: 'mango',
  'el-mango': 'mango',
  mangifera: 'mango',
  manga: 'mango',
  mancera: 'mango',
  restauracion: 'restauracion',
  'restauracion-bosque': 'restauracion',
  'bosque-de-alimentos': 'restauracion',
  'bosque-comestible': 'restauracion',
  agroforesteria: 'restauracion',
  'food-forest': 'restauracion',
  fique: 'fique',
  'el-fique': 'fique',
  cabuya: 'fique',
  penca: 'fique',
  furcraea: 'fique',
  fibras: 'fique',
  // Mundo "Quinua y granos andinos" (dentro de Cultivos y semillas). El switch
  // ya tenía el `case 'quinua'` pero faltaba la ruta hash → #quinua caía al
  // dashboard (bug funcional QA-VISUAL-MUNDOS 2026-07-08: mundo inalcanzable por
  // deep-link/QR). Aliases = los granos que cubre + nombre científico, igual
  // que los mundos hermanos (mango→mangifera, uchuva→physalis).
  quinua: 'quinua',
  'granos-andinos': 'quinua',
  'granos-ancestrales': 'quinua',
  granos: 'quinua',
  quinoa: 'quinua',
  chenopodium: 'quinua',
  amaranto: 'quinua',
  bledo: 'quinua',
  chia: 'quinua',
  chía: 'quinua',
  cañihua: 'quinua',
  canihua: 'quinua',
  tarwi: 'quinua',
  'milpa-cultivo': 'milpa_cultivo',
  'tres-hermanas': 'milpa_cultivo',
  'salud-suelo': 'salud_suelo',
  'cuaderno-suelo': 'salud_suelo',
  encalado: 'salud_suelo',
  semilla: 'semilla',
  semillas: 'semilla',
  'soberania-semilla': 'semilla',
  aprende: 'aprende',
  directorio: 'directorio',
  'directorio-especies': 'directorio',
  especies: 'directorio',
  plagas: 'plagas',
  'directorio-plagas': 'plagas',
  plaga: 'plagas',
  enfermedades: 'plagas',
  'usage-stats': 'usage_stats',
  mercado: 'mercado',
  mercados: 'mercado',
  vender: 'mercado',
  poscosecha: 'poscosecha',
  despensa: 'poscosecha',
  'poscosecha-despensa': 'poscosecha',
  almacenamiento: 'almacenamiento',
  'almacenamiento-conservacion': 'almacenamiento',
  conservacion: 'almacenamiento',
  almacenar: 'almacenamiento',
  silo: 'almacenamiento',
  nutricion: 'nutricion',
  'nutricion-humana': 'nutricion',
  'comida-que-alimenta': 'nutricion',
  platano: 'platano',
  'platano-banano': 'platano',
  banano: 'platano',
  platanera: 'platano',
  cacao: 'cacao',
  'el-cacao': 'cacao',
  theobroma: 'cacao',
  hortalizas: 'hortalizas',
  huerta: 'hortalizas',
  verduras: 'hortalizas',
  tuberculos: 'tuberculos',
  'tuberculos-raices': 'tuberculos',
  raices: 'tuberculos',
  papa: 'tuberculos',
  yuca: 'tuberculos',
  // Curso guiado + deep-links profundos usados por la landing (chagra.bio):
  // permiten que chagra.app/#curso, /#sembrar, /#voz, /#milpa, /#biopreparados,
  // /#sanidad y /#cosechar caigan en su vista real (antes caían a dashboard).
  curso: 'curso',
  'curso-chagra': 'curso',
  manual: 'curso',
  sembrar: 'sembrar',
  siembra: 'sembrar',
  voz: 'voz',
  milpa: 'milpa',
  biopreparados: 'biopreparados',
  sanidad: 'sanidad_sintoma',
  'sanidad-sintoma': 'sanidad_sintoma',
  cosechar: 'cosechar',
  'mi-cosecha': 'mi_cosecha',
  micosecha: 'mi_cosecha',
  // Entrada Pro (capability avatar-espiritu). Gated: sin módulo Pro cargado
  // la pantalla degrada a fallback discreto.
  espiritu: 'espiritu_pro',
};

// Vistas que cuentan como "módulo" para telemetría de piloto.
const MODULE_VIEWS = new Set([
  'activos', 'mapa', 'javier', 'bodega', 'task_log', 'historial', 'bitacora',
  'biodiversidad', 'informes', 'perfil', 'ayuda', 'help',
  'animales', 'animales_gallinas', 'animales_abejas', 'animales_vacas', 'estiercol', 'compost',
  'animales', 'animales_gallinas', 'animales_abejas', 'animales_vacas', 'animales_conejos', 'animales_caprinos', 'estiercol',
  'hoy_finca',   'faq', 'evolucion', 'juego', 'defensores', 'milpa', 'doom_finca', 'subsuelo', 'sembrar', 'cosechar', 'mi_cosecha', 'insumos', 'biopreparados',
  'observacion', 'reportar_invasora', 'sanidad_sintoma', 'mantenimiento', 'new_task',
  'agente', 'voz', 'voz_planta', 'procesos', 'registro_voz', 'registro_unificado', 'ciclo', 'germinacion', 'ciclo_nutrientes', 'calendario_finca', 'suelo', 'agua', 'clima_boletin', 'salud_suelo', 'semilla', 'poscosecha', 'almacenamiento', 'nutricion', 'aromaticas', 'toxicologia', 'aprende', 'curso', 'directorio', 'mercados',
  'agente', 'voz', 'voz_planta', 'procesos', 'registro_voz', 'registro_unificado', 'ciclo', 'germinacion', 'ciclo_nutrientes', 'calendario_finca', 'suelo', 'agua', 'cafe', 'uchuva', 'frutales', 'clima_boletin', 'salud_suelo', 'semilla', 'poscosecha', 'almacenamiento', 'nutricion', 'toxicologia', 'aprende', 'curso', 'directorio', 'mercados',
  'agente', 'voz', 'voz_planta', 'procesos', 'registro_voz', 'registro_unificado', 'ciclo', 'germinacion', 'ciclo_nutrientes', 'calendario_finca', 'suelo', 'agua', 'cafe', 'frutales', 'aguacate', 'clima_boletin', 'salud_suelo', 'semilla', 'poscosecha', 'almacenamiento', 'nutricion', 'toxicologia', 'aprende', 'curso', 'directorio', 'mercados',
  'agente', 'voz', 'voz_planta', 'procesos', 'registro_voz', 'registro_unificado', 'ciclo', 'germinacion', 'ciclo_nutrientes', 'calendario_finca', 'almanaque', 'suelo', 'agua', 'cafe', 'clima_boletin', 'salud_suelo', 'semilla', 'poscosecha', 'almacenamiento', 'nutricion', 'toxicologia', 'aprende', 'curso', 'directorio', 'mercados',
  'agente', 'voz', 'voz_planta', 'procesos', 'registro_voz', 'registro_unificado', 'ciclo', 'germinacion', 'ciclo_nutrientes', 'calendario_finca', 'suelo', 'agua', 'cafe', 'cana', 'mango', 'restauracion', 'clima_boletin', 'salud_suelo', 'semilla', 'poscosecha', 'almacenamiento', 'nutricion', 'toxicologia', 'aprende', 'curso', 'directorio', 'mercados',
  'agente', 'voz', 'voz_planta', 'procesos', 'registro_voz', 'registro_unificado', 'ciclo', 'germinacion', 'ciclo_nutrientes', 'calendario_finca', 'suelo', 'agua', 'cafe', 'fique', 'clima_boletin', 'salud_suelo', 'semilla', 'poscosecha', 'almacenamiento', 'nutricion', 'toxicologia', 'aprende', 'curso', 'directorio', 'mercados',
  'agente', 'voz', 'voz_planta', 'procesos', 'registro_voz', 'registro_unificado', 'ciclo', 'germinacion', 'ciclo_nutrientes', 'calendario_finca', 'suelo', 'agua', 'clima_boletin', 'salud_suelo', 'semilla', 'poscosecha', 'almacenamiento', 'nutricion', 'platano', 'toxicologia', 'aprende', 'curso', 'directorio', 'mercados',
  'agente', 'voz', 'voz_planta', 'procesos', 'registro_voz', 'registro_unificado', 'ciclo', 'germinacion', 'ciclo_nutrientes', 'calendario_finca', 'suelo', 'agua', 'clima_boletin', 'salud_suelo', 'semilla', 'poscosecha', 'almacenamiento', 'nutricion', 'cacao', 'toxicologia', 'aprende', 'curso', 'directorio', 'mercados',
  'agente', 'voz', 'voz_planta', 'procesos', 'registro_voz', 'registro_unificado', 'ciclo', 'germinacion', 'ciclo_nutrientes', 'calendario_finca', 'suelo', 'agua', 'clima_boletin', 'salud_suelo', 'semilla', 'poscosecha', 'almacenamiento', 'nutricion', 'hortalizas', 'tuberculos', 'toxicologia', 'aprende', 'curso', 'directorio', 'mercados',
  'agente', 'voz', 'voz_planta', 'procesos', 'registro_voz', 'registro_unificado', 'ciclo', 'germinacion', 'ciclo_nutrientes', 'calendario_finca', 'suelo', 'agua', 'milpa_cultivo', 'clima_boletin', 'salud_suelo', 'semilla', 'poscosecha', 'almacenamiento', 'nutricion', 'toxicologia', 'aprende', 'curso', 'directorio', 'mercados',
  'agente', 'voz', 'voz_planta', 'procesos', 'registro_voz', 'registro_unificado', 'ciclo', 'germinacion', 'ciclo_nutrientes', 'calendario_finca', 'suelo', 'agua', 'clima_boletin', 'salud_suelo', 'semilla', 'poscosecha', 'almacenamiento', 'nutricion', 'toxicologia', 'aprende', 'curso', 'directorio', 'plagas', 'mercados',
  'glaciar', 'glaciar_historial', 'extensionista', 'plant_asset',
  'casos', 'caso_detail', 'bitacora_detail', 'edit_task', 'cromatografia', 'ciclo_vivo',
  'usage_stats', 'mercado', 'auditoria_inventario', 'mundo', 'valle3d',
]);

// T2: Dashboard como componente propio con suscripción reactiva al store.
// useAssetStore() (hook) dispara re-render cuando hydrate()/syncFromServer() actualizan
// el estado, a diferencia de useAssetStore.getState() que es una lectura snapshot.
// DashboardLiveView — el dashboard rediseñado 2026-05-28 cervezas-test:
// agente Chagra protagonista + clima IDEAM + secciones drag-reorder.
// Mantiene shell (TopBar + HomeRegionalGreeting) y delega contenido a
// DashboardLive (src/components/dashboard/DashboardLive.jsx).
const DashboardLiveView = React.memo(/**
 * @param {Object} props
 * @param {(view: string, data?: any) => void} props.onNavigate
 * @param {() => void} props.onLogout
 * @param {string} [props.lastLogMessage]
 */
function DashboardLiveView({ onNavigate, onLogout }) {
  // Scroll restoration vive DENTRO de DashboardLive (apunta a su propio
  // scroller — no hay <main> en DashboardLiveView).
  const hydrate = useAssetStore((s) => s.hydrate);
  const syncFromServer = useAssetStore((s) => s.syncFromServer);
  const idle = useIdleDetection(12000);
  // HOME "Finca Viva" por perfil (flag VITE_FINCA_VIVA_HOME_PERFIL). Con la flag
  // ON, FincaVivaHero ES el home: trae su PROPIA barra superior (marca + chip de
  // ubicación + ayuda/perfil) y su propio saludo. El shell inmersivo del agente
  // (TopBar flotante legacy + scrim oscuro + capa biopunk) DUPLICABA esa barra y
  // chocaba con la estética clara del F2 — se ven DOS "Chagra" apilados. Con la
  // flag ON lo retiramos: una sola barra, un solo home cohesivo. Con la flag OFF
  // (default, prod) todo queda intacto.
  const fincaViva = fincaVivaHomePerfilActivo();
  useEffect(() => {
    hydrate().then(() => {
      if (navigator.onLine) syncFromServer(fetchFromFarmOS);
    });
  }, [hydrate, syncFromServer]);

  if (fincaViva) {
    // F2: el hero (FincaVivaHero, dentro de DashboardLive) gobierna el fondo, la
    // barra y el saludo. Sin TopBar flotante ni scrim/biopunk oscuro encima — el
    // "resto de la finca" fluye en una hoja clara bajo el hero (DashboardLive).
    return (
      <div className="relative h-[100dvh] w-full flex flex-col overflow-hidden bg-[#c8e8cb]">
        <DashboardLive onNavigate={onNavigate} onLogout={onLogout} />
      </div>
    );
  }

  return (
    // .app-scrim (scrim por token, spec 2026-06-05): antes bg-slate-950/55
    // hardcodeado tapaba al 100% el fondo-foto elegido en el selector
    // (--app-bg-image en el body, clase .app-bg-biodiversidad). El operador veía
    // la foto en pantallas con ScreenShell pero NO en la principal. El scrim
    // ahora sale de --scrim-bg/--scrim-opacity → navy en bio-punk, crema sutil en
    // temas claros (no lava la imagen). BiopunkBackground (capa animada) +
    // contenido z-10 mantienen legibilidad.
    <div className="relative h-[100dvh] w-full text-white flex flex-col overflow-hidden">
      {/* Fondo visible: body tiene la imagen/gradiente, este div es transparente */}
      {/* Capa biopunk viva — sutil siempre, salvaje en idle */}
      <BiopunkBackground intense={idle} />
      {/* Contenido del dashboard, fade-out cuando idle para resaltar fondo.
          PORTADA INMERSIVA 2026-06-06: el AgentHero ocupa la PRIMERA pantalla
          completa (≈100dvh). Para no romper esa inmersión, el TopBar pasa de
          ser un hermano-flex que come alto vertical a un overlay FLOTANTE
          discreto encima de la escena (sticky→absolute), y el scroller
          (DashboardLive) ocupa toda la altura. El saludo regional dismissible
          ya NO va sobre el hero (duplicaba su saludo): baja al flujo bajo el
          fold, junto a las secciones de finca/clima/análisis. */}
      <div
        className="relative z-10 flex flex-col h-full transition-opacity duration-[1500ms] ease-out"
        style={{ opacity: idle ? 0.18 : 1 }}
      >
        {/* TopBar flotante: capa propia por encima del scroller inmersivo. */}
        <div className="absolute top-0 inset-x-0 z-30 agent-immersive-topbar">
          <TopBar onNavigate={onNavigate} onLogout={onLogout} />
        </div>
        <DashboardLive onNavigate={onNavigate} regionalGreeting={<HomeRegionalGreeting />} />
      </div>
      {/* Hint subliminal cuando idle — "toca para volver" */}
      {idle && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-emerald-300/70 text-xs uppercase tracking-[0.3em] font-mono"
          style={{ animation: 'biopunk-hint 2.5s ease-in-out infinite' }}
        >
          ⊹ toca para volver ⊹
          <style>{`
            @keyframes biopunk-hint {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 0.95; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
});

export default function App() {
  useTheme();
  // Atmósfera climática: el clima real (climaService) matiza el tema activo
  // vía data-clima/data-luz/data-enso en <html> (clima-atmosfera.css).
  useClimaAtmosphere();
  // Atajos teclado globales (?, g+h). Quick-win UX 2026-05-28 demo Diana.
  // Solo activos post-login (no en loading ni login para no atrapar shift+?
  // accidental al escribir password).
  const [currentView, setCurrentView] = useState('loading');
  // Estado online reactivo: usado para mostrar el aviso offline del agente
  // ANTES de intentar el dynamic import de AgentScreen (ver `case 'agente'`).
  // Sin esto, abrir el agente offline con su chunk no cacheado caía en el
  // ErrorBoundary genérico y el guard offline real quedaba inalcanzable.
  const [isAppOnline, setIsAppOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  useEffect(() => {
    const goOnline = () => {
      setIsAppOnline(true);
      // Tarea #8 — al recuperar conexión, intentar drenar la telemetría del
      // agente al sidecar. No-bloqueante y tolerante a fallos; internamente
      // respeta el consentimiento del usuario (default OFF) — si no lo dio,
      // es un no-op silencioso. NUNCA envía prompts ni PII.
      void syncAgentTelemetry();
      void syncUsageTelemetry();
    };
    const goOffline = () => setIsAppOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    // Un intento al montar (cubre el caso de requests 'done' que quedaron sin
    // sincronizar de una sesión previa). Diferido para no competir con el boot.
    const bootSync = setTimeout(() => {
      void syncAgentTelemetry();
      void syncUsageTelemetry();
    }, 8000);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearTimeout(bootSync);
    };
  }, []);
  useGlobalKeyboardShortcuts({ enabled: currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && !currentView.startsWith('mockup_') });
  const [currentViewData, setCurrentViewData] = useState(null);
  const [toast, setToast] = useState(null);
  const [lastLogMessage, setLastLogMessage] = useState('');
  // Transición colibrí (home→conversación): se activa al pasar de la portada
  // (dashboard, donde vive el AgentHero) al agente. El overlay va ENCIMA y la
  // conversación monta detrás; al terminar, queda la conversación limpia.
  const [colibriTransition, setColibriTransition] = useState(false);

  // navigate(view, data), único entry point para cambiar vista. Limpia
  // currentViewData salvo cuando se pasa explícitamente. Sin esto, navegar
  // dashboard → vista_con_initialData → dashboard → misma_vista_otra_vez
  // reusaba el initialData stale (bug latente de UX).
  const navigate = useCallback((view, initialData = null) => {
    // Transición colibrí solo en home→conversación (la portada con el hero del
    // agente → el agente). Otras entradas al agente (FAB, tile, notificación)
    // conservan la entrada suave estándar del AgentScreen, sin video.
    if (view === 'agente' && currentView === 'dashboard') {
      setColibriTransition(true);
    }
    setCurrentView(view);
    setCurrentViewData(initialData);
    try {
      if (MODULE_VIEWS.has(view)) {
        // Evento screen_view directo para la agregación de pantallas del sidecar
        // (el wrapper es no-throw y anónimo). Mantenemos también `modulo_abierto`
        // por back-compat: el sidecar lo trata como alias de screen_view.
        recordScreenView(view);
        import('./services/pilotTelemetryService.js').then(({ recordPilotEvent }) => {
          recordPilotEvent({
            event_type: 'modulo_abierto',
            metadata: { modulo_id: view, desde_home: currentView === 'dashboard' },
          }).catch(() => {});
        }).catch(() => {});
      }
    } catch (_) { /* telemetría nunca rompe el flujo */ }
  }, [currentView]);

  useEffect(() => {
    const handleNavigate = (e) => navigate(e.detail.view, e.detail.initialData || null);
    window.addEventListener('chagraNavigate', handleNavigate);
    return () => window.removeEventListener('chagraNavigate', handleNavigate);
  }, [navigate]);

  // 2026-05-28: ScreenShell despacha 'chagra:nav' (formato simplificado) cuando
  // user clickea Home/Alertas/Ayuda en pantallas secundarias. Sin esto, los
  // botones globales del ScreenShell no navegan a ningún lado. Acepta string
  // simple o objeto {view, data}.
  useEffect(() => {
    const handleNavSimple = (e) => {
      const payload = e.detail;
      if (typeof payload === 'string') {
        navigate(payload, null);
      } else if (payload && typeof payload === 'object' && payload.view) {
        navigate(payload.view, payload.data || null);
      }
    };
    window.addEventListener('chagra:nav', handleNavSimple);
    return () => window.removeEventListener('chagra:nav', handleNavSimple);
  }, [navigate]);

  useEffect(() => {
    const handler = (e) => setLastLogMessage(e.detail);
    window.addEventListener('farmosLog', handler);
    return () => window.removeEventListener('farmosLog', handler);
  }, []);

  // Bug Lili #4: el InputLogForm dispatcha 'syncSuccess' tras registrar una
  // aplicación de bio-insumo, pero nadie escuchaba el evento → el operador
  // no veía feedback de dónde quedó guardada la info. Listener aquí que
  // alimenta el toast con CTA "Ver Bitácora" cuando el evento trae action.
  // detail: { message: string, actionLabel?: string, actionView?: string }
  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail || {};
      setToast({
        message: detail.message || 'Registrado',
        isError: false,
        actionLabel: detail.actionLabel,
        actionView: detail.actionView,
      });
      // Toast con CTA persiste 6s (más tiempo para que el operador alcance
      // a tocar el botón). Sin CTA, auto-dismiss a 4s (igual que showToast).
      const ttl = detail.actionLabel ? 6000 : 4000;
      setTimeout(() => setToast(null), ttl);
    };
    window.addEventListener('syncSuccess', handler);
    return () => window.removeEventListener('syncSuccess', handler);
  }, []);

  // Ruteo INICIAL por URL: corre UNA sola vez al montar. Sin este guardia el
  // efecto se re-disparaba en CADA navegación —su dep `[navigate]` cambia de
  // identidad porque `navigate` es useCallback([currentView])— y volvía a
  // resolver `HASH_VIEW_ROUTES[hash] || 'dashboard'`. Como las navegaciones
  // in-app (FAB/tile/“enviar al agente”) NO escriben el hash, el hash quedaba
  // vacío → `navigate('dashboard')` pisaba la vista recién abierta ~40ms
  // después. Síntoma: al enviar desde el hero, `currentView` pasaba a 'agente'
  // y al instante volvía a 'dashboard' (AgentScreen nunca terminaba de montar).
  // El ruteo por URL solo tiene sentido en la carga inicial, así que lo fijamos
  // a una corrida única; las rutas vía hash siguen cubiertas por el listener
  // `hashchange` (handleHashRoute) más abajo.
  const bootRoutedRef = useRef(false);
  useEffect(() => {
    if (bootRoutedRef.current) return;
    bootRoutedRef.current = true;
    // Rutas públicas (sin auth check): onboarding-piloto. Soporta pathname
    // (app.example.co/onboarding-piloto) gracias al SPA fallback de Nginx
    // que sirve index.html, hash (#onboarding-piloto), o query
    // (?onboarding=piloto). Esto permite que pilotos invitados lleguen al
    // form sin tener cuenta previa en FarmOS.
    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    const search = new URLSearchParams(window.location.search);

    // Callback OAuth (Authorization Code + PKCE): farmOS redirige a
    // /callback?code=...&state=... tras /oauth/authorize. Detectamos la ruta
    // (pathname `callback`/`oauth/callback`, hash `callback`, o presencia de
    // `code`+`state` en query) y montamos la vista OAuthCallback que hace el
    // intercambio code→token. Va ANTES de los demás checks: si hay un code en
    // vuelo no queremos que isAuthenticated() (todavía false) mande a login y
    // se pierda el code. El redirect_uri DEBE estar registrado en el cliente
    // OAuth de farmOS para que este flujo complete (paso backend del operador).
    const isOAuthCallback =
      pathname === 'callback' ||
      pathname === 'oauth/callback' ||
      hash === 'callback' ||
      (search.get('code') && search.get('state'));
    if (isOAuthCallback) {
      Promise.resolve().then(() => navigate('oauth-callback'));
      return;
    }

    // Rutas públicas de mockups (#/mockups/visual-lib): van ANTES del check de
    // sesión — son vitrinas de discovery sin datos de finca, se abren sin auth.
    const mockupView = MOCKUP_HASH_ROUTES[hash];
    if (mockupView) {
      Promise.resolve().then(() => navigate(mockupView));
      return;
    }

    isAuthenticated().then((isAuth) => {
      if (!isAuth) {
        navigate('login');
        return;
      }
      const targetView = HASH_VIEW_ROUTES[hash] || 'dashboard';
      // Gate de acceso: el módulo glaciar es solo para los beta testers de "La
      // Cordada". Si un usuario fuera de la whitelist aterriza en #glaciar,
      // mandamos al dashboard — el módulo NO se monta (ver glaciarAccess.js).
      if (targetView === 'glaciar' && !tieneAccesoGlaciarActual()) {
        navigate('dashboard');
        return;
      }
      // Gate del modo extensionista (ADR-048): si un usuario sin rol aterriza
      // en #extensionista (flag off o fuera de whitelist), va al dashboard.
      if (targetView === 'extensionista' && !esExtensionistaActual()) {
        navigate('dashboard');
        return;
      }
      navigate(targetView);
    });
  }, [navigate]);

  useEffect(() => {
    const handleHashRoute = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      // Mockups públicos primero: sin gate de sesión ni de rol.
      const mockupView = MOCKUP_HASH_ROUTES[hash];
      if (mockupView) {
        navigate(mockupView);
        return;
      }
      const routeView = HASH_VIEW_ROUTES[hash];
      if (!routeView) return;
      // Gate extensionista (ADR-048): no montar el panel para quien no tiene rol.
      if (routeView === 'extensionista' && !esExtensionistaActual()) {
        navigate('dashboard');
        return;
      }
      isAuthenticated().then((isAuth) => {
        if (!isAuth) return;
        // Gate glaciar (La Cordada): un usuario no autorizado que navega a
        // #glaciar es redirigido al dashboard en vez de montar el módulo.
        if (routeView === 'glaciar' && !tieneAccesoGlaciarActual()) {
          navigate('dashboard');
          return;
        }
        navigate(routeView);
      });
    };

    window.addEventListener('hashchange', handleHashRoute);
    return () => window.removeEventListener('hashchange', handleHashRoute);
  }, [navigate]);

  // Preload del catálogo SQLite WASM en background (v0.8.2). Inicializa la
  // DB cuando la app arranca para que la primera apertura de los flows que
  // consultan el catálogo (InvasiveObservationLog, NativeSubstituteSuggestion,
  // etc.) no espere el download del .sqlite (~135KB) ni la inicialización
  // del WASM. Si falla, el catalogDB log lo registra y los componentes
  // muestran su propio empty/error state.
  //
  // PERF-1 (medido 2026-07): `catalogDB.js` (~217KB) + el WASM de
  // @sqlite.org/sqlite-wasm eran un import ESTÁTICO aquí. Como App.jsx es el
  // entry-point (no-lazy), eso metía ~217KB en el grafo de módulos CRÍTICO
  // que el navegador debe bajar+parsear antes de pintar CUALQUIER pantalla
  // (login incluida). Import dinámico + `requestIdleCallback`: el catálogo
  // se sigue precargando en background (mismo comportamiento observable),
  // pero deja de competir con el primer paint.
  useEffect(() => {
    const schedule = typeof requestIdleCallback === 'function'
      ? (fn) => requestIdleCallback(fn, { timeout: 4000 })
      : (fn) => setTimeout(fn, 0);
    schedule(() => {
      import('./db/catalogDB').then(({ initCatalog }) => initCatalog()).catch((err) => {
        console.warn('[App] Catálogo no se pudo preload (los componentes lo reintentarán al usarlos):', err);
      });
    });
  }, []);

  // Prefetch del HOME mientras el usuario está en el login: baja los chunks de
  // TopBar + DashboardLive ANTES de navegar al dashboard, para que la
  // transición no dependa de la red en ese instante. Cierra la carrera del gate
  // offline-first (context.setOffline apenas ve "Cola de tareas" —barra global,
  // fuera del Suspense— abortaba el import en vuelo del dashboard → ErrorBoundary
  // "Failed to fetch dynamically imported module"). Fire-and-forget y no-throw:
  // si falla o no alcanza a terminar, el flujo lazy normal sigue vigente.
  useEffect(() => {
    if (currentView !== 'login') return;
    try {
      prefetchHomeChunks();
    } catch (err) {
      console.warn('[App] Prefetch del home no se pudo disparar:', err?.message);
    }
  }, [currentView]);

  // alertas-reales (2026-05-30): arranca el motor de alertas con CLIMA REAL.
  // Inicializa los listeners del store (escucha alertTriggered/alertCleared) y
  // arranca el alertEngine, que consulta el pronóstico Open-Meteo de la finca
  // (coords del perfil) y deriva alertas reales (helada/calor/lluvia/sequía/
  // viento) hacia el botón de alertas. Si no hay coords, degrada limpio sin
  // inventar nada. Los sensores IoT quedan en demo OFF (no hay hardware).
  // Se arranca una sola vez (singleton + guard de isPolling interno).
  useEffect(() => {
    try {
      useAlertStore.getState().initializeListeners();
      alertEngine.start().catch((err) => {
        console.warn('[App] alertEngine no pudo arrancar:', err?.message);
      });
      // Alertas del cultivo (plaga/etapa) desde los ciclos activos (FarmProcess)
      // hacia el mismo chip de alertas. Degrada limpio si no hay ciclos.
      import('./services/cropAlertEngine').then(({ cropAlertEngine }) => cropAlertEngine.start()).catch((err) => {
        console.warn('[App] cropAlertEngine no pudo arrancar:', err?.message);
      });
    } catch (err) {
      console.warn('[App] Error inicializando motor de alertas:', err?.message);
    }
    return () => {
      // No detenemos en cleanup de StrictMode doble-mount; el singleton ya
      // ignora start() duplicado. Solo paramos en unmount real de la app, que
      // en una SPA no ocurre — dejamos el polling vivo intencionalmente.
    };
  }, []);

  // NN4 fix 2026-05-23: pre-warm del modelo Ollama configurado se dispara al LOGIN
  // SUCCESS (LoginScreen → useOllamaWarmStore.startWarmup()), NO al
  // dashboard. Esto da ~15-30s de margen humano antes que el operador
  // llegue al agente, eliminando el cold-start 116s observado en
  // Playwright Q1 curuba 2026-05-23.
  //
  // Este useEffect es FALLBACK para el caso de re-mount sin login (ej.
  // tab refresh con sesión persistida en localStorage que arranca directo
  // al dashboard). Solo dispara si status==='unknown'. Si LoginScreen ya
  // disparó el warm-up (caso normal), el store devuelve early y no se
  // hace request duplicado. Si Ollama falla o tarda, el banner del agente
  // muestra "Preparando agente IA" hasta que warm-up complete.
  useEffect(() => {
    if (currentView !== 'dashboard') return;
    const { status, startWarmup } = useOllamaWarmStore.getState();
    if (status === 'unknown') {
      startWarmup();
    }
    // Hotfix prod-down 2026-06-02: pre-cargar el corpus RAG al llegar al
    // dashboard (fallback al pre-warm de LoginScreen/OAuthCallback, cubre el
    // refresh-con-sesión-persistida que arranca directo al dashboard sin
    // re-login). prewarmCorpus es idempotente: si el corpus ya está cacheado o
    // cargándose, no dispara trabajo extra. Fire-and-forget, no bloqueante.
    prewarmCorpus();

    // U-2 (crítico glaciar): PREFETCH del chunk lazy del módulo glaciar para
    // los usuarios de La Cordada, mientras hay señal en el dashboard. Sin esto,
    // si un guía instala la app y sube al glaciar SIN haber abierto el módulo
    // online, el chunk `/assets/GlaciarReporteScreen-*.js` nunca se cachea → el
    // SW responde 504 y el módulo NO abre en campo. Disparar el import() aquí
    // baja el chunk estando online; el handler cache-first de /assets/* del SW
    // lo guarda y sobrevive offline. Idempotente (el bundler cachea el módulo),
    // fire-and-forget, y solo para la whitelist (no malgasta datos del resto).
    if (tieneAccesoGlaciarActual()) {
      import('./components/GlaciarReporteScreen').catch(() => {
        // Sin señal / chunk no disponible aún: se reintentará en el próximo
        // arranque online. No rompemos el dashboard por un prefetch fallido.
      });
    }

    // PERF-1 (medido 2026-07): 'agente' es el destino MÁS común desde el
    // home (portada = AgentHero/FincaVivaHero, botón "Preguntale a Chagra").
    // Prefetch en idle para que, al tocarlo, el chunk (~220KB) ya esté en el
    // cache de módulos del navegador y la transición se sienta instantánea
    // en vez de esperar la descarga en el momento del tap. `requestIdleCallback`
    // (con timeout de red de seguridad) evita competir con el primer paint del
    // dashboard y con el prewarm del corpus RAG que arranca en el mismo idle
    // window (ver ragRetriever.scheduleIdlePrewarm) — encolamos DESPUÉS con un
    // timeout mayor para no sumar contención justo en esos primeros segundos.
    const scheduleAgentPrefetch = typeof requestIdleCallback === 'function'
      ? (fn) => requestIdleCallback(fn, { timeout: 6000 })
      : (fn) => setTimeout(fn, 1500);
    scheduleAgentPrefetch(() => {
      import('./components/AgentScreen/AgentScreen').catch(() => {
        // Sin señal: se reintentará solo cuando el usuario realmente navegue.
      });
    });
  }, [currentView]);

  // El fondo agroecológico de la app (catálogo biopunk, default "Páramo
  // completo" vía --app-bg-image) se aplica a TODA la app excepto login +
  // loading. Body className toggled según currentView. Estilos en
  // src/index.css clase .app-bg-biodiversidad (nombre histórico).
  useEffect(() => {
    const showBg = currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && !currentView.startsWith('mockup_');
    if (showBg) {
      document.body.classList.add('app-bg-biodiversidad');
    } else {
      document.body.classList.remove('app-bg-biodiversidad');
    }
    return () => document.body.classList.remove('app-bg-biodiversidad');
  }, [currentView]);

  // Selector de fondos 2026-05-28: el operador elige el fondo curado desde
  // Perfil. Suscribimos SOLO el id (string) — nunca un objeto inline — para
  // no disparar React #185. Escribimos la variable CSS --app-bg-image en el
  // body (la consume .app-bg-biodiversidad) y precargamos únicamente el
  // full seleccionado. Desde 2026-06-02 ya no existe el fondo "Clásico":
  // CUALQUIER id resuelve vía getBackgroundSrc a una foto biopunk real
  // (default universal "Cosecha mística"), así que siempre escribimos la
  // variable y NINGUNA pantalla cae al fondo viejo.
  const selectedBackground = useThemeBackgroundStore((s) => s.selected);
  useEffect(() => {
    const src = getBackgroundSrc(selectedBackground);
    // Precargar solo el full elegido para que el cambio sea inmediato.
    const img = new Image();
    img.src = src;
    document.body.style.setProperty('--app-bg-image', `url('${src}')`);
    // La foto de biodiversidad elegida debe VERSE en bio-punk en todas las
    // pantallas, incluso cuando coincide con el default (operador 2026-06-09:
    // "no se ve la imagen de fondo en biopunk que es donde se debe ver").
    // data-custom-bg neutraliza el lienzo CSS biopunk de themes.css y deja ganar
    // la foto. Nature y Minimalista conservan sus lienzos claros tipo papel vía
    // los selectores de tema (index.css fuerza background-image:none ahí).
    document.body.setAttribute('data-custom-bg', '1');
  }, [selectedBackground]);

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleLogout = useCallback(async () => {
    await logoutUser();
    navigate('login');
  }, [navigate]);

  // Sesión vencida (no zombi): apiService despacha 'chagra:session-expired'
  // cuando farmOS rechaza el token (401/403) y la renovación con refresh_token
  // tampoco da uno nuevo. ANTES esto sólo seteaba el hash '#login' (que el
  // router ignora) y el usuario quedaba en el dashboard sin datos → el
  // OnboardingHero "¿dónde está su finca?" se mostraba como si hubiera perdido
  // la finca (prod-down 2026-06-18). Ahora navegamos EXPLÍCITAMENTE a login con
  // un mensaje claro de re-login, distinguiendo "token vencido" de "sin finca
  // real". Logout limpio + guard: no re-disparar si ya estamos en login/loading.
  // Colocado tras showToast/handleLogout para que esas refs estén definidas
  // (const en TDZ si el effect se declarara antes).
  useEffect(() => {
    const handler = () => {
      if (currentView === 'login' || currentView === 'loading' || currentView === 'oauth-callback') {
        return;
      }
      logoutUser().catch(() => { /* tokens podrían persistir; getAccessToken igual da null */ });
      showToast('Sesión vencida. Vuelve a entrar.', true);
      navigate('login');
    };
    window.addEventListener('chagra:session-expired', handler);
    return () => window.removeEventListener('chagra:session-expired', handler);
  }, [currentView, navigate, showToast]);

  const renderView = () => {
    // Seguimiento de procesos de finca (ruta dinámica 'seguimiento_<key>':
    // reforestacion/silvopastoreo/paramo/cerdos). Tarjetas del home →
    // SeguimientoProcesoScreen. Se resuelve antes del switch porque es una
    // ruta paramétrica, no un literal.
    const seguimientoKey = parseSeguimientoView(currentView);
    if (seguimientoKey) {
      return (
        <ErrorBoundary>
          <ErrorFallback moduleName="Seguimiento">
            <SeguimientoProcesoScreen
              procesoKey={seguimientoKey}
              onBack={() => navigate('dashboard')}
              onSave={showToast}
            />
          </ErrorFallback>
        </ErrorBoundary>
      );
    }

    switch (currentView) {
      case 'loading':
        return <LoadingFallback view="loading" />;
      case 'login':
        return (
          <ErrorBoundary>
            <LoginScreen onLoginSuccess={() => navigate('dashboard')} onSave={showToast} />
          </ErrorBoundary>
        );
      case 'oauth-callback':
        // Puente del flujo Authorization Code + PKCE. Intercambia el code por
        // token y navega al dashboard; si falla, vuelve al login con toast.
        return (
          <ErrorBoundary>
            <OAuthCallback
              onSuccess={() => navigate('dashboard')}
              onError={(msg) => {
                showToast(msg || 'No se pudo iniciar sesión con PKCE.', true);
                navigate('login');
              }}
            />
          </ErrorBoundary>
        );
      case 'mockup_visual_lib':
        // Vitrina pública de la librería visual (`src/visual/`). Ruta
        // #/mockups/visual-lib, sin auth: recorre el registro consolidado y
        // dibuja cada primitivo aislado con sus variantes y props.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Librería visual">
              <VisualLib />
            </ErrorFallback>
          </ErrorBoundary>
        );
      // ── Galería de mockups aspiracionales (#/mockups/*) ────────────────────
      // Vistas full-screen de decisión visual, sin gate ni datos reales. onBack
      // devuelve al dashboard. Cada una degrada limpio dentro de su ErrorFallback.
      case 'mockup_entrada_3d':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El valle de mi finca (3D)">
              <EntradaValle3DMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_mundo3d_agua':
        // Vitrina pública del MUNDO DEL AGUA: monta <Mundo mundoId="agua"> del
        // framework (src/visual/mundo3d) con device-tiering real. Ruta
        // #/mockups/mundo3d-agua, sin auth. El recorrido del agua de la finca:
        // nacimiento → ronda → quebrada → cuidado → toma → huerta regada.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El mundo del agua">
              <Mundo3DAguaMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_mundo3d_suelo':
        // Vitrina pública del MUNDO DEL SUELO: monta <Mundo mundoId="suelo"> del
        // framework (src/visual/mundo3d) con device-tiering real. Ruta
        // #/mockups/mundo3d-suelo, sin auth. El corte del suelo vivo de la finca:
        // hojarasca → suelo negro → subsuelo, con raíces, micorrizas y bichos.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El mundo del suelo">
              <Mundo3DSueloMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_mundo3d_animales':
        // Vitrina pública del MUNDO DE LOS ANIMALES: monta <Mundo mundoId="animales">
        // del framework (src/visual/mundo3d, arquetipo recinto) con device-tiering
        // real. Ruta #/mockups/mundo3d-animales, sin auth. El corral y su ciclo
        // cerrado del abono: animal → estiércol → compost → suelo → planta → animal.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El mundo de los animales">
              <Mundo3DAnimalesMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_mundo3d_milpa':
        // Vitrina pública del MUNDO DE LA MILPA: monta <Mundo mundoId="milpa"> del
        // framework (src/visual/mundo3d) con device-tiering real. Ruta
        // #/mockups/mundo3d-milpa, sin auth. Las tres hermanas en corte: arriba la
        // asociación (maíz-fríjol-calabaza), abajo los nódulos de N del fríjol.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El mundo de la milpa">
              <Mundo3DMilpaMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_mundo3d_bosque':
        // Vitrina pública de la LADERA / PISOS TÉRMICOS: monta <Mundo mundoId="pisos">
        // del framework (src/visual/mundo3d) sobre el arquetipo `estratos`
        // reparametrizado, con device-tiering real. Ruta #/mockups/mundo3d-bosque,
        // sin auth. La ladera andina en corte: cálido → templado → frío → páramo,
        // con la señal sutil de que los pisos suben (termofilización), sin catástrofe.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="La ladera y sus pisos">
              <Mundo3DBosqueMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_mundo3d_clima':
        // Vitrina pública del MUNDO DEL CLIMA: monta <Mundo mundoId="clima"> del
        // framework (src/visual/mundo3d) con device-tiering real. Ruta
        // #/mockups/mundo3d-clima, sin auth. La bóveda del cielo de la finca:
        // hora del día + temporada bimodal andina + niebla del páramo + la
        // montaña de pisos con el hielo que se va (conciencia, no alarma).
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El mundo del clima">
              <Mundo3DClimaMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_voz_con_forma':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="La voz con forma">
              <VozConFormaMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_conversacion_voz':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="La conversación con la finca">
              <ConversacionVozMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_ensena_dibujando':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El agente enseña dibujando">
              <EnsenaDibujandoMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_dia_en_finca':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El día en su finca">
              <DiaEnFincaMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_salud_finca':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="La salud de mi finca">
              <SaludFincaMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_primer_cultivo':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El camino del primer cultivo">
              <PrimerCultivoMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_mercado':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Mercado de procedencia">
              <MercadoMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_onboarding_siembra':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Onboarding de siembra">
              <OnboardingSiembraMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_montana_mundos':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Montaña de los mundos">
              <MontanaMundosMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_montana_mundos_cine':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Montaña de los mundos (cine)">
              <MontanaMundosCineMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_montana_mundos_campesino':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Montaña de los mundos (campesina)">
              <MontanaMundosCampesinoMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_entrada_campesina':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Entrada campesina">
              <EntradaCampesinaMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_home_campesino':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Home campesino">
              <HomeCampesinoMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_boton_anarquia':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Botón anarquía">
              <BotonAnarquiaMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_avatar_biopunk':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Avatar biopunk">
              <AvatarGameBiopunk onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_avatar_verde_vivo':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Avatar verde vivo">
              <AvatarGameVerdeVivo onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_avatar_libre':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Avatar libre">
              <AvatarGameLibre onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_mapa_acuarela':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Mapa acuarela">
              <MapaAcuarelaMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_clima_atmosfera':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Clima y atmósfera">
              <ClimaAtmosferaMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_diagnostico_foto':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Diagnóstico sobre la foto">
              <DiagnosticoSobreFoto onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_evidencia_ilustrada':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Tarjetas de evidencia ilustradas">
              <EvidenciaIlustrada onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_guardianes':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Guardianes narrativos">
              <MockupGuardianesNarrativos onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_hoja_vida_mata':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Hoja de vida de la mata">
              <HojaVidaMataMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      // (anti-conflicto de merge) cases de mockup nuevos SIEMPRE al final del grupo:
      case 'mockup_mundo3d_sanidad':
        // Vitrina pública del MUNDO DE LA SANIDAD: monta <Mundo mundoId="sanidad">
        // del framework (src/visual/mundo3d) con device-tiering real. Ruta
        // #/mockups/mundo3d-sanidad, sin auth. La huerta-clínica: manejo de plagas
        // sin veneno — trampas cromáticas, biocontrol (Beauveria/Metarhizium),
        // borde push-pull y enemigos naturales (mariquita, carábido).
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El mundo de la sanidad">
              <Mundo3DSanidadMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_mundo3d_mercado':
        // Vitrina pública del MUNDO DEL MERCADO: monta <Mundo mundoId="mercado">
        // del framework (src/visual/mundo3d) con device-tiering real. Ruta
        // #/mockups/mundo3d-mercado, sin auth. El mercado campesino: la cadena
        // corta campo→mesa — puestos con toldo, canastos de la finca, el sello de
        // procedencia (terroir andino) y la balanza del precio justo.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El mundo del mercado">
              <Mundo3DMercadoMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_mundo3d_cafe':
        // Vitrina pública del MUNDO DEL CAFÉ: monta <Mundo mundoId="cafe"> del
        // framework (src/visual/mundo3d) con device-tiering real. Ruta
        // #/mockups/mundo3d-cafe, sin auth. El cafetal bajo sombra: café de
        // sombra (guamo/nogal), el grano cereza→pergamino→oro (sin tostar en la
        // finca), roya (Hemileia vastatrix) y broca (Hypothenemus hampei) con
        // manejo agroecológico, y el beneficio (despulpar, fermentar, secar).
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El mundo del café">
              <Mundo3DCafeMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_mundo3d_semillero':
        // Vitrina pública del MUNDO DEL SEMILLERO: monta <Mundo mundoId="semillero">
        // del framework (src/visual/mundo3d) con device-tiering real. Ruta
        // #/mockups/mundo3d-semillero, sin auth. El semillero/vivero: germinación
        // en bandeja (sustrato + humedad), repique a bolsa/era, endurecimiento al
        // sol, semilla propia vs comprada y el túnel de media-sombra que protege
        // del frío y la lluvia.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El mundo del semillero">
              <Mundo3DSemilleroMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_infraestructura_3d':
        // Vitrina pública de la LIBRERÍA DE INFRAESTRUCTURA 3D: la grilla de todas
        // las construcciones del catálogo (src/visual/mundo3d/infraestructura) con
        // device-tiering real. Ruta #/mockups/infraestructura-3d, sin auth.
        // Invernadero túnel/capilla, media-sombra, gallinero, galpón, establo,
        // bodega, compostera, tanque y secadero — cada una con sus medidas típicas
        // en metros, para agregar la infraestructura real de la finca a los mundos.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="La infraestructura de su finca">
              <Infraestructura3DMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_colocar_infraestructura':
        // Modo COLOCAR infraestructura: el paso que le sigue a la vitrina — el
        // usuario elige una construcción del catálogo, toca el terreno donde va
        // (snapping a la altura de la ladera), la gira en pasos de 45° y la
        // confirma; la lista {tipo, pos, rot} persiste en el equipo. En gama
        // baja cae a un plano 2D cenital con el mismo flujo. Ruta
        // #/mockups/colocar-infraestructura, sin auth.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Colocar su infraestructura">
              <ColocarInfraestructuraMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_vitrina_3d':
        // Vitrina/showcase de los componentes visuales nuevos que quedaron en
        // src/visual/ sin cablear (criaturas rubber-hose, micro-fauna del suelo,
        // ciclo de la mata, escarcha/valle, hilo de vida, onboarding descubrir).
        // Galería navegable con controles de tier/movimiento/estado para que el
        // operador los vea vivos y dé feedback. Ruta #/mockups/vitrina-3d, sin auth.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Vitrina de criaturas y mundos">
              <VitrinaCriaturasMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_vitrina_infra':
        // Vitrina JUGABLE de la librería de infraestructura: las piezas de
        // construcción del catálogo agrupadas por familia en pestañas, cada una
        // en su diorama 3D girable con control de tamaño, + el mini demo del
        // modo colocar (tocar la ladera, snapping a la altura del terreno,
        // girar 45° y fijar). Ruta #/mockups/vitrina-infra, sin auth.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Vitrina de infraestructura">
              <VitrinaInfraestructuraMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_vitrina_mundos':
        // Vitrina/galería de los MUNDOS 3D del valle: valle, café, sanidad,
        // mercado, animales, semillero y clima. Cada tarjeta previsualiza el
        // mundo en su diorama con el encuadre de cámara curado (camaraDioramas)
        // y un botón «Entrar» que lo abre a pantalla completa con el host real
        // <Mundo> (hotspots + abeja Angelita, caída digna a 2D). A lo sumo un
        // Canvas WebGL vivo a la vez. Ruta #/mockups/vitrina-mundos, sin auth.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Vitrina de mundos 3D">
              <VitrinaMundosMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_sierra_global':
        // Vista global 3D de la Sierra Nevada de Santa Marta: el macizo maestro
        // (Simmonds + Palomino, bandas de piso térmico, hora dorada). Territorio
        // sagrado tratado con dignidad — crédito a Kogui/Arhuaco/Wiwa/Kankuamo.
        // Ruta #/mockups/sierra-global, sin auth.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Vista global Sierra Nevada">
              <SierraGlobalMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_mundo_agua_3d':
        // El camino del agua 3D: recorre el agua de la finca — nacimiento
        // protegido, quebrada viva (caudal ecológico + aviso de residuos),
        // bocatoma y canal, reservorio + cosecha de lluvia, riego por goteo,
        // filtración al suelo (corte de perfil) y el ciclo cerrándose en la
        // nube. Ruta #/mockups/mundo-agua-3d, sin auth.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El camino del agua 3D">
              <MundoAguaMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_valle_noche_3d':
        // El valle de noche: variante nocturna mágica del valle — luna plata,
        // cielo estrellado andino que titila, luciérnagas del framework,
        // grillos sintetizados con WebAudio (0 KB, opt-in con botón) y
        // Angelita dormida en su flor. La finca en reposo, cálida y serena.
        // Ruta #/mockups/valle-noche-3d, sin auth.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El valle de noche">
              <ValleNoche3DMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_juego_la_milpa':
        // Mini-juego 2D "La milpa": las tres hermanas (maiz + frijol + ahuyama)
        // sembradas en el mismo monticulo. El jugador siembra/riega y ve la
        // sinergia del policultivo (el maiz da el palo, el frijol nutre la
        // tierra, la ahuyama guarda la humedad). Estetica Cuphead andina, SVG
        // puro, offline, curva amable sin gamificacion toxica. Ruta
        // #/mockups/juego-la-milpa, sin auth.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Juego La milpa">
              <JuegoLaMilpaMockup onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_mundo_paramo_3d':
        // El páramo altoandino: el ecosistema de la niebla en hora dorada —
        // frailejones (Espeletia), cojines de musgo, pajonal, quenuas con la
        // niebla enganchada, aves de páramo y el NACIMIENTO del agua. Didáctico
        // sobre conservación: el páramo como fábrica de agua (botón «cómo nace
        // el agua»). Ruta #/mockups/mundo-paramo-3d, sin auth.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El páramo altoandino">
              <MundoParamo3DMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mockup_artesania_andina_telar':
        // El lenguaje de forma "artesanía andina" en su capa 2D (SVG,
        // three-free): paleta, trazo, patrones de telar, banda chumbe, greca
        // escalonada, marco de tarjeta y siluetas de cerámica. Ruta
        // #/mockups/artesania-andina-telar, sin auth.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Artesanía andina">
              <ArtesaniaAndinaTelarMockup />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'onboarding-perfil':
        // Reescritura del onboarding (spec 2026-07-08): 19 preguntas → 3
        // pantallas (identidad · ubicación auto-mágica con vereda DANE ·
        // la finca). La ubicación se captura DENTRO del flujo (botón "Ubicar
        // mi finca" + corrección inline de vereda), así que al terminar va
        // directo al dashboard — ya no hay salto a 'ubicacion-detectada'.
        // El flujo viejo sigue cableado en 'onboarding-perfil-clasico'.
        return (
          <ErrorBoundary>
            <OnboardingCondensado
              onComplete={() => navigate(currentViewData?.next || 'dashboard')}
              onClose={() => navigate(currentViewData?.back || 'dashboard')}
              onExplorarEjemplo={async () => {
                // SKIP rico: sembrar la finca de ejemplo (multi-piso, grounded al
                // catálogo) y entrar directo al home ya poblado. Import perezoso.
                try {
                  const { seedExampleFinca } = await import('./services/demoFincaEjemplo');
                  await seedExampleFinca();
                } catch (err) {
                  console.error('[App] No se pudo sembrar la finca de ejemplo:', err);
                }
                navigate('dashboard');
              }}
            />
          </ErrorBoundary>
        );
      case 'onboarding-perfil-clasico':
        // #200: el onboarding extendido ORIGINAL (hasta 25 preguntas
        // condicionales). Se conserva cableado (features no huérfanas) como
        // camino largo/diagnóstico mientras el operador valida el condensado.
        return (
          <ErrorBoundary>
            <OnboardingProfile
              onComplete={() => navigate('ubicacion-detectada', { next: 'dashboard' })}
              onClose={() => navigate(currentViewData?.back || 'dashboard')}
              onExplorarEjemplo={async () => {
                try {
                  const { seedExampleFinca } = await import('./services/demoFincaEjemplo');
                  await seedExampleFinca();
                } catch (err) {
                  console.error('[App] No se pudo sembrar la finca de ejemplo:', err);
                }
                navigate('dashboard');
              }}
            />
          </ErrorBoundary>
        );
      case 'ubicacion-detectada':
        // #201: pantalla "ubicación detectada" con mini mapa + piso térmico.
        // Acepta coords/altitud/municipio iniciales vía currentViewData.
        return (
          <ErrorBoundary>
            <LocationDetectedScreen
              coords={currentViewData?.coords || null}
              altitud={currentViewData?.altitud ?? null}
              initialMunicipio={currentViewData?.municipio || ''}
              onConfirm={() => navigate(currentViewData?.next || 'dashboard')}
              onBack={() => navigate(currentViewData?.back || 'dashboard')}
            />
          </ErrorBoundary>
        );
      case 'dashboard':
        return (
          <ErrorBoundary>
            <DashboardLiveView onNavigate={navigate} onLogout={handleLogout} lastLogMessage={lastLogMessage} />
          </ErrorBoundary>
        );
      case 'hoy_finca':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Hoy en Finca">
              <HoyEnFincaScreen
                onBack={() => navigate('dashboard')}
                onHome={() => navigate('dashboard')}
                onNavigate={navigate}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'evolucion':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Evolucion">
              <MiFincaEvolucionScreen
                onBack={() => navigate('hoy_finca')}
                onHome={() => navigate('dashboard')}
                onNavigate={navigate}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'juego':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Juego">
              <MiFincaVivaScreen
                onBack={() => navigate('hoy_finca')}
                onHome={() => navigate('dashboard')}
                onNavigate={navigate}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'defensores':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Defensores de la Finca">
              <DefensoresFincaScreen
                onBack={() => navigate('juego')}
                onHome={() => navigate('dashboard')}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'milpa':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="La Milpa">
              <MilpaSimulator
                onBack={() => navigate('juego')}
                onHome={() => navigate('dashboard')}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'doom_finca':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Doom de la Finca">
              <DoomFincaScreen
                onBack={() => navigate('juego')}
                onHome={() => navigate('dashboard')}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'subsuelo':
        // Sub-mundo del juego (huérfano del ux-audit P1-1): la entrada vive en
        // MiFincaVivaScreen (irAccion('subsuelo')) pero faltaba el case → caía en
        // "Vista no disponible". MundoSubsuelo no acepta props de navegación; lo
        // envolvemos en ScreenShell (como 'biopreparados') para dar Volver/Inicio.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Mundo Subsuelo">
              <ScreenShell title="Mundo Subsuelo" onBack={() => navigate('juego')} onHome={() => navigate('dashboard')}>
                <MundoSubsuelo />
              </ScreenShell>
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'espiritu_pro':
        return (
          <ErrorBoundary>
            <EspirituProScreen onBack={() => navigate('dashboard')} />
          </ErrorBoundary>
        );
      case 'sembrar':
        return (
          <ErrorBoundary>
            <SeedingLog onBack={() => navigate('dashboard')} onSave={showToast} initialData={currentViewData} />
          </ErrorBoundary>
        );
      case 'cosechar':
        return (
          <ErrorBoundary>
            <HarvestLog onBack={() => navigate('dashboard')} onSave={showToast} />
          </ErrorBoundary>
        );
      case 'mi_cosecha':
        // Tablero de producción/rendimiento (ver lazy import arriba). Entra
        // desde el mundo Cultivos y semillas (junto a 'cosechar').
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Mi cosecha">
              <MiCosechaScreen
                onBack={() => navigate('dashboard')}
                onHome={() => navigate('dashboard')}
                onNavigate={navigate}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'insumos':
        return (
          <ErrorBoundary>
            <InputLog onBack={() => navigate('dashboard')} onSave={showToast} />
          </ErrorBoundary>
        );
      case 'biopreparados':
        // Fichas photo-forward de biopreparados (caldos, purines, biofermentos,
        // extractos): para qué sirve, ingredientes con medidas caseras, paso a
        // paso, tiempo de fermentación, dosis y precauciones (EPP, vetos,
        // reingreso). Todo grounded en catalog/biopreparados-seed.json — cero
        // dosis inventada. Reemplaza la galería de solo-diagramas que vivía aquí
        // (la galería sigue accesible desde la Bodega/InventoryDashboard).
        // El botón Volver respeta de dónde se vino: por defecto al juego
        // (back-compat de la misión "Prepárale comida natural"); desde la home
        // viva de Sanidad, al dashboard (currentViewData.back).
        return (
          <ErrorBoundary>
            <BiopreparadosScreen
              onBack={() => navigate(currentViewData?.back || 'juego')}
              onHome={() => navigate('dashboard')}
              onNavigate={navigate}
            />
          </ErrorBoundary>
        );
      case 'plant_asset':
        // Feedback piloto #113, desaparece el form plano. Redirige al rich form de
        // AssetsDashboard tab=plant que ya tiene SpeciesSelect, GuildSuggestions
        // y autofill estrato/gremio/producción (mismo modelo que el flujo voz).
        return (
          <ErrorBoundary>
            <AssetsDashboard onBack={() => navigate('dashboard')} initialTab="plant" initialShowForm />
          </ErrorBoundary>
        );
      case 'observacion':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Observacion">
              <ObservationScreen onBack={() => navigate('dashboard')} onSave={showToast} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'reportar_invasora':
        return (
          <ErrorBoundary>
            <InvasiveObservationLog
              onBack={() => navigate('dashboard')}
              onSave={showToast}
              initialLocationId={currentViewData?.locationId}
              initialWkt={currentViewData?.wkt}
            />
          </ErrorBoundary>
        );
      case 'sanidad_sintoma':
        // Mini-app insignia "Sanidad de la mata": el campesino dice el síntoma
        // folk → la app desambigua (cultivo/detalle) → causa + manejo
        // agroecológico. Vuelve al mundo Sanidad.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Sanidad de la mata">
              <SanidadSintomaScreen
                onBack={() => navigate('mundo', { mundo: 'sanidad' })}
                onHome={() => navigate('dashboard')}
                onNavigate={navigate}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mantenimiento':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Mantenimiento">
              <MaintenanceScreen onBack={() => navigate('dashboard')} onSave={showToast} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'task_log':
        return (
          <ErrorBoundary>
            <TaskLogScreen onBack={() => navigate('dashboard')} onNewTask={() => navigate('new_task')} />
          </ErrorBoundary>
        );
      case 'new_task':
        return (
          <ErrorBoundary>
            <TaskScreen onBack={() => navigate('task_log')} onSave={showToast} />
          </ErrorBoundary>
        );
      case 'edit_task':
        return (
          <ErrorBoundary>
            <TaskScreen onBack={() => navigate('task_log')} onSave={showToast} initialData={currentViewData?.task || currentViewData} />
          </ErrorBoundary>
        );
      case 'javier':
        return (
          <ErrorBoundary>
            <ScreenShell title={`Campo, ${PRIMARY_WORKER_NAME}`} icon={Eye} onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')}>
              <WorkerDashboard />
            </ScreenShell>
          </ErrorBoundary>
        );
      case 'usage_stats':
        return (
          <ErrorBoundary>
            <UsageStatsDashboard onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')} />
          </ErrorBoundary>
        );
      case 'mapa':
        // #mapa renderiza el MAPA real (Leaflet, FarmMap). VERIFICADO 2026-06-24:
        // NO colapsa a la vista Activos. Si no hay activos georreferenciados,
        // FarmMap sigue mostrando el mapa de la finca (centrado por defecto) con
        // un aviso honesto "Sin activos georreferenciados aún." encima — no es un
        // fallback ni una redirección. El único salto a 'activos' es el
        // drill-down al TOCAR un activo del mapa (onAssetClick). La premisa de
        // "colapso a Activos" era un hallazgo de auditoría stale.
        // Ref: CAPABILITIES_STATUS.md §1/§7.4.
        return (
          <ErrorBoundary>
            <ScreenShell title="Mapa de la Finca" icon={MapPin} onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')}>
              <FarmMap onAssetClick={(id) => {
                useAssetStore.getState().setSelectedAsset(id);
                navigate('activos');
              }} />
            </ScreenShell>
          </ErrorBoundary>
        );
      case 'gestionar': // alias usado por el FAQ ("Gestionar mi finca") — sin este label caía en default "Vista no disponible"
      case 'activos':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Mi Finca">
              <AssetsDashboard onBack={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'bodega':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Insumos">
              <ScreenShell
                title="Bodega"
                icon={Package}
                onBack={() => navigate('dashboard')}
                onHome={() => navigate('dashboard')}
                actions={
                  <button
                    type="button"
                    onClick={() => navigate('auditoria_inventario')}
                    data-testid="bodega-open-auditoria"
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Scale className="w-3.5 h-3.5" /> Auditoría
                  </button>
                }
              >
                <InventoryDashboard />
              </ScreenShell>
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'auditoria_inventario':
        // Capa de auditoría/reconciliación de inventario (descubribilidad
        // 2026-06-30): antes InventoryPage no estaba ruteado y
        // InventoryAuditDashboard/InventoryEventTimeline/InventoryAuditTrail
        // (+ inventoryReconcile.js/inventoryEvents.js) quedaban huérfanos (0
        // importers). InventoryPage orquesta los 3 componentes; se alcanza
        // desde 'bodega' (botón "Auditoría") o por hash directo.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Auditoría de Inventario">
              <ScreenShell
                title="Auditoría de Inventario"
                icon={Scale}
                onBack={() => navigate('bodega')}
                onHome={() => navigate('dashboard')}
              >
                <InventoryPage />
              </ScreenShell>
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'informes':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Informes">
              <InformesScreen onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      // 'historial' y 'bitacora' son ALIAS de la misma pantalla (WorkerHistory).
      // Antes solo existía 'historial': AnalisisProactivoIA navegaba a 'bitacora'
      // (chip "Tareas") y caía en "Vista no disponible". Ahora ambas entradas
      // llegan a la Bitácora viva. Fix bitácora rota (tarea #22).
      case 'historial':
      case 'bitacora':
        return (
          <ErrorBoundary>
            <WorkerHistory onBack={() => navigate('dashboard')} onEntryClick={(entry) => navigate('bitacora_detail', { entry })} />
          </ErrorBoundary>
        );
      case 'bitacora_detail':
        return (
          <ErrorBoundary>
            <BitacoraEntryDetail entry={currentViewData?.entry || currentViewData} onBack={() => navigate('historial')} onEdit={(entry) => navigate('edit_task', { task: entry })} />
          </ErrorBoundary>
        );
      case 'biodiversidad':
        return (
          <ErrorBoundary>
            <BiodiversidadView onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')} />
          </ErrorBoundary>
        );
      case 'fermentos':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Fermentos">
              <ScreenShell title="Fermentos" icon={Beaker} onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')}>
                <FermentosView />
              </ScreenShell>
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'animales':
        // Módulo ANIMALES de la finca integrada. Sub-botones: Cerdos (reutiliza
        // el seguimiento porcino existente, ruta 'seguimiento_cerdos'), Gallinas
        // y Abejas (pantallas nuevas). Eje central: el ciclo cerrado
        // (animal → estiércol → biopreparado → suelo → planta) + polinización.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Animales">
              <AnimalesScreen
                onBack={() => navigate('dashboard')}
                onHome={() => navigate('dashboard')}
                onNavigate={navigate}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'animales_gallinas':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Gallinas">
              <GallinasScreen onBack={() => navigate('animales')} onHome={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'animales_abejas':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Abejas">
              <AbejasScreen onBack={() => navigate('animales')} onHome={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'animales_vacas':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Vacas">
              {/* onNavigate: VacasScreen enlaza al proceso de seguimiento de
                  silvopastoreo existente ('seguimiento_silvopastoreo'). */}
              <VacasScreen onBack={() => navigate('animales')} onHome={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'animales_conejos':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Conejos">
              {/* onNavigate: ConejosScreen salta al mundo del abono ('estiercol')
                  para cerrar el ciclo con la conejaza. */}
              <ConejosScreen onBack={() => navigate('animales')} onHome={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'animales_caprinos':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Cabras y ovejas">
              {/* onNavigate: CaprinosScreen salta al mundo del abono ('estiercol')
                  para cerrar el ciclo con la majada. */}
              <CaprinosScreen onBack={() => navigate('animales')} onHome={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'estiercol':
        // Módulo "Del corral al abono": aprovechamiento del estiércol
        // (olores/gallinaza, biodigestor con calculadora de dimensionamiento y
        // abonos: gallinaza/porquinaza/bovinaza/biol/biosol/compost/
        // lombricompost). Calculadora determinista (biodigestorCalculator.js);
        // dosis/rendimientos exactos quedan en slots grounded-pendiente hasta la
        // investigación (nacional + internacional). Ruta #estiercol / #biodigestor.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Del corral al abono">
              <EstiercolScreen onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'compost':
        // "El compost, paso a paso" — hermana photo-forward de AguaScreen dentro
        // del mundo Estiércol y compost. Lleva por la receta (recolección →
        // mezcla C:N → volteo → madurez → aplicación) con fotos CC reales.
        // El back regresa al hub del mundo (abono), no al dashboard, porque se
        // llega desde ahí. Ruta #compost.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El compost, paso a paso">
              <CompostScreen
                onBack={() => navigate('mundo', { mundo: 'abono' })}
                onHome={() => navigate('dashboard')}
                onNavigate={navigate}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'asociaciones':
        return (
          <ErrorBoundary>
            <ScreenShell title="Asociaciones" icon={Network} onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')}>
              <Asociaciones profile={getProfile()} esOperador={esOperadorActual()} />
            </ScreenShell>
          </ErrorBoundary>
        );
      case 'voz':
        return (
          <ErrorBoundary>
            <ScreenShell title="Registro por voz" icon={Mic} onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')}>
              <VoiceCapture onSave={showToast} />
            </ScreenShell>
          </ErrorBoundary>
        );
      case 'voz_planta':
        // Módulo UNIFICADO de voz (entrada desde la mano Ⓐ): agrega una planta
        // por voz y muestra su ciclo genealógico + bioinsumos + ciclos
        // asociados + companions/antagonistas en una sola pantalla.
        return (
          <ErrorBoundary>
            <PlantaPorVozScreen onBack={() => navigate('dashboard')} onSave={showToast} />
          </ErrorBoundary>
        );
      case 'procesos':
        return (
          <ErrorBoundary>
            <ProcesosPorVozScreen onBack={() => navigate('dashboard')} onSave={showToast} />
          </ErrorBoundary>
        );
      case 'registro_voz':
        // BOTÓN ÚNICO DE VOZ (#23): entrada principal voz-first que clasifica
        // la intención entre TODOS los tipos y extrae los campos. Es el
        // "guardar lo que hago" de la mano radial (reemplaza "procesos por voz").
        return (
          <ErrorBoundary>
            <RegistroVozScreen onBack={() => navigate('dashboard')} onSave={showToast} />
          </ErrorBoundary>
        );
      case 'registro_unificado':
        // PUERTA ÚNICA "Registrar" (#23, registro unificado): una sola entrada
        // visible que reemplaza las ~5 sueltas (Cosechar/Insumos/Labores/
        // Semilleros/Bitácora). Voz primero + respaldo manual adaptativo; ambos
        // escriben con buildVoicePayload → savePayload (mismo contrato probado).
        // Gateada en el dashboard tras registroUnificadoActivo() (flag dev-only).
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Registrar">
              <RegistroUnificadoScreen onBack={() => navigate('dashboard')} onSave={showToast} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'ciclo':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Ciclo de Cultivo">
              <CicloCultivoScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'germinacion':
        // Módulo GERMINACIÓN: guía de la prueba casera (papel/algodón húmedo) +
        // registro con cálculo del % de germinación e historial local. Enlaza
        // con el ciclo (sembrar tras probar la semilla). Días de referencia
        // tomados de las plantillas fenológicas reales — nunca inventados.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Germinacion">
              <GerminacionScreen
                onBack={() => navigate('dashboard')}
                onHome={() => navigate('dashboard')}
                onNavigate={navigate}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'ciclo_nutrientes':
        // Módulo CICLO DE NUTRIENTES: hace visible el ciclo cerrado de la finca
        // (animal → estiércol → biopreparado → plan de alimentación de las
        // plantas). Asociaciones groundeadas en catalog/biopreparados-seed.json
        // y feedingPlanGeneric.js. Deja claro qué SÍ reemplaza el abono propio y
        // qué NO (cal dolomítica y roca fosfórica son minerales externos).
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Ciclo de Nutrientes">
              <CicloNutrientesScreen
                onBack={() => navigate('dashboard')}
                onHome={() => navigate('dashboard')}
                onNavigate={navigate}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'calendario': // alias usado por Manual/FAQ (HASH_VIEW_ROUTES ya lo mapea para hash, pero navigate() no normaliza — sin este label caía en default "Vista no disponible")
      case 'calendario_finca':
        // Módulo CALENDARIO DE FINCA: UN SOLO calendario que UNIFICA por planta
        // (ciclos de la finca, o especies del catálogo si no hay finca) las
        // fases y tareas que viven dispersas: fenología (phenologyCalculator),
        // nutrición (feedingPlanGeneric / feeding_plan del catálogo), siembra,
        // cosecha, sanidad por etapa (climateCycleService) y ciclo perenne
        // (perennialCalculator). Todo groundeado (farmCalendarService) — sin
        // inventar fechas; deflexión honesta cuando no hay datos.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Calendario de Finca">
              <CalendarioFincaScreen
                onBack={() => navigate('dashboard')}
                onHome={() => navigate('dashboard')}
                onNavigate={navigate}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'ano_finca':
        // Módulo EL AÑO DE LA FINCA: la línea de tiempo del año del usuario —
        // qué sembró, cosechó, trabajó y floreció (registros reales: ciclos,
        // log--harvest, eventos) y lo que viene (calendario groundeado por su
        // altitud). Complementa al calendario_finca (agenda por planta/capa) y
        // al almanaque (el año a lo grande): esta es la vista TEMPORAL de SU
        // finca. cosechaService es SOLO LECTURA aquí ("Mi cosecha" es dueña
        // del tablero de cantidades).
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El año de la finca">
              <AnoFincaScreen
                onBack={() => navigate('dashboard')}
                onHome={() => navigate('dashboard')}
                onNavigate={navigate}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'suelo':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Diagnostico de Suelo">
              <SoilDiagnosticScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'salud_suelo':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Salud del Suelo">
              <SaludSueloScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'semilla':
        // Mini-app "Semilla" (soberanía de semilla): seleccionar / guardar /
        // germinar, con calculadoras deterministas (semillaCalculator.js).
        // Ruta #semilla / #soberania-semilla. Vive en el mundo Cultivos.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Semilla">
              <SemillaScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'poscosecha':
        // Módulo "Poscosecha y Despensa" (mundo Mercado y despensa): 3 pilares
        // (cosechar en punto / guardar bien / transformar) + calculadora
        // determinista de secado de grano. Cifras grounded al DR; slots no
        // cerrados marcados grounded-pendiente en poscosechaCalculator.js.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Poscosecha y Despensa">
              <PoscosechaScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'almacenamiento':
        // Módulo "Almacenamiento y Conservación de Alimentos" (mundo Mercado y
        // despensa): EXTIENDE/absorbe la poscosecha, enfocado en guardar a
        // mediano/largo plazo. 4 pilares (almacenar / conservar con guard de
        // botulismo / plagas de almacén / micotoxinas) + calculadoras
        // deterministas de pérdida evitada y capacidad + rotación PEPS. Fotos CC
        // con crédito visible. Cifras grounded al DR TRIPLE.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Almacenamiento y Conservación">
              <AlmacenamientoScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'platano':
        // Módulo "Plátano y banano" (mundo Cultivos y semillas): el pancoger
        // clave del campesino, foto-forward. 4 pilares (variedades y la mata
        // madre-hijo-nieto / siembra y compañía con calculadora de densidad /
        // sigatoka y picudo con manejo agroecológico / cosecha y aprovechamiento
        // del pseudotallo). Grounded al catálogo/grafo; fotos CC con crédito.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Plátano y banano">
              <PlatanoBananoScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'nutricion':
        // Módulo "La comida que alimenta" (mundo Mercado y despensa): aporte
        // nutricional por cultivo (energía/proteína/hierro/vitamina A por 100 g)
        // del ICBF (TCAC 2015). Datos exportados del grafo chagra_kg a
        // public/nutricion-humana.json; null explícito donde el ICBF no reporta.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="La comida que alimenta">
              <NutricionHumanaScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'cacao':
        // Mundo "El cacao" (dentro de Cultivos y semillas): cultivo bandera de la
        // paz. 5 estaciones photo-forward — árbol/clones, sombra (SAF), siembra/
        // injerto + poda, monilia y escoba de bruja (manejo cultural, sin dosis
        // inventadas), cosecha + beneficio (fermentación/secado) y cáscara→abono
        // (enlaza al mundo del compost). Groundeado a catálogo/grafo + FEDECACAO/
        // AGROSAVIA/ICA. Fotos CC reales con crédito visible.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El cacao">
              <CacaoScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'hortalizas':
        // Módulo "Hortalizas de la huerta" (mundo Cultivos y semillas): la comida
        // diaria de la casa. Ficha de cultivo por hortaliza (siembra, luz/agua/piso
        // térmico, vecinas, plagas con manejo agroecológico, cosecha y
        // conservación). Vecinas + plagas grounded al grafo chagra_kg
        // (public/grafo-relations.json); días a cosecha de las plantillas de
        // fenología; cero dosis químicas; "dato en camino" donde el grafo aún no
        // respalda. Fotos CC con crédito visible.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Hortalizas de la huerta">
              <HortalizasScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'tuberculos':
        // Módulo "Tubérculos y raíces" (mundo Cultivos y semillas): el pancoger de
        // raíz. Ficha de cultivo por tubérculo (siembra tubérculo-semilla/esqueje/
        // colino, luz/agua/piso térmico, aporque, vecinas, plagas con manejo
        // agroecológico, cosecha y conservación/curado). Vecinas + plagas grounded
        // al grafo chagra_kg (public/grafo-relations.json); cero dosis químicas;
        // "dato en camino" donde el grafo aún no respalda. Fotos CC con crédito.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Tubérculos y raíces">
              <TuberculosScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'cromatografia':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Cromatografia de Suelo">
              <CromatografiaScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'agua':
        // Módulo "Agua de la finca" (3 pilares: cosechar lluvia / regar con
        // medida / cuidar el agua + nacimiento). Cifras duras pendientes de
        // grounding se muestran como "dato en camino" (src/data/aguaFinca.js).
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Agua de la finca">
              <AguaScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'aromaticas':
        // Mundo "Aromáticas y condimentarias" (dentro de Cultivos y semillas):
        // la huerta de la cocina campesina, 8 hierbas photo-forward. El cultivo
        // va groundeado en el catálogo (altitud, piso térmico, sol/agua,
        // propagación); la cocina es campesina, sin claims medicinales.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Aromáticas y condimentarias">
              <AromaticasScreen onBack={() => navigate('mundo_cultivos')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'almanaque':
        // Vista HERMANA de calendario_finca (no la duplica): el "Almanaque de la
        // finca" enseña el año campesino a lo grande — aguas y secas, qué da cada
        // piso térmico (ventanas de cosecha grounded en perennialCycles) y el
        // saber lunar tradicional (cultura, no receta). Photo-forward reusando
        // fotos CC ya en /public; enlaza al calendario grounded de detalle.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Almanaque de la finca">
              <AlmanaqueScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'cafe':
        // Mundo "El café" (5 estaciones: variedad+siembra / sombra+suelo /
        // broca+roya / flor+cosecha / beneficio). Photo-forward con fotos CC y
        // groundeado en el grafo (coffea_arabica) + Cenicafé; sin dosis
        // químicas inventadas (cifras de sitio = "dato en camino").
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El café">
              <CafeScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'uchuva':
        // Mundo "La uchuva" (Physalis peruviana, dentro de Cultivos y semillas):
        // la fruta andina de exportación, de clima FRÍO de altura. 6 estaciones
        // photo-forward (clima+altura / siembra / tutorado+poda / plagas sin
        // veneno / cosecha por el color del capacho / poscosecha de exportación).
        // Groundeado al grafo (physalis_peruviana) + cycle-content Tier A
        // (AGROSAVIA/ICA/POWO/GBIF); cifras de sitio = "dato en camino".
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="La uchuva">
              <UchuvaScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'botica':
        // Mundo "La botica campesina" (5 estaciones: barriga y nervios / piel y
        // heridas / gripa y tónico / cultivar la botica / con cuidado). La huerta
        // MEDICINAL de la finca andina, photo-forward con fotos CC. Dominio de
        // salud: todo enmarcado como USO TRADICIONAL (saber popular), sin claims
        // de cura ni dosis; cultivo groundeado en el catálogo Chagra. Vetos
        // honestos (ruda abortiva/fototóxica) + disclaimer "consulte al médico".
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="La botica campesina">
              <BoticaScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'frutales':
        // Mundo "Frutales de la finca con vida": ficha de cultivo por frutal
        // (propagación/injerto, siembra y distancias, piso térmico, plagas y
        // enfermedades, poda, cosecha y poscosecha). Photo-forward con fotos CC
        // y groundeado en el grafo (pest_controllers → AFFECTS/CONTROLS) +
        // perennialCycles (AGROSAVIA); sin dosis químicas (cifras de sitio =
        // "dato en camino"). Vive dentro del mundo Cultivos.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Frutales de la finca">
              <FrutalesScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'aguacate':
        // Mundo "El aguacate": profundización dedicada del cultivo bandera de
        // alto valor (Hass y criollos de montaña). 5 estaciones photo-forward
        // (variedad+siembra / suelo+agua / plagas / flor+polinización A/B /
        // cosecha). Groundeado en el grafo (persea_americana: pest_controllers,
        // compatible_with, antagonist_of, biopreparados) + perennialCycles
        // (AGROSAVIA); sin dosis químicas (cifras de sitio = "dato en camino").
        // Convive con la ficha de aguacate del mundo Frutales (no la duplica).
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El aguacate">
              <AguacateScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'citricos':
        // Mundo "Los cítricos": profundización DEDICADA del frutal cítrico
        // (naranja, mandarina, limón y lima) en 5 estaciones photo-forward
        // (variedades+injerto / piso térmico / siembra+poda / plagas+HLB /
        // abono+cosecha). Refuerza el grounding térmico correcto: cítrico de
        // clima cálido-templado (0–1800 msnm; Tahití ~2100), NO de frío alto.
        // Groundeado en el grafo (citrus_* + pest_controllers → AFFECTS/CONTROLS)
        // + AGROSAVIA/ICA; sin dosis inventadas (cifras de sitio = "dato en
        // camino"); la gomosis (ausente del grafo) se declara faltante, no se inventa.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Los cítricos">
              <CitricosScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'cana':
        // Mundo "La caña y la panela" (5 estaciones: la caña / siembra y manejo /
        // plagas / corte / la panela). Photo-forward con fotos CC y groundeado en
        // el grafo (Diatraea AFFECTS caña; Cotesia/Trichogramma CONTROLS Diatraea) +
        // Cenicaña/AGROSAVIA/FEDEPANELA/INVIMA; panela SIN clarol ni químicos y sin
        // dosis inventadas (cifras de sitio = "dato en camino").
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="La caña y la panela">
              <CanaScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mango':
        // Mundo "El mango" (5 estaciones: variedad+siembra / piso térmico+agua /
        // floración+cuaje / plagas / cosecha+despensa). Profundización dedicada
        // del mango, photo-forward con fotos CC y groundeado en el grafo
        // (mangifera_indica: antracnosis/Anastrepha vía pest_controllers,
        // compatible_with) + perennialCycles (AGROSAVIA). Honestidad térmica:
        // tierra cálida (<1200 msnm) sí, por encima de ~1800 NO va. Sin dosis
        // químicas inventadas (cifras de sitio = "dato en camino").
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El mango">
              <MangoScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'restauracion':
        // Mundo "Restauración y bosque de alimentos" (dentro de "Diseño de la
        // finca"): COMPLEMENTA reforestación/silvopastoreo/páramo con el enfoque
        // food-forest — los 7 estratos, la sucesión ecológica y la restauración
        // del suelo, como MÉTODO. 5 estaciones photo-forward (fotos CC reusadas de
        // otros mundos, 0 KB de aporte). GROUNDING RESPONSABLE: toda especie es un
        // id real de public/grafo-relations.json (el test de grounding lo verifica);
        // nada de especies inventadas; cifras de sitio = "dato en camino".
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Restauración y bosque de alimentos">
              <RestauracionScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'quinua':
        // Mundo "Quinua y granos andinos" (dentro de Cultivos y semillas):
        // recuperación de granos ancestrales alto-andinos. 5 estaciones photo-
        // forward — los granos (quinua/amaranto/chía/cañihua/tarwi) y su valor /
        // siembra y piso térmico / el desaponificado de la quinua (lavar el
        // amargo, paso clave) + desamargado del tarwi / mildiú (Peronospora
        // variabilis) con manejo agroecológico sin dosis químicas / cosecha,
        // trilla y valor nutricional (proteína completa, sin gluten, hierro).
        // Groundeado en cycle-content + nutricion-humana ICBF; cifras de sitio =
        // "dato en camino". Fotos CC reales con crédito visible.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Quinua y granos andinos">
              <QuinuaScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'fique':
        // Mundo "El fique y las fibras" (5 estaciones: la planta y la ladera /
        // cría y manejo / el desfibrado / usos y cultura / bagazo y jugo).
        // Photo-forward con fotos CC y groundeado en el catálogo Chagra
        // (furcraea_andina.json) + Agrosavia; sin dosis ni plagas inventadas
        // (lo que el grafo aún no tiene = "dato en camino"). Vive dentro del
        // mundo Cultivos; su back vuelve al hub de cultivos.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El fique y las fibras">
              <FiqueScreen onBack={() => navigate('mundo_cultivos')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'milpa_cultivo':
        // Módulo "La milpa: maíz, fríjol y calabaza" (las tres hermanas): la
        // asociación ancestral groundeada en el grafo (COMPATIBLE_WITH /
        // CONTROLS) y en las fichas de ciclo (src/data/milpaFinca.js). Sin dosis
        // químicas; cifras sin fuente van como "dato en camino". Vive dentro del
        // mundo Cultivos. NB: la vista 'milpa' (sin sufijo) es el juego
        // MilpaSimulator — por eso esta usa 'milpa_cultivo'.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="La milpa: maíz, fríjol y calabaza">
              <MilpaScreen onBack={() => navigate('mundo_cultivos')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'clima_boletin':
        // "El clima que viene" (mundo Clima): TRADUCTOR de los boletines
        // IDEAM/ENSO. 3 pilares — qué viene (fase ENSO viva de ensoService) /
        // qué hacer (regla accionable por fase) / dónde mirar (MTA + Fenalce).
        // No pronostica: lee la fase real y remite al boletín vigente.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El clima que viene">
              <ClimaBoletinScreen onBack={() => navigate('mundo', { mundo: 'clima' })} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'valle3d':
        // EL VALLE 3D DESDE EL HOME (FASE 0 del plan game-dev): la MISMA
        // EntradaValle3D de la vitrina (#/mockups/entrada-3d) montada como
        // vista REAL de la app, con `onNavigate`: las puertas de los mundos
        // abren las pantallas de verdad (regla de oro: re-rutear, nunca
        // reimplementar). Se llega por la banda de MundosDeMiFinca, gated por
        // el flag de prefs `valle3d` (default OFF, Perfil) + device-tier;
        // adentro el tiering decide 3D pleno/frugal o el valle 2D digno.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El valle de su finca (3D)">
              <EntradaValle3DMockup onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mundo':
        // LOS MUNDOS DE MI FINCA (reestructuración 2.0 del home, V4): la
        // pantalla de un mundo agrupa sus funciones y RE-RUTEA a las vistas
        // reales existentes. data = { mundo: id } (mundosFinca.js); sin data o
        // con id desconocido muestra el índice de mundos (fallback honesto).
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Mundos de la finca">
              <MundoScreen
                mundoId={currentViewData?.mundo}
                onBack={() => navigate('dashboard')}
                onNavigate={navigate}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mundo_cultivos':
        // Portada a medida del mundo CULTIVOS Y SEMILLAS (hub): orienta por
        // región/clima, agrupa las funciones existentes y suma la calculadora
        // de grados-día. Cada lámina RE-RUTEA a su pantalla real vía navigate.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Cultivos y semillas">
              <MundoCultivosHub
                onBack={() => navigate('dashboard')}
                onNavigate={navigate}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'ciclo_vivo':
        // "El Ciclo Vivo": la rueda de las 7 fases. Cada chip de función se
        // pinta según su estado real en la fuente de verdad (chagra-stats.json).
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="El Ciclo Vivo">
              <CicloVivoFullView onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mercado':
        // Marketplace agroecológico (circuitos cortos): publicar productos de la
        // finca + explorar ofertas de fincas vecinas + contacto directo. Es la
        // capacidad LIVE de la rama "Vender" de la mano (manifiesto `mercado`).
        // Offline-first; precio de referencia citado solo si hay fuente.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Mercado de la finca">
              <MercadosScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'aprende':
        // Módulo "Aprende con el agente" (#1824): 5 lecciones agroecológicas
        // (suelo · asociaciones · biopreparados · MIP · fenología) con datos
        // verificados y fuente, más InsightCards al cierre de cada lección.
        // Componente autocontenido (maneja su propio estado interno).
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Aprende con el agente">
              <AprenderConAgente
                onBack={() => navigate('dashboard')}
                initialSlug={currentViewData?.leccion}
                onNavigate={navigate}
                onAskAgent={(pregunta) =>
                  navigate('agente', { prefilledPrompt: pregunta })
                }
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'curso':
        // Curso auto-guiado "Aprende a usar Chagra" (#curso): un solo camino
        // de 5 pasos (registrar → suelo → cuidar → asociar → vender) que junta
        // los 4 video-manuales + las 5 lecciones del mundo Aprender + un
        // "Pruébalo en tu finca" (deep-link a la función real) por módulo, con
        // progreso guardado. Para volverse autónomo con la app sin ayuda.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Curso: usar Chagra">
              <CursoChagra
                onBack={() => navigate('dashboard')}
                onNavigate={navigate}
                initialModulo={currentViewData?.modulo}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'mercados':
        // Rama "Vender" de la mano de Chagra (auditoría UX §7.4 P3): superficie
        // HONESTA "en preparación" — alcanzable, no un dead-end. Explica el
        // estado real de la consulta de precios y orienta a las fuentes públicas
        // (DANE/SIPSA, centrales de abasto). onAskAgent puentea al agente.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Vender mejor">
              <MercadosScreen
                onBack={() => navigate('dashboard')}
                onAskAgent={(pregunta) =>
                  navigate('agente', { prefilledPrompt: pregunta })
                }
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'especies': // alias usado por Manual/FAQ (mismo caso que 'calendario': navigate() no pasa por HASH_VIEW_ROUTES)
      case 'directorio':
        // Directorio de especies: explorador visual del catálogo. Buscador con
        // resolución de nombre (matcher canónico del proyecto) + ficha grounded
        // por especie (foto, piso térmico, asociaciones, biopreparados,
        // plagas/control biológico, saberes), todo offline-first desde
        // catalog.sqlite + grafo-relations.json. initialQuery vía deep-link.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Directorio de especies">
              <DirectorioEspeciesScreen
                onBack={() => navigate('dashboard')}
                initialQuery={currentViewData?.query || ''}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'plagas':
        // Directorio de plagas: el ESPEJO del de especies. Cuadrícula de
        // plagas/enfermedades + ficha grounded por plaga (foto del daño, a qué
        // le pega, cómo reconocerla, umbral, manejo agroecológico sin veneno),
        // offline-first desde el catálogo de sanidad + grafo-relations.json.
        // initialPlagaId vía currentViewData.plagaId (deep-link desde Sanidad).
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Directorio de plagas">
              <DirectorioEspeciesScreen
                onBack={() => navigate('dashboard')}
                initialMode="plagas"
                initialPlagaId={currentViewData?.plagaId || ''}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'toxicologia':
        // Módulo TOXICOLOGÍA (seguridad): pestaña A insumos/biopreparados
        // (toxicidad, EPI, restricción ICA, dosis seguras del catálogo) +
        // pestaña B suelo (cuestionario de riesgo de contaminantes edáficos).
        // initialTab vía currentViewData.tab ('insumos' | 'suelo').
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Toxicologia">
              <ToxicologiaScreen
                onBack={() => navigate('dashboard')}
                initialTab={currentViewData?.tab}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'glaciar':
        // Módulo "Reporte de Punto Glaciar" (guías de glaciar). Ruta #glaciar.
        // ACCESO RESTRINGIDO a los beta testers de "La Cordada"
        // (src/config/glaciarAccess.js). Guarda defensiva: si por cualquier
        // ruta un usuario no autorizado llega a esta vista, NO montamos el
        // módulo — devolvemos el fallback estándar. Las navegaciones a #glaciar
        // ya redirigen al dashboard antes de llegar aquí (ver effects de ruta).
        if (!tieneAccesoGlaciarActual()) {
          return (
            <ErrorBoundary>
              <ErrorFallback moduleName="Glaciar">
                <div className="h-[100dvh] bg-slate-950 text-white flex items-center justify-center">Vista no disponible</div>
              </ErrorFallback>
            </ErrorBoundary>
          );
        }
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Glaciar">
              <GlaciarReporteScreen
                onBack={() => navigate('dashboard')}
                onVerHistorial={() => navigate('glaciar_historial')}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'glaciar_historial':
        // Historial de reportes glaciares. Ruta #glaciar-historial.
        // ACCESO RESTRINGIDO a los beta testers de "La Cordada"
        // (src/config/glaciarAccess.js). Guarda defensiva: si por cualquier
        // ruta un usuario no autorizado llega a esta vista, NO montamos el
        // módulo — devolvemos el fallback estándar. Las navegaciones a
        // #glaciar-historial ya redirigen al dashboard antes de llegar aquí.
        if (!tieneAccesoGlaciarActual()) {
          return (
            <ErrorBoundary>
              <div className="h-[100dvh] bg-slate-950 text-white flex items-center justify-center">Vista no disponible</div>
            </ErrorBoundary>
          );
        }
        return (
          <ErrorBoundary>
            <GlaciarHistorialScreen onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')} />
          </ErrorBoundary>
        );
      case 'perfil':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Perfil">
              <ProfileScreen onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'extensionista':
        // Panel SUPERVISOR del modo extensionista (ADR-048 MVP). ACCESO por
        // feature flag VITE_FEATURE_EXTENSIONISTA + rol (config/extensionistaAccess).
        // Las rutas a #extensionista ya redirigen al dashboard antes de llegar
        // aquí si el usuario no tiene rol; guarda defensiva por si se monta directo.
        if (!esExtensionistaActual()) {
          return (
            <ErrorBoundary>
              <ErrorFallback moduleName="Extensionista">
                <div className="h-[100dvh] bg-slate-950 text-white flex items-center justify-center">Vista no disponible</div>
              </ErrorFallback>
            </ErrorBoundary>
          );
        }
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Extensionista">
              <ExtensionistaScreen onBack={() => navigate('dashboard')} onHome={() => navigate('dashboard')} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'casos':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Casos de Estudio">
              <CaseStudyScreen
                onBack={() => navigate('dashboard')}
                onHome={() => navigate('dashboard')}
                onSelectCase={(id) => navigate('caso_detail', { caseId: id })}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'caso_detail':
        return (
          <ErrorBoundary>
            <CaseStudyDetail
              caseId={currentViewData?.caseId}
              onBack={() => navigate('casos')}
              onHome={() => navigate('dashboard')}
            />
          </ErrorBoundary>
        );
      case 'faq':
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Preguntas Frecuentes">
              <FaqScreen onBack={() => navigate('dashboard')} onNavigate={navigate} />
            </ErrorFallback>
          </ErrorBoundary>
        );
      case 'help':
        return (
          <ErrorBoundary>
            <HelpManual onBack={() => navigate('dashboard')} onNavigate={navigate} />
          </ErrorBoundary>
        );
      case 'ayuda':
        return (
          <ErrorBoundary>
            <HelpManual onBack={() => navigate('dashboard')} onNavigate={navigate} />
          </ErrorBoundary>
        );
      case 'agente':
        // Guard offline ANTES del dynamic import (bug offline-first 2026-06-13):
        // AgentScreen es un chunk lazy. Si se abre el agente OFFLINE con ese
        // chunk no cacheado por el SW, el import() falla → ErrorBoundary genérico
        // ("Algo falló") y el guard offline real (ollamaStream) queda
        // inalcanzable porque el componente nunca monta. Chequear navigator.onLine
        // aquí deja ver el aviso claro ("el asistente necesita internet; tus datos
        // sí funcionan sin conexión") aunque el chunk no esté disponible.
        if (!isAppOnline) {
          return (
            <ErrorBoundary>
              <AgentOfflineGuard onBack={() => navigate('dashboard')} />
            </ErrorBoundary>
          );
        }
        // 2026-05-28: pasamos currentViewData como initialContext para que
        // notificaciones críticas (helada, alerta clima) lleguen al agente
        // con prompt pre-cargado + cita de la fuente (IDEAM/NOAA/CIIFEN/
        // Open-Meteo) — operador no tiene que re-tipear "tengo alerta de
        // helada, ¿qué hago?". Si el usuario entra al agente normal (FAB,
        // tile, etc.), currentViewData es null y el comportamiento previo
        // se preserva sin cambios.
        return (
          <ErrorBoundary>
            <ErrorFallback moduleName="Agente">
              <AgentScreen
                onBack={() => navigate('dashboard')}
                onNavigate={navigate}
                initialContext={currentViewData}
              />
            </ErrorFallback>
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary>
            <div className="h-[100dvh] bg-slate-950 text-white flex items-center justify-center">Vista no disponible</div>
          </ErrorBoundary>
        );
    }
  };

  // Vistas pre-autenticación: el formulario manda y NO debe quedar tapado ni
  // empujado por overlays flotantes. Mismo conjunto que ya gatea showBg,
  // DataLossBanner, CriticalAlertBanner, SyncProgressIndicator, etc.
  const isPreAuthView =
    currentView === 'loading' ||
    currentView === 'login' ||
    currentView === 'oauth-callback' ||
    // La vitrina de la librería visual es una página pública autocontenida:
    // sin banners de instalación/datos ni FABs encima.
    currentView.startsWith('mockup_');

  return (
    <>
      {/* Transición colibrí home→conversación (~2s). Encima de todo (z alto);
          la conversación monta detrás y queda limpia al terminar. */}
      <ColibriTransition active={colibriTransition} onDone={() => setColibriTransition(false)} />
      <NetworkStatusBar />
      {/* Banners de instalación PWA: NO en las vistas pre-auth (login /
          loading / oauth-callback). En el login son un overlay `fixed`
          z-50 que se encimaba sobre el formulario —en desktop tapaba e
          interceptaba el clic del campo "Usuario"; en móvil empujaba
          Usuario/Contraseña/Ingresar bajo el fold—. La instalación se
          ofrece una vez dentro de la app, igual que DataLossBanner y
          los demás flotantes (mismo guard de vista). */}
      {!isPreAuthView && <IosInstallBanner />}
      {!isPreAuthView && <AndroidInstallBanner />}
      <UpdateAvailableBanner />
      <Confetti />
      <GpsFincaBanner />
      {/* Detector de vaciado IDB (post clear-cache).
          2026-05-19: el operador perdió plantas con foto + 100 species por
          un "Clear cache" en Chrome Android. El banner se muestra solo si
          detectamos huella `chagra:had-data-once` en localStorage + IDB
          vacío. NO se muestra en loading/login para no asustar antes de
          que la app pueda confirmar estado. */}
      {currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && !currentView.startsWith('mockup_') && <DataLossBanner />}
      {/* #315 — banner crítico global: surfacea alertas graves (helada, sensor
          crítico) sin abrir la campana. Imposible de ignorar. */}
      {currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && !currentView.startsWith('mockup_') && <CriticalAlertBanner onNavigate={navigate} />}
      {/* Entrada de pantalla: el swap de vista era SECO (desmonta/monta sin
          transición). El wrapper con key remonta en cada cambio de vista y
          dispara un fade corto (motion.css .anim-screen-enter — solo opacidad,
          sin transform, para no des-anclar los position:fixed internos). Y el
          fallback conoce la vista destino: mientras baja el chunk lazy muestra
          "Abriendo el catálogo…" etc. Respeta prefers-reduced-motion. */}
      <Suspense fallback={<LoadingFallback view={currentView} />}>
        <div key={currentView} className="anim-screen-enter">
          {renderView()}
        </div>
      </Suspense>
      {/* FAB feedback flotante REMOVIDO 2026-05-21: el reporte de errores
          ahora vive embebido dentro de HelpUsoScreen (sección "Reportar
          problema con Chagra") en lugar de un FAB global. Decisión user
          tras Lili UX feedback: FAB tapaba contenido + no era discoverable.
          El form sigue siendo el mismo componente, instanciado con prop
          `embedded` desde HelpUsoScreen. */}
      {/* MicFab (FAB de voz flotante abajo-izquierda) REMOVIDO 2026-05-30 por
          decisión del operador: lo quería fuera. La entrada por voz sigue
          disponible dentro del agente / compositor; este era solo el FAB
          global. */}
      {/* AgentFab (colibrí flotante "respuesta lista") en TODAS las pantallas
          MENOS el home/dashboard (operador 2026-06-06): en el home el colibrí
          ya es el botón de ENVIAR del compositor, así que el FAB flotante ahí
          duplicaría el ave. Sigue en el resto para anunciar "respuesta lista".
          Tampoco en onboarding-perfil (tarea #16): el FAB se encimaba sobre el
          CTA "Explorar con finca de ejemplo" del footer y la usuaria nueva aún
          no conoce al agente — ruido en su primer flujo. */}
      {currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && !currentView.startsWith('mockup_') && currentView !== 'voz' && currentView !== 'agente' && currentView !== 'dashboard' && currentView !== 'onboarding-perfil' && currentView !== 'onboarding-perfil-clasico' && <AgentFab onNavigate={navigate} />}
      {/* Escucha manos libres (operador 2026-07-05, caso guantes/manos
          embarradas). Abre el widget "Chagra está escuchando" que navega o
          pregunta al agente punta a punta por voz.

          DECISIÓN OPERADOR 2026-07-07 — MODO CAMPO = WAKE-WORD SOLO: el FAB de
          tap ("barbudito de páramo", EscuchaFab) NO se muestra a los usuarios.
          El único FAB visible sigue siendo el colibrí (AgentFab, "respuesta
          lista"). El overlay se abre EXCLUSIVAMENTE por el wake-word "hola
          chagra" (useModoCampo.onWake → activarEscucha({fuente:'wakeword'})),
          que solo corre con VITE_MODO_CAMPO=true y modo campo activado (opt-in).
          Para re-habilitar el tap: descomentar el import de EscuchaFab (arriba)
          y la línea del render de abajo. */}
      {/* {!['loading', 'login', 'oauth-callback', 'onboarding-perfil', 'ubicacion-detectada', 'dashboard', 'agente', 'voz', 'voz_planta', 'registro_voz'].includes(currentView) && <EscuchaFab />} */}
      {currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && !currentView.startsWith('mockup_') && <EscuchaOverlay />}
      {currentView === 'dashboard' && <PendingTasksWidget onEdit={(task) => navigate('edit_task', { task })} />}
      {currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && !currentView.startsWith('mockup_') && <SyncProgressIndicator />}
      {toast && (
        <div
          role={toast.isError ? 'alert' : 'status'}
          aria-live={toast.isError ? 'assertive' : 'polite'}
          className={`fixed left-1/2 -translate-x-1/2 p-4 rounded-xl shadow-2xl flex items-center gap-3 z-[100] w-11/12 max-w-md border-2 pointer-events-none ${toast.isError ? 'bg-amber-700 border-amber-500' : 'bg-green-700 border-green-500'}`}
          style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}
        >
          {toast.isError ? <WifiOff size={28} className="shrink-0" aria-hidden="true" /> : <CheckCircle size={28} className="shrink-0" aria-hidden="true" />}
          <p className="text-base font-bold text-white leading-tight flex-1">{toast.message}</p>
          {toast.actionLabel && toast.actionView && (
            <button
              type="button"
              onClick={() => {
                navigate(toast.actionView);
                setToast(null);
              }}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white text-xs font-bold uppercase tracking-wide border border-white/30 pointer-events-auto"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
      <DemoModeBanner />
    </>
  );
}
