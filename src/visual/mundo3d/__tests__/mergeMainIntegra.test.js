import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

function leer(ruta) {
  return readFileSync(resolve(repoRoot, ruta), 'utf8');
}

describe('integracion de las escenas 3D con rendimiento adaptativo', () => {
  it('conserva el director del valle y el monitor de rendimiento', () => {
    const fuente = leer('src/mockups/valle/Valle3D.jsx');

    expect(fuente).toContain("import DirectorValle from './DirectorValle.jsx'");
    expect(fuente).toContain('useTierPerformance');
    expect(fuente).toContain('<DirectorValle');
    expect(fuente).toContain('<MonitorRendimiento key={tier} tier={tier} />');
    expect(fuente).toContain('tier={tierInicial}');
  });

  it('conserva estrellas, ciclo diurno y monitor en la escena base', () => {
    const fuente = leer('src/visual/mundo3d/escenas/EscenaBase3D.jsx');

    expect(fuente).toContain("import { Html, OrbitControls, Stars } from '@react-three/drei'");
    expect(fuente).toContain("import useCicloDia from '../useCicloDia.js'");
    expect(fuente).toContain('<Stars');
    expect(fuente).toContain('<MonitorRendimiento key={tierInicial} tier={tierInicial} />');
    expect(fuente).toContain('const dpr = presupuestoInicial.dpr');
  });

  it('usa el grafo enriquecido mas reciente y completo', () => {
    const grafo = JSON.parse(leer('public/grafo-relations.json'));

    expect(grafo._meta.generated_at).toBe('2026-07-18T17:39:54.298Z');
    expect(grafo._meta.species_count).toBe(550);
    expect(grafo._meta.relation_count).toBe(4708);
    expect(grafo._meta.relations_exported).toContain('pisos_termicos');
    expect(Object.keys(grafo.species)).toHaveLength(550);
  });
});
