/**
 * Tests para `splitIntoSentences` — heurística que parte texto en frases
 * para streaming TTS sentence-by-sentence (Free 7→10 fix-pack #4).
 *
 * El objetivo es reducir latencia hasta-primer-audio sin trocear frases
 * naturales. Si una frase es muy corta (<MIN_SENTENCE_CHARS), se acumula
 * con la siguiente para evitar audios picados sin entonación.
 */
import { describe, it, expect } from 'vitest';
import { splitIntoSentences } from '../ttsService.js';

describe('splitIntoSentences (Free 7→10 fix-pack #4)', () => {
  it('devuelve array vacío para input vacío o no-string', () => {
    expect(splitIntoSentences('')).toEqual([]);
    expect(splitIntoSentences(null)).toEqual([]);
    expect(splitIntoSentences(undefined)).toEqual([]);
    expect(splitIntoSentences(/** @type {any} */ (123))).toEqual([]);
  });

  it('devuelve una sola frase si no hay boundaries', () => {
    expect(splitIntoSentences('texto sin puntuacion'))
      .toEqual(['texto sin puntuacion']);
  });

  it('devuelve una sola frase corta sin trocear', () => {
    expect(splitIntoSentences('Sí.')).toEqual(['Sí.']);
  });

  it('mantiene frase larga única como un solo segmento', () => {
    const t = 'Hola, soy el agente de Chagra y te puedo ayudar con la siembra de papa criolla.';
    expect(splitIntoSentences(t)).toEqual([t]);
  });

  it('parte texto largo en múltiples frases por puntuador', () => {
    const t = 'La papa criolla es resistente al frío. Sembrarla en mayo conviene mucho. Cosecharás en 4 meses.';
    const sentences = splitIntoSentences(t);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
    // Cada frase termina en puntuador
    sentences.forEach((s) => {
      expect(s).toMatch(/[.!?…]\b|[.!?…]$/);
    });
  });

  it('acumula frases muy cortas (<40 chars) con la siguiente', () => {
    const t = 'Sí. Claro. Por supuesto. La papa criolla aguanta bien las heladas tempranas.';
    const sentences = splitIntoSentences(t);
    // Las 3 primeras son muy cortas (3-10 chars), deberían acumularse
    // con la frase larga al final → array de 1 elemento.
    expect(sentences.length).toBe(1);
    expect(sentences[0]).toContain('Sí.');
    expect(sentences[0]).toContain('Por supuesto.');
    expect(sentences[0]).toContain('heladas tempranas.');
  });

  it('respeta boundaries de exclamación e interrogación', () => {
    const t = '¡Cuidado con la helada! Cubre los cultivos. ¿Tienes mantas térmicas a mano?';
    const sentences = splitIntoSentences(t);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
  });

  it('respeta boundaries con ellipsis …', () => {
    const t = 'Quizás llueva mañana… Pero también puede que no. Mejor cubre por las dudas igual.';
    const sentences = splitIntoSentences(t);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
  });

  it('escenario realista del agente — texto agronómico medio largo', () => {
    const t = 'Para sembrar papa criolla en clima frío, primero prepara el suelo con abono orgánico. Después haz surcos de 30 cm. Coloca cada semilla a 15 cm de distancia. Cubre con tierra suave y riega ligeramente. La germinación toma entre 10 y 15 días.';
    const sentences = splitIntoSentences(t);
    // Debería partirse en varias frases, no devolver el texto entero
    expect(sentences.length).toBeGreaterThanOrEqual(3);
    // La primera frase debe estar disponible para Kokoro pronto
    expect(sentences[0].length).toBeLessThan(120);
    expect(sentences[0]).toContain('papa criolla');
  });

  it('preserva el orden y contenido total de las frases (round-trip)', () => {
    const t = 'Primera frase de prueba para verificar el split. Segunda frase también de prueba. Tercera frase final del test.';
    const sentences = splitIntoSentences(t);
    // Concat de las frases (eliminando whitespace extra) recupera el texto
    const joined = sentences.join(' ').replace(/\s+/g, ' ').trim();
    const original = t.replace(/\s+/g, ' ').trim();
    expect(joined).toBe(original);
  });

  it('no incluye frases vacías ni solo-whitespace', () => {
    const t = '  Hola, mundo de Chagra agroecológico.   .  Otra frase válida después de basura.   ';
    const sentences = splitIntoSentences(t);
    sentences.forEach((s) => {
      expect(s.trim().length).toBeGreaterThan(0);
    });
  });
});
