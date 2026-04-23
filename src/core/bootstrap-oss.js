/**
 * bootstrap-oss.js — Registro de módulos OSS del repo público
 * ===========================================================
 * Se ejecuta antes del primer render de React. Registra features del
 * core OSS de Chagra en el moduleRegistry. Módulos Pro (si existen)
 * se registran aparte vía loadProModules (path-relative durante dev,
 * npm package privado en futuro).
 *
 * Añadir un módulo OSS nuevo aquí cuando su surface pueda tener
 * versión Pro enriquecida, o cuando la UI quiera consultar
 * capabilities antes de renderizar.
 */

import { registry } from './moduleRegistry';

export function bootstrapOssModules() {
  registry.register({
    id: 'guild-suggestions-oss',
    version: '1.0.0',
    capabilities: ['guild-suggestions', 'layered-guild-engine'],
    requiredInfra: [],
    mount: async () => {
      const mod = await import('../components/GuildSuggestions');
      return { default: mod.default || mod.GuildSuggestions };
    },
  });

  registry.register({
    id: 'voice-capture-oss',
    version: '1.0.0',
    capabilities: ['voice-capture', 'whisper-transcription'],
    requiredInfra: ['whisper'],
    mount: async () => {
      const mod = await import('../components/VoiceCapture');
      return { default: mod.default || mod.VoiceCapture };
    },
  });

  registry.register({
    id: 'telemetry-alerts-oss',
    version: '1.0.0',
    capabilities: ['telemetry-alerts', 'agronomic-inference'],
    requiredInfra: ['ollama', 'home-assistant'],
    mount: async () => {
      const mod = await import('../components/TelemetryAlerts');
      return { default: mod.default || mod.TelemetryAlerts };
    },
  });
}
