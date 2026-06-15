import { describe, it, expect } from 'vitest';
import {
  evaluarRiesgoIncendio,
  buildIncendioContext,
  __testing__,
} from '../incendioRiskService';

// Todos los inputs entran por `opts` (profile/ensoPhase/region/altitud/mes), así
// que los tests son deterministas y NO dependen de localStorage ni de Date.now().

describe('incendioRiskService', () => {
  describe('evaluarRiesgoIncendio — matriz estacional × ENSO', () => {
    it('temporada seca + El Niño → riesgo ALTO', () => {
      const r = evaluarRiesgoIncendio({ region: 'andina', ensoPhase: 'nino_fuerte', mes: 1 });
      expect(r.nivel).toBe('alto');
      expect(r.temporada_seca).toBe(true);
      expect(r.fase_enso).toBe('nino');
      expect(r.es_estimacion).toBe(true);
    });

    it('temporada seca SIN El Niño → riesgo MEDIO', () => {
      const r = evaluarRiesgoIncendio({ region: 'andina', ensoPhase: 'neutral', mes: 2 });
      expect(r.nivel).toBe('medio');
      expect(r.temporada_seca).toBe(true);
    });

    it('El Niño FUERA de temporada seca → riesgo MEDIO', () => {
      // Mayo es lluvioso en la Andina (régimen bimodal) → no seca, pero hay Niño.
      const r = evaluarRiesgoIncendio({ region: 'andina', ensoPhase: 'nino_moderado', mes: 5 });
      expect(r.nivel).toBe('medio');
      expect(r.temporada_seca).toBe(false);
      expect(r.fase_enso).toBe('nino');
    });

    it('sin temporada seca y sin El Niño → riesgo BAJO', () => {
      const r = evaluarRiesgoIncendio({ region: 'andina', ensoPhase: 'neutral', mes: 5 });
      expect(r.nivel).toBe('bajo');
    });

    it('La Niña no eleva el riesgo de incendio', () => {
      const r = evaluarRiesgoIncendio({ region: 'andina', ensoPhase: 'nina_fuerte', mes: 5 });
      expect(r.nivel).toBe('bajo');
      expect(r.fase_enso).toBe('nina');
    });
  });

  describe('reglas regionales (cero falsos positivos)', () => {
    it('Pacífico siempre BAJO aunque haya El Niño en mes seco de otras regiones', () => {
      const r = evaluarRiesgoIncendio({ region: 'pacifico', ensoPhase: 'nino_fuerte', mes: 1 });
      expect(r.nivel).toBe('bajo');
      expect(r.factores.join(' ')).toMatch(/Pac[íi]fico/);
    });

    it('Orinoquía en verano (dic-mar) sin Niño → MEDIO, con consejo de fuego prescrito', () => {
      const r = evaluarRiesgoIncendio({ region: 'orinoquia', ensoPhase: 'neutral', mes: 1 });
      expect(r.nivel).toBe('medio');
      expect(r.recomendaciones.join(' ')).toMatch(/fuego prescrito/i);
    });

    it('región desconocida → BAJO honesto (no inventa riesgo)', () => {
      const r = evaluarRiesgoIncendio({ region: null, ensoPhase: 'nino_fuerte', mes: 1 });
      expect(r.nivel).toBe('bajo');
      expect(r.region).toBeNull();
    });
  });

  describe('caso Ana — UNGRD Pasto / Galeras (Andina alta, 2400 msnm)', () => {
    it('en verano andino + El Niño da ALTO', () => {
      const r = evaluarRiesgoIncendio({ region: 'andina', altitud: 2400, ensoPhase: 'nino_fuerte', mes: 1 });
      expect(r.nivel).toBe('alto');
      expect(r.piso_termico).toBe('frio');
    });

    it('corrige Nariño: dept→pacifico pero zona alta (2400m) = andina con riesgo real', () => {
      // Perfil real de Ana: departamento Nariño (mapea a pacifico) pero finca a
      // 2400 msnm en la ladera del Galeras. La corrección de piso la trata como
      // andina y NO la deja en "bajo" falso del litoral pacífico.
      const r = evaluarRiesgoIncendio({
        profile: { departamento: 'Nariño' },
        altitud: 2400,
        ensoPhase: 'neutral',
        mes: 1,
      });
      expect(r.region).toBe('andina');
      expect(r.nivel).toBe('medio'); // enero seco andino, sin Niño
      expect(r.temporada_seca).toBe(true);
    });

    it('NO corrige el litoral pacífico cálido (sigue pacifico, riesgo bajo)', () => {
      const r = evaluarRiesgoIncendio({
        profile: { departamento: 'Chocó' },
        altitud: 50,
        ensoPhase: 'nino_fuerte',
        mes: 1,
      });
      expect(r.region).toBe('pacifico');
      expect(r.nivel).toBe('bajo');
    });

    it('zona de páramo añade la guarda de turba/suelo orgánico', () => {
      const r = evaluarRiesgoIncendio({ region: 'andina', altitud: 3300, ensoPhase: 'neutral', mes: 7 });
      expect(r.piso_termico).toBe('paramo');
      expect(r.factores.join(' ')).toMatch(/turba|suelo org[áa]nico/i);
      expect(r.recomendaciones.join(' ')).toMatch(/NO quemes/i);
    });
  });

  describe('honestidad / anti-fabricación', () => {
    it('SIEMPRE marca es_estimacion y trae disclaimer + fuentes reales', () => {
      const r = evaluarRiesgoIncendio({ region: 'andina', ensoPhase: 'neutral', mes: 4 });
      expect(r.es_estimacion).toBe(true);
      expect(r.disclaimer).toMatch(/NO una alerta oficial/i);
      expect(r.disclaimer).toMatch(/CMGRD|bomberos|Corporaci[óo]n/i);
      expect(r.fuentes.join(' ')).toMatch(/NOAA/);
      expect(r.fuentes.join(' ')).toMatch(/IDEAM/);
    });

    it('nunca recomienda quema en temporada de riesgo', () => {
      const r = evaluarRiesgoIncendio({ region: 'orinoquia', ensoPhase: 'nino_fuerte', mes: 2 });
      expect(r.nivel).toBe('alto');
      expect(r.recomendaciones.join(' ')).toMatch(/NO hagas quemas/i);
    });

    it('mes por defecto = mes actual cuando no se pasa', () => {
      const r = evaluarRiesgoIncendio({ region: 'andina', ensoPhase: 'neutral' });
      expect(r.mes).toBe(new Date().getMonth() + 1);
    });
  });

  describe('buildIncendioContext (grounding del agente)', () => {
    it('produce bloque con nivel, disclaimer y la instrucción anti-alucinación', () => {
      const txt = buildIncendioContext({ region: 'andina', ensoPhase: 'nino_fuerte', mes: 1 });
      expect(txt).toMatch(/RIESGO DE INCENDIO/);
      expect(txt).toMatch(/ALTO/);
      expect(txt).toMatch(/NO afirmes que hay un incendio activo/i);
      expect(txt).toMatch(/estimaci[óo]n/i);
    });

    it('en Pacífico comunica riesgo BAJO sin alarmar', () => {
      const txt = buildIncendioContext({ region: 'pacifico', ensoPhase: 'nino_fuerte', mes: 1 });
      expect(txt).toMatch(/BAJO/);
    });
  });

  describe('helpers internos', () => {
    it('pisoDesdeAltitud clasifica por umbrales', () => {
      const { pisoDesdeAltitud } = __testing__;
      expect(pisoDesdeAltitud(500)).toBe('calido');
      expect(pisoDesdeAltitud(1500)).toBe('templado');
      expect(pisoDesdeAltitud(2500)).toBe('frio');
      expect(pisoDesdeAltitud(3200)).toBe('paramo');
      expect(pisoDesdeAltitud(null)).toBeNull();
      expect(pisoDesdeAltitud('abc')).toBeNull();
    });

    it('temporadaSeca respeta el calendario por región', () => {
      const { temporadaSeca } = __testing__;
      expect(temporadaSeca('andina', 1).seca).toBe(true);   // enero seco
      expect(temporadaSeca('andina', 7).seca).toBe(true);   // julio seco (veranillo)
      expect(temporadaSeca('andina', 5).seca).toBe(false);  // mayo lluvioso
      expect(temporadaSeca('amazonia', 7).seca).toBe(false); // amazonia: solo dic-mar
      expect(temporadaSeca('pacifico', 1).seca).toBe(false); // pacifico sin seca
    });

    it('resolveFireRegion sube pacifico→andina solo en piso alto', () => {
      const { resolveFireRegion } = __testing__;
      expect(resolveFireRegion('pacifico', 'frio')).toBe('andina');
      expect(resolveFireRegion('pacifico', 'paramo')).toBe('andina');
      expect(resolveFireRegion('pacifico', 'templado')).toBe('andina');
      expect(resolveFireRegion('pacifico', 'calido')).toBe('pacifico'); // litoral
      expect(resolveFireRegion('andina', 'frio')).toBe('andina');       // no toca otras
      expect(resolveFireRegion(null, 'frio')).toBeNull();
    });
  });
});
