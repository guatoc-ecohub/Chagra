import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ZARIGUYA_TRAZADO_SVG } from './zariguyaTrazado/pielTrazado.js';
import { useVidaIdle, useMiradaUsted } from './useVidaIdle.js';
import './zariguyaTrazado/zariguyaHuesos.css';

const ZARIGUYA_SLUG = 'zariguya';

/* Estados del contrato de avatar → forma canónica interna (mismo mapa que
   JaguarTrazado/ZariguyaHuesos: data-agt-estado viaja crudo para paridad de
   API/accesibilidad; esto solo decide el comportamiento). */
const ESTADO_CANON = {
  idle: 'idle', reposo: 'idle', acompana: 'idle',
  thinking: 'thinking', pensando: 'thinking',
  speaking: 'speaking', respondiendo: 'speaking', hablando: 'speaking',
  listening: 'listening', escuchando: 'listening',
  caminando: 'caminando', walking: 'caminando', anda: 'caminando',
};

/* Apertura de mandíbula por visema (0..1) — misma tabla que la lámina viva. */
const JAW_DE_VISEMA = { V1: 0, V2: 0.42, V3: 1, V4: 0.36 };

/* Reloj 70/30 del modo auto (idéntico a JaguarTrazado/ZariguyaHuesos). */
const CICLO_MODO_MS = 13700;
const TRAMO_ACTUANDO = 0.3;

/**
 * ZariguyaTrazado — REDO 2026-08-25 nivel jaguar: la lámina Gemini aprobada
 * `zariguya-parada-limpia.png` AUTO-TRAZADA con la receta EXACTA del jaguar
 * (trazar-lamina.sh: aplanado + vtracer cp8/speckle2/gs8 + silueta potrace)
 * sobre el esqueleto de huesos, articulada por CLIP-REGIONES (ver
 * `zariguyaTrazado/pielTrazado.js`). Drop-in de los avatares hermanos:
 * mismas props, mismos estados, misma CSS de cadencia.
 *
 * @param {Object} props — idénticas a JaguarTrazado/ZariguyaHuesos:
 *   estado, modo ('auto'|'normal'|'actuando'), size, animated, className,
 *   style, title, visema ('V1'..'V4'), tier ('bajo' apaga vida), onClick,
 *   onDoubleClick.
 */
export default function ZariguyaTrazado({
  estado = 'idle',
  modo = 'auto',
  size = 48,
  animated = true,
  className = '',
  style = undefined,
  title = 'Zarigüeya (chucha)',
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

  // Fase propia por instancia (hash del useId — puro y estable por render).
  const uid = useId();
  const fase = useMemo(() => {
    let h = 0;
    for (let i = 0; i < uid.length; i++) h = ((h * 31 + uid.charCodeAt(i)) >>> 0);
    return -((h % 970) / 100).toFixed(2);
  }, [uid]);

  const momento = useVidaIdle(ZARIGUYA_SLUG, activoVida && enIdle);
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
      data-modo={animated ? modoVigente : 'normal'}
      data-visema={visema || undefined}
      data-vida={animated && momento ? momento : undefined}
      data-tier={tier || undefined}
      title={title}
      className={`zariguyaHuesos zariguyaTrazado ${className || ''}`.trim()}
      style={estiloRaiz}
      {...(animated ? null : { 'data-quieto': '' })}
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
