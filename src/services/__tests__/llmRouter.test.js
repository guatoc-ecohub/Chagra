import { describe, it, expect } from 'vitest';
import {
  ROUTES,
  getModelFor,
  buildLLMRequest,
  selectChatRoute,
  DEFAULT_MODEL,
} from '../llmRouter.js';

/**
 * Tests de llmRouter: tabla de rutas por tarea + construcción del request.
 * Se asercionan la LÓGICA de routing y la forma del request, NO los nombres
 * concretos de modelo (se mantienen fuera del test por política de moat).
 */

describe('ROUTES y getModelFor', () => {
  it('cada ruta tiene los campos requeridos bien tipados', () => {
    for (const [task, route] of Object.entries(ROUTES)) {
      expect(typeof route.model, task).toBe('string');
      expect(route.model.length, task).toBeGreaterThan(0);
      expect(typeof route.url, task).toBe('string');
      expect(typeof route.temperature, task).toBe('number');
      expect(typeof route.max_tokens, task).toBe('number');
      expect(typeof route.keep_alive_min, task).toBe('number');
    }
  });

  it('getModelFor devuelve la ruta de una tarea válida', () => {
    const route = getModelFor('chat');
    expect(route).toBe(ROUTES.chat);
  });

  it('getModelFor lanza error claro para tarea desconocida', () => {
    expect(() => getModelFor('inexistente')).toThrow(/Tarea desconocida/);
  });

  it('DEFAULT_MODEL coincide con el modelo de chat', () => {
    expect(DEFAULT_MODEL).toBe(ROUTES.chat.model);
  });
});

describe('buildLLMRequest', () => {
  const messages = [
    { role: 'system', content: 'Eres asistente agroecológico.' },
    { role: 'user', content: '¿cuándo siembro tomate?' },
  ];

  it('construye url + body con los valores de la ruta', () => {
    const { url, body } = buildLLMRequest('chat', messages);
    expect(url).toBe(ROUTES.chat.url);
    expect(body.model).toBe(ROUTES.chat.model);
    expect(body.messages).toEqual(messages);
    expect(body.temperature).toBe(ROUTES.chat.temperature);
    expect(body.max_tokens).toBe(ROUTES.chat.max_tokens);
  });

  it('formatea keep_alive como "<min>m"', () => {
    const { body } = buildLLMRequest('chat', messages);
    expect(body.keep_alive).toBe(`${ROUTES.chat.keep_alive_min}m`);
  });

  it('los overrides ganan sobre la config de la ruta', () => {
    const { body } = buildLLMRequest('chat', messages, { temperature: 0.9, max_tokens: 42 });
    expect(body.temperature).toBe(0.9);
    expect(body.max_tokens).toBe(42);
  });

  it('lanza para tarea desconocida (vía getModelFor)', () => {
    expect(() => buildLLMRequest('nope', messages)).toThrow(/Tarea desconocida/);
  });
});

describe('selectChatRoute', () => {
  it('una query simple se enruta a "chat"', () => {
    expect(selectChatRoute('hola')).toBe('chat');
  });

  it('una query compleja se enruta a "chat_complex"', () => {
    const compleja =
      '¿Por qué mi cultivo de tomate en clima frío a 2600 msnm presenta manchas ' +
      'foliares y cómo lo relaciono con el exceso de humedad y la rotación de cultivos ' +
      'que hice el año pasado comparado con el manejo de plagas integrado?';
    expect(selectChatRoute(compleja)).toBe('chat_complex');
  });

  it('devuelve una task válida presente en ROUTES', () => {
    const task = selectChatRoute('algo');
    expect(Object.keys(ROUTES)).toContain(task);
  });
});
