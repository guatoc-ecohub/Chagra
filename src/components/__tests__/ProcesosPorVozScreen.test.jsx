/**
 * ProcesosPorVozScreen — cablea el subsistema FarmProcess (antes "oscuro").
 *
 * Contrato cubierto (flujo feliz, externos mockeados, buildDraftsFromVoice REAL):
 *   grabar → transcribir → extraer → draft → tarjeta de confirmación (gate
 *   humano) → createFarmProcess (escritura atómica) → estado "registrado".
 * Garantiza que el flujo de voz queda conectado de punta a punta y que NO se
 * persiste sin confirmación humana.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

// vi.hoisted: las fns mock viven por encima de los vi.mock hoisteados.
const { createFarmProcess, transcribe, extractEntities, enrichEntitiesWithRag } = vi.hoisted(() => ({
  createFarmProcess: vi.fn(),
  transcribe: vi.fn(),
  extractEntities: vi.fn(),
  enrichEntitiesWithRag: vi.fn(),
}));

vi.mock('../../hooks/useVoiceRecorder', () => ({
  default: () => ({
    audioLevel: 0, durationMs: 0, hardLimitMs: 30000, error: null, amplitudeHistory: [],
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue({ blob: new Blob(['x'], { type: 'audio/webm' }), durationMs: 1000 }),
    reset: vi.fn(),
  }),
}));
vi.mock('../../services/voiceService', () => ({ transcribe }));
vi.mock('../../services/entityExtractor', () => ({ extractEntities }));
vi.mock('../../services/voiceRagEnricher', () => ({ enrichEntitiesWithRag }));
vi.mock('../../services/farmEventService', () => ({ createFarmProcess, recordFarmEvent: vi.fn() }));
vi.mock('../../store/useAssetStore', () => ({
  default: (sel) => sel({ lands: [{ id: 'land-1', type: 'asset--land', attributes: { name: 'Invernadero' } }] }),
}));

import ProcesosPorVozScreen from '../ProcesosPorVozScreen';

beforeEach(() => {
  createFarmProcess.mockReset().mockResolvedValue({ process_id: 'p1', status: 'recorded_local_pending_sync' });
  transcribe.mockReset().mockResolvedValue('sembré 5 fresas en el invernadero');
  extractEntities.mockReset().mockResolvedValue([
    { crop: 'fresa', quantity: 5, cropSlug: 'fragaria_x_ananassa', canonical: 'Fresa', location: { id: 'land-1', type: 'asset--land', name: 'Invernadero' } },
  ]);
  enrichEntitiesWithRag.mockReset().mockImplementation((e) => Promise.resolve({ entities: e, summary: {} }));
});
afterEach(() => cleanup());

describe('ProcesosPorVozScreen — procesos por voz (FarmProcess wired)', () => {
  it('parte en idle con el botón de grabar', () => {
    render(<ProcesosPorVozScreen onBack={() => {}} onSave={() => {}} />);
    expect(screen.getByLabelText('Iniciar grabación')).toBeTruthy();
  });

  it('NO persiste sin confirmación: createFarmProcess solo se llama al confirmar', async () => {
    const onSave = vi.fn();
    render(<ProcesosPorVozScreen onBack={() => {}} onSave={onSave} />);

    fireEvent.click(screen.getByLabelText('Iniciar grabación'));
    fireEvent.click(await screen.findByLabelText('Detener grabación'));

    // Llega a la tarjeta de confirmación (gate humano) sin haber persistido.
    const confirmBtn = await screen.findByText(/Confirmar siembra/i, {}, { timeout: 3000 });
    expect(createFarmProcess).not.toHaveBeenCalled();

    fireEvent.click(confirmBtn);

    await waitFor(() => expect(createFarmProcess).toHaveBeenCalledTimes(1));
    // El draft confirmado lleva la especie y el lote resueltos.
    const persisted = createFarmProcess.mock.calls[0][0];
    expect(persisted.type).toBe('farm_process');
    expect(persisted.attributes.location_land_asset_id).toBe('land-1');
    expect(Number(persisted.attributes.quantity)).toBe(5);
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });
});
