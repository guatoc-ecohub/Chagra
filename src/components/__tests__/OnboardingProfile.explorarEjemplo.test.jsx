// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * OnboardingProfile — SKIP rico "Explorar con finca de ejemplo".
 *
 * El botón solo aparece si se pasa `onExplorarEjemplo`. Al tocarlo, marca el
 * perfil como saltado y delega en el callback (que siembra la finca de ejemplo
 * y entra al home poblado). Sin el prop, no se muestra (retrocompatible).
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import OnboardingProfile from '../_archivo/OnboardingProfile';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => cleanup());

describe('OnboardingProfile — explorar con finca de ejemplo', () => {
  it('sin onExplorarEjemplo NO muestra el botón', () => {
    render(<OnboardingProfile onComplete={vi.fn()} />);
    expect(screen.queryByTestId('onboarding-explorar-ejemplo')).toBeNull();
  });

  it('con onExplorarEjemplo muestra el botón y lo delega al tocarlo', async () => {
    const onExplorarEjemplo = vi.fn(() => Promise.resolve());
    render(
      <OnboardingProfile onComplete={vi.fn()} onExplorarEjemplo={onExplorarEjemplo} />,
    );

    const btn = screen.getByTestId('onboarding-explorar-ejemplo');
    expect(btn).toBeTruthy();
    fireEvent.click(btn);

    await waitFor(() => expect(onExplorarEjemplo).toHaveBeenCalledTimes(1));
  });
});
