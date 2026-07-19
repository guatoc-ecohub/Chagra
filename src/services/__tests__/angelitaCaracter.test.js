/*
 * angelitaCaracter.test — el carácter de la voz de Angelita.
 *
 * Garantiza que el "aterciopelado" del texto mejora la prosodia SIN tocar
 * el contenido (cero invención, cero pérdida de palabras), que el ritmo
 * pausado del personaje cede ante la preferencia explícita del usuario, y
 * que el override de voz propio valida contra las voces reales.
 */

import { afterEach, describe, expect, test } from 'vitest';
import {
  darCaracter,
  vozDeAngelita,
  setVozDeAngelita,
  rateDeAngelita,
  opcionesDeVozAngelita,
  RATE_ANGELITA,
  VOZ_ANGELITA_KEY,
} from '../angelitaCaracter.js';
import { DEFAULT_KOKORO_VOICE } from '../ttsService.js';

afterEach(() => {
  localStorage.removeItem(VOZ_ANGELITA_KEY);
  localStorage.removeItem('chagra:tts:rate');
  localStorage.removeItem('chagra:tts:voice');
});

describe('darCaracter — aterciopelar sin cambiar el contenido', () => {
  test('quita emojis (kokoro los deletrea feo)', () => {
    expect(darCaracter('Su mata va muy bien 🌱🐝')).toBe('Su mata va muy bien.');
  });

  test('baja los gritos a un solo signo (calidez, no alarma)', () => {
    expect(darCaracter('¡Qué maravilla!!!')).toBe('¡Qué maravilla!');
    expect(darCaracter('¿¿Cómo así???')).toBe('¿¿Cómo así?');
  });

  test('el guion largo con aire se vuelve pausa (coma)', () => {
    expect(darCaracter('La mata — la que sembró — creció.'))
      .toBe('La mata, la que sembró, creció.');
  });

  test('quita comillas angulares y tipográficas, conserva el contenido', () => {
    expect(darCaracter('«El café» está “muy bueno”.')).toBe('El café está muy bueno.');
  });

  test('cierra SIEMPRE con puntuación (la entonación no queda colgada)', () => {
    expect(darCaracter('Buenas, vecina')).toBe('Buenas, vecina.');
    expect(darCaracter('¿Le ayudo?')).toBe('¿Le ayudo?');
  });

  test('conserva el usted, las tildes y la eñe intactos', () => {
    const texto = 'Usted sembró la mañana del miércoles, ¿cierto?';
    expect(darCaracter(texto)).toBe(texto);
  });

  test('es idempotente (doble pase = mismo resultado)', () => {
    const muestras = [
      'Su mata va muy bien 🌱🐝',
      '¡Qué maravilla!!!',
      'La mata — la que sembró — creció',
      '«El café» está listo',
      'Buenas, vecina',
    ];
    for (const m of muestras) {
      expect(darCaracter(darCaracter(m))).toBe(darCaracter(m));
    }
  });

  test('entradas no-string o vacías pasan sin romper', () => {
    expect(darCaracter('')).toBe('');
    expect(darCaracter(null)).toBe(null);
    expect(darCaracter(undefined)).toBe(undefined);
  });
});

describe('vozDeAngelita — una voz consistente', () => {
  test('sin override usa la voz preferida global (default del sistema)', () => {
    expect(vozDeAngelita()).toBe(DEFAULT_KOKORO_VOICE);
  });

  test('el override propio válido gana', () => {
    expect(setVozDeAngelita('ef_dora')).toBe(true);
    expect(vozDeAngelita()).toBe('ef_dora');
  });

  test('un override inválido se rechaza y no cambia nada', () => {
    expect(setVozDeAngelita('voz_que_no_existe')).toBe(false);
    expect(vozDeAngelita()).toBe(DEFAULT_KOKORO_VOICE);
  });

  test('limpiar el override vuelve a la preferida global', () => {
    setVozDeAngelita('ef_dora');
    expect(setVozDeAngelita('')).toBe(true);
    expect(vozDeAngelita()).toBe(DEFAULT_KOKORO_VOICE);
  });
});

describe('rateDeAngelita — pausado propio, preferencia del usuario manda', () => {
  test('sin preferencia del usuario: el ritmo pausado del personaje', () => {
    expect(rateDeAngelita()).toBe(RATE_ANGELITA);
  });

  test('con preferencia explícita del usuario, esa gana', () => {
    localStorage.setItem('chagra:tts:rate', '1.05');
    expect(rateDeAngelita()).toBe(1.05);
  });
});

describe('opcionesDeVozAngelita — listas para el motor', () => {
  test('trae voz, ritmo y español', () => {
    const opts = opcionesDeVozAngelita();
    expect(opts).toEqual({
      voice: DEFAULT_KOKORO_VOICE,
      rate: RATE_ANGELITA,
      lang: 'es',
    });
  });
});
