import { describe, expect, it } from 'vitest';
import { NUCLEO_APP, PENDIENTE_DECISION } from '../rutasProdChagraApp';

describe('rutas de onboarding', () => {
  it('resuelve los paths vigente y clasico al flujo condensado', () => {
    const onboardingRoutes = NUCLEO_APP.filter(({ path }) => path.startsWith('onboarding-perfil'));

    expect(onboardingRoutes).toEqual([
      expect.objectContaining({ path: 'onboarding-perfil', componente: 'OnboardingCondensado' }),
      expect.objectContaining({ path: 'onboarding-perfil-clasico', componente: 'OnboardingCondensado' }),
    ]);
    expect(PENDIENTE_DECISION).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'onboarding-perfil-clasico' })]),
    );
  });
});
