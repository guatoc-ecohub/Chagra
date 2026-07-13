import { describe, it, expect } from 'vitest';
import {
  CULTIVOS,
  HERMANAS,
  crearParcela,
  crearJuego,
  sembrarEnParcela,
  espaciosUsadosParcela,
  cabeCultivoEnParcela,
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
  CIFRAS_SISTEMA,
  avanzarTemporada,
  verificarLogros,
  calcularPuntajeFinal,
  verificarSuperoCampesinoVecino,
  objetivosCampesinoVecino,
  generarConsejo,
  elegirEventosPosibles,
  SLOTS_POR_PARCELA,
  OCUPACION_CULTIVO,
} from '../milpaGameEngine';

/** Helper: parcela con los cultivos indicados. */
const parcelaCon = (/** @type {string[]} */ ...cultivos) =>
  cultivos.reduce((p, c) => sembrarEnParcela(/** @type {any} */ (p), c), /** @type {any} */ (crearParcela('t')));

describe('milpaGameEngine — siembra', () => {
  it('siembra y quita un cultivo (toggle), sin duplicar', () => {
    let p = /** @type {any} */ (crearParcela('1'));
    p = sembrarEnParcela(p, CULTIVOS.MAIZ);
    expect(p.cultivos).toEqual([CULTIVOS.MAIZ]);
    p = sembrarEnParcela(p, CULTIVOS.MAIZ); // toggle off
    expect(p.cultivos).toEqual([]);
  });

  it('ignora cultivos que no son válidos', () => {
    const p = sembrarEnParcela(/** @type {any} */ (crearParcela('1')), 'invalido');
    expect(p.cultivos).toEqual([]);
  });

  it('limita la siembra por espacios de parcela', () => {
    let p = /** @type {any} */ (crearParcela('1'));
    p = sembrarEnParcela(p, CULTIVOS.MAIZ);
    p = sembrarEnParcela(p, CULTIVOS.FRIJOL);
    p = sembrarEnParcela(p, CULTIVOS.AHUYAMA);

    expect(p.cultivos).toEqual([CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA]);
    expect(espaciosUsadosParcela(p)).toBe(SLOTS_POR_PARCELA);

    const rechazada = sembrarEnParcela(p, CULTIVOS.CEBOLLA);
    expect(rechazada.cultivos).toEqual([CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA]);
    expect(rechazada.motivo).toBe('no cabe');
  });

  it('espaciosUsadosParcela devuelve 0 para parcela vacía', () => {
    expect(espaciosUsadosParcela(/** @type {any} */ (crearParcela('1')))).toBe(0);
  });

  it('cabeCultivoEnParcela rechaza cultivos inválidos', () => {
    const p = /** @type {any} */ (crearParcela('1'));
    expect(cabeCultivoEnParcela(p, 'invalido')).toBe(false);
  });

  it('cabeCultivoEnParcela permite quitar uno ya sembrado aunque no haya espacio', () => {
    let p = parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA);
    // Parcela llena, pero sempre puede quitar un cultivo sembrado
    expect(cabeCultivoEnParcela(p, CULTIVOS.MAIZ)).toBe(true);
  });

  it('cabeCultivoEnParcela rechaza si no hay espacio', () => {
    let p = parcelaCon(CULTIVOS.MAIZ, CULTIVOS.GUAMO); // 2+2 = 4, lleno
    expect(cabeCultivoEnParcela(p, CULTIVOS.CEBOLLA)).toBe(false);
  });

  it('OCUPACION_CULTIVO tiene entrada para cada cultivo definido', () => {
    for (const id of Object.values(CULTIVOS)) {
      expect(OCUPACION_CULTIVO).toHaveProperty(id);
      expect(typeof OCUPACION_CULTIVO[id]).toBe('number');
      expect(OCUPACION_CULTIVO[id]).toBeGreaterThan(0);
    }
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
    expect(describirAsociacionCompleta('saf_cacao')).toContain('Cacao');
    expect(describirAsociacionCompleta('frutal_cobertura')).toContain('frutal');
    expect(describirAsociacionCompleta('hortalizas')).toContain('Cebolla');
  });

  it('describirAsociacionCompleta devuelve vacío para tipo desconocido', () => {
    expect(describirAsociacionCompleta('inexistente')).toBe('');
    expect(describirAsociacionCompleta(/** @type {any} */ (null))).toBe('');
    expect(describirAsociacionCompleta(/** @type {any} */ (undefined))).toBe('');
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

  it('el matarratón sin cacao fija menos nitrógeno', () => {
    expect(nitrogenoFijado(parcelaCon(CULTIVOS.MATARRATON))).toBe(30);
  });

  it('el maní forrajero fija nitrógeno en frutal+cobertura', () => {
    expect(nitrogenoFijado(parcelaCon(CULTIVOS.FRUTAL, CULTIVOS.MANI_FORRAJERO))).toBe(25);
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
    // Casos adicionales
    expect(sombraParcela(parcelaCon(CULTIVOS.FRUTAL))).toBe(25);
    expect(sombraParcela(parcelaCon(CULTIVOS.PLATANO))).toBe(20);
    expect(sombraParcela(parcelaCon(CULTIVOS.MATARRATON, CULTIVOS.PLATANO))).toBe(35);
    expect(sombraParcela(parcelaCon(CULTIVOS.CACAO, CULTIVOS.MATARRATON))).toBe(30);
  });

  it('la diversidad y repelencia controlan plagas', () => {
    expect(controlPlaga(parcelaCon(CULTIVOS.MAIZ))).toBe(0);
    expect(controlPlaga(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL))).toBe(15);
    expect(controlPlaga(parcelaCon(CULTIVOS.CEBOLLA, CULTIVOS.ZANAHORIA))).toBe(35);
    // 3+ cultivos sin repelencia mutua
    expect(controlPlaga(parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA))).toBe(23);
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
    expect(lerParcela(/** @type {any} */ (crearParcela('1')))).toBe(0);
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
    expect(saludParcela(/** @type {any} */ (crearParcela('1')))).toBe(0);
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
    const eventoSequia = /** @type {any} */ (EVENTOS.find((e) => e.id === 'sequia'));
    const sinCobertura = factorResistencia(parcelaCon(CULTIVOS.MAIZ), eventoSequia);
    const conCobertura = factorResistencia(
      parcelaCon(CULTIVOS.MAIZ, CULTIVOS.AHUYAMA),
      eventoSequia,
    );
    expect(conCobertura).toBeLessThan(sinCobertura);
  });

  it('ante el mismo evento, la asociación pierde menos salud', () => {
    const evento = /** @type {any} */ (EVENTOS.find((e) => e.id === 'sequia'));
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
    const eventoBroca = /** @type {any} */ (EVENTOS.find((e) => e.id === 'broca'));
    const safCafe = parcelaCon(CULTIVOS.CAFE, CULTIVOS.GUAMO, CULTIVOS.PLATANO);
    const r = aplicarEvento(safCafe, eventoBroca);
    // SAF café debe resistir mejor la broca
    expect(r.danoAplicado).toBeLessThan(eventoBroca.dano * 0.5);
  });
});

describe('milpaGameEngine — resumen de finca', () => {
  it('finca vacía devuelve ceros sin reventar', () => {
    const r = resumenFinca([/** @type {any} */ (crearParcela('1')), /** @type {any} */ (crearParcela('2'))]);
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
    const juego = /** @type {any} */ (crearJuego(4, 3));
    expect(juego.parcelas).toHaveLength(4);
    expect(juego.temporadaActual).toBe(1);
    expect(juego.numTemporadas).toBe(3);
    expect(juego.historicoTemporadas).toHaveLength(0);
  });

  it('avanza de temporada correctamente', () => {
    let juego = /** @type {any} */ (crearJuego(4, 2));
    juego.parcelas[0] = parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA);

    const resultado1 = /** @type {any} */ (avanzarTemporada(juego));
    expect(resultado1.continua).toBe(true);
    expect(resultado1.juego.temporadaActual).toBe(2);
    expect(resultado1.juego.historicoTemporadas).toHaveLength(1);

    const resultado2 = /** @type {any} */ (avanzarTemporada(resultado1.juego));
    expect(resultado2.continua).toBe(false);
    expect(resultado2.juego.temporadaActual).toBe(2); // No avanza si termina
  });

  it('verifica logros desbloqueados', () => {
    const juego = /** @type {any} */ (crearJuego(6, 1));
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

  it('verificarLogros sin historial devuelve array vacío', () => {
    const juego = /** @type {any} */ (crearJuego(6, 1));
    const logros = verificarLogros(juego);
    expect(logros).toEqual([]);
  });
});

// ── Campesino vecino ─────────────────────────────────────────────────

describe('milpaGameEngine — campesino vecino y puntaje final', () => {
  it('objetivosCampesinoVecino devuelve metas por temporada', () => {
    const obj1 = objetivosCampesinoVecino(1);
    expect(obj1.lerMinimo).toBe(1.3);
    expect(obj1.nMinimo).toBe(20);
    expect(obj1.coberturaMinima).toBe(15);

    const obj2 = objetivosCampesinoVecino(2);
    expect(obj2.lerMinimo).toBeGreaterThan(obj1.lerMinimo);
    expect(obj2.nMinimo).toBeGreaterThan(obj1.nMinimo);
    expect(obj2.coberturaMinima).toBeGreaterThan(obj1.coberturaMinima);

    const obj3 = objetivosCampesinoVecino(3);
    expect(obj3.lerMinimo).toBeGreaterThan(obj2.lerMinimo);
    expect(obj3.nMinimo).toBeGreaterThan(obj2.nMinimo);
    expect(obj3.coberturaMinima).toBeGreaterThan(obj2.coberturaMinima);
  });

  it('objetivosCampesinoVecino cae a temporada 1 para números inválidos', () => {
    const obj = objetivosCampesinoVecino(99);
    expect(obj.lerMinimo).toBe(1.3);
  });

  it('verificarSuperoCampesinoVecino detecta cuando no se supera', () => {
    const resumen = {
      lerPromedio: 0,
      nitrogenoPromedio: 0,
      coberturaPromedio: 0,
    };
    const r = verificarSuperoCampesinoVecino(resumen, 1);
    expect(r.supero).toBe(false);
    expect(r.medalla).toBeNull();
  });

  it('verificarSuperoCampesinoVecino detecta superación total', () => {
    const resumen = {
      lerPromedio: 2.5,
      nitrogenoPromedio: 70,
      coberturaPromedio: 60,
    };
    const r = /** @type {any} */ (verificarSuperoCampesinoVecino(resumen, 1));
    expect(r.supero).toBe(true);
    expect(r.medalla).toContain('🏅');
    expect(r.detalles.ler.supero).toBe(true);
    expect(r.detalles.n.supero).toBe(true);
    expect(r.detalles.cobertura.supero).toBe(true);
  });

  it('verificarSuperoCampesinoVecino falla si un solo indicador no alcanza', () => {
    const resumen = {
      lerPromedio: 2.5,
      nitrogenoPromedio: 10,
      coberturaPromedio: 60,
    };
    const r = verificarSuperoCampesinoVecino(resumen, 1);
    expect(r.supero).toBe(false);
    // N no supera el mínimo de 20
  });

  it('calcularPuntajeFinal devuelve 0 sin historial', () => {
    const juego = { historicoTemporadas: [], numTemporadas: 3 };
    expect(calcularPuntajeFinal(juego)).toBe(0);
  });

  it('calcularPuntajeFinal devuelve un número entre 0 y 1000', () => {
    const juego = /** @type {any} */ (crearJuego(4, 3));
    juego.parcelas = [
      parcelaCon(CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA),
      parcelaCon(CULTIVOS.CAFE, CULTIVOS.GUAMO, CULTIVOS.PLATANO),
    ];
    const r = resumenFinca(juego.parcelas);
    juego.historicoTemporadas = [
      { numero: 1, resumen: r },
      { numero: 2, resumen: r },
    ];
    const puntaje = calcularPuntajeFinal(juego);
    expect(puntaje).toBeGreaterThan(0);
    expect(puntaje).toBeLessThanOrEqual(1000);
  });
});

// ── Consejos y eventos ──────────────────────────────────────────────

describe('milpaGameEngine — generarConsejo y elegirEventosPosibles', () => {
  it('generarConsejo devuelve un objeto con cultivo y consejo', () => {
    const c = generarConsejo(EVENTOS[0]);
    expect(c).toHaveProperty('cultivo');
    expect(c).toHaveProperty('consejo');
    expect(typeof c.cultivo).toBe('string');
    expect(c.cultivo.length).toBeGreaterThan(0);
    expect(typeof c.consejo).toBe('string');
    expect(c.consejo.length).toBeGreaterThan(0);
  });

  it('generarConsejo devuelve un fallback para evento desconocido', () => {
    const c = generarConsejo({ id: 'evento_inexistente' });
    expect(c.cultivo).toContain('diversas');
    expect(c.consejo).toContain('resiliencia');
  });

  it('elegirEventosPosibles devuelve 3 eventos', () => {
    const eventos = elegirEventosPosibles(1, []);
    expect(eventos).toHaveLength(3);
    // Cada evento tiene los campos requeridos
    for (const ev of eventos) {
      expect(ev).toHaveProperty('id');
      expect(ev).toHaveProperty('nombre');
      expect(ev).toHaveProperty('emoji');
      expect(ev).toHaveProperty('dano');
      expect(typeof ev.dano).toBe('number');
      expect(ev.dano).toBeGreaterThan(0);
    }
  });

  it('elegirEventosPosibles escala el daño por temporada', () => {
    const ev1 = elegirEventosPosibles(1, []).find((e) => e.id === EVENTOS[0].id);
    const ev3 = elegirEventosPosibles(3, []).find((e) => e.id === EVENTOS[0].id);
    if (ev1 && ev3) {
      expect(ev3.dano).toBeGreaterThan(ev1.dano);
    }
  });
});

// ── Constantes y datos del motor ────────────────────────────────────

describe('milpaGameEngine — constantes y datos', () => {
  it('CULTIVOS tiene entradas únicas y HERMANAS es alias', () => {
    const valores = Object.values(CULTIVOS);
    expect(new Set(valores).size).toBe(valores.length);
    expect(HERMANAS).toBe(CULTIVOS);
  });

  it('ASOCIACIONES tiene todas las asociaciones con cultivos válidos', () => {
    const cultivosIds = new Set(Object.values(CULTIVOS));
    for (const asoc of Object.values(ASOCIACIONES)) {
      expect(asoc).toHaveProperty('id');
      expect(asoc).toHaveProperty('nombre');
      expect(asoc).toHaveProperty('icono');
      expect(asoc).toHaveProperty('cultivos');
      expect(asoc.cultivos.length).toBeGreaterThan(1);
      // Cada cultivo de la asociación existe en CULTIVOS
      for (const cid of asoc.cultivos) {
        expect(cultivosIds.has(cid)).toBe(true);
      }
    }
  });

  it('CIFRAS_SISTEMA tiene entrada para cada asociación', () => {
    for (const asoc of Object.values(ASOCIACIONES)) {
      expect(CIFRAS_SISTEMA).toHaveProperty(asoc.id);
    }
  });

  it('EVENTOS tiene al menos 5 eventos distintos con campos obligatorios', () => {
    expect(EVENTOS.length).toBeGreaterThanOrEqual(5);
    for (const ev of EVENTOS) {
      expect(ev).toHaveProperty('id');
      expect(ev).toHaveProperty('nombre');
      expect(ev).toHaveProperty('emoji');
      expect(ev).toHaveProperty('dano');
      expect(ev).toHaveProperty('relacion');
      expect(ev).toHaveProperty('afectaA');
      expect(Array.isArray(ev.afectaA)).toBe(true);
      expect(typeof ev.dano).toBe('number');
      expect(ev.dano).toBeGreaterThan(0);
    }
  });

  it('SLOTS_POR_PARCELA es positivo', () => {
    expect(SLOTS_POR_PARCELA).toBeGreaterThan(0);
    expect(Number.isInteger(SLOTS_POR_PARCELA)).toBe(true);
  });
});
