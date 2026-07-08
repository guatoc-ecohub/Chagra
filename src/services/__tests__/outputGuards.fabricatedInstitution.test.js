/**
 * outputGuards.fabricatedInstitution.test.js
 *
 * #2133 (bench anti-alucinación 2026-07-06). El agente CITA instituciones/fuentes
 * de apoyo que NO existen como si fueran autoridades reales — fabricación de
 * autoridad. `guardInventedContact` (#1949) cubre teléfono/URL/resolución, pero no
 * el nombre de la entidad. `guardFabricatedInstitution` es su análogo institucional
 * (como `guardInventedBrand` #1305 lo es para marcas comerciales): contrasta contra
 * una allowlist curada de instituciones REALES colombianas/agro y SUPRIME-y-
 * REEMPLAZA quirúrgicamente por oración la cita de una institución fabricada,
 * degradando a "sin fuente verificada" (ICA/Agrosavia/UMATA/CAR).
 *
 * Casos REALES del bench (deben suprimirse):
 *   - "Centro Nacional de Historia Natural (CNHN)"
 *   - "Instituto de Investigación Biológica Los Andes Caldwell"
 *   - "SERAGRO en tu región"
 *   - "CATI (Centro Nacional de Investigación de Maíz y Tubérculos)"
 * Anti-FP CRÍTICO: NO debe tocar ICA, Agrosavia, Cenicafé, Corpoica, IDEAM, UNAL,
 * universidades reales, corporaciones autónomas (CARs), Humboldt, Invemar, Sinchi,
 * UMATA, ni instalaciones genéricas (Centro de Acopio), ni siglas no-institución
 * (NPK, MIP).
 */

import { describe, it, expect } from 'vitest';
import { guardFabricatedInstitution, applyOutputGuards } from '../outputGuards.js';

describe('guardFabricatedInstitution — casos reales del bench #2133', () => {
  it('Caso A: suprime CNHN + "Los Andes Caldwell" y conserva el agronómico correcto', () => {
    const llm =
      'El kale rizado verde no se da en piso térmico de páramo: hace demasiado frío ' +
      'para esa hortaliza, así que no te lo recomiendo ahí.\n\n' +
      'Para más información, considera consultar con un experto local o con ' +
      'instituciones especializadas como el Centro Nacional de Historia Natural (CNHN) ' +
      'o el Instituto de Investigación Biológica Los Andes Caldwell.';
    const out = guardFabricatedInstitution(llm);
    expect(out.modified).toBe(true);
    // las instituciones fabricadas desaparecen del cuerpo
    expect(out.text).not.toMatch(/CNHN/);
    expect(out.text).not.toMatch(/Historia Natural/i);
    expect(out.text).not.toMatch(/Los Andes Caldwell/i);
    // el agronómico correcto (kale no va en páramo) se conserva
    expect(out.text).toMatch(/no se da en piso térmico de páramo/i);
    // degrada a "sin fuente verificada" + redirige a fuentes reales
    expect(out.text).toMatch(/no te puedo confirmar esa institución como fuente verificada/i);
    expect(out.text).toMatch(/ICA|Agrosavia|UMATA/);
    expect(out.reason).toMatch(/institucion_fabricada/i);
  });

  it('Caso B: suprime la sigla suelta "SERAGRO en tu región"', () => {
    const llm =
      'A 2600 metros de clima frío puedes sembrar papa, arveja o cebolla de rama, que ' +
      'dan cosecha rápido y tienen buen mercado.\n\n' +
      'Para acompañamiento técnico, puedes consultar con entidades de apoyo como ' +
      'SERAGRO en tu región.';
    const out = guardFabricatedInstitution(llm);
    expect(out.modified).toBe(true);
    expect(out.text).not.toMatch(/SERAGRO/);
    // conserva la recomendación agronómica útil
    expect(out.text).toMatch(/papa, arveja o cebolla/i);
    expect(out.text).toMatch(/no te puedo confirmar esa institución como fuente verificada/i);
    expect(out.reason).toMatch(/SERAGRO/);
  });

  it('Caso CATI: suprime la sigla + el centro fabricado que la deletrea', () => {
    const llm =
      'Sobre la semilla de maíz, te recomiendo consultar con CATI (Centro Nacional de ' +
      'Investigación de Maíz y Tubérculos) para conseguir material certificado.';
    const out = guardFabricatedInstitution(llm);
    expect(out.modified).toBe(true);
    expect(out.text).not.toMatch(/CATI/);
    expect(out.text).not.toMatch(/Maíz y Tubérculos/i);
    expect(out.text).toMatch(/no te puedo confirmar esa institución como fuente verificada/i);
  });

  it('idempotente: no re-dispara sobre su propio reemplazo', () => {
    const llm =
      'Consulta con instituciones especializadas como el Instituto Fantasma de Agronomía Tropical Andina.';
    const once = guardFabricatedInstitution(llm);
    expect(once.modified).toBe(true);
    const twice = guardFabricatedInstitution(once.text);
    expect(twice.modified).toBe(false);
    expect(twice.text).toBe(once.text);
  });
});

describe('guardFabricatedInstitution — anti-FP: instituciones REALES no se tocan', () => {
  const realCases = [
    ['ICA + Agrosavia',
     'Para el manejo de esa plaga cuarentenaria, consulta con el Instituto Colombiano Agropecuario (ICA) o con Agrosavia.'],
    ['UMATA + ICA + Cenicafé + Corpoica',
     'Verifica el contacto oficial con tu UMATA local o el ICA; también Cenicafé y Corpoica tienen guías de manejo.'],
    ['Universidades reales (Nacional + Caldas)',
     'Según la Universidad Nacional de Colombia y la Universidad de Caldas, el cultivo responde bien al abono orgánico.'],
    ['Corporación Autónoma Regional',
     'Consulta con la Corporación Autónoma Regional de Boyacá (Corpoboyacá) para el permiso de aprovechamiento.'],
    ['Instituto Alexander von Humboldt',
     'Según el Instituto Alexander von Humboldt, esa especie es nativa; verifica también con el IDEAM.'],
    ['Invemar',
     'Para temas de manglar, consulta con el Instituto de Investigaciones Marinas y Costeras (Invemar).'],
    ['Instituto Sinchi + IIAP',
     'El Instituto Amazónico de Investigaciones Científicas Sinchi lo reportó; también puedes consultar el IIAP.'],
    ['Federación Nacional de Cafeteros',
     'Según la Federación Nacional de Cafeteros, esa variedad resiste la roya.'],
    ['SENA',
     'El Servicio Nacional de Aprendizaje (SENA) ofrece cursos de agroecología; también consulta el ICA.'],
    // Regresión: sigla REAL en MAYÚSCULAS con tilde no debe fragmentarse por el
    // word-boundary ASCII ("CENICAFÉ" ≠ "CENICAF").
    ['CENICAFÉ en mayúsculas con tilde',
     'Para el café usa variedades resistentes (Castillo) y caldo bordelés según CENICAFÉ.'],
    ['ICA / AGROSAVIA en mayúsculas',
     'Consulta con el ICA y con AGROSAVIA para el registro del predio.'],
  ];
  for (const [name, txt] of realCases) {
    it(`no toca: ${name}`, () => {
      const out = guardFabricatedInstitution(txt);
      expect(out.modified).toBe(false);
      expect(out.text).toBe(txt);
    });
  }
});

describe('guardFabricatedInstitution — anti-FP: no-institución', () => {
  it('instalación genérica (Centro de Acopio) no es autoridad fabricada', () => {
    const out = guardFabricatedInstitution(
      'Consulta el precio y lleva tu cosecha al Centro de Acopio Municipal para venderla mejor.',
    );
    expect(out.modified).toBe(false);
  });

  it('sin cue de autoridad/fuente no dispara', () => {
    const out = guardFabricatedInstitution(
      'El maíz necesita buen sol y riego parejo; un abono balanceado ayuda al crecimiento.',
    );
    expect(out.modified).toBe(false);
  });

  it('siglas no-institución (NPK / MIP) en contexto de consejo no disparan', () => {
    const out = guardFabricatedInstitution(
      'Te recomiendo un plan MIP y una fertilización NPK equilibrada según el análisis de suelo.',
    );
    expect(out.modified).toBe(false);
  });

  it('sistema de precios REAL sin marco institucional (SIPSA/DANE) no dispara', () => {
    const out = guardFabricatedInstitution(
      'No tengo el precio del bulto de papa; consulta SIPSA/DANE o la central de abastos.',
    );
    expect(out.modified).toBe(false);
  });

  it('sigla de fertilizante/insumo introducida con conector (de DAP) no dispara', () => {
    const out = guardFabricatedInstitution(
      'Para arrancar, puedes aplicar una mezcla de DAP según el análisis de suelo que te recomiendo hacer.',
    );
    expect(out.modified).toBe(false);
  });

  it('SÍ dispara con una sigla fabricada ENMARCADA como entidad ("entidad de apoyo como XYZAG")', () => {
    const out = guardFabricatedInstitution(
      'Consulta con la entidad de apoyo como XYZAG para más datos técnicos.',
    );
    expect(out.modified).toBe(true);
    expect(out.text).not.toMatch(/XYZAG/);
  });

  it('mensaje vacío / no-string → no-op', () => {
    expect(guardFabricatedInstitution('').modified).toBe(false);
    expect(guardFabricatedInstitution(null).modified).toBe(false);
    expect(guardFabricatedInstitution(undefined).modified).toBe(false);
  });
});

describe('guardFabricatedInstitution — cableado en applyOutputGuards', () => {
  it('applyOutputGuards suprime la institución fabricada del Caso A', () => {
    const llm =
      'El kale no se da en páramo por el frío.\n\n' +
      'Para más información, considera consultar con instituciones especializadas como ' +
      'el Centro Nacional de Historia Natural (CNHN).';
    const res = applyOutputGuards(llm, { userMessage: '¿puedo sembrar kale en páramo?' });
    expect(res.modified).toBe(true);
    expect(res.text).not.toMatch(/CNHN/);
    expect(res.text).not.toMatch(/Historia Natural/i);
    expect(res.text).toMatch(/no te puedo confirmar esa institución como fuente verificada/i);
    expect(res.reasons.join(' ')).toMatch(/institucion_fabricada/i);
  });

  it('applyOutputGuards NO altera una respuesta que cita fuentes reales', () => {
    const llm =
      'El kale no se da en páramo por el frío. Para orientarte mejor, consulta con el ICA o Agrosavia.';
    const res = applyOutputGuards(llm, { userMessage: '¿puedo sembrar kale en páramo?' });
    expect(res.reasons.join(' ')).not.toMatch(/institucion_fabricada/i);
    expect(res.text).toMatch(/ICA|Agrosavia/);
  });
});
