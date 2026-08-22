/**
 * Invariantes de consolidación para plagas cuyo ID canónico es el binomio.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const snapshotPath = join(__dirname, '..', 'chagra-kg-graph-snapshot.json');
const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));

function canonicalIdForBinomial(nombreCientifico) {
  return nombreCientifico.toLowerCase().replaceAll(' ', '_');
}

function findBinomialPestDuplicates(nodes) {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  return nodes.flatMap((node) => {
    const scientificName = node.properties?.nombre_cientifico;
    if (!node.labels?.includes('Pest') || !/^[A-Z][a-z-]+ [a-z-]+$/.test(scientificName || '')) {
      return [];
    }

    const canonicalId = canonicalIdForBinomial(scientificName);
    const canonical = byId.get(canonicalId);
    if (
      node.id === canonicalId
      || !node.id.startsWith(`${canonicalId}_`)
      || canonical?.properties?.nombre_cientifico !== scientificName
    ) {
      return [];
    }

    return [{ alias: node.id, canonical: canonicalId }];
  });
}

function relationshipKey(edge) {
  return JSON.stringify([edge.source, edge.target, edge.label, edge.properties]);
}

describe('catalog/chagra-kg-graph-snapshot.json, deduplicación de plagas binomiales', () => {
  it('detecta el patrón binomio más sufijo cuando ambos nodos describen la misma plaga', () => {
    const nodes = [
      {
        id: 'hypothenemus_hampei',
        labels: ['Pest'],
        properties: { nombre_cientifico: 'Hypothenemus hampei' },
      },
      {
        id: 'hypothenemus_hampei_broca',
        labels: ['Pest'],
        properties: { nombre_cientifico: 'Hypothenemus hampei' },
      },
    ];

    expect(findBinomialPestDuplicates(nodes)).toEqual([
      { alias: 'hypothenemus_hampei_broca', canonical: 'hypothenemus_hampei' },
    ]);
  });

  it('no conserva nodos de plaga duplicados por binomio científico', () => {
    expect(findBinomialPestDuplicates(snapshot.nodes)).toEqual([]);
  });

  it('mantiene cada arista de las plagas consolidadas una sola vez', () => {
    const canonicalPests = new Set([
      'bemisia_tabaci',
      'hemileia_vastatrix',
      'hypothenemus_hampei',
      'spodoptera_frugiperda',
    ]);
    const relatedEdges = snapshot.edges.filter(
      (edge) => canonicalPests.has(edge.source) || canonicalPests.has(edge.target),
    );
    const keys = relatedEdges.map(relationshipKey);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('conserva aristas referenciando únicamente nodos existentes', () => {
    const nodeIds = new Set(snapshot.nodes.map((node) => node.id));

    for (const edge of snapshot.edges) {
      expect(nodeIds.has(edge.source), `origen ausente: ${edge.source}`).toBe(true);
      expect(nodeIds.has(edge.target), `destino ausente: ${edge.target}`).toBe(true);
    }
  });
});
