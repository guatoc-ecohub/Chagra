// ── fx.js — partículas de derrape, turbo y aterrizaje ───────────────────────
// Dos grupos de puntos con shader propio (tamaño y alpha por partícula):
//  · "chispas": blending aditivo — derrape (blanco→naranja) y turbo (color).
//  · "polvo":  blending normal — aterrizaje y rastro en el pasto.
// El main le pasa el estado de la física; aquí solo se emite y se integra.
import * as THREE from 'three';

const VERT = /* glsl */`
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (260.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

function shaderFrag(aditivo) {
  return /* glsl */`
    precision mediump float;
    uniform float uTime;
    varying float vAlpha;
    varying vec3 vColor;
    void main() {
      vec2 d = gl_PointCoord - 0.5;
      float r = length(d);
      float soft = smoothstep(0.5, 0.08, r);
      float pulso = 0.85 + 0.15 * sin(uTime * 9.0 + r * 8.0);
      gl_FragColor = vec4(vColor, vAlpha * soft * pulso);
      if (gl_FragColor.a < 0.02) discard;
    }
  `;
}

function crearPool(THREE, maxN, aditivo) {
  const pos = new Float32Array(maxN * 3);
  const col = new Float32Array(maxN * 3);
  const size = new Float32Array(maxN);
  const alpha = new Float32Array(maxN);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: shaderFrag(aditivo),
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  const pool = {
    pts, pos, col, size, alpha, maxN, n: 0, mat, geo,
    parts: [], // {x,y,z,vx,vy,vz,life,max,size,r,g,b,a}
  };
  for (let i = 0; i < maxN; i++) {
    pool.parts.push({ x: 0, y: -500, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 10, r: 1, g: 1, b: 1, a: 1 });
    col[i * 3] = 1; col[i * 3 + 1] = 1; col[i * 3 + 2] = 1;
  }
  geo.setDrawRange(0, 0);
  return pool;
}

function emitir(pool, x, y, z, n, fn) {
  for (let i = 0; i < n; i++) {
    const p = pool.parts[pool.n];
    pool.n = (pool.n + 1) % pool.maxN;
    fn(p);
    p.x = x; p.y = y; p.z = z;
  }
}

export function crearFx(THREE, cfg = {}) {
  const escena = cfg.escena;
  const max = cfg.max ?? 420;
  const chispas = crearPool(THREE, max, true);
  const polvo = crearPool(THREE, 130, false);
  escena.add(chispas.pts);
  escena.add(polvo.pts);

  const _c = new THREE.Color();
  let tAcc = 0;
  let emisorDerrape = 0;
  let emisorTurbo = 0;

  function emitirDerrape(s) {
    emisorDerrape -= 0.008;
    if (emisorDerrape > 0) return;
    emisorDerrape = 0.03;
    // ruedas traseras, lado opuesto al patín
    const h = s.velHdg ?? s.hdg;
    const dir = s.drift.dir;
    const ladoX = Math.cos(h + Math.PI / 2), ladoZ = Math.sin(h + Math.PI / 2);
    const trasX = Math.cos(h + Math.PI), trasZ = Math.sin(h + Math.PI);
    for (let k = 0; k < 2; k++) {
      const x = s.x + ladoX * (-dir * 0.9) + trasX * 1.1 + (Math.random() - 0.5) * 0.3;
      const z = s.z + ladoZ * (-dir * 0.9) + trasZ * 1.1 + (Math.random() - 0.5) * 0.3;
      emitir(chispas, x, s.y + 0.15, z, 1, (p) => {
        p.vx = trasX * (4 + Math.random() * 5) + (Math.random() - 0.5) * 3 + ladoX * dir * 2;
        p.vy = 1 + Math.random() * 2;
        p.vz = trasZ * (4 + Math.random() * 5) + (Math.random() - 0.5) * 3 + ladoZ * dir * 2;
        p.max = p.life = 0.28 + Math.random() * 0.25;
        p.size = 7 + Math.random() * 9;
        _c.setHSL(0.08 + Math.random() * 0.05, 1, 0.55 + Math.random() * 0.35);
        p.r = _c.r; p.g = _c.g; p.b = _c.b;
        p.a = 0.95;
      });
    }
  }

  function emitirTurbo(s) {
    emisorTurbo -= 0.012;
    if (emisorTurbo > 0) return;
    emisorTurbo = 0.035;
    const h = s.velHdg ?? s.hdg;
    const trasX = Math.cos(h + Math.PI), trasZ = Math.sin(h + Math.PI);
    const color = s.turbo.color;
    for (let k = 0; k < 3; k++) {
      const x = s.x + trasX * 1.2 + (Math.random() - 0.5) * 0.7;
      const z = s.z + trasZ * 1.2 + (Math.random() - 0.5) * 0.7;
      emitir(chispas, x, s.y + 0.2, z, 1, (p) => {
        p.vx = trasX * (9 + Math.random() * 8);
        p.vy = 0.5 + Math.random() * 1.5;
        p.vz = trasZ * (9 + Math.random() * 8);
        p.max = p.life = 0.35 + Math.random() * 0.3;
        p.size = 12 + Math.random() * 14;
        _c.setHex(color).lerp(new THREE.Color(1, 1, 1), 0.35);
        p.r = _c.r; p.g = _c.g; p.b = _c.b;
        p.a = 1;
      });
    }
  }

  function emitirAterrizaje(s) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const rr = 0.3 + Math.random() * 0.6;
      emitir(polvo, s.x + Math.cos(a) * rr, s.y + 0.06, s.z + Math.sin(a) * rr, 1, (p) => {
        p.vx = Math.cos(a) * (1.2 + Math.random() * 2.4);
        p.vy = 0.6 + Math.random() * 1.6;
        p.vz = Math.sin(a) * (1.2 + Math.random() * 2.4);
        p.max = p.life = 0.5 + Math.random() * 0.4;
        p.size = 22 + Math.random() * 20;
        p.r = 0.82; p.g = 0.74; p.b = 0.62;
        p.a = 0.5;
      });
    }
  }

  // Salida: humo de goma desde las dos ruedas traseras. Se reutiliza el pool
  // normal para que el burnout sea una masa suave, no una lluvia de chispas.
  function emitirBurnout(s) {
    const h = s.velHdg ?? s.hdg;
    const ladoX = Math.cos(h + Math.PI / 2), ladoZ = Math.sin(h + Math.PI / 2);
    const trasX = Math.cos(h + Math.PI), trasZ = Math.sin(h + Math.PI);
    for (let k = 0; k < 2; k++) {
      const lado = k ? 1 : -1;
      const x = s.x + trasX * 0.8 + ladoX * lado * 0.82 + (Math.random() - 0.5) * 0.16;
      const z = s.z + trasZ * 0.8 + ladoZ * lado * 0.82 + (Math.random() - 0.5) * 0.16;
      emitir(polvo, x, s.y + 0.3, z, 1, (p) => {
        p.vx = trasX * (0.4 + Math.random() * 1.4) + ladoX * (Math.random() - 0.5) * 1.0;
        p.vy = 1.0 + Math.random() * 1.8;
        p.vz = trasZ * (0.4 + Math.random() * 1.4) + ladoZ * (Math.random() - 0.5) * 1.0;
        p.max = p.life = 0.72 + Math.random() * 0.42;
        p.size = 12 + Math.random() * 11;
        const gris = 0.045 + Math.random() * 0.055;
        p.r = gris; p.g = gris * 0.98; p.b = gris * 0.92;
        p.a = 0.82;
      });
    }
  }

  function escribirPools(dt) {
    // chispas
    for (let i = 0; i < chispas.maxN; i++) {
      const p = chispas.parts[i];
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.vy -= 1.6 * dt;
      }
      const activo = p.life > 0;
      chispas.pos[i * 3] = activo ? p.x : -500;
      chispas.pos[i * 3 + 1] = activo ? p.y : -500;
      chispas.pos[i * 3 + 2] = activo ? p.z : -500;
      chispas.col[i * 3] = p.r; chispas.col[i * 3 + 1] = p.g; chispas.col[i * 3 + 2] = p.b;
      const fade = activo ? Math.min(1, p.life / p.max) : 0;
      chispas.size[i] = activo ? p.size * (0.4 + 0.6 * fade) : 0;
      chispas.alpha[i] = activo ? p.a * fade : 0;
    }
    for (let i = 0; i < polvo.maxN; i++) {
      const p = polvo.parts[i];
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.vy -= 4.5 * dt;
      }
      const activo = p.life > 0;
      polvo.pos[i * 3] = activo ? p.x : -500;
      polvo.pos[i * 3 + 1] = activo ? p.y : -500;
      polvo.pos[i * 3 + 2] = activo ? p.z : -500;
      polvo.col[i * 3] = p.r; polvo.col[i * 3 + 1] = p.g; polvo.col[i * 3 + 2] = p.b;
      const fade = activo ? Math.min(1, p.life / p.max) : 0;
      polvo.size[i] = activo ? p.size * (0.5 + 0.5 * fade) : 0;
      polvo.alpha[i] = activo ? p.a * fade : 0;
    }
    chispas.geo.attributes.position.needsUpdate = true;
    chispas.geo.attributes.aColor.needsUpdate = true;
    chispas.geo.attributes.aSize.needsUpdate = true;
    chispas.geo.attributes.aAlpha.needsUpdate = true;
    polvo.geo.attributes.position.needsUpdate = true;
    polvo.geo.attributes.aColor.needsUpdate = true;
    polvo.geo.attributes.aSize.needsUpdate = true;
    polvo.geo.attributes.aAlpha.needsUpdate = true;
    chispas.geo.setDrawRange(0, chispas.maxN);
    polvo.geo.setDrawRange(0, polvo.maxN);
  }

  let ultDerrape = false;
  function actualizar(dt, s) {
    tAcc += dt;
    chispas.mat.uniforms.uTime.value = tAcc;
    polvo.mat.uniforms.uTime.value = tAcc;

    if (s.drift.act) emitirDerrape(s);
    else if (ultDerrape) {
      // al soltar derrape con turbo: ráfaga de chispas
      for (let i = 0; i < 10; i++) emitirTurbo(s);
    }
    if (s.turbo) emitirTurbo(s);
    if (s.aterrizo) emitirAterrizaje(s);
    ultDerrape = s.drift.act;

    escribirPools(dt);
  }

  function burst(tipo, x, y, z, color = 0xffffff) {
    const usarPolvo = tipo === 'item' || tipo === 'baba' || tipo === 'babas' || tipo === 'esporas';
    const pool = usarPolvo ? polvo : chispas;
    const remolino = tipo === 'remolino';
    const n = tipo === 'noche' ? 36 : tipo === 'esporas' ? 28 : remolino ? 32 : 18;
    const radio = tipo === 'noche' ? 2.4 : tipo === 'esporas' ? 1.8 : remolino ? 2.0 : 1.2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = 0.18 + Math.random() * 0.7;
      emitir(pool, x + Math.cos(a) * rr, y + Math.random() * 0.6, z + Math.sin(a) * rr, 1, (p) => {
        p.vx = remolino
          ? -Math.sin(a) * (radio + Math.random() * radio) + Math.cos(a) * 0.7
          : Math.cos(a) * (radio + Math.random() * radio);
        p.vy = 0.4 + Math.random() * (tipo === 'noche' ? 0.6 : 1.6);
        p.vz = remolino
          ? Math.cos(a) * (radio + Math.random() * radio) + Math.sin(a) * 0.7
          : Math.sin(a) * (radio + Math.random() * radio);
        p.max = p.life = remolino ? 0.75 + Math.random() * 0.4 : 0.35 + Math.random() * 0.55;
        p.size = (tipo === 'esporas' ? 10 : tipo === 'babas' ? 1.1 : remolino ? 8 : 7) + Math.random() * (tipo === 'babas' ? 1.4 : 10);
        _c.setHex(tipo === 'babas' ? 0x5d9b55 : color)
          .lerp(new THREE.Color(1, 1, 1), tipo === 'esporas' || tipo === 'babas' ? 0.04 : 0.45);
        p.r = _c.r; p.g = _c.g; p.b = _c.b;
        p.a = tipo === 'noche' ? 0.45 : tipo === 'babas' ? 0.72 : 0.85;
      });
    }
  }

  // chapuzón: el kart cae en una poza de La Chorrera — abanico de agua blanca
  // alto y espumoso (el polvo tierra del aterrizaje normal no cuenta la caída
  // al agua). Reusa el pool de polvo con gotas grandes frías.
  function chapuzon(s) {
    for (let k = 0; k < 26; k++) {
      const a = (k / 26) * Math.PI * 2;
      const rr = 0.4 + Math.random() * 1.1;
      emitir(polvo, s.x + Math.cos(a) * rr, s.y + 0.1, s.z + Math.sin(a) * rr, 1, (p) => {
        p.vx = Math.cos(a) * (1.8 + Math.random() * 3.2);
        p.vy = 2.2 + Math.random() * 3.4;
        p.vz = Math.sin(a) * (1.8 + Math.random() * 3.2);
        p.max = p.life = 0.55 + Math.random() * 0.5;
        p.size = 26 + Math.random() * 26;
        p.r = 0.88; p.g = 0.96; p.b = 0.97;
        p.a = 0.66;
      });
    }
  }

  return { actualizar, chispas, polvo, burst, burnout: emitirBurnout, chapuzon };
}
