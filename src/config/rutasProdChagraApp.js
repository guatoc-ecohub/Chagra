/**
 * MANIFIESTO DE RUTAS — prod.chagra.app (3D-first)
 * =================================================
 *
 * Este archivo DECLARA (no monta) qué rutas y componentes van al frontend
 * limpio de prod.chagra.app. Es data-driven: el shell de ruteo lo consumirá
 * vía imports sin hardcodear paths en JSX.
 *
 * Tres secciones:
 *   1. NUCLEO        — lo que VA al build de prod.
 *   2. EXCLUIDO      — lo que NO va, con motivo explícito.
 *   3. PENDIENTE_DECISION — bloque inactivo; lo resuelve el operador (Miguel).
 *
 * NO se borra nada del repo. Solo se marca qué entra y qué no.
 *
 * Regenerado a partir del inventario:
 *   INVENTARIO-2D-PROD-CHAGRA-APP.md (rama audit/inventario-rutas)
 * Última actualización: 2026-07-13
 *
 * @module config/rutasProdChagraApp
 */

// ──────────────────────────────────────────────────────────────────
// 1. NUCLEO — Rutas que VAN a prod.chagra.app
// ──────────────────────────────────────────────────────────────────

/**
 * Cada entrada:
 * @property {string}  path         — ruta interna (coincide con `case '<path>':` en App.jsx)
 * @property {string}  componente   — nombre del componente (para documentación)
 * @property {string}  importLazy   — path del import() dinámico (relativo a src/)
 * @property {'3D'|'2D-app'|'auth'} categoria
 */

/** @type {Array<{path:string, alias?:string[], componente:string, importLazy:string|null, categoria:string}>} */
export const NUCLEO_3D = [
  // ── Vistas principales 3D ──────────────────────────────────────
  {
    path: 'valle3d',
    componente: 'EntradaValle3D',
    importLazy: 'src/mockups/EntradaValle3D.jsx',
    categoria: '3D',
  },
  {
    path: 'valle3d_noche',
    componente: 'ValleNoche3D',
    importLazy: 'src/mockups/ValleNoche3D.jsx',
    categoria: '3D',
  },
  {
    path: 'valle3d_lluvia',
    componente: 'ValleLluvia3D',
    importLazy: 'src/mockups/ValleLluvia3D.jsx',
    categoria: '3D',
  },
  {
    path: 'ventana_valle',
    componente: 'VentanaValle3D',
    importLazy: 'src/components/VentanaValle3D.jsx',
    categoria: '3D',
  },

  // ── Vista global (Sierra Nevada) — la MONTAÑA 3D que se orbita ────────
  // Macizo con relieve real: los pisos como terreno (color por altura + veg
  // instanciada), la cámara la recorre girando, y tocar una zona entra a su
  // mundo. Reemplaza el corte vertical (que se lee como lámina; se GUARDA en
  // `sierra_corte` como vista-mapa por si se quiere comparar).
  {
    path: 'sierra_global',
    alias: ['sierra', 'vista_sierra'],
    componente: 'SierraMonte3D',
    importLazy: 'src/visual/mundo3d/sierra/SierraMonte3D.jsx',
    categoria: '3D',
  },
  // El corte vertical, GUARDADO y accesible: la vista-mapa estática de la
  // geografía (SierraMonte3D enlaza aquí con "Ver el corte de geografía").
  {
    path: 'sierra_corte',
    alias: ['sierra_lamina', 'vista_sierra_corte'],
    componente: 'SierraCorteVertical',
    importLazy: 'src/visual/mundo3d/sierra/SierraCorteVertical.jsx',
    categoria: '3D',
  },
  // Los mundos de cultivo por piso térmico — navegables y PÚBLICOS en prod
  // (el arte estaba solo cableado en App.jsx / shell clásico).
  {
    path: 'cafetal_vivo',
    alias: ['cafetal', 'mundo_cafe', 'cafetal-vivo-3d'],
    componente: 'CafetalVivo3D',
    importLazy: 'src/mockups/CafetalVivo3D.jsx',
    categoria: '3D',
  },
  {
    path: 'cacao_vivo',
    alias: ['cacao', 'mundo_cacao', 'cacao-vivo-3d'],
    componente: 'CacaoVivo3D',
    importLazy: 'src/mockups/CacaoVivo3D.jsx',
    categoria: '3D',
  },
  {
    path: 'papa_vivo',
    alias: ['papa', 'mundo_papa', 'papa-viva-3d'],
    componente: 'PapaVivo3D',
    importLazy: 'src/mockups/PapaVivo3D.jsx',
    categoria: '3D',
  },
  {
    path: 'mundo_piscicultura',
    alias: ['piscicultura', 'mundo_peces', 'mundo-piscicultura-3d'],
    componente: 'MundoPiscicultura3D',
    importLazy: 'src/mockups/MundoPiscicultura3D.jsx',
    categoria: '3D',
  },
  {
    path: 'lecheria_viva',
    alias: ['lecheria', 'mundo_lecheria', 'lecheria-viva-3d'],
    componente: 'LecheriaViva3D',
    importLazy: 'src/mockups/LecheriaViva3D.jsx',
    categoria: '3D',
  },
  // El MUNDO DE LOS POLINIZADORES — la finca completa (rincón de monte,
  // meliponario, cerca viva florida, maracuyá, ahuyama, cafetal y maizal) con
  // la red de polen tejiéndose entre las ocho especies. El arte estaba
  // completo en `visual/mundo3d/polinizadores/` pero nada lo montaba (hallazgo
  // #1 del audit de biodiversidad 3D, 2026-07-16: cero rutas, cero
  // componentMap).
  {
    path: 'mundo_polinizadores',
    alias: ['polinizadores', 'mundo_polinizadores_3d', 'polinizadores-vivo-3d'],
    componente: 'MundoPolinizadores3D',
    importLazy: 'src/mockups/MundoPolinizadores3D.jsx',
    categoria: '3D',
  },


  // ── Arte nuevo — en revisión del operador (2026-07-14) ─────────
  {
    path: 'grafo_navegador',
    alias: ['grafo', 'constelacion'],
    componente: 'NavegadorGrafoDemo',
    importLazy: 'src/mockups/NavegadorGrafoDemo.jsx',
    categoria: '3D',
  },
  {
    path: 'restauracion',
    alias: ['restaurar', 'monte_vuelve'],
    componente: 'RestauracionEnElTiempo',
    importLazy: 'src/visual/mundo3d/restauracion/RestauracionEnElTiempo.jsx',
    categoria: '3D',
  },
  {
    path: 'atmosfera',
    alias: ['dia_vivo', 'hora'],
    componente: 'DemoAtmosferaViva',
    importLazy: 'src/visual/mundo3d/atmosfera/DemoAtmosferaViva.jsx',
    categoria: '3D',
  },
  {
    path: 'transiciones',
    alias: ['odyssey', 'velo'],
    componente: 'TransicionesOdysseyDemo',
    importLazy: 'src/mockups/TransicionesOdysseyDemo.jsx',
    categoria: '3D',
  },

  // ── El Bosque Vivo — Ent queñua landmark + microsuelo (capas) ──
  {
    path: 'bosque_vivo',
    alias: ['bosque', 'bosque_vivo_3d', 'ent', 'quenua'],
    componente: 'MundoEntBosque',
    importLazy: 'src/visual/mundo3d/bosque/MundoEntBosque.jsx',
    categoria: '3D',
  },

  // ── Navegación por piso térmico ────────────────────────────────
  {
    path: 'montana_mundos',
    componente: 'MontanaMundosCampesino',
    importLazy: 'src/mockups/MontanaMundosCampesino.jsx',
    categoria: '3D',
  },

  // ── Puerta maestra a los mundos (15, por piso térmico) ─────────
  {
    path: 'vitrina_maestra',
    // alias mockup_vitrina_maestra: MundosDeMiFinca (dashboard) navega con el
    // nombre viejo — sin el alias esa tile era un tap muerto en prod
    // (barrido de controles 2026-07-15).
    alias: ['mockup_vitrina_maestra'],
    componente: 'VitrinaMaestraMundos',
    importLazy: 'src/mockups/VitrinaMaestraMundos.jsx',
    categoria: '3D',
  },

  // ── Mundo 3D genérico (mountea cualquier mundoId de mundoData.js) ─
  {
    path: 'mundo',
    componente: 'MundoScreen',
    importLazy: 'src/components/MundoScreen.jsx',
    categoria: '3D',
  },

  // ── Dioramas 3D autocontenidos (fuera del sistema MUNDO) ──────
  {
    path: 'diorama_abejas',
    componente: 'MundoAbejas3D',
    importLazy: 'src/mockups/MundoAbejas3D.jsx',
    categoria: '3D',
  },
  {
    path: 'diorama_gallinero',
    componente: 'MundoGallinero3D',
    importLazy: 'src/mockups/MundoGallinero3D.jsx',
    categoria: '3D',
  },
  {
    path: 'diorama_paramo',
    componente: 'MundoParamo3D',
    importLazy: 'src/mockups/MundoParamo3D.jsx',
    categoria: '3D',
  },
  {
    path: 'diorama_botica_cana',
    componente: 'MundoBoticaCana3D',
    importLazy: 'src/mockups/MundoBoticaCana3D.jsx',
    categoria: '3D',
  },
  {
    path: 'diorama_frutales',
    componente: 'MundoFrutales3D',
    importLazy: 'src/mockups/MundoFrutales3D.jsx',
    categoria: '3D',
  },
  {
    path: 'diorama_leguminosas',
    componente: 'MundoLeguminosas3D',
    importLazy: 'src/mockups/MundoLeguminosas3D.jsx',
    categoria: '3D',
  },
  {
    path: 'diorama_piscicultura',
    componente: 'MundoPiscicultura3D',
    importLazy: 'src/mockups/MundoPiscicultura3D.jsx',
    categoria: '3D',
  },
  {
    path: 'diorama_semillero',
    componente: 'MundoSemillero3D',
    importLazy: 'src/mockups/MundoSemillero3D.jsx',
    categoria: '3D',
  },
  {
    path: 'diorama_agua',
    componente: 'MundoAgua3D',
    importLazy: 'src/mockups/MundoAgua3D.jsx',
    categoria: '3D',
  },
  {
    path: 'diorama_suelo',
    componente: 'MundoSueloVivo3D',
    importLazy: 'src/mockups/MundoSueloVivo3D.jsx',
    categoria: '3D',
  },
  {
    path: 'diorama_compost',
    componente: 'MundoCompost3D',
    importLazy: 'src/mockups/MundoCompost3D.jsx',
    categoria: '3D',
  },
  {
    path: 'diorama_fermentos',
    componente: 'MundoFermentos3D',
    importLazy: 'src/mockups/MundoFermentos3D.jsx',
    categoria: '3D',
  },
  {
    path: 'diorama_microfauna',
    componente: 'MundoMicrofauna3D',
    importLazy: 'src/mockups/MundoMicrofauna3D.jsx',
    categoria: '3D',
  },
  {
    path: 'subsuelo',
    // alias mundo3d_micorrizas: la tile "suelo vivo 3D" de mundosFinca.js usa
    // el nombre del shell viejo; en prod el mundo micorrízico es el subsuelo
    // (misma decisión que wire3DNav, PR #2479).
    alias: ['mundo3d_micorrizas'],
    componente: 'MundoSubsuelo',
    importLazy: 'src/components/juego/MundoSubsuelo.jsx',
    categoria: '3D',
  },

  // ── Soporte 3D (cámara, transiciones, efectos) ─────────────────
  {
    path: 'camara_director',
    componente: 'CamaraDirectorDemo',
    importLazy: 'src/mockups/CamaraDirectorDemo.jsx',
    categoria: '3D',
  },
  {
    path: 'artesania_andina',
    componente: 'ArtesaniaAndinaDemo',
    importLazy: 'src/mockups/ArtesaniaAndinaDemo.jsx',
    categoria: '3D',
  },
  {
    path: 'efectos_funcionales',
    componente: 'EfectosFuncionalesDemo',
    importLazy: 'src/mockups/EfectosFuncionalesDemo.jsx',
    categoria: '3D',
  },
  {
    path: 'catalogo_infra',
    componente: 'CatalogoInfraDemo',
    importLazy: 'src/mockups/CatalogoInfraDemo.jsx',
    categoria: '3D',
  },
  {
    path: 'colocar_infra',
    componente: 'ColocarInfraestructura',
    importLazy: 'src/mockups/ColocarInfraestructura.jsx',
    categoria: '3D',
  },
  {
    path: 'gemelos_2d',
    componente: 'GemelosMundos2D',
    importLazy: 'src/mockups/GemelosMundos2D.jsx',
    categoria: '3D',
  },
  {
    path: 'aliados_finca',
    componente: 'AliadosFinca3D',
    importLazy: 'src/mockups/AliadosFinca3D.jsx',
    categoria: '3D',
  },
  {
    path: 'momento_venta',
    componente: 'MomentoVentaMercado3D',
    importLazy: 'src/mockups/MomentoVentaMercado3D.jsx',
    categoria: '3D',
  },
  {
    path: 'new_donk',
    componente: 'NewDonk2Den3D',
    importLazy: 'src/mockups/NewDonk2Den3D.jsx',
    categoria: '3D',
  },
  {
    path: 'murales_new_donk',
    componente: 'MuralesNewDonk',
    importLazy: 'src/mockups/MuralesNewDonk.jsx',
    categoria: '3D',
  },
];

/** @type {Array<{path:string, alias?:string[], componente:string, importLazy:string|null, categoria:string}>} */
export const NUCLEO_APP = [
  // ── Auth ────────────────────────────────────────────────────────
  {
    path: 'loading',
    componente: 'ChagraGrowLoader',
    importLazy: null, // static — está en main.jsx
    categoria: 'auth',
  },
  {
    path: 'login',
    componente: 'LoginScreen',
    importLazy: 'src/components/LoginScreen.jsx',
    categoria: 'auth',
  },
  {
    path: 'oauth-callback',
    componente: 'OAuthCallback',
    importLazy: 'src/components/OAuthCallback.jsx',
    categoria: 'auth',
  },

  // ── Home / Dashboard ───────────────────────────────────────────
  {
    path: 'dashboard',
    componente: 'DashboardLive',
    importLazy: 'src/components/dashboard/DashboardLive.jsx',
    categoria: '2D-app',
  },
  {
    path: 'ubicacion-detectada',
    componente: 'LocationDetectedScreen',
    importLazy: 'src/components/LocationDetectedScreen.jsx',
    categoria: '2D-app',
  },

  // ── Agente IA ──────────────────────────────────────────────────
  {
    path: 'agente',
    componente: 'AgentScreen',
    importLazy: 'src/components/AgentScreen/AgentScreen.jsx',
    categoria: '2D-app',
  },

  // ── Perfil + Avatar ────────────────────────────────────────────
  {
    path: 'perfil',
    componente: 'ProfileScreen',
    importLazy: 'src/components/ProfileScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'espiritu_pro',
    componente: 'EspirituProScreen',
    importLazy: 'src/components/EspirituProScreen.jsx',
    categoria: '2D-app',
  },

  // ── Onboarding ──────────────────────────────────────────────────
  {
    path: 'onboarding-perfil',
    componente: 'OnboardingProfile',
    importLazy: 'src/components/OnboardingProfile.jsx',
    categoria: '2D-app',
  },

  // ── Hoy en la finca / Evolución ─────────────────────────────────
  {
    path: 'hoy_finca',
    componente: 'HoyEnFincaScreen',
    importLazy: 'src/components/hoy/HoyEnFincaScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'evolucion',
    componente: 'MiFincaEvolucionScreen',
    importLazy: 'src/components/hoy/MiFincaEvolucionScreen.jsx',
    categoria: '2D-app',
  },

  // ── Directorio de especies ─────────────────────────────────────
  {
    path: 'directorio',
    alias: ['especies', 'plagas'],
    componente: 'DirectorioEspeciesScreen',
    importLazy: 'src/components/DirectorioEspecies/DirectorioEspeciesScreen.jsx',
    categoria: '2D-app',
  },

  // ── Gestión de finca: siembra / cosecha / insumos ──────────────
  {
    path: 'sembrar',
    componente: 'SeedingLog',
    importLazy: 'src/components/SeedingLog.jsx',
    categoria: '2D-app',
  },
  {
    path: 'cosechar',
    componente: 'HarvestLog',
    importLazy: 'src/components/HarvestLog.jsx',
    categoria: '2D-app',
  },
  {
    path: 'insumos',
    componente: 'InputLog',
    importLazy: 'src/components/InputLog.jsx',
    categoria: '2D-app',
  },
  {
    path: 'observacion',
    componente: 'ObservationScreen',
    importLazy: 'src/components/ObservationScreen.jsx',
    categoria: '2D-app',
  },

  // ── Registro unificado + voz ───────────────────────────────────
  {
    path: 'registro_unificado',
    componente: 'RegistroUnificadoScreen',
    importLazy: 'src/components/RegistroUnificadoScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'voz',
    alias: ['registro_voz', 'voz_planta'],
    componente: 'RegistroVozScreen',
    importLazy: 'src/components/RegistroVozScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'procesos',
    componente: 'ProcesosPorVozScreen',
    importLazy: 'src/components/ProcesosPorVozScreen.jsx',
    categoria: '2D-app',
  },

  // ── Activos / inventario ───────────────────────────────────────
  {
    path: 'activos',
    alias: ['gestionar'],
    componente: 'AssetsDashboard',
    importLazy: 'src/components/AssetsDashboard.jsx',
    categoria: '2D-app',
  },
  {
    path: 'bodega',
    componente: 'InventoryPage',
    importLazy: 'src/pages/InventoryPage.jsx',
    categoria: '2D-app',
  },
  {
    path: 'plant_asset',
    componente: 'AssetDetailView (embebido en AssetsDashboard)',
    importLazy: null,
    categoria: '2D-app',
  },

  // ── Tareas ─────────────────────────────────────────────────────
  {
    path: 'new_task',
    alias: ['edit_task', 'task_log'],
    componente: 'TaskScreen',
    importLazy: 'src/components/TaskScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'seguimiento',
    componente: 'SeguimientoProcesoScreen',
    importLazy: 'src/components/SeguimientoProcesoScreen.jsx',
    categoria: '2D-app',
  },

  // ── Bitácora ───────────────────────────────────────────────────
  {
    path: 'bitacora',
    alias: ['historial', 'bitacora_detail'],
    componente: 'BitacoraEntryDetail',
    importLazy: 'src/components/BitacoraEntryDetail.jsx',
    categoria: '2D-app',
  },

  // ── Clima / Agua / Suelo ───────────────────────────────────────
  {
    path: 'clima_boletin',
    componente: 'ClimaBoletinScreen',
    importLazy: 'src/components/clima/ClimaBoletinScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'agua',
    componente: 'AguaScreen',
    importLazy: 'src/components/agua/AguaScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'suelo',
    componente: 'SoilDiagnosticScreen',
    importLazy: 'src/components/SoilDiagnosticScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'salud_suelo',
    componente: 'SaludSueloScreen',
    importLazy: 'src/components/SaludSueloScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'cromatografia',
    componente: 'CromatografiaScreen',
    importLazy: 'src/components/CromatografiaScreen.jsx',
    categoria: '2D-app',
  },

  // ── Cultivos (pantallas 2D por especie) ────────────────────────
  {
    path: 'mundo_cultivos',
    componente: 'MundoCultivosHub',
    importLazy: 'src/components/cultivos/MundoCultivosHub.jsx',
    categoria: '2D-app',
  },
  {
    path: 'cafe',
    componente: 'CafeScreen',
    importLazy: 'src/components/cafe/CafeScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'cacao',
    componente: 'CacaoScreen',
    importLazy: 'src/components/cacao/CacaoScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'platano',
    componente: 'PlatanoBananoScreen',
    importLazy: 'src/components/PlatanoBananoScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'aguacate',
    componente: 'AguacateScreen',
    importLazy: 'src/components/aguacate/AguacateScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'citricos',
    componente: 'CitricosScreen',
    importLazy: 'src/components/citricos/CitricosScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'cana',
    componente: 'CanaScreen',
    importLazy: 'src/components/cana/CanaScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'mango',
    componente: 'MangoScreen',
    importLazy: 'src/components/mango/MangoScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'uchuva',
    componente: 'UchuvaScreen',
    importLazy: 'src/components/uchuva/UchuvaScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'frutales',
    componente: 'FrutalesScreen',
    importLazy: 'src/components/frutales/FrutalesScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'hortalizas',
    componente: 'HortalizasScreen',
    importLazy: 'src/components/HortalizasScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'tuberculos',
    componente: 'TuberculosScreen',
    importLazy: 'src/components/TuberculosScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'aromaticas',
    componente: 'AromaticasScreen',
    importLazy: 'src/components/aromaticas/AromaticasScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'botica',
    componente: 'BoticaScreen',
    importLazy: 'src/components/botica/BoticaScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'fique',
    componente: 'FiqueScreen',
    importLazy: 'src/components/fique/FiqueScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'milpa_cultivo',
    componente: 'MilpaScreen',
    importLazy: 'src/components/milpa/MilpaScreen.jsx',
    categoria: '2D-app',
  },
  {
    // Mundo "Quinua y granos andinos" — estaba en el shell viejo (case
    // 'quinua' + tile en mundosFinca.js) y NO estaba en EXCLUIDO: omisión del
    // manifiesto, no decisión. Sin esta entrada la tile del hub de cultivos
    // era un tap muerto en prod (barrido de controles 2026-07-15).
    path: 'quinua',
    alias: ['granos-andinos', 'quinoa'],
    componente: 'QuinuaScreen',
    importLazy: 'src/components/quinua/QuinuaScreen.jsx',
    categoria: '2D-app',
  },

  // ── Sanidad ────────────────────────────────────────────────────
  {
    path: 'sanidad_sintoma',
    componente: 'SanidadSintomaScreen',
    importLazy: 'src/components/sanidad/SanidadSintomaScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'reportar_invasora',
    componente: 'InvasiveObservationLog',
    importLazy: 'src/components/InvasiveObservationLog.jsx',
    categoria: '2D-app',
  },
  {
    path: 'toxicologia',
    componente: 'ToxicologiaScreen',
    importLazy: 'src/components/ToxicologiaScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'mantenimiento',
    componente: 'MaintenanceScreen',
    importLazy: 'src/components/MaintenanceScreen.jsx',
    categoria: '2D-app',
  },

  // ── Ciclo del cultivo ──────────────────────────────────────────
  {
    path: 'ciclo',
    componente: 'CicloCultivoScreen',
    importLazy: 'src/components/CicloCultivoScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'germinacion',
    componente: 'GerminacionScreen',
    importLazy: 'src/components/GerminacionScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'ciclo_nutrientes',
    componente: 'CicloNutrientesScreen',
    importLazy: 'src/components/CicloNutrientesScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'ciclo_vivo',
    componente: 'CicloVivoFullView',
    importLazy: 'src/components/CicloVivo/CicloVivoFullView.jsx',
    categoria: '2D-app',
  },

  // ── Calendario / Almanaque ─────────────────────────────────────
  {
    path: 'calendario_finca',
    alias: ['calendario'],
    componente: 'CalendarioFincaScreen',
    importLazy: 'src/components/CalendarioFincaScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'ano_finca',
    componente: 'AnoFincaScreen',
    importLazy: 'src/components/anofinca/AnoFincaScreen.jsx',
    categoria: '2D-app',
  },

  // ── Semilla / Poscosecha / Almacenamiento ─────────────────────
  {
    path: 'semilla',
    componente: 'SemillaScreen',
    importLazy: 'src/components/semilla/SemillaScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'poscosecha',
    componente: 'PoscosechaScreen',
    importLazy: 'src/components/PoscosechaScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'almacenamiento',
    componente: 'AlmacenamientoScreen',
    importLazy: 'src/components/AlmacenamientoScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'mi_cosecha',
    componente: 'MiCosechaScreen',
    importLazy: 'src/components/cosecha/MiCosechaScreen.jsx',
    categoria: '2D-app',
  },

  // ── Nutrición ──────────────────────────────────────────────────
  {
    path: 'nutricion',
    componente: 'NutricionHumanaScreen',
    importLazy: 'src/components/NutricionHumanaScreen.jsx',
    categoria: '2D-app',
  },

  // ── Animales ───────────────────────────────────────────────────
  {
    path: 'animales',
    componente: 'AnimalesScreen',
    importLazy: 'src/components/AnimalesScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'animales_gallinas',
    componente: 'GallinasScreen',
    importLazy: 'src/components/GallinasScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'animales_abejas',
    componente: 'AbejasScreen',
    importLazy: 'src/components/AbejasScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'animales_vacas',
    componente: 'VacasScreen',
    importLazy: 'src/components/VacasScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'animales_conejos',
    componente: 'ConejosScreen',
    importLazy: 'src/components/ConejosScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'animales_caprinos',
    componente: 'CaprinosScreen',
    importLazy: 'src/components/CaprinosScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'estiercol',
    componente: 'EstiercolScreen',
    importLazy: 'src/components/EstiercolScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'compost',
    componente: 'CompostScreen',
    importLazy: 'src/components/CompostScreen.jsx',
    categoria: '2D-app',
  },

  // ── Biopreparados / Fermentos ─────────────────────────────────
  {
    path: 'biopreparados',
    componente: 'BiopreparadosScreen',
    importLazy: 'src/components/biopreparados/BiopreparadosScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'fermentos',
    componente: 'FermentosView',
    importLazy: 'src/components/FermentosView.jsx',
    categoria: '2D-app',
  },

  // ── Biodiversidad / Asociaciones ───────────────────────────────
  {
    path: 'biodiversidad',
    componente: 'BiodiversidadView',
    importLazy: 'src/components/BiodiversidadView.jsx',
    categoria: '2D-app',
  },
  {
    path: 'asociaciones',
    componente: 'Asociaciones',
    importLazy: 'src/components/Asociaciones.jsx',
    categoria: '2D-app',
  },

  // ── Restauración ecológica ────────────────────────────────────
  {
    path: 'restauracion',
    componente: 'RestauracionScreen',
    importLazy: 'src/components/restauracion/RestauracionScreen.jsx',
    categoria: '2D-app',
  },

  // ── Mapa ───────────────────────────────────────────────────────
  {
    path: 'mapa',
    componente: 'FarmMap',
    importLazy: 'src/components/FarmMap.jsx',
    categoria: '2D-app',
  },

  // ── Informes ───────────────────────────────────────────────────
  {
    path: 'informes',
    componente: 'InformesScreen',
    importLazy: 'src/components/InformesScreen.jsx',
    categoria: '2D-app',
  },

  // ── Glaciar (La Cordada) ───────────────────────────────────────
  {
    path: 'glaciar',
    componente: 'GlaciarReporteScreen',
    importLazy: 'src/components/GlaciarReporteScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'glaciar_historial',
    componente: 'GlaciarHistorialScreen',
    importLazy: 'src/components/GlaciarHistorialScreen.jsx',
    categoria: '2D-app',
  },

  // ── Extensionista ──────────────────────────────────────────────
  {
    path: 'extensionista',
    componente: 'ExtensionistaScreen',
    importLazy: 'src/components/ExtensionistaScreen.jsx',
    categoria: '2D-app',
  },

  // ── Casos de estudio ───────────────────────────────────────────
  {
    path: 'casos',
    componente: 'CaseStudyScreen',
    importLazy: 'src/components/CaseStudyScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'caso_detail',
    componente: 'CaseStudyDetail',
    importLazy: 'src/components/CaseStudyDetail.jsx',
    categoria: '2D-app',
  },

  // ── FAQ / Ayuda / Aprende / Curso ─────────────────────────────
  {
    path: 'faq',
    alias: ['help', 'ayuda'],
    componente: 'FaqScreen',
    importLazy: 'src/components/FaqScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'aprende',
    componente: 'AprenderConAgente',
    importLazy: 'src/components/Aprende/AprenderConAgente.jsx',
    categoria: '2D-app',
  },
  {
    path: 'curso',
    componente: 'CursoChagra',
    importLazy: 'src/components/curso/CursoChagra.jsx',
    categoria: '2D-app',
  },

  // ── Juegos (promovidos de PENDIENTE, smoke-test OK 2026-07-14) ─
  {
    // LA SALA DE JUEGOS — el hub que hace VISIBLES los 9 juegos (feedback del
    // operador 2026-07-16: "no veo los juegos"). Enlazado desde Aprender
    // (SalaJuegosBanner) y con deep-link directo #juegos.
    path: 'juegos',
    alias: ['sala_juegos', 'hub_juegos'],
    componente: 'HubJuegos',
    importLazy: 'src/components/juego/HubJuegos.jsx',
    categoria: '2D-app',
  },
  {
    path: 'juego',
    componente: 'MiFincaVivaScreen',
    importLazy: 'src/components/juego/MiFincaVivaScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'defensores',
    componente: 'DefensoresFincaScreen',
    importLazy: 'src/components/juego/DefensoresFincaScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'milpa',
    componente: 'MilpaSimulator',
    importLazy: 'src/components/juego/MilpaSimulator.jsx',
    categoria: '2D-app',
  },
  {
    path: 'doom_finca',
    componente: 'DoomFincaScreen',
    importLazy: 'src/components/juego/DoomFincaScreen.jsx',
    categoria: '2D-app',
  },
  {
    path: 'metal_slug_campo',
    alias: ['mockup_metal_slug_campo'],
    componente: 'MetalSlugCampo',
    importLazy: 'src/mockups/MetalSlugCampo.jsx',
    categoria: '2D-app',
  },
  {
    // Fusionado DENTRO de MilpaSimulator como "modo ilustrado" (audit juegos
    // 2026-07-16). Se mantiene la ruta/alias para el deep-link directo, pero el
    // hub MiFincaViva ya no lo lista como entrada aparte (una sola Milpa).
    path: 'juego_la_milpa',
    alias: ['mockup_juego_la_milpa'],
    componente: 'JuegoLaMilpa',
    importLazy: 'src/mockups/JuegoLaMilpa.jsx',
    categoria: '2D-app',
  },
  {
    // Promovido de URL-only (#/mockups/juego-mi-finca) a ruta de primera clase
    // + enlace desde el hub (audit juegos 2026-07-16). La joya 2D↔3D Odyssey.
    path: 'finca_odyssey',
    alias: ['mockup_juego_mi_finca'],
    componente: 'JuegoMiFincaOdyssey',
    importLazy: 'src/mockups/JuegoMiFincaOdyssey.jsx',
    categoria: '2D-app',
  },
  {
    // Rescatado de huérfano total sin ruta (audit juegos 2026-07-16). AGR 9.
    path: 'mono_vs_poli',
    componente: 'MonoVsPoliSimulator',
    importLazy: 'src/components/juego/MonoVsPoliSimulator.jsx',
    categoria: '2D-app',
  },

  // ── Mercado / Red humana ──────────────────────────────────────
  // (ver PENDIENTE_DECISION abajo)
];

// ──────────────────────────────────────────────────────────────────
// 2. EXCLUIDO — Rutas que NO van a prod.chagra.app
// ──────────────────────────────────────────────────────────────────

/**
 * Cada entrada:
 * @property {string} path — ruta que se excluye
 * @property {string} motivo — razón de una línea para exclusión
 */

/** @type {Array<{path:string, motivo:string}>} */
export const EXCLUIDO = [
  // ── Dev tools ──────────────────────────────────────────────────
  {
    path: 'mockup_visual_lib',
    motivo: 'Storybook interno de dev; cero valor para usuario final.',
  },
  {
    path: 'usage_stats',
    motivo: 'Dashboard de telemetría interna; dev tool, no producto.',
  },

  // ── Temas viejos del dashboard ─────────────────────────────────
  {
    path: 'biopunk_background',
    motivo: 'Fondo canvas del tema biopunk. En 3D-first el fondo es el valle 3D.',
  },
  {
    path: 'scene_finca_organismo',
    motivo: 'Tema bioluminiscente "finca como organismo" legacy. Reemplazado por valle 3D.',
  },
  {
    path: 'scene_finca_nature',
    motivo: 'Tema nature/verde legacy. Reemplazado por valle 3D.',
  },
  {
    path: 'scene_huerto_vivo',
    motivo: 'Tema huerto legacy. Reemplazado por valle 3D.',
  },
  {
    path: 'scene_trazo_minimal',
    motivo: 'Tema minimalista legacy. Reemplazado por valle 3D.',
  },
  {
    path: 'panel_vitalidad',
    motivo: 'Panel de vitalidad del tema biopunk viejo. No va en 3D-first.',
  },
  {
    path: 'reloj_frailejon',
    motivo: 'Reloj frailejón del tema viejo. Reemplazado por CielosHora + CicloDia.',
  },
  {
    path: 'arbol_de_mundos',
    motivo: 'Árbol de navegación viejo. Reemplazado por MontanaMundosCampesino.',
  },
  {
    path: 'mano_chagra_glyph',
    motivo: 'Glifo de mano del tema viejo. Decorativo innecesario.',
  },

  // ── Duplicados de Entrada ──────────────────────────────────────
  {
    path: 'mockup_entrada_campesina',
    motivo: 'Duplicado de EntradaValle3D. EntradaValle3D es la definitiva.',
  },
  {
    path: 'mockup_home_campesino',
    motivo: 'Home duplicado. DashboardLive + AgentHero es el home real.',
  },

  // ── Navegación duplicada ───────────────────────────────────────
  {
    path: 'mockup_montana_mundos',
    motivo: 'MontanaMundos pass 1 (vieja). Reemplazada por MontanaMundosCampesino.',
  },
  {
    path: 'mockup_montana_mundos_cine',
    motivo: 'MontanaMundos pass 3 (cinematográfica). Reemplazada por Campesino.',
  },

  // ── Botón Ⓐ (prototipo) ────────────────────────────────────────
  {
    path: 'mockup_boton_anarquia',
    motivo: 'Prototipo de FAB Ⓐ. Ya integrado como AgentFab real.',
  },

  // ── Juegos de avatar experimentales ────────────────────────────
  {
    path: 'mockup_avatar_biopunk',
    motivo: 'Experimento de juego de avatar (variante biopunk). Ya existe Espíritu Guardián real.',
  },
  {
    path: 'mockup_avatar_verde_vivo',
    motivo: 'Experimento de juego de avatar (variante verde-vivo). Duplicado.',
  },
  {
    path: 'mockup_avatar_libre',
    motivo: 'Experimento de juego de avatar (variante libre). Duplicado.',
  },

  // ── Prototipos reemplazados ────────────────────────────────────
  {
    path: 'mockup_mapa_acuarela',
    motivo: 'Prototipo de mapa en acuarela. Reemplazado por FarmMap + MapPicker reales.',
  },
  {
    path: 'mockup_clima_atmosfera',
    motivo: 'Prototipo clima-atmósfera. Reemplazado por ClimaBoletinScreen + EscenaBoveda.',
  },
  {
    path: 'mockup_dia_en_finca',
    motivo: 'Prototipo "día en la finca". Reemplazado por HoyEnFincaScreen.',
  },
  {
    path: 'mockup_salud_finca',
    motivo: 'Prototipo salud finca. Ya integrado en DashboardLive.',
  },
  {
    path: 'mockup_primer_cultivo',
    motivo: 'Onboarding viejo. Reemplazado por OnboardingProfile/OnboardingCondensado.',
  },
  {
    path: 'mockup_guardianes',
    motivo: 'Prototipo guardianes narrativos. Ya integrado en Espíritu Guardián.',
  },
  {
    path: 'mockup_hoja_vida_mata',
    motivo: 'Prototipo hoja de vida de mata. Integrado en AssetDetailView + CicloMata.',
  },
  {
    path: 'mockup_diagnostico_foto',
    motivo: 'Prototipo diagnóstico sobre foto. Funcionalidad en ObservationScreen.',
  },
  {
    path: 'mockup_evidencia_ilustrada',
    motivo: 'Prototipo evidencia ilustrada. Integrado en AgentScreen (responseGuards).',
  },

  // ── Componentes específicos ────────────────────────────────────
  {
    path: 'javier',
    motivo: 'Dashboard del trabajador "Javier". Rol específico, no genérico.',
  },
  {
    path: 'auditoria_inventario',
    motivo: 'Auditoría avanzada de inventario. Funcionalidad de nicho.',
  },

  // ── Banners (ya integrados en el shell, no son rutas) ──────────
  {
    path: '_banners',
    motivo: 'IosInstallBanner, AndroidInstallBanner, UpdateAvailableBanner, DemoModeBanner, GpsFincaBanner, DataLossBanner, CriticalAlertBanner: son overlays del shell, no rutas navegables.',
  },
];

// ──────────────────────────────────────────────────────────────────
// 3. PENDIENTE_DECISION — Lo resuelve Miguel (el operador)
// ──────────────────────────────────────────────────────────────────

/**
 * Bloque INACTIVO. Cada entrada tiene `decision: null`. El operador
 * llena `decision: 'incluir' | 'excluir'` cuando resuelva.
 *
 * @property {string}  path
 * @property {string}  componente
 * @property {string}  importLazy
 * @property {'incluir'|'excluir'|null} decision
 * @property {string}  motivo
 */

/** @type {Array<{path:string, alias?:string[], componente:string, importLazy:string|null, decision:null, motivo:string}>} */
export const PENDIENTE_DECISION = [
  // ── Onboarding: ¿Profile o Siembra (mockup)? ──────────────────
  {
    path: 'onboarding-perfil-clasico',
    componente: 'OnboardingCondensado',
    importLazy: 'src/components/OnboardingCondensado.jsx',
    decision: null,
    motivo: 'Variante clásica del onboarding. Decidir si convive con OnboardingProfile o se elimina.',
  },
  {
    path: 'mockup_onboarding_siembra',
    componente: 'OnboardingSiembra',
    importLazy: 'src/mockups/OnboardingSiembra.jsx',
    decision: null,
    motivo: 'Onboarding como ritual de siembra (SVG animado). ¿Reemplaza o complementa OnboardingProfile?',
  },

  // ── Juegos PROMOVIDOS a NUCLEO_APP (smoke-test OK, 2026-07-14) ─
  // Los 6 juegos + Metal Slug mockup pasaron smoke test sin crash.
  // Movidos a NUCLEO_APP abajo. Este bloque queda vacío como marcador.

  // ── Mercado / Red humana ───────────────────────────────────────
  {
    path: 'mercado',
    componente: 'MercadoScreen',
    importLazy: null,
    decision: null,
    motivo: 'Red humana campesino↔campesino. ¿Va en prod 3D-first o se deja para v2?',
  },
  {
    path: 'mercados',
    // alias 'mercado': SIETE superficies de prod (DashboardLive, FiqueScreen,
    // mundosFinca, pisosTermicos, mundoData, cicloVivoData, FincaVivaHero)
    // navegan a 'mercado' — y MercadosScreen YA está montada en prod como
    // #mercados. El alias hace que esos CTAs aterricen en la pantalla que ya
    // se embarca en vez de morir en el guard. Si el operador decide sacar el
    // mercado de prod, quitar el alias JUNTO CON la entrada entera.
    alias: ['mercado'],
    componente: 'MercadosScreen',
    importLazy: 'src/components/MercadosScreen.jsx',
    decision: null,
    motivo: 'Pantalla de mercados. Depende de la decisión sobre red humana.',
  },
  {
    path: 'mockup_mercado',
    componente: 'Mercado',
    importLazy: 'src/mockups/Mercado.jsx',
    decision: null,
    motivo: 'Mockup del mercado con rostros y cinta de altitud. Promover si mercado va.',
  },

  // ── Voz / UI experimental ──────────────────────────────────────
  {
    path: 'mockup_voz_con_forma',
    componente: 'VozConForma',
    importLazy: 'src/mockups/VozConForma.jsx',
    decision: null,
    motivo: 'Visualización de voz con IrisVoz. ¿UI real o queda como concepto?',
  },
  {
    path: 'mockup_conversacion_voz',
    componente: 'ConversacionVoz',
    importLazy: 'src/mockups/ConversacionVoz.jsx',
    decision: null,
    motivo: 'Pantalla de conversación por voz. ¿Reemplaza voz_planta?',
  },
  {
    path: 'mockup_ensena_dibujando',
    componente: 'EnsenaDibujando',
    importLazy: 'src/mockups/EnsenaDibujando.jsx',
    decision: null,
    motivo: 'Agente dibuja láminas. Ya integrado en AgentScreen; ¿mockup sobra?',
  },

  // ── Almanaque lunar ────────────────────────────────────────────
  {
    path: 'almanaque',
    componente: 'AlmanaqueScreen',
    importLazy: 'src/components/almanaque/AlmanaqueScreen.jsx',
    decision: null,
    motivo: 'Almanaque lunar. ¿Feature core o nicho?',
  },

  // ── CSS base ────────────────────────────────────────────────────
  {
    path: '_css_base',
    componente: '(hojas de estilo)',
    importLazy: null,
    decision: null,
    motivo: '¿Se hereda el CSS del tema biopunk (themes.css, temas-fase2.css) o se reconstruye desde cero para 3D-first?',
  },

  // ── Criaturas: ¿todas o subset? ────────────────────────────────
  {
    path: '_criaturas_subset',
    componente: '(14 criaturas SVG)',
    importLazy: null,
    decision: null,
    motivo: '¿Las 14 criaturas van todas a prod o se selecciona un subset inicial (abeja, colibrí, oso, ent, espíritu)?',
  },
];

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

/**
 * Devuelve el mapa completo de rutas del núcleo (3D + app) indexado por path.
 * @returns {Map<string, {path:string, componente:string, importLazy:string|null, categoria:string}>}
 */
export function getMapaNucleo() {
  const mapa = new Map();
  for (const r of [...NUCLEO_3D, ...NUCLEO_APP]) {
    mapa.set(r.path, r);
    if (r.alias) {
      for (const a of r.alias) mapa.set(a, r);
    }
  }
  return mapa;
}

/**
 * ¿Esta ruta está en el núcleo de prod?
 * @param {string} path
 * @returns {boolean}
 */
export function estaEnNucleo(path) {
  return getMapaNucleo().has(path);
}

/**
 * ¿Esta ruta está explícitamente excluida?
 * @param {string} path
 * @returns {boolean}
 */
export function estaExcluida(path) {
  return EXCLUIDO.some((e) => e.path === path);
}

/**
 * ¿Esta ruta está pendiente de decisión?
 * @param {string} path
 * @returns {boolean}
 */
export function estaPendiente(path) {
  return PENDIENTE_DECISION.some((p) => p.path === path);
}
