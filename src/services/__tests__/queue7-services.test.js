import { describe, it, expect } from 'vitest';
import { clasificarPisoTermico } from '../pisoTermicoClassifier';
import { valeLaPenaIoT } from '../iotValeLaPena';
import { detectarAlertaCarbono } from '../carbonoAlerta';
import { evaluarPSA } from '../psaElegibilidad';
import { checklistBiodiversidad } from '../biodiversidadMonitor';
import { modularPorENSO } from '../ensoModulador';
import { formatearRecetaAgroecologica } from '../restauracionRecetaFormatter';

describe('pisoTermicoClassifier', () => {
  it('500msnm → calido', () => { expect(clasificarPisoTermico(500)?.id).toBe('calido'); });
  it('1500msnm → templado', () => { expect(clasificarPisoTermico(1500)?.id).toBe('templado'); });
  it('2500msnm → frio', () => { expect(clasificarPisoTermico(2500)?.id).toBe('frio'); });
  it('3500msnm → paramo', () => { expect(clasificarPisoTermico(3500)?.id).toBe('paramo'); });
  it('altitud negativa → null', () => { expect(clasificarPisoTermico(-100)).toBeNull(); });
});

describe('iotValeLaPena', () => {
  it('quiereAutomatizar → NO vale', () => { expect(valeLaPenaIoT({ quiereAutomatizar: true }).vale).toBe(false); });
  it('sin cobertura → NO vale', () => { expect(valeLaPenaIoT({ coberturaCelular: false }).vale).toBe(false); });
  it('presupuesto bajo → NO vale', () => { expect(valeLaPenaIoT({ presupuesto: 100000 }).vale).toBe(false); });
  it('visita diaria → NO vale', () => { expect(valeLaPenaIoT({ visitaDiaria: true }).vale).toBe(false); });
  it('no alto valor → NO vale', () => { expect(valeLaPenaIoT({ altoValor: false }).vale).toBe(false); });
  it('todo bien → SI vale', () => {
    const r = valeLaPenaIoT({ visitaDiaria: false, altoValor: true, presupuesto: 500000, coberturaCelular: true, quiereAutomatizar: false });
    expect(r.vale).toBe(true);
  });
});

describe('carbonoAlerta', () => {
  it('"me quieren pagar por sembrar arboles" → alerta', () => {
    expect(detectarAlertaCarbono('me quieren pagar por sembrar arboles')).not.toBeNull();
  });
  it('"bonos de carbono" → alerta', () => {
    expect(detectarAlertaCarbono('bonos de carbono para mi finca')).not.toBeNull();
  });
  it('"creditos de carbono" → alerta', () => {
    expect(detectarAlertaCarbono('creditos de carbono')).not.toBeNull();
  });
  it('texto normal → null', () => {
    expect(detectarAlertaCarbono('quiero sembrar arboles')).toBeNull();
  });
});

describe('psaElegibilidad', () => {
  it('en cuenca → elegible hidrico', () => {
    const r = evaluarPSA({ enCuenca: true });
    expect(r.elegible).toBe(true);
    expect(r.modalidades[0].id).toBe('hidrico');
  });
  it('altitud >3000 → elegible biodiversidad', () => {
    const r = evaluarPSA({ altitud: 3500, enParamo: true });
    expect(r.elegible).toBe(true);
  });
  it('sin criterios → no elegible', () => {
    expect(evaluarPSA({}).elegible).toBe(false);
  });
});

describe('biodiversidadMonitor', () => {
  it('checklist tiene 4 indicadores', () => {
    expect(checklistBiodiversidad()).toHaveLength(4);
  });
});

describe('ensoModulador', () => {
  it('El Nino agrega contexto seco', () => {
    expect(modularPorENSO('el_nino', 'riegue')).toContain('Contexto ENSO');
  });
  it('fase desconocida retorna base', () => {
    expect(modularPorENSO('marte', 'riegue')).toBe('riegue');
  });
});

describe('restauracionRecetaFormatter', () => {
  it('sin datos → vacio', () => {
    expect(formatearRecetaAgroecologica({ sin_datos: true })).toBe('');
  });
  it('arreglo + roles → texto formateado', () => {
    const d = { arreglo: { nombre: 'Nucleacion', detalle: 'islas 5x5m' }, roles: { pioneras: ['aliso'] } };
    expect(formatearRecetaAgroecologica(d)).toContain('Nucleacion');
  });
});
