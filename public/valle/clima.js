// ── EL TIEMPO SOBRE EL VALLE REAL ────────────────────────────────────────────
// `?clima=<lluvia|sol|niebla|arcoiris>`: el MISMO valle — el DEM, el farallón
// de cliff.js, La Chorrera de waterfalls.js, el domo, los mundos — con tiempo
// encima. NO es una escena aparte (la regla de la casa, igual que `?hora=noche`
// y `?leccion=agua`): este módulo solo MUEVE los diales que ya existen (cielo,
// luces, bruma, agua, exposición) y suma lo que cada clima trae de suyo:
//   · lluvia   → el aguacero: cortinas que NACEN del páramo y bajan al valle,
//                gotas ancladas al DEM, charcos con ondas en la pradera.
//   · sol      → hora dorada: el cielo se abre, el aire se entibia, polvo de
//                oro flotando sobre la finca (Zelda BOTW: la luz da ganas).
//   · niebla   → el bosque de niebla bebiendo del aire: el valle en leche,
//                bancos que SUBEN del cañón (la firma que no duerme).
//   · arcoiris → después del aguacero: el arco SOBRE La Chorrera.
//
// EL MOMENTO NOLAN (el asombro sale de la verdad, no del truco):
//   1. La lluvia de Guatoc no "cae del cielo": NACE ARRIBA. El páramo cosecha
//      la niebla con el frailejonal y la suelta quebrada abajo — por eso las
//      cortinas de agua de este módulo cuelgan de la CRESTA del farallón
//      (facePos/pathX, la misma piel de cliff.js) y avanzan hacia el valle.
//   2. El arcoíris no se puso donde "queda bonito": el sol del amanecer del
//      valle nace a la ESPALDA del sitio (+z, atmosphere.js) y La Chorrera
//      está AL FRENTE (−z) — o sea el punto antisolar cae SOBRE la caída.
//      Parado en el domo, con el sol atrás y el agua pulverizada de la
//      cascada al frente, el arco sobre La Chorrera es FÍSICA, no decorado.
//      (El θ=14° del sol corre el antisolar un pelo a la izquierda; el arco
//      corona la caída con ese sesgo — Zelda manda el encuadre, la física
//      asiente.) Radio primario 42°, rojo afuera → violeta adentro,
//      secundario tenue invertido a 51°: como en el cielo de verdad.
//
// LA TRANSICIÓN es un solo factor k (0=despejado → 1=clima) con smootherstep
// sobre ~5 s. Cambiar de clima con los chips baja k a 0, cambia de meta y
// vuelve a subir: siempre se pasa por el valle despejado — la prueba viva de
// que es EL MISMO valle. Con `?cam=` k arranca en 1: captura determinista.
//
// GROUNDING (Guatoc, 4°44'N, 2500 msnm, bosque andino de niebla):
//   · La lluvia de montaña andina es de la tarde, convectiva, y viene DEL
//     macizo: se ve llegar desde la casa (el operador la ve nacer en la
//     meseta del páramo, 3084 msnm — cresta y≈341 del DEM).
//   · La niebla es riego: precipitación horizontal del bosque de niebla
//     (chagra/src/mockups/ClimaAtmosfera.jsx: «la niebla riega por usted»).
//   · Los consejos del pie vienen del módulo 2D del clima de chagra
//     (ClimaAtmosfera/climaBoletines): misma voz, en usted, para la niña y
//     para el campesino. Aquí el valle los ENSEÑA con el cuerpo.
//   · Ninguna posición se hornea: gotas, charcos, bancos y cortinas se
//     derivan de height()/facePos/pathX — si el valle se mueve, el clima
//     se mueve con él.
import * as THREE from 'three';
import { height, SITE_X, SITE_Z } from './terrain.js';
import { facePos, pathX } from './cliff.js';
// EL COMPAI VIVE EL CLIMA (#111, núcleo puro — ver compai/climaVivo.js): al
// cerrar un cambio de clima el compañero reacciona. Para `lluvia` el estado
// visual del valle YA ES el hecho (no una predicción inventada: está
// lloviendo ahora), así que se arma el `forecast7d` mínimo que hace que
// `reaccionAlClima` reconozca ese mismo hecho y hable con su mensaje y gesto
// canónicos — cero fabricación, es la MISMA regla que ya decidió el núcleo,
// aplicada al presente en vez de al pronóstico de mañana. sol/niebla/arcoiris
// no tienen un tipo equivalente en el núcleo (no son helada/lluvia/sequía):
// ahí el compAI dice el propio letrero del pie (LETRA), que ya es voz
// aprobada del módulo 2D de clima — no se inventa un tipo nuevo para forzarlos.
import { reaccionAlClima, UMBRAL_LLUVIA_MM } from './compai/climaVivo.js';

/* ── RNG determinista (el gate compara capturas) ──────────────────────────── */
function makeRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* ── texturas pintadas en canvas (lámina, no foto) ────────────────────────── */

// cortina de lluvia: rayas verticales apenas inclinadas, densas arriba,
// disueltas abajo — la manga de agua que se ve llegar desde la casa
function veilTexture(size = 256, seed = 9) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const rng = makeRng(seed * 7919 + 31);
  c.strokeStyle = 'rgba(255,255,255,1)'; c.lineCap = 'round';
  for (let i = 0; i < 150; i++) {
    const x = rng() * size, y0 = rng() * size * 0.35;
    const len = size * (0.3 + rng() * 0.55);
    c.globalAlpha = 0.04 + rng() * 0.10;
    c.lineWidth = 0.8 + rng() * 1.8;
    c.beginPath(); c.moveTo(x, y0); c.lineTo(x + size * 0.03, y0 + len); c.stroke();
  }
  c.globalAlpha = 1;
  // borde a cero por todos lados + más cuerpo arriba (la cortina cuelga)
  c.globalCompositeOperation = 'destination-in';
  const gv = c.createLinearGradient(0, 0, 0, size);
  gv.addColorStop(0, 'rgba(0,0,0,0)'); gv.addColorStop(0.12, 'rgba(0,0,0,1)');
  gv.addColorStop(0.62, 'rgba(0,0,0,0.85)'); gv.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gv; c.fillRect(0, 0, size, size);
  const gr = c.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.55);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gr; c.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// banco de niebla: suma de blobs radiales suaves, borde a cero (sin rectángulos)
function bancoTexture(size = 256, seed = 3) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const rng = makeRng(seed * 4241 + 97);
  for (let i = 0; i < 26; i++) {
    const x = size * (0.12 + rng() * 0.76), y = size * (0.25 + rng() * 0.5);
    const r = size * (0.10 + rng() * 0.20);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.10 + rng() * 0.14})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  c.globalCompositeOperation = 'destination-in';
  const gr = c.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size * 0.5);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gr; c.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ── LA LLUVIA: gotas ancladas al DEM ───────────────────────────────────────
      LineSegments (raya = gota con vector), un solo draw call. Cada gota nace
      bajo su techo de nube y MUERE en height(x,z) de SU columna — el módulo
      de la caída es el vano real entre nube y suelo, así que ninguna gota
      atraviesa el terreno ni llueve dentro de la montaña. */
function makeGotas() {
  const N = 2400;
  const rng = makeRng(20260730);
  const pos = [], tip = [], seed = [], span = [];
  for (let i = 0; i < N; i++) {
    // el aguacero cubre la pradera del sitio Y el cañón hacia la pared:
    // desde el ojo de Guatoc se ve llover AQUÍ y ALLÁ (profundidad)
    const x = -520 + rng() * 1040;
    const z = -980 + rng() * 1280;
    const g = height(x, z);
    const top = g + 150 + rng() * 160;      // techo de nube local
    const sp = top - g;
    const ph = rng(), spd = 0.8 + rng() * 0.5, len = 4 + rng() * 5;
    for (let v = 0; v < 2; v++) {
      pos.push(x, top, z);
      tip.push(v);
      seed.push(ph, spd, len);
      span.push(sp);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 1));
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 3));
  geo.setAttribute('aSpan', new THREE.Float32BufferAttribute(span, 1));
  // índice de pares (0-1, 2-3, …): LineSegments los une de a dos
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 0 } },
    vertexShader: /* glsl */`
      uniform float uT;
      attribute float aTip; attribute vec3 aSeed; attribute float aSpan;
      varying float vA;
      void main() {
        float ph = aSeed.x, spd = aSeed.y, len = aSeed.z;
        // caída rápida (cine, no simulación): la raya es el motion blur
        float fall = mod(uT * 52.0 * spd + ph * aSpan, aSpan);
        vec3 p = position;
        p.y -= fall + aTip * len;
        // viento suave del cañón: la gota se ladea con la caída
        p.x += fall * 0.10 + aTip * len * 0.22;
        // nace y muere en fundido (ni aparece de golpe ni perfora el pasto)
        vA = smoothstep(0.0, 14.0, fall) * smoothstep(0.0, 16.0, aSpan - fall - aTip * len);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uK;
      varying float vA;
      void main() {
        float a = vA * uK * 0.38;
        if (a < 0.01) discard;
        gl_FragColor = vec4(0.80, 0.85, 0.93, a);
      }`,
    transparent: true, depthWrite: false,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  return { obj: lines, mat };
}

/* ── CHARCOS con ondas, en la pradera del sitio ─────────────────────────────
      Discos a ras de pasto, SOLO donde el DEM es casi plano (se sondea la
      pendiente antes de aceptar el puesto — un charco en ladera es mentira).
      Espejan un cielo plomo y les caen gotas: anillos que nacen y mueren. */
function makeCharcos() {
  const rng = makeRng(158158);
  const charcos = new THREE.Group();
  const mats = [];
  let puestos = 0, intentos = 0;
  while (puestos < 9 && intentos < 300) {
    intentos++;
    // la franja DELANTE del domo, la que el ojo de Guatoc ve al pie del
    // cuadro (v1 los regó alrededor del sitio y quedaron a la espalda de la
    // cámara del gate — medido en captura: cero charcos en cuadro)
    const x = SITE_X - 130 + rng() * 190;
    const z = SITE_Z - 170 + rng() * 190;
    const r = 3.0 + rng() * 3.5;
    // ni encima del domo/terraza ni en pendiente: el agua busca lo plano
    if ((x - (-31)) * (x - (-31)) + (z - 40) * (z - 40) < 26 * 26) continue;
    const h0 = height(x, z);
    const dh = Math.max(
      Math.abs(height(x + r, z) - h0), Math.abs(height(x - r, z) - h0),
      Math.abs(height(x, z + r) - h0), Math.abs(height(x, z - r) - h0));
    if (dh > 1.1) continue;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uK: { value: 0 }, uSeed: { value: rng() * 100 } },
      vertexShader: /* glsl */`
        varying vec2 vP;
        void main() {
          vP = uv * 2.0 - 1.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform float uT, uK, uSeed;
        varying vec2 vP;
        void main() {
          float d = length(vP);
          // espejo de cielo plomo: claro al centro, tierra mojada al borde
          vec3 cielo = vec3(0.69, 0.73, 0.80);
          vec3 borde = vec3(0.22, 0.25, 0.28);
          vec3 col = mix(cielo, borde, smoothstep(0.5, 1.0, d));
          // tres gotas cayendo por turnos: anillo que crece y se apaga
          float ring = 0.0;
          for (int j = 0; j < 3; j++) {
            float fj = float(j);
            vec2 cj = 0.45 * vec2(sin(uSeed * 7.0 + fj * 2.1), cos(uSeed * 5.0 + fj * 1.7));
            float age = fract(uT * 0.5 + uSeed + fj * 0.37);
            float rr = age * 0.85;
            ring += smoothstep(0.045, 0.012, abs(length(vP - cj) - rr)) * (1.0 - age) * 0.5;
          }
          col += vec3(ring);
          float a = uK * 0.78 * smoothstep(1.0, 0.85, d);
          if (a < 0.01) discard;
          gl_FragColor = vec4(col, a);
        }`,
      transparent: true, depthWrite: false,
    });
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 26), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, h0 + 0.12, z);       // a ras del pasto real (DEM)
    charcos.add(m);
    mats.push(mat);
    puestos++;
  }
  return { obj: charcos, mats };
}

/* ── LAS CORTINAS QUE NACEN DEL PÁRAMO (el momento Nolan de la lluvia) ──────
      Tres velos rayados cuelgan de la CRESTA del farallón — el punto lo da
      facePos/pathX, la misma piel de cliff.js — y AVANZAN hacia el valle en
      un ciclo lento: la manga de agua se ve llegar, como la ve el operador
      desde la casa. Cada velo renace en la cresta cuando muere en el valle. */
function makeCortinas() {
  const grupo = new THREE.Group();
  const velos = [];
  const defs = [
    { t: 0.86, dx: -140, w: 620, h: 430, o: 0.22, spd: 9.0, ph: 0.00, seed: 9 },
    { t: 0.80, dx: 130, w: 520, h: 380, o: 0.19, spd: 7.0, ph: 0.45, seed: 21 },
    { t: 0.90, dx: -10, w: 720, h: 470, o: 0.16, spd: 5.5, ph: 0.78, seed: 33 },
  ];
  for (const d of defs) {
    const x = pathX(d.t) + d.dx;
    const f = facePos(x, d.t);                 // el punto REAL de la cresta
    const mat = new THREE.MeshBasicMaterial({
      map: veilTexture(256, d.seed), transparent: true, opacity: 0,
      color: 0xaeb8c8, depthWrite: false, fog: false, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), mat);
    m.position.set(x, f.y - d.h * 0.28, f.z + 80);
    m.userData = { d, x0: x, y0: f.y - d.h * 0.28, z0: f.z + 80 };
    grupo.add(m);
    velos.push(m);
  }
  function update(t, e) {
    for (const m of velos) {
      const { d, x0, y0, z0 } = m.userData;
      // el ciclo: nace pegada a la cresta → avanza ~340 u hacia el valle
      // bajando ~90 u → se disuelve → renace (fundido en ambas puntas)
      const kc = ((t * d.spd + d.ph * 340) % 340) / 340;
      m.position.set(x0 + Math.sin(t * 0.05 + d.ph * 9) * 14,
        y0 - kc * 90, z0 + kc * 340);
      m.material.opacity = d.o * e * Math.sin(kc * Math.PI);
    }
  }
  return { obj: grupo, update };
}

/* ── POLVO DE ORO de la hora dorada, sobre la pradera (Zelda BOTW) ────────── */
function makeMotas() {
  const N = 150;
  const rng = makeRng(777001);
  const pos = [], seed = [];
  for (let i = 0; i < N; i++) {
    const x = SITE_X - 130 + rng() * 240;
    const z = SITE_Z - 150 + rng() * 240;
    pos.push(x, height(x, z) + 0.8 + rng() * 12, z);    // sobre el pasto real
    seed.push(rng() * Math.PI * 2, 0.15 + rng() * 0.3, 1.5 + rng() * 3.5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 0 } },
    vertexShader: /* glsl */`
      uniform float uT;
      attribute vec3 aSeed;
      varying float vTw;
      void main() {
        vec3 p = position;
        float f = aSeed.x, w = aSeed.y, r = aSeed.z;
        p.x += sin(uT * w + f) * r;
        p.z += cos(uT * w * 0.7 + f * 2.0) * r;
        p.y += sin(uT * w * 1.3 + f * 3.0) * 0.9;
        vTw = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(uT * (0.8 + w * 2.0) + f * 13.0), 2.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(150.0 / -mv.z, 1.5, 5.0) * (1.0 + vTw);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uK;
      varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vTw * uK * 0.55;
        if (a < 0.01) discard;
        gl_FragColor = vec4(1.0, 0.85, 0.55, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, mat);
  return { obj: pts, mat };
}

/* ── BANCOS DE NIEBLA que suben del cañón (la firma del bosque de niebla) ── */
function makeBancos() {
  const grupo = new THREE.Group();
  const rng = makeRng(4040404);
  const bancos = [];
  const defs = [];
  // ocho bancos entre el sitio y la pared: nacen abajo, SUBEN, se disuelven
  for (let i = 0; i < 8; i++) {
    const x = -360 + rng() * 720;
    const z = -640 + rng() * 560;
    defs.push({
      x, z, y: height(x, z) + 12 + rng() * 30,
      w: 320 + rng() * 420, h: 110 + rng() * 130,
      o: 0.12 + rng() * 0.10, spd: 0.9 + rng() * 1.4,
      ph: rng() * 90, seed: 3 + i * 13,
    });
  }
  // dos alientos CERCA de la casa: la niebla también toca al que mira
  for (let i = 0; i < 2; i++) {
    const x = SITE_X - 90 + rng() * 180, z = SITE_Z - 60 + rng() * 140;
    defs.push({
      x, z, y: height(x, z) + 7, w: 260 + rng() * 140, h: 80 + rng() * 50,
      o: 0.10, spd: 0.7 + rng() * 0.6, ph: rng() * 90, seed: 101 + i * 17,
    });
  }
  for (const d of defs) {
    const mat = new THREE.MeshBasicMaterial({
      map: bancoTexture(256, d.seed), transparent: true, opacity: 0,
      color: 0xf0f3f7, depthWrite: false, fog: false, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), mat);
    m.position.set(d.x, d.y, d.z);
    m.userData = d;
    grupo.add(m);
    bancos.push(m);
  }
  function update(t, e, camPos) {
    for (const m of bancos) {
      const d = m.userData;
      // sube y renace (igual que la bruma viva de atmosphere.js)
      const rise = (t * d.spd + d.ph) % 80;
      const kc = rise / 80;
      m.position.y = d.y + rise * 0.5;
      m.position.x = d.x + Math.sin(t * 0.04 + d.ph) * 10;
      m.material.opacity = d.o * e * (kc < 0.2 ? kc / 0.2 : 1 - (kc - 0.2) / 0.8 * 0.9);
      // billboard solo en yaw (la lección de atmosphere.js: inclinada = pegatina)
      if (camPos) m.rotation.set(0, Math.atan2(camPos.x - m.position.x, camPos.z - m.position.z), 0);
    }
  }
  return { obj: grupo, update };
}

/* ── EL ARCO SOBRE LA CHORRERA ──────────────────────────────────────────────
      Un plano con shader delante de la caída (z = cara + 80: la pared queda
      DETRÁS, las lomas cercanas pueden recortarle los pies — anclado, no
      pegado al lente). El centro del arco es el punto ANTISOLAR del amanecer
      (sol a +6,5° a la espalda → centro a −6,5° bajo el horizonte, sobre la
      visual a la caída) y los radios son los de verdad: 42° el primario
      (rojo AFUERA, violeta ADENTRO), 51° el secundario invertido y tenue,
      con el interior del primario apenas más claro — como en el cielo real.
      Supernumerarios sutiles pegados al violeta: el regalo para el que mira
      dos veces (Nolan). */
function makeArco() {
  const xc = pathX(0.45);
  const f = facePos(xc, 0.45);              // media caída: el punto del gate
  const zP = f.z + 80;                      // el plano, delante de la pared
  const yPie = facePos(xc, 0.03).y;         // el pie de la caída (DEM real)
  // geometría del arco vista desde el ojo de Guatoc (~y −0.8, z 33):
  //   dist al plano ≈ 703 u → centro antisolar y ≈ −81; R42° ≈ 581 u
  const DIST = Math.abs(zP - 33);
  const yCentro = -0.8 - DIST * Math.tan(THREE.MathUtils.degToRad(6.5));
  // ⚠️ MEDIDO EN CAPTURA (v1): el radio físico de 42° son 581 u a esta
  // distancia — el ápice cae en y≈500, FUERA del cuadro del gate, y el arco
  // muere invisible contra el cielo pálido (solo un flanco asomaba en la
  // esquina). Un arcoíris se LEE contra fondo oscuro: el del valle usa ~27°
  // para coronar la caída DENTRO de la pared en sombra. El encuadre lo manda
  // Zelda; el antisolar, el orden espectral (rojo afuera), el secundario
  // invertido y los supernumerarios siguen siendo los de verdad.
  const R1 = DIST * Math.tan(THREE.MathUtils.degToRad(27));
  const R2 = R1 * (51 / 42);
  const W = 1400, H = 780;
  const yC = yPie + H * 0.5 - 60;           // el plano arranca bajo el pie
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uK: { value: 0 },
      uC: { value: new THREE.Vector2(-40, yCentro - yC) },  // sesgo antisolar θ=14°
      uR1: { value: R1 }, uR2: { value: R2 },
    },
    vertexShader: /* glsl */`
      varying vec2 vP;
      void main() {
        vP = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uK, uR1, uR2;
      uniform vec2 uC;
      varying vec2 vP;
      // rueda espectral: h=0 rojo → h≈0.78 violeta
      vec3 espectro(float h) {
        return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      }
      void main() {
        float r = distance(vP, uC);
        float W1 = 26.0, W2 = 20.0;
        vec3 col = vec3(0.0);
        float a = 0.0;
        // primario: rojo en el borde EXTERIOR, violeta adentro
        float t1 = (uR1 - r) / W1;
        if (t1 > 0.0 && t1 < 1.0) {
          col += espectro(t1 * 0.78);
          a += 0.55 * sin(t1 * 3.14159);   // fuerte: se lee contra la pared en sombra
        }
        // interior más claro que el exterior (la luz reflejada vuelve adentro)
        a += 0.045 * smoothstep(uR1 - W1, uR1 - 150.0, r) * step(r, uR1 - W1);
        col += vec3(0.9, 0.93, 1.0) * 0.045 * smoothstep(uR1 - W1, uR1 - 150.0, r) * step(r, uR1 - W1);
        // supernumerarios: dos ecos violeta-verde pegados al interior
        float sn = uR1 - W1 - r;
        if (sn > 0.0 && sn < 40.0) {
          float o = max(0.0, sin(sn * 0.31)) * exp(-sn * 0.055) * 0.10;
          col += espectro(0.55 + 0.2 * sin(sn * 0.31)) * o;
          a += o;
        }
        // secundario: invertido y tenue (51°)
        float t2 = (uR2 - r) / W2;
        if (t2 > 0.0 && t2 < 1.0) {
          col += espectro((1.0 - t2) * 0.78);
          a += 0.20 * sin(t2 * 3.14159);
        }
        // los pies se disuelven en la bruma del fondo del valle
        a *= smoothstep(-390.0, -180.0, vP.y);
        // y las puntas laterales en el aire
        a *= smoothstep(700.0, 520.0, abs(vP.x));
        a *= uK;
        if (a < 0.012) discard;
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
  m.position.set(xc, yC, zP);
  m.renderOrder = 2;                        // encima de la bruma de la caída
  // LLOVIZNA AL SOL: el agua pulverizada que HACE el arco — chispas en el
  // aire de la caída (sin ellas el arco sería un sticker; con ellas es física)
  const rng = makeRng(424242);
  const N = 240, pos = [], seed = [];
  for (let i = 0; i < N; i++) {
    pos.push(xc - 150 + rng() * 300, yPie + rng() * (f.y - yPie), zP - 50 + rng() * 90);
    seed.push(rng() * Math.PI * 2, 0.5 + rng() * 1.2, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 3));
  const chispasMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 0 } },
    vertexShader: /* glsl */`
      uniform float uT;
      attribute vec3 aSeed;
      varying float vTw;
      void main() {
        vec3 p = position;
        p.y -= mod(uT * 6.0 * aSeed.y + aSeed.x * 40.0, 40.0);
        vTw = pow(0.5 + 0.5 * sin(uT * (2.0 + aSeed.y * 3.0) + aSeed.x * 17.0), 3.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(220.0 / -mv.z, 1.0, 3.5) * (0.8 + vTw);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uK;
      varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * vTw * uK * 0.65;
        if (a < 0.01) discard;
        gl_FragColor = vec4(1.0, 0.97, 0.88, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const chispas = new THREE.Points(g, chispasMat);
  const grupo = new THREE.Group();
  grupo.add(m); grupo.add(chispas);
  return { obj: grupo, mat, chispasMat };
}

/* ── LAS METAS: a dónde va cada dial en cada clima ──────────────────────────
      Igual que noche.js: valor de despejado MEDIDO al montar, valor de clima
      DECLARADO aquí. aplicar(e) interpola todos con el mismo factor. */
const METAS = {
  lluvia: {
    expo: 1.01, fog: { col: new THREE.Color(0x6a7586), mul: 2.4 },
    sky: { turb: 12, ray: 1.6, mie: 0.006 },
    dir: { i: 0.7, col: new THREE.Color(0xa8b6c9) },
    hemi: { i: 0.6, sky: new THREE.Color(0x8d9aad), gnd: new THREE.Color(0x1c211b) },
    warm: 0.1, soles: 0, birds: 0, domo: 14,
    cwall: { o: 0.88, col: new THREE.Color(0x99a1b0) },
    mist: { alta: 1.3, baja: 1.15, col: new THREE.Color(0xaab1bf), mix: 0.7 },
    agua: { b: 1.12, tint: new THREE.Color(0xe6ebf1), mix: 0.3 },   // el caudal CRECE
    sil: { col: new THREE.Color(0x5e6672), mix: 0.4 },
  },
  sol: {
    // v1 salía LECHOSO, no dorado (el sol del valle queda a la ESPALDA del
    // cuadro del gate: el cielo hacia La Chorrera no se entibia solo) — el
    // oro tiene que venir de la LUZ, la niebla y la exposición
    expo: 1.54, fog: { col: new THREE.Color(0xb39d79), mul: 0.62 },
    sky: { turb: 4.0, ray: 3.6, mie: 0.038 },
    dir: { i: 3.5, col: new THREE.Color(0xffc070) },
    hemi: { i: 0.62, sky: new THREE.Color(0xbfa87e), gnd: new THREE.Color(0x3a331a) },
    warm: 0.85, soles: 2.0, birds: 1.0, domo: 0,
    cwall: { o: 0.22, col: new THREE.Color(0xf5e3c4) },
    mist: { alta: 0.2, baja: 0.5, col: new THREE.Color(0xf2dcb2), mix: 0.75 },
    agua: { b: 1.05, tint: new THREE.Color(0xfff0d2), mix: 0.3 },
    sil: { col: new THREE.Color(0x9a8a68), mix: 0.42 },
  },
  niebla: {
    expo: 1.18, fog: { col: new THREE.Color(0xd8dee6), mul: 5.5 },
    sky: { turb: 11, ray: 1.4, mie: 0.004 },
    dir: { i: 0.8, col: new THREE.Color(0xdfe5ee) },
    hemi: { i: 0.8, sky: new THREE.Color(0xcfd6df), gnd: new THREE.Color(0x39404a) },
    warm: 0.08, soles: 0, birds: 0, domo: 10,
    cwall: { o: 0.2, col: new THREE.Color(0xe8ecf2) },
    mist: { alta: 0.9, baja: 2.0, col: new THREE.Color(0xe9edf3), mix: 0.8 },
    agua: { b: 0.82, tint: new THREE.Color(0xe9edf2), mix: 0.3 },   // velada
    sil: { col: new THREE.Color(0xb9c2cf), mix: 0.45 },
  },
  arcoiris: {
    expo: 1.44, fog: { col: new THREE.Color(0x8f9ab0), mul: 1.05 },
    sky: { turb: 5.5, ray: 2.9, mie: 0.02 },
    dir: { i: 3.0, col: new THREE.Color(0xffe6c8) },
    hemi: { i: 0.58, sky: new THREE.Color(0x9aa9bd), gnd: new THREE.Color(0x232a16) },
    warm: 0.55, soles: 1.2, birds: 1.0, domo: 0,
    cwall: { o: 0.55, col: new THREE.Color(0xe2e8f0) },
    mist: { alta: 0.55, baja: 1.25, col: new THREE.Color(0xe6ebf2), mix: 0.4 },
    agua: { b: 1.08, tint: new THREE.Color(0xf2f6fb), mix: 0.15 }, // recién llovido
    sil: { col: new THREE.Color(0x6b7280), mix: 0.25 },
  },
};

/* ── los letreros del pie: la voz del módulo 2D del clima, en usted ────────
      (ClimaAtmosfera.jsx + climaBoletines.js — misma escuela: qué es + qué
      hacer, para la niña y para el campesino; aquí el valle lo muestra) */
const LETRA = {
  lluvia: 'La lluvia nace arriba: el páramo cosecha la niebla y la suelta quebrada abajo. Deje descansar los foliares — el aguacero los lava.',
  sol: 'Hora dorada sobre el cañón. Riegue temprano o al caer la tarde: al mediodía el sol evapora el agua antes de que llegue a la raíz.',
  niebla: 'El bosque de niebla bebiendo del aire: la niebla riega por usted. Revise que las eras no se encharquen.',
  arcoiris: 'Pasó el aguacero: el sol a la espalda y el agua en el aire de La Chorrera pintan el arco. Revise goteras y drenajes.',
};
const NOMBRE = { lluvia: '🌧️ Lluvia', sol: '🌤️ Sol', niebla: '🌫️ Niebla', arcoiris: '🌈 Arcoíris' };

/* ── el módulo ────────────────────────────────────────────────────────────── */
export function makeClima({ scene, renderer, camera, atmos, falls, terrainG, site, camMode, clima, compai }) {
  document.body.dataset.clima = clima;
  const H = atmos.noche;                 // los mismos mandos que usa noche.js
  const lerp = THREE.MathUtils.lerp;

  /* ── el DESPEJADO, medido al montar (el punto 0 de todas las metas) ── */
  const expo0 = renderer.toneMappingExposure;
  const fog0 = { col: scene.fog.color.clone(), dens: scene.fog.density };
  const su = H.sky.material.uniforms;
  const sky0 = {
    turb: su.turbidity.value, ray: su.rayleigh.value, mie: su.mieCoefficient.value,
  };
  const dir0 = { i: atmos.dir.intensity, col: atmos.dir.color.clone() };
  const hemi0 = { i: H.hemi.intensity, sky: H.hemi.color.clone(), gnd: H.hemi.groundColor.clone() };
  const warm0 = H.warmFill.intensity;
  const soles = H.soles.map((sp) => ({ sp, o: sp.material.opacity }));
  const pajaros = H.birds.map((b) => ({ b, o: b.material.opacity }));
  const cwall0 = { o: H.cwall.material.opacity, col: H.cwall.material.color.clone() };
  // atmosphere.js compactó las 39 cartas históricas a una API única
  // `{ mesh, setNoche }`; el clima no necesita mutar sus atributos por carta.
  const brumas = Array.isArray(H.mists) ? H.mists.map((m) => ({
    m, o: m.userData.base.o, col: m.material.color.clone(),
    alta: m.position.y > 430,            // techo de nube vs bruma del cañón
  })) : [];
  const aguas = (falls.mats || [])
    .filter((mt) => mt.uniforms && mt.uniforms.uBright && mt.uniforms.uTint)
    .map((mt) => ({ mt, b: mt.uniforms.uBright.value, t: mt.uniforms.uTint.value.clone() }));
  const siluetas = [];
  terrainG.traverse((o) => {
    if (o.isMesh && o.material && o.material.isMeshBasicMaterial) {
      siluetas.push({ mat: o.material, col: o.material.color.clone() });
    }
  });

  /* ── lo que cada clima SUMA (perezoso: solo se construye el que se pide) ── */
  const grupo = new THREE.Group();
  grupo.visible = false;
  scene.add(grupo);
  // el domo encendido cuando el tiempo se cierra: alguien vive aquí y se
  // guarda (Jackson: el mundo está habitado hasta con aguacero)
  const luzDomo = new THREE.PointLight(0xffb367, 0, 80, 1.8);
  luzDomo.position.set(site.domoPos.x, site.terrazaY + 3, site.domoPos.z);
  grupo.add(luzDomo);

  const extras = {};
  function armar(id) {
    if (extras[id]) return extras[id];
    const g = new THREE.Group();
    g.visible = false;
    grupo.add(g);
    const e = { g, updates: [], mats: [] };
    if (id === 'lluvia') {
      const gotas = makeGotas(); g.add(gotas.obj); e.mats.push(gotas.mat);
      const charcos = makeCharcos(); g.add(charcos.obj); e.mats.push(...charcos.mats);
      const cortinas = makeCortinas(); g.add(cortinas.obj); e.updates.push(cortinas.update);
    } else if (id === 'sol') {
      const motas = makeMotas(); g.add(motas.obj); e.mats.push(motas.mat);
      // el LAVADO de oro sobre el cañón: el sol del amanecer queda a la
      // espalda del cuadro del gate, así que su calor sobre la pared se
      // pinta aquí — un aliento cálido ancho, encendido con el factor
      const oroTex = (() => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 128;
        const c = cv.getContext('2d');
        const gg = c.createRadialGradient(64, 64, 4, 64, 64, 64);
        gg.addColorStop(0, 'rgba(255,214,150,0.9)');
        gg.addColorStop(0.5, 'rgba(255,190,110,0.35)');
        gg.addColorStop(1, 'rgba(255,170,90,0)');
        c.fillStyle = gg; c.fillRect(0, 0, 128, 128);
        const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
      })();
      const oro = new THREE.Sprite(new THREE.SpriteMaterial({
        map: oroTex, color: 0xffc98f, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }));
      oro.position.set(60, 330, -560);
      oro.scale.set(1700, 760, 1);
      g.add(oro);
      e.updates.push((t, k) => { oro.material.opacity = 0.13 * k; });
    } else if (id === 'niebla') {
      const bancos = makeBancos(); g.add(bancos.obj);
      e.updates.push((t, k) => bancos.update(t, k, camera && camera.position));
    } else if (id === 'arcoiris') {
      const arco = makeArco(); g.add(arco.obj); e.mats.push(arco.mat, arco.chispasMat);
      // después del aguacero el pasto queda con sus charcos (la historia
      // completa: llovió, escampó, salió el arco)
      const charcos = makeCharcos(); g.add(charcos.obj); e.mats.push(...charcos.mats);
    }
    extras[id] = e;
    return e;
  }

  /* ── los chips: cambiar de clima sin recargar (la prueba viva de que es
        EL MISMO valle — como el botón ☀️/🌙 de la noche) ── */
  const css = document.createElement('style');
  css.textContent = `
#climaBar { position: fixed; left: 50%; transform: translateX(-50%); bottom: 56px;
  z-index: 30; display: flex; gap: 6px; }
/* ⚠️ a 14px se montaba ENCIMA de la barra «Mover lo mío» del valle (medido
   en la captura v1): los chips del clima viven un piso más arriba */
#climaBar button { border: 0; border-radius: 999px; cursor: pointer; padding: 8px 12px;
  font: 600 0.78rem/1 system-ui, -apple-system, sans-serif; color: #e8ecf6;
  background: rgba(14, 18, 30, 0.6); backdrop-filter: blur(3px); }
#climaBar button:hover { background: rgba(24, 30, 48, 0.75); }
#climaBar button[data-on="1"] { background: rgba(233, 237, 243, 0.92); color: #14181e; }
#climaCap { position: fixed; left: 50%; transform: translateX(-50%); bottom: 96px;
  z-index: 30; max-width: min(78vw, 560px); text-align: center; color: #eef2f8;
  font: 500 0.74rem/1.4 system-ui, -apple-system, sans-serif;
  background: rgba(14, 18, 30, 0.55); backdrop-filter: blur(3px);
  border-radius: 10px; padding: 7px 12px; text-shadow: 0 1px 3px #000;
  transition: opacity 0.6s; }`;
  document.head.appendChild(css);
  const bar = document.createElement('div');
  bar.id = 'climaBar';
  const cap = document.createElement('div');
  cap.id = 'climaCap';
  const botones = {};
  for (const id of ['sol', 'lluvia', 'niebla', 'arcoiris']) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = NOMBRE[id];
    b.addEventListener('click', () => pedir(id));
    botones[id] = b; bar.appendChild(b);
  }
  const bx = document.createElement('button');
  bx.type = 'button'; bx.textContent = '✕ Despejar';
  bx.addEventListener('click', () => pedir(null));
  bar.appendChild(bx);
  document.body.appendChild(bar);
  document.body.appendChild(cap);

  /* ── el driver: un factor k, siempre pasando por el despejado al cambiar
        (rAF propio: cero líneas en el loop de main.js — anti-tangle) ── */
  const DUR_S = 5;
  let actual = clima;
  let deseo = clima;
  let k = camMode ? 1 : 0;
  let objetivo = 1;
  let last = performance.now();

  function rotular() {
    for (const id in botones) botones[id].dataset.on = deseo === id ? '1' : '0';
    cap.textContent = actual ? LETRA[actual] : '';
    cap.style.opacity = actual && deseo === actual ? 1 : 0;
    document.body.dataset.clima = actual || '';
  }
  function pedir(id) {
    deseo = id;
    objetivo = (id === actual && id !== null) ? 1 : 0;   // distinto → despejar primero
    rotular();
  }

  /* ── EL COMPAI REACCIONA: un comentario al CERRAR el cambio de clima, no en
        loop (se llama una vez por cada `actual` nuevo, desde tick()). Sin
        compai (host sin guía) es un no-op — el clima sigue igual, mudo. */
  function reaccionar(id) {
    if (!compai || typeof compai.decir !== 'function' || !id) return;
    if (id === 'lluvia') {
      // el hecho YA ES real en la escena: un solo día "de mañana" que cumple
      // el mismo umbral que usa el núcleo — no es un pronóstico inventado.
      const r = reaccionAlClima({ forecast7d: [{}, { precip_mm: UMBRAL_LLUVIA_MM }] });
      if (r && r.mensaje) compai.decir(r.mensaje);
    } else if (LETRA[id]) {
      // sol/niebla/arcoiris: no hay tipo equivalente en el núcleo de clima —
      // el compAI dice la voz ya aprobada del pie (LETRA), no inventa una.
      compai.decir(LETRA[id]);
    }
  }

  armar(actual);
  rotular();
  if (actual && k >= 1) reaccionar(actual);   // arranca con clima activo (?cam=): reacciona ya

  function aplicar(e, t) {
    const M = METAS[actual] || METAS.sol;
    grupo.visible = e > 0.001;
    renderer.toneMappingExposure = lerp(expo0, M.expo, e);
    scene.fog.color.lerpColors(fog0.col, M.fog.col, e);
    scene.fog.density = lerp(fog0.dens, fog0.dens * M.fog.mul, e);

    su.turbidity.value = lerp(sky0.turb, M.sky.turb, e);
    su.rayleigh.value = lerp(sky0.ray, M.sky.ray, e);
    su.mieCoefficient.value = lerp(sky0.mie, M.sky.mie, e);

    atmos.dir.intensity = lerp(dir0.i, M.dir.i, e);
    atmos.dir.color.lerpColors(dir0.col, M.dir.col, e);
    H.hemi.intensity = lerp(hemi0.i, M.hemi.i, e);
    H.hemi.color.lerpColors(hemi0.sky, M.hemi.sky, e);
    H.hemi.groundColor.lerpColors(hemi0.gnd, M.hemi.gnd, e);
    H.warmFill.intensity = lerp(warm0, M.warm, e);
    luzDomo.intensity = M.domo * e;

    for (const { sp, o } of soles) sp.material.opacity = Math.min(1, o * lerp(1, M.soles, e));
    for (const { b, o } of pajaros) b.material.opacity = o * lerp(1, M.birds, e);
    H.cwall.material.opacity = lerp(cwall0.o, M.cwall.o, e);
    H.cwall.material.color.lerpColors(cwall0.col, M.cwall.col, e);

    for (const br of brumas) {
      const o = br.o * lerp(1, br.alta ? M.mist.alta : M.mist.baja, e);
      br.m.userData.base.o = o;          // las que SUBEN recalculan de aquí
      if (br.m.userData.base.still) br.m.material.opacity = o;
      br.m.material.color.lerpColors(br.col, M.mist.col, e * M.mist.mix);
    }
    for (const ag of aguas) {
      ag.mt.uniforms.uBright.value = ag.b * lerp(1, M.agua.b, e);
      ag.mt.uniforms.uTint.value.lerpColors(ag.t, M.agua.tint, e * M.agua.mix);
    }
    for (const si of siluetas) si.mat.color.lerpColors(si.col, M.sil.col, e * M.sil.mix);

    // lo que este clima SUMA, encendido con el mismo factor
    const ex = actual && extras[actual];
    for (const id in extras) extras[id].g.visible = id === actual && e > 0.001;
    if (ex) {
      for (const mt of ex.mats) {
        if (mt.uniforms) {
          if (mt.uniforms.uK) mt.uniforms.uK.value = e;
          if (mt.uniforms.uT) mt.uniforms.uT.value = t;
        }
      }
      for (const up of ex.updates) up(t, e);
    }
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (k !== objetivo) {
      const paso = dt / DUR_S;
      k = objetivo > k ? Math.min(k + paso, 1) : Math.max(k - paso, 0);
    } else if (k === 0 && deseo !== actual) {
      // tocó fondo despejado: ahora sí, el clima nuevo
      actual = deseo;
      if (actual) { armar(actual); objetivo = 1; reaccionar(actual); }
      rotular();
    }
    const e = k * k * k * (k * (k * 6 - 15) + 10);      // smootherstep
    aplicar(e, now / 1000);
    requestAnimationFrame(tick);
  }
  aplicar(camMode ? 1 : 0, 0);
  requestAnimationFrame(tick);

  return { factor: () => k, estado: () => actual };
}
