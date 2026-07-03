/**
 * CaminoPrimerCultivo.test.jsx — onboarding ilustrado "el camino del primer
 * cultivo" (home F2, productor con 0 siembras).
 *
 * Contrato visual: bienvenida en usted, 3 pasos tocables (nunca un muro),
 * el paso en curso visible ("Paso X de 3"), pasos hechos marcados, CTA de
 * cada paso conectado al router del caller (sin lógica de datos propia),
 * "Omitir por ahora" persistido en el dispositivo (offline-first).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';

// Lecturas puras de estado existente (perfil + piso térmico): mockeadas para
// controlar el avance sin tocar localStorage del perfil real.
vi.mock('../../../services/userProfileService', () => ({
  getProfile: vi.fn(() => ({ finca_altitud: '', piso_confirmado: '' })),
}));
vi.mock('../../../services/locationService', () => ({
  getPisoTermicoInfo: vi.fn(() => ({ slug: 'frío', label: 'Frío', emoji: '⛅' })),
}));

import CaminoPrimerCultivo from '../CaminoPrimerCultivo';
import { getProfile } from '../../../services/userProfileService';

const STORAGE_KEY = 'chagra:camino-primer-cultivo:v1';

beforeEach(() => {
  localStorage.clear();
  vi.mocked(getProfile).mockReturnValue({ finca_altitud: '', piso_confirmado: '' });
});

describe('CaminoPrimerCultivo', () => {
  test('productor nuevo: bienvenida, Paso 1 de 3 y los 3 pasos tocables', () => {
    const onNavigate = vi.fn();
    render(<CaminoPrimerCultivo onNavigate={onNavigate} plantsCount={0} />);

    expect(screen.getByText('Bienvenido a Chagra')).toBeInTheDocument();
    expect(screen.getByTestId('cpc-paso-actual')).toHaveTextContent('Paso 1 de 3');

    // Los 3 pasos existen y son botones (ningún paso es un muro).
    expect(screen.getByTestId('cpc-paso-ubicar')).toBeEnabled();
    expect(screen.getByTestId('cpc-paso-sembrar')).toBeEnabled();
    expect(screen.getByTestId('cpc-paso-agente')).toBeEnabled();

    // Paso 1 navega al detector de ubicación (flujo existente).
    fireEvent.click(screen.getByTestId('cpc-paso-ubicar'));
    expect(onNavigate).toHaveBeenCalledWith('ubicacion-detectada');
  });

  test('con el piso confirmado: paso 1 listo, en curso Paso 2, y siembra usa rutaSiembra', () => {
    vi.mocked(getProfile).mockReturnValue({ finca_altitud: '2600', piso_confirmado: '1' });
    const onNavigate = vi.fn();
    render(
      <CaminoPrimerCultivo onNavigate={onNavigate} plantsCount={0} rutaSiembra="registro_unificado" />
    );

    expect(screen.getByTestId('cpc-paso-actual')).toHaveTextContent('Paso 2 de 3');
    // El paso hecho lo dice en su nombre accesible y muestra el resumen del piso.
    expect(
      screen.getByRole('button', { name: /Paso 1: Ubique su finca \(listo\)/ })
    ).toBeInTheDocument();
    expect(screen.getByText(/Clima frío, a unos 2600 m/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cpc-paso-sembrar'));
    expect(onNavigate).toHaveBeenCalledWith('registro_unificado');
  });

  test('conocer al asistente navega a agente y queda marcado (persistido)', () => {
    const onNavigate = vi.fn();
    render(<CaminoPrimerCultivo onNavigate={onNavigate} plantsCount={0} />);

    fireEvent.click(screen.getByTestId('cpc-paso-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).agenteVisto).toBe(true);
    // Al volver al home, el paso 3 aparece como listo.
    expect(
      screen.getByRole('button', { name: /Paso 3: Conozca a su asistente \(listo\)/ })
    ).toBeInTheDocument();
  });

  test('"Omitir por ahora" lo oculta y persiste entre montajes', () => {
    const { unmount } = render(<CaminoPrimerCultivo onNavigate={vi.fn()} plantsCount={0} />);
    fireEvent.click(screen.getByTestId('cpc-omitir'));
    expect(screen.queryByTestId('camino-primer-cultivo')).not.toBeInTheDocument();

    unmount();
    render(<CaminoPrimerCultivo onNavigate={vi.fn()} plantsCount={0} />);
    expect(screen.queryByTestId('camino-primer-cultivo')).not.toBeInTheDocument();
  });

  test('camino completo (3 de 3): no ocupa el home', () => {
    vi.mocked(getProfile).mockReturnValue({ finca_altitud: '2600', piso_confirmado: '1' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ omitido: false, agenteVisto: true }));
    render(<CaminoPrimerCultivo onNavigate={vi.fn()} plantsCount={3} />);
    expect(screen.queryByTestId('camino-primer-cultivo')).not.toBeInTheDocument();
  });

  test('storage corrupto no rompe: arranca el camino desde cero', () => {
    localStorage.setItem(STORAGE_KEY, '{no-es-json');
    render(<CaminoPrimerCultivo onNavigate={vi.fn()} plantsCount={0} />);
    expect(screen.getByTestId('camino-primer-cultivo')).toBeInTheDocument();
    expect(screen.getByTestId('cpc-paso-actual')).toHaveTextContent('Paso 1 de 3');
  });

  test('accesibilidad: sección etiquetada y pasos en lista ordenada', () => {
    render(<CaminoPrimerCultivo onNavigate={vi.fn()} plantsCount={0} />);
    expect(
      screen.getByRole('region', { name: 'El camino de su primer cultivo' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});
