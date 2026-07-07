/**
 * picudo-grounding.test.js — invariante anti-regresión para el grounding del
 * picudo del algodón (Anthonomus grandis) frente al picudo de los cítricos
 * (Diaprepes abbreviatus). Tarea #gl-picudo-grounding (2026-07-06).
 *
 * Contexto: hole de grounding cazado por el bench Q&A en vivo — al preguntar
 * por el PICUDO, el agente dijo que Anthonomus grandis NO era cuarentenaria Y
 * lo confundió con Diaprepes abbreviatus del catálogo (otra especie distinta).
 * Anthonomus grandis (picudo del algodonero) SÍ es plaga cuarentenaria
 * reglamentada por el ICA en Colombia.
 *
 * Este test bloquea regresiones verificando tres invariantes sobre el
 * snapshot público `catalog/chagra-kg-graph-snapshot.json`:
 *
 *   1. El nodo `anthonomus_grandis` existe, tiene `anti_confusion` que
 *      menciona explícitamente a `Diaprepes abbreviatus` como especie
 *      DISTINTA, y marca `es_cuarentenaria_ica: true` (más mención
 *      textual de "cuarentenaria" en `sintoma_clave` o `anti_confusion`).
 *   2. El nodo `diaprepes_abbreviatus` existe y su `anti_confusion`
 *      menciona explícitamente a `Anthonomus grandis` como especie DISTINTA.
 *   3. Ambos nodos existen como entradas SEPARADAS con ids y nombres
 *      científicos diferentes (no son aliasados el uno al otro).
 *
 * Anti-invento: el test se limita a verificar invariantes del snapshot
 * público; no invoca MCP ni red. Fuentes: ICA (Colombia) — plagas
 * reglamentadas del algodonero (Anthonomus grandis Boheman); Agrosavia —
 * manejo integrado del algodonero; las referencias textuales viven en
 * el campo `fuente` de cada nodo.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const snapshotPath = join(__dirname, '..', 'chagra-kg-graph-snapshot.json');
const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));

const anthonomus = snapshot.nodes.find((n) => n.id === 'anthonomus_grandis');
const diaprepes = snapshot.nodes.find((n) => n.id === 'diaprepes_abbreviatus');

describe('catalog/chagra-kg-graph-snapshot.json — grounding picudo del algodón (#gl-picudo-grounding)', () => {
  it('el nodo anthonomus_grandis existe en el snapshot', () => {
    expect(anthonomus).toBeDefined();
    expect(anthonomus.properties.nombre_cientifico).toBe('Anthonomus grandis');
  });

  it('el nodo diaprepes_abbreviatus existe en el snapshot como especie DISTINTA', () => {
    expect(diaprepes).toBeDefined();
    expect(diaprepes.properties.nombre_cientifico).toBe('Diaprepes abbreviatus');
    // Anti-confusión: jamás deben aliasarse (mismo id o mismo nombre_cientifico).
    expect(diaprepes.id).not.toBe(anthonomus.id);
    expect(diaprepes.properties.nombre_cientifico).not.toBe(anthonomus.properties.nombre_cientifico);
  });

  it('anthonomus_grandis marca es_cuarentenaria_ica=true', () => {
    expect(anthonomus.properties.es_cuarentenaria_ica).toBe(true);
  });

  it('anthonomus_grandis menciona "cuarentenaria" en sintoma_clave, fuente o anti_confusion', () => {
    const text = [
      anthonomus.properties.sintoma_clave,
      anthonomus.properties.anti_confusion,
      anthonomus.properties.fuente,
    ]
      .filter(Boolean)
      .join(' ');
    expect(/cuarentenaria/i.test(text)).toBe(true);
  });

  it('anthonomus_grandis tiene anti_confusion que menciona Diaprepes abbreviatus como especie DISTINTA', () => {
    const ac = anthonomus.properties.anti_confusion;
    expect(ac).toBeTruthy();
    // Debe mencionar al otro picudo (Diaprepes) por nombre científico o por
    // nombre común ("cítricos"), para que el agente no lo confunda.
    expect(/diaprepes/i.test(ac)).toBe(true);
  });

  it('diaprepes_abbreviatus tiene anti_confusion que menciona Anthonomus grandis como especie DISTINTA', () => {
    const ac = diaprepes.properties.anti_confusion;
    expect(ac).toBeTruthy();
    // Debe mencionar al otro picudo (algodonero) por nombre científico o por
    // nombre común ("algodón"), para que el agente no lo confunda.
    const mentionsAnthonomus = /anthonomus/i.test(ac);
    const mentionsAlgodon = /algod[oó]n/i.test(ac);
    expect(mentionsAnthonomus || mentionsAlgodon).toBe(true);
  });

  it('anthonomus_grandis indica explícitamente el cultivo afectado (algodón) para diferenciarlo', () => {
    const text = [
      anthonomus.properties.cultivos_afectados,
      anthonomus.properties.anti_confusion,
      anthonomus.properties.sintoma_clave,
    ]
      .filter(Boolean)
      .join(' ');
    expect(/algod[oó]n/i.test(text)).toBe(true);
  });
});
