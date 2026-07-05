/**
 * ProfileScreen.hub.test.jsx — rediseño "El Morral" (hub-and-spoke bento,
 * 2026-07-05). Reemplaza ProfileScreen.tabs.test.jsx (las 5 pestañas fueron
 * superadas por el hub: mapa completo de secciones con estado vivo).
 *
 * Verifica:
 *   - el hub renderiza la cédula de identidad + TODAS las tarjetas de sección,
 *   - entrar a una sección muestra su panel y "Mi perfil" devuelve al hub,
 *   - la GALERÍA DE TEMAS (preview nueva) vive en Apariencia, con una tarjeta
 *     por tema, y tocar una aplica el tema (persistencia localStorage),
 *   - el nivel de respuestas (nuevo en perfil) persiste en el perfil,
 *   - los testids/funcionalidad heredados sobreviven (foto de perfil,
 *     telemetry-consent-toggle, operator-override-toggle),
 *   - la tarjeta Ayuda es acción directa (chagra:nav → ayuda).
 *
 * Se mockea VoiceSelector (fetch de voces Kokoro bajo jsdom) — la mecánica
 * bajo prueba es el hub, no ese panel.
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import ProfileScreen from '../ProfileScreen';
import { getProfile } from '../../services/userProfileService';

vi.mock('../Settings/VoiceSelector', () => ({ default: () => null }));
vi.mock('../HytaPanel', () => ({ default: () => null }));

const SECTION_IDS = [
  'apariencia', 'agente', 'datos', 'finca', 'inicio',
  'privacidad', 'respaldo', 'ayuda', 'avanzado',
];

describe('ProfileScreen — el morral (hub bento)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('el hub renderiza la cédula y las 9 tarjetas de sección', () => {
    render(<ProfileScreen onBack={() => {}} onHome={() => {}} />);
    expect(screen.getByTestId('profile-identity-card')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: /secciones del perfil/i });
    for (const id of SECTION_IDS) {
      expect(within(nav).getByTestId(`profile-section-${id}`)).toBeInTheDocument();
    }
    // La foto de perfil (testids heredados) vive en la cédula del hub.
    expect(screen.getByTestId('profile-photo-button')).toBeInTheDocument();
    expect(screen.getByTestId('profile-photo-input')).toBeInTheDocument();
  });

  test('entrar a "Mis datos" muestra el formulario y se puede volver al hub', () => {
    render(<ProfileScreen onBack={() => {}} onHome={() => {}} />);
    fireEvent.click(screen.getByTestId('profile-section-datos'));

    expect(screen.getByTestId('profile-panel-datos')).toBeInTheDocument();
    expect(screen.getByText(/datos del trabajador/i)).toBeInTheDocument();
    // El hub ya no está montado.
    expect(screen.queryByTestId('profile-identity-card')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('profile-back-to-hub'));
    expect(screen.getByTestId('profile-identity-card')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-panel-datos')).not.toBeInTheDocument();
  });

  test('Apariencia trae la galería de temas con preview y aplicar persiste', () => {
    render(<ProfileScreen onBack={() => {}} onHome={() => {}} />);
    fireEvent.click(screen.getByTestId('profile-section-apariencia'));

    const gallery = screen.getByTestId('theme-gallery');
    // Una tarjeta-preview por tema del catálogo base (auto + biopunk2 +
    // biopunk + nature + minimalista; verde-vivo solo con flag finca viva).
    for (const id of ['auto', 'biopunk2', 'biopunk', 'nature', 'minimalista']) {
      expect(within(gallery).getByTestId(`theme-card-${id}`)).toBeInTheDocument();
    }
    // El fondo de la app sigue accesible en la misma sección.
    expect(screen.getByText(/fondo de la app/i)).toBeInTheDocument();

    const natureCard = within(gallery).getByTestId('theme-card-nature');
    fireEvent.click(natureCard);
    expect(natureCard).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('chagra:theme')).toBe('nature');
    expect(document.documentElement.getAttribute('data-theme')).toBe('nature');
  });

  test('el nivel de respuestas del agente persiste en el perfil', () => {
    render(<ProfileScreen onBack={() => {}} onHome={() => {}} />);
    fireEvent.click(screen.getByTestId('profile-section-agente'));

    const maestro = screen.getByTestId('nivel-respuestas-maestro');
    fireEvent.click(maestro);
    expect(maestro).toHaveAttribute('aria-checked', 'true');
    expect(getProfile()?.nivel_respuestas).toBe('maestro');
  });

  test('los toggles heredados conservan sus testids (privacidad y avanzado)', () => {
    render(<ProfileScreen onBack={() => {}} onHome={() => {}} />);

    fireEvent.click(screen.getByTestId('profile-section-privacidad'));
    expect(screen.getByTestId('telemetry-consent-toggle')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('profile-back-to-hub'));
    fireEvent.click(screen.getByTestId('profile-section-avanzado'));
    expect(screen.getByTestId('operator-override-toggle')).toBeInTheDocument();
  });

  test('la tarjeta Ayuda dispara navegación directa (chagra:nav → ayuda)', () => {
    const onNav = vi.fn();
    window.addEventListener('chagra:nav', onNav);
    try {
      render(<ProfileScreen onBack={() => {}} onHome={() => {}} />);
      fireEvent.click(screen.getByTestId('profile-section-ayuda'));
      expect(onNav).toHaveBeenCalledTimes(1);
      expect(onNav.mock.calls[0][0].detail).toEqual({ view: 'ayuda' });
      // No cambia a una sección interna: el hub sigue montado.
      expect(screen.getByTestId('profile-identity-card')).toBeInTheDocument();
    } finally {
      window.removeEventListener('chagra:nav', onNav);
    }
  });
});
