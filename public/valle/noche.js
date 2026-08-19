// ── LA NOCHE SOBRE EL VALLE REAL ─────────────────────────────────────────────
// `?hora=noche`: el MISMO valle — el DEM, el farallón de cliff.js, La Chorrera
// de waterfalls.js, el domo, Dante y Oliver — con el sol puesto. NO es una
// escena aparte (la regla de la casa, igual que `?leccion=agua`): este módulo
// solo MUEVE los diales que ya existen (cielo, luces, bruma, agua, exposición)
// y suma lo que la noche trae de suyo: luna, estrellas, luciérnagas y una luz
// tibia en el domo. Si mañana el valle cambia, la noche cambia con él.
//
// LA TRANSICIÓN es un solo factor k (0=día → 1=noche) con smootherstep sobre
// ~8 s: el sol del cielo BAJA de +6,5° a −16° mientras las luces se enfrían,
// la bruma alta se disuelve y las estrellas encienden — un atardecer
// acelerado, no un switch. Con `?cam=` (los cuadros fijos del gate) k arranca
// en 1: captura determinista, sin cronometrar el crepúsculo. El botón ☀️/🌙
// devuelve el día con la misma transición (la prueba viva de que es EL MISMO
// valle).
//
// GROUNDING (Guatoc, 4°44'N, 2500 msnm):
//  · El techo de nube del día (file_158) se DISUELVE: la madrugada despejada
//    de alta montaña es la ventana de estrellas — por eso las cartas de nube
//    ALTAS van a ~0 y el telón cwall a 0, mientras la bruma BAJA del cañón
//    queda, tenue y plateada por la luna (la firma del bosque de niebla no
//    duerme).
//  · Luciérnagas (cocuyos) en la pradera del sitio: existen aquí y son la
//    vida visible de la noche. Los pájaros del térmico duermen (opacity→0).
//  · La luna va SOBRE el farallón de La Chorrera, dentro de la franja de
//    cielo del cuadro oficial `?cam=guatoc`. Su puesto NO se razonó a ojo:
//    se MIDIÓ con probe-luna.mjs proyectando el punto en la cámara real del
//    gate (la cámara vive en (-0.7, 4.9, -2.3) con pitch ~6,6° — los +37,4°
//    de los comentarios viejos son de la escala anterior). El primer intento
//    (y=1330) daba NDC y=1,63: fuera del cuadro por arriba. El puesto final
//    (535, 715, -1500) cae en NDC ≈ (0.55, 0.75): cielo limpio, a la derecha
//    de la caída, por encima del filo (cresta ≈ NDC 0.43) y lejos de los
//    chips de los mundos.
//  · Ninguna posición del suelo se hornea: luciérnagas y luz del domo se
//    derivan de height()/site, igual que todo lo demás en este valle.
import * as THREE from 'three';
import { height, SITE_X, SITE_Z } from './terrain.js';
// EL SUSURRO NOCTURNO (#108, núcleo puro — ver compai/susurroNocturno.js): al
// entrar la noche el compAI baja la voz y comenta. Sin astronomía propia en
// este valle (cero dependencias, misma regla del núcleo): la fase de luna NO
// se inventa — se pasa null y `susurroDeNoche` cae sola a su rama honesta
// ("ya está oscureciendo… descanse").
import { susurroDeNoche } from './compai/susurroNocturno.js';

/* ── texturas pintadas en canvas (lámina, no foto) ────────────────────────── */

// la luna: disco pintado — borde suave, mares apenas insinuados (low-poly
// Humboldt: mancha de acuarela, no mapa lunar)
function moonTexture(size = 256) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const r = size * 0.42, cx = size / 2, cy = size / 2;
  const g = c.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#fffdf4');
  g.addColorStop(0.55, '#f2f2e6');
  g.addColorStop(0.85, '#d9e0ea');
  g.addColorStop(1, 'rgba(200,210,228,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  // mares: cuatro manchas frías, deterministas, apenas presentes
  const mares = [
    [0.18, -0.12, 0.34], [-0.20, 0.10, 0.28], [0.02, 0.26, 0.22], [-0.08, -0.28, 0.18],
  ];
  c.fillStyle = 'rgba(150,166,196,0.22)';
  for (const [mx, my, mr] of mares) {
    c.beginPath(); c.arc(cx + mx * r * 1.6, cy + my * r * 1.6, mr * r, 0, Math.PI * 2); c.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// halo: respiración fría alrededor de la luna (el bloom lo remata)
function haloTexture(size = 128) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(220,230,250,0.9)');
  g.addColorStop(0.3, 'rgba(190,205,235,0.32)');
  g.addColorStop(1, 'rgba(160,180,220,0)');
  c.fillStyle = g; c.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ── el CIELO de la noche: domo con gradiente azul profundo ─────────────────
      El Sky de three.js no sabe de noche: con el sol a −22° o −28° deja el
      MISMO residuo marrón de scattering (medido: capturas v2 y v3 idénticas).
      Así que la noche trae su propio cielo — un domo BackSide con gradiente
      cenit→horizonte (BOTW: azul profundo, nunca negro plano) y un
      resplandor frío alrededor de la luna. Se FUNDE encima del Sky con el
      mismo factor k de todo lo demás: la transición sigue siendo una sola.
      renderOrder −2: el domo se pinta ANTES que estrellas/luna/bruma (el
      sort por distancia lo pondría de último — su centro está en el origen,
      al lado de la cámara — y taparía las estrellas). */
function makeCieloNoche(lunaPos) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uK: { value: 0 },
      uLunaDir: { value: lunaPos.clone().normalize() },
      uCenit: { value: new THREE.Color(0x050a17) },
      uHorizonte: { value: new THREE.Color(0x1c2c50) },
      uLunaGlow: { value: new THREE.Color(0x8fa8d8) },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uK;
      uniform vec3 uLunaDir, uCenit, uHorizonte, uLunaGlow;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        // el azul respira cerca del horizonte y se apaga hacia el cenit
        vec3 c = mix(uHorizonte, uCenit, pow(h, 0.6));
        // resplandor frío alrededor de la luna (amplio + núcleo)
        float d = max(dot(normalize(vDir), uLunaDir), 0.0);
        c += uLunaGlow * (pow(d, 90.0) * 0.35 + pow(d, 14.0) * 0.10);
        gl_FragColor = vec4(c, uK);
      }`,
    side: THREE.BackSide, transparent: true, depthWrite: false,
  });
  const domo = new THREE.Mesh(new THREE.SphereGeometry(4800, 32, 16), mat);
  domo.renderOrder = -2;
  domo.frustumCulled = false;
  return { domo, mat };
}

/* ── estrellas: puntos sobre el domo del cielo, con titileo por fase ────────
      Un solo draw call. depthTest QUEDA activo: la montaña las tapa — el
      skyline nocturno se lee en silueta contra el campo de estrellas. */
function makeEstrellas() {
  const N = 1500, R = 4200;
  const pos = [], col = [], size = [], phase = [];
  let s = 20260730;                                    // determinista (el gate)
  const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  // la vía láctea: banda inclinada — un tercio de las estrellas se APRIETA
  // hacia un círculo mayor (chicas y densas = mancha lechosa, no dibujo)
  const nBanda = new THREE.Vector3(0.62, 0.35, -0.70).normalize();
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    // dirección uniforme del casquete superior (elevación mínima ~3°)
    const y = 0.05 + rng() * 0.95;
    const a = rng() * Math.PI * 2, rr = Math.sqrt(1 - y * y);
    v.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
    const enBanda = i % 3 === 0;
    if (enBanda) {
      const d = v.dot(nBanda);
      v.addScaledVector(nBanda, -d * (0.86 + rng() * 0.1)).normalize();
      if (v.y < 0.05) v.y = 0.05 + rng() * 0.1;
      v.normalize();
    }
    pos.push(v.x * R, v.y * R, v.z * R);
    // paleta: blanco-azul casi siempre, unas pocas tibias (Betelgeuse) y frías
    const p = rng();
    if (p < 0.06) c.set(0xffd9ae);        // gigante tibia
    else if (p < 0.16) c.set(0xaec6ff);   // azulada
    else c.set(0xe8eefb).offsetHSL(0, 0, (rng() - 0.5) * 0.12);
    col.push(c.r, c.g, c.b);
    // tamaño: casi todas chicas; las de banda MÁS chicas (mancha, no puntos)
    const brillante = !enBanda && rng() < 0.06;
    size.push(enBanda ? 1.1 + rng() * 1.0 : brillante ? 3.6 + rng() * 1.8 : 1.5 + rng() * 1.5);
    phase.push(rng() * Math.PI * 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 0 } },
    vertexShader: /* glsl */`
      uniform float uT;
      attribute vec3 aCol; attribute float aSize; attribute float aPhase;
      varying vec3 vCol; varying float vTw;
      void main() {
        vCol = aCol;
        // titileo: cada estrella respira a su ritmo (fase propia)
        vTw = 0.72 + 0.28 * sin(uT * (0.7 + fract(aPhase) * 1.8) + aPhase * 37.0);
        gl_PointSize = aSize * (0.85 + 0.3 * vTw);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uK;
      varying vec3 vCol; varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.08, d) * vTw * uK;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vCol, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;      // el domo rodea todo: que no lo descarte nunca
  return { pts, mat };
}

/* ── luciérnagas (cocuyos) sobre la pradera del sitio ───────────────────────
      Pocas (26), derivando despacio, con pulso de encendido propio. El vuelo
      vive en el vertex shader (cero JS por frame). Un draw call. */
function makeLuciernagas() {
  const N = 34;
  const pos = [], seed = [];
  let s = 158; const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (let i = 0; i < N; i++) {
    // la pradera de los portales y la falda hacia el corral: alrededor del
    // sitio real, a ras de pasto (height() del DEM — nada horneado)
    const x = SITE_X - 130 + rng() * 190;
    const z = SITE_Z - 110 + rng() * 190;
    pos.push(x, height(x, z) + 0.7 + rng() * 2.4, z);
    seed.push(rng() * Math.PI * 2, 0.35 + rng() * 0.5, 2.5 + rng() * 4.0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 0 } },
    vertexShader: /* glsl */`
      uniform float uT;
      attribute vec3 aSeed;    // fase, velocidad, radio de deriva
      varying float vPulso;
      void main() {
        vec3 p = position;
        float f = aSeed.x, w = aSeed.y, r = aSeed.z;
        p.x += sin(uT * w + f) * r;
        p.z += cos(uT * w * 0.8 + f * 2.0) * r;
        p.y += sin(uT * w * 1.7 + f * 3.0) * 0.8;
        // pulso: encendida un rato, apagada otro (potencia = destello corto)
        vPulso = pow(0.5 + 0.5 * sin(uT * (0.6 + w) + f * 11.0), 3.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(240.0 / -mv.z, 2.0, 9.0) * (2.2 + 2.2 * vPulso);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uK;
      varying float vPulso;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * (0.12 + 0.88 * vPulso) * uK;
        if (a < 0.015) discard;
        gl_FragColor = vec4(0.85, 0.95, 0.45, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, mat);
  return { pts, mat };
}

/* ── estrella fugaz: una raya que cruza y muere (Zelda BOTW) ────────────────
      Una THREE.Line de dos puntos (cabeza + cola) que recorre un arco alto
      del cielo en ~1,1 s, cada 18-34 s de noche plena. La línea se orienta
      sola con sus endpoints — cero matemática de pantalla. El primer disparo
      espera 16 s: los cuadros del gate (9 s) quedan deterministas. */
function makeFugaz() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xdfe9ff, transparent: true, opacity: 0, fog: false,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const line = new THREE.Line(g, mat);
  line.frustumCulled = false;
  const st = { activa: false, t0: 0, prox: 16, p0: new THREE.Vector3(), dir: new THREE.Vector3() };
  const R = 3900, DUR = 1.1, LARGO = 260;
  function lanzar(t) {
    // nace alto (elev 35-70°), azimut libre; cae inclinada hacia el horizonte
    const el = THREE.MathUtils.degToRad(35 + Math.random() * 35);
    const az = Math.random() * Math.PI * 2;
    st.p0.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(R);
    st.dir.set((Math.random() - 0.5), -(0.5 + Math.random() * 0.4), (Math.random() - 0.5)).normalize();
    st.t0 = t; st.activa = true;
  }
  function update(t, k) {
    if (k < 0.9) { mat.opacity = 0; st.prox = t + 16; return; }
    if (!st.activa && t >= st.prox) lanzar(t);
    if (!st.activa) return;
    const f = (t - st.t0) / DUR;
    if (f >= 1) { st.activa = false; mat.opacity = 0; st.prox = t + 18 + Math.random() * 16; return; }
    const cab = st.p0.clone().addScaledVector(st.dir, f * 900);
    const pos = g.attributes.position.array;
    pos[0] = cab.x; pos[1] = cab.y; pos[2] = cab.z;
    pos[3] = cab.x - st.dir.x * LARGO; pos[4] = cab.y - st.dir.y * LARGO; pos[5] = cab.z - st.dir.z * LARGO;
    g.attributes.position.needsUpdate = true;
    mat.opacity = Math.sin(f * Math.PI) * 0.85 * k;
  }
  return { line, update };
}

/* ── el módulo ──────────────────────────────────────────────────────────── */
export function makeNoche({ scene, renderer, atmos, falls, terrainG, site, camMode, compai }) {
  document.body.dataset.hora = 'noche';
  const H = atmos.noche;                 // los mandos que atmosphere.js expone
  const lerp = THREE.MathUtils.lerp;

  /* ── catálogo de diales: valor de DÍA medido al arrancar, valor de NOCHE
        declarado aquí. aplicar(e) interpola TODOS con el mismo factor. ── */

  // exposición y niebla de la escena
  const expoDia = renderer.toneMappingExposure;            // 1.38
  const EXPO_NOCHE = 0.86;
  const fogDia = scene.fog.color.clone();
  const FOG_NOCHE = new THREE.Color(0x0a101f);
  const fogDensDia = scene.fog.density;

  // el cielo: el sol BAJA. phi se mide desde el cenit (90−elevación).
  const su = H.sky.material.uniforms;
  const PHI_DIA = THREE.MathUtils.degToRad(90 - 6.5);
  // sol a −28°: con −16 el cielo quedaba MARRÓN de crepúsculo (captura v1) y
  // con −22 aún quedaba un resto tibio (v2); más abajo + menos turbidez =
  // azul-negro limpio donde viven las estrellas
  const PHI_NOCHE = THREE.MathUtils.degToRad(90 + 28);
  const THETA = THREE.MathUtils.degToRad(14);
  const mieDia = su.mieCoefficient.value;
  const turbDia = su.turbidity.value;

  // luces del día → noche: el sol se apaga, el hemisferio se enfría
  const dirDia = atmos.dir.intensity;
  const hemiDia = {
    i: H.hemi.intensity, sky: H.hemi.color.clone(), gnd: H.hemi.groundColor.clone(),
  };
  const HEMI_NOCHE = {
    i: 0.34, sky: new THREE.Color(0x24344f), gnd: new THREE.Color(0x0a0d12),
  };
  const warmDia = H.warmFill.intensity;

  // sprites del amanecer + pájaros: duermen
  const soles = H.soles.map((sp) => ({ sp, o: sp.material.opacity }));
  const pajaros = H.birds.map((b) => ({ b, o: b.material.opacity }));

  // el telón de nube y las cartas de bruma: la noche despeja ARRIBA (cielo de
  // estrellas) y deja la bruma BAJA del cañón CON LUZ DE LUNA — más clara que
  // la montaña que la rodea (BOTW: la niebla nocturna brilla, no ensucia)
  const cwallDia = H.cwall.material.opacity;
  const TINT_ALTA = new THREE.Color(0x2e3a55);     // lo poco que quede arriba
  const TINT_BAJA = new THREE.Color(0x93a3c6);     // plata lunar en el cañón
  const brumas = H.mists.map((m) => ({
    m,
    o: m.userData.base.o,
    col: m.material.color.clone(),
    alta: m.position.y > 430,            // techo de nube vs bruma del cañón
  }));

  // el agua bajo la luna: plata, no blanco de mediodía
  const AGUA_TINT = new THREE.Color(0x9fb4d8);
  const aguas = (falls.mats || [])
    .filter((mt) => mt.uniforms && mt.uniforms.uBright && mt.uniforms.uTint)
    .map((mt) => ({ mt, b: mt.uniforms.uBright.value, t: mt.uniforms.uTint.value.clone() }));

  // siluetas lejanas del terreno (MeshBasic con fog): de día son claras y
  // frías; de noche son montaña contra el cielo — apenas más oscuras que él
  const SIL_TINT = new THREE.Color(0x111a30);
  const siluetas = [];
  terrainG.traverse((o) => {
    if (o.isMesh && o.material && o.material.isMeshBasicMaterial) {
      siluetas.push({ mat: o.material, col: o.material.color.clone() });
    }
  });

  /* ── lo que la noche SUMA ── */
  const grupo = new THREE.Group();
  grupo.visible = false;
  scene.add(grupo);

  // la luna sobre el farallón (elevación ~41° desde el ojo del domo: dentro
  // de la franja de cielo del cuadro oficial — ver el grounding de arriba)
  const luna = new THREE.Sprite(new THREE.SpriteMaterial({
    map: moonTexture(), transparent: true, opacity: 0, fog: false, depthWrite: false,
  }));
  luna.position.set(535, 715, -1500);
  luna.scale.setScalar(150);
  grupo.add(luna);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloTexture(), transparent: true, opacity: 0, fog: false,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  halo.position.copy(luna.position);
  halo.scale.setScalar(500);
  grupo.add(halo);

  // luz de luna: fría, alta, desde el lado de la luna — la LLAVE de la
  // fotografía nocturna (Nolan): modela crestas con plata y deja que las
  // espaldas caigan a azul profundo. Intensidad medida contra captura: con
  // 0.62 el valle quedaba mudo; 1.05 dibuja sin volver el día gris.
  const luzLuna = new THREE.DirectionalLight(0xbcd0f5, 0);
  luzLuna.position.copy(luna.position).multiplyScalar(1.6);
  grupo.add(luzLuna);

  // el cielo propio de la noche (el Sky no sabe de noche — ver makeCieloNoche)
  const cielo = makeCieloNoche(luna.position);
  grupo.add(cielo.domo);
  const fugaz = makeFugaz();
  grupo.add(fugaz.line);

  // el domo encendido: alguien vive aquí (las ventanas ya son emisivas en
  // structures.js; esta PointLight las hace bañar la terraza)
  const luzDomo = new THREE.PointLight(0xffb367, 0, 80, 1.8);
  luzDomo.position.set(site.domoPos.x, site.terrazaY + 3, site.domoPos.z);
  grupo.add(luzDomo);

  const estrellas = makeEstrellas();
  grupo.add(estrellas.pts);
  const cocuyos = makeLuciernagas();
  grupo.add(cocuyos.pts);

  /* ── el botón ☀️/🌙: la vuelta al día con la MISMA transición ── */
  const css = document.createElement('style');
  css.textContent = `
#horaBtn { position: fixed; right: 14px; bottom: 14px; z-index: 30; border: 0;
  border-radius: 999px; cursor: pointer; padding: 8px 14px;
  font: 600 0.78rem/1 system-ui, -apple-system, sans-serif; color: #e8ecf6;
  background: rgba(14, 18, 30, 0.6); backdrop-filter: blur(3px); }
#horaBtn:hover { background: rgba(24, 30, 48, 0.75); }`;
  document.head.appendChild(css);
  const btn = document.createElement('button');
  btn.id = 'horaBtn'; btn.type = 'button';
  document.body.appendChild(btn);

  /* ── EL SUSURRO: un comentario al ENTRAR la noche, no en loop ────────────
        `compai.decir()` es la burbuja de portales.js (misma voz de siempre).
        Sin compai (host sin guía montada) esto es un no-op — la noche sigue
        andando igual, solo que muda. */
  let susurrado = false;
  function susurrar() {
    if (susurrado || !compai || typeof compai.decir !== 'function') return;
    susurrado = true;
    const s = susurroDeNoche({ fase: null, reaccionClima: null });
    if (s && s.mensaje) compai.decir(s.mensaje);
  }

  /* ── el driver: un solo factor, su propio rAF (cero líneas en el loop de
        main.js — anti-tangle). Con `?cam=` arranca YA de noche: los cuadros
        del gate son deterministas, el crepúsculo no se cronometra. ── */
  const DUR_S = 8;
  let k = camMode ? 1 : 0;
  let objetivo = 1;
  let last = performance.now();

  function rotular() {
    btn.textContent = objetivo === 1 ? '☀️ Ver de día' : '🌙 Ver de noche';
  }
  rotular();
  if (objetivo === 1) susurrar();     // arranca de noche (?hora=noche): susurra ya
  btn.addEventListener('click', () => {
    objetivo = objetivo === 1 ? 0 : 1;
    rotular();
    if (objetivo === 1) susurrar();   // vuelve a la noche con el botón: susurra otra vez
  });

  function aplicar(e, t) {
    grupo.visible = e > 0.001;
    renderer.toneMappingExposure = lerp(expoDia, EXPO_NOCHE, e);
    scene.fog.color.lerpColors(fogDia, FOG_NOCHE, e);
    scene.fog.density = lerp(fogDensDia, fogDensDia * 0.85, e);

    // el sol se pone (y con él, el brillo mie del atardecer)
    atmos.sun.setFromSphericalCoords(1, lerp(PHI_DIA, PHI_NOCHE, e), THETA);
    su.sunPosition.value.copy(atmos.sun);
    su.mieCoefficient.value = lerp(mieDia, 0.004, e);
    su.turbidity.value = lerp(turbDia, 2.2, e);

    atmos.dir.intensity = lerp(dirDia, 0, e);
    H.hemi.intensity = lerp(hemiDia.i, HEMI_NOCHE.i, e);
    H.hemi.color.lerpColors(hemiDia.sky, HEMI_NOCHE.sky, e);
    H.hemi.groundColor.lerpColors(hemiDia.gnd, HEMI_NOCHE.gnd, e);
    H.warmFill.intensity = lerp(warmDia, 0.06, e);

    for (const { sp, o } of soles) sp.material.opacity = o * (1 - e);
    for (const { b, o } of pajaros) b.material.opacity = o * (1 - e);
    H.cwall.material.opacity = lerp(cwallDia, 0, e);

    for (const br of brumas) {
      // la bruma BAJA casi no pierde cuerpo (0.8): plateada por la luna es
      // protagonista de la noche (v4 la dejaba invisible — el cañón en negro)
      const fac = br.alta ? 0.06 : 0.8;
      const o = br.o * lerp(1, fac, e);
      br.m.userData.base.o = o;          // las que SUBEN recalculan de aquí
      if (br.m.userData.base.still) br.m.material.opacity = o;
      br.m.material.color.lerpColors(br.col, br.alta ? TINT_ALTA : TINT_BAJA, e * 0.85);
    }

    for (const ag of aguas) {
      // 0.72: la caída ATRAPA la luna (con 0.6 se perdía contra la pared)
      ag.mt.uniforms.uBright.value = ag.b * lerp(1, 0.72, e);
      ag.mt.uniforms.uTint.value.lerpColors(ag.t, AGUA_TINT, e * 0.55);
    }
    for (const si of siluetas) si.mat.color.lerpColors(si.col, SIL_TINT, e * 0.85);

    // lo nuevo enciende con la noche
    luna.material.opacity = e;
    halo.material.opacity = 0.3 * e;
    luzLuna.intensity = 1.05 * e;
    luzDomo.intensity = 20 * e;
    cielo.mat.uniforms.uK.value = e;
    estrellas.mat.uniforms.uK.value = e;
    estrellas.mat.uniforms.uT.value = t;
    cocuyos.mat.uniforms.uK.value = e;
    cocuyos.mat.uniforms.uT.value = t;
    fugaz.update(t, e);
    // el domo del cielo gira apenas (la noche está viva, no congelada)
    estrellas.pts.rotation.y = t * 0.0025;
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (k !== objetivo) {
      const paso = dt / DUR_S;
      k = objetivo > k ? Math.min(k + paso, 1) : Math.max(k - paso, 0);
    }
    const e = k * k * k * (k * (k * 6 - 15) + 10);      // smootherstep
    aplicar(e, now / 1000);
    requestAnimationFrame(tick);
  }
  aplicar(camMode ? 1 : 0, 0);
  requestAnimationFrame(tick);

  return { factor: () => k };
}
