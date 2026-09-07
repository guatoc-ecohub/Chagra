import { describe, expect, it } from 'vitest';
import { sugerenciasCultivosSierra, sugerenciaDeCultivo } from '../sierra/lecturaClimaAterrizaje.js';

const snapshot = (dia = {}) => ({
  tieneOpenMeteo: true, coordenadasConfirmadas: true, fechaLocal: '2026-09-06',
  dia: { date: '2026-09-06', temp_min: 18, temp_max: 24, precip_mm: 0, eto_mm: 7, horas_hr_alta: 24, ...dia },
});

describe('ficha → sed → hongo, para los cultivos del perfil', () => {
  it('sin cultivos o sin fecha coincidente no hay consejo', () => {
    expect(sugerenciasCultivosSierra(snapshot(), '')).toEqual([]);
    expect(sugerenciasCultivosSierra(snapshot({ date: '2026-09-07' }), 'papa')).toEqual([]);
  });
  it('la sed gana al hongo aunque ambos sean candidatos', () => {
    const candidatas = sugerenciasCultivosSierra(snapshot(), 'papa');
    expect(candidatas.map((c) => c.prioridad)).toEqual([3, 4]);
    expect(sugerenciaDeCultivo(candidatas.reverse())).toContain('faltarle agua');
  });
  it('sin lluvia no la rellena con cero, pero aún puede competir hongo', () => {
    const candidatas = sugerenciasCultivosSierra(snapshot({ precip_mm: null }), 'papa');
    expect(candidatas.map((c) => c.prioridad)).toEqual([4]);
  });
  it('sin mojado no inventa presión roja', () => {
    expect(sugerenciasCultivosSierra(snapshot({ horas_hr_alta: null, eto_mm: null }), 'papa')).toEqual([]);
  });
  it('la ficha de gulupa gana a la sed de papa, independiente del orden del perfil', () => {
    for (const perfil of ['papa, gulupa', 'gulupa, papa']) {
      const candidatas = sugerenciasCultivosSierra(snapshot({ temp_min: 5 }), perfil);
      expect(candidatas[0].prioridad).toBe(2);
      expect(sugerenciaDeCultivo(candidatas)).toMatch(/gulupa/i);
    }
  });
  it('sin condiciones o con cache vencida calla', () => {
    expect(sugerenciasCultivosSierra(snapshot({ temp_min: null, temp_max: null, precip_mm: null, eto_mm: null, horas_hr_alta: null }), 'papa')).toEqual([]);
    expect(sugerenciasCultivosSierra({ ...snapshot(), stale: true }, 'papa')).toEqual([]);
  });
});
