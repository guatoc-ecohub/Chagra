#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function die(code, msg) {
  console.error(msg);
  process.exit(code);
}

function ok(msg) { console.log('OK ' + msg); }

export function isValidOriginLayer(layer) {
  if (layer === null || layer === undefined) return false;
  return layer === 'Co' || layer === 'NON-Co';
}

export function checkAgeIntegrity(data, opts) {
  opts = opts || {};
  const errors = [];
  const stats = {
    nodes: 0,
    edges: 0,
    orphans: 0,
    invalidEdges: 0,
    invalidOriginLayer: 0,
    selfLoops: 0,
    duplicateEdges: 0,
  };

  let nodes;
  let edges;

  if (opts.catalogMode || data.species) {
    const g = catalogToGraph(data);
    nodes = g.nodes;
    edges = g.edges;
  } else {
    nodes = data.nodes || [];
    edges = data.edges || [];
  }

  stats.nodes = nodes.length;
  stats.edges = edges.length;

  const nodeIds = new Set(nodes.map(function (n) { return n.id; }));

  const connectedNodes = new Set();
  for (const edge of edges) {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  }

  for (const node of nodes) {
    const labels = node.labels || [];
    if (labels.includes('Species') && !connectedNodes.has(node.id)) {
      errors.push('Orphan node: Species ' + node.id);
      stats.orphans++;
    }
  }

  const seenEdgeKeys = new Set();
  for (const edge of edges) {
    if (edge.source === edge.target) {
      errors.push(
        'Self-loop edge: ' + edge.source + ' -> ' + edge.target +
        ' (' + (edge.label || 'UNKNOWN') + ')'
      );
      stats.selfLoops++;
    }

    const edgeKey = edge.source + '|' + edge.target + '|' + (edge.label || '');
    if (seenEdgeKeys.has(edgeKey)) {
      errors.push(
        'Duplicate edge: ' + edge.source + ' -> ' + edge.target +
        ' (' + (edge.label || 'UNKNOWN') + ')'
      );
      stats.duplicateEdges++;
    } else {
      seenEdgeKeys.add(edgeKey);
    }

    if (!nodeIds.has(edge.source)) {
      errors.push('Invalid edge source: ' + edge.source);
      stats.invalidEdges++;
    }
    if (!nodeIds.has(edge.target)) {
      errors.push('Invalid edge target: ' + edge.target);
      stats.invalidEdges++;
    }
  }

  for (const node of nodes) {
    const labels = node.labels || [];
    if (!labels.includes('Species')) continue;
    const props = node.properties || {};
    const layer = props.origin_layer;
    if (!isValidOriginLayer(layer)) {
      errors.push('Invalid origin_layer ' + layer + ' in ' + node.id);
      stats.invalidOriginLayer++;
    }
  }

  return { errors: errors, stats: stats };
}

function catalogToGraph(catalog) {
  const nodes = [];
  const edges = [];

  for (const sp of catalog.species || []) {
    nodes.push({
      id: sp.id,
      labels: ['Species'],
      properties: {
        nombre_comun: sp.nombre_comun,
        nombre_cientifico: sp.nombre_cientifico,
        origin_layer: sp.origin_layer,
      },
    });

    for (const coId of sp.companions || []) {
      edges.push({ source: sp.id, target: coId, label: 'COMPATIBLE_WITH' });
    }

    for (const anId of sp.antagonists || []) {
      edges.push({ source: sp.id, target: anId, label: 'ANTAGONIST_OF' });
    }
  }

  return { nodes: nodes, edges: edges };
}

const IS_CLI = import.meta.url === 'file://' + process.argv[1];

if (IS_CLI) {
  const args = process.argv.slice(2);
  const CATALOG_MODE = args.includes('--catalog-mode');

  const dp = args.filter(function (a) { return !a.startsWith('--'); })[0];
  if (!dp) {
    console.log('Usage: node scripts/check-age-integrity.mjs <dump.json>');
    process.exit(0);
  }

  const ap = resolve(dp);
  if (!existsSync(ap)) die(4, 'File not found: ' + ap);

  let data;
  try {
    data = JSON.parse(readFileSync(ap, 'utf8'));
  } catch (e) {
    die(4, 'Invalid JSON: ' + e.message);
  }

  const mode = CATALOG_MODE || !!data.species;
  const result = checkAgeIntegrity(data, { catalogMode: mode });

  console.log('Nodes: ' + result.stats.nodes + ' Edges: ' + result.stats.edges);

  if (result.errors.length) {
    for (const e of result.errors) console.error('FAIL: ' + e);
    die(1, result.errors.length + ' errors');
  }

  ok('Integro');
  process.exit(0);
}
