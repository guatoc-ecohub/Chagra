import { useEffect, useRef, useState } from 'react';
import { JAGUAR_HUESOS_SVG } from './jaguarHuesos/pielHuesos.js';
import { useVidaIdle, useMiradaUsted } from './useVidaIdle.js';
import './jaguarHuesos/jaguarHuesos.css';

const JAGUAR_SLUG = 'jaguar';

/* Estados del contrato de avatar → forma canónica interna (idéntico mapa que
   JaguarLaminaViva: el atributo data-agt-estado viaja crudo para paridad de
   API/accesibilidad; esto solo decide el comportamiento). */
const ESTADO_CANON = {
  idle: 'idle', reposo: 'idle', acompana: 'idle',
  thinking: 'thinking', pensando: 'thinking',
  speaking: 'speaking', respondiendo: 'speaking', hablando: 'speaking',
  listening: 'listening', escuchando: 'listening',
  caminando: 'caminando', walking: 'caminando', anda: 'caminando',
};

/* data-agt-estado (contrato) → el estado que consume jaguarHuesos.css. */
const ESTADO_CSS = {
  idle: 'idle', thinking: 'thinking', speaking: 'speaking',
  listening: 'listening', caminando: 'caminando',
};

/* Apertura de mandíbula por visema (0..1) — misma tabla que la lámina viva. */
const JAW_DE_VISEMA = { V1: 0, V2: 0.42, V3: 1, V4: 0.36 };

/* El reloj 70/30 del modo auto: dentro de un ciclo co-primo con los relojes
   del idle (13.7s, no divide a 3.4/5.6/7.9/9.7), el jaguar vive NORMAL el 70%
   y ACTÚA (Miss Minutes) el 30%. Jitter para que dos jaguares no sincronicen. */
const CICLO_MODO_MS = 13700;
const TRAMO_ACTUANDO = 0.3;

/**
 * JaguarHuesos — EL JAGUAR DEFINITIVO: la piel de la lámina linda
 * (`jaguar-natural.png`) revectorizada a SVG y montada sobre un ESQUELETO DE
 * HUESOS real (columna → cuello → cabeza; columna → 4 patas de 2 segmentos +
 * zarpa; columna → cola ×3). La cabeza GIRA sobre el atlas sin decapitarse
 * (casquete articular bajo el cráneo — ver `jaguarHuesos/pielHuesos.js`) y
 * las patas caminan un ciclo de cuadrúpedo real (secuencia lateral probada
 * del rig de perfil), cosa que el corte raster jamás pudo.
 *
 * Spec 70/30: `modo="auto"` (default) alterna solo — 70% NORMAL (digno,
 * realista, vida sutil) / 30% ACTUANDO (rubber-hose Miss Minutes: vuelta de
 * campana, double-take, squash&stretch, aura espectral). `modo="normal"` o
 * `modo="actuando"` lo fijan (para hosts que dirigen la escena, y para QA).
 *
 * UN SOLO asset para todo: este componente sirve la UI 2D y el valle 3D
 * (billboard <Html>, JAGUAR_PRESENCIA); el kart y cualquier host sin React
 * pueden inyectar `JAGUAR_HUESOS_SVG` + `jaguarHuesos.css` directamente
 * (la piel es un string plano, los estados son atributos data-*).
 *
 * @param {Object} props
 * @param {string} [props.estado='idle']  'idle'|'thinking'|'speaking'|
 *   'listening'|'caminando' (contrato de avatar; viaja crudo).
 * @param {('auto'|'normal'|'actuando')} [props.modo='auto']
 * @param {number} [props.size=48]
 * @param {boolean} [props.animated=true]  false = fotograma digno.
 * @param {string} [props.className]
 * @param {Object} [props.style]
 * @param {string} [props.title]
 * @param {string|null} [props.visema]  'V1'..'V4' de useLipSync (host).
 * @param {string} [props.tier]  'bajo' apaga vida continua y filtros.
 * @param {(e: React.MouseEvent) => void} [props.onClick]
 * @param {(e: React.MouseEvent) => void} [props.onDoubleClick]
 */
export default function JaguarHuesos({
  estado = 'idle',
  modo = 'auto',
  size = 48,
  animated = true,
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
  const activoVida = animated && tier !== 'bajo';

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
      data-modo={animated ? modoVigente : 'normal'}
      data-visema={visema || undefined}
      data-vida={animated && momento ? momento : undefined}
      data-tier={tier || undefined}
      title={title}
      className={`jaguarHuesos ${className || ''}`.trim()}
      style={estiloRaiz}
      {...(animated ? null : { 'data-quieto': '' })}
      {...rest}
      /* La piel es un string plano (pielHuesos.js) — el MISMO markup que
         consumen los hosts sin React. Los atributos de arriba mandan el CSS. */
      dangerouslySetInnerHTML={{ __html: JAGUAR_HUESOS_SVG }}
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
