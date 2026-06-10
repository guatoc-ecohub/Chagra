import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFarmProcessConfirm } from '../useFarmProcessConfirm';

// Mock createFarmProcess
vi.mock('../../services/farmEventService', () => ({
  createFarmProcess: vi.fn(),
}));

import { createFarmProcess } from '../../services/farmEventService';

const validDraft = {
  draft_id: '01J8TESTDRAFTID000000000001',
  transcription: 'Cinco cafés en invernadero',
  process_type: 'sowing',
  subject_slug: 'coffea_arabica',
  subject_label: 'Café castillo',
  variety: '',
  quantity: 5,
  unit: 'plantas',
  subject_kind: 'individual',
  location_land_asset_id: 'land-inv-1',
  location_land_label: 'Invernadero',
  companions: [],
  antagonists: [],
  biopreparados: [],
  invasive: false,
  warnings: [],
};

describe('useFarmProcessConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('arranca en idle', () => {
    const { result } = renderHook(() => useFarmProcessConfirm());
    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
  });

  it('confirma con éxito y setea recorded_local_pending_sync', async () => {
    const mockOutcome = { process: { process_id: 'test-id' }, event: { event_id: 'evt-id' } };
    createFarmProcess.mockResolvedValue(mockOutcome);

    const { result } = renderHook(() => useFarmProcessConfirm());
    await act(async () => {
      const out = await result.current.confirm(validDraft);
      expect(out).toEqual(mockOutcome);
    });

    expect(result.current.status).toBe('recorded_local_pending_sync');
    expect(result.current.result).toEqual(mockOutcome);
    expect(createFarmProcess).toHaveBeenCalledTimes(1);
    const call = createFarmProcess.mock.lastCall[0];
    expect(call.attributes.subject_label).toBe('Café castillo');
    expect(call.attributes.quantity).toBe(5);
    expect(call.attributes.location_land_asset_id).toBe('land-inv-1');
    expect(call.type).toBe('farm_process');
  });

  it('setea failed si createFarmProcess falla', async () => {
    createFarmProcess.mockRejectedValue(new Error('IDB error'));

    const { result } = renderHook(() => useFarmProcessConfirm());
    await act(async () => {
      await expect(result.current.confirm(validDraft)).rejects.toThrow('IDB error');
    });

    expect(result.current.status).toBe('failed');
  });

  it('reset vuelve a idle', async () => {
    createFarmProcess.mockResolvedValue({ process: {}, event: {} });
    const { result } = renderHook(() => useFarmProcessConfirm());

    await act(async () => {
      await result.current.confirm(validDraft);
    });
    expect(result.current.status).toBe('recorded_local_pending_sync');

    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
  });

  it('usa suggested_date si está presente', async () => {
    createFarmProcess.mockResolvedValue({ process: {}, event: {} });
    const draftWithDate = { ...validDraft, suggested_date: 172800000000 };
    const { result } = renderHook(() => useFarmProcessConfirm());

    await act(async () => {
      await result.current.confirm(draftWithDate);
    });

    const call = createFarmProcess.mock.lastCall[0];
    expect(call.attributes.created_at).toBe(172800000000);
  });

  it('cosecha: crea proceso con status completed y current_stage closed', async () => {
    createFarmProcess.mockResolvedValue({ process: {}, event: {} });
    const harvestDraft = { ...validDraft, process_type: 'harvest', unit: 'kg' };
    const { result } = renderHook(() => useFarmProcessConfirm());

    await act(async () => {
      await result.current.confirm(harvestDraft);
    });

    const call = createFarmProcess.mock.lastCall[0];
    expect(call.attributes.process_type).toBe('harvest');
    expect(call.attributes.status).toBe('completed');
    expect(call.attributes.current_stage).toBe('closed');
    expect(call.attributes.unit).toBe('kg');
  });

  it('post-cosecha: crea proceso con status active y current_stage post_harvest', async () => {
    createFarmProcess.mockResolvedValue({ process: {}, event: {} });
    const postDraft = { ...validDraft, process_type: 'post_harvest', unit: 'kg' };
    const { result } = renderHook(() => useFarmProcessConfirm());

    await act(async () => {
      await result.current.confirm(postDraft);
    });

    const call = createFarmProcess.mock.lastCall[0];
    expect(call.attributes.process_type).toBe('post_harvest');
    expect(call.attributes.status).toBe('active');
    expect(call.attributes.current_stage).toBe('post_harvest');
    expect(call.attributes.unit).toBe('kg');
  });

  it('manejo de plagas: crea proceso con status active y current_stage pest_management', async () => {
    createFarmProcess.mockResolvedValue({ process: {}, event: {} });
    const pestDraft = { ...validDraft, process_type: 'pest_management', unit: 'litros' };
    const { result } = renderHook(() => useFarmProcessConfirm());

    await act(async () => {
      await result.current.confirm(pestDraft);
    });

    const call = createFarmProcess.mock.lastCall[0];
    expect(call.attributes.process_type).toBe('pest_management');
    expect(call.attributes.status).toBe('active');
    expect(call.attributes.current_stage).toBe('pest_management');
    expect(call.attributes.unit).toBe('litros');
  });
});
