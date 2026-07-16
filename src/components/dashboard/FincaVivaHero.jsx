/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * Los textos de UI de este hero (saludo del agente, etiquetas de los portales,
 * aria-labels) son strings de interfaz. Su migración a src/config/messages.js es
 * la TAREA i18n de ADR-050 (transversal a toda la app), fuera del alcance de esta
 * feature visual — mismo criterio que MiFincaVivaHomeCard.jsx, FincaCards.jsx y
 * FincaRedInstitucional.jsx en este mismo directorio. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { listFarmProcesses } from '../../db/farmProcessCache';
import useAssetStore from '../../store/useAssetStore';
import useCosechaStore from '../../store/useCosechaStore';
import { buildFincaScene } from '../../services/fincaSceneService';
import { buildVitalidadEspiritu } from '../../services/vitalidadEspirituService';
import { getDiagnosticoSueloGuardado } from '../../services/soilDiagnostic';
import { selectSceneVariant, SCENE_KINDS } from '../../services/fincaSceneProfileSelector';
import { getProfile, saveProfile, getInvernaderoEstructura, hasManualModuleVisibility } from '../../services/userProfileService';
import { esPerfilUrbano } from '../../services/homeModuleSelector';
import { getOperatorPhoto } from '../../services/operatorPhotoService';
import { tieneAccesoGlaciarActual, esOperadorActual } from '../../config/glaciarAccess';
import { deriveAtmosphere } from '../../services/atmosphereService';
import { resolveClimaLocation, getCachedClimaSnapshot, CLIMA_UPDATED_EVENT } from '../../services/climaService';
import { clasificarPisoTermico } from '../../services/pisoTermicoClassifier';
import { useTheme, resolveAutoTheme } from '../../hooks/useTheme';
import { iconForTheme } from './themeIcon';
import { colibriRealActivo } from '../../config/colibriFlag';
import { BarbuditoIlustrado, BarbuditoRealLoop } from '../colibri/Barbudito';
// Campana de notificaciones en el header F2 (regresión 2026-07-04): con la flag
// F2 ON el TopBar legacy (que la montaba) NO se renderiza, así que el home se
// quedó sin campana. `variant="f2"` es la misma píldora redonda que ya usa
// ScreenShell en las pantallas F2.
import NotificationsBell from '../NotificationsBell';
// ESCENAS VIVAS POR TEMA — cada tema tiene su escena de autor para la escala
// FINCA (la portada del home). Biopunk estrenó el patrón con la "Finca
// Organismo" aprobada; nature/verde-vivo/minimalista suben al MISMO nivel con
// estética PROPIA (2026-07-04). SPLIT GO-LIVE (decisión operador 2026-07-04):
// la "Finca Organismo" pasa a ser el tema NUEVO `biopunk2` (el DEFAULT) y
// `biopunk` RESTAURA su escena original — la isométrica base (SceneFinca) con
// los tokens biopunk de CIELOS_TEMA, la que había ANTES de la Finca Organismo:
//   · biopunk2    → "Finca Organismo" (noche bioluminiscente, corazón-semilla).
//   · biopunk     → escena isométrica clásica con piel biopunk (respaldo;
//                    NO va en ESCENA_VIVA_POR_TEMA: cae a SceneFinca).
//   · nature      → "El Árbol de la Vida" (mañana dorada, raíces que crían).
//   · verde-vivo  → "Huerto Exuberante" (verdes saturados, rocío que cae).
//   · minimalista → "Un solo trazo" (line-art que se dibuja sobre papel).
// Las escalas balcon/invernadero conservan sus escenas isométricas intactas.
import SceneFincaOrganismo from './SceneFincaOrganismo';
// PANEL DE VITALIDAD DEL ESPÍRITU — la lectura de vida del organismo (mockup
// aprobado #/mockups/avatar-biopunk), groundeada con los registros REALES de
// la finca (ver vitalidadEspirituService). Solo se monta con la escena
// Finca Organismo (biopunk2), debajo de la escena.
import PanelVitalidadEspiritu from './PanelVitalidadEspiritu';
import SceneFincaNature from './SceneFincaNature';
import SceneHuertoVivo from './SceneHuertoVivo';
import SceneTrazoMinimal from './SceneTrazoMinimal';
import './scene-finca-organismo.css';
import './scene-finca-nature.css';
import './scene-huerto-vivo.css';
import './scene-trazo-minimal.css';
import './finca-viva-hero.css';

// ¿Modo A/B del colibrí del páramo? Gateado por VITE_COLIBRI (colibriFlag.js),
// dev-only. Se evalúa una sola vez al cargar el módulo (la flag es de build, no
// cambia en runtime). Con la flag OFF (prod) el home conserva el colibrí SVG 2D
// `ColibriVuela` de siempre. Con la flag ON (dev), el operador rechazó el
// recuadro de video de la flor (rompía la escena ilustrada): en su lugar el home
// COMPARA dos colibrís, uno a cada costado, para que el operador elija cuál
// queda — IZQUIERDA el ILUSTRADO (SVG/CSS, barbudito de páramo dibujado),
// DERECHA el REAL recortado (sprite en loop, sin recuadro). Es un A/B TEMPORAL:
// cada uno lleva una etiquetita ("ilustrado" / "real") solo en este modo dev.
const COLIBRI_REAL = colibriRealActivo();

/**
 * FincaVivaHero — el HOME INMERSIVO "Finca Viva" (refinado del mockup F2 v2
 * "Finca Viva Evolutiva" con el feedback DIRECTO del operador, 2026-06-24).
 * La escena isométrica de TU finca ES la portada del dashboard: lo PRIMERO que
 * se ve al entrar. NO es una tarjeta debajo del agente.
 *
 * Refinamientos sobre el port fiel del mockup (feedback operador):
 *   1. UBICACIÓN VISIBLE: chip de portada con vereda · municipio · msnm · piso
 *      térmico, leído del perfil real (resolveClimaLocation + perfil). Dato
 *      vital que estaba ausente.
 *   2. CIELO REAL POR HORA Y CLIMA: la escena reusa el sistema de atmósfera del
 *      tema (atmosphereService.deriveAtmosphere → luz dia/noche/amanecer/
 *      atardecer + condición despejado/nublado/lluvia/niebla). De día sale el
 *      SOL; de noche, LUNA + ESTRELLAS; con lluvia/nubes, su velo. No inventa
 *      otro motor: consume el mismo servicio que clima-atmosfera.css.
 *   3. BARRA SUPERIOR con jerarquía y aire (no plana ni apretada).
 *   4. ÍCONO = la A ROJA del agente (THEME_ICON.biopunk de AgentScreen/
 *      AgentRedMenu) en vez de la mano de Chagra.
 *   5. COLIBRÍ DE VERDAD (pico largo, alas, iridiscencia) en vez de un pájaro
 *      genérico tipo Twitter.
 *   6. SIN SELECTOR de escala para el usuario: la escena sale SOLO del perfil
 *      real (selectSceneVariant). Override visible únicamente si esOperador()
 *      (QA), oculto al usuario normal.
 *   7. RESPONSIVE DESKTOP: layout de ancho máximo centrado; en pantalla ancha
 *      la escena y los 4 portales respiran (grilla legible), sin gradientes
 *      estirados (lo gobierna finca-viva-hero.css con un shell --fvh-max).
 *   8. PORTALES con más velo/legibilidad sobre la fauna.
 *
 * Se monta SOLO con la flag VITE_FINCA_VIVA_HOME_PERFIL ON (lo decide
 * DashboardLive). Con la flag OFF el home conserva su portada actual (AgentHero).
 *
 * `children` (opcional) reemplaza la ESCENA de finca única por otra (la RED
 * institucional del extensionista usa este slot — el mismo shell F2, otra
 * escena). Si no se pasa `children`, dibuja la escena de la finca propia.
 *
 * Offline-first: lee los procesos reales de farmProcessCache (sin red). SVG
 * rsvg-safe, fuentes self-host (Baloo 2 + Nunito, font-src 'self' de la CSP),
 * animaciones que respetan prefers-reduced-motion. Español de Colombia
 * (tú/usted), sin voseo.
 *
 * @param {Object} props
 * @param {(screen: string, options?: Object) => void} [props.onNavigate]   navegación de la app.
 * @param {Function} [props.onOpenAgent]  abre el agente (globo + composer + portal).
 * @param {Function} [props.onGestionar]  abre la GESTIÓN de la finca (registros y
 *   acciones). En el home F2 la gestión vive como una sección (GESTION_TILES) en
 *   la MISMA página, bajo el hero, así que el portal "Gestionar" la REVELA con un
 *   scroll a su ancla — NO navega a otra vista (mucho menos al juego). Si no se
 *   pasa, cae a un scroll directo al ancla #finca-gestion (mismo destino).
 * @param {Function} [props.onTodaMiFinca]  revela LOS MUNDOS completos (la
 *   puerta "Toda mi finca"): DashboardLive expande el bloque plegado y hace
 *   scroll. Sin callback, cae a un scroll directo al ancla #bloque-mundos.
 * @param {React.ReactNode} [props.children]  escena alterna (red institucional).
 * @param {string} [props.titulo]  título accesible (default "Mi finca viva").
 */
export default function FincaVivaHero({ onNavigate, onOpenAgent, onGestionar, onTodaMiFinca, children, titulo }) {
  // Piel del tema activo: el ícono de marca del agente (la A roja en biopunk, la
  // sol-mano en verde-vivo, etc.) sigue al tema, igual que la escena toma su piel
  // del tema vía los tokens --c-*/--fvh-* del CSS. Con la flag OFF este hero no se
  // monta, así que esto solo corre en dev.
  const { theme } = useTheme();
  const abrirAgente = () => {
    if (onOpenAgent) onOpenAgent();
    else onNavigate?.('agente');
  };

  // El portal "Gestionar" lleva a la GESTIÓN de la finca (siembras, zonas,
  // animales), que en el home F2 es la sección #finca-gestion de ESTA misma
  // página (bajo el hero). Lo correcto es revelarla con un scroll suave, no
  // navegar a otra vista. `onGestionar` (lo provee DashboardLive) hace ese
  // scroll; si faltara, caemos a un scroll directo al ancla por id para que
  // "Gestionar" NUNCA termine en la pantalla equivocada (el juego, el bug viejo).
  const irAGestion = () => {
    if (onGestionar) { onGestionar(); return; }
    if (typeof document !== 'undefined') {
      const seccion = document.getElementById('finca-gestion');
      if (seccion?.scrollIntoView) seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  // La puerta "Toda mi finca" abre LOS MUNDOS completos, que viven en la hoja
  // bajo el hero (DashboardLive los revela con onTodaMiFinca: expandir +
  // scroll). Sin callback, cae a un scroll directo al ancla del bloque.
  const irATodaMiFinca = () => {
    if (onTodaMiFinca) { onTodaMiFinca(); return; }
    if (typeof document !== 'undefined') {
      const seccion = document.getElementById('bloque-mundos');
      if (seccion?.scrollIntoView) seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  // El bloque "Registrar en la finca" sigue alcanzable por scroll en la misma
  // página (irAGestion queda como puente del ancla para quien lo necesite).
  void irAGestion;

  // ── Datos reales de la finca (offline-first) ─────────────────────────────
  const [processes, setProcesses] = useState([]);
  useEffect(() => {
    let alive = true;
    listFarmProcesses({ status: 'active' })
      .then((list) => { if (alive) setProcesses(Array.isArray(list) ? list : []); })
      .catch(() => { /* IDB falló: escena "recién empiezo" honesta, nunca inventada */ });
    return () => { alive = false; };
  }, []);

  // CONTEO REAL DE PLANTAS (los ASSETS) — la MISMA fuente de verdad que el
  // dashboard ("Mis plantas: N" en FincaCards y "llevo seguimiento a N cultivos"
  // en AnalisisProactivoIA): useAssetStore.plants. Una finca puede tener decenas
  // de plantas REGISTRADAS sin que exista aún un FarmProcess (ciclo) para ellas;
  // los processes solo cubren los ciclos abiertos. Sin esto, la escena decía
  // "terreno listo / 0 siembras" pese a haber plantas reales. Hidratado al boot
  // por App.jsx; aquí solo nos suscribimos al store (reactivo, offline-first).
  const plantAssetsCount = useAssetStore((s) => (Array.isArray(s.plants) ? s.plants.length : 0));

  const scene = useMemo(
    () => buildFincaScene({ processes, plantAssetsCount }),
    [processes, plantAssetsCount],
  );

  // ── Ubicación real de la finca (vereda · municipio · msnm · piso) ─────────
  const ubicacion = useMemo(() => buildUbicacion(), []);

  // ── ¿Operador? (override de escala SOLO para QA, oculto al usuario) ───────
  const operador = useMemo(() => {
    try { return esOperadorActual(); } catch (_) { return false; }
  }, []);

  // ── Nivel de respuestas del agente ("Claro y corto" / "Con detalle") ──────
  // El toggle vive JUNTO al compositor del agente (es una preferencia de CÓMO
  // responde Chagra, no una decoración de la barra). Renombrado del antiguo
  // "🌾 Campesino / 🔬 Experto" del AgentHero (flag OFF) a un nombre sobre la
  // RESPUESTA, no sobre la persona — de-estigmatiza (audit 2026-06-26 §5). El
  // cableado es el MISMO motor real: persiste `nivel_respuestas` en el perfil
  // (simple=claro/corto · detallado=con detalle), el campo que lee
  // buildUserProfileBlock para el system-prompt del LLM. No reinventa el motor.
  const [nivelRespuestas, setNivelRespuestas] = useState(() => {
    try { return getProfile()?.nivel_respuestas === 'detallado' ? 'detallado' : 'simple'; }
    catch (_) { return 'simple'; }
  });
  const detalladoActivo = nivelRespuestas === 'detallado';
  const cambiarNivel = (next) => {
    if (next === nivelRespuestas) return;
    setNivelRespuestas(next);
    // saveProfile puede no existir en algunos mocks de test (perfil opcional).
    try { if (typeof saveProfile === 'function') saveProfile({ nivel_respuestas: next }); }
    catch (_) { /* perfil opcional: el toggle igual refleja la elección en sesión */ }
  };

  // ── Foto de perfil en la píldora del topbar (hotfix P0 2026-07-04) ────────
  // El TopBar legacy mostraba la foto fijada por el usuario (getOperatorPhoto,
  // feature 2026-06-15); con la flag F2 ON ese TopBar NO se monta y el home se
  // quedó con el ícono genérico de persona aunque hubiera foto. Misma mecánica
  // de re-lectura en vivo que TopBar: 'chagra:operator-update' (same-tab, la
  // emite operatorPhotoService al subir/cambiar/quitar) + 'storage' (cross-tab).
  const [fotoPerfil, setFotoPerfil] = useState(() => {
    try { return getOperatorPhoto(); } catch (_) { return ''; }
  });
  useEffect(() => {
    const refresh = () => {
      try { setFotoPerfil(getOperatorPhoto()); } catch (_) { /* storage no disponible */ }
    };
    window.addEventListener('chagra:operator-update', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('chagra:operator-update', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // ── Cielo real: hora + clima (REUSA atmosphereService, no inventa motor) ──
  const atmosfera = useAtmosferaEscena();
  // La atmósfera + el TEMA activo: las escenas pintan su cielo interno con la
  // piel del tema (CIELOS_TEMA) además de la hora/clima reales. Un solo objeto
  // para no cambiar la firma de las 3 escenas.
  const atmosferaTema = useMemo(
    () => ({ ...atmosfera, tema: theme }),
    [atmosfera, theme],
  );

  // Variante de escena por PERFIL (override duro urbano, invernadero, finca…).
  const variant = useMemo(() => {
    try {
      return selectSceneVariant(getProfile(), { esGuiaGlaciar: tieneAccesoGlaciarActual() });
    } catch (_) {
      return null;
    }
  }, []);

  // ── Estructura de cubierta declarada en el perfil (#34 fase 1) ────────────
  // Si el usuario declaró en el onboarding que su finca TIENE invernadero
  // (invernadero_tiene='si' + invernadero_forma/tamano), la escena de finca lo
  // DIBUJA (antes el dato se guardaba y la escena lo ignoraba — bug reportado
  // por el operador). Reusa el getter tipado (fuente única, migración suave:
  // perfil viejo → { tiene:false } y no se dibuja nada). El typeof protege los
  // mocks de test que solo exportan getProfile (mismo criterio que saveProfile).
  const estructuraFinca = useMemo(() => {
    try {
      if (typeof getInvernaderoEstructura === 'function') {
        return getInvernaderoEstructura(getProfile());
      }
    } catch (_) { /* perfil opcional: sin estructura declarada */ }
    return { tiene: false, forma: null, tamano: null };
  }, []);

  // El mockup F2 tiene 3 escenas: balcon / invernadero / finca. Las variantes
  // ecológicas (restauracion/paramo) caen a la escena de finca diversa (su arte
  // dedicado es trabajo aparte). El kind del perfil elige la escena.
  const escalaPerfil = useMemo(() => {
    const k = variant?.kind;
    if (k === SCENE_KINDS.balcon) return 'balcon';
    if (k === SCENE_KINDS.invernadero) return 'invernadero';
    return 'finca';
  }, [variant]);

  // La escena la decide SIEMPRE el perfil. El operador puede previsualizar otra
  // escala para QA (override oculto al usuario normal). El usuario corriente NO
  // elige escala: ya no hay selector de 3 chips en su UI (feedback operador #6).
  const [escalaOverride, setEscalaOverride] = useState(null);
  const escala = (operador && escalaOverride) ? escalaOverride : escalaPerfil;

  // Estado poblada vs. recién-empieza: lo decide el DATO REAL (finca vacía →
  // recién empiezo). El operador puede alternar para QA.
  const vacia = !!scene?.vacia;
  const estadoPorDefecto = vacia ? 'empieza' : 'poblada';
  const [estadoOverride, setEstadoOverride] = useState(null);
  const estado = (operador && estadoOverride) ? estadoOverride : estadoPorDefecto;
  const poblada = estado === 'poblada';

  const tieneFincaPropia = !children; // children = red institucional del extensionista.

  // ── ESCENA VIVA DEL TEMA (escala finca) ──────────────────────────────────
  // Cada tema monta SU escena de autor para la portada (ver mapa en el import):
  // la "Finca Organismo" en biopunk2 (default), "El Árbol de la Vida" en
  // nature, el "Huerto Exuberante" en verde-vivo y "Un solo trazo" en
  // minimalista. `biopunk` (respaldo) NO está en el mapa: cae a la SceneFinca
  // isométrica original con su piel de CIELOS_TEMA. Las escalas balcon/
  // invernadero del perfil conservan sus escenas isométricas (su arte por tema
  // es trabajo aparte), igual que un tema desconocido cae a SceneFinca.
  // `theme==='auto'` se resuelve con resolveAutoTheme (la MISMA regla que
  // applyTheme): biopunk y biopunk2 comparten piel base SIN data-theme en
  // <html>, así que el atributo ya no distingue cuál escena toca.
  const temaEfectivo = resolveAutoTheme(theme);
  const EscenaViva = ESCENA_VIVA_POR_TEMA[temaEfectivo] || null;
  const escenaVivaActiva = !!EscenaViva && escala === 'finca' && tieneFincaPropia;
  // Compat: el modificador histórico del wrap organismo (specs externos lo
  // usan). Tras el split vive en biopunk2 (donde quedó la Finca Organismo).
  const organismoActivo = escenaVivaActiva && temaEfectivo === 'biopunk2';

  // ── PANEL DE VITALIDAD DEL ESPÍRITU (solo con la Finca Organismo) ─────────
  // Cada valor sale de una fuente REAL (contrato en vitalidadEspirituService):
  // vitalidad = scene.vitalidad (ciclos reales) · especies = procesos +
  // plantas-asset · clima = snapshot guardado + condición de la atmósfera (la
  // MISMA de la escena) · cosechas = useCosechaStore (log--harvest reales) ·
  // suelo = diagnóstico DR-SUELOS-1 cuando exista (hoy no se persiste →
  // "dato en camino", nunca un número inventado).
  const plantAssets = useAssetStore((s) => s.plants);
  const cosechaSummary = useCosechaStore((s) => s.summary);
  useEffect(() => {
    if (!organismoActivo || cosechaSummary) return;
    // Carga offline-first de los log--harvest (IDB). Si falla, el contador
    // queda honesto en "dato en camino" (el store guarda el error).
    useCosechaStore.getState().loadHarvests().catch(() => {});
    // Solo debe dispararse al activar la escena; el summary llega por el store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organismoActivo]);
  const vitalidadEspiritu = useMemo(() => {
    if (!organismoActivo) return null;
    let snapshot = null;
    try { snapshot = getCachedClimaSnapshot(); } catch (_) { /* sin señal guardada */ }
    // 🪱 El suelo: el ÚLTIMO diagnóstico REAL que el usuario hizo en la
    // pantalla de suelo (DR-SUELOS-1), persistido por guardarDiagnosticoSuelo.
    // Nunca hizo uno → null → el eje queda honesto en "dato en camino".
    let diagSuelo = null;
    try { diagSuelo = getDiagnosticoSueloGuardado(); } catch (_) { /* sin diagnóstico */ }
    return buildVitalidadEspiritu({
      scene,
      processes,
      plants: plantAssets,
      climaSnapshot: snapshot,
      condicion: atmosfera?.condicion || null,
      harvestSummary: cosechaSummary,
      diagSuelo,
    });
    // `atmosfera` también re-lee el snapshot cacheado (se refresca con el
    // MISMO evento CLIMA_UPDATED_EVENT que alimenta el cielo de la escena).
  }, [organismoActivo, scene, processes, plantAssets, cosechaSummary, atmosfera]);

  // ── GATE DE ANIMALES (potrero de la escena + puerta "Mis animales") ───────
  // Mismo criterio que DashboardLive.mostrarAnimales (el usuario solo ve lo
  // que necesita): gobierna DOS entradas al mundo de los animales — el potrero
  // tappable (vaca + gallinas) de la Finca Organismo y la puerta "Mis
  // animales". Un urbano de balcón/terraza no ve ninguna; el control manual
  // del home (#1560) y el operador las conservan. Fail-open ante error.
  const [mostrarAnimales] = useState(() => {
    try {
      if (esOperadorActual()) return true;
      if (hasManualModuleVisibility()) return true;
      return !esPerfilUrbano(getProfile());
    } catch (_) {
      return true; // Fail-open: no esconder la entrada/puerta por un error.
    }
  });
  const onAnimales = mostrarAnimales
    ? () => onNavigate?.('mundo', { mundo: 'animales' })
    : null;

  // ── MODO "PLENO SOL" (usabilidad campesina #7) ────────────────────────────
  // Alto contraste claro para leer el teléfono a mediodía al aire libre: el
  // biopunk nocturno va bien de noche, pero al rayo del sol un fondo oscuro
  // no se ve. AUTOMÁTICO de día (deriveAtmosphere → luz 'dia') con override
  // MANUAL persistido ('1' forzado ON, '0' forzado OFF, ausente = auto).
  const [solPref, setSolPref] = useState(() => {
    try { return localStorage.getItem(PLENO_SOL_KEY) || 'auto'; }
    catch (_) { return 'auto'; }
  });
  const plenoSol = solPref === '1' || (solPref === 'auto' && tonoLuz(atmosfera) === 'dia');
  const alternarSol = () => {
    const next = plenoSol ? '0' : '1';
    setSolPref(next);
    try { localStorage.setItem(PLENO_SOL_KEY, next); } catch (_) { /* incógnito */ }
  };

  // ── "ESCUCHAR" 🔊 (usabilidad campesina #6, baja alfabetización) ──────────
  // Lee la pantalla en voz alta con el TTS propio (kokoro + fallback Web
  // Speech, ttsService). Import perezoso: el peso del TTS no entra al chunk
  // del home salvo que se use. Mientras habla, el botón pasa a "Parar".
  const [hablando, setHablando] = useState(false);
  const ttsUnsubRef = useRef(null);
  useEffect(() => () => { if (ttsUnsubRef.current) ttsUnsubRef.current(); }, []);
  const textoEscuchar = () => {
    const puertasTxt = 'sus matas, sus animales, el tiempo, vender, aprender, o toda su finca';
    const estadoTxt = poblada
      ? 'Todo tranquilo en su finca.'
      : 'Su finca está empezando. Registre su primera siembra y la escena cobra vida.';
    return `Buenas, soy Chagra. Esta es su finca viva. ${estadoTxt} `
      + 'Toque el botón verde grande, hable, y yo le contesto. '
      + `También puede entrar a: ${puertasTxt}.`;
  };
  const escuchar = async () => {
    try {
      const tts = await import('../../services/ttsService');
      if (!ttsUnsubRef.current) {
        ttsUnsubRef.current = tts.onSpeakingChange((v) => setHablando(!!v));
      }
      if (tts.isAudioPlaying()) { tts.stop(); return; }
      await tts.speakSentences(textoEscuchar());
    } catch (_) { /* sin audio disponible: el botón no rompe el home */ }
  };

  return (
    <section
      data-testid="finca-viva-hero"
      aria-label="Su finca viva"
      className="fvh"
      data-luz={atmosfera.luz || undefined}
      data-clima={atmosfera.condicion || undefined}
      data-plenosol={plenoSol ? '1' : undefined}
    >
      <div className="fvh-shell">
        {/* ── TOPBAR (con jerarquía y aire — feedback #3) ───────────────────── */}
        <header className="fvh-topbar">
          <div className="fvh-brand">
            {/* Ícono de marca del agente del TEMA ACTIVO (feedback #4): la A roja
                en biopunk, la sol-mano frondosa en verde-vivo, etc. — la escena
                toma la piel del tema. Regresión header 2026-07-04: la A es el
                BOTÓN DEL AGENTE (en biopunk la A de la mano de Chagra invoca al
                agente), NO decoración ni perfil — ahora es interactiva y abre el
                agente, coexistiendo con "?"/campana/perfil a la derecha. */}
            <button
              type="button"
              className="fvh-brand-a"
              data-theme-icon={theme}
              data-testid="fvh-brand-agente"
              aria-label="Abrir el agente Chagra"
              title="Hablar con el agente"
              onClick={abrirAgente}
            >
              {iconForTheme(theme)}
            </button>
            <div className="fvh-brand-txt">
              <b>Chagra</b>
              <span>Su finca viva</span>
            </div>
          </div>

          {/* CHIP DE UBICACIÓN — vereda · municipio · msnm · piso (feedback #1) */}
          {ubicacion ? (
            <button
              type="button"
              className="fvh-ubic"
              onClick={() => onNavigate?.('perfil')}
              aria-label={`Ubicación de la finca: ${ubicacion.aria}. Toque para editar.`}
              title={ubicacion.aria}
            >
              <span className="fvh-ubic-pin" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                  <path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z" fill="#2f6b3a" stroke="#fff" strokeWidth="1.4" />
                  <circle cx="12" cy="10" r="2.6" fill="#bef264" />
                </svg>
              </span>
              <span className="fvh-ubic-txt">
                {ubicacion.lugar && <b>{ubicacion.lugar}</b>}
                {ubicacion.altitud && <em>{ubicacion.altitud}</em>}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="fvh-ubic fvh-ubic-vacia"
              onClick={() => onNavigate?.('perfil')}
              aria-label="Aún no ha confirmado la ubicación de su finca. Toque para completarla."
            >
              <span className="fvh-ubic-pin" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                  <path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z" fill="#9aa595" stroke="#fff" strokeWidth="1.4" />
                </svg>
              </span>
              <span className="fvh-ubic-txt"><b>Ubicar mi finca</b></span>
            </button>
          )}

          <div className="fvh-top-pills">
            {/* CAMPANA (regresión 2026-07-04): el home F2 no monta el TopBar
                legacy, que era quien traía NotificationsBell — el usuario se
                quedaba sin notificaciones en el home. Misma píldora `f2` que
                ScreenShell usa en el resto de pantallas F2. */}
            <NotificationsBell onNavigate={onNavigate} variant="f2" />
            <button
              type="button"
              className="fvh-pill"
              title="Ayuda"
              aria-label="Ayuda"
              onClick={() => onNavigate?.('ayuda')}
            >
              {/* currentColor → toma la tinta del tema (legible en biopunk navy y
                  en los temas claros), no un gris fijo que se perdía. */}
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M9.2 9.2a2.8 2.8 0 1 1 4 2.5c-.9.5-1.2 1-1.2 1.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                <circle cx="12" cy="17" r="1.2" fill="currentColor" />
              </svg>
            </button>
            {/* PERFIL (feedback #2): acceso al perfil junto al "?". Anillo de
                acento del tema para que se reconozca SIEMPRE, no solo el "?". */}
            <button
              type="button"
              className="fvh-pill fvh-pill-perfil"
              title="Mi perfil"
              aria-label="Mi perfil"
              data-testid="finca-viva-perfil"
              onClick={() => onNavigate?.('perfil')}
            >
              {/* Foto de perfil fijada por el usuario; cae al ícono genérico de
                  persona si no hay foto (misma regla que el TopBar legacy). */}
              {fotoPerfil ? (
                <img
                  src={fotoPerfil}
                  alt=""
                  className="fvh-pill-foto"
                  data-testid="fvh-perfil-foto"
                />
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
                  <circle cx="12" cy="8.4" r="4" fill="currentColor" />
                  <path d="M4.6 19.5c.7-3.7 3.8-5.8 7.4-5.8s6.7 2.1 7.4 5.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* ── OVERRIDE DE ESCALA (SOLO OPERADOR · QA) — oculto al usuario #6 ── */}
        {operador && (
          <div className="fvh-qa" role="group" aria-label="QA del operador: previsualizar escala">
            <span className="fvh-qa-lbl">QA</span>
            {ESCALAS.map((e) => (
              <button
                key={e.id}
                type="button"
                aria-pressed={escala === e.id}
                className={`fvh-qa-chip ${escala === e.id ? 'on' : ''}`}
                onClick={() => setEscalaOverride(escalaOverride === e.id ? null : e.id)}
                title={`Previsualizar escena: ${e.label}`}
              >
                {e.label}
              </button>
            ))}
            <button
              type="button"
              className={`fvh-qa-chip ${poblada ? 'on' : ''}`}
              onClick={() => setEstadoOverride(poblada ? 'empieza' : 'poblada')}
              title="Alternar finca poblada / recién empieza"
            >
              {poblada ? 'Poblada' : 'Vacía'}
            </button>
          </div>
        )}

        <main className="fvh-main">
          {/* ── ESCENA ISOMÉTRICA (o slot institucional) ────────────────────── */}
          <div className={`fvh-escena-wrap${escenaVivaActiva ? ' fvh-escena-wrap--viva' : ''}${organismoActivo ? ' fvh-escena-wrap--organismo' : ''}`}>
            <div className="fvh-escena">
              {/* globo del agente colibrí */}
              <button
                type="button"
                className="fvh-colibri-globo"
                onClick={abrirAgente}
                aria-label="Hablar con Chagra"
              >
                <b>{COLIBRI[escala][0]}</b>
                <small>
                  {poblada
                    ? COLIBRI[escala][1]
                    : 'Su finca está empezando. Registre su primera siembra y la escena cobra vida.'}
                </small>
              </button>

              {tieneFincaPropia ? (
                <>
                  {escala === 'balcon' && <SceneBalcon poblada={poblada} cielo={atmosferaTema} />}
                  {escala === 'invernadero' && <SceneInvernadero poblada={poblada} cielo={atmosferaTema} />}
                  {escala === 'finca' && (
                    escenaVivaActiva ? (
                      /* ESCENA VIVA DEL TEMA ACTIVO (organismo/árbol de la
                         vida/huerto/trazo). Lleva la estructura declarada
                         (#34): la estructura de cada escena porta el marcador
                         fvh-estructura solo si fue declarada. `onAnimales`
                         (gate por perfil) vuelve tappable el potrero de la
                         Finca Organismo; `onPregunte` vuelve TAPPABLE el
                         corazón-semilla (abre el agente). Las demás escenas
                         ignoran ambos handlers hoy. */
                      <EscenaViva
                        estructura={estructuraFinca}
                        onAnimales={onAnimales}
                        onPregunte={abrirAgente}
                      />
                    ) : (
                      <SceneFinca
                        poblada={poblada}
                        cielo={atmosferaTema}
                        estructura={estructuraFinca}
                        escalaFinca={variant?.escala}
                      />
                    )
                  )}

                  {/* fauna sobre la escena. El COLIBRÍ (criatura insignia del
                      agente) vuela SIEMPRE — es el guía, no ganado; acompaña
                      también la finca recién empezada. La mariposa y la abeja
                      (fauna que prospera) sólo aparecen cuando la finca está
                      poblada. Con una ESCENA VIVA de tema activa NO se
                      superpone fauna: cada escena trae su PROPIO colibrí y su
                      fauna (el emoji 🦋/🐝 y el colibrí 2D duplicados rompían
                      la clave del arte de cada tema). */}
                  {!escenaVivaActiva && (
                  <div className="fvh-bichos" aria-hidden="true">
                    {/* COLIBRÍ insignia. Con la flag VITE_COLIBRI ON (dev) =
                        modo A/B TEMPORAL: dos barbuditos de páramo, uno a cada
                        costado, para que el operador elija. IZQUIERDA el
                        ILUSTRADO (SVG/CSS dibujado); DERECHA el REAL recortado
                        (sprite en loop, sin recuadro). Cada uno con su etiquetita
                        ("ilustrado"/"real"). Con la flag OFF (prod), el colibrí
                        SVG 2D `ColibriVuela` de siempre. */}
                    {COLIBRI_REAL ? (
                      <>
                        <span className="fvh-bicho fvh-colibri-ab fvh-colibri-ab-izq" style={{ left: '4%', top: '12%' }}>
                          <BarbuditoIlustrado size={104} ariaLabel="Colibrí del páramo ilustrado" />
                          <span className="fvh-ab-tag">ilustrado</span>
                        </span>
                        <span className="fvh-bicho fvh-colibri-ab fvh-colibri-ab-der" style={{ right: '4%', top: '10%' }}>
                          <BarbuditoRealLoop size={112} ariaLabel="Barbudito de páramo real" />
                          <span className="fvh-ab-tag">real</span>
                        </span>
                      </>
                    ) : (
                      <span className="fvh-bicho fvh-colibri-vuela" style={{ left: '66%', top: '20%' }}>
                        <ColibriVuela />
                      </span>
                    )}
                    {poblada && (
                      <>
                        <span className="fvh-bicho" style={{ left: '16%', top: '18%', animationDelay: '.1s' }}>🦋</span>
                        <span className="fvh-bicho abeja" style={{ left: '42%', top: '32%', fontSize: '17px' }}>🐝</span>
                      </>
                    )}
                  </div>
                  )}
                </>
              ) : (
                <div className="fvh-institucional">{children}</div>
              )}
            </div>

            {/* ── PANEL DE VITALIDAD DEL ESPÍRITU (mockup avatar-biopunk) ──
                La lectura de vida del organismo, DEBAJO de la escena (no tapa
                el potrero/la vaca ni el globo del colibrí). Datos 100% reales;
                lo que falte se pinta "—" = dato en camino. */}
            {vitalidadEspiritu && tieneFincaPropia && (
              <PanelVitalidadEspiritu modelo={vitalidadEspiritu} />
            )}
          </div>

          {/* ── COLUMNA derecha en desktop / debajo en móvil ────────────────── */}
          <div className="fvh-aside">
            {/* LA acción dominante: "PREGUNTE" (usabilidad campesina #2).
                Antes "preguntar" aparecía en 4 formas sin que ninguna mandara
                (la A del header, el globo del colibrí, este compositor y un
                portal). Ahora ESTE botón manda: grande (≥96px), late como el
                corazón de la escena y habla en cristiano. Las otras entradas
                quedan de apoyo (la A del header, el corazón de la escena). */}
            <div className="fvh-composer-wrap">
              <button
                type="button"
                className="fvh-composer fvh-composer--pregunte"
                onClick={abrirAgente}
                data-testid="finca-viva-agent-fab"
                aria-label="Pregúntele a Chagra: toque y hable, Chagra le contesta"
              >
                <span className="fvh-corazon-btn" aria-hidden="true">
                  <span className="fvh-corazon-pulso" />
                  <span className="fvh-corazon-pulso fvh-corazon-pulso2" />
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" aria-hidden="true">
                    <rect x="9" y="3" width="6" height="11" rx="3" fill="#12260a" />
                    <path d="M6 11a6 6 0 0 0 12 0M12 17v3M8.5 20h7" stroke="#12260a" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="fvh-pregunte-txt">
                  <b>Pregunte</b>
                  <small>Toque y hable. Chagra le contesta.</small>
                </span>
              </button>
              {/* Escuchar (🔊 lee la pantalla, baja alfabetización) + Pleno sol
                  (alto contraste de mediodía). Pareja de pastillas bajo la
                  acción dominante. */}
              <div className="fvh-audio-sol">
                <button
                  type="button"
                  className="fvh-escuchar"
                  data-testid="fvh-escuchar"
                  aria-pressed={hablando}
                  aria-label={hablando ? 'Parar la lectura en voz alta' : 'Escuchar: Chagra le lee la pantalla en voz alta'}
                  onClick={escuchar}
                >
                  {hablando ? '⏹ Parar' : '🔊 Escuchar'}
                </button>
                <button
                  type="button"
                  className="fvh-sol-toggle"
                  data-testid="fvh-pleno-sol"
                  aria-pressed={plenoSol}
                  aria-label={plenoSol ? 'Volver a la vista de noche' : 'Pleno sol: vista clara para leer a mediodía'}
                  onClick={alternarSol}
                >
                  {plenoSol ? '🌙 Noche' : '☀️ Pleno sol'}
                </button>
              </div>

              {/* NIVEL DE RESPUESTA — junto al agente, porque define CÓMO le
                  responde Chagra. Renombrado del antiguo "Campesino/Experto"
                  (que clasificaba a la persona) a un nombre sobre la RESPUESTA:
                  "Claro y corto" / "Con detalle". Cableado al MISMO
                  `nivel_respuestas` que arma el system-prompt del LLM. */}
              <div
                className="fvh-nivel"
                role="radiogroup"
                aria-label="Cómo le responde Chagra"
                data-testid="finca-viva-nivel-respuestas"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={!detalladoActivo}
                  className={`fvh-nivel-btn ${!detalladoActivo ? 'on' : ''}`}
                  onClick={() => cambiarNivel('simple')}
                >
                  Claro y corto
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={detalladoActivo}
                  className={`fvh-nivel-btn ${detalladoActivo ? 'on' : ''}`}
                  onClick={() => cambiarNivel('detallado')}
                >
                  Con detalle
                </button>
              </div>
            </div>

            {/* HERO TEXT — sin jerga de ingeniero (antes "SU AGENTE
                AGROECOLÓGICO"): palabras del campo. */}
            <div className="fvh-hero-saludo">
              <div className="h-small">CHAGRA, SU COMPAÑERO DE CAMPO</div>
              <h1 dangerouslySetInnerHTML={{ __html: HERO[escala][0] }} />
              <p>{HERO[escala][1]}</p>
            </div>
          </div>
        </main>

        {/* ── LAS 6 PUERTAS (usabilidad campesina #5) ─────────────────────────
            Antes: 4 portales con descripción + ~20 tarjetas + ~35 chips abajo.
            Ahora: SEIS puertas de una-dos palabras, dibujo grande + palabra
            grande, targets ≥96px (#8). Cada una enruta a un mundo/vista que YA
            existe (nada nuevo que mantener). "Toda mi finca" abre los mundos
            completos en la hoja de abajo. */}
        <div className="fvh-portales-tit">¿A dónde va? <span /></div>
        <nav className="fvh-puertas" aria-label="Puertas de su finca" data-testid="finca-viva-puertas">
          {buildPuertas({ onNavigate, irATodaMiFinca, mostrarAnimales }).map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`fvh-puerta t-${p.tinte}`}
              data-testid={`puerta-${p.id}`}
              onClick={p.onClick}
              style={{ animationDelay: `${0.08 + i * 0.06}s` }}
              aria-label={`${p.nombre}: abre ${p.abre}`}
            >
              {/* DIBUJO PROPIO por puerta (pulido de portada 2026-07-16): cada
                  puerta es un mini-LUGAR ilustrado (SVG inline, paleta andina,
                  sombra de contacto — el mismo lenguaje del valle 3D) en vez
                  del emoji de plataforma, que en Android barato salía con
                  glifos distintos y planos. El emoji queda como respaldo si
                  algún id nuevo no trae dibujo. */}
              <span className="fvh-puerta-arte" aria-hidden="true">
                <PuertaArte id={p.id} fallback={p.emoji} />
              </span>
              <span className="fvh-puerta-nombre">{p.nombre}</span>
            </button>
          ))}
        </nav>

        <div className="fvh-fill" />
        <p className="fvh-titulo-sr">{titulo || 'Mi finca viva'}</p>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  UBICACIÓN — vereda · municipio · msnm · piso térmico (feedback #1).
// ════════════════════════════════════════════════════════════════════════════

const PISO_LABEL = {
  calido: 'Cálido',
  templado: 'Templado',
  frio: 'Frío',
  paramo: 'Páramo',
};

/**
 * Compone el chip de ubicación de la portada a partir del perfil real. Reusa
 * `resolveClimaLocation` (fuente única: vereda/municipio/departamento/msnm) y
 * complementa con los campos directos del perfil (finca_altitud/piso_termico).
 * Devuelve null si no hay NINGÚN dato de ubicación (→ se muestra "Ubicar mi
 * finca"). Nunca inventa: solo muestra lo que el usuario ya confirmó.
 *
 * @returns {{ lugar: string|null, altitud: string|null, aria: string }|null}
 */
function buildUbicacion() {
  let loc = {};
  let perfil = {};
  try { perfil = getProfile() || {}; } catch (_) { perfil = {}; }
  try { loc = resolveClimaLocation({ profile: perfil }) || {}; } catch (_) { loc = {}; }

  const vereda = limpiar(loc.vereda || perfil.vereda);
  const municipio = limpiar(loc.municipio || perfil.municipio);
  const departamento = limpiar(loc.departamento || perfil.departamento);

  const msnm = primerNumero([loc.elevation, perfil.finca_altitud]);
  let piso = limpiar(perfil.piso_termico);
  if (!piso && msnm != null) {
    const cls = clasificarPisoTermico(msnm);
    if (cls?.id) piso = cls.id;
  }
  const pisoTxt = piso ? (PISO_LABEL[piso] || cap(piso)) : null;

  // Parte geográfica: "Vereda X · Municipio, Depto" (sin redundar el departamento
  // si ya aparece en el municipio compuesto).
  const geo = [];
  if (vereda) geo.push(`Vereda ${vereda}`);
  if (municipio) geo.push(departamento ? `${municipio}, ${departamento}` : municipio);
  else if (departamento) geo.push(departamento);
  const lugar = geo.length ? geo.join(' · ') : null;

  // Parte de altitud: "2.600 msnm · Páramo".
  const altPartes = [];
  if (msnm != null) altPartes.push(`${formatoMiles(msnm)} msnm`);
  if (pisoTxt) altPartes.push(pisoTxt);
  const altitud = altPartes.length ? altPartes.join(' · ') : null;

  if (!lugar && !altitud) return null;

  const aria = [lugar, altitud].filter(Boolean).join(' · ');
  return { lugar, altitud, aria };
}

function limpiar(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}
function primerNumero(arr) {
  for (const v of arr) {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0 && n <= 6500) return Math.round(n);
  }
  return null;
}
function formatoMiles(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ════════════════════════════════════════════════════════════════════════════
//  CIELO REAL — hora + clima vía atmosphereService (feedback #2).
//  NO inventa motor: consume deriveAtmosphere (el mismo de clima-atmosfera.css)
//  y re-evalúa al pasar el sol / al refrescar el clima.
// ════════════════════════════════════════════════════════════════════════════

const ATM_REEVAL_MS = 10 * 60 * 1000; // mismo ritmo que useClimaAtmosphere.

function leerAtmosfera() {
  try {
    const location = resolveClimaLocation();
    const snapshot = getCachedClimaSnapshot();
    return deriveAtmosphere({ snapshot, now: new Date(), location });
  } catch (_) {
    return { luz: null, condicion: null, enso: null };
  }
}

/**
 * Estado de cielo de la escena: { luz, condicion }. La escena dibuja sol/luna/
 * estrellas según `luz` y velo de nubes/lluvia según `condicion`. Re-evalúa con
 * el reloj y al evento de clima refrescado, sin pedir nada a la red.
 */
function useAtmosferaEscena() {
  const [atm, setAtm] = useState(() => leerAtmosfera());
  useEffect(() => {
    const update = () => setAtm(leerAtmosfera());
    update();
    window.addEventListener(CLIMA_UPDATED_EVENT, update);
    const id = setInterval(update, ATM_REEVAL_MS);
    return () => {
      window.removeEventListener(CLIMA_UPDATED_EVENT, update);
      clearInterval(id);
    };
  }, []);
  return atm;
}

/** ¿Es de noche? (luna + estrellas en vez de sol). */
function esNoche(cielo) { return cielo?.luz === 'noche'; }
/** ¿Cielo cubierto/lluvia? (velo + nubes densas). */
function esCubierto(cielo) {
  return cielo?.condicion === 'nublado' || cielo?.condicion === 'lluvia' || cielo?.condicion === 'niebla';
}
/**
 * Tono de luz de la escena. Antes las escenas solo distinguían noche/día: el
 * amanecer y el atardecer (las horas MÁS bellas del campo) se pintaban como
 * mediodía. Ahora cada tono tiene su cielo. Mismo dato de siempre
 * (deriveAtmosphere → luz), sin motor nuevo.
 * @returns {'dia'|'noche'|'amanecer'|'atardecer'}
 */
function tonoLuz(cielo) {
  const l = cielo?.luz;
  return (l === 'noche' || l === 'amanecer' || l === 'atardecer') ? l : 'dia';
}

/**
 * Cielos por escena y por tono de luz [stop alto, stop bajo]. El degradado de
 * la escena acompaña la hora real: dorado al amanecer, brasa al atardecer,
 * fresco al mediodía, navy profundo de noche.
 */
const CIELOS_ESCENA = {
  finca: {
    dia: ['#7ac3da', '#c8e8cb'],
    amanecer: ['#e9a06c', '#fbe9c2'],
    atardecer: ['#d97a4e', '#f6d99e'],
    noche: ['#121f3d', '#3d5560'],
  },
  balcon: {
    dia: ['#8fd0e8', '#dff0e3'],
    amanecer: ['#eeb083', '#fdeccb'],
    atardecer: ['#e08a5c', '#f9dfae'],
    noche: ['#1d2b4a', '#46566b'],
  },
  invernadero: {
    dia: ['#90cce0', '#d4ecd6'],
    amanecer: ['#edac7e', '#fceac6'],
    atardecer: ['#df845a', '#f8dda8'],
    noche: ['#1d2b4a', '#465a64'],
  },
};
/**
 * CIELOS POR TEMA — la piel del tema DENTRO de la escena (V4, req. "profundizar
 * el tema en la escena"). Antes los 4 temas casi solo cambiaban la barra y el
 * degradado del shell: la banda central isométrica seguía con el mismo cielo.
 * Ahora cada tema fija el cielo INTERNO de la escena por tono de luz:
 *   · biopunk (base) — navy/teal nocturno-neón incluso de día (coherente con el
 *     velo neón y el boceto aprobado; adiós al "mediodía suelto").
 *   · verde-vivo — turquesa fresco + crema frondosa (el look vivo original).
 *   · nature — cielos de tierra: crema dorada de día, ocres al sol bajo.
 *   · minimalista — papel: salvia pálida, tonos apagados, noche gris-azul.
 * Se aplica ANTES que la tabla por escena (que queda como fallback sin tema).
 * El grade/textura por tema del CSS (.fvh-escena > svg) completa la piel.
 */
const CIELOS_TEMA = {
  biopunk: {
    dia: ['#16324f', '#2b5a63'],
    amanecer: ['#3b2f5e', '#b06a55'],
    atardecer: ['#3a2440', '#c25c4a'],
    noche: ['#0c1830', '#26404d'],
  },
  // biopunk2 comparte la piel biopunk (mismo cielo interno): la diferencia
  // entre ambos es SOLO la escena de la escala finca (Finca Organismo vs.
  // isométrica clásica). Este cielo aplica a balcon/invernadero y fallbacks.
  biopunk2: {
    dia: ['#16324f', '#2b5a63'],
    amanecer: ['#3b2f5e', '#b06a55'],
    atardecer: ['#3a2440', '#c25c4a'],
    noche: ['#0c1830', '#26404d'],
  },
  'verde-vivo': {
    dia: ['#79c9b7', '#e2f0cf'],
    amanecer: ['#ecb27a', '#f6ecc4'],
    atardecer: ['#dd8455', '#f3d99b'],
    noche: ['#183253', '#3e5a63'],
  },
  nature: {
    dia: ['#d9c493', '#f2e8cd'],
    amanecer: ['#e0a066', '#f7e6c0'],
    atardecer: ['#c97a45', '#efd6a0'],
    noche: ['#26243d', '#5a4a58'],
  },
  minimalista: {
    dia: ['#cfdcd2', '#f3f1e8'],
    amanecer: ['#e3c3a3', '#f5eddd'],
    atardecer: ['#d8a887', '#f0e2c8'],
    noche: ['#31394a', '#5d6672'],
  },
};

function cieloEscena(cielo, escena) {
  const tono = tonoLuz(cielo);
  // Piel por tema primero (cielo.tema lo inyecta el hero desde useTheme).
  const porTema = CIELOS_TEMA[cielo?.tema]?.[tono];
  if (porTema) return porTema;
  const mapa = CIELOS_ESCENA[escena] || CIELOS_ESCENA.finca;
  return mapa[tono] || mapa.dia;
}

/**
 * SKY — capa de cielo compartida por las 3 escenas: sol que respira de día
 * (bajo y ámbar al amanecer/atardecer), luna con halo + estrellas + estrella
 * fugaz de noche, nubes/niebla/lluvia según el clima real. Recibe la geometría
 * (cx, cy, r) del astro para encajar en cada escena. rsvg-safe (sin filtros:
 * halos por círculos concéntricos, lluvia por trazos).
 */
function Sky({ cielo, cx, cy, r, lluviaY = 150 }) {
  const noche = esNoche(cielo);
  const cubierto = esCubierto(cielo);
  const lluvia = cielo?.condicion === 'lluvia';
  const niebla = cielo?.condicion === 'niebla';
  const tono = tonoLuz(cielo);
  const solBajo = tono === 'amanecer' || tono === 'atardecer';
  // Al amanecer/atardecer el sol cuelga más bajo y se enciende en ámbar.
  const cyEf = solBajo ? cy + r * 1.5 : cy;
  const gradSol = solBajo ? 'url(#fvh-sol-warm)' : 'url(#fvh-sol-grad)';
  const halo = solBajo ? '#ffb35c' : '#ffe08a';
  return (
    <g aria-hidden="true">
      {noche ? (
        <g className="fvh-sky-noche">
          {/* estrellas — constelación más generosa, con titileo escalonado */}
          <g fill="#fdf6d8" className="fvh-estrellas">
            <circle cx={cx - 120} cy={cy - 14} r="1.4" />
            <circle cx={cx - 88} cy={cy + 22} r="1" />
            <circle cx={cx - 150} cy={cy + 36} r="1.2" />
            <circle cx={cx - 40} cy={cy - 26} r="1" />
            <circle cx={cx + 18} cy={cy + 30} r="1.3" />
            <circle cx={cx - 196} cy={cy + 6} r="1" />
            <circle cx={cx + 30} cy={cy - 10} r="0.9" />
            <circle cx={cx - 244} cy={cy - 22} r="1.1" />
            <circle cx={cx - 270} cy={cy + 30} r="0.9" />
            <circle cx={cx - 172} cy={cy - 30} r="0.8" />
            <circle cx={cx - 64} cy={cy + 44} r="1" />
            <circle cx={cx - 220} cy={cy + 52} r="1.2" />
          </g>
          {/* estrella fugaz ocasional (trazo que cruza y se apaga) */}
          <line
            className="fvh-fugaz"
            x1={cx - 210} y1={cy - 28} x2={cx - 174} y2={cy - 12}
            stroke="#fdf6d8" strokeWidth="1.4" strokeLinecap="round"
          />
          {/* luna creciente con halo doble */}
          <g transform={`translate(${cx} ${cy})`}>
            <circle r={r * 1.5} fill="#e8edf7" opacity="0.1" />
            <circle r={r * 0.92} fill="#e8edf7" opacity="0.25" />
            <circle r={r * 0.7} fill="#f4f1e0" />
            <circle cx={r * 0.32} cy={-r * 0.12} r={r * 0.6} fill="#1d2b4a" />
            <circle cx={-r * 0.18} cy={r * 0.14} r={r * 0.07} fill="#dcd6bc" opacity="0.6" />
            <circle cx={-r * 0.3} cy={-r * 0.18} r={r * 0.05} fill="#dcd6bc" opacity="0.5" />
          </g>
        </g>
      ) : (
        <g transform={`translate(${cx} ${cyEf})`}>
          {/* halo exterior suave (respira) + anillo de calor con el sol bajo */}
          <circle r={r * 1.4} fill={halo} opacity={cubierto ? 0.18 : (solBajo ? 0.42 : 0.35)}>
            <animate attributeName="r" values={`${r * 1.4};${r * 1.6};${r * 1.4}`} dur="6s" repeatCount="indefinite" />
          </circle>
          {solBajo && !cubierto && (
            <circle r={r * 2.1} fill="none" stroke={halo} strokeWidth="1.5" opacity="0.3" />
          )}
          <circle r={r} fill={gradSol} opacity={cubierto ? 0.7 : 1} />
        </g>
      )}

      {/* NUBES densas cuando está cubierto — dos masas con brillo superior */}
      {cubierto && (
        <g fill={noche ? '#9aa6bb' : '#f3f6f4'} opacity={noche ? 0.7 : 0.92}>
          <g className="fvh-nube-a">
            <ellipse cx={cx - 30} cy={cy + 4} rx="30" ry="14" />
            <ellipse cx={cx - 4} cy={cy} rx="22" ry="14" />
            <ellipse cx={cx - 52} cy={cy} rx="18" ry="12" />
            <ellipse cx={cx - 30} cy={cy - 8} rx="16" ry="10" opacity=".9" />
          </g>
          <g className="fvh-nube-b" opacity=".8">
            <ellipse cx={cx - 168} cy={cy + 26} rx="24" ry="11" />
            <ellipse cx={cx - 146} cy={cy + 22} rx="16" ry="10" />
            <ellipse cx={cx - 188} cy={cy + 23} rx="13" ry="9" />
          </g>
        </g>
      )}

      {/* NIEBLA — bancos horizontales que derivan despacio (rsvg-safe). Tres
          alturas: horizonte, media ladera y un velo bajo sobre la escena. */}
      {niebla && (
        <g fill={noche ? '#8b9bb3' : '#ffffff'}>
          <ellipse className="fvh-neblina-a" cx={cx - 120} cy={lluviaY + 2} rx="190" ry="22" opacity={noche ? 0.4 : 0.62} />
          <ellipse className="fvh-neblina-b" cx={cx - 30} cy={lluviaY + 30} rx="220" ry="18" opacity={noche ? 0.3 : 0.5} />
          <ellipse className="fvh-neblina-a" cx={cx - 190} cy={lluviaY + 74} rx="200" ry="20" opacity={noche ? 0.22 : 0.36} />
        </g>
      )}

      {/* LLUVIA — cortina ancha de trazos diagonales en dos alturas
          (rsvg-safe, sin filtros) */}
      {lluvia && (
        <g className="fvh-lluvia" stroke={noche ? '#aebfe0' : '#4e7d9a'} strokeWidth="2.4" strokeLinecap="round" opacity="0.8">
          <line x1={cx - 90} y1={lluviaY} x2={cx - 97} y2={lluviaY + 22} />
          <line x1={cx - 50} y1={lluviaY + 8} x2={cx - 57} y2={lluviaY + 30} />
          <line x1={cx - 10} y1={lluviaY} x2={cx - 17} y2={lluviaY + 22} />
          <line x1={cx + 28} y1={lluviaY + 6} x2={cx + 21} y2={lluviaY + 28} />
          <line x1={cx + 64} y1={lluviaY} x2={cx + 57} y2={lluviaY + 22} />
          <line x1={cx - 130} y1={lluviaY + 4} x2={cx - 137} y2={lluviaY + 26} />
          <line x1={cx - 170} y1={lluviaY + 10} x2={cx - 177} y2={lluviaY + 32} />
          <line x1={cx - 210} y1={lluviaY + 2} x2={cx - 217} y2={lluviaY + 24} />
          <line x1={cx - 250} y1={lluviaY + 8} x2={cx - 257} y2={lluviaY + 30} />
          <line x1={cx - 286} y1={lluviaY + 2} x2={cx - 293} y2={lluviaY + 24} />
          <line x1={cx - 70} y1={lluviaY + 34} x2={cx - 77} y2={lluviaY + 56} />
          <line x1={cx - 150} y1={lluviaY + 40} x2={cx - 157} y2={lluviaY + 62} />
          <line x1={cx - 230} y1={lluviaY + 36} x2={cx - 237} y2={lluviaY + 58} />
          <line x1={cx + 10} y1={lluviaY + 42} x2={cx + 3} y2={lluviaY + 64} />
          <line x1={cx + 46} y1={lluviaY + 34} x2={cx + 39} y2={lluviaY + 56} />
        </g>
      )}
    </g>
  );
}

/** Gradientes del sol — compartidos por las 3 escenas (defs reusables):
 *  el dorado de mediodía y el ámbar del sol bajo (amanecer/atardecer). */
function SolGrad() {
  return (
    <>
      <radialGradient id="fvh-sol-grad" cx="50%" cy="45%" r="60%">
        <stop offset="0" stopColor="#fff3c4" />
        <stop offset="70%" stopColor="#ffe08a" />
        <stop offset="100%" stopColor="#ffd24d" />
      </radialGradient>
      <radialGradient id="fvh-sol-warm" cx="50%" cy="45%" r="60%">
        <stop offset="0" stopColor="#fff0c0" />
        <stop offset="60%" stopColor="#ffc266" />
        <stop offset="100%" stopColor="#ff9a4d" />
      </radialGradient>
      {/* veladura cálida del sol bajo — baña la escena al amanecer/atardecer */}
      <linearGradient id="fvh-wash-warm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ff9a4d" stopOpacity="0.30" />
        <stop offset="55%" stopColor="#ffb35c" stopOpacity="0.10" />
        <stop offset="100%" stopColor="#ffb35c" stopOpacity="0" />
      </linearGradient>
    </>
  );
}

/**
 * Veladura cálida de sol bajo — rect a pantalla completa de la escena que tiñe
 * TODO (cielo, lomas, plantas) de ámbar al amanecer/atardecer, como la luz
 * rasante real. De día/noche no pinta nada.
 */
function WashSolBajo({ cielo, w = 390, h = 360 }) {
  const tono = tonoLuz(cielo);
  if (tono !== 'amanecer' && tono !== 'atardecer') return null;
  return (
    <rect
      x="0" y="0" width={w} height={h}
      fill="url(#fvh-wash-warm)"
      opacity={tono === 'atardecer' ? 0.9 : 0.7}
      pointerEvents="none"
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  COLIBRÍ DE VERDAD (feedback #5) — pico largo, alas, iridiscencia.
//  Inspirado en ChagraAgentAvatarColibri (mismo plumaje turquesa→violeta).
// ════════════════════════════════════════════════════════════════════════════

/** Colibrí que vuela estacionario sobre la escena (criatura insignia). */
function ColibriVuela() {
  return (
    <svg viewBox="0 0 64 48" width="44" height="33" aria-hidden="true" className="fvh-colibri-svg">
      <defs>
        <linearGradient id="fvh-colibri-plum" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="40%" stopColor="#10b981" />
          <stop offset="72%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <radialGradient id="fvh-colibri-gorget" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#dc2626" />
        </radialGradient>
      </defs>
      {/* cola en abanico */}
      <path d="M10 28 L1 24 L6 30 L0 35 L8 33 L5 40 L14 32 Z" fill="url(#fvh-colibri-plum)" opacity="0.9" />
      {/* ala trasera (batiendo) */}
      <g className="fvh-ala-tras" style={{ transformOrigin: '24px 24px' }}>
        <path d="M24 24 Q12 16 4 24 Q12 32 24 28 Z" fill="url(#fvh-colibri-plum)" opacity="0.55" />
      </g>
      {/* cuerpo */}
      <ellipse cx="26" cy="27" rx="13" ry="7.5" fill="url(#fvh-colibri-plum)" transform="rotate(-16 26 27)" />
      {/* vientre claro */}
      <ellipse cx="25" cy="30" rx="8" ry="3.4" fill="#fef3c7" opacity="0.5" transform="rotate(-16 25 30)" />
      {/* cabeza */}
      <circle cx="40" cy="22" r="6.4" fill="url(#fvh-colibri-plum)" />
      {/* garganta iridiscente (gorget) */}
      <ellipse cx="41" cy="26" rx="3.6" ry="2.4" fill="url(#fvh-colibri-gorget)" opacity="0.92" />
      {/* ojo */}
      <circle cx="41.5" cy="20.6" r="1.5" fill="#0c0a09" />
      <circle cx="41" cy="20.1" r="0.5" fill="#fff" opacity="0.95" />
      {/* PICO LARGO característico del colibrí */}
      <path d="M46 22 Q58 24 63 30" fill="none" stroke="#26201b" strokeWidth="1.7" strokeLinecap="round" />
      {/* ala frontal (batiendo, sobre el cuerpo) */}
      <g className="fvh-ala-fron" style={{ transformOrigin: '28px 23px' }}>
        <path d="M28 23 Q16 6 2 12 Q14 26 30 21 Z" fill="url(#fvh-colibri-plum)" opacity="0.78" />
      </g>
    </svg>
  );
}

// ── Catálogos de texto (refinados del mockup F2) ───────────────────────────

/**
 * ESCENA VIVA de autor por tema (escala finca). Un tema fuera de este mapa
 * (futuro/desconocido) cae a la SceneFinca isométrica con su grade de color.
 * SPLIT GO-LIVE 2026-07-04: la "Finca Organismo" vive en `biopunk2` (default);
 * `biopunk` queda FUERA del mapa a propósito — restaura su escena original
 * (SceneFinca isométrica con los tokens biopunk de CIELOS_TEMA).
 */
const ESCENA_VIVA_POR_TEMA = Object.freeze({
  biopunk2: SceneFincaOrganismo,
  nature: SceneFincaNature,
  'verde-vivo': SceneHuertoVivo,
  minimalista: SceneTrazoMinimal,
});

const ESCALAS = [
  { id: 'balcon', label: 'Balcón' },
  { id: 'invernadero', label: 'Invernadero' },
  { id: 'finca', label: 'Finca' },
];

const HERO = {
  balcon: [
    'Este es <em>su balcón vivo</em>.<br>¿Qué quiere hacer hoy?',
    'Pocas materas, mucho cuidado. Escríbame o toque un lugar; le hablo claro y con datos verificados.',
  ],
  invernadero: [
    'Estas son <em>sus 10.000 plantas</em>.<br>¿Qué quiere revisar?',
    'Monocultivo bajo control. Pregúnteme por riego, plagas o nutrición; respondo solo con datos verificados.',
  ],
  finca: [
    'Esta es <em>su finca viva</em>.<br>¿Qué quiere hacer hoy?',
    'Camine a un lugar de la finca, o escríbame abajo. Hablo claro y solo con datos verificados.',
  ],
};
// Un solo "pregunte" que mande (usabilidad campesina #2): el globo del colibrí
// ya NO repite "pregúnteme aquí abajo" — saluda y orienta; preguntar vive en
// el botón grande "Pregunte" (y en el corazón de la escena biopunk).
const COLIBRI = {
  balcon: ['Buenas, soy Chagra', 'Su balcón está al día. Toque una matera para verla de cerca.'],
  invernadero: ['Buenas, soy Chagra', 'Sus hileras están bien. Toque un lugar para revisarlo.'],
  finca: ['Buenas, soy Chagra', 'Todo tranquilo en su finca. Toque una puerta para entrar.'],
};

// Preferencia persistida del modo "pleno sol" ('1' ON, '0' OFF, ausente=auto).
const PLENO_SOL_KEY = 'chagra:home:pleno-sol';

/**
 * LAS 6 PUERTAS del home (usabilidad campesina #5): una-dos palabras, dibujo
 * grande, targets ≥96px. Cada puerta enruta a un mundo/vista que YA existe:
 *   · Mis matas     → la portada del mundo Cultivos ('mundo_cultivos').
 *   · Mis animales  → el mundo Animales ('mundo' + {mundo:'animales'}),
 *                     gateado por perfil (mostrarAnimales, igual que el home).
 *   · El tiempo     → 'hoy_finca' (su día: lluvia, heladas y avisos).
 *   · Vender        → 'mercado'.
 *   · Aprender      → 'aprende'.
 *   · Toda mi finca → LOS MUNDOS completos en la hoja de abajo (revelar).
 */
/**
 * PuertaArte — el DIBUJO de cada puerta del home: un mini-lugar ilustrado
 * (SVG inline, rsvg-safe, sin animación interna: Android barato) con la
 * paleta andina del valle — verdes de monte, teja, ámbar de cosecha, cielo
 * de páramo — línea gruesa cálida (clave Cuphead-andina del norte visual) y
 * una sombra de contacto elíptica que ancla la viñeta a la tarjeta, el mismo
 * truco que separa los landmarks del valle 3D. Colores fijos a propósito:
 * la viñeta es ARTE (como una estampa), no superficie de tema.
 *
 * @param {{ id: string, fallback?: string }} props
 */
function PuertaArte({ id, fallback = '' }) {
  const svg = PUERTA_ARTE[id];
  if (!svg) return <span className="fvh-puerta-emoji">{fallback}</span>;
  return svg;
}

/* Trazos compartidos de las estampas: línea tinta-verde oscura, uniones
   redondas (la línea "dibujada a mano" del norte visual). */
const PA_LINEA = /** @type {import('react').SVGAttributes<SVGElement>} */ ({
  stroke: '#33412c',
  strokeWidth: 2.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});
const PA_SOMBRA = (cx, rx) => (
  <ellipse cx={cx} cy="62" rx={rx} ry="4.5" fill="#33412c" opacity="0.16" />
);

const PUERTA_ARTE = {
  /* MIS MATAS — la mata brotando del surco, con su hermanita al lado. */
  matas: (
    <svg viewBox="0 0 96 68" role="img">
      {PA_SOMBRA(48, 26)}
      {/* surco de tierra */}
      <path d="M26 62 q22 -9 44 0 q-10 5 -22 5 t-22 -5 Z" fill="#8a5a34" {...PA_LINEA} />
      <path d="M31 60 q17 -6 34 0" fill="none" stroke="#6e4a2a" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
      {/* tallo + hojas gorditas */}
      <path d="M48 58 V26" fill="none" {...PA_LINEA} stroke="#2e6b3a" strokeWidth="3.4" />
      <path d="M48 46 Q34 44 30 32 Q44 31 48 42 Z" fill="#4ca35c" {...PA_LINEA} />
      <path d="M48 38 Q62 36 66 24 Q52 23 48 34 Z" fill="#5cb56c" {...PA_LINEA} />
      <path d="M48 26 Q42 16 48 8 Q54 16 48 26 Z" fill="#7ccf84" {...PA_LINEA} />
      {/* la hermanita brotando */}
      <path d="M70 58 v-8" fill="none" {...PA_LINEA} stroke="#2e6b3a" strokeWidth="2.6" />
      <path d="M70 52 q-7 -1 -9 -8 q8 0 9 6 Z" fill="#5cb56c" {...PA_LINEA} strokeWidth="2" />
    </svg>
  ),
  /* MIS ANIMALES — la gallina criolla con su pollito, patas en tierra. */
  animales: (
    <svg viewBox="0 0 96 68" role="img">
      {PA_SOMBRA(44, 28)}
      {/* cuerpo */}
      <path d="M26 40 q0 -16 17 -16 q15 0 16 13 q1 9 -6 14 q-9 6 -18 2 q-9 -4 -9 -13 Z" fill="#fff4dc" {...PA_LINEA} />
      {/* ala */}
      <path d="M36 40 q9 -5 15 1 q-6 7 -15 3 Z" fill="#f0ddba" {...PA_LINEA} strokeWidth="2" />
      {/* cola */}
      <path d="M27 36 q-8 -3 -9 -11 q7 1 11 7" fill="#e8cfa4" {...PA_LINEA} strokeWidth="2" />
      {/* cabeza: cresta + pico + ojo */}
      <path d="M55 26 q1 -6 6 -7 q0 4 -2 6 q5 -2 7 1 q-3 3 -7 3 Z" fill="#d94f3a" {...PA_LINEA} strokeWidth="2" />
      <path d="M64 32 l7 3 l-7 3 Z" fill="#f0b13c" {...PA_LINEA} strokeWidth="2" />
      <circle cx="57" cy="31" r="1.8" fill="#33412c" />
      {/* patas */}
      <path d="M40 53 v7 m-4 0 h8 M50 52 v8 m-4 0 h8" fill="none" {...PA_LINEA} stroke="#c98a2e" strokeWidth="2.2" />
      {/* pollito */}
      <circle cx="76" cy="52" r="7" fill="#ffd24d" {...PA_LINEA} strokeWidth="2" />
      <circle cx="78.5" cy="50" r="1.3" fill="#33412c" />
      <path d="M83 52 l4 1.6 l-4 1.6 Z" fill="#f0b13c" {...PA_LINEA} strokeWidth="1.6" />
      <path d="M74 59 v3 m4 -3 v3" fill="none" {...PA_LINEA} stroke="#c98a2e" strokeWidth="1.8" />
    </svg>
  ),
  /* EL TIEMPO — sol de páramo asomando tras la nube, con su lluvia. */
  tiempo: (
    <svg viewBox="0 0 96 68" role="img">
      {/* sol con rayos cortos */}
      <circle cx="60" cy="24" r="11" fill="#ffd24d" {...PA_LINEA} />
      <g {...PA_LINEA} stroke="#e8a92e" strokeWidth="2.2">
        <path d="M60 7 v5 M74 12 l-3.4 3.4 M79 24 h-5 M74 37 l-3.4 -3.4" fill="none" />
      </g>
      {/* nube crema */}
      <path d="M22 36 q1 -9 10 -9 q4 -7 12 -5 q7 2 8 8 q8 1 8 8 q0 7 -9 7 H30 q-9 0 -8 -9 Z" fill="#fdf8ea" {...PA_LINEA} />
      {/* gotas */}
      <g fill="#5b97c6" {...PA_LINEA} strokeWidth="1.8" stroke="#3a6f9e">
        <path d="M32 52 q3 5 0 7 q-3 -2 0 -7 Z" />
        <path d="M46 54 q3 5 0 7 q-3 -2 0 -7 Z" />
        <path d="M60 52 q3 5 0 7 q-3 -2 0 -7 Z" />
      </g>
    </svg>
  ),
  /* VENDER — el canasto tejido con la cosecha (tomates + maíz). */
  vender: (
    <svg viewBox="0 0 96 68" role="img">
      {PA_SOMBRA(48, 27)}
      {/* cosecha asomando */}
      <circle cx="38" cy="30" r="8" fill="#e0532f" {...PA_LINEA} />
      <path d="M38 22 q-1 -4 3 -5" fill="none" {...PA_LINEA} stroke="#2e6b3a" strokeWidth="2" />
      <circle cx="55" cy="28" r="8" fill="#e8663c" {...PA_LINEA} />
      <path d="M66 34 q8 -12 4 -20 q-9 3 -10 17" fill="#ffd24d" {...PA_LINEA} strokeWidth="2" />
      {/* canasto */}
      <path d="M26 36 h44 l-5 24 q-1 3 -4 3 H35 q-3 0 -4 -3 Z" fill="#d99a4e" {...PA_LINEA} />
      <path d="M26 36 h44" fill="none" {...PA_LINEA} stroke="#a06a2c" strokeWidth="2.6" />
      <path d="M32 42 h32 M34 49 h28 M36 56 h24" fill="none" stroke="#a06a2c" strokeWidth="1.8" strokeLinecap="round" opacity=".75" />
      <path d="M40 36 v25 M56 36 v25 M48 36 v27" fill="none" stroke="#a06a2c" strokeWidth="1.6" strokeLinecap="round" opacity=".5" />
    </svg>
  ),
  /* APRENDER — el cuaderno de campo abierto del que brota una matica. */
  aprender: (
    <svg viewBox="0 0 96 68" role="img">
      {PA_SOMBRA(48, 28)}
      {/* páginas abiertas */}
      <path d="M48 30 q-12 -7 -26 -4 v30 q14 -3 26 4 Z" fill="#fdf8ea" {...PA_LINEA} />
      <path d="M48 30 q12 -7 26 -4 v30 q-14 -3 -26 4 Z" fill="#f6edd6" {...PA_LINEA} />
      <path d="M48 30 v30" fill="none" {...PA_LINEA} stroke="#8b78d8" strokeWidth="2.8" />
      {/* renglones dibujados */}
      <g fill="none" stroke="#8b78d8" strokeWidth="1.7" strokeLinecap="round" opacity=".75">
        <path d="M28 36 q8 -1.5 14 1 M28 42 q8 -1.5 14 1 M28 48 q8 -1.5 14 1" />
        <path d="M54 37 q8 -2.5 14 -1 M54 43 q8 -2.5 14 -1" />
      </g>
      {/* la matica que brota de la página */}
      <path d="M62 34 V22" fill="none" {...PA_LINEA} stroke="#2e6b3a" strokeWidth="2.6" />
      <path d="M62 28 q-8 -1 -10 -9 q9 0 10 7 Z" fill="#5cb56c" {...PA_LINEA} strokeWidth="2" />
      <path d="M62 22 q6 -1 8 -7 q-7 -1 -8 5 Z" fill="#7ccf84" {...PA_LINEA} strokeWidth="2" />
    </svg>
  ),
  /* TODA MI FINCA — la casita de teja entre sus montañas, el valle chiquito. */
  finca: (
    <svg viewBox="0 0 96 68" role="img">
      {/* montañas al fondo */}
      <path d="M6 56 L28 22 L46 56 Z" fill="#5b8f83" {...PA_LINEA} />
      <path d="M46 56 L68 16 L92 56 Z" fill="#3f7a6d" {...PA_LINEA} />
      <path d="M68 16 L76 29 q-4 3 -8 0 q-4 3 -8 0 Z" fill="#fdf8ea" {...PA_LINEA} strokeWidth="2" />
      {/* loma de pasto */}
      <path d="M2 66 q46 -16 92 0 Z" fill="#4ca35c" {...PA_LINEA} strokeWidth="2" />
      {/* casita de teja */}
      <path d="M30 52 h20 v-12 l-10 -8 l-10 8 Z" fill="#fff4dc" {...PA_LINEA} />
      <path d="M27 41 l13 -10 l13 10" fill="none" {...PA_LINEA} stroke="#c2562f" strokeWidth="4" />
      <rect x="36.5" y="44" width="7" height="8" rx="1.5" fill="#8a5a34" {...PA_LINEA} strokeWidth="1.8" />
      {/* arbolito */}
      <path d="M62 54 v-6" fill="none" {...PA_LINEA} stroke="#6e4a2a" strokeWidth="2.4" />
      <circle cx="62" cy="43" r="6.5" fill="#5cb56c" {...PA_LINEA} strokeWidth="2" />
    </svg>
  ),
};

function buildPuertas({ onNavigate, irATodaMiFinca, mostrarAnimales }) {
  const puertas = [
    { id: 'matas', emoji: '🌱', nombre: 'Mis matas', tinte: 'verde', abre: 'sus siembras y cultivos', onClick: () => onNavigate?.('mundo_cultivos') },
    { id: 'animales', emoji: '🐔', nombre: 'Mis animales', tinte: 'teja', abre: 'sus gallinas, cerdos y demás animales', onClick: () => onNavigate?.('mundo', { mundo: 'animales' }) },
    { id: 'tiempo', emoji: '🌦️', nombre: 'El tiempo', tinte: 'cielo', abre: 'el clima de hoy y los próximos días', onClick: () => onNavigate?.('hoy_finca') },
    { id: 'vender', emoji: '🧺', nombre: 'Vender', tinte: 'ambar', abre: 'precios, mercado y su despensa', onClick: () => onNavigate?.('mercado') },
    { id: 'aprender', emoji: '📖', nombre: 'Aprender', tinte: 'uva', abre: 'las lecciones y guías del campo', onClick: () => onNavigate?.('aprende') },
    { id: 'finca', emoji: '🏡', nombre: 'Toda mi finca', tinte: 'menta', abre: 'todos los mundos de su finca', onClick: () => irATodaMiFinca() },
  ];
  return mostrarAnimales ? puertas : puertas.filter((p) => p.id !== 'animales');
}

// ════════════════════════════════════════════════════════════════════════════
//  ESCENAS ISOMÉTRICAS — del mockup F2 (un SVG por escala). Cada escena recibe
//  el `cielo` real y dibuja sol/luna/estrellas + velo de clima vía <Sky>.
// ════════════════════════════════════════════════════════════════════════════

/** VARIANTE A · BALCÓN URBANO (materas, baranda, ciudad de fondo). */
function SceneBalcon({ poblada, cielo }) {
  const noche = esNoche(cielo);
  const [cieloA, cieloB] = cieloEscena(cielo, 'balcon');
  return (
    <svg viewBox="0 0 390 360" preserveAspectRatio="xMidYMid slice"
      aria-label="Su balcón urbano visto en isométrico: materas con tomate y aromáticas, baranda y la ciudad de fondo.">
      <defs>
        <SolGrad />
        <linearGradient id="fvh-sky-balc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cieloA} /><stop offset="1" stopColor={cieloB} />
        </linearGradient>
        <linearGradient id="fvh-city-balc" x1="0" y1="0" x2="0" y2="1">
          {noche
            ? (<><stop offset="0" stopColor="#33415a" /><stop offset="1" stopColor="#2a364b" /></>)
            : (<><stop offset="0" stopColor="#b9c9cf" /><stop offset="1" stopColor="#9fb3bb" /></>)}
        </linearGradient>
        <pattern id="fvh-madera-balc" width="14" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-31)">
          <rect width="14" height="8" fill="#c8a06a" /><line x1="0" y1="0" x2="14" y2="0" stroke="#9c7642" strokeWidth="1" opacity=".5" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="390" height="360" fill="url(#fvh-sky-balc)" />
      {/* cielo real: sol/luna/estrellas + clima */}
      <Sky cielo={cielo} cx={322} cy={50} r={18} lluviaY={140} />
      {/* ventanas encendidas de la ciudad (de noche brillan más) */}
      <g fill="url(#fvh-city-balc)" opacity=".9">
        <rect x="20" y="118" width="42" height="120" rx="3" />
        <rect x="70" y="92" width="36" height="146" rx="3" />
        <rect x="116" y="130" width="30" height="108" rx="3" />
        <rect x="250" y="104" width="40" height="134" rx="3" />
        <rect x="296" y="134" width="32" height="104" rx="3" />
        <rect x="334" y="110" width="36" height="128" rx="3" />
      </g>
      <g fill={noche ? '#ffd86b' : '#fff5cf'} opacity={noche ? '0.95' : '.75'}>
        <rect x="78" y="104" width="7" height="9" rx="1" /><rect x="90" y="104" width="7" height="9" rx="1" />
        <rect x="78" y="122" width="7" height="9" rx="1" /><rect x="90" y="122" width="7" height="9" rx="1" />
        <rect x="258" y="118" width="7" height="9" rx="1" /><rect x="270" y="118" width="7" height="9" rx="1" />
        <rect x="342" y="124" width="7" height="9" rx="1" /><rect x="354" y="124" width="7" height="9" rx="1" />
      </g>

      {/* PISO DEL BALCÓN */}
      <path d="M195 320 L70 252 L70 240 L195 308 L320 240 L320 252 Z" fill="#7a5230" />
      <polygon points="195,200 320,240 195,308 70,240" fill="url(#fvh-madera-balc)" stroke="#8a6038" strokeWidth="2" />
      <g stroke="#8a6038" strokeWidth="1.2" opacity=".5">
        <line x1="132" y1="220" x2="257" y2="264" /><line x1="116" y1="232" x2="241" y2="276" /><line x1="150" y1="208" x2="275" y2="252" />
      </g>

      {/* baranda */}
      <g className="fvh-rise" style={{ animationDelay: '.1s' }}>
        <polygon points="70,252 195,320 195,300 70,232" fill="#2f3b40" opacity=".18" />
        <g stroke="#52606a" strokeWidth="3.5" strokeLinecap="round">
          <path d="M84 258 v-30" /><path d="M108 271 v-30" /><path d="M132 284 v-30" /><path d="M156 296 v-30" /><path d="M180 309 v-30" />
        </g>
        <path d="M72 230 L196 298" stroke="#62707a" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g stroke="#52606a" strokeWidth="3.5" strokeLinecap="round" className="fvh-rise" style={{ animationDelay: '.1s' }}>
        <path d="M212 309 v-30" /><path d="M236 296 v-30" /><path d="M260 284 v-30" /><path d="M284 271 v-30" /><path d="M308 258 v-30" />
      </g>
      <path d="M196 298 L320 230" stroke="#62707a" strokeWidth="5" strokeLinecap="round" className="fvh-rise" style={{ animationDelay: '.1s' }} />

      {poblada ? (
        <g>
          {/* matera 1 · tomate */}
          <g className="fvh-rise-svg" style={{ animationDelay: '.24s' }} transform="translate(150 250)">
            <path d="M-18 0 L0 10 L18 0 L18 14 L0 24 L-18 14 Z" fill="#c2562f" />
            <path d="M-18 0 L0 10 L18 0 L0 -8 Z" fill="#d9683c" />
            <ellipse cx="0" cy="-2" rx="14" ry="5" fill="#6e4a2a" />
            <g className="fvh-sway">
              <path d="M0 -2 V-40" stroke="#5a8f3a" strokeWidth="3" strokeLinecap="round" />
              <path d="M0 -14 q-10 -3 -14 -11" stroke="#4ca35c" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M0 -26 q10 -3 14 -10" stroke="#4ca35c" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M0 -36 q-9 -2 -12 -9" stroke="#4ca35c" strokeWidth="3" fill="none" strokeLinecap="round" />
              <circle cx="6" cy="-22" r="4" fill="#ff5d44" /><circle cx="-7" cy="-30" r="3.5" fill="#ff7a59" />
              <circle cx="-2" cy="-12" r="3.5" fill="#ffd24d" />
            </g>
            <path d="M9 -4 L7 -42" stroke="#a8763e" strokeWidth="2" strokeLinecap="round" />
          </g>
          {/* matera 2 · aromáticas */}
          <g className="fvh-rise-svg" style={{ animationDelay: '.34s' }} transform="translate(214 250)">
            <path d="M-16 0 L0 9 L16 0 L16 12 L0 21 L-16 12 Z" fill="#5f8c4e" />
            <path d="M-16 0 L0 9 L16 0 L0 -7 Z" fill="#6fa05c" />
            <ellipse cx="0" cy="-1" rx="12" ry="4" fill="#5a4329" />
            <g className="fvh-sway-slow" fill="#4ca35c">
              <circle cx="-6" cy="-9" r="5" /><circle cx="6" cy="-9" r="5" /><circle cx="0" cy="-15" r="5.5" />
              <circle cx="-3" cy="-7" r="3.5" fill="#6fc46f" /><circle cx="5" cy="-12" r="3" fill="#6fc46f" />
            </g>
          </g>
          {/* matera 3 · colgantes */}
          <g className="fvh-rise-svg" style={{ animationDelay: '.42s' }} transform="translate(118 268) scale(.85)">
            <path d="M-14 0 L0 8 L14 0 L14 11 L0 19 L-14 11 Z" fill="#caa066" />
            <path d="M-14 0 L0 8 L14 0 L0 -6 Z" fill="#d8b277" />
            <g className="fvh-sway" fill="#5bb06e">
              <circle cx="-4" cy="-6" r="4" /><circle cx="5" cy="-6" r="4" /><circle cx="0" cy="-11" r="4.5" />
              <circle cx="-3" cy="-3" r="3" fill="#ff9ec4" />
            </g>
          </g>
          {/* regadera */}
          <g transform="translate(258 266)" className="fvh-rise" style={{ animationDelay: '.5s' }}>
            <ellipse cx="0" cy="6" rx="12" ry="5" fill="#3f7a8c" />
            <path d="M-12 6 V-4 a12 5 0 0 0 24 0 V6" fill="#4f97a8" />
            <path d="M12 -2 q10 -2 14 6" stroke="#3f7a8c" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
          {/* gato del balcón */}
          <g transform="translate(95 246)" className="fvh-rise" style={{ animationDelay: '.6s' }}>
            <ellipse cx="0" cy="10" rx="13" ry="5" fill="#3a2a1c" opacity=".18" />
            <path d="M-10 8 q-2 -14 10 -14 q12 0 10 14 Z" fill="#9a9a9a" />
            <circle cx="6" cy="-9" r="7" fill="#9a9a9a" />
            <path d="M2 -14 l-2 -5 l5 3 Z" fill="#9a9a9a" /><path d="M10 -14 l2 -5 l-5 3 Z" fill="#9a9a9a" />
            <circle cx="4" cy="-9" r="1.3" fill="#1f2a18" /><circle cx="9" cy="-9" r="1.3" fill="#1f2a18" />
            <g className="fvh-an-trotecito"><path d="M-9 6 q-12 0 -12 -12" stroke="#9a9a9a" strokeWidth="5" fill="none" strokeLinecap="round" /></g>
          </g>
        </g>
      ) : (
        <g>
          <g className="fvh-rise-svg" style={{ animationDelay: '.24s' }} transform="translate(160 252)">
            <path d="M-18 0 L0 10 L18 0 L18 14 L0 24 L-18 14 Z" fill="#c2562f" />
            <path d="M-18 0 L0 10 L18 0 L0 -8 Z" fill="#d9683c" />
            <ellipse cx="0" cy="-2" rx="14" ry="5" fill="#6e4a2a" />
            <g><path d="M0 -2 V-9" stroke="#5bb06e" strokeWidth="2.5" strokeLinecap="round" /><circle cx="0" cy="-11" r="3" fill="#7fc06f" /></g>
          </g>
          <g className="fvh-rise-svg" style={{ animationDelay: '.34s' }} transform="translate(214 254)">
            <path d="M-16 0 L0 9 L16 0 L16 12 L0 21 L-16 12 Z" fill="#caa066" />
            <path d="M-16 0 L0 9 L16 0 L0 -7 Z" fill="#d8b277" />
            <ellipse cx="0" cy="-1" rx="12" ry="4" fill="#5a4329" />
          </g>
        </g>
      )}
      {/* veladura ámbar del sol bajo (amanecer/atardecer) */}
      <WashSolBajo cielo={cielo} />
    </svg>
  );
}

/** VARIANTE B · INVERNADERO (techo translúcido, hileras densas de tomate). */
function SceneInvernadero({ poblada, cielo }) {
  const [cieloA, cieloB] = cieloEscena(cielo, 'invernadero');
  // Hileras densas (monocultivo) generadas como en el mockup (buildInvernadero).
  const hileras = useMemo(() => {
    const filas = [
      { x0: 96, y0: 222, n: 7 }, { x0: 128, y0: 206, n: 7 },
      { x0: 160, y0: 190, n: 7 }, { x0: 192, y0: 174, n: 7 },
    ];
    const dx = 16; const dy = 8.6;
    const out = [];
    filas.forEach((h, hi) => {
      for (let i = 0; i < h.n; i++) {
        out.push({
          key: `${hi}-${i}`,
          x: h.x0 + i * dx,
          y: h.y0 + i * dy,
          sway: (i + hi) % 2 === 0 ? 'fvh-sway' : 'fvh-sway-slow',
        });
      }
    });
    return out;
  }, []);

  return (
    <svg viewBox="0 0 390 360" preserveAspectRatio="xMidYMid slice"
      aria-label="Su invernadero visto en isométrico: techo translúcido y hileras densas de tomate en monocultivo, con líneas de riego. Diez mil plantas.">
      <defs>
        <SolGrad />
        <linearGradient id="fvh-sky-inv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cieloA} /><stop offset="1" stopColor={cieloB} />
        </linearGradient>
        <linearGradient id="fvh-piso-inv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bfae8a" /><stop offset="1" stopColor="#9a8a64" /></linearGradient>
        <linearGradient id="fvh-techo-inv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cdeef0" stopOpacity=".82" /><stop offset="1" stopColor="#a6dde2" stopOpacity=".5" /></linearGradient>
        <linearGradient id="fvh-hilera-inv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fc06f" /><stop offset="1" stopColor="#3f8f4e" /></linearGradient>
      </defs>
      <rect x="0" y="0" width="390" height="360" fill="url(#fvh-sky-inv)" />
      <Sky cielo={cielo} cx={326} cy={48} r={15} lluviaY={120} />

      {poblada && (
        <g className="fvh-rise-svg" style={{ animationDelay: '.05s' }} transform="translate(195 64)">
          <rect x="-78" y="-22" width="156" height="44" rx="22" fill="#1f5d30" opacity=".94" />
          <text x="-46" y="9" fontSize="26" fontFamily="Baloo 2" fontWeight="800" fill="#bef264" textAnchor="middle">10.000</text>
          <text x="34" y="-2" fontSize="11" fontFamily="Nunito" fontWeight="800" fill="#fff" textAnchor="middle">plantas</text>
          <text x="34" y="11" fontSize="9.5" fontFamily="Nunito" fontWeight="700" fill="#d6ec8e" textAnchor="middle">de tomate</text>
        </g>
      )}

      {/* PISO del invernadero */}
      <path d="M195 330 L48 252 L48 238 L195 316 L342 238 L342 252 Z" fill="#7a6a44" />
      <polygon points="195,170 342,238 195,316 48,238" fill="url(#fvh-piso-inv)" stroke="#8a7a52" strokeWidth="2" />

      {poblada ? (
        <>
          {/* HILERAS densas de tomate */}
          <g className="fvh-rise" style={{ animationDelay: '.2s' }} strokeLinecap="round">
            <g>
              {hileras.map((m) => (
                <g key={m.key} transform={`translate(${m.x} ${m.y})`}>
                  <g className={m.sway}>
                    <path d="M0 0 V-18" stroke="#3f8f4e" strokeWidth="2.4" strokeLinecap="round" />
                    <circle cx="0" cy="-18" r="5.5" fill="url(#fvh-hilera-inv)" />
                    <circle cx="-3" cy="-12" r="2" fill="#ff5d44" /><circle cx="3" cy="-8" r="2" fill="#ffd24d" />
                  </g>
                </g>
              ))}
            </g>
          </g>
          {/* líneas de riego */}
          <g className="fvh-rise" style={{ animationDelay: '.34s' }} stroke="#2b2b2b" strokeWidth="2.4" fill="none" opacity=".75">
            <path d="M96 222 L210 282" /><path d="M128 206 L242 266" /><path d="M160 190 L274 250" /><path d="M192 174 L306 234" />
          </g>
          <g fill="#4f9fc0" className="fvh-rise" style={{ animationDelay: '.4s' }}>
            <circle cx="120" cy="235" r="2" /><circle cx="152" cy="219" r="2" /><circle cx="184" cy="203" r="2" />
            <circle cx="166" cy="244" r="2" /><circle cx="198" cy="228" r="2" /><circle cx="230" cy="261" r="2" />
          </g>
        </>
      ) : (
        <g>
          <g stroke="#8a7a52" strokeWidth="2" opacity=".6">
            <path d="M96 222 L210 282" fill="none" /><path d="M128 206 L242 266" fill="none" />
            <path d="M160 190 L274 250" fill="none" /><path d="M192 174 L306 234" fill="none" />
          </g>
          <g transform="translate(195 250)">
            <rect x="-58" y="-12" width="116" height="24" rx="12" fill="#fff" opacity=".9" />
            <text x="0" y="5" fontSize="11" fontFamily="Baloo 2" fontWeight="700" fill="#a8763e" textAnchor="middle">Surcos listos · 0 trasplantes</text>
          </g>
        </g>
      )}

      {/* estructura: arcos + techo translúcido */}
      <g className="fvh-rise" style={{ animationDelay: '.12s' }}>
        <g stroke="#cfd9d2" strokeWidth="4" strokeLinecap="round" opacity=".95">
          <path d="M56 244 V150" /><path d="M334 244 V150" /><path d="M195 316 V224" />
        </g>
        <path d="M56 150 Q195 96 334 150 L334 158 Q195 104 56 158 Z" fill="url(#fvh-techo-inv)" stroke="#bfe6ea" strokeWidth="2" />
        <path d="M56 150 Q195 96 334 150" fill="none" stroke="#dff4f5" strokeWidth="2" opacity=".8" />
        <g stroke="#cfe9ea" strokeWidth="1.5" opacity=".7" fill="none">
          <path d="M104 134 Q195 110 286 134" /><path d="M150 122 Q195 112 240 122" />
        </g>
        <polygon points="56,158 56,244 195,316 195,224" fill="#cdeef0" opacity=".22" />
        <polygon points="334,158 334,244 195,316 195,224" fill="#a6dde2" opacity=".18" />
      </g>

      {poblada && (
        <>
          <g className="fvh-bicho abeja" transform="translate(150 200)" aria-hidden="true" style={{ position: 'static' }}>
            <text fontSize="18">🐝</text>
          </g>
          <g className="fvh-rise-svg" style={{ animationDelay: '.5s' }} transform="translate(195 300)">
            <rect x="-66" y="-13" width="132" height="26" rx="13" fill="#fff" opacity=".92" />
            <text x="0" y="5" fontSize="11" fontFamily="Baloo 2" fontWeight="700" fill="#2f6b3a" textAnchor="middle">Monocultivo · riego por goteo</text>
          </g>
        </>
      )}
      {/* veladura ámbar del sol bajo (amanecer/atardecer) */}
      <WashSolBajo cielo={cielo} />
    </svg>
  );
}

/**
 * VARIANTE C · FINCA DIVERSA (la isla rica). Cuando `poblada`, dibuja las
 * parcelas (milpa, hortaliza), el estanque con pato, el corral con cerdo y
 * gallina, la vaca, la colmena, el guamo de sombra y los arbolitos del mockup
 * F2. El estado vacío es la versión "recién empieza" (terreno listo · 0 siembras).
 */
function SceneFinca({ poblada, cielo, estructura, escalaFinca }) {
  const noche = esNoche(cielo);
  const [cieloA, cieloB] = cieloEscena(cielo, 'finca');
  // Estructura de cubierta declarada en el perfil (#34 fase 1): invernadero de
  // túnel / nave a dos aguas / casa-sombra / malla-sombra / umbráculo. Se
  // dibuja también con la finca vacía: la estructura EXISTE aunque no haya
  // siembras registradas (es infraestructura declarada, no fenología).
  const conEstructura = !!estructura?.tiene;
  const ariaEstructura = conEstructura
    ? ` Incluye su ${nombreEstructura(estructura.forma)}.`
    : '';
  return (
    <svg viewBox="0 0 390 360" preserveAspectRatio="xMidYMid slice"
      data-testid="fvh-escena-finca"
      aria-label={`Su finca vista en isométrico: milpa, hortaliza, estanque con pato, corral con cerdo, gallina, vaca y abejas, y un guamo de sombra al centro.${ariaEstructura}`}>
      <defs>
        <SolGrad />
        <linearGradient id="fvh-sky-f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cieloA} /><stop offset="1" stopColor={cieloB} />
        </linearGradient>
        <linearGradient id="fvh-agua-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9fe3ee" /><stop offset="1" stopColor="#5ab8d8" /></linearGradient>
        <linearGradient id="fvh-tile-suelo-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9bb45a" /><stop offset="1" stopColor="#6f8a3f" /></linearGradient>
        <linearGradient id="fvh-tile-verde-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fc06f" /><stop offset="1" stopColor="#4ca35c" /></linearGradient>
        <linearGradient id="fvh-tile-milpa-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c8d96a" /><stop offset="1" stopColor="#9bbf48" /></linearGradient>
        {/* bruma del valle — banda que separa la cordillera de las lomas */}
        <linearGradient id="fvh-bruma-f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <pattern id="fvh-pasto-f" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M3 9 q1 -4 0 -6 M6 10 q0 -5 1 -7 M9 9 q-1 -4 0 -6" stroke="#5f8a3f" strokeWidth="1" fill="none" opacity=".45" strokeLinecap="round" />
        </pattern>
        {/* trama de malla (polisombra) — la usan casa-sombra y malla-sombra */}
        <pattern id="fvh-malla-f" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 0 L4 4 M4 0 L0 4" stroke="#425446" strokeWidth=".6" opacity=".5" fill="none" />
        </pattern>
        <filter id="fvh-soft-f" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" /></filter>
      </defs>

      <rect x="0" y="0" width="390" height="360" fill="url(#fvh-sky-f)" />
      {/* cielo real: sol que respira de día / luna + estrellas de noche + clima */}
      <Sky cielo={cielo} cx={322} cy={52} r={20} lluviaY={140} />
      {/* nubes ambiente (suaves) — sólo de día y si no está ya cubierto */}
      {!noche && !esCubierto(cielo) && (
        <g fill="#ffffff" opacity=".9">
          <g><animateTransform attributeName="transform" type="translate" values="0 0;12 0;0 0" dur="20s" repeatCount="indefinite" />
            <ellipse cx="70" cy="42" rx="24" ry="12" /><ellipse cx="92" cy="38" rx="17" ry="12" /><ellipse cx="54" cy="38" rx="14" ry="10" /></g>
          <g opacity=".75"><animateTransform attributeName="transform" type="translate" values="0 0;-10 0;0 0" dur="26s" repeatCount="indefinite" />
            <ellipse cx="212" cy="32" rx="18" ry="9" /><ellipse cx="228" cy="29" rx="13" ry="9" /></g>
        </g>
      )}
      {/* aves lejanas (solo de día despejado): dos trazos "m" que planean */}
      {!noche && !esCubierto(cielo) && (
        <g className="fvh-aves" stroke="#41616e" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".55">
          <path d="M120 66 q4 -5 8 0 q4 -5 8 0" />
          <path d="M150 54 q3 -4 6 0 q3 -4 6 0" opacity=".8" />
        </g>
      )}

      {/* CORDILLERA LEJANA — perspectiva aérea (azulada, dos planos) */}
      <path
        d="M0 148 Q46 108 96 132 Q138 96 186 126 Q232 92 278 124 Q328 98 390 130 V210 H0 Z"
        fill={noche ? '#243a55' : '#8fb4c2'} opacity=".5"
      />
      <path
        d="M0 158 Q70 120 140 142 Q210 112 280 140 Q340 118 390 142 V214 H0 Z"
        fill={noche ? '#2b4460' : '#7ba6b0'} opacity=".45"
      />
      {/* bruma del valle entre la cordillera y las lomas (deriva lenta) */}
      <rect className="fvh-bruma" x="-30" y="138" width="450" height="30" fill="url(#fvh-bruma-f)" opacity={noche ? 0.22 : 0.5} />

      {/* colinas de fondo */}
      <path d="M0 158 Q100 122 200 150 T390 146 V210 H0 Z" fill={noche ? '#3a5a40' : '#6f9a52'} opacity=".55" />
      <path d="M0 174 Q120 144 250 168 T390 164 V220 H0 Z" fill={noche ? '#31503a' : '#5f8a47'} opacity=".6" />
      {/* arbolitos-silueta sobre la loma (profundidad de plano medio) */}
      <g fill={noche ? '#2b4634' : '#547d40'} opacity=".7">
        <path d="M58 160 q4 -12 8 0 l-2 0 v4 h-4 v-4 Z" />
        <path d="M300 158 q4 -11 8 0 l-2 0 v4 h-4 v-4 Z" />
        <path d="M338 166 q3 -9 6 0 l-1.5 0 v3 h-3 v-3 Z" />
      </g>

      {/* LUCIÉRNAGAS — solo de noche, el campo respira (titileo escalonado) */}
      {noche && (
        <g fill="#d9f99d" className="fvh-lucis">
          <circle className="fvh-luci" cx="96" cy="212" r="2" />
          <circle className="fvh-luci" cx="150" cy="188" r="1.6" style={{ animationDelay: '.9s' }} />
          <circle className="fvh-luci" cx="252" cy="200" r="1.8" style={{ animationDelay: '1.7s' }} />
          <circle className="fvh-luci" cx="304" cy="236" r="1.5" style={{ animationDelay: '2.4s' }} />
          <circle className="fvh-luci" cx="204" cy="172" r="1.4" style={{ animationDelay: '3.1s' }} />
        </g>
      )}

      {/* PLATAFORMA ISO (la "isla" finca) */}
      <ellipse cx="195" cy="330" rx="150" ry="22" fill="#1c2418" opacity=".22" filter="url(#fvh-soft-f)" />
      <path d="M195 332 L40 244 L40 220 L195 308 L350 220 L350 244 Z" fill="#5e4626" />
      <path d="M195 332 L40 244 L40 220 L195 308 Z" fill="#4d3a1f" />
      {/* raíces/estratos del talud (la isla tiene suelo VIVO, no un bloque plano) */}
      <g stroke="#3e2e18" strokeWidth="1.4" opacity=".5" strokeLinecap="round">
        <path d="M84 252 q6 8 2 16" /><path d="M150 286 q5 7 1 13" /><path d="M262 278 q-5 8 -1 14" /><path d="M316 250 q-6 8 -2 15" />
      </g>
      <polygon points="195,148 350,220 195,308 40,220" fill="url(#fvh-tile-suelo-f)" />
      <polygon points="195,148 350,220 195,308 40,220" fill="url(#fvh-pasto-f)" />
      {/* filo de luz sobre las aristas superiores de la isla */}
      <path d="M40 220 L195 148 L350 220" fill="none" stroke="#e4efb4" strokeWidth="1.6" opacity=".5" />
      <g stroke="#5f8a3f" strokeWidth="1.4" opacity=".4">
        <line x1="118" y1="196" x2="272" y2="196" /><line x1="98" y1="218" x2="292" y2="218" /><line x1="118" y1="240" x2="272" y2="240" />
      </g>
      {/* matas de flores silvestres + piedritas (textura de pradera viva) */}
      <g aria-hidden="true">
        <g fill="#f2b441"><circle cx="152" cy="252" r="2" /><circle cx="158" cy="255" r="1.6" /></g>
        <g fill="#ff9ec4"><circle cx="236" cy="250" r="1.8" /><circle cx="242" cy="253" r="1.4" /></g>
        <g fill="#e8e2d2" opacity=".8"><ellipse cx="176" cy="290" rx="3" ry="1.8" /><ellipse cx="216" cy="293" rx="2.4" ry="1.5" /></g>
      </g>

      {/* ESTRUCTURA DE CUBIERTA DECLARADA (#34 fase 1 — bug del operador: el
          perfil decía "tengo invernadero" y la escena no lo dibujaba). Se pinta
          al fondo de la isla (banda superior libre, entre la milpa y la
          hortaliza), ANTES de las parcelas para respetar la profundidad
          isométrica. El tamaño acompaña la escala declarada de la finca:
          en una finca extensa el invernadero se ve proporcionalmente menor. */}
      {conEstructura && (
        <EstructuraCubierta
          forma={estructura.forma}
          tamano={estructura.tamano}
          escalaFinca={escalaFinca}
          noche={noche}
        />
      )}

      {poblada ? (
        <>
          {/* PARCELA milpa */}
          <g className="fvh-rise" style={{ animationDelay: '.15s' }}>
            <polygon points="118,188 178,216 130,244 70,216" fill="url(#fvh-tile-milpa-f)" stroke="#7da53a" strokeWidth="1.5" />
            <g className="fvh-sway" stroke="#3f8f4e" strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M105 220 V204" /><path d="M105 208 q6 -3 9 -6" /><path d="M105 212 q-6 -3 -9 -5" />
              <path d="M125 226 V210" /><path d="M125 214 q6 -3 9 -6" />
              <path d="M118 204 V190" /><path d="M118 194 q-6 -3 -9 -5" />
            </g>
            <circle cx="118" cy="190" r="3" fill="#ffd24d" />
            <circle cx="92" cy="226" r="4.5" fill="#ff9d3c" /><circle cx="138" cy="236" r="4" fill="#ffb74d" />
          </g>

          {/* PARCELA hortaliza */}
          <g className="fvh-rise" style={{ animationDelay: '.28s' }}>
            <polygon points="262,188 322,216 262,244 202,216" fill="url(#fvh-tile-verde-f)" stroke="#3f8f4e" strokeWidth="1.5" />
            <g className="fvh-sway-slow" fill="#3f8f4e">
              <circle cx="240" cy="214" r="6" /><circle cx="262" cy="224" r="6.5" /><circle cx="284" cy="214" r="6" />
              <circle cx="252" cy="204" r="5" /><circle cx="274" cy="204" r="5" />
            </g>
            <g fill="#6fc46f"><circle cx="240" cy="212" r="3" /><circle cx="262" cy="221" r="3.5" /><circle cx="284" cy="212" r="3" /></g>
            <circle cx="253" cy="220" r="3" fill="#ff9ec4" />
          </g>

          {/* ESTANQUE con PATO */}
          <g className="fvh-rise" style={{ animationDelay: '.4s' }}>
            <polygon points="118,244 168,268 130,290 80,266" fill="url(#fvh-agua-f)" stroke="#4f9fc0" strokeWidth="1.5" />
            <g className="fvh-ripple" stroke="#fff" strokeWidth="1.4" opacity=".6" fill="none" strokeLinecap="round">
              <path d="M104 264 q8 -4 16 0" /><path d="M118 272 q8 -4 16 0" />
            </g>
            <g transform="translate(128 262)">
              <g className="fvh-an-chapotea">
                <ellipse cx="0" cy="6" rx="11" ry="4" fill="#1c2418" opacity=".18" />
                <path d="M-10 2 q0 -8 11 -8 q11 0 9 7 q-2 4 -10 4 q-8 0 -10 -3 Z" fill="#f4f4ef" />
                <circle cx="9" cy="-7" r="5" fill="#f4f4ef" />
                <circle cx="11" cy="-8" r="1.2" fill="#1f2a18" />
                <path d="M13 -7 l6 1 l-6 2 Z" fill="#ffb74d" />
                <path d="M-9 2 q-2 3 2 4" fill="none" stroke="#cfcfc6" strokeWidth="1.5" />
              </g>
            </g>
          </g>

          {/* CORRAL con CERDO + GALLINA */}
          <g className="fvh-rise" style={{ animationDelay: '.52s' }}>
            <polygon points="262,244 312,268 274,290 224,266" fill="#b89b6a" stroke="#8a6e44" strokeWidth="1.5" />
            <g stroke="#8a6e44" strokeWidth="2.2" strokeLinecap="round">
              <path d="M240 252 v-10" /><path d="M252 258 v-10" /><path d="M264 264 v-10" /><path d="M298 254 v-10" />
            </g>
            {/* cerdo (cuerpo que se menea) */}
            <g transform="translate(272 264)">
              <ellipse cx="0" cy="9" rx="16" ry="5" fill="#1c2418" opacity=".18" />
              <g className="fvh-an-menea">
                <ellipse cx="0" cy="0" rx="15" ry="10" fill="#f1a6b0" />
                <circle cx="13" cy="-2" r="7" fill="#f1a6b0" />
                <ellipse cx="18" cy="-1" rx="3.5" ry="3" fill="#e88a98" />
                <circle cx="17" cy="-2" r="1" fill="#7a3d48" /><circle cx="19" cy="-2" r="1" fill="#7a3d48" />
                <circle cx="11" cy="-7" r="1.2" fill="#3a2024" />
                <path d="M8 -9 l3 -5 l2 5 Z" fill="#e88a98" />
                <path d="M-14 2 q-7 2 -4 -3" stroke="#e88a98" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                <rect x="-10" y="8" width="3" height="5" rx="1.5" fill="#e88a98" /><rect x="6" y="8" width="3" height="5" rx="1.5" fill="#e88a98" />
              </g>
            </g>
            {/* gallina (cabeza que picotea) */}
            <g transform="translate(244 256)">
              <ellipse cx="0" cy="7" rx="8" ry="3" fill="#1c2418" opacity=".18" />
              <ellipse cx="0" cy="0" rx="8" ry="6.5" fill="#f4ead0" />
              <path d="M-7 1 q-4 1 -2 -4" fill="#d8b277" />
              <g className="fvh-an-picotea">
                <circle cx="6" cy="-5" r="4" fill="#f4ead0" />
                <path d="M5 -8 q1 -4 3 -2 q-1 2 -3 2" fill="#e0532f" />
                <path d="M10 -5 l4 1 l-4 1 Z" fill="#ffb74d" />
                <circle cx="7" cy="-6" r="1" fill="#3a2024" />
              </g>
              <line x1="-2" y1="6" x2="-2" y2="10" stroke="#c79a4a" strokeWidth="1.4" /><line x1="3" y1="6" x2="3" y2="10" stroke="#c79a4a" strokeWidth="1.4" />
            </g>
          </g>

          {/* VACA con cola */}
          <g className="fvh-rise-svg" style={{ animationDelay: '.6s' }} transform="translate(96 268)">
            <ellipse cx="0" cy="12" rx="20" ry="6" fill="#1c2418" opacity=".18" />
            <g className="fvh-an-cola"><path d="M-16 -4 q-10 6 -8 16" stroke="#d8c8b0" strokeWidth="2.6" fill="none" strokeLinecap="round" /><circle cx="-24" cy="13" r="2.5" fill="#7a5230" /></g>
            <ellipse cx="0" cy="0" rx="18" ry="11" fill="#f6efe4" />
            <ellipse cx="-7" cy="-2" rx="6" ry="5" fill="#a8763e" /><ellipse cx="8" cy="3" rx="5" ry="4" fill="#a8763e" />
            <circle cx="16" cy="-4" r="8" fill="#f6efe4" />
            <ellipse cx="20" cy="-2" rx="3.5" ry="3" fill="#f1c0c8" />
            <circle cx="14" cy="-7" r="1.2" fill="#2a1c14" />
            <path d="M11 -11 q-2 -4 2 -4" stroke="#cbb89c" strokeWidth="2.4" fill="none" /><path d="M22 -10 q3 -3 1 -5" stroke="#cbb89c" strokeWidth="2.4" fill="none" />
            <rect x="-12" y="9" width="3.5" height="7" rx="1.5" fill="#d8c8b0" /><rect x="8" y="9" width="3.5" height="7" rx="1.5" fill="#d8c8b0" />
          </g>

          {/* COLMENA */}
          <g className="fvh-rise-svg" style={{ animationDelay: '.66s' }} transform="translate(300 252)">
            <rect x="-10" y="-2" width="20" height="16" rx="3" fill="#d9a441" />
            <rect x="-10" y="-2" width="20" height="5" rx="2" fill="#c98e30" />
            <rect x="-10" y="4" width="20" height="1.6" fill="#b07e2a" />
            <circle cx="0" cy="10" r="1.6" fill="#5e4022" />
            <polygon points="-12,-2 0,-9 12,-2" fill="#8a6e44" />
          </g>

          {/* GUAMO grande */}
          <g className="fvh-rise-svg" style={{ animationDelay: '.62s' }} transform="translate(195 272)">
            <ellipse cx="0" cy="34" rx="34" ry="8" fill="#1c2418" opacity=".2" />
            <g className="fvh-sway">
              <rect x="-5" y="-2" width="10" height="34" rx="4" fill="#7a5230" />
              <circle cx="0" cy="-22" r="27" fill="#2e6b3a" />
              <circle cx="-19" cy="-10" r="17" fill="#3f8f4e" />
              <circle cx="19" cy="-10" r="17" fill="#3f8f4e" />
              <circle cx="0" cy="-6" r="16" fill="#4ca35c" />
              <circle cx="-9" cy="-22" r="11" fill="#5bb06e" /><circle cx="9" cy="-16" r="10" fill="#5bb06e" />
              <circle cx="-8" cy="-28" r="3.5" fill="#ff7a59" /><circle cx="11" cy="-14" r="3.5" fill="#ffb74d" />
            </g>
          </g>

          {/* arbolitos laterales */}
          <g transform="translate(58 184) scale(.72)">
            <g className="fvh-sway-slow" style={{ animationDelay: '.7s' }}>
              <rect x="-4" y="0" width="8" height="24" rx="3" fill="#7a5230" />
              <ellipse cx="0" cy="-10" rx="15" ry="20" fill="#3f8f4e" /><ellipse cx="0" cy="-10" rx="8" ry="13" fill="#5bb06e" />
            </g>
          </g>
          <g transform="translate(332 184) scale(.68)">
            <g className="fvh-sway" style={{ animationDelay: '.8s' }}>
              <rect x="-4" y="0" width="8" height="24" rx="3" fill="#7a5230" />
              <circle cx="0" cy="-14" r="15" fill="#2e6b3a" /><circle cx="0" cy="0" r="13" fill="#4ca35c" />
            </g>
          </g>

          {/* sendero de piedra hacia el frente (invita a entrar) */}
          <g>
            <path d="M195 308 L172 326 L218 326 Z" fill="#d8c39a" opacity=".55" />
            <ellipse cx="195" cy="311" rx="6" ry="3" fill="#e3d2ab" />
            <ellipse cx="191" cy="318" rx="7" ry="3.4" fill="#d8c39a" />
            <ellipse cx="198" cy="325" rx="8" ry="3.6" fill="#cdb78e" />
          </g>
        </>
      ) : (
        <g>
          <g stroke="#5f8a3f" strokeWidth="1.6" opacity=".5">
            <line x1="118" y1="196" x2="272" y2="196" /><line x1="98" y1="218" x2="292" y2="218" /><line x1="118" y1="240" x2="272" y2="240" />
          </g>
          <g transform="translate(195 224)">
            <ellipse cx="0" cy="6" rx="11" ry="6" fill="#8a6a3a" />
            <path d="M0 0 Q-5 -10 0 -18 Q5 -10 0 0" fill="#5bb06e" />
          </g>
          <g transform="translate(195 256)">
            <rect x="-62" y="-12" width="124" height="24" rx="12" fill="#fff" opacity=".9" />
            <text x="0" y="5" fontSize="11" fontFamily="Baloo 2" fontWeight="700" fill="#a8763e" textAnchor="middle">Terreno listo · 0 siembras</text>
          </g>
        </g>
      )}

      {/* FOLLAJE DE PRIMER PLANO — hojas que enmarcan las esquinas inferiores
          (tercer plano de profundidad: cordillera → isla → follaje cercano) */}
      <g aria-hidden="true" opacity={noche ? 0.85 : 0.9}>
        <g className="fvh-sway-slow" style={{ transformOrigin: '0px 360px' }}>
          <path d="M-8 366 Q6 322 34 314 Q22 348 40 360 Q10 364 -8 366 Z" fill={noche ? '#152b1c' : '#245832'} />
          <path d="M-10 368 Q-2 336 18 326 Q12 352 26 364 Q4 366 -10 368 Z" fill={noche ? '#1d3a26' : '#2e6b3a'} />
        </g>
        <g className="fvh-sway" style={{ transformOrigin: '390px 360px', animationDelay: '.8s' }}>
          <path d="M398 366 Q386 328 358 320 Q372 350 354 362 Q382 366 398 366 Z" fill={noche ? '#152b1c' : '#245832'} />
          <path d="M400 368 Q394 342 376 332 Q382 356 368 366 Q390 368 400 368 Z" fill={noche ? '#1d3a26' : '#2e6b3a'} />
        </g>
      </g>

      {/* veladura ámbar del sol bajo — tiñe TODA la escena al amanecer/atardecer */}
      <WashSolBajo cielo={cielo} />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ESTRUCTURA DE CUBIERTA DECLARADA (#34 fase 1 — fix del bug del operador).
//  El onboarding pregunta "¿Tiene invernadero?" + forma + tamaño y el dato se
//  guardaba en el perfil… pero la escena de finca NUNCA lo dibujaba. Aquí vive
//  el dibujo: una estructura SVG por forma declarada (rsvg-safe, sin filtros),
//  con el tamaño relativo acompañando la escala de la finca. La fuente del dato
//  es getInvernaderoEstructura(perfil) (userProfileService — fuente única).
//
//  Formas que este componente ya sabe dibujar:
//    · tunel        → invernadero de túnel (media luna de plástico curvo).
//    · cuadrado     → invernadero de nave a dos aguas.
//    · casa_sombra  → casa-sombra (paredes y techo de malla anti-insectos).
//    · malla_sombra → malla-sombra (polisombra plana sobre postes, sin paredes).
//    · umbraculo    → umbráculo (techo de listones de madera sobre postes).
//    · otro / null  → estructura cubierta genérica (media agua translúcida).
//
//  NOTA ONBOARDING: hoy la pregunta `invernadero_forma` solo ofrece
//  cuadrado/tunel/otro. Para que el usuario declare casa-sombra, malla-sombra
//  o umbráculo hay que AGREGAR esas opciones a PROFILE_QUESTIONS
//  (userProfileService) — los valores ya son válidos en INVERNADERO_FORMAS y el
//  render de cada una ya está listo aquí.
// ════════════════════════════════════════════════════════════════════════════

/** Nombre legible de cada forma (para el aria-label de la escena). */
const ESTRUCTURA_NOMBRES = Object.freeze({
  tunel: 'invernadero de túnel',
  cuadrado: 'invernadero de nave a dos aguas',
  casa_sombra: 'casa-sombra',
  malla_sombra: 'malla-sombra',
  umbraculo: 'umbráculo',
});
function nombreEstructura(forma) {
  return ESTRUCTURA_NOMBRES[forma] || 'estructura cubierta';
}

/**
 * Factor de tamaño de la estructura según la ESCALA declarada de la finca
 * (SCENE_ESCALAS del selector): en una finca extensa el mismo invernadero se ve
 * proporcionalmente menor que en una de menos de 1 ha. El texto libre de
 * `invernadero_tamano` ("uno pequeño", "media hectárea") solo AFINA ese factor
 * con una heurística mínima — nunca lo decide solo.
 */
const ESCALA_FACTOR_ESTRUCTURA = Object.freeze({
  micro: 1,
  pequena: 1,
  media: 0.86,
  grande: 0.74,
  extensa: 0.64,
});
function factorEstructura(escalaFinca, tamano) {
  let f = ESCALA_FACTOR_ESTRUCTURA[escalaFinca] ?? ESCALA_FACTOR_ESTRUCTURA.media;
  if (typeof tamano === 'string') {
    const t = tamano.toLowerCase();
    if (/peque|chic/.test(t)) f *= 0.85;
    else if (/grande|hect|nave/.test(t)) f *= 1.12;
  }
  return Math.round(f * 100) / 100;
}

/**
 * La estructura de cubierta dentro de la escena de finca. Se ancla en la banda
 * superior libre de la isla (entre la milpa y la hortaliza) y se dibuja ANTES
 * de las parcelas para respetar la profundidad isométrica. `noche` solo la
 * atenúa levemente (el resto de la escena maneja su propia paleta nocturna).
 *
 * @param {Object} props
 * @param {string|null} props.forma       una de INVERNADERO_FORMAS (o null).
 * @param {string|null} props.tamano      texto libre del onboarding.
 * @param {string} [props.escalaFinca]    una de SCENE_ESCALAS (variant.escala).
 * @param {boolean} [props.noche] - ¿la escena está en su paleta nocturna?
 */
function EstructuraCubierta({ forma, tamano, escalaFinca, noche }) {
  const f = factorEstructura(escalaFinca, tamano);
  // Compensa el scale para que el piso de la estructura no "flote": el punto de
  // apoyo local está en y≈12, así que al encoger bajamos el ancla esa diferencia.
  const ty = Math.round((191 + 12 * (1 - f)) * 10) / 10;
  let cuerpo;
  switch (forma) {
    case 'tunel': cuerpo = <EstructuraTunel />; break;
    case 'cuadrado': cuerpo = <EstructuraNave />; break;
    case 'casa_sombra': cuerpo = <EstructuraCasaSombra />; break;
    case 'malla_sombra': cuerpo = <EstructuraMallaSombra />; break;
    case 'umbraculo': cuerpo = <EstructuraUmbraculo />; break;
    default: cuerpo = <EstructuraGenerica />; // 'otro' o tiene=si sin forma declarada.
  }
  return (
    <g
      className="fvh-rise-svg"
      style={{ animationDelay: '.12s' }}
      transform={`translate(195 ${ty}) scale(${f})`}
      opacity={noche ? 0.88 : 1}
      data-testid="fvh-estructura"
      data-forma={forma || 'generica'}
    >
      {cuerpo}
    </g>
  );
}

/** Invernadero de TÚNEL — media luna de plástico curvo (ej. el de Miguel). */
function EstructuraTunel() {
  return (
    <g>
      <ellipse cx="1" cy="13" rx="37" ry="7" fill="#1c2418" opacity=".18" />
      {/* lomo de plástico curvo (media luna extruida) */}
      <path d="M-34 12 Q-34 -15 -10 -17 L12 -17 Q36 -15 36 12 Z" fill="#cdeef0" opacity=".8" stroke="#9fd0d6" strokeWidth="1.6" />
      {/* matas adentro, silueta a través del plástico */}
      <g fill="#4ca35c" opacity=".5">
        <circle cx="-16" cy="4" r="4.4" /><circle cx="-2" cy="5" r="4" />
        <circle cx="12" cy="4" r="4.4" /><circle cx="24" cy="5" r="3.6" />
      </g>
      {/* costillas de los arcos */}
      <g stroke="#eef9fa" strokeWidth="1.4" opacity=".85">
        <line x1="-20" y1="12" x2="-20" y2="-13" />
        <line x1="-4" y1="12" x2="-4" y2="-16" />
        <line x1="12" y1="12" x2="12" y2="-16" />
        <line x1="26" y1="12" x2="26" y2="-11" />
      </g>
      {/* brillo del lomo */}
      <path d="M-30 -6 Q-10 -19 14 -14" stroke="#f2fbfc" strokeWidth="1.6" opacity=".7" fill="none" strokeLinecap="round" />
      {/* boca del túnel (entrada abierta) */}
      <path d="M-30 12 Q-30 -4 -21 -5 Q-12 -4 -12 12 Z" fill="#41604b" opacity=".8" />
    </g>
  );
}

/** Invernadero CUADRADO — nave a dos aguas con paredes translúcidas. */
function EstructuraNave() {
  return (
    <g>
      <ellipse cx="0" cy="14" rx="36" ry="7" fill="#1c2418" opacity=".18" />
      {/* pared lateral que recede */}
      <polygon points="-2,12 -2,-8 -30,-21 -30,-1" fill="#bfe4e9" opacity=".78" stroke="#9fd0d6" strokeWidth="1.2" />
      {/* matas tras el plástico de la pared lateral */}
      <g fill="#4ca35c" opacity=".45">
        <circle cx="-12" cy="-1" r="3.4" /><circle cx="-21" cy="-6" r="3" />
      </g>
      {/* plano del techo (dos aguas, cae hacia el fondo) */}
      <polygon points="14,-20 -14,-33 -30,-21 -2,-8" fill="#e8f7f8" opacity=".9" stroke="#9fd0d6" strokeWidth="1.2" />
      <line x1="14" y1="-20" x2="-14" y2="-33" stroke="#f6fcfc" strokeWidth="1.6" opacity=".8" />
      {/* frente con hastial */}
      <polygon points="-2,12 -2,-8 14,-20 30,-8 30,12" fill="#dff2f4" opacity=".88" stroke="#9fd0d6" strokeWidth="1.4" />
      <circle cx="0" cy="4" r="3.6" fill="#4ca35c" opacity=".45" />
      {/* puerta */}
      <rect x="8" y="-1" width="12" height="13" rx="1.5" fill="#55705c" opacity=".85" />
    </g>
  );
}

/** CASA-SOMBRA — casa de malla anti-insectos (paredes y techo de trama). */
function EstructuraCasaSombra() {
  return (
    <g>
      <ellipse cx="0" cy="14" rx="34" ry="6.5" fill="#1c2418" opacity=".18" />
      {/* pared lateral de malla */}
      <polygon points="-2,12 -2,-6 -30,-19 -30,1" fill="#eef2e6" opacity=".5" stroke="#8aa08e" strokeWidth="1.2" />
      <polygon points="-2,12 -2,-6 -30,-19 -30,1" fill="url(#fvh-malla-f)" />
      {/* matas visibles a través de la malla */}
      <g fill="#4ca35c" opacity=".4">
        <circle cx="-12" cy="0" r="3.4" /><circle cx="-21" cy="-5" r="3" />
      </g>
      {/* techo de malla (dos aguas suave) */}
      <polygon points="12,-16 -16,-29 -30,-19 -2,-6" fill="#eef2e6" opacity=".55" stroke="#8aa08e" strokeWidth="1.2" />
      <polygon points="12,-16 -16,-29 -30,-19 -2,-6" fill="url(#fvh-malla-f)" />
      {/* frente de malla con hastial */}
      <polygon points="-2,12 -2,-6 12,-16 26,-6 26,12" fill="#eef2e6" opacity=".5" stroke="#8aa08e" strokeWidth="1.4" />
      <polygon points="-2,12 -2,-6 12,-16 26,-6 26,12" fill="url(#fvh-malla-f)" />
      <circle cx="2" cy="4" r="3.4" fill="#4ca35c" opacity=".4" />
      {/* marcos de madera de las esquinas */}
      <g stroke="#7a5230" strokeWidth="2" strokeLinecap="round">
        <line x1="-2" y1="12" x2="-2" y2="-6" /><line x1="26" y1="12" x2="26" y2="-6" />
      </g>
      {/* puerta de malla (paño más denso) */}
      <rect x="7" y="0" width="11" height="12" rx="1.5" fill="#4e5f52" opacity=".8" />
    </g>
  );
}

/** MALLA-SOMBRA — polisombra plana sobre postes, sin paredes. */
function EstructuraMallaSombra() {
  return (
    <g>
      <ellipse cx="2" cy="13" rx="35" ry="6.5" fill="#1c2418" opacity=".18" />
      {/* postes traseros (más cortos en pantalla: están más lejos) */}
      <g stroke="#8a6038" strokeWidth="2.2" strokeLinecap="round">
        <line x1="-20" y1="4" x2="-20" y2="-18" /><line x1="34" y1="4" x2="34" y2="-18" />
      </g>
      {/* matas bajo la sombra (sin paredes: se ven directo) */}
      <g fill="#4ca35c" opacity=".8">
        <circle cx="-20" cy="6" r="4" /><circle cx="-6" cy="8" r="4.4" />
        <circle cx="8" cy="7" r="4" /><circle cx="22" cy="8" r="4.2" />
      </g>
      {/* paño de polisombra (leve pandeo al frente) */}
      <polygon points="-30,-8 26,-8 34,-18 -22,-18" fill="#46584a" opacity=".55" stroke="#3b4a3f" strokeWidth="1" />
      <polygon points="-30,-8 26,-8 34,-18 -22,-18" fill="url(#fvh-malla-f)" />
      <path d="M-30 -8 Q-2 -4.5 26 -8" stroke="#3b4a3f" strokeWidth="1.2" opacity=".6" fill="none" />
      {/* postes delanteros */}
      <g stroke="#7a5230" strokeWidth="2.6" strokeLinecap="round">
        <line x1="-30" y1="12" x2="-30" y2="-8" /><line x1="-2" y1="13" x2="-2" y2="-6" />
        <line x1="26" y1="12" x2="26" y2="-8" />
      </g>
    </g>
  );
}

/** UMBRÁCULO — techo de listones de madera sobre postes (sombra parcial). */
function EstructuraUmbraculo() {
  return (
    <g>
      <ellipse cx="2" cy="13" rx="35" ry="6.5" fill="#1c2418" opacity=".18" />
      {/* postes traseros */}
      <g stroke="#8a6038" strokeWidth="2.4" strokeLinecap="round">
        <line x1="-20" y1="4" x2="-20" y2="-18" /><line x1="34" y1="4" x2="34" y2="-18" />
      </g>
      {/* matas bajo la sombra parcial */}
      <g fill="#4ca35c" opacity=".85">
        <circle cx="-18" cy="7" r="4.2" /><circle cx="-4" cy="8" r="4.4" />
        <circle cx="10" cy="7" r="4" /><circle cx="23" cy="8" r="3.8" />
      </g>
      {/* plano del techo + listones */}
      <polygon points="-30,-8 26,-8 34,-18 -22,-18" fill="#caa066" opacity=".3" stroke="#a8763e" strokeWidth="1.2" />
      <g stroke="#a8763e" strokeWidth="2" strokeLinecap="round" opacity=".85">
        <line x1="-26" y1="-9" x2="-19" y2="-17" /><line x1="-18" y1="-9" x2="-11" y2="-17" />
        <line x1="-10" y1="-9" x2="-3" y2="-17" /><line x1="-2" y1="-9" x2="5" y2="-17" />
        <line x1="6" y1="-9" x2="13" y2="-17" /><line x1="14" y1="-9" x2="21" y2="-17" />
        <line x1="22" y1="-9" x2="29" y2="-17" />
      </g>
      {/* postes delanteros de madera */}
      <g stroke="#7a5230" strokeWidth="3" strokeLinecap="round">
        <line x1="-30" y1="12" x2="-30" y2="-8" /><line x1="-2" y1="13" x2="-2" y2="-6" />
        <line x1="26" y1="12" x2="26" y2="-8" />
      </g>
    </g>
  );
}

/** GENÉRICA ('otro' / sin forma) — cobertizo a un agua translúcido. */
function EstructuraGenerica() {
  return (
    <g>
      <ellipse cx="0" cy="14" rx="32" ry="6.5" fill="#1c2418" opacity=".18" />
      {/* pared lateral derecha (recede hacia el fondo) */}
      <polygon points="22,12 22,-8 30,-19 30,1" fill="#bfe4e9" opacity=".78" stroke="#9fd0d6" strokeWidth="1.2" />
      {/* techo a un agua */}
      <polygon points="-24,-8 22,-8 30,-19 -16,-19" fill="#e8f7f8" opacity=".9" stroke="#9fd0d6" strokeWidth="1.2" />
      {/* frente translúcido */}
      <polygon points="-24,12 -24,-8 22,-8 22,12" fill="#dff2f4" opacity=".85" stroke="#9fd0d6" strokeWidth="1.4" />
      {/* matas tras el plástico */}
      <g fill="#4ca35c" opacity=".45">
        <circle cx="-16" cy="3" r="3.6" /><circle cx="12" cy="4" r="3.4" />
      </g>
      {/* puerta */}
      <rect x="-6" y="-1" width="11" height="13" rx="1.5" fill="#55705c" opacity=".85" />
    </g>
  );
}
