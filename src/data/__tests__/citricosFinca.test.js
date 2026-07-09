import { describe, it, expect } from 'vitest';
// @types/node no está instalado en el repo (gap conocido, ya tolerado en
// MundosDeMiFinca.reachability.test.jsx / dataJsonValidity.test.js): tsc no
// resuelve los specifiers "node:*". Runtime (vitest/node) los resuelve sin
// problema; irreducible sin sumar @types/node al repo entero (fuera de alcance).
// @ts-expect-error TS2591 — ver comentario arriba.
import { readFileSync, existsSync } from 'node:fs';
// @ts-expect-error TS2591 — ver comentario arriba.
import { fileURLToPath } from 'node:url';
// @ts-expect-error TS2591 — ver comentario arriba.
import path from 'node:path';
import {
  VARIEDADES_CITRICOS,
  PLAGAS_CITRICOS,
  HLB_CUARENTENA,
  GOMOSIS_PENDIENTE,
  PISO_TERMICO,
  CREDITOS_FOTOS_CITRICOS,
  fotoSrc,
  ESTACIONES_CITRICOS,
} from '../citricosFinca';
import { PERENNIAL_CYCLES } from '../perennialCycles';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const grafo = JSON.parse(readFileSync(path.join(REPO_ROOT, 'public/grafo-relations.json'), 'utf8'));

// Especies cítricas del grafo y el conjunto de plagas (plaga) que las AFFECTS.
const CITRUS_KEYS = ['citrus_sinensis', 'citrus_reticulata', 'citrus_latifolia'];
const plagasGrafo = new Set();
for (const k of CITRUS_KEYS) {
  const sp = grafo.species[k];
  for (const pc of sp?.pest_controllers || []) plagasGrafo.add(pc.plaga);
}

describe('citricosFinca — grounding al grafo (anti-alucinación)', () => {
  it('las especies cítricas de la ficha existen como nodos del grafo', () => {
    for (const k of CITRUS_KEYS) {
      expect(grafo.species[k], `falta ${k} en el grafo`).toBeTruthy();
    }
    // Las variedades marcadas enGrafo:true deben corresponder a nodos cítricos reales.
    const enGrafo = VARIEDADES_CITRICOS.filter((v) => v.enGrafo);
    expect(enGrafo.length).toBe(3); // naranja, mandarina, limón Tahití
    // Y las que NO están en el grafo se marcan honestamente (no se inventan como grounded).
    const fuera = VARIEDADES_CITRICOS.filter((v) => !v.enGrafo);
    expect(fuera.length).toBeGreaterThan(0);
  });

  it('cada plaga de la ficha traza a un nodo real del grafo (plagaGrafo válido)', () => {
    const todas = [...PLAGAS_CITRICOS, HLB_CUARENTENA];
    for (const p of todas) {
      expect(p.plagaGrafo, `plaga sin plagaGrafo: ${p.nombre || p.titulo}`).toBeTruthy();
      expect(
        plagasGrafo.has(p.plagaGrafo),
        `plagaGrafo no está en el grafo cítrico: "${p.plagaGrafo}"`,
      ).toBe(true);
    }
  });

  it('el HLB y su psílido vector están groundeados', () => {
    expect(plagasGrafo.has('Huanglongbing (HLB) / dragón amarillo de los cítricos')).toBe(true);
    expect(plagasGrafo.has('Psílido asiático de los cítricos')).toBe(true);
    // El HLB se presenta como cuarentena de reporte al ICA.
    expect(HLB_CUARENTENA.detalle).toMatch(/no tiene cura|NO tiene cura/i);
    expect(HLB_CUARENTENA.manejo.join(' ')).toMatch(/ICA/);
  });

  it('la gomosis NO se presenta como plaga groundeada (honestidad de faltante)', () => {
    // Gomosis/Phytophthora no está en el grafo para cítricos: se declara pendiente,
    // no se le inventa un plagaGrafo ni manejo con dosis.
    expect(plagasGrafo.has('Gomosis')).toBe(false);
    expect(GOMOSIS_PENDIENTE.estado).toBe('grounded_pendiente');
    const idsPlagas = PLAGAS_CITRICOS.map((p) => p.id);
    expect(idsPlagas).not.toContain('gomosis');
  });

  it('el piso térmico es honesto: cálido-templado, tope ~2100, y frío alto = NO', () => {
    const bandas = PISO_TERMICO.bandas;
    // Debe existir una banda apta óptima (caliente) y una banda "no" (frío alto).
    expect(bandas.some((b) => b.apto === 'optimo')).toBe(true);
    const frio = bandas.find((b) => b.apto === 'no');
    expect(frio, 'debe declarar explícitamente una banda de clima frío NO apta').toBeTruthy();
    expect(frio.rango).toMatch(/2100/);
    // El tope grounded (~2100 msnm) sale de perennialCycles (citrus_latifolia,
    // AGROSAVIA): la ficha NO inventa una altura por fuera de ese dato real.
    const region = PERENNIAL_CYCLES.citrus_latifolia?.region_note || '';
    expect(region).toMatch(/2100/);
    expect(PERENNIAL_CYCLES.citrus_latifolia?.confidence).toBe('alta');
    expect(PISO_TERMICO.fuente).toMatch(/2100/);
  });

  it('toda foto referida en la ficha tiene crédito y existe en disco (o se reusa)', () => {
    // Slugs referenciados por la UI (variedades, plagas con foto, HLB, y las estaciones).
    const slugsUsados = new Set([
      'naranjal', 'injerto', 'psilido', 'hlb',
      ...VARIEDADES_CITRICOS.map((v) => v.foto),
    ]);
    for (const slug of slugsUsados) {
      const cred = CREDITOS_FOTOS_CITRICOS.find((c) => c.slug === slug);
      expect(cred, `sin crédito para la foto: ${slug}`).toBeTruthy();
      expect(cred.autor && cred.licencia && cred.fuenteUrl).toBeTruthy();
      const src = fotoSrc(slug);
      expect(src, `sin src para ${slug}`).toBeTruthy();
      const abs = path.join(REPO_ROOT, 'public', src.replace(/^\//, ''));
      expect(existsSync(abs), `la foto no existe en disco: ${abs}`).toBe(true);
    }
  });

  it('el mundo tiene 5 estaciones con el piso térmico entre ellas', () => {
    expect(ESTACIONES_CITRICOS.length).toBe(5);
    expect(ESTACIONES_CITRICOS.map((e) => e.id)).toContain('piso');
  });
});
