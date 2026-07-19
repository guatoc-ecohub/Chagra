import { useId, useRef } from 'react';
import './creatures.css';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { CreatureFilters } from './_filters.jsx';
import { BocaVisema } from './_rubberhose.jsx';
import {
  OSO_GUARDIAN_PALETA, OSO_GUARDIAN_PROPORCION, OSO_GUARDIAN_SLUG,
  OSO_GUARDIAN_TINTA, PERFIL_OSO_GUARDIAN,
} from './osoGuardianIdentidad.js';
import { cuerpoDeClima, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Oso guardián — Tremarctos ornatus, EL GUARDIÁN NEGRO DE LA LUNA.
   Tercera y definitiva dirección de arte del oso de anteojos, sobre la BASE
   aprobada por el operador (dashboard/GuardianEspiritu → AvatarOso): pelaje
   AZABACHE AZULADO casi silueta, luz MENTA medida en el contorno, la LUNA
   CRECIENTE crema en el pecho (su emblema, conservado) y los anteojos del oso
   andino hechos de AROS DE LUZ que respiran.

   QUÉ CORRIGE de los dos osos rechazados (el café OsoAndino y el OsoAnteojos
   de peluche) — el mandato "que no se vea tan infantil":
   · PROPORCIONES DE ADULTO: cabeza chica (ratio cabeza:hombros ≈ 1:3, antes
     ≈ 1:1.6) hundida en una JOROBA de hombros anchos; la silueta es un PATH
     propio de mole plantígrada sentada como montaña — no el círculo-sobre-
     elipse del peluche. Hocico canela PRESENTE que proyecta del cráneo,
     carrilleras que ensanchan la cara abajo (cara adulta, no carita redonda).
   · OJOS CON ALMA, NO DE JUGUETE: almendras oscuras de párpado pesado con
     iris menta-luz chico y catchlight — dentro de los aros luminosos. Nada de
     esclerótica blanca con pupila gigante (OjosRubber queda fuera adrede).
   · SIN TERNURA POSTIZA: cero cachetes de rubor, cero sonrisa amplia (la boca
     es un arco breve y calmo), orejas chicas y bajas de oso real. QUIETUD:
     la cabeza no se mece — la gravitas vive en el respirar lento de la mole,
     el aliento de los aros y el latido de la luna.
   · PRESENCIA SIN MIEDO (registro Mufasa): impone por MASA (sombra de suelo,
     boil pesado oso-boil, garras visibles pero romas) y serenidad (cejas casi
     horizontales con caída interna mínima), jamás por amenaza: ni colmillos,
     ni ceño bravo, ni ojos vacíos.

   Hereda la fundación transversal de la familia (cero código duplicado):
   lip-sync (BocaVisema), clima→cuerpo (PERFIL_OSO_GUARDIAN), ropa por clima
   (fila 'oso-andino': misma especie, mismos umbrales de páramo), vida propia
   (repertorio 'oso-andino': resopla/rasca/reposo — aquí el rascado es un
   remecerse de peso, digno), line-boil y modo poder (aura MENTA). Todo se
   PODA en tier bajo / reduced-motion a un fotograma digno y quieto. */
const VIEWBOX = '-16 -20 32 40';

/* GARRAS del plantígrado: cuatro uñas cortas y ROMAS que asoman del borde de
   la planta, en hueso-menta que agarra la luz de luna. Identidad de especie y
   señal de adulto — nunca amenaza (curvas suaves, puntas redondas). */
function Garras({ xs, y, color, largo = 1.2 }) {
  return (
    <g aria-hidden="true" stroke={color} strokeWidth="0.55" strokeLinecap="round" fill="none" opacity="0.9">
      {xs.map((x, i) => (
        <path key={i} d={`M${x},${y} q0.12,${largo * 0.62} 0.02,${largo}`} />
      ))}
    </g>
  );
}

/* ESPORAS del bosque nublado — bioluminiscencia que flota lento alrededor de
   la mole (reusa la cadencia osoa-mota ya existente). Delays/duraciones
   propios: vida, no metrónomo. */
const ESPORAS = [
  { cx: -11.8, cy: -5.2, r: 0.46, d: 0, s: 6.9 },
  { cx: 12.2, cy: -1.4, r: 0.4, d: -2.2, s: 7.5 },
  { cx: -9.6, cy: 9.4, r: 0.34, d: -3.9, s: 6.1 },
  { cx: 10.2, cy: -8.8, r: 0.44, d: -1.5, s: 6.5 },
  { cx: -13.2, cy: 1.6, r: 0.3, d: -4.8, s: 7.8 },
];

/* LA SILUETA DE LA MOLE (el corazón del rediseño): un solo path de oso sentado
   como montaña — joroba de hombros arriba, flancos que se abren a las ancas,
   asiento ancho. Nada de elipse de peluche. */
const SILUETA_MOLE =
  'M -10.9,13.1 '
  + 'C -13.3,10.6 -13.9,6.2 -12.6,1.8 '
  + 'C -11.8,-1.6 -10.7,-4.2 -9.0,-6.3 '
  + 'C -7.2,-8.6 -4.0,-9.8 0,-9.8 '
  + 'C 4.0,-9.8 7.2,-8.6 9.0,-6.3 '
  + 'C 10.7,-4.2 11.8,-1.6 12.6,1.8 '
  + 'C 13.9,6.2 13.3,10.6 10.9,13.1 '
  + 'C 7.4,13.9 -7.4,13.9 -10.9,13.1 Z';

/* LA LUNA CRECIENTE del pecho — el emblema conservado de la base. Media
   circunferencia externa (r 3.0, centrada en 0,-2.2) + arco interno tendido
   (r 3.4) = creciente que abre a la derecha. Ligeramente rotada: un emblema
   colgado con gracia, no un icono clavado. */
const LUNA_CRECIENTE = 'M 0,-5.55 A 3.35,3.35 0 1 0 0,1.15 A 3.8,3.8 0 0 1 0,-5.55 Z';

export function OsoGuardian({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Oso guardián',
  /* Pose de VIDA species-agnostic (gestos rh-g-* de creatures.css):
     'anda' (base) | 'celebra' | 'reposo' | 'señala'. Con animated=false o
     reduced-motion queda en fotograma digno. */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil de bosque altoandino). Sin clima
     (avatares, catálogo) = neutro digno. */
  clima = null,
  enso = 'neutro',
  /* Lip-sync transversal (useLipSync → 'V1'..'V4'). Sin visema = el arco
     breve y calmo de siempre. */
  visema = null,
  /* Vestuario por clima+hora (opt-in): RUANA de noche/frío del páramo. Nunca
     sombrero ni sudor (el oso de niebla no se acalora). */
  vestuario = false,
  tempC = undefined,
  /* RESOPLA (opt-in): el huff pesado del guardián — vaho por la trufa, pecho
     que hincha y suelta. Refunfuño grave, no berrinche. */
  resopla = false,
  /* RASCA (opt-in): en este oso el "rascado" del repertorio es un REMECERSE
     de peso lento (oso-rasca-cuerpo), sin manoteo — la mole se acomoda. */
  rasca = false,
  /* VIDA PROPIA (idle-cerebro v2): default ON. Reusa el repertorio
     'oso-andino' de vidaEstados.js (misma especie, mismo temperamento lento). */
  vida = true,
  /* Device-tier: 'bajo' apaga el idle continuo; quedan los estados reactivos. */
  tier,
  /* Line-boil (opt-in, capa cara): reservado para su entrada heroica. */
  lineBoil = false,
  /* MODO PODER (opt-in, standalone): aura MENTA bioluminiscente. */
  poder = false,
  /* Prop por mundo (opt-in): la herramienta en su zarpa izquierda. */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const pelaje = `crt-pelaje-${uid}`;
  const lunaGrad = `crt-luna-${uid}`;
  /* HALOS POR GRADIENTE RADIAL (no por blur): los círculos blureados del kit
     recortan su región de filtro en un CUADRADO visible sobre el pelaje
     oscuro (verificado empíricamente con el halo de la luna). El gradiente
     cae suave hasta opacidad 0 sin filtro — y es más barato en GPU. */
  const haloCrema = `osog-halo-crema-${uid}`;
  const haloMenta = `osog-halo-menta-${uid}`;
  const haloSombra = `osog-halo-sombra-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.08, Math.min(0.26, 0.1 + 0.16 * (energia ?? 1)));
  const auraR = 9.5 + 1.6 * (energia ?? 1);

  // ═══ VIDA PROPIA (idle-cerebro + ritmo propio + mirada — vara Angelita v2).
  // Repertorio 'oso-andino': misma especie (Tremarctos), temperamento lento ya
  // afinado — cero filas duplicadas.
  const raizRef = useRef(null);
  const ritmoPropio = useRitmoPropio();
  const enBase = pose === 'anda' && !resopla && !rasca && !visema;
  const momento = useVidaIdle('oso-andino', vida && vivo && tier !== 'bajo' && enBase);
  useMiradaUsted(raizRef, vida && vivo && tier !== 'bajo');
  const resoplaFx = resopla || momento === 'resopla';
  const rascaFx = rasca || momento === 'rasca';
  const poseFx = momento === 'reposo' ? 'reposo' : pose;

  // CLIMA → cuerpo (determinista): tinte + opacidad al contorno. Sin alas.
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_OSO_GUARDIAN });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // Vestuario por clima+hora (opt-in): fila 'oso-andino' compartida (misma
  // especie, mismos umbrales de páramo). Sombrero/sudor suprimidos SIEMPRE.
  const ropaBase = (vestuario && clima) ? ropaDeClimaBicho('oso-andino', clima, { tempC }) : null;
  const ropa = ropaBase ? { ...ropaBase, sombrero: false, sudor: false } : null;

  const P = OSO_GUARDIAN_PALETA;
  const PR = OSO_GUARDIAN_PROPORCION;
  const INK = OSO_GUARDIAN_TINTA;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* PELAJE CON VOLUMEN: luz de luna azulada arriba-izquierda → azabache
          medio → sombra ventral casi negra. Viste mole y cráneo. */}
      <radialGradient id={pelaje} cx="40%" cy="26%" r="88%">
        <stop offset="0%" stopColor={P.cuerpoLuz} />
        <stop offset="50%" stopColor={P.cuerpo} />
        <stop offset="100%" stopColor={P.cuerpoSombra} />
      </radialGradient>
      {/* LA LUNA con cuerpo propio: crema-luz al borde iluminado → crema-sombra
          hacia el interior (que no sea un sticker plano). */}
      <radialGradient id={lunaGrad} cx="30%" cy="35%" r="90%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="55%" stopColor={P.luna} />
        <stop offset="100%" stopColor="#dcf5e9" />
      </radialGradient>
      {/* halos suaves sin filtro (ver nota en los ids) */}
      <radialGradient id={haloCrema}>
        <stop offset="0%" stopColor={P.lunaHalo} stopOpacity="1" />
        <stop offset="55%" stopColor={P.lunaHalo} stopOpacity="0.55" />
        <stop offset="100%" stopColor={P.lunaHalo} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={haloMenta}>
        <stop offset="0%" stopColor={P.menta} stopOpacity="1" />
        <stop offset="55%" stopColor={P.menta} stopOpacity="0.5" />
        <stop offset="100%" stopColor={P.menta} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={haloSombra}>
        <stop offset="0%" stopColor="#040a12" stopOpacity="0.55" />
        <stop offset="70%" stopColor="#040a12" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#040a12" stopOpacity="0" />
      </radialGradient>
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // VAHO del resoplido: motas frías que salen de la trufa y se disuelven.
  const vaho = resoplaFx ? (
    <g className="crt-vaho" fill={P.lunaHalo} aria-hidden="true" opacity="0.65">
      <circle className={vivo ? 'crt-vaho-mota' : undefined} cx="2.4" cy="-8.8" r="1.0" />
      <circle className={vivo ? 'crt-vaho-mota' : undefined} style={{ animationDelay: '-0.7s' }} cx="3.3" cy="-7.8" r="0.8" />
    </g>
  ) : null;

  // PROP DEL MUNDO junto a la zarpa izquierda.
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={-11.3} y={8.6} escala={0.74} ink={INK} animated={vivo} />
  ) : null;

  // BOCA: lip-sync si narra; si no, el arco BREVE y calmo (no sonrisa amplia
  // de mascota — serenidad, no ternura postiza).
  // BOCA: lip-sync si narra (BocaVisema del kit); si no, un arco BREVE y calmo
  // en trazo fino — la Sonrisa del kit (0.9 de grosor) se funde con la trufa a
  // esta escala de hocico y hace blob; el guardián lleva la boca apenas dicha.
  const boca = visema
    ? <BocaVisema cx={0} cy={-8.8} w={2.4} prof={0.8} visema={visema} ink={INK} />
    : (
      <path d="M -1.05,-8.85 Q 0,-8.42 1.05,-8.85" fill="none"
        stroke={INK} strokeWidth="0.5" strokeLinecap="round" />
    );

  // ── EL DIBUJO (atrás→adelante): sombra de suelo, aura menta, patas traseras
  //    asomando, LA MOLE (path propio), rim-light lunar + pelaje sugerido,
  //    LA LUNA del pecho, columnas delanteras con garras, cabeza (orejas
  //    chicas, cráneo, carrilleras, aros de luz, ojos-almendra, hocico canela),
  //    bruma y esporas. `.crt-body` respira con oso-boil (pesado, lento).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* SOMBRA DE SUELO — el peso de la montaña (masa real, no sticker). */}
      <ellipse cx="0" cy="14.35" rx="12.4" ry="2.1" fill={`url(#${haloSombra})`} aria-hidden="true" />
      {/* aura menta tenue: bioluminiscencia de niebla, no neón de feria */}
      <circle cx="0" cy="1.5" r={auraR + 2} fill={`url(#${haloMenta})`} opacity={auraOp * 0.5} />

      {/* PATAS TRASERAS del plantígrado sentado: las plantas asoman adelante,
          a los lados de la mole (postura real de oso sentado). */}
      <g aria-hidden="true">
        <ellipse cx="-10.5" cy="13.15" rx="2.35" ry="1.35" fill={P.planta} stroke={INK} strokeWidth="0.8" />
        <ellipse cx="10.5" cy="13.15" rx="2.35" ry="1.35" fill={P.planta} stroke={INK} strokeWidth="0.8" />
        <Garras xs={[-11.5, -10.5, -9.5]} y={13.9} color={P.garra} largo={0.95} />
        <Garras xs={[9.5, 10.5, 11.5]} y={13.9} color={P.garra} largo={0.95} />
      </g>

      {/* ═══ LA MOLE — la silueta que manda: joroba de hombros, flancos a las
          ancas, asiento de montaña. El halo menta va MEDIDO en el drop-shadow
          (la estética del avatar aprobado, sin contorno de neón chillón). */}
      <path d={SILUETA_MOLE} fill={`url(#${pelaje})`} stroke={INK} strokeWidth="1.35"
        strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${P.cuerpoGlow})` }} />

      {/* RIM-LIGHT LUNAR — la luz que dibuja al guardián por el lado de la
          luna (izquierdo), con un eco tenue al flanco derecho. Es EL trazo
          neón de la base, vuelto luz de borde con criterio. */}
      <g aria-hidden="true" fill="none" strokeLinecap="round">
        <path d="M -12.4,3.0 C -11.6,-2.2 -9.6,-6.3 -5.2,-8.9" stroke={P.menta}
          strokeWidth="0.85" opacity="0.55" style={{ filter: `drop-shadow(0 0 2.5px ${P.menta})` }} />
        <path d="M 12.45,4.0 C 12.9,7.4 12.4,10.6 10.9,13.0" stroke={P.menta}
          strokeWidth="0.7" opacity="0.18" />
      </g>

      {/* PELAJE SUGERIDO en la silueta: mechones cortos a contraluz en joroba,
          flancos y ancas + definición muscular tenue (deltoides y pectoral).
          Sugiere, no delinea — la mole sigue siendo casi silueta. */}
      <g aria-hidden="true" fill="none" stroke={P.cuerpoLuz} strokeLinecap="round">
        <g strokeWidth="0.5" opacity="0.5">
          <path d="M -4.6,-9.15 l 0.5,-0.55 l 0.45,0.62 l 0.5,-0.55" />
          <path d="M 4.6,-9.15 l -0.5,-0.55 l -0.45,0.62 l -0.5,-0.55" />
          <path d="M -12.9,4.6 l 0.75,0.5 l -0.7,0.62 l 0.72,0.58" />
          <path d="M 12.9,5.6 l -0.75,0.5 l 0.7,0.62 l -0.72,0.58" />
          <path d="M -11.9,9.2 l 0.7,0.4 l -0.6,0.6" />
        </g>
        <g strokeWidth="0.55" opacity="0.22">
          <path d="M -9.9,-4.4 C -8.7,-2.0 -7.3,-0.6 -5.5,0.3" />
          <path d="M 9.9,-4.4 C 8.7,-2.0 7.3,-0.6 5.5,0.3" />
          <path d="M -3.4,-6.4 C -1.5,-5.3 1.5,-5.3 3.4,-6.4" />
        </g>
      </g>

      {/* derrame de luz de la luna sobre el vientre (bajísima opacidad) */}
      <ellipse cx="0" cy="7" rx="2.6" ry="3.6" fill={P.lunaHalo} opacity="0.04" aria-hidden="true" />

      {/* ═══ LA LUNA CRECIENTE — el emblema del pecho, CONSERVADO de la base y
          con PRESENCIA real (no un sticker apagado): halo que respira
          (osog-luna), cuerpo blanco-crema encendido, mares tenues y un anillo
          de radiancia menta apenas insinuado. */}
      <g aria-hidden="true">
        <circle className={vivo ? 'osog-luna' : undefined} cx="-0.9" cy="-2.2" r="5.4"
          fill={`url(#${haloCrema})`} opacity="0.26" />
        <circle cx="-0.6" cy="-2.2" r="3.9" fill="none" stroke={P.menta} strokeWidth="0.35" opacity="0.12" />
        <g transform="rotate(14 0 -2.2)">
          <path d={LUNA_CRECIENTE} fill={`url(#${lunaGrad})`}
            style={{ filter: `drop-shadow(0 0 5px ${P.lunaHalo})` }} />
          {/* mares de la luna: el emblema tiene textura, no es una calcomanía */}
          <g fill={P.lunaSombra} opacity="0.45">
            <circle cx="-1.8" cy="-3.6" r="0.46" />
            <circle cx="-2.35" cy="-1.5" r="0.3" />
            <circle cx="-1.15" cy="-0.3" r="0.24" />
          </g>
        </g>
      </g>

      {/* PATAS DELANTERAS: columnas plantadas CORTAS (nacen bajo la luna — el
          pecho queda abierto para el emblema), redondeadas arriba, en sombra
          propia para despegarlas del pecho; plantas anchas y GARRAS visibles. */}
      <g>
        <path d="M -7.7,1.0 C -8.3,4.4 -8.3,8.6 -7.7,12.2 C -6.5,12.8 -5.1,12.8 -4.2,12.3 C -4.6,8.6 -4.6,4.6 -4.3,1.6 C -5.4,0.5 -6.9,0.4 -7.7,1.0 Z"
          fill={P.pata} stroke={INK} strokeWidth="0.85" strokeLinejoin="round" />
        <path d="M 7.7,1.0 C 8.3,4.4 8.3,8.6 7.7,12.2 C 6.5,12.8 5.1,12.8 4.2,12.3 C 4.6,8.6 4.6,4.6 4.3,1.6 C 5.4,0.5 6.9,0.4 7.7,1.0 Z"
          fill={P.pata} stroke={INK} strokeWidth="0.85" strokeLinejoin="round" />
        {/* rim menta finísimo en la columna del lado de la luna */}
        <path d="M -7.5,2.2 C -8.05,5.2 -8.05,8.8 -7.5,11.8" fill="none"
          stroke={P.menta} strokeWidth="0.4" opacity="0.28" aria-hidden="true" />
        <ellipse cx="-6.0" cy="12.7" rx="2.5" ry="1.45" fill={P.planta} stroke={INK} strokeWidth="0.85" />
        <ellipse cx="6.0" cy="12.7" rx="2.5" ry="1.45" fill={P.planta} stroke={INK} strokeWidth="0.85" />
        <Garras xs={[-7.6, -6.55, -5.5, -4.45]} y={13.35} color={P.garra} />
        <Garras xs={[4.45, 5.5, 6.55, 7.6]} y={13.35} color={P.garra} />
      </g>

      {/* ═══ CABEZA proporcionada, hundida en la joroba (sin cuello de peluche).
          QUIETA a propósito: la gravitas del guardián. */}
      <g>
        {/* orejas CHICAS y bajas de oso real (detrás del cráneo) */}
        <g aria-hidden="true">
          <circle cx="-3.05" cy="-15.85" r={PR.orejaR} fill={P.cuerpo} stroke={INK} strokeWidth="1.05" />
          <circle cx="-3.05" cy="-15.85" r={PR.orejaR * 0.44} fill="#352a63" />
          <circle cx="3.05" cy="-15.85" r={PR.orejaR} fill={P.cuerpo} stroke={INK} strokeWidth="1.05" />
          <circle cx="3.05" cy="-15.85" r={PR.orejaR * 0.44} fill="#352a63" />
        </g>
        {/* cráneo (elipse levemente más ancha que alta: testa de oso adulto) */}
        <ellipse cx="0" cy="-12.9" rx={PR.cabezaRx} ry={PR.cabezaRy}
          fill={`url(#${pelaje})`} stroke={INK} strokeWidth="1.25" />
        {/* rim lunar del cráneo (el lado de la luna) */}
        <path d="M -4.05,-13.6 C -3.3,-15.6 -1.5,-16.5 0.4,-16.45" fill="none"
          stroke={P.menta} strokeWidth="0.6" opacity="0.4" strokeLinecap="round" aria-hidden="true" />
        {/* CARRILLERAS: sombras que ensanchan la cara abajo — cara adulta,
            no carita redonda de cría */}
        <g aria-hidden="true" fill={P.cuerpoSombra} opacity="0.55">
          <ellipse cx="-2.9" cy="-10.4" rx="1.7" ry="1.4" />
          <ellipse cx="2.9" cy="-10.4" rx="1.7" ry="1.4" />
        </g>
        {/* mechones de mejilla a contraluz */}
        <g aria-hidden="true" fill="none" stroke={P.cuerpoLuz} strokeWidth="0.45" strokeLinecap="round" opacity="0.45">
          <path d="M -4.15,-11.6 l 0.66,0.3 l -0.55,0.5" />
          <path d="M 4.15,-11.6 l -0.66,0.3 l 0.55,0.5" />
        </g>

        {/* aliento de los AROS (detrás del trazo): respira despacio */}
        <g className={vivo ? 'osoa-anteojo-brillo' : undefined} aria-hidden="true"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          <circle cx="-1.85" cy="-13.05" r="2.6" fill={`url(#${haloCrema})`} opacity="0.32" />
          <circle cx="1.85" cy="-13.05" r="2.6" fill={`url(#${haloCrema})`} opacity="0.32" />
        </g>
        {/* ═══ LOS ANTEOJOS DE LUZ — la firma de la base, asimétricos como el
            patrón real: el izquierdo casi cierra; el derecho abre por abajo y
            DERRAMA su lágrima por el hocico, camino de la luna del pecho. */}
        <g aria-hidden="true" fill="none" strokeLinecap="round">
          <ellipse cx="-1.85" cy="-13.05" rx="1.52" ry="1.68" transform="rotate(-8 -1.85 -13.05)"
            stroke={P.anteojo} strokeWidth="0.8" strokeDasharray="8.6 1.5" strokeDashoffset="-2.2"
            style={{ filter: `drop-shadow(0 0 2.5px ${P.anteojoGlow})` }} />
          <ellipse cx="1.85" cy="-13.05" rx="1.52" ry="1.68" transform="rotate(8 1.85 -13.05)"
            stroke={P.anteojo} strokeWidth="0.8" strokeDasharray="7.6 2.5" strokeDashoffset="-8.6"
            style={{ filter: `drop-shadow(0 0 2.5px ${P.anteojoGlow})` }} />
          <path d="M 3.05,-11.8 C 3.55,-10.5 3.35,-9.3 2.55,-8.35"
            stroke={P.anteojo} strokeWidth="0.7" opacity="0.85" />
        </g>

        {/* CEJAS del sereno: casi horizontales, caída interna mínima —
            seriedad noble (Mufasa), jamás ceño bravo. Respiran apenas
            (oso-cejas) y se aprietan al resoplar. */}
        <g className="oso-cejas" stroke={P.ceja} strokeWidth="0.85" strokeLinecap="round" fill="none" opacity="0.85">
          <path d="M -3.1,-14.88 C -2.35,-15.28 -1.35,-15.24 -0.8,-14.96" />
          <path d="M 3.1,-14.88 C 2.35,-15.28 1.35,-15.24 0.8,-14.96" />
        </g>

        {/* ═══ OJOS-ALMENDRA con alma (no ojos-juguete): párpado pesado, iris
            menta-luz chico, pupila honda y catchlight. Parpadean y dardean con
            el kit (rh-blink / rh-mirada). */}
        <g className={vivo ? 'rh-blink' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          <path d="M -2.82,-13.05 Q -1.85,-13.9 -0.88,-13.05 Q -1.85,-12.32 -2.82,-13.05 Z"
            fill={P.ojo} stroke={INK} strokeWidth="0.3" />
          <path d="M 0.88,-13.05 Q 1.85,-13.9 2.82,-13.05 Q 1.85,-12.32 0.88,-13.05 Z"
            fill={P.ojo} stroke={INK} strokeWidth="0.3" />
          <g className={vivo ? 'rh-mirada' : undefined}>
            <circle cx="-1.85" cy="-13.0" r="0.6" fill={P.iris} opacity="0.95" />
            <circle cx="1.85" cy="-13.0" r="0.6" fill={P.iris} opacity="0.95" />
            <circle cx="-1.85" cy="-13.0" r="0.33" fill="#03120c" />
            <circle cx="1.85" cy="-13.0" r="0.33" fill="#03120c" />
            <circle cx="-2.05" cy="-13.2" r="0.15" fill={P.luna} />
            <circle cx="1.65" cy="-13.2" r="0.15" fill={P.luna} />
          </g>
        </g>

        {/* HOCICO canela PRESENTE (proyecta del cráneo — la única nota cálida,
            heredada del avatar aprobado): puente, trufa con brillo frío,
            surco y la boca calma. */}
        <path d="M -1.75,-12.2 C -2.15,-10.35 -1.5,-8.6 0,-8.35 C 1.5,-8.6 2.15,-10.35 1.75,-12.2 C 1.05,-13.0 -1.05,-13.0 -1.75,-12.2 Z"
          fill={P.hocico} stroke={INK} strokeWidth="0.75" strokeLinejoin="round" />
        <path d="M -0.95,-12.35 C -0.3,-12.65 0.3,-12.65 0.95,-12.35" fill="none"
          stroke={P.hocicoSombra} strokeWidth="0.45" opacity="0.6" aria-hidden="true" />
        <ellipse cx="0" cy="-9.85" rx="0.88" ry="0.62" fill={P.trufa} />
        <ellipse cx="-0.3" cy="-10.05" rx="0.26" ry="0.16" fill={P.lunaHalo} opacity="0.5" />
        <path d="M 0,-9.25 L 0,-9.0" stroke={INK} strokeWidth="0.4" strokeLinecap="round" />
        {boca}
      </g>

      {/* Vestuario por clima+hora (RUANA de noche/frío del páramo). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 2, rx: PR.hombrosRx, ry: PR.troncoRy }}
          cabeza={{ cx: 0, cy: -12.9, r: PR.cabezaRx }}
          animated={vivo}
        />
      )}

      {/* Prop del mundo junto a la zarpa. */}
      {propMundo}

      {/* Vaho del resoplido (el huff grave del guardián). */}
      {vaho}

      {/* BRUMA a los pies — el velo del bosque nublado (tenue). */}
      <ellipse cx="0" cy="13.7" rx="11.6" ry="2.3" fill={`url(#${haloMenta})`} opacity="0.09"
        aria-hidden="true" />

      {/* ESPORAS del bosque nublado (cadencia osoa-mota compartida). */}
      <g aria-hidden="true" fill={P.espora}>
        {ESPORAS.map((m, i) => (
          <circle key={i} className={vivo ? 'osoa-mota' : undefined}
            cx={m.cx} cy={m.cy} r={m.r} opacity="0.3"
            style={vivo ? { animationDelay: `${m.d}s`, animationDuration: `${m.s}s` } : undefined} />
        ))}
      </g>
    </g>
  );

  // Antics de VIDA solo viva; el CSS los apaga con RM / tier bajo / estados
  // (un guardián que resopla no da además vueltas de campana).
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': OSO_GUARDIAN_SLUG,
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
  const estiloRaiz = { ...ritmoPropio, ...estiloClima };

  if (inline) {
    // En modo inline el power-up lo pone el host DOM; acá solo data-poder.
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
  // MODO PODER (standalone): aura MENTA bioluminiscente de 4 capas.
  if (poder) {
    return (
      <span
        className="is-powered-up osog-poder"
        data-creature-poder={OSO_GUARDIAN_SLUG}
        style={{ '--aura-color': auraDeBicho(OSO_GUARDIAN_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default OsoGuardian;
