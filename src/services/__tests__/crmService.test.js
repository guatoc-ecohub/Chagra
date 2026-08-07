/**
 * crmService.test.js — Tests del servicio CRM
 * 
 * Tests vitest para el CRM agroecológico mínimo
 */

import { describe, it, expect } from 'vitest';
import {
  CONTACT_TYPE,
  CONTACT_STATUS,
  INTERACTION_TYPE,
  INTERACTION_TYPE_LABELS,
} from '../../constants/crmConstants.js';

describe('crmService - Constantes', () => {
  it('debería tener tipos de contacto definidos', () => {
    expect(CONTACT_TYPE.CAMPESINO).toBe('campesino');
    expect(CONTACT_TYPE.TECNICO).toBe('tecnico');
    expect(CONTACT_TYPE.COMPRADOR).toBe('comprador');
    expect(CONTACT_TYPE.VIVERO).toBe('vivero');
    expect(CONTACT_TYPE.OTRO).toBe('otro');
  });

  it('debería tener tipos de interacción definidos', () => {
    expect(INTERACTION_TYPE.VISITA).toBe('visita');
    expect(INTERACTION_TYPE.INTERCAMBIO_SEMILLA).toBe('intercambio_semilla');
    expect(INTERACTION_TYPE.VENTA).toBe('venta');
    expect(INTERACTION_TYPE.ASESORIA).toBe('asesoria');
    expect(INTERACTION_TYPE.LLAMADA).toBe('llamada');
    expect(INTERACTION_TYPE.MENSAJE).toBe('mensaje');
    expect(INTERACTION_TYPE.OTRO).toBe('otro');
  });

  it('debería tener estados de contacto definidos', () => {
    expect(CONTACT_STATUS.ACTIVO).toBe('activo');
    expect(CONTACT_STATUS.INACTIVO).toBe('inactivo');
    expect(CONTACT_STATUS.ARCHIVADO).toBe('archivado');
  });

  it('debería tener etiquetas legibles para tipos de contacto', () => {
    expect(INTERACTION_TYPE_LABELS[INTERACTION_TYPE.VISITA]).toBe('Visita');
    expect(INTERACTION_TYPE_LABELS[INTERACTION_TYPE.INTERCAMBIO_SEMILLA]).toBe('Intercambio de Semilla');
    expect(INTERACTION_TYPE_LABELS[INTERACTION_TYPE.VENTA]).toBe('Venta');
    expect(INTERACTION_TYPE_LABELS[INTERACTION_TYPE.ASESORIA]).toBe('Asesoría');
  });

  it('los tipos de contacto deberían ser inmutables (Object.freeze)', () => {
    expect(() => {
      CONTACT_TYPE.CAMPESINO = 'otro';
    }).toThrow();
  });

  it('los tipos de interacción deberían ser inmutables (Object.freeze)', () => {
    expect(() => {
      INTERACTION_TYPE.VISITA = 'otro';
    }).toThrow();
  });
});
