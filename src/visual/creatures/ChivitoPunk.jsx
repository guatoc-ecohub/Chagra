/*
 * ChivitoPunk — el chivito de páramo (Oxypogon guerinii) como CUERPO reusado
 * del rig F24 del valle (`~/demos/3d/compai/rigs/chivito.*`), NO redibujado a
 * mano. Mismo criterio y mismas garantías que `GuacamayaCompai.jsx` — leer
 * ese archivo para el detalle completo del enfoque (namespacing de ids,
 * recorte del CSS de página → CSS de rig, limitación de `:host` en light DOM).
 *
 * El slug canónico es `chivito-punk` (colapso `chivito`→`chivito-punk` ya
 * resuelto en `compai/nucleo/elenco.js`, #96) — el rig trae DOS crestas
 * (`#crestaNormal`/`#crestaPunk`) que el CSS original alterna por
 * `:host([data-estado="hablar"])`; en light DOM (sin Shadow DOM) esa regla no
 * aplica todavía, así que por ahora se ve siempre con la cresta normal en
 * reposo — igual que documenta la nota del operador en `elenco.js`: "un solo
 * rig", la cresta punk es el gesto de hablar, no una especie aparte.
 *
 * El CSS llega vía `chivitoCssTexto.js` (snapshot JS de `arte-valle/chivito.css`,
 * copia verbatim del valle), NO `?raw` directo sobre el `.css` — vitest corre
 * con `css:false` (vitest.config.js) e intercepta cualquier import `.css*`
 * (incluido con query `?raw`) devolviendo un módulo vacío solo en tests; ver
 * la nota en `chivitoCssTexto.js`.
 */
import { useId, useMemo } from 'react';
import rigSvg from './arte-valle/chivito.rig.svg?raw';
import defsSvg from './arte-valle/chivito.defs.svg?raw';
import cssCompleto from './arte-valle/chivitoCssTexto.js';
import { idsDeclaradosEnSvg, namespaceSvg, namespaceCss, extraerCssDelRig } from './arte-valle/nsRigValle.js';
import { CHIVITO_SLUG, CHIVITO_NOMBRE } from './chivitoIdentidad.js';

const MARCADOR_CSS = 'CHIVITO — rig rubber-hose';
const CSS_RIG = extraerCssDelRig(cssCompleto, MARCADOR_CSS);
const MARCADO_CRUDO = `${defsSvg}\n${rigSvg}`;
const IDS = idsDeclaradosEnSvg(MARCADO_CRUDO);

/* Bounding box estimada por inspección de coordenadas (no medida con
   navegador real — ver la misma nota en GuacamayaCompai.jsx). El chivito es
   un colibrí, cuerpo más compacto que la guacamaya. */
const VIEWBOX = '-260 -260 520 520';

const ESTADO_DE_STATE = {
  idle: 'idle',
  thinking: 'idle',
  speaking: 'hablar',
  listening: 'idle',
  caminando: 'camina',
};

/* ── MARCHA (estado 'camina') ────────────────────────────────────────────────
   El rig F24 del colibrí NO trae patas (vive flotando) — para caminar se le
   prestan dos PATITAS MANGUERA del lenguaje de la casa (tubo de tinta + pie
   crema, el noodle de _rubberhose), dibujadas DETRÁS del cuerpo y ocultas en
   todo estado que no sea 'camina': la piel aprobada no se toca, solo se le
   suma el tren de aterrizaje del gag. En 'camina' el flote del vuelo cede a
   un bob de suelo (2 botes por ciclo) y las patas alternan desde la cadera —
   ciclo real por hueso, sin translateX ni espejos. Alas y cresta siguen vivas:
   un colibrí camina zumbando. Keyframes con prefijo chp- (únicos: los <style>
   van en light DOM y un nombre repetido entre criaturas se pisaría). */
const TINTA_RIG = '#2c2318';
const PIE_CREMA = '#efe6c8';
const CSS_MARCHA = `
svg[data-creature='chivito-punk'] .chp-marcha { opacity: 0; }
svg[data-creature='chivito-punk'][data-estado='camina'] .chp-marcha { opacity: 1; transition: opacity .25s; }
svg[data-creature='chivito-punk'][data-estado='camina'] .flota {
  animation: chp-suelo-bob 0.45s ease-in-out infinite;
}
@keyframes chp-suelo-bob {
  0%, 100% { transform: translateY(9px); }
  50%      { transform: translateY(0); }
}
.chp-pata { transform-box: fill-box; }
.chp-pata-i { transform-origin: top center; }
.chp-pata-d { transform-origin: top center; }
svg[data-creature='chivito-punk'][data-estado='camina'] .chp-pata-i {
  animation: chp-paso-i 0.9s ease-in-out infinite;
}
svg[data-creature='chivito-punk'][data-estado='camina'] .chp-pata-d {
  animation: chp-paso-d 0.9s ease-in-out infinite;
}
@keyframes chp-paso-i {
  0%, 100% { transform: rotate(22deg); }
  50%      { transform: rotate(-22deg); }
}
@keyframes chp-paso-d {
  0%, 100% { transform: rotate(-22deg); }
  50%      { transform: rotate(22deg); }
}
@media (prefers-reduced-motion: reduce) {
  svg[data-creature='chivito-punk'][data-estado='camina'] .flota,
  svg[data-creature='chivito-punk'][data-estado='camina'] .chp-pata-i,
  svg[data-creature='chivito-punk'][data-estado='camina'] .chp-pata-d { animation: none; }
}
`;

/* Dos patitas manguera: nacen donde la panza remata (la cola nace en y≈112 —
   medido con getBBox en el gate) y bajan al suelo del encuadre, DELANTE de la
   cola (capa correcta de ave: patas delante del abanico, detrás de nada que
   importe — a los lados de la barba, que es central). Tubo de tinta y pie
   crema de mitón — el vocabulario de _faunaKitRubber. */
function PatitasMarcha() {
  /* doble trazo (tinta afuera + plumaje adentro), como las patas del perfil
     del jaguar: pura tinta sobre el panel oscuro no se leía — pasó. */
  const PLUMAJE = '#6e7440';
  return (
    <g className="chp-marcha" aria-hidden="true">
      <g className="chp-pata chp-pata-i">
        <path d="M-44,100 C -48,130 -49,156 -47,180" fill="none"
          stroke={TINTA_RIG} strokeWidth="14" strokeLinecap="round" />
        <path d="M-44,100 C -48,130 -49,156 -47,180" fill="none"
          stroke={PLUMAJE} strokeWidth="9" strokeLinecap="round" />
        <ellipse cx="-47" cy="186" rx="17" ry="10" fill={PIE_CREMA}
          stroke={TINTA_RIG} strokeWidth="4" />
      </g>
      <g className="chp-pata chp-pata-d">
        <path d="M44,100 C 48,130 49,156 47,180" fill="none"
          stroke={TINTA_RIG} strokeWidth="14" strokeLinecap="round" />
        <path d="M44,100 C 48,130 49,156 47,180" fill="none"
          stroke={PLUMAJE} strokeWidth="9" strokeLinecap="round" />
        <ellipse cx="47" cy="186" rx="17" ry="10" fill={PIE_CREMA}
          stroke={TINTA_RIG} strokeWidth="4" />
      </g>
    </g>
  );
}

/**
 * ChivitoPunk — cuerpo 2.5D. Mismas props base que las demás `creatures/`.
 */
export function ChivitoPunk({
  state = 'idle',
  size = 64,
  className = '',
  style = undefined,
  title = CHIVITO_NOMBRE,
  ...rest
}) {
  const sufijo = useId().replace(/[:]/g, '');
  const marcado = useMemo(() => namespaceSvg(MARCADO_CRUDO, IDS, sufijo), [sufijo]);
  const css = useMemo(() => namespaceCss(CSS_RIG, IDS, sufijo), [sufijo]);
  const estado = ESTADO_DE_STATE[state] || 'idle';

  return (
    <svg
      viewBox={VIEWBOX}
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label={title}
      data-creature={CHIVITO_SLUG}
      data-estado={estado}
      data-visema={state === 'speaking' ? 'V2' : undefined}
      {...rest}
    >
      <title>{title}</title>
      {css && <style>{css}</style>}
      <style>{CSS_MARCHA}</style>
      {/* rig reusado del valle (F24), no redibujado — ver nota de arriba */}
      <g dangerouslySetInnerHTML={{ __html: marcado }} />
      {/* patitas de la marcha DESPUÉS del rig: delante de la cola (el abanico
          nace en y≈112 y las taparía por completo si fueran detrás — pasó) */}
      <PatitasMarcha />
    </svg>
  );
}

export default ChivitoPunk;
