import { describe, it, expect } from 'vitest';
import {
  SCENE_KINDS,
  SCENE_ESCALAS,
  SCENE_TINTES,
  selectSceneVariant,
} from '../fincaSceneProfileSelector.js';

/**
 * Tests del SELECTOR DE VARIANTE DE ESCENA del home POR PERFIL (mockup F2
 * "Finca Viva Evolutiva"). El módulo es PURO: del perfil →
 * { kind, escala, animales, cerdos, tinte }.
 *
 * Contrato clave:
 *   - URBANO (vocacion 'urbano' O finca_tipo balcon/terraza) → kind 'balcon'
 *     (OVERRIDE DURO, gana sobre rol), nunca animales/cerdos.
 *   - finca_tipo 'invernadero' → kind 'invernadero'.
 *   - rol restaurador (+ objetivo de restaurar) → kind 'restauracion'.
 *   - rol guia_glaciar → kind 'paramo' (tinte páramo).
 *   - rural productivo (campesino/ganadero/tecnico/socio) → kind 'finca' (DEFAULT),
 *     animales/cerdos desde el perfil.
 *   - default seguro con perfil vacío/null: kind 'finca', escala media, sin animales.
 *   - REUSA deriveRole/esPerfilUrbano/profileTieneAnimales/profileTieneCerdos
 *     (no duplica la lógica de rol ni del override urbano).
 */

describe('fincaSceneProfileSelector — URBANO → balcón (override duro)', () => {
  it('vocacion urbano → balcón, sin animales/cerdos', () => {
    const v = selectSceneVariant({ vocacion: 'urbano' });
    expect(v.kind).toBe(SCENE_KINDS.balcon);
    expect(v.animales).toBe(false);
    expect(v.cerdos).toBe(false);
  });

  it('finca_tipo balcon → balcón', () => {
    expect(selectSceneVariant({ finca_tipo: 'balcon' }).kind).toBe(SCENE_KINDS.balcon);
  });

  it('finca_tipo terraza → balcón', () => {
    expect(selectSceneVariant({ finca_tipo: 'terraza' }).kind).toBe(SCENE_KINDS.balcon);
  });

  it('urbano GANA aunque declare animales (override duro, sin animales en la escena)', () => {
    const v = selectSceneVariant({ vocacion: 'urbano', animales: ['gallinas', 'cerdos'] });
    expect(v.kind).toBe(SCENE_KINDS.balcon);
    expect(v.animales).toBe(false);
    expect(v.cerdos).toBe(false);
  });

  it('escala urbana desde espacio_urbano', () => {
    expect(selectSceneVariant({ finca_tipo: 'balcon', espacio_urbano: 'materas' }).escala).toBe(
      SCENE_ESCALAS.micro,
    );
    expect(selectSceneVariant({ finca_tipo: 'balcon', espacio_urbano: 'balcon_lleno' }).escala).toBe(
      SCENE_ESCALAS.pequena,
    );
    expect(
      selectSceneVariant({ finca_tipo: 'terraza', espacio_urbano: 'terraza_grande' }).escala,
    ).toBe(SCENE_ESCALAS.media);
    // Sin espacio declarado: default urbano = pequeña.
    expect(selectSceneVariant({ vocacion: 'urbano' }).escala).toBe(SCENE_ESCALAS.pequena);
  });
});

describe('fincaSceneProfileSelector — INVERNADERO', () => {
  it('finca_tipo invernadero → kind invernadero, sin animales/cerdos', () => {
    const v = selectSceneVariant({ finca_tipo: 'invernadero', finca_hectareas: '1_5' });
    expect(v.kind).toBe(SCENE_KINDS.invernadero);
    expect(v.animales).toBe(false);
    expect(v.cerdos).toBe(false);
    expect(v.escala).toBe(SCENE_ESCALAS.media);
  });

  it('invernadero NO es urbano (no lo pisa el override balcón)', () => {
    expect(selectSceneVariant({ finca_tipo: 'invernadero' }).kind).toBe(SCENE_KINDS.invernadero);
  });
});

describe('fincaSceneProfileSelector — RESTAURADOR → restauración', () => {
  it('rol restaurador + restauracion_objetivo → restauración', () => {
    const v = selectSceneVariant({
      rol: 'restaurador',
      finca_tipo: 'rural',
      restauracion_objetivo: ['bosque', 'ribera'],
    });
    expect(v.kind).toBe(SCENE_KINDS.restauracion);
    expect(v.animales).toBe(false);
  });

  it('rol restaurador derivado por objetivo biodiversidad (sin rol explícito)', () => {
    const v = selectSceneVariant({ objetivo: ['biodiversidad'], finca_tipo: 'rural' });
    expect(v.kind).toBe(SCENE_KINDS.restauracion);
  });

  it('restaurador SIN intención declarada de restaurar → finca rural (no inventa restauración)', () => {
    // rol explícito restaurador pero sin restauracion_objetivo ni objetivo
    // biodiversidad → cae a finca (default rural), no a restauración.
    const v = selectSceneVariant({ rol: 'restaurador', finca_tipo: 'rural' });
    expect(v.kind).toBe(SCENE_KINDS.finca);
  });
});

describe('fincaSceneProfileSelector — GUÍA DE GLACIAR → páramo', () => {
  it('rol guia_glaciar explícito → páramo, tinte páramo', () => {
    const v = selectSceneVariant({ rol: 'guia_glaciar', finca_tipo: 'rural' });
    expect(v.kind).toBe(SCENE_KINDS.paramo);
    expect(v.tinte).toBe(SCENE_TINTES.paramo);
  });

  it('guía de glaciar por whitelist (opts.esGuiaGlaciar) → páramo', () => {
    const v = selectSceneVariant({ finca_tipo: 'rural' }, { esGuiaGlaciar: true });
    expect(v.kind).toBe(SCENE_KINDS.paramo);
  });
});

describe('fincaSceneProfileSelector — RURAL productivo → finca (default)', () => {
  it('campesino rural → finca, sin animales si no declara', () => {
    const v = selectSceneVariant({ vocacion: 'campesino', finca_tipo: 'rural' });
    expect(v.kind).toBe(SCENE_KINDS.finca);
    expect(v.animales).toBe(false);
    expect(v.cerdos).toBe(false);
  });

  it('ganadero con gallinas → finca con animales, sin cerdos', () => {
    const v = selectSceneVariant({ rol: 'ganadero', finca_tipo: 'rural', animales: ['gallinas'] });
    expect(v.kind).toBe(SCENE_KINDS.finca);
    expect(v.animales).toBe(true);
    expect(v.cerdos).toBe(false);
  });

  it('ganadero con cerdos → finca con animales Y cerdos', () => {
    const v = selectSceneVariant({
      rol: 'ganadero',
      finca_tipo: 'rural',
      animales: ['ganado', 'cerdos'],
    });
    expect(v.kind).toBe(SCENE_KINDS.finca);
    expect(v.animales).toBe(true);
    expect(v.cerdos).toBe(true);
  });

  it('técnico rural → finca', () => {
    expect(selectSceneVariant({ vocacion: 'tecnico', finca_tipo: 'rural' }).kind).toBe(
      SCENE_KINDS.finca,
    );
  });

  it('socio rural → finca', () => {
    expect(selectSceneVariant({ rol: 'socio', finca_tipo: 'rural' }).kind).toBe(SCENE_KINDS.finca);
  });

  it('escala rural desde finca_hectareas', () => {
    expect(
      selectSceneVariant({ finca_tipo: 'rural', finca_hectareas: 'menos_1' }).escala,
    ).toBe(SCENE_ESCALAS.pequena);
    expect(selectSceneVariant({ finca_tipo: 'rural', finca_hectareas: '5_20' }).escala).toBe(
      SCENE_ESCALAS.grande,
    );
    expect(selectSceneVariant({ finca_tipo: 'rural', finca_hectareas: 'mas_20' }).escala).toBe(
      SCENE_ESCALAS.extensa,
    );
  });
});

describe('fincaSceneProfileSelector — TINTE por piso térmico/altitud', () => {
  it('piso_termico declarado prevalece', () => {
    expect(selectSceneVariant({ finca_tipo: 'rural', piso_termico: 'frio' }).tinte).toBe(
      SCENE_TINTES.frio,
    );
  });

  it('tinte clasificado desde finca_altitud (msnm) cuando no hay piso declarado', () => {
    // 500 msnm = cálido; 2500 msnm = frío.
    expect(selectSceneVariant({ finca_tipo: 'rural', finca_altitud: '500' }).tinte).toBe(
      SCENE_TINTES.calido,
    );
    expect(selectSceneVariant({ finca_tipo: 'rural', finca_altitud: '2500' }).tinte).toBe(
      SCENE_TINTES.frio,
    );
  });

  it('default seguro de tinte = templado cuando no hay piso ni altitud', () => {
    expect(selectSceneVariant({ finca_tipo: 'rural' }).tinte).toBe(SCENE_TINTES.templado);
  });
});

describe('fincaSceneProfileSelector — DEFAULT seguro (perfil vacío/null)', () => {
  it('perfil vacío → finca, escala media, templado, sin animales', () => {
    const v = selectSceneVariant({});
    expect(v.kind).toBe(SCENE_KINDS.finca);
    expect(v.escala).toBe(SCENE_ESCALAS.media);
    expect(v.tinte).toBe(SCENE_TINTES.templado);
    expect(v.animales).toBe(false);
    expect(v.cerdos).toBe(false);
  });

  it('perfil null → variante válida (nunca null)', () => {
    const v = selectSceneVariant(null);
    expect(v).toBeTruthy();
    expect(v.kind).toBe(SCENE_KINDS.finca);
  });

  it('perfil undefined → variante válida', () => {
    expect(selectSceneVariant(undefined).kind).toBe(SCENE_KINDS.finca);
  });

  it('siempre devuelve las 5 claves del contrato', () => {
    const v = selectSceneVariant({ vocacion: 'campesino' });
    expect(Object.keys(v).sort()).toEqual(['animales', 'cerdos', 'escala', 'kind', 'tinte']);
  });
});
