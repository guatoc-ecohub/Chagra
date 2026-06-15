// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

import { describe, it, expect } from 'vitest';
import {
  SEGUIMIENTO_PROCESOS,
  SEGUIMIENTO_BY_KEY,
  getSeguimientoDef,
  seguimientoRoute,
  parseSeguimientoView,
} from '../seguimientoProcesos';
import { stageSequenceForProcessType } from '../../types/farmProcess';

describe('seguimientoProcesos — catálogo de seguimiento de procesos', () => {
  it('expone exactamente los 4 procesos pedidos por el operador', () => {
    const titles = SEGUIMIENTO_PROCESOS.map((d) => d.title);
    expect(titles).toEqual(['Reforestación', 'Silvopastoreo', 'Páramo', 'Cerdos']);
  });

  it('cada def mapea a un process_type válido con secuencia de etapas no vacía', () => {
    for (const def of SEGUIMIENTO_PROCESOS) {
      const seq = stageSequenceForProcessType(def.processType);
      expect(Array.isArray(seq)).toBe(true);
      expect(seq.length).toBeGreaterThan(0);
    }
  });

  it('reforestación y silvopastoreo usan los process_type existentes', () => {
    expect(SEGUIMIENTO_BY_KEY.reforestacion.processType).toBe('restoration');
    expect(SEGUIMIENTO_BY_KEY.silvopastoreo.processType).toBe('silvopasture');
  });

  it('páramo y cerdos usan los process_type nuevos', () => {
    expect(SEGUIMIENTO_BY_KEY.paramo.processType).toBe('paramo');
    expect(SEGUIMIENTO_BY_KEY.cerdos.processType).toBe('pigs');
  });

  it('getSeguimientoDef resuelve por key y devuelve null para desconocidos', () => {
    expect(getSeguimientoDef('cerdos')?.title).toBe('Cerdos');
    expect(getSeguimientoDef('inexistente')).toBeNull();
  });

  it('seguimientoRoute + parseSeguimientoView son inversos para keys válidas', () => {
    for (const def of SEGUIMIENTO_PROCESOS) {
      const route = seguimientoRoute(def.key);
      expect(route).toBe(`seguimiento_${def.key}`);
      expect(parseSeguimientoView(route)).toBe(def.key);
    }
  });

  it('parseSeguimientoView ignora rutas que no son de seguimiento o son inválidas', () => {
    expect(parseSeguimientoView('dashboard')).toBeNull();
    expect(parseSeguimientoView('seguimiento_inexistente')).toBeNull();
    expect(parseSeguimientoView(null)).toBeNull();
    expect(parseSeguimientoView(undefined)).toBeNull();
  });
});
