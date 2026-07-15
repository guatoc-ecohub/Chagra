import { useEffect, useRef, useState } from 'react';
import './angelita-agente.css';
import { AbejaAngelita } from '../creatures/AbejaAngelita.jsx';
import { RH_INK, RH_CHEEK } from '../creatures/_rubberhose.jsx';
import { ABEJA_PALETA } from '../creatures/abejaIdentidad.js';
import {
  estadoCanonico,
  POSE_DE_ESTADO,
  ARIA_DE_ESTADO,
  nivelDeConfianza,
  elegirMomentoIdle,
  duracionDeMomento,
} from './angelitaEstados.js';

/*
 * ANGELITA — EL CUERPO DEL AGENTE DE CHAGRA.
 *
 * La inteligencia que le responde al campesino deja de ser texto: es Angelita,
 * la abeja angelita (Tetragonisca angustula, meliponino nativo SIN aguijón) —
 * noble, sabia, cercana, campesina. NO mascota corporativa: una vecina que
 * sabe de la finca, que se posa a escuchar, que piensa buscando en su memoria,
 * que gesticula al responder y que DICE cuando no sabe (Chagra valora la
 * honestidad sobre la alucinación).
 *
 * Este componente es SOLO el cuerpo con su API de estados — cero lógica de
 * agente. El host (chat, voz, tutorial) le dice qué está pasando y ella lo
 * ENCARNA:
 *
 *   <Angelita estado="pensando" />
 *   <Angelita estado="respondiendo" visema={visema} confianza={0.9} />
 *   <Angelita estado="no-se" confianza="baja" />
 *
 * ESTADOS (angelitaEstados.js — acepta sinónimos):
 *   acompana     → idle VIVO: flota, respira (boil), mira alrededor, antics.
 *                  Es la AbejaAngelita de siempre: viva aunque nadie hable.
 *   escuchando   → se posa (reposo), ladea la cabeza hacia usted; la voz
 *                  humana entra en ondas de tinta.
 *   pensando     → burbuja de pensamiento con recuerdos de la finca (hoja,
 *                  gota, flor) que hojea; bracito a la barbilla; mirada arriba.
 *   respondiendo → habla (lip-sync por `visema` de useLipSync) y gesticula;
 *                  su voz sale en ondas de MIEL (ámbar).
 *   contenta     → brinca celebrando (pose celebra) con chispas doradas.
 *   preocupada   → alerta honesta: cejas fruncidas, gota de sudor, aro coral
 *                  que late, vibración inquieta. Para plaga/sequía/riesgo.
 *   no-se        → LA HONESTA: se encoge de hombros con las palmas arriba y
 *                  un "?" dibujado a mano. Sonríe: no saber no la avergüenza.
 *   senala       → guía: se inclina y apunta (pose señala) con destello en
 *                  el punto señalado.
 *   invita       → guía: se inclina hacia usted y hace "venga" con la manita.
 *
 * CONFIANZA (modo científico): `confianza` acepta 0..1 o 'alta'|'media'|'baja'.
 * Se dibuja como ANILLO DE CERTEZA alrededor del cuerpo: continuo y sereno si
 * está segura; punteado girando si es parcial; entrecortado, titilante y con
 * puntos suspensivos si duda. null (default) = sin anillo — nada cambia para
 * quien no maneja confianza.
 *
 * REUTILIZA, NO REDIBUJA: el cuerpo es la AbejaAngelita aprobada (inline) con
 * su identidad (abejaIdentidad.js), su kit rubber-hose y sus poses; las capas
 * del agente (halo, burbuja, ondas, cejas, chispas, signos) se dibujan ALREDEDOR
 * en el mismo lenguaje: tinta cálida RH_INK, squash & stretch, overshoot,
 * follow-through. La cadencia vive en `angelita-agente.css` (clases agt-*) con
 * los gates de la casa: reduced-motion congela en fotograma digno; tier 'bajo'
 * corta lo continuo decorativo y conserva el feedback de estado.
 *
 * ═══ V2 — LA VIDA (lo que separa una vecina de un logo) ═════════════════════
 *
 * 1. IDLE-CEREBRO (solo en acompana): un reloj con jitter hojea el repertorio
 *    de MOMENTOS_IDLE — mira alrededor, sigue una mota de vilano que pasa, se
 *    acicala la antena, se rasca, sacude las alas, y de vez en cuando SE POSA
 *    (aterriza con peso, respira plegadita, despega con impulso). Nunca repite
 *    el mismo gesto dos veces; entre gesto y gesto vuelve al vuelo sereno.
 *    Los micro-gestos son la vida: existe aunque nadie le hable.
 *
 * 2. FÍSICA DE VUELO: el wrapper `.agt-vuelo` deriva en figura-8 con banqueo
 *    (la abeja se ladea hacia donde va y el cuerpo la sigue con retraso —
 *    inercia, no flotador); el aterrizaje ANTICIPA, cae con peso y amortigua
 *    con squash; el despegue se agacha para coger impulso. Las alas llevan un
 *    velo de motion-blur (solo tier alto/medio).
 *
 * 3. LA MIRADA: las pupilas SIGUEN el puntero/dedo de usted cuando anda cerca
 *    (data-agt-mira='usted', vars --agt-mx/--agt-my puestas por rAF) y lo
 *    sueltan a los ~2s para volver a sus dardeos naturales. El parpadeo lleva
 *    ritmo PROPIO por instancia (duración y fase con azar al montar: dos
 *    Angelitas jamás parpadean al tiempo — el metrónomo delataba al robot).
 *    Además cada estado ACTÚA con los ojos: contacto visual franco en no-sé,
 *    ojos clavados en el POI (con chequeo a usted) en senala, buscar la
 *    palabra arriba al responder, achinaditos de dicha en contenta.
 *
 * 4. TRANSICIONES: al cambiar de estado el wrapper se remonta (key=estado) y
 *    reproduce UNA anticipación (se recoge con squash, rebasa, asienta) antes
 *    del loop del estado — los cambios fluyen, no saltan. La burbuja del
 *    pensar nace elástica desde su colita y el "?" del no-sé se dibuja a mano.
 *
 * Todos los sistemas nuevos respetan los gates: animated=false los apaga,
 * prefers-reduced-motion los apaga (JS incluido), tier 'bajo' apaga scheduler,
 * seguimiento de mirada, deriva y blur — el feedback de estado permanece.
 *
 * Tier-safe: SVG + CSS transform/opacity, cero deps nuevas, cero three.
 */

/* El escenario del agente: la abeja (viewBox propio '-15 -15 32 30') más aire
   arriba para la burbuja de pensamiento y alrededor para halo/ondas/destellos. */
const VIEWBOX = '-23 -30 46 46';

/* La voz de cada quien tiene su color: la de USTED llega en tinta (línea), la
   de ANGELITA sale en miel (ámbar). Detalle que se lee sin explicarse. */
const COLOR_VOZ_HUMANA = RH_INK;
const COLOR_VOZ_MIEL = ABEJA_PALETA.cuerpo;
const COLOR_CERTEZA = ABEJA_PALETA.cabeza;   // el dorado claro de su cabeza
const COLOR_ALERTA = '#e0745a';              // coral de alerta (pariente del RH_CHEEK)
const CREMA_PAPEL = '#fffaf0';               // el papel de la burbuja (blanco de ojo)

/* Gotita (sudor de preocupación / recuerdo de agua) — lágrima rubber-hose. */
const GOTA_D = 'M0,-1.1 C0.75,-0.15 0.75,0.55 0,1.05 C-0.75,0.55 -0.75,-0.15 0,-1.1 Z';
/* Chispa de 4 puntas (polen dorado que estalla cuando celebra / destello POI). */
const CHISPA_D = 'M0,-2 L0.55,-0.55 L2,0 L0.55,0.55 L0,2 L-0.55,0.55 L-2,0 L-0.55,-0.55 Z';

/* ── Recuerdos de la finca (lo que hojea al PENSAR): hoja, agua, flor ────────
   Mini-íconos en el mismo trazo de la familia; viven dentro de la burbuja. */
function RecuerdoHoja() {
  return (
    <g transform="rotate(-26)">
      <ellipse rx="1.7" ry="0.95" fill="#6a994e" stroke={RH_INK} strokeWidth="0.4" />
      <path d="M-1.4,0 L1.4,0" stroke="#3f5d33" strokeWidth="0.35" strokeLinecap="round" />
    </g>
  );
}
function RecuerdoGota() {
  return <path d={GOTA_D} transform="scale(1.35)" fill={ABEJA_PALETA.gota} stroke={RH_INK} strokeWidth="0.32" />;
}
function RecuerdoFlor() {
  const petalos = [[0, -0.95], [0.9, -0.29], [0.56, 0.77], [-0.56, 0.77], [-0.9, -0.29]];
  return (
    <g>
      {petalos.map(([x, y], i) => (
        <circle key={i} cx={x * 1.15} cy={y * 1.15} r="0.68" fill={RH_CHEEK} stroke={RH_INK} strokeWidth="0.3" />
      ))}
      <circle r="0.62" fill={COLOR_CERTEZA} stroke={RH_INK} strokeWidth="0.3" />
    </g>
  );
}
const RECUERDOS = [RecuerdoHoja, RecuerdoGota, RecuerdoFlor];

/* ── La VIDA: helpers del idle-cerebro y de la mirada ───────────────────────── */

/* ¿El usuario pidió quietud? Los sistemas JS (scheduler, seguimiento) se apagan
   igual que las animaciones CSS — la dignidad de la calma es de TODO el cuerpo. */
function prefiereQuietud() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* Estados en los que Angelita LO MIRA a usted si su puntero/dedo anda cerca.
   En pensando manda su mirada pensativa; en preocupada/no-se/senala, la
   actuación del estado (el problema, sus ojos francos, el POI). */
const ESTADOS_QUE_LO_MIRAN = new Set(['acompana', 'escuchando', 'respondiendo', 'invita']);

/* Hasta dónde "se da cuenta" del puntero (px) y cuánto sostiene la mirada
   después del último movimiento antes de soltarlo (ms). */
const RADIO_DE_ATENCION = 340;
const SUELTA_MIRADA_MS = 1900;

/* Mota de vilano (semillita voladora) — lo que la distrae en el momento
   'distraida': una pelusa que cruza el aire y ella despide con los ojos.
   El viaje lo pone el CSS (.agt-mota); aquí solo el dibujo, en el trazo de
   la casa: tinta cálida, tres pelitos y su semilla. */
function MotaDeVilano() {
  return (
    <g className="agt-mota" aria-hidden="true">
      <path
        d="M0,0 L-1.15,-1.7 M0,0 L0.1,-2 M0,0 L1.2,-1.55"
        stroke={RH_INK} strokeWidth="0.28" strokeLinecap="round" opacity="0.7"
      />
      <circle r="0.5" fill={RH_INK} opacity="0.62" />
    </g>
  );
}

/**
 * Angelita — el cuerpo visible del agente de Chagra. Solo arte: el host cablea
 * la inteligencia y este componente la ENCARNA por estados.
 *
 * @param {Object} props
 * @param {string} [props.estado='acompana']  estado conversacional (o sinónimo).
 * @param {number|string|null} [props.confianza=null]  0..1 o 'alta'|'media'|'baja'.
 * @param {'derecha'|'izquierda'} [props.direccion='derecha']  hacia dónde mira/
 *   señala/invita (izquierda = espejo del dibujo completo).
 * @param {number} [props.size=96]
 * @param {string} [props.className]
 * @param {boolean} [props.animated=true]  false = fotograma digno.
 * @param {string|null} [props.visema]  'V1'..'V4' de useLipSync (respondiendo).
 * @param {string} [props.tier]  'alto'|'medio'|'bajo' (gama baja recorta).
 * @param {Object|null} [props.clima]  passthrough al cuerpo (clima real).
 * @param {string} [props.enso]
 * @param {string} [props.animo]  pisa el ánimo derivado del estado.
 * @param {number} [props.energia]
 * @param {string|null} [props.mundoId]  su herramienta por mundo (PropEnMano).
 * @param {boolean} [props.lineBoil]  contorno que hierve (momentos heroicos).
 * @param {string} [props.title]  pisa la narración aria derivada del estado.
 */
export function Angelita({
  estado = 'acompana',
  confianza = null,
  direccion = 'derecha',
  size = 96,
  className = '',
  animated = true,
  visema = null,
  tier = undefined,
  clima = null,
  enso = 'neutro',
  animo = undefined,
  energia = 1,
  mundoId = null,
  lineBoil = false,
  title = undefined,
  ...rest
}) {
  const e = estadoCanonico(estado);
  const vivo = animated;
  const nivel = nivelDeConfianza(confianza);
  const pose = POSE_DE_ESTADO[e];
  const svgRef = useRef(null);

  /* ═══ RITMO PROPIO DE PARPADEO — una vez al montar: duración y fase con azar
     para que cada instancia parpadee a SU aire (CSS las consume como vars). */
  const [ritmoPropio] = useState(() => ({
    '--agt-blink-dur': `${(4.9 + Math.random() * 1.7).toFixed(2)}s`,
    '--agt-blink-delay': `${(-Math.random() * 5).toFixed(2)}s`,
  }));

  /* ═══ IDLE-CEREBRO (solo acompana) — el reloj con jitter que hojea el
     repertorio de micro-gestos. flota → gesto → flota…; posa encadena
     posada → despega. Gates: animated, estado, tier bajo, reduced-motion. */
  const idleActivo = vivo && e === 'acompana' && tier !== 'bajo';
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
        programar('flota'); // todo gesto vuelve al vuelo sereno
      }, duracionDeMomento(nombre));
    };
    // Arranca al próximo tick (nunca setState síncrono dentro del effect);
    // siempre desde el vuelo sereno, por si quedó un momento viejo colgado.
    timer = window.setTimeout(() => programar('flota'), 0);
    return () => window.clearTimeout(timer);
  }, [idleActivo]);

  /* ═══ LA MIRADA QUE LO RECONOCE — si su puntero/dedo anda cerca, las pupilas
     lo siguen (data-agt-mira='usted' + vars --agt-mx/--agt-my); al quedarse
     quieto ~2s lo suelta y vuelve a sus dardeos naturales. DOM directo vía ref
     (React no administra estos attrs): cero re-renders por mover el mouse. */
  const sigueUsted = vivo && tier !== 'bajo' && ESTADOS_QUE_LO_MIRAN.has(e);
  useEffect(() => {
    const svg = svgRef.current;
    if (!sigueUsted || !svg || prefiereQuietud()) return undefined;
    let raf = 0;
    let soltar = 0;
    let px = 0;
    let py = 0;
    const signo = direccion === 'izquierda' ? -1 : 1; // el espejo voltea la x
    const liberar = () => svg.removeAttribute('data-agt-mira');
    const mirar = () => {
      raf = 0;
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      // Sus ojos viven arriba del centro del lienzo (la cabeza, no el tronco).
      const dx = px - (r.left + r.width / 2);
      const dy = py - (r.top + r.height * 0.4);
      if (Math.hypot(dx, dy) > RADIO_DE_ATENCION) { liberar(); return; }
      // Deflexión de pupila en unidades del viewBox (misma amplitud ~0.55 del
      // dardeo natural); saturada a ~150px — más lejos ya es "mirar hacia allá".
      const mx = Math.max(-1, Math.min(1, dx / 150)) * 0.55 * signo;
      const my = Math.max(-1, Math.min(1, dy / 150)) * 0.42;
      svg.style.setProperty('--agt-mx', `${mx.toFixed(3)}px`);
      svg.style.setProperty('--agt-my', `${my.toFixed(3)}px`);
      svg.setAttribute('data-agt-mira', 'usted');
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
      svg.style.removeProperty('--agt-mx');
      svg.style.removeProperty('--agt-my');
    };
  }, [sigueUsted, direccion]);

  // El estado tiñe el ánimo del cuerpo base (aura/antics) salvo que el host
  // mande el suyo: contenta brilla 'pleno', preocupada se pone 'atento'.
  const animoDelEstado = animo ?? (e === 'contenta' ? 'pleno' : e === 'preocupada' ? 'atento' : 'sereno');
  const aria = title ?? (ARIA_DE_ESTADO[e] + (nivel === 'baja' ? ' (con dudas)' : ''));
  // Clase de animación solo cuando está viva; quieta = opacidad digna inline.
  const cls = (c) => (vivo ? c : undefined);

  /* ═══ CAPA FONDO: el anillo de certeza (confianza) + aro de alerta ═══════ */
  const halo = nivel ? (
    <g aria-hidden="true">
      <circle
        className={`agt-halo-${nivel}`}
        cx="1" cy="-1" r="15"
        fill="none"
        stroke={COLOR_CERTEZA}
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray={nivel === 'media' ? '4.6 3' : nivel === 'baja' ? '1.8 4' : undefined}
        opacity={nivel === 'baja' ? 0.45 : 0.55}
      />
      {/* La duda también se dice: puntos suspensivos junto a su cabeza. */}
      {nivel === 'baja' && (
        <g fill={RH_INK} opacity="0.75">
          <circle className={cls('agt-duda-punto')} cx="15" cy="-7.8" r="0.7" />
          <circle className={cls('agt-duda-punto')} style={{ animationDelay: '-0.7s' }} cx="16.8" cy="-9.4" r="0.6" />
          <circle className={cls('agt-duda-punto')} style={{ animationDelay: '-1.4s' }} cx="18.3" cy="-11.2" r="0.5" />
        </g>
      )}
    </g>
  ) : null;
  // Preocupada: un aro coral late detrás del cuerpo — alerta que se siente,
  // no sirena. (Detrás: nunca compite con la carita.)
  const aroAlerta = e === 'preocupada' ? (
    <circle
      className={cls('agt-alerta')}
      cx="1" cy="-1" r="12.4"
      fill="none" stroke={COLOR_ALERTA} strokeWidth="1.1"
      opacity={vivo ? undefined : 0.3}
      aria-hidden="true"
    />
  ) : null;

  /* ═══ SEÑALES DE CARA (dentro de .agt-cuerpo: se mueven CON ella) ════════
     Coordenadas en el espacio de la abeja: cabeza (8.6,-1) r4.4; ojos en
     (10.1,-1.9) y (7.4,-2.2); las cejas van justo encima. */
  const caraPreocupada = e === 'preocupada' ? (
    <g aria-hidden="true">
      {/* cejas fruncidas: las puntas internas suben — preocupación, no rabia */}
      <g stroke={RH_INK} strokeWidth="0.85" strokeLinecap="round" fill="none">
        <path d="M6.1,-4.5 L8,-5.2" />
        <path d="M9.1,-5.3 L11.4,-4.5" />
      </g>
      {/* gota de sudor que brota de la sien y escurre */}
      <g transform="translate(5.1 -4.4)">
        <path
          className={cls('agt-sudor')}
          d={GOTA_D}
          fill={ABEJA_PALETA.gota}
          stroke={RH_INK}
          strokeWidth="0.35"
          opacity={vivo ? undefined : 0.85}
        />
      </g>
    </g>
  ) : null;
  const caraNoSe = e === 'no-se' ? (
    <g stroke={RH_INK} strokeWidth="0.8" strokeLinecap="round" fill="none" aria-hidden="true">
      {/* una ceja arqueada y la otra tranquila: honestidad curiosa, sin pena */}
      <path d="M5.9,-5.2 Q7.3,-6.1 8.6,-5.3" />
      <path d="M9.5,-4.8 L11.3,-4.7" />
    </g>
  ) : null;

  /* ═══ CAPA AIRE: lo que flota alrededor (burbuja, ondas, signos) ═════════ */
  // PENSANDO — burbuja de pensamiento con colita, tres puntos que laten y los
  // recuerdos de la finca que va hojeando (quieta u en tier bajo: solo el 1º).
  const recuerdosVisibles = vivo ? RECUERDOS : RECUERDOS.slice(0, 1);
  const burbuja = e === 'pensando' ? (
    <g className={cls('agt-burbuja')} aria-hidden="true">
      <circle cx="10.8" cy="-11.6" r="0.85" fill={CREMA_PAPEL} stroke={RH_INK} strokeWidth="0.7" />
      <circle cx="12.2" cy="-14.6" r="1.35" fill={CREMA_PAPEL} stroke={RH_INK} strokeWidth="0.8" />
      <ellipse cx="13.6" cy="-21.4" rx="7" ry="5.6" fill={CREMA_PAPEL} stroke={RH_INK} strokeWidth="1.1" />
      {/* lo que está repasando: la mata, el agua, la flor */}
      <g transform="translate(13.6 -22.8)">
        {recuerdosVisibles.map((Recuerdo, i) => (
          <g key={i} className={cls('agt-recuerdo')} style={vivo ? { animationDelay: `${i * -1.8}s` } : undefined}>
            <Recuerdo />
          </g>
        ))}
      </g>
      {/* el latido del pensar */}
      <g fill={RH_INK}>
        <circle className={cls('agt-piensa-punto')} cx="10.9" cy="-18.4" r="1" />
        <circle className={cls('agt-piensa-punto')} style={{ animationDelay: '0.22s' }} cx="13.6" cy="-18.4" r="1" />
        <circle className={cls('agt-piensa-punto')} style={{ animationDelay: '0.44s' }} cx="16.3" cy="-18.4" r="1" />
      </g>
    </g>
  ) : null;
  // ESCUCHANDO — la voz de usted entra en ondas de tinta, hacia ella.
  const ondasIn = e === 'escuchando' ? (
    <g stroke={COLOR_VOZ_HUMANA} strokeWidth="1" strokeLinecap="round" fill="none" aria-hidden="true">
      {[0, -2.8, -5.4].map((dx, i) => (
        <path
          key={i}
          className={cls('agt-onda-in')}
          style={vivo ? { animationDelay: `${i * -0.63}s` } : undefined}
          opacity={vivo ? undefined : 0.4}
          d={`M${-15.8 + dx},-6.4 q2.8,4.9 0,10.6`}
        />
      ))}
    </g>
  ) : null;
  // RESPONDIENDO — su voz sale en ondas de miel, desde la boquita.
  const ondasOut = e === 'respondiendo' ? (
    <g stroke={COLOR_VOZ_MIEL} strokeWidth="1.05" strokeLinecap="round" fill="none" aria-hidden="true">
      {[0, 2.3, 4.6].map((dx, i) => (
        <path
          key={i}
          className={cls('agt-onda-out')}
          style={vivo ? { animationDelay: `${i * -0.53}s` } : undefined}
          opacity={vivo ? undefined : 0.4}
          d={`M${14.4 + dx},-2.4 q2.9,4 0,8.2`}
        />
      ))}
    </g>
  ) : null;
  // CONTENTA — chispas de polen dorado que estallan al compás del brinco.
  const CHISPAS_POS = [[-11.5, -8.5], [13, -12], [16.5, 2.5], [-13.5, 3.5], [-3, -13.5], [9.5, 11.5]];
  const chispas = e === 'contenta' ? (
    <g fill={COLOR_CERTEZA} stroke={RH_INK} strokeWidth="0.3" aria-hidden="true">
      {CHISPAS_POS.map(([x, y], i) => (
        <path
          key={i}
          className={cls('agt-chispa')}
          style={vivo ? { animationDelay: `${i * -0.19}s` } : undefined}
          opacity={vivo ? undefined : 0.55}
          transform={`translate(${x} ${y}) scale(${0.8 + (i % 3) * 0.25})`}
          d={CHISPA_D}
        />
      ))}
    </g>
  ) : null;
  // NO-SÉ — el "?" dibujado a mano, con wobble de line-boil (steps, no péndulo).
  // Al entrar al estado se DIBUJA de un trazo (pathLength=1 + dashoffset en el
  // CSS) y el puntico cae al final — honestidad que se escribe delante de usted.
  const signoNoSe = e === 'no-se' ? (
    <g className={cls('agt-nose-signo')} aria-hidden="true">
      <path
        pathLength="1"
        d="M11.8,-19.2 Q11.7,-22 14.3,-21.8 Q16.6,-21.5 15.9,-19.3 Q15.5,-18 14.2,-17.4 Q13.5,-17 13.5,-15.9"
        stroke={RH_INK} strokeWidth="1.25" fill="none" strokeLinecap="round"
      />
      <circle cx="13.5" cy="-13.8" r="0.85" fill={RH_INK} />
    </g>
  ) : null;
  // La MOTA DE VILANO que la distrae (momento 'distraida' del idle): cruza el
  // aire una sola vez y Angelita la despide con los ojos y la cabeza (CSS).
  const mota = (vivo && e === 'acompana' && momento === 'distraida')
    ? <MotaDeVilano />
    : null;
  // SEÑALA — el destello donde apunta (abajo-derecha, donde cae su bracito).
  const destelloPoi = e === 'senala' ? (
    <g
      className={cls('agt-poi')}
      transform="translate(16 10.5)"
      opacity={vivo ? undefined : 0.7}
      aria-hidden="true"
    >
      <circle r="2.9" fill="none" stroke={COLOR_CERTEZA} strokeWidth="0.7" opacity="0.7" />
      <path d={CHISPA_D} fill={COLOR_CERTEZA} stroke={RH_INK} strokeWidth="0.35" />
    </g>
  ) : null;
  // INVITA — estelas del "venga": arcos que viajan HACIA ella.
  const estelasInvita = e === 'invita' ? (
    <g stroke={COLOR_VOZ_MIEL} strokeWidth="0.95" strokeLinecap="round" fill="none" aria-hidden="true">
      {[0, 2.4].map((dx, i) => (
        <path
          key={i}
          className={cls('agt-venga-onda')}
          style={vivo ? { animationDelay: `${i * -0.7}s` } : undefined}
          opacity={vivo ? undefined : 0.4}
          d={`M${16.4 + dx},-3.2 q-2.2,3.4 0,6.6`}
        />
      ))}
    </g>
  ) : null;

  /* ═══ MONTAJE ═════════════════════════════════════════════════════════════
     fondo (halo/alerta) → vuelo (la física: deriva, aterrizaje, entrada de
     estado) → cuerpo (abeja + señales de cara, UN wrapper que los estados
     mueven junto) → aire (burbuja, ondas, chispas, signos, la mota).
     `.agt-vuelo` va con key=estado: al cambiar de estado se REMONTA y su
     animación de entrada (anticipación → overshoot → asienta) vuelve a correr
     — la transición fluye en vez de saltar. direccion 'izquierda' espeja TODO
     el dibujo (señala/invita hacia el otro lado); el ritmo propio de parpadeo
     viaja como CSS vars. */
  const espejo = direccion === 'izquierda' ? { transform: 'scaleX(-1)' } : null;
  const estilo = { ...ritmoPropio, ...espejo };
  return (
    <svg
      ref={svgRef}
      viewBox={VIEWBOX}
      width={size}
      height={size}
      className={className ? `agt-angelita ${className}` : 'agt-angelita'}
      style={estilo}
      role="img"
      aria-label={aria}
      data-agente="angelita"
      data-agt-estado={e}
      data-agt-vivo={vivo ? '1' : undefined}
      data-agt-idle={idleActivo ? momento : undefined}
      data-agt-confianza={nivel || undefined}
      data-tier={tier || undefined}
      {...rest}
    >
      <title>{aria}</title>
      {halo}
      {aroAlerta}
      <g className="agt-vuelo" key={e}>
        <g className="agt-cuerpo">
          <AbejaAngelita
            inline
            animated={vivo}
            pose={pose}
            visema={visema}
            tier={tier}
            clima={clima}
            enso={enso}
            animo={animoDelEstado}
            energia={energia}
            mundoId={mundoId}
            lineBoil={lineBoil}
          />
          {caraPreocupada}
          {caraNoSe}
        </g>
      </g>
      {burbuja}
      {ondasIn}
      {ondasOut}
      {chispas}
      {signoNoSe}
      {destelloPoi}
      {estelasInvita}
      {mota}
    </svg>
  );
}

export default Angelita;
