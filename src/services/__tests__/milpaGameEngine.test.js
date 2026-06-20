import { describe, it, expect } from 'vitest';
import {
  HERMANAS,
  crearParcela,
  sembrarEnParcela,
  esMilpaCompleta,
  diversidadParcela,
  nitrogenoFijado,
  coberturaSuelo,
  haySoporteMaizFrijol,
  lerParcela,
  saludParcela,
  factorResistencia,
  aplicarEvento,
  resumenFinca,
  EVENTOS,
} from '../milpaGameEngine';

/** Helper: parcela con los cultivos indicados. */
const parcelaCon = (...cultivos) =>
  cultivos.reduce((p, c) => sembrarEnParcela(p, c), crearParcela('t'));

describe('milpaGameEngine — siembra', () => {
  it('siembra y quita una hermana (toggle), sin duplicar', () => {
    let p = crearParcela('1');
    p = sembrarEnParcela(p, HERMANAS.MAIZ);
    expect(p.cultivos).toEqual([HERMANAS.MAIZ]);
    p = sembrarEnParcela(p, HERMANAS.MAIZ); // toggle off
    expect(p.cultivos).toEqual([]);
  });

  it('ignora cultivos que no son una de las tres hermanas', () => {
    const p = sembrarEnParcela(crearParcela('1'), 'cafe');
    expect(p.cultivos).toEqual([]);
  });

  it('cuenta la diversidad como número de hermanas distintas', () => {
    expect(diversidadParcela(parcelaCon(HERMANAS.MAIZ))).toBe(1);
    expect(diversidadParcela(parcelaCon(HERMANAS.MAIZ, HERMANAS.FRIJOL))).toBe(2);
    expect(
      diversidadParcela(parcelaCon(HERMANAS.MAIZ, HERMANAS.FRIJOL, HERMANAS.AHUYAMA)),
    ).toBe(3);
  });

  it('reconoce la milpa completa solo con las tres hermanas', () => {
    expect(esMilpaCompleta(parcelaCon(HERMANAS.MAIZ, HERMANAS.FRIJOL))).toBe(false);
    expect(
      esMilpaCompleta(parcelaCon(HERMANAS.MAIZ, HERMANAS.FRIJOL, HERMANAS.AHUYAMA)),
    ).toBe(true);
  });
});

describe('milpaGameEngine — relaciones agroecológicas reales', () => {
  it('solo el fríjol fija nitrógeno; con maíz el aporte es mayor', () => {
    expect(nitrogenoFijado(parcelaCon(HERMANAS.MAIZ))).toBe(0); // maíz no fija
    expect(nitrogenoFijado(parcelaCon(HERMANAS.AHUYAMA))).toBe(0); // ahuyama no fija
    expect(nitrogenoFijado(parcelaCon(HERMANAS.FRIJOL))).toBe(12); // fríjol solo
    expect(nitrogenoFijado(parcelaCon(HERMANAS.FRIJOL, HERMANAS.MAIZ))).toBe(60); // milpa
  });

  it('la ahuyama cubre el suelo; acompañada reduce más arvenses', () => {
    expect(coberturaSuelo(parcelaCon(HERMANAS.MAIZ))).toBe(0); // sin ahuyama
    expect(coberturaSuelo(parcelaCon(HERMANAS.AHUYAMA))).toBe(24); // sola
    expect(coberturaSuelo(parcelaCon(HERMANAS.AHUYAMA, HERMANAS.MAIZ))).toBe(55);
  });

  it('el maíz da soporte al fríjol solo si conviven', () => {
    expect(haySoporteMaizFrijol(parcelaCon(HERMANAS.MAIZ))).toBe(false);
    expect(haySoporteMaizFrijol(parcelaCon(HERMANAS.FRIJOL))).toBe(false);
    expect(haySoporteMaizFrijol(parcelaCon(HERMANAS.MAIZ, HERMANAS.FRIJOL))).toBe(true);
  });

  it('el LER crece con la asociación: mono=1, milpa=2', () => {
    expect(lerParcela(crearParcela('1'))).toBe(0); // vacía
    expect(lerParcela(parcelaCon(HERMANAS.MAIZ))).toBe(1); // monocultivo base
    expect(lerParcela(parcelaCon(HERMANAS.MAIZ, HERMANAS.FRIJOL))).toBe(1.45);
    expect(
      lerParcela(parcelaCon(HERMANAS.MAIZ, HERMANAS.FRIJOL, HERMANAS.AHUYAMA)),
    ).toBe(2);
  });
});

describe('milpaGameEngine — salud: asociación supera al monocultivo', () => {
  it('un monocultivo nunca supera la salud de la milpa completa', () => {
    const mono = saludParcela(parcelaCon(HERMANAS.MAIZ));
    const milpa = saludParcela(
      parcelaCon(HERMANAS.MAIZ, HERMANAS.FRIJOL, HERMANAS.AHUYAMA),
    );
    expect(milpa).toBeGreaterThan(mono);
    expect(mono).toBeLessThanOrEqual(45);
    expect(milpa).toBeGreaterThanOrEqual(90);
  });

  it('la parcela vacía tiene salud 0', () => {
    expect(saludParcela(crearParcela('1'))).toBe(0);
  });

  it('agregar una hermana que sinergiza sube la salud', () => {
    const maizSolo = saludParcela(parcelaCon(HERMANAS.MAIZ));
    const maizFrijol = saludParcela(parcelaCon(HERMANAS.MAIZ, HERMANAS.FRIJOL));
    expect(maizFrijol).toBeGreaterThan(maizSolo);
  });
});

describe('milpaGameEngine — resistencia a eventos por diversidad', () => {
  it('a más diversidad, menor factor de daño', () => {
    expect(factorResistencia(parcelaCon(HERMANAS.MAIZ))).toBe(1);
    expect(factorResistencia(parcelaCon(HERMANAS.MAIZ, HERMANAS.FRIJOL))).toBe(0.6);
    expect(
      factorResistencia(parcelaCon(HERMANAS.MAIZ, HERMANAS.FRIJOL, HERMANAS.AHUYAMA)),
    ).toBe(0.35);
  });

  it('ante el mismo evento, la milpa pierde menos salud que el monocultivo', () => {
    const evento = EVENTOS.find((e) => e.id === 'sequia');
    const mono = aplicarEvento(parcelaCon(HERMANAS.MAIZ), evento);
    const milpa = aplicarEvento(
      parcelaCon(HERMANAS.MAIZ, HERMANAS.FRIJOL, HERMANAS.AHUYAMA),
      evento,
    );
    expect(milpa.danoAplicado).toBeLessThan(mono.danoAplicado);
    expect(milpa.saludDespues).toBeGreaterThan(mono.saludDespues);
  });

  it('la salud tras un evento nunca baja de 0', () => {
    const evento = { dano: 999 };
    const r = aplicarEvento(parcelaCon(HERMANAS.MAIZ), evento);
    expect(r.saludDespues).toBe(0);
  });
});

describe('milpaGameEngine — resumen de finca (milpa vs monocultivo)', () => {
  it('finca vacía devuelve ceros sin reventar', () => {
    const r = resumenFinca([crearParcela('1'), crearParcela('2')]);
    expect(r.parcelasSembradas).toBe(0);
    expect(r.ventajaPct).toBe(0);
    expect(r.lerPromedio).toBe(0);
  });

  it('una finca de milpas rinde claramente más que el monocultivo equivalente', () => {
    const parcelas = [
      parcelaCon(HERMANAS.MAIZ, HERMANAS.FRIJOL, HERMANAS.AHUYAMA),
      parcelaCon(HERMANAS.MAIZ, HERMANAS.FRIJOL, HERMANAS.AHUYAMA),
    ];
    const r = resumenFinca(parcelas);
    expect(r.parcelasSembradas).toBe(2);
    expect(r.milpasCompletas).toBe(2);
    expect(r.saludTotal).toBeGreaterThan(r.rendimientoMono);
    expect(r.ventajaPct).toBeGreaterThan(0);
    expect(r.lerPromedio).toBe(2);
    expect(r.nitrogenoPromedio).toBe(60);
    expect(r.coberturaPromedio).toBe(55);
  });

  it('ignora parcelas vacías en el promedio', () => {
    const r = resumenFinca([
      parcelaCon(HERMANAS.MAIZ, HERMANAS.FRIJOL, HERMANAS.AHUYAMA),
      crearParcela('vacia'),
    ]);
    expect(r.parcelasSembradas).toBe(1);
  });
});
