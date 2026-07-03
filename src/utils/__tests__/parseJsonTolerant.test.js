// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

import { describe, it, expect } from 'vitest';
import { parseJsonTolerant } from '../parseJsonTolerant';
/** @param {unknown} x @returns {any} */
const $ = (x) => x;


describe('parseJsonTolerant', () => {
  it('parsea JSON directo válido', () => {
    const r = $(parseJsonTolerant('{"a":1,"b":"hola"}'));
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ a: 1, b: 'hola' });
  });
  it('quita fences markdown', () => {
    const r = $(parseJsonTolerant('```json\n{"score":0.8}\n```'));
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ score: 0.8 });
  });
  it('extrae JSON con prosa antes y después', () => {
    const r = $(parseJsonTolerant('Aquí está el resultado: {"common_name":"café"} fin.'));
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ common_name: 'café' });
  });
  it('repara trailing comma', () => {
    const r = $(parseJsonTolerant('{"a":1,"b":2,}'));
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ a: 1, b: 2 });
  });
  it('repara Python keywords (True/False/None)', () => {
    const r = $(parseJsonTolerant('{"verified":True,"alt":None,"err":False}'));
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ verified: true, alt: null, err: false });
  });
  it('cierra llaves faltantes (truncado por num_predict)', () => {
    const r = $(parseJsonTolerant('{"score":0.5,"issues":[{"name":"oidio"'));
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ score: 0.5, issues: [{ name: 'oidio' }] });
  });
  it('reconoce arrays como root', () => {
    const r = $(parseJsonTolerant('[1,2,3]'));
    expect(r.ok).toBe(true);
    expect(r.value).toEqual([1, 2, 3]);
  });
  it('falla limpio en input vacío', () => {
    const r = $(parseJsonTolerant(''));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('empty_input');
  });
  it('falla con error informativo en JSON irrecuperable', () => {
    const r = $(parseJsonTolerant('lorem ipsum totalmente sin estructura'));
    expect(r.ok).toBe(false);
    expect(r.error).toBe('json_unparseable');
  });
  it('preserva el texto raw truncado en fallos', () => {
    const huge = 'x'.repeat(1000);
    const r = $(parseJsonTolerant(huge));
    expect(r.ok).toBe(false);
    expect(r.raw.length).toBeLessThanOrEqual(501);
  });
  it('expone repaired=false en parse directo y true cuando reparó', () => {
    const $p = (s) => $(parseJsonTolerant(s));
    expect($p('{"a":1}').repaired).toBe(false);
    expect($p('{"a":1,').repaired).toBe(true);
    expect($p('{"a":1,"b":2,}').repaired).toBe(true);
  });
  it('cierra string abierto truncado sin inventar más campos', () => {
    const r = $(parseJsonTolerant('{"crop":"papa","location":"lote nort'));
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ crop: 'papa', location: 'lote nort' });
    expect(r.value.quantity).toBeUndefined();
  });
  it('cierra array sin cerrar (corte de stream)', () => {
    const r = $(parseJsonTolerant('[{"crop":"papa","quantity":3,"location":"norte"'));
    expect(r.ok).toBe(true);
    expect(r.value).toEqual([{ crop: 'papa', quantity: 3, location: 'norte' }]);
  });
  it('coma colgante con objeto abierto a la vez', () => {
    const r = $(parseJsonTolerant('{"a":1,'));
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ a: 1 });
  });
  it('doble objeto pegado: toma el primero balanceado (no inventa fusión)', () => {
    const r = $(parseJsonTolerant('{"x":1}{"y":2}'));
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ x: 1 });
  });
  it('basura tras el último valor válido: recorta y parsea', () => {
    const r = $(parseJsonTolerant('{"ok":true} <fin del turno del modelo>'));
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ ok: true });
  });
  it('clave sin valor (truncado en `:`) NO se rellena → falla limpio', () => {
    const r = $(parseJsonTolerant('{"crop":"papa","quantity":'));
    if (r.ok) {
      expect(r.value.quantity).toBeUndefined();
    } else {
      expect(r.ok).toBe(false);
    }
  });
  it('basura totalmente irreparable → ok:false (no inventa data)', () => {
    const r = $(parseJsonTolerant('}{][ esto no es json ][}{'));
    expect(r.ok).toBe(false);
  });
  it('caso real Gemma con prosa + json + cierre faltante', () => {
    const r = $(parseJsonTolerant(`Voy a analizar la foto.
\`\`\`json
{
  "score": 0.72,
  "issues": [
    {"name": "manchas amarillas", "severity": "media"
\`\`\``));
    expect(r.ok).toBe(true);
    expect(r.value.score).toBe(0.72);
    expect(Array.isArray(r.value.issues)).toBe(true);
  });
});
