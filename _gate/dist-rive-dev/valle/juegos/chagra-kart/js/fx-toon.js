// ── fx-toon.js — impactos dibujados a la manera de los años 30 ──────────────
// Lenguaje rubber-hose de animación clásica (Fleischer, Disney temprano), que
// es el mismo que ya usa la casa para los pilotos. Cuatro cosas lo separan de
// "unas partículas más":
//
//  1. LÍNEA DE TINTA. Todo lleva contorno negro grueso. Las partículas normales
//     son manchas suaves aditivas y por eso se leen como fuego o humo de motor;
//     un dibujo animado se lee porque está DELINEADO. Las formas se pintan a
//     canvas en tiempo de carga (blobs, estrella de golpe, rayas radiales) con
//     stroke gordo y lineJoin redondo, y salen como un atlas.
//  2. ANIMACIÓN "EN DOSES" (12 fps). El juego corre a 60, pero cada sprite
//     avanza su propia animación a pasos de 1/12 s. Ese escalón es el detalle
//     que hace que la cosa parezca dibujada cuadro a cuadro y no interpolada.
//  3. ANTICIPACIÓN Y REBOTE. Nada aparece con un fade lineal: la estrella entra
//     de golpe, se pasa de largo (1.3×), vuelve y desaparece. Las escalas van
//     por curvas con sobrepaso, nunca por lerp.
//  4. SQUASH Y STRETCH. El vehículo se aplasta contra el eje del impacto y se
//     estira en el perpendicular, con un resorte amortiguado que rebota un par
//     de veces. Es lo que más vende el golpe, y es gratis: es escala.
//
// Todo esto es vocabulario de animación de dominio público. No hay ni un asset
// ni un nombre de terceros aquí adentro.
//
// Coste: UNA sola draw call (InstancedBufferGeometry con billboard en el
// vertex shader) y una textura de 640². Cuando no hay impactos, no se dibuja.

const CELDA = 320;      // px por celda del atlas
const ATLAS = 2;        // 2×2 celdas
const PASO = 1 / 12;    // animación en doses: 12 fps
const MAXI = 168;       // instancias simultáneas

// Movimiento reducido: apaga el squash & stretch de golpe. Lo setea main.js al
// arrancar y en cada cambio de preferencia; vale para TODOS los sacudones
// (jugador, invitado y rivales) porque viven todos de esta misma bandera.
let reducedMotionSacudon = false;
export function setReducedMotionSacudon(v) { reducedMotionSacudon = !!v; }

// Paleta: crema de papel viejo + tinta. Nada de neón.
// El crema está deliberadamente por DEBAJO del umbral del bloom de la escena
// (UnrealBloomPass, umbral 0.85): con un crema más claro el pass le mete un halo
// al relleno, el halo se come la línea de tinta y el dibujo se convierte en un
// destello. Se probó: con #f7edd4 la estrella salía como reflejo de lente.
const CREMA = '#e9d8b0';
const CREMA2 = '#d6bf8d';
const TINTA = '#140f0c';
const OCRE = '#d18d28';
const RIM = 30; // grosor del trazo de tinta (≈15 px de reborde visible)

function dibujarNube(g) {
  // silueta bulbosa: unión de círculos de radio variado. La clave para que no
  // parezca una bola de humo es que los lóbulos sean de tamaños MUY distintos.
  const cx = CELDA / 2, cy = CELDA / 2;
  const lobulos = [
    [0, 12, 74], [-62, -5, 49], [60, -2, 52], [-34, -53, 44],
    [38, -49, 41], [3, -68, 34], [-78, 36, 34], [78, 34, 37], [0, 56, 46],
  ];
  const trazar = () => {
    g.beginPath();
    for (const [dx, dy, r] of lobulos) { g.moveTo(cx + dx + r, cy + dy); g.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); }
  };
  g.lineJoin = 'round';
  g.lineCap = 'round';
  // el contorno se traza sobre la UNIÓN de los lóbulos, así queda una sola línea
  // envolvente en vez de nueve circunferencias sueltas
  trazar(); g.strokeStyle = TINTA; g.lineWidth = RIM; g.stroke();
  trazar(); g.fillStyle = CREMA; g.fill();
  // sombra interna baja: volumen de dibujo, no de render
  g.fillStyle = CREMA2;
  g.beginPath();
  for (const [dx, dy, r] of [[-26, 46, 34], [34, 44, 29], [82, 26, 22]]) {
    g.moveTo(cx + dx + r, cy + dy); g.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
  }
  g.fill();
}

function dibujarEstrellaGolpe(g) {
  // el "¡PAF!": estrella de muchas puntas con radios IRREGULARES. Si las puntas
  // son regulares parece un sol de clipart; la irregularidad es lo que la hace
  // parecer trazada a mano.
  // Menos puntas y más gordas que un "sol" de clipart: 8 picos con radios
  // irregulares. Con 11 puntas finas el trazo de tinta no cabe entre pico y pico
  // y la silueta se vuelve papilla al escalarla en pantalla.
  const cx = CELDA / 2, cy = CELDA / 2;
  const N = 8;
  const radios = [128, 96, 134, 88, 124, 104, 138, 92];
  const trazar = () => {
    g.beginPath();
    for (let i = 0; i < N * 2; i++) {
      const a = (i / (N * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? radios[(i / 2) % N] : 56 + ((i * 13) % 15);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
  };
  g.lineJoin = 'round';
  trazar(); g.strokeStyle = TINTA; g.lineWidth = RIM + 6; g.stroke();
  trazar(); g.fillStyle = CREMA; g.fill();
  // corazón ocre con su propia tinta: dos tonos planos, como un cel de dos capas
  const trazarCorazon = () => {
    g.beginPath();
    for (let i = 0; i < N * 2; i++) {
      const a = (i / (N * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = (i % 2 === 0 ? radios[(i / 2) % N] : 56) * 0.60;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
  };
  trazarCorazon(); g.strokeStyle = TINTA; g.lineWidth = 16; g.stroke();
  trazarCorazon(); g.fillStyle = OCRE; g.fill();
}

function dibujarRayas(g) {
  // líneas de impacto: radios gruesos que se afinan hacia afuera, con el centro
  // vacío. Duran dos o tres cuadros y son la mitad de la lectura del golpe.
  // Radios gruesos que se afinan hacia afuera, con el centro vacío. Duran dos o
  // tres cuadros y son la mitad de la lectura del golpe.
  // Van con relleno CREMA y tinta encima, no en negro sólido: una raya negra
  // sobre la carrocería oscura de un kart no se ve, y sobre el cielo del páramo
  // tampoco. Con relleno claro y borde oscuro se leen contra cualquier fondo,
  // que es exactamente por qué el dibujo animado delinea todo.
  const cx = CELDA / 2, cy = CELDA / 2;
  const N = 11;
  g.lineJoin = 'round';
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + (i % 2) * 0.07;
    const r0 = 40 + (i % 3) * 8;
    const r1 = 118 + ((i * 29) % 26);
    const w = 0.085 + ((i * 7) % 5) * 0.011;
    const trazar = () => {
      g.beginPath();
      g.moveTo(cx + Math.cos(a - w) * r0, cy + Math.sin(a - w) * r0);
      g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      g.lineTo(cx + Math.cos(a + w) * r0, cy + Math.sin(a + w) * r0);
      g.closePath();
    };
    trazar(); g.strokeStyle = TINTA; g.lineWidth = 22; g.stroke();
    trazar(); g.fillStyle = CREMA; g.fill();
  }
}

function dibujarEstrellita(g) {
  // la estrellita de mareo que orbita la cabeza
  const cx = CELDA / 2, cy = CELDA / 2;
  const trazar = () => {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 116 : 48;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
  };
  g.lineJoin = 'round';
  trazar(); g.strokeStyle = TINTA; g.lineWidth = RIM + 8; g.stroke();
  trazar(); g.fillStyle = OCRE; g.fill();
}

function construirAtlas() {
  const cv = document.createElement('canvas');
  cv.width = CELDA * ATLAS; cv.height = CELDA * ATLAS;
  const g = cv.getContext('2d');
  const celdas = [dibujarEstrellaGolpe, dibujarNube, dibujarRayas, dibujarEstrellita];
  celdas.forEach((fn, i) => {
    g.save();
    g.translate((i % ATLAS) * CELDA, Math.floor(i / ATLAS) * CELDA);
    g.beginPath(); g.rect(0, 0, CELDA, CELDA); g.clip();
    fn(g);
    g.restore();
  });
  return cv;
}

export const CELL = { ESTRELLA: 0, NUBE: 1, RAYAS: 2, MAREO: 3 };

const VERT = /* glsl */`
  attribute vec3 iPos;
  attribute vec2 iSize;
  attribute float iRot;
  attribute float iAlpha;
  attribute float iCell;
  attribute vec3 iTint;
  varying vec2 vUv;
  varying float vAlpha;
  varying vec3 vTint;
  void main() {
    vAlpha = iAlpha;
    vTint = iTint;
    vec2 uvA = vec2(uv.x, 1.0 - uv.y);           // atlas dibujado de arriba a abajo
    float cx = mod(iCell, 2.0);
    float cy = floor(iCell / 2.0);
    vUv = (uvA + vec2(cx, cy)) * 0.5;
    float c = cos(iRot), s = sin(iRot);
    vec2 p = position.xy * iSize;
    p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    vec4 mv = modelViewMatrix * vec4(iPos, 1.0);  // billboard: se rota en vista
    mv.xy += p;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */`
  precision mediump float;
  uniform sampler2D uTex;
  varying vec2 vUv;
  varying float vAlpha;
  varying vec3 vTint;
  void main() {
    vec4 t = texture2D(uTex, vUv);
    if (t.a < 0.02) discard;
    // el tinte pinta SOLO lo claro: la línea de tinta tiene que seguir negra,
    // si se tiñe el contorno se pierde el dibujo y vuelve a parecer partícula.
    float lum = (t.r + t.g + t.b) / 3.0;
    vec3 col = mix(t.rgb, t.rgb * vTint, step(0.28, lum));
    gl_FragColor = vec4(col, t.a * vAlpha);
    if (gl_FragColor.a < 0.01) discard;
  }
`;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

export function crearFxToon(THREE, cfg = {}) {
  const escena = cfg.escena;
  const tex = new THREE.CanvasTexture(construirAtlas());
  tex.flipY = false;
  // El atlas se pinta con colores sRGB (es un canvas 2D). Sin declararlo, three
  // lo toma como datos lineales: el crema sale reventado a blanco y la tinta
  // negra se levanta a gris — o sea, se pierde justo el contorno, que es lo
  // único que hace que esto parezca dibujo y no un destello.
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = cfg.anisotropy ?? 4;

  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.attributes.position = quad.attributes.position;
  geo.attributes.uv = quad.attributes.uv;
  const aPos = new THREE.InstancedBufferAttribute(new Float32Array(MAXI * 3), 3);
  const aSize = new THREE.InstancedBufferAttribute(new Float32Array(MAXI * 2), 2);
  const aRot = new THREE.InstancedBufferAttribute(new Float32Array(MAXI), 1);
  const aAlpha = new THREE.InstancedBufferAttribute(new Float32Array(MAXI), 1);
  const aCell = new THREE.InstancedBufferAttribute(new Float32Array(MAXI), 1);
  const aTint = new THREE.InstancedBufferAttribute(new Float32Array(MAXI * 3), 3);
  for (const a of [aPos, aSize, aRot, aAlpha, aCell, aTint]) a.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('iPos', aPos);
  geo.setAttribute('iSize', aSize);
  geo.setAttribute('iRot', aRot);
  geo.setAttribute('iAlpha', aAlpha);
  geo.setAttribute('iCell', aCell);
  geo.setAttribute('iTint', aTint);
  geo.instanceCount = 0;

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { uTex: { value: tex } },
    transparent: true,
    depthWrite: false,
    // Sin prueba de profundidad: el impacto es una CAPA DE DIBUJO encima de la
    // escena, no un objeto dentro de ella. Con depthTest el punto de contacto
    // queda medio tapado por la carrocería y la estrella se lee cortada. En la
    // animación clásica el golpe se dibuja sobre todo lo demás; aquí igual.
    depthTest: false,
    blending: THREE.NormalBlending, // aditivo = partícula; normal = dibujo
    side: THREE.DoubleSide,
  });
  const malla = new THREE.Mesh(geo, mat);
  malla.frustumCulled = false;
  malla.renderOrder = 12;
  malla.visible = false;
  if (escena) escena.add(malla);

  // pool de sprites vivos
  const vivos = [];
  let reloj = 0;
  // Interruptor para MEDIR de verdad. El control de un benchmark de choques no
  // puede ser "manejar sin chocar": los rivales chocan entre ellos y contra uno
  // todo el tiempo, así que el efecto también está en la muestra de control y el
  // Δ mide ruido. El control honesto es la MISMA carrera con los mismos choques
  // y el dibujo apagado.
  let activo = true;

  function nuevo(o) {
    if (vivos.length >= MAXI) vivos.shift();
    o.t0 = reloj;
    vivos.push(o);
    return o;
  }

  // ── el golpe: una SECUENCIA, no un puff ───────────────────────────────────
  // orden de lectura: rayas al toque (2 cuadros) → estrella con sobrepaso →
  // nubes que crecen y se van → estrellitas de mareo si fue duro.
  function golpe(x, y, z, nx, nz, mag, opts = {}) {
    if (!activo) return;
    const m = clamp(mag, 0, 1.35);
    const esc = opts.escala ?? 1;
    const roce = !!opts.roce;

    if (roce) {
      // un roce NO es un choque: dos nubecitas chatas y nada más. Que el
      // lenguaje distinga las dos cosas es la mitad de que se sienta justo.
      const n = 2;
      for (let i = 0; i < n; i++) {
        nuevo({
          cell: CELL.NUBE, x, y: y + 0.25 + i * 0.2, z,
          vx: nx * (1.2 + i) + (Math.random() - 0.5) * 1.4,
          vy: 1.1 + Math.random() * 0.8,
          vz: nz * (1.2 + i) + (Math.random() - 0.5) * 1.4,
          dur: 0.42, s0: 0.3 * esc, s1: 0.85 * esc, rot: Math.random() * 6.28,
          spin: (Math.random() - 0.5) * 2.2, alpha: 0.62, tint: [0.95, 0.93, 0.88],
        });
      }
      return;
    }

    // Escala de referencia: un kart mide ~4.5 m de largo. El golpe tiene que
    // LEERSE sobre el carro, no taparlo — si el efecto ocupa la pantalla, el
    // jugador deja de ver la pista justo en el momento en que más necesita
    // verla, y eso es perder el control por la puerta de atrás.
    // 1 · rayas radiales: entran a tamaño COMPLETO, sin crecer. 3 cuadros.
    nuevo({
      cell: CELL.RAYAS, x, y: y + 0.55, z, vx: 0, vy: 0, vz: 0,
      dur: 0.22, s0: (1.9 + m * 1.9) * esc, s1: (2.6 + m * 2.6) * esc,
      rot: Math.random() * 6.28, spin: 0, alpha: 0.8, tint: [1, 1, 1], pop: true,
    });

    // 2 · estrella de golpe con anticipación y sobrepaso
    if (m > 0.18) {
      nuevo({
        cell: CELL.ESTRELLA, x, y: y + 0.7, z, vx: 0, vy: 0.5, vz: 0,
        dur: 0.42, s0: (0.95 + m * 1.5) * esc, s1: (0.95 + m * 1.5) * esc,
        rot: (Math.random() - 0.5) * 0.5, spin: (Math.random() - 0.5) * 1.1,
        alpha: 1, tint: [1, 1, 1], sobrepaso: true,
      });
    }

    // 3 · nubes de polvo con contorno, saliendo por el eje del impacto.
    //     POCAS y GRANDES, y separadas rápido. Con nueve nubes encimadas cada
    //     relleno crema tapa el contorno de la de atrás, los bordes se anulan
    //     entre sí y el conjunto se ve como una mancha: exactamente lo que este
    //     efecto NO tiene que parecer. Cuatro bien abiertas leen como dibujo.
    const nN = 3 + Math.round(m * 2);
    for (let i = 0; i < nN; i++) {
      const a = (i / nN) * Math.PI * 2 + Math.random() * 0.4;
      const sesgo = 0.5 + Math.random() * 0.7; // sesgadas hacia la normal
      const dx = nx * sesgo + Math.cos(a) * 1.25;
      const dz = nz * sesgo + Math.sin(a) * 1.25;
      const vel = 3.2 + m * 5.0 + Math.random() * 2;
      nuevo({
        cell: CELL.NUBE,
        x: x + dx * 0.55, y: y + 0.3 + Math.random() * 0.5, z: z + dz * 0.55,
        vx: dx * vel, vy: 1.6 + Math.random() * 2.2, vz: dz * vel,
        dur: 0.5 + Math.random() * 0.36,
        s0: (0.45 + m * 0.35) * esc, s1: (1.35 + m * 1.15) * esc,
        rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 2.6,
        alpha: 1, tint: [1, 0.99, 0.96],
      });
    }

    // 4 · mareo: estrellitas en órbita escalonada sobre quien recibió el golpe
    if (m > 0.52 && opts.ancla) {
      const nE = 3 + (m > 0.9 ? 2 : 0);
      for (let i = 0; i < nE; i++) {
        nuevo({
          cell: CELL.MAREO, ancla: opts.ancla, orbR: 1.05 + m * 0.25,
          orbA: (i / nE) * Math.PI * 2, orbV: 5.4 + m * 1.6, orbY: 1.55 + (opts.alto ?? 0),
          x, y, z, vx: 0, vy: 0, vz: 0,
          dur: 1.05 + m * 0.5, s0: 0.52, s1: 0.44,
          rot: 0, spin: 3.2, alpha: 1, tint: [1, 1, 1],
        });
      }
    }
  }

  // ── mareo suelto: estrellitas en órbita sin necesidad de un golpe ─────────
  // Lo usa "La locura" de Oliver: los rivales enloquecidos llevan las mismas
  // estrellitas del atlas que un choque duro, porque es el mismo vocabulario.
  function mareo(ancla, opts = {}) {
    if (!activo || !ancla) return;
    const nE = opts.n ?? 3;
    for (let i = 0; i < nE; i++) {
      nuevo({
        cell: CELL.MAREO, ancla, orbR: opts.r ?? 1.1,
        orbA: (i / nE) * Math.PI * 2, orbV: 5.8, orbY: opts.alto ?? 1.55,
        x: ancla.x, y: ancla.y ?? 0, z: ancla.z, vx: 0, vy: 0, vz: 0,
        dur: opts.dur ?? 1.4, s0: 0.5, s1: 0.42,
        rot: 0, spin: 3.2, alpha: 1, tint: [1, 1, 1],
      });
    }
  }

  function actualizar(dt) {
    if (!activo) {
      if (vivos.length) limpiar();
      return;
    }
    reloj += dt;
    let n = 0;
    for (let i = vivos.length - 1; i >= 0; i--) {
      const p = vivos[i];
      const edad = reloj - p.t0;
      if (edad >= p.dur) { vivos.splice(i, 1); continue; }
      // ANIMACIÓN EN DOSES: el parámetro avanza a saltos de 1/12 s. Todo lo que
      // se derive de `u` hereda ese escalón — el pulso dibujado a mano.
      const u = clamp(Math.floor(edad / PASO) * PASO / p.dur, 0, 1);

      let s, alpha;
      if (p.pop) {
        // rayas: full desde el cuadro 0, se abren un poco y se van de golpe
        s = p.s0 + (p.s1 - p.s0) * u;
        alpha = p.alpha * (1 - u * u);
      } else if (p.sobrepaso) {
        // estrella: 0.34 → 1.30 (se pasa) → 1.0 → 0. Sin lerp: con quiebres.
        const k = u < 0.16 ? 0.34 + (1.30 - 0.34) * (u / 0.16)
          : u < 0.34 ? 1.30 - 0.30 * ((u - 0.16) / 0.18)
            : u < 0.74 ? 1.0
              : 1.0 - 1.0 * ((u - 0.74) / 0.26);
        s = p.s0 * Math.max(0, k);
        alpha = p.alpha * (u < 0.74 ? 1 : 1 - (u - 0.74) / 0.26);
      } else {
        // nubes: crecen con desaceleración y se disuelven al final
        const g = 1 - (1 - u) * (1 - u);
        s = p.s0 + (p.s1 - p.s0) * g;
        alpha = p.alpha * (u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5);
      }

      let px, py, pz;
      if (p.ancla) {
        // órbita de mareo: el ancla se mueve a 60 fps (la cámara es continua),
        // pero el ÁNGULO va escalonado — la estrellita salta de pose en pose.
        const ang = p.orbA + Math.floor(edad / PASO) * PASO * p.orbV;
        px = p.ancla.x + Math.cos(ang) * p.orbR;
        py = (p.ancla.y ?? 0) + p.orbY + Math.sin(ang * 2) * 0.12;
        pz = p.ancla.z + Math.sin(ang) * p.orbR;
        alpha = p.alpha * (u < 0.62 ? 1 : 1 - (u - 0.62) / 0.38);
      } else {
        const te = Math.floor(edad / PASO) * PASO;
        px = p.x + p.vx * te;
        py = p.y + p.vy * te - 1.15 * te * te;
        pz = p.z + p.vz * te;
      }

      if (alpha <= 0.01 || s <= 0.001) continue;
      const i3 = n * 3, i2 = n * 2;
      aPos.array[i3] = px; aPos.array[i3 + 1] = py; aPos.array[i3 + 2] = pz;
      aSize.array[i2] = s; aSize.array[i2 + 1] = s;
      aRot.array[n] = p.rot + p.spin * (Math.floor(edad / PASO) * PASO);
      aAlpha.array[n] = alpha;
      aCell.array[n] = p.cell;
      aTint.array[i3] = p.tint[0]; aTint.array[i3 + 1] = p.tint[1]; aTint.array[i3 + 2] = p.tint[2];
      n++;
      if (n >= MAXI) break;
    }
    geo.instanceCount = n;
    malla.visible = n > 0;
    if (n > 0) {
      for (const a of [aPos, aSize, aRot, aAlpha, aCell, aTint]) a.needsUpdate = true;
    }
  }

  function limpiar() { vivos.length = 0; geo.instanceCount = 0; malla.visible = false; }

  function setActivo(v) { activo = !!v; if (!activo) limpiar(); }

  return {
    golpe, mareo, actualizar, limpiar, malla, setActivo,
    get activos() { return vivos.length; },
  };
}

// ── squash & stretch del vehículo ───────────────────────────────────────────
// Lo que más vende el golpe, y no cuesta nada: es escala. El cuerpo se aplasta
// contra el eje del impacto, se abulta en el perpendicular, y vuelve con un
// resorte amortiguado que se pasa un par de veces (q = A·e^-λt·cos(ωt)).
// El eje local del kart es X = adelante, Z = costado, así que la componente de
// la normal en cada uno reparte cuánto aplasta y cuánto estira: de morro te
// achata el largo, de flanco te achata el ancho. Sin rotaciones raras.
export function crearSacudon() {
  const st = { q: 0, t: 999, A: 0, lf: 1, lr: 0, yaw: 0 };
  const LAMBDA = 9.0;   // amortiguación
  const OMEGA = 21.5;   // ≈3.4 Hz → dos rebotes visibles en ~0.45 s

  function golpear(nx, nz, hdg, mag) {
    if (reducedMotionSacudon) return;
    const A = Math.min(0.46, 0.16 + mag * 0.34);
    if (A < st.A * Math.exp(-LAMBDA * st.t)) return; // no pisar un golpe más fuerte
    st.A = A; st.t = 0;
    st.lf = nx * Math.cos(hdg) + nz * Math.sin(hdg);
    st.lr = -nx * Math.sin(hdg) + nz * Math.cos(hdg);
    const n = Math.hypot(st.lf, st.lr) || 1;
    st.lf /= n; st.lr /= n;
    st.yaw = (Math.random() < 0.5 ? -1 : 1) * mag * 0.20;
  }

  // devuelve { sx, sy, sz, yaw } para multiplicar sobre la escala base
  function estado(dt) {
    st.t += dt;
    if (st.t > 0.9 || st.A <= 0) return null;
    const q = st.A * Math.exp(-LAMBDA * st.t) * Math.cos(OMEGA * st.t);
    const af = Math.abs(st.lf), ar = Math.abs(st.lr);
    return {
      sx: 1 - q * af + q * 0.72 * ar,
      sz: 1 - q * ar + q * 0.72 * af,
      sy: 1 + q * 0.34,
      yaw: st.yaw * Math.exp(-7.5 * st.t) * Math.cos(15.0 * st.t),
      q,
    };
  }

  return { golpear, estado };
}
