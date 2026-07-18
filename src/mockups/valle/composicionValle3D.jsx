/*
 * composicionValle3D — las piezas r3f de la DIRECCIÓN del valle.
 *
 * El arte que la composición pide (direccion/composicionValle.js) hecho
 * geometría procedural, con el mismo contrato del resto del valle: cero
 * assets remotos, materiales flat/Lambert según perfil, cero alocación por
 * frame. Recibe `alturaDe(x, z)` del host (Valle3D es dueño del terreno):
 * nada de aquí importa Valle3D — sin ciclos.
 *
 *   · CasaCampesina    — el corazón del cuadro y la VÍA SECUNDARIA: la
 *                        puerta iluminada invita a tocar y lleva a la
 *                        ventana-puerta de los mundos (el host decide a
 *                        dónde). La entrada PRINCIPAL son los portales.
 *   · VentanasVivas    — los 6 portales PRINCIPALES como PAISAJES: la
 *                        VIÑETA 3D en miniatura del mundo de destino (el
 *                        potrero con sus animalitos, la milpa, el puesto del
 *                        mercado…) sobre un UMBRAL DE LUZ a ras de suelo.
 *                        CERO discos-espejo (fix del operador 2026-07-16) y
 *                        CERO aros de follaje que tapen la entrada (fix del
 *                        operador 2026-07-18: la entrada se dice con luz).
 *   · PorticosSecundarios — los pórticos de madera SOLO para los lugares
 *                        secundarios de menos uso (eras, huerta, vivero…).
 *   · (VistaParamoEnt ARCHIVADA 2026-07-18: el Ent-queñua del filo se veía
 *                        amontonado en la vista del valle — ver
 *                        _archivo/vistaParamo.archivado.jsx. El portal REAL
 *                        al páramo sigue en valleData.js LUGARES id:'paramo'.)
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
/* El OSO NEGRO biopunk del GuardianEspiritu (decisión del operador: este es
   EL oso del valle — cuerpo casi negro, contorno neón teal, anteojos crema;
   el rubber-hose café quedó retirado). SVG puro: billboard barato. */
import { GuardianAvatar } from '../../components/dashboard/GuardianEspiritu.jsx';
import {
  CASA_VALLE,
  SENDEROS_VALLE,
  PATIO,
  PORTALES_VALLE,
  PORTICOS_SECUNDARIOS,
  JERARQUIA_PERSONAJES,
  VECINOS_VALLE,
} from '../../visual/mundo3d/direccion/composicionValle.js';

/* Cursor-mano compartido por todo lo tocable de la composición. */
const alApuntar = (e) => {
  e.stopPropagation();
  document.body.style.cursor = 'pointer';
};
const alSoltar = () => {
  document.body.style.cursor = '';
};

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
 * La casa campesina: el corazón del cuadro y la VÍA SECUNDARIA a los mundos.
 * Su puerta está ABIERTA y con luz cálida adentro (la casa invita), pulsa
 * apenas como el faro del día, y tocarla lleva a la ventana-puerta de los
 * mundos (`onPuerta`; el host decide el destino). El acceso PRINCIPAL a cada
 * mundo son sus portales-paisaje, tocados directo en el valle. Modesta a
 * propósito en lo demás: sostiene el cuadro sin pedir espectáculo.
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
      onPointerOver={onPuerta ? alApuntar : undefined}
      onPointerOut={onPuerta ? alSoltar : undefined}
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
          orienta): brilla más fuerte, tira un charco cálido sobre la tierra
          del corredor, y — solo donde el perfil paga luces — una pointLight
          ámbar baña la fachada. El punto de referencia para volver a casa. */}
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

/* ── VENTANAS VIVAS: los 6 portales principales ──────────────────────────
   Jerarquía del operador (2026-07-16): los portales grandes (mis matas ·
   mis animales · el tiempo · vender · aprender · toda mi finca) son
   NOTORIOS e inmersivos — y son PAISAJES, no espejos (fix del operador
   2026-07-16: CERO discos translúcidos).

   REDISEÑO 2026-07-18 (fix del operador): los AROS verticales de follaje
   que envolvían cada viñeta TAPABAN la entrada — bloqueaban la vista del
   potrero, la milpa, el puesto… Se retiraron. Ahora cada portal es su
   VIÑETA 3D protagonista (el mundo de destino en miniatura, más grande)
   sobre un UMBRAL DE LUZ: un halo del tinte del mundo a ras de suelo que
   respira como la puerta de la casa, y dos faroles bajos de vara
   flanqueando el paso. El ojo sabe "aquí se entra" por la LUZ, no por un
   aro que estorba. Tocar el umbral ENTRA, igual que el lugar.

   Técnica Android-barata (tier-safe): viñetas low-poly horneadas a mano —
   primitivas + materiales Lambert COMPARTIDOS a nivel de módulo (6 viñetas
   no pagan 6 shaders), cero texturas, cero render-targets, cero pointLights
   por portal (emisivo + discos meshBasic), cero alocación por frame. */

/* La paleta compartida de las viñetas: UN material por color en todo el
   frente de portales. */
const VIN = {
  tierra: new THREE.MeshLambertMaterial({ color: '#6d4f30' }),
  pasto: new THREE.MeshLambertMaterial({ color: '#5c8a44' }),
  madera: new THREE.MeshLambertMaterial({ color: '#7a5a38' }),
  hoja: new THREE.MeshLambertMaterial({ color: '#3f7a45' }),
  hojaClara: new THREE.MeshLambertMaterial({ color: '#5f9c50' }),
  maiz: new THREE.MeshLambertMaterial({ color: '#8fae4a' }),
  paja: new THREE.MeshLambertMaterial({ color: '#c9a95c' }),
  crema: new THREE.MeshLambertMaterial({ color: '#f3ecdc' }),
  nube: new THREE.MeshLambertMaterial({ color: '#f7f4ec' }),
  teja: new THREE.MeshLambertMaterial({ color: '#c94f4f' }),
  fruta: new THREE.MeshLambertMaterial({ color: '#d9713e' }),
  auyama: new THREE.MeshLambertMaterial({ color: '#e8b23e' }),
  agua: new THREE.MeshLambertMaterial({ color: '#5fb2c9' }),
  pizarra: new THREE.MeshLambertMaterial({ color: '#2f4a3a' }),
  plata: new THREE.MeshLambertMaterial({ color: '#9fb3a0' }),
};
/* El sol de la viñeta del tiempo: el único emisivo propio (brilla solo). */
const VIN_SOL = new THREE.MeshStandardMaterial({
  color: '#f2c766',
  emissive: '#f2c766',
  emissiveIntensity: 0.85,
  flatShading: true,
});

/* MIS MATAS: la milpa de tres hermanas en policultivo — maíz de tutor,
   fríjol trepando y auyama rastrera sobre su era de tierra. Jamás se lee
   monocultivo (regla dura de la composición). */
function VinetaMatas() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} material={VIN.tierra}>
        <cylinderGeometry args={[0.72, 0.78, 0.1, 9]} />
      </mesh>
      {/* tres matas de maíz a distinta altura (la milpa viva, no en fila) */}
      {[[-0.34, 0.62, 0.02], [0.05, 0.78, -0.16], [0.4, 0.55, 0.08]].map(([x, h, z], i) => (
        <group key={i} position={[x, 0.1, z]}>
          <mesh position={[0, h / 2, 0]} material={VIN.maiz}>
            <cylinderGeometry args={[0.022, 0.035, h, 5]} />
          </mesh>
          <mesh position={[0, h, 0]} material={VIN.hojaClara} scale={[1.5, 1, 0.55]}>
            <coneGeometry args={[0.12, 0.3, 5]} />
          </mesh>
        </group>
      ))}
      {/* el fríjol trepador, subiendo por el tutor del centro */}
      {[0.3, 0.52].map((y, i) => (
        <mesh key={i} position={[0.1 + i * 0.03, y, -0.12]} material={VIN.hoja}>
          <sphereGeometry args={[0.06, 6, 5]} />
        </mesh>
      ))}
      {/* la auyama rastrera con su hoja ancha cubriendo el suelo */}
      <mesh position={[-0.12, 0.15, 0.32]} material={VIN.auyama} scale={[1, 0.72, 1]}>
        <sphereGeometry args={[0.11, 7, 6]} />
      </mesh>
      <mesh position={[0.2, 0.13, 0.34]} material={VIN.hoja} scale={[1.6, 0.5, 1.2]}>
        <sphereGeometry args={[0.09, 6, 5]} />
      </mesh>
    </group>
  );
}

/* MIS ANIMALES: el potrero en miniatura — pasto, la cerca de madera y el
   hato de patio (la vaca y su gallina). */
function VinetaAnimales() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} material={VIN.pasto}>
        <cylinderGeometry args={[0.74, 0.8, 0.1, 9]} />
      </mesh>
      {/* la cerca: tres postes y dos largueros */}
      {[-0.5, 0, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 0.28, -0.3]} material={VIN.madera}>
          <cylinderGeometry args={[0.02, 0.026, 0.38, 5]} />
        </mesh>
      ))}
      {[0.34, 0.2].map((y, i) => (
        <mesh key={i} position={[0, y, -0.3]} material={VIN.madera}>
          <boxGeometry args={[1.06, 0.035, 0.03]} />
        </mesh>
      ))}
      {/* la vaca: cuerpo, cabeza y sus cuatro patas */}
      <group position={[-0.16, 0.1, 0.08]}>
        <mesh position={[0, 0.21, 0]} material={VIN.crema}>
          <boxGeometry args={[0.34, 0.18, 0.17]} />
        </mesh>
        <mesh position={[0.21, 0.28, 0]} material={VIN.crema}>
          <boxGeometry args={[0.12, 0.12, 0.12]} />
        </mesh>
        {[[-0.12, -0.055], [-0.12, 0.055], [0.12, -0.055], [0.12, 0.055]].map(([dx, dz], i) => (
          <mesh key={i} position={[dx, 0.06, dz]} material={VIN.crema}>
            <cylinderGeometry args={[0.02, 0.02, 0.12, 4]} />
          </mesh>
        ))}
      </group>
      {/* la gallina criolla, picoteando el patio */}
      <mesh position={[0.34, 0.16, 0.3]} material={VIN.teja} scale={[1, 0.85, 1.25]}>
        <sphereGeometry args={[0.07, 6, 5]} />
      </mesh>
      <mesh position={[0.4, 0.24, 0.35]} material={VIN.teja}>
        <sphereGeometry args={[0.035, 5, 4]} />
      </mesh>
    </group>
  );
}

/* EL TIEMPO: el cielo LEÍDO desde la finca — la veleta, el sol y la nube
   con su aguacero. El paisaje del pronóstico, no un ícono. */
function VinetaTiempo() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} material={VIN.pasto}>
        <cylinderGeometry args={[0.7, 0.76, 0.1, 9]} />
      </mesh>
      {/* la veleta en su poste */}
      <mesh position={[0, 0.5, 0.05]} material={VIN.madera}>
        <cylinderGeometry args={[0.018, 0.024, 0.8, 5]} />
      </mesh>
      <group position={[0, 0.88, 0.05]} rotation={[0, 0.6, 0]}>
        <mesh material={VIN.crema}>
          <boxGeometry args={[0.3, 0.045, 0.02]} />
        </mesh>
        <mesh position={[0.18, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={VIN.teja}>
          <coneGeometry args={[0.05, 0.1, 4]} />
        </mesh>
      </group>
      {/* el sol de la mañana */}
      <mesh position={[-0.4, 0.9, -0.12]} material={VIN_SOL}>
        <sphereGeometry args={[0.13, 8, 7]} />
      </mesh>
      {/* la nube que trae el aguacero, con sus dos gotas */}
      <group position={[0.38, 0.78, -0.08]}>
        {[[-0.1, 0, 0.12], [0.1, 0.02, 0.11], [0, 0.07, 0.14]].map(([dx, dy, r], i) => (
          <mesh key={i} position={[dx, dy, 0]} material={VIN.nube}>
            <sphereGeometry args={[r, 7, 6]} />
          </mesh>
        ))}
        {[[-0.06, -0.18], [0.07, -0.25]].map(([dx, dy], i) => (
          <mesh key={i} position={[dx, dy, 0]} material={VIN.agua} scale={[1, 1.6, 1]}>
            <sphereGeometry args={[0.026, 5, 4]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* VENDER: el puesto de plaza — toldo, mesa y la cosecha en sus canastos. */
function VinetaVender() {
  const canastos = [
    { x: -0.24, mat: VIN.auyama },
    { x: 0.05, mat: VIN.fruta },
    { x: 0.32, mat: VIN.hojaClara },
  ];
  return (
    <group>
      <mesh position={[0, 0.05, 0]} material={VIN.tierra}>
        <cylinderGeometry args={[0.72, 0.78, 0.1, 9]} />
      </mesh>
      {/* los dos parales y el toldo inclinado */}
      {[-0.4, 0.4].map((x, i) => (
        <mesh key={i} position={[x, 0.5, -0.12]} material={VIN.madera}>
          <cylinderGeometry args={[0.02, 0.026, 0.84, 5]} />
        </mesh>
      ))}
      <mesh position={[0, 0.94, 0.02]} rotation={[0.34, 0, 0]} material={VIN.teja}>
        <boxGeometry args={[1.0, 0.035, 0.52]} />
      </mesh>
      {/* la mesa del puesto */}
      <mesh position={[0, 0.4, 0.1]} material={VIN.madera}>
        <boxGeometry args={[0.84, 0.05, 0.4]} />
      </mesh>
      {[-0.34, 0.34].map((x, i) => (
        <mesh key={i} position={[x, 0.2, 0.1]} material={VIN.madera}>
          <boxGeometry args={[0.05, 0.36, 0.3]} />
        </mesh>
      ))}
      {/* los canastos con la cosecha de colores (lo que sale a venderse) */}
      {canastos.map((c, i) => (
        <group key={i} position={[c.x, 0.46, 0.12]}>
          <mesh material={VIN.paja}>
            <cylinderGeometry args={[0.085, 0.065, 0.09, 7]} />
          </mesh>
          <mesh position={[0, 0.05, 0]} material={c.mat}>
            <sphereGeometry args={[0.06, 6, 5]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* APRENDER: el kiosco del saber — el tablero bajo su techito de paja, con
   sus rayitas de tiza y el banquito del que aprende. */
function VinetaAprender() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} material={VIN.tierra}>
        <cylinderGeometry args={[0.7, 0.76, 0.1, 9]} />
      </mesh>
      {[-0.34, 0.34].map((x, i) => (
        <mesh key={i} position={[x, 0.42, 0]} material={VIN.madera}>
          <cylinderGeometry args={[0.022, 0.028, 0.68, 5]} />
        </mesh>
      ))}
      <mesh position={[0, 0.88, 0]} material={VIN.paja}>
        <coneGeometry args={[0.56, 0.32, 6]} />
      </mesh>
      {/* el tablero con sus rayitas de tiza */}
      <mesh position={[0, 0.46, 0.02]} material={VIN.pizarra}>
        <boxGeometry args={[0.56, 0.36, 0.03]} />
      </mesh>
      {[[-0.08, 0.54, 0.2], [-0.02, 0.47, 0.28], [0.02, 0.4, 0.16]].map(([x, y, w], i) => (
        <mesh key={i} position={[x, y, 0.04]} material={VIN.crema}>
          <boxGeometry args={[w, 0.018, 0.008]} />
        </mesh>
      ))}
      {/* el banquito del que aprende */}
      <mesh position={[0.02, 0.13, 0.34]} material={VIN.madera}>
        <boxGeometry args={[0.24, 0.05, 0.14]} />
      </mesh>
    </group>
  );
}

/* TODA MI FINCA: el monte por estratos — árboles de especies distintas
   (copas de forma y verde diferentes: roble, aliso, yarumo, gaque) con el
   frailejón plateado del filo. Biodiversidad: la regla dura del 3D. */
function VinetaFinca() {
  const arboles = [
    { x: -0.4, z: 0.16, h: 0.34, cono: true, mat: VIN.hojaClara },
    { x: -0.05, z: -0.05, h: 0.5, cono: false, mat: VIN.hoja },
    { x: 0.36, z: 0.1, h: 0.42, cono: false, mat: VIN.hojaClara },
    { x: 0.16, z: -0.3, h: 0.62, cono: true, mat: VIN.hoja },
  ];
  return (
    <group>
      <mesh position={[0, 0.05, 0]} material={VIN.pasto}>
        <cylinderGeometry args={[0.74, 0.8, 0.1, 9]} />
      </mesh>
      {arboles.map((a, i) => (
        <group key={i} position={[a.x, 0.1, a.z]}>
          <mesh position={[0, a.h / 2, 0]} material={VIN.madera}>
            <cylinderGeometry args={[0.02, 0.03, a.h, 5]} />
          </mesh>
          <mesh position={[0, a.h + 0.08, 0]} material={a.mat}>
            {a.cono ? <coneGeometry args={[0.16, 0.34, 6]} /> : <sphereGeometry args={[0.15, 6, 5]} />}
          </mesh>
        </group>
      ))}
      {/* el frailejón del filo: la seña del páramo que corona la finca */}
      <group position={[-0.3, 0.1, -0.34]}>
        <mesh position={[0, 0.09, 0]} material={VIN.madera}>
          <cylinderGeometry args={[0.045, 0.05, 0.18, 6]} />
        </mesh>
        <mesh position={[0, 0.22, 0]} material={VIN.plata} scale={[1, 0.75, 1]}>
          <sphereGeometry args={[0.09, 6, 5]} />
        </mesh>
      </group>
    </group>
  );
}

/* El reparto viñeta↔mundo. Un portal sin viñeta registrada monta solo el
   arco (no truena): las ramas que sumen portales nuevos no rompen esto. */
const VINETAS = {
  cultivos: VinetaMatas,
  animales: VinetaAnimales,
  clima: VinetaTiempo,
  mercado: VinetaVender,
  aprender: VinetaAprender,
  disenio: VinetaFinca,
};

function sitiosVentanas(mundos) {
  const [cx, cz] = CASA_VALLE.pos;
  const porId = Object.fromEntries(mundos.map((m) => [m.id, m]));
  return PORTALES_VALLE.map((p) => {
    const m = porId[p.id];
    if (!m) return null;
    const [x, , z] = m.pos;
    // Mirar hacia la casa: la ventana recibe al que llega por el sendero.
    const rotY = Math.atan2(cx - x, cz - z);
    const esc = m.escala || 1;
    // Al borde del patio, del lado de la casa (el umbral, no el centro).
    const d = PATIO.radioBase * esc + 0.7;
    return {
      portal: p,
      mundo: m,
      x: x + Math.sin(rotY) * d,
      z: z + Math.cos(rotY) * d,
      rotY,
      tinte: m.tinte,
    };
  }).filter(Boolean);
}

function VentanaViva({ sitio, alturaDe, nocturno, reducedMotion, rico = true, onEntrar }) {
  const y = alturaDe(sitio.x, sitio.z);
  const haloRef = useRef(null);
  // El umbral RESPIRA (~0.3 Hz, con fase por portal para que el frente no
  // pulse al unísono): vivo, no intermitente.
  const fase = useMemo(() => sitio.x * 2.1 + sitio.z * 1.3, [sitio]);
  const [fuerte] = sitio.tinte;
  // Los materiales emisivos de los dos faroles del portal, por REF (mismo
  // patrón que el brillo del arco viejo): el pulso los escribe imperativo.
  const faroles = useRef([]);
  useFrame((state) => {
    if (reducedMotion) return;
    const p = (Math.sin(state.clock.elapsedTime * 1.7 + fase) + 1) / 2;
    for (const f of faroles.current) {
      if (f) f.emissiveIntensity = (nocturno ? 0.95 : 0.6) + p * 0.6;
    }
    if (haloRef.current) haloRef.current.opacity = (nocturno ? 0.32 : 0.3) + p * 0.18;
  });
  const Vineta = VINETAS[sitio.mundo.id] || null;
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
      onPointerOver={onEntrar ? alApuntar : undefined}
      onPointerOut={onEntrar ? alSoltar : undefined}
    >
      {/* EL HALO DE ENTRADA a ras de suelo: el anillo de luz del tinte del
          mundo que respira — "aquí se entra" dicho con luz, sin tapar nada
          (mismo lenguaje que el charco de la puerta de la casa y el faro). */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.02, 1.34, 28]} />
        <meshBasicMaterial
          ref={haloRef}
          color={fuerte}
          transparent
          opacity={nocturno ? 0.36 : 0.32}
          depthWrite={false}
          side={2}
        />
      </mesh>
      {/* el charco tenue dentro del anillo (solo tier rico: un disco más) */}
      {rico && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.0, 22]} />
          <meshBasicMaterial
            color={fuerte}
            transparent
            opacity={nocturno ? 0.12 : 0.07}
            depthWrite={false}
          />
        </mesh>
      )}
      {/* los DOS FAROLES DE VARA que flanquean el paso: bajitos y a los
          lados — señalan la entrada sin bloquear la vista de la viñeta */}
      {[-1.18, 1.18].map((dx, i) => (
        <group key={i} position={[dx, 0, 0.3]}>
          <mesh position={[0, 0.27, 0]} material={VIN.madera} castShadow>
            <cylinderGeometry args={[0.028, 0.04, 0.54, 5]} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <sphereGeometry args={[0.1, 8, 7]} />
            <meshStandardMaterial
              ref={(m) => {
                faroles.current[i] = m;
              }}
              color={fuerte}
              emissive={fuerte}
              emissiveIntensity={nocturno ? 1.15 : 0.65}
              flatShading
            />
          </mesh>
        </group>
      ))}
      {/* LA VIÑETA: el mundo de destino en miniatura — ahora PROTAGONISTA
          (sin aro que la tape) y más grande: la jerarquía de los 6 portales
          principales se lee por tamaño y por luz. */}
      {Vineta && (
        <group position={[0, 0.02, -0.12]} scale={1.18}>
          <Vineta />
        </group>
      )}
    </group>
  );
}

export function VentanasVivas({ mundos, alturaDe, nocturno = false, reducedMotion = false, perfil = null, onEntrar = null }) {
  const sitios = useMemo(() => sitiosVentanas(mundos), [mundos]);
  const rico = perfil ? !!perfil.materialRico : true;
  return (
    <group>
      {sitios.map((s) => (
        <VentanaViva
          key={s.portal.id}
          sitio={s}
          alturaDe={alturaDe}
          nocturno={nocturno}
          reducedMotion={reducedMotion}
          rico={rico}
          onEntrar={onEntrar}
        />
      ))}
    </group>
  );
}

/* ── PÓRTICOS de madera: SOLO los lugares secundarios ────────────────────
   La puerta humilde del patio de trabajo (dos pies derechos + dintel +
   farolito + tablita con el tinte): para las eras, la huerta, el vivero, la
   pila y la toma de agua. Los 6 portales grandes NO llevan pórtico (tienen
   ventana viva) ni el páramo (tiene su vista con el Ent). Instanciados en
   4 draw calls; el toque lo captura el landmark del mundo, como siempre. */
function sitiosPorticos(mundos) {
  const [cx, cz] = CASA_VALLE.pos;
  return mundos
    .filter((m) => PORTICOS_SECUNDARIOS.includes(m.id))
    .map((m) => {
      const [x, , z] = m.pos;
      const rotY = Math.atan2(cx - x, cz - z);
      const esc = m.escala || 1;
      const d = PATIO.radioBase * esc + 0.5;
      return {
        id: m.id,
        x: x + Math.sin(rotY) * d,
        z: z + Math.cos(rotY) * d,
        rotY,
        tinte: m.tinte,
      };
    });
}

export function PorticosSecundarios({ mundos, alturaDe }) {
  const sitios = useMemo(() => sitiosPorticos(mundos), [mundos]);
  return (
    <group>
      <Instances limit={sitios.length * 2}>
        <cylinderGeometry args={[0.045, 0.055, 1.16, 5]} />
        <meshLambertMaterial color="#7a5a38" />
        {sitios.flatMap((s) => {
          const y = alturaDe(s.x, s.z);
          const c = Math.cos(s.rotY);
          const sn = Math.sin(s.rotY);
          return [-0.5, 0.5].map((dx, i) => (
            <Instance
              key={`${s.id}${i}`}
              position={[s.x + c * dx, y + 0.58, s.z - sn * dx]}
            />
          ));
        })}
      </Instances>
      <Instances limit={sitios.length}>
        <boxGeometry args={[1.26, 0.08, 0.13]} />
        <meshLambertMaterial color="#7a5a38" />
        {sitios.map((s) => (
          <Instance
            key={s.id}
            position={[s.x, alturaDe(s.x, s.z) + 1.2, s.z]}
            rotation={[0, s.rotY, 0]}
          />
        ))}
      </Instances>
      <Instances limit={sitios.length}>
        <boxGeometry args={[0.46, 0.24, 0.04]} />
        <meshLambertMaterial />
        {sitios.map((s) => (
          <Instance
            key={s.id}
            position={[s.x, alturaDe(s.x, s.z) + 0.98, s.z]}
            rotation={[0, s.rotY, 0]}
            color={s.tinte[0]}
          />
        ))}
      </Instances>
      <Instances limit={sitios.length}>
        <octahedronGeometry args={[0.09, 0]} />
        <meshBasicMaterial color="#ffcf87" />
        {sitios.map((s) => (
          <Instance
            key={s.id}
            position={[s.x, alturaDe(s.x, s.z) + 1.38, s.z]}
          />
        ))}
      </Instances>
    </group>
  );
}

/* ── LA VISTA DEL PÁRAMO — ARCHIVADA 2026-07-18 ───────────────────────────
   `VistaParamoEnt` (el Ent-queñua magnífico parado en el filo, entre
   frailejones) se sacó de la vista del valle: se veía amontonada en el
   cuadro (pedido del operador). Componente completo conservado, NO
   borrado — ver src/mockups/valle/_archivo/vistaParamo.archivado.jsx para
   reactivarlo. El portal/entrada REAL al páramo no vivía aquí — sigue
   intacto en valleData.js LUGARES id:'paramo' → wire3DNav.js
   `paramo: 'diorama_paramo'` → MundoParamo3D. */

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

/* ── EL OSO NEGRO DEL MONTE (Tremarctos ornatus en clave biopunk) ────────
   El operador retiró el oso rubber-hose café y pidió VER el oso bueno: el
   negro del GuardianEspiritu, con su contorno neón y sus anteojos crema (el
   "de anteojos" literal). Vive en el borde del monte — el slot de ancla que
   quedó reservado — con presencia clara: es el mayor de los vecinos de
   tierra. Billboard aria-hidden, cero toques (presencia, no interfaz). */
const OSO_MONTE = { punto: [5.4, -1.2], px: 52, factor: 11, dy: 0.46 };

export function OsoNegroDelMonte({ alturaDe }) {
  const [x, z] = OSO_MONTE.punto;
  const y = alturaDe(x, z) + OSO_MONTE.dy;
  return (
    <group position={[x, y, z]}>
      <Html center distanceFactor={OSO_MONTE.factor} zIndexRange={[6, 0]} pointerEvents="none">
        <div className="valle-critter" data-vecino="oso-negro" aria-hidden="true">
          <GuardianAvatar id="oso" size={OSO_MONTE.px} />
        </div>
      </Html>
    </group>
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
