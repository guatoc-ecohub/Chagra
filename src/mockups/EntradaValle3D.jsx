/* eslint-disable chagra-i18n/no-hardcoded-spanish -- mockup dev con copy de muestra (ADR-050) */
/*
 * MOCKUP "El valle de mi finca" — ruta #/mockups/entrada-3d.
 *
 * LA ENTRADA DEFINITIVA, dirección #2 (sin límites) del DR
 * DR-ENTRADA-DEFINITIVA-2026-07-10.md: un DIORAMA 3D ISOMÉTRICO del valle real
 * de la finca, navegable, donde los 4 sí-o-sí de Chagra viven en el ESPACIO —
 * no un menú, sino un lugar. "Bruno Simon, pero es su finca y sí sirve":
 * spatial UI grounded con PROPÓSITO, no wow vacío.
 *
 * LOS 4 SÍ-O-SÍ, ANCLADOS EN EL VALLE
 *   1. ALERTA / qué-hacer-hoy → un SOLO faro que brilla sobre el lugar donde
 *      toca (el semillero). Tocarlo: el agente lo dice en voz y ofrece LA acción.
 *   2. LOS MUNDOS → cada mundo (fuente real mundosFinca.js) es un LUGAR del
 *      valle al que se VIAJA: la cámara vuela hasta él y se abre su panel.
 *   3. AGENTE / VOZ → Angelita es un compañero presente que flota sobre el
 *      foco y NARRA por voz (Web Speech API) al pasar. PERSISTE dentro de los
 *      mundos (auditoría BUG-AG-02: antes el mundo era un "cuarto mudo") y si
 *      la voz falta o está apagada, ESCRIBE (burbuja de texto) — nunca mudo.
 *   4. ESTADO / CLIMA → el estado real (por la hora de la vereda) tiñe todo:
 *      luz, niebla, cielo y estrellas de la escena 3D + grade DOM de effects.
 *
 * STACK (DR §2): React-Three-Fiber sobre WebGL 2 (línea base). La escena 3D se
 * carga PEREZOSO y en su propio chunk (no infla el bundle base). WebGPU sería
 * mejora opcional (nunca requisito). Si NO hay WebGL → degrada LIMPIO a una
 * entrada digna en SVG+CSS (Valle2DFallback), con los mismos 4 sí-o-sí.
 * Offline-first: cero GLTF/HDR/fuentes remotas, todo procedural.
 *
 * Copy de muestra en español Colombia (usted); si se productiza, migra a
 * messages.js (ADR-050).
 */
import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../visual/effects/effects.css';
import './entradaValle3D.css';
import {
  MUNDO_VALLE_BY_ID,
  COSA_DEL_DIA,
  CLIMAS,
  animoDeFinca,
  NARRACION,
} from './valle/valleData';
/* El reloj del ciclo diurno vivo (franja real del día + override ?ciclo=). */
import useCicloDia from '../visual/mundo3d/useCicloDia.js';
import Valle2DFallback from './valle/Valle2DFallback';
import AbejaTransicion, { AlMontarEscena } from '../visual/creatures/AbejaTransicion.jsx';
/* El framework de MUNDOS (three-free en el barrel; los dioramas 3D bajan
   perezosos en `vendor-three`): tocar un lugar del valle ENTRA de verdad. */
import Mundo, {
  MUNDO,
  decidirTier,
  tinteDeMundo,
  tituloDeMundo,
  useNavegacionMundos,
  TransicionMundo,
  TransicionNewDonk,
  useAudioMundo,
} from '../visual/mundo3d/index.js';
/* Coach-mark del primer ingreso (visual, NO depende de la voz — iOS la muda). */
import CoachMarkToque from '../visual/mundo3d/CoachMarkToque.jsx';
import { buildSpatialAgentInitialContext } from '../services/spatialAgentContext';
import { speak, speakKokoro, stop as stopSpeak } from '../services/ttsService.js';
import { navegarDesde3D, rutaDesdeMundo3D } from '../prodApp/wire3DNav.js';
/* El VELO ODYSSEY (lenguaje de transición aprobado por el operador): cubrir →
   swap en la meseta → revelar, con la identidad del DESTINO y variación por
   tier. Barrel DOM-safe: cero three en el bundle base. */
import { VeloOdyssey } from '../visual/mundo3d/transiciones/index.js';

// La escena 3D pesada (three/fiber/drei) en su PROPIO chunk perezoso.
const Valle3D = lazy(() => import('./valle/Valle3D'));

/* ENTRAR a un mundo como MURAL New Donk (flujo vivo): en vez del velo plano, la
   cámara del valle 3D hace dolly + aplane ortográfico hacia el lugar del mundo
   (el 3D asoma en los bordes) y solo al caer dentro un destello con la luz del
   destino cubre el intercambio de escena. Flag de módulo para revertir al velo
   de un toque. VOLVER al valle conserva el velo (el New Donk es de ENTRADA).
   Reduced-motion: el hook de navegación salta la fase 'viajando' → corte
   directo, sin dolly ni overlay (ni este ni el velo se montan). */
const ENTRADA_NEWDONK = true;

/*
 * DEVICE-TIERING REAL — UNA sola fuente de verdad: `decidirTier()` del
 * framework (DR-3D-PERF-GAMABAJA FIX 1.1: antes había aquí un `decidirRender`
 * binario que duplicaba la lógica y difería del tier — un equipo de gama media
 * recibía la entrada 3D COMPLETA). Ahora el mismo tier decide 3D-vs-2D Y el
 * perfil de render frugal de la entrada y de los mundos:
 *   'alto' → 3D plena · 'medio' → 3D frugal · 'bajo' → 2D digna.
 */

class Valle3DGuard extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * @param {Object} props
 * @param {() => void} [props.onBack]  volver (en la app, al home).
 * @param {(view: string, data?: any) => void} [props.onNavigate]  MODO APP
 *   (FASE 0 game-dev, vista 'valle3d'): cuando viene, las puertas de los
 *   mundos y la acción del día NAVEGAN de verdad a las pantallas reales.
 *   Sin ella (vitrina #/mockups/entrada-3d, sin sesión) Angelita solo las
 *   nombra — el comportamiento de siempre.
 */
/** @param {{ onBack?: () => void; onNavigate?: (view: string, data?: any) => void; initialMundoId?: any }} props */
export default function EntradaValle3D({ onBack, onNavigate, initialMundoId = null }) {
  const [focoId, setFocoId] = useState(null);
  const [panel, setPanel] = useState(null); // null | 'alerta' | <mundoId>
  const [voz, setVoz] = useState(true);
  const [alertaVista, setAlertaVista] = useState(false); // ¿ya atendió lo del día?
  // El tier del equipo, decidido UNA vez: gobierna la entrada Y los mundos.
  const [equipo] = useState(decidirTier);
  // Cruce 2D→3D de Angelita cuando el valle 3D monta: la abeja (sprite 2D del
  // home) vuela y se CLAVA como mesh 3D. Una vez por apertura del valle
  // (ref-guard), saltable; el gate reduced-motion lo aplica el overlay.
  const [cruceValle, setCruceValle] = useState(null);
  const cruceValleHecho = useRef(false);
  const dispararCruceValle = useCallback(() => {
    if (cruceValleHecho.current) return;
    cruceValleHecho.current = true;
    setCruceValle('entrar');
  }, []);
  const [valle3dError, setValle3dError] = useState(false);

  // ── NAVEGACIÓN valle ↔ mundos: la máquina de fases vive en el framework.
  //    (reduced-motion la vuelve corte simple, sin overlay de viaje).
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // ── El clima es ATMÓSFERA, no un selector (auditoría B8/S8): el valle sigue
  //    el CICLO DIURNO VIVO por la hora real de la vereda (useCicloDia) y se
  //    re-evalúa solo — amanece, atardece y anochece sin botonera. La franja
  //    (amanecer→mañana→mediodía→tarde→atardecer→noche) es una piel de CLIMAS;
  //    `?ciclo=demo` acelera el día para verlo girar y `?ciclo=17.5` lo clava.
  const { franja: clima } = useCicloDia({ reducedMotion });

  const nav = useNavegacionMundos({ reducedMotion });
  const viajarAlMundoInicial = nav.viajarAlMundo;

  // ── ENTRAR como MURAL New Donk (flujo vivo): mientras la navegación viaja a
  //    un mundo (fase 'viajando'), la cámara del valle 3D se APLANA hacia el
  //    lugar (Valle3D `aplanando`) y este overlay corre el destello. El overlay
  //    SOBREVIVE al swap de escena: se apaga en su propio `onFin` (no al cambiar
  //    de fase) para poder REVELAR el mundo ya montado bajo el destello. Se
  //    ENCIENDE en el handler que zarpa el viaje (`entrarAlMundo`), no en un
  //    effect (react-hooks/set-state-in-effect). Volver al valle conserva el
  //    velo clásico; el deep-link inicial también (cae al velo por el fallback
  //    de más abajo). Reduced-motion no llega aquí: el hook salta 'viajando'.
  const usarNewDonk = ENTRADA_NEWDONK && !reducedMotion;
  const [newDonk, setNewDonk] = useState(null);

  // ── El VELO ODYSSEY en los tres viajes del valle:
  //    · ABRIR una pantalla 2D (`irA`): el velo del destino cubre y el cambio
  //      de hash va BAJO la meseta cubierta — antes era un corte seco a los
  //      700ms que mataba la cámara a mitad de vuelo.
  //    · ENTRAR a un mundo 3D sin New Donk: velo del destino (identidad andina).
  //    · VOLVER al valle: velo `luz` ("de vuelta a casa") — exhala, no repite
  //      la ceremonia de entrada.
  //    Se arma en el handler que zarpa (nunca en un effect) y se apaga solo en
  //    su `onFin`. Reduced-motion no lo arma: corte directo digno.
  //    null | { fase: 'entrando'|'saliendo', destino, irA?: mundoId }.
  const [velo, setVelo] = useState(null);

  // La escucha puede llegar con un mundo ya resuelto por el NLU. Se consume
  // una vez al montar para que volver al valle siga siendo una decisión de la
  // persona, no un bucle que la devuelva al mismo lugar.
  const mundoInicialAbierto = useRef(false);
  useEffect(() => {
    if (mundoInicialAbierto.current || !initialMundoId) return;
    mundoInicialAbierto.current = true;
    viajarAlMundoInicial(initialMundoId);
  }, [initialMundoId, viajarAlMundoInicial]);

  // ── Sonido ambiental 0-KB (spec S3): el valle reclama su paleta (brisa
  //    dorada) mientras la entrada viva; al entrar a un mundo, <Mundo> reclama
  //    la suya ENCIMA (crossfade) y al volver el valle retoma solo. Opt-in
  //    (default OFF), solo tras gesto, respeta reduced-motion.
  useAudioMundo({ mundoId: 'valle', reducedMotion });

  // ── El compañero (Angelita): su ánimo/energía salen del estado REAL de la
  //    finca + el clima + si lo del día sigue sin atender. Cuidar la alerta la
  //    calma (bucle de cuidado, sin puntos ni medallas).
  const companero = useMemo(
    () => animoDeFinca(clima, { hayAlerta: !alertaVista }),
    [clima, alertaVista],
  );
  const estadoFinca = useMemo(
    () => ({ clima, animo: companero.animo, energia: companero.energia }),
    [clima, companero.animo, companero.energia],
  );

  // ── Angelita VIVA (auditoría S5): además del idle (respira/flota, en CSS),
  //    la abeja tiene MICRO-REACCIONES: celebra al llegar a un mundo (una
  //    vuelta de campana) y se acurruca cuando el valle queda en reposo.
  //    Con reduced-motion el CSS congela todo en un fotograma digno.
  const [gesto, setGesto] = useState(null); // null | 'celebra' | 'reposo'
  const estuvoEnMundo = useRef(false);

  // Celebración: solo en el flanco de ENTRADA al mundo; se apaga sola.
  useEffect(() => {
    if (nav.enMundo && !estuvoEnMundo.current) {
      estuvoEnMundo.current = true;
      setGesto('celebra');
      const t = setTimeout(() => setGesto((g) => (g === 'celebra' ? null : g)), 2400);
      return () => clearTimeout(t);
    }
    if (!nav.enMundo && estuvoEnMundo.current) {
      estuvoEnMundo.current = false;
      setGesto((g) => (g === 'celebra' ? null : g));
    }
    return undefined;
  }, [nav.enMundo]);

  // Reposo: un rato sin tocar nada en el valle → se acurruca. Cualquier
  // interacción que cambie el foco/panel re-arma el temporizador; un toque
  // en la escena la despierta (ver onPointerDown del root).
  useEffect(() => {
    if (panel || nav.enMundo || gesto === 'celebra') return undefined;
    const t = setTimeout(() => setGesto('reposo'), 24000);
    return () => clearTimeout(t);
  }, [panel, nav.enMundo, focoId, clima, gesto]);

  const despertarAngelita = useCallback(() => {
    setGesto((g) => (g === 'reposo' ? null : g));
  }, []);

  // Asentir: micro-reacción corta de Angelita cuando el usuario toca una
  // puerta dentro del mundo — el agente ACUSA el toque (no decoración muda).
  const gestoTimer = useRef(null);
  const asentir = useCallback(() => {
    setGesto('asiente');
    if (gestoTimer.current) clearTimeout(gestoTimer.current);
    gestoTimer.current = setTimeout(() => setGesto((g) => (g === 'asiente' ? null : g)), 1600);
  }, []);
  useEffect(
    () => () => {
      if (gestoTimer.current) clearTimeout(gestoTimer.current);
    },
    [],
  );

  // ── Voz: Angelita usa Kokoro en el equipo. Si no puede reproducirlo, el
  //    respaldo es la voz del navegador.
  const vozDisponible = useMemo(
    () => typeof window !== 'undefined',
    [],
  );

  // El toggle vive en un ref para que `hablar`/`decir` sean ESTABLES: prender
  // o apagar la voz no debe re-disparar los efectos que narran.
  const vozRef = useRef(voz);
  useEffect(() => {
    vozRef.current = voz;
  }, [voz]);

  const hablar = useCallback((texto) => {
    if (!vozRef.current || !texto) return;
    speakKokoro(texto, { lang: 'es', rate: 0.98 })
      .then((audio) => {
        if (!audio && vozRef.current) speak(texto, { rate: 0.98, pitch: 1 });
      })
      .catch(() => {
        if (vozRef.current) speak(texto, { rate: 0.98, pitch: 1 });
      });
  }, []);

  // ── Angelita DICE (voz + burbuja): el texto SIEMPRE acompaña a la voz en la
  //    burbuja del compañero (aria-live). Si el equipo no trae voz o el
  //    usuario la apagó, la burbuja ES la voz — la pantalla nunca queda muda.
  const [dicho, setDicho] = useState(null);
  const dichoTimer = useRef(null);
  const decir = useCallback(
    (texto) => {
      if (!texto) return;
      setDicho(texto);
      if (dichoTimer.current) clearTimeout(dichoTimer.current);
      dichoTimer.current = setTimeout(
        () => setDicho(null),
        Math.min(14000, 4000 + texto.length * 55),
      );
      hablar(texto);
    },
    [hablar],
  );
  useEffect(
    () => () => {
      if (dichoTimer.current) clearTimeout(dichoTimer.current);
    },
    [],
  );

  useEffect(
    () => () => {
      stopSpeak();
    },
    [],
  );

  // Saludo del compañero al primer gesto (una sola vez): voz + burbuja. Así
  // iOS permite la síntesis y la entrada nunca depende de autoplay.
  const saludado = useRef(false);
  useEffect(() => {
    const saludar = () => {
      if (saludado.current) return;
      saludado.current = true;
      decir(NARRACION.bienvenida);
    };
    window.addEventListener('pointerdown', saludar, { once: true, capture: true });
    window.addEventListener('keydown', saludar, { once: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', saludar, { capture: true });
      window.removeEventListener('keydown', saludar, { capture: true });
    };
  }, [decir]);

  // ── TOCAR un lugar del valle: la cámara viaja, el panel abre y Angelita
  //    narra. La persona DECIDE en el panel a dónde seguir (abrir la pantalla
  //    real o recorrer el mundo en 3D). Antes había aquí un setTimeout de
  //    700ms que arrancaba a la pantalla 2D con un corte seco: la cámara
  //    moría a mitad de vuelo y el panel vivía menos de un segundo.
  const entrarMundo = useCallback(
    (id) => {
      setFocoId(id);
      setPanel(id);
      decir(NARRACION[id] || MUNDO_VALLE_BY_ID[id]?.lema || '');
    },
    [decir],
  );

  // ── ABRIR la pantalla real de un lugar (el cableo 3D→2D de prod, PR #2453):
  //    el velo del DESTINO cubre y `navegarDesde3D` corre bajo la meseta — el
  //    usuario nunca ve el corte del swap de shell. Con reduced-motion, corte
  //    directo (el velo no se arma).
  const abrirPantalla = useCallback(
    (id) => {
      if (!rutaDesdeMundo3D(id)) return;
      stopSpeak();
      if (reducedMotion) {
        navegarDesde3D(id);
        return;
      }
      setVelo({ fase: 'entrando', destino: id, irA: id });
    },
    [reducedMotion],
  );

  const abrirAlerta = useCallback(() => {
    setFocoId(COSA_DEL_DIA.anclaMundo);
    setPanel('alerta');
    setAlertaVista(true); // atender lo del día calma a la abeja
    decir(COSA_DEL_DIA.vozTexto);
  }, [decir]);

  // ── LA CASA ES LA VÍA SECUNDARIA (fix del operador 2026-07-16): tocar la
  //    puerta iluminada lleva a la VENTANA-PUERTA de los mundos (la ruta
  //    `ventana_valle` ya construida), por el mismo velo del cableo 3D→2D.
  //    La entrada PRINCIPAL a cada mundo es su portal-paisaje del valle,
  //    tocado directo — la casa no vuelve a ser la boca de todo.
  const abrirCasa = useCallback(() => abrirPantalla('casa'), [abrirPantalla]);

  const volverAlValle = useCallback(() => {
    setFocoId(null);
    setPanel(null);
    stopSpeak();
  }, []);

  // El CTA de la alerta: en la APP navega a la pantalla real de la acción
  // (COSA_DEL_DIA.accion.view); en la vitrina repite la indicación por voz
  // (antes era un botón mudo — auditoría FASE 0).
  const accionDelDia = useCallback(() => {
    if (onNavigate && COSA_DEL_DIA.accion?.view) {
      stopSpeak();
      onNavigate(COSA_DEL_DIA.accion.view);
      return;
    }
    decir(COSA_DEL_DIA.vozTexto);
  }, [onNavigate, decir]);

  // ── "Pregúntele a su finca…" ABRE el flujo real del agente (auditoría
  //    BUG-CAMP-01: era un botón muerto). Mismo camino desacoplado que usan
  //    AgentFab y EscuchaOverlay: el evento global `chagraNavigate`, que
  //    App.jsx escucha para montar la conversación (vista 'agente') — funciona
  //    desde cualquier pantalla, incluida esta vitrina, sin acoplar el mockup.
  const preguntarAlAgente = useCallback(() => {
    if (typeof window === 'undefined') return;
    stopSpeak();
    window.dispatchEvent(new CustomEvent('chagraNavigate', {
      detail: {
        view: 'agente',
        initialData: buildSpatialAgentInitialContext({
          mundoId: nav.mundoId,
          hotspotActivo: focoId,
          clima,
          estadoFinca,
        }),
      },
    }));
  }, [nav.mundoId, focoId, clima, estadoFinca]);

  // ── ENTRAR a un mundo (tarea del viaje): cierra el panel, la abeja guía la
  //    transición y el framework monta la escena del mundo. Si el mundo aún no
  //    tiene escena montable, `viajarAlMundo` no viaja (el panel ya degradó a
  //    "pronto", así que aquí solo se guarda la coherencia).
  const entrarAlMundo = useCallback(
    (id) => {
      if (!nav.viajarAlMundo(id)) return;
      // Enciende el mural New Donk en el MISMO tick que zarpa el viaje (mismo
      // render que la fase 'viajando') → el velo queda suprimido y el aplane
      // del valle corre bajo este overlay. Se apaga solo en su `onFin`.
      // Con el flag New Donk apagado, el velo Odyssey del destino cubre la
      // entrada (identidad andina) en vez del velo genérico.
      if (usarNewDonk) setNewDonk(id);
      else if (!reducedMotion) setVelo({ fase: 'entrando', destino: id });
      setPanel(null);
      decir(`Angelita lo lleva a ${tituloDeMundo(id)}.`);
    },
    [nav, decir, usarNewDonk, reducedMotion],
  );

  // ── VOLVER del mundo al valle: el velo Odyssey `luz` — regresar a casa
  //    exhala (asimetría del lenguaje aprobado), no repite la ceremonia de
  //    entrada.
  const salirDelMundo = useCallback(() => {
    if (!reducedMotion) setVelo({ fase: 'saliendo', destino: 'valle' });
    nav.volverAlValle();
    decir('De vuelta al valle de su finca.');
  }, [nav, decir, reducedMotion]);

  // ── EL MUNDO HABLA (BUG-AG-02, el "cuarto mudo"): al llegar a un mundo,
  //    Angelita lo narra consumiendo `entrada.narra` del registro (BUG-AG-01:
  //    el dato existía y nadie lo leía) y deja la pista de las puertas.
  //    Voz si hay y está prendida; burbuja de texto siempre.
  useEffect(() => {
    if (!nav.enMundo || !nav.mundoId) return undefined;
    const clave = MUNDO[nav.mundoId]?.entrada?.narra;
    const texto =
      (clave && NARRACION[clave]) ||
      NARRACION[nav.mundoId] ||
      MUNDO_VALLE_BY_ID[nav.mundoId]?.lema ||
      `Está en ${tituloDeMundo(nav.mundoId)}.`;
    const t = setTimeout(
      () => decir(`${texto} Toque un punto para ver a dónde lo lleva.`),
      700,
    );
    return () => clearTimeout(t);
  }, [nav.enMundo, nav.mundoId, decir]);

  // ── Una puerta tocada DENTRO del mundo: en la vitrina (sin sesión) no
  //    navega — ANGELITA la nombra (voz + burbuja) y asiente: el agente
  //    reacciona al hotspot en vez de dejar un letrero suelto (regla de oro:
  //    cuenta a qué pantalla real de la app lleva).
  const onPuertaMundo = useCallback(
    (view, data) => {
      // MODO APP (FASE 0 game-dev): la puerta ES real — se corta la voz y se
      // navega a la pantalla de verdad. El valle cumple su promesa.
      if (onNavigate) {
        stopSpeak();
        onNavigate(view, data);
        return;
      }
      const puertas = MUNDO[nav.mundoId]?.hotspots || [];
      const hs =
        puertas.find((h) => h.view === view && (h.data === data || (!h.data && !data))) ||
        puertas.find((h) => h.view === view);
      asentir();
      decir(
        `«${hs?.label || view}» es una puerta real: dentro de la app abre la pantalla «${view}».`,
      );
    },
    [nav.mundoId, decir, asentir, onNavigate],
  );

  const mundoPanel = panel && panel !== 'alerta' ? MUNDO_VALLE_BY_ID[panel] : null;
  // ¿Este lugar tiene pantalla real en la app? (wire3DNav). Decide el CTA
  // primario del panel: abrir la pantalla manda; recorrer el 3D acompaña.
  const rutaPanel = mundoPanel ? rutaDesdeMundo3D(mundoPanel.id) : null;

  return (
    <div className="valle-root" data-clima={clima} onPointerDown={despertarAngelita}>
      {/* fondo/atmósfera 3D o su degradación 2D (según el tiering del equipo).
          Mientras se está DENTRO de un mundo, el valle descansa (se desmonta:
          nada de dos escenas sudando la GPU a la vez en un teléfono). */}
      <div className="valle-escena">
        {!nav.enMundo &&
          (
            <Valle3DGuard
              onError={() => setValle3dError(true)}
              fallback={(
                <Valle2DFallback
                  clima={clima}
                  focoId={focoId}
                  animo={companero.animo}
                  energia={companero.energia}
                  reducedMotion={reducedMotion}
                  onEntrar={entrarMundo}
                  onAlerta={abrirAlerta}
                  webglBloqueado={valle3dError || equipo.motivo === 'sin-webgl'}
                />
              )}
            >
            <Suspense fallback={<CargandoValle clima={clima} />}>
              <Valle3D
                clima={clima}
                focoId={focoId}
                animo={companero.animo}
                energia={companero.energia}
                onEntrar={entrarMundo}
                onAlerta={abrirAlerta}
                onCasa={abrirCasa}
                onAngelita={preguntarAlAgente}
                reducedMotion={reducedMotion}
                tier={equipo.tier}
                aplanando={!!newDonk && nav.fase === 'viajando'}
                /* La CÁMARA DE DIRECTOR también en la entrada real (antes solo
                   la tenía la escena del framework): el barrido establishing
                   que presenta el valle vivo. Gateada por tier/reduced-motion
                   adentro; una sola vez por sesión. */
                camaraDirector
              />
              {/* Dispara el cruce 2D→3D cuando el chunk 3D del valle resolvió
                  (hermano de <Valle3D> en el Suspense). DOM puro, sin three. */}
              <AlMontarEscena onMonta={dispararCruceValle} />
            </Suspense>
            </Valle3DGuard>
          )}
        {/* El OVERLAY del cruce: la abeja 2D vuela y se clava como mesh 3D — así
            el usuario SÍ ve el 2D→3D. Se desmonta solo al terminar (onFin);
            reducedMotion → AbejaTransicion no monta nada. */}
        {cruceValle === 'entrar' && !reducedMotion && (
          <AbejaTransicion
            sentido="entrar"
            tier={equipo.tier}
            animo={companero.animo}
            energia={companero.energia}
            reducedMotion={reducedMotion}
            onFin={() => setCruceValle(null)}
          />
        )}
      </div>

      {/* ── Onboarding de 3 s SIN voz: pista táctil del primer ingreso. ── */}
      {!nav.enMundo && <CoachMarkToque reducedMotion={reducedMotion} />}

      {/* ── El MUNDO abierto: el framework monta la escena (3D perezoso o su
              2D digno) con su miga "‹ El valle" siempre visible. ── */}
      {nav.enMundo && nav.mundoId && (
        <section
          className="valle-mundo"
          data-mundo={nav.mundoId}
          style={{ '--vm-tinte': tinteDeMundo(nav.mundoId)[0] }}
          aria-label={`Mundo ${tituloDeMundo(nav.mundoId)}`}
        >
          {/* DEFENSA EN PROFUNDIDAD: si un mundo falla al montar (p. ej. una
              escena que no resuelve), el error queda ACOTADO al mundo — se
              muestra una salida digna y se vuelve al valle, en vez de tumbar
              toda la app. La causa raíz (React #306 por el lazy sin `default`)
              queda arreglada en Mundo.jsx; esto es el cinturón de seguridad. */}
          <Valle3DGuard
            key={nav.mundoId}
            fallback={(
              <div className="mundo-caida" role="status" style={{ '--m-tinte': tinteDeMundo(nav.mundoId)[0] }}>
                <p className="mundo-caida__txt">
                  Este mundo no abrió bien. Su finca sigue completa; vuelva al valle e inténtelo de nuevo.
                </p>
                <button type="button" className="mundo-caida__btn" onClick={salirDelMundo}>
                  ‹ El valle
                </button>
              </div>
            )}
          >
            <Mundo
              mundoId={nav.mundoId}
              tier={equipo.tier}
              reducedMotion={reducedMotion}
              onHotspot={onPuertaMundo}
              onSalir={salirDelMundo}
              animo={companero.animo}
              energia={companero.energia}
              hablando={!!dicho}
            />
          </Valle3DGuard>
        </section>
      )}

      {/* ── El VIAJE. ENTRAR (con New Donk): el aplane del valle 3D ocurre en la
              escena y ESTE overlay corre el destello — el swap va en su punto
              medio (`onMitad`) y se apaga solo al revelar (`onFin`). VOLVER (o
              con el flag apagado): el velo clásico, cuyo swap va al final
              (`onFin`). Con reduced-motion el hook corta directo: nada se
              monta. ── */}
      {newDonk && (
        <TransicionNewDonk
          mundoId={newDonk}
          animo={companero.animo}
          energia={companero.energia}
          reducedMotion={reducedMotion}
          onMitad={nav.completarViaje}
          onFin={() => setNewDonk(null)}
        />
      )}
      {/* El VELO ODYSSEY del viaje: cubre → swap en la meseta (`onCubierto`) →
          revela. Con `irA`, el swap es el cambio de hash a la pantalla 2D real
          (el shell desmonta este árbol ya cubierto: el corte queda escondido).
          Sin `irA`, el swap es el del framework de mundos. */}
      {velo && (
        <VeloOdyssey
          fase={velo.fase}
          destino={velo.destino}
          tier={equipo.tier}
          reducedMotion={reducedMotion}
          onCubierto={() => {
            if (velo.irA) navegarDesde3D(velo.irA);
            else nav.completarViaje();
          }}
          onFin={() => setVelo(null)}
        />
      )}
      {/* Respaldo (viajes que nadie armó, p. ej. el deep-link inicial): el
          velo clásico de siempre, con su swap al final. */}
      {nav.enViaje && nav.mundoId && !(newDonk && nav.fase === 'viajando') && !velo && (
        <TransicionMundo
          mundoId={nav.mundoId}
          sentido={nav.fase === 'viajando' ? 'entrar' : 'volver'}
          animo={companero.animo}
          energia={companero.energia}
          reducedMotion={reducedMotion}
          onFin={nav.completarViaje}
        />
      )}

      {/* ── Encabezado: el nombre del lugar. El clima NO tiene selector: es
              la atmósfera real por la hora de la vereda (auditoría B8/S8).
              Dentro de un mundo se esconde: manda la miga del mundo. ── */}
      {!nav.enMundo && (
      <header className="valle-header">
        {/* Solo si hay a dónde volver: en el HOME de prod este botón se
            renderizaba sin handler — visible y muerto (feedback operador). */}
        {onBack && (
          <button type="button" className="valle-back" onClick={onBack} aria-label="Volver">
            ‹ Volver
          </button>
        )}
        <div className="valle-titulo">
          <span className="valle-titulo__eyebrow">Su finca, hoy</span>
          <h1>El valle de mi finca</h1>
        </div>
      </header>
      )}

      {/* ── Modo dibujado: solo si el 3D no pudo levantarse ── */}
      {valle3dError && !nav.enMundo && (
        <p className="valle-degradado" role="status">
          No se pudo levantar el 3D en este navegador. Le mostramos la versión dibujada para no bloquearle el acceso.
        </p>
      )}

      {/* ── La burbuja de voz de Angelita (aria-live): lo que ella DICE va
              SIEMPRE en texto — si la voz falta o está apagada, la burbuja ES
              la voz. Angelita VIVE en la ESCENA del valle (UNA sola abeja —
              feedback del operador 2026-07-16: "se ven 3 abejitas"): este chip
              ya no lleva su cara 2D ni la frase fija de ánimo; aparece solo
              mientras ella habla. ── */}
      {dicho && (
        <div
          className={`valle-companero${nav.enMundo ? ' valle-companero--mundo' : ''}`}
          role="status"
          aria-live="polite"
        >
          <span className="valle-companero__txt">{dicho}</span>
        </div>
      )}

      {/* ── Panel de la ALERTA (la cosa del día): UNA acción clara ── */}
      {panel === 'alerta' && (
        <aside className="valle-panel valle-panel--alerta" aria-live="polite">
          <button type="button" className="valle-panel__x" onClick={volverAlValle} aria-label="Cerrar">×</button>
          <span className="valle-panel__tag">⚠️ Lo del día</span>
          <h2>{COSA_DEL_DIA.titulo}</h2>
          <p>{COSA_DEL_DIA.detalle}</p>
          <div className="valle-panel__acciones">
            <button type="button" className="valle-cta" onClick={accionDelDia}>{COSA_DEL_DIA.accion.etiqueta}</button>
            <button type="button" className="valle-ghost" onClick={() => decir(COSA_DEL_DIA.vozTexto)}>
              🔊 Escuchar
            </button>
          </div>
        </aside>
      )}

      {/* ── Panel de un MUNDO (lugar al que se viajó) ── */}
      {mundoPanel && (
        <aside className="valle-panel valle-panel--mundo" aria-live="polite" style={{ '--m-tinte': mundoPanel.tinte[0] }}>
          <button type="button" className="valle-panel__x" onClick={volverAlValle} aria-label="Cerrar">×</button>
          <span className="valle-panel__tag">
            <span aria-hidden="true">{mundoPanel.emoji}</span> Mundo
          </span>
          <h2>{mundoPanel.titulo}</h2>
          <p>{mundoPanel.lema}</p>
          <div className="valle-panel__acciones">
            {/* El CTA primario es la PANTALLA REAL de la app (la promesa del
                cableo 3D→2D); recorrer el diorama 3D queda como acompañante.
                Antes un setTimeout arrancaba solo, y este panel — con los
                mundos 3D y sus transiciones aprobadas — era inalcanzable. */}
            {rutaPanel && (
              <button type="button" className="valle-cta" onClick={() => abrirPantalla(mundoPanel.id)}>
                Abrir {mundoPanel.titulo}
              </button>
            )}
            {nav.puedeEntrar(mundoPanel.id) && (
              <button
                type="button"
                className={rutaPanel ? 'valle-ghost' : 'valle-cta'}
                onClick={() => entrarAlMundo(mundoPanel.id)}
              >
                {rutaPanel ? 'Recorrer en 3D' : 'Entrar a este mundo'}
              </button>
            )}
            {!rutaPanel && !nav.puedeEntrar(mundoPanel.id) && (
              /* Degradación elegante: este mundo aún no tiene escena montable
                 ni pantalla real (p. ej. el clima, que YA es el cielo del valle). */
              <p className="valle-panel__pronto" role="status">
                Este mundo abre pronto su propia puerta. Por ahora se vive desde el valle.
              </p>
            )}
            <button type="button" className="valle-ghost" onClick={() => decir(NARRACION[mundoPanel.id] || mundoPanel.lema)}>
              🔊 Escuchar
            </button>
          </div>
        </aside>
      )}

      {/* ── Barra del AGENTE: el compañero presente + voz. PERSISTE dentro
              del mundo (BUG-AG-02: antes se ocultaba y el diorama quedaba
              mudo, sin cómo preguntar ni prender/apagar la voz). Adentro va
              compacta, flotando sobre la escena; la miga del mundo ya trae
              el volver. Sin voz en el equipo, el estado lo dice claro:
              Angelita le escribe. ── */}
      <footer className={`valle-agente${nav.enMundo ? ' valle-agente--mundo' : ''}`}>
        <button
          type="button"
          className="valle-agente__pregunte"
          aria-label="Pregúntele a Chagra"
          onClick={preguntarAlAgente}
        >
          <span className="valle-agente__punto" aria-hidden="true" />
          Pregúntele a su finca…
        </button>
        <div className="valle-agente__ctrls">
          {!nav.enMundo && focoId && (
            <button type="button" className="valle-agente__btn" onClick={volverAlValle}>
              Ver todo el valle
            </button>
          )}
          <button
            type="button"
            className={`valle-agente__btn valle-agente__voz${voz && vozDisponible ? ' on' : ''}`}
            aria-pressed={voz && vozDisponible}
            disabled={!vozDisponible}
            title={
              vozDisponible ? undefined : 'Este equipo no trae voz: Angelita le escribe.'
            }
            onClick={() => {
              const n = !voz;
              setVoz(n);
              if (!n) stopSpeak();
            }}
          >
            {!vozDisponible ? '💬 Texto' : voz ? '🔊 Voz' : '🔇 Voz'}
          </button>
        </div>
      </footer>
    </div>
  );
}

/* Placeholder mientras baja el chunk 3D: el cielo del clima + un latido. */
function CargandoValle({ clima }) {
  const c = CLIMAS[clima];
  return (
    <div
      className="valle-cargando"
      style={{ background: `linear-gradient(180deg, ${c.cielo[0]}, ${c.cielo[1]})` }}
    >
      <div className="valle-cargando__pulso" />
      <p>Levantando su finca…</p>
    </div>
  );
}
