/*
 * ValleLluvia3D — el VALLE BAJO LA LLUVIA, como mundo 3D didáctico.
 *
 * Una sola escena low-poly vive un ciclo de tormenta completo:
 *
 *   se acumulan las nubes → llovizna suave → aguacero (el río crece, los
 *   charcos se forman, un relámpago lejano) → escampa (arcoíris tenue,
 *   los charcos infiltran) → cielo abierto… y el ciclo vuelve a empezar.
 *
 * DIDÁCTICA (sobria, en «usted», sin gamificación) — cosechar la lluvia,
 * no dejar que inunde ni arrastre el suelo:
 *   - El techo de la casita cosecha el aguacero: el chorrito baja al tanque
 *     y el tanque SE LLENA mientras llueve (se ve, no solo se dice).
 *   - Las zanjas de infiltración en la ladera frenan el agua y la siembran.
 *   - El río crece con la tormenta y baja DESPACIO: respete su ronda.
 *   - Los charcos de la vega no son problema: infiltran despacio al suelo.
 *
 * DIRECCIÓN DE ARTE: hora coherente con `atmosferaMadre` (ATMOSFERA + la
 * receta `mezclarCielo` — la MISMA ley que EscenaBase3D). La tormenta no
 * inventa otra hora: OSCURECE la misma tarde dorada hacia un gris cálido y
 * la devuelve. Materiales de PALETA (el único azul con permiso es el agua).
 *
 * RENDIMIENTO: MeshLambert/Basic, sin shadow-maps ni post-proceso. La lluvia
 * es UN InstancedMesh transform-only (matrices recompuestas sobre temporales
 * de módulo, cero asignaciones por frame) con presupuesto por `tier`. Todo el
 * ruido es determinista (hash de senos + crearRng sembrado): nada de
 * Math.random en render. `reducedMotion` congela el clima en su fase (snap
 * sin animación), NO monta la cortina de lluvia (hilos congelados leen como
 * glitch) y pasa el frameloop a demanda.
 *
 * Mockup standalone con su PROPIO <Canvas>. NO toca mundoData ni el host.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { ATMOSFERA, CIELOS, PALETA, mezclar, mezclarCielo } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { crearRng } from '../visual/mundo3d/particulasData.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';

/* ── La hora del valle (la madre, vía la MISMA receta de EscenaBase3D) y su
      polo de tormenta: el mismo cielo, oscurecido hacia un gris CÁLIDO.
      Constantes de módulo: mezclas una sola vez, jamás por frame. ── */
const CIELO_SOL = mezclarCielo(CIELOS.neutro);
const GRIS_TORMENTA = '#727c88'; // gris de panza de nube — nunca negro
const CIELO_LLUVIA = {
  fondo: mezclar(CIELO_SOL.fondo, GRIS_TORMENTA, 0.62),
  cielo: mezclar(CIELO_SOL.cielo, GRIS_TORMENTA, 0.55),
  suelo: mezclar(CIELO_SOL.suelo, GRIS_TORMENTA, 0.4),
  niebla: mezclar(CIELO_SOL.niebla, GRIS_TORMENTA, 0.58),
};

/* Polos de color pre-instanciados (THREE.Color) para lerpear por frame sin
   asignar. TMP_* son los únicos temporales que se mutan. */
const COL = {
  fondoSol: new THREE.Color(CIELO_SOL.fondo),
  fondoGris: new THREE.Color(CIELO_LLUVIA.fondo),
  cieloSol: new THREE.Color(CIELO_SOL.cielo),
  cieloGris: new THREE.Color(CIELO_LLUVIA.cielo),
  sueloSol: new THREE.Color(CIELO_SOL.suelo),
  sueloGris: new THREE.Color(CIELO_LLUVIA.suelo),
  nieblaSol: new THREE.Color(CIELO_SOL.niebla),
  nieblaGris: new THREE.Color(CIELO_LLUVIA.niebla),
  luzSol: new THREE.Color(ATMOSFERA.luz),
  luzGris: new THREE.Color('#b6bfc9'),
  flash: new THREE.Color('#eef3fa'),
  nubeClara: new THREE.Color('#fbf4e6'),
  nubeGris: new THREE.Color('#6f7984'),
  aguaViva: new THREE.Color(PALETA.agua),
  aguaCrecida: new THREE.Color('#6d7a55'), // sedimento: el río crecido arrastra
  charcoClaro: new THREE.Color('#ccd9e0'),
  charcoGris: new THREE.Color('#8b96a1'),
};
const TMP_M = new THREE.Matrix4();
const TMP_P = new THREE.Vector3();
const TMP_S = new THREE.Vector3();
const Q_ID = new THREE.Quaternion();

/* ── Geografía: X oriente(+)/occidente(−) · Y altura · Z loma atrás(−) → vega
      adelante(+). El río corre de la loma a la vega culebreando. ── */
const ANCHO = 19;
const FONDO = 16;
const TECHO_LLUVIA = 7.5; // de dónde caen las gotas

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const suavizar = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const gauss = (wx, wz, cx, cz, sx, sz) => {
  const dx = wx - cx, dz = wz - cz;
  return Math.exp(-((dx * dx) / (2 * sx * sx) + (dz * dz) / (2 * sz * sz)));
};
/* Ruido determinista (hash de senos): el mismo valle siempre, sin Math.random. */
const ruido = (wx, wz) =>
  Math.sin(wx * 1.3 + wz * 0.9) * 0.5 +
  Math.sin(wx * 2.3 - wz * 1.6 + 1.7) * 0.3 +
  Math.sin(wx * 3.9 + wz * 2.7 + 4.2) * 0.2;

/* El cauce del río: un meandro suave en X según Z. */
const rioX = (wz) => Math.sin(wz * 0.42 + 0.6) * 1.1 - 0.4;

function alturaBase(wx, wz) {
  const s = clamp((2.4 - wz) / 9.5, 0, 1); // rampa vega(+z) → loma(−z)
  let h = Math.pow(s, 1.35) * 2.7;
  h += gauss(wx, wz, -6.2, -6.4, 2.8, 2.4) * 1.5; // loma occidental
  h += gauss(wx, wz, 6.4, -6.8, 3.2, 2.6) * 1.15; // estribación oriental
  h += ruido(wx, wz) * 0.09 * (0.3 + s); // textura, más quieta en la vega
  h *= 1 - 0.5 * gauss(wx, wz, 4.2, 3.2, 3.4, 2.6) * (1 - s * 0.5); // vega amable
  return h;
}
/* Altura final: la base con el cauce tallado. El truco de la CRECIDA vive
   aquí: el agua es una cinta pegada al lecho que SUBE con el nivel; como las
   orillas talladas son en pendiente, subir = ensancharse solo. */
function altura(wx, wz) {
  const d = Math.abs(wx - rioX(wz));
  return alturaBase(wx, wz) - suavizar(1.35, 0, d) * 0.62;
}

/* ── Piezas fijas de la escena (module-level: deterministas, una vez) ── */
const CASA = { x: 5.2, z: -1.2 };
const CASA_Y = altura(CASA.x, CASA.z);
const TANQUE = { x: CASA.x - 1.15, z: CASA.z + 0.55 };
const CHARCOS = [
  { x: 3.0, z: 3.3, r: 0.62 },
  { x: 4.9, z: 4.3, r: 0.45 },
  { x: 2.0, z: 5.0, r: 0.38 },
  { x: -4.2, z: 4.7, r: 0.52 },
  { x: 5.9, z: 2.5, r: 0.34 },
].map((c) => ({ ...c, y: altura(c.x, c.z) + 0.03 }));
const ZANJAS = [
  { x: -1.7, z: -3.5, giro: 0.14 },
  { x: 1.0, z: -4.7, giro: -0.1 },
];
const NUBES = [
  { dentro: [-3.6, 5.4, -3.8], fuera: [-15, 5.6, -5.2], esc: 1.35, fase: 0.5 },
  { dentro: [2.4, 5.9, -1.6], fuera: [13.5, 6.1, -3.0], esc: 1.7, fase: 2.1 },
  { dentro: [6.0, 5.1, 2.2], fuera: [16, 5.3, 3.4], esc: 1.15, fase: 4.2 },
  { dentro: [-1.2, 6.3, 3.0], fuera: [-14, 6.5, 5.0], esc: 1.5, fase: 1.3 },
];
const ARBOLES = (() => {
  const rng = crearRng(5);
  return [
    [-5.4, 1.8], [-6.6, 4.6], [7.4, 0.4], [8.0, 3.8],
    [-2.4, -5.6], [2.8, -6.2], [-7.4, -2.6],
  ].map(([x, z]) => ({
    x, z, y: altura(x, z),
    esc: 0.8 + rng() * 0.5,
    fase: rng() * Math.PI * 2,
    oscuro: rng() > 0.5,
  }));
})();
const ARCOIRIS = [
  { r: 4.7, color: '#d9756a', op: 0.15 },
  { r: 4.52, color: '#dba05b', op: 0.13 },
  { r: 4.34, color: '#d5c468', op: 0.12 },
  { r: 4.16, color: '#84a86a', op: 0.12 },
  { r: 3.98, color: '#6f93b5', op: 0.1 },
];

/* ── Las FASES de la tormenta: objetivos de clima + narración (datos, no UI).
      El director AMORTIGUA hacia estos objetivos con ritmos asimétricos:
      el río sube rápido y baja lento; el charco se forma rápido e infiltra
      despacio — la física del agua, contada con dos constantes. ── */
const FASES = {
  nubes: {
    titulo: 'Se acumulan las nubes',
    frase: 'Las nubes se arman sobre la loma. Buen momento para revisar las zanjas, la canaleta y el tanque: el agua que viene se puede sembrar.',
    dur: 10,
    clima: { nub: 0.72, lluvia: 0, rio: 0.14, charcos: 0.04, viento: 0.42, oscuro: 0.42, arcoiris: 0 },
  },
  llovizna: {
    titulo: 'Llovizna',
    frase: 'Llueve suave. El suelo cubierto la recibe como esponja y el techo ya la está juntando en el tanque.',
    dur: 10,
    clima: { nub: 0.85, lluvia: 0.32, rio: 0.34, charcos: 0.35, viento: 0.5, oscuro: 0.56, arcoiris: 0 },
  },
  aguacero: {
    titulo: 'Aguacero',
    frase: 'Aguacero. Las zanjas frenan el agua en la ladera y el río crece: déjele su ronda, no siembre en la orilla.',
    dur: 16,
    clima: { nub: 1, lluvia: 1, rio: 1, charcos: 1, viento: 0.85, oscuro: 0.78, arcoiris: 0 },
  },
  escampa: {
    titulo: 'Escampa',
    frase: 'Escampa. Los charcos infiltran despacio, el río baja sin afán y el tanque quedó cargado para los días secos.',
    dur: 13,
    clima: { nub: 0.45, lluvia: 0.05, rio: 0.62, charcos: 0.75, viento: 0.2, oscuro: 0.18, arcoiris: 1 },
  },
  despejado: {
    titulo: 'Cielo abierto',
    frase: 'Cielo abierto. La lluvia bien cosechada no se pierde ni arrastra el suelo: queda sembrada en la tierra y guardada en el tanque.',
    dur: 11,
    clima: { nub: 0.18, lluvia: 0, rio: 0.2, charcos: 0.15, viento: 0.12, oscuro: 0.05, arcoiris: 0 },
  },
};
const ORDEN = ['nubes', 'llovizna', 'aguacero', 'escampa', 'despejado'];
const SIGUIENTE = ORDEN.reduce((acc, id, i) => {
  acc[id] = ORDEN[(i + 1) % ORDEN.length];
  return acc;
}, {});
/* Ritmos [subida, bajada] por canal (1/s): la asimetría ES la didáctica. */
const RITMOS = {
  nub: [0.45, 0.3],
  lluvia: [0.9, 0.7],
  rio: [1.1, 0.22],
  charcos: [0.9, 0.11],
  viento: [0.6, 0.5],
  oscuro: [0.5, 0.4],
  arcoiris: [0.5, 0.35],
};
const CLIMA_INICIAL = {
  nub: 0.3, lluvia: 0, rio: 0.15, charcos: 0.05, viento: 0.2,
  oscuro: 0.15, arcoiris: 0, flash: 0, tanque: 0.12,
};

/* ── El DIRECTOR del clima: un solo useFrame (prioridad −1: corre antes que
      los consumidores) muta `climaRef` amortiguando hacia la fase, agenda el
      relámpago con rng sembrado y avanza el ciclo si nadie lo fijó. ── */
function ClimaDirector({ climaRef, fase, pin, reducedMotion, alCambiar }) {
  const acumulado = useRef(0);
  const proximoRayo = useRef(0);
  const rng = useRef(null);
  useEffect(() => {
    acumulado.current = 0;
  }, [fase]);

  useFrame((st, dtCrudo) => {
    const dt = Math.min(dtCrudo, 0.08);
    const c = climaRef.current;
    const f = FASES[fase];
    for (const canal of Object.keys(RITMOS)) {
      const delta = f.clima[canal] - c[canal];
      const ritmo = RITMOS[canal][delta >= 0 ? 0 : 1];
      const k = reducedMotion ? 1 : 1 - Math.exp(-ritmo * dt);
      c[canal] += delta * k;
    }
    /* Relámpago LEJANO, solo en pleno aguacero: agenda determinista. */
    if (!reducedMotion && f.clima.lluvia > 0.9) {
      if (!rng.current) rng.current = crearRng(31);
      const t = st.clock.elapsedTime;
      if (proximoRayo.current === 0) {
        proximoRayo.current = t + 2.5 + rng.current() * 4;
      } else if (t >= proximoRayo.current) {
        c.flash = 1;
        proximoRayo.current = t + 4.5 + rng.current() * 6.5;
      }
    } else {
      proximoRayo.current = 0;
    }
    c.flash = Math.max(0, c.flash - dt * 3.2);
    /* El tanque se llena mientras llueve y se usa (despacio) en seco. */
    const gasto = fase === 'despejado' ? dt * 0.006 : 0;
    c.tanque = clamp(c.tanque + c.lluvia * dt * 0.03 - gasto, 0.1, 1);
    /* Ciclo automático (si el usuario no fijó una fase). */
    if (!pin && !reducedMotion) {
      acumulado.current += dt;
      if (acumulado.current > f.dur) {
        acumulado.current = 0;
        alCambiar(SIGUIENTE[fase]);
      }
    }
  }, -1);
  return null;
}

/* ── La ATMÓSFERA viva: fondo, niebla y luces lerpeados entre la hora dorada
      y la panza de tormenta; el flash del rayo abre el cielo un instante. ── */
function AtmosferaViva({ climaRef, perfil }) {
  const fondo = useRef(null);
  const niebla = useRef(null);
  const hemi = useRef(null);
  const ambiente = useRef(null);
  const sol = useRef(null);
  const rayo = useRef(null);
  const resplandor = useRef(null);
  useFrame(() => {
    const c = climaRef.current;
    const o = c.oscuro;
    if (fondo.current) {
      fondo.current.copy(COL.fondoSol).lerp(COL.fondoGris, o).lerp(COL.flash, c.flash * 0.2);
    }
    if (niebla.current) {
      niebla.current.color.copy(COL.nieblaSol).lerp(COL.nieblaGris, o);
      niebla.current.density = 0.024 + o * 0.02;
    }
    if (hemi.current) {
      hemi.current.intensity = 0.68 * (1 - 0.4 * o);
      hemi.current.color.copy(COL.cieloSol).lerp(COL.cieloGris, o);
      hemi.current.groundColor.copy(COL.sueloSol).lerp(COL.sueloGris, o);
    }
    if (ambiente.current) ambiente.current.intensity = 0.3 * (1 - 0.25 * o);
    if (sol.current) {
      sol.current.intensity = 0.95 * (1 - 0.72 * o);
      sol.current.color.copy(COL.luzSol).lerp(COL.luzGris, o);
    }
    if (rayo.current) rayo.current.intensity = c.flash * 1.2;
    if (resplandor.current) resplandor.current.opacity = c.flash * 0.42;
  });
  return (
    <>
      <color ref={fondo} attach="background" args={[CIELO_SOL.fondo]} />
      {perfil.fog ? <fogExp2 ref={niebla} attach="fog" args={[CIELO_SOL.niebla, 0.026]} /> : null}
      <hemisphereLight ref={hemi} intensity={0.68} color={CIELO_SOL.cielo} groundColor={CIELO_SOL.suelo} />
      <ambientLight ref={ambiente} intensity={0.3} color={ATMOSFERA.luz} />
      {/* el mismo sol del valle: dirección [6,9,4], sin shadow-map */}
      <directionalLight ref={sol} position={[6, 9, 4]} intensity={0.95} color={ATMOSFERA.luz} />
      <directionalLight position={[-5, 4, -6]} intensity={0.24} color={ATMOSFERA.relleno} />
      {/* el rayo LEJANO: una luz fría detrás de la loma + su resplandor */}
      <directionalLight ref={rayo} position={[-2, 6, -9]} intensity={0} color="#e3ebf7" />
      <mesh position={[0.4, 2.6, -8.6]}>
        <planeGeometry args={[18, 5.4]} />
        <meshBasicMaterial ref={resplandor} color="#e8eef8" transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}

/* El sol bajo de la hora dorada (hermano del de la Sierra), que la nubazón
   va velando: opacidad por disco horneada en userData, apagada por `nub`. */
function SolVelado({ climaRef }) {
  const grupo = useRef(null);
  useFrame(() => {
    const g = grupo.current;
    if (!g) return;
    const velo = 1 - climaRef.current.nub * 0.88;
    for (const disco of g.children) {
      disco.material.opacity = disco.userData.op * velo;
    }
  });
  return (
    <group ref={grupo} position={[-12, 4.6, -7.5]}>
      <mesh userData={{ op: 0.98 }}>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial color="#fff2cf" transparent opacity={0.98} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]} userData={{ op: 0.38 }}>
        <circleGeometry args={[2.0, 32]} />
        <meshBasicMaterial color="#ffd98f" transparent opacity={0.38} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]} userData={{ op: 0.16 }}>
        <circleGeometry args={[3.4, 32]} />
        <meshBasicMaterial color="#f7c66b" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ── El TERRENO: heightfield procedural determinista con colores por vértice
      (pasto, loma en sombra, banda húmeda junto al cauce). Se construye UNA
      vez; la lluvia no lo muta (los charcos son espejos aparte). ── */
function construirTerreno() {
  const geo = new THREE.PlaneGeometry(ANCHO, FONDO, 72, 60);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const claro = new THREE.Color(PALETA.follajeClaro);
  const medio = new THREE.Color(PALETA.follaje);
  const sombra = new THREE.Color(PALETA.follajeOscuro);
  const humedo = new THREE.Color('#5d4a30');
  for (let i = 0; i < pos.count; i++) {
    const wx = pos.getX(i);
    const wz = pos.getZ(i);
    const h = altura(wx, wz);
    pos.setY(i, h);
    const mezcla = 0.5 + ruido(wx * 1.7, wz * 1.3) * 0.5;
    c.copy(claro).lerp(medio, clamp(mezcla, 0, 1));
    c.lerp(sombra, suavizar(1.5, 2.9, h) * 0.6); // la loma alta, más honda
    const d = Math.abs(wx - rioX(wz));
    c.lerp(humedo, suavizar(1.4, 0.3, d) * 0.7); // la orilla, ya oscura
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

/* La cinta del río, pegada al lecho. Es ancha a propósito: en nivel bajo las
   orillas la tapan y se lee angosta; cuando el mesh SUBE (crecida) emerge por
   las orillas en pendiente y se lee ancha — la crecida sale gratis. */
function construirRio() {
  const seg = 64;
  const medio = 1.35;
  const pos = new Float32Array((seg + 1) * 2 * 3);
  const idx = [];
  for (let k = 0; k <= seg; k++) {
    const z = -FONDO / 2 - 0.4 + (FONDO + 0.8) * (k / seg);
    const cx = rioX(z);
    const y = altura(cx, z) + 0.05;
    const j = k * 6;
    pos[j] = cx - medio; pos[j + 1] = y; pos[j + 2] = z;
    pos[j + 3] = cx + medio; pos[j + 4] = y; pos[j + 5] = z;
    if (k < seg) {
      const a = k * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function RioCreciente({ climaRef, geometria, reducedMotion }) {
  const cuerpo = useRef(null);
  const mat = useRef(null);
  useFrame((st) => {
    const c = climaRef.current;
    if (!cuerpo.current || !mat.current) return;
    cuerpo.current.position.y = c.rio * 0.3;
    mat.current.color.copy(COL.aguaViva).lerp(COL.aguaCrecida, clamp(c.rio * 0.75, 0, 1));
    mat.current.opacity = reducedMotion
      ? 0.88
      : 0.85 + Math.sin(st.clock.elapsedTime * (0.9 + c.rio * 1.6)) * 0.05;
  });
  return (
    <mesh ref={cuerpo} geometry={geometria}>
      <meshLambertMaterial
        ref={mat}
        color={PALETA.agua}
        transparent
        opacity={0.88}
        emissive="#2a6a86"
        emissiveIntensity={0.22}
      />
    </mesh>
  );
}

/* ── CHARCOS: espejos en la vega que crecen con la lluvia e infiltran
      despacio al escampar. Escala = nivel; el brillo copia el cielo. ── */
function Charcos({ climaRef, reducedMotion }) {
  const grupo = useRef(null);
  useFrame((st) => {
    const g = grupo.current;
    if (!g) return;
    const c = climaRef.current;
    const t = st.clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const espejo = g.children[i];
      espejo.scale.setScalar(CHARCOS[i].r * Math.max(c.charcos, 0.001));
      const mat = espejo.material;
      mat.color.copy(COL.charcoClaro).lerp(COL.charcoGris, c.oscuro);
      const temblor = reducedMotion ? 0 : Math.sin(t * 1.5 + i * 2.1) * 0.06 * c.lluvia;
      mat.opacity = 0.3 + 0.4 * c.charcos + temblor;
    }
  });
  return (
    <group ref={grupo}>
      {CHARCOS.map((ch, i) => (
        <mesh key={i} position={[ch.x, ch.y, ch.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1, 10]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ── La CORTINA de lluvia: UN InstancedMesh de hilitos, transform-only.
      Siembra determinista (x, z, suelo, velocidad) por crearRng; por frame
      solo se recomponen matrices sobre temporales de módulo. La intensidad
      decide cuántas gotas viven (el resto se esconde a escala 0) y el viento
      ladea toda la cortina. No se monta con reduced-motion. ── */
function CortinaLluvia({ climaRef, n }) {
  const grupo = useRef(null);
  const inst = useRef(null);
  const mat = useRef(null);
  const gotas = useMemo(() => {
    const rng = crearRng(11);
    const lista = [];
    for (let i = 0; i < n; i++) {
      const x = (rng() - 0.5) * (ANCHO - 1.5);
      const z = (rng() - 0.5) * (FONDO - 1.5);
      lista.push({
        x,
        z,
        suelo: altura(x, z) + 0.1,
        vel: 0.75 + rng() * 0.55,
        fase: rng(),
      });
    }
    return lista;
  }, [n]);
  useFrame((st) => {
    if (!inst.current) return;
    const c = climaRef.current;
    const t = st.clock.elapsedTime;
    const vivas = Math.round(n * clamp(c.lluvia * 1.12, 0, 1));
    for (let i = 0; i < n; i++) {
      const g = gotas[i];
      if (i < vivas) {
        const tramo = TECHO_LLUVIA - g.suelo;
        const y = TECHO_LLUVIA - ((t * 6.4 * g.vel + g.fase * tramo * 7) % tramo);
        TMP_P.set(g.x, y, g.z);
        TMP_S.set(1, 0.7 + 0.5 * c.lluvia, 1);
      } else {
        TMP_P.set(g.x, -1, g.z);
        TMP_S.set(0, 0, 0);
      }
      TMP_M.compose(TMP_P, Q_ID, TMP_S);
      inst.current.setMatrixAt(i, TMP_M);
    }
    inst.current.instanceMatrix.needsUpdate = true;
    if (mat.current) mat.current.opacity = 0.12 + 0.3 * c.lluvia;
    if (grupo.current) grupo.current.rotation.z = -0.09 * c.viento;
  });
  return (
    <group ref={grupo}>
      <instancedMesh ref={inst} args={[undefined, undefined, n]} frustumCulled={false}>
        <cylinderGeometry args={[0.011, 0.011, 0.42, 3]} />
        <meshBasicMaterial ref={mat} color="#d7e4ec" transparent opacity={0.2} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

/* ── NUBES que se acumulan: entran desde fuera de escena con `nub`, se
      hinchan y oscurecen; al despejar se retiran y aclaran solas. ── */
const lerp = (a, b, t) => a + (b - a) * t;
function Nubario({ climaRef, reducedMotion }) {
  const grupo = useRef(null);
  useFrame((st) => {
    const g = grupo.current;
    if (!g) return;
    const c = climaRef.current;
    const t = reducedMotion ? 0 : st.clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const nube = g.children[i];
      const d = NUBES[i];
      const avance = suavizar(0, 1, c.nub);
      nube.position.set(
        lerp(d.fuera[0], d.dentro[0], avance) + Math.sin(t * 0.05 + d.fase) * 0.5,
        lerp(d.fuera[1], d.dentro[1], avance) + Math.sin(t * 0.09 + d.fase * 2) * 0.12,
        lerp(d.fuera[2], d.dentro[2], avance),
      );
      nube.scale.setScalar(d.esc * (0.55 + 0.6 * c.nub));
      for (const blob of nube.children) {
        blob.material.color.copy(COL.nubeClara).lerp(COL.nubeGris, c.oscuro * 0.9);
        blob.material.opacity = blob.userData.op * (0.35 + 0.62 * c.nub);
      }
    }
  });
  return (
    <group ref={grupo}>
      {NUBES.map((d, i) => (
        <group key={i} position={/** @type {[number, number, number]} */ (d.fuera)}>
          <mesh scale={[1.9, 0.62, 1.15]} userData={{ op: 0.88 }}>
            <sphereGeometry args={[0.7, 9, 7]} />
            <meshBasicMaterial color="#fbf4e6" transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh position={[0.85, 0.05, 0.1]} scale={[1.1, 0.5, 0.9]} userData={{ op: 0.78 }}>
            <sphereGeometry args={[0.62, 8, 6]} />
            <meshBasicMaterial color="#fdf8ee" transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh position={[-0.9, -0.04, -0.1]} scale={[1, 0.45, 0.8]} userData={{ op: 0.7 }}>
            <sphereGeometry args={[0.6, 8, 6]} />
            <meshBasicMaterial color="#f8f0dd" transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── El ARCOÍRIS tenue de después: cinco arcos que apenas se insinúan,
      opuestos al sol, y se van con la calma. ── */
function Arcoiris({ climaRef }) {
  const grupo = useRef(null);
  useFrame(() => {
    const g = grupo.current;
    if (!g) return;
    const nivel = climaRef.current.arcoiris;
    g.visible = nivel > 0.02;
    for (let i = 0; i < g.children.length; i++) {
      g.children[i].material.opacity = ARCOIRIS[i].op * nivel;
    }
  });
  return (
    <group ref={grupo} position={[5.4, 0.1, -5.6]} rotation={[0, -0.5, 0]} visible={false}>
      {ARCOIRIS.map((banda, i) => (
        <mesh key={i}>
          <torusGeometry args={[banda.r, 0.055, 6, 40, Math.PI]} />
          <meshBasicMaterial color={banda.color} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/* ── COSECHA DE LLUVIA: casita con canaleta, chorrito al tanque y tanque que
      SE LLENA mientras llueve (y se usa despacio en los días secos). ── */
function CasitaCosecha({ climaRef }) {
  const chorro = useRef(null);
  const chorroMat = useRef(null);
  const nivelAgua = useRef(null);
  useFrame(() => {
    const c = climaRef.current;
    if (chorro.current) {
      chorro.current.scale.y = Math.max(c.lluvia, 0.001);
      chorro.current.position.y = CASA_Y + 0.86 - 0.14 * c.lluvia;
    }
    if (chorroMat.current) chorroMat.current.opacity = 0.55 * c.lluvia;
    if (nivelAgua.current) {
      nivelAgua.current.scale.y = c.tanque;
      nivelAgua.current.position.y = CASA_Y + 0.05 + 0.25 * c.tanque;
    }
  });
  return (
    <group>
      {/* cuerpo encalado + techo a cuatro aguas */}
      <mesh position={[CASA.x, CASA_Y + 0.36, CASA.z]}>
        <boxGeometry args={[1.35, 0.72, 1.05]} />
        <meshLambertMaterial color={PALETA.cal} />
      </mesh>
      <mesh position={[CASA.x, CASA_Y + 1.0, CASA.z]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.12, 0.58, 4]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
      {/* canaleta hacia el tanque */}
      <mesh position={[CASA.x - 0.2, CASA_Y + 0.76, CASA.z + 0.56]}>
        <boxGeometry args={[1.6, 0.07, 0.1]} />
        <meshLambertMaterial color={PALETA.lamina} />
      </mesh>
      {/* el chorrito que baja al tanque (anclado arriba, crece con la lluvia) */}
      <mesh ref={chorro} position={[TANQUE.x, CASA_Y + 0.86, TANQUE.z]}>
        <boxGeometry args={[0.05, 0.28, 0.05]} />
        <meshBasicMaterial ref={chorroMat} color="#cfe4ea" transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* tanque abierto + su nivel de agua */}
      <mesh position={[TANQUE.x, CASA_Y + 0.3, TANQUE.z]}>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 10, 1, true]} />
        <meshLambertMaterial color={PALETA.lamina} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={nivelAgua} position={[TANQUE.x, CASA_Y + 0.05, TANQUE.z]}>
        <cylinderGeometry args={[0.25, 0.25, 0.5, 10]} />
        <meshLambertMaterial color={PALETA.agua} transparent opacity={0.85} emissive="#2a6a86" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

/* ── ZANJAS de infiltración en la ladera: la trinchera, su berma abajo y el
      agua retenida que aparece con el aguacero y se siembra despacio. ── */
function Zanjas({ climaRef }) {
  const grupo = useRef(null);
  useFrame(() => {
    const g = grupo.current;
    if (!g) return;
    const c = climaRef.current;
    for (const zanja of g.children) {
      const agua = zanja.children[2];
      agua.material.opacity = 0.12 + 0.6 * c.charcos;
      agua.scale.x = 0.4 + 0.6 * c.charcos;
    }
  });
  return (
    <group ref={grupo}>
      {ZANJAS.map((z, i) => {
        const y = altura(z.x, z.z);
        return (
          <group key={i} position={[z.x, y, z.z]} rotation={[0, z.giro, 0]}>
            <mesh position={[0, 0.0, 0]}>
              <boxGeometry args={[2.2, 0.16, 0.36]} />
              <meshLambertMaterial color={PALETA.tierra} />
            </mesh>
            <mesh position={[0, 0.1, 0.32]}>
              <boxGeometry args={[2.2, 0.2, 0.26]} />
              <meshLambertMaterial color={PALETA.tierraClara} />
            </mesh>
            <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[2.0, 0.24]} />
              <meshBasicMaterial color="#a9bcc6" transparent opacity={0.12} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ── ÁRBOLES low-poly que el viento de la tormenta mece. ── */
function Arboleda({ climaRef, reducedMotion }) {
  const grupo = useRef(null);
  useFrame((st) => {
    const g = grupo.current;
    if (!g || reducedMotion) return;
    const c = climaRef.current;
    const t = st.clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      g.children[i].rotation.z = Math.sin(t * 1.9 + ARBOLES[i].fase) * 0.05 * (0.15 + c.viento);
    }
  });
  return (
    <group ref={grupo}>
      {ARBOLES.map((a, i) => (
        <group key={i} position={[a.x, a.y, a.z]} scale={a.esc}>
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.07, 0.1, 0.56, 6]} />
            <meshLambertMaterial color={PALETA.madera} />
          </mesh>
          <mesh position={[0, 0.85, 0]}>
            <coneGeometry args={[0.46, 0.95, 7]} />
            <meshLambertMaterial color={a.oscuro ? PALETA.follajeOscuro : PALETA.follaje} flatShading />
          </mesh>
          <mesh position={[0, 1.35, 0]}>
            <coneGeometry args={[0.3, 0.6, 7]} />
            <meshLambertMaterial color={a.oscuro ? PALETA.follaje : PALETA.follajeClaro} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Rótulo sobrio (mismo lenguaje que la Sierra y el camino del agua). */
function Rotulo({ pos, texto, sub, distancia = 14 }) {
  return (
    <group position={pos}>
      <Html center distanceFactor={distancia} zIndexRange={[30, 10]} style={{ pointerEvents: 'none' }}>
        <div className="vlluvia-rotulo" aria-hidden="true">
          <span className="vlluvia-rotulo__punto" />
          <span className="vlluvia-rotulo__txt">
            {texto}
            {sub ? <em className="vlluvia-rotulo__sub">{sub}</em> : null}
          </span>
        </div>
      </Html>
    </group>
  );
}

/* ── El diorama completo (dentro del Canvas) ──────────────────────────────── */
function DioramaLluvia({ perfil, tier, reducedMotion, fase, pin, climaRef, alCambiar }) {
  const geoTerreno = useMemo(() => construirTerreno(), []);
  const geoRio = useMemo(() => construirRio(), []);
  useEffect(
    () => () => {
      geoTerreno.dispose();
      geoRio.dispose();
    },
    [geoTerreno, geoRio],
  );

  const nGotas = tier === 'alto' ? 240 : tier === 'medio' ? 150 : 80;
  const aireDorado = fase === 'escampa' || fase === 'despejado';

  return (
    <>
      <ClimaDirector
        climaRef={climaRef}
        fase={fase}
        pin={pin}
        reducedMotion={reducedMotion}
        alCambiar={alCambiar}
      />
      <AtmosferaViva climaRef={climaRef} perfil={perfil} />
      <SolVelado climaRef={climaRef} />

      <mesh geometry={geoTerreno}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      <RioCreciente climaRef={climaRef} geometria={geoRio} reducedMotion={reducedMotion} />
      <Charcos climaRef={climaRef} reducedMotion={reducedMotion} />
      <Nubario climaRef={climaRef} reducedMotion={reducedMotion} />
      {!reducedMotion ? <CortinaLluvia climaRef={climaRef} n={nGotas} /> : null}
      <Arcoiris climaRef={climaRef} />
      <CasitaCosecha climaRef={climaRef} />
      <Zanjas climaRef={climaRef} />
      <Arboleda climaRef={climaRef} reducedMotion={reducedMotion} />

      {/* al escampar, el aire dorado vuelve: el polen del framework */}
      {aireDorado ? (
        <ParticulasAmbientales
          tipo="polen"
          densidad={0.6}
          tier={tier}
          reducedMotion={reducedMotion}
          position={[0, 0.3, 2]}
          semilla={21}
        />
      ) : null}

      {/* rótulos didácticos, sobrios */}
      <Rotulo pos={[TANQUE.x - 0.4, CASA_Y + 1.9, TANQUE.z]} texto="Cosecha de lluvia" sub="el techo llena el tanque" />
      <Rotulo pos={[ZANJAS[0].x, altura(ZANJAS[0].x, ZANJAS[0].z) + 1.1, ZANJAS[0].z]} texto="Zanja de infiltración" sub="frena el agua y la siembra" distancia={13} />
      <Rotulo pos={[rioX(1.4), altura(rioX(1.4), 1.4) + 1.2, 1.4]} texto="El río crece" sub="respete su ronda" distancia={13} />
      <Rotulo pos={[CHARCOS[0].x, CHARCOS[0].y + 0.9, CHARCOS[0].z]} texto="El charco infiltra" sub="suelo cubierto, agua sembrada" distancia={12} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        minDistance={3.5}
        maxDistance={20}
        target={[0.4, 0.8, 0.6]}
        minPolarAngle={0.3}
        maxPolarAngle={1.38}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.1}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/* Estilos del mockup (viven aquí: son de ESTA escena). */
const CSS_LLUVIA = `
.vlluvia-root { position: relative; width: 100%; height: 100vh; min-height: 340px; overflow: hidden; background: ${CIELO_SOL.fondo}; }
.vlluvia-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.7s ease; }
.vlluvia-canvas--lista { opacity: 1; }
.vlluvia-rotulo { display: flex; align-items: center; gap: 0.32rem; white-space: nowrap; font: 600 0.72rem/1.1 system-ui, sans-serif; color: #2c333a; text-shadow: 0 1px 3px rgba(243,246,248,0.9); }
.vlluvia-rotulo__punto { width: 7px; height: 7px; border-radius: 50%; background: #dfe9ef; box-shadow: 0 0 0 2px rgba(44,51,58,0.5); flex: 0 0 auto; }
.vlluvia-rotulo__txt { display: inline-flex; align-items: baseline; gap: 0.3rem; }
.vlluvia-rotulo__sub { font-weight: 500; font-style: normal; opacity: 0.7; font-size: 0.9em; }
.vlluvia-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.vlluvia-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #2c333a; text-shadow: 0 1px 4px rgba(243,246,248,0.85); font: 700 1.15rem/1.2 system-ui, sans-serif; }
.vlluvia-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.78; margin-top: 0.15rem; }
.vlluvia-fases { pointer-events: auto; align-self: flex-start; margin: 0.6rem 0.8rem; padding: 0.45rem; display: flex; flex-direction: column; gap: 0.28rem; list-style: none; border-radius: 0.8rem; background: rgba(244,247,249,0.78); backdrop-filter: blur(3px); box-shadow: 0 4px 14px rgba(44,56,66,0.16); max-width: min(74vw, 17rem); }
.vlluvia-fases button { display: block; width: 100%; text-align: left; padding: 0.3rem 0.55rem; border: 0; border-radius: 0.55rem; background: transparent; color: #2c333a; font: 600 0.76rem/1.2 system-ui, sans-serif; cursor: pointer; }
.vlluvia-fases button:hover { background: rgba(63,116,146,0.14); }
.vlluvia-fases button[aria-pressed="true"] { background: rgba(63,116,146,0.24); }
.vlluvia-pie { pointer-events: none; padding: 0 1rem 0.85rem; display: flex; justify-content: center; }
.vlluvia-pie p { margin: 0; max-width: 42rem; text-align: center; padding: 0.42rem 0.85rem; border-radius: 0.7rem; background: rgba(24,29,34,0.52); backdrop-filter: blur(3px); color: #eef2f4; font: 500 0.76rem/1.4 system-ui, sans-serif; }
.vlluvia-volver { pointer-events: auto; position: absolute; top: 0.8rem; right: 0.8rem; padding: 0.4rem 0.8rem; border: 0; border-radius: 999px; background: rgba(24,29,34,0.55); color: #eef2f4; font: 600 0.78rem/1 system-ui, sans-serif; cursor: pointer; }
@media (prefers-reduced-motion: reduce) { .vlluvia-canvas { transition: none; } }
/* En teléfono la lista vertical de fases tapaba justo el centro del diorama
   (la zanja y el río, o sea la lección). Se vuelve una FILA de chips pegada
   al título: mismo contenido, una franja de alto, y el valle queda libre. */
@media (max-width: 640px) {
  .vlluvia-titulo { font-size: 1rem; }
  /* El space-between empujaba la fila de fases al CENTRO vertical del cuadro,
     o sea encima del valle: arriba lo de arriba, y el pie se ancla solo. */
  .vlluvia-chrome { justify-content: flex-start; }
  .vlluvia-pie { margin-top: auto; }
  .vlluvia-fases { flex-direction: row; flex-wrap: wrap; gap: 0.25rem; max-width: calc(100vw - 1.6rem); margin: 0.5rem 0.8rem; padding: 0.3rem 0.35rem; }
  .vlluvia-fases button { width: auto; padding: 0.28rem 0.55rem; font-size: 0.72rem; }
}
`;

/**
 * ValleLluvia3D — el mockup montable: Canvas propio + ciclo de tormenta.
 *
 * El ciclo avanza solo (nubes → llovizna → aguacero → escampa → cielo
 * abierto); tocar una fase la fija para mirarla con calma y tocarla de nuevo
 * suelta el ciclo. Con reduced-motion el ciclo no corre: cada fase es una
 * estampa quieta que se visita con los botones.
 *
 * @param {object} props
 * @param {() => void} [props.onBack]  vuelve al host (botón discreto).
 */
export default function ValleLluvia3D({ onBack }) {
  const [listo, setListo] = useState(false);
  const [{ tier, reducedMotion }] = useState(() => decidirTier());
  const perfil = perfilDeTier(tier);
  const [fase, setFase] = useState('nubes');
  const [pin, setPin] = useState(false);
  const climaRef = useRef({ ...CLIMA_INICIAL });
  const alCambiar = useCallback((id) => setFase(id), []);
  /* Retrato (teléfono en vertical, 390×844): con la cámara de escritorio la
     ladera se comía el cuadro entero — ni casa, ni tanque, ni río a la vez.
     El diorama entero es el sujeto: en retrato la cámara sube, se aleja y
     abre el fov para que el valle completo quepa en la franja del medio. */
  const retrato = useMemo(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-aspect-ratio: 19/20)').matches,
    [],
  );

  return (
    <section
      className="vlluvia-root"
      data-tier={tier}
      data-fase={fase}
      aria-label="El valle bajo la lluvia: las nubes se acumulan, cae el aguacero, el río crece y vuelve la calma con un arcoíris"
    >
      <style>{CSS_LLUVIA}</style>
      <Canvas
        className={`vlluvia-canvas${listo ? ' vlluvia-canvas--lista' : ''}`}
        dpr={tier === 'alto' ? [1, 1.5] : tier === 'medio' ? [1, 1.3] : 1}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={retrato ? { position: [11.4, 11.1, 12.9], fov: 52 } : { position: [11.5, 7.6, 12.8], fov: 44 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <DioramaLluvia
          perfil={perfil}
          tier={tier}
          reducedMotion={reducedMotion}
          fase={fase}
          pin={pin}
          climaRef={climaRef}
          alCambiar={alCambiar}
        />
      </Canvas>

      <div className="vlluvia-chrome">
        <h2 className="vlluvia-titulo">
          El valle bajo la lluvia
          <small>Sembrar el agua, sin dejar que arrastre el suelo</small>
        </h2>
        <ul className="vlluvia-fases" aria-label="Fases de la tormenta">
          {ORDEN.map((id) => (
            <li key={id}>
              <button
                type="button"
                aria-pressed={fase === id}
                onClick={() => {
                  if (fase === id && pin) {
                    setPin(false);
                  } else {
                    setFase(id);
                    setPin(true);
                  }
                }}
              >
                {FASES[id].titulo}
              </button>
            </li>
          ))}
        </ul>
        <div className="vlluvia-pie">
          <p>
            {FASES[fase].frase}
            {pin ? ' Toque la fase de nuevo para que el ciclo siga solo.' : ''}
          </p>
        </div>
      </div>
      {onBack ? (
        <button type="button" className="vlluvia-volver" onClick={onBack}>
          Volver
        </button>
      ) : null}
    </section>
  );
}
