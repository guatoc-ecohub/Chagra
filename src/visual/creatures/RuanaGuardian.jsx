import { useId } from 'react';
import './climaAccesorios.css';
import { OSO_GUARDIAN_RUANA, OSO_GUARDIAN_TINTA } from './osoGuardianIdentidad.js';

/*
 * RuanaGuardian — LA RUANA DEL OSO, tejida para ESTE cuerpo.
 *
 * Reemplaza, solo para el guardián, el poncho genérico de `AccesoriosClima`
 * (un trapecio plano con dos franjas y un pico en V, compartido con toda la
 * fauna). Aquel no tenía caída ni pliegue, competía en área con la luna del
 * pecho y no se apoyaba en ningún lado, porque el oso todavía no tenía hombros.
 * Ahora los tiene, y la prenda se cuelga de ellos.
 *
 * LO QUE ESTA VERSIÓN CORRIGE DE LA ANTERIOR: las MANGAS. La primera ruana se
 * dibujó como dos paños cerrados, uno por brazo, con el ruedo rematando justo
 * sobre la muñeca — o sea, dos tubos con puño. Eso es un abrigo de catálogo.
 * Una ruana NO TIENE MANGAS: es UNA manta rectangular de lana con una abertura
 * para la cabeza, abierta al frente, que CAE SOBRE los brazos sin envolverlos.
 * La diferencia se dibuja con tres decisiones:
 *
 *   · UN SOLO PATH. La prenda entera —yugo sobre los hombros y las dos caídas—
 *     es una sola silueta cerrada con el hueco del pecho recortado. Dos formas
 *     separadas se leen como dos prendas (mangas); una forma continua se lee
 *     como una manta puesta.
 *   · ESQUINAS. Un rectángulo colgado tiene esquinas, y las esquinas cuelgan
 *     en punta con su propio peso. Una manga jamás tiene esquinas — la punta
 *     del vértice exterior es la firma inconfundible del corte rectangular.
 *   · EL QUIEBRE SOBRE EL BRAZO. La tela es un plano que el codo empuja desde
 *     abajo: donde toca, la lana se tiende y QUIEBRA en un pliegue horizontal,
 *     y sigue cayendo a plomo después del quiebre. Un contorno que acompaña al
 *     brazo lo envuelve (manga); un plano interrumpido por la forma que tiene
 *     debajo cae sobre él (manta). Por lo mismo el paño baja MÁS ANCHO que el
 *     brazo y la mano asoma por DEBAJO del ruedo, nunca de un puño.
 *
 * Lo que manda la DR `la-ruana-andina-colombiana` (gemini, 2026-06-19) y que
 * está dibujado acá punto por punto:
 *
 *   · CORTE RECTANGULAR de telar (1.20 m × 1.60 m la boyacense típica): manta
 *     con abertura central para la cabeza. Sin mangas, sin sisa, sin puño.
 *   · PESO. Lana virgen de oveja, cerca de un kilo. Cae con gravedad: los
 *     pliegues se asientan, se abren hacia el ruedo y no flotan. El vaivén
 *     reusa `crt-ruana` del kit pero a casi el doble de duración — una lana
 *     pesada se mece lento. Esa es toda la diferencia entre lana y trapo.
 *   · APOYO. Se asienta firme sobre la cruz y no resbala. El paño rompe sobre
 *     el hombro y de ese quiebre bajan los pliegues, abriéndose en abanico.
 *   · ABIERTA AL FRENTE. Eso la distingue del poncho, que es cerrado. Las dos
 *     caídas dejan el pecho libre y ahí sigue mandando la luna.
 *   · LA PUNTA AL HOMBRO. Con frío de verdad se echa una punta sobre el hombro
 *     contrario; el antropólogo Fals-Borda anotó que llevarla así sobre un solo
 *     hombro tenía lectura propia. Acá hace doble trabajo: es el gesto real y
 *     además rompe la simetría, que es lo que separa una prenda vivida de un
 *     disfraz. Y deja el pecho despejado, así la LUNA nunca queda tapada.
 *   · COLOR SOBRIO. Altiplano cundiboyacense: negro, azul oscuro, gris oscuro.
 *     Las franjas rojas y amarillas son la variante vieja y sobre este oso
 *     peleaban con el emblema. Queda UNA banda de lana cruda cerca del ruedo.
 *   · SOBRE CUERPO NO HUMANO. Los pliegues se exageran contra la musculatura y
 *     la tela se adapta al ancho de la grupa. Si la prenda cuelga sin tocar el
 *     cuerpo, se lee disfraz; por eso el plano se ciñe en la cruz, quiebra
 *     sobre el codo y vuelve a abrirse hacia las esquinas.
 *
 * Species-specific a propósito: vive en el oso, no en el kit. `AccesoriosClima`
 * queda intacto para el resto de la fauna.
 */

/* LA MANTA ENTERA, un solo trazo cerrado.
 *
 * El recorrido, en el sentido del reloj: arranca en el quiebre del hombro
 * izquierdo, monta la cruz y pasa POR DETRÁS del cuello (esa parte la tapa la
 * cabeza — que es exactamente donde va el cuello de la prenda), rompe sobre el
 * hombro derecho y cae por el orillo exterior ABRIÉNDOSE — la esquina de una
 * manta colgada barre más afuera que el cuerpo que la carga —, remata en la
 * PUNTA de la esquina, recorre el ruedo en festón hacia adentro, sube por el
 * borde delantero (la abertura al frente: por ahí se ve el pecho y la luna),
 * dibuja el escote y baja espejado por el lado izquierdo.
 *
 * EL RUEDO NO ES UNA LÍNEA RECTA: una lana de ese peso cuelga más donde el
 * pliegue junta tela, así que el borde baja en festón, con un valle por cada
 * pliegue que carga — y cuelga MÁS en las esquinas, que cargan el vuelo del
 * vértice. Los dos lados NO son espejo exacto: un telar artesanal no da dos
 * caídas iguales, y una prenda perfectamente simétrica se lee estampada. */
const RUANA_MANTA =
  'M -10.9,-6.4 '
  + 'C -10.3,-8.8 -8.2,-10.7 -5.4,-11.4 '   // monta la cruz (tapado por la cabeza)
  + 'C -2.8,-11.9 2.8,-11.9 5.4,-11.4 '
  + 'C 8.2,-10.7 10.3,-8.8 10.9,-6.4 '      // rompe sobre el hombro derecho
  + 'C 11.9,-4.2 12.9,-0.6 13.6,3.2 '       // orillo RECTO en diagonal: tela a plomo,
  + 'C 14.0,5.5 14.35,7.5 14.55,8.9 '       // más ancha que el brazo (que no abombe)
  + 'C 14.75,10.0 14.5,10.9 13.65,10.75 '   // LA ESQUINA: cuelga bajo la línea del ruedo
  + 'C 12.75,9.9 11.75,10.3 10.65,9.85 '    // ruedo en festón, de vuelta hacia el pecho:
  + 'C 9.55,9.5 8.65,10.05 7.65,9.75 '      // ALTO — la mano asoma por DEBAJO, no de un puño
  + 'C 7.05,9.6 6.65,9.95 6.35,10.2 '       // la esquina delantera, punta chica
  + 'C 6.1,7.6 5.98,4.6 5.93,1.6 '          // borde delantero: la abertura al frente
  + 'C 5.85,-1.8 5.75,-5.2 5.6,-8.5 '
  + 'C 4.0,-7.0 2.0,-6.4 0.2,-6.35 '        // el escote (el canto del cuello)
  + 'C -1.6,-6.4 -3.6,-7.0 -5.6,-8.5 '
  + 'C -5.75,-5.2 -5.85,-1.8 -5.93,1.6 '    // borde delantero izquierdo
  + 'C -5.98,4.6 -6.12,7.6 -6.4,10.15 '
  + 'C -6.7,9.9 -7.1,9.55 -7.7,9.7 '        // festón izquierdo: valles propios, no espejo
  + 'C -8.7,10.0 -9.6,9.45 -10.7,9.8 '
  + 'C -11.8,10.25 -12.8,9.85 -13.7,10.8 '
  + 'C -14.55,10.95 -14.78,10.0 -14.6,8.95 ' // la esquina izquierda
  + 'C -14.4,7.5 -14.05,5.5 -13.65,3.25 '
  + 'C -12.95,-0.6 -11.95,-4.2 -10.9,-6.4 Z';

/* PLIEGUES. Nacen apretados en el quiebre del hombro y se abren hacia abajo:
   así se lee que la tela cuelga de ahí. Cada uno lleva su sombra (el fondo de
   la arruga) y su luz (el lomo). Sin el par, el pliegue es una raya.
   Cada trazo lleva un CODO a la altura del quiebre del brazo (y≈2): el pliegue
   entra al quiebre con una dirección y sale con otra — la tela que solo cae
   hace rayas rectas; la que cae SOBRE algo, se dobla. */
const PLIEGUES_IZQ = [
  { d: 'M -12.1,-5.2 C -12.9,-1.8 -13.3,1.0 -13.4,2.4 C -13.55,5.2 -13.6,7.6 -13.6,9.6', w: 0.62, op: 0.55 },
  { d: 'M -10.2,-5.9 C -10.8,-2.2 -11.1,0.9 -11.15,2.3 C -11.25,5.0 -11.2,7.4 -11.1,9.5', w: 0.5, op: 0.42 },
  { d: 'M -8.3,-6.5 C -8.6,-2.8 -8.8,0.7 -8.82,2.1 C -8.85,5.0 -8.78,7.4 -8.65,9.55', w: 0.44, op: 0.34 },
];
const PLIEGUES_DER = [
  { d: 'M 12.1,-5.2 C 12.9,-1.8 13.3,1.0 13.4,2.4 C 13.55,5.2 13.6,7.6 13.6,9.5', w: 0.62, op: 0.55 },
  { d: 'M 10.3,-5.9 C 10.9,-2.2 11.2,0.9 11.25,2.3 C 11.35,5.0 11.3,7.4 11.2,9.5', w: 0.5, op: 0.42 },
  { d: 'M 8.4,-6.4 C 8.7,-2.8 8.9,0.7 8.9,2.1 C 8.9,5.0 8.85,7.4 8.75,9.6', w: 0.44, op: 0.34 },
];

/* FLECOS del ruedo: hebras cortas y pesadas, con largo desparejo (un telar
   artesanal no da dos iguales). Cuelgan a plomo, no se abren. Siguen el festón
   —cada hebra nace donde su tramo de ruedo cuelga— y acompañan las esquinas,
   que es donde el ruedo baja más. */
const FLECOS = [
  [-14.15, 10.55], [-13.35, 10.15], [-12.55, 9.85], [-11.75, 10.05], [-10.85, 9.75],
  [-9.95, 9.55], [-9.05, 9.75], [-8.15, 9.65], [-7.25, 9.8],
  [7.25, 9.75], [8.15, 9.7], [9.05, 9.8], [9.95, 9.5], [10.85, 9.8],
  [11.75, 10.1], [12.55, 9.9], [13.35, 10.2], [14.15, 10.5],
];

/**
 * @param {Object} props
 * @param {boolean} [props.animated=true]  mece la lana (lento: pesa).
 * @param {string} [props.ink]             la tinta del contorno.
 * @returns {import('react').JSX.Element}
 */
export function RuanaGuardian({ animated = true, ink = OSO_GUARDIAN_TINTA }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const tejido = `osog-ruana-tejido-${uid}`;
  const R = OSO_GUARDIAN_RUANA;

  return (
    <g className={animated ? 'crt-ruana' : undefined}
      /* lana de un kilo: se mece MÁS LENTO que el trapo del kit (3.4s).
         El peso de una prenda se lee en su tiempo, no solo en su forma. */
      style={animated ? { animationDuration: '6.2s' } : undefined}
      data-ruana-guardian="" aria-hidden="true">
      <defs>
        {/* el tejido: lana densa, sin transparencia, con la luz de luna
            cayendo del hombro izquierdo hacia el ruedo */}
        <linearGradient id={tejido} x1="18%" y1="0%" x2="72%" y2="100%">
          <stop offset="0%" stopColor={R.panoLuz} />
          <stop offset="46%" stopColor={R.pano} />
          <stop offset="100%" stopColor={R.panoSombra} />
        </linearGradient>
      </defs>

      {/* ── LA MANTA. Una sola pieza: yugo sobre la cruz, detrás del cuello, y
             las dos caídas — todo el mismo trazo, porque es la misma tela.
             Abierta al frente: en el hueco queda el pecho, y ahí manda la
             luna. Las manos del oso asoman por DEBAJO del ruedo. ─────────── */}
      <path d={RUANA_MANTA} fill={`url(#${tejido})`} stroke={ink}
        strokeWidth="0.95" strokeLinejoin="round" />

      {/* el QUIEBRE sobre cada hombro: donde la lana pasa del yugo a la caída
          y se rompe. De ese quiebre nacen los pliegues que bajan. */}
      <g fill="none" stroke={R.panoSombra} strokeWidth="0.55" opacity="0.5" strokeLinecap="round">
        <path d="M -10.0,-7.0 C -8.9,-6.1 -7.6,-5.7 -6.3,-5.8" />
        <path d="M 10.0,-7.0 C 8.9,-6.1 7.6,-5.7 6.3,-5.8" />
      </g>

      {/* ── EL QUIEBRE SOBRE EL BRAZO — lo que hace que la tela caiga SOBRE el
             brazo en vez de envolverlo. El codo empuja el plano desde abajo:
             en el contacto la lana se tiende (el lomo toma luz) y justo debajo
             se dobla (la sombra del doblez). Es la señal de que hay un cuerpo
             DEBAJO de la manta, no dentro de una manga. ───────────────────── */}
      <g fill="none" strokeLinecap="round">
        <path d="M -13.3,2.7 C -11.6,1.8 -9.5,1.6 -6.9,2.2"
          stroke={R.panoSombra} strokeWidth="0.6" opacity="0.55" />
        <path d="M -13.0,1.9 C -11.4,1.1 -9.6,1.0 -7.3,1.5"
          stroke={R.panoLuz} strokeWidth="0.45" opacity="0.5" />
        <path d="M 13.3,2.6 C 11.6,1.7 9.5,1.5 6.9,2.1"
          stroke={R.panoSombra} strokeWidth="0.6" opacity="0.55" />
        <path d="M 13.0,1.8 C 11.4,1.0 9.6,0.9 7.3,1.4"
          stroke={R.panoLuz} strokeWidth="0.45" opacity="0.5" />
      </g>

      {/* ── PLIEGUES. Sombra y luz por pliegue: la arruga tiene fondo y lomo.
             Se cierran arriba (donde la tela se junta en el hombro), se doblan
             en el quiebre del brazo y caen a plomo hasta el ruedo. ────────── */}
      <g fill="none" strokeLinecap="round">
        {[...PLIEGUES_IZQ, ...PLIEGUES_DER].map((p, i) => (
          <path key={`s${i}`} d={p.d} stroke={R.panoSombra}
            strokeWidth={p.w} opacity={p.op} />
        ))}
        {[...PLIEGUES_IZQ, ...PLIEGUES_DER].map((p, i) => (
          <path key={`l${i}`} d={p.d} stroke={R.panoLuz} strokeWidth={p.w * 0.5}
            opacity={p.op * 0.45} transform="translate(0.42 0)" />
        ))}
      </g>

      {/* ── LA BANDA DE LANA CRUDA cerca del ruedo. UNA sola y angosta: la
             ruana acompaña, el emblema del pecho es la luna. Es una LISTA del
             telar — tejida a lo ancho de la manta, de orillo a borde — así que
             sigue la caída del paño y se hunde donde el festón carga tela. ── */}
      <g fill="none" stroke={R.franja} strokeLinecap="round" opacity="0.6">
        <path d="M -14.15,6.7 C -12.0,7.3 -9.3,7.1 -6.15,6.5" strokeWidth="0.75" />
        <path d="M 14.15,6.6 C 12.0,7.2 9.3,7.0 6.15,6.4" strokeWidth="0.75" />
      </g>

      {/* ── FLECOS: hebras del telar, cortas y a plomo. Largo desparejo. ── */}
      <g stroke={R.fleco} strokeWidth="0.34" strokeLinecap="round" opacity="0.72">
        {FLECOS.map(([x, y0], i) => {
          const largo = 0.85 + ((i * 7) % 5) * 0.16;
          return <path key={i} d={`M${x},${y0 + 0.35} l0.05,${largo}`} />;
        })}
      </g>

      {/* ── LA ABERTURA DEL CUELLO. La lana se abolsa en el borde: un
             cuello de ruana es un canto grueso, no un corte de tijera. ─── */}
      <path d="M -5.6,-8.5 C -3.6,-7.0 -1.6,-6.4 0.2,-6.35 C 2.0,-6.4 4.0,-7.0 5.6,-8.5"
        fill="none" stroke={ink} strokeWidth="0.9" strokeLinecap="round" />
      <path d="M -5.2,-8.0 C -3.4,-6.6 -1.5,-6.0 0.2,-5.95 C 1.9,-6.0 3.8,-6.6 5.2,-8.0"
        fill="none" stroke={R.panoLuz} strokeWidth="0.5" strokeLinecap="round" opacity="0.5" />

      {/* ═══ LA PUNTA ECHADA AL HOMBRO (derecho del espectador) — el gesto de
             frío de verdad que documenta la DR. Un doblez de paño levantado y
             tendido sobre la cruz, con el ENVÉS a la vista: en el envés el
             tejido toma la luz distinto, y ese cambio de valor es lo que
             convence de que hay dos caras de tela y no una silueta pintada. */}
      <g>
        {/* Va en DIAGONAL y termina en punta que cuelga: un doblez de manta.
            La primera prueba de render lo tenía como un óvalo cerrado sobre el
            hombro y se leía hombrera de armadura — la diferencia entre tela y
            placa es que la tela tiene una punta con peso y un filo que dobla. */}
        <path d="M 5.2,-9.6
                 C 7.2,-10.6 9.2,-10.7 10.4,-9.8
                 C 11.0,-9.0 10.9,-7.7 10.4,-6.6
                 C 10.0,-5.7 9.7,-4.8 9.8,-4.0
                 C 9.2,-4.9 8.4,-5.7 7.6,-6.6
                 C 6.6,-7.7 5.6,-8.7 5.2,-9.6 Z"
          fill={R.panoRevés} stroke={ink} strokeWidth="0.7" strokeOpacity="0.55" strokeLinejoin="round" />
        {/* el FILO del doblez: la arista donde la manta se pliega sobre sí */}
        <path d="M 5.9,-9.1 C 7.4,-9.8 8.9,-9.9 10.1,-9.3"
          fill="none" stroke={R.panoSombra} strokeWidth="0.5" opacity="0.7" strokeLinecap="round" />
        {/* el peso que tira de la punta hacia abajo */}
        <path d="M 9.9,-7.2 C 9.8,-6.0 9.7,-5.0 9.8,-4.2"
          fill="none" stroke={R.panoSombra} strokeWidth="0.5" opacity="0.45" strokeLinecap="round" />
      </g>
    </g>
  );
}

export default RuanaGuardian;
