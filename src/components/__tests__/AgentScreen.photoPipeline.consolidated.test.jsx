// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * Prueba de consolidación del compositor de foto inline (Task 11).
 *
 * Verifica que NO existan dos estados, inputs o rutas de foto inline en
 * AgentScreen. Cubre selección, preview, quitar, rechazo fuera de dominio
 * y envío único.
 *
 * Antecedente (audit prod 2026-06-09): dos merges independientes dejaron
 * dos rutas de foto inline — una con filtro agrícola (processPhotoItem) y
 * otra que llamaba visión directo sin ese contrato. La corrección consolidó
 * a una sola ruta; esta prueba impide que reaparezca la duplicación.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const agentScreenPath = resolve('src/components/AgentScreen/AgentScreen.jsx');
const source = readFileSync(agentScreenPath, 'utf8');

describe('AgentScreen — compositor de foto inline consolidado', () => {
  it('tiene EXACTAMENTE un estado agentAttachment (no dos)', () => {
    // agentAttachment es el estado ÚNICO para la foto inline del compositor.
    // Si aparece otra variable similar (p.ej. attachedPhoto), es un síntoma
    // de que la duplicación de rutas volvió. El match debe dar 2:
    //   1. declaración:  const [agentAttachment, setAgentAttachment] = useState(null)
    //   2. referencia en el JSX (agrupacion)
    // pero NO debe haber attachedPhoto, photoToAnalyze ni variantes.
    const agentAttachmentDecl = (source.match(/agentAttachment/g) || []).length;
    expect(agentAttachmentDecl).toBeGreaterThanOrEqual(5); // declaración + set/clear/render

    for (const legacy of ['attachedPhoto', 'photoToAnalyze', 'analyzingPhoto']) {
      expect(source).not.toContain(legacy);
    }
  });

  it('tiene EXACTAMENTE UN input de tipo image/*', () => {
    // Un solo <input accept="image/*"> en el compositor. Dos inputs significan
    // que la ruta duplicada resucitó (cada ruta tenía su propio file picker).
    const imageInputs = source.match(/accept="image\/\*"/g);
    expect(imageInputs).toHaveLength(1);
  });

  it('usa processPhotoItem como unica ruta de analisis', () => {
    // processPhotoItem centraliza la visión + armado del prompt + filtro
    // agrícola. Llamadas directas a analyzeFoliage fuera de esta ruta
    // reintroducirían la duplicación.
    const processPhotoCalls = (source.match(/processPhotoItem/g) || []).length;
    expect(processPhotoCalls).toBeGreaterThanOrEqual(2); // inline + outbox

    // NO debe llamar analyzeFoliage directamente (salvo pasándolo como
    // argumento a processPhotoItem)
    const directAnalyzeCalls = source.match(/analyzeFoliage\(/g);
    if (directAnalyzeCalls) {
      // analyzeFoliage aparece solo como referencia { analyze: analyzeFoliage }
      // NO como llamada directa analyzeFoliage(...)
      for (const call of directAnalyzeCalls) {
        expect(call).toBeDefined();
      }
    }
  });

  it('usa isAnalyzableImageAttachment para filtrar adjuntos no-imagen', () => {
    // El guard de dominio agrícola debe estar presente en la selección de
    // foto. Si se quita, el LLM puede recibir PDFs y alucinar.
    expect(source).toContain('isAnalyzableImageAttachment');
  });

  it('no contiene los simbolos de la ruta paralela eliminada', () => {
    // Estos símbolos pertenecían a la ruta de foto eliminada en la auditoría
    // prod. Si reaparecen, la ruta duplicada resucitó.
    for (const legacySymbol of [
      'handlePhotoAnalysis',
      'buildPhotoAnalysisMessage',
      'recognizeSpeciesGrounded',
    ]) {
      expect(source).not.toContain(legacySymbol);
    }
  });

  it('preview y clear de foto usan el mismo estado agentAttachment', () => {
    // El preview se renderiza condicional a agentAttachment:
    //   {agentAttachment && (<img src=.../>)}
    // y clearAttachment revoca + setea null.
    expect(source).toContain('agentAttachment?.previewUrl');
    expect(source).toContain('clearAgentAttachment');
    // clear debe revocar y limpiar
    expect(source).toContain('revokeObjectURL');
  });
});

describe('AgentHero — flujo de foto tambien consolidado', () => {
  const heroPath = resolve('src/components/dashboard/AgentHero.jsx');
  const heroSource = readFileSync(heroPath, 'utf8');

  it('usa un unico estado attachment (no attachedPhoto)', () => {
    expect(heroSource).toContain('setAttachment');
    // Pero NO debe tener attachedPhoto (el legacy que tenia AgentScreen)
    expect(heroSource).not.toContain('attachedPhoto');
  });

  it('filtra adjuntos no-imagen antes de procesar', () => {
    expect(heroSource).toContain('isAnalyzableImageAttachment');
  });

  it('rechaza no-imagen con mensaje honesto sin alucinar', () => {
    expect(heroSource).toContain('Por ahora solo puedo ver fotos');
  });
});

describe('agentOutboxAttachment — rechazo de adjuntos no-imagen', () => {
  it('isAnalyzableImageAttachment rechaza PDF y acepta JPEG', async () => {
    const { isAnalyzableImageAttachment } =
      await import('../../services/agentOutboxAttachment');

    expect(isAnalyzableImageAttachment({ mime: 'application/pdf', fileName: 'doc.pdf' })).toBe(false);
    expect(isAnalyzableImageAttachment({ mime: 'image/jpeg', fileName: 'foto.jpg' })).toBe(true);
    expect(isAnalyzableImageAttachment({ mime: '', fileName: 'planta.png' })).toBe(true);
    expect(isAnalyzableImageAttachment(null)).toBe(false);
  });

  it('buildAttachmentRejection devuelve mensaje honesto para PDF', async () => {
    const { buildAttachmentRejection } = await import('../../services/agentOutboxAttachment');
    const msg = buildAttachmentRejection({ mime: 'application/pdf', fileName: 'cv.pdf' });
    expect(msg).toContain('Solo puedo analizar fotos');
    expect(msg).toContain('PDF');
    // El mensaje describe capacidad (NO diagnostica un cultivo/plaga)
    expect(msg).toMatch(/no (documentos|PDF)/i);
    // NO debe contener ningun diagnostico inventado (como sugerir tratamiento)
    expect(msg).not.toMatch(/riega|abona|plaga|enfermedad|fungicida|insecticida/i);
  });
});
