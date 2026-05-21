/**
 * entityExtractor.test.js — Tests del split SYSTEM_PROMPT stub OSS / Pro.
 *
 * Cubre 2 contratos:
 *  1. Sin módulo Pro registrado: `resolveSystemPrompt` devuelve el stub
 *     OSS y NO incluye normalizaciones Whisper Pro-only (e.g. "al vacas").
 *  2. Con módulo Pro mock registrado en moduleRegistry con capability
 *     `voice-entity-extractor-prompt`: `resolveSystemPrompt` devuelve el
 *     prompt full mock entregado por `mount()`.
 *
 * No invoca Ollama ni el modelo real — solo verifica resolución del
 * SYSTEM_PROMPT vía el moduleRegistry pattern.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { registry } from '../../src/core/moduleRegistry';
import { resolveSystemPrompt, _resetSystemPromptCache, SYSTEM_PROMPT } from '../../src/services/entityExtractor';

describe('entityExtractor SYSTEM_PROMPT resolution', () => {
  beforeEach(() => {
    _resetSystemPromptCache();
    // Limpiar el registry de cualquier módulo Pro registrado por tests previos.
    const mods = registry.list();
    for (const m of mods) {
      if (m.capabilities && m.capabilities.includes('voice-entity-extractor-prompt')) {
        registry.unregister(m.id);
      }
    }
  });

  it('devuelve el stub OSS cuando no hay módulo Pro registrado', async () => {
    const prompt = await resolveSystemPrompt();
    expect(prompt).toBe(SYSTEM_PROMPT);
    expect(prompt).toContain('Eres un extractor de entidades agricolas');
    expect(prompt).toContain('"crop"');
    expect(prompt).toContain('"quantity"');
    expect(prompt).toContain('"location"');
  });

  it('el stub OSS NO incluye normalizaciones Whisper Pro-only', async () => {
    const prompt = await resolveSystemPrompt();
    // Las normalizaciones específicas "al vacas" → "albahaca", "agua
    // acate" → "aguacate", "yer ba buena" → "yerbabuena" son ventaja
    // competitiva y viven solo en el módulo Pro privado.
    expect(prompt).not.toContain('al vacas');
    expect(prompt).not.toContain('agua acate');
    expect(prompt).not.toContain('yer ba buena');
    expect(prompt).not.toContain('ce bolla');
    expect(prompt).not.toContain('ulluco');
    expect(prompt).not.toContain('cubio');
  });

  it('usa el SYSTEM_PROMPT full cuando hay módulo Pro mock registrado', async () => {
    const FULL_PROMPT_MOCK = `Eres un extractor PRO. al vacas → albahaca. agua acate → aguacate.

Schema: [{"crop":"...","quantity":0,"location":"..."}]`;

    registry.register({
      id: 'voice-entity-extractor-pro-mock',
      version: '0.0.1-test',
      capabilities: ['voice-entity-extractor-prompt'],
      requiredInfra: [],
      mount: async () => ({
        default: {
          systemPrompt: FULL_PROMPT_MOCK,
          version: '0.0.1-test',
        },
      }),
    });

    const prompt = await resolveSystemPrompt();
    expect(prompt).toBe(FULL_PROMPT_MOCK);
    expect(prompt).toContain('al vacas');
    expect(prompt).toContain('agua acate');
  });

  it('cae al stub OSS si el módulo Pro mock falla al cargar', async () => {
    registry.register({
      id: 'voice-entity-extractor-pro-broken',
      version: '0.0.1-broken',
      capabilities: ['voice-entity-extractor-prompt'],
      requiredInfra: [],
      mount: async () => {
        throw new Error('boom: módulo Pro inalcanzable');
      },
    });

    const prompt = await resolveSystemPrompt();
    expect(prompt).toBe(SYSTEM_PROMPT);
  });

  it('cachea el SYSTEM_PROMPT entre llamadas consecutivas', async () => {
    let mountCount = 0;
    registry.register({
      id: 'voice-entity-extractor-pro-counter',
      version: '0.0.1-counter',
      capabilities: ['voice-entity-extractor-prompt'],
      requiredInfra: [],
      mount: async () => {
        mountCount += 1;
        return { default: { systemPrompt: 'PROMPT_FULL_X', version: '0.0.1' } };
      },
    });

    await resolveSystemPrompt();
    await resolveSystemPrompt();
    await resolveSystemPrompt();

    // Un solo mount aunque resolveSystemPrompt se llame 3 veces.
    expect(mountCount).toBe(1);
  });
});
