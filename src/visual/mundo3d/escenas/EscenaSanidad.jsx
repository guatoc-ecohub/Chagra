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
 *     (caléndula que jala/aloja enemigos naturales; flor de muerto/Tagetes que empuja la plaga);
 *   · los ENEMIGOS NATURALES — la mariquita que come pulgón, el carábido del
 *     suelo, la mariposa y el colibrí que polinizan y suman vida.
 *
 * Todo `MeshLambert`/`Basic`, sin sombras (contrato de EscenaBase3D). Geometría
 * de primitivas: cero GLTF, offline y liviano.
 *
 * ESPEJO VIVO (auditoría §5b): las MATAS reflejan la SALUD REAL de la finca
 * (`estadoFinca.saludFinca` = { matasVivas, matasTotal }, que arma useFincaViva
 * de los conteos reales de matas). CONTRATO ANTI-FABRICACIÓN ESTRICTO: el manejo
 * (trampas, biocontrol, borde push-pull, enemigos naturales) es la LECCIÓN del
 * lugar y está SIEMPRE; NUNCA inventamos una plaga ni un bicho dañino. Sin dato
 * de salud (finca vacía o aún cargando) → huerta SANA/neutra, todas las matas
 * firmes. Con dato, si hay matas decaídas en la finca REAL, unas matas se ven
 * decaídas (amarillean y se inclinan) en la misma proporción — el reflejo del
 * conteo real, no una plaga fabricada.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import EscenaBase3D from './EscenaBase3D.jsx';
import { Fauna } from './FaunaEscena.jsx';
import { faunaDeMundo, coreografia } from '../faunaFuncional.js';
import { CIELOS, PALETA } from '../atmosferaMadre.js';

/* Umbrales del ESPEJO de salud: sobre este ratio de matas vivas la huerta se ve
   plena; bajo el segundo, más de una mata decae. Deja SIEMPRE al menos una mata
   firme (la clínica cuida lo que vive). */
const SALUD_PLENA = 0.85;
const SALUD_BAJA = 0.6;

/**
 * Ratio de matas vivas (0..1) o null si no hay dato de salud. null = huerta
 * neutra/sana (no fingimos ni salud perfecta ni desastre): así lo omite
 * useFincaViva cuando la finca está vacía o los procesos aún cargan.
 *
 * @param {object|undefined} saludFinca  { matasVivas, matasTotal }
 * @returns {number|null}
 */
function ratioSalud(saludFinca) {
  if (!saludFinca || !Number.isFinite(saludFinca.matasVivas)) return null;
  const total = saludFinca.matasTotal > 0 ? saludFinca.matasTotal : 1;
  return Math.max(0, Math.min(1, saludFinca.matasVivas / total));
}

/**
 * Cuántas de las `total` matas se ven DECAÍDAS, espejo del ratio de salud real.
 * null (sin dato) o salud plena → 0. Deja siempre ≥1 firme. NO es una plaga: es
 * el reflejo honesto del conteo de matas que la finca reporta decaídas.
 *
 * @param {number|null} ratio
 * @param {number} total  matas visibles en el diorama
 * @returns {number}
 */
function matasDecaidas(ratio, total) {
  const cap = Math.max(0, total - 1);
  if (ratio == null || ratio >= SALUD_PLENA) return 0;
  if (ratio >= SALUD_BAJA) return Math.min(1, cap);
  return Math.min(2, cap);
}

/* La fauna BENÉFICA billboard de la huerta-clínica (el CONTROLADOR carábido que
   patrulla a ras + POLINIZADORES en la orla de flores) vive en faunaFuncional.js.
   La mariquita insignia va como malla low-poly, patrullando (abajo). */

/* Una MARIQUITA low-poly (Coccinellidae) — el enemigo natural insignia: una sola
   larva o adulto come cientos de pulgones. Media esfera roja + cabeza + puntos.
   Como CONTROLADORA, PATRULLA las matas en zigzag buscando pulgón (misma
   coreografía de rol que la fauna billboard); se congela con reduced-motion. */
function Mariquita({ pos, escala = 1, fase = 0, reducedMotion = false }) {
  const ref = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const [dx, dy, dz] = coreografia('patrulla', state.clock.elapsedTime, fase);
    // a ras de la hoja: el barrido lateral manda, el zumbido vertical se atenúa.
    ref.current.position.set(pos[0] + dx, pos[1] + dy * 0.4, pos[2] + dz);
  });
  const puntos = [
    [0.035, -0.02], [-0.035, -0.02], [0.03, 0.035], [-0.03, 0.035],
  ];
  return (
    <group ref={ref} position={pos} scale={escala}>
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
        <meshLambertMaterial color={PALETA.madera} flatShading />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[0.22, 0.28, 0.02]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  );
}

/* Una MATA: tallo + hojas redondeadas. El verde firme cuenta salud; `decaida`
   (espejo de la salud real, NO una plaga) la amarillea, achica y hace inclinar
   las hojas — la mata que la finca reporta decaída, atendida por la clínica. */
function Mata({ pos, color = '#4e8f3f', decaida = false }) {
  const hojas = [
    [0, 0.44, 0, 0.17], [0.13, 0.35, 0.05, 0.12], [-0.12, 0.37, -0.05, 0.12],
  ];
  // Decaída: hoja amarillo-enfermiza, más pequeña y caída; tallo mustio.
  const colorHoja = decaida ? '#b6a24a' : color;
  const colorTallo = decaida ? '#6e6636' : '#5a6a2e';
  const caida = decaida ? -0.06 : 0; // las hojas se hunden un poco
  const merma = decaida ? 0.82 : 1; // y menguan
  return (
    <group position={pos} rotation={decaida ? [0.14, 0, 0.1] : [0, 0, 0]}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 0.42, 5]} />
        <meshLambertMaterial color={colorTallo} flatShading />
      </mesh>
      {hojas.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y + caida, z]}>
          <sphereGeometry args={[r * merma, 8, 7]} />
          <meshLambertMaterial color={colorHoja} flatShading />
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
        <meshLambertMaterial color={PALETA.tierraClara} flatShading />
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

function Diorama({ params, reducedMotion, fauna, estadoFinca }) {
  // ESPEJO VIVO de la salud real (§5b): cuántas matas se ven decaídas es el
  // reflejo del ratio de matas vivas de la finca. Sin dato → 0 (huerta sana).
  // Marcamos las ÚLTIMAS del arreglo (deja las del frente firmes). No es plaga.
  const matas = useMemo(() => {
    const base = params?.matas || [
      { color: '#4e8f3f', pos: [-0.5, 0, 0.35] },
      { color: '#57993f', pos: [0.55, 0, 0.1] },
      { color: '#468637', pos: [0.05, 0, -0.55] },
    ];
    const ratio = ratioSalud(estadoFinca?.saludFinca);
    const nDecaidas = matasDecaidas(ratio, base.length);
    const desde = base.length - nDecaidas;
    return base.map((m, i) => ({ ...m, decaida: i >= desde }));
  }, [estadoFinca?.saludFinca, params?.matas]);
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
          <meshLambertMaterial color={PALETA.tierraClara} flatShading />
        </mesh>
      ))}
      {/* el anillo verde del manejo: el borde vivo que rodea y defiende */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.55, 0.045, 8, 44]} />
        <meshBasicMaterial color={PALETA.follajeClaro} transparent opacity={0.7} />
      </mesh>

      {/* las matas que se protegen (decaída = espejo de la salud real, no plaga) */}
      {matas.map((m, i) => (
        <Mata key={i} pos={m.pos} color={m.color} decaida={m.decaida} />
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

      {/* los enemigos naturales insignia: dos mariquitas patrullando las matas */}
      <Mariquita pos={[-0.42, 0.5, 0.42]} escala={1} fase={0.8} reducedMotion={reducedMotion} />
      <Mariquita pos={[0.6, 0.32, 0.12]} escala={0.85} fase={2.9} reducedMotion={reducedMotion} />

      {/* la fauna funcional billboard: carábido patrullando + polinizadores del borde */}
      <Fauna items={fauna} reducedMotion={reducedMotion} />
    </group>
  );
}

export default function EscenaSanidad(props) {
  // Cielo fresco y sano de huerta (se mezcla igual hacia la hora dorada del valle).
  const cielo = CIELOS.huerta;
  const fauna = faunaDeMundo(props.mundoId, { tier: props.tier });
  return (
    <EscenaBase3D {...props} cielo={cielo} entrada={{ ...props.entrada, centro: [0, 0.45, 0] }}>
      <Diorama
        params={props.params}
        reducedMotion={props.reducedMotion}
        fauna={fauna}
        estadoFinca={props.estadoFinca}
      />
    </EscenaBase3D>
  );
}
