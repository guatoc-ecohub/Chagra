/*
 * EscenaCutaway — ARQUETIPO `cutaway`: el CORTE de tierra (el suelo vivo).
 *
 * El prototipo del DR (§5): "lo invisible hecho visible". Un bloque de tierra
 * cortado en capas horizontales (hojarasca / suelo negro / subsuelo); sobre y
 * entre ellas, VIDA low-poly — raíces que descienden y ramifican, el "internet
 * de hongos" (hifas/micorrizas) y las criaturas reales de la librería (una
 * lombriz que asoma por el corte, un escarabajo que camina la hojarasca). La
 * CANTIDAD de vida = `params.vida` (0..1), que en producción lee el
 * `mundoSubsueloEngine` (score de salud del suelo): cansado → casi pelado, con
 * la tierra desnuda; vivo → lleno de raíces, hifas y bichos. La densidad manda:
 * más vivo = más vida, pero con AIRE (nunca amontonado — feedback del valle).
 *
 * Reusable por `abono` (corte de la pila de compost) sin código: es todo datos
 * (`params.capas` + `params.vida`). La lombriz de tierra es *Martiodrilus
 * crassus* (verificada, indicador real de suelo vivo); el escarabajo estercolero
 * *Dichotomius belus*. Perf (DR §6): SOLO `MeshLambert`/`MeshBasic`, sin sombras,
 * geometría 100% procedural; las criaturas son billboards SVG (three-free).
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import EscenaBase3D from './EscenaBase3D.jsx';
import { Lombriz } from '../../creatures/Lombriz.jsx';
import { Escarabajo } from '../../creatures/Escarabajo.jsx';

const ANCHO = 4.4;
const PROF = 2.2;
const CARA = PROF / 2; // el plano del corte (la cara frontal expuesta)

/* PRNG determinista (mismo corte siempre, sin GLTF ni azar por frame). */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function clamp01(n) {
  return Math.max(0, Math.min(1, typeof n === 'number' ? n : 0.6));
}

/* Un terrón: grumo low-poly (esfera de pocos lados, flat) que rompe la cara
   plana del corte — la "textura de acuario de tierra", sin cajas. */
function Terron({ pos, r, color }) {
  return (
    <mesh position={pos}>
      <sphereGeometry args={[r, 5, 4]} />
      <meshLambertMaterial color={color} flatShading />
    </mesh>
  );
}

/* Una raíz: cono principal que desciende + un par de raicillas laterales finas.
   Orgánica (conos afilados), no una caja — baja buscando agua y minerales. */
function Raiz({ pos, largo }) {
  return (
    <group position={pos}>
      <mesh>
        <coneGeometry args={[0.055, largo, 6]} />
        <meshLambertMaterial color="#c9a86a" flatShading />
      </mesh>
      <mesh position={[0.07, -largo * 0.18, 0]} rotation={[0, 0, -0.7]}>
        <coneGeometry args={[0.022, largo * 0.55, 5]} />
        <meshLambertMaterial color="#bd9a5a" flatShading />
      </mesh>
      <mesh position={[-0.06, -largo * 0.32, 0.02]} rotation={[0, 0, 0.8]}>
        <coneGeometry args={[0.018, largo * 0.42, 5]} />
        <meshLambertMaterial color="#bd9a5a" flatShading />
      </mesh>
    </group>
  );
}

/* Una hifa: hebra finísima blanca. Se siembran cruzadas = la red de micorrizas,
   el "internet de hongos" que enlaza las raíces con el agua y los minerales. */
function Hifa({ pos, giro, largo }) {
  return (
    <mesh position={pos} rotation={[0, 0, giro]}>
      <cylinderGeometry args={[0.007, 0.007, largo, 3]} />
      <meshBasicMaterial color="#f2ece0" />
    </mesh>
  );
}

/* Una brizna de pasto sobre la superficie: cono verde fino, vida sin peso. */
function Brizna({ pos, alto, giro }) {
  return (
    <mesh position={pos} rotation={[0, giro, 0.08]}>
      <coneGeometry args={[0.03, alto, 4]} />
      <meshLambertMaterial color="#6f9a45" flatShading />
    </mesh>
  );
}

/* Una criatura de la librería como BILLBOARD SVG (three-free) que respira/asoma.
   Con reduced-motion se congela en su fotograma (escena digna, no muerta). */
function Fauna({ base, phase, deriva = 0, asomo = 0.05, reducedMotion, children }) {
  const ref = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = base[1] + Math.sin(t * 1.1 + phase) * asomo;
    if (deriva) ref.current.position.x = base[0] + Math.sin(t * 0.32 + phase) * deriva;
  });
  return (
    <group ref={ref} position={base}>
      <Html center distanceFactor={5.4} zIndexRange={[24, 6]}>
        <div className="mundo-fauna" aria-hidden="true">{children}</div>
      </Html>
    </group>
  );
}

function Diorama({ params, reducedMotion }) {
  const vida = clamp01(params?.vida);

  const { bloques, ambiente, terrones, briznas, lombrices, escarabajo, total } = useMemo(() => {
    const capas = params?.capas || [];
    const alturaTotal = capas.reduce((s, c) => s + (c.alto || 0.6), 0) || 1;
    const bloq = [];
    const amb = []; // raíces + hifas (geometría de fondo, "vida textura")
    const terr = []; // grumos en la cara del corte
    const worms = []; // lombrices de la librería (asoman por el corte)
    const r = rng(97);
    let top = alturaTotal; // arranca por la superficie

    capas.forEach((capa, ci) => {
      const alto = capa.alto || 0.6;
      const cy = top - alto / 2;
      const color = capa.color || '#5a3d28';
      bloq.push({ key: `c${ci}`, cy, alto, color });

      // grumos que rompen la cara plana (pocos, siempre; textura de tierra)
      const nT = 2 + Math.round(alto * 2);
      for (let i = 0; i < nT; i++) {
        terr.push({
          key: `t${ci}-${i}`,
          pos: [(r() - 0.5) * (ANCHO - 0.5), cy + (r() - 0.5) * alto * 0.7, CARA - 0.04],
          rr: 0.09 + r() * 0.08,
          color,
        });
      }

      // vida-textura por capa: raíces y hifas, tanta como diga `vida`, con aire
      const tipos = (capa.bichos || []).filter((b) => b === 'raiz' || b === 'hifa');
      const n = Math.round(vida * (1.5 + alto * 2.2));
      for (let i = 0; i < n; i++) {
        const tipo = tipos.length ? tipos[i % tipos.length] : 'raiz';
        const x = (r() - 0.5) * (ANCHO - 0.8);
        const z = CARA - 0.03 - r() * 0.12; // pegada a la cara cortada (frente)
        const y = cy + (r() - 0.5) * alto * 0.55;
        if (tipo === 'hifa') {
          amb.push({ key: `h${ci}-${i}`, tipo, pos: [x, y, z], giro: (r() - 0.5) * 2.2, largo: 0.3 + r() * 0.4 });
        } else {
          amb.push({ key: `r${ci}-${i}`, tipo, pos: [x, y, z], largo: 0.32 + r() * alto });
        }
      }

      // lombriz de librería: asoma por el corte de las capas que la declaran
      // (suelo negro / tierra viva). Máx 2 en total → "vida, no relleno".
      if ((capa.bichos || []).includes('lombriz') && worms.length < 2 && vida > 0.22) {
        worms.push({
          key: `w${ci}`,
          base: [(r() - 0.5) * (ANCHO - 1.4), cy + 0.02, CARA + 0.06],
          phase: r() * Math.PI * 2,
        });
      }
      top -= alto;
    });

    // briznas de pasto sobre la superficie (pocas, más con vida)
    const nB = 1 + Math.round(vida * 3);
    const briz = Array.from({ length: nB }, (_, i) => ({
      key: `b${i}`,
      pos: [(r() - 0.5) * (ANCHO - 1), alturaTotal + 0.12, (r() - 0.5) * (PROF - 0.6)],
      alto: 0.16 + r() * 0.12,
      giro: r() * Math.PI,
    }));

    // escarabajo estercolero caminando la hojarasca (solo si el suelo está vivo)
    const beetle = vida >= 0.4
      ? { base: [(r() - 0.5) * 1.2, alturaTotal + 0.24, CARA - 0.25], phase: r() * Math.PI * 2 }
      : null;

    return { bloques: bloq, ambiente: amb, terrones: terr, briznas: briz, lombrices: worms, escarabajo: beetle, total: alturaTotal };
  }, [params, vida]);

  return (
    <group position={[0, -total / 2, 0]}>
      {/* las capas: bloques apilados, cara frontal expuesta (el corte) */}
      {bloques.map((b) => (
        <mesh key={b.key} position={[0, b.cy, 0]}>
          <boxGeometry args={[ANCHO, b.alto, PROF]} />
          <meshLambertMaterial color={b.color} flatShading />
        </mesh>
      ))}
      {/* grumos que quiebran la cara plana del corte */}
      {terrones.map((t) => <Terron key={t.key} pos={t.pos} r={t.rr} color={t.color} />)}
      {/* el borde de pasto sobre la superficie */}
      <mesh position={[0, total + 0.03, 0]}>
        <boxGeometry args={[ANCHO, 0.08, PROF]} />
        <meshLambertMaterial color="#6f9a45" flatShading />
      </mesh>
      {briznas.map((b) => <Brizna key={b.key} pos={b.pos} alto={b.alto} giro={b.giro} />)}
      {/* la vida-textura del suelo: raíces que bajan y la red de hifas */}
      {ambiente.map((v) =>
        v.tipo === 'hifa'
          ? <Hifa key={v.key} pos={v.pos} giro={v.giro} largo={v.largo} />
          : <Raiz key={v.key} pos={v.pos} largo={v.largo} />,
      )}
      {/* las criaturas reales de la librería (billboards SVG, three-free) */}
      {lombrices.map((w) => (
        <Fauna key={w.key} base={w.base} phase={w.phase} asomo={0.06} reducedMotion={reducedMotion}>
          <Lombriz size={40} animated={!reducedMotion} />
        </Fauna>
      ))}
      {escarabajo && (
        <Fauna base={escarabajo.base} phase={escarabajo.phase} deriva={0.9} asomo={0.03} reducedMotion={reducedMotion}>
          <Escarabajo size={42} animated={!reducedMotion} />
        </Fauna>
      )}
    </group>
  );
}

export default function EscenaCutaway(props) {
  const alto = (props.params?.capas || []).reduce((s, c) => s + (c.alto || 0.6), 0) || 1.5;
  const cielo = { fondo: '#e7d7ba', cielo: '#f3e6cc', suelo: '#7a5a38', intensidad: 1.05 };
  return (
    <EscenaBase3D
      {...props}
      cielo={cielo}
      entrada={{ ...props.entrada, centro: [0, alto * 0.2, 0.6] }}
      piso={-alto / 2}
    >
      <Diorama params={props.params} reducedMotion={props.reducedMotion} />
    </EscenaBase3D>
  );
}
