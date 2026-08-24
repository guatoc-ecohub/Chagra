import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  CAPABILITY_IDS,
  IntegrationConnector,
  IntegrationExternalReferencer,
  IntegrationGateway,
  IntegrationImporter,
  IntegrationManager,
  IntegrationMonitor,
  CapabilityGateway,
  integrationManager,
} from '../integrationGateway.js';

afterEach(() => {
  integrationManager.stopAll();
  vi.useRealTimers();
});

describe('Integration Gateway', () => {
  it('expone los gateways agro concretos en el manager singleton', () => {
    expect(integrationManager.list().map((gateway) => gateway.id)).toEqual(['ideam', 'sipsa', 'ica']);
    expect(integrationManager.get('ideam').getConnector(CAPABILITY_IDS.IDEAM_SERIES)).toBeTruthy();
    expect(integrationManager.get('sipsa').getImporter(CAPABILITY_IDS.SIPSA_PRICES)).toBeTruthy();
    expect(integrationManager.get('ica').getReferencer(CAPABILITY_IDS.ICA_REGISTRY)).toBeTruthy();
  });

  it('normaliza una importación sin persistirla ni mutar el payload', async () => {
    const payload = { observations: [{ fecha: '2026-08-23', value: 18 }] };
    const connector = new IntegrationConnector({
      id: 'fixture-connector',
      source: 'fixture',
      capability: 'fixture-capability',
      read: vi.fn().mockResolvedValue(payload),
    });
    const importer = new IntegrationImporter({
      connector,
      normalize: (data) => data.observations.map((observation) => ({
        ...observation,
        source: 'fixture',
      })),
    });

    const result = await importer.import();

    expect(result.ok).toBe(true);
    expect(result.records).toEqual([{ fecha: '2026-08-23', value: 18, source: 'fixture' }]);
    expect(payload).toEqual({ observations: [{ fecha: '2026-08-23', value: 18 }] });
  });

  it('degrada null y errores de source a un contrato observable', async () => {
    const connector = new IntegrationConnector({
      id: 'failing-connector',
      source: 'fixture',
      capability: 'fixture-capability',
      read: vi.fn().mockRejectedValue(new Error('network failure')), 
    });
    const importer = new IntegrationImporter({
      connector,
      normalize: () => [],
    });

    await expect(importer.import()).resolves.toMatchObject({
      ok: false,
      reason: 'connector_failed',
      records: [],
    });
  });

  it('referencer entrega matches y no crea entidades', async () => {
    const connector = new IntegrationConnector({
      id: 'referencer-connector',
      source: 'fixture',
      capability: 'fixture-capability',
      read: vi.fn().mockResolvedValue({ rows: [{ id: 'A-1' }] }),
    });
    const referencer = new IntegrationExternalReferencer({
      connector,
      normalize: (payload) => payload.rows,
    });

    await expect(referencer.search({ query: 'producto' })).resolves.toMatchObject({
      ok: true,
      matches: [{ id: 'A-1' }],
    });
  });

  it('monitor usa cadena setTimeout y actualiza el estado', async () => {
    vi.useFakeTimers();
    const onUpdate = vi.fn();
    const probe = vi.fn().mockResolvedValue({ ok: true, data: { value: 1 } });
    const monitor = new IntegrationMonitor({
      source: 'fixture',
      capability: 'fixture-capability',
      probe,
      intervalMs: 100,
      watchdogMs: 250,
      onUpdate,
    });

    monitor.start({ finca: 'demo' });
    await vi.advanceTimersByTimeAsync(0);
    expect(probe).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({ ok: true, data: { value: 1 } });

    await vi.advanceTimersByTimeAsync(100);
    expect(probe).toHaveBeenCalledTimes(2);
    monitor.stop();
    await vi.advanceTimersByTimeAsync(500);
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it('watchdog vuelve a programar cuando una lectura queda colgada', async () => {
    vi.useFakeTimers();
    const onWatchdog = vi.fn();
    const probe = vi.fn()
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValue({ ok: true, data: { value: 2 } });
    const monitor = new IntegrationMonitor({
      source: 'fixture',
      capability: 'fixture-capability',
      probe,
      intervalMs: 100,
      watchdogMs: 250,
      onWatchdog,
    });

    monitor.start();
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(onWatchdog).toHaveBeenCalledWith({
      source: 'fixture',
      capability: 'fixture-capability',
      restarted: true,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(probe).toHaveBeenCalledTimes(2);

    monitor.stop();
  });

  it('manager puede registrar y consultar una gateway custom', async () => {
    const connector = new IntegrationConnector({
      id: 'custom-connector',
      source: 'custom',
      capability: 'custom-capability',
      read: vi.fn().mockResolvedValue({ available: true }),
    });
    const gateway = new IntegrationGateway({
      id: 'custom',
      label: 'Custom',
      capabilities: [new CapabilityGateway({ id: 'custom-capability', connector })],
    });
    const manager = new IntegrationManager();
    manager.register(gateway);

    await expect(manager.validateAccess('custom', 'custom-capability')).resolves.toMatchObject({
      ok: true,
      data: { available: true },
    });
  });
});
