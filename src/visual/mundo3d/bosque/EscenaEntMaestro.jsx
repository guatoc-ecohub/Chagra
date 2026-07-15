/*
 * EscenaEntMaestro — EL ENT MAESTRO QUE ENSEÑA QUE EL SUELO ESTÁ VIVO.
 *
 * La lección más importante de Chagra. El Ent de la queñua abre la tierra con su
 * brazo y la deja CORTADA como una vitrina, para ir enseñando capa por capa:
 * hojarasca → humus → zona de raíces → red micorrízica → roca madre.
 *
 * ── LO QUE ESTA ESCENA TIENE QUE LOGRAR ──────────────────────────────────────
 * Que el campesino entienda DE UN VISTAZO dos cosas, sin leer nada:
 *   1. que el suelo está VIVO — que ahí abajo hay un gentío trabajando; y
 *   2. que el suelo es un MERCADO — que la mata le PAGA al hongo con azúcar y el
 *      hongo le DEVUELVE fósforo y agua que ella sola jamás alcanzaría.
 * Por eso el corte enseña los DOS suelos pegados: a la derecha el vivo y, al
 * otro lado de la línea del arado, el MISMO potrero quemado y arado, con la roca
 * ya ahí arribita. Y por eso las hifas se ven cruzando de vuelta hacia el lado
 * cansado: el suelo tiene memoria y la red vuelve. La lección no termina en el
 * regaño; termina en que sí se puede.
 *
 * ── CÓMO ESTÁ ARMADA ─────────────────────────────────────────────────────────
 * Las capas son BLOQUES (con su rótulo), pero la VIDA se dibuja toda en un mismo
 * espacio de coordenadas del corte, y no encerrada por capa: así las raíces
 * cruzan de verdad de una banda a otra, el micelio sube hasta ellas y baja hasta
 * la grieta de la roca. Las capas son un modo de NOMBRAR el suelo, no tabiques —
 * si el arte las encerrara, enseñaría una mentira.
 * La geometría pura vive en `micorrizas.geom.js` (headless, determinista); aquí
 * solo se le pone luz, material y vida.
 *
 * Todo procedural (cero CDN/imágenes) y fundido en pocas mallas. Tier-safe:
 * 'alto' pleno, 'medio' frugal, 'bajo' mínimo digno —pero en los tres se ven las
 * tres hermanas conectadas a la red, porque eso ES la lección—. Con
 * `reducedMotion` monta QUIETO. Importa three/@react-three → montar SOLO
 * perezosa (lazy) desde el host.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Html } from '@react-three/drei';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import EntQuenua from './EntQuenua.jsx';
import {
  PALETA,
  PALETA_SUELO,
  CORTE,
  CORTE_X,
  PERFIL_VIVO,
  PERFIL_CANSADO,
  HONDO_CORTE,
  BOLSA_AGUA,
  apilarPerfil,
  pintarGeo,
  curvaHilo,
  hojaGeom,
  hojarascaCorte,
  hojasCayendo,
  bichoGeom,
  raicesCorte,
  redCorte,
  recolonizacion,
  sueloCansadoVida,
  agregadosHumus,
  lombrizCorte,
  rocaCorte,
  arbusculoGeom,
  celulasGeom,
  vidaInvisible,
} from '../micorrizas/micorrizas.geom.js';

/* CSS del lienzo, de los rótulos de cada capa y de la leyenda del mercado. */
const CSS = `
.entm-canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.8s ease; }
.entm-canvas--lista { opacity: 1; }
.entm-rot { transform: translate(-6%, -50%); pointer-events: none; }
.entm-rot__caja { min-width: 8.5rem; max-width: 12.5rem; padding: 0.34rem 0.6rem; border-radius: 0.7rem; background: rgba(14, 12, 9, 0.62); box-shadow: inset 0 0 0 1px rgba(180, 200, 150, 0.28); color: #e9efdd; transition: background 0.4s ease, box-shadow 0.4s ease, transform 0.4s ease; }
.entm-rot__caja--activa { background: rgba(26, 40, 26, 0.9); box-shadow: inset 0 0 0 1px rgba(126, 240, 200, 0.8), 0 0 16px 2px rgba(55, 214, 176, 0.35); transform: scale(1.06); }
.entm-rot__n { display: block; font: 700 0.82rem/1.15 system-ui, sans-serif; }
.entm-rot__h { display: block; margin-top: 0.12rem; font: 500 0.66rem/1.2 system-ui, sans-serif; color: #c3ccb4; }
.entm-rot__caja--activa .entm-rot__h { color: #d9ffef; }

/* el rótulo del suelo cansado: cuelga sobre su franja, con el pico apuntándola */
.entm-cans { transform: translate(-50%, -100%); pointer-events: none; text-align: center; }
.entm-cans__caja { display: inline-block; padding: 0.3rem 0.55rem; border-radius: 0.6rem; background: rgba(58, 34, 20, 0.88); box-shadow: inset 0 0 0 1px rgba(214, 150, 96, 0.5); color: #f3ddc4; }
.entm-cans__n { display: block; font: 700 0.74rem/1.15 system-ui, sans-serif; }
.entm-cans__h { display: block; margin-top: 0.1rem; font: 500 0.62rem/1.2 system-ui, sans-serif; color: #d8b48c; }
.entm-cans__pico { display: block; margin: 0 auto; width: 0; height: 0; border: 0.32rem solid transparent; border-top-color: rgba(58, 34, 20, 0.88); }

/* la leyenda: las tres monedas del mercado del suelo */
.entm-ley { transform: translate(-50%, 0); pointer-events: none; }
.entm-ley__caja { display: flex; gap: 0.7rem; align-items: center; padding: 0.36rem 0.7rem; border-radius: 0.8rem; background: rgba(12, 16, 13, 0.78); box-shadow: inset 0 0 0 1px rgba(126, 240, 200, 0.25); white-space: nowrap; transition: box-shadow 0.4s ease, background 0.4s ease; }
.entm-ley__caja--activa { background: rgba(18, 34, 28, 0.92); box-shadow: inset 0 0 0 1px rgba(126, 240, 200, 0.75), 0 0 18px 2px rgba(55, 214, 176, 0.3); }
.entm-ley__t { font: 700 0.66rem/1.1 system-ui, sans-serif; color: #9fb08e; letter-spacing: 0.04em; text-transform: uppercase; }
.entm-ley__i { display: flex; gap: 0.28rem; align-items: center; font: 600 0.68rem/1.1 system-ui, sans-serif; color: #e9efdd; }
.entm-ley__p { width: 0.55rem; height: 0.55rem; border-radius: 50%; flex: none; }

/* el pie de la lupa: decir que esto NO se ve a simple vista */
.entm-lupa { transform: translate(-50%, 0); pointer-events: none; }
.entm-lupa__t { padding: 0.16rem 0.4rem; border-radius: 0.45rem; background: rgba(12, 16, 13, 0.8); box-shadow: inset 0 0 0 1px rgba(180, 200, 150, 0.3); font: 600 0.58rem/1.15 system-ui, sans-serif; color: #cfe6d8; white-space: nowrap; }

/* el pie de la ventana del trueque */
.entm-ven { transform: translate(-50%, 0); pointer-events: none; }
.entm-ven__t { padding: 0.16rem 0.42rem; border-radius: 0.45rem; background: rgba(20, 14, 6, 0.85); box-shadow: inset 0 0 0 1px rgba(255, 210, 122, 0.4); font: 600 0.6rem/1.15 system-ui, sans-serif; color: #ffe6b0; white-space: nowrap; }

@media (prefers-reduced-motion: reduce) { .entm-canvas { transition: none; } }
`;

/* Cielo del páramo (mismo aire que el Bosque Vivo, para que el Ent se lea igual). */
const PARAMO = { fondo: '#c3cfce', niebla: '#c9d3d1', musgo: '#5c6844' };

/* Dónde se planta la vitrina: donde de verdad cae la mano del Ent (su muñeca
   queda sobre z≈1.9, y por eso el corte va ahí y no donde nos guste). */
const CORTE_POS = [2.5, 0, 1.9];
const CARA = CORTE.cara;
const X_VIVO = (CORTE_X.sutura + CORTE_X.der) / 2;
const W_VIVO = CORTE_X.der - CORTE_X.sutura;
const X_CANS = (CORTE_X.izq + CORTE_X.sutura) / 2;
const W_CANS = CORTE.cansado;

const DUR_CAPA = 4.2; // segundos que el Ent "enseña" cada capa

/* PRNG determinista local (misma escena siempre). */
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ── Piezas de la red (se reusan tal cual del mundo de micorrizas) ─────────── */

/* La malla de la red (un draw-call, aditiva, respira). */
function RedMicelio({ geo, reducedMotion, opacidad = 0.92 }) {
  const ref = useRef(null);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: opacidad,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
    [opacidad],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  useFrame((st) => {
    // se respira por el material de la malla (no por el del hook): el micelio
    // late despacio, como algo que está vivo pero no tiene afán
    const m = ref.current?.material;
    if (reducedMotion || !m) return;
    m.opacity = opacidad - 0.08 + Math.sin(st.clock.elapsedTime * 0.9) * 0.1;
  });
  if (!geo) return null;
  return <mesh ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

/* Los NODOS del micelio (arbúsculos/nodos/esporas/minas), instanciados. */
function NodosRed({ nodos }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.OctahedronGeometry(0.05, 0), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i < nodos.length; i++) {
      const n = nodos[i];
      const esc = n.tipo === 'raiz' ? 1.5 : n.tipo === 'espora' ? 1.25 : n.tipo === 'mina' ? 1.15 : 0.9;
      p.copy(n.pos);
      s.setScalar(esc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      // la MINA arde ámbar: es la hifa arrancándole el fósforo a la piedra
      const col = n.tipo === 'raiz' ? PALETA.arbusculo
        : n.tipo === 'espora' ? PALETA.espora
          : n.tipo === 'mina' ? PALETA.fosforo : PALETA.nodo;
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [nodos]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!nodos.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, nodos.length]} frustumCulled={false} />;
}

/* Los PULSOS que corren por los hilos: la plata del mercado, moviéndose. */
function Pulsos({ curvas, pulsos, reducedMotion, radio = 0.05 }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(radio, 7, 6), [radio]);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3() }), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < pulsos.length; i++) mesh.setColorAt(i, pulsos[i].color);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [pulsos]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  const escribir = (time) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { m, q, s, p } = tmp;
    for (let i = 0; i < pulsos.length; i++) {
      const pu = pulsos[i];
      const cur = curvas[pu.hilo];
      if (!cur) { s.setScalar(0); m.compose(p.set(0, 0, 0), q, s); mesh.setMatrixAt(i, m); continue; }
      let t = reducedMotion ? (pu.t0 * 0.5 + 0.25) : (pu.t0 + pu.dir * time * pu.vel);
      t -= Math.floor(t);
      cur.getPoint(t, p);
      const brote = Math.sin(t * Math.PI);
      s.setScalar(pu.tam * (0.35 + brote * 0.85));
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => { escribir(0); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulsos, curvas]);
  useFrame((st) => { if (!reducedMotion) escribir(st.clock.elapsedTime); });
  if (!pulsos.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, pulsos.length]} frustumCulled={false} />;
}

/* ── LA HOJARASCA ─────────────────────────────────────────────────────────── */

/* Las hojas que van CAYENDO de la copa del Ent. Es un goteo, no una lluvia: cae
   un poquito todos los días, y POR ESO hay suelo. Quietas no dirían nada
   (quedarían flotando), así que con reducedMotion sencillamente no van. */
function HojasCayendo({ specs, mat }) {
  const geos = useMemo(() => {
    const c = new Map();
    specs.forEach((s) => {
      if (c.has(s.especie)) return;
      // recién caída de la copa: todavía verde, todavía no es comida de nadie
      c.set(s.especie, pintarGeo(hojaGeom(s.especie), PALETA_SUELO.hojaFresca, PALETA_SUELO.hojaFrescaPunta));
    });
    return c;
  }, [specs]);
  useLayoutEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  const refs = useRef([]);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      const o = refs.current[i];
      if (!o) continue;
      const ciclo = (t * s.vel + s.fase) % 1;
      o.position.y = s.alto - ciclo * (s.alto + 0.12);
      // la hoja no cae derecho: se mece, planea, se demora
      o.position.x = s.x + Math.sin(ciclo * 6.4 + s.fase) * 0.15;
      o.rotation.z = ciclo * 6.2 * s.giro;
      o.rotation.x = Math.sin(ciclo * 5.1 + s.fase) * 0.95;
    }
  });
  return specs.map((s, i) => (
    <mesh
      key={`cae-${i}`}
      ref={(el) => { refs.current[i] = el; }}
      geometry={geos.get(s.especie)}
      material={mat}
      position={[s.x, s.alto, s.z]}
      scale={s.esc}
    />
  ));
}

/* Un bicho con oficio, puesto en su sitio (y con su vaivén de estar trabajando). */
function Bicho({ tipo, mat, pos, rot = [0, 0, 0], esc = 1, fase = 0, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => bichoGeom(tipo), [tipo]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  useFrame((st) => {
    const o = ref.current;
    if (reducedMotion || !o) return;
    const t = st.clock.elapsedTime;
    // camina despacito de ida y vuelta: nadie tiene afán aquí abajo
    o.position.x = pos[0] + Math.sin(t * 0.32 + fase) * 0.07;
    o.rotation.z = rot[2] + Math.sin(t * 0.9 + fase) * 0.06;
  });
  return <mesh ref={ref} geometry={geo} material={mat} position={pos} rotation={rot} scale={esc} />;
}

/* ── EL HUMUS ─────────────────────────────────────────────────────────────── */

/*
 * LA LOMBRIZ. Avanza con su onda peristáltica y se lleva por delante la
 * hojarasca; lo que sale por detrás ES el humus. Y el TÚNEL que deja vale más
 * que ella: por ahí entra el aire y baja el agua. La quema las mata de una.
 */
function Lombriz({ curva, seg, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 6, 5), []);
  /* Sin `vertexColors`: el color de cada anillo entra por `setColorAt`, y en el
     vertex shader `USE_COLOR` haría `vColor *= color` contra un atributo que
     esta esfera no tiene → lombriz negra. `instanceColor` sola basta (el
     fragment define USE_COLOR también por instancing). Igual que NodosRed. */
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ flatShading: true }), []);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3() }), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < seg; i++) {
      const t0 = i / (seg - 1);
      // el CLITELO: esa banda pálida del tercio delantero, la que pone la cápsula
      mesh.setColorAt(i, t0 > 0.62 && t0 < 0.79 ? PALETA_SUELO.clitelo : PALETA_SUELO.lombriz);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [seg]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  const escribir = (time) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { m, q, s, p } = tmp;
    for (let i = 0; i < seg; i++) {
      const t0 = i / (seg - 1);
      const onda = reducedMotion ? 0 : Math.sin(time * 1.5 - t0 * 5.2) * 0.022;
      const t = Math.min(0.999, Math.max(0.001, t0 * 0.84 + 0.08 + onda));
      curva.getPointAt(t, p);
      // gorda en el medio, afinada en las dos puntas: así es una lombriz
      const gordo = 0.03 * Math.sin(Math.PI * (0.14 + t0 * 0.8)) + 0.014;
      const bulto = reducedMotion ? 1 : 1 + Math.sin(time * 1.5 - t0 * 5.2) * 0.16;
      s.setScalar(gordo * bulto);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => { escribir(0); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curva, seg]);
  useFrame((st) => { if (!reducedMotion) escribir(st.clock.elapsedTime); });
  return <instancedMesh ref={ref} args={[geo, mat, seg]} frustumCulled={false} />;
}

/* El agua GUARDADA en los poros: lo que se pierde cuando el suelo se vuelve
   polvo, y justo lo que se echa de menos en el veranito. */
function Gotas({ gotas, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 6, 5), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PALETA_SUELO.gota, transparent: true, opacity: 0.72, depthWrite: false }),
    [],
  );
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  const escribir = (time) => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    for (let i = 0; i < gotas.length; i++) {
      const g = gotas[i];
      const brillo = reducedMotion ? 1 : 1 + Math.sin(time * 0.8 + g.fase) * 0.14;
      s.set(g.esc * brillo, g.esc * brillo * 0.86, g.esc * 0.6);
      m.compose(g.pos, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => { escribir(0); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gotas]);
  useFrame((st) => { if (!reducedMotion) escribir(st.clock.elapsedTime); });
  if (!gotas.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, gotas.length]} frustumCulled={false} />;
}

/* ── LAS RAÍCES ───────────────────────────────────────────────────────────── */

/*
 * Los PELOS ABSORBENTES, instanciados. Cortísimos a propósito: al lado de una
 * hifa, un pelo de raíz no es nada — y esa comparación es media lección. Solo
 * viven en el último tramo; atrás la raíz ya se suberizó y no absorbe.
 */
function PelosRaiz({ pelos }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.ConeGeometry(0.006, 1, 3), []);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ color: PALETA.raizPunta, flatShading: true }), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i < pelos.length; i++) {
      const pe = pelos[i];
      q.setFromUnitVectors(up, pe.dir);
      // el cono nace centrado: hay que correrlo medio largo para que SALGA de la raíz
      p.copy(pe.pos).addScaledVector(pe.dir, pe.largo * 0.5);
      s.set(1, pe.largo, 1);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [pelos]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!pelos.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, pelos.length]} frustumCulled={false} />;
}

/*
 * Los NÓDULOS del fríjol: ahí adentro el Rhizobium le saca nitrógeno al aire y
 * se lo cobra en azúcar. Son rosados por dentro de verdad. Otro socio, otro
 * puesto del mismo mercado — por eso se siembra fríjol con maíz.
 */
function Nodulos({ nodulos }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 6, 5), []);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ color: PALETA_SUELO.nodulo, flatShading: true }), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    for (let i = 0; i < nodulos.length; i++) {
      s.set(nodulos[i].r, nodulos[i].r * 0.82, nodulos[i].r * 0.82);
      m.compose(nodulos[i].pos, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [nodulos]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!nodulos.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, nodulos.length]} frustumCulled={false} />;
}

/* La BOLSA de humedad que la raíz va a buscar. La raíz no adivina: sigue el
   gradiente y se tuerce hacia el agua. Por eso la ahuyama entra derecho aquí. */
function BolsaAgua({ reducedMotion }) {
  const ref = useRef(null);
  useFrame((st) => {
    if (reducedMotion || !ref.current) return;
    const k = 1 + Math.sin(st.clock.elapsedTime * 0.6) * 0.05;
    ref.current.scale.set(BOLSA_AGUA.r * k, BOLSA_AGUA.r * 0.72 * k, BOLSA_AGUA.r * 0.5);
  });
  return (
    <mesh
      ref={ref}
      position={[BOLSA_AGUA.x, BOLSA_AGUA.y, CARA - 0.3]}
      scale={[BOLSA_AGUA.r, BOLSA_AGUA.r * 0.72, BOLSA_AGUA.r * 0.5]}
    >
      <sphereGeometry args={[1, 9, 7]} />
      <meshBasicMaterial color="#2b6b86" transparent opacity={0.42} depthWrite={false} />
    </mesh>
  );
}

/* ── LA ROCA ──────────────────────────────────────────────────────────────── */

/*
 * Los MINERALES que suben de la grieta hacia la red. Van lentísimos a propósito:
 * esto no pasa en una cosecha, pasa en siglos. Si se movieran rico, el arte
 * estaría mintiendo sobre el tiempo geológico.
 */
function Minerales({ minerales, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.OctahedronGeometry(1, 0), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: PALETA.fosforo, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
    [],
  );
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  const escribir = (time) => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i < minerales.length; i++) {
      const mn = minerales[i];
      const t = reducedMotion ? 0.35 : (time * mn.vel + mn.fase * 0.16) % 1;
      p.set(mn.x + Math.sin(t * 4 + mn.fase) * 0.05, mn.y0 + t * mn.sube, mn.z);
      const fade = Math.sin(t * Math.PI); // nace de la grieta y se disuelve en la red
      s.setScalar(0.024 * mn.esc * fade);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => { escribir(0); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minerales]);
  useFrame((st) => { if (!reducedMotion) escribir(st.clock.elapsedTime); });
  if (!minerales.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, minerales.length]} frustumCulled={false} />;
}

/* ── EL SUELO CANSADO ─────────────────────────────────────────────────────── */

/* Las ESPORAS DORMIDAS del lado arado: no está muerto, está esperando. Esa
   diferencia —muerto vs. esperando— es toda la lección de esta franja. */
function EsporasDormidas({ esporas, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.OctahedronGeometry(0.05, 0), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PALETA_SUELO.esporaDormida, transparent: true, opacity: 0.55, depthWrite: false }),
    [],
  );
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  const escribir = (time) => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    for (let i = 0; i < esporas.length; i++) {
      const e = esporas[i];
      // un latido larguísimo, casi apagado: la memoria del suelo respirando bajito
      const late = reducedMotion ? 1 : 1 + Math.sin(time * 0.5 + e.fase) * 0.22;
      s.setScalar(e.esc * late);
      m.compose(e.pos, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => { escribir(0); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esporas]);
  useFrame((st) => { if (!reducedMotion) escribir(st.clock.elapsedTime); });
  if (!esporas.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, esporas.length]} frustumCulled={false} />;
}

/* ── LA VENTANA DEL TRUEQUE (la joya de la lección) ───────────────────────── */

/*
 * EL MOSTRADOR, AMPLIADO. Un pedazo de raíz en corte con sus células como
 * ladrillos, y adentro de una el ARBÚSCULO: el arbolito de hifas que el hongo
 * arma dentro de la célula. Ahí se hace el negocio.
 *
 * Lo que hay que LEER sin texto: por el mismo hilo, al tiempo y en sentidos
 * CONTRARIOS, baja el azúcar (verde) que la mata fabricó con el sol y sube el
 * fósforo (ámbar) y el agua (azul) que el hongo consiguió en poros donde la raíz
 * jamás cabría. Nadie regala nada — y a los dos les sale ganancioso.
 */
function VentanaTrueque({ pos, tier, reducedMotion, matSolido }) {
  const celulas = useMemo(() => celulasGeom({ w: 1.05, h: 0.34, n: 3 }), []);
  const arb = useMemo(() => arbusculoGeom({ alto: 0.28, niveles: tier === 'bajo' ? 3 : 4 }), [tier]);
  useLayoutEffect(() => () => { celulas.dispose(); arb.dispose(); }, [celulas, arb]);

  /* Dos caminos: el TALLO de la raíz (de la mata al arbúsculo) y la HIFA (del
     suelo al arbúsculo). Por los dos va plata en las dos direcciones. */
  const { curvas, pulsos } = useMemo(() => ({
    curvas: [
      curvaHilo({
        a: new THREE.Vector3(0, 0.62, 0),
        mid: new THREE.Vector3(0.012, 0.26, 0),
        b: new THREE.Vector3(0, -0.1, 0),
      }),
      curvaHilo({
        a: new THREE.Vector3(-0.52, -0.2, 0),
        mid: new THREE.Vector3(-0.26, -0.03, 0),
        b: new THREE.Vector3(-0.02, -0.12, 0),
      }),
    ],
    pulsos: [
      // por la raíz: el azúcar BAJA (t: 0→1) y el mineral SUBE (t: 1→0)
      { hilo: 0, t0: 0.0, vel: 0.2, dir: 1, color: PALETA.carbono, tam: 1.5 },
      { hilo: 0, t0: 0.52, vel: 0.2, dir: 1, color: PALETA.carbono, tam: 1.4 },
      { hilo: 0, t0: 0.3, vel: 0.18, dir: -1, color: PALETA.fosforo, tam: 1.5 },
      { hilo: 0, t0: 0.8, vel: 0.18, dir: -1, color: PALETA.agua, tam: 1.35 },
      // por la hifa: el mineral ENTRA del suelo y el azúcar SALE hacia el hongo
      { hilo: 1, t0: 0.12, vel: 0.24, dir: 1, color: PALETA.fosforo, tam: 1.4 },
      { hilo: 1, t0: 0.66, vel: 0.24, dir: 1, color: PALETA.agua, tam: 1.25 },
      { hilo: 1, t0: 0.4, vel: 0.22, dir: -1, color: PALETA.carbono, tam: 1.3 },
    ],
  }), []);

  return (
    <group position={pos}>
      {/* el vidrio de la ventana */}
      <mesh position={[0, 0.16, -0.06]}>
        <boxGeometry args={[0.92, 1.5, 0.02]} />
        <meshBasicMaterial color="#0b120c" transparent opacity={0.86} />
      </mesh>
      {/* el marco */}
      <mesh position={[0, 0.16, -0.05]}>
        <boxGeometry args={[0.96, 1.54, 0.012]} />
        <meshBasicMaterial color={PALETA_SUELO.vesicula} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {/* el interior de la raíz: lo de adentro de la célula */}
      <mesh position={[0, 0.16, -0.035]}>
        <boxGeometry args={[0.34, 1.06, 0.01]} />
        <meshBasicMaterial color={PALETA_SUELO.celulaDentro} />
      </mesh>
      {/* las tres células apiladas: la raíz sube hacia la mata */}
      <mesh geometry={celulas} material={matSolido} position={[0, 0.16, 0]} rotation={[0, 0, Math.PI / 2]} />
      {/* EL ARBÚSCULO, en la célula del medio: el mostrador */}
      <mesh geometry={arb} material={matSolido} position={[0, 0.16, 0.02]} />
      {/* la VESÍCULA en la célula de arriba: el hongo guarda grasa para la seca */}
      <mesh position={[0.05, 0.5, 0.02]} scale={[0.09, 0.062, 0.05]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshLambertMaterial color={PALETA_SUELO.vesicula} flatShading />
      </mesh>
      {/* la hifa que entra del suelo atravesando la pared */}
      <mesh position={[-0.27, 0.03, 0.01]} rotation={[0, 0, 0.32]}>
        <boxGeometry args={[0.5, 0.016, 0.016]} />
        <meshBasicMaterial color={PALETA.micelio} />
      </mesh>
      <Pulsos curvas={curvas} pulsos={pulsos} reducedMotion={reducedMotion} radio={0.026} />
      <Html position={[0, -0.68, 0.05]} className="entm-ven" zIndexRange={[26, 10]}>
        <div className="entm-ven__t">El arbúsculo: aquí se hace el trato</div>
      </Html>
    </group>
  );
}

/* ── LA LUPA: la vida invisible ───────────────────────────────────────────── */

/*
 * En una cucharada de esta tierra hay más bichos que gente en el país, y son
 * ellos los que de verdad mandan. Se dibuja como LUPA a propósito: es la única
 * manera honesta de decir "esto NO se ve a simple vista, hay que creerle al
 * vidrio". Colémbolo, ácaro, hifas y bacterias — el gentío que nadie cuenta.
 */
function Lupa({ pos, radio, tier, reducedMotion, matSolido }) {
  const { bacterias, hifas } = useMemo(() => vidaInvisible({ tier }), [tier]);
  const colGeo = useMemo(() => bichoGeom('colembolo'), []);
  const acaGeo = useMemo(() => bichoGeom('acaro'), []);
  const matHifa = useMemo(
    () => new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
    [],
  );
  const geo = useMemo(() => new THREE.SphereGeometry(1, 5, 4), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: PALETA_SUELO.bacteria, transparent: true, opacity: 0.85, depthWrite: false }),
    [],
  );
  useLayoutEffect(() => () => {
    hifas?.dispose(); colGeo.dispose(); acaGeo.dispose(); matHifa.dispose(); geo.dispose(); mat.dispose();
  }, [hifas, colGeo, acaGeo, matHifa, geo, mat]);

  const bactRef = useRef(null);
  const colRef = useRef(null);
  const escribir = (time) => {
    const mesh = bactRef.current;
    if (mesh) {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3();
      const p = new THREE.Vector3();
      for (let i = 0; i < bacterias.length; i++) {
        const b = bacterias[i];
        // el temblequeo browniano: no van a ningún lado, pero no paran nunca
        const j = reducedMotion ? 0 : 0.02;
        p.set(b.pos.x + Math.sin(time * 2.1 + b.fase) * j, b.pos.y + Math.cos(time * 1.7 + b.fase * 1.3) * j, 0.03);
        s.setScalar(b.esc * 0.055);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    const col = colRef.current;
    if (col && !reducedMotion) {
      // el colémbolo SALTA: suelta la furca que lleva doblada bajo el vientre
      const ciclo = (time * 0.42) % 1;
      const salto = Math.max(0, Math.sin(ciclo * Math.PI * 2)) ** 2;
      col.position.y = -0.44 + salto * 0.5;
      col.position.x = -0.36 + ciclo * 0.5;
      col.rotation.z = 0.2 - salto * 0.8;
    }
  };
  useLayoutEffect(() => { escribir(0); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bacterias]);
  useFrame((st) => escribir(st.clock.elapsedTime));

  return (
    <group position={pos} scale={radio}>
      {/* el vidrio */}
      <mesh>
        <circleGeometry args={[1, 26]} />
        <meshBasicMaterial color="#0c1410" transparent opacity={0.93} />
      </mesh>
      {/* el aro de la lupa */}
      <mesh position={[0, 0, 0.012]}>
        <ringGeometry args={[0.99, 1.08, 26]} />
        <meshBasicMaterial color="#cfe6d8" />
      </mesh>
      {hifas && <mesh geometry={hifas} material={matHifa} position={[0, 0, 0.02]} />}
      <instancedMesh ref={bactRef} args={[geo, mat, bacterias.length]} frustumCulled={false} />
      {/* el colémbolo (salta) y el ácaro (ocho patas: no es insecto) */}
      <mesh ref={colRef} geometry={colGeo} material={matSolido} position={[-0.36, -0.44, 0.06]} scale={3.2} />
      <mesh geometry={acaGeo} material={matSolido} position={[0.44, 0.3, 0.06]} scale={2.8} rotation={[0, 0, 0.4]} />
      <Html position={[0, -1.3, 0.05]} className="entm-lupa" zIndexRange={[26, 10]}>
        <div className="entm-lupa__t">Lo que nadie ve: aquí manda el gentío</div>
      </Html>
    </group>
  );
}

/* ── LAS CAPAS ────────────────────────────────────────────────────────────── */

/* Un bloque de tierra del perfil VIVO + su rótulo. El bloque es solo el fondo:
   la vida va aparte, en el espacio del corte, cruzando las bandas. */
function Capa({ capa, activa }) {
  return (
    <group position={[X_VIVO, capa.cy, 0]}>
      <mesh>
        <boxGeometry args={[W_VIVO, capa.alto, CORTE.prof]} />
        <meshLambertMaterial color={capa.color} flatShading />
      </mesh>
      <Html position={[W_VIVO / 2 + 0.18, 0, CARA - 0.1]} className="entm-rot" zIndexRange={[30, 10]}>
        <div className={`entm-rot__caja${activa ? ' entm-rot__caja--activa' : ''}`}>
          <span className="entm-rot__n">{capa.nombre}</span>
          <span className="entm-rot__h">{capa.hint}</span>
        </div>
      </Html>
    </group>
  );
}

/* El FOCO del Ent: un compás que abraza la capa que está enseñando. Marca arriba
   y abajo —o sea, marca el GRUESO—, que es justo lo que hay que comparar contra
   el suelo cansado de al lado. */
function FocoCapa({ capa, reducedMotion }) {
  const ref = useRef(null);
  useFrame((st) => {
    if (reducedMotion || !ref.current) return;
    const o = 0.6 + Math.sin(st.clock.elapsedTime * 2.2) * 0.28;
    ref.current.children.forEach((c) => { if (c.material) c.material.opacity = o; });
  });
  return (
    <group ref={ref}>
      <mesh position={[X_VIVO, capa.techo, CARA + 0.012]}>
        <boxGeometry args={[W_VIVO + 0.06, 0.035, 0.035]} />
        <meshBasicMaterial color="#7ef0c8" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[X_VIVO, capa.piso, CARA + 0.012]}>
        <boxGeometry args={[W_VIVO + 0.06, 0.035, 0.035]} />
        <meshBasicMaterial color="#7ef0c8" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[CORTE_X.der + 0.045, capa.cy, CARA + 0.012]}>
        <boxGeometry args={[0.035, capa.alto, 0.035]} />
        <meshBasicMaterial color="#7ef0c8" transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ── LA VITRINA COMPLETA ──────────────────────────────────────────────────── */

function CorteSuelo({ tier, reducedMotion }) {
  const capas = useMemo(() => apilarPerfil(PERFIL_VIVO), []);
  const cans = useMemo(() => apilarPerfil(PERFIL_CANSADO), []);
  const banda = useMemo(() => capas.find((c) => c.id === 'micorrizas'), [capas]);
  const bHoja = useMemo(() => capas.find((c) => c.id === 'hojarasca'), [capas]);
  const bHumus = useMemo(() => capas.find((c) => c.id === 'humus'), [capas]);
  const bRoca = useMemo(() => capas.find((c) => c.id === 'roca'), [capas]);

  /* Materiales compartidos: menos cambios de estado en gama baja. */
  const matSolido = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), []);
  const matHoja = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }),
    [],
  );
  useLayoutEffect(() => () => { matSolido.dispose(); matHoja.dispose(); }, [matSolido, matHoja]);

  const hojarasca = useMemo(
    () => hojarascaCorte({
      x0: CORTE_X.sutura, x1: CORTE_X.der, techo: bHoja.techo, piso: bHoja.piso, cara: CARA,
      n: tier === 'alto' ? 28 : tier === 'medio' ? 16 : 9,
    }),
    [bHoja, tier],
  );
  const cayendo = useMemo(() => hojasCayendo(tier === 'alto' ? 5 : 3), [tier]);
  const raices = useMemo(() => raicesCorte({ cara: CARA, tier }), [tier]);
  const red = useMemo(() => redCorte({ puntas: raices.puntas, banda, cara: CARA, tier }), [raices, banda, tier]);
  const vuelve = useMemo(() => recolonizacion({ y: -0.7, cara: CARA, n: tier === 'bajo' ? 2 : 3 }), [tier]);
  const cansada = useMemo(() => sueloCansadoVida({ cara: CARA, tier }), [tier]);
  const humus = useMemo(
    () => agregadosHumus({ x0: CORTE_X.sutura, x1: CORTE_X.der, techo: bHumus.techo, piso: bHumus.piso, cara: CARA, tier }),
    [bHumus, tier],
  );
  const lombriz = useMemo(() => lombrizCorte({ x: 0.2, y: -0.85, cara: CARA }), []);
  const roca = useMemo(
    () => rocaCorte({ x0: CORTE_X.sutura, x1: CORTE_X.der, techo: bRoca.techo, piso: bRoca.piso, cara: CARA, tier }),
    [bRoca, tier],
  );
  useLayoutEffect(() => () => {
    hojarasca?.dispose();
    raices.geo?.dispose();
    red.geo?.dispose();
    vuelve.geo?.dispose();
    cansada.rotas?.dispose();
    humus.geo?.dispose();
    lombriz.tunel?.dispose();
    roca.geo?.dispose();
  }, [hojarasca, raices, red, vuelve, cansada, humus, lombriz, roca]);

  /* La punta de raíz que la ventana del trueque está ampliando: la más honda del
     fríjol. Se le pone un aro para que se vea DE DÓNDE sale el zoom. */
  const foco = useMemo(() => {
    const p = raices.puntas.filter((x) => x.planta === 'frijol').sort((a, b) => a.pos.y - b.pos.y)[0];
    return p ? p.pos : new THREE.Vector3(0.5, -2.8, CARA - 0.28);
  }, [raices]);

  const [activa, setActiva] = useState(0);
  useFrame((st) => {
    if (reducedMotion) return;
    const idx = Math.floor((st.clock.elapsedTime / DUR_CAPA) % PERFIL_VIVO.length);
    setActiva((a) => (a === idx ? a : idx));
  });
  const enRed = PERFIL_VIVO[activa]?.id === 'micorrizas';

  const bichos = useMemo(() => {
    const r = rng(7);
    const lista = [
      // en la hojarasca: el milpiés MASTICA la hoja (es el que de verdad tritura)
      { tipo: 'milpies', pos: [-0.42, bHoja.piso + 0.1, CARA - 0.03], rot: [0, 0, 0.25], esc: 1, fase: 0.4 },
      // y el ciempiés no come hoja: caza al que la come
      { tipo: 'ciempies', pos: [0.85, bHoja.piso + 0.14, CARA - 0.05], rot: [0, 0, -0.18], esc: 0.9, fase: 2.1 },
    ];
    if (tier !== 'bajo') {
      // el escarabajo entierra la materia, y con eso airea sin cobrarle a nadie
      lista.push({ tipo: 'escarabajo', pos: [1.34, bHumus.techo - 0.16, CARA - 0.04], rot: [0, 0, 0.1], esc: 1, fase: 3.3 });
      lista.push({ tipo: 'milpies', pos: [1.1, bHoja.piso + 0.04, CARA - 0.08], rot: [0, 0, -0.4], esc: 0.72, fase: r() * 6 });
    }
    return lista;
  }, [bHoja, bHumus, tier]);

  return (
    <group position={/** @type {[number, number, number]} */ (CORTE_POS)}>
      {/* ── los BLOQUES ── */}
      {capas.map((c, i) => <Capa key={c.id} capa={c} activa={i === activa} />)}
      {cans.map((c) => (
        <mesh key={`cans-${c.id}`} position={[X_CANS, c.cy, 0]}>
          <boxGeometry args={[W_CANS, c.alto, CORTE.prof]} />
          <meshLambertMaterial color={c.color} flatShading />
        </mesh>
      ))}

      {/* la COBERTURA que corona el suelo vivo: la cobija que lo mantiene vivo */}
      <mesh position={[X_VIVO, 0.045, 0]}>
        <boxGeometry args={[W_VIVO, 0.09, CORTE.prof]} />
        <meshLambertMaterial color="#6f9a45" flatShading />
      </mesh>
      {/* y el cansado, PELADO AL SOL: costra sellada y la ceniza de la quema */}
      <mesh position={[X_CANS, 0.012, 0]}>
        <boxGeometry args={[W_CANS, 0.024, CORTE.prof]} />
        <meshLambertMaterial color={PALETA_SUELO.costra} flatShading />
      </mesh>
      <mesh position={[X_CANS, 0.03, 0]}>
        <boxGeometry args={[W_CANS * 0.9, 0.012, CORTE.prof * 0.8]} />
        <meshLambertMaterial color={PALETA_SUELO.ceniza} flatShading />
      </mesh>

      {/* LA SUTURA: la línea del arado. El mismo potrero, dos manejos. */}
      <mesh position={[CORTE_X.sutura, -HONDO_CORTE / 2, CARA + 0.008]}>
        <boxGeometry args={[0.03, HONDO_CORTE, 0.03]} />
        <meshBasicMaterial color="#120c08" />
      </mesh>

      {/* ── LA VIDA, toda en el espacio del corte (las raíces cruzan bandas) ── */}
      {hojarasca && <mesh geometry={hojarasca} material={matHoja} />}
      {!reducedMotion && <HojasCayendo specs={cayendo} mat={matHoja} />}
      {bichos.map((b, i) => (
        <Bicho key={`bicho-${i}`} {...b} mat={matSolido} reducedMotion={reducedMotion} />
      ))}

      {humus.geo && <mesh geometry={humus.geo} material={matSolido} />}
      <Gotas gotas={humus.gotas} reducedMotion={reducedMotion} />
      {lombriz.tunel && <mesh geometry={lombriz.tunel} material={matSolido} />}
      <Lombriz curva={lombriz.curva} seg={lombriz.seg} reducedMotion={reducedMotion} />

      {raices.geo && <mesh geometry={raices.geo} material={matSolido} />}
      <PelosRaiz pelos={raices.pelos} />
      <Nodulos nodulos={raices.nodulos} />
      <BolsaAgua reducedMotion={reducedMotion} />

      <RedMicelio geo={red.geo} reducedMotion={reducedMotion} />
      <NodosRed nodos={red.nodos} />
      <Pulsos curvas={red.curvas} pulsos={red.pulsos} reducedMotion={reducedMotion} />

      {roca.geo && <mesh geometry={roca.geo} material={matSolido} />}
      <Minerales minerales={roca.minerales} reducedMotion={reducedMotion} />

      {/* LA MEMORIA: las hifas cruzando la sutura de vuelta al lado cansado */}
      <RedMicelio geo={vuelve.geo} reducedMotion={reducedMotion} opacidad={0.8} />
      <Pulsos curvas={vuelve.curvas} pulsos={vuelve.pulsos} reducedMotion={reducedMotion} radio={0.04} />
      {cansada.rotas && <mesh geometry={cansada.rotas} material={matSolido} />}
      <EsporasDormidas esporas={cansada.esporas} reducedMotion={reducedMotion} />

      {/* ── los dos AUMENTOS ── */}
      <Lupa
        pos={[-0.55, bHumus.cy + 0.1, CARA + 0.62]}
        radio={0.34}
        tier={tier}
        reducedMotion={reducedMotion}
        matSolido={matSolido}
      />
      {/* el aro sobre la punta de raíz que la ventana amplía: de aquí sale el zoom */}
      <mesh position={[foco.x, foco.y, CARA - 0.02]}>
        <ringGeometry args={[0.07, 0.09, 16]} />
        <meshBasicMaterial color={PALETA_SUELO.vesicula} transparent opacity={0.75} depthWrite={false} />
      </mesh>
      <VentanaTrueque
        pos={[1.34, banda.cy - 0.1, CARA + 0.72]}
        tier={tier}
        reducedMotion={reducedMotion}
        matSolido={matSolido}
      />

      {/* ── los rótulos que no son de capa ── */}
      <Html position={[X_CANS, 0.4, CARA - 0.2]} className="entm-cans" zIndexRange={[28, 10]}>
        <div>
          <div className="entm-cans__caja">
            <span className="entm-cans__n">El mismo potrero, quemado y arado</span>
            <span className="entm-cans__h">Sin cobija, la roca ya está aquí arribita.</span>
          </div>
          <span className="entm-cans__pico" />
        </div>
      </Html>
      <Html position={[X_VIVO, -HONDO_CORTE - 0.35, CARA - 0.2]} className="entm-ley" zIndexRange={[30, 10]}>
        <div className={`entm-ley__caja${enRed ? ' entm-ley__caja--activa' : ''}`}>
          <span className="entm-ley__t">El mercado</span>
          <span className="entm-ley__i">
            <i className="entm-ley__p" style={{ background: `#${PALETA.carbono.getHexString()}` }} />
            La mata paga azúcar
          </span>
          <span className="entm-ley__i">
            <i className="entm-ley__p" style={{ background: `#${PALETA.fosforo.getHexString()}` }} />
            El hongo devuelve fósforo y agua
          </span>
          <span className="entm-ley__i">
            <i className="entm-ley__p" style={{ background: `#${PALETA_SUELO.nodulo.getHexString()}` }} />
            El fríjol pone el nitrógeno
          </span>
        </div>
      </Html>

      {!reducedMotion && <FocoCapa capa={capas[activa]} reducedMotion={reducedMotion} />}
    </group>
  );
}

function Diorama({ tier, reducedMotion }) {
  const perfil = perfilDeTier(tier);
  return (
    <>
      <color attach="background" args={[PARAMO.fondo]} />
      {perfil.fog && <fog attach="fog" args={[PARAMO.niebla, 12, 40]} />}

      {/* luz de páramo (misma que el Bosque, para que el Ent se lea igual) */}
      <hemisphereLight intensity={0.92} color="#d7e2e4" groundColor="#3a3a2c" />
      <ambientLight intensity={0.34} color="#cdd7da" />
      <directionalLight
        position={[6, 12, 6]}
        intensity={1.12}
        color="#eef3f0"
        castShadow={perfil.sombras}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={34}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-5, 6, -6]} intensity={0.4} color="#b9cdd6" />
      {/* relleno frío bajo tierra: le da cuerpo a la red y a las capas hondas */}
      <pointLight position={[CORTE_POS[0], -2.6, CORTE_POS[2] + 1]} intensity={0.75} color="#37d6b0" distance={9} decay={2} />
      {/* y una lucecita cálida en la hojarasca, para que la hoja se lea */}
      <pointLight position={[CORTE_POS[0], -0.2, CORTE_POS[2] + 1.4]} intensity={0.45} color="#ffe6c0" distance={5} decay={2} />

      {/* parche de musgo del páramo bajo el Ent */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[3.0, 32]} />
        <meshLambertMaterial color={PARAMO.musgo} />
      </mesh>
      {/* apron de tierra que lleva del musgo a la vitrina de suelo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CORTE_POS[0] * 0.6, -0.02, CORTE_POS[2] * 0.6]}>
        <planeGeometry args={[5, 4]} />
        <meshLambertMaterial color="#4a4030" />
      </mesh>

      {/* EL GUARDIÁN, con el BRAZO que señala y enseña el suelo */}
      <EntQuenua tier={tier} reducedMotion={reducedMotion} señala />

      {/* LA VITRINA de suelo con sus capas, su vida y su mercado */}
      <CorteSuelo tier={tier} reducedMotion={reducedMotion} />

      <OrbitControls
        makeDefault
        target={[1.8, -1.2, 0.9]}
        enablePan={false}
        enableZoom
        minDistance={7}
        maxDistance={22}
        minPolarAngle={0.5}
        maxPolarAngle={1.52}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.1}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo del ENT MAESTRO: el guardián que abre el suelo y enseña que está
 * vivo, y que es un mercado. Montar SOLO perezosa (lazy). Acepta el contrato del
 * framework de mundos.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function EscenaEntMaestro({ tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <>
      <style>{CSS}</style>
      <Canvas
        className={`entm-canvas${listo ? ' entm-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        shadows={perfil.sombras ? 'soft' : false}
        camera={{ position: [4.7, 1.6, 15], fov: 46 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <Diorama tier={tier} reducedMotion={reducedMotion} />
      </Canvas>
    </>
  );
}
