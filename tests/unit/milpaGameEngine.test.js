/**
 * Tests para el engine de La Milpa (fase 2).
 */

import { describe, it, expect } from 'vitest';
import {
  elegirEventosPosibles,
  generarConsejo,
  objetivosCampesinoVecino,
  verificarSuperoCampesinoVecino,
  EVENTOS,
} from '../../src/services/milpaGameEngine';

describe('milpaGameEngine - Fase 2', () => {
  describe('elegirEventosPosibles', () => {
    it('debería retornar 3 eventos para temporada 1', () => {
      const eventos = elegirEventosPosibles(1, []);
      expect(eventos).toHaveLength(3);
    });

    it('debería aplicar factor de dificultad por temporada', () => {
      const eventosT1 = elegirEventosPosibles(1, []);
      const eventosT3 = elegirEventosPosibles(3, []);

      const danoPromedioT1 = eventosT1.reduce((acc, e) => acc + e.dano, 0) / eventosT1.length;
      const danoPromedioT3 = eventosT3.reduce((acc, e) => acc + e.dano, 0) / eventosT3.length;

      expect(danoPromedioT3).toBeGreaterThan(danoPromedioT1);
    });

    it('debería evitar repetir eventos del histórico', () => {
      const eventosUsados = [{ id: 'sequia' }];
      const eventos = elegirEventosPosibles(1, eventosUsados);

      expect(eventos.find(e => e.id === 'sequia')).toBeUndefined();
    });
  });

  describe('generarConsejo', () => {
    it('debería generar consejo para sequía', () => {
      const evento = EVENTOS.find(e => e.id === 'sequia');
      const consejo = generarConsejo(evento);

      expect(consejo.cultivo).toBeTruthy();
      expect(consejo.consejo).toBeTruthy();
    });

    it('debería generar consejo para broca', () => {
      const evento = EVENTOS.find(e => e.id === 'broca');
      const consejo = generarConsejo(evento);

      expect(consejo.cultivo).toContain('Guamo');
    });
  });

  describe('objetivosCampesinoVecino', () => {
    it('debería tener objetivos crecientes por temporada', () => {
      const objT1 = objetivosCampesinoVecino(1);
      const objT2 = objetivosCampesinoVecino(2);
      const objT3 = objetivosCampesinoVecino(3);

      expect(objT1.lerMinimo).toBeLessThan(objT2.lerMinimo);
      expect(objT2.lerMinimo).toBeLessThan(objT3.lerMinimo);
    });
  });

  describe('verificarSuperoCampesinoVecino', () => {
    it('debería detectar cuando se superan los objetivos', () => {
      const resumen = {
        lerPromedio: 2.0,
        nitrogenoPromedio: 60,
        coberturaPromedio: 50,
      };

      const resultado = verificarSuperoCampesinoVecino(resumen, 1);

      expect(resultado.supero).toBe(true);
      expect(resultado.medalla).toBeTruthy();
    });

    it('debería detectar cuando NO se superan los objetivos', () => {
      const resumen = {
        lerPromedio: 1.0,
        nitrogenoPromedio: 10,
        coberturaPromedio: 10,
      };

      const resultado = verificarSuperoCampesinoVecino(resumen, 1);

      expect(resultado.supero).toBe(false);
      expect(resultado.medalla).toBeNull();
    });
  });
});
