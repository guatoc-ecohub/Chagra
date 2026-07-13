// @ts-nocheck
/**
 * guardasSeguridad.integrator.test.js — SUITE INTEGRADORA de guardas de
 * seguridad campesina (DR-SUELOS-1, DR-AGUA-1, DR-ANIMAL-1, DR-RESTAURACION-1).
 *
 * Por qué existe: el patrón de fallo real de una guarda es que quede MUERTA —
 * el código la "tiene" pero chequea un campo/condición que ya no se dispara, así
 * que nunca emite el aviso y el campesino recibe un consejo peligroso. Estos
 * tests son TDD-real: cada fila de GUARD_MATRIX afirma que UNA guarda concreta
 * SE DISPARA con su input. Si se borra/rompe la guarda en prod, su fila falla.
 *
 * Probado borrando guardas en prod (cada fila enrojece su guarda):
 *   - Animal: quitar leucaena_toxica de getGuardas → 4 filas monogástrico rojas.
 *   - Suelo:  quitar el push de 'pH<5.5' → fila cal-bloqueada-hasta-pH roja.
 *   - Agua:   quitar el branch de 'hidrogel' → fila hidrogel roja.
 *   - Restauración: quitar guardas.pino_eucalipto → fila greenwashing roja.
 *
 * Las filas de CONTROL prueban especificidad (la guarda NO se dispara donde no
 * debe): una guarda always-on que "siempre dispara" es tan mala como una muerta.
 *
 * Español Colombia (tú/usted), CERO voseo. CERO fabricación: todo sale del seed.
 */

import { describe, it, expect } from 'vitest';
import {
  diagnosticarSuelo,
} from '../soilDiagnostic.js';
import {
  diagnosticarAgua,
  calcularCaptacion,
} from '../waterDiagnostic.js';
import {
  getGuardas,
  diagnosticarAnimal,
} from '../animalDiagnostic.js';
import {
  diagnosticarRestauracion,
} from '../restauracionDiagnostic.js';

const has = (arr, ...needles) =>
  Array.isArray(arr) && arr.some((s) => needles.every((n) => String(s).includes(n)));

/**
 * MATRIZ DE GUARDAS — cada fila: { id, modulo, run(), fires(result) }.
 * `fires` DEBE devolver true cuando la guarda está viva. Si la guarda se quita,
 * `fires` devuelve false y la fila falla → hallazgo de seguridad.
 */
const GUARD_MATRIX = [
  // ── SUELO ────────────────────────────────────────────────────────────────
  {
    id: 'suelo/vinagre = MITO (bloqueado, NO decide cal)',
    modulo: 'suelo',
    run: () => diagnosticarSuelo('le eché vinagre a la tierra'),
    fires: (r) =>
      has(r.advertencias, 'MITO', 'vinagre') &&
      has(r.advertencias, 'tiras de pH') &&
      // bloqueado de verdad: del vinagre NO sale ninguna enmienda accionable (sin "botón de confirmar")
      r.enmiendas.length === 0,
  },
  {
    id: 'suelo/bicarbonato = MITO (bloqueado)',
    modulo: 'suelo',
    run: () => diagnosticarSuelo('hice la prueba del bicarbonato y no burbujeó'),
    fires: (r) =>
      has(r.advertencias, 'MITO', 'bicarbonato') && r.enmiendas.length === 0,
  },
  {
    id: 'suelo/cal BLOQUEADA hasta confirmar pH<5.5',
    modulo: 'suelo',
    run: () => diagnosticarSuelo('en mi lote sale mucho helecho'),
    fires: (r) =>
      has(r.advertencias, 'pH<5.5') &&
      // si recomienda cal, debe venir con la guarda de NO sobre-encalar
      r.enmiendas.some((e) => e.id === 'cal_dolomitica' && /NO sobre-encalar/.test(e.precaucion)),
  },
  {
    id: 'suelo/aguacate + mal drenaje = ALERTA CRÍTICA Phytophthora',
    modulo: 'suelo',
    run: () => diagnosticarSuelo('quiero sembrar aguacate pero el terreno se empoza'),
    fires: (r) => has(r.advertencias, 'ALERTA CRÍTICA', 'Phytophthora'),
  },

  // ── AGUA ─────────────────────────────────────────────────────────────────
  {
    id: 'agua/calendario LUNAR = MITO (excluido)',
    modulo: 'agua',
    run: () => diagnosticarAgua('debo regar en luna menguante?'),
    fires: (r) =>
      has(r.advertencias, 'MITO', 'lunar') &&
      // y NUNCA lo recomienda como práctica
      !r.riego.some((x) => /luna/i.test(x.nombre)) &&
      !r.conservacion.some((x) => /luna/i.test(x.nombre)),
  },
  {
    id: 'agua/radiestesia (varillas) = MITO (excluido)',
    modulo: 'agua',
    run: () => diagnosticarAgua('uso varillas para encontrar agua'),
    fires: (r) => has(r.advertencias, 'MITO', 'Radiestesia'),
  },
  {
    id: 'agua/hidrogel sintético = NO AGROECOLOGICO (excluido)',
    modulo: 'agua',
    run: () => diagnosticarAgua('le pongo hidrogel a la tierra'),
    fires: (r) =>
      has(r.advertencias, 'NO AGROECOLOGICO') &&
      !r.conservacion.some((x) => /hidrogel|poliacrilato/i.test(x.nombre)),
  },
  {
    id: 'agua/marchitez de mediodía NO = sed (guarda siempre activa)',
    modulo: 'agua',
    run: () => diagnosticarAgua('se me seca el cultivo'),
    fires: (r) => has(r.advertencias, 'marchitez al mediodia'),
  },

  // ── ANIMAL — Leucaena/mimosina PROHIBIDA a CADA monogástrico + equino ─────
  {
    id: 'animal/Leucaena PROHIBIDA a CERDO (porcino)',
    modulo: 'animal',
    run: () => getGuardas('porcino'),
    fires: (g) => has(g, 'PROHIBIDA', 'Leucaena') && has(g, 'mimosina'),
  },
  {
    id: 'animal/Leucaena PROHIBIDA a CONEJO (cunícola)',
    modulo: 'animal',
    run: () => getGuardas('cunicola'),
    fires: (g) => has(g, 'PROHIBIDA', 'Leucaena'),
  },
  {
    id: 'animal/Leucaena PROHIBIDA a AVE (avícola)',
    modulo: 'animal',
    run: () => getGuardas('avicola'),
    fires: (g) => has(g, 'PROHIBIDA', 'Leucaena'),
  },
  {
    id: 'animal/Leucaena PROHIBIDA a EQUINO',
    modulo: 'animal',
    run: () => getGuardas('equino'),
    fires: (g) => has(g, 'PROHIBIDA', 'EQUINOS'),
  },
  {
    id: 'animal/flujo: "leucaena a los marranos" levanta la guarda',
    modulo: 'animal',
    run: () => diagnosticarAnimal('les doy leucaena a los marranos'),
    fires: (d) => has(d.guardas, 'PROHIBIDA', 'Leucaena'),
  },

  // ── RESTAURACIÓN ─────────────────────────────────────────────────────────
  {
    id: 'restauracion/anti-greenwashing: pino/eucalipto NO es restauración',
    modulo: 'restauracion',
    run: () => diagnosticarRestauracion('voy a sembrar pino para restaurar'),
    fires: (r) =>
      has(r.alertas, 'Pino') || has(r.guardas, 'Pino') ||
      has(r.alertas, 'NO son restauracion') || has(r.guardas, 'NO son restauracion'),
  },
  {
    id: 'restauracion/eucalipto también dispara la guarda anti-exóticas',
    modulo: 'restauracion',
    run: () => diagnosticarRestauracion('quiero sembrar eucalipto en la ronda'),
    fires: (r) => has(r.alertas, 'eucalipto') || has(r.guardas, 'eucalipto') ||
      has(r.alertas, 'Pino') || has(r.guardas, 'Pino'),
  },
  {
    id: 'restauracion/bonos de carbono: "me quieren pagar por sembrar" = ALERTA',
    modulo: 'restauracion',
    run: () => diagnosticarRestauracion('me quieren pagar por sembrar arboles'),
    fires: (r) => has(r.alertas, 'BONOS') || has(r.alertas, 'carbono'),
  },
  {
    id: 'restauracion/páramo (Ley 1930) = restauración PASIVA primero',
    modulo: 'restauracion',
    run: () => diagnosticarRestauracion('el paramo se esta secando'),
    fires: (r) => has(r.alertas, 'PARAMO') || has(r.alertas, '1930') || has(r.alertas, 'pasiva') || has(r.alertas, 'PASIVA'),
  },
  {
    id: 'restauracion/retamo invasor = NO quemar (rebrota)',
    modulo: 'restauracion',
    run: () => diagnosticarRestauracion('tengo retamo invadiendo el lote'),
    fires: (r) => r.alertas.some((a) => a.includes('NO') && /quem/.test(a)),
  },
];

describe('GUARDAS DE SEGURIDAD — integrador: cada guarda SE DISPARA con su input', () => {
  it('la matriz cubre las 4 dimensiones (suelo/agua/animal/restauración)', () => {
    const modulos = new Set(GUARD_MATRIX.map((g) => g.modulo));
    expect(modulos).toEqual(new Set(['suelo', 'agua', 'animal', 'restauracion']));
    expect(GUARD_MATRIX.length).toBeGreaterThanOrEqual(17);
  });

  it.each(GUARD_MATRIX.map((g) => [g.id, g]))(
    'guarda VIVA → %s',
    (_id, guard) => {
      const result = guard.run();
      expect(result, `la guarda "${guard.id}" devolvió un resultado vacío/nulo`).toBeTruthy();
      // Si esto falla, la guarda está MUERTA: no se disparó con su input → HALLAZGO DE SEGURIDAD.
      expect(
        guard.fires(result),
        `GUARDA MUERTA: "${guard.id}" NO se disparó con su input. El campesino recibiría un consejo peligroso.`,
      ).toBe(true);
    },
  );
});

describe('GUARDAS — especificidad (control): NO se disparan donde NO deben', () => {
  it('animal/rumiante (bovino) NO recibe la guarda Leucaena PROHIBIDA', () => {
    // Leucaena SÍ es forrajera válida para rumiantes; una guarda always-on aquí
    // sería un falso positivo que confunde al ganadero.
    expect(has(getGuardas('bovino'), 'PROHIBIDA', 'Leucaena')).toBe(false);
  });

  it('suelo/aguacate en suelo BUENO (sin mal drenaje) NO dispara ALERTA CRÍTICA', () => {
    const d = diagnosticarSuelo('quiero sembrar aguacate, la tierra está negra y sueltica');
    expect(has(d.advertencias, 'ALERTA CRÍTICA')).toBe(false);
  });

  it('agua/sin mito mencionado NO inventa advertencia de mito lunar/hidrogel', () => {
    const d = diagnosticarAgua('se me seca el cultivo');
    expect(d.advertencias.some((a) => a.includes('MITO') || a.includes('NO AGROECOLOGICO'))).toBe(false);
  });

  it('restauración/recuperar el monte (sin exóticas) NO mete alerta de bonos', () => {
    const r = diagnosticarRestauracion('quiero recuperar el monte');
    expect(has(r.alertas, 'BONOS')).toBe(false);
  });
});

describe('AGUA — calculadora de captación Vc = A × lluvia × Ce × η da el valor correcto', () => {
  it('60m² × 1200mm × Ce=0.90 × η=0.85 = 55.080 L/año (151 L/día)', () => {
    const r = calcularCaptacion(60, 1200, 0.9);
    expect(r.litros_anuales).toBe(55080);
    expect(r.litros_diarios).toBe(151);
  });

  it('la fórmula es lineal y multiplicativa en sus 4 factores (no inventada)', () => {
    // 1mm sobre 1m² = 1L; con Ce=1 y η=1 los litros = A×lluvia exactos.
    expect(calcularCaptacion(10, 100, 1, 1).litros_anuales).toBe(1000);
    // doblar el área dobla el volumen
    expect(calcularCaptacion(20, 100, 1, 1).litros_anuales).toBe(2000);
    // η por defecto 0.85
    expect(calcularCaptacion(10, 100, 1).litros_anuales).toBe(850);
  });

  it('parámetros inválidos → null (no inventa un número)', () => {
    expect(calcularCaptacion(0, 1200, 0.9)).toBeNull();
    expect(calcularCaptacion(60, 0, 0.9)).toBeNull();
    expect(calcularCaptacion(60, 1200, 0)).toBeNull();
  });
});

describe('MÓDULOS — flujo descripción→diagnóstico→guarda + degradación sin romper', () => {
  const modulos = [
    ['suelo', diagnosticarSuelo, 'tengo tierra amarilla pegajosa y sale helecho'],
    ['agua', (t) => diagnosticarAgua(t), 'se me seca el cultivo, no llueve hace meses'],
    ['animal', diagnosticarAnimal, 'tengo 5 vacas lecheras'],
    ['restauracion', diagnosticarRestauracion, 'quiero recuperar el monte en tierra fria'],
  ];

  it.each(modulos)('%s: descripción real → diagnóstico con datos + fuente citada', (_n, fn, texto) => {
    const d = fn(texto);
    expect(d).toBeTruthy();
    expect(d.sin_datos).toBe(false);
    expect(typeof d.fuente).toBe('string');
    expect(d.fuente.length).toBeGreaterThan(0);
  });

  // Degradación: estos módulos son PUROS (sin red/sidecar). Ante entrada vacía,
  // nula o ruido deben devolver sin_datos:true SIN lanzar — NUNCA inventar.
  const degradaInputs = ['', '  ', null, undefined, 'ab', 'hola buenos dias'];
  it.each(modulos)('%s: degrada sin romper ante entrada vacía/ruido (no inventa)', (_n, fn) => {
    for (const inp of degradaInputs) {
      let d;
      expect(() => { d = fn(inp); }).not.toThrow();
      expect(d).toBeTruthy();
      if (inp === '' || inp == null || inp === '  ' || inp === 'ab' || inp === 'hola buenos dias') {
        expect(d.sin_datos).toBe(true);
      }
    }
  });
});
