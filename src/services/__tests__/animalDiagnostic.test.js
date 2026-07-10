import { describe, it, expect } from 'vitest';
// @types/node no está instalado en el repo (gap conocido, ya tolerado en
// citricosFinca.test.js / RestauracionScreen.test.jsx): tsc no resuelve los
// specifiers "node:*". Runtime (vitest/node) sí los resuelve.
// @ts-expect-error TS2591 — ver comentario arriba.
import { readFileSync } from 'node:fs';
// @ts-expect-error TS2591 — ver comentario arriba.
import { fileURLToPath } from 'node:url';
// @ts-expect-error TS2591 — ver comentario arriba.
import path from 'node:path';
import { detectarEspecie, recomendarForraje, recomendarAlimentosPecuarios, getGuardas, diagnosticarAnimal, formatearGroundingAnimal } from '../animalDiagnostic';
import ANIMAL_DATA from '../../data/animal-diagnostics.json';

describe('detectarEspecie', () => {
  it('"tengo 5 vacas lecheras" → bovino leche', () => {
    const e = detectarEspecie('tengo 5 vacas lecheras');
    expect(e).not.toBeNull();
    expect(e.id).toBe('bovino');
    expect(e.funcion_detectada).toBe('leche');
  });
  it('"mis gallinas ponedoras" → avicola huevo', () => {
    expect(detectarEspecie('mis gallinas ponedoras').id).toBe('avicola');
  });
  it('"cabras y chivos" → caprino', () => {
    expect(detectarEspecie('tengo cabras y chivos').id).toBe('caprino');
  });
  it('"marranos" → porcino', () => {
    expect(detectarEspecie('los marranos').id).toBe('porcino');
  });
  it('"cerdos" → porcino', () => {
    expect(detectarEspecie('tengo cerdos en la finca').id).toBe('porcino');
  });
  it('"angelitas y colmenas" → apicola', () => {
    expect(detectarEspecie('tengo angelitas en el colmenar').id).toBe('apicola');
  });
  it('sin datos → null', () => {
    expect(detectarEspecie('hola buenos dias')).toBeNull();
  });
});

describe('getGuardas', () => {
  it('porcino → leucaena PROHIBIDA + estres termico', () => {
    const g = getGuardas('porcino');
    expect(g.some((g) => g.includes('PROHIBIDA') && g.includes('Leucaena'))).toBe(true);
    expect(g.some((g) => g.includes('estres_termico') || g.includes('calor'))).toBe(true);
    expect(g.some((g) => g.includes('veterinario') || g.includes('ICA'))).toBe(true);
  });
  it('avicola → leucaena PROHIBIDA + estres termico', () => {
    const g = getGuardas('avicola');
    expect(g.some((g) => g.includes('PROHIBIDA'))).toBe(true);
    expect(g.some((g) => g.includes('aves') || g.includes('calor'))).toBe(true);
  });
  it('equino → leucaena PROHIBIDA', () => {
    const g = getGuardas('equino');
    expect(g.some((g) => g.includes('PROHIBIDA') && g.includes('EQUINOS'))).toBe(true);
  });
  it('apicola → Apis vs meliponas', () => {
    expect(getGuardas('apicola').some((g) => g.includes('Apis') || g.includes('meliponas'))).toBe(true);
  });
  it('bovino (rumiante) → SIN guarda de leucaena PROHIBIDA', () => {
    const g = getGuardas('bovino');
    expect(g.some((g) => g.includes('PROHIBIDA'))).toBe(false);
  });
});

describe('recomendarForraje', () => {
  it('bovino → leucaena incluida (rumiante)', () => {
    const f = recomendarForraje('bovino');
    expect(f.some((f) => f.id === 'leucaena')).toBe(true);
  });
  it('porcino → leucaena EXCLUIDA (monogastrico, 0%)', () => {
    const f = recomendarForraje('porcino');
    expect(f.some((f) => f.id === 'leucaena')).toBe(false);
  });
  it('avicola → nacedero, boton de oro, morera (max pct >0)', () => {
    const f = recomendarForraje('avicola');
    expect(f.some((f) => f.id === 'nacedero')).toBe(true);
    expect(f.some((f) => f.id === 'morera')).toBe(true);
  });
});

describe('recomendarAlimentosPecuarios', () => {
  it('porcino → incluye alimentos locales curados', () => {
    const alimentos = recomendarAlimentosPecuarios('porcino');
    expect(alimentos.some((f) => f.id === 'yuca_cocida')).toBe(true);
    expect(alimentos.some((f) => f.id === 'suero_leche')).toBe(true);
  });
});

describe('diagnosticarAnimal', () => {
  it('sin datos → sin_datos true', () => {
    expect(diagnosticarAnimal('').sin_datos).toBe(true);
  });
  it('"tengo 5 vacas" → bovino con forrajes', () => {
    const d = diagnosticarAnimal('tengo 5 vacas lecheras');
    expect(d.sin_datos).toBe(false);
    expect(d.especie.id).toBe('bovino');
    expect(d.forrajes.length).toBeGreaterThan(0);
  });
  it('"marranos y leucaena" → guarda de PROHIBIDA', () => {
    const d = diagnosticarAnimal('les doy leucaena a los marranos');
    expect(d.guardas.some((g) => g.includes('PROHIBIDA'))).toBe(true);
    expect(d.alimentos.some((f) => f.id === 'yuca_cocida')).toBe(true);
  });
});

describe('formatearGroundingAnimal', () => {
  it('sin datos → vacio', () => {
    expect(formatearGroundingAnimal({ sin_datos: true })).toBe('');
  });
  it('bovino → incluye especie + forrajes + guardas', () => {
    const d = diagnosticarAnimal('tengo vacas lecheras');
    const f = formatearGroundingAnimal(d);
    expect(f).toContain('Bovino');
    expect(f).toContain('Forrajeras');
    expect(f).toContain('GUARDAS');
  });

  // ── REGRESIÓN de dosis: el % inyectado debe ser el de la ESPECIE real ──
  // Bug corregido: el ternario mostraba rumiantes_max_pct a aves y equinos
  // (solo distinguía porcino/cunicola), sobreestimando la dosis segura hasta 3x
  // en forrajeras con antinutricionales (matarratón/cumarina: 30% rumiante vs
  // 10% monogástrico). Ver AUDIT-INJECTORS-GROUNDING-2026-07-09.
  it('avícola (monogástrico) → inyecta el % de monogástrico, NO el de rumiante', () => {
    const d = diagnosticarAnimal('tengo gallinas ponedoras');
    const bloque = formatearGroundingAnimal(d);
    // Matarratón: rumiante 30% / monogástrico 10%. El bloque para aves debe
    // decir 10%, jamás 30%.
    const lineaMatarraton = bloque.split('\n').find((l) => l.includes('Matarraton'));
    expect(lineaMatarraton).toBeTruthy();
    expect(lineaMatarraton).toContain('max 10% inclusion');
    expect(lineaMatarraton).not.toContain('max 30% inclusion');
  });
  it('equino → inyecta el % de equino, NO el de rumiante', () => {
    const d = diagnosticarAnimal('tengo un caballo');
    const bloque = formatearGroundingAnimal(d);
    // Nacedero: rumiante 30% / equino 10%. Para el caballo debe decir 10%.
    const lineaNacedero = bloque.split('\n').find((l) => l.includes('Nacedero'));
    expect(lineaNacedero).toBeTruthy();
    expect(lineaNacedero).toContain('max 10% inclusion');
    expect(lineaNacedero).not.toContain('max 30% inclusion');
  });
});

// ── GROUNDING: cada forrajera botánica del injector existe en el catálogo ──
// Mismo molde que RestauracionScreen.test.jsx (id-slug + carga del grafo +
// assert de membresía). El injector animal inyecta al LLM binomio + % de dieta;
// si la forrajera no está groundeada, el guard de "usa SOLO estas" no tiene
// contra qué anclar y la especie puede derivar/inventarse (papa→papaya).
// Ver Chagra-strategy/ops/AUDIT-INJECTORS-GROUNDING-2026-07-09.md.
describe('animalDiagnostic — grounding de forrajeras contra el catálogo (grafo)', () => {
  const __dir = path.dirname(fileURLToPath(import.meta.url));
  const grafoPath = path.resolve(__dir, '../../../public/grafo-relations.json');
  const grafo = JSON.parse(readFileSync(grafoPath, 'utf8'));
  const species = grafo.species || {};

  const forrajeras = ANIMAL_DATA.forrajeras;
  // Botánicas = las que declaran id_catalogo (un binomio real que va al prompt).
  // Los alimentos NO botánicos (suero de leche, larva de mosca soldado) llevan
  // id_catalogo:null a propósito — no son especies del catálogo botánico.
  const botanicas = forrajeras.filter((f) => f.id_catalogo);

  it('toda forrajera botánica declara id_catalogo (no queda sin cruzar)', () => {
    // Las 11 del injector: 9 botánicas con binomio + 2 no botánicas (suero, bsf).
    expect(botanicas.length).toBe(9);
    const noBotanicas = forrajeras.filter((f) => f.id_catalogo == null).map((f) => f.id);
    expect(noBotanicas.sort()).toEqual(['bsf', 'suero_leche']);
  });

  it('cada forrajera botánica es un id REAL del grafo (0 inventadas)', () => {
    for (const f of botanicas) {
      expect(
        species[f.id_catalogo],
        `forrajera fabricada (no está en el grafo): ${f.id} → ${f.id_catalogo}`,
      ).toBeTruthy();
    }
  });

  it('el binomio del injector coincide con el nombre científico del grafo', () => {
    // El nombre científico del grafo suele traer autoría (ej. "(Lam.) de Wit");
    // basta con que el binomio "Genus species" del injector esté contenido.
    for (const f of botanicas) {
      const m = /\(([A-Z][a-z]+ [a-z-]+)\)?/.exec(f.nombre) || [];
      const binomioInjector = (m[1] || f.nombre).trim();
      const cientificoGrafo = (species[f.id_catalogo].nombre_cientifico || '').toLowerCase();
      // Solo se valida cuando el injector expone binomio entre paréntesis.
      if (m[1]) {
        expect(
          cientificoGrafo.includes(binomioInjector.toLowerCase()),
          `binomio desalineado ${f.id}: injector="${binomioInjector}" grafo="${species[f.id_catalogo].nombre_cientifico}"`,
        ).toBe(true);
      }
    }
  });
});

// ── SEGURIDAD: los % de dieta inyectados son plausibles y la especie de
//    riesgo (Leucaena/mimosina) está correctamente vetada. ──
describe('animalDiagnostic — % de dieta seguros (anti-dosis-peligrosa)', () => {
  const forrajeras = ANIMAL_DATA.forrajeras;

  it('ningún % de inclusión excede un techo plausible (0–50%)', () => {
    for (const f of forrajeras) {
      for (const campo of ['rumiantes_max_pct', 'monogastricos_max_pct', 'equinos_max_pct']) {
        expect(f[campo], `${f.id}.${campo} fuera de rango`).toBeGreaterThanOrEqual(0);
        expect(f[campo], `${f.id}.${campo} irreal (>50%)`).toBeLessThanOrEqual(50);
      }
    }
  });

  it('Leucaena (mimosina) está VETADA para monogástricos y equinos (0%)', () => {
    const leucaena = forrajeras.find((f) => f.id === 'leucaena');
    expect(leucaena).toBeTruthy();
    expect(leucaena.monogastricos_max_pct).toBe(0);
    expect(leucaena.equinos_max_pct).toBe(0);
    // Y su guarda debe advertir el porqué (mimosina / PROHIBIDA).
    expect(leucaena.guarda).toMatch(/PROHIBIDA/);
  });

  it('toda forrajera con antinutricional trae una guarda no vacía (caveat)', () => {
    for (const f of forrajeras) {
      if (f.antinutricional && f.antinutricional !== 'ninguno') {
        expect(f.guarda, `${f.id} tiene antinutricional sin caveat`).toBeTruthy();
        expect(f.guarda.length, `${f.id} guarda demasiado corta`).toBeGreaterThan(10);
      }
    }
  });
});
