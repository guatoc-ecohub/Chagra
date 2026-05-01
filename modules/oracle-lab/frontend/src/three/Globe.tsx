/**
 * Globe — esfera 3D con jerarquía geográfica progresiva hacia Guatoc.
 *
 * Capas (de menor a mayor visibilidad):
 *   1. Wireframe sphere base (referencia)
 *   2. Outline América (continente)
 *   3. Polígono Colombia (país)
 *   4. Polígono Cundinamarca (departamento)
 *   5. Marker Choachí (municipio)
 *   6. Pin Guatoc + onda + cone (punto exacto)
 *
 * Coordenadas hand-coded — fidelidad cartográfica simplificada para HUD.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COLOR_CYAN = '#0E92A6';
const COLOR_CYAN_BRIGHT = '#1AB8CC';
const COLOR_GLOW = '#4ED4E5';
// Coords reales Guatoc (Vereda El Curí), congruente con Chagra defaults.js
const GUATOC_LAT = 4.5306;
const GUATOC_LON = -73.9247;
// Casco urbano de Choachí — referencia visual ligeramente al sur-oeste del pin
const CHOACHI_LAT = 4.5253;
const CHOACHI_LON = -73.9200;

// América — outline grueso continentes (N→S→N closed loop)
const AMERICA_OUTLINE: Array<[number, number]> = [
  // Norteamérica costa oeste (Alaska→Mexico)
  [70, -165], [60, -155], [55, -135], [48, -125], [37, -122], [32, -117],
  [25, -110], [22, -106], [18, -103], [16, -97], [18, -95],
  // Centroamérica + Caribe sur
  [16, -91], [13, -87], [10, -84], [9, -80], [8, -77], [12, -71],
  // Sudamérica costa norte → este (Venezuela/Brasil/costa atlántica)
  [10, -64], [5, -52], [-1, -49], [-8, -34], [-13, -38], [-23, -43],
  [-30, -48], [-35, -57], [-50, -68], [-55, -68],
  // Sudamérica costa sur + oeste (Patagonia→Perú→Ecuador→Panamá)
  [-50, -75], [-40, -73], [-30, -71], [-18, -71], [-8, -79], [0, -80],
  [5, -77], [9, -79],
  // Centroamérica oeste (Costa Rica→México)
  [10, -85], [15, -94], [18, -100], [20, -106], [25, -112], [32, -117],
  // Norteamérica costa oeste de vuelta
  [42, -124], [50, -127], [60, -147], [65, -160], [70, -165],
];

// Colombia — outline detallado (~38 puntos, fidelidad ~50 km).
// Recorrido: Punta Gallinas → Caribe → Darién → Pacífico → Ecuador → Trapecio
// Amazónico → Orinoco/Vichada → Norte de Santander → Guajira → close.
// Mantiene las features icónicas: península Guajira, costa Pacífico curva,
// trapecio amazónico apuntando al sur, bulto Orinoco al este.
const COLOMBIA_OUTLINE: Array<[number, number]> = [
  // Caribe norte: Guajira → Magdalena → Atlántico → Bolívar → Sucre → Córdoba
  [12.46, -71.66],   // Punta Gallinas (extremo N)
  [12.29, -72.19],   // Cabo de la Vela
  [11.55, -72.92],   // Riohacha
  [11.24, -74.21],   // Santa Marta
  [10.96, -74.79],   // Barranquilla
  [10.39, -75.50],   // Cartagena
  [9.40, -75.96],    // Tolú/Coveñas
  [8.74, -76.65],    // Montería costa
  [8.10, -76.73],    // Turbo (Urabá)
  [8.04, -77.35],    // Acandí (frontera Panamá norte)
  [7.61, -77.74],    // Sapzurro/Darién
  // Pacífico: Chocó → Valle → Cauca → Nariño
  [6.93, -77.55],    // Bahía Solano norte
  [6.22, -77.40],    // Nuquí
  [5.40, -77.10],    // Buenaventura aprox
  [3.88, -77.05],    // Buenaventura
  [3.03, -77.45],    // Guapi
  [2.10, -78.40],    // Iscuandé
  [1.81, -78.79],    // Tumaco (extremo SO)
  [1.45, -78.65],    // Mira río
  // Frontera Ecuador → Putumayo → Caquetá → trapecio Amazónico
  [0.81, -77.72],    // Tulcán-area
  [0.45, -77.10],    // San Miguel río (Putumayo)
  [-0.60, -75.20],   // Putumayo medio
  [-2.30, -73.40],   // Cara-paraná
  [-3.80, -70.10],   // Tarapacá
  [-4.21, -69.95],   // Leticia (extremo S — trapecio)
  // Frontera Brasil/Perú al noreste
  [-2.10, -69.50],   // Pebas border
  [-0.10, -69.65],   // Apaporis border
  [1.00, -69.80],    // Mitú zona
  [2.10, -67.80],    // San Felipe
  // Orinoco/Vichada → Arauca
  [4.10, -67.85],    // Inírida zona
  [6.19, -67.49],    // Puerto Carreño (esquina Orinoco)
  [6.21, -69.40],    // Arauca río
  [6.95, -71.00],    // Saravena zona
  // Norte de Santander → Cesar → vuelta a Guajira
  [7.89, -72.50],    // Cúcuta
  [8.64, -72.74],    // Tibú
  [9.50, -73.10],    // Codazzi/Cesar centro
  [10.85, -72.82],   // Maicao zona
  [11.39, -72.24],   // Maicao
  [11.95, -71.85],   // Castilletes
  [12.46, -71.66],   // close — vuelve a Punta Gallinas
];

// Cundinamarca — hexágono simplificado alrededor de Bogotá
const CUNDINAMARCA_OUTLINE: Array<[number, number]> = [
  [5.83, -74.40],  // Carmen de Carupa norte
  [5.50, -73.55],
  [4.80, -73.10],  // Medina este
  [4.00, -73.50],
  [3.74, -74.45],  // Cabrera sur
  [4.30, -74.85],  // Yacopí oeste
  [5.30, -74.75],
  [5.83, -74.40],  // close
];

// Choachí — bbox aproximado (5 km × 5 km centrado en Guatoc)
const CHOACHI_BBOX: Array<[number, number]> = [
  [4.575, -73.965],
  [4.575, -73.880],
  [4.480, -73.880],
  [4.480, -73.965],
  [4.575, -73.965],
];

function latLonToXYZ(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/** Convierte una secuencia lat/lon en geometría de línea sobre la esfera (great-circle approximate). */
function buildGeoLine(points: Array<[number, number]>, radius: number, segments = 6): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [lat1, lon1] = points[i];
    const [lat2, lon2] = points[i + 1];
    for (let s = 0; s < segments; s++) {
      const t = s / segments;
      const lat = lat1 + (lat2 - lat1) * t;
      const lon = lon1 + (lon2 - lon1) * t;
      const p = latLonToXYZ(lat, lon, radius);
      positions.push(p.x, p.y, p.z);
    }
  }
  // Close last segment
  const last = latLonToXYZ(points[points.length - 1][0], points[points.length - 1][1], radius);
  positions.push(last.x, last.y, last.z);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geom;
}

interface Props {
  radius?: number;
  onReveal?: () => void;
  revealed?: boolean;
}

// Rotación target: lleva Guatoc a la cara visible (z+) cuando se hace reveal.
// theta_default = (lon + 180) * π/180. Para que Guatoc quede en z+ necesitamos
// rotar el globo en Y por -(theta_default - π/2).
const TARGET_ROTATION_Y = -((GUATOC_LON + 180) * Math.PI / 180 - Math.PI / 2);

export function Globe({ radius = 3, onReveal, revealed = false }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const pinRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const choachiPulseRef = useRef<THREE.Mesh>(null);
  const installationRef = useRef<THREE.Group>(null);

  const guatocPosition = useMemo(() => latLonToXYZ(GUATOC_LAT, GUATOC_LON, radius * 1.02), [radius]);
  const choachiCenter = useMemo(() => latLonToXYZ(CHOACHI_LAT, CHOACHI_LON, radius * 1.015), [radius]);

  // Geometrías derivadas de polígonos hand-coded
  const americaGeom = useMemo(() => buildGeoLine(AMERICA_OUTLINE, radius * 1.005, 4), [radius]);
  const colombiaGeom = useMemo(() => buildGeoLine(COLOMBIA_OUTLINE, radius * 1.008, 8), [radius]);
  const cundinamarcaGeom = useMemo(() => buildGeoLine(CUNDINAMARCA_OUTLINE, radius * 1.011, 10), [radius]);
  const choachiGeom = useMemo(() => buildGeoLine(CHOACHI_BBOX, radius * 1.014, 4), [radius]);

  useFrame((state) => {
    if (!groupRef.current) return;

    // Rotación: libre antes del reveal, lerp al target después
    if (revealed) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        TARGET_ROTATION_Y,
        0.04
      );
    } else {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.06;
    }

    if (pinRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      pinRef.current.scale.setScalar(pulse);
    }

    if (ringRef.current) {
      const t = (state.clock.elapsedTime % 2) / 2;
      ringRef.current.scale.setScalar(1 + t * 1.5);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.6;
    }

    if (choachiPulseRef.current) {
      const breath = 0.7 + Math.sin(state.clock.elapsedTime * 1.5) * 0.3;
      (choachiPulseRef.current.material as THREE.MeshBasicMaterial).opacity = breath * 0.5;
    }

    // Instalación detail — orbitas y rotación post-reveal
    if (installationRef.current) {
      installationRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      const targetScale = revealed ? 1 : 0;
      installationRef.current.scale.setScalar(
        THREE.MathUtils.lerp(installationRef.current.scale.x, targetScale, 0.05)
      );
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onReveal) onReveal();
  };

  return (
    <group ref={groupRef} onClick={handleClick}>
      {/* Base — esfera wireframe */}
      <mesh>
        <sphereGeometry args={[radius, 32, 24]} />
        <meshBasicMaterial color={COLOR_CYAN} wireframe transparent opacity={0.18} />
      </mesh>

      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[radius * 0.95, 16, 12]} />
        <meshBasicMaterial color={COLOR_CYAN} transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>

      {/* Latitud rings */}
      {[-30, 0, 30].map((lat) => (
        <mesh key={`lat-${lat}`} rotation={[Math.PI / 2 - (lat * Math.PI) / 180, 0, 0]}>
          <torusGeometry args={[radius * Math.cos((lat * Math.PI) / 180), 0.004, 8, 64]} />
          <meshBasicMaterial color={COLOR_CYAN} transparent opacity={0.22} />
        </mesh>
      ))}

      {/* Longitud rings */}
      {[0, 60, 120].map((lon) => (
        <mesh key={`lon-${lon}`} rotation={[0, (lon * Math.PI) / 180, 0]}>
          <torusGeometry args={[radius, 0.004, 8, 64]} />
          <meshBasicMaterial color={COLOR_CYAN} transparent opacity={0.15} />
        </mesh>
      ))}

      {/* Capa 1 — América (sutil) */}
      <line>
        <primitive object={americaGeom} attach="geometry" />
        <lineBasicMaterial color={COLOR_CYAN} transparent opacity={0.45} linewidth={1} />
      </line>

      {/* Capa 2 — Colombia (más fuerte) */}
      <line>
        <primitive object={colombiaGeom} attach="geometry" />
        <lineBasicMaterial color={COLOR_CYAN_BRIGHT} transparent opacity={0.75} linewidth={2} />
      </line>

      {/* Capa 3 — Cundinamarca outline */}
      <line>
        <primitive object={cundinamarcaGeom} attach="geometry" />
        <lineBasicMaterial color={COLOR_GLOW} transparent opacity={0.85} linewidth={2} />
      </line>

      {/* Capa 3b — Cundinamarca disco glow tangente (visible a cualquier escala) */}
      {(() => {
        const center = latLonToXYZ(4.7, -74.0, radius * 1.012);
        return (
          <group position={center}>
            <mesh lookAt={[0, 0, 0]}>
              <ringGeometry args={[0.08, 0.16, 48]} />
              <meshBasicMaterial color={COLOR_GLOW} transparent opacity={0.55} side={THREE.DoubleSide} />
            </mesh>
            <mesh lookAt={[0, 0, 0]}>
              <ringGeometry args={[0.16, 0.18, 48]} />
              <meshBasicMaterial color={COLOR_GLOW} transparent opacity={0.85} side={THREE.DoubleSide} />
            </mesh>
            <mesh lookAt={[0, 0, 0]}>
              <circleGeometry args={[0.08, 32]} />
              <meshBasicMaterial color={COLOR_GLOW} transparent opacity={0.10} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })()}

      {/* Capa 4 — Choachí (bbox) */}
      <line>
        <primitive object={choachiGeom} attach="geometry" />
        <lineBasicMaterial color={COLOR_GLOW} transparent opacity={0.95} linewidth={2} />
      </line>

      {/* Capa 4b — Choachí glow disco respirando */}
      <mesh ref={choachiPulseRef} position={choachiCenter} lookAt={[0, 0, 0]}>
        <ringGeometry args={[0.04, 0.10, 32]} />
        <meshBasicMaterial color={COLOR_GLOW} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Capa 5 — Guatoc pin pulsante */}
      <mesh ref={pinRef} position={guatocPosition}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshBasicMaterial color={COLOR_GLOW} />
      </mesh>

      {/* Capa 5b — onda expansiva del pin */}
      <mesh ref={ringRef} position={guatocPosition} lookAt={[0, 0, 0]}>
        <ringGeometry args={[0.07, 0.11, 32]} />
        <meshBasicMaterial color={COLOR_GLOW} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* Capa 5c — vector cone saliente (señal) */}
      <mesh position={guatocPosition.clone().multiplyScalar(1.18)}>
        <coneGeometry args={[0.04, 0.22, 6]} />
        <meshBasicMaterial color={COLOR_GLOW} transparent opacity={0.85} />
      </mesh>

      {/* Capa 6 — Instalación detail (sistema solar Guatoc, visible post-reveal) */}
      <group ref={installationRef} position={guatocPosition.clone().multiplyScalar(1.35)} scale={0}>
        {/* Sol central — núcleo de la instalación */}
        <mesh>
          <sphereGeometry args={[0.06, 16, 12]} />
          <meshBasicMaterial color="#FFD27A" />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.10, 16, 12]} />
          <meshBasicMaterial color="#FFD27A" transparent opacity={0.25} />
        </mesh>

        {/* Órbita 1 — Sistema solar (panel) — amarillo */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.18, 0.0015, 6, 48]} />
          <meshBasicMaterial color="#FFD27A" transparent opacity={0.5} />
        </mesh>
        <mesh position={[0.18, 0, 0]}>
          <boxGeometry args={[0.04, 0.04, 0.005]} />
          <meshBasicMaterial color="#FFD27A" />
        </mesh>

        {/* Órbita 2 — Clima (sensor) — cyan */}
        <mesh rotation={[Math.PI / 2.4, Math.PI / 6, 0]}>
          <torusGeometry args={[0.26, 0.0015, 6, 48]} />
          <meshBasicMaterial color={COLOR_GLOW} transparent opacity={0.45} />
        </mesh>
        <mesh position={[0.18, 0.05, 0.18]}>
          <octahedronGeometry args={[0.025, 0]} />
          <meshBasicMaterial color={COLOR_GLOW} />
        </mesh>

        {/* Órbita 3 — Invernadero (verde) */}
        <mesh rotation={[Math.PI / 1.8, -Math.PI / 4, 0]}>
          <torusGeometry args={[0.34, 0.0015, 6, 48]} />
          <meshBasicMaterial color="#5FE3A8" transparent opacity={0.45} />
        </mesh>
        <mesh position={[-0.30, 0.10, 0.10]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshBasicMaterial color="#5FE3A8" />
        </mesh>

        {/* Órbita 4 — Seguridad (rojo apagado) */}
        <mesh rotation={[Math.PI / 3, Math.PI / 3, Math.PI / 6]}>
          <torusGeometry args={[0.42, 0.0015, 6, 48]} />
          <meshBasicMaterial color="#FF6B6B" transparent opacity={0.40} />
        </mesh>
        <mesh position={[0.30, -0.15, 0.20]}>
          <coneGeometry args={[0.022, 0.04, 4]} />
          <meshBasicMaterial color="#FF6B6B" />
        </mesh>

        {/* Órbita 5 — IA / Mycelium (cyan brillante exterior) */}
        <mesh rotation={[Math.PI / 5, -Math.PI / 3, Math.PI / 4]}>
          <torusGeometry args={[0.50, 0.0015, 6, 48]} />
          <meshBasicMaterial color={COLOR_CYAN_BRIGHT} transparent opacity={0.5} />
        </mesh>
        <mesh position={[-0.40, 0.20, -0.20]}>
          <tetrahedronGeometry args={[0.030, 0]} />
          <meshBasicMaterial color={COLOR_CYAN_BRIGHT} />
        </mesh>
      </group>
    </group>
  );
}
