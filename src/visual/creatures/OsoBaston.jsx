import { useId, useRef } from 'react';
import './creatures.css';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { CreatureFilters } from './_filters.jsx';
import { BocaVisema } from './_rubberhose.jsx';
import {
  OSO_BASTON_PALETA, OSO_BASTON_PROPORCION, OSO_BASTON_SLUG,
  OSO_BASTON_TINTA, PERFIL_OSO_BASTON,
} from './osoBastonIdentidad.js';
import { cuerpoDeClima } from './creatureClimaCuerpo.js';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* EL OSO DEL BASTÓN — Tremarctos ornatus, EL CAMINANTE DE LOS ANDES.
   PIEL DEFINITIVA: la LÁMINA del operador (`public/compai/laminas/oso.png`)
   revectorizada a paths SVG — el oso andino realista y bonito, con su antifaz
   crema-plata fiero, la V rasgada del pecho, la musculatura del caminante y
   las ZARPAS PLANTÍGRADAS desnudas de garras largas. Las botas y los guantes
   de goma de la primera versión eran cartoon y SE RETIRARON: la lámina manda
   (orden del operador, misma vara que el jaguar Humboldt vectorial).

   ── EL ESQUELETO DE HUESOS (grupos SVG = huesos, jerarquía real) ────────────
   Mismo lenguaje que el rig rubber-hose de la casa (~/demos/guias-rig):
     crt-body (pelvis/raíz)
       ├─ .osb-pierna-i / .osb-pierna-d  (cadera→muslo→zarpa plantígrada)
       └─ .osb-columna                    (la columna: se inclina SOLA)
            ├─ tronco (piel de la lámina: hombros/pecho/panza/V)
            ├─ .crt-brazo-l               (hombro→bíceps→zarpa en jarra)
            ├─ .osb-cuello                (gola CONTINUA: el no-decapitable)
            ├─ .osb-cabeza-mira           (wrapper ADITIVO: sigue al usuario)
            │    └─ .osb-cabeza           (gesto: nod/ladeo/take)
            │         └─ .osb-hocico      (hueso propio: husmea, habla)
            └─ .crt-brazo-r               (hombro→zarpa que empuña + bastón)
   La cabeza GIRA SOBRE EL CUELLO sin costura: la gola es DIBUJO CONTINUO
   bajo el cráneo (solape ≥2.2 unidades) — patrón cabezaMira del jaguar
   vectorial aprobado, jamás se decapita.

   ── 70/30 (spec compai): modo 'normal' | 'actuando' ────────────────────────
   El 70% del tiempo el oso es EL DE LA LÁMINA: digno, quieto o caminando
   plantígrado con squash sutil al pisar. El 30% — cuando habla, piensa,
   florece, celebra, aparece — se vuelve ACTUADO rubber-hose Miss Minutes:
   anticipación, squash&stretch y overshoot exagerados SOBRE LOS HUESOS
   (curvas canónicas de rubberhoseSpec.js), la piel no cambia. La prop `modo`
   fuerza cualquiera de los dos; sin prop se decide sola: gesto/habla →
   actuando, resto → normal. El CSS vive en creatures.css bajo [data-modo].

   Fundación transversal INTACTA (cero código duplicado): kit rubber-hose
   (OjosRubber/Cachetes/BocaVisema), vida propia (useVidaIdle + ritmo propio +
   useMiradaUsted), clima→cuerpo, line-boil, prop por mundo, modo poder (aura
   VERDE del bastón) y el BASTÓN FLORECIDO completo con su botánica nombrada
   (Espeletia grandiflora + Cattleya trianae — ver osoBastonIdentidad). */
const VIEWBOX = '-17 -22 34 42';

/* ═══ EL TRONCO DE LA LÁMINA — la musculatura del caminante, no un costal:
   trapecio→HOMBROS ANCHOS (lo más ancho arriba, como en el PNG), pectorales,
   dorsal que baja, la panza amable y la cadera que recoge. El borde es liso;
   los mechones de pelo van como trazos encima (patrón del jaguar piloto). */
const SILUETA_TRONCO =
  'M -3.9,-7.9 '
  + 'C -7.0,-7.7 -9.4,-6.7 -10.2,-4.9 '  // trapecio ALTO y ANCHO (la mole arriba)
  + 'C -10.8,-3.3 -10.4,-1.7 -9.2,-0.7 ' // deltoides/pectoral macizos
  + 'C -8.6,1.0 -7.7,2.6 -6.6,4.0 '      // el flanco RECOGE FUERTE en V
  + 'C -5.7,5.8 -4.3,7.1 -2.4,7.6 '      // cadera CORTA y recogida (sin globo)
  + 'C -0.85,7.95 0.85,7.95 2.4,7.6 '
  + 'C 4.3,7.1 5.7,5.8 6.6,4.0 '
  + 'C 7.7,2.6 8.6,1.0 9.2,-0.7 '
  + 'C 10.4,-1.7 10.8,-3.3 10.2,-4.9 '
  + 'C 9.4,-6.7 7.0,-7.7 3.9,-7.9 '
  + 'C 1.35,-8.15 -1.35,-8.15 -3.9,-7.9 Z'; // el cuello nace aquí (lo tapa la gola)

/* LA V RASGADA del pecho — el babero pectoral de ESTE individuo tal como lo
   trae la lámina: dos relámpagos crema que caen del cuello y se parten en
   mechones (el patrón de Tremarctos varía por oso; éste es una V de rayo). */
const V_PECHO =
  'M -2.9,-6.1 '
  + 'L -2.0,-4.7 L -2.7,-4.5 L -1.4,-2.7 L -1.9,-2.6 L -0.8,-0.8 '  // rayo izq
  + 'L -0.6,-2.3 L -0.2,-1.4 L 0.1,-3.2 '                           // el valle
  + 'L 0.6,-1.7 L 0.9,-2.9 L 1.5,-1.5 L 1.9,-3.0 L 1.3,-3.2 '      // rayo der
  + 'L 2.5,-4.8 L 1.8,-4.9 L 2.8,-6.2 '
  + 'C 1.2,-6.9 -1.3,-6.9 -2.9,-6.1 Z';

/* LA GOLA — el pelaje denso del cuello, DIBUJO CONTINUO bajo el cráneo: es el
   hueso-cuello visible. El cráneo la solapa ≥2.2 unidades; cuando la cabeza
   se desplaza (mirausted) o cabecea (gestos), esta masa RESPALDA el giro y no
   se abre fondo — el anti-decapitación del jaguar vectorial, aquí de frente.
   El borde bajo es de mechones (pelo, no recorte). */
const GOLA =
  'M -5.9,-5.4 '
  + 'C -6.2,-7.8 -4.8,-9.9 -2.8,-10.7 '
  + 'C -0.9,-11.4 0.9,-11.4 2.8,-10.7 '
  + 'C 4.8,-9.9 6.2,-7.8 5.9,-5.4 '
  + 'L 4.9,-5.9 L 4.1,-5.0 L 3.1,-6.0 L 2.0,-5.1 L 1.0,-6.1 '  // mechones
  + 'L 0,-5.2 L -1.0,-6.1 L -2.0,-5.1 L -3.1,-6.0 L -4.1,-5.0 L -4.9,-5.9 Z';

/* ═══ ZARPA PLANTÍGRADA (`s`: -1 izquierda, +1 derecha) — el pie DESNUDO de
   la lámina: planta ancha asentada, punta hacia afuera, empeine con su luz y
   CUATRO GARRAS largas curvas al frente. Nada de botas. */
function ZarpaPie({ s, P, INK }) {
  const x = (v) => (s * v).toFixed(2);
  return (
    <g>
      {/* la masa del pie (talón adentro, dedos afuera) — GRANDE y plantada */}
      <path d={
        `M ${x(2.2)},13.8 `
        + `C ${x(1.8)},15.3 ${x(2.4)},16.6 ${x(4.1)},17.2 `
        + `C ${x(6.0)},17.85 ${x(8.4)},17.5 ${x(9.3)},16.4 `
        + `C ${x(9.9)},15.6 ${x(9.4)},14.7 ${x(8.1)},14.3 `
        + `C ${x(6.7)},13.8 ${x(5.1)},13.4 ${x(3.8)},13.3 `
        + `C ${x(3.0)},13.25 ${x(2.5)},13.4 ${x(2.2)},13.8 Z`}
        fill={P.cuerpoSombra} stroke={INK} strokeWidth="0.85" strokeLinejoin="round" />
      {/* el empeine que agarra la luz */}
      <path d={
        `M ${x(2.9)},14.1 `
        + `C ${x(2.6)},15.2 ${x(3.2)},16.2 ${x(4.6)},16.7 `
        + `C ${x(6.2)},17.25 ${x(7.9)},17.0 ${x(8.6)},16.2 `
        + `C ${x(7.5)},15.5 ${x(5.9)},14.6 ${x(4.5)},14.15 `
        + `C ${x(3.8)},13.95 ${x(3.2)},13.95 ${x(2.9)},14.1 Z`}
        fill={P.pataLuz} opacity="0.85" aria-hidden="true" />
      {/* los dedos leídos por la tinta */}
      <g fill="none" stroke={INK} strokeWidth="0.38" opacity="0.6" strokeLinecap="round" aria-hidden="true">
        <path d={`M ${x(5.2)},17.4 C ${x(5.5)},16.7 ${x(5.5)},16.0 ${x(5.1)},15.4`} />
        <path d={`M ${x(6.7)},17.4 C ${x(7.0)},16.8 ${x(7.0)},16.1 ${x(6.6)},15.5`} />
        <path d={`M ${x(8.0)},17.0 C ${x(8.3)},16.5 ${x(8.3)},15.9 ${x(7.9)},15.4`} />
      </g>
      {/* LAS GARRAS — GORDAS, curvas, carbón con su filo de luz (la lámina:
          garrones de plantígrado, no alfileres) */}
      <g aria-hidden="true">
        {[
          { bx: 4.3, by: 17.2, tx: 4.8, ty: 18.75, w: 0.5 },
          { bx: 5.9, by: 17.5, tx: 6.7, ty: 18.95, w: 0.55 },
          { bx: 7.5, by: 17.25, tx: 8.6, ty: 18.5, w: 0.52 },
          { bx: 8.9, by: 16.5, tx: 10.2, ty: 17.45, w: 0.48 },
        ].map((g2, i) => (
          <g key={i}>
            <path
              d={`M ${x(g2.bx - g2.w)},${g2.by} C ${x(g2.bx + (g2.tx - g2.bx) * 0.35)},${g2.by + (g2.ty - g2.by) * 0.6} ${x(g2.tx - 0.25)},${g2.ty - 0.15} ${x(g2.tx)},${g2.ty} C ${x(g2.tx + 0.05)},${g2.ty - 0.4} ${x(g2.bx + g2.w * 0.7)},${g2.by - 0.3} ${x(g2.bx + g2.w)},${g2.by - 0.42} Z`}
              fill={P.garra} stroke={INK} strokeWidth="0.24" strokeLinejoin="round" />
            <path
              d={`M ${x(g2.bx - g2.w * 0.4)},${g2.by} C ${x(g2.bx + (g2.tx - g2.bx) * 0.45)},${g2.by + (g2.ty - g2.by) * 0.5} ${x(g2.tx - 0.4)},${g2.ty - 0.45} ${x(g2.tx - 0.15)},${g2.ty - 0.22}`}
              fill="none" stroke={P.garraLuz} strokeWidth="0.18" strokeLinecap="round" opacity="0.8" />
          </g>
        ))}
      </g>
    </g>
  );
}

/* ZARPA-MANO cerrada (jarra / empuñando): puño de oso con nudillos y garras
   cortas que asoman — reemplaza el guante de goma crema. */
function ZarpaMano({ cx, cy, r = 1.9, rot = 0, garrasAbajo = true, P, INK }) {
  const garras = garrasAbajo
    ? [{ a: 0.55, l: 1.15 }, { a: 0.18, l: 1.3 }, { a: -0.2, l: 1.15 }]
    : [{ a: 2.6, l: 1.1 }, { a: 2.95, l: 1.25 }, { a: 3.3, l: 1.1 }];
  return (
    <g transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined}>
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.88}
        fill={P.cuerpoSombra} stroke={INK} strokeWidth="0.7" />
      <ellipse cx={cx - r * 0.25} cy={cy - r * 0.3} rx={r * 0.62} ry={r * 0.45}
        fill={P.pataLuz} opacity="0.7" aria-hidden="true" />
      {/* nudillos */}
      <g fill="none" stroke={INK} strokeWidth="0.32" strokeLinecap="round" opacity="0.6" aria-hidden="true">
        <path d={`M ${cx - r * 0.55},${cy + r * 0.35} C ${cx - r * 0.45},${cy + r * 0.62} ${cx - r * 0.25},${cy + r * 0.7} ${cx - r * 0.05},${cy + r * 0.62}`} />
        <path d={`M ${cx + r * 0.1},${cy + r * 0.42} C ${cx + r * 0.2},${cy + r * 0.66} ${cx + r * 0.42},${cy + r * 0.7} ${cx + r * 0.58},${cy + r * 0.58}`} />
      </g>
      {/* garras que asoman del puño */}
      <g aria-hidden="true">
        {garras.map((g2, i) => {
          const bx = cx + Math.cos(g2.a + Math.PI / 2) * r * 0.82;
          const by = cy + Math.sin(g2.a + Math.PI / 2) * r * 0.78;
          const tx2 = bx + Math.cos(g2.a + Math.PI / 2) * g2.l;
          const ty2 = by + Math.sin(g2.a + Math.PI / 2) * g2.l * 0.9;
          return (
            <path key={i}
              d={`M ${(bx - 0.3).toFixed(2)},${by.toFixed(2)} Q ${((bx + tx2) / 2).toFixed(2)},${(((by + ty2) / 2) + 0.25).toFixed(2)} ${tx2.toFixed(2)},${ty2.toFixed(2)} Q ${((bx + tx2) / 2 + 0.12).toFixed(2)},${((by + ty2) / 2 - 0.15).toFixed(2)} ${(bx + 0.28).toFixed(2)},${(by - 0.15).toFixed(2)} Z`}
              fill={P.garra} stroke={INK} strokeWidth="0.2" strokeLinejoin="round" />
          );
        })}
      </g>
    </g>
  );
}

/* ═══ LOS OJOS DE LA LÁMINA — almendras REALISTAS de oso, no los circulotes
   de goma del kit (el operador rechazó la piel cartoon del jaguar: la cara
   tiene que ser la del animal). Párpado superior pesado con su peso angulado
   hacia el entrecejo (fiero-amable), iris CAFÉ oscuro recortado por los
   párpados (clipPath), pupila honda y una chispa mínima. El PARPADEO sigue
   siendo el de la casa (.rh-blink escala el grupo) y el dardeo de la pupila
   el de siempre (.rh-mirada) — vida intacta, cara real. */
const OJO_IZQ_ALMENDRA =
  'M -3.55,-13.15 C -3.0,-13.5 -1.9,-13.45 -1.2,-12.7 '
  + 'C -1.15,-12.3 -1.6,-11.9 -2.35,-11.88 C -3.1,-11.9 -3.5,-12.5 -3.55,-13.15 Z';
const OJO_DER_ALMENDRA =
  'M 3.55,-13.05 C 3.0,-13.4 1.9,-13.35 1.2,-12.6 '
  + 'C 1.15,-12.2 1.6,-11.8 2.35,-11.78 C 3.1,-11.8 3.5,-12.4 3.55,-13.05 Z';

/* El POLEN que flota de la corona (delays/duraciones propios: vida, no
   metrónomo). Coordenadas alrededor de la corona del bastón. */
const POLEN = [
  { cx: 8.6, cy: -16.4, r: 0.4, d: 0, s: 6.5 },
  { cx: 13.6, cy: -14.8, r: 0.34, d: -2.1, s: 7.3 },
  { cx: 9.6, cy: -12.2, r: 0.3, d: -3.6, s: 5.9 },
  { cx: 12.8, cy: -18.2, r: 0.36, d: -1.4, s: 6.9 },
];

export function OsoBaston({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Oso del bastón',
  /* Pose de VIDA: 'anda' (base, plantado en su trocha) | 'camina' (el ciclo de
     ANDAR plantígrado con bastón — kart/mundos) | 'celebra' | 'reposo' |
     'señala' (species-agnostic rh-g-*). */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* ── 70/30 (spec compai): 'normal' | 'actuando' | null (auto) ──────────────
     'normal' (el 70%): el oso BONITO de la lámina — digno, quieto o caminando
     plantígrado; sin volteretas ni arrebatos. 'actuando' (el 30%): rubber-hose
     Miss Minutes — anticipación/squash/overshoot exagerados sobre los huesos
     (aparece, habla, ve, piensa, gesto-firma). Sin prop se decide sola:
     habla/gesto-firma/celebra → actuando; el resto → normal. */
  modo = null,
  /* CLIMA REAL escrito en el cuerpo (perfil de bosque altoandino/páramo).
     Sin clima (avatares, catálogo) = neutro digno. */
  clima = null,
  enso = 'neutro',
  /* Lip-sync transversal (useLipSync → 'V1'..'V4'). Sin visema = el smirk
     cerrado de medio lado de la lámina (dientes solo al hablar). */
  visema = null,
  /* FLORECE (opt-in): su gesto-firma — el bastón late EN FLOR (halo verde,
     corola con overshoot, polen acelerado). La ecología del dispersor de
     semillas hecha estado visual. */
  florece = false,
  /* RESOPLA (opt-in): el huff pesado familiar de los osos de la casa — vaho
     por la trufa, pecho que hincha y suelta. */
  resopla = false,
  /* VIDA PROPIA (idle-cerebro v2): default ON. Repertorio propio 'oso-baston'
     (florece/resopla/reposo — caminante lento que se detiene a hacer florecer). */
  vida = true,
  /* Device-tier: 'bajo' apaga el idle continuo; el bastón y su corona quedan
     en fotograma digno (la firma no se negocia, la cadencia sí). */
  tier = undefined,
  /* Line-boil (opt-in, capa cara): la línea que respira años-30. */
  lineBoil = false,
  /* MODO PODER (opt-in, standalone): aura VERDE del bastón florecido. */
  poder = false,
  /* Prop por mundo (opt-in): la herramienta va en la mano LIBRE (la jarra) —
     el bastón no se suelta jamás (es su firma). */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const pelaje = `osb-pelaje-${uid}`;
  const dorso = `osb-dorso-${uid}`;
  const craneo = `osb-craneo-${uid}`;
  const masa = `osb-masa-${uid}`;
  const grano = `osb-grano-${uid}`;
  const pincel = `osb-pincel-${uid}`;
  const haloVerde = `osb-halo-verde-${uid}`;
  const haloSombra = `osb-halo-sombra-${uid}`;
  const trufaG = `osb-trufa-${uid}`;
  const ojoIClip = `osb-ojo-i-${uid}`;
  const ojoDClip = `osb-ojo-d-${uid}`;
  const vivo = animated;

  // ═══ VIDA PROPIA (idle-cerebro + ritmo propio + mirada — vara Angelita v2).
  const raizRef = useRef(null);
  const ritmoPropio = useRitmoPropio();
  const enBase = pose === 'anda' && !florece && !resopla && !visema;
  const momento = useVidaIdle(OSO_BASTON_SLUG, vida && vivo && tier !== 'bajo' && enBase);
  useMiradaUsted(raizRef, vida && vivo && tier !== 'bajo');
  const floreceFx = florece || momento === 'florece';
  const resoplaFx = resopla || momento === 'resopla';
  const poseFx = momento === 'reposo' ? 'reposo' : pose;

  // ═══ 70/30 — el modo resuelto: la prop manda; sin prop, los momentos
  // EXPRESIVOS (habla, gesto-firma, celebración) actúan y el resto es el oso
  // digno de la lámina. Caminar y estar quieto SON el 70%.
  const modoFx = modo
    || ((visema || floreceFx || resoplaFx || poseFx === 'celebra' || poseFx === 'señala')
      ? 'actuando' : 'normal');

  // CLIMA → cuerpo (determinista): tinte + opacidad al contorno. Sin alas.
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_OSO_BASTON });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  const P = OSO_BASTON_PALETA;
  const PR = OSO_BASTON_PROPORCION;
  const INK = OSO_BASTON_TINTA;
  const auraOp = Math.max(0.08, Math.min(0.24, 0.1 + 0.14 * (energia ?? 1)));

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* PELAJE CON VOLUMEN — el carbón-oliva de la lámina con la luz fría del
          sol andino arriba-izquierda; cuatro paradas (lámina, no sticker). */}
      <radialGradient id={pelaje} cx="38%" cy="24%" r="92%">
        <stop offset="0%" stopColor={P.brillo} />
        <stop offset="28%" stopColor={P.cuerpoLuz} />
        <stop offset="62%" stopColor={P.cuerpo} />
        <stop offset="100%" stopColor={P.cuerpoSombra} />
      </radialGradient>
      {/* DORSO→VIENTRE del tronco: la luz cae de arriba (hombros encendidos,
          panza en penumbra) — el volumen vertical de la mole erguida. */}
      <linearGradient id={dorso} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={P.cuerpoLuz} />
        <stop offset="30%" stopColor={P.cuerpo} />
        <stop offset="72%" stopColor={P.cuerpoSombra} />
        <stop offset="100%" stopColor="#181613" />
      </linearGradient>
      {/* CRÁNEO: la luz entra por la frente (arriba-adelante), la quijada queda
          en penumbra — el modelado de la testa de la lámina. */}
      <radialGradient id={craneo} cx="50%" cy="26%" r="88%">
        <stop offset="0%" stopColor={P.cuerpoLuz} />
        <stop offset="48%" stopColor={P.cuerpo} />
        <stop offset="100%" stopColor="#1b1915" />
      </radialGradient>
      {/* MASAS musculares (deltoides, muslos): radial con la luz al tercio
          alto — MISMOS valores del tronco (un solo pelaje, no piezas claras
          pegadas a un cuerpo oscuro). */}
      <radialGradient id={masa} cx="42%" cy="28%" r="82%">
        <stop offset="0%" stopColor="#514c41" />
        <stop offset="55%" stopColor={P.cuerpo} />
        <stop offset="100%" stopColor="#1d1b16" />
      </radialGradient>
      {/* GRANO DE PELAJE — feTurbulence compuesto DENTRO de la silueta (operator
          "in" contra SourceGraphic): pelo corto denso SIN feDisplacementMap (el
          contrato frugal del kit lo reserva al opt-in lineBoil). Seed fija. */}
      <filter id={grano} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="1.7 2.4" numOctaves="2" seed="7" result="ruido" />
        <feColorMatrix in="ruido" type="matrix"
          values="0 0 0 0 0.19  0 0 0 0 0.18  0 0 0 0 0.15  0 0 0 0.22 0" result="tinte" />
        <feComposite in="tinte" in2="SourceGraphic" operator="in" />
      </filter>
      {/* PINCEL — blur chico para las masas painterly (el difumino del
          ilustrador, no el blur atmosférico del kit). */}
      <filter id={pincel} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="0.5" />
      </filter>
      {/* halo VERDE del florecer (gradiente, no blur: barato y sin recortes) */}
      <radialGradient id={haloVerde}>
        <stop offset="0%" stopColor={P.verdeHalo} stopOpacity="0.9" />
        <stop offset="55%" stopColor={P.verde} stopOpacity="0.4" />
        <stop offset="100%" stopColor={P.verde} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={haloSombra}>
        <stop offset="0%" stopColor="#140c06" stopOpacity="0.55" />
        <stop offset="70%" stopColor="#140c06" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#140c06" stopOpacity="0" />
      </radialGradient>
      {/* TRUFA modelada de la lámina: café-rosada con luz arriba y la base
          hundida en sombra (nariz con volumen, no sticker). */}
      <radialGradient id={trufaG} cx="42%" cy="28%" r="85%">
        <stop offset="0%" stopColor="#8a685a" />
        <stop offset="55%" stopColor={P.trufa} />
        <stop offset="100%" stopColor={P.trufaOscura} />
      </radialGradient>
      {/* clips de los ojos-almendra (cara REAL) */}
      <clipPath id={ojoIClip}><path d={OJO_IZQ_ALMENDRA} /></clipPath>
      <clipPath id={ojoDClip}><path d={OJO_DER_ALMENDRA} /></clipPath>
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // VAHO del resoplido: motas cálidas que salen de la trufa y se disuelven.
  const vaho = resoplaFx ? (
    <g className="crt-vaho" fill={P.anteojo} aria-hidden="true" opacity="0.6">
      <circle className={vivo ? 'crt-vaho-mota' : undefined} cx="2.5" cy="-9.4" r="0.95" />
      <circle className={vivo ? 'crt-vaho-mota' : undefined} style={{ animationDelay: '-0.7s' }} cx="3.4" cy="-8.5" r="0.75" />
    </g>
  ) : null;

  // PROP DEL MUNDO junto a la mano LIBRE (la jarra); el bastón nunca se suelta.
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={-11.6} y={5.2} escala={0.74} ink={INK} animated={vivo} />
  ) : null;

  // BOCA: lip-sync si narra; si no, EL SMIRK CERRADO de la lámina — el gesto
  // contenido y fiero de medio lado (dientes solo al hablar: el oso digno no
  // anda enseñando la dentadura; la sonrisota abierta se leía boba).
  const boca = visema
    ? <BocaVisema cx={0} cy={-8.9} w={3.6} prof={1.15} visema={visema} ink={INK} />
    : (
      <g>
        {/* la línea del smirk: cae grave a la izquierda y BARRE hacia arriba
            a la comisura derecha (medio lado, no sonrisa simétrica) */}
        <path d="M -2.55,-8.25 C -1.3,-7.88 0.3,-7.9 1.55,-8.5 C 2.2,-8.82 2.72,-9.3 3.0,-9.9"
          fill="none" stroke={INK} strokeWidth="0.62" strokeLinecap="round" />
        {/* la comisura derecha ENROSCADA (el gancho del smirk de la lámina) */}
        <path d="M 3.0,-9.9 C 3.25,-10.15 3.38,-10.45 3.34,-10.75" fill="none" stroke={INK}
          strokeWidth="0.46" strokeLinecap="round" aria-hidden="true" />
        {/* el pliegue del cachete que EMPUJA la comisura (volumen, no tinta) */}
        <path d="M 2.55,-8.2 C 3.15,-8.65 3.55,-9.35 3.62,-10.1" fill="none"
          stroke={P.hocicoSombra} strokeWidth="0.34" strokeLinecap="round" opacity="0.8" aria-hidden="true" />
        {/* el extremo izquierdo cae SERIO (el gesto contenido, jamás sonrisota) */}
        <path d="M -2.55,-8.25 C -2.9,-8.18 -3.15,-8.26 -3.35,-8.46" fill="none" stroke={INK}
          strokeWidth="0.48" strokeLinecap="round" aria-hidden="true" />
        {/* la sombra del labio inferior bajo el smirk (el mentón con volumen) */}
        <path d="M -1.5,-7.55 C -0.4,-7.25 0.9,-7.35 1.9,-7.95" fill="none"
          stroke={P.hocicoSombra} strokeWidth="0.36" strokeLinecap="round" opacity="0.75" aria-hidden="true" />
      </g>
    );

  /* ═══ EL BASTÓN FLORECIDO — la firma. Grupo `.osb-baston` con origen en la
     CONTERA (la base no se despega del suelo en el vaivén idle); en
     pose='camina' el CSS lo hace plantar y levantar al compás del paso. */
  const baston = (
    <g className={vivo ? 'osb-baston' : 'osb-baston osb-quieto'}
      style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
      {/* halo del florecer (detrás de la corona; late con data-florece) */}
      <circle className="osb-halo" cx="10.9" cy="-14.6" r="5.2"
        fill={`url(#${haloVerde})`} opacity="0.16" aria-hidden="true"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      {/* el palo: contorno de tinta + madera encima (tubo rubber-hose) */}
      <path d="M 10.6,17.2 C 10.9,12.2 10.5,7.0 10.9,2.0 C 11.2,-2.6 10.8,-7.4 11.1,-12.4"
        stroke={INK} strokeWidth="2.1" fill="none" strokeLinecap="round" />
      <path d="M 10.6,17.2 C 10.9,12.2 10.5,7.0 10.9,2.0 C 11.2,-2.6 10.8,-7.4 11.1,-12.4"
        stroke={P.baston} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {/* la luz del canto + dos nudos de madera */}
      <path d="M 10.75,14.5 C 10.9,11.0 10.7,7.5 10.9,4.0" stroke={P.bastonLuz}
        strokeWidth="0.4" fill="none" strokeLinecap="round" opacity="0.8" aria-hidden="true" />
      <circle cx="10.72" cy="8.6" r="0.4" fill={P.bastonSombra} aria-hidden="true" />
      <circle cx="11.05" cy="-4.4" r="0.34" fill={P.bastonSombra} aria-hidden="true" />
      {/* LA ENREDADERA: la vida trepándose al caminante (verde dominante) */}
      <path d="M 10.7,13.6 C 12.0,11.8 9.8,10.2 11.0,8.4 C 12.2,6.6 9.9,4.8 11.1,3.0 C 12.2,1.4 10.0,-0.4 11.05,-2.2"
        stroke={P.hoja} strokeWidth="0.55" fill="none" strokeLinecap="round" opacity="0.9" aria-hidden="true" />
      {/* hojas de la enredadera (cabecean con vida propia) */}
      {[
        { x: 9.9, y: 9.6, r: -38 },
        { x: 12.0, y: 5.5, r: 34 },
        { x: 9.9, y: 0.6, r: -30 },
      ].map((h, i) => (
        <g key={i} transform={`translate(${h.x},${h.y}) rotate(${h.r})`}>
          <g className={vivo ? 'osb-hoja' : undefined}
            style={{ transformBox: 'fill-box', transformOrigin: 'right center', animationDelay: `${-i * 0.9}s` }}>
            <path d="M 0,0 C -2.2,-1.0 -3.4,-0.2 -3.8,0.6 C -3.0,1.4 -1.4,1.2 0,0 Z"
              fill={P.hoja} stroke={P.hojaSombra} strokeWidth="0.3" />
            <path d="M -0.4,0.25 C -1.4,0.2 -2.4,0.3 -3.2,0.6" stroke={P.hojaLuz}
              strokeWidth="0.25" fill="none" opacity="0.9" />
          </g>
        </g>
      ))}
      {/* ═══ LA CORONA (grupo `.osb-corola`: respira; late FUERTE al florecer) */}
      <g className={vivo ? 'osb-corola' : undefined}
        style={{ transformBox: 'fill-box', transformOrigin: 'center 80%' }}>
        {/* la roseta de frailejón (Espeletia): hojas afelpadas radiando */}
        <g aria-hidden="true">
          {[-72, -38, -8, 22, 55, 96, 137, 175, 215].map((a, i) => (
            <ellipse key={i} cx="0" cy="-2.1" rx="0.62" ry="2.15"
              fill={i % 2 ? P.frailejonHoja : P.hojaLuz} stroke={P.hojaSombra} strokeWidth="0.22"
              transform={`translate(11.05,-13.4) rotate(${a} 0 0)`} />
          ))}
        </g>
        {/* la flor amarilla del frailejón, arriba de la roseta */}
        <g transform="translate(11.05,-17.1)" aria-hidden="true">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <ellipse key={a} cx="0" cy="-1.15" rx="0.5" ry="1.15" fill={P.frailejonFlor}
              stroke={P.frailejonCentro} strokeWidth="0.18" transform={`rotate(${a})`} />
          ))}
          <circle cx="0" cy="0" r="0.8" fill={P.frailejonCentro} />
          <circle cx="-0.22" cy="-0.22" r="0.26" fill={P.frailejonFlor} opacity="0.9" />
        </g>
        {/* la orquídea de Mayo (Cattleya trianae) colgada del cayado */}
        <g transform="translate(8.9,-11.6) rotate(-14)" aria-hidden="true">
          {[-55, 0, 55].map((a) => (
            <ellipse key={a} cx="0" cy="-1.05" rx="0.62" ry="1.1" fill={P.orquidea}
              stroke={P.orquideaLuz} strokeWidth="0.2" transform={`rotate(${a})`} />
          ))}
          <path d="M -0.55,0.15 C -0.6,0.95 0.6,0.95 0.55,0.15 C 0.3,-0.15 -0.3,-0.15 -0.55,0.15 Z"
            fill={P.orquidea} stroke={P.orquideaLuz} strokeWidth="0.2" />
          <circle cx="0" cy="0.3" r="0.24" fill={P.orquideaGarganta} />
        </g>
      </g>
      {/* el POLEN que flota de la corona (se acelera al florecer) */}
      <g aria-hidden="true" fill={P.polen}>
        {POLEN.map((m, i) => (
          <circle key={i} className={vivo ? 'osb-polen' : undefined}
            cx={m.cx} cy={m.cy} r={m.r} opacity="0.3"
            style={vivo ? { animationDelay: `${m.d}s`, animationDuration: `${m.s}s` } : undefined} />
        ))}
      </g>
    </g>
  );

  // ── EL DIBUJO (atrás→adelante): sombra de trocha, PIERNAS plantígradas con
  //    garras, la COLUMNA (tronco-lámina + V del pecho + brazos + cuello-gola +
  //    cabeza con antifaz + bastón). Cada grupo es un HUESO con su pivote.
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* SOMBRA DE TROCHA — el peso del caminante (abarca zarpas y contera). */}
      <ellipse cx="1" cy="17.3" rx="12.6" ry="1.9" fill={`url(#${haloSombra})`} aria-hidden="true" />
      {/* aura verde tenue del que hace germinar (presencia, no neón) */}
      <circle cx="0" cy="2" r={10 + 1.4 * (energia ?? 1)} fill={`url(#${haloVerde})`} opacity={auraOp * 0.4} aria-hidden="true" />

      {/* ═══ HUESOS-PIERNA: cadera→muslo macizo→zarpa plantígrada con garras.
          La lámina no tiene piernas de fideo: son muslos con masa que bajan a
          pies anchos plantados hacia afuera. En 'camina' alternan el paso. */}
      <g aria-hidden="true">
        <g className="osb-pierna-i" style={{ transformBox: 'fill-box', transformOrigin: 'top center' }}>
          <path d="M -1.4,6.0 C -5.2,6.2 -7.0,8.1 -6.9,10.4 C -6.8,12.5 -5.8,14.2 -4.5,14.95 C -3.2,15.45 -2.05,15.05 -1.65,14.1 C -1.15,11.5 -1.15,8.5 -1.4,6.0 Z"
            fill={`url(#${masa})`} stroke={INK} strokeWidth="0.95" strokeLinejoin="round" />
          {/* la luz del muslo + la sombra de la canilla (pierna con volumen) */}
          <ellipse cx="-4.9" cy="8.3" rx="1.6" ry="2.0" fill={P.cuerpoLuz} opacity="0.4"
            transform="rotate(18 -4.9 8.3)" filter={`url(#${pincel})`} aria-hidden="true" />
          <path d="M -5.9,11.6 C -5.7,12.9 -5.2,13.9 -4.3,14.5" fill="none" stroke={P.umbra}
            strokeWidth="0.85" strokeLinecap="round" opacity="0.55" filter={`url(#${pincel})`} aria-hidden="true" />
          {/* el mechón del muslo (pelo, no recorte) */}
          <path d="M -6.85,9.2 l -0.55,0.4 0.5,0.45 -0.55,0.42" fill="none"
            stroke={P.cuerpoSombra} strokeWidth="0.35" strokeLinecap="round" opacity="0.7" />
          <ZarpaPie s={-1} P={P} INK={INK} />
        </g>
        <g className="osb-pierna-d" style={{ transformBox: 'fill-box', transformOrigin: 'top center' }}>
          <path d="M 1.4,6.0 C 5.2,6.2 7.0,8.1 6.9,10.4 C 6.8,12.5 5.8,14.2 4.5,14.95 C 3.2,15.45 2.05,15.05 1.65,14.1 C 1.15,11.5 1.15,8.5 1.4,6.0 Z"
            fill={`url(#${masa})`} stroke={INK} strokeWidth="0.95" strokeLinejoin="round" />
          <ellipse cx="4.9" cy="8.3" rx="1.6" ry="2.0" fill={P.cuerpoLuz} opacity="0.4"
            transform="rotate(-18 4.9 8.3)" filter={`url(#${pincel})`} aria-hidden="true" />
          <path d="M 5.9,11.6 C 5.7,12.9 5.2,13.9 4.3,14.5" fill="none" stroke={P.umbra}
            strokeWidth="0.85" strokeLinecap="round" opacity="0.55" filter={`url(#${pincel})`} aria-hidden="true" />
          <path d="M 6.85,9.2 l 0.55,0.4 -0.5,0.45 0.55,0.42" fill="none"
            stroke={P.cuerpoSombra} strokeWidth="0.35" strokeLinecap="round" opacity="0.7" />
          <ZarpaPie s={1} P={P} INK={INK} />
        </g>
      </g>

      {/* ═══ LA COLUMNA — el hueso del tronco: se inclina SOLA (anticipación,
          lean del paso) sin arrastrar las piernas. Pivote en la pelvis. */}
      <g className="osb-columna" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>

        {/* EL TRONCO-LÁMINA: hombros anchos, pecho, panza — carbón-oliva con la
            luz de arriba; encima el GRANO de pelo y las masas painterly. */}
        <path d={SILUETA_TRONCO} fill={`url(#${dorso})`} stroke={INK} strokeWidth="1.3"
          strokeLinejoin="round" />
        {/* grano de pelaje: overlay de turbulencia recortado a la MISMA silueta */}
        <path d={SILUETA_TRONCO} fill={P.cuerpo} filter={`url(#${grano})`} aria-hidden="true" />
        {/* SOMBREADO PAINTERLY — masas blandas de pincel como la aguada de la
            lámina: pectorales con su luz, penumbra de flancos y bajo-panza. */}
        <g aria-hidden="true" filter={`url(#${pincel})`}>
          {/* pectorales ALTOS encendidos (la coraza del top-heavy) */}
          <ellipse cx="-3.7" cy="-4.1" rx="3.1" ry="2.1" fill={P.cuerpoLuz} opacity="0.55" />
          <ellipse cx="3.7" cy="-4.1" rx="3.1" ry="2.1" fill={P.cuerpoLuz} opacity="0.55" />
          {/* crestas de hombro que AGARRAN el sol (contraste painterly) */}
          <ellipse cx="-6.9" cy="-5.4" rx="2.3" ry="1.4" fill={P.brillo} opacity="0.45"
            transform="rotate(-18 -6.9 -5.4)" />
          <ellipse cx="6.9" cy="-5.4" rx="2.3" ry="1.4" fill={P.brillo} opacity="0.45"
            transform="rotate(18 6.9 -5.4)" />
          {/* la panza recoge la luz APENAS (penumbra: ya no globo claro) */}
          <ellipse cx="0" cy="3.0" rx="4.2" ry="2.8" fill={P.cuerpoLuz} opacity="0.14" />
          {/* umbra honda de los flancos (la vuelta del cilindro, más oscura) */}
          <path d="M -9.1,-0.6 C -8.7,1.6 -7.9,3.6 -6.3,5.6 C -7.5,3.7 -8.5,1.5 -9.1,-0.6 Z"
            fill={P.umbra} opacity="0.6" />
          <path d="M 9.1,-0.6 C 8.7,1.6 7.9,3.6 6.3,5.6 C 7.5,3.7 8.5,1.5 9.1,-0.6 Z"
            fill={P.umbra} opacity="0.6" />
          <ellipse cx="0" cy="6.9" rx="4.3" ry="1.3" fill={P.umbra} opacity="0.5" />
        </g>
        {/* DEFINICIÓN MUSCULAR de la lámina — tinta a baja opacidad que sugiere
            (pectorales, el surco central, la panza) sin delinear. */}
        <g aria-hidden="true" fill="none" stroke={INK} strokeWidth="0.5" opacity="0.32" strokeLinecap="round">
          <path d="M -6.3,-3.0 C -4.4,-1.6 -2.0,-1.4 -0.2,-2.2" />
          <path d="M 6.3,-3.0 C 4.4,-1.6 2.0,-1.4 0.2,-2.2" />
          <path d="M 0,-1.4 C -0.15,0.2 -0.15,1.5 0,2.7" strokeWidth="0.4" />
          <path d="M -4.0,2.7 C -2.6,4.6 -0.8,5.5 1.2,5.3" strokeWidth="0.42" opacity="0.55" />
        </g>
        {/* PELAJE A PINCEL: trazos cortos de luz sobre hombros y pecho (la
            textura de pelo de la lámina, no relleno plano) */}
        <g aria-hidden="true" fill="none" stroke={P.brillo} strokeWidth="0.28" strokeLinecap="round" opacity="0.5">
          <path d="M -8.2,-5.5 l 0.85,-0.3" />
          <path d="M -7.0,-6.1 l 0.8,-0.25" />
          <path d="M 8.2,-5.5 l -0.85,-0.3" />
          <path d="M 7.0,-6.1 l -0.8,-0.25" />
          <path d="M -4.6,-5.9 l 0.7,-0.2" />
          <path d="M 4.6,-5.9 l -0.7,-0.2" />
        </g>
        {/* mechones del flanco (el borde es pelo) */}
        <g aria-hidden="true" fill="none" stroke={P.cuerpoSombra} strokeWidth="0.34" strokeLinecap="round" opacity="0.6">
          <path d="M -8.55,0.6 l -0.5,0.45 0.48,0.5 -0.5,0.45" />
          <path d="M 8.55,0.6 l 0.5,0.45 -0.48,0.5 0.5,0.45" />
          <path d="M -6.3,4.8 l -0.5,0.4 0.45,0.48" />
          <path d="M 6.3,4.8 l 0.5,0.4 -0.45,0.48" />
          <path d="M -10.45,-3.8 l -0.5,0.4 0.45,0.48" />
          <path d="M 10.45,-3.8 l 0.5,0.4 -0.45,0.48" />
        </g>

        {/* ═══ LA V RASGADA del pecho (el babero de la lámina, con sus rayos) */}
        <g aria-hidden="true">
          <path d={V_PECHO} fill={P.pecho} stroke={P.pechoSombra} strokeWidth="0.22"
            strokeLinejoin="round" />
          {/* penumbra del borde bajo (que no sea sticker) */}
          <path d="M -0.7,-1.0 L -0.5,-2.3 L -0.15,-1.5 L 0.1,-3.1 L 0.5,-1.8"
            fill="none" stroke={P.pechoSombra} strokeWidth="0.28" opacity="0.6"
            strokeLinecap="round" filter={`url(#${pincel})`} />
        </g>

        {/* ═══ HUESO-BRAZO IZQUIERDO (jarra): hombro→bíceps AFUERA→antebrazo→
            puño de garras en la cadera. La musculatura de la lámina, no fideo. */}
        <g className={vivo ? 'crt-brazo-l rh-sway' : 'crt-brazo-l'}
          style={{ transformBox: 'fill-box', transformOrigin: 'top right', animationDelay: '-0.3s' }}>
          <path d="M -5.0,-7.6 C -9.4,-8.1 -12.4,-6.3 -13.0,-3.6 C -13.5,-1.2 -12.6,1.2 -11.0,2.9 C -10.2,3.7 -9.3,4.35 -8.4,4.75 C -7.9,5.0 -7.55,4.55 -7.75,4.05 C -8.15,3.6 -8.85,2.8 -9.4,-0.45 C -9.6,-2.3 -8.9,-3.95 -7.4,-4.95 C -6.6,-5.45 -5.8,-5.6 -5.0,-5.5 Z"
            fill={`url(#${masa})`} stroke={INK} strokeWidth="1.0" strokeLinejoin="round" />
          {/* la luz del deltoides y el bíceps (painterly) */}
          <g aria-hidden="true" filter={`url(#${pincel})`}>
            <ellipse cx="-9.9" cy="-5.1" rx="2.1" ry="1.35" fill={P.cuerpoLuz} opacity="0.65"
              transform="rotate(-24 -9.9 -5.1)" />
            <path d="M -12.3,-2.8 C -12.5,-1.0 -12.0,0.9 -11.1,2.1" fill="none"
              stroke={P.umbra} strokeWidth="0.95" opacity="0.55" strokeLinecap="round" />
          </g>
          {/* mechón del codo */}
          <path d="M -12.7,-1.0 l -0.55,0.42 0.5,0.48 -0.55,0.45" fill="none"
            stroke={P.cuerpoSombra} strokeWidth="0.36" strokeLinecap="round" opacity="0.7" aria-hidden="true" />
          {/* RIM-LIGHT del brazo — el filo de luz que esculpe deltoides y
              bíceps en la lámina (borde externo, no delinea: esculpe) */}
          <path d="M -6.5,-7.2 C -9.9,-7.3 -11.9,-5.6 -12.4,-3.5" fill="none"
            stroke={P.brillo} strokeWidth="0.55" strokeLinecap="round" opacity="0.6" aria-hidden="true" />
          {/* EL PUÑO en jarra, garras hacia abajo (la chulería amable) — BIEN
              afuera de la silueta: que el codo respire (gap del brazo en jarra
              de la lámina) y el puño no se funda con la panza */}
          <ZarpaMano cx={-8.5} cy={5.1} r={2.45} rot={-14} P={P} INK={INK} />
        </g>

        {/* ═══ HUESO-CUELLO: la GOLA continua — el pelaje denso que cose la
            cabeza al cuerpo. La cabeza la solapa; al girar, esto es lo que se
            estira debajo. SIN esta masa, decapitación; con ella, jamás. */}
        <path className="osb-cuello" d={GOLA} fill={P.golilla} aria-hidden="true" />

        {/* ═══ LA CABEZA — wrapper ADITIVO .osb-cabeza-mira (sigue al usuario,
            CSS via data-rh-mira igual que el jaguar vectorial) alrededor del
            hueso .osb-cabeza (gestos: nod, ladeo, take actuado). Orejas DENTRO:
            viajan con la testa, nunca quedan flotando. */}
        <g className="osb-cabeza-mira">
          <g className="osb-cabeza" style={{ transformBox: 'fill-box', transformOrigin: '50% 88%' }}>
          {/* proporción de LÁMINA: la testa baja un 10% (anti-chibi — el
              patrón del jaguar Humboldt: escala ESTÁTICA sobre el conjunto;
              el mentón queda anclado y el solape con la gola no se toca). */}
          <g transform="translate(0,-0.95) scale(0.86)">
            {/* orejas redondas — dorso carbón, pabellón hondo, mechón de base */}
            <g aria-hidden="true">
              <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: '-0.2s' }}>
                <circle cx="-3.9" cy="-16.1" r={PR.orejaR} fill={`url(#${craneo})`} stroke={INK} strokeWidth="1.0" />
                <circle cx="-3.9" cy="-15.95" r={PR.orejaR * 0.52} fill={P.oreja} />
                <path d="M -4.95,-15.0 l 0.5,0.3 -0.42,0.4" fill="none" stroke={P.cuerpoSombra}
                  strokeWidth="0.3" strokeLinecap="round" opacity="0.8" />
              </g>
              <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: '-0.5s' }}>
                <circle cx="3.9" cy="-16.1" r={PR.orejaR} fill={`url(#${craneo})`} stroke={INK} strokeWidth="1.0" />
                <circle cx="3.9" cy="-15.95" r={PR.orejaR * 0.52} fill={P.oreja} />
                <path d="M 4.95,-15.0 l -0.5,0.3 0.42,0.4" fill="none" stroke={P.cuerpoSombra}
                  strokeWidth="0.3" strokeLinecap="round" opacity="0.8" />
              </g>
            </g>

            {/* CRÁNEO ESCULPIDO de la lámina: frente amplia, CARRILLERAS de
                pelo en picos a los lados, quijada ancha que aterriza en la
                gola. Ya no una elipse: es pelo con forma de oso. */}
            <path d="M 0,-17.0 C 3.1,-17.0 5.1,-15.8 5.9,-14.0 C 6.4,-12.8 6.45,-11.5 6.1,-10.3 L 7.0,-9.8 L 6.0,-9.3 L 6.6,-8.5 L 5.5,-8.4 C 4.6,-7.1 2.5,-6.3 0,-6.3 C -2.5,-6.3 -4.6,-7.1 -5.5,-8.4 L -6.6,-8.5 L -6.0,-9.3 L -7.0,-9.8 L -6.1,-10.3 C -6.45,-11.5 -6.4,-12.8 -5.9,-14.0 C -5.1,-15.8 -3.1,-17.0 0,-17.0 Z"
              fill={`url(#${craneo})`} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
            {/* grano de pelaje del cráneo (misma silueta) */}
            <path d="M 0,-17.0 C 3.1,-17.0 5.1,-15.8 5.9,-14.0 C 6.4,-12.8 6.45,-11.5 6.1,-10.3 L 7.0,-9.8 L 6.0,-9.3 L 6.6,-8.5 L 5.5,-8.4 C 4.6,-7.1 2.5,-6.3 0,-6.3 C -2.5,-6.3 -4.6,-7.1 -5.5,-8.4 L -6.6,-8.5 L -6.0,-9.3 L -7.0,-9.8 L -6.1,-10.3 C -6.45,-11.5 -6.4,-12.8 -5.9,-14.0 C -5.1,-15.8 -3.1,-17.0 0,-17.0 Z"
              fill={P.cuerpo} filter={`url(#${grano})`} aria-hidden="true" />

            {/* ═══ EL ANTIFAZ DE LA LÁMINA — la firma de la especie, ASIMÉTRICO
                como el animal real. Crema-plata en TRES piezas por lado:
                la CEJA-LLAMA que barre hacia afuera (fiera-amable), el ARO que
                baja al hocico (el izquierdo cierra, el derecho se derrama), y
                la CASCADA de la carrillera. Los ojos viven en PARCHES OSCUROS
                dentro del antifaz (la lámina los trae así). */}
            <g aria-hidden="true">
              {/* ceja-llama izquierda: barre alta AFUERA y PICA hacia el
                  entrecejo (la llama fruncida de la lámina, no arco tierno) */}
              <path d="M -5.2,-14.0 C -4.4,-15.4 -2.6,-15.75 -1.0,-14.75 C -1.25,-14.25 -1.85,-13.95 -2.5,-13.95 L -2.1,-13.55 C -3.2,-13.2 -4.45,-13.4 -5.2,-14.0 Z"
                fill={P.anteojo} />
              {/* ceja-llama derecha (un pelo más baja: asimetría) */}
              <path d="M 5.2,-13.85 C 4.4,-15.25 2.6,-15.6 1.0,-14.6 C 1.25,-14.1 1.85,-13.8 2.5,-13.8 L 2.1,-13.4 C 3.2,-13.05 4.45,-13.25 5.2,-13.85 Z"
                fill={P.anteojo} />
              {/* aro izquierdo: CIERRA — baja de la ceja por fuera del ojo al hocico
                  (ANCHO: en la lámina el crema pesa tanto como la máscara) */}
              <path d="M -4.9,-13.5 C -5.5,-11.9 -5.15,-10.2 -4.0,-9.2 C -3.0,-8.4 -1.95,-8.2 -1.2,-8.5 C -1.6,-9.4 -2.35,-9.9 -3.0,-10.5 C -3.85,-11.35 -4.4,-12.35 -4.9,-13.5 Z"
                fill={P.anteojo} opacity="0.95" />
              {/* aro derecho: SE DERRAMA hacia el hocico (abierto por abajo) */}
              <path d="M 4.9,-13.35 C 5.5,-11.7 5.1,-10.0 3.9,-9.0 C 3.35,-8.55 2.75,-8.35 2.2,-8.35 C 2.5,-9.3 2.95,-10.15 3.45,-10.95 C 3.95,-11.7 4.45,-12.5 4.9,-13.35 Z"
                fill={P.anteojo} opacity="0.95" />
              {/* cascadas de las carrilleras (el pelo crema que cae a los lados
                  del hocico en la lámina) — generosas */}
              <path d="M -5.8,-9.1 C -5.3,-7.7 -4.4,-6.8 -3.1,-6.4 L -3.6,-7.5 L -2.7,-6.95 L -3.3,-8.2 C -4.25,-8.4 -5.1,-8.7 -5.8,-9.1 Z"
                fill={P.antifazSombra} opacity="0.85" />
              <path d="M 5.8,-9.1 C 5.3,-7.7 4.4,-6.8 3.1,-6.4 L 3.6,-7.5 L 2.7,-6.95 L 3.3,-8.2 C 4.25,-8.4 5.1,-8.7 5.8,-9.1 Z"
                fill={P.antifazSombra} opacity="0.85" />
              {/* PARCHES OSCUROS donde viven los ojos (la máscara de la lámina) */}
              <ellipse cx="-2.3" cy="-12.6" rx="2.0" ry="1.8" fill={P.mascara} opacity="0.78"
                transform="rotate(-8 -2.3 -12.6)" />
              <ellipse cx="2.3" cy="-12.6" rx="2.0" ry="1.8" fill={P.mascara} opacity="0.78"
                transform="rotate(8 2.3 -12.6)" />
            </g>

            {/* penumbra painterly de la testa (cuencas y bajo-quijada) */}
            <g aria-hidden="true" filter={`url(#${pincel})`}>
              <path d="M -4.6,-15.8 C -2.8,-16.6 2.8,-16.6 4.6,-15.8 C 2.6,-16.3 -2.6,-16.3 -4.6,-15.8 Z"
                fill={P.brillo} opacity="0.35" />
              {/* la sombra del ARCO SUPERCILIAR: hunde las cuencas bajo el ceño
                  (la mirada de la lámina es honda, no plana) */}
              <ellipse cx="-2.4" cy="-13.3" rx="1.7" ry="0.6" fill={P.umbra} opacity="0.4"
                transform="rotate(-11 -2.4 -13.3)" />
              <ellipse cx="2.4" cy="-13.2" rx="1.7" ry="0.6" fill={P.umbra} opacity="0.4"
                transform="rotate(11 2.4 -13.2)" />
              <ellipse cx="0" cy="-7.0" rx="3.0" ry="0.85" fill={P.umbra} opacity="0.3" />
            </g>

            {/* CEJAS FIERAS de tinta SOBRE el antifaz: DIAGONALES GRUESAS que
                caen al entrecejo (el ceño imponente de la lámina — digno,
                nunca villano) + el surco fruncido entre ambas. Grupo
                .oso-cejas: se fruncen al resoplar (CSS familiar). */}
            <g className="oso-cejas" stroke={P.ceja} strokeWidth="0.85" strokeLinecap="round" fill="none">
              <path d="M -4.6,-14.55 C -3.5,-14.7 -2.4,-14.3 -1.35,-13.5" />
              <path d="M 4.6,-14.35 C 3.5,-14.5 2.4,-14.1 1.35,-13.35" />
              <g strokeWidth="0.26" opacity="0.55" aria-hidden="true">
                <path d="M -0.5,-13.4 C -0.56,-13.85 -0.5,-14.25 -0.34,-14.55" />
                <path d="M 0.5,-13.3 C 0.56,-13.75 0.5,-14.15 0.34,-14.45" />
              </g>
            </g>

            {/* OJOS REALES de la lámina: almendra con párpado pesado, iris
                CAFÉ recortado por los párpados (clip), pupila honda y chispa
                mínima. Nada de circulotes de goma (rechazados). Parpadean con
                el reloj de la casa (.rh-blink) y dardean (.rh-mirada) — la
                vida es la de siempre, la cara es la del animal. */}
            <g className={vivo ? 'rh-blink' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
              <g>
                <path d={OJO_IZQ_ALMENDRA} fill={P.esclera} />
                <g clipPath={`url(#${ojoIClip})`}>
                  <g className={vivo ? 'rh-mirada' : undefined}>
                    <circle cx="-2.05" cy="-12.72" r="0.8" fill={P.iris} />
                    <circle cx="-2.0" cy="-12.68" r="0.44" fill={P.pupila} />
                    <circle cx="-2.28" cy="-12.95" r="0.12" fill="#f6efe0" opacity="0.9" />
                  </g>
                  {/* la sombra que el párpado pesado tira sobre el ojo (honda:
                      el ojo entornado de la lámina, no el ojo abierto tierno) */}
                  <path d="M -3.65,-13.2 C -3.05,-13.6 -1.85,-13.55 -1.1,-12.75 L -1.1,-12.3 C -1.9,-13.05 -3.05,-13.1 -3.65,-12.75 Z"
                    fill={P.parpado} opacity="0.6" aria-hidden="true" />
                </g>
                {/* la línea del párpado (el peso ANGULADO del ojo fiero) */}
                <path d="M -3.55,-13.15 C -3.0,-13.5 -1.9,-13.45 -1.2,-12.7" fill="none"
                  stroke={P.parpado} strokeWidth="0.5" strokeLinecap="round" />
                <path d="M -3.35,-12.4 C -2.9,-12.0 -2.3,-11.9 -1.55,-12.02" fill="none"
                  stroke={P.parpado} strokeWidth="0.22" strokeLinecap="round" opacity="0.6" aria-hidden="true" />
              </g>
              <g>
                <path d={OJO_DER_ALMENDRA} fill={P.esclera} />
                <g clipPath={`url(#${ojoDClip})`}>
                  <g className={vivo ? 'rh-mirada' : undefined}>
                    <circle cx="2.05" cy="-12.62" r="0.8" fill={P.iris} />
                    <circle cx="2.1" cy="-12.58" r="0.44" fill={P.pupila} />
                    <circle cx="1.82" cy="-12.85" r="0.12" fill="#f6efe0" opacity="0.9" />
                  </g>
                  <path d="M 3.65,-13.1 C 3.05,-13.5 1.85,-13.45 1.1,-12.65 L 1.1,-12.2 C 1.9,-12.95 3.05,-13.0 3.65,-12.65 Z"
                    fill={P.parpado} opacity="0.6" aria-hidden="true" />
                </g>
                <path d="M 3.55,-13.05 C 3.0,-13.4 1.9,-13.35 1.2,-12.6" fill="none"
                  stroke={P.parpado} strokeWidth="0.5" strokeLinecap="round" />
                <path d="M 3.35,-12.3 C 2.9,-11.9 2.3,-11.8 1.55,-11.92" fill="none"
                  stroke={P.parpado} strokeWidth="0.22" strokeLinecap="round" opacity="0.6" aria-hidden="true" />
              </g>
            </g>

            {/* ═══ HUESO-HOCICO: el morro claro de la lámina con su trufa café
                y la sonrisa confiada. Grupo propio: husmea en idle (CSS) y
                carga el lip-sync — articulación real, no sticker. */}
            <g className="osb-hocico" style={{ transformBox: 'fill-box', transformOrigin: 'center top' }}>
              {/* la banda clara del morro que sube al entrecejo (la lámina):
                  GRANDE y ANCHA — el hocico manda en la mitad baja de la cara */}
              <path d="M -2.9,-11.4 C -3.75,-9.2 -3.0,-6.9 0,-6.45 C 3.0,-6.9 3.75,-9.2 2.9,-11.4 C 1.9,-12.4 -1.9,-12.4 -2.9,-11.4 Z"
                fill={P.hocico} stroke={INK} strokeWidth="0.55" strokeLinejoin="round" />
              {/* el puente crema que conecta con el entrecejo */}
              <path d="M -1.0,-11.75 C -0.35,-12.05 0.35,-12.05 1.0,-11.75 C 0.55,-11.3 -0.55,-11.3 -1.0,-11.75 Z"
                fill={P.anteojo} opacity="0.85" aria-hidden="true" />
              {/* TRUFA café-rosada ancha de la lámina, con narinas y brillo */}
              <path d="M -1.3,-10.55 C -1.3,-11.2 1.3,-11.2 1.3,-10.55 C 1.3,-9.8 0.6,-9.35 0,-9.35 C -0.6,-9.35 -1.3,-9.8 -1.3,-10.55 Z"
                fill={`url(#${trufaG})`} stroke={P.trufaOscura} strokeWidth="0.22" />
              <path d="M -0.75,-10.4 Q -0.48,-10.6 -0.28,-10.38" fill="none"
                stroke={P.trufaOscura} strokeWidth="0.2" strokeLinecap="round" aria-hidden="true" />
              <path d="M 0.75,-10.4 Q 0.48,-10.6 0.28,-10.38" fill="none"
                stroke={P.trufaOscura} strokeWidth="0.2" strokeLinecap="round" aria-hidden="true" />
              <ellipse cx="-0.38" cy="-10.8" rx="0.34" ry="0.16" fill="#fffaf0" opacity="0.55" aria-hidden="true" />
              {/* filtrum (el surco del labio, de la trufa al labio superior) */}
              <path d="M 0,-9.35 L 0,-8.6" stroke={INK} strokeWidth="0.3" strokeLinecap="round" opacity="0.8" aria-hidden="true" />
              {boca}
              {/* la QUIJADA: media luna suave bajo el mentón (tapa la costura
                  de tinta cráneo→gola SIN el zigzag-collar de la v. anterior) */}
              <path d="M -1.95,-6.85 C -1.0,-6.05 1.0,-6.05 1.95,-6.85 C 1.0,-6.3 -1.0,-6.3 -1.95,-6.85 Z"
                fill={P.antifazSombra} opacity="0.8" aria-hidden="true" />
              {/* el pliegue del mentón (el gesto contenido aprieta la quijada) */}
              <path d="M -0.85,-6.95 C -0.28,-6.75 0.28,-6.75 0.85,-6.95" fill="none"
                stroke={P.hocicoSombra} strokeWidth="0.3" strokeLinecap="round" opacity="0.7" aria-hidden="true" />
            </g>
          </g>{/* /escala de lámina */}
          </g>
        </g>

        {/* ═══ HUESO-BRAZO DERECHO: hombro→brazo macizo→ZARPA que EMPUÑA el
            bastón (garras sobre el palo). En 'celebra' alza el cayado entero. */}
        <g className="crt-brazo-r" style={{ transformBox: 'fill-box', transformOrigin: 'top left' }}>
          <path d="M 5.0,-7.6 C 8.9,-8.05 11.7,-6.5 12.4,-4.5 C 12.9,-3.2 12.9,-2.1 12.5,-1.2 C 11.5,-0.7 10.4,-1.0 10.1,-1.9 C 9.8,-3.2 8.8,-4.3 7.3,-4.8 C 6.6,-5.1 5.8,-5.2 5.0,-5.1 Z"
            fill={`url(#${masa})`} stroke={INK} strokeWidth="1.0" strokeLinejoin="round" />
          <ellipse cx="8.9" cy="-5.4" rx="2.0" ry="1.2" fill={P.cuerpoLuz} opacity="0.6"
            transform="rotate(24 8.9 -5.4)" filter={`url(#${pincel})`} aria-hidden="true" />
          {/* rim-light del hombro del bastón */}
          <path d="M 6.4,-7.2 C 9.2,-7.2 11.2,-6.0 11.9,-4.2" fill="none"
            stroke={P.brillo} strokeWidth="0.55" strokeLinecap="round" opacity="0.6" aria-hidden="true" />
          {baston}
          {/* LA ZARPA QUE EMPUÑA, encima del palo: puño con garras que agarran */}
          <ZarpaMano cx={11.0} cy={-1.65} r={2.3} rot={4} garrasAbajo={false} P={P} INK={INK} />
          {/* los dedos que cierran SOBRE el palo (la tinta los lee) */}
          <g aria-hidden="true" fill="none" stroke={INK} strokeWidth="0.35" strokeLinecap="round" opacity="0.65">
            <path d="M 10.1,-2.3 C 10.8,-2.5 11.5,-2.5 12.0,-2.2" />
            <path d="M 10.1,-1.6 C 10.8,-1.8 11.5,-1.8 12.0,-1.5" />
            <path d="M 10.2,-0.9 C 10.8,-1.1 11.4,-1.1 11.9,-0.85" />
          </g>
        </g>

      </g>{/* /osb-columna */}

      {/* Prop del mundo en la mano libre. */}
      {propMundo}

      {/* Vaho del resoplido (el huff familiar de los osos de la casa). */}
      {vaho}
    </g>
  );

  // Antics de VIDA solo vivo; en modo NORMAL (el 70%) el CSS los apaga (el oso
  // de la lámina no da volteretas) y en ACTUANDO corren con toda la goma. Los
  // estados (florece/resopla/camina) los pisan igual que siempre.
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': OSO_BASTON_SLUG,
    'data-pose': vivo ? poseFx : undefined,
    'data-modo': vivo ? modoFx : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-florece': floreceFx ? '1' : undefined,
    'data-resopla': resoplaFx ? '1' : undefined,
    'data-vida': momento || undefined,
    'data-lineboil': lineBoil ? '1' : undefined,
    'data-prop': mundoId || undefined,
  };
  const estiloRaiz = { ...ritmoPropio, ...estiloClima };

  if (inline) {
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
  // MODO PODER (standalone): aura VERDE del bastón florecido, 4 capas.
  if (poder) {
    return (
      <span
        className="is-powered-up osb-poder"
        data-creature-poder={OSO_BASTON_SLUG}
        style={{ '--aura-color': auraDeBicho(OSO_BASTON_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default OsoBaston;
