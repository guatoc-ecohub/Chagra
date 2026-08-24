/**
 * Integration Gateway para fuentes agro externas vía MCP.
 *
 * El gateway separa cuatro responsabilidades que suelen quedar mezcladas en
 * un cliente de datos:
 *
 *   IntegrationGateway
 *     -> CapabilityGateway
 *       -> Connector       (lectura/sync en vivo)
 *       -> Importer        (normalización one-shot, solo en memoria)
 *       -> ExternalReferencer (búsqueda y enlace a una fuente)
 *
 * Este módulo es un esqueleto OSS del lado cliente. Los gateways concretos
 * llaman wrappers explícitos de sidecarClient.js, nunca construyen rutas MCP
 * a partir de input libre. Ninguna operación persiste Assets, Logs o campos
 * derivados.
 */

import {
  getClimaIdeam,
  getClimaSnapshot,
  getNormativaIca,
  getPrecioSipsa,
} from './sidecarClient.js';

export const INTEGRATION_IDS = Object.freeze({
  IDEAM: 'ideam',
  SIPSA: 'sipsa',
  ICA: 'ica',
});

export const CAPABILITY_IDS = Object.freeze({
  IDEAM_SERIES: 'climate-series',
  IDEAM_SNAPSHOT: 'climate-snapshot',
  SIPSA_PRICES: 'market-prices',
  ICA_REGISTRY: 'agrochemical-registry',
});

const DEFAULT_MONITOR_INTERVAL_MS = 30 * 60 * 1000;
const DEFAULT_WATCHDOG_MS = 2 * DEFAULT_MONITOR_INTERVAL_MS;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeInput(input) {
  return isObject(input) ? input : {};
}

function failedResult(source, capability, reason = 'connector_failed') {
  return {
    ok: false,
    source,
    capability,
    reason,
    data: null,
  };
}

function normalizeRecords(payload, kind, source) {
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.records)
      ? payload.records
      : Array.isArray(payload?.observations)
        ? payload.observations
        : [payload];

  return candidates
    .filter(isObject)
    .map((data) => ({
      kind,
      source,
      observedAt: data.observed_at || data.observedAt || data.fecha || null,
      data,
    }));
}

/**
 * Connector: la única pieza autorizada a leer una fuente externa.
 */
export class IntegrationConnector {
  constructor({ id, source, capability, read }) {
    if (typeof read !== 'function') throw new TypeError('Connector requires a read function');
    this.id = id;
    this.source = source;
    this.capability = capability;
    this.read = read;
  }

  async pull(input = {}) {
    try {
      const data = await this.read(safeInput(input));
      if (data == null) return failedResult(this.source, this.capability, 'unavailable');
      if (data?._error === true) {
        return failedResult(this.source, this.capability, data.reason || 'source_error');
      }
      return {
        ok: true,
        source: this.source,
        capability: this.capability,
        fetchedAt: new Date().toISOString(),
        data,
      };
    } catch (_) {
      // Los wrappers del sidecar ya degradan sin throw. Esta capa conserva el
      // contrato si en el futuro se conecta un adapter distinto.
      return failedResult(this.source, this.capability);
    }
  }
}

/**
 * Importer: convierte una lectura externa en candidatos consumibles por la UI
 * o por una futura capa de revisión humana. No tiene acceso a la base local.
 */
export class IntegrationImporter {
  constructor({ connector, normalize }) {
    if (!(connector instanceof IntegrationConnector)) throw new TypeError('Importer requires a Connector');
    if (typeof normalize !== 'function') throw new TypeError('Importer requires a normalize function');
    this.connector = connector;
    this.normalize = normalize;
  }

  async import(input = {}) {
    const envelope = await this.connector.pull(input);
    if (!envelope.ok) return { ...envelope, records: [] };

    try {
      const records = this.normalize(envelope.data, safeInput(input));
      return {
        ...envelope,
        importedAt: new Date().toISOString(),
        records: Array.isArray(records) ? records : [],
      };
    } catch (_) {
      return { ...failedResult(envelope.source, envelope.capability, 'normalize_failed'), records: [] };
    }
  }
}

/**
 * ExternalReferencer: devuelve resultados para buscar y enlazar una fuente,
 * sin convertirlos en entidades persistidas automáticamente.
 */
export class IntegrationExternalReferencer {
  constructor({ connector, normalize = (payload, _query) => payload }) {
    if (!(connector instanceof IntegrationConnector)) throw new TypeError('Referencer requires a Connector');
    this.connector = connector;
    this.normalize = normalize;
  }

  async search(query = {}) {
    const envelope = await this.connector.pull(query);
    if (!envelope.ok) return { ...envelope, matches: [] };

    try {
      const matches = this.normalize(envelope.data, safeInput(query));
      return { ...envelope, matches: Array.isArray(matches) ? matches : [] };
    } catch (_) {
      return { ...failedResult(envelope.source, envelope.capability, 'normalize_failed'), matches: [] };
    }
  }
}

/**
 * Monitor resiliente: cadena setTimeout para evitar intervalos solapados y un
 * watchdog que reprograma el ciclo si una promesa queda colgada.
 */
export class IntegrationMonitor {
  constructor({ source, capability, probe, intervalMs = DEFAULT_MONITOR_INTERVAL_MS, watchdogMs = DEFAULT_WATCHDOG_MS, onUpdate = (_result) => {}, onWatchdog = (_event) => {} }) {
    if (typeof probe !== 'function') throw new TypeError('Monitor requires a probe function');
    this.source = source;
    this.capability = capability;
    this.probe = probe;
    this.intervalMs = intervalMs;
    this.watchdogMs = Math.max(watchdogMs, intervalMs);
    this.onUpdate = onUpdate;
    this.onWatchdog = onWatchdog;
    this.active = false;
    this.timer = null;
    this.watchdogTimer = null;
    this.inFlight = false;
    this.inFlightCycle = null;
    this.lastStartedAt = 0;
    this.lastCompletedAt = 0;
    this.lastResult = null;
  }

  start(input = {}) {
    if (this.active) return this;
    this.active = true;
    this.input = safeInput(input);
    this.lastCompletedAt = Date.now();
    this._schedule(0);
    this._scheduleWatchdog();
    return this;
  }

  stop() {
    this.active = false;
    if (this.timer != null) clearTimeout(this.timer);
    if (this.watchdogTimer != null) clearTimeout(this.watchdogTimer);
    this.timer = null;
    this.watchdogTimer = null;
    this.inFlightCycle = null;
  }

  _schedule(delayMs) {
    if (!this.active) return;
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this._poll();
    }, delayMs);
  }

  _scheduleWatchdog() {
    if (!this.active) return;
    this.watchdogTimer = setTimeout(() => {
      this.watchdogTimer = null;
      this._checkWatchdog();
      this._scheduleWatchdog();
    }, Math.min(this.watchdogMs, 1000));
  }

  async _poll() {
    if (!this.active || this.inFlight) return;
    const cycle = {};
    this.inFlight = true;
    this.inFlightCycle = cycle;
    this.lastStartedAt = Date.now();

    let result;
    try {
      result = await this.probe(this.input);
    } catch (_) {
      result = failedResult(this.source, this.capability);
    }

    if (this.inFlightCycle !== cycle) return;
    this.lastCompletedAt = Date.now();
    this.lastResult = result;
    this.inFlight = false;
    this.inFlightCycle = null;
    try {
      this.onUpdate(result);
    } catch (_) {
      // A UI subscriber cannot kill the monitor loop.
    }
    this._schedule(this.intervalMs);
  }

  _checkWatchdog() {
    if (!this.active) return;
    const reference = this.inFlight ? this.lastStartedAt : this.lastCompletedAt;
    if (reference == null || Date.now() - reference <= this.watchdogMs) return;

    const staleCycle = this.inFlightCycle;
    this.inFlight = false;
    this.inFlightCycle = null;
    this._schedule(0);
    try {
      this.onWatchdog({ source: this.source, capability: this.capability, restarted: true });
    } catch (_) {
      // Watchdog observers are advisory.
    }
    // Keep the local variable explicit for debuggers without retaining the
    // stale promise. Its eventual result is ignored by the cycle check.
    void staleCycle;
  }
}

/**
 * Agrupa capabilities de una misma fuente y expone el contrato tipo
 * IntegrationGateway del reporte original.
 */
export class CapabilityGateway {
  constructor({ id, connector, importer = null, referencer = null, monitorOptions = {} }) {
    if (!(connector instanceof IntegrationConnector)) throw new TypeError('Capability requires a Connector');
    this.id = id;
    this.connector = connector;
    this.importer = importer;
    this.referencer = referencer;
    this.monitorOptions = monitorOptions;
  }

  getConnector() {
    return this.connector;
  }

  getImporter() {
    return this.importer;
  }

  getReferencer() {
    return this.referencer;
  }

  async validateAccess(input = {}) {
    return this.connector.pull(input);
  }

  getMonitor(options = {}) {
    return new IntegrationMonitor({
      source: this.connector.source,
      capability: this.id,
      probe: (input) => this.connector.pull(input),
      ...this.monitorOptions,
      ...options,
    });
  }
}

export class IntegrationGateway {
  constructor({ id, label, capabilities }) {
    if (!id || !Array.isArray(capabilities) || capabilities.length === 0) {
      throw new TypeError('Gateway requires an id and at least one capability');
    }
    this.id = id;
    this.label = label || id;
    this.capabilities = new Map(capabilities.map((capability) => [capability.id, capability]));
  }

  getCapability(capabilityId) {
    return this.capabilities.get(capabilityId) || null;
  }

  getConnector(capabilityId) {
    return this.getCapability(capabilityId)?.getConnector() || null;
  }

  getImporter(capabilityId) {
    return this.getCapability(capabilityId)?.getImporter() || null;
  }

  getReferencer(capabilityId) {
    return this.getCapability(capabilityId)?.getReferencer() || null;
  }

  getMonitor(capabilityId, options = {}) {
    return this.getCapability(capabilityId)?.getMonitor(options) || null;
  }
}

export class IntegrationManager {
  constructor() {
    this.gateways = new Map();
    this.monitors = new Set();
  }

  register(gateway) {
    if (!(gateway instanceof IntegrationGateway)) throw new TypeError('Manager accepts IntegrationGateway instances');
    this.gateways.set(gateway.id, gateway);
    return gateway;
  }

  get(integrationId) {
    return this.gateways.get(integrationId) || null;
  }

  list() {
    return [...this.gateways.values()];
  }

  async validateAccess(integrationId, capabilityId, input = {}) {
    const capability = this.get(integrationId)?.getCapability(capabilityId);
    return capability ? capability.validateAccess(input) : failedResult(integrationId, capabilityId, 'not_configured');
  }

  startMonitor(integrationId, capabilityId, options = {}) {
    const monitor = this.get(integrationId)?.getMonitor(capabilityId, options);
    if (!monitor) return null;
    monitor.start(options.input || {});
    this.monitors.add(monitor);
    return monitor;
  }

  stopMonitor(monitor) {
    if (!monitor) return;
    monitor.stop();
    this.monitors.delete(monitor);
  }

  stopAll() {
    for (const monitor of this.monitors) monitor.stop();
    this.monitors.clear();
  }
}

function sourceRecords(payload, kind, source) {
  return normalizeRecords(payload, kind, source);
}

const ideamSeriesConnector = new IntegrationConnector({
  id: 'ideam-series-connector',
  source: INTEGRATION_IDS.IDEAM,
  capability: CAPABILITY_IDS.IDEAM_SERIES,
  read: ({ action = 'climate_series', ...args }) => getClimaIdeam(action, args),
});

const ideamSnapshotConnector = new IntegrationConnector({
  id: 'ideam-snapshot-connector',
  source: INTEGRATION_IDS.IDEAM,
  capability: CAPABILITY_IDS.IDEAM_SNAPSHOT,
  read: (args) => getClimaSnapshot(args),
});

const sipsaConnector = new IntegrationConnector({
  id: 'sipsa-prices-connector',
  source: INTEGRATION_IDS.SIPSA,
  capability: CAPABILITY_IDS.SIPSA_PRICES,
  read: ({ action = 'latest_price', ...args }) => getPrecioSipsa(action, args),
});

const icaConnector = new IntegrationConnector({
  id: 'ica-registry-connector',
  source: INTEGRATION_IDS.ICA,
  capability: CAPABILITY_IDS.ICA_REGISTRY,
  read: ({ action = 'latest_active_ingredients', ...args }) => getNormativaIca(action, args),
});

export const ideamGateway = new IntegrationGateway({
  id: INTEGRATION_IDS.IDEAM,
  label: 'IDEAM',
  capabilities: [
    new CapabilityGateway({
      id: CAPABILITY_IDS.IDEAM_SERIES,
      connector: ideamSeriesConnector,
      importer: new IntegrationImporter({
        connector: ideamSeriesConnector,
        normalize: (payload) => sourceRecords(payload, 'climate-observation', INTEGRATION_IDS.IDEAM),
      }),
    }),
    new CapabilityGateway({
      id: CAPABILITY_IDS.IDEAM_SNAPSHOT,
      connector: ideamSnapshotConnector,
      importer: new IntegrationImporter({
        connector: ideamSnapshotConnector,
        normalize: (payload) => sourceRecords(payload, 'climate-snapshot', INTEGRATION_IDS.IDEAM),
      }),
    }),
  ],
});

export const sipsaGateway = new IntegrationGateway({
  id: INTEGRATION_IDS.SIPSA,
  label: 'SIPSA',
  capabilities: [
    new CapabilityGateway({
      id: CAPABILITY_IDS.SIPSA_PRICES,
      connector: sipsaConnector,
      importer: new IntegrationImporter({
        connector: sipsaConnector,
        normalize: (payload) => sourceRecords(payload, 'market-price', INTEGRATION_IDS.SIPSA),
      }),
      referencer: new IntegrationExternalReferencer({
        connector: sipsaConnector,
        normalize: (payload) => sourceRecords(payload, 'market-price-reference', INTEGRATION_IDS.SIPSA),
      }),
    }),
  ],
});

export const icaGateway = new IntegrationGateway({
  id: INTEGRATION_IDS.ICA,
  label: 'ICA',
  capabilities: [
    new CapabilityGateway({
      id: CAPABILITY_IDS.ICA_REGISTRY,
      connector: icaConnector,
      importer: new IntegrationImporter({
        connector: icaConnector,
        normalize: (payload) => sourceRecords(payload, 'regulatory-record', INTEGRATION_IDS.ICA),
      }),
      referencer: new IntegrationExternalReferencer({
        connector: icaConnector,
        normalize: (payload) => sourceRecords(payload, 'regulatory-reference', INTEGRATION_IDS.ICA),
      }),
    }),
  ],
});

export const integrationManager = new IntegrationManager();
for (const gateway of [ideamGateway, sipsaGateway, icaGateway]) {
  integrationManager.register(gateway);
}
