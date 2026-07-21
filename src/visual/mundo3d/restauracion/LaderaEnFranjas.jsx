/*
 * LaderaEnFranjas — la misma ladera, para el teléfono que no aguanta 3D.
 *
 * Gama baja NO es gama castigada. El campesino con un teléfono humilde tiene el
 * mismo derecho a ver su potrero hacerse monte, así que acá está la ladera entera
 * —erosión, barreras, pioneras, dosel, agua, fauna— en un corte de perfil dibujado
 * con SVG: unos veinte nodos, cero WebGL, cero texturas, cero descarga.
 *
 * Y lo importante: NO es una ilustración aparte que haya que mantener en paralelo
 * con la 3D. Las dos versiones cuelgan de las MISMAS curvas de `tiempoSucesion.js`
 * —`cobertura`, `dosel`, `agua`, `fauna`, `crecer`—, que no importan ni three ni
 * React. Si mañana el dosel tarda 35 años en vez de 32, las dos laderas cambian a
 * la vez. Una sola verdad sobre el tiempo, dos maneras de dibujarla.
 *
 * Un corte de perfil, además, muestra una cosa que la 3D esconde: la ladera es una
 * PENDIENTE, y todo lo que pasa acá pasa porque el agua baja por ella.
 */
import { crecer, cobertura, dosel, agua, fauna } from './tiempoSucesion.js';

/* El lienzo: un corte de la ladera, bajando de izquierda (arriba) a derecha. */
const W = 320;
const H = 160;
const Y0 = 64; // la cota del filo de arriba
const Y1 = 116; // la cota del filo de abajo

/** La línea del suelo: la MISMA pendiente que manda todo lo demás. */
const sueloY = (x) => Y0 + (x / W) * (Y1 - Y0);

const SUELO = `M0,${Y0} L${W},${Y1} L${W},${H} L0,${H} Z`;

/* Los dos climas (los mismos de la 3D: el año 50 aterriza en el páramo del
   Bosque Vivo). */
const CIELO_0 = [217, 220, 201];
const CIELO_1 = [195, 207, 206];
const TIERRA = '#9c7c52';
const MANTO_0 = [93, 122, 69];
const MANTO_1 = [61, 74, 51];

const mez = (a, b, t) => Math.round(a + (b - a) * t);
const rgb = (a, b, t) => `rgb(${mez(a[0], b[0], t)} ${mez(a[1], b[1], t)} ${mez(a[2], b[2], t)})`;

/* Dónde se para cada cosa. Todo cuelga de la pendiente: nada flota. */
const PIONERAS = [40, 118, 196, 272];
const TARDIOS = [72, 150, 178, 244, 300];
const BARRERAS = [58, 152, 246];
const CARCAVAS = [96, 208];
const SEMILLA_X = 132;

/** Un árbol: tronco y copa, creciendo DESDE el suelo (la escala sale de la base). */
function Arbol({ x, s, tronco, copa, ancho, alto, cy }) {
  if (s < 0.02) return null;
  return (
    <g transform={`translate(${x} ${sueloY(x)}) scale(${s})`}>
      <rect x={-1.4} y={-alto} width={2.8} height={alto} fill={tronco} rx={1} />
      <ellipse cx={0} cy={cy} rx={ancho} ry={alto * 0.42} fill={copa} />
    </g>
  );
}

/**
 * La ladera en corte, mandada por el año. Sin three, sin canvas: solo SVG.
 * @param {{ anio: number }} props
 */
export default function LaderaEnFranjas({ anio }) {
  const cob = cobertura(anio);
  const d = dosel(anio);
  const ag = agua(anio);
  const fa = fauna(anio);

  // Las mismas curvas por especie que usa la 3D.
  const pionera = crecer(anio, 1.8, 12.5, 0.5);
  const tardio = crecer(anio, 8, 34, 1);
  const barrera = crecer(anio, 0.4, 3.4, 0.55);
  const herida = 1 - crecer(anio, 2.5, 13, 0.8);

  return (
    <svg
      className="rest__franjas"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Corte de la ladera en el año ${Math.round(anio)}`}
    >
      {/* El cielo: lavado por el sol crudo → gris-verde del páramo húmedo. */}
      <rect x={0} y={0} width={W} height={H} fill={rgb(CIELO_0, CIELO_1, d)} />

      {/* El sol crudo. Se apaga porque creció el monte, no porque se hizo tarde. */}
      <circle cx={258} cy={30} r={12} fill="#ffe9a8" opacity={1 - d * 0.85} />

      {/* La niebla: solo se queda cuando hay dosel. */}
      <rect
        x={0}
        y={44}
        width={W}
        height={46}
        fill="#c9d3d1"
        opacity={Math.max(0, (d - 0.35) / 0.65) * 0.5}
      />

      {/* Las aves: llegan de últimas, cuando el bosque ya las sostiene. */}
      {fa > 0.05 && (
        <g opacity={fa} fill="none" stroke="#2f3730" strokeWidth={1.2} strokeLinecap="round">
          <path d="M196,34 l4,-3 l4,3" />
          <path d="M214,42 l3.4,-2.6 l3.4,2.6" />
        </g>
      )}

      {/* LA TIERRA PELADA: siempre debajo. Debajo de un bosque de 50 años, sigue. */}
      <path d={SUELO} fill={TIERRA} />

      {/* Las cicatrices del año 0: por donde se fue la tierra. */}
      <g opacity={(1 - cob) * 0.8}>
        <path d={`M30,${sueloY(30)} l14,7`} stroke="#8c5638" strokeWidth={2.5} strokeLinecap="round" />
        <path d={`M170,${sueloY(170)} l16,8`} stroke="#8c5638" strokeWidth={2} strokeLinecap="round" />
        <path d={`M262,${sueloY(262)} l12,6`} stroke="#8c5638" strokeWidth={2.2} strokeLinecap="round" />
      </g>

      {/* EL MANTO: el suelo tapándose (opacidad) y haciéndose mantillo (color). */}
      <path d={SUELO} fill={rgb(MANTO_0, MANTO_1, d)} opacity={cob * 0.95} />

      {/* LAS CÁRCAVAS: la herida abierta. Se cierran cuando las raíces agarran. */}
      {CARCAVAS.map((x) => (
        <g key={x} transform={`translate(${x} ${sueloY(x)})`} opacity={herida}>
          <path d={`M-7,0 L0,${9 * herida} L7,0 Z`} fill="#5d3b28" />
          <path d={`M-7,0 L0,${9 * herida} L7,0`} fill="none" stroke="#a5824f" strokeWidth={1.2} />
        </g>
      ))}

      {/* LAS BARRERAS VIVAS: lo que hace el campesino. Atravesadas a la pendiente
          — por eso van rotadas con el ángulo del suelo y no derechas. */}
      {BARRERAS.map((x) => (
        <g key={x} transform={`translate(${x} ${sueloY(x)}) rotate(9.2) scale(${barrera})`}>
          <rect x={-13} y={-5} width={26} height={5} rx={2.5} fill="#7d8f4a" />
          <rect x={-1} y={-8} width={1.6} height={8} fill="#6b5033" />
        </g>
      ))}

      {/* EL AGUA: el nacimiento arriba y la quebrada bajando por la pendiente. */}
      <g opacity={ag}>
        <ellipse cx={18} cy={sueloY(18) - 1} rx={7} ry={2.6} fill="#6f96a0" />
        <path
          d={`M18,${sueloY(18)} Q90,${sueloY(90) + 4} 160,${sueloY(160) + 1} T${W},${sueloY(W) + 2}`}
          fill="none"
          stroke="#6f96a0"
          strokeWidth={2.4 * Math.max(0, (ag - 0.15) / 0.85)}
          strokeLinecap="round"
          opacity={0.9}
        />
      </g>

      {/* EL BOSQUE. Primero las pioneras (rápidas), después los lentos. */}
      {PIONERAS.map((x) => (
        <Arbol key={`p${x}`} x={x} s={pionera} tronco="#9a9a8f" copa="#4f6d3d" ancho={7} alto={17} cy={-21} />
      ))}
      {TARDIOS.map((x) => (
        <Arbol key={`t${x}`} x={x} s={tardio} tronco="#6a5c4a" copa="#3b5236" ancho={11} alto={20} cy={-23} />
      ))}

      {/*
        EL ÁRBOL SEMILLA. Entero desde el primer cuadro y hasta el último: es el
        que quedó vivo. En el año 0 está SOLO en toda la ladera — y de él sale
        todo lo demás.
      */}
      <Arbol x={SEMILLA_X} s={1.35} tronco="#6a5c4a" copa="#43593b" ancho={12} alto={21} cy={-24} />
    </svg>
  );
}
