import { describe, it, expect } from 'vitest';
import { valeLaPenaIoT } from '../iotValeLaPena.js';

describe('valeLaPenaIoT', () => {
  it('no vale si quiere automatizar', () => {
    const r = valeLaPenaIoT({ quiereAutomatizar: true, coberturaCelular: true, presupuesto: 500000, visitaDiaria: false, altoValor: true });
    expect(r.vale).toBe(false);
  });

  it('no vale sin cobertura celular', () => {
    const r = valeLaPenaIoT({ coberturaCelular: false });
    expect(r.vale).toBe(false);
  });

  it('no vale si presupuesto < 300000', () => {
    const r = valeLaPenaIoT({ presupuesto: 200000, coberturaCelular: true });
    expect(r.vale).toBe(false);
  });

  it('no vale si visita diaria', () => {
    const r = valeLaPenaIoT({ visitaDiaria: true, coberturaCelular: true, presupuesto: 500000 });
    expect(r.vale).toBe(false);
  });

  it('no vale si no es alto valor', () => {
    const r = valeLaPenaIoT({ altoValor: false, coberturaCelular: true, presupuesto: 500000, visitaDiaria: false });
    expect(r.vale).toBe(false);
  });

  it('vale la pena con condiciones optimas', () => {
    const r = valeLaPenaIoT({
      quiereAutomatizar: false,
      coberturaCelular: true,
      presupuesto: 500000,
      visitaDiaria: false,
      altoValor: true,
    });
    expect(r.vale).toBe(true);
    expect(r.razon).toBeTruthy();
    expect(r.costo).toBeTruthy();
  });
});
