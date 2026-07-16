/*
 * composicionValle3D — las piezas r3f de la DIRECCIÓN del valle.
 *
 * El arte que la composición pide (direccion/composicionValle.js) hecho
 * geometría procedural, con el mismo contrato del resto del valle: cero
 * assets remotos, materiales flat/Lambert según perfil, cero alocación por
 * frame. Recibe `alturaDe(x, z)` del host (Valle3D es dueño del terreno):
 * nada de aquí importa Valle3D — sin ciclos.
 *
 *   · CasaCampesina    — el corazón del cuadro Y LA PUERTA DE LOS MUNDOS
 *                        (rediseño 2026-07): la puerta iluminada invita a
 *                        tocar y abre el mapa de los 6 portales.
 *   · PorticosPortales — los pórticos de madera de los 6 portales: dos pies
 *                        derechos + dintel + farolito + tablita con el tinte
 *                        del mundo. La puerta legible de cada patio.
 *   · SenderosValle    — la tierra pisada que nace de la casa: el rastro del
 *                        uso diario, el ojo camina por donde caminan los pies.
 *   · PatiosLugares    — el suelo desnudo bajo cada lugar navegable: la
 *                        afordancia diegética de "aquí se llega".
 *   · VecinosDelValle  — los personajes en su casa del valle, registro-driven:
 *                        un slug ausente no monta nada.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { CREATURES } from '../../visual/creatures/index.js';
import {
  CASA_VALLE,
  SENDEROS_VALLE,
  PATIO,
  PORTALES_VALLE,
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
  puerta: '#ffca7a', // la luz que sale por la puerta abierta: la invitación
};

/**
 * La casa campesina: el corazón del cuadro y — rediseño 2026-07 — LA PUERTA
 * DE LOS MUNDOS. Su puerta está ABIERTA y con luz cálida adentro (la casa
 * invita), pulsa apenas como el faro del día, y tocarla abre el mapa de los
 * 6 portales (`onPuerta`). Modesta a propósito en lo demás: sostiene el
 * cuadro sin pedir espectáculo.
 */
export function CasaCampesina({ alturaDe, perfil, nocturno = false, reducedMotion = false, onPuerta = null }) {
  const [cx, cz] = CASA_VALLE.pos;
  const esc = CASA_VALLE.escala || 1;
  const y = alturaDe(cx, cz);
  const rico = perfil.materialRico;
  const puertaRef = useRef(null);
  const haloRef = useRef(null);
  // La puerta RESPIRA (brillo que sube y baja, ~0.4 Hz): la afordancia viva
  // de "toque para entrar". Con reduced-motion queda en su brillo medio.
  useFrame((state) => {
    if (reducedMotion) return;
    const p = (Math.sin(state.clock.elapsedTime * 2.4) + 1) / 2;
    if (puertaRef.current) puertaRef.current.emissiveIntensity = (nocturno ? 1.5 : 0.85) + p * 0.55;
    if (haloRef.current) haloRef.current.opacity = 0.16 + p * 0.1;
  });
  return (
    <group
      position={[cx, y, cz]}
      rotation={[0, CASA_VALLE.rotY, 0]}
      scale={esc}
      onClick={
        onPuerta
          ? (e) => {
              e.stopPropagation();
              onPuerta();
            }
          : undefined
      }
      onPointerOver={
        onPuerta
          ? (e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }
          : undefined
      }
      onPointerOut={
        onPuerta
          ? () => {
              document.body.style.cursor = '';
            }
          : undefined
      }
    >
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
      {/* EL MARCO de la puerta, de madera (la puerta está ABIERTA de par en
          par: la hoja recostada al muro) */}
      <mesh position={[-0.48, 0.44, 0.53]}>
        <boxGeometry args={[0.05, 0.56, 0.05]} />
        <meshStandardMaterial color={CASA.madera} flatShading roughness={1} />
      </mesh>
      <mesh position={[-0.12, 0.44, 0.53]}>
        <boxGeometry args={[0.05, 0.56, 0.05]} />
        <meshStandardMaterial color={CASA.madera} flatShading roughness={1} />
      </mesh>
      <mesh position={[-0.3, 0.7, 0.53]}>
        <boxGeometry args={[0.42, 0.06, 0.05]} />
        <meshStandardMaterial color={CASA.madera} flatShading roughness={1} />
      </mesh>
      {/* la hoja abierta, recostada hacia afuera */}
      <mesh position={[-0.58, 0.42, 0.58]} rotation={[0, 0.9, 0]}>
        <boxGeometry args={[0.3, 0.52, 0.04]} />
        <meshStandardMaterial color={CASA.madera} flatShading roughness={1} />
      </mesh>
      {/* LA LUZ DE LA PUERTA: el vano encendido — la entrada a los mundos.
          Pulsa apenas (useFrame de arriba): "toque para entrar". */}
      <mesh position={[-0.3, 0.42, 0.52]}>
        <boxGeometry args={[0.32, 0.52, 0.03]} />
        <meshStandardMaterial
          ref={puertaRef}
          color={CASA.puerta}
          emissive={CASA.puerta}
          emissiveIntensity={nocturno ? 1.6 : 1.0}
          flatShading
        />
      </mesh>
      {/* el charco de luz que la puerta tira sobre el corredor (afordancia) */}
      <mesh position={[-0.3, 0.045, 0.92]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 18]} />
        <meshBasicMaterial ref={haloRef} color={CASA.puerta} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      {/* LA VENTANA CON LUZ: la casa espera (emisiva, cálida, chiquita).
          De NOCHE es el FARO del valle (día-por-noche: la práctica que
          orienta). El punto de referencia para volver a casa. */}
      <mesh position={[0.34, 0.56, 0.52]}>
        <boxGeometry args={[0.26, 0.24, 0.04]} />
        <meshStandardMaterial
          color={CASA.ventana}
          emissive={CASA.ventana}
          emissiveIntensity={nocturno ? 1.8 : 0.8}
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

/* ── PÓRTICOS de los 6 portales: la puerta legible de cada patio ─────────
   Dos pies derechos de madera + dintel + FAROLITO cálido encima + la tablita
   colgada con el TINTE del mundo: se lee "por aquí se entra" sin leer nada.
   Cada pórtico mira HACIA LA CASA (de donde llega el sendero) y se para al
   borde del patio, no encima del landmark. Tocarlo entra al mundo (misma
   afordancia que el lugar). En perfil frugal los pórticos van instanciados
   (4 draw calls) y el toque lo sigue dando el landmark. */
const MAT_PORTICO = new THREE.MeshLambertMaterial({ color: '#7a5a38' });
const MAT_FAROL = new THREE.MeshStandardMaterial({
  color: '#ffd88f',
  emissive: '#ffb24d',
  emissiveIntensity: 0.9,
  flatShading: true,
});

function sitiosPorticos(mundos) {
  const [cx, cz] = CASA_VALLE.pos;
  const porId = Object.fromEntries(mundos.map((m) => [m.id, m]));
  return PORTALES_VALLE.map((p) => {
    const m = porId[p.id];
    if (!m) return null;
    const [x, , z] = m.pos;
    // Mirar hacia la casa: el pórtico recibe al que llega por el sendero.
    const rotY = Math.atan2(cx - x, cz - z);
    const esc = m.escala || 1;
    // Al borde del patio, del lado de la casa (el umbral, no el centro).
    const d = PATIO.radioBase * esc + 0.55;
    const px = x + Math.sin(rotY) * d;
    const pz = z + Math.cos(rotY) * d;
    return { portal: p, mundo: m, x: px, z: pz, rotY, tinte: m.tinte };
  }).filter(Boolean);
}

function PorticoRico({ sitio, alturaDe, onEntrar, nocturno }) {
  const y = alturaDe(sitio.x, sitio.z);
  return (
    <group
      position={[sitio.x, y, sitio.z]}
      rotation={[0, sitio.rotY, 0]}
      onClick={
        onEntrar
          ? (e) => {
              e.stopPropagation();
              onEntrar(sitio.mundo.id);
            }
          : undefined
      }
      onPointerOver={
        onEntrar
          ? (e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }
          : undefined
      }
      onPointerOut={
        onEntrar
          ? () => {
              document.body.style.cursor = '';
            }
          : undefined
      }
    >
      {/* los dos pies derechos */}
      <mesh position={[-0.62, 0.72, 0]} material={MAT_PORTICO} castShadow>
        <cylinderGeometry args={[0.055, 0.07, 1.44, 6]} />
      </mesh>
      <mesh position={[0.62, 0.72, 0]} material={MAT_PORTICO} castShadow>
        <cylinderGeometry args={[0.055, 0.07, 1.44, 6]} />
      </mesh>
      {/* el dintel, con su parcito de tejas de remate */}
      <mesh position={[0, 1.48, 0]} material={MAT_PORTICO} castShadow>
        <boxGeometry args={[1.52, 0.1, 0.14]} />
      </mesh>
      <mesh position={[0, 1.58, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.62, 0.05, 0.24]} />
        <meshLambertMaterial color="#8f4b31" />
      </mesh>
      {/* el farolito: la lucecita que dice "esta puerta está viva" */}
      <mesh position={[0, 1.72, 0]} material={MAT_FAROL}>
        <octahedronGeometry args={[0.11, 0]} />
      </mesh>
      {/* la tablita colgada con el tinte del mundo (la seña de la puerta) */}
      <mesh position={[0, 1.22, 0]}>
        <boxGeometry args={[0.56, 0.3, 0.05]} />
        <meshLambertMaterial
          color={sitio.tinte[0]}
          emissive={nocturno ? sitio.tinte[0] : '#000000'}
          emissiveIntensity={nocturno ? 0.35 : 0}
        />
      </mesh>
    </group>
  );
}

export function PorticosPortales({ mundos, alturaDe, perfil, nocturno = false, onEntrar = null }) {
  const sitios = useMemo(() => sitiosPorticos(mundos), [mundos]);
  if (perfil.materialRico) {
    return (
      <group>
        {sitios.map((s) => (
          <PorticoRico
            key={s.portal.id}
            sitio={s}
            alturaDe={alturaDe}
            onEntrar={onEntrar}
            nocturno={nocturno}
          />
        ))}
      </group>
    );
  }
  // Frugal: pies + dintel + tablita + farol en 4 Instances (4 draw calls);
  // el toque lo captura el landmark del mundo, como siempre.
  return (
    <group>
      <Instances limit={sitios.length * 2}>
        <cylinderGeometry args={[0.06, 0.07, 1.44, 5]} />
        <meshLambertMaterial color="#7a5a38" />
        {sitios.flatMap((s) => {
          const y = alturaDe(s.x, s.z);
          const c = Math.cos(s.rotY);
          const sn = Math.sin(s.rotY);
          return [-0.62, 0.62].map((dx, i) => (
            <Instance
              key={`${s.portal.id}${i}`}
              position={[s.x + c * dx, y + 0.72, s.z - sn * dx]}
            />
          ));
        })}
      </Instances>
      <Instances limit={sitios.length}>
        <boxGeometry args={[1.56, 0.1, 0.16]} />
        <meshLambertMaterial color="#7a5a38" />
        {sitios.map((s) => (
          <Instance
            key={s.portal.id}
            position={[s.x, alturaDe(s.x, s.z) + 1.48, s.z]}
            rotation={[0, s.rotY, 0]}
          />
        ))}
      </Instances>
      <Instances limit={sitios.length}>
        <boxGeometry args={[0.56, 0.3, 0.05]} />
        <meshLambertMaterial />
        {sitios.map((s) => (
          <Instance
            key={s.portal.id}
            position={[s.x, alturaDe(s.x, s.z) + 1.22, s.z]}
            rotation={[0, s.rotY, 0]}
            color={s.tinte[0]}
          />
        ))}
      </Instances>
      <Instances limit={sitios.length}>
        <octahedronGeometry args={[0.11, 0]} />
        <meshBasicMaterial color="#ffcf87" />
        {sitios.map((s) => (
          <Instance
            key={s.portal.id}
            position={[s.x, alturaDe(s.x, s.z) + 1.72, s.z]}
          />
        ))}
      </Instances>
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
        return new THREE.TubeGeometry(curva, s.puntos.length * (rico ? 7 : 5), 0.19, 4, false);
      }),
    [alturaDe, rico],
  );
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={MAT_SENDERO} position={[0, -0.08, 0]} />
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
   los personajes no pueden ser garnish de la abejita). Cada vecino vive
   en SU rincón (VECINOS_VALLE) con presencia digna, y `franjas` decide
   cuándo sale — el jaguar solo como aparecido. Billboards <Html>
   aria-hidden, cero toques (JERARQUIA_PERSONAJES): la ley sigue siendo
   presencia, no interfaz. Un slug que no exista en CREATURES simplemente
   no monta — las ramas de personajes mejoran el dibujo al mergear sin
   tocar este mapa. */
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
