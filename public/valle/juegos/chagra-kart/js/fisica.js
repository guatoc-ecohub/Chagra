// ── fisica.js — física arcade de kart (estilo Mario Kart) ────────────────────
// Pura (sin THREE, sin DOM): recibe la pista construida y el vehículo de la
// tabla. Testeable en node con la pista real. Maneja:
//   · acelerar / frenar / reversa
//   · dirección con peso (a más velocidad, más giro, con agarre)
//   · derrape con carga de mini-turbo (3 niveles)
//   · salto con física balística y control aéreo mínimo
//   · fuera de pista: pasto que frena y Ent Frailejón que rescata al checkpoint
//   · conteo de vueltas por progreso acumulado (soporta reversa)
//   · choques contra otros karts: el impulso lo calcula `colision.js` y aquí
//     solo se integra el EMPUJE lateral que deja, que es un vector aparte para
//     que un golpe nunca le toque el volante al jugador (ver colision.js).
import { TURBO_NIVELES, nivelTurboDeCarga } from './vehiculos.js';
import { integrarEmpuje } from './colision.js';

const GRAV = 9.8;
const SALTO_VY = 6.8;          // ≈1.4 s de aire
const PASTO_FRICCION = 1.7;    // multiplicador de frenado en pasto
const LENTEJA = 1e-6;
export const RESCATE_FUERA_DE_PISTA = 0.72;
export const ATONTADO_RESCATE = 2.1;
// La devolución del Ent tiene que leerse como una patada, no como un
// teletransporte: un pequeño pop y empuje hacia adelante bastan para que el
// carro salga disparado sin alterar el umbral de rescate.
const PATADA_VY = 5.4;
const PATADA_VEL = 8.5;
const PATADA_VEL_FRAC = 0.32;

// La carrera usa la misma tabla de vehículos para el menú, la física y la IA.
// Este factor sube el ritmo sin mutar la tabla compartida: así los valores base
// siguen siendo una referencia auditable y los tres participantes reciben el
// mismo escalado.
export const VELOCIDAD_ESCALA = 1.5;
export const REBUFO_TECHO = 0.16;

export function escalarVehiculoCarrera(veh, factor = VELOCIDAD_ESCALA) {
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return {
    ...veh,
    velMax: veh.velMax * f,
    acel: veh.acel * f,
    freno: veh.freno * f,
    reversa: veh.reversa * Math.min(f, 1.35),
    // A más velocidad, la respuesta debe llegar antes. No se escala 1:1:
    // hacerlo volvería nerviosos a los vehículos livianos.
    giroMax: veh.giroMax * (1 + (f - 1) * 0.24),
  };
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// ── atenuación de velocidad POR SEGUNDO, no por cuadro ──────────────────────
// Un multiplicador aplicado en cada frame no es una frenada: es una
// exponencial en los FPS. `vel *= 0.76` una vez por cuadro son 0,76⁶⁰ ≈ 4e-9 en
// un segundo a 60 Hz — el kart queda clavado en 2 km/h — y además castiga MÁS a
// la máquina rápida que a la lenta, que es lo contrario de lo que uno quiere.
// Con `tasa^dt` el resultado es el mismo a 30, 60 o 144 Hz: `tasa` es la
// fracción de velocidad que SOBREVIVE a un segundo de efecto.
// El piso de 0.10 existe porque el control no se pierde: ni el poder más duro
// puede dejar el kart en cero.
export const TASA_MIN = 0.10;
export function atenuarPorSegundo(vel, tasa, dt) {
  if (!(tasa < 1) || !Number.isFinite(tasa)) return vel;
  return vel * Math.pow(clamp(tasa, TASA_MIN, 1), Math.max(0, dt));
}
function wrapA(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
// diferencia envuelta de fracción de vuelta, en (-0.5, 0.5]
function wrapFrac(d) {
  while (d > 0.5) d -= 1;
  while (d <= -0.5) d += 1;
  return d;
}

function dentroDePista(info) {
  return !!info && Math.abs(info.lat) <= info.w + 1.0;
}

function barrerBorde(pista, inicio, x0, z0, x1, z1) {
  const fin = pista.infoLocal(x1, z1);
  if (!dentroDePista(inicio) || dentroDePista(fin)) return { bloqueado: false, info: fin };

  let lo = 0, hi = 1;
  for (let i = 0; i < 12; i++) {
    const t = (lo + hi) * 0.5;
    const info = pista.infoLocal(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
    if (dentroDePista(info)) lo = t;
    else hi = t;
  }
  // Dejar un pequeño margen dentro de la valla evita que el siguiente frame
  // vuelva a encontrar exactamente el mismo contacto por redondeo.
  const t = Math.max(0, lo - 0.006);
  const x = x0 + (x1 - x0) * t;
  const z = z0 + (z1 - z0) * t;
  return { bloqueado: true, x, z, info: pista.infoLocal(x, z) };
}

export function crearFisica(pista, veh, opts = {}) {
  const totalLaps = opts.totalLaps ?? 3;
  const f0 = opts.f0 ?? 0.0; // línea de salida
  const esSkate = veh.id === 'skate';

    // posición inicial: centro de la pista en f0
    const salida = pista.puntoEn(f0);

    const s = {
    // estado de posición/velocidad
    x: salida.x, z: salida.z, y: pista.alturaMundo(salida.x, salida.z),
    hdg: salida.hdg, velHdg: salida.hdg, vel: 0, vy: 0, onGround: true, roll: 0, pitch: 0,
    vehId: veh.id,

    // derrape
    drift: { act: false, carga: 0, dir: 0, nivel: 0 },

    // fuera de pista / rescate
    offroad: { t: 0 },
    atontado: 0,
    tambaleo: 0,
    rescateSeq: 0,
    rescate: false,
    rescateOrigen: null,
    rescateDestino: null,

    // turbo activo
    turbo: null,
    _turboVisual: null,

    // rebufo: el main entrega solo la geometría (detrás de un rival). La carga
    // vive aquí para que sea continua con dt y el empuje no sea un teletransporte.
    rebufo: { activo: false, carga: 0, fuerza: 0, rivalId: null },

    // choques: empuje lateral de mundo (decae solo, NO pasa por el volante),
    // susto del piloto y el último golpe recibido (lo leen el main y el VFX)
    empuje: { x: 0, z: 0 },
    susto: 0,
    golpe: null,

    // vueltas
    totalLaps, laps: 0, acum: 0, lastF: f0, fMax: 0,
    tiempo: 0, tVuelta: 0, fin: false,

    // checkpoint (el punto de mayor avance alcanzado en pista)
    fCheck: f0, chkX: salida.x, chkZ: salida.z, chkHdg: salida.hdg,

    // info local más reciente (para cámara, fx, entorno)
    info: null,

    // flags de eventos (el main los lee y los limpia)
    aterrizo: false, respawn: false, vueltaCompletada: false, termino: false,

    // latches de borde
    _saltoLatch: false,
  };

  function rescatar() {
    const origen = { x: s.x, y: s.y, z: s.z };
    const cx = s.chkX, cz = s.chkZ;
    const info = pista.infoLocal(cx, cz);
    s.x = cx; s.z = cz;
    s.hdg = info ? info.hdg : s.chkHdg;
    s.velHdg = s.hdg;
    s.y = pista.alturaMundo(cx, cz);
    s.info = info;
    s.vel = Math.min(PATADA_VEL, veh.velMax * PATADA_VEL_FRAC);
    s.vy = PATADA_VY; s.onGround = false;
    s.drift.act = false; s.drift.carga = 0; s.drift.nivel = 0; s.turbo = null;
    s.rebufo.activo = false; s.rebufo.carga = 0; s.rebufo.fuerza = 0; s.rebufo.rivalId = null;
    s.offroad.t = 0;
    s.atontado = ATONTADO_RESCATE;
    s.tambaleo = 0;
    s.empuje.x = 0; s.empuje.z = 0; s.susto = 0; s.golpe = null;
    s.lastF = info ? info.f : s.fCheck; // el respawn NO suma progreso falso
    s.respawn = true;
    s.rescate = true;
    s.rescateSeq += 1;
    s.rescateOrigen = origen;
    s.rescateDestino = { x: s.x, y: s.y, z: s.z, hdg: s.hdg };
  }

  s.step = function (dt, e) {
    // entrada defensiva: los llamadores pueden pasar undefined (teclas sin
    // pulsar) y un NaN aquí contamina TODO el estado del kart
    e = e || {};
    s._turboVisual = null;
    e = {
      gas: !!e.gas, freno: !!e.freno,
      izq: !!e.izq, der: !!e.der,
      derrapar: !!e.derrapar, saltar: !!e.saltar,
      giro: Number.isFinite(e.giro) ? e.giro : null,
      rebufo: e.rebufo && e.rebufo.activo ? e.rebufo : null,
    };
    s.rescate = false;
    s.atontado = Math.max(0, s.atontado - dt);
    let local = pista.infoLocal(s.x, s.z);
    s.info = local;

    const controlMul = s.atontado > 0 ? 0.35 : 1;
    const girarBase = Number.isFinite(e.giro)
      ? clamp(e.giro, -1, 1)
      : (e.izq - e.der); // positivo = girar a la izquierda del carro
    const girar = girarBase * controlMul;
    const velAbs = Math.abs(s.vel);
    let enPista = Math.abs(local.lat) <= local.w + 1.0;
    let fuera = !enPista;

    // El rebufo se corta al salir del cono. La carga necesita un segundo para
    // llegar al máximo, de modo que seguir pegado atrás es una decisión de línea.
    if (e.rebufo) {
      s.rebufo.activo = true;
      s.rebufo.rivalId = e.rebufo.rivalId ?? null;
      s.rebufo.carga = clamp((s.rebufo.carga ?? 0) + dt, 0, 1);
      s.rebufo.fuerza = clamp((s.rebufo.carga - 0.12) / 0.88, 0, 1);
    } else {
      s.rebufo.activo = false;
      s.rebufo.carga = 0;
      s.rebufo.fuerza = 0;
      s.rebufo.rivalId = null;
    }

    // ── dirección ────────────────────────────────────────────────────────────
    let yaw = 0, dVolante = 0, dRuta = 0, dResorte = 0;
    const ref = veh.velMax * 0.55;
    if (s.onGround) {
      // 0) feed-forward de curvatura: el carro "lee" la carretera y gira con ella
      //    a la velocidad justa (ω = κ·v). Sin esto, en curva constante el carro
      //    bien alineado no recibe ningún yaw y se sale — subviraje clásico.
      const cur = pista.CUR[local.indice] ?? 0;
      dRuta = cur * velAbs * 0.72 * (fuera ? 0.25 : 1);
      yaw += dRuta;
      // 1) volante con peso: el giro crece con la velocidad (con tope)
      const kSpeed = clamp(velAbs / ref, 0, 1.15);
      if (s.drift.act) {
        // derrapando: la carrocería gira fuerte con la dirección fijada (el
        // "patín" visual), pero el vector de velocidad sigue la pista con un
        // sesgo leve — sin esto el derrape corta el ápice y se sale en curva
        // estrecha (la pista no tiene los ess anchos de Mario Kart).
        dVolante = s.drift.dir * veh.giroMax * 0.45 * kSpeed * veh.agarre;
        yaw += dVolante;
      } else {
        dVolante = girar * veh.giroMax * kSpeed * veh.agarre * (fuera ? 0.45 : 1);
        yaw += dVolante;
        // 2) realineo fino con la pista (pequeño, corrige desalineo inicial)
        yaw += wrapA(local.hdg - s.hdg) * 0.30 * (fuera ? 0.25 : 1);
        // 3) resorte lateral: si vamos descarriados en pista, volver al centro.
        //    VERIFICADO: lat>0 = a la DERECHA del sentido de marcha → girar a
        //    la izquierda (yaw negativo) para volver. Por eso el signo `-latN`.
        if (enPista) {
          const latN = clamp(local.lat / (local.w * 0.6), -1, 1);
          dResorte = -latN * 0.35 * clamp(velAbs / 8, 0, 1);
          yaw += dResorte;
        }
      }
    } else {
      // aire: solo un poco de balanceo, el resto se congela
      yaw = girar * veh.giroMax * 0.18;
      dVolante = yaw;
    }
    s.hdg = wrapA(s.hdg + yaw * dt);
    // vector de velocidad: sin derrape sigue a la carrocería (sin patinaje);
    // derrapando, la carrocería rota más fuerte y el vector de velocidad va a
    // la zaga (ángulo de patinaje s.slip) siguiendo la pista.
    let yawV;
    if (s.drift.act && s.onGround) {
      const kDrift = clamp(velAbs / ref, 0, 1.15);
      yawV = dRuta + s.drift.dir * veh.giroMax * 0.18 * kDrift * veh.agarre;
    } else {
      yawV = yaw;
    }
    if (s.drift.act && s.onGround) {
      // El derrape es la única excepción: durante él el vector de avance puede
      // quedar cruzado respecto de la carrocería. Fuera de ese estado no
      // conservamos un `velHdg` viejo (por ejemplo, de un choque o del último
      // derrape), porque eso hace que el kart siga avanzando de costado aunque
      // el volante ya esté recto.
      s.velHdg = wrapA(s.velHdg + yawV * dt);
    } else if (s.onGround) {
      s.velHdg = s.hdg;
    } else {
      s.velHdg = wrapA(s.velHdg + yawV * dt);
    }
    s.slip = wrapA(s.hdg - s.velHdg);
    s._yaw = { dVolante, dRuta, dResorte, total: yaw, girar, izq: e.izq, der: e.der };

    // ── velocidad ────────────────────────────────────────────────────────────
    const vAnt = s.vel;
    if (e.gas && !e.freno) {
      s.vel += veh.acel * dt * (fuera ? (esSkate ? 0.28 : 0.55) : 1)
        * (s.atontado > 0 ? 0.48 : 1);
    } else if (e.freno && !e.gas) {
      if (s.vel > 0.25) {
        s.vel -= veh.freno * dt;
      } else if (s.vel < -0.25) {
        s.vel += veh.freno * dt; // freno también frena la reversa
      } else {
        s.vel = 0;
        s.vel -= veh.reversa * dt * 0.6; // reversa
        if (s.vel < -veh.reversa) s.vel = -veh.reversa;
      }
    } else {
      // rodar: fricción de pista o pasto
      const fric = fuera ? PASTO_FRICCION : 1.35;
      if (s.vel > 0) s.vel = Math.max(0, s.vel - fric * dt);
      else if (s.vel < 0) s.vel = Math.min(0, s.vel + fric * dt);
    }
    if (fuera) s.vel *= Math.max(0, 1 - (esSkate ? 4.5 : 1.4) * dt); // el pasto pega
    // tope de velocidad DURO (techo clásico de kart): con turbo se sube el techo.
    // Un "arrastre" suave no alcanza: la aceleración (10 m/s²) lo pisa (1.8 m/s²).
    let tope = veh.velMax * (1 + (s.rebufo?.fuerza ?? 0) * REBUFO_TECHO);
    if (s.rebufo?.fuerza > 0) {
      // Empuje progresivo: incluso con el limitador alzado hay que construir
      // velocidad, no aparecer instantáneamente en +16 %.
      s.vel += veh.acel * 0.32 * s.rebufo.fuerza * dt * (e.gas ? 1 : 0.35);
    }
    if (s.turbo) {
      tope = veh.velMax * s.turbo.velMul;
      s.vel += veh.acel * s.turbo.acelMul * dt * (e.gas ? 1 : 0.55);
    }
    if (s.vel > tope) s.vel = tope;
    if (s.vel < -veh.reversa) s.vel = -veh.reversa;

    // ── integrar posición (a lo largo del vector de velocidad, no la carrocería) ─
    const xAntes = s.x, zAntes = s.z;
    s.x += Math.cos(s.velHdg) * s.vel * dt;
    s.z += Math.sin(s.velHdg) * s.vel * dt;

    // empuje del choque: mueve la POSICIÓN y nada más. No entra a `vel` ni a
    // `velHdg`, así que el modelo de dirección de arriba ni se enteró de que
    // te chocaron: seguís girando con autoridad completa mientras te barren.
    integrarEmpuje(s, dt);

    // Barrido del segmento completo contra el borde de pista. A 48 m/s un
    // muestreo único puede saltar más de una valla en un frame; la búsqueda
    // binaria encuentra el último punto válido entre la posición anterior y la
    // actual y frena contra la tangente, no después de quedar fuera.
    if (enPista) {
      const barrera = barrerBorde(pista, local, xAntes, zAntes, s.x, s.z);
      if (barrera.bloqueado) {
        s.x = barrera.x;
        s.z = barrera.z;
        const signo = s.vel < 0 ? -1 : 1;
        s.vel = Math.max(0, Math.abs(s.vel) * 0.72) * signo;
        s.velHdg = barrera.info.hdg;
        s.hdg = wrapA(s.hdg + wrapA(barrera.info.hdg - s.hdg) * 0.35);
        local = barrera.info;
        enPista = true;
        fuera = false;
      } else {
        local = barrera.info;
        enPista = Math.abs(local.lat) <= local.w + 1.0;
        fuera = !enPista;
      }
    }

    // ── salto / gravedad ──────────────────────────────────────────────────────
    const ground = pista.alturaMundo(s.x, s.z);
    if (s.onGround) {
      s.y = ground; s.vy = 0;
      if (e.saltar && !s._saltoLatch) {
        s.vy = SALTO_VY;
        s.onGround = false;
      }
    } else {
      s.y += s.vy * dt;
      s.vy -= GRAV * dt;
      if (s.y <= ground) {
        s.y = ground; s.onGround = true; s.vy = 0;
        if (vAnt > 2) s.aterrizo = true;
      }
    }
    s._saltoLatch = !!e.saltar;

    // ── derrape + mini-turbo ──────────────────────────────────────────────────
    const velMin = veh.velMax * 0.35;
    const girandoFuerte = Math.abs(girar) > 0.45;
    const sosteniendo = s.onGround && enPista && e.derrapar && velAbs > velMin && Math.abs(girar) > 0.2;
    if (s.drift.act) {
      if (!sosteniendo) {
        // suelto el derrape → el patín se "rompe" y el carro se alinea, turbo si
        // alcanzó nivel
        const nivel = s.drift.nivel;
        s.drift.act = false;
        s.drift.carga = 0;
        s.drift.nivel = 0;
        s.velHdg = s.hdg; // fin del patinaje
        if (nivel >= 1) {
          // `nivelTurboDeCarga` devuelve 0..2; el arreglo es azul, naranja,
          // morado en índices 0..2. El índice directo se saltaba el azul y
          // dejaba `undefined` al llegar al tercer nivel.
          const cfg = TURBO_NIVELES[nivel - 1];
          s.turbo = {
            t: cfg.dur, dur: cfg.dur, mul: cfg.velMul,
            acelMul: cfg.acelMul, nivel, color: cfg.color,
          };
        } else {
          // fx.js emite una ráfaga al soltar cualquier derrape y espera un
          // color de turbo. Es una señal visual de salida, no un turbo jugable.
          s._turboVisual = { color: 0xffffff };
        }
      } else {
        // derrape sostenido: la dirección quedó fijada al activarse
        s.drift.carga = Math.min(1, s.drift.carga + veh.derrape * dt * 0.55);
        s.drift.nivel = nivelTurboDeCarga(s.drift.carga);
        s.vel += 0.9 * dt; // el derrape plana y mantiene velocidad
      }
    } else if (sosteniendo && girandoFuerte) {
      s.drift.act = true;
      s.drift.carga = 0;
      s.drift.nivel = 0;
      s.drift.dir = Math.sign(girar);
    }

    // ── turbo: decaer ─────────────────────────────────────────────────────────
    if (s.turbo) {
      s.turbo.t -= dt;
      if (s.turbo.t <= 0) s.turbo = null;
    }

    // ── checkpoint (el punto de mayor avance en pista) ────────────────────────
    if (enPista) {
      const f = local.f;
      if (f > s.fMax + 0.0005) {
        s.fMax = f;
        s.fCheck = f;
        s.chkX = s.x; s.chkZ = s.z; s.chkHdg = s.hdg;
      }
    }

    // ── vueltas por progreso acumulado ────────────────────────────────────────
    const df = wrapFrac(local.f - s.lastF);
    s.acum += df;
    s.lastF = local.f;
    if (s.acum >= 1) {
      s.acum -= 1;
      s.laps++;
      s.fMax = 0;
      s.tVuelta = s.tiempo;
      s.vueltaCompletada = true;
    }
    if (s.laps >= s.totalLaps && !s.fin) {
      s.fin = true;
      s.termino = true;
    }
    s.tiempo += dt;

    // ── fuera de pista / Lakitu (al final: el respawn no debe contaminar el
    //    conteo de vueltas de este frame — lastF ya quedó sincronizado arriba)
    if (fuera) {
      s.offroad.t += dt;
      if (s.offroad.t > RESCATE_FUERA_DE_PISTA) rescatar();
    } else {
      s.offroad.t = 0;
    }
    if (s.y < -20) rescatar(); // se cayó por un hueco

    // ── inclinaciones para el modelo (banco + giro + derrape) ─────────────────
    const turnTilt = -girar * clamp(velAbs / 10, 0, 1) * 0.20;
    const driftTilt = s.drift.act ? -s.drift.dir * 0.45 : 0;
    s.tambaleo = s.atontado > 0
      ? Math.sin((s.tiempo + dt) * 18) * 0.22 * Math.min(1, s.atontado / ATONTADO_RESCATE)
      : 0;
    s.roll = (local.banco ?? 0) + turnTilt + driftTilt + s.tambaleo;
    const acelDif = s.vel - vAnt;
    s.pitch = clamp(-acelDif * 0.012, -0.06, 0.1);
  };

  s.velKmh = () => Math.abs(s.vel) * 3.6;

  return s;
}
