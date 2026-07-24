import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FarmOSSetupModal from '../FarmOSSetupModal';

describe('FarmOSSetupModal', () => {
  it('conserva la ayuda de conexion fuera del onboarding de perfil', () => {
    const onConfigureLater = vi.fn();
    render(
      <FarmOSSetupModal
        finca={{ nombre: 'La Ceiba' }}
        onClose={vi.fn()}
        onConfigureLater={onConfigureLater}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Configurar FarmOS' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Ver opciones técnicas/i }));
    expect(screen.getByText(/Configure el endpoint/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Configurar más tarde/i }));
    expect(onConfigureLater).toHaveBeenCalledOnce();
  });
});
