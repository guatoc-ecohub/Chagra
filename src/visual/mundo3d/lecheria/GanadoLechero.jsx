/*
 * GanadoLechero — EL HATO LECHERO pastando en el potrero silvopastoril.
 *
 * Estiliza la silueta de VACA ya validada del corral de la finca (CorralVivo:
 * cuerpo capsular, cabeza con hocico, orejas, cuernos, cola y cuatro patas) y le
 * suma lo que la vuelve LECHERA y la cuenta por piso térmico (grounded en el DR
 * de la cadena láctea):
 *
 *   · la UBRE — la señal inequívoca de la vaca de leche, bajo el vientre atrás;
 *   · las RAZAS por piso: Holstein y Normando (la vaca mejorada del clima FRÍO),
 *     la CRIOLLA baya y el CRUCE CON CEBÚ (giba + papada, la del clima CÁLIDO).
 *
 * Cada vaca PASTA: baja la cabeza al pasto en un ciclo lento y propio, respira y
 * mueve la cola — vida, no espectáculo. Todo gateado por reduced-motion Y
 * device-tier ('bajo' las deja quietas y sin cuernos/cola fina).
 *
 * PASADA NOLAN — el hato obedece EL RELOJ DEL ORDEÑO (EscenaLecheriaViva):
 *   · `llenura` — la UBRE se llena y se vacía con la hora de verdad: llena
 *     para la madrugada, vacía tras el ordeño, cargándose despacio el resto
 *     del día. La vaca es un reloj de leche — y eso enseña.
 *   · `enOrdeno` — a la hora del ordeño la primera Holstein deja el pasto y
 *     se para en el BRETE de la sala (PUESTO_ORDENO), quieta, comiendo su
 *     concentrado mientras la ordeñan.
 *   · `frio` — en el aire frío del páramo (madrugada y noche) el ALIENTO se
 *     ve: soplos tibios que salen del hocico y se deshacen.
 *
 * Pocas y por criterio (≈6): un hato campesino de finca, no un feedlot.
 * Componente r3f: montar dentro del <Canvas> de EscenaLecheriaViva.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { alturaPotrero, PUESTO_ORDENO } from './floraLecheria.geom.js';

/* ── Pelajes por raza (grounded en las razas del DR por piso térmico) ─────── */
const RAZAS = {
  holstein: { cuerpo: '#f2ede2', mancha: '#2a241c', cuernos: false, giba: false, manchada: true },
  normando: { cuerpo: '#e9ddc6', mancha: '#8a5a3c', cuernos: true, giba: false, manchada: true },
  criolla: { cuerpo: '#c08a52', mancha: '#9a6a3c', cuernos: true, giba: false, manchada: false },
  cebu: { cuerpo: '#d0c9bb', mancha: '#b6ad9c', cuernos: true, giba: true, manchada: false },
};
const HOCICO = '#7a5c50';
const HUESO = '#d8cba8';
const PEZUNA = '#4a3a30';
const UBRE = '#e7b6a6';

/* Manchas deterministas sobre el lomo/flancos (Holstein/Normando). */
function manchasDe(fase) {
  const s = (k) => (Math.sin((fase + 1) * k) * 43758.5453) % 1;
  const puntos = [];
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(s(12.9 + i * 3.1));
    const b = Math.abs(s(78.2 + i * 5.7));
    puntos.push({
      pos: [-0.28 + a * 0.62, 0.56 + (b - 0.5) * 0.24, (Math.abs(s(3.3 + i)) - 0.5) * 0.42],
      r: 0.12 + Math.abs(s(9.1 + i)) * 0.1,
    });
  }
  return puntos;
}

/**
 * UNA vaca lechera, estilizada de la silueta del corral. Mira a +x.
 * `ubre` (0..1) es la llenura del reloj del ordeño; `frio` (0..1) hace
 * visible el aliento; `aliento` gatea el montaje de los soplos (solo si la
 * escena anima y hace frío — el vaho quieto no existe).
 * `pastar=false` la deja plantada con la cabeza en la canoa (el brete) pero
 * VIVA: respira, mueve la cola y su aliento se ve — quieta no es congelada.
 * @param {{raza:string, escala?:number, fase?:number, animar?:boolean, pastar?:boolean, fina?:boolean, ubre?:number, frio?:number}} p
 */
function Vaca({ raza, escala = 1, fase = 0, animar = true, pastar = true, fina = true, ubre = 0.7, frio = 0 }) {
  const pelaje = RAZAS[raza] || RAZAS.criolla;
  const cabeza = useRef(null);
  const cola = useRef(null);
  const cuerpo = useRef(null);
  const aliento = useRef(null);
  const manchas = useMemo(() => (pelaje.manchada ? manchasDe(fase) : []), [pelaje.manchada, fase]);
  const conAliento = animar && frio > 0.05;

  useFrame(({ clock }) => {
    if (!animar) return;
    const t = clock.elapsedTime;
    // pastar: la cabeza baja al pasto en un ciclo lento (agacha y vuelve a mirar)
    if (cabeza.current && pastar) {
      const p = 0.5 - 0.5 * Math.cos(t * 0.55 + fase); // 0 arriba, 1 abajo
      const agacha = p * p; // se demora abajo pastando
      cabeza.current.rotation.z = -agacha * 0.95;
    }
    // respirar (el flanco sube apenas)
    if (cuerpo.current) cuerpo.current.scale.y = 1 + Math.sin(t * 0.9 + fase) * 0.02;
    // la cola espanta moscas
    if (cola.current) cola.current.rotation.x = Math.sin(t * 1.6 + fase) * 0.35;
    // EL ALIENTO en el frío: un soplo que sale del hocico, crece y se deshace
    if (aliento.current) {
      const g = aliento.current;
      const u = (t * 0.34 + fase * 0.7) % 1; // un soplo por ciclo de respiración
      const vis = frio * Math.max(0, 1 - u * 1.5);
      g.position.set(0.54 + u * 0.32, -0.04 + u * 0.17, 0);
      const s = 0.05 + u * 0.2;
      g.scale.set(s, s * 0.75, s);
      for (let k = 0; k < g.children.length; k++) {
        g.children[k].material.opacity = vis * (k ? 0.14 : 0.26);
      }
    }
  });

  // quieta sin pastar = cabeza abajo (en el pasto o en la canoa del brete)
  const reposoCabeza = animar && pastar ? 0 : -0.5;

  return (
    <group scale={escala}>
      {/* patas (siempre plantadas) */}
      {[[0.3, 0.16], [0.3, -0.16], [-0.3, 0.16], [-0.3, -0.16]].map((q, i) => (
        <group key={i} position={[q[0], 0, q[1]]}>
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.052, 0.046, 0.48, 6]} />
            <meshLambertMaterial color={pelaje.cuerpo} flatShading />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.055, 0.05, 0.06, 6]} />
            <meshLambertMaterial color={PEZUNA} flatShading />
          </mesh>
        </group>
      ))}

      {/* cuerpo (capsular, respira) */}
      <group ref={cuerpo}>
        <mesh position={[0, 0.56, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.26, 0.5, 4, 10]} />
          <meshLambertMaterial color={pelaje.cuerpo} flatShading />
        </mesh>

        {/* la giba del cebú (el cruce del clima cálido) */}
        {pelaje.giba && (
          <mesh position={[0.16, 0.78, 0]} scale={[0.9, 1, 0.8]}>
            <sphereGeometry args={[0.17, 10, 8]} />
            <meshLambertMaterial color={pelaje.mancha} flatShading />
          </mesh>
        )}

        {/* manchas de la Holstein / Normando (sobre el lomo y flancos) */}
        {manchas.map((m, i) => (
          <mesh key={i} position={m.pos} scale={[1, 0.55, 0.9]}>
            <sphereGeometry args={[m.r, 8, 6]} />
            <meshLambertMaterial color={pelaje.mancha} flatShading />
          </mesh>
        ))}

        {/* LA UBRE — la vaca es de leche, y la ubre es un RELOJ: llena antes
            del ordeño (cuelga baja y redonda), vacía después. Eso enseña. */}
        <group
          position={[-0.16, 0.36 - 0.06 * ubre, 0]}
          scale={[0.72 + 0.48 * ubre, 0.58 + 0.52 * ubre, 0.78 + 0.55 * ubre]}
        >
          <mesh>
            <sphereGeometry args={[0.13, 10, 8]} />
            <meshLambertMaterial color={UBRE} flatShading />
          </mesh>
          {/* los pezones (legibles solo en gama fina) */}
          {fina &&
            [[0.05, 0.05], [-0.04, -0.05]].map(([px, pz], i) => (
              <mesh key={i} position={[px, -0.115, pz]}>
                <cylinderGeometry args={[0.014, 0.018, 0.06, 5]} />
                <meshLambertMaterial color={UBRE} flatShading />
              </mesh>
            ))}
        </group>
      </group>

      {/* cabeza + cuello (pivote en la base del cuello: pasta agachándose) */}
      <group ref={cabeza} position={[0.34, 0.54, 0]} rotation={[0, 0, reposoCabeza]}>
        {/* cuello */}
        <mesh position={[0.12, 0.04, 0]} rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[0.12, 0.16, 0.34, 7]} />
          <meshLambertMaterial color={pelaje.cuerpo} flatShading />
        </mesh>
        {/* la papada del cebú */}
        {pelaje.giba && (
          <mesh position={[0.18, -0.14, 0]} rotation={[0, 0, 0.3]} scale={[1, 1.4, 0.5]}>
            <coneGeometry args={[0.1, 0.34, 6]} />
            <meshLambertMaterial color={pelaje.cuerpo} flatShading />
          </mesh>
        )}
        {/* cráneo */}
        <mesh position={[0.3, 0.05, 0]}>
          <sphereGeometry args={[0.16, 10, 8]} />
          <meshLambertMaterial color={pelaje.cuerpo} flatShading />
        </mesh>
        {/* hocico */}
        <mesh position={[0.44, -0.02, 0]} scale={[1, 0.85, 0.9]}>
          <sphereGeometry args={[0.1, 9, 7]} />
          <meshLambertMaterial color={HOCICO} flatShading />
        </mesh>
        {/* orejas */}
        {fina &&
          [0.15, -0.15].map((z) => (
            <mesh key={z} position={[0.24, 0.14, z]} rotation={[z > 0 ? 0.6 : -0.6, 0, 0.4]}>
              <coneGeometry args={[0.055, 0.16, 5]} />
              <meshLambertMaterial color={pelaje.cuerpo} flatShading />
            </mesh>
          ))}
        {/* cuernos (criolla / normando / cebú) */}
        {fina &&
          pelaje.cuernos &&
          [0.08, -0.08].map((z) => (
            <mesh key={z} position={[0.32, 0.16, z]} rotation={[z > 0 ? 0.5 : -0.5, 0, -0.5]}>
              <coneGeometry args={[0.032, 0.16, 5]} />
              <meshLambertMaterial color={HUESO} flatShading />
            </mesh>
          ))}
        {/* EL ALIENTO visible en el frío del páramo: dos soplos aditivos que
            salen del hocico (viajan CON la cabeza: también pastando) */}
        {conAliento && (
          <group ref={aliento} position={[0.54, -0.04, 0]}>
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

      {/* cola (espanta moscas) */}
      {fina && (
        <group ref={cola} position={[-0.5, 0.5, 0]}>
          <mesh position={[0, -0.22, 0]} rotation={[0, 0, 0.15]}>
            <cylinderGeometry args={[0.018, 0.028, 0.5, 5]} />
            <meshLambertMaterial color={pelaje.cuerpo} flatShading />
          </mesh>
          <mesh position={[0.02, -0.46, 0]}>
            <sphereGeometry args={[0.05, 7, 6]} />
            <meshLambertMaterial color={pelaje.mancha} flatShading />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* El hato de la finca: un puñado de vacas, la mezcla real de un potrero
   campesino (la mejorada de leche + la criolla + el cruce con cebú). Posiciones
   sobre el potrero (centro-izquierda, donde también quedan las boñigas). */
const HATO = [
  { raza: 'holstein', p: [-5.5, -3.2], giro: 2.4, escala: 1.7, fase: 0.0 },
  { raza: 'normando', p: [-8.2, -5.6], giro: 1.1, escala: 1.65, fase: 1.3 },
  { raza: 'criolla', p: [-2.4, -6.0], giro: 3.5, escala: 1.55, fase: 2.1 },
  { raza: 'cebu', p: [-9.6, -2.2], giro: 0.5, escala: 1.75, fase: 0.7 },
  { raza: 'holstein', p: [0.6, -4.2], giro: 4.0, escala: 1.6, fase: 2.8 },
  { raza: 'criolla', p: [-4.6, -7.4], giro: 2.0, escala: 1.5, fase: 1.7 },
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
        return (
          <group key={i} position={[px, alturaPotrero(px, pz), pz]} rotation={[0, giro, 0]}>
            <Vaca
              raza={v.raza}
              escala={v.escala}
              fase={v.fase}
              animar={animar}
              pastar={!alBrete}
              fina={fina}
              ubre={ubre}
              frio={frio}
            />
          </group>
        );
      })}
    </group>
  );
}
