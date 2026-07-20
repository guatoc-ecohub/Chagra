import { useId, useRef } from 'react';
import './creatures.css';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { CreatureFilters } from './_filters.jsx';
import { BocaVisema } from './_rubberhose.jsx';
import {
  OSO_GUARDIAN_PALETA, OSO_GUARDIAN_PROPORCION,
  OSO_GUARDIAN_SLUG, OSO_GUARDIAN_TINTA, PERFIL_OSO_GUARDIAN,
} from './osoGuardianIdentidad.js';
import { cuerpoDeClima, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { RuanaGuardian } from './RuanaGuardian.jsx';
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

   QUÉ CORRIGE ESTA PASADA — la revisión visual a 760 px marcó tres defectos,
   y son los tres del CUERPO. La cara, la luna del pecho y el rim menta pasaron
   la revisión y NO se tocaron:
   · NO TENÍA ANATOMÍA, ERA UN DOMO. El cuerpo era una campana lisa sin cruz,
     sin cuello y sin grupa, con la cabeza pegada encima como calcomanía. Ahora
     la silueta recorre las marcas reales del Tremarctos (grupa → cintura →
     costillar → cruz → cuello), el trapecio sube ESCONDIDO tras el cráneo para
     que la cabeza nazca del cuerpo, y una GOLILLA de pelaje denso —el
     "ahuecado" de hombros que documenta la DR— remacha la costura.
   · LAS EXTREMIDADES NO EXISTÍAN. Al frente había dos rectángulos redondeados
     flotando a media panza; atrás, cuatro juegos de garras apoyados en el piso
     SIN PATAS que los sostuvieran. Ahora los brazos nacen del deltoides y son
     largos (esta especie los tiene más largos que las traseras: es trepadora),
     y las traseras tienen caña y planta plantígrada completa.
   · LA RUANA ERA UNA TABLA. Ver RuanaGuardian.jsx: se fue el trapecio genérico
     de AccesoriosClima y entró una prenda con caída, pliegue y punta al hombro.

   Lo que ya venía bien de la pasada anterior y se conserva:
   · PROPORCIONES DE ADULTO: cabeza chica (ratio cabeza:hombros ≈ 1:3, antes
     ≈ 1:1.6). Hocico canela PRESENTE que proyecta del cráneo, carrilleras que
     ensanchan la cara abajo (cara adulta, no carita redonda).
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
  { cx: -12.2, cy: -6.4, r: 0.46, d: 0, s: 6.9 },
  { cx: 12.6, cy: -3.0, r: 0.4, d: -2.2, s: 7.5 },
  { cx: -14.4, cy: 4.6, r: 0.34, d: -3.9, s: 6.1 },
  { cx: 10.6, cy: -9.8, r: 0.44, d: -1.5, s: 6.5 },
  { cx: -13.9, cy: -1.2, r: 0.3, d: -4.8, s: 7.8 },
];

/* ═══ LA SILUETA — ANATOMÍA DE OSO, NO UN DOMO.
 *
 * La versión anterior era una campana lisa: sin cruz, sin cuello, sin grupa, y
 * con la cabeza apoyada encima como calcomanía. Este path recorre las marcas
 * reales del Tremarctos ornatus (DR gemini, 2026-06-19), de abajo a arriba por
 * el costado izquierdo y espejado de vuelta:
 *
 *   ASIENTO → GRUPA (±12.5, el punto MÁS ancho del oso sentado: son las ancas)
 *   → CINTURA (±10.2: hay talle. Es un trepador musculoso, no una bola. El
 *     estrechamiento es del 18% y GRADUAL — la especie no tiene cintura de
 *     avispa, la DR es explícita en que la transición es suave)
 *   → COSTILLAR de pecho profundo → CRUZ (la paletilla sube hasta y≈-11, POR
 *     ENCIMA de la base del cráneo, y asoma a los costados de la cabeza)
 *   → CUELLO CORTO Y MUSCULOSO: el trapecio sigue subiendo hasta y≈-14, pero
 *     ahí ya va ESCONDIDO detrás del cráneo. Ese tramo es el que hace que la
 *     cabeza NAZCA del cuerpo en vez de posarse encima. Es literalmente lo
 *     único que separa un oso de un muñeco de nieve.
 *
 * Ojo con la cruz: es pelaje denso, el "ahuecado" de hombro que describe la DR
 * — NO la joroba del oso pardo, que esta especie no tiene. Si se exagera, deja
 * de ser un oso andino y pasa a ser un grizzly. */
const SILUETA_MOLE =
  'M -10.6,13.6 '
  + 'C -12.2,12.0 -12.8,9.8 -12.5,7.4 '     // grupa: las ancas, lo más ancho
  + 'C -12.2,5.0 -10.6,3.0 -10.2,1.0 '      // cintura: el talle del trepador
  + 'C -9.9,-1.4 -10.2,-4.0 -9.7,-5.8 '     // costillar: el pecho es profundo
  + 'C -9.0,-7.8 -7.6,-9.6 -5.8,-10.9 '     // CRUZ: la paletilla sube
  + 'C -4.8,-11.8 -4.0,-12.8 -2.7,-13.6 '   // cuello corto: el trapecio…
  + 'C -1.5,-14.2 1.5,-14.2 2.7,-13.6 '     // …y acá va oculto tras el cráneo
  + 'C 4.0,-12.8 4.8,-11.8 5.8,-10.9 '
  + 'C 7.6,-9.6 9.0,-7.8 9.7,-5.8 '
  + 'C 10.2,-4.0 9.9,-1.4 10.2,1.0 '
  + 'C 10.6,3.0 12.2,5.0 12.5,7.4 '
  + 'C 12.8,9.8 12.2,12.0 10.6,13.6 '
  + 'C 7.2,14.4 -7.2,14.4 -10.6,13.6 Z';

/* ═══ PATA TRASERA del plantígrado sentado (`s`: -1 izquierda, +1 derecha).
 *
 * El defecto que corrige: antes había CUATRO JUEGOS DE GARRAS apoyados en el
 * piso sin ninguna pata que los sostuviera. Era lo que más gritaba "sin
 * terminar".
 *
 * El muslo ya vive en la silueta (es el bulto de la grupa); lo que falta y se
 * dibuja acá es la CAÑA que baja de ese muslo hasta el tobillo. Va por delante
 * del flanco, así que se lee por su contorno sobre el cuerpo oscuro. */
function canaTrasera(s) {
  const x = (v) => (s * v).toFixed(2);
  return (
    `M ${x(10.3)},6.8 `
    + `C ${x(11.5)},8.6 ${x(12.2)},10.6 ${x(12.3)},12.3 `  // baja por fuera
    + `C ${x(12.35)},13.1 ${x(11.9)},13.6 ${x(11.0)},13.65 ` // tobillo
    + `C ${x(10.1)},13.7 ${x(9.5)},13.2 ${x(9.5)},12.4 `
    + `C ${x(9.45)},10.6 ${x(9.2)},8.6 ${x(8.6)},7.0 `      // corva interna
    + `C ${x(9.1)},6.4 ${x(9.8)},6.3 ${x(10.3)},6.8 Z`
  );
}

/* PLANTA TRASERA — plantígrada de verdad: apoya la planta COMPLETA, talón y
 * dedos, como nosotros. Por eso es larga y descansa entera sobre el suelo, no
 * de puntillas. Va abierta hacia afuera (postura real del oso sentado) con el
 * talón hacia adentro y los dedos al exterior: así los cuatro apoyos se leen
 * separados y no se pisan con las manos. */
function plantaTrasera(s) {
  const x = (v) => (s * v).toFixed(2);
  return (
    `M ${x(9.3)},12.5 `
    + `C ${x(8.4)},12.55 ${x(7.9)},13.05 ${x(7.95)},13.7 `   // talón (interno)
    + `C ${x(8.0)},14.3 ${x(8.9)},14.6 ${x(10.2)},14.55 `
    + `C ${x(11.8)},14.5 ${x(13.0)},14.25 ${x(13.4)},13.65 ` // dedos (externo)
    + `C ${x(13.7)},13.15 ${x(13.3)},12.55 ${x(12.4)},12.45 `
    + `C ${x(11.3)},12.3 ${x(10.2)},12.42 ${x(9.3)},12.5 Z`
  );
}

/* ═══ PATA DELANTERA. En esta especie las delanteras son MÁS LARGAS que las
 * traseras — es la adaptación trepadora, y es de las cosas que más rápido
 * distinguen un oso andino de un oso negro. Por eso el codo cae bajo y el
 * antebrazo es largo.
 *
 * Antes eran dos rectángulos redondeados verticales que arrancaban a media
 * panza, sin conexión con ningún hombro (porque no había hombro). Ahora nace
 * en el deltoides, baja por fuera, y el antebrazo entra hacia el centro hasta
 * la mano — que es como se sienta un oso: los brazos caen y se recogen. */
function brazo(s) {
  const x = (v) => (s * v).toFixed(2);
  return (
    `M ${x(8.7)},-7.0 `
    + `C ${x(9.4)},-4.4 ${x(9.6)},-1.4 ${x(9.3)},1.6 `      // brazo por fuera
    + `C ${x(9.0)},4.6 ${x(8.6)},7.6 ${x(8.2)},10.1 `       // antebrazo largo
    + `C ${x(7.9)},11.4 ${x(7.4)},12.1 ${x(6.6)},12.3 `     // muñeca
    + `C ${x(5.8)},12.5 ${x(5.2)},12.0 ${x(5.1)},11.0 `
    + `C ${x(5.2)},8.6 ${x(5.7)},5.6 ${x(6.1)},2.6 `        // borde interno
    + `C ${x(6.5)},-0.4 ${x(6.8)},-3.4 ${x(7.1)},-5.8 `
    + `C ${x(7.5)},-6.9 ${x(8.1)},-7.3 ${x(8.7)},-7.0 Z`
  );
}

/* MANO plantígrada apoyada: fondo plano contra el suelo (carga peso), lomo
 * redondo. Las garras salen del borde delantero. */
function mano(s) {
  const x = (v) => (s * v).toFixed(2);
  return (
    `M ${x(8.7)},12.4 `
    + `C ${x(8.75)},11.6 ${x(7.9)},11.15 ${x(6.4)},11.15 `
    + `C ${x(4.9)},11.15 ${x(4.05)},11.6 ${x(4.1)},12.4 `
    + `C ${x(4.15)},13.3 ${x(4.6)},13.85 ${x(6.4)},13.9 `   // el suelo
    + `C ${x(8.2)},13.85 ${x(8.65)},13.3 ${x(8.7)},12.4 Z`
  );
}

/* GOLILLA DEL CUELLO — el pelaje denso que la DR describe como un "ahuecado"
 * en cuello y hombros. Además de ser cierto, es el remache del problema de la
 * cabeza-calcomanía: una corona de mechones que monta sobre los hombros y pasa
 * por detrás del cráneo cose la cabeza al cuerpo. Los mechones del centro
 * quedan ocultos tras la cabeza; los que se ven son los de los flancos, que es
 * justo donde hacía falta la costura. */
const GOLILLA =
  'M -8.0,-7.0 '
  + 'C -7.8,-8.7 -7.0,-10.2 -5.8,-11.3 '
  + 'C -5.3,-10.2 -4.7,-11.5 -4.2,-10.4 '
  + 'C -3.7,-11.7 -3.1,-10.8 -2.5,-11.9 '
  + 'C -1.7,-10.8 -1.0,-12.1 -0.2,-11.0 '
  + 'C 0.6,-12.1 1.3,-10.8 2.1,-11.9 '
  + 'C 2.7,-10.8 3.3,-11.7 3.8,-10.4 '
  + 'C 4.3,-11.5 4.9,-10.2 5.4,-11.3 '
  + 'C 6.6,-10.2 7.4,-8.7 7.6,-7.0 '
  + 'C 5.0,-6.2 -5.4,-6.2 -8.0,-7.0 Z';

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
  const limboIzq = `osog-limbo-i-${uid}`;
  const limboDer = `osog-limbo-d-${uid}`;
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
  const momento = useVidaIdle('oso-guardian', vida && vivo && tier !== 'bajo' && enBase);
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
      {/* MIEMBROS CON VOLUMEN: un miembro relleno de color plano se lee como
          una losa pegada encima del animal (fue el defecto de la pasada
          anterior). Cada pata lleva la luz de luna en su borde EXTERNO y se
          hunde en sombra hacia el cuerpo — así es un cilindro, no un recorte.
          Van dos gradientes espejados porque `objectBoundingBox` mapea igual a
          ambos lados y el de la derecha necesita la luz invertida. */}
      <linearGradient id={limboIzq} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={P.cuerpoLuz} />
        <stop offset="42%" stopColor={P.pata} />
        <stop offset="100%" stopColor={P.cuerpoSombra} />
      </linearGradient>
      <linearGradient id={limboDer} x1="100%" y1="0%" x2="0%" y2="0%">
        <stop offset="0%" stopColor={P.cuerpoLuz} />
        <stop offset="42%" stopColor={P.pata} />
        <stop offset="100%" stopColor={P.cuerpoSombra} />
      </linearGradient>
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
      {/* SOMBRA DE SUELO — el peso de la montaña (masa real, no sticker).
          Ahora abarca las cuatro plantas, que llegan más afuera que la mole. */}
      <ellipse cx="0" cy="14.9" rx="14.8" ry="2.2" fill={`url(#${haloSombra})`} aria-hidden="true" />
      {/* aura menta tenue: bioluminiscencia de niebla, no neón de feria */}
      <circle cx="0" cy="1.5" r={auraR + 2} fill={`url(#${haloMenta})`} opacity={auraOp * 0.5} />

      {/* ═══ LA MOLE — la silueta que manda: grupa, cintura, cruz y el cuello
          que sube a buscar el cráneo. El halo menta va MEDIDO en el drop-shadow
          (la estética del avatar aprobado, sin contorno de neón chillón). */}
      <path d={SILUETA_MOLE} fill={`url(#${pelaje})`} stroke={INK} strokeWidth="1.35"
        strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${P.cuerpoGlow})` }} />

      {/* PATAS TRASERAS — caña + planta plantígrada. Van DELANTE del flanco
          (un oso sentado recoge las patas hacia adelante), así que se leen por
          su contorno sobre el cuerpo oscuro. Ya no son garras flotando. */}
      <g aria-hidden="true">
        {[-1, 1].map((s) => (
          <g key={`tras${s}`}>
            <path d={canaTrasera(s)} fill={`url(#${s < 0 ? limboIzq : limboDer})`}
              stroke={INK} strokeWidth="0.85" strokeLinejoin="round" />
            <path d={plantaTrasera(s)} fill={P.planta} stroke={INK}
              strokeWidth="0.85" strokeLinejoin="round" />
          </g>
        ))}
        {/* garras traseras: en el borde EXTERNO, que es donde van los dedos */}
        <Garras xs={[-13.0, -12.0, -11.0]} y={13.95} color={P.garra} largo={0.8} />
        <Garras xs={[11.0, 12.0, 13.0]} y={13.95} color={P.garra} largo={0.8} />
      </g>

      {/* RIM-LIGHT LUNAR — la luz que dibuja al guardián por el lado de la
          luna (izquierdo), con un eco tenue al flanco derecho. Es EL trazo
          neón de la base, vuelto luz de borde con criterio. */}
      <g aria-hidden="true" fill="none" strokeLinecap="round">
        {/* sigue el borde nuevo: costillar → cruz, que es donde la luz pega */}
        <path d="M -10.4,2.6 C -10.0,-1.0 -10.1,-4.6 -9.2,-7.2 C -8.8,-8.2 -8.2,-9.0 -7.4,-9.7" stroke={P.menta}
          strokeWidth="0.85" opacity="0.5" style={{ filter: `drop-shadow(0 0 2.5px ${P.menta})` }} />
        {/* eco tenue en la grupa del otro flanco */}
        <path d="M 11.0,3.6 C 12.1,7.0 12.7,10.4 11.2,12.8" stroke={P.menta}
          strokeWidth="0.7" opacity="0.18" />
      </g>

      {/* PELAJE Y MÚSCULO SUGERIDOS sobre la anatomía nueva. Sugiere, no
          delinea — la mole sigue siendo casi silueta. */}
      <g aria-hidden="true" fill="none" stroke={P.cuerpoLuz} strokeLinecap="round">
        {/* mechones cortos a contraluz: costillar, cintura y grupa */}
        <g strokeWidth="0.5" opacity="0.48">
          <path d="M -11.9,5.6 C -11.4,6.4 -11.2,7.2 -11.4,8.0" />
          <path d="M -11.6,9.0 C -11.2,9.7 -11.1,10.4 -11.3,11.0" />
          <path d="M 12.0,6.6 C 11.5,7.4 11.3,8.2 11.5,9.0" />
        </g>
        {/* la ESCÁPULA sobre la cruz: el hueso que se marca cuando el oso
            carga el peso en las manos. Sin esto la cruz vuelve a ser un bulto */}
        <g strokeWidth="0.5" opacity="0.24">
          <path d="M -8.1,-9.2 C -7.6,-7.6 -7.2,-6.4 -6.8,-5.4" />
          <path d="M 8.1,-9.2 C 7.6,-7.6 7.2,-6.4 6.8,-5.4" />
        </g>
      </g>

      {/* ═══ GOLILLA — el pelaje denso de cuello y hombros. Es anatomía real
          (el "ahuecado" que describe la DR) y a la vez la costura que ata la
          cabeza al cuerpo: los mechones montan sobre las paletillas y pasan
          por detrás del cráneo. Con esto la cabeza deja de estar posada. */}
      <g aria-hidden="true">
        {/* SIN TRAZO Y SIN BORDE RECTO. La segunda prueba de render la tenía
            delineada y cerrando con una casi-horizontal a lo ancho del pecho:
            leía cuello de camisa, y el oso entero pasaba a estar vestido. Una
            golilla de pelo no tiene dobladillo. Va como SOMBRA suave —el
            hueco entre cuello y hombros— y nada más. */}
        <path d={GOLILLA} fill={P.cuerpoSombra} opacity="0.5" />
        {/* el contraluz SOLO en las puntas de los mechones que asoman al lado
            del cráneo: es lo que la vuelve pelaje y ata la cabeza al cuerpo */}
        <g fill="none" stroke={P.cuerpoLuz} strokeWidth="0.42" strokeLinecap="round" opacity="0.38">
          <path d="M -7.4,-9.4 C -7.0,-8.4 -6.7,-7.6 -6.6,-6.8" />
          <path d="M -5.6,-10.6 C -5.3,-9.6 -5.1,-8.8 -5.1,-7.9" />
          <path d="M 5.6,-10.6 C 5.3,-9.6 5.1,-8.8 5.1,-7.9" />
          <path d="M 7.4,-9.4 C 7.0,-8.4 6.7,-7.6 6.6,-6.8" />
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

      {/* ═══ PATAS DELANTERAS — nacen del DELTOIDES, no del aire. Largas (esta
          especie las tiene más largas que las traseras: es trepadora), bajan
          por fuera y recogen hacia el centro hasta la mano apoyada. El pecho
          queda libre entre las dos: ahí manda la luna. */}
      <g>
        {/* SIN CONTORNO CERRADO. Un brazo delineado entero con la tinta de la
            familia se despega del torso y el oso se lee VESTIDO: los brazos
            pasan a mangas y el pecho a peto. Se vio clarísimo en la segunda
            prueba de render. Un miembro que nace del mismo cuerpo no tiene
            línea arriba — se funde en el hombro. Así que el brazo va relleno
            sin trazo, y solo se dibujan DESPUÉS los dos filos que sí existen:
            la sombra del borde interno y la luz del borde externo. */}
        {[-1, 1].map((s) => (
          <path key={`brazo${s}`} d={brazo(s)} fill={`url(#${s < 0 ? limboIzq : limboDer})`} />
        ))}
        {/* el filo INTERNO: la sombra que separa el brazo del pecho */}
        <g aria-hidden="true" fill="none" strokeLinecap="round" stroke={INK}
          strokeWidth="0.75" strokeOpacity="0.4">
          <path d="M -6.9,-3.6 C -6.4,1.0 -5.7,6.0 -5.1,10.8" />
          <path d="M 6.9,-3.6 C 6.4,1.0 5.7,6.0 5.1,10.8" />
        </g>
        {/* el filo EXTERNO: donde la luna moja el canto del brazo */}
        <g aria-hidden="true" fill="none" strokeLinecap="round" stroke={P.cuerpoLuz}
          strokeWidth="0.55" opacity="0.5">
          <path d="M -9.4,-4.4 C -9.6,-1.4 -9.3,1.6 -9.0,4.6" />
          <path d="M 9.4,-4.4 C 9.6,-1.4 9.3,1.6 9.0,4.6" />
        </g>
        {/* el CODO: el pliegue donde el brazo dobla. Sin él, tubo. */}
        <g aria-hidden="true" fill="none" stroke={P.cuerpoSombra} strokeWidth="0.5" opacity="0.5" strokeLinecap="round">
          <path d="M -9.3,1.0 C -8.4,1.7 -7.3,1.8 -6.2,1.4" />
          <path d="M 9.3,1.0 C 8.4,1.7 7.3,1.8 6.2,1.4" />
        </g>
        {[-1, 1].map((s) => (
          <path key={`mano${s}`} d={mano(s)} fill={P.planta} stroke={INK}
            strokeWidth="0.85" strokeLinejoin="round" />
        ))}
        {/* los dedos de la mano, apenas dichos */}
        <g aria-hidden="true" fill="none" stroke={INK} strokeWidth="0.4" opacity="0.5" strokeLinecap="round">
          <path d="M -7.4,13.5 l0,-1.1  M -6.4,13.6 l0,-1.15  M -5.4,13.5 l0,-1.1" />
          <path d="M 5.4,13.5 l0,-1.1  M 6.4,13.6 l0,-1.15  M 7.4,13.5 l0,-1.1" />
        </g>
        <Garras xs={[-7.9, -6.9, -5.9, -4.9]} y={13.5} color={P.garra} largo={0.85} />
        <Garras xs={[4.9, 5.9, 6.9, 7.9]} y={13.5} color={P.garra} largo={0.85} />
      </g>

      {/* ═══ LA RUANA del frío del páramo — la propia del guardián, no el
          trapecio genérico de AccesoriosClima. Se cuelga de la cruz que este
          rediseño le dio (sin hombro no hay dónde apoyarla), cae abierta al
          frente dejando el pecho —y la luna— a la vista, y lleva la punta
          echada al hombro, que es el gesto real de frío de verdad.

          VA ANTES DE LA CABEZA a propósito: el canesú tiene que poder subir por
          detrás del cuello para que se lea UNA prenda cruzando los hombros. Si
          se dibuja después, o le tapa el hocico o hay que bajarlo tanto que los
          dos paños quedan sueltos y la ruana se lee como dos mangas. */}
      {ropa?.ruana && <RuanaGuardian animated={vivo} ink={INK} />}

      {/* ═══ CABEZA proporcionada, hundida en la cruz (sin cuello de peluche).
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


      {/* Prop del mundo junto a la zarpa. */}
      {propMundo}

      {/* Vaho del resoplido (el huff grave del guardián). */}
      {vaho}

      {/* BRUMA a los pies — el velo del bosque nublado (tenue). */}
      <ellipse cx="0" cy="14.2" rx="13.8" ry="2.4" fill={`url(#${haloMenta})`} opacity="0.09"
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
