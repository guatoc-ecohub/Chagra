/*
 * CasaBeneficio — la casa campesina con su BENEFICIADERO, la pieza que corona
 * el cafetal: paredes encaladas, techo de teja, y al lado la marquesina — la
 * cama elevada bajo plástico donde el café pergamino se seca al sol. Con los
 * canastos de cosecha esperando en el patio.
 *
 * Vivía privada dentro de EscenaCafetalVivo; ahora es pieza compartida — la
 * monta también el arquetipo `cafe` del framework (EscenaCafe). Primitivas
 * Lambert, cero texturas: el contrato austero de los mundos.
 *
 * Componente r3f: montar dentro de un <Canvas>.
 */
import * as THREE from 'three';
import {
  mezclar,
  TIERRAS,
  CASA,
  ACENTOS,
  NIEBLAS,
  PALETA,
} from '../paleta/index.js';

export default function CasaBeneficio({ pos }) {
  return (
    <group position={pos} rotation={[0, -0.35, 0]}>
      {/* la casa: LA casa campesina de la paleta madre (la misma del valle) */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.6, 1.44, 1.9]} />
        <meshLambertMaterial color={CASA.encalado} flatShading />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[2.64, 0.36, 1.94]} />
        <meshLambertMaterial color={CASA.zocalo} flatShading />
      </mesh>
      {/* la puerta y una ventana (la carpintería pintada de la casa) */}
      <mesh position={[0.5, 0.62, 0.96]}>
        <boxGeometry args={[0.44, 0.95, 0.06]} />
        <meshLambertMaterial color={CASA.carpinteria} flatShading />
      </mesh>
      <mesh position={[-0.6, 0.86, 0.96]}>
        <boxGeometry args={[0.5, 0.44, 0.06]} />
        <meshLambertMaterial color={CASA.carpinteria} flatShading />
      </mesh>
      {/* techo a dos aguas de teja */}
      <mesh position={[0, 1.62, -0.62]} rotation={[-0.62, 0, 0]}>
        <boxGeometry args={[3.0, 0.08, 1.5]} />
        <meshLambertMaterial color={CASA.tejaSombra} flatShading />
      </mesh>
      <mesh position={[0, 1.62, 0.62]} rotation={[0.62, 0, 0]}>
        <boxGeometry args={[3.0, 0.08, 1.5]} />
        <meshLambertMaterial color={CASA.teja} flatShading />
      </mesh>

      {/* la MARQUESINA de secado, al lado: patas + cama de pergamino + techo
          translúcido a dos aguas (la señal del beneficio) */}
      <group position={[2.6, 0, 0.4]}>
        {[[-1.0, -0.55], [1.0, -0.55], [-1.0, 0.55], [1.0, 0.55]].map((q, i) => (
          <mesh key={i} position={[q[0], 0.35, q[1]]}>
            <boxGeometry args={[0.09, 0.7, 0.09]} />
            <meshLambertMaterial color={mezclar(PALETA.madera, PALETA.maderaOscura, 0.5)} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0.72, 0]}>
          <boxGeometry args={[2.2, 0.07, 1.3]} />
          <meshLambertMaterial color={PALETA.maderaClara} flatShading />
        </mesh>
        {/* el café pergamino extendido secándose al sol */}
        <mesh position={[0, 0.77, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.0, 1.1]} />
          <meshLambertMaterial color={mezclar(TIERRAS.arenaOrilla, TIERRAS.camino, 0.2)} flatShading />
        </mesh>
        {[[-1.05, -0.62], [1.05, -0.62], [-1.05, 0.62], [1.05, 0.62]].map((q, i) => (
          <mesh key={`p${i}`} position={[q[0], 1.15, q[1]]}>
            <boxGeometry args={[0.06, 0.85, 0.06]} />
            <meshLambertMaterial color={mezclar(PALETA.madera, PALETA.maderaOscura, 0.5)} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 1.62, -0.36]} rotation={[-0.5, 0, 0]}>
          <planeGeometry args={[2.4, 0.95]} />
          <meshBasicMaterial color={NIEBLAS.lechosa} transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 1.62, 0.36]} rotation={[0.5, 0, 0]}>
          <planeGeometry args={[2.4, 0.95]} />
          <meshBasicMaterial color={NIEBLAS.lechosa} transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* dos canastos de cosecha esperando en el patio */}
      {[[-1.8, 0.6], [-1.35, 0.9]].map((q, i) => (
        <group key={`c${i}`} position={[q[0], 0, q[1]]}>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.24, 0.17, 0.36, 9, 1, true]} />
            <meshLambertMaterial color={CASA.bejuco} flatShading side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.36, 0]} scale={[1, 0.4, 1]}>
            <sphereGeometry args={[0.2, 8, 5]} />
            <meshLambertMaterial color={ACENTOS.cafeCereza} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}
