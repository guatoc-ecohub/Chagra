/*
 * EscenaSanidad — ARQUETIPO `sanidad`: la HUERTA-CLÍNICA y su manejo sin veneno.
 *
 * De la familia del `recinto` (un lugar cercado que se camina), pero su lección
 * NO es el ciclo del abono: es cómo se CUIDA la mata sin químicos. El espacio
 * mismo enseña el manejo agroecológico de plagas de la finca andina:
 *
 *   · las matas sanas al centro (lo que se protege);
 *   · las TRAMPAS CROMÁTICAS en estacas — la amarilla llama a la mosca blanca y
 *     el minador, la azul llama a los trips (monitoreo + captura, sin veneno);
 *   · la ESTACIÓN DE BIOCONTROL — el recipiente con hongos entomopatógenos
 *     (Beauveria bassiana clara, Metarhizium verdosa) que enferman al insecto;
 *   · el BORDE "empuja-jala" (push-pull) — la orla de flores aromáticas
 *     (caléndula) que repele y aloja enemigos naturales;
 *   · los ENEMIGOS NATURALES — la mariquita que come pulgón, el carábido del
 *     suelo, la mariposa y el colibrí que polinizan y suman vida.
 *
 * Todo `MeshLambert`/`Basic`, sin sombras (contrato de EscenaBase3D). Geometría
 * de primitivas: cero GLTF, offline y liviano.
 */
import { useMemo } from 'react';
import EscenaBase3D from './EscenaBase3D.jsx';
import { Fauna } from './FaunaEscena.jsx';

/* La fauna BENÉFICA que acompaña la huerta-clínica: la mariposa polinizadora en
   la orla de flores, el colibrí que sobrevuela, y el escarabajo (carábido)
   depredador que anda a ras cazando larvas en el suelo. Pocas y por criterio
   ecológico (contrato del DR: vida, no enjambre). */
const FAUNA_SANIDAD = [
  { tipo: 'mariposa', base: [1.05, 0.66, 0.78], patron: 'revoloteo', size: 28, fase: 0.4 },
  { tipo: 'colibri', base: [-0.85, 1.12, 0.42], patron: 'revoloteo', size: 30, fase: 1.6 },
  { tipo: 'escarabajo', base: [0.28, 0.16, -0.52], patron: 'reptar', size: 28, fase: 2.4 },
];

/* Una MARIQUITA low-poly (Coccinellidae) — el enemigo natural insignia: una sola
   larva o adulto come cientos de pulgones. Media esfera roja + cabeza + puntos. */
function Mariquita({ pos, escala = 1 }) {
  const puntos = [
    [0.035, -0.02], [-0.035, -0.02], [0.03, 0.035], [-0.03, 0.035],
  ];
  return (
    <group position={pos} scale={escala}>
      {/* élitros: media esfera roja */}
      <mesh position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color="#c0392b" flatShading />
      </mesh>
      {/* la línea que parte los élitros */}
      <mesh position={[0, 0.066, 0]}>
        <boxGeometry args={[0.006, 0.02, 0.17]} />
        <meshLambertMaterial color="#241812" />
      </mesh>
      {/* cabeza */}
      <mesh position={[0, 0.05, 0.088]}>
        <sphereGeometry args={[0.038, 8, 8]} />
        <meshLambertMaterial color="#241812" flatShading />
      </mesh>
      {/* puntos negros */}
      {puntos.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.108, z]}>
          <sphereGeometry args={[0.013, 6, 6]} />
          <meshLambertMaterial color="#241812" />
        </mesh>
      ))}
    </group>
  );
}

/* Una TRAMPA CROMÁTICA: estaca + tarjeta pegajosa de color. El color no es
   decorativo — decide a qué insecto llama (amarillo: mosca blanca/minador;
   azul: trips). */
function Trampa({ pos, color = '#f2c531' }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.02, 0.026, 0.68, 5]} />
        <meshLambertMaterial color="#7a5a38" flatShading />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[0.22, 0.28, 0.02]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  );
}

/* Una MATA sana: tallo + hojas redondeadas. El verde firme cuenta salud. */
function Mata({ pos, color = '#4e8f3f' }) {
  const hojas = [
    [0, 0.44, 0, 0.17], [0.13, 0.35, 0.05, 0.12], [-0.12, 0.37, -0.05, 0.12],
  ];
  return (
    <group position={pos}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 0.42, 5]} />
        <meshLambertMaterial color="#5a6a2e" flatShading />
      </mesh>
      {hojas.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[r, 8, 7]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* La ESTACIÓN DE BIOCONTROL: poste + recipiente con el polvo de esporas de los
   hongos entomopatógenos (Beauveria/Metarhizium) que enferman al insecto. */
function EstacionBio({ pos }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.44, 6]} />
        <meshLambertMaterial color="#8a6a44" flatShading />
      </mesh>
      {/* el recipiente */}
      <mesh position={[0, 0.49, 0]}>
        <cylinderGeometry args={[0.13, 0.1, 0.13, 10]} />
        <meshLambertMaterial color="#e8e4d0" flatShading />
      </mesh>
      {/* el polvo de esporas (verdoso Metarhizium / claro Beauveria) */}
      <mesh position={[0, 0.56, 0]}>
        <sphereGeometry args={[0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color="#b9c88a" flatShading />
      </mesh>
    </group>
  );
}

/* Una FLOR del borde push-pull (caléndula/aromática): repele plagas y aloja
   enemigos naturales. Tallo + botón anaranjado. */
function FlorBorde({ pos }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.24, 5]} />
        <meshLambertMaterial color="#4e7d3f" flatShading />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshLambertMaterial color="#e8963f" flatShading />
      </mesh>
    </group>
  );
}

function Diorama({ params, reducedMotion }) {
  const matas = params?.matas || [
    { color: '#4e8f3f', pos: [-0.5, 0, 0.35] },
    { color: '#57993f', pos: [0.55, 0, 0.1] },
    { color: '#468637', pos: [0.05, 0, -0.55] },
  ];
  const trampas = params?.trampas || [
    { color: '#f2c531', pos: [1.35, 0, 0.35] }, // amarilla: mosca blanca / minador
    { color: '#3f77c7', pos: [-1.25, 0, -0.5] }, // azul: trips
  ];

  // La cerca: postes en anillo (reconocible como "recinto"), en tono madera.
  const postes = useMemo(() => {
    const n = 12;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return /** @type {[number, number, number]} */ ([Math.cos(a) * 1.9, 0.2, Math.sin(a) * 1.9]);
    });
  }, []);

  // El borde "empuja-jala": orla de flores aromáticas repartida en el anillo.
  const flores = useMemo(() => {
    const n = 8;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + 0.26;
      return /** @type {[number, number, number]} */ ([Math.cos(a) * 1.62, 0, Math.sin(a) * 1.62]);
    });
  }, []);

  return (
    <group>
      {/* piso de la huerta-clínica */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2, 28]} />
        <meshLambertMaterial color="#7f8a4e" />
      </mesh>
      {/* cama de siembra al centro (lomo de tierra) */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 24]} />
        <meshLambertMaterial color="#6b5636" />
      </mesh>
      {/* la cerca */}
      {postes.map((p, i) => (
        <mesh key={i} position={p}>
          <cylinderGeometry args={[0.05, 0.06, 0.5, 5]} />
          <meshLambertMaterial color="#8a6a44" flatShading />
        </mesh>
      ))}
      {/* el anillo verde del manejo: el borde vivo que rodea y defiende */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.55, 0.045, 8, 44]} />
        <meshBasicMaterial color="#7a9a3f" transparent opacity={0.7} />
      </mesh>

      {/* las matas sanas que se protegen */}
      {matas.map((m, i) => (
        <Mata key={i} pos={m.pos} color={m.color} />
      ))}
      {/* las trampas cromáticas */}
      {trampas.map((t, i) => (
        <Trampa key={i} pos={t.pos} color={t.color} />
      ))}
      {/* la estación de biocontrol (hongos entomopatógenos) */}
      <EstacionBio pos={[1.05, 0, -0.75]} />
      {/* el borde push-pull de flores aromáticas */}
      {flores.map((p, i) => (
        <FlorBorde key={i} pos={p} />
      ))}

      {/* los enemigos naturales insignia: dos mariquitas sobre las matas */}
      <Mariquita pos={[-0.42, 0.5, 0.42]} escala={1} />
      <Mariquita pos={[0.6, 0.32, 0.12]} escala={0.85} />

      {/* la fauna benéfica que anima la escena (mariposa/colibrí/carábido) */}
      <Fauna items={FAUNA_SANIDAD} reducedMotion={reducedMotion} />
    </group>
  );
}

export default function EscenaSanidad(props) {
  // Cielo fresco y sano de huerta (se mezcla igual hacia la hora dorada del valle).
  const cielo = { fondo: '#dbe7c4', cielo: '#eef4dc', suelo: '#7e8a4a', intensidad: 1.05 };
  return (
    <EscenaBase3D {...props} cielo={cielo} entrada={{ ...props.entrada, centro: [0, 0.45, 0] }}>
      <Diorama params={props.params} reducedMotion={props.reducedMotion} />
    </EscenaBase3D>
  );
}
