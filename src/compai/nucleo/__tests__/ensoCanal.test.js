/**
 * Tests para ensoCanal — canal propio ENSO con rotación de hechos.
 */
import { describe, it, expect } from 'vitest';
import {
  mensajeEnsoPrioritario,
  mensajeEnsoVigilancia,
  rotarHechoEnso,
  hayMensajeEnso,
  ensoFamily,
} from '../ensoCanal';

describe('ensoFamily', () => {
  it('normaliza fases de El Niño a "nino"', () => {
    expect(ensoFamily('el_nino')).toBe('nino');
    expect(ensoFamily('nino_fuerte')).toBe('nino');
    expect(ensoFamily('nino_moderado')).toBe('nino');
  });

  it('normaliza fases de La Niña a "nina"', () => {
    expect(ensoFamily('la_nina')).toBe('nina');
    expect(ensoFamily('nina_fuerte')).toBe('nina');
    expect(ensoFamily('nina_debil')).toBe('nina');
  });

  it('normaliza fases neutrales a "neutral"', () => {
    expect(ensoFamily('neutral')).toBe('neutral');
    expect(ensoFamily('NEUTRAL')).toBe('neutral');
    expect(ensoFamily('')).toBe('neutral');
    expect(ensoFamily(null)).toBe('neutral');
    expect(ensoFamily(undefined)).toBe('neutral');
  });
});

describe('mensajeEnsoPrioritario', () => {
  describe('El Niño activo', () => {
    it('genera mensaje contextualizado para región Andina con índice 0', () => {
      const resultado = mensajeEnsoPrioritario({
        fase: 'el_nino',
        region: 'andina',
        indice: 0,
      });

      expect(resultado).not.toBeNull();
      expect(resultado?.family).toBe('nino');
      expect(resultado?.fuente).toBe('NOAA CPC · IDEAM');
      expect(resultado?.mensaje).toContain('El Niño');
      expect(resultado?.mensaje).toContain('Andes');
      expect(resultado?.nextIdx).toBe(1); // Avanza al siguiente
    });

    it('rota entre múltiples hechos para la misma región', () => {
      const msg0 = mensajeEnsoPrioritario({ fase: 'el_nino', region: 'andina', indice: 0 });
      const msg1 = mensajeEnsoPrioritario({ fase: 'el_nino', region: 'andina', indice: 1 });
      const msg2 = mensajeEnsoPrioritario({ fase: 'el_nino', region: 'andina', indice: 2 });

      expect(msg0?.mensaje).not.toBe(msg1?.mensaje);
      expect(msg1?.mensaje).not.toBe(msg2?.mensaje);
      expect(msg0?.nextIdx).toBe(1);
      expect(msg1?.nextIdx).toBe(2);
      expect(msg2?.nextIdx).toBe(0); // Cicla de nuevo
    });

    it('usa hechos genéricos cuando no hay región específica', () => {
      const resultado = mensajeEnsoPrioritario({
        fase: 'el_nino',
        region: null,
        indice: 0,
      });

      expect(resultado).not.toBeNull();
      expect(resultado?.family).toBe('nino');
      expect(resultado?.mensaje).toContain('El Niño');
      expect(resultado?.mensaje).toContain('menos lluvia');
    });

    it('genera mensajes específicos por región Caribe', () => {
      const resultado = mensajeEnsoPrioritario({
        fase: 'el_nino',
        region: 'caribe',
        indice: 0,
      });

      expect(resultado).not.toBeNull();
      expect(resultado?.mensaje).toContain('Caribe');
      expect(resultado?.mensaje).toContain('sequía');
    });
  });

  describe('La Niña activa', () => {
    it('genera mensaje contextualizado para región Andina', () => {
      const resultado = mensajeEnsoPrioritario({
        fase: 'la_nina',
        region: 'andina',
        indice: 0,
      });

      expect(resultado).not.toBeNull();
      expect(resultado?.family).toBe('nina');
      expect(resultado?.mensaje).toContain('La Niña');
      expect(resultado?.mensaje).toContain('Andes');
      expect(resultado?.mensaje).toContain('más lluvia');
    });

    it('rota entre hechos de La Niña', () => {
      const msg0 = mensajeEnsoPrioritario({ fase: 'la_nina', region: 'andina', indice: 0 });
      const msg1 = mensajeEnsoPrioritario({ fase: 'la_nina', region: 'andina', indice: 1 });

      expect(msg0?.mensaje).not.toBe(msg1?.mensaje);
      expect(msg0?.nextIdx).toBe(1);
    });

    it('genera mensajes específicos para región Pacífico', () => {
      const resultado = mensajeEnsoPrioritario({
        fase: 'la_nina',
        region: 'pacifico',
        indice: 0,
      });

      expect(resultado).not.toBeNull();
      expect(resultado?.mensaje).toContain('Pacífico');
      expect(resultado?.mensaje).toContain('lluvias');
    });
  });

  describe('Fase neutral (vigilancia)', () => {
    it('genera mensaje de vigilancia cuando hay hechos disponibles', () => {
      const resultado = mensajeEnsoPrioritario({
        fase: 'neutral',
        region: 'andina',
        indice: 0,
      });

      expect(resultado).not.toBeNull();
      expect(resultado?.family).toBe('neutral');
      expect(resultado?.mensaje).toContain('Vigilancia');
    });

    it('rota entre mensajes de vigilancia', () => {
      const msg0 = mensajeEnsoPrioritario({ fase: 'neutral', region: 'andina', indice: 0 });
      const msg1 = mensajeEnsoPrioritario({ fase: 'neutral', region: 'andina', indice: 1 });

      expect(msg0?.mensaje).not.toBe(msg1?.mensaje);
    });
  });
});

describe('mensajeEnsoVigilancia', () => {
  it('genera mensaje de vigilancia sin probabilidad específica', () => {
    const resultado = mensajeEnsoVigilancia({
      region: 'andina',
      indice: 0,
    });

    expect(resultado).not.toBeNull();
    expect(resultado?.family).toBe('neutral');
    expect(resultado?.mensaje).toContain('Vigilancia');
    expect(resultado?.fuente).toContain('IRI');
  });

  it('teje probabilidad específica cuando es >= 50%', () => {
    const resultado = mensajeEnsoVigilancia({
      region: 'andina',
      indice: 0,
      probabilidadNino: 70,
    });

    expect(resultado).not.toBeNull();
    expect(resultado?.mensaje).toContain('70%');
    expect(resultado?.mensaje).toContain('El Niño');
  });

  it('no teje probabilidad cuando es < 50%', () => {
    const resultado = mensajeEnsoVigilancia({
      region: 'andina',
      indice: 0,
      probabilidadNino: 45,
    });

    expect(resultado).not.toBeNull();
    expect(resultado?.mensaje).not.toContain('45%');
  });
});

describe('rotarHechoEnso', () => {
  it('avanza el índice cíclicamente dentro de hechos disponibles', () => {
    // El Niño Andina tiene 3 hechos (índices 0, 1, 2)
    expect(rotarHechoEnso('el_nino', 'andina', 0)).toBe(1);
    expect(rotarHechoEnso('el_nino', 'andina', 1)).toBe(2);
    expect(rotarHechoEnso('el_nino', 'andina', 2)).toBe(0); // Cicla
    expect(rotarHechoEnso('el_nino', 'andina', 3)).toBe(0); // Fuera de rango
  });

  it('usa genéricos cuando no hay región específica (3 hechos disponibles)', () => {
    // Cuando no hay región específica, usa genéricos que tienen 3 hechos
    const resultado = rotarHechoEnso('el_nino', 'region_inexistente', 0);
    expect(resultado).toBe(1); // Avanza al siguiente porque hay 3 hechos genéricos
  });

  it('normaliza fases correctamente', () => {
    expect(rotarHechoEnso('nino_fuerte', 'andina', 0)).toBe(1);
    expect(rotarHechoEnso('la_nina', 'andina', 0)).toBe(1);
    expect(rotarHechoEnso('neutral', 'andina', 0)).toBe(1);
  });
});

describe('hayMensajeEnso', () => {
  it('devuelve true para fase activa (El Niño)', () => {
    expect(hayMensajeEnso({ fase: 'el_nino', region: 'andina' })).toBe(true);
  });

  it('devuelve true para fase activa (La Niña)', () => {
    expect(hayMensajeEnso({ fase: 'la_nina', region: 'caribe' })).toBe(true);
  });

  it('devuelve true para fase neutral si hay hechos de vigilancia', () => {
    expect(hayMensajeEnso({ fase: 'neutral', region: 'andina' })).toBe(true);
  });

  it('devuelve true para fase neutral sin región específica (usa genéricos)', () => {
    // Región inexistente usa genéricos de vigilancia que siempre están disponibles
    expect(hayMensajeEnso({ fase: 'neutral', region: 'region_falsa' })).toBe(true);
  });

  it('devuelve true para fase activa sin región específica (usa genéricos)', () => {
    expect(hayMensajeEnso({ fase: 'el_nino', region: null })).toBe(true);
  });
});

describe('integración: ciclo completo de rotación', () => {
  it('completa un ciclo de 3 hechos sin repetir', () => {
    const fase = 'el_nino';
    const region = 'andina';
    let idx = 0;
    const mensajes = [];

    // Primer ciclo
    for (let i = 0; i < 3; i++) {
      const msg = mensajeEnsoPrioritario({ fase, region, indice: idx });
      if (msg) {
        mensajes.push(msg.mensaje);
        idx = msg.nextIdx;
      }
    }

    // Los 3 mensajes deben ser distintos
    expect(new Set(mensajes).size).toBe(3);

    // El cuarto mensaje debe repetir el primero (cicla)
    const msgCuarto = mensajeEnsoPrioritario({ fase, region, indice: idx });
    expect(msgCuarto?.mensaje).toBe(mensajes[0]);
  });
});

describe('validación: español colombiano, sin voseo', () => {
  it('nunca usa "vos", "tenés", "querés" en los mensajes', () => {
    const todasLasFases = ['el_nino', 'la_nina', 'neutral'];
    const todasLasRegiones = ['andina', 'caribe', 'pacifico', 'orinoquia', 'amazonia', null];

    todasLasFases.forEach(fase => {
      todasLasRegiones.forEach(region => {
        const msg = mensajeEnsoPrioritario({ fase, region, indice: 0 });
        if (msg) {
          // Usamos word boundaries para evitar falsos positivos como "dale" en "Magdalena"
          expect(msg.mensaje).not.toMatch(/\bvos\b|\btenés\b|\bquerés\b|\belegí\b|\bdale\b|\bacá\b/);
        }
      });
    });
  });

  it('usa fuente colombiana apropiada', () => {
    const msg = mensajeEnsoPrioritario({ fase: 'el_nino', region: 'andina', indice: 0 });
    expect(msg?.fuente).toContain('IDEAM');
  });
});

describe('anti-fabricación: sólo traduce fase ENSO', () => {
  it('no incluye predicciones de temperatura o lluvia específicas', () => {
    const msg = mensajeEnsoPrioritario({ fase: 'el_nino', region: 'andina', indice: 0 });
    
    // No debe incluir números específicos de temperatura o precipitación
    expect(msg?.mensaje).not.toMatch(/\d+°[CF]/);
    expect(msg?.mensaje).not.toMatch(/\d+\s*mm/);
  });

  it('sólo menciona tendencias documentadas, no eventos futuros específicos', () => {
    const msg = mensajeEnsoPrioritario({ fase: 'el_nino', region: 'andina', indice: 0 });
    
    // Debe hablar en términos de tendencia, no predicción de evento específico
    expect(msg?.mensaje).toMatch(/espera|trae|conviene|prioriza|risk|peligro|cuidado/);
  });

  it('cita fuentes reales en la fuente del mensaje', () => {
    const msg = mensajeEnsoPrioritario({ fase: 'el_nino', region: 'andina', indice: 0 });
    expect(msg?.fuente).toMatch(/NOAA|IDEAM|IRI|CPC/);
  });
});
