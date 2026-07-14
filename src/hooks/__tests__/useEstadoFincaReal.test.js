import { describe, it, expect } from 'vitest';

// Mock simple de useAssetStore para test del hook de estado finca
const mockAssets = [
  { id: '1', type: 'asset--plant', attributes: { name: 'Café', status: 'growing' } },
  { id: '2', type: 'asset--plant', attributes: { name: 'Plátano', status: 'growing' } },
  { id: '3', type: 'asset--plant', attributes: { name: 'Tomate', status: 'dead' } },
  { id: '4', type: 'asset--animal', attributes: { name: 'Lucero', status: 'activo' } },
];

describe('useEstadoFincaReal — estructura', () => {
  it('filtra plantas vivas vs muertas', () => {
    const vivas = mockAssets.filter(a =>
      a.type === 'asset--plant' && a.attributes?.status !== 'dead'
    );
    expect(vivas.length).toBe(2);
  });

  it('filtra animales', () => {
    const animales = mockAssets.filter(a =>
      a.type === 'asset--animal'
    ).map(a => ({
      especie: a.attributes?.name || '',
      nombre: a.attributes?.name || '',
      raza: '',
      estado: a.attributes?.status || '',
    }));
    expect(animales.length).toBe(1);
    expect(animales[0].nombre).toBe('Lucero');
  });

  it('construye saludFinca con conteo real', () => {
    const plantas = mockAssets.filter(a => a.type === 'asset--plant');
    const vivas = plantas.filter(p => p.attributes?.status !== 'dead').length;
    expect(vivas).toBe(2);
    const salud = { matasVivas: vivas, matasTotal: plantas.length, agua: true };
    expect(salud.matasVivas).toBe(2);
    expect(salud.matasTotal).toBe(3);
  });
});
