// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock del transporte de streaming: devolvemos el "fullText" acumulado tal
// como lo entregaría streamOllama tras consumir el NDJSON. Esto nos deja
// inyectar salidas truncadas/malformadas del modelo y verificar que el
// parser tolerante (QUICK-6 #269) las recupera sin inventar datos.
vi.mock('../ollamaStream', () => ({
  streamOllama: vi.fn(),
}));
// El registro de módulos resuelve el SYSTEM_PROMPT; sin módulo Pro montado
// cae al stub OSS, que es justo lo que queremos en el test OSS.
vi.mock('../core/moduleRegistry', () => ({
  registry: { byCapability: vi.fn(() => []) },
}));

import { streamOllama } from '../ollamaStream';
import { extractEntities, _resetSystemPromptCache } from '../entityExtractor';

beforeEach(() => {
  streamOllama.mockReset();
  _resetSystemPromptCache();
});

describe('entityExtractor — parser tolerante NLU (QUICK-6 #269)', () => {
  it('parsea array JSON limpio sin reparación', async () => {
    streamOllama.mockResolvedValue(
      '[{"crop":"tomate","quantity":5,"location":"invernadero"}]',
    );
    const out = await extractEntities('Sembré cinco tomates en el invernadero');
    expect(out).toEqual([
      { crop: 'tomate', quantity: 5, location: 'invernadero' },
    ]);
  });

  it('recupera un array truncado por corte de stream (antes se perdía)', async () => {
    // El modelo emitió dos entidades pero el stream se cortó: falta cerrar el
    // último objeto y el array. El parser local viejo (regex `[...]`) fallaba
    // acá; el tolerante cierra estructura y rescata ambas entidades.
    streamOllama.mockResolvedValue(
      '[{"crop":"papa","quantity":3,"location":"lote norte"},'
      + '{"crop":"maiz","quantity":2,"location":"lote norte"',
    );
    const out = await extractEntities('Sembré tres papas y dos maíces en el lote norte');
    expect(out).toEqual([
      { crop: 'papa', quantity: 3, location: 'lote norte' },
      { crop: 'maiz', quantity: 2, location: 'lote norte' },
    ]);
  });

  it('limpia fences markdown alrededor del JSON', async () => {
    streamOllama.mockResolvedValue(
      '```json\n[{"crop":"banano","quantity":3,"location":""}]\n```',
    );
    const out = await extractEntities('Sembré tres bananos');
    expect(out).toEqual([{ crop: 'banano', quantity: 3, location: '' }]);
  });

  it('NO inventa entidades: clave-sin-valor truncada hace fallar el batch (no rellena)', async () => {
    // El último objeto quedó con `quantity:` sin valor (corte de stream). El
    // repair NO inventa el número — cerrar la estructura produce un JSON
    // inválido (`"quantity"` huérfano), así que el parse falla por completo y
    // extractEntities lanza error. Es la elección CONSERVADORA: preferimos
    // perder el turno a emitir una entidad con un valor fabricado.
    streamOllama.mockResolvedValue(
      '[{"crop":"papa","quantity":3,"location":"norte"},{"crop":"yuca","quantity":',
    );
    await expect(extractEntities('papas y yuca')).rejects.toThrow(/no parseable/i);
  });

  it('descarta entidades sin campos requeridos sin inventarlos (objeto reparado parcial)', async () => {
    // Un array donde un elemento reparable carece de `quantity` válido: el
    // parse SÍ recupera la estructura, pero isValidEntity filtra al inválido
    // en vez de inventarle un quantity.
    streamOllama.mockResolvedValue(
      '[{"crop":"papa","quantity":3,"location":"norte"},{"crop":"yuca","location":"sur"}]',
    );
    const out = await extractEntities('papas y yuca');
    expect(out).toEqual([
      { crop: 'papa', quantity: 3, location: 'norte' },
    ]);
  });

  it('salida totalmente irreparable lanza error (no devuelve data falsa)', async () => {
    streamOllama.mockResolvedValue('lo siento, no entendí la pregunta');
    await expect(extractEntities('algo')).rejects.toThrow(/no parseable/i);
  });
});
