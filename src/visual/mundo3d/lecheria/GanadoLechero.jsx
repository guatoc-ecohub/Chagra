/*
 * GanadoLechero — EL HATO LECHERO pastando en el potrero silvopastoril.
 *
 * REHECHO sobre la anatomía BUENA de la finca (`geomVaca`, fincaRealista.geom):
 * el torso es un loft orgánico con AO y manchas de capa HORNEADOS por vértice
 * — no la vaca de cápsulas y pelotas pegadas que este mundo tenía. Un solo
 * sistema de reses en toda la obra; lo que este mundo agrega encima es lo que
 * lo hace LECHERÍA:
 *
 *   · la UBRE como pieza VIVA — el reloj del ordeño (llena → vacía) no se
 *     puede hornear en la malla, así que aquí la ubre es suya y obedece la
 *     hora (`geomVaca({ ubre: false })` + bolsa y pezones propios);
 *   · la COLA como pieza viva — espanta moscas (`cola: false` en la fábrica);
 *   · las RAZAS DE COLOMBIA por piso térmico, con rasgos verificados
 *     (ops/BRIEF-FABLE-ANIMALES-COLOMBIANOS.md §2.1):
 *       holstein — manchas negras de borde NÍTIDO, mocha (la lechera de frío)
 *       normando — manchas caoba de borde DIFUSO y ANTEOJOS oscuros (frío)
 *       bon      — Blanco Orejinegro: blanca de OREJAS NEGRAS, patas cortas
 *                  (la criolla colombiana, ~500 años de historia)
 *       criolla  — caramelo con cuernos en lira
 *       cebu     — giba, papada y orejones caídos (el cruce del clima cálido)
 *
 * Cada vaca PASTA: baja la cabeza al pasto en un ciclo lento y propio, respira
 * y mueve la cola — vida, no espectáculo. Todo gateado por reduced-motion Y
 * device-tier ('bajo' las deja quietas y sin cola/pezones).
 *
 * PASADA NOLAN — el hato obedece EL RELOJ DEL ORDEÑO (EscenaLecheriaViva):
 *   · `llenura` — la UBRE se llena y se vacía con la hora de verdad: llena
 *     para la madrugada, vacía tras el ordeño, cargándose despacio el resto
 *     del día. La vaca es un reloj de leche — y eso enseña.
 *   · `enOrdeno` — a la hora del ordeño la primera Holstein deja el pasto y
 *     se para en el BRETE de la sala (PUESTO_ORDENO), quieta, mientras la
 *     ordeñan.
 *   · `frio` — en el aire frío del páramo (madrugada y noche) el ALIENTO se
 *     ve: soplos tibios que salen del morro y se deshacen.
 *
 * Pocas y por criterio (≈6): un hato campesino de finca, no un feedlot.
 * Componente r3f: montar dentro del <Canvas> de EscenaLecheriaViva.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { alturaPotrero, PUESTO_ORDENO } from './floraLecheria.geom.js';
import { geomVaca, RAZAS_VACA } from '../finca/fincaRealista.geom.js';

/* El material canónico del hato (mismo Lambert + vertexColors que
   valle/animales.jsx): el sombreado ya viene horneado en la geometría, y SIN
   flatShading — carne curva, no facetas. Uno solo para todas las reses. */
const MATERIAL_HATO = new THREE.MeshLambertMaterial({ vertexColors: true });

/* Las piezas vivas (ubre, cola) no traen color horneado: se les baja apenas
   el tono para que asienten junto al AO de la malla vecina. */
function tonoAsentado(hex, factor = 0.93) {
  return `#${new THREE.Color(hex).multiplyScalar(factor).getHexString()}`;
}

/**
 * UNA vaca lechera anatómica, por raza. Mira a +x.
 * `ubre` (0..1) es la llenura del reloj del ordeño; `frio` (0..1) hace
 * visible el aliento. `pastar=false` la deja plantada con la cabeza en la
 * canoa (el brete) pero VIVA: respira, colea y su aliento se ve — quieta no
 * es congelada.
 * @param {{raza:string, escala?:number, fase?:number, animar?:boolean, pastar?:boolean, fina?:boolean, ubre?:number, frio?:number, seed?:number}} p
 */
function Vaca({ raza, escala = 1, fase = 0, animar = true, pastar = true, fina = true, ubre = 0.7, frio = 0, seed = 21 }) {
  const R = RAZAS_VACA[raza] || RAZAS_VACA.holstein;
  const geom = useMemo(
    () => geomVaca({ raza, ubre: false, cola: false, q: fina ? 1 : 0.75 }, seed),
    [raza, fina, seed],
  );
  const alza = R.alza ?? 1;
  const cabeza = useRef(null);
  const cola = useRef(null);
  const cuerpo = useRef(null);
  const aliento = useRef(null);
  const conAliento = animar && frio > 0.05;
  // Colores de las piezas vivas, asentados al tono horneado de la raza.
  const tonos = useMemo(() => ({
    ubre: tonoAsentado(R.ubre),
    pelaje: tonoAsentado(R.pelaje),
    borla: tonoAsentado(R.manchas || '#3c352d'),
  }), [R]);

  useFrame(({ clock }) => {
    if (!animar) return;
    const t = clock.elapsedTime;
    // pastar: la cabeza baja al pasto en un ciclo lento (agacha, se demora
    // abajo pastando y vuelve a rumiar mirando el potrero)
    if (cabeza.current && pastar) {
      const p = 0.5 - 0.5 * Math.cos(t * 0.55 + fase);
      const agacha = p * p;
      cabeza.current.rotation.z = -0.12 - agacha * 0.62;
    }
    // respirar (el flanco sube apenas — squash & stretch sutil)
    if (cuerpo.current) cuerpo.current.scale.y = 1 + Math.sin(t * 0.9 + fase) * 0.02;
    // la cola espanta moscas
    if (cola.current) cola.current.rotation.x = Math.sin(t * 1.6 + fase) * 0.35;
    // EL ALIENTO en el frío: un soplo que sale del morro, crece y se deshace
    if (aliento.current) {
      const g = aliento.current;
      const u = (t * 0.34 + fase * 0.7) % 1; // un soplo por ciclo de respiración
      const vis = frio * Math.max(0, 1 - u * 1.5);
      g.position.set(0.5 + u * 0.3, -0.12 + u * 0.15, 0);
      const s = 0.05 + u * 0.2;
      g.scale.set(s, s * 0.75, s);
      for (let k = 0; k < g.children.length; k++) {
        g.children[k].material.opacity = vis * (k ? 0.14 : 0.26);
      }
    }
  });

  // quieta sin pastar = cabeza abajo (en el pasto o en la canoa del brete)
  const reposoCabeza = animar && pastar ? 0 : -0.48;

  return (
    <group scale={escala}>
      {/* cuerpo horneado (torso + cuello + patas + manchas de raza) — respira */}
      <group ref={cuerpo}>
        <mesh geometry={geom.cuerpo} material={MATERIAL_HATO} castShadow />

        {/* LA UBRE — la vaca es de leche, y la ubre es un RELOJ: llena antes
            del ordeño (cuelga baja y redonda), vacía después. Eso enseña. */}
        <group
          position={[-0.28, (0.545 - 0.075 * ubre) * alza, 0]}
          scale={[0.75 + 0.42 * ubre, 0.6 + 0.52 * ubre, 0.72 + 0.45 * ubre]}
        >
          <mesh scale={[1.2, 0.95, 1]}>
            <sphereGeometry args={[0.155, 11, 9]} />
            <meshLambertMaterial color={tonos.ubre} />
          </mesh>
          {/* los pezones (legibles solo en gama fina) */}
          {fina &&
            [[0.08, 0.07], [0.08, -0.07], [-0.09, 0.07], [-0.09, -0.07]].map(([px, pz], i) => (
              <mesh key={i} position={[px, -0.135, pz]}>
                <cylinderGeometry args={[0.016, 0.021, 0.09, 6]} />
                <meshLambertMaterial color={tonos.ubre} />
              </mesh>
            ))}
        </group>
      </group>

      {/* cabeza anatómica en su pivote de cuello (pasta agachándose) — trae
          horneados los rasgos de raza: los ANTEOJOS de la normando, las
          OREJAS NEGRAS del bon, los orejones caídos del cebú */}
      <group ref={cabeza} position={geom.pivote} rotation={[0, 0, reposoCabeza]}>
        <mesh geometry={geom.cabeza} material={MATERIAL_HATO} castShadow />
        {/* EL ALIENTO visible en el frío del páramo: dos soplos aditivos que
            salen del morro (viajan CON la cabeza: también pastando) */}
        {conAliento && (
          <group ref={aliento} position={[0.5, -0.12, 0]}>
            {[0, 1].map((k) => (
              <mesh key={k} position={[k * -0.35, k * 0.1, 0]}>
                <sphereGeometry args={[1, 6, 5]} />
                <meshBasicMaterial
                  color="#eef3f6"
                  transparent
                  opacity={0}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            ))}
          </group>
        )}
      </group>

      {/* cola con borla (espanta moscas) */}
      {fina && (
        <group ref={cola} position={[-0.63, 0.8 * alza, 0]}>
          <mesh position={[-0.02, -0.24, 0.01]} rotation={[0, 0, 0.12]}>
            <cylinderGeometry args={[0.015, 0.027, 0.5, 6]} />
            <meshLambertMaterial color={tonos.pelaje} />
          </mesh>
          <mesh position={[0, -0.5, 0.02]}>
            <coneGeometry args={[0.032, 0.11, 6]} />
            <meshLambertMaterial color={tonos.borla} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* El hato de la finca: un puñado de vacas, la mezcla real de un potrero
   campesino andino POR RAZA — las mejoradas de frío (holstein, normando), las
   criollas colombianas (bon, criolla) y el cruce con cebú. Cada una con su
   semilla: ningún hato tiene clones. La PRIMERA debe ser holstein: es la que
   va al brete a la hora del ordeño. */
const HATO = [
  { raza: 'holstein', p: [-5.5, -3.2], giro: 2.4, escala: 1.28, fase: 0.0, seed: 21 },
  { raza: 'normando', p: [-8.2, -5.6], giro: 1.1, escala: 1.26, fase: 1.3, seed: 61 },
  { raza: 'bon', p: [-2.4, -6.0], giro: 3.5, escala: 1.18, fase: 2.1, seed: 62 },
  { raza: 'cebu', p: [-9.6, -2.2], giro: 0.5, escala: 1.32, fase: 0.7, seed: 63 },
  { raza: 'holstein', p: [0.6, -4.2], giro: 4.0, escala: 1.22, fase: 2.8, seed: 64 },
  { raza: 'criolla', p: [-4.6, -7.4], giro: 2.0, escala: 1.14, fase: 1.7, seed: 65 },
];

/**
 * El hato lechero pastando — y a la hora del ordeño, la primera Holstein en
 * el brete de la sala. `llenura`, `enOrdeno` y `frio` vienen del reloj del
 * ordeño de la escena (hora continua del valle).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, llenura?: number, enOrdeno?: number, frio?: number}} props
 */
export default function GanadoLechero({
  tier = 'alto',
  reducedMotion = false,
  llenura = 0.7,
  enOrdeno = 0,
  frio = 0,
}) {
  const animar = !reducedMotion && tier !== 'bajo';
  const fina = tier !== 'bajo';
  // gama baja: un hato más corto (siluetas legibles, sin pagar de más)
  const hato = tier === 'bajo' ? HATO.slice(0, 4) : HATO;

  return (
    <group>
      {hato.map((v, i) => {
        // a la hora del ordeño, la primera Holstein deja el pasto y espera en
        // el brete, quieta, con la ubre llena (la están ordeñando)
        const alBrete = i === 0 && enOrdeno > 0.35;
        const px = alBrete ? PUESTO_ORDENO.pos[0] : v.p[0];
        const pz = alBrete ? PUESTO_ORDENO.pos[1] : v.p[1];
        const giro = alBrete ? PUESTO_ORDENO.giro : v.giro;
        // cada vaca con su llenura apenas distinta (ningún hato es parejo)
        const ubre = alBrete
          ? Math.max(llenura, 0.85)
          : Math.min(1, Math.max(0.1, llenura + ((i % 3) - 1) * 0.07));
        // jitter determinista por instancia: dos reses jamás son clones
        const j = (k) => Math.sin(v.fase * 12.9898 + k * 78.233) * 0.5;
        return (
          <group
            key={i}
            position={[px, alturaPotrero(px, pz), pz]}
            rotation={[j(4) * 0.03, giro, j(5) * 0.03]}
          >
            <Vaca
              raza={v.raza}
              escala={v.escala * (1 + j(1) * 0.06)}
              fase={v.fase}
              animar={animar}
              pastar={!alBrete}
              fina={fina}
              ubre={ubre}
              frio={frio}
              seed={v.seed}
            />
          </group>
        );
      })}
    </group>
  );
}
