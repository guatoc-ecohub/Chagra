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
 * Lo que manda la DR `la-ruana-andina-colombiana` (gemini, 2026-06-19) y que
 * está dibujado acá punto por punto:
 *
 *   · PESO. Lana virgen de oveja, cerca de un kilo. Cae con gravedad: los
 *     pliegues se asientan, se abren hacia el ruedo y no flotan. El vaivén
 *     reusa `crt-ruana` del kit pero a casi el doble de duración — una lana
 *     pesada se mece lento. Esa es toda la diferencia entre lana y trapo.
 *   · APOYO. Se asienta firme sobre la cruz y no resbala. El paño rompe sobre
 *     el hombro y de ese quiebre bajan los pliegues, abriéndose en abanico.
 *   · ABIERTA AL FRENTE. Eso la distingue del poncho, que es cerrado. Los dos
 *     paños caen a los costados y dejan el pecho libre.
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
 *     cuerpo, se lee disfraz; por eso el paño se ciñe en la cruz, se abolsa en
 *     el codo y vuelve a abrirse sobre las ancas.
 *
 * Species-specific a propósito: vive en el oso, no en el kit. `AccesoriosClima`
 * queda intacto para el resto de la fauna.
 */

/* EL CORTE DE UN PAÑO, parametrizado por lado (`s` = -1 izquierda, +1 derecha).
 *
 * Una ruana es una pieza rectangular de telar: los dos paños salen del MISMO
 * corte, y por eso el trazo se genera espejado en vez de escribirse dos veces.
 * Lo que NO se espeja es la caída —los pliegues y la punta al hombro van
 * aparte— porque una prenda con las dos mitades idénticas se lee estampada.
 *
 * El recorrido: arranca en la abertura del cuello, monta la cruz, cae por el
 * brazo abolsándose, se abre hacia el ruedo, recorre el ruedo en festón y
 * vuelve por el borde interno, que es la abertura delantera — por ahí se ve el
 * pecho, y por ahí sigue mandando la luna.
 *
 * EL RUEDO NO ES UNA LÍNEA RECTA: una lana de ese peso cuelga más donde el
 * pliegue junta tela, así que el borde baja en festón, con un valle por cada
 * pliegue que carga. Un ruedo recto delata el cartón.
 */
function pano(s) {
  const x = (v) => (s * v).toFixed(2);
  return (
    `M ${x(5.6)},-8.5 `
    + `C ${x(7.6)},-8.9 ${x(9.6)},-8.4 ${x(11.0)},-7.0 `   // monta la cruz
    + `C ${x(12.3)},-5.6 ${x(13.0)},-3.4 ${x(13.2)},-1.0 ` // cae por el brazo
    + `C ${x(13.5)},2.4 ${x(13.6)},5.8 ${x(13.5)},9.2 `    // se abre al ruedo
    + `C ${x(13.2)},9.9 ${x(12.4)},10.4 ${x(11.5)},10.1 `  // ruedo en festón
    + `C ${x(10.4)},9.7 ${x(9.6)},10.6 ${x(8.5)},10.3 `
    + `C ${x(7.5)},10.0 ${x(6.8)},10.7 ${x(6.0)},10.2 `
    + `C ${x(5.9)},8.0 ${x(5.8)},5.4 ${x(5.8)},2.6 `       // borde interno
    + `C ${x(5.8)},-0.8 ${x(5.6)},-4.2 ${x(5.0)},-6.9 `
    + `C ${x(5.1)},-7.7 ${x(5.3)},-8.2 ${x(5.6)},-8.5 Z`
  );
}
const PANO_IZQ = pano(-1);
const PANO_DER = pano(1);

/* PLIEGUES. Nacen apretados en el quiebre del hombro y se abren hacia abajo:
   así se lee que la tela cuelga de ahí. Cada uno lleva su sombra (el fondo de
   la arruga) y su luz (el lomo). Sin el par, el pliegue es una raya. */
const PLIEGUES_IZQ = [
  { d: 'M -10.4,-6.2 C -11.4,-2.6 -12.0,2.6 -12.2,8.8', w: 0.62, op: 0.55 },
  { d: 'M -8.9,-6.8 C -9.5,-2.8 -9.9,2.4 -10.0,9.4', w: 0.5, op: 0.42 },
  { d: 'M -7.4,-7.2 C -7.7,-3.2 -7.9,2.2 -7.9,9.9', w: 0.44, op: 0.34 },
];
const PLIEGUES_DER = [
  { d: 'M 10.4,-6.2 C 11.4,-2.6 12.0,2.6 12.2,8.8', w: 0.62, op: 0.55 },
  { d: 'M 8.9,-6.8 C 9.5,-2.8 9.9,2.4 10.0,9.4', w: 0.5, op: 0.42 },
  { d: 'M 7.6,-7.0 C 7.9,-3.0 8.1,2.4 8.1,9.8', w: 0.44, op: 0.34 },
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

  /* FLECOS del ruedo: hebras cortas y pesadas, con largo desparejo (un telar
     artesanal no da dos iguales). Cuelgan a plomo, no se abren. */
  const flecos = [
    -12.9, -12.0, -11.1, -10.2, -9.3, -8.4, -7.5, -6.6,
    6.6, 7.5, 8.4, 9.3, 10.2, 11.1, 12.0, 12.9,
  ];

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

      {/* ── LOS DOS PAÑOS. Abierta al frente: entre ellos queda el pecho, y
             ahí sigue mandando la luna. ─────────────────────────────────── */}
      <path d={PANO_IZQ} fill={`url(#${tejido})`} stroke={ink}
        strokeWidth="0.95" strokeLinejoin="round" />
      <path d={PANO_DER} fill={`url(#${tejido})`} stroke={ink}
        strokeWidth="0.95" strokeLinejoin="round" />

      {/* ── PLIEGUES. Sombra y luz por pliegue: la arruga tiene fondo y lomo.
             Se cierran arriba (donde la tela se junta en el hombro) y se
             abren abajo (donde el peso la separa). ──────────────────────── */}
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
             ruana acompaña, el emblema del pecho es la luna. Sigue la caída
             del paño, no cruza recta (una franja recta delata la tabla). ── */}
      <g fill="none" stroke={R.franja} strokeLinecap="round" opacity="0.6">
        <path d="M -13.4,6.6 C -11.0,7.2 -8.4,7.0 -6.0,6.5" strokeWidth="0.75" />
        <path d="M 13.4,6.6 C 11.0,7.2 8.4,7.0 6.0,6.5" strokeWidth="0.75" />
      </g>

      {/* ── FLECOS: hebras del telar, cortas y a plomo. Largo desparejo. ── */}
      <g stroke={R.fleco} strokeWidth="0.34" strokeLinecap="round" opacity="0.72">
        {flecos.map((x, i) => {
          const y0 = 10.15 + (i % 3) * 0.16;
          const largo = 0.85 + ((i * 7) % 5) * 0.16;
          return <path key={i} d={`M${x},${y0} l0.05,${largo}`} />;
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
        <path d="M 4.6,-8.2 C 6.6,-9.6 9.0,-10.2 11.2,-9.4
                 C 12.0,-8.4 11.6,-6.8 10.6,-5.6
                 C 9.2,-4.0 7.2,-3.2 5.6,-3.6
                 C 4.8,-5.2 4.4,-6.8 4.6,-8.2 Z"
          fill={R.panoRevés} stroke={ink} strokeWidth="0.85" strokeLinejoin="round" />
        {/* el quiebre del doblez: donde la tela dobla sobre sí misma */}
        <path d="M 5.4,-7.6 C 7.2,-8.5 9.2,-8.7 10.9,-8.2"
          fill="none" stroke={R.panoSombra} strokeWidth="0.5" opacity="0.65" strokeLinecap="round" />
        {/* la punta cuelga por detrás del hombro, con su peso */}
        <path d="M 10.6,-5.6 C 11.4,-4.6 11.8,-3.4 11.6,-2.2"
          fill="none" stroke={R.panoSombra} strokeWidth="0.55" opacity="0.5" strokeLinecap="round" />
      </g>
    </g>
  );
}

export default RuanaGuardian;
