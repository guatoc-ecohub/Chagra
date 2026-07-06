/**
 * mensajeErrorCampesino — el usuario nunca ve un error técnico crudo.
 */
import { describe, test, expect } from 'vitest';
import {
  mensajeErrorCampesino,
  MENSAJE_ERROR_RED,
  MENSAJE_ERROR_GENERICO,
} from '../mensajeErrorCampesino';

describe('mensajeErrorCampesino', () => {
  test('errores de red se traducen a la frase de señal', () => {
    expect(mensajeErrorCampesino(new TypeError('Failed to fetch'))).toBe(MENSAJE_ERROR_RED);
    expect(mensajeErrorCampesino(new Error('NetworkError when attempting to fetch resource.'))).toBe(MENSAJE_ERROR_RED);
    expect(mensajeErrorCampesino(new Error('Load failed'))).toBe(MENSAJE_ERROR_RED);
  });

  test('errores técnicos de JS/parseo caen al fallback, nunca crudos', () => {
    expect(mensajeErrorCampesino(new Error("Cannot read properties of undefined (reading 'x')"))).toBe(
      MENSAJE_ERROR_GENERICO,
    );
    expect(mensajeErrorCampesino(new Error('Unexpected token < in JSON at position 0'))).toBe(MENSAJE_ERROR_GENERICO);
    expect(mensajeErrorCampesino(new Error('HTTP 502'))).toBe(MENSAJE_ERROR_GENERICO);
    expect(mensajeErrorCampesino(new Error('Request timed out'))).toBe(MENSAJE_ERROR_GENERICO);
  });

  test('acepta un fallback curado propio del contexto', () => {
    const propio = 'No se pudo marcar el paso como hecho. Intente de nuevo en un momento.';
    expect(mensajeErrorCampesino(new Error('HTTP 500 internal server error'), propio)).toBe(propio);
  });

  test('mensajes ya curados en español se respetan tal cual', () => {
    const curado = 'No se encontró el ciclo de yuca';
    expect(mensajeErrorCampesino(new Error(curado))).toBe(curado);
  });

  test('error vacío, null o raro cae al fallback sin reventar', () => {
    expect(mensajeErrorCampesino(null)).toBe(MENSAJE_ERROR_GENERICO);
    expect(mensajeErrorCampesino(undefined)).toBe(MENSAJE_ERROR_GENERICO);
    expect(mensajeErrorCampesino(new Error(''))).toBe(MENSAJE_ERROR_GENERICO);
    expect(mensajeErrorCampesino({})).toBe(MENSAJE_ERROR_GENERICO);
  });

  test('strings crudos también se filtran', () => {
    expect(mensajeErrorCampesino('Failed to fetch')).toBe(MENSAJE_ERROR_RED);
    expect(mensajeErrorCampesino('TypeError: x is not a function')).toBe(MENSAJE_ERROR_GENERICO);
  });
});
