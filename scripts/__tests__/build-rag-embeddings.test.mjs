import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFEST_PATH = resolve(ROOT, 'public/cycle-content/manifest.json');
const CORPUS_DIR = resolve(ROOT, 'public/cycle-content');

let extractPassageText;

beforeAll(async function () {
  vi.stubGlobal('fetch', function () {
    throw new Error('fetch should not run during module import');
  });

  const mod = await import('../build-rag-embeddings.mjs');
  extractPassageText = mod.extractPassageText;
});

afterAll(function () {
  vi.unstubAllGlobals();
});

describe('build-rag-embeddings import', function () {
  it('exports extractPassageText without touching fetch', function () {
    expect(typeof extractPassageText).toBe('function');
  });
});

describe('extractPassageText branches', function () {
  it('returns valor_pedagogico', function () {
    const doc = { valor_pedagogico: 'Texto pedagogico' };
    expect(extractPassageText(doc)).toBe('Texto pedagogico');
  });

  it('includes milestone labels and descriptions', function () {
    const doc = {
      milestones: [
        { label: 'Fase uno', description: 'Detalle uno' },
        { label: 'Fase dos' },
      ],
    };
    expect(extractPassageText(doc)).toBe('Fase uno Detalle uno Fase dos');
  });

  it('joins companions from especie and nombre', function () {
    const doc = {
      companions: [
        { especie: 'Solanum lycopersicum' },
        { nombre: 'Albahaca' },
        { especie: '', nombre: '' },
      ],
    };
    expect(extractPassageText(doc)).toBe('Solanum lycopersicum, Albahaca');
  });

  it('includes failure mode text', function () {
    const doc = {
      failure_modes: [
        { mode: 'Exceso de agua', solucion: 'Mejor drenaje' },
        { mode: 'Poca luz' },
      ],
    };
    expect(extractPassageText(doc)).toBe('Exceso de agua Mejor drenaje Poca luz');
  });

  it('returns leccion_agroecologica', function () {
    const doc = { leccion_agroecologica: 'Leccion viva' };
    expect(extractPassageText(doc)).toBe('Leccion viva');
  });

  it('embebe piso termico (thermal_zones) como frase (RUNPATH #9)', function () {
    const doc = { thermal_zones: ['templado', 'frio'] };
    expect(extractPassageText(doc)).toBe('Piso termico: templado, frio.');
  });

  it('embebe altitud/temperatura/agua desde requirements', function () {
    const doc = {
      requirements: {
        altitud_msnm: { optimo_min: 2200, optimo_max: 2800 },
        temperatura_c: { optimo_min: 12, optimo_max: 20 },
        agua: 'medio',
      },
    };
    expect(extractPassageText(doc)).toBe(
      'Altitud optima: 2200 a 2800 msnm. Temperatura optima: 12 a 20 grados C. Requerimiento de agua: medio.',
    );
  });
});

describe('extractPassageText corpus coverage', function () {
  it('produces non-empty text for every slug in the manifest', function () {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    expect(manifest.slugs).toHaveLength(501);

    for (const slug of manifest.slugs) {
      const docPath = resolve(CORPUS_DIR, `${slug}.json`);
      const doc = JSON.parse(readFileSync(docPath, 'utf8'));
      const text = extractPassageText(doc);
      expect(text.trim(), `slug ${slug}`).not.toBe('');
    }
  });
});
