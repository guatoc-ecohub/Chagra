// ── colision.js — choques kart-contra-kart con impulsos de cuerpo rígido ─────
// Puro (sin THREE, sin DOM, sin performance.now): testeable en node y
// DETERMINISTA, que es lo que permite resolverlo solo en el host y que los dos
// jugadores vean exactamente lo mismo.
//
// Por qué NO un motor de física (Rapier y compañía):
//   El choque de karts es un problema 2D de un puñado de cajas orientadas sobre
//   un plano. La parte "real" —SAT para el eje de impacto y el impulso
//   j = -(1+e)·v_rel·n / (1/m₁+1/m₂)— son cuarenta líneas exactas. Un motor
//   rígido, en cambio, se querría adueñar de la integración: `fisica.js` no
//   guarda un vector de velocidad sino `vel` escalar sobre `velHdg`, con
//   agarre, derrape, resorte lateral y feed-forward de curvatura ajustados a
//   mano. Meterle Rapier debajo no sería extender esa física: sería tirarla.
//   Y de paso perderíamos el determinismo bit a bit y el test en node.
//
// La regla que manda sobre todo lo demás: EL CONTROL NO SE PIERDE. Nunca hay
// trompo, ni bloqueo de entrada, ni frames de castigo. El golpe cambia dónde
// estás y a qué velocidad vas; jamás quién maneja. Ver `separarImpulso()`.

// ── colisionadores por vehículo (media-largo × media-ancho, en metros) ───────
// Tuneados para el JUEGO, no calcados de la geometría: van un pelo por dentro
// del modelo para que los carros se rocen visualmente antes de separarse (un
// colisionador exacto se siente a "campo de fuerza"). `dev/qa-colision.mjs`
// los contrasta contra el Box3 real y avisa si algún modelo se aleja mucho.
export const FORMAS = {
  chiva: { hl: 2.40, hw: 1.02 },
  moto: { hl: 1.05, hw: 0.44 },
  pickup: { hl: 1.80, hw: 0.94 },
  volqueta: { hl: 2.30, hw: 1.12 },
  suv: { hl: 1.92, hw: 0.96 },
  coupe: { hl: 1.88, hw: 0.90 },
  carretilla: { hl: 1.00, hw: 0.56 },
  skate: { hl: 0.64, hw: 0.30 },
};
const FORMA_DEF = { hl: 1.7, hw: 0.9 };

export function formaDe(veh) {
  const f = FORMAS[veh?.id] ?? FORMA_DEF;
  const k = veh?.tamano ?? 1;
  return { hl: f.hl * k, hw: f.hw * k };
}

// ── constantes de sensación ─────────────────────────────────────────────────
export const AJUSTE = {
  restitucion: 0.42,     // rebote: ni bola de billar (1) ni plastilina (0)
  friccion: 0.34,        // roce tangencial — el que raspa velocidad al rozar
  correccion: 0.62,      // fracción de la penetración que se corrige por frame
  holgura: 0.02,         // penetración tolerada (evita jitter en contacto)
  empujeMax: 15,         // tope del empuje lateral (m/s)
  yawMax: 0.34,          // torcida máxima de un golpe (rad) — acotada a propósito
  vnRoce: 2.2,           // por debajo de esto el impacto es ROCE, no topetazo
  vnFuerte: 11,          // por encima, golpe de lleno
};

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// ── SAT 2D entre dos cajas orientadas ───────────────────────────────────────
// Devuelve el eje de MENOR penetración, que es el que decide hacia dónde salís.
// Con círculos la normal sería siempre centro-a-centro y una chiva pegándole al
// costado de una moto te mandaría en diagonal: mal leído. Con SAT, pegarle al
// flanco empuja de costado y pegarle atrás empuja hacia adelante.
export function sat(a, b) {
  const ca = Math.cos(a.hdg), sa = Math.sin(a.hdg);
  const cb = Math.cos(b.hdg), sb = Math.sin(b.hdg);
  const dx = b.x - a.x, dz = b.z - a.z;

  // descarte barato por radio circunscrito antes de gastar el SAT
  const ra0 = Math.hypot(a.hl, a.hw), rb0 = Math.hypot(b.hl, b.hw);
  if (dx * dx + dz * dz > (ra0 + rb0) * (ra0 + rb0)) return null;

  const ejes = [[ca, sa], [-sa, ca], [cb, sb], [-sb, cb]];
  let ov = Infinity, nx = 0, nz = 0;
  for (let i = 0; i < 4; i++) {
    const ax = ejes[i][0], az = ejes[i][1];
    const ra = a.hl * Math.abs(ca * ax + sa * az) + a.hw * Math.abs(-sa * ax + ca * az);
    const rb = b.hl * Math.abs(cb * ax + sb * az) + b.hw * Math.abs(-sb * ax + cb * az);
    const d = dx * ax + dz * az;
    const o = ra + rb - Math.abs(d);
    if (o <= 0) return null; // eje separador: no hay choque
    if (o < ov) { ov = o; const s = d < 0 ? -1 : 1; nx = ax * s; nz = az * s; }
  }
  return { nx, nz, ov }; // n apunta de a → b
}

// ── un par: impulso normal + fricción tangencial + separación posicional ────
// `cuerpo` = { id, x, z, hdg, vx, vz, masa, hl, hw, estatico? }
export function resolverPar(a, b, aj = AJUSTE) {
  const hit = sat(a, b);
  if (!hit) return null;
  const { nx, nz, ov } = hit;

  const invA = a.estatico ? 0 : 1 / a.masa;
  const invB = b.estatico ? 0 : 1 / b.masa;
  const invSum = invA + invB;
  if (invSum <= 0) return null;

  // velocidad relativa proyectada en la normal: ESTO es lo que distingue un
  // roce de un topetazo, y sale gratis de la matemática (no hay caso especial).
  const rvx = b.vx - a.vx, rvz = b.vz - a.vz;
  const vn = rvx * nx + rvz * nz;

  // separación posicional siempre (aunque ya se estén separando): sin esto dos
  // karts trabados se quedan uno dentro del otro.
  const pen = Math.max(0, ov - aj.holgura) * aj.correccion;
  const pa = pen * (invA / invSum), pb = pen * (invB / invSum);
  a.dx = (a.dx || 0) - nx * pa; a.dz = (a.dz || 0) - nz * pa;
  b.dx = (b.dx || 0) + nx * pb; b.dz = (b.dz || 0) + nz * pb;

  if (vn > 0) return { nx, nz, ov, vn: 0, j: 0, roce: true, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };

  const j = -(1 + aj.restitucion) * vn / invSum;
  a.vx -= j * invA * nx; a.vz -= j * invA * nz;
  b.vx += j * invB * nx; b.vz += j * invB * nz;

  // fricción tangencial (Coulomb, acotada por el impulso normal): el raspón
  // que come velocidad cuando venís pegado al costado de otro.
  const tx = -nz, tz = nx;
  const vt = rvx * tx + rvz * tz;
  const jtMax = aj.friccion * Math.abs(j);
  const jt = clamp(-vt / invSum, -jtMax, jtMax);
  a.vx -= jt * invA * tx; a.vz -= jt * invA * tz;
  b.vx += jt * invB * tx; b.vz += jt * invB * tz;

  // brazo de palanca: cuán descentrado pegó, en el eje largo del que recibe.
  // Sirve para el yaw (te tuerce) y para saber si fue de morro o de flanco.
  const brazoA = ((b.x - a.x) * -Math.sin(a.hdg) + (b.z - a.z) * Math.cos(a.hdg)) / Math.max(0.3, a.hl);
  const brazoB = ((a.x - b.x) * -Math.sin(b.hdg) + (a.z - b.z) * Math.cos(b.hdg)) / Math.max(0.3, b.hl);

  return {
    nx, nz, ov, vn: -vn, j, jt,
    roce: -vn < aj.vnRoce,
    brazoA: clamp(brazoA, -1, 1),
    brazoB: clamp(brazoB, -1, 1),
    x: (a.x + b.x) / 2,
    z: (a.z + b.z) / 2,
    y: ((a.y ?? 0) + (b.y ?? 0)) / 2,
  };
}

// ── resolver todos los pares de la lista ────────────────────────────────────
// Guarda el desplazamiento posicional en a.dx/a.dz para que el llamador lo
// aplique DESPUÉS (así el orden de los pares no sesga la separación).
export function resolverTodos(cuerpos, aj = AJUSTE) {
  for (const c of cuerpos) { c.dx = 0; c.dz = 0; }
  const eventos = [];
  for (let i = 0; i < cuerpos.length; i++) {
    for (let k = i + 1; k < cuerpos.length; k++) {
      const a = cuerpos[i], b = cuerpos[k];
      if (a.estatico && b.estatico) continue;
      // los karts en el aire no chocan con los de abajo (saltos por encima)
      if (Math.abs((a.y ?? 0) - (b.y ?? 0)) > 1.6) continue;
      const ev = resolverPar(a, b, aj);
      if (ev) { ev.a = a; ev.b = b; eventos.push(ev); }
    }
  }
  for (const c of cuerpos) {
    if (c.estatico) continue;
    c.x += c.dx; c.z += c.dz;
  }
  return eventos;
}

// ── traducir el impulso a las coordenadas de fisica.js SIN romper el control ─
// `fisica.js` no tiene vector velocidad: tiene `vel` escalar sobre `velHdg`.
// La tentación es recomponer vel=|v| y velHdg=atan2(v) tras el impulso — y ahí
// justo se pierde el juego: un golpe de flanco te rota el vector 60°, el kart
// sale volando de costado y la dirección pelea contra la física medio segundo.
// Eso no es "sentir el golpe", es impotencia.
//
// En cambio partimos el Δv en el marco del propio kart:
//   · componente LONGITUDINAL → entra a `vel`, pero con el signo bloqueado: un
//     topetazo de frente te deja casi parado, nunca en reversa.
//   · componente LATERAL → NO toca `vel` ni `velHdg`; va a `empuje`, un vector
//     de mundo aparte que decae solo y solo mueve la POSICIÓN. Te barren de
//     costado mientras seguís manejando con el volante intacto.
// El resultado: el golpe se siente entero y la dirección responde el frame
// siguiente. La exageración de que "te destrozaron" es trabajo del VFX.
export function aplicarImpulsoAKart(s, vxAntes, vzAntes, vxDesp, vzDesp, ev, esA, aj = AJUSTE) {
  const dvx = vxDesp - vxAntes, dvz = vzDesp - vzAntes;
  if (!Number.isFinite(dvx) || !Number.isFinite(dvz)) return 0;

  const fx = Math.cos(s.hdg), fz = Math.sin(s.hdg);
  const dLong = dvx * fx + dvz * fz;
  const dLat = dvx * -fz + dvz * fx;

  // longitudinal: nunca invierte la marcha
  const vAntes = s.vel;
  s.vel += dLong;
  if (vAntes > 0.5) s.vel = Math.max(s.vel, vAntes * 0.14);
  else if (vAntes < -0.5) s.vel = Math.min(s.vel, vAntes * 0.14);

  // lateral: empuje de mundo que decae (la dirección no se entera)
  s.empuje = s.empuje || { x: 0, z: 0 };
  s.empuje.x += -fz * dLat;
  s.empuje.z += fx * dLat;
  const m = Math.hypot(s.empuje.x, s.empuje.z);
  if (m > aj.empujeMax) { s.empuje.x *= aj.empujeMax / m; s.empuje.z *= aj.empujeMax / m; }

  // torcida impulsiva y ACOTADA: el golpe descentrado te desalinea una vez, y
  // el realineo que ya tiene fisica.js más tu volante lo corrigen enseguida.
  const brazo = esA ? (ev.brazoA ?? 0) : (ev.brazoB ?? 0);
  const fuerza = clamp(ev.vn / aj.vnFuerte, 0, 1);
  const yaw = clamp(-brazo * fuerza * aj.yawMax, -aj.yawMax, aj.yawMax);
  s.hdg += yaw;
  s.velHdg += yaw * 0.5;

  // magnitud normalizada del golpe: la moneda con la que se paga el VFX
  const mag = clamp(ev.vn / aj.vnFuerte, 0, 1.35);
  if (mag > (s.golpe?.mag ?? 0) || !s.golpe || s.golpe.t <= 0) {
    s.golpe = {
      t: 0.5, mag, nx: ev.nx * (esA ? 1 : -1), nz: ev.nz * (esA ? 1 : -1),
      x: ev.x, z: ev.z, y: ev.y ?? s.y, roce: ev.roce, yaw, nuevo: true,
    };
  }
  s.susto = Math.max(s.susto ?? 0, ev.roce ? mag * 0.35 : Math.min(1, 0.45 + mag * 0.8));
  return mag;
}

// ── integración del empuje y decaimiento de los rastros del golpe ───────────
// La llama `fisica.js` en cada step. Separada para que el módulo puro sea el
// único dueño de la sensación del choque.
export function integrarEmpuje(s, dt) {
  if (!s.empuje) { s.empuje = { x: 0, z: 0 }; return; }
  const e = s.empuje;
  if (e.x || e.z) {
    s.x += e.x * dt;
    s.z += e.z * dt;
    const k = Math.exp(-3.4 * dt); // ≈0.2 s de vida útil: se siente y se va
    e.x *= k; e.z *= k;
    if (Math.abs(e.x) < 0.01) e.x = 0;
    if (Math.abs(e.z) < 0.01) e.z = 0;
  }
  if (s.susto > 0) s.susto = Math.max(0, s.susto - dt * 1.15);
  if (s.golpe && s.golpe.t > 0) {
    s.golpe.t -= dt;
    if (s.golpe.t <= 0) s.golpe = null;
  }
}
