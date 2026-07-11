/*
 * EscenaRecinto — ARQUETIPO `recinto`: el CORRAL y su ciclo cerrado.
 *
 * El corral es un LUGAR reconocible, y el ciclo (animal → estiércol → suelo →
 * planta → animal) es una FORMA que se camina: un anillo espacial. Aquí: un piso
 * circular cercado, el aro de "ciclo" (torus) que ancla la idea de cerrar el
 * ciclo del abono, y el HATO como ESPEJO del dato (auditoría FASE 1 §5a+§5c):
 * `params.animales = [{especie, nombre, raza, tamano, estado}]` se dibuja en
 * CorralVivo — InstancedMesh por especie, tamaño como escala, raza como pelaje,
 * cartel de madera con el nombre (anti-colisión) y estado visible (preñada /
 * vendido). Retrocompat: el formato viejo {tipo, color, pos} sigue dibujándose.
 * `MeshLambert`/`Basic`, sin sombras; idle gateado por reduced-motion + tier.
 */
import { useMemo } from 'react';
import EscenaBase3D from './EscenaBase3D.jsx';
import CorralVivo from './CorralVivo.jsx';
import { Fauna } from './FaunaEscena.jsx';
import { faunaDeMundo } from '../faunaFuncional.js';
import { CIELOS, PALETA } from '../atmosferaMadre.js';

/* La fauna funcional del corral (un DESCOMPONEDOR insignia —el escarabajo
   estercolero que procesa el estiércol y cierra el ciclo del abono— más
   POLINIZADORES por la cerca) vive en faunaFuncional.js, poblada por mundo. */

/* Fallback si el mundo no trae hato (retrocompat con el recinto original):
   pocos animales en formato viejo — prueba viva de que el camino legado vive. */
const HATO_LEGADO = [
  { tipo: 'vaca', color: '#c9a06a', pos: [-1.05, 0, -0.4] },
  { tipo: 'gallina', color: '#e7d9c2', pos: [1.1, 0, 0.5] },
  { tipo: 'gallina', color: '#d8b58a', pos: [0.7, 0, 1.05] },
  { tipo: 'oveja', color: '#efe7d8', pos: [-0.35, 0, 1.15] },
];

function Diorama({ params, reducedMotion, tier, fauna }) {
  const animales = params?.animales || HATO_LEGADO;
  const postes = useMemo(() => {
    const n = 12;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return /** @type {[number, number, number]} */ ([Math.cos(a) * 1.9, 0.2, Math.sin(a) * 1.9]);
    });
  }, []);
  return (
    <group>
      {/* piso del corral */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2, 28]} />
        <meshLambertMaterial color={PALETA.maderaClara} />
      </mesh>
      {/* la cerca: postes en anillo */}
      {postes.map((p, i) => (
        <mesh key={i} position={p}>
          <cylinderGeometry args={[0.05, 0.06, 0.5, 5]} />
          <meshLambertMaterial color={PALETA.tierraClara} flatShading />
        </mesh>
      ))}
      {/* el aro del CICLO cerrado (abono que vuelve) */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.25, 0.05, 8, 40]} />
        <meshBasicMaterial color={PALETA.follajeClaro} transparent opacity={0.7} />
      </mesh>
      {/* pila de estiércol/abono al centro (cierre del ciclo) */}
      <mesh position={[0, 0.14, 0]}>
        <coneGeometry args={[0.4, 0.28, 10]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
      {/* el hato: espejo del dato — instanciado, con nombre y estado */}
      <CorralVivo animales={animales} reducedMotion={reducedMotion} tier={tier} />
      {/* la fauna funcional: descomponedor en el abono + polinizadores por la cerca */}
      <Fauna items={fauna} reducedMotion={reducedMotion} />
    </group>
  );
}

export default function EscenaRecinto(props) {
  const cielo = CIELOS.corral;
  const fauna = faunaDeMundo(props.mundoId, { tier: props.tier });
  return (
    <EscenaBase3D {...props} cielo={cielo} entrada={{ ...props.entrada, centro: [0, 0.4, 0] }}>
      <Diorama
        params={props.params}
        reducedMotion={props.reducedMotion}
        tier={props.tier}
        fauna={fauna}
      />
    </EscenaBase3D>
  );
}
