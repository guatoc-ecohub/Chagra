import { describe, test, expect, beforeEach } from 'vitest';
import { detectOffTopicResponse, logRejection, getRecentRejections, REJECTION_RESPONSES } from '../llmGuardrails';

// ─── detectOffTopicResponse ───────────────────────────────────────────────────

describe('detectOffTopicResponse', () => {
    test('No rechaza respuesta agroecológica válida', () => {
        const validResponse = `
      Para preparar bocashi necesitas: 1 parte de melaza, 2 de harina de roca.
      El proceso de fermentación activa los microorganismos del suelo.
      Aplica en la siembra para enriquecer la materia orgánica del cultivo.
    `;
        expect(detectOffTopicResponse(validResponse, 'general')).toBeNull();
    });

    test('Detecta respuesta de programación como off_topic', () => {
        const codeResponse = `
      Here is a Python function to sort an array using javascript:
      function sortArray(arr) { return arr.sort(); }
      const result = sortArray([3, 1, 2]);
      async function fetchData() { return await fetch('/api'); }
      let output = result.map(x => x * 2);
      npm install lodash para usar _.sortBy().
    `;
        expect(detectOffTopicResponse(codeResponse, 'general')).toBe('off_topic');
    });

    test('No rechaza mención incidental de término off-topic en contexto agro', () => {
        const hybridResponse = `
      Esta enfermedad del tomate de árbol afecta principalmente el suelo.
      No uses medicamento ni gobierno para tratarla — la solución es el biopreparado.
      El cultivo y la cosecha deben hacerse en ciclo correcto.
    `;
        // Tiene términos off-topic pero también contexto agro suficiente
        expect(detectOffTopicResponse(hybridResponse, 'general')).toBeNull();
    });

    test('Detecta política como off_topic cuando no hay contexto agro', () => {
        const politicsResponse = `
      El presidente petro habló en el congreso sobre el gobierno.
      El partido político ganó las elecciones con un candidato nuevo.
      La reforma tributaria fue debatida en el senado colombiano.
    `;
        expect(detectOffTopicResponse(politicsResponse, 'general')).toBe('off_topic');
    });

    test('Detecta drift por length sanity (>10 párrafos)', () => {
        const driftResponse = Array.from({ length: 12 }, (_, i) =>
            `Párrafo ${i + 1} de texto genérico sin términos agroecológicos relevantes suficientes para contexto.`
        ).join('\n\n');
        expect(detectOffTopicResponse(driftResponse, 'disease')).toBe('off_topic');
    });

    test('Pasa respuesta válida de diagnóstico para domain disease', () => {
        const diseaseResponse = `
      La planta muestra síntomas de deficiencia de nitrógeno en el suelo.
      Recomiendo aplicar biopreparado con biol para el cultivo.
      El ciclo de cosecha puede verse afectado si no hay tratamiento.
    `;
        expect(detectOffTopicResponse(diseaseResponse, 'disease')).toBeNull();
    });

    test('Retorna null para entrada vacía (failure mode seguro)', () => {
        expect(detectOffTopicResponse('', 'general')).toBeNull();
        expect(detectOffTopicResponse(null, 'general')).toBeNull();
        expect(detectOffTopicResponse(undefined, 'general')).toBeNull();
    });
});

// ─── logRejection & getRecentRejections ──────────────────────────────────────

describe('logRejection y getRecentRejections', () => {
    const STORAGE_KEY = 'chagra:llm_rejections';

    beforeEach(() => {
        localStorage.clear();
    });

    test('logRejection persiste en localStorage', () => {
        logRejection({ prompt: '¿quién es Petro?', response: 'El presidente...', reason: 'off_topic' });
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        expect(stored).toHaveLength(1);
        expect(stored[0].reason).toBe('off_topic');
    });

    test('logRejection trunca el prompt a 200 chars', () => {
        const longPrompt = 'a'.repeat(500);
        logRejection({ prompt: longPrompt, response: 'algo', reason: 'off_topic' });
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        expect(stored[0].prompt.length).toBeLessThanOrEqual(200);
    });

    test('logRejection mantiene máximo 50 muestras rotando', () => {
        const existing = Array.from({ length: 50 }, (_, i) => ({ ts: 'x', prompt: `p${i}`, reason: 'off_topic', response_preview: '' }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
        logRejection({ prompt: 'nuevo', response: 'resp', reason: 'off_topic' });
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        expect(stored).toHaveLength(50);
        expect(stored[0].prompt).toBe('nuevo'); // más reciente al frente
    });

    test('getRecentRejections retorna los últimos N', () => {
        for (let i = 0; i < 10; i++) {
            logRejection({ prompt: `p${i}`, response: 'r', reason: 'off_topic' });
        }
        const result = getRecentRejections(5);
        expect(result).toHaveLength(5);
    });

    test('getRecentRejections retorna [] sin datos en localStorage', () => {
        expect(getRecentRejections()).toEqual([]);
    });
});

// ─── REJECTION_RESPONSES ─────────────────────────────────────────────────────

describe('REJECTION_RESPONSES', () => {
    test('Tiene todas las claves de rechazo esperadas', () => {
        expect(REJECTION_RESPONSES).toHaveProperty('off_topic');
        expect(REJECTION_RESPONSES).toHaveProperty('out_of_catalog');
        expect(REJECTION_RESPONSES).toHaveProperty('out_of_corpus');
        expect(REJECTION_RESPONSES).toHaveProperty('insufficient_context');
    });

    test('Las responses no tienen jerga técnica (queue, DR-, src/)', () => {
        for (const [, text] of Object.entries(REJECTION_RESPONSES)) {
            expect(text).not.toMatch(/queue\/\d+/);
            expect(text).not.toMatch(/DR-\d+/);
            expect(text).not.toMatch(/src\//);
        }
    });

    test('Las responses usan tono "tú" colombiano (no ustedeo formal)', () => {
        // Verificar que hay al menos una respuesta que usa pronombres informales
        const combined = Object.values(REJECTION_RESPONSES).join(' ').toLowerCase();
        expect(combined).toMatch(/prueba|tu|ayudarte/);
    });
});
