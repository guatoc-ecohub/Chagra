/**
 * ProdChagraApp.jsx — Shell data-driven de prod.chagra.app (3D-first).
 *
 * LEE el manifiesto `src/config/rutasProdChagraApp.js` y monta rutas
 * data-driven. Home (/) = valle 3D. Auth gate (login primero).
 *
 * Usa import.meta.glob con paths EXACTOS (no wildcard) — Vite los
 * resuelve en build-time sin penalizar el build completo.
 */
import React, { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { isAuthenticated } from '../services/authService';
import {
  NUCLEO_3D,
  NUCLEO_APP,
  PENDIENTE_DECISION,
  EXCLUIDO,
} from '../config/rutasProdChagraApp.js';
// Rutas dinámicas 'seguimiento_<key>' (reforestación/silvopastoreo/páramo/
// cerdos): el shell viejo las parseaba en el switch; sin esto, las tarjetas de
// seguimiento del dashboard y el enlace de VacasScreen eran taps muertos.
import { parseSeguimientoView } from '../config/seguimientoProcesos.js';
// Barra offline/sync (autocontenida, escucha online/offline/syncError/
// syncComplete). El shell viejo la montaba; prod no — en una app de campo
// offline-first, quedarse sin la señal de "sin conexión / X por sincronizar"
// es un bug, no un detalle.
import NetworkStatusBar from '../components/NetworkStatusBar.jsx';

// Audio cleanup: al cambiar de ruta, detener cualquier voz (Kokoro/Web Speech)
// que haya quedado sonando de la vista anterior. El loop eterno reportado
// por el operador ocurre cuando el fetch asíncrono de speakKokoro resuelve
// DESPUES de que el componente se desmontó → el audio se reproduce sin dueño.
import { stop as stopAllAudio } from '../services/ttsService.js';

import ChagraGrowLoader from '../components/ChagraGrowLoader';
const LoginScreen = lazy(() => import('../components/LoginScreen.jsx'));
// Angelita viva en TODA pantalla: App.jsx la monta global y prod nunca lo hizo.
// El asistente existia, con idle-cerebro, ritmo propio, mirada y lip-sync — y en
// produccion no aparecia en ninguna de las 48 pantallas.
const AgentFab = lazy(() => import('../components/AgentFab.jsx'));
const OAuthCallback = lazy(() => import('../components/OAuthCallback.jsx'));

// ── Mapa de lazy components (generado del manifiesto) ─────────────
// Cada entrada asocia un importLazy → React.lazy con el path exacto.
// El manifiesto es la fuente de verdad; esta sección es el puente
// entre el data-driven declare y el sistema de imports de Vite.

// Los imports lazy se declaran EXPLICITAMENTE para que Vite pueda
// hacer tree-shaking y code-splitting. El mapa RUTAS abajo los indexa.
const LAZY_MAP = {
  // ── 3D ───────────────────────────────────────────────────────
  EntradaValle3D: lazy(() => import('../mockups/EntradaValle3D.jsx')),
  ValleNoche3D: lazy(() => import('../mockups/ValleNoche3D.jsx')),
  ValleLluvia3D: lazy(() => import('../mockups/ValleLluvia3D.jsx')),
  VentanaValle3D: lazy(() => import('../components/VentanaValle3D.jsx')),
  VistaGlobalSierra: lazy(() => import('../visual/mundo3d/VistaGlobalSierra.jsx')),
  GaleriaSierraArboles: lazy(() => import('../visual/mundo3d/sierra/GaleriaSierraArboles.jsx')),
  NavegadorGrafoDemo: lazy(() => import('../mockups/NavegadorGrafoDemo.jsx')),
  RestauracionEnElTiempo: lazy(() => import('../visual/mundo3d/restauracion/RestauracionEnElTiempo.jsx')),
  DemoAtmosferaViva: lazy(() => import('../visual/mundo3d/atmosfera/DemoAtmosferaViva.jsx')),
  TransicionesOdysseyDemo: lazy(() => import('../mockups/TransicionesOdysseyDemo.jsx')),
  SierraMonte3D: lazy(() => import('../visual/mundo3d/sierra/SierraMonte3D.jsx')),
  SierraCorteVertical: lazy(() => import('../visual/mundo3d/sierra/SierraCorteVertical.jsx')),
  // Mundos de cultivo por piso térmico (café templado, cacao cálido, papa fría):
  // el arte vivía solo en App.jsx (shell clásico) y en prod era inalcanzable.
  CafetalVivo3D: lazy(() => import('../mockups/CafetalVivo3D.jsx')),
  CacaoVivo3D: lazy(() => import('../mockups/CacaoVivo3D.jsx')),
  PapaVivo3D: lazy(() => import('../mockups/PapaVivo3D.jsx')),
  MundoPiscicultura3D: lazy(() => import('../mockups/MundoPiscicultura3D.jsx')),
  LecheriaViva3D: lazy(() => import('../mockups/LecheriaViva3D.jsx')),
  MundoPolinizadores3D: lazy(() => import('../mockups/MundoPolinizadores3D.jsx')),
  MundoEntBosque: lazy(() => import('../visual/mundo3d/bosque/MundoEntBosque.jsx')),
  MontanaMundosCampesino: lazy(() => import('../mockups/MontanaMundosCampesino.jsx')),
  VitrinaMaestraMundos: lazy(() => import('../mockups/VitrinaMaestraMundos.jsx')),
  MundoScreen: lazy(() => import('../components/MundoScreen.jsx')),
  MundoAbejas3D: lazy(() => import('../mockups/MundoAbejas3D.jsx')),
  MundoGallinero3D: lazy(() => import('../mockups/MundoGallinero3D.jsx')),
  MundoParamo3D: lazy(() => import('../mockups/MundoParamo3D.jsx')),
  MundoBoticaCana3D: lazy(() => import('../mockups/MundoBoticaCana3D.jsx')),
  MundoAgua3D: lazy(() => import('../mockups/MundoAgua3D.jsx')),
  MundoSueloVivo3D: lazy(() => import('../mockups/MundoSueloVivo3D.jsx')),
  MundoCompost3D: lazy(() => import('../mockups/MundoCompost3D.jsx')),
  MundoFermentos3D: lazy(() => import('../mockups/MundoFermentos3D.jsx')),
  MundoMicrofauna3D: lazy(() => import('../mockups/MundoMicrofauna3D.jsx')),
  MundoSubsuelo: lazy(() => import('../components/juego/MundoSubsuelo.jsx')),
  CamaraDirectorDemo: lazy(() => import('../mockups/CamaraDirectorDemo.jsx')),
  ArtesaniaAndinaDemo: lazy(() => import('../mockups/ArtesaniaAndinaDemo.jsx')),
  EfectosFuncionalesDemo: lazy(() => import('../mockups/EfectosFuncionalesDemo.jsx')),
  CatalogoInfraDemo: lazy(() => import('../mockups/CatalogoInfraDemo.jsx')),
  ColocarInfraestructura: lazy(() => import('../mockups/ColocarInfraestructura.jsx')),
  GemelosMundos2D: lazy(() => import('../mockups/GemelosMundos2D.jsx')),
  AliadosFinca3D: lazy(() => import('../mockups/AliadosFinca3D.jsx')),
  MomentoVentaMercado3D: lazy(() => import('../mockups/MomentoVentaMercado3D.jsx')),
  NewDonk2Den3D: lazy(() => import('../mockups/NewDonk2Den3D.jsx')),
  MuralesNewDonk: lazy(() => import('../mockups/MuralesNewDonk.jsx')),

  // ── App núcleo ────────────────────────────────────────────────
  LocationDetectedScreen: lazy(() => import('../components/LocationDetectedScreen.jsx')),
  AgentScreen: lazy(() => import('../components/AgentScreen/AgentScreen.jsx')),
  ProfileScreen: lazy(() => import('../components/ProfileScreen.jsx')),
  EspirituProScreen: lazy(() => import('../components/EspirituProScreen.jsx')),
  OnboardingProfile: lazy(() => import('../components/OnboardingProfile.jsx')),
  HoyEnFincaScreen: lazy(() => import('../components/hoy/HoyEnFincaScreen.jsx')),
  MiFincaEvolucionScreen: lazy(() => import('../components/hoy/MiFincaEvolucionScreen.jsx')),
  DirectorioEspeciesScreen: lazy(() => import('../components/DirectorioEspecies/DirectorioEspeciesScreen.jsx')),
  SeedingLog: lazy(() => import('../components/SeedingLog.jsx')),
  HarvestLog: lazy(() => import('../components/HarvestLog.jsx')),
  InputLog: lazy(() => import('../components/InputLog.jsx')),
  ObservationScreen: lazy(() => import('../components/ObservationScreen.jsx')),
  RegistroUnificadoScreen: lazy(() => import('../components/RegistroUnificadoScreen.jsx')),
  RegistroVozScreen: lazy(() => import('../components/RegistroVozScreen.jsx')),
  ProcesosPorVozScreen: lazy(() => import('../components/ProcesosPorVozScreen.jsx')),
  AssetsDashboard: lazy(() => import('../components/AssetsDashboard.jsx')),
  InventoryPage: lazy(() => import('../pages/InventoryPage.jsx')),
  TaskScreen: lazy(() => import('../components/TaskScreen.jsx')),
  SeguimientoProcesoScreen: lazy(() => import('../components/SeguimientoProcesoScreen.jsx')),
  BitacoraEntryDetail: lazy(() => import('../components/BitacoraEntryDetail.jsx')),
  ClimaBoletinScreen: lazy(() => import('../components/clima/ClimaBoletinScreen.jsx')),
  AguaScreen: lazy(() => import('../components/agua/AguaScreen.jsx')),
  SoilDiagnosticScreen: lazy(() => import('../components/SoilDiagnosticScreen.jsx')),
  SaludSueloScreen: lazy(() => import('../components/SaludSueloScreen.jsx')),
  CromatografiaScreen: lazy(() => import('../components/CromatografiaScreen.jsx')),
  MundoCultivosHub: lazy(() => import('../components/cultivos/MundoCultivosHub.jsx')),
  CafeScreen: lazy(() => import('../components/cafe/CafeScreen.jsx')),
  CacaoScreen: lazy(() => import('../components/cacao/CacaoScreen.jsx')),
  PlatanoBananoScreen: lazy(() => import('../components/PlatanoBananoScreen.jsx')),
  AguacateScreen: lazy(() => import('../components/aguacate/AguacateScreen.jsx')),
  CitricosScreen: lazy(() => import('../components/citricos/CitricosScreen.jsx')),
  CanaScreen: lazy(() => import('../components/cana/CanaScreen.jsx')),
  MangoScreen: lazy(() => import('../components/mango/MangoScreen.jsx')),
  UchuvaScreen: lazy(() => import('../components/uchuva/UchuvaScreen.jsx')),
  FrutalesScreen: lazy(() => import('../components/frutales/FrutalesScreen.jsx')),
  HortalizasScreen: lazy(() => import('../components/HortalizasScreen.jsx')),
  TuberculosScreen: lazy(() => import('../components/TuberculosScreen.jsx')),
  AromaticasScreen: lazy(() => import('../components/aromaticas/AromaticasScreen.jsx')),
  BoticaScreen: lazy(() => import('../components/botica/BoticaScreen.jsx')),
  FiqueScreen: lazy(() => import('../components/fique/FiqueScreen.jsx')),
  MilpaScreen: lazy(() => import('../components/milpa/MilpaScreen.jsx')),
  QuinuaScreen: lazy(() => import('../components/quinua/QuinuaScreen.jsx')),
  SanidadSintomaScreen: lazy(() => import('../components/sanidad/SanidadSintomaScreen.jsx')),
  InvasiveObservationLog: lazy(() => import('../components/InvasiveObservationLog.jsx')),
  ToxicologiaScreen: lazy(() => import('../components/ToxicologiaScreen.jsx')),
  MaintenanceScreen: lazy(() => import('../components/MaintenanceScreen.jsx')),
  CicloCultivoScreen: lazy(() => import('../components/CicloCultivoScreen.jsx')),
  GerminacionScreen: lazy(() => import('../components/GerminacionScreen.jsx')),
  CicloNutrientesScreen: lazy(() => import('../components/CicloNutrientesScreen.jsx')),
  CicloVivoFullView: lazy(() => import('../components/CicloVivo/CicloVivoFullView.jsx')),
  CalendarioFincaScreen: lazy(() => import('../components/CalendarioFincaScreen.jsx')),
  AnoFincaScreen: lazy(() => import('../components/anofinca/AnoFincaScreen.jsx')),
  SemillaScreen: lazy(() => import('../components/semilla/SemillaScreen.jsx')),
  PoscosechaScreen: lazy(() => import('../components/PoscosechaScreen.jsx')),
  AlmacenamientoScreen: lazy(() => import('../components/AlmacenamientoScreen.jsx')),
  MiCosechaScreen: lazy(() => import('../components/cosecha/MiCosechaScreen.jsx')),
  NutricionHumanaScreen: lazy(() => import('../components/NutricionHumanaScreen.jsx')),
  AnimalesScreen: lazy(() => import('../components/AnimalesScreen.jsx')),
  GallinasScreen: lazy(() => import('../components/GallinasScreen.jsx')),
  AbejasScreen: lazy(() => import('../components/AbejasScreen.jsx')),
  VacasScreen: lazy(() => import('../components/VacasScreen.jsx')),
  ConejosScreen: lazy(() => import('../components/ConejosScreen.jsx')),
  CaprinosScreen: lazy(() => import('../components/CaprinosScreen.jsx')),
  EstiercolScreen: lazy(() => import('../components/EstiercolScreen.jsx')),
  CompostScreen: lazy(() => import('../components/CompostScreen.jsx')),
  BiopreparadosScreen: lazy(() => import('../components/biopreparados/BiopreparadosScreen.jsx')),
  FermentosView: lazy(() => import('../components/FermentosView.jsx')),
  BiodiversidadView: lazy(() => import('../components/BiodiversidadView.jsx')),
  Asociaciones: lazy(() => import('../components/Asociaciones.jsx')),
  RestauracionScreen: lazy(() => import('../components/restauracion/RestauracionScreen.jsx')),
  FarmMap: lazy(() => import('../components/FarmMap.jsx')),
  InformesScreen: lazy(() => import('../components/InformesScreen.jsx')),
  GlaciarReporteScreen: lazy(() => import('../components/GlaciarReporteScreen.jsx')),
  GlaciarHistorialScreen: lazy(() => import('../components/GlaciarHistorialScreen.jsx')),
  ExtensionistaScreen: lazy(() => import('../components/ExtensionistaScreen.jsx')),
  CaseStudyScreen: lazy(() => import('../components/CaseStudyScreen.jsx')),
  CaseStudyDetail: lazy(() => import('../components/CaseStudyDetail.jsx')),
  FaqScreen: lazy(() => import('../components/FaqScreen.jsx')),
  AprenderConAgente: lazy(() => import('../components/Aprende/AprenderConAgente.jsx')),
  CursoChagra: lazy(() => import('../components/curso/CursoChagra.jsx')),
  DashboardLive: lazy(() => import('../components/dashboard/DashboardLive.jsx')),

  // ── PENDIENTE_DECISION (operador dijo "nada afuera") ────────────
  OnboardingCondensado: lazy(() => import('../components/OnboardingCondensado.jsx')),
  OnboardingSiembra: lazy(() => import('../mockups/OnboardingSiembra.jsx')),
  // La sala de juegos: el hub que hace VISIBLES los juegos (#juegos) desde
  // Aprender. Los dos de abajo estaban en el manifiesto SIN entrada aquí →
  // rutas muertas en prod ("construido pero no cableado"): sus tarjetas del
  // hub no abrían nada.
  HubJuegos: lazy(() => import('../components/juego/HubJuegos.jsx')),
  JuegoMiFincaOdyssey: lazy(() => import('../mockups/JuegoMiFincaOdyssey.jsx')),
  MonoVsPoliSimulator: lazy(() => import('../components/juego/MonoVsPoliSimulator.jsx')),
  MiFincaVivaScreen: lazy(() => import('../components/juego/MiFincaVivaScreen.jsx')),
  DefensoresFincaScreen: lazy(() => import('../components/juego/DefensoresFincaScreen.jsx')),
  MilpaSimulator: lazy(() => import('../components/juego/MilpaSimulator.jsx')),
  DoomFincaScreen: lazy(() => import('../components/juego/DoomFincaScreen.jsx')),
  MetalSlugCampo: lazy(() => import('../mockups/MetalSlugCampo.jsx')),
  JuegoLaMilpa: lazy(() => import('../mockups/JuegoLaMilpa.jsx')),
  MercadosScreen: lazy(() => import('../components/MercadosScreen.jsx')),
  Mercado: lazy(() => import('../mockups/Mercado.jsx')),
  VozConForma: lazy(() => import('../mockups/VozConForma.jsx')),
  ConversacionVoz: lazy(() => import('../mockups/ConversacionVoz.jsx')),
  EnsenaDibujando: lazy(() => import('../mockups/EnsenaDibujando.jsx')),
  AlmanaqueScreen: lazy(() => import('../components/almanaque/AlmanaqueScreen.jsx')),
  PlantaPorVozScreen: lazy(() => import('../components/PlantaPorVozScreen.jsx')),
};

// ── Construir tabla de rutas desde el manifiesto ─────────────────

/**
 * @typedef {Object} RutaRegistrada
 * @property {string} path
 * @property {React.ComponentType<any>} Lazy — `any`: cada pantalla declara sus
 *   props (onBack/onNavigate/initialContext…) y el router pasa el set común;
 *   los componentes ignoran las que no usan.
 */

/** @type {Map<string, RutaRegistrada>} */
const RUTAS = new Map();

function registrarComponente(path, nombreComponente, aliases) {
  const Lazy = LAZY_MAP[nombreComponente];
  if (!Lazy) return;
  RUTAS.set(path, { path, Lazy });
  if (aliases) {
    for (const a of aliases) RUTAS.set(a, { path, Lazy });
  }
}

for (const e of NUCLEO_3D) {
  if (!EXCLUIDO.some((x) => x.path === e.path)) {
    registrarComponente(e.path, e.componente, e.alias);
  }
}
for (const e of NUCLEO_APP) {
  if (!EXCLUIDO.some((x) => x.path === e.path)) {
    registrarComponente(e.path, e.componente, e.alias);
  }
}
for (const e of PENDIENTE_DECISION) {
  if (!EXCLUIDO.some((x) => x.path === e.path)) {
    registrarComponente(/** @type {any} */ (e).path, /** @type {any} */ (e).componente, /** @type {any} */ (e).alias);
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '';
  const [view, ...rest] = raw.split('/');
  let data = null;
  if (rest.length > 0) {
    try { data = JSON.parse(decodeURIComponent(rest.join('/'))); } catch { data = rest.join('/'); }
  }
  return { view: view || 'valle3d', data };
}

// ── Vistas SIN control de salida propio (verificado archivo por archivo,
//    barrido de controles 2026-07-15: cero location.hash / chagraNavigate /
//    onBack / history.back en todo el árbol del componente). En una PWA
//    instalada (sin barra del navegador) son TRAMPAS: el campesino entra y no
//    puede volver. Para estas, el shell superpone un botón de casa. Las vistas
//    con salida propia (valle, mundos con AcompananteMundo, pantallas con
//    ScreenShell) NO están acá — un segundo botón de casa confundiría.
const VISTAS_SIN_SALIDA = new Set([
  'valle3d_noche',
  'sierra_global', 'sierra', 'vista_sierra',
  'sierra_corte', 'sierra_lamina', 'vista_sierra_corte',
  'diorama_abejas', 'diorama_paramo', 'diorama_suelo', 'diorama_compost',
  'diorama_botica_cana',
  'subsuelo', 'mundo3d_micorrizas',
  'camara_director', 'artesania_andina', 'efectos_funcionales',
  'catalogo_infra', 'colocar_infra', 'gemelos_2d',
  'aliados_finca', 'momento_venta',
  'fermentos', 'asociaciones', 'mapa',
  'mockup_voz_con_forma', 'mockup_conversacion_voz',
  // Juegos sin control de salida propio (verificado componente por
  // componente): el comparador mono-vs-poli y la ladera 3D de restauración
  // no traen onBack ni ScreenShell — sin el botón de casa serían trampas.
  'mono_vs_poli', 'monte_vuelve', 'restaurar',
]);

// ── Componente principal ────────────────────────────────────────

export default function ProdChagraApp() {
  // auth: null = determinando, true = autenticado, false = no autenticado.
  // Arranca null para evitar el flash de login mientras se verifica el token
  // en localforage (IndexedDB asíncrona). isAuthenticated() es async y NUNCA
  // debe usarse en un if() síncrono — siempre devuelve Promise truthy.
  const [auth, setAuth] = useState(null);
  const [currentView, setCurrentView] = useState('loading');
  // Datos de navegación (ej. el contexto espacial que EntradaValle3D manda al
  // agente). Viajan EN el hash (`#vista/<json-uri>`) — parseHash ya los lee —
  // para sobrevivir recarga y botón atrás del navegador.
  const [navData, setNavData] = useState(null);

  // ── Toast del shell. Dos bocas, misma campana:
  //    1. prop `onSave` (SeedingLog, TaskScreen, RegistroVoz, invasoras… —
  //       el shell viejo pasaba onSave={showToast} y prod no pasaba NADA:
  //       guardabas y no había ninguna confirmación).
  //    2. CustomEvent 'chagraToast' (7 componentes lo despachan: foto muy
  //       pesada, plan de alimentación sugerido, reporte registrado…) que NO
  //       tenía listener en NINGÚN shell — todos esos avisos eran no-ops.
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(/** @type {any} */ (null));
  const mostrarToast = useCallback((message, isError = false) => {
    if (typeof message !== 'string' || !message) return;
    setToast({ message, isError: isError === true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => {
    /** @param {Event & { detail?: any }} e */
    const onToast = (e) => mostrarToast(e.detail?.message, e.detail?.isError);
    window.addEventListener('chagraToast', onToast);
    return () => {
      window.removeEventListener('chagraToast', onToast);
      clearTimeout(toastTimer.current);
    };
  }, [mostrarToast]);

  const navigate = useCallback((view, data = null) => {
    if (!view || view === 'loading') return;
    // Guard de rutas: las pantallas piden vistas que a veces no existen en el
    // manifiesto de prod (ej. tiles legacy del dashboard). Ignorar el toque es
    // mejor que caer al valle "porque sí" (el fallback del router confunde).
    // Las 'seguimiento_<key>' son rutas paramétricas válidas (no están en el
    // manifiesto como literales).
    if (!RUTAS.has(view) && !parseSeguimientoView(view) && view !== 'login' && view !== 'oauth-callback') return;
    // Detener cualquier audio de la vista anterior antes de montar la nueva.
    // El loop eterno reportado ocurre cuando el audio asíncrono resuelve
    // después del desmontaje del componente 3D.
    try { stopAllAudio(); } catch { /* ttsService puede no estar inicializado */ }
    setNavData(data ?? null);
    setCurrentView(view);
    const sufijo = data != null ? '/' + encodeURIComponent(JSON.stringify(data)) : '';
    window.location.hash = view === 'valle3d' && !sufijo ? '' : '#' + view + sufijo;
  }, []);

  // ── El botón atrás DE LA APP (no confundir con el del navegador): las
  //    pantallas lo esconden si no reciben `onBack` — sin esto, en una PWA
  //    instalada (sin barra del navegador) el usuario queda atrapado.
  const volverAtras = useCallback(() => {
    if (window.history.length > 1) window.history.back();
    else navigate('valle3d');
  }, [navigate]);

  const irAlInicio = useCallback(() => navigate('valle3d'), [navigate]);

  // ── Listeners de navegación GLOBAL. ScreenShell (el header de ~70 pantallas
  //    2D) despacha `chagra:nav` (botones casa/ayuda/campana) y el flujo del
  //    agente (EntradaValle3D "Pregúntele a su finca…", AcompananteMundo,
  //    SeedingLog…) despacha `chagraNavigate`. Los listeners vivían SOLO en
  //    App.jsx (el shell viejo que main-prod NO monta) → en prod eran botones
  //    muertos: el operador lo cazó ("el botón de casa y el de ayuda no hacen
  //    nada"). Aquí es donde el evento por fin aterriza.
  useEffect(() => {
    const resolver = (view, data) => {
      if (!view) return;
      // En prod 3D-first el INICIO es el valle: el botón casa del ScreenShell
      // pide 'dashboard' (su destino histórico en el shell viejo) — aquí
      // significa "volver a casa". `#dashboard` directo sigue funcionando.
      navigate(view === 'dashboard' ? 'valle3d' : view, data);
    };
    /** @param {Event & { detail?: any }} e — detail: string (formato simple) u objeto { view, data }. */
    const onNavSimple = (e) => {
      const d = e.detail;
      if (typeof d === 'string') resolver(d, null);
      else resolver(d?.view, d?.data ?? null);
    };
    /** @param {Event & { detail?: any }} e — detail: { view, initialData } (AgentFab/EscuchaOverlay/valle). */
    const onNavRico = (e) => resolver(e.detail?.view, e.detail?.initialData ?? e.detail?.data ?? null);
    window.addEventListener('chagra:nav', onNavSimple);
    window.addEventListener('chagraNavigate', onNavRico);
    return () => {
      window.removeEventListener('chagra:nav', onNavSimple);
      window.removeEventListener('chagraNavigate', onNavRico);
    };
  }, [navigate]);

  useEffect(() => {
    const onHash = () => {
      const { view, data } = parseHash();
      // Verificar auth de forma asíncrona real (isAuthenticated es async)
      isAuthenticated().then((autenticado) => {
        // Las rutas 3D y el valle son PÚBLICAS: prod.chagra.app es la vista 3D
        // y su puerta de entrada es el valle, no un formulario (App.jsx:1157
        // hace lo mismo y lo documenta). Solo la finca del campesino pide
        // sesión. Antes este else forzaba 'login' para CUALQUIER vista, así que
        // EntradaValle3D y los 12 mundos eran inalcanzables aunque estuvieran
        // registrados en el LAZY_MAP.
        const publica = !view || view === 'valle3d' || RUTAS.has(view)
          || view === 'login' || view === 'oauth-callback';
        if (autenticado || publica) {
          setNavData(data ?? null);
          setCurrentView(view || 'valle3d');
        } else {
          setCurrentView('login');
        }
      }).catch(() => {
        // Sin poder verificar la sesión, la vista pública sigue siendo pública.
        setNavData(data ?? null);
        setCurrentView(view && RUTAS.has(view) ? view : 'valle3d');
      });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const { view, data } = parseHash();
    isAuthenticated().then((autenticado) => {
      // El navData del deep-link se asienta junto con la vista (asíncrono:
      // un setState síncrono dentro del effect dispara renders en cascada).
      setNavData(data ?? null);
      setAuth(autenticado);
      // prod.chagra.app ES la vista 3D: su puerta es el valle, no un
      // formulario. Las rutas 3D y el valle son PÚBLICAS; lo que pide sesión es
      // la finca del campesino. App.jsx:1157 hace exactamente esto y lo
      // documenta. Antes, este else mandaba a 'login' CUALQUIER vista sin
      // sesión → EntradaValle3D y los 12 mundos eran inalcanzables aunque
      // estuvieran registrados en el LAZY_MAP: construidos y tapados.
      const publica = !view || view === 'valle3d' || RUTAS.has(view);
      if (autenticado) {
        setCurrentView(view || 'valle3d');
      } else if (view === 'oauth-callback') {
        setCurrentView('oauth-callback');
      } else if (publica) {
        setCurrentView(view || 'valle3d');
      } else {
        setCurrentView('login');
      }
    }).catch(() => {
      // Sin poder verificar la sesión, lo público sigue público.
      setAuth(false);
      setCurrentView(view && RUTAS.has(view) ? view : 'valle3d');
    });
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setAuth(true);
    setCurrentView('valle3d');
    window.location.hash = '';
  }, []);

  // ── Loading (auth state aún no determinado) ───────────────────
  if (auth === null || currentView === 'loading') return <ChagraGrowLoader />;

  // ── Auth gate ───────────────────────────────────────────────
  // La raíz SIN sesión aterriza en el valle 3D, igual que el shell clásico
  // (App.jsx:1157): "el valle 3D es el tema de entrada; el login sigue
  // accesible con #login o el botón volver del valle". prod.chagra.app es la
  // vista 3D: tapar la entrada con el formulario 2D hacía inalcanzable a
  // EntradaValle3D — que está registrada en el LAZY_MAP y nunca se dibujaba.
  // Las rutas 3D son públicas; lo que pide sesión es la finca del campesino.
  if (!auth && !RUTAS.has(currentView) && currentView !== 'valle3d'
      && currentView !== 'login' && currentView !== 'oauth-callback') {
    return <Suspense fallback={<ChagraGrowLoader />}><LoginScreen onLoginSuccess={handleLoginSuccess} onSave={() => {}} /></Suspense>;
  }
  if (currentView === 'login') {
    return <Suspense fallback={<ChagraGrowLoader />}><LoginScreen onLoginSuccess={handleLoginSuccess} onSave={() => {}} /></Suspense>;
  }
  if (currentView === 'oauth-callback') {
    return <Suspense fallback={<ChagraGrowLoader />}><OAuthCallback onSuccess={() => navigate('valle3d')} onError={() => navigate('login')} /></Suspense>;
  }

  // ── Router data-driven ────────────────────────────────────
  // 'seguimiento_<key>' es paramétrica: no vive en RUTAS como literal.
  // El path estático 'seguimiento' acepta la key por navData (#seguimiento/"reforestacion").
  const segKey = parseSeguimientoView(currentView)
    || (currentView === 'seguimiento' && typeof navData === 'string' ? navData : null);
  const ruta = segKey ? null : RUTAS.get(currentView);
  const Componente = segKey
    ? /** @type {React.ComponentType<any>} */ (LAZY_MAP.SeguimientoProcesoScreen)
    : (ruta ? ruta.Lazy : RUTAS.get('valle3d')?.Lazy);

  if (!Componente) return <ChagraGrowLoader />;

  // El HOME (valle 3D) no lleva `onBack`: no hay a dónde volver desde casa
  // (las pantallas esconden/muestran su botón según llegue la prop).
  const esHome = !segKey && (!ruta || ruta.path === 'valle3d');

  return (
    <Suspense fallback={<ChagraGrowLoader />}>
      {/* Las pantallas se montaban SIN PROPS: todo CTA interno que llamara
          `onNavigate`/`onBack` quedaba muerto — y el dashboard directamente
          CRASHEABA (onClick={() => onNavigate(...)} sin guard → TypeError →
          ErrorBoundary raíz). Cada componente toma las props que declare e
          ignora el resto (initialContext la usa AgentScreen; initialMundoId,
          el valle en deep-links `#valle3d/"agua"`; procesoKey, el seguimiento
          de procesos; onSave, las pantallas de registro — el shell viejo
          pasaba showToast y prod no pasaba nada). */}
      <Componente
        onBack={esHome ? undefined : volverAtras}
        onHome={irAlInicio}
        onNavigate={navigate}
        onSave={mostrarToast}
        initialData={navData ?? undefined}
        initialContext={navData ?? undefined}
        initialMundoId={esHome && typeof navData === 'string' ? navData : undefined}
        procesoKey={segKey ?? undefined}
      />
      {/* Salida para las vistas-trampa: sin esto, en PWA instalada no hay
          forma de volver (ni barra del navegador ni control propio). */}
      {!esHome && VISTAS_SIN_SALIDA.has(currentView) && (
        <button
          type="button"
          onClick={irAlInicio}
          aria-label="Volver al valle"
          title="Volver al valle"
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
            left: 'calc(env(safe-area-inset-left, 0px) + 10px)',
            zIndex: 60,
            width: 42,
            height: 42,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(15,23,42,0.72)',
            color: '#fff',
            fontSize: 20,
            lineHeight: 1,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          🏠
        </button>
      )}
      {/* Toast del shell (onSave + CustomEvent 'chagraToast'). */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 70,
            maxWidth: 'min(92vw, 480px)',
            padding: '10px 16px',
            borderRadius: 12,
            background: toast.isError ? 'rgba(127,29,29,0.95)' : 'rgba(15,23,42,0.92)',
            border: `1px solid ${toast.isError ? 'rgba(248,113,113,0.5)' : 'rgba(52,211,153,0.4)'}`,
            color: '#f8fafc',
            font: '600 0.85rem/1.35 system-ui, sans-serif',
            boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
          }}
        >
          {toast.message}
        </div>
      )}
      {/* Angelita — el agente vivo en TODA pantalla (orden del operador
          2026-07-16: "Angelita como el agente, jubila el colibrí"). Recibe
          `pantalla` (currentView) para que al tocarla el saludo del agente
          sea sobre ESA pantalla (saludoPantalla.js). Se oculta solo donde
          estorba: cargando (parpadeo de auth), el propio agente (ya está
          ella en grande), la escucha de voz, los mockups de diseño y el
          onboarding guiado — mismo criterio del shell clásico (App.jsx).
          EN EL VALLE (home) NO se monta: allá Angelita YA vive en la escena
          (una sola abeja — feedback del operador 2026-07-16: "se ven 3
          abejitas") y la barra "Pregúntele a su finca…" abre el agente. */}
      {!esHome
        && currentView !== 'loading'
        && currentView !== 'agente'
        && currentView !== 'voz'
        && !currentView.startsWith('mockup_')
        && !currentView.startsWith('onboarding')
        && (
        <AgentFab onNavigate={navigate} pantalla={currentView} />
      )}
      <NetworkStatusBar />
    </Suspense>
  );
}
