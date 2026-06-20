import { describe, it, expect } from 'vitest';
import {
  CULTIVOS,
  HERMANAS,
  crearParcela,
  crearJuego,
  sembrarEnParcela,
  espaciosUsadosParcela,
  esAsociacionCompleta,
  esMilpaCompleta,
  diversidadParcela,
  identificarAsociacion,
  describirAsociacionCompleta,
  nitrogenoFijado,
  coberturaSuelo,
  sombraParcela,
  controlPlaga,
  haySoporteFisico,
  haySoporteMaizFrijol,
  lerParcela,
  saludParcela,
  factorResistencia,
  aplicarEvento,
  resumenFinca,
  EVENTOS,
  ASOCIACIONES,
  avanzarTemporada,
  verificarLogros,
  SLOTS_POR_PARCELA,
} from '../milpaGameEngine';

/** Helper: parcela con los cultivos indicados. */
const parcelaCon = (...cultivos) =>
  cultivos.reduce((p, c) => sembrarEnParcela(p, c), crearParcela('t'));

describe('milpaGameEngine — siembra', () => {
  it('siembra y quita un cultivo (toggle), sin duplicar', () => {
    let p = crearParcela('1');
    p = sembrarEnParcela(p, CULTIVOS.MAIZ);
    expect(p.cultivos).toEqual([CULTIVOS.MAIZ]);
    p = sembrarEnParcela(p, CULTIVOS.MAIZ); // toggle off
    expect(p.cultivos).toEqual([]);
  });

  it('ignora cultivos que no son válidos', () => {
    const p = sembrarEnParcela(crearParcela('1'), 'invalido');
    expect(p.cultivos).toEqual([]);
  });

  it('limita la siembra por espacios de parcela', () => {
    let p = crearParcela('1');
    p = sembrarEnParcela(p, CULTIVOS.MAIZ);
    p = sembrarEnParcela(p, CULTIVOS.FRIJOL);
    p = sembrarEnParcela(p, CULTIVOS.AHUYAMA);

    expect(p.cultivos).toEqual([CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA]);
    expect(espaciosUsadosParcela(p)).toBe(SLOTS_POR_PARCELA);

    const rechazada = sembrarEnParcela(p, CULTIVOS.CEBOLLA);
    expect(rechazada.cultivos).toEqual([CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA]);
    expect(rechazada.motivo).toBe('no cabe');
  });

  it('cuenta la diversidad como número de cultivos distintos', () => {
    expect(diversidadParcela(parcelaCon(CULTIVOS.MAIZ))).toBe(1);
    expect(diversidadParcela(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL))).toBe(2);
    expect(
      diversidadParcela(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA)),
    ).toBe(3);
  });

  it('identifica correctamente la milpa', () => {
    expect(identificarAsociacion(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL))).toBeNull();
    expect(
      identificarAsociacion(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA)),
    ).toBe('milpa');
  });

  it('identifica correctamente el SAF café', () => {
    expect(
      identificarAsociacion(parcelaCon(CULTIVOS.CAFE, CULTIVOS.GUAMO, CULTIVOS.PLATANO)),
    ).toBe('saf_cafe');
  });

  it('identifica correctamente hortalizas', () => {
    expect(
      identificarAsociacion(parcelaCon(CULTIVOS.CEBOLLA, CULTIVOS.ZANAHORIA)),
    ).toBe('hortalizas');
  });

  it('describe una asociación completa con una frase narrativa', () => {
    expect(describirAsociacionCompleta('milpa')).toContain('Descubriste la Milpa');
    expect(describirAsociacionCompleta('saf_cafe')).toContain('café');
  });

  it('reconoce asociaciones completas', () => {
    expect(esAsociacionCompleta(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL))).toBe(false);
    expect(
      esAsociacionCompleta(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA)),
    ).toBe(true);
  });

  // Retrocompatibilidad
  it('esMilpaCompleta es alias de identificarAsociacion === "milpa"', () => {
    expect(esMilpaCompleta(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA))).toBe(true);
    expect(esMilpaCompleta(parcelaCon(CULTIVOS.CAFE, CULTIVOS.GUAMO))).toBe(false);
  });
});

describe('milpaGameEngine — relaciones agroecológicas reales', () => {
  it('solo las leguminosas fijan nitrógeno', () => {
    expect(nitrogenoFijado(parcelaCon(CULTIVOS.MAIZ))).toBe(0);
    expect(nitrogenoFijado(parcelaCon(CULTIVOS.AHUYAMA))).toBe(0);
    expect(nitrogenoFijado(parcelaCon(CULTIVOS.FRIJOL))).toBe(12);
    expect(nitrogenoFijado(parcelaCon(CULTIVOS.FRIJOL, CULTIVOS.MAIZ))).toBe(60);
  });

  it('el guamo fija nitrógeno en SAF café', () => {
    expect(nitrogenoFijado(parcelaCon(CULTIVOS.CAFE, CULTIVOS.GUAMO))).toBe(45);
  });

  it('el matarratón fija nitrógeno en SAF cacao', () => {
    expect(nitrogenoFijado(parcelaCon(CULTIVOS.CACAO, CULTIVOS.MATARRATON))).toBe(55);
  });

  it('la ahuyama y el maní forrajero cubren el suelo', () => {
    expect(coberturaSuelo(parcelaCon(CULTIVOS.MAIZ))).toBe(0);
    expect(coberturaSuelo(parcelaCon(CULTIVOS.AHUYAMA))).toBe(24);
    expect(coberturaSuelo(parcelaCon(CULTIVOS.AHUYAMA, CULTIVOS.MAIZ))).toBe(55);
    expect(coberturaSuelo(parcelaCon(CULTIVOS.FRUTAL, CULTIVOS.MANI_FORRAJERO))).toBe(50);
  });

  it('los árboles dan sombra', () => {
    expect(sombraParcela(parcelaCon(CULTIVOS.MAIZ))).toBe(0);
    expect(sombraParcela(parcelaCon(CULTIVOS.CAFE, CULTIVOS.GUAMO))).toBe(35);
    expect(sombraParcela(parcelaCon(CULTIVOS.CAFE, CULTIVOS.GUAMO, CULTIVOS.PLATANO))).toBe(40);
  });

  it('la diversidad y repelencia controlan plagas', () => {
    expect(controlPlaga(parcelaCon(CULTIVOS.MAIZ))).toBe(0);
    expect(controlPlaga(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL))).toBe(15);
    expect(controlPlaga(parcelaCon(CULTIVOS.CEBOLLA, CULTIVOS.ZANAHORIA))).toBe(35);
  });

  it('hay soporte físico entre cultivos', () => {
    expect(haySoporteFisico(parcelaCon(CULTIVOS.MAIZ))).toBe(false);
    expect(haySoporteFisico(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL))).toBe(true);
    expect(haySoporteFisico(parcelaCon(CULTIVOS.CAFE, CULTIVOS.GUAMO))).toBe(true);
  });

  // Retrocompatibilidad
  it('haySoporteMaizFrijol es alias de haySoporteFisico', () => {
    expect(haySoporteMaizFrijol(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL))).toBe(true);
    expect(haySoporteMaizFrijol(parcelaCon(CULTIVOS.MAIZ))).toBe(false);
  });

  it('el LER crece con la asociación', () => {
    expect(lerParcela(crearParcela('1'))).toBe(0);
    expect(lerParcela(parcelaCon(CULTIVOS.MAIZ))).toBe(1);
    expect(lerParcela(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL))).toBe(1.32);
    expect(
      lerParcela(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA)),
    ).toBe(2);
    expect(
      lerParcela(parcelaCon(CULTIVOS.CEBOLLA, CULTIVOS.ZANAHORIA)),
    ).toBe(1.32);
  });
});

describe('milpaGameEngine — salud: asociación supera al monocultivo', () => {
  it('un monocultivo nunca supera la salud de una asociación completa', () => {
    const mono = saludParcela(parcelaCon(CULTIVOS.MAIZ));
    const milpa = saludParcela(
      parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA),
    );
    expect(milpa).toBeGreaterThan(mono);
    expect(mono).toBeLessThanOrEqual(45);
    expect(milpa).toBeGreaterThanOrEqual(90);
  });

  it('la parcela vacía tiene salud 0', () => {
    expect(saludParcela(crearParcela('1'))).toBe(0);
  });

  it('agregar un cultivo que sinergiza sube la salud', () => {
    const maizSolo = saludParcela(parcelaCon(CULTIVOS.MAIZ));
    const maizFrijol = saludParcela(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL));
    expect(maizFrijol).toBeGreaterThan(maizSolo);
  });

  it('SAF café tiene salud alta por sombra y N', () => {
    const safCafe = saludParcela(
      parcelaCon(CULTIVOS.CAFE, CULTIVOS.GUAMO, CULTIVOS.PLATANO),
    );
    expect(safCafe).toBeGreaterThanOrEqual(85);
  });
});

describe('milpaGameEngine — resistencia a eventos por diversidad', () => {
  it('a más diversidad, menor factor de daño', () => {
    expect(factorResistencia(parcelaCon(CULTIVOS.MAIZ), EVENTOS[0])).toBe(1);
    expect(factorResistencia(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL), EVENTOS[0])).toBeCloseTo(0.65, 1);
    expect(
      factorResistencia(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA), EVENTOS[0]),
    ).toBeLessThan(0.5);
  });

  it('la cobertura protege de la sequía', () => {
    const eventoSequia = EVENTOS.find((e) => e.id === 'sequia');
    const sinCobertura = factorResistencia(parcelaCon(CULTIVOS.MAIZ), eventoSequia);
    const conCobertura = factorResistencia(
      parcelaCon(CULTIVOS.MAIZ, CULTIVOS.AHUYAMA),
      eventoSequia,
    );
    expect(conCobertura).toBeLessThan(sinCobertura);
  });

  it('ante el mismo evento, la asociación pierde menos salud', () => {
    const evento = EVENTOS.find((e) => e.id === 'sequia');
    const mono = aplicarEvento(parcelaCon(CULTIVOS.MAIZ), evento);
    const milpa = aplicarEvento(
      parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA),
      evento,
    );
    expect(milpa.danoAplicado).toBeLessThan(mono.danoAplicado);
    expect(milpa.saludDespues).toBeGreaterThan(mono.saludDespues);
  });

  it('la salud tras un evento nunca baja de 0', () => {
    const evento = { dano: 999 };
    const r = aplicarEvento(parcelaCon(CULTIVOS.MAIZ), evento);
    expect(r.saludDespues).toBe(0);
  });

  it('eventos específicos afectan menos a sus sistemas resistentes', () => {
    const eventoBroca = EVENTOS.find((e) => e.id === 'broca');
    const safCafe = parcelaCon(CULTIVOS.CAFE, CULTIVOS.GUAMO, CULTIVOS.PLATANO);
    const r = aplicarEvento(safCafe, eventoBroca);
    // SAF café debe resistir mejor la broca
    expect(r.danoAplicado).toBeLessThan(eventoBroca.dano * 0.5);
  });
});

describe('milpaGameEngine — resumen de finca', () => {
  it('finca vacía devuelve ceros sin reventar', () => {
    const r = resumenFinca([crearParcela('1'), crearParcela('2')]);
    expect(r.parcelasSembradas).toBe(0);
    expect(r.ventajaPct).toBe(0);
    expect(r.lerPromedio).toBe(0);
  });

  it('una finca de asociaciones rinde más que el monocultivo', () => {
    const parcelas = [
      parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA),
      parcelaCon(CULTIVOS.CAFE, CULTIVOS.GUAMO, CULTIVOS.PLATANO),
    ];
    const r = resumenFinca(parcelas);
    expect(r.parcelasSembradas).toBe(2);
    expect(r.asociacionesCompletas).toBe(2);
    expect(r.saludTotal).toBeGreaterThan(r.rendimientoMono);
    expect(r.ventajaPct).toBeGreaterThan(0);
    expect(r.tiposAsociaciones).toContain('milpa');
    expect(r.tiposAsociaciones).toContain('saf_cafe');
  });

  it('calcula promedios de indicadores reales', () => {
    const parcelas = [
      parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA),
      parcelaCon(CULTIVOS.CAFE, CULTIVOS.GUAMO, CULTIVOS.PLATANO),
    ];
    const r = resumenFinca(parcelas);
    expect(r.nitrogenoPromedio).toBeGreaterThan(0);
    expect(r.coberturaPromedio).toBeGreaterThan(0);
    expect(r.sombraPromedio).toBeGreaterThan(0);
    expect(r.lerPromedio).toBeGreaterThan(1);
  });

  it('ignora parcelas vacías en el promedio', () => {
    const r = resumenFinca([
      parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA),
      crearParcela('vacia'),
    ]);
    expect(r.parcelasSembradas).toBe(1);
  });
});

describe('milpaGameEngine — sistema de temporadas', () => {
  it('crea un juego con parcelas y temporadas', () => {
    const juego = crearJuego(4, 3);
    expect(juego.parcelas).toHaveLength(4);
    expect(juego.temporadaActual).toBe(1);
    expect(juego.numTemporadas).toBe(3);
    expect(juego.historicoTemporadas).toHaveLength(0);
  });

  it('avanza de temporada correctamente', () => {
    let juego = crearJuego(4, 2);
    juego.parcelas[0] = parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA);

    const resultado1 = avanzarTemporada(juego);
    expect(resultado1.continua).toBe(true);
    expect(resultado1.juego.temporadaActual).toBe(2);
    expect(resultado1.juego.historicoTemporadas).toHaveLength(1);

    const resultado2 = avanzarTemporada(resultado1.juego);
    expect(resultado2.continua).toBe(false);
    expect(resultado2.juego.temporadaActual).toBe(2); // No avanza si termina
  });

  it('verifica logros desbloqueados', () => {
    const juego = crearJuego(6, 1);
    juego.parcelas = [
      parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA),
      parcelaCon(CULTIVOS.CAFE, CULTIVOS.GUAMO, CULTIVOS.PLATANO),
      parcelaCon(CULTIVOS.CACAO, CULTIVOS.MATARRATON, CULTIVOS.PLATANO),
    ];
    juego.historicoTemporadas = [{
      numero: 1,
      resumen: resumenFinca(juego.parcelas),
    }];

    const logros = verificarLogros(juego);
    expect(logros).toContain('primera_milpa');
    expect(logros).toContain('biodiverso');
    expect(logros).toContain('resiliente');
  });
});
