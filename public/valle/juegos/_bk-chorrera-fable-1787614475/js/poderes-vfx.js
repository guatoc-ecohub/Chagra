// ── poderes-vfx.js — el casting de los poderes, dibujado ────────────────────
// Arte de "activar habilidad" para los pilotos. La arquitectura viene del
// sandbox de casting evaluado en el catálogo (máquina de fases, pool de
// recursos, partículas con swirl alrededor de un ancla MÓVIL, empujes de
// postproceso), pero el vocabulario visual es el de la casa: crema de papel
// viejo, tinta, ocre — dibujo animado, no neón. Reglas que este archivo
// respeta a rajatabla:
//
//  · TODO se construye una vez al boot y se recicla. Activar un poder no
//    aloca geometría, no crea materiales y no añade luces (añadir/quitar
//    luces recompila todos los materiales de three: stutter garantizado).
//  · Ningún efecto vive más de 3 s. La fase FADE está incluida en ese tope.
//  · Los poderes son control biológico/comportamiento: la paleta sale de la
//    especie (miel de angelita, ocre de jaguar, verde baba, blanco espora),
//    jamás verde-veneno ni destello de arcade.
//  · Movimiento reducido: los empujes de pantalla pierden el pulso (quedan
//    estáticos) y los garabatos bajan de amplitud. Se respeta la misma
//    bandera global que usa el sacudón.
//
// El contrato con main.js es chico: crearPoderesVfx() una vez, castear() al
// activar (jugador o rival), actualizar() cada frame, crearMaterialBabas()
// para el hazard de Dante, precalentar() tras el primer montaje de escena.
//
// Las piezas "skillshot" (telegraph de apuntado, hielo, rayo kinked, haz-tubo)
// viven en poderes-skillshot.js (port MIT de LinearAbiltyCastingThreeJS) y se
// integran acá: flecha → Avispita, círculo medido → Mariquita, escarcha →
// Momificador, rayo → Chivito punk, haz → Luciérnaga.

import { crearSkillshot } from './poderes-skillshot.js';

// ── paleta de la casa ───────────────────────────────────────────────────────
const CREMA = 0xf2e2b0;
const PAPEL = 0xf2ecd7;
const TINTA = 0x211b12;
const MIEL = 0xf5cf54;
const MIEL_OSCURA = 0xd9a13b;
const OCRE = 0xd18d28;
const BABA = 0x6fa85a;
const BABA_OSCURA = 0x4d7a42;
const POLVO = 0xd1c39a;

// ── librería GLSL compartida (ES 1.00, three r160) ──────────────────────────
const GLSL_RUIDO = /* glsl */`
  float hash21(vec2 p){
    vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * vnoise(p);
      p = p * 2.03 + vec2(17.1, 9.7);
      a *= 0.5;
    }
    return v;
  }
`;

// ── partículas con forma (hoja, raya, mancha) y swirl anclado ───────────────
// Mismo esqueleto CPU que fx.js (probado barato aquí), con dos añadidos del
// sandbox: SILUETAS procedurales en el fragment (hoja con vena y borde de
// tinta, raya, mancha erosionada) y el modo SWIRL — la partícula no guarda
// posición absoluta sino (ángulo, radio, altura) alrededor de un ancla que se
// lee EN VIVO cada frame. Así el remolino viaja pegado al kart sin emisores
// nuevos: es exactamente el caso "efecto anclado a cuerpo en movimiento".
const FORMA = { SOFT: 0, MANCHA: 1, RAYA: 2, HOJA: 3 };

const PART_VERT = /* glsl */`
  uniform float uAltoPx;
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  attribute float aForma;
  attribute float aRot;
  varying float vAlpha;
  varying vec3 vColor;
  varying float vForma;
  varying float vRot;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vForma = aForma;
    vRot = aRot;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // techo proporcional a la resolución: en el móvil la cámara compacta se
    // pega al kart y sin tope una hoja del remolino tapaba media chiva
    gl_PointSize = min(aSize * (260.0 / -mv.z), uAltoPx * 0.11);
    gl_Position = projectionMatrix * mv;
  }
`;

const PART_FRAG = /* glsl */`

  varying float vAlpha;
  varying vec3 vColor;
  varying float vForma;
  varying float vRot;
  ${GLSL_RUIDO}
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float co = cos(vRot), si = sin(vRot);
    d = mat2(co, -si, si, co) * d;
    float a = 0.0;
    vec3 col = vColor;
    if (vForma < 0.5) {
      // SOFT: círculo difuminado
      a = smoothstep(0.5, 0.10, length(d));
    } else if (vForma < 1.5) {
      // MANCHA: puff erosionado — para babas y polvo grueso
      float r = length(d);
      float n = vnoise(d * 7.0 + vRot * 3.0);
      a = smoothstep(0.5, 0.18, r) * smoothstep(0.18, 0.5, n + 0.4 * (0.5 - r));
    } else if (vForma < 2.5) {
      // RAYA: trazo fino — chispas del rugido, garabatos de la locura
      a = (1.0 - smoothstep(0.03, 0.10, abs(d.y)))
        * (1.0 - smoothstep(0.26, 0.5, abs(d.x)));
    } else {
      // HOJA: elipse con vena central y borde entintado (lenguaje de dibujo)
      vec2 e = vec2(d.x / 0.40, d.y / 0.16);
      float r = dot(e, e);
      a = 1.0 - smoothstep(0.70, 1.0, r);
      float vena = 1.0 - smoothstep(0.008, 0.030, abs(d.y));
      float tinta = smoothstep(0.52, 0.96, r);
      col = mix(col, col * 0.32, max(vena * 0.55, tinta * 0.85));
    }
    gl_FragColor = vec4(col, vAlpha * a);
    if (gl_FragColor.a < 0.02) discard;
  }
`;

function crearPoolFormas(THREE, maxN, aditivo) {
  const pos = new Float32Array(maxN * 3);
  const col = new Float32Array(maxN * 3);
  const size = new Float32Array(maxN);
  const alpha = new Float32Array(maxN);
  const forma = new Float32Array(maxN);
  const rot = new Float32Array(maxN);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute('aForma', new THREE.BufferAttribute(forma, 1));
  geo.setAttribute('aRot', new THREE.BufferAttribute(rot, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: PART_VERT,
    fragmentShader: PART_FRAG,
    uniforms: { uAltoPx: { value: 900 } },
    transparent: true,
    depthWrite: false,
    blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 7;
  const parts = [];
  for (let i = 0; i < maxN; i++) {
    parts.push({
      modo: 0, x: 0, y: -500, z: 0, vx: 0, vy: 0, vz: 0, grav: 0, sueloY: null,
      ancla: null, ang: 0, angV: 0, rad: 0, radV: 0, alt: 0, altV: 0,
      life: 0, max: 1, size: 10, r: 1, g: 1, b: 1, a: 1, forma: 0, rot: 0, rotV: 0,
    });
  }
  geo.setDrawRange(0, maxN);
  return { pts, geo, mat, pos, col, size, alpha, forma, rot, parts, maxN, n: 0 };
}

// ── el motor ────────────────────────────────────────────────────────────────
export function crearPoderesVfx(THREE, cfg = {}) {
  const escena = cfg.escena;
  const gradeo = cfg.gradeo ?? null;
  const fxToon = cfg.fxToon ?? null;
  let reducedMotion = false;

  const grupo = new THREE.Group();
  grupo.name = 'poderesVfx';
  escena.add(grupo);

  const _c = new THREE.Color();
  const _c2 = new THREE.Color();
  let tGlobal = 0;

  // ── pools de partículas ───────────────────────────────────────────────────
  const dibujo = crearPoolFormas(THREE, 340, false); // blending normal: dibujo
  const chispa = crearPoolFormas(THREE, 160, true);  // aditivo: destellos
  grupo.add(dibujo.pts);
  grupo.add(chispa.pts);

  // ── piezas skillshot (construidas una vez, con dueño, como el embudo) ─────
  const skill = crearSkillshot(THREE, { crema: CREMA, tinta: TINTA, miel: MIEL, ocre: OCRE });
  grupo.add(skill.grupo);

  function emitir(pool, fn) {
    const p = pool.parts[pool.n];
    pool.n = (pool.n + 1) % pool.maxN;
    p.modo = 0; p.grav = 0; p.sueloY = null; p.ancla = null;
    p.rot = 0; p.rotV = 0;
    fn(p);
  }

  function integrarPool(pool, dt) {
    for (let i = 0; i < pool.maxN; i++) {
      const p = pool.parts[i];
      if (p.life > 0) {
        p.life -= dt;
        p.rot += p.rotV * dt;
        if (p.modo === 1 && p.ancla) {
          // swirl: órbita alrededor del ancla viva. radV<0 = succión.
          p.ang += p.angV * dt;
          p.rad = Math.max(0.12, p.rad + p.radV * dt);
          p.alt += p.altV * dt;
          p.x = p.ancla.x + Math.cos(p.ang) * p.rad;
          p.y = (p.ancla.y ?? 0) + p.alt;
          p.z = p.ancla.z + Math.sin(p.ang) * p.rad;
        } else {
          p.vy -= p.grav * dt;
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (p.sueloY !== null && p.y < p.sueloY) {
            // salpicadura: se aplasta contra el piso y muere rápido
            p.y = p.sueloY;
            p.vy = 0; p.vx *= 0.4; p.vz *= 0.4;
            p.life = Math.min(p.life, 0.16);
          }
        }
      }
      const activo = p.life > 0;
      pool.pos[i * 3] = activo ? p.x : -500;
      pool.pos[i * 3 + 1] = activo ? p.y : -500;
      pool.pos[i * 3 + 2] = activo ? p.z : -500;
      pool.col[i * 3] = p.r; pool.col[i * 3 + 1] = p.g; pool.col[i * 3 + 2] = p.b;
      const fade = activo ? Math.min(1, p.life / p.max) : 0;
      pool.size[i] = activo ? p.size * (0.55 + 0.45 * fade) : 0;
      pool.alpha[i] = activo ? p.a * fade : 0;
      pool.forma[i] = p.forma;
      pool.rot[i] = p.rot;
    }
    pool.geo.attributes.position.needsUpdate = true;
    pool.geo.attributes.aColor.needsUpdate = true;
    pool.geo.attributes.aSize.needsUpdate = true;
    pool.geo.attributes.aAlpha.needsUpdate = true;
    pool.geo.attributes.aForma.needsUpdate = true;
    pool.geo.attributes.aRot.needsUpdate = true;
  }

  // ── el embudo de Angelita: dos shells anidadas + falda de polvo ───────────
  // Cuello abajo, boca arriba, hebras anisotrópicas (frecuencia angular muy
  // por encima de la vertical: polvo en HEBRAS, no humo), el cuello gira más
  // rápido que la boca (momento angular) y uAge lo hace DESCENDER del aire.
  const EMBUDO_VERT = /* glsl */`
    uniform float uTime, uSpin, uRadio, uAltura, uEscala, uLeanX, uLeanZ;
    varying float vH;
    varying float vAng;
    ${GLSL_RUIDO}
    void main() {
      float h = position.y + 0.5;      // 0 piso → 1 boca
      vH = h;
      float ang = atan(position.z, position.x);
      float a = ang + uSpin * uTime * (1.0 + 1.8 * (1.0 - h));
      vAng = a;
      float perfil = mix(0.15, 1.0, pow(h, 1.55));
      float bulto = 1.0 + 0.15 * (vnoise(vec2(a * 1.6 + h * 2.0, h * 2.6 - uTime * 0.9)) - 0.5) * 2.0;
      float r = perfil * bulto * uRadio * uEscala;
      vec3 p = vec3(cos(a) * r, h * uAltura, sin(a) * r);
      p.x += uLeanX * h * h;
      p.z += uLeanZ * h * h;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
    }
  `;
  const EMBUDO_FRAG = /* glsl */`

    uniform float uTime, uAge, uOpacidad, uAlphaBase;
    uniform vec3 uColA, uColB, uTinta;
    varying float vH;
    varying float vAng;
    ${GLSL_RUIDO}
    void main() {
      // hebras: mucha frecuencia angular, poca vertical
      float f = fbm(vec2(vAng * 2.2, vH * 1.25 - uTime * 0.7));
      float hebra = smoothstep(0.32, 0.56, f);
      // desciende del aire: visible de la boca hacia abajo según uAge
      float frente = 1.0 - uAge;
      float baja = smoothstep(frente - 0.10, frente + 0.06, vH);
      float bordes = smoothstep(0.02, 0.10, vH) * (1.0 - smoothstep(0.93, 1.0, vH));
      vec3 col = mix(uColA, uColB, hebra * 0.7 + vH * 0.2);
      // línea de tinta en el borde de cada hebra: es lo que lo hace dibujo
      float tinta = 1.0 - smoothstep(0.015, 0.05, abs(f - 0.32));
      col = mix(col, uTinta, tinta * 0.65);
      float alfa = hebra * baja * bordes * uOpacidad * uAlphaBase;
      gl_FragColor = vec4(col, alfa);
      if (gl_FragColor.a < 0.02) discard;
    }
  `;

  function crearShellEmbudo(escala, spin, alphaBase) {
    // y en -0.5..0.5, que es lo que espera el vertex shader (h = y + 0.5)
    const geo = new THREE.CylinderGeometry(1, 1, 1, 40, 18, true);
    const mat = new THREE.ShaderMaterial({
      vertexShader: EMBUDO_VERT,
      fragmentShader: EMBUDO_FRAG,
      uniforms: {
        uTime: { value: 0 }, uSpin: { value: spin },
        uRadio: { value: 2.2 }, uAltura: { value: 3.5 }, uEscala: { value: escala },
        uLeanX: { value: 0 }, uLeanZ: { value: 0 },
        uAge: { value: 0 }, uOpacidad: { value: 1 }, uAlphaBase: { value: alphaBase },
        uColA: { value: new THREE.Color(0xb8861f) },
        uColB: { value: new THREE.Color(0xe3cf96) },
        uTinta: { value: new THREE.Color(TINTA) },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 6;
    return mesh;
  }

  const FALDA_FRAG = /* glsl */`

    uniform float uTime, uOpacidad;
    uniform vec3 uColA, uColB;
    varying vec2 vUv;
    ${GLSL_RUIDO}
    void main() {
      vec2 q = vUv - 0.5;
      float r = length(q) * 2.0;
      float a = atan(q.y, q.x);
      float f = fbm(vec2(a * 1.9 + uTime * 2.4, r * 2.8 - uTime * 1.5));
      float alfa = smoothstep(1.0, 0.5, r) * smoothstep(0.10, 0.38, r)
                 * smoothstep(0.32, 0.58, f) * uOpacidad * 0.75;
      vec3 col = mix(uColA, uColB, f);
      gl_FragColor = vec4(col, alfa);
      if (gl_FragColor.a < 0.02) discard;
    }
  `;
  const FALDA_VERT = /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const embudoGrupo = new THREE.Group();
  const shellInterna = crearShellEmbudo(1.0, 2.6, 0.85);
  const shellExterna = crearShellEmbudo(1.32, -1.4, 0.45);
  const falda = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 40),
    new THREE.ShaderMaterial({
      vertexShader: FALDA_VERT, fragmentShader: FALDA_FRAG,
      uniforms: {
        uTime: { value: 0 }, uOpacidad: { value: 1 },
        uColA: { value: new THREE.Color(POLVO) },
        uColB: { value: new THREE.Color(CREMA) },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  falda.rotation.x = -Math.PI / 2;
  falda.position.y = 0.07;
  falda.renderOrder = 5;
  embudoGrupo.add(shellInterna, shellExterna, falda);
  embudoGrupo.visible = false;
  grupo.add(embudoGrupo);

  const embudo = {
    dueno: null,
    tomar(cast) {
      this.dueno = cast;
      embudoGrupo.visible = true;
    },
    soltar(cast) {
      if (this.dueno !== cast) return;
      this.dueno = null;
      embudoGrupo.visible = false;
    },
    mover(x, y, z) { embudoGrupo.position.set(x, y, z); },
    set(age, opacidad, leanX, leanZ) {
      for (const s of [shellInterna, shellExterna]) {
        s.material.uniforms.uAge.value = age;
        s.material.uniforms.uOpacidad.value = opacidad;
        s.material.uniforms.uLeanX.value = leanX;
        s.material.uniforms.uLeanZ.value = leanZ;
      }
      falda.material.uniforms.uOpacidad.value = opacidad;
    },
    tick() {
      for (const s of [shellInterna, shellExterna]) s.material.uniforms.uTime.value = tGlobal;
      falda.material.uniforms.uTime.value = tGlobal;
    },
  };

  // ── anillos de choque en el piso (pool de 3, un programa) ────────────────
  // Onda expansiva dibujada: banda crema con doble línea de tinta que se abre
  // y pierde cuerpo con el radio. Sirve a cualquier poder de área.
  const ANILLO_FRAG = /* glsl */`

    uniform float uR, uAncho, uOpacidad;
    uniform vec3 uColor, uTinta;
    varying vec2 vUv;
    void main() {
      float r = length(vUv - 0.5) * 2.0;
      float d = abs(r - uR);
      float banda = 1.0 - smoothstep(0.0, uAncho, d);
      float tinta = 1.0 - smoothstep(0.0, uAncho * 0.30, abs(d - uAncho * 0.55));
      vec3 col = mix(uColor, uTinta, tinta * 0.85);
      float alfa = banda * uOpacidad;
      gl_FragColor = vec4(col, alfa);
      if (gl_FragColor.a < 0.02) discard;
    }
  `;
  const anillosPool = [];
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: FALDA_VERT, fragmentShader: ANILLO_FRAG,
      uniforms: {
        uR: { value: 0 }, uAncho: { value: 0.12 }, uOpacidad: { value: 0 },
        uColor: { value: new THREE.Color(CREMA) },
        uTinta: { value: new THREE.Color(TINTA) },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 48), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 5;
    mesh.visible = false;
    grupo.add(mesh);
    anillosPool.push({ mesh, mat, t: 0, dur: 0, retardo: 0, rMax: 1, alphaMax: 1, activo: false });
  }
  function dispararAnillo(o, opts = {}) {
    const a = anillosPool.find((x) => !x.activo) ?? anillosPool[0];
    a.activo = true;
    a.t = 0;
    a.dur = opts.dur ?? 0.55;
    a.retardo = opts.retardo ?? 0;
    a.rMax = opts.rMax ?? 7;
    a.alphaMax = opts.alpha ?? 0.85;
    a.mat.uniforms.uAncho.value = opts.ancho ?? 0.13;
    a.mat.uniforms.uColor.value.setHex(opts.color ?? CREMA);
    a.mesh.position.set(o.x, (o.y ?? 0) + 0.06, o.z);
    a.mesh.scale.setScalar(a.rMax);
    a.mesh.visible = false; // aparece cuando vence el retardo
  }
  function tickAnillos(dt) {
    for (const a of anillosPool) {
      if (!a.activo) continue;
      if (a.retardo > 0) { a.retardo -= dt; continue; }
      a.t += dt;
      const k = a.t / a.dur;
      if (k >= 1) { a.activo = false; a.mesh.visible = false; continue; }
      a.mesh.visible = true;
      a.mat.uniforms.uR.value = Math.sqrt(k); // rápido al abrir, se frena
      a.mat.uniforms.uOpacidad.value = a.alphaMax * (1 - k) * (1 - k * 0.3);
    }
  }

  // ── empujes del gradeo (pantalla) ─────────────────────────────────────────
  // El "paisaje del miedo" y la "locura" no son objetos: son la pantalla
  // respirando distinto. Se empuja el gradeo final existente y se RESTAURA la
  // línea base exacta al terminar — el baseline del juego no se degrada.
  const grade = (() => {
    if (!gradeo) return { push() {}, tick() {} };
    const u = gradeo.uniforms;
    const base = {
      sat: u.uSaturacion.value, vin: u.uVineta.value, grano: u.uGrano.value,
      gan: u.uGanancia.value, piso: u.uPiso.value, bal: u.uBalance.value.clone(),
    };
    const bal = new THREE.Vector3();
    const activos = [];
    let aplicado = false;
    function push(tipo, dur, fuerza = 1) {
      activos.push({ tipo, t: 0, dur, fuerza });
    }
    function tick(dt) {
      if (!activos.length) {
        if (aplicado) {
          u.uSaturacion.value = base.sat; u.uVineta.value = base.vin;
          u.uGrano.value = base.grano; u.uGanancia.value = base.gan;
          u.uPiso.value = base.piso; u.uBalance.value.copy(base.bal);
          aplicado = false;
        }
        return;
      }
      aplicado = true;
      let sat = base.sat, vin = base.vin, grano = base.grano, gan = base.gan, piso = base.piso;
      bal.copy(base.bal);
      for (let i = activos.length - 1; i >= 0; i--) {
        const p = activos[i];
        p.t += dt;
        const k = p.t / p.dur;
        if (k >= 1) { activos.splice(i, 1); continue; }
        // ataque corto, meseta, salida suave
        const env = Math.min(1, k / 0.12) * (1 - Math.max(0, (k - 0.72) / 0.28)) * p.fuerza;
        if (p.tipo === 'miedo' || p.tipo === 'rugido') {
          // frío, desaturado, viñeta que respira: la pista con depredador
          const esc = p.tipo === 'rugido' ? 0.38 : 1.0;
          const resp = reducedMotion ? 1 : 0.86 + 0.14 * Math.sin(p.t * 3.6);
          sat -= base.sat * 0.26 * env * esc;
          vin += 0.34 * env * esc * resp;
          grano += 0.030 * env * esc;
          gan -= 0.055 * env * esc;
          bal.x -= 0.045 * env * esc;
          bal.z += 0.055 * env * esc;
        } else if (p.tipo === 'locura') {
          // bamboleo de saturación y viñeta — mareo, no estrobo (nada de
          // parpadear la luma: fotosensibilidad y regla anti-neón)
          const wob = reducedMotion ? 0 : Math.sin(p.t * 6.2);
          sat += base.sat * 0.20 * env * wob;
          vin += (0.10 + 0.07 * wob) * env;
          bal.x += 0.020 * env * wob;
          bal.z -= 0.015 * env * wob;
        } else if (p.tipo === 'flash') {
          // un solo destello con caída rápida (Morpho, Momificador)
          const fl = (1 - k) * (1 - k);
          piso += 0.20 * fl * p.fuerza;
          gan += 0.10 * fl * p.fuerza;
        } else if (p.tipo === 'flashAzul') {
          const fl = (1 - k) * (1 - k);
          piso += 0.20 * fl * p.fuerza;
          bal.x -= 0.12 * fl * p.fuerza;
          bal.z += 0.22 * fl * p.fuerza;
        } else if (p.tipo === 'noche') {
          // cae la noche: se cierra todo, frío y viñeta honda
          gan -= 0.30 * env;
          piso -= base.piso * 0.55 * env;
          sat -= base.sat * 0.22 * env;
          vin += 0.30 * env;
          bal.x -= 0.06 * env;
          bal.z += 0.05 * env;
        }
      }
      u.uSaturacion.value = sat; u.uVineta.value = vin; u.uGrano.value = grano;
      u.uGanancia.value = gan; u.uPiso.value = piso; u.uBalance.value.copy(bal);
    }
    return { push, tick };
  })();

  // ── material de babas (para el hazard de Dante) ───────────────────────────
  // Reguero gooey: borde bamboleado con contorno de tinta, celdas de burbuja
  // (voronoi barato con vnoise), brillo húmedo que recorre el hilo. El plano
  // del hazard es 1×1 escalado (ancho, largo) y con vUv.y a lo largo.
  const BABAS_FRAG = /* glsl */`

    uniform float uTime, uSeed, uOpacidad;
    uniform vec3 uCol, uColOscuro, uTinta;
    varying vec2 vUv;
    ${GLSL_RUIDO}
    void main() {
      float lado = abs(vUv.x - 0.5) * 2.0;
      // borde bamboleado: el ancho del hilo ondula a lo largo
      float ondu = vnoise(vec2(vUv.y * 7.0 + uSeed, uSeed * 3.1)) - 0.5;
      float ancho = 0.62 + ondu * 0.5;
      float d = lado / max(ancho, 0.12);
      float cuerpo = 1.0 - smoothstep(0.72, 1.0, d);
      // contorno de tinta pegado al borde
      float tinta = smoothstep(0.62, 0.86, d) * cuerpo;
      // burbujas: puntos claros donde el ruido pica alto
      float bur = smoothstep(0.72, 0.95, vnoise(vec2(vUv.x * 9.0 + uSeed * 7.0, vUv.y * 26.0 - uSeed)));
      // brillo húmedo que viaja a lo largo del reguero
      float brillo = smoothstep(0.88, 1.0, vnoise(vec2(vUv.y * 3.0 - uTime * 0.8 + uSeed, vUv.x * 2.0)));
      vec3 col = mix(uCol, uColOscuro, d * 0.55);
      col = mix(col, vec3(0.93, 0.97, 0.90), max(bur * 0.5, brillo * 0.35));
      col = mix(col, uTinta, tinta * 0.75);
      // los extremos del hilo se afinan
      float puntas = smoothstep(0.0, 0.10, vUv.y) * (1.0 - smoothstep(0.86, 1.0, vUv.y));
      float alfa = cuerpo * puntas * uOpacidad;
      gl_FragColor = vec4(col, alfa);
      if (gl_FragColor.a < 0.02) discard;
    }
  `;
  function crearMaterialBabas(seed = 0) {
    return new THREE.ShaderMaterial({
      vertexShader: FALDA_VERT, fragmentShader: BABAS_FRAG,
      uniforms: {
        uTime: { value: 0 }, uSeed: { value: seed }, uOpacidad: { value: 0.85 },
        uCol: { value: new THREE.Color(BABA) },
        uColOscuro: { value: new THREE.Color(BABA_OSCURA) },
        uTinta: { value: new THREE.Color(TINTA) },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
  }
  // una instancia oculta para que el programa compile en el precalentado
  const babasPrecalienta = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), crearMaterialBabas(0.5));
  babasPrecalienta.rotation.x = -Math.PI / 2;
  babasPrecalienta.position.y = -400;
  babasPrecalienta.visible = false;
  grupo.add(babasPrecalienta);

  // ── emisores por poder ────────────────────────────────────────────────────
  function hojasRemolino(ancla, n) {
    for (let i = 0; i < n; i++) {
      emitir(dibujo, (p) => {
        p.modo = 1;
        p.ancla = ancla;
        p.ang = Math.random() * Math.PI * 2;
        p.angV = 5.0 + Math.random() * 3.5;
        p.rad = 1.8 + Math.random() * 1.2;
        p.radV = -(0.7 + Math.random() * 0.6);   // succión
        p.alt = 0.15 + Math.random() * 0.5;
        p.altV = 0.9 + Math.random() * 1.3;      // suben por el embudo
        p.max = p.life = 0.9 + Math.random() * 0.6;
        p.size = 6 + Math.random() * 4;
        p.forma = Math.random() < 0.72 ? FORMA.HOJA : FORMA.SOFT;
        p.rot = Math.random() * Math.PI * 2;
        p.rotV = (Math.random() - 0.5) * 10;
        _c.setHex([0xd9c27a, 0xe8d9a8, 0xb8a662][i % 3]);
        p.r = _c.r; p.g = _c.g; p.b = _c.b;
        p.a = 0.9;
      });
    }
  }

  function rayasRugido(o, n) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      emitir(chispa, (p) => {
        p.x = o.x + Math.cos(a) * 0.8;
        p.y = (o.y ?? 0) + 0.5 + Math.random() * 0.5;
        p.z = o.z + Math.sin(a) * 0.8;
        const v = 9 + Math.random() * 6;
        p.vx = Math.cos(a) * v;
        p.vy = 0.3 + Math.random() * 0.8;
        p.vz = Math.sin(a) * v;
        p.max = p.life = 0.45 + Math.random() * 0.25;
        p.size = 8 + Math.random() * 5;
        p.forma = FORMA.RAYA;
        p.rot = -a;
        _c.setHex(OCRE).lerp(_c2.setHex(CREMA), Math.random() * 0.5);
        p.r = _c.r; p.g = _c.g; p.b = _c.b;
        p.a = 0.9;
      });
    }
  }

  function salpicarBabas(o, n) {
    const atras = o.hdg + Math.PI;
    for (let i = 0; i < n; i++) {
      const a = atras + (Math.random() - 0.5) * 1.3;
      emitir(dibujo, (p) => {
        p.x = o.x + Math.cos(atras) * 1.0 + (Math.random() - 0.5) * 0.5;
        p.y = (o.y ?? 0) + 0.5 + Math.random() * 0.4;
        p.z = o.z + Math.sin(atras) * 1.0 + (Math.random() - 0.5) * 0.5;
        const v = 1.6 + Math.random() * 3.2;
        p.vx = Math.cos(a) * v;
        p.vy = 1.2 + Math.random() * 2.0;
        p.vz = Math.sin(a) * v;
        p.grav = 9.0;
        p.sueloY = (o.y ?? 0) + 0.05;
        p.max = p.life = 0.5 + Math.random() * 0.4;
        // gotas chicas y verdes de verdad: con 9-15 el spray se leía como una
        // nube pastel gigante que tapaba el kart, no como babas
        p.size = 4 + Math.random() * 5;
        p.forma = Math.random() < 0.3 ? FORMA.MANCHA : FORMA.SOFT;
        _c.setHex(BABA).lerp(_c2.setHex(0xffffff), Math.random() * 0.10);
        p.r = _c.r; p.g = _c.g; p.b = _c.b;
        p.a = 0.75;
      });
    }
  }

  function garabatosLocura(ancla, n) {
    const amp = reducedMotion ? 0.5 : 1;
    for (let i = 0; i < n; i++) {
      emitir(dibujo, (p) => {
        p.modo = 1;
        p.ancla = ancla;
        p.ang = Math.random() * Math.PI * 2;
        p.angV = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 4) * amp;
        p.rad = 1.0 + Math.random() * 0.8;
        p.radV = 0.7 + Math.random() * 0.8;      // se abren en espiral
        p.alt = 0.4 + Math.random() * 1.0;
        p.altV = (Math.random() - 0.5) * 1.2 * amp;
        p.max = p.life = 0.8 + Math.random() * 0.5;
        // trazos de lápiz: con 10-17 eran hélices que tapaban el kart entero
        p.size = 6 + Math.random() * 4;
        p.forma = FORMA.RAYA;
        p.rot = Math.random() * Math.PI * 2;
        p.rotV = (Math.random() - 0.5) * 22 * amp; // el garabato: la raya gira loca
        // mitad papel, mitad tinta pura — garabato de lápiz sobre la escena
        if (Math.random() < 0.45) _c.setHex(TINTA);
        else _c.setHex(PAPEL);
        p.r = _c.r; p.g = _c.g; p.b = _c.b;
        p.a = 0.8;
      });
    }
  }

  function nubeEsporas(ancla, n, colorHex) {
    for (let i = 0; i < n; i++) {
      emitir(dibujo, (p) => {
        p.modo = 1;
        p.ancla = ancla;
        p.ang = Math.random() * Math.PI * 2;
        p.angV = (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.9);
        p.rad = 0.6 + Math.random() * 1.0;
        p.radV = 0.85 + Math.random() * 0.9;     // la nube se expande
        p.alt = 0.3 + Math.random() * 1.1;
        p.altV = 0.25 + Math.random() * 0.4;
        p.max = p.life = 1.1 + Math.random() * 0.8;
        p.size = 12 + Math.random() * 9;
        p.forma = Math.random() < 0.65 ? FORMA.MANCHA : FORMA.SOFT;
        p.rot = Math.random() * Math.PI * 2;
        p.rotV = (Math.random() - 0.5) * 2;
        // un pie de gris cálido: espora blanca PURA se funde con el camino al sol
        _c.setHex(colorHex).lerp(_c2.setHex(0xb9b4a4), Math.random() * 0.35);
        p.r = _c.r; p.g = _c.g; p.b = _c.b;
        p.a = 0.85;
      });
    }
  }

  function larvasCrisopa(o, objetivos, n) {
    // larvas que SALEN del kart y se prenden del rival: nacen balísticas hacia
    // cada objetivo y al acercarse quedan orbitando su ancla (se "prenden")
    const anclas = objetivos.length ? objetivos : [null];
    for (let i = 0; i < n; i++) {
      const destino = anclas[i % anclas.length];
      emitir(dibujo, (p) => {
        if (destino) {
          p.modo = 1;
          p.ancla = destino;
          p.ang = Math.random() * Math.PI * 2;
          p.angV = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 2.5);
          p.rad = 2.8 + Math.random() * 1.4;
          p.radV = -(2.6 + Math.random() * 1.4);  // caen sobre el rival
          p.alt = 0.3 + Math.random() * 0.9;
          p.altV = -0.15;
        } else {
          p.x = o.x; p.y = (o.y ?? 0) + 0.6; p.z = o.z;
          const a = Math.random() * Math.PI * 2;
          p.vx = Math.cos(a) * 3; p.vy = 1.5; p.vz = Math.sin(a) * 3;
          p.grav = 5;
        }
        p.max = p.life = 1.0 + Math.random() * 0.5;
        p.size = 7 + Math.random() * 4;
        p.forma = FORMA.HOJA;                     // larva alargada
        p.rot = Math.random() * Math.PI * 2;
        p.rotV = (Math.random() - 0.5) * 14;      // culebrea
        _c.setHex(0xa7d96c).lerp(_c2.setHex(0x6d8f43), Math.random() * 0.6);
        p.r = _c.r; p.g = _c.g; p.b = _c.b;
        p.a = 0.95;
      });
    }
  }

  function estelaAvispita(o, objetivo, k) {
    // tiro dirigido: estela de rayas que corre del kart al puntero. k = avance
    // 0..1 del frente; el trazo nace EN el frente, así se lee la persecución.
    const dx = objetivo.x - o.x, dy = (objetivo.y ?? 0) - (o.y ?? 0), dz = objetivo.z - o.z;
    const px = o.x + dx * k, py = (o.y ?? 0) + 0.8 + dy * k + Math.sin(k * Math.PI) * 1.6, pz = o.z + dz * k;
    for (let i = 0; i < 3; i++) {
      emitir(chispa, (p) => {
        p.x = px + (Math.random() - 0.5) * 0.3;
        p.y = py + (Math.random() - 0.5) * 0.3;
        p.z = pz + (Math.random() - 0.5) * 0.3;
        p.vx = (Math.random() - 0.5) * 0.8;
        p.vy = -0.4 - Math.random() * 0.5;
        p.vz = (Math.random() - 0.5) * 0.8;
        p.max = p.life = 0.45 + Math.random() * 0.25;
        p.size = 12 + Math.random() * 6;
        p.forma = FORMA.RAYA;
        p.rot = Math.atan2(dz, dx) * -1;
        _c.setHex(0xd9a13b).lerp(_c2.setHex(CREMA), Math.random() * 0.3);
        p.r = _c.r; p.g = _c.g; p.b = _c.b;
        p.a = 1.0;
      });
    }
  }

  function enjambreMariquita(o, k, dur) {
    // barrida: una cortina de puntos naranja/negro que AVANZA por el carril
    // propio limpiándolo. k = avance 0..1 sobre ~14 m hacia adelante.
    const adel = k * 14;
    const px = o.x + Math.cos(o.hdg) * adel;
    const pz = o.z + Math.sin(o.hdg) * adel;
    const nx = -Math.sin(o.hdg), nz = Math.cos(o.hdg);
    for (let i = 0; i < 3; i++) {
      const lado = (Math.random() - 0.5) * 3.4;
      emitir(dibujo, (p) => {
        p.x = px + nx * lado;
        p.y = (o.y ?? 0) + 0.15 + Math.random() * 0.7;
        p.z = pz + nz * lado;
        p.vx = Math.cos(o.hdg) * 3 + (Math.random() - 0.5) * 2;
        p.vy = 0.5 + Math.random() * 1.2;
        p.vz = Math.sin(o.hdg) * 3 + (Math.random() - 0.5) * 2;
        p.max = p.life = 0.4 + Math.random() * 0.3;
        p.size = 6 + Math.random() * 5;
        p.forma = FORMA.SOFT;
        // el enjambre es naranja con motas negras, como el bicho real
        if (Math.random() < 0.25) _c.setHex(TINTA);
        else _c.setHex(0xd9721b).lerp(_c2.setHex(CREMA), Math.random() * 0.25);
        p.r = _c.r; p.g = _c.g; p.b = _c.b;
        p.a = 0.9;
      });
    }
  }

  function vendasMomia(objetivo, n) {
    // la momia es literal: rayas doradas que se enrollan alrededor del rival
    for (let i = 0; i < n; i++) {
      emitir(dibujo, (p) => {
        p.modo = 1;
        p.ancla = objetivo;
        p.ang = Math.random() * Math.PI * 2;
        p.angV = 6 + Math.random() * 3;
        p.rad = 1.5;
        p.radV = -0.25;
        p.alt = 0.15 + (i / n) * 1.3;             // escalera de vendas
        p.altV = 0.12;
        p.max = p.life = 0.9 + Math.random() * 0.4;
        p.size = 13 + Math.random() * 5;
        p.forma = FORMA.RAYA;
        p.rot = 0;
        p.rotV = 6 + Math.random() * 3;           // gira con la órbita
        _c.setHex(0xd9b45a).lerp(_c2.setHex(CREMA), Math.random() * 0.4);
        p.r = _c.r; p.g = _c.g; p.b = _c.b;
        p.a = 0.92;
      });
    }
  }

  function murcielagosNoche(ancla, n) {
    for (let i = 0; i < n; i++) {
      emitir(dibujo, (p) => {
        p.modo = 1;
        p.ancla = ancla;
        p.ang = Math.random() * Math.PI * 2;
        p.angV = (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 2);
        p.rad = 1.6 + Math.random() * 1.6;
        p.radV = 0.9 + Math.random() * 0.8;
        p.alt = 1.2 + Math.random() * 1.4;        // vuelan alto, sobre el kart
        p.altV = 0.5 + Math.random() * 0.6;
        p.max = p.life = 1.0 + Math.random() * 0.6;
        p.size = 13 + Math.random() * 6;
        p.forma = FORMA.HOJA;                     // silueta de ala
        p.rot = Math.random() * Math.PI * 2;
        p.rotV = (Math.random() - 0.5) * 18;      // aleteo
        // pardo canela sobre el cielo que se apaga: con tinta pura los
        // murciélagos desaparecían dentro de su propia noche
        _c.setHex(0x6a4a2e).lerp(_c2.setHex(0x3a2c20), Math.random() * 0.6);
        p.r = _c.r; p.g = _c.g; p.b = _c.b;
        p.a = 0.9;
      });
    }
  }

  function destellosMorpho(o, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      emitir(chispa, (p) => {
        p.x = o.x + Math.cos(a) * 0.5;
        p.y = (o.y ?? 0) + 0.8 + Math.random() * 0.8;
        p.z = o.z + Math.sin(a) * 0.5;
        const v = 4 + Math.random() * 5;
        p.vx = Math.cos(a) * v;
        p.vy = 1.5 + Math.random() * 2.5;
        p.vz = Math.sin(a) * v;
        p.grav = 2.5;
        p.max = p.life = 0.6 + Math.random() * 0.4;
        p.size = 12 + Math.random() * 8;
        p.forma = Math.random() < 0.6 ? FORMA.RAYA : FORMA.SOFT;
        p.rot = -a;
        // azul estructural del morpho: azul profundo con puntas casi blancas
        _c.setHex(0x2e6ad8).lerp(_c2.setHex(0xcfe4ff), Math.random() * 0.55);
        p.r = _c.r; p.g = _c.g; p.b = _c.b;
        p.a = 0.95;
      });
    }
  }

  // ── definiciones por poder (fases: spawn → tick(k) → morir; total ≤ 3 s) ──
  const PODERES = {
    angelita: {
      dur: 2.4, fade: 0.6,
      spawn(c) {
        embudo.tomar(c);
        dispararAnillo(c.origen, { rMax: 6.5, dur: 0.55, color: MIEL, alpha: 0.8 });
        c.datos.emisor = 0;
      },
      tick(c, dt, k, op) {
        const o = c.origen;
        embudo.mover(o.x, o.y ?? 0, o.z);
        // desciende del aire en 0.38 s y en el fade se retrae hacia arriba
        const age = Math.min(1, c.t / 0.38) * op;
        // el embudo se inclina con el avance del kart: viaja, no flota
        const lean = Math.min(0.9, (o.vel ?? 0) * 0.028);
        embudo.set(age, op, Math.cos(o.hdg) * lean, Math.sin(o.hdg) * lean);
        c.datos.emisor -= dt;
        if (c.datos.emisor <= 0 && k < 0.72) {
          c.datos.emisor = 0.06;
          hojasRemolino(c.ancla ?? o, 2);
        }
      },
      morir(c) { embudo.soltar(c); },
    },
    jaguar: {
      dur: 1.8, fade: 0.4,
      spawn(c) {
        dispararAnillo(c.origen, { rMax: 7, dur: 0.9, color: OCRE, alpha: 0.75, ancho: 0.09 });
        dispararAnillo(c.origen, { rMax: 11, dur: 1.2, retardo: 0.25, color: OCRE, alpha: 0.4, ancho: 0.07 });
        rayasRugido(c.origen, 18);
        // el propio rugido estremece el aire del que ruge, apenas
        grade.push('rugido', 0.7);
      },
      tick() {},
    },
    dante: {
      dur: 1.5, fade: 0.4,
      spawn(c) {
        salpicarBabas(c.origen, 18);
        c.datos.goteo = 0;
      },
      tick(c, dt, k) {
        // sigue goteando mientras el reguero se estira detrás del kart
        c.datos.goteo -= dt;
        if (c.datos.goteo <= 0 && k < 0.7) {
          c.datos.goteo = 0.09;
          salpicarBabas(c.origen, 3);
        }
      },
    },
    oliver: {
      dur: 1.7, fade: 0.4,
      spawn(c, opts) {
        garabatosLocura(c.ancla ?? c.origen, 14);
        grade.push('locura', 1.6);
        // estrellitas de mareo sobre cada rival enloquecido, del atlas toon
        if (fxToon?.mareo) {
          for (const ancla of opts.anclas ?? []) fxToon.mareo(ancla, { dur: 1.5 });
        }
        c.datos.emisor = 0;
      },
      tick(c, dt, k) {
        c.datos.emisor -= dt;
        if (c.datos.emisor <= 0 && k < 0.6) {
          c.datos.emisor = 0.14;
          garabatosLocura(c.ancla ?? c.origen, 3);
        }
      },
    },
    crisopa: {
      dur: 1.8, fade: 0.4,
      spawn(c, opts) {
        larvasCrisopa(c.origen, opts.anclas ?? [], 16);
        dispararAnillo(c.origen, { rMax: 5, dur: 0.45, color: 0xa7d96c, alpha: 0.6 });
        c.datos.emisor = 0;
      },
      tick(c, dt, k) {
        c.datos.emisor -= dt;
        if (c.datos.emisor <= 0 && k < 0.5) {
          c.datos.emisor = 0.22;
          larvasCrisopa(c.origen, c.datos.anclas ?? [], 4);
        }
      },
    },
    avispita: {
      dur: 2.0, fade: 0.3,
      spawn(c, opts) {
        // el único poder de precisión: guarda el ancla del puntero y el frente
        // recorre kart→objetivo a velocidad constante (arco, no parámetro)
        c.datos.objetivo = opts.objetivo ?? null;
        c.datos.salida = { x: c.origen.x, y: c.origen.y, z: c.origen.z };
        // el telegraph: la flecha en el piso avisa POR DÓNDE va a ir el tiro
        // mientras la estela lo recorre — el "caparazón rojo" con aviso
        if (c.datos.objetivo) skill.flecha.tomar(c);
      },
      tick(c, dt, k, op) {
        const obj = c.datos.objetivo;
        if (!obj) return;
        if (skill.flecha.dueno === c) {
          if (c.t < 0.9) {
            const rev = Math.min(1, c.t / 0.35);
            skill.flecha.set(c.datos.salida, obj, rev, op);
          } else skill.flecha.soltar(c);
        }
        const kFrente = Math.min(1, c.t / 1.1); // 1.1 s de viaje
        estelaAvispita(c.datos.salida, obj, kFrente);
        if (kFrente >= 1 && !c.datos.pego) {
          c.datos.pego = true;
          dispararAnillo(obj, { rMax: 4.5, dur: 0.4, color: 0xd9a13b, alpha: 0.8 });
        }
      },
      morir(c) { skill.flecha.soltar(c); },
    },
    mariquita: {
      dur: 1.6, fade: 0.3,
      spawn(c) {
        dispararAnillo(c.origen, { rMax: 5, dur: 0.4, color: 0xd9721b, alpha: 0.7 });
        // el círculo medido: dibuja los 8 m REALES del barrido (main.js filtra
        // hazards a ese radio) con snap que sobrepasa y se asienta
        skill.circulo.tomar(c);
      },
      tick(c, dt, k, op) {
        if (skill.circulo.dueno === c) {
          if (k < 0.8) skill.circulo.set(c.origen, c.t / 0.5, op);
          else skill.circulo.soltar(c);
        }
        if (k < 0.85) enjambreMariquita(c.origen, k / 0.85, c.dur);
      },
      morir(c) { skill.circulo.soltar(c); },
    },
    momificador: {
      dur: 1.6, fade: 0.4,
      spawn(c, opts) {
        grade.push('flash', 0.4, 0.6);
        const obj = opts.objetivo ?? c.ancla ?? c.origen;
        vendasMomia(obj, 14);
        dispararAnillo(obj, { rMax: 4, dur: 0.45, color: 0xd9b45a, alpha: 0.8 });
        // la Momia CONGELA: frente de escarcha que corre por el piso y campo
        // de cristales que brotan donde el frente los pisa. SOLO con objetivo
        // real: plantado en el caster, la cámara de atrás queda ADENTRO de un
        // cristal (cuñas gigantes tapando el cielo — pasó en el gate)
        if (opts.objetivo) {
          c.datos.hieloObj = obj;
          skill.hielo.tomar(c, c.origen.x * 7.31 + c.origen.z * 3.7 + 11);
        }
      },
      tick(c, dt, k, op) {
        if (skill.hielo.dueno !== c || !c.datos.hieloObj) return;
        const o = c.datos.hieloObj;
        skill.hielo.mover(o.x, o.y ?? 0, o.z);
        skill.hielo.set(Math.min(1, c.t / 0.7), op);
      },
      morir(c) { skill.hielo.soltar(c); },
    },
    murcielago: {
      dur: 2.6, fade: 0.6,
      spawn(c) {
        grade.push('noche', 2.4);
        murcielagosNoche(c.ancla ?? c.origen, 12);
        c.datos.emisor = 0;
      },
      tick(c, dt, k) {
        c.datos.emisor -= dt;
        if (c.datos.emisor <= 0 && k < 0.55) {
          c.datos.emisor = 0.3;
          murcielagosNoche(c.ancla ?? c.origen, 3);
        }
      },
    },
    morpho: {
      dur: 1.4, fade: 0.4,
      spawn(c) {
        grade.push('flashAzul', 0.8, 1);
        destellosMorpho(c.origen, 22);
        dispararAnillo(c.origen, { rMax: 7, dur: 0.7, color: 0x2e6ad8, alpha: 0.75 });
      },
      tick(c, dt, k) {
        // segunda oleada del destello: el brillo estructural parpadea dos veces
        if (!c.datos.oleada && k > 0.3) {
          c.datos.oleada = true;
          destellosMorpho(c.origen, 12);
        }
      },
    },
    beauveria: {
      dur: 2.6, fade: 0.6,
      spawn(c) {
        nubeEsporas(c.ancla ?? c.origen, 20, 0xe8ece3);
        c.datos.emisor = 0;
      },
      tick(c, dt, k) {
        c.datos.emisor -= dt;
        if (c.datos.emisor <= 0 && k < 0.65) {
          c.datos.emisor = 0.12;
          nubeEsporas(c.ancla ?? c.origen, 3, 0xe8ece3);
        }
      },
    },
    // ── el chispazo del chivito punk: rayo kinked del cielo a la pista ──────
    // El punto de impacto viaja ADELANTE del kart (recomputado por tick, como
    // el enjambre): el rayo persigue la pista que viene, no un punto muerto.
    'chivito-punk': {
      dur: 1.9, fade: 0.4,
      spawn(c) {
        skill.rayo.tomar(c, c.origen.x * 5.17 + c.origen.z * 9.3 + 7);
        grade.push('flash', 0.35, 0.55);
        c.datos.pego = false;
      },
      tick(c, dt, k, op) {
        if (skill.rayo.dueno !== c) return;
        const o = c.origen;
        const a = skill.AJUSTES.rayo;
        const ix = o.x + Math.cos(o.hdg) * a.alcance;
        const iz = o.z + Math.sin(o.hdg) * a.alcance;
        const iy = o.y ?? 0;
        const impacto = { x: ix, y: iy, z: iz };
        const cielo = {
          x: ix - Math.cos(o.hdg) * 2.5 + Math.sin(o.hdg) * 1.5,
          y: iy + a.cielo,
          z: iz - Math.sin(o.hdg) * 2.5 - Math.cos(o.hdg) * 1.5,
        };
        const prog = Math.min(1, c.t / a.golpe);
        skill.rayo.set(cielo, impacto, prog, op);
        if (prog >= 1 && !c.datos.pego) {
          c.datos.pego = true;
          dispararAnillo(impacto, { rMax: 5, dur: 0.5, color: OCRE, alpha: 0.8 });
          rayasRugido(impacto, 10);
        }
        // la quemadura ramificada respira brasa un instante y queda el carbón
        const vida = c.datos.pego ? Math.max(0, 1 - (c.t - a.golpe) / 0.9) : 0;
        skill.rayo.quemar(impacto, c.datos.pego ? Math.max(vida, 0.001) : 0, op);
      },
      morir(c) { skill.rayo.soltar(c); },
    },
    // ── la luz fría de la luciérnaga: haz-tubo con los 4 beats ──────────────
    // carga (orbe sobre el kart) → viaje (el frente sale) → arde (columna
    // sostenida pista abajo) → fundido. La linterna viaja CON el kart.
    luciernaga: {
      dur: 2.8, fade: 0.5,
      spawn(c) {
        skill.haz.tomar(c, c.origen.x * 3.71 + c.origen.z * 5.9 + 3);
        c.datos.aterrizo = false;
        c.datos.motas = 0;
      },
      tick(c, dt, k, op) {
        if (skill.haz.dueno !== c) return;
        const o = c.origen;
        const a = skill.AJUSTES.haz;
        // la luciérnaga LEVANTA su linterna: el orbe sube mientras carga y la
        // columna cae en diagonal sobre la pista (de punta era una bola)
        const sube = 1 - Math.pow(1 - Math.min(1, c.t / a.carga), 3);
        const boca = {
          x: o.x + Math.cos(o.hdg) * a.bocaAdelante,
          y: (o.y ?? 0) + 1.1 + (a.bocaAlto - 1.1) * sube,
          z: o.z + Math.sin(o.hdg) * a.bocaAdelante,
        };
        const impacto = {
          x: o.x + Math.cos(o.hdg) * a.largo,
          y: (o.y ?? 0) + 0.25,
          z: o.z + Math.sin(o.hdg) * a.largo,
        };
        let carga, prog;
        if (c.t < a.carga) {
          carga = c.t / a.carga;
          prog = 0;
        } else {
          // al soltar, el orbe se apaga mientras la columna se alimenta de él
          carga = Math.max(0, 1 - (c.t - a.carga) / 0.35);
          prog = Math.min(1, (c.t - a.carga) / a.viaje);
        }
        skill.haz.set(boca, impacto, carga, prog, op);
        if (prog >= 1 && !c.datos.aterrizo) {
          c.datos.aterrizo = true;
          dispararAnillo(impacto, { rMax: 5, dur: 0.5, color: MIEL, alpha: 0.75 });
        }
        // motas de luciérnaga alrededor del orbe mientras carga
        c.datos.motas -= dt;
        if (carga > 0.15 && c.datos.motas <= 0) {
          c.datos.motas = 0.07;
          for (let i = 0; i < 2; i++) {
            emitir(chispa, (p) => {
              const ang = Math.random() * Math.PI * 2;
              p.x = boca.x + Math.cos(ang) * 0.7;
              p.y = boca.y + (Math.random() - 0.5) * 0.6;
              p.z = boca.z + Math.sin(ang) * 0.7;
              p.vx = -Math.cos(ang) * 0.8;
              p.vy = 0.3 + Math.random() * 0.5;
              p.vz = -Math.sin(ang) * 0.8;
              p.max = p.life = 0.4 + Math.random() * 0.3;
              p.size = 6 + Math.random() * 5;
              p.forma = FORMA.SOFT;
              _c.setHex(MIEL).lerp(_c2.setHex(0xfdf8e2), Math.random() * 0.6);
              p.r = _c.r; p.g = _c.g; p.b = _c.b;
              p.a = 0.9;
            });
          }
        }
      },
      morir(c) { skill.haz.soltar(c); },
    },
  };

  // ── manager de casts ──────────────────────────────────────────────────────
  const casts = [];
  const MAX_CASTS = 6;

  const PILOTOS_PERMITIDOS = new Set(['angelita', 'jaguar', 'dante', 'oliver', 'luciernaga']);

  function castear(pilotoId, origen, opts = {}) {
    if (!PILOTOS_PERMITIDOS.has(pilotoId)) return false;
    const def = PODERES[pilotoId];
    if (!def) return false;
    const c = {
      id: pilotoId, def, t: 0, dur: def.dur,
      origen: { x: origen.x, y: origen.y ?? 0, z: origen.z, hdg: origen.hdg ?? 0, vel: origen.vel ?? 0 },
      ancla: origen.ancla ?? null,
      datos: {},
    };
    if (opts.anclas) c.datos.anclas = opts.anclas;
    def.spawn?.(c, opts);
    casts.push(c);
    if (casts.length > MAX_CASTS) {
      const viejo = casts.shift();
      viejo.def.morir?.(viejo);
    }
    return true;
  }

  function actualizar(dt, ctx = {}) {
    tGlobal += dt;
    reducedMotion = !!ctx.reducedMotion;
    if (ctx.altoPx) {
      dibujo.mat.uniforms.uAltoPx.value = ctx.altoPx;
      chispa.mat.uniforms.uAltoPx.value = ctx.altoPx;
    }
    for (let i = casts.length - 1; i >= 0; i--) {
      const c = casts[i];
      c.t += dt;
      if (c.t >= c.dur) {
        c.def.morir?.(c);
        casts.splice(i, 1);
        continue;
      }
      // el origen sigue al ancla viva (el poder viaja con quien lo lanzó)
      if (c.ancla) {
        c.origen.x = c.ancla.x;
        c.origen.y = c.ancla.y ?? c.origen.y;
        c.origen.z = c.ancla.z;
        if (Number.isFinite(ctx.hdgJugador) && c.ancla === ctx.anclaJugador) {
          c.origen.hdg = ctx.hdgJugador;
          c.origen.vel = ctx.velJugador ?? c.origen.vel;
        }
      }
      const k = c.t / c.dur;
      const fade = c.def.fade ?? 0.4;
      const op = c.t > c.dur - fade ? (c.dur - c.t) / fade : 1;
      c.def.tick?.(c, dt, k, op);
    }
    embudo.tick();
    tickAnillos(dt);
    integrarPool(dibujo, dt);
    integrarPool(chispa, dt);
    skill.tick(tGlobal, reducedMotion);
    grade.tick(dt);
  }

  function limpiar() {
    for (const c of casts) c.def.morir?.(c);
    casts.length = 0;
    for (const pool of [dibujo, chispa]) {
      for (const p of pool.parts) p.life = 0;
    }
  }

  // Compila todos los programas al boot (compile() recorre traverseVisible,
  // así que hay que encender el pool un instante). Sin esto, el primer cast
  // de la carrera se traga la compilación del shader: stutter.
  function precalentar(renderer, camara) {
    const estados = [];
    grupo.traverse((o) => {
      estados.push([o, o.visible]);
      o.visible = true;
    });
    try {
      renderer.compile(escena, camara);
    } finally {
      for (const [o, v] of estados) o.visible = v;
    }
  }

  return {
    castear, actualizar, limpiar, precalentar, crearMaterialBabas,
    grade, // para empujar 'miedo'/'noche' cuando el JUGADOR recibe el efecto
    get activos() { return casts.length; },
    // tripas para sondas de gate: estado real de los pools, no adivinanzas
    _interno: { grupo, embudoGrupo, shellInterna, shellExterna, falda, anillosPool, dibujo, chispa, skill },
  };
}
