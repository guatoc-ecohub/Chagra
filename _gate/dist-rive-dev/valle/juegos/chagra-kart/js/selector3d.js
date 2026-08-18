// ── selector3d.js — la repisa de juguetes ───────────────────────────────────
// Convierte la selección de vehículo/piloto en una REPISA 3D: todos los
// juguetes a la vista, y el elegido grande girando en su tornamesa con el
// piloto manejándolo de verdad.
//
// NO reemplaza la lógica del menú: la MANEJA. El intro clásico (#intro) sigue
// intacto debajo y es la única fuente de verdad — cada elección aquí termina en
// un `chip.click()` sobre el botón 2D de siempre, así que multijugador,
// semillas y red siguen funcionando sin tocar main.js. Si este módulo falla al
// montar, el menú viejo aparece solo.
//
// ── presupuesto de dibujo (medido 2026-08-07, _gate/sel3d/probe-costo.png) ──
// Los 8 vehículos suman 1024 mallas y los 11 pilotos 548: 1572 draw calls si se
// pintaran todos vivos, encima de los 1266 que ya cuesta la pista de fondo. No
// cabe en 60 FPS. Por eso los juguetes de la repisa son IMPOSTORES: cada modelo
// REAL se pinta UNA vez a su propio render target de 256² y se muestra como un
// quad con esa textura. Como la cámara del selector es fija y de campo angosto
// (fov 24), el impostor es indistinguible del modelo. La repisa entera cuesta
// ~40 draw calls; sólo el juguete elegido va vivo, entero y animado.

import * as THREE from 'three';
import { VEHICULOS } from './vehiculos.js';
import { PILOTOS } from './pilotos.js';
import { construirModeloVehiculo } from './modelos.js';
import { crearPilotoManejando, montarPilotoManejando, aplicarPose } from './modelos/pilotos-manejando.js';

// ── constantes de escena ────────────────────────────────────────────────────
const FOV = 24;      // campo angosto: así el impostor plano no se delata
const DIST = 16;     // distancia cámara → plano z=0
const RETRATO = 256; // px de lado del retrato de cada juguete
const DEG = Math.PI / 180;

// Dirección desde la que se retrata cada juguete (tres cuartos delantero).
// Los vehículos miran +X (contrato de modelos.js); los pilotos miran +Z (por
// eso la chiva rota PI/2 el ancla del piloto).
const VISTA_VEHICULO = new THREE.Vector3(1.55, 0.72, 1.32);
const VISTA_PILOTO = new THREE.Vector3(1.42, 0.44, 1.28);
// Encuadre por familia: R = radio de la caja retratada (más chico = el juguete
// llena más su celda), cy = altura a la que mira la cámara. Los pilotos son
// mucho menores que los carros y viven en su PROPIA repisa: compararlos con un
// camión no significa nada, así que se encuadran aparte. Un cy bajo con R
// chico les cortaba la cabeza.
const ENCUADRE = {
  veh: { R: 0.66, cy: 0.30 },
  pil: { R: 0.62, cy: 0.56 },
};

// Pose de vitrina del piloto suelto: turbo abre élitros y saca las alas
// escondidas, velocidad le tira orejas y antenas al viento. Sin esto los once
// quedan de maniquí en T y no se distingue un jaguar de un dálmata.
const POSE_VITRINA = { t: 1.7, giro: 0.28, velocidad: 0.6, turbo: 0.55 };

const MADERA = 0x6a4728;
const MADERA_CANTO = 0x9a6d3c;

// ── utilidades ──────────────────────────────────────────────────────────────
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
// tirón con peso: sale disparado y se pasa un poco antes de asentar
const easeOutBack = (t, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
const easeInCubic = (t) => t * t * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// Movimiento reducido: la repisa deja de girar, los juguetes dejan de respirar
// y el cambio de selección salta directo al estado final (sin rebote). Se
// escucha en vivo: la preferencia puede cambiar con el selector abierto.
let reducedMotionSel = typeof matchMedia === 'function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;
const rmSelQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
if (rmSelQuery?.addEventListener) {
  rmSelQuery.addEventListener('change', () => { reducedMotionSel = rmSelQuery.matches; });
}

function medidas(obj) {
  const caja = new THREE.Box3().setFromObject(obj);
  const tam = caja.getSize(new THREE.Vector3());
  const centro = caja.getCenter(new THREE.Vector3());
  return { caja, tam, centro, mayor: Math.max(tam.x, tam.y, tam.z) || 1 };
}

// Box3.setFromObject mide en MUNDO, no en el espacio del objeto: si el modelo
// ya cuelga de la tornamesa, la caja sale con la rotación y el desplazamiento
// del padre metidos adentro. Así el camión salía gigante y la moto enana, y
// sólo el PRIMER juguete medía bien (antes del primer render todas las
// matrices son identidad). Se mide desenganchado y se vuelve a colgar.
function medidaLocal(obj) {
  const padre = obj.parent;
  const pos = obj.position.clone(), rot = obj.rotation.clone(), esc = obj.scale.clone();
  padre?.remove(obj);
  obj.position.set(0, 0, 0); obj.rotation.set(0, 0, 0); obj.scale.setScalar(1);
  obj.updateMatrixWorld(true);
  const m = medidas(obj);
  obj.position.copy(pos); obj.rotation.copy(rot); obj.scale.copy(esc);
  padre?.add(obj);
  return m;
}

function texturaDegradado(paradas) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  for (const [p, col] of paradas) grad.addColorStop(p, col);
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function texturaRadial(paradas, lado = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = lado;
  const g = c.getContext('2d');
  const r = lado / 2;
  const grad = g.createRadialGradient(r, r, 1, r, r, r - 1);
  for (const [p, col] of paradas) grad.addColorStop(p, col);
  g.fillStyle = grad; g.fillRect(0, 0, lado, lado);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ── CSS propio (el módulo se trae su hoja: no toca index.html) ──────────────
const CSS = `
#sel3d{position:absolute;inset:0;z-index:12;font-family:Georgia,"Times New Roman",serif;
  color:#f4ecd6;overflow:hidden;background:#0d1210}
#sel3d.oculto{display:none}
#sel3d>canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
#sel3d .capa{position:absolute;inset:0;pointer-events:none}
#sel3d .titulo{position:absolute;left:0;right:0;text-align:center}
#sel3d .titulo h1{margin:0;font-size:clamp(19px,3.2vw,33px);line-height:1.05;font-style:italic;
  color:#ffe9a8;text-shadow:0 2px 14px rgba(0,0,0,.7)}
#sel3d .titulo .sub{font-size:clamp(8.5px,1.3vw,11.5px);letter-spacing:.24em;text-transform:uppercase;
  opacity:.66;margin-top:1px}
#sel3d .rotulo{position:absolute;left:0;right:0;text-align:center;font-size:10.5px;letter-spacing:.24em;
  text-transform:uppercase;color:#f0e2b4;opacity:.5}
#sel3d .ficha{position:absolute;left:0;right:0;text-align:center;text-shadow:0 2px 12px rgba(0,0,0,.9)}
#sel3d .ficha .nom{font-size:clamp(16px,2.5vw,26px);color:#fff3cd;font-style:italic;line-height:1.14}
#sel3d .ficha .con{font-size:clamp(10.5px,1.5vw,13.5px);color:#d3e8b8;line-height:1.32}
#sel3d .ficha .dat{font-size:clamp(9.5px,1.3vw,12px);opacity:.78;margin-top:1px;line-height:1.3}
#sel3d .ficha .dat b{color:#ffd23f;font-weight:700}
#sel3d .eti{position:absolute;transform:translate(-50%,0);text-align:center;
  font-size:10px;line-height:1.14;color:#e9dcb8;opacity:.7;
  text-shadow:0 1px 5px rgba(0,0,0,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#sel3d .eti.on{opacity:1;color:#fff3cd;font-weight:700}
#sel3d .eti.trancado{opacity:.44}
#sel3d .eti .costo{display:block;font-size:8.5px;color:#ffd23f;opacity:.8;letter-spacing:.04em}
#sel3d .pie{position:absolute;left:0;right:0;display:flex;flex-direction:column;
  align-items:center;gap:1px;pointer-events:none}
#sel3d .pie *{pointer-events:auto}
#sel3d .arrancar{padding:11px 30px;border-radius:999px;border:2px solid #281a0d;
  background:linear-gradient(180deg,#c0392b,#8c2b1e);color:#fff;font-weight:800;font-size:16px;
  font-family:inherit;cursor:pointer;box-shadow:0 7px 0 rgba(20,12,5,.6),0 14px 30px rgba(0,0,0,.5)}
#sel3d .arrancar:active{transform:translateY(3px);box-shadow:0 4px 0 rgba(20,12,5,.6)}
/* El aviso del suelo. Pedido textual del operador: el juego no puede quedarse
   en juego. Va en el selector porque es lo primero que se lee, antes de correr
   — y va con SUS palabras, no suavizadas.
   Va FUERA del pie: metido adentro empujaba el bloque y el botón Arrancar
   terminaba tapando a la Avispita en la repisa de pilotos. Anclado al fondo
   de la pantalla no empuja nada. (Lo vio el ojo; el gate daba 0 page errors.)
   Y OJO: nada de comillas invertidas en estos comentarios — este bloque vive
   dentro de un template literal y una sola cierra el CSS entero. Me pasó. */
#sel3d .aviso{margin:7px auto 0;max-width:62ch;padding:0 14px;text-align:center;
  pointer-events:none;font:italic 600 .74rem/1.35 Georgia,'Times New Roman',serif;
  color:#e0cfa4;text-shadow:0 1px 3px rgba(0,0,0,.9);opacity:.88}
#sel3d .mas{background:none;border:0;color:#d9cfae;opacity:.5;font:inherit;font-size:11px;
  text-decoration:underline;cursor:pointer;padding:5px 8px 1px}
#sel3d .mas:hover{opacity:1}
#sel3dVolver{position:absolute;left:12px;top:12px;z-index:13;padding:9px 15px;border-radius:999px;
  border:2px solid #281a0d;background:linear-gradient(180deg,#214f38,#133025);color:#fff6d7;
  font:700 13px Georgia,serif;cursor:pointer;display:none}
#sel3dVolver.on{display:block}
`;

// ─────────────────────────────────────────────────────────────────────────────
export function montarSelector3D(opts = {}) {
  const doc = opts.document ?? document;
  const intro = doc.getElementById('intro');
  const chipsEl = doc.getElementById('chips');
  const pilotsEl = doc.getElementById('pilots');
  const startBtn = doc.getElementById('startBtn');
  if (!intro || !chipsEl || !pilotsEl || !startBtn) {
    throw new Error('selector3d: falta #intro / #chips / #pilots / #startBtn');
  }
  const chipsVeh = [...chipsEl.querySelectorAll('.chip')];
  const chipsPil = [...pilotsEl.querySelectorAll('.chip')];
  if (chipsVeh.length !== VEHICULOS.length || chipsPil.length !== PILOTOS.length) {
    throw new Error('selector3d: los chips 2D no coinciden con las tablas de datos');
  }

  // ── DOM propio ────────────────────────────────────────────────────────────
  const hoja = doc.createElement('style');
  hoja.textContent = CSS;
  doc.head.appendChild(hoja);

  const raiz = doc.createElement('div');
  raiz.id = 'sel3d';
  raiz.innerHTML = `
    <canvas></canvas>
    <div class="capa">
      <div class="titulo"><h1>Chagra Kart</h1><div class="sub">Elige tu juguete</div>
        <p class="aviso">Esto es un juego. Las actividades que dañan el suelo
          son irreparables — y los que las hacen son unos zoquetes.</p></div>
      <div class="ficha" data-ficha></div>
      <div class="rotulo" data-rot-veh>Los carros</div>
      <div class="rotulo" data-rot-pil>Los pilotos</div>
      <div data-etiquetas></div>
    </div>
    <div class="pie">
      <button class="arrancar" type="button">Arrancar ▶</button>
      <button class="mas" type="button">más opciones</button>
    </div>`;
  intro.parentNode.insertBefore(raiz, intro.nextSibling);

  const btnVolver = doc.createElement('button');
  btnVolver.id = 'sel3dVolver';
  btnVolver.type = 'button';
  btnVolver.textContent = '◀ Volver a los juguetes';
  intro.parentNode.insertBefore(btnVolver, raiz.nextSibling);

  const lienzo = raiz.querySelector('canvas');
  const fichaEl = raiz.querySelector('[data-ficha]');
  const tituloEl = raiz.querySelector('.titulo');
  const pieEl = raiz.querySelector('.pie');
  const rotVehEl = raiz.querySelector('[data-rot-veh]');
  const rotPilEl = raiz.querySelector('[data-rot-pil]');
  const etiquetasEl = raiz.querySelector('[data-etiquetas]');
  intro.style.visibility = 'hidden';

  // ── renderer propio: sin sombras, sin post, sin tone mapping ─────────────
  // Tone mapping apagado a propósito: los retratos se hornean con ESTE mismo
  // renderer, y encendido se aplicaría dos veces (al hornear y al pintar).
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = false;
  renderer.info.autoReset = false;
  renderer.setClearColor(0x0d1210, 1);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.5, 140);
  camara.position.set(0, 0, DIST);
  camara.lookAt(0, 0, 0);

  luces(escena, 1);

  const texMancha = texturaRadial([
    [0, 'rgba(22,13,6,0.66)'], [0.5, 'rgba(22,13,6,0.28)'], [1, 'rgba(22,13,6,0)'],
  ]);
  const texFoco = texturaRadial([
    [0, 'rgba(255,214,140,0.55)'], [0.45, 'rgba(255,190,110,0.17)'], [1, 'rgba(255,180,100,0)'],
  ], 256);

  // fondo: tarde de páramo, un plano detrás de todo (1 draw call)
  const fondo = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: texturaDegradado([[0, '#16261f'], [0.38, '#22332a'], [0.68, '#3b3524'], [1, '#130d08']]),
      depthWrite: false,
    })
  );
  fondo.position.z = -14;
  fondo.renderOrder = -10;
  escena.add(fondo);

  // farol cálido detrás del juguete elegido: lo separa del fondo y hace vitrina
  const foco = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: texFoco, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    })
  );
  foco.position.z = -3.2;
  foco.renderOrder = -9;
  escena.add(foco);

  // ── horno de retratos ─────────────────────────────────────────────────────
  const escImp = new THREE.Scene();
  luces(escImp, 1.05);
  const camImp = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);

  // ── repisa: tablones + juguetes ──────────────────────────────────────────
  const matTablon = new THREE.MeshStandardMaterial({ color: MADERA, roughness: 0.9, metalness: 0.02 });
  const matCanto = new THREE.MeshStandardMaterial({ color: MADERA_CANTO, roughness: 0.8, metalness: 0.03 });
  const tablones = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group();
    const tabla = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), matTablon);
    const canto = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), matCanto);
    g.add(tabla, canto);
    g.visible = false;
    g.userData = { tabla, canto };
    escena.add(g);
    tablones.push(g);
  }

  // brillo bajo el elegido: una elipse pegada al tablón, no un disco flotante
  const brillos = [0, 1].map(() => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
      map: texFoco, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    m.renderOrder = 1;
    m.visible = false;
    escena.add(m);
    return m;
  });

  const planoUnitario = new THREE.PlaneGeometry(1, 1);
  const cupos = [];
  function nuevoCupo(tipo, idx) {
    const rt = new THREE.WebGLRenderTarget(RETRATO, RETRATO, {
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      samples: 4,          // MSAA: sin esto el borde del juguete queda de sierra
      generateMipmaps: true,
      depthBuffer: true,
    });
    const mat = new THREE.MeshBasicMaterial({
      map: rt.texture, transparent: true, depthWrite: false,
      // el retrato sale con alfa PREMULTIPLICADO (así resuelve el MSAA): sin
      // este blending cada juguete queda con un halo negro en el borde.
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const malla = new THREE.Mesh(planoUnitario, mat);
    malla.visible = false;
    malla.renderOrder = 3;
    escena.add(malla);
    // La sombra NO va horneada en el retrato: se queda en el tablón mientras el
    // juguete se levanta. Es lo que hace que se sienta que lo agarrás.
    const sombra = new THREE.Mesh(planoUnitario, new THREE.MeshBasicMaterial({
      map: texMancha, transparent: true, depthWrite: false, opacity: 0,
    }));
    sombra.renderOrder = 2;
    escena.add(sombra);
    const cupo = {
      tipo, idx, rt, mat, malla, sombra, listo: false, hov: 0, pop: 0,
      pieFrac: 0.18, px: { x: 0, y: 0, w: 1 }, base: null, orden: cupos.length,
    };
    cupos.push(cupo);
    return cupo;
  }
  for (let i = 0; i < VEHICULOS.length; i++) nuevoCupo('veh', i);
  for (let i = 0; i < PILOTOS.length; i++) nuevoCupo('pil', i);

  for (const c of cupos) {
    const datos = c.tipo === 'veh' ? VEHICULOS[c.idx] : PILOTOS[c.idx];
    const trancado = c.tipo === 'pil' && !!chipsPil[c.idx].disabled;
    const d = doc.createElement('div');
    d.className = 'eti' + (trancado ? ' trancado' : '');
    d.innerHTML = nombreCorto(datos.nombre)
      + (trancado ? `<span class="costo">${PILOTOS[c.idx].costoSemillas} semillas</span>` : '');
    etiquetasEl.appendChild(d);
    c.eti = d;
    c.trancado = trancado;
    // juguete todavía en la caja: se reconoce la silueta, pero está apagado
    if (trancado) c.mat.color.setRGB(0.40, 0.38, 0.36);
  }

  // ── escenario del elegido ─────────────────────────────────────────────────
  const estrella = new THREE.Group();
  escena.add(estrella);
  const manchaEstrella = new THREE.Mesh(planoUnitario, new THREE.MeshBasicMaterial({
    map: texMancha, transparent: true, depthWrite: false,
  }));
  manchaEstrella.renderOrder = 1;
  estrella.add(manchaEstrella);
  const tornamesa = new THREE.Group();
  estrella.add(tornamesa);
  const disco = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1.06, 1, 44),
    new THREE.MeshStandardMaterial({ color: 0x835833, roughness: 0.7, metalness: 0.05 })
  );
  tornamesa.add(disco);
  const giratorio = new THREE.Group();
  tornamesa.add(giratorio);

  // ── estado ────────────────────────────────────────────────────────────────
  const cacheVeh = new Map();
  const pilotosSueltos = new Map();
  let selVeh = 0, selPil = 0;
  for (let i = 0; i < chipsVeh.length; i++) if (chipsVeh[i].classList.contains('selected')) selVeh = i;
  for (let i = 0; i < chipsPil.length; i++) if (chipsPil[i].classList.contains('selected')) selPil = i;

  let modeloVivo = null;
  let anim = null;
  let vivo = true, activo = true;
  let carril = 'veh';
  let sobre = null;
  let L = null;
  let tAcum = 0;
  const cola = [];
  const reloj = new THREE.Clock();
  const puntero = new THREE.Vector2(-10, -10);
  const rayo = new THREE.Raycaster();

  // ── modelos ───────────────────────────────────────────────────────────────
  function obtenerVehiculo(id) {
    let e = cacheVeh.get(id);
    if (!e) {
      const v = VEHICULOS.find((x) => x.id === id) ?? VEHICULOS[0];
      const c = construirModeloVehiculo(THREE, { ...v, piloto: PILOTOS[selPil].id, sinLamina: true });
      c.grupo.traverse((o) => { if (o.isMesh) o.castShadow = false; });
      c.grupo.visible = false;
      e = {
        vehId: id, grupo: c.grupo, volante: c.volante ?? null,
        pilotoNuevo: c.pilotoNuevo ?? null, pilotoViejo: c.piloto ?? null,
        pilotoId: PILOTOS[selPil].id, medida: null,
      };
      cacheVeh.set(id, e);
    }
    return e;
  }

  // Cambiar de conductor sin reconstruir el vehículo: 1-12 ms en vez de 10-72.
  function ponerPiloto(e, pilotoId) {
    if (e.pilotoId === pilotoId) return e;
    if (e.pilotoNuevo?.grupo) {
      const viejo = e.pilotoNuevo.grupo;
      try {
        const nuevo = montarPilotoManejando(THREE, e.grupo, { tipo: pilotoId });
        nuevo.grupo.traverse((o) => { if (o.isMesh) o.castShadow = false; });
        viejo.parent?.remove(viejo);
        soltar(viejo);
        e.pilotoNuevo = nuevo;
        e.pilotoId = pilotoId;
        e.medida = null;
        return e;
      } catch (err) {
        console.warn('[selector3d] no pude cambiar el piloto en vivo:', err.message);
      }
    }
    // respaldo: reconstruir el vehículo entero con el piloto nuevo
    cacheVeh.delete(e.vehId);
    e.grupo.parent?.remove(e.grupo);
    soltar(e.grupo);
    return obtenerVehiculo(e.vehId);
  }

  function soltar(obj) {
    obj.traverse((o) => { if (o.isMesh) o.geometry?.dispose?.(); });
  }

  function pilotoSuelto(id) {
    let p = pilotosSueltos.get(id);
    if (!p) {
      p = crearPilotoManejando(THREE, { tipo: id, modo: 'cabina', escala: 1 });
      // Sin vehículo, aplicarPose cae en los apoyos de cabina (pies adelante,
      // hacia los pedales) y los once quedan SENTADOS en el aire, como si se
      // cayeran de espaldas. En la repisa el juguete va PARADO: pies bajo la
      // cadera, sobre el tablón.
      p.apoyos = {
        modo: 'local',
        L: new THREE.Vector3(0.13, 0.0, 0.06),
        R: new THREE.Vector3(-0.13, 0.0, 0.06),
      };
      aplicarPose(p, POSE_VITRINA); // sin pose los miembros quedan degenerados
      pilotosSueltos.set(id, p);
    }
    return p.grupo;
  }

  // ── horneado del retrato (uno por cuadro: sin tirón largo) ───────────────
  const _v3 = new THREE.Vector3();
  function hornear(cupo) {
    let obj, dir;
    const ocultos = [];
    if (cupo.tipo === 'veh') {
      const e = obtenerVehiculo(VEHICULOS[cupo.idx].id);
      obj = e.grupo;
      dir = VISTA_VEHICULO;
      // el estante de carros muestra el CARRO, no a quien lo maneja
      for (const g of [e.pilotoNuevo?.grupo, e.pilotoViejo?.grupo]) {
        if (g && g.visible) { ocultos.push(g); g.visible = false; }
      }
    } else {
      obj = pilotoSuelto(PILOTOS[cupo.idx].id);
      dir = VISTA_PILOTO;
    }

    const padreAnt = obj.parent;
    const pos = obj.position.clone(), rot = obj.rotation.clone(), esc = obj.scale.clone();
    const visAnt = obj.visible;
    obj.position.set(0, 0, 0); obj.rotation.set(0, 0, 0); obj.scale.setScalar(1);
    obj.visible = true;
    escImp.add(obj);

    const m = medidas(obj);
    // Escala suave DENTRO de cada familia: el camión se ve más grande que la
    // patineta, pero no diez veces más. Tamaño en pantalla ∝ mayor^0.35 — se
    // conserva la jerarquía sin que la patineta quede de mosca.
    const k = Math.pow(m.mayor, -0.65);
    obj.scale.setScalar(k);
    obj.position.set(-m.centro.x * k, -m.caja.min.y * k, -m.centro.z * k);

    const { R, cy } = ENCUADRE[cupo.tipo];
    const d = (R / Math.tan(FOV * 0.5 * DEG)) * 1.1;
    camImp.position.copy(dir).normalize().multiplyScalar(d);
    camImp.position.y += cy;
    camImp.lookAt(0, cy, 0);
    camImp.updateProjectionMatrix();
    camImp.updateMatrixWorld(true);
    // dónde cae el PISO del juguete dentro de la celda (0 = abajo, 1 = arriba).
    // Se mide, no se estima: de ahí sale la línea del tablón y de la sombra.
    cupo.pieFrac = (_v3.set(0, 0, 0).project(camImp).y + 1) / 2;

    const claroAnt = renderer.getClearColor(new THREE.Color());
    const alfaAnt = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(cupo.rt);
    renderer.render(escImp, camImp);
    renderer.setRenderTarget(null);
    renderer.setClearColor(claroAnt, alfaAnt);

    escImp.remove(obj);
    obj.position.copy(pos); obj.rotation.copy(rot); obj.scale.copy(esc);
    obj.visible = padreAnt ? visAnt : false;
    if (padreAnt) padreAnt.add(obj);
    for (const g of ocultos) g.visible = true;

    cupo.listo = true;
    cupo.malla.visible = true;
  }

  // ── layout: se piensa en píxeles y se traduce a mundo ────────────────────
  function mundoPorPx() {
    return (2 * DIST * Math.tan(FOV * 0.5 * DEG)) / (innerHeight || 1);
  }
  function aMundo(xPx, yPx) {
    const k = mundoPorPx();
    return { x: (xPx - innerWidth / 2) * k, y: (innerHeight / 2 - yPx) * k };
  }

  function repartir(n, anchoDisp, minSlot) {
    const porFila = clamp(Math.floor(anchoDisp / minSlot), 3, n);
    const filas = Math.ceil(n / porFila);
    const base = Math.ceil(n / filas);
    const out = [];
    let q = n;
    for (let f = 0; f < filas && q > 0; f++) { const c = Math.min(base, q); out.push(c); q -= c; }
    return out;
  }

  function layout() {
    const W = innerWidth, H = innerHeight;
    const angosto = W < 720;
    const margen = angosto ? 8 : 24;
    const anchoDisp = W - margen * 2;
    const k = mundoPorPx();

    const repVeh = repartir(VEHICULOS.length, anchoDisp, angosto ? 78 : 112);
    const repPil = repartir(PILOTOS.length, anchoDisp, angosto ? 74 : 98);
    const nFilas = repVeh.length + repPil.length;

    const altoTitulo = angosto ? 40 : 52;
    const altoPie = angosto ? 86 : 78;
    // el rótulo + aire para que el juguete ELEGIDO (que crece y se levanta) no
    // se meta encima del letrero de su repisa
    const altoRot = angosto ? 22 : 27;
    const altoEti = 15;         // el nombre bajo cada juguete
    const aire = 10;

    // La ficha se MIDE, no se estima: son 1-3 líneas según el nombre y con un
    // valor fijo se montaba encima del rótulo «LOS CARROS».
    fichaEl.style.top = '0px';
    const altoFicha = Math.ceil(fichaEl.getBoundingClientRect().height) + 8;

    const libre = H - altoTitulo - altoFicha - altoPie - altoRot * 2 - aire * 2;
    const slot = clamp(Math.floor(libre / (nFilas + 2.0)), 54, 128);
    const altoEstrella = clamp(libre - slot * nFilas, 120, 360);

    let y = 0;
    tituloEl.style.top = `${angosto ? 3 : 7}px`;
    y += altoTitulo;

    const yEstrella0 = y;
    y += altoEstrella;

    fichaEl.style.top = `${Math.round(y)}px`;
    y += altoFicha + aire;

    const filasPx = [];
    rotVehEl.style.top = `${Math.round(y)}px`;
    y += altoRot;
    for (const n of repVeh) { filasPx.push({ tipo: 'veh', n, y }); y += slot; }
    y += aire;
    rotPilEl.style.top = `${Math.round(y)}px`;
    y += altoRot;
    for (const n of repPil) { filasPx.push({ tipo: 'pil', n, y }); y += slot; }

    const porTipo = { veh: 0, pil: 0 };
    filasPx.forEach((f, iFila) => {
      const paso = Math.min(slot * 1.1, anchoDisp / f.n);
      const x0 = W / 2 - (paso * (f.n - 1)) / 2;
      const juguete = Math.min(paso * 0.98, slot - altoEti);
      let pisoPx = f.y + juguete * 0.82;
      for (let i = 0; i < f.n; i++) {
        const cupo = cupos.find((c) => c.tipo === f.tipo && c.idx === porTipo[f.tipo]);
        porTipo[f.tipo]++;
        if (!cupo) continue;
        const cx = x0 + paso * i;
        cupo.px = { x: cx, y: f.y, w: juguete };
        const m = aMundo(cx, f.y + juguete / 2);
        cupo.base = { x: m.x, y: m.y, esc: juguete * k, piso: m.y - juguete * k * (0.5 - cupo.pieFrac) };
        pisoPx = f.y + juguete * (1 - cupo.pieFrac);
        cupo.eti.style.left = `${Math.round(cx)}px`;
        cupo.eti.style.top = `${Math.round(f.y + juguete + 1)}px`;
        cupo.eti.style.width = `${Math.round(paso)}px`;
      }
      const t = tablones[iFila];
      if (t) {
        const anchoT = (paso * (f.n - 1) + juguete * 1.14) * k;
        const mT = aMundo(W / 2, pisoPx);
        t.visible = true;
        t.position.set(mT.x, mT.y, -0.34);
        t.userData.tabla.scale.set(anchoT, 0.1, 0.7);
        t.userData.tabla.position.set(0, -0.05, 0);
        t.userData.canto.scale.set(anchoT, 0.062, 0.09);
        t.userData.canto.position.set(0, -0.019, 0.35);
      }
    });
    for (let i = filasPx.length; i < tablones.length; i++) tablones[i].visible = false;

    // ── estrella: banda propia, y el modelo la LLENA ─────────────────────
    // Normalizar por la dimensión mayor dejaba a la chiva de 120 px de alto en
    // una banda de 310: un carro largo visto de frente es angosto. Se encuadra
    // por alto Y por la diagonal horizontal (el ancho peor caso del giro).
    const yPiso = yEstrella0 + altoEstrella - 16;
    const mb = aMundo(W / 2, yPiso);
    estrella.position.set(mb.x, mb.y, 0.7);
    const mFoco = aMundo(W / 2, yEstrella0 + altoEstrella * 0.47);
    foco.position.set(mFoco.x, mFoco.y, -3.2);
    const ladoFoco = Math.min(W * 0.85, altoEstrella * 3.4) * k * (1 + 3.2 / DIST);
    foco.scale.set(ladoFoco, ladoFoco * 0.8, 1);

    // el telón tiene que TAPAR el frustum a z=-14. Sin esta línea se pinta a
    // escala 1 y queda un cuadradito de 62 px en mitad de la pantalla.
    const hFondo = 2 * (DIST + 14) * Math.tan(FOV * 0.5 * DEG);
    fondo.scale.set(hFondo * (W / H) * 1.06, hFondo * 1.06, 1);

    L = {
      W, H, k, slot, angosto,
      bandaAlto: (altoEstrella - 34) * k,
      bandaAncho: Math.min(W * 0.60, 620) * k,
    };
    colocarEstrella();
    pieEl.style.bottom = `${angosto ? 6 : 10}px`;
  }

  function colocarEstrella() {
    if (!modeloVivo || !L) return;
    if (!modeloVivo.medida) modeloVivo.medida = medidaLocal(modeloVivo.grupo);
    const m = modeloVivo.medida;
    const dxz = Math.hypot(m.tam.x, m.tam.z) || 1;
    const esc = Math.min(L.bandaAlto / (m.tam.y * 1.18), L.bandaAncho / dxz);
    const rDisco = dxz * esc * 0.43;
    const grosor = Math.max(0.02, rDisco * 0.075);
    disco.scale.set(rDisco, grosor, rDisco);
    disco.position.y = grosor / 2;
    modeloVivo.grupo.scale.setScalar(esc);
    modeloVivo.grupo.position.set(-m.centro.x * esc, -m.caja.min.y * esc + grosor, -m.centro.z * esc);
    manchaEstrella.scale.setScalar(rDisco * 3.0);
    manchaEstrella.position.y = rDisco * 0.34;
    L.rDisco = rDisco;
  }

  // ── elegir ────────────────────────────────────────────────────────────────
  function elegirVehiculo(i, silencio = false) {
    if (i === selVeh || i == null) return;
    selVeh = i;
    if (!silencio) chipsVeh[i].click();
    anim = { fase: 'sale', t: 0, dur: 0.15 };
    marcar();
  }
  function elegirPiloto(i, silencio = false) {
    if (i === selPil || i == null || chipsPil[i].disabled) return;
    selPil = i;
    if (!silencio) chipsPil[i].click();
    anim = { fase: 'sale', t: 0, dur: 0.12 };
    marcar();
  }

  function armarEstrella() {
    let e = obtenerVehiculo(VEHICULOS[selVeh].id);
    e = ponerPiloto(e, PILOTOS[selPil].id);
    if (modeloVivo && modeloVivo !== e) {
      giratorio.remove(modeloVivo.grupo);
      modeloVivo.grupo.visible = false;
    }
    modeloVivo = e;
    modeloVivo.grupo.visible = true;
    modeloVivo.medida = null;
    giratorio.add(modeloVivo.grupo);
    colocarEstrella();
  }

  function marcar() {
    for (const c of cupos) {
      const on = (c.tipo === 'veh' && c.idx === selVeh) || (c.tipo === 'pil' && c.idx === selPil);
      c.eti.classList.toggle('on', on);
      if (on) c.pop = 1;
    }
    const v = VEHICULOS[selVeh], p = PILOTOS[selPil];
    fichaEl.innerHTML = `
      <div class="nom">${v.nombre}</div>
      <div class="con">con ${p.nombre} manejando · ${p.poder}</div>
      <div class="dat">Vel <b>${Math.round(v.velMax * 3.6)}</b> km/h &nbsp;·&nbsp;
        Acel <b>${v.acel}</b> &nbsp;·&nbsp; Agarre <b>${v.agarre}</b>${
  p.cientifico ? ` &nbsp;·&nbsp; <i>${p.cientifico}</i>` : ''}</div>`;
  }

  // ── entrada ───────────────────────────────────────────────────────────────
  function coordsPuntero(ev) {
    const r = lienzo.getBoundingClientRect();
    puntero.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    puntero.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  }
  function bajoPuntero() {
    rayo.setFromCamera(puntero, camara);
    const hits = rayo.intersectObjects(cupos.filter((c) => c.listo).map((c) => c.malla), false);
    return hits.length ? cupos.find((c) => c.malla === hits[0].object) ?? null : null;
  }
  lienzo.addEventListener('pointermove', (ev) => {
    coordsPuntero(ev);
    sobre = bajoPuntero();
    lienzo.style.cursor = sobre && !sobre.trancado ? 'pointer' : 'default';
  });
  lienzo.addEventListener('pointerleave', () => { sobre = null; puntero.set(-10, -10); });
  lienzo.addEventListener('pointerdown', (ev) => {
    coordsPuntero(ev);
    const c = bajoPuntero();
    if (!c) return;
    carril = c.tipo;
    if (c.tipo === 'veh') elegirVehiculo(c.idx); else elegirPiloto(c.idx);
  });

  function mover(d) {
    if (carril === 'veh') {
      elegirVehiculo((selVeh + d + VEHICULOS.length) % VEHICULOS.length);
    } else {
      let i = selPil;
      for (let n = 0; n < PILOTOS.length; n++) {
        i = (i + d + PILOTOS.length) % PILOTOS.length;
        if (!chipsPil[i].disabled) break;
      }
      elegirPiloto(i);
    }
  }
  addEventListener('keydown', (ev) => {
    if (!activo || raiz.classList.contains('oculto')) return;
    const k = ev.code;
    if (k === 'ArrowLeft' || k === 'KeyA') mover(-1);
    else if (k === 'ArrowRight' || k === 'KeyD') mover(1);
    else if (k === 'ArrowUp' || k === 'KeyW') carril = 'veh';
    else if (k === 'ArrowDown' || k === 'KeyS') carril = 'pil';
    else if (k === 'Enter') startBtn.click();
  });

  raiz.querySelector('.arrancar').addEventListener('click', () => startBtn.click());
  raiz.querySelector('.mas').addEventListener('click', () => {
    raiz.classList.add('oculto');
    intro.style.visibility = 'visible';
    btnVolver.classList.add('on');
  });
  btnVolver.addEventListener('click', () => {
    raiz.classList.remove('oculto');
    intro.style.visibility = 'hidden';
    btnVolver.classList.remove('on');
    // el panel clásico pudo cambiar la selección: se relee de ahí
    for (let i = 0; i < chipsVeh.length; i++) {
      if (chipsVeh[i].classList.contains('selected')) elegirVehiculo(i, true);
    }
    for (let i = 0; i < chipsPil.length; i++) {
      if (chipsPil[i].classList.contains('selected')) elegirPiloto(i, true);
    }
  });

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camara.aspect = innerWidth / innerHeight;
    camara.updateProjectionMatrix();
    layout();
  });

  // el intro se apaga cuando arranca la carrera: ahí este selector se calla
  const obs = new MutationObserver(() => {
    if (intro.classList.contains('hidden') && activo) {
      activo = false;
      raiz.style.transition = 'opacity .35s';
      raiz.style.opacity = '0';
      setTimeout(() => { raiz.style.display = 'none'; btnVolver.remove(); }, 380);
    }
  });
  obs.observe(intro, { attributes: true, attributeFilter: ['class'] });

  // ?autoStart=1 (lo usa el gate) larga la carrera en un microtask, o sea
  // ANTES de que este módulo termine de cargar: el observer se monta cuando el
  // cambio de clase ya pasó y no lo ve nunca. Sin este chequeo la repisa se
  // queda tapando una carrera que ya arrancó.
  if (intro.classList.contains('hidden') || getComputedStyle(intro).display === 'none') {
    activo = false;
    raiz.style.display = 'none';
    btnVolver.remove();
    intro.style.visibility = '';
  }

  // ── arranque ──────────────────────────────────────────────────────────────
  armarEstrella();
  marcar();
  layout();
  cola.push(
    ...cupos.filter((c) => c.tipo === 'veh' && c.idx === selVeh),
    ...cupos.filter((c) => c.tipo === 'pil' && c.idx === selPil),
    ...cupos.filter((c) => !((c.tipo === 'veh' && c.idx === selVeh) || (c.tipo === 'pil' && c.idx === selPil)))
  );

  // ── bucle ─────────────────────────────────────────────────────────────────
  function cuadro() {
    if (!vivo) return;
    requestAnimationFrame(cuadro);
    if (!activo || raiz.classList.contains('oculto') || doc.hidden) { reloj.getDelta(); return; }

    const dt = Math.min(0.05, reloj.getDelta());
    tAcum += dt;

    if (cola.length) {
      const c = cola.shift();
      try { hornear(c); } catch (e) {
        console.warn('[selector3d] no horneó', c.tipo, c.idx, e.message);
      }
      layout(); // el retrato acaba de decir dónde tiene los pies
    }

    // transición con peso: el juguete viejo se hunde, el nuevo sube y rebota.
    // Con movimiento reducido el cambio salta directo al estado final.
    let escAnim = 1, yAnim = 0, spin = 0;
    if (reducedMotionSel) {
      anim = null;
    } else if (anim) {
      anim.t += dt;
      const u = clamp(anim.t / anim.dur, 0, 1);
      if (anim.fase === 'sale') {
        const e = easeInCubic(u);
        escAnim = 1 - 0.46 * e; yAnim = -0.30 * e; spin = -1.6 * e;
        if (u >= 1) { armarEstrella(); anim = { fase: 'entra', t: 0, dur: 0.46 }; }
      } else {
        escAnim = 0.54 + 0.46 * easeOutBack(u, 2.2);
        yAnim = -0.32 * (1 - easeOutCubic(u));
        spin = 2.0 * (1 - easeOutCubic(u));
        if (u >= 1) anim = null;
      }
    }

    // la tornamesa gira siempre, pero se demora en el tres cuartos delantero.
    // Con movimiento reducido queda quieta en la pose de vitrina.
    const tau = reducedMotionSel ? 1.15 : tAcum * 0.40 + 1.15;
    const bandaY = (L?.bandaAlto ?? 1);
    tornamesa.rotation.y = tau - 0.62 * Math.sin(tau) + spin;
    tornamesa.position.y = yAnim * bandaY * 0.4
      + (reducedMotionSel ? 0 : Math.sin(tAcum * 1.4) * bandaY * 0.008);
    tornamesa.scale.setScalar(escAnim);
    manchaEstrella.material.opacity = clamp(escAnim, 0, 1);

    // el piloto respira, mira la curva y aletea: eso es lo que lo hace juguete
    // vivo y no maniquí. Con movimiento reducido queda en pose de vitrina.
    const pil = modeloVivo?.pilotoNuevo;
    if (pil) {
      const giro = reducedMotionSel ? 0 : Math.sin(tAcum * 0.53) * 0.45;
      const turbo = reducedMotionSel ? 0 : Math.max(0, Math.sin(tAcum * 0.29 - 1.1)) ** 6;
      aplicarPose(pil, reducedMotionSel
        ? { giro: 0, turbo: 0, salto: 0, velocidad: 0, t: 0 }
        : { giro, turbo, salto: 0, velocidad: 0.24 + 0.2 * turbo, t: tAcum });
      if (modeloVivo.volante) modeloVivo.volante.rotation.z = Math.PI / 2 - giro * 0.55;
    }

    // juguetes de la repisa: respiran despacio, se levantan al pasar el dedo.
    // Con movimiento reducido no respiran ni rebotan al elegirlos.
    for (const c of cupos) {
      if (!c.listo || !c.base) continue;
      const on = (c.tipo === 'veh' && c.idx === selVeh) || (c.tipo === 'pil' && c.idx === selPil);
      c.hov = lerp(c.hov, sobre === c && !c.trancado ? 1 : 0, 1 - Math.exp(-14 * dt));
      c.pop = Math.max(0, c.pop - dt * 2.8);
      const brinco = reducedMotionSel ? 0 : Math.sin(c.pop * Math.PI) * 0.17;
      const alza = c.hov * 0.13 + (on ? 0.09 : 0) + brinco;
      const respira = reducedMotionSel ? 0 : Math.sin(tAcum * 1.2 + c.orden * 0.72) * 0.012;
      const e = c.base.esc * (1 + c.hov * 0.09 + (on ? 0.1 : 0) + brinco * 0.4);
      c.malla.position.set(c.base.x, c.base.y + (alza + respira) * c.base.esc, 0.06 + c.hov * 0.25);
      c.malla.scale.set(e, e, 1);
      if (!c.trancado) c.mat.color.setScalar(on ? 1 : 0.84 + c.hov * 0.16);
      // el nombre NO se levanta con el juguete: se queda clavado en el tablón.
      // Subiéndolo se le metía entre las patas al elegido.
      // la sombra se queda en el tablón: encoge y se aclara cuando lo levantás
      const s = c.sombra;
      s.material.opacity = (c.trancado ? 0.5 : 0.9) * (1 - clamp(alza * 2.4, 0, 0.55));
      const ls = c.base.esc * (0.9 - alza * 0.5);
      s.scale.set(ls, ls * 0.3, 1);
      s.position.set(c.base.x, c.base.piso + c.base.esc * 0.015, 0.04);
    }

    ponerBrillo(brillos[0], cupos.find((c) => c.tipo === 'veh' && c.idx === selVeh));
    ponerBrillo(brillos[1], cupos.find((c) => c.tipo === 'pil' && c.idx === selPil));

    renderer.info.reset();
    renderer.render(escena, camara);
    if (opts.perf && Math.floor(tAcum) !== Math.floor(tAcum - dt)) {
      const i = renderer.info.render;
      console.log(`[selector3d] calls=${i.calls} tris=${i.triangles}`);
    }
  }

  function ponerBrillo(m, c) {
    if (!c || !c.base || !c.listo) { m.visible = false; return; }
    m.visible = true;
    m.material.opacity = reducedMotionSel ? 0.5 : 0.5 + 0.14 * Math.sin(tAcum * 2.3);
    m.position.set(c.base.x, c.base.piso + c.base.esc * 0.06, 0.03);
    m.scale.set(c.base.esc * 1.15, c.base.esc * 0.42, 1);
  }

  requestAnimationFrame(cuadro);

  return {
    raiz, renderer, escena, camara,
    elegirVehiculo, elegirPiloto,
    get seleccion() { return { vehiculo: VEHICULOS[selVeh].id, piloto: PILOTOS[selPil].id }; },
    // superficie de prueba: dónde está cada juguete en pantalla
    get juguetes() {
      return cupos.map((c) => ({
        tipo: c.tipo, idx: c.idx,
        id: (c.tipo === 'veh' ? VEHICULOS : PILOTOS)[c.idx].id,
        x: Math.round(c.px.x), y: Math.round(c.px.y + c.px.w / 2),
        listo: c.listo, trancado: c.trancado,
      }));
    },
    get horneando() { return cola.length; },
    get drawCalls() { return renderer.info.render.calls; },
    destruir() {
      vivo = false; obs.disconnect();
      for (const c of cupos) { c.rt.dispose(); c.mat.dispose(); c.sombra.material.dispose(); }
      renderer.dispose();
      raiz.remove(); btnVolver.remove(); hoja.remove();
      intro.style.visibility = 'visible';
    },
  };
}

// ── luces compartidas por el escenario y por el horno de retratos ──────────
function luces(esc, k) {
  esc.add(new THREE.HemisphereLight(0xfff0cf, 0x3d3123, 1.15 * k));
  const key = new THREE.DirectionalLight(0xfff2d4, 1.65 * k);
  key.position.set(-2.4, 3.4, 3.0);
  esc.add(key);
  const relleno = new THREE.DirectionalLight(0xc2dcff, 0.62 * k);
  relleno.position.set(3.4, 1.1, 1.6);
  esc.add(relleno);
  const contra = new THREE.DirectionalLight(0xffd9a0, 0.7 * k);
  contra.position.set(0.6, 2.0, -3.2);
  esc.add(contra);
}

function nombreCorto(n) {
  return String(n)
    .replace(/^(El|La|Los|Las)\s+/i, '')
    .replace(/\s+del\s+.*$/i, '')
    .replace(/\s+de\s+la\s+.*$/i, '');
}
