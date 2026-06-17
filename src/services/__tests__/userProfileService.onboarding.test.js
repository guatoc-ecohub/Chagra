/**
 * userProfileService.onboarding.test.js — Tests del flujo onboarding → modules.
 *
 * Verifica el mapeo completo: respuestas del onboarding → perfil →
 * derivacion de rol → modulos visibles del home + chips del agente.
 */
import { describe, it, expect } from 'vitest';
import { getApplicableQuestions } from '../userProfileService.js';
import { selectChipIntents } from '../profileChipSelector.js';
import { selectHomeModules, esPerfilUrbano, HOME_MODULE_IDS, SEGUIMIENTO_KEYS } from '../homeModuleSelector.js';

describe('onboarding → perfil → modulos (end-to-end)', () => {
  it('urbano: "3 matas en terraza" → sin preguntas de animales, solo cultivo basico', () => {
    const respuestas = { finca_tipo: 'terraza', vocacion: 'urbano' };
    const questions = getApplicableQuestions(respuestas).map(q => q.id);
    const { visibles, seguimiento } = selectHomeModules(respuestas);
    const chips = selectChipIntents(respuestas);

    // No pregunta hectareas, altitud, animales, gallinas, riego.
    expect(questions).not.toContain('hectareas');
    expect(questions).not.toContain('animales');
    expect(questions).not.toContain('gallinas_manejo');
    expect(questions).not.toContain('finca_altitud');

    // Modulos: solo lo basico.
    expect(visibles).toContain(HOME_MODULE_IDS.plantas);
    expect(visibles).not.toContain(HOME_MODULE_IDS.insumos);
    expect(visibles).not.toContain(HOME_MODULE_IDS.zonas);

    // Seguimiento: NADA.
    expect(seguimiento).toEqual([]);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.silvopastoreo);

    // Chips: cultivo basico, sin silvopastoreo ni paramo.
    expect(chips.length).toBeGreaterThan(0);
    expect(chips).not.toContain('silvopastoreo');
    expect(chips).not.toContain('paramo');
    expect(typeof esPerfilUrbano(respuestas)).toBe('boolean');
    expect(esPerfilUrbano(respuestas)).toBe(true);
  });

  it('campesino: "cultivo cafe, tengo gallinas" → cultivo + animales', () => {
    const respuestas = { vocacion: 'campesino', cultivos_actuales: 'cafe', animales: ['gallinas'] };
    const questions = getApplicableQuestions(respuestas).map(q => q.id);
    const { visibles, seguimiento } = selectHomeModules(respuestas);
    const chips = selectChipIntents(respuestas);

    // Aparece gallinas_manejo (follow-up por tener gallinas).
    expect(questions).toContain('gallinas_manejo');
    expect(questions).toContain('animales');

    // Modulos: cultivo completo.
    expect(visibles).toContain(HOME_MODULE_IDS.plantas);
    expect(visibles).toContain(HOME_MODULE_IDS.insumos);

    // Seguimiento: silvopastoreo por tener animales, NO cerdos.
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.silvopastoreo);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);

    // Chips: cultivo + silvopastoreo.
    expect(chips).toContain('siembro');
    expect(chips).toContain('silvopastoreo');
    expect(chips).not.toContain('paramo');
  });

  it('porcicultor: "tengo cerdos y nada mas" → cultivo + cerdos', () => {
    const respuestas = { vocacion: 'campesino', animales: ['cerdos'] };
    const { seguimiento } = selectHomeModules(respuestas);
    const chips = selectChipIntents(respuestas);

    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.cerdos);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.silvopastoreo);
    expect(chips).toContain('silvopastoreo');
  });

  it('restaurador: "quiero restaurar bosque y paramo" → biodiversidad + reforestacion', () => {
    const respuestas = {
      rol: 'restaurador',
      objetivo: ['biodiversidad'],
      restauracion_objetivo: ['bosque', 'paramo'],
    };
    const questions = getApplicableQuestions(respuestas).map(q => q.id);
    const { visibles, seguimiento } = selectHomeModules(respuestas);

    // Muestra restauracion_objetivo (solo para restaurador/guia).
    expect(questions).toContain('restauracion_objetivo');

    // Modulos: campesino-core + biodiversidad.
    expect(visibles).toContain(HOME_MODULE_IDS.biodiversidad);
    expect(visibles).toContain(HOME_MODULE_IDS.plantas);

    // Seguimiento: reforestacion + paramo.
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.reforestacion);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.paramo);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);
  });

  it('guia_glaciar: set estrecho (clima, paramo), sin insumos ni cerdos', () => {
    const respuestas = { vocacion: 'campesino' };
    const { visibles, seguimiento } = selectHomeModules(respuestas, { esGuiaGlaciar: true });
    const chips = selectChipIntents(respuestas, { esGuiaGlaciar: true });

    expect(visibles).toContain(HOME_MODULE_IDS.clima);
    expect(visibles).toContain(HOME_MODULE_IDS.biodiversidad);
    expect(visibles).not.toContain(HOME_MODULE_IDS.insumos);
    expect(visibles).not.toContain(HOME_MODULE_IDS.zonas);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.paramo);

    expect(chips).toContain('clima');
    expect(chips).toContain('paramo');
    expect(chips).not.toContain('biopreparado');
  });

  it('campesino con cerdos: gallinas_manejo NO aparece, restauracion NO aparece', () => {
    const respuestas = { vocacion: 'campesino', animales: ['cerdos'] };
    const questions = getApplicableQuestions(respuestas).map(q => q.id);

    // gallinas_manejo solo aparece si gallinas en animales.
    expect(questions).not.toContain('gallinas_manejo');
    // restauracion_objetivo solo para restaurador/guia_glaciar.
    expect(questions).not.toContain('restauracion_objetivo');
  });

  it('urbano con gallinas: igual ve set minimo (override duro)', () => {
    const respuestas = { vocacion: 'urbano', animales: ['gallinas'], finca_tipo: 'balcon' };
    const { visibles, seguimiento } = selectHomeModules(respuestas);

    // El override urbano gana sobre animales.
    expect(visibles).not.toContain(HOME_MODULE_IDS.insumos);
    expect(visibles).not.toContain(HOME_MODULE_IDS.zonas);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.cerdos);
    expect(seguimiento).not.toContain(SEGUIMIENTO_KEYS.silvopastoreo);
    expect(seguimiento).toEqual([]);
  });

  it('tecnico: ve todas las preguntas, todos los modulos', () => {
    const respuestas = { rol: 'tecnico', vocacion: 'tecnico' };
    const { visibles, seguimiento } = selectHomeModules(respuestas);

    // Todos los modulos visibles.
    const todos = Object.values(HOME_MODULE_IDS);
    for (const id of todos) expect(visibles).toContain(id);

    // Las 4 tarjetas.
    const keys = Object.values(SEGUIMIENTO_KEYS);
    for (const k of keys) expect(seguimiento).toContain(k);
  });
});

describe('onboarding — getApplicableQuestions condicionales', () => {
  it('preguntas sin when: siempre visibles (nombre, region, vocacion)', () => {
    const q = getApplicableQuestions({});
    const ids = q.map(x => x.id);
    expect(ids).toContain('nombre');
    expect(ids).toContain('region');
    expect(ids).toContain('vocacion');
  });

  it('urbano: NO ve hectareas, altitud, animales, gallinas, riego', () => {
    const ids = getApplicableQuestions({ vocacion: 'urbano' }).map(q => q.id);
    expect(ids).not.toContain('hectareas');
    expect(ids).not.toContain('finca_altitud');
    expect(ids).not.toContain('animales');
    expect(ids).not.toContain('gallinas_manejo');
  });

  it('balcon/terraza: mismo filtro que urbano', () => {
    const ids = getApplicableQuestions({ finca_tipo: 'balcon' }).map(q => q.id);
    expect(ids).not.toContain('animales');
    expect(ids).not.toContain('finca_altitud');
  });

  it('animales con gallinas: aparece gallinas_manejo', () => {
    const ids = getApplicableQuestions({ vocacion: 'campesino', animales: ['gallinas', 'cerdos'] }).map(q => q.id);
    expect(ids).toContain('gallinas_manejo');
    expect(ids).toContain('animales');
  });

  it('animales sin gallinas: NO aparece gallinas_manejo', () => {
    const ids = getApplicableQuestions({ vocacion: 'campesino', animales: ['cerdos', 'ganado'] }).map(q => q.id);
    expect(ids).not.toContain('gallinas_manejo');
  });

  it('restaurador: aparece restauracion_objetivo', () => {
    const ids = getApplicableQuestions({ rol: 'restaurador' }).map(q => q.id);
    expect(ids).toContain('restauracion_objetivo');
  });

  it('guia_glaciar: aparece restauracion_objetivo', () => {
    const ids = getApplicableQuestions({ rol: 'guia_glaciar' }).map(q => q.id);
    expect(ids).toContain('restauracion_objetivo');
  });

  it('campesino: NO aparece restauracion_objetivo', () => {
    const ids = getApplicableQuestions({ rol: 'campesino' }).map(q => q.id);
    expect(ids).not.toContain('restauracion_objetivo');
  });
});
