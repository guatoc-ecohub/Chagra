// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import MiFincaVivaScreen from '../MiFincaVivaScreen';

// IDB de procesos mockeada (por defecto finca vacía → invita a sembrar).
const listFarmProcessesMock = vi.fn(() => Promise.resolve([]));
const getFarmEventsMock = vi.fn(() => Promise.resolve([]));
vi.mock('../../../db/farmProcessCache', () => ({
  listFarmProcesses: (...args) => listFarmProcessesMock(...args),
  getFarmEvents: (...args) => getFarmEventsMock(...args),
}));

// Perfil mínimo (sin red). ScreenShell → NotificationsBell usa otros exports.
vi.mock('../../../services/userProfileService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getProfile: () => ({ fincaSlug: 'finca-juli', vocacion: 'finca_diversificada' }),
  };
});

// TTS: no hay Web Speech en jsdom; mockeamos para verificar que se invoca.
const speakMock = vi.fn();
vi.mock('../../../services/ttsService', () => ({
  speak: (...a) => speakMock(...a),
  stop: vi.fn(),
  isSupported: () => true,
}));

// Sonido del agente: stub (Web Audio no existe en jsdom).
vi.mock('../../../services/agentSoundService', () => ({
  agentSounds: { chime: vi.fn(), listen: vi.fn(), start: vi.fn(), error: vi.fn(), cancel: vi.fn() },
  isSoundEnabled: () => true,
  setSoundEnabled: vi.fn(),
}));

// Procesos en el shape REAL de producción (anidado en `attributes`), tal como
// los devuelve farmProcessCache. fincaGameService los aplana internamente.
const fincaProspera = () =>
  ['coffea_arabica', 'theobroma_cacao', 'musa_paradisiaca', 'persea_americana',
    'phaseolus_vulgaris', 'zea_mays', 'inga_edulis', 'citrus_limon'].map((slug, i) => ({
    process_id: `p${i}`,
    type: 'farm_process',
    attributes: {
      process_type: i % 2 === 0 ? 'sowing' : 'agroforestry',
      status: 'active',
      current_stage: ['vegetative', 'flowering', 'fruiting', 'mature'][i % 4],
      subject_slug: slug,
      companions: i < 3 ? ['inga_edulis'] : [],
    },
  }));

// Eventos reales (anidados) que getFarmEvents devolvería para cada proceso.
const eventosProspera = () => [
  { event_id: 'e1', type: 'farm_process_event', attributes: { event_type: 'harvest_confirmed', payload: { quantity: 12 }, occurred_at: 1 } },
  { event_id: 'e2', type: 'farm_process_event', attributes: { event_type: 'pest_management_confirmed', payload: { method: 'biopreparado bio' }, occurred_at: 2 } },
];

describe('MiFincaVivaScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    speakMock.mockClear();
    listFarmProcessesMock.mockReset();
    listFarmProcessesMock.mockResolvedValue([]);
    getFarmEventsMock.mockReset();
    getFarmEventsMock.mockResolvedValue([]);
  });

  /** Helper: configura una finca próspera (procesos + eventos hidratados). */
  function setProspera() {
    listFarmProcessesMock.mockResolvedValue(fincaProspera());
    getFarmEventsMock.mockResolvedValue(eventosProspera());
  }

  it('monta el juego con su título y testid', async () => {
    render(<MiFincaVivaScreen />);
    expect(await screen.findByTestId('mi-finca-viva-screen')).toBeTruthy();
    expect(screen.getAllByText('Mi Finca Viva').length).toBeGreaterThan(0);
  });

  it('lee los procesos de la cache local (offline-first)', async () => {
    render(<MiFincaVivaScreen />);
    await waitFor(() => expect(listFarmProcessesMock).toHaveBeenCalledWith({ status: 'active' }));
  });

  it('finca vacía: muestra la invitación a sembrar (no un mundo muerto)', async () => {
    render(<MiFincaVivaScreen />);
    expect(await screen.findByTestId('finca-vacia-invitacion')).toBeTruthy();
    expect(screen.getByText('¡Empieza tu finca!')).toBeTruthy();
  });

  it('finca vacía: el botón de sembrar navega a la acción real', async () => {
    const onNavigate = vi.fn();
    render(<MiFincaVivaScreen onNavigate={onNavigate} />);
    const btn = await screen.findByText('🌱 Sembrar mi primera planta');
    fireEvent.click(btn);
    expect(onNavigate).toHaveBeenCalledWith('sembrar');
  });

  it('expone la entrada a Mundo Subsuelo y navega a su ruta (ux-audit P1-1)', async () => {
    const onNavigate = vi.fn();
    render(<MiFincaVivaScreen onNavigate={onNavigate} />);
    const entrada = await screen.findByTestId('entrada-subsuelo');
    expect(entrada).toBeTruthy();
    fireEvent.click(entrada);
    expect(onNavigate).toHaveBeenCalledWith('subsuelo');
  });

  it('expone la entrada a Mi finca en 3D (Odyssey) y navega a finca_odyssey', async () => {
    const onNavigate = vi.fn();
    render(<MiFincaVivaScreen onNavigate={onNavigate} />);
    const entrada = await screen.findByTestId('entrada-finca-odyssey');
    expect(entrada).toBeTruthy();
    fireEvent.click(entrada);
    expect(onNavigate).toHaveBeenCalledWith('finca_odyssey');
  });

  it('expone la entrada a Mono vs Poli y navega a mono_vs_poli (rescate huérfano)', async () => {
    const onNavigate = vi.fn();
    render(<MiFincaVivaScreen onNavigate={onNavigate} />);
    const entrada = await screen.findByTestId('entrada-mono-vs-poli');
    expect(entrada).toBeTruthy();
    fireEvent.click(entrada);
    expect(onNavigate).toHaveBeenCalledWith('mono_vs_poli');
  });

  it('siempre muestra la galería de criaturas (con siluetas si vacía)', async () => {
    render(<MiFincaVivaScreen />);
    expect(await screen.findByTestId('criatura-collection')).toBeTruthy();
    // Vacía → todas bloqueadas
    const quetzal = screen.getByTestId('criatura-quetzal');
    expect(quetzal.getAttribute('data-unlocked')).toBe('false');
  });

  it('finca próspera: muestra misiones y desbloquea criaturas', async () => {
    setProspera();
    render(<MiFincaVivaScreen />);
    expect(await screen.findByTestId('misiones-juego')).toBeTruthy();
    // mariposa desbloqueada con diversidad real
    await waitFor(() => {
      const mariposa = screen.getByTestId('criatura-mariposa');
      expect(mariposa.getAttribute('data-unlocked')).toBe('true');
    });
  });

  it('finca próspera: el mundo crece de nivel (escena con data-level > 0)', async () => {
    setProspera();
    render(<MiFincaVivaScreen />);
    await waitFor(() => {
      const scene = screen.getByTestId('finca-world-scene');
      expect(Number(scene.getAttribute('data-level'))).toBeGreaterThan(0);
    });
  });

  it('narra con TTS al entrar (audio para niñas que leen poco)', async () => {
    render(<MiFincaVivaScreen />);
    await screen.findByTestId('mi-finca-viva-screen');
    await waitFor(() => expect(speakMock).toHaveBeenCalled());
  });

  it('celebra subida de nivel la primera vez que sube vs lo persistido', async () => {
    // El usuario ya había visto nivel 0; ahora la finca es próspera (sube).
    localStorage.setItem('chagra:juego-finca:finca-juli', JSON.stringify({ lastLevel: 0, misionesHechas: [] }));
    setProspera();
    render(<MiFincaVivaScreen />);
    expect(await screen.findByTestId('level-up-celebration')).toBeTruthy();
    expect(screen.getByText('¡Subiste de nivel!')).toBeTruthy();
  });

  it('NO celebra si el nivel no cambió desde la última visita', async () => {
    setProspera();
    // Primer render para fijar lastLevel
    const { unmount } = render(<MiFincaVivaScreen />);
    await screen.findByTestId('mi-finca-viva-screen');
    await waitFor(() => expect(listFarmProcessesMock).toHaveBeenCalled());
    unmount();
    // Segundo render: mismo nivel → sin celebración
    render(<MiFincaVivaScreen />);
    await screen.findByTestId('mi-finca-viva-screen');
    await waitFor(() => {
      expect(screen.queryByTestId('level-up-celebration')).toBeNull();
    });
  });

  it('marcar una misión de aprender la deja cumplida y persiste', async () => {
    setProspera();
    render(<MiFincaVivaScreen />);
    const mision = await screen.findByTestId('mision-aprender_ficha');
    const yaLoAprendi = within(mision).getByText('Ya lo aprendí');
    fireEvent.click(yaLoAprendi);
    await waitFor(() => {
      expect(screen.getByTestId('mision-aprender_ficha').getAttribute('data-done')).toBe('true');
    });
    // Persistió
    const stored = JSON.parse(localStorage.getItem('chagra:juego-finca:finca-juli'));
    expect(stored.misionesHechas).toContain('aprender_ficha');
  });

  it('botón de audio alterna sin romper', async () => {
    render(<MiFincaVivaScreen />);
    await screen.findByTestId('mi-finca-viva-screen');
    const toggle = screen.getByLabelText('Apagar el sonido');
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Encender el sonido')).toBeTruthy();
  });
});
