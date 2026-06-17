import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

const profileServiceMock = vi.hoisted(() => ({
  getNotificationStyle: vi.fn(() => 'demo'),
  setNotificationStyle: vi.fn(),
  getTelemetryConsent: vi.fn(() => false),
  setTelemetryConsent: vi.fn(),
  getModuleVisibility: vi.fn(() => ({
    hoyfinca: true,
    clima: true,
    analisis: true,
    plantas: true,
    zonas: true,
    insumos: true,
    bitacora: true,
    hoy: true,
    plagas: true,
    biodiversidad: true,
    informes: true,
  })),
  setModuleVisibility: vi.fn(),
  hasManualModuleVisibility: vi.fn(() => false),
  getProfile: vi.fn(() => ({ vocacion: 'urbano', finca_tipo: 'terraza' })),
}));

vi.mock('../common/ScreenShell', () => ({
  ScreenShell: ({ children }) => <div>{children}</div>,
}));
vi.mock('../../config/extensionistaAccess', () => ({ esExtensionistaActual: () => false }));
vi.mock('../common/ThemeSelector', () => ({ default: () => <div /> }));
vi.mock('../Settings/AgentAvatarSelector', () => ({ default: () => <div /> }));
vi.mock('../Settings/BackgroundSelector', () => ({ default: () => <div /> }));
vi.mock('../BackupExportButton', () => ({ default: () => <div /> }));
vi.mock('../CuadernoPDFButton', () => ({ default: () => <div /> }));
vi.mock('../Settings/VoiceSelector', () => ({ default: () => <div /> }));
vi.mock('../HytaPanel', () => ({ default: () => <div /> }));
vi.mock('../../config/workerConfig', () => ({ PRIMARY_WORKER_NAME: 'Worker' }));
vi.mock('../../services/fincaActiveStore', () => ({
  default: () => ({
    activeFincaSlug: 'guatoc',
    fincas: [],
    gpsOverride: false,
    gpsHistoryEnabled: false,
    clearGpsOverride: vi.fn(),
    setGpsHistoryEnabled: vi.fn(),
    getActiveFinca: () => ({ nombre: 'Guatoc' }),
  }),
}));
vi.mock('../../store/usePrefsStore', () => ({
  default: (selector) => selector({ ttsEnabled: false, setTtsEnabled: vi.fn() }),
}));
vi.mock('../../services/ttsService', () => ({ stop: vi.fn() }));
vi.mock('../../services/operatorPhotoService', () => ({
  getOperatorPhoto: vi.fn(() => ''),
  setOperatorPhotoFromFile: vi.fn(async () => ''),
  removeOperatorPhotoLocal: vi.fn(),
}));
vi.mock('../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: () => false,
  esOperadorActual: () => false,
}));
vi.mock('../../services/homeModuleSelector', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    selectHomeModuleVisibilityMap: vi.fn(() => ({
      hoyfinca: true,
      clima: true,
      analisis: false,
      plantas: true,
      zonas: false,
      insumos: false,
      bitacora: true,
      hoy: false,
      plagas: true,
      biodiversidad: false,
      informes: false,
    })),
  };
});
vi.mock('../../services/userProfileService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    HOME_MODULES: actual.HOME_MODULES,
    getNotificationStyle: (...args) => profileServiceMock.getNotificationStyle(...args),
    setNotificationStyle: (...args) => profileServiceMock.setNotificationStyle(...args),
    getTelemetryConsent: (...args) => profileServiceMock.getTelemetryConsent(...args),
    setTelemetryConsent: (...args) => profileServiceMock.setTelemetryConsent(...args),
    getModuleVisibility: (...args) => profileServiceMock.getModuleVisibility(...args),
    setModuleVisibility: (...args) => profileServiceMock.setModuleVisibility(...args),
    hasManualModuleVisibility: (...args) => profileServiceMock.hasManualModuleVisibility(...args),
    getProfile: (...args) => profileServiceMock.getProfile(...args),
  };
});

import ProfileScreen from '../ProfileScreen';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => cleanup());

describe('ProfileScreen module visibility', () => {
  test('mount does not persist derived defaults as a manual preference', async () => {
    render(<ProfileScreen onBack={vi.fn()} onHome={vi.fn()} />);

    fireEvent.click(screen.getByRole('tab', { name: /Módulos/i }));

    await waitFor(() => expect(screen.getByText(/Módulos del Home/i)).toBeInTheDocument());
    expect(profileServiceMock.setModuleVisibility).not.toHaveBeenCalled();
  });

  test('switch interaction persists the manual preference', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(<ProfileScreen onBack={vi.fn()} onHome={vi.fn()} />);

    fireEvent.click(screen.getByRole('tab', { name: /Módulos/i }));
    fireEvent.click(screen.getByRole('switch', { name: /Mostrar u ocultar Plantas/i }));

    await waitFor(() => expect(profileServiceMock.setModuleVisibility).toHaveBeenCalledTimes(1));
    expect(profileServiceMock.setModuleVisibility.mock.calls[0][0]).toMatchObject({ plantas: false });
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'chagra:module-visibility-changed' }));
    dispatchSpy.mockRestore();
  });
});
