/**
 * cromatografiaInterpretacion.test.js — Tests para el motor de interpretación
 * de cromatografía de suelo (método Pfeiffer/Restrepo).
 *
 * Casos cubiertos:
 *   1. Suelo vivo con patrones claros (humus, violeta, picos)
 *   2. Suelo degradado (gris, picos ausentes)
 *   3. Suelo químicalizado (anillos blancos, colores apagados)
 *   4. Incertidumbre alta (observaciones insuficientes o ambiguas)
 *   5. Validación de entradas inválidas
 *   6. Normalización de colores y zonas desde input humano
 *   7. Funciones helper (esSueloVivo, obtenerRecomendaciones)
 */
import { describe, expect, it } from 'vitest';
import {
  interpretarCromatografia,
  normalizarColor,
  normalizarZona,
  crearObservacionDesdeRaw,
  esSueloVivo,
  esSueloDegradado,
  esSueloQuimicalizado,
  obtenerRecomendaciones,
} from '../cromatografiaInterpretacion';

/** @typedef {import('../cromatografiaInterpretacion').ObservacionZona} ObservacionZona */
/** @typedef {import('../cromatografiaInterpretacion').InterpretacionCromatografia} InterpretacionCromatografia */

describe('interpretarCromatografia', () => {
  it('debería diagnosticar suelo vivo con patrones claros', () => {
    /** @type {ObservacionZona[]} */
    const observaciones = [
      { zona: 'central', colores: ['blanco'], descripcion: 'Centro claro' },
      { zona: 'media', colores: ['marron_oscuro'], descripcion: 'Humus estable' },
      { zona: 'externa', colores: ['violeta', 'rosado'], descripcion: 'Actividad enzimática' },
      { zona: 'picos', colores: ['violeta', 'marron_oscuro'], descripcion: 'Picos definidos' },
    ];

    const resultado = interpretarCromatografia(observaciones);

    expect(resultado.estado).toBe('vivo');
    expect(resultado.confianza).toBeGreaterThan(0.5);
    expect(resultado.mensaje).toContain('vivo');
    expect(resultado.razones).toContain('Humus estable');
    expect(resultado.razones).toContain('Actividad enzimática');
    expect(resultado.razones).toContain('Picos definidos');
  });

  it('debería diagnosticar suelo degradado con zonas grises', () => {
    /** @type {ObservacionZona[]} */
    const observaciones = [
      { zona: 'central', colores: ['gris'], descripcion: 'Centro oscuro' },
      { zona: 'media', colores: ['gris'], descripcion: 'Materia orgánica degradada' },
      { zona: 'externa', colores: ['blanco'], descripcion: 'Bordes pálidos' },
      { zona: 'picos', colores: [], descripcion: 'Picos ausentes' },
    ];

    const resultado = interpretarCromatografia(observaciones);

    expect(resultado.estado).toBe('degradado');
    expect(resultado.mensaje).toContain('cansado');
    expect(resultado.razones).toContain('Zona gris difusa');
  });

  it('debería diagnosticar suelo químicalizado con anillos blancos', () => {
    /** @type {ObservacionZona[]} */
    const observaciones = [
      { zona: 'central', colores: ['blanco'], descripcion: 'Anillos blancos' },
      { zona: 'media', colores: ['blanco', 'gris'], descripcion: 'Sales acumuladas' },
      { zona: 'externa', colores: ['blanco'], descripcion: 'Actividad baja' },
      { zona: 'picos', colores: ['blanco'], descripcion: 'Poca energía' },
    ];

    const resultado = interpretarCromatografia(observaciones);

    expect(resultado.estado).toBe('quimicalizado');
    expect(resultado.mensaje).toContain('agroquímicos');
    expect(resultado.razones).toContain('Anillos blancos pronunciados');
  });

  it('debería retornar incertidumbre_alta con observaciones ambiguas', () => {
    /** @type {ObservacionZona[]} */
    const observaciones = [
      { zona: 'central', colores: ['blanco'], descripcion: 'Centro' },
      { zona: 'media', colores: ['blanco'], descripcion: 'Media' },
    ];

    const resultado = interpretarCromatografia(observaciones);

    expect(resultado.estado).toBe('incertidumbre_alta');
    expect(resultado.confianza).toBeLessThanOrEqual(0.5);
    expect(resultado.advertencia).toBeTruthy();
  });

  it('debería rechazar observaciones inválidas', () => {
    /** @type {ObservacionZona[]} */
    const observaciones = /** @type {any} */ ([
      { zona: 'zonainvalida', colores: ['marron_oscuro'] },
    ]);

    const resultado = interpretarCromatografia(observaciones);

    expect(resultado.estado).toBe('incertidumbre_alta');
    expect(resultado.confianza).toBe(0);
    expect(resultado.advertencia).toContain('Revise que las zonas');
  });

  it('debería rechazar colores inválidos', () => {
    /** @type {ObservacionZona[]} */
    const observaciones = /** @type {any} */ ([
      { zona: 'central', colores: ['colorinvalido'] },
    ]);

    const resultado = interpretarCromatografia(observaciones);

    expect(resultado.estado).toBe('incertidumbre_alta');
    expect(resultado.confianza).toBe(0);
    expect(resultado.mensaje).toContain('Color inválido');
  });

  it('debería rechazar entradas no-arreglo', () => {
    const resultado = interpretarCromatografia(/** @type {any} */ ('no es un arreglo'));

    expect(resultado.estado).toBe('incertidumbre_alta');
    expect(resultado.mensaje).toContain('deben ser un arreglo');
  });

  it('debería rechazar arreglo vacío', () => {
    const resultado = interpretarCromatografia([]);

    expect(resultado.estado).toBe('incertidumbre_alta');
    expect(resultado.mensaje).toContain('No hay observaciones');
  });
});

describe('normalizarColor', () => {
  it('debería normalizar marrón oscuro con variaciones', () => {
    expect(normalizarColor('marrón oscuro')).toBe('marron_oscuro');
    expect(normalizarColor('marron')).toBe('marron_oscuro');
    expect(normalizarColor('café')).toBe('marron_oscuro');
    expect(normalizarColor('café oscuro')).toBe('marron_oscuro');
  });

  it('debería normalizar blanco con variaciones', () => {
    expect(normalizarColor('blanco')).toBe('blanco');
    expect(normalizarColor('crema')).toBe('blanco');
  });

  it('debería normalizar gris con variaciones', () => {
    expect(normalizarColor('gris')).toBe('gris');
    expect(normalizarColor('plomizo')).toBe('gris');
  });

  it('debería normalizar violeta con variaciones', () => {
    expect(normalizarColor('violeta')).toBe('violeta');
    expect(normalizarColor('lila')).toBe('violeta');
  });

  it('debería normalizar rosado con variaciones', () => {
    expect(normalizarColor('rosado')).toBe('rosado');
    expect(normalizarColor('rosa')).toBe('rosado');
  });

  it('debería normalizar amarillo con variaciones', () => {
    expect(normalizarColor('amarillo')).toBe('amarillo');
    expect(normalizarColor('dorado')).toBe('amarillo');
  });

  it('debería retornar null para colores inválidos', () => {
    expect(normalizarColor('turquesa')).toBeNull();
    expect(normalizarColor('')).toBeNull();
    expect(normalizarColor(null)).toBeNull();
    expect(normalizarColor(undefined)).toBeNull();
  });

  it('debería ser case-insensitive', () => {
    expect(normalizarColor('MARRÓN OSCURO')).toBe('marron_oscuro');
    expect(normalizarColor('  Violeta  ')).toBe('violeta');
  });
});

describe('normalizarZona', () => {
  it('debería normalizar zona central con variaciones', () => {
    expect(normalizarZona('central')).toBe('central');
    expect(normalizarZona('zona central')).toBe('central');
    expect(normalizarZona('centro')).toBe('central');
  });

  it('debería normalizar zona media con variaciones', () => {
    expect(normalizarZona('media')).toBe('media');
    expect(normalizarZona('zona media')).toBe('media');
    expect(normalizarZona('proteica')).toBe('media');
    expect(normalizarZona('humica')).toBe('media');
  });

  it('debería normalizar zona externa con variaciones', () => {
    expect(normalizarZona('externa')).toBe('externa');
    expect(normalizarZona('zona externa')).toBe('externa');
    expect(normalizarZona('enzimatica')).toBe('externa');
  });

  it('debería normalizar zona picos con variaciones', () => {
    expect(normalizarZona('picos')).toBe('picos');
    expect(normalizarZona('picos bordes')).toBe('picos');
    expect(normalizarZona('radiaciones')).toBe('picos');
    expect(normalizarZona('borde')).toBe('picos');
  });

  it('debería retornar null para zonas inválidas', () => {
    expect(normalizarZona('zonainvalida')).toBeNull();
    expect(normalizarZona('')).toBeNull();
    expect(normalizarZona(null)).toBeNull();
    expect(normalizarZona(undefined)).toBeNull();
  });

  it('debería ser case-insensitive', () => {
    expect(normalizarZona('CENTRAL')).toBe('central');
    expect(normalizarZona('  Media  ')).toBe('media');
  });
});

describe('crearObservacionDesdeRaw', () => {
  it('debería crear observación válida desde datos crudos', () => {
    const rawData = {
      zona: 'central',
      colores: ['blanco', 'gris'],
      descripcion: 'Centro con sales',
    };

    const resultado = crearObservacionDesdeRaw(rawData);

    expect(resultado).toEqual({
      zona: 'central',
      colores: ['blanco', 'gris'],
      descripcion: 'Centro con sales',
    });
  });

  it('debería normalizar colores desde input humano', () => {
    const rawData = {
      zona: 'media',
      colores: ['café', 'violeta', 'rosa'],
    };

    const resultado = crearObservacionDesdeRaw(rawData);

    expect(resultado.colores).toEqual(['marron_oscuro', 'violeta', 'rosado']);
  });

  it('debería eliminar colores duplicados', () => {
    const rawData = {
      zona: 'externa',
      colores: ['violeta', 'violeta', 'rosado'],
    };

    const resultado = crearObservacionDesdeRaw(rawData);

    expect(resultado.colores).toEqual(['violeta', 'rosado']);
  });

  it('debería filtrar colores inválidos', () => {
    const rawData = {
      zona: 'picos',
      colores: ['violeta', 'turquesa', 'gris'],
    };

    const resultado = crearObservacionDesdeRaw(rawData);

    expect(resultado.colores).toEqual(['violeta', 'gris']);
  });

  it('debería retornar null para zona inválida', () => {
    const rawData = {
      zona: 'zonainvalida',
      colores: ['marron_oscuro'],
    };

    const resultado = crearObservacionDesdeRaw(rawData);

    expect(resultado).toBeNull();
  });

  it('debería retornar null para datos no-objeto', () => {
    expect(crearObservacionDesdeRaw(null)).toBeNull();
    expect(crearObservacionDesdeRaw('string')).toBeNull();
    expect(crearObservacionDesdeRaw(123)).toBeNull();
  });

  it('debería manejar colores faltantes', () => {
    const rawData = {
      zona: 'central',
      descripcion: 'Sin colores',
    };

    const resultado = crearObservacionDesdeRaw(rawData);

    expect(resultado.zona).toBe('central');
    expect(resultado.colores).toEqual([]);
    expect(resultado.descripcion).toBe('Sin colores');
  });
});

describe('esSueloVivo', () => {
  it('debería retornar true para suelo vivo con confianza >= 0.5', () => {
    /** @type {Partial<InterpretacionCromatografia>} */
    const interpretacion = {
      estado: 'vivo',
      confianza: 0.8,
    };

    expect(esSueloVivo(interpretacion)).toBe(true);
  });

  it('debería retornar false para suelo vivo con baja confianza', () => {
    /** @type {Partial<InterpretacionCromatografia>} */
    const interpretacion = {
      estado: 'vivo',
      confianza: 0.4,
    };

    expect(esSueloVivo(interpretacion)).toBe(false);
  });

  it('debería retornar false para otros estados', () => {
    expect(esSueloVivo({ estado: 'degradado', confianza: 0.8 })).toBe(false);
    expect(esSueloVivo({ estado: 'quimicalizado', confianza: 0.8 })).toBe(false);
    expect(esSueloVivo({ estado: 'incertidumbre_alta', confianza: 0.8 })).toBe(false);
  });

  it('debería retornar false para interpretación null/undefined', () => {
    expect(esSueloVivo(null)).toBe(false);
    expect(esSueloVivo(undefined)).toBe(false);
  });
});

describe('esSueloDegradado', () => {
  it('debería retornar true para suelo degradado con confianza >= 0.5', () => {
    /** @type {Partial<InterpretacionCromatografia>} */
    const interpretacion = {
      estado: 'degradado',
      confianza: 0.7,
    };

    expect(esSueloDegradado(interpretacion)).toBe(true);
  });

  it('debería retornar false para suelo degradado con baja confianza', () => {
    /** @type {Partial<InterpretacionCromatografia>} */
    const interpretacion = {
      estado: 'degradado',
      confianza: 0.3,
    };

    expect(esSueloDegradado(interpretacion)).toBe(false);
  });

  it('debería retornar false para otros estados', () => {
    expect(esSueloDegradado({ estado: 'vivo', confianza: 0.8 })).toBe(false);
    expect(esSueloDegradado({ estado: 'quimicalizado', confianza: 0.8 })).toBe(false);
  });
});

describe('esSueloQuimicalizado', () => {
  it('debería retornar true para suelo químicalizado con confianza >= 0.5', () => {
    /** @type {Partial<InterpretacionCromatografia>} */
    const interpretacion = {
      estado: 'quimicalizado',
      confianza: 0.6,
    };

    expect(esSueloQuimicalizado(interpretacion)).toBe(true);
  });

  it('debería retornar false para suelo químicalizado con baja confianza', () => {
    /** @type {Partial<InterpretacionCromatografia>} */
    const interpretacion = {
      estado: 'quimicalizado',
      confianza: 0.4,
    };

    expect(esSueloQuimicalizado(interpretacion)).toBe(false);
  });

  it('debería retornar false para otros estados', () => {
    expect(esSueloQuimicalizado({ estado: 'vivo', confianza: 0.8 })).toBe(false);
    expect(esSueloQuimicalizado({ estado: 'degradado', confianza: 0.8 })).toBe(false);
  });
});

describe('obtenerRecomendaciones', () => {
  it('debería retornar recomendaciones para suelo vivo', () => {
    const recomendaciones = obtenerRecomendaciones('vivo');

    expect(recomendaciones).toContain('Continuar con prácticas orgánicas y biopreparados');
    expect(recomendaciones).toContain('Mantener cobertura vegetal permanente');
    expect(recomendaciones.length).toBeGreaterThan(0);
  });

  it('debería retornar recomendaciones para suelo degradado', () => {
    const recomendaciones = obtenerRecomendaciones('degradado');

    expect(recomendaciones).toContain('Aplicar abonos orgánicos (compost, bocashi) para recuperar materia orgánica');
    expect(recomendaciones).toContain('Usar biopreparados microbiológicos para activar la vida del suelo');
    expect(recomendaciones.length).toBeGreaterThan(0);
  });

  it('debería retornar recomendaciones para suelo químicalizado', () => {
    const recomendaciones = obtenerRecomendaciones('quimicalizado');

    expect(recomendaciones).toContain('Aplicar biopreparados para recuperar microbiota benéfica');
    expect(recomendaciones).toContain('Reducir gradualmente agroquímicos sintéticos');
    expect(recomendaciones.length).toBeGreaterThan(0);
  });

  it('debería retornar recomendaciones para incertidumbre alta', () => {
    const recomendaciones = obtenerRecomendaciones('incertidumbre_alta');

    expect(recomendaciones).toContain('Repetir el método de cromatografía con condiciones estandarizadas');
    expect(recomendaciones).toContain('Comparar con suelos de referencia de la misma finca');
    expect(recomendaciones.length).toBeGreaterThan(0);
  });
});

describe('casos integrados realistas', () => {
  it('debería interpretar cromatograma completo de suelo regenerado', () => {
    /** @type {ObservacionZona[]} */
    const observaciones = [
      { zona: 'central', colores: ['blanco'], descripcion: 'Centro claro, sales disponibles' },
      { zona: 'media', colores: ['marron_oscuro'], descripcion: 'Anillo marrón bien definido' },
      { zona: 'externa', colores: ['violeta', 'rosado'], descripcion: 'Borde violeta definido' },
      { zona: 'picos', colores: ['violeta', 'marron_oscuro'], descripcion: 'Muchas radiaciones' },
    ];

    const resultado = interpretarCromatografia(observaciones);

    expect(resultado.estado).toBe('vivo');
    expect(resultado.confianza).toBeGreaterThanOrEqual(0.6);
    expect(resultado.razones.length).toBeGreaterThanOrEqual(3);
  });

  it('debería interpretar cromatograma de suelo convencional agotado', () => {
    /** @type {ObservacionZona[]} */
    const observaciones = [
      { zona: 'central', colores: ['gris'], descripcion: 'Centro oscuro' },
      { zona: 'media', colores: ['gris'], descripcion: 'Zona gris difusa' },
    ];

    const resultado = interpretarCromatografia(observaciones);

    expect(resultado.estado).toBe('degradado');
    expect(resultado.mensaje).toContain('cansado');
    expect(resultado.advertencia).toBeTruthy();
  });

  it('debería interpretar cromatograma de suelo con exceso de químicos', () => {
    /** @type {ObservacionZona[]} */
    const observaciones = [
      { zona: 'central', colores: ['blanco'], descripcion: 'Anillos blancos marcados' },
      { zona: 'media', colores: ['blanco', 'gris'], descripcion: 'Sales y degradación' },
      { zona: 'externa', colores: ['blanco', 'gris'], descripcion: 'Actividad microbiana baja' },
      { zona: 'picos', colores: ['blanco'], descripcion: 'Poca energía' },
    ];

    const resultado = interpretarCromatografia(observaciones);

    expect(resultado.estado).toBe('quimicalizado');
    expect(resultado.mensaje).toContain('agroquímicos');
  });

  it('debería manejar observaciones mínimas con baja confianza', () => {
    /** @type {ObservacionZona[]} */
    const observaciones = [
      { zona: 'central', colores: ['blanco'] },
      { zona: 'media', colores: ['marron_oscuro'] },
    ];

    const resultado = interpretarCromatografia(observaciones);

    expect(resultado.confianza).toBeLessThan(0.6);
    expect(resultado.advertencia).toBeTruthy();
  });
});
