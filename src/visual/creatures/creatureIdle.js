/*
 * creatureIdle — LA PERSONALIDAD IDLE de la familia rubber-hose, como funciones
 * PURAS y DETERMINISTAS (cero Math.random en render, cero three, cero react).
 *
 * Es la MISMA máquina de micro-comportamientos para cualquier personaje del
 * estilo (Cuphead / Miss Minutes): dado el tiempo del reloj de la escena, una
 * semilla, la hora del día y el perfil de la especie, devuelve la POSE del
 * instante. Llamarla dos veces con los mismos argumentos da EXACTO lo mismo:
 * los "eventos" (rascarse, vuelta de campana, posarse) no se sortean por frame
 * — se derivan con un hash entero de (semilla, evento, número de ciclo), así
 * que la línea de tiempo completa de cada criatura está decidida de antemano
 * y aun así se siente impredecible (jitter por ciclo, períodos co-primos).
 *
 * REPERTORIO (species-agnostic; el perfil gradúa períodos y amplitudes):
 *   respira   → squash & stretch sutil continuo (la línea que respira).
 *   rasca     → se ladea a rascarse (jiggle de patita que decae).
 *   sacude    → sacudida corta de todo el cuerpo (perro mojado, decae).
 *   vuelta    → la vuelta de campana juguetona (~18-22 s en Angelita):
 *               anticipación → giro pasado de rosca → asienta el overshoot.
 *   percha    → se posa (en una flor/hoja los voladores; se sienta los de
 *               suelo) y despega con un brinquito de overshoot.
 *   celebra   → al llegar a un mundo: giro alegre con overshoot + rebotico.
 *   acurruca  → de noche (hora de cielosHoraData) se recoge y respira hondo.
 *
 * CONTRATO con el consumidor (la escena/hook que posee el cuerpo):
 *   { pose, sx, sy, rot, dy, posada, activo, evento }
 *   pose    slug discreto para data-pose del svg ('celebra'/'reposo' ya tienen
 *           CSS en creatures.css; la base es del perfil: 'vuela'/'anda').
 *   sx/sy   escala squash&stretch (aplicar como transform CSS del billboard).
 *   rot     grados de giro en el plano (vuelta/celebración/ladeos).
 *   dy      brinquito vertical en unidades de mundo (pequeño).
 *   posada  0..1 cuánto bajó a su percha (1 = sentada; puede asomar negativo
 *           un instante: el saltito de despegue). El consumidor la usa para
 *           atenuar altura/vagar/bob.
 *   activo  hay animación idle corriendo → con frameloop='demand' el consumidor
 *           debe invalidate() SOLO mientras esto sea true.
 *
 * QUIÉN ES QUIÉN: la IDENTIDAD (paleta/medidas) sigue en abejaIdentidad.js y
 * _faunaRubberTokens.js; la CADENCIA CSS en creatures.css. Aquí vive SOLO la
 * conducta en el tiempo, parametrizada por especie: Angelita la estrena, y el
 * resto de la familia rubber-hose (oso, colibrí, rana andina, perezoso,
 * ardilla, jaguar, morrocoy, borugo) entra con su perfil sin tocar la máquina.
 * Sin perfil propio un bicho caería al de la abeja — personalidad equivocada
 * por construcción — así que TODO personaje nuevo declara el suyo aquí.
 *
 * reducedMotion → pose CALMA estática (de noche, acurrucada quieta), activo
 * false: nada anima y nadie pide frames. Tier 'bajo' → solo la respiración.
 */

/* ── Deterministas: hash entero → [0,1) por (semilla, evento, ciclo) ─────── */

/** Semilla estable por especie (hash del slug — dos especies nunca sincronizan). */
export function semillaDe(especie) {
  let h = 9;
  for (let i = 0; i < especie.length; i++) h = (Math.imul(h, 31) + especie.charCodeAt(i)) >>> 0;
  return h;
}

function hashU32(a, b, c) {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Pseudoazar determinista en [0,1) para el ciclo `k` del evento `id`. */
export function azar01(semilla, id, k) {
  return hashU32(semilla >>> 0, id, k) / 4294967296;
}

/* Suavizados clásicos del squash & stretch. */
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const suave = (x) => { const c = clamp01(x); return c * c * (3 - 2 * c); }; // smoothstep
/** Ease back-out: pasa de largo (~+10%) y asienta — EL overshoot rubber-hose. */
export function backOut(x) {
  const c = 2.04; const u = clamp01(x) - 1;
  return 1 + u * u * ((c + 1) * u + c);
}

/**
 * Ventana determinista del evento `id`: el ciclo k ocupa el tramo
 * [k·base, (k+1)·base) y el evento arranca en k·base + azar·jitter, dura `dur`.
 * Separación entre ocurrencias ∈ [base−jitter, base+jitter] (p. ej. la vuelta
 * de Angelita: base 20, jitter 2 → cada ~18-22 s). El ciclo 0 se salta: nadie
 * hace piruetas nada más nacer (warmup de un período completo).
 * @returns {{f:number,k:number}|null} fase 0..1 dentro del evento, o null.
 */
export function ventana(t, semilla, id, { base, jitter, dur }) {
  const k = Math.floor(t / base);
  if (k <= 0) return null;
  const inicio = k * base + azar01(semilla, id, k) * jitter;
  const f = (t - inicio) / dur;
  return f >= 0 && f < 1 ? { f, k } : null;
}

/* Ids internos de la línea de tiempo (solo etiquetas del hash). */
const EV = { vuelta: 3, aseo: 4, tipoAseo: 5, percha: 6 };
/* Carriles de eventos, cada uno con su período propio (se resuelven por orden
   de arranque — ver idleDeCreature — para que nunca se pisen a mitad de gesto). */
const CARRILES = [
  { tipo: 'percha', id: EV.percha },
  { tipo: 'vuelta', id: EV.vuelta },
  { tipo: 'aseo', id: EV.aseo },
];

/* ── Perfiles por especie: la MISMA máquina, otro animal ─────────────────────
   medio 'aire' (vuela: se posa en flor/hoja) | 'suelo' (anda: se sienta).
   respira {freq, amp, vaiven} · vuelta {base, jitter, dur, grados, anticipo}
   aseo {base, jitter, dur} · percha {base, jitter, dur} · celebra {dur, grados}
   noche {freq, amp, rot} — la respiración honda del acurruque. */
export const IDLE_PERFILES = {
  /* Tetragonisca angustula — inquieta, giro rápido, se posa seguido. */
  'abeja-angelita': {
    medio: 'aire', poseBase: 'vuela',
    respira: { freq: 2.0, amp: 0.038, vaiven: 0.31 },
    vuelta: { base: 20, jitter: 2, dur: 1.15, grados: 360, anticipo: 26 },
    aseo: { base: 11, jitter: 3, dur: 0.9 },
    percha: { base: 38, jitter: 6, dur: 6.5 },
    celebra: { dur: 1.6, grados: 360 },
    noche: { freq: 0.9, amp: 0.055, rot: -6 },
  },
  /* Colibri coruscans — todavía más nervioso: todo late más rápido. */
  colibri: {
    medio: 'aire', poseBase: 'vuela',
    respira: { freq: 2.7, amp: 0.03, vaiven: 0.43 },
    vuelta: { base: 16, jitter: 2, dur: 0.85, grados: 360, anticipo: 20 },
    aseo: { base: 9, jitter: 2.5, dur: 0.7 },
    percha: { base: 30, jitter: 5, dur: 5 },
    celebra: { dur: 1.2, grados: 360 },
    noche: { freq: 1.1, amp: 0.045, rot: -5 },
  },
  /* Tremarctos ornatus — pesado y entrañable: respira hondo, voltereta lenta,
     se rasca la panza largo y se sienta un buen rato. */
  'oso-andino': {
    medio: 'suelo', poseBase: 'anda',
    respira: { freq: 1.05, amp: 0.05, vaiven: 0.23 },
    vuelta: { base: 36, jitter: 4, dur: 1.9, grados: 360, anticipo: 18 },
    aseo: { base: 14, jitter: 4, dur: 1.5 },
    percha: { base: 46, jitter: 8, dur: 9 },
    celebra: { dur: 2.0, grados: 360 },
    noche: { freq: 0.55, amp: 0.07, rot: -8 },
  },
  /* Atelopus spp. — la rana arlequín ZEN (slug real de RanaAndina.jsx y de
     creatures.css): la garganta late; su "vuelta" es la voltereta de brinco y
     su percha, quedarse quieta en la hoja (es lo suyo). */
  'rana-andina': {
    medio: 'suelo', poseBase: 'anda',
    respira: { freq: 1.7, amp: 0.06, vaiven: 0.37 },
    vuelta: { base: 26, jitter: 3, dur: 1.0, grados: 360, anticipo: 22 },
    aseo: { base: 12, jitter: 3, dur: 0.8 },
    percha: { base: 24, jitter: 5, dur: 8 },
    celebra: { dur: 1.4, grados: 360 },
    noche: { freq: 0.8, amp: 0.06, rot: -4 },
  },
  /* Bradypus variegatus — TODO en cámara lenta (1/3 del resto): respira
     hondísimo, jamás pirueta rápida; su "aseo" es un estirón sostenido. */
  perezoso: {
    medio: 'suelo', poseBase: 'anda',
    respira: { freq: 0.45, amp: 0.045, vaiven: 0.17 },
    vuelta: { base: 52, jitter: 6, dur: 3.4, grados: 360, anticipo: 14 },
    aseo: { base: 21, jitter: 5, dur: 2.6 },
    percha: { base: 34, jitter: 7, dur: 14 },
    celebra: { dur: 3.0, grados: 360 },
    noche: { freq: 0.35, amp: 0.06, rot: -7 },
  },
  /* Notosciurus granatensis — pizpireta e INQUIETA: todo late rapidito,
     se asea seguido y casi no se queda posada. */
  ardilla: {
    medio: 'suelo', poseBase: 'anda',
    respira: { freq: 2.4, amp: 0.045, vaiven: 0.39 },
    vuelta: { base: 17, jitter: 2.5, dur: 0.9, grados: 360, anticipo: 24 },
    aseo: { base: 8, jitter: 2.5, dur: 0.75 },
    percha: { base: 27, jitter: 5, dur: 4 },
    celebra: { dur: 1.3, grados: 360 },
    noche: { freq: 1.0, amp: 0.05, rot: -5 },
  },
  /* Panthera onca — poder CONTENIDO: respira lento y hondo, voltereta rara y
     majestuosa, se echa un buen rato (percha larga). */
  jaguar: {
    medio: 'suelo', poseBase: 'anda',
    respira: { freq: 0.85, amp: 0.04, vaiven: 0.21 },
    vuelta: { base: 42, jitter: 5, dur: 2.1, grados: 360, anticipo: 16 },
    aseo: { base: 16, jitter: 4, dur: 1.6 },
    percha: { base: 44, jitter: 8, dur: 11 },
    celebra: { dur: 1.9, grados: 360 },
    noche: { freq: 0.5, amp: 0.06, rot: -6 },
  },
  /* Chelonoidis carbonarius — ancestral y PACIENTE: el más lento en girar;
     su "aseo" es guardarse un momento (la retracción). */
  morrocoy: {
    medio: 'suelo', poseBase: 'anda',
    respira: { freq: 0.6, amp: 0.035, vaiven: 0.15 },
    vuelta: { base: 58, jitter: 6, dur: 3.8, grados: 360, anticipo: 12 },
    aseo: { base: 23, jitter: 5, dur: 2.8 },
    percha: { base: 40, jitter: 8, dur: 13 },
    celebra: { dur: 2.6, grados: 360 },
    noche: { freq: 0.4, amp: 0.05, rot: -4 },
  },
  /* Cuniculus taczanowskii — ternura nocturna, tímido y sereno: movimientos
     suaves, nada de comedia bruta; de noche es cuando más vivo está. */
  borugo: {
    medio: 'suelo', poseBase: 'anda',
    respira: { freq: 1.15, amp: 0.04, vaiven: 0.25 },
    vuelta: { base: 39, jitter: 5, dur: 1.8, grados: 360, anticipo: 15 },
    aseo: { base: 13, jitter: 4, dur: 1.2 },
    percha: { base: 33, jitter: 7, dur: 10 },
    celebra: { dur: 1.8, grados: 360 },
    noche: { freq: 0.7, amp: 0.05, rot: -5 },
  },
};

/* Alias LEGACY: el perfil nació con el slug 'rana-dorada' (Phyllobates) pero la
   creature real de la casa siempre fue 'rana-andina' (Atelopus spp.) — el slug
   viejo caía en silencio al fallback (¡la rana se movía como abeja!). Se
   mantiene el alias para no romper consumidores/tests históricos. */
IDLE_PERFILES['rana-dorada'] = IDLE_PERFILES['rana-andina'];

/* Overshoot del giro (grados que se pasa antes de asentar). */
const PASADA = 24;

/** Pose neutra congelada (reduced-motion de día, o durante el cruce 2D→3D). */
export const IDLE_NEUTRO = Object.freeze({
  pose: 'vuela', sx: 1, sy: 1, rot: 0, dy: 0, posada: 0, activo: false, evento: null,
});
/* Calma nocturna estática (reduced-motion de noche): acurrucada, sin animar. */
const IDLE_CALMA_NOCHE = Object.freeze({
  pose: 'reposo', sx: 1, sy: 1, rot: 0, dy: 0, posada: 0, activo: false, evento: 'acurruca',
});

/**
 * LA MÁQUINA: pose idle del instante `t` para una especie rubber-hose.
 * Pura y determinista — misma entrada, misma pose.
 *
 * @param {number} t  segundos del reloj de la escena (state.clock.elapsedTime).
 * @param {object} [opts]
 * @param {string} [opts.especie='abeja-angelita']  slug del perfil (IDLE_PERFILES).
 * @param {number} [opts.semilla]  override de la semilla (default: semillaDe(especie)).
 * @param {string} [opts.hora='dorada']  hora de cielosHoraData ('noche' → acurruca).
 * @param {boolean} [opts.reducedMotion=false]  pose calma estática, activo=false.
 * @param {string} [opts.tier='alto']  'bajo' → solo respiración (frugal).
 * @param {number|null} [opts.llegadaHace=null]  segundos desde que llegó a su
 *   percha en un mundo nuevo (dispara la CELEBRACIÓN); null = no aplica.
 * @returns {{pose:string,sx:number,sy:number,rot:number,dy:number,posada:number,activo:boolean,evento:string|null}}
 */
export function idleDeCreature(t, {
  especie = 'abeja-angelita', semilla, hora = 'dorada', reducedMotion = false,
  tier = 'alto', llegadaHace = null,
} = {}) {
  const p = IDLE_PERFILES[especie] || IDLE_PERFILES['abeja-angelita'];
  const deNoche = hora === 'noche';
  if (reducedMotion) return deNoche ? IDLE_CALMA_NOCHE : IDLE_NEUTRO;
  const s = (semilla ?? semillaDe(especie)) >>> 0;

  // CELEBRA — llegó a un mundo: giro alegre pasado de rosca + rebotico de gozo.
  // Gana a todo (hasta de noche se alegra un segundo antes de acurrucarse).
  if (llegadaHace !== null && llegadaHace >= 0 && llegadaHace < p.celebra.dur) {
    const f = llegadaHace / p.celebra.dur;
    return {
      pose: 'celebra',
      sx: 1 + 0.1 * Math.sin(Math.PI * f),
      sy: 1 + 0.16 * Math.sin(Math.PI * f),
      rot: p.celebra.grados * backOut(f / 0.82),
      dy: 0.1 * Math.sin(Math.PI * f),
      posada: 0, activo: true, evento: 'celebra',
    };
  }

  // ACURRUCA — de noche se recoge: baja del todo (posada=1), cabecita metida,
  // respiración honda y lenta. Nada de piruetas: el valle duerme.
  if (deNoche) {
    const r = Math.sin(t * p.noche.freq);
    return {
      pose: 'reposo',
      sx: 1 + p.noche.amp * r,
      sy: 1 - p.noche.amp * 1.25 * r,
      rot: p.noche.rot + 1.5 * Math.sin(t * p.noche.freq * 0.5),
      dy: 0, posada: 1, activo: true, evento: 'acurruca',
    };
  }

  // RESPIRA — el squash & stretch de base (dos ondas que nunca comparten
  // compás): sobre él se montan los demás eventos.
  const resp = Math.sin(t * p.respira.freq) * (1 + 0.35 * Math.sin(t * p.respira.vaiven));
  let sx = 1 + p.respira.amp * resp;
  let sy = 1 - p.respira.amp * 1.3 * resp;

  // Tier bajo: frugal — respira y nada más (los antics CSS ya están apagados).
  if (tier === 'bajo') {
    return { pose: p.poseBase, sx, sy, rot: 0, dy: 0, posada: 0, activo: true, evento: 'respira' };
  }

  // ── LÍNEA DE TIEMPO: los tres carriles (percha / vuelta / aseo) tienen
  //    períodos propios y pueden solaparse. Resolución SIN pre-empciones (cero
  //    saltos de pose a mitad de gesto), derivada solo de t (pura):
  //      1. entre los activos gana el que ARRANCÓ primero;
  //      2. un evento solo VALE si arrancó en silencio (ningún otro carril
  //         corriendo en su instante de arranque) — si no, se salta entero.
  const activos = [];
  for (const carril of CARRILES) {
    const cfg = p[carril.tipo];
    const v = ventana(t, s, carril.id, cfg);
    if (v) activos.push({ tipo: carril.tipo, id: carril.id, cfg, f: v.f, k: v.k, inicio: t - v.f * cfg.dur });
  }
  activos.sort((a, b) => a.inicio - b.inicio);
  let ev = null;
  for (const cand of activos) {
    const bloqueado = CARRILES.some((otro) => {
      if (otro.id === cand.id) return false;
      const w = ventana(cand.inicio, s, otro.id, p[otro.tipo]);
      return w !== null && w.f > 0; // otro carril ya corría cuando este arrancó
    });
    if (!bloqueado) { ev = cand; break; }
  }

  // PERCHA — baja a posarse (flor/hoja los de aire; se sienta los de suelo),
  // reposa con las alitas plegadas y despega con brinquito de overshoot
  // (posada asoma negativa un instante = el hop).
  if (ev && ev.tipo === 'percha') {
    let posada; let pose = p.poseBase;
    if (ev.f < 0.18) posada = suave(ev.f / 0.18);
    else if (ev.f < 0.8) { posada = 1; pose = 'reposo'; }
    else {
      const d = (ev.f - 0.8) / 0.2;
      posada = 1 - backOut(d);
      sy *= 1 + 0.1 * Math.sin(Math.PI * d); // el estirón del despegue
    }
    return { pose, sx, sy, rot: 0, dy: 0, posada, activo: true, evento: 'percha' };
  }

  // VUELTA DE CAMPANA — anticipación (se arma hacia atrás), giro completo
  // pasado de rosca, y asienta el overshoot. Termina EXACTO en grados≡0.
  if (ev && ev.tipo === 'vuelta') {
    const A = p.vuelta.anticipo;
    let rot;
    if (ev.f < 0.16) rot = -A * suave(ev.f / 0.16);
    else if (ev.f < 0.88) rot = -A + (p.vuelta.grados + A + PASADA) * suave((ev.f - 0.16) / 0.72);
    else rot = p.vuelta.grados + PASADA * (1 - suave((ev.f - 0.88) / 0.12));
    sx *= 1 + 0.08 * Math.sin(Math.PI * clamp01((ev.f - 0.16) / 0.72)); // smear del giro
    return { pose: p.poseBase, sx, sy, rot, dy: 0, posada: 0, activo: true, evento: 'vuelta' };
  }

  // ASEO — rascarse (se ladea, jiggle de patita) o sacudirse (perro mojado);
  // cuál toca lo decide el hash del ciclo, y ambos DECAEN (no cortan en seco).
  if (ev && ev.tipo === 'aseo') {
    const cae = 1 - suave(ev.f);
    if (azar01(s, EV.tipoAseo, ev.k) < 0.5) {
      const rot = -9 * Math.sin(Math.PI * Math.min(1, ev.f * 1.15));
      sy *= 1 + 0.04 * Math.sin(ev.f * Math.PI * 10) * cae;
      return { pose: p.poseBase, sx, sy, rot, dy: 0, posada: 0, activo: true, evento: 'rasca' };
    }
    const rot = 13 * Math.sin(ev.f * Math.PI * 7) * cae;
    sx *= 1 + 0.05 * Math.sin(ev.f * Math.PI * 14) * cae;
    return { pose: p.poseBase, sx, sy, rot, dy: 0, posada: 0, activo: true, evento: 'sacude' };
  }

  return { pose: p.poseBase, sx, sy, rot: 0, dy: 0, posada: 0, activo: true, evento: 'respira' };
}
