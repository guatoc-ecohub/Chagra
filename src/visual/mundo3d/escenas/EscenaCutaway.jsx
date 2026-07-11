/*
 * EscenaCutaway — ARQUETIPO `cutaway`: el CORTE de tierra (el suelo vivo).
 *
 * El prototipo del DR (§5): "lo invisible hecho visible". Un bloque de tierra
 * cortado en capas horizontales (hojarasca / suelo negro / subsuelo); sobre y
 * entre ellas, VIDA low-poly — lombrices, raíces que descienden, "internet de
 * hongos" (hifas). La CANTIDAD de vida = `params.vida` (0..1), que en producción
 * lee el `mundoSubsueloEngine` (score de salud del suelo): cansado → casi pelado;
 * vivo → lleno. Reusable por `abono` (corte de la pila de compost) sin código.
 *
 * Perf (DR §6): SOLO `MeshLambert`/`MeshBasic`, sin sombras, geometría acotada.
 */
import { useMemo } from 'react';
import EscenaBase3D from './EscenaBase3D.jsx';

const ANCHO = 4.4;
const PROF = 2.2;

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

/* Una lombriz: cápsula curvada (toro parcial) tumbada, tono claro. */
function Lombriz({ pos, giro }) {
  return (
    <mesh position={pos} rotation={[Math.PI / 2, giro, 0]}>
      <torusGeometry args={[0.12, 0.045, 6, 10, Math.PI * 1.2]} />
      <meshLambertMaterial color="#e8b6a6" />
    </mesh>
  );
}

/* Una raíz: cono fino que desciende desde su capa. */
function Raiz({ pos, largo }) {
  return (
    <mesh position={pos}>
      <coneGeometry args={[0.05, largo, 5]} />
      <meshLambertMaterial color="#c9a86a" />
    </mesh>
  );
}

/* Una hifa: línea finísima blanca (la red de micorrizas). */
function Hifa({ pos, giro }) {
  return (
    <mesh position={pos} rotation={[0, 0, giro]}>
      <cylinderGeometry args={[0.008, 0.008, 0.5, 3]} />
      <meshBasicMaterial color="#f2ece0" />
    </mesh>
  );
}

function Diorama({ params }) {
  const vida = clamp01(params?.vida);

  const { bloques, bichos, total } = useMemo(() => {
    const capas = params?.capas || [];
    const alturaTotal = capas.reduce((s, c) => s + (c.alto || 0.6), 0) || 1;
    const bloq = [];
    const vid = [];
    const r = rng(97);
    let top = alturaTotal; // arranca por la superficie
    capas.forEach((capa, ci) => {
      const alto = capa.alto || 0.6;
      const cy = top - alto / 2;
      bloq.push({ key: `c${ci}`, cy, alto, color: capa.color || '#5a3d28' });
      // vida por capa según qué bichos declara y cuánta vida hay
      const tipos = capa.bichos || [];
      const n = Math.round(vida * 6);
      for (let i = 0; i < n; i++) {
        const tipo = tipos[i % Math.max(1, tipos.length)] || 'raiz';
        const x = (r() - 0.5) * (ANCHO - 0.6);
        const z = PROF / 2 - 0.02 - r() * 0.15; // pegados a la cara cortada (frente)
        const y = cy + (r() - 0.5) * alto * 0.6;
        vid.push({ key: `${ci}-${i}`, tipo, pos: [x, y, z], giro: r() * Math.PI, largo: 0.3 + r() * alto });
      }
      top -= alto;
    });
    return { bloques: bloq, bichos: vid, total: alturaTotal };
  }, [params, vida]);

  return (
    <group position={[0, -total / 2, 0]}>
      {/* las capas: cajas apiladas, cara frontal expuesta (el corte) */}
      {bloques.map((b) => (
        <mesh key={b.key} position={[0, b.cy, 0]}>
          <boxGeometry args={[ANCHO, b.alto, PROF]} />
          <meshLambertMaterial color={b.color} flatShading />
        </mesh>
      ))}
      {/* borde de pasto sobre la superficie */}
      <mesh position={[0, total + 0.03, 0]}>
        <boxGeometry args={[ANCHO, 0.08, PROF]} />
        <meshLambertMaterial color="#6f9a45" flatShading />
      </mesh>
      {/* la vida del suelo, tanta como diga `vida` */}
      {bichos.map((v) => {
        if (v.tipo === 'lombriz') return <Lombriz key={v.key} pos={v.pos} giro={v.giro} />;
        if (v.tipo === 'hifa') return <Hifa key={v.key} pos={v.pos} giro={v.giro} />;
        return <Raiz key={v.key} pos={[v.pos[0], v.pos[1], v.pos[2]]} largo={v.largo} />;
      })}
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
    >
      <Diorama params={props.params} />
    </EscenaBase3D>
  );
}
