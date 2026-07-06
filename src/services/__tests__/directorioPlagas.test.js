import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock de las fuentes EXTERNAS: catálogo SQLite, grafo offline e imágenes.
// El catálogo de sanidad (sanidadData) NO se mockea: es la fuente curada real
// que queremos ejercitar de verdad.
vi.mock('../../db/catalogDB.js', () => ({
  getSpeciesById: vi.fn(),
}));
vi.mock('../grafoRelations.js', () => ({
  getRelationsForSpecies: vi.fn(),
  resolvePestSynonym: vi.fn(),
}));
vi.mock('../../utils/plagaImageResolver.js', () => ({
  findPlagaImage: vi.fn(),
}));

import { getSpeciesById } from '../../db/catalogDB.js';
import { getRelationsForSpecies, resolvePestSynonym } from '../grafoRelations.js';
import { findPlagaImage } from '../../utils/plagaImageResolver.js';
import {
  listPlagas,
  searchPlagas,
  buildPlagaFicha,
  __resetPlagasCache,
} from '../directorioPlagas.js';

beforeEach(() => {
  vi.clearAllMocks();
  __resetPlagasCache();
  // Por defecto: sin grafo ni foto (deflección honesta).
  vi.mocked(resolvePestSynonym).mockResolvedValue(null);
  vi.mocked(getRelationsForSpecies).mockResolvedValue(null);
  vi.mocked(getSpeciesById).mockResolvedValue(null);
  vi.mocked(findPlagaImage).mockResolvedValue(null);
});

describe('directorioPlagas — listPlagas', () => {
  it('lista plagas/enfermedades como tarjetas de resumen ordenadas', () => {
    const cards = listPlagas();
    expect(cards.length).toBeGreaterThan(10);
    const ids = cards.map((c) => c.id);
    expect(ids).toContain('hypothenemus_hampei'); // broca del café
    expect(ids).toContain('hemileia_vastatrix'); // roya
    // Cada tarjeta trae identidad grounded.
    const broca = cards.find((c) => c.id === 'hypothenemus_hampei');
    expect(broca.nombreComun).toMatch(/broca/i);
    expect(broca.binomio).toBe('Hypothenemus hampei');
    expect(broca.tipoLabel).toBeTruthy();
    // Orden alfabético por nombre común.
    const nombres = cards.map((c) => c.nombreComun);
    expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('EXCLUYE las carencias nutricionales (no son plaga ni enfermedad)', () => {
    const ids = listPlagas().map((c) => c.id);
    expect(ids).not.toContain('deficiencia_n');
    expect(ids).not.toContain('deficiencia_fe');
  });

  it('deriva el cultivo del nombre folk (broca → café)', () => {
    const broca = listPlagas().find((c) => c.id === 'hypothenemus_hampei');
    expect(broca.cultivos.map((x) => x.id)).toContain('cafe');
  });
});

describe('directorioPlagas — searchPlagas', () => {
  it('encuentra por término folk ("roya")', () => {
    const hits = searchPlagas('roya');
    expect(hits.some((c) => c.id === 'hemileia_vastatrix')).toBe(true);
  });

  it('encuentra por binomio ("Bemisia")', () => {
    const hits = searchPlagas('bemisia');
    expect(hits.some((c) => c.id === 'mosca_blanca')).toBe(true);
  });

  it('devuelve vacío para query muy corta', () => {
    expect(searchPlagas('a')).toEqual([]);
  });
});

describe('directorioPlagas — buildPlagaFicha (grounding)', () => {
  it('construye la ficha curada de la broca (identidad + reconocer + manejo + fuente)', async () => {
    // Grafo: la broca ataca al café y tiene controladores CONTROLS.
    vi.mocked(resolvePestSynonym).mockResolvedValue({ plaga: 'Broca del café', especiesAfectadas: ['coffea_arabica'] });
    vi.mocked(getRelationsForSpecies).mockResolvedValue({
      pest_controllers: [
        { plaga: 'Broca del café', controladores: ['Beauveria bassiana', 'Avispa parasitoide'] },
      ],
    });
    vi.mocked(getSpeciesById).mockResolvedValue({ id: 'coffea_arabica', nombre_comun: 'Café', nombre_cientifico: 'Coffea arabica' });

    const f = await buildPlagaFicha('hypothenemus_hampei');
    expect(f).toBeTruthy();
    expect(f.nombreComun).toMatch(/broca/i);
    expect(f.binomio).toBe('Hypothenemus hampei');
    expect(f.tipo).toBe('insecto');
    // reconocer
    expect(f.reconocer.pistas.length).toBeGreaterThan(0);
    expect(f.reconocer.pistas.some((p) => /huequito|grano/i.test(p.pista))).toBe(true);
    // a qué le pega: cultivo curado + especie del grafo
    expect(f.cultivos.map((c) => c.id)).toContain('cafe');
    expect(f.especiesAfectadas.map((s) => s.id)).toContain('coffea_arabica');
    // manejo agroecológico
    expect(f.manejo.biologico).toMatch(/Beauveria/);
    expect(f.manejo.controladores).toContain('Avispa parasitoide');
    expect(f.ciclo.umbral).toMatch(/2 ?%/);
    // procedencia
    expect(f.fuente).toBe('Cenicafé');
    // trazabilidad grafo
    expect(f.plagaGrafo).toBe('Broca del café');
  });

  it('degrada honesto cuando el grafo no resuelve (sin especies ni controladores extra)', async () => {
    vi.mocked(resolvePestSynonym).mockResolvedValue(null);
    const f = await buildPlagaFicha('mycena_citricolor');
    expect(f).toBeTruthy();
    expect(f.especiesAfectadas).toEqual([]);
    expect(f.manejo.controladores).toEqual([]);
    // Pero el contenido curado sigue: nombre común + fuente.
    expect(f.nombreComun).toMatch(/ojo de gallo/i);
    expect(f.fuente).toBeTruthy();
  });

  it('detecta "con qué se confunde" en nombres folk polisémicos', async () => {
    const f = await buildPlagaFicha('mycena_citricolor'); // ojo de gallo (café)
    // "gota"/"candelilla"/"viruela" comparten término folk con otras causas.
    expect(f.reconocer.confusiones.length).toBeGreaterThan(0);
  });

  it('adjunta la foto CC cuando existe en el manifiesto', async () => {
    vi.mocked(findPlagaImage).mockResolvedValue({
      url: '/plaga-images/hemileia_vastatrix.jpg', thumbUrl: '/plaga-images/hemileia_vastatrix.jpg',
      license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      rightsHolder: 'Autor', source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:x',
    });
    const f = await buildPlagaFicha('hemileia_vastatrix');
    expect(f.imagen).toBeTruthy();
    expect(f.imagen.url).toMatch(/hemileia_vastatrix\.jpg$/);
  });

  it('devuelve null para una causa inexistente', async () => {
    expect(await buildPlagaFicha('no_existe')).toBeNull();
    expect(await buildPlagaFicha('')).toBeNull();
  });

  it('construye también las carencias por deep-link, con tipo honesto', async () => {
    // No están en el directorio, pero la ficha se puede abrir desde sanidad.
    const f = await buildPlagaFicha('deficiencia_n');
    expect(f).toBeTruthy();
    expect(f.tipo).toBe('deficiencia');
  });
});
