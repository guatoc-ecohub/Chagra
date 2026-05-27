// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

import { describe, it, expect } from 'vitest';
import { parseJsonTolerant } from '../parseJsonTolerant';

describe('parseJsonTolerant', () => {
  it('parsea JSON directo válido', () => {
    const r = parseJsonTolerant('{"a":1,"b":"hola"}');
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ a: 1, b: 'hola' });
    expect(r.strategy).toBe('direct');
  });

  it('quita fences markdown', () => {
    const r = parseJsonTolerant('```json\n{"score":0.8}\n```');
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ score: 0.8 });
  });

  it('extrae JSON con prosa antes y después', () => {
    const r = parseJsonTolerant('Aquí está el resultado: {"common_name":"café"} fin.');
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ common_name: 'café' });
    expect(r.strategy).toBe('balanced_extract');
  });

  it('repara trailing comma', () => {
    const r = parseJsonTolerant('{"a":1,"b":2,}');
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ a: 1, b: 2 });
  });

  it('repara Python keywords (True/False/None)', () => {
    const r = parseJsonTolerant('{"verified":True,"alt":None,"err":False}');
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ verified: true, alt: null, err: false });
  });

  it('cierra llaves faltantes (truncado por num_predict)', () => {
    const r = parseJsonTolerant('{"score":0.5,"issues":[{"name":"oidio"');
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ score: 0.5, issues: [{ name: 'oidio' }] });
    expect(r.strategy).toBe('auto_close_braces');
  });

  it('reconoce arrays como root', () => {
    const r = parseJsonTolerant('[1,2,3]');
    expect(r.ok).toBe(true);
    expect(r.value).toEqual([1, 2, 3]);
  });

  it('falla limpio en input vacío', () => {
    const r = parseJsonTolerant('');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('empty_input');
  });

  it('falla con error informativo en JSON irrecuperable', () => {
    const r = parseJsonTolerant('lorem ipsum totalmente sin estructura');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('json_unparseable');
  });

  it('preserva el texto raw truncado en fallos', () => {
    const huge = 'x'.repeat(1000);
    const r = parseJsonTolerant(huge);
    expect(r.ok).toBe(false);
    expect(r.raw.length).toBeLessThanOrEqual(501);
  });

  it('caso real Gemma con prosa + json + cierre faltante', () => {
    const realLLMOutput = `Voy a analizar la foto.
\`\`\`json
{
  "score": 0.72,
  "issues": [
    {"name": "manchas amarillas", "severity": "media"
\`\`\``;
    const r = parseJsonTolerant(realLLMOutput);
    expect(r.ok).toBe(true);
    expect(r.value.score).toBe(0.72);
    expect(Array.isArray(r.value.issues)).toBe(true);
  });
});
