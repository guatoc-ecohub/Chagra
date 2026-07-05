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
 * Visual: "la mano que escucha" — ManoChagraGlyph al centro de un iris de
 * micelio cuyos anillos y brotes respiran con el RMS REAL del micrófono
 * (audioLevel/amplitudeHistory del recorder — nada de animación fingida).
 *
 * IMPORTANTE — español colombiano (tú/usted), NUNCA voseo argentino.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Mic, Keyboard, CornerUpRight, AlertTriangle } from 'lucide-react';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import { transcribe, queueForRetry } from '../../services/voiceService';
import { routeUtterance } from '../../services/escuchaIntentRouter';
import { onEscucha } from '../../services/escuchaService';
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

const NUM_BROTES = 28;

const formatoSegundos = (ms) => `${(ms / 1000).toFixed(0)}s`;

const navegar = (view, initialData = null) => {
  window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view, initialData } }));
};

/**
 * Iris de micelio: 3 anillos que respiran con el RMS + brotes radiales con la
 * historia de amplitud + arco de cierre (conteo de silencio). Todo dato real.
 */
function IrisEscucha({ nivel, historia, fase, cierre }) {
  const C = 116; // centro del viewBox 232x232
  const brotes = [];
  const muestras = historia.slice(-NUM_BROTES);
  for (let i = 0; i < NUM_BROTES; i++) {
    const m = muestras[i] ?? 0;
    const ang = (i / NUM_BROTES) * Math.PI * 2 - Math.PI / 2;
    const r0 = 78;
    const largo = fase === FASE_OYENDO ? 5 + m * 26 : 5;
    const x1 = C + Math.cos(ang) * r0;
    const y1 = C + Math.sin(ang) * r0;
    const x2 = C + Math.cos(ang) * (r0 + largo);
    const y2 = C + Math.sin(ang) * (r0 + largo);
    brotes.push(
      <line
        key={i}
        className="escucha-brote"
        x1={x1} y1={y1} x2={x2} y2={y2}
        strokeWidth={i % 4 === 0 ? 3 : 2}
        opacity={0.35 + m * 0.65}
      />,
    );
  }

  // Arco de cierre: circunferencia r=110; se va DIBUJANDO con el silencio.
  const rArco = 110;
  const circArco = 2 * Math.PI * rArco;

  const vivo = fase === FASE_OYENDO;
  return (
    <div className="escucha-iris" aria-hidden="true">
      <svg viewBox="0 0 232 232">
        {/* Anillos de micelio: respiración = RMS real, cada uno a su ritmo */}
        {[{ r: 58, k: 26, o: 0.5 }, { r: 68, k: 16, o: 0.35 }, { r: 78, k: 8, o: 0.25 }].map(({ r, k, o }, i) => (
          <circle
            key={i}
            className="escucha-anillo"
            cx={C} cy={C} r={r}
            fill="none"
            stroke={`rgba(var(--esc-linea-rgb), ${o + (vivo ? nivel * 0.4 : 0)})`}
            strokeWidth={i === 0 ? 2.5 : 1.5}
            strokeDasharray={i === 2 ? '3 7' : i === 1 ? '10 6' : 'none'}
            style={{ transform: vivo ? `scale(${1 + nivel * (k / 100)})` : 'scale(1)' }}
          />
        ))}
        {brotes}
        {/* Conteo de silencio: el aro exterior se cierra → "ya casi termino de oír" */}
        {vivo && cierre > 0 && (
          <circle
            className="escucha-arco-cierre"
            cx={C} cy={C} r={rArco}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circArco}
            strokeDashoffset={circArco * (1 - cierre)}
            transform={`rotate(-90 ${C} ${C})`}
          />
        )}
      </svg>
      <div className="escucha-mano">
        <ManoChagraGlyph size={54} />
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

  const faseRef = useRef(fase);
  faseRef.current = fase;

  const abrir = useCallback(async (detalle) => {
    // Guard re-disparo: un wake-word puede gatillar varias veces seguidas
    // (o el operador toca el FAB mientras ya está abierto). Si ya estamos
    // oyendo/pensando/en rumbo, ignorar — no duplicar streams del mic.
    if (faseRef.current !== FASE_CERRADO && faseRef.current !== FASE_ERROR) return;
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
      setMensajeError(
        err?.message?.includes('MediaDevices') || err?.message?.includes('Permission')
          ? 'No pude usar el micrófono. Revise el permiso del navegador.'
          : (err?.message || 'No pude empezar a escuchar.'),
      );
      setFase(FASE_ERROR);
    }
  }, [start]);

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
        navegar(ruta.view);
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

        <IrisEscucha nivel={audioLevel} historia={amplitudeHistory} fase={fase} cierre={cierre} />

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
