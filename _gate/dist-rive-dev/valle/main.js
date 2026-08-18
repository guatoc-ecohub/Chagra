// ── Valle de Guatoc · atardecer sobre el cañón de La Chorrera ────────────────
// Hero shot: parado en el deck, el domo a un lado, La Chorrera monumental al
// fondo (escalonada, ~590 m), niebla subiendo por la ladera, golden hour.
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
// Gradeo fílmico de lib3d: color-grade cinematográfico DESPUÉS del OutputPass.
// Saca la mirada «Humboldt ilustrado» del panel de arte en una sola patada, y
// unifica el look de TODA la app (el valle y los 9 mundos autónomos gradaban suelto).
import { ShaderGradeoFinal } from './lib3d/post/gradeoFinal.js';

import { makeTerrain, height, K, CHIFLON_X, CHIFLON_T0, SITE_X, SITE_Z } from './terrain.js';
import { makeCliff, facePos, pathX, T_NACE } from './cliff.js';
import { makeAtmosphere } from './atmosphere.js';
import { makeWaterfalls } from './waterfalls.js';
import { makeSite } from './structures.js';
import { makeFlora } from './flora.js';
import { makePortales } from './portales.js';
import { crearCompaiGuia } from './compai/guiaLamina.js';
import { makeMundos, MUNDOS as MUNDOS_DATOS } from './mundos.js';
import { makeElementos } from './elementos.js';
import { makePaseo } from './paseo.js';
import { makeLeccionAgua } from './leccion-agua.js';
import { makeParamo } from './paramo.js';
// El mundo insignia rescatado de wip/paramo-vivo (frailejón-Ent + queñua +
// chivito + Compai + descenso a micorrizas/célula). Ver paramo-vivo.js.
import { montarMundoParamoVivo } from './paramo-vivo.js';
// La milpa de tres hermanas (maíz + fríjol + ahuyama juntos) — módulo escrito y
// probado en su propio harness que vivía con CERO importadores. Su sitio en el
// paisaje es la zona de cultivo (los bancales de la huerta, `plantas` en
// x=-110,z=-100): milpa en zona de cultivo, quebrada en el páramo. `actualizar`
// releva el anillo de héroes con la cámara (1×/frame, en el bucle).
import { crearMilpa } from './lib3d/flora/milpaTresHermanas.js';
import { makeMundoAnimales } from './animales.js';
// ── VIENTO DE MUNDOS (r2 2026-08-11): el valle avanza el reloj GLOBAL de
// vientoMundos EXPLÍCITAMENTE en su loop. Antes solo vivía por el auto-tick de
// quickGrass (un efecto secundario: si ese módulo dejara de importarse, toda la
// flora del valle se congelaría en silencio — regla dura: ningún árbol quieto).
// Con TIEMPO_FIJO (gates deterministas) el reloj queda clavado a propósito.
import { tickVientoMundos } from './lib3d/flora/vientoMundos.js';
// ── NOCHE ── (`?hora=noche`: el mismo valle, de noche — ver noche.js)
import { makeNoche } from './noche.js';
import { crearAudioParamo } from './lib3d/audio/proceduralParamo.js';

// La estación del domo salta el onboarding (`onb=0`), pero el valle y el juego
// igual necesitan la guía canónica para entrar con un compai válido. Se hace
// antes de montar portales (que lee esta llave) y sólo si la estación llega en
// frío: una elección previa siempre conserva prioridad.
const esAhorcado = new URLSearchParams(location.search).get('juego') === 'ahorcado';
if (esAhorcado && !localStorage.getItem('guatoc.guia')) {
  localStorage.setItem('guatoc.guia', 'angelita');
}

// ── ┃F4┃ VISTA GLOBAL — pisos térmicos (bloque marcado; Opus integra) ────────
// modo ?vista=global: la navegación GRANDE por pisos térmicos (lámina Humboldt)
// toma la pantalla entera. El módulo es AUTÓNOMO — monta su propio canvas y
// suprime el valle (oculta #c + para este loop). Ver vista-global.js.
if (new URLSearchParams(location.search).get('vista') === 'global') {
  import('./vista-global.js').then((m) => m.initVistaGlobal());
}
// ─────────────────────────────────────────────────────────────────────────────

// ── BOSQUE ARCHIVADO 2026-08-12 (operador: low-poly/vacío/insípido) ───────────
// Recuperable en tag archivo/mundo-bosque-vanilla. Reactivar = descomentar.
// if (new URLSearchParams(location.search).get('mundo') === 'bosque') {
//   import('./bosque.js').then((m) => m.initBosque());
// }
// ── DEFENSORES ── (`?juego=defensores`: run-and-gun del campo, control biológico)
if (new URLSearchParams(location.search).get('juego') === 'defensores') {
  import('./defensores.js').then((m) => m.initDefensores());
}
// ── ABEJAS ── (`?mundo=abejas`: el colmenar de la angelita — mundo autónomo)
if (new URLSearchParams(location.search).get('mundo') === 'abejas') {
  import('./abejas.js').then((m) => m.initAbejas());
}
// ── SIEMBRA ── (`?mundo=siembra`: capacidad del compai — toca, siembra y registra)
// Se conserva como mundo autónomo para que la escena de trabajo pueda encuadrar
// el lote y acompañar la obra; comparte elenco, flora ez-tree y almacenamiento
// local del valle con el resto de la app.
if (new URLSearchParams(location.search).get('mundo') === 'siembra') {
  import('./siembra.js').then((m) => m.initSiembra());
}
// ── CAFETAL ── (`?mundo=cafetal`: el cafetal de sombra del piso templado — autónomo)
if (new URLSearchParams(location.search).get('mundo') === 'cafetal') {
  import('./cafetal.js').then((m) => m.initCafetal());
}
// ── MERCADO ── (`?mundo=mercado`: la plaza de mercado campesina — autónomo)
if (new URLSearchParams(location.search).get('mundo') === 'mercado') {
  import('./mercado.js').then((m) => m.initMercado());
}
// ── AGUACATAL ── (`?mundo=aguacatal`: el aguacatal agroecológico del piso templado — autónomo)
if (new URLSearchParams(location.search).get('mundo') === 'aguacatal') {
  import('./aguacatal.js').then((m) => m.initAguacatal());
}
// ── PAPA ── (`?mundo=papa`: el papal agroecológico de la tierra fría — autónomo)
if (new URLSearchParams(location.search).get('mundo') === 'papa') {
  import('./papa.js').then((m) => m.initPapa());
}
// ── INVERNADERO ── (`?mundo=invernadero`: el cultivo protegido, casa de arcos — autónomo)
if (new URLSearchParams(location.search).get('mundo') === 'invernadero') {
  import('./invernadero.js').then((m) => m.initInvernadero());
}
// ── CEIBA ── (`?mundo=ceiba`: el Ent de la tierra caliente, el gigante emergente — autónomo)
if (new URLSearchParams(location.search).get('mundo') === 'ceiba') {
  import('./ceiba.js').then((m) => m.initCeiba());
}
// ─────────────────────────────────────────────────────────────────────────────

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
// ── PixelRatio adaptativo (Fase 0 perf-audit) ──────────────────────────────
// El cuello del valle en celular es el FILL-RATE, no las draw calls: con dpr=3
// se rasterizan ~4× los píxeles reales. Se arranca en el techo del dispositivo
// (min(dpr,2)) y en el loop un monitor de frame-time con HISTÉRESIS lo baja
// hacia 1.0 si el frame promedio se pasa de 22 ms, y lo vuelve a subir si baja
// de 14 ms — sin oscilar, porque la banda [14,22] es zona muerta. Ver `adaptPR`.
const PR_MAX = Math.min(devicePixelRatio, 2);
const PR_MIN = 1.0;
let prNow = PR_MAX;                 // pixelRatio efectivo actual
renderer.setPixelRatio(prNow);
renderer.setSize(innerWidth, innerHeight);

// ── Compatibilidad de postfx ──────────────────────────────────────────────
// EffectComposer r160 crea targets HalfFloatType. En WebGL2 eso depende de
// EXT_color_buffer_float; si el FBO no queda completo, el canvas puede quedar
// en blanco aunque el contexto WebGL y el DOM sí estén vivos. Se prueba el
// target real y se conserva un camino directo para GPUs móviles que no lo
// soporten. El valle no necesita targets Float32.
const gl = renderer.getContext();
const coarsePointer = matchMedia('(pointer: coarse)').matches;
const halfFloatColorExt = renderer.capabilities.isWebGL2
  ? renderer.extensions.has('EXT_color_buffer_float')
  : renderer.extensions.has('EXT_color_buffer_half_float');
let halfFloatTargetOK = false;
if (halfFloatColorExt) {
  const probe = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  try {
    renderer.setRenderTarget(probe);
    halfFloatTargetOK = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  } finally {
    renderer.setRenderTarget(null);
    probe.dispose();
  }
}
// El camino directo en táctil evita además combinaciones frágiles de
// HalfFloat, MSAA y shaders fullscreen en drivers móviles; no cambia la escena.
const postfxOK = !coarsePointer && halfFloatTargetOK;
const postfxMSAA = postfxOK && !coarsePointer
  && renderer.capabilities.isWebGL2 && renderer.capabilities.maxSamples >= 4;
window.__webgl = {
  webgl2: renderer.capabilities.isWebGL2,
  halfFloatColorExt,
  halfFloatTargetOK,
  maxSamples: renderer.capabilities.maxSamples,
  postfxOK,
  postfxMSAA,
};
// ── AgX tonemap (Fase 0 perf-audit) ───────────────────────────────────────
// Antes ACES (1.38): en el amanecer sobre la bruma dejaba los blancos con el
// tinte «HDR de videojuego». AgX (nativo r160) mantiene los blancos NEUTROS
// —look de lámina Humboldt, no de motor de juego—. AgX comprime un pelo más el
// rango alto y sale un toque más oscuro que ACES, así que se sube la exposición
// (1.38 → 1.55) para conservar el brillo del golden hour sin quemar.
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.55;
renderer.outputColorSpace = THREE.SRGBColorSpace;
window.__r = renderer; // hook del gate visual: draw calls + renderer string

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 9000);
// Audio procedural del páramo: se crea sin abrir AudioContext hasta un gesto.
// El eco consulta el mismo heightfield del valle que usa el render. `audio=0`
// es el control pareado del gate: mismo mundo, sin importar la integración.
const audioHabilitado = new URLSearchParams(location.search).get('audio') !== '0';
const audioParamo = audioHabilitado
  ? crearAudioParamo({ alturaEn: height, posicion: () => camera.position })
  : null;
window.__audioParamo = audioParamo;
if (audioParamo) {
  addEventListener('pointerdown', () => { audioParamo.despertar(); }, { passive: true });
  addEventListener('keydown', (event) => {
    audioParamo.despertar();
    if (event.code === 'KeyE') audioParamo.emitirEco();
  }, { passive: true });
}

// ── ENCUADRE DE FOTO DE CELULAR ──────────────────────────────────────────
// (subido aquí desde más abajo: la PANORÁMICA de entrada se AJUSTA contra el
// fov real, así que el fov tiene que estar puesto antes de calcularla.)
// Las fotos del operador son 4:3 en vertical de la cámara principal de un
// celular (file_158 llega a 964×1280; Telegram le borra el EXIF, así que la
// focal es un supuesto razonado, no una medición): en ese formato el lado
// LARGO del cuadro abarca ~68°. Se le aplica al lado LARGO del viewport, que
// es lo que hace una cámara de celular cuando uno la gira: en un monitor
// apaisado da ~68° horizontales, y en 4:3 vertical (el tamaño con el que se
// captura el gate) reproduce la foto exacta: 68° verticales × 54° horizontales.
// Se aplica al aterrizaje, a la panorámica y a `?cam=guatoc`; los demás
// cuadros fijos conservan su fov de siempre para que las regresiones de las
// rondas anteriores sigan comparables.
const camMode = new URLSearchParams(location.search).get('cam');
// la LECCIÓN DE UN MUNDO sobre el valle real (`?leccion=agua`): el marco de
// /agua/ embebe el valle mismo — la lección corre sobre La Chorrera de verdad,
// no sobre un diorama aparte (orden del operador, 2026-07-30)
const leccionModo = new URLSearchParams(location.search).get('leccion');
// `?t=<seg>` CONGELA el reloj del mundo en un instante fijo (gate del campo de
// tierra, bench pasto-ralo): viento, agua, nubes, grano de película y demás
// movimiento derivado del tiempo dejan de avanzar → dos capturas comparan la
// MISMA escena. Sin esto el valle es un mundo vivo y el piso de ruido de un
// diff de píxeles (RMSE ~5.7%) supera la señal del campo. La cámara la manda
// `?cam=`. `?t=` no altera el montaje ni el render: solo fija el argumento t.
const _tFijo = new URLSearchParams(location.search).get('t');
const TIEMPO_FIJO = _tFijo === null || Number.isNaN(Number(_tFijo)) ? null : Number(_tFijo);
const FOV_LARGO = 68;
let fovLibre = false;
function fovCelular() {
  if (!fovLibre) return;
  const a = innerWidth / innerHeight;
  camera.fov = a >= 1
    ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(FOV_LARGO) / 2) / a))
    : FOV_LARGO;
  camera.updateProjectionMatrix();
}
if (!camMode || camMode === 'guatoc' || camMode === 'foto158' || camMode === 'aoe') { fovLibre = true; fovCelular(); }

// ── construir el mundo ──
// TIERRA (`?dirt=1` la enciende): el campo de suelo desnudo del valle (bench
// pasto-ralo). Lo leen el terreno (tinte de tierra) y la flora (raleo del
// pasto) — encender los dos a la vez es el brazo B del gate A/B.
//
// DEFECTO = APAGADO (tick 2026-08-10 02:2x). Nació encendido y eso publicó el
// efecto en 3d.guatoc.co sin juicio de arte: acá el server sirve el
// WORKING-TREE, así que "no commitear" NO es "no publicar" — la decisión del
// 08-10 00:30 de no commitearlo no lo sacó de producción, como se creyó. El
// efecto FUNCIONA (probado a ojo con par congelado `?t=50`, única variable:
// vetas ocres visibles en la ladera); lo que falta es el juicio de dosis
// contra la regla verde-dominante, y ese es del operador. Para verlo:
// `?dirt=1&t=50` vs `?dirt=0&t=50`.
const TIERRA_ON = new URLSearchParams(location.search).get('dirt') === '1';
const { group: terrainG } = makeTerrain({ dirt: TIERRA_ON });
terrainG.name = 'terrain';
terrainG.userData.perfSystem = 'terrain';
scene.add(terrainG);
makeCliff(scene);
const atmos = makeAtmosphere(scene, renderer);
const waterSeed = Number(new URLSearchParams(location.search).get('waterSeed')) || 20260811;
const falls = makeWaterfalls(scene, { seed: waterSeed });
const site = makeSite(scene);
const floraPerf = makeFlora(scene, { dirt: TIERRA_ON });
floraPerf.group.name = 'flora';
floraPerf.group.traverse((o) => { o.userData.perfSystem = 'flora'; });
for (const patch of floraPerf.pastoParches || []) {
  patch?.traverse?.((o) => { o.userData.perfSystem = 'flora'; });
}
// la guía viva + la VENTANA DE MUNDOS que abre el DOMO (los anillos-portal
// salieron: los mundos principales viven en la ventana — ver portales.js)
const portales = makePortales(scene, camera, canvas, site.domoClicables);
const compaiGuia = crearCompaiGuia({
  scene,
  camera,
  activo: new URLSearchParams(location.search).get('compai') === '1',
});
// ── LOS NUEVE MUNDOS COMO LUGARES DEL PAISAJE ────────────────────────────
// No son enlaces: son puntos del valle con un mojón que se ve desde el domo.
// La ubicación ENSEÑA la relación (el abono a 55 m del corral). Ver mundos.js
// para el puesto medido de cada uno y su porqué.
// ── ADÓNDE MIRAN LOS MOJONES QUE MIRAN A ALGO ────────────────────────────
// El mundo del agua APUNTA a La Chorrera (orden del operador 2026-07-26). El
// destino NO es una coordenada horneada: es el mismo punto de la caída que
// encuadra el gate (`facePos(pathX(0.45), 0.45)`, la media caída), o sea si
// mañana se mueve la cascada, la flecha se mueve con ella.
const _fx = pathX(0.45), _ff = facePos(_fx, 0.45);
const MIRAS = { chorrera: { x: _fx, z: _ff.z, y: _ff.y } };
// ── LA PARED COMO SOPORTE DE MUNDOS ──────────────────────────────────────
// «Lo más importante es que el mundo SE INTEGRE en el valle. El mundo del
//  clima, que se vea en la pared de La Chorrera.» (operador, 2026-07-26)
// El punto de la pared lo da `cliff.js` — la MISMA piel que la dibuja — así
// que el mundo cuelga del accidente real: si la pared se mueve, se mueve con
// ella. `t` es la altura sobre la caída (0 = pie · 1 = filo) y `dx` cuánto se
// aparta del hilo de agua.
const pared = (t, dx = 0) => {
  const x = pathX(t) + dx;
  const f = facePos(x, t);
  // +z hacia la casa: la marca sobresale un pelo de la roca para que no se
  // pelee con el z-buffer de la piel del acantilado.
  return { x, y: f.y, z: f.z + 3.2 };
};
const mundos = makeMundos(scene, camera, canvas, {
  movibles: site.movibles,
  miras: MIRAS,
  pared,
  guiaId: () => portales.guiaId(),
  onAviso: (M) => portales.toast(`🚧 ${M.nombre}: ${M.aviso || 'sin ruta todavía'}`),
  onEntrar: (M, url) => {
    portales.toast(`${M.emoji} Entrando al mundo: ${M.nombre}…`);
    setTimeout(() => { location.href = url; }, 750);
  },
  // la lupa 2D congela el gesto de navegar (pero NO desmonta el valle: al
  // cerrar, la cámara sigue exactamente donde estaba)
  onLupa: (abierta) => { controls.enabled = !abierta && introDone && revealDone; },
  onModo: (activo) => { controls.enabled = !activo && introDone && revealDone; },
  // la flecha de borde lleva la mirada al mundo que quedó fuera de cuadro
  onMirar: (p) => { if (controls.enabled) { controls.target.copy(p); controls.update(); } },
});

// ── LOS MUNDOS SON SUS ELEMENTOS, EN EL PAISAJE ──────────────────────────
// «La solución para que los mundos parezcan lo que son es integrarlos en el
//  paisaje CON SUS ELEMENTOS» (operador, 2026-07-26). El corral con su hato,
//  la biofábrica con sus pilas y canecas, los bancales, la bocatoma, los tres
//  estratos, la plaza, el mirador, el frailejonal — cada uno plantado en el
//  puesto MEDIDO de su mundo. Y Dante y Oliver rondando la finca ENTERA.
const elementos = makeElementos(scene, MUNDOS_DATOS);
window.__elementos = elementos;   // hook del gate: retratos de Dante y Oliver
elementos.grupo.traverse((o) => { o.userData.perfSystem = 'criaturas'; });
for (const item of site.movibles || []) {
  item.obj?.traverse?.((o) => { o.userData.perfSystem = 'sitio'; });
}

// ── LA MILPA DE TRES HERMANAS EN LA ZONA DE CULTIVO ───────────────────────
// Junto a los bancales de la huerta (`plantas`, x=-110,z=-100): maíz + fríjol
// + ahuyama. `?milpa=0` la apaga (baseline A/B del gate, como `?flores=0`).
// El recuadro evita el diorama de los bancales y el patio de la casa; el
// terreno es de huerta (pendiente baja-mediana, surcos a nivel).
const MILPA_AREA = { x0: -100, x1: -45, z0: -130, z1: -85 };
const MILPA_LIBRE = (x, z) => Math.hypot(x + 110, z + 100) > 14
  && Math.hypot(x, z) > 26;
const milpa = new URLSearchParams(location.search).get('milpa') === '0'
  ? null
  : crearMilpa({
      area: MILPA_AREA,
      alturaEn: (x, z) => height(x, z),
      libre: MILPA_LIBRE,
      seed: 20260807,
      // el manto se ve desde el domo de Guatoc (la milpa cae a ~150 u de esa
      // vista oficial): con el corte por defecto (150) quedaba en el borde y
      // aparecía/desaparecía al panear. 220 = visible estable desde el mirador.
      corte: 220,
      niebla: null,
    });
if (milpa) {
  scene.add(milpa.grupo);
  window.__milpa = milpa.stats();   // hook del gate (conteo + tiles)
}

// ── EL PUNTO DE VISTA DE GUATOC ──────────────────────────────────────────
// El operador VIVE aquí y fotografía el cañón parado en el domo, de frente a
// La Chorrera (referencias/file_158). Todos los gates anteriores se juzgaron
// desde cámaras que NO son ese punto —el aterrizaje anterior estaba a
// (-150, suelo+301, 610), o sea 484 m POR ENCIMA del sitio y a 2,5 km: una
// toma de dron— y por eso tres arreglos "pasaron" y el bug siguió a la vista.
// De aquí en adelante el gate oficial es `?cam=guatoc`, que es exactamente
// este mismo puesto, y el aterrizaje por defecto cae en él.
//
// Medido (probe-guatoc.mjs, escala K=0.6 u/m del terreno):
//   · domo en (-31.2, 40.6); suelo del sitio y=-8.0 → 2503 msnm.
//   · el "piso local" del domo es la TERRAZA del mirador (y=-1.73, 2513 msnm):
//     el suelo bajo el domo queda DENTRO de la cabaña — plantar la cámara ahí
//     la mete entre las paredes (verificado: captura N1 sale en negro).
//   · ojo de persona: 1,6 m × K = 0.96 u sobre ese piso → y = -0.77.
//   · desde ahí la cresta del farallón sube +37,4°, el nacimiento del hilo
//     +29,8° y el pie -5,3°; el lomo del sitio corta a +2°, así que el pie de
//     la caída queda tapado por el terreno cercano — igual que en file_158,
//     donde la caída se pierde en el bosque antes de tocar el fondo.
// La cámara APUNTA AL NACIMIENTO de La Chorrera (facePos(pathX(T_NACE))):
// regla fija y verificable, no un encuadre "afinado a ojo" contra la foto.
const OJO = 1.6 * K;                       // 1,6 m de persona, a escala del terreno
const _nx = pathX(T_NACE), _nace = facePos(_nx, T_NACE);
const NACE = new THREE.Vector3(_nx, _nace.y, _nace.z);
// media caída: el punto que encuadran los cuadros de detalle (chorrera, eje)
const _mx = pathX(0.45), _mid = facePos(_mx, 0.45);
const MID_FALL = new THREE.Vector3(_mx, _mid.y, _mid.z);
// justo al frente del centro del domo: fuera de la cáscara y a un paso del
// borde de la terraza, o sea asomado a la baranda mirando el cañón. El retiro
// se calcula del RADIO REAL del domo (que con la escala corregida ya no mide
// 11,7 m sino 7 m), no de un 3.9 horneado.
const CAM_END = new THREE.Vector3(site.domoPos.x, site.terrazaY + OJO,
  site.domoPos.z - (site.domoR + 0.55));
// ── LA VISUAL A LA CHORRERA, ya sobre el rumbo real ───────────────────────
// Con el mapeo al rumbo 311,9° (terrain.js) el escarpe cae SOBRE el eje -Z:
// el usuario, parado en el domo, mira la caída DE FRENTE — que es lo que hace
// el operador al tomar file_158. Todos los cuadros fijos se derivan de esta
// visual en vez de llevar coordenadas horneadas, así que se re-apuntaron
// solos al cambiar el mapeo: esta ronda no tocó una sola cámara.
// ── A QUÉ APUNTA ─────────────────────────────────────────────────────────
// Antes apuntaba al NACIMIENTO del hilo. Medido contra file_158, eso deja el
// 42% del cuadro en cielo vacío y la cumbre a media altura, mientras que en la
// foto la cumbre cae al 27% del alto. El operador no encuadra el nacimiento:
// encuadra LA CASCADA. Apuntando a la mitad de la caída (t=0.45) la cumbre
// cae al ~29% y el nacimiento al ~37% — la foto. Sigue siendo una regla fija y
// verificable en código, no un encuadre afinado a ojo.
const VIS = MID_FALL.clone().sub(CAM_END);          // del ojo a la mitad de la caída
const DIST_NACE = VIS.length();
const DIR = VIS.clone().normalize();                // versor de la visual
const LAT = new THREE.Vector3(-DIR.z, 0, DIR.x).normalize();  // lateral, a la derecha
// el pivote de MapControls va sobre la MISMA visual, a 220 u: así el usuario
// gira alrededor de un punto delante suyo (y no de la cascada a 1 km).
const T_END = CAM_END.clone().addScaledVector(DIR, 220);

const controls = new MapControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.65; controls.panSpeed = 0.9; controls.zoomSpeed = 0.9;
// el aterrizaje orbita a 220 u del pivote (T_END va sobre la propia visual):
// con 25..1250 el usuario puede acercarse a la pared o alejarse hasta ver el
// valle entero — alejar es el gesto con el que el operador llegó a file_162.
controls.minDistance = 25;
controls.minPolarAngle = 0.12;
// ── ojo: ESTE clamp fue la mitad del bug del aterrizaje, DOS veces ────────
// MapControls clampea el ángulo polar en update(), y el polar se mide desde
// +Y: para MIRAR HACIA ARRIBA la cámara tiene que quedar POR DEBAJO del punto
// mirado, o sea polar > π/2. Con 1.25 rad (71.6°) la cámara ni siquiera podía
// ponerse horizontal; con 1.52 (87°) tampoco podía levantar la vista. Desde
// el ojo de Guatoc la visual al nacimiento sube +30°, o sea polar ≈ 2.10 rad
// (120°): con cualquier tope por debajo de eso el aterrizaje se descuelga
// solo y vuelve a picar al suelo. 2.22 rad (127°) deja subir hasta +37° —
// justo la cresta — y sigue impidiendo mirar desde el subsuelo.
controls.maxPolarAngle = 2.22;
controls.enabled = false;            // toma control al aterrizar la entrada
// hooks del gate visual: medir el ENCUADRE REAL tras el aterrizaje (los
// clamps de MapControls pueden mover la cámara respecto a CAM_END/T_END)
window.__cam = camera; window.__ctl = controls; window.__scene = scene;
window.THREE = THREE;   // hook del gate: censos y sondas usan Vector3/Box3
// `height()` expuesta para la SONDA del gate: los puestos de los mundos se
// MIDEN sobre el DEM real (msnm y pendiente), no se eligen a ojo.
window.__h = height;

// ── LA PANORÁMICA DE ENTRADA (Age of Empires) ────────────────────────────
// Orden del operador (2026-07-26): «que el vuelo de entrada CIERRE en una
// panorámica alta desde donde se vean TODOS los mundos a la vez y se entienda
// el territorio completo — como abrir una partida de AoE. Hoy termina
// demasiado cerca.»  Medido antes de tocar nada: el vuelo cerraba a 2,3 u del
// domo, con 4 de 10 mojones en cuadro y 6 convertidos en flecha de borde.
//
// El cierre NO se elige a ojo: se AJUSTA. `encuadrarTodo` toma la base y la
// cabeza de los nueve mojones y retira la cámara sobre el eje del valle hasta
// que TODOS caen dentro del cuadro con margen — y re-centra el encuadre en el
// plano de la imagen. Si mañana se mueve un mundo, la panorámica se re-ajusta
// sola; si cambia el fov o la ventana, también (se recalcula en `resize`).
const _AOE_PITCH = 33;      // picada: medido 33° > 40° — a 40 la bruma aplana el relieve
const _AOE_MARGEN = 0.82;   // cuánto del cuadro pueden ocupar (0..1 en NDC)
const CAM_AOE = new THREE.Vector3(), T_AOE = new THREE.Vector3();
let R_AOE = 1200;
function encuadrarTodo(pts) {
  if (!pts.length) return;
  const th = THREE.MathUtils.degToRad(_AOE_PITCH);
  // el eje del valle es -Z (rumbo 311,9°, La Chorrera al frente): la
  // panorámica mira por ese eje, picada `_AOE_PITCH`.
  const dir = new THREE.Vector3(0, -Math.sin(th), -Math.cos(th)).normalize();
  const T = new THREE.Vector3();
  pts.forEach((p) => T.add(p)); T.multiplyScalar(1 / pts.length);
  let R = 1400;
  const cam = new THREE.PerspectiveCamera(camera.fov, camera.aspect, 1, 14000);
  const v = new THREE.Vector3(), rr = new THREE.Vector3(), uu = new THREE.Vector3();
  for (let it = 0; it < 48; it++) {
    cam.fov = camera.fov; cam.aspect = camera.aspect;
    cam.position.copy(T).addScaledVector(dir, -R);
    cam.lookAt(T); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
    let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9, detras = false;
    for (const p of pts) {
      v.copy(p).project(cam);
      if (v.z > 1) { detras = true; break; }
      mnx = Math.min(mnx, v.x); mxx = Math.max(mxx, v.x);
      mny = Math.min(mny, v.y); mxy = Math.max(mxy, v.y);
    }
    if (detras) { R = Math.min(R * 1.3, 7000); continue; }
    const cx = (mnx + mxx) / 2, cy = (mny + mxy) / 2;
    const semi = Math.max((mxx - mnx) / 2, (mxy - mny) / 2);
    const tanY = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    rr.setFromMatrixColumn(cam.matrixWorld, 0);
    uu.setFromMatrixColumn(cam.matrixWorld, 1);
    T.addScaledVector(rr, cx * tanY * cam.aspect * R);
    T.addScaledVector(uu, cy * tanY * R);
    const listo = Math.abs(semi - _AOE_MARGEN) < 0.015 && Math.abs(cx) < 0.012 && Math.abs(cy) < 0.012;
    R = THREE.MathUtils.clamp(R * THREE.MathUtils.clamp(semi / _AOE_MARGEN, 0.55, 1.8), 300, 7000);
    if (listo) break;
  }
  T_AOE.copy(T);
  CAM_AOE.copy(T).addScaledVector(dir, -R);
  R_AOE = R;
  // MapControls clampea la órbita: si el tope se queda corto, al devolver el
  // control la cámara SE CAE encima del valle. Que el tope siga a la panorámica.
  controls.maxDistance = Math.max(1250, R * 1.25);
}
encuadrarTodo(mundos.puntos());

// ── entrada cinematográfica (vuelo de revelación, ~11 s, saltable) ──
// alto sobre el cañón → barrido frente a La Chorrera → SE ABRE a la panorámica
// del territorio completo. El vuelo ya NO se posa en el domo.
const INTRO_S = 11;
// Los puntos se derivan de la panorámica y de la cascada, no de coordenadas
// horneadas: si se mueve un mundo, se mueve la entrada con él.
const _LATA = new THREE.Vector3(1, 0, 0);            // lateral del eje del valle
const introPos = new THREE.CatmullRomCurve3([
  // 1) telón: muy alto y por el hombro derecho de la panorámica
  CAM_AOE.clone().addScaledVector(_LATA, R_AOE * 0.72).setY(CAM_AOE.y + R_AOE * 0.42),
  // 2) entra hacia la garganta, todavía alto
  MID_FALL.clone().add(new THREE.Vector3(R_AOE * 0.30, R_AOE * 0.30, R_AOE * 0.72)),
  // 3) el paso cerca de La Chorrera: la cascada de frente
  MID_FALL.clone().add(new THREE.Vector3(0, 90, 330)),
  // 4) se abre hacia atrás y arriba…
  CAM_AOE.clone().lerp(MID_FALL, 0.34).setY(CAM_AOE.y * 0.72 + 120),
  // 5) …y CIERRA en la panorámica: todo el territorio en un cuadro
  CAM_AOE.clone(),
]);
const introTgt = new THREE.CatmullRomCurve3([
  MID_FALL.clone(),
  MID_FALL.clone(),
  MID_FALL.clone(),
  MID_FALL.clone().lerp(T_AOE, 0.55),
  T_AOE.clone(),
]);
let introStart = null, introDone = false;
const tmpTgt = new THREE.Vector3(), tmpClamp = new THREE.Vector3();
const _m4 = new THREE.Matrix4(), _up = new THREE.Vector3(0, 1, 0);
// ── ⛔ EL GIRO DE CORTESÍA AL DOMO SALIÓ ─────────────────────────────────
// Tenía sentido cuando el vuelo terminaba parado en la terraza y el domo
// quedaba a la espalda. Con el cierre en panorámica el domo mide 6 px, y lo
// que hacía el giro —medido con captura, `b09-vuelo-fin.png`— era llenar el
// cuadro con la cúpula quemada por el sol de la golden hour: el peor cuadro de
// toda la entrada. Ahora la entrada CIERRA en el territorio, que es la lección,
// y quién abre la ventana de los nueve se dice en el HUD y en un aviso corto.
let revealDone = true;

function darControl() {
  if (controls.enabled) return;
  camera.position.copy(CAM_AOE);
  controls.target.copy(T_AOE);
  controls.enabled = true;
  controls.update();
}
// ── EL ONBOARDING VA ANTES ───────────────────────────────────────────────
// «Primera visita → onboarding → elegir mascota → entra al valle CON ella
//  visible. Quien ya eligió, entra directo.» Mientras el usuario elige, la
// cámara se queda quieta en el primer punto del vuelo (el plano alto sobre el
// cañón): sirve de telón y no le quema la entrada cinematográfica.
let libreOnb = false;
(window.__onbListo || Promise.resolve()).then(() => { libreOnb = true; });

function endIntro() {
  if (introDone) return;
  introDone = true;
  // el cierre ES la panorámica: control en el acto, sin giros de cortesía.
  darControl();
  if (!avisoDado) {
    avisoDado = true;
    portales.toast('✦ Fin del vuelo — ahora el valle es todo suyo');
  }
}
let avisoDado = false;
// tocar/teclear: salta la entrada y devuelve el control en el acto
function manoDelUsuario() {
  if (window.__vallePausado) return;
  if (!libreOnb) return;               // el onboarding manda: no saltar nada
  if (!introDone) { endIntro(); return; }
}
addEventListener('pointerdown', manoDelUsuario);
addEventListener('keydown', manoDelUsuario);
addEventListener('wheel', manoDelUsuario, { passive: true });
camera.position.copy(introPos.getPoint(0));
camera.lookAt(introTgt.getPoint(0));

// modos de verificación: cuadros fijos para el gate visual
if (camMode === 'aoe') {
  // ── EL CIERRE DEL VUELO, como cuadro fijo (gate de la panorámica) ────────
  introDone = true; revealDone = true;
  camera.position.copy(CAM_AOE);
  camera.lookAt(T_AOE);
} else if (camMode === 'guatoc') {
  // ── EL GATE OFICIAL ── el mismo puesto y el mismo encuadre del aterrizaje,
  // pero sin la entrada cinematográfica: parado en el domo de Guatoc, a altura
  // de ojo, mirando el nacimiento de La Chorrera. Contra esto se compara
  // file_158. Si esta vista y la foto no coinciden, el valle no coincide.
  introDone = true;
  camera.position.copy(CAM_END);
  camera.lookAt(MID_FALL);
} else if (camMode === 'site') {
  // desde el oriente (sol del amanecer a la espalda): el domo iluminado y
  // la ladera de La Chorrera de fondo
  introDone = true;
  const gy0 = height(SITE_X, SITE_Z);
  camera.position.set(SITE_X + 28, gy0 + 9, SITE_Z + 30);
  camera.lookAt(SITE_X - 1, gy0 + 4.5, SITE_Z - 2);
} else if (camMode === 'suelo') {
  // ── EL GATE DEL CAMPO DE TIERRA (bench pasto-ralo, `?dirt`) ───────────────
  // A RAS DE SUELO sobre el sendero real de la huerta (−9,17, dirt=1.00
  // confirmado por la sonda), mirando a lo largo del sendero hacia la fogata y
  // la zona de desgaste de la cabaña+domo (0,1, dirt=1.00). El par
  // `?dirt=0`/`?dirt=1` con la MISMA cámara exacta (y `?t=` para congelar el
  // mundo) es lo que separa la señal del campo del ruido del mundo animado.
  introDone = true;
  const _sx = -9, _sz = 17;
  camera.position.set(_sx, height(_sx, _sz) + 1.6, _sz);
  camera.lookAt(0, height(0, 1) + 1.2, 1);
} else if (camMode === 'chorrera') {
  // encuadre de la cascada como chorrera-real-detalle.jpg: cámara BAJA y
  // lejos, mirando HACIA ARRIBA — la pared llena el cuadro, la cascada cae
  // del borde superior (que se pierde en nube) hasta la bruma de la base
  // TELEOBJETIVO (como la foto real): cámara LEJOS y fov angosto → perspectiva
  // comprimida, la pared se aplana frontal y monumental, sin gradiente
  // grotesco de tamaños entre la base y la cresta
  // y con CAPAS: la loma boscosa cercana entra oscura al pie del cuadro
  // (solapamiento = profundidad), la pared detrás, la cresta en nube
  // encuadre file_158: la GARGANTA EN V centrada — hombro izquierdo oscuro y
  // hombro derecho soleado cerrando hacia el centro-abajo, la pared media al
  // fondo con el hilo plateado, la cumbre redondeada visible contra el cielo
  // fov 44 (antes 36): con el tele cerrado los hombros del primer plano
  // quedaban FUERA de cuadro y la pared llenaba el frame como fachada plana
  // RE-ASENTADA sobre la cara real: la estación sale de la propia visual
  // (DIR/LAT) en vez de coordenadas horneadas contra la pared inventada.
  introDone = true;
  camera.fov = 44; camera.updateProjectionMatrix();
  camera.position.copy(CAM_END).addScaledVector(DIR, -330).addScaledVector(LAT, 40);
  camera.position.y = CAM_END.y + 120;
  camera.lookAt(MID_FALL);
} else if (camMode === 'chiflon') {
  // El Chiflón (2026-07-30): la caída limpia en SU PROPIA montaña, la de la
  // izquierda — más baja y más cercana que La Chorrera (ver el sondeo DEM en
  // terrain.js/CHIFLON_X). Teleobjetivo desde el valle: el salto en el
  // escarpe bajo del frente, Roca Blanca con su socavón arriba-izquierda.
  introDone = true;
  camera.fov = 34; camera.updateProjectionMatrix();
  {
    const cf = facePos(CHIFLON_X, CHIFLON_T0);
    camera.position.set(CHIFLON_X + 40, cf.y + 120, cf.z + 380);
    camera.lookAt(CHIFLON_X, cf.y - 15, cf.z);
  }
} else if (camMode === 'eje') {
  // EL EJE domo→cascada: parado detrás del domo mirando AL FRENTE,
  // La Chorrera DE FRENTE al fondo (pedido del operador)
  // EL EJE domo→cascada, re-asentado: la cámara se retira 95 u POR DETRÁS del
  // domo sobre la misma visual y mira La Chorrera de frente.
  introDone = true;
  camera.position.copy(CAM_END).addScaledVector(DIR, -95);
  camera.position.y = height(camera.position.x, camera.position.z) + 16;
  camera.lookAt(MID_FALL);
} else if (camMode === 'back') {
  // desde abajo de las terrazas mirando la cabaña, como cabana-real2.jpg:
  // huerta+invernadero abajo, domo al centro, la cresta con el carro arriba
  introDone = true;
  camera.position.set(SITE_X + 28, height(SITE_X + 28, SITE_Z + 60) + 10, SITE_Z + 60);
  camera.lookAt(SITE_X - 1, height(SITE_X, SITE_Z) + 5, SITE_Z - 6);
} else if (camMode === 'portales') {
  // gate visual del HUB: el arco de portales en la pradera + la guía viva
  introDone = true;
  const gyP = height(SITE_X - 100, SITE_Z - 50);
  camera.position.set(SITE_X - 88, gyP + 38, SITE_Z + 52);
  camera.lookAt(SITE_X - 112, gyP + 8, SITE_Z - 85);
} else if (camMode === 'foto158') {
  // ══ ⛔ RETRACTADO: «la foto no está tomada desde la casa» ERA FALSO ═══════
  // La ronda anterior barrió 1300 puestos del tile buscando la garganta en V
  // con hombros de file_158, no la encontró desde la casa, la encontró a 900 m
  // de ahí y concluyó que la foto era de un mirador. **Ese barrido apuntaba al
  // rumbo equivocado** (237,7°, la cara del sur-oeste). Con el rumbo REAL de
  // La Chorrera (311,9°) la V aparece DESDE LA CASA — medido igual que
  // entonces, perfil transversal a la visual (r/hombros2.mjs), «V» = cuánto
  // suben los hombros por encima del eje:
  //
  //     dist       al 237,7° (lo de ayer)     al 311,9° (el rumbo real)
  //     600 u          -3,3°                      +8,8°
  //     736 u   —      (no medido)                +10,6°  ← la caída está aquí
  //     900 u          -1,8° (a 800 u)            +7,6°
  //    1100 u          -0,6° (a 1000 u)           -1,2°
  //
  // Al rumbo viejo la V es NEGATIVA a todas las distancias; al real llega a
  // +10,6° justo a la distancia de la caída. Los hombros son cordales de
  // primer plano a 1,0-1,5 km que enmarcan la meseta del fondo — exactamente
  // la lectura de file_158. El operador siempre tuvo razón: la foto es desde
  // su casa; lo que estaba mal era hacia dónde apuntaba la escena.
  //
  // El cuadro se conserva sólo como CONTRASTE, ya no como hipótesis: mismo
  // puesto de la casa pero 300 u atrás y arriba, para ver la V desde fuera.
  introDone = true;
  camera.fov = FOV_LARGO; camera.updateProjectionMatrix();
  camera.position.copy(CAM_END).addScaledVector(DIR, -300).setY(CAM_END.y + 90);
  camera.lookAt(MID_FALL);
} else if (camMode === 'valle') {
  // el cañón del amanecer cayendo a la ESPALDA del sitio
  introDone = true;
  camera.position.set(SITE_X, height(SITE_X, SITE_Z) + 70, SITE_Z - 80);
  camera.lookAt(SITE_X + 90, -170, SITE_Z + 520);
}

// ── LA LECCIÓN DEL AGUA sobre el valle real (ver leccion-agua.js) ────────
// Va DESPUÉS de los cuadros fijos: si está activa, ella manda la cámara
// (planta la estación 1 al arrancar; la entrada cinematográfica no corre).
const leccionAgua = leccionModo === 'agua'
  ? makeLeccionAgua({ scene, camera, controls })
  : null;
if (leccionAgua) {
  introDone = true;
  leccionAgua.arrancar();
}

// ── PÁRAMO NATIVO (`?mundo=paramo`: el páramo v2 sobre el valle real) ──────
const paramoMundo = new URLSearchParams(location.search).get('mundo') === 'paramo'
  ? makeParamo({ scene, camera, controls, atmos, renderer })
  : null;
if (paramoMundo) {
  introDone = true;
  paramoMundo.arrancar();
}

// ── PÁRAMO VIVO (`?mundo=paramo-vivo`: el mundo insignia — Ent-frailejón) ──
// Rescatado de wip/paramo-vivo (13 días divergida): diorama propio que APAGA
// el valle real y monta su propia escena (ver paramo-vivo.js). No confundir
// con el páramo nativo de arriba (`?mundo=paramo`, sobre el valle real).
const paramoVivo = new URLSearchParams(location.search).get('mundo') === 'paramo-vivo'
  ? montarMundoParamoVivo(scene, THREE, { camera, controls, renderer, atmos })
  : null;
if (paramoVivo) {
  introDone = true;
  paramoVivo.arrancar();
}

// ── NOCHE ────────────────────────────────────────────────────────────────
// `?hora=noche`: el MISMO valle con el sol puesto — luna, estrellas,
// luciérnagas y luces bajas. Todo vive en noche.js (incluida la transición,
// que corre en su propio rAF: aquí no hay ni una línea en el loop). Convive
// con cualquier `?cam=` (ahí arranca ya de noche: gate determinista).
if (new URLSearchParams(location.search).get('hora') === 'noche') {
  makeNoche({ scene, renderer, atmos, falls, terrainG, site, camMode, compai: portales.compai });
}
// ── CLIMA ── (`?clima=<lluvia|sol|niebla|arcoiris>`: el mismo valle con tiempo)
{
  const _clima = new URLSearchParams(location.search).get('clima');
  const _esNoche = new URLSearchParams(location.search).get('hora') === 'noche';
  if (!_esNoche && ['lluvia', 'sol', 'niebla', 'arcoiris'].includes(_clima)) {
    import('./clima.js').then((m) => m.makeClima({
      scene, renderer, camera, atmos, falls, terrainG, site, camMode, clima: _clima,
      compai: portales.compai,
    }));
  }
}
// ── AHORCADO ── (`?juego=ahorcado`: el Ahorcado Contaminado jugable sobre el valle)
if (esAhorcado) {
  introDone = true;
  darControl();
  import('./ahorcado.js').then((m) => m.makeAhorcado());
}

// ── post: bloom sutil de golden hour ──
// ── postfx abaratado (Fase 0 perf-audit) ──────────────────────────────────
// (a) BLOOM A MEDIA RESOLUCIÓN: el UnrealBloomPass hace varias pasadas de blur
//     GAUSSIANO fullscreen — el pass más caro en fill-rate. Se corre a la MITAD
//     de resolución (÷2 en cada eje = ¼ de píxeles). El blur es de por sí de
//     baja frecuencia, así que a media res el resultado es visualmente idéntico
//     y cuesta ~4× menos. La fuerza/umbral (0.32/0.7/0.87) no se tocan → el
//     halo dorado queda igual.
// (b) MSAA EN EL COMPOSER en vez de un pass FXAA extra: el `antialias:true` del
//     canvas NO llega al render-target intermedio del composer, así que el AA
//     "se perdía" al entrar al post. En WebGL2 (r160) el EffectComposer usa un
//     render-target MULTISAMPLE; se fija `samples` explícito para recuperar el
//     borde limpio del look SIN sumar una pasada fullscreen (más barato que
//     FXAA, y FXAA además no está vendorizado en los addons de esta copia).
const postfxEnabled = new URLSearchParams(location.search).get('post') !== '0';
const composer = postfxEnabled && postfxOK ? new EffectComposer(renderer) : null;
// El bloom queda opt-in: el gate A/B lo midió como 14 draws y −2,36 FPS de
// mediana en este encuadre. `?bloom=1` conserva el acabado dorado cuando se
// necesita; la portada pública prioriza el presupuesto medido.
const bloomEnabled = new URLSearchParams(location.search).get('bloom') === '1';
let bloom = null;
let gradeo = null;
if (composer) {
  composer.setPixelRatio(renderer.getPixelRatio());
  if (postfxMSAA) composer.renderTarget1.samples = composer.renderTarget2.samples = 4;
  composer.addPass(new RenderPass(scene, camera));
  if (bloomEnabled) {
    bloom = new UnrealBloomPass(new THREE.Vector2(2, 2), 0.32, 0.7, 0.87);
    composer.addPass(bloom);
  }
  composer.addPass(new OutputPass());
  gradeo = new ShaderPass(ShaderGradeoFinal);
  gradeo.uniforms.uTexel.value.set(1 / innerWidth, 1 / innerHeight);
  // ── Ajuste LOCAL del valle sobre el gradeo (2026-08-10) ──────────────────
  // Los defaults del ShaderGradeoFinal vienen calibrados para el juego de
  // estrategia del que se robó (piso de negro 0.082 = look mate de campaña).
  // El valle ya trae SU velo atmosférico (FogExp2 + 40 cartas de bruma): el
  // piso alto le suma leche a un cuadro que ya está lavado por diseño, y la
  // panorámica de aterrizaje salía gris-leche de punta a punta. Piso a 0.05 y
  // un punto más de curva S devuelven fondo a las sombras y separación
  // sol/sombra en las laderas SIN tocar la niebla (que está medida contra
  // fotos). ShaderPass CLONA los uniforms → esto no muta el shader compartido:
  // los 9 mundos autónomos y el harness de impostores conservan sus valores.
  gradeo.uniforms.uPiso.value = 0.05;
  gradeo.uniforms.uCurvaS.value = 0.22;
  composer.addPass(gradeo);
}
// media resolución del bloom = mitad del buffer EFECTIVO (px CSS × pixelRatio
// adaptativo): ¼ de píxeles que a resolución plena, look idéntico (blur de
// baja frecuencia). Se llama tras cada composer.setSize (que lo devuelve a
// full) y tras cada cambio de pixelRatio. Ver la creación del composer.
function bloomHalf() {
  if (!bloom) return;
  bloom.setSize(Math.max(1, Math.round(innerWidth * prNow / 2)),
                Math.max(1, Math.round(innerHeight * prNow / 2)));
}
bloomHalf();
// ── GRADEO FÍLMICO FINAL (lib3d/post/gradeoFinal) ──────────────────────────
// Va DESPUÉS del OutputPass cuando los targets HalfFloat están disponibles.

// Hooks de profiling: no alteran el camino público y permiten comparar draw
// calls por sistema en una página viva, incluyendo el costo separado de post.
window.__scene = scene;
window.__composer = composer;
window.__perf = { postfxEnabled, bloomEnabled, postfxOK, systems: ['flora', 'terrain', 'criaturas', 'agua', 'sitio', 'otro', 'post'] };

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  fovCelular();                        // el lado largo sigue midiendo ~68°
  // la panorámica se RE-AJUSTA a la ventana nueva: en un móvil vertical el
  // cuadro es otro y con el encuadre viejo la mitad de los mundos se salía.
  encuadrarTodo(mundos.puntos());
  if (!introDone || camMode === 'aoe') { camera.position.copy(CAM_AOE); camera.lookAt(T_AOE); }
  renderer.setSize(innerWidth, innerHeight);
  if (composer) composer.setSize(innerWidth, innerHeight);
  bloomHalf();                         // composer.setSize devolvió el bloom a full → re-bajarlo
  if (gradeo) gradeo.uniforms.uTexel.value.set(1 / innerWidth, 1 / innerHeight);
});

const loadEl = document.getElementById('load');
requestAnimationFrame(() => { loadEl.style.opacity = 0; setTimeout(() => loadEl.remove(), 700); });

// ── LOS GUÍAS CONDUCEN LA CÁMARA (la respuesta a «después de entrar no pasa
// nada»): Dante, Oliver y el compAI. A los 10 s de quietud uno de los tres se
// lleva la cámara con él; cualquier toque la devuelve. Todo el comportamiento
// vive en `paseo.js` — aquí sólo se enchufa. Ver el porqué largo allá.
const paseo = makePaseo({
  camera, controls,
  perros: () => elementos.perros.map((a) => ({ nombre: a.P.nombre, obj: a.G })),
  compai: portales.compai,
  // NO pasea si: la entrada sigue corriendo, hay un modal abierto (la ventana
  // de los nueve o una carta del marco), el onboarding no ha resuelto, o
  // estamos en un cuadro fijo del gate visual.
  libre: () => introDone && libreOnb && !camMode && !leccionAgua && !paramoMundo && !paramoVivo
    && !document.querySelector('#ventanaM.abierta')
    && !document.querySelector('.marcoCarta, .mcAbierta, #marcoCapa.abierta')
    && document.visibilityState === 'visible',
});
window.__paseo = paseo;   // hook del gate: estado()/forzar()
// la pareja de sombrero negro que trabaja por los mundos (ver elementos.js).
// `__campesinos.forzar('abono')` los planta ya trabajando: sin este hook
// retratarlos es esperar a que el sorteo los saque.
window.__campesinos = elementos.campesinos;

// ── MINIMAPA (F9) ─────────────────────────────────────────────────────────
// Fase 1 de la navegación: DÓNDE ESTOY + los mundos cercanos, en la esquina.
// Autocontenido a propósito (anti-tangle): dibuja su propia lámina Humboldt
// en un canvas 2D propio y corre su propio rAF — no toca el loop del valle
// ni sus capas. Lee los MISMOS datos que el valle (catalogo/terrain/cliff):
// si un mundo se mueve, el minimapa se mueve con él. `?minimapa=0` lo apaga.
// El porqué de cada trazo vive en minimapa.js.
import { makeMinimapa } from './minimapa.js';
window.__minimapa = makeMinimapa({ camera, controls });   // hook del gate visual
// ── fin MINIMAPA ──────────────────────────────────────────────────────────

// ── ANIMALES ── (`?mundo=animales`: HUB del corral — gallinero+lechería+cerdos)
const mundoAnimales = new URLSearchParams(location.search).get('mundo') === 'animales'
  ? makeMundoAnimales({ scene, camera, controls, elementos, mundos })
  : null;
if (mundoAnimales) {
  introDone = true;
  const _paseoUpd = paseo.update;
  paseo.update = (tp) => { if (!mundoAnimales.activa()) _paseoUpd(tp); };
  mundoAnimales.arrancar();
}

// ── monitor de frame-time + histéresis del pixelRatio (Fase 0 perf-audit) ──
// EMA del tiempo de frame (medido con performance.now, independiente del Clock
// del valle para no corromper su delta). Cuando la media supera 22 ms se baja
// un escalón el pixelRatio hacia 1.0; cuando baja de 14 ms se sube de nuevo. La
// banda [14,22] es zona muerta → no oscila. El paso es multiplicativo y se
// clampa a [PR_MIN, PR_MAX]; sólo se re-aplica al renderer si cambió de verdad.
let _prevT = performance.now();
let _emaMs = 16.7;                  // arranca en ~60 fps
let _prCooldown = 0;                // frames de espera tras un cambio (anti-thrash)
window.__pr = () => ({ pr: prNow, ema: _emaMs, fps: 1000 / _emaMs });  // hook gate/consola
function adaptPR() {
  const now = performance.now();
  const dt = now - _prevT;
  _prevT = now;
  // descartar saltos de pestaña-en-background / primer frame (dt gigante)
  if (dt > 0 && dt < 500) _emaMs += (dt - _emaMs) * 0.1;   // EMA α=0.1 (~10 frames)
  if (_prCooldown > 0) { _prCooldown--; return; }
  let next = prNow;
  if (_emaMs > 22 && prNow > PR_MIN) next = Math.max(PR_MIN, prNow - 0.25);
  else if (_emaMs < 14 && prNow < PR_MAX) next = Math.min(PR_MAX, prNow + 0.15);
  if (next !== prNow) {
    prNow = next;
    renderer.setPixelRatio(prNow);
    renderer.setSize(innerWidth, innerHeight);   // re-cuadra el drawing buffer
    if (composer) {
      composer.setPixelRatio(prNow);             // el composer sigue al renderer
      composer.setSize(innerWidth, innerHeight);
    }
    bloomHalf();                                 // bloom sigue a media res del buffer nuevo
    if (gradeo) gradeo.uniforms.uTexel.value.set(1 / innerWidth, 1 / innerHeight);
    _prCooldown = 30;                            // ~0,5 s de reposo antes de re-evaluar
  }
}

// ── GUARDA DE INSTANCIACIÓN (fix Mali-G78, 2026-08-09) ─────────────────────
// Causa raíz MEDIDA en el Pixel 6 Pro (logcat de Chrome, no asumida): un draw
// instanciado pedía dibujar MÁS instancias de las que aloja su buffer →
// glDrawElementsInstanced: Insufficient buffer size → GL_INVALID_OPERATION →
// GL_CONTEXT_LOST_KHR 0x0507 → crash del GPU process → canvas en blanco. El
// ANGLE de escritorio (D3D11) tolera/clampa el overrun; el ANGLE de Mali-G78 lo
// trata como error FATAL de driver.
//
// INVARIANTE DURA, para TODO draw instanciado de la escena: el número de
// instancias dibujadas (`count` de un InstancedMesh, `instanceCount` de una
// InstancedBufferGeometry) NUNCA puede superar la capacidad del MENOR de sus
// buffers de instancia (instanceMatrix, instanceColor y cualquier
// InstancedBufferAttribute de la geometría). Esta guarda la fuerza por
// construcción: no depende de acertar QUÉ módulo tiene el overrun latente —los
// conteos de `scatter()` usan Math.random(), así que varían por carga, y hay
// mundos que montan instancias vía import() async (clima, noche, juegos).
//
// En escritorio es NO-OP byte a byte (allí count<=capacidad ya se cumple, así
// que Math.min no cambia nada) → cero regresión en el render que ya se ve bien.
// En Mali evita la pérdida de contexto. Además INSTRUMENTA: cualquier draw que
// haya que recortar queda en `window.__instClamp` y en consola — en el equipo
// donde SÍ reproduce, eso nombra al culpable exacto (sujeto + from→to) sin
// adivinar. NO toca shaders (la advertencia secundaria "Shader compilation
// failed with no info log" no está ligada al tamaño instanciado).
const _clampVistos = new Set();
window.__instClamp = [];
let _warmupInst = 240;   // re-barrido de arranque (cubre imports async); luego 0
// Mali-G78: además de la capacidad declarada por Three, el driver móvil se
// cae con algunos draws instanciados grandes aunque los atributos coincidan.
// El límite solo rige en puntero táctil; escritorio conserva sus conteos.
const MOBILE_INST_MAX = coarsePointer ? 1024 : Infinity;
function _capInstanced(o) {
  // capacidad = mínimo de instancias que TODOS los atributos de instancia sirven
  let cap = o.instanceMatrix ? o.instanceMatrix.count : Infinity;
  if (o.instanceColor) cap = Math.min(cap, o.instanceColor.count);
  const attrs = o.geometry && o.geometry.attributes;
  if (attrs) for (const k in attrs) {
    const a = attrs[k];
    if (a && a.isInstancedBufferAttribute) cap = Math.min(cap, a.count);
  }
  return Math.min(cap, MOBILE_INST_MAX);
}
function _capGeoIBG(geo) {
  let cap = Infinity;
  for (const k in geo.attributes) {
    const a = geo.attributes[k];
    if (a && a.isInstancedBufferAttribute) cap = Math.min(cap, a.count);
  }
  return Math.min(cap, MOBILE_INST_MAX);
}
function _avisarClamp(o, campo, from, to) {
  if (_clampVistos.has(o.uuid)) return;   // un aviso por objeto, no por frame
  _clampVistos.add(o.uuid);
  const nombre = o.name || o.type;
  window.__instClamp.push({ nombre, campo, from, to });
  console.warn(`[valle/instancing] OVERRUN recortado: ${nombre} ${campo} ${from} → ${to}`);
}
function clampInstancedDraws(root) {
  root.traverse((o) => {
    if (o.isInstancedMesh) {
      const cap = _capInstanced(o);
      if (Number.isFinite(cap) && o.count > cap) { _avisarClamp(o, 'count', o.count, cap); o.count = cap; }
    } else if (o.isMesh && o.geometry && o.geometry.isInstancedBufferGeometry) {
      const cap = _capGeoIBG(o.geometry);
      const cur = o.geometry.instanceCount === undefined ? Infinity : o.geometry.instanceCount;
      if (Number.isFinite(cap) && cur > cap) { _avisarClamp(o, 'instanceCount', cur, cap); o.geometry.instanceCount = cap; }
    }
  });
}
// una pasada tras montar TODA la escena síncrona (flora, cliff, agua, milpa…)
clampInstancedDraws(scene);

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  adaptPR();
  // En retrato el overlay manda: no avanzamos reloj, cámara, fauna ni agua.
  // El callback sigue registrado para reanudar sin reconstruir la escena al
  // volver a landscape, pero no se presenta ningún frame intermedio.
  if (window.__vallePausado) return;
  const t = TIEMPO_FIJO !== null ? TIEMPO_FIJO : clock.getElapsedTime();
  tickVientoMundos(t);   // copas, pasto y dosel comparten la misma ráfaga (1×/frame)
  // warm-up: los mundos que entran por import() async (clima, noche, juegos,
  // mundos autónomos) montan sus instancias unos frames después del arranque; se
  // re-barre la escena durante el arranque para cubrirlos y luego se apaga (coste
  // estable = 0). Barato: recorre OBJETOS de la escena, no instancias.
  if (_warmupInst > 0) { _warmupInst--; clampInstancedDraws(scene); }
  if (!introDone) {
    if (!libreOnb) { introStart = null; }   // esperando al onboarding: telón quieto
    else {
    if (introStart === null) introStart = t;
    const k = Math.min((t - introStart) / INTRO_S, 1);
    const e = k * k * k * (k * (k * 6 - 15) + 10); // smootherstep: despegue y aterrizaje suaves
    introPos.getPoint(e, camera.position);
    introTgt.getPoint(e, tmpTgt);
    camera.lookAt(tmpTgt);
    if (k >= 1) endIntro();
    }
  } else if (controls.enabled) {
    controls.update();
    // límites suaves de pan: no salirse del valle (desplazar cámara junto al target)
    tmpClamp.copy(controls.target);
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -850, 850);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, paramoMundo ? -1520 : -1150, 330);
    // ⚠️ el techo del pivote sube a 620: con la panorámica el target queda a
    // ~200 u de altura y con el tope viejo (520) la cámara se descolgaba sola
    // al primer `update()` — el mismo bug de clamp que ya costó dos rondas.
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, -300, 620);
    camera.position.add(tmpClamp.subVectors(controls.target, tmpClamp));
  }
  if (leccionAgua) leccionAgua.update(t);   // el vuelo entre estaciones
  // El páramo nativo (`?mundo=paramo`) devolvía un `update(t)` que NADIE llamaba:
  // su vuelo entre estaciones y el drift de las nieblas estaban muertos desde que
  // se escribió. Construido y no cableado, dentro del propio bucle (2026-08-07).
  if (paramoMundo) paramoMundo.update(t);
  if (paramoVivo) paramoVivo.update(t);   // el mundo insignia vive (Ent, elenco, descenso)
  atmos.faceCamera(camera);
  atmos.update(t);
  falls.update(t);
  site.update(t);
  portales.update(t);
  mundos.update(t);
  elementos.update(t, camera);   // la cámara: sin ella no hay piso angular (ver elementos.js)
  if (milpa) milpa.actualizar(camera);   // el anillo de héroes sigue a la cámara
  paseo.update(t);               // los guías conducen la cámara (ver paseo.js)
  if (gradeo) gradeo.uniforms.uSemilla.value = (t % 1000); // grano de película
  // Algunos mundos actualizan `count` durante su tick. La guarda final cubre
  // ese camino justo antes de emitir cualquier draw instanciado.
  clampInstancedDraws(scene);
  if (composer) composer.render();
  else renderer.render(scene, camera);
});

// Contrato de arranque para las sondas: sólo se declara al terminar de montar
// escena, renderer y loop del mundo. El HTML declara __ARRANQUE_FALLO si un
// import o error clásico impide llegar hasta aquí.
window.__ARRANQUE_OK = true;
