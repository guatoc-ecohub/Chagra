/**
 * fermentos-seed.test.js — invariantes de SEGURIDAD ALIMENTARIA del catálogo de
 * fermentos. SAFETY-CRITICAL.
 *
 * Principio (seguridad-first): cada fermento alimentario DEBE llevar su bloque
 * de seguridad no vacío (alertas + señales para descartar). Los vetos deben
 * estar completos. El catálogo NO debe traer afirmaciones medicinales/curativas,
 * referencias internas (DR-/DeepSeek/etc.) ni DOIs inventados.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(
  readFileSync(join(__dirname, '..', 'fermentos-seed.json'), 'utf8'),
);

const fermentos = seed.fermentos;
const alimentarios = fermentos.filter((f) => f.tipo === 'alimentario');
const vetos = fermentos.filter((f) => f.tipo === 'veto');

describe('fermentos-seed — estructura', () => {
  it('tiene 24 nodos (18 alimentarios + 6 vetos)', () => {
    expect(fermentos).toHaveLength(24);
    expect(alimentarios).toHaveLength(18);
    expect(vetos).toHaveLength(6);
  });

  it('todos los nodos tienen id, nombre, tipo y categoria', () => {
    for (const f of fermentos) {
      expect(f.id, 'id').toBeTruthy();
      expect(f.nombre, `nombre de ${f.id}`).toBeTruthy();
      expect(['alimentario', 'veto']).toContain(f.tipo);
      expect(f.categoria, `categoria de ${f.id}`).toBeTruthy();
    }
  });
});

describe('fermentos-seed — SEGURIDAD por fermento (invariante crítico)', () => {
  it.each(alimentarios.map((f) => [f.id, f]))(
    '%s tiene un bloque de seguridad no vacío',
    (_id, f) => {
      const s = f.seguridad;
      expect(s, `${f.id} debe tener bloque seguridad`).toBeTruthy();
      expect(Array.isArray(s.alertas), `${f.id}.alertas es array`).toBe(true);
      expect(s.alertas.length, `${f.id} tiene >=1 alerta`).toBeGreaterThan(0);
      s.alertas.forEach((a) => expect(typeof a === 'string' && a.trim().length > 0).toBe(true));
      expect(Array.isArray(s.descartar_si), `${f.id}.descartar_si es array`).toBe(true);
      expect(s.descartar_si.length, `${f.id} tiene >=1 señal para descartar`).toBeGreaterThan(0);
    },
  );

  it('cada fermento alimentario cita al menos una fuente pública', () => {
    for (const f of alimentarios) {
      expect(Array.isArray(f.fuentes), `${f.id}.fuentes es array`).toBe(true);
      expect(f.fuentes.length, `${f.id} tiene >=1 fuente`).toBeGreaterThan(0);
    }
  });
});

describe('fermentos-seed — VETOS completos', () => {
  it.each(vetos.map((v) => [v.id, v]))(
    '%s tiene razón, nivel de riesgo, consecuencia y fuentes',
    (_id, v) => {
      expect(v.razon_veto, `${v.id}.razon_veto`).toBeTruthy();
      expect(['CRÍTICO', 'ALTO']).toContain(v.riesgo_nivel);
      expect(v.consecuencia_potencial, `${v.id}.consecuencia_potencial`).toBeTruthy();
      expect(Array.isArray(v.fuentes) && v.fuentes.length > 0).toBe(true);
    },
  );

  it('cubre los riesgos reales clave (botulismo, plomo, cianuro, listeria)', () => {
    const blob = JSON.stringify(vetos).toLowerCase();
    expect(blob).toMatch(/botulismo|clostridium botulinum/);
    expect(blob).toMatch(/plomo/);
    expect(blob).toMatch(/cianuro/);
    expect(blob).toMatch(/listeria/);
  });
});

describe('fermentos-seed — anti-leak y anti-claim', () => {
  const blob = JSON.stringify(seed);

  it('NO contiene DOIs inventados (10.1234/...)', () => {
    expect(blob).not.toMatch(/10\.1234\//);
  });

  it('NO contiene referencias internas (DR-/DeepSeek/Gemini/chagra_kg)', () => {
    expect(blob).not.toMatch(/\bDR-[A-Z]/);
    expect(blob).not.toMatch(/deepseek/i);
    expect(blob).not.toMatch(/chagra_kg/i);
    expect(blob).not.toMatch(/deep ?research|consolidado/i);
  });

  it('NO hace afirmaciones medicinales/curativas en recetas ni vetos', () => {
    // El único uso permitido de "cura/medicamento" es el principio anti-claim en _meta.
    const sinMeta = JSON.stringify({ ...seed, _meta: undefined });
    expect(sinMeta).not.toMatch(/\bcura\b|\bcuran\b|desintoxic|depura la sangre|refuerza (las|el) (defensas|sistema)|adelgaza/i);
  });

  it('reafirma que un fermento es un alimento, no un medicamento', () => {
    expect(seed._meta.principio.toLowerCase()).toContain('no un medicamento');
  });
});
