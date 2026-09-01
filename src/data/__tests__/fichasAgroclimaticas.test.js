import { describe, expect, it } from 'vitest';
import { FICHAS_AGROCLIMATICAS, FUENTES_AGROCLIMATICAS, evaluarAlertasAgroclimaticas, resolverFichaAgroclimatica } from '../fichasAgroclimaticas.js';

describe('fichas agroclimáticas', () => {
  it('cubre los ocho cultivos y cada valor numérico verificado referencia una fuente', () => {
    expect(Object.keys(FICHAS_AGROCLIMATICAS)).toHaveLength(8);
    const verificarFuentes = (valor) => {
      if (!valor || typeof valor !== 'object') return;
      if (valor.estado === 'verificado') expect(FUENTES_AGROCLIMATICAS[valor.fuente]).toBeTruthy();
      Object.values(valor).forEach(verificarFuentes);
    };
    Object.values(FICHAS_AGROCLIMATICAS).forEach((ficha) => {
      verificarFuentes(ficha.temperatura);
      verificarFuentes(ficha.humedad);
      verificarFuentes(ficha.altitud);
      verificarFuentes(ficha.precipitacion);
      ficha.alertas.forEach((item) => {
        expect(FUENTES_AGROCLIMATICAS[item.umbral.fuente]).toBeTruthy();
      });
    });
  });

  it('resuelve variantes de invernadero a la ficha base', () => {
    expect(resolverFichaAgroclimatica('Tomate Cherry-Invernadero')?.id).toBe('tomate_cherry');
    expect(resolverFichaAgroclimatica('Limón-Invernadero')?.id).toBe('limon');
  });

  it('usa las alertas de temperatura e índices solo cuando el dato está disponible', () => {
    const alertas = evaluarAlertasAgroclimaticas(FICHAS_AGROCLIMATICAS.fresa, { tempMin: 7, tempMax: 28, humedad: 76, spei: -1.2, spi: 1.1 });
    expect(alertas.map((item) => item.id)).toEqual(expect.arrayContaining(['frio', 'calor', 'humedad-alta', 'deficit-hidrico', 'exceso-hidrico']));
  });
});
