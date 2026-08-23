/**
 * estadosLaminaViva.test.js — el vocabulario de estados de la familia
 * lámina-viva (Taita Jaguar, Oso Protector, Chivito Punk) como DATOS PUROS.
 * Verifica que cada compai llegue a >= la base de Angelita:
 *   1. El canon cubre los 10 estados de Angelita + caminando.
 *   2. canonEstadoLamina normaliza el vocabulario de Angelita y los alias.
 *   3. Los nombres OFICIALES y la narración accesible existen por compai,
 *      sin em dashes (fingerprint prohibido en copy UI).
 *   4. La fila de idle del chivito ('chivito-punk') YA existe en el
 *      repertorio (el bug que dejaba su idle mudo), con peso 70/30.
 */
import { describe, it, expect } from 'vitest';
import {
  ESTADOS_LAMINA,
  canonEstadoLamina,
  COMPAI_LAMINA,
  ARIA_LAMINA,
  ariaLamina,
} from '../estadosLaminaViva.js';
import { VIDA_REPERTORIO, elegirMomentoVida } from '../../vidaEstados.js';

/* Los seis que faltaban de la base de Angelita (además de idle/thinking/
   speaking/listening que ya tenía la familia). */
const SEIS_NUEVOS = ['contenta', 'preocupada', 'no-se', 'senala', 'invita', 'husmea'];

describe('1. El canon cubre la base de Angelita + caminando', () => {
  it('están los cuatro históricos, los seis nuevos y caminando (11)', () => {
    for (const e of ['idle', 'thinking', 'speaking', 'listening', 'caminando', ...SEIS_NUEVOS]) {
      expect(ESTADOS_LAMINA, e).toContain(e);
    }
    expect(ESTADOS_LAMINA).toHaveLength(11);
  });

  it('cada compai (jaguar/oso/chivito) narra los seis estados nuevos', () => {
    for (const slug of ['jaguar', 'oso-baston', 'chivito-punk']) {
      for (const e of SEIS_NUEVOS) {
        expect(ariaLamina(slug, e), `${slug}:${e}`).toBeTruthy();
      }
    }
  });
});

describe('2. canonEstadoLamina — normaliza el vocabulario de Angelita', () => {
  it('las palabras de Angelita caen en el canon del rig', () => {
    expect(canonEstadoLamina('acompana')).toBe('idle');
    expect(canonEstadoLamina('escuchando')).toBe('listening');
    expect(canonEstadoLamina('pensando')).toBe('thinking');
    expect(canonEstadoLamina('respondiendo')).toBe('speaking');
    expect(canonEstadoLamina('celebra')).toBe('contenta');
    expect(canonEstadoLamina('alerta')).toBe('preocupada');
    expect(canonEstadoLamina('nose')).toBe('no-se');
    expect(canonEstadoLamina('señala')).toBe('senala');
    expect(canonEstadoLamina('venga')).toBe('invita');
    expect(canonEstadoLamina('olfatea')).toBe('husmea');
    expect(canonEstadoLamina('anda')).toBe('caminando');
  });

  it('mayúsculas/espacios no importan; desconocido y vacío caen a idle', () => {
    expect(canonEstadoLamina('  LISTENING ')).toBe('listening');
    expect(canonEstadoLamina('cualquier-cosa')).toBe('idle');
    expect(canonEstadoLamina('')).toBe('idle');
    expect(canonEstadoLamina(undefined)).toBe('idle');
  });
});

describe('3. Nombres oficiales y narración accesible', () => {
  it('usa los nombres OFICIALES de la lane', () => {
    expect(COMPAI_LAMINA.jaguar.nombre).toBe('Taita Jaguar');
    expect(COMPAI_LAMINA.oso.nombre).toBe('Oso Protector');
    expect(COMPAI_LAMINA.chivito.nombre).toBe('Chivito Punk');
  });

  it('la aria de cada estado nombra al compai oficial y no trae em dashes', () => {
    for (const [slug, tabla] of Object.entries(ARIA_LAMINA)) {
      for (const [estado, texto] of Object.entries(tabla)) {
        expect(texto, `${slug}:${estado}`).not.toContain('—'); // em dash prohibido en copy UI
        expect(texto.length, `${slug}:${estado}`).toBeGreaterThan(0);
      }
    }
    expect(ariaLamina('jaguar', 'idle')).toContain('Taita Jaguar');
    expect(ariaLamina('oso-baston', 'contenta')).toContain('Oso Protector');
    expect(ariaLamina('chivito-punk', 'no-se')).toContain('Chivito Punk');
  });

  it('slug desconocido → aria vacía (el consumidor cae a su aria de siempre)', () => {
    expect(ariaLamina('no-existe', 'idle')).toBe('');
  });
});

describe('4. El idle del Chivito Punk quedó cableado (el bug del idle mudo)', () => {
  it("'chivito-punk' tiene repertorio con rockea/apunta/reposo", () => {
    const r = VIDA_REPERTORIO['chivito-punk'];
    expect(r).toBeTruthy();
    expect(Object.keys(r.momentos).sort()).toEqual(['apunta', 'reposo', 'rockea']);
    // Antes devolvía null (sin fila) → el chivito nunca gesticulaba en idle.
    expect(elegirMomentoVida('chivito-punk', null, () => 0)).toBeTruthy();
  });

  it('el peso honra el 70/30: reposo (sereno) pesa más que cualquier actuación', () => {
    const m = VIDA_REPERTORIO['chivito-punk'].momentos;
    expect(m.reposo.peso).toBeGreaterThan(m.apunta.peso);
    expect(m.reposo.peso).toBeGreaterThan(m.rockea.peso);
    // el headbang (la actuación punk pura) es lo más puntual de los tres.
    expect(m.rockea.peso).toBeLessThan(m.apunta.peso);
  });
});
