/**
 * TopBar.operatorPhoto.test.jsx — el ícono de usuario muestra la foto de
 * perfil del operador, con fallback al ícono CircleUser (feature 2026-06-15).
 */
import React from 'react';
import { render, screen, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockPhoto = '';
vi.mock('../../services/operatorPhotoService', () => ({
  getOperatorPhoto: () => mockPhoto,
}));

// Sub-componentes pesados / con store o red → stubs (igual que TopBar.voicePlant).
vi.mock('../OfflineChip', () => ({ default: () => <div data-testid="chip-stub" /> }));
vi.mock('../NotificationsBell', () => ({ default: () => <div data-testid="bell-stub" /> }));

import TopBar from '../TopBar';

describe('TopBar — foto de perfil del operador', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPhoto = '';
  });

  it('sin foto muestra el ícono por defecto (no <img>)', () => {
    render(<TopBar onNavigate={vi.fn()} onLogout={vi.fn()} />);
    const menuBtn = screen.getByTestId('topbar-user-menu');
    expect(within(menuBtn).queryByTestId('topbar-user-photo')).toBeNull();
  });

  it('con foto renderiza la imagen dentro del botón de usuario', () => {
    mockPhoto = 'data:image/jpeg;base64,FOTO';
    render(<TopBar onNavigate={vi.fn()} onLogout={vi.fn()} />);
    const img = screen.getByTestId('topbar-user-photo');
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,FOTO');
    expect(img.closest('[data-testid="topbar-user-menu"]')).not.toBeNull();
  });

  it('reacciona en vivo al evento chagra:operator-update', () => {
    render(<TopBar onNavigate={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.queryByTestId('topbar-user-photo')).toBeNull();

    // El operador sube una foto en Perfil → el servicio emite el evento.
    mockPhoto = 'data:image/jpeg;base64,NUEVA';
    act(() => {
      window.dispatchEvent(new CustomEvent('chagra:operator-update', {
        detail: { key: 'chagra:operator:photo:v1', value: mockPhoto },
      }));
    });

    expect(screen.getByTestId('topbar-user-photo')).toHaveAttribute('src', 'data:image/jpeg;base64,NUEVA');
  });
});
