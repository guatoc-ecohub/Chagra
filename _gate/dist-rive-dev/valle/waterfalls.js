// ── La Chorrera (~590 m, MONUMENTAL) + El Chiflón ────────────────────────────
// Dato del operador, que vive frente a ella: La Chorrera es un HORSETAIL — el
// agua baja ROZANDO la piedra, abrazada al contorno de la pared todo el
// camino, abriéndose en abanico. NO es una sábana ni un chorro en el vacío.
//
// (2026-07-31, brief chorrera-real-valle-nativo) El "hilo fino translúcido"
// de las rondas anteriores leía en el lente del agua como RAYITA PÁLIDA —
// reprobado con captura. Contra chorrera-real-detalle.jpg lo que hay es:
//   · TRES saltos escalonados (SALTOS_T, cliff.js) — cada salto ARRANCA
//     angosto en el labio y se ABRE en VELO BLANCO FRANCO al caer;
//   · ESPUMA blanca reventando contra la repisa de cada escalón;
//   · POZO cristalino en la base, con su anillo de espuma y cantos rodados;
//   · helechos arborescentes ribereños (DR-chorrera: la ribera del bosque
//     de niebla) enmarcando el tramo bajo.
// La técnica sigue siendo barata (nacederoParamo + DR-rdr §2.3-2.4): banda de
// roca EMPAPADA sobre el terreno, velos por shader de flujo encima (nada de
// física), bruma y mechones instanciados. El agua NACE OSCURA en la línea de
// contacto y cada pie REVIENTA blanco — EL GOLPE.
// El Chiflón sí es una caída limpia corta: conserva el cuerpo volumétrico.
import * as THREE from 'three';
import { CHANNEL_X, CHIFLON_X, CHIFLON_T0, clamp, height } from './terrain.js';
import { facePos, SALTOS_T, CUTS_T, pathX } from './cliff.js';
import { CHORRERA_BEATS } from './juegos/chagra-kart/js/pista.js';

// sol de amanecer de atmosphere.js (dir.position ≈ (1980, 476, 1928) normalizada)
const SUN = 'vec3(0.62, 0.15, 0.60)';

const waterVert = /* glsl */`
  attribute float aT;
  varying vec2 vUv;
  varying float vFade;
  varying float vT;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vUv = uv; vT = aT;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vec4 mv = viewMatrix * wp;
    vFade = clamp(1.0 - (-mv.z - 400.0) / 1600.0, 0.85, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;
const waterFrag = /* glsl */`
  uniform float uTime;
  uniform vec3 uTint;
  uniform float uBright;
  uniform float uAlpha;
  uniform float uBirth;
  uniform float uImpact;
  varying vec2 vUv;
  varying float vFade;
  varying float vT;
  varying vec3 vN;
  varying vec3 vW;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  void main() {
    // velos: estrías verticales cayendo, dos octavas
    float n1 = noise(vec2(vUv.x * 9.0, vUv.y * 16.0 - uTime * 1.2));
    float n2 = noise(vec2(vUv.x * 22.0 + 7.0, vUv.y * 34.0 - uTime * 2.1));
    float streak = n1 * 0.6 + n2 * 0.4;
    float lat = smoothstep(0.0, 0.20, vUv.x) * smoothstep(1.0, 0.80, vUv.x);
    lat = pow(lat, 0.5);
    // bordes DESHILACHADOS: el velo se deshace en hebras al caer
    float fray = noise(vec2(vUv.x * 30.0, vUv.y * 44.0 - uTime * 2.6));
    lat *= 0.60 + 0.40 * fray;
    float a = lat * (0.74 + smoothstep(0.30, 0.72, streak) * 0.34);
    a += smoothstep(0.62, 0.92, streak) * lat * 0.50;
    // HEBRAS: varios hilos verticales con vanos FRANCOS entre ellos (la cinta
    // uniforme saturaba a blanco sólido — el velo necesita valles de alfa)
    float strands = noise(vec2(vUv.x * 5.5 + 3.0, vUv.y * 2.2 - uTime * 0.25));
    a *= 0.55 + 0.45 * smoothstep(0.15, 0.58, strands + streak * 0.35);
    // nace fino, el pie REVIENTA blanco (impacto)
    a *= smoothstep(0.0, 0.09, vT);
    // el REVENTÓN sólo donde el agua de verdad golpea (el pie final): los
    // empalmes entre tramos NO son impactos — blanqueaban un nudo a media caída
    float impact = smoothstep(0.80, 1.0, vT) * uImpact;
    a = min(1.0, a + impact * lat * 0.35);
    // el PIE se desfleca (nada de borde inferior cuadrado: la cinta muere
    // rota en lenguas dentro de la bruma del impacto)
    float footN = noise(vec2(vUv.x * 12.0, uTime * 0.7));
    a *= 1.0 - smoothstep(0.955 - footN * 0.05, 0.995 - footN * 0.03, vT) * 0.9;
    a *= 0.80 + 0.20 * noise(vec2(3.0, vUv.y * 2.6 + 0.4));

    // ── LUZ: el agua es un CUERPO redondo que capta el sol ──
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    vec3 L = normalize(${SUN});
    float dif = 0.55 + 0.58 * max(dot(N, L), 0.0);      // la panza modela
    vec3 Hv = normalize(L + V);
    float spec = pow(max(dot(N, Hv), 0.0), 42.0);       // brillo especular
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);   // silueta encendida
    float glint = smoothstep(0.72, 0.94, n2) * spec;    // destellos que corren
    a = min(1.0, a + fres * 0.22 * lat);
    // espuma: cordones blancos + impacto + borde fresnel
    float foamK = clamp(smoothstep(0.45, 0.85, streak) * 0.62 + impact * 0.55 + fres * 0.30, 0.0, 1.0);
    vec3 body = uTint * (0.66 + streak * 0.30);         // cuerpo glaciar tenue
    vec3 foam = vec3(1.06, 1.05, 1.00) * uBright;       // espuma: LO MÁS BLANCO
    vec3 col = mix(body, foam, foamK) * dif
             + vec3(1.25, 1.18, 1.02) * (spec * 0.85 + glint * 1.5)
             + vec3(0.55, 0.62, 0.72) * fres * 0.35;
    col *= 1.0 + impact * 0.22;
    // NACE OSCURO (nacederoParamo): el agua rezuma de la banda empapada en la
    // línea de contacto — no aparece blanca pegada encima de la roca seca.
    float birth = smoothstep(0.20, 0.02, vT) * uBirth;
    col = mix(col, vec3(0.14, 0.18, 0.18), birth * 0.75);
    a *= 1.0 - birth * 0.30;
    gl_FragColor = vec4(col, min(a, 1.0) * 0.97 * vFade * uAlpha);
  }
`;

// LA BANDA DE ROCA EMPAPADA — el ancla del horsetail. No es una sombra que
// separa el agua de la pared (eso era lógica de plunge): es la MANCHA DE
// HUMEDAD pintada sobre el propio terreno, más ancha que el agua, con canto
// irregular y vetas de escurrido. La piedra mojada es lo que hace legible que
// los hilos van ROZANDO la roca — el ojo ancla por el contacto (DR-rdr P4),
// y nacederoParamo ya lo tenía: «la banda mojada de la que rezuma».
const shadowVert = /* glsl */`
  attribute float aT;
  varying vec2 vUv;
  varying float vT;
  void main() { vUv = uv; vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const shadowFrag = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;
  varying float vT;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  void main() {
    // canto IRREGULAR: una mancha de humedad no tiene borde de regla
    float nb = noise(vec2(vUv.x * 3.0, vUv.y * 8.0)) * 0.6
             + noise(vec2(vUv.x * 7.0, vUv.y * 19.0)) * 0.4;
    float lat = smoothstep(0.0, 0.24 + nb * 0.20, vUv.x)
              * smoothstep(1.0, 0.76 - nb * 0.20, vUv.x);
    float v = smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.96, vUv.y);
    // vetas de escurrido: la pared chorreada, casi quieta (no es el agua)
    float streak = noise(vec2(vUv.x * 13.0, vUv.y * 34.0 - uTime * 0.10));
    float a = lat * v * (0.46 + 0.22 * streak);
    // el mojado tiene brillo FRÍO, no negro pez: roca oscura con reflejo
    vec3 col = mix(vec3(0.030, 0.048, 0.050), vec3(0.10, 0.13, 0.14),
                   streak * 0.55 + nb * 0.15);
    gl_FragColor = vec4(col, a);
  }
`;

// ── camino de la caída sobre la cara (compartido por agua y sombra) ──
// xc puede ser un número (columna a plomo) o una FUNCIÓN x(t): la ruta en
// zigzag de La Chorrera se descuelga escalonando de repisa en repisa.
function fallPath(xc, tTop, tBot, widths, SEGS, surfacePos = (x, t) => facePos(x, t), drapeTerrain = true) {
  const xAt = typeof xc === 'function' ? xc : () => xc;
  const x0 = xAt(tTop);
  const samples = [];
  for (let i = 0; i <= SEGS; i++) {
    const t = tTop - ((tTop - tBot) * i) / SEGS;
    const xi = xAt(t);
    samples.push({ x: xi, ...surfacePos(xi, t) });
  }
  // ── DESPEGUE DE LA LADERA ────────────────────────────────────────────────
  // `facePos` ahora devuelve un punto SOBRE la superficie del DEM (antes era
  // un plano inventado 100 u por delante del terreno). Dibujar la cinta ahí
  // mismo la deja coplanar con la malla: el hilo quedaba enterrado y desde el
  // ojo de Guatoc NO SE VEÍA — Gemini no pudo ni identificarlo. Hacia la
  // cámara la sacan del terreno sin moverla de sitio (a 1,3 km, 18 u son 0,4°
  // = 8 px: no cambia el encuadre, sólo deja de estar sepultada).
  //
  // ── HORSETAIL: EL AGUA VA PEGADA A LA ROCA ───────────────────────────────
  // Dato del operador, que vive frente a La Chorrera: es un **horsetail** —
  // el agua baja ROZANDO la piedra, abrazada al contorno de la pared todo el
  // camino, abriéndose en abanico. NO es un `plunge` (chorro que se despega
  // del filo y cae libre).
  //
  // Esto explica CINCO rondas de peleas: se estaba construyendo un plunge, que
  // por definición geomorfológica va despegado de la roca, y luego se peleaba
  // por "pegarlo". Era imposible por diseño. Cuando el operador decía «la capa
  // no está pegada a la montaña» estaba describiendo bien el tipo de salto, no
  // quejándose de estética.
  //
  // El problema REAL a resolver no es despegarla: es que se dibujaba contra un
  // perfil que no es el que se ve. Medido dentro de la página (r/probe.mjs):
  //
  //     t     y   z_cinta   terreno   ENTERRADA
  //   0.70   225   -1071      239      +14 u
  //   0.45   127    -955      134       +8 u
  //   0.35    85    -930      115      +29 u   ← el peor
  //
  // `faceZAt` lee un perfil CACHEADO y SIN micro-relieve (`faceCol` =
  // demY − channelCarve); lo que se dibuja es `height()`, que le suma fbm de
  // ±4,6 u. Y la cara tiene repechos (+8,9° en z≈-880, +16° en z≈-1030), así
  // que `faceZAt` devuelve puntos en un rellano donde el terreno ya volvió a
  // subir. Con un perfil no monótono ninguna constante sirve — ni 9, ni 18.
  //
  // Así que la cinta se DRAPEA sobre la superficie que de verdad se dibuja: se
  // busca el cruce con `height()` por los dos lados (si está enterrada, avanza
  // hacia la cámara hasta salir; si quedó colgando en el aire, retrocede hasta
  // volver a rozar) y se posa con un ROCE mínimo. Agua SOBRE piedra mojada, no
  // una sábana colgada delante. No inventa relieve: sólo sigue el que hay.
  if (drapeTerrain) {
    const ROCE = 5, PASO = 4, TOPE = 90;
    for (const sm of samples) {
      let z = sm.z, k = 0;
      while (k++ < TOPE && height(sm.x, z) > sm.y) z += PASO;   // sale del terreno
      k = 0;
      while (k++ < TOPE && height(sm.x, z - PASO) <= sm.y) z -= PASO; // vuelve a rozarlo
      sm.z = z + ROCE;
    }
  }
  // ⛔ AQUÍ VIVÍA LA "CAÍDA LIBRE": un running-max que impedía que la cinta
  // volviera hacia la montaña (`z = max(z, z_anterior - 0.35)`), o sea la
  // obligaba a descolgarse del labio y caer A PLOMO. **Es lógica de `plunge`
  // y La Chorrera es un `horsetail`**: el agua tiene que poder seguir el
  // contorno hacia adentro cuando la roca se mete. Borrado.
  //
  // Queda sólo el suavizado, que ahora es lo correcto: alisa el escalonado de
  // la malla (12 m de segmento) sin despegar la cinta de la piedra.
  for (let k = 0; k < 7; k++) for (let i = 1; i < SEGS; i++)
    samples[i].z = (samples[i - 1].z + samples[i].z * 2 + samples[i + 1].z) / 4;
  // anchura: nace fina, gana cuerpo, abanico al llegar a la repisa; RESPIRA.
  // (2026-07-26) el ensanche pasa de ×0,55 a ×1,15 en el recorrido. Un
  // horsetail SE ABRE EN ABANICO al bajar —es parte de la definición del tipo,
  // no un gusto—: angosto donde brota, ancho donde llega. Nuestro propio
  // `nacederoParamo.geom.js` ya lo tenía escrito así (`ancho * (0.65 + t*2.5)`,
  // «angosto al brotar, ancho al llegar»). Con ×0,55 la cinta bajaba casi
  // paralela, que es silueta de chorro, no de cola de caballo.
  const w = [];
  for (let i = 0; i <= SEGS; i++) {
    const k = i / SEGS;
    const grow = 1 + k * 1.00 + Math.pow(k, 6) * widths.splay;
    const breathe = 0.72 + 0.56 * (Math.sin(samples[i].y * 0.031 + x0 * 1.7) * 0.5 + 0.5) *
      (Math.sin(samples[i].y * 0.013 + x0) * 0.5 + 0.5) * 1.4;
    w.push((widths.base + samples[i].tread * widths.fan) * grow * breathe);
  }
  for (let k = 0; k < 4; k++) for (let i = 1; i < SEGS; i++) w[i] = (w[i - 1] + w[i] * 2 + w[i + 1]) / 4;
  // serpenteo lateral (el agua busca su camino) — (it3) 3,2→5,2: Gemini pedía
  // que el hilo «zigzaguee pegado a la roca siguiendo sus salientes»; en
  // file_158 la S del trazo es franca, no un temblor
  const xo = samples.map((s) => (Math.sin(s.y * 0.021 + x0) + Math.sin(s.y * 0.043 + x0 * 2.0) * 0.5) * 5.2);
  return { samples, w, xo };
}

// ── caída VOLUMÉTRICA: grid con sección en arco (panza hacia la cámara) ──
function buildFall(xc, tTop, tBot, widths, tint, surfacePos, drapeTerrain = true) {
  const SEGS = 110, NW = 8;
  const { samples, w, xo } = fallPath(xc, tTop, tBot, widths, SEGS, surfacePos, drapeTerrain);
  const depth = widths.depth ?? 0.34;
  const posArr = [], uvArr = [], tArr = [], idx = [];
  for (let i = 0; i <= SEGS; i++) {
    const s = samples[i], k = i / SEGS;
    // panza: el chorro engorda a media caída (columna, no sábana)
    const bul = Math.min(w[i] * depth, 15) * (0.72 + 0.28 * Math.sin(k * Math.PI));
    for (let j = 0; j < NW; j++) {
      const u = j / (NW - 1);
      const arch = Math.pow(Math.sin(u * Math.PI), 0.8);
      // +1.4 (era +2.4): el hilo del horsetail va ROZANDO la banda mojada
      posArr.push(s.x + xo[i] + (u - 0.5) * w[i], s.y, s.z + 1.4 + bul * arch);
      uvArr.push(u, k * widths.vTiles);
      tArr.push(k);
    }
    if (i > 0) {
      const b = i * NW, a = b - NW;
      for (let j = 0; j < NW - 1; j++) idx.push(a + j, b + j, a + j + 1, a + j + 1, b + j, b + j + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
  geo.setAttribute('aT', new THREE.Float32BufferAttribute(tArr, 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    vertexShader: waterVert, fragmentShader: waterFrag,
    uniforms: {
      uTime: { value: 0 }, uTint: { value: new THREE.Color(tint) },
      uBright: { value: widths.bright ?? 1.14 },
      uAlpha: { value: widths.alphaK ?? 1.0 },
      uBirth: { value: widths.birth ?? 0.0 },
      uImpact: { value: widths.impact ?? 1.0 },
    },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 3;
  return { mesh, mat };
}

function buildShadow(xc, tTop, tBot, widths, surfacePos, drapeTerrain = true) {
  const SEGS = 70;
  const { samples, w, xo } = fallPath(xc, tTop, tBot, widths, SEGS, surfacePos, drapeTerrain);
  const posArr = [], uvArr = [], tArr = [], idx = [];
  // la banda es MÁS ANCHA que el agua (la humedad se riega por la piedra) y
  // se abre hacia abajo con el abanico de los hilos. (2026-07-31) 2,6+1,6k →
  // 1,8+1,0k: con el velo ya ANCHO la banda al múltiplo viejo se comía la
  // garganta entera de mancha oscura
  for (let i = 0; i <= SEGS; i++) {
    const s = samples[i], k = i / SEGS;
    const wide = w[i] * (1.8 + k * 1.0);
    posArr.push(s.x + xo[i] - wide / 2, s.y, s.z + 0.9, s.x + xo[i] + wide / 2, s.y, s.z + 0.9);
    uvArr.push(0, k, 1, k);
    tArr.push(k, k);
    if (i > 0) { const b = i * 2; idx.push(b - 2, b - 1, b, b - 1, b + 1, b); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
  geo.setAttribute('aT', new THREE.Float32BufferAttribute(tArr, 1));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    vertexShader: shadowVert, fragmentShader: shadowFrag,
    uniforms: { uTime: { value: 0 } },
    transparent: true, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  return { mesh, mat };
}

// ── BRUMA VOLUMÉTRICA: quads instanciados con billboard, ciclo de vida
// (nace denso, sube, se abre, se disuelve) y modelado luz-arriba/sombra-abajo.
// UN draw call para toda la niebla de todas las cascadas. ──
const mistVert = /* glsl */`
  uniform float uTime;
  attribute vec3 aOff;
  attribute vec4 aSeed;   // phase, speed, riseH, size
  varying vec2 vPc;
  varying float vO;
  varying float vSeed;
  void main() {
    float k = fract(aSeed.x + uTime * aSeed.y);
    vec3 c = aOff;
    c.y += k * aSeed.z;
    c.x += sin(uTime * 0.35 + aSeed.x * 40.0) * 2.5;
    vO = sin(k * 3.14159);
    vSeed = aSeed.x;
    vPc = position.xy;
    float s = aSeed.w * (0.62 + k * 0.85);
    vec4 mv = modelViewMatrix * vec4(c, 1.0);
    mv.xy += position.xy * vec2(s * 1.25, s);   // billboard, puff más ancho que alto
    gl_Position = projectionMatrix * mv;
  }
`;
const mistFrag = /* glsl */`
  uniform float uTime;
  varying vec2 vPc;
  varying float vO;
  varying float vSeed;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  void main() {
    vec2 pc = vPc;
    float ang = vSeed * 40.0 + uTime * 0.10;         // rotación lenta del puff
    vec2 pr = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * pc;
    float d = length(pc) * 2.0;
    // borde ROTO por ruido: nube desflecada, no disco
    float nb = noise(pr * 4.5 + vSeed * 17.0) * 0.6 + noise(pr * 9.0 + vSeed * 31.0) * 0.4;
    float edge = 1.0 - smoothstep(0.38 + nb * 0.55, 1.0, d);
    float body = exp(-d * d * 2.1);
    float alp = body * edge * vO * 0.60;
    // VOLUMEN: la cima del puff iluminada por el sol, la panza en sombra fría
    float litK = clamp(0.55 - pc.y * 1.7 + nb * 0.25, 0.0, 1.0);
    vec3 col = mix(vec3(1.04, 1.02, 0.98), vec3(0.70, 0.76, 0.85), litK);
    gl_FragColor = vec4(col, alp);
  }
`;

// ── GOTAS/MECHONES: streaks instanciados cayendo delante del velo — la caída
// libre se deshace en hebras con PESO. Un draw call. ──
const dropVert = /* glsl */`
  uniform float uTime;
  attribute vec3 aOff;
  attribute vec4 aSeed;   // phase, speed, dropLen, size
  varying vec2 vPc;
  varying float vO;
  void main() {
    float k = fract(aSeed.x + uTime * aSeed.y);
    vec3 c = aOff;
    c.y -= k * aSeed.z;                       // cae con la gravedad
    vO = (1.0 - k * 0.7) * smoothstep(0.0, 0.12, k);
    vPc = position.xy;
    vec4 mv = modelViewMatrix * vec4(c, 1.0);
    mv.xy += position.xy * vec2(aSeed.w * 0.16, aSeed.w * (1.1 + k * 0.9));
    gl_Position = projectionMatrix * mv;
  }
`;
const dropFrag = /* glsl */`
  varying vec2 vPc;
  varying float vO;
  void main() {
    float lat = pow(max(1.0 - abs(vPc.x) * 2.0, 0.0), 1.6);
    float v = smoothstep(-0.5, -0.28, vPc.y) * smoothstep(0.5, 0.05, vPc.y);
    gl_FragColor = vec4(1.02, 1.02, 0.99, lat * v * vO * 0.85);
  }
`;

// ── EL POZO CRISTALINO (DR-chorrera: «pozos de agua cristalina» al pie de
// los saltos, «fondos rocosos o de guijarros pulidos»): lámina horizontal con
// el GOLPE del velo reventando en espuma blanca, ondas concéntricas que
// derivan hacia la orilla y agua verde-azul honda. Un plano + shader: barato.
const poolVert = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const poolFrag = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    vec2 foco = vec2(0.0, 0.30);            // el golpe del velo, contra la pared
    float df = length(p - foco) * 2.0;
    // agua cristalina: honda y verde-azul en el golpe, clara hacia la orilla
    vec3 col = mix(vec3(0.07, 0.17, 0.16), vec3(0.20, 0.34, 0.30), smoothstep(0.15, 1.0, r));
    // ondas concéntricas que nacen en el golpe y mueren en la orilla
    float rip = sin(df * 20.0 - uTime * 2.4) * 0.5 + 0.5;
    col += vec3(0.10, 0.12, 0.12) * rip * exp(-df * 1.8);
    // cáusticas tipo navis: dos redes refractadas, móviles pero suaves, para
    // que cada poza lea como agua y no como una mancha plana de color.
    float ca1 = noise(p * 15.0 + vec2(uTime * 0.35, -uTime * 0.22));
    float ca2 = noise(p * 27.0 + vec2(-uTime * 0.18, uTime * 0.31));
    float caust = smoothstep(0.60, 0.86, ca1 * 0.62 + ca2 * 0.38) * (1.0 - smoothstep(0.72, 1.0, r));
    col += vec3(0.20, 0.35, 0.30) * caust * 0.42;
    // ESPUMA: mancha blanca VIVA del impacto + motas que derivan girando
    float nf = noise(vec2(df * 5.0 - uTime * 0.7, atan(p.y - foco.y, p.x - foco.x) * 1.6 + uTime * 0.15));
    float foam = smoothstep(0.62, 0.10, df) * (0.50 + 0.50 * nf);
    foam = max(foam, smoothstep(0.80, 0.97, rip) * exp(-df * 1.4) * 0.55);
    col = mix(col, vec3(1.02, 1.02, 0.98), clamp(foam, 0.0, 1.0));
    float alpha = (1.0 - smoothstep(0.80, 1.0, r)) * 0.92;
    gl_FragColor = vec4(col, alpha);
  }
`;

function makeQuadCloud(items, vert, frag) {
  // items: [{x,y,z, seed:[phase,speed,a,b]}]
  const geo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geo.index = quad.index;
  geo.setAttribute('position', quad.attributes.position);
  geo.setAttribute('uv', quad.attributes.uv);
  const off = new Float32Array(items.length * 3);
  const seed = new Float32Array(items.length * 4);
  items.forEach((p, i) => {
    off.set([p.x, p.y, p.z], i * 3);
    seed.set(p.seed, i * 4);
  });
  geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  geo.instanceCount = items.length;
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag,
    uniforms: { uTime: { value: 0 } },
    transparent: true, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  return { mesh, mat };
}

export function makeWaterfalls(scene, { seed = 20260811 } = {}) {
  const sceneChildrenBefore = new Set(scene.children);
  const mats = [];
  const mistPts = [];
  const dropPts = [];
  let seedState = seed >>> 0;
  const rand = () => {
    seedState = (Math.imul(seedState ^ (seedState >>> 16), 2246822519) + 3266489917) >>> 0;
    let x = seedState;
    x ^= x >>> 15; x = Math.imul(x, 1 | x);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };

  // pluma de bruma 3D en un punto: racimo elipsoidal CON PROFUNDIDAD (z varía)
  const addPlume = (x, y, z, r, n, dens = 1) => {
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * r;
      mistPts.push({
        x: x + Math.cos(a) * rr,
        y: y + (rand() - 0.5) * r * 0.5,
        z: z + Math.sin(a) * rr * 0.75 + 4,
        seed: [rand(), 0.05 + rand() * 0.07, r * (0.45 + rand() * 0.5),
          r * (0.46 + rand() * 0.42) * dens],
      });
    }
  };
  // cortina de gotas bajo un labio: mechones que se sueltan y caen
  const addDrops = (x, y, z, spread, len, n) => {
    for (let i = 0; i < n; i++) {
      dropPts.push({
        x: x + (rand() - 0.5) * spread,
        y: y - rand() * len * 0.25,
        z: z + 3 + rand() * 5,
        seed: [rand(), 0.22 + rand() * 0.25, len * (0.7 + rand() * 0.6),
          3.2 + rand() * 5.5],
      });
    }
  };

  // La Chorrera (chorrera-real-detalle.jpg): serie ESCALONADA de TRES saltos
  // por la garganta — UNA sola caída MONUMENTAL (~590 m) cosida en las
  // repisas de SALTOS_T. La ruta lateral la dicta pathX (cliff.js): nace a la
  // DERECHA, muere a la IZQUIERDA (la foto manda). En la foto de cerca cada
  // salto ARRANCA angosto en el labio y se ABRE en velo BLANCO FRANCO al
  // caer, y REVIENTA en espuma contra la repisa. Eso es lo que se dibuja: el
  // "hilo fino translúcido" anterior (base 1,4-1,7 u · alfa 0,42) leía en el
  // lente del agua como rayita pálida — reprobado con captura (2026-07-31).
  const cuts = CUTS_T;
  // DERIVA de pintura: sesgo de DIBUJO de ±7 u (≈12 m) que quiebra la plomada
  // sin sacar el agua del pliegue. Con la ruta corregida (der→izq) el sesgo
  // −7 EMPUJA EN EL MISMO SENTIDO de la foto: más izquierda hacia el pie.
  const TT = cuts[0], BB = cuts[cuts.length - 1];
  const chorX = (t) => pathX(t) - 7 * Math.pow(clamp((TT - t) / (TT - BB), 0, 1), 1.15);
  // por salto: velo alto ancho y MUY blanco (la foto: el salto de arriba es
  // el más brillante), tobogán medio más recogido resbalando la roca, velo
  // bajo largo que llega al pozo
  const SEG = [
    { w: 3.6, bright: 1.34, impact: 0.9 },
    { w: 2.8, bright: 1.22, impact: 0.9 },
    { w: 4.0, bright: 1.30, impact: 1.0 },
  ];
  for (let s = 0; s < cuts.length - 1; s++) {
    const last = s === cuts.length - 2;
    // solape mínimo entre tramos: con 0,020 el empalme sumaba dos alfas y
    // hacía un NUDO blanco a media caída (se ve en it1); 0,008 cose sin nudo
    const tA = cuts[s] - (s === 0 ? 0.002 : -0.008), tB = cuts[s + 1] - (last ? 0 : 0.030);
    const { w: segW, bright, impact } = SEG[s] ?? SEG[SEG.length - 1];
    // 1) la piedra mojada — el ancla del horsetail, pintada EN la pared
    const wet = buildShadow(chorX, tA, tB, { base: segW, fan: 1.4, splay: last ? 0.9 : 0.5 });
    scene.add(wet.mesh); mats.push(wet.mat);
    // 2) el CUERPO del velo — ancho y FRANCO (alfa alta): agua blanca de
    // verdad con las estrías del shader dándole el vivo; nace angosto en el
    // labio (grow parte de 1) y se ABRE al caer
    const seg = buildFall(chorX, tA, tB, {
      base: segW, fan: last ? 1.6 : 1.1, splay: last ? 1.0 : 0.6, alphaK: 0.85,
      vTiles: 2.6 + (cuts[s] - cuts[s + 1]) * 3, depth: 0.2,
      bright, birth: s === 0 ? 1.0 : 0.0, impact,
    }, 0xe8efe9);
    scene.add(seg.mesh); mats.push(seg.mat);
    // 3) HALO de rocío alrededor del velo: película ancha tenue que difumina
    // el canto (el aire mojado que envuelve el chorro)
    const veil = buildFall((t) => chorX(t) + (s % 2 ? -2 : 2), cuts[s] - 0.004, cuts[s + 1] - (last ? 0 : 0.030), {
      base: segW * 1.9, fan: 1.3, splay: last ? 0.9 : 0.6, alphaK: 0.18,
      vTiles: 2.0 + (cuts[s] - cuts[s + 1]) * 2.4, depth: 0.05, bright: 0.85,
      birth: s === 0 ? 1.0 : 0.0, impact: impact * 0.5,
    }, 0xc4d2ca);
    veil.mesh.position.z -= 1.2;
    veil.mesh.renderOrder = 2;
    scene.add(veil.mesh); mats.push(veil.mat);
    // 4) el CORAZÓN denso y brillante del chorro
    const core = buildFall(chorX, cuts[s] - 0.006, cuts[s + 1] - (last ? 0 : 0.018), {
      base: segW * 0.45, fan: 0.6, splay: 0.7, vTiles: 3.2, depth: 0.4,
      bright: bright + 0.08, alphaK: 0.9,
      birth: s === 0 ? 1.0 : 0.0, impact,
    }, 0xf4f6f0);
    core.mesh.position.z += 1.4;
    scene.add(core.mesh); mats.push(core.mat);
    // ESPUMA DEL ESCALÓN: el golpe contra cada repisa revienta en una pluma
    // CHICA y PEGADA al pie del salto (chorrera-real-detalle: cada escalón
    // carga su nube de espuma). NO es el copo gigante purgado en 2026-07-26
    // — aquellas plumas eran del tamaño de la montaña; estas van a escala
    // del velo (r 9-13 u) y viven donde el agua de verdad golpea.
    const xp = chorX(cuts[s + 1]), pf = facePos(xp, cuts[s + 1]);
    addPlume(xp, pf.y + 5, pf.z, last ? 13 : 9, last ? 10 : 7, 0.85);
    // mechones que se sueltan a media caída — PEGADOS al velo (spread 13→8:
    // en el plano tele los sueltos leían como copos flotando aparte del agua)
    const xm = chorX((tA + tB) / 2), mid = facePos(xm, (tA + tB) / 2);
    addDrops(xm, mid.y + 24, mid.z, 8, 42, 16);
    addDrops(xp, pf.y + 40, pf.z, 9, 38, 10);
  }
  // EL ABANICO: hebras que DIVERGEN al bajar — así se abre un horsetail
  // («angosto al brotar, ancho al llegar», nacederoParamo). El ancho del
  // conjunto lo hace la SEPARACIÓN creciente de hilos finos, con roca mojada
  // visible entre ellos, no una cinta que engorda. Sesgo hacia +x: el thalweg
  // medido cae aguas abajo hacia la derecha del cuadro.
  // (it2) el abanico se había pasado de rosca: con dx1 de ±8..14 las hebras
  // llegaban tan separadas que se leían como RAYONES paralelos sueltos, no
  // como una cinta que se abre (en file_158 el abanico es COHESIONADO: la
  // cinta ensancha, las hebras apenas se despegan). dx1 a la mitad.
  // (it3) y las hebras BAJAN de volumen: con alfa 0,6-0,85 sumaban con el
  // hilo y el corazón a una masa blanca opaca — la "sábana" que Gemini
  // reprobó dos veces. Hebras finas y translúcidas: sugieren, no tapan.
  // (it4) y ARRANCAN ABAJO: en la foto el hilo solo se deshebra al final.
  // (2026-07-30) de 5 hebras a 3 y dx a la MITAD: contra la foto canónica,
  // las hebras anchas se leían como CHORROS PARALELOS SUELTOS — chorros
  // fantasma que la foto no tiene. El abanico es cohesionado: apenas se abre.
  for (const [dx0, dx1, tHi, tLo, wS, aK] of [
    [1.2, 3.4, 0.34, 0.10, 1.2, 0.50],
    [-1.2, -3.0, 0.30, 0.11, 1.0, 0.44],
    [0.6, 1.8, 0.36, 0.10, 0.85, 0.40],
  ]) {
    const xcF = (t) => {
      const k = clamp((tHi - t) / (tHi - tLo), 0, 1);
      return chorX(t) + dx0 + (dx1 - dx0) * (k * k * 0.7 + k * 0.3);
    };
    const hair = buildFall(xcF, tHi, tLo, {
      base: wS, fan: 0.5, splay: 0.5, vTiles: 2.2, depth: 0.3, bright: 1.02, alphaK: aK,
    }, 0xf0ece2);
    hair.mesh.material.uniforms.uTint.value.multiplyScalar(0.88);
    scene.add(hair.mesh); mats.push(hair.mat);
  }

  // ── EL POZO CRISTALINO al pie (DR-chorrera: «pozos de agua cristalina en
  // la base de los saltos»). Medido contra el DEM (probe 2026-07-31): el pie
  // del velo queda en y≈-6 (2507 msnm) y el terreno delante baja a -20/-40 —
  // el pozo se posa en la olla (y≈-17) con su canto delantero calzado por
  // cantos rodados («fondos rocosos o de guijarros pulidos por el agua»).
  const pieX2 = chorX(BB), pieF = facePos(pieX2, BB);
  {
    const poolGeo = new THREE.CircleGeometry(1, 28);
    poolGeo.rotateX(-Math.PI / 2);          // uv.y=1 → -z (el golpe, contra la pared)
    const poolMat = new THREE.ShaderMaterial({
      vertexShader: poolVert, fragmentShader: poolFrag,
      uniforms: { uTime: { value: 0 } },
      transparent: true, depthWrite: false,
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.scale.set(14, 1, 10.5);
    pool.position.set(pieX2 + 1, pieF.y - 11, pieF.z + 11);
    pool.renderOrder = 2;
    scene.add(pool); mats.push(poolMat);
    // la bruma del GOLPE final sube desde el pozo
    addPlume(pieX2, pieF.y - 4, pieF.z + 5, 15, 12, 0.9);
    // cantos rodados del borde delantero (también esconden el canto del
    // disco donde la ladera sigue bajando)
    const NR = 9;
    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6f6a5e, roughness: 0.95, flatShading: true });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, NR);
    const m4r = new THREE.Matrix4(), qr = new THREE.Quaternion(), cr = new THREE.Color();
    let sd = 41; const rng = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
    for (let i = 0; i < NR; i++) {
      const th = (-0.5 + i / (NR - 1)) * 2.1;      // arco delantero (+z)
      const sc = 2.2 + rng() * 2.6;
      qr.setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, rng() * 3));
      m4r.compose(new THREE.Vector3(
        pool.position.x + Math.sin(th) * 14 * (0.9 + rng() * 0.2),
        pool.position.y - 1 + rng() * 1.6,
        pool.position.z + Math.cos(th) * 10.5 * (0.9 + rng() * 0.2)),
        qr, new THREE.Vector3(sc, sc * 0.7, sc));
      rocks.setMatrixAt(i, m4r);
      cr.set(0x6f6a5e).offsetHSL((rng() - 0.5) * 0.03, 0, (rng() - 0.5) * 0.14);
      rocks.setColorAt(i, cr);
    }
    rocks.instanceMatrix.needsUpdate = true;
    scene.add(rocks);
  }
  // la quebrada SIGUE: rabo de rápidos blancos saliendo del pozo, ladera
  // abajo hacia la vereda (el puesto del mundo agua queda aguas abajo en +x)
  const tail2 = buildFall((t) => pieX2 + 2 + (BB - t) * 150, BB - 0.012, Math.max(0.01, BB - 0.09), {
    base: 2.2, fan: 0.6, splay: 0.5, vTiles: 1.8, depth: 0.3, bright: 1.0, alphaK: 0.6,
  }, 0xdfe8e0);
  scene.add(tail2.mesh); mats.push(tail2.mat);

  // ── HELECHOS ARBORESCENTES ribereños (DR-chorrera: 15-25 m, «atmósfera
  // prehistórica y densa» — la firma de la ribera del bosque de niebla).
  // Sombrilla de frondas sobre tronco esbelto, instanciados en las orillas
  // del tramo bajo y del pozo. Deterministas (el gate compara capturas).
  {
    const N = 46;
    const trGeo = new THREE.CylinderGeometry(0.16, 0.26, 1, 5);
    trGeo.translate(0, 0.5, 0);
    const frGeo = new THREE.ConeGeometry(1, 0.42, 8, 1, true);   // sombrilla
    frGeo.translate(0, 0.9, 0);
    const trMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95, flatShading: true });
    const frMat = new THREE.MeshStandardMaterial({ color: 0x3f7028, roughness: 1, flatShading: true, side: THREE.DoubleSide });
    const troncos = new THREE.InstancedMesh(trGeo, trMat, N);
    const frondas = new THREE.InstancedMesh(frGeo, frMat, N);
    const m4f = new THREE.Matrix4(), qf = new THREE.Quaternion(), cf = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);
    let sd = 977; const rng = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
    for (let i = 0; i < N; i++) {
      const t = 0.05 + rng() * 0.29;                 // orillas del tramo bajo
      const lado = rng() < 0.5 ? -1 : 1;
      const x = chorX(t) + lado * (11 + rng() * 22); // sin pisar el paso del agua
      const f = facePos(x, t);
      const h = 3.2 + rng() * 3.4;                   // 5-11 m reales
      qf.setFromAxisAngle(up, rng() * Math.PI * 2);
      m4f.compose(new THREE.Vector3(x, f.y - 0.3, f.z + 1.5), qf, new THREE.Vector3(h * 0.55, h, h * 0.55));
      troncos.setMatrixAt(i, m4f);
      frondas.setMatrixAt(i, m4f);
      cf.set(0x3f7028).offsetHSL((rng() - 0.5) * 0.05, (rng() - 0.5) * 0.15, (rng() - 0.5) * 0.12);
      frondas.setColorAt(i, cf);
    }
    troncos.instanceMatrix.needsUpdate = true;
    frondas.instanceMatrix.needsUpdate = true;
    scene.add(troncos); scene.add(frondas);
  }

  // ══════════════════════════════════════════════════════════════════════
  // ⛔ AQUÍ VIVÍAN LOS "REZUMADEROS": cinco hilos extra bajando por la roca
  //    del anfiteatro a ±38-60 u del canal. BORRADOS EN FIRME (2026-07-30).
  //    Contra la foto canónica (refs-chorrera/chorrera-montana.jpg) NO HAY
  //    ningún otro hilo visible en toda la cara: La Chorrera es UNA sola.
  //    Los rezumaderos salían en el render como rayitas blancas sueltas =
  //    CHORROS FANTASMA — exactamente lo que el operador mandó eliminar.
  //    NO LOS VUELVAS A CREAR.
  // ══════════════════════════════════════════════════════════════════════

  // ── El Chiflón: caída LIMPIA de ~90 m (54 u) EN SU PROPIA MONTAÑA ──────
  // (2026-07-30) Ya NO en la muesca de la confluencia pegado a La Chorrera:
  // contra las fotos (wide-ubicacion-chiflon.jpg + chiflon-rocablanca.jpg) el
  // Chiflón vive en la montaña de la IZQUIERDA, más baja y más cercana, con
  // la vaguada entera de por medio (600 m laterales — ver el sondeo DEM en
  // terrain.js/CHIFLON_X). Y no corona la cresta: salta el escarpe BAJO del
  // frente (labio CHIFLON_T0 ≈ 2683 msnm), con la Roca Blanca al lado
  // (cliff.js). Más pequeño que La Chorrera en todo: es la quebrada de la
  // vereda, no el salto monumental. Mismo tratamiento volumétrico.
  const cTop = facePos(CHIFLON_X, 1.0), cBot = facePos(CHIFLON_X, 0.0);
  const chT0 = CHIFLON_T0;
  const chT1 = Math.max(0.03, chT0 - 54 / (cTop.y - cBot.y));  // ~90 m reales (K=0.6)
  // ── EL ESVIAJE, compensado con geomorfología y no con trampa ────────────
  // El frente del Chiflón baja hacia la cámara (dz≈85 u del labio al pie):
  // dibujado a plomo en x fijo, desde el domo la caída proyectaba una raya
  // DIAGONAL de ~50° (medido con probe-screen: labio sx=131 → pie sx=34) —
  // exactamente la falla de «dibujar sin física» ya documentada. Pero la
  // quebrada REAL no baja a plomo: los arroyos corren por los PLIEGUES, y el
  // del Chiflón cae por el flanco HACIA LA VAGUADA de x≈-250 que lo separa
  // del macizo. Esa deriva +x al bajar (26 u) es a la vez la física del
  // drenaje y lo que endereza la proyección desde el ojo de Guatoc.
  const chX = (t) => CHIFLON_X + 26 * clamp((chT0 - t) / Math.max(0.001, chT0 - chT1), 0, 1);
  const chWet = buildShadow(chX, chT0, chT1, { base: 4.5, fan: 1.4, splay: 0.7 });
  scene.add(chWet.mesh); mats.push(chWet.mat);
  const chBody = buildFall(chX, chT0, chT1, {
    base: 4.5, fan: 1.3, splay: 0.75, vTiles: 1.5, depth: 0.55, bright: 1.18,
  }, 0xe8efe9);
  scene.add(chBody.mesh); mats.push(chBody.mat);
  const chCore = buildFall(chX, chT0 - 0.004, chT1 + 0.004, {
    base: 2.0, fan: 0.7, splay: 0.55, vTiles: 1.8, depth: 0.8, bright: 1.32,
  }, 0xf4f6f0);
  chCore.mesh.position.z += 1.2;
  scene.add(chCore.mesh); mats.push(chCore.mat);
  // pie + mechones. La coronación va SIN pluma: el copo de algodón en el
  // labio era lo que hacía leer el Chiflón como mancha blanca y no como
  // caída (mismo diagnóstico que ya purgó las plumas de La Chorrera).
  const xPie = chX(chT1), cPie = facePos(xPie, chT1);
  addPlume(xPie, cPie.y + 2, cPie.z, 14, 6, 0.85);
  const cLip = facePos(CHIFLON_X, chT0);
  addDrops(CHIFLON_X, cLip.y - 12, cLip.z, 8, 28, 10);
  // abajo de la poza el agua sigue en un hilo que se pierde en el bosque
  const chTail = buildFall(xPie + 2, chT1 - 0.008, Math.max(0.005, chT1 - 0.10), {
    base: 1.6, fan: 0.5, splay: 0.5, vTiles: 1.6, depth: 0.4, bright: 0.9, alphaK: 0.8,
  }, 0xdcdcd2);
  chTail.mesh.material.uniforms.uTint.value.multiplyScalar(0.8);
  scene.add(chTail.mesh); mats.push(chTail.mat);

  // bruma grande de la BASE: La Chorrera muere en un colchón blanco al fondo
  // de la V (proporcionada al hilo — la muesca la enmarca, no la ahoga)
  // ⚠️ re-proporcionada tras la rotación: con radio 50 u (83 m) y densidad 1,1
  // el colchón medía ~200 m de ancho y, desde el ojo de Guatoc a 1,7 km,
  // tapaba la caída entera con una mancha blanca de canto duro. En file_158 el
  // hilo simplemente se pierde en el bosque: no hay almohada blanca.
  // (2026-07-26) BORRADA la "bruma grande de la base": sumada a las plumas del
  // pie hacía el copo de algodón que file_158 no tiene (verificado apagando la
  // malla de bruma en vivo: sin ella, el render se lee como la foto).

  // sistemas instanciados: TODA la bruma en un draw call, TODAS las gotas en otro
  const mist = makeQuadCloud(mistPts, mistVert, mistFrag);
  scene.add(mist.mesh); mats.push(mist.mat);
  const drops = makeQuadCloud(dropPts, dropVert, dropFrag);
  scene.add(drops.mesh); mats.push(drops.mat);

  function update(t) {
    for (const m of mats) m.uniforms.uTime.value = t;
  }
  // Marca sólo los objetos creados por esta fábrica para que el perfilador
  // pueda separar agua de terreno y atmósfera sin depender del nombre visual.
  for (const o of scene.children) {
    if (!sceneChildrenBefore.has(o)) o.userData.perfSystem = 'agua';
  }
  // `mats` expuestos: noche.js platea el agua bajo la luna (uBright/uTint)
  return { update, mats };
}

// ── ADAPTADOR REUTILIZABLE PARA CHAGRA KART ─────────────────────────────────
// El kart no vive en el DEM del valle, pero sí necesita la misma gramática
// visual: horsetail pegado a la roca, tres repisas, pozo y espuma. Reutiliza
// buildFall/buildShadow y los shaders de arriba; sólo cambia la superficie por
// el heightfield de la pista. Así la mejora de la chorrera permanece en una
// sola implementación y ambos mundos comparten los mismos materiales.
export function makeKartChorrera(scene, { pista, seed = 20260811 } = {}) {
  if (!pista) throw new Error('makeKartChorrera necesita la pista del kart');
  const grupo = new THREE.Group();
  grupo.name = 'chorrera-kart-reutilizada';
  const mats = [];
  let state = seed >>> 0;
  const rand = () => {
    state = (Math.imul(state ^ (state >>> 16), 2246822519) + 3266489917) >>> 0;
    return state / 4294967296;
  };
  const T0 = 0.215, T1 = 0.242, T2 = 0.266, T3 = 0.300;
  const lateral = (f) => {
    const q = pista.puntoEn(f);
    const lado = Math.sin(q.hdg), ladoZ = -Math.cos(q.hdg);
    const off = 14.5 + Math.sin((f - T0) * 31) * 1.6;
    return { q, x: q.x + lado * off, z: q.z + ladoZ * off };
  };
  const anchor = lateral(0.255);
  const baseY = pista.alturaMundo(anchor.x, anchor.z) + 0.25;
  const path = () => anchor.x;
  const surface = (_x, f) => {
    const k = Math.min(1, Math.max(0, (f - T0) / (T3 - T0)));
    return {
      x: anchor.x,
      y: baseY + (1 - k) * 15,
      z: anchor.z,
      tread: Math.min(1, anchor.q.w / 11),
    };
  };
  const addCloud = (x, y, z, radius, count) => {
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * radius;
      mistPts.push({
        x: x + Math.cos(a) * r,
        y: y + (rand() - 0.5) * radius * 0.4,
        z: z + Math.sin(a) * r,
        seed: [rand(), 0.06 + rand() * 0.06, radius * (0.45 + rand() * 0.35), radius * (0.38 + rand() * 0.35)],
      });
    }
  };
  const mistPts = [], dropPts = [];
  const addDropsLocal = (x, y, z, spread, len, count) => {
    for (let i = 0; i < count; i++) {
      dropPts.push({
        x: x + (rand() - 0.5) * spread,
        y: y - rand() * len * 0.22,
        z: z + 1 + rand() * 3,
        seed: [rand(), 0.2 + rand() * 0.22, len * (0.7 + rand() * 0.5), 2.0 + rand() * 3.2],
      });
    }
  };
  const cuts = [T0, T1, T2, T3];
  const widths = [2.7, 2.25, 3.0];
  for (let i = 0; i < cuts.length - 1; i++) {
    const top = cuts[i], bot = cuts[i + 1], last = i === cuts.length - 2;
    const wet = buildShadow(path, top, bot, { base: widths[i], fan: 0.9, splay: 0.45 }, surface, false);
    const body = buildFall(path, top, bot, {
      base: widths[i], fan: last ? 1.15 : 0.8, splay: 0.55,
      alphaK: 0.84, vTiles: 2.8, depth: 0.2,
      bright: last ? 1.22 : 1.14, birth: i === 0 ? 0.8 : 0, impact: 0.95,
    }, 0xe8efe9, surface, false);
    const core = buildFall(path, top - 0.003, bot + 0.002, {
      base: widths[i] * 0.42, fan: 0.42, splay: 0.48,
      alphaK: 0.82, vTiles: 3.4, depth: 0.34,
      bright: 1.28, birth: i === 0 ? 0.8 : 0, impact: 1,
    }, 0xf4f6f0, surface, false);
    body.mat.uniforms.uTint.value.set(0x3f9da8);
    core.mat.uniforms.uTint.value.set(0x8fd8d2);
    body.mat.uniforms.uBright.value = 0.92;
    core.mat.uniforms.uBright.value = 1.02;
    body.mat.uniforms.uAlpha.value = 0.72;
    core.mat.uniforms.uAlpha.value = 0.78;
    body.mat.depthTest = false;
    core.mat.depthTest = false;
    body.mesh.renderOrder = 30;
    core.mesh.renderOrder = 31;
    core.mesh.position.z += 0.9;
    grupo.add(wet.mesh, body.mesh, core.mesh);
    mats.push(wet.mat, body.mat, core.mat);
    const p = lateral(bot);
    addCloud(p.x, p.y + 0.8, p.z, last ? 4.8 : 3.4, last ? 10 : 7);
    addDropsLocal(p.x, p.y + 5, p.z, 4.5, 9, 8);
  }
  const pie = anchor;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.ShaderMaterial({
    vertexShader: poolVert, fragmentShader: poolFrag,
    uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false,
  }));
  pool.geometry.rotateX(-Math.PI / 2);
  pool.scale.set(6.8, 1, 4.8);
  pool.position.set(pie.x, pista.alturaMundo(pie.x, pie.z) + 0.08, pie.z);
  pool.renderOrder = 2;
  grupo.add(pool); mats.push(pool.material);

  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5c675d, roughness: 0.96, flatShading: true });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 18);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  for (let i = 0; i < 18; i++) {
    const f = T0 + (T3 - T0) * (i / 17);
    const p = lateral(f);
    const side = i % 2 ? 1 : -1;
    const q0 = p.q;
    const nx = Math.sin(q0.hdg), nz = -Math.cos(q0.hdg);
    const x = p.x + nx * side * (4.5 + rand() * 4.0);
    const z = p.z + nz * side * (4.5 + rand() * 4.0);
    const s = 0.7 + rand() * 1.1;
    m4.compose(new THREE.Vector3(x, pista.alturaMundo(x, z) + s * 0.45, z), q.setFromEuler(new THREE.Euler(rand(), rand() * 3, rand())), sc.set(s * 1.3, s * 0.75, s));
    rocks.setMatrixAt(i, m4);
  }
  rocks.instanceMatrix.needsUpdate = true;
  grupo.add(rocks);
  const mist = makeQuadCloud(mistPts, mistVert, mistFrag);
  const drops = makeQuadCloud(dropPts, dropVert, dropFrag);
  grupo.add(mist.mesh, drops.mesh);
  mats.push(mist.mat, drops.mat);

  function update(t) { for (const m of mats) m.uniforms.uTime.value = t; }
  return { grupo, update, mats, envelope: { cerca: T0, media: T2, amplia: T3 } };
}

// ── FASE 1: descenso jugable en siete beats ───────────────────────────────
// El adaptador histórico de arriba conserva la vista corta del kart. Esta
// variante es la pista de la fase 1: siete repisas, zigzag lateral y seis
// saltos de agua. Los materiales y shaders siguen siendo los de la Chorrera
// del valle; solo cambia la superficie, que ahora acompaña la pista física.
export function makeKartChorreraFase1(scene, { pista, seed = 20260811 } = {}) {
  if (!pista) throw new Error('makeKartChorreraFase1 necesita la pista del kart');
  const grupo = new THREE.Group();
  grupo.name = 'chorrera-kart-fase1';
  const mats = [];
  let state = seed >>> 0;
  const rand = () => {
    state = (Math.imul(state ^ (state >>> 16), 2246822519) + 3266489917) >>> 0;
    return state / 4294967296;
  };

  // El agua cruza la garganta de una pared a la otra. En los beats extremos
  // la dejamos cerca del borde para que la carpa y el salto final respiren.
  const offsets = [-13, 11, -10, 14, -12, 10, -16];
  const beats = CHORRERA_BEATS;
  const beatPoint = (i) => {
    const q = pista.puntoEn(beats[i]);
    const lado = Math.sin(q.hdg), ladoZ = -Math.cos(q.hdg);
    const x = q.x + lado * offsets[i];
    const z = q.z + ladoZ * offsets[i];
    return { q, x, z, y: pista.alturaMundo(x, z) };
  };
  const top = beatPoint(0);
  const bottom = beatPoint(beats.length - 1);
  const topY = top.y + 8.0;
  const endY = bottom.y + 2.2;
  const waterPoint = (f) => {
    const u = (f - beats[0]) / (beats[beats.length - 1] - beats[0]);
    const k = clamp(u, 0, 1) * (beats.length - 1);
    const i = Math.min(beats.length - 2, Math.floor(k));
    const t = k - i;
    const a = beatPoint(i), b = beatPoint(i + 1);
    return {
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      y: topY + (endY - topY) * clamp(u, 0, 1),
    };
  };
  const surface = (_x, f) => ({ ...waterPoint(f), tread: 1 });
  const add = (obj, material) => { grupo.add(obj); if (material) mats.push(material); return obj; };

  // Repisas: roca oscura, anchas, con cantos en ambos hombros. La pista pasa
  // por el centro; el agua cruza por delante/atrás y no queda como plano azul.
  const ledgeGeo = new THREE.BoxGeometry(28, 2.5, 9);
  const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x303b35, roughness: 0.98, flatShading: true });
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x1c2925, roughness: 0.99, flatShading: true });
  mats.push(ledgeMat, rockMat);
  for (let i = 0; i < beats.length; i++) {
    const p = beatPoint(i);
    const ledge = new THREE.Mesh(ledgeGeo, ledgeMat);
    ledge.position.set(p.x, p.y + 0.8, p.z);
    ledge.rotation.y = Math.PI / 2 - p.q.hdg;
    add(ledge);
    for (let j = 0; j < 4; j++) {
      const side = j % 2 ? 1 : -1;
      const along = (rand() - 0.5) * 6;
      const nx = Math.sin(p.q.hdg), nz = -Math.cos(p.q.hdg);
      const s = 1.5 + rand() * 2.4;
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(p.x + nx * side * (11 + rand() * 5) + Math.cos(p.q.hdg) * along,
        p.y + 1.2 + s * 0.35,
        p.z + nz * side * (11 + rand() * 5) + Math.sin(p.q.hdg) * along);
      rock.scale.set(s * 1.5, s * 0.72, s);
      rock.rotation.set(rand() * 0.6, rand() * Math.PI, rand() * 0.35);
      add(rock);
    }
  }

  // Agua, banda mojada, núcleo blanco y spray. Cada caída termina en la
  // repisa siguiente, así la secuencia se lee como siete beats y no como una
  // sola columna vertical.
  const widths = [1.6, 1.9, 2.8, 2.1, 1.8, 3.2];
  const mistPts = [], dropPts = [];
  for (let i = 0; i < beats.length - 1; i++) {
    const a = beats[i], b = beats[i + 1];
    const pa = beatPoint(i), pb = beatPoint(i + 1);
    const ya = topY + (endY - topY) * (i / (beats.length - 1));
    const yb = topY + (endY - topY) * ((i + 1) / (beats.length - 1));
    // El agua cae vertical en la repisa siguiente. La línea diagonal entre
    // beats la resuelve la pista/poza; si se inclina también la cortina, se
    // lee como baranda blanca y no como salto de cascada.
    const fallSurface = (_x, f) => {
      const t = clamp((f - a) / (b - a), 0, 1);
      return { x: pb.x, y: ya + (yb - ya) * t, z: pb.z, tread: 1 };
    };
    const wide = i === 5;
    const wet = buildShadow(() => pb.x, a, b, {
      base: widths[i] * 1.7, fan: 0.65, splay: wide ? 1.1 : 0.55,
    }, fallSurface, false);
    add(wet.mesh, wet.mat);
    const body = buildFall(() => pb.x, a, b, {
      base: widths[i], fan: wide ? 1.9 : 1.2, splay: wide ? 1.5 : 0.7,
      alphaK: 0.88, vTiles: 2.2, depth: 0.26,
      bright: wide ? 1.34 : 1.18, birth: i === 0 ? 0.9 : 0, impact: 1,
    }, 0xeaf1eb, fallSurface, false);
    body.mat.uniforms.uTint.value.set(0x59b8be);
    body.mat.uniforms.uBright.value = wide ? 0.82 : 0.70;
    body.mat.uniforms.uAlpha.value = 0.62;
    add(body.mesh, body.mat);
    const core = buildFall(() => pb.x, a - 0.001, b + 0.001, {
      base: widths[i] * 0.34, fan: 0.5, splay: 0.5,
      alphaK: 0.9, vTiles: 2.8, depth: 0.36,
      bright: 1.4, birth: i === 0 ? 0.9 : 0, impact: 1,
    }, 0xf9fbf5, fallSurface, false);
    core.mat.uniforms.uTint.value.set(0xa6e7df);
    core.mat.uniforms.uBright.value = 0.84;
    core.mat.uniforms.uAlpha.value = 0.70;
    core.mesh.position.z += 0.7;
    add(core.mesh, core.mat);
    const p = beatPoint(i + 1);
    for (let n = 0; n < (wide ? 18 : 11); n++) {
      const r = wide ? 5.5 : 3.2;
      mistPts.push({ x: p.x + (rand() - 0.5) * r, y: p.y + 2 + rand() * 2.8, z: p.z + 2 + rand() * 5,
        seed: [rand(), 0.06 + rand() * 0.07, r * (0.5 + rand() * 0.5), r * (0.45 + rand() * 0.45)] });
    }
    for (let n = 0; n < (wide ? 12 : 7); n++) {
      dropPts.push({ x: p.x + (rand() - 0.5) * (wide ? 9 : 5), y: p.y + 4 + rand() * 8, z: p.z + 2 + rand() * 4,
        seed: [rand(), 0.22 + rand() * 0.2, 3 + rand() * 4, 1.2 + rand() * 1.8] });
    }
  }

  // Pozas pequeñas en las seis bases y una poza mayor en el salto final.
  const poolGeo = new THREE.CircleGeometry(1, 24);
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = new THREE.ShaderMaterial({ vertexShader: poolVert, fragmentShader: poolFrag,
    uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false });
  mats.push(poolMat);
  for (let i = 1; i < beats.length; i++) {
    const p = beatPoint(i), pool = new THREE.Mesh(poolGeo, poolMat);
    const s = i === beats.length - 1 ? 7.2 : 3.2 + (i % 2) * 0.8;
    pool.scale.set(s, 1, s * 0.66);
    pool.position.set(p.x, p.y + 1.42, p.z + 2.2);
    pool.renderOrder = 2;
    add(pool);
  }

  // Carpa azul de checkpoint en la repisa de salida: una silueta simple y
  // inequívoca, a la izquierda del canal como en el frame de referencia.
  {
    const tent = new THREE.Mesh(new THREE.ConeGeometry(3.0, 2.8, 4),
      new THREE.MeshStandardMaterial({ color: 0x2867b2, roughness: 0.84, flatShading: true }));
    tent.position.set(top.x - 5.5, top.y + 3.0, top.z + 1.5);
    tent.rotation.y = Math.PI / 4;
    add(tent, tent.material);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xe7c44c, side: THREE.DoubleSide, roughness: 0.9 }));
    flag.position.set(top.x + 4.8, top.y + 4.2, top.z + 1.8);
    flag.rotation.y = Math.PI / 2 - top.q.hdg;
    add(flag, flag.material);
  }

  // Vegetación de masa en el borde: manchas grandes para conservar el verde
  // dominante incluso cuando la cámara abre el encuadre al salto final.
  const bushGeo = new THREE.IcosahedronGeometry(1, 1);
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x295536, roughness: 1, flatShading: true });
  mats.push(bushMat);
  for (let i = 0; i < 34; i++) {
    const bi = Math.floor(rand() * beats.length), p = beatPoint(bi);
    const side = rand() < 0.5 ? -1 : 1, nx = Math.sin(p.q.hdg), nz = -Math.cos(p.q.hdg);
    const s = 1.8 + rand() * 3.7;
    const bush = new THREE.Mesh(bushGeo, bushMat);
    bush.position.set(p.x + nx * side * (17 + rand() * 12) + (rand() - 0.5) * 5,
      p.y + s * 0.65, p.z + nz * side * (17 + rand() * 12) + (rand() - 0.5) * 5);
    bush.scale.set(s * 1.2, s * (0.85 + rand() * 0.6), s);
    add(bush);
  }

  const mist = makeQuadCloud(mistPts, mistVert, mistFrag);
  const drops = makeQuadCloud(dropPts, dropVert, dropFrag);
  add(mist.mesh, mist.mat); add(drops.mesh, drops.mat);

  function update(t) { for (const m of mats) if (m.uniforms?.uTime) m.uniforms.uTime.value = t; }
  return { grupo, update, mats, envelope: { cerca: beats[1], media: beats[3], amplia: beats[6], beats } };
}
