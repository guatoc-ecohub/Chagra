// ── juegos/bestiario/visor.js — LA MESA DEL ATLAS ───────────────────────────
//
// Una sola criatura a la vez, centrada, girable, con la regla del piso diciendo
// su tamaño REAL (aunque la abeja se vea del porte de un gato) y los puntos
// calientes flotando sobre su anatomía.
//
// LA OCLUSIÓN es lo que separa un atlas de una captura con globitos: cuando el
// punto queda DETRÁS del cuerpo hay que apagarlo, o el lector cree que la garra
// está del lado que mira. Se resuelve con `three-mesh-bvh` ya vendorizado en
// lib3d/geom: un rayo de la cámara al punto contra las mallas opacas, con
// `firstHitOnly` y el alcance recortado un 3,5 % para no chocar con la propia
// piel donde está clavado el punto.
//
// El rig (luces, piso, fondo, sombras) es FIJO: cada criatura se normaliza a un
// tamaño de escena común y declara aparte cuántos metros vale una unidad suya.
// Así el oso, el jaguar y una abeja de 5 mm se ven bajo la misma luz y la regla
// sigue diciendo la verdad.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { BESTIARIO, porId } from './criaturas/index.js';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// Movimiento reducido: las motas del aire y el animar de reposo de la criatura
// (el flotar de la abeja, el destello de la luciérnaga) se apagan y la criatura
// queda en su pose de vitrina. Girar y acercar con el ratón/dedo se conserva:
// es el dedo del usuario, no adorno. Se escucha el cambio de preferencia en vivo.
let reducedMotion = typeof matchMedia === 'function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;
const rmQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
if (rmQuery?.addEventListener) {
  rmQuery.addEventListener('change', () => { reducedMotion = rmQuery.matches; window.__bestiarioReducedMotion = reducedMotion; });
}
window.__bestiarioReducedMotion = reducedMotion;

const TAM_ESCENA = 1.68;    // el lado mayor de cualquier criatura, normalizado
const DIR_HEROE = new THREE.Vector3(0.90, 0.345, 1.02).normalize();

const $ = (id) => document.getElementById(id);
const lienzo = $('escena');
const capaPuntos = $('puntos');

/* ── RENDERER · CÁMARA · ESCENA ─────────────────────────────────────────── */
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(33, 1, 0.02, 60);
camara.position.set(2.6, 1.4, 3.0);

const controles = new OrbitControls(camara, renderer.domElement);
controles.enableDamping = true;
controles.dampingFactor = 0.075;
controles.rotateSpeed = 0.85;
controles.zoomSpeed = 0.8;
controles.enablePan = false;
controles.maxPolarAngle = Math.PI * 0.51;   // no meterse debajo del piso
controles.minPolarAngle = Math.PI * 0.10;
controles.autoRotateSpeed = 0.85;

/* ── FONDO: cúpula con degradado verde, para que verde sea lo dominante ─── */
{
  const domo = new THREE.Mesh(
    new THREE.SphereGeometry(24, 40, 26),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        cBajo: { value: new THREE.Color('#0b1310') },
        cMedio: { value: new THREE.Color('#1e2e1d') },
        cAlto: { value: new THREE.Color('#41603c') },
      },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vP; uniform vec3 cBajo, cMedio, cAlto;
        void main(){
          float h = normalize(vP).y;
          vec3 c = mix(cBajo, cMedio, smoothstep(-0.55, 0.06, h));
          c = mix(c, cAlto, smoothstep(0.03, 0.80, h));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  domo.renderOrder = -1;
  escena.add(domo);
  escena.userData.domo = domo;
}

/* ── PISO: disco de monte que se apaga contra el fondo ──────────────────── */
{
  const geo = new THREE.CircleGeometry(2.55, 128);   // cabe entero en la cámara de sombra
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  const centro = new THREE.Color('#3f5c30'), borde = new THREE.Color('#131d13');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const d = Math.hypot(p.getX(i), p.getZ(i)) / 2.55;
    c.copy(centro).lerp(borde, Math.min(1, d ** 1.5 * 1.12));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const piso = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98 }));
  piso.receiveShadow = true;
  escena.add(piso);
  escena.userData.piso = piso;
}

/* ── LUZ: clave cálida + relleno frío + contraluz. Sin el contraluz un oso
      casi negro se hunde contra el fondo y deja de tener volumen. ───────── */
const clave = new THREE.DirectionalLight(0xfff1d6, 2.45);
clave.position.set(2.5, 3.5, 2.1);
clave.castShadow = true;
clave.shadow.mapSize.set(2048, 2048);
// ⚠️ TRAMPA CARA, encontrada midiendo píxeles y no a ojo: con la cámara de
// sombra en ±1,9 la escena NO cabía dentro (el disco de piso y las alas se
// salían). Lo que queda fuera del mapa muestrea el téxel del BORDE por el
// ClampToEdge, y si ese téxel tiene un caster cerca, TODO lo de afuera sale
// sombreado. Síntoma: el tubo de cera de la angelita se veía verde musgo y
// había parches oscuros sueltos en el pasto. El encuadre normaliza toda
// criatura a 1,68 de lado mayor, así que ±2,9 cubre cualquiera con margen.
clave.shadow.camera.left = -2.9; clave.shadow.camera.right = 2.9;
clave.shadow.camera.top = 2.9; clave.shadow.camera.bottom = -2.9;
clave.shadow.camera.near = 0.5; clave.shadow.camera.far = 14;
clave.shadow.bias = -0.0009;
clave.shadow.normalBias = 0.016;
escena.add(clave);

const relleno = new THREE.DirectionalLight(0x9dc3de, 0.80);
relleno.position.set(-2.9, 1.5, 1.7);
escena.add(relleno);

const contraluz = new THREE.DirectionalLight(0xffd9a2, 1.55);
contraluz.position.set(-1.5, 2.1, -2.9);
escena.add(contraluz);

const hemi = new THREE.HemisphereLight(0xa9c8dc, 0x33481f, 0.62);
escena.add(hemi);

// REBOTE DEL SUELO: sin él la panza queda en negro y se pierde el vientre
// claro del jaguar, que es medio dato de campo. Verde tenue, desde abajo.
const rebote = new THREE.DirectionalLight(0xa8c07a, 0.42);
rebote.position.set(0.8, -1.4, 1.9);
escena.add(rebote);

/* ── MOTAS en la luz: el mundo respira sin que la criatura se mueva ─────── */
{
  const n = 150, pos = new Float32Array(n * 3), fase = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 2.4;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = 0.06 + Math.random() * 1.9;
    pos[i * 3 + 2] = Math.sin(a) * r;
    fase[i] = Math.random() * Math.PI * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const motas = new THREE.Points(g, new THREE.PointsMaterial({
    color: 0xffe8b4, size: 0.012, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  motas.renderOrder = 2;
  escena.add(motas);
  motas.userData.paso = (t) => {
    const p = motas.geometry.attributes.position;
    for (let i = 0; i < n; i++) {
      p.setY(i, 0.06 + ((pos[i * 3 + 1] - 0.06 + t * 0.035 + fase[i] * 0.3) % 1.9));
      p.setX(i, pos[i * 3] + Math.sin(t * 0.35 + fase[i]) * 0.05);
    }
    p.needsUpdate = true;
  };
  escena.userData.motas = motas;
}

/* ── PENUMBRA: el rig sigue siendo FIJO, pero tiene DOS posiciones ────────
      A una criatura cuya seña de identidad es LUZ PROPIA (la luciérnaga) no
      se la juzga a mediodía: un escarabajo perfectamente modelado y apagado
      no se lee como luciérnaga. La criatura que declare `penumbra: true` en
      su ficha del registro baja el rig a crepúsculo: la clave se vuelve luna,
      el contraluz queda de guardia para que la silueta no se hunda, y el
      resto casi se apaga — la PointLight del propio bicho hace el resto.
      Al cargar una criatura diurna el rig se restaura ENTERO. */
function ponerPenumbra(on) {
  clave.intensity = on ? 0.78 : 2.45;
  clave.color.set(on ? '#aebfdd' : '#fff1d6');
  relleno.intensity = on ? 0.20 : 0.80;
  contraluz.intensity = on ? 0.90 : 1.55;
  contraluz.color.set(on ? '#8fa8cc' : '#ffd9a2');
  hemi.intensity = on ? 0.26 : 0.62;
  rebote.intensity = on ? 0.08 : 0.42;
  renderer.toneMappingExposure = on ? 1.0 : 1.06;
  const d = escena.userData.domo.material.uniforms;
  d.cBajo.value.set(on ? '#04080a' : '#0b1310');
  d.cMedio.value.set(on ? '#0a1517' : '#1e2e1d');
  d.cAlto.value.set(on ? '#152830' : '#41603c');
  // el piso lleva color por vértice: el tinte multiplica, no lo pisa
  escena.userData.piso.material.color.set(on ? '#3d4a55' : '#ffffff');
  escena.userData.motas.material.opacity = on ? 0.12 : 0.5;
}

/* ── LA REGLA DEL PISO: dice el tamaño REAL, no el de pantalla ──────────── */
const regla = new THREE.Group();
escena.add(regla);
const rotuloRegla = document.createElement('div');
rotuloRegla.className = 'regla';
capaPuntos.appendChild(rotuloRegla);
const anclaRegla = new THREE.Vector3();
const PASOS = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];

function textoLongitud(m) {
  if (m < 0.01) return `${Math.round(m * 1000)} mm`;
  if (m < 1) return `${Math.round(m * 100)} cm`;
  return `${m % 1 === 0 ? m : m.toFixed(1)} m`.replace('.', ',');
}

function armarRegla(anchoRealM, unidadesPorMetro, zFrente) {
  regla.clear();
  let largo = PASOS[0];
  for (const p of PASOS) if (p <= anchoRealM * 0.58) largo = p;
  const w = largo * unidadesPorMetro;
  const mat = new THREE.MeshBasicMaterial({ color: 0xf0e5cb, transparent: true, opacity: 0.62 });
  const barra = new THREE.Mesh(new THREE.BoxGeometry(w, 0.006, 0.010), mat);
  barra.position.set(0, 0.004, zFrente);
  regla.add(barra);
  for (const s of [-1, 1]) {
    const tope = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.006, 0.062), mat);
    tope.position.set(s * w / 2, 0.004, zFrente);
    regla.add(tope);
  }
  rotuloRegla.textContent = textoLongitud(largo);
  anclaRegla.set(0, 0.02, zFrente + 0.10);
}

/* ── ESTADO ─────────────────────────────────────────────────────────────── */
const cache = new Map();
let actual = null;          // { def, datos, contenedor, mallas, marcas, foco, dist }
let puntoAbierto = null;

const rayo = new THREE.Raycaster();
rayo.firstHitOnly = true;
const _v = new THREE.Vector3();
const _d = new THREE.Vector3();

/* ── CARGAR UNA CRIATURA ────────────────────────────────────────────────── */
async function cargar(id) {
  const def = porId(id);
  if (!def || typeof def.construir !== 'function') return;
  $('velo').classList.remove('se-va');
  $('velo').textContent = `armando ${def.nombre.toLowerCase()}…`;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  if (actual) escena.remove(actual.contenedor);
  cerrarDetalle();

  let datos = cache.get(id);
  if (!datos) {
    datos = def.construir();
    datos.grupo.traverse((o) => {
      if (o.isMesh && o.geometry && !o.material.transparent) o.geometry.computeBoundsTree();
    });
    cache.set(id, datos);
  }

  // normalización a un tamaño de escena común (el rig de luz es fijo)
  const contenedor = new THREE.Group();
  contenedor.add(datos.grupo);
  datos.grupo.position.set(0, 0, 0);
  datos.grupo.scale.setScalar(1);
  const caja = new THREE.Box3().setFromObject(datos.grupo);
  const dim = caja.getSize(new THREE.Vector3());
  const centro = caja.getCenter(new THREE.Vector3());
  const esc = TAM_ESCENA / Math.max(dim.x, dim.y, dim.z);
  contenedor.scale.setScalar(esc);
  contenedor.position.set(-centro.x * esc, -caja.min.y * esc, -centro.z * esc);
  escena.add(contenedor);

  const mallas = [];
  datos.grupo.traverse((o) => { if (o.isMesh && !o.material.transparent) mallas.push(o); });

  const foco = new THREE.Vector3(0, (centro.y - caja.min.y) * esc, 0);
  const radio = 0.5 * dim.length() * esc;

  armarRegla(dim.x * datos.metrosPorUnidad, esc / datos.metrosPorUnidad, dim.z * esc * 0.5 + 0.24);

  ponerPenumbra(Boolean(def.penumbra));

  actual = { def, datos, contenedor, mallas, marcas: [], foco, radio };
  montarPuntos(datos);
  pintarFicha(def);
  encuadrar(true);
  marcarChip(id);

  $('velo').classList.add('se-va');
}

function encuadrar(saltar = false) {
  if (!actual) return;
  const fovV = THREE.MathUtils.degToRad(camara.fov);
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * camara.aspect);
  const dist = Math.max(actual.radio / Math.sin(fovV / 2), actual.radio / Math.sin(fovH / 2)) * 1.16;
  controles.target.copy(actual.foco);
  controles.minDistance = dist * 0.40;
  controles.maxDistance = dist * 2.4;
  if (saltar) {
    camara.position.copy(actual.foco).addScaledVector(DIR_HEROE, dist);
  } else {
    _d.copy(camara.position).sub(controles.target).normalize();
    camara.position.copy(actual.foco).addScaledVector(_d, dist);
  }
  camara.near = Math.max(0.01, dist * 0.02);
  camara.far = dist * 12;
  camara.updateProjectionMatrix();
  controles.update();
}

/* ── LOS PUNTOS CALIENTES ───────────────────────────────────────────────── */
function montarPuntos(datos) {
  for (const el of capaPuntos.querySelectorAll('.hs')) el.remove();
  actual.marcas = datos.puntos.map((p, i) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'hs';
    el.setAttribute('aria-label', p.etiqueta);
    const anillo = document.createElement('span');
    anillo.className = 'anillo';
    anillo.textContent = String(i + 1);
    const rot = document.createElement('span');
    rot.className = 'rotulo';
    rot.textContent = p.etiqueta;
    el.append(anillo, rot);
    el.addEventListener('click', (ev) => { ev.stopPropagation(); abrirDetalle(p, i); });
    capaPuntos.appendChild(el);
    return { def: p, el, i, mundo: new THREE.Vector3(), visible: true };
  });
}

function abrirDetalle(p, i) {
  puntoAbierto = p.id;
  $('detalleNum').textContent = String(i + 1);
  $('detalleTitulo').textContent = p.etiqueta;
  $('detalleTexto').textContent = p.descripcion;
  $('detalle').classList.remove('vacio');
  for (const m of actual.marcas) m.el.classList.toggle('activo', m.def.id === p.id);
}

function cerrarDetalle() {
  puntoAbierto = null;
  $('detalle').classList.add('vacio');
  if (actual) for (const m of actual.marcas) m.el.classList.remove('activo');
}

function pintarFicha(def) {
  $('nombre').textContent = def.nombre;
  $('cientifico').textContent = def.nombreCientifico;
  $('apodo').textContent = def.apodo || '';
  $('rol').textContent = def.rol;
  $('tamano').textContent = def.tamano;
  $('donde').textContent = def.donde;
  if (def.estado) { $('filaEstado').style.display = ''; $('estado').textContent = def.estado; }
  else $('filaEstado').style.display = 'none';
}

/* ── BARRA DE ESPECIES ──────────────────────────────────────────────────── */
const barra = $('especies');
for (const c of BESTIARIO) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.dataset.id = c.id;
  b.textContent = c.nombre;
  if (typeof c.construir !== 'function') {
    b.disabled = true;
    b.title = `Ficha lista; falta modelar: ${(c.partes || []).join(' · ')}`;
    const s = document.createElement('span');
    s.className = 'pend';
    s.textContent = 'en obra';
    b.appendChild(s);
  } else {
    b.addEventListener('click', () => cargar(c.id));
  }
  barra.appendChild(b);
}
function marcarChip(id) {
  for (const b of barra.querySelectorAll('.chip')) b.classList.toggle('sel', b.dataset.id === id);
}

/* ── MANDOS ─────────────────────────────────────────────────────────────── */
$('btnGirar').addEventListener('click', (e) => {
  controles.autoRotate = !controles.autoRotate;
  e.currentTarget.classList.toggle('on', controles.autoRotate);
});
$('btnPuntos').addEventListener('click', (e) => {
  capaPuntos.classList.toggle('apagado');
  e.currentTarget.classList.toggle('on', !capaPuntos.classList.contains('apagado'));
});
$('btnEncuadre').addEventListener('click', () => encuadrar(true));
$('cerrarDetalle').addEventListener('click', cerrarDetalle);
renderer.domElement.addEventListener('pointerdown', () => { controles.autoRotate = false; $('btnGirar').classList.remove('on'); });

/* ── RESIZE ─────────────────────────────────────────────────────────────── */
function medir() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camara.aspect = w / h;
  camara.updateProjectionMatrix();
  if (actual) encuadrar(false);
}
addEventListener('resize', medir);

/* ── EL LOOP ────────────────────────────────────────────────────────────── */
let cuadro = 0;
const reloj = new THREE.Clock();

function proyectar(v) {
  _v.copy(v).project(camara);
  return [(_v.x * 0.5 + 0.5) * innerWidth, (-_v.y * 0.5 + 0.5) * innerHeight, _v.z];
}

function bucle() {
  requestAnimationFrame(bucle);
  const t = reloj.getElapsedTime();
  controles.update();
  if (!reducedMotion) {
    escena.userData.motas?.userData.paso(t);
    if (actual?.datos.animar) actual.datos.animar(t);
  }

  // rótulo de la regla
  {
    const [x, y, z] = proyectar(_v.copy(anclaRegla));
    rotuloRegla.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%)`;
    rotuloRegla.style.opacity = z < 1 ? '1' : '0';
  }

  if (actual) {
    const testear = (cuadro % 3) === 0;   // la oclusión no necesita 60 Hz
    for (const m of actual.marcas) {
      m.mundo.set(m.def.posicion[0], m.def.posicion[1], m.def.posicion[2]);
      actual.contenedor.localToWorld(m.mundo);
      const [x, y, z] = proyectar(m.mundo);
      m.el.style.transform = `translate(${x}px, ${y}px) translate(-14px,-50%)`;
      if (testear) {
        let ver = z < 1;
        if (ver) {
          _d.copy(m.mundo).sub(camara.position);
          const dist = _d.length();
          rayo.set(camara.position, _d.normalize());
          rayo.near = 0.001;
          rayo.far = dist * 0.965;   // no chocar con la piel donde vive el punto
          ver = rayo.intersectObjects(actual.mallas, false).length === 0;
        }
        if (ver !== m.visible) {
          m.visible = ver;
          m.el.classList.toggle('oculto', !ver);
        }
      }
    }
  }
  cuadro++;
  renderer.render(escena, camara);
}

/* ── ARRANQUE ───────────────────────────────────────────────────────────── */
medir();
bucle();

const pedido = new URLSearchParams(location.search).get('bicho');
cargar(porId(pedido)?.construir ? pedido : 'oso');

// sonda para el gate visual: `?bicho=jaguar&punto=lomo` abre el punto solo
addEventListener('load', () => {
  const p = new URLSearchParams(location.search).get('punto');
  if (!p) return;
  setTimeout(() => {
    const m = actual?.marcas.find((x) => x.def.id === p);
    if (m) abrirDetalle(m.def, m.i);
  }, 900);
});
void puntoAbierto;
