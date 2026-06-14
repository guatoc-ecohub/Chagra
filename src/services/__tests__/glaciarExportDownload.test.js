/**
 * glaciarExportDownload.test.js — descarga de reportes glaciares como .geojson.
 *
 * Complementa glaciarExport.test.js (que cubre toGeoJSON puro). Aquí se valida
 * la capa de descarga:
 *   - downloadGeoJSON(): exporta TODOS los reportes guardados (lista del historial).
 *   - downloadReporteGeoJSON(reporte): exporta UN reporte (detalle del historial).
 *   - downloadGeoJSONByPunto(puntoId): exporta la serie temporal de un punto.
 *
 * Se mockea db/glaciarReportes (origen de datos) y la API de descarga del DOM
 * (Blob + URL.createObjectURL + <a>.click), igual que glaciarCaaml.test.js.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { getAll: mockGetAll, getByPunto: mockGetByPunto } = vi.hoisted(() => ({
  getAll: vi.fn(),
  getByPunto: vi.fn(),
}));

vi.mock('../../db/glaciarReportes', () => ({
  glaciarReportes: {
    getAll: mockGetAll,
    getByPunto: mockGetByPunto,
  },
}));

import {
  downloadGeoJSON,
  downloadReporteGeoJSON,
  downloadGeoJSONByPunto,
} from '../glaciarExport';

const REPORTE = {
  id: 'glaciar-1',
  puntoId: 'RITACUBA-FRENTE-01',
  guia: 'María',
  montana: 'cocuy_ritacuba',
  fechaISO: '2026-06-14T10:00:00Z',
  lat: 4.6,
  lng: -74.1,
  altitud: 4900,
  dureza: 'H1',
  tipoSuperficie: 'hielo_glaciar_azul',
  estado: 'estable',
  distanciaBordeHieloM: 15,
};

let clickSpy;
let createObjectURLSpy;
let revokeObjectURLSpy;
let createElementSpy;

beforeEach(() => {
  mockGetAll.mockReset();
  mockGetByPunto.mockReset();

  clickSpy = vi.fn();
  createObjectURLSpy = vi
    .spyOn(URL, 'createObjectURL')
    .mockReturnValue('blob:mock-url');
  revokeObjectURLSpy = vi
    .spyOn(URL, 'revokeObjectURL')
    .mockImplementation(() => {});
  // Interceptamos solo la creación del <a> de descarga; el resto del DOM
  // (jsdom) sigue intacto. click() se reemplaza para no navegar.
  const realCreateElement = document.createElement.bind(document);
  createElementSpy = vi
    .spyOn(document, 'createElement')
    .mockImplementation((tag) => {
      const el = realCreateElement(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });
});

afterEach(() => {
  createObjectURLSpy.mockRestore();
  revokeObjectURLSpy.mockRestore();
  createElementSpy.mockRestore();
});

describe('downloadGeoJSON — exporta todos los reportes', () => {
  it('arma el blob, dispara la descarga y devuelve metadatos', async () => {
    mockGetAll.mockResolvedValue([REPORTE]);
    const result = await downloadGeoJSON();

    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(result.featureCount).toBe(1);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.filename).toMatch(/^glaciares-reportes-\d{4}-\d{2}-\d{2}\.geojson$/);
  });

  it('lanza error si no hay reportes guardados', async () => {
    mockGetAll.mockResolvedValue([]);
    await expect(downloadGeoJSON()).rejects.toThrow(/No hay reportes guardados/i);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('lanza error si ningún reporte tiene coordenadas', async () => {
    mockGetAll.mockResolvedValue([{ ...REPORTE, lat: null, lng: null }]);
    await expect(downloadGeoJSON()).rejects.toThrow(/no tienen coordenadas/i);
    expect(clickSpy).not.toHaveBeenCalled();
  });
});

describe('downloadReporteGeoJSON — exporta un reporte', () => {
  it('exporta el reporte indicado (sin tocar la base de datos)', () => {
    const result = downloadReporteGeoJSON(REPORTE);

    expect(mockGetAll).not.toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(result.featureCount).toBe(1);
    // El nombre usa el puntoId cuando existe.
    expect(result.filename).toBe('glaciar-RITACUBA-FRENTE-01.geojson');
  });

  it('cae al id cuando el reporte no tiene puntoId', () => {
    const result = downloadReporteGeoJSON({ ...REPORTE, puntoId: null });
    expect(result.filename).toBe('glaciar-glaciar-1.geojson');
  });

  it('lanza error si el reporte no tiene coordenadas', () => {
    expect(() => downloadReporteGeoJSON({ ...REPORTE, lat: null, lng: null })).toThrow(
      /no tiene coordenadas/i
    );
    expect(clickSpy).not.toHaveBeenCalled();
  });
});

describe('downloadGeoJSONByPunto — exporta la serie de un punto', () => {
  it('descarga solo los reportes del punto pedido', async () => {
    mockGetByPunto.mockResolvedValue([REPORTE]);
    const result = await downloadGeoJSONByPunto('RITACUBA-FRENTE-01');

    expect(mockGetByPunto).toHaveBeenCalledWith('RITACUBA-FRENTE-01');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(result.featureCount).toBe(1);
    expect(result.filename).toMatch(/^glaciar-RITACUBA-FRENTE-01-\d{4}-\d{2}-\d{2}\.geojson$/);
  });

  it('lanza error si el punto no tiene reportes con coordenadas', async () => {
    mockGetByPunto.mockResolvedValue([]);
    await expect(downloadGeoJSONByPunto('PUNTO-VACIO')).rejects.toThrow(
      /No hay reportes con coordenadas/i
    );
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
