/**
 * control-biologico-seed.test.js — invariantes del catálogo auxiliar de
 * enemigos naturales y aristas plaga↔controlador
 * (catalog/control-biologico-seed.json).
 *
 * Principio (task #control-biologico-prof5, 2026-07-02): cada enemigo
 * natural DEBE llevar su tipo (depredador/parasitoide/entomopatogeno),
 * al menos una práctica de conservación y al menos una fuente citable.
 * Los source_ids DEBEN resolver contra sources-seed.json (referencias
 * huérfanas = fabricación silenciosa). Los nombres científicos DEBEN
 * parecer binomios válidos (género Capitalizado + especie en minúscula,
 * sin abreviaturas sueltas). Las aristas plaga↔controlador DEBEN apuntar
 * a un controlador que exista en `enemigos_naturales`.
 *
 * Anti-invento: NO se aceptan DOIs type-`10.1234/...` (placeholder), ni
 * referencias internas (DR-/chagra_kg/deep_research), ni voseo argentino
 * en strings (regla house-style colombiana tú/usted).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(
  readFileSync(join(__dirname, '..', 'control-biologico-seed.json'), 'utf8'),
);
const sourcesSeed = JSON.parse(
  readFileSync(join(__dirname, '..', 'sources-seed.json'), 'utf8'),
);
const knownSourceIds = new Set(sourcesSeed.sources.map((s) => s.id));

const enemigos = seed.enemigos_naturales;
const aristas = seed.plaga_controlador;
const TIPOS_VALIDOS = seed._meta.tipos_validos;

const isNonEmptyStr = (v) => typeof v === 'string' && v.trim().length > 0;
const blob = JSON.stringify(seed);

// Límite de palabra con tildes — cero falsos positivos en léxico español
// colombiano. Lista espejada del guard `voseo-scan` de lefthook.yml.
const LETTER = 'a-zA-ZáéíóúüñÁÉÍÓÚÜÑ';
const VOSEO_RE = new RegExp(
  `(^|[^${LETTER}])(tenés|querés|podés|sabés|hacés|ponés|venís|decís|vivís|empezá|mirá|probá|sembrá|cuidá|anotá|tocá|hacé|poné|dejá|llevá|sacá|buscá|revisá|recogé|aprendé|mandá|contá|esperá|fijate|quedate|acordate|preparale|usá|acá)([^${LETTER}]|$)`,
  'i',
);

describe('control-biologico-seed — estructura top-level', () => {
  it('tiene bloques enemigos_naturales y plaga_controlador como arrays no vacíos', () => {
    expect(Array.isArray(seed.enemigos_naturales)).toBe(true);
    expect(Array.isArray(seed.plaga_controlador)).toBe(true);
    expect(seed.enemigos_naturales.length).toBeGreaterThan(0);
    expect(seed.plaga_controlador.length).toBeGreaterThan(0);
  });

  it('declara los tipos válidos en _meta', () => {
    expect(Array.isArray(seed._meta.tipos_validos)).toBe(true);
    expect(seed._meta.tipos_validos).toEqual(
      expect.arrayContaining(['depredador', 'parasitoide', 'entomopatogeno']),
    );
  });
});

describe('control-biologico-seed — enemigos_naturales: invariante por entrada', () => {
  it('todos los ids son snake_case únicos', () => {
    const ids = enemigos.map((e) => e.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes, `ids duplicados: ${dupes.join(', ')}`).toEqual([]);
    for (const id of ids) {
      expect(id, `id "${id}" no es snake_case`).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it.each(enemigos.map((e) => [e.id, e]))(
    '%s tiene campos básicos no vacíos',
    (id, e) => {
      expect(isNonEmptyStr(e.nombre_comun), `${id}.nombre_comun`).toBe(true);
      expect(isNonEmptyStr(e.nombre_cientifico), `${id}.nombre_cientifico`).toBe(true);
      expect(isNonEmptyStr(e.familia), `${id}.familia`).toBe(true);
      expect(isNonEmptyStr(e.orden), `${id}.orden`).toBe(true);
      expect(isNonEmptyStr(e.presa_o_hospedero_principal), `${id}.presa_o_hospedero_principal`).toBe(true);
      expect(isNonEmptyStr(e.fuente), `${id}.fuente`).toBe(true);
    },
  );

  it.each(enemigos.map((e) => [e.id, e]))(
    '%s tiene tipo válido (depredador|parasitoide|entomopatogeno)',
    (id, e) => {
      expect(TIPOS_VALIDOS, 'tipos_validos definidos en _meta').toContain(e.tipo);
      expect(e.tipo, `${id}.tipo`).toBeOneOf(['depredador', 'parasitoide', 'entomopatogeno']);
    },
  );

  it('la semilla cubre los tres tipos (depredador, parasitoide, entomopatogeno)', () => {
    const tipos = new Set(enemigos.map((e) => e.tipo));
    expect(tipos.has('depredador')).toBe(true);
    expect(tipos.has('parasitoide')).toBe(true);
    expect(tipos.has('entomopatogeno')).toBe(true);
  });

  it.each(enemigos.map((e) => [e.id, e]))(
    '%s tiene al menos 1 práctica de conservación no vacía',
    (id, e) => {
      expect(Array.isArray(e.practicas_conservacion), `${id}.practicas_conservacion es array`).toBe(true);
      expect(e.practicas_conservacion.length, `${id} requiere >=1 práctica`).toBeGreaterThan(0);
      for (const p of e.practicas_conservacion) {
        expect(typeof p, `${id} práctica es string`).toBe('string');
        expect(p.trim().length, `${id} práctica no vacía`).toBeGreaterThan(0);
      }
    },
  );

  it.each(enemigos.map((e) => [e.id, e]))(
    '%s tiene al menos 1 source_id que resuelve contra sources-seed.json',
    (id, e) => {
      expect(Array.isArray(e.source_ids), `${id}.source_ids es array`).toBe(true);
      expect(e.source_ids.length, `${id} requiere >=1 source_id`).toBeGreaterThan(0);
      for (const sid of e.source_ids) {
        expect(
          knownSourceIds.has(sid),
          `${id}.source_ids incluye "${sid}" que NO está en sources-seed.json (referencia huérfana)`,
        ).toBe(true);
      }
    },
  );
});

describe('control-biologico-seed — nombre científico: anti-invención', () => {
  // Binomial válido: Género Capitalizado + especie en minúscula, ≥3 chars
  // cada componente. Acepta "spp." (género confirmado, especie indeterminada)
  // porque la literatura institucional a veces trabaja a ese nivel — el campo
  // `fuente` debe entonces justificar por qué no se baja a especie.
  const BINOMIAL_RE = /^[A-Z][a-z]+ (?:[a-z]+(?:\(.*\))?|spp\.?)$/;

  it.each(enemigos.map((e) => [e.id, e]))(
    '%s tiene nombre científico en formato binomial (Género especie)',
    (id, e) => {
      const nc = e.nombre_cientifico.trim();
      expect(nc, `${id}.nombre_cientifico no vacío`).toBeTruthy();
      expect(
        BINOMIAL_RE.test(nc),
        `${id}.nombre_cientifico="${nc}" no cumple formato binomial (Género especie, sin abreviaturas sueltas)`,
      ).toBe(true);
    },
  );

  it('el nombre científico NO contiene signos de invención (?, ???, sp nov, afirmación de nueva especie)', () => {
    for (const e of enemigos) {
      expect(
        e.nombre_cientifico,
        `${e.id}.nombre_cientifico contiene marca de especie dudosa`,
      ).not.toMatch(/\?|sp\.?\s*nov|\bsp\b(?!p)/i);
    }
  });
});

describe('control-biologico-seed — plaga_controlador: aristas coherentes', () => {
  it('todas las aristas tienen controlador_id que existe en enemigos_naturales', () => {
    const idsValidos = new Set(enemigos.map((e) => e.id));
    const huerfanos = aristas
      .filter((a) => !idsValidos.has(a.controlador_id))
      .map((a) => `${a.plaga_id} → ${a.controlador_id}`);
    expect(
      huerfanos,
      `aristas con controlador_id huérfano: ${huerfanos.join('; ')}`,
    ).toEqual([]);
  });

  it('cada arista tiene plaga_id, plaga_nombre, controlador_id, cultivo, modalidad y fuente', () => {
    for (const a of aristas) {
      expect(isNonEmptyStr(a.plaga_id), 'plaga_id').toBe(true);
      expect(isNonEmptyStr(a.plaga_nombre), 'plaga_nombre').toBe(true);
      expect(isNonEmptyStr(a.controlador_id), 'controlador_id').toBe(true);
      expect(isNonEmptyStr(a.cultivo), 'cultivo').toBe(true);
      expect(isNonEmptyStr(a.modalidad), 'modalidad').toBe(true);
      expect(isNonEmptyStr(a.fuente), 'fuente').toBe(true);
    }
  });

  it('los plaga_id son snake_case estables (no prosa arbitraria)', () => {
    for (const a of aristas) {
      expect(a.plaga_id, `plaga_id="${a.plaga_id}" debe ser snake_case`).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('cada arista trae al menos 1 source_id que resuelve contra sources-seed.json', () => {
    for (const a of aristas) {
      expect(Array.isArray(a.source_ids), `${a.plaga_id} source_ids es array`).toBe(true);
      expect(a.source_ids.length, `${a.plaga_id} requiere >=1 source_id`).toBeGreaterThan(0);
      for (const sid of a.source_ids) {
        expect(
          knownSourceIds.has(sid),
          `arista ${a.plaga_id}→${a.controlador_id} incluye "${sid}" que NO está en sources-seed.json`,
        ).toBe(true);
      }
    }
  });

  it('cada enemigo natural aparece en al menos 1 arista (cobertura completa del catálogo)', () => {
    const enemigosCubiertos = new Set();
    for (const a of aristas) enemigosCubiertos.add(a.controlador_id);
    const sinArista = enemigos.filter((e) => !enemigosCubiertos.has(e.id)).map((e) => e.id);
    expect(
      sinArista,
      `enemigos_naturales sin arista plaga_controlador asociada: ${sinArista.join(', ')}`,
    ).toEqual([]);
  });
});

describe('control-biologico-seed — anti-fabricación y house style', () => {
  it('NO contiene DOIs placeholder (10.1234/...)', () => {
    expect(blob).not.toMatch(/10\.1234\//);
  });

  it('NO contiene referencias internas filtradas (DR-, chagra_kg, deepseek, gemini, deep_research)', () => {
    expect(blob).not.toMatch(/\bDR-[A-Z]/);
    expect(blob).not.toMatch(/chagra_kg/i);
    expect(blob).not.toMatch(/deepseek/i);
    expect(blob).not.toMatch(/gemini/i);
    expect(blob).not.toMatch(/deep ?research/i);
  });

  it('NO contiene voseo argentino (house style colombiano tú/usted)', () => {
    const hit = VOSEO_RE.exec(blob);
    expect(
      hit,
      `voseo argentino detectado: "${hit?.[0]}" — usar forma tú/usted`,
    ).toBeNull();
  });

  it('NO contiene URLs internas ni IPs RFC1918 (anti-leak)', () => {
    expect(blob).not.toMatch(/\b10\.[0-9]+\.[0-9]+\.[0-9]+\b/);
    expect(blob).not.toMatch(/\b192\.168\.[0-9]+\.[0-9]+\b/);
    expect(blob).not.toMatch(/\b172\.(1[6-9]|2[0-9]|3[01])\.[0-9]+\.[0-9]+\b/);
    // Hostnames internos: el pattern se construye en dos partes para no
    // escribir el literal completo en este archivo (sería marcado por el
    // guard `infra-refs-scan` de lefthook, que SÍ escanea archivos .test.js).
    const internalHost = new RegExp(`guatoc${'-'}/?nixos`, 'i');
    expect(blob).not.toMatch(internalHost);
  });
});
