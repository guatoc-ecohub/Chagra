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
 * ver ChagraAgentAvatarMaiz). ARREGLADO (2026-08-21, "guacamaya = compai de
 * agente completo"): `hostALigero()` (`arte-valle/nsRigValle.js`) reescribe
 * `:host([data-estado="X"])` a `[data-estado="X"]` en JS, ANTES de inyectar
 * el `<style>` — en LIGHT DOM el propio `<svg data-estado>` raíz ya actúa
 * como el ancestro real, así que el selector plano matchea igual de bien. El
 * archivo verbatim (`arte-valle/guacamaya.css`) NO se toca — la reescritura
 * vive aquí, en el wrapper. Con esto los 7 estados del rig (idle/hablar/
 * senalar/dispersar/sana/amenaza/pacto) actúan de verdad, no solo el idle
 * ambiente.
 *
 * VOCABULARIO RICO (mismo cambio): además del `state` angosto histórico
 * (idle/thinking/speaking/listening, para los call-sites narrow vía
 * `ChagraAgentAvatarGuacamaya.jsx`), este componente acepta ahora `estado`
 * (el vocabulario de 10 estados de `angelitaEstados.js` — el mismo que usa
 * Angelita) y `visema` (real, de `useLipSync`/`lipSyncCore.js` — species-
 * agnostic). REUTILIZA la maquinaria de Angelita, no la duplica: el
 * repertorio ocioso sale de `elegirMomentoIdle`/`duracionDeMomento`
 * (`angelitaEstados.js` → `compai/nucleo/gestos.js`), la normalización de
 * estado de `estadoCanonico`. Ver `ESTADO_RIG_DE_ESTADO_AGENTE` abajo para
 * el mapeo estado-agente → data-estado-del-rig y su porqué.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import rigSvg from './arte-valle/guacamaya.rig.svg?raw';
import defsSvg from './arte-valle/guacamaya.defs.svg?raw';
import cssCompleto from './arte-valle/guacamayaCssTexto.js';
import './guacamaya-luces.css';
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

/* GAZE-FOLLOW (mirada que sigue el puntero) — paridad con Angelita/jaguar/
   zarigüeya (`useMiradaUsted`): las pupilas de la guacamaya siguen el puntero/
   dedo de usted cuando anda cerca (data-guaca-mira='usted', vars
   --guaca-mx/--guaca-my puestas por rAF). El rig YA tiene `.pupila` con
   `transform-box`/`rhMirada` (dardeo natural, ver guacamayaCssTexto.js); esta
   regla NUEVA (no en el archivo verbatim) sobrescribe el dardeo cuando
   `data-guaca-mira='usted'` para que las pupilas apunten al puntero. Se une a
   la guacamaya de dev SIN tocar las luces místicas ni el arte aprobado. */
const CSS_GAZE_FOLLOW = `
[data-guaca-mira="usted"] .pupila{animation:none;transform:translate(var(--guaca-mx,0),var(--guaca-my,0))}
`;

const CSS_RIG = hostALigero(extraerCssDelRig(cssCompleto, MARCADOR_CSS)) + CSS_VISEMA_PICO + CSS_GAZE_FOLLOW;
const MARCADO_CRUDO = `${defsSvg}\n${rigSvg}`;
const IDS = idsDeclaradosEnSvg(MARCADO_CRUDO);

/* Bounding box estimada por inspección de las coordenadas del rig (no medida
   con un navegador real — este sandbox no tiene librerías gráficas para
   lanzar Chromium headless). Generosa a propósito: mejor un poco de margen
   de sobra que recortar el ave. Pendiente afinar contra una captura
   GPU-headed real (ver nota del operador en el reporte de esta tarea). */
const VIEWBOX = '-460 -460 920 920';

/* +15% de presencia (pedido del operador, 2026-08-24): la guacamaya se dibuja
   un 15% más grande que su `size` nominal — SOLO ella (esta constante vive en
   su propio componente, no toca al resto del elenco). Se aplica al width/height
   del <svg>, así que escala el ave Y su capa de luces por igual, en cualquier
   call-site (selector, entrada/salida, adaptador angosto). */
const FACTOR_TAMANO = 1.15;

/* LUCES MÍSTICAS — coordenadas de la estela, en unidades del VIEWBOX. Cada
   mota nace dentro de un `<g transform="rotate(ang)">` y su CSS la dispara con
   translateX de `r0`→`r1` a lo largo de ese ángulo (ver guacamaya-luces.css).
   Ángulos/tiempos desparejos a propósito: la estela respira, no pulsa a compás.
   El abanico se sesga hacia atrás/abajo del ave (la luz que suelta al avanzar),
   sin cubrir la cara. Radios ≤ 430 para no salir del viewBox (el <svg> recorta). */
const MOTAS_LUZ = [
  { ang: -28, r0: 90, r1: 300, dur: 3.2, d: 0, r: 23 },
  { ang: 18, r0: 120, r1: 340, dur: 3.9, d: 380, r: 18 },
  { ang: 62, r0: 100, r1: 320, dur: 3.4, d: 760, r: 26 },
  { ang: 116, r0: 130, r1: 360, dur: 4.2, d: 240, r: 20 },
  { ang: 158, r0: 95, r1: 300, dur: 3.6, d: 900, r: 24 },
  { ang: 205, r0: 120, r1: 330, dur: 4.0, d: 520, r: 18 },
  { ang: 246, r0: 110, r1: 350, dur: 3.5, d: 1100, r: 22 },
];

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
   → el `data-estado` que el rig de la guacamaya sabe animar de verdad (idle/
   hablar/senalar/dispersar/sana/amenaza/pacto). El rig tiene MENOS estados
   que el agente (7 contra 10) — cada mapeo abajo documenta el porqué del
   "mejor calce" semántico, mismo criterio que `POSE_DE_ESTADO` de Angelita:
     acompana     → idle    (match directo: el idle ambiente ES la presencia).
     escuchando   → idle    (el rig no tiene pose de escucha propia — el
                              idle ambiente ya transmite presencia atenta).
     pensando     → idle    (tampoco hay pose de "pensar"; se queda quieta).
     respondiendo → hablar  (match directo).
     contenta     → sana    (rebote celebratorio + brillo + medidor al tope:
                              el estado MÁS positivo del rig).
     preocupada   → amenaza (saturación baja + jaula + medidor al piso +
                              titila: alerta real, el más negativo del rig).
     no-se        → idle    (sin pose de duda propia; se queda quieta).
     senala       → senalar (match directo).
     invita       → pacto   (alas abiertas de bienvenida: gesto de acuerdo/
                              invitación, lo más cercano a "venga" del rig).
     husmea       → dispersar (el más activo/investigativo de los que
                              quedan: aleteo rápido + rastro de semillas). */
const ESTADO_RIG_DE_ESTADO_AGENTE = {
  acompana: 'idle',
  escuchando: 'idle',
  pensando: 'idle',
  respondiendo: 'hablar',
  contenta: 'sana',
  preocupada: 'amenaza',
  'no-se': 'idle',
  senala: 'senalar',
  invita: 'pacto',
  husmea: 'dispersar',
};

/* ¿El usuario pidió quietud? Mismo criterio que Angelita.jsx: los sistemas
   JS (aquí, el scheduler del idle-cerebro y el seguimiento de mirada) se
   apagan igual que las animaciones CSS. */
function prefiereQuietud() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* Estados en los que Guacamaya LO MIRA a usted si su puntero/dedo anda cerca.
   Mismo criterio que Angelita: en acompana/escuchando/respondiendo/invita hay
   atención visual activa; en estados de actuación (senala/husmea/contenta/
   preocupada) la pose del rig cuenta la historia. */
function estadosQueLoMiran() {
  // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- vocabulario técnico de estados del agente, no UI
  return new Set(['acompana', 'escuchando', 'respondiendo', 'invita']);
}

/* Hasta dónde "se da cuenta" del puntero (px) y cuánto sostiene la mirada
   después del último movimiento antes de soltarlo (ms). Calibrado al viewBox
   de la guacamaya (-460 -460 920 920): el ave es más grande que Angelita. */
const RADIO_DE_ATENCION = 440;
const SUELTA_MIRADA_MS = 1900;

/**
 * GuacamayaCompai — cuerpo 2.5D del compañero elegible. Mismas props base
 * que las demás `creatures/` (size, className, style, title).
 *
 * Dos vocabularios de estado (retrocompatible):
 *   - `state` (angosto: idle/thinking/speaking/listening) — el histórico,
 *     usado por `ChagraAgentAvatarGuacamaya.jsx` y cualquier call-site que
 *     no maneje el vocabulario rico.
 *   - `estado` (rico: los 10 de `angelitaEstados.js`) — si viene, GANA sobre
 *     `state` y se traduce con `ESTADO_RIG_DE_ESTADO_AGENTE` (ver arriba).
 *     Sin `estado`, el comportamiento es IDÉNTICO al de antes (nadie que
 *     solo mande `state` se rompe).
 *
 * `visema` ('V1'..'V4' de `useLipSync`) reemplaza el hardcode viejo
 * (`state==='speaking'→'V2'`) — ver `ChagraAgentAvatarGuacamaya.jsx` para
 * cómo el adaptador angosto sigue produciendo un visema razonable sin que el
 * host tenga que correr `useLipSync` él mismo.
 *
 * El idle-cerebro (micro-gestos sin repetir) SOLO corre cuando se usa la API
 * rica (`estado` presente) — no cambia el comportamiento narrow existente.
 *
 * LUCES MÍSTICAS (2026-08-24): capa de VFX ADITIVA (aura espectral + estela de
 * motas) que acompaña a la guacamaya, montada DETRÁS del rig para no tocar su
 * cuerpo/colores aprobados. `luces`: 'auto' (por defecto, on al volar/roam) ·
 * 'realza' (más brío, la usan entrada/salida) · 'off'. Se apaga sola en
 * `tier==='bajo'` (no se monta) y en reduced-motion (CSS). Ver
 * `guacamaya-luces.css`.
 *
 * TAMAÑO: se dibuja un +15% sobre el `size` nominal (FACTOR_TAMANO) — SOLO la
 * guacamaya. El width/height del <svg> es `round(size * 1.15)`.
 */
export function GuacamayaCompai({
  state = 'idle',
  estado = undefined,
  visema = null,
  tier = undefined,
  size = 64,
  luces = 'auto',
  className = '',
  style = undefined,
  title = GUACAMAYA_NOMBRE,
  ...rest
}) {
  const sufijo = useId().replace(/[:]/g, '');
  const svgRef = useRef(null);
  const marcado = useMemo(() => namespaceSvg(MARCADO_CRUDO, IDS, sufijo), [sufijo]);
  const css = useMemo(() => namespaceCss(CSS_RIG, IDS, sufijo), [sufijo]);
  const lado = Math.round(size * FACTOR_TAMANO);

  /* Capa de luces místicas (ADITIVA, detrás del rig — ver render). Se monta
     salvo que se pida `luces='off'` o el tier sea bajo (gama baja: la capa es
     blend + animación continua). reduced-motion la apaga vía CSS. `realza`
     (entrada/salida) la enciende igual que `auto`, pero con más brío. */
  const lucesActivas = luces !== 'off' && tier !== 'bajo';
  const dataEstado = estado !== undefined
    ? (ESTADO_RIG_DE_ESTADO_AGENTE[estadoCanonico(estado)] || 'idle')
    : (ESTADO_DE_STATE[state] || 'idle');

  /* ═══ IDLE-CEREBRO — reusa el MISMO scheduler que Angelita.jsx (mismo
     patrón: setTimeout recursivo elige `elegirMomentoIdle`/`duracionDeMomento`
     de `angelitaEstados.js`, sin repetir gesto). El rig no tiene arte propio
     por-momento (no es la abeja: no hay pieza para "se acicala"/"se rasca"),
     así que en vez de forzar dibujo nuevo, el momento elegido queda expuesto
     como dato (`data-guaca-idle`) para que el CSS del rig (o uno futuro) lo
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

  /* ═══ MIRADA QUE SIGUE EL PUNTERO (gaze-follow) — paridad con Angelita/
     jaguar/zarigüeya (`useMiradaUsted`), calibrada al viewBox de la guacamaya
     (-460 -460 920 920). Las pupilas SIGUEN el puntero/dedo de usted cuando
     anda cerca (data-guaca-mira='usted', vars --guaca-mx/--guaca-my puestas por
     rAF) y lo sueltan a los ~2s para volver a su dardeo natural (rhMirada). DOM
     directo vía ref (cero re-renders por mover el mouse). Se une SIN tocar las
     luces místicas ni el arte aprobado. */
  const estadoCanonicoParaGaze = estadoCanonico(estado || undefined);
  const sigueUsted = tier !== 'bajo' && estadosQueLoMiran().has(estadoCanonicoParaGaze);
  useEffect(() => {
    const svg = svgRef.current;
    if (!sigueUsted || !svg || prefiereQuietud()) return undefined;
    let raf = 0;
    let soltar = 0;
    let px = 0;
    let py = 0;
    const liberar = () => svg.removeAttribute('data-guaca-mira');
    const mirar = () => {
      raf = 0;
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      // La cabeza del ave vive en la parte superior del viewBox (~25% desde
      // arriba), no centrada como la abeja.
      const dx = px - (r.left + r.width / 2);
      const dy = py - (r.top + r.height * 0.25);
      if (Math.hypot(dx, dy) > RADIO_DE_ATENCION) { liberar(); return; }
      // Deflexión de pupila en unidades del viewBox; satura a ~150px.
      const mx = Math.max(-1, Math.min(1, dx / 150)) * 0.65;
      const my = Math.max(-1, Math.min(1, dy / 150)) * 0.5;
      svg.style.setProperty('--guaca-mx', `${mx.toFixed(3)}px`);
      svg.style.setProperty('--guaca-my', `${my.toFixed(3)}px`);
      svg.setAttribute('data-guaca-mira', 'usted');
      window.clearTimeout(soltar);
      soltar = window.setTimeout(liberar, SUELTA_MIRADA_MS);
    };
    const onMove = (ev) => {
      px = ev.clientX;
      py = ev.clientY;
      if (!raf) raf = window.requestAnimationFrame(mirar);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      if (raf) window.cancelAnimationFrame(raf);
      window.clearTimeout(soltar);
      liberar();
      svg.style.removeProperty('--guaca-mx');
      svg.style.removeProperty('--guaca-my');
    };
  }, [sigueUsted]);

  return (
    <svg
      ref={svgRef}
      viewBox={VIEWBOX}
      width={lado}
      height={lado}
      className={className}
      style={style}
      role="img"
      aria-label={title}
      data-creature={GUACAMAYA_SLUG}
      data-estado={dataEstado}
      data-visema={visema || undefined}
      data-guaca-idle={idleActivo ? momento : undefined}
      data-guaca-luces={lucesActivas ? (luces === 'realza' ? 'realza' : 'auto') : undefined}
      data-tier={tier || undefined}
      {...rest}
    >
      <title>{title}</title>
      {css && <style>{css}</style>}
      {/* ═══ LUCES MÍSTICAS — capa de VFX ADITIVA, DETRÁS del rig ═══════════
          Va antes del rig (z-detrás) para que el cuerpo/colores APROBADOS del
          ave queden intactos por encima; las motas emanan desde atrás y se
          abren (la estela). Gradientes con id namespaceado por instancia
          (sufijo de useId) → sin colisión entre varias guacamayas a la vez.
          La coreografía y los gates (tier/reduced-motion) viven en
          guacamaya-luces.css. */}
      {lucesActivas && (
        <>
          <defs>
            <radialGradient id={`guacaAura-${sufijo}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 244, 210, 0.55)" />
              <stop offset="40%" stopColor="rgba(255, 206, 120, 0.30)" />
              <stop offset="66%" stopColor="rgba(190, 158, 255, 0.20)" />
              <stop offset="100%" stopColor="rgba(150, 214, 255, 0)" />
            </radialGradient>
            <radialGradient id={`guacaMota-${sufijo}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 250, 224, 0.98)" />
              <stop offset="55%" stopColor="rgba(214, 190, 255, 0.55)" />
              <stop offset="100%" stopColor="rgba(190, 158, 255, 0)" />
            </radialGradient>
          </defs>
          <g className="guaca-luces" aria-hidden="true">
            <circle
              className="guaca-aura"
              cx="0"
              cy="-10"
              r="410"
              fill={`url(#guacaAura-${sufijo})`}
            />
            {MOTAS_LUZ.map((m, i) => (
              <g key={i} transform={`rotate(${m.ang})`}>
                <circle
                  className="guaca-luz"
                  cx="0"
                  cy="0"
                  r={m.r}
                  fill={`url(#guacaMota-${sufijo})`}
                  style={{
                    '--r0': `${m.r0}px`,
                    '--r1': `${m.r1}px`,
                    '--dur': `${m.dur}s`,
                    '--d': `${m.d}ms`,
                  }}
                />
              </g>
            ))}
          </g>
        </>
      )}
      {/* rig reusado del valle (F24), no redibujado — ver nota de arriba.
          `guaca-rig` marca el wrapper (NO el arte) para distinguirlo de la
          capa de luces al inspeccionar/testear. */}
      <g className="guaca-rig" dangerouslySetInnerHTML={{ __html: marcado }} />
    </svg>
  );
}

export default GuacamayaCompai;
