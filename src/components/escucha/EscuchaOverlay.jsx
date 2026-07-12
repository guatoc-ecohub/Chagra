/**
 * EscuchaOverlay — el widget "Chagra está escuchando" (escucha manos libres).
 *
 * CASO DE USO (operador 2026-07-05): el campesino tiene GUANTES o las manos
 * embarradas. Un tap (EscuchaFab) — o mañana el wake-word "hola Chagra" —
 * abre este overlay, que graba, transcribe con el pipeline Whisper existente
 * (useVoiceRecorder + voiceService) y rutea:
 *
 *   a) comando de navegación ("lléveme a suelo") → chagraNavigate a esa vista.
 *   b) pregunta/pedido → agente con autoSend (AgentScreen la envía sola y la
 *      respuesta se HABLA por Kokoro — punta a punta sin tocar la pantalla).
 *
 * TRIGGER DESACOPLADO: este componente NO expone métodos — solo escucha el
 * evento `chagra:escucha` (ver escuchaService.activarEscucha()). El wake-word
 * reusa exactamente ese trigger sin tocar este archivo.
 *
 * MANOS LIBRES DE VERDAD: detección de silencio — cuando ya habló y calla
 * ~1.8s, la escucha se cierra sola (el arco que se cierra alrededor del iris
 * es ese conteo, feedback honesto). "Listo" y "Cancelar" quedan como respaldo
 * táctil tamaño guante.
 *
 * Visual: "EL UMBRAL" — una presencia de luz se asoma a escuchar: un campo
 * de motas que se ORDENA con el RMS REAL del micrófono, un aro-oscilo que
 * dibuja la historia de amplitud real y un núcleo suspendido con la mano de
 * Chagra como holograma (nada de animación fingida — el dato manda).
 *
 * IMPORTANTE — español colombiano (tú/usted), NUNCA voseo argentino.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- copy de UI pendiente de migrar a messages.js */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Mic, Keyboard, CornerUpRight, AlertTriangle } from 'lucide-react';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import { transcribe, queueForRetry } from '../../services/voiceService';
import { routeUtterance } from '../../services/escuchaIntentRouter';
import { onEscucha } from '../../services/escuchaService';
import { mensajeErrorMicrofono } from './escuchaOverlayUtils';
import ManoChagraGlyph from '../dashboard/ManoChagraGlyph';
import './escucha.css';

/* Fases del widget. 'cerrado' = desmontado visualmente (retorna null). */
const FASE_CERRADO = 'cerrado';
const FASE_OYENDO = 'oyendo';
const FASE_PENSANDO = 'pensando';
const FASE_RUMBO = 'rumbo';
const FASE_ERROR = 'error';

/* Manos libres: umbral RMS que cuenta como "está hablando", silencio que
 * cierra la escucha, y mínimo para no cerrarnos antes de que arranque. */
const UMBRAL_VOZ = 0.14;
const SILENCIO_MS = 1800;
const MIN_ESCUCHA_MS = 1500;
const TOPE_ESCUCHA_MS = 25000; // por debajo del hard-limit (30s) del recorder
const PAUSA_RUMBO_MS = 1000;   // deja LEER "Abriendo Mercado…" antes de saltar

const formatoSegundos = (ms) => `${(ms / 1000).toFixed(0)}s`;

const navegar = (view, initialData = null) => {
  window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view, initialData } }));
};

/* ========================== EL UMBRAL (visual) =============================
 * Presencia etérea: un umbral de energía se abre cuando Chagra escucha.
 * TODO el movimiento significativo es DATO REAL del micrófono:
 *   - las motas de luz viven en caos calmo y se ORDENAN en anillos con la
 *     voz (RMS suavizado): hablar = ordenar el campo,
 *   - el aro-oscilo dibuja la historia de amplitud (la voz, visible),
 *   - el sello de silencio es el conteo real que cierra la escucha.
 * GPU-friendly: transform/opacity + atributos SVG. Sin blur animado.
 * ========================================================================== */

const VB = 260;       // lado del viewBox del portal
const CV = VB / 2;    // centro
const N_MOTAS = 56;   // motas de luz del campo
const N_OSC = 72;     // puntos del aro-oscilo

/* PRNG determinista: mismas motas en cada montaje (nada de Math.random). */
const azar = (i, sal) => {
  const x = Math.sin(i * 127.1 + sal * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* Campo precomputado UNA vez: cada mota tiene una posición de CAOS (deriva
 * calma, distribución de ángulo áureo) y una de ORDEN (tres anillos
 * concéntricos). La voz interpola entre las dos. */
const MOTAS = Array.from({ length: N_MOTAS }, (_, i) => {
  const anillo = i % 3;
  const porAnillo = Math.ceil(N_MOTAS / 3);
  return {
    caosAng: i * 2.399963 + azar(i, 1) * 0.9,
    caosR: 54 + azar(i, 2) * 58,
    ordenAng: (Math.floor(i / 3) / porAnillo) * Math.PI * 2 + anillo * 0.35,
    ordenR: [70, 86, 102][anillo],
    tam: 1 + azar(i, 3) * 1.6,
    base: 0.2 + azar(i, 4) * 0.3,
  };
});

/* Diferencia angular por el camino corto (la mota no da la vuelta larga). */
const deltaAng = (a, b) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

/* Polígono regular inscrito en r, como string de puntos SVG. */
const poligono = (lados, r, giro = 0) =>
  Array.from({ length: lados }, (_, k) => {
    const a = (k / lados) * Math.PI * 2 + giro;
    return `${(CV + Math.cos(a) * r).toFixed(1)},${(CV + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');

const HEXAGONO = poligono(6, 118, -Math.PI / 2);
/* Micelio: hifas orgánicas que brotan del centro (reemplaza la geometría de
   estrella de dos triángulos). Red viva, no símbolo. */
const MICELIO = Array.from({ length: 9 }, (_, k) => {
  const a = (k / 9) * Math.PI * 2 + (k % 2 ? 0.16 : -0.11);
  const r1 = 118 * (0.6 + (k % 3) * 0.13);
  const ex = (CV + Math.cos(a) * r1).toFixed(1), ey = (CV + Math.sin(a) * r1).toFixed(1);
  const px = (CV + Math.cos(a) * r1 * 0.5 + Math.cos(a + Math.PI / 2) * (k % 2 ? 13 : -15)).toFixed(1);
  const py = (CV + Math.sin(a) * r1 * 0.5 + Math.sin(a + Math.PI / 2) * (k % 2 ? 13 : -15)).toFixed(1);
  const fa = a + (k % 2 ? 0.55 : -0.55);
  const bx = (CV + Math.cos(a) * r1 * 0.62).toFixed(1), by = (CV + Math.sin(a) * r1 * 0.62).toFixed(1);
  const fx = (CV + Math.cos(fa) * r1 * 0.92).toFixed(1), fy = (CV + Math.sin(fa) * r1 * 0.92).toFixed(1);
  return `M ${CV} ${CV} Q ${px} ${py} ${ex} ${ey} M ${bx} ${by} T ${fx} ${fy}`;
});

/* Ticks del astrolabio: 12 marcas fijas cada 30°. */
const TICKS = Array.from({ length: 12 }, (_, k) => {
  const a = (k / 12) * Math.PI * 2;
  const r1 = 108;
  const r2 = k % 3 === 0 ? 116 : 112;
  return {
    x1: CV + Math.cos(a) * r1, y1: CV + Math.sin(a) * r1,
    x2: CV + Math.cos(a) * r2, y2: CV + Math.sin(a) * r2,
  };
});

/* Aro-oscilo: path cerrado cuyo radio module la historia REAL de amplitud. */
function pathOscilo(historia) {
  const m = historia.slice(-N_OSC);
  const falta = N_OSC - m.length;
  let d = '';
  for (let k = 0; k < N_OSC; k++) {
    const v = k < falta ? 0 : (m[k - falta] || 0);
    const a = (k / N_OSC) * Math.PI * 2 - Math.PI / 2;
    const r = 50 + v * 26;
    const x = (CV + Math.cos(a) * r).toFixed(1);
    const y = (CV + Math.sin(a) * r).toFixed(1);
    d += (k === 0 ? 'M' : 'L') + x + ' ' + y;
  }
  return d + 'Z';
}

/**
 * El Umbral: astrolabio holográfico + campo de motas (orden = RMS real) +
 * aro-oscilo (historia real) + núcleo suspendido con la mano de Chagra como
 * holograma + sello de silencio (conteo real). El estado de fase colorea y
 * anima por CSS (data-fase en el overlay); aquí solo se pintan los DATOS.
 */
function PortalUmbral({ nivel, historia, fase, cierre }) {
  const oyendo = fase === FASE_OYENDO;

  // Orden del campo: 0 = caos calmo, 1 = anillos perfectos. Un loop rAF lo
  // suaviza leyendo el último RMS/fase desde refs (actualizadas en un efecto,
  // nunca en render). Suavizado asimétrico: sube rápido con la voz, cae lento
  // (la presencia "retiene" un instante lo que oyó). setState va DENTRO del
  // rAF (diferido), no síncrono en el efecto.
  const nivelRef = useRef(0);
  const faseRef = useRef(fase);
  useEffect(() => { nivelRef.current = nivel; faseRef.current = fase; }, [nivel, fase]);

  const [orden, setOrden] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setOrden((prev) => {
        const f = faseRef.current;
        if (f === FASE_PENSANDO || f === FASE_RUMBO) return prev + (1 - prev) * 0.12;
        if (f !== FASE_OYENDO) return prev * 0.85;
        const objetivo = Math.min(1, nivelRef.current * 2.8);
        return prev + (objetivo - prev) * (objetivo > prev ? 0.3 : 0.05);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const t = orden;

  const motas = MOTAS.map((m, i) => {
    const ang = m.caosAng + deltaAng(m.caosAng, m.ordenAng) * t;
    const r = m.caosR + (m.ordenR - m.caosR) * t;
    return (
      <circle
        key={i}
        className="portal-mota"
        cx={(CV + Math.cos(ang) * r).toFixed(1)}
        cy={(CV + Math.sin(ang) * r).toFixed(1)}
        r={m.tam}
        opacity={Math.min(1, m.base + t * 0.6)}
      />
    );
  });

  // Sello de silencio: r=122; se dibuja con el conteo real de cierre.
  const rSello = 122;
  const circSello = 2 * Math.PI * rSello;
  const dOscilo = oyendo ? pathOscilo(historia) : '';

  // Luz volumétrica: respira con la voz; cada fase tiene su intensidad.
  const rayosOpacidad = oyendo ? 0.3 + t * 0.55
    : fase === FASE_PENSANDO ? 0.55
      : fase === FASE_RUMBO ? 0.85 : 0.12;

  return (
    <div className="escucha-portal" aria-hidden="true">
      <div className="portal-rayos" style={{ opacity: rayosOpacidad }} />
      <div className="portal-glow" />
      <svg viewBox={`0 0 ${VB} ${VB}`}>
        {/* Astrolabio holográfico: geometría que gira lentísimo en calma y
            se recompone contra-rotando cuando la presencia piensa. */}
        <g className="portal-geo portal-geo-a">
          <circle cx={CV} cy={CV} r={112} fill="none" strokeDasharray="1 7" />
          <polygon points={HEXAGONO} fill="none" />
        </g>
        <g className="portal-geo portal-geo-b">
          <circle cx={CV} cy={CV} r={104} fill="none" strokeDasharray="26 12" />
          {MICELIO.map((d, i) => (
            <path key={i} d={d} fill="none" className="portal-micelio" />
          ))}
        </g>
        <g className="portal-ticks">
          {TICKS.map((tk, k) => (
            <line key={k} x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} />
          ))}
        </g>

        {/* El campo: caos calmo → anillos concéntricos, con la voz real. */}
        <g className="portal-motas">{motas}</g>

        {/* La voz visible: aro-oscilo con la historia real + eco espectral. */}
        {oyendo && (
          <>
            <path className="portal-oscilo-eco" d={dOscilo} />
            <path className="portal-oscilo" d={dOscilo} />
          </>
        )}

        {/* Pensando: anillo de proceso orbitando el núcleo. */}
        {fase === FASE_PENSANDO && (
          <circle className="portal-proceso" cx={CV} cy={CV} r={58} fill="none" strokeDasharray="36 328" />
        )}

        {/* Sello de silencio: el umbral se va cerrando con el conteo real. */}
        {oyendo && cierre > 0 && (
          <>
            <circle
              className="portal-sello-halo"
              cx={CV} cy={CV} r={rSello}
              fill="none"
              strokeDasharray={circSello}
              strokeDashoffset={circSello * (1 - cierre)}
              transform={`rotate(-90 ${CV} ${CV})`}
            />
            <circle
              className="portal-sello"
              cx={CV} cy={CV} r={rSello}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circSello}
              strokeDashoffset={circSello * (1 - cierre)}
              transform={`rotate(-90 ${CV} ${CV})`}
            />
          </>
        )}
      </svg>

      {/* Núcleo de energía suspendido: se hincha con la voz real; adentro
          flota la firma de Chagra como holograma. */}
      <div className="portal-nucleo" style={{ transform: `scale(${(1 + t * 0.14).toFixed(3)})` }}>
        <span className="portal-corazon" />
        <ManoChagraGlyph size={40} className="portal-glifo" />
      </div>
    </div>
  );
}

export default function EscuchaOverlay() {
  const { audioLevel, amplitudeHistory, durationMs, start, stop, reset } = useVoiceRecorder();

  const [fase, setFase] = useState(FASE_CERRADO);
  const [fuente, setFuente] = useState('tap');
  const [destino, setDestino] = useState(null);
  const [mensajeError, setMensajeError] = useState('');
  const [cierre, setCierre] = useState(0); // 0..1 progreso del conteo de silencio

  const yaHabloRef = useRef(false);
  const ultimaVozRef = useRef(0);
  const abiertoTsRef = useRef(0);
  const finalizandoRef = useRef(false);
  const rumboTimerRef = useRef(null);
  const cartaRef = useRef(null);

  const cerrar = useCallback(() => {
    if (rumboTimerRef.current) { clearTimeout(rumboTimerRef.current); rumboTimerRef.current = null; }
    reset();
    finalizandoRef.current = false;
    yaHabloRef.current = false;
    setCierre(0);
    setDestino(null);
    setMensajeError('');
    setFase(FASE_CERRADO);
  }, [reset]);

  const abrir = useCallback(async (detalle) => {
    // Guard re-disparo: un wake-word puede gatillar varias veces seguidas
    // (o el operador toca el FAB mientras ya está abierto). Si ya estamos
    // oyendo/pensando/en rumbo, ignorar — no duplicar streams del mic.
    if (fase !== FASE_CERRADO && fase !== FASE_ERROR) return;
    setFuente(detalle?.fuente || 'tap');
    setDestino(null);
    setMensajeError('');
    setCierre(0);
    yaHabloRef.current = false;
    finalizandoRef.current = false;
    abiertoTsRef.current = Date.now();
    ultimaVozRef.current = Date.now();
    setFase(FASE_OYENDO);
    try {
      await start();
    } catch (err) {
      setMensajeError(mensajeErrorMicrofono(err));
      setFase(FASE_ERROR);
    }
  }, [start, fase]);

  /** Cierra la grabación y corre el pipeline Whisper → router → destino. */
  const finalizar = useCallback(async () => {
    if (finalizandoRef.current) return;
    finalizandoRef.current = true;
    setCierre(0);
    setFase(FASE_PENSANDO);

    const resultado = await stop();
    if (!resultado || !resultado.blob || resultado.blob.size === 0) {
      setMensajeError('No alcancé a oírle. Acérquese al micrófono e intente de nuevo.');
      setFase(FASE_ERROR);
      finalizandoRef.current = false;
      return;
    }

    let texto;
    try {
      texto = await transcribe(resultado.blob);
    } catch (err) {
      // Whisper caído / red: guardamos el audio para reintento (mismo
      // contrato que VoiceCapture) y degradamos amable, nunca error mudo.
      queueForRetry(resultado.blob, {
        reason: `escucha: ${err?.message || 'transcribe failed'}`,
        durationMs: resultado.durationMs || 0,
      }).catch(() => {});
      setMensajeError('No pude entenderle esta vez — guardé el audio para reintentarlo. También puede escribir la pregunta.');
      setFase(FASE_ERROR);
      finalizandoRef.current = false;
      return;
    }

    const ruta = routeUtterance(texto);
    if (ruta.tipo === 'navegar') {
      // Camino (a): comando de navegación → mostramos el rumbo y saltamos.
      setDestino(ruta);
      setFase(FASE_RUMBO);
      rumboTimerRef.current = setTimeout(() => {
        navegar(ruta.view, ruta.initialData);
        cerrar();
      }, PAUSA_RUMBO_MS);
      return;
    }

    // Camino (b): pregunta → agente con autoSend + fromVoice (la respuesta
    // se habla por Kokoro; ver AgentScreen initialContext).
    navegar('agente', {
      prefilledPrompt: ruta.prompt,
      autoSend: true,
      fromVoice: true,
      fuente: 'escucha',
    });
    cerrar();
  }, [stop, cerrar]);

  const cancelar = useCallback(() => {
    // Descarta lo grabado sin procesar (stop() resuelve y se ignora el blob).
    stop().catch(() => {});
    cerrar();
  }, [stop, cerrar]);

  const reintentar = useCallback(() => { abrir({ fuente }); }, [abrir, fuente]);

  const irAEscribir = useCallback(() => {
    navegar('agente');
    cerrar();
  }, [cerrar]);

  // === Trigger desacoplado: tap HOY, wake-word MAÑANA (mismo evento). ===
  useEffect(() => onEscucha((detalle) => { abrir(detalle); }), [abrir]);

  // Manos libres (1/2): marcar actividad de voz en refs. audioLevel cambia a
  // ~60fps (setState por frame del recorder) — este efecto SOLO toca refs.
  useEffect(() => {
    if (fase !== FASE_OYENDO) return;
    if (audioLevel > UMBRAL_VOZ) {
      yaHabloRef.current = true;
      ultimaVozRef.current = Date.now();
    }
  }, [fase, audioLevel]);

  // Manos libres (2/2): el vigía. UN solo interval por fase — NO depende de
  // audioLevel: si dependiera, el re-render de cada frame lo recrearía antes
  // de cumplirse los 120ms y el conteo de silencio jamás dispararía. Si ya
  // habló y lleva SILENCIO_MS callado, cerramos solos; el progreso alimenta
  // el arco de cierre del iris.
  useEffect(() => {
    if (fase !== FASE_OYENDO) return undefined;
    const timer = setInterval(() => {
      const ahora = Date.now();
      const desdeApertura = ahora - abiertoTsRef.current;
      if (desdeApertura >= TOPE_ESCUCHA_MS) { finalizar(); return; }
      if (!yaHabloRef.current || desdeApertura < MIN_ESCUCHA_MS) { setCierre(0); return; }
      const callado = ahora - ultimaVozRef.current;
      if (callado >= SILENCIO_MS) { finalizar(); return; }
      setCierre(Math.max(0, Math.min(1, callado / SILENCIO_MS)));
    }, 120);
    return () => clearInterval(timer);
  }, [fase, finalizar]);

  // Escape cancela; foco inicial a la carta (lectores de pantalla anuncian).
  useEffect(() => {
    if (fase === FASE_CERRADO) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') cancelar(); };
    window.addEventListener('keydown', onKey);
    cartaRef.current?.focus?.();
    return () => window.removeEventListener('keydown', onKey);
  }, [fase !== FASE_CERRADO]); // eslint-disable-line react-hooks/exhaustive-deps

  if (fase === FASE_CERRADO) return null;

  const titulos = {
    [FASE_OYENDO]: <>Chagra está <b>escuchando</b></>,
    [FASE_PENSANDO]: <>Entendiendo lo que dijo…</>,
    [FASE_RUMBO]: <>¡Listo, de una!</>,
    [FASE_ERROR]: <>No le alcancé a oír</>,
  };
  const subtitulos = {
    [FASE_OYENDO]: <>Hable con confianza: <b>«lléveme al mercado»</b> para ir a una pantalla, o pregúnteme lo que necesite de su finca.</>,
    [FASE_PENSANDO]: <>Un momento — estoy pasando su voz a palabras.</>,
    [FASE_RUMBO]: destino ? <>Vamos para allá ahora mismo.</> : null,
    [FASE_ERROR]: <>{mensajeError}</>,
  };

  return (
    <div
      className="escucha-overlay"
      data-testid="escucha-overlay"
      data-fase={fase}
      role="dialog"
      aria-modal="true"
      aria-label="Chagra está escuchando"
    >
      <div className="escucha-velo" onClick={cancelar} data-testid="escucha-velo" />
      <div className="escucha-carta" ref={cartaRef} tabIndex={-1}>
        <div className="escucha-eyebrow">
          <span className="escucha-punto" aria-hidden="true" />
          {fuente === 'wakeword' ? 'Escuché «hola Chagra»' : 'Escucha manos libres'}
        </div>

        <PortalUmbral nivel={audioLevel} historia={amplitudeHistory} fase={fase} cierre={cierre} />

        <h2 className="escucha-titulo" data-testid="escucha-estado" aria-live="polite">
          {fase === FASE_ERROR && <AlertTriangle size={22} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} />}
          {titulos[fase]}
        </h2>
        {subtitulos[fase] && <p className="escucha-sub">{subtitulos[fase]}</p>}

        {fase === FASE_OYENDO && (
          <div className="escucha-medidor" aria-hidden="true">
            <span>{formatoSegundos(durationMs)}</span>
            <span>·</span>
            <span>{cierre > 0 ? 'lo oí — cierro si se queda callado' : 'grabando'}</span>
          </div>
        )}

        {fase === FASE_RUMBO && destino && (
          <div className="escucha-rumbo" data-testid="escucha-rumbo">
            <CornerUpRight size={18} />
            <span>Abriendo <b>{destino.etiqueta}</b>…</span>
          </div>
        )}

        <div className="escucha-acciones">
          {fase === FASE_OYENDO && (
            <button type="button" className="escucha-btn-listo" data-testid="escucha-listo" onClick={finalizar}>
              Listo, eso era
            </button>
          )}
          {fase === FASE_ERROR && (
            <>
              <button type="button" className="escucha-btn-listo" data-testid="escucha-reintentar" onClick={reintentar}>
                <Mic size={20} /> Intentar de nuevo
              </button>
              <button type="button" className="escucha-btn-sec" data-testid="escucha-escribir" onClick={irAEscribir}>
                <Keyboard size={18} /> Mejor lo escribo
              </button>
            </>
          )}
          {fase !== FASE_RUMBO && (
            <button type="button" className="escucha-btn-cancelar" data-testid="escucha-cancelar" onClick={cancelar}>
              <X size={16} /> Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
