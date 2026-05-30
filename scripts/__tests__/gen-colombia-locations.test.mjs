/**
 * scripts/__tests__/gen-colombia-locations.test.mjs
 *
 * Cobertura unitaria del generador DANE DIVIPOLA (#338). El modulo principal
 * `gen-colombia-locations.mjs` envuelve su CLI en un guard `import.meta.url`,
 * asi que estos tests importan las funciones puras sin disparar la descarga
 * remota ni escritura de archivos.
 *
 * Se prueba: validacion de codigo DIVIPOLA, dedup, consistencia depto<->mpio,
 * parseo de coordenadas con coma decimal, parseo CSV, normalizacion de filas
 * con columnas variantes, title-case, y el merge de altitudes curadas.
 */
import { describe, it, expect } from 'vitest';

import {
  validateDivipola,
  parseCoord,
  parseCsv,
  normalizeRow,
  normalizeName,
  toTitleCase,
  buildDataset,
  altitudesByCode,
} from '../gen-colombia-locations.mjs';

describe('validateDivipola', () => {
  it('acepta un codigo de 5 digitos con prefijo de depto correcto', () => {
    expect(validateDivipola('19022', '19')).toEqual({ ok: true });
    expect(validateDivipola('05001', '05')).toEqual({ ok: true });
  });

  it('rechaza codigo de municipio que no tiene 5 digitos', () => {
    expect(validateDivipola('1902', '19').ok).toBe(false);
    expect(validateDivipola('190222', '19').ok).toBe(false);
    expect(validateDivipola('abcde', '19').ok).toBe(false);
  });

  it('rechaza codigo de departamento mal formado', () => {
    expect(validateDivipola('19022', '1').ok).toBe(false);
    expect(validateDivipola('19022', '190').ok).toBe(false);
  });

  it('rechaza cuando el prefijo del municipio no coincide con el depto', () => {
    const r = validateDivipola('19022', '05');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/no comienza con/);
  });
});

describe('parseCoord', () => {
  it('parsea coma decimal (formato es-CO del DANE)', () => {
    expect(parseCoord('-75,581775')).toBeCloseTo(-75.581775, 5);
    expect(parseCoord('6,246631')).toBeCloseTo(6.246631, 5);
  });

  it('parsea punto decimal estandar', () => {
    expect(parseCoord('-76.85607')).toBeCloseTo(-76.85607, 5);
  });

  it('devuelve null para vacios o no numericos', () => {
    expect(parseCoord('')).toBeNull();
    expect(parseCoord(null)).toBeNull();
    expect(parseCoord(undefined)).toBeNull();
    expect(parseCoord('N/A')).toBeNull();
  });
});

describe('toTitleCase', () => {
  it('pasa MAYUSCULAS DANE a forma legible respetando particulas', () => {
    expect(toTitleCase('VALLE DEL CAUCA')).toBe('Valle del Cauca');
    expect(toTitleCase('SAN JUAN DEL CESAR')).toBe('San Juan del Cesar');
    expect(toTitleCase('EL CARMEN DE BOLIVAR')).toBe('El Carmen de Bolivar');
  });

  it('preserva siglas con punto en mayuscula', () => {
    expect(toTitleCase('BOGOTA, D.C.')).toContain('D.C.');
  });
});

describe('normalizeName', () => {
  it('quita tildes y normaliza espacios/caso', () => {
    expect(normalizeName('Popayán')).toBe('popayan');
    expect(normalizeName('  EL  COLEGIO ')).toBe('el colegio');
  });
});

describe('parseCsv', () => {
  it('parsea headers + filas con campos entre comillas', () => {
    const csv = [
      'cod_dpto,dpto,cod_mpio,nom_mpio,latitud,longitud',
      '19,CAUCA,19001,"POPAYAN","2,4448","-76,6147"',
    ].join('\n');
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].cod_mpio).toBe('19001');
    expect(rows[0].nom_mpio).toBe('POPAYAN');
  });
});

describe('normalizeRow', () => {
  it('mapea el shape Socrata estandar (gdxc-w37w)', () => {
    const r = normalizeRow({
      cod_dpto: '19',
      dpto: 'CAUCA',
      cod_mpio: '19001',
      nom_mpio: 'POPAYAN',
      latitud: '2,4448',
      longitud: '-76,6147',
    });
    expect(r.codDpto).toBe('19');
    expect(r.codMpio).toBe('19001');
    expect(r.lat).toBeCloseTo(2.4448, 4);
    expect(r.lng).toBeCloseTo(-76.6147, 4);
  });

  it('pad-izquierda codigos numericos cortos (depto 5 -> 05)', () => {
    const r = normalizeRow({
      cod_dpto: 5,
      dpto: 'ANTIOQUIA',
      cod_mpio: 5001,
      nom_mpio: 'MEDELLIN',
    });
    expect(r.codDpto).toBe('05');
    expect(r.codMpio).toBe('05001');
  });

  it('tolera nombres de columna variantes (geoportal DANE)', () => {
    const r = normalizeRow({
      dpto_ccdgo: '19',
      dpto_cnmbr: 'CAUCA',
      mpio_cdpmp: '19001',
      mpio_cnmbr: 'POPAYAN',
    });
    expect(r.codMpio).toBe('19001');
    expect(r.nomMpio).toBe('POPAYAN');
  });

  it('devuelve null si faltan campos minimos', () => {
    expect(normalizeRow({ foo: 'bar' })).toBeNull();
  });
});

describe('buildDataset', () => {
  const rows = [
    { cod_dpto: '19', dpto: 'CAUCA', cod_mpio: '19001', nom_mpio: 'POPAYAN', latitud: '2,4448', longitud: '-76,6147' },
    { cod_dpto: '19', dpto: 'CAUCA', cod_mpio: '19743', nom_mpio: 'SILVIA', latitud: '2,6122', longitud: '-76,3814' },
    { cod_dpto: '05', dpto: 'ANTIOQUIA', cod_mpio: '05001', nom_mpio: 'MEDELLIN', latitud: '6,2466', longitud: '-75,5817' },
  ];

  it('agrupa por departamento y ordena alfabeticamente', () => {
    const { data, stats, errors } = buildDataset(rows);
    expect(errors).toEqual([]);
    expect(stats.departamentos).toBe(2);
    expect(stats.municipios).toBe(3);
    // Antioquia antes que Cauca (orden es).
    expect(Object.keys(data)).toEqual(['Antioquia', 'Cauca']);
    expect(data.Cauca.codigo).toBe('19');
    expect(data.Cauca.municipios.map((m) => m.name)).toEqual(['Popayan', 'Silvia']);
    expect(data.Cauca.municipios[0].codigo).toBe('19001');
  });

  it('detecta municipios duplicados como error', () => {
    const dup = [...rows, { cod_dpto: '19', dpto: 'CAUCA', cod_mpio: '19001', nom_mpio: 'POPAYAN' }];
    const { errors } = buildDataset(dup);
    expect(errors.some((e) => /duplicado/.test(e))).toBe(true);
  });

  it('rechaza DIVIPOLA inconsistente con su departamento', () => {
    const bad = [{ cod_dpto: '19', dpto: 'CAUCA', cod_mpio: '05001', nom_mpio: 'X' }];
    const { errors } = buildDataset(bad);
    expect(errors.some((e) => /no comienza con/.test(e))).toBe(true);
  });

  it('marca coordenadas fuera del bounding box de Colombia', () => {
    const oob = [{ cod_dpto: '19', dpto: 'CAUCA', cod_mpio: '19001', nom_mpio: 'X', latitud: '40,0', longitud: '-76,0' }];
    const { errors } = buildDataset(oob);
    expect(errors.some((e) => /fuera de Colombia/.test(e))).toBe(true);
  });

  it('mergea altitudes curadas por codigo de depto + nombre normalizado', () => {
    const altitudes = { '19': { popayan: 1737 } };
    const { data, stats } = buildDataset(rows, { altitudes });
    const popayan = data.Cauca.municipios.find((m) => m.name === 'Popayan');
    expect(popayan.altitud).toBe(1737);
    const silvia = data.Cauca.municipios.find((m) => m.name === 'Silvia');
    expect(silvia.altitud).toBeNull();
    expect(stats.conAltitudCurada).toBe(1);
    expect(stats.sinAltitud).toBe(2);
  });
});

describe('altitudesByCode', () => {
  it('reindexa altitudes de nombre-de-depto a codigo-de-depto', () => {
    const byName = { cauca: { popayan: 1737 } };
    const rows = [{ cod_dpto: '19', dpto: 'CAUCA', cod_mpio: '19001', nom_mpio: 'POPAYAN' }];
    const byCode = altitudesByCode(byName, rows);
    expect(byCode['19']).toEqual({ popayan: 1737 });
  });
});
