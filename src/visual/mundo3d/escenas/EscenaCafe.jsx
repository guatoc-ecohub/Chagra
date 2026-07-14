/*
 * EscenaCafe — ARQUETIPO `cafe`: el CAFETAL BAJO SOMBRA de la ladera andina.
 *
 * De la familia del `recinto` (un lugar que se camina), pero su lección es el
 * CULTIVO BANDERA hecho espacio: el café no crece solo ni a pleno rayo — vive
 * ABAJO, bajo el techo de árboles altos que lo cuidan. El diorama enseña lo que
 * de verdad es una finca cafetera del país:
 *
 *   · la SOMBRA arriba — el guamo (Inga) y el nogal cafetero que le hacen techo
 *     al cultivo: menos sol quemante, más humedad, hoja que cae y abona, y monte
 *     donde vuelven las aves (café de sombra = café con vida, no potrero de sol);
 *   · los CAFETOS abajo — los arbustos cargados de CEREZA roja madura (el fruto);
 *   · el GRANO en sus tres estados, SIN tostar en la finca — cereza (el fruto
 *     rojo) → pergamino (el grano seco en su cascarilla) → oro (el grano verde
 *     ya trillado, listo para vender); el tueste es del otro lado, no del campo;
 *   · la ROYA (Hemileia vastatrix, el polvillo naranja bajo la hoja) y la BROCA
 *     (Hypothenemus hampei, el gorgojo que perfora la cereza) — señaladas sin
 *     drama, porque se manejan con criterio, no con recetas de veneno;
 *   · el BENEFICIO en el rincón — despulpar, fermentar en el tanque y secar al
 *     sol en el paseo/parabólico: el paso del fruto al grano vendible.
 *
 * Todo `MeshLambert`/`Basic`, sin sombras (contrato de EscenaBase3D). Geometría
 * de primitivas: cero GLTF, offline y liviano.
 */
import { useMemo } from 'react';
import EscenaBase3D from './EscenaBase3D.jsx';
import { Fauna } from './FaunaEscena.jsx';
import { CIELOS, PALETA } from '../atmosferaMadre.js';

/* La fauna que delata el CAFÉ DE SOMBRA: bajo el techo de guamo vuelven las
   aves y las mariposas (el café a pleno sol las espanta). Pocas y por criterio
   ecológico (contrato del DR: vida, no enjambre) — la sombra ES el hábitat. */
const FAUNA_CAFE = [
  { tipo: 'colibri', base: [-1.15, 1.45, 0.35], patron: 'revoloteo', size: 30, fase: 0.5 },
  { tipo: 'mariposa', base: [0.9, 0.82, 0.7], patron: 'revoloteo', size: 26, fase: 1.8 },
  { tipo: 'colibri', base: [1.25, 1.55, -0.5], patron: 'revoloteo', size: 26, fase: 2.6 },
];

/* Un ÁRBOL DE SOMBRA (guamo/nogal cafetero): tronco alto de madera + copa ancha
   y aireada en varias esferas. Le hace TECHO al cafetal — es lo primero que se
   lee "el café vive debajo". */
function ArbolSombra({ pos, color = '#3f6b39', alto = 2.1 }) {
  const copa = [
    [0, alto, 0, 0.72], [0.5, alto - 0.22, 0.1, 0.5], [-0.46, alto - 0.18, -0.08, 0.52],
    [0.12, alto + 0.34, -0.3, 0.46], [-0.2, alto + 0.28, 0.32, 0.42],
  ];
  return (
    <group position={pos}>
      {/* el tronco alto */}
      <mesh position={[0, alto * 0.5, 0]}>
        <cylinderGeometry args={[0.09, 0.14, alto, 6]} />
        <meshLambertMaterial color={PALETA.madera} flatShading />
      </mesh>
      {/* la copa ancha y aireada que da la sombra */}
      {copa.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[r, 9, 7]} />
          <meshLambertMaterial color={i % 2 ? PALETA.follajeOscuro : color} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Un CAFETO: arbusto cargado. Tallo + follaje verde firme + CEREZAS rojas (el
   fruto maduro que se cosecha grano a grano). `roya` le pinta la mancha naranja
   del polvillo bajo una hoja (Hemileia vastatrix) — la señal, sin alarma. */
function Cafeto({ pos, color = '#3f6f3a', cerezas = 5, roya = false }) {
  const hojas = [
    [0, 0.56, 0, 0.2], [0.16, 0.44, 0.06, 0.15], [-0.15, 0.46, -0.06, 0.15],
    [0.05, 0.66, -0.12, 0.14],
  ];
  // Las cerezas maduras repartidas por el follaje (deterministas por índice).
  const frutos = useMemo(() => {
    return Array.from({ length: cerezas }, (_, i) => {
      const a = (i / cerezas) * Math.PI * 2 + 0.4;
      const r = 0.18 + (i % 2) * 0.05;
      return /** @type {[number, number, number]} */ ([
        Math.cos(a) * r, 0.42 + (i % 3) * 0.09, Math.sin(a) * r,
      ]);
    });
  }, [cerezas]);
  return (
    <group position={pos}>
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.035, 0.06, 0.52, 5]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
      {hojas.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[r, 8, 7]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
      ))}
      {/* las cerezas rojas: el fruto que se recoge maduro */}
      {frutos.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.035, 7, 6]} />
          <meshLambertMaterial color="#b8342a" flatShading />
        </mesh>
      ))}
      {/* la roya: la mancha naranja del polvillo bajo la hoja (señal, no drama) */}
      {roya && (
        <mesh position={[0.16, 0.4, 0.16]}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshLambertMaterial color={PALETA.ambar} flatShading />
        </mesh>
      )}
    </group>
  );
}

/* Un ESTADO DEL GRANO en una bandeja: el paso cereza → pergamino → oro (NUNCA
   tostado en la finca). Tabla baja + montón de grano del color de su estado. */
function GranoEstado({ pos, color = '#b8342a' }) {
  return (
    <group position={pos}>
      {/* la bandeja/zaranda de madera clara */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.05, 12]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
      {/* el montón de grano de este estado */}
      <mesh position={[0, 0.085, 0]}>
        <sphereGeometry args={[0.13, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

/* El BENEFICIO en su rincón: la DESPULPADORA (tolva + cuerpo con manija), el
   TANQUE DE FERMENTACIÓN (recipiente abierto con el agua del mucílago) y el
   SECADERO (paseo/parabólico: cama elevada con la capa de grano al sol). El paso
   del fruto rojo al grano vendible, sin química. */
function Beneficio({ pos }) {
  return (
    <group position={pos}>
      {/* la despulpadora: cuerpo + tolva + manija */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.34, 0.4, 0.28]} />
        <meshLambertMaterial color={PALETA.lamina} flatShading />
      </mesh>
      <mesh position={[0, 0.54, 0]} rotation={[0, 0, Math.PI]}>
        <cylinderGeometry args={[0.05, 0.19, 0.2, 4]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
      <mesh position={[0.24, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.16, 6]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>

      {/* el tanque de fermentación: recipiente abierto con agua del mucílago */}
      <mesh position={[0.62, 0.18, 0.2]}>
        <cylinderGeometry args={[0.19, 0.16, 0.36, 12]} />
        <meshLambertMaterial color={PALETA.concreto} flatShading />
      </mesh>
      <mesh position={[0.62, 0.31, 0.2]}>
        <cylinderGeometry args={[0.165, 0.165, 0.04, 12]} />
        <meshLambertMaterial color={PALETA.agua} flatShading />
      </mesh>

      {/* el secadero (paseo/parabólico): cama elevada con la capa de grano al sol */}
      <group position={[0.3, 0, 0.72]}>
        {[[-0.28, 0.16, -0.16], [0.28, 0.16, -0.16], [-0.28, 0.16, 0.16], [0.28, 0.16, 0.16]].map((p, i) => (
          <mesh key={i} position={/** @type {[number, number, number]} */ (p)}>
            <cylinderGeometry args={[0.02, 0.02, 0.32, 5]} />
            <meshLambertMaterial color={PALETA.madera} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0.33, 0]}>
          <boxGeometry args={[0.66, 0.03, 0.44]} />
          <meshLambertMaterial color={PALETA.maderaClara} flatShading />
        </mesh>
        {/* la capa de grano en pergamino secándose */}
        <mesh position={[0, 0.36, 0]}>
          <boxGeometry args={[0.6, 0.03, 0.38]} />
          <meshLambertMaterial color="#d4c199" flatShading />
        </mesh>
      </group>
    </group>
  );
}

function Diorama({ params, reducedMotion }) {
  const cafetos = params?.cafetos || [
    { color: '#3f6f3a', pos: [-0.55, 0, 0.42], cerezas: 6 },
    { color: '#468637', pos: [0.5, 0, 0.12], cerezas: 5 },
    { color: '#3f6f3a', pos: [0.02, 0, -0.5], cerezas: 4, roya: true },
    { color: '#457d38', pos: [-0.78, 0, -0.32], cerezas: 5 },
  ];
  const sombra = params?.sombra || [
    { pos: [-1.65, 0, -0.95], color: '#4b7a3a', alto: 2.2 }, // guamo
    { pos: [1.7, 0, -0.8], color: '#3f6b39', alto: 2.0 },    // nogal cafetero
  ];
  // El grano en sus tres estados (cereza→pergamino→oro), SIN tostar en finca.
  const granos = params?.granos || [
    { estado: 'cereza', color: '#b8342a', pos: [-1.5, 0, 0.75] },
    { estado: 'pergamino', color: '#d4c199', pos: [-1.15, 0, 1.05] },
    { estado: 'oro', color: '#9fae5a', pos: [-0.72, 0, 1.2] },
  ];

  // El surco del cafetal en la ladera: hilera curva que ordena las matas (café
  // sembrado a curva de nivel, no ladera abajo — cuida el suelo del aguacero).
  const surcos = useMemo(() => {
    const n = 3;
    return Array.from({ length: n }, (_, i) => {
      const z = -0.75 + i * 0.62;
      return /** @type {[number, number, number]} */ ([0, 0.03, z]);
    });
  }, []);

  return (
    <group>
      {/* piso del cafetal (ladera) */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.1, 30]} />
        <meshLambertMaterial color="#7a6a3e" />
      </mesh>
      {/* los surcos a curva de nivel (lomos de tierra que ordenan el cafetal) */}
      {surcos.map((p, i) => (
        <mesh key={i} position={p} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55 + i * 0.02, 1.65, 40, 1, 0.6, 1.9]} />
          <meshLambertMaterial color="#6b5636" />
        </mesh>
      ))}

      {/* la SOMBRA arriba: los árboles altos que le hacen techo al café */}
      {sombra.map((a, i) => (
        <ArbolSombra key={i} pos={a.pos} color={a.color} alto={a.alto} />
      ))}

      {/* los CAFETOS cargados de cereza (uno con la señal de roya) */}
      {cafetos.map((c, i) => (
        <Cafeto key={i} pos={c.pos} color={c.color} cerezas={c.cerezas} roya={c.roya} />
      ))}

      {/* el GRANO en sus tres estados, SIN tostar (cereza→pergamino→oro) */}
      {granos.map((g, i) => (
        <GranoEstado key={i} pos={g.pos} color={g.color} />
      ))}

      {/* el BENEFICIO: despulpar, fermentar, secar (el paso al grano vendible) */}
      <Beneficio pos={[1.0, 0, 0.55]} />

      {/* la vida que trae la sombra: colibríes y mariposa (café con hábitat) */}
      <Fauna items={FAUNA_CAFE} reducedMotion={reducedMotion} />
    </group>
  );
}

export default function EscenaCafe(props) {
  // Cielo de "corral y cafetal: tarde de finca" (atmosferaMadre) — la mezcla lo
  // entibia igual hacia la hora dorada del valle.
  const cielo = CIELOS.corral;
  return (
    <EscenaBase3D {...props} cielo={cielo} entrada={{ ...props.entrada, centro: [0, 0.7, 0] }}>
      <Diorama params={props.params} reducedMotion={props.reducedMotion} />
    </EscenaBase3D>
  );
}
