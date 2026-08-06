/**
 * bench-rag-retrieve.loader.test.mjs — test del loader del RAG bench.
 *
 * Verifica que el stub de getAllSpecies devuelva las 501 especies del
 * manifest real (no [] como antes del fix #rag-bench-harness-501).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const ROOT_DIR = join(__dirname, '..', '..');
const LOADER_PATH = join(ROOT_DIR, 'scripts', 'bench-rag-retrieve.loader.mjs');
const MANIFEST_PATH = join(ROOT_DIR, 'public', 'cycle-content', 'manifest.json');

describe('bench-rag-retrieve.loader.mjs', () => {
  it('el stub de getAllSpecies debe contener 501 especies (no [])', () => {
    // Leer el contenido del loader
    const loaderContent = readFileSync(LOADER_PATH, 'utf8');

    // Verificar que NO contiene el stub viejo (array vacío)
    expect(loaderContent).not.toContain('getAllSpecies = async () => []');

    // Verificar que contiene el stub nuevo con las 501 especies
    expect(loaderContent).toContain('getAllSpecies = async () => [{id:"');

    // Extraer y contar las especies del stub
    const match = loaderContent.match(/getAllSpecies = async \(\) => (\[.*?\]);/s);
    expect(match).toBeTruthy();

    const stubArray = match[1];
    const speciesCount = (stubArray.match(/\{id:/g) || []).length;

    // Verificar que hay 501 especies
    expect(speciesCount).toBe(501);

    console.log(`\n[loader stub] contiene ${speciesCount} especies ✓`);
  });

  it('el stub debe incluir las especies críticas del task', () => {
    const loaderContent = readFileSync(LOADER_PATH, 'utf8');

    // Verificar que las especies críticas mencionadas en el task están presentes
    const criticalSpecies = [
      'manihot_esculenta', // yuca
      'musa_paradisiaca', // plátano
      'theobroma_cacao', // cacao
      'persea_americana', // aguacate
    ];

    criticalSpecies.forEach((slug) => {
      expect(loaderContent).toContain(`{id:"${slug}"}`);
      console.log(`  ✓ ${slug}`);
    });
  });

  it('el stub debe coincidir con el manifest real', () => {
    const loaderContent = readFileSync(LOADER_PATH, 'utf8');
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

    // Extraer los IDs del stub
    const match = loaderContent.match(/getAllSpecies = async \(\) => (\[.*?\]);/s);
    expect(match).toBeTruthy();

    const stubArray = match[1];
    const stubIds = (stubArray.match(/\{id:"([^"]+)"\}/g) || [])
      .map((m) => m.replace(/\{id:"|"}/g, ''));

    // Verificar que todos los slugs del manifest están en el stub
    const missingFromStub = manifest.slugs.filter((slug) => !stubIds.includes(slug));

    if (missingFromStub.length > 0) {
      console.log(`\n[manifest vs stub] faltan ${missingFromStub.length} slugs en el stub:`);
      missingFromStub.slice(0, 10).forEach((slug) => console.log(`  - ${slug}`));
      if (missingFromStub.length > 10) {
        console.log(`  ... y ${missingFromStub.length - 10} más`);
      }
    }

    expect(missingFromStub).toHaveLength(0);
    expect(stubIds.length).toBe(manifest.slugs.length);

    console.log(`\n[manifest vs stub] stub contiene todos los ${manifest.slugs.length} slugs del manifest ✓`);
  });
});
