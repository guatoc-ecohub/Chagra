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
  VECINOS_VALLE,
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
export function CasaCampesina({ alturaDe, perfil, nocturno = false, onCasa = null }) {
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
      {/* LA VENTANA CON LUZ: la casa espera (emisiva, cálida, chiquita).
          De NOCHE es el FARO del valle (día-por-noche: la práctica que
          orienta): brilla más fuerte, tira un charco cálido sobre la tierra
          del corredor, y — solo donde el perfil paga luces — una pointLight
          ámbar baña la fachada. El punto de referencia para volver a casa. */}
      <mesh position={[0.34, 0.56, 0.52]}>
        <boxGeometry args={[0.26, 0.24, 0.04]} />
        <meshStandardMaterial
          color={CASA.ventana}
          emissive={CASA.ventana}
          emissiveIntensity={nocturno ? 1.9 : 1.35}
          flatShading
        />
      </mesh>
      {nocturno && (
        <>
          {/* el charco de luz de la ventana (todos los tiers: es un disco) */}
          <mesh position={[0.4, 0.05, 0.95]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.85, 20]} />
            <meshBasicMaterial
              color={CASA.ventana}
              transparent
              opacity={0.2}
              depthWrite={false}
            />
          </mesh>
          {perfil.luzBeacon && (
            <pointLight
              color={CASA.ventana}
              intensity={1.1}
              distance={5.2}
              position={[0.38, 0.7, 0.9]}
            />
          )}
        </>
      )}
      {/* LA CASA ALUMBRA + ES PORTAL AL MIRADOR (la "ventana de los mundos",
          wire3DNav casa→vitrina_maestra, fix del operador): glow cálido siempre
          encendido (día y noche) + un botón táctil que abre la vitrina. */}
      <mesh position={[0.34, 0.56, 0.55]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color="#ffe6b0" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <mesh position={[0.34, 0.56, 0.56]}>
        <sphereGeometry args={[0.66, 16, 16]} />
        <meshBasicMaterial color="#ffd89a" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <pointLight color="#ffcf87" intensity={perfil.luzBeacon ? 2.0 : 1.1} distance={6} position={[0.38, 0.78, 0.9]} />
      {onCasa && (
        <Html center position={[0, 1.72, 0]} zIndexRange={[26, 0]}>
          <button
            type="button"
            className="valle-poi v3d-poi valle-poi--casa"
            onClick={(e) => {
              e.stopPropagation();
              onCasa();
            }}
            aria-label="Entrar a la ventana de los mundos — el mirador de la finca"
          >
            <span className="valle-poi__emoji" aria-hidden="true">🏠</span>
            <span className="valle-poi__txt">Los mundos</span>
          </button>
        </Html>
      )}
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
export function PatiosLugares({ mundos, alturaDe, nocturno = false }) {
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
      {/* De noche la tierra pisada AGARRA la luna (emisivo leve): los claros
          se leen como lugares a los que se llega, no como huecos negros. */}
      <meshLambertMaterial
        color={nocturno ? '#8a9bb8' : PATIO.color}
        emissive={nocturno ? '#1b2940' : '#000000'}
        transparent
        opacity={nocturno ? 0.26 : PATIO.opacidad}
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

/* ── Los VECINOS del valle: los personajes en su casa ────────────────────
   La puesta en escena de los personajes rubber-hose (feedback del operador:
   el oso y los demás no pueden ser garnish de la abejita). Cada vecino vive
   en SU rincón (VECINOS_VALLE) con presencia digna, y `franjas` decide
   cuándo sale — el borugo al caer el sol, el jaguar solo como aparecido.
   Billboards <Html> aria-hidden, cero toques (JERARQUIA_PERSONAJES): la ley
   sigue siendo presencia, no interfaz. Un slug que no exista en CREATURES
   simplemente no monta — las ramas de personajes mejoran el dibujo al
   mergear sin tocar este mapa. */
export function VecinosDelValle({ alturaDe, reducedMotion, franja = null }) {
  return (
    <group>
      {VECINOS_VALLE.map((vec, i) => {
        const reg = CREATURES[vec.slug];
        if (!reg?.Component) return null;
        // La franja decide quién está afuera (null = vive a toda hora).
        if (vec.franjas && franja && !vec.franjas.includes(franja)) return null;
        const Bicho = reg.Component;
        const [x, z] = vec.punto;
        const px = Math.min(vec.px, JERARQUIA_PERSONAJES.vecinoMaxPx);
        const y = alturaDe(x, z) + (vec.dy ?? 0.3);
        return (
          <group key={i} position={[x, y, z]}>
            <Html center distanceFactor={vec.factor} zIndexRange={[6, 0]} pointerEvents="none">
              <div className="valle-critter" data-vecino={vec.slug} aria-hidden="true">
                <Bicho size={px} animated={!reducedMotion} />
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
