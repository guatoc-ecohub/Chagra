// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import MiFincaEvolucionScreen from '../MiFincaEvolucionScreen';

// La cache de procesos (IDB) se mockea: el test no toca IndexedDB. Por defecto
// devuelve [] (finca sin datos → todo "sin datos aún").
const listFarmProcessesMock = vi.fn(() => Promise.resolve([]));
vi.mock('../../../db/farmProcessCache', () => ({
  listFarmProcesses: (...args) => listFarmProcessesMock(...args),
}));

// Perfil mínimo (sin red). La vocación define el contexto del viaje. Mock
// PARCIAL: ScreenShell → NotificationsBell → climaService usan otros exports
// (getProfileMunicipio); solo sobreescribimos getProfile.
vi.mock('../../../services/userProfileService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getProfile: () => ({ fincaSlug: 'finca-test', vocacion: 'finca_diversificada' }),
  };
});

describe('MiFincaEvolucionScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    listFarmProcessesMock.mockReset();
    listFarmProcessesMock.mockResolvedValue([]);
  });

  it('monta la pantalla con su título y testid', async () => {
    render(<MiFincaEvolucionScreen />);
    expect(await screen.findByTestId('mi-finca-evolucion-screen')).toBeTruthy();
    expect(screen.getAllByText('Cómo evoluciona tu finca').length).toBeGreaterThan(0);
  });

  it('lee los procesos del service (cache local) al montar', async () => {
    render(<MiFincaEvolucionScreen />);
    await waitFor(() => expect(listFarmProcessesMock).toHaveBeenCalled());
    expect(listFarmProcessesMock).toHaveBeenCalledWith({ status: 'active' });
  });

  it('muestra la etapa actual del viaje agroecológico', async () => {
    render(<MiFincaEvolucionScreen />);
    // Sin procesos activos → etapa 1 (Despertar) del viaje.
    expect(await screen.findByTestId('evolucion-etapa-viaje')).toBeTruthy();
    expect(screen.getByText('Tu etapa del camino')).toBeTruthy();
    expect(screen.getByText(/Despertar/)).toBeTruthy();
    expect(screen.getByText(/Etapa 1 de 6/)).toBeTruthy();
    expect(screen.getByText('Tu siguiente paso')).toBeTruthy();
  });

  it('renderiza el desglose MESMIS (5 atributos) y TAPE (10 elementos)', async () => {
    render(<MiFincaEvolucionScreen />);
    const mesmis = await screen.findByTestId('evolucion-mesmis');
    const tape = screen.getByTestId('evolucion-tape');
    // Etiquetas representativas del DR de indicadores, dentro de su sección
    // (Adaptabilidad también aparece en la tarjeta resumen embebida).
    expect(within(mesmis).getByText('Adaptabilidad')).toBeTruthy();
    expect(within(tape).getByText('Diversidad de especies y procesos')).toBeTruthy();
    expect(within(tape).getByText('Gobernanza participativa')).toBeTruthy();
  });

  it('sin datos no inventa cifras: muestra "sin datos aún"', async () => {
    render(<MiFincaEvolucionScreen />);
    await screen.findByTestId('mi-finca-evolucion-screen');
    // Finca vacía → varios indicadores sin datos (cero fabricación).
    expect(screen.getAllByText('sin datos aún').length).toBeGreaterThan(0);
  });

  it('refleja los procesos reales: con datos sube algún indicador', async () => {
    listFarmProcessesMock.mockResolvedValue([
      {
        process_id: 'p1',
        process_type: 'sowing',
        status: 'active',
        current_stage: 'vegetative',
        subject_slug: 'coffea_arabica',
        events: [{ event_type: 'harvest_confirmed', payload: { quantity: 100 } }],
      },
      {
        process_id: 'p2',
        process_type: 'sowing',
        status: 'active',
        current_stage: 'flowering',
        subject_slug: 'theobroma_cacao',
        events: [{ event_type: 'harvest_confirmed', payload: { quantity: 50 } }],
      },
    ]);
    render(<MiFincaEvolucionScreen />);
    await waitFor(() => expect(listFarmProcessesMock).toHaveBeenCalled());
    // Con procesos reales, al menos un indicador deja de estar "sin datos aún":
    // aparece al menos un score con formato "n/4".
    await waitFor(() => {
      expect(screen.getAllByText(/\/4$/).length).toBeGreaterThan(0);
    });
  });

  it('el botón volver invoca onBack', async () => {
    const onBack = vi.fn();
    render(<MiFincaEvolucionScreen onBack={onBack} />);
    await screen.findByTestId('mi-finca-evolucion-screen');
    screen.getByLabelText('Volver').click();
    expect(onBack).toHaveBeenCalled();
  });
});
