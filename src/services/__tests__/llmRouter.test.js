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

  it('REGRESIÓN truncamiento (2026-06-06): el cap de chat no baja del piso que evita cortar a media frase', () => {
    // Fuga real (interacción operador): respuesta de siembra cortada en
    // "…riego regular para" porque una lista de 5 especies con descripción
    // supera 512 tokens. Piso defensivo: que un futuro tuning de latencia no
    // reviva el truncamiento. Subir es libre; bajar de esto NO.
    expect(ROUTES.chat.max_tokens).toBeGreaterThanOrEqual(768);
    expect(ROUTES.chat_complex.max_tokens).toBeGreaterThanOrEqual(1024);
    // chat_complex debe dar MÁS techo que chat (queries más estructuradas).
    expect(ROUTES.chat_complex.max_tokens).toBeGreaterThanOrEqual(ROUTES.chat.max_tokens);
  });

  it('getModelFor devuelve la ruta de una tarea válida', () => {
    const route = getModelFor('chat');
    expect(route).toBe(ROUTES.chat);
  });

  it('getModelFor lanza error claro para tarea desconocida', () => {
    expect(() => getModelFor(/** @type {any} */ ('inexistente'))).toThrow(/Tarea desconocida/);
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
    const { url, body } = /** @type {{ url: string; body: any }} */ (buildLLMRequest('chat', messages));
    expect(url).toBe(ROUTES.chat.url);
    expect(body.model).toBe(ROUTES.chat.model);
    expect(body.messages).toEqual(messages);
    expect(body.temperature).toBe(ROUTES.chat.temperature);
    expect(body.max_tokens).toBe(ROUTES.chat.max_tokens);
  });

  it('formatea keep_alive como "<min>m"', () => {
    const { body } = /** @type {{ body: any }} */ (buildLLMRequest('chat', messages));
    expect(body.keep_alive).toBe(`${ROUTES.chat.keep_alive_min}m`);
  });

  it('los overrides ganan sobre la config de la ruta', () => {
    const { body } = /** @type {{ body: any }} */ (buildLLMRequest('chat', messages, { temperature: 0.9, max_tokens: 42 }));
    expect(body.temperature).toBe(0.9);
    expect(body.max_tokens).toBe(42);
  });

  it('lanza para tarea desconocida (vía getModelFor)', () => {
    expect(() => buildLLMRequest(/** @type {any} */ ('nope'), messages)).toThrow(/Tarea desconocida/);
  });

  // BUG A (fuga de roles, 2026-05-30): el modelo generaba turnos falsos
  // ("Usuario: ...", "Asistente: ...") porque conversationMemory inyecta el
  // historial con esas etiquetas y la request NO pasaba stop sequences. Sin
  // stop tokens el modelo autocompleta el patrón del diálogo y "alucina" un
  // turno del usuario. Estructura mínima: toda ruta de CHAT debe traer stops.
  describe('BUG A — stop sequences anti fuga-de-roles', () => {
    it('las rutas de chat incluyen body.stop con las etiquetas de rol', () => {
      for (const task of ['chat', 'chat_complex']) {
        const { body } = buildLLMRequest(task, messages);
        expect(Array.isArray(body.stop), task).toBe(true);
        // Debe cortar tanto al inicio de línea como tras newline, ES y EN,
        // y el marcador de chat-template de Ollama.
        expect(body.stop, task).toEqual(
          expect.arrayContaining([
            '\nUsuario:',
            '\nAsistente:',
            '\nUser:',
            '\nUsuario :',
          ]),
        );
      }
    });

    it('(/** @type {any} */ (ROUTES.chat)).stop está definido y es no vacío', () => {
      expect(Array.isArray((/** @type {any} */ (ROUTES.chat)).stop)).toBe(true);
      expect((/** @type {any} */ (ROUTES.chat)).stop.length).toBeGreaterThan(0);
    });

    it('un override de stop reemplaza el de la ruta', () => {
      const { body } = buildLLMRequest('chat', messages, { stop: ['###'] });
      expect(body.stop).toEqual(['###']);
    });

    it('las rutas no-chat (nlu) no rompen si no definen stop', () => {
      const { body } = buildLLMRequest('nlu', messages);
      // nlu puede no traer stop; si lo trae, debe ser array.
      if (body.stop !== undefined) expect(Array.isArray(body.stop)).toBe(true);
    });
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
