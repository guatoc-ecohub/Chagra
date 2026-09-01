// ── mundos.js — LOS NUEVE MUNDOS COMO LUGARES DEL PAISAJE ───────────────────
//
// Decisión del operador (2026-07-25, tras el feedback 0/10):
//   «Los mundos principales NO son enlaces ni menú: cada uno está en un punto
//    del valle y se llega caminando. La ubicación ENSEÑA la relación.»
//
// Las dos miradas que pidió:
//  · **Age of Empires** — legibilidad desde arriba: un mundo principal debe
//    verse SIN buscarlo, y estar junto a aquello con lo que se relaciona.
//  · **Jackson / LOTR** — jerarquía por PLANOS: lo importante se enmarca, no
//    se centra; los planos que recede dan profundidad.
//
// Traducción a este valle (la cámara aterriza en el domo mirando -Z, o sea a
// La Chorrera; +X es la DERECHA del cuadro y es aguas abajo):
//
//   PRIMER PLANO (60-110 u) — el corral de la casa:  animales · abono · plantas
//   PLANO MEDIO (250-430 u) — el fondo del valle:    agua · bosque · vender
//   PLANO DE FONDO (400-1130 u) — el horizonte:      tiempo · finca · páramo
//
// TODAS las cotas de abajo están MEDIDAS sobre el DEM real con el mapeo al
// rumbo 311,91° (scratchpad `i/probe-lugares.mjs`), no elegidas a ojo:
// pendiente y msnm de cada puesto van anotados en su ficha. El terreno NO se
// mueve; estos mojones SÍ (ver `modoMover`).
import * as THREE from 'three';
import { height } from './terrain.js';
import { MUNDOS, MURAL } from './catalogo.js';

const MENTA = '#a9d5cb', PETROLEO = '#17333e', ORO = '#ffc46a';
const C_MENTA = 0xa9d5cb, C_PETROLEO = 0x17333e, C_ORO = 0xffc46a, C_GRIS = 0x6b7078;

// Los datos viven en `catalogo.js` (módulo puro, sin three): lo comparten el
// valle, la ventana del domo y el generador Node de los marcos de mundo.
export { MUNDOS, MURAL, ENTS, ESCENA_DE } from './catalogo.js';

const LS_POS = 'guatoc.lugares.v1';      // dónde puso el usuario cada mojón

// ── EL ESCUDO DEL MUNDO — para reconocerlo DE LEJOS ─────────────────────────
// «Los mundos no se reconocen de lejos» (operador, 2026-07-26). El disco de
// antes era el MISMO para los nueve: mandala petróleo + un emoji. A 1,4 km el
// emoji mide 4 px y el mandala es una mancha gris — los nueve idénticos.
//
// Ahora cada mundo trae su COLOR y su SILUETA. Lo que llega primero a esa
// distancia es la mancha de color y el contorno; el glifo y el rótulo llegan
// después. Es la convención de Age of Empires: el icono manda.
//
// Las siluetas se dibujan a mano en el canvas (nada de fuentes, que a 4 px se
// vuelven papilla): cada una es una forma reconocible por su contorno.
const SILUETAS = {
  corral:    (c, r) => { c.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.moveTo(Math.cos(a) * r * 0.30, Math.sin(a) * r * 0.30 * 0.55 + r * 0.10); c.lineTo(Math.cos(a) * r * 0.30, Math.sin(a) * r * 0.30 * 0.55 - r * 0.34); } c.stroke(); c.beginPath(); c.ellipse(0, r * 0.10, r * 0.30, r * 0.17, 0, 0, Math.PI * 2); c.stroke(); },
  pila:      (c, r) => { c.beginPath(); c.moveTo(-r * 0.42, r * 0.30); c.lineTo(0, -r * 0.40); c.lineTo(r * 0.42, r * 0.30); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-r * 0.16, -r * 0.46); c.quadraticCurveTo(0, -r * 0.66, r * 0.16, -r * 0.46); c.stroke(); },
  bancal:    (c, r) => { for (let i = 0; i < 3; i++) { const y = r * (0.28 - i * 0.26), w = r * (0.46 - i * 0.10); c.beginPath(); c.rect(-w, y - r * 0.10, w * 2, r * 0.13); c.fill(); } },
  onda:      (c, r) => { c.beginPath(); c.moveTo(0, -r * 0.44); c.bezierCurveTo(r * 0.40, -r * 0.02, r * 0.30, r * 0.42, 0, r * 0.42); c.bezierCurveTo(-r * 0.30, r * 0.42, -r * 0.40, -r * 0.02, 0, -r * 0.44); c.closePath(); c.fill(); },
  estratos:  (c, r) => { [[-0.34, 0.50], [0.00, 0.38], [0.30, 0.24]].forEach(([y, w]) => { c.beginPath(); c.ellipse(0, r * y, r * w, r * 0.13, 0, 0, Math.PI * 2); c.fill(); }); },
  toldo:     (c, r) => { c.beginPath(); c.moveTo(-r * 0.48, -r * 0.06); c.lineTo(0, -r * 0.44); c.lineTo(r * 0.48, -r * 0.06); c.closePath(); c.fill(); c.beginPath(); c.rect(-r * 0.34, -r * 0.02, r * 0.68, r * 0.10); c.fill(); c.beginPath(); c.moveTo(-r * 0.30, r * 0.08); c.lineTo(-r * 0.30, r * 0.40); c.moveTo(r * 0.30, r * 0.08); c.lineTo(r * 0.30, r * 0.40); c.stroke(); },
  nube:      (c, r) => { c.beginPath(); c.arc(-r * 0.20, -r * 0.10, r * 0.20, 0, Math.PI * 2); c.arc(r * 0.06, -r * 0.20, r * 0.26, 0, Math.PI * 2); c.arc(r * 0.30, -r * 0.06, r * 0.18, 0, Math.PI * 2); c.fill(); c.beginPath(); for (let i = -1; i <= 1; i++) { c.moveTo(i * r * 0.24, r * 0.16); c.lineTo(i * r * 0.24 - r * 0.06, r * 0.44); } c.stroke(); },
  tejado:    (c, r) => { c.beginPath(); c.moveTo(-r * 0.48, r * 0.02); c.lineTo(0, -r * 0.44); c.lineTo(r * 0.48, r * 0.02); c.closePath(); c.fill(); c.beginPath(); c.rect(-r * 0.32, r * 0.02, r * 0.64, r * 0.34); c.fill(); },
  frailejon: (c, r) => { c.beginPath(); c.rect(-r * 0.09, -r * 0.06, r * 0.18, r * 0.48); c.fill(); c.beginPath(); for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.38; c.moveTo(0, -r * 0.06); c.lineTo(Math.cos(a) * r * 0.42, -r * 0.06 + Math.sin(a) * r * 0.42); } c.stroke(); },
};

function discoTex(emoji, apagado, color, silueta) {
  const sz = 256, cv = document.createElement('canvas');
  cv.width = cv.height = sz;
  const c = cv.getContext('2d'), r = sz / 2;
  c.translate(r, r);
  const col = apagado ? '#8b9298' : (color || MENTA);
  const borde = apagado ? '#3a3f45' : '#0b1a21';
  // ── el ESCUDO: banderín de punta abajo, contorno grueso oscuro ──
  // El contorno oscuro es lo que salva la lectura contra la bruma: sin él, a
  // 1,4 km el color se funde con la ladera (medido en la panorámica).
  const W = r * 0.92, H = r * 0.86;
  c.beginPath();
  c.moveTo(-W, -H); c.lineTo(W, -H); c.lineTo(W, H * 0.28);
  c.quadraticCurveTo(W, H * 0.72, 0, H); c.quadraticCurveTo(-W, H * 0.72, -W, H * 0.28);
  c.closePath();
  c.fillStyle = col; c.globalAlpha = apagado ? 0.55 : 0.94; c.fill();
  c.globalAlpha = 1;
  c.lineWidth = sz * 0.055; c.strokeStyle = borde; c.stroke();
  // un filo interior claro: relieve, y separa del fondo cuando el color
  // del mundo se parece al de la ladera (el verde del bosque, sobre todo)
  c.lineWidth = sz * 0.014; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke();
  // ── la SILUETA, dibujada en oscuro sobre el color ──
  c.save();
  c.translate(0, -sz * 0.04);
  c.fillStyle = borde; c.strokeStyle = borde;
  c.lineWidth = sz * 0.035; c.lineCap = 'round';
  c.globalAlpha = apagado ? 0.45 : 0.92;
  // ⚠️ al 100 % la silueta oscura se comía el escudo y a 1,4 km los mundos de
  // silueta maciza (bancal, tejado, corral) volvían a leerse GRISES — medido en
  // la panorámica. Al 78 % queda un marco de color alrededor: primero llega la
  // mancha del mundo, después la forma.
  (SILUETAS[silueta] || SILUETAS.tejado)(c, r * 0.78);
  c.restore();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ── LA MARCA EN LA ROCA — el mundo que HABITA la pared ──────────────────────
// Petroglifo: contorno del mundo pintado en la cara de La Chorrera, con su
// color y su silueta. No es un cartel colgado: es pigmento sobre la piedra
// (mismo criterio del norte visual: huesos reales, piel dibujada).
function marcaTex(color, silueta, apagado) {
  const sz = 512, cv = document.createElement('canvas');
  cv.width = cv.height = sz;
  const c = cv.getContext('2d'), r = sz / 2;
  c.translate(r, r);
  const col = apagado ? '#8b9298' : (color || MENTA);
  // halo de pigmento: la roca «tiñe», no tiene bordes duros
  const g = c.createRadialGradient(0, 0, r * 0.10, 0, 0, r);
  g.addColorStop(0, col + 'aa'); g.addColorStop(0.55, col + '38'); g.addColorStop(1, col + '00');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  // el aro tallado
  c.lineWidth = sz * 0.022; c.strokeStyle = col; c.globalAlpha = 0.92;
  c.beginPath(); c.arc(0, 0, r * 0.68, 0, Math.PI * 2); c.stroke();
  c.lineWidth = sz * 0.008;
  c.beginPath(); c.arc(0, 0, r * 0.60, 0, Math.PI * 2); c.stroke();
  // la silueta, en trazo grueso y claro para que gane a la roca
  c.save();
  c.fillStyle = col; c.strokeStyle = col; c.lineWidth = sz * 0.030; c.lineCap = 'round';
  (SILUETAS[silueta] || SILUETAS.nube)(c, r * 0.95);
  c.restore();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// haz vertical suave: se ve desde lejos sin comerse el cuadro
function hazTex() {
  const w = 8, h = 128, cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, 'rgba(169,213,203,.42)');
  g.addColorStop(0.35, 'rgba(169,213,203,.16)');
  g.addColorStop(1, 'rgba(169,213,203,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  return new THREE.CanvasTexture(cv);
}

export function makeMundos(scene, camera, canvas, opts = {}) {
  const qs = new URLSearchParams(location.search);
  const movibles = opts.movibles || [];
  const guiaId = () => opts.guiaId ? opts.guiaId() : null;

  // ── posiciones guardadas por el usuario (colocación libre) ──
  let guardado = {};
  try { guardado = JSON.parse(localStorage.getItem(LS_POS) || '{}'); } catch (e) { guardado = {}; }
  const posDe = (id, x, z) => (guardado[id] ? { x: guardado[id][0], z: guardado[id][1] } : { x, z });
  function guardar(id, x, z) {
    guardado[id] = [Math.round(x * 10) / 10, Math.round(z * 10) / 10];
    try { localStorage.setItem(LS_POS, JSON.stringify(guardado)); } catch (e) { /* modo privado */ }
  }

  const grupo = new THREE.Group();
  grupo.name = 'mundos-lugares';
  scene.add(grupo);
  const hazT = hazTex();
  const mojones = [];

  const matPiedra = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.95 });
  const matPoste = new THREE.MeshStandardMaterial({ color: 0x6b4a28, roughness: 0.85 });

  // ── PERF: los 9 plintos, INSTANCEADOS (auditoría perf 2026-08-02) ──────────
  // Antes: `new THREE.Mesh(CylinderGeometry(2.1,2.6,1.1,6), matPiedra)` UNA VEZ
  // POR MUNDO dentro de `mojon()` → 9 draw calls sueltos que nunca comparten
  // geometría a nivel de GPU aunque geometría+material sean idénticos (mismo
  // candidato de libro que ya resolvió `portales.js` para las cuentas/rayos).
  // El plinto de cada mojón SÍ puede moverse en `modoMover` (arrastre), así
  // que el índice de instancia de cada uno se re-escribe en el mismo punto
  // donde antes se movía `g.position` (pointermove) — no cambia la lógica de
  // arrastre, sólo CÓMO se dibuja la piedra.
  const PLINTO_GEO = new THREE.CylinderGeometry(2.1, 2.6, 1.1, 6);
  // +1 de margen: si `MURAL` (hoy null, ver catalogo.js) vuelve a activarse,
  // también pasa por `mojon()` y necesita su propio índice de instancia.
  const plintosMesh = new THREE.InstancedMesh(PLINTO_GEO, matPiedra, MUNDOS.length + 1);
  plintosMesh.frustumCulled = false;
  plintosMesh.count = 0;   // crece a medida que mojon() registra cada uno
  let plintoIdx = 0;
  const _plM4 = new THREE.Matrix4();

  // ── ASENTAR EL MOJÓN EN LA LADERA (auditoría 2026-07-26) ──────────────────
  // El plinto se plantaba en `height(x,z)` — el punto EXACTO del centro. Sobre
  // una ladera de 25° y con la escala de distancia (×4 en el flanco) su huella
  // mide ~20 u de ancho, así que el terreno baja ~9 u de un lado al otro: el
  // mojón quedaba MEDIO ENTERRADO arriba y FLOTANDO abajo. Se muestrea la
  // huella hexagonal y se planta en su cota MÍNIMA: nunca flota, y arriba se
  // hunde un poco — que es lo que hace un mojón de verdad.
  function sueloHuella(x, z, radio) {
    let mn = height(x, z);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      mn = Math.min(mn, height(x + Math.cos(a) * radio, z + Math.sin(a) * radio));
    }
    return mn;
  }

  // ── LA ETIQUETA ─────────────────────────────────────────────────────────
  // «El texto de cada mundo, en lugar de aclarar, OSCURECE: casi no se
  //  entiende el texto pequeño. El nombre puede ser MÁS GRANDE.» (operador)
  // Dos consecuencias en el marcado:
  //  · el NOMBRE lleva su color de mundo en un punto, y va grande y en negrita;
  //  · el «porqué» (el texto chico) NO se dibuja cuando el cartel está lejos y
  //    encogido — a ese tamaño no se lee y sólo ensucia. Aparece al acercarse
  //    o al pasar por encima. Un rótulo que no aclara, estorba.
  function etiqueta(M, activo, esMural) {
    const et = document.createElement('button');
    et.className = 'lugarEt' + (activo ? '' : ' apagado') + (esMural ? ' mural' : '');
    et.type = 'button';
    et.style.setProperty('--cm', M.color || MENTA);
    et.innerHTML =
      `<span class="lgN"><i class="lgPt"></i>${M.emoji} ${M.nombre}</span>` +
      `<span class="lgP">${M.lugar}</span>` +
      // los rotos o sin ruta van VISIBLES y DESHABILITADOS con su aviso —
      // nunca ocultos. Y si hay algo equivalente que SÍ sirve, el aviso lo
      // nombra con un enlace: honesto y sin callejón sin salida.
      (activo ? '' : `<span class="lgAv">🚧 ${M.aviso || 'Sin ruta todavía'}` +
        (M.alterna ? ` <a class="lgAlt" href="${M.alterna.url}">→ ${M.alterna.texto}</a>` : '') +
        '</span>');
    et.dataset.id = M.id;
    et.title = M.nombre + ' — ' + M.lugar + (activo ? '' : '\n🚧 ' + (M.aviso || ''));
    capaEt.appendChild(et);
    return et;
  }

  // ── EL MUNDO QUE HABITA LA PARED ────────────────────────────────────────
  // «Lo más importante es que el mundo SE INTEGRE en el valle. El mundo del
  //  clima, que se vea en la pared de La Chorrera.» (operador, 2026-07-26)
  // El punto lo resuelve `cliff.js` (la MISMA piel que dibuja la pared): si la
  // pared se mueve, el mundo se mueve con ella. Aquí sólo se cuelga: una
  // cornisa de piedra que sobresale (para que el mundo tenga dónde posarse) y
  // el petroglifo pintado sobre la roca.
  function colgarDePared(M, g) {
    const P = opts.pared && opts.pared(M.soporte.t, M.soporte.dx || 0);
    if (!P) return null;
    // el tamaño se calcula para que el petroglifo se LEA desde la casa: a
    // ~1.300 u la vertical del cuadro abarca ~1.095 u por cada 900 px, así que
    // 60 u ≈ 49 px de alto. Grande sobre la pared (unos 100 m en un farallón de
    // 590), que es exactamente lo que es un petroglifo visto desde el valle.
    // 60 u se perdía en la bruma y 150 tapaba el cuadro desde el ojo humano
    // (medido: capturas `n03` y `r01`). 100 u = 167 m sobre una pared de 590:
    // ~95 px desde el domo y ~58 px desde la panorámica. Se lee en las dos sin
    // comerse ninguna. La marca NO respira con la cámara: es pigmento en la
    // roca, y un petroglifo que cambia de tamaño no es un petroglifo.
    const R = 100;
    // respaldo oscuro: la roca del fondo es clara con bruma encima, así que sin
    // un fondo el pigmento se disuelve. Va DEBAJO de la marca.
    const fondo = new THREE.Mesh(
      new THREE.CircleGeometry(R * 0.46, 40),
      new THREE.MeshBasicMaterial({ color: 0x0b1a21, transparent: true, opacity: 0.42,
        depthWrite: false, fog: false }));
    // ⚠️ LEVANTADA. `facePos` devuelve el punto SOBRE la piel: un disco de 150 u
    // centrado ahí queda medio enterrado en cuanto la ladera no es vertical
    // (medido: en el puesto del bosque el centro caía justo en la cota del
    // terreno, o sea 75 u dentro del cerro). Se sube media marca y se separa
    // de la roca lo suficiente para que no la corte.
    fondo.position.set(0, R * 0.44, R * 0.075);
    g.add(fondo);
    const marca = new THREE.Mesh(
      new THREE.PlaneGeometry(R, R),
      new THREE.MeshBasicMaterial({
        map: marcaTex(M.color, M.silueta, !M.url), transparent: true,
        depthWrite: false, side: THREE.DoubleSide, opacity: M.url ? 0.98 : 0.62,
        fog: false,                          // ver la nota del escudo
      }));
    marca.position.set(0, R * 0.44, R * 0.085);   // pintada sobre la roca, sin cortarse con ella
    g.add(marca);
    // la cornisa: una repisa corta de piedra bajo la marca. Sin ella el
    // petroglifo se lee como calcomanía; con ella, el mundo TIENE dónde estar.
    const cornisa = new THREE.Mesh(new THREE.BoxGeometry(R * 0.60, 5.5, 14), matPiedra);
    cornisa.position.set(0, R * 0.44 - R * 0.40, R * 0.075 + 3.2);
    cornisa.rotation.x = -0.06;
    g.add(cornisa);
    g.position.set(P.x, P.y, P.z);
    grupo.add(g);
    return { alto: R * 0.44 + R * 0.50, P };
  }

  function mojon(M, esMural) {
    const p = posDe(M.id, M.x, M.z);
    const g = new THREE.Group();
    const activo = !!M.url;
    // ── ¿este mundo HABITA un accidente del terreno? ──
    if (M.soporte && M.soporte.tipo === 'pared') {
      const res = colgarDePared(M, g);
      if (res) {
        const et0 = etiqueta(M, activo, false);
        const m0 = { M, g, disco: null, haz: null, et: et0, activo, esc: 1, alto: res.alto, esMural: false, enPared: true };
        mojones.push(m0);
        return m0;
      }
      // si la pared no está disponible, cae al mojón de siempre (degrada, no revienta)
    }

    // ESCALA POR DISTANCIA: un mojón a 1,8 km tiene que medir lo suyo para
    // leerse. Se calcula UNA vez con la distancia al sitio (0,0) — no por
    // frame, que produciría el efecto de cartel que "respira" al moverse.
    const dist = Math.hypot(p.x, p.z);
    const esc = THREE.MathUtils.clamp(1 + dist / 150, 1.35, 9);

    // ── ⛔ SE FUE EL POSTE Y SE FUE EL HAZ ───────────────────────────────
    // Con los ELEMENTOS del mundo plantados en el sitio (`elementos.js`: el
    // corral con su hato, la biofábrica, los bancales, el frailejonal…), el
    // mojón alto dejó de sumar y empezó a estorbar: a escala de la meseta el
    // poste era un mástil de 65 u y el haz una losa translúcida encima del
    // frailejonal — se veía en la captura `f05`. La regla del operador —«si el
    // mundo se lee solo, el rótulo sobra»— aplica también al mojón.
    // Queda sólo la PIEDRA DE TOQUE: un mojón bajo, del tamaño de un hito de
    // camino, que es lo que se raycastea para entrar al mundo.
    // la piedra vive en el InstancedMesh compartido (ver PLINTO_GEO arriba);
    // aquí solo se registra el índice de instancia y se escribe su matriz.
    const plintoIndex = plintoIdx++;
    plintosMesh.userData.porIndice = plintosMesh.userData.porIndice || {};

    // ── LA FLECHA DE PIEDRA: este mojón MIRA a algún sitio ──────────────────
    // Sólo la lleva el que tiene `mira` en el catálogo (hoy, el agua → La
    // Chorrera). Es una cuña sobre el plinto, orientada al rumbo real, más un
    // hilo de luz en el suelo que sale hacia allá: se ve DESDE ARRIBA (lectura
    // AoE) y desde el ojo humano.
    let flechaG = null;
    if (M.mira && opts.miras && opts.miras[M.mira]) {
      const D = opts.miras[M.mira];
      flechaG = new THREE.Group();
      const cuna = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.6, 4), matPiedra);
      cuna.rotation.x = Math.PI / 2;         // acostada, la punta hacia -Z local
      cuna.position.set(0, 2.1, -2.2);
      flechaG.add(cuna);
      const filo = new THREE.Mesh(new THREE.ConeGeometry(0.62, 2.1, 4),
        new THREE.MeshBasicMaterial({ color: C_MENTA, transparent: true, opacity: 0.9 }));
      filo.rotation.x = Math.PI / 2; filo.position.set(0, 2.1, -4.9);
      flechaG.add(filo);
      // el hilo de luz en el suelo, apuntando al destino
      const hilo = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 26),
        new THREE.MeshBasicMaterial({
          color: C_MENTA, transparent: true, opacity: 0.34, depthWrite: false,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        }));
      hilo.rotation.x = -Math.PI / 2; hilo.position.set(0, 0.9, -15);
      flechaG.add(hilo);
      // rumbo real hacia el destino (en coordenadas de escena)
      flechaG.rotation.y = Math.atan2(D.x - p.x, D.z - p.z) + Math.PI;
      g.add(flechaG);
    }

    // el disco: billboard con el mandala y el glifo
    const disco = new THREE.Sprite(new THREE.SpriteMaterial({
      map: discoTex(M.emoji, !activo, M.color, M.silueta), transparent: true, depthWrite: false,
      opacity: activo ? 1 : 0.72,
      // ⚠️ FUERA DEL FOG. Medido en la panorámica: a 1,4 km el `FogExp2` de
      // `atmosphere.js` lavaba el escudo hasta dejarlo del color de la ladera —
      // los nueve, una mancha. La atmósfera NO se toca (es la línea base que el
      // operador aprobó); lo que sale del fog es la CLAVE de lectura, igual que
      // las cartas de bruma y los pájaros ya hacen con `fog:false`.
      fog: false,
    }));
    // ⚠️ 7,4 → 11: a 1,4 km el escudo medía 9 px y los nueve eran la misma
    // mancha. Con 11 y el contorno oscuro se distingue el color y la silueta.
    disco.scale.setScalar(15);   // valor inicial; el tamaño real lo fija update()
    disco.position.y = 7.4;
    g.add(disco);

    const haz = null;   // (el haz salió: ver el bloque de arriba)

    g.scale.setScalar(esc);
    // plantado en la cota MÍNIMA de su huella: ni flotando ni colgado (ver
    // `sueloHuella`). El radio de la huella es el del plinto ya escalado.
    g.position.set(p.x, sueloHuella(p.x, p.z, 2.6 * esc), p.z);
    grupo.add(g);
    g.updateMatrixWorld(true);

    const et = etiqueta(M, activo, esMural);
    const m = { M, g, disco, haz, et, activo, esc, alto: 9 * esc, esMural, plintoIndex };
    plintosMesh.userData.porIndice[plintoIndex] = m;
    syncPlinto(m);
    mojones.push(m);
    return m;
  }

  // escribe la matriz de instancia del plinto de `m` desde `m.g.matrixWorld`
  // (el plinto vive a y=0.55 LOCAL dentro de `g`, igual que el Mesh suelto de
  // antes). Se llama al crear el mojón y de nuevo cada vez que `modoMover` lo
  // arrastra — así el arrastre sigue funcionando idéntico, solo cambia cómo
  // se dibuja la piedra (1 InstancedMesh compartido en vez de 9 Mesh sueltos).
  function syncPlinto(m) {
    m.g.updateMatrixWorld(true);
    _plM4.makeTranslation(0, 0.55, 0);
    _plM4.premultiply(m.g.matrixWorld);
    plintosMesh.setMatrixAt(m.plintoIndex, _plM4);
    if (m.plintoIndex + 1 > plintosMesh.count) plintosMesh.count = m.plintoIndex + 1;
    plintosMesh.instanceMatrix.needsUpdate = true;
  }

  // ── capa DOM de etiquetas + estilos ──
  const css = document.createElement('style');
  css.textContent = `
  #capaLugares{position:fixed;inset:0;pointer-events:none;z-index:6;overflow:hidden}
  .lugarEt{position:absolute;left:0;top:0;transform-origin:50% 100%;pointer-events:auto;
    display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;
    background:linear-gradient(180deg,rgba(14,32,40,.97),rgba(7,18,23,.97));
    border:1.5px solid rgba(169,213,203,.42);border-radius:12px;padding:8px 13px 9px;
    color:#eaf4f1;font-family:system-ui,-apple-system,sans-serif;text-align:center;
    box-shadow:0 8px 26px rgba(0,0,0,.55);white-space:nowrap;
    transition:border-color .18s,transform .18s,background .18s;will-change:transform}
  .lugarEt:hover{border-color:${ORO};background:linear-gradient(180deg,rgba(31,66,79,.97),rgba(15,34,43,.97))}
  /* ── EL TEXTO QUE ACLARA, NO EL QUE OSCURECE (operador, 2026-07-26) ──
     «El texto de cada mundo, en lugar de aclarar, oscurece: casi no se
      entiende el texto pequeño. El nombre puede ser MÁS GRANDE.»
     · el NOMBRE sube de .86rem a 1.06rem y de 600 a 750, con sombra dura
       para que gane contra la ladera y contra la bruma;
     · el punto de color repite la clave del escudo: mancha primero, letra
       después — quien ya reconoció el color no necesita leer;
     · el texto chico sube a .78rem y a opacidad .88 (venía en .68 y .66,
       o sea ~7 px efectivos en la panorámica: ilegible);
     · y sobre todo: CUANDO NO SE PUEDE LEER, NO SE DIBUJA. La clase
       «.corto» (la pone proyectar() cuando la escala baja de 0,92) esconde
       el porqué y el aviso, y deja sólo el nombre grande. Un rótulo que no
       aclara, estorba. Vuelve al acercarse o al pasar por encima. */
  .lugarEt .lgN{font-size:1.06rem;font-weight:750;letter-spacing:.005em;
    display:flex;align-items:center;gap:6px;
    text-shadow:0 1px 0 rgba(0,0,0,.85),0 2px 8px rgba(0,0,0,.75)}
  .lugarEt .lgPt{width:9px;height:9px;border-radius:50%;flex:0 0 auto;
    background:var(--cm,${MENTA});box-shadow:0 0 0 1.5px rgba(0,0,0,.75),0 0 8px var(--cm,${MENTA})}
  .lugarEt .lgP{font-size:.78rem;opacity:.88;max-width:230px;white-space:normal;line-height:1.36;
    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .lugarEt:hover .lgP{-webkit-line-clamp:6}
  .lugarEt .lgAv{font-size:.75rem;color:#f0b585;max-width:230px;white-space:normal;line-height:1.36;margin-top:3px;
    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .lugarEt:hover .lgAv{-webkit-line-clamp:8}
  .lugarEt.corto .lgP,.lugarEt.corto .lgAv{display:none}
  .lugarEt.corto:hover .lgP,.lugarEt.corto:hover .lgAv{display:-webkit-box}
  /* el borde del cartel toma el color del mundo: otra pista sin leer nada */
  .lugarEt{border-color:color-mix(in srgb,var(--cm,${MENTA}) 55%,transparent)}
  /* el onboarding manda: mientras elige compañero, el HUD del valle no estorba */
  body.onbAbierto #capaLugares,body.onbAbierto #guiaSel,body.onbAbierto #barraMover,
  body.onbAbierto #hud,body.onbAbierto #guiaV{opacity:0!important;pointer-events:none!important}
  .lugarEt .lgAlt{display:inline-block;margin-top:3px;color:${MENTA};text-decoration:underline;
    pointer-events:auto;cursor:pointer;filter:none}
  .lugarEt.apagado{opacity:.72;border-color:rgba(150,158,166,.35);cursor:not-allowed;filter:saturate(.25)}
  .lugarEt.apagado:hover{border-color:rgba(150,158,166,.5);background:linear-gradient(180deg,rgba(23,51,62,.94),rgba(11,26,33,.94))}
  .lugarEt.mural{border-color:rgba(255,196,106,.55)}
  .lugarEt::after{content:'';position:absolute;bottom:-7px;left:50%;margin-left:-6px;
    border:6px solid transparent;border-top-color:rgba(169,213,203,.42)}
  /* el cartel que tuvo que subirse para no pisar a otro deja su hilo, así se
     sigue viendo de qué mojón es (reparto del cuadro, 2026-07-26) */
  .lugarEt.despegada::before{content:'';position:absolute;left:50%;top:100%;width:1px;
    height:var(--tira,0px);margin-left:-.5px;pointer-events:none;
    background:linear-gradient(180deg,rgba(169,213,203,.65),rgba(169,213,203,0))}
  /* flecha de borde: el principal que quedó fuera de cuadro (idea AoE) */
  .lugarFlecha{position:absolute;left:0;top:0;pointer-events:auto;cursor:pointer;
    width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;
    background:rgba(23,51,62,.88);border:1px solid rgba(169,213,203,.45);
    display:grid;place-items:center;font-size:1rem;box-shadow:0 4px 14px rgba(0,0,0,.5)}
  .lugarFlecha.apagado{filter:saturate(.2);opacity:.6}
  /* barra de modo mover */
  #barraMover{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:9;
    display:flex;gap:8px;align-items:center;pointer-events:auto;
    background:rgba(11,26,33,.92);border:1px solid rgba(169,213,203,.35);border-radius:999px;
    padding:6px 8px 6px 14px;color:#dff0ec;font:500 .78rem system-ui,sans-serif;
    box-shadow:0 10px 30px rgba(0,0,0,.5)}
  #barraMover button{background:rgba(169,213,203,.14);border:1px solid rgba(169,213,203,.3);
    color:#eaf4f1;border-radius:999px;padding:5px 12px;font:inherit;cursor:pointer}
  #barraMover button:hover{border-color:${ORO}}
  #barraMover.on{border-color:${ORO};box-shadow:0 0 0 1px rgba(255,196,106,.3),0 10px 30px rgba(0,0,0,.5)}
  body.moviendo .lugarEt{cursor:grab}
  /* ── la lupa 2D: mural incrustado ⇄ ampliada fuera del 3D ── */
  #lupa2D{position:fixed;inset:0;z-index:40;display:none}
  #lupa2D.on{display:block}
  #lupa2D .lpFondo{position:absolute;inset:0;background:rgba(4,10,13,.62);backdrop-filter:blur(2px)}
  #lupa2D .lpMarco{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    width:min(94vw,900px);height:min(86vh,720px);display:flex;flex-direction:column;
    background:#0b1a21;border:2px solid rgba(255,196,106,.5);border-radius:16px;overflow:hidden;
    box-shadow:0 30px 90px rgba(0,0,0,.7);transition:width .28s ease,height .28s ease,border-radius .28s}
  #lupa2D.ancha .lpMarco{width:100vw;height:100vh;border-radius:0;border-width:0 0 0 0}
  #lupa2D .lpBarra{display:flex;align-items:center;gap:10px;padding:8px 10px;
    background:linear-gradient(180deg,#17333e,#0f2530);color:#eaf4f1;
    font:500 .8rem system-ui,sans-serif;flex:0 0 auto}
  #lupa2D .lpTit{flex:1;font-weight:600;letter-spacing:.01em}
  #lupa2D .lpBarra button{background:rgba(169,213,203,.14);border:1px solid rgba(169,213,203,.32);
    color:#eaf4f1;border-radius:999px;padding:5px 12px;font:inherit;cursor:pointer;white-space:nowrap}
  #lupa2D .lpBarra button:hover{border-color:${ORO}}
  #lupa2D .lpFrame{flex:1;width:100%;border:0;background:#0a0a0f}
  @media (max-width:560px){
    #lupa2D .lpMarco{width:100vw;height:100vh;border-radius:0}
    .lugarEt .lgP{display:none}
  }
  `;
  document.head.appendChild(css);

  const capaEt = document.createElement('div');
  capaEt.id = 'capaLugares';
  document.body.appendChild(capaEt);

  MUNDOS.forEach((M) => mojon(M, false));
  // El mural «La app» salió (ver el bloque ⛔ de `catalogo.js`): `MURAL` es
  // `null`. La fábrica queda por si vuelve a haber un 2D global que no sea el
  // valle viejo — entonces son cuatro líneas de datos y nada de código.
  if (MURAL) mojon(MURAL, true);
  grupo.add(plintosMesh);   // 1 draw call para las piedras de los 9 mojones

  // ── flechas de borde para los principales fuera de cuadro ──
  const flechas = new Map();
  mojones.forEach((m) => {
    const f = document.createElement('button');
    f.className = 'lugarFlecha' + (m.activo ? '' : ' apagado');
    f.type = 'button'; f.title = m.M.nombre; f.textContent = m.M.emoji;
    f.style.display = 'none';
    f.addEventListener('click', (e) => { e.stopPropagation(); mirarA(m); });
    capaEt.appendChild(f);
    flechas.set(m, f);
  });

  // ── LA LUPA 2D (mecánica New Donk City) ─────────────────────────────────
  // «El usuario PUEDE quedarse en la pantalla 2D ampliada fuera del 3D para
  //  ver mejor, y SIEMPRE vuelve al 3D. Es una lupa, no una salida.»
  // El valle nunca se desmonta: al cerrar, la cámara y el momento siguen
  // exactamente donde estaban (eso resuelve «preservar el estado al volver»).
  let lupaEl = null;
  function lupa(url, titulo) {
    if (!lupaEl) {
      lupaEl = document.createElement('div');
      lupaEl.id = 'lupa2D';
      lupaEl.innerHTML =
        '<div class="lpFondo"></div>' +
        '<div class="lpMarco"><div class="lpBarra">' +
        '<span class="lpTit"></span>' +
        '<button class="lpAmpliar" type="button">⤢ ampliar fuera del 3D</button>' +
        '<button class="lpVolver" type="button">↩ volver al valle</button>' +
        '</div><iframe class="lpFrame" title="pantalla 2D"></iframe></div>';
      document.body.appendChild(lupaEl);
      lupaEl.querySelector('.lpVolver').addEventListener('click', cerrarLupa);
      lupaEl.querySelector('.lpFondo').addEventListener('click', cerrarLupa);
      lupaEl.querySelector('.lpAmpliar').addEventListener('click', (e) => {
        e.stopPropagation();
        const g = lupaEl.classList.toggle('ancha');
        e.target.textContent = g ? '⤡ volver al mural' : '⤢ ampliar fuera del 3D';
      });
      addEventListener('keydown', (e) => { if (e.key === 'Escape' && lupaEl.classList.contains('on')) cerrarLupa(); });
    }
    lupaEl.querySelector('.lpTit').textContent = titulo;
    const fr = lupaEl.querySelector('.lpFrame');
    if (fr.dataset.url !== url) { fr.src = url; fr.dataset.url = url; }
    lupaEl.classList.add('on');
    if (opts.onLupa) opts.onLupa(true);
  }
  function cerrarLupa() {
    if (!lupaEl) return;
    lupaEl.classList.remove('on', 'ancha');
    const b = lupaEl.querySelector('.lpAmpliar');
    if (b) b.textContent = '⤢ ampliar fuera del 3D';
    if (opts.onLupa) opts.onLupa(false);
  }

  // ── entrar a un mundo ──
  // El compAI CRUZA con el usuario: la guía elegida viaja en `?guia=` y el
  // marco del mundo la vuelve a montar al otro lado (no desaparece en el salto).
  function conGuia(url) {
    const g = guiaId(); if (!g) return url;
    const [ruta, hash] = url.split('#');
    const sep = ruta.includes('?') ? '&' : '?';
    return ruta + sep + 'guia=' + encodeURIComponent(g) + (hash ? '#' + hash : '');
  }
  function entrar(m) {
    if (!m.activo) { avisar(m); return; }
    if (m.esMural) { lupa(conGuia(m.M.url), 'La app, en 2D'); return; }
    const url = conGuia(m.M.url);
    if (opts.onEntrar) opts.onEntrar(m.M, url);
    else location.href = url;
  }
  function avisar(m) { if (opts.onAviso) opts.onAviso(m.M); }
  function mirarA(m) { if (opts.onMirar) opts.onMirar(m.g.position); }

  mojones.forEach((m) => {
    m.et.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.closest('.lgAlt')) return;   // el enlace alterno navega solo
      if (mover) return;                        // en modo mover la etiqueta arrastra
      entrar(m);
    });
  });

  // ── raycast sobre los mojones (click en el 3D, no sólo en la etiqueta) ──
  // El plinto (la piedra que se raycastea) ahora vive en `plintosMesh`
  // (InstancedMesh compartido, ver PERF arriba) en vez de ser un Mesh suelto
  // hijo de `m.g`. `THREE.InstancedMesh.raycast()` YA soporta hit-testing
  // por-instancia (devuelve `instanceId`), así que el pick sigue funcionando
  // igual — solo cambia CÓMO se resuelve instancia → mojón.
  const ray = new THREE.Raycaster();
  const pt = new THREE.Vector2();
  const clicables = () => [
    plintosMesh,
    ...mojones.flatMap((m) => m.g.children.filter((c) => c.type === 'Mesh')), // flechaG etc., si algún día llevan Mesh clicable
  ];

  function pick(ev) {
    pt.x = (ev.clientX / innerWidth) * 2 - 1;
    pt.y = -(ev.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(pt, camera);
    const hits = ray.intersectObjects(clicables(), false);
    if (!hits.length) return null;
    const hit = hits[0];
    if (hit.object === plintosMesh && hit.instanceId != null) {
      return plintosMesh.userData.porIndice[hit.instanceId] || null;
    }
    return mojones.find((m) => m.g === hit.object.parent) || null;
  }

  // tap en el 3D sobre un mojón = entrar (arrastrar la cámara NO cuenta).
  // El raycast de `portales.js` sólo apunta a las mallas del domo, así que
  // los dos conviven sin pisarse.
  let dX = 0, dY = 0, dT = 0, hover = null;
  canvas.addEventListener('pointerdown', (ev) => { dX = ev.clientX; dY = ev.clientY; dT = performance.now(); });
  canvas.addEventListener('pointerup', (ev) => {
    if (mover || (lupaEl && lupaEl.classList.contains('on'))) return;
    if (Math.hypot(ev.clientX - dX, ev.clientY - dY) > 9) return;
    if (performance.now() - dT > 700) return;
    const m = pick(ev); if (m) entrar(m);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (arrastrando || (lupaEl && lupaEl.classList.contains('on'))) return;
    const m = pick(ev);
    // se re-aplica SIEMPRE que hay mojón bajo el puntero: `portales.js` also
    // escribe `canvas.style.cursor` en su propio pointermove y lo pisaría.
    if (m) canvas.style.cursor = m.activo ? 'pointer' : 'not-allowed';
    else if (hover) canvas.style.cursor = '';
    hover = m;
  });

  // ── MODO MOVER: todo lo construido y la ubicación de cada mundo ──────────
  // «SE MUEVE: cabaña, carro, domo, invernadero, corral, huerta… Y la
  //  ubicación de cada mundo. NO SE MUEVE: el terreno real, la Chorrera, los
  //  macizos, el río. El sitio es el sitio.» (operador, 2026-07-25)
  let mover = false, arrastrando = null, plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitP = new THREE.Vector3();

  const barra = document.createElement('div');
  barra.id = 'barraMover';
  barra.innerHTML = '<span>Mover lo mío</span><button data-a="on">activar</button>' +
    '<button data-a="reset" title="Devolver todo a su puesto original">restablecer</button>';
  document.body.appendChild(barra);
  barra.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.a === 'on') {
      mover = !mover;
      barra.classList.toggle('on', mover);
      document.body.classList.toggle('moviendo', mover);
      b.textContent = mover ? 'listo' : 'activar';
      if (opts.onModo) opts.onModo(mover);
    } else {
      guardado = {};
      try { localStorage.removeItem(LS_POS); } catch (err) { /* nada */ }
      location.reload();
    }
  });

  function sueloEn(ev) {
    pt.x = (ev.clientX / innerWidth) * 2 - 1;
    pt.y = -(ev.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(pt, camera);
    plano.constant = -(arrastrando ? arrastrando.y0 : 0);
    if (!ray.ray.intersectPlane(plano, hitP)) return null;
    return hitP;
  }

  canvas.addEventListener('pointerdown', (ev) => {
    if (!mover) return;
    const m = pick(ev);
    if (!m) return;
    ev.stopPropagation();
    arrastrando = { m, y0: m.g.position.y };
    canvas.setPointerCapture(ev.pointerId);
  }, true);

  addEventListener('pointermove', (ev) => {
    if (!arrastrando) return;
    const p = sueloEn(ev); if (!p) return;
    const m = arrastrando.m;
    m.g.position.set(p.x, sueloHuella(p.x, p.z, 2.6 * m.esc), p.z);
    syncPlinto(m);   // la piedra vive en el InstancedMesh: re-escribir su matriz al arrastrar
  });

  addEventListener('pointerup', () => {
    if (!arrastrando) return;
    const m = arrastrando.m;
    guardar(m.M.id, m.g.position.x, m.g.position.z);
    arrastrando = null;
  });

  // objetos construidos movibles (carro, mirador, sitio, invernadero…)
  movibles.forEach((mv) => {
    const g2 = guardado['obj:' + mv.id];
    if (!g2 || !mv.obj) return;
    if (mv.padre) {                       // vive en coords locales del sitio (metros)
      mv.obj.position.x = g2[0]; mv.obj.position.z = g2[1];
      if (mv.suelo) mv.obj.position.y = mv.suelo(g2[0], g2[1]);
    } else {
      mv.obj.position.x = g2[0]; mv.obj.position.z = g2[1];
      mv.obj.position.y = height(g2[0], g2[1]) + (mv.dy || 0);
    }
  });

  // ── proyección de etiquetas ─────────────────────────────────────────────
  // ⚠️ REPARTO DEL CUADRO (orden del operador 2026-07-26: «hoy quedan
  // amontonados y desaprovechan el cuadro»). Mover los mojones en el mundo NO
  // alcanza: el abono está a 55 m del corral porque ESA es la lección, y en una
  // panorámica de 1,2 km eso son 20 px. Así que además del reparto en el
  // terreno hay un reparto EN PANTALLA: si dos carteles se pisan, el de atrás
  // sube hasta despegarse (nunca se ocultan, nunca se mueve el mojón).
  const _v = new THREE.Vector3(), _w = new THREE.Vector3();
  const _puestos = [];                       // cajas ya colocadas, este frame
  function proyectar() {
    const w = innerWidth, h = innerHeight;
    _puestos.length = 0;
    // los cercanos se colocan primero: el que manda es el del primer plano
    const orden = mojones.map((m) => ({ m, d: camera.position.distanceTo(m.g.position) }))
      .sort((a, b) => a.d - b.d);
    for (const { m, d } of orden) {
      _w.copy(m.g.position); _w.y += m.alto;
      _v.copy(_w).project(camera);
      const detras = _v.z > 1;
      const sx = (_v.x * 0.5 + 0.5) * w, sy = (-_v.y * 0.5 + 0.5) * h;
      const dentro = !detras && sx > 8 && sx < w - 8 && sy > 8 && sy < h - 8;
      const f = flechas.get(m);
      if (dentro) {
        f.style.display = 'none';
        // el cartel se encoge con la distancia pero nunca por debajo de 0,62:
        // un principal tiene que poder LEERSE, aunque esté en el fondo
        const k = THREE.MathUtils.clamp(1.2 - d / 2200, 0.8, 1.08);
        // lejos: sólo el nombre. El porqué a ese tamaño no se lee (ver CSS).
        m.et.classList.toggle('corto', k < 0.92);
        m.et.style.display = '';
        // ── despegue anti-solapamiento ──
        // Caja aproximada del cartel (el ancho real se mide una vez y se
        // cachea: leerlo cada frame forzaría reflow y mataría los FPS).
        if (!m._cw || m._cw < 2) { const r = m.et.getBoundingClientRect(); m._cw = r.width || 170; m._ch = r.height || 56; }
        const cw = m._cw * k, ch = m._ch * k;
        let dy = 0;
        for (let it = 0; it < 14; it++) {
          const x0 = sx - cw / 2, x1 = sx + cw / 2, y1 = sy - dy, y0 = y1 - ch;
          const choca = _puestos.some((q) => x0 < q.x1 + 6 && x1 > q.x0 - 6 && y0 < q.y1 + 5 && y1 > q.y0 - 5);
          if (!choca) break;
          dy += ch * 0.55 + 6;
        }
        // que el despegue no lo saque del cuadro por arriba
        if (sy - dy - ch < 6) dy = Math.max(0, sy - ch - 6);
        _puestos.push({ x0: sx - cw / 2, x1: sx + cw / 2, y0: sy - dy - ch, y1: sy - dy });
        // hilo del cartel al mojón cuando se despegó (si no, se pierde a quién
        // pertenece la etiqueta)
        m.et.style.setProperty('--tira', dy > 4 ? (dy / k).toFixed(1) + 'px' : '0px');
        m.et.classList.toggle('despegada', dy > 4);
        m.et.style.transform = `translate(${sx.toFixed(1)}px, ${(sy - dy).toFixed(1)}px) translate(-50%,-100%) scale(${k.toFixed(3)})`;
        m.et.style.zIndex = String(2000 - Math.round(d));
      } else {
        m.et.style.display = 'none';
        // flecha pegada al borde en la dirección del mundo
        let ax = sx, ay = sy;
        if (detras) { ax = w - sx; ay = h - sy; }
        const cx = w / 2, cy = h / 2;
        let dx = ax - cx, dy = ay - cy;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len; dy /= len;
        const mx = w / 2 - 26, my = h / 2 - 26;
        const t = Math.min(Math.abs(mx / (dx || 1e-6)), Math.abs(my / (dy || 1e-6)));
        f.style.display = '';
        f.style.transform = `translate(${(cx + dx * t).toFixed(1)}px, ${(cy + dy * t).toFixed(1)}px)`;
      }
    }
  }

  function update(t) {
    for (const m of mojones) {
      if (!m.disco) continue;                  // los que HABITAN la pared no llevan mojón
      // ── TAMAÑO ANGULAR ACOTADO ──────────────────────────────────────────
      // Escalar sólo por la distancia AL SITIO (como venía) sirve para la
      // panorámica y ARRUINA el ojo humano: medido en `?cam=guatoc`, el escudo
      // del páramo tapaba la cresta y el del agua era una losa azul en mitad
      // del valle. Y escalar sólo por distancia a la cámara hace que el cartel
      // «respire» al moverse. La salida es la del mapa: tamaño ANGULAR fijo
      // (≈1,7°) con topes duros arriba y abajo, así que ni desaparece a 1,4 km
      // ni se come el cuadro a 60 m. El grupo ya escala ×m.esc: se divide.
      const dCam = camera.position.distanceTo(m.g.position);
      const objetivo = THREE.MathUtils.clamp(dCam * 0.030, 9, 46);
      m.disco.scale.setScalar(objetivo / m.esc);
      m.disco.position.y = 7.4 + Math.sin(t * 1.1 + m.g.position.x * 0.01) * 0.5;
      if (m.haz) m.haz.material.opacity = 0.38 + Math.sin(t * 1.6 + m.g.position.z * 0.01) * 0.12;
    }
    proyectar();
  }

  return {
    update, mojones, entrar, pick,
    // ── los puntos que la PANORÁMICA DE ENTRADA tiene que encuadrar ─────────
    // Base y cabeza de cada mojón. `main.js` ajusta la cámara final del vuelo
    // hasta que TODOS caen dentro del cuadro (ver `encuadrarTodo`): así el
    // cierre tipo Age of Empires se MIDE, y si mañana se mueve un mundo la
    // panorámica se re-ajusta sola.
    puntos: () => mojones.flatMap((m) => [
      m.g.position.clone(),
      new THREE.Vector3(m.g.position.x, m.g.position.y + m.alto * 1.06, m.g.position.z),
    ]),
    get moviendo() { return mover; },
    esClicable: (ev) => !!pick(ev),
    clickEn: (ev) => { const m = pick(ev); if (m) { entrar(m); return true; } return false; },
  };
}
