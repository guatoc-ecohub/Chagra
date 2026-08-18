// ── Atardecer + niebla volumétrica por capas (la firma del bosque de niebla) ──
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

// textura suave de niebla generada en canvas (radial + moteado)
// devuelve el <canvas> crudo (no la CanvasTexture) — PERF: así el atlas de
// abajo puede componer varias en una sola textura sin decodificar de vuelta.
function mistCanvas(size = 256, seed = 1) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  const rand = (() => { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
  // moteado por suma de blobs
  const blobs = [];
  for (let i = 0; i < 26; i++) blobs.push({ x: rand() * size, y: size * 0.35 + rand() * size * 0.3, r: size * (0.10 + rand() * 0.22) });
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0;
    for (const b of blobs) {
      const dx = x - b.x, dy = (y - b.y) * 1.6;
      v += Math.exp(-(dx * dx + dy * dy) / (b.r * b.r));
    }
    v = Math.min(1, v * 0.55);
    // caída radial global + borde forzado a cero (sin rectángulos visibles)
    const cx = x / size - 0.5, cy = y / size - 0.5;
    v *= Math.exp(-(cx * cx * 8 + cy * cy * 12));
    const bd = Math.min(x, y, size - 1 - x, size - 1 - y) / (size * 0.24);
    const bf = Math.max(0, Math.min(1, bd));
    v *= bf * bf * (3 - 2 * bf);
    const i4 = (y * size + x) * 4;
    img.data[i4] = img.data[i4 + 1] = img.data[i4 + 2] = 255;
    img.data[i4 + 3] = Math.floor(v * 255);
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// textura de nube pesada: cobertura amplia, base plana (canon 02)
// devuelve el <canvas> crudo — ver nota de mistCanvas.
function cloudCanvas(size = 256, seed = 5) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  const rand = (() => { let s = seed * 7301 + 11297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
  const blobs = [];
  for (let i = 0; i < 48; i++) blobs.push({
    x: rand() * size, y: size * 0.2 + rand() * size * 0.5, r: size * (0.14 + rand() * 0.26),
  });
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0;
    for (const b of blobs) {
      const dx = x - b.x, dy = (y - b.y) * 1.9;
      v += Math.exp(-(dx * dx + dy * dy) / (b.r * b.r));
    }
    v = Math.min(1, v * 0.8);
    const cx = x / size - 0.5, cy = y / size - 0.5;
    v *= Math.exp(-(cx * cx * 4 + cy * cy * 7));
    const bd = Math.min(x, y, size - 1 - x, size - 1 - y) / (size * 0.12);
    const bf = Math.max(0, Math.min(1, bd));
    v *= bf * bf * (3 - 2 * bf);
    const i4 = (y * size + x) * 4;
    img.data[i4] = img.data[i4 + 1] = img.data[i4 + 2] = 255;
    img.data[i4 + 3] = Math.floor(v * 255);
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// telón de nube: gradiente vertical (denso arriba, se disuelve abajo) para
// fundir el skyline del farallón en blanco — como el cielo nublado de la foto
function cloudWallTexture(size = 256) {
  const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    // gradiente vertical: denso arriba, se disuelve abajo
    const ky = y / size;
    const av = ky < 0.55 ? 1 : ky < 0.8 ? 1 - ((ky - 0.55) / 0.25) * 0.5 : (1 - ky) / 0.2 * 0.5;
    for (let x = 0; x < size; x++) {
      // desvanecimiento horizontal: masa de nube, no banda infinita con
      // borde duro (el borde duro leía como columna blanca desde el sitio)
      const kx = x / size;
      const ah = Math.min(1, Math.min(kx, 1 - kx) / 0.18);
      const i4 = (y * size + x) * 4;
      img.data[i4] = img.data[i4 + 1] = img.data[i4 + 2] = 255;
      img.data[i4 + 3] = Math.floor(255 * av * ah * ah * (3 - 2 * ah) / (3 - 2));
    }
  }
  ctx.putImageData(img, 0, 0);
  const tx = new THREE.CanvasTexture(cv);
  tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}


// ── PERF: atlas de las 6 texturas de bruma/nube en UNA sola textura ─────────
// Antes: 39 THREE.Mesh (uno por carta), cada uno con su propio PlaneGeometry
// y su propio material (rotando entre 3 texturas de niebla + 3 de nube) — 39
// draw calls para algo que nunca cambia de FORMA, solo de posición/opacidad.
// Con las 6 texturas empacadas en un atlas 3×2 y un InstancedMesh con
// atributos por-instancia (offset, tamaño, tint, opacidad, índice de textura,
// fase de animación), las 39 cartas caen a 1 draw call. La animación (billboard
// hacia cámara + deriva/ascenso) se mueve del `update()` de JS al vertex
// shader: mismo resultado visual, cero setMatrixAt por frame.
function atlasTexturas(mistMk, cloudMk) {
  const CELL = 256, COLS = 3, ROWS = 2;
  const cv = document.createElement('canvas');
  cv.width = CELL * COLS; cv.height = CELL * ROWS;
  const ctx = cv.getContext('2d');
  const fuentes = [...mistMk, ...cloudMk]; // índices 0-2 niebla, 3-5 nube
  fuentes.forEach((srcCanvas, i) => {
    const cx = (i % COLS) * CELL, cy = Math.floor(i / COLS) * CELL;
    ctx.drawImage(srcCanvas, cx, cy, CELL, CELL);
  });
  const tx = new THREE.CanvasTexture(cv);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping;
  return tx;
}

// ══ RE-ASENTADO TRAS LA ROTACIÓN 180° ═══════════════════════════════════════
// Las ~40 cartas de bruma, el telón de nube y el rebote frío estaban calibrados
// contra la pared INVENTADA: eje de la visual en x≈0, cara a z≈-745 y cresta a
// y≈694 u. Con el valle rotado el macizo REAL está en otro sitio:
//   · la visual al nacimiento sale a 31,7° a la IZQUIERDA del eje -Z
//     (el escarpe está al SUR-OESTE, no de frente);
//   · a 1085 u en vez de 827 (×1,31 más lejos);
//   · y corona a y≈447 u (3262 msnm) en vez de 694 u (3674 msnm inventados).
// Re-teclear 40 filas a ojo era pedir otra ronda de bugs, así que se les aplica
// LA MISMA transformación que sufrió el relieve: giro alrededor del ojo,
// alejamiento, y remapeo afín de la altura entre el piso del valle y la cresta.
// La bruma sigue al cañón; no queda flotando sobre él.
// ══ CORRECCIÓN 2026-07-26 · EL GIRO Y EL ALEJAMIENTO SE DESHACEN ══════════
// El giro de 17,3° y el ×1,225 de arriba corregían las cartas hacia una cara
// que estaba al SUR-OESTE. Con el mapeo al rumbo REAL de La Chorrera (311,9°)
// esa cara ya no está ahí: la caída volvió al eje -Z, a ~800 u, que es
// EXACTAMENTE la geometría para la que estaban tecleadas las 40 cartas
// originalmente (eje x≈0, cara a z≈-745, ojo a 827 u). O sea la corrección
// sobra y hay que quitarla, no re-afinarla.
//   giro   17,3° → 0°     (la caída ya viene de frente)
//   dist   ×1,225 → ×1,0  (827 u tecleado vs ~800 u real: 3 % — no se toca)
// Lo ÚNICO que sigue haciendo falta es el remapeo de ALTURA, porque la cresta
// inventada medía 3674 msnm (y=694 u) y la real mide 3084 (y=341 u): dejar las
// cartas a su altura vieja las pondría 350 u por encima de la montaña.
//   piso del valle  y=-142 → -65 u  (2407 msnm, medido)
//   cresta          y= 694 → 341 u  (3084 msnm, medido)
const _EX = 0, _EZ = 0;                 // el ojo, en la casa (SITE_X/SITE_Z)
const _TH = 0, _SC = 1;
const _CT = Math.cos(_TH), _ST = Math.sin(_TH);
const _YA = (341 + 65) / (694 + 142), _YB = -65 + 142 * ((341 + 65) / (694 + 142));
// EL TECHO DE NUBE NO SIGUE EL REMAPEO AFÍN, y por una razón: el afín está
// hecho para lo que se APOYA en el relieve (jirones en la ladera, bruma en la
// base). El techo de nube no se apoya en nada — su sitio se define contra el
// FILO, y el filo bajó de y=694 a y=341. Pasándolo por el afín, las cartas de
// 440-520 u de alto bajaban su borde inferior a y≈206, o sea 135 u POR DEBAJO
// de la cumbre: se comían el skyline entero y la captura salía con una banda
// blanca donde debía leerse la meseta (captura N1, y `?nomist=1` lo confirma).
// En file_158 el cielo está cubierto PERO la cresta se lee nítida en silueta.
// Así que las cartas altas (y>700) se bajan RÍGIDO 260 u, que es lo que deja
// su borde inferior en y≈300-430, justo por encima del filo.
const _TECHO = 260;
function reasentar(o) {
  const dx = o.x - _EX, dz = o.z - _EZ;
  return {
    ...o,
    x: _EX + (dx * _CT + dz * _ST) * _SC,
    z: _EZ + (-dx * _ST + dz * _CT) * _SC,
    y: o.y > 700 ? o.y - _TECHO : o.y * _YA + _YB,
  };
}
const reasentarV = (x, y, z) => { const r = reasentar({ x, y, z }); return [r.x, r.y, r.z]; };

export function makeAtmosphere(scene, renderer) {
  // cielo
  const sky = new Sky(); sky.scale.setScalar(9000); scene.add(sky);
  const su = sky.material.uniforms;
  su.turbidity.value = 7.5; su.rayleigh.value = 2.6;
  su.mieCoefficient.value = 0.02; su.mieDirectionalG.value = 0.955;
  const sun = new THREE.Vector3();
  // AMANECER: el sol nace a la ESPALDA del sitio, sobre el cañón que cae
  // 1000 m detrás de Guatoc (cabana-real2). θ≈0 = +z en la escena.
  const phi = THREE.MathUtils.degToRad(90 - 6.5);   // recién asomando
  const theta = THREE.MathUtils.degToRad(14);       // sobre el valle trasero, un pelo al sur
  sun.setFromSphericalCoords(1, phi, theta);
  su.sunPosition.value.copy(sun);

  // aire húmedo del cañón: perspectiva atmosférica REAL — lo lejano se lava
  // hacia gris-azul (chorrera-real-detalle: la pared respira bruma)
  // suficiente aire para separar: espolones (-400), pared (-800) y cresta
  // trasera (-1500) pierden contraste en tres escalones, no como un solo fondo.
  scene.fog = new THREE.FogExp2(0x8b93a6, 0.00025);

  // sol de amanecer RASANTE: entra de la espalda del sitio pero cruzado (+x),
  // así los contrafuertes de la pared dan flanco de luz y flanco de sombra
  // (contra luz frontal plana — el diagnóstico del gate)
  const dir = new THREE.DirectionalLight(0xffe0c0, 2.7);
  dir.position.copy(sun).multiplyScalar(2000);
  dir.position.x += 1500; dir.position.y += 250;   // MÁS cruzado: modelado lateral real
  scene.add(dir);
  const hemi = new THREE.HemisphereLight(0x93a8c2, 0x1c2314, 0.55);
  scene.add(hemi);
  // rebote frío tenue desde el poniente para que las espaldas no queden negras
  const warmFill = new THREE.DirectionalLight(0xb9c4dc, 0.5);
  warmFill.position.set(...reasentarV(-200, 300, -900));
  scene.add(warmFill);

  // glow del sol tras el filo (el bloom lo enciende)
  const glowTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,236,200,1)');
    g.addColorStop(0.25, 'rgba(255,190,120,0.55)');
    g.addColorStop(1, 'rgba(255,150,80,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  // halo del AMANECER sobre el cañón de la espalda (cabana-real2: el sol
  // nace DETRÁS de Guatoc, sobre el valle que cae 1000 m)
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffc98f, transparent: true, opacity: 0.38,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  glow.position.set(160, 260, 1450);
  glow.scale.setScalar(540);
  scene.add(glow);

  // núcleo del sol asomando por el filo de la otra orilla (el bloom lo enciende)
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xfff3d0, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  core.position.set(190, 165, 1400);
  core.scale.setScalar(190);
  scene.add(core);

  // lavado ancho del amanecer sobre el valle trasero
  const dawnWash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffb377, transparent: true, opacity: 0.12,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  dawnWash.position.set(60, 320, 1550);
  dawnWash.scale.set(2600, 900, 1);
  scene.add(dawnWash);

  // el poniente (sobre La Chorrera) respira apenas un rubor frío de madrugada
  const wash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xb9a9c9, transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  wash.position.set(...reasentarV(-10, 560, -1150));
  wash.scale.set(2000, 700, 1);
  scene.add(wash);

  // ── TELÓN de nube tras la cresta del farallón: el skyline se funde en
  // blanco — nunca se ve dónde termina la montaña (chorrera-real-detalle) ──
  const cwall = new THREE.Mesh(
    // 620 → 1500 de alto (2026-07-26): con la cresta real a y≈341 el telón de
    // 620 coronaba en y=740, o sea +26° desde el ojo — DENTRO del cuadro de
    // 68°, y su borde superior salía como una raya blanca horizontal cruzando
    // la pantalla (captura N2). En file_158 el cielo sobre el macizo está
    // cubierto de punta a punta: el telón tiene que llegar arriba del cuadro.
    new THREE.PlaneGeometry(4600, 1500),
    new THREE.MeshBasicMaterial({
      map: cloudWallTexture(), transparent: true, depthWrite: false,
      color: 0xe9edf3, fog: false, side: THREE.DoubleSide,
    }));
  // ALTA: la cumbre redondeada y la cresta trasera se leen contra el cielo
  // (file_158: el skyline es visible; la nube vive por encima)
  // ── el telón, DETRÁS del macizo real ────────────────────────────────────
  // La transformación afín lo dejaba en z≈-951, o sea DELANTE de la cresta
  // real (z≈-1030): en vez de fundir el skyline en blanco, tapaba la montaña
  // entera con una sábana. Va explícitamente más allá de la cumbre, para que
  // el propio macizo le recorte la mitad de abajo (el depth test hace el
  // trabajo) y sólo se lea el aire blanco POR ENCIMA del filo.
  // (2026-07-26) re-encajado sobre la cara real: el filo está a z≈-1120 y
  // corona en y≈341, así que el telón va detrás de -1120 y por encima de 341.
  // Centro en y=700 ⇒ cubre y ∈ [-50, 1450] = de la cresta al techo del cuadro.
  cwall.position.set(0, 700, -1500);
  cwall.rotation.y = _TH;
  if (new URLSearchParams(location.search).get('nomist') !== '1') scene.add(cwall);

  // ── niebla volumétrica: cartas que suben por la ladera ──
  const mistDefs = [
    // velo alojado ENTRE el primer plano y la pared: no tapa la cascada, sólo
    // corta la continuidad visual entre las masas de roca.
    { x: -360, y: 135, z: -650, w: 330, h: 170, o: 0.075, spd: 0.45, drift: 3, tint: 0xdbe2e9, still: true },
    { x: 355, y: 180, z: -655, w: 360, h: 185, o: 0.070, spd: 0.42, drift: -3, tint: 0xdbe2e9, still: true },
    // aire delante de la tercera cresta; queda detrás de los saltos y lava
    // específicamente el lomo alto estratificado.
    { x: 70, y: 485, z: -1210, w: 1450, h: 260, o: 0.13, spd: 0.30, drift: 2, tint: 0xd7e0ea, still: true },
    // banco del fondo del valle: la BASE de la pared se pierde en bruma
    // (chorrera-real-detalle: no se ve dónde termina la montaña)
    { x: -60, y: -235, z: -490, w: 1200, h: 220, o: 0.06, spd: 1.4, drift: 6 },
    { x: 180, y: -205, z: -420, w: 760, h: 170, o: 0.10, spd: 1.1, drift: -5 },
    { x: -280, y: -195, z: -560, w: 820, h: 180, o: 0.05, spd: 1.7, drift: 4 },
    // jirones OCLUYENDO la cascada: el agua desaparece tras la bruma y
    // reaparece (la firma de la foto — nunca se ve la caída entera)
    { x: -38, y: 330, z: -560, w: 260, h: 150, o: 0.055, spd: 0.5, drift: 4 },
    { x: -30, y: 160, z: -545, w: 240, h: 130, o: 0.045, spd: 0.6, drift: -3 },
    // niebla ENVOLVIENDO la pared: jirones contados, saliendo de gargantas,
    // lejos del eje del agua (medio cuadro limpio = contraste)
    { x: -350, y: 320, z: -665, w: 210, h: 105, o: 0.045, spd: 0.7, drift: 4 },
    { x: 330, y: 150, z: -620, w: 220, h: 115, o: 0.04, spd: 0.8, drift: 4 },
    { x: -480, y: 60, z: -590, w: 250, h: 125, o: 0.045, spd: 1.2, drift: 5 },
    // velos ANCHOS abrazando la cara: apenas dos, tenues (el medio cuadro
    // DESPEJADO — el lavado gris mataba el contraste monumental)
    { x: -420, y: 210, z: -625, w: 390, h: 145, o: 0.022, spd: 0.8, drift: 4 },
    { x: 420, y: 90, z: -605, w: 350, h: 135, o: 0.02, spd: 0.7, drift: 3 },
    // ── bruma comiéndose la BASE de la pared (dentro del cuadro chorrera):
    // el pie se disuelve — nunca se ve dónde apoya la montaña ──
    { x: -80, y: -40, z: -600, w: 1300, h: 210, o: 0.09, drift: 6, tint: 0xdfe5ec, still: true },
    { x: 220, y: -70, z: -580, w: 1000, h: 160, o: 0.12, drift: -5, tint: 0xd9e0e9, still: true },
    { x: -350, y: -80, z: -620, w: 900, h: 170, o: 0.13, drift: 4, tint: 0xdce2ea, still: true },
    // ── techo de nube ALTO (file_158: cielo nublado ARRIBA, el skyline de la
    // cumbre redondeada y la cresta trasera quedan VISIBLES en silueta) ──
    { x: -240, y: 870, z: -700, w: 1600, h: 440, o: 0.45, drift: 6, tint: 0xdde3ec, still: true },
    { x: 260, y: 900, z: -710, w: 1500, h: 420, o: 0.42, drift: -5, tint: 0xd6dde8, still: true },
    { x: -40, y: 940, z: -690, w: 2000, h: 500, o: 0.45, drift: 4, tint: 0xe2e7ef, still: true },
    { x: 460, y: 860, z: -680, w: 1100, h: 340, o: 0.38, drift: -6, tint: 0xdde3ec, still: true },
    { x: 760, y: 860, z: -690, w: 1200, h: 400, o: 0.42, drift: 5, tint: 0xdfe4ed, still: true },
    { x: 40, y: 840, z: -680, w: 900, h: 360, o: 0.42, drift: 3, tint: 0xe4e8ef, still: true },
    { x: 330, y: 880, z: -690, w: 1000, h: 380, o: 0.40, drift: -4, tint: 0xe0e5ee, still: true },
    { x: -320, y: 860, z: -685, w: 950, h: 360, o: 0.38, drift: 4, tint: 0xe2e6ee, still: true },
    { x: -120, y: 820, z: -600, w: 950, h: 260, o: 0.13, drift: 7, tint: 0xdce2eb, still: true },
    // LENGÜETAS colgando del techo de nube: el borde inferior es IRREGULAR,
    // con dedos de bruma bajando a alturas distintas (no una línea recta)
    { x: -180, y: 740, z: -672, w: 420, h: 240, o: 0.22, drift: 3, tint: 0xe2e6ee, still: true },
    { x: 480, y: 760, z: -676, w: 380, h: 220, o: 0.20, drift: 2, tint: 0xe0e5ee, still: true },
    { x: -520, y: 730, z: -670, w: 360, h: 210, o: 0.18, drift: -2, tint: 0xdde3ec, still: true },
    // BANCO alto tras la cresta trasera: las cumbres del fondo se FUNDEN en
    // nube por arriba (155), pero el skyline medio queda legible
    { x: -60, y: 900, z: -858, w: 2600, h: 480, o: 0.50, drift: 4, tint: 0xe6eaf1, still: true },
    { x: 420, y: 880, z: -852, w: 1600, h: 420, o: 0.45, drift: -3, tint: 0xe2e7ef, still: true },
    { x: -480, y: 890, z: -855, w: 1500, h: 430, o: 0.45, drift: 3, tint: 0xe4e8f0, still: true },
    // techo alto de nubes pesadas (canon 02), más oscuro, cerrando el cielo
    { x: 30, y: 950, z: -900, w: 3000, h: 520, o: 0.30, drift: 5, tint: 0x4a5268, still: true },
    { x: -430, y: 900, z: -950, w: 1400, h: 300, o: 0.24, drift: 9, tint: 0x505871, still: true },
    // barrigas de nube apenas tibias, muy altas (el rubor del amanecer)
    { x: -300, y: 940, z: -1010, w: 760, h: 140, o: 0.10, drift: 5, tint: 0x8a6549, still: true },
    { x: 280, y: 960, z: -1050, w: 660, h: 120, o: 0.09, drift: -4, tint: 0x7a5a42, still: true },
    // ── BRUMA DE COLLADO (bug 3b "montaña sobre montaña" + DR perspectiva-
    // atmosférica: la bruma SE ACUMULA en los collados y es la LÍNEA DE AIRE
    // que separa un macizo del siguiente). Cuatro cartas ADITIVAS — la niebla
    // existente queda intacta:
    //  · dos tras los hombros del primer plano (z≈-645, entre espolón y
    //    pared): la frontera espolón/pared se lee como aire, no como sutura
    { x: -390, y: 190, z: -645, w: 560, h: 190, o: 0.11, drift: 3, tint: 0xdde4ec, still: true },
    { x: 400, y: 210, z: -650, w: 560, h: 200, o: 0.10, drift: -3, tint: 0xdfe5ed, still: true },
    //  · dos ALTAS en las sillas de los flancos, donde la cresta trasera
    //    (izq) y la segunda montaña (der) asoman sobre el filo de la pared —
    //    justo los puntos donde el skyline leía "una montaña encima de otra"
    //    (la carta existente x:70 w:1450 no cubre esos flancos)
    { x: -720, y: 540, z: -1140, w: 780, h: 260, o: 0.15, drift: 3, tint: 0xdbe2ea, still: true },
    { x: 680, y: 430, z: -1170, w: 860, h: 260, o: 0.14, drift: -3, tint: 0xdde3eb, still: true },
  ];
  // ?nomist=1 — apaga las cartas de bruma (diagnóstico: separar lo que es
  // relieve de lo que es niebla; así se cazó la mancha blanca sobre la caída)
  const SIN_BRUMA = new URLSearchParams(location.search).get('nomist') === '1';
  const mistAtlas = atlasTexturas(
    [mistCanvas(256, 3), mistCanvas(256, 14), mistCanvas(256, 25)],
    [cloudCanvas(256, 5), cloudCanvas(256, 17), cloudCanvas(256, 29)],
  );
  let mistUpdate = () => {};
  let mistNightAPI = { setNoche: () => {} };
  if (!SIN_BRUMA) {
    // por-instancia: offset(3) tamaño(2) tint(3) opacidad(1) texIdx(1)
    // still(1) spd(1) drift(1) fase(1) — todo lo que antes vivía en JS
    // (`update()` movía cada Mesh a mano) ahora es un atributo que el vertex
    // shader lee; CERO trabajo por-frame en la CPU.
    const N = mistDefs.length;
    const aOff = new Float32Array(N * 3), aSize = new Float32Array(N * 2);
    const aTint = new Float32Array(N * 3), aOpac = new Float32Array(N);
    const aTexIdx = new Float32Array(N), aStill = new Float32Array(N);
    const aSpd = new Float32Array(N), aDrift = new Float32Array(N), aPhase = new Float32Array(N);
    const aAlta = new Float32Array(N);   // noche.js: techo de nube (>430) vs bruma del cañón
    let mi = 0, ci = 0;
    const _c = new THREE.Color();
    mistDefs.forEach((md0, i) => {
      const md = reasentar(md0);   // la bruma sigue al cañón real (ver arriba)
      aOff[i * 3] = md.x; aOff[i * 3 + 1] = md.y; aOff[i * 3 + 2] = md.z;
      aSize[i * 2] = md.w; aSize[i * 2 + 1] = md.h;
      _c.set(md.tint ?? 0xf1f4f8);
      aTint[i * 3] = _c.r; aTint[i * 3 + 1] = _c.g; aTint[i * 3 + 2] = _c.b;
      aOpac[i] = md.o;
      aTexIdx[i] = md.tint ? (3 + (ci++ % 3)) : (mi++ % 3);
      aStill[i] = md.still ? 1 : 0;
      aSpd[i] = md.spd || 0;
      aDrift[i] = md.drift || 0;
      aPhase[i] = Math.random() * 100;
      aAlta[i] = md.y > 430 ? 1 : 0;
    });
    const geo = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    geo.index = quad.index;
    geo.setAttribute('position', quad.attributes.position);
    geo.setAttribute('uv', quad.attributes.uv);
    geo.instanceCount = N;
    geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(aOff, 3));
    geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(aSize, 2));
    geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(aTint, 3));
    geo.setAttribute('aOpac', new THREE.InstancedBufferAttribute(aOpac, 1));
    geo.setAttribute('aTexIdx', new THREE.InstancedBufferAttribute(aTexIdx, 1));
    geo.setAttribute('aStill', new THREE.InstancedBufferAttribute(aStill, 1));
    geo.setAttribute('aSpd', new THREE.InstancedBufferAttribute(aSpd, 1));
    geo.setAttribute('aDrift', new THREE.InstancedBufferAttribute(aDrift, 1));
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(aPhase, 1));
    geo.setAttribute('aAlta', new THREE.InstancedBufferAttribute(aAlta, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 300, -800), 3500);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uMap: { value: mistAtlas }, uCamPos: { value: new THREE.Vector3() },
        // noche.js (?hora=noche): 0 = día, 1 = noche llena. La bruma BAJA del
        // cañón casi no pierde cuerpo (plateada por la luna); el techo de
        // nube ALTO se apaga casi del todo (despeja para ver estrellas).
        // Antes esto vivía en un loop JS mesh-por-mesh; ahora son 3 uniforms.
        uNoche: { value: 0 }, uTintAlta: { value: new THREE.Color(0x2e3a55) }, uTintBaja: { value: new THREE.Color(0x93a3c6) },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
      vertexShader: /* glsl */`
        uniform float uTime;
        uniform vec3 uCamPos;
        uniform float uNoche;
        uniform vec3 uTintAlta, uTintBaja;
        attribute vec3 aOff;
        attribute vec2 aSize;
        attribute vec3 aTint;
        attribute float aOpac, aTexIdx, aStill, aSpd, aDrift, aPhase, aAlta;
        varying vec2 vUv;
        varying vec3 vTint;
        varying float vOpac, vTexIdx;
        void main() {
          vUv = uv;
          vTexIdx = aTexIdx;
          // billboard SOLO en yaw, igual que el update() original (nunca se
          // inclina con el picado: de canto leía como columna blanca).
          float yaw = atan(uCamPos.x - aOff.x, uCamPos.z - aOff.z);
          float c = cos(yaw), s = sin(yaw);
          vec3 local = vec3(position.x * aSize.x, position.y * aSize.y, 0.0);
          vec3 rotated = vec3(local.x * c + local.z * s, local.y, -local.x * s + local.z * c);
          vec3 world;
          float baseOpac;
          if (aStill > 0.5) {
            // nubes: derivan lento, opacidad estable
            world = aOff + vec3(sin(uTime * 0.03 + aPhase) * aDrift * 4.0, 0.0, 0.0) + rotated;
            baseOpac = aOpac;
          } else {
            // niebla: SUBE (firma del bosque de niebla) y deriva, se desvanece
            // al subir y renace — misma curva que el update() original.
            float rise = mod(uTime * aSpd + aPhase * 10.0, 90.0);
            world = aOff + vec3(sin(uTime * 0.05 + aPhase) * aDrift * 3.0, rise * 0.55, 0.0) + rotated;
            float k = rise / 90.0;
            float kk = k < 0.15 ? (k / 0.15) : (1.0 - smoothstep(0.15, 1.0, k) * 0.85);
            baseOpac = aOpac * kk;
          }
          // retinte de noche: la alta case casi desaparece (fac 0.06), la
          // baja retiene el 80% de cuerpo — igual que brumas[].fac en noche.js
          float fac = mix(1.0, aAlta > 0.5 ? 0.06 : 0.8, uNoche);
          vOpac = baseOpac * fac;
          vTint = mix(aTint, aAlta > 0.5 ? uTintAlta : uTintBaja, uNoche * 0.85);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap;
        varying vec2 vUv;
        varying vec3 vTint;
        varying float vOpac, vTexIdx;
        void main() {
          float idx = floor(vTexIdx + 0.5);
          float cx = mod(idx, 3.0), cy = floor(idx / 3.0);
          vec2 uv = vec2((cx + vUv.x) / 3.0, (cy + vUv.y) / 2.0);
          vec4 t = texture2D(uMap, uv);
          gl_FragColor = vec4(vTint, t.a * vOpac);
        }
      `,
    });
    const mistMesh = new THREE.Mesh(geo, mat);
    mistMesh.frustumCulled = false;
    mistMesh.renderOrder = 2;
    scene.add(mistMesh);
    mistUpdate = (t, camPos) => { mat.uniforms.uTime.value = t; mat.uniforms.uCamPos.value.copy(camPos); };
    mistNightAPI = { setNoche: (e) => { mat.uniforms.uNoche.value = e; }, mesh: mistMesh };
  }

  // ── aves planeando sobre el cañón (vida) ──
  const birdTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 32;
    const c = cv.getContext('2d');
    c.strokeStyle = 'rgba(20,22,26,0.9)'; c.lineWidth = 3.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(6, 22); c.quadraticCurveTo(20, 8, 32, 18);
    c.quadraticCurveTo(44, 8, 58, 22); c.stroke();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  // SOLO sobre el cañón del amanecer, a la ESPALDA del sitio: contra la cara
  // de La Chorrera los sprites de arco leían como "narices" — fuera de ahí.
  const birds = [];
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Sprite(new THREE.SpriteMaterial({
      map: birdTex, transparent: true, opacity: 0.75, depthWrite: false, fog: false,
    }));
    const sc = 3.5 + Math.random() * 3;
    b.scale.set(sc * 2, sc, 1);
    b.userData = { // planeando el térmico del cañón del amanecer, LEJOS de
      // cualquier cámara de hero-shot (con la cámara adentro del circuito un
      // ave pasaba pegada al lente = gaviota gigante en el cielo)
      cx: -60 + Math.random() * 240, cy: 80 + Math.random() * 110, cz: 750 + Math.random() * 260,
      r: 50 + Math.random() * 80, spd: 0.04 + Math.random() * 0.04, ph: Math.random() * Math.PI * 2,
    };
    birds.push(b); scene.add(b);
  }

  function update(t) {
    for (const b of birds) {
      const u = b.userData;
      const a = t * u.spd + u.ph;
      b.position.set(u.cx + Math.cos(a) * u.r, u.cy + Math.sin(a * 1.7) * 6, u.cz + Math.sin(a) * u.r * 0.5);
    }
    mistUpdate(t, _camPos);
  }
  const _camQuat = new THREE.Quaternion();
  const _camPos = new THREE.Vector3();
  function faceCamera(cam) { _camQuat.copy(cam.quaternion); _camPos.copy(cam.position); }

  // `noche`: los mandos que noche.js necesita para poner el sol (?hora=noche).
  // Solo HANDLES — ninguna lógica de noche vive aquí; el día no cambia en nada.
  return {
    sun, dir, update, faceCamera,
    // `mists`: antes era el array de 39 THREE.Mesh sueltos; ahora es el API
    // del InstancedMesh único (`setNoche(e)` retinta TODAS las cartas de una,
    // `mesh` es el único objeto que hay que esconder/mostrar). noche.js y
    // paramo.js leen esto — ver sus comentarios "PERF" en cada uno.
    noche: { sky, hemi, warmFill, soles: [glow, core, dawnWash, wash], cwall, mists: mistNightAPI, birds },
  };
}
