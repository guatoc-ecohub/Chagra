/*
 * composicionValle3D — las piezas r3f de la DIRECCIÓN del valle.
 *
 * El arte que la composición pide (direccion/composicionValle.js) hecho
 * geometría procedural, con el mismo contrato del resto del valle: cero
 * assets remotos, materiales flat/Lambert según perfil, cero alocación por
 * frame. Recibe `alturaDe(x, z)` del host (Valle3D es dueño del terreno):
 * nada de aquí importa Valle3D — sin ciclos.
 *
 *   · CasaCampesina    — el corazón del cuadro Y LA PUERTA DE LOS MUNDOS:
 *                        la puerta iluminada invita a tocar y abre el mapa
 *                        de los 6 portales.
 *   · VentanasVivas    — los 6 portales PRINCIPALES como ventanas VIVAS al
 *                        mundo: un arco de vegetación con el lente del mundo
 *                        brillando adentro (jerarquía del operador: notorios
 *                        e inmersivos, nada de toris para lo principal).
 *   · PorticosSecundarios — los pórticos de madera SOLO para los lugares
 *                        secundarios de menos uso (eras, huerta, vivero…).
 *   · VistaParamoEnt   — el acceso al páramo: el Ent-queñua MAGNÍFICO parado
 *                        en el filo entre frailejones. El páramo se VE.
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
import EntQuenua from '../../visual/mundo3d/bosque/EntQuenua.jsx';
import {
  CASA_VALLE,
  SENDEROS_VALLE,
  PATIO,
  PORTALES_VALLE,
  PORTICOS_SECUNDARIOS,
  VISTA_PARAMO,
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
 * La casa campesina: el corazón del cuadro y LA PUERTA DE LOS MUNDOS. Su
 * puerta está ABIERTA y con luz cálida adentro (la casa invita), pulsa apenas
 * como el faro del día, y tocarla abre el mapa de los 6 portales (`onPuerta`).
 * Modesta a propósito en lo demás: sostiene el cuadro sin pedir espectáculo.
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
   NOTORIOS e inmersivos — ventanas VIVAS al mundo, no toris de madera.

   Cada ventana es un ARCO DE VEGETACIÓN (un anillo vivo brotado de la
   tierra, con hojas y flores del tinte del mundo) con el LENTE del mundo
   brillando adentro: un velo de color que respira — se ve el mundo del otro
   lado. Se para al borde del patio mirando hacia la casa (de donde llega el
   sendero) y tocarla ENTRA, igual que el lugar. Cero texturas: anillo,
   discos y esferitas. */
const MAT_ARCO_VIVO = new THREE.MeshLambertMaterial({ color: '#4f7d3c' });

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

/* Las hojas que visten el anillo: puntos sobre la circunferencia (en el
   plano local x/y del arco), con jitter determinista. */
const HOJAS_ARCO = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2 + 0.3;
  const j = Math.sin(i * 12.9898) * 0.5;
  return { a, r: 0.92 + j * 0.08, s: 0.1 + Math.abs(j) * 0.06, giro: j * 2.4 };
});

function VentanaViva({ sitio, alturaDe, nocturno, reducedMotion, onEntrar }) {
  const y = alturaDe(sitio.x, sitio.z);
  const lenteRef = useRef(null);
  const brilloRef = useRef(null);
  // El lente RESPIRA (el velo del mundo ondea, ~0.3 Hz, con fase por portal
  // para que el frente no pulse al unísono): vivo, no intermitente.
  const fase = useMemo(() => sitio.x * 2.1 + sitio.z * 1.3, [sitio]);
  useFrame((state) => {
    if (reducedMotion) return;
    const p = (Math.sin(state.clock.elapsedTime * 1.9 + fase) + 1) / 2;
    if (lenteRef.current) lenteRef.current.opacity = 0.34 + p * 0.18;
    if (brilloRef.current) brilloRef.current.emissiveIntensity = 0.5 + p * 0.5;
  });
  const [fuerte, suave] = sitio.tinte;
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
      {/* el ANILLO VIVO: la enredadera que hace de marco, parada en la tierra */}
      <mesh position={[0, 1.12, 0]} material={MAT_ARCO_VIVO} castShadow>
        <torusGeometry args={[0.95, 0.085, 7, 26]} />
      </mesh>
      {/* las hojas que lo visten (mismo material: 0 draw calls extra de shader) */}
      {HOJAS_ARCO.map((h, i) => (
        <mesh
          key={i}
          material={MAT_ARCO_VIVO}
          position={[Math.cos(h.a) * h.r, 1.12 + Math.sin(h.a) * h.r, 0.03]}
          rotation={[0, 0, h.giro]}
          scale={[h.s * 1.7, h.s, h.s * 0.5]}
        >
          <sphereGeometry args={[1, 6, 5]} />
        </mesh>
      ))}
      {/* cuatro flores del tinte del mundo coronando el arco (la seña) */}
      {[0.6, 1.25, 1.9, 2.55].map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * 0.98, 1.12 + Math.sin(a) * 0.98, 0.08]}
        >
          <sphereGeometry args={[0.065, 6, 5]} />
          <meshStandardMaterial
            ref={i === 1 ? brilloRef : undefined}
            color={fuerte}
            emissive={fuerte}
            emissiveIntensity={0.7}
            flatShading
          />
        </mesh>
      ))}
      {/* EL LENTE: el velo del mundo — se ve "el otro lado" en su color */}
      <mesh position={[0, 1.12, 0]}>
        <circleGeometry args={[0.88, 24]} />
        <meshBasicMaterial
          ref={lenteRef}
          color={suave}
          transparent
          opacity={0.4}
          side={2}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 1.12, -0.02]}>
        <circleGeometry args={[0.55, 20]} />
        <meshBasicMaterial color={fuerte} transparent opacity={0.3} side={2} depthWrite={false} />
      </mesh>
      {/* los dos raigones donde el anillo agarra la tierra */}
      {[-0.82, 0.82].map((dx, i) => (
        <mesh key={i} position={[dx, 0.14, 0]} material={MAT_ARCO_VIVO}>
          <coneGeometry args={[0.16, 0.5, 5]} />
        </mesh>
      ))}
      {/* de noche el lente ES una práctica: un brillo que orienta */}
      {nocturno && (
        <mesh position={[0, 1.12, 0.02]}>
          <circleGeometry args={[0.88, 24]} />
          <meshBasicMaterial color={fuerte} transparent opacity={0.18} side={2} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

export function VentanasVivas({ mundos, alturaDe, nocturno = false, reducedMotion = false, onEntrar = null }) {
  const sitios = useMemo(() => sitiosVentanas(mundos), [mundos]);
  return (
    <group>
      {sitios.map((s) => (
        <VentanaViva
          key={s.portal.id}
          sitio={s}
          alturaDe={alturaDe}
          nocturno={nocturno}
          reducedMotion={reducedMotion}
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

/* ── LA VISTA DEL PÁRAMO: el Ent-queñua magnífico en el filo ─────────────
   Regla del operador: el acceso al páramo ES el páramo visible — arriba, el
   Ent (queñua/Polylepis, mallas reales de EntQuenua) parado entre los
   frailejones, meciéndose con el viento del páramo. Tocarlo entra al mundo
   del monte. El detalle va con techo 'medio' (el 'alto' pleno es para SU
   mundo; aquí es un habitante del fondo, no la escena entera). */
export function VistaParamoEnt({ alturaDe, tier = 'alto', reducedMotion = false, onEntrar = null }) {
  const [x, z] = VISTA_PARAMO.punto;
  const y = alturaDe(x, z);
  const tierEnt = tier === 'bajo' ? 'bajo' : 'medio';
  return (
    <group
      position={[x, y, z]}
      rotation={[0, 0.5, 0]}
      scale={VISTA_PARAMO.escala}
      onClick={
        onEntrar
          ? (e) => {
              e.stopPropagation();
              onEntrar(VISTA_PARAMO.mundoId);
            }
          : undefined
      }
      onPointerOver={onEntrar ? alApuntar : undefined}
      onPointerOut={onEntrar ? alSoltar : undefined}
    >
      <EntQuenua tier={tierEnt} reducedMotion={reducedMotion} />
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
