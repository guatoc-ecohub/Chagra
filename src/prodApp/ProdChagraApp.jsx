/**
 * ProdChagraApp.jsx — Shell data-driven de prod.chagra.app (3D-first).
 *
 * LEE el manifiesto `src/config/rutasProdChagraApp.js` y monta rutas
 * data-driven. Home (/) = valle 3D. Auth gate (login primero).
 *
 * Usa import.meta.glob con paths EXACTOS (no wildcard) — Vite los
 * resuelve en build-time sin penalizar el build completo.
 */
import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { isAuthenticated } from '../services/authService';
import {
  NUCLEO_3D,
  NUCLEO_APP,
  PENDIENTE_DECISION,
  EXCLUIDO,
} from '../config/rutasProdChagraApp.js';

import ChagraGrowLoader from '../components/ChagraGrowLoader';
const LoginScreen = lazy(() => import('../components/LoginScreen.jsx'));
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
  // NavegadorGrafoDemo y DemoAtmosferaViva: desconectados a propósito (orden
  // del operador) — ver nota en rutasProdChagraApp.js. Archivos intactos.
  RestauracionEnElTiempo: lazy(() => import('../visual/mundo3d/restauracion/RestauracionEnElTiempo.jsx')),
  TransicionesOdysseyDemo: lazy(() => import('../mockups/TransicionesOdysseyDemo.jsx')),
  EscenaPolinizadores: lazy(() => import('../visual/mundo3d/polinizadores/EscenaPolinizadores.jsx')),
  EscenaFaunaEmblematica: lazy(() => import('../visual/mundo3d/fauna/EscenaFaunaEmblematica.jsx')),
  GaleriaConfianza: lazy(() => import('../visual/confianza/GaleriaConfianza.jsx')),
  CuadernoVivo: lazy(() => import('../visual/cuaderno/CuadernoVivo.jsx')),
  PaletaMadreDemo: lazy(() => import('../mockups/PaletaMadreDemo.jsx')),
  ArtesaniaKitDemo: lazy(() => import('../mockups/ArtesaniaKitDemo.jsx')),
  MundoEntBosque: lazy(() => import('../visual/mundo3d/bosque/MundoEntBosque.jsx')),
  MontanaMundosCampesino: lazy(() => import('../mockups/MontanaMundosCampesino.jsx')),
  VitrinaMaestraMundos: lazy(() => import('../mockups/VitrinaMaestraMundos.jsx')),
  MundoScreen: lazy(() => import('../components/MundoScreen.jsx')),
  MundoAbejas3D: lazy(() => import('../mockups/MundoAbejas3D.jsx')),
  MundoGallinero3D: lazy(() => import('../mockups/MundoGallinero3D.jsx')),
  MundoParamo3D: lazy(() => import('../mockups/MundoParamo3D.jsx')),
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
 * @property {React.ComponentType} Lazy
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

// ── Componente principal ────────────────────────────────────────

export default function ProdChagraApp() {
  const [auth, setAuth] = useState(() => {
    try { return isAuthenticated(); } catch { return false; }
  });
  // Estado inicial calculado directo (auth + hash son síncronos): nada de
  // 'loading' + setState en un efecto de montaje — eso causaba un parpadeo
  // del loader Y dispara react-hooks/set-state-in-effect (cascading render).
  const [currentView, setCurrentView] = useState(() => {
    const { view } = parseHash();
    try {
      if (isAuthenticated()) return view || 'valle3d';
    } catch { /* cae a login abajo */ }
    return view === 'oauth-callback' ? 'oauth-callback' : 'login';
  });

  const navigate = useCallback((view) => {
    if (!view || view === 'loading') return;
    setCurrentView(view);
    window.location.hash = view === 'valle3d' ? '' : '#' + view;
  }, []);

  useEffect(() => {
    const onHash = () => {
      const { view } = parseHash();
      if (isAuthenticated() || view === 'login' || view === 'oauth-callback') {
        setCurrentView(view || 'valle3d');
      } else {
        setCurrentView('login');
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setAuth(true);
    setCurrentView('valle3d');
    window.location.hash = '';
  }, []);

  // ── Auth gate ───────────────────────────────────────────────
  if (!auth && currentView !== 'login' && currentView !== 'oauth-callback') {
    return <Suspense fallback={<ChagraGrowLoader />}><LoginScreen onLoginSuccess={handleLoginSuccess} onSave={() => {}} /></Suspense>;
  }
  if (currentView === 'login') {
    return <Suspense fallback={<ChagraGrowLoader />}><LoginScreen onLoginSuccess={handleLoginSuccess} onSave={() => {}} /></Suspense>;
  }
  if (currentView === 'oauth-callback') {
    return <Suspense fallback={<ChagraGrowLoader />}><OAuthCallback onSuccess={() => navigate('valle3d')} onError={() => navigate('login')} /></Suspense>;
  }

  // ── Router data-driven ────────────────────────────────────
  const ruta = RUTAS.get(currentView);
  const Componente = ruta ? ruta.Lazy : RUTAS.get('valle3d')?.Lazy;

  if (!Componente) return <ChagraGrowLoader />;

  return (
    <Suspense fallback={<ChagraGrowLoader />}>
      <Componente />
    </Suspense>
  );
}
