import { useMemo } from 'react';
import * as THREE from 'three';
import { PALETA, mezclar } from '../atmosferaMadre.js';

// Deterministic PRNG (Mulberry32) to keep rendering pure and consistent
// eslint-disable-next-line react-refresh/only-export-components
export function crearRng(semilla = 12345) {
  let a = semilla >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Common style for translucent materials
const matTranslucido = (color, opacidad = 0.35) => (
  <meshLambertMaterial
    color={color}
    transparent
    opacity={opacidad}
    depthWrite={false}
    side={THREE.DoubleSide}
    flatShading
  />
);

// Helper base grid/placa
function PlacaBase({ largo, ancho, color = PALETA.tierraClara, alto = 0.05 }) {
  return (
    <mesh position={[0, -alto / 2, 0]}>
      <boxGeometry args={[largo, alto, ancho]} />
      <meshLambertMaterial color={color} flatShading />
    </mesh>
  );
}

/* 1. INVERNADERO TÚNEL */
export function InvernaderoTunel({ dims, tinte = '#dfeef2', seed = 42, frugal = false }) {
  const { largo = 6, ancho = 4, alto = 2.2 } = dims || {};
  const rng = useMemo(() => crearRng(seed), [seed]);

  const nArcos = frugal ? 4 : Math.max(5, Math.floor(largo * 0.8));
  const arcos = useMemo(() => {
    return Array.from({ length: nArcos }, (_, i) => {
      const x = -largo / 2 + (i / (nArcos - 1)) * largo;
      return x;
    });
  }, [largo, nArcos]);

  // Procedural crops inside
  const nPlantas = frugal ? 6 : 14;
  const plantas = useMemo(() => {
    return Array.from({ length: nPlantas }, () => ({
      x: (rng() - 0.5) * largo * 0.85,
      z: (rng() - 0.5) * ancho * 0.6,
      h: 0.15 + rng() * 0.2,
      color: rng() > 0.5 ? PALETA.follaje : PALETA.follajeClaro,
    }));
  }, [largo, ancho, nPlantas, rng]);

  const colorPlastico = useMemo(() => mezclar('#dfeef2', tinte, 0.35), [tinte]);

  return (
    <group>
      <PlacaBase largo={largo + 0.5} ancho={ancho + 0.5} />
      
      {/* Camas de tierra */}
      <mesh position={[0, 0.02, -ancho * 0.22]}>
        <boxGeometry args={[largo * 0.9, 0.05, ancho * 0.3]} />
        <meshLambertMaterial color={PALETA.tierra} flatShading />
      </mesh>
      <mesh position={[0, 0.02, ancho * 0.22]}>
        <boxGeometry args={[largo * 0.9, 0.05, ancho * 0.3]} />
        <meshLambertMaterial color={PALETA.tierra} flatShading />
      </mesh>

      {/* Plantas deterministas */}
      {plantas.map((p, i) => (
        <mesh key={i} position={[p.x, 0.05 + p.h / 2, p.z]}>
          <coneGeometry args={[0.08, p.h, 5]} />
          <meshLambertMaterial color={p.color} flatShading />
        </mesh>
      ))}

      {/* Arcos de guadua estructurales */}
      {arcos.map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[ancho / 2, 0.05, 4, frugal ? 8 : 16, Math.PI]} />
            <meshLambertMaterial color={PALETA.maderaClara} flatShading />
          </mesh>
        </group>
      ))}

      {/* Cubierta plástica translúcida */}
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[1, alto / (ancho / 2), 1]}>
        <cylinderGeometry args={[ancho / 2, ancho / 2, largo, frugal ? 10 : 20, 1, true, 0, Math.PI]} />
        {matTranslucido(colorPlastico, 0.28)}
      </mesh>
      
      {/* Tapas de plástico en los extremos */}
      {[-largo / 2, largo / 2].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1, alto / (ancho / 2), 1]}>
          <circleGeometry args={[ancho / 2, frugal ? 8 : 16, 0, Math.PI]} />
          {matTranslucido(colorPlastico, 0.2)}
        </mesh>
      ))}

      {/* Puertas de madera en los frentes */}
      <mesh position={[largo / 2 + 0.01, alto * 0.3, 0]}>
        <boxGeometry args={[0.02, alto * 0.6, 0.6]} />
        <meshLambertMaterial color={PALETA.madera} flatShading />
      </mesh>
    </group>
  );
}

/* 2. GALLINERO CAMPO ABIERTO */
export function GallineroCampo({ dims, tinte = PALETA.madera, seed = 12, frugal = false }) {
  const { largo = 5, ancho = 4, alto = 2 } = dims || {};
  const rng = useMemo(() => crearRng(seed), [seed]);

  const colorCoop = useMemo(() => mezclar(PALETA.maderaClara, tinte, 0.4), [tinte]);

  // Gallinas en el corral
  const nGallinas = frugal ? 3 : 7;
  const gallinas = useMemo(() => {
    return Array.from({ length: nGallinas }, () => ({
      x: (rng() - 0.5) * largo * 0.75,
      z: (rng() - 0.5) * ancho * 0.75,
      rot: rng() * Math.PI * 2,
      color: rng() > 0.5 ? '#efe7d8' : '#c98d4f', // Cal vs Pluma colorada
    }));
  }, [largo, ancho, nGallinas, rng]);

  return (
    <group>
      <PlacaBase largo={largo + 0.2} ancho={ancho + 0.2} />

      {/* Postes del corral */}
      {[
        [-largo / 2, -ancho / 2],
        [largo / 2, -ancho / 2],
        [largo / 2, ancho / 2],
        [-largo / 2, ancho / 2],
        [0, -ancho / 2],
        [0, ancho / 2]
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, alto / 2, z]}>
          <cylinderGeometry args={[0.04, 0.04, alto, 5]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
        </mesh>
      ))}

      {/* Malla translúcida en el perímetro */}
      <mesh position={[0, alto / 2, -ancho / 2]}>
        <planeGeometry args={[largo, alto]} />
        {matTranslucido('#b9c2b0', 0.25)}
      </mesh>
      <mesh position={[0, alto / 2, ancho / 2]}>
        <planeGeometry args={[largo, alto]} />
        {matTranslucido('#b9c2b0', 0.25)}
      </mesh>
      <mesh position={[-largo / 2, alto / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ancho, alto]} />
        {matTranslucido('#b9c2b0', 0.25)}
      </mesh>
      <mesh position={[largo / 2, alto / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ancho, alto]} />
        {matTranslucido('#b9c2b0', 0.25)}
      </mesh>

      {/* Caseta de dormir (Elevada) */}
      <group position={[-largo * 0.25, 0, -ancho * 0.2]}>
        {/* Pilotes */}
        {[-0.5, 0.5].map((dx) =>
          [-0.5, 0.5].map((dz) => (
            <mesh key={`${dx}:${dz}`} position={[dx, 0.2, dz]}>
              <cylinderGeometry args={[0.03, 0.03, 0.4, 4]} />
              <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
            </mesh>
          ))
        )}
        {/* Casa principal */}
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[1.2, 0.8, 1.2]} />
          <meshLambertMaterial color={colorCoop} flatShading />
        </mesh>
        {/* Techo a un agua */}
        <mesh position={[0, 1.2, 0]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[1.4, 0.04, 1.4]} />
          <meshLambertMaterial color={PALETA.lamina} flatShading />
        </mesh>
        {/* Rampita de bajada */}
        <mesh position={[0, 0.2, 0.7]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.3, 0.02, 0.7]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
      </group>

      {/* Gallinitas deterministicas */}
      {gallinas.map((g, i) => (
        <group key={i} position={[g.x, 0.08, g.z]} rotation={[0, g.rot, 0]}>
          {/* Cuerpo */}
          <mesh position={[0, 0, 0]} scale={[1, 0.8, 0.8]}>
            <sphereGeometry args={[0.08, 6, 5]} />
            <meshLambertMaterial color={g.color} flatShading />
          </mesh>
          {/* Cabeza */}
          <mesh position={[0.06, 0.08, 0]}>
            <sphereGeometry args={[0.04, 5, 4]} />
            <meshLambertMaterial color={g.color} flatShading />
          </mesh>
          {/* Cresta roja */}
          {!frugal && (
            <mesh position={[0.06, 0.12, 0]}>
              <boxGeometry args={[0.02, 0.03, 0.01]} />
              <meshLambertMaterial color="#c9382b" flatShading />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/* 3. GALPÓN AVÍCOLA */
export function Galpon({ dims, tinte = '#ea8a24', _seed = 88, frugal = false }) {
  const { largo = 8, ancho = 5, alto = 2.4 } = dims || {};
  const colorCurtains = useMemo(() => tinte, [tinte]);

  const nPostes = frugal ? 4 : 6;
  const posts = useMemo(() => {
    return Array.from({ length: nPostes }, (_, i) => {
      const x = -largo / 2 + (i / (nPostes - 1)) * largo;
      return x;
    });
  }, [largo, nPostes]);

  return (
    <group>
      <PlacaBase largo={largo + 0.4} ancho={ancho + 0.4} color={PALETA.concreto} />

      {/* Muros frontales bajos (Zócalo) */}
      <mesh position={[0, 0.25, -ancho / 2]}>
        <boxGeometry args={[largo, 0.5, 0.1]} />
        <meshLambertMaterial color={PALETA.concreto} flatShading />
      </mesh>
      <mesh position={[0, 0.25, ancho / 2]}>
        <boxGeometry args={[largo, 0.5, 0.1]} />
        <meshLambertMaterial color={PALETA.concreto} flatShading />
      </mesh>

      {/* Cortinas enrollables de colores típicas sobre el zócalo */}
      <mesh position={[0, 0.85, -ancho / 2 + 0.01]}>
        <boxGeometry args={[largo * 0.98, 0.7, 0.06]} />
        <meshLambertMaterial color={colorCurtains} flatShading />
      </mesh>
      <mesh position={[0, 0.85, ancho / 2 - 0.01]}>
        <boxGeometry args={[largo * 0.98, 0.7, 0.06]} />
        <meshLambertMaterial color={colorCurtains} flatShading />
      </mesh>

      {/* Muros laterales ciegos (Cal) */}
      <mesh position={[-largo / 2, alto / 2, 0]}>
        <boxGeometry args={[0.1, alto, ancho]} />
        <meshLambertMaterial color={PALETA.cal} flatShading />
      </mesh>
      <mesh position={[largo / 2, alto / 2, 0]}>
        <boxGeometry args={[0.1, alto, ancho]} />
        <meshLambertMaterial color={PALETA.cal} flatShading />
      </mesh>

      {/* Estructura de vigas y postes */}
      {posts.map((x, i) => (
        <group key={i}>
          <mesh position={[x, alto / 2, -ancho / 2]}>
            <cylinderGeometry args={[0.05, 0.05, alto, 5]} />
            <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
          </mesh>
          <mesh position={[x, alto / 2, ancho / 2]}>
            <cylinderGeometry args={[0.05, 0.05, alto, 5]} />
            <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
          </mesh>
        </group>
      ))}

      {/* Techo a dos aguas de zinc */}
      <mesh position={[0, alto + 0.2, 0]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[largo + 0.4, 0.04, ancho / 2 + 0.3]} />
        <meshLambertMaterial color={PALETA.lamina} flatShading />
      </mesh>
      <mesh position={[0, alto + 0.2, 0]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[largo + 0.4, 0.04, ancho / 2 + 0.3]} />
        <meshLambertMaterial color={PALETA.lamina} flatShading />
      </mesh>
    </group>
  );
}

/* 4. ESTABLO */
export function Establo({ dims, tinte = '#a98a5c', _seed = 7, _frugal = false }) {
  const { largo = 6, ancho = 4, alto = 2.6 } = dims || {};
  const colorMadera = useMemo(() => mezclar(PALETA.madera, tinte, 0.3), [tinte]);

  return (
    <group>
      <PlacaBase largo={largo + 0.2} ancho={ancho + 0.2} color={PALETA.concreto} />

      {/* Postes de soporte de madera gruesa */}
      {[
        [-largo / 2 + 0.1, -ancho / 2 + 0.1],
        [largo / 2 - 0.1, -ancho / 2 + 0.1],
        [largo / 2 - 0.1, ancho / 2 - 0.1],
        [-largo / 2 + 0.1, ancho / 2 - 0.1],
        [0, -ancho / 2 + 0.1],
        [0, ancho / 2 - 0.1]
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, alto / 2, z]}>
          <cylinderGeometry args={[0.08, 0.08, alto, 5]} />
          <meshLambertMaterial color={colorMadera} flatShading />
        </mesh>
      ))}

      {/* Comedero corrido al frente */}
      <mesh position={[0, 0.25, ancho * 0.35]}>
        <boxGeometry args={[largo * 0.9, 0.5, 0.4]} />
        <meshLambertMaterial color={PALETA.concreto} flatShading />
      </mesh>
      {/* Fardo de heno en el comedero */}
      <mesh position={[0, 0.4, ancho * 0.35]}>
        <boxGeometry args={[largo * 0.85, 0.2, 0.3]} />
        <meshLambertMaterial color="#cbb26a" flatShading />
      </mesh>

      {/* Techo tradicional de teja de arcilla a un agua (caída hacia atrás) */}
      <mesh position={[0, alto + 0.15, -0.2]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[largo + 0.4, 0.06, ancho + 0.5]} />
        <meshLambertMaterial color="#aa5533" flatShading /> {/* Terracota */}
      </mesh>
    </group>
  );
}

/* 5. ALMACÉN / BODEGA */
export function AlmacenBodega({ dims, tinte = PALETA.cal, seed = 512, frugal = false }) {
  const { largo = 5, ancho = 4, alto = 3 } = dims || {};
  const rng = useMemo(() => crearRng(seed), [seed]);

  const colorParedes = useMemo(() => mezclar(PALETA.cal, tinte, 0.45), [tinte]);

  // Sacos de café al lado del portón
  const nSacos = frugal ? 2 : 4;
  const sacos = useMemo(() => {
    return Array.from({ length: nSacos }, (_, i) => ({
      x: largo * 0.3 + (i % 2) * 0.25,
      z: ancho * 0.35 + Math.floor(i / 2) * 0.25,
      r: 0.1 + rng() * 0.04,
      h: 0.35 + rng() * 0.1,
      color: i % 2 ? '#d8c9a5' : '#c9b487', // Fique natural vs sucio
    }));
  }, [largo, ancho, nSacos, rng]);

  return (
    <group>
      <PlacaBase largo={largo + 0.3} ancho={ancho + 0.3} color={PALETA.concreto} />

      {/* Estructura cerrada de bodega (Paredes de adobe/encalado) */}
      <mesh position={[0, alto / 2, 0]}>
        <boxGeometry args={[largo, alto, ancho]} />
        <meshLambertMaterial color={colorParedes} flatShading />
      </mesh>

      {/* Portón rústico de madera oscura al frente */}
      <mesh position={[-largo * 0.15, alto * 0.4, ancho / 2 + 0.02]}>
        <boxGeometry args={[1.3, alto * 0.8, 0.05]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>

      {/* Viga de madera en el marco del portón */}
      <mesh position={[-largo * 0.15, alto * 0.82, ancho / 2 + 0.03]}>
        <boxGeometry args={[1.5, 0.1, 0.08]} />
        <meshLambertMaterial color={PALETA.madera} flatShading />
      </mesh>

      {/* Techo a dos aguas de tejas coloniales */}
      <mesh position={[0, alto + 0.25, 0]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[largo + 0.4, 0.05, ancho / 2 + 0.4]} />
        <meshLambertMaterial color="#b96a4a" flatShading />
      </mesh>
      <mesh position={[0, alto + 0.25, 0]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[largo + 0.4, 0.05, ancho / 2 + 0.4]} />
        <meshLambertMaterial color="#b96a4a" flatShading />
      </mesh>

      {/* Sacos de café deterministas */}
      {sacos.map((s, i) => (
        <mesh key={i} position={[s.x, s.h / 2, s.z]}>
          <cylinderGeometry args={[s.r, s.r * 1.1, s.h, 6]} />
          <meshLambertMaterial color={s.color} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* 6. TROJA DE SECADO */
export function TrojaSecado({ dims, tinte = PALETA.madera, seed = 73, frugal = false }) {
  const { largo = 4, ancho = 3, alto = 2.8 } = dims || {};
  const rng = useMemo(() => crearRng(seed), [seed]);

  const colorTroja = useMemo(() => mezclar(PALETA.madera, tinte, 0.35), [tinte]);

  // Cajones/Camas con granos de maíz o café
  const nCajones = frugal ? 2 : 3;
  const cajones = useMemo(() => {
    return Array.from({ length: nCajones }, (_, i) => ({
      y: 0.6 + i * 0.55,
      granoColor: rng() > 0.5 ? '#d9a13b' : '#7a3b2a', // Maíz amarillo vs café cereza
    }));
  }, [nCajones, rng]);

  return (
    <group>
      <PlacaBase largo={largo + 0.2} ancho={ancho + 0.2} color={PALETA.tierraClara} />

      {/* Pilotes/columnas altas para elevar la troja del suelo */}
      {[
        [-largo / 2 + 0.2, -ancho / 2 + 0.2],
        [largo / 2 - 0.2, -ancho / 2 + 0.2],
        [largo / 2 - 0.2, ancho / 2 - 0.2],
        [-largo / 2 + 0.2, ancho / 2 - 0.2]
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, alto * 0.45, z]}>
          <cylinderGeometry args={[0.07, 0.07, alto * 0.9, 4]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
        </mesh>
      ))}

      {/* Estructura/Plataforma principal */}
      <mesh position={[0, alto * 0.45, 0]}>
        <boxGeometry args={[largo * 0.95, 0.08, ancho * 0.95]} />
        <meshLambertMaterial color={colorTroja} flatShading />
      </mesh>

      {/* Cajones de secado con granos en el interior */}
      {cajones.map((c, i) => (
        <group key={i} position={[0, c.y, 0]}>
          {/* El marco de cajón de madera */}
          <mesh>
            <boxGeometry args={[largo * 0.85, 0.12, ancho * 0.85]} />
            <meshLambertMaterial color={colorTroja} flatShading />
          </mesh>
          {/* El lecho de granos */}
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[largo * 0.8, 0.05, ancho * 0.8]} />
            <meshLambertMaterial color={c.granoColor} flatShading />
          </mesh>
        </group>
      ))}

      {/* Techo protector a dos aguas (inclinación andina) */}
      <mesh position={[0, alto + 0.15, 0]} rotation={[0.22, 0, 0]}>
        <boxGeometry args={[largo + 0.3, 0.04, ancho / 2 + 0.3]} />
        <meshLambertMaterial color={PALETA.lamina} flatShading />
      </mesh>
      <mesh position={[0, alto + 0.15, 0]} rotation={[-0.22, 0, 0]}>
        <boxGeometry args={[largo + 0.3, 0.04, ancho / 2 + 0.3]} />
        <meshLambertMaterial color={PALETA.lamina} flatShading />
      </mesh>
    </group>
  );
}

/* 7. TANQUE / RESERVORIO DE AGUA */
export function TanqueReservorio({ dims, tinte = PALETA.piedra, seed = 99, frugal = false }) {
  const { ancho = 3.6, alto = 2.4 } = dims || {};
  const r = ancho / 2;

  const colorPiedra = useMemo(() => mezclar(PALETA.piedra, tinte, 0.4), [tinte]);

  // Piedras decorativas en la base
  const nPiedras = frugal ? 4 : 8;
  const rng = useMemo(() => crearRng(seed), [seed]);
  const piedras = useMemo(() => {
    return Array.from({ length: nPiedras }, (_, i) => {
      const ang = (i / nPiedras) * Math.PI * 2;
      return {
        x: Math.cos(ang) * (r + 0.25),
        z: Math.sin(ang) * (r + 0.25),
        s: 0.15 + rng() * 0.15,
      };
    });
  }, [r, nPiedras, rng]);

  return (
    <group>
      {/* Placa cemento */}
      <PlacaBase largo={ancho + 0.6} ancho={ancho + 0.6} color={PALETA.concreto} />

      {/* Depósito cilíndrico de piedra */}
      <mesh position={[0, alto / 2, 0]}>
        <cylinderGeometry args={[r, r, alto, frugal ? 10 : 20, 1, true]} />
        <meshLambertMaterial color={colorPiedra} flatShading side={THREE.DoubleSide} />
      </mesh>

      {/* Agua adentro */}
      <mesh position={[0, alto * 0.86, 0]}>
        <cylinderGeometry args={[r * 0.94, r * 0.94, 0.05, frugal ? 10 : 18]} />
        <meshLambertMaterial color={PALETA.agua} flatShading />
      </mesh>

      {/* Tubería galvanizada de llenado */}
      <group position={[r - 0.2, alto * 0.5, 0]}>
        <mesh position={[0, alto * 0.45, 0]}>
          <cylinderGeometry args={[0.04, 0.04, alto * 0.9, 6]} />
          <meshLambertMaterial color={PALETA.lamina} flatShading />
        </mesh>
        {/* Codo que vierte agua */}
        <mesh position={[-0.15, alto * 0.9 - 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.3, 6]} />
          <meshLambertMaterial color={PALETA.lamina} flatShading />
        </mesh>
      </group>

      {/* Piedras rústicas de la base */}
      {piedras.map((p, i) => (
        <mesh key={i} position={[p.x, p.s / 2, p.z]} scale={[p.s, p.s, p.s]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshLambertMaterial color={PALETA.piedra} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* 8. COMPOSTERA */
export function Compostera({ dims, tinte = PALETA.madera, seed = 44, frugal = false }) {
  const { largo = 4.5, ancho = 1.6, alto = 1.2 } = dims || {};
  const rng = useMemo(() => crearRng(seed), [seed]);

  const colorMadera = useMemo(() => mezclar(PALETA.madera, tinte, 0.3), [tinte]);

  // Tres niveles de compostaje deterministas
  const montones = useMemo(() => {
    return [
      { color: '#5f8a3f', h: 0.4 + rng() * 0.2 }, // Fresco (verde)
      { color: '#7a5a38', h: 0.5 + rng() * 0.15 }, // Medio (marrón)
      { color: '#3a2a18', h: 0.3 + rng() * 0.1 }, // Listo (tierra oscura)
    ];
  }, [rng]);

  return (
    <group>
      <PlacaBase largo={largo + 0.2} ancho={ancho + 0.2} color={PALETA.tierraClara} />

      {/* Columnas divisorias y cajones de madera */}
      {[-largo / 2, -largo / 6, largo / 6, largo / 2].map((x, i) => (
        <group key={i}>
          {/* Postes */}
          {[-ancho / 2, ancho / 2].map((z) => (
            <mesh key={z} position={[x, alto / 2, z]}>
              <cylinderGeometry args={[0.04, 0.04, alto, 4]} />
              <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
            </mesh>
          ))}
          {/* Tabla divisoria lateral */}
          {i > 0 && i < 3 && (
            <mesh position={[x, alto / 2, 0]}>
              <boxGeometry args={[0.04, alto * 0.8, ancho]} />
              <meshLambertMaterial color={colorMadera} flatShading />
            </mesh>
          )}
        </group>
      ))}

      {/* Tablas traseras y frontales de retención */}
      {[-ancho / 2, ancho / 2].map((z) => (
        <mesh key={z} position={[0, alto / 2, z]}>
          <boxGeometry args={[largo, alto * 0.7, 0.04]} />
          <meshLambertMaterial color={colorMadera} flatShading />
        </mesh>
      ))}

      {/* Montones de abono orgánico en proceso */}
      {montones.map((m, i) => {
        const x = -largo / 3 + i * (largo / 3);
        return (
          <mesh key={i} position={[x, m.h / 2, 0]} scale={[largo * 0.26, m.h, ancho * 0.75]}>
            <sphereGeometry args={[1, frugal ? 6 : 10, frugal ? 5 : 7, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshLambertMaterial color={m.color} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

// Diccionario unificado para mapeo fácil
// eslint-disable-next-line react-refresh/only-export-components
export const CatalogoInfra3D = {
  invernaderoTunel: InvernaderoTunel,
  gallineroCampo: GallineroCampo,
  galpon: Galpon,
  establo: Establo,
  almacenBodega: AlmacenBodega,
  trojaSecado: TrojaSecado,
  tanqueReservorio: TanqueReservorio,
  compostera: Compostera,
};
