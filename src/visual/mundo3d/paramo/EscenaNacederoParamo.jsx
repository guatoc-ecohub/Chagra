/*
 * EscenaNacederoParamo — el páramo como fábrica de agua, montado.
 *
 * Arma el sitio que dibuja `nacederoParamo.geom.js` y le pone encima:
 *   · el suelo detallado de la casa (`<SueloRico>`) manejado por MI campo de
 *     alturas — piedras, macollas de paja, raicillas, florecitas y sombras de
 *     contacto salen gratis y hablan el mismo idioma que los demás mundos;
 *   · la cortina de turba con el perfil del suelo (la lámina);
 *   · el agua: hilos del manantial, poza, quebrada y la caída al valle;
 *   · el frailejonal en SIETE edades + sotobosque + la ceja de monte al fondo;
 *   · la niebla: bancos que entran por el filo y se derraman al anfiteatro.
 *
 * Presupuesto: un InstancedMesh por banco (una draw-call por especie y por
 * edad), tres materiales en total, y ni un cálculo por cuadro fuera de la
 * deriva de la niebla. Todo procedural: cero imágenes, corre headless.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import SueloRico from '../terreno/SueloRico.jsx';
import {
  geomFrailejon, geomMortino, geomRomerillo, geomRoca, geomMusgo,
  geomEncenillo, geomAliso, geomGaque, calidadDeTier,
} from '../bosque/floraParamo.geom.js';
import {
  crearNacedero, filoDelNacedero, geomParedTurba, geomRaicesCornisa, geomBloquesTurba,
  geomHilosAgua, geomPoza, geomQuebrada, geomCordilleras, geomRocio,
  siembraNacedero, EDADES_FRAILEJON, PROSCENIO_NACEDERO,
} from './nacederoParamo.geom.js';

/* Un banco: una geometría, un material, N instancias (con cabeceo por mata). */
function Banco({ geo, mat, items, castShadow = false }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !items.length) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      p.set(it.pos[0], it.pos[1], it.pos[2]);
      e.set(it.tiltX || 0, it.rotY || 0, it.tiltZ || 0);
      q.setFromEuler(e);
      s.setScalar(it.escala);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      c.setRGB(it.tint[0], it.tint[1], it.tint[2]);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);
  if (!geo || !items.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} frustumCulled={false} castShadow={castShadow} />;
}

/* Textura de vaho: un algodón radial, generado en runtime (sin assets). */
function texturaVaho() {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(246,250,246,0.95)');
  g.addColorStop(0.42, 'rgba(226,236,231,0.5)');
  g.addColorStop(1, 'rgba(220,232,228,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/*
 * LA NIEBLA, que en este mundo no es decorado sino MATERIA PRIMA. Tres oficios:
 *   · la que llega por el filo y se enreda en el frailejonal (de ahí sale el
 *     agua que el frailejón le entrega al suelo);
 *   · la que se derrama al anfiteatro y se queda quieta en el fondo;
 *   · la que llena el abismo de adelante y esconde el valle — la que hace que
 *     el filo del mundo se sienta filo.
 */
const BANCOS_NIEBLA = [
  /* LA QUE SE DERRAMA POR EL FILO: se queda ARRIBA, en la boca del anfiteatro.
     Ni un vaho por delante de la pared: la lámina es lo que este mundo existe
     para enseñar y un velo encima la convierte en un manchón pardo. */
  { p: [-6.5, 8.4, -9.8], esc: [13, 3.0, 1], op: 0.34, fase: 0.0, amp: 2.4 },
  { p: [6.5, 8.9, -10.6], esc: [14, 3.2, 1], op: 0.32, fase: 1.7, amp: 2.1 },
  /* la bruma de fondo que despega el respaldo del frailejonal (profundidad) */
  { p: [0, 8.5, -22], esc: [86, 7, 1], op: 0.42, fase: 2.6, amp: 2.2 },
  /* la que cruza el frailejonal de la planicie */
  { p: [15, 7.4, 4], esc: [17, 3.2, 1], op: 0.26, fase: 4.4, amp: 2.6 },
  /* el abismo de adelante: es lo que hace que el filo del mundo se sienta filo */
  { p: [0, 0.5, 34], esc: [80, 22, 1], op: 0.6, fase: 2.2, amp: 3.4 },
  { p: [-22, 0.5, 27], esc: [30, 10, 1], op: 0.3, fase: 5.2, amp: 2.8 },
  { p: [23, 1.5, 29], esc: [32, 11, 1], op: 0.3, fase: 0.9, amp: 3.0 },
  /* el velo que separa el respaldo de las cordilleras */
  { p: [0, 11, -30], esc: [70, 12, 1], op: 0.34, fase: 3.8, amp: 2.0 },
];

function Niebla({ reducedMotion, cuantos = 9 }) {
  const { camera } = useThree();
  const grupo = useRef(null);
  const tex = useMemo(() => texturaVaho(), []);
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const mats = useMemo(
    () => BANCOS_NIEBLA.slice(0, cuantos).map((b) => new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: b.op, depthWrite: false, fog: false,
    })),
    [tex, cuantos],
  );
  useLayoutEffect(() => () => {
    tex.dispose();
    geo.dispose();
    mats.forEach((m) => m.dispose());
  }, [tex, geo, mats]);

  useFrame((estado) => {
    const g = grupo.current;
    if (!g || reducedMotion) return;
    const t = estado.clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const carta = g.children[i];
      const b = BANCOS_NIEBLA[i];
      carta.position.x = b.p[0] + Math.sin(t * 0.035 + b.fase) * b.amp;
      carta.position.y = b.p[1] + Math.sin(t * 0.055 + b.fase) * 0.35;
      carta.material.opacity = b.op * (0.72 + Math.sin(t * 0.08 + b.fase) * 0.28);
      // encaran a la cámara: el vaho se lee desde cualquier ángulo
      carta.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group ref={grupo}>
      {BANCOS_NIEBLA.slice(0, cuantos).map((b, i) => (
        <mesh key={i} geometry={geo} material={mats[i]} position={b.p} scale={[b.esc[0], b.esc[1], 1]} />
      ))}
    </group>
  );
}

/**
 * El mundo entero. Montar dentro de un <Canvas> que ya traiga `<LuzMadre>`.
 * @param {{tier?: 'alto'|'medio'|'bajo', perfil: object, reducedMotion?: boolean}} props
 */
export default function EscenaNacederoParamo({ tier = 'alto', perfil, reducedMotion = false }) {
  const q = calidadDeTier(tier);

  /* El sitio: el campo de alturas y el filo (de ahí cuelga TODO lo demás). */
  const nac = useMemo(() => crearNacedero(), []);
  const filo = useMemo(() => filoDelNacedero(nac, { paso: tier === 'bajo' ? 0.06 : 0.036 }), [nac, tier]);

  /* La lámina y el agua. */
  const geos = useMemo(() => ({
    pared: geomParedTurba(nac, filo, { q }),
    raices: geomRaicesCornisa(nac, filo, { q, cada: tier === 'alto' ? 4 : 7 }),
    bloques: geomBloquesTurba(nac, filo, { q, cada: tier === 'alto' ? 17 : 26 }),
    hilos: geomHilosAgua(nac, filo, { q, cuantos: tier === 'alto' ? 20 : 10 }),
    poza: geomPoza(nac),
    quebrada: geomQuebrada(nac, { q }),
    cordilleras: geomCordilleras({ q }),
  }), [nac, filo, q, tier]);

  /* El frailejonal por edades + el cortejo. */
  const flora = useMemo(() => {
    const edades = tier === 'bajo' ? EDADES_FRAILEJON.filter((_, i) => i % 2 === 0) : EDADES_FRAILEJON;
    const g = {};
    for (const e of edades) {
      g[e.id] = geomFrailejon({ flor: e.flor, q, edad: e.edad }, 100 + Math.round(e.edad * 97));
    }
    g.mortino = geomMortino({ q }, 8);
    g.romerillo = geomRomerillo({ q }, 9);
    g.roca = geomRoca(10);
    g.musgo = geomMusgo(11);
    g.encenillo = geomEncenillo({ q }, 5);
    g.aliso = geomAliso({ q }, 6);
    g.gaque = geomGaque({ q }, 7);
    g.rocio = geomRocio(0.44, 60, tier === 'alto' ? 16 : 9);
    return g;
  }, [q, tier]);

  const siembra = useMemo(() => siembraNacedero(nac, tier, filo), [nac, tier, filo]);

  /* El proscenio: el marco fijo del cuadro (centenarios de primer plano). */
  const proscenio = useMemo(
    () => PROSCENIO_NACEDERO.map((p) => ({
      pos: [p.x, nac.alturaDe(p.x, p.z) - 0.04, p.z],
      rotY: p.rotY,
      escala: p.escala,
      tint: [1, 1, 1],
      tiltX: p.tiltX,
      tiltZ: p.tiltZ,
    })),
    [nac],
  );

  /* El rocío se posa sobre la roseta de los centenarios del frente: la altura
     de la roseta sale de la geometría del frailejón (columna + cabeza). */
  const rocio = useMemo(
    () => PROSCENIO_NACEDERO.filter((p) => p.rocio).map((p) => ({
      pos: [p.x, nac.alturaDe(p.x, p.z) + p.escala * 1.86, p.z],
      rotY: p.rotY,
      escala: p.escala,
      tint: [1, 1, 1],
    })),
    [nac],
  );

  /* Los materiales: tierra/planta con color horneado, agua sin luz (para que
     el hilo brille aunque esté en la sombra de la pared) y el telón del fondo
     también sin luz, con su perspectiva aérea ya pintada. */
  const matTierra = useMemo(() => (perfil.materialRico
    ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: perfil.flatShading })
    : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: perfil.flatShading })), [perfil]);

  const matPared = useMemo(() => (perfil.materialRico
    ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide })
    : new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })), [perfil]);

  const matAgua = useMemo(() => new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.92, depthWrite: false,
  }), []);

  /* DoubleSide a propósito: el abanico de la poza y la cinta de la quebrada se
     arman por rayos y su devanado puede quedar de espaldas a la cámara. Con
     FrontSide el agua sencillamente NO SE DIBUJA, sin un error en consola —
     exactamente el fallo mudo que ya costó una pasada entera. */
  const matEspejo = useMemo(() => (perfil.materialRico
    ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.24, metalness: 0.1, side: THREE.DoubleSide })
    : new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })), [perfil]);

  const matFondo = useMemo(() => new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide, fog: false,
  }), []);

  useLayoutEffect(() => () => {
    Object.values(geos).forEach((g) => g && g.dispose());
    Object.values(flora).forEach((g) => g && g.dispose());
    matTierra.dispose();
    matPared.dispose();
    matAgua.dispose();
    matEspejo.dispose();
    matFondo.dispose();
  }, [geos, flora, matTierra, matPared, matAgua, matEspejo, matFondo]);

  /* Anclas para las sombras de contacto del suelo: el proscenio y los
     guardianes del filo (sin ellas, las matas grandes flotan). */
  const anclas = useMemo(() => [
    ...proscenio.map((p) => ({ x: p.pos[0], z: p.pos[2], radio: 0.7 * p.escala })),
    ...(siembra.frailejones.centenario || []).map((p) => ({ x: p.pos[0], z: p.pos[2], radio: 0.55 * p.escala })),
  ], [proscenio, siembra]);

  const segmentos = tier === 'alto' ? 156 : tier === 'medio' ? 104 : 72;

  return (
    <group>
      {/* el telón: las cordilleras apiladas, con su bruma ya horneada */}
      <mesh geometry={geos.cordilleras} material={matFondo} renderOrder={-1} />

      {/* el suelo de la casa, manejado por el campo de alturas del nacedero */}
      <SueloRico
        suelo={nac}
        tier={tier}
        segmentos={segmentos}
        rMaxDetalle={30}
        anclas={anclas}
        detalle={tier === 'alto'
          ? { piedras: 44, matas: 330, raices: 14, flores: 74 }
          : tier === 'medio' ? { piedras: 22, matas: 130, raices: 6, flores: 28 } : undefined}
      />

      {/* LA LÁMINA: la pared cortada con el perfil del suelo, y las raíces del
          colchón vivo colgando de la cornisa */}
      <mesh geometry={geos.pared} material={matPared} receiveShadow={!!perfil.sombras} />
      {geos.raices && <mesh geometry={geos.raices} material={matTierra} />}
      {/* los bloques que se desplomaron con su tapa de musgo puesta */}
      {geos.bloques && <mesh geometry={geos.bloques} material={matTierra} castShadow={!!perfil.sombras} />}

      {/* EL AGUA: rezuma en la línea de contacto, se junta y se va */}
      <mesh geometry={geos.poza} material={matEspejo} renderOrder={1} />
      <mesh geometry={geos.quebrada} material={matEspejo} renderOrder={1} />
      {geos.hilos && <mesh geometry={geos.hilos} material={matAgua} renderOrder={2} />}

      {/* el suelo vivo del páramo */}
      <Banco geo={flora.roca} mat={matTierra} items={siembra.roca} />
      <Banco geo={flora.musgo} mat={matTierra} items={siembra.musgo} />
      <Banco geo={flora.romerillo} mat={matTierra} items={siembra.romerillo} />
      <Banco geo={flora.mortino} mat={matTierra} items={siembra.mortino} />

      {/* EL FRAILEJONAL, edad por edad: de la roseta recién nacida al
          centenario de dos metros. Un banco por edad = una draw-call por edad. */}
      {EDADES_FRAILEJON.map((e) => (
        <Banco
          key={e.id}
          geo={flora[e.id]}
          mat={matTierra}
          items={siembra.frailejones[e.id] || []}
          castShadow={!!perfil.sombras}
        />
      ))}
      <Banco geo={flora.centenario} mat={matTierra} items={proscenio} castShadow={!!perfil.sombras} />

      {/* la niebla vuelta gota sobre la roseta del frente */}
      {tier !== 'bajo' && <Banco geo={flora.rocio} mat={matAgua} items={rocio} />}

      {/* la ceja de monte: los árboles se quedan abajo, de siluetas */}
      <Banco geo={flora.encenillo} mat={matTierra} items={siembra.arboles.encenillo} />
      <Banco geo={flora.aliso} mat={matTierra} items={siembra.arboles.aliso} />
      <Banco geo={flora.gaque} mat={matTierra} items={siembra.arboles.gaque} />

      {/* la materia prima */}
      <Niebla reducedMotion={reducedMotion} cuantos={tier === 'bajo' ? 4 : 9} />
    </group>
  );
}
