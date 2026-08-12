import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const cosechaTool = {
  name: 'registrar_cosecha',
  description: 'Registrar una cosecha de un cultivo',
  parameters: {
    type: 'object',
    properties: {
      cantidad: { type: 'number', description: 'cantidad numérica cosechada' },
      unidad: { type: 'string', description: 'unidad de la cantidad' },
      cultivo: { type: 'string', description: 'cultivo cosechado' },
    },
    required: ['cantidad', 'unidad', 'cultivo'],
  },
};

const plagaTool = {
  name: 'consultar_control_plaga',
  description: 'Consultar qué biopreparado controla una plaga',
  parameters: {
    type: 'object',
    properties: { plaga: { type: 'string', description: 'nombre de la plaga' } },
    required: ['plaga'],
  },
};

const harvests = [
  ['registrá 3 kilos de tomate', 3, 'kilos', 'tomate'],
  ['anotá que saqué 5 kg de tomate', 5, 'kg', 'tomate'],
  ['guardá una cosecha de 2 arrobas de fríjol', 2, 'arrobas', 'fríjol'],
  ['registrar 7 bultos de maíz cosechados', 7, 'bultos', 'maíz'],
  ['apuntá 4 kilos de papa', 4, 'kilos', 'papa'],
  ['coseché 6 kg de lechuga', 6, 'kg', 'lechuga'],
  ['anota 8 kilos de zanahoria', 8, 'kilos', 'zanahoria'],
  ['registra 1 arroba de arveja', 1, 'arroba', 'arveja'],
  ['hoy recogí 9 kilos de cebolla', 9, 'kilos', 'cebolla'],
  ['guardá 3 bultos de yuca', 3, 'bultos', 'yuca'],
  ['registrá dos kilos de tomate', 2, 'kilos', 'tomate'],
  ['anotá diez kilos de fríjol', 10, 'kilos', 'fríjol'],
  ['cosecha registrada: 4 kg de maíz', 4, 'kg', 'maíz'],
  ['por favor guarda 5 kilos de papa cosechada', 5, 'kilos', 'papa'],
  ['quiero registrar 3 arrobas de yuca', 3, 'arrobas', 'yuca'],
  ['apunta que salieron 6 kilos de lechuga', 6, 'kilos', 'lechuga'],
  ['registra la cosecha de 7 kg de zanahoria', 7, 'kg', 'zanahoria'],
  ['hoy fueron 2 bultos de cebolla', 2, 'bultos', 'cebolla'],
  ['anota una cosecha de 8 kilos de arveja', 8, 'kilos', 'arveja'],
  ['guardá 9 kg de tomate en la cosecha', 9, 'kg', 'tomate'],
  ['registrá 1 kilo de ají cosechado', 1, 'kilo', 'ají'],
  ['coseché 2 bultos de fríjol, anótalo', 2, 'bultos', 'fríjol'],
  ['apunta 3 arrobas de maíz recogidas', 3, 'arrobas', 'maíz'],
  ['registra 4 kilos de pepino', 4, 'kilos', 'pepino'],
  ['anota que coseché 5 kg de gulupa', 5, 'kg', 'gulupa'],
];

const pests = [
  ['qué biopreparado sirve para la mosca blanca', 'mosca blanca'],
  ['cómo controlo la mosca blanca', 'mosca blanca'],
  ['qué le echo a la mosca blanca', 'mosca blanca'],
  ['consultá el control para el pulgón del tomate', 'pulgón del tomate'],
  ['qué biopreparado controla el pulgón', 'pulgón'],
  ['tengo trips, qué control biológico hay', 'trips'],
  ['qué hago para los trips', 'trips'],
  ['cómo manejo el minador de la hoja', 'minador de la hoja'],
  ['qué preparado sirve contra el minador', 'minador'],
  ['qué control hay para el gusano cogollero', 'gusano cogollero'],
  ['recomendame un biopreparado para el cogollero', 'cogollero'],
  ['qué usar contra la broca', 'broca'],
  ['consultá el biopreparado para la cochinilla', 'cochinilla'],
  ['cómo controlar la cochinilla', 'cochinilla'],
  ['qué control biológico sirve para la araña roja', 'araña roja'],
  ['qué le aplico a la arañita roja', 'araña roja'],
  ['qué biopreparado controla el mildiu', 'mildiu'],
  ['cómo manejo el mildiu en el cultivo', 'mildiu'],
  ['qué control hay para la roya', 'roya'],
  ['qué preparado sirve para la roya', 'roya'],
  ['consultá el control de la mosca del ovario', 'mosca del ovario'],
  ['qué biopreparado uso para la mosca del ovario', 'mosca del ovario'],
  ['tengo pulgón, dime qué biopreparado lo controla', 'pulgón'],
  ['qué hago con la plaga de mosca blanca', 'mosca blanca'],
  ['ayúdame con un control para el minador', 'minador'],
];

const lines = [
  ...harvests.map(([query, cantidad, unidad, cultivo]) => JSON.stringify({
    query,
    tools: [cosechaTool],
    answers: [{ name: cosechaTool.name, arguments: { cantidad, unidad, cultivo } }],
  })),
  ...pests.map(([query, plaga]) => JSON.stringify({
    query,
    tools: [plagaTool],
    answers: [{ name: plagaTool.name, arguments: { plaga } }],
  })),
];

const output = resolve(dirname(fileURLToPath(import.meta.url)), 'lora-50.jsonl');
await writeFile(output, `${lines.join('\n')}\n`, 'utf8');
console.log(`wrote ${lines.length} examples to ${output}`);
