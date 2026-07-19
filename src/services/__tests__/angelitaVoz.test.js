/*
 * angelitaVoz.test — la GARGANTA ÚNICA, probada de verdad (no emergente).
 *
 * Lo que estos tests garantizan:
 *   1. Dos mensajes seguidos JAMÁS suenan a la vez (serialización).
 *   2. La política de llegada es la documentada: mayor interrumpe, igual
 *      encola, AMBIENTE se descarta si está ocupada, reemplaza vacía todo.
 *   3. Un fallo del motor (red caída, kokoro muerto) no cuelga la cola ni
 *      pierde el mensaje: el TEXTO se emite siempre y decir() resuelve.
 *   4. El watchdog corta un motor colgado y la cola sigue.
 *   5. Sin gesto de usuario no se intenta audio (autoplay policy); con
 *      prefers-reduced-motion lo espontáneo (AMBIENTE) queda en texto.
 *
 * El motor es inyectado (cero audio real, cero red): se prueba la
 * AUTORIDAD, no la síntesis (esa vive en ttsService y sus propios tests).
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  decir,
  callar,
  estaHablando,
  estadoCola,
  onTexto,
  politicaLlegada,
  marcarGesto,
  setAudioHabilitado,
  PRIORIDAD,
  MOTIVO,
  MAX_COLA,
  WATCHDOG_BASE_MS,
  WATCHDOG_POR_CHAR_MS,
  __resetParaTests,
} from '../angelitaVoz.js';

/** Motor controlable: cada decir() queda pendiente hasta resolverlo a mano. */
function motorControlable() {
  const pendientes = [];
  const motor = {
    decir: vi.fn((texto) => new Promise((res, rej) => {
      pendientes.push({ res, rej, texto });
    })),
    parar: vi.fn(),
  };
  motor.terminaActual = (sono = true) => { pendientes.shift()?.res(sono); };
  motor.fallaActual = () => { pendientes.shift()?.rej(new Error('motor caído')); };
  return motor;
}

/** Deja correr las microtareas + timers 0 (la cola activa en microtask). */
const tick = () => new Promise((r) => setTimeout(r, 0));

let motor;

beforeEach(() => {
  motor = motorControlable();
  __resetParaTests({ motor, gesto: true, audio: true });
});

afterEach(() => {
  callar();
  vi.useRealTimers();
});

describe('política de llegada (pura)', () => {
  test('sin nada sonando, reproduce', () => {
    expect(politicaLlegada({ prioridad: PRIORIDAD.AMBIENTE }, null)).toBe('reproducir');
  });
  test('prioridad mayor interrumpe', () => {
    expect(politicaLlegada(
      { prioridad: PRIORIDAD.ALERTA },
      { prioridad: PRIORIDAD.NORMAL },
    )).toBe('interrumpir');
  });
  test('prioridad igual encola', () => {
    expect(politicaLlegada(
      { prioridad: PRIORIDAD.RESPUESTA },
      { prioridad: PRIORIDAD.RESPUESTA },
    )).toBe('encolar');
  });
  test('AMBIENTE con algo sonando se descarta (su momento pasó)', () => {
    expect(politicaLlegada(
      { prioridad: PRIORIDAD.AMBIENTE },
      { prioridad: PRIORIDAD.NORMAL },
    )).toBe('descartar');
  });
  test('menor no-ambiente espera turno', () => {
    expect(politicaLlegada(
      { prioridad: PRIORIDAD.NORMAL },
      { prioridad: PRIORIDAD.RESPUESTA },
    )).toBe('encolar');
  });
});

describe('serialización — nunca dos audios a la vez', () => {
  test('el segundo mensaje espera a que termine el primero', async () => {
    const p1 = decir('Primero le cuento esto.', { prioridad: PRIORIDAD.NORMAL });
    await tick();
    const p2 = decir('Y después esto otro.', { prioridad: PRIORIDAD.NORMAL });
    await tick();

    // Con el primero aún sonando, el motor SOLO fue llamado una vez.
    expect(motor.decir).toHaveBeenCalledTimes(1);
    expect(estadoCola().pendientes).toHaveLength(1);

    motor.terminaActual(true);
    await expect(p1).resolves.toEqual({ hablado: true, motivo: MOTIVO.OK });
    await tick();

    // Solo al terminar el primero arranca el segundo.
    expect(motor.decir).toHaveBeenCalledTimes(2);
    expect(motor.decir.mock.calls[1][0]).toMatch(/después esto otro/);
    motor.terminaActual(true);
    await expect(p2).resolves.toEqual({ hablado: true, motivo: MOTIVO.OK });
    expect(estaHablando()).toBe(false);
  });

  test('mismo texto repetido no se apila (dedup)', async () => {
    decir('Se repite igualito.', { prioridad: PRIORIDAD.NORMAL });
    await tick();
    const res = await decir('Se repite igualito.', { prioridad: PRIORIDAD.NORMAL });
    expect(res.motivo).toBe(MOTIVO.DUPLICADO);
    expect(motor.decir).toHaveBeenCalledTimes(1);
  });
});

describe('interrupción por prioridad', () => {
  test('una ALERTA corta lo que suena y suena ya', async () => {
    const pNormal = decir('Aviso tranquilo del día.', { prioridad: PRIORIDAD.NORMAL });
    await tick();
    expect(motor.decir).toHaveBeenCalledTimes(1);

    const pAlerta = decir('¡Riesgo de helada esta noche!', { prioridad: PRIORIDAD.ALERTA });
    // El interrumpido resuelve de una: cortado, no se reanuda.
    await expect(pNormal).resolves.toEqual({ hablado: false, motivo: MOTIVO.INTERRUMPIDO });
    expect(motor.parar).toHaveBeenCalled();
    await tick();
    expect(motor.decir).toHaveBeenCalledTimes(2);
    expect(motor.decir.mock.calls[1][0]).toMatch(/helada/);

    // El settle tardío del motor viejo NO rompe ni pisa al nuevo.
    motor.terminaActual(true); // resuelve la promesa pendiente del viejo
    await tick();
    expect(estadoCola().actual?.texto).toMatch(/helada/);
    motor.terminaActual(true);
    await expect(pAlerta).resolves.toEqual({ hablado: true, motivo: MOTIVO.OK });
  });

  test('la interrupción purga lo AMBIENTE encolado', async () => {
    decir('Respuesta larga del agente.', { prioridad: PRIORIDAD.RESPUESTA });
    await tick();
    // NORMAL espera turno; llega ALERTA: interrumpe y el NORMAL sobrevive.
    const pNormal = decir('Recordatorio de riego.', { prioridad: PRIORIDAD.NORMAL });
    const pAlerta = decir('¡Alerta seria!', { prioridad: PRIORIDAD.ALERTA });
    await tick();
    expect(estadoCola().actual?.texto).toMatch(/Alerta seria/);
    expect(estadoCola().pendientes.map((m) => m.texto)).toEqual(['Recordatorio de riego.']);
    motor.terminaActual(true); // settle tardío del interrumpido (no-op)
    motor.terminaActual(true); // termina la alerta
    await pAlerta;
    await tick();
    motor.terminaActual(true); // termina el normal
    await expect(pNormal).resolves.toEqual({ hablado: true, motivo: MOTIVO.OK });
  });

  test('AMBIENTE llegando con la garganta ocupada se descarta', async () => {
    decir('Estoy contando algo.', { prioridad: PRIORIDAD.NORMAL });
    await tick();
    const res = await decir('Mire ese colibrí.', { prioridad: PRIORIDAD.AMBIENTE });
    expect(res).toEqual({ hablado: false, motivo: MOTIVO.OCUPADA });
    expect(motor.decir).toHaveBeenCalledTimes(1);
    expect(estadoCola().pendientes).toHaveLength(0);
  });

  test('reemplaza:true vacía todo y suena ya (modo chat)', async () => {
    const pVieja = decir('Respuesta vieja.', { prioridad: PRIORIDAD.RESPUESTA });
    await tick();
    const pEncolada = decir('Otra en cola.', { prioridad: PRIORIDAD.RESPUESTA });
    const pNueva = decir('Respuesta nueva.', { prioridad: PRIORIDAD.RESPUESTA, reemplaza: true });
    await expect(pVieja).resolves.toEqual({ hablado: false, motivo: MOTIVO.CALLADA });
    await expect(pEncolada).resolves.toEqual({ hablado: false, motivo: MOTIVO.CALLADA });
    await tick();
    expect(estadoCola().actual?.texto).toBe('Respuesta nueva.');
    motor.terminaActual(true); // settle tardío del viejo
    motor.terminaActual(true);
    await expect(pNueva).resolves.toEqual({ hablado: true, motivo: MOTIVO.OK });
  });
});

describe('tope de cola', () => {
  test('con la cola llena, el excedente resuelve cola-llena y nada cuelga', async () => {
    decir('Sonando.', { prioridad: PRIORIDAD.NORMAL });
    await tick();
    for (let i = 0; i < MAX_COLA; i++) {
      // Las encoladas quedan pendientes; el afterEach (callar) las resuelve.
      decir(`En cola número ${i}.`, { prioridad: PRIORIDAD.NORMAL });
    }
    const excedente = await decir('Yo ya no quepo.', { prioridad: PRIORIDAD.NORMAL });
    expect(excedente.motivo).toBe(MOTIVO.COLA_LLENA);
    expect(estadoCola().pendientes).toHaveLength(MAX_COLA);
  });
});

describe('degradación digna (offline-first)', () => {
  test('el texto SIEMPRE llega, aunque el motor falle, y la cola avanza', async () => {
    const textos = [];
    onTexto((m) => textos.push(m.texto));

    const p1 = decir('Este audio va a fallar.', { prioridad: PRIORIDAD.NORMAL });
    await tick();
    const p2 = decir('Yo sí debo sonar después.', { prioridad: PRIORIDAD.NORMAL });

    motor.fallaActual(); // red caída / kokoro muerto
    await expect(p1).resolves.toEqual({ hablado: false, motivo: MOTIVO.AUDIO_FALLO });
    await tick();
    // La cola NO se colgó: el siguiente arrancó solo.
    expect(motor.decir).toHaveBeenCalledTimes(2);
    motor.terminaActual(true);
    await expect(p2).resolves.toEqual({ hablado: true, motivo: MOTIVO.OK });

    // Ambos textos llegaron a la UI pase lo que pase con el audio.
    expect(textos).toEqual(['Este audio va a fallar.', 'Yo sí debo sonar después.']);
  });

  test('motor que devuelve false (nada sonó) resuelve audio-fallo sin colgar', async () => {
    const p = decir('Nadie me reprodujo.', { prioridad: PRIORIDAD.NORMAL });
    await tick();
    motor.terminaActual(false);
    await expect(p).resolves.toEqual({ hablado: false, motivo: MOTIVO.AUDIO_FALLO });
    expect(estaHablando()).toBe(false);
  });

  test('WATCHDOG: un motor colgado se corta y la cola sigue', async () => {
    vi.useFakeTimers();
    const colgado = {
      decir: vi.fn(() => new Promise(() => { /* jamás resuelve */ })),
      parar: vi.fn(),
    };
    __resetParaTests({ motor: colgado, gesto: true });

    const texto = 'Me voy a quedar pegado.';
    const p1 = decir(texto, { prioridad: PRIORIDAD.NORMAL });
    const p2 = decir('Yo espero mi turno.', { prioridad: PRIORIDAD.NORMAL });
    await vi.advanceTimersByTimeAsync(0);
    expect(colgado.decir).toHaveBeenCalledTimes(1);

    const plazo = WATCHDOG_BASE_MS + texto.length * WATCHDOG_POR_CHAR_MS;
    await vi.advanceTimersByTimeAsync(plazo + 10);

    expect(colgado.parar).toHaveBeenCalled();
    await expect(p1).resolves.toEqual({ hablado: false, motivo: MOTIVO.WATCHDOG });
    // La cola avanzó al siguiente en vez de quedarse rehén.
    expect(colgado.decir).toHaveBeenCalledTimes(2);
    callar();
    await p2;
  });
});

describe('autoplay y calma', () => {
  test('sin gesto del usuario NO se intenta audio, pero el texto llega', async () => {
    __resetParaTests({ motor, gesto: false });
    const textos = [];
    onTexto((m) => textos.push(m.texto));

    const res = await decir('Hola sin gesto.', { prioridad: PRIORIDAD.RESPUESTA });
    expect(res).toEqual({ hablado: false, motivo: MOTIVO.SIN_GESTO });
    expect(motor.decir).not.toHaveBeenCalled();
    expect(textos).toEqual(['Hola sin gesto.']);

    // Tras el gesto, la voz ya puede.
    marcarGesto();
    decir('Ahora sí con gesto.', { prioridad: PRIORIDAD.RESPUESTA });
    await tick();
    expect(motor.decir).toHaveBeenCalledTimes(1);
  });

  test('con audio deshabilitado resuelve audio-off y el texto llega', async () => {
    setAudioHabilitado(false);
    const textos = [];
    onTexto((m) => textos.push(m.texto));
    const res = await decir('Solo texto, por favor.', { prioridad: PRIORIDAD.NORMAL });
    expect(res).toEqual({ hablado: false, motivo: MOTIVO.AUDIO_OFF });
    expect(motor.decir).not.toHaveBeenCalled();
    expect(textos).toEqual(['Solo texto, por favor.']);
  });

  test('prefers-reduced-motion calla lo espontáneo (AMBIENTE) pero no lo pedido', async () => {
    const matchMediaOriginal = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    try {
      const ambiente = await decir('Comentario espontáneo.', { prioridad: PRIORIDAD.AMBIENTE });
      expect(ambiente).toEqual({ hablado: false, motivo: MOTIVO.CALMA });
      expect(motor.decir).not.toHaveBeenCalled();

      decir('Usted me pidió oír esto.', { prioridad: PRIORIDAD.RESPUESTA });
      await tick();
      expect(motor.decir).toHaveBeenCalledTimes(1);
    } finally {
      window.matchMedia = matchMediaOriginal;
    }
  });
});

describe('callar y entradas inválidas', () => {
  test('callar() corta lo actual y vacía la cola (todo resuelve callada)', async () => {
    const p1 = decir('Sonando ahora.', { prioridad: PRIORIDAD.NORMAL });
    await tick();
    const p2 = decir('Esperando turno.', { prioridad: PRIORIDAD.NORMAL });
    callar();
    await expect(p1).resolves.toEqual({ hablado: false, motivo: MOTIVO.CALLADA });
    await expect(p2).resolves.toEqual({ hablado: false, motivo: MOTIVO.CALLADA });
    expect(motor.parar).toHaveBeenCalled();
    expect(estaHablando()).toBe(false);
    expect(estadoCola().pendientes).toHaveLength(0);
  });

  test('texto vacío o no-string resuelve vacio sin tocar el motor', async () => {
    await expect(decir('')).resolves.toEqual({ hablado: false, motivo: MOTIVO.VACIO });
    await expect(decir('   ')).resolves.toEqual({ hablado: false, motivo: MOTIVO.VACIO });
    await expect(decir(null)).resolves.toEqual({ hablado: false, motivo: MOTIVO.VACIO });
    expect(motor.decir).not.toHaveBeenCalled();
  });
});
