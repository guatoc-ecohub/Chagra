/*
 * JaguarCompai — el jaguar (Panthera onca) como COMPAI (cuerpo del agente
 * elegible en el selector), reusando el rig F24 del valle
 * (`~/demos/3d/compai/rigs/jaguar.*`), NO redibujado a mano.
 *
 * MISMA TÉCNICA EXACTA que `GuacamayaCompai.jsx`/`ChivitoPunk.jsx` — leer
 * ese archivo para el detalle completo del enfoque (namespacing de ids,
 * recorte del CSS de página → CSS de rig, limitación de `:host` en light
 * DOM). Este componente reemplaza al jaguar dibujado a mano que vivía detrás
 * de `ChagraAgentAvatarJaguar.jsx` (el cuerpo `Jaguar.jsx` rubber-hose de
 * `visual/creatures/`) — el operador rechazó (a) componentes nativos que
 * dibujan SVG a mano y (b) una lámina aplanada con parpadeo falso; SOLO el
 * rig F24 vivo (esqueleto real: bob, respiración, parpadeo, mirada, cola con
 * inercia) queda aprobado (2026-08-14).
 *
 * NOMBRE DISTINTO A PROPÓSITO: `visual/creatures/Jaguar.jsx` SIGUE VIVO —
 * lo usan las escenas 3D del mundo (`JaguarBillboard.jsx`,
 * `ClaroDelJaguar.jsx`, `JaguarCompaiEscena.jsx`, `mockups/JaguarMonte3D.jsx`)
 * y el juego de kart (`JAGUAR_PODER_KART`). Ese es OTRO dibujo, OTRO
 * contrato de props (pose/acecha/visema/tier, sin `state`) y OTRO propósito
 * (fauna del mundo 3D, no compañero elegible de la PWA). Este componente
 * SOLO reemplaza el CUERPO detrás del selector de avatar del agente
 * (`ChagraAgentAvatarJaguar.jsx`) — `visual/creatures/Jaguar.jsx` queda
 * intacto para todo lo demás.
 *
 * El slug (`JAGUAR_SLUG`, `data-creature="jaguar"`) se reusa de
 * `jaguarIdentidad.js` — es la MISMA especie, un solo slug canónico; no hace
 * falta un identidad-file nuevo como con guacamaya/chivito (esos no tenían
 * uno todavía).
 *
 * La hoja de estilo original (`arte-valle/jaguar.css`, copia verbatim del
 * valle) es la de la página demo COMPLETA (`*`, `body`, `header`,
 * `#burbuja`…) — inyectarla tal cual reventaría estilos globales reales de
 * la PWA. Se recorta a SOLO la sección del rig con `extraerCssDelRig` (ver
 * `arte-valle/nsRigValle.js`); el texto de entrada llega vía
 * `jaguarCssTexto.js` (snapshot JS del mismo .css, no `?raw` directo —
 * vitest con `css:false` intercepta cualquier import `.css*`, incluido con
 * query `?raw`; ver la nota de ese archivo).
 *
 * Los ids del rig (`#cuerpoRig`, `#cabezaRig`…) son planos — la demo del
 * valle asume una sola instancia. En la PWA varias criaturas conviven a la
 * vez (el grid de `AgentAvatarSelector`), así que se namespacean por
 * instancia con `useId()` + `namespaceSvg`/`namespaceCss`, igual que
 * guacamaya/chivito.
 *
 * Los estados `:host([data-estado="…"])` del CSS original (el rig jaguar
 * trae un vocabulario rico: idle/acecho/hablar/senala/pacto/amenaza/camina/
 * invocacion) solo funcionan dentro de Shadow DOM (el rig se pensó como web
 * component) — este componente vive en LIGHT DOM (mismo criterio que el
 * resto de `creatures/`), así que esas reglas por estado quedan inactivas
 * por ahora; el idle AMBIENTE (bob, respiración, parpadeo, mirada, cola con
 * inercia) sí corre porque no depende de `:host`. Por eso el vocabulario
 * angosto de abajo se mantiene tan simple como el de guacamaya (idle/hablar)
 * — mapear a `acecho`/`senala`/etc. no cambiaría nada visible todavía.
 */
import { useId, useMemo } from 'react';
import rigSvg from './arte-valle/jaguar.rig.svg?raw';
import defsSvg from './arte-valle/jaguar.defs.svg?raw';
import cssCompleto from './arte-valle/jaguarCssTexto.js';
import { idsDeclaradosEnSvg, namespaceSvg, namespaceCss, extraerCssDelRig } from './arte-valle/nsRigValle.js';
import { JAGUAR_SLUG } from './jaguarIdentidad.js';

const JAGUAR_NOMBRE = 'Jaguar';

const MARCADOR_CSS = 'JAGUAR — rig rubber-hose';
const CSS_RIG = extraerCssDelRig(cssCompleto, MARCADOR_CSS);
const MARCADO_CRUDO = `${defsSvg}\n${rigSvg}`;
const IDS = idsDeclaradosEnSvg(MARCADO_CRUDO);

/* Bounding box estimada por inspección de las coordenadas del rig (no medida
   con un navegador real — este sandbox no tiene librerías gráficas para
   lanzar Chromium headless). El rig frontal + el anillo de invocación
   (mandala r=300 centrado en y=20, constelación con estrellas hasta
   ±386/-388) empujan la caja bastante más allá del cuerpo del felino
   (~±130 en reposo) — generosa a propósito: mejor margen de sobra que
   recortar el rig. Mismo viewBox que guacamaya (920×920) por consistencia y
   sobra de margen. */
const VIEWBOX = '-460 -460 920 920';

/* Vocabulario angosto del avatar (idle/thinking/speaking/listening) → el
   `data-estado` que el rig original espera. Se deja sembrado para cuando el
   rig corra en Shadow DOM y los `:host([data-estado])` empiecen a aplicar
   de verdad — el rig jaguar ya trae acecho/senala/pacto/amenaza/camina/
   invocacion listos para ese momento. */
const ESTADO_DE_STATE = {
  idle: 'idle',
  thinking: 'idle',
  speaking: 'hablar',
  listening: 'idle',
};

/**
 * JaguarCompai — cuerpo 2.5D del compañero elegible. Mismas props base que
 * las demás `creatures/` (size, className, style, title); `state` es el
 * vocabulario angosto del agente (ver ChagraAgentAvatarJaguar.jsx para el
 * adaptador completo).
 */
export function JaguarCompai({
  state = 'idle',
  size = 64,
  className = '',
  style = undefined,
  title = JAGUAR_NOMBRE,
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
      data-creature={JAGUAR_SLUG}
      data-estado={estado}
      data-visema={state === 'speaking' ? 'V2' : undefined}
      {...rest}
    >
      <title>{title}</title>
      {css && <style>{css}</style>}
      {/* rig reusado del valle (F24), no redibujado — ver nota de arriba */}
      <g dangerouslySetInnerHTML={{ __html: marcado }} />
    </svg>
  );
}

export default JaguarCompai;
