import { describe, it, expect } from 'vitest';
import { __TEST__ } from '../caseStudyVoiceExtractor';

// Test del parseLLMJson tolerante (sin call real a Ollama).
// La función estructurada extractCaseFromText requiere Ollama runtime,
// se cubre por integration test separado.

describe('caseStudyVoiceExtractor — parseLLMJson', () => {
  const { parseLLMJson } = __TEST__;

  it('parsea JSON limpio', () => {
    const r = parseLLMJson('{"a":1}');
    expect(r).toEqual({ a: 1 });
  });

  it('quita markdown fences ```json', () => {
    const r = parseLLMJson('```json\n{"problem_name":"Trozador","severity":"high"}\n```');
    expect(r.problem_name).toBe('Trozador');
    expect(r.severity).toBe('high');
  });

  it('quita ``` sin lang tag', () => {
    const r = parseLLMJson('```\n{"x":2}\n```');
    expect(r).toEqual({ x: 2 });
  });

  it('encuentra JSON dentro de texto con prefix', () => {
    const r = parseLLMJson('Aqui está la respuesta: {"count_affected":10,"count_total":1000} fin.');
    expect(r.count_affected).toBe(10);
    expect(r.count_total).toBe(1000);
  });

  it('retorna null si no hay JSON válido', () => {
    expect(parseLLMJson('no hay json')).toBeNull();
    expect(parseLLMJson('')).toBeNull();
    expect(parseLLMJson(null)).toBeNull();
  });

  it('retorna null si JSON no parsea', () => {
    expect(parseLLMJson('{ broken json with trailing , }')).toBeNull();
  });

  it('maneja JSON multilinea', () => {
    const text = `Algo de texto.
{
  "title": "Trozador invernadero",
  "severity": "high",
  "count_affected": 10
}
Fin del mensaje.`;
    const r = parseLLMJson(text);
    expect(r.title).toBe('Trozador invernadero');
    expect(r.count_affected).toBe(10);
  });

  it('captura solo el primer JSON si hay múltiples', () => {
    const r = parseLLMJson('{"a":1} luego {"b":2}');
    expect(r).toEqual({ a: 1 });
  });
});

describe('caseStudyVoiceExtractor — exports', () => {
  it('SEVERITY_VOCAB tiene 4 niveles canónicos', () => {
    const sevs = Object.keys(__TEST__.SEVERITY_VOCAB);
    expect(sevs).toEqual(['critical', 'high', 'medium', 'low']);
  });

  it('PROMPT_VERSION y MODEL están definidos', () => {
    expect(__TEST__.PROMPT_VERSION).toMatch(/^v\d/);
    expect(__TEST__.MODEL).toBeTruthy();
    expect(__TEST__.MODEL).toMatch(/qwen|gemma|llama|mistral/i);
  });
});
