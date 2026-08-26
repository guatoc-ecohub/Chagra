/**
 * vocabularioAgroecologico.spec.js — Tests para el dataset de vocabulario agroecológico
 */

import { describe, it, expect } from 'vitest';
import vocabulario from '../../src/data/juegos/vocabularioAgroecologico.js';

describe('vocabularioAgroecologico.js', () => {
  describe('Exportaciones principales', () => {
    it('debe exportar CATEGORIAS', () => {
      expect(vocabulario.CATEGORIAS).toBeDefined();
      expect(typeof vocabulario.CATEGORIAS).toBe('object');
    });

    it('debe exportar TERMINOS', () => {
      expect(vocabulario.TERMINOS).toBeDefined();
      expect(Array.isArray(vocabulario.TERMINOS)).toBe(true);
    });

    it('debe exportar TERMINOS_POR_CATEGORIA', () => {
      expect(vocabulario.TERMINOS_POR_CATEGORIA).toBeDefined();
      expect(typeof vocabulario.TERMINOS_POR_CATEGORIA).toBe('object');
    });
  });

  describe('Estructura de CATEGORIAS', () => {
    it('debe tener las categorías esperadas', () => {
      const expectedCategories = [
        'cultivos_tradicionales',
        'sombra_agroforestal',
        'manejo_suelo',
        'plantas_medicinales',
        'especies_invasoras',
        'frutales_andinos',
      ];

      expectedCategories.forEach(cat => {
        expect(vocabulario.CATEGORIAS[cat]).toBeDefined();
      });
    });

    it('cada categoría debe tener id, label, descripcion y emoji', () => {
      Object.values(vocabulario.CATEGORIAS).forEach(cat => {
        expect(cat.id).toBeDefined();
        expect(typeof cat.id).toBe('string');
        expect(cat.label).toBeDefined();
        expect(typeof cat.label).toBe('string');
        expect(cat.descripcion).toBeDefined();
        expect(typeof cat.descripcion).toBe('string');
        expect(cat.emoji).toBeDefined();
        expect(typeof cat.emoji).toBe('string');
        expect(cat.emoji.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Estructura de TERMINOS', () => {
    it('debe tener entre 30 y 40 términos', () => {
      expect(vocabulario.TERMINOS.length).toBeGreaterThanOrEqual(30);
      expect(vocabulario.TERMINOS.length).toBeLessThanOrEqual(40);
    });

    it('cada término debe tener palabra, categoria y pista', () => {
      vocabulario.TERMINOS.forEach(term => {
        expect(term.palabra).toBeDefined();
        expect(typeof term.palabra).toBe('string');
        expect(term.palabra.length).toBeGreaterThan(0);
        
        expect(term.categoria).toBeDefined();
        expect(typeof term.categoria).toBe('string');
        expect(term.categoria.length).toBeGreaterThan(0);
        
        expect(term.pista).toBeDefined();
        expect(typeof term.pista).toBe('string');
        expect(term.pista.length).toBeGreaterThan(0);
      });
    });

    it('todas las categorías de términos deben corresponder a CATEGORIAS definidas', () => {
      const validCategories = Object.keys(vocabulario.CATEGORIAS);
      
      vocabulario.TERMINOS.forEach(term => {
        expect(validCategories).toContain(term.categoria);
      });
    });

    it('palabras deben estar en mayúsculas', () => {
      vocabulario.TERMINOS.forEach(term => {
        expect(term.palabra).toBe(term.palabra.toUpperCase());
      });
    });

    it('pistas deben tener al menos 50 caracteres', () => {
      vocabulario.TERMINOS.forEach(term => {
        expect(term.pista.length).toBeGreaterThanOrEqual(50);
      });
    });
  });

  describe('TERMINOS_POR_CATEGORIA', () => {
    it('debe tener una clave por cada categoría', () => {
      const categories = Object.keys(vocabulario.CATEGORIAS);
      const indexedCategories = Object.keys(vocabulario.TERMINOS_POR_CATEGORIA);
      
      categories.forEach(cat => {
        expect(indexedCategories).toContain(cat);
      });
    });

    it('cada categoría debe contener términos filtrados correctamente', () => {
      Object.entries(vocabulario.TERMINOS_POR_CATEGORIA).forEach(([cat, terms]) => {
        expect(Array.isArray(terms)).toBe(true);
        terms.forEach(term => {
          expect(term.categoria).toBe(cat);
        });
      });
    });

    it('la suma de términos por categoría debe igual el total', () => {
      const totalByCategory = Object.values(vocabulario.TERMINOS_POR_CATEGORIA)
        .reduce((sum, terms) => sum + terms.length, 0);
      
      expect(totalByCategory).toBe(vocabulario.TERMINOS.length);
    });
  });

  describe('Contenido educativo', () => {
    it('debe tener términos en cada categoría', () => {
      Object.entries(vocabulario.TERMINOS_POR_CATEGORIA).forEach(([_cat, terms]) => {
        expect(terms.length).toBeGreaterThan(0);
      });
    });

    it('las pistas deben contener palabras agroecológicas fundamentadas', () => {
      // Palabras clave que deberían aparecer en las pistas por categoría
      const keywordsByCategory = {
        cultivos_tradicionales: ['andino', 'chagra', 'tradicional', 'papa', 'quinua'],
        sombra_agroforestal: ['sombra', 'agroforestal', 'arbol', 'fijador', 'nitrogeno'],
        manejo_suelo: ['suelo', 'cobertura', 'leguminosa', 'fija', 'abono'],
        plantas_medicinales: ['medicinal', 'aromatica', 'infusion', 'aceite'],
        especies_invasoras: ['invasora', 'exotica', 'nativa', 'ecosistema'],
        frutales_andinos: ['frutal', 'fruto', 'andino', 'tropical'],
      };

      Object.entries(vocabulario.TERMINOS_POR_CATEGORIA).forEach(([cat, terms]) => {
        const keywords = keywordsByCategory[cat] || [];
        let foundKeywords = 0;
        
        terms.forEach(term => {
          keywords.forEach(keyword => {
            if (term.pista.toLowerCase().includes(keyword)) {
              foundKeywords++;
            }
          });
        });

        // Al menos algunos términos deben contener palabras clave de su categoría
        expect(foundKeywords).toBeGreaterThan(0);
      });
    });
  });

  describe('Datos técnicos', () => {
    it('no debe tener términos duplicados', () => {
      const palabras = vocabulario.TERMINOS.map(t => t.palabra);
      const uniquePalabras = new Set(palabras);
      
      expect(palabras.length).toBe(uniquePalabras.size);
    });

    it('cada categoría debe tener al menos 3 términos', () => {
      Object.values(vocabulario.TERMINOS_POR_CATEGORIA).forEach(terms => {
        expect(terms.length).toBeGreaterThanOrEqual(3);
      });
    });
  });
});
