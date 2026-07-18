/*
 * EscenaFrutales — ARQUETIPO `frutales`: el HUERTO DE FRUTALES de clima
 * cálido/templado de la finca.
 *
 * De la familia del `cafe` (un cultivo hecho lugar), pero aquí la lección es el
 * SOLAR DE FRUTALES: árboles de distinta especie, EDAD y ALTURA conviviendo en
 * el mismo huerto — nunca la fila monótona del monocultivo. El diorama enseña
 * lo que de verdad es el huerto campesino:
 *
 *   · el AGUACATE — el mayor del solar, copa alta y oscura, con el fruto
 *     verde-oscuro colgando de su pedúnculo (se cosecha "hecho", no maduro);
 *   · el MANGO — copa ancha y densa de clima cálido, el fruto dorado colgando
 *     de un pedúnculo LARGO (su seña en el árbol);
 *   · los CÍTRICOS — naranjo, limonero y mandarino, redondos y cargados de
 *     fruto de color: la naranja, el limón y la mandarina se ven de lejos;
 *   · las EDADES — del injerto recién sembrado con su tutor al aguacate mayor:
 *     el huerto se RENUEVA, no se envejece entero de golpe;
 *   · el PLATEO — el anillo de hojarasca al pie de cada árbol que guarda la
 *     humedad y abona (el pasto no se come al frutal);
 *   · la PODA — el corte limpio señalado en el mango (aclarar la copa deja
 *     entrar luz y aire: menos hongos, más fruto);
 *   · la COSECHA — la escalera y los canastos: la fruta se baja con la mano,
 *     no se apalea (fruta golpeada = fruta perdida).
 *
 * Todo `MeshLambert`, sin sombras (contrato de EscenaBase3D). Geometría de
 * primitivas de pocos segmentos: cero GLTF, offline y liviano. La vida entra
 * como billboards de la librería (`Fauna`): polinizadores y descomponedor.
 */
import { useMemo } from 'react';
import EscenaBase3D from './EscenaBase3D.jsx';
import { Fauna } from './FaunaEscena.jsx';
import { CIELOS, PALETA } from '../atmosferaMadre.js';

/* La fauna que delata un huerto SANO: los polinizadores que cuajan la fruta
   (sin abeja ni mariposa no hay mango ni naranja) y el escarabajo que trabaja
   la hojarasca del plateo. Pocas y por criterio ecológico (contrato del DR). */
const FAUNA_FRUTALES = [
  { tipo: 'mariposa', base: [0.15, 1.15, 0.55], patron: 'polinizar', size: 26, fase: 0.6 },
  { tipo: 'colibri', base: [-1.2, 1.7, 0.15], patron: 'revoloteo', size: 28, fase: 1.9 },
  { tipo: 'escarabajo', base: [0.65, 0.06, 1.05], patron: 'reptar', size: 22, fase: 3.1 },
];

/* El CARÁCTER de cada especie, en datos: copa, fruto (color/forma/tamaño) y
   cómo cuelga. La forma es un sphere escalado (pera del aguacate, riñón del
   mango, esfera del cítrico); `pend` es el largo del pedúnculo — el del mango
   es LARGO a propósito (su seña en el árbol real). */
const ESPECIES = {
  aguacate: {
    copa: '#3d6631', copaClara: '#4f7f3c', fruto: '#2b431c',
    forma: [1, 1.45, 1], rFruto: 0.088, pend: 0.16,
  },
  mango: {
    copa: '#4a7c36', copaClara: '#61984a', fruto: '#eda03b', rubor: '#cd5a2a',
    forma: [0.95, 1.3, 0.85], rFruto: 0.095, pend: 0.3,
  },
  naranjo: {
    copa: '#467c3c', copaClara: '#5c9448', fruto: '#f08c24',
    forma: [1, 1, 1], rFruto: 0.078, pend: 0.07,
  },
  limonero: {
    copa: '#54894a', copaClara: '#6ba455', fruto: '#eed23c',
    forma: [1, 1.22, 1], rFruto: 0.068, pend: 0.06,
  },
  mandarino: {
    copa: '#4b823f', copaClara: '#639a4d', fruto: '#ef7d18',
    forma: [1, 0.92, 1], rFruto: 0.058, pend: 0.05,
  },
};

/* El PLATEO: el anillo de hojarasca/mulch al pie del árbol. Guarda humedad,
   abona con la hoja que cae y le quita el pasto competidor al frutal. */
function Plateo({ r = 0.4 }) {
  return (
    <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r * 0.28, r, 18]} />
      <meshLambertMaterial color={PALETA.tierra} />
    </mesh>
  );
}

/*
 * Un ÁRBOL FRUTAL: tronco + copa DENSA en varias esferas + los frutos
 * característicos colgando del borde bajo de la copa, cada uno con su
 * pedúnculo. Determinista por índice (mismo huerto siempre). `poda` señala un
 * corte limpio en una rama (el disco claro del corte reciente, sin drama).
 */
function ArbolFrutal({ especie, pos, alto = 1.4, ancho = 1, frutos = 6, poda = false }) {
  const cfg = ESPECIES[especie] || ESPECIES.naranjo;

  // La copa densa: un núcleo grande + satélites que la despeinan (nada de
  // esfera perfecta de plastilina). Escala con alto/ancho del individuo.
  const copa = useMemo(() => {
    const cy = alto; // centro de copa
    const R = 0.34 * ancho + alto * 0.16;
    return [
      [0, cy, 0, R],
      [R * 0.72, cy - R * 0.3, R * 0.2, R * 0.62],
      [-R * 0.66, cy - R * 0.24, -R * 0.16, R * 0.66],
      [R * 0.18, cy + R * 0.52, -R * 0.4, R * 0.56],
      [-R * 0.26, cy + R * 0.44, R * 0.44, R * 0.52],
    ];
  }, [alto, ancho]);

  // Los frutos, colgando del borde BAJO de la copa hacia el aire (donde se ven
  // y se cosechan): anclados en la falda de la copa, POR FUERA del follaje, en
  // silueta contra el cielo — el fruto es la lección, tiene que leerse de
  // lejos. Determinista por índice.
  const cuelgan = useMemo(() => {
    const R = 0.34 * ancho + alto * 0.16;
    return Array.from({ length: frutos }, (_, i) => {
      const a = (i / frutos) * Math.PI * 2 + 0.7;
      const r = R * (0.82 + (i % 3) * 0.1);
      const y = alto - R * 0.58 - (i % 2) * 0.08;
      return /** @type {[number, number, number]} */ ([
        Math.cos(a) * r, y, Math.sin(a) * r,
      ]);
    });
  }, [frutos, alto, ancho]);

  return (
    <group position={pos}>
      <Plateo r={0.3 + ancho * 0.2} />
      {/* el tronco (más grueso mientras más viejo el árbol) */}
      <mesh position={[0, alto * 0.5, 0]}>
        <cylinderGeometry args={[0.05 + alto * 0.02, 0.09 + alto * 0.03, alto, 6]} />
        <meshLambertMaterial color={PALETA.madera} flatShading />
      </mesh>
      {/* la copa densa */}
      {copa.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[r, 9, 7]} />
          <meshLambertMaterial color={i % 2 ? cfg.copa : cfg.copaClara} flatShading />
        </mesh>
      ))}
      {/* los frutos característicos, colgando de su pedúnculo */}
      {cuelgan.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh position={[0, cfg.pend * 0.5, 0]}>
            <cylinderGeometry args={[0.008, 0.008, cfg.pend, 4]} />
            <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
          </mesh>
          <mesh position={[0, -cfg.rFruto * cfg.forma[1] * 0.72, 0]} scale={cfg.forma}>
            <sphereGeometry args={[cfg.rFruto, 8, 6]} />
            <meshLambertMaterial
              color={cfg.rubor && i % 2 ? cfg.rubor : cfg.fruto}
              flatShading
            />
          </mesh>
        </group>
      ))}
      {/* la PODA: la rama aclarada con su corte limpio (disco claro), señal sin
          drama — la copa abierta deja entrar luz y aire */}
      {poda && (
        <group position={[0.16, alto * 0.62, 0.14]} rotation={[0, 0, -0.9]}>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 0.14, 5]} />
            <meshLambertMaterial color={PALETA.madera} flatShading />
          </mesh>
          <mesh position={[0, 0.145, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.032, 8]} />
            <meshLambertMaterial color={PALETA.maderaClara} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* El INJERTO recién sembrado: la matica con su TUTOR y la venda clara del
   injerto en el tallo — la edad más nueva del huerto (el solar se renueva). */
function InjertoJoven({ pos }) {
  return (
    <group position={pos}>
      <Plateo r={0.26} />
      {/* el tallo con la venda del injerto */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.018, 0.026, 0.4, 5]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.05, 6]} />
        <meshLambertMaterial color={PALETA.cal} flatShading />
      </mesh>
      {/* el brote nuevo, verde tierno */}
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshLambertMaterial color={PALETA.follajeClaro} flatShading />
      </mesh>
      {/* el tutor que lo endereza, amarrado */}
      <mesh position={[0.09, 0.3, 0.02]} rotation={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 4]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
    </group>
  );
}

/* La COSECHA en su rincón: la ESCALERA recostada al mango y los CANASTOS con
   la fruta bajada A MANO (fruta golpeada = fruta perdida). */
function RinconCosecha({ pos }) {
  const peldanos = [0.22, 0.44, 0.66, 0.88];
  return (
    <group position={pos}>
      {/* la escalera recostada */}
      <group rotation={[0.42, 0.5, 0]}>
        {[-0.11, 0.11].map((x, i) => (
          <mesh key={i} position={[x, 0.55, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.1, 5]} />
            <meshLambertMaterial color={PALETA.maderaClara} flatShading />
          </mesh>
        ))}
        {peldanos.map((y, i) => (
          <mesh key={i} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, 0.22, 4]} />
            <meshLambertMaterial color={PALETA.madera} flatShading />
          </mesh>
        ))}
      </group>
      {/* los canastos de la fruta cosechada */}
      {[
        { p: [0.34, 0, 0.3], fruta: '#e8862a' }, // naranjas
        { p: [0.62, 0, 0.06], fruta: '#e0913a' }, // mangos
      ].map((c, i) => (
        <group key={i} position={c.p}>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.15, 0.11, 0.18, 9]} />
            <meshLambertMaterial color={PALETA.maderaClara} flatShading />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <sphereGeometry args={[0.115, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshLambertMaterial color={c.fruta} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Diorama({ params, reducedMotion }) {
  // El huerto por defecto: cinco especies a DISTINTA altura y edad, regadas
  // por el solar (nunca la fila monótona). `params.arboles` lo puede pisar.
  const arboles = params?.arboles || [
    { especie: 'aguacate', pos: [-1.35, 0, -0.75], alto: 2.15, ancho: 1.15, frutos: 5 },
    { especie: 'mango', pos: [1.4, 0, -0.8], alto: 1.7, ancho: 1.35, frutos: 6, poda: true },
    { especie: 'naranjo', pos: [0.12, 0, -0.2], alto: 1.15, ancho: 1, frutos: 8 },
    { especie: 'limonero', pos: [-1.05, 0, 0.72], alto: 0.95, ancho: 0.9, frutos: 7 },
    { especie: 'mandarino', pos: [0.95, 0, 0.6], alto: 0.85, ancho: 0.85, frutos: 9 },
  ];

  return (
    <group>
      {/* el piso del solar: tierra cálida con pasto bajo */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.15, 30]} />
        <meshLambertMaterial color="#8a7a44" />
      </mesh>
      <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.55, 2.15, 30]} />
        <meshLambertMaterial color="#7e8a4a" />
      </mesh>

      {/* los frutales, cada uno con su plateo y su edad */}
      {arboles.map((a, i) => (
        <ArbolFrutal
          key={i}
          especie={a.especie}
          pos={a.pos}
          alto={a.alto}
          ancho={a.ancho}
          frutos={a.frutos}
          poda={a.poda}
        />
      ))}

      {/* la edad más nueva: el injerto con su tutor (el huerto se renueva) */}
      <InjertoJoven pos={[-0.18, 0, 1.2]} />

      {/* la cosecha: escalera y canastos junto al mango (a mano, no a palo) */}
      <RinconCosecha pos={[1.15, 0, 0.05]} />

      {/* la vida que cuaja la fruta: polinizadores + el del plateo */}
      <Fauna items={FAUNA_FRUTALES} reducedMotion={reducedMotion} />
    </group>
  );
}

export default function EscenaFrutales(props) {
  // Cielo de "huerta al sol" (atmosferaMadre): el solar de frutales es de
  // clima cálido/templado — verde dorado, tarde tibia.
  const cielo = CIELOS.huerta;
  return (
    <EscenaBase3D {...props} cielo={cielo} entrada={{ ...props.entrada, centro: [0, 0.8, 0] }}>
      <Diorama params={props.params} reducedMotion={props.reducedMotion} />
    </EscenaBase3D>
  );
}
