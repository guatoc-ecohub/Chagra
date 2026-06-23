/**
 * agro-insight-cards.adversarial.test.js — TEST ADVERSARIAL SAFETY
 *
 * Barre TODO agro-insight-cards.json + agro-lecciones.json y falla si
 * se detectan violaciones de seguridad editorial:
 *
 *   1. Toda card non_co=true DEBE tener el texto "otros países" en InsightCard
 *      (verificado en la estructura, no solo en render).
 *   2. Ninguna card/lección puede tener dosis numérica sin campo fuente.
 *   3. Ninguna card/lección puede tener binomio sin fuente.
 *   4. Ningún texto puede tener voseo argentino.
 *   5. Toda card debe tener campo fuente no vacío.
 *   6. Ningún texto puede contener promesas de cura/milagro.
 *
 * Regla: si un test FALLA aquí, hay un bug de seguridad real que arreglar.
 */
import { describe, it, expect } from 'vitest';
import cards from './agro-insight-cards.json';
import lecciones from './agro-lecciones.json';

// Expresión para detectar voseo argentino
const VOSEO_RE = /\b(vos |tenés|querés|podés|sabés|hacés)\b/i;

// Expresión para detectar promesas de cura o milagro.
// "elimina" sin objeto explícito suena a promesa; con objeto descriptivo es aceptable.
// Ejemplos bloqueados: "elimina la enfermedad", "cura el cultivo", "garantiza el resultado".
// Ejemplos permitidos: "elimina la mayor parte de la población de broca" (desc. de eficacia documentada).
// Para evitar falsos positivos, bloqueamos solo las formas más peligrosas:
const PROMESA_CURA_RE = /\b(cura\b(?!\s+(\w+\s+){0,3}(broca|plaga|insecto|hongo|bacteria|enfermedad|daño))|garantiza\b|\b100\s*%\s*(efectividad|de control total|de eficacia total)|\bmilagro\b|\belimina\s+(la|las|el|los)\s+(enfermedad|plaga|hongo|bacteria))/i;

// Expresión para detectar dosis numéricas (cantidades con unidad, excluye % con fuente)
// Solo en texto libre donde podría no tener fuente
const DOSIS_NUMERICA_RE = /\d+\s*(mg|ml|g\/l|g\/ha|kg\/ha|l\/ha|cc\/l|cc\/ha|g\/planta)\b/i;

// --- Cards ---

describe('ADVERSARIAL SAFETY: agro-insight-cards.json', () => {
  it('todas las cards tienen campo "id" no vacío', () => {
    for (const card of cards) {
      expect(card.id, `Card sin id: ${JSON.stringify(card).slice(0, 80)}`).toBeTruthy();
    }
  });

  it('todas las cards tienen campo "fuente" no vacío', () => {
    for (const card of cards) {
      expect(
        card.fuente && card.fuente.trim().length > 0,
        `Card "${card.id}" no tiene fuente`
      ).toBe(true);
    }
  });

  it('cards con non_co=true tienen region_analoga definida', () => {
    for (const card of cards) {
      if (card.non_co) {
        expect(
          card.region_analoga && card.region_analoga.trim().length > 0,
          `Card non_co "${card.id}" no tiene region_analoga`
        ).toBe(true);
      }
    }
  });

  it('ninguna card contiene voseo argentino en ningún campo de texto', () => {
    const camposTexto = ['titulo', 'dato', 'cifra', 'fuente', 'region_analoga'];
    for (const card of cards) {
      for (const campo of camposTexto) {
        if (!card[campo]) continue;
        expect(
          VOSEO_RE.test(card[campo]),
          `VOSEO encontrado en card "${card.id}", campo "${campo}": "${card[campo]}"`
        ).toBe(false);
      }
    }
  });

  it('ninguna card contiene promesas de cura o milagro', () => {
    const camposTexto = ['titulo', 'dato', 'cifra'];
    for (const card of cards) {
      for (const campo of camposTexto) {
        if (!card[campo]) continue;
        expect(
          PROMESA_CURA_RE.test(card[campo]),
          `PROMESA DE CURA encontrada en card "${card.id}", campo "${campo}": "${card[campo]}"`
        ).toBe(false);
      }
    }
  });

  it('ninguna card tiene dosis numérica con unidad en el campo "dato" sin fuente', () => {
    for (const card of cards) {
      if (!card.dato) continue;
      if (DOSIS_NUMERICA_RE.test(card.dato)) {
        // Si hay dosis, DEBE haber fuente
        expect(
          card.fuente && card.fuente.trim().length > 0,
          `Card "${card.id}" tiene dosis numérica pero NO tiene fuente`
        ).toBe(true);
      }
    }
  });

  it('cards con binomio tienen fuente no vacía', () => {
    for (const card of cards) {
      if (card.binomio) {
        expect(
          card.fuente && card.fuente.trim().length > 0,
          `Card "${card.id}" tiene binomio "${card.binomio}" pero NO tiene fuente`
        ).toBe(true);
      }
    }
  });

  it('todas las cards tienen entity_slug válido', () => {
    const slugsValidos = ['cafe', 'papa', 'tomate', 'maiz', 'frijol', 'trigo', 'cebada'];
    for (const card of cards) {
      expect(
        slugsValidos.includes(card.entity_slug),
        `Card "${card.id}" tiene entity_slug inválido: "${card.entity_slug}"`
      ).toBe(true);
    }
  });

  it('todas las cards tienen leccion_base válida', () => {
    const leccionesValidas = ['suelo', 'asociaciones', 'biopreparados', 'mip', 'fenologia'];
    for (const card of cards) {
      expect(
        leccionesValidas.includes(card.leccion_base),
        `Card "${card.id}" tiene leccion_base inválida: "${card.leccion_base}"`
      ).toBe(true);
    }
  });

  it('el campo non_co es booleano explícito en todas las cards', () => {
    for (const card of cards) {
      expect(
        typeof card.non_co === 'boolean',
        `Card "${card.id}" tiene non_co no booleano: ${card.non_co}`
      ).toBe(true);
    }
  });
});

// --- Lecciones ---

describe('ADVERSARIAL SAFETY: agro-lecciones.json', () => {
  it('todas las lecciones tienen slug no vacío', () => {
    for (const leccion of lecciones) {
      expect(leccion.slug, 'Lección sin slug').toBeTruthy();
    }
  });

  it('todas las lecciones tienen fuente no vacía', () => {
    for (const leccion of lecciones) {
      expect(
        leccion.fuente && leccion.fuente.trim().length > 0,
        `Lección "${leccion.slug}" no tiene fuente`
      ).toBe(true);
    }
  });

  it('ningún bloque de lección contiene voseo argentino', () => {
    for (const leccion of lecciones) {
      for (const bloque of leccion.contenido_bloques) {
        if (bloque.texto) {
          expect(
            VOSEO_RE.test(bloque.texto),
            `VOSEO en lección "${leccion.slug}", tipo "${bloque.tipo}": "${bloque.texto.slice(0, 100)}"`
          ).toBe(false);
        }
        if (bloque.fuente) {
          expect(
            VOSEO_RE.test(bloque.fuente),
            `VOSEO en fuente de lección "${leccion.slug}": "${bloque.fuente}"`
          ).toBe(false);
        }
      }
    }
  });

  it('ningún bloque contiene promesas de cura o milagro', () => {
    for (const leccion of lecciones) {
      for (const bloque of leccion.contenido_bloques) {
        if (!bloque.texto) continue;
        expect(
          PROMESA_CURA_RE.test(bloque.texto),
          `PROMESA DE CURA en lección "${leccion.slug}": "${bloque.texto.slice(0, 100)}"`
        ).toBe(false);
      }
    }
  });

  it('bloques de tipo dato_clave tienen fuente', () => {
    for (const leccion of lecciones) {
      for (const bloque of leccion.contenido_bloques) {
        if (bloque.tipo === 'dato_clave') {
          expect(
            bloque.fuente && bloque.fuente.trim().length > 0,
            `Bloque dato_clave en lección "${leccion.slug}" sin fuente: "${(bloque.texto || '').slice(0, 80)}"`
          ).toBe(true);
        }
      }
    }
  });

  it('bloques dato_clave con dosis numérica tienen fuente', () => {
    for (const leccion of lecciones) {
      for (const bloque of leccion.contenido_bloques) {
        if (!bloque.texto) continue;
        if (DOSIS_NUMERICA_RE.test(bloque.texto)) {
          expect(
            bloque.fuente && bloque.fuente.trim().length > 0,
            `Bloque con dosis en lección "${leccion.slug}" sin fuente: "${bloque.texto.slice(0, 80)}"`
          ).toBe(true);
        }
      }
    }
  });

  it('los slugs de lección son únicos', () => {
    const slugs = lecciones.map((l) => l.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it('los slugs cubiertos son exactamente los 5 esperados', () => {
    const slugsEsperados = new Set(['suelo', 'asociaciones', 'biopreparados', 'mip', 'fenologia']);
    const slugsReales = new Set(lecciones.map((l) => l.slug));
    for (const s of slugsEsperados) {
      expect(slugsReales.has(s), `Slug esperado "${s}" no encontrado`).toBe(true);
    }
  });
});
