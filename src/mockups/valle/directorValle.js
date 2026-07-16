/*
 * directorValle — la LÓGICA PURA de la cámara de director del valle 3D.
 *
 * El acabado cinematográfico del mapa, en tres gestos (DR "Game-feel y cámara
 * director 3D"): PRESENTACIÓN (un barrido establishing alto que muestra el
 * valle vivo — la ladera, la quebrada, los mundos — y ASIENTA con resorte en
 * la pose jugable de siempre), FOLLOW suave del avatar (la cámara se inclina
 * apenas hacia donde vuela, con LEAD de anticipación por su velocidad) y
 * BEATS coreografiados (micro push-in / reencuadres breves cuando un bicho
 * del coro ambiental hace su guiño lejano, cuando aparece el Ent de cameo,
 * cuando llega la alerta del día, o la anticipación focal al entrar a un
 * mundo por el túnel).
 *
 * ES UN MÓDULO SIN REACT NI CANVAS: opera sobre una cámara three y el target
 * de unos OrbitControls que le presta el componente (DirectorValle.jsx). Así
 * se testea entero en jsdom con una PerspectiveCamera real — incluida la
 * garantía dura de que en modo 'fijo' (reduced-motion / tier bajo / flag off)
 * NO SE MUEVE NADA.
 *
 * ── Movimiento (rubber-hose, jamás brusco) ────────────────────────────────
 *  · El barrido viaja por una curva Catmull-Rom con ease-in-out senoidal (la
 *    grúa no rebota) y REMATA con resorte sub-amortiguado (ζ≈0.86): sobrepasa
 *    el encuadre un pelito y se asienta — el settle con overshoot mínimo.
 *  · Follow y beats van como OFFSETS ADITIVOS por delta de frame (el patrón
 *    "respiro" de escenas/CamaraDirector): conviven con CamaraViajera y con
 *    el orbit del usuario sin pelear — nadie es dueño exclusivo del target.
 *  · El damping continuo (follow, envolventes de beat, anticipación focal) usa
 *    `maath/easing` — `damp3` para vectores y `damp` para escalares: suave,
 *    frame-rate independiente y con `delta` acotado (una pestaña dormida no
 *    dispara nada al despertar). El ÚNICO gesto que maath no cubre es el settle
 *    CON OVERSHOOT del establishing (maath es exponencial puro, sin rebote):
 *    ese remate va por un resorte sub-amortiguado semi-implícito hand-rolled,
 *    igual que `escenas/CamaraDirector` y `CamaraDirector` (raíz).
 *
 * ── Respeto (tier + calma) ────────────────────────────────────────────────
 *  · 'cine'   (tier alto): cinematografía completa — barrido + follow + beats.
 *  · 'sobrio' (tier medio): presentación corta sin rebote + follow; sin beats.
 *  · 'fijo'   (tier bajo, prefers-reduced-motion o flag apagado): INERTE
 *    TOTAL — la cámara queda como la dejan el Canvas y CamaraViajera (el
 *    encuadre digno de siempre; cero regresión).
 * Cero alocación por frame: los Vector3 del estado se mutan in-place.
 */
import * as THREE from 'three';
import { damp, damp3 } from 'maath/easing';

/* ── Constantes del director (valores del DR: conservadores y suaves) ────── */

/** Duración del barrido de presentación por modo (s). */
export const PRESENTACION_S = { cine: 6.0, sobrio: 2.6 };
/** Amortiguación del resorte de asentamiento: sub-crítica en cine (overshoot
    rubber-hose mínimo), crítica en sobrio (llega resuelto, sin rebote). */
const ZETA = { cine: 0.86, sobrio: 1 };
/** Frecuencia del resorte de asentamiento (rad/s aprox.). */
const OMEGA_ASIENTA = { cine: 2.1, sobrio: 3.0 };
/** Umbral de asentamiento, relativo a la escala del tramo final. */
const EPSILON = 0.004;
/** Focal mínima de seguridad (mm de film): nada voltea el lente. */
const FOCAL_MIN = 6;
/** Cooldown entre beats (s): chispa ocasional, no circo. */
export const BEAT_COOLDOWN_S = 9;
/** El primer gesto del usuario ACELERA la presentación hasta aquí. */
const PRESENTACION_CORTE = 0.86;

/* Push-in (fracción de la distancia cámara→target) y sostén (s) por beat.
   El Ent es el anciano del páramo: su cameo pide un plano más quieto y largo. */
const BEATS = {
  fauna: { push: 0.06, sosten: 1.1, lean: 0.8 },
  magico: { push: 0.08, sosten: 1.4, lean: 0.9 },
  ent: { push: 0.09, sosten: 2.2, lean: 1.0 },
  alerta: { push: 0.08, sosten: 1.6, lean: 0.0 },
};
/** El slug del Ent en el coro ambiental (CREATURES). */
export const SLUG_ENT = 'ent-frailejon';

/* Follow del avatar: pesos chicos — la cámara se INCLINA, no persigue.
   Los `st*` son `smoothTime` de maath/easing (s ~ tiempo de llegada). */
const FOLLOW = {
  peso: 0.16, // cuánto del desvío del avatar respecto al foco entra al target
  lead: { cine: 0.42, sobrio: 0.26 }, // s de anticipación por velocidad
  tope: 1.1, // clamp del offset (unidades de mundo)
  stOffset: 0.55, // smoothTime del offset hacia su meta (damp3)
  stVel: 0.25, // smoothTime del suavizado de la velocidad del avatar
  respiro: 0.05, // vaivén vertical del encuadre (respiración, u. de mundo)
};

/* smoothTime (s) de las envolventes de beat y de la anticipación focal. */
const ST_BEAT = { sube: 0.3, baja: 0.6 };
const ST_ANTICIPO = { sube: 0.11, baja: 0.42 };

/* Anticipación al entrar a un mundo (túnel Odyssey): el lente se ABRE un 6%
   un instante (la anticipación rubber-hose) y suelta — el zoom-in que sigue
   (CamaraViajera + aplane New Donk) remata el gesto. Solo focal: cero pelea. */
const ANTICIPO = { abre: 0.06 };

/* Vector cero reusable (meta de decaimiento del damp3): jamás se muta. */
const ZERO3 = Object.freeze(new THREE.Vector3());

/* ── El BARRIDO de presentación ───────────────────────────────────────────
   Waypoints en unidades de mundo del valle (terreno 34×34; la cordillera al
   fondo en z≈-15, la quebrada baja de (-3.4,-7.2) a (3.6,8), los mundos entre
   z -2.5 y 6.5). Arranca ALTO sobre el páramo mirando la ladera, planea sobre
   la quebrada y los mundos, y cae hacia la pose jugable. El último tramo lo
   cubre el resorte de asentamiento (por eso la curva termina CERCA del reposo,
   no encima). El modo sobrio recorta el barrido a un dolly corto en arco. */
export function waypointsPresentacion(modo, reposo, mira) {
  const [rx, ry, rz] = reposo;
  const [mx, my, mz] = mira;
  if (modo === 'sobrio') {
    return {
      pos: [
        [rx * 1.35, ry * 1.5 + 1.5, rz * 1.35],
        [rx * 1.16, ry * 1.22 + 0.7, rz * 1.16],
        [rx * 1.045, ry * 1.06, rz * 1.045],
      ],
      mira: [
        [mx, my + 1.2, mz - 1.5],
        [mx, my + 0.5, mz - 0.6],
        [mx, my + 0.12, mz - 0.15],
      ],
      fovDesde: 44,
    };
  }
  return {
    pos: [
      [-13, 15.5, -6], // alto sobre el páramo: la ladera entera y el río de lado
      [-14.5, 11, 6], // planeo por el costado: la quebrada baja en cuadro
      [-4, 8.6, 15], // frente del valle: los mundos y la fauna, de cerca
      [rx * 0.86, ry * 1.06, rz * 0.94], // casi la pose jugable (remata el resorte)
    ],
    mira: [
      [1.5, 2.6, 2.5],
      [0.5, 1.6, 0.8],
      [0.2, 1.2, 0.6],
      [mx, my + 0.1, mz - 0.1],
    ],
    fovDesde: 46,
  };
}

/* ── Utilitarios de movimiento (frame-rate independientes) ────────────────── */

/** Ease-in-out senoidal del travelling: arranca y frena con calma, sin rebote. */
export const easeViaje = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p);

/**
 * Un paso semi-implícito de resorte para un Vector3 (muta pos y vel).
 * ζ<1 asienta con overshoot suave; ζ=1 es damp crítico.
 */
function pasoResorteV3(pos, vel, hasta, omega, zeta, dt) {
  const k = omega * omega;
  const c = 2 * zeta * omega;
  vel.set(
    vel.x + (-c * vel.x - k * (pos.x - hasta.x)) * dt,
    vel.y + (-c * vel.y - k * (pos.y - hasta.y)) * dt,
    vel.z + (-c * vel.z - k * (pos.z - hasta.z)) * dt,
  );
  pos.addScaledVector(vel, dt);
}

/** El mismo paso de resorte para un escalar. Devuelve [valor, vel]. */
function pasoResorte(valor, vel, hasta, omega, zeta, dt) {
  const v = vel + (-2 * zeta * omega * vel - omega * omega * (valor - hasta)) * dt;
  return [valor + v * dt, v];
}

/** Distancia focal (mm de film) que produce un fov vertical dado. */
function focalDeFov(camara, fov) {
  return (0.5 * camara.getFilmHeight()) / Math.tan(THREE.MathUtils.degToRad(fov * 0.5));
}

/* ── El MODO del director ─────────────────────────────────────────────────── */

/**
 * Decide cuánta cinematografía aguanta la sesión. La regla dura del DR:
 * reduced-motion y tier bajo NO mueven la cámara (encuadre digno fijo).
 *
 * @param {{ activo?: boolean, tier?: string, reducedMotion?: boolean }} p
 * @returns {'cine'|'sobrio'|'fijo'}
 */
export function modoDirector({ activo = true, tier = 'alto', reducedMotion = false } = {}) {
  if (!activo || reducedMotion || tier === 'bajo') return 'fijo';
  return tier === 'medio' ? 'sobrio' : 'cine';
}

/* ── Presentación una-vez-por-sesión (mismo espíritu que escenas/CamaraDirector) ── */
const yaPresentados = new Set();

/** ¿Toca presentar esta clave? (la marca al preguntarse: volver no repite). */
export function reclamarPresentacion(clave) {
  if (clave === null || clave === undefined) return true;
  if (yaPresentados.has(clave)) return false;
  yaPresentados.add(clave);
  return true;
}

/** Solo para tests: olvida las presentaciones ya corridas. */
export function _resetPresentaciones() {
  yaPresentados.clear();
}

/* ── El ESTADO del director ───────────────────────────────────────────────── */

/**
 * @typedef {Object} BeatValle  Un beat pedido por el host.
 * @property {number} [n]                 identidad (contador del host).
 * @property {'fauna'|'alerta'} tipo      qué pasó en el valle.
 * @property {'izq'|'der'|'bosque'} [lado]  por dónde asomó el bicho.
 * @property {string} [slug]              qué bicho (SLUG_ENT = cameo del Ent).
 * @property {boolean} [magico]           apareció mágico (el jaguar).
 */

/**
 * Crea el estado mutable del director. `presentar` ya viene decidido por el
 * componente (modo ≠ fijo + reclamarPresentacion de la clave de sesión).
 *
 * @param {Object} o
 * @param {'cine'|'sobrio'|'fijo'} o.modo
 * @param {number[]} o.reposo   [x,y,z] pose jugable de la cámara (CAMARA_VALLE).
 * @param {number[]} o.mira     [x,y,z] target de reposo del valle.
 * @param {number} o.fov        fov jugable (el del Canvas).
 * @param {boolean} [o.presentar]  true → arranca con el barrido establishing.
 */
export function crearDirector({ modo, reposo, mira, fov, presentar = false }) {
  const conPres = modo !== 'fijo' && presentar;
  const wp = conPres ? waypointsPresentacion(modo, reposo, mira) : null;
  return {
    modo,
    /** 'presenta' (barrido) → 'asienta' (resorte al reposo) → 'gameplay'. */
    fase: conPres ? 'presenta' : 'gameplay',
    reposo: new THREE.Vector3(...reposo),
    miraReposo: new THREE.Vector3(...mira),
    fovReposo: fov,
    pres: conPres
      ? {
          p: 0,
          dur: PRESENTACION_S[modo] || PRESENTACION_S.sobrio,
          curvaPos: new THREE.CatmullRomCurve3(wp.pos.map((v) => new THREE.Vector3(...v))),
          curvaMira: new THREE.CatmullRomCurve3(wp.mira.map((v) => new THREE.Vector3(...v))),
          fovDesde: wp.fovDesde,
          arranco: false,
        }
      : null,
    /* La mirada que conduce el director mientras presenta/asienta. */
    mira: new THREE.Vector3(...mira),
    velPos: new THREE.Vector3(),
    velMira: new THREE.Vector3(),
    velFov: 0,
    fovActual: conPres ? wp.fovDesde : fov,
    /* Beat en curso + el pendiente que dejó el host. */
    beat: {
      fase: 'quieto', // 'va' | 'sostiene' | 'vuelve'
      t: 0,
      env: 0, // envolvente 0..1 (damped)
      push: 0, // push-in vigente por LENTE (fracción de focal, no dolly)
      sosten: 0,
      lean: new THREE.Vector3(),
      aplicadoFocal: 0, // factor de push-in ya aplicado (delta por frame)
      aplicadoLean: new THREE.Vector3(),
      listoEn: 0, // reloj: cuándo vuelve a haber cupo (cooldown)
    },
    /** @type {BeatValle|null} */
    beatPendiente: null,
    /* Follow aditivo del avatar (+ respiración del encuadre). */
    foll: {
      off: new THREE.Vector3(),
      aplicado: new THREE.Vector3(),
      meta: new THREE.Vector3(),
      velAvatar: new THREE.Vector3(),
      prevAvatar: new THREE.Vector3(),
      conPrev: false,
    },
    /* Anticipación focal al entrar a un mundo (solo cine). */
    anticipo: { env: 0, meta: 0, aplicado: 0 },
    /* Escratch compartido (cero alocación por frame). */
    _v: new THREE.Vector3(),
    _w: new THREE.Vector3(),
  };
}

/* ── Órdenes del host ─────────────────────────────────────────────────────── */

/**
 * Pide un beat. La admisión es DURA: solo en modo cine, en gameplay (nunca
 * encima de la presentación), sin otro beat en curso y respetando el cooldown.
 *
 * @param {ReturnType<typeof crearDirector>} st
 * @param {BeatValle|null} beat
 * @param {number} ahora  reloj de la escena (s).
 * @returns {boolean} true si el beat entró.
 */
export function dispararBeat(st, beat, ahora) {
  if (!beat || st.modo !== 'cine' || st.fase !== 'gameplay') return false;
  const b = st.beat;
  if (b.fase !== 'quieto' || ahora < b.listoEn) return false;
  const receta =
    beat.tipo === 'alerta'
      ? BEATS.alerta
      : beat.slug === SLUG_ENT
        ? BEATS.ent
        : beat.magico
          ? BEATS.magico
          : BEATS.fauna;
  b.fase = 'va';
  b.t = 0;
  b.env = 0;
  b.push = receta.push;
  b.sosten = receta.sosten;
  b.lean.set(0, 0, 0);
  if (beat.tipo === 'fauna' && receta.lean > 0) {
    // El reencuadre se INCLINA hacia el lado por donde asomó el bicho: en el
    // eje derecha/izquierda DE CÁMARA (se resuelve en el paso, con la cámara).
    b.lean.set(beat.lado === 'izq' ? -receta.lean : beat.lado === 'der' ? receta.lean : 0, 0.12, 0);
    if (beat.lado === 'bosque') b.lean.set(0, 0.28, -0.5); // asoma tras el horizonte: tilt arriba
  }
  return true;
}

/**
 * Anticipación al entrar a un mundo (el lente se abre un instante y suelta).
 * Solo cine; los otros modos entran directo con la CamaraViajera de siempre.
 * @param {ReturnType<typeof crearDirector>} st
 */
export function anticiparEntrada(st) {
  if (st.modo !== 'cine' || st.fase !== 'gameplay') return;
  st.anticipo.meta = 1;
}

/** El primer gesto del usuario acelera la presentación (nunca teletransporta). */
export function acelerarPresentacion(st) {
  if (st.pres && st.fase === 'presenta') st.pres.p = Math.max(st.pres.p, PRESENTACION_CORTE);
}

/**
 * Clava la cámara en el PRIMER punto del barrido, en el efecto de montaje —
 * ANTES del primer pintado. Sin esto habría un fotograma en la pose de reposo
 * (la del Canvas) antes de que el primer frame salte al arranque del barrido.
 * Marca `pr.arranco` para que `pasoDirector` no la re-inicialice.
 *
 * @param {ReturnType<typeof crearDirector>} st
 * @param {import('three').PerspectiveCamera} camara
 */
export function aplicarPoseInicial(st, camara) {
  if (!st.pres || st.fase !== 'presenta') return;
  const pr = st.pres;
  pr.arranco = true;
  pr.curvaPos.getPoint(0, camara.position);
  pr.curvaMira.getPoint(0, st.mira);
  st.fovActual = pr.fovDesde;
  camara.setFocalLength(Math.max(focalDeFov(camara, pr.fovDesde), FOCAL_MIN));
  camara.lookAt(st.mira);
}

/* ── EL PASO por frame ────────────────────────────────────────────────────── */

/**
 * Avanza el director un frame. Muta cámara/target SOLO por métodos three.
 *
 * @param {ReturnType<typeof crearDirector>} st
 * @param {Object} ctx
 * @param {import('three').PerspectiveCamera} ctx.camara
 * @param {{ target: import('three').Vector3, update: () => void }|null} ctx.controls
 *        los OrbitControls hermanos (o un stub en tests). null → sin target.
 * @param {import('three').Vector3} ctx.foco  el foco vigente de CamaraViajera.
 * @param {import('three').Vector3|null} [ctx.avatarPos]  posición viva del avatar.
 * @param {boolean} [ctx.entrando]   hay un mundo en foco (no seguir al avatar).
 * @param {boolean} [ctx.aplanando]  el aplane New Donk manda: el director cede.
 * @param {number} ctx.t   reloj de la escena (s).
 * @param {number} dtCrudo  delta del frame (s), se acota adentro.
 * @returns {boolean} true si el director CONDUCE la cámara este frame (la
 *          CamaraViajera debe ceder — presentación en curso).
 */
export function pasoDirector(st, ctx, dtCrudo) {
  if (st.modo === 'fijo') return false;
  const { camara, controls } = ctx;
  const dt = Math.min(dtCrudo, 1 / 20);

  /* El aplane del túnel tiene la última palabra: el director se repliega y
     devuelve lo aditivo que tuviera puesto (para no contaminar la captura de
     AplaneNewDonk, que corre DESPUÉS en el mismo frame). */
  if (ctx.aplanando) {
    devolverAditivos(st, camara, controls);
    return false;
  }

  /* ── 1) PRESENTACIÓN: el barrido establishing ── */
  if (st.fase === 'presenta' && st.pres) {
    const pr = st.pres;
    if (!pr.arranco) {
      pr.arranco = true;
      camara.position.copy(pr.curvaPos.getPoint(0));
      st.mira.copy(pr.curvaMira.getPoint(0));
      st.fovActual = pr.fovDesde;
      camara.setFocalLength(Math.max(focalDeFov(camara, pr.fovDesde), FOCAL_MIN));
      camara.lookAt(st.mira);
    }
    pr.p = Math.min(1, pr.p + dt / pr.dur);
    const e = easeViaje(pr.p);
    pr.curvaPos.getPoint(e, camara.position);
    pr.curvaMira.getPoint(e, st.mira);
    st.fovActual = THREE.MathUtils.lerp(pr.fovDesde, st.fovReposo, e);
    camara.setFocalLength(Math.max(focalDeFov(camara, st.fovActual), FOCAL_MIN));
    camara.lookAt(st.mira);
    if (pr.p >= 1) {
      // El barrido terminó CERCA del reposo: el resorte remata la llegada.
      st.fase = 'asienta';
      st.velPos.set(0, 0, 0);
      st.velMira.set(0, 0, 0);
      st.velFov = 0;
    }
    return true;
  }

  /* ── 2) ASENTAMIENTO: resorte (overshoot mínimo en cine) a la pose jugable ── */
  if (st.fase === 'asienta') {
    const omega = OMEGA_ASIENTA[st.modo] || OMEGA_ASIENTA.sobrio;
    const zeta = ZETA[st.modo] || 1;
    pasoResorteV3(camara.position, st.velPos, st.reposo, omega, zeta, dt);
    pasoResorteV3(st.mira, st.velMira, st.miraReposo, omega, zeta, dt);
    const [f, vf] = pasoResorte(st.fovActual, st.velFov, st.fovReposo, omega, zeta, dt);
    st.fovActual = f;
    st.velFov = vf;
    camara.setFocalLength(Math.max(focalDeFov(camara, st.fovActual), FOCAL_MIN));
    camara.lookAt(st.mira);
    const eps = EPSILON * Math.max(st.reposo.length(), 1);
    if (
      camara.position.distanceTo(st.reposo) < eps &&
      st.velPos.length() < eps * 6 &&
      st.mira.distanceTo(st.miraReposo) < eps
    ) {
      // Aterrizaje EXACTO en el encuadre jugable de siempre; cero regresión.
      camara.position.copy(st.reposo);
      st.mira.copy(st.miraReposo);
      st.fovActual = st.fovReposo;
      camara.setFocalLength(Math.max(focalDeFov(camara, st.fovReposo), FOCAL_MIN));
      camara.lookAt(st.mira);
      if (controls) {
        controls.target.copy(st.miraReposo);
        controls.update();
      }
      st.fase = 'gameplay';
    }
    return true;
  }

  /* ── 3) GAMEPLAY: follow aditivo + beats. La CamaraViajera conduce. ── */
  pasoFollow(st, ctx, dt);
  pasoBeat(st, ctx, dt);
  pasoAnticipo(st, camara, dt);
  return false;
}

/* El follow del avatar + la respiración del encuadre, como OFFSET ADITIVO por
   delta (patrón respiro): meta = desvío del avatar respecto al foco, pesado y
   con LEAD por velocidad; el offset se amortigua hacia la meta y al target se
   le aplica SOLO la diferencia contra lo ya aplicado. */
function pasoFollow(st, ctx, dt) {
  const { controls, foco, avatarPos } = ctx;
  if (!controls) return;
  const f = st.foll;

  // Velocidad del avatar (suavizada con damp3): el LEAD mira hacia donde VA.
  if (avatarPos) {
    if (f.conPrev && dt > 0) {
      st._v.copy(avatarPos).sub(f.prevAvatar).divideScalar(dt);
      damp3(f.velAvatar, st._v, FOLLOW.stVel, dt);
    }
    f.prevAvatar.copy(avatarPos);
    f.conPrev = true;
  } else {
    damp3(f.velAvatar, ZERO3, FOLLOW.stVel, dt); // sin avatar, la velocidad decae a 0
  }

  // La meta del offset: solo en reposo del valle (entrando manda el foco).
  if (avatarPos && !ctx.entrando) {
    const lead = FOLLOW.lead[st.modo] ?? FOLLOW.lead.sobrio;
    f.meta
      .copy(avatarPos)
      .sub(foco)
      .multiplyScalar(FOLLOW.peso)
      .addScaledVector(f.velAvatar, lead * FOLLOW.peso * 2);
    f.meta.y *= 0.35; // el vaivén vertical del vuelo no bambolea el encuadre
    if (f.meta.length() > FOLLOW.tope) f.meta.setLength(FOLLOW.tope);
  } else {
    f.meta.set(0, 0, 0);
  }
  // La respiración del encuadre (dos senos lentos desfasados, amplitud mínima).
  const t = ctx.t;
  const respiro =
    Math.sin(t * 0.45) * FOLLOW.respiro + Math.sin(t * 0.23 + 1.7) * FOLLOW.respiro * 0.5;

  damp3(f.off, f.meta, FOLLOW.stOffset, dt); // maath: offset trailing suave hacia la meta
  // Aplicar el DELTA contra lo ya aplicado (aditivo: convive con todos).
  st._v.copy(f.off);
  st._v.y += respiro;
  st._w.copy(st._v).sub(f.aplicado);
  controls.target.add(st._w);
  f.aplicado.copy(st._v);
}

/* El beat en curso: micro push-in por LENTE (focal) + lean del target, ambos
   como envolvente amortiguada que SIEMPRE vuelve a cero. El push va por focal
   (no por dolly de posición) A PROPÓSITO: OrbitControls reposiciona la cámara
   desde su esférica en cada `update()`, así que mover camera.position pelearía;
   el focal, en cambio, no lo toca nadie más en gameplay → cero conflicto. */
function pasoBeat(st, ctx, dt) {
  const { camara, controls } = ctx;
  const b = st.beat;

  // ¿Hay un pendiente del host? (la admisión vive en dispararBeat)
  if (st.beatPendiente) {
    const pedido = st.beatPendiente;
    st.beatPendiente = null;
    if (dispararBeat(st, pedido, ctx.t) && pedido.tipo === 'fauna' && b.lean.x !== 0) {
      // Resolver el lean izquierda/derecha EN EJES DE CÁMARA (columna X de su
      // matriz de mundo): screen-left es screen-left desde cualquier órbita.
      const lx = b.lean.x;
      st._v.setFromMatrixColumn(camara.matrixWorld, 0).setY(0).normalize();
      b.lean.set(st._v.x * lx, b.lean.y, st._v.z * lx);
    }
  }
  if (b.fase === 'quieto') return;

  b.t += dt;
  let metaEnv = 0;
  if (b.fase === 'va') {
    metaEnv = 1;
    if (b.env > 0.86) {
      b.fase = 'sostiene';
      b.t = 0;
    }
  } else if (b.fase === 'sostiene') {
    metaEnv = 1;
    if (b.t >= b.sosten) {
      b.fase = 'vuelve';
      b.t = 0;
    }
  } // 'vuelve' → metaEnv 0
  damp(b, 'env', metaEnv, b.fase === 'vuelve' ? ST_BEAT.baja : ST_BEAT.sube, dt);
  if (b.fase === 'vuelve' && b.env < 0.01) {
    b.env = 0;
    b.fase = 'quieto';
    b.listoEn = ctx.t + BEAT_COOLDOWN_S;
  }

  // Push-in por LENTE (factor multiplicativo con delta contra lo ya aplicado):
  // focal más largo = telefoto que se acerca; se deshace solo al volver env→0.
  const factorNuevo = 1 + b.push * b.env;
  const factorViejo = 1 + b.push * b.aplicadoFocal;
  camara.setFocalLength(
    Math.max((camara.getFocalLength() / factorViejo) * factorNuevo, FOCAL_MIN),
  );
  b.aplicadoFocal = b.env;
  // Lean del target (aditivo, restaurable): el reencuadre se inclina y vuelve.
  if (controls) {
    st._w.copy(b.lean).multiplyScalar(b.env).sub(b.aplicadoLean);
    controls.target.add(st._w);
    b.aplicadoLean.copy(b.lean).multiplyScalar(b.env);
  }
}

/* La anticipación focal: sube rápido, suelta suave; puro setFocalLength por
   delta multiplicativo — no toca posición ni target. */
function pasoAnticipo(st, camara, dt) {
  const a = st.anticipo;
  if (a.meta === 0 && a.env < 0.001 && a.aplicado === 0) return;
  damp(a, 'env', a.meta, a.meta > a.env ? ST_ANTICIPO.sube : ST_ANTICIPO.baja, dt);
  if (a.meta === 1 && a.env > 0.92) a.meta = 0; // llegó: soltar
  const factorNuevo = 1 - ANTICIPO.abre * a.env;
  const factorViejo = 1 - ANTICIPO.abre * a.aplicado;
  camara.setFocalLength(
    Math.max((camara.getFocalLength() / factorViejo) * factorNuevo, FOCAL_MIN),
  );
  a.aplicado = a.env;
  if (a.meta === 0 && a.env < 0.001) {
    // Restaurado por completo: cerrar en limpio (sin residuo flotante).
    camara.setFocalLength(Math.max(camara.getFocalLength() / factorNuevo, FOCAL_MIN));
    a.env = 0;
    a.aplicado = 0;
  }
}

/* Devuelve TODO lo aditivo puesto (follow, beat, anticipo) — se llama cuando
   otro sistema (el aplane del túnel) va a capturar la pose de la cámara. */
function devolverAditivos(st, camara, controls) {
  const f = st.foll;
  const b = st.beat;
  if (controls) {
    controls.target.sub(f.aplicado);
    controls.target.sub(b.aplicadoLean);
  }
  f.aplicado.set(0, 0, 0);
  f.off.set(0, 0, 0);
  b.aplicadoLean.set(0, 0, 0);
  if (b.aplicadoFocal !== 0) {
    // Deshacer el push-in por lente (factor multiplicativo).
    camara.setFocalLength(
      Math.max(camara.getFocalLength() / (1 + b.push * b.aplicadoFocal), FOCAL_MIN),
    );
    b.aplicadoFocal = 0;
  }
  if (b.fase !== 'quieto') {
    b.fase = 'quieto';
    b.env = 0;
  }
  const a = st.anticipo;
  if (a.aplicado !== 0) {
    camara.setFocalLength(Math.max(camara.getFocalLength() / (1 - ANTICIPO.abre * a.aplicado), FOCAL_MIN));
    a.env = 0;
    a.meta = 0;
    a.aplicado = 0;
  }
}
