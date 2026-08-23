// ── LA LECCIÓN DEL AGUA, SOBRE EL VALLE REAL ─────────────────────────────────
// «Quiero que la lección corra sobre La Chorrera y el paisaje actual del valle
//  de Guatoc en 3d.guatoc.co, no en el de /app.» (operador, 2026-07-30)
//
// La escena del mundo del agua ya NO es un diorama aparte: es ESTE valle — el
// DEM real, el farallón de cliff.js, la caída de waterfalls.js, la bocatoma
// del mundo agua en el thalweg medido. La lección es un RECORRIDO de
// estaciones sobre los accidentes reales:
//
//   1. La quebrada   — el puesto del mundo agua (70,-560: fondo de cauce
//                      medido, a 187 u del pie del salto): el agua que usted
//                      ve caer, ya corriendo.
//   2. La caída      — el plano tele de chorrera-real-detalle: ~590 m
//                      escalonados llenando el cuadro.
//   3. El nacimiento — el filo donde brota el hilo (T_NACE) con el RODAL DE
//                      QUEÑUAS plantado junto al labio: la fábrica de agua
//                      de la lección del Ent, EN su sitio ecológico real.
//   4. Los saltos    — la media caída (t=0.45): repisas, desfase, bruma.
//   5. La bocatoma   — la infraestructura del mundo agua (elementos.js):
//                      tome solo una parte.
//   6. El ciclo      — plano alto del cañón: vapor → nube → lluvia.
//
// NINGUNA estación lleva coordenadas horneadas contra el paisaje: todas se
// derivan de pathX/facePos/height y del puesto del catálogo — si mañana la
// cascada se mueve, la lección se mueve con ella (la regla de la casa).
//
// Se activa con `?leccion=agua` (el marco de /agua/ embebe `/?leccion=agua&onb=0`).
// main.js solo enchufa: `arrancar()` planta la cámara, `update(t)` vuela,
// `activa()` le dice al paseo/portales que la lección manda.
import * as THREE from 'three';
import { height } from './terrain.js';
import { facePos, pathX, T_NACE } from './cliff.js';
import { tickVientoMundos, aplicarVientoMundo } from './lib3d/flora/vientoMundos.js';
import { crearCopaMasa } from './lib3d/flora/FollajeMasa.js';

// el puesto CANÓNICO del mundo agua (catalogo.js: thalweg medido). Se toma el
// del catálogo, no el que el usuario haya arrastrado: la lección es fija.
const QX = 70, QZ = -560;

/* punto de la caída a altura t (la misma piel que la dibuja) */
function caida(t, dx = 0) {
  const x = pathX(t) + dx;
  const f = facePos(x, t);
  return new THREE.Vector3(x, f.y, f.z);
}

/* ── EL RODAL DE QUEÑUAS (Polylepis) en el filo, junto al nacimiento ────────
      «Es el árbol que llega más arriba.» Tronco rojizo de papel, copa baja y
      achaparrada — plantado en la CRESTA real a ambos lados del labio del
      hilo (sin invadir el paso del agua). Un draw call de troncos y dos de
      follaje instanciado. */
function plantarQuenuas(scene) {
  const N = 18;
  const troncoG = new THREE.CylinderGeometry(0.32, 0.5, 2.6, 5);
  troncoG.translate(0, 1.3, 0);
  const troncoM = new THREE.MeshStandardMaterial({ color: 0x8a4530, roughness: 0.9, flatShading: true });
  const troncos = new THREE.InstancedMesh(troncoG, troncoM, N);

  // La Polylepis conserva el porte bajo y ancho del arquetipo del páramo:
  // lóbulos desiguales alrededor de un centro, no una esfera única. La masa
  // real viene de FollajeMasa (núcleo suave + cards densos), que es el patrón
  // reutilizado por arbolesAltoandinos.js para el bosque que ya pasó juicio.
  const esferas = [
    { c: [0.15, 2.85, -0.1], r: 1.0, esc: [1.3, 0.72, 1.15] },
    { c: [-0.78, 2.35, 0.24], r: 0.86, esc: [1.16, 0.7, 1.05] },
    { c: [1.0, 2.42, -0.25], r: 0.94, esc: [1.2, 0.66, 1.08] },
    { c: [0.35, 3.48, 0.05], r: 0.68, esc: [1.12, 0.72, 1.0] },
    { c: [-0.05, 1.95, 0.22], r: 0.7, esc: [1.18, 0.65, 1.08] },
  ];
  const abajo = new THREE.Color('#203820');
  const arriba = new THREE.Color('#6f9148');
  const tmp = new THREE.Color();
  const gradiente = (x, y, z) => {
    const altura = THREE.MathUtils.clamp((y - 1.1) / 3.1, 0, 1);
    return tmp.copy(abajo).lerp(arriba, altura * 0.82 + (Math.sin(x * 1.7 + z * 0.9) * 0.5 + 0.5) * 0.12);
  };
  const masa = crearCopaMasa(THREE, {
    esferas,
    gradiente,
    seed: Number(new URLSearchParams(location.search).get('quenuaSeed')) || 158,
    brillo: 0.14,
    cobertura: 1.25,
    tamCard: 0.9,
    maxCards: 120,
    modulacion: 0.42,
    nucleoOpts: { segs: [12, 9], encoger: 0.9, rugosidad: 0.28, sombra: 0.46 },
    texOpts: {
      oscuro: '#1d3521', medio: '#3d6334', claro: '#73934b',
      hojas: 420, alargue: 2.0,
    },
  });
  const nucleoBase = masa.grupo.children[0];
  const cardsBase = masa.grupo.children[1];
  const copasNucleo = new THREE.InstancedMesh(nucleoBase.geometry, nucleoBase.material, N);
  const copasCards = new THREE.InstancedMesh(cardsBase.geometry, cardsBase.material, N);
  // El piso sigue siendo el de la copa anterior: ambos materiales nuevos
  // reciben la misma máscara de altura y el mismo reloj global.
  aplicarVientoMundo(nucleoBase.material, { amplitud: 0.055, piso: 0.35, velocidad: 1.0 });
  aplicarVientoMundo(cardsBase.material, { amplitud: 0.055, piso: 0.35, velocidad: 1.0 });
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eje = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();
  let s = 158; // determinista (la foto canónica)
  const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const nx = pathX(0.99);
  for (let i = 0; i < N; i++) {
    // a ambos lados del labio, sin pisar el paso del agua (|dx| >= 18)
    const lado = i % 2 ? 1 : -1;
    const x = nx + lado * (16 + rng() * 46);
    const t = 0.975 + rng() * 0.02;
    const f = facePos(x, t);
    const esc = 1.5 + rng() * 1.2;
    q.setFromAxisAngle(eje, rng() * Math.PI * 2);
    m4.compose(new THREE.Vector3(x, f.y - 0.4, f.z - 3), q, new THREE.Vector3(esc, esc * (0.9 + rng() * 0.3), esc));
    troncos.setMatrixAt(i, m4);
    copasNucleo.setMatrixAt(i, m4);
    copasCards.setMatrixAt(i, m4);
    col.setScalar(0.9 + rng() * 0.1);
    copasNucleo.setColorAt(i, col);
    copasCards.setColorAt(i, col);
  }
  troncos.instanceMatrix.needsUpdate = true;
  copasNucleo.instanceMatrix.needsUpdate = true;
  copasCards.instanceMatrix.needsUpdate = true;
  copasNucleo.instanceColor.needsUpdate = true;
  copasCards.instanceColor.needsUpdate = true;
  scene.add(troncos);
  scene.add(copasNucleo);
  scene.add(copasCards);
}

/* ── LA UI: chips de estación + la frase (sobrio, en «usted») ──────────────── */
const CSS = `
#lecAgua { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%);
  z-index: 30; display: flex; flex-direction: column; align-items: center; gap: 8px;
  width: min(94vw, 720px); font-family: system-ui, -apple-system, sans-serif; }
#lecAgua .laFrase { margin: 0; text-align: center; color: #f2f4e8;
  background: rgba(16, 22, 14, 0.62); backdrop-filter: blur(3px);
  border-radius: 10px; padding: 7px 14px; font-size: 0.86rem; line-height: 1.4;
  text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
#lecAgua .laChips { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px;
  list-style: none; margin: 0; padding: 0; }
#lecAgua .laChips button { border: 0; border-radius: 999px; cursor: pointer;
  padding: 6px 12px; font: 600 0.74rem/1 system-ui, sans-serif;
  color: #e8f0e4; background: rgba(16, 22, 14, 0.55); }
#lecAgua .laChips button[aria-pressed="true"] { background: rgba(79, 184, 232, 0.85); color: #0b1512; }
@media (max-width: 700px) { #lecAgua .laFrase { font-size: 0.78rem; } }
/* en modo leccion los overlays del valle callan: las cartas de los mundos y
   el selector de guia taparian el paisaje que ES la leccion */
body[data-leccion] #capaLugares, body[data-leccion] #guiaSel { display: none !important; }
`;

export function makeLeccionAgua({ scene, camera, controls }) {
  document.body.dataset.leccion = 'agua';
  plantarQuenuas(scene);

  const hQ = height(QX, QZ);
  const pie = caida(0.16);
  const mid = caida(0.45);
  const nace = caida(T_NACE);
  const filo = caida(0.99);

  /* Las estaciones: cámara + mirada + frase. Derivadas, no horneadas. */
  const EST = [
    {
      id: 'quebrada', titulo: 'La quebrada',
      frase: 'Esta es el agua que usted ve caer, ya corriendo. De aquí baja a la vereda — cuidarla arriba es cuidarla abajo.',
      pos: () => new THREE.Vector3(pie.x + 120, pie.y + 26, pie.z + 420),
      mira: () => new THREE.Vector3(pie.x, pie.y + 120, pie.z),
    },
    {
      id: 'caida', titulo: 'La caída',
      frase: 'La Chorrera: ~590 metros en tres saltos, la caída más alta de Colombia. Cada golpe revienta en bruma.',
      pos: () => new THREE.Vector3(mid.x + 46, mid.y + 96, mid.z + 620),
      mira: () => mid.clone(),
    },
    {
      id: 'nacimiento', titulo: 'El nacimiento',
      frase: 'Arriba, donde llega la queñua: su copa peina la niebla, el agua escurre por el tronco y gota a gota nace la quebrada.',
      pos: () => new THREE.Vector3(nace.x + 18, nace.y + 46, nace.z + 200),
      mira: () => new THREE.Vector3(nace.x, nace.y + 34, nace.z),
    },
    {
      id: 'saltos', titulo: 'Los saltos',
      frase: 'El agua baja de repisa en repisa, se desvía y se deshilacha; la bruma del impacto vuelve a mojar el bosque de la pared.',
      pos: () => new THREE.Vector3(mid.x + 70, mid.y + 30, mid.z + 300),
      mira: () => mid.clone(),
    },
    {
      id: 'bocatoma', titulo: 'La bocatoma',
      frase: 'Tome solo la parte que necesita: la quebrada debe seguir corriendo después de la toma.',
      pos: () => new THREE.Vector3(QX + 10, hQ + 26, QZ + 58),
      mira: () => new THREE.Vector3(QX, hQ, QZ - 8),
    },
    {
      id: 'ciclo', titulo: 'El ciclo se cierra',
      frase: 'El sol sube el agua en vapor, la niebla se hace nube sobre el páramo — y vuelve a llover donde nace la quebrada.',
      pos: () => new THREE.Vector3(mid.x + 210, filo.y + 55, mid.z + 700),
      mira: () => new THREE.Vector3(nace.x, nace.y + 90, nace.z),
    },
  ];

  /* ── el vuelo entre estaciones: lerp suavizado de posición + mirada.
        El click solo DEJA PEDIDA la estación; el vuelo arranca en update()
        con el reloj del render (un solo reloj, cero desfaces). ── */
  const VUELO_S = 3.0;
  const st = {
    idx: 0,
    pedida: null, // índice pedido por el usuario (lo recoge update)
    vuelo: null, // { p0, p1, m0, m1, t0 }
    mira: new THREE.Vector3(),
  };
  const botones = [];

  function frase(i) {
    const el = document.querySelector('#lecAgua .laFrase');
    if (el) el.textContent = EST[i].frase;
    botones.forEach((b, j) => b.setAttribute('aria-pressed', j === i ? 'true' : 'false'));
  }

  /* la UI */
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const ui = document.createElement('div');
  ui.id = 'lecAgua';
  ui.innerHTML = '<ul class="laChips"></ul><p class="laFrase"></p>';
  document.body.appendChild(ui);
  const lista = ui.querySelector('.laChips');
  EST.forEach((e, i) => {
    const li = document.createElement('li');
    const bt = document.createElement('button');
    bt.type = 'button';
    bt.textContent = e.titulo;
    bt.addEventListener('click', () => { st.pedida = i; });
    li.appendChild(bt);
    lista.appendChild(li);
    botones.push(bt);
  });

  return {
    /* plantar la cámara en la estación inicial, sin vuelo (el marco abre en
       la 1; `&est=<id>` planta otra — el gate visual captura cada estación
       determinista, sin cronometrar vuelos) */
    arrancar() {
      const pedidaId = new URLSearchParams(location.search).get('est');
      const i0 = Math.max(0, EST.findIndex((e2) => e2.id === pedidaId));
      st.idx = i0;
      const e = EST[i0];
      camera.position.copy(e.pos());
      st.mira.copy(e.mira());
      camera.lookAt(st.mira);
      controls.target.copy(st.mira);
      controls.enabled = false; // el primer cuadro se entrega quieto
      frase(i0);
      // un respiro y el control es del usuario (orbitar desde la estación)
      setTimeout(() => { if (!st.vuelo) controls.enabled = true; }, 900);
    },
    update(t) {
      tickVientoMundos(t);
      if (st.pedida !== null) {
        st.idx = st.pedida;
        st.pedida = null;
        // la mirada de partida es la VIVA: si el usuario orbitó, el target
        // de los controles manda (st.mira quedaría vieja)
        if (controls.enabled) st.mira.copy(controls.target);
        st.vuelo = {
          p0: camera.position.clone(),
          p1: EST[st.idx].pos(),
          m0: st.mira.clone(),
          m1: EST[st.idx].mira(),
          t0: t,
        };
        controls.enabled = false;
        frase(st.idx);
      }
      if (!st.vuelo) return;
      const k = Math.min((t - st.vuelo.t0) / VUELO_S, 1);
      const e = k * k * k * (k * (k * 6 - 15) + 10); // smootherstep
      camera.position.lerpVectors(st.vuelo.p0, st.vuelo.p1, e);
      st.mira.lerpVectors(st.vuelo.m0, st.vuelo.m1, e);
      camera.lookAt(st.mira);
      if (k >= 1) {
        controls.target.copy(st.mira);
        controls.enabled = true;
        controls.update();
        st.vuelo = null;
      }
    },
  };
}
