/**
 * idleMachine — LA MÁQUINA IDLE del compAI del valle. Puertos de
 * `A/src/visual/creatures/creatureIdle.js` (chagra PWA), NO reinventada.
 *
 * El PROBLEMA que cierra (audit de 107 comportamientos, ítem #20 y sig.): el
 * compAI de `V/` (`marco.js`, `portales.js`) monta artwork — un rig SVG
 * multi-pose o una lámina PNG — y lo mueve por SALTOS discretos: cambia de
 * dibujo, o de posición al caminar. Entre un salto y el siguiente, **nada se
 * mueve**: ni respira, ni mira, ni reacciona. Es el "accesorio" que el SPEC
 * del operador prohíbe.
 *
 * La PWA ya resolvió esto para su familia rubber-hose con `creatureIdle.js`:
 * funciones PURAS y DETERMINISTAS que devuelven una pose continua (escala
 * squash&stretch, rotación, desplazamiento) a partir del reloj y un perfil
 * por especie. Aquí se porta EL MISMO PATRÓN — hash determinista, ventanas de
 * evento sin pre-empciones, perfiles por especie — adaptado al contexto del
 * valle: un DOM (no three.js) mostrando un retrato/rig, no un bicho flotante
 * de cuerpo simétrico.
 *
 * ── QUÉ CAMBIA respecto al original, y por qué ──────────────────────────────
 *   · Sin carril `percha`: nada aquí se posa en una flor — el compAI del
 *     valle vive en una insignia fija (marco.js) o pegado al suelo del mundo
 *     (portales.js), no tiene dónde aterrizar.
 *   · `vuelta` (giro de 360°) se vuelve `gesto`: un bote + inclinación
 *     ACOTADA (± grados, nunca 360). Un retrato rectangular (la lámina del
 *     jaguar mide 705×394, la del chivito 397×654) dando una vuelta de
 *     campana se ve como una moneda girando, no como un gesto — el bicho
 *     redondo de la PWA sí lo soporta, el retrato del valle no.
 *   · Se agrega el carril `mira`: continuo, subliminal, el que la PWA no
 *     necesitaba (Angelita vuela y ya "mira" con el vaivén de vuelo) pero que
 *     el compAI quieto del valle sí — sin él, entre gestos discretos el
 *     personaje queda mirando fijo al frente como un cartel.
 *
 * Contrato de salida — el consumidor lo aplica como
 * `transform: scale(sx,sy) rotate(rot deg) translateY(dy * altoPx)`:
 *   { sx, sy, rot, dy, evento }
 *   sx/sy    escala squash&stretch (respiración de base, siempre activa).
 *   rot      grados de giro en el plano — mira/rasca/gesto se turnan aquí.
 *   dy       fracción del alto del elemento (negativo = sube) — el bote del
 *            gesto; 0 en reposo.
 *   evento   'respira'|'mira'|'rasca'|'sacude'|'gesto' — para quien quiera
 *            reaccionar (p.ej. depurar en consola, o el gate visual).
 *
 * Cero dependencias, cero DOM, cero three — igual que el resto de `compai/`
 * (ver MANIFIESTO.md): se puede testear sin navegador.
 *
 * @module compai/idleMachine
 */

/* ── determinismo: el mismo hash entero que creatureIdle.js ──────────────── */

/** Semilla estable por slug de personaje (dos personajes nunca sincronizan). */
export function semillaDe(slug) {
  let h = 9;
  const s = String(slug || '');
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
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

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const suave = (x) => { const c = clamp01(x); return c * c * (3 - 2 * c); }; // smoothstep
/** Ease back-out: se pasa de largo y asienta — el overshoot rubber-hose. */
function backOut(x) {
  const c = 1.7; const u = clamp01(x) - 1;
  return 1 + u * u * ((c + 1) * u + c);
}

/**
 * Ventana determinista del evento `id`: el ciclo k ocupa [k·base,(k+1)·base)
 * y el evento arranca en k·base + azar·jitter, dura `dur`. El ciclo 0 se
 * salta (nadie hace nada apenas nace: un período completo de calentamiento).
 */
function ventana(t, semilla, id, { base, jitter, dur }) {
  const k = Math.floor(t / base);
  if (k <= 0) return null;
  const inicio = k * base + azar01(semilla, id, k) * jitter;
  const f = (t - inicio) / dur;
  return f >= 0 && f < 1 ? { f, k } : null;
}

const EV = { aseo: 1, tipoAseo: 2, gesto: 3 };
const CARRILES = [
  { tipo: 'gesto', id: EV.gesto },
  { tipo: 'aseo', id: EV.aseo },
];

/* ── perfiles por especie: LA MISMA máquina, otro animal (o pájaro, o perro) ─
   respira {freq,amp,vaiven} — el pulso de base, siempre activo.
   mira    {freq,amp}        — vaivén continuo de "mirar alrededor".
   aseo    {base,jitter,dur} — rasca/sacude, se turnan por azar del ciclo.
   gesto   {base,jitter,dur,alza,incl} — el bote+inclinación grande. */
export const IDLE_PERFILES = {
  // Tetragonisca angustula — inquieta, todo late rápido (mismos números que
  // `abeja-angelita` en creatureIdle.js: es LA MISMA abeja).
  angelita: {
    respira: { freq: 2.0, amp: 0.036, vaiven: 0.31 },
    mira: { freq: 0.55, amp: 7 },
    aseo: { base: 9, jitter: 3, dur: 1.0 },
    gesto: { base: 16, jitter: 3, dur: 1.3, alza: 0.10, incl: 10 },
  },
  // Panthera onca — poder CONTENIDO: respira lento y hondo, casi no mira (ya
  // vio todo), cuando gesticula es un alzamiento de cabeza orgulloso y lento.
  jaguar: {
    respira: { freq: 0.85, amp: 0.032, vaiven: 0.21 },
    mira: { freq: 0.22, amp: 5 },
    aseo: { base: 17, jitter: 4, dur: 1.7 },
    gesto: { base: 34, jitter: 6, dur: 2.2, alza: 0.05, incl: 6 },
  },
  // Tremarctos ornatus — pesado y entrañable: respira hondo, se acomoda
  // despacio, el gesto es un bamboleo grande de quien tiene tiempo de sobra.
  oso: {
    respira: { freq: 1.0, amp: 0.045, vaiven: 0.23 },
    mira: { freq: 0.28, amp: 6 },
    aseo: { base: 15, jitter: 4, dur: 1.8 },
    gesto: { base: 30, jitter: 6, dur: 2.4, alza: 0.06, incl: 9 },
  },
  // Didelphis marsupialis — nocturna y ALERTA: pasos cortos, husmea el aire
  // todo el tiempo (mira frecuente y rápida), aseo corto y seguido.
  zariguya: {
    respira: { freq: 1.4, amp: 0.04, vaiven: 0.28 },
    mira: { freq: 0.62, amp: 8 },
    aseo: { base: 8, jitter: 2.5, dur: 1.0 },
    gesto: { base: 19, jitter: 4, dur: 1.5, alza: 0.07, incl: 8 },
  },
  // Luciérnaga — delicada y menuda: respiración liviana pero visible (poca
  // masa, se nota más el temblor), mira rápido y corto, aseo de alitas breve,
  // el "gesto" es apenas un parpadeo de vuelo, nunca un bote grande.
  luciernaga: {
    respira: { freq: 2.3, amp: 0.03, vaiven: 0.4 },
    mira: { freq: 0.7, amp: 6 },
    aseo: { base: 10, jitter: 3, dur: 0.8 },
    gesto: { base: 14, jitter: 3, dur: 1.1, alza: 0.05, incl: 7 },
  },
  // El chivito del páramo (ave, versión punk): perky, cabecea seguido como
  // los pájaros, y cuando gesticula lo hace con ganas — mohicano al viento.
  'chivito-punk': {
    respira: { freq: 1.55, amp: 0.038, vaiven: 0.33 },
    mira: { freq: 0.66, amp: 9 },
    aseo: { base: 10, jitter: 3, dur: 1.0 },
    gesto: { base: 15, jitter: 3, dur: 1.4, alza: 0.09, incl: 12 },
  },
  // Dante — beagle, sabueso: la nariz manda. `mira` MUY frecuente (olfatea
  // el aire todo el rato), aseo = se rasca la oreja, gesto = colita feliz
  // traducida en un bote corto y seguido.
  dante: {
    respira: { freq: 1.3, amp: 0.04, vaiven: 0.3 },
    mira: { freq: 0.85, amp: 10 },
    aseo: { base: 9, jitter: 2.5, dur: 1.1 },
    gesto: { base: 13, jitter: 3, dur: 1.2, alza: 0.08, incl: 9 },
  },
  // Oliver — dálmata, «la locura»: el más ENERGÉTICO de los ocho a propósito
  // (su poder en el kart es sembrar caos): respira más rápido que Dante, mira
  // por todo lado sin quedarse quieto, gesto grande y seguido — para que NO
  // se sienta el mismo perro con otro color encima.
  oliver: {
    respira: { freq: 1.75, amp: 0.044, vaiven: 0.36 },
    mira: { freq: 1.05, amp: 12 },
    aseo: { base: 7, jitter: 2, dur: 0.9 },
    gesto: { base: 10, jitter: 2.5, dur: 1.3, alza: 0.11, incl: 13 },
  },
  // Legado: personajes que ya no están en el roster de 8 pero pueden seguir
  // guardados en `localStorage` de una visita vieja — no se les apaga la vida.
  guacamaya: {
    respira: { freq: 1.6, amp: 0.036, vaiven: 0.35 },
    mira: { freq: 0.5, amp: 9 },
    aseo: { base: 12, jitter: 3, dur: 1.1 },
    gesto: { base: 18, jitter: 4, dur: 1.6, alza: 0.09, incl: 10 },
  },
  chivito: {
    respira: { freq: 1.5, amp: 0.037, vaiven: 0.32 },
    mira: { freq: 0.6, amp: 8 },
    aseo: { base: 10, jitter: 3, dur: 1.0 },
    gesto: { base: 16, jitter: 3, dur: 1.3, alza: 0.08, incl: 10 },
  },
};

/** Perfil neutro para cualquier slug sin entrada propia — vive, no se apaga. */
const PERFIL_DEFECTO = {
  respira: { freq: 1.3, amp: 0.038, vaiven: 0.3 },
  mira: { freq: 0.5, amp: 7 },
  aseo: { base: 11, jitter: 3, dur: 1.1 },
  gesto: { base: 18, jitter: 4, dur: 1.5, alza: 0.07, incl: 9 },
};

export const IDLE_NEUTRO = Object.freeze({ sx: 1, sy: 1, rot: 0, dy: 0, evento: null });

/**
 * MIRA — SÓLO el vaivén continuo de "mirar alrededor", en grados. Aparte de
 * `idleDeCompai` a propósito: `portales.js` ya trae su propia respiración y
 * su propio sistema de gestos (el bob de vuelo, el wobble del `gesto` de
 * rig) desde antes de este módulo — lo único que le faltaba era ESTA capa, y
 * pedirle el pose completo duplicaría la respiración en vez de sumarle vida.
 * Mezcla de dos senos (períodos no conmensurables) para que no se sienta de
 * metrónomo: SIN esto el personaje mira fijo entre gestos, como un cartel.
 * @param {number} t
 * @param {object} [opts]
 * @param {string} [opts.perfil='angelita']
 * @param {number} [opts.semilla]
 * @returns {number} grados de giro, pequeño (~±5 a ±12° según el perfil).
 */
export function miraDeCompai(t, { perfil = 'angelita', semilla } = {}) {
  const p = IDLE_PERFILES[perfil] || PERFIL_DEFECTO;
  const s = (semilla ?? semillaDe(perfil)) >>> 0;
  return p.mira.amp * (
    0.65 * Math.sin(t * p.mira.freq + s % 7)
    + 0.35 * Math.sin(t * p.mira.freq * 0.41 + (s % 11) * 0.7)
  );
}

/**
 * LA MÁQUINA: pose idle del instante `t` para un personaje del valle. Pura y
 * determinista — misma entrada, misma pose; nunca usa `Math.random`.
 *
 * @param {number} t  segundos de reloj (p.ej. `performance.now()/1000`).
 * @param {object} [opts]
 * @param {string} [opts.perfil='angelita']  slug de `IDLE_PERFILES`.
 * @param {number} [opts.semilla]  override (default: `semillaDe(perfil)`).
 * @param {boolean} [opts.reducedMotion=false]  pose neutra, sin animar.
 * @returns {{sx:number,sy:number,rot:number,dy:number,evento:string|null}}
 */
export function idleDeCompai(t, { perfil = 'angelita', semilla, reducedMotion = false } = {}) {
  if (reducedMotion) return IDLE_NEUTRO;
  const p = IDLE_PERFILES[perfil] || PERFIL_DEFECTO;
  const s = (semilla ?? semillaDe(perfil)) >>> 0;

  // RESPIRA — el squash&stretch de base: dos ondas que nunca comparten compás,
  // igual que creatureIdle.js. Todo lo demás se monta encima.
  const resp = Math.sin(t * p.respira.freq) * (1 + 0.35 * Math.sin(t * p.respira.vaiven));
  const sx0 = 1 + p.respira.amp * resp;
  const sy0 = 1 - p.respira.amp * 1.3 * resp;

  // MIRA — vaivén continuo y subliminal: SIN esto el personaje mira fijo
  // entre gestos, como un cartel. Función propia (`miraDeCompai`, más abajo)
  // para quien YA tiene su propia respiración/gestos (p.ej. `portales.js`,
  // que trae wobble+bob desde antes) y sólo le falta ESTA capa.
  const miraRot = miraDeCompai(t, { perfil, semilla: s });

  // Resolución de carriles sin pre-empciones (creatureIdle.js): entre los
  // activos gana el que arrancó primero, y un evento solo vale si arrancó en
  // silencio (nadie más corriendo en su instante de arranque).
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
      return w !== null && w.f > 0;
    });
    if (!bloqueado) { ev = cand; break; }
  }

  // GESTO — el bote + inclinación grande: sube con overshoot, sostiene un
  // instante, y asienta. Nunca gira 360: es un retrato, no un bicho redondo.
  if (ev && ev.tipo === 'gesto') {
    const f = ev.f;
    let dy;
    if (f < 0.3) dy = -p.gesto.alza * backOut(f / 0.3);
    else if (f < 0.62) dy = -p.gesto.alza;
    else dy = -p.gesto.alza * (1 - suave((f - 0.62) / 0.38));
    const rot = miraRot + p.gesto.incl * Math.sin(Math.PI * f);
    const s2 = 1 + 0.06 * Math.sin(Math.PI * f);
    return { sx: sx0 * s2, sy: sy0 * (2 - s2), rot, dy, evento: 'gesto' };
  }

  // ASEO — rasca (se ladea, jiggle corto) o sacude (perro mojado / sacudón de
  // alas); cuál toca lo decide el hash del ciclo. Ambos DECAEN, no cortan.
  if (ev && ev.tipo === 'aseo') {
    const cae = 1 - suave(ev.f);
    if (azar01(s, EV.tipoAseo, ev.k) < 0.5) {
      const rot = miraRot - 9 * Math.sin(Math.PI * Math.min(1, ev.f * 1.15));
      const sy = sy0 * (1 + 0.035 * Math.sin(ev.f * Math.PI * 9) * cae);
      return { sx: sx0, sy, rot, dy: 0, evento: 'rasca' };
    }
    const rot = miraRot + 12 * Math.sin(ev.f * Math.PI * 7) * cae;
    const sx = sx0 * (1 + 0.045 * Math.sin(ev.f * Math.PI * 13) * cae);
    return { sx, sy: sy0, rot, dy: 0, evento: 'sacude' };
  }

  // Reposo: respira + mira, el default entre gestos.
  return { sx: sx0, sy: sy0, rot: miraRot, dy: 0, evento: Math.abs(miraRot) > 1.5 ? 'mira' : 'respira' };
}

export default { IDLE_PERFILES, idleDeCompai, miraDeCompai, semillaDe, azar01, IDLE_NEUTRO };
