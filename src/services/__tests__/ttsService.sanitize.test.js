/**
 * Tests para `sanitizeForTTS` — strip markdown antes de enviar a Kokoro
 * o Web SpeechSynthesis para evitar que el TTS lea literal "asterisco
 * asterisco" cuando el LLM emite **negrita**.
 *
 * Bug reportado por operador 2026-05-23 (task #125).
 */
import { describe, it, expect } from 'vitest';
import { sanitizeForTTS } from '../ttsService.js';

describe('sanitizeForTTS', () => {
  it('elimina ** de negrita pero mantiene el texto', () => {
    expect(sanitizeForTTS('Esto es **importante** para el café'))
      .toBe('Esto es importante para el café');
  });

  it('elimina __ de negrita estilo underscore', () => {
    expect(sanitizeForTTS('Café __arábica__ y robusta'))
      .toBe('Café arábica y robusta');
  });

  it('elimina * de cursiva', () => {
    expect(sanitizeForTTS('La *Coffea arabica* es nativa de Etiopía'))
      .toBe('La Coffea arabica es nativa de Etiopía');
  });

  it('elimina _ de cursiva estilo underscore', () => {
    expect(sanitizeForTTS('El _aguacate_ requiere drenaje'))
      .toBe('El aguacate requiere drenaje');
  });

  it('NO toca underscores en medio de palabras (snake_case)', () => {
    // Common case: species_id, coffea_arabica. NO debe eliminarlos.
    expect(sanitizeForTTS('El id es coffea_arabica con datos verificados'))
      .toBe('El id es coffea_arabica con datos verificados');
  });

  it('elimina viñetas - * + al inicio de línea', () => {
    const input = '- Aliso andino\n* Guamo\n+ Chachafruto';
    const output = sanitizeForTTS(input);
    expect(output).toContain('Aliso andino');
    expect(output).toContain('Guamo');
    expect(output).toContain('Chachafruto');
    expect(output).not.toContain('-');
    expect(output).not.toContain('+');
  });

  it('elimina numeración 1. 2. al inicio de línea', () => {
    const input = '1. Sembrar\n2. Regar\n3. Cosechar';
    const output = sanitizeForTTS(input);
    expect(output).toContain('Sembrar');
    expect(output).toContain('Regar');
    expect(output).toContain('Cosechar');
    expect(output).not.toMatch(/^\d/);
  });

  it('elimina encabezados # ## ### al inicio de línea', () => {
    expect(sanitizeForTTS('# Companions del café')).toBe('Companions del café');
    expect(sanitizeForTTS('## Subtitle')).toBe('Subtitle');
    expect(sanitizeForTTS('### H3')).toBe('H3');
  });

  it('elimina inline code `texto`', () => {
    expect(sanitizeForTTS('Usá `npm run build` antes')).toBe('Usá npm run build antes');
  });

  it('elimina links manteniendo solo el texto visible', () => {
    expect(sanitizeForTTS('Ver [el catálogo](https://chagra.bio/catalog)'))
      .toBe('Ver el catálogo');
  });

  it('elimina blockquote > al inicio de línea', () => {
    expect(sanitizeForTTS('> Cita importante'))
      .toBe('Cita importante');
  });

  it('elimina separadores horizontales', () => {
    expect(sanitizeForTTS('Antes\n---\nDespués'))
      .toContain('Antes');
    expect(sanitizeForTTS('Antes\n---\nDespués'))
      .toContain('Después');
    expect(sanitizeForTTS('Antes\n---\nDespués'))
      .not.toContain('---');
  });

  it('elimina pipes de tablas', () => {
    expect(sanitizeForTTS('| Especie | Altitud |'))
      .toBe('Especie Altitud');
  });

  it('mezcla compleja: respuesta típica del agente', () => {
    const input = `**Compañeros del café arábica**

Según el catálogo Chagra:

- Aliso andino (Alnus acuminata)
- Chachafruto (*Erythrina edulis*)
- Guamo (Inga edulis)

Ver [ficha completa](https://chagra.bio/especies/coffea_arabica) para más.`;
    const output = sanitizeForTTS(input);
    expect(output).toContain('Compañeros del café arábica');
    expect(output).toContain('Aliso andino');
    expect(output).toContain('Chachafruto');
    expect(output).toContain('Erythrina edulis');
    expect(output).toContain('ficha completa');
    expect(output).not.toContain('*');
    expect(output).not.toContain('https://');
    expect(output).not.toContain('[');
    expect(output).not.toContain(']');
    expect(output).not.toMatch(/^- /m);
  });

  it('texto sin markdown pasa idempotente', () => {
    const plain = 'El café arábica crece entre 1200 y 1800 msnm';
    expect(sanitizeForTTS(plain)).toBe(plain);
  });

  it('texto vacío o no-string devuelve sin cambios', () => {
    expect(sanitizeForTTS('')).toBe('');
    expect(sanitizeForTTS(null)).toBe(null);
    expect(sanitizeForTTS(undefined)).toBe(undefined);
    expect(sanitizeForTTS(123)).toBe(123);
  });

  it('colapsa espacios múltiples', () => {
    expect(sanitizeForTTS('Café    arábica     andino'))
      .toBe('Café arábica andino');
  });

  it('colapsa líneas vacías múltiples', () => {
    expect(sanitizeForTTS('Antes\n\n\n\nDespués')).toBe('Antes\n\nDespués');
  });
});
