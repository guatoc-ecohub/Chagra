// ── main.js — Chagra Kart: bucle, input, contador, post y meta ──────────────
// Conduce la física pura (pista + vehículo) con el modelo 3D, la chase cam, el
// entorno con niebla por zona, las partículas, el HUD y el sonido. Calidad
// adaptativa vía config.js (60 FPS es requisito). Countdown de 3,2,1,¡YA! y
// pantalla de resultado al terminar las 3 vueltas.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { ShaderGradeoFinal } from '../../../lib3d/post/gradeoFinal.js';
import { leerCompanero } from '../../../compai/elenco.js';

import { detectarConfig } from './config.js';
import { construirPista, ZONA } from './pista.js';
import { VEHICULOS, TURBO_NIVELES } from './vehiculos.js';
import { PILOTOS, ITEMS, PILOTO_POR_ID, pilotoDesbloqueado, pilotoDesdeCompai } from './pilotos.js';
import { crearFisica, atenuarPorSegundo, escalarVehiculoCarrera, VELOCIDAD_ESCALA, REBUFO_TECHO } from './fisica.js';
import { construirModeloVehiculo } from './modelos.js';
import { agregarFlotadores } from './flotadores.js';
import { crearEntFrailejonRescatador } from './modelos/ent-frailejon.js';
import { crearCamara } from './camara.js';
import { crearEntorno } from './entorno.js';
import { crearEntornoMar } from './entorno-mar.js';
import { crearObstaculosMar } from './obstaculos-mar.js';
import { iniciarCapaMar } from './mar/mar-capa.js';
import { crearFauna, crearRivales } from './actores.js';
import { crearFx } from './fx.js';
import { crearPoderesVfx } from './poderes-vfx.js';
import { crearFxToon, crearSacudon, setReducedMotionSacudon } from './fx-toon.js';
import { formaDe, resolverTodos, aplicarImpulsoAKart, AJUSTE } from './colision.js';
import { crearHud } from './hud.js';
import { crearPortalChorrera, crearTransicionNewDonk, saltarPortal } from './portal-newdonk.js';
import { crearMultijugador } from './multijugador.js';
import { initAudio, setMuted, isMuted, toggleMute, sfx, actualizarMotor } from './audio.js';

const cfg = detectarConfig();
const canvas = document.getElementById('game');

// prefers-reduced-motion: se lee en vivo y se reparte a cámara, sacudones y
// selector. La preferencia se puede cambiar con el juego abierto, así que se
// escucha el cambio (patrón de angelita-bros/game.js).
let reducedMotion = typeof matchMedia === 'function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── renderer / escena ───────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(cfg.pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.info.autoReset = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
if (cfg.sombras) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

// El panel de diagnóstico se muestra SOLO con ?perf=1. Se dejó visible por
// defecto durante una cacería de rendimiento que resultó ser falsa alarma, y
// tapaba una esquina del juego. Sirve mucho para depurar, pero no encima de la
// partida de una niña de 11 años.
const MOSTRAR_PERF = typeof location !== 'undefined'
  && new URLSearchParams(location.search).get('perf') === '1';
const PERF_LOG = typeof location !== 'undefined'
  && new URLSearchParams(location.search).get('perfLog') !== '0';
const perfEl = document.createElement('pre');
perfEl.id = 'perfHud';
if (!MOSTRAR_PERF) perfEl.hidden = true;
perfEl.style.cssText = [
  'position:fixed',
  'left:12px',
  'top:12px',
  'z-index:40',
  'margin:0',
  'padding:8px 10px',
  'background:rgba(15,18,16,0.68)',
  'color:#e9f2df',
  'border:1px solid rgba(255,255,255,0.16)',
  'border-radius:8px',
  'font:12px/1.25 monospace',
  'white-space:pre',
  'pointer-events:none',
  'text-shadow:0 1px 0 rgba(0,0,0,0.4)',
].join(';');
document.body.appendChild(perfEl);
let _perfUltLog = 0;
let _perfModo = 'menu';

const escena = new THREE.Scene();
const params = new URLSearchParams(location.search);
const MUNDO_CHORRERA = params.get('mundo') === 'chorrera' || params.get('vista') === 'chorrera';
const MUNDO_MAR = params.get('mundo') === 'mar';
const camara = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.3, MUNDO_MAR ? 60000 : 900);
camara.position.set(0, 30, -40);

// Señal visual del túnel de viento. Son trazos geométricos baratos, sin HUD ni
// texto: aparecen alrededor del kart mientras la carga se construye y se
// alargan al acercarse al +16 % de empuje.
const rebufoFx = new THREE.Group();
const rebufoMat = new THREE.LineBasicMaterial({
  color: 0xb9efff, transparent: true, opacity: 0, depthWrite: false,
});
const rebufoLineas = [];
for (let i = 0; i < 7; i++) {
  const lado = i % 2 ? 1 : -1;
  const y = 0.34 + (i % 3) * 0.22;
  const z = lado * (0.6 + Math.floor(i / 2) * 0.34);
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.55, y, z),
    new THREE.Vector3(-2.4 - (i % 3) * 0.45, y + (i % 2 ? 0.05 : -0.03), z + lado * 0.12),
  ]);
  const linea = new THREE.Line(geo, rebufoMat);
  rebufoFx.add(linea);
  rebufoLineas.push(linea);
}
const rebufoAnillo = new THREE.Mesh(
  new THREE.TorusGeometry(1.18, 0.025, 6, 20),
  new THREE.MeshBasicMaterial({ color: 0x8ee5ff, transparent: true, opacity: 0, depthWrite: false }),
);
rebufoAnillo.rotation.x = Math.PI / 2;
rebufoFx.add(rebufoAnillo);
rebufoFx.visible = false;
escena.add(rebufoFx);
let fovExtraRapido = 0;

// ── pista / física / modelo (se (re)crea al elegir vehículo) ────────────────
// La Chorrera es el tramo final del circuito existente; no se crea una pista
// alternativa. `?vista=chorrera` solo permite abrir el encuadre del gate.
const pista = construirPista({ chorrera: MUNDO_CHORRERA, mar: MUNDO_MAR });
if (MUNDO_MAR) iniciarCapaMar(THREE);

let vehSel = VEHICULOS[0];
let fisica = null;
let modelo = null;
let fauna = null;
let rivales = null;
let fisicaInvitado = null;
let vehiculoInvitado = VEHICULOS[0];
let pilotoInvitado = 'angelita';
let rescatesVistos = 0;
const modelosProx = new Map();
let estadoRed = {
  activo: false,
  rol: 'solo',
  codigo: '',
  conectado: false,
  peerConectado: false,
  listoLocal: false,
  listoPeer: false,
  ultimoError: '',
  ultimoMsg: '',
  miembros: 0,
};

function montarCoche() {
  if (modelo) { escena.remove(modelo.grupo); }
  const vehCarrera = escalarVehiculoCarrera(vehSel);
  const startParams = new URLSearchParams(location.search);
  const chorreraStart = startParams.get('chorreraStart') === '1';
  const gateF = Number(startParams.get('chorreraF'));
  // chorrera: el grid arranca unos metros más allá de la boca de salida del
  // túnel para que la cámara del countdown no quede debajo del arco.
  const f0 = chorreraStart
    ? (Number.isFinite(gateF) ? Math.min(0.999, Math.max(0, gateF)) : 0.205)
    : (MUNDO_CHORRERA ? 0.010 : 0.0);
  fisica = crearFisica(pista, vehCarrera, { totalLaps: 3, f0 });
  rescatesVistos = 0;
  modelo = construirModeloVehiculo(THREE, vehCarrera);
  if (MUNDO_MAR) {
    try { agregarFlotadores(THREE, modelo.grupo, vehCarrera); }
    catch (e) { console.warn('[flotadores] no montaron:', e.message); }
  }
  escena.add(modelo.grupo);
  if (rivales) escena.remove(rivales.grupo);
  if (fauna) escena.remove(fauna.grupo);
  rivales = crearRivales(THREE, pista, { escena, jugador: vehSel });
  for (const r of rivales.rivales ?? []) {
    const base = escalarVehiculoCarrera(r.veh);
    r.veh = base;
    r._velMaxBase = base.velMax;
    r._acelBase = base.acel;
    r._frenoBase = base.freno;
    r.rebufoCarga = 0;
    r.rebufoFuerza = 0;
    r.carril = r.carril * 0.82;
    r.vel *= VELOCIDAD_ESCALA;
    r.objetivo *= VELOCIDAD_ESCALA;
  }
  fauna = MUNDO_MAR ? null : crearFauna(THREE, pista, { escena });
  construirItemsPista();
  fisica.vel = 0;
  fisicaInvitado = null;
  fxToon.limpiar();
  poderesVfx.limpiar();
  carrera.golpes.length = 0;
  for (const entry of modelosProx.values()) {
    if (entry?.modelo?.grupo) escena.remove(entry.modelo.grupo);
  }
  modelosProx.clear();
  if (location.search.includes('debug')) {
    window.__fisica = fisica;
    window.__pista = pista;
    window.__carrera = carrera;
    window.__estado = estado;
    window.__red = red;
    window.__rivales = rivales;
    window.__fxToon = fxToon;
    // el canal de dirección analógico, para que una sonda pueda manejar de
    // verdad (con el gas siempre puesto, sin volante el kart se sale en la
    // primera curva y Lakitu lo devuelve a 0 km/h: no se mide ningún choque)
    window.__tilt = tilt;
    // casting de poderes bajo demanda, para sondas: elegir piloto y castear
    // en un instante conocido sin depender del menú ni del cooldown natural
    window.__poderesVfx = poderesVfx;
    window.__usarPoder = usarPoderJugador;
    window.__setPiloto = (id) => { if (PILOTO_POR_ID[id]) pilotoSeleccionado = id; };
    // Un choque no se prueba con una foto ni esperando a que pase solo: hay que
    // poder provocarlo en un instante conocido. Esto pone a un rival justo en la
    // trayectoria del jugador; de ahí en adelante choca la física de verdad, sin
    // atajos ni impactos falsos.
    window.__provocarChoque = (modo = 'frontal') => {
      const rs = rivales?.rivales ?? [];
      if (!rs.length || !fisica.info) return null;
      const lat = fisica.info.lat ?? 0;
      const fJug = fisica.info.f ?? 0;
      if (modo === 'lado') {
        const r = rs[1] ?? rs[0];
        r.f = (fJug + 0.0008 + 1) % 1;
        r.desvio = (lat - r.carril) + 2.6; // al lado, cerrándose encima
        r.desvioV = -9;
        r.vel = Math.max(6, Math.abs(fisica.vel));
        return { modo, rival: r.pilotoId };
      }
      const r = rs[0];
      r.f = (fJug + 5.2 / pista.L + 1) % 1; // 5.2 m adelante, mismo carril
      r.desvio = lat - r.carril;
      r.desvioV = 0;
      r.vel = 2.5;                           // frenado en seco: máximo cierre
      return { modo, rival: r.pilotoId, velJugador: fisica.vel };
    };
    // Sonda funcional: desplaza el kart al pasto y deja que el siguiente frame
    // recorra la detección y el rescate reales de fisica.js.
    window.__provocarRescate = () => {
      const base = pista.infoLocal(fisica.chkX, fisica.chkZ);
      const margen = (base?.w ?? 4) + 7;
      fisica.x = fisica.chkX - Math.sin(fisica.chkHdg) * margen;
      fisica.z = fisica.chkZ + Math.cos(fisica.chkHdg) * margen;
      fisica.y = pista.alturaMundo(fisica.x, fisica.z);
      fisica.vel = 0;
      fisica.velHdg = fisica.hdg = fisica.chkHdg;
      fisica.offroad.t = 0.74;
      return { x: fisica.x, z: fisica.z, margen };
    };
  }
}

function detectarRebufo(s) {
  if (!s || !rivales?.rivales?.length || !s.info) return { activo: false };
  let mejor = null;
  for (const r of rivales.rivales) {
    const st = r.estado;
    if (!st) continue;
    const fx = Math.cos(st.hdg), fz = Math.sin(st.hdg);
    const dx = s.x - st.x, dz = s.z - st.z;
    const atras = -(dx * fx + dz * fz);
    const lateral = Math.abs(dx * -fz + dz * fx);
    // Cono angosto: se abre solo 6 cm por metro, no permite activar el poder
    // desde una diagonal lejana.
    const ancho = 1.15 + atras * 0.06;
    if (atras >= 2.2 && atras <= 17.0 && lateral <= ancho) {
      if (!mejor || atras < mejor.atras) mejor = { rivalId: r.pilotoId, atras, lateral };
    }
  }
  return mejor ? { activo: true, rivalId: mejor.rivalId, atras: mejor.atras, lateral: mejor.lateral } : { activo: false };
}

function actualizarRebufoFx(s) {
  const r = s?.rebufo;
  const activo = !!(r?.activo && r.fuerza >= 0);
  rebufoFx.visible = activo;
  if (!activo) {
    rebufoMat.opacity = 0;
    rebufoAnillo.material.opacity = 0;
    return;
  }
  const carga = Math.max(0, Math.min(1, r.carga ?? 0));
  const fuerza = Math.max(0, Math.min(1, r.fuerza ?? 0));
  rebufoFx.position.set(s.x, s.y + 0.05, s.z);
  rebufoFx.rotation.y = s.hdg;
  rebufoFx.scale.setScalar(0.82 + carga * 0.28);
  rebufoMat.opacity = 0.18 + carga * 0.68;
  rebufoAnillo.material.opacity = 0.08 + fuerza * 0.42;
  rebufoAnillo.scale.set(1 + fuerza * 0.28, 1 + fuerza * 0.28, 1);
}

function actualizarCamaraRapida(dt, s) {
  // camara.js ya aporta FOV por velocidad; este segundo término hace que el
  // salto de 50 % también se lea en la persecución aunque el tope pase de 30.
  const ratio = Math.min(1.25, Math.abs(s.vel) / Math.max(1, s.vehVelMax ?? vehSel.velMax * VELOCIDAD_ESCALA));
  const objetivo = Math.max(0, ratio - 0.34) * 10 + (s.rebufo?.fuerza ?? 0) * 4;
  fovExtraRapido += (objetivo - fovExtraRapido) * (1 - Math.exp(-5.5 * Math.min(dt, 1 / 30)));
  camara.fov += fovExtraRapido;
  camara.updateProjectionMatrix();
}

function prepararRebufoRivales(dt, s) {
  const rs = rivales?.rivales ?? [];
  const pf = s.info?.f ?? 0;
  const plat = s.info?.lat ?? 0;
  for (const r of rs) {
    const aheadJugador = ((pf - r.f + 1) % 1) * pista.L;
    let activo = aheadJugador >= 2.2 && aheadJugador <= 17 && Math.abs((r.carril + (r.desvio ?? 0)) - plat) <= 1.8;
    for (const otro of rs) {
      if (otro === r) continue;
      const ahead = ((otro.f - r.f + 1) % 1) * pista.L;
      if (ahead >= 2.2 && ahead <= 17 && Math.abs((otro.carril + (otro.desvio ?? 0)) - (r.carril + (r.desvio ?? 0))) <= 1.8) {
        activo = true;
        break;
      }
    }
    r.rebufoCarga = activo ? Math.min(1, (r.rebufoCarga ?? 0) + dt) : 0;
    r.rebufoFuerza = Math.max(0, Math.min(1, ((r.rebufoCarga ?? 0) - 0.12) / 0.88));
    const fuerza = r.rebufoFuerza;
    r.veh.velMax = r._velMaxBase * (1 + fuerza * REBUFO_TECHO);
    r.veh.acel = r._acelBase * (1 + fuerza * 0.32);
    r.veh.freno = r._frenoBase;
  }
}

// ── modo de interacción: se reevalúa en caliente ────────────────────────────
// `cfg.movil` (config.js) sigue mandando sobre la CALIDAD y se congela al
// arrancar A PROPÓSITO: recalcular follaje, nubes y pixelRatio en mitad de una
// rotación sí produciría un tirón de verdad, y son cosas que no dependen de cómo
// esté puesto el aparato. Lo que sí depende va aparte y se revisa cada vez que
// cambian las condiciones:
//
//   · `tactil`   — ¿hay dedos? Decide los botones y el botón de inclinación.
//                  Criterio: CAPACIDAD TÁCTIL. Ni ancho de pantalla ni cadena de
//                  user-agent. Con el criterio viejo (`pointer:coarse` Y
//                  `max-width:900px` Y /mobi|android|iphone|ipad|tablet/) una
//                  tablet táctil de 1024×768 se quedaba sin un solo control en
//                  las DOS orientaciones — medido el 2026-08-08. Y una carrera se
//                  juega apaisada, que es justo donde se caía.
//   · `compacto` — ¿pantalla de teléfono? Decide encuadre de cámara y minimapa.
//                  Criterio: el LADO CORTO del viewport, que NO cambia al rotar.
//                  Medir por ancho era la trampa: un teléfono de 412×915 pasa a
//                  915 de ancho en apaisado y cruza cualquier umbral de 900,
//                  dando vuelta el modo en mitad de la curva.
const LADO_COMPACTO = 520;
const modo = { tactil: false, compacto: false };
const orientacion = {
  retrato: false,
  resetReloj: false,
  fullscreenIntentado: false,
};
const orientationGateEl = document.getElementById('orientationGate');

function detectarTactil() {
  const forzado = typeof location !== 'undefined'
    ? new URLSearchParams(location.search).get('tactil') : null;
  if (forzado === '1') return true;
  if (forzado === '0') return false;
  return (navigator.maxTouchPoints || 0) > 0
    || 'ontouchstart' in window
    || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
}
function detectarCompacto() {
  const corto = Math.min(innerWidth || 0, innerHeight || 0);
  return corto > 0 && corto <= LADO_COMPACTO;
}

function esRetrato() {
  const media = typeof matchMedia === 'function' && matchMedia('(orientation: portrait)').matches;
  const tipo = typeof screen !== 'undefined' && screen.orientation?.type;
  const screenPortrait = typeof tipo === 'string' && tipo.includes('portrait');
  return !!(media || screenPortrait || innerHeight > innerWidth);
}

function actualizarOrientacion() {
  const retrato = esRetrato();
  if (retrato === orientacion.retrato) {
    orientationGateEl?.classList.toggle('show', retrato);
    return;
  }
  orientacion.retrato = retrato;
  orientationGateEl?.classList.toggle('show', retrato);
  // Se limpian teclas y botones al pausar para que una pulsación sostenida no
  // reaparezca como acelerador o poder al volver a landscape.
  if (typeof limpiarEntradaFisica === 'function') limpiarEntradaFisica();
  if (!retrato) orientacion.resetReloj = true;
}

async function solicitarPantallaCompleta() {
  if (orientacion.fullscreenIntentado || document.fullscreenElement) return !!document.fullscreenElement;
  if (!document.documentElement.requestFullscreen) {
    orientacion.fullscreenIntentado = true;
    return false;
  }
  try {
    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // Un click sintético o una política del navegador puede rechazarlo. No se
    // marca como consumido: el primer toque real todavía puede concederlo.
    return false;
  }
  orientacion.fullscreenIntentado = !!document.fullscreenElement;
  try {
    await screen.orientation?.lock?.('landscape');
  } catch {
    // lock() exige fullscreen en varios navegadores; el listener de orientación
    // mantiene el fallback de pausa si el bloqueo no está disponible.
  }
  return !!document.fullscreenElement;
}

// ── entorno / cámara / fx / hud ─────────────────────────────────────────────
const ent = MUNDO_MAR
  ? crearEntornoMar(THREE, pista, {
    escena, renderer, camara, movil: cfg.movil, sombras: cfg.sombras, sombraRes: cfg.sombraRes,
  })
  : crearEntorno(THREE, pista, {
    escena, movil: cfg.movil, sombras: cfg.sombras, sombraRes: cfg.sombraRes,
    follaje: cfg.follaje, nubes: cfg.nubes,
  });
const obstaculos = MUNDO_MAR ? crearObstaculosMar(THREE, pista, { seed: 20260830 }) : null;
if (obstaculos) escena.add(obstaculos.grupo);
const GATE_CHORRERA = new URLSearchParams(location.search).get('vista') === 'chorrera';
const GATE_FREEZE = GATE_CHORRERA && new URLSearchParams(location.search).get('gateFreeze') === '1';
// gateReal=1: conserva el ENCUADRE y el freeze del gate pero con el look del
// juego real (exposición, sol y niebla de mundo=chorrera) — para capturas
// honestas del reencargo del dron.
const GATE_REAL = GATE_CHORRERA && new URLSearchParams(location.search).get('gateReal') === '1';
const EXPOSICION_BASE = GATE_CHORRERA && !GATE_REAL ? 0.82 : (MUNDO_CHORRERA ? 0.92 : 1.05);
if (GATE_CHORRERA) renderer.toneMappingExposure = EXPOSICION_BASE;
if (GATE_CHORRERA && !GATE_REAL) {
  ent.luzSol.intensity = 0.85;
  ent.sky.material.uniforms.sunPosition?.value.set(-0.2, -0.08, -1).normalize();
}
const cam = crearCamara(THREE, camara, { compacto: detectarCompacto() });
// ── portal New Donk del mundo chorrera: el reinicio de vuelta es un paso
// mágico 2D→3D (túnel Odyssey). El arco vive en la boca del túnel; el kart
// lo cruza, el mural 2D cubre, y reaparece en la meseta de la carpa.
const transicionND = MUNDO_CHORRERA && !GATE_CHORRERA ? crearTransicionNewDonk() : null;
const portalND = MUNDO_CHORRERA ? crearPortalChorrera(THREE, pista) : null;
if (portalND) escena.add(portalND.grupo);
const fx = crearFx(THREE, { escena });
const paramsEnt = new URLSearchParams(location.search);
const fraseEnt = paramsEnt.get('entPhrase') || undefined;
const seedEnt = Number(paramsEnt.get('entSeed')) || 20260811;
const entRescate = crearEntFrailejonRescatador(THREE, { escena, frase: fraseEnt, seed: seedEnt });
escena.add(entRescate.grupo);
const fxToon = crearFxToon(THREE, { escena, anisotropy: cfg.movil ? 1 : 4 });
const hud = crearHud({ el: document.getElementById('hud'), compacto: detectarCompacto() });
const itemsGrupo = new THREE.Group();
escena.add(itemsGrupo);
const hazardsGrupo = new THREE.Group();
escena.add(hazardsGrupo);
const hazardVisuales = new Map();

function actualizarHazardsVisuales(dt) {
  const vivos = new Set();
  for (const h of carrera.hazards) {
    if (h.tipo !== 'babas') continue;
    const key = h.id ?? `${h.x}:${h.z}:${h.t}`;
    vivos.add(key);
    let mesh = hazardVisuales.get(key);
    if (!mesh) {
      // reguero gooey dibujado (burbujas, brillo húmedo y contorno de tinta);
      // los clones comparten programa: el primero ya compiló en el precalentado
      const mat = poderesVfx.crearMaterialBabas((h.x * 7.13 + h.z * 3.7) % 10);
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 3;
      hazardsGrupo.add(mesh);
      hazardVisuales.set(key, mesh);
    }
    const hDir = Number.isFinite(h.hdg) ? h.hdg : fisica?.hdg ?? 0;
    const largo = h.largo ?? 7.5;
    mesh.position.set(
      h.x - Math.cos(hDir) * largo * 0.42,
      (h.y ?? fisica?.y ?? 0) + 0.045,
      h.z - Math.sin(hDir) * largo * 0.42,
    );
    mesh.rotation.y = hDir - Math.PI / 2;
    mesh.scale.set(h.ancho ?? 1.1, largo, 1);
    mesh.material.uniforms.uTime.value = fisica?.tiempo ?? 0;
    // el reguero se seca: pierde cuerpo en su último medio segundo de vida
    mesh.material.uniforms.uOpacidad.value = 0.85 * Math.min(1, h.t / 0.5);
  }
  for (const [key, mesh] of hazardVisuales) {
    if (vivos.has(key)) continue;
    hazardsGrupo.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    hazardVisuales.delete(key);
  }
}

// ── post: bloom suave + gradeo fílmico ──────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(escena, camara));
const SIN_POST = new URLSearchParams(location.search).get('post') === '0';
if (cfg.bloom && !SIN_POST) composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.22, 0.65, 0.85));
composer.addPass(new OutputPass());
const gradeo = new ShaderPass(ShaderGradeoFinal);
gradeo.uniforms.uTexel.value.set(1 / innerWidth, 1 / innerHeight);
if (!SIN_POST) composer.addPass(gradeo);

// ── casting de poderes: el arte de activar una habilidad ────────────────────
// Va después del gradeo porque los poderes de "estado" (miedo, noche, flash)
// son empujes sobre ese mismo pass; el resto son pools 3D dentro de la escena.
const poderesVfx = crearPoderesVfx(THREE, { escena, gradeo, fxToon });
// compila los shaders del pool ahora: el primer cast no puede tartamudear
poderesVfx.precalentar(renderer, camara);

// Reparte el modo entre sus tres consumidores. Antes `cfg.movil` se calculaba
// una vez y se repartía a la escena, la cámara y el HUD, y nadie volvía a
// preguntar: el único `resize` ajustaba aspecto, tamaño y el uniform de textura
// y NO reevaluaba el modo. Esta función sí, y es idempotente.
function aplicarModo(inicial = false) {
  const tactil = detectarTactil();
  const compacto = detectarCompacto();
  const cambio = inicial || tactil !== modo.tactil || compacto !== modo.compacto;
  modo.tactil = tactil;
  modo.compacto = compacto;
  if (cambio) {
    document.getElementById('controls')?.classList.toggle('visible', tactil);
    actualizarTiltBtn();
    cam.setModo(compacto); // interpolado en camara.js: cambiar de modo no corta
  }
  // Estas dos van siempre: dependen del TAMAÑO, no solo del modo.
  hud.reajustar(compacto);
  acomodarHud();
}

// Dos posiciones del HUD estaban clavadas en píxeles contra un minimapa y una
// franja de botones que ahora cambian de tamaño y de existencia:
//   · `#tiltBtn` en `top:128px` se montaba encima del minimapa de 272 px. No se
//     notaba porque en tablet el botón no aparecía NUNCA; ahora sí aparece.
//   · `#vel` y `#drift` viven abajo, en la misma franja que los botones táctiles:
//     el velocímetro quedaba detrás del botón de poder y la barra de derrape
//     detrás de las flechas. Se sube el HUD por encima de la franja, midiéndola
//     de verdad en vez de suponer su alto.
function acomodarHud() {
  if (tiltBtn && tiltBtn.style.display !== 'none') {
    const mini = document.getElementById('minimapa');
    const abajo = mini ? mini.getBoundingClientRect().bottom : 116;
    tiltBtn.style.top = `${Math.max(60, Math.round(abajo) + 12)}px`;
  }
  const franja = document.getElementById('controls');
  const alto = modo.tactil && franja
    ? Math.round(franja.getBoundingClientRect().height) + 18
    : 0;
  const vel = document.getElementById('vel');
  const drift = document.getElementById('drift');
  if (vel) vel.style.bottom = alto ? `${alto}px` : '';
  if (drift) drift.style.bottom = alto ? `${alto}px` : '';
}

let anchoAnt = 0;
let altoAnt = 0;
function redimensionar() {
  const w = innerWidth;
  const h = innerHeight;
  if (!(w > 0 && h > 0)) return;
  // `trasRotar` llama a esto cuatro veces a propósito; sin este corte serían
  // cuatro `setSize` y cuatro reasignaciones de buffers por rotación.
  if (w === anchoAnt && h === altoAnt) { aplicarModo(); return; }
  anchoAnt = w; altoAnt = h;
  camara.aspect = w / h;
  camara.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  gradeo.uniforms.uTexel.value.set(1 / w, 1 / h);
  // DESPUÉS de fijar el aspecto: reparte el cambio de encuadre en el tiempo en
  // vez de soltarlo en un cuadro. Ver el comentario largo en camara.js.
  cam.reencuadrar();
  aplicarModo();
}

// `orientationchange` puede llegar ANTES de que innerWidth/innerHeight cambien
// (en iOS llega antes casi siempre). Reajustar una sola vez ahí deja la
// proyección con las medidas viejas hasta el siguiente `resize`, que puede no
// venir nunca. Por eso se reajusta también en los dos cuadros siguientes y otra
// vez a los 300 ms: `redimensionar` es idempotente y cuando el tamaño no cambió
// no hace nada visible.
function trasRotar() {
  redimensionar();
  requestAnimationFrame(() => { redimensionar(); requestAnimationFrame(redimensionar); });
  setTimeout(redimensionar, 300);
  setTimeout(recalibrarInclinacion, 60);
}

addEventListener('resize', redimensionar);
addEventListener('orientationchange', trasRotar);
if (typeof screen !== 'undefined' && screen.orientation?.addEventListener) {
  screen.orientation.addEventListener('change', trasRotar);
}
if (typeof visualViewport !== 'undefined' && visualViewport?.addEventListener) {
  visualViewport.addEventListener('resize', redimensionar);
}
// Una tablet que se desacopla del teclado gana dedos sin cambiar de tamaño.
if (typeof matchMedia === 'function') {
  matchMedia('(pointer: coarse)').addEventListener?.('change', () => aplicarModo());
}
addEventListener('pointerdown', () => { solicitarPantallaCompleta(); }, { passive: true });
addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) Promise.resolve(screen.orientation?.lock?.('landscape')).catch(() => {});
  redimensionar();
});
if (typeof matchMedia === 'function') {
  matchMedia('(orientation: portrait)').addEventListener?.('change', actualizarOrientacion);
}

// ── input ───────────────────────────────────────────────────────────────────
const teclas = Object.create(null);
function limpiarEntradaFisica() {
  for (const k of Object.keys(teclas)) teclas[k] = false;
  for (const k of Object.keys(tInput)) tInput[k] = false;
  document.querySelectorAll('.down').forEach((b) => b.classList.remove('down'));
}
addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Shift'].includes(e.code)) e.preventDefault();
  teclas[e.code] = true;
});
addEventListener('keyup', (e) => { teclas[e.code] = false; });
addEventListener('blur', limpiarEntradaFisica);
addEventListener('visibilitychange', () => { if (document.hidden) limpiarEntradaFisica(); });

const tilt = {
  disponible: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
  activo: false,
  deseado: false,
  pendienteCalib: false,
  listo: false,
  centerGamma: 0,   // centro del VOLANTE ya proyectado a la pantalla
  rawGamma: 0,      // volante crudo (el nombre queda: `__tilt` lo usan sondas)
  steer: 0,
  target: 0,
  angPantalla: 0,
};

// ── EL «180 GRADOS» QUE REPORTÓ EL OPERADOR ─────────────────────────────────
// `evt.gamma` y `evt.beta` vienen en el marco del APARATO, no en el de la
// pantalla. En retrato el gesto de volante (girar el aparato en el plano de la
// pantalla) se lee en gamma; al pasar a apaisado ese mismo gesto pasa a leerse
// en beta, y entre los dos apaisados —90° y 270°, exactamente 180° de
// diferencia— cambia de SIGNO. La dirección se invertía sola.
//
// Medido con el mismo gesto físico en las cuatro orientaciones, antes de esto:
//   retrato -0,264 · apaisado 90° 0,000 · apaisado 270° 0,000 · retrato 180° +0,264
// O sea: en apaisado —la orientación en la que se juega una carrera— el volante
// no respondía en absoluto, y al dar media vuelta se manejaba al revés.
//
// La proyección al marco de la pantalla es la de siempre, con θ el ángulo que
// declara la pantalla:  volante = gamma·cos θ + beta·sin θ
function anguloPantalla() {
  const a = (typeof screen !== 'undefined' && Number.isFinite(screen.orientation?.angle))
    ? screen.orientation.angle
    : (typeof window.orientation === 'number' ? window.orientation : 0);
  return ((a % 360) + 360) % 360;
}
function volanteDe(beta, gamma) {
  const th = anguloPantalla() * Math.PI / 180;
  return gamma * Math.cos(th) + beta * Math.sin(th);
}
// Al rotar, el agarre es otro: el centro viejo mandaría el volante a fondo en el
// primer cuadro. Se pide recalibrar y el próximo evento fija el centro nuevo.
function recalibrarInclinacion() {
  tilt.angPantalla = anguloPantalla();
  if (!tilt.activo) return;
  tilt.pendienteCalib = true;
  tilt.target = 0;
  tilt.steer = 0;
}
const tiltBtn = document.getElementById('tiltBtn');
const tiltPref = typeof localStorage !== 'undefined' && localStorage.getItem('chagraTilt') === '1';
tilt.deseado = !!tiltPref;

function actualizarTiltBtn() {
  if (!tiltBtn) return;
  tiltBtn.textContent = tilt.activo ? 'Inclinación ON' : 'Usar inclinación';
  tiltBtn.setAttribute('aria-pressed', tilt.activo ? 'true' : 'false');
  // Criterio: hay dedos. Antes era `cfg.movil`, congelado al arrancar y con el
  // umbral de 900 px adentro, así que en una tablet no aparecía nunca.
  tiltBtn.style.display = modo.tactil && tilt.disponible ? 'grid' : 'none';
  acomodarHud();
}

function calibrarTilt() {
  if (!tilt.listo) {
    tilt.pendienteCalib = true;
    return;
  }
  tilt.centerGamma = tilt.rawGamma;
  tilt.pendienteCalib = false;
  tilt.steer = 0;
}

function procesarTilt(evt) {
  if (!tilt.activo) return;
  const beta = Number.isFinite(evt.beta) ? evt.beta : null;
  const gamma = Number.isFinite(evt.gamma) ? evt.gamma : null;
  if (beta === null && gamma === null) return;
  // Si la pantalla giró y el evento llegó antes que nuestro `orientationchange`,
  // aquí nos enteramos igual: comparamos contra el ángulo con el que calibramos.
  const ang = anguloPantalla();
  if (ang !== tilt.angPantalla) {
    tilt.angPantalla = ang;
    tilt.pendienteCalib = true;
  }
  const g = volanteDe(beta ?? 0, gamma ?? 0);
  tilt.rawGamma = g;
  tilt.listo = true;
  if (tilt.pendienteCalib) calibrarTilt();
  const rango = 30;
  const dead = 0.08;
  let x = -(g - tilt.centerGamma) / rango;
  const sign = Math.sign(x);
  const mag = Math.abs(x);
  if (mag <= dead) x = 0;
  else x = sign * Math.pow((mag - dead) / (1 - dead), 1.7);
  tilt.target = Math.max(-1, Math.min(1, x));
}

async function setTiltActivo(on) {
  if (!tilt.disponible) return false;
  if (on === tilt.activo) return tilt.activo;

  if (on) {
    let ok = true;
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        ok = perm === 'granted';
      } catch {
        ok = false;
      }
    }
    if (!ok) {
      tilt.activo = false;
      tilt.deseado = false;
      if (typeof localStorage !== 'undefined') localStorage.setItem('chagraTilt', '0');
      actualizarTiltBtn();
      return false;
    }
    window.addEventListener('deviceorientation', procesarTilt, true);
    tilt.activo = true;
    tilt.deseado = true;
    tilt.pendienteCalib = true;
    tilt.angPantalla = anguloPantalla();
    if (tilt.listo) calibrarTilt();
    if (typeof localStorage !== 'undefined') localStorage.setItem('chagraTilt', '1');
  } else {
    window.removeEventListener('deviceorientation', procesarTilt, true);
    tilt.activo = false;
    tilt.deseado = false;
    if (typeof localStorage !== 'undefined') localStorage.setItem('chagraTilt', '0');
  }
  actualizarTiltBtn();
  return tilt.activo;
}

if (tiltBtn) {
  tiltBtn.addEventListener('click', async () => {
    initAudio();
    const nuevo = !tilt.activo;
    const ok = await setTiltActivo(nuevo);
    if (!ok) sfx('ui');
    else {
      calibrarTilt();
      sfx('ui');
    }
  });
}
actualizarTiltBtn();

function estadoEntrada() {
  const izq = !!(teclas.ArrowLeft || teclas.KeyA);
  const der = !!(teclas.ArrowRight || teclas.KeyD);
  const freno = !!(teclas.ArrowDown || teclas.KeyS);
  const gas = !freno && estado.corriendo;
  const derrapar = !!teclas.Space;
  const saltar = !!(teclas.Shift || teclas.KeyX);
  const poder = !!(teclas.KeyC || teclas.KeyV);
  const giroTeclas = (izq ? 1 : 0) - (der ? 1 : 0);
  const giroTilt = tilt.activo ? tilt.steer : 0;
  return {
    gas, freno, izq, der, derrapar, saltar, poder,
    giro: Math.max(-1, Math.min(1, giroTeclas + giroTilt)),
  };
}

// botones táctiles
const tInput = { izq: false, der: false, derrapar: false, saltar: false, poder: false };
let netOpenBtn = null;
let netSetupEl = null;
let createRoomBtn = null;
let joinCodeInput = null;
let joinRoomBtn = null;
let netBackBtn = null;
let roomCardEl = null;
let roomCodeEl = null;
let roomStatusEl = null;
let roomMembersEl = null;
let readyBtn = null;
let hostStartBtn = null;
let red = null;
let redCountdownDisparado = false;
function bindBtn(id, k) {
  const b = document.getElementById(id);
  if (!b) return;
  const soltar = () => { tInput[k] = false; b.classList.remove('down'); };
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    b.setPointerCapture?.(e.pointerId);
    tInput[k] = true;
    b.classList.add('down');
  });
  b.addEventListener('pointerup', soltar);
  b.addEventListener('pointercancel', soltar);
  b.addEventListener('lostpointercapture', soltar);
}
bindBtn('leftBtn', 'izq');
bindBtn('rightBtn', 'der');
bindBtn('driftBtn', 'derrapar');
bindBtn('jumpBtn', 'saltar');
bindBtn('powerBtn', 'poder');
actualizarOrientacion();
// Primer reparto del modo. De aquí en adelante lo mantienen `redimensionar`,
// `orientationchange` y el listener de `pointer: coarse` — ya no es una decisión
// de una sola vez al arrancar.
aplicarModo(true);

const btnMute = document.getElementById('muteBtn');
if (btnMute) {
  btnMute.addEventListener('click', () => {
    initAudio();
    const m = toggleMute();
    btnMute.textContent = m ? '🔇' : '🔊';
    sfx('ui');
  });
}
if (netOpenBtn) {
  netOpenBtn.addEventListener('click', () => {
    initAudio(); sfx('ui');
    if (netSetupEl) netSetupEl.classList.add('show');
    if (roomCardEl) roomCardEl.classList.remove('show');
    if (netOpenBtn) netOpenBtn.style.display = 'none';
  });
}
if (netBackBtn) {
  netBackBtn.addEventListener('click', () => {
    initAudio(); sfx('ui');
    red?.cerrar();
    redCountdownDisparado = false;
    actualizarPanelRed({ activo: false, rol: 'solo', codigo: '', conectado: false, peerConectado: false, listoLocal: false, listoPeer: false, ultimoError: '', ultimoMsg: '', miembros: 0 });
  });
}
if (createRoomBtn) {
  createRoomBtn.addEventListener('click', () => {
    initAudio(); sfx('ui');
    redCountdownDisparado = false;
    vehSel = { ...VEHICULOS[seleccion], piloto: pilotoSeleccionado };
    montarCoche();
    red?.crearSala(AUTO_ROOM || '');
    red?.setMeta({ piloto: pilotoSeleccionado, vehiculo: VEHICULOS[seleccion].id, ready: false });
    actualizarPanelRed({ activo: true, rol: 'host', listoLocal: false, ultimoMsg: 'Sala creada. Comparte el código.' });
  });
}
if (joinRoomBtn) {
  joinRoomBtn.addEventListener('click', () => {
    initAudio(); sfx('ui');
    redCountdownDisparado = false;
    vehSel = { ...VEHICULOS[seleccion], piloto: pilotoSeleccionado };
    montarCoche();
    const ok = red?.unirse(joinCodeInput?.value || '');
    if (ok) {
      red?.setMeta({ piloto: pilotoSeleccionado, vehiculo: VEHICULOS[seleccion].id, ready: false });
      actualizarPanelRed({ activo: true, rol: 'guest', listoLocal: false, ultimoMsg: 'Entrando a la sala.' });
    }
  });
}
if (readyBtn) {
  readyBtn.addEventListener('click', () => {
    initAudio(); sfx('ui');
    const next = !estadoRed.listoLocal;
    red?.setListo(next);
    actualizarPanelRed({ listoLocal: next, ultimoMsg: next ? 'Listo.' : 'Aún no listo.' });
  });
}
if (hostStartBtn) {
  hostStartBtn.addEventListener('click', () => {
    initAudio(); sfx('ui');
    if (estadoRed.rol === 'host' && estadoRed.peerConectado && estadoRed.listoLocal && estadoRed.listoPeer) {
      iniciarCountdown();
    } else if (estadoRed.rol === 'host') {
      hud.mensaje('Falta que el otro aparato esté listo.', 1700);
    }
  });
}

// ── selección de vehículo + intro ───────────────────────────────────────────
const chipsEl = document.getElementById('chips');
const pilotsEl = document.getElementById('pilots');
const seedCounterEl = document.getElementById('seedCounter');
const seedKey = 'chagra-kart.semillas';
let semillasTotales = 0;
try {
  semillasTotales = Number(localStorage.getItem(seedKey) || 0) || 0;
} catch {
  semillasTotales = 0;
}
if (seedCounterEl) seedCounterEl.textContent = `Semillas nativas: ${semillasTotales}`;
let seleccion = 0;
function pilotoInicialDesdeCompai() {
  const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  const desdeLanzamiento = params?.get('avatarType') || params?.get('compai') || params?.get('guia');
  const directo = pilotoDesdeCompai(desdeLanzamiento);
  if (directo) return directo;

  try {
    const elegido = pilotoDesdeCompai(leerCompanero());
    if (elegido) return elegido;
  } catch {
    // El juego sigue pudiendo arrancar en modo privado o con storage bloqueado.
  }
  return 'angelita';
}
let pilotoSeleccionado = pilotoInicialDesdeCompai();
// QA de poderes (solo con ?poderDemo=<pilotoId>): fija el piloto y castea su
// poder cada pocos segundos ya corriendo. Existe para que el gate visual pueda
// fotografiar un casting en un instante conocido; no afecta el juego normal.
const QA_PODER = typeof location !== 'undefined'
  ? new URLSearchParams(location.search).get('poderDemo') : null;
if (QA_PODER && PILOTO_POR_ID[QA_PODER]) pilotoSeleccionado = QA_PODER;
// ciclo de 3 s con poderes de ~2.4 s: una captura con espera fija cae casi
// siempre en pleno casting, que es lo que el gate necesita fotografiar
let qaPoderT = 1.5;
VEHICULOS.forEach((v, i) => {
  const c = document.createElement('button');
  c.className = 'chip' + (i === 0 ? ' selected' : '');
  c.type = 'button';
  c.innerHTML = `<div class="t">${v.nombre}</div>
    <div class="d">${v.eslogan}</div>
    <div class="stats"><span>Vel <b>${Math.round(v.velMax * VELOCIDAD_ESCALA * 3.6)}</b> km/h</span><span>Acel <b>${(v.acel * VELOCIDAD_ESCALA).toFixed(1)}</b></span><span>Agarre <b>${v.agarre}</b></span></div>`;
  c.addEventListener('click', () => {
    initAudio(); sfx('ui');
    chipsEl.querySelectorAll('.chip').forEach((x, j) => x.classList.toggle('selected', j === i));
    seleccion = i;
    if (estadoRed.rol !== 'solo') red?.setMeta({ piloto: pilotoSeleccionado, vehiculo: VEHICULOS[seleccion].id, ready: estadoRed.listoLocal });
  });
  chipsEl.appendChild(c);
});

PILOTOS.forEach((p, i) => {
  if (!pilotsEl) return;
  const habilitado = pilotoDesbloqueado(p.id, semillasTotales);
  const c = document.createElement('button');
  c.className = 'chip' + (p.id === pilotoSeleccionado ? ' selected' : '') + (habilitado ? '' : ' locked');
  c.type = 'button';
  c.disabled = !habilitado;
  c.innerHTML = `<div class="t">${p.nombre}</div>
    <div class="d">${p.poder}${p.cientifico ? ` · ${p.cientifico}` : ''}</div>
    <div class="stats"><span>${habilitado ? 'Desbloqueado' : `Cuesta ${p.costoSemillas}`}</span><span>${p.especie}</span></div>`;
  c.addEventListener('click', () => {
    initAudio(); sfx('ui');
    pilotsEl.querySelectorAll('.chip').forEach((x) => x.classList.remove('selected'));
    c.classList.add('selected');
    pilotoSeleccionado = p.id;
    if (estadoRed.rol !== 'solo') red?.setMeta({ piloto: pilotoSeleccionado, vehiculo: VEHICULOS[seleccion].id, ready: estadoRed.listoLocal });
  });
  pilotsEl.appendChild(c);
});

const introEl = document.getElementById('intro');
const resultEl = document.getElementById('result');
netOpenBtn = document.getElementById('netOpenBtn');
netSetupEl = document.getElementById('netSetup');
createRoomBtn = document.getElementById('createRoomBtn');
joinCodeInput = document.getElementById('joinCodeInput');
joinRoomBtn = document.getElementById('joinRoomBtn');
netBackBtn = document.getElementById('netBackBtn');
roomCardEl = document.getElementById('roomCard');
roomCodeEl = document.getElementById('roomCode');
roomStatusEl = document.getElementById('roomStatus');
roomMembersEl = document.getElementById('roomMembers');
readyBtn = document.getElementById('readyBtn');
hostStartBtn = document.getElementById('hostStartBtn');
if (netOpenBtn) {
  netOpenBtn.addEventListener('click', () => {
    initAudio(); sfx('ui');
    if (netSetupEl) netSetupEl.classList.add('show');
    if (roomCardEl) roomCardEl.classList.remove('show');
    if (netOpenBtn) netOpenBtn.style.display = 'none';
  });
}
if (netBackBtn) {
  netBackBtn.addEventListener('click', () => {
    initAudio(); sfx('ui');
    red?.cerrar();
    redCountdownDisparado = false;
    actualizarPanelRed({ activo: false, rol: 'solo', codigo: '', conectado: false, peerConectado: false, listoLocal: false, listoPeer: false, ultimoError: '', ultimoMsg: '', miembros: 0 });
  });
}
if (createRoomBtn) {
  createRoomBtn.addEventListener('click', () => {
    initAudio(); sfx('ui');
    redCountdownDisparado = false;
    vehSel = { ...VEHICULOS[seleccion], piloto: pilotoSeleccionado };
    montarCoche();
    red?.crearSala(AUTO_ROOM || '');
    red?.setMeta({ piloto: pilotoSeleccionado, vehiculo: VEHICULOS[seleccion].id, ready: false });
    actualizarPanelRed({ activo: true, rol: 'host', listoLocal: false, ultimoMsg: 'Sala creada. Comparte el código.' });
  });
}
if (joinRoomBtn) {
  joinRoomBtn.addEventListener('click', () => {
    initAudio(); sfx('ui');
    redCountdownDisparado = false;
    vehSel = { ...VEHICULOS[seleccion], piloto: pilotoSeleccionado };
    montarCoche();
    const ok = red?.unirse(joinCodeInput?.value || '');
    if (ok) {
      red?.setMeta({ piloto: pilotoSeleccionado, vehiculo: VEHICULOS[seleccion].id, ready: false });
      actualizarPanelRed({ activo: true, rol: 'guest', listoLocal: false, ultimoMsg: 'Entrando a la sala.' });
    }
  });
}
if (readyBtn) {
  readyBtn.addEventListener('click', () => {
    initAudio(); sfx('ui');
    const next = !estadoRed.listoLocal;
    red?.setListo(next);
    actualizarPanelRed({ listoLocal: next, ultimoMsg: next ? 'Listo.' : 'Aún no listo.' });
  });
}
if (hostStartBtn) {
  hostStartBtn.addEventListener('click', () => {
    initAudio(); sfx('ui');
    if (estadoRed.rol === 'host' && estadoRed.peerConectado && estadoRed.listoLocal && estadoRed.listoPeer) {
      iniciarCountdown();
    } else if (estadoRed.rol === 'host') {
      hud.mensaje('Falta que el otro aparato esté listo.', 1700);
    }
  });
}
const AUTO_START = typeof location !== 'undefined'
  && new URLSearchParams(location.search).get('autoStart') === '1';
const AUTO_NET = typeof location !== 'undefined'
  ? new URLSearchParams(location.search).get('autoNet')
  : null;
const AUTO_ROOM = typeof location !== 'undefined'
  ? new URLSearchParams(location.search).get('room')
  : '';
function actualizarPanelRed(estado) {
  estadoRed = { ...estadoRed, ...estado };
  if (roomCardEl) roomCardEl.classList.toggle('show', estadoRed.activo && estadoRed.rol !== 'solo');
  const startBtnEl = document.getElementById('startBtn');
  if (roomCodeEl) roomCodeEl.textContent = estadoRed.codigo || '----';
  if (roomStatusEl) {
    const rol = estadoRed.rol === 'host' ? 'Anfitrión' : estadoRed.rol === 'guest' ? 'Invitado' : 'Solitario';
    const conectado = estadoRed.conectado ? 'conectado' : 'desconectado';
    roomStatusEl.innerHTML = `<strong>${rol}</strong> ${conectado}. ${estadoRed.ultimoMsg || estadoRed.ultimoError || ''}`;
  }
  if (roomMembersEl) {
    const peer = estadoRed.peerConectado ? 'sí' : 'no';
    roomMembersEl.innerHTML = `Sala viva: <strong>${estadoRed.miembros || (estadoRed.conectado ? 1 : 0)}</strong> · otro aparato: <strong>${peer}</strong>`;
  }
  if (readyBtn) {
    readyBtn.textContent = estadoRed.listoLocal ? 'No listo' : 'Listo';
    readyBtn.style.display = estadoRed.activo && estadoRed.rol !== 'solo' ? 'inline-grid' : 'none';
  }
  if (hostStartBtn) {
    hostStartBtn.style.display = estadoRed.rol === 'host' ? 'inline-grid' : 'none';
    hostStartBtn.disabled = !(estadoRed.peerConectado && estadoRed.listoLocal && estadoRed.listoPeer);
  }
  if (estadoRed.rol !== 'host') redCountdownDisparado = false;
  if (estadoRed.rol === 'host' && estadoRed.peerConectado && estadoRed.listoLocal && estadoRed.listoPeer && !estado.corriendo && !estado.fin && !redCountdownDisparado) {
    redCountdownDisparado = true;
    iniciarCountdown();
  }
  if (netOpenBtn) netOpenBtn.style.display = estadoRed.activo ? 'none' : 'inline-grid';
  if (netSetupEl) netSetupEl.classList.toggle('show', estadoRed.activo);
  if (startBtnEl) startBtnEl.style.display = estadoRed.activo ? 'none' : 'inline-grid';
}
red = crearMultijugador({ onStatus: actualizarPanelRed });
if (typeof location !== 'undefined' && location.search.includes('debug')) window.__red = red;
document.getElementById('startBtn').addEventListener('click', async () => {
  if (estadoRed.rol !== 'solo') {
    if (estadoRed.rol === 'host') {
      if (!estadoRed.listoLocal) {
        red.setListo(true);
        return;
      }
      if (!estadoRed.peerConectado || !estadoRed.listoPeer) {
        hud.mensaje('Falta quien entre y se ponga listo.', 1600);
        return;
      }
      iniciarCountdown();
      return;
    }
    if (estadoRed.rol === 'guest') {
      red.setListo(!estadoRed.listoLocal);
      return;
    }
  }
  initAudio();
  await solicitarPantallaCompleta();
  vehSel = { ...VEHICULOS[seleccion], piloto: pilotoSeleccionado };
  carrera.vehiculoId = vehSel.id;
  carrera.pilotoId = pilotoSeleccionado;
  carrera.eventos.length = 0;
  carrera.hazards.length = 0;
  carrera.efectosJugador.length = 0;
  carrera.oscuridad = 0;
  estado.poderCooldown = 0;
  estado._poderLatch = false;
  montarCoche();
  if (tilt.deseado && !tilt.activo) {
    await setTiltActivo(true);
    if (tilt.activo) calibrarTilt();
  }
  introEl.classList.add('hidden');
  setTimeout(() => { introEl.style.display = 'none'; }, 500);
  iniciarCountdown();
});
document.getElementById('againBtn').addEventListener('click', () => location.reload());
if (AUTO_START) {
  queueMicrotask(() => document.getElementById('startBtn')?.click());
}
if (AUTO_NET === 'host') {
  queueMicrotask(() => {
    netOpenBtn?.click();
    if (AUTO_ROOM && joinCodeInput) joinCodeInput.value = AUTO_ROOM;
    createRoomBtn?.click();
    readyBtn?.click();
  });
}
if (AUTO_NET === 'guest') {
  queueMicrotask(() => {
    netOpenBtn?.click();
    if (AUTO_ROOM && joinCodeInput) joinCodeInput.value = AUTO_ROOM;
    joinRoomBtn?.click();
    readyBtn?.click();
  });
}

// ── estado de partida ───────────────────────────────────────────────────────
const estado = {
  corriendo: false,   // true tras el "¡YA!"
  fin: false,
  countdownT: 3,
  salidaT: 0,
  salidaBoostPendiente: false,
  lapInicio: 0,
  mejorVuelta: Infinity,
  vmax: 0,
  nivelAnt: 0,
  turboAnt: false,
  poderCooldown: 0,
  _poderLatch: false,
  msgCola: null,
};

const carrera = {
  semillas: semillasTotales,
  pilotoId: pilotoSeleccionado,
  vehiculoId: VEHICULOS[0].id,
  eventos: [],
  items: [],
  hazards: [],
  karts: [],
  golpes: [],
  efectosJugador: [],
  efectosRivales: [],
  oscuridad: 0,
};

function guardarSemillas() {
  try { localStorage.setItem(seedKey, String(carrera.semillas)); } catch {}
  if (seedCounterEl) seedCounterEl.textContent = `Semillas nativas: ${carrera.semillas}`;
}

function copiarFisica(dst, src) {
  if (!dst || !src) return dst;
  const claves = [
    'x', 'y', 'z', 'hdg', 'velHdg', 'vel', 'vy', 'onGround', 'roll', 'pitch',
    'vehId', 'totalLaps', 'laps', 'acum', 'lastF', 'fMax', 'tiempo', 'tVuelta',
    'fin', 'fCheck', 'chkX', 'chkZ', 'chkHdg', 'slip', 'info', 'rebufo',
    'aterrizo', 'respawn', 'vueltaCompletada', 'termino', 'susto',
    'rescateSeq', 'atontado', 'tambaleo', 'rescateDestino',
  ];
  for (const k of claves) {
    if (src[k] !== undefined) dst[k] = src[k];
  }
  if (src.drift) dst.drift = JSON.parse(JSON.stringify(src.drift));
  if (src.rebufo) dst.rebufo = JSON.parse(JSON.stringify(src.rebufo));
  if (src.turbo) dst.turbo = JSON.parse(JSON.stringify(src.turbo));
  if (src.offroad) dst.offroad = JSON.parse(JSON.stringify(src.offroad));
  if (src._yaw) dst._yaw = JSON.parse(JSON.stringify(src._yaw));
  return dst;
}

function kartKey(k) {
  return k?.id || `${k?.piloto || 'piloto'}-${k?.vehiculo || 'vehiculo'}`;
}

function asegurarProxyKart(k, dt) {
  if (!k) return;
  const id = kartKey(k);
  const veh = VEHICULOS.find((v) => v.id === k.vehiculo) || VEHICULOS[0];
  let entry = modelosProx.get(id);
  if (!entry || entry.vehiculoId !== veh.id || entry.pilotoId !== (k.piloto || '')) {
    if (entry?.modelo?.grupo) escena.remove(entry.modelo.grupo);
    const vehProxy = { ...veh, piloto: k.piloto || veh.piloto || 'angelita' };
    const modeloKart = construirModeloVehiculo(THREE, vehProxy);
    if (MUNDO_MAR) {
      try { agregarFlotadores(THREE, modeloKart.grupo, vehProxy); }
      catch (e) { console.warn('[flotadores] no montaron:', e.message); }
    }
    escena.add(modeloKart.grupo);
    entry = { modelo: modeloKart, vehiculoId: veh.id, pilotoId: k.piloto || '', ultimo: performance.now() };
    modelosProx.set(id, entry);
  }
  entry.ultimo = performance.now();
  entry.modelo.actualizar(dt, k);
  entry.modelo.grupo.visible = true;
}

function limpiarProxies(keep) {
  for (const [id, entry] of modelosProx.entries()) {
    if (keep.has(id)) continue;
    if (entry?.modelo?.grupo) escena.remove(entry.modelo.grupo);
    modelosProx.delete(id);
  }
}

function sincronizarInvitadoDesdeMeta(meta) {
  if (!meta) return;
  const veh = VEHICULOS.find((v) => v.id === meta.vehiculo) || VEHICULOS[0];
  const piloto = meta.piloto || veh.piloto || 'angelita';
  if (vehiculoInvitado?.id === veh.id && pilotoInvitado === piloto && fisicaInvitado) return;
  vehiculoInvitado = escalarVehiculoCarrera({ ...veh, piloto });
  pilotoInvitado = piloto;
  fisicaInvitado = crearFisica(pista, vehiculoInvitado, { totalLaps: 3, f0: 0.03 });
  fisicaInvitado.vel = 0;
}

// ── choques ─────────────────────────────────────────────────────────────────
// Se resuelven en el HOST y solo en el host: `colision.js` es determinista y el
// host ya manda posiciones de todos los karts, así que la resolución no se
// duplica ni se discute. Los invitados no recalculan nada; reciben posiciones y
// una lista de eventos de impacto para disparar el MISMO VFX en el MISMO lugar.
const sacJugador = crearSacudon();
const sacInvitado = crearSacudon();
const anclaJugador = { x: 0, y: 0, z: 0 };
const anclaInvitado = { x: 0, y: 0, z: 0 };
let golpeSeq = 0;
let ultGolpeVisto = -1;
let ultRoce = -9;

// Reparte la preferencia de movimiento reducido a los consumidores. `cam` y los
// sacudones ya existen aquí; si cambia en caliente, se vuelve a repartir.
function propagarReducedMotion(v) {
  reducedMotion = v;
  if (cam?.setReducedMotion) cam.setReducedMotion(v);
  setReducedMotionSacudon(v);
  window.__reducedMotion = v;
}
propagarReducedMotion(reducedMotion);
const rmQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
if (rmQuery?.addEventListener) {
  rmQuery.addEventListener('change', () => propagarReducedMotion(rmQuery.matches));
}

function cuerpoKart(s, veh, id, tipo) {
  const f = formaDe(veh);
  return {
    id, tipo, s, veh,
    x: s.x, z: s.z, y: s.y, hdg: s.hdg,
    vx: Math.cos(s.velHdg ?? s.hdg) * s.vel,
    vz: Math.sin(s.velHdg ?? s.hdg) * s.vel,
    masa: veh.masa ?? 1, hl: f.hl, hw: f.hw,
  };
}

// El impulso de un rival no puede moverlo libremente: va sobre riel. Se traduce
// a las dos únicas libertades que tiene —avance y desvío del carril— y así el
// golpe se ve (sale despedido, se inclina, vuelve a la línea) sin inventarle
// una IA nueva ni romper el determinismo del host.
function impulsoARival(c, ev, esA) {
  const r = c.rival;
  const dvx = c.vx - c.vx0, dvz = c.vz - c.vz0;
  const fx = Math.cos(c.hdg), fz = Math.sin(c.hdg);
  r.empujeF += (dvx * fx + dvz * fz) * 0.5;
  r.desvioV += dvx * -fz + dvz * fx;
  // el carril del rival es perpendicular al rumbo de pista: la separación
  // posicional es, literalmente, desvío de carril.
  r.desvio += (c.x - c.x0) * -fz + (c.z - c.z0) * fx;
  const mag = Math.max(0, Math.min(1.35, ev.vn / AJUSTE.vnFuerte));
  r.susto = Math.max(r.susto, ev.roce ? mag * 0.3 : Math.min(1, 0.4 + mag * 0.8));
  r.sac.golpear(ev.nx * (esA ? 1 : -1), ev.nz * (esA ? 1 : -1), c.hdg, mag);
  return mag;
}

function emitirGolpe(ev, mag, ancla, alto) {
  const y = (ev.y ?? 0) + 0.35;
  fxToon.golpe(ev.x, y, ev.z, ev.nx, ev.nz, mag, { roce: ev.roce, ancla, alto });
  // se registra SIEMPRE, no solo de host: en red es lo que viaja al invitado, y
  // en un jugador es el rastro con el que la sonda verifica que el golpe ocurrió
  // (si solo existiera en modo host, el gate estaría midiendo al lado).
  carrera.golpes.push({
    n: golpeSeq++, x: ev.x, y, z: ev.z, nx: ev.nx, nz: ev.nz,
    mag, roce: !!ev.roce, ancla: ancla === anclaJugador ? 'player' : ancla === anclaInvitado ? 'guest' : '',
  });
}

function resolverChoques() {
  const cuerpos = [];
  cuerpos.push(cuerpoKart(fisica, vehSel, 'player', 'kart'));
  if (fisicaInvitado) cuerpos.push(cuerpoKart(fisicaInvitado, vehiculoInvitado, 'guest', 'kart'));
  for (const r of (rivales?.rivales ?? [])) {
    const st = r.estado;
    if (!st) continue;
    const f = formaDe(r.veh);
    cuerpos.push({
      id: r.pilotoId, tipo: 'rival', rival: r,
      x: st.x, z: st.z, y: st.y, hdg: st.hdg,
      vx: Math.cos(st.hdg) * r.vel, vz: Math.sin(st.hdg) * r.vel,
      masa: r.veh.masa ?? 1, hl: f.hl, hw: f.hw,
    });
  }
  for (const o of (obstaculos?.cuerpos?.() ?? [])) cuerpos.push(o);
  if (cuerpos.length < 2) return;
  for (const c of cuerpos) { c.vx0 = c.vx; c.vz0 = c.vz; c.x0 = c.x; c.z0 = c.z; }

  const eventos = resolverTodos(cuerpos);
  if (!eventos.length) return;

  for (const ev of eventos) {
    let magA = 0, magB = 0;
    for (const [c, esA] of [[ev.a, true], [ev.b, false]]) {
      if (c.tipo === 'obstaculo') {
        continue;
      }
      if (c.tipo === 'rival') {
        const m = impulsoARival(c, ev, esA);
        if (esA) magA = m; else magB = m;
      } else {
        const m = aplicarImpulsoAKart(c.s, c.vx0, c.vz0, c.vx, c.vz, ev, esA);
        if (c.s.rebufo) {
          c.s.rebufo.activo = false;
          c.s.rebufo.carga = 0;
          c.s.rebufo.fuerza = 0;
          c.s.rebufo.rivalId = null;
        }
        c.s.x = c.x; c.s.z = c.z; // la separación posicional sí se aplica entera
        const sac = c.id === 'player' ? sacJugador : sacInvitado;
        sac.golpear(ev.nx * (esA ? 1 : -1), ev.nz * (esA ? 1 : -1), c.s.hdg, m);
        if (esA) magA = m; else magB = m;
      }
    }
    const mag = Math.max(magA, magB);
    if (mag < 0.045) continue;

    // el mareo se ancla al que peor la pasó: el más liviano de los dos, salvo
    // que el jugador esté metido — sus propias estrellitas son las que importan.
    let ancla = null, alto = 0;
    const cand = [[ev.a, magA], [ev.b, magB]];
    const jug = cand.find(([c]) => c.id === 'player');
    const elegido = jug || cand.slice().sort((x, y2) => x[0].masa - y2[0].masa)[0];
    if (elegido) {
      const c = elegido[0];
      ancla = c.tipo === 'rival' ? c.rival.pos : (c.id === 'player' ? anclaJugador : anclaInvitado);
      alto = (c.veh?.tamano ?? 1) * 0.25;
    }
    emitirGolpe(ev, mag, ancla, alto);

    const propio = ev.a.id === 'player' || ev.b.id === 'player';
    if (propio) {
      if (ev.roce) {
        // Venir raspando el costado de otro produce un evento por cuadro. Sin
        // esta espera el roce zumba a 60 Hz y la cámara vibra sin parar; con
        // ella suena como lo que es, un raspón continuo.
        const ahora = fisica.tiempo;
        if (ahora - ultRoce > 0.13) {
          ultRoce = ahora;
          sfx('roce', mag);
          cam.sacudir(Math.min(0.18, 0.05 + mag * 0.16));
        }
      } else {
        sfx('choque', mag);
        cam.sacudir(Math.min(0.95, 0.3 + mag * 0.7));
      }
    }
  }
}

function registrarEvento(ev) {
  carrera.eventos.push(ev);
}

function vigilarRescate(s) {
  if (!s || !Number.isFinite(s.rescateSeq) || s.rescateSeq <= rescatesVistos) return false;
  rescatesVistos = s.rescateSeq;
  entRescate.aparecer({ destino: s.rescateDestino || s });
  sfx('rescate');
  cam.sacudir(0.58);
  hud.mensaje(entRescate.frase, 2200);
  registrarEvento({ tipo: 'rescate-ent', secuencia: s.rescateSeq, frase: entRescate.frase, en: s.tiempo ?? 0 });
  return true;
}

// ── poderes: casting de RIVALES y efectos recibidos ─────────────────────────
// Los rivales anuncian su poder por carrera.eventos; aquí se les pone el nombre
// en pantalla (regla de diseño: todo poder muestra su nombre al activarse) y
// el casting se dibuja anclado a SU kart. El watermark se reinicia solo cuando
// la carrera vacía la lista.
let eventosPoderVistos = 0;
function vigilarPoderesRivales() {
  if (eventosPoderVistos > carrera.eventos.length) eventosPoderVistos = 0;
  for (; eventosPoderVistos < carrera.eventos.length; eventosPoderVistos++) {
    const ev = carrera.eventos[eventosPoderVistos];
    if (ev.tipo !== 'poder' || ev.fuente === 'player') continue;
    const r = rivales?.rivales?.find((x) => x.pilotoId === ev.piloto);
    if (!r?.pos) continue;
    poderesVfx.castear(ev.piloto, {
      x: r.pos.x, y: r.pos.y, z: r.pos.z, hdg: r.estado?.hdg ?? 0, vel: r.vel ?? 0,
      ancla: r.pos,
    });
    hud.mensaje(`${ev.nombre} — ${PILOTO_POR_ID[ev.piloto]?.nombre ?? ev.piloto}`, 950);
  }
}

// Lo que el jugador RECIBE encima también se ve: el miedo del jaguar enfría y
// cierra la pantalla, un encandilamiento la lava de claro un instante.
const efectosJugadorVistos = new WeakSet();
function vigilarEfectosRecibidos() {
  for (const e of carrera.efectosJugador) {
    if (efectosJugadorVistos.has(e)) continue;
    efectosJugadorVistos.add(e);
    if (e.tipo === 'miedo') poderesVfx.grade.push('miedo', Math.min(e.t ?? 1.6, 1.8));
    else if (e.tipo === 'ceguera') poderesVfx.grade.push('flash', 0.5, 0.8);
  }
}

function limpiarEfectos(lista, dt) {
  for (let i = lista.length - 1; i >= 0; i--) {
    lista[i].t -= dt;
    if (lista[i].t <= 0) lista.splice(i, 1);
  }
}

function aplicarEfectosEntrada(entrada, lista) {
  const out = { ...entrada };
  let slow = 0;
  let steerMul = 1;
  for (const e of lista) {
    if (e.tipo === 'freeze') {
      out.gas = false; out.derrapar = false; out.saltar = false; out.freno = true;
      // 0.08 de volante es "no hay volante": el jugador movía la dirección y no
      // pasaba nada durante un segundo entero. Un poder puede quitarte el gas y
      // frenarte; no puede quitarte el manejo. Con 0.35 el freeze sigue doliendo
      // (te para el acelerador y te clava el freno) pero seguís eligiendo la línea.
      steerMul = Math.min(steerMul, 0.35);
      slow = Math.max(slow, 0.85);
    } else if (e.tipo === 'pegajoso' || e.tipo === 'larvas' || e.tipo === 'esporas') {
      steerMul = Math.min(steerMul, 0.58);
      slow = Math.max(slow, e.tipo === 'esporas' ? 0.36 : 0.24);
    } else if (e.tipo === 'miedo' || e.tipo === 'ceguera' || e.tipo === 'noche') {
      steerMul = Math.min(steerMul, 0.75);
      slow = Math.max(slow, 0.18);
    } else if (e.tipo === 'locura') {
      steerMul = Math.min(steerMul, 0.32);
    }
  }
  out.giro *= steerMul;
  // `_slowTasa` = fracción de velocidad que sobrevive a UN SEGUNDO de efecto.
  // Antes era un multiplicador por cuadro (`_slowMul`) y eso dejaba el kart
  // clavado en ~2 km/h con cualquier poder: 0,76 por frame son 0,76⁶⁰ por
  // segundo. Ver `atenuarPorSegundo()` en fisica.js.
  if (slow > 0) out._slowTasa = 1 - slow;
  return out;
}

function crearTokenItem(def) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.5, metalness: 0.08, emissive: def.color, emissiveIntensity: 0.08 });
  if (def.id === 'semilla-nativa') {
    const seed = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat);
    seed.scale.set(1.0, 0.72, 0.9);
    g.add(seed);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.28, 6), new THREE.MeshStandardMaterial({ color: 0xd8c95a, roughness: 0.6 }));
    br.rotation.z = 0.7;
    br.position.set(0.08, 0.1, 0);
    g.add(br);
  } else if (def.id === 'biol') {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.36, 10), mat);
    bottle.position.y = 0.1;
    g.add(bottle);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0x21591f, roughness: 0.7 }));
    cap.position.y = 0.3;
    g.add(cap);
  } else if (def.id === 'ceniza') {
    const cloud = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), mat);
    cloud.scale.set(1.2, 0.8, 1.0);
    g.add(cloud);
  } else if (def.id === 'melaza') {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat);
    drop.scale.set(0.8, 1.1, 0.8);
    g.add(drop);
  } else if (def.id === 'ortiga') {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.2, 1, 1), new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.9, side: THREE.DoubleSide }));
    leaf.rotation.x = -Math.PI / 2;
    leaf.rotation.z = 0.4;
    g.add(leaf);
  } else if (def.id === 'trampa-azul') {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), mat);
    g.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 12), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, emissive: 0x92bcff, emissiveIntensity: 0.1 }));
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  } else if (def.id === 'caldo-bordeles') {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.28, 10), mat);
    jar.position.y = 0.08;
    g.add(jar);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0xd8f2ff, roughness: 0.7 }));
    neck.position.y = 0.24;
    g.add(neck);
  }
  g.scale.setScalar(1.1);
  return g;
}

function construirItemsPista() {
  while (itemsGrupo.children.length) itemsGrupo.remove(itemsGrupo.children[0]);
  carrera.items = ITEMS.map((def, i) => {
    const f = (i + 0.12) / ITEMS.length;
    const p = pista.puntoEn(f);
    const info = pista.infoLocal(p.x, p.z);
    const lado = i % 2 === 0 ? -1 : 1;
    const off = (info.w * 0.3) + 0.85;
    const nx = Math.sin(info.hdg);
    const nz = -Math.cos(info.hdg);
    const x = p.x + nx * off * lado;
    const z = p.z + nz * off * lado;
    const y = pista.alturaMundo(x, z) + 0.35;
    const grupo = new THREE.Group();
    const token = crearTokenItem(def);
    grupo.add(token);
    grupo.position.set(x, y, z);
    itemsGrupo.add(grupo);
    return {
      id: def.id,
      nombre: def.nombre,
      efecto: def.efecto,
      mesh: grupo,
      x, y, z,
      f,
      activo: true,
      respawn: 0,
      def,
      bob: 0.3 + i * 0.11,
    };
  });
}

function activarItem(item, fuente = 'player') {
  const def = item.def;
  registrarEvento({ tipo: 'item', item: item.id, nombre: def.nombre, fuente, en: fisica?.tiempo ?? 0 });
  hud.mensaje(def.nombre, 1000);
  sfx('ui');
  if (fx?.burst) fx.burst(def.efecto || 'item', item.x, item.y, item.z, def.color);
  if (def.id === 'semilla-nativa') {
    carrera.semillas += 1;
    guardarSemillas();
    return;
  }
  if (def.efecto === 'turbo') {
    fisica.turbo = { t: def.duracion, dur: def.duracion, mul: 1.22, acelMul: 2.15, nivel: 1, color: def.color };
    return;
  }
  if (def.efecto === 'humo') {
    carrera.efectosJugador.push({ tipo: 'ceguera', t: def.duracion });
    return;
  }
  if (def.efecto === 'pegajoso') {
    carrera.efectosJugador.push({ tipo: 'pegajoso', t: def.duracion });
    return;
  }
  if (def.efecto === 'pica') {
    carrera.efectosJugador.push({ tipo: 'locura', t: def.duracion });
    return;
  }
  if (def.efecto === 'pega') {
    carrera.efectosJugador.push({ tipo: 'pegajoso', t: def.duracion });
    return;
  }
  if (def.efecto === 'encandila') {
    carrera.efectosJugador.push({ tipo: 'ceguera', t: def.duracion });
  }
}

function usarPoderJugador() {
  const piloto = PILOTO_POR_ID[pilotoSeleccionado];
  if (!piloto || !estado.corriendo || estado.fin) return;
  if (estado.poderCooldown > 0) return;
  const now = fisica?.tiempo ?? 0;
  registrarEvento({ tipo: 'poder', piloto: piloto.id, nombre: piloto.poder, en: now, fuente: 'player' });
  hud.mensaje(piloto.poder, 1000);
  sfx('power', piloto.id === 'oliver' ? 1.25 : 1);
  cam.sacudir(piloto.id === 'oliver' ? 0.42 : 0.2);
  estado.poderCooldown = 1.2;
  const prox = rivales?.rivales ?? [];
  const px = fisica.x, pz = fisica.z;
  const apply = (r, tipo, t) => {
    if (!r) return;
    r.efectos = r.efectos || [];
    r.efectos.push({ tipo, t });
  };
  const dist2 = (x, z) => {
    const dx = x - px, dz = z - pz;
    return dx * dx + dz * dz;
  };
  // el VFX de casting recibe los MISMOS objetivos que el gameplay: si el poder
  // agarró a un rival, el efecto se dibuja sobre ese rival, no sobre el aire
  const vfxOpts = {};
  if (piloto.id === 'angelita') {
    for (const r of prox) {
      if (dist2(r.pos?.x ?? 0, r.pos?.z ?? 0) < 28 * 28) {
        apply(r, 'remolino', 1.8);
        r.desvioV += Math.sign((r.pos?.x ?? 0) - px || 1) * 2.8;
      }
    }
  } else if (piloto.id === 'jaguar') {
    for (const r of prox) if (dist2(r.pos?.x ?? 0, r.pos?.z ?? 0) < 34 * 34) apply(r, 'miedo', 1.8);
  } else if (piloto.id === 'dante') {
    carrera.hazards.push({
      id: `babas-${Math.round(now * 1000)}`, tipo: 'babas', x: px, y: fisica.y,
      z: pz, hdg: fisica.hdg, t: 3.0, r: 3.2, largo: 8.5, ancho: 1.35,
    });
  } else if (piloto.id === 'oliver') {
    vfxOpts.anclas = [];
    for (const [i, r] of prox.entries()) {
      apply(r, 'locura', 1.7);
      r.desvioV += (i % 2 ? -1 : 1) * 6.5;
      r.susto = Math.max(r.susto, 0.95);
      if (r.pos) vfxOpts.anclas.push(r.pos);
    }
  }
  poderesVfx.castear(piloto.id, {
    x: fisica.x, y: fisica.y, z: fisica.z, hdg: fisica.hdg, vel: Math.abs(fisica.vel),
    ancla: anclaJugador,
  }, vfxOpts);
}

function iniciarCountdown() {
  if (introEl && introEl.style.display !== 'none') {
    introEl.classList.add('hidden');
    setTimeout(() => { introEl.style.display = 'none'; }, 500);
  }
  estado.corriendo = false;
  estado.countdownT = 3.2;
  estado.salidaT = 0;
  estado.salidaBoostPendiente = false;
  hud._contAnt = -1;
}

function finCarrera() {
  estado.fin = true;
  sfx('fin');
  document.querySelector('[data-r-total]').textContent = fmt(estado.tiempoTotal);
  document.querySelector('[data-r-lap]').textContent = estado.mejorVuelta === Infinity ? '—' : fmt(estado.mejorVuelta);
  document.querySelector('[data-r-vmax]').textContent = `${Math.round(estado.vmax * 3.6)} km/h`;
  resultEl.classList.add('show');
}

function fmt(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

// nombre de zona para mensajes (primera vez que entras)
const zonaVista = new Set();

// ── loop ────────────────────────────────────────────────────────────────────
const reloj = new THREE.Clock();
montarCoche();

function cuadroKart() {
  const dt = Math.min(0.05, reloj.getDelta());
  if (MUNDO_MAR) {
    ent.tickMar(dt, camara);
    obstaculos?.actualizar();
  }
  if (!fisica || !modelo) return;
  if (orientacion.retrato) {
    renderer.info.reset();
    composer.render();
    return;
  }
  if (orientacion.resetReloj) {
    orientacion.resetReloj = false;
    return;
  }
  const tFrame0 = performance.now();
  let tA = tFrame0;
  red?.ping();

  if (estadoRed.rol === 'guest') {
    const snap = red?.obtenerEstadoInterpolado?.();
    if (!snap) {
      hud.mensaje(estadoRed.conectado ? 'Esperando al anfitrión…' : 'Conectando a la sala…', 900);
      renderer.info.reset();
      composer.render();
      return;
    }
    // El invitado entra a la carrera cuando llega el primer snapshot del
    // anfitrión; no debe quedarse tapado por el menú de selección.
    if (introEl && !introEl.classList.contains('hidden')) {
      introEl.classList.add('hidden');
      setTimeout(() => { introEl.style.display = 'none'; }, 500);
    }
    // El snapshot no trae `local`: cada punta resuelve su kart por ownerId.
    // Sin propio no se usa un fallback, para no tomar el kart del anfitrión.
    if (snap.propio) copiarFisica(fisica, snap.propio);
    vigilarRescate(fisica);
    if (snap.estado) {
      estado.corriendo = !!snap.estado.corriendo;
      estado.fin = !!snap.estado.fin;
      estado.countdownT = snap.estado.countdownT ?? estado.countdownT;
      estado.salidaT = snap.estado.salidaT ?? estado.salidaT;
      estado.tiempoTotal = snap.estado.tiempoTotal ?? estado.tiempoTotal;
      estado.mejorVuelta = snap.estado.mejorVuelta ?? estado.mejorVuelta;
      estado.vmax = snap.estado.vmax ?? estado.vmax;
    }
    carrera.karts = Array.isArray(snap.karts) ? snap.karts : [];
    const keep = new Set();
    for (const k of carrera.karts) {
      if (k.ownerId === estadoRed.rol) continue;
      keep.add(kartKey(k));
      asegurarProxyKart(k, dt);
    }
    limpiarProxies(keep);
    if (Array.isArray(snap.items)) {
      carrera.items = snap.items;
    }
    if (Array.isArray(snap.hazards)) {
      carrera.hazards = snap.hazards;
    }
    carrera.oscuridad = snap.oscuridad ?? 0;
    // impactos que resolvió el host: se reproducen tal cual, en el mismo punto
    // del mundo. Nada de recalcular la colisión de este lado — dos simulaciones
    // en paralelo es justamente como se termina viendo cada uno una cosa.
    if (Array.isArray(snap.golpes)) {
      for (const g of snap.golpes) {
        if (!(g.n > ultGolpeVisto)) continue;
        ultGolpeVisto = g.n;
        const ancla = g.ancla === 'guest' ? anclaJugador : null;
        fxToon.golpe(g.x, g.y, g.z, g.nx, g.nz, g.mag, { roce: g.roce, ancla });
        if (g.ancla === 'guest') {
          sacJugador.golpear(g.nx, g.nz, fisica.hdg, g.mag);
          if (g.roce) { sfx('roce', g.mag); cam.sacudir(Math.min(0.25, 0.08 + g.mag * 0.2)); }
          else { sfx('choque', g.mag); cam.sacudir(Math.min(0.95, 0.3 + g.mag * 0.7)); }
        }
      }
    }
    anclaJugador.x = fisica.x; anclaJugador.y = fisica.y; anclaJugador.z = fisica.z;
    fisica.sacudon = sacJugador.estado(dt);
    if (fisica.sacudon) fisica.roll = (fisica.roll ?? 0) + fisica.sacudon.yaw * 1.6;
    const e0 = estadoEntrada();
    const e = {
      ...e0,
      izq: e0.izq || tInput.izq,
      der: e0.der || tInput.der,
      derrapar: e0.derrapar || tInput.derrapar,
      saltar: e0.saltar || tInput.saltar,
      poder: e0.poder || tInput.poder,
    };
    actualizarRebufoFx(fisica);
    red?.enviarControles(e);
    modelo.actualizar(dt, fisica);
    camara.fov -= fovExtraRapido;
    cam.actualizar(dt, fisica, {});
    actualizarCamaraRapida(dt, fisica);
    ent.actualizar(dt, fisica);
    entRescate.actualizar(dt);
    fxToon.actualizar(dt);
    // el invitado no simula poderes, pero sus pools (babas, partículas
    // residuales) sí tienen que respirar
    poderesVfx.actualizar(dt, { reducedMotion, altoPx: renderer.domElement.height });
    if (fauna) fauna.actualizar(dt, fisica);
    if (carrera.oscuridad > 0) {
      renderer.toneMappingExposure = EXPOSICION_BASE - Math.min(0.52, carrera.oscuridad * 0.16);
    } else {
      renderer.toneMappingExposure = EXPOSICION_BASE;
    }
    document.querySelector('[data-crono]').textContent = fmt(fisica.tiempo ?? 0);
    hud.actualizar(fisica, pista, { nombresTurbo: TURBO_NIVELES.map((t) => t.nombre) });
    renderer.info.reset();
    composer.render();
    const tRender = performance.now();
    cfg.mon.tick(dt);
    if (cfg._needsResize) {
      cfg._needsResize = false;
      renderer.setPixelRatio(cfg.pixelRatio);
      redimensionar();
    }
    const info = renderer.info;
    const modo = estado.corriendo ? 'carrera' : 'menu';
    perfEl.textContent = [
      `draw calls: ${info.render.calls}`,
      `triangles:   ${info.render.triangles}`,
      `lines:       ${info.render.lines}`,
      `points:      ${info.render.points}`,
      `geometries:  ${info.memory.geometries}`,
      `textures:    ${info.memory.textures}`,
      `programs:    ${info.programs?.length ?? 0}`,
      `ms total:    ${(tRender - tFrame0).toFixed(1)}`,
    ].join('\n');
    if (MOSTRAR_PERF && PERF_LOG && (modo !== _perfModo || (tRender - _perfUltLog) > 2000)) {
      _perfModo = modo;
      _perfUltLog = tRender;
      console.log(
        `[perf:${modo}] calls=${info.render.calls} tris=${info.render.triangles} ` +
        `lines=${info.render.lines} points=${info.render.points} ` +
        `geoms=${info.memory.geometries} tex=${info.memory.textures} ` +
        `msTotal=${(tRender - tFrame0).toFixed(1)}`
      );
    }
    return;
  }

  if (tilt.activo) {
    tilt.steer += (tilt.target - tilt.steer) * (1 - Math.exp(-9 * dt));
  } else {
    tilt.steer += (0 - tilt.steer) * (1 - Math.exp(-12 * dt));
  }
  if (estado.poderCooldown > 0) estado.poderCooldown = Math.max(0, estado.poderCooldown - dt);
  limpiarEfectos(carrera.efectosJugador, dt);
  carrera.oscuridad = Math.max(0, carrera.oscuridad - dt);

  // countdown
  const e0 = estadoEntrada();
  if (!estado.corriendo && !estado.fin) {
    estado.countdownT -= dt;
    const n = Math.ceil(estado.countdownT);
    if (n >= 1 && n <= 3 && n !== hud._contAnt) {
      hud.mensaje(String(n));
      sfx('count');
    }
    hud._contAnt = n;
    if (estado.countdownT <= 0) {
      estado.corriendo = true;
      const timing = estadoEntrada();
      estado.salidaT = 0.55;
      estado.salidaBoostPendiente = timing.gas && !timing.freno;
      hud.mensaje('¡YA!');
      sfx('go');
    }
  }

  const burnoutT = estado.salidaT;
  if (estado.salidaT > 0) estado.salidaT = Math.max(0, estado.salidaT - dt);

  // entrada: durante el countdown no hay gas ni saltos
  const e = {
    ...e0,
    izq: e0.izq || tInput.izq,
    der: e0.der || tInput.der,
    derrapar: e0.derrapar || tInput.derrapar,
    saltar: e0.saltar || tInput.saltar,
    poder: e0.poder || tInput.poder,
    rebufo: detectarRebufo(fisica),
  };
  if (!estado.corriendo || estado.fin) { e.gas = false; e.saltar = false; e.derrapar = false; }
  if (burnoutT > 0) {
    // Humo y rueda que gira sin avance; la tracción entra después de esta
    // ventana, con todos los participantes alineados en el mismo instante.
    e.gas = false;
    e.freno = false;
    e.derrapar = false;
  }
  const eAjustada = aplicarEfectosEntrada(e, carrera.efectosJugador);
  if (eAjustada.poder && !estado._poderLatch) usarPoderJugador();
  estado._poderLatch = eAjustada.poder;
  if (QA_PODER && estado.corriendo && !estado.fin) {
    qaPoderT -= dt;
    if (qaPoderT <= 0) { qaPoderT = 3.0; estado.poderCooldown = 0; usarPoderJugador(); }
  }

  // física (durante el paso mágico el kart viaja solo: gas fijo, sin volante)
  const ePaso = transicionND?.activa
    ? { gas: true, freno: false, izq: false, der: false, derrapar: false, saltar: false, poder: false, giro: 0 }
    : eAjustada;
  if (!(GATE_FREEZE && estado.corriendo)) fisica.step(dt, ePaso);
  // cruce del arco: arranca el viaje New Donk; el salto físico ocurre DEBAJO
  // del mural (alCubierto). El conteo de vueltas lo hace la física sola.
  if (transicionND && portalND && !transicionND.activa && estado.corriendo && !estado.fin
      && fisica.info && fisica.info.f >= portalND.portal.f - 0.008
      && fisica.info.f < portalND.portal.f + 0.006) {
    const ultima = fisica.laps >= fisica.totalLaps - 1;
    sfx('turbo');
    cam.sacudir(0.3);
    transicionND.iniciar({
      titulo: ultima ? '¡La meta espera en la cima!' : '¡Por el túnel, a la cima!',
      alCubierto: () => {
        saltarPortal(fisica, pista);
        cam.cortar?.();
      },
      alFin: () => { cam.cortar?.(); },
    });
  }
  if (transicionND) transicionND.tick(dt);
  if (portalND) portalND.tick(fisica.tiempo ?? 0);
  // el invitado (host simula) también usa la puerta mágica, sin overlay
  if (portalND && fisicaInvitado && fisicaInvitado.info
      && fisicaInvitado.info.f >= portalND.portal.f - 0.004
      && fisicaInvitado.info.f < portalND.portal.f + 0.006) {
    saltarPortal(fisicaInvitado, pista);
  }
  vigilarRescate(fisica);
  if (burnoutT > 0 && estado.salidaT === 0 && estado.salidaBoostPendiente) {
    fisica.vel += 5.0;
    fisica._turboVisual = { color: 0xffc54d };
    estado.salidaBoostPendiente = false;
    hud.mensaje('¡SALIDA PERFECTA!');
    sfx('turbo');
  }
  actualizarRebufoFx(fisica);
  if (eAjustada._slowTasa) fisica.vel = atenuarPorSegundo(fisica.vel, eAjustada._slowTasa, dt);
  if (estadoRed.rol === 'host') {
    const metaRemota = red?.obtenerMetaRemota?.();
    sincronizarInvitadoDesdeMeta(metaRemota);
    if (fisicaInvitado) {
      const eInv = red?.recibirControlesHost?.() || {};
      const eInvAjustada = aplicarEfectosEntrada(eInv, []);
      fisicaInvitado.step(dt, estado.corriendo && !estado.fin && burnoutT <= 0 ? eInvAjustada : {
        gas: false, freno: true, izq: false, der: false, derrapar: false, saltar: false, poder: false, giro: 0,
      });
    }
  }
  const tFis = performance.now();

  // eventos de la física (flags de un frame)
  if (fisica.aterrizo) {
    sfx('land');
    cam.sacudir(0.35);
    // chorrera: si cayó dentro de una poza, el golpe es de AGUA
    if (MUNDO_CHORRERA && fisica.info && pista.chorreraPozas) {
      for (const poza of pista.chorreraPozas) {
        if (Math.abs(fisica.info.f - poza.f) < 0.012) {
          fx.chapuzon?.(fisica);
          cam.sacudir(0.2);
          break;
        }
      }
    }
  }
  if (fisica.rescate) {
    hud.mensaje(`¡${entRescate.frase}!`, 2200);
  } else if (fisica.respawn) {
    sfx('respawn');
    cam.sacudir(0.5);
    hud.mensaje('De vuelta al camino.');
  }
  if (fisica.vueltaCompletada) {
    const lapTime = fisica.tVuelta - estado.lapInicio;
    estado.lapInicio = fisica.tVuelta;
    if (lapTime < estado.mejorVuelta) estado.mejorVuelta = lapTime;
    sfx('lapa');
    const msg = fisica.laps >= fisica.totalLaps ? '¡Última vuelta!' : `¡Vuelta ${fisica.laps}/${fisica.totalLaps}!`;
    hud.mensaje(msg);
  }
  if (fisica.termino && !estado.fin) {
    estado.tiempoTotal = fisica.tVuelta;
    finCarrera();
  }

  // turbo: al dispararse, sonido + sacudida; al subir de nivel, chime
  if (fisica.turbo && !estado.turboAnt) {
    sfx('turbo');
    cam.sacudir(0.25);
  }
  if (fisica.drift.nivel > estado.nivelAnt && fisica.drift.nivel > 0) {
    sfx('driftCharge');
  }
  estado.nivelAnt = fisica.drift.nivel;
  estado.turboAnt = !!fisica.turbo;

  // velocidad máxima
  estado.vmax = Math.max(estado.vmax, Math.abs(fisica.vel));

  // aviso de zona (niebla) la primera vez
  if (fisica.info && !zonaVista.has(fisica.info.zona)) {
    zonaVista.add(fisica.info.zona);
    const nombreZona = pista.NOMBRE_ZONA[fisica.info.zona];
    if (fisica.info.zona === ZONA.NIEBLA) hud.mensaje('Bosque de niebla… ¡agárrate!');
    else if (fisica.info.zona === ZONA.PARAMO_ALTO) hud.mensaje('Páramo alto del Sumapaz');
  }

  // ── choques (host / un jugador) ───────────────────────────────────────────
  // Va aquí: después de que todos se movieron y ANTES de dibujar, así el golpe
  // se ve en el mismo frame en que ocurre y no un cuadro más tarde.
  resolverChoques();
  anclaJugador.x = fisica.x; anclaJugador.y = fisica.y; anclaJugador.z = fisica.z;
  fisica.sacudon = sacJugador.estado(dt);
  if (fisica.sacudon) fisica.roll += fisica.sacudon.yaw * 1.6;
  if (fisicaInvitado) {
    anclaInvitado.x = fisicaInvitado.x; anclaInvitado.y = fisicaInvitado.y; anclaInvitado.z = fisicaInvitado.z;
    fisicaInvitado.sacudon = sacInvitado.estado(dt);
    if (fisicaInvitado.sacudon) fisicaInvitado.roll += fisicaInvitado.sacudon.yaw * 1.6;
  }

  // actualizar mundos
  modelo.actualizar(dt, fisica);
  camara.fov -= fovExtraRapido;
  if (GATE_CHORRERA) {
    // Encuadre de gate que acompaña al kart: la captura debe certificar el
    // descenso jugable, no un diorama separado sin vehículo.
    const ahead = new THREE.Vector3(Math.cos(fisica.hdg), 0, Math.sin(fisica.hdg));
    const lateral = new THREE.Vector3(-ahead.z, 0, ahead.x);
    const shotPos = new THREE.Vector3(
      fisica.x - ahead.x * 14 - lateral.x * 9,
      fisica.y + 6,
      fisica.z - ahead.z * 14 - lateral.z * 9,
    );
    const shotTarget = new THREE.Vector3(
      fisica.x + ahead.x * 7,
      fisica.y - 1,
      fisica.z + ahead.z * 7,
    );
    camara.position.lerp(shotPos, 1 - Math.exp(-7 * dt));
    camara.lookAt(shotTarget);
  } else {
    cam.actualizar(dt, fisica, {});
  }
  if (transicionND?.activa && transicionND.aplaneK > 0) {
    // el aplane casi ortográfico del túnel Odyssey: el FOV cae con el viaje
    camara.fov += (26 - camara.fov) * transicionND.aplaneK;
    camara.updateProjectionMatrix();
  }
  actualizarCamaraRapida(dt, fisica);
  ent.actualizar(dt, fisica);
  entRescate.actualizar(dt);
  if (rivales) {
    prepararRebufoRivales(dt, fisica);
    rivales.actualizar(dt, fisica, carrera, { bloqueada: !estado.corriendo || burnoutT > 0 });
    if (burnoutT > 0 && fx?.burnout) {
      for (const rival of rivales.rivales ?? []) {
        if (rival.estado) fx.burnout(rival.estado);
      }
    }
  }
  if (fauna) fauna.actualizar(dt, fisica);
  if (estadoRed.rol === 'host') {
    const keep = new Set();
    if (fisicaInvitado) {
      const kartInv = {
        id: 'guest',
        ownerId: 'guest',
        piloto: pilotoInvitado,
        vehiculo: vehiculoInvitado.id,
        x: fisicaInvitado.x, y: fisicaInvitado.y, z: fisicaInvitado.z,
        hdg: fisicaInvitado.hdg, vel: fisicaInvitado.vel,
        local: false,
      };
      keep.add(kartKey(kartInv));
      asegurarProxyKart(kartInv, dt);
    }
    limpiarProxies(keep);
  }
  for (const item of carrera.items) {
    item.mesh.visible = item.activo;
    item.mesh.rotation.y += dt * 1.4;
    const bob = Math.sin((fisica.tiempo + item.bob) * 2.1) * 0.1;
    item.mesh.position.y = item.y + bob;
    if (!item.activo) {
      item.respawn -= dt;
      if (item.respawn <= 0) {
        item.activo = true;
        item.mesh.visible = true;
      }
      continue;
    }
    const dx = fisica.x - item.x;
    const dz = fisica.z - item.z;
    if ((dx * dx + dz * dz) < 3.2 * 3.2) {
      item.activo = false;
      item.respawn = item.id === 'semilla-nativa' ? 8 : 11;
      activarItem(item, 'player');
      item.mesh.visible = false;
    }
  }
  for (let i = carrera.hazards.length - 1; i >= 0; i--) {
    const h = carrera.hazards[i];
    h.t -= dt;
    if (h.t <= 0) { carrera.hazards.splice(i, 1); continue; }
    const dx = fisica.x - h.x, dz = fisica.z - h.z;
    if ((dx * dx + dz * dz) < h.r * h.r) {
      carrera.efectosJugador.push({ tipo: 'pegajoso', t: 1.1 });
    }
  }
  actualizarHazardsVisuales(dt);
  if (carrera.oscuridad > 0) {
    renderer.toneMappingExposure = EXPOSICION_BASE - Math.min(0.52, carrera.oscuridad * 0.16);
  } else {
    renderer.toneMappingExposure = EXPOSICION_BASE;
  }
  const estadoFx = fisica._turboVisual
    ? { ...fisica, turbo: fisica._turboVisual }
    : fisica;
  fx.actualizar(dt, estadoFx);
  if (burnoutT > 0 && fx?.burnout) fx.burnout(fisica);
  fisica._turboVisual = null;
  fxToon.actualizar(dt);
  vigilarPoderesRivales();
  vigilarEfectosRecibidos();
  poderesVfx.actualizar(dt, {
    reducedMotion, anclaJugador, hdgJugador: fisica.hdg, velJugador: Math.abs(fisica.vel),
    altoPx: renderer.domElement.height,
  });
  actualizarMotor(fisica, dt, e);
  carrera.karts = [
    {
      id: 'player',
      ownerId: estadoRed.rol === 'guest' ? 'guest' : 'host',
      piloto: pilotoSeleccionado,
      vehiculo: vehSel.id,
      x: fisica.x, y: fisica.y, z: fisica.z,
      hdg: fisica.hdg, vel: fisica.vel, lap: fisica.laps,
      local: true,
      ready: estadoRed.listoLocal,
      conectado: true,
      efectos: carrera.efectosJugador.map((ef) => ({ tipo: ef.tipo, t: ef.t })),
      drift: JSON.parse(JSON.stringify(fisica.drift)),
      turbo: fisica.turbo ? JSON.parse(JSON.stringify(fisica.turbo)) : null,
      rebufo: JSON.parse(JSON.stringify(fisica.rebufo)),
      rescateSeq: fisica.rescateSeq,
      atontado: fisica.atontado,
      tambaleo: fisica.tambaleo,
      rescateDestino: fisica.rescateDestino,
    },
    ...(estadoRed.rol === 'host' && fisicaInvitado ? [{
      id: 'guest',
      ownerId: 'guest',
      piloto: pilotoInvitado,
      vehiculo: vehiculoInvitado.id,
      x: fisicaInvitado.x, y: fisicaInvitado.y, z: fisicaInvitado.z,
      hdg: fisicaInvitado.hdg, vel: fisicaInvitado.vel, lap: fisicaInvitado.laps,
      local: false,
      ready: estadoRed.listoPeer,
      conectado: estadoRed.peerConectado,
      efectos: [],
      drift: JSON.parse(JSON.stringify(fisicaInvitado.drift)),
      turbo: fisicaInvitado.turbo ? JSON.parse(JSON.stringify(fisicaInvitado.turbo)) : null,
      rebufo: JSON.parse(JSON.stringify(fisicaInvitado.rebufo)),
    }] : []),
    ...(rivales?.rivales ?? []).map((r) => ({
      id: r.pilotoId,
      piloto: r.pilotoId,
      vehiculo: r.veh.id,
      f: r.f,
      x: r.modelo?.grupo.position.x ?? 0,
      y: r.modelo?.grupo.position.y ?? 0,
      z: r.modelo?.grupo.position.z ?? 0,
      hdg: r.modelo?.grupo.rotation.y ?? 0,
      vel: r.vel,
      laps: r.laps,
      local: false,
      conectado: true,
      efectos: r.efectos.map((ef) => ({ tipo: ef.tipo, t: ef.t })),
    })),
  ];
  if (estadoRed.rol === 'host' && red) {
    red.setMeta({ piloto: pilotoSeleccionado, vehiculo: vehSel.id, ready: estadoRed.listoLocal });
    red.enviarEstado({
      timestamp: performance.now(),
      estado: {
        corriendo: estado.corriendo,
        fin: estado.fin,
        countdownT: estado.countdownT,
        salidaT: estado.salidaT,
        tiempoTotal: estado.tiempoTotal,
        mejorVuelta: estado.mejorVuelta,
        vmax: estado.vmax,
      },
      karts: carrera.karts,
      items: carrera.items.map((item) => ({
        id: item.id, x: item.x, y: item.y, z: item.z, activo: item.activo, respawn: item.respawn, f: item.f,
      })),
      hazards: carrera.hazards.map((h) => ({ ...h })),
      // eventos de impacto: el invitado NO recalcula el choque (lo resolvió el
      // host), solo reproduce el mismo efecto en el mismo punto del mundo. Van
      // numerados porque el snapshot se interpola entre dos muestras y sin un
      // contador el mismo golpe se dispararía varias veces.
      golpes: carrera.golpes.slice(-8),
      oscuridad: carrera.oscuridad,
      rivals: (rivales?.rivales ?? []).map((r) => ({
        id: r.pilotoId,
        piloto: r.pilotoId,
        vehiculo: r.veh.id,
        x: r.modelo?.grupo.position.x ?? 0,
        y: r.modelo?.grupo.position.y ?? 0,
        z: r.modelo?.grupo.position.z ?? 0,
        hdg: r.modelo?.grupo.rotation.y ?? 0,
        vel: r.vel,
        laps: r.laps,
        local: false,
      })),
    });
  }
  const tMundos = performance.now();

  // HUD
  document.querySelector('[data-crono]').textContent = fmt(fisica.tiempo);
  hud.actualizar(fisica, pista, {
    nombresTurbo: TURBO_NIVELES.map((t) => t.nombre),
  });
  const tHud = performance.now();

  // limpiar flags de eventos
  // (los golpes NO se vacían cada frame: se deja una ventana corriente para que
  //  el invitado no pierda un impacto si se le cae un paquete; deduplica por `n`)
  if (carrera.golpes.length > 16) carrera.golpes.splice(0, carrera.golpes.length - 16);
  fisica.aterrizo = false;
  fisica.respawn = false;
  fisica.rescate = false;
  fisica.vueltaCompletada = false;
  fisica.termino = false;

  // render
  renderer.info.reset();
  composer.render();
  const tRender = performance.now();

  // monitor de rendimiento (baja calidad de UNA vía)
  cfg.mon.tick(dt);
  if (cfg._needsResize) {
    cfg._needsResize = false;
    renderer.setPixelRatio(cfg.pixelRatio);
    redimensionar();
  }

  const info = renderer.info;
  const modo = estado.corriendo ? 'carrera' : 'menu';
  perfEl.textContent = [
    `draw calls: ${info.render.calls}`,
    `triangles:   ${info.render.triangles}`,
    `lines:       ${info.render.lines}`,
    `points:      ${info.render.points}`,
    `geometries:  ${info.memory.geometries}`,
    `textures:    ${info.memory.textures}`,
    `programs:    ${info.programs?.length ?? 0}`,
    `ms step:     ${(tFis - tA).toFixed(1)}`,
    `ms world:    ${(tMundos - tFis).toFixed(1)}`,
    `ms hud:      ${(tHud - tMundos).toFixed(1)}`,
    `ms render:   ${(tRender - tHud).toFixed(1)}`,
    `ms total:    ${(tRender - tFrame0).toFixed(1)}`,
  ].join('\n');
  if (MOSTRAR_PERF && PERF_LOG && (modo !== _perfModo || (tRender - _perfUltLog) > 2000)) {
    _perfModo = modo;
    _perfUltLog = tRender;
    console.log(
      `[perf:${modo}] calls=${info.render.calls} tris=${info.render.triangles} ` +
      `lines=${info.render.lines} points=${info.render.points} ` +
      `geoms=${info.memory.geometries} tex=${info.memory.textures} ` +
      `msTotal=${(tRender - tFrame0).toFixed(1)}`
    );
  }
}

renderer.setAnimationLoop(cuadroKart);

if (location.search.includes('debug')) {
  window.__THREE = THREE;
  window.__escena = escena;
  window.__renderer = renderer;
  window.__entRescate = entRescate;
  window.__fx = fx;
  window.__gateRender = () => composer.render();
  window.__gateRenderBaseline = () => renderer.render(escena, camara);
  // La cámara y el modo, para que una sonda pueda medir la SACUDIDA al rotar.
  // El tirón que se denuncia dura uno o dos cuadros: hay que poder muestrear
  // posición y FOV por cuadro, no cada 100 ms.
  window.__camara = camara;
  window.__cam = cam;
  window.__orientation = orientacion;
  window.__cfg = cfg;
  // `cfg.movil` es CALIDAD (congelada al arrancar). `modo` es interacción y
  // encuadre, y se reevalúa: es lo que una sonda de rotación tiene que mirar.
  window.__modo = modo;
  // Congelar el mundo en un instante exacto. Una captura de pantalla tarda
  // ~370 ms; sobre un efecto de impacto que dura ~800 ms eso significa que la
  // foto llega siempre tarde y a un cuadro que no es el que se pidió. Parando
  // el loop, el canvas se queda con el último cuadro dibujado y la foto sí
  // retrata el instante pedido. Solo existe con ?debug.
  window.__congelar = () => renderer.setAnimationLoop(null);
  window.__descongelar = () => { reloj.getDelta(); renderer.setAnimationLoop(cuadroKart); };
}

// ── EL SELECTOR 3D (la repisa de juguetes) ───────────────────────────────────
// Cableado a mano por el orquestador, no por el agente que lo construyó: el
// cableado final al sitio vivo es suyo por regla dura, y además `main.js` lo
// estaban tocando otros dos carriles esa misma hora.
// El módulo NO reemplaza el menú: lo maneja. El intro clásico sigue vivo debajo
// y es la única fuente de verdad — cada elección termina en `chip.click()` sobre
// el botón 2D, así que multijugador, semillas y red siguen andando igual. Si el
// módulo no monta, aparece el menú de antes y ya. Ver js/selector3d.js.
import('./selector3d.js').then((m) => m.montarSelector3D()).catch((e) => console.warn('[selector3d] no montó:', e.message));
