import { useId, useRef } from 'react';
import './creatures.css';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, RH_INK, RH_BOCA } from './_rubberhose.jsx';
import { JAGUAR_PALETA, JAGUAR_PROPORCION, JAGUAR_SLUG, PERFIL_JAGUAR } from './jaguarIdentidad.js';
import { cuerpoDeClima, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Jaguar — Panthera onca (el felino de tierra cálida/selva). Hermano rubber-hose
   de la abeja Angelita y el oso andino: compone el MISMO kit `_rubberhose.jsx`
   (ojos de goma, cachetes, sonrisa, miembros manguera) y hereda la MISMA
   fundación transversal — lip-sync (useLipSync → BocaVisema), modo poder
   (transformacion, aura PÚRPURA), ropa por clima (ropaDeClima), prop por mundo
   (PropEnMano) y line-boil (LineBoilFilter) — cero código duplicado. Solo cambia
   el ANIMAL y su CARÁCTER: felino MUSCULOSO leonado con ROSETAS (manchas de
   centro ocre, su firma), majestuoso y ACECHADOR. Su seña de vida es el ACECHO
   DE HOMBROS (los omóplatos suben al moverse), la COLA que ondea con PESO y la
   mirada felina ÁMBAR intensa; su squash&stretch es controlado y elegante, no
   hiperactivo (poder contenido). Es de SUELO: acecha, no vuela — sin alas. Su
   estado-firma es el RUGIDO corporal (`ruge`) y el modo ACECHO (`acecha`). Su
   color de poder es el PÚRPURA depredador (no el dorado de la abeja ni el rojo
   del oso). La IDENTIDAD (paleta + proporciones + perfil de clima) vive en
   `jaguarIdentidad.js`; el CLIMA→cuerpo, en `creatureClimaCuerpo.js` con
   PERFIL_JAGUAR (pelaje lustroso que escurre agua, robusto ante la seca) — y de
   tierra cálida: NUNCA suda (aguanta el calor sin sudar ni sombrero).

   REGISTRO NOCTURNO (el felino que anda de noche, tratado como LUZ, no como
   símbolo): OJOS LUMINOSOS que respiran (el ojo de gato que devuelve la luz),
   un AURA tenue que lo envuelve, un TITILEO de estrellas sobre las rosetas
   (la piel que lleva el cielo de la noche), un SHIMMER en el contorno, BRUMA a
   los pies y MOTAS de luz que flotan lento. En modo poder el aura, los ojos y
   las estrellas suben de intensidad, y con `revelacion` (opt-in, su entrada
   cinematográfica) las marcas gemelas brillan sobre las rosetas, la bruma se
   adensa y el felino levita apenas (ingravidez). Todo se PODA en tier bajo /
   reduced-motion (queda un fotograma digno y quieto).

   VOLUMEN Y PESO (que parezca de verdad): el pelaje lleva GRADIENTE radial (luz
   dorsal → sombra ventral), las rosetas son ANILLOS ROTOS reales de Panthera
   onca (arcos con cortes, giro propio por mancha y PUNTOS NEGROS DENTRO —
   la regla de oro anti-leopardo, en TODAS), el patrón se simplifica a puntos
   sólidos hacia las patas, hay definición muscular sutil en ancas y pecho, VIBRISAS y motas
   oscuras en el hocico, y una SOMBRA DE SUELO blanda bajo las zarpas — un
   animal con masa, no un sticker.

   CARÁCTER (el registro de casa, tipo reloj-carismático de los años 30):
   CARISMÁTICO y encantador en reposo — ojos grandes ámbar con catchlight,
   sonrisa de goma, cachetes — PERO capaz de volverse SERIO e IMPONENTE
   (acecho, rugido, revelación). Esa DUALIDAD es su corazón: guardián de monte
   que cae bien y a la vez impone respeto. Nunca gore, nunca ojos vacíos. */
const VIEWBOX = '-16 -20 32 40';

/* Anillo ROTO de la roseta: la roseta real de Panthera onca no es un aro
   cerrado sino ARCOS con cortes (manchas periféricas que casi cierran). El
   dasharray reparte 3 arcos + 3 cortes sobre el perímetro aproximado. */
function anilloRoto(r) {
  const c = Math.PI * r * 1.88; // perímetro aprox de la elipse (rx=r, ry=0.88r)
  return `${c * 0.3} ${c * 0.08} ${c * 0.26} ${c * 0.1} ${c * 0.18} ${c * 0.08}`;
}

/* LA REGLA DE ORO de Panthera onca — lo que lo separa del leopardo y del
   ocelote, y el error más repetido al dibujarlo: la roseta del jaguar NO es una
   mancha sólida ni un aro vacío, es un ANILLO ROTO que ENCIERRA UN CAMPO de
   pelaje más hondo, y DENTRO de ese campo hay UNO O VARIOS PUNTOS NEGROS. Sin
   esos puntos internos el animal se lee como leopardo. Por eso `puntosInternos`
   no es opcional: toda roseta del lomo y el flanco los lleva.

   Los puntos se reparten en ángulos derivados de `rot` (determinista: la misma
   roseta se dibuja igual en cada render, y dos rosetas vecinas nunca repiten el
   mismo arreglo). Van a ~0.42 r del centro, dentro del campo y sin tocar el
   anillo. */
function puntosInternos(r, rot, n) {
  const pts = [];
  const base = (rot * Math.PI) / 180 + 0.7;
  for (let i = 0; i < n; i++) {
    // ángulos NO equidistantes (el jaguar real no tiene puntos en compás)
    const a = base + i * 2.4 + Math.sin(rot * 0.13 + i) * 0.55;
    const d = r * (n === 1 ? 0.2 : 0.4 + (i % 2) * 0.12);
    pts.push({
      x: Math.cos(a) * d,
      y: Math.sin(a) * d * 0.88,
      r: r * (0.19 - i * 0.025),
    });
  }
  return pts;
}

/* Roseta del jaguar: ANILLO ROTO oscuro + CAMPO ocre + PUNTOS NEGROS dentro
   (la firma de la especie). Cada roseta gira distinto (`rot`) para que los
   cortes del anillo no se repitan, y `motas` fija cuántos puntos internos lleva
   (las grandes del lomo, dos o tres; las chicas de la cara, uno).
   Decorativa (aria-hidden en el grupo padre). */
function Roseta({ cx, cy, r = 1.5, ink, centro, opacity = 0.9, rot = 0, motas = 2, trazo = 0.46, organica = false }) {
  if (organica) {
    /* MODO NATURALISTA (la lámina de perfil): la roseta real NO es un aro —
       es un CORRO de manchas periféricas alargadas que casi cierran alrededor
       del campo ocre. Blobs deterministas derivados de `rot` (misma roseta =
       mismo dibujo en cada render; vecinas nunca repiten el arreglo). */
    const base = (rot * Math.PI) / 180;
    const n = 5 + (rot % 2);
    const blobs = [];
    for (let i = 0; i < n; i++) {
      const a = base + (i * 2 * Math.PI) / n + Math.sin(rot * 0.31 + i * 1.7) * 0.35;
      const rad = r * (0.92 + Math.sin(rot * 0.17 + i) * 0.1);
      blobs.push({
        x: Math.cos(a) * rad,
        y: Math.sin(a) * rad * 0.86,
        ang: (a * 180) / Math.PI + 90,
        rx: r * (0.3 + (i % 3) * 0.05),
        ry: r * 0.17,
      });
    }
    return (
      <g opacity={opacity}>
        <ellipse cx={cx} cy={cy} rx={r * 0.68} ry={r * 0.6} fill={centro} opacity="0.9" />
        {blobs.map((b, i) => (
          <ellipse key={i} cx={cx + b.x} cy={cy + b.y} rx={b.rx} ry={b.ry} fill={ink}
            transform={`rotate(${b.ang.toFixed(1)} ${(cx + b.x).toFixed(1)} ${(cy + b.y).toFixed(1)})`} />
        ))}
        {puntosInternos(r, rot, motas).map((p, i) => (
          <circle key={i} cx={cx + p.x} cy={cy + p.y} r={p.r} fill={ink} />
        ))}
      </g>
    );
  }
  return (
    <g opacity={opacity} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined}>
      {/* el CAMPO interior: dentro del anillo el pelaje es más hondo que afuera
          (no un agujero de color plano) — es lo que hace que el punto negro se
          lea como puesto SOBRE la mancha y no flotando sobre el lomo. */}
      <ellipse cx={cx} cy={cy} rx={r * 0.62} ry={r * 0.55} fill={centro} opacity="0.92" />
      {/* el ANILLO ROTO: arcos irregulares, nunca un círculo perfecto. `trazo`
          gradúa el grosor: la lámina de perfil lo lleva más FINO (grabado
          naturalista); el retrato conserva el gordito de goma. */}
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.88} fill="none" stroke={ink}
        strokeWidth={r * trazo} strokeDasharray={anilloRoto(r)} strokeLinecap="round" />
      {/* LOS PUNTOS INTERNOS — la regla de oro, en toda roseta */}
      {puntosInternos(r, rot, motas).map((p, i) => (
        <circle key={i} cx={cx + p.x} cy={cy + p.y} r={p.r} fill={ink} />
      ))}
    </g>
  );
}

/* PATA DEL FELINO — la manguera rubber-hose, pero LEONADA.
   El `Miembro` compartido dibuja la extremidad como una manguera de TINTA
   maciza (la manga negra de los años 30, que a la abeja y al oso les queda
   perfecta). Al jaguar lo arruinaba: cuatro mangueras negras se comen la mitad
   del cuerpo, el pelaje leonado desaparece de las patas y —lo peor— los puntos
   de la pata, que son parte del patrón real de la especie, quedan invisibles
   sobre negro. Acá la manguera se dibuja DOS VECES: la de tinta abajo (que
   queda como contorno grueso) y encima la de pelaje, un poco más delgada. Sigue
   siendo una manguera de goma con su línea gorda; solo que ahora es un jaguar.
   La zarpa (crema, grande y redonda) es la misma del kit. */
function PataJaguar({
  d, ancho, punta, puntaR, pelaje, clase, origen = 'top center', sway = false, delay = 0,
}) {
  const style = {
    transformBox: 'fill-box',
    transformOrigin: origen,
    ...(sway ? { animationDelay: `${delay}s` } : null),
  };
  const clases = [sway ? 'rh-sway' : null, clase].filter(Boolean).join(' ') || undefined;
  const [px, py] = punta;
  return (
    <g className={clases} style={style}>
      <path d={d} stroke={RH_INK} strokeWidth={ancho} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={pelaje} strokeWidth={Math.max(0.8, ancho - 1.25)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* ZARPA CON DEDOS — ya no la manopla lisa de guante (la manopla clara
          "lee guante", memoria de la casa): la almohadilla clara sigue siendo
          la zarpa grande y redonda del kit, pero la tinta le separa TRES dedos
          y asoman garras marfil diminutas. Felino de verdad, goma intacta. */}
      <ellipse cx={px} cy={py} rx={puntaR * 1.15} ry={puntaR * 0.72}
        fill={JAGUAR_PALETA.brillo} stroke={RH_INK} strokeWidth="0.7" />
      <g fill="none" stroke={RH_INK} strokeWidth="0.32" opacity="0.6" strokeLinecap="round" aria-hidden="true">
        <path d={`M${px - puntaR * 0.38},${py - puntaR * 0.5} Q${px - puntaR * 0.44},${py} ${px - puntaR * 0.34},${py + puntaR * 0.42}`} />
        <path d={`M${px + puntaR * 0.38},${py - puntaR * 0.5} Q${px + puntaR * 0.44},${py} ${px + puntaR * 0.34},${py + puntaR * 0.42}`} />
      </g>
      <g aria-hidden="true">
        {[-0.72, 0, 0.72].map((k) => (
          <path key={k}
            d={`M${px + k * puntaR - 0.22},${py + puntaR * 0.52} Q${px + k * puntaR},${py + puntaR * 0.95} ${px + k * puntaR + 0.22},${py + puntaR * 0.52} Z`}
            fill={JAGUAR_PALETA.garra} stroke={RH_INK} strokeWidth="0.22" />
        ))}
      </g>
    </g>
  );
}

/* Estrella de constelación — el titileo de estrellas sobre las
   rosetas (el jaguar-espíritu lleva el cielo nocturno en la piel). Sparkle de 4
   puntas; titila (.jaguar-estrella) solo viva — con animated=false / RM queda
   quieta y digna. */
function Estrella({ cx, cy, r = 0.9, color, delay = 0, vivo = false }) {
  const p = r * 0.26;
  return (
    <g
      className={vivo ? 'jaguar-estrella' : undefined}
      style={{ transformBox: 'fill-box', transformOrigin: 'center', ...(vivo ? { animationDelay: `${delay}s` } : null) }}
    >
      <path
        d={`M${cx},${cy - r} L${cx + p},${cy - p} L${cx + r},${cy} L${cx + p},${cy + p} L${cx},${cy + r} L${cx - p},${cy + p} L${cx - r},${cy} L${cx - p},${cy - p} Z`}
        fill={color}
      />
    </g>
  );
}

/* ROSETAS del cuerpo y la cara, como DATOS (una sola fuente): las dibuja la
   capa de tinta y las REUSA la capa de marcas-espíritu (las gemelas
   espectrales que se encienden en la revelación). rot varía el corte del
   anillo; `motas` es cuántos PUNTOS NEGROS lleva dentro (nunca cero).

   EL PATRÓN VA POR ZONAS, que es como lo lleva el animal: ROSETAS en el
   costado y el anca (el pelaje leonado), PUNTOS SÓLIDOS en el vientre crema y
   en las patas. Antes estaban todas apiñadas encima de la panza clara: se leían
   como una condecoración en el pecho y dejaban los flancos lisos. */
const ROSETAS_CUERPO = [
  /* COSTADOS: las más grandes, con tres puntos dentro — es donde el patrón del
     jaguar se lee mejor y donde el error del leopardo se nota primero. */
  { cx: -6.0, cy: 0.4, r: 1.28, rot: 15, motas: 3 },
  { cx: 6.0, cy: 0.2, r: 1.28, rot: 250, motas: 3 },
  /* ANCAS */
  { cx: -6.2, cy: 4.2, r: 1.08, rot: 130, o: 0.92, motas: 2 },
  { cx: 6.2, cy: 4.4, r: 1.08, rot: 40, o: 0.92, motas: 2 },
  /* la vuelta baja del costado, ya cerca de la pata */
  { cx: -4.7, cy: 7.6, r: 0.95, rot: 320, o: 0.9, motas: 2 },
  { cx: 4.7, cy: 7.7, r: 0.95, rot: 205, o: 0.9, motas: 2 },
];

/* VIENTRE: el pecho y la panza del jaguar son claros y llevan MANCHAS SÓLIDAS,
   no rosetas. Es la misma regla zonal de la cabeza y las patas. */
const PUNTOS_VIENTRE = [
  { cx: -1.9, cy: 1.1, r: 0.3 }, { cx: 1.5, cy: 0.2, r: 0.25 },
  { cx: -0.6, cy: 3.4, r: 0.32 }, { cx: 2.3, cy: 4.0, r: 0.24 },
  { cx: -2.5, cy: 5.6, r: 0.27 }, { cx: 0.7, cy: 6.9, r: 0.22 },
  { cx: -3.1, cy: 2.5, r: 0.21 }, { cx: 2.9, cy: 2.0, r: 0.19 },
];
/* CARA: en el jaguar real la cabeza lleva sobre todo puntos sólidos y rosetas
   PEQUEÑAS — por eso acá el radio baja y cada una lleva un solo punto interno. */
const ROSETAS_CARA = [
  { cx: -3.4, cy: -10.6, r: 0.95, rot: 25, o: 0.8, motas: 1 },
  { cx: 3.4, cy: -10.6, r: 0.95, rot: 200, o: 0.8, motas: 1 },
  { cx: -4.8, cy: -7.6, r: 0.85, rot: 95, o: 0.7, motas: 1 },
  { cx: 4.8, cy: -7.6, r: 0.85, rot: 300, o: 0.7, motas: 1 },
];

/* PATAS: hacia las extremidades el patrón se SIMPLIFICA — las rosetas se
   vuelven puntos sólidos pequeños (dato del DR primario). Sin esta transición
   las cuatro patas quedan lisas y el animal parece dos dibujos pegados. */
const PUNTOS_PATAS = [
  /* patas delanteras (la manguera va de (-7,-1) a (-9.6,5.8)) */
  { cx: -8.7, cy: 1.3, r: 0.3 }, { cx: -9.5, cy: 3.3, r: 0.25 },
  { cx: 8.7, cy: 1.3, r: 0.3 }, { cx: 9.5, cy: 3.3, r: 0.25 },
  /* traseras: solo lo que asoma bajo el tronco */
  { cx: -7.9, cy: 10.3, r: 0.26 }, { cx: 7.9, cy: 10.3, r: 0.26 },
];

/* Vértices de la constelación: coinciden con centros de rosetas para que el
   "cielo" viva SOBRE las manchas. Partida en dos: el LOMO (grandes + menores,
   la retícula del lomo) va en el tronco; la FRENTE va DENTRO del grupo de la
   cabeza (si no, el círculo de la cabeza — que se pinta después — la tapa) y
   así además acompaña el acecho cuando la testa baja.

   OJO — las estrellas van al BORDE de la mancha, nunca en el centro: el centro
   es de los PUNTOS NEGROS (la firma de la especie). Cuando la estrella se
   plantaba justo en el medio, tapaba el dato que este personaje existe para
   enseñar y la roseta volvía a leerse como una condecoración. */
const ESTRELLAS_LOMO = [
  { cx: -4.9, cy: -0.5, r: 0.42, d: -1.1 },
  { cx: 4.9, cy: -0.7, r: 0.42, d: -0.7 },
  { cx: -5.2, cy: 2.6, r: 0.3, d: -1.5 },
  { cx: 5.2, cy: 2.8, r: 0.3, d: -0.3 },
  { cx: -3.6, cy: 6.4, r: 0.26, d: -1.9 },
  { cx: 3.6, cy: 6.5, r: 0.26, d: -2.2 },
];
const ESTRELLAS_FRENTE = [
  { cx: -4.3, cy: -11.5, r: 0.5, d: 0 },
  { cx: 4.3, cy: -11.5, r: 0.5, d: -0.5 },
];

/* MOTAS de luz (polvo del espíritu): flotan lento alrededor del felino, cada
   una con su delay/duración propios (nunca en compás — vida, no metrónomo). */
const MOTAS = [
  { cx: -10.6, cy: 3.2, r: 0.5, d: 0, s: 6.4 },
  { cx: 11.2, cy: -1.6, r: 0.42, d: -2.1, s: 7.2 },
  { cx: -8.2, cy: -6.8, r: 0.38, d: -3.4, s: 5.8 },
  { cx: 9.0, cy: 6.4, r: 0.55, d: -1.2, s: 6.9 },
  { cx: -12.0, cy: -2.4, r: 0.34, d: -4.6, s: 7.6 },
  { cx: 6.4, cy: -10.2, r: 0.4, d: -5.2, s: 6.1 },
];

/* GLIFO ESPIRAL — ornamento geométrico puro (una espiral abierta, dibujada
   para este personaje; no cita ni reproduce ningún diseño de nadie). Adorno de
   hombro, nunca arma. Invisible en reposo; se enciende en la revelación / el
   poder. Se posiciona/espeja con transform en cada hombro. */
const GLIFO_ESPIRAL = 'M0,0 C0.3,-0.3 0.75,-0.15 0.85,0.35 C0.95,0.95 0.35,1.4 -0.4,1.15 '
  + 'C-1.35,0.85 -1.6,-0.35 -0.95,-1.15 C-0.2,-2.05 1.3,-1.95 2.05,-0.95';

export function Jaguar({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Jaguar',
  /* Pose de VIDA (idle-life), species-agnostic (gestos rh-g-* de creatures.css):
     'anda' (base, con acecho de hombros) | 'celebra' (brinca con brazos en V +
     overshoot) | 'reposo' (respira hondo, agazapado) | 'señala' (se inclina al
     POI y apunta con la zarpa). Solo corren viva (animated); con animated=false
     o reduced-motion queda en fotograma digno e imponente.
     ── 'camina' (MARCHA DE PERFIL): el host la pide cuando el jaguar SE
     DESPLAZA por una escena (JaguarBillboard fase anda/acecha). El cuerpo
     frontal cede a un rig LATERAL (.jaguar-lado) con ciclo de marcha real de
     cuadrúpedo — 4 patas desfasadas en secuencia lateral (diagonales casi
     juntas), bóveda del paso, omóplato que rueda, cola baja de contrapeso y
     GRUÑIDO periódico — fiel al DR de Panthera onca (cuerpo compacto, patas
     cortas y gruesas, cola corta, testa maciza baja, pupila REDONDA, paso
     lento y pesado). El traslado ENTRE mundos NO usa esta pose: el jaguar es
     místico y ahí se aparece (aparicion/revelacion), no trota. El espejo
     según el rumbo lo pone el host (scaleX del wrapper, como ya hace el
     billboard). Sin patinaje: la cadencia (1.05s/ciclo) casa con el paso
     lento del billboard (V_ANDA 0.62 u/s). */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil jaguar). Sin clima (avatares,
     catálogo) = neutro digno: el jaguar se ve EXACTO como siempre. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (sistema transversal, useLipSync) ────────────────────────────
     visema opcional ('V1'..'V4') que produce useLipSync desde el RMS del TTS: la
     boca se abre cuando el agente narra. Sin visema (o 'V1') = la sonrisa de
     goma de siempre → avatares/catálogo no cambian. El HOOK vive aparte (no
     cuelga un AnalyserNode por instancia); acá solo se consume. El RUGIDO manda
     sobre el visema (una fiera que ruge no articula fonemas). */
  visema = null,
  /* ── VESTUARIO por clima+hora (ropaDeClima) ───────────────────────────────
     OPT-IN: con vestuario=true el jaguar se abriga según el clima real (RUANA de
     noche/frío — es de tierra cálida y siente el frío pronto). Es de tierra
     cálida: NUNCA se sobrecalienta → jamás suda ni sombrero (se suprimen aquí
     aunque el termómetro suba). Default false → los consumidores de `clima`
     existentes NO ven ropa nueva. */
  vestuario = false,
  tempC = undefined,
  /* ── RUGE (rugido corporal — la fiera ruge) ────────────────────────────────
     OPT-IN: el jaguar abre las fauces (colmillos + garganta) y el pecho hincha y
     SUELTA con peso (el rugido leído en el cuerpo). Su reacción-firma imponente.
     Default false → sin rugido (avatar sereno). */
  ruge = false,
  /* ── ACECHA (modo acecho — el depredador se agazapa) ───────────────────────
     OPT-IN: los omóplatos SUBEN, la cabeza BAJA y el cuerpo avanza lento y
     controlado (el acecho felino). Su otra reacción-firma. Default false. */
  acecha = false,
  /* ── PAISAJE DEL MIEDO (su PODER en el kart — landscape of fear) ────────────
     OPT-IN: el jaguar SUELTA su presencia depredadora — una ONDA que se expande
     por el terreno, la mirada se afila (cejas fruncidas, ojos almendrados) y el
     aura sube. Concepto ecológico real: la sola presencia del depredador ápice
     altera la conducta de las presas en TODO el paisaje sin tocarlas (ver
     JAGUAR_PODER_KART). Es de ÁREA: el miedo no elige a uno. Default false → los
     consumidores existentes NO cambian. */
  paisajeDelMiedo = false,
  /* ── VIDA PROPIA (idle-cerebro v2 — la vara de Angelita) ───────────────────
     Default ON: un reloj con jitter hojea el repertorio de la especie
     (vidaEstados.js) — el bicho EXISTE aunque nadie le hable. Cada instancia
     parpadea a SU aire (ritmo propio) y sus pupilas SIGUEN su puntero/dedo
     cuando anda cerca. El cerebro CEDE ante el host (cualquier gesto manual
     lo apaga); animated=false, tier 'bajo' y reduced-motion lo apagan entero.
     vida={false} = el bicho de antes, idéntico. */
  vida = true,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga el idle continuo (boil + acecho de hombros + cola) y
     deja los estados reactivos. Sin prop (standalone: avatares, catálogo) = pleno. */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30 — LineBoilFilter) ────────
     OPT-IN: con lineBoil el CONTORNO del jaguar vibra escalonado (feTurbulence +
     feDisplacement, ~8fps) — el trazo "hierve" como dibujo animado clásico.
     Default false → los consumidores existentes NO cambian. Con animated=false
     o reduced-motion queda con seed fija (textura sin vibrar). Capa MÁS cara del
     kit: reservada para su entrada heroica (galería, hero). */
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up PÚRPURA — transformacion.css) ─────
     OPT-IN: con poder=true (y en modo standalone) el jaguar se envuelve en su
     aura PÚRPURA depredadora de 4 capas (glow, boost, ingravidez, corrientes) —
     su firma cuando "sube de nivel". El host lo enciende un rato con
     usePoderTemporal(). En modo inline el power-up lo pone el host DOM
     (::before/mix-blend no aplican a nodos SVG); acá solo marcamos data-poder por
     si el host lo consulta. */
  poder = false,
  /* ── REVELACIÓN DEL ESPÍRITU (estado héroe — su entrada cinematográfica) ────
     OPT-IN: con revelacion=true el jaguar-espíritu SE MANIFIESTA — las
     marcas-espíritu (rosetas gemelas espectrales) se encienden y laten, la
     bruma etérea se adensa, el felino LEVITA apenas (ingravidez contenida), la
     sombra del suelo cede (el peso se vuelve espíritu) y aura/ojos/estrellas
     suben a su registro nocturno. MAJESTAD, no susto: todo lento y digno.
     Default false → los consumidores actuales NO cambian. Se poda en tier
     bajo / reduced-motion (quedan las marcas encendidas, quietas). */
  revelacion = false,
  /* ── APARICIÓN ESPECTRAL (el espíritu que se materializa y se desvanece) ────
     OPT-IN: con aparicion=true el jaguar-espíritu APARECE y DESAPARECE
     místicamente en ciclo — se desvanece casi por completo y vuelve a
     materializarse desde la bruma (opacidad que respira + emergencia leve,
     como una presencia que va y viene). Pensado para su entrada/
     ambiente en el valle/bosque. Default false → los consumidores actuales NO
     cambian. Se poda en tier bajo / reduced-motion (queda PRESENTE y quieto,
     nunca invisible — fotograma digno). */
  aparicion = false,
  /* ── PROP POR MUNDO (herramienta en la zarpa — propsPorMundo/PropEnMano) ─────
     mundoId opcional: al ENTRAR a un mundo el jaguar carga su herramienta
     (agua→manguerita, suelo→lupa, animales→lazo, semillero→canasto…). Sin
     mundoId (o mundo sin prop) entra con las zarpas libres. Va en su zarpa
     IZQUIERDA (la cola cae al lado DERECHO: prop y cola no se pisan). */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const pelaje = `crt-pelaje-${uid}`;
  /* defs de la PIEL HUMBOLDT (ilustración vectorial painterly — ver defs) */
  const dorso = `crt-dorso-${uid}`;
  const anca = `crt-anca-${uid}`;
  const craneo = `crt-craneo-${uid}`;
  const grano = `crt-grano-${uid}`;
  const granoL = `crt-granoL-${uid}`;
  const pincel = `crt-pincel-${uid}`;
  const pincelL = `crt-pincelL-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.14, Math.min(0.42, 0.18 + 0.26 * (energia ?? 1)));
  const auraR = 8.5 + 1.6 * (energia ?? 1);

  // ═══ VIDA PROPIA (idle-cerebro + ritmo propio + mirada — vara Angelita v2).
  // El cerebro solo manda cuando el host no dirige (pose base, sin gestos
  // manuales ni lip-sync); sus momentos se funden con los props opt-in para
  // reusar TODO el CSS existente de los gestos-firma.
  const raizRef = useRef(null);
  const ritmoPropio = useRitmoPropio();
  const enBase = pose === 'anda' && !ruge && !acecha && !visema && !revelacion;
  const momento = useVidaIdle('jaguar', vida && vivo && tier !== 'bajo' && enBase);
  useMiradaUsted(raizRef, vida && vivo && tier !== 'bajo');
  const rugeFx = ruge || momento === 'ruge';
  const acechaFx = acecha || momento === 'acecha';
  const miedoFx = paisajeDelMiedo;
  const poseFx = momento === 'reposo' ? 'reposo' : pose;
  const marchando = poseFx === 'camina';

  // CLIMA → cuerpo (determinista, una vez por render): tinte + opacidad al
  // contorno. El jaguar no tiene alas (velocidadAlas siempre 1: no se usa).
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_JAGUAR });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // Vestuario por clima+hora (opt-in). Perfil jaguar de TIERRA CÁLIDA: la RUANA
  // de noche/frío; NUNCA sombrero ni sudor (aunque suba el termómetro) — el
  // jaguar no se sobrecalienta. Los suprimimos aquí sin tocar la función
  // compartida (su contrato/tests siguen intactos). Sin vestuario/clima → nada.
  const ropaBase = (vestuario && clima) ? ropaDeClimaBicho(JAGUAR_SLUG, clima, { tempC }) : null;
  const ropa = ropaBase ? { ...ropaBase, sombrero: false, sudor: false } : null;

  const P = JAGUAR_PALETA;
  const PR = JAGUAR_PROPORCION;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* PELAJE CON VOLUMEN — gradiente radial del pelaje (luz dorsal arriba a
          la izquierda → leonado medio → sombra ventral en el borde): el mismo
          def viste tronco y cabeza (objectBoundingBox: cada uno recibe su luz).
          Enriquecido para la lámina Humboldt: luz ALTA (brillo) en la cresta y
          una vuelta rojiza-umbría en el borde — cuatro paradas, volumen real. */}
      <radialGradient id={pelaje} cx="42%" cy="30%" r="84%">
        <stop offset="0%" stopColor={P.brillo} />
        <stop offset="30%" stopColor={P.cuerpoLuz} />
        <stop offset="64%" stopColor={P.cuerpo} />
        <stop offset="100%" stopColor={P.cuerpoSombra} />
      </radialGradient>
      {/* DORSO→VIENTRE (lámina de perfil): el lomo dorado hondo arriba, el
          flanco leonado, la penumbra ventral abajo — la luz de museo cae de
          arriba. Vertical a propósito (objectBoundingBox del tronco lateral). */}
      <linearGradient id={dorso} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={P.brillo} />
        <stop offset="26%" stopColor={P.cuerpoLuz} />
        <stop offset="58%" stopColor={P.cuerpo} />
        <stop offset="84%" stopColor={P.cuerpoSombra} />
        <stop offset="100%" stopColor={P.umbra} />
      </linearGradient>
      {/* ANCA / masas musculares — radial con la luz en el tercio alto (el
          muslo y el hombro reciben su propia luz, como en la lámina). */}
      <radialGradient id={anca} cx="40%" cy="30%" r="80%">
        <stop offset="0%" stopColor={P.cuerpoLuz} />
        <stop offset="58%" stopColor={P.cuerpo} />
        <stop offset="100%" stopColor={P.umbra} />
      </radialGradient>
      {/* CRÁNEO de perfil — la luz entra por el pómulo/frente (delante-arriba),
          la nuca queda en penumbra. */}
      <radialGradient id={craneo} cx="62%" cy="34%" r="86%">
        <stop offset="0%" stopColor={P.brillo} />
        <stop offset="38%" stopColor={P.cuerpoLuz} />
        <stop offset="72%" stopColor={P.cuerpo} />
        <stop offset="100%" stopColor={P.cuerpoSombra} />
      </radialGradient>
      {/* SOMBRA DE FORMA — gradiente vertical de silueta completa (nada arriba,
          penumbra honda abajo): la vuelta del cilindro del cuerpo. Se pinta
          SOBRE el patron para que rosetas y manchas tambien giren hacia la
          sombra — es lo que hace painterly a la lamina. */}
      <linearGradient id={`${dorso}-forma`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={P.brillo} stopOpacity="0.3" />
        <stop offset="22%" stopColor={P.brillo} stopOpacity="0" />
        <stop offset="55%" stopColor={P.umbra} stopOpacity="0" />
        <stop offset="100%" stopColor={P.umbra} stopOpacity="0.52" />
      </linearGradient>
      {/* GRANO DE PELAJE — feTurbulence compuesto DENTRO de la silueta (operator
          "in" contra el SourceGraphic) y fundido encima: textura de pelo corto
          sin feDisplacementMap — el contrato frugal del kit exige que el
          displacement solo se pague en el opt-in lineBoil (test de contrato:
          «sin lineBoil NO se paga el filtro»). Estático: seed fija, cero
          animación del filtro. Dos escalas: retrato (unidades del viewBox) y
          lámina de perfil (espacio local ×12.5). */}
      <filter id={grano} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85 1.25" numOctaves="2" seed="11" result="ruido" />
        <feColorMatrix in="ruido" type="matrix"
          values="0 0 0 0 0.34  0 0 0 0 0.21  0 0 0 0 0.06  0 0 0 0.4 0" result="tinte" />
        {/* la salida es SOLO el moteado recortado a la silueta de la capa
            portadora (su pintura propia nunca se ve): overlay puro. */}
        <feComposite in="tinte" in2="SourceGraphic" operator="in" />
      </filter>
      <filter id={granoL} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05 0.085" numOctaves="2" seed="11" result="ruido" />
        <feColorMatrix in="ruido" type="matrix"
          values="0 0 0 0 0.34  0 0 0 0 0.21  0 0 0 0 0.06  0 0 0 0.55 0" result="tinte" />
        <feComposite in="tinte" in2="SourceGraphic" operator="in" />
      </filter>
      {/* PINCEL — blur chico para las masas de sombreado painterly (el difumino
          del ilustrador, no el blur atmosférico grande del kit). */}
      <filter id={pincel} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="0.55" />
      </filter>
      <filter id={pincelL} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="6.5" />
      </filter>
      {/* Line-boil (contorno que hierve) — solo se instancia si se pide. */}
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // PROP DEL MUNDO en la zarpa izquierda (el lado libre; la cola cae a la
  // derecha). Sin mundoId o mundo sin prop → PropEnMano devuelve null (zarpas
  // libres, nunca rompe la escena).
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={-11.2} y={7.6} escala={0.72} ink={RH_INK} animated={vivo} />
  ) : null;

  // BOCA: precedencia RUGIDO > visema > sonrisa. La fiera que ruge abre las
  // fauces con colmillos + garganta (no articula fonemas); si narra sin rugir,
  // el visema; en reposo, la sonrisa de goma de siempre.
  const boca = rugeFx ? (
    <g className="jaguar-rugido-boca" aria-hidden="true">
      <ellipse cx="0" cy="-2.9" rx="2.5" ry="2.1" fill={RH_BOCA} stroke={RH_INK} strokeWidth="0.9" />
      {/* colmillos superiores (el rugido) */}
      <path className="jaguar-colmillo" d="M-1.5,-4.4 L-0.7,-4.4 L-1.1,-2.5 Z" fill={P.colmillo} stroke={RH_INK} strokeWidth="0.3" />
      <path className="jaguar-colmillo" d="M1.5,-4.4 L0.7,-4.4 L1.1,-2.5 Z" fill={P.colmillo} stroke={RH_INK} strokeWidth="0.3" />
      {/* lengua */}
      <path d="M-1.1,-2.0 Q0,-0.7 1.1,-2.0 Z" fill="#d1615a" />
    </g>
  ) : visema
    ? <BocaVisema cx={0} cy={-3.4} w={3.4} prof={1.3} visema={visema} />
    : <Sonrisa cx={0} cy={-3.7} w={3.2} prof={1.0} />;

  // ── CUERPO rubber-hose (atrás→adelante): aura, cola pesada, orejas, patas,
  //    tronco leonado con vientre crema, rosetas, omóplatos del acecho, bracitos
  //    manguera, cabeza (hocico + cejas fieras + ojos ámbar/cachetes/boca +
  //    trufa). `.crt-body` es el nodo que squashea (boil idle jaguar: lento,
  //    controlado y elegante — poder contenido).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* SOMBRA DE SUELO — la mancha blanda bajo las zarpas que le da PESO al
          felino (un animal con masa, no un sticker). Estática (no anima); en
          la revelación CEDE por CSS (el peso se vuelve espíritu). */}
      <ellipse className="jaguar-sombra-suelo" cx="0" cy="13.2" rx="8.2" ry="1.5"
        fill={P.sombraSuelo} filter={`url(#${blur})`} aria-hidden="true" />
      {/* AURA ESPECTRAL etérea (PERMANENTE, sutil): un halo de luz nocturna
          envuelve al felino aun en reposo. Late lento
          y sube de intensidad en modo poder (CSS). */}
      <circle className={vivo ? 'jaguar-aura-espectral' : undefined}
        cx="0" cy="1.4" r={auraR + 2.6} fill={P.espectral} opacity="0.13"
        filter={`url(#${blur})`}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }} aria-hidden="true" />
      {/* aura viva */}
      <circle cx="0" cy="2" r={auraR} fill={P.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* COLA CORTA y GRUESA en la base (clave anti-leopardo: el jaguar la lleva
          más corta), ondea con PESO (la firma del acecho, al lado derecho para
          no pisar el prop de la zarpa izquierda). Pivota desde su base en el
          lomo. Lleva ANILLOS (no rosetas — la firma de la cola del jaguar) +
          punta negra. */}
      <g className={vivo ? 'jaguar-cola' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'left bottom' }}>
        {/* relleno del tubo, más grueso en la base (dos trazos superpuestos) */}
        <path d="M8.2,5.6 C12.2,4.8 13.4,1.0 12.5,-2.8 C11.9,-4.7 10.6,-5.4 9.3,-5.0"
          fill="none" stroke={P.cuerpo} strokeWidth="3.6" strokeLinecap="round" />
        {/* ANILLOS: copia del tubo en tinta oscura con dash → bandas perpendiculares
            perfectas siguiendo la curva (el patrón anillado real). */}
        <path d="M8.2,5.6 C12.2,4.8 13.4,1.0 12.5,-2.8 C11.9,-4.7 10.6,-5.4 9.3,-5.0"
          fill="none" stroke={P.roseta} strokeWidth="3.6" strokeLinecap="butt"
          strokeDasharray="1.5 3.3" strokeDashoffset="-1.6" opacity="0.9" />
        {/* contorno de tinta encima (la línea que manda del rubber-hose) */}
        <path d="M8.2,5.6 C12.2,4.8 13.4,1.0 12.5,-2.8 C11.9,-4.7 10.6,-5.4 9.3,-5.0"
          fill="none" stroke={RH_INK} strokeWidth="0.7" strokeLinecap="round" opacity="0.55" />
        {/* punta negra */}
        <circle cx="9.5" cy="-4.9" r="1.7" fill={P.roseta} />
      </g>

      {/* (las orejas viven ahora DENTRO del wrapper .jaguar-cabeza-mira, junto
          a la cabeza: cuando la testa sigue al usuario, viajan con ella y no
          quedan flotando — se dibujan justo antes del cráneo, que las solapa) */}

      {/* patas traseras GRUESAS y CORTAS (muslos musculosos con planta crema,
          zarpas grandes y redondas — centro de gravedad bajo, anti-leopardo).
          Se mecen suave. */}
      <PataJaguar d="M-6.6,7.4 C-8.4,9.0 -8.6,10.6 -7.4,11.8" ancho={4.2} punta={[-7.4, 12.0]} puntaR={2.6} pelaje={P.cuerpoSombra} sway={vivo} delay={-0.7} />
      <PataJaguar d="M6.6,7.4 C8.4,9.0 8.6,10.6 7.4,11.8" ancho={4.2} punta={[7.4, 12.0]} puntaR={2.6} pelaje={P.cuerpoSombra} sway={vivo} delay={-1.0} />

      {/* TRONCO — silueta ESCULPIDA de Panthera onca (ya no la elipse-globo):
          HOMBROS anchos arriba, caja del pecho, cintura breve y los MUSLOS que
          abultan a los lados (el felino asienta bajo y macizo — anatomía real,
          no chibi). El fill sigue siendo el gradiente de pelaje y la línea de
          tinta sigue mandando (rubber-hose intacto); encima van el GRANO de
          turbulencia (pelo corto) y las masas painterly de sombra/luz —
          la lámina Humboldt, toda en vector. */}
      <path d="M0,-5.3 C4.5,-5.4 7.7,-4.4 9.1,-1.9 C10.5,0.3 10.6,2.7 9.8,4.5 C10.9,5.5 11.1,7.5 10.0,8.7 C7.7,9.9 4.1,9.5 0,9.5 C-4.1,9.5 -7.7,9.9 -10.0,8.7 C-11.1,7.5 -10.9,5.5 -9.8,4.5 C-10.6,2.7 -10.5,0.3 -9.1,-1.9 C-7.7,-4.4 -4.5,-5.4 0,-5.3 Z"
        fill={`url(#${pelaje})`} stroke={RH_INK} strokeWidth="1.4" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${P.cuerpoGlow})` }} />
      {/* grano de pelaje: overlay de turbulencia recortado a la MISMA silueta */}
      <path d="M0,-5.3 C4.5,-5.4 7.7,-4.4 9.1,-1.9 C10.5,0.3 10.6,2.7 9.8,4.5 C10.9,5.5 11.1,7.5 10.0,8.7 C7.7,9.9 4.1,9.5 0,9.5 C-4.1,9.5 -7.7,9.9 -10.0,8.7 C-11.1,7.5 -10.9,5.5 -9.8,4.5 C-10.6,2.7 -10.5,0.3 -9.1,-1.9 C-7.7,-4.4 -4.5,-5.4 0,-5.3 Z"
        fill={P.cuerpo} filter={`url(#${grano})`} aria-hidden="true" />
      {/* SOMBREADO PAINTERLY del tronco — masas blandas de pincel (difuminadas
          con el blur chico), como la aguada de la lámina: penumbra en los
          flancos y bajo la panza, luz alta en el pecho/hombros. */}
      <g aria-hidden="true" filter={`url(#${pincel})`}>
        <path d="M-9.7,-0.6 C-10.3,2.6 -9.8,5.9 -8.2,8.2 C-9.4,6.4 -9.9,2.8 -9.7,-0.6 Z"
          fill={P.umbra} opacity="0.42" />
        <path d="M9.7,-0.6 C10.3,2.6 9.8,5.9 8.2,8.2 C9.4,6.4 9.9,2.8 9.7,-0.6 Z"
          fill={P.umbra} opacity="0.42" />
        <ellipse cx="0" cy="8.6" rx="5.6" ry="1.3" fill={P.umbra} opacity="0.3" />
        <ellipse cx="0" cy="-3.1" rx="5.2" ry="1.9" fill={P.brillo} opacity="0.5" />
        <ellipse cx="-8.2" cy="-1.6" rx="1.5" ry="2.6" fill={P.brillo} opacity="0.35" />
        <ellipse cx="8.2" cy="-1.6" rx="1.5" ry="2.6" fill={P.brillo} opacity="0.35" />
      </g>
      {/* SHIMMER — el destello del pelaje al borde del cuerpo. Iba en VIOLETA
          espectral a opacidad 0.16 y a tamaño de retrato se leía como un ARO
          morado atravesado en el pecho: exactamente el tipo de aro que está
          prohibido en el elenco. Ahora es CÁLIDO (la luz del propio pelaje) y
          casi transparente: sigue respirando, ya no dibuja un anillo. */}
      <path className={vivo ? 'jaguar-shimmer' : undefined}
        d="M0,-5.3 C4.5,-5.4 7.7,-4.4 9.1,-1.9 C10.5,0.3 10.6,2.7 9.8,4.5 C10.9,5.5 11.1,7.5 10.0,8.7 C7.7,9.9 4.1,9.5 0,9.5 C-4.1,9.5 -7.7,9.9 -10.0,8.7 C-11.1,7.5 -10.9,5.5 -9.8,4.5 C-10.6,2.7 -10.5,0.3 -9.1,-1.9 C-7.7,-4.4 -4.5,-5.4 0,-5.3 Z"
        fill="none" stroke={P.cuerpoLuz} strokeWidth="0.7" opacity="0.1" aria-hidden="true" />
      {/* vientre/pecho crema — nace MÁS ABAJO que antes (la barbilla del cráneo
          aterriza sobre pelaje dorado, no sobre crema: sin efecto collar) y con
          borde de MECHONES (el pelaje ventral nace en picos) */}
      <path d="M0,-3.5 C4.0,-2.7 5.2,2.2 3.9,6.2 C2.4,9.0 -2.4,9.0 -3.9,6.2 C-5.2,2.2 -4.0,-2.7 0,-3.5 Z"
        fill={P.vientre} opacity="0.9" />
      <ellipse cx="0" cy="6.3" rx="2.9" ry="2.1" fill={P.umbra} opacity="0.12"
        filter={`url(#${pincel})`} aria-hidden="true" />
      {/* mechones del pecho (el zigzag de pelo crema donde el vientre nace) */}
      <path d="M-2.6,-3.0 L-1.9,-2.35 L-1.2,-3.15 L-0.5,-2.4 L0.2,-3.2 L0.9,-2.4 L1.6,-3.1 L2.3,-2.45 L2.9,-2.9"
        fill="none" stroke={P.vientre} strokeWidth="0.55" strokeLinecap="round" opacity="0.95" aria-hidden="true" />
      {/* mechones laterales: el pelaje del flanco también nace en picos */}
      <g aria-hidden="true" fill="none" stroke={P.cuerpoSombra} strokeWidth="0.32" strokeLinecap="round" opacity="0.5">
        <path d="M-10.1,3.6 l0.65,0.45 -0.6,0.55 0.65,0.5" />
        <path d="M10.1,3.6 l-0.65,0.45 0.6,0.55 -0.65,0.5" />
        <path d="M-9.4,6.9 l0.6,0.4 -0.55,0.5" />
        <path d="M9.4,6.9 l-0.6,0.4 0.55,0.5" />
      </g>

      {/* DEFINICIÓN MUSCULAR (que se SIENTA la masa del felino): ancas sobre
          los muslos, surco del pectoral, deltoides del hombro y el arranque de
          los antebrazos. Tinta a baja opacidad — sugiere como el grabado de la
          lámina, no delinea. */}
      <g aria-hidden="true" fill="none" stroke={RH_INK} strokeWidth="0.55" opacity="0.24" strokeLinecap="round">
        <path d="M-8.6,3.2 C-8.1,5.6 -6.7,7.3 -4.9,8.0" />
        <path d="M8.6,3.2 C8.1,5.6 6.7,7.3 4.9,8.0" />
        <path d="M-1.5,-3.1 C-0.5,-2.4 0.5,-2.4 1.5,-3.1" />
        <path d="M-6.8,-3.4 C-7.8,-2.1 -8.2,-0.6 -8.0,1.0" />
        <path d="M6.8,-3.4 C7.8,-2.1 8.2,-0.6 8.0,1.0" />
        <path d="M-4.9,5.3 C-5.6,6.4 -5.7,7.5 -5.2,8.5" strokeWidth="0.4" />
        <path d="M4.9,5.3 C5.6,6.4 5.7,7.5 5.2,8.5" strokeWidth="0.4" />
      </g>

      {/* ROSETAS del cuerpo (anillos ROTOS de centro ocre — la firma). Una
          sola fuente de datos (ROSETAS_CUERPO) que también visten las
          marcas-espíritu. Decorativas. */}
      <g aria-hidden="true">
        {ROSETAS_CUERPO.map((m, i) => (
          <Roseta key={i} cx={m.cx} cy={m.cy} r={m.r} rot={m.rot} motas={m.motas}
            ink={P.roseta} centro={P.rosetaCentro} opacity={m.o ?? 0.95} />
        ))}
      </g>
      {/* MANCHAS SÓLIDAS del vientre claro (la zona ventral no lleva rosetas). */}
      <g aria-hidden="true" fill={P.roseta} opacity="0.72">
        {PUNTOS_VIENTRE.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={p.r} />
        ))}
      </g>
      {/* MARCAS-ESPÍRITU del lomo — las rosetas gemelas espectrales: invisibles
          en reposo (opacity 0 por CSS), se ENCIENDEN y laten cuando el espíritu
          se revela (revelación / modo poder). */}
      <g className="jaguar-marcas-espiritu" aria-hidden="true" fill="none"
        stroke={P.marcaEspiritu} strokeLinecap="round">
        {ROSETAS_CUERPO.map((m, i) => (
          <ellipse key={i} cx={m.cx} cy={m.cy} rx={m.r} ry={m.r * 0.88}
            strokeWidth={m.r * 0.5} strokeDasharray={anilloRoto(m.r)}
            transform={`rotate(${m.rot} ${m.cx} ${m.cy})`} />
        ))}
      </g>

      {/* CONSTELACIÓN del lomo — retícula de estrellas sobre las rosetas: la
          telaraña de líneas etéreas punteadas (el patrón andino) RESPIRA
          (pulso co-primo con el titilar) y las estrellas TITILAN en los
          centros de mancha — grandes en los vértices mayores, menores en los
          secundarios. El cielo nocturno del jaguar-espíritu. Decorativa. */}
      <g className="jaguar-constelacion" aria-hidden="true">
        <path className={vivo ? 'jaguar-constelacion-linea' : undefined}
          d="M-4.9,-0.5 L-5.2,2.6 L-3.6,6.4 M4.9,-0.7 L5.2,2.8 L3.6,6.5"
          fill="none" stroke={P.espectral}
          strokeWidth="0.3" strokeLinecap="round" strokeDasharray="0.5 1.1" opacity="0.28" />
        {ESTRELLAS_LOMO.map((e, i) => (
          <Estrella key={i} cx={e.cx} cy={e.cy} r={e.r} delay={e.d} color={P.estrella} vivo={vivo} />
        ))}
      </g>

      {/* OMÓPLATOS del ACECHO (la firma del jaguar): dos picos musculosos sobre el
          lomo que SUBEN al moverse (más en modo acecho). Grupo propio
          (.jaguar-hombros) que la CSS anima. Van sobre el tronco, detrás de la
          cabeza y los bracitos. */}
      <g className="jaguar-hombros" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        <path d="M-6.4,-1.4 Q-4.4,-6.2 -1.8,-2.6 Z" fill={`url(#${anca})`} stroke={RH_INK} strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M6.4,-1.4 Q4.4,-6.2 1.8,-2.6 Z" fill={`url(#${anca})`} stroke={RH_INK} strokeWidth="1.1" strokeLinejoin="round" />
        {/* la luz que rueda sobre el omóplato (painterly, respira con el grupo) */}
        <path d="M-5.3,-3.1 Q-4.4,-4.8 -3.2,-3.4" fill="none" stroke={P.brillo}
          strokeWidth="0.55" strokeLinecap="round" opacity="0.6" filter={`url(#${pincel})`} aria-hidden="true" />
        <path d="M5.3,-3.1 Q4.4,-4.8 3.2,-3.4" fill="none" stroke={P.brillo}
          strokeWidth="0.55" strokeLinecap="round" opacity="0.6" filter={`url(#${pincel})`} aria-hidden="true" />
      </g>

      {/* GLIFOS — espirales de ornamento geométrico (acento cobre)
          sobre los hombros. Símbolo de poder como ADORNO (nunca arma).
          Invisibles en reposo; se encienden en la revelación / el poder (CSS).
          Van sobre el lomo, bajo los bracitos y la cabeza. Decorativos. */}
      <g className="jaguar-glifos" aria-hidden="true" fill="none" stroke={P.cobre}
        strokeWidth="0.42" strokeLinecap="round">
        <path transform="translate(-5.4 -0.6) scale(0.85)" d={GLIFO_ESPIRAL} />
        <path transform="translate(5.4 -0.6) scale(-0.85 0.85)" d={GLIFO_ESPIRAL} />
      </g>

      {/* bracitos manguera GRUESOS (zarpas delanteras grandes y redondas) con
          planta crema, pivote en el HOMBRO para que celebra/señala los alcen
          desde el hombro. Patas cortas y macizas — el felino asienta bajo. */}
      <PataJaguar clase="crt-brazo-l" origen="right top"
        d="M-7.0,-1.0 C-9.6,0.6 -10.4,3.2 -9.6,5.8" ancho={3.9} punta={[-9.6, 6.2]} puntaR={2.6} pelaje={P.cuerpo} sway={vivo} delay={-0.15} />
      <PataJaguar clase="crt-brazo-r" origen="left top"
        d="M7.0,-1.0 C9.6,0.6 10.4,3.2 9.6,5.8" ancho={3.9} punta={[9.6, 6.2]} puntaR={2.6} pelaje={P.cuerpo} sway={vivo} delay={-0.45} />

      {/* PUNTOS DE LAS PATAS — la transición del patrón: rosetas grandes en el
          lomo, puntos sólidos chicos en las extremidades. Van DESPUÉS de los
          miembros (si no, las patas los taparían). Decorativos. */}
      <g aria-hidden="true" fill={P.roseta} opacity="0.6">
        {PUNTOS_PATAS.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={p.r} />
        ))}
      </g>

      {/* CABEZA MACIZA (grupo propio .jaguar-cabeza para que el ACECHO la baje;
          el wrapper ADITIVO .jaguar-cabeza-mira la hace SEGUIR AL USUARIO —
          mirausted — sin pisar la animación del acecho). Ancha y robusta —
          el jaguar tiene la cabeza más maciza y la mordida más potente de los
          felinos americanos: cráneo ESCULPIDO más ancho que alto, carrilleras
          de pelaje en picos y mandíbula prominente. NO redondita-genérica.
          Como TODO es vector continuo, la testa puede desplazarse/bajar y el
          pelaje del cuello (dibujado con solape generoso bajo ella) se estira
          sin costura: jamás se decapita. */}
      {/* GOLA DE PELAJE — la masa dorada del cuello bajo la testa: la barbilla
          (con su tinta) aterriza aquí y no sobre el pecho crema, y cuando la
          cabeza baja (acecho) o se desplaza (mirausted) este pelaje es el
          CUELLO CONTINUO que se estira debajo — sin costura posible. */}
      <g aria-hidden="true">
        <path d="M-4.6,-3.6 C-4.9,-5.6 -3.2,-7.0 0,-7.0 C3.2,-7.0 4.9,-5.6 4.6,-3.6 C4.4,-1.8 2.6,-0.8 0,-0.8 C-2.6,-0.8 -4.4,-1.8 -4.6,-3.6 Z"
          fill={P.cuerpo} />
        <path d="M-3.4,-1.4 L-2.7,-0.7 L-1.9,-1.5 M1.9,-1.5 L2.7,-0.7 L3.4,-1.4"
          fill="none" stroke={P.cuerpoSombra} strokeWidth="0.4" strokeLinecap="round" opacity="0.6" />
      </g>
      <g className="jaguar-cabeza-mira">
      {/* proporción FELINA: la testa del retrato baja un 13% (anti-chibi — la
          cabeza del jaguar es maciza pero no un globo). Escala estática sobre
          el conjunto orejas+cabeza; acecho (dentro) y mirausted (fuera) no se
          enteran. El solape barbilla→pecho queda ≥3 unidades: sin costura. */}
      <g transform="translate(0,-0.5) scale(0.87)">
        {/* orejas redondas de felino: detrás del cráneo, se mecen con
            follow-through y VIAJAN con la testa al mirar. Dorso oscuro con la
            mancha ocre central del jaguar real + mechones internos. */}
        <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: '-0.2s' }}>
          <circle cx="-4.4" cy="-13.4" r={PR.orejaR} fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.2" />
          <circle cx="-4.4" cy="-13.4" r={PR.orejaR * 0.62} fill={P.oreja} />
          <circle cx="-4.4" cy="-13.15" r={PR.orejaR * 0.26} fill={P.rosetaCentro} opacity="0.85" />
          <path d="M-5.2,-12.5 L-4.85,-13.05 M-4.35,-12.3 L-4.15,-12.95" fill="none"
            stroke={P.vientre} strokeWidth="0.28" strokeLinecap="round" opacity="0.8" />
        </g>
        <g className={vivo ? 'rh-sway' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: '-0.5s' }}>
          <circle cx="4.4" cy="-13.4" r={PR.orejaR} fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.2" />
          <circle cx="4.4" cy="-13.4" r={PR.orejaR * 0.62} fill={P.oreja} />
          <circle cx="4.4" cy="-13.15" r={PR.orejaR * 0.26} fill={P.rosetaCentro} opacity="0.85" />
          <path d="M5.2,-12.5 L4.85,-13.05 M4.35,-12.3 L4.15,-12.95" fill="none"
            stroke={P.vientre} strokeWidth="0.28" strokeLinecap="round" opacity="0.8" />
        </g>
      <g className="jaguar-cabeza" style={{ transformBox: 'fill-box', transformOrigin: 'center top' }}>
        {/* MEJILLAS/MANDÍBULA anchas (las carrilleras del jaguar) — bajo el
            cráneo, ensanchan la testa a los lados. Van primero (el hocico y la
            cara se apoyan encima). */}
        <g aria-hidden="true">
          <ellipse cx="-4.9" cy="-6.4" rx="2.2" ry="2.6" fill={P.cuerpo} stroke={RH_INK} strokeWidth="0.9" />
          <ellipse cx="4.9" cy="-6.4" rx="2.2" ry="2.6" fill={P.cuerpo} stroke={RH_INK} strokeWidth="0.9" />
        </g>
        {/* CRÁNEO ESCULPIDO — frente amplia, pómulos y CARRILLERAS de pelaje en
            picos (el borde ya no es elipse: es pelo). Mismo footprint del
            cráneo de siempre (el rig ni se entera). */}
        <path d="M0,-14.35 C3.0,-14.35 5.3,-13.3 6.4,-11.6 C7.3,-10.2 7.5,-8.6 7.0,-7.1 L7.9,-6.5 L6.85,-6.05 L7.45,-5.1 L6.2,-4.9 C5.3,-3.5 3.1,-2.55 0,-2.55 C-3.1,-2.55 -5.3,-3.5 -6.2,-4.9 L-7.45,-5.1 L-6.85,-6.05 L-7.9,-6.5 L-7.0,-7.1 C-7.5,-8.6 -7.3,-10.2 -6.4,-11.6 C-5.3,-13.3 -3.0,-14.35 0,-14.35 Z"
          fill={`url(#${pelaje})`} stroke={RH_INK} strokeWidth="1.3" strokeLinejoin="round" />
        {/* grano de pelaje del cráneo (misma silueta, overlay de turbulencia) */}
        <path d="M0,-14.35 C3.0,-14.35 5.3,-13.3 6.4,-11.6 C7.3,-10.2 7.5,-8.6 7.0,-7.1 L7.9,-6.5 L6.85,-6.05 L7.45,-5.1 L6.2,-4.9 C5.3,-3.5 3.1,-2.55 0,-2.55 C-3.1,-2.55 -5.3,-3.5 -6.2,-4.9 L-7.45,-5.1 L-6.85,-6.05 L-7.9,-6.5 L-7.0,-7.1 C-7.5,-8.6 -7.3,-10.2 -6.4,-11.6 C-5.3,-13.3 -3.0,-14.35 0,-14.35 Z"
          fill={P.cuerpo} filter={`url(#${grano})`} aria-hidden="true" />
        {/* SOMBREADO PAINTERLY de la testa: luz en la corona y las cejas,
            penumbra en las cuencas y bajo el morro (aguada de pincel). */}
        <g aria-hidden="true" filter={`url(#${pincel})`}>
          <path d="M-5.4,-12.0 C-3.3,-13.2 3.3,-13.2 5.4,-12.0 C3.1,-12.6 -3.1,-12.6 -5.4,-12.0 Z"
            fill={P.brillo} opacity="0.3" />
          <ellipse cx="-2.5" cy="-11.35" rx="1.6" ry="0.75" fill={P.brillo} opacity="0.35" />
          <ellipse cx="2.5" cy="-11.35" rx="1.6" ry="0.75" fill={P.brillo} opacity="0.35" />
          <ellipse cx="-5.0" cy="-8.0" rx="1.5" ry="1.9" fill={P.umbra} opacity="0.16" />
          <ellipse cx="5.0" cy="-8.0" rx="1.5" ry="1.9" fill={P.umbra} opacity="0.16" />
          <ellipse cx="0" cy="-3.3" rx="2.5" ry="0.8" fill={P.umbra} opacity="0.18" />
        </g>
        {/* hocico claro ANCHO que baja al morro (mandíbula robusta) */}
        <path d="M-3.0,-6.7 C-1.4,-5.1 1.4,-5.1 3.0,-6.7 C3.3,-4.1 2.1,-2.85 0,-2.75 C-2.1,-2.85 -3.3,-4.1 -3.0,-6.7 Z"
          fill={P.hocico} opacity="0.95" />
        {/* rosetas de la frente/mejillas (anillos rotos — la firma también en
            la cara), desde la misma fuente de datos que sus marcas-espíritu */}
        <g aria-hidden="true">
          {ROSETAS_CARA.map((m, i) => (
            <Roseta key={i} cx={m.cx} cy={m.cy} r={m.r} rot={m.rot}
              ink={P.roseta} centro={P.rosetaCentro} opacity={m.o} />
          ))}
        </g>
        {/* PUNTOS SÓLIDOS pequeños de la corona/hocico (distribución real: la
            cabeza lleva puntos sólidos, no rosetas — anti-leopardo por zona). */}
        <g aria-hidden="true" fill={P.roseta} opacity="0.62">
          <circle cx="-1.7" cy="-12.9" r="0.42" />
          <circle cx="1.7" cy="-12.9" r="0.42" />
          <circle cx="0" cy="-13.4" r="0.36" />
          <circle cx="-0.9" cy="-6.9" r="0.3" />
          <circle cx="0.9" cy="-6.9" r="0.3" />
        </g>
        {/* marcas-espíritu de la cara (gemelas espectrales, ver las del lomo) */}
        <g className="jaguar-marcas-espiritu" aria-hidden="true" fill="none"
          stroke={P.marcaEspiritu} strokeLinecap="round">
          {ROSETAS_CARA.map((m, i) => (
            <ellipse key={i} cx={m.cx} cy={m.cy} rx={m.r} ry={m.r * 0.88}
              strokeWidth={m.r * 0.5} strokeDasharray={anilloRoto(m.r)}
              transform={`rotate(${m.rot} ${m.cx} ${m.cy})`} />
          ))}
        </g>
        {/* CONSTELACIÓN de la frente — vive DENTRO de la cabeza (dibujada tras
            el círculo, si no quedaba oculta) y baja con la testa en el acecho. */}
        <g className="jaguar-constelacion" aria-hidden="true">
          <path className={vivo ? 'jaguar-constelacion-linea' : undefined}
            d="M-4.3,-11.5 L4.3,-11.5" fill="none" stroke={P.espectral}
            strokeWidth="0.3" strokeLinecap="round" strokeDasharray="0.5 1.1" opacity="0.28" />
          {ESTRELLAS_FRENTE.map((e, i) => (
            <Estrella key={i} cx={e.cx} cy={e.cy} r={e.r} delay={e.d} color={P.estrella} vivo={vivo} />
          ))}
        </g>
        {/* CEJAS FIERAS del depredador (mirada intensa y focalizada): trazos
            angulados con el extremo INTERNO más bajo. Identidad (no opt-in); se
            fruncen más al rugir/acechar (CSS). En su grupo .jaguar-cejas. */}
        <g className="jaguar-cejas" stroke={RH_INK} strokeWidth="1.25" strokeLinecap="round" fill="none">
          <path d="M-5.2,-11.9 L-1.7,-10.8" />
          <path d="M5.2,-11.9 L1.7,-10.8" />
        </g>
        {/* chapetas + boca + trufa + ojos ámbar dentro de la cara */}
        <Cachetes puntos={[{ cx: -4.4, cy: -6.4, r: 1.2 }, { cx: 4.4, cy: -6.4, r: 1.2 }]} vivo={vivo} />
        {boca}
        {/* VIBRISAS — los bigotes del felino (crema claro, finísimos) nacen de
            motas oscuras en el hocico, como en el jaguar real. Realismo felino
            sin perder la goma. */}
        <g aria-hidden="true" fill={P.roseta} opacity="0.45">
          <circle cx="-1.9" cy="-5.1" r="0.2" /><circle cx="-1.4" cy="-4.6" r="0.18" /><circle cx="-2.3" cy="-4.5" r="0.16" />
          <circle cx="1.9" cy="-5.1" r="0.2" /><circle cx="1.4" cy="-4.6" r="0.18" /><circle cx="2.3" cy="-4.5" r="0.16" />
        </g>
        <g aria-hidden="true" fill="none" stroke={P.vibrisa} strokeWidth="0.3" strokeLinecap="round" opacity="0.6">
          <path d="M-2.6,-5.0 C-4.7,-4.9 -6.3,-5.2 -7.7,-5.9" />
          <path d="M-2.6,-4.4 C-4.5,-4.1 -6.1,-4.0 -7.5,-4.3" />
          <path d="M-2.5,-3.9 C-4.2,-3.4 -5.6,-3.2 -6.9,-3.4" />
          <path d="M2.6,-5.0 C4.7,-4.9 6.3,-5.2 7.7,-5.9" />
          <path d="M2.6,-4.4 C4.5,-4.1 6.1,-4.0 7.5,-4.3" />
          <path d="M2.5,-3.9 C4.2,-3.4 5.6,-3.2 6.9,-3.4" />
        </g>
        {/* TRUFA real del felino — ya no un triángulo: nariz ancha redondeada
            con narinas en coma, brillo húmedo y surco del labio (filtrum). */}
        <g aria-hidden="true">
          <path d="M-1.35,-5.0 C-1.35,-5.55 1.35,-5.55 1.35,-5.0 C1.35,-4.25 0.55,-3.7 0,-3.7 C-0.55,-3.7 -1.35,-4.25 -1.35,-5.0 Z"
            fill={P.nariz} />
          <path d="M-0.85,-4.75 Q-0.55,-4.98 -0.38,-4.72" fill="none" stroke="#1c0f08" strokeWidth="0.24" strokeLinecap="round" />
          <path d="M0.85,-4.75 Q0.55,-4.98 0.38,-4.72" fill="none" stroke="#1c0f08" strokeWidth="0.24" strokeLinecap="round" />
          <ellipse cx="-0.42" cy="-5.15" rx="0.46" ry="0.2" fill="#9c7666" opacity="0.85" />
          <path d="M0,-3.7 L0,-3.32" fill="none" stroke={RH_INK} strokeWidth="0.26" strokeLinecap="round" opacity="0.8" />
        </g>
        {/* OJOS grandes, ámbar y EXPRESIVOS (el registro de casa: carisma con
            alma — catchlight del kit + parpadeo + micro-mirada). Nunca vacíos:
            la nobleza vive en el ojo aunque el gesto se ponga serio. El grupo
            .jaguar-ojos CAMBIA DE FORMA por CSS: REDONDOS en reposo (carisma
            cálido) → ALMENDRADOS al acechar/rugir/revelarse (concentración,
            "mira a través de ti"), conservando la nobleza felina (registro
            Mufasa: autoridad noble, jamás villano). */}
        <g className="jaguar-ojos" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          <OjosRubber
            ojos={[{ cx: -2.5, cy: -9.2, r: 1.85 }, { cx: 2.5, cy: -9.2, r: 1.85 }]}
            mirar={[0, 0.1]}
            parpadea={vivo}
          />
          {/* MIRADA FELINA ÁMBAR: iris que enmarca la pupila (sobre la esclerótica,
              fuera del negro de la pupila) → la intensidad del ojo de gato. */}
          <g aria-hidden="true" fill="none" stroke={P.iris} strokeWidth="0.6" opacity="0.85">
            <circle cx="-2.5" cy="-9.2" r="1.44" />
            <circle cx="2.5" cy="-9.2" r="1.44" />
          </g>
          {/* PÁRPADOS de la lámina: delineado superior de tinta (la pestaña del
              felino) y el ribete crema inferior — realismo sin perder la goma. */}
          <g aria-hidden="true" fill="none" strokeLinecap="round">
            <path d="M-4.15,-10.1 Q-2.5,-11.35 -0.9,-10.15" stroke={RH_INK} strokeWidth="0.45" opacity="0.75" />
            <path d="M4.15,-10.1 Q2.5,-11.35 0.9,-10.15" stroke={RH_INK} strokeWidth="0.45" opacity="0.75" />
            <path d="M-3.95,-7.95 Q-2.5,-7.25 -1.1,-7.9" stroke={P.vientre} strokeWidth="0.4" opacity="0.9" />
            <path d="M3.95,-7.95 Q2.5,-7.25 1.1,-7.9" stroke={P.vientre} strokeWidth="0.4" opacity="0.9" />
          </g>
          {/* OJOS LUMINOSOS — el tapetum del felino, el ojo que devuelve la luz
              de noche: un halo suave que respira sobre cada ojo. Sutil siempre;
              MÁS BRILLANTE en modo poder / revelación (CSS). */}
          <g className={vivo ? 'jaguar-ojo-brillo' : undefined} filter={`url(#${blur})`} aria-hidden="true"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
            <circle cx="-2.5" cy="-9.2" r="1.25" fill={P.ojoBrillo} opacity="0.55" />
            <circle cx="2.5" cy="-9.2" r="1.25" fill={P.ojoBrillo} opacity="0.55" />
          </g>
        </g>
      </g>
      </g>{/* /escala felina */}
      </g>{/* /jaguar-cabeza-mira */}

      {/* Vestuario por clima+hora (RUANA de noche/frío) — solo con vestuario=true.
          Sombrero/sudor van suprimidos (el jaguar de tierra cálida no suda). */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 2, rx: PR.troncoRx, ry: PR.troncoRy }}
          cabeza={{ cx: 0, cy: -8.2, r: PR.cabezaR }}
          animated={vivo}
        />
      )}

      {/* Prop del mundo en la zarpa (entra heroico con su herramienta). */}
      {propMundo}

      {/* BRUMA ETÉREA — el velo del mundo-espíritu a los pies: vela apenas las
          zarpas (por eso va al frente) y deriva lentísimo. En la revelación se
          ADENSA (CSS). */}
      <ellipse className={vivo ? 'jaguar-bruma' : undefined} cx="0" cy="11.8" rx="9.4" ry="2.1"
        fill={P.bruma} opacity="0.1" filter={`url(#${blur})`}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }} aria-hidden="true" />

      {/* MOTAS DE LUZ — polvo del espíritu que flota lento alrededor del
          felino; cada mota con su delay/duración propios (nunca en compás).
          Quietas y tenues con animated=false / RM / tier bajo. */}
      <g aria-hidden="true" fill={P.mota}>
        {MOTAS.map((m, i) => (
          <circle key={i} className={vivo ? 'jaguar-mota' : undefined}
            cx={m.cx} cy={m.cy} r={m.r} opacity="0.3"
            style={vivo ? { animationDelay: `${m.d}s`, animationDuration: `${m.s}s` } : undefined} />
        ))}
      </g>
    </g>
  );

  // ── MARCHA DE PERFIL (.jaguar-lado, pose 'camina') ─────────────────────────
  // El rig LATERAL con el que el jaguar CAMINA por una escena (el frontal
  // sentado no puede caminar creíble — veredicto del operador). Fiel al DR:
  // cuerpo compacto y profundo, patas cortas y GRUESAS (doble trazo tinta +
  // pelaje), cola CORTA llevada baja con anillos y punta negra, testa maciza
  // BAJA de depredador solapada al pecho, pupila REDONDA de gran felino,
  // trufa grande, bigotes gruesos, rosetas anillo-roto ESPACIADAS (misma
  // fuente <Roseta/>: la regla de oro anti-leopardo también de perfil) y la
  // capa mística del DR chamánico (aura, estrellas del pelaje = la noche
  // estrellada, glifo cobre, bruma, motas). La CADENCIA vive en creatures.css
  // (jaguar-lado-*): ciclo 1.05s de 4 tiempos, gruñido cada 6.3s. Dibujado
  // mirando a la DERECHA; el host espeja con scaleX según el rumbo.
  const lado = marchando ? (
    <g className="jaguar-lado" transform="translate(0 -3.6) scale(0.08)" filter={`url(#${glow})`}>
      {/* aura mística que late (violeta espectral + calor del pelaje) */}
      <g className="jaguar-lado-aura" aria-hidden="true">
        <ellipse cx="0" cy="60" rx="235" ry="175" fill={P.espectral} opacity="0.06" filter={`url(#${blur})`} />
        <ellipse cx="0" cy="75" rx="185" ry="135" fill={P.cuerpo} opacity={auraOp * 0.45} filter={`url(#${blur})`} />
      </g>
      {/* sombra de suelo (peso) */}
      <ellipse cx="-5" cy="208" rx="165" ry="14" fill={P.sombraSuelo} filter={`url(#${blur})`} aria-hidden="true" />

      <g className="jaguar-lado-tronco">
        {/* COLA corta llevada BAJA (DR) — PESADA de verdad: gruesa en la base,
            pelaje en dos luces (leonado abajo, luz en la vuelta), sombra de
            pincel ventral, manchas en la base → anillos → punta NEGRA maciza. */}
        <g className="jaguar-lado-cola">
          <g className="jaguar-lado-colapunta">
            <path d="M-128,50 C -172,66 -204,62 -226,38 C -238,24 -238,4 -228,-8"
              fill="none" stroke={RH_INK} strokeWidth="25" strokeLinecap="round" />
            <path d="M-128,51 C -168,64 -198,61 -219,42"
              fill="none" stroke={P.cuerpo} strokeWidth="20" strokeLinecap="round" />
            <path d="M-215,45 C -230,32 -234,12 -227,-6"
              fill="none" stroke={P.cuerpoLuz} strokeWidth="17" strokeLinecap="round" />
            {/* sombra ventral del tubo (aguada painterly, no tinta) */}
            <path d="M-134,58 C -172,68 -200,64 -220,46" fill="none" stroke={P.umbra}
              strokeWidth="7" strokeLinecap="round" opacity="0.35" filter={`url(#${pincelL})`} aria-hidden="true" />
            <g fill={P.roseta} opacity="0.82">
              <circle cx="-150" cy="55" r="5" /><circle cx="-166" cy="57" r="4.5" />
              <ellipse cx="-181" cy="55" rx="4.8" ry="3.9" />
            </g>
            <path d="M-198,53 C -216,44 -228,28 -230,8"
              fill="none" stroke={P.roseta} strokeWidth="20" strokeLinecap="butt"
              strokeDasharray="7 11.5" strokeDashoffset="-2" opacity="0.92" />
            {/* punta negra en GOTA (masa, no circulito) */}
            <path d="M-233,6 C -238,-2 -237,-13 -229,-17 C -221,-19 -214,-13 -216,-3 C -218,4 -227,11 -233,6 Z"
              fill={P.roseta} />
          </g>
        </g>

        {/* patas del lado de ALLÁ (pelaje en penumbra — profundidad de lámina):
            zarpa ESCULPIDA con dedos leídos por la tinta, muñeca/corvejón
            marcados y puntos del patrón (hacia las patas se simplifica). */}
        <g className="jaguar-lado-pata jaguar-lado-dl">
          <path d="M68,108 C 72,140 70,168 66,190" fill="none" stroke={RH_INK} strokeWidth="30" strokeLinecap="round" />
          <path d="M68,108 C 72,140 70,168 66,190" fill="none" stroke={P.lejos} strokeWidth="23.5" strokeLinecap="round" />
          <g fill={P.roseta} opacity="0.45"><circle cx="70" cy="138" r="3.2" /><circle cx="67" cy="162" r="2.7" /></g>
          <path d="M48,203 C 46,195 51,189 62,187 C 74,185 84,187 89,192 C 93,197 92,202 88,205 L52,206 Z"
            fill="#cdb28b" stroke={RH_INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M64,189 C 63,195 64,200 66,204 M76,188 C 76,194 77,199 79,203"
            fill="none" stroke={RH_INK} strokeWidth="1.6" opacity="0.5" strokeLinecap="round" />
        </g>
        <g className="jaguar-lado-pata jaguar-lado-tl">
          <path d="M-108,108 C -118,134 -120,158 -108,176 C -102,184 -100,188 -101,191"
            fill="none" stroke={RH_INK} strokeWidth="32" strokeLinecap="round" />
          <path d="M-108,108 C -118,134 -120,158 -108,176 C -102,184 -100,188 -101,191"
            fill="none" stroke={P.lejos} strokeWidth="25.5" strokeLinecap="round" />
          <g fill={P.roseta} opacity="0.45"><circle cx="-113" cy="136" r="3.2" /><circle cx="-108" cy="164" r="2.7" /></g>
          <path d="M-122,203 C -124,195 -119,189 -108,187 C -96,185 -86,187 -81,192 C -77,197 -78,202 -82,205 L-118,206 Z"
            fill="#cdb28b" stroke={RH_INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M-106,189 C -107,195 -106,200 -104,204 M-94,188 C -94,194 -93,199 -91,203"
            fill="none" stroke={RH_INK} strokeWidth="1.6" opacity="0.5" strokeLinecap="round" />
        </g>

        {/* TRONCO ESCULPIDO — la silueta REAL de Panthera onca de perfil (DR:
            compacto y PROFUNDO, jamás alargado): cruz baja, lomo recto y
            macizo, PECHO HONDO (el brisket baja más que la panza), vientre que
            sube apenas hacia la ingle y el ANCA redonda y poderosa. Fill =
            gradiente dorso→vientre; encima el GRANO de turbulencia, las masas
            painterly y el patrón POR ZONAS de la especie. */}
        <path d="M36,4 C 0,10 -44,12 -84,10 C -108,8 -126,14 -138,28 C -150,42 -154,64 -151,88 C -148,112 -136,128 -114,136 C -98,142 -82,140 -70,136 C -38,141 -2,141 28,136 C 58,131 88,137 106,146 C 122,142 131,124 133,102 C 135,80 131,58 123,44 C 107,24 76,10 36,4 Z"
          fill={`url(#${dorso})`} stroke={RH_INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M36,4 C 0,10 -44,12 -84,10 C -108,8 -126,14 -138,28 C -150,42 -154,64 -151,88 C -148,112 -136,128 -114,136 C -98,142 -82,140 -70,136 C -38,141 -2,141 28,136 C 58,131 88,137 106,146 C 122,142 131,124 133,102 C 135,80 131,58 123,44 C 107,24 76,10 36,4 Z"
          fill={P.cuerpo} filter={`url(#${granoL})`} aria-hidden="true" />
        {/* masas painterly: espina iluminada, penumbra ventral, la sombra de la
            caja costal tras el codo y la luz frontal del pecho */}
        <g aria-hidden="true" filter={`url(#${pincelL})`}>
          <path d="M28,10 C -16,16 -72,16 -118,24" fill="none" stroke={P.brillo} strokeWidth="16" strokeLinecap="round" opacity="0.7" />
          <path d="M-76,126 C -28,137 34,137 92,140" fill="none" stroke={P.umbra} strokeWidth="21" strokeLinecap="round" opacity="0.6" />
          <path d="M84,58 C 78,84 80,112 90,134" fill="none" stroke={P.umbra} strokeWidth="19" strokeLinecap="round" opacity="0.45" />
          <path d="M112,52 C 120,72 122,100 116,124" fill="none" stroke={P.brillo} strokeWidth="11" strokeLinecap="round" opacity="0.55" />
        </g>
        {/* SOMBRA DE NUCLEO — la banda de forma del tercio inferior (la vuelta
            del cilindro del cuerpo hacia la penumbra, como en la lamina) */}
        <path d="M-134,96 C -90,116 -20,122 48,118 C 84,116 104,122 104,130 C 60,136 -40,138 -104,128 C -126,120 -136,108 -134,96 Z"
          fill={P.umbra} opacity="0.24" filter={`url(#${pincelL})`} aria-hidden="true" />
        {/* ANCA — el muslo como masa muscular con su radial de luz propia */}
        <path d="M-60,54 C -100,48 -132,64 -140,94 C -145,122 -128,140 -102,142 C -78,142 -62,128 -56,105 C -51,82 -50,62 -60,54 Z"
          fill={`url(#${anca})`} opacity="0.96" aria-hidden="true" />
        <path d="M-58,64 C -66,88 -68,112 -60,132" fill="none" stroke={P.umbra}
          strokeWidth="12" opacity="0.45" filter={`url(#${pincelL})`} aria-hidden="true" />
        {/* VIENTRE crema con borde de MECHONES (el borde es pelo, no recorte) */}
        <path d="M-66,132 C -30,140 30,140 80,142 C 62,150 -20,152 -66,138 Z" fill={P.vientre} opacity="0.85" />
        <path d="M-60,134 l7,5 8,-4 8,5 9,-4 8,4 9,-3" fill="none" stroke={P.vientre}
          strokeWidth="3" strokeLinecap="round" opacity="0.9" aria-hidden="true" />
        <g aria-hidden="true" fill="none" stroke={P.cuerpoSombra} strokeWidth="2" strokeLinecap="round" opacity="0.55">
          <path d="M104,120 l6,5 -5,6 6,5" />
          <path d="M-116,128 l-5,5 6,4 -5,5" />
          <path d="M-146,80 l-5,4 5,4" />
        </g>
        {/* costillar y masas sugeridos a lo GRABADO (tinta apenas) */}
        <g fill="none" stroke={RH_INK} strokeWidth="2" opacity="0.16" strokeLinecap="round" aria-hidden="true">
          <path d="M22,60 C 12,88 14,116 26,132" />
          <path d="M-6,58 C -16,86 -14,114 -4,132" />
          <path d="M62,50 C 56,76 58,104 68,128" />
          <path d="M-96,52 C -120,84 -118,120 -96,142" />
        </g>
        {/* PELO GRABADO — matas de trazos cortos direccionales siguiendo el
            contorno (la caligrafía de la lámina naturalista): nuca→cruz,
            frente del pecho, borde del anca y barriga. */}
        <g aria-hidden="true" fill="none" stroke={P.cuerpoSombra} strokeWidth="1.6" strokeLinecap="round" opacity="0.45">
          <path d="M30,7 q7,-4 13,-5 M12,10 q7,-4 13,-5 M-8,12 q7,-4 13,-5 M-30,13 q7,-4 13,-4 M-54,13 q7,-3 13,-3" />
          <path d="M126,58 q-5,7 -4,13 M130,78 q-5,7 -4,13 M128,98 q-5,6 -5,12" />
          <path d="M-146,60 q-4,7 -3,13 M-150,84 q-3,7 -2,13 M-147,108 q-2,6 0,12" />
          <path d="M-22,138 q4,5 10,6 M20,137 q4,5 10,6 M58,138 q5,5 11,6" />
          <path d="M-136,34 q6,-5 12,-6 M-118,26 q6,-5 13,-5" />
        </g>
        {/* LA LÍNEA MEDIO-DORSAL de manchas alargadas (seña real de la especie) */}
        <g aria-hidden="true" fill={P.roseta} opacity="0.82">
          <ellipse cx="-116" cy="16" rx="9" ry="3.4" transform="rotate(-8 -116 16)" />
          <ellipse cx="-86" cy="11" rx="10" ry="3.6" transform="rotate(-3 -86 11)" />
          <ellipse cx="-52" cy="11" rx="9" ry="3.2" transform="rotate(2 -52 11)" />
          <ellipse cx="-18" cy="12" rx="8" ry="3" transform="rotate(3 -18 12)" />
          <ellipse cx="14" cy="9" rx="8" ry="3" transform="rotate(-6 14 9)" />
        </g>
        {/* ROSETAS del flanco — misma <Roseta/> del frontal (anillo roto +
            puntos internos), en FILAS que siguen la curva del cuerpo: grandes
            en el costado, menores hacia el anca y la panza */}
        <g aria-hidden="true">
          <Roseta cx={-98} cy={44} r={19} rot={130} motas={2} organica ink={P.roseta} centro={P.rosetaCentro} />
          <Roseta cx={-50} cy={35} r={21} rot={15} motas={3} organica ink={P.roseta} centro={P.rosetaCentro} />
          <Roseta cx={0} cy={34} r={20} rot={250} motas={3} organica ink={P.roseta} centro={P.rosetaCentro} />
          <Roseta cx={44} cy={38} r={16.5} rot={205} motas={2} organica ink={P.roseta} centro={P.rosetaCentro} opacity={0.94} />
          <Roseta cx={-132} cy={56} r={13.5} rot={320} motas={2} organica ink={P.roseta} centro={P.rosetaCentro} opacity={0.92} />
          <Roseta cx={-114} cy={96} r={14.5} rot={40} motas={2} organica ink={P.roseta} centro={P.rosetaCentro} opacity={0.94} />
          <Roseta cx={-74} cy={78} r={17.5} rot={85} motas={2} organica ink={P.roseta} centro={P.rosetaCentro} />
          <Roseta cx={-26} cy={74} r={17} rot={300} motas={2} organica ink={P.roseta} centro={P.rosetaCentro} />
          <Roseta cx={22} cy={72} r={15.5} rot={40} motas={2} organica ink={P.roseta} centro={P.rosetaCentro} opacity={0.95} />
          <Roseta cx={62} cy={68} r={12.5} rot={160} motas={1} organica ink={P.roseta} centro={P.rosetaCentro} opacity={0.9} />
          <Roseta cx={-84} cy={114} r={12.5} rot={205} motas={1} organica ink={P.roseta} centro={P.rosetaCentro} opacity={0.92} />
          <Roseta cx={-40} cy={110} r={12} rot={95} motas={1} organica ink={P.roseta} centro={P.rosetaCentro} opacity={0.9} />
          <Roseta cx={4} cy={108} r={11.5} rot={280} motas={1} organica ink={P.roseta} centro={P.rosetaCentro} opacity={0.9} />
          <Roseta cx={78} cy={40} r={11.5} rot={300} motas={1} organica ink={P.roseta} centro={P.rosetaCentro} opacity={0.9} />
        </g>
        {/* hacia pecho y vientre el patrón se SIMPLIFICA: puntos sólidos */}
        <g aria-hidden="true" fill={P.roseta} opacity="0.62">
          <circle cx="86" cy="86" r="4.6" /><circle cx="98" cy="106" r="4" />
          <circle cx="104" cy="126" r="3.6" /><circle cx="72" cy="112" r="3.8" />
          <circle cx="34" cy="104" r="3.6" /><circle cx="-30" cy="130" r="3.4" />
          <circle cx="4" cy="128" r="3.2" /><circle cx="-64" cy="126" r="3.2" />
        </g>
        {/* SOMBRA DE FORMA sobre el patrón: el cuerpo entero GIRA a la penumbra
            hacia abajo y recibe la luz de cresta arriba — rosetas incluidas
            (la gradación painterly de la lámina, inconfundible). */}
        <path d="M36,4 C 0,10 -44,12 -84,10 C -108,8 -126,14 -138,28 C -150,42 -154,64 -151,88 C -148,112 -136,128 -114,136 C -98,142 -82,140 -70,136 C -38,141 -2,141 28,136 C 58,131 88,137 106,146 C 122,142 131,124 133,102 C 135,80 131,58 123,44 C 107,24 76,10 36,4 Z"
          fill={`url(#${dorso}-forma)`} aria-hidden="true" />
        {/* la noche estrellada sobre el pelaje (registro nocturno) — en la
            LAMINA va en susurro: dos chispas apenas (el ojo-espiritu y la
            bruma cargan lo mistico; la lamina manda naturalismo) */}
        <g aria-hidden="true" opacity="0.5">
          <Estrella cx={-52} cy={52} r={6} color={P.estrella} vivo={vivo} delay={0} />
          <Estrella cx={30} cy={40} r={6.5} color={P.estrella} vivo={vivo} delay={-1.2} />
        </g>
        {/* glifo espiral del hombro (ornamento, nunca arma) */}
        <g className="jaguar-glifos" aria-hidden="true" fill="none" stroke={P.cobre}
          strokeWidth="3" strokeLinecap="round" opacity="0.3">
          <path transform="translate(52 52) scale(5.5)" d={GLIFO_ESPIRAL} />
        </g>
        {/* OMÓPLATO que rueda al andar (la seña del jaguar) — masa muscular con
            su luz rodante, no un triángulo plano */}
        <g className="jaguar-lado-hombro">
          <path d="M30,28 Q 72,-14 118,30 Q 96,16 74,16 Q 50,18 30,28 Z"
            fill={`url(#${anca})`} stroke={RH_INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M52,12 Q 74,0 96,14" fill="none" stroke={P.brillo} strokeWidth="6"
            strokeLinecap="round" opacity="0.55" filter={`url(#${pincelL})`} aria-hidden="true" />
        </g>

        {/* patas del lado de ACÁ — cortas y GRUESAS (DR), con las señas del
            felino de verdad: la trasera se ANGULA en el corvejón, la delantera
            marca el carpo, y las zarpas son ESCULPIDAS (dedos leídos por la
            tinta + garras marfil apenas asomadas). El patrón se simplifica a
            puntos sólidos hacia abajo. */}
        <g className="jaguar-lado-pata jaguar-lado-tc">
          <path d="M-74,112 C -60,138 -54,158 -66,176 C -73,185 -76,190 -76,193"
            fill="none" stroke={RH_INK} strokeWidth="35" strokeLinecap="round" />
          <path d="M-74,112 C -60,138 -54,158 -66,176 C -73,185 -76,190 -76,193"
            fill="none" stroke={P.cuerpoSombra} strokeWidth="28.5" strokeLinecap="round" />
          {/* la caña recibe luz (el corvejón se LEE en el cambio de tono) */}
          <path d="M-62,164 C -70,176 -74,184 -75,190" fill="none" stroke={P.cuerpo}
            strokeWidth="20" strokeLinecap="round" />
          <g fill={P.roseta} opacity="0.55"><circle cx="-66" cy="140" r="3.6" /><circle cx="-70" cy="166" r="3" /></g>
          <path d="M-95,205 C -97,196 -91,189 -80,187 C -67,185 -56,188 -51,193 C -47,198 -48,204 -53,207 L-90,208 Z"
            fill="#e8c684" stroke={RH_INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M-77,189 C -78,196 -77,202 -75,206 M-64,189 C -64,195 -63,200 -61,205"
            fill="none" stroke={RH_INK} strokeWidth="1.8" opacity="0.55" strokeLinecap="round" />
          <g fill={P.garra} stroke={RH_INK} strokeWidth="1" aria-hidden="true">
            <path d="M-92,203 q-5,3 -4,7 l7,-2 Z" />
            <path d="M-70,207 q-3,4 -1,8 l6,-3 Z" />
            <path d="M-56,206 q-2,4 0,8 l6,-4 Z" />
          </g>
        </g>
        <g className="jaguar-lado-pata jaguar-lado-dc">
          <path d="M96,112 C 102,144 100,172 96,192" fill="none" stroke={RH_INK} strokeWidth="34" strokeLinecap="round" />
          <path d="M96,112 C 102,144 100,172 96,192" fill="none" stroke={P.cuerpoSombra} strokeWidth="27.5" strokeLinecap="round" />
          {/* antebrazo→carpo con su luz (el hueso se siente sin dibujarse) */}
          <path d="M99,146 C 100,164 98,178 96,189" fill="none" stroke={P.cuerpo}
            strokeWidth="19" strokeLinecap="round" />
          <g fill={P.roseta} opacity="0.55"><circle cx="100" cy="140" r="3.6" /><circle cx="98" cy="166" r="3" /></g>
          <path d="M77,205 C 75,196 81,189 92,187 C 105,185 116,188 121,193 C 125,198 124,204 119,207 L82,208 Z"
            fill="#e8c684" stroke={RH_INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M95,189 C 94,196 95,202 97,206 M108,189 C 108,195 109,200 111,205"
            fill="none" stroke={RH_INK} strokeWidth="1.8" opacity="0.55" strokeLinecap="round" />
          <g fill={P.garra} stroke={RH_INK} strokeWidth="1" aria-hidden="true">
            <path d="M80,203 q-5,3 -4,7 l7,-2 Z" />
            <path d="M102,207 q-3,4 -1,8 l6,-3 Z" />
            <path d="M116,206 q-2,4 0,8 l6,-4 Z" />
          </g>
        </g>

        {/* CUELLO/PECHO: la masa CONTINUA que une la testa baja con la cruz —
            con SOLAPE GENEROSO bajo el cráneo: cuando el gruñido baja y
            adelanta la testa, el pelaje del cuello sigue debajo (vector
            continuo: se estira sin costura, jamás se decapita). */}
        <path d="M44,12 C 82,-24 128,-42 162,-28 C 180,-18 186,4 178,28 C 170,46 152,58 128,62 C 98,68 62,52 44,30 Z"
          fill={`url(#${dorso})`} stroke={RH_INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M44,12 C 82,-24 128,-42 162,-28 C 180,-18 186,4 178,28 C 170,46 152,58 128,62 C 98,68 62,52 44,30 Z"
          fill={P.cuerpo} filter={`url(#${granoL})`} aria-hidden="true" />
        {/* MECHONES en la unión cuello→tronco: el pliegue se lee como CAPAS de
            pelo (así lo resuelve el grabado naturalista), no como costura */}
        <g aria-hidden="true" fill="none" stroke={P.cuerpoSombra} strokeWidth="2.2" strokeLinecap="round" opacity="0.5">
          <path d="M58,8 l-6,5 7,3 -6,5" />
          <path d="M52,26 l-6,4 7,4 -6,5" />
          <path d="M50,44 l-5,4 6,4" />
        </g>
        {/* garganta crema + sombra bajo la quijada + patrón que baja el cuello */}
        <path d="M150,52 C 160,40 166,26 167,12 C 154,18 142,30 136,44 Z" fill={P.vientre} opacity="0.8" />
        <path d="M120,58 C 136,52 150,42 158,30" fill="none" stroke={P.umbra}
          strokeWidth="8" opacity="0.3" filter={`url(#${pincelL})`} aria-hidden="true" />
        <g aria-hidden="true">
          <Roseta cx={92} cy={16} r={11} rot={25} motas={1} organica ink={P.roseta} centro={P.rosetaCentro} opacity={0.9} />
          <Roseta cx={124} cy={4} r={9.5} rot={200} motas={1} organica ink={P.roseta} centro={P.rosetaCentro} opacity={0.85} />
          <g fill={P.roseta} opacity="0.6">
            <circle cx="66" cy="30" r="4" /><circle cx="104" cy="42" r="3.6" /><circle cx="140" cy="-10" r="3.4" />
          </g>
        </g>
        {/* la sombra de forma también envuelve el cuello (misma vuelta) */}
        <path d="M44,12 C 82,-24 128,-42 162,-28 C 180,-18 186,4 178,28 C 170,46 152,58 128,62 C 98,68 62,52 44,30 Z"
          fill={`url(#${dorso}-forma)`} aria-hidden="true" />

        {/* CABEZA de perfil ANATÓMICA: wrapper del GRUÑIDO + bob del paso.
            Porte BAJO de depredador (DR: la testa puede ir más baja que los
            hombros). Cráneo esculpido: frente amplia, STOP marcado, morro
            CORTO y macizo, masetero de la mordida más potente de América. */}
        <g className="jaguar-lado-grune">
          <g className="jaguar-lado-cabeza">
            {/* OREJA redonda tras el cráneo: dorso oscuro + mancha ocre central */}
            <path d="M138,-30 C 128,-44 132,-60 146,-64 C 158,-67 168,-58 168,-46 L152,-32 Z"
              fill={P.cuerpo} stroke={RH_INK} strokeWidth="4" strokeLinejoin="round" />
            <path d="M141,-36 C 136,-46 139,-56 148,-59 C 156,-61 162,-55 162,-47 Z" fill={P.oreja} />
            <circle cx="150" cy="-50" r="4.5" fill={P.rosetaCentro} opacity="0.85" />
            {/* GRUÑIDO: garganta + colmillos (opacity 0 fuera del gruñido) */}
            <g className="jaguar-lado-grunefx">
              <path d="M208,28 C 230,22 250,24 260,20 C 258,42 238,54 212,48 Z" fill="#7e1d14" />
              <path d="M244,24 L250,44 L234,30 Z" fill={P.colmillo} stroke={RH_INK} strokeWidth="1.2" />
              <path d="M220,28 L224,42 L212,32 Z" fill={P.colmillo} stroke={RH_INK} strokeWidth="1" />
            </g>
            {/* MANDÍBULA (pivota al gruñir): quijada crema con su colmillo */}
            <g className="jaguar-lado-fauce">
              <path d="M212,34 C 224,41 237,42 247,36 C 246,44 236,48 223,45 C 215,42 210,38 212,34 Z"
                fill="#dcc49c" stroke={RH_INK} strokeWidth="2.8" strokeLinejoin="round" />
              <path d="M241,34 L236,43 L230,36 Z" fill={P.colmillo} stroke={RH_INK} strokeWidth="1" />
            </g>
            {/* CRÁNEO DE PERFIL esculpido (una sola silueta continua) */}
            <path d="M150,42 C 144,20 146,-10 158,-32 C 166,-47 180,-56 196,-57 C 212,-58 226,-50 233,-38 C 238,-29 241,-22 247,-18 C 257,-13 264,-5 266,3 C 268,10 267,16 263,19 C 257,22 251,21 248,23 C 250,29 246,35 238,37 C 229,39 220,36 214,40 C 208,49 195,53 183,51 C 169,49 156,47 150,42 Z"
              fill={`url(#${craneo})`} stroke={RH_INK} strokeWidth="4" strokeLinejoin="round" />
            <path d="M150,42 C 144,20 146,-10 158,-32 C 166,-47 180,-56 196,-57 C 212,-58 226,-50 233,-38 C 238,-29 241,-22 247,-18 C 257,-13 264,-5 266,3 C 268,10 267,16 263,19 C 257,22 251,21 248,23 C 250,29 246,35 238,37 C 229,39 220,36 214,40 C 208,49 195,53 183,51 C 169,49 156,47 150,42 Z"
              fill={P.cuerpo} filter={`url(#${granoL})`} aria-hidden="true" />
            {/* painterly de la testa: frente/pómulo con luz, nuca en penumbra,
                sombra bajo el masetero */}
            <g aria-hidden="true" filter={`url(#${pincelL})`}>
              <path d="M196,-50 C 210,-48 222,-40 228,-30" fill="none" stroke={P.brillo} strokeWidth="9" strokeLinecap="round" opacity="0.55" />
              <path d="M158,-26 C 152,-6 152,16 158,32" fill="none" stroke={P.umbra} strokeWidth="11" strokeLinecap="round" opacity="0.35" />
              <ellipse cx="204" cy="30" rx="17" ry="9" fill={P.umbra} opacity="0.28" />
              <ellipse cx="236" cy="-6" rx="12" ry="7" fill={P.brillo} opacity="0.45" />
              {/* pómulo bajo el ojo y hueso de la ceja (modelado facial) */}
              <path d="M208,-2 C 214,2 222,3 228,0" fill="none" stroke={P.umbra} strokeWidth="4" strokeLinecap="round" opacity="0.3" />
              <path d="M206,-30 C 214,-33 224,-32 230,-27" fill="none" stroke={P.brillo} strokeWidth="4" strokeLinecap="round" opacity="0.5" />
            </g>
            {/* pelo grabado de la nuca y la quijada (caligrafía naturalista) */}
            <g aria-hidden="true" fill="none" stroke={P.cuerpoSombra} strokeWidth="1.3" strokeLinecap="round" opacity="0.4">
              <path d="M152,18 q-4,5 -3,10 M150,-2 q-4,5 -4,10 M154,-20 q-4,5 -4,10" />
              <path d="M186,48 q5,3 10,2 M204,46 q5,2 10,0" />
            </g>
            {/* masetero sugerido a lo grabado + carrillera de pelo crema */}
            <path d="M196,8 C 208,4 220,8 226,18 C 228,28 222,38 210,40" fill="none"
              stroke={RH_INK} strokeWidth="1.8" opacity="0.2" strokeLinecap="round" aria-hidden="true" />
            <path d="M196,26 C 204,22 214,24 220,30 C 216,40 206,46 194,46 C 188,42 188,32 196,26 Z"
              fill={P.hocico} opacity="0.4" aria-hidden="true" />
            {/* morro claro + LABIO (la línea de la boca) + motas de vibrisas */}
            <path d="M236,8 C 248,4 258,7 262,13 C 259,19 251,22 241,21 C 236,17 234,12 236,8 Z" fill={P.hocico} opacity="0.95" />
            <path d="M263,17 C 257,22 249,24 243,24 C 235,25 228,29 222,33" fill="none"
              stroke={RH_INK} strokeWidth="2" strokeLinecap="round" opacity="0.55" aria-hidden="true" />
            <g fill={P.roseta} opacity="0.6" aria-hidden="true">
              <circle cx="242" cy="12" r="1.9" /><circle cx="250" cy="14" r="1.6" />
              <circle cx="238" cy="17" r="1.6" /><circle cx="246" cy="19" r="1.4" />
            </g>
            {/* bigotes largos y gruesos (DR) */}
            <g fill="none" stroke={P.vibrisa} strokeWidth="2.2" strokeLinecap="round" opacity="0.65" aria-hidden="true">
              <path d="M246,10 C 264,4 280,4 294,-2" />
              <path d="M247,15 C 265,12 281,14 296,10" />
              <path d="M245,20 C 261,21 275,26 288,27" />
            </g>
            {/* TRUFA grande rosada-negruzca con narina y brillo húmedo (DR) */}
            <path d="M252,0 C 258,-4 266,-2 267,5 C 267,12 262,17 254,15 C 250,11 249,4 252,0 Z"
              fill="#6b3a34" stroke={RH_INK} strokeWidth="1.4" />
            <path d="M259,6 Q 262,4 263,8" fill="none" stroke="#2a1010" strokeWidth="1.4" strokeLinecap="round" />
            <ellipse cx="257" cy="2" rx="3" ry="1.4" fill="#9c7666" opacity="0.8" aria-hidden="true" />
            {/* patrón de la testa: puntos sólidos por zona + rosetita de la sien */}
            <g fill={P.roseta} opacity="0.62" aria-hidden="true">
              <circle cx="172" cy="-36" r="2.8" /><circle cx="188" cy="-44" r="2.4" />
              <circle cx="204" cy="-40" r="2.2" /><circle cx="164" cy="-16" r="2.6" />
              <circle cx="216" cy="-30" r="2" /><circle cx="180" cy="-24" r="1.9" />
            </g>
            <Roseta cx={168} cy={6} r={11} rot={25} motas={1} organica ink={P.roseta} centro={P.rosetaCentro} opacity={0.85} />
            {/* raya del lagrimal + CEJA fiera con sus puntos de vibrisa */}
            <path d="M212,-6 C 210,0 207,4 203,7" fill="none" stroke={P.roseta}
              strokeWidth="1.6" strokeLinecap="round" opacity="0.7" aria-hidden="true" />
            <path d="M204,-26 L 230,-20" stroke={RH_INK} strokeWidth="3.4" strokeLinecap="round" fill="none" />
            <g fill={P.roseta} opacity="0.7" aria-hidden="true">
              <circle cx="212" cy="-31" r="1.4" /><circle cx="220" cy="-29" r="1.2" />
            </g>
            {/* OJO ámbar de perfil: almendra delineada, pupila REDONDA de gran
                felino (DR), catchlight — nobleza, nunca vacío */}
            <g>
              <path d="M210,-14 C 214,-20 224,-21 229,-14 C 224,-8 213,-8 210,-14 Z"
                fill="#fffbe8" stroke={RH_INK} strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="220" cy="-14" r="5.6" fill={P.iris} />
              <circle cx="220.5" cy="-13.5" r="2.9" fill={P.roseta} />
              <circle cx="222.5" cy="-16.5" r="1.5" fill="#fff" />
              <path d="M210,-14 C 214,-20 224,-21 229,-14" fill="none"
                stroke={RH_INK} strokeWidth="2.4" strokeLinecap="round" />
            </g>
            {/* tapetum: el ojo que devuelve la luz (respira por CSS) */}
            <circle className={vivo ? 'jaguar-ojo-brillo' : undefined} cx="220" cy="-14" r="7"
              fill={P.ojoBrillo} opacity="0.4" filter={`url(#${blur})`} aria-hidden="true"
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
            <g aria-hidden="true" opacity="0.5">
              <Estrella cx={166} cy={-30} r={5} color={P.estrella} vivo={vivo} delay={-1.8} />
            </g>
          </g>
        </g>
      </g>

      {/* bruma etérea a los pies + motas del espíritu */}
      <ellipse className={vivo ? 'jaguar-bruma' : undefined} cx="0" cy="206" rx="185" ry="20"
        fill={P.bruma} opacity="0.09" filter={`url(#${blur})`}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }} aria-hidden="true" />
      <g aria-hidden="true" fill={P.mota}>
        <circle className={vivo ? 'jaguar-mota' : undefined} cx="-160" cy="30" r="4.5" opacity="0.3" />
        <circle className={vivo ? 'jaguar-mota' : undefined} cx="150" cy="-40" r="3.8" opacity="0.3"
          style={vivo ? { animationDelay: '-2.4s' } : undefined} />
        <circle className={vivo ? 'jaguar-mota' : undefined} cx="-60" cy="-70" r="3.4" opacity="0.3"
          style={vivo ? { animationDelay: '-4.1s' } : undefined} />
      </g>
    </g>
  ) : null;

  // Antics de VIDA (períodos co-primos) SOLO viva; nodos aparte para no pisar el
  // boil de `.crt-body`. El CSS los apaga con RM / tier bajo / ánimo bajo /
  // durante los gestos (celebra/reposo/señala) y estados (ruge/acecha) — y en
  // la MARCHA (pose camina, CSS), donde el perfil ya lleva su propia cadencia.
  const figura = marchando ? lado : body;
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{figura}</g>
    </g>
  ) : figura;
  // El line-boil (contorno que hierve) envuelve TODO el dibujo cuando se pide.
  const conBoil = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;
  // La LEVITACIÓN de la revelación envuelve todo (ingravidez del espíritu):
  // el wrapper siempre existe, la animación solo corre con data-revelacion (CSS)
  // → cero costo para los consumidores actuales. La APARICIÓN espectral lo
  // envuelve por fuera (nodo aparte: opacity+scale de materialización, sin
  // pisar el transform de la levitación); solo anima con data-aparicion.
  // PAISAJE DEL MIEDO — la onda de presencia depredadora que se expande por el
  // terreno (su poder de ÁREA en el kart). Anillos concéntricos que crecen y se
  // desvanecen; cada uno con su delay para leerse como oleadas. Solo se dibuja
  // con paisajeDelMiedo; anima solo viva (la clase la pone el CSS por
  // data-paisaje-del-miedo). Va DETRÁS del felino (radia desde él).
  const ondaMiedo = miedoFx ? (
    <g className="jaguar-miedo" aria-hidden="true">
      {[0, -0.8, -1.6].map((d, i) => (
        <circle key={i}
          className={vivo ? 'jaguar-miedo-onda' : undefined}
          cx="0" cy="2" r="6" fill="none"
          stroke={i === 1 ? P.iris : P.espectral}
          strokeWidth={0.9 - i * 0.15}
          opacity={vivo ? undefined : 0.3}
          style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${d}s` }} />
      ))}
    </g>
  ) : null;

  const cuerpoVivo = (
    <g className="jaguar-aparicion" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      <g className="jaguar-levita" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        {ondaMiedo}
        {conBoil}
      </g>
    </g>
  );

  const estadoAttrs = {
    'data-creature': JAGUAR_SLUG,
    'data-pose': vivo ? poseFx : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-mojado': ropa?.mojado ? '1' : undefined,
    'data-ruge': rugeFx ? '1' : undefined,
    'data-acecha': acechaFx ? '1' : undefined,
    'data-paisaje-del-miedo': miedoFx ? '1' : undefined,
    'data-revelacion': revelacion ? '1' : undefined,
    'data-aparicion': aparicion ? '1' : undefined,
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
  // MODO PODER (standalone): lo envolvemos en su aura PÚRPURA depredadora de 4
  // capas (transformacion.css: glow radial + boost + ingravidez + corrientes). El
  // wrapper DOM es lo único que puede llevar ::before/mix-blend/corrientes.
  if (poder) {
    return (
      <span
        className="is-powered-up jaguar-poder"
        data-creature-poder={JAGUAR_SLUG}
        style={{ '--aura-color': auraDeBicho(JAGUAR_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default Jaguar;
