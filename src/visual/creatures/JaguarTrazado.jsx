import { useEffect, useRef, useState } from 'react';
import { JAGUAR_TRAZADO_SVG, TARJETA_MAX_PX } from './jaguarTrazado/pielTrazado.js';
import { useVidaIdle, useMiradaUsted } from './useVidaIdle.js';
import { CompaiAgente } from '../agente/CompaiAgente.jsx';
import { COMPAI_ESPECIES } from '../agente/compaiEspecies.js';
import './jaguarTrazado/jaguarHuesos.css';

const JAGUAR_SLUG = 'jaguar';
const JAGUAR_PERFIL = COMPAI_ESPECIES.jaguar;

/* Estados del contrato de avatar → forma canónica interna (mismo mapa que
   JaguarHuesos: el atributo data-agt-estado viaja crudo para paridad de
   API/accesibilidad; esto solo decide el comportamiento). */
const ESTADO_CANON = {
  idle: 'idle', reposo: 'idle', acompana: 'idle',
  thinking: 'thinking', pensando: 'thinking',
  speaking: 'speaking', respondiendo: 'speaking', hablando: 'speaking',
  listening: 'listening', escuchando: 'listening',
  contenta: 'speaking', celebra: 'speaking',
  preocupada: 'listening',
  'no-se': 'thinking', nose: 'thinking',
  senala: 'thinking', señala: 'thinking',
  invita: 'speaking', husmea: 'thinking',
  caminando: 'caminando', walking: 'caminando', anda: 'caminando',
};

/* Apertura de mandíbula por visema (0..1) — misma tabla que la lámina viva. */
const JAW_DE_VISEMA = { V1: 0, V2: 0.42, V3: 1, V4: 0.36 };

/* Reloj 70/30 del modo auto (idéntico a JaguarHuesos). */
const CICLO_MODO_MS = 13700;
const TRAMO_ACTUANDO = 0.3;

/**
 * JaguarTrazado — la lámina AUTO-TRAZADA (`jaguar-natural.png` vectorizada
 * con la receta trazar-lamina.sh) sobre el esqueleto de huesos, articulada
 * por CLIP-REGIONES (ver `jaguarTrazado/pielTrazado.js`). Drop-in de
 * `JaguarHuesos`: mismas props, mismos estados, misma CSS de cadencia —
 * sirve la UI 2D, el valle 3D (billboard <Html>) y el kart. La técnica
 * probada en la zarigüeya, con el fix de bigotes-overlay.
 *
 * @param {Object} props — idénticas a JaguarHuesos:
 *   estado, modo ('auto'|'normal'|'actuando'), size, animated, className,
 *   style, title, visema ('V1'..'V4'), tier ('bajo' apaga vida), onClick,
 *   onDoubleClick.
 */
function JaguarTrazadoRig({
  estado = 'idle',
  modo = 'auto',
  size = 48,
  animated = true,
  reducedMotion = false,
  pose = 'anda',
  className = '',
  style = undefined,
  title = 'Jaguar',
  visema = null,
  tier = undefined,
  onClick = undefined,
  onDoubleClick = undefined,
  ...rest
}) {
  const raizRef = useRef(null);
  const canon = ESTADO_CANON[estado] || 'idle';
  const enIdle = canon === 'idle';
  const vivo = animated && !reducedMotion;
  const activoVida = vivo && tier !== 'bajo';

  // Fase propia por instancia: dos jaguares jamás laten al mismo compás
  // (mismo patrón lazy-useState que useRitmoPropio: impuro solo al montar).
  const [fase] = useState(() => -(Math.random() * 9.7).toFixed(2));

  // Idle-cerebro (acecha/ruge/reposo) — solo cuando el host no dirige.
  const momento = useVidaIdle(JAGUAR_SLUG, activoVida && enIdle);
  // La testa registra su puntero cuando anda cerca (data-rh-mira en la raíz).
  useMiradaUsted(raizRef, activoVida && canon !== 'speaking');

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
  const jaw = momento === 'ruge' ? 1 : (JAW_DE_VISEMA[visema] ?? 0);

  const estiloRaiz = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    lineHeight: 0,
    '--jh-jaw': String(jaw),
    '--jh-fase': `${fase}s`,
    ...style,
  };

  const contenedor = (
    <div
      ref={raizRef}
      role="img"
      aria-label={title}
      data-creature={JAGUAR_SLUG}
      data-agt-estado={estado}
      data-modo={vivo ? modoVigente : 'normal'}
      data-visema={visema || undefined}
      data-pose={vivo ? pose : undefined}
      data-vida={vivo && momento ? momento : undefined}
      data-tier={tier || undefined}
      /* Tarjeta/FAB (size ≤ 96): enciende las ROSETAS DE TARJETA de la piel
         (ver pielTrazado §5) — a ese tamaño el calco a pelo lee tigre. */
      data-tarjeta={Number(size) <= TARJETA_MAX_PX ? '' : undefined}
      title={title}
      className={`jaguarHuesos jaguarTrazado ${className || ''}`.trim()}
      style={estiloRaiz}
      {...(vivo ? null : { 'data-quieto': '' })}
      {...rest}
      /* La piel es un string plano (pielTrazado.js) — el MISMO markup que
         consumen los hosts sin React. Los atributos de arriba mandan el CSS. */
      dangerouslySetInnerHTML={{ __html: JAGUAR_TRAZADO_SVG }}
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

function AdaptadorJaguar({
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
    <JaguarTrazadoRig
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

/** Fachada del rig del jaguar sobre el contrato común Compai. */
export default function JaguarTrazado({ estado = 'idle', ...props }) {
  return (
    <CompaiAgente
      {...props}
      estado={estado}
      estadoLegado={estado}
      especie={JAGUAR_PERFIL.avatarType}
      chrome={false}
      preserveRigAnimation
      adaptador={AdaptadorJaguar}
    />
  );
}

export { JaguarTrazadoRig };
