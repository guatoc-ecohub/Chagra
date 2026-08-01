/*
 * EscenaSemillero — ARQUETIPO `semillero`: el SEMILLERO/VIVERO y la propagación.
 *
 * De la familia del `recinto` (un lugar cercado y PROTEGIDO que se camina), pero
 * su lección no es el ciclo del abono ni el manejo de plagas: es cómo se CRÍA la
 * matica desde el grano hasta que aguanta el campo. El espacio mismo enseña la
 * propagación de la finca andina, paso por paso:
 *
 *   · el TÚNEL de media-sombra — arcos con techo traslúcido que resguardan del
 *     frío de la madrugada y del golpe de la lluvia (por eso el semillero va
 *     tapado: la plántula tierna se hiela o se ahoga a la intemperie);
 *   · las BANDEJAS GERMINADORAS — cajones con sustrato y las celdas donde la
 *     semilla despierta: unas apenas asoman, otras ya son plántula (la
 *     germinación contada como progresión, con su humedad);
 *   · las BOLSAS del REPIQUE — cuando la plántula tiene fuerza se pasa de la
 *     bandeja a la bolsa (o a la era): matas más grandes, ya con raíz firme;
 *   · la ERA DE ENDURECIMIENTO — al borde soleado, al aire, unas matas se
 *     ACLIMATAN antes de ir al lote (si salen consentidas del túnel, el sol y el
 *     viento del campo las queman);
 *   · la ESTACIÓN DE SEMILLA — la propia (criolla, guardada en su vasija) al
 *     lado de la comprada (el sobre): de dónde sale lo que se siembra.
 *
 * Todo `MeshLambert`/`Basic`, sin sombras (contrato de EscenaBase3D). Geometría
 * de primitivas: cero GLTF, offline y liviano.
 */
import { useMemo } from 'react';
import EscenaBase3D from './EscenaBase3D.jsx';
import { Fauna } from './FaunaEscena.jsx';
import { CIELOS, PALETA } from '../atmosferaMadre.js';

/* La fauna que ronda el vivero: la mariposa que entra por el borde abierto del
   túnel hacia las matas endurecidas, y el colibrí que asoma. Pocas y por
   criterio (contrato del DR: vida, no enjambre). */
const FAUNA_SEMILLERO = [
  { tipo: 'mariposa', base: [1.0, 0.62, 1.02], patron: 'revoloteo', size: 28, fase: 0.5 },
  { tipo: 'colibri', base: [-0.9, 1.0, 0.5], patron: 'revoloteo', size: 28, fase: 1.7 },
];

/* Un BROTE de bandeja: un conito verde de altura variable. La altura CUENTA la
   etapa (semilla que apenas rompe → plántula de dos hojas). */
function Brote({ pos, h = 0.12, color = '#6fae4a' }) {
  return (
    <mesh position={pos}>
      <coneGeometry args={[0.04, h, 5]} />
      <meshLambertMaterial color={color} flatShading />
    </mesh>
  );
}

/* La MESA del vivero bajo cada bandeja (banco de tablas sobre estacas): en finca
   la bandeja germinadora va ALZADA, no al ras — la altura la separa de la
   humedad del piso y, de paso, hace que la bandeja se LEA como bandeja en el
   encuadre 3/4 (QA visual 2026-07-30: al ras parecía un cajón tirado). */
const MESA_ALTO = 0.2;

/* Una BANDEJA GERMINADORA: mesa de vivero + cajón con sustrato oscuro y una
   retícula de brotes en distintas etapas — la germinación hecha visible.
   Determinista (mismo dibujo 2D↔3D): las etapas salen de un patrón fijo, no de
   aleatorio. */
function Bandeja({ pos, rot = 0 }) {
  // 4 x 3 celdas; la etapa (altura del brote) crece de una esquina a la otra:
  // arriba-izquierda apenas semilla, abajo-derecha ya plántula.
  const celdas = useMemo(() => {
    const cols = 4;
    const filas = 3;
    const out = [];
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < filas; j += 1) {
        const t = (i + j) / (cols + filas - 2); // 0..1 progresión de etapa
        const x = (i - (cols - 1) / 2) * 0.11;
        const z = (j - (filas - 1) / 2) * 0.11;
        out.push({ x, z, h: 0.06 + t * 0.18, color: t < 0.3 ? '#8aa86a' : '#5f9e3f' });
      }
    }
    return out;
  }, []);
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* las patas de la mesa (estacas del banco de vivero) */}
      {[[-0.22, -0.14], [0.22, -0.14], [-0.22, 0.14], [0.22, 0.14]].map(([px, pz], i) => (
        <mesh key={i} position={[px, MESA_ALTO * 0.5, pz]}>
          <cylinderGeometry args={[0.022, 0.028, MESA_ALTO, 5]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
        </mesh>
      ))}
      {/* el tablón de la mesa */}
      <mesh position={[0, MESA_ALTO + 0.015, 0]}>
        <boxGeometry args={[0.62, 0.03, 0.46]} />
        <meshLambertMaterial color={PALETA.madera} flatShading />
      </mesh>
      {/* el borde/cajón de la bandeja (madera clara del vivero) */}
      <mesh position={[0, MESA_ALTO + 0.08, 0]}>
        <boxGeometry args={[0.56, 0.1, 0.42]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
      {/* el sustrato húmedo (tierra negra del semillero) */}
      <mesh position={[0, MESA_ALTO + 0.14, 0]}>
        <boxGeometry args={[0.5, 0.04, 0.36]} />
        <meshLambertMaterial color="#3a2c1c" />
      </mesh>
      {/* los brotes por celda, cada uno en su etapa */}
      {celdas.map((c, i) => (
        <Brote key={i} pos={[c.x, MESA_ALTO + 0.17 + c.h * 0.5, c.z]} h={c.h} color={c.color} />
      ))}
    </group>
  );
}

/* Una BOLSA del repique: la plántula ya crecida, pasada de la bandeja a su bolsa
   negra de vivero. Bolsa (cono truncado oscuro) + tallo + hojas. */
function Bolsa({ pos, alto = 0.34, color = '#4e8f3f' }) {
  const hojas = [
    [0, alto + 0.03, 0, 0.13],
    [0.1, alto - 0.06, 0.04, 0.095],
    [-0.09, alto - 0.05, -0.04, 0.095],
  ];
  return (
    <group position={pos}>
      {/* la bolsa negra con su sustrato */}
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.22, 8]} />
        <meshLambertMaterial color="#2a2622" flatShading />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.02, 8]} />
        <meshLambertMaterial color="#3a2c1c" />
      </mesh>
      {/* el tallo */}
      <mesh position={[0, alto * 0.5 + 0.16, 0]}>
        <cylinderGeometry args={[0.024, 0.034, alto, 5]} />
        <meshLambertMaterial color="#5a6a2e" flatShading />
      </mesh>
      {/* las hojas */}
      {hojas.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y + 0.1, z]}>
          <sphereGeometry args={[r, 8, 7]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* La ESTACIÓN DE SEMILLA: un tablón con la semilla PROPIA (criolla, en su vasija
   de barro con los granos a la vista) al lado de la COMPRADA (el sobre impreso).
   De dónde sale lo que se siembra — y por qué guardar la propia. */
function EstacionSemilla({ pos }) {
  const granos = [
    [-0.03, 0.02], [0.03, -0.02], [0, 0.03], [-0.04, -0.03], [0.05, 0.01],
  ];
  return (
    <group position={pos}>
      {/* el tablón sobre dos soportes */}
      {[-0.24, 0.24].map((dx, i) => (
        <mesh key={i} position={[dx, 0.14, 0]}>
          <cylinderGeometry args={[0.03, 0.035, 0.28, 5]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.68, 0.05, 0.34]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
      {/* semilla PROPIA: la totuma/vasija de barro con los granos criollos */}
      <mesh position={[-0.2, 0.4, 0]}>
        <sphereGeometry args={[0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color="#9a5a34" flatShading />
      </mesh>
      {granos.map(([gx, gz], i) => (
        <mesh key={i} position={[-0.2 + gx, 0.43, gz]}>
          <sphereGeometry args={[0.022, 6, 5]} />
          <meshLambertMaterial color={PALETA.ambar} flatShading />
        </mesh>
      ))}
      {/* semilla COMPRADA: el sobre parado, de color impreso (distinto del barro) */}
      <mesh position={[0.22, 0.42, 0]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[0.16, 0.22, 0.02]} />
        <meshLambertMaterial color="#3f77c7" flatShading />
      </mesh>
      <mesh position={[0.22, 0.46, 0.012]}>
        <boxGeometry args={[0.1, 0.06, 0.006]} />
        <meshLambertMaterial color="#efe7d8" />
      </mesh>
    </group>
  );
}

/* Una REGADERA de mano: la humedad del semillero (regar fino y seguido, no
   ahogar). Cuerpo + pico + asa, en lámina cálida. */
function Regadera({ pos }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.09, 0.1, 0.16, 10]} />
        <meshLambertMaterial color={PALETA.lamina} flatShading />
      </mesh>
      {/* el pico */}
      <mesh position={[0.14, 0.13, 0]} rotation={[0, 0, -0.7]}>
        <cylinderGeometry args={[0.015, 0.02, 0.2, 6]} />
        <meshLambertMaterial color={PALETA.lamina} flatShading />
      </mesh>
      {/* el asa */}
      <mesh position={[-0.02, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.06, 0.012, 6, 12, Math.PI]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
    </group>
  );
}

function Diorama({ params, reducedMotion }) {
  const bandejas = params?.bandejas || [
    { pos: [-0.35, 0, 0.35], rot: 0.1 },
    { pos: [0.32, 0, 0.3], rot: -0.08 },
  ];
  const bolsas = params?.bolsas || [
    { pos: [-1.2, 0, -0.15], alto: 0.34, color: '#4e8f3f' },
    { pos: [-1.15, 0, 0.3], alto: 0.3, color: '#57993f' },
    { pos: [-0.85, 0, -0.55], alto: 0.38, color: '#468637' },
  ];

  // El TÚNEL de media-sombra: arcos (medio-toroide) repartidos a lo largo de z.
  const radio = 1.35;
  const largo = 2.4;
  const arcos = useMemo(() => {
    const n = 4;
    return Array.from({ length: n }, (_, i) => (-largo / 2) + (i / (n - 1)) * largo);
  }, []);

  return (
    <group>
      {/* piso del vivero (tierra apisonada, algo de gravilla) */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2, 28]} />
        <meshLambertMaterial color="#8a7a56" />
      </mesh>
      {/* la cama central del semillero (lomo de tierra bajo el túnel) */}
      <mesh position={[0, 0.04, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.9, 1.3]} />
        <meshLambertMaterial color="#6b5636" />
      </mesh>

      {/* EL TÚNEL: los arcos de media-sombra (protección del frío y la lluvia) */}
      {arcos.map((z, i) => (
        <mesh key={i} position={[0, 0, z]}>
          <torusGeometry args={[radio, 0.045, 6, 22, Math.PI]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
      ))}
      {/* el caballete: la vara que amarra los arcos por la cumbrera — sin él los
          arcos flotaban sueltos y el túnel no se leía como estructura */}
      <mesh position={[0, radio, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, largo + 0.2, 6]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
      {/* el techo traslúcido (la media-sombra): media-luna extruida a lo largo */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radio, radio, largo, 20, 1, true, Math.PI, Math.PI]} />
        <meshBasicMaterial
          color={PALETA.follajeClaro}
          transparent
          opacity={0.28}
          side={2}
          depthWrite={false}
        />
      </mesh>
      {/* el CALOR GUARDADO: una luz tibia local dentro del túnel (sin sombras,
          patrón de luces de lectura del corte de la milpa #2815) — bajo la
          media-sombra las bandejas quedaban apagadas; esta las hace leer y de
          paso CUENTA la lección: adentro se guarda el calor de la helada */}
      <pointLight position={[0, 0.95, 0.2]} intensity={0.55} distance={2.3} color="#ffefc9" />

      {/* las BANDEJAS germinadoras con sus brotes por etapa */}
      {bandejas.map((b, i) => (
        <Bandeja key={i} pos={b.pos} rot={b.rot} />
      ))}
      {/* la regadera: la humedad del semillero */}
      <Regadera pos={[0.75, 0, 0.2]} />

      {/* las BOLSAS del repique (plántulas ya crecidas, con raíz firme) */}
      {bolsas.map((b, i) => (
        <Bolsa key={i} pos={b.pos} alto={b.alto} color={b.color} />
      ))}

      {/* la ESTACIÓN DE SEMILLA: la propia y la comprada, al fondo */}
      <EstacionSemilla pos={[1.05, 0, -0.55]} />

      {/* la ERA DE ENDURECIMIENTO: al borde soleado, FUERA del techo. El parche
          claro y tibio la vuelve LUGAR (el borde donde pega el sol), no dos
          bolsas sueltas en el piso */}
      <mesh position={[1.0, 0.005, 0.95]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.62, 20]} />
        <meshLambertMaterial color="#b09a5e" />
      </mesh>
      <Bolsa pos={[0.85, 0, 1.05]} alto={0.42} color="#5a9a3f" />
      <Bolsa pos={[1.18, 0, 0.78]} alto={0.38} color="#4e8f3f" />

      {/* la fauna que anima el vivero (mariposa/colibrí) */}
      <Fauna items={FAUNA_SEMILLERO} reducedMotion={reducedMotion} />
    </group>
  );
}

/* Cielo propio del vivero: parte de CIELOS.huerta con un pelín más de luz para
   que los verdes tiernos de las bandejas canten bajo la media-sombra. Se sigue
   mezclando hacia la hora dorada del valle en EscenaBase3D (cohesión diurna). */
const CIELO_SEMILLERO = { ...CIELOS.huerta, fondo: '#dcebc6', cielo: '#f2f7e2', intensidad: 1.12 };

/* Encuadre del vivero (patrón EscenaSanidad, QA visual 2026-07-30): con el zoom
   7 del manifiesto el semillero quedaba en miniatura — el túnel un moño y las
   bandejas/bolsas/estación ilegibles. Menor zoom → cámara más cerca; la niebla,
   el anillo y la órbita escalan solos (contrato de EscenaBase3D). `camara` fija
   un 3/4 que mira POR LA BOCA ABIERTA del túnel: se ve adentro (las bandejas en
   su mesa), y a los lados el repique, la semilla y la era soleada. */
const ZOOM_SEMILLERO = 5.4;
const CAMARA_SEMILLERO = {
  position: /** @type {[number, number, number]} */ ([
    ZOOM_SEMILLERO * 0.52, ZOOM_SEMILLERO * 0.42, ZOOM_SEMILLERO * 1.0,
  ]),
  fov: 40,
};

export default function EscenaSemillero(props) {
  return (
    <EscenaBase3D
      {...props}
      cielo={CIELO_SEMILLERO}
      camara={CAMARA_SEMILLERO}
      entrada={{ ...props.entrada, zoom: ZOOM_SEMILLERO, centro: [0, 0.45, 0] }}
    >
      <Diorama params={props.params} reducedMotion={props.reducedMotion} />
    </EscenaBase3D>
  );
}
