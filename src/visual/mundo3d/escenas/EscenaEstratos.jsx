/*
 * EscenaEstratos — ARQUETIPO `estratos`: la VERTICALIDAD como lección.
 *
 * Sirve DOS mundos con la MISMA geometría, elegidos por datos (DR §4.2, "una
 * entrada = un mundo; cero código de escena nuevo"):
 *
 *   · `disenio`  → params.estratos: los 7 estratos del BOSQUE COMESTIBLE (dosel
 *                  → raíz). La verticalidad ES el diseño de la finca.
 *   · `pisos`    → params.pisos: la LADERA ANDINA en corte, el gradiente
 *                  ALTITUDINAL (cálido → templado → frío → páramo). La altura
 *                  manda: en cada piso crece lo suyo. Señal SUTIL de cambio
 *                  climático (termofilización: los pisos suben), sin catástrofe.
 *
 * Bandas/terrazas con vegetación low-poly repetida y `MeshLambert` sin sombras
 * (DR §6). Con `params.pisos` presente se dibuja la ladera; si no, el bosque
 * comestible de siempre (retro-compatible byte a byte para `disenio`).
 */
import { useMemo } from 'react';
import EscenaBase3D from './EscenaBase3D.jsx';
import { Fauna } from './FaunaEscena.jsx';
import { faunaDeMundo } from '../faunaFuncional.js';
import { CIELOS, PALETA } from '../atmosferaMadre.js';

/* La fauna funcional por estrato (POLINIZADORES en dosel/sotobosque + un
   DESCOMPONEDOR en la hojarasca, para `disenio`; POLINIZADORES del aire
   templado/frío para `pisos`) vive en faunaFuncional.js, por mundo. */

const ESTRATOS_DEF = [
  { nombre: 'emergente', alto: 3.4, color: '#2f5f34', r: 0.6 },
  { nombre: 'dosel', alto: 2.6, color: '#3a6f3f', r: 0.7 },
  { nombre: 'sub-dosel', alto: 1.9, color: '#4a7d45', r: 0.6 },
  { nombre: 'arbusto', alto: 1.2, color: '#5f8a3f', r: 0.5 },
  { nombre: 'herbáceo', alto: 0.7, color: '#7aa24a', r: 0.4 },
  { nombre: 'rastrero', alto: 0.35, color: '#8fae55', r: 0.5 },
  { nombre: 'raíz', alto: 0.15, color: '#8a6a44', r: 0.4 },
];

function Planta({ x, z, alto, color, r }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, alto * 0.35, 0]}>
        <cylinderGeometry args={[0.06, 0.09, alto * 0.7, 5]} />
        <meshLambertMaterial color={PALETA.tierra} flatShading />
      </mesh>
      <mesh position={[0, alto * 0.78, 0]}>
        <coneGeometry args={[r, alto * 0.7, 7]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

/* ── El bosque comestible (mundo `disenio`) — sin cambios ─────────────────── */
function DioramaEstratos({ params, reducedMotion, fauna }) {
  const estratos = params?.estratos || ESTRATOS_DEF;
  const plantas = useMemo(() => {
    const out = [];
    let s = 7;
    estratos.forEach((e, ei) => {
      const cuenta = ei < 2 ? 2 : 3;
      for (let i = 0; i < cuenta; i++) {
        s = (s * 1103515245 + 12345) >>> 0;
        const x = ((s % 1000) / 1000 - 0.5) * 3.8;
        s = (s * 1103515245 + 12345) >>> 0;
        const z = ((s % 1000) / 1000 - 0.5) * 2.4 - 0.4;
        out.push({ key: `${ei}-${i}`, x, z, alto: e.alto, color: e.color, r: e.r });
      }
    });
    return out;
  }, [estratos]);
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.6, 30]} />
        <meshLambertMaterial color="#6d5030" />
      </mesh>
      {plantas.map((p) => (
        <Planta key={p.key} x={p.x} z={p.z} alto={p.alto} color={p.color} r={p.r} />
      ))}
      {/* la vida repartida por estratos: polinizadores arriba, descomponedor abajo */}
      <Fauna items={fauna} reducedMotion={reducedMotion} />
    </group>
  );
}

/* ═══ LA LADERA ANDINA (mundo `pisos`) ════════════════════════════════════════
 * Cuatro terrazas que suben del cálido al páramo, cada una con su cultivo
 * emblemático low-poly y su color térmico (dorado abajo → azul-frío/blanco
 * arriba). Vida sólo donde de veras vive: colibrí y mariposa en templado/frío;
 * el páramo va sin bichos (honestidad ecológica) y con niebla que capta agua.
 */

/* Cuánto sube y cuánto se mete al fondo cada piso (staircase de ladera). */
const PISO_SUBE = 1.15;
const PISO_FONDO = 0.7;
const pisoY = (i) => 0.2 + i * PISO_SUBE; // superficie de la terraza i
const pisoZ = (i) => 0.6 - i * PISO_FONDO; // se recede al subir (profundidad)

/* Plátano/frutal (piso cálido): pseudotallo verde + hojas grandes colgantes. */
function Platano() {
  return (
    <group>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 0.76, 6]} />
        <meshLambertMaterial color="#7d8a3e" flatShading />
      </mesh>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh
          key={k}
          position={[Math.cos((k / 5) * Math.PI * 2) * 0.16, 0.74, Math.sin((k / 5) * Math.PI * 2) * 0.16]}
          rotation={[Math.PI * 0.42, (k / 5) * Math.PI * 2, 0]}
          scale={[0.5, 1, 1]}
        >
          <coneGeometry args={[0.1, 0.62, 4]} />
          <meshLambertMaterial color="#4f7a34" flatShading />
        </mesh>
      ))}
      {/* racimo (fruto) */}
      <mesh position={[0.1, 0.5, 0.08]} scale={[0.6, 1, 0.6]}>
        <sphereGeometry args={[0.12, 6, 5]} />
        <meshLambertMaterial color="#b9c24a" flatShading />
      </mesh>
    </group>
  );
}

/* Cafeto de sombra (piso templado): arbusto redondo + cerezas rojas. */
function Cafeto() {
  return (
    <group>
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.26, 5]} />
        <meshLambertMaterial color={PALETA.tierra} flatShading />
      </mesh>
      <mesh position={[0, 0.42, 0]} scale={[1, 0.95, 1]}>
        <sphereGeometry args={[0.28, 7, 6]} />
        <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
      </mesh>
      {[0, 1, 2, 3].map((k) => (
        <mesh
          key={k}
          position={[Math.cos((k / 4) * Math.PI * 2) * 0.24, 0.42 + (k % 2) * 0.08, Math.sin((k / 4) * Math.PI * 2) * 0.24]}
        >
          <sphereGeometry args={[0.04, 5, 4]} />
          <meshLambertMaterial color="#c0392b" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Papa (piso frío): mata baja y matoja + flores lilas. */
function Papa() {
  return (
    <group>
      <mesh position={[0, 0.14, 0]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.3, 7, 6]} />
        <meshLambertMaterial color={PALETA.follaje} flatShading />
      </mesh>
      <mesh position={[0.22, 0.11, 0.14]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.18, 6, 5]} />
        <meshLambertMaterial color="#6d9748" flatShading />
      </mesh>
      {[[-0.1, 0.3, 0.08], [0.14, 0.28, -0.05]].map((p, k) => (
        <mesh key={k} position={/** @type {[number, number, number]} */ (p)}>
          <sphereGeometry args={[0.035, 5, 4]} />
          <meshLambertMaterial color="#d3c2e6" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Frailejón (Espeletia, Asteraceae — páramo): roseta CAULESCENTE, la forma que
   lo define (Bitácora de flora, Inst. Humboldt): tronco de hojas viejas
   marcescentes (columna gris-parda, no leña) + roseta de hojas gruesas y
   velludas que suben, PLATEADAS por la pubescencia que las abriga del frío y la
   radiación, coronadas por capítulos AMARILLOS (son girasoles de altura). Ref.
   E. grandiflora (Chingaza/Sumapaz), E. hartwegiana (nevados). NO es cultivo: es
   conservación (el páramo se cuida, no se ara). */
function Frailejon() {
  return (
    <group>
      {/* tronco: columna de hojas muertas persistentes (marcescencia), fibrosa */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.64, 7]} />
        <meshLambertMaterial color="#6f5e44" flatShading />
      </mesh>
      {/* roseta: hojas apuntando arriba-afuera, plateadas por la pubescencia */}
      {Array.from({ length: 10 }, (_, k) => (
        <mesh
          key={k}
          position={[Math.cos((k / 10) * Math.PI * 2) * 0.11, 0.66, Math.sin((k / 10) * Math.PI * 2) * 0.11]}
          rotation={[Math.PI * 0.26, (k / 10) * Math.PI * 2, 0]}
        >
          <coneGeometry args={[0.05, 0.36, 4]} />
          <meshLambertMaterial color="#b3bda0" flatShading />
        </mesh>
      ))}
      {/* cogollo: las hojas nuevas, las más blancas (máxima pubescencia) */}
      <mesh position={[0, 0.78, 0]}>
        <coneGeometry args={[0.11, 0.2, 6]} />
        <meshLambertMaterial color="#cdd4c2" flatShading />
      </mesh>
      {/* capítulos amarillos (Asteraceae): flores sobre tallitos que asoman de la
          roseta — el rasgo que faltaba, y el que pinta de amarillo el páramo */}
      {[0, 1, 2, 3].map((k) => {
        const a = (k / 4) * Math.PI * 2 + 0.6;
        const fx = Math.cos(a) * 0.19;
        const fz = Math.sin(a) * 0.19;
        return (
          <group key={`flor-${k}`} position={[fx, 0.74, fz]}>
            <mesh position={[0, 0.07, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.14, 4]} />
              <meshLambertMaterial color="#7f8a48" flatShading />
            </mesh>
            <mesh position={[0, 0.15, 0]} scale={[1, 0.5, 1]}>
              <sphereGeometry args={[0.045, 7, 5]} />
              <meshLambertMaterial color="#e6bf2e" flatShading />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

const CULTIVOS = { platano: Platano, cafe: Cafeto, papa: Papa, frailejon: Frailejon };

function SiluetaCultivo({ tipo, x, y, z, esc = 1 }) {
  const Comp = CULTIVOS[tipo];
  if (!Comp) return null;
  return (
    <group position={[x, y, z]} scale={[esc, esc, esc]}>
      <Comp />
    </group>
  );
}

/* Puf de niebla del páramo (capta agua): esfera achatada, translúcida, quieta
   (digna con reduced-motion: no se mueve, no desaparece). */
function Niebla({ x, y, z, r = 0.5 }) {
  return (
    <mesh position={[x, y, z]} scale={[1, 0.34, 1]}>
      <sphereGeometry args={[r, 8, 6]} />
      <meshBasicMaterial color="#eef4f4" transparent opacity={0.5} />
    </mesh>
  );
}

/* Color del talud de tierra entre terrazas: más cálido abajo, más rocoso y frío
   arriba (el suelo también cuenta el gradiente térmico). */
const TALUD_COLOR = ['#8a6a44', '#87663f', '#75593a', '#68554a'];

function DioramaPisos({ params, reducedMotion, fauna }) {
  const pisos = useMemo(() => params?.pisos || [], [params?.pisos]);
  // Cultivos por terraza, con aire (3 por piso, jitter y escala deterministas —
  // antes iban 2 matas diminutas por piso y la ladera se veía pelada).
  const siembra = useMemo(() => {
    const out = [];
    let s = 11;
    pisos.forEach((p, i) => {
      const cuenta = 3;
      const ancho = 0.72 - i * 0.07; // las terrazas se angostan al subir
      for (let j = 0; j < cuenta; j++) {
        s = (s * 1103515245 + 12345) >>> 0;
        const x = (j - (cuenta - 1) / 2) * ancho + ((s % 1000) / 1000 - 0.5) * 0.3;
        s = (s * 1103515245 + 12345) >>> 0;
        const z = pisoZ(i) + ((s % 1000) / 1000 - 0.5) * 0.45;
        s = (s * 1103515245 + 12345) >>> 0;
        const esc = 0.85 + ((s % 1000) / 1000) * 0.35;
        out.push({ key: `${i}-${j}`, tipo: p.cultivo, x, y: pisoY(i) + 0.07, z, esc });
      }
    });
    return out;
  }, [pisos]);

  // Pasto/paja y piedras por terraza: textura menuda que quita lo "pelado"
  // sin robarse el protagonismo de los cultivos. Determinista (LCG).
  const menudencia = useMemo(() => {
    const out = [];
    let s = 29;
    pisos.forEach((p, i) => {
      const rMax = 1.05 - i * 0.13;
      for (let k = 0; k < 6; k++) {
        s = (s * 1103515245 + 12345) >>> 0;
        const a = ((s % 1000) / 1000) * Math.PI * 2;
        s = (s * 1103515245 + 12345) >>> 0;
        const rr = 0.35 + ((s % 1000) / 1000) * (rMax - 0.35);
        out.push({
          key: `t-${i}-${k}`,
          tipo: 'pasto',
          x: Math.cos(a) * rr,
          y: pisoY(i) + 0.08,
          z: pisoZ(i) + Math.sin(a) * rr * 0.55,
          // paja amarillenta en el páramo, pasto verde abajo
          color: i === pisos.length - 1 ? '#b8b183' : '#7a9a3f',
        });
      }
      if (i >= 2) {
        s = (s * 1103515245 + 12345) >>> 0;
        const a = ((s % 1000) / 1000) * Math.PI * 2;
        out.push({
          key: `r-${i}`,
          tipo: 'roca',
          x: Math.cos(a) * (rMax - 0.15),
          y: pisoY(i) + 0.12,
          z: pisoZ(i) + Math.sin(a) * (rMax - 0.15) * 0.55,
          color: PALETA.piedra,
        });
      }
    });
    return out;
  }, [pisos]);

  return (
    <group position={[0, 0, 0]}>
      {/* la ladera al fondo: silueta de montaña por capas (profundidad) */}
      <mesh position={[-0.6, 1.3, -3.4]}>
        <coneGeometry args={[3.3, 4.6, 5]} />
        <meshLambertMaterial color="#9fb4bc" flatShading />
      </mesh>
      <mesh position={[1.4, 1.0, -3.0]}>
        <coneGeometry args={[2.6, 3.7, 5]} />
        <meshLambertMaterial color="#adc0c6" flatShading />
      </mesh>
      {/* nieve en los picos: remata el cuento térmico (arriba, el frío manda) */}
      <mesh position={[-0.6, 3.22, -3.39]}>
        <coneGeometry args={[0.52, 0.78, 5]} />
        <meshLambertMaterial color="#e9f1f2" flatShading />
      </mesh>
      <mesh position={[1.4, 2.6, -2.99]}>
        <coneGeometry args={[0.34, 0.52, 5]} />
        <meshLambertMaterial color="#e9f1f2" flatShading />
      </mesh>
      {/* cordillera lejana, más pálida: una capa más de profundidad */}
      <mesh position={[3.1, 0.7, -4.8]}>
        <coneGeometry args={[3.6, 2.8, 4]} />
        <meshLambertMaterial color="#c2d1d6" flatShading />
      </mesh>
      <mesh position={[-3.4, 0.6, -4.9]}>
        <coneGeometry args={[3.2, 2.5, 4]} />
        <meshLambertMaterial color="#c6d4d8" flatShading />
      </mesh>

      {/* las cuatro terrazas que suben, cada una con su color térmico */}
      {pisos.map((p, i) => (
        <group key={p.id}>
          <mesh position={[0, pisoY(i), pisoZ(i)]}>
            <cylinderGeometry args={[1.28 - i * 0.13, 1.34 - i * 0.13, 0.16, 24]} />
            <meshLambertMaterial color={p.color} flatShading />
          </mesh>
          {/* TALUD de tierra: el cuerpo de la montaña entre terraza y terraza.
              Antes había un palito de 0.14 de radio y los pisos flotaban como
              torta en pedestal; este cono truncado llena el aire y la ladera
              se lee como UNA montaña escalonada, no como platos apilados. */}
          {i > 0 && (
            <mesh position={[0, pisoY(i) - 0.63, pisoZ(i) - 0.05]}>
              <cylinderGeometry
                args={[1.18 - i * 0.13, 1.34 - (i - 1) * 0.13, 1.1, 24]}
              />
              <meshLambertMaterial color={TALUD_COLOR[i]} flatShading />
            </mesh>
          )}
        </group>
      ))}
      {/* la falda que asienta la ladera en el suelo (antes el piso cálido
          también flotaba) */}
      <mesh position={[0, -0.02, 0.6]}>
        <cylinderGeometry args={[1.34, 1.62, 0.32, 24]} />
        <meshLambertMaterial color={TALUD_COLOR[0]} flatShading />
      </mesh>

      {/* la vegetación emblemática de cada piso */}
      {siembra.map((c) => (
        <SiluetaCultivo key={c.key} tipo={c.tipo} x={c.x} y={c.y} z={c.z} esc={c.esc} />
      ))}

      {/* pasto/paja y piedras: la textura menuda de cada piso */}
      {menudencia.map((m) =>
        m.tipo === 'pasto' ? (
          <mesh key={m.key} position={[m.x, m.y, m.z]}>
            <coneGeometry args={[0.05, 0.16, 4]} />
            <meshLambertMaterial color={m.color} flatShading />
          </mesh>
        ) : (
          <mesh key={m.key} position={[m.x, m.y, m.z]} rotation={[0.4, 1.1, 0.2]}>
            <dodecahedronGeometry args={[0.1, 0]} />
            <meshLambertMaterial color={m.color} flatShading />
          </mesh>
        ),
      )}

      {/* niebla del páramo (piso más alto): capta agua, quieta y digna */}
      {pisos.map((p, i) =>
        p.niebla ? (
          <group key={`n-${p.id}`}>
            <Niebla x={-0.4} y={pisoY(i) + 0.7} z={pisoZ(i) + 0.2} r={0.55} />
            <Niebla x={0.55} y={pisoY(i) + 0.55} z={pisoZ(i) - 0.15} r={0.45} />
            <Niebla x={0.1} y={pisoY(i) + 0.9} z={pisoZ(i) + 0.35} r={0.4} />
          </group>
        ) : null,
      )}

      {/* señal SUTIL de que los pisos suben (termofilización): flecha ámbar
          tenue al costado — cuidado, nunca alarma (norte "finca viva"). */}
      <group position={[1.85, pisoY(2), pisoZ(2) + 0.2]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.9, 5]} />
          <meshBasicMaterial color={PALETA.ambar} transparent opacity={0.5} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <coneGeometry args={[0.08, 0.2, 5]} />
          <meshBasicMaterial color={PALETA.ambar} transparent opacity={0.55} />
        </mesh>
      </group>

      {/* vida sólo donde vive: polinizadores del templado/frío; páramo sin fauna */}
      <Fauna items={fauna} reducedMotion={reducedMotion} />
    </group>
  );
}

export default function EscenaEstratos(props) {
  const esPisos = Array.isArray(props.params?.pisos);
  const cielo = esPisos ? CIELOS.ladera : CIELOS.sotobosque;
  // Encuadre `pisos`: cámara un poco más alta y atrás para que el PÁRAMO
  // (frailejones + niebla, el remate de la lección) entre en cuadro — antes el
  // piso más alto salía cortado por arriba.
  const camara = esPisos ? { position: [4.7, 4.4, 7.3], fov: 47 } : { position: [3.5, 3, 6], fov: 44 };
  const centro = esPisos ? [0, 2.2, -0.5] : [0, 1.4, 0];
  const fauna = faunaDeMundo(props.mundoId, { tier: props.tier });
  return (
    <EscenaBase3D
      {...props}
      cielo={cielo}
      camara={camara}
      entrada={{ ...props.entrada, centro }}
    >
      {esPisos ? (
        <DioramaPisos params={props.params} reducedMotion={props.reducedMotion} fauna={fauna} />
      ) : (
        <DioramaEstratos params={props.params} reducedMotion={props.reducedMotion} fauna={fauna} />
      )}
    </EscenaBase3D>
  );
}
