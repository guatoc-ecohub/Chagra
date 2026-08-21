/*
 * ChivitoCompai — el chivito de páramo (Oxypogon guerinii) como COMPAI (cuerpo del
 * agente elegible en el selector), reusando el rig F24 del valle
 * (`~/demos/3d/compai/rigs/chivito.*`), NO redibujado a mano.
 *
 * NOMBRE DISTINTO A PROPÓSITO: `visual/creatures/ChivitoPunk.jsx` YA EXISTÍA
 * (commit previo, "chivito de páramo como compai") — un componente con el
 * vocabulario angosto histórico (idle/thinking/speaking/listening) que usaba
 * un hardcode de `data-visema` (`state==='speaking'?'V2':undefined`) y no
 * tenía conexión al agente conversacional. Este componente lo promueve a
 * "avatar rico" reutilizando la MISMA maquinaria que ya tiene Angelita, sin
 * duplicarla.
 *
 * Regla dura del operador (2026-08-14): "jamás redibujar de cero lo que ya
 * existe" — el rig+defs+css del valle ya tienen el idle vivo completo
 * (`.flota` bob, `#cuerpoRig` boil/respiración, parpadeo, mirada, aleteo,
 * barba con inercia…). Este componente los INLINEA (el rig/defs vía `?raw`
 * de Vite; el CSS vía `chivitoCssTexto.js`, ver esa nota) en vez de
 * reimplementarlos.
 *
 * La hoja de estilo original (`arte-valle/chivito.css`, copia verbatim del
 * valle) es la de la página demo COMPLETA (`*`, `body`, `header`,
 * `#burbuja`…) — inyectarla tal cual reventaría estilos globales reales de
 * la PWA. Se recorta a SOLO la sección del rig con `extraerCssDelRig` (ver
 * `arte-valle/nsRigValle.js`); el texto de entrada llega vía
 * `chivitoCssTexto.js` (snapshot JS del mismo .css, no `?raw` directo —
 * vitest con `css:false` intercepta cualquier import `.css*`, incluido con
 * query `?raw`; ver la nota de ese archivo).
 *
 * Los ids del rig (`#cuerpoRig`, `#alaIzq`…) son planos — la demo del valle
 * asume una sola instancia. En la PWA varias criaturas conviven a la vez
 * (el grid de `AgentAvatarSelector`, y chivito-punk comparte nombres de id
 * con guacamaya: ambos usan `#cuerpoRig`). Se namespacean por instancia con
 * `useId()` + `namespaceSvg`/`namespaceCss`.
 *
 * Los estados `:host([data-estado="…"])` del CSS original solo funcionan
 * dentro de Shadow DOM (el rig se pensó como web component) — este
 * componente vive en LIGHT DOM (mismo criterio que el resto de `creatures/`,
 * ver ChagraAgentAvatarMaiz). ARREGLADO (2026-08-21, "chivito = compai de
 * agente completo"): `hostALigero()` (`arte-valle/nsRigValle.js`) reescribe
 * `:host([data-estado="X"])` a `[data-estado="X"]` en JS, ANTES de inyectar
 * el `<style>` — en LIGHT DOM el propio `<svg data-estado>` raíz ya actúa
 * como el ancestro real, así que el selector plano matchea igual de bien. El
 * archivo verbatim (`arte-valle/chivito.css`) NO se toca — la reescritura
 * vive aquí, en el wrapper. Con esto los 5 estados del rig (idle/hablar/
 * senalar/libar/tejer) actúan de verdad, no solo el idle ambiente.
 *
 * VOCABULARIO RICO (mismo cambio): además del `state` angosto histórico
 * (idle/thinking/speaking/listening, para los call-sites narrow vía
 * `ChagraAgentAvatarChivitoPunk.jsx`), este componente acepta ahora `estado`
 * (el vocabulario de 10 estados de `angelitaEstados.js` — el mismo que usa
 * Angelita) y `visema` (real, de `useLipSync`/`lipSyncCore.js` — species-
 * agnostic). REUTILIZA la maquinaria de Angelita, no la duplica: el
 * repertorio ocioso sale de `elegirMomentoIdle`/`duracionDeMomento`
 * (`angelitaEstados.js` → `compai/nucleo/gestos.js`), la normalización de
 * estado de `estadoCanonico`. Ver `ESTADO_RIG_DE_ESTADO_AGENTE` abajo para
 * el mapeo estado-agente → data-estado-del-rig y su porqué.
 */
import { useEffect, useId, useMemo, useState } from 'react';
import rigSvg from './arte-valle/chivito.rig.svg?raw';
import defsSvg from './arte-valle/chivito.defs.svg?raw';
import cssCompleto from './arte-valle/chivitoCssTexto.js';
import {
  idsDeclaradosEnSvg,
  namespaceSvg,
  namespaceCss,
  extraerCssDelRig,
  hostALigero,
} from './arte-valle/nsRigValle.js';
import { CHIVITO_SLUG, CHIVITO_NOMBRE } from './chivitoIdentidad.js';
import { estadoCanonico, elegirMomentoIdle, duracionDeMomento } from '../agente/angelitaEstados.js';

const MARCADOR_CSS = 'CHIVITO — rig rubber-hose';

/* PASO 3 (opcional, prioridad baja) — el pico real siguiendo el lip-sync: el
   rig YA trae `#picoBajo` con `transform-box`/`transition` pensados para que
   un JS externo mueva la mandíbula (comentario original junto a esa regla:
   "la mueve el LIP-SYNC por JS"), pero ningún JS lo hacía todavía — el
   "hablar" del rig era solo cabeceo genérico (`cabezaHabla`), sin boca real.
   En vez de inventar un silabeo propio, reusamos el `data-visema` genérico
   de `lipSyncCore.js` (mismo contrato que el resto del elenco — Luciernaga/
   OsoBaston mueven mandíbula con esta misma idea): 4 rotaciones sutiles de
   `#picoBajo`, en el mismo orden de magnitud que documenta ese módulo
   (V1 cerrada < V2 entreabierta < V4 fruncida < V3 abierta). Reglas NUEVAS,
   NO en el archivo verbatim — van solo aquí, en el CSS que arma el wrapper. */
const CSS_VISEMA_PICO = `
[data-visema="V1"] #picoBajo{transform:rotate(0deg)}
[data-visema="V2"] #picoBajo{transform:rotate(4deg)}
[data-visema="V4"] #picoBajo{transform:rotate(8deg)}
[data-visema="V3"] #picoBajo{transform:rotate(14deg)}
`;

const CSS_RIG = hostALigero(extraerCssDelRig(cssCompleto, MARCADOR_CSS)) + CSS_VISEMA_PICO;
const MARCADO_CRUDO = `${defsSvg}\n${rigSvg}`;
const IDS = idsDeclaradosEnSvg(MARCADO_CRUDO);

/* Bounding box estimada por inspección de las coordenadas del rig (no medida
   con un navegador real — este sandbox no tiene librerías gráficas para
   lanzar Chromium headless). Generosa a propósito: mejor un poco de margen
   de sobra que recortar el ave. Pendiente afinar contra una captura
   GPU-headed real (ver nota del operador en el reporte de esta tarea). */
const VIEWBOX = '-260 -260 520 520';

/* Vocabulario angosto del avatar (idle/thinking/speaking/listening) → el
   `data-estado` que el rig original espera (idle/hablar/senalar/…). Se deja
   sembrado para cuando el rig corra en Shadow DOM y los `:host([data-estado])`
   empiecen a aplicar de verdad. */
const ESTADO_DE_STATE = {
  idle: 'idle',
  thinking: 'idle',
  speaking: 'hablar',
  listening: 'idle',
};

/* Vocabulario RICO (angelitaEstados.js, los mismos 10 que entiende Angelita)
   → el `data-estado` que el rig del chivito sabe animar de verdad (idle/
   hablar/senalar/libar/tejer). El rig tiene MENOS estados que el agente
   (5 contra 10) — cada mapeo abajo documenta el porqué del "mejor calce"
   semántico, mismo criterio que `POSE_DE_ESTADO` de Angelita:
     acompana     → idle    (match directo: el idle ambiente ES la presencia).
     escuchando   → idle    (el rig no tiene pose de escucha propia — el
                              idle ambiente ya transmite presencia atenta).
     pensando     → idle    (tampoco hay pose de "pensar"; se queda quieta).
     respondiendo → hablar  (match directo).
     contenta     → idle    (sin pose de celebración propia; se queda quieta
                              con el brillo del idle ambiente).
     preocupada   → idle    (sin pose de alerta; se queda quieta).
     no-se        → idle    (sin pose de duda propia; se queda quieta).
     senala       → senalar (match directo).
     invita       → libar   (alas abiertas de bienvenida + movimiento: gesto
                              de "venga" con aleteo rápido, lo más cercano del
                              rig a una invitación).
     husmea       → tejer   (el más activo/investigativo de los que quedan:
                              movimiento de brazos tejiendo, cerca del nido). */
const ESTADO_RIG_DE_ESTADO_AGENTE = {
  acompana: 'idle',
  escuchando: 'idle',
  pensando: 'idle',
  respondiendo: 'hablar',
  contenta: 'idle',
  preocupada: 'idle',
  'no-se': 'idle',
  senala: 'senalar',
  invita: 'libar',
  husmea: 'tejer',
};

/* ¿El usuario pidió quietud? Mismo criterio que Angelita.jsx: los sistemas
   JS (aquí, solo el scheduler del idle-cerebro) se apagan igual que las
   animaciones CSS. */
function prefiereQuietud() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * ChivitoCompai — cuerpo 2.5D del compañero elegible. Mismas props base
 * que las demás `creatures/` (size, className, style, title).
 *
 * Dos vocabularios de estado (retrocompatible):
 *   - `state` (angosto: idle/thinking/speaking/listening) — el histórico,
 *     usado por `ChagraAgentAvatarChivitoPunk.jsx` y cualquier call-site que
 *     no maneje el vocabulario rico.
 *   - `estado` (rico: los 10 de `angelitaEstados.js`) — si viene, GANA sobre
 *     `state` y se traduce con `ESTADO_RIG_DE_ESTADO_AGENTE` (ver arriba).
 *     Sin `estado`, el comportamiento es IDÉNTICO al de antes (nadie que
 *     solo mande `state` se rompe).
 *
 * `visema` ('V1'..'V4' de `useLipSync`) reemplaza el hardcode viejo
 * (`state==='speaking'→'V2'`) — ver `ChagraAgentAvatarChivitoPunk.jsx` para
 * cómo el adaptador angosto sigue produciendo un visema razonable sin que el
 * host tenga que correr `useLipSync` él mismo.
 *
 * El idle-cerebro (micro-gestos sin repetir) SOLO corre cuando se usa la API
 * rica (`estado` presente) — no cambia el comportamiento narrow existente.
 */
export function ChivitoCompai({
  state = 'idle',
  estado = undefined,
  visema = null,
  tier = undefined,
  size = 64,
  className = '',
  style = undefined,
  title = CHIVITO_NOMBRE,
  ...rest
}) {
  const sufijo = useId().replace(/[:]/g, '');
  const marcado = useMemo(() => namespaceSvg(MARCADO_CRUDO, IDS, sufijo), [sufijo]);
  const css = useMemo(() => namespaceCss(CSS_RIG, IDS, sufijo), [sufijo]);
  const dataEstado = estado !== undefined
    ? (ESTADO_RIG_DE_ESTADO_AGENTE[estadoCanonico(estado)] || 'idle')
    : (ESTADO_DE_STATE[state] || 'idle');

  /* ═══ IDLE-CEREBRO — reusa el MISMO scheduler que Angelita.jsx (mismo
     patrón: setTimeout recursivo elige `elegirMomentoIdle`/`duracionDeMomento`
     de `angelitaEstados.js`, sin repetir gesto). El rig no tiene arte propio
     por-momento (no es la abeja: no hay pieza para "se acicala"/"se rasca"),
     así que en vez de forzar dibujo nuevo, el momento elegido queda expuesto
     como dato (`data-chivito-idle`) para que el CSS del rig (o uno futuro) lo
     pueda leer — PENDIENTE (no bloqueante, ver reporte de esta tarea): una
     señal visual sutil por-momento (un leve tilt genérico, sin dibujo nuevo)
     todavía no está cableada, el scheduler ya corre y ya se puede consumir.
     Gates: solo con `estado` (API rica), `acompana`/idle, `tier!=='bajo'`,
     `prefiereQuietud()`. */
  const idleActivo = estado !== undefined
    && estadoCanonico(estado) === 'acompana'
    && tier !== 'bajo';
  const [momento, setMomento] = useState('flota');
  useEffect(() => {
    if (!idleActivo || prefiereQuietud()) return undefined;
    let timer = 0;
    let ultimoGesto = null;
    const programar = (nombre) => {
      setMomento(nombre);
      timer = window.setTimeout(() => {
        if (nombre === 'posa') { programar('posada'); return; }
        if (nombre === 'posada') { programar('despega'); return; }
        if (nombre === 'flota') {
          ultimoGesto = elegirMomentoIdle(ultimoGesto);
          programar(ultimoGesto);
          return;
        }
        programar('flota');
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
      data-creature={CHIVITO_SLUG}
      data-estado={dataEstado}
      data-visema={visema || undefined}
      data-chivito-idle={idleActivo ? momento : undefined}
      data-tier={tier || undefined}
      {...rest}
    >
      <title>{title}</title>
      {css && <style>{css}</style>}
      {/* rig reusado del valle (F24), no redibujado — ver nota de arriba */}
      <g dangerouslySetInnerHTML={{ __html: marcado }} />
    </svg>
  );
}

export default ChivitoCompai;
