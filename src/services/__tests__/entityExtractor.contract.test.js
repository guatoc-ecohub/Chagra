/**
 * entityExtractor.contract.test.js — cobertura complementaria de
 * src/services/entityExtractor.js.
 *
 * `entityExtractor.tolerantJson.test.js` ya cubre a fondo el parser tolerante
 * (reparación de JSON truncado/con fences). Este archivo cubre lo que ese NO
 * cubre:
 *
 *   - Entradas inválidas (texto vacío/no-string) devuelven [] SIN llamar red.
 *   - `resolveSystemPrompt`: resolución del módulo Pro vía moduleRegistry
 *     (éxito, fallo silencioso al montar, y forma inválida) + cache por
 *     proceso (no repite el dynamic import en llamadas subsecuentes).
 *   - Timeout/abort: `AbortError` se traduce al mensaje en español
 *     "Tiempo agotado al extraer entidades".
 *   - Variantes de envoltura de la respuesta NO-array del modelo:
 *     `{entities:[...]}`, `{data:[...]}`, objeto plano único, y objeto sin
 *     ninguna de esas formas (→ []).
 *   - `isValidEntity`: quantity no-entero o <=0, location no-string, crop
 *     vacío se descartan sin inventar valores.
 *
 * Nota tsc: usamos `vi.mocked(fn)` (no `.mockX` directo sobre el import) para
 * quedar limpios contra el gate — mismo patrón de agentTelemetrySync.test.js
 * (memoria feedback-tsc-gate-bottleneck-nuevos-archivos).
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../ollamaStream', () => ({
  streamOllama: vi.fn(),
}));
vi.mock('../../core/moduleRegistry', () => ({
  registry: { byCapability: vi.fn(() => []) },
}));

import { streamOllama } from '../ollamaStream';
import { registry } from '../../core/moduleRegistry';
import { extractEntities, resolveSystemPrompt, _resetSystemPromptCache, SYSTEM_PROMPT, MODEL } from '../entityExtractor';

beforeEach(() => {
  vi.mocked(streamOllama).mockReset();
  vi.mocked(registry.byCapability).mockReset();
  vi.mocked(registry.byCapability).mockReturnValue([]);
  _resetSystemPromptCache();
});

describe('extractEntities — entradas inválidas (corta antes de la red)', () => {
  /** @type {Array<[unknown, string]>} */
  const casosInvalidos = [
    ['', 'vacío'],
    [null, 'null'],
    [undefined, 'undefined'],
    [42, 'numero'],
  ];

  it.each(casosInvalidos)('text=%s (%s) → [] sin invocar streamOllama', async (bad, _label) => {
    const out = await extractEntities(/** @type {any} */ (bad));
    expect(out).toEqual([]);
    expect(streamOllama).not.toHaveBeenCalled();
  });
});

describe('resolveSystemPrompt — resolución Pro vs stub OSS + cache', () => {
  it('sin módulo Pro registrado → devuelve el stub OSS', async () => {
    vi.mocked(registry.byCapability).mockReturnValue([]);
    const prompt = await resolveSystemPrompt();
    expect(prompt).toBe(SYSTEM_PROMPT);
  });

  it('módulo Pro registrado con systemPrompt válido → lo usa en vez del stub', async () => {
    const proPrompt = 'PROMPT PRO CON FEW-SHOTS COLOMBIANOS';
    vi.mocked(registry.byCapability).mockReturnValue([
      { mount: vi.fn(async () => ({ default: { systemPrompt: proPrompt } })) },
    ]);
    const prompt = await resolveSystemPrompt();
    expect(prompt).toBe(proPrompt);
  });

  it('módulo Pro cuyo mount() falla → cae silenciosamente al stub OSS (no lanza)', async () => {
    vi.mocked(registry.byCapability).mockReturnValue([
      { mount: vi.fn(async () => { throw new Error('módulo roto'); }) },
    ]);
    await expect(resolveSystemPrompt()).resolves.toBe(SYSTEM_PROMPT);
  });

  it('módulo Pro con systemPrompt vacío/con forma inválida → cae al stub OSS', async () => {
    vi.mocked(registry.byCapability).mockReturnValue([
      { mount: vi.fn(async () => ({ default: { systemPrompt: '' } })) },
    ]);
    await expect(resolveSystemPrompt()).resolves.toBe(SYSTEM_PROMPT);
  });

  it('cachea el resultado: la segunda llamada NO vuelve a consultar el registry', async () => {
    vi.mocked(registry.byCapability).mockReturnValue([]);
    await resolveSystemPrompt();
    await resolveSystemPrompt();
    expect(registry.byCapability).toHaveBeenCalledTimes(1);
  });

  it('extractEntities usa el prompt Pro resuelto como mensaje system al modelo', async () => {
    const proPrompt = 'PROMPT PRO XYZ';
    vi.mocked(registry.byCapability).mockReturnValue([
      { mount: vi.fn(async () => ({ default: { systemPrompt: proPrompt } })) },
    ]);
    vi.mocked(streamOllama).mockResolvedValue('[{"crop":"papa","quantity":2,"location":""}]');

    await extractEntities('sembre dos papas');

    const [, body] = vi.mocked(streamOllama).mock.calls[0];
    expect(body.messages[0]).toEqual({ role: 'system', content: proPrompt });
    expect(body.model).toBe(MODEL);
  });
});

describe('extractEntities — timeout/abort', () => {
  it('AbortError del transporte se traduce a mensaje en español', async () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    vi.mocked(streamOllama).mockRejectedValue(abortErr);

    await expect(extractEntities('sembre tres yucas')).rejects.toThrow(/tiempo agotado/i);
  });

  it('un error de red genérico se propaga tal cual (no se disfraza de timeout)', async () => {
    vi.mocked(streamOllama).mockRejectedValue(new Error('fetch failed: ECONNREFUSED'));
    await expect(extractEntities('sembre tres yucas')).rejects.toThrow(/ECONNREFUSED/);
  });
});

describe('extractEntities — variantes de envoltura NO-array', () => {
  it('{entities:[...]} se desenvuelve a la lista', async () => {
    vi.mocked(streamOllama).mockResolvedValue('{"entities":[{"crop":"maiz","quantity":4,"location":"lote1"}]}');
    const out = await extractEntities('sembre cuatro maices en lote1');
    expect(out).toEqual([{ crop: 'maiz', quantity: 4, location: 'lote1' }]);
  });

  it('{data:[...]} se desenvuelve a la lista', async () => {
    vi.mocked(streamOllama).mockResolvedValue('{"data":[{"crop":"frijol","quantity":6,"location":""}]}');
    const out = await extractEntities('sembre seis frijoles');
    expect(out).toEqual([{ crop: 'frijol', quantity: 6, location: '' }]);
  });

  it('un único objeto plano {crop,quantity,location} se envuelve en array', async () => {
    vi.mocked(streamOllama).mockResolvedValue('{"crop":"cebolla","quantity":8,"location":"huerta"}');
    const out = await extractEntities('sembre ocho cebollas en la huerta');
    expect(out).toEqual([{ crop: 'cebolla', quantity: 8, location: 'huerta' }]);
  });

  it('objeto sin ninguna forma reconocida → [] (no inventa datos)', async () => {
    vi.mocked(streamOllama).mockResolvedValue('{"foo":"bar"}');
    const out = await extractEntities('algo raro');
    expect(out).toEqual([]);
  });
});

describe('extractEntities — isValidEntity (descarte sin inventar)', () => {
  it('descarta quantity no-entero, quantity<=0, location no-string y crop vacío', async () => {
    vi.mocked(streamOllama).mockResolvedValue(JSON.stringify([
      { crop: 'papa', quantity: 3, location: 'norte' }, // válido
      { crop: 'yuca', quantity: 2.5, location: 'sur' }, // quantity no entero
      { crop: 'maiz', quantity: 0, location: 'sur' }, // quantity <= 0
      { crop: 'arroz', quantity: -2, location: 'sur' }, // quantity negativo
      { crop: 'frijol', quantity: 5, location: /** @type {any} */ (42) }, // location no-string
      { crop: '  ', quantity: 5, location: 'sur' }, // crop vacío tras trim
    ]));
    const out = await extractEntities('mezcla de cultivos');
    expect(out).toEqual([{ crop: 'papa', quantity: 3, location: 'norte' }]);
  });

  it('normaliza crop a minúsculas/trim y location a trim, preservando quantity entero', async () => {
    vi.mocked(streamOllama).mockResolvedValue('[{"crop":"  TOMATE  ","quantity":5,"location":"  Invernadero  "}]');
    const out = await extractEntities('sembre cinco tomates');
    expect(out).toEqual([{ crop: 'tomate', quantity: 5, location: 'Invernadero' }]);
  });
});
