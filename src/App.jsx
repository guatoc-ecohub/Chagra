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
const EstiercolScreen = lazy(() => import('./components/EstiercolScreen'));
const AgentScreen = lazy(() => import('./components/AgentScreen/AgentScreen'));
const OnboardingProfile = lazy(() => import('./components/OnboardingProfile'));
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
const SeguimientoProcesoScreen = lazy(() => import('./components/SeguimientoProcesoScreen'));
const SoilDiagnosticScreen = lazy(() => import('./components/SoilDiagnosticScreen'));
// Módulo "Agua de la finca": cosecha de lluvia (calculadora determinista),
// riego con medida (ETc; Kc/ETo = slots grounded-pendiente) y cuidar el agua
// (calidad + nacimiento, caso "se me seca el nacimiento en verano").
const AguaScreen = lazy(() => import('./components/agua/AguaScreen'));
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
const TopBar = lazy(() => import('./components/TopBar'));
const DashboardLive = lazy(() => import('./components/dashboard/DashboardLive'));
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
import HomeRegionalGreeting from './components/HomeRegionalGreeting';
import { fincaVivaHomePerfilActivo } from './config/fincaVivaHomeFlag';
import { esExtensionistaActual } from './config/extensionistaAccess';

localforage.config({
  name: 'Chagra',
  storeName: 'syncQueue'
});

const LoadingFallback = () => (
  <div
    className="h-[100dvh] bg-slate-950 flex items-center justify-center text-muzo-glow"
    data-testid="app-suspense-fallback"
  >
    <ChagraGrowLoader size={80} showLabel labelText="Chagra..." />
  </div>
);

// CÓDIGO MUERTO REMOVIDO 2026-06-24 (descubribilidad): `NAV_TILES` +
// `ACCENT_CLASSES` solo los consumía `DashboardView` (la grilla de 16 tiles del
// dashboard legacy), que NUNCA se montaba — `case 'dashboard'` renderiza
// `DashboardLiveView`. La home viva es `DashboardLive.jsx` (HERRAMIENTAS_TILES +
// FincaCards + mano radial). Los launchers que SOLO vivían en ese código muerto
// (`casos` vía CaseStudyTopWidget, `javier` vía el tile) se rescataron a la home
// viva (HERRAMIENTAS_TILES en DashboardLive). Las rutas `casos`/`caso_detail`/
// `javier`/`usage_stats` siguen vivas en el router (más abajo) y por hash.
// Ref: CAPABILITIES_STATUS.md §4 (deuda de navegación) + §2 (huérfanos).

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
  animales: 'animales',
  'animales-gallinas': 'animales_gallinas',
  'animales-abejas': 'animales_abejas',
  'animales-vacas': 'animales_vacas',
  estiercol: 'estiercol',
  'del-corral-al-abono': 'estiercol',
  abono: 'estiercol',
  biodigestor: 'estiercol',
  'doom-finca': 'doom_finca',
  subsuelo: 'subsuelo',
  'mundo-subsuelo': 'subsuelo',
  toxicologia: 'toxicologia',
  suelo: 'suelo',
  agua: 'agua',
  'manejo-agua': 'agua',
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
};

// Vistas que cuentan como "módulo" para telemetría de piloto.
const MODULE_VIEWS = new Set([
  'activos', 'mapa', 'javier', 'bodega', 'task_log', 'historial', 'bitacora',
  'biodiversidad', 'informes', 'perfil', 'ayuda', 'help',
  'animales', 'animales_gallinas', 'animales_abejas', 'animales_vacas', 'estiercol',
  'hoy_finca',   'faq', 'evolucion', 'juego', 'defensores', 'milpa', 'doom_finca', 'subsuelo', 'sembrar', 'cosechar', 'insumos', 'biopreparados',
  'observacion', 'reportar_invasora', 'sanidad_sintoma', 'mantenimiento', 'new_task',
  'agente', 'voz', 'voz_planta', 'procesos', 'registro_voz', 'registro_unificado', 'ciclo', 'germinacion', 'ciclo_nutrientes', 'calendario_finca', 'suelo', 'agua', 'clima_boletin', 'salud_suelo', 'semilla', 'poscosecha', 'almacenamiento', 'nutricion', 'toxicologia', 'aprende', 'curso', 'directorio', 'mercados',
  'glaciar', 'glaciar_historial', 'extensionista', 'plant_asset',
  'casos', 'caso_detail', 'bitacora_detail', 'edit_task', 'cromatografia', 'ciclo_vivo',
  'usage_stats', 'mercado', 'auditoria_inventario', 'mundo',
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
  useGlobalKeyboardShortcuts({ enabled: currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' });
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
    const showBg = currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback';
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
        return <LoadingFallback />;
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
      case 'onboarding-perfil':
        // #200: onboarding extendido de 18 preguntas condicionales → perfil.
        // Al terminar/saltar va al detector de ubicación; tras confirmar,
        // al dashboard. currentViewData.next permite override del destino.
        return (
          <ErrorBoundary>
            <OnboardingProfile
              onComplete={() => navigate('ubicacion-detectada', { next: 'dashboard' })}
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
              <AbejasScreen onBack={() => navigate('animales')} onHome={() => navigate('dashboard')} />
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
              <GlaciarReporteScreen onBack={() => navigate('dashboard')} />
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
    currentView === 'oauth-callback';

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
      {currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && <DataLossBanner />}
      {/* #315 — banner crítico global: surfacea alertas graves (helada, sensor
          crítico) sin abrir la campana. Imposible de ignorar. */}
      {currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && <CriticalAlertBanner onNavigate={navigate} />}
      <Suspense fallback={<LoadingFallback />}>
        {renderView()}
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
          duplicaría el ave. Sigue en el resto para anunciar "respuesta lista". */}
      {currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && currentView !== 'voz' && currentView !== 'agente' && currentView !== 'dashboard' && <AgentFab onNavigate={navigate} />}
      {currentView === 'dashboard' && <PendingTasksWidget onEdit={(task) => navigate('edit_task', { task })} />}
      {currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && <SyncProgressIndicator />}
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
