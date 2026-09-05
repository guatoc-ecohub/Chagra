/**
 * entradaSalida — los ejes `entrada` y `salida` del perfil de conducta se
 * consumen, no se reescriben.
 *
 * Contratos:
 *   - los seis compais de tinta tienen plan de entrada; Angelita y los slugs
 *     desconocidos devuelven null (su entrada actual no se toca).
 *   - cada ms del plan sale del perfil (o de los helpers por masa): el total
 *     del jaguar es EXACTAMENTE su `entrada.totalMs`.
 *   - la salida de la guacamaya está declarada como componente sin tiempos:
 *     null + hueco nombrado, nunca un número inventado.
 *   - poseDigna sigue sin consumidor y queda nombrado como hueco.
 */
import { describe, it, expect } from 'vitest';
import { PERFILES_CONDUCTA, asientaMsDe, squashImpactoDe } from '../perfilesConducta.js';
import {
  planEntradaDe, planSalidaDe, huecosDe, ESPECIES_CON_ENTRADA,
} from '../entradaSalida.js';

const SEIS = ['jaguar', 'oso-baston', 'zariguya', 'luciernaga', 'chivito-punk', 'guacamaya'];

describe('planEntradaDe', () => {
  it('los seis de tinta tienen plan; Angelita y desconocidos, null', () => {
    for (const slug of SEIS) {
      const p = planEntradaDe(slug);
      expect(p, slug).not.toBeNull();
      expect(p.fases.length, slug).toBeGreaterThan(0);
      expect(p.totalMs, slug).toBeGreaterThan(0);
      expect(p.aura).toBe(PERFILES_CONDUCTA[slug].aura);
    }
    expect(planEntradaDe('angelita')).toBeNull();
    expect(planEntradaDe('abeja-angelita')).toBeNull();
    expect(planEntradaDe('maiz')).toBeNull();
    expect(planEntradaDe(undefined)).toBeNull();
    expect(ESPECIES_CON_ENTRADA).toEqual(SEIS);
  });

  it('el tipo del plan es el tipo declarado en el perfil', () => {
    for (const slug of SEIS) {
      expect(planEntradaDe(slug).tipo).toBe(PERFILES_CONDUCTA[slug].entrada.tipo);
    }
  });

  it('jaguar: sombra(ojosMs) → cuerpo → quieto, total = entrada.totalMs', () => {
    const e = PERFILES_CONDUCTA.jaguar.entrada;
    const p = planEntradaDe('jaguar');
    expect(p.fases.map((f) => [f.nombre, f.ms])).toEqual([
      ['sombra', e.ojosMs], ['cuerpo', e.cuerpoMs], ['quieto', e.quietoMs],
    ]);
    expect(p.totalMs).toBe(e.totalMs);
  });

  it('oso: llega(caminaMs) → planta(squash por masa) → florece → quieto', () => {
    const perfil = PERFILES_CONDUCTA['oso-baston'];
    const p = planEntradaDe('oso-baston');
    expect(p.fases.map((f) => f.nombre)).toEqual(['llega', 'planta', 'florece', 'quieto']);
    expect(p.fases[0].ms).toBe(perfil.entrada.caminaMs);
    expect(p.fases[1].ms).toBe(perfil.entrada.plantaMs);
    expect(p.fases[1].vars.squash).toBeCloseTo(squashImpactoDe(perfil.masa));
    expect(p.fases[2].ms).toBe(perfil.entrada.floreceMs);
    expect(p.fases[3].ms).toBe(perfil.entrada.quietoMs);
  });

  it('zarigüeya: trote → frena(asienta por masa, squash del perfil) → yergue', () => {
    const perfil = PERFILES_CONDUCTA.zariguya;
    const p = planEntradaDe('zariguya');
    expect(p.fases.map((f) => f.nombre)).toEqual(['trote', 'frena', 'yergue']);
    expect(p.fases[0].ms).toBe(perfil.entrada.troteMs);
    expect(p.fases[0].vars.pasos).toBe(2);
    expect(p.fases[1].ms).toBe(Math.round(asientaMsDe(perfil.masa)));
    expect(p.fases[1].vars.squash).toBe(perfil.entrada.frenaSquash);
    expect(p.fases[2].ms).toBe(perfil.entrada.yergueMs);
  });

  it('luciérnaga: luz primero, cuerpo con tri-parpadeo', () => {
    const e = PERFILES_CONDUCTA.luciernaga.entrada;
    const p = planEntradaDe('luciernaga');
    expect(p.fases.map((f) => [f.nombre, f.ms])).toEqual([['luz', e.luzMs], ['cuerpo', e.cuerpoMs]]);
    expect(p.fases[1].vars.tri).toBe(true);
  });

  it('chivito: dardo → hover → posa(squash), la más corta del roster', () => {
    const e = PERFILES_CONDUCTA['chivito-punk'].entrada;
    const p = planEntradaDe('chivito-punk');
    expect(p.fases.map((f) => [f.nombre, f.ms])).toEqual([
      ['dardo', e.dardoMs], ['hover', e.hoverMs], ['posa', e.posaMs],
    ]);
    expect(p.fases[2].vars.squash).toBe(e.squash);
    for (const slug of SEIS.filter((s) => s !== 'chivito-punk')) {
      expect(planEntradaDe(slug).totalMs).toBeGreaterThan(p.totalMs);
    }
  });

  it('guacamaya: teatral con los tiempos de GuacamayaEntrada copiados en el perfil', () => {
    const e = PERFILES_CONDUCTA.guacamaya.entrada;
    const p = planEntradaDe('guacamaya');
    expect(p.fases.map((f) => [f.nombre, f.ms])).toEqual([
      ['asoma', e.asomaMs], ['quieta', e.quietaMs], ['crece', e.creceMs], ['brillo', e.brilloMs],
    ]);
  });

  it('los planes están congelados: consumir no reescribe la fuente', () => {
    const p = planEntradaDe('jaguar');
    expect(Object.isFrozen(p)).toBe(true);
    expect(Object.isFrozen(p.fases)).toBe(true);
    expect(Object.isFrozen(PERFILES_CONDUCTA.jaguar.entrada)).toBe(false);
    expect(PERFILES_CONDUCTA.jaguar.entrada.totalMs).toBe(2400);
  });
});

describe('planSalidaDe', () => {
  it('jaguar: cuerpo se apaga y los ojos quedan un poco más', () => {
    const s = PERFILES_CONDUCTA.jaguar.salida;
    const p = planSalidaDe('jaguar');
    expect(p.tipo).toBe('mistico-sombra');
    expect(p.fases.map((f) => [f.nombre, f.ms])).toEqual([['cuerpo', s.cuerpoMs], ['ojos', s.ojosMs]]);
  });

  it('oso: cuerpo y después la corona', () => {
    const s = PERFILES_CONDUCTA['oso-baston'].salida;
    const p = planSalidaDe('oso-baston');
    expect(p.fases.map((f) => [f.nombre, f.ms])).toEqual([['cuerpo', s.cuerpoMs], ['corona', s.coronaMs]]);
  });

  it('zarigüeya, luciérnaga y chivito: una fase con el ms del perfil', () => {
    expect(planSalidaDe('zariguya').fases).toEqual([{ nombre: 'corre', ms: PERFILES_CONDUCTA.zariguya.salida.ms }]);
    expect(planSalidaDe('luciernaga').fases).toEqual([{ nombre: 'deriva', ms: PERFILES_CONDUCTA.luciernaga.salida.ms }]);
    expect(planSalidaDe('chivito-punk').fases).toEqual([{ nombre: 'dardo', ms: PERFILES_CONDUCTA['chivito-punk'].salida.ms }]);
  });

  it('guacamaya: salida declarada como componente → null (hueco), no un número inventado', () => {
    expect(planSalidaDe('guacamaya')).toBeNull();
    expect(huecosDe('guacamaya').some((h) => h.includes('GuacamayaSalida'))).toBe(true);
  });

  it('Angelita: null (no se toca)', () => {
    expect(planSalidaDe('angelita')).toBeNull();
    expect(huecosDe('angelita')).toEqual([]);
  });
});

describe('huecosDe — lo que se nombra en vez de inventarse', () => {
  it('poseDigna sigue sin consumidor en los seis', () => {
    for (const slug of SEIS) {
      expect(huecosDe(slug).some((h) => h.startsWith('poseDigna')), slug).toBe(true);
    }
  });

  it('jaguar (ojos), oso (marcha, corona) y chivito (cresta) nombran lo que el rig no expone', () => {
    expect(huecosDe('jaguar').some((h) => h.startsWith('ojos-antes'))).toBe(true);
    expect(huecosDe('oso-baston').some((h) => h.startsWith('marcha'))).toBe(true);
    expect(huecosDe('oso-baston').some((h) => h.startsWith('corona'))).toBe(true);
    expect(huecosDe('chivito-punk').some((h) => h.startsWith('crestaFlick'))).toBe(true);
  });
});
