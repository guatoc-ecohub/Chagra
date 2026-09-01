import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ZARIGUYA_TRAZADO_SVG } from './zariguyaTrazado/pielTrazado.js';
import {
  POSES_TRAZADO_KEYS, srcDePose, ESCUCHA_CICLO, ESCUCHA_PASO_MS, UMBRAL_CLOSEUP,
} from './zariguyaTrazado/posesTrazado.js';
import { useVidaIdle, useMiradaUsted, prefiereQuietud } from './useVidaIdle.js';
import { CompaiAgente } from '../agente/CompaiAgente.jsx';
import { COMPAI_ESPECIES } from '../agente/compaiEspecies.js';
import './zariguyaTrazado/zariguyaHuesos.css';

const ZARIGUYA_SLUG = 'zariguya';
const ZARIGUYA_PERFIL = COMPAI_ESPECIES.zariguya;

/* Estados del contrato de avatar → forma canónica interna (mismo mapa que
   ZariguyaHuesos: el atributo data-agt-estado viaja crudo para paridad de
   API/accesibilidad; esto solo decide el comportamiento). FASE 2 suma
   `contenta` (celebra — el estado Angelita): pose plena `cute` del set. */
const ESTADO_CANON = {
  idle: 'idle', reposo: 'idle', acompana: 'idle',
  thinking: 'thinking', pensando: 'thinking',
  speaking: 'speaking', respondiendo: 'speaking', hablando: 'speaking',
  listening: 'listening', escuchando: 'listening',
  preocupada: 'listening',
  'no-se': 'thinking', nose: 'thinking',
  senala: 'thinking', señala: 'thinking',
  invita: 'speaking', husmea: 'thinking',
  caminando: 'caminando', walking: 'caminando', anda: 'caminando',
  contenta: 'contenta', celebra: 'contenta', happy: 'contenta',
};

/* Apertura de mandíbula por visema (0..1) — misma tabla que la lámina viva. */
const JAW_DE_VISEMA = { V1: 0, V2: 0.42, V3: 1, V4: 0.36 };

/* Reloj 70/30 del modo auto (idéntico a ZariguyaHuesos). */
const CICLO_MODO_MS = 13700;
const TRAMO_ACTUANDO = 0.3;

/**
 * ZariguyaTrazado — EXPERIMENTO: la lámina AUTO-TRAZADA (vtracer) sobre el
 * esqueleto de huesos, articulada por CLIP-REGIONES (ver
 * `zariguyaTrazado/pielTrazado.js`). Drop-in de `ZariguyaHuesos`: mismas
 * props, mismos estados, misma CSS de cadencia — para comparar lado a lado
 * la piel redibujada a mano contra la piel calcada automática.
 *
 * @param {Object} props — idénticas a ZariguyaHuesos:
 *   estado, modo ('auto'|'normal'|'actuando'), size, animated, className,
 *   style, title, visema ('V1'..'V4'), tier ('bajo' apaga vida), onClick,
 *   onDoubleClick. FASE 2 suma (paridad con ZariguyaGeminiLaminaViva):
 *   vidaForzada ('husmea'|'tanatosis'|'reposo'|'crias') — fuerza un momento
 *   de vida por encima del idle-cerebro (vitrina / gag a demanda del host;
 *   solo pesa en idle, igual que el momento natural);
 *   poseForzada (clave de POSES_TRAZADO_KEYS) — clava una viñeta exacta
 *   (arnés de gate / vitrina; sigue exigiendo el PNG cargado).
 */
function ZariguyaTrazadoRig({
  estado = 'idle',
  modo = 'auto',
  size = 48,
  animated = true,
  reducedMotion = false,
  pose: poseRig = 'anda',
  className = '',
  style = undefined,
  title = 'Zarigüeya (chucha)',
  visema = null,
  tier = undefined,
  vidaForzada = null,
  poseForzada = null,
  onClick = undefined,
  onDoubleClick = undefined,
  ...rest
}) {
  const raizRef = useRef(null);
  const canon = ESTADO_CANON[estado] || 'idle';
  const enIdle = canon === 'idle';
  const vivo = animated && !reducedMotion;
  const activoVida = vivo && tier !== 'bajo';
  const sizeChico = size < UMBRAL_CLOSEUP;

  // Fase propia por instancia (hash del useId — puro y estable por render).
  const uid = useId();
  const fase = useMemo(() => {
    let h = 0;
    for (let i = 0; i < uid.length; i++) h = ((h * 31 + uid.charCodeAt(i)) >>> 0);
    return -((h % 970) / 100).toFixed(2);
  }, [uid]);

  // Idle-cerebro; la vida FORZADA (vitrina/gag a demanda) pesa SOLO en idle,
  // como la natural — mismo canal que la hermana Gemini.
  const momentoNatural = useVidaIdle(ZARIGUYA_SLUG, activoVida && enIdle && !vidaForzada);
  const momento = enIdle && vidaForzada ? vidaForzada : momentoNatural;
  useMiradaUsted(raizRef, activoVida && canon !== 'speaking');

  // ═══ POSES PLENAS (FASE 2) — precarga honesta: una pose solo entra
  // COMPLETA; sin PNG servido, el trazado degrada a la FASE 1 (rig hero). ═══
  const [cargadas, setCargadas] = useState({});
  useEffect(() => {
    let vivo = true;
    for (const k of POSES_TRAZADO_KEYS) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (vivo) setCargadas((c) => (c[k] ? c : { ...c, [k]: true }));
      };
      img.src = srcDePose(k);
    }
    return () => { vivo = false; };
  }, []);

  // El ciclo de escucha aprobado (02→03→04→03, vaivén de atención). El tick
  // NO se resetea al salir: re-entrar a media vuelta es tan válido como en 02.
  const [tickEscucha, setTickEscucha] = useState(0);
  useEffect(() => {
    if (canon !== 'listening' || !vivo || sizeChico || prefiereQuietud()) return undefined;
    const id = setInterval(() => setTickEscucha((t) => t + 1), ESCUCHA_PASO_MS);
    return () => clearInterval(id);
  }, [canon, vivo, sizeChico]);

  // Qué viñeta pide el estado (null = la lámina-rig articulada de FASE 1).
  // Cada mapa entra al repertorio UNA lámina a la vez con gate (spec FASE 2):
  // una pose fuera de POSES_TRAZADO_KEYS aún no existe para el trazado.
  const poseDeseada = poseForzada || (() => {
    if (canon === 'listening') {
      return sizeChico ? 'escucha-01' : ESCUCHA_CICLO[tickEscucha % ESCUCHA_CICLO.length];
    }
    if (canon === 'thinking') return 'verlupa';
    if (canon === 'contenta') return 'cute';
    if (enIdle) {
      if (momento === 'tanatosis') return 'muerta'; // la firma "se-hace-la-muerta"
      if (momento === 'crias') return 'crias';
    }
    return null;
  })();
  const poseLamina = poseDeseada && POSES_TRAZADO_KEYS.includes(poseDeseada) && cargadas[poseDeseada]
    ? poseDeseada
    : null;

  // El reloj 70/30 del modo auto.
  const [actuaAuto, setActuaAuto] = useState(false);
  useEffect(() => {
    if (modo !== 'auto' || !activoVida) return undefined;
    let timer;
    let vivo = true;
    const tramoNormal = CICLO_MODO_MS * (1 - TRAMO_ACTUANDO);
    const tramoActua = CICLO_MODO_MS * TRAMO_ACTUANDO;
    const jitter = () => 0.82 + Math.random() * 0.36;
    const pasoNormal = () => {
      if (!vivo) return;
      setActuaAuto(false);
      timer = setTimeout(pasoActua, tramoNormal * jitter());
    };
    const pasoActua = () => {
      if (!vivo) return;
      setActuaAuto(true);
      timer = setTimeout(pasoNormal, tramoActua * jitter());
    };
    pasoNormal();
    return () => { vivo = false; clearTimeout(timer); };
  }, [modo, activoVida]);

  const modoVigente = modo === 'auto' ? (actuaAuto ? 'actuando' : 'normal') : modo;
  const jaw = JAW_DE_VISEMA[visema] ?? 0;

  const estiloRaiz = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    lineHeight: 0,
    '--zh-jaw': String(jaw),
    '--zh-fase': `${fase}s`,
    ...style,
  };

  const contenedor = (
    <div
      ref={raizRef}
      role="img"
      aria-label={title}
      data-creature={ZARIGUYA_SLUG}
      data-agt-estado={estado}
      data-modo={vivo ? modoVigente : 'normal'}
      data-pose={poseLamina || (vivo ? poseRig : undefined)}
      data-visema={visema || undefined}
      data-vida={vivo && momento ? momento : undefined}
      data-tier={tier || undefined}
      title={title}
      className={`zariguyaHuesos zariguyaTrazado ${className || ''}`.trim()}
      style={estiloRaiz}
      {...(vivo ? null : { 'data-quieto': '' })}
      {...rest}
      /* La piel es un string plano (pielTrazado.js) — el MISMO markup que
         consumen los hosts sin React. Los atributos de arriba mandan el CSS. */
      dangerouslySetInnerHTML={{ __html: ZARIGUYA_TRAZADO_SVG }}
    />
  );

  if (onClick || onDoubleClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        aria-label={title}
        title={title}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
      >
        {contenedor}
      </button>
    );
  }
  return contenedor;
}

function AdaptadorZariguya({
  especie: _especie,
  creatureSlug: _creatureSlug,
  capacidades: _capacidades,
  perfil: _perfil,
  idlePerfil: _idlePerfil,
  climaPerfil: _climaPerfil,
  pose,
  estadoLegado = undefined,
  reducedMotion,
  'data-agt-especie': dataEspecie,
  'data-creature': dataCreature,
  'data-agt-estado': dataEstado,
  'data-pose': dataPose,
  'data-visema': dataVisema,
  'data-clima': dataClima,
  'data-tier': dataTier,
  ...props
}) {
  return (
    <ZariguyaTrazadoRig
      {...props}
      pose={pose}
      reducedMotion={reducedMotion}
      data-agt-especie={dataEspecie}
      data-creature={dataCreature}
      data-agt-estado={estadoLegado || dataEstado}
      data-pose={dataPose}
      data-visema={dataVisema}
      data-clima={dataClima}
      data-tier={dataTier}
    />
  );
}

/** Fachada del trazado de la zarigüeya sobre el contrato común Compai. */
export default function ZariguyaTrazado({ estado = 'idle', ...props }) {
  return (
    <CompaiAgente
      {...props}
      estado={estado}
      estadoLegado={estado}
      especie={ZARIGUYA_PERFIL.avatarType}
      chrome={false}
      preserveRigAnimation
      adaptador={AdaptadorZariguya}
    />
  );
}

export { ZariguyaTrazadoRig };
