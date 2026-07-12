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
  climaPorHora,
  animoDeFinca,
  NARRACION,
} from './valle/valleData';
import Valle2DFallback from './valle/Valle2DFallback';
import AbejaTransicion, { AlMontarEscena } from '../visual/creatures/AbejaTransicion.jsx';
import { AbejaAngelita } from '../visual/creatures/AbejaAngelita.jsx';
/* El framework de MUNDOS (three-free en el barrel; los dioramas 3D bajan
   perezosos en `vendor-three`): tocar un lugar del valle ENTRA de verdad. */
import Mundo, {
  MUNDO,
  decidirTier,
  tinteDeMundo,
  tituloDeMundo,
  useNavegacionMundos,
  TransicionMundo,
  useAudioMundo,
} from '../visual/mundo3d/index.js';
/* Coach-mark del primer ingreso (visual, NO depende de la voz — iOS la muda). */
import CoachMarkToque from '../visual/mundo3d/CoachMarkToque.jsx';
import { buildSpatialAgentInitialContext } from '../services/spatialAgentContext';
import { speak, speakKokoro, stop as stopSpeak } from '../services/ttsService.js';

// La escena 3D pesada (three/fiber/drei) en su PROPIO chunk perezoso.
const Valle3D = lazy(() => import('./valle/Valle3D'));

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
export default function EntradaValle3D({ onBack, onNavigate, initialMundoId = null }) {
  const [clima, setClima] = useState(() => climaPorHora());

  // ── El clima es ATMÓSFERA, no un selector (auditoría B8/S8): los chips de
  //    debug se quitaron de la UI. El valle sigue la hora real de la vereda y
  //    se re-evalúa solo — amanece, atardece y anochece sin botonera.
  useEffect(() => {
    const t = setInterval(() => setClima(climaPorHora()), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
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

  const nav = useNavegacionMundos({ reducedMotion });
  const viajarAlMundoInicial = nav.viajarAlMundo;

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

  const entrarMundo = useCallback(
    (id) => {
      setFocoId(id);
      setPanel(id);
      decir(NARRACION[id] || MUNDO_VALLE_BY_ID[id]?.lema || '');
    },
    [decir],
  );

  const abrirAlerta = useCallback(() => {
    setFocoId(COSA_DEL_DIA.anclaMundo);
    setPanel('alerta');
    setAlertaVista(true); // atender lo del día calma a la abeja
    decir(COSA_DEL_DIA.vozTexto);
  }, [decir]);

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
      setPanel(null);
      decir(`Angelita lo lleva a ${tituloDeMundo(id)}.`);
    },
    [nav, decir],
  );

  // ── VOLVER del mundo al valle (misma transición, en reversa).
  const salirDelMundo = useCallback(() => {
    nav.volverAlValle();
    decir('De vuelta al valle de su finca.');
  }, [nav, decir]);

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
                reducedMotion={reducedMotion}
                tier={equipo.tier}
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
        </section>
      )}

      {/* ── El VIAJE (ida o vuelta): la abeja guía; al terminar, el intercambio
              de escena ocurre debajo del velo. Con reduced-motion ni se monta
              (el hook corta directo). ── */}
      {nav.enViaje && nav.mundoId && (
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
        <button type="button" className="valle-back" onClick={() => onBack?.()} aria-label="Volver">
          ‹ Volver
        </button>
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

      {/* ── El compañero: Angelita en una sola línea puntual (imagen-first).
              Es el ser al que se cuida; su cara refleja el ánimo real. Se
              esconde si hay un panel abierto — una cosa clara a la vez.
              DENTRO de un mundo sigue presente y HABLA: narra el lugar y
              nombra las puertas. Lo que dice (`dicho`) va SIEMPRE en su
              burbuja de texto (aria-live) — si la voz falta o está apagada,
              la burbuja es la voz. ── */}
      {(dicho || (!panel && !nav.enMundo)) && (
        <div
          className={`valle-companero${nav.enMundo ? ' valle-companero--mundo' : ''}`}
          data-gesto={gesto || undefined}
          role="status"
          aria-live="polite"
        >
          {/* DENTRO de un mundo Angelita vive en la ESCENA (una sola compañera,
              no dos abejas): aquí el chip queda solo como su burbuja de voz. En
              el valle sí lleva su cara (la tarjeta puntual imagen-first). */}
          {!nav.enMundo && (
            <span className="valle-companero__cara" aria-hidden="true">
              <AbejaAngelita
                size={34}
                pose={gesto || 'vuela'}
                animo={companero.animo}
                energia={companero.energia}
                animated={!reducedMotion}
              />
              <i className="valle-companero__sombra" />
            </span>
          )}
          {(dicho || !nav.enMundo) && (
            <span className="valle-companero__txt">{dicho || companero.frase}</span>
          )}
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
            {nav.puedeEntrar(mundoPanel.id) ? (
              <button type="button" className="valle-cta" onClick={() => entrarAlMundo(mundoPanel.id)}>
                Entrar a este mundo
              </button>
            ) : (
              /* Degradación elegante: este mundo aún no tiene escena montable
                 (p. ej. el clima, que YA es el cielo del valle). */
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
