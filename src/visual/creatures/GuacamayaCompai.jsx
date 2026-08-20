/*
 * GuacamayaCompai — la guacamaya bandera (Ara macao) como COMPAI (cuerpo del
 * agente elegible en el selector), reusando el rig F24 del valle
 * (`~/demos/3d/compai/rigs/guacamaya.*`), NO redibujada a mano.
 *
 * NOMBRE DISTINTO A PROPÓSITO: `visual/creatures/Guacamaya.jsx` YA EXISTÍA
 * (commit `44a12524d`, "fauna emblemática del piso cálido") — un billboard
 * decorativo hecho a mano para las escenas 3D del piso cálido (FaunaCalido.jsx,
 * cafetal/cacaotal). Es OTRO dibujo, OTRO contrato de props (size/inline/
 * animated/title, sin `state`) y OTRO propósito (fauna ambiental, no
 * compañero elegible). Un primer intento de este cambio SOBREESCRIBIÓ ese
 * archivo por compartir nombre — error corregido: este componente vive en su
 * propio archivo, `Guacamaya.jsx` queda intacto para FaunaCalido.jsx.
 *
 * Regla dura del operador (2026-08-14): "jamás redibujar de cero lo que ya
 * existe" — el rig+defs+css del valle ya tienen el idle vivo completo
 * (`.flota` bob, `#cuerpoRig` boil/respiración, parpadeo, mirada, cola con
 * inercia escalonada…). Este componente los INLINEA (el rig/defs vía `?raw`
 * de Vite; el CSS vía `guacamayaCssTexto.js`, ver esa nota) en vez de
 * reimplementarlos.
 *
 * La hoja de estilo original (`arte-valle/guacamaya.css`, copia verbatim del
 * valle) es la de la página demo COMPLETA (`*`, `body`, `header`,
 * `#burbuja`…) — inyectarla tal cual reventaría estilos globales reales de
 * la PWA. Se recorta a SOLO la sección del rig con `extraerCssDelRig` (ver
 * `arte-valle/nsRigValle.js`); el texto de entrada llega vía
 * `guacamayaCssTexto.js` (snapshot JS del mismo .css, no `?raw` directo —
 * vitest con `css:false` intercepta cualquier import `.css*`, incluido con
 * query `?raw`; ver la nota de ese archivo).
 *
 * Los ids del rig (`#cuerpoRig`, `#alaIzq`…) son planos — la demo del valle
 * asume una sola instancia. En la PWA varias criaturas conviven a la vez
 * (el grid de `AgentAvatarSelector`, y guacamaya comparte nombres de id con
 * chivito-punk: ambos usan `#cuerpoRig`/`#picoBajo`). Se namespacean por
 * instancia con `useId()` + `namespaceSvg`/`namespaceCss`.
 *
 * Los estados `:host([data-estado="…"])` del CSS original solo funcionan
 * dentro de Shadow DOM (el rig se pensó como web component) — este
 * componente vive en LIGHT DOM (mismo criterio que el resto de `creatures/`,
 * ver ChagraAgentAvatarMaiz), así que esas reglas por estado quedan
 * inactivas por ahora; el idle AMBIENTE (bob, respiración, parpadeo, mirada,
 * balanceo de cola) sí corre porque no depende de `:host`. PRIMERA PASADA
 * (ítem #8 del GAP compAI, 2026-08-14) — ver nota en `guacamayaIdentidad.js`.
 */
import { useId, useMemo } from 'react';
import rigSvg from './arte-valle/guacamaya.rig.svg?raw';
import defsSvg from './arte-valle/guacamaya.defs.svg?raw';
import cssCompleto from './arte-valle/guacamayaCssTexto.js';
import { idsDeclaradosEnSvg, namespaceSvg, namespaceCss, extraerCssDelRig } from './arte-valle/nsRigValle.js';
import { GUACAMAYA_SLUG, GUACAMAYA_NOMBRE } from './guacamayaIdentidad.js';

const MARCADOR_CSS = 'GUACAMAYA — rig rubber-hose';
const CSS_RIG = extraerCssDelRig(cssCompleto, MARCADOR_CSS);
const MARCADO_CRUDO = `${defsSvg}\n${rigSvg}`;
const IDS = idsDeclaradosEnSvg(MARCADO_CRUDO);

/* Bounding box estimada por inspección de las coordenadas del rig (no medida
   con un navegador real — este sandbox no tiene librerías gráficas para
   lanzar Chromium headless). Generosa a propósito: mejor un poco de margen
   de sobra que recortar el ave. Pendiente afinar contra una captura
   GPU-headed real (ver nota del operador en el reporte de esta tarea). */
const VIEWBOX = '-460 -460 920 920';

/* Vocabulario angosto del avatar (idle/thinking/speaking/listening) → el
   `data-estado` que el rig original espera (idle/hablar/senalar/…). Se deja
   sembrado para cuando el rig corra en Shadow DOM y los `:host([data-estado])`
   empiecen a aplicar de verdad. */
const ESTADO_DE_STATE = {
  idle: 'idle',
  thinking: 'idle',
  speaking: 'hablar',
  listening: 'idle',
  caminando: 'camina',
};

/* ── MARCHA (estado 'camina') ────────────────────────────────────────────────
   El rig F24 de la guacamaya NO trae patas (vive flotando) — para caminar se
   le prestan dos PATAS MANGUERA del lenguaje de la casa (tubo de tinta + pie
   crema), dibujadas DETRÁS del cuerpo y ocultas fuera de 'camina': la piel
   aprobada no se toca. En 'camina' el flote cede a un bob de suelo y el
   cuerpo hace el BAMBOLEO de loro (roll lateral en contratiempo del paso)
   mientras las patas alternan desde la cadera — ciclo real por hueso, sin
   translateX ni espejos. Keyframes con prefijo gcp- (únicos en light DOM). */
const TINTA_RIG = '#2a140b';
const PIE_CREMA = '#e8dcc0';
const CSS_MARCHA = `
svg[data-creature='guacamaya'] .gcp-marcha { opacity: 0; }
svg[data-creature='guacamaya'][data-estado='camina'] .gcp-marcha { opacity: 1; transition: opacity .25s; }
svg[data-creature='guacamaya'][data-estado='camina'] .flota {
  animation: gcp-suelo-bob 1.1s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center bottom;
}
/* El BAMBOLEO de loro al compás COMPLETO: dos botes por ciclo con el roll
   ALTERNADO sobre la pata de apoyo — el waddle ES la lectura del loro que
   camina; el ±2.4° simétrico anterior no alcanzaba a leerse a 300px. */
@keyframes gcp-suelo-bob {
  0%   { transform: translateY(16px) rotate(4deg); }    /* impacto sobre el apoyo */
  12%  { transform: translateY(24px) rotate(3.2deg); }  /* squash del peso */
  32%  { transform: translateY(-10px) rotate(1.2deg); } /* pasa por encima */
  50%  { transform: translateY(16px) rotate(-4deg); }   /* cambio de peso */
  62%  { transform: translateY(24px) rotate(-3.2deg); }
  82%  { transform: translateY(-10px) rotate(-1.2deg); }
  100% { transform: translateY(16px) rotate(4deg); }
}
.gcp-pata { transform-box: fill-box; }
.gcp-pata-i { transform-origin: top center; }
.gcp-pata-d { transform-origin: top center; }
/* UNA zancada real con fase de VUELO (la pata se LEVANTA del suelo); la
   contraria corre el mismo ciclo a -T/2. El ±19° pendular anterior dejaba
   los dos pies plantados — el gate de Cuphead lo leyó como «parado». */
svg[data-creature='guacamaya'][data-estado='camina'] .gcp-pata-i {
  animation: gcp-zancada 1.1s ease-in-out infinite;
}
svg[data-creature='guacamaya'][data-estado='camina'] .gcp-pata-d {
  animation: gcp-zancada 1.1s ease-in-out -0.55s infinite;
}
@keyframes gcp-zancada {
  0%   { transform: translateY(0) rotate(-30deg); }     /* CONTACTO adelante */
  45%  { transform: translateY(0) rotate(26deg); }      /* APOYO: empuja atrás */
  60%  { transform: translateY(-30px) rotate(15deg); }  /* DESPEGUE */
  78%  { transform: translateY(-52px) rotate(-20deg); } /* VUELO: pata alta */
  94%  { transform: translateY(-14px) rotate(-33deg); } /* overshoot */
  100% { transform: translateY(0) rotate(-30deg); }     /* PLANTA */
}
@media (prefers-reduced-motion: reduce) {
  svg[data-creature='guacamaya'][data-estado='camina'] .flota,
  svg[data-creature='guacamaya'][data-estado='camina'] .gcp-pata-i,
  svg[data-creature='guacamaya'][data-estado='camina'] .gcp-pata-d { animation: none; }
}
`;

/* Dos patas manguera de loro: nacen bajo la panza, a los lados del abanico de
   la cola (que nace en y≈132 al centro), y bajan al suelo del encuadre. */
function PatasMarcha() {
  return (
    <g className="gcp-marcha" aria-hidden="true">
      <g className="gcp-pata gcp-pata-i">
        <path d="M-52,160 C -58,205 -60,245 -56,278" fill="none"
          stroke={TINTA_RIG} strokeWidth="22" strokeLinecap="round" />
        <ellipse cx="-58" cy="285" rx="27" ry="14" fill={PIE_CREMA}
          stroke={TINTA_RIG} strokeWidth="6" />
      </g>
      <g className="gcp-pata gcp-pata-d">
        <path d="M52,160 C 58,205 60,245 56,278" fill="none"
          stroke={TINTA_RIG} strokeWidth="22" strokeLinecap="round" />
        <ellipse cx="58" cy="285" rx="27" ry="14" fill={PIE_CREMA}
          stroke={TINTA_RIG} strokeWidth="6" />
      </g>
    </g>
  );
}

/**
 * GuacamayaCompai — cuerpo 2.5D del compañero elegible. Mismas props base
 * que las demás `creatures/` (size, className, style, title); `state` es el
 * vocabulario angosto del agente (ver ChagraAgentAvatarGuacamaya.jsx para el
 * adaptador completo).
 */
export function GuacamayaCompai({
  state = 'idle',
  size = 64,
  className = '',
  style = undefined,
  title = GUACAMAYA_NOMBRE,
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
      data-creature={GUACAMAYA_SLUG}
      data-estado={estado}
      data-visema={state === 'speaking' ? 'V2' : undefined}
      {...rest}
    >
      <title>{title}</title>
      {css && <style>{css}</style>}
      <style>{CSS_MARCHA}</style>
      {/* rig reusado del valle (F24), no redibujado — ver nota de arriba */}
      <g dangerouslySetInnerHTML={{ __html: marcado }} />
      {/* patas de la marcha DESPUÉS del rig: capa correcta de loro (patas
          delante de la cola larga) — y el contrato del test del rig ("el
          primer <g> es el marcado inlineado") queda intacto */}
      <PatasMarcha />
    </svg>
  );
}

export default GuacamayaCompai;
