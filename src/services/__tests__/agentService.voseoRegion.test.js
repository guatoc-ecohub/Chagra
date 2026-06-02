/**
 * agentService.voseoRegion.test.js — Tareas C1/C2.
 *
 * Cablea la región lingüística del perfil del usuario hacia el filtro de
 * voseo region-aware (voseoFilter.filterVoseo). El engine ya distingue
 * regiones voseantes (paisa/pacífico/pastuso, donde el voseo es el registro
 * AUTÉNTICO y se preserva) de las tuteantes (caribe) y ustedeantes (resto).
 * Lo que faltaba era resolver la región desde el perfil y pasarla en los
 * call sites. Estos tests cubren:
 *
 *   C2 — resolveUserRegion(): del perfil (departamento/municipio/region) a la
 *        clave de región. Sin señal → null (default seguro).
 *   C1 — applyVoseoFilter() respeta la región resuelta:
 *        - usuario de Antioquia (paisa) → su voseo se PRESERVA.
 *        - usuario de Bogotá (cundiboyacense) → se aplana a usted.
 *        - usuario sin región → comportamiento default (aplana a usted).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resolveUserRegion, applyVoseoFilter } from '../agentService.js';
import { saveProfile } from '../userProfileService.js';

describe('C2 — resolveUserRegion (región del perfil)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sin perfil devuelve null (default seguro)', () => {
    expect(resolveUserRegion()).toBeNull();
  });

  it('resuelve paisa desde profile.departamento "Antioquia"', () => {
    saveProfile({ departamento: 'Antioquia' });
    expect(resolveUserRegion()).toBe('paisa');
  });

  it('resuelve cundiboyacense desde profile.departamento "Cundinamarca"', () => {
    saveProfile({ departamento: 'Cundinamarca' });
    expect(resolveUserRegion()).toBe('cundiboyacense');
  });

  it('resuelve cundiboyacense desde el caso especial "Bogotá, D.C."', () => {
    saveProfile({ departamento: 'Bogotá, D.C.' });
    expect(resolveUserRegion()).toBe('cundiboyacense');
  });

  it('resuelve caribe desde el caso especial "La Guajira"', () => {
    saveProfile({ departamento: 'La Guajira' });
    expect(resolveUserRegion()).toBe('caribe');
  });

  it('resuelve pacifico (voseante) desde "Valle del Cauca"', () => {
    saveProfile({ departamento: 'Valle del Cauca' });
    expect(resolveUserRegion()).toBe('pacifico');
  });

  it('resuelve pastuso desde "Nariño" (con tilde)', () => {
    saveProfile({ departamento: 'Nariño' });
    expect(resolveUserRegion()).toBe('pastuso');
  });

  it('cae a municipio cuando no hay departamento directo', () => {
    // Perfil sin `departamento` pero con `municipio` → findMunicipio resuelve
    // el departamento del dataset DANE → región.
    saveProfile({ municipio: 'Medellín' });
    expect(resolveUserRegion()).toBe('paisa');
  });

  it('cae a region (texto libre "Municipio, Depto") cuando es lo único disponible', () => {
    saveProfile({ region: 'Popayán, Cauca' });
    expect(resolveUserRegion()).toBe('pacifico');
  });

  it('departamento desconocido o no mapeado devuelve null (seguro)', () => {
    saveProfile({ departamento: 'Guaviare' });
    expect(resolveUserRegion()).toBeNull();
  });
});

describe('C1 — applyVoseoFilter respeta la región del usuario', () => {
  const VOSEO_TEXT = 'Vos tenés que regar el cultivo, mirá bien la tierra.';

  beforeEach(() => {
    localStorage.clear();
  });

  it('usuario paisa (Antioquia): PRESERVA el voseo', () => {
    saveProfile({ departamento: 'Antioquia' });
    const out = applyVoseoFilter(VOSEO_TEXT);
    expect(out).toContain('Vos');
    expect(out).toContain('tenés');
    expect(out).toContain('mirá');
  });

  it('usuario cundiboyacense (Bogotá): aplana a usted', () => {
    saveProfile({ departamento: 'Cundinamarca' });
    const out = applyVoseoFilter(VOSEO_TEXT);
    expect(out).not.toContain('Vos');
    expect(out).not.toContain('tenés');
    expect(out).not.toContain('mirá');
    expect(out.toLowerCase()).toContain('usted');
  });

  it('usuario sin región: comportamiento default (aplana a usted)', () => {
    // localStorage limpio → resolveUserRegion null → engine default.
    const out = applyVoseoFilter(VOSEO_TEXT);
    expect(out).not.toContain('Vos');
    expect(out).not.toContain('tenés');
    expect(out.toLowerCase()).toContain('usted');
  });

  it('region explícita en opts gana sobre el perfil', () => {
    // Perfil dice cundiboyacense pero el caller fuerza paisa → preserva voseo.
    saveProfile({ departamento: 'Cundinamarca' });
    const out = applyVoseoFilter(VOSEO_TEXT, { region: 'paisa' });
    expect(out).toContain('tenés');
  });

  it('region: null explícito en opts fuerza el default (no resuelve del perfil)', () => {
    // Aunque el perfil sea paisa, region:null pedido explícito → aplana.
    saveProfile({ departamento: 'Antioquia' });
    const out = applyVoseoFilter(VOSEO_TEXT, { region: null });
    expect(out).not.toContain('tenés');
  });

  it('en región voseante limpia igual el léxico rioplatense', () => {
    saveProfile({ departamento: 'Antioquia' });
    const out = applyVoseoFilter('Che, vos tenés que laburar la huerta.');
    // El voseo se preserva...
    expect(out).toContain('tenés');
    // ...pero el léxico argentino SIEMPRE se limpia.
    expect(out.toLowerCase()).not.toContain('che');
    expect(out.toLowerCase()).not.toContain('laburar');
  });
});
