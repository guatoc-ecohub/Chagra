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
 * ~1.8s, la escucha se cierra sola (el sello de luz que se cierra alrededor
 * del portal es ese conteo, feedback honesto). "Listo" y "Cancelar" quedan
 * como respaldo táctil tamaño guante.
 *
 * Visual: "LA PRESENCIA" — un portal circular a otra dimensión. El marco es
 * de Chagra (acento del tema); adentro hay espacio profundo, un núcleo de luz
 * suspendido (un OJO de energía con la mano de Chagra en la pupila), geometría
 * sagrada que respira, y un campo de partículas que vive en CAOS y se ORDENA
 * en anillos cuando usted habla: el parámetro de orden es el RMS REAL del
 * micrófono (audioLevel/amplitudeHistory del recorder — nada de animación
 * fingida). El espectro radial se espeja izquierda/derecha: la voz dibuja un
 * mandala de luz, no ruido.
 *
 * IMPORTANTE — español colombiano (tú/usted), NUNCA voseo argentino.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const formatoSegundos = (ms) => `${(ms / 1000).toFixed(0)}s`;

const navegar = (view, initialData = null) => {
  window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view, initialData } }));
};

/* ============================================================================
 * LA PRESENCIA — geometría del portal (módulo: se calcula UNA vez).
 * ========================================================================== */
const VB = 260;   // lado del viewBox cuadrado
const CTR = 130;  // centro
const NUM_RAYOS = 44;      // espectro radial (espejado → mandala)
const NUM_PARTICULAS = 36; // campo caos→orden

/** Pseudo-azar determinista (sin Math.random: capturas y tests reproducibles). */
const azar = (i, sal) => {
  const s = Math.sin(i * 127.1 + sal * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Campo de partículas: cada una tiene una posición CAÓTICA (reposo, deriva) y
 * una posición ORDENADA (anillos concéntricos). El RMS real interpola entre
 * ambas: hablar = el caos se ordena. Esa es la firma del diseño.
 */
const PARTICULAS = Array.from({ length: NUM_PARTICULAS }, (_, i) => {
  const aCaos = azar(i, 1) * Math.PI * 2;
  const rCaos = 40 + azar(i, 2) * 66;
  const anillo = i % 3;
  const porAnillo = NUM_PARTICULAS / 3;
  const aOrden = (Math.floor(i / 3) / porAnillo) * Math.PI * 2 + anillo * (Math.PI / porAnillo);
  const rOrden = 66 + anillo * 12;
  return {
    cx: CTR + Math.cos(aCaos) * rCaos,
    cy: CTR + Math.sin(aCaos) * rCaos,
    ox: CTR + Math.cos(aOrden) * rOrden,
    oy: CTR + Math.sin(aOrden) * rOrden,
    r: 1.1 + azar(i, 3) * 1.5,
    tono: i % 3, // 0 blanco lunar, 1 cian, 2 violeta
  };
});

/** Estrellas fijas del espacio profundo (fondo del portal). */
const ESTRELLAS = Array.from({ length: 18 }, (_, i) => {
  const a = azar(i, 5) * Math.PI * 2;
  const r = 20 + azar(i, 6) * 86;
  return {
    x: +(CTR + Math.cos(a) * r).toFixed(1),
    y: +(CTR + Math.sin(a) * r).toFixed(1),
    rad: +(0.5 + azar(i, 7) * 0.9).toFixed(2),
    o: +(0.15 + azar(i, 8) * 0.5).toFixed(2),
    titila: i % 5 === 0,
  };
});

const poligono = (lados, radio, rot = 0) =>
  Array.from({ length: lados }, (_, i) => {
    const a = (i / lados) * Math.PI * 2 + rot;
    return `${(CTR + Math.cos(a) * radio).toFixed(1)},${(CTR + Math.sin(a) * radio).toFixed(1)}`;
  }).join(' ');

/* Geometría SAGRADA (no HUD): un hexagrama — dos triángulos entrelazados —
 * más un anillo de nodos (semilla-de-vida) y un aro limpio. La compuerta de
 * la Presencia respira y contra-rota; los nodos son la retícula del portal. */
const GEO_TRI_A = poligono(3, 94, -Math.PI / 2);
const GEO_TRI_B = poligono(3, 94, Math.PI / 2);
const NODOS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
  return { x: +(CTR + Math.cos(a) * 96).toFixed(1), y: +(CTR + Math.sin(a) * 96).toFixed(1) };
});

/**
 * El portal de la Presencia: espacio profundo + geometría sagrada + campo de
 * partículas caos→orden + espectro-mandala + núcleo de luz (ojo de energía)
 * con la mano de Chagra en la pupila. TODO el movimiento reactivo es dato real
 * (RMS/amplitud del micrófono); el resto es respiración ambiental CSS.
 */
function PortalPresencia({ nivel, historia, fase, cierre }) {
  const oyendo = fase === FASE_OYENDO;

  // Movimiento reducido → composición estática y legible: campo ordenado,
  // espectro en patrón fijo, sin deriva. El sello de cierre (informativo) queda.
  const reducida = useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
    [],
  );

  // Orden del campo (0 = caos, 1 = anillos): promedio corto del RMS real —
  // sube rápido al hablar, cae suave al callar. Pensando/rumbo = orden pleno
  // (la energía "procesa" ya recompuesta).
  let orden;
  if (reducida || fase === FASE_PENSANDO || fase === FASE_RUMBO) {
    orden = 1;
  } else if (!oyendo) {
    orden = 0.1;
  } else {
    const cola = historia.slice(-9);
    const prom = cola.length ? cola.reduce((s, v) => s + v, 0) / cola.length : 0;
    orden = Math.max(0.08, Math.min(1, prom * 2.6 + nivel * 0.5));
  }

  // Espectro radial ESPEJADO (mandala): las muestras reales de amplitud se
  // reflejan izquierda/derecha — la voz dibuja simetría, no ruido.
  const mitad = NUM_RAYOS / 2;
  const muestras = historia.slice(-mitad);
  const rayos = [];
  for (let i = 0; i < NUM_RAYOS; i++) {
    const j = i < mitad ? i : NUM_RAYOS - 1 - i;
    const m = oyendo && !reducida ? (muestras[j] ?? 0) : 0;
    const ang = (i / NUM_RAYOS) * Math.PI * 2 - Math.PI / 2;
    const r0 = 60;
    const largo = reducida && oyendo ? 10 + (j % 4) * 4 : (oyendo ? 5 + m * 40 : 3);
    const x1 = CTR + Math.cos(ang) * r0;
    const y1 = CTR + Math.sin(ang) * r0;
    const x2 = CTR + Math.cos(ang) * (r0 + largo);
    const y2 = CTR + Math.sin(ang) * (r0 + largo);
    const tono = i % 3;
    rayos.push(
      <line
        key={`g${i}`}
        className={`escucha-rayo-glow escucha-tono-${tono}`}
        x1={x1} y1={y1} x2={x2} y2={y2}
        strokeWidth={6}
        opacity={0.1 + m * 0.4}
      />,
      <line
        key={`r${i}`}
        className={`escucha-rayo escucha-tono-${tono}`}
        x1={x1} y1={y1} x2={x2} y2={y2}
        strokeWidth={i % 4 === 0 ? 2.2 : 1.3}
        opacity={0.42 + m * 0.58}
      />,
    );
  }

  // Sello de silencio: el aro de luz que se cierra alrededor del portal
  // (conteo honesto de "ya lo oí, cierro si se queda callado").
  const rSello = 108;
  const circSello = 2 * Math.PI * rSello;
  const escala = 1 + (oyendo ? nivel * 0.35 : 0);

  return (
    <div className="escucha-portal" aria-hidden="true">
      {/* La ventana al otro lado: espacio profundo con estrellas fijas */}
      <div className="escucha-espacio">
        <svg viewBox={`0 0 ${VB} ${VB}`}>
          {ESTRELLAS.map((e, i) => (
            <circle
              key={i}
              className={e.titila ? 'escucha-estrella escucha-estrella-titila' : 'escucha-estrella'}
              cx={e.x} cy={e.y} r={e.rad} opacity={e.o}
            />
          ))}
        </svg>
      </div>

      {/* Compuerta de geometría SAGRADA: hexagrama (dos triángulos entrelazados)
          con dispersión cromática + anillo de nodos semilla-de-vida contra-
          rotando. Pensando acelera ambos: la energía procesa. */}
      <svg className="escucha-geo escucha-geo-a" viewBox={`0 0 ${VB} ${VB}`}>
        <polygon points={GEO_TRI_A} className="escucha-geo-fantasma-a" transform={`rotate(2 ${CTR} ${CTR})`} />
        <polygon points={GEO_TRI_B} className="escucha-geo-fantasma-b" transform={`rotate(-2 ${CTR} ${CTR})`} />
        <polygon points={GEO_TRI_A} className="escucha-geo-linea" />
        <polygon points={GEO_TRI_B} className="escucha-geo-linea" />
      </svg>
      <svg className="escucha-geo escucha-geo-b" viewBox={`0 0 ${VB} ${VB}`}>
        <circle cx={CTR} cy={CTR} r="96" className="escucha-geo-aro" />
        {NODOS.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={i % 3 === 0 ? 2.4 : 1.5} className="escucha-geo-nodo" />
        ))}
      </svg>

      {/* Campo de partículas: caos ⇄ orden con el RMS real (deriva lenta CSS) */}
      <svg className="escucha-campo" viewBox={`0 0 ${VB} ${VB}`}>
        {PARTICULAS.map((p, i) => (
          <circle
            key={i}
            className={`escucha-particula escucha-tono-${p.tono}`}
            cx={p.cx + (p.ox - p.cx) * orden}
            cy={p.cy + (p.oy - p.cy) * orden}
            r={p.r}
            opacity={0.25 + orden * 0.55}
          />
        ))}
      </svg>

      {/* Espectro-mandala + sello de silencio (capa que NO rota) */}
      <svg className="escucha-mandala" viewBox={`0 0 ${VB} ${VB}`}>
        {rayos}
        {oyendo && cierre > 0 && (
          <>
            <circle
              className="escucha-sello-glow"
              cx={CTR} cy={CTR} r={rSello}
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circSello}
              strokeDashoffset={circSello * (1 - cierre)}
              transform={`rotate(-90 ${CTR} ${CTR})`}
            />
            <circle
              className="escucha-sello"
              cx={CTR} cy={CTR} r={rSello}
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={circSello}
              strokeDashoffset={circSello * (1 - cierre)}
              transform={`rotate(-90 ${CTR} ${CTR})`}
            />
          </>
        )}
      </svg>

      {/* El núcleo: un OJO de energía. Halo volumétrico + iris de luz con su
          anillo de apertura + la mano de Chagra en la pupila — alguien está
          ahí, mirando. Escala = RMS real. */}
      <div className="escucha-nucleo" style={{ transform: `scale(${escala.toFixed(3)})` }}>
        <span className="escucha-nucleo-halo" />
        <span className="escucha-nucleo-luz" />
        <span className="escucha-nucleo-apertura" />
        <ManoChagraGlyph size={46} className="escucha-nucleo-mano" />
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
      setMensajeError(
        err?.message?.includes('MediaDevices') || err?.message?.includes('Permission')
          ? 'No pude usar el micrófono. Revise el permiso del navegador.'
          : (err?.message || 'No pude empezar a escuchar.'),
      );
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
  // el sello de cierre del portal.
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

        <PortalPresencia nivel={audioLevel} historia={amplitudeHistory} fase={fase} cierre={cierre} />

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
