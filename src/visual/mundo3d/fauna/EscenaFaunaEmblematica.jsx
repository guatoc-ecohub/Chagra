/*
 * EscenaFaunaEmblematica — la senda del páramo, con los guardianes andando.
 *
 * El encargo, textual: "No un modelo en T-pose girando: que caminen de verdad".
 * Así que esto no es una galería de modelos: es un pedazo de monte con sendas, y
 * cada animal recorre la suya a SU velocidad real, con SU marcha. Nadie posa.
 * Si mirás un rato, la danta pasa dos veces y el jaguar se detiene a mirarte.
 *
 * ESCALA REAL, sin excepciones. La danta mide 85 cm a la cruz y el arlequín mide
 * cuatro centímetros, y en esta escena esa proporción es verdad. Eso trae un
 * problema honesto: desde donde se ve caminar a la danta, la rana es un punto.
 * La respuesta NO es agrandar la rana — es acercarse. Por eso `foco`: la cámara
 * va a donde está el bicho y lo encuadra a la distancia que ese bicho pide. Para
 * ver un arlequín hay que arrodillarse junto a la quebrada; que en la escena
 * pase lo mismo no es una limitación, es el punto.
 *
 * ADOPCIÓN DE LA PALETA MADRE (paleta/GUIA.md — este mundo es de los primeros
 * en tomarla, y la toma entera):
 *   §1 verdes por piso térmico, ni un hex inventado → todo pelaje sale derivado
 *      en `pelajes.js`, con la receta de la mezcla al lado.
 *   §2 materiales por receta → `crearMaterialVertexColors` / `crearMaterialMadre`.
 *   §3 escena standalone → `<LuzMadre>` + `mezclarCielo`, sin calcar números.
 *   §4 el bloom no se monta aquí.
 *   §5 acentos con cuentagotas: el ÚNICO que grita en todo el cuadro es el oro
 *      del arlequín — y grita porque es aposematismo, no porque quede lindo.
 */
import { useMemo, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { LuzMadre, CIELOS, mezclarCielo, crearMaterialVertexColors, VERDES, TIERRAS } from '../paleta';
import { perfilDeTier } from '../deviceTier.js';
import { FAUNA_EMBLEMATICA } from './faunaEmblematica.js';
import { kitGeo } from './anatomiaFauna.geom.js';
import CuadrupedoRealista from './CuadrupedoRealista.jsx';
import ColibriGuardian from './ColibriGuardian.jsx';
import RanaArlequin from './RanaArlequin.jsx';
import AguilaParamo from './AguilaParamo.jsx';

const { pintar, fusionar } = kitGeo;

/* -------------------------------------------------------------------------- */
/*  EL RELIEVE — una sola verdad sobre dónde está el suelo                    */
/* -------------------------------------------------------------------------- */

/**
 * La altura del páramo en (x, z). Es una función y no una malla a propósito:
 * la lee el SUELO para deformarse, las SENDAS para que los animales pisen donde
 * hay tierra, y las piedras para apoyarse.
 *
 * Si el suelo ondulara por su cuenta y las sendas fueran planas, los animales
 * caminarían flotando en las lomas y enterrados en las hondonadas — y sería un
 * bug mudo: no lo tira ningún test, solo se ve. Una función, tres consumidores,
 * imposible que se desincronicen.
 *
 * El relieve es SUAVE y de onda larga (decenas de metros): el páramo no es una
 * mesa, pero tampoco una montaña rusa. Y la onda larga es lo que permite que la
 * senda lo muestree en 20 nodos sin que el tramo recto entre nodo y nodo se
 * despegue del terreno.
 */
// eslint-disable-next-line react-refresh/only-export-components -- helper de terreno compartido con el componente, no amerita archivo aparte
export function alturaParamo(x, z) {
  return Math.sin(x * 0.22) * Math.cos(z * 0.19) * 0.16 + Math.sin(x * 0.07 + z * 0.05) * 0.3;
}

/* -------------------------------------------------------------------------- */
/*  LAS SENDAS                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Una senda cerrada: el animal da la vuelta y sigue. El monte no se acaba en el
 * borde del encuadre, y un animal que llega al final y se teletransporta al
 * principio rompe el hechizo en un cuadro.
 *
 * Ondulada a propósito: nada camina en círculo perfecto. La ondulación además
 * hace que el animal gire, y al girar se le ve la marcha desde otro ángulo —
 * que es donde se nota si camina de verdad o patina.
 */
function senda(radio, nodos = 24, onda = 0.16, faseOnda = 0, alto = 0, centro = null) {
  const p = [];
  const cx = centro ? centro[0] : 0;
  const cz = centro ? centro[1] : 0;
  for (let i = 0; i < nodos; i++) {
    const a = (i / nodos) * Math.PI * 2;
    const r = radio * (1 + Math.sin(a * 3 + faseOnda) * onda);
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    /* la senda va PEGADA al terreno: los pies se plantan contra esta y */
    p.push(new THREE.Vector3(x, alturaParamo(x, z) + alto, z));
  }
  return p;
}

/* -------------------------------------------------------------------------- */
/*  EL SUELO                                                                  */
/* -------------------------------------------------------------------------- */

/*
 * El pajonal: un disco low-poly con relieve leve y el color horneado por
 * vértice — pajonal dorado en lo alto, musgo en las hondonadas. Los verdes son
 * los de PÁRAMO de la paleta madre (apagados, con plata adentro), que es lo que
 * pide el piso térmico. Nada de césped de videojuego.
 */
function sueloParamo(perfil) {
  const segs = perfil.materialRico ? 48 : 24;
  const g = new THREE.CircleGeometry(34, segs, 0, Math.PI * 2);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const pajonal = new THREE.Color(TIERRAS.pajonal);
  const musgo = new THREE.Color(VERDES.paramoMusgo);
  const plata = new THREE.Color(VERDES.paramoPlata);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    /* la MISMA función que usan las sendas: por eso los animales pisan tierra */
    const h = alturaParamo(x, z);
    pos.setY(i, h);
    /* el color sigue la altura: lo alto se seca (pajonal), lo hondo guarda
       agua (musgo). Es como se ve un páramo desde arriba, y sale gratis. */
    const t = Math.min(1, Math.max(0, h * 1.6 + 0.5));
    c.copy(musgo).lerp(pajonal, t);
    if (h > 0.28) c.lerp(plata, (h - 0.28) * 1.2);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/* La piedra del arlequín: vive al borde de la quebrada, y la piedra mojada es
   de donde se agarra con los discos de los dedos. */
function piedraGeo() {
  const partes = [];
  const roca = new THREE.IcosahedronGeometry(0.3, 0);
  roca.scale(1, 0.45, 0.8);
  partes.push(pintar(roca, TIERRAS.rocaParamo));
  const musgo = new THREE.IcosahedronGeometry(0.16, 0);
  musgo.scale(1, 0.3, 1);
  musgo.translate(0.12, 0.11, -0.1);
  partes.push(pintar(musgo, VERDES.paramoMusgo));
  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  EL MONTE                                                                  */
/* -------------------------------------------------------------------------- */

/* Dónde está la piedra del arlequín. Una constante, porque la miran la piedra,
   la senda de la rana, el colibrí y la cámara: cuatro sitios que tienen que
   coincidir o el rincón se desarma. */
const PIEDRA = [1.4, 3.1];
const PIEDRA_Y = alturaParamo(PIEDRA[0], PIEDRA[1]);

function Monte({ perfil }) {
  const geo = useMemo(() => sueloParamo(perfil), [perfil]);
  const piedra = useMemo(() => piedraGeo(), []);
  const mat = useMemo(() => crearMaterialVertexColors(perfil, { flatShading: true }), [perfil]);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <>
      <mesh geometry={geo} material={mat} receiveShadow={!!perfil.sombras} />
      {/* medio enterrada, como está una piedra de verdad: una piedra apoyada
          encima del pasto se lee a prop de videojuego al instante */}
      <mesh geometry={piedra} material={mat} position={[PIEDRA[0], PIEDRA_Y, PIEDRA[1]]} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  EL REPARTO                                                                */
/* -------------------------------------------------------------------------- */

/*
 * Quién anda dónde. Los radios están puestos para que las sendas se crucen sin
 * que los animales se pisen, y para que el ojo tenga siempre a alguien
 * caminando cerca y a alguien lejos.
 *
 * El jaguar va aquí aunque NO sea fauna de páramo (es de tierra caliente): el
 * encargo lo pide como guardián y esta escena es una galería de guardianes, no
 * un inventario ecológico. La ficha lo dice y el README lo dice. Que la
 * licencia esté anotada es lo que la vuelve una decisión y no un error.
 */
const REPARTO = [
  { id: 'danta', senda: [8.5, 24, 0.14, 0], arranque: 0 },
  { id: 'oso', senda: [6.2, 22, 0.18, 1.1], arranque: 3 },
  { id: 'jaguar', senda: [4.4, 26, 0.1, 2.3], arranque: 1 },
  { id: 'puma', senda: [7.3, 24, 0.2, 4.0], arranque: 5 },
  { id: 'tigrillo', senda: [2.6, 20, 0.22, 0.6], arranque: 0.5 },
  { id: 'borugo', senda: [1.9, 18, 0.26, 3.2], arranque: 1.2 },
];

/* Dónde se sostiene el colibrí, y dónde anda la rana: los dos comparten el
   rincón de la piedra, que es el único sitio de la escena a escala de insecto. */
const COLIBRI_POS = [PIEDRA[0] - 1.2, alturaParamo(PIEDRA[0] - 1.2, PIEDRA[1]) + 1.16, PIEDRA[1]];
const RANA_XZ = [PIEDRA[0] + 0.34, PIEDRA[1] + 0.06];

/**
 * Dónde se para la cámara para mirar a `id`, según lo grande que sea el bicho.
 *
 * Esta función es la respuesta al problema de la escala real: la danta se lee
 * desde 6 metros y el arlequín desde 40 centímetros, y no hay una distancia que
 * sirva para los dos. En vez de agrandar la rana, se camina hasta ella.
 */
function encuadreDe(id) {
  const f = FAUNA_EMBLEMATICA[id];
  if (!f) return { pos: [0, 2.4, 9], mira: [0, 0.8, 0] };
  /* el águila: desde abajo y con la mano de visera, que es como se la mira */
  if (id === 'aguila') return { pos: [0, 2.2, 20], mira: [0, 15, 0] };
  if (id === 'colibri')
    return { pos: [COLIBRI_POS[0] + 0.55, COLIBRI_POS[1] + 0.06, COLIBRI_POS[2] - 0.65], mira: COLIBRI_POS };
  if (id === 'rana') {
    const y = alturaParamo(RANA_XZ[0], RANA_XZ[1]);
    /* de rodillas junto a la quebrada: 40 cm. Menos que eso y la espantás */
    return { pos: [RANA_XZ[0] + 0.21, y + 0.17, RANA_XZ[1] + 0.34], mira: [RANA_XZ[0], y + 0.015, RANA_XZ[1]] };
  }
  /* los cuadrúpedos: a unas 6 alzadas, que es donde se lee la marcha entera —
     ni tan cerca que sea un retrato, ni tan lejos que sea una mancha */
  const alzada = f.alzada || 0.5;
  const r = REPARTO.find((x) => x.id === id);
  const radio = r ? r.senda[0] : 5;
  return {
    pos: [radio * 0.35, alzada * 2.2, radio + alzada * 6.5],
    mira: [0, alzada * 0.8, radio * 0.4],
  };
}

/* -------------------------------------------------------------------------- */

/**
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier]
 * @param {boolean} [props.reducedMotion]  quietos, pero DE PIE (nunca T-pose)
 * @param {string} [props.foco]  encuadrar a un guardián ('rana', 'jaguar'…)
 * @param {string[]} [props.especies]  cuáles montar (default: los del reparto)
 * @param {boolean} [props.controles]
 */
export default function EscenaFaunaEmblematica({
  tier = 'alto',
  reducedMotion = false,
  foco = null,
  especies = null,
  controles = true,
}) {
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);
  const cielo = useMemo(() => mezclarCielo(CIELOS.ladera), []);
  const enc = useMemo(() => (foco ? encuadreDe(foco) : { pos: [3.2, 2.6, 11], mira: [0, 0.7, 0] }), [foco]);

  /* las sendas se memoizan de por vida: `andarCamino` les cachea los largos
     adentro, y rehacerlas por frame tiraría ese caché a la basura */
  const sendas = useMemo(() => {
    const s = {};
    for (const r of REPARTO) s[r.id] = senda(...r.senda);
    /* la de la rana es de otra escala: a 2.8 cm/s no llega lejos. Da la vuelta
       al pie de su piedra, que es todo el mundo que tiene — y anda por el suelo
       mojado del borde, que es donde de verdad anda un Atelopus. */
    s.rana = senda(0.2, 12, 0.3, 0, 0, RANA_XZ);
    return s;
  }, []);

  const monta = (id) => !especies || especies.includes(id);

  /* en gama baja no entra el reparto entero: se quedan los que el encargo pide
     de cabecera. Degradar es sacar bichos, nunca sacarles la marcha. */
  const reparto = useMemo(
    () => (perfil.materialRico ? REPARTO : REPARTO.filter((r) => ['danta', 'jaguar', 'oso'].includes(r.id))),
    [perfil],
  );

  return (
    <Canvas
      shadows={!!perfil.sombras}
      dpr={perfil.materialRico ? [1, 2] : [1, 1.5]}
      camera={{ position: enc.pos, fov: 42, near: 0.02, far: 120 }}
      gl={{ antialias: !!perfil.antialias }}
    >
      <color attach="background" args={[cielo.fondo]} />
      {perfil.fog && <fog attach="fog" args={[cielo.niebla, 14, 62]} />}
      <LuzMadre cielo={CIELOS.ladera} perfil={perfil} />

      <Suspense fallback={null}>
        <Monte perfil={perfil} />

        {reparto.map(
          (r) =>
            monta(r.id) && (
              <CuadrupedoRealista
                key={r.id}
                ficha={FAUNA_EMBLEMATICA[r.id]}
                perfil={perfil}
                camino={sendas[r.id]}
                arranque={r.arranque}
                quieto={reducedMotion}
              />
            ),
        )}

        {monta('rana') && (
          <RanaArlequin
            ficha={FAUNA_EMBLEMATICA.rana}
            perfil={perfil}
            camino={sendas.rana}
            quieto={reducedMotion}
          />
        )}

        {monta('colibri') && (
          <ColibriGuardian
            ficha={FAUNA_EMBLEMATICA.colibri}
            perfil={perfil}
            posicion={COLIBRI_POS}
            quieto={reducedMotion}
          />
        )}

        {monta('aguila') && perfil.materialRico && (
          <AguilaParamo ficha={FAUNA_EMBLEMATICA.aguila} perfil={perfil} quieto={reducedMotion} />
        )}
      </Suspense>

      {controles && (
        <OrbitControls
          target={enc.mira}
          enablePan={false}
          /* se puede llegar hasta los 15 cm: sin eso, el arlequín no existe */
          minDistance={0.15}
          maxDistance={40}
          /* y no se puede mirar el páramo desde abajo del suelo */
          maxPolarAngle={Math.PI * 0.495}
        />
      )}
    </Canvas>
  );
}
