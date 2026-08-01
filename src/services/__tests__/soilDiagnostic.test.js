/**
 * soilDiagnostic.test.js — tests del módulo de suelos (DR-SUELOS-1).
 *
 * Verifica: sintoma→prueba correcta, acidez→cal con guarda,
 * MITOs advertidos, sin datos→no inventa, aguacate→alerta crítica.
 */

import { describe, it, expect } from 'vitest';
import { diagnosticarSuelo, formatearGroundingSuelo } from '../soilDiagnostic';

describe('diagnosticarSuelo — árbol de decisión', () => {
  it('retorna sin_datos si descripción vacía o muy corta', () => {
    expect(diagnosticarSuelo('').sin_datos).toBe(true);
    expect(diagnosticarSuelo('ab').sin_datos).toBe(true);
    expect(diagnosticarSuelo(null).sin_datos).toBe(true);
    expect(diagnosticarSuelo(undefined).sin_datos).toBe(true);
  });

  it('"tierra amarilla pegajosa" → problemas de arcilla, acidez, mal drenaje', () => {
    const d = diagnosticarSuelo('mi tierra es amarilla y pegajosa');
    expect(d.problemas).toContain('arcilla');
    expect(d.problemas).toContain('acidez');
    expect(d.problemas).toContain('mal_drenaje');
    expect(d.sin_datos).toBe(false);
  });

  it('"se empoza cuando llueve" → prueba de infiltración del hoyo', () => {
    const d = diagnosticarSuelo('el lote se empoza cuando llueve');
    expect(d.problemas).toContain('mal_drenaje');
    expect(d.pruebas.some((p) => p.id === 'infiltracion_hoyo')).toBe(true);
  });

  it('"el palín rebota, dura como piedra" → compactación + varilla', () => {
    const d = diagnosticarSuelo('el palín rebota, está dura como piedra');
    expect(d.problemas).toContain('compactacion');
    expect(d.pruebas.some((p) => p.id === 'varilla_penetracion')).toBe(true);
  });

  it('"tierra negra y sueltica, huele a monte bueno" → sin problemas', () => {
    const d = diagnosticarSuelo('mi tierra es negra y sueltica, huele a monte bueno');
    expect(d.problemas).toContain('ninguno');
    expect(d.pruebas).toHaveLength(0);
  });

  it('"sale helecho" → acidez + sugiere pH tiras', () => {
    const d = diagnosticarSuelo('en mi lote sale mucho helecho');
    expect(d.problemas).toContain('acidez');
    expect(d.pruebas.some((p) => p.id === 'ph_tiras')).toBe(true);
  });

  it('"hay cortadera y coquito" → compactación/encharcamiento + varilla', () => {
    const d = diagnosticarSuelo('hay mucha cortadera y coquito en el lote');
    expect(d.problemas).toContain('compactacion_encharcamiento');
    expect(d.pruebas.some((p) => p.id === 'varilla_penetracion')).toBe(true);
  });

  it('"tierra cansada que ya no da" → baja MO + test mostaza', () => {
    const d = diagnosticarSuelo('la tierra está cansada, ya no da nada');
    expect(d.problemas).toContain('baja_materia_organica');
    expect(d.pruebas.some((p) => p.id === 'test_mostaza')).toBe(true);
  });

  it('sin datos suficientes no inventa problemas ni enmiendas', () => {
    const d = diagnosticarSuelo('hola buenos días');
    expect(d.sin_datos).toBe(true);
    expect(d.problemas).toHaveLength(0);
    expect(d.enmiendas).toHaveLength(0);
  });
});

describe('diagnosticarSuelo — guardas de seguridad', () => {
  it('acidez → recomienda cal dolomítica con guarda de NO sobre-encalar', () => {
    const d = diagnosticarSuelo('tengo tierra amarilla pegajosa');
    const cal = d.enmiendas.find((e) => e.id === 'cal_dolomitica');
    expect(cal).toBeDefined();
    expect(cal.precaucion).toContain('NO sobre-encalar');
    expect(d.advertencias.some((a) => a.includes('NO sobre-encalar'))).toBe(true);
  });

  it('acidez → advertencia de no aplicar cal con urea o estiércol fresco', () => {
    const d = diagnosticarSuelo('tengo tierra amarilla pegajosa y sale helecho');
    expect(d.advertencias.some((a) => a.includes('urea'))).toBe(true);
  });

  it('acidez → solo encalar si pH<5.5 confirmado', () => {
    const d = diagnosticarSuelo('sale helecho en mi lote');
    expect(d.advertencias.some((a) => a.includes('pH<5.5'))).toBe(true);
  });

  it('acidez en suelo no alcalino → también sugiere ceniza de madera con guarda', () => {
    const d = diagnosticarSuelo('tengo tierra amarilla pegajosa');
    const ceniza = d.enmiendas.find((e) => e.id === 'ceniza_madera');
    expect(ceniza).toBeDefined();
    expect(ceniza.precaucion).toContain('JAMÁS en suelo alcalino');
  });

  it('acidez + tierra colorada → sugiere roca fosfórica con guarda', () => {
    const d = diagnosticarSuelo('tengo tierra colorada y ácida');
    const rf = d.enmiendas.find((e) => e.id === 'roca_fosforica');
    expect(rf).toBeDefined();
    expect(rf.precaucion).toContain('SOLO funciona en pH<5.5');
  });
});

describe('diagnosticarSuelo — MITOS advertidos', () => {
  it('mencionar vinagre → advertencia de MITO', () => {
    const d = diagnosticarSuelo('le eché vinagre a la tierra para ver si era ácida');
    expect(d.advertencias.some((a) => a.includes('MITO') && a.includes('vinagre'))).toBe(true);
    expect(d.advertencias.some((a) => a.includes('tiras de pH'))).toBe(true);
  });

  it('mencionar bicarbonato → advertencia de MITO', () => {
    const d = diagnosticarSuelo('hice la prueba del bicarbonato y no burbujeó');
    expect(d.advertencias.some((a) => a.includes('MITO') && a.includes('bicarbonato'))).toBe(true);
  });

  it('mencionar hormiga arriera → advertencia de MITO', () => {
    const d = diagnosticarSuelo('donde hay hormiga arriera la tierra es buena');
    expect(d.advertencias.some((a) => a.includes('MITO') && a.includes('arriera'))).toBe(true);
  });

  it('mencionar vendeaguja → advertencia de MITO', () => {
    const d = diagnosticarSuelo('hay vendeaguja en mi lote, será ácido?');
    expect(d.advertencias.some((a) => a.includes('MITO') && a.toLowerCase().includes('vendeaguja'))).toBe(true);
  });

  it('mencionar musgo → advertencia de MITO', () => {
    const d = diagnosticarSuelo('tiene musgo la tierra');
    expect(d.advertencias.some((a) => a.includes('MITO') && a.includes('musgo'))).toBe(true);
  });
});

describe('diagnosticarSuelo — cultivos específicos', () => {
  it('aguacate + mal drenaje → ALERTA CRITICA Phytophthora', () => {
    const d = diagnosticarSuelo('quiero sembrar aguacate pero el terreno se empoza');
    expect(d.advertencias.some((a) => a.includes('ALERTA CRÍTICA') && a.includes('Phytophthora'))).toBe(true);
    expect(d.advertencias.some((a) => a.includes('Camellones altos'))).toBe(true);
  });

  it('aguacate + arcilla → ALERTA CRITICA', () => {
    const d = diagnosticarSuelo('voy a sembrar aguacate en tierra amarilla pegajosa');
    expect(d.advertencias.some((a) => a.includes('ALERTA CRÍTICA'))).toBe(true);
  });

  it('aguacate sin problemas de drenaje → sin alerta', () => {
    const d = diagnosticarSuelo('quiero sembrar aguacate, la tierra está buena');
    expect(d.advertencias.some((a) => a.includes('ALERTA CRÍTICA'))).toBe(false);
  });
});

describe('formatearGroundingSuelo', () => {
  it('retorna vacío si sin_datos', () => {
    expect(formatearGroundingSuelo(/** @type {any} */ ({ sin_datos: true }))).toBe('');
    expect(formatearGroundingSuelo(null)).toBe('');
  });

  it('incluye problemas, pruebas, enmiendas y guardas', () => {
    const d = diagnosticarSuelo('tengo tierra amarilla pegajosa y sale helecho');
    const f = formatearGroundingSuelo(d);
    expect(f).toContain('Problemas detectados');
    expect(f).toContain('Pruebas caseras recomendadas');
    expect(f).toContain('Enmiendas sugeridas');
    expect(f).toContain('GUARDAS DE SEGURIDAD');
    expect(f).toContain('DR-SUELOS-1');
  });
});

describe('persistencia del último diagnóstico (panel de vitalidad)', () => {
  it('round-trip: guardar → leer devuelve problemas + ts + fuente', async () => {
    const { guardarDiagnosticoSuelo, getDiagnosticoSueloGuardado, DIAG_SUELO_STORAGE_KEY } = await import('../soilDiagnostic');
    localStorage.removeItem(DIAG_SUELO_STORAGE_KEY);
    expect(getDiagnosticoSueloGuardado()).toBeNull();

    const d = diagnosticarSuelo('tengo tierra amarilla pegajosa y sale helecho');
    expect(guardarDiagnosticoSuelo(d)).toBe(true);

    const leido = getDiagnosticoSueloGuardado();
    expect(leido).not.toBeNull();
    expect(leido.sin_datos).toBe(false);
    expect(leido.problemas).toEqual(d.problemas);
    expect(Number.isFinite(leido.ts)).toBe(true);
    expect(leido.fuente).toContain('DR-SUELOS-1');
    localStorage.removeItem(DIAG_SUELO_STORAGE_KEY);
  });

  it('NO persiste sin_datos ni shapes inválidos', async () => {
    const { guardarDiagnosticoSuelo, getDiagnosticoSueloGuardado, DIAG_SUELO_STORAGE_KEY } = await import('../soilDiagnostic');
    localStorage.removeItem(DIAG_SUELO_STORAGE_KEY);
    expect(guardarDiagnosticoSuelo(diagnosticarSuelo(''))).toBe(false);
    expect(guardarDiagnosticoSuelo(null)).toBe(false);
    expect(getDiagnosticoSueloGuardado()).toBeNull();
  });

  it('entrada corrupta en localStorage → null (no revienta el home)', async () => {
    const { getDiagnosticoSueloGuardado, DIAG_SUELO_STORAGE_KEY } = await import('../soilDiagnostic');
    localStorage.setItem(DIAG_SUELO_STORAGE_KEY, '{no-es-json');
    expect(getDiagnosticoSueloGuardado()).toBeNull();
    localStorage.setItem(DIAG_SUELO_STORAGE_KEY, JSON.stringify({ problemas: 'no-array' }));
    expect(getDiagnosticoSueloGuardado()).toBeNull();
    localStorage.removeItem(DIAG_SUELO_STORAGE_KEY);
  });
});
