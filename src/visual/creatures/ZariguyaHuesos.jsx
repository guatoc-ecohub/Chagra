import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ZARIGUYA_HUESOS_SVG } from './zariguyaHuesos/pielHuesos.js';
import { useVidaIdle, useMiradaUsted } from './useVidaIdle.js';
import './zariguyaHuesos/zariguyaHuesos.css';

const ZARIGUYA_SLUG = 'zariguya';

/* Estados del contrato de avatar → forma canónica interna (idéntico mapa que
   JaguarHuesos/las láminas vivas: el atributo data-agt-estado viaja crudo
   para paridad de API/accesibilidad; esto solo decide el comportamiento). */
const ESTADO_CANON = {
  idle: 'idle', reposo: 'idle', acompana: 'idle',
  thinking: 'thinking', pensando: 'thinking',
  speaking: 'speaking', respondiendo: 'speaking', hablando: 'speaking',
  listening: 'listening', escuchando: 'listening',
  caminando: 'caminando', walking: 'caminando', anda: 'caminando',
};

/* Apertura de mandíbula por visema (0..1) — misma tabla que la lámina viva. */
const JAW_DE_VISEMA = { V1: 0, V2: 0.42, V3: 1, V4: 0.36 };

/* El reloj 70/30 del modo auto: dentro de un ciclo co-primo con los relojes
   del idle (13.7s, no divide a 2.9/3.7/5.6/7.9/9.7), la zarigüeya vive
   NORMAL el 70% y ACTÚA (Miss Minutes) el 30%. Jitter para que dos
   zarigüeyas no sincronicen. */
const CICLO_MODO_MS = 13700;
const TRAMO_ACTUANDO = 0.3;

/**
 * ZariguyaHuesos — LA ZARIGÜEYA DEFINITIVA: la piel de la lámina linda
 * (`zariguya.png`) revectorizada a SVG y montada sobre un ESQUELETO DE
 * HUESOS real (columna → cuello → cabeza; columna → brazos del lápiz y la
 * brújula de 2 segmentos + mano; columna → piernas de 2 segmentos + pie de
 * deditos; columna → cola prensil ×3). La cabeza GIRA sobre el atlas sin
 * decapitarse (casquete articular bajo el cráneo — ver
 * `zariguyaHuesos/pielHuesos.js`), CAMINA su ronda nocturna bípeda (la
 * firma `postura-erguida`: masa VERTICAL) y la COLA PRENSIL ondula y SE
 * ENROSCA por huesos encadenados, cosa que el corte raster jamás pudo.
 *
 * Spec 70/30: `modo="auto"` (default) alterna solo — 70% NORMAL (digna,
 * realista, vida sutil) / 30% ACTUANDO (rubber-hose Miss Minutes: vuelta de
 * campana, double-take, cola en espiral, aura ROSA DE LUNA). `modo="normal"`
 * o `modo="actuando"` lo fijan (para hosts que dirigen la escena, y para QA).
 *
 * UN SOLO asset para todo: este componente sirve la UI 2D y el valle 3D
 * (billboard <Html>, ZARIGUYA_PRESENCIA); el kart y cualquier host sin React
 * pueden inyectar `ZARIGUYA_HUESOS_SVG` + `zariguyaHuesos.css` directamente
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
export default function ZariguyaHuesos({
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

  // Fase propia por instancia: dos zarigüeyas jamás laten al mismo compás.
  // Derivada del useId (PURA y estable por instancia — sin Math.random en
  // render): hash del id → desfase en [-9.7s, 0).
  const uid = useId();
  const fase = useMemo(() => {
    let h = 0;
    for (let i = 0; i < uid.length; i++) h = ((h * 31 + uid.charCodeAt(i)) >>> 0);
    return -((h % 970) / 100).toFixed(2);
  }, [uid]);

  // Idle-cerebro (husmea/tanatosis/reposo) — solo cuando el host no dirige.
  const momento = useVidaIdle(ZARIGUYA_SLUG, activoVida && enIdle);
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
      className={`zariguyaHuesos ${className || ''}`.trim()}
      style={estiloRaiz}
      {...(animated ? null : { 'data-quieto': '' })}
      {...rest}
      /* La piel es un string plano (pielHuesos.js) — el MISMO markup que
         consumen los hosts sin React. Los atributos de arriba mandan el CSS. */
      dangerouslySetInnerHTML={{ __html: ZARIGUYA_HUESOS_SVG }}
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
