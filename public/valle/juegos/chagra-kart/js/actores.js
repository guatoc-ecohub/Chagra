// ── actores.js — fauna andina + rivales de pista ────────────────────────────
// Reusa la tabla de vehículos y los modelos ya construidos. La fauna se arma
// con geometría simple pero reconocible y reacciona al paso del kart.
import { VEHICULOS } from './vehiculos.js';
import { construirModeloVehiculo } from './modelos.js';
import { crearSacudon } from './fx-toon.js';

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function wrapA(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parte(THREE, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.scale.set(sx, sy, sz);
  return m;
}

function makeAnimalMat(THREE, color, rough = 0.88, metal = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function crearVenado(THREE, i = 0) {
  const g = new THREE.Group();
  const matPelo = makeAnimalMat(THREE, i % 2 ? 0xb48e5b : 0x9f7a4e, 0.96);
  const matClaro = makeAnimalMat(THREE, 0xe8d8bf, 0.95);
  const matAstas = makeAnimalMat(THREE, 0x5e4126, 0.9);
  g.add(parte(THREE, new THREE.SphereGeometry(0.34, 10, 8), matPelo, 0, 0.95, 0, 0.08, 0, 0, 1.55, 0.9, 0.92));
  g.add(parte(THREE, new THREE.SphereGeometry(0.25, 10, 8), matPelo, 0.58, 1.12, 0, 0.05, 0.08, 0, 0.92, 0.9, 0.88));
  g.add(parte(THREE, new THREE.CylinderGeometry(0.09, 0.15, 0.58, 8), matPelo, 0.18, 1.08, 0, 0, 0, 0.18, 1, 1));
  g.add(parte(THREE, new THREE.CylinderGeometry(0.05, 0.07, 0.4, 6), matClaro, 0.78, 1.02, 0, 0, 0, 0.9, 1, 1));
  for (const [x, z] of [[-0.45, -0.18], [0.35, -0.18], [-0.45, 0.18], [0.35, 0.18]]) {
    g.add(parte(THREE, new THREE.CylinderGeometry(0.055, 0.06, 0.72, 6), matPelo, x, 0.4, z, 0, 0, 0, 1, 1, 1));
  }
  g.add(parte(THREE, new THREE.ConeGeometry(0.05, 0.35, 5), matPelo, -0.55, 0.9, 0.05, 0, 0, -0.4));
  g.add(parte(THREE, new THREE.ConeGeometry(0.05, 0.24, 5), matPelo, -0.56, 0.96, -0.08, 0, 0, 0.15));
  g.add(parte(THREE, new THREE.ConeGeometry(0.04, 0.28, 5), matAstas, 0.68, 1.42, 0.08, 0, 0, -0.2));
  g.add(parte(THREE, new THREE.ConeGeometry(0.04, 0.3, 5), matAstas, 0.72, 1.44, -0.05, 0, 0, 0.35));
  return g;
}

function crearCusumbo(THREE, i = 0) {
  const g = new THREE.Group();
  const mat = makeAnimalMat(THREE, i % 2 ? 0x5a4b39 : 0x43362d, 0.95);
  const matCl = makeAnimalMat(THREE, 0xf2eddc, 0.95);
  g.add(parte(THREE, new THREE.SphereGeometry(0.28, 10, 8), mat, -0.02, 0.55, 0, 0, 0, 0, 1.25, 0.78, 0.78));
  g.add(parte(THREE, new THREE.SphereGeometry(0.18, 10, 8), mat, 0.5, 0.62, 0, 0, 0, 0, 0.9, 0.85, 0.82));
  g.add(parte(THREE, new THREE.CylinderGeometry(0.05, 0.08, 0.4, 6), matCl, 0.72, 0.53, 0, 0, 0, -0.18));
  for (const [x, z] of [[-0.33, -0.14], [0.25, -0.14], [-0.33, 0.14], [0.25, 0.14]]) {
    g.add(parte(THREE, new THREE.CylinderGeometry(0.04, 0.05, 0.42, 6), mat, x, 0.24, z, 0, 0, 0));
  }
  let tail = new THREE.Group();
  tail.position.set(-0.4, 0.62, 0);
  for (let i2 = 0; i2 < 4; i2++) {
    tail.add(parte(THREE, new THREE.CylinderGeometry(0.03, 0.05, 0.26, 5), mat, -0.08 - i2 * 0.08, 0, 0, 0, 0, 0.15 + i2 * 0.08));
  }
  g.add(tail);
  g.add(parte(THREE, new THREE.SphereGeometry(0.08, 8, 6), matCl, 0.76, 0.67, 0.08));
  return g;
}

function crearChivito(THREE, i = 0) {
  const g = new THREE.Group();
  const mat = makeAnimalMat(THREE, i % 2 ? 0xd9c9ab : 0xbfa98f, 0.94);
  const matCl = makeAnimalMat(THREE, 0x7a5635, 0.96);
  g.add(parte(THREE, new THREE.SphereGeometry(0.24, 10, 8), mat, 0, 0.58, 0, 0, 0, 0, 1.35, 0.84, 0.84));
  g.add(parte(THREE, new THREE.SphereGeometry(0.16, 10, 8), mat, 0.44, 0.7, 0, 0, 0, 0, 0.86, 0.8, 0.8));
  g.add(parte(THREE, new THREE.CylinderGeometry(0.04, 0.05, 0.26, 5), matCl, 0.6, 0.64, 0, 0, 0, 0.2));
  g.add(parte(THREE, new THREE.ConeGeometry(0.03, 0.16, 5), matCl, 0.2, 0.88, 0.1, 0, 0, -0.15));
  g.add(parte(THREE, new THREE.ConeGeometry(0.03, 0.16, 5), matCl, 0.2, 0.88, -0.1, 0, 0, 0.15));
  for (const [x, z] of [[-0.28, -0.14], [0.21, -0.14], [-0.28, 0.14], [0.21, 0.14]]) {
    g.add(parte(THREE, new THREE.CylinderGeometry(0.04, 0.045, 0.36, 5), mat, x, 0.18, z, 0, 0, 0));
  }
  g.add(parte(THREE, new THREE.SphereGeometry(0.05, 8, 6), matCl, -0.35, 0.66, 0));
  return g;
}

function crearColibri(THREE, i = 0) {
  const g = new THREE.Group();
  const mat = makeAnimalMat(THREE, i % 2 ? 0x2fa674 : 0x4d8fcd, 0.55, 0.03);
  const matBrillo = makeAnimalMat(THREE, 0xf0f7ff, 0.25, 0.03);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xe5f3ff, roughness: 0.4, metalness: 0.05, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
  g.add(parte(THREE, new THREE.SphereGeometry(0.08, 10, 8), mat, 0, 0.05, 0, 0, 0, 0, 1.2, 0.8, 0.8));
  g.add(parte(THREE, new THREE.ConeGeometry(0.02, 0.22, 5), matBrillo, 0.12, 0.06, 0, 0, 0, -Math.PI / 2));
  const wing = new THREE.PlaneGeometry(0.18, 0.08, 1, 1);
  const wl = new THREE.Mesh(wing, wingMat);
  wl.position.set(-0.03, 0.08, 0.04);
  wl.rotation.y = 0.7;
  const wr = wl.clone();
  wr.position.z = -0.04;
  wr.rotation.y = -0.7;
  g.add(wl, wr);
  return g;
}

function crearMariposa(THREE, i = 0) {
  const g = new THREE.Group();
  const body = makeAnimalMat(THREE, i % 3 === 0 ? 0xf2cd3f : i % 3 === 1 ? 0xd85e86 : 0x7a8de6, 0.7, 0.05);
  const wing = new THREE.MeshStandardMaterial({ color: 0x1f1f26, roughness: 0.8, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  g.add(parte(THREE, new THREE.SphereGeometry(0.03, 8, 6), body, 0, 0.02, 0));
  const wg = new THREE.PlaneGeometry(0.12, 0.08, 1, 1);
  const wl = new THREE.Mesh(wg, wing);
  wl.position.set(-0.02, 0.04, 0.04);
  wl.rotation.y = 0.55;
  const wr = wl.clone();
  wr.position.z = -0.04;
  wr.rotation.y = -0.55;
  g.add(wl, wr);
  return { grupo: g, wings: [wl, wr] };
}

function crearTracker(THREE, anchor, color, estilo = 'moss') {
  const g = new THREE.Group();
  const mat = makeAnimalMat(THREE, color, estilo === 'wet' ? 0.92 : 0.98);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.8, 6), mat);
  trunk.position.y = 0.9;
  g.add(trunk);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 8), mat);
  top.position.y = 1.95;
  top.scale.set(1.1, 0.9, 1.1);
  g.add(top);
  return g;
}

function puntoLateral(pista, i, minOff, maxOff, salto = 6) {
  for (let t = 0; t < 8; t++) {
    const j = (i + Math.floor((Math.random() - 0.5) * salto) + pista.n) % pista.n;
    const off = (minOff + Math.random() * (maxOff - minOff)) * (Math.random() < 0.5 ? 1 : -1);
    const dX = Math.sin(pista.HDG[j]);
    const dZ = -Math.cos(pista.HDG[j]);
    const x = pista.PX[j] + dX * off;
    const z = pista.PZ[j] + dZ * off;
    if (x < pista.x0 + 4 || x > pista.x1 - 4 || z < pista.z0 + 4 || z > pista.z1 - 4) continue;
    const info = pista.infoLocal(x, z);
    if (Math.abs(info.lat) > info.w + 3) return { x, z, y: pista.alturaMundo(x, z), zona: info.zona, hdg: info.hdg };
  }
  return null;
}

export function crearFauna(THREE, pista, cfg = {}) {
  const escena = cfg.escena;
  const grupo = new THREE.Group();
  if (escena) escena.add(grupo);
  const fauna = [];
  const rn = rand(73);

  function agregar(tipo, anchor, mesh, extra = {}) {
    mesh.position.set(anchor.x, anchor.y, anchor.z);
    mesh.rotation.y = extra.rot ?? rn() * Math.PI * 2;
    mesh.scale.setScalar(extra.scale ?? 1);
    grupo.add(mesh);
    fauna.push({
      tipo,
      grupo: mesh,
      anchor: new THREE.Vector3(anchor.x, anchor.y, anchor.z),
      pos: new THREE.Vector3(anchor.x, anchor.y, anchor.z),
      vel: new THREE.Vector3(),
      baseY: anchor.y,
      radius: extra.radius ?? 8,
      fleeRadius: extra.fleeRadius ?? 22,
      speed: extra.speed ?? 4,
      wander: extra.wander ?? 0.4,
      phase: rn() * Math.PI * 2,
      home: extra.home ?? 0,
      wings: extra.wings ?? [],
      legs: extra.legs ?? [],
      tail: extra.tail ?? null,
      bob: extra.bob ?? 0.06,
    });
  }

  // venados en el borde del páramo / transición
  for (let i = 0; i < 3; i++) {
    const pt = puntoLateral(pista, 8 + i * 120, 12, 34, 8);
    if (!pt) continue;
    const mesh = crearVenado(THREE, i);
    agregar('venado', pt, mesh, { scale: 1.25, radius: 10, fleeRadius: 34, speed: 5.6, wander: 0.18 });
  }

  // cusumbos en bosque y niebla
  for (let i = 0; i < 3; i++) {
    const pt = puntoLateral(pista, 70 + i * 180, 10, 24, 10);
    if (!pt) continue;
    const mesh = crearCusumbo(THREE, i);
    agregar('cusumbo', pt, mesh, { scale: 1.15, radius: 7, fleeRadius: 26, speed: 4.6, wander: 0.5 });
  }

  // chivitos de páramo
  for (let i = 0; i < 3; i++) {
    const pt = puntoLateral(pista, 20 + i * 150, 12, 30, 8);
    if (!pt) continue;
    const mesh = crearChivito(THREE, i);
    agregar('chivito', pt, mesh, { scale: 1.2, radius: 8, fleeRadius: 28, speed: 5.0, wander: 0.3 });
  }

  // colibríes cerca de flores y bordes con bromelias
  for (let i = 0; i < 5; i++) {
    const pt = puntoLateral(pista, 18 + i * 120, 8, 20, 6);
    if (!pt) continue;
    const mesh = crearColibri(THREE, i);
    agregar('colibri', pt, mesh, { scale: 0.95, radius: 6, fleeRadius: 20, speed: 8.5, wander: 1.3, bob: 0.14 });
  }

  // mariposas sueltas que dan vida al borde de la pista
  for (let i = 0; i < 12; i++) {
    const pt = puntoLateral(pista, 6 + i * 95, 4, 15, 5);
    if (!pt) continue;
    const m = crearMariposa(THREE, i);
    agregar('mariposa', pt, m.grupo, { scale: 0.9, radius: 4, fleeRadius: 18, speed: 3.2, wander: 1.6, wings: m.wings, bob: 0.12 });
  }

  function actualizar(dt, s) {
    const px = s.x;
    const pz = s.z;
    for (const a of fauna) {
      const dx = a.pos.x - px;
      const dz = a.pos.z - pz;
      const d = Math.hypot(dx, dz) || 1;
      const awayX = dx / d;
      const awayZ = dz / d;
      const flee = d < a.fleeRadius ? 1 - d / a.fleeRadius : 0;

      if (a.tipo === 'colibri' || a.tipo === 'mariposa') {
        const swirl = a.phase + performance.now() * 0.0012;
        const orbitX = Math.cos(swirl) * a.wander;
        const orbitZ = Math.sin(swirl * 1.17) * a.wander;
        const target = new THREE.Vector3(
          a.anchor.x + orbitX * a.radius,
          a.baseY + 0.8 + Math.sin(swirl * 2.3) * a.bob,
          a.anchor.z + orbitZ * a.radius
        );
        if (flee > 0) {
          target.x += awayX * (a.radius * 1.4 + flee * 12);
          target.z += awayZ * (a.radius * 1.4 + flee * 12);
          target.y += flee * 1.3;
        }
        a.pos.lerp(target, 1 - Math.exp(-3.2 * dt));
        a.grupo.position.copy(a.pos);
        const vx = target.x - a.pos.x;
        const vz = target.z - a.pos.z;
        a.grupo.rotation.y = Math.atan2(vz, vx);
        a.grupo.rotation.z = Math.sin(swirl * 20) * 0.28;
        a.grupo.rotation.x = Math.cos(swirl * 16) * 0.12;
        if (a.wings?.length) {
          const flap = Math.sin(swirl * 26) * 0.7 + flee * 0.5;
          a.wings[0].rotation.y = 0.55 + flap;
          a.wings[1].rotation.y = -0.55 - flap;
        }
        continue;
      }

      // fauna de suelo: deambulan alrededor del anclaje y huyen si el kart se acerca
      const orbit = new THREE.Vector3(
        Math.cos(a.phase + performance.now() * 0.0002) * a.radius,
        0,
        Math.sin(a.phase * 1.17 + performance.now() * 0.00022) * a.radius
      );
      const target = new THREE.Vector3(
        a.anchor.x + orbit.x,
        a.baseY,
        a.anchor.z + orbit.z
      );
      if (flee > 0) {
        target.x += awayX * (8 + flee * 26);
        target.z += awayZ * (8 + flee * 26);
      }
      const toTarget = target.clone().sub(a.pos);
      const len = toTarget.length() || 1;
      const move = toTarget.multiplyScalar(1 / len).multiplyScalar(a.speed * (0.45 + flee * 1.8));
      a.vel.lerp(move, 1 - Math.exp(-3.8 * dt));
      a.pos.addScaledVector(a.vel, dt);
      a.pos.y = a.baseY + Math.sin((performance.now() * 0.002 + a.phase) * 2.2) * a.bob;
      a.grupo.position.copy(a.pos);
      a.grupo.rotation.y = Math.atan2(a.vel.z, a.vel.x);
      const paso = Math.min(1, a.vel.length() / (a.speed || 1));
      if (a.tipo === 'venado') {
        a.grupo.rotation.z = Math.sin(performance.now() * 0.012 + a.phase) * 0.02;
        a.grupo.children.forEach((c, idx) => {
          if (c.geometry?.type === 'CylinderGeometry') {
            c.rotation.z = Math.sin(performance.now() * 0.014 + a.phase + idx) * 0.18 * (0.4 + paso);
          }
        });
      } else if (a.tipo === 'cusumbo') {
        a.grupo.rotation.z = Math.sin(performance.now() * 0.014 + a.phase) * 0.03;
      } else if (a.tipo === 'chivito') {
        a.grupo.rotation.z = Math.sin(performance.now() * 0.016 + a.phase) * 0.025;
      }
    }
  }

  return { grupo, fauna, actualizar };
}

export function crearRivales(THREE, pista, cfg = {}) {
  const escena = cfg.escena;
  const grupo = new THREE.Group();
  if (escena) escena.add(grupo);
  const base = [
    { veh: VEHICULOS[4], pilotoId: 'jaguar', poder: 'miedo' },
    { veh: VEHICULOS[2], pilotoId: 'dante', poder: 'babas' },
    { veh: VEHICULOS[1], pilotoId: 'chivito-punk', poder: 'pendiente' },
  ];
  const arr = [];
  const offsets = [0.004, 0.018, 0.035];
  const skills = [0.97, 1.0, 0.92];
  const carriles = [-1.6, 1.0, 0.45];
  const seeds = rand(991);

  base.forEach((cfgVeh, i) => {
    const veh = { ...cfgVeh.veh, piloto: cfgVeh.pilotoId };
    const modelo = construirModeloVehiculo(THREE, veh);
    modelo.grupo.scale.setScalar(1.0 + i * 0.04);
    grupo.add(modelo.grupo);
    arr.push({
      veh,
      pilotoId: cfgVeh.pilotoId,
      poder: cfgVeh.poder,
      modelo,
      f: offsets[i],
      vel: veh.velMax * (0.55 + i * 0.05),
      objetivo: veh.velMax * (0.72 - i * 0.02),
      skill: skills[i],
      phase: seeds() * Math.PI * 2,
      laps: 0,
      total: pista.n,
      cooldown: 4 + i * 1.5,
      efectos: [],
      // choques: los rivales van sobre riel (avanzan por `f`), así que el golpe
      // no les mueve una posición libre sino un DESVÍO lateral respecto de su
      // carril, con resorte de vuelta. Se los ve salir despedidos y volver a
      // buscar la línea, que es justo lo que hace un rival de kart, y la IA de
      // arriba sigue siendo la misma de siempre.
      desvio: 0, desvioV: 0, empujeF: 0, susto: 0, golpe: null,
      masa: cfgVeh.veh.masa ?? 1,
      sac: crearSacudon(),
      // objeto MUTABLE y estable: las estrellitas de mareo se anclan a él y lo
      // siguen mientras orbitan. Si fuera un objeto nuevo por frame, la órbita
      // se quedaría clavada donde ocurrió el golpe.
      pos: { x: 0, y: 0, z: 0 },
      carril: carriles[i] ?? 0,
    });
  });

  function actualizar(dt, s, carrera = null, salida = {}) {
    const salidaBloqueada = !!salida.bloqueada;
    const pf = s.info?.f ?? 0;
    const pv = Math.abs(s.vel);
    for (let i = 0; i < arr.length; i++) {
      const r = arr[i];
      for (let j = r.efectos.length - 1; j >= 0; j--) {
        r.efectos[j].t -= dt;
        if (r.efectos[j].t <= 0) r.efectos.splice(j, 1);
      }
      const idx = Math.floor(r.f * pista.n) % pista.n;
      if (salidaBloqueada) {
        // El grid queda clavado durante 3-2-1 y el burnout. Solo se actualiza
        // la pose para que los karts ya estén visibles en sus cajones.
        const p = pista.puntoEn(r.f);
        const p2 = pista.puntoEn((r.f + 0.002) % 1);
        const hdg = Math.atan2(p2.z - p.z, p2.x - p.x);
        const nx = -Math.sin(hdg);
        const nz = Math.cos(hdg);
        const lado = (carriles[i] ?? 0) + r.desvio;
        const st = {
          x: p.x + nx * lado,
          y: p.y + 0.05,
          z: p.z + nz * lado,
          hdg,
          vel: 0,
          roll: (pista.CUR[idx] ?? 0) * 0.32,
          pitch: 0,
          turbo: null,
          drift: { act: false },
          susto: 0,
          sacudon: r.sac.estado(dt),
          _yaw: { girar: 0 },
        };
        r.estado = st;
        r.pos.x = st.x; r.pos.y = st.y; r.pos.z = st.z;
        r.modelo.actualizar(dt, st);
        r.modelo.grupo.visible = true;
        continue;
      }
      const curva = Math.abs(pista.CUR[idx] ?? 0);
      const zona = pista.ZON[idx] ?? 0;
      const frenadaCurva = clamp(curva * 120, 0, 0.55);
      const frenoZona = zona === 3 ? 0.08 : zona === 0 ? 0.03 : 0;
      const target = r.veh.velMax * (0.82 - frenadaCurva - frenoZona) * r.skill;
      const desired = clamp(target, r.veh.velMax * 0.38, r.veh.velMax * 0.96);
      const accel = desired > r.vel ? r.veh.acel * 0.52 : r.veh.freno * 0.38;
      const dv = clamp(desired - r.vel, -accel * dt, accel * dt);
      r.vel = clamp(r.vel + dv, 3.5, r.veh.velMax * 0.98);
      for (const ef of r.efectos) {
        // Atenuación por segundo: la duración del poder se siente, pero nunca
        // convierte al rival en un kart inmóvil durante varios segundos.
        if (ef.tipo === 'freeze') r.vel *= Math.exp(-5.2 * dt);
        if (ef.tipo === 'miedo') r.vel *= Math.exp(-1.9 * dt);
        if (ef.tipo === 'pegajoso' || ef.tipo === 'larvas') r.vel *= Math.exp(-1.2 * dt);
        if (ef.tipo === 'locura') r.vel *= Math.exp(-1.4 * dt);
        if (ef.tipo === 'remolino') r.vel *= Math.exp(-0.8 * dt);
      }
      if (pv > 0) {
        const gap = ((r.f - pf + 1.5) % 1) - 0.5;
        if (Math.abs(gap) < 0.015 && gap < 0) r.vel = Math.max(r.vel, pv * 1.01);
        if (Math.abs(gap) < 0.02 && gap > 0) r.vel *= 1.012;
      }
      // empuje longitudinal de un choque: se descarga sobre el avance y decae
      if (r.empujeF) {
        r.vel = Math.max(3.0, r.vel + r.empujeF * dt * 6);
        r.empujeF *= Math.exp(-4.2 * dt);
        if (Math.abs(r.empujeF) < 0.02) r.empujeF = 0;
      }
      r.f += (r.vel * dt) / pista.L;
      // mundo chorrera: los rivales también usan la puerta mágica — el tramo
      // del túnel (portalF→salidaF) no se maneja, se salta. Sin esto subirían
      // por dentro de la montaña, y la carrera quedaría desbalanceada contra
      // el jugador que sí salta por el portal.
      const portal = pista.chorreraPortal;
      if (portal && r.f >= portal.f && r.f < portal.f + 0.02) r.f = portal.salidaF;
      if (r.f >= 1) {
        r.f -= 1;
        r.laps++;
      }
      // desvío lateral con resorte amortiguado hacia su carril
      if (r.desvio || r.desvioV) {
        r.desvioV += (-14.0 * r.desvio - 4.6 * r.desvioV) * dt;
        r.desvio += r.desvioV * dt;
        r.desvio = clamp(r.desvio, -6.5, 6.5);
        if (Math.abs(r.desvio) < 0.005 && Math.abs(r.desvioV) < 0.02) { r.desvio = 0; r.desvioV = 0; }
      }
      if (r.susto > 0) r.susto = Math.max(0, r.susto - dt * 1.15);
      if (r.golpe && r.golpe.t > 0) { r.golpe.t -= dt; if (r.golpe.t <= 0) r.golpe = null; }
      const p = pista.puntoEn(r.f);
      const p2 = pista.puntoEn((r.f + 0.002) % 1);
      const hdg = Math.atan2(p2.z - p.z, p2.x - p.x);
      const roll = pista.CUR[idx] * 0.32;
      const side = carriles[i] ?? 0;
      const nx = -Math.sin(hdg);
      const nz = Math.cos(hdg);
      r.cooldown = Math.max(0, r.cooldown - dt);
      const lado = side + r.desvio;
      if (r.efectos.some((ef) => ef.tipo === 'remolino')) {
        // El remolino tira del rival hacia la posición del jugador y le cambia
        // el sentido de carrocería; el efecto es breve y se recupera con el
        // resorte lateral normal de la IA.
        const objetivo = (s.x - p.x) * nx + (s.z - p.z) * nz;
        r.desvioV += clamp(objetivo - lado, -2.8, 2.8) * 7.5 * dt;
        r.susto = Math.max(r.susto, 0.72);
      }
      if (carrera && r.cooldown <= 0) {
        const px = s.x - p.x;
        const pz = s.z - p.z;
        const dist = Math.hypot(px, pz);
        if (r.pilotoId === 'jaguar' && dist < 26) {
          carrera.efectosJugador.push({ tipo: 'miedo', t: 1.6 });
          carrera.eventos.push({ tipo: 'poder', piloto: 'jaguar', en: s.tiempo ?? 0, nombre: 'Paisaje del miedo' });
          r.cooldown = 7.5;
        } else if (r.pilotoId === 'dante' && dist < 20) {
          carrera.efectosJugador.push({ tipo: 'pegajoso', t: 1.3 });
          carrera.hazards?.push({ tipo: 'babas', x: p.x, z: p.z, t: 2.5, r: 3.0 });
          carrera.eventos.push({ tipo: 'poder', piloto: 'dante', en: s.tiempo ?? 0, nombre: 'Las babas' });
          r.cooldown = 6.2;
        }
      }
      const st = {
        x: p.x + nx * lado,
        y: p.y + 0.05,
        z: p.z + nz * lado,
        hdg,
        vel: r.vel,
        // el desvío lo hace inclinarse: sale despedido y se endereza volviendo
        roll: roll + clamp(r.desvioV * 0.06, -0.35, 0.35),
        pitch: 0.02 * Math.sin(performance.now() * 0.001 + r.phase),
        turbo: null,
        drift: { act: false },
        susto: r.susto,
        sacudon: r.sac.estado(dt),
        _yaw: { girar: clamp(-r.desvioV * 0.12, -1, 1) },
      };
      r.estado = st;
      r.pos.x = st.x; r.pos.y = st.y; r.pos.z = st.z;
      r.modelo.actualizar(dt, st);
      if (r.modelo.grupo) {
        r.modelo.grupo.visible = true;
      }
    }
  }

  return { grupo, rivales: arr, actualizar };
}
