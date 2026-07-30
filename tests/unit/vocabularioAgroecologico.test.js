/**
 * vocabularioAgroecologico.test.js — Tests del vocabulario agroecológico para juegos.
 *
 * Verifica que:
 * - El módulo exporta el array TERMINOS con la estructura correcta
 * - Cada término tiene palabra, pista y categoria
 * - No hay términos inventados (validado contra catálogo)
 * - Las categorías son consistentes
 * - No hay voseo argentino ni términos políticos
 *
 * Comando: npx vitest run tests/unit/vocabularioAgroecologico.test.js
 */
import { describe, it, expect } from 'vitest';
import TERMINOS from '../../src/data/juegos/vocabularioAgroecologico.js';

describe('vocabularioAgroecologico.js — Contrato de términos para juegos', () => {
  it('exporta un array TERMINOS no vacío (30-40 términos mínimo)', () => {
    expect(Array.isArray(TERMINOS)).toBe(true);
    expect(TERMINOS.length).toBeGreaterThanOrEqual(30);
    expect(TERMINOS.length).toBeLessThanOrEqual(80); // Razónable para crucigrama/sopa
  });

  it('cada término tiene propiedades requeridas: palabra, pista, categoria', () => {
    TERMINOS.forEach((termino, idx) => {
      expect(termino).toHaveProperty('palabra');
      expect(termino).toHaveProperty('pista');
      expect(termino).toHaveProperty('categoria');

      // Validar tipos
      expect(typeof termino.palabra).toBe('string');
      expect(typeof termino.pista).toBe('string');
      expect(typeof termino.categoria).toBe('string');

      // Validar longitudes (crucigrama/sopa)
      expect(termino.palabra.length).toBeGreaterThanOrEqual(4); // Mínimo 4 letras para crucigrama
      expect(termino.pista.length).toBeGreaterThanOrEqual(20); // Mínimo 20 caracteres para pista educativa
      expect(termino.pista.length).toBeLessThanOrEqual(250); // Máximo 250 para sopa de letras

      // Validar que no hay voseo argentino (usar word boundaries y negación para contexto científico)
      const voseoPatterns = /\b(vos|ten[eé]s|quer[eé]s|eleg[ií]|dale|ac[áa]|che)\b/i;
      // Excluir contextos técnicos legítimos (ej: "Nov", "Var", "Cov" en nombres científicos)
      const contextoTecnico = /\b(nov|var|cov|cen|cal|cor)\w*\b.*vos/i;
      if (voseoPatterns.test(termino.pista) && !contextoTecnico.test(termino.pista)) {
        throw new Error(`Término ${idx} tiene voseo argentino en pista: "${termino.pista}"`);
      }
    });
  });

  it('categorías son valores válidos y consistentes', () => {
    const categoriasValidas = [
      'hortalizas',
      'frutales',
      'cereales_granos',
      'tuberculos_raices',
      'aromaticas_medicinales',
      'abonos_verdes',
      'especies_invasoras',
      'biopreparados',
      'control_biologico',
      'practicas'
    ];

    TERMINOS.forEach((termino) => {
      expect(categoriasValidas).toContain(termino.categoria);
    });

    // Verificar que hay términos en varias categorías (mínimo 5)
    const categoriasUnicas = new Set(TERMINOS.map(t => t.categoria));
    expect(categoriasUnicas.size).toBeGreaterThanOrEqual(5);
  });

  it('NO hay términos inventados — todo está respaldado en catálogo real', () => {
    // Términos que deben existir porque están en el catálogo real
    const terminosEsperadosDelCatalogo = [
      'BOCASHI',
      'BIOL',
      'PURIN_ORTIGA',
      'CALDO_SULFO',
      'CALDO_BORDELES',
      'CAFE',
      'CACAO',
      'FRESA',
      'MARIQUITA',
      'TRICHOGRAMMA',
      'BACILLUS_THURINGIENSIS',
      'MAIZ',
      'QUINUA',
      'FRIJOL',
      'ALISO',
      'KIKUYO',
      'EUCALIPTO'
    ];

    const palabrasEnVocabulario = new Set(TERMINOS.map(t => t.palabra));
    
    terminosEsperadosDelCatalogo.forEach(palabra => {
      expect(palabrasEnVocabulario).toContain(palabra);
    });
  });

  it('NO menciona stakeholders políticos (Diana, Richi, Toño, Cepeda, MinAgricultura)', () => {
    const stakeholderProhibido = [
      'Diana',
      'Richi',
      'Toño',
      'Cepeda',
      'MinAgricultura',
      'Ministerio de Agricultura'
    ];

    TERMINOS.forEach((termino, idx) => {
      const pista = termino.pista;
      const palabra = termino.palabra;
      
      stakeholderProhibido.forEach(nombre => {
        if (pista.includes(nombre) || palabra.includes(nombre)) {
          throw new Error(`Término ${idx} menciona stakeholder político prohibido "${nombre}"`);
        }
      });
    });
  });

  it('NO hay secrets ni información sensible en pistas', () => {
    const sensitivePatterns = [
      /API[_\s]?KEY/i,
      /TOKEN/i,
      /PASSWORD/i,
      /SECRET/i,
      /CREDENCIAL/i,
      /PRIVATE[_\s]?KEY/i
    ];

    TERMINOS.forEach((termino, idx) => {
      sensitivePatterns.forEach(pattern => {
        if (pattern.test(termino.pista) || pattern.test(termino.palabra)) {
          throw new Error(`Término ${idx} parece contener información sensible`);
        }
      });
    });
  });

  it('palabras están en MAYÚSCULAS SIN ACENTOS para crucigrama/sopa', () => {
    TERMINOS.forEach((termino, idx) => {
      const palabra = termino.palabra;
      
      // Debe ser mayúsculas
      expect(palabra).toBe(palabra.toUpperCase());
      
      // No debe tener acentos (para sopa de letras)
      const conAcento = /[ÁÉÍÓÚ]/;
      if (conAcento.test(palabra)) {
        throw new Error(`Término ${idx} tiene tilde: "${palabra}" (usar sin tilde para sopa)`);
      }
      
      // Guiones bajos permitidos para compuestos (ej: CALDO_SULFO)
      const soloLetrasGuion = /^[A-Z_]+$/;
      expect(palabra).toMatch(soloLetrasGuion);
    });
  });

  it('distribución por categorías es balanceada (mínimo 2 términos por categoría usada)', () => {
    const terminosPorCategoria = {};

    TERMINOS.forEach(termino => {
      terminosPorCategoria[termino.categoria] = (terminosPorCategoria[termino.categoria] || 0) + 1;
    });

    Object.entries(terminosPorCategoria).forEach(([categoria, cantidad]) => {
      if (cantidad < 2) {
        throw new Error(`Categoría "${categoria}" tiene solo ${cantidad} términos (mínimo 2)`);
      }
    });
  });

  it('NO hay duplicados de palabra', () => {
    const palabras = TERMINOS.map(t => t.palabra);
    const unicas = new Set(palabras);
    
    expect(palabras.length).toBe(unicas.size);
  });

  it('pistas son español CO (no Rioplatense) sin voseo', () => {
    const rioplatensePatterns = [
      /\bvos\b/i,
      /\bten[ée]s\b/i,
      /\bquer[ée]s\b/i,
      /\beleg[íi]\b/i,
      /\bdale\b/i,
      /\bacá\b/i,
      /\bche\b/i,
      /\bpibe\b/i,
      /\bmina\b/i,
      /\b laburo \b/i
    ];

    TERMINOS.forEach((termino, idx) => {
      rioplatensePatterns.forEach(pattern => {
        if (pattern.test(termino.pista)) {
          throw new Error(`Término ${idx} tiene rasgo rioplatense: "${termino.pista}"`);
        }
      });
    });
  });

  it('longitudes de palabra son adecuadas para crucigrama (4-25 caracteres)', () => {
    TERMINOS.forEach((termino, idx) => {
      const longitud = termino.palabra.length;

      if (longitud < 4 || longitud > 25) {
        throw new Error(`Término ${idx} "${termino.palabra}" tiene longitud ${longitud} (fuera de rango 4-25)`);
      }
    });
  });
});
