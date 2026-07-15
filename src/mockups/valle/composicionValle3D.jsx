/*
 * composicionValle3D — las piezas r3f de la DIRECCIÓN del valle.
 *
 * El arte que la composición pide (direccion/composicionValle.js) hecho
 * geometría procedural, con el mismo contrato del resto del valle: cero
 * assets remotos, materiales flat/Lambert según perfil, cero alocación por
 * frame. Recibe `alturaDe(x, z)` del host (Valle3D es dueño del terreno):
 * nada de aquí importa Valle3D — sin ciclos.
 *
 *   · CasaCampesina    — el ancla del cuadro: encalada, zócalo pintado, teja,
 *                        y la ventana con luz cálida (la casa espera).
 *   · SenderosValle    — la tierra pisada que nace de la casa: el rastro del
 *                        uso diario, el ojo camina por donde caminan los pies.
 *   · PatiosLugares    — el suelo desnudo bajo cada lugar navegable: la
 *                        afordancia diegética de "aquí se llega".
 *   · SecundariosDeTierra — los vecinos del monte (el oso, el borugo…) a ras
 *                        de suelo, lejos y chicos: acompañan, no compiten.
 *                        Registro-driven: un slug ausente no monta nada.
 */
import { useMemo } from 'react';
import { Html, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { CREATURES } from '../../visual/creatures/index.js';
import {
  CASA_VALLE,
  SENDEROS_VALLE,
  PATIO,
  JERARQUIA_PERSONAJES,
  SECUNDARIOS_TIERRA,
} from '../../visual/mundo3d/direccion/composicionValle.js';

/* ── Paleta de la casa campesina (tapia encalada + zócalo + teja) ────────── */
const CASA = {
  encalado: '#f3ecdc',
  zocalo: '#a35a3c', // el zócalo pintado de las casas de vereda
  teja: '#b0603f',
  tejaSombra: '#8f4b31',
  madera: '#6b4a2e',
  ventana: '#ffd9a0',
};

/**
 * La casa campesina: ancla de composición, NO navegable (aria nada, cero
 * toques). Modesta a propósito: sostiene el cuadro sin pedir protagonismo.
 * La ventana emisiva es "la casa espera": de día apenas se nota, al
 * atardecer y de noche es el corazón cálido del valle.
 */
export function CasaCampesina({ alturaDe, perfil }) {
  const [cx, cz] = CASA_VALLE.pos;
  const y = alturaDe(cx, cz);
  const rico = perfil.materialRico;
  return (
    <group position={[cx, y, cz]} rotation={[0, CASA_VALLE.rotY, 0]}>
      {/* el zócalo pintado (la franja baja de color de toda casa de vereda) */}
      <mesh position={[0, 0.11, 0]} castShadow={perfil.sombras} receiveShadow={perfil.sombras}>
        <boxGeometry args={[1.52, 0.22, 1.06]} />
        <meshStandardMaterial color={CASA.zocalo} flatShading roughness={1} />
      </mesh>
      {/* el muro encalado */}
      <mesh position={[0, 0.52, 0]} castShadow={perfil.sombras}>
        <boxGeometry args={[1.48, 0.62, 1.02]} />
        <meshStandardMaterial color={CASA.encalado} flatShading roughness={1} />
      </mesh>
      {/* techo de teja a dos aguas (dos faldones + cumbrera) con alero */}
      <mesh position={[-0.42, 0.98, 0]} rotation={[0, 0, 0.62]} castShadow={perfil.sombras}>
        <boxGeometry args={[1.06, 0.06, 1.28]} />
        <meshStandardMaterial color={CASA.teja} flatShading roughness={1} />
      </mesh>
      <mesh position={[0.42, 0.98, 0]} rotation={[0, 0, -0.62]} castShadow={perfil.sombras}>
        <boxGeometry args={[1.06, 0.06, 1.28]} />
        <meshStandardMaterial color={CASA.tejaSombra} flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 1.24, 0]}>
        <boxGeometry args={[0.12, 0.07, 1.3]} />
        <meshStandardMaterial color={CASA.tejaSombra} flatShading roughness={1} />
      </mesh>
      {/* la puerta de madera, al frente (el lado del corredor) */}
      <mesh position={[-0.3, 0.42, 0.52]}>
        <boxGeometry args={[0.3, 0.52, 0.05]} />
        <meshStandardMaterial color={CASA.madera} flatShading roughness={1} />
      </mesh>
      {/* LA VENTANA CON LUZ: la casa espera (emisiva, cálida, chiquita) */}
      <mesh position={[0.34, 0.56, 0.52]}>
        <boxGeometry args={[0.26, 0.24, 0.04]} />
        <meshStandardMaterial
          color={CASA.ventana}
          emissive={CASA.ventana}
          emissiveIntensity={0.8}
          flatShading
        />
      </mesh>
      {/* el corredor: dos pies derechos y su tramo de techo (solo tier alto) */}
      {rico && (
        <group>
          {[-0.55, 0.55].map((dx, i) => (
            <mesh key={i} position={[dx, 0.42, 0.82]} castShadow={perfil.sombras}>
              <cylinderGeometry args={[0.035, 0.045, 0.84, 6]} />
              <meshStandardMaterial color={CASA.madera} flatShading roughness={1} />
            </mesh>
          ))}
          <mesh position={[0, 0.9, 0.78]} rotation={[0.32, 0, 0]} castShadow={perfil.sombras}>
            <boxGeometry args={[1.44, 0.05, 0.5]} />
            <meshStandardMaterial color={CASA.teja} flatShading roughness={1} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* ── Senderos: cintas de tierra pisada posadas sobre el terreno ──────────
   Un tubo enterrado a medias por sendero (queda la venita superior visible):
   1 draw call por camino, Lambert (los caminos no piden PBR). En frugal solo
   los principales (`frugal: true`), con menos segmentos. */
const MAT_SENDERO = new THREE.MeshLambertMaterial({ color: '#a8834f' });

export function SenderosValle({ alturaDe, perfil }) {
  const rico = perfil.materialRico;
  const geos = useMemo(
    () =>
      SENDEROS_VALLE.filter((s) => rico || s.frugal).map((s) => {
        const pts = s.puntos.map(([x, z]) => new THREE.Vector3(x, alturaDe(x, z) + 0.03, z));
        const curva = new THREE.CatmullRomCurve3(pts);
        // Radio corto y medio hundido: asoma la huella, no un caño.
        return new THREE.TubeGeometry(curva, s.puntos.length * (rico ? 7 : 5), 0.16, 4, false);
      }),
    [alturaDe, rico],
  );
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={MAT_SENDERO} position={[0, -0.07, 0]} />
      ))}
    </group>
  );
}

/* ── Patios de tierra pisada bajo los lugares navegables ─────────────────
   Todos en UNA InstancedMesh (1 draw call). Círculo plano apenas levantado;
   depthWrite off para no pelear con la ondulación del terreno. */
export function PatiosLugares({ mundos, alturaDe }) {
  const sitios = useMemo(
    () =>
      mundos.map((m) => ({
        x: m.pos[0],
        y: alturaDe(m.pos[0], m.pos[2]) + 0.055,
        z: m.pos[2],
        r: PATIO.radioBase * (m.escala || 1),
      })),
    [mundos, alturaDe],
  );
  return (
    <Instances limit={sitios.length}>
      <circleGeometry args={[1, 22]} />
      <meshLambertMaterial
        color={PATIO.color}
        transparent
        opacity={PATIO.opacidad}
        depthWrite={false}
      />
      {sitios.map((s, i) => (
        <Instance
          key={i}
          position={[s.x, s.y, s.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[s.r, s.r, 1]}
        />
      ))}
    </Instances>
  );
}

/* ── Secundarios de tierra: los vecinos del monte ────────────────────────
   La ley (JERARQUIA_PERSONAJES) por construcción: tamaño con techo duro,
   bordes del valle, aria-hidden, cero toques. Billboard <Html> como las
   demás criaturas del valle. Un slug que no exista en CREATURES simplemente
   no monta — el hueco del oso queda listo sin acoplar ramas. */
export function SecundariosDeTierra({ alturaDe, reducedMotion }) {
  return (
    <group>
      {SECUNDARIOS_TIERRA.map((sec, i) => {
        const reg = CREATURES[sec.slug];
        if (!reg?.Component) return null;
        const Bicho = reg.Component;
        const [x, z] = sec.punto;
        const px = Math.min(sec.px, JERARQUIA_PERSONAJES.secundarioMaxPx);
        const y = alturaDe(x, z) + 0.3;
        return (
          <group key={i} position={[x, y, z]}>
            <Html center distanceFactor={sec.factor} zIndexRange={[6, 0]} pointerEvents="none">
              <div className="valle-critter" aria-hidden="true">
                <Bicho size={px} animated={!reducedMotion} />
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
