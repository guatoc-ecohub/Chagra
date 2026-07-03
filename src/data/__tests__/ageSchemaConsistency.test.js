import { describe, it, expect } from 'vitest';
import climaSchema from '../clima-age-schema.json';
import iotSchema from '../iot-age-schema.json';
import psaSchema from '../psa-age-schema.json';
import restauracionSchema from '../restauracion-age-schema.json';
import socialSchema from '../social-age-schema.json';

/**
 * Integridad referencial de los *-age-schema.json que alimentan la carga
 * del grafo Apache AGE. Cada archivo declara:
 *   { fuente: string, nodos: [{ label, props }], edges: [{ from, to, rel }] }
 *
 * Un edge cuyo from/to no corresponde a un label declarado crea un nodo
 * implicito (sin props) en la carga del grafo — eso es un bug de schema.
 */
const SCHEMAS = [
  { name: 'clima-age-schema.json', schema: climaSchema },
  { name: 'iot-age-schema.json', schema: iotSchema },
  { name: 'psa-age-schema.json', schema: psaSchema },
  { name: 'restauracion-age-schema.json', schema: restauracionSchema },
  { name: 'social-age-schema.json', schema: socialSchema },
];

/**
 * Labels del nucleo agroecologico del grafo, declarados FUERA de estos
 * cinco archivos (ver docs/AGE-SCHEMA.md "Nucleo agroecologico (existente)"
 * y su uso real en scripts/age-queries-example.sql y
 * scripts/snapshot-grafo-crecimiento.mjs). Los edges cross-schema hacia
 * estos labels son intencionales y no cuentan como colgantes.
 */
const CORE_LABELS = new Set(['Species']);

/**
 * HALLAZGO documentado (no ocultar editando el JSON): edges colgantes
 * REALES ya presentes en los datos. `Zona` no esta declarado como nodo
 * en ningun *-age-schema.json ni en el nucleo (docs/AGE-SCHEMA.md solo
 * lo menciona como destino del edge, nunca con props), asi que la carga
 * lo crea implicitamente sin propiedades.
 *
 * Si se corrige el schema, este test exige retirar la entrada de aca
 * (la lista debe reflejar exactamente los colgantes vigentes).
 */
const KNOWN_DANGLING = [
  { file: 'iot-age-schema.json', from: 'Sensor', to: 'Zona', rel: 'MIDE_EN' },
];

/**
 * HALLAZGO documentado (no ocultar editando el JSON): iot-age-schema.json
 * usa la clave `propiedades` en sus nodos, mientras los otros cuatro
 * schemas usan `props`. Cualquier loader que lea `props` de forma uniforme
 * cargara los nodos IoT sin propiedades. Al normalizar el JSON, retirar
 * la entrada de aca (la lista debe reflejar exactamente las desviaciones
 * vigentes).
 */
const KNOWN_PROPS_KEY_DEVIATIONS = {
  'iot-age-schema.json': 'propiedades',
};

function propsKeyFor(name) {
  return KNOWN_PROPS_KEY_DEVIATIONS[name] || 'props';
}

function collectDanglingEdges(name, schema) {
  const declared = new Set(schema.nodos.map((n) => n.label));
  const dangling = [];
  for (const edge of schema.edges) {
    for (const endpoint of [edge.from, edge.to]) {
      if (!declared.has(endpoint) && !CORE_LABELS.has(endpoint)) {
        dangling.push({ file: name, from: edge.from, to: edge.to, rel: edge.rel });
        break;
      }
    }
  }
  return dangling;
}

describe.each(SCHEMAS)('$name — integridad del schema AGE', ({ name, schema }) => {
  it('tiene la forma esperada { nodos: [], edges: [] }', () => {
    expect(Array.isArray(schema.nodos)).toBe(true);
    expect(schema.nodos.length).toBeGreaterThan(0);
    expect(Array.isArray(schema.edges)).toBe(true);
    expect(schema.edges.length).toBeGreaterThan(0);
  });

  it('declara labels de nodo unicos y no vacios', () => {
    const labels = schema.nodos.map((n) => n.label);
    for (const label of labels) {
      expect(typeof label).toBe('string');
      expect(label.trim()).not.toBe('');
    }
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('declara props como array de strings no vacio en cada nodo', () => {
    const key = propsKeyFor(name);
    for (const nodo of schema.nodos) {
      const props = nodo[key];
      expect(Array.isArray(props), `${key} de ${nodo.label} debe ser array`).toBe(true);
      expect(props.length, `${key} de ${nodo.label} no puede ser vacio`).toBeGreaterThan(0);
      for (const prop of props) {
        expect(typeof prop, `prop de ${nodo.label} debe ser string`).toBe('string');
        expect(prop.trim(), `prop de ${nodo.label} no puede ser string vacio`).not.toBe('');
      }
    }
  });

  it('usa exactamente la clave de props registrada (props, o la desviacion documentada)', () => {
    const key = propsKeyFor(name);
    const other = key === 'props' ? 'propiedades' : 'props';
    for (const nodo of schema.nodos) {
      expect(key in nodo, `${nodo.label} debe declarar "${key}"`).toBe(true);
      expect(
        other in nodo,
        `${nodo.label} declara "${other}"; si se normalizo el JSON, actualizar KNOWN_PROPS_KEY_DEVIATIONS`,
      ).toBe(false);
    }
  });

  it('declara rel como string no vacio en cada edge', () => {
    for (const edge of schema.edges) {
      const id = `${edge.from}->${edge.to}`;
      expect(typeof edge.rel, `rel de ${id} debe ser string`).toBe('string');
      expect(edge.rel.trim(), `rel de ${id} no puede ser vacio`).not.toBe('');
    }
  });

  it('no introduce edges colgantes nuevos (from/to sin label declarado)', () => {
    const dangling = collectDanglingEdges(name, schema);
    const known = KNOWN_DANGLING.filter((k) => k.file === name);
    expect(dangling).toEqual(known);
  });
});

describe('KNOWN_DANGLING — lista de hallazgos vigente', () => {
  it('refleja exactamente los edges colgantes reales (retirar entradas al corregir)', () => {
    const actual = SCHEMAS.flatMap(({ name, schema }) => collectDanglingEdges(name, schema));
    expect(actual).toEqual(KNOWN_DANGLING);
  });
});
