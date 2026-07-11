/*
 * useAudioMundo — LA CAPA SONORA del framework de mundos (spec S3, 0 KB).
 *
 * Sonido ambiental por mundo SIN UN SOLO ARCHIVO de audio: todo se SINTETIZA
 * con la WebAudio API (osciladores + ruido filtrado generado en memoria). Cada
 * mundo declara su PALETA SONORA en datos (mismo espíritu de mundoData.js):
 * un LECHO continuo (viento, quebrada, murmullo) + EVENTOS esporádicos (gotas,
 * aves, grillos, la campana del mercado). Volumen bajo, cálido, no molesto:
 * el sonido ACOMPAÑA la escena, nunca compite con la voz del agente.
 *
 * Reglas inviolables (mismas del patrón DR-3D-HAPTICA):
 *  - Toggle en usePrefsStore (clave `chagra:prefs:sonido`), DEFAULT 'off':
 *      'off'   → nunca suena (default — el sonido es opt-in).
 *      'suave' → ambiente muy tenue (media del volumen normal).
 *      'on'    → ambiente presente (igual bajo: es un fondo, no una pista).
 *  - Autoplay policy: el AudioContext se crea/reanuda SOLO tras un gesto del
 *    usuario (pointerdown/keydown). Antes del gesto, silencio total.
 *  - prefers-reduced-motion (o el override del host): el lecho pierde su
 *    ondulación (LFO plano) y los eventos rítmicos NO se programan — queda un
 *    fondo estático, sin "movimiento" sonoro.
 *  - Fade-in/out en toda transición valle↔mundo (y al ocultar la pestaña).
 *  - SSR-safe, cero dependencias, jamás throw: el sonido es realce, no requisito.
 *
 * MOTOR DE PILA (un solo AudioContext por app): cada host "reclama" su mundo
 * al montar (el valle reclama 'valle'; <Mundo> reclama el mundo abierto). El
 * reclamo MÁS RECIENTE suena; al desmontar se libera y el anterior retoma con
 * crossfade. Así entrar a un mundo funde el valle → mundo y volver, al revés.
 *
 * Three-free: seguro en el bundle base (lo importa el host <Mundo>).
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import usePrefsStore from '../../store/usePrefsStore.js';

/* ── Paletas sonoras por mundo (LOS DATOS) ─────────────────────────────────
 * lecho: capas continuas de ruido filtrado u oscilador.
 *   { fuente:'ruido', color:'blanco'|'rosa'|'cafe', filtro:{tipo,frec,q},
 *     gain, lfo?:{frec,prof} }  — prof 0..1 ondula el gain de la capa.
 * eventos: one-shots sintetizados, espaciados al azar en `cada` [min,max] seg.
 *   { tipo:'gota'|'ave'|'grillo'|'cluck'|'campana'|'burbuja'|'zumbido', cada, gain }
 */

/* Vientos reutilizables: la brisa es el hilo común de la finca andina. */
const VIENTO_SUAVE = { fuente: 'ruido', color: 'rosa', filtro: { tipo: 'lowpass', frec: 480, q: 0.5 }, gain: 0.32, lfo: { frec: 0.07, prof: 0.45 } };
const VIENTO_HOJAS = { fuente: 'ruido', color: 'rosa', filtro: { tipo: 'bandpass', frec: 1350, q: 0.6 }, gain: 0.16, lfo: { frec: 0.11, prof: 0.55 } };

export const PALETAS_SONORAS = {
  // El valle: la brisa dorada del mapa, un ave y un grillo muy de vez en cuando.
  valle: {
    lecho: [VIENTO_SUAVE],
    eventos: [
      { tipo: 'ave', cada: [9, 20], gain: 0.05 },
      { tipo: 'grillo', cada: [12, 26], gain: 0.05 },
    ],
  },
  // El suelo vivo: un lecho grave y tibio (la tierra respira) + vida que se mueve.
  suelo: {
    lecho: [
      { fuente: 'ruido', color: 'cafe', filtro: { tipo: 'lowpass', frec: 220, q: 0.6 }, gain: 0.5, lfo: { frec: 0.05, prof: 0.35 } },
    ],
    eventos: [{ tipo: 'burbuja', cada: [4, 10], gain: 0.07 }],
  },
  // El agua: la quebrada (ruido rosa en banda media, ondulante) + gotas.
  agua: {
    lecho: [
      { fuente: 'ruido', color: 'rosa', filtro: { tipo: 'bandpass', frec: 700, q: 0.7 }, gain: 0.4, lfo: { frec: 0.3, prof: 0.3 } },
      { fuente: 'ruido', color: 'blanco', filtro: { tipo: 'highpass', frec: 2600, q: 0.4 }, gain: 0.05, lfo: { frec: 0.5, prof: 0.4 } },
    ],
    eventos: [{ tipo: 'gota', cada: [1.5, 4.5], gain: 0.1 }],
  },
  // Los animales: brisa de corral + la gallina clueca + un ave del monte.
  animales: {
    lecho: [VIENTO_SUAVE],
    eventos: [
      { tipo: 'cluck', cada: [5, 12], gain: 0.09 },
      { tipo: 'ave', cada: [10, 22], gain: 0.05 },
    ],
  },
  // Diseño (bosque comestible): viento en el follaje + aves del monte.
  disenio: {
    lecho: [{ ...VIENTO_SUAVE, gain: 0.26 }, VIENTO_HOJAS],
    eventos: [{ tipo: 'ave', cada: [6, 14], gain: 0.07 }],
  },
  // Abono/compost: la pila viva — lecho tibio + burbujeo + una mosca que pasa.
  abono: {
    lecho: [
      { fuente: 'ruido', color: 'cafe', filtro: { tipo: 'lowpass', frec: 260, q: 0.6 }, gain: 0.45, lfo: { frec: 0.06, prof: 0.3 } },
    ],
    eventos: [
      { tipo: 'burbuja', cada: [3, 8], gain: 0.08 },
      { tipo: 'zumbido', cada: [9, 20], gain: 0.04 },
    ],
  },
  // Cultivos: la brisa entre las hojas del maíz + grillos de la milpa.
  cultivos: {
    lecho: [{ ...VIENTO_SUAVE, gain: 0.24 }, VIENTO_HOJAS],
    eventos: [{ tipo: 'grillo', cada: [5, 12], gain: 0.06 }],
  },
  // La milpa: mismas hermanas, mismo aire (comparte paleta con cultivos).
  milpa: {
    lecho: [{ ...VIENTO_SUAVE, gain: 0.24 }, VIENTO_HOJAS],
    eventos: [
      { tipo: 'grillo', cada: [5, 12], gain: 0.06 },
      { tipo: 'ave', cada: [11, 24], gain: 0.05 },
    ],
  },
  // El café: brisa templada del cafetal + el ave que lo acompaña.
  cafe: {
    lecho: [VIENTO_SUAVE, { ...VIENTO_HOJAS, gain: 0.1 }],
    eventos: [{ tipo: 'ave', cada: [7, 16], gain: 0.06 }],
  },
  // Frutales: brisa + la abeja polinizadora que pasa + un ave.
  frutales: {
    lecho: [VIENTO_SUAVE],
    eventos: [
      { tipo: 'zumbido', cada: [6, 13], gain: 0.06 },
      { tipo: 'ave', cada: [9, 20], gain: 0.05 },
    ],
  },
  // El mercado: el murmullo tenue de la plaza + un tintineo esporádico.
  mercado: {
    lecho: [
      { fuente: 'ruido', color: 'rosa', filtro: { tipo: 'bandpass', frec: 480, q: 1.1 }, gain: 0.34, lfo: { frec: 0.9, prof: 0.4 } },
      { fuente: 'ruido', color: 'rosa', filtro: { tipo: 'bandpass', frec: 950, q: 1.4 }, gain: 0.12, lfo: { frec: 0.55, prof: 0.5 } },
    ],
    eventos: [{ tipo: 'campana', cada: [9, 20], gain: 0.05 }],
  },
  // Sanidad (la huerta-clínica): brisa de huerta + insectos benéficos.
  sanidad: {
    lecho: [{ ...VIENTO_SUAVE, gain: 0.26 }, { ...VIENTO_HOJAS, gain: 0.1 }],
    eventos: [
      { tipo: 'zumbido', cada: [7, 15], gain: 0.05 },
      { tipo: 'grillo', cada: [8, 18], gain: 0.05 },
    ],
  },
  // El clima: el viento del páramo — hondo, ondulante, la fábrica de agua.
  clima: {
    lecho: [
      { fuente: 'ruido', color: 'rosa', filtro: { tipo: 'lowpass', frec: 380, q: 0.6 }, gain: 0.5, lfo: { frec: 0.08, prof: 0.55 } },
      { fuente: 'ruido', color: 'blanco', filtro: { tipo: 'bandpass', frec: 1900, q: 0.5 }, gain: 0.06, lfo: { frec: 0.13, prof: 0.6 } },
    ],
    eventos: [],
  },
  // Pisos térmicos: el viento abierto de la ladera + un ave lejana.
  pisos: {
    lecho: [{ ...VIENTO_SUAVE, gain: 0.34, lfo: { frec: 0.09, prof: 0.5 } }],
    eventos: [{ tipo: 'ave', cada: [10, 22], gain: 0.04 }],
  },
};

/* ── Constantes del motor ─────────────────────────────────────────────────── */

/* Volumen maestro por preferencia: BAJO a propósito (es un fondo cálido). */
const VOL_MAESTRO = { suave: 0.03, on: 0.065 };
const FADE_IN_S = 1.4; // constante de tiempo del fundido al entrar
const FADE_OUT_S = 0.5; // al salir (más ágil, ~1.5 s audibles)

const SOPORTA = typeof window !== 'undefined'
  && Boolean(window.AudioContext || window.webkitAudioContext);

/* ── Ruido 0 KB: buffers generados en memoria (blanco / rosa / café) ──────── */

function crearBufferRuido(ctx, color) {
  const n = Math.floor(ctx.sampleRate * 2.5);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (color === 'rosa') {
    // Filtro de Paul Kellet: ruido rosa económico y estable.
    let b0 = 0; let b1 = 0; let b2 = 0; let b3 = 0; let b4 = 0; let b5 = 0; let b6 = 0;
    for (let i = 0; i < n; i += 1) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else if (color === 'cafe') {
    let ultimo = 0;
    for (let i = 0; i < n; i += 1) {
      const w = Math.random() * 2 - 1;
      ultimo = (ultimo + 0.02 * w) / 1.02;
      d[i] = ultimo * 3.5;
    }
  } else {
    for (let i = 0; i < n; i += 1) d[i] = Math.random() * 2 - 1;
  }
  return buf;
}

/* ── One-shots sintetizados (los EVENTOS de la paleta) ────────────────────── */

function unaGota(ctx, out, gain) {
  const t = ctx.currentTime;
  const f0 = 480 + Math.random() * 620;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0 * 1.9, t);
  o.frequency.exponentialRampToValueAtTime(f0, t + 0.09);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.3);
}

function unAve(ctx, out, gain) {
  // Chirrido de 1-2 sílabas: seno con barrido, suave y lejano.
  const silabas = Math.random() < 0.45 ? 2 : 1;
  const f = 1500 + Math.random() * 900;
  for (let i = 0; i < silabas; i += 1) {
    const t = ctx.currentTime + i * 0.24;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * (1.25 + Math.random() * 0.2), t + 0.07);
    o.frequency.exponentialRampToValueAtTime(f * 0.92, t + 0.15);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.3);
  }
}

function unGrillo(ctx, out, gain) {
  // Portadora aguda con trémolo rápido: el cri-cri sin samples.
  const t = ctx.currentTime;
  const dur = 0.28 + Math.random() * 0.25;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const trem = ctx.createOscillator();
  const tremG = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(3900 + Math.random() * 900, t);
  trem.type = 'square';
  trem.frequency.setValueAtTime(34 + Math.random() * 10, t);
  tremG.gain.setValueAtTime(gain * 0.5, t);
  trem.connect(tremG).connect(g.gain);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain * 0.5, t + 0.05);
  g.gain.setTargetAtTime(0.0001, t + dur, 0.05);
  o.connect(g).connect(out);
  o.start(t);
  trem.start(t);
  o.stop(t + dur + 0.25);
  trem.stop(t + dur + 0.25);
}

function unCluck(ctx, out, gain) {
  // El cloqueo corto de la gallina: triángulo que cae, 1-2 golpes.
  const golpes = Math.random() < 0.4 ? 2 : 1;
  for (let i = 0; i < golpes; i += 1) {
    const t = ctx.currentTime + i * 0.18;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(310 + Math.random() * 60, t);
    o.frequency.exponentialRampToValueAtTime(170, t + 0.07);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.16);
  }
}

function unaCampana(ctx, out, gain) {
  // El tintineo de la balanza/campanita del puesto: parcial inarmónico + decay.
  const t = ctx.currentTime;
  const f = 720 + Math.random() * 420;
  [[1, 1], [2.76, 0.35]].forEach(([mult, peso]) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * mult, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * peso, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 1.4);
  });
}

function unaBurbuja(ctx, out, gain) {
  // El "plop" de la vida del suelo/compost: seno que sube rapidito.
  const t = ctx.currentTime;
  const f1 = 260 + Math.random() * 260;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f1 * 0.45, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + 0.07);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.2);
}

function unZumbido(ctx, out, gain) {
  // La abeja/mosca que pasa: sierra grave filtrada con vibrato, entra y se va.
  const t = ctx.currentTime;
  const dur = 1.1 + Math.random() * 0.6;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  const vib = ctx.createOscillator();
  const vibG = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(140 + Math.random() * 55, t);
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(420, t);
  vib.type = 'sine';
  vib.frequency.setValueAtTime(5.5 + Math.random() * 2, t);
  vibG.gain.setValueAtTime(9, t);
  vib.connect(vibG).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.3);
  g.gain.setTargetAtTime(0.0001, t + dur - 0.35, 0.14);
  o.connect(lp).connect(g).connect(out);
  o.start(t);
  vib.start(t);
  o.stop(t + dur + 0.4);
  vib.stop(t + dur + 0.4);
}

const EVENTOS = {
  gota: unaGota,
  ave: unAve,
  grillo: unGrillo,
  cluck: unCluck,
  campana: unaCampana,
  burbuja: unaBurbuja,
  zumbido: unZumbido,
};

/* ── El motor singleton (un AudioContext por app) ─────────────────────────── */

const motor = {
  ctx: null,
  master: null, // GainNode maestro (volumen por preferencia + mute de pestaña)
  buffers: {}, // ruido por color, generado una vez
  capa: null, // la paleta sonando: { id, bus, nodos, timers }
  pila: [], // reclamos [{ token, id }] — el último manda
  pref: 'off',
  rm: false,
  gestoOk: false, // ya hubo gesto del usuario (política de autoplay)
  escuchando: false,
  seq: 0,
};

function bufferRuido(color) {
  const c = color || 'blanco';
  if (!motor.buffers[c]) motor.buffers[c] = crearBufferRuido(motor.ctx, c);
  return motor.buffers[c];
}

function asegurarCtx() {
  if (motor.ctx || !SOPORTA) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    motor.ctx = new AC();
    const comp = motor.ctx.createDynamicsCompressor();
    comp.threshold.value = -30;
    comp.ratio.value = 6;
    motor.master = motor.ctx.createGain();
    motor.master.gain.value = 0;
    motor.master.connect(comp).connect(motor.ctx.destination);
    document.addEventListener('visibilitychange', () => {
      if (!motor.ctx) return;
      const t = motor.ctx.currentTime;
      const objetivo = document.hidden ? 0 : (VOL_MAESTRO[motor.pref] || 0);
      try { motor.master.gain.setTargetAtTime(objetivo, t, 0.3); } catch { /* noop */ }
    });
  } catch { motor.ctx = null; }
}

/* Enciende la paleta de un mundo: lecho + agenda de eventos, con fade-in. */
function encenderCapa(id) {
  const paleta = PALETAS_SONORAS[id];
  if (!paleta || !motor.ctx) return null;
  const { ctx } = motor;
  const t = ctx.currentTime;
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, t);
  bus.gain.setTargetAtTime(1, t, FADE_IN_S);
  bus.connect(motor.master);
  const nodos = [];
  const capa = { id, bus, nodos, timers: new Set() };

  (paleta.lecho || []).forEach((l) => {
    try {
      const src = ctx.createBufferSource();
      src.buffer = bufferRuido(l.color);
      src.loop = true;
      const filtro = ctx.createBiquadFilter();
      filtro.type = l.filtro?.tipo || 'lowpass';
      filtro.frequency.value = l.filtro?.frec || 600;
      filtro.Q.value = l.filtro?.q ?? 0.7;
      const g = ctx.createGain();
      const prof = motor.rm ? 0 : (l.lfo?.prof ?? 0);
      g.gain.value = l.gain * (1 - prof * 0.5);
      src.connect(filtro).connect(g).connect(bus);
      // La ondulación del lecho (la brisa que va y viene). Con reduced-motion
      // el fondo queda ESTÁTICO: sin vaivén, sin ritmo.
      if (l.lfo && prof > 0) {
        const lfo = ctx.createOscillator();
        const lfoG = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = l.lfo.frec;
        lfoG.gain.value = l.gain * prof * 0.5;
        lfo.connect(lfoG).connect(g.gain);
        lfo.start(t);
        nodos.push(lfo);
      }
      // Arranque en un punto aleatorio del loop: dos capas del mismo color no
      // suenan en fase (nada de "batido" artificial).
      src.start(t, Math.random() * 2);
      nodos.push(src);
    } catch { /* una capa que falla no tumba el ambiente */ }
  });

  // Eventos esporádicos — jamás bajo reduced-motion (son el "movimiento").
  if (!motor.rm) {
    (paleta.eventos || []).forEach((ev) => programarEvento(capa, ev));
  }
  return capa;
}

function programarEvento(capa, ev) {
  const [min, max] = ev.cada;
  const espera = (min + Math.random() * (max - min)) * 1000;
  const idTimer = setTimeout(() => {
    capa.timers.delete(idTimer);
    if (motor.capa !== capa || !motor.ctx || document.hidden) {
      if (motor.capa === capa) programarEvento(capa, ev); // pestaña oculta: reintenta
      return;
    }
    try { EVENTOS[ev.tipo]?.(motor.ctx, capa.bus, ev.gain); } catch { /* noop */ }
    programarEvento(capa, ev);
  }, espera);
  capa.timers.add(idTimer);
}

/* Apaga una paleta con fade-out y libera sus nodos al terminar. */
function apagarCapa(capa) {
  if (!capa || !motor.ctx) return;
  const t = motor.ctx.currentTime;
  capa.timers.forEach((id) => clearTimeout(id));
  capa.timers.clear();
  try { capa.bus.gain.setTargetAtTime(0.0001, t, FADE_OUT_S); } catch { /* noop */ }
  setTimeout(() => {
    capa.nodos.forEach((n) => { try { n.stop(); } catch { /* noop */ } });
    try { capa.bus.disconnect(); } catch { /* noop */ }
  }, FADE_OUT_S * 4000);
}

/* El corazón: decide QUÉ debe sonar (tope de la pila si la pref lo permite)
   y hace la transición con crossfade si cambió. */
function sincronizar() {
  const activo = motor.pref !== 'off' && motor.gestoOk && SOPORTA;
  const objetivo = activo && motor.pila.length
    ? motor.pila[motor.pila.length - 1].id
    : null;

  if (objetivo && !motor.ctx) asegurarCtx();
  if (!motor.ctx) return;
  if (motor.ctx.state === 'suspended') { motor.ctx.resume().catch(() => {}); }

  const t = motor.ctx.currentTime;
  const vol = activo && !document.hidden ? (VOL_MAESTRO[motor.pref] || 0) : 0;
  try { motor.master.gain.setTargetAtTime(vol, t, 0.4); } catch { /* noop */ }

  if (motor.capa?.id === objetivo) return;
  if (motor.capa) { apagarCapa(motor.capa); motor.capa = null; }
  if (objetivo) motor.capa = encenderCapa(objetivo);
}

/* Reconstruye la capa activa (cambió reduced-motion: el lecho cambia de forma). */
function reconstruir() {
  if (!motor.capa) return;
  const { id } = motor.capa;
  apagarCapa(motor.capa);
  motor.capa = encenderCapa(id);
}

function reclamar(id) {
  motor.seq += 1;
  const token = motor.seq;
  motor.pila.push({ token, id });
  sincronizar();
  return token;
}

function liberar(token) {
  motor.pila = motor.pila.filter((r) => r.token !== token);
  sincronizar();
}

/* Política de autoplay: el primer gesto habilita el motor para siempre (y
   reanima un contexto suspendido). Listener pasivo, permanente y barato. */
function escucharGesto() {
  if (motor.escuchando || typeof window === 'undefined') return;
  motor.escuchando = true;
  const alGesto = () => {
    const primero = !motor.gestoOk;
    motor.gestoOk = true;
    if (motor.ctx?.state === 'suspended') motor.ctx.resume().catch(() => {});
    if (primero) sincronizar();
  };
  window.addEventListener('pointerdown', alGesto, { passive: true, capture: true });
  window.addEventListener('keydown', alGesto, { passive: true, capture: true });
}

/* ── Suscripción viva a prefers-reduced-motion (mismo patrón de useHaptics) ── */
function subRM(cb) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener?.('change', cb);
  return () => mq.removeEventListener?.('change', cb);
}
function getRM() {
  return typeof window !== 'undefined'
    && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

/**
 * @param {object} [opts]
 * @param {string|null} [opts.mundoId]  el mundo cuya paleta se reclama mientras
 *   el host esté montado (null → no reclama nada; el anterior sigue sonando).
 * @param {boolean} [opts.reducedMotion]  override del host (el árbol de mundos
 *   ya propaga `reducedMotion`); si se omite, el hook escucha el media query.
 * @returns {{ supported: boolean, enabled: boolean, pref: string }}
 */
export default function useAudioMundo({ mundoId = null, reducedMotion } = {}) {
  const pref = usePrefsStore((s) => s.sonido ?? 'off'); // 'off' | 'suave' | 'on'
  const rm = useSyncExternalStore(subRM, getRM, () => false);
  const menosMov = reducedMotion ?? rm;

  // Entorno del motor: preferencia + reduced-motion (reconstruye si cambia).
  useEffect(() => {
    escucharGesto();
    motor.pref = pref;
    const rmCambio = motor.rm !== menosMov;
    motor.rm = menosMov;
    if (rmCambio) reconstruir();
    sincronizar();
  }, [pref, menosMov]);

  // El reclamo del mundo: entra al montar, sale (con fade) al desmontar.
  useEffect(() => {
    if (!mundoId || !PALETAS_SONORAS[mundoId]) return undefined;
    const token = reclamar(mundoId);
    return () => liberar(token);
  }, [mundoId]);

  return useMemo(() => ({
    supported: SOPORTA,
    enabled: SOPORTA && pref !== 'off',
    pref,
  }), [pref]);
}
