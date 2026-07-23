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
import { Mariposa } from '../../creatures/Mariposa.jsx';
import { coreografia } from '../faunaFuncional.js';
import { CIELOS, PALETA, mezclar } from '../atmosferaMadre.js';
import useCicloDia from '../useCicloDia.js';
import { presetDeHora } from '../cielosHoraData.js';

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
   Orgánica (conos afilados), no una caja — baja buscando agua y minerales.
   VOLTEADA con la punta hacia abajo (como RaizNodulos): el cono de three trae
   el ápice arriba y, en relieve sobre el corte, leía como espina que sube
   (QA visual 2026-07-23) — una raíz es gruesa arriba y se afina bajando. */
function Raiz({ pos, largo }) {
  return (
    <group position={pos}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.055, largo, 6]} />
        <meshLambertMaterial color="#c9a86a" flatShading />
      </mesh>
      {/* raicillas: nacen en la parte ALTA y ramifican hacia abajo-afuera —
          sin voltear quedaban con la punta arriba cruzadas en X en el ápice
          (leían como palos de espantapájaros, no como raíz). */}
      <mesh position={[0.09, largo * 0.12, 0]} rotation={[Math.PI, 0, 0.55]}>
        <coneGeometry args={[0.022, largo * 0.55, 5]} />
        <meshLambertMaterial color="#bd9a5a" flatShading />
      </mesh>
      <mesh position={[-0.08, largo * 0.02, 0.02]} rotation={[Math.PI, 0, -0.6]}>
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
      <cylinderGeometry args={[0.012, 0.012, largo, 3]} />
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

/* ── LA MILPA (las tres hermanas) — primitivas de planta menores ────────────
   Cuando el corte declara `params.milpa`, sobre la superficie crece el módulo de
   las tres hermanas y, en la cara del corte, se ven las RAÍCES DEL FRÍJOL con sus
   nódulos rosados: el nitrógeno que se fija bajo tierra, hecho visible (50–80 kg
   N/ha vía Rhizobium — dato verificado). El maíz da la vara, el fríjol sube por
   ella y abona, la calabaza cubre el suelo. Todas low-poly (cono/cilindro/esfera),
   sin cajas; no toca el corte de suelo/abono (va detrás de `params.milpa`). */

/* MataMaiz: la caña = el tutor vivo. Cilindro + hojas cono + mazorca cápsula. */
function MataMaiz({ base, alto = 1.7 }) {
  const [x, y, z] = base;
  const hojas = [0.34, 0.52, 0.7, 0.86];
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, alto / 2, 0]}>
        <cylinderGeometry args={[0.045, 0.075, alto, 7]} />
        <meshLambertMaterial color="#88a24a" flatShading />
      </mesh>
      {hojas.map((f, i) => {
        const lado = i % 2 === 0 ? 1 : -1;
        return (
          <mesh key={f} position={[lado * 0.11, alto * f, 0]} rotation={[0, i * 1.4, lado * -0.95]}>
            <coneGeometry args={[0.05, 0.62, 4]} />
            <meshLambertMaterial color="#6f9a45" flatShading />
          </mesh>
        );
      })}
      {/* la mazorca: cápsula crema arrimada a la caña */}
      <mesh position={[0.12, alto * 0.5, 0.05]} rotation={[0, 0, 0.5]}>
        <capsuleGeometry args={[0.075, 0.2, 3, 7]} />
        <meshLambertMaterial color="#ecd98f" flatShading />
      </mesh>
      {/* el penacho de arriba (la flor del maíz) */}
      <mesh position={[0, alto + 0.14, 0]}>
        <coneGeometry args={[0.06, 0.28, 5]} />
        <meshLambertMaterial color="#d8c98a" flatShading />
      </mesh>
    </group>
  );
}

/* GuiaFrijol: espiral fino que sube ciñéndose a la caña del maíz. */
function GuiaFrijol({ base, alto = 1.5, vueltas = 4 }) {
  const [x, y, z] = base;
  const N = 20;
  const cuentas = Array.from({ length: N }, (_, i) => {
    const f = i / (N - 1);
    const ang = f * vueltas * Math.PI * 2;
    const r = 0.1 + 0.02 * (1 - f);
    return { key: i, pos: [Math.cos(ang) * r, alto * f + 0.06, Math.sin(ang) * r], hoja: i % 5 === 2, ang };
  });
  return (
    <group position={[x, y, z]}>
      {cuentas.map((c) => (
        <group key={c.key}>
          <mesh position={/** @type {[number, number, number]} */ (c.pos)}>
            <sphereGeometry args={[0.026, 5, 4]} />
            <meshLambertMaterial color="#4f8a34" flatShading />
          </mesh>
          {c.hoja && (
            <mesh position={/** @type {[number, number, number]} */ (c.pos)} rotation={[0, -c.ang, 0.6]}>
              <coneGeometry args={[0.04, 0.15, 4]} />
              <meshLambertMaterial color="#5f9a3f" flatShading />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/* Calabaza: hojas rastreras (conos aplanados sobre el suelo) + fruto ocre + flor
   amarilla (donde poliniza la abeja). Cobertura viva que sombrea el suelo. */
function Calabaza({ base }) {
  const [x, y, z] = base;
  const hojas = [
    { p: [0, 0.03, 0], r: 0.3, rot: 0.2 },
    { p: [0.36, 0.03, 0.12], r: 0.24, rot: -0.5 },
    { p: [0.62, 0.03, -0.1], r: 0.26, rot: 0.9 },
    { p: [0.28, 0.03, -0.3], r: 0.22, rot: 1.6 },
    { p: [-0.3, 0.03, 0.2], r: 0.2, rot: 2.3 },
  ];
  return (
    <group position={[x, y, z]}>
      {hojas.map((h) => (
        <mesh key={`${h.p[0]}-${h.p[2]}`} position={/** @type {[number, number, number]} */ (h.p)} rotation={[-Math.PI / 2, 0, h.rot]}>
          <coneGeometry args={[h.r, 0.06, 5]} />
          <meshLambertMaterial color={PALETA.follaje} flatShading />
        </mesh>
      ))}
      {/* el fruto: esfera achatada, color ahuyama */}
      <mesh position={[0.5, 0.16, 0.05]} scale={[1, 0.72, 1]}>
        <sphereGeometry args={[0.2, 8, 6]} />
        <meshLambertMaterial color="#cf8f3c" flatShading />
      </mesh>
      {/* la flor amarilla que llama a la abeja */}
      <group position={[-0.12, 0.12, 0.28]}>
        <mesh rotation={[0.5, 0, 0]}>
          <coneGeometry args={[0.09, 0.16, 6]} />
          <meshLambertMaterial color="#e8c34a" flatShading />
        </mesh>
        <mesh position={[0, 0.03, 0.03]}>
          <sphereGeometry args={[0.032, 5, 4]} />
          <meshBasicMaterial color="#f0d878" />
        </mesh>
      </group>
    </group>
  );
}

/* RaizNodulos: la raíz pivotante del fríjol que baja por la cara del corte, con
   sus NÓDULOS = esferitas rosadas (Rhizobium fijando nitrógeno del aire). Lo
   invisible del subsuelo, hecho visible: aquí se ve el abono que el fríjol regala. */
function RaizNodulos({ base, largo = 1.4 }) {
  const [x, y, z] = base;
  const M = 7;
  const nodulos = Array.from({ length: M }, (_, i) => {
    const f = 0.18 + (i / M) * 0.78;
    const lado = i % 2 === 0 ? 1 : -1;
    return { key: i, pos: [lado * (0.04 + (i % 3) * 0.05), -largo * f, 0.02 * lado], r: 0.038 + (i % 2) * 0.014 };
  });
  return (
    <group position={[x, y, z]}>
      {/* raíz pivotante: cono que se afina hacia abajo */}
      <mesh position={[0, -largo / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.06, largo, 6]} />
        <meshLambertMaterial color="#c9a86a" flatShading />
      </mesh>
      <mesh position={[0.12, -largo * 0.36, 0]} rotation={[0, 0, -0.9]}>
        <coneGeometry args={[0.025, largo * 0.5, 5]} />
        <meshLambertMaterial color="#bd9a5a" flatShading />
      </mesh>
      <mesh position={[-0.12, -largo * 0.56, 0]} rotation={[0, 0, 0.9]}>
        <coneGeometry args={[0.022, largo * 0.44, 5]} />
        <meshLambertMaterial color="#bd9a5a" flatShading />
      </mesh>
      {nodulos.map((nd) => (
        <mesh key={nd.key} position={/** @type {[number, number, number]} */ (nd.pos)}>
          <sphereGeometry args={[nd.r, 6, 5]} />
          <meshLambertMaterial color="#e0a3ad" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Avispa parasitoide (Trichogramma / Cotesia — CONTROLADOR biológico de la
   milpa): PATRULLA sobre el maíz cazando los huevos y larvas del cogollero
   (Spodoptera frugiperda), la plaga #1 del maíz andino. Cuerpo ámbar con bandas
   oscuras, cintura fina (pecíolo) y alas translúcidas; low-poly, sin cajas. Su
   zigzag es la misma coreografía de rol 'patrulla'; se congela con reduced-motion. */
function AvispaParasitoide({ base, fase = 0, reducedMotion = false }) {
  const ref = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const [dx, dy, dz] = coreografia('patrulla', state.clock.elapsedTime, fase);
    ref.current.position.set(base[0] + dx, base[1] + dy, base[2] + dz);
  });
  return (
    <group ref={ref} position={base} scale={0.62}>
      {/* cabeza oscura (mira hacia +x) */}
      <mesh position={[0.15, 0.01, 0]}>
        <sphereGeometry args={[0.05, 7, 6]} />
        <meshLambertMaterial color="#2a2018" flatShading />
      </mesh>
      {/* antenas */}
      {[0.03, -0.03].map((z) => (
        <mesh key={z} position={[0.2, 0.06, z]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.006, 0.006, 0.12, 4]} />
          <meshLambertMaterial color="#2a2018" />
        </mesh>
      ))}
      {/* tórax ámbar */}
      <mesh position={[0.04, 0, 0]}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshLambertMaterial color="#caa23a" flatShading />
      </mesh>
      {/* cintura fina (pecíolo) que une tórax y abdomen */}
      <mesh position={[-0.06, -0.005, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.05, 5]} />
        <meshLambertMaterial color="#caa23a" flatShading />
      </mesh>
      {/* abdomen ámbar alargado */}
      <mesh position={[-0.17, -0.01, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1.5, 1]}>
        <capsuleGeometry args={[0.06, 0.1, 3, 7]} />
        <meshLambertMaterial color="#d9a531" flatShading />
      </mesh>
      {/* las bandas oscuras (la señal "avispa") */}
      {[-0.12, -0.19, -0.26].map((x) => (
        <mesh key={x} position={[x, -0.01, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.06, 0.012, 5, 10]} />
          <meshLambertMaterial color="#2a2018" flatShading />
        </mesh>
      ))}
      {/* alas translúcidas */}
      {[0.09, -0.09].map((z) => (
        <mesh key={z} position={[0.02, 0.08, z]} rotation={[z > 0 ? -0.5 : 0.5, 0, 0.2]} scale={[1.7, 1, 0.7]}>
          <sphereGeometry args={[0.07, 6, 4]} />
          <meshBasicMaterial color="#eef4f4" transparent opacity={0.42} />
        </mesh>
      ))}
    </group>
  );
}

/* El módulo de las tres hermanas, compuesto sobre la cara del corte. */
function Milpa({ total, config, reducedMotion }) {
  const cfg = config === true ? {} : (config || {});
  const zF = CARA - 0.16; // el frente del corte, donde crecen las plantas
  const zRaiz = CARA - 0.05; // pegado a la cara: las raíces se ven en el corte
  const maizX = cfg.maiz?.x ?? -0.25;
  const maizAlto = cfg.maiz?.alto ?? 1.7;
  const calX = cfg.calabaza?.x ?? 0.7;
  const vueltas = cfg.frijol?.vueltas ?? 4;
  return (
    <group>
      <MataMaiz base={[maizX, total, zF]} alto={maizAlto} />
      <GuiaFrijol base={[maizX, total, zF]} alto={maizAlto * 0.9} vueltas={vueltas} />
      <RaizNodulos base={[maizX, total, zRaiz]} largo={total * 0.62} />
      <Calabaza base={[calX, total, zF - 0.05]} />
      {/* POLINIZADOR: la mariposa que visita la flor de la calabaza (vida, no relleno) */}
      <Fauna base={[calX - 0.15, total + 0.5, zF + 0.12]} phase={1.7} deriva={0.5} asomo={0.05} reducedMotion={reducedMotion}>
        <Mariposa size={38} animated={!reducedMotion} />
      </Fauna>
      {/* CONTROLADOR: la avispa parasitoide patrullando sobre el maíz (caza el cogollero) */}
      <AvispaParasitoide base={[maizX + 0.2, total + maizAlto * 0.82, zF + 0.12]} fase={0.7} reducedMotion={reducedMotion} />
    </group>
  );
}

function Diorama({ params, reducedMotion }) {
  const vida = clamp01(params?.vida);

  /* EL PISO DE LECTURA del corte (mismo remedio del cafetal/aguacatal, #2707):
     la cara cortada mira al frente (+z) y el sol de la franja — cenital de día,
     apagado de noche — nunca la ilumina de lleno: el "suelo negro" caía a masa
     negra ilegible (QA visual 2026-07-23). Dos luces locales de la escena que
     COMPENSAN lo que la hora apaga (`refuerzo` sube de noche, a mediodía casi
     no suma): un relleno hemisférico cálido y una clave frontal SIN sombras
     que baña la cara del corte. El domo y la niebla siguen contando la hora:
     la noche se conserva noche, pero las capas y su vida se LEEN. */
  const { franja } = useCicloDia({ reducedMotion });
  const madre = useMemo(() => presetDeHora(franja), [franja]);
  const refuerzo = Math.max(0, 1 - (madre.intensidad ?? 1));

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

      // grumos que rompen la cara plana (pocos, siempre; textura de tierra).
      // ACLARADOS un paso hacia el crema: del mismo color de la capa eran
      // invisibles (QA visual 2026-07-23) — la textura existía y no se leía.
      const nT = 2 + Math.round(alto * 2);
      const colorTerron = mezclar(color, '#f0e2c8', 0.18);
      for (let i = 0; i < nT; i++) {
        terr.push({
          key: `t${ci}-${i}`,
          pos: [(r() - 0.5) * (ANCHO - 0.5), cy + (r() - 0.5) * alto * 0.7, CARA - 0.04],
          rr: 0.09 + r() * 0.08,
          color: colorTerron,
        });
      }

      // vida-textura por capa: raíces y hifas, tanta como diga `vida`, con aire
      const tipos = (capa.bichos || []).filter((b) => b === 'raiz' || b === 'hifa');
      const n = Math.round(vida * (3 + alto * 3.4));
      for (let i = 0; i < n; i++) {
        const tipo = tipos.length ? tipos[i % tipos.length] : 'raiz';
        const x = (r() - 0.5) * (ANCHO - 0.8);
        // EN RELIEVE sobre la cara cortada, no dentro del bloque: antes iba en
        // CARA-0.03-r()*0.12 y quedaba ENTERRADA — una hifa de radio 0.007 no
        // asomaba jamás y la raíz apenas la punta (QA visual 2026-07-23: el
        // corte prometía micorrizas y no se veía ni una).
        const z = CARA + 0.015 + r() * 0.03;
        const y = cy + (r() - 0.5) * alto * 0.55;
        if (tipo === 'hifa') {
          amb.push({ key: `h${ci}-${i}`, tipo, pos: [x, y, z], giro: (r() - 0.5) * 2.2, largo: 0.3 + r() * 0.4 });
        } else {
          // La raíz cuelga ANCLADA al tope de su capa (desciende desde arriba,
          // como en la tierra real) — suelta a mitad de banda flotaba.
          const largo = 0.32 + r() * alto;
          const yTope = cy + alto / 2 - r() * 0.12;
          amb.push({ key: `r${ci}-${i}`, tipo, pos: [x, yTope - largo / 2, z], largo });
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
      pos: /** @type {[number, number, number]} */ ([(r() - 0.5) * (ANCHO - 1), alturaTotal + 0.12, (r() - 0.5) * (PROF - 0.6)]),
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
      {/* el piso de lectura: relleno cálido + clave frontal hacia la cara del
          corte (target implícito en el origen del grupo, delante del bloque) */}
      <hemisphereLight color="#f2e6c8" groundColor="#4a3524" intensity={0.34 + 1.15 * refuerzo} />
      <directionalLight position={[1.4, 2.2, 7]} color="#ffe9c0" intensity={0.55 + 0.95 * refuerzo} />
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
      {/* la milpa: las tres hermanas arriba y los nódulos de N abajo (opt-in) */}
      {params?.milpa && <Milpa total={total} config={params.milpa} reducedMotion={reducedMotion} />}
    </group>
  );
}

export default function EscenaCutaway(props) {
  const alto = (props.params?.capas || []).reduce((s, c) => s + (c.alto || 0.6), 0) || 1.5;
  const cielo = CIELOS.tierra;
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
