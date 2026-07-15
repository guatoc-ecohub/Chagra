/*
 * CocheraEnCorte — la misma cochera, cortada por la mitad. Para el teléfono humilde.
 *
 * El equipo de gama baja no descarga three, pero NO se queda sin la pieza. Se
 * lleva este corte, que pesa lo que un ícono y —esto es lo raro— cuenta el
 * argumento MEJOR que la 3D.
 *
 * Porque el argumento de toda esta pieza es una ALTURA:
 *
 *   "Si a usted le arden los ojos al entrar al gallinero, la gallina lleva horas
 *    así."
 *
 * Y un corte de perfil es exactamente el dibujo que un ingeniero hace cuando lo
 * que importa es a qué altura está cada cosa. Acá la gallina, el cerdo y el
 * dueño están parados sobre la misma línea de piso, a su estatura de verdad, y
 * el velo de amoníaco es una franja con un borde que pasa por encima de ella y
 * por debajo de él. No hay perspectiva, ni cámara, ni nada que interpretar: es
 * una regla vertical y tres cabezas. Se entiende en un segundo y sin girar nada.
 *
 * La 3D deja meterse adentro y sentirlo; el corte lo deja ver de una. Son dos
 * lecturas del mismo dato, no una versión pobre y una rica.
 *
 * EL MISMO MODELO. Este archivo importa `aire()` y `densidadEnAltura()` — las
 * mismísimas funciones que mueven la escena 3D. No hay una "versión 2D" de la
 * física con números aparte: si mañana se afina la curva del amoníaco, se afinan
 * las dos a la vez. Es la regla de la casa (una sola fuente de verdad) y acá
 * además evita que el corte y la escena se contradigan, que sería fatal en una
 * pieza cuyo tema es "esto es lo que de verdad está pasando".
 *
 * SVG puro: cero three, cero canvas, cero costo. Corre en cualquier cosa.
 */
import { useMemo } from 'react';
import { aire, densidadEnAltura, ALTURAS } from './aireCargado.js';
import { COLORES } from './olor.geom.js';

/* La escala del corte: 1 metro = 100 unidades de SVG. Un dibujo a escala, como
   el del maestro de obra — porque de eso se trata. */
const M = 100;
const ALTO = 3.4 * M;
const ANCHO = 7.2 * M;
const PISO = ALTO - 0.35 * M; // deja aire abajo para la fosa

/** metros → y del SVG */
const y = (m) => PISO - m * M;

/* Cuántas franjas dibuja el velo. Suficientes para que se lea el degradé y el
   borde, pocas para que no pese. */
const FRANJAS = 26;

/**
 * El corte de la cochera.
 * @param {{ carbono?: number }} props
 */
export default function CocheraEnCorte({ carbono = 0 }) {
  const a = useMemo(() => aire(carbono), [carbono]);

  /* Las franjas del velo: cada una con la densidad REAL de su altura, sacada de
     la misma curva que usa la escena 3D. El borde superior aparece solo. */
  const franjas = useMemo(() => {
    const arr = [];
    const tope = a.alturaVelo * 1.45;
    for (let i = 0; i < FRANJAS; i++) {
      const m0 = (i / FRANJAS) * tope;
      const m1 = ((i + 1) / FRANJAS) * tope;
      const d = densidadEnAltura((m0 + m1) / 2, a.alturaVelo);
      arr.push({ m0, m1, o: d * a.amoniaco * 0.62 });
    }
    return arr;
  }, [a]);

  /* Las motas de oro: subiendo, escalonadas. Las que no se van están sentadas
     en la cama. El mismo reparto de la 3D — el oro se conserva. */
  const motas = useMemo(() => {
    const arr = [];
    const n = 26;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const seVa = u < a.nitrogeno.aire;
      /* Pseudoaleatorio estable: mismo dibujo en cada render. */
      const rx = ((i * 73) % 100) / 100;
      const ry = ((i * 137) % 100) / 100;
      arr.push({
        i,
        seVa,
        x: 0.85 * M + rx * 4.4 * M,
        /* Si se va: repartida en toda la columna hasta el caballete y más allá.
           Si se queda: sentada adentro del colchón. */
        yM: seVa ? 0.1 + ry * 3.1 : (0.02 + carbono * 0.28) * (0.25 + ry * 0.6),
        r: seVa ? 2.6 : 3.1,
      });
    }
    return arr;
  }, [a, carbono]);

  const espesorCama = 0.02 + carbono * 0.28;

  return (
    <svg
      className="ol__corte"
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      role="img"
      aria-label={
        a.amoniaco > 0.35
          ? 'Corte de la cochera: el aire cargado de amoníaco se acuesta sobre la cama, a la altura de la cabeza de la gallina, mientras el nitrógeno se escapa por el caballete.'
          : 'Corte de la cochera: con cama profunda el aire está limpio y el nitrógeno se queda guardado en el colchón.'
      }
    >
      <defs>
        {/* El cielo de la tarde de finca, ensuciándose con el olor. */}
        <linearGradient id="olCielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6ead2" />
          <stop offset="100%" stopColor={COLORES.velo} stopOpacity={0.25 + a.amoniaco * 0.5} />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={ANCHO} height={ALTO} fill="url(#olCielo)" />

      {/* ── La estructura, en línea: postes, techo a un agua, caballete ── */}
      <g stroke={COLORES.poste} strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.9">
        <line x1={0.55 * M} y1={y(0)} x2={0.55 * M} y2={y(ALTURAS.caballete - 0.55)} />
        <line x1={6.1 * M} y1={y(0)} x2={6.1 * M} y2={y(ALTURAS.caballete)} />
        {/* Los dos faldones, con el hueco del caballete entre ellos. */}
        <line x1={0.35 * M} y1={y(2.32)} x2={3.15 * M} y2={y(2.78)} strokeWidth="9" stroke={COLORES.techo} />
        <line x1={3.55 * M} y1={y(2.72)} x2={6.35 * M} y2={y(3.05)} strokeWidth="9" stroke={COLORES.techo} />
      </g>

      {/* El muro bajo del frente, cortado: por encima de él sale el aire. */}
      <rect x={0.4 * M} y={y(1.05)} width={0.14 * M} height={1.05 * M} fill={COLORES.muro} opacity="0.9" />

      {/* ── EL VELO: franjas horizontales con su densidad real ──
          Denso contra la cama, ralo arriba. El borde sale solo de la curva. */}
      <g>
        {franjas.map((f, i) => (
          <rect
            key={i}
            x={0.5 * M}
            y={y(f.m1)}
            width={5.7 * M}
            height={(f.m1 - f.m0) * M + 0.6}
            fill={i < FRANJAS * 0.35 ? COLORES.veloHondo : COLORES.velo}
            opacity={f.o}
          />
        ))}
      </g>

      {/* ── El piso y las camas ── */}
      <rect x={0.35 * M} y={y(0)} width={5.9 * M} height={0.1 * M} fill={COLORES.piso} />
      {/* La cama vencida: siempre debajo. */}
      <rect x={0.5 * M} y={y(0.045)} width={5.6 * M} height={0.045 * M} fill={COLORES.camaSucia} />
      {/* El colchón nuevo, que se levanta con el material seco. */}
      {carbono > 0.01 && (
        <rect
          x={0.5 * M}
          y={y(espesorCama)}
          width={5.6 * M}
          height={espesorCama * M}
          fill={COLORES.camaSeca}
          rx="2"
        />
      )}

      {/* ── EL ORO ── */}
      <g>
        {motas.map((m) => (
          <circle
            key={m.i}
            cx={m.x}
            cy={y(m.yM)}
            r={m.r}
            fill={m.seVa ? COLORES.nitrogeno : COLORES.nitrogenoCama}
            opacity={m.seVa ? 0.9 - (m.yM / 3.4) * 0.45 : 0.95}
          />
        ))}
      </g>

      {/* ── LOS CUERPOS, a su altura de verdad. El argumento entero. ──
          Sin cotas ni flechas: tres siluetas paradas en el mismo piso. */}
      <g fill={COLORES.cuerpo} opacity="0.85">
        {/* La gallina: cabeza a 0.26 m. Adentro del velo. */}
        <g transform={`translate(${1.5 * M}, ${y(0)}) scale(${M / 100})`}>
          <path
            d="M 0,0 L -3,0 C -14,-2 -20,-8 -19,-16 C -18,-23 -12,-27 -4,-26
               C 0,-28 4,-30 6,-27 C 6,-31 9,-34 11,-31 C 13,-34 17,-32 16,-28
               C 20,-27 21,-24 18,-23 L 23,-21 L 17,-20 C 15,-15 12,-11 8,-8
               L 9,0 L 6,0 L 4,-7 C 1,-6 -1,-6 -3,-6 L -2,0 Z"
            transform="scale(1,1)"
          />
        </g>
        {/* El cerdo echado: la trompa a 0.38 m. Adentro también. */}
        <g transform={`translate(${3.5 * M}, ${y(0)}) scale(${M / 100})`}>
          <path
            d="M -52,0 C -58,-12 -55,-24 -46,-30 C -30,-44 -5,-50 16,-46
               C 20,-52 26,-53 29,-47 C 36,-46 42,-42 46,-36
               C 54,-33 58,-30 57,-26 C 60,-24 59,-20 55,-19
               C 50,-14 44,-10 36,-9 L 34,0 L 26,0 L 27,-10
               C 10,-6 -10,-5 -28,-8 L -30,0 L -38,0 L -37,-9
               C -45,-8 -50,-5 -52,0 Z"
          />
        </g>
        {/* El dueño: la nariz a 1.58 m. Por encima del velo — y aun así le arde. */}
        <g transform={`translate(${5.5 * M}, ${y(0)}) scale(${M / 100})`}>
          <path
            d="M -9,0 L 11,0 L 6,-6 C 5,-40 4,-60 6,-86
               C 12,-90 14,-100 13,-112 C 13,-120 11,-130 10,-138
               C 14,-140 16,-144 15,-148 C 16,-153 14,-156 12,-157
               C 16,-160 17,-168 12,-172 C 6,-176 -2,-173 -3,-166
               C -6,-162 -5,-157 -2,-155 C -8,-150 -10,-142 -10,-130
               C -11,-115 -9,-100 -7,-88 C -11,-60 -12,-30 -9,0 Z"
          />
        </g>
      </g>

      {/*
        LA LÍNEA DE FLOTACIÓN. Lo único que se dibuja "de más" en todo el corte:
        una raya punteada tenue en el borde del velo. No es una cota ni lleva
        número — es la superficie del agua en la que la gallina vive ahogada y
        el dueño tiene la cabeza afuera. Solo aparece cuando hay algo que ver.
      */}
      {a.amoniaco > 0.12 && (
        <line
          x1={0.5 * M}
          y1={y(a.alturaVelo)}
          x2={6.2 * M}
          y2={y(a.alturaVelo)}
          stroke={COLORES.veloHondo}
          strokeWidth="1.5"
          strokeDasharray="7 6"
          opacity={0.28 + a.amoniaco * 0.3}
        />
      )}

      {/* ── La fosa, abajo a la izquierda: el que calla ──
          Sin espectáculo. Una mancha quieta en un hueco. */}
      <g>
        <rect x={0.06 * M} y={y(0)} width={0.28 * M} height={0.34 * M} fill={COLORES.lodo} opacity="0.5" />
        {a.sulfhidrico > 0.02 && (
          <rect
            x={0.06 * M}
            y={y(0.02)}
            width={0.28 * M}
            height={0.16 * M}
            fill={COLORES.sulfhidrico}
            opacity={a.sulfhidrico * 0.75}
          />
        )}
      </g>
    </svg>
  );
}
