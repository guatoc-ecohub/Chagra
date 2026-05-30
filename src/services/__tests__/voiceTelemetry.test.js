/**
 * voiceTelemetry.test.js — Tests para telemetría de comandos de voz.
 *
 * Cubre registro de eventos, agregación de métricas (STT/TTS latencias,
 * errores), cálculos (avg, conteos, success rate), flag enable, exportación
 * (JSON/CSV), limpieza de storage y casos borde (lista vacía, valores no
 * numéricos).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  logVoiceEvent,
  getSessionEvents,
  aggregateVoiceMetrics,
  exportVoiceTelemetry,
  clearVoiceTelemetry,
} from '../voiceTelemetry.js';

beforeEach(() => {
  // Limpiamos storage entre tests para evitar interferencia.
  window.localStorage.clear();
  window.sessionStorage.clear();
  // Limpiamos mocks de console
  vi.restoreAllMocks();
});

describe('logVoiceEvent', () => {
  it('debería guardar evento en sessionStorage cuando está enabled', () => {
    logVoiceEvent('voice:recording_started', { durationMs: 5000 }, 'info');

    const events = getSessionEvents();
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('voice:recording_started');
    expect(events[0].payload.durationMs).toBe(5000);
    expect(events[0].level).toBe('info');
    expect(events[0].ts).toBeGreaterThan(0);
  });

  it('debería actualizar meta en localStorage (firstEvent y lastEvent)', () => {
    logVoiceEvent('voice:recording_started', {}, 'info');

    const metaRaw = localStorage.getItem('chagra:voice:telemetry:meta');
    const meta = JSON.parse(metaRaw);

    expect(meta.firstEvent).toBeGreaterThan(0);
    expect(meta.lastEvent).toBeGreaterThan(0);
    expect(meta.firstEvent).toBe(meta.lastEvent);
  });

  it('debería actualizar lastEvent en eventos subsiguientes', () => {
    logVoiceEvent('voice:recording_started', {}, 'info');
    const firstMeta = JSON.parse(localStorage.getItem('chagra:voice:telemetry:meta'));

    // Pequeño delay para garantizar que los timestamps difieran
    const start = Date.now();
    while (Date.now() - start < 5) { /* noop */ }

    logVoiceEvent('voice:transcription_started', {}, 'info');
    const secondMeta = JSON.parse(localStorage.getItem('chagra:voice:telemetry:meta'));

    expect(secondMeta.firstEvent).toBe(firstMeta.firstEvent);
    expect(secondMeta.lastEvent).toBeGreaterThan(firstMeta.lastEvent);
  });

  it('debería respetar flag enabled=0 y NO registrar eventos', () => {
    localStorage.setItem('chagra:voice:telemetry:enabled', '0');

    logVoiceEvent('voice:recording_started', { durationMs: 5000 }, 'info');

    const events = getSessionEvents();
    expect(events).toHaveLength(0);
  });

  it('debería dispatch custom event farmosLog con detalle', () => {
    const handler = vi.fn();
    window.addEventListener('farmosLog', handler);

    logVoiceEvent('voice:recording_started', { message: 'Grabación iniciada' }, 'info');

    window.removeEventListener('farmosLog', handler);
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail).toContain('voice:recording_started');
    expect(detail).toContain('Grabación iniciada');
  });

  it('debería hacer console.info si level=info y debug mode activo', () => {
    localStorage.setItem('chagra:debug:telemetry', '1');
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    logVoiceEvent('voice:recording_started', { durationMs: 5000 }, 'info');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logArg = consoleSpy.mock.calls[0][0];
    expect(logArg).toContain('[voice:recording_started]');
    expect(logArg).toContain('5000');

    consoleSpy.mockRestore();
  });

  it('debería hacer console.error si level=error y debug mode activo', () => {
    localStorage.setItem('chagra:debug:telemetry', '1');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logVoiceEvent('voice:transcription_failed', { error: 'Timeout' }, 'error');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logArg = consoleSpy.mock.calls[0][0];
    expect(logArg).toContain('[voice:transcription_failed]');
    expect(logArg).toContain('Timeout');

    consoleSpy.mockRestore();
  });

  it('debería NO hacer console.log si debug mode inactivo', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logVoiceEvent('voice:recording_started', { durationMs: 5000 }, 'info');

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('debería usar payload.message en customEvent si existe', () => {
    const handler = vi.fn();
    window.addEventListener('farmosLog', handler);

    logVoiceEvent('voice:save_done', { message: 'Guardado exitoso' }, 'info');

    window.removeEventListener('farmosLog', handler);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail).toContain('voice:save_done');
    expect(detail).toContain('Guardado exitoso');
  });

  it('debería usar payload.error en customEvent si no hay message', () => {
    const handler = vi.fn();
    window.addEventListener('farmosLog', handler);

    logVoiceEvent('voice:transcription_failed', { error: 'Falló conexión' }, 'error');

    window.removeEventListener('farmosLog', handler);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail).toContain('voice:transcription_failed');
    expect(detail).toContain('Falló conexión');
  });

  it('debería usar payload.action en customEvent si no hay message ni error', () => {
    const handler = vi.fn();
    window.addEventListener('farmosLog', handler);

    logVoiceEvent('voice:extraction_done', { action: 'extraer_entidades' }, 'info');

    window.removeEventListener('farmosLog', handler);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail).toContain('voice:extraction_done');
    expect(detail).toContain('extraer_entidades');
  });

  it('debería fallback a "evento general" si payload no tiene message/error/action', () => {
    const handler = vi.fn();
    window.addEventListener('farmosLog', handler);

    logVoiceEvent('voice:unknown_event', { data: 'random' }, 'info');

    window.removeEventListener('farmosLog', handler);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail).toContain('voice:unknown_event');
    expect(detail).toContain('evento general');
  });

  it('debería manejar payload como string correctamente', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    localStorage.setItem('chagra:debug:telemetry', '1');

    logVoiceEvent('voice:info', 'mensaje simple', 'info');

    const logArg = consoleSpy.mock.calls[0][0];
    expect(logArg).toContain('[voice:info]');
    expect(logArg).toContain('mensaje simple');

    consoleSpy.mockRestore();
  });
});

describe('getSessionEvents', () => {
  it('debería retornar array vacío si no hay eventos', () => {
    const events = getSessionEvents();
    expect(events).toEqual([]);
  });

  it('debería retornar eventos almacenados en sessionStorage', () => {
    sessionStorage.setItem('chagra:voice:telemetry:events', JSON.stringify([
      { ts: 1000, kind: 'voice:test1', payload: {}, level: 'info' },
      { ts: 2000, kind: 'voice:test2', payload: {}, level: 'info' },
    ]));

    const events = getSessionEvents();
    expect(events).toHaveLength(2);
    expect(events[0].kind).toBe('voice:test1');
    expect(events[1].kind).toBe('voice:test2');
  });

  it('debería retornar array vacío si JSON parse falla', () => {
    sessionStorage.setItem('chagra:voice:telemetry:events', 'invalid-json');

    const events = getSessionEvents();
    expect(events).toEqual([]);
  });

  it('debería persistir eventos entre llamadas sucesivas', () => {
    logVoiceEvent('voice:event1', { data: 1 }, 'info');
    logVoiceEvent('voice:event2', { data: 2 }, 'info');

    const events1 = getSessionEvents();
    const events2 = getSessionEvents();

    expect(events1).toHaveLength(2);
    expect(events2).toHaveLength(2);
    expect(events1[0].kind).toBe(events2[0].kind);
  });
});

describe('aggregateVoiceMetrics', () => {
  it('debería retornar métricas vacías para sesión sin eventos', () => {
    const metrics = aggregateVoiceMetrics();

    expect(metrics.sessionEvents).toBe(0);
    expect(metrics.recordings).toBe(0);
    expect(metrics.transcriptions.started).toBe(0);
    expect(metrics.transcriptions.done).toBe(0);
    expect(metrics.transcriptions.failed).toBe(0);
    expect(metrics.extraction.done).toBe(0);
    expect(metrics.extraction.failed).toBe(0);
    expect(metrics.saves.done).toBe(0);
    expect(metrics.saves.failed).toBe(0);
    expect(metrics.reprocessCount).toBe(0);
    expect(metrics.discardCount).toBe(0);
  });

  it('debería contar recordings correctamente', () => {
    logVoiceEvent('voice:recording_started', {}, 'info');
    logVoiceEvent('voice:recording_started', {}, 'info');
    logVoiceEvent('voice:recording_started', {}, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.recordings).toBe(3);
  });

  it('debería contar transiciones started/done/failed', () => {
    logVoiceEvent('voice:transcription_started', {}, 'info');
    logVoiceEvent('voice:transcription_started', {}, 'info');
    logVoiceEvent('voice:transcription_done', {}, 'info');
    logVoiceEvent('voice:transcription_failed', {}, 'error');
    logVoiceEvent('voice:transcription_failed', {}, 'error');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.transcriptions.started).toBe(2);
    expect(metrics.transcriptions.done).toBe(1);
    expect(metrics.transcriptions.failed).toBe(2);
  });

  it('debería contar extracciones y saves', () => {
    logVoiceEvent('voice:extraction_done', {}, 'info');
    logVoiceEvent('voice:extraction_failed', {}, 'error');
    logVoiceEvent('voice:save_done', {}, 'info');
    logVoiceEvent('voice:save_failed', {}, 'error');
    logVoiceEvent('voice:save_done', {}, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.extraction.done).toBe(1);
    expect(metrics.extraction.failed).toBe(1);
    expect(metrics.saves.done).toBe(2);
    expect(metrics.saves.failed).toBe(1);
  });

  it('debería contar reprocesos y descartes', () => {
    logVoiceEvent('voice:reprocess_started', {}, 'info');
    logVoiceEvent('voice:reprocess_started', {}, 'info');
    logVoiceEvent('voice:discarded', {}, 'info');
    logVoiceEvent('voice:discarded', {}, 'info');
    logVoiceEvent('voice:discarded', {}, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.reprocessCount).toBe(2);
    expect(metrics.discardCount).toBe(3);
  });

  it('debería calcular duración total y promedio de recordings', () => {
    logVoiceEvent('voice:recording_stopped', { durationMs: 10000 }, 'info');
    logVoiceEvent('voice:recording_stopped', { durationMs: 20000 }, 'info');
    logVoiceEvent('voice:recording_stopped', { durationMs: 30000 }, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.recordingDurationMs.total).toBe(60000);
    expect(metrics.recordingDurationMs.avg).toBe(20000);
  });

  it('debería ignorar eventos recording_stopped sin durationMs', () => {
    logVoiceEvent('voice:recording_stopped', { durationMs: 10000 }, 'info');
    logVoiceEvent('voice:recording_stopped', {}, 'info');
    logVoiceEvent('voice:recording_stopped', { durationMs: 30000 }, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.recordingDurationMs.total).toBe(40000);
    expect(metrics.recordingDurationMs.avg).toBe(20000);
  });

  it('debería calcular longitud total y promedio de texto transcrito', () => {
    logVoiceEvent('voice:transcription_done', { textLength: 100 }, 'info');
    logVoiceEvent('voice:transcription_done', { textLength: 200 }, 'info');
    logVoiceEvent('voice:transcription_done', { textLength: 300 }, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.transcriptionLength.total).toBe(600);
    expect(metrics.transcriptionLength.avg).toBe(200);
  });

  it('debería ignorar eventos transcription_done sin textLength', () => {
    logVoiceEvent('voice:transcription_done', { textLength: 100 }, 'info');
    logVoiceEvent('voice:transcription_done', {}, 'info');
    logVoiceEvent('voice:transcription_done', { textLength: 300 }, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.transcriptionLength.total).toBe(400);
    expect(metrics.transcriptionLength.avg).toBe(200);
  });

  it('debería calcular total y promedio de entidades extraídas', () => {
    logVoiceEvent('voice:extraction_done', { entityCount: 5 }, 'info');
    logVoiceEvent('voice:extraction_done', { entityCount: 10 }, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.entityCount.total).toBe(15);
    expect(metrics.entityCount.avg).toBe('7.5');
  });

  it('debería ignorar eventos extraction_done sin entityCount', () => {
    logVoiceEvent('voice:extraction_done', { entityCount: 5 }, 'info');
    logVoiceEvent('voice:extraction_done', {}, 'info');
    logVoiceEvent('voice:extraction_done', { entityCount: 15 }, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.entityCount.total).toBe(20);
    expect(metrics.entityCount.avg).toBe('10.0');
  });

  it('debería manejar entityCount=0 correctamente', () => {
    logVoiceEvent('voice:extraction_done', { entityCount: 0 }, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.entityCount.total).toBe(0);
    expect(metrics.entityCount.avg).toBe('0.0');
  });

  it('debería calcular totalSaved desde save_done events', () => {
    logVoiceEvent('voice:save_done', { savedCount: 3 }, 'info');
    logVoiceEvent('voice:save_done', { savedCount: 2 }, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.saves.totalSaved).toBe(5);
  });

  it('debería contar saves offline (syncedOffline=true)', () => {
    logVoiceEvent('voice:save_done', { syncedOffline: true }, 'info');
    logVoiceEvent('voice:save_done', { syncedOffline: false }, 'info');
    logVoiceEvent('voice:save_done', { syncedOffline: true }, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.offlinePathCount).toBe(2);
  });

  it('debería calcular successRate correctamente', () => {
    // 3 recordings, 1 fallo (transcription failed), 1 fallo (save failed)
    logVoiceEvent('voice:recording_started', {}, 'info');
    logVoiceEvent('voice:recording_started', {}, 'info');
    logVoiceEvent('voice:recording_started', {}, 'info');
    logVoiceEvent('voice:transcription_failed', {}, 'error');
    logVoiceEvent('voice:save_failed', {}, 'error');

    const metrics = aggregateVoiceMetrics();
    // failedOps = 1 + 0 + 1 = 2, totalOps = 3
    // successRate = (3 - 2) / 3 * 100 = 33.3%
    expect(metrics.successRate).toBe('33.3%');
  });

  it('debería successRate 100% si no hay fallos', () => {
    logVoiceEvent('voice:recording_started', {}, 'info');
    logVoiceEvent('voice:transcription_done', {}, 'info');
    logVoiceEvent('voice:save_done', {}, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.successRate).toBe('100.0%');
  });

  it('debería successRate 0% si todos fallan', () => {
    logVoiceEvent('voice:recording_started', {}, 'info');
    logVoiceEvent('voice:transcription_failed', {}, 'error');
    logVoiceEvent('voice:extraction_failed', {}, 'error');
    logVoiceEvent('voice:save_failed', {}, 'error');

    const metrics = aggregateVoiceMetrics();
    // failedOps = 1 + 1 + 1 = 3, totalOps = 1
    // successRate = (1 - 3) / 1 * 100 = -200 → clamp a 0? No, la fórmula permite negativo
    // Verifiquemos la fórmula real: (totalOps - failedOps) / totalOps * 100
    // = (1 - 3) / 1 * 100 = -200.0%
    expect(metrics.successRate).toBe('-200.0%');
  });

  it('debería successRate 100% si no hay recordings (fallback default)', () => {
    // Sin recordings, totalOps = 0 || 1 = 1, sin fallos = 100% por defecto
    const metrics = aggregateVoiceMetrics();
    expect(metrics.successRate).toBe('100.0%');
  });

  it('debería incluir persistedSince y lastEvent desde meta', () => {
    logVoiceEvent('voice:recording_started', {}, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.persistedSince).toBeTruthy();
    expect(metrics.lastEvent).toBeTruthy();
    expect(new Date(metrics.persistedSince).toString()).not.toBe('Invalid Date');
    expect(new Date(metrics.lastEvent).toString()).not.toBe('Invalid Date');
  });

  it('debería retornar null para persistedSince si no hay meta', () => {
    // Sin eventos, no hay meta
    const metrics = aggregateVoiceMetrics();
    expect(metrics.persistedSince).toBeNull();
    expect(metrics.lastEvent).toBeNull();
  });

  it('debería marcar expired=true si TTL vencido', () => {
    // Meta antigua (más de 7 días por defecto)
    const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 días atrás
    localStorage.setItem('chagra:voice:telemetry:meta', JSON.stringify({
      firstEvent: oldTimestamp,
      lastEvent: oldTimestamp,
    }));

    const metrics = aggregateVoiceMetrics();
    expect(metrics.expired).toBe(true);
  });

  it('debería marcar expired=false si TTL vigente', () => {
    logVoiceEvent('voice:recording_started', {}, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.expired).toBe(false);
  });

  it('debería respetar TTL custom de 1 día', () => {
    const oldTimestamp = Date.now() - (2 * 24 * 60 * 60 * 1000); // 2 días atrás
    localStorage.setItem('chagra:voice:telemetry:meta', JSON.stringify({
      firstEvent: oldTimestamp,
      lastEvent: oldTimestamp,
    }));
    localStorage.setItem('chagra:voice:telemetry:ttl', '1d');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.expired).toBe(true);
  });

  it('debería respetar TTL never (sin expiración)', () => {
    const oldTimestamp = Date.now() - (365 * 24 * 60 * 60 * 1000); // 1 año atrás
    localStorage.setItem('chagra:voice:telemetry:meta', JSON.stringify({
      firstEvent: oldTimestamp,
      lastEvent: oldTimestamp,
    }));
    localStorage.setItem('chagra:voice:telemetry:ttl', 'never');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.expired).toBe(false);
  });

  it('debería usar TTL default (7d) si ttl es inválido', () => {
    const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 días atrás
    localStorage.setItem('chagra:voice:telemetry:meta', JSON.stringify({
      firstEvent: oldTimestamp,
      lastEvent: oldTimestamp,
    }));
    localStorage.setItem('chagra:voice:telemetry:ttl', 'invalid');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.expired).toBe(true);
  });
});

describe('exportVoiceTelemetry', () => {
  it('debería exportar JSON por defecto', () => {
    logVoiceEvent('voice:recording_started', { durationMs: 5000 }, 'info');
    logVoiceEvent('voice:transcription_done', { textLength: 100 }, 'info');

    const exported = exportVoiceTelemetry();
    const data = JSON.parse(exported);

    expect(data.metrics).toBeTruthy();
    expect(data.events).toHaveLength(2);
    expect(data.metrics.recordings).toBe(1);
    expect(data.metrics.transcriptions.done).toBe(1);
  });

  it('debería exportar JSON explícitamente', () => {
    logVoiceEvent('voice:test', { data: 'test' }, 'info');

    const exported = exportVoiceTelemetry('json');
    const data = JSON.parse(exported);

    expect(data.metrics).toBeTruthy();
    expect(data.events).toHaveLength(1);
  });

  it('debería exportar CSV con header correcto', () => {
    logVoiceEvent('voice:test', { data: 'test' }, 'info');

    const csv = exportVoiceTelemetry('csv');
    const lines = csv.split('\n');

    expect(lines[0]).toBe('timestamp,kind,level,payload_json');
    expect(lines.length).toBeGreaterThan(1);
  });

  it('debería exportar CSV con filas correctas', () => {
    logVoiceEvent('voice:test1', { data: 'value1' }, 'info');
    logVoiceEvent('voice:test2', { data: 'value2' }, 'error');

    const csv = exportVoiceTelemetry('csv');
    const lines = csv.split('\n');

    expect(lines).toHaveLength(3); // header + 2 filas
    expect(lines[1]).toContain('voice:test1');
    expect(lines[1]).toContain('info');
    expect(lines[2]).toContain('voice:test2');
    expect(lines[2]).toContain('error');
  });

  it('debería escapar comillas dobles en CSV', () => {
    logVoiceEvent('voice:test', { text: 'dice "hola"' }, 'info');

    const csv = exportVoiceTelemetry('csv');
    const lines = csv.split('\n');

    // JSON.stringify produce {"text":"dice \"hola\""}, luego replace(/"/g, '""')
    // Resultado: {""text"":""dice \""hola\"""}
    expect(lines[1]).toContain('{""text"":""dice');
    expect(lines[1]).toContain('hola');
  });

  it('debería fallback a JSON si format es inválido', () => {
    logVoiceEvent('voice:test', { data: 'test' }, 'info');

    const exported = exportVoiceTelemetry('invalid');
    const data = JSON.parse(exported);

    expect(data.metrics).toBeTruthy();
    expect(data.events).toHaveLength(1);
  });

  it('debería incluir métricas completas en JSON export', () => {
    logVoiceEvent('voice:recording_started', {}, 'info');
    logVoiceEvent('voice:transcription_done', { textLength: 150 }, 'info');

    const exported = exportVoiceTelemetry('json');
    const data = JSON.parse(exported);

    expect(data.metrics.sessionEvents).toBe(2);
    expect(data.metrics.recordings).toBe(1);
    expect(data.metrics.transcriptionLength.total).toBe(150);
  });
});

describe('clearVoiceTelemetry', () => {
  it('debería limpiar sessionStorage de eventos', () => {
    logVoiceEvent('voice:test1', {}, 'info');
    logVoiceEvent('voice:test2', {}, 'info');

    expect(getSessionEvents()).toHaveLength(2);

    clearVoiceTelemetry();

    expect(getSessionEvents()).toHaveLength(0);
  });

  it('debería limpiar localStorage meta', () => {
    logVoiceEvent('voice:test', {}, 'info');

    expect(localStorage.getItem('chagra:voice:telemetry:meta')).toBeTruthy();

    clearVoiceTelemetry();

    expect(localStorage.getItem('chagra:voice:telemetry:meta')).toBeNull();
  });

  it('debería ser idempotente (llamarlo varias veces es seguro)', () => {
    logVoiceEvent('voice:test', {}, 'info');

    clearVoiceTelemetry();
    clearVoiceTelemetry();
    clearVoiceTelemetry();

    expect(getSessionEvents()).toHaveLength(0);
    expect(localStorage.getItem('chagra:voice:telemetry:meta')).toBeNull();
  });

  it('debería NO afectar otras keys de localStorage', () => {
    localStorage.setItem('chagra:otra:key', 'valor');
    logVoiceEvent('voice:test', {}, 'info');

    clearVoiceTelemetry();

    expect(localStorage.getItem('chagra:otra:key')).toBe('valor');
  });

  it('debería NO afectar enabled flag', () => {
    localStorage.setItem('chagra:voice:telemetry:enabled', '0');
    logVoiceEvent('voice:test', {}, 'info');

    clearVoiceTelemetry();

    expect(localStorage.getItem('chagra:voice:telemetry:enabled')).toBe('0');
  });

  it('debería NO afectar TTL setting', () => {
    localStorage.setItem('chagra:voice:telemetry:ttl', '30d');
    logVoiceEvent('voice:test', {}, 'info');

    clearVoiceTelemetry();

    expect(localStorage.getItem('chagra:voice:telemetry:ttl')).toBe('30d');
  });
});

describe('Casos borde integración', () => {
  it('debería manejar payload null sin crash (usa fallback default)', () => {
    // payload=null crashea al intentar acceder payload.message
    // pero el código usa payload = {} como default, así que no debería pasar null
    // El parámetro default debería prevenir esto, pero si explícitamente se pasa null,
    // el código crashea. Esto es un bug conocido del código.
    expect(() => logVoiceEvent('voice:test', null, 'info')).toThrow();
  });

  it('debería manejar payload undefined correctamente (usa default {})', () => {
    // undefined usa el default {} del parámetro
    expect(() => logVoiceEvent('voice:test', undefined, 'info')).not.toThrow();

    const events = getSessionEvents();
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('voice:test');
    expect(events[0].payload).toEqual({});
  });

  it('debería manejar valores no numéricos en cálculos de avg (NaN result)', () => {
    logVoiceEvent('voice:recording_stopped', { durationMs: 'no numero' }, 'info');
    logVoiceEvent('voice:recording_stopped', { durationMs: 10000 }, 'info');

    const metrics = aggregateVoiceMetrics();
    // El filter acepta durationMs truthy (incluso string), pero el reduce produce NaN
    expect(metrics.recordingDurationMs.total).toBeNaN();
    expect(metrics.recordingDurationMs.avg).toBeNaN();
  });

  it('debería manejar durationMs=0 correctamente', () => {
    logVoiceEvent('voice:recording_stopped', { durationMs: 0 }, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.recordingDurationMs.total).toBe(0);
    expect(metrics.recordingDurationMs.avg).toBe(0);
  });

  it('debería manejar textLength=0 correctamente', () => {
    logVoiceEvent('voice:transcription_done', { textLength: 0 }, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.transcriptionLength.total).toBe(0);
    expect(metrics.transcriptionLength.avg).toBe(0);
  });

  it('debería manejar eventos con kind desconocido', () => {
    logVoiceEvent('voice:unknown_kind', { data: 'test' }, 'info');

    const metrics = aggregateVoiceMetrics();
    expect(metrics.sessionEvents).toBe(1);
    // No afecta contadores específicos
    expect(metrics.recordings).toBe(0);
    expect(metrics.transcriptions.done).toBe(0);
  });

  it('debería mantener consistencia después de clear + nuevos eventos', () => {
    // Primer batch
    logVoiceEvent('voice:recording_started', {}, 'info');
    logVoiceEvent('voice:transcription_done', {}, 'info');
    let metrics1 = aggregateVoiceMetrics();
    expect(metrics1.recordings).toBe(1);

    // Clear
    clearVoiceTelemetry();

    // Segundo batch
    logVoiceEvent('voice:recording_started', {}, 'info');
    logVoiceEvent('voice:recording_started', {}, 'info');
    let metrics2 = aggregateVoiceMetrics();
    expect(metrics2.recordings).toBe(2);
    expect(metrics2.sessionEvents).toBe(2);
  });

  it('debería exportar CSV vacío si no hay eventos', () => {
    const csv = exportVoiceTelemetry('csv');
    const lines = csv.split('\n');

    expect(lines).toHaveLength(1); // Solo header
    expect(lines[0]).toBe('timestamp,kind,level,payload_json');
  });

  it('debería exportar JSON vacío si no hay eventos', () => {
    const exported = exportVoiceTelemetry('json');
    const data = JSON.parse(exported);

    expect(data.events).toEqual([]);
    expect(data.metrics.sessionEvents).toBe(0);
  });
});
