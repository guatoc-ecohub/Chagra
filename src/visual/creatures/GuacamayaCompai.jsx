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
import { useEffect, useId, useMemo, useState } from 'react';
import rigSvg from './arte-valle/guacamaya.rig.svg?raw';
import defsSvg from './arte-valle/guacamaya.defs.svg?raw';
import cssCompleto from './arte-valle/guacamayaCssTexto.js';
import {
  idsDeclaradosEnSvg,
  namespaceSvg,
  namespaceCss,
  extraerCssDelRig,
  hostALigero,
} from './arte-valle/nsRigValle.js';
import { GUACAMAYA_SLUG, GUACAMAYA_NOMBRE } from './guacamayaIdentidad.js';
import { estadoCanonico, elegirMomentoIdle, duracionDeMomento } from '../agente/angelitaEstados.js';

const MARCADOR_CSS = 'GUACAMAYA — rig rubber-hose';
const CSS_RIG = hostALigero(extraerCssDelRig(cssCompleto, MARCADOR_CSS)) + `
[data-visema="V1"] #picoBajo{transform:translateY(0) scaleY(.9)}
[data-visema="V2"] #picoBajo{transform:translateY(3px) scaleY(1.08)}
[data-visema="V4"] #picoBajo{transform:translateY(6px) scaleY(1.18)}
[data-visema="V3"] #picoBajo{transform:translateY(10px) scaleY(1.28)}
svg[data-creature="guacamaya"][data-vida="enjaulada"] #jaula{opacity:.92}
svg[data-creature="guacamaya"][data-vida="enjaulada"] #guaca{filter:saturate(.55) brightness(.8);transform:translateY(10px) scale(.97)}
svg[data-creature="guacamaya"][data-vida="enjaulada"] .flota{animation-duration:3.8s}
svg[data-creature="guacamaya"][data-vida="enjaulada"] #alaIzq,
svg[data-creature="guacamaya"][data-vida="enjaulada"] #alaDer{transform:rotate(-5deg)}
`;
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
  /* El control compartido puede decir "caminando", pero esta especie vuela:
     reutiliza la actuación "dispersar" del showcase (aleteo + semillas). */
  caminando: 'dispersar',
  volando: 'dispersar',
};

const ESTADO_RIG_DE_ESTADO_AGENTE = {
  acompana: 'idle', escuchando: 'idle', pensando: 'idle', respondiendo: 'hablar',
  contenta: 'sana', preocupada: 'amenaza', 'no-se': 'idle', senala: 'senalar',
  invita: 'pacto', husmea: 'dispersar',
};
const VISEMAS_HABLA = ['V2', 'V3', 'V1', 'V4'];

/* Texto de la lección viva del showcase: el comparador conserva el diálogo
   aprobado y solo añade la presentación del globo en su propia tarjeta. */
export const DIALOGO_GUACAMAYA = '¡Buenos días! Soy una guacamaya bandera. Vuelo lejos y voy soltando semillas por todo el monte: soy jardinera del bosque.';

/**
 * GuacamayaCompai — cuerpo 2.5D del compañero elegible. Mismas props base
 * que las demás `creatures/` (size, className, style, title); `state` es el
 * vocabulario angosto del agente (ver ChagraAgentAvatarGuacamaya.jsx para el
 * adaptador completo).
 */
export function GuacamayaCompai({
  state = 'idle',
  estado = undefined,
  visema = null,
  size = 64,
  className = '',
  style = undefined,
  title = GUACAMAYA_NOMBRE,
  ...rest
}) {
  const sufijo = useId().replace(/[:]/g, '');
  const marcado = useMemo(() => namespaceSvg(MARCADO_CRUDO, IDS, sufijo), [sufijo]);
  const css = useMemo(() => namespaceCss(CSS_RIG, IDS, sufijo), [sufijo]);
  const dataEstado = estado !== undefined
    ? (ESTADO_RIG_DE_ESTADO_AGENTE[estadoCanonico(estado)] || 'idle')
    : (ESTADO_DE_STATE[state] || 'idle');
  const idleActivo = estado === undefined && (state === 'idle' || state === 'thinking');
  const hablando = dataEstado === 'hablar';
  const [visemaAutomatico, setVisemaAutomatico] = useState('V2');
  const [enjaulada, setEnjaulada] = useState(false);
  const [momento, setMomento] = useState('flota');

  useEffect(() => {
    if (!hablando) { setVisemaAutomatico('V1'); return undefined; }
    let n = 0;
    const timer = window.setInterval(() => {
      n = (n + 1) % VISEMAS_HABLA.length;
      setVisemaAutomatico(VISEMAS_HABLA[n]);
    }, 170);
    return () => window.clearInterval(timer);
  }, [hablando]);

  useEffect(() => {
    if (!idleActivo || typeof window === 'undefined'
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let timer = 0;
    let ultimoGesto = null;
    let primerFlota = true;
    const programar = (nombre) => {
      setMomento(nombre);
      /* Primera aparición siempre libre; después ~15% de los ratos ociosos. */
      setEnjaulada(nombre === 'flota' && !primerFlota && Math.random() < 0.15);
      primerFlota = false;
      timer = window.setTimeout(() => {
        if (nombre === 'flota') {
          ultimoGesto = elegirMomentoIdle(ultimoGesto);
          programar(ultimoGesto);
        } else {
          programar('flota');
        }
      }, duracionDeMomento(nombre));
    };
    timer = window.setTimeout(() => programar('flota'), 0);
    return () => window.clearTimeout(timer);
  }, [idleActivo]);

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
      data-estado={dataEstado}
      data-visema={visema || (hablando ? visemaAutomatico : undefined)}
      data-vida={enjaulada ? 'enjaulada' : undefined}
      data-guaca-idle={idleActivo ? momento : undefined}
      {...rest}
    >
      <title>{title}</title>
      {css && <style>{css}</style>}
      {/* rig reusado del valle (F24), no redibujado — ver nota de arriba */}
      <g dangerouslySetInnerHTML={{ __html: marcado }} />
    </svg>
  );
}

export default GuacamayaCompai;
