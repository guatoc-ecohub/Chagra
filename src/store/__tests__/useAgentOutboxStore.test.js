import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../services/agentOutboxService', function () {
  return { enqueue: vi.fn(), getAll: vi.fn(), getInFlight: vi.fn() };
});

import useAgentOutboxStore from '../useAgentOutboxStore';
import { enqueue as svcEnqueue, getAll as svcGetAll, getInFlight as svcGetInFlight } from '../../services/agentOutboxService';

describe('useAgentOutboxStore', function () {
  beforeEach(function () {
    vi.clearAllMocks();
    useAgentOutboxStore.setState({ items: [], inFlight: [], loading: false });
  });

  it('arranca con defaults', function () {
    var s = useAgentOutboxStore.getState();
    expect(s.items).toEqual([]);
    expect(s.loading).toBe(false);
  });

  it('refresh carga del servicio', async function () {
    svcGetAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    svcGetInFlight.mockResolvedValue([{ id: 1 }]);
    await useAgentOutboxStore.getState().refresh();
    expect(useAgentOutboxStore.getState().items).toHaveLength(2);
  });

  it('refresh no explota con error', async function () {
    svcGetAll.mockRejectedValue(new Error('fail'));
    await useAgentOutboxStore.getState().refresh();
    expect(useAgentOutboxStore.getState().loading).toBe(false);
  });

  it('send persiste y refresca', async function () {
    svcEnqueue.mockResolvedValue(42);
    svcGetAll.mockResolvedValue([{ id: 42 }]);
    svcGetInFlight.mockResolvedValue([{ id: 42 }]);
    var id = await useAgentOutboxStore.getState().send({ text: 'hi' });
    expect(id).toBe(42);
  });

  it('send propaga error', async function () {
    svcEnqueue.mockRejectedValue(new Error('fail'));
    await expect(
      useAgentOutboxStore.getState().send({ text: 'x' })
    ).rejects.toThrow('fail');
  });
});
