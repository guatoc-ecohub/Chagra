import { describe, expect, test } from 'vitest';
import { MUNDO, MUNDO_IDS } from '../mundoData.js';
import { mundosPorPisoTermico } from '../mundosPorPisoTermico.js';
import { pisoTermicoDePerfil } from '../useFincaViva.js';

describe('mundosPorPisoTermico', () => {
  test('anota todos los mundos y los ordena por pisos de menor a mayor altitud', () => {
    const catalogo = mundosPorPisoTermico(null);

    expect(catalogo.mundos.map((mundo) => mundo.id).sort()).toEqual([...MUNDO_IDS].sort());
    expect(catalogo.pisos.map((piso) => piso.id)).toEqual([
      'calido', 'templado', 'frio', 'paramo', 'superparamo', 'nival',
    ]);
    expect(catalogo.mundos.every((mundo) => mundo.explorable)).toBe(true);
    expect(catalogo.mundos.every((mundo) => mundo.estadoCompatibilidad === 'neutro')).toBe(true);
    expect(catalogo.mundos.every((mundo) => mundo.altitudFraccion >= 0 && mundo.altitudFraccion <= 1)).toBe(true);
  });

  test('marca compatible solo el piso de la finca sin ocultar los demas mundos', () => {
    const catalogo = mundosPorPisoTermico('frío');
    const mundoPisos = catalogo.mundos.find((mundo) => mundo.id === 'pisos');
    const mundoCafe = catalogo.mundos.find((mundo) => mundo.id === 'cafe');

    expect(catalogo.pisoUsuarioId).toBe('frio');
    expect(mundoPisos).toMatchObject({ compatible: true, estadoCompatibilidad: 'suyo' });
    expect(mundoCafe).toMatchObject({ compatible: false, estadoCompatibilidad: 'colindante', explorable: true });
  });

  test('cada entrada del registro declara un piso termico valido', () => {
    const idsValidos = new Set(mundosPorPisoTermico(null).pisos.map((piso) => piso.id));
    expect(Object.entries(MUNDO).filter(([, mundo]) => !idsValidos.has(mundo.pisoTermico))).toEqual([]);
  });
});

describe('pisoTermicoDePerfil', () => {
  test('prioriza el piso declarado y cae a la altitud real', () => {
    expect(pisoTermicoDePerfil({ piso_termico: 'páramo', finca_altitud: 1500 })).toBe('paramo');
    expect(pisoTermicoDePerfil({ finca_altitud: 2450 })).toBe('frio');
    expect(pisoTermicoDePerfil({})).toBeNull();
  });
});
