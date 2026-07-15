import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Tests de integridad del enriquecimiento del grafo (tarea #grafo-conocimiento,
// 2026-07-14). Verifican:
//   (a) Que el JSON public/grafo-relations.json tenga las 6 secciones nuevas
//       (_piso_termico, _micorrizas, _polinizacion, _cambio_climatico,
//       _fitoquimica, _alelopatia) con la estructura esperada.
//   (b) Que TODA referencia a especies (por id) apunte a una especie que
//       existe en `species`. Es la llave anti-alucinación del enriquecimiento.
//   (c) Que cada sección tenga `definicion` (string) y `fuentes` (array no
//       vacío con `cite` en cada entrada).
//
// Estos tests son estáticos (leen el archivo directo, no fetch), para que
// sirvan como gate en CI.

const __dirname = dirname(fileURLToPath(import.meta.url));
const GRAFO_PATH = join(__dirname, '..', '..', '..', 'public', 'grafo-relations.json');

const raw = readFileSync(GRAFO_PATH, 'utf8');
const data = JSON.parse(raw);

const KEYS_DE_SPECIES = new Set([
  'especie_id',
  'hospederos_en_grafo',
  'cultivos_representativos',
  'cultivos_beneficiados_en_grafo',
  'especies_nativas_representativas',
  'especies_nucleo_en_grafo',
  'especies_en_grafo_afectadas',
  'especies_en_grafo',
  'especies_beneficiadas_en_grafo',
  'especies_antagonistas_en_grafo',
  'cultivos_alta_dependencia_amf',
  'cultivos_alta_dependencia',
]);

function referenciasDeEspecies(node, parentKey = null, acc = new Set()) {
  if (Array.isArray(node)) {
    for (const x of node) referenciasDeEspecies(x, parentKey, acc);
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'string' && KEYS_DE_SPECIES.has(k)) acc.add(v);
      referenciasDeEspecies(v, k, acc);
    }
  } else if (typeof node === 'string' && KEYS_DE_SPECIES.has(parentKey)) {
    acc.add(node);
  }
  return acc;
}

describe('enriquecimiento grafo-relations.json (tarea #grafo-conocimiento)', () => {
  const SECCIONES = [
    '_piso_termico',
    '_micorrizas',
    '_polinizacion',
    '_cambio_climatico',
    '_fitoquimica',
    '_alelopatia',
  ];

  it('las 6 secciones nuevas existen como claves top-level', () => {
    for (const sec of SECCIONES) {
      expect(data[sec], `Sección ${sec} debe existir`).toBeDefined();
      expect(typeof data[sec]).toBe('object');
      expect(data[sec]).not.toBeNull();
    }
  });

  it('cada sección tiene `definicion` (string) y `fuentes` (array no vacío)', () => {
    for (const sec of SECCIONES) {
      const s = data[sec];
      expect(typeof s.definicion).toBe('string');
      expect(s.definicion.length).toBeGreaterThan(20);
      expect(Array.isArray(s.fuentes)).toBe(true);
      expect(s.fuentes.length).toBeGreaterThan(0);
      for (const f of s.fuentes) {
        expect(typeof f.cite).toBe('string');
        expect(f.cite.length).toBeGreaterThan(10);
      }
    }
  });

  it('las fuentes declaran DOI cuando afirman DOI (formato numérico)', () => {
    for (const sec of SECCIONES) {
      for (const f of data[sec].fuentes || []) {
        if (f.doi !== undefined) {
          // Aceptamos DOI URL o 10.xxxx/yyy
          expect(f.doi).toMatch(/^10\./);
        }
      }
    }
  });

  it('TODA especie referenciada existe en `species` (anti-alucinación)', () => {
    const speciesIds = new Set(Object.keys(data.species));
    expect(speciesIds.size).toBeGreaterThan(100);
    const faltantes = new Set();
    let totalRefs = 0;
    for (const sec of SECCIONES) {
      const refs = referenciasDeEspecies(data[sec]);
      for (const id of refs) {
        totalRefs += 1;
        if (!speciesIds.has(id)) faltantes.add(`${sec}:${id}`);
      }
    }
    expect(totalRefs).toBeGreaterThan(50); // cobertura mínima esperada
    if (faltantes.size > 0) {
      throw new Error(
        'Referencias a species inexistentes:\n  ' +
          [...faltantes].slice(0, 30).join('\n  '),
      );
    }
  });

  it('_piso_termico declara los 6 pisos con rango altitudinal y especies', () => {
    const pisos = data._piso_termico.pisos;
    expect(pisos).toHaveLength(6);
    const ids = pisos.map((p) => p.id);
    expect(ids).toEqual([
      'calido',
      'templado',
      'frio',
      'paramo',
      'superparamo',
      'nival',
    ]);
    // Piso cálido debe listar más de 5 cultivos
    const calido = pisos.find((p) => p.id === 'calido');
    expect(calido.cultivos_representativos.length).toBeGreaterThan(5);
    // Piso páramo NO es cultivable
    const paramo = pisos.find((p) => p.id === 'paramo');
    expect(paramo.cultivable).toBe(false);
    expect(paramo.cultivos_representativos).toHaveLength(0);
    // Piso páramo declara especies nativas (frailejón, pajonal)
    expect(paramo.especies_nativas_representativas.length).toBeGreaterThan(0);
  });

  it('_piso_termico declara gradiente térmico lapse rate', () => {
    expect(typeof data._piso_termico.gradiente_termico_c_por_100m).toBe('number');
    // lapse rate estándar tropical ~0.6 °C/100m
    expect(data._piso_termico.gradiente_termico_c_por_100m).toBeGreaterThan(0.4);
    expect(data._piso_termico.gradiente_termico_c_por_100m).toBeLessThan(0.9);
  });

  it('_micorrizas declara AMF + ecto + ericoid + orquideoides', () => {
    const tipos = data._micorrizas.tipos.map((t) => t.id);
    expect(tipos).toContain('amf');
    expect(tipos).toContain('ecto');
    expect(tipos).toContain('ericoid');
    // AMF debe tener >5 huéspedes en el grafo
    const amf = data._micorrizas.tipos.find((t) => t.id === 'amf');
    expect(amf.hospederos_en_grafo.length).toBeGreaterThan(5);
  });

  it('_polinizacion declara meliponini, bombus, xylocopa', () => {
    const ids = data._polinizacion.polinizadores.map((p) => p.id);
    expect(ids).toContain('meliponini');
    expect(ids).toContain('bombus');
    expect(ids).toContain('xylocopa');
    // Xylocopa debe beneficiar Passiflora (evidencia maracuyá)
    const xylocopa = data._polinizacion.polinizadores.find((p) => p.id === 'xylocopa');
    expect(xylocopa.cultivos_beneficiados_en_grafo).toContain('passiflora_edulis_flavicarpa');
  });

  it('_cambio_climatico declara efectos + estrategias_resiliencia', () => {
    expect(data._cambio_climatico.efectos.length).toBeGreaterThan(0);
    expect(data._cambio_climatico.estrategias_resiliencia.length).toBeGreaterThan(0);
    const efectosIds = data._cambio_climatico.efectos.map((e) => e.id);
    expect(efectosIds).toContain('migracion_altitudinal_plagas');
    expect(efectosIds).toContain('retroceso_glaciar');
  });

  it('_fitoquimica declara al menos alcaloides, polifenoles, glucosinolatos, terpenos', () => {
    const ids = data._fitoquimica.metabolitos.map((m) => m.id);
    expect(ids).toContain('alcaloides');
    expect(ids).toContain('polifenoles');
    expect(ids).toContain('glucosinolatos');
    expect(ids).toContain('terpenos_aceites_esenciales');
    // Cada metabolito debe tener al menos 1 ejemplo en el grafo
    for (const m of data._fitoquimica.metabolitos) {
      expect(m.ejemplos_en_grafo.length).toBeGreaterThan(0);
    }
  });

  it('_alelopatia declara ejemplos con compuesto_principal y uso_agroecologico', () => {
    expect(data._alelopatia.ejemplos_en_grafo.length).toBeGreaterThan(3);
    for (const ej of data._alelopatia.ejemplos_en_grafo) {
      expect(typeof ej.especie_id).toBe('string');
      expect(typeof ej.compuesto_principal).toBe('string');
      expect(typeof ej.uso_agroecologico).toBe('string');
    }
  });

  it('_meta declara los campos de auditoría del enriquecimiento', () => {
    expect(data._meta.knowledge_topic_count).toBe(6);
    expect(Array.isArray(data._meta.knowledge_topics_exported)).toBe(true);
    expect(data._meta.knowledge_topics_exported).toEqual(
      expect.arrayContaining([
        'piso_termico',
        'micorrizas',
        'polinizacion',
        'cambio_climatico',
        'fitoquimica',
        'alelopatia',
      ]),
    );
    expect(data._meta.conocimiento_ampliado_2026_07_14).toBeTruthy();
  });

  it('el JSON sigue siendo parseable y conserva species + _pest_synonyms', () => {
    expect(Object.keys(data.species).length).toBeGreaterThanOrEqual(134);
    expect(data._pest_synonyms).toBeDefined();
    expect(data._pest_index).toBeDefined();
  });
});
