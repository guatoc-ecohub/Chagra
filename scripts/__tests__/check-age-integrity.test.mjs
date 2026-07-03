import { describe, it, expect } from 'vitest';
import { checkAgeIntegrity, isValidOriginLayer } from '../check-age-integrity.mjs';

describe('isValidOriginLayer', function () {
  it('accepts Co', function () { expect(isValidOriginLayer('Co')).toBe(true); });
  it('accepts NON-Co', function () { expect(isValidOriginLayer('NON-Co')).toBe(true); });
  it('rejects null', function () { expect(isValidOriginLayer(null)).toBe(false); });
  it('rejects random string', function () { expect(isValidOriginLayer('abc')).toBe(false); });
});

function mkNode(id, labels, props) {
  return { id: id, labels: labels || ['Species'], properties: props || {} };
}
function mkEdge(src, tgt, lbl) {
  return { source: src, target: tgt, label: lbl || 'COMPATIBLE_WITH' };
}

describe('checkAgeIntegrity orphans', function () {
  it('detects orphan Species', function () {
    var dump = { nodes: [mkNode('sp_a', ['Species'], { origin_layer: 'Co' }), mkNode('sp_orphan', ['Species'], { origin_layer: 'NON-Co' })], edges: [mkEdge('sp_a', 'sp_other')] };
    var r = checkAgeIntegrity(dump);
    expect(r.stats.orphans).toBeGreaterThanOrEqual(1);
  });
  it('non-Species not reported as orphan', function () {
    var dump = { nodes: [mkNode('bp_a', ['Biopreparado']), mkNode('sp_a', ['Species'], { origin_layer: 'Co' })], edges: [mkEdge('sp_a', 'bp_a')] };
    var r = checkAgeIntegrity(dump);
    expect(r.errors.filter(function (e) { return e.indexOf('Orphan') >= 0; }).length).toBe(0);
  });
});

describe('checkAgeIntegrity edges', function () {
  it('detects invalid source', function () {
    var dump = { nodes: [mkNode('a', ['Species'], { origin_layer: 'Co' })], edges: [mkEdge('x', 'a')] };
    expect(checkAgeIntegrity(dump).stats.invalidEdges).toBeGreaterThanOrEqual(1);
  });
  it('detects invalid target', function () {
    var dump = { nodes: [mkNode('a', ['Species'], { origin_layer: 'Co' })], edges: [mkEdge('a', 'x')] };
    expect(checkAgeIntegrity(dump).stats.invalidEdges).toBeGreaterThanOrEqual(1);
  });
  it('accepts valid edges', function () {
    var dump = { nodes: [mkNode('a', ['Species'], { origin_layer: 'Co' }), mkNode('b', ['Species'], { origin_layer: 'NON-Co' })], edges: [mkEdge('a', 'b')] };
    expect(checkAgeIntegrity(dump).errors).toEqual([]);
  });
});

describe('checkAgeIntegrity origin_layer', function () {
  it('detects invalid origin_layer', function () {
    var dump = { nodes: [mkNode('a', ['Species'], { origin_layer: 'X' }), mkNode('b', ['Species'], { origin_layer: null })], edges: [mkEdge('a', 'b')] };
    expect(checkAgeIntegrity(dump).stats.invalidOriginLayer).toBe(2);
  });
  it('ignores non-Species origin_layer', function () {
    var dump = { nodes: [mkNode('bp', ['Biopreparado'], { origin_layer: 'x' }), mkNode('a', ['Species'], { origin_layer: 'Co' })], edges: [mkEdge('a', 'bp')] };
    expect(checkAgeIntegrity(dump).errors).toEqual([]);
  });
});

describe('checkAgeIntegrity catalog mode', function () {
  it('converts catalog to graph', function () {
    var catalog = { species: [{ id: 'a', nombre_cientifico: 'A a', origin_layer: 'Co', companions: ['b'], antagonists: [] }, { id: 'b', nombre_cientifico: 'B b', origin_layer: 'NON-Co', companions: ['a'], antagonists: [] }] };
    expect(checkAgeIntegrity(catalog, { catalogMode: true }).errors).toEqual([]);
  });
  it('detects missing origin_layer in catalog', function () {
    var catalog = { species: [{ id: 'a', nombre_cientifico: 'A a', companions: [], antagonists: [] }] };
    expect(checkAgeIntegrity(catalog, { catalogMode: true }).stats.invalidOriginLayer).toBe(1);
  });
});

describe('checkAgeIntegrity self-loops', function () {
  it('detects self-loop edge (source === target)', function () {
    var dump = {
      nodes: [
        mkNode('a', ['Species'], { origin_layer: 'Co' }),
        mkNode('b', ['Species'], { origin_layer: 'NON-Co' }),
      ],
      edges: [mkEdge('a', 'a'), mkEdge('a', 'b')],
    };
    var r = checkAgeIntegrity(dump);
    expect(r.stats.selfLoops).toBe(1);
    expect(
      r.errors.filter(function (e) { return e.indexOf('Self-loop') >= 0; }).length
    ).toBe(1);
  });
  it('does not flag normal edges as self-loops', function () {
    var dump = {
      nodes: [
        mkNode('a', ['Species'], { origin_layer: 'Co' }),
        mkNode('b', ['Species'], { origin_layer: 'NON-Co' }),
      ],
      edges: [mkEdge('a', 'b')],
    };
    expect(checkAgeIntegrity(dump).stats.selfLoops).toBe(0);
  });
  it('reports multiple self-loops independently', function () {
    var dump = {
      nodes: [
        mkNode('a', ['Species'], { origin_layer: 'Co' }),
        mkNode('b', ['Species'], { origin_layer: 'NON-Co' }),
      ],
      edges: [mkEdge('a', 'a'), mkEdge('b', 'b')],
    };
    expect(checkAgeIntegrity(dump).stats.selfLoops).toBe(2);
  });
});

describe('checkAgeIntegrity duplicate edges', function () {
  it('detects duplicate edge (same source+target+label)', function () {
    var dump = {
      nodes: [
        mkNode('a', ['Species'], { origin_layer: 'Co' }),
        mkNode('b', ['Species'], { origin_layer: 'NON-Co' }),
      ],
      edges: [mkEdge('a', 'b'), mkEdge('a', 'b')],
    };
    var r = checkAgeIntegrity(dump);
    expect(r.stats.duplicateEdges).toBe(1);
    expect(
      r.errors.filter(function (e) { return e.indexOf('Duplicate') >= 0; }).length
    ).toBe(1);
  });
  it('same source+target but different label is NOT duplicate', function () {
    var dump = {
      nodes: [
        mkNode('a', ['Species'], { origin_layer: 'Co' }),
        mkNode('b', ['Species'], { origin_layer: 'NON-Co' }),
      ],
      edges: [
        mkEdge('a', 'b', 'COMPATIBLE_WITH'),
        mkEdge('a', 'b', 'ANTAGONIST_OF'),
      ],
    };
    expect(checkAgeIntegrity(dump).stats.duplicateEdges).toBe(0);
  });
  it('reversed direction is NOT duplicate', function () {
    var dump = {
      nodes: [
        mkNode('a', ['Species'], { origin_layer: 'Co' }),
        mkNode('b', ['Species'], { origin_layer: 'NON-Co' }),
      ],
      edges: [mkEdge('a', 'b'), mkEdge('b', 'a')],
    };
    expect(checkAgeIntegrity(dump).stats.duplicateEdges).toBe(0);
  });
  it('does not flag a single edge as duplicate', function () {
    var dump = {
      nodes: [
        mkNode('a', ['Species'], { origin_layer: 'Co' }),
        mkNode('b', ['Species'], { origin_layer: 'NON-Co' }),
      ],
      edges: [mkEdge('a', 'b')],
    };
    expect(checkAgeIntegrity(dump).stats.duplicateEdges).toBe(0);
  });
});

describe('checkAgeIntegrity empty', function () {
  it('empty graph is valid', function () {
    expect(checkAgeIntegrity({ nodes: [], edges: [] }).errors).toEqual([]);
  });
  it('empty graph reports zero selfLoops and duplicateEdges', function () {
    var r = checkAgeIntegrity({ nodes: [], edges: [] });
    expect(r.stats.selfLoops).toBe(0);
    expect(r.stats.duplicateEdges).toBe(0);
  });
});
