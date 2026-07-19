import { useId, useRef } from 'react';
import './creatures.css';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, Miembro, RH_INK } from './_rubberhose.jsx';
import {
  OSO_ANTEOJOS_PALETA, OSO_ANTEOJOS_PROPORCION, OSO_ANTEOJOS_SLUG, PERFIL_OSO_ANTEOJOS,
} from './osoAnteojosIdentidad.js';
import { cuerpoDeClima, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Oso de anteojos — Tremarctos ornatus, EN SU VERSIÓN BUENA: NEGRO BIOPUNK
   (la dirección aprobada por el operador en el selector del guardián —
   dashboard/GuardianEspiritu → AvatarOso). Hermano rubber-hose de Angelita y
   el jaguar: compone el MISMO kit `_rubberhose.jsx` y hereda la MISMA fundación
   transversal — lip-sync (BocaVisema), modo poder (transformacion, aura MENTA),
   ropa por clima (ropaDeClima, perfil de páramo), prop por mundo (PropEnMano) y
   line-boil — cero código duplicado. NO es el oso café (OsoAndino.jsx,
   archivado): mismo animal, otra dirección de arte.

   LA FIRMA (que lea inequívoco como oso de anteojos): pelaje AZABACHE AZULADO
   con brillo de luna en el lomo (gradiente radial, técnica del jaguar) y los
   ANTEOJOS — dos AROS crema-blancos LUMINOSOS alrededor de los ojos, SEPARADOS
   por el puente oscuro del pelaje (nunca antifaz), ASIMÉTRICOS como en el
   animal real (patrón único por individuo): el derecho se abre por abajo y
   DERRAMA una lágrima de crema hacia el hocico, camino de la media luna del
   pecho. Hocico CORTO tan claro, orejas redondas de peluche, cuerpo MACIZO
   plantígrado con garras chiquitas dibujadas en las plantas.

   CARÁCTER: gigante GENTIL — casi herbívoro (bromelias, frutos), tímido y
   noble. Impone respeto por su MOLE (la más ancha de la familia, sombra de
   suelo con peso, squash&stretch LENTO — la masa asienta despacio), jamás por
   amenaza: ojos grandes con alma dentro de los aros, cachetes, sonrisa mansa,
   cejas claras serenas. Sus gestos-firma son los del oso de la casa: RESOPLA
   (vaho por la trufa, huff pesado) y RASCA (la panza con la zarpa, entrañable).

   BIOPUNK SUTIL (como el jaguar místico — medido, nada kitsch): rim-light
   menta tenue en la silueta, los aros de los anteojos RESPIRAN su brillo
   despacio, y ESPORAS del bosque nublado flotan lento a su alrededor
   (bioluminiscencia de niebla, no neón de discoteca). Todo se PODA en tier
   bajo / reduced-motion (queda un fotograma digno y quieto). */
const VIEWBOX = '-16 -20 32 40';

/* GARRAS del plantígrado: tres uñitas cortas asomando del borde de la planta.
   Chiquitas y romas (identidad de especie, cero amenaza). Decorativas. */
function Garras({ x, y, color, lado = 1 }) {
  return (
    <g aria-hidden="true" stroke={color} strokeWidth="0.5" strokeLinecap="round">
      <path d={`M${x - 1.1 * lado},${y} l${-0.25 * lado},1.0`} />
      <path d={`M${x},${y + 0.25} l0,1.05`} />
      <path d={`M${x + 1.1 * lado},${y} l${0.25 * lado},1.0`} />
    </g>
  );
}

/* ESPORAS del bosque nublado — la bioluminiscencia que flota lento alrededor
   de la mole (polvo de niebla viva). Cada una con delay/duración propios
   (nunca en compás — vida, no metrónomo). Misma gramática que las motas del
   jaguar, keyframes propios (osoa-mota). */
const ESPORAS = [
  { cx: -11.4, cy: -3.6, r: 0.5, d: 0, s: 6.8 },
  { cx: 11.8, cy: 0.8, r: 0.42, d: -2.3, s: 7.4 },
  { cx: -9.2, cy: 8.6, r: 0.36, d: -3.8, s: 5.9 },
  { cx: 9.8, cy: -8.4, r: 0.46, d: -1.4, s: 6.3 },
  { cx: -12.6, cy: 2.8, r: 0.32, d: -4.9, s: 7.9 },
];

export function OsoAnteojos({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Oso de anteojos',
  /* Pose de VIDA (idle-life), species-agnostic (gestos rh-g-* de creatures.css):
     'anda' (base) | 'celebra' (brinca con brazos en V) | 'reposo' (se sienta a
     respirar hondo) | 'señala' (se inclina al POI y apunta con la zarpa). Solo
     corren viva (animated); con animated=false o reduced-motion queda en
     fotograma digno. */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil de páramo). Sin clima (avatares,
     catálogo) = neutro digno: el oso se ve EXACTO como siempre. */
  clima = null,
  enso = 'neutro',
  /* Lip-sync transversal (useLipSync → visema 'V1'..'V4'). Sin visema = la
     sonrisa mansa de siempre. */
  visema = null,
  /* Vestuario por clima+hora (opt-in): RUANA de noche/frío del páramo. Es de
     páramo: NUNCA sombrero ni sudor (se suprimen aunque suba el termómetro). */
  vestuario = false,
  tempC = undefined,
  /* RESOPLA (opt-in): vaho por la trufa + huff pesado del cuerpo. El gesto-firma
     del oso cuando refunfuña — en este oso es un refunfuño TIERNO. */
  resopla = false,
  /* RASCA (opt-in): se rasca la panza con la zarpa derecha, pausado y
     entrañable. */
  rasca = false,
  /* VIDA PROPIA (idle-cerebro v2, vara Angelita): default ON. Reusa el
     repertorio 'oso-andino' de vidaEstados.js (MISMA especie, mismo
     temperamento lento: resopla/rasca/reposo) — cero filas duplicadas. */
  vida = true,
  /* Device-tier: 'bajo' apaga el idle continuo; quedan los estados reactivos. */
  tier,
  /* Line-boil (opt-in, capa cara): el contorno hierve ~8fps — reservado para
     su entrada heroica. */
  lineBoil = false,
  /* MODO PODER (opt-in, standalone): aura MENTA bioluminiscente de 4 capas
     (transformacion.css) — NO hereda el rojo del oso café. */
  poder = false,
  /* Prop por mundo (opt-in): la herramienta del mundo en su zarpa izquierda. */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const pelaje = `crt-pelaje-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.1, Math.min(0.3, 0.12 + 0.18 * (energia ?? 1)));
  const auraR = 9 + 1.6 * (energia ?? 1);

  // ═══ VIDA PROPIA (idle-cerebro + ritmo propio + mirada — vara Angelita v2).
  // Repertorio 'oso-andino' de vidaEstados.js: MISMA especie (Tremarctos), el
  // temperamento lento del oso ya está afinado ahí — no se duplica la fila.
  const raizRef = useRef(null);
  const ritmoPropio = useRitmoPropio();
  const enBase = pose === 'anda' && !resopla && !rasca && !visema;
  const momento = useVidaIdle('oso-andino', vida && vivo && tier !== 'bajo' && enBase);
  useMiradaUsted(raizRef, vida && vivo && tier !== 'bajo');
  const resoplaFx = resopla || momento === 'resopla';
  const rascaFx = rasca || momento === 'rasca';
  const poseFx = momento === 'reposo' ? 'reposo' : pose;

  // CLIMA → cuerpo (determinista): tinte + opacidad al contorno. Sin alas.
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_OSO_ANTEOJOS });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // Vestuario por clima+hora (opt-in). Perfil de PÁRAMO: reusa la fila
  // 'oso-andino' de ROPA_PERFIL_POR_BICHO (misma especie, mismos umbrales:
  // frioC 4, no suda) — sin duplicar la fila compartida. Sombrero/sudor
  // suprimidos SIEMPRE (el oso de páramo no se acalora).
  const ropaBase = (vestuario && clima) ? ropaDeClimaBicho('oso-andino', clima, { tempC }) : null;
  const ropa = ropaBase ? { ...ropaBase, sombrero: false, sudor: false } : null;

  const P = OSO_ANTEOJOS_PALETA;
  const PR = OSO_ANTEOJOS_PROPORCION;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* PELAJE CON VOLUMEN (técnica del jaguar): gradiente radial del pelaje
          negro — luz de luna azulada en el lomo → azabache medio → sombra
          ventral casi negra. El mismo def viste tronco y cabeza. */}
      <radialGradient id={pelaje} cx="42%" cy="28%" r="85%">
        <stop offset="0%" stopColor={P.cuerpoLuz} />
        <stop offset="52%" stopColor={P.cuerpo} />
        <stop offset="100%" stopColor={P.cuerpoSombra} />
      </radialGradient>
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // VAHO del resoplido: dos motas claras que salen de la trufa y se disuelven.
  // CSS (crt-vaho-mota) las anima; con animated=false / RM quedan dignas.
  const vaho = resoplaFx ? (
    <g className="crt-vaho" fill={P.pecho} aria-hidden="true" opacity="0.7">
      <circle className={vivo ? 'crt-vaho-mota' : undefined} cx="2.6" cy="-4.2" r="1.1" />
      <circle className={vivo ? 'crt-vaho-mota' : undefined} style={{ animationDelay: '-0.7s' }} cx="3.6" cy="-3.0" r="0.85" />
    </g>
  ) : null;

  // PROP DEL MUNDO en la zarpa izquierda (el lado libre).
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={-11.8} y={8.2} escala={0.74} ink={RH_INK} animated={vivo} />
  ) : null;

  // ── CUERPO rubber-hose (atrás→adelante): sombra de suelo, aura menta,
  //    orejas, patas traseras, tronco-mole con rim-light + media luna del
  //    pecho, brazos con garras, cabeza (anteojos luminosos + derrame + cejas +
  //    ojos/cachetes/boca + hocico corto). `.crt-body` squashea con oso-boil
  //    (LENTO y PESADO — la masa asienta despacio; CSS aditivo por slug).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* SOMBRA DE SUELO — el peso de la mole (un animal con masa, no un
          sticker). Estática. */}
      <ellipse cx="0" cy="13.4" rx="9.2" ry="1.6" fill={P.sombraSuelo}
        filter={`url(#${blur})`} aria-hidden="true" />
      {/* aura viva MENTA tenue (la bioluminiscencia de niebla, no neón) */}
      <circle cx="0" cy="2" r={auraR} fill={P.menta} opacity={auraOp * 0.55} filter={`url(#${blur})`} />

      {/* orejas redondas de peluche (detrás de la cabeza, follow-through) */}
      <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: '-0.2s' }}>
        <circle cx="-4.9" cy="-13.8" r={PR.orejaR} fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.2" />
        <circle cx="-4.9" cy="-13.8" r={PR.orejaR * 0.5} fill={P.oreja} />
      </g>
      <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: '-0.5s' }}>
        <circle cx="4.9" cy="-13.8" r={PR.orejaR} fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.2" />
        <circle cx="4.9" cy="-13.8" r={PR.orejaR * 0.5} fill={P.oreja} />
      </g>

      {/* patas traseras del plantígrado sentado: muslos ANCHOS con planta
          crema-fría grande (asienta el peso). Se mecen suave. */}
      <Miembro d="M-6.8,7.6 C-8.8,9.6 -9.0,11.2 -7.6,12.4" ancho={3.8} punta={[-7.6, 12.6]} puntaR={2.3} pie sway={vivo} delay={-0.7} glove={P.planta} />
      <Miembro d="M6.8,7.6 C8.8,9.6 9.0,11.2 7.6,12.4" ancho={3.8} punta={[7.6, 12.6]} puntaR={2.3} pie sway={vivo} delay={-1.0} glove={P.planta} />

      {/* TRONCO-MOLE azabache (el más ancho de la familia) con el gradiente de
          pelaje (luz de luna → sombra) y la línea de tinta que manda. El halo
          menta va en el drop-shadow: rim bioluminiscente MEDIDO. */}
      <ellipse cx="0" cy="2.4" rx={PR.troncoRx} ry={PR.troncoRy}
        fill={`url(#${pelaje})`} stroke={RH_INK} strokeWidth="1.4"
        style={{ filter: `drop-shadow(0 0 7px ${P.cuerpoGlow})` }} />
      {/* RIM-LIGHT menta de la silueta (del avatar aprobado: el borde vivo).
          Tenue y estático — biopunk sutil, no contorno neón. */}
      <ellipse cx="0" cy="2.4" rx={PR.troncoRx - 0.5} ry={PR.troncoRy - 0.5}
        fill="none" stroke={P.menta} strokeWidth="0.7" opacity="0.22" aria-hidden="true" />
      {/* BRILLO del pelaje negro (que se vea RICO, no plano): el lametón de luz
          fría sobre el lomo. */}
      <path d="M-7.6,-3.2 C-3.6,-6.4 3.2,-6.6 7.2,-3.8" fill="none"
        stroke={P.cuerpoLuz} strokeWidth="1.5" strokeLinecap="round" opacity="0.55" aria-hidden="true" />

      {/* MEDIA LUNA CREMA del pecho — la marca clara que baja de la garganta
          (el "collar" del oso de anteojos, continuación del patrón de la cara).
          Del avatar aprobado: nítida contra el pelaje negro. */}
      <path d="M-3.2,-4.4 C-1.2,-1.6 1.2,-1.6 3.2,-4.4 C2.6,2.2 2.0,5.4 0,5.8 C-2.0,5.4 -2.6,2.2 -3.2,-4.4 Z"
        fill={P.pecho} opacity="0.92" stroke={P.pechoSombra} strokeWidth="0.4" />

      {/* brazos manguera MACIZOS con planta crema-fría y GARRAS chiquitas,
          pivote en el HOMBRO (gestos celebra/señala/rasca los alzan de ahí).
          El derecho (crt-brazo-r) es el que rasca la panza. */}
      <Miembro clase="crt-brazo-l" origen="right top"
        d="M-7.6,-1.2 C-10.8,0.6 -11.8,3.6 -10.8,6.4" ancho={3.6} punta={[-10.8, 6.8]} puntaR={2.3} pie sway={vivo} delay={-0.15} glove={P.planta} />
      <Garras x={-10.8} y={7.6} color={P.garra} lado={-1} />
      <Miembro clase="crt-brazo-r" origen="left top"
        d="M7.6,-1.2 C10.8,0.6 11.8,3.6 10.8,6.4" ancho={3.6} punta={[10.8, 6.8]} puntaR={2.3} pie sway={vivo} delay={-0.45} glove={P.planta} />
      <Garras x={10.8} y={7.6} color={P.garra} lado={1} />

      {/* CABEZA grande azabache con el mismo pelaje-gradiente + rim menta */}
      <circle cx="0" cy="-8.4" r={PR.cabezaR} fill={`url(#${pelaje})`} stroke={RH_INK} strokeWidth="1.4" />
      <circle cx="0" cy="-8.4" r={PR.cabezaR - 0.5} fill="none"
        stroke={P.menta} strokeWidth="0.6" opacity="0.18" aria-hidden="true" />

      {/* HOCICO CORTO tan claro (rompe la silueta hacia abajo — el morro real
          del oso, más oscuro que los anteojos para que la cara no sea una
          mancha pálida única). Se dibuja antes de trufa/boca. */}
      <path d="M-3.4,-4.8 C-3.7,-2.3 -2.1,-1.1 0,-1.1 C2.1,-1.1 3.7,-2.3 3.4,-4.8 C2.6,-6.5 -2.6,-6.5 -3.4,-4.8 Z"
        fill={P.hocico} stroke={RH_INK} strokeWidth="1.0" strokeLinejoin="round" />
      <path d="M-2.6,-5.6 C-1.0,-6.2 1.0,-6.2 2.6,-5.6" fill="none"
        stroke={P.hocicoSombra} strokeWidth="0.5" opacity="0.6" aria-hidden="true" />

      {/* ═══ ANTEOJOS — LA FIRMA. Dos AROS crema-blancos LUMINOSOS alrededor de
          los ojos, SEPARADOS por el puente oscuro del pelaje (nunca antifaz).
          ASIMÉTRICOS como en el animal real (patrón único por individuo): el
          IZQUIERDO casi cierra; el DERECHO se abre por abajo (dasharray) y
          DERRAMA una lágrima de crema por el borde del hocico, camino del
          pecho. Cada aro lleva su halo que RESPIRA despacio (osoa-anteojo-
          brillo — la bioluminiscencia medida). */}
      {/* halos que respiran (detrás del trazo del aro) */}
      <g className={vivo ? 'osoa-anteojo-brillo' : undefined} filter={`url(#${blur})`} aria-hidden="true"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <circle cx="-3.1" cy="-9.9" r="2.6" fill={P.anteojoGlow} opacity="0.3" />
        <circle cx="3.1" cy="-9.9" r="2.6" fill={P.anteojoGlow} opacity="0.3" />
      </g>
      {/* el aro izquierdo: casi cerrado (abre un pelito abajo-afuera) */}
      <ellipse cx="-3.1" cy="-9.9" rx="2.3" ry="2.6" fill="none"
        stroke={P.anteojo} strokeWidth="1.15" strokeLinecap="round"
        strokeDasharray="12.2 3.0" strokeDashoffset="-4.6" transform="rotate(-12 -3.1 -9.9)"
        style={{ filter: `drop-shadow(0 0 3px ${P.anteojoGlow})` }} />
      {/* el aro derecho: abierto por abajo (el patrón derrama) */}
      <ellipse cx="3.1" cy="-9.9" rx="2.3" ry="2.6" fill="none"
        stroke={P.anteojo} strokeWidth="1.15" strokeLinecap="round"
        strokeDasharray="10.6 4.6" strokeDashoffset="-11.8" transform="rotate(12 3.1 -9.9)"
        style={{ filter: `drop-shadow(0 0 3px ${P.anteojoGlow})` }} />
      {/* la LÁGRIMA del patrón: crema que baja del aro derecho por el borde del
          hocico hacia la garganta (la conexión anteojo→pecho del animal real) */}
      <path d="M4.6,-8.2 C5.2,-6.4 4.8,-4.6 3.7,-3.2" fill="none"
        stroke={P.anteojo} strokeWidth="0.95" strokeLinecap="round" opacity="0.85" aria-hidden="true" />

      {/* CEJAS serenas del gigante gentil: pelo claro que agarra la luz (la
          tinta oscura se perdería en el pelaje negro). Grupo .oso-cejas —
          respira apenas y se frunce TIERNO al resoplar (CSS compartido). */}
      <g className="oso-cejas" stroke={P.ceja} strokeWidth="1.0" strokeLinecap="round" fill="none" opacity="0.75">
        <path d="M-4.9,-12.9 C-3.8,-13.5 -2.4,-13.4 -1.6,-12.9" />
        <path d="M4.9,-12.9 C3.8,-13.5 2.4,-13.4 1.6,-12.9" />
      </g>

      {/* chapetas — el rubor del gigante tímido, en menta suave (el coral de la
          familia se pierde sobre el azabache; el rubor frío es de la casa
          biopunk) */}
      <Cachetes puntos={[{ cx: -5.4, cy: -6.0, r: 1.15 }, { cx: 5.4, cy: -6.0, r: 1.15 }]}
        color="#67d9b8" vivo={vivo} />

      {/* trufa con brillito + surco del morro */}
      <ellipse cx="0" cy="-5.4" rx="1.7" ry="1.25" fill={P.trufa} />
      <ellipse cx="-0.55" cy="-5.85" rx="0.5" ry="0.34" fill={P.pecho} opacity="0.65" />
      <path d="M0,-4.2 L0,-3.4" stroke={RH_INK} strokeWidth="0.7" strokeLinecap="round" />

      {/* boca mansa (voz grave y amable): lip-sync si hay visema; si no, la
          sonrisa tímida de goma. */}
      {visema
        ? <BocaVisema cx={0} cy={-3.3} w={3.4} prof={1.3} visema={visema} />
        : <Sonrisa cx={0} cy={-3.4} w={3.0} prof={1.1} />}

      {/* OJOS grandes con alma DENTRO de los aros (kit de la casa: pupila
          grande + catchlight + parpadeo + mirada que sigue). La nobleza vive
          en el ojo: mirada mansa, jamás de susto ni amenaza. */}
      <OjosRubber
        ojos={[{ cx: -3.1, cy: -9.8, r: 1.6 }, { cx: 3.1, cy: -9.8, r: 1.6 }]}
        mirar={[0, 0.16]}
        parpadea={vivo}
      />

      {/* Vestuario por clima+hora (RUANA de noche/frío del páramo). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 2.4, rx: PR.troncoRx, ry: PR.troncoRy }}
          cabeza={{ cx: 0, cy: -8.4, r: PR.cabezaR }}
          animated={vivo}
        />
      )}

      {/* Prop del mundo en la zarpa (entra con su herramienta). */}
      {propMundo}

      {/* Vaho del resoplido (el refunfuño tierno). */}
      {vaho}

      {/* ESPORAS del bosque nublado — bioluminiscencia que flota lento
          alrededor de la mole. Quietas y tenues con animated=false / RM /
          tier bajo. */}
      <g aria-hidden="true" fill={P.espora}>
        {ESPORAS.map((m, i) => (
          <circle key={i} className={vivo ? 'osoa-mota' : undefined}
            cx={m.cx} cy={m.cy} r={m.r} opacity="0.3"
            style={vivo ? { animationDelay: `${m.d}s`, animationDuration: `${m.s}s` } : undefined} />
        ))}
      </g>
    </g>
  );

  // Antics de VIDA (períodos co-primos) SOLO viva; nodos aparte para no pisar
  // el boil de `.crt-body`. El CSS los apaga con RM / tier bajo / gestos.
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;
  // Line-boil (contorno que hierve) envuelve TODO el dibujo cuando se pide.
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': OSO_ANTEOJOS_SLUG,
    'data-pose': vivo ? poseFx : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-mojado': ropa?.mojado ? '1' : undefined,
    'data-resopla': resoplaFx ? '1' : undefined,
    'data-rasca': rascaFx ? '1' : undefined,
    'data-vida': momento || undefined,
    'data-lineboil': lineBoil ? '1' : undefined,
    'data-prop': mundoId || undefined,
  };
  // El ritmo propio (parpadeo/dardeo por instancia) viaja como vars CSS.
  const estiloRaiz = { ...ritmoPropio, ...estiloClima };

  if (inline) {
    // En modo inline el power-up lo pone el host DOM (::before/mix-blend no
    // aplican a SVG); acá solo marcamos data-poder por si el host lo consulta.
    return (
      <g ref={raizRef} className={className} style={estiloRaiz} data-poder={poder ? '1' : undefined} {...estadoAttrs}>
        {defs}
        {cuerpoVivo}
      </g>
    );
  }
  const svg = (
    <svg ref={raizRef} viewBox={VIEWBOX} width={size} height={size} className={className} style={estiloRaiz}
      role="img" aria-label={title} {...estadoAttrs} {...rest}>
      <title>{title}</title>
      {defs}
      {cuerpoVivo}
    </svg>
  );
  // MODO PODER (standalone): aura MENTA bioluminiscente de 4 capas
  // (transformacion.css). El wrapper DOM lleva ::before/mix-blend/corrientes.
  if (poder) {
    return (
      <span
        className="is-powered-up osoa-poder"
        data-creature-poder={OSO_ANTEOJOS_SLUG}
        style={{ '--aura-color': auraDeBicho(OSO_ANTEOJOS_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default OsoAnteojos;
