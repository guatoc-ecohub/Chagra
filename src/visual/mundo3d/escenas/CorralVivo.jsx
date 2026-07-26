/*
 * CorralVivo — el corral como ESPEJO del dato (auditoría FASE 1 §5a+§5c).
 *
 * El hato REAL de la finca se dibuja desde `params.animales`:
 *
 *   [{ especie, nombre, raza, tamano: 'pequeño'|'mediano'|'grande',
 *      estado: 'sano'|'preñada'|'vendido'|'nace'|'muerte' }]
 *
 * Un cambio de estado es un MOMENTO (audit §5a.4), no un salto: `nace` hace
 * APARECER una cría (crece con un brillo cálido), `muerte` la RETIRA con respeto
 * (se apaga suave y deja una piedrita con flor — sin dramatizar) y `vendido`
 * la manda al MERCADO (el mismo dato vive en dos mundos: aquí queda su huella,
 * allá llega caminando). Esos tres los dibuja AnimalMomento; el resto, el hato
 * instanciado. Todo gateado por reduced-motion + device-tier.
 *
 * y cada animal se ve como ES: la especie da la silueta, el TAMAÑO da la
 * escala (3 cerdos pequeños + 4 medianos + 5 grandes se distinguen a golpe de
 * vista), la RAZA da el pelaje (color por instancia), y el ESTADO se ve sin
 * leer: la preñada lleva una señal rosada sobre el lomo, el vendido queda como
 * huella translúcida (el dato persiste, el animal ya no está).
 *
 * CÓMO se dibuja (escala a N, DR §6 frugal):
 *   · InstancedMesh POR ESPECIE: cada especie es una tabla de PARTES (primitivas
 *     orgánicas, nunca cajas) y cada parte es UN InstancedMesh con N instancias.
 *     Los draw calls son constantes por especie, no crecen con el hato.
 *   · Culling/LOD gama baja: `computeBoundingSphere()` tras posar matrices
 *     (frustum culling correcto) y en tier 'bajo' las partes `fina` (crestas,
 *     picos, orejas, colas) no se montan — queda la silueta legible.
 *   · Idle pecuario (picotea/respira/balancea/hocica) reescribe SOLO las
 *     matrices de las partes `cuerpo` (las patas quedan plantadas), gateado por
 *     reduced-motion Y device-tier ('bajo' no anima).
 *
 * El NOMBRE (visión núcleo del operador: "mis animales tienen nombre"):
 *   · Un cartel de madera CLAVADO junto a cada animal con nombre — estaca +
 *     tabla artesanal con `<Text>` de drei (fuente default, trazo a mano por
 *     la tablita torcida), legible por ambas caras.
 *   · Anti-colisión en pantalla (mismo patrón de RotulosLugares del valle):
 *     el cartel más apuntado —o el del animal tocado— muestra su tabla PLENA;
 *     los demás se calman a estaca-con-perilla del color del pelaje; quien pisa
 *     un espacio tomado, cede. Imperativo sobre `visible` (cero re-render).
 *   · Al TOCAR (animal o cartel): placa flotante con nombre + raza + tamaño
 *     (+ estado), el mismo lenguaje de píldora de los hotspots.
 */
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { PALETA } from '../atmosferaMadre.js';
import AnimalMomento from './AnimalMomento.jsx';

/* ── La escala del TAMAÑO declarado: clases discretas, no continuo (el dato
      del cuaderno dice "pequeño/mediano/grande", el corral lo espeja). ── */
const TAMANOS = { 'pequeño': 0.55, pequeno: 0.55, mediano: 0.8, grande: 1.05 };

/* Pelajes por RAZA conocida de finca andina; una raza no listada cae a una
   paleta de pelajes estable (hash del nombre de la raza — determinista). */
const COLOR_RAZA = {
  zungo: '#4a3a35',
  'sanpedreño': '#6b4a3c',
  sanpedreno: '#6b4a3c',
  // Casco de Mula (criolla AGROSAVIA): capa rojiza-amarillenta, NO negra.
  'casco de mula': '#a8683a',
  cascodemula: '#a8683a',
  duroc: '#a55636',
  landrace: '#e3b6a4',
  normando: '#c9a06a',
  'cebú': '#d9d2c4',
  cebu: '#d9d2c4',
  campesina: '#b5622f',
  ponedora: '#d8b58a',
  criolla: '#efe7d8',
  criollo: '#c98a6a',
};
const PELAJES = ['#c9a06a', '#e7d9c2', '#8a6a55', '#d8b58a', '#efe7d8', '#a55636'];

/* Razas de OREJA RECTA verificadas (San Pedreño: "orejas rectas y medianas",
   Agrosavia/SciELO; pietrain también las lleva paradas). El resto de cerdos
   del corral quedan con la oreja caída criolla de siempre. */
const OREJA_RECTA = new Set(['sanpedreño', 'sanpedreno', 'pietrain']);

/*
 * Cada ESPECIE = gesto de idle + altura de referencia + tabla de PARTES.
 * Parte: { geo, pos, rot?, escala?, color? | porRaza, cuerpo? (la anima el
 * gesto), fina? (LOD: fuera en gama baja), vientre? (la preñez la ensancha) }.
 * Las siluetas vienen de los animales low-poly ya validados del recinto
 * (gallina que picotea, vaca capsular, oveja de vellón) + el cerdo criollo.
 */
// eslint-disable-next-line react-refresh/only-export-components -- tabla de datos compartida con EscenaRecinto/EscenaMercado/AnimalMomento (export pre-existente)
export const ESPECIES = {
  gallina: {
    gesto: 'picotea',
    alto: 0.5,
    partes: [
      { geo: ['esfera', [0.16, 8, 6]], pos: [0, 0.2, 0], escala: [1.25, 1, 1], porRaza: true, cuerpo: true, vientre: true },
      { geo: ['cono', [0.09, 0.2, 5]], pos: [-0.16, 0.28, 0], rot: [0, 0, 0.9], porRaza: true, cuerpo: true },
      { geo: ['esfera', [0.09, 8, 6]], pos: [0.17, 0.34, 0], porRaza: true, cuerpo: true },
      { geo: ['cono', [0.05, 0.1, 4]], pos: [0.17, 0.45, 0], color: '#c85a44', cuerpo: true, fina: true },
      { geo: ['cono', [0.03, 0.09, 4]], pos: [0.27, 0.33, 0], rot: [0, 0, -Math.PI / 2], color: '#e0a63a', cuerpo: true, fina: true },
      { geo: ['cilindro', [0.015, 0.015, 0.14, 4]], pos: [0.04, 0.05, 0.06], color: '#e0a63a' },
      { geo: ['cilindro', [0.015, 0.015, 0.14, 4]], pos: [0.04, 0.05, -0.06], color: '#e0a63a' },
    ],
  },
  vaca: {
    gesto: 'respira',
    alto: 0.95,
    partes: [
      { geo: ['capsula', [0.22, 0.42, 4, 8]], pos: [0, 0.46, 0], rot: [0, 0, Math.PI / 2], porRaza: true, cuerpo: true, vientre: true },
      { geo: ['esfera', [0.15, 8, 6]], pos: [0.44, 0.5, 0], porRaza: true, cuerpo: true },
      { geo: ['esfera', [0.09, 8, 6]], pos: [0.56, 0.44, 0], color: '#e8d3bf', cuerpo: true, fina: true },
      { geo: ['cono', [0.05, 0.12, 4]], pos: [0.4, 0.62, 0.12], rot: [0.5, 0, 0], porRaza: true, cuerpo: true, fina: true },
      { geo: ['cono', [0.05, 0.12, 4]], pos: [0.4, 0.62, -0.12], rot: [-0.5, 0, 0], porRaza: true, cuerpo: true, fina: true },
      { geo: ['cilindro', [0.02, 0.02, 0.34, 4]], pos: [-0.42, 0.34, 0], rot: [0, 0, 0.4], color: PALETA.tierraClara, cuerpo: true, fina: true },
      { geo: ['cilindro', [0.045, 0.04, 0.36, 5]], pos: [0.28, 0.18, 0.13], color: PALETA.tierraClara },
      { geo: ['cilindro', [0.045, 0.04, 0.36, 5]], pos: [0.28, 0.18, -0.13], color: PALETA.tierraClara },
      { geo: ['cilindro', [0.045, 0.04, 0.36, 5]], pos: [-0.28, 0.18, 0.13], color: PALETA.tierraClara },
      { geo: ['cilindro', [0.045, 0.04, 0.36, 5]], pos: [-0.28, 0.18, -0.13], color: PALETA.tierraClara },
    ],
  },
  oveja: {
    gesto: 'balancea',
    alto: 0.6,
    partes: [
      { geo: ['icosaedro', [0.22, 0]], pos: [0, 0.34, 0], escala: [1.2, 1, 1], porRaza: true, cuerpo: true, vientre: true },
      { geo: ['esfera', [0.1, 8, 6]], pos: [0.28, 0.36, 0], color: '#5a4a3e', cuerpo: true },
      { geo: ['cono', [0.03, 0.1, 4]], pos: [0.28, 0.44, 0.08], rot: [0, 0, -0.6], color: '#5a4a3e', cuerpo: true, fina: true },
      { geo: ['cono', [0.03, 0.1, 4]], pos: [0.28, 0.44, -0.08], rot: [0, 0, 0.6], color: '#5a4a3e', cuerpo: true, fina: true },
      { geo: ['cilindro', [0.03, 0.03, 0.24, 4]], pos: [0.14, 0.12, 0.1], color: '#5a4a3e' },
      { geo: ['cilindro', [0.03, 0.03, 0.24, 4]], pos: [0.14, 0.12, -0.1], color: '#5a4a3e' },
      { geo: ['cilindro', [0.03, 0.03, 0.24, 4]], pos: [-0.14, 0.12, 0.1], color: '#5a4a3e' },
      { geo: ['cilindro', [0.03, 0.03, 0.24, 4]], pos: [-0.14, 0.12, -0.1], color: '#5a4a3e' },
    ],
  },
  /* El cerdo criollo: cuerpo capsular rechoncho, trompa de cilindro, orejas
     caídas y colita alzada — primitivas orgánicas, como sus vecinos. */
  cerdo: {
    gesto: 'hocica',
    alto: 0.62,
    partes: [
      { geo: ['capsula', [0.2, 0.34, 4, 8]], pos: [0, 0.3, 0], rot: [0, 0, Math.PI / 2], porRaza: true, cuerpo: true, vientre: true },
      { geo: ['esfera', [0.13, 8, 6]], pos: [0.32, 0.34, 0], porRaza: true, cuerpo: true },
      { geo: ['cilindro', [0.055, 0.065, 0.09, 8]], pos: [0.45, 0.31, 0], rot: [0, 0, Math.PI / 2], color: '#d99a8a', cuerpo: true, fina: true },
      { geo: ['cono', [0.045, 0.11, 4]], pos: [0.3, 0.46, 0.08], rot: [0.75, 0, 0.4], rotRecta: [0.14, 0, 0.06], porRaza: true, cuerpo: true, fina: true },
      { geo: ['cono', [0.045, 0.11, 4]], pos: [0.3, 0.46, -0.08], rot: [-0.75, 0, 0.4], rotRecta: [-0.14, 0, 0.06], porRaza: true, cuerpo: true, fina: true },
      { geo: ['cono', [0.018, 0.12, 4]], pos: [-0.3, 0.38, 0], rot: [0, 0, 1.2], color: '#d99a8a', cuerpo: true, fina: true },
      { geo: ['cilindro', [0.035, 0.032, 0.2, 4]], pos: [0.16, 0.1, 0.1], color: '#7a5c4a' },
      { geo: ['cilindro', [0.035, 0.032, 0.2, 4]], pos: [0.16, 0.1, -0.1], color: '#7a5c4a' },
      { geo: ['cilindro', [0.035, 0.032, 0.2, 4]], pos: [-0.16, 0.1, 0.1], color: '#7a5c4a' },
      { geo: ['cilindro', [0.035, 0.032, 0.2, 4]], pos: [-0.16, 0.1, -0.1], color: '#7a5c4a' },
    ],
  },
  /* Fallback esquemático (retrocompat): una especie desconocida se dibuja como
     el Animalito de siempre — cuerpo + cabeza, nunca una caja huérfana. */
  animal: {
    gesto: 'balancea',
    alto: 0.6,
    partes: [
      { geo: ['capsula', [0.18, 0.34, 4, 8]], pos: [0, 0.28, 0], porRaza: true, cuerpo: true, vientre: true },
      { geo: ['esfera', [0.14, 8, 8]], pos: [0.24, 0.42, 0], porRaza: true, cuerpo: true },
    ],
  },
};

export function GeometriaParte({ geo }) {
  const [tipo, args] = geo;
  if (tipo === 'esfera') return <sphereGeometry args={args} />;
  if (tipo === 'capsula') return <capsuleGeometry args={args} />;
  if (tipo === 'cono') return <coneGeometry args={args} />;
  if (tipo === 'cilindro') return <cylinderGeometry args={args} />;
  return <icosahedronGeometry args={args} />;
}

/* La matriz LOCAL de una parte, compuesta una sola vez y cacheada en la tabla.
   Una parte con `rotRecta` (orejas) tiene DOS variantes cacheadas: la caída de
   siempre y la recta de las razas de oreja parada (San Pedreño, pietrain). */
const _euler = new THREE.Euler();
function matrizParte(parte, recta = false) {
  const usaRecta = recta && parte.rotRecta;
  const clave = usaRecta ? '_mRecta' : '_m';
  if (!parte[clave]) {
    const esc = /** @type {[number, number, number]} */ (Array.isArray(parte.escala) ? parte.escala : [1, 1, 1]);
    const pPos = /** @type {[number, number, number]} */ (parte.pos || [0, 0, 0]);
    const pRot = /** @type {[number, number, number]} */ ((usaRecta ? parte.rotRecta : parte.rot) || [0, 0, 0]);
    parte[clave] = new THREE.Matrix4().compose(
      new THREE.Vector3(...pPos),
      new THREE.Quaternion().setFromEuler(_euler.set(...pRot)),
      new THREE.Vector3(...esc),
    );
  }
  return parte[clave];
}

function colorDe(a, i) {
  if (a.color) return a.color;
  const raza = (a.raza || '').toLowerCase().trim();
  if (COLOR_RAZA[raza]) return COLOR_RAZA[raza];
  if (!raza) return PELAJES[i % PELAJES.length];
  let h = 0;
  for (const ch of raza) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return PELAJES[h % PELAJES.length];
}

/*
 * Normaliza `params.animales` a la forma interna. Acepta la interfaz NUEVA
 * ({especie, nombre, raza, tamano, estado}) y la VIEJA ({tipo, color, pos})
 * sin romper datos existentes. Sin `pos`, los sitios salen de una espiral
 * áurea determinista dentro de la cerca (aire entre animales, sin montoneras).
 */
const ORO = 2.39996323; // ángulo áureo: la espiral del girasol
const EJE_Y = new THREE.Vector3(0, 1, 0);
// eslint-disable-next-line react-refresh/only-export-components -- normalizador compartido entre mundos (export pre-existente)
export function normalizarAnimales(lista) {
  const n = Math.max(lista.length, 1);
  return lista.map((a, i) => {
    const clave = a.especie || a.tipo;
    const especie = ESPECIES[clave] ? clave : 'animal';
    const escala = TAMANOS[(a.tamano || 'mediano').toLowerCase()] ?? TAMANOS.mediano;
    const angulo = i * ORO + 0.9;
    const radio = 0.78 + 0.72 * Math.sqrt((i + 0.5) / n);
    const pos = a.pos || [Math.cos(angulo) * radio, 0, Math.sin(angulo) * radio];
    // rumbo pseudo-aleatorio pero DETERMINISTA (mismo hato, mismo corral)
    const rumbo = a.pos ? 0 : (Math.sin((i + 1) * 12.9898) * 43758.5453) % (Math.PI * 2);
    const estado = (a.estado || 'sano').toLowerCase();
    // El MOMENTO (audit §5a.4): un cambio de estado no es un salto brusco sino un
    // instante memorable que se ANIMA. `nace` (aparece una cría), `muerte` (se
    // retira con respeto) y `vendido` (viaja al mercado — mismo dato, dos mundos)
    // se sacan del hato instanciado y los dibuja AnimalMomento uno por uno.
    const momento =
      estado === 'nace' ? 'nace' : estado === 'muerte' ? 'muerte' : estado === 'vendido' ? 'vendido' : null;
    const color = new THREE.Color(colorDe(a, i));
    return {
      id: `${i}-${a.nombre || especie}`,
      especie,
      nombre: a.nombre || '',
      raza: a.raza || '',
      orejaRecta: OREJA_RECTA.has((a.raza || '').toLowerCase().trim()),
      tamano: a.tamano || 'mediano',
      estado,
      momento,
      escala,
      pos,
      fase: i * 1.7,
      vientre: estado.startsWith('pre') ? 1.18 : 1,
      color,
      colorCss: `#${color.getHexString()}`,
      mat: new THREE.Matrix4().compose(
        new THREE.Vector3(...pos),
        new THREE.Quaternion().setFromAxisAngle(EJE_Y, rumbo),
        new THREE.Vector3(escala, escala, escala),
      ),
    };
  });
}

/* El gesto de idle de la especie como matriz sobre el pivote del piso (las
   mismas amplitudes chicas del recinto original: vida, no espectáculo). */
function matrizGesto(m, gesto, t, fase) {
  if (gesto === 'picotea') {
    const p = Math.max(0, Math.sin(t * 1.6 + fase));
    m.makeRotationZ(-(p ** 6) * 0.5);
  } else if (gesto === 'respira') {
    m.makeScale(1, 1 + Math.sin(t * 0.9 + fase) * 0.02, 1);
  } else if (gesto === 'balancea') {
    m.makeRotationZ(Math.sin(t * 0.8 + fase) * 0.05);
  } else if (gesto === 'hocica') {
    const p = Math.max(0, Math.sin(t * 1.1 + fase));
    m.makeRotationZ(-(p ** 4) * 0.22);
  } else {
    m.identity();
  }
}

const _mTmp = new THREE.Matrix4();
const _mGesto = new THREE.Matrix4();
const _mVientre = new THREE.Matrix4();

/* matriz final de una instancia: animal × (gesto) × (vientre) × parte.
   El vientre de la preñada ensancha SOLO las partes `vientre` (el cuerpo),
   en el espacio del animal (z = los flancos; todas las especies miran a +x). */
function componer(destino, animal, parte, conGesto, t) {
  if (conGesto) {
    matrizGesto(_mGesto, ESPECIES[animal.especie].gesto, t, animal.fase);
    destino.multiplyMatrices(animal.mat, _mGesto);
  } else {
    destino.copy(animal.mat);
  }
  if (parte.vientre && animal.vientre !== 1) {
    destino.multiply(_mVientre.makeScale(1, 1.05, animal.vientre));
  }
  destino.multiply(matrizParte(parte, animal.orejaRecta));
}

/*
 * UNA parte de UNA especie como InstancedMesh de N instancias. El pelaje por
 * raza va como color de instancia (material blanco × instanceColor). Los
 * vendidos llegan en su propio grupo `fantasma` (material translúcido).
 */
function ParteInstanciada({ parte, lista, fantasma, animar, onPick }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    lista.forEach((a, i) => {
      componer(_mTmp, a, parte, false, 0);
      m.setMatrixAt(i, _mTmp);
      if (parte.porRaza) m.setColorAt(i, a.color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    // culling correcto: la esfera envolvente se calcula DESDE las instancias
    m.computeBoundingSphere();
  }, [lista, parte]);

  // Idle pecuario instanciado: solo partes `cuerpo` (patas plantadas), solo si
  // el gate reduced-motion + device-tier lo permite. N chico → costo trivial.
  useFrame((state) => {
    const m = ref.current;
    if (!animar || !parte.cuerpo || !m) return;
    const t = state.clock.elapsedTime;
    lista.forEach((a, i) => {
      componer(_mTmp, a, parte, true, t);
      m.setMatrixAt(i, _mTmp);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, lista.length]}
      onClick={(e) => {
        e.stopPropagation();
        const a = lista[e.instanceId];
        if (a) onPick(a);
      }}
    >
      <GeometriaParte geo={parte.geo} />
      <meshLambertMaterial
        color={parte.porRaza ? '#ffffff' : parte.color}
        flatShading
        transparent={fantasma}
        opacity={fantasma ? 0.35 : 1}
        depthWrite={!fantasma}
      />
    </instancedMesh>
  );
}

/* La señal de PREÑADA: una gota rosada suave que flota sobre el lomo (se ve
   sin leer, y la placa lo dice con palabras). Instanciada y con vaivén gateado. */
function MarcadoresPrenada({ animales, animar }) {
  const lista = useMemo(() => animales.filter((a) => a.estado.startsWith('pre')), [animales]);
  const ref = useRef(null);
  const posarlas = (m, t) => {
    lista.forEach((a, i) => {
      const alza = animar && t > 0 ? Math.sin(t * 1.4 + a.fase) * 0.03 : 0;
      _mTmp.makeTranslation(a.pos[0], ESPECIES[a.especie].alto * a.escala + 0.16 + alza, a.pos[2]);
      m.setMatrixAt(i, _mTmp);
    });
    m.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    if (!ref.current) return;
    posarlas(ref.current, 0);
    ref.current.computeBoundingSphere();
  });
  useFrame((state) => {
    if (!animar || !ref.current) return;
    posarlas(ref.current, state.clock.elapsedTime);
  });
  if (!lista.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, lista.length]}>
      <octahedronGeometry args={[0.055, 0]} />
      <meshBasicMaterial color="#d98fa0" transparent opacity={0.9} />
    </instancedMesh>
  );
}

/* ── El cartel de madera con el NOMBRE, clavado junto a su animal ─────────── */

/* El sitio del cartel: corrido hacia afuera del animal (radial), sin pasarse
   de la cerca (r=1.9), y mirando hacia afuera (se lee caminando el corral). */
function sitioCartel(a) {
  const r = Math.hypot(a.pos[0], a.pos[2]);
  const rc = Math.min(r + 0.34, 1.78);
  const dx = r > 0.001 ? a.pos[0] / r : 1;
  const dz = r > 0.001 ? a.pos[2] / r : 0;
  return { x: dx * rc, z: dz * rc, giro: Math.atan2(dx, dz) };
}

function CartelNombre({ animal, registrar, onPick, conTabla }) {
  const { x, z, giro } = sitioCartel(animal);
  // tablita torcida a mano (determinista por animal): lo artesanal del trazo
  const torcida = Math.sin(animal.fase * 3.1) * 0.05;
  const apagado = animal.estado === 'vendido';
  return (
    <group
      position={[x, 0, z]}
      rotation={[0, giro, 0]}
      ref={(el) => registrar(animal.id, 'raiz', el)}
      onClick={(e) => {
        e.stopPropagation();
        onPick(animal);
      }}
    >
      {/* la estaca: siempre presente — una estaca por animal, el conteo se ve */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.018, 0.026, 0.4, 5]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
      {/* modo punto: la perilla con el color del pelaje (¿de quién es? del que
          tiene este pelaje) — el anti-colisión la muestra cuando la tabla cede */}
      <mesh position={[0, 0.43, 0]} ref={(el) => registrar(animal.id, 'punto', el)}>
        <sphereGeometry args={[0.045, 8, 6]} />
        <meshLambertMaterial color={animal.colorCss} flatShading />
      </mesh>
      {/* modo plena: la tabla con el nombre, legible por ambas caras. En gama
          baja no se monta (LOD): la placa del toque sigue dando el nombre. */}
      {conTabla && (
        <group
          position={[0, 0.46, 0]}
          rotation={[0, 0, torcida]}
          ref={(el) => {
            registrar(animal.id, 'plena', el);
            if (el) el.visible = false; // arranca en punto; el 1er frame decide
          }}
        >
          <mesh>
            <boxGeometry args={[0.56, 0.2, 0.035]} />
            <meshLambertMaterial color={PALETA.maderaClara} flatShading />
          </mesh>
          {[0.022, -0.022].map((lado) => (
            <Text
              key={lado}
              position={[0, 0, lado]}
              rotation={[0, lado < 0 ? Math.PI : 0, 0]}
              fontSize={0.1}
              maxWidth={0.5}
              color={apagado ? '#6a5a44' : '#241a10'}
              anchorX="center"
              anchorY="middle"
            >
              {animal.nombre}
            </Text>
          ))}
        </group>
      )}
    </group>
  );
}

/*
 * Anti-colisión de carteles: el MISMO juicio de RotulosLugares del valle
 * (SPEC-UX-01), adaptado de botones-Html a maderos 3D: por foco/proximidad
 * solo el cartel más apuntado (o el del animal tocado) muestra su tabla plena
 * con histéresis anti-parpadeo; los demás se calman a perilla; quien pisa un
 * espacio ya tomado en PANTALLA, cede. Se escribe imperativo sobre `visible`
 * (~12 pasadas/s, cero re-render por frame; corre en el PRIMER frame, que es
 * el que importa con frameloop='demand' de reduced-motion).
 */
const _proj = new THREE.Vector3();

function CartelesNombres({ animales, seleccionId, onPick, conTabla }) {
  const nodos = useRef({});
  const plena = useRef(null);
  const tick = useRef(0);
  const registrar = (id, capa, el) => {
    (nodos.current[id] ||= {})[capa] = el;
  };
  const conNombre = useMemo(() => animales.filter((a) => a.nombre), [animales]);
  const anclas = useMemo(
    () =>
      conNombre.map((a) => {
        const { x, z } = sitioCartel(a);
        return { a, v: new THREE.Vector3(x, 0.46, z) };
      }),
    [conNombre],
  );

  useFrame(({ camera: cam, size }) => {
    if (tick.current++ % 5 !== 0) return;
    const perspCam = /** @type {import('three').PerspectiveCamera} */ (cam);
    // px por metro a cada distancia (cámara en perspectiva): para estimar el
    // rect EN PANTALLA de una tabla de tamaño constante EN MUNDO.
    const foco = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(perspCam.fov) * 0.5));
    const pts = anclas.map(({ a, v }) => {
      _proj.copy(v).project(perspCam);
      const x = (_proj.x * 0.5 + 0.5) * size.width;
      const y = (0.5 - _proj.y * 0.5) * size.height;
      return {
        id: a.id,
        x,
        y,
        pxm: foco / Math.max(perspCam.position.distanceTo(v), 0.1),
        dc: Math.hypot(x - size.width / 2, y - size.height / 2),
        elegible: _proj.z <= 1,
      };
    });

    // foco/proximidad: manda el animal tocado; si no, el cartel más apuntado,
    // con histéresis (cambia solo si otro queda 20% más centrado).
    let candidata = null;
    if (seleccionId && pts.some((p) => p.id === seleccionId)) {
      candidata = seleccionId;
    } else {
      const previa = pts.find((p) => p.id === plena.current && p.elegible);
      const cercana = pts.filter((p) => p.elegible).sort((a, b) => a.dc - b.dc)[0];
      candidata =
        previa && cercana && cercana.dc > previa.dc * 0.8 ? previa.id : (cercana?.id ?? null);
    }
    plena.current = candidata;

    const MARGEN = 6;
    const tomados = [];
    const rectoDe = (x, y, w, h) => ({
      x0: x - w / 2 - MARGEN,
      x1: x + w / 2 + MARGEN,
      y0: y - h / 2 - MARGEN,
      y1: y + h / 2 + MARGEN,
    });
    const pisa = (r) =>
      tomados.some((o) => r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0);
    const orden = [...pts].sort((a, b) =>
      a.id === candidata ? -1 : b.id === candidata ? 1 : a.dc - b.dc,
    );
    for (const p of orden) {
      let modo = 'oculto';
      if (p.elegible) {
        const esPlena = conTabla && p.id === candidata;
        const w = Math.max((esPlena ? 0.62 : 0.1) * p.pxm, 14);
        const h = Math.max((esPlena ? 0.24 : 0.1) * p.pxm, 14);
        const r = rectoDe(p.x, p.y, w, h);
        if (!pisa(r)) {
          tomados.push(r);
          modo = esPlena ? 'plena' : 'punto';
        }
      }
      const nd = nodos.current[p.id];
      if (!nd) continue;
      if (nd.raiz) nd.raiz.visible = modo !== 'oculto';
      if (nd.plena) nd.plena.visible = modo === 'plena';
      if (nd.punto) nd.punto.visible = modo === 'punto';
    }
  });

  return conNombre.map((a) => (
    <CartelNombre key={a.id} animal={a} registrar={registrar} onPick={onPick} conTabla={conTabla} />
  ));
}

/* La placa flotante del TOQUE: nombre + raza + tamaño (+ estado con palabras).
   Mismo lenguaje de píldora de papel de los hotspots; tocar de nuevo cierra. */
function PlacaAnimal({ animal, onCerrar }) {
  const alto = ESPECIES[animal.especie].alto * animal.escala + 0.5;
  const meta = [animal.raza, animal.tamano].filter(Boolean).join(' · ');
  const especial = animal.estado !== 'sano';
  const claseEstado = animal.estado.startsWith('pre')
    ? 'prenada'
    : animal.estado === 'nace'
      ? 'nace'
      : animal.estado === 'muerte'
        ? 'muerte'
        : 'vendido';
  const textoEstado = animal.estado.startsWith('pre')
    ? 'Preñada'
    : animal.estado === 'nace'
      ? 'Recién nacida'
      : animal.estado === 'muerte'
        ? 'En memoria'
        : animal.estado === 'vendido'
          ? 'Vendido'
          : animal.estado;
  return (
    <group position={[animal.pos[0], alto, animal.pos[2]]}>
      <Html center distanceFactor={8.5} zIndexRange={[25, 0]}>
        <button
          type="button"
          className="mundo-placa"
          style={{ '--placa-tinte': animal.colorCss }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onCerrar();
          }}
          aria-label={`${animal.nombre || 'Animal'}${meta ? `, ${meta}` : ''}${especial ? `, ${textoEstado}` : ''}. Toque para cerrar.`}
        >
          <strong className="mundo-placa__nombre">{animal.nombre || 'Sin nombre'}</strong>
          {meta && <span className="mundo-placa__meta">{meta}</span>}
          {especial && (
            <span className={`mundo-placa__estado mundo-placa__estado--${claseEstado}`}>
              {textoEstado}
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

/*
 * El HATO completo: instancias por especie (vivos y vendidos-fantasma en
 * grupos aparte), señales de preñez, carteles con nombre y la placa del toque.
 */
export default function CorralVivo({ animales: lista, reducedMotion, tier = 'alto' }) {
  const animales = useMemo(() => normalizarAnimales(lista || []), [lista]);
  const [seleccion, setSeleccion] = useState(null);
  // GATE doble: reduced-motion apaga el idle; gama baja tampoco lo paga.
  const animar = !reducedMotion && tier !== 'bajo';
  // LOD gama baja: sin tablas con Text (queda estaca+perilla; la placa nombra)
  const conTabla = tier !== 'bajo';
  // El hato instanciado NO incluye los que están viviendo su momento (nace/
  // muerte): esos los dibuja AnimalMomento, uno por uno, para animarles el
  // instante (escala/opacidad/gesto propios que la instancia compartida no da).
  // `vendido` SÍ se queda aquí, como huella-fantasma (su vida está en el mercado).
  const { grupos, momentos } = useMemo(() => {
    const g = new Map();
    const mm = [];
    for (const a of animales) {
      if (a.momento === 'nace' || a.momento === 'muerte') {
        mm.push(a);
        continue;
      }
      const k = `${a.especie}${a.estado === 'vendido' ? '|fantasma' : ''}`;
      if (!g.has(k)) g.set(k, { clave: k, especie: a.especie, fantasma: a.estado === 'vendido', lista: [] });
      g.get(k).lista.push(a);
    }
    return { grupos: [...g.values()], momentos: mm };
  }, [animales]);
  const alPicar = (a) => setSeleccion((s) => (s?.id === a.id ? null : a));

  return (
    <group>
      {grupos.map((g) => (
        <Fragment key={g.clave}>
          {ESPECIES[g.especie].partes
            .filter((p) => !p.fina || tier !== 'bajo')
            .map((p, j) => (
              <ParteInstanciada
                key={j}
                parte={p}
                lista={g.lista}
                fantasma={g.fantasma}
                animar={animar && !g.fantasma}
                onPick={alPicar}
              />
            ))}
        </Fragment>
      ))}
      {/* Los MOMENTOS del corral: la cría que nace, el que se despide con respeto.
          Cada uno vive su instante; tocarlo abre su placa igual que a los demás. */}
      {momentos.map((a) => (
        <AnimalMomento
          key={a.id}
          animal={a}
          modo={a.momento}
          destino={a.pos}
          origen={a.pos}
          reducedMotion={reducedMotion}
          tier={tier}
          onPick={alPicar}
        />
      ))}
      <MarcadoresPrenada animales={animales} animar={animar} />
      <CartelesNombres
        animales={animales}
        seleccionId={seleccion?.id}
        onPick={alPicar}
        conTabla={conTabla}
      />
      {seleccion && <PlacaAnimal animal={seleccion} onCerrar={() => setSeleccion(null)} />}
    </group>
  );
}
