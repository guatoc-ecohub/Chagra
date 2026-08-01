import { describe, test, expect } from 'vitest';
import {
  analyzeQueryComplexity,
  COMPLEX_QUERY_CHAR_THRESHOLD,
  __TEST_GLOSSARIES__,
} from '../queryComplexityAnalyzer';

describe('queryComplexityAnalyzer — analyzeQueryComplexity', () => {
  describe('inputs degenerados → simple (safe default)', () => {
    test('null → simple', () => {
      expect(analyzeQueryComplexity(null)).toBe('simple');
    });

    test('undefined → simple', () => {
      expect(analyzeQueryComplexity(undefined)).toBe('simple');
    });

    test('número → simple', () => {
      expect(analyzeQueryComplexity(/** @type {any} */ (42))).toBe('simple');
    });

    test('objeto → simple', () => {
      expect(analyzeQueryComplexity(/** @type {any} */ ({ q: 'hola' }))).toBe('simple');
    });

    test('string vacío → simple', () => {
      expect(analyzeQueryComplexity('')).toBe('simple');
    });

    test('string sólo whitespace → simple', () => {
      expect(analyzeQueryComplexity('   \n\t  ')).toBe('simple');
    });

    test('string sólo emojis → simple', () => {
      expect(analyzeQueryComplexity('🌱🌿🍅🥔')).toBe('simple');
    });

    test('query con emoji y texto simple → simple', () => {
      expect(analyzeQueryComplexity('¿qué hago con 🍅?')).toBe('simple');
    });
  });

  describe('queries cortas y planas → simple', () => {
    test('saludo simple → simple', () => {
      expect(analyzeQueryComplexity('hola')).toBe('simple');
    });

    test('pregunta corta sobre planta común → simple', () => {
      expect(analyzeQueryComplexity('cuándo siembro tomate')).toBe('simple');
    });

    test('manejo simple café → simple', () => {
      expect(analyzeQueryComplexity('cómo riego el café')).toBe('simple');
    });

    test('pregunta de altitud planta común → simple', () => {
      expect(analyzeQueryComplexity('a qué altitud crece la papa')).toBe('simple');
    });
  });

  describe('plagas regionales → complex (anti-alucinación)', () => {
    test('chiza → complex', () => {
      expect(analyzeQueryComplexity('qué hago con la chiza en mi finca')).toBe('complex');
    });

    test('monalonion → complex', () => {
      expect(analyzeQueryComplexity('cómo controlo el monalonion en aguacate')).toBe('complex');
    });

    test('broca del café → complex (vía broca)', () => {
      expect(analyzeQueryComplexity('tengo broca en el café')).toBe('complex');
    });

    test('sigatoka → complex', () => {
      expect(analyzeQueryComplexity('manchas de sigatoka en plátano')).toBe('complex');
    });

    test('roya → complex', () => {
      expect(analyzeQueryComplexity('hay roya en mis cafetos')).toBe('complex');
    });

    test('case-insensitive: CHIZA → complex', () => {
      expect(analyzeQueryComplexity('TENGO CHIZA EN EL POTRERO')).toBe('complex');
    });
  });

  describe('plantas confundibles → complex (anti-confusión taxonómica)', () => {
    test('gulupa → complex', () => {
      expect(analyzeQueryComplexity('a qué altitud crece la gulupa')).toBe('complex');
    });

    test('curuba → complex', () => {
      expect(analyzeQueryComplexity('me sirve curuba en clima frío')).toBe('complex');
    });

    test('chachafruto → complex', () => {
      expect(analyzeQueryComplexity('plantar chachafruto')).toBe('complex');
    });

    test('tomate de árbol con tilde → complex', () => {
      expect(analyzeQueryComplexity('cómo podo el tomate de árbol')).toBe('complex');
    });

    test('tomate de arbol sin tilde → complex', () => {
      expect(analyzeQueryComplexity('cómo podo el tomate de arbol')).toBe('complex');
    });

    test('cubio → complex', () => {
      expect(analyzeQueryComplexity('el cubio se da bien con papa')).toBe('complex');
    });

    test('feijoa → complex', () => {
      expect(analyzeQueryComplexity('cuándo cosecho feijoa')).toBe('complex');
    });
  });

  describe('triggers léxicos multi-aspecto → complex', () => {
    test('dame un plan → complex', () => {
      expect(analyzeQueryComplexity('dame un plan de siembra para mi finca')).toBe('complex');
    });

    test('asocia X con Y → complex', () => {
      expect(analyzeQueryComplexity('asocia maíz con frijol y zapallo')).toBe('complex');
    });

    test('manejo integral → complex', () => {
      expect(analyzeQueryComplexity('necesito manejo integral del cultivo')).toBe('complex');
    });

    test('sistema agroforestal → complex', () => {
      expect(analyzeQueryComplexity('diseño de sistema agroforestal')).toBe('complex');
    });

    test('transición agroecológica → complex', () => {
      expect(analyzeQueryComplexity('transición de convencional a orgánico')).toBe('complex');
    });

    test('rotación de cultivos → complex', () => {
      expect(analyzeQueryComplexity('explícame rotación de cultivos')).toBe('complex');
    });

    test('qué tengo que aprender → complex', () => {
      expect(analyzeQueryComplexity('qué tengo que aprender para empezar')).toBe('complex');
    });
  });

  describe('threshold por longitud → complex', () => {
    test('query > 200 chars sin trigger → complex', () => {
      // Construimos una query >200 chars sobre algo banal — sin plagas
      // ni plantas confundibles ni triggers. Sólo longitud debe decidir.
      const q = 'estoy pensando en sembrar algunas hortalizas en mi huerta urbana de la ciudad y quiero saber qué opciones tengo si tengo poco espacio y bastante sol durante el día con riego diario y compost casero por favor responde con detalle';
      expect(q.length).toBeGreaterThan(COMPLEX_QUERY_CHAR_THRESHOLD);
      expect(analyzeQueryComplexity(q)).toBe('complex');
    });

    test('query exactamente en el threshold → simple', () => {
      // Si length === threshold, NO supera el > → simple.
      const q = 'a'.repeat(COMPLEX_QUERY_CHAR_THRESHOLD);
      expect(q.length).toBe(COMPLEX_QUERY_CHAR_THRESHOLD);
      expect(analyzeQueryComplexity(q)).toBe('simple');
    });

    test('query un char por encima del threshold → complex', () => {
      const q = 'a'.repeat(COMPLEX_QUERY_CHAR_THRESHOLD + 1);
      expect(analyzeQueryComplexity(q)).toBe('complex');
    });
  });

  describe('precedencia de heurísticas', () => {
    test('plaga regional + planta común → complex (gana plaga)', () => {
      expect(analyzeQueryComplexity('cómo combato la chiza en mi papa')).toBe('complex');
    });

    test('query corta con confusable → complex (gana confusable)', () => {
      expect(analyzeQueryComplexity('gulupa')).toBe('complex');
    });

    test('long + confusable + plaga → complex (cualquiera basta)', () => {
      const q = `plan integral para mi finca con gulupa y broca durante un ciclo productivo completo de doce meses tomando en cuenta el clima andino y la disponibilidad de mano de obra familiar`;
      expect(analyzeQueryComplexity(q)).toBe('complex');
    });
  });

  describe('word-boundary — evita falsos positivos por substring', () => {
    test('"boca seca" NO matchea "oca" (tubérculo andino)', () => {
      // 'oca' está en CONFUSABLE_PLANTS; sin word-boundary "boca" daría false-positive.
      expect(analyzeQueryComplexity('tengo la boca seca por el calor')).toBe('simple');
    });

    test('"agotamiento" NO matchea "gota" (enfermedad)', () => {
      // 'gota' está en REGIONAL_PESTS; "agotamiento" la contiene como substring.
      expect(analyzeQueryComplexity('estoy con agotamiento esta semana')).toBe('simple');
    });

    test('"tampoco" NO matchea "oca"', () => {
      expect(analyzeQueryComplexity('tampoco sé qué hacer')).toBe('simple');
    });

    test('"riego" como palabra completa NO matchea ningún glosario', () => {
      expect(analyzeQueryComplexity('cuándo riego mis plantas')).toBe('simple');
    });

    test('"oca" como palabra completa SÍ matchea → complex', () => {
      expect(analyzeQueryComplexity('cómo siembro oca en clima frío')).toBe('complex');
    });

    test('"gota" como palabra completa SÍ matchea → complex', () => {
      expect(analyzeQueryComplexity('tengo gota en la papa')).toBe('complex');
    });

    test('signos de puntuación cuentan como límite de palabra', () => {
      expect(analyzeQueryComplexity('¿qué pasa con la chiza?')).toBe('complex');
      expect(analyzeQueryComplexity('chiza, ¿qué hago?')).toBe('complex');
    });
  });

  describe('glosarios expuestos para introspección', () => {
    test('REGIONAL_PESTS contiene chiza y monalonion', () => {
      expect(__TEST_GLOSSARIES__.REGIONAL_PESTS).toContain('chiza');
      expect(__TEST_GLOSSARIES__.REGIONAL_PESTS).toContain('monalonion');
    });

    test('CONFUSABLE_PLANTS contiene gulupa y curuba', () => {
      expect(__TEST_GLOSSARIES__.CONFUSABLE_PLANTS).toContain('gulupa');
      expect(__TEST_GLOSSARIES__.CONFUSABLE_PLANTS).toContain('curuba');
    });

    test('COMPLEXITY_TRIGGERS contiene "asocia" y "manejo integral"', () => {
      expect(__TEST_GLOSSARIES__.COMPLEXITY_TRIGGERS).toContain('asocia');
      expect(__TEST_GLOSSARIES__.COMPLEXITY_TRIGGERS).toContain('manejo integral');
    });
  });
});
