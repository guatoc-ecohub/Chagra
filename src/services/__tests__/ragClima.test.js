import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { flattenDoc } from '../ragRetriever.js';

// Regresión del hallazgo 2026-07-15: flattenDoc solo indexaba strings >20 chars.
// Medido: 6.042 de 9.671 valores (62%) invisibles al BM25 — incluidos
// thermal_zones:'calido' (6 chars) y altitud_msnm:0 (número). El campesino
// pregunta "¿esto se me da a mí?" y la recuperación no veía ni la zona térmica
// ni la altitud.
describe('flattenDoc indexa clima y altitud', () => {
  const doc = {
    slug: 'coffea_arabica',
    thermal_zones: ['templado', 'frio'],
    requirements: { altitud_msnm: { optimo_min: 1200, optimo_max: 1800 }, temp_min: 12 },
    valor_pedagogico: 'El cafe necesita sombra y una altura que le de acidez a la taza.',
    id: 42,
    version: 3,
  };

  it('indexa las zonas termicas (strings cortos que antes se caian)', () => {
    const t = flattenDoc(doc).map((p) => p.text.toLowerCase());
    expect(t.some((x) => x.includes('templado'))).toBe(true);
    expect(t.some((x) => x.includes('frio'))).toBe(true);
  });

  it('indexa la altitud (numeros que antes se caian)', () => {
    const t = flattenDoc(doc).map((p) => p.text);
    expect(t.some((x) => x.includes('1200'))).toBe(true);
    expect(t.some((x) => x.includes('1800'))).toBe(true);
  });

  it('el dato corto lleva su clave: "calido" suelto no dice nada', () => {
    const p = flattenDoc(doc).find((x) => x.text.includes('templado'));
    expect(p.text).toMatch(/thermal.?zones/i);
  });

  it('NO indexa plumbing (id/slug/version) — diluiria el IDF', () => {
    const claves = flattenDoc(doc).map((p) => p.key);
    expect(claves).not.toContain('id');
    expect(claves).not.toContain('slug');
    expect(claves).not.toContain('version');
  });

  it('indexa valores cortos con letras, pero conserva fuera el ruido corto y los ids', () => {
    const passages = flattenDoc({
      nombre_comun: 'lulo',
      codigo_fertilizante: 'NPK',
      respuesta: 'si',
      cantidad: '12',
      hash: 'a3f0c9d1e5b7a2f4',
      uuid: '550e8400-e29b-41d4-a716-446655440000',
    });
    const texts = passages.map((p) => p.text);

    expect(texts).toContain('lulo');
    expect(texts).toContain('NPK');
    expect(texts).not.toContain('si');
    expect(texts).not.toContain('12');
    expect(texts).not.toContain('a3f0c9d1e5b7a2f4');
    expect(texts).not.toContain('550e8400-e29b-41d4-a716-446655440000');
  });

  it('no rompe lo que ya funcionaba: los textos largos siguen enteros', () => {
    const p = flattenDoc(doc).find((x) => x.key === 'valor_pedagogico');
    expect(p.text).toBe(doc.valor_pedagogico);
  });

  it('sobre las fichas reales, recupera clima donde antes habia cero', () => {
    const dir = 'public/cycle-content';
    const fs_ = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'manifest.json').slice(0, 50);
    let clima = 0;
    for (const f of fs_) {
      const d = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'));
      clima += flattenDoc(d).filter((p) => /therm|altitud|temp/i.test(p.key)).length;
    }
    expect(clima).toBeGreaterThan(0);
  });
});
