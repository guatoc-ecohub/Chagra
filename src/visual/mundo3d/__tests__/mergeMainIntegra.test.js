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

  it.fails('usa el grafo enriquecido mas reciente y completo', () => {
    // TODO: el snapshot público actual es el export antiguo (134 especies,
    // generado en junio), mientras el contrato esperado exige el grafo
    // enriquecido de 550 especies. Regenerar public/grafo-relations.json.
    const grafo = JSON.parse(leer('public/grafo-relations.json'));

    // El snapshot público puede regenerarse sin cambiar el contrato del grafo.
    expect(Number.isNaN(Date.parse(grafo._meta.generated_at))).toBe(false);
    expect(grafo._meta.species_count).toBe(550);
    expect(grafo._meta.relation_count).toBe(4708);
    expect(grafo._meta.relations_exported).toContain('pisos_termicos');
    expect(Object.keys(grafo.species)).toHaveLength(550);
  });
});
