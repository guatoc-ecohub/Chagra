/**
 * outputGuards.inventedName.test.js
 *
 * Bug prod (2026-05-31): el agente saludó al usuario como "Dante" — un nombre
 * INVENTADO. El usuario es Miguel y su profile NO trae nombre. El modelo
 * alucinó un nombre propio y abrió la respuesta con él ("Hola Dante, …").
 *
 * Fix: guardInventedName remueve un saludo con nombre propio al INICIO de la
 * respuesta cuando ese nombre NO coincide con getProfile().nombre. Si el
 * profile tiene nombre y coincide, se respeta. PURO y SÍNCRONO.
 */

import { describe, it, expect } from 'vitest';
import { guardInventedName, applyOutputGuards } from '../outputGuards.js';

describe('guardInventedName', () => {
  it('remueve "Hola Dante," cuando el profile NO tiene nombre', () => {
    const llm = 'Hola Dante, para tu cultivo de café te recomiendo podar en marzo.';
    const out = guardInventedName(llm, { profileName: null });
    expect(out.modified).toBe(true);
    expect(out.text).not.toMatch(/dante/i);
    expect(out.text).toMatch(/^Para tu cultivo de café/);
  });

  it('remueve el nombre inventado cuando NO coincide con el del profile (Miguel)', () => {
    const llm = '¡Hola Dante! El maíz a esa altitud va bien.';
    const out = guardInventedName(llm, { profileName: 'Miguel' });
    expect(out.modified).toBe(true);
    expect(out.text).not.toMatch(/dante/i);
    expect(out.text).toMatch(/maíz/i);
  });

  it('RESPETA el nombre cuando coincide con el profile', () => {
    const llm = 'Hola Miguel, el café necesita sombra.';
    const out = guardInventedName(llm, { profileName: 'Miguel' });
    expect(out.modified).toBe(false);
    expect(out.text).toBe(llm);
  });

  it('match del nombre del profile es insensible a tildes/caso', () => {
    const llm = 'Hola José, revisa el riego.';
    const out = guardInventedName(llm, { profileName: 'jose' });
    expect(out.modified).toBe(false);
  });

  it('no toca respuestas que no abren con saludo+nombre', () => {
    const llm = 'El cubio se siembra entre 2800 y 3500 msnm.';
    const out = guardInventedName(llm, { profileName: null });
    expect(out.modified).toBe(false);
    expect(out.text).toBe(llm);
  });

  it('no confunde una palabra común tras "Hola" con un nombre propio', () => {
    // "Hola, claro que sí" — "claro" no es nombre propio (minúscula).
    const llm = 'Hola, claro que sí: el tomate aguanta hasta 2600 msnm.';
    const out = guardInventedName(llm, { profileName: null });
    expect(out.modified).toBe(false);
  });

  it('maneja texto vacío / no-string', () => {
    expect(guardInventedName('', { profileName: null }).modified).toBe(false);
    expect(guardInventedName(null, { profileName: null }).modified).toBe(false);
  });
});

describe('applyOutputGuards — integra el guard de nombre inventado', () => {
  it('pasa profileName por las opciones y limpia el saludo inventado', () => {
    const llm = 'Hola Dante, el frijol se asocia bien con el maíz.';
    const out = applyOutputGuards(llm, { profileName: null });
    expect(out.modified).toBe(true);
    expect(out.text).not.toMatch(/dante/i);
    expect(out.reasons.join(' ')).toMatch(/nombre/i);
  });
});
