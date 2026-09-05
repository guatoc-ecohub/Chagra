/*
 * lecturaClimaAterrizaje — las reglas de la dirección NUMEROS-VIVOS en pruebas:
 * sin dato no se pinta, la ventana tiene palabra, la helada es de piso frío y
 * bajo El Niño en frío es MÁS helada, no menos, y la tiza va por prioridad.
 */
import { describe, it, expect } from 'vitest';
import {
  esPisoFrio,
  palabraCondicion,
  lineaAhora,
  lineaMinimaNoche,
  lineaHelada,
  alertasAterrizaje,
  sugerenciaDeCultivo,
  resumenClimaAterrizaje,
} from '../sierra/lecturaClimaAterrizaje.js';

/* El snapshot ya resuelto por `derivarClima3D` (misma forma del hook). */
function clima({ senal = true, condicion = null, temp = null, tempMin = null, helada = false, alertas = [], ensoFamily = 'neutral', openmeteo = true } = {}) {
  return {
    senal,
    condicion,
    temp,
    tempMin,
    helada,
    alertas,
    ensoFamily,
    tieneOpenMeteo: openmeteo,
  };
}

describe('esPisoFrio / palabraCondicion', () => {
  it('los pisos que hielan son frio, paramo y superparamo; templado no', () => {
    expect(esPisoFrio('frio')).toBe(true);
    expect(esPisoFrio('paramo')).toBe(true);
    expect(esPisoFrio('superparamo')).toBe(true);
    expect(esPisoFrio('templado')).toBe(false);
    expect(esPisoFrio('calido_seco')).toBe(false);
    expect(esPisoFrio(null)).toBe(false);
  });

  it('la condición se lee en palabra, nunca en el id interno', () => {
    expect(palabraCondicion('despejado')).toBe('cielo despejado');
    expect(palabraCondicion('lluvia')).toBe('lluvia');
    expect(palabraCondicion('')).toBeNull();
    expect(palabraCondicion(null)).toBeNull();
  });
});

describe('tinta: el ahora y la mínima de esta noche', () => {
  it('sin señal NO pinta nada (la ausencia es el no sé)', () => {
    expect(lineaAhora(clima({ senal: false, temp: 14 }))).toBeNull();
    expect(lineaMinimaNoche(clima({ senal: false, tempMin: 3 }), { pisoId: 'frio' })).toBeNull();
  });

  it('el ahora lleva condición, grado entero y su palabra de ventana', () => {
    expect(lineaAhora(clima({ condicion: 'lluvia', temp: 14.2 }))).toBe('lluvia · 14° · ahora');
  });

  it('con temperatura y sin condición alcanza el grado; sin ambos, nada', () => {
    expect(lineaAhora(clima({ temp: 21 }))).toBe('21° · ahora');
    expect(lineaAhora(clima({}))).toBeNull();
  });

  it('la mínima de esta noche solo aparece donde decide: piso frío', () => {
    expect(lineaMinimaNoche(clima({ tempMin: 2.6 }), { pisoId: 'frio' })).toBe('esta noche baja a 3°');
    expect(lineaMinimaNoche(clima({ tempMin: 2.6 }), { pisoId: 'templado' })).toBeNull();
    expect(lineaMinimaNoche(clima({ tempMin: null }), { pisoId: 'frio' })).toBeNull();
  });
});

describe('tiza prioridad 1: la helada', () => {
  it('en piso templado jamás avisa de helada', () => {
    expect(lineaHelada(clima({ helada: true, tempMin: 2 }), { pisoId: 'templado' })).toBeNull();
  });

  it('en piso frío con mínima que la delata avisa y nombra la cifra', () => {
    const linea = lineaHelada(clima({ helada: true, tempMin: 2.1 }), { pisoId: 'frio' });
    expect(linea).toContain('esta noche baja a 2°');
    expect(linea).toMatch(/helar/);
  });

  it('la mínima ≤ 3° con cielo despejado delata helada aunque el bool no venga', () => {
    expect(lineaHelada(clima({ helada: false, tempMin: 1.8 }), { pisoId: 'paramo' })).toMatch(/helar/);
    expect(lineaHelada(clima({ helada: false, tempMin: 6 }), { pisoId: 'frio' })).toBeNull();
  });

  it('🔴 El Niño en piso frío es MÁS helada, nunca «más calor»', () => {
    const linea = lineaHelada(clima({ helada: true, tempMin: 2, ensoFamily: 'nino' }), { pisoId: 'frio' });
    expect(linea).toContain('MÁS helada');
    expect(linea.toLowerCase()).not.toContain('más calor');
  });

  it('sin señal ni mínima no hay línea', () => {
    expect(lineaHelada(clima({ helada: true, tempMin: null, senal: false }), { pisoId: 'frio' })).toBeNull();
    expect(lineaHelada(clima({ helada: false, tempMin: null }), { pisoId: 'frio' })).toBeNull();
  });
});

describe('avisos locales (tinta) y sugerencia de SU cultivo', () => {
  it('alertas: hasta dos, sin avisos vacíos', () => {
    const a = alertasAterrizaje(clima({ alertas: [
      { tipo: 'helada', mensaje: 'helada en páramo' },
      { tipo: 'lluvia', mensaje: 'tormenta' },
      { tipo: 'viento', mensaje: 'rachas' },
    ] }));
    expect(a).toHaveLength(2);
    expect(a[0].mensaje).toBe('helada en páramo');
    expect(alertasAterrizaje(clima({ alertas: [] }))).toEqual([]);
    expect(alertasAterrizaje(clima({ alertas: [{ tipo: '', mensaje: '' }] }))).toEqual([]);
  });

  it('la sugerencia de cultivo elige la más severa con texto real', () => {
    const lista = [
      { suggestion: { severity: 'info', text: 'en observación' } },
      { suggestion: { severity: 'warning', text: 'vigile la roya' } },
    ];
    expect(sugerenciaDeCultivo(lista)).toBe('vigile la roya');
    expect(sugerenciaDeCultivo([{ suggestion: { severity: 'info', text: 'x' } }])).toBeNull();
    expect(sugerenciaDeCultivo([])).toBeNull();
    expect(sugerenciaDeCultivo(null)).toBeNull();
  });
});

describe('resumenClimaAterrizaje — el orden de la dirección', () => {
  it('sin señal: hayDato false y nada que pintar (ni tinta, ni aviso, ni tiza)', () => {
    const r = resumenClimaAterrizaje(clima({ senal: false }), { pisoId: 'frio' });
    expect(r.hayDato).toBe(false);
    expect(r.tinta).toEqual([]);
    expect(r.alertas).toEqual([]);
    expect(r.tiza).toBeNull();
  });

  it('con dato en piso frío bajo El Niño: tinta + avisos y la tiza de helada manda sobre el cultivo', () => {
    const r = resumenClimaAterrizaje(
      clima({ condicion: 'niebla', temp: 6.4, tempMin: 1.9, helada: true, ensoFamily: 'nino', alertas: [{ tipo: 'helada', mensaje: 'aviso de helada' }] }),
      { pisoId: 'frio', sugerencias: [{ suggestion: { severity: 'critical', text: 'proteja su gulupa' } }] },
    );
    expect(r.hayDato).toBe(true);
    expect(r.tinta).toEqual(['niebla de ladera · 6° · ahora', 'esta noche baja a 2°']);
    expect(r.alertas).toHaveLength(1);
    expect(r.tiza).toContain('MÁS helada');
    expect(r.tiza).toContain('baja a 2°');
  });

  it('sin helada, la tiza pasa a SU cultivo (prioridad 2)', () => {
    const r = resumenClimaAterrizaje(
      clima({ condicion: 'despejado', temp: 18, tempMin: 10 }),
      { pisoId: 'templado', sugerencias: [{ suggestion: { severity: 'warning', text: 'vigile la roya: hoja mojada' } }] },
    );
    expect(r.tiza).toBe('vigile la roya: hoja mojada');
    expect(r.tinta[0]).toBe('cielo despejado · 18° · ahora');
    expect(r.tinta).not.toContain('esta noche'); // templado: la mínima no decide
  });

  it('sin nada que aplicar la pizarra calla (estado válido)', () => {
    const r = resumenClimaAterrizaje(clima({ condicion: 'despejado', temp: 18 }), { pisoId: 'templado', sugerencias: [] });
    expect(r.tiza).toBeNull();
  });
});
