/**
 * agentOutboxAttachment.test.js — rechazo honesto de adjuntos no-analizables.
 *
 * Incidente prod (2026-05-31): el operador le pasó su HOJA DE VIDA (PDF) al
 * agente con "analiza". El agente, en vez de decir honesto que solo lee fotos
 * de plantas, FABRICÓ consejos de finca (alucinó "tomate fresa arandano" y un
 * nombre de usuario inventado). Causa: la rama `attachment` de processOutboxItem
 * despachaba el caption al pipeline agronómico SIN importar el tipo de archivo.
 *
 * Fix testeado aquí: clasificar el adjunto y, si NO es una imagen analizable
 * (PDF, doc, audio, etc.), responder con un mensaje honesto y CORTO SIN correr
 * el pipeline. PURO y SÍNCRONO — sin React ni IndexedDB.
 */

import { describe, it, expect } from 'vitest';
import {
  isAnalyzableImageAttachment,
  buildAttachmentRejection,
} from '../agentOutboxAttachment.js';

describe('isAnalyzableImageAttachment', () => {
  it('PDF (hoja de vida) NO es imagen analizable', () => {
    expect(
      isAnalyzableImageAttachment({ mime: 'application/pdf', fileName: 'hoja-de-vida.pdf' }),
    ).toBe(false);
  });

  it('reconoce PDF por extensión aunque el mime falte', () => {
    expect(isAnalyzableImageAttachment({ mime: null, fileName: 'CV_Miguel.PDF' })).toBe(false);
  });

  it('documento Word NO es imagen analizable', () => {
    expect(
      isAnalyzableImageAttachment({
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: 'doc.docx',
      }),
    ).toBe(false);
  });

  it('audio adjunto NO es imagen analizable', () => {
    expect(isAnalyzableImageAttachment({ mime: 'audio/mpeg', fileName: 'nota.mp3' })).toBe(false);
  });

  it('imagen JPEG SÍ es analizable (la atiende el flujo de visión, no el de rechazo)', () => {
    expect(isAnalyzableImageAttachment({ mime: 'image/jpeg', fileName: 'planta.jpg' })).toBe(true);
  });

  it('imagen por extensión aunque el mime venga vacío', () => {
    expect(isAnalyzableImageAttachment({ mime: '', fileName: 'foto.png' })).toBe(true);
  });

  it('item null/sin datos → no analizable (degradar a rechazo seguro)', () => {
    expect(isAnalyzableImageAttachment(null)).toBe(false);
    expect(isAnalyzableImageAttachment({})).toBe(false);
  });
});

describe('buildAttachmentRejection', () => {
  it('menciona que no lee PDF ni hojas de vida y pide una foto de planta', () => {
    const msg = buildAttachmentRejection({ mime: 'application/pdf', fileName: 'hoja-de-vida.pdf' });
    expect(msg).toMatch(/fotos de plantas|foto de tu planta/i);
    expect(msg).toMatch(/pdf|documento|hoja de vida/i);
    // No inventa diagnóstico agronómico.
    expect(msg).not.toMatch(/tomate fresa arandano/i);
  });

  it('es honesto, corto y en castellano colombiano (sin voseo)', () => {
    const msg = buildAttachmentRejection({ mime: 'application/pdf', fileName: 'cv.pdf' });
    // Cero voseo: nada de "mandá/contame/elegí/tenés/podés/enviá".
    expect(msg).not.toMatch(/mandá|contame|elegí|tenés|podés|querés|enviá/i);
    expect(msg.length).toBeLessThan(280);
  });

  it('texto no vacío incluso sin fileName/mime', () => {
    const msg = buildAttachmentRejection({});
    expect(typeof msg).toBe('string');
    expect(msg.trim().length).toBeGreaterThan(0);
  });
});
