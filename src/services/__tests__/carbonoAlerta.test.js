import { describe, it, expect } from 'vitest';
import { detectarAlertaCarbono } from '../carbonoAlerta.js';

describe('detectarAlertaCarbono', () => {
  it('retorna null para texto sin palabras clave', () => {
    expect(detectarAlertaCarbono('como siembro cafe')).toBeNull();
  });

  it('detecta mencion de bonos de carbono', () => {
    const r = detectarAlertaCarbono('me quieren pagar bonos de carbono');
    expect(r).not.toBeNull();
    expect(r.alerta).toBeTruthy();
    expect(r.trampas.length).toBeGreaterThan(0);
    expect(r.recomendacion).toBeTruthy();
    expect(r.que_hacer.length).toBeGreaterThan(0);
  });

  it('detecta credito de carbono', () => {
    const r = detectarAlertaCarbono('los creditos de carbono son buenos?');
    expect(r).not.toBeNull();
  });

  it('retorna null para texto vacio', () => {
    expect(detectarAlertaCarbono('')).toBeNull();
    expect(detectarAlertaCarbono(null)).toBeNull();
  });
});
