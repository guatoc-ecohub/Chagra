import { describe, expect, it } from 'vitest';

import { applyOutputGuards, guardThermalViability } from '../outputGuards';

const BAD_RESPONSE =
  'Sin foto es dificil saberlo. Los huecos pueden ser pulgones o mosca blanca que extraen jugo. ' +
  'La melaza puede deberse a babosas u orugas. Dato verificado: la broca del cafe se controla con trampas. ' +
  'Alerta para tomate cherry Sungold y tomate uvalina: se estresan por encima de 22 C aunque el pronostico llegue a 22 C.';

const CASES = [
  {
    name: 'tomate de arbol chamuscado y fresa con huecos en invernadero',
    userMessage:
      'En el invernadero templado, el tomate de arbol tiene hojas chamuscadas y la fresa amanecio con huecos. Que hago?',
    expectsScorch: true,
    expectsChewing: true,
    expectsSucking: false,
  },
  {
    name: 'pimenton mordido y lechuga con melaza',
    userMessage:
      'Tengo pimenton con hojas mordidas y lechuga amarilla con melaza bajo cubierta. Que reviso primero?',
    expectsScorch: false,
    expectsChewing: true,
    expectsSucking: true,
  },
  {
    name: 'pepino perforado y frijol con fumagina',
    userMessage:
      'El pepino del invernadero tiene hojas perforadas y el frijol esta amarillo, pegajoso y con fumagina.',
    expectsScorch: false,
    expectsChewing: true,
    expectsSucking: true,
  },
  {
    name: 'fresa mordida y tomate de arbol con necrosis marginal',
    userMessage:
      'La fresa tiene bordes mordidos y el tomate de palo presenta necrosis marginal dentro del invernadero.',
    expectsScorch: true,
    expectsChewing: true,
    expectsSucking: false,
  },
  {
    name: 'espinaca con melaza y albahaca con agujeros',
    userMessage:
      'La espinaca esta amarilla y con melaza, mientras la albahaca tiene agujeros en las hojas del invernadero.',
    expectsScorch: false,
    expectsChewing: true,
    expectsSucking: true,
  },
];

function paragraphStarting(text, marker) {
  return text.split('\n\n').find((paragraph) => paragraph.startsWith(marker)) || '';
}

function verifyCompletePass(testCase) {
  const result = applyOutputGuards(BAD_RESPONSE, {
    userMessage: testCase.userMessage,
    hadVision: false,
    resolvedEntities: [
      { kind: 'species', nombre_comun: 'Tomate cherry Sungold' },
      { kind: 'species', nombre_comun: 'Tomate uvalina' },
      { kind: 'pest', nombre_comun: 'Broca del cafe' },
    ],
  });

  expect(result.reasons).toEqual(['triaje_sintoma_observable']);
  expect(result.text).not.toMatch(/broca|sungold|uvalina/i);
  expect(result.text).not.toMatch(/sin foto (es|resulta) dificil/i);
  expect(result.text.lastIndexOf('envíe una foto')).toBeGreaterThan(result.text.indexOf('hipótesis más probable'));

  const chewing = paragraphStarting(result.text, 'Para los huecos o mordidas');
  if (testCase.expectsChewing) {
    expect(chewing).toMatch(/masticadores/i);
    expect(chewing).toMatch(/revise|retire/i);
    expect(chewing).not.toMatch(/pulgon|mosca blanca|chupador/i);
  }

  const sucking = paragraphStarting(result.text, 'Para el amarillamiento');
  if (testCase.expectsSucking) {
    expect(sucking).toMatch(/chupadores/i);
    expect(sucking).toMatch(/revise el envés/i);
    expect(sucking).not.toMatch(/masticador|babosa|caracol|oruga|tierrero/i);
  } else {
    expect(sucking).toBe('');
  }

  if (testCase.expectsScorch) {
    expect(result.text).toMatch(/golpe de calor o quemadura de sol/i);
    expect(result.text).toMatch(/ventilación|sombra temporal/i);
    expect(result.text).toMatch(/sales o un desbalance de potasio/i);
  }

  const thermal = guardThermalViability(
    'Le recomiendo sembrar fresa y lechuga.',
    [
      { kind: 'species', nombre_comun: 'fresa', temp_max: 22 },
      { kind: 'species', nombre_comun: 'lechuga', temp_max: 22 },
    ],
    null,
    { forecastTempMax: 22, marginC: 0 },
  );
  expect(thermal.modified).toBe(true);
  expect(thermal.text).toMatch(/se estresa desde ~22°C y el pronóstico sube a 22°C/i);
  expect(thermal.text).not.toMatch(/se estresa por encima de ~22°C y el pronóstico sube a 22°C/i);
}

describe('auditoria de produccion agente 5 bugs v2', () => {
  for (const testCase of CASES) {
    it(`pasada completa: ${testCase.name}`, () => {
      verifyCompletePass(testCase);
    });
  }
});
