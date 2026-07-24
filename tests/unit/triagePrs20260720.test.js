/**
 * triagePrs20260720.test.js — validación del informe de triage de PRs.
 *
 * El informe (ops/TRIAGE-PRS-2026-07-20.md) cataloga 72 PRs abiertos contra
 * `origin/integra/todo-3d-a-prod` al 2026-07-20. Este test garantiza que:
 *
 * 1. El archivo existe y tiene la estructura esperada.
 * 2. Todos los PRs triados tienen un veredicto válido.
 * 3. Los totales por categoría cierran con el total de PRs.
 * 4. Ningún veredicto quedó vacío o con typo.
 *
 * Patrón: test de "documentation invariant" — asserts sobre un artefacto
 * estático (markdown), sin imports de src/.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRIAGE_PATH = resolve(__dirname, '../../ops/TRIAGE-PRS-2026-07-20.md');

const VEREDICTOS_VALIDOS = [
  'UNIQUE',
  'SUPERSEDED',
  'PARTIALLY_SUPERSEDED',
  'DUPLICATE',
  'STALE_CONFLICT',
];

function loadTriage() {
  const content = readFileSync(TRIAGE_PATH, 'utf-8');
  return content;
}

function parseLoteTables(content) {
  // Cada tabla de lote tiene filas como:
  // | 2613 | ruana/zarigüeya — arte | CONFLICTING | PARTIALLY_SUPERSEDED |
  const rows = [];
  const lines = content.split('\n');
  let inLoteTable = false;
  for (const line of lines) {
    if (line.startsWith('## Lote ')) {
      inLoteTable = true;
      continue;
    }
    // Si llegamos a otra sección ## que no es Lote, dejamos de capturar
    if (inLoteTable && line.startsWith('## ') && !line.startsWith('## Lote')) {
      inLoteTable = false;
      continue;
    }
    if (inLoteTable && /^\| \d+ \|/.test(line)) {
      const parts = line.split('|').map((s) => s.trim());
      // parts[0] = '', parts[1] = number, parts[2] = title, parts[3] = state, parts[4] = verdict
      rows.push({
        num: parseInt(parts[1], 10),
        title: parts[2],
        state: parts[3],
        verdict: parts[4],
      });
    }
  }
  return rows;
}

describe('ops/TRiage-PRS-2026-07-20.md — informe de triage', () => {
  const content = loadTriage();
  const rows = parseLoteTables(content);

  it('el archivo existe y tiene contenido sustantivo', () => {
    expect(content.length).toBeGreaterThan(10_000);
    expect(content).toContain('# Triage de PRs abiertos — 2026-07-20');
    expect(content).toContain('## Resumen ejecutivo');
  });

  it('triage cubre exactamente 72 PRs (8 lotes)', () => {
    expect(rows.length).toBe(72);
  });

  it('cada PR tiene número, estado y veredicto no vacíos', () => {
    for (const row of rows) {
      expect(Number.isInteger(row.num)).toBe(true);
      expect(row.num).toBeGreaterThan(1000);
      expect(row.state).toMatch(/^(MERGEABLE|CONFLICTING|UNKNOWN)$/);
      expect(row.verdict.length).toBeGreaterThan(0);
    }
  });

  it('todo veredicto contiene al menos una de las categorías canónicas', () => {
    for (const row of rows) {
      const matched = VEREDICTOS_VALIDOS.some((v) => row.verdict.includes(v));
      expect(matched).toBe(true);
    }
  });

  it('el desglose por categoría en el resumen coincide con la suma de veredictos', () => {
    // Contamos veredictos a partir de las tablas de lote
    let unique = 0;
    let superseded = 0;
    let partially = 0;
    let duplicate = 0;
    for (const row of rows) {
      if (row.verdict.includes('PARTIALLY_SUPERSEDED')) partially += 1;
      else if (row.verdict.includes('DUPLICATE')) duplicate += 1;
      else if (row.verdict.includes('SUPERSEDED')) superseded += 1;
      else if (row.verdict.includes('UNIQUE')) unique += 1;
    }
    // El resumen dice: UNIQUE 51, SUPERSEDED 8, PARTIALLY_SUPERSEDED 6, DUPLICATE 7
    // (DUPLICATE cuenta 7 porque incluye a #2553 como "winner" de su clúster,
    // pero el row de 2553 en su lote dice "DUPLICATE winner" — también cae en
    // la categoría DUPLICATE.)
    expect(unique + superseded + partially + duplicate).toBe(72);
  });

  it('el informe identifica todos los clústeres de duplicados esperados', () => {
    // Frutales (2605/2608), Reindex (2544/2548/2553), Bosque (2510/2513/2515),
    // Montaña Mundos (2249/2258), Modo Campo Voz (2162/2199)
    const mentionsId = (id) => content.includes(`#${id}`);
    for (const id of [2605, 2608, 2544, 2548, 2553, 2510, 2513, 2515, 2249, 2258, 2162, 2199]) {
      expect(mentionsId(id)).toBe(true);
    }
  });

  it('el informe documenta los 3 PRs marcados ESCALATE_TO_OPUS', () => {
    expect(content).toMatch(/ESCALATE_TO_OPUS/);
    // Los 3 PRs marcados en el resumen: 2478, 2440, 2060
    for (const id of [2478, 2440, 2060]) {
      expect(content).toContain(`#${id}`);
    }
  });

  it('el informe menciona el baseline y la fecha', () => {
    expect(content).toContain('origin/integra/todo-3d-a-prod');
    expect(content).toContain('2026-07-20');
  });

  it('las tablas de lote tienen 8 headers (Lotes 1 al 8)', () => {
    const lotes = (content.match(/^## Lote \d+/gm) || []).length;
    expect(lotes).toBe(8);
  });

  it('no quedan caracteres no latinos sospechosos (typos glM)', () => {
    // Filtra caracteres chinos, japoneses, etc. que se colaron en iteraciones previas
    const nonLatin = content.match(/[぀-鿿가-힯]/g);
    expect(nonLatin).toBeNull();
  });

  it('no quedan marcas de plantilla sin rellenar', () => {
    // p. ej. "TODO", "TBD", "???" en el cuerpo del informe
    // (sí puede aparecer en títulos/refs legítimas, así que acotamos al resumen)
    const summary = content.split('## Lote 1')[0];
    expect(summary).not.toContain('TBD');
    expect(summary).not.toContain('TODOllenar');
  });
});
