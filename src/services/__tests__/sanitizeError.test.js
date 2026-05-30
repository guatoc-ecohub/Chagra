import { describe, it, expect } from 'vitest';
import {
  sanitizeErrorDetail,
  buildCleanErrorMessage,
} from '../sanitizeError.js';

/**
 * Tests de sanitización de errores para evitar mostrar HTML crudo al usuario.
 * Cubre detección de HTML, JSON:API, JSON simple y texto plano con truncación.
 */

describe('sanitizeErrorDetail', () => {
  describe('inputs inválidos', () => {
    it('retorna null para undefined', () => {
      expect(sanitizeErrorDetail(undefined)).toBe(null);
    });

    it('retorna null para null', () => {
      expect(sanitizeErrorDetail(null)).toBe(null);
    });

    it('retorna null para string vacío', () => {
      expect(sanitizeErrorDetail('')).toBe(null);
    });

    it('retorna null para solo espacios', () => {
      expect(sanitizeErrorDetail('   ')).toBe(null);
    });
  });

  describe('detección de HTML', () => {
    it('detecta <!DOCTYPE html', () => {
      const html = '<!DOCTYPE html><html><body>Error 404</body></html>';
      expect(sanitizeErrorDetail(html)).toBe(null);
    });

    it('detecta <html tag', () => {
      const html = '<html lang="es"><head><title>Error</title></head><body>Not found</body></html>';
      expect(sanitizeErrorDetail(html)).toBe(null);
    });

    it('detecta <body tag en primeros 500 chars', () => {
      const html = '<div><div><div><body>Not found</body></div></div></div>';
      expect(sanitizeErrorDetail(html)).toBe(null);
    });

    it('detecta HTML por content-type header', () => {
      const html = 'Some error message here';
      expect(sanitizeErrorDetail(html, 'text/html')).toBe(null);
    });

    it('detecta HTML con content-type case insensitive', () => {
      const html = 'Some error message here';
      expect(sanitizeErrorDetail(html, 'Text/HTML; charset=utf-8')).toBe(null);
    });

    it('acepta body no HTML con content-type json', () => {
      const json = '{"error": "Not found"}';
      expect(sanitizeErrorDetail(json, 'application/json')).toBe('Not found');
    });
  });

  describe('JSON:API errors (FarmOS/Drupal)', () => {
    it('extrae detail de JSON:API estándar', () => {
      const jsonApi = {
        errors: [
          {
            detail: 'The requested resource could not be found.',
            title: 'Not Found',
            status: 404,
          },
        ],
      };
      expect(sanitizeErrorDetail(JSON.stringify(jsonApi), 'application/vnd.api+json')).toBe(
        'The requested resource could not be found.'
      );
    });

    it('extrae title si detail no existe', () => {
      const jsonApi = {
        errors: [
          {
            title: 'Not Found',
            status: 404,
          },
        ],
      };
      expect(sanitizeErrorDetail(JSON.stringify(jsonApi))).toBe('Not Found');
    });

    it('extrae message si ni detail ni title existen', () => {
      const jsonApi = {
        errors: [
          {
            message: 'Resource not found',
            status: 404,
          },
        ],
      };
      expect(sanitizeErrorDetail(JSON.stringify(jsonApi))).toBe('Resource not found');
    });

    it('retorna el JSON como texto plano si errors array vacío', () => {
      const jsonApi = { errors: [] };
      const result = sanitizeErrorDetail(JSON.stringify(jsonApi));
      expect(result).toBe('{"errors":[]}');
    });

    it('retorna el JSON como texto plano si errors array es null', () => {
      const jsonApi = { errors: null };
      const result = sanitizeErrorDetail(JSON.stringify(jsonApi));
      expect(result).toBe('{"errors":null}');
    });
  });

  describe('JSON simple', () => {
    it('extrae campo detail', () => {
      const json = { detail: 'Authentication required' };
      expect(sanitizeErrorDetail(JSON.stringify(json))).toBe('Authentication required');
    });

    it('extrae campo error', () => {
      const json = { error: 'Invalid token' };
      expect(sanitizeErrorDetail(JSON.stringify(json))).toBe('Invalid token');
    });

    it('extrae campo message', () => {
      const json = { message: 'User not authorized' };
      expect(sanitizeErrorDetail(JSON.stringify(json))).toBe('User not authorized');
    });

    it('prioriza detail sobre error y message', () => {
      const json = {
        detail: 'Priority detail',
        error: 'Secondary error',
        message: 'Secondary message',
      };
      expect(sanitizeErrorDetail(JSON.stringify(json))).toBe('Priority detail');
    });

    it('retorna el JSON como texto plano si sin campos conocidos', () => {
      const json = { foo: 'bar', baz: 'qux' };
      const result = sanitizeErrorDetail(JSON.stringify(json));
      expect(result).toBe('{"foo":"bar","baz":"qux"}');
    });
  });

  describe('texto plano con truncación', () => {
    it('trunca a MAX_DETAIL_CHARS (240)', () => {
      const longText = 'A'.repeat(300);
      const result = sanitizeErrorDetail(longText);
      expect(result).toHaveLength(240);
      expect(result).toBe('A'.repeat(240));
    });

    it('mantiene texto corto intacto', () => {
      const shortText = 'Error de conexión';
      expect(sanitizeErrorDetail(shortText)).toBe('Error de conexión');
    });

    it('limpia tags HTML residuales', () => {
      const htmlText = '<div>Error</div> en <span>conexión</span>';
      expect(sanitizeErrorDetail(htmlText)).toBe('Error en conexión');
    });

    it('colapsa espacios múltiples', () => {
      const spacedText = 'Error   de    conexión';
      expect(sanitizeErrorDetail(spacedText)).toBe('Error de conexión');
    });

    it('limpia newlines y tabs', () => {
      const newText = 'Error\nen\tconexión';
      expect(sanitizeErrorDetail(newText)).toBe('Error en conexión');
    });

    it('trim espacios al inicio y final', () => {
      const trimText = '  Error de conexión  ';
      expect(sanitizeErrorDetail(trimText)).toBe('Error de conexión');
    });

    it('retorna null si después de limpiar queda vacío', () => {
      const emptyHtml = '<div></div><span></span>';
      expect(sanitizeErrorDetail(emptyHtml)).toBe(null);
    });

    it('retorna null si solo tags HTML', () => {
      const onlyTags = '<div><span><p></p></span></div>';
      expect(sanitizeErrorDetail(onlyTags)).toBe(null);
    });
  });

  describe('JSON malformado', () => {
    it('cae a texto plano si JSON parse falla', () => {
      const badJson = '{"error": "missing closing bracket';
      expect(sanitizeErrorDetail(badJson)).toBeTruthy();
    });

    it('trunca texto plano de JSON malformado', () => {
      const longBadJson = '{"error": "'.repeat(100) + '..."';
      const result = sanitizeErrorDetail(longBadJson);
      expect(result).toHaveLength(240);
    });
  });

  describe('casos borde combinados', () => {
    it('HTML con JSON adentro es ignorado', () => {
      const htmlWithJson = '<!DOCTYPE html><html><body>{"error": "Not found"}</body></html>';
      expect(sanitizeErrorDetail(htmlWithJson)).toBe(null);
    });

    it('texto plano muy largo con tags mezclados', () => {
      const longMixed = 'A'.repeat(100) + '<div>' + 'B'.repeat(100) + '</div>' + 'C'.repeat(100);
      const result = sanitizeErrorDetail(longMixed);
      expect(result).toHaveLength(240);
    });

    it('retorna solo detalle si statusText vacío', () => {
      const result = buildCleanErrorMessage('API', 404, '', 'Not found');
      expect(result).toBe('API 404 — Not found');
    });
  });
});

describe('buildCleanErrorMessage', () => {
  it('construye mensaje base sin body', () => {
    expect(buildCleanErrorMessage('FarmOS API', 500, 'Internal Server Error', null)).toBe(
      'FarmOS API 500: Internal Server Error'
    );
  });

  it('construye mensaje base sin body ni statusText', () => {
    expect(buildCleanErrorMessage('Ollama', 502, '', null)).toBe('Ollama 502');
  });

  it('construye mensaje base con statusText vacío', () => {
    expect(buildCleanErrorMessage('Ollama', 502, null, null)).toBe('Ollama 502');
  });

  it('agrega detalle limpio de JSON:API', () => {
    const jsonApi = { errors: [{ detail: 'Resource not found' }] };
    const result = buildCleanErrorMessage('FarmOS', 404, 'Not Found', JSON.stringify(jsonApi));
    expect(result).toBe('FarmOS 404: Not Found — Resource not found');
  });

  it('agrega detalle limpio de JSON simple', () => {
    const json = { error: 'Invalid token' };
    const result = buildCleanErrorMessage('Auth', 401, 'Unauthorized', JSON.stringify(json));
    expect(result).toBe('Auth 401: Unauthorized — Invalid token');
  });

  it('trunca detalle largo en mensaje final', () => {
    const longDetail = 'A'.repeat(300);
    const result = buildCleanErrorMessage('API', 500, 'Error', longDetail);
    expect(result).toBe('API 500: Error — ' + 'A'.repeat(240));
  });

  it('omite detalle si body es HTML', () => {
    const html = '<!DOCTYPE html><html><body>404 Not Found</body></html>';
    const result = buildCleanErrorMessage('Drupal', 404, 'Not Found', html);
    expect(result).toBe('Drupal 404: Not Found');
  });

  it('omite detalle si body es null', () => {
    const result = buildCleanErrorMessage('Service', 500, 'Error', null);
    expect(result).toBe('Service 500: Error');
  });

  it('omite detalle si body es undefined', () => {
    const result = buildCleanErrorMessage('Service', 500, 'Error', undefined);
    expect(result).toBe('Service 500: Error');
  });

  it('limpia tags HTML de detalle en mensaje final', () => {
    const detail = '<div>Error</div> en conexión';
    const result = buildCleanErrorMessage('API', 500, 'Error', detail);
    expect(result).toBe('API 500: Error — Error en conexión');
  });

  it('funciona con body tipo texto y content-type text/html', () => {
    const result = buildCleanErrorMessage('Service', 404, 'Not Found', 'Some text', 'text/html');
    expect(result).toBe('Service 404: Not Found');
  });
});
