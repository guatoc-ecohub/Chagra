#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

function die(code, msg) {
  console.error(msg);
  process.exit(code);
}

function main() {
  const manifestPath = resolve(ROOT, 'public/cycle-content/manifest.json');
  const embeddingsPath = resolve(ROOT, 'public/rag-embeddings.json');

  if (!existsSync(manifestPath)) die(1, `ERROR: no existe ${manifestPath}`);
  if (!existsSync(embeddingsPath)) die(1, `ERROR: no existe ${embeddingsPath}`);

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const embeddings = JSON.parse(readFileSync(embeddingsPath, 'utf-8'));

  const manifestSlugs = new Set(manifest.slugs || []);
  const embeddingSlugs = new Set(Object.keys(embeddings));

  const inManifestNotEmbeddings = [...manifestSlugs].filter(s => !embeddingSlugs.has(s));
  const inEmbeddingsNotManifest = [...embeddingSlugs].filter(s => !manifestSlugs.has(s));

  let exitCode = 0;

  if (inManifestNotEmbeddings.length > 0) {
    console.error(`HUERFANOS EN MANIFEST (sin vector en rag-embeddings): ${inManifestNotEmbeddings.length}`);
    for (const slug of inManifestNotEmbeddings) {
      console.error(`  - ${slug}`);
    }
    exitCode = 1;
  } else {
    console.log(`OK: todos los ${manifestSlugs.size} slugs del manifest tienen vector en rag-embeddings`);
  }

  if (inEmbeddingsNotManifest.length > 0) {
    console.error(`HUERFANOS EN EMBEDDINGS (sin slug en manifest): ${inEmbeddingsNotManifest.length}`);
    for (const slug of inEmbeddingsNotManifest) {
      console.error(`  - ${slug}`);
    }
    exitCode = 1;
  } else {
    console.log(`OK: todos los ${embeddingSlugs.size} vectores de rag-embeddings tienen slug en manifest`);
  }

  process.exit(exitCode);
}

main();
