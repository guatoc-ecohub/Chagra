// ── portales.js — el valle como HUB: 5 portales a los mundos + guía viva ─────
// ADITIVO: no toca terreno/acantilado/cascada/atmósfera. Dos piezas:
//  1) PORTALES: anillos geodésicos en paleta Guatoc (menta #A9D5CB sobre
//     petróleo #17333E) con etiqueta legible — puertas a los mundos de la app
//     (chagra-dev.guatoc.co). Click = entrar al mundo.
//  2) GUÍA VIVA: el mismo rig SVG rubber-hose de los standalones montado en
//     Shadow DOM (patrón de integracion-agente) proyectado como billboard
//     sobre el lienzo. Recorre el valle a pie/vuelo y se TELETRANSPORTA
//     místicamente entre portales (mandala + anillo + haz + chispas).
//     Selector chico en pantalla para cambiar de guía.
//
// ── PULIDO F10 (2026-07-30) — el compAI deja de ser un sprite que patina ────
//  · GESTOS: cada rig declara sus poses en su propio CSS; se leen de ahí
//    (patrón marco.js, nada de tablas a mano) y un scheduler con
//    `elegirSinRepetir` las dispara en pausas de verdad — la criatura SE
//    PLANTA, hace su momento y sigue. Squash&stretch con volumen conservado
//    en la proyección: rubber-hose, no un PNG que se desliza.
//  · GRACIA: el rumbo persigue al waypoint con memoria (~0,5 s) en vez de
//    doblar en seco, frena al llegar, y el paso lleva jitter (el reloj de una
//    criatura viva no es de cuarzo — misma idea que MOMENTOS_IDLE).
//  · TELETRANSPORTE: los anillos físicos duermen (MUNDOS=[]), así que el tp
//    estaba MUERTO. Los portales de hoy son LOS NUEVE MUNDOS del paisaje: el
//    compAI se va en su mandala a un mundo A LA VISTA, olfatea, comenta, y
//    vuelve como vino. Los FX ya estaban construidos; ahora se usan.
//  · VOZ: burbuja anclada al personaje con EL MISMO comentarista del núcleo
//    (grounded: sin inventario aquí, cae a su rama honesta) y la MISMA llave
//    de silencio de los marcos (`compai:silencio`). Tocarlo = que le cuente.
import * as THREE from 'three';
import { height } from './terrain.js';
import { MUNDOS as MUNDOS_DATA } from './mundos.js';
// el azar de la casa (ponderado y sin repetir): el mismo que usa el compAI de
// la PWA para sus gestos. El husmeo no estrena azar propio.
import { elegirSinRepetir } from './compai/gestos.js';
// LA VOZ DEL NÚCLEO: qué dice el compAI de cada mundo. Fuente única compartida
// con la PWA y con los marcos (ver compai/MANIFIESTO.md) — aquí no se escribe
// diálogo nuevo: se consume el que ya es canon.
import { comentarioDeMundo } from './compai/comentarista.js';
import { datosDeMundo, inventarioCompai } from './compai/datosFinca.js';
import { inventarioMatas } from './compai/misMatas.js';
import { montarBotonFoto } from './compai/foto.js';
import { crearVozCompai } from './compai/voz.js';
import { montarEntradaCompai } from './compai/escuchar.js';
// MODO APRENDIZ (#110): a veces, en vez del comentario servido, el compAI
// pregunta — provoca observación en lugar de entregar el tip. Probabilidad
// baja (núcleo la fija), y solo en mundos donde SÍ hay algo real que mirar
// (el propio núcleo lo decide con `datosDeMundo`, cero inventario nuevo aquí).
import { preguntaDeAprendiz } from './compai/modoAprendiz.js';
// LA LÁMINA — para los del roster de 8 sin rig vectorial (chivito-punk,
// dante, oliver: ver `compai/laminaFallback.js`). Sin esto la guía elegida
// simplemente DESAPARECE del valle (`proyectaGuia` apaga la opacidad cuando
// no hay `shadowRoot` que montar).
import { montarLaminaValle, LAMINAS_VALLE } from './compai/laminaFallback.js';
// LA MÁQUINA IDLE — sólo el carril `mira` (ver idleMachine.js): el bob de
// vuelo y el wobble del gesto YA los trae este archivo desde F10; lo único
// que faltaba es que el compAI mire alrededor entre un gesto y el siguiente.
import { miraDeCompai } from './compai/idleMachine.js';

const MENTA = 0xa9d5cb, PETROLEO = 0x17333e, ORO = 0xffc46a;
const PSCALE = 1.8;   // los portales son PUERTAS monumentales: legibles a escala de valle

// ⛔ AQUÍ VIVÍA `const BASE = 'https://chagra-dev.guatoc.co/#'`.
// El operador lo marcó como el hallazgo que más lo indignó: **un dominio de
// desarrollo dentro del producto**. «Ningún destino puede apuntar a
// `chagra-dev`» (PLAN-NOCHE-3D §1). Todos los destinos son ahora RELATIVOS al
// propio sitio (`3d.guatoc.co`), que sirve su propio build en `/app/` y un
// marco por mundo — así el usuario nunca sale del producto.
const BASE = '/';
// Los ANILLOS-PORTAL del piso salieron (pedido del operador 2026-07-25):
// esos mundos (Gallinero, Milpa, Botica…) NO eran los que van. La fábrica de
// anillos queda DORMIDA con la lista vacía — si algún mundo principal gana
// después una puerta física en el valle, se re-puebla esta lista.
const MUNDOS = [];

// ── LOS NUEVE MUNDOS PRINCIPALES — la ventana que abre el DOMO ──────────────
// Réplica del comportamiento del valle clásico (chagra dev): la casa abre un
// interior y de ahí "la ventana de los mundos" (MundoCasaAdentro → vitrina).
// Aquí el domo geodésico ES ese acceso: tocarlo abre esta ventana.
// url:null = mundo todavía sin destino en la app → entrada visible pero
// deshabilitada (el operador quiere ver la estructura completa).
// Una sola fuente de verdad: los nueve viven en `mundos.js` (con su puesto
// medido en el valle y su porqué). La ventana del domo es el ÍNDICE de esos
// mismos nueve; los mojones del paisaje son la puerta principal.
const MUNDOS_PRINCIPALES = MUNDOS_DATA.map((M) => ({
  id: M.id, nombre: M.nombre, emoji: M.emoji, url: M.url, aviso: M.aviso,
}));

// ── TODOS LOS AVATARES DEL MISMO TAMAÑO, EL OSO DE REFERENCIA ─────────────
// Orden del operador (2026-07-26): «todos los avatares del MISMO tamaño, con
// el oso como referencia — la luciérnaga era invisible de tan pequeña».
// El sprite se escala por ALTURA (`worldH` × píxeles-por-unidad), así que una
// sola constante deja a los seis ocupando exactamente el mismo alto en
// pantalla. Antes iban de 6,5 (angelita/luciérnaga) a 14,2 (oso): la abeja
// medía el 46% del guardián y a media distancia desaparecía.
// 14,2 es el valor con el que quedó el oso tras el arreglo de su marcha, y es
// el que manda: NO se baja para "equilibrar", se sube todo lo demás.
export const TALLA_AVATAR = 14.2;
// `husmeoEstado` = la pose con la que ESTE animal mete la nariz cuando llega a
// un mundo (se suma al sorteo de gestos del olfateo, con más peso). Sale del
// repertorio REAL de cada rig — si el arte no la declara, no se usa:
//   angelita `forrajear` (una abeja husmea forrajeando) · chivito `libar` ·
//   luciérnaga `leer` (inspecciona con su luz) · oso `sembrar` (escarba) ·
//   jaguar `acecho` (olfatea agazapado) · guacamaya `senalar`.
// `brio` = multiplicador de paso y `vaiven` = amplitud del bob de vuelo: el
// CARÁCTER de cada uno en el andar. El jaguar RONDA (lento, felino), el oso va
// pesado, la abeja va atareada, la guacamaya PLANEA con vaivén amplio. Todos
// recorren la misma ruta pero ninguno la recorre igual — eso es personalidad,
// no una tabla de velocidad.
// 🔴 ROSTER EMPAREJADO A LOS 8 DE CHAGRA KART (2026-08-12, `compai/vivo-valle`,
// ítem #20 del audit). `guacamaya` SALE de la tabla — no es de los 8 (Angelita,
// Jaguar, Oso, Zarigüeya, Dante, Oliver, Luciérnaga, Chivito-Punk); entran
// `chivito-punk`, `dante`, `oliver`. A quien la tuviera guardada en
// `localStorage` no se le rompe nada: `GUIAS[guiaGuardada]` deja de existir y
// cae al default (`jaguar`), la MISMA degradación que ya tenía cualquier slug
// desconocido — no se le apaga el compañero, se le reasigna el de siempre.
const GUIAS = {
  angelita:   { inner: 'angelita',   nombre: 'Abejita',    emoji: '🐝', worldH: TALLA_AVATAR, vuelo: 3.4, anchor: 'aire',  moveEstado: 'idle', husmeoEstado: 'forrajear', brio: 1.1,  vaiven: 0.7 },
  luciernaga: { inner: 'luciernaga', nombre: 'Luciérnaga', emoji: '✨', worldH: TALLA_AVATAR, vuelo: 3.6, anchor: 'aire',  moveEstado: 'idle', husmeoEstado: 'leer',      brio: 0.95, vaiven: 0.85 },
  jaguar:     { inner: 'jaguar',     nombre: 'Jaguar',     emoji: '🐆', worldH: TALLA_AVATAR, vuelo: 0,   anchor: 'suelo', moveEstado: 'camina', tpEstado: 'invocacion', husmeoEstado: 'acecho', brio: 0.85 },
  oso:        { inner: 'oso',        nombre: 'Oso andino', emoji: '🐻', worldH: TALLA_AVATAR, vuelo: 0,   anchor: 'suelo', moveEstado: 'camina', husmeoEstado: 'sembrar', brio: 0.75 },
  // ── LA ZARIGÜEYA (chucha · Didelphis marsupialis) ────────────────────────
  // Pedido del operador (2026-07-27): «falta integrar la zarigüeya».
  // Ya estaba dibujada y aprobada — vivía sólo en `integracion-agente`
  // («Elija su guía»), nunca había cruzado al valle. Su arte se copió TAL CUAL
  // a `assets/guias-arte.js`: no se re-dibujó nada.
  //
  // ⚠️ Su rig es de otra generación (`build-canon-creature.mjs`, no
  // `build-guias.mjs`): NO responde a `:host([data-estado])` como los seis
  // standalones — se anima solo desde los `data-pose`/`data-animo` horneados
  // en su propio SVG. Poner `data-estado` es inocuo (dispara la cinta y las
  // partículas genéricas del valle), simplemente no cambia su CSS.
  //
  // **Va con sus CRÍAS AL LOMO** (`data-crias="3"` en el SVG): es su firma
  // biológica —es marsupial— y lo que la vuelve reconocible de lejos.
  // Anda por el SUELO y de noche ronda la huerta comiendo plaga.
  zariguya:   { inner: 'zariguya',   nombre: 'Zarigüeya',  emoji: '🦝', worldH: TALLA_AVATAR, vuelo: 0,   anchor: 'suelo', moveEstado: 'idle', brio: 0.8 },
  // ── LOS 3 SIN RIG VECTORIAL: sólo lámina (ver `compai/laminaFallback.js`) ─
  // `inner`/`moveEstado`/`husmeoEstado` no aplican — no hay `<svg>` que leer
  // ni `data-estado` que cambiar (`montaGuia` los omite para estos tres, y
  // `proyectaGuia` ya tolera "gesto sin pose" desde la zarigüeya). Lo único
  // que SÍ manda aquí es lo que da carácter al andar: `brio`/`vaiven`.
  //
  // El chivito punk es el mismo pájaro del páramo, con más ánimo — anda por
  // el aire igual que el chivito de siempre. Desde F24 sale por el RIG del
  // chivito (`inner: 'chivito'` = el id real del núcleo en el SVG); el punk
  // es la pose `hablar` de la piel, no otro esqueleto.
  'chivito-punk': { inner: 'chivito', nombre: 'Chivito Punk', emoji: '🎸', worldH: TALLA_AVATAR, vuelo: 4.4, anchor: 'aire', moveEstado: 'idle', brio: 1.25, vaiven: 1.2 },
  // Dante (beagle): trote curioso de sabueso, nariz al piso — brío moderado.
  dante:      { inner: 'dante',      nombre: 'Dante',       emoji: '🐶', worldH: TALLA_AVATAR, vuelo: 0, anchor: 'suelo', moveEstado: 'idle', brio: 1.05 },
  // Oliver (dálmata, poder "la locura"): el más energético del roster A
  // PROPÓSITO — que no se sienta el mismo perro con otro color encima.
  oliver:     { inner: 'oliver',     nombre: 'Oliver',      emoji: '🐕', worldH: TALLA_AVATAR, vuelo: 0, anchor: 'suelo', moveEstado: 'idle', brio: 1.35 },
};
export const GUIAS_DISPONIBLES = GUIAS;
export const LS_GUIA = 'guatoc.guia';        // el compAI elegido, cruza la app

// ── texturas canvas: mandala andino + remolino del portal + etiqueta ──
function mandalaTex(sz = 512) {
  const cv = document.createElement('canvas'); cv.width = cv.height = sz;
  const c = cv.getContext('2d'), cx = sz / 2;
  c.translate(cx, cx);
  const menta = '#a9d5cb', oro = '#ffc46a';
  c.lineWidth = sz * 0.008;
  [0.96, 0.78, 0.5, 0.24].forEach((r, i) => {
    c.strokeStyle = i % 2 ? oro : menta; c.globalAlpha = 0.9 - i * 0.12;
    c.beginPath(); c.arc(0, 0, cx * r, 0, Math.PI * 2); c.stroke();
  });
  // pétalos / rombos andinos
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    c.save(); c.rotate(a);
    c.strokeStyle = menta; c.globalAlpha = 0.85;
    c.beginPath();
    c.moveTo(0, -cx * 0.5); c.lineTo(cx * 0.09, -cx * 0.66);
    c.lineTo(0, -cx * 0.82); c.lineTo(-cx * 0.09, -cx * 0.66); c.closePath();
    c.stroke();
    c.fillStyle = oro; c.globalAlpha = 0.55;
    c.beginPath(); c.arc(0, -cx * 0.88, sz * 0.012, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // escalonado chakana al centro
  c.strokeStyle = oro; c.globalAlpha = 0.9; c.lineWidth = sz * 0.01;
  for (let i = 0; i < 4; i++) {
    c.save(); c.rotate(i * Math.PI / 2);
    c.beginPath();
    c.moveTo(-cx * 0.07, -cx * 0.21); c.lineTo(-cx * 0.07, -cx * 0.14);
    c.lineTo(-cx * 0.14, -cx * 0.14); c.lineTo(-cx * 0.14, -cx * 0.07);
    c.stroke(); c.restore();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function remolinoTex(sz = 256) {
  const cv = document.createElement('canvas'); cv.width = cv.height = sz;
  const c = cv.getContext('2d'), cx = sz / 2;
  const g = c.createRadialGradient(cx, cx, 0, cx, cx, cx);
  g.addColorStop(0, 'rgba(233,248,244,0.95)');
  g.addColorStop(0.35, 'rgba(169,213,203,0.55)');
  g.addColorStop(0.75, 'rgba(23,51,62,0.35)');
  g.addColorStop(1, 'rgba(23,51,62,0)');
  c.fillStyle = g; c.fillRect(0, 0, sz, sz);
  // brazos espirales
  c.translate(cx, cx); c.globalCompositeOperation = 'lighter';
  for (let b = 0; b < 3; b++) {
    c.rotate((Math.PI * 2) / 3);
    c.strokeStyle = 'rgba(200,238,228,0.5)'; c.lineWidth = sz * 0.03;
    c.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = i * 0.16, r = (i / 40) * cx * 0.92;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.center.set(0.5, 0.5);
  return t;
}

function etiquetaTex(texto, icono) {
  const cv = document.createElement('canvas'); cv.width = 640; cv.height = 200;
  const c = cv.getContext('2d');
  const r = 46, w = 640, h = 200;
  c.beginPath();
  c.roundRect(8, 8, w - 16, h - 16, r);
  c.fillStyle = 'rgba(23,51,62,0.88)'; c.fill();
  c.lineWidth = 7; c.strokeStyle = '#a9d5cb'; c.stroke();
  c.beginPath(); c.roundRect(20, 20, w - 40, h - 40, r - 12);
  c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,196,106,0.75)'; c.stroke();
  c.fillStyle = '#eef8f4'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '600 82px system-ui, sans-serif';
  c.fillText(`${icono}  ${texto}`, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// sprite redondo suave para partículas
function puntoTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

export function makePortales(scene, camera, canvas, domoClicables = []) {
  const grupo = new THREE.Group();
  scene.add(grupo);
  const mandala = mandalaTex();
  const clicables = [];
  const portales = [];

  // ── materiales compartidos ──
  const matPiedra = new THREE.MeshStandardMaterial({ color: PETROLEO, roughness: 0.62, metalness: 0.22 });
  const matGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(MENTA).multiplyScalar(2.4), toneMapped: true });
  const matOro = new THREE.MeshStandardMaterial({ color: ORO, roughness: 0.35, metalness: 0.5, emissive: ORO, emissiveIntensity: 0.9 });

  for (const M of MUNDOS) {
    const gy = height(M.x, M.z);
    const P = new THREE.Group();
    P.position.set(M.x, gy, M.z);
    P.rotation.y = M.giro;

    // pedestal de piedra + mandala en el piso
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 7.4, 1.4, 24), matPiedra);
    ped.position.y = 0.1; P.add(ped);
    const piso = new THREE.Mesh(
      new THREE.CircleGeometry(5.9, 40),
      new THREE.MeshBasicMaterial({ map: mandala, transparent: true, opacity: 0.95, depthWrite: false })
    );
    piso.rotation.x = -Math.PI / 2; piso.position.y = 0.82; P.add(piso);

    // anillo geodésico: torus petróleo + filo menta brillante + cuentas de oro
    const ry = 6.7;                       // centro del anillo sobre el pedestal
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(4.9, 0.55, 12, 56), matPiedra);
    anillo.position.y = ry; P.add(anillo);
    const filo = new THREE.Mesh(new THREE.TorusGeometry(4.9, 0.16, 8, 56), matGlow);
    filo.position.y = ry; filo.position.z = 0.42; P.add(filo);
    const filo2 = filo.clone(); filo2.position.z = -0.42; P.add(filo2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const cuenta = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), matOro);
      cuenta.position.set(Math.cos(a) * 4.9, ry + Math.sin(a) * 4.9, 0);
      P.add(cuenta);
      const rayo = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 5), matGlow);
      rayo.position.set(Math.cos(a) * 4.0, ry + Math.sin(a) * 4.0, 0);
      rayo.rotation.z = a + Math.PI / 2;
      P.add(rayo);
    }

    // el ojo del portal: remolino místico girando
    const remo = remolinoTex();
    const ojo = new THREE.Mesh(
      new THREE.CircleGeometry(4.35, 44),
      new THREE.MeshBasicMaterial({
        map: remo, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    ojo.position.y = ry; P.add(ojo);

    // etiqueta legible SIEMPRE de frente (sprite)
    const et = new THREE.Sprite(new THREE.SpriteMaterial({ map: etiquetaTex(M.nombre, M.icono), depthTest: true }));
    et.scale.set(11.2, 3.5, 1);
    et.position.y = ry + 7.6;
    P.add(et);

    P.scale.setScalar(PSCALE);
    grupo.add(P);
    P.userData.mundo = M;
    // qué se puede clickear de este portal
    [ped, anillo, ojo, et].forEach(o => { o.userData.portal = P; clicables.push(o); });
    portales.push({ g: P, ojo, remo, et, esc: PSCALE, escT: PSCALE, gy, M });
  }

  // ── FX místicos (teletransporte + click) ──
  const fxs = [];
  const texPunto = puntoTex();
  function fxTeleport(pos, grande) {
    const k = grande ? 1.45 : 1;
    // mandala en el piso que gira y se abre
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(6.5 * k, 40),
      new THREE.MeshBasicMaterial({ map: mandala, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, height(pos.x, pos.z) + 0.35, pos.z);
    scene.add(m);
    fxs.push({ o: m, vida: 0, dur: 1.7, tipo: 'mandala', k });
    // anillo que sube
    const an = new THREE.Mesh(
      new THREE.TorusGeometry(2.6 * k, 0.22, 8, 40),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(MENTA).multiplyScalar(2.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    an.rotation.x = Math.PI / 2;
    an.position.copy(m.position);
    scene.add(an);
    fxs.push({ o: an, vida: 0, dur: 1.25, tipo: 'anillo', y0: m.position.y, k });
    // haz vertical
    const haz = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9 * k, 1.5 * k, 17, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(MENTA).multiplyScalar(1.8), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    haz.position.set(pos.x, m.position.y + 8.5, pos.z);
    scene.add(haz);
    fxs.push({ o: haz, vida: 0, dur: 1.1, tipo: 'haz' });
    // chispas oro/menta
    const N = 70, geo = new THREE.BufferGeometry();
    const p = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = [];
    const cMenta = new THREE.Color(MENTA), cOro = new THREE.Color(ORO);
    for (let i = 0; i < N; i++) {
      p[i * 3] = pos.x; p[i * 3 + 1] = m.position.y + 0.5; p[i * 3 + 2] = pos.z;
      const c = Math.random() < 0.55 ? cMenta : cOro;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      const a = Math.random() * Math.PI * 2, r = (2 + Math.random() * 5) * k;
      vel.push([Math.cos(a) * r, 6 + Math.random() * 9, Math.sin(a) * r]);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 1.5, map: texPunto, vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    scene.add(pts);
    fxs.push({ o: pts, vida: 0, dur: 1.5, tipo: 'chispas', vel });
  }
  function pasoFx(dt) {
    for (let i = fxs.length - 1; i >= 0; i--) {
      const f = fxs[i]; f.vida += dt;
      const u = f.vida / f.dur;
      if (u >= 1) {
        scene.remove(f.o); f.o.geometry.dispose(); f.o.material.dispose();
        fxs.splice(i, 1); continue;
      }
      if (f.tipo === 'mandala') {
        f.o.rotation.z += dt * 2.6;
        f.o.scale.setScalar(0.35 + u * 1.25);
        f.o.material.opacity = 1 - u * u;
      } else if (f.tipo === 'anillo') {
        f.o.position.y = f.y0 + u * 11;
        f.o.scale.setScalar(1 + u * 1.6);
        f.o.material.opacity = 0.9 * (1 - u);
      } else if (f.tipo === 'haz') {
        f.o.material.opacity = 0.5 * (1 - u);
        f.o.scale.set(1 + u * 0.7, 1, 1 + u * 0.7);
      } else if (f.tipo === 'chispas') {
        const p = f.o.geometry.attributes.position;
        for (let j = 0; j < f.vel.length; j++) {
          const v = f.vel[j];
          p.array[j * 3] += v[0] * dt; p.array[j * 3 + 1] += v[1] * dt; p.array[j * 3 + 2] += v[2] * dt;
          v[1] -= 14 * dt;
        }
        p.needsUpdate = true;
        f.o.material.opacity = 1 - u;
      }
    }
  }

  // ── LA SOMBRA DE CONTACTO: lo que ancla al compañero AL TERRENO ──────────
  // Regla dura (la cagada del páramo): NADA flota. El billboard proyectado
  // nunca toca el piso, así que sin sombra el personaje LEVITA aunque su y
  // salga de `height(x,z)`. El blob-shadow es el truco de Nintendo: Mario es
  // legible en el aire porque su sombra dice exactamente dónde está el suelo.
  // Sigue a la guía cada frame, SIEMPRE pegada al DEM real; con los de vuelo
  // se achica y aclara según qué tan alto van (contacto ≠ cobija).
  const sombraTexG = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(8,18,24,0.85)');
    g.addColorStop(0.55, 'rgba(8,18,24,0.5)');
    g.addColorStop(1, 'rgba(8,18,24,0)');
    c.fillStyle = g; c.beginPath(); c.arc(64, 64, 62, 0, Math.PI * 2); c.fill();
    return new THREE.CanvasTexture(cv);
  })();
  const sombraG = new THREE.Mesh(
    new THREE.CircleGeometry(1, 24),
    new THREE.MeshBasicMaterial({ map: sombraTexG, transparent: true, opacity: 0.4, depthWrite: false })
  );
  sombraG.rotation.x = -Math.PI / 2;
  sombraG.renderOrder = 1;
  scene.add(sombraG);
  function pasoSombra() {
    const meta = GUIAS[guia.id];
    const gy = height(guia.pos.x, guia.pos.z);
    const alto = Math.max(0, guia.pos.y - gy);          // cuánto vuela sobre SU suelo
    const r = Math.max(2.4, meta.worldH * (0.30 - alto * 0.010));
    sombraG.position.set(guia.pos.x, gy + 0.22, guia.pos.z);
    sombraG.scale.set(r, r * 0.82, 1);
    sombraG.material.opacity = Math.max(0.08, 0.42 - alto * 0.022) * guia.k;
    sombraG.visible = guia.k > 0.02;
  }

  // ── UI en el DOM: sprite de la guía + selector + toast ──
  const css = document.createElement('style');
  css.textContent = `
  /* ⚠️ z-index 7, NO 5. Los rótulos de los nueve mundos viven en
     #capaLugares (z-index 6, mundos.js:358) y TAPABAN al compAI: se ve en
     GATE-zariguya.png — la zarigüeya husmeando el corral, dibujada DETRÁS de
     la tarjeta de «Los animales». Justo cuando el compAI hace lo suyo es
     cuando está pegado a un mundo, o sea cuando el rótulo lo esconde: el
     husmeo quedaba invisible por el propio letrero del sitio que va a oler.
     El compañero es del usuario; el letrero es señalética. Manda el compañero. */
  #guiaV{position:fixed;left:0;top:0;pointer-events:none;z-index:7;will-change:transform;
    filter:drop-shadow(0 6px 8px rgba(0,0,0,.35));transition:none}
  /* ── LEGIBILIDAD A DISTANCIA (truco Nintendo): cuando el sprite cae al piso
     de 52 px, un rim menta lo despega del pasto oscuro — a esa escala un rig
     oscuro contra pradera con bruma DESAPARECE (medido en el gate del valle
     raíz). De cerca el halo se apaga: el arte manda. */
  #guiaV.lejos{filter:drop-shadow(0 0 2px rgba(233,248,244,.95)) drop-shadow(0 0 7px rgba(169,213,203,.9)) drop-shadow(0 2px 4px rgba(0,0,0,.5))}
  /* 🔴 8 GUÍAS, no 7 (roster de Chagra Kart, compai/vivo-valle 2026-08-12):
     la píldora ya no cabe en una sola fila en viewports angostos ni al lado
     de otros paneles fijos de la esquina — flex-wrap + max-width deja que
     se parta en dos filas en vez de quedar tapada o desbordar la pantalla. */
  #guiaSel{position:fixed;right:14px;bottom:14px;z-index:8;display:flex;flex-wrap:wrap;
    justify-content:flex-end;gap:6px;align-items:center;max-width:min(94vw,420px);
    background:rgba(23,51,62,.82);border:1.5px solid #a9d5cb;border-radius:18px;padding:6px 10px;
    backdrop-filter:blur(4px);font-family:system-ui,sans-serif}
  #guiaSel span{color:#cfe8e0;font-size:.72rem;letter-spacing:.03em;margin-right:2px}
  #guiaSel button{width:34px;height:34px;border-radius:50%;border:1.5px solid transparent;cursor:pointer;
    background:rgba(169,213,203,.12);font-size:1.05rem;line-height:1;display:grid;place-items:center;
    transition:transform .15s,border-color .15s}
  #guiaSel button:hover{transform:scale(1.12)}
  #guiaSel button.act{border-color:#ffc46a;background:rgba(169,213,203,.3);box-shadow:0 0 10px rgba(169,213,203,.5)}
  #guiaSel button.snd{margin-left:6px;border-left:none;position:relative}
  #guiaSel button.snd::before{content:'';position:absolute;left:-4px;top:6px;bottom:6px;
    border-left:1px solid rgba(169,213,203,.35)}
  /* ── LA REPISA: el elenco a la vista, no ocho emojis ──────────────────────
     (ojo: este bloque va dentro de un template literal — nada de comillas
     invertidas aquí adentro, terminan la cadena y el módulo no parsea.)
     Mismo GESTO que el selector del Kart (juegos/chagra-kart/js/selector3d.js):
     todos los juguetes en la repisa y el elegido resaltado. Pero AQUÍ no hace
     falta una sola línea de three ni hornear impostores a 256²: el elenco de
     compai son rigs SVG en shadow DOM, cuestan CERO draw calls y pueden estar
     los ocho vivos a la vez — hornearlos a textura mataría justo lo que el
     operador pidió ver, que es al personaje moviéndose en el selector.
     Va PEREZOSA: los rigs se montan al abrir. Ocho rigs animándose siempre
     encima del 3D es pagar por algo que se mira dos segundos. */
  #guiaRepisa{position:fixed;inset:0;z-index:22;display:none;place-items:center;
    background:rgba(8,20,26,.62);backdrop-filter:blur(3px);font-family:system-ui,sans-serif}
  #guiaRepisa.abierta{display:grid}
  #guiaRepisa .rpCarta{position:relative;width:min(760px,calc(100vw - 28px));
    max-height:calc(100vh - 40px);overflow:auto;background:rgba(23,51,62,.94);
    border:1.5px solid #a9d5cb;border-radius:20px;padding:18px 20px 20px;
    box-shadow:0 18px 60px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,196,106,.18);
    animation:rpEntra .3s cubic-bezier(.2,.9,.3,1.15)}
  @keyframes rpEntra{from{transform:translateY(16px) scale(.97);opacity:0}to{transform:none;opacity:1}}
  #guiaRepisa h2{margin:0 0 3px;color:#eef8f4;font:600 1.1rem/1.25 system-ui}
  #guiaRepisa .rpSub{margin:0 0 14px;color:#cfe8e0;font-size:.8rem;line-height:1.45}
  #guiaRepisa .rpRej{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:10px}
  #guiaRepisa .rpBicho{background:linear-gradient(180deg,rgba(23,51,62,.8),rgba(10,24,30,.8));
    border:1.5px solid rgba(169,213,203,.28);border-radius:14px;padding:8px 8px 10px;cursor:pointer;
    display:flex;flex-direction:column;align-items:center;gap:5px;color:#eaf4f1;font:inherit;
    transition:border-color .18s,transform .18s}
  #guiaRepisa .rpBicho:hover{transform:translateY(-3px);border-color:rgba(255,196,106,.6)}
  #guiaRepisa .rpBicho.act{border-color:#ffc46a;box-shadow:0 0 0 1px rgba(255,196,106,.35),0 12px 30px rgba(0,0,0,.5)}
  /* LA CAJA ES LA MISMA PARA TODOS — el oso es la referencia (compai/elenco.js) */
  #guiaRepisa .rpRig{width:100%;height:110px;display:block;overflow:hidden}
  #guiaRepisa .rpBicho b{font:600 .84rem system-ui}
  #guiaRepisa .rpCerrar{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;
    border:1.5px solid rgba(169,213,203,.5);background:rgba(169,213,203,.1);color:#eef8f4;
    font-size:1.15rem;line-height:1;cursor:pointer;display:grid;place-items:center}
  /* ── LA BURBUJA DEL COMPAÑERO ── su voz, anclada a su cabeza (la posiciona
     proyectaGuia cada frame — por eso la transición es SOLO de opacidad). */
  #guiaDice{position:fixed;left:0;top:0;z-index:8;pointer-events:none;max-width:min(90vw,400px);
    background:rgba(23,51,62,.93);border:1.5px solid #a9d5cb;color:#eef8f4;border-radius:14px;
    border-bottom-left-radius:4px;padding:8px 12px;font:500 .84rem/1.3 system-ui,sans-serif;
    letter-spacing:.01em;opacity:0;transition:opacity .35s;will-change:transform;
    box-shadow:0 8px 24px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,196,106,.14);
    display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  #guiaDice.on{opacity:1}
  #guiaDice::after{content:'';position:absolute;left:22px;bottom:-8px;
    border:8px solid transparent;border-top:8px solid #a9d5cb;border-bottom:none}
  #guiaDice .quien{display:inline;font:700 .64rem/1.3 system-ui,sans-serif;
    letter-spacing:.07em;text-transform:uppercase;color:#ffc46a;margin-right:5px}
  #toastV{position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:9;pointer-events:none;
    background:rgba(23,51,62,.92);border:1.5px solid #a9d5cb;color:#eef8f4;border-radius:12px;
    width:min(90vw,460px);box-sizing:border-box;padding:8px 14px;font:500 .86rem/1.3 system-ui,sans-serif;
    text-align:center;opacity:0;transition:opacity .35s;letter-spacing:.01em;
    display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  #ventanaM{position:fixed;inset:0;z-index:20;display:none;place-items:center;font-family:system-ui,sans-serif}
  #ventanaM.abierta{display:grid}
  #ventanaM .vmFondo{position:absolute;inset:0;background:rgba(8,20,26,.62);backdrop-filter:blur(3px)}
  #ventanaM .vmCarta{position:relative;width:min(560px,calc(100vw - 28px));max-height:calc(100vh - 40px);
    overflow:auto;background:rgba(23,51,62,.94);border:1.5px solid #a9d5cb;border-radius:20px;
    padding:20px 22px 22px;box-shadow:0 18px 60px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,196,106,.18);
    animation:vmEntra .35s cubic-bezier(.2,.9,.3,1.15)}
  @keyframes vmEntra{from{transform:translateY(18px) scale(.96);opacity:0}to{transform:none;opacity:1}}
  #ventanaM h2{margin:0 0 4px;color:#eef8f4;font:600 1.12rem/1.25 system-ui,sans-serif;letter-spacing:.01em}
  #ventanaM .vmSub{margin:0 0 16px;color:#cfe8e0;font-size:.82rem;line-height:1.4}
  #ventanaM .vmCerrar{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;
    border:1.5px solid rgba(169,213,203,.5);background:rgba(169,213,203,.1);color:#eef8f4;
    font-size:1.15rem;line-height:1;cursor:pointer;display:grid;place-items:center}
  #ventanaM .vmCerrar:hover{border-color:#ffc46a}
  #ventanaM .vmGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  @media (max-width:520px){#ventanaM .vmGrid{grid-template-columns:repeat(2,1fr)}}
  #ventanaM .vmMundo{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;
    padding:14px 8px 12px;border-radius:14px;border:1.5px solid rgba(169,213,203,.35);
    background:rgba(169,213,203,.09);color:#eef8f4;cursor:pointer;font:600 .8rem/1.2 system-ui,sans-serif;
    text-align:center;transition:transform .15s,border-color .15s,background .15s}
  #ventanaM .vmMundo:not(:disabled):hover{transform:translateY(-2px);border-color:#ffc46a;background:rgba(169,213,203,.2)}
  #ventanaM .vmMundo .vmEmoji{font-size:1.7rem;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))}
  #ventanaM .vmMundo:disabled{opacity:.42;cursor:default}
  #ventanaM .vmMundo .vmPronto{position:absolute;top:6px;right:6px;background:rgba(255,196,106,.16);
    border:1px solid rgba(255,196,106,.55);color:#ffc46a;border-radius:999px;padding:1px 7px;
    font:600 .58rem/1.5 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase}`;
  document.head.appendChild(css);
  const spriteEl = document.createElement('div'); spriteEl.id = 'guiaV';
  document.body.appendChild(spriteEl);
  const toastEl = document.createElement('div'); toastEl.id = 'toastV';
  document.body.appendChild(toastEl);
  const diceEl = document.createElement('div'); diceEl.id = 'guiaDice';
  document.body.appendChild(diceEl);
  let toastTimer = null;
  let diceTimer = null;
  let avisoAnterior = '';
  let avisoAnteriorT = 0;
  const hudEl = document.getElementById('hud');
  function mostrarAviso(el) {
    toastEl.classList.remove('on');
    diceEl?.classList.remove('on');
    hudEl?.classList.add('avisoOculto');
    el.classList.add('on');
  }
  function restaurarHud() {
    if (!toastEl.classList.contains('on') && !diceEl?.classList.contains('on')) hudEl?.classList.remove('avisoOculto');
  }
  function toast(txt) {
    if (!txt || (txt === avisoAnterior && performance.now() - avisoAnteriorT < 3200)) return;
    avisoAnterior = txt; avisoAnteriorT = performance.now();
    clearTimeout(diceTimer);
    diceEl?.classList.remove('on');
    toastEl.textContent = txt; toastEl.style.opacity = 1;
    mostrarAviso(toastEl);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.classList.remove('on'); toastEl.style.opacity = 0; restaurarHud(); }, 2800);
  }

  // ── LA VOZ DEL COMPAÑERO EN EL VALLE ─────────────────────────────────────
  // Hasta hoy el compAI del valle era MUDO: `comentarioDeMundo` solo lo
  // consumían los marcos de mundo (marco.js). El toast es señalética del
  // sistema; ESTA burbuja es la voz del personaje — anclada a su cabeza, con
  // la regla de lectura de la casa (~86 ms/letra) y la MISMA llave de
  // silencio que los marcos: quien lo calló en un mundo lo calló en el valle.
  const LS_MUDO = 'compai:silencio';   // la llave de marco.js, no una nueva
  let mudo = false;
  try { mudo = localStorage.getItem(LS_MUDO) === '1'; } catch (e) { mudo = false; }
  const voz = crearVozCompai();
  function decir(texto, opts = {}) {
    if (!texto || mudo) return;
    if (texto === avisoAnterior && performance.now() - avisoAnteriorT < 3200) return;
    avisoAnterior = texto; avisoAnteriorT = performance.now();
    clearTimeout(toastTimer);
    toastEl.classList.remove('on'); toastEl.style.opacity = 0;
    // el que habla FIRMA: nombre en oro arriba (el texto va como texto plano —
    // viene del núcleo, pero igual no se interpola HTML de datos)
    const meta = GUIAS[guia.id];
    diceEl.textContent = '';
    const quien = document.createElement('span');
    quien.className = 'quien';
    quien.textContent = `${meta.emoji} ${meta.nombre}`;
    diceEl.appendChild(quien);
    diceEl.appendChild(document.createTextNode(texto));
    mostrarAviso(diceEl);
    clearTimeout(diceTimer);
    // dura lo que cuesta leerlo (misma regla que marco.js y la PWA)
    const dura = Math.min(14000, Math.max(6500, Math.round(texto.length * 86 + 1200)));
    diceTimer = setTimeout(() => { diceEl.classList.remove('on'); restaurarHud(); }, dura);
    // hablar deslizándose se ve falso: se planta un momento con su pose de
    // habla (si el rig la declara) y después sigue en lo suyo
    hacerGesto((spriteEl._poses || []).includes('hablar') ? 'hablar' : null, 3.0);
    // Fail-closed y visible: si Kokoro cae, el compañero lo dice en su misma
    // burbuja; no fingimos que una voz que no salió sí salió.
    if (!opts.sinVoz) voz.hablar(texto).catch(() => {
      decir('No pude decirlo en voz alta ahora mismo; se lo dejo escrito aquí para no quedarme callado.', { sinVoz: true });
    });
  }
  // la FOTO del compañero: cámara → visión local (qwen3-vl en la M6000) → comenta
  montarBotonFoto(decir);
  montarEntradaCompai({
    decir,
    alProbarVoz: () => { voz.activar(); decir('Aquí estoy. ¿Qué quiere que miremos en la chagra?'); },
    alTexto: async (pregunta) => {
      // Oír una frase no obliga a fingir que toda frase es una pregunta de
      // altitud. Por ahora el cable del grafo tiene UNA consulta honesta.
      if (!/\b(altitud|altura)\b/i.test(pregunta)) return;
      try {
        const r = await fetch('/api/compai/saber', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pregunta }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || `grafo ${r.status}`);
        if (j.answer) decir(j.answer);
      } catch (e) {
        decir('No pude consultar mi libreta local ahora mismo. Prefiero decirle que no sé antes que inventarle un dato.', { sinVoz: true });
      }
    },
  });
  /* De qué mundo del compAI habla cada lugar del valle: el MISMO vocabulario
     que marco.js traduce para el núcleo. `agua`→clima y `abono`→bosque son
     mapeos ya aprobados allá — aquí no se estrena ninguno. */
  const LUGAR_A_MUNDO = {
    plantas: 'mis_matas', animales: 'mis_animales', agua: 'clima',
    tiempo: 'clima', vender: 'vender', bosque: 'bosque', abono: 'bosque',
    paramo: 'paramo', finca: 'finca',
  };
  const inventarioLocal = inventarioCompai({ plants: inventarioMatas() });
  function decirDeMundo(id) {
    const M = MUNDOS_DATA.find((m) => m.id === id);
    const mundo = LUGAR_A_MUNDO[id];
    // GROUNDED: este lado no ve el inventario de la finca (otro origen), así
    // que datos = null y el comentarista cae a su rama honesta. Jamás una
    // cifra inventada — la regla dura del núcleo.
    const datos = mundo ? datosDeMundo(mundo, mundo === 'mis_matas' ? inventarioLocal : null) : null;
    // MODO APRENDIZ (#110): con probabilidad baja, en vez del comentario
    // afirmativo el compAI pregunta — provoca observación. `preguntaDeAprendiz`
    // ya decide sola si el mundo/datos son aptos (null si no hay nada real que
    // observar), así que si no aplica cae al comentario de siempre.
    const pregunta = mundo ? preguntaDeAprendiz({ mundo, datosMundo: datos || {} }) : null;
    const texto = pregunta
      || (mundo && comentarioDeMundo(mundo, datos))
      || (M ? `Esto es ${M.nombre}. Mírelo con calma, que aquí no hay afán.` : null);
    decir(texto);
  }
  /* El mundo del que habla si uno lo toca: el que esté husmeando; si no, el
     más cercano DE LOS QUE SE VEN; si no se ve ninguno, la finca entera. */
  function mundoCercano() {
    if (guia.husmeo) return guia.husmeo.id;
    let mejor = 'finca', md = 1e9;
    for (const id of mundosEnCuadro()) {
      const M = MUNDOS_DATA.find((m) => m.id === id);
      if (!M) continue;
      const d = Math.hypot(M.x - guia.pos.x, M.z - guia.pos.z);
      if (d < md) { md = d; mejor = id; }
    }
    return mejor;
  }

  /* Poses de narrativa: sirven a una escena, no al reposo (misma lista que
     marco.js — un jaguar en `amenaza` dando un paseo no acompaña, asusta). */
  const POSES_NARRATIVAS = new Set([
    'amenaza', 'acecho', 'invocacion', 'degradado', 'niebla', 'pacto', 'hablar',
  ]);

  // ── montaje del rig SVG en Shadow DOM (patrón integracion-agente) ──
  function montaGuia(host, id) {
    const meta = GUIAS[id];
    if (!meta) return null;
    if (host._boil) clearInterval(host._boil);
    // `chivito-punk` ES el chivito (F24): mismo esqueleto, punk = pose
    // `hablar` de la piel. El arte se resuelve al rig real; el slug conserva
    // su identidad (nombre, brío, vuelo).
    const RIG_DE = { 'chivito-punk': 'chivito' };
    const arte = window.GUIAS_ARTE && (window.GUIAS_ARTE[id] || window.GUIAS_ARTE[RIG_DE[id]]);

    // ── SIN RIG VECTORIAL: chivito-punk/dante/oliver — lámina o marcador
    // honesto (`compai/laminaFallback.js`). SIN esta rama la guía elegida
    // desaparecía del valle entero: `proyectaGuia` apaga la opacidad cuando
    // `host.shadowRoot` no existe, y antes de hoy nada lo creaba para estos
    // tres — la vida entraba por el rig, y el rig no los tiene.
    if (!arte) {
      const lam = montarLaminaValle(host, id);
      if (!lam) return null;
      host._poses = []; host._reposo = [];   // nada que leer: la zarigüeya ya
      // probó que "gesto sin pose" no queda tieso — es puro wobble en
      // `proyectaGuia`, y estos tres corren por el mismo camino.
      const d = LAMINAS_VALLE[id];
      host._aspecto = (d && d.ancho && d.altoPx) ? d.ancho / d.altoPx : 0.78;
      host.setAttribute('data-estado', poseFija || meta.moveEstado);
      return lam.root;
    }

    const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<style>:host{display:block}svg{width:100%;height:100%;display:block;overflow:visible}' + arte.css + '</style>' +
      '<svg viewBox="0 0 900 1150" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' +
      arte.defs + arte.svg + '</svg>';
    // ── LAS POSES QUE EL RIG DE VERDAD TIENE, leídas de su propio CSS ──────
    // (patrón marco.js: ninguna tabla a mano sobrevive a que el arte cambie).
    // `_reposo` = el repertorio del gesto ocioso: sin narrativas y sin los
    // ciclos de marcha (posar en `camina` = caminar en el sitio, se ve roto).
    const vistas = new Set();
    const rePoses = /data-estado=["']([a-z]+)["']/g;
    let mp;
    while ((mp = rePoses.exec(arte.css || '')) !== null) vistas.add(mp[1]);
    host._poses = [...vistas];
    host._reposo = host._poses.filter((p) =>
      !POSES_NARRATIVAS.has(p) && p !== meta.moveEstado && p !== 'camina' && p !== 'dispersar');
    host.setAttribute('data-estado', poseFija || meta.moveEstado);
    requestAnimationFrame(() => {
      try {
        const nucleo = root.getElementById(meta.inner);
        const svg = root.querySelector('svg');
        const b = nucleo.getBBox();
        const M = 55;
        svg.setAttribute('viewBox', `${(b.x - M).toFixed(0)} ${(b.y - M).toFixed(0)} ${(b.width + 2 * M).toFixed(0)} ${(b.height + 2 * M).toFixed(0)}`);
        host._aspecto = (b.width + 2 * M) / (b.height + 2 * M);
      } catch (e) { host._aspecto = 0.9; }
    });
    const turb = root.getElementById('boilTurb');
    if (turb) {
      let s = 1;
      host._boil = setInterval(() => { s = (s % 5) + 1; turb.setAttribute('seed', String(s)); }, 130);
    }
    return root;
  }

  // ── la guía: recorre el valle y se teletransporta entre portales ──
  // ruta a media ladera que bordea el sitio sin pisar cabaña/huerta
  // ⚠️ RUTA RE-TRAZADA (2026-07-26): la anterior corría por x=-70..-185 con
  // z entre -70 y +85, o sea a la IZQUIERDA y DETRÁS del ojo de Guatoc — desde
  // el aterrizaje el compañero NO SE VEÍA NUNCA. El encargo pide el compAI
  // presente en toda la app; si no entra en el cuadro del aterrizaje, no está.
  // Este anillo cae DELANTE de la casa, entre el corral y la quebrada, sobre
  // terreno medido de pendiente baja (3,9° a 5,5°), y no pisa cabaña ni huerta.
  const RUTA = [
    [-58, -96], [-14, -138], [46, -128], [82, -78],
    [58, -40], [4, -34], [-40, -52],
  ];
  // parámetros de verificación: ?guia=<id> fija el personaje; ?quieto=1 lo
  // planta en el centro del encuadre del gate (captura determinista);
  // ?pose=<estado> clava el data-estado (gesto determinista); ?di=<mundoId>
  // hace que hable de entrada (gate de la burbuja); ?tp=<mundoId|1> dispara el
  // teletransporte a los ~2 s (gate de los FX y de la llegada).
  const qs = new URLSearchParams(location.search);
  const guiaFija = qs.get('guia');
  const quieto = qs.get('quieto') === '1';
  const poseFija = qs.get('pose');
  const diMundo = qs.get('di');
  const tpParam = qs.get('tp');
  // el compAI ELEGIDO EN EL ONBOARDING manda; `?guia=` lo pisa (gate visual);
  // si no hay nada elegido todavía, el jaguar sigue siendo el de siempre.
  let guiaGuardada = null;
  try { guiaGuardada = localStorage.getItem(LS_GUIA); } catch (e) { guiaGuardada = null; }
  const guia = {
    id: (guiaFija && GUIAS[guiaFija]) ? guiaFija
      : (guiaGuardada && GUIAS[guiaGuardada]) ? guiaGuardada : 'jaguar',
    pos: quieto ? new THREE.Vector3(-131, 0, 24) : new THREE.Vector3(RUTA[0][0], 0, RUTA[0][1]),
    wp: 1, modo: 'camina', k: 1,            // k = escala del efecto in/out
    tpT: 0, tpDestino: null, tpProx: 11 + Math.random() * 8,
    bob: Math.random() * 7,
    husmeo: null,      // ← el destino de husmeo cuando el paseo lo activa
    // ── el pulso vivo (F10) ──
    gesto: null,                            // el momento en curso { pose, t, dura }
    gestoPrevio: null,                      // para elegirSinRepetir: nadie repite
    proxGesto: 6 + Math.random() * 7,       // s hasta el próximo gesto ocioso
    dir: new THREE.Vector3(0, 0, 1),        // rumbo suavizado (la gracia del giro)
    tpPrevio: null,                         // último mundo teletransportado
    tpForzado: null,                        // ?tp=<id> del gate
  };
  if (tpParam && !quieto) {
    guia.tpProx = 2.0;
    if (MUNDOS_DATA.find((m) => m.id === tpParam)) guia.tpForzado = tpParam;
  }
  window.__compai = guia;   // hook del gate: estado interno medible, no adivinado
  montaGuia(spriteEl, guia.id);
  // ?di=<mundoId>: el gate de la burbuja — habla de entrada, sin esperar viaje
  if (diMundo) setTimeout(() => decirDeMundo(diMundo), 1600);

  const sel = document.createElement('div'); sel.id = 'guiaSel';
  sel.innerHTML = '<span>Guía</span>'
    + '<button class="rep" data-rep="1" title="Ver el elenco entero">▦</button>'
    + Object.entries(GUIAS).map(([id, g]) =>
    `<button data-id="${id}" title="${g.nombre}" ${id === guia.id ? 'class="act"' : ''}>${g.emoji}</button>`).join('') +
    // el silencio va junto al elenco: misma llave que los marcos de mundo
    `<button class="snd" data-snd="1" title="${mudo ? 'Volver a oír a su compañero' : 'Que su compañero se quede callado'}">${mudo ? '🔕' : '🔔'}</button>`;
  document.body.appendChild(sel);
  // ── LA REPISA DEL ELENCO — perezosa, y NO reemplaza la lógica: la MANEJA ──
  // Misma decisión de arquitectura que el selector 3D del Kart: cada elección
  // termina en un `.click()` sobre el botón de siempre, así que el cambio de
  // guía sigue pasando por UN solo camino. Si esto fallara, la píldora de
  // emojis sigue completa debajo.
  let repisa = null;
  function abrirRepisa() {
    if (!repisa) {
      repisa = document.createElement('div');
      repisa.id = 'guiaRepisa';
      repisa.innerHTML = '<div class="rpCarta"><button class="rpCerrar" title="Cerrar">✕</button>'
        + '<h2>¿Quién lo acompaña?</h2>'
        + '<p class="rpSub">Va con usted por todo el valle y también cruza a las pantallas 2D. '
        + 'Puede cambiarlo cuando quiera.</p><div class="rpRej"></div></div>';
      document.body.appendChild(repisa);
      const rej = repisa.querySelector('.rpRej');
      for (const [id, g] of Object.entries(GUIAS)) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'rpBicho'; b.dataset.id = id;
        b.innerHTML = '<div class="rpRig"></div><b>' + g.nombre + '</b>';
        rej.appendChild(b);
        // el mismo montaje del billboard: si la ficha lo dibujara distinto, no
        // estaría mostrando al compañero que el valle va a poner en pantalla
        const host = b.querySelector('.rpRig');
        montaGuia(host, id);
      }
      repisa.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.closest('.rpCerrar') || e.target === repisa) { cerrarRepisa(); return; }
        const b = e.target.closest('.rpBicho'); if (!b) return;
        const bot = sel.querySelector(`button[data-id="${b.dataset.id}"]`);
        if (bot) bot.click();          // ← una sola fuente de verdad, la de siempre
        cerrarRepisa();
      });
    }
    repisa.querySelectorAll('.rpBicho').forEach((x) => x.classList.toggle('act', x.dataset.id === guia.id));
    repisa.classList.add('abierta');
  }
  function cerrarRepisa() { if (repisa) repisa.classList.remove('abierta'); }
  addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarRepisa(); });

  sel.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.rep) { abrirRepisa(); return; }
    if (b.dataset.snd) {
      mudo = !mudo;
      try { localStorage.setItem(LS_MUDO, mudo ? '1' : '0'); } catch (err) { /* privado */ }
      b.textContent = mudo ? '🔕' : '🔔';
      b.title = mudo ? 'Volver a oír a su compañero' : 'Que su compañero se quede callado';
      if (mudo) diceEl.classList.remove('on');
      return;
    }
    const id = b.dataset.id;
    if (id === guia.id) return;
    guia.id = id;
    guia.gesto = null; guia.gestoPrevio = null;   // el repertorio es de OTRO rig
    try { localStorage.setItem(LS_GUIA, id); } catch (err) { /* modo privado */ }
    montaGuia(spriteEl, id);
    sel.querySelectorAll('button').forEach(x => x.classList.toggle('act', x.dataset.id === id));
    fxTeleport(guia.pos, id === 'jaguar');
    toast(`${GUIAS[id].emoji} Ahora lo acompaña ${GUIAS[id].nombre}`);
  });

  // ── 🔴 EL COMPAÑERO ELEGIDO EN EL ONBOARDING SÍ MANDA ────────────────────
  // Bug encontrado en el test de clic (2026-07-26): el usuario elegía «Oso
  // andino» y entraba con el JAGUAR — y al saltar a un mundo la URL llevaba
  // `?guia=jaguar`. Causa medida: este módulo se evalúa cuando `main.js` lo
  // importa, o sea ANTES de que el onboarding resuelva; en la primera visita
  // `localStorage` todavía está vacío y cae al jaguar por defecto. La elección
  // sólo se respetaba al RECARGAR. Ahora se espera la promesa del onboarding y
  // se cambia en caliente (`?guia=` del gate sigue pisando todo).
  (window.__onbListo || Promise.resolve()).then((elegida) => {
    if (guiaFija || !elegida || !GUIAS[elegida] || elegida === guia.id) return;
    guia.id = elegida;
    montaGuia(spriteEl, elegida);
    sel.querySelectorAll('button').forEach((x) => x.classList.toggle('act', x.dataset.id === elegida));
  });

  function alturaGuia(meta) {
    const g = height(guia.pos.x, guia.pos.z);
    return meta.anchor === 'aire'
      ? g + 2.2 + meta.vuelo + Math.sin(guia.bob) * 0.9 * (meta.vaiven || 1)
      : g + 0.15;
  }

  // ── EL GESTO: la criatura SE PLANTA, hace su momento y sigue ─────────────
  // La línea que separa una criatura viva de un GIF (SPEC del compAI): el
  // repertorio sale del PROPIO rig (`_reposo`, leído en montaGuia) y el azar
  // es el de la casa — `elegirSinRepetir`, nadie se rasca dos veces seguidas.
  // Un rig sin poses (la zarigüeya trae las suyas horneadas) no queda tieso:
  // el gesto sin pose es puro wobble rubber-hose, que lo pinta proyectaGuia.
  function ponEstado(est) { if (!poseFija) spriteEl.setAttribute('data-estado', est); }
  function hacerGesto(pose, dura) {
    guia.gesto = { pose, t: 0, dura };
    if (pose) ponEstado(pose);
  }
  function gestoAlAzar(extra) {
    const mesa = {};
    for (const p of spriteEl._reposo || []) mesa[p] = { peso: 1 };
    // la pose de husmeo del animal pesa más cuando está metiendo la nariz
    if (extra && (spriteEl._poses || []).includes(extra)) mesa[extra] = { peso: 2.6 };
    const pose = elegirSinRepetir(mesa, guia.gestoPrevio);
    if (pose) guia.gestoPrevio = pose;
    hacerGesto(pose, 2.2 + Math.random() * 1.8);
  }

  // ── EL DESTINO DEL TELETRANSPORTE: los nueve mundos son los portales ─────
  // Los anillos físicos duermen (MUNDOS = []), así que el tp de la ruta llevaba
  // muerto desde entonces. Regla del husmeo, literal: solo un mundo QUE SE VE
  // entra al sorteo — teletransportarse fuera de cuadro no enseña nada. Y a la
  // vuelta de la esquina no se viaja en mandala: eso se camina (>90 u).
  function destinoTp() {
    let id = null;
    if (guia.tpForzado) { id = guia.tpForzado; guia.tpForzado = null; }
    else {
      const vistos = mundosEnCuadro().filter((v) => {
        const M = MUNDOS_DATA.find((m) => m.id === v);
        return M && Math.hypot(M.x - guia.pos.x, M.z - guia.pos.z) > 90;
      });
      id = elegirSinRepetir(vistos, guia.tpPrevio);
    }
    const M = id && MUNDOS_DATA.find((m) => m.id === id);
    if (!M) return null;
    guia.tpPrevio = id;
    // aterriza del LADO DE LA CÁMARA del mojón: presente, no escondido detrás
    const dx = camera.position.x - M.x, dz = camera.position.z - M.z;
    const dd = Math.hypot(dx, dz) || 1, r = 13;
    return { id, x: M.x + (dx / dd) * r, z: M.z + (dz / dd) * r, mx: M.x, mz: M.z, husmeo: true };
  }

  // ── LA VUELTA A CASA: como vino, si quedó lejos ──────────────────────────
  // El husmeo y el tp pueden dejar al compAI a 1 km del anillo; volver a pie
  // desde el páramo son minutos de compañero perdido. Lejos (>200 u) vuelve
  // por el mandala; cerca, camina — retomando el anillo por el punto próximo.
  function volverACasa() {
    guia.husmeo = null;
    guia.gesto = null;
    const meta = GUIAS[guia.id];
    let mejor = 0, md = 1e9;
    RUTA.forEach(([x, z], i) => { const dd = Math.hypot(x - guia.pos.x, z - guia.pos.z); if (dd < md) { md = dd; mejor = i; } });
    if (md > 200 && guia.modo === 'camina') {
      guia.modo = 'tpOut'; guia.tpT = 0;
      guia.tpDestino = { x: RUTA[mejor][0], z: RUTA[mejor][1], husmeo: false };
      fxTeleport(guia.pos, guia.id === 'jaguar');
      if (meta.tpEstado) ponEstado(meta.tpEstado);
    } else {
      guia.wp = mejor;
      ponEstado(meta.moveEstado);
    }
  }

  // ── 🔴 EL HUSMEO: A LOS 10 s SIN INTERACCIÓN, EL compAI SE VA A MIRAR ────
  //
  // Orden del operador (2026-07-27): «después de la entrada, 10 segundos sin
  // interacción activan a compAI HUSMEANDO **los mundos que se ven**».
  //
  // El anillo de la ruta normal es la vida de todos los días: el compAI da
  // vueltas cerca de la casa. El husmeo es otra cosa — se SALE del anillo y se
  // va hasta un mundo del valle a meter la nariz. Tres reglas:
  //
  //  1. **«los mundos que se ven»** es literal: sólo entra al sorteo el mundo
  //     que está DENTRO DEL CUADRO en ese momento (`_v.project(camera)`) y
  //     delante de la cámara. Husmear algo que el usuario no está viendo no
  //     enseña nada; sería un compañero perdido fuera de plano.
  //  2. **no repite**: mismo `elegirSinRepetir` del núcleo, así que no vuelve
  //     dos veces seguidas al mismo mundo aunque sea el más cercano.
  //  3. **no es molesto**: `soltar()` lo devuelve a su anillo en el acto, y
  //     quien lo llama es la primera interacción del usuario (ver `paseo.js`).
  //     Cuando el usuario está haciendo algo, el compAI se calla y se va.
  //
  // Al llegar husmea de verdad: se queda `OLFATEO_S` dando vueltas cortas
  // alrededor del sitio en vez de quedarse clavado — que es lo que hace un
  // animal que está oliendo algo.
  const OLFATEO_S = 6.5;
  let husmeoPrevio = null;

  function mundosEnCuadro() {
    const _p = new THREE.Vector3();
    const vistos = [];
    for (const M of MUNDOS_DATA) {
      if (typeof M.x !== 'number' || typeof M.z !== 'number') continue;
      _p.set(M.x, height(M.x, M.z), M.z);
      const d = camera.position.distanceTo(_p);
      _p.project(camera);
      // dentro del cuadro (con un pelo de margen), delante de la cámara, y no
      // tan lejos que el compAI no llegue nunca
      if (_p.z < 1 && Math.abs(_p.x) < 1.05 && Math.abs(_p.y) < 1.05 && d < 1400) {
        vistos.push(M.id);
      }
    }
    return vistos;
  }

  function husmear() {
    const vistos = mundosEnCuadro();
    if (!vistos.length) return false;
    const mesa = {}; for (const id of vistos) mesa[id] = { peso: 1 };
    const id = elegirSinRepetir(mesa, husmeoPrevio);
    if (!id) return false;
    husmeoPrevio = id;
    const M = MUNDOS_DATA.find((m) => m.id === id);
    if (!M) return false;
    guia.husmeo = { id, x: M.x, z: M.z, fase: 'yendo', t: 0, giro: Math.random() * 6.28 };
    return true;
  }
  function soltarHusmeo() {
    if (!guia.husmeo) return;
    // la vuelta decide sola: a pie si está cerca, por el mandala si quedó lejos
    volverACasa();
  }

  function pasoGuia(dt, t) {
    const meta = GUIAS[guia.id];
    guia.bob += dt * 2.1;
    if (quieto) {
      // se planta EN EL CENTRO DEL ENCUADRE REAL, no en una coordenada
      // horneada: 65 u por delante de la cámara del gate, sobre el suelo del
      // DEM. Sirve para CUALQUIER ?cam= (el (-131,24) viejo solo centraba uno).
      if (!guia.plantado) {
        guia.plantado = true;
        const f = new THREE.Vector3();
        camera.getWorldDirection(f);
        guia.pos.set(camera.position.x + f.x * 65, 0, camera.position.z + f.z * 65);
      }
      // el compAI del gate también respira: gestos del azar de la casa, quieto
      if (guia.gesto) {
        guia.gesto.t += dt;
        if (guia.gesto.t >= guia.gesto.dura) { guia.gesto = null; ponEstado(meta.moveEstado); }
      } else {
        guia.proxGesto -= dt;
        if (guia.proxGesto <= 0) { gestoAlAzar(meta.husmeoEstado); guia.proxGesto = 4.5 + Math.random() * 4.5; }
      }
      guia.pos.y = alturaGuia(meta);
      return;
    }
    // ── el gesto en curso manda: nadie se rasca mientras patina ────────────
    if (guia.gesto) {
      if (guia.modo === 'camina') {
        guia.gesto.t += dt;
        if (guia.gesto.t >= guia.gesto.dura) { guia.gesto = null; ponEstado(meta.moveEstado); }
        else { guia.pos.y = alturaGuia(meta); return; }   // plantado, en su momento
      } else { guia.gesto = null; }                       // el teleport pisa al gesto
    }
    // el husmeo pisa la ruta normal mientras dura
    if (guia.husmeo && guia.modo === 'camina') {
      const H = guia.husmeo;
      H.t += dt;
      const v = (meta.anchor === 'aire' ? 15 : 10) * (meta.brio || 1);  // con ganas, a SU paso
      if (H.fase === 'yendo') {
        const dx = H.x - guia.pos.x, dz = H.z - guia.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 14) { H.fase = 'olfateando'; H.t = 0; H.prox = 1.0 + Math.random(); }
        else { guia.pos.x += (dx / d) * v * dt; guia.pos.z += (dz / d) * v * dt; }
      } else {
        // olfatea: vueltas cortas alrededor del sitio, no clavado — y cada
        // tanto SE PLANTA a hacer su gesto de husmeo (lo que hace un animal
        // que está oliendo algo: círculo, pausa, nariz, círculo)
        H.giro += dt * 1.15;
        const r = 9 + Math.sin(H.t * 0.9) * 3.5;
        guia.pos.x += ((H.x + Math.cos(H.giro) * r) - guia.pos.x) * Math.min(1, dt * 2.2);
        guia.pos.z += ((H.z + Math.sin(H.giro) * r) - guia.pos.z) * Math.min(1, dt * 2.2);
        H.prox = (H.prox ?? 2) - dt;
        if (H.prox <= 0) { gestoAlAzar(meta.husmeoEstado); H.prox = 2.6 + Math.random() * 2.6; }
        if (H.t > OLFATEO_S) {
          if (H.tp) volverACasa();                    // vino en mandala: se devuelve
          else if (!husmear()) soltarHusmeo();
        }
      }
      guia.pos.y = alturaGuia(meta);
      return;
    }
    if (guia.modo === 'camina') {
      const [wx, wz] = RUTA[guia.wp];
      const dx = wx - guia.pos.x, dz = wz - guia.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 2) { guia.wp = (guia.wp + 1) % RUTA.length; }
      else {
        // ── LA GRACIA DEL RUMBO: no dobla en seco ──────────────────────────
        // El rumbo persigue al waypoint con memoria (~0,5 s): la curva sale
        // sola. Al acercarse FRENA, y el paso lleva jitter — el reloj de una
        // criatura viva no es de cuarzo (misma idea que MOMENTOS_IDLE).
        _dir.set(dx / d, 0, dz / d);
        guia.dir.lerp(_dir, Math.min(1, dt * 2.2)).normalize();
        const v = (meta.anchor === 'aire' ? 10 : 6.5) * (meta.brio || 1)
          * THREE.MathUtils.clamp(d / 14, 0.5, 1)
          * (0.88 + 0.24 * Math.sin(guia.bob * 0.53));
        guia.pos.x += guia.dir.x * v * dt;
        guia.pos.z += guia.dir.z * v * dt;
      }
      guia.pos.y = alturaGuia(meta);
      // ── ¿un gesto? cada tanto, del repertorio del rig, sin repetir ───────
      guia.proxGesto -= dt;
      if (guia.proxGesto <= 0) { gestoAlAzar(null); guia.proxGesto = 7 + Math.random() * 9; }
      // ── ¿toca teletransportarse? Los portales de hoy son LOS NUEVE MUNDOS:
      // el compAI se va en su mandala a uno A LA VISTA, olfatea y comenta.
      guia.tpProx -= dt;
      if (guia.tpProx <= 0) {
        const D = destinoTp();
        if (D) {
          guia.modo = 'tpOut'; guia.tpT = 0; guia.tpDestino = D;
          fxTeleport(guia.pos, guia.id === 'jaguar');
          if (meta.tpEstado) ponEstado(meta.tpEstado);
        } else {
          guia.tpProx = 6;      // nada visible o todo muy cerca: se reintenta
        }
      }
    } else if (guia.modo === 'tpOut') {
      guia.tpT += dt;
      guia.k = Math.max(0, 1 - guia.tpT / 0.75);
      if (guia.tpT >= 0.75) {
        const D = guia.tpDestino;
        guia.pos.set(D.x, 0, D.z);
        guia.pos.y = alturaGuia(meta);
        if (D.husmeo) {
          // llegó a un mundo: a meter la nariz (y a comentarlo al aparecer)
          guia.husmeo = { id: D.id, x: D.mx, z: D.mz, fase: 'olfateando', t: 0, giro: Math.random() * 6.28, tp: true, habla: true, prox: 1.2 };
        } else {
          // volvió a casa: retoma el anillo por el punto más cercano
          let mejor = 0, md = 1e9;
          RUTA.forEach(([x, z], i) => { const dd = Math.hypot(x - guia.pos.x, z - guia.pos.z); if (dd < md) { md = dd; mejor = i; } });
          guia.wp = mejor;
        }
        fxTeleport(guia.pos, guia.id === 'jaguar');
        guia.modo = 'tpIn'; guia.tpT = 0;
      }
    } else if (guia.modo === 'tpIn') {
      guia.tpT += dt;
      guia.k = Math.min(1, guia.tpT / 0.75);
      guia.pos.y = alturaGuia(meta);
      if (guia.tpT >= 0.75) {
        guia.modo = 'camina'; guia.k = 1;
        guia.tpProx = 16 + Math.random() * 14;
        ponEstado(meta.moveEstado);
        // recién aterrizado de su mandala frente al mundo: lo comenta — la
        // voz del núcleo, con su rama honesta si no hay datos
        if (guia.husmeo && guia.husmeo.habla) { guia.husmeo.habla = false; decirDeMundo(guia.husmeo.id); }
      }
    }
  }

  // proyección del billboard vivo sobre el lienzo (patrón integracion-agente)
  const _v = new THREE.Vector3();
  const _dir = new THREE.Vector3();          // temp del rumbo suavizado
  function proyectaGuia(t) {
    const meta = GUIAS[guia.id];
    if (!spriteEl.shadowRoot) { spriteEl.style.opacity = 0; return; }
    _v.copy(guia.pos); _v.project(camera);
    const w = innerWidth, h = innerHeight;
    const sx = (_v.x * 0.5 + 0.5) * w, sy = (-_v.y * 0.5 + 0.5) * h;
    const dist = camera.position.distanceTo(guia.pos);
    const pxUnidad = h / (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    // ── PISO EN PANTALLA: EL compAI NO SE ENCOGE HASTA DESAPARECER ─────────
    // Orden del operador (2026-07-27): «el compAI se queda muy chiquito, si
    // hace algo… no se ve». `TALLA_AVATAR = 14,2` ya estaba puesto y se
    // cumple — el problema no era el contrato de tamaño sino la CÁMARA: la
    // panorámica del aterrizaje se retira a ~1.370 u, y ahí 14,2 u dan
    // **10,7 px medidos**. Un compañero de 10 px no hace gestos: hace nada.
    //
    // El criterio no es un número al azar: es el MISMO peso visual que ya
    // tienen los escudos de los nueve mundos (≈58 px desde la panorámica,
    // §7.2 de `camara-aoe-y-auditoria`). El compAI no puede pesar menos que
    // un letrero. Piso 52 px; de cerca el piso no muerde (el rig mide 130-190
    // px a altura de ojo) y el avatar conserva su tamaño real.
    const MIN_PX = 52;
    const altoPx = Math.max(meta.worldH * pxUnidad, MIN_PX);
    const anchoPx = altoPx * (spriteEl._aspecto || 0.9);
    // al piso mínimo se enciende el rim de legibilidad; de cerca, arte puro
    spriteEl.classList.toggle('lejos', altoPx <= MIN_PX * 1.15);
    const dentro = _v.z < 1 && sx > -anchoPx && sx < w + anchoPx && guia.k > 0.02;
    spriteEl.style.opacity = dentro ? Math.min(1, guia.k * 1.4) : 0;
    if (!dentro) { diceEl.style.visibility = 'hidden'; return; }
    spriteEl.style.width = anchoPx + 'px';
    spriteEl.style.height = altoPx + 'px';
    const dx = sx - (spriteEl._px || sx); spriteEl._px = sx;
    spriteEl._rot = (spriteEl._rot || 0) * 0.9 + THREE.MathUtils.clamp(dx * 1.1, -10, 10) * 0.1;
    // rumbo → espejo del perfil de marcha (el rig del jaguar mira a la DER;
    // data-dir="izq" lo voltea por CSS del shadow). Umbral anti-parpadeo.
    if (Math.abs(dx) > 0.6) spriteEl.setAttribute('data-dir', dx < 0 ? 'izq' : 'der');
    const giroTp = guia.modo === 'tpOut' ? (1 - guia.k) * 160 : guia.modo === 'tpIn' ? (guia.k - 1) * 160 : 0;
    // ── RESPIRA + WOBBLE: rubber-hose con volumen conservado ───────────────
    // La respiración es permanente y casi subliminal (±1,5%); el gesto le mete
    // un meneo corto de squash&stretch y un cabeceo, con envolvente seno para
    // entrar y salir suave — nada de saltos al empalmar con la identidad.
    let q = Math.sin(guia.bob * 1.7) * 0.015;
    let wobRot = 0, gestoEnv = 0;
    if (guia.gesto) {
      const g = guia.gesto;
      gestoEnv = Math.sin(Math.PI * Math.min(1, g.t / g.dura));
      q += Math.sin(g.t * 9.5) * 0.055 * gestoEnv;
      wobRot = Math.sin(g.t * 7.3) * 6.5 * gestoEnv;
    }
    // ── MIRA: el vaivén continuo de "mirar alrededor" (idleMachine.js) ──────
    // Puerto de `A/src/visual/creatures/creatureIdle.js` — la única capa que
    // le faltaba a esta función: respira y gesticula desde F10, pero entre un
    // gesto y el siguiente miraba fijo al frente, como un cartel. Se atenúa
    // durante el propio gesto (que ya trae su cabeceo) y durante el
    // teletransporte (que ya gira 160° solo) para no pelearle a ninguno.
    const tpActivo = guia.modo === 'tpOut' || guia.modo === 'tpIn';
    const miraRot = tpActivo ? 0 : miraDeCompai(t, { perfil: guia.id }) * (1 - gestoEnv);
    const ex = (1 - q).toFixed(3), ey = (1 + q).toFixed(3);
    spriteEl.style.transform =
      `translate(${(sx - anchoPx / 2).toFixed(1)}px, ${(sy - altoPx * (meta.anchor === 'aire' ? 0.52 : 0.96)).toFixed(1)}px) ` +
      `rotate(${(spriteEl._rot + giroTp + wobRot + miraRot).toFixed(1)}deg) scale(${(0.25 + guia.k * 0.75).toFixed(3)}) ` +
      `scale(${ex},${ey})`;
    // ── la burbuja sigue al personaje: sobre la cabeza, dentro del cuadro ──
    if (diceEl.classList.contains('on')) {
      diceEl.style.visibility = '';
      const bw = diceEl.offsetWidth || 200, bh = diceEl.offsetHeight || 60;
      const bx = Math.max(10, Math.min(w - bw - 10, sx - 30));
      const by = Math.max(8, sy - altoPx * (meta.anchor === 'aire' ? 0.62 : 1.06) - bh - 12);
      diceEl.style.transform = `translate(${bx.toFixed(0)}px, ${by.toFixed(0)}px)`;
    }
  }

  // ── LA VENTANA DE LOS MUNDOS (overlay DOM que abre el domo) ──
  const vent = document.createElement('div');
  vent.id = 'ventanaM';
  vent.innerHTML =
    '<div class="vmFondo"></div>' +
    '<div class="vmCarta" role="dialog" aria-modal="true" aria-label="La ventana de los mundos">' +
    '<button class="vmCerrar" aria-label="Cerrar">✕</button>' +
    '<h2>✦ La ventana de los mundos</h2>' +
    '<p class="vmSub">Desde el domo se ve toda la finca. Toque un mundo para recorrerlo.</p>' +
    '<div class="vmGrid">' +
    MUNDOS_PRINCIPALES.map((M) =>
      `<button class="vmMundo" data-id="${M.id}" ${M.url ? '' : 'disabled'}` +
      (M.url ? '' : ` title="${(M.aviso || '').replace(/"/g, '')}"`) + '>' +
      `<span class="vmEmoji">${M.emoji}</span><span>${M.nombre}</span>` +
      // los rotos o sin ruta van VISIBLES y deshabilitados CON SU AVISO,
      // nunca ocultos (orden expresa del operador).
      (M.url ? '' : '<span class="vmPronto">🚧 sin ruta todavía</span>') +
      '</button>').join('') +
    '</div></div>';
  document.body.appendChild(vent);
  let ventanaAbierta = false;
  function abrirVentana() { ventanaAbierta = true; vent.classList.add('abierta'); canvas.style.cursor = ''; }
  function cerrarVentana() { ventanaAbierta = false; vent.classList.remove('abierta'); }
  vent.querySelector('.vmCerrar').addEventListener('click', cerrarVentana);
  vent.querySelector('.vmFondo').addEventListener('click', cerrarVentana);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarVentana(); });
  vent.querySelector('.vmGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.vmMundo'); if (!b || b.disabled) return;
    const M = MUNDOS_PRINCIPALES.find((m) => m.id === b.dataset.id);
    if (!M || !M.url) return;
    toast(`${M.emoji} Entrando al mundo: ${M.nombre}…`);
    // el compAI viaja con el usuario
    const sep = M.url.includes('?') ? '&' : '?';
    setTimeout(() => { location.href = M.url + sep + 'guia=' + encodeURIComponent(guia.id); }, 750);
  });
  // ?ventana=1 → abierta de entrada (captura determinista del gate visual)
  if (qs.get('ventana') === '1') abrirVentana();

  // ── clicks e hover: portales (si los hubiera) + el DOMO ──
  const ray = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  const _wp = new THREE.Vector3();
  let downX = 0, downY = 0, downT = 0, hover = null, lastMove = 0;
  function bajoPuntero(ev) {
    puntero.x = (ev.clientX / innerWidth) * 2 - 1;
    puntero.y = -(ev.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(puntero, camera);
    const hit = ray.intersectObjects(clicables, false)[0];
    if (hit) return { portal: hit.object.userData.portal };
    if (domoClicables.length) {
      const hd = ray.intersectObjects(domoClicables, false)[0];
      if (hd) return { domo: hd.object };
    }
    return null;
  }
  addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; downT = performance.now(); });
  addEventListener('pointerup', (e) => {
    if (ventanaAbierta) return;                       // la ventana manda; el valle no raycastea debajo
    if (performance.now() - downT > 600) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 7) return;
    // ── ¿tocó a su compañero? El compañero responde ANTES que el valle ─────
    // «tóquelo para que le cuente» (el contrato de marco.js, ahora también
    // aquí). El sprite es pointer-events:none para no pelear con el arrastre
    // del mapa, así que el toque se resuelve por su rectángulo en pantalla.
    const rc = spriteEl.getBoundingClientRect();
    if (spriteEl.style.opacity !== '0' && rc.width > 0
      && e.clientX >= rc.left - 6 && e.clientX <= rc.right + 6
      && e.clientY >= rc.top - 6 && e.clientY <= rc.bottom + 6) {
      decirDeMundo(mundoCercano());
      return;
    }
    const h = bajoPuntero(e);
    if (!h) return;
    if (h.domo) {
      // ── EL DOMO = LA ENTRADA A LOS JUEGOS (decisión del operador, 2026-08-06) ──
      // Antes abría la ventana-índice de los nueve mundos. Ahora lleva a la SALA
      // DE JUEGOS: por dentro el domo es una sala con televisores y máquinas, y
      // cada una entra a un juego cruzando el túnel.
      // Los nueve mundos NO quedan huérfanos: sus portales se tocan directo en el
      // valle (es la ruta principal; la ventana era solo un índice de atajo).
      h.domo.getWorldPosition(_wp);
      fxTeleport(_wp, true);
      toast('🎮 Entrando a la sala de juegos…');
      setTimeout(() => { location.href = './juegos/'; }, 750);
      return;
    }
    const P = h.portal;
    const M = P.userData.mundo;
    fxTeleport(P.position, true);
    if (M.url) {
      toast(`${M.icono} Entrando al mundo: ${M.nombre}…`);
      setTimeout(() => { location.href = M.url; }, 750);
    } else {
      toast(`${M.icono} Aquí se abre el mundo de ${M.nombre}`);
    }
  });
  addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - lastMove < 90) return; lastMove = now;
    if (ventanaAbierta) { hover = null; return; }
    const h = bajoPuntero(e);
    hover = h && h.portal ? h.portal : null;
    canvas.style.cursor = h ? 'pointer' : '';
  });

  // ── update por frame ──
  let tPrev = 0;
  function update(t) {
    const dt = Math.min(tPrev ? t - tPrev : 0.016, 0.1); tPrev = t;
    for (const p of portales) {
      p.remo.rotation -= dt * (0.5 + 0.13 * (p.M.x % 3));       // el remolino gira
      p.ojo.material.opacity = 0.75 + Math.sin(t * 1.7 + p.M.x) * 0.15;
      p.escT = (hover === p.g) ? PSCALE * 1.07 : PSCALE;
      p.esc += (p.escT - p.esc) * 0.12;
      p.g.scale.setScalar(p.esc);
      p.et.position.y = 6.7 + 7.6 + Math.sin(t * 0.9 + p.M.z) * 0.35; // la etiqueta flota
    }
    pasoGuia(dt, t);
    pasoSombra();          // la sombra de contacto: el ancla visual al DEM
    pasoFx(dt);
    proyectaGuia(t);
  }

  // Hook de gate: permite comprobar en el navegador que la cola es exclusiva
  // sin inferirlo mirando sólo el código. No altera el flujo de producción.
  window.__valleAvisos = {
    toast,
    decir,
    visibles: () => ({
      toast: toastEl.classList.contains('on'),
      compai: diceEl.classList.contains('on'),
      hud: !hudEl?.classList.contains('avisoOculto'),
    }),
  };

  return {
    update,
    // el compAI cruza con el usuario al saltar a 2D o a un mundo
    guiaId: () => guia.id,
    // ── lo que `paseo.js` necesita para que el compAI guíe la cámara ──
    compai: {
      pos: () => (guia.k > 0.05 ? guia.pos : null),   // durante el teleport no existe
      husmear,
      soltar: soltarHusmeo,
      husmeando: () => (guia.husmeo ? guia.husmeo.id : null),
      decir,                                          // la voz, para onboarding/HUD
    },
    // la ventana del domo también se puede abrir desde fuera (onboarding, HUD)
    abrirVentana, cerrarVentana,
    toast,
  };
}
