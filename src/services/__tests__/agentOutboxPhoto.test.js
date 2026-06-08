/**
 * Tests del helper PURO del flujo "foto del compositor → agente"
 * (bug 2026-05-31: la foto no llegaba al chat, solo el texto).
 */
import { describe, it, expect, vi } from 'vitest';
import {
  hasVisionFinding,
  buildVisionPrompt,
  photoBubbleText,
  buildPhotoUserMessage,
  processPhotoItem,
} from '../agentOutboxPhoto';

describe('agentOutboxPhoto.hasVisionFinding', () => {
  it('null / undefined / no-objeto → false', () => {
    expect(hasVisionFinding(null)).toBe(false);
    expect(hasVisionFinding(undefined)).toBe(false);
    expect(hasVisionFinding('foo')).toBe(false);
  });

  it('issues array (aunque vacío) → true', () => {
    expect(hasVisionFinding({ issues: [] })).toBe(true);
    expect(hasVisionFinding({ issues: ['clorosis'] })).toBe(true);
  });

  it('treatment_suggestion no vacío → true', () => {
    expect(hasVisionFinding({ treatment_suggestion: 'aplicar caldo bordelés' })).toBe(true);
  });

  it('objeto sin issues ni tratamiento → false', () => {
    expect(hasVisionFinding({ score: 80 })).toBe(false);
    expect(hasVisionFinding({ treatment_suggestion: '   ' })).toBe(false);
  });
});

describe('agentOutboxPhoto.buildVisionPrompt', () => {
  it('con hallazgos: inyecta issues + estado + caption', () => {
    const finding = { issues: ['clorosis', 'manchas foliares'], score: 62, treatment_suggestion: 'caldo bordelés' };
    const prompt = buildVisionPrompt(finding, '¿le echo algo?');
    expect(prompt).toContain('clorosis, manchas foliares');
    expect(prompt).toContain('62/100');
    expect(prompt).toContain('Sugerencia preliminar: caldo bordelés');
    expect(prompt).toContain('¿le echo algo?');
  });

  it('con hallazgos sin issues: usa "sin problemas evidentes"', () => {
    const prompt = buildVisionPrompt({ issues: [], score: 95 }, '');
    expect(prompt).toContain('sin problemas evidentes');
    expect(prompt).toContain('95/100');
    // Sin caption usa la pregunta por defecto.
    expect(prompt).toContain('¿Qué me recomiendas hacer?');
  });

  it('score ausente → n/d', () => {
    const prompt = buildVisionPrompt({ issues: ['oídio'] }, '');
    expect(prompt).toContain('n/d/100');
  });

  it('sin diagnóstico + con caption: prompt conversacional con caption', () => {
    const prompt = buildVisionPrompt(null, 'esta mata de tomate está rara');
    expect(prompt).toBe('Te envié una foto. esta mata de tomate está rara');
  });

  it('sin diagnóstico + sin caption: pide guía por descripción', () => {
    const prompt = buildVisionPrompt(null, '');
    expect(prompt).toContain('No pude obtener un diagnóstico visual automático');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('nunca devuelve vacío (siempre hay algo que despachar)', () => {
    expect(buildVisionPrompt(null, '   ').trim().length).toBeGreaterThan(0);
    expect(buildVisionPrompt({ issues: [] }, '   ').trim().length).toBeGreaterThan(0);
  });

  it('español colombiano — sin voseo argentino', () => {
    const a = buildVisionPrompt({ issues: ['x'], score: 1 }, 'mirá che');
    const b = buildVisionPrompt(null, '');
    for (const p of [a, b]) {
      // El generado por nosotros no debe traer voseo (el caption del usuario es suyo).
      expect(p).not.toMatch(/\btenés\b|\bquerés\b|\belegí\b|\bpodés\b/);
    }
  });
});

describe('agentOutboxPhoto.photoBubbleText', () => {
  it('con caption → el caption tal cual', () => {
    expect(photoBubbleText('mi tomate')).toBe('mi tomate');
  });

  it('sin caption → fallback con icono', () => {
    expect(photoBubbleText('')).toBe('📷 Foto enviada para análisis');
    expect(photoBubbleText('   ')).toBe('📷 Foto enviada para análisis');
  });
});

describe('agentOutboxPhoto.buildPhotoUserMessage', () => {
  const blob = new Blob(['jpeg'], { type: 'image/jpeg' });

  it('adjunta imageUrl a la burbuja cuando hay blob (LA FOTO LLEGA AL CHAT)', () => {
    const createUrl = vi.fn(() => 'blob:preview-123');
    const { message, imageUrl } = buildPhotoUserMessage(
      { kind: 'photo', text: 'mírala', blob },
      createUrl,
    );
    expect(createUrl).toHaveBeenCalledWith(blob);
    expect(imageUrl).toBe('blob:preview-123');
    expect(message.role).toBe('user');
    expect(message.imageUrl).toBe('blob:preview-123'); // ← la imagen va en la burbuja
    expect(message.imageAlt).toMatch(/foto/i);
    expect(message.content).toBe('mírala');
    expect(message._outboxPhoto).toBe(true);
  });

  it('sin caption usa el texto fallback pero igual lleva la imagen', () => {
    const { message } = buildPhotoUserMessage({ kind: 'photo', text: '', blob }, () => 'blob:x');
    expect(message.content).toBe('📷 Foto enviada para análisis');
    expect(message.imageUrl).toBe('blob:x');
  });

  it('sin blob → sin imageUrl (no rompe)', () => {
    const { message, imageUrl } = buildPhotoUserMessage({ kind: 'photo', text: 'hola' }, () => 'blob:y');
    expect(imageUrl).toBeNull();
    expect(message.imageUrl).toBeUndefined();
    expect(message.content).toBe('hola');
  });

  it('createUrl que lanza → degrada a sin imagen, no propaga', () => {
    const { imageUrl } = buildPhotoUserMessage({ kind: 'photo', blob }, () => { throw new Error('no DOM'); });
    expect(imageUrl).toBeNull();
  });
});

describe('agentOutboxPhoto.processPhotoItem (drain → visión + foto)', () => {
  const blob = new Blob(['jpeg'], { type: 'image/jpeg' });

  it('DISPARA la visión con el blob y arma prompt con el hallazgo', async () => {
    const analyze = vi.fn(async () => ({ issues: ['clorosis'], score: 70, treatment_suggestion: 'caldo' }));
    const createUrl = vi.fn(() => 'blob:pic');
    const { message, prompt, finding, imageUrl } = await processPhotoItem(
      { kind: 'photo', text: '¿qué hago?', blob },
      { analyze, createUrl },
    );
    // Visión disparada con el blob exacto.
    expect(analyze).toHaveBeenCalledWith(blob);
    expect(finding.issues).toEqual(['clorosis']);
    // La foto llega al chat.
    expect(message.imageUrl).toBe('blob:pic');
    expect(imageUrl).toBe('blob:pic');
    // El prompt incluye el diagnóstico + el caption.
    expect(prompt).toContain('clorosis');
    expect(prompt).toContain('70/100');
    expect(prompt).toContain('¿qué hago?');
  });

  it('si la visión falla, degrada a prompt por descripción (no rompe) y la foto sigue', async () => {
    const analyze = vi.fn(async () => { throw new Error('ollama caído'); });
    const { message, prompt, finding } = await processPhotoItem(
      { kind: 'photo', text: '', blob },
      { analyze, createUrl: () => 'blob:still-here' },
    );
    expect(finding).toBeNull();
    expect(prompt).toContain('No pude obtener un diagnóstico visual automático');
    // Aun sin diagnóstico, la imagen llega al chat.
    expect(message.imageUrl).toBe('blob:still-here');
  });

  it('sin blob no llama a la visión y pide guía por descripción', async () => {
    const analyze = vi.fn();
    const { prompt } = await processPhotoItem(
      { kind: 'photo', text: '' },
      { analyze, createUrl: () => null },
    );
    expect(analyze).not.toHaveBeenCalled();
    expect(prompt.trim().length).toBeGreaterThan(0);
  });
});
