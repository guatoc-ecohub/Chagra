import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { assetCache } from '../db/assetCache';
import { FARM_CONFIG } from '../config/defaults';

// Constantes de Infraestructura Segura (API Gateway Local)
const HA_URL = '/api/ha';
const OLLAMA_URL = '/api/ollama';

// Cooldown de idempotencia persistente (delegado a sync_meta vía assetCache)
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos

// Utilidades de formateo condicional
const getHumidityColor = (humidity) => {
  const value = parseFloat(humidity);
  if (isNaN(value)) return 'text-slate-400';

  if (value < 40) return 'text-red-500'; // Humedad crítica
  if (value <= 70) return 'text-green-500'; // Humedad óptima
  return 'text-blue-500'; // Humedad saturada
};

const getTemperatureColor = (temperature) => {
  const value = parseFloat(temperature);
  if (isNaN(value)) return 'text-slate-400';

  if (value < 12) return 'text-blue-400'; // Frío
  if (value <= 28) return 'text-green-500'; // Óptimo
  return 'text-red-500'; // Calor crítico
};

export default function TelemetryAlerts({ lastFarmOsLog, onNavigate }) {
  const [sensors, setSensors] = useState({
    invernaderoHumidity: null,
    invernaderoTemperature: null,
    tabacoHumidity: null,
    tabacoTemperature: null
  });
  const [aiAlert, setAiAlert] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Variables de Entorno (Requeridas en el archivo .env)
  const HA_TOKEN = import.meta.env.VITE_HA_ACCESS_TOKEN;

  // Enrutador genérico de acciones de telemetría con idempotencia persistente.
  // Cooldown y encolado son atómicos (IDB transaction sobre pending_tx + sync_meta).
  const handleTelemetryAction = async (sensorId, alertType, payloadBuilder, options = {}) => {
    const { endpoint = '/api/log/maintenance', type = 'maintenance', navigateTo = null } = options;
    setLoading(true);
    try {
      const lastTrigger = await assetCache.getAlertCooldown(sensorId, alertType);
      const now = Date.now();

      if (now - lastTrigger < COOLDOWN_MS) {
        console.warn(`[Telemetry] Acción ${alertType} para ${sensorId} bloqueada por cooldown.`);
        return;
      }

      const payload = payloadBuilder();
      const pendingTx = {
        id: crypto.randomUUID(),
        type,
        endpoint,
        payload,
        method: 'POST'
      };

      await assetCache.commitAlertWithCooldown(sensorId, alertType, pendingTx);

      window.dispatchEvent(new CustomEvent('taskAdded'));
      console.info(`[Telemetry] Alerta ${alertType} procesada y encolada.`);
      if (navigateTo) window.location.hash = navigateTo;
    } catch (error) {
      console.error('[Telemetry] Fallo al procesar alerta:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderActionButton = () => {
    if (!aiAlert) return null;

    const alertText = aiAlert.toLowerCase();

    if (alertText.includes('estrés hídrico') || alertText.includes('humedad') || alertText.includes('humedad crítica')) {
      const handleRiegoAction = () => handleTelemetryAction(
        FARM_CONFIG.LOCATION_ID,
        'riego_emergencia',
        () => ({
          data: {
            type: "log--input",
            attributes: {
              name: "Riego de emergencia (Alerta IA)",
              timestamp: new Date().toISOString().split('.')[0] + '+00:00',
              status: "pending",
              notes: `Ejecutado en respuesta a alerta IA: ${aiAlert}`
            },
            relationships: {
              location: {
                data: [{ type: "asset--land", id: FARM_CONFIG.LOCATION_ID }]
              },
              category: {
                data: [{
                  type: "taxonomy_term--material",
                  attributes: { name: "Riego de emergencia" }
                }]
              },
              quantity: {
                data: [{
                  type: "quantity--standard",
                  attributes: {
                    measure: "volume",
                    value: { decimal: "0" },
                    label: "Caudal (L)"
                  }
                }]
              }
            }
          }
        }),
        { type: 'input', endpoint: '/api/log/input', navigateTo: '#insumos' }
      );

      return (
        <button
          onClick={handleRiegoAction}
          className="mt-3 w-full p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9m-6 6h12" />
          </svg>
          Ejecutar Riego
        </button>
      );
    }

    if (alertText.includes('temperatura') || alertText.includes('calor') || alertText.includes('térmica')) {
      const handleTemperatureAction = () => handleTelemetryAction(
        FARM_CONFIG.LOCATION_ID,
        'control_termico',
        () => ({
          data: {
            type: "log--maintenance",
            attributes: {
              name: "Control Climático (Alerta IA)",
              timestamp: new Date().toISOString().split('.')[0] + '+00:00',
              status: "pending",
              description: `Ejecutado en respuesta a alerta IA: ${aiAlert}`,
              maintenanceType: "emergency"
            }
          }
        }),
        { type: 'maintenance', endpoint: '/api/log/maintenance', navigateTo: '#mantenimiento' }
      );

      return (
        <button
          onClick={handleTemperatureAction}
          className="mt-3 w-full p-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center justify-center gap-2 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Control Climático
        </button>
      );
    }

    if (alertText.includes('hongos') || alertText.includes('enfermedad') || alertText.includes('plagas')) {
      const handleFungicidalAction = () => handleTelemetryAction(
        FARM_CONFIG.LOCATION_ID,
        'aplicacion_fitosanitaria',
        () => ({
          data: {
            type: "log--input",
            attributes: {
              name: "Aplicación Fitosanitaria (Alerta IA)",
              timestamp: new Date().toISOString().split('.')[0] + '+00:00',
              status: "pending",
              notes: `Ejecutado en respuesta a alerta IA: ${aiAlert}`
            },
            relationships: {
              location: {
                data: [{ type: "asset--land", id: FARM_CONFIG.LOCATION_ID }]
              },
              category: {
                data: [{
                  type: "taxonomy_term--material",
                  attributes: { name: "Caldo sulfocálcico" }
                }]
              },
              quantity: {
                data: [{
                  type: "quantity--standard",
                  attributes: {
                    measure: "volume",
                    value: { decimal: "0" },
                    label: "Concentrado (L)"
                  }
                }]
              }
            }
          }
        }),
        { type: 'input', endpoint: '/api/log/input', navigateTo: '#insumos' }
      );

      return (
        <button
          onClick={handleFungicidalAction}
          className="mt-3 w-full p-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center justify-center gap-2 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.932-3.131L13.068 4.632c-.667 1.239-2.003 1.239l3.035 14.872c-.57 1.464.391 3.131h13.866z" />
          </svg>
          Aplicar Fitosanitario
        </button>
      );
    }

    return null;
  };

  const fetchTelemetryAndAnalyze = async () => {
    if (!navigator.onLine) {
      setError('Dispositivo sin conexión. Análisis suspendido para conservar energía.');
      return;
    }

    if (!HA_TOKEN) {
      setError('VITE_HA_ACCESS_TOKEN no configurado en el archivo .env');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Ingesta de Datos Domóticos (Home Assistant) - IDs Zigbee físicos
      const [invernaderoHum, invernaderoTemp, tabacoHum, tabacoTemp] = await Promise.all([
        fetch(`${HA_URL}/states/sensor.arteco_zs_304z_humidity`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${HA_URL}/states/sensor.arteco_zs_304z_temperature`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${HA_URL}/states/sensor.hobeian_zg_303z_humidity`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${HA_URL}/states/sensor.hobeian_zg_303z_temperature`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' }
        })
      ]);

      if (!invernaderoHum.ok || !invernaderoTemp.ok || !tabacoHum.ok || !tabacoTemp.ok) {
        const failedSensor = !invernaderoHum.ok ? 'Arteco ZS-304Z Humedad' :
                          !invernaderoTemp.ok ? 'Arteco ZS-304Z Temperatura' :
                          !tabacoHum.ok ? 'Hobeian ZG-303Z Humedad' :
                          'Hobeian ZG-303Z Temperatura';
        throw new Error(`Fallo al conectar con sensor: ${failedSensor}. Verifique Home Assistant.`);
      }

      const [invernaderoHumData, invernaderoTempData, tabacoHumData, tabacoTempData] = await Promise.all([
        invernaderoHum.json(),
        invernaderoTemp.json(),
        tabacoHum.json(),
        tabacoTemp.json()
      ]);

      // Detección de sensores no disponibles (unavailable, null, unknown)
      const sensorReadings = [
        { name: 'Invernadero 1 Humedad', data: invernaderoHumData, key: 'Arteco ZS-304Z' },
        { name: 'Invernadero 1 Temperatura', data: invernaderoTempData, key: 'Arteco ZS-304Z' },
        { name: 'Tabaco Humedad', data: tabacoHumData, key: 'Hobeian ZG-303Z' },
        { name: 'Tabaco Temperatura', data: tabacoTempData, key: 'Hobeian ZG-303Z' },
      ];

      const unavailableSensors = sensorReadings.filter(s =>
        !s.data.state || s.data.state === 'unavailable' || s.data.state === 'unknown'
      );

      if (unavailableSensors.length > 0) {
        // Idempotencia persistente por (sensor.key, 'conectividad') vía sync_meta.
        let dispatched = 0;
        for (const sensor of unavailableSensors) {
          const sensorId = sensor.key;
          const alertType = 'conectividad';
          const lastTrigger = await assetCache.getAlertCooldown(sensorId, alertType);
          if (Date.now() - lastTrigger < COOLDOWN_MS) {
            console.warn(`[Telemetry] Alerta de conectividad para ${sensorId} bloqueada por cooldown.`);
            continue;
          }

          const taskName = `Revisión de conectividad de sensor en ${sensor.name}`;
          const taskPayload = {
            data: {
              type: 'log--maintenance',
              attributes: {
                name: taskName,
                timestamp: Math.floor(Date.now() / 1000),
                status: 'pending',
                notes: { value: `Sensor ${sensor.key} reporta estado "${sensor.data.state || 'null'}". Verificar alimentación, alcance Zigbee y estado en Home Assistant.` },
              },
              relationships: {
                location: {
                  data: [{ type: 'asset--land', id: FARM_CONFIG.LOCATION_ID }],
                },
              },
            },
          };

          await assetCache.commitAlertWithCooldown(sensorId, alertType, {
            id: crypto.randomUUID(),
            type: 'maintenance',
            endpoint: '/api/log/maintenance',
            payload: taskPayload,
            method: 'POST',
          });
          dispatched++;
        }

        if (dispatched > 0) {
          window.dispatchEvent(new CustomEvent('taskAdded'));
        }

        const names = unavailableSensors.map(s => s.name).join(', ');
        setAiAlert(`Alerta de Telemetría: ${unavailableSensors.length} sensor(es) no disponible(s) (${names}). Tarea de revisión despachada con prioridad ALTA.`);

        setSensors({
          invernaderoHumidity: invernaderoHumData.state !== 'unavailable' ? invernaderoHumData.state : null,
          invernaderoTemperature: invernaderoTempData.state !== 'unavailable' ? invernaderoTempData.state : null,
          tabacoHumidity: tabacoHumData.state !== 'unavailable' ? tabacoHumData.state : null,
          tabacoTemperature: tabacoTempData.state !== 'unavailable' ? tabacoTempData.state : null,
        });

        setLoading(false);
        return;
      }

      setSensors({
        invernaderoHumidity: invernaderoHumData.state,
        invernaderoTemperature: invernaderoTempData.state,
        tabacoHumidity: tabacoHumData.state,
        tabacoTemperature: tabacoTempData.state
      });

      // 2. Ensamblaje del Contexto Agronómico
      const promptContext = `Inv1: ${invernaderoHumData.state}%H ${invernaderoTempData.state}°C. Tab: ${tabacoHumData.state}%H ${tabacoTempData.state}°C. ¿Riesgo hídrico o térmico? Responde en 2 líneas en español con acción concreta.`;

      // 3. Inferencia Cognitiva Local (Ollama) con fallback
      let aiAnalysis = '';
      try {
        const ollamaCtrl = new AbortController();
        const ollamaTimeout = setTimeout(() => ollamaCtrl.abort(), 180000);
        const ollamaResponse = await fetch(`${OLLAMA_URL}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ollamaCtrl.signal,
          body: JSON.stringify({
            model: 'qwen3.5:4b',
            prompt: promptContext,
            stream: true,
            options: { num_predict: 150 }
          })
        });
        clearTimeout(ollamaTimeout);

        if (ollamaResponse.ok) {
          const reader = ollamaResponse.body.getReader();
          const decoder = new TextDecoder();
          let fullText = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n').filter(Boolean)) {
              try {
                const obj = JSON.parse(line);
                if (obj.response) fullText += obj.response;
              } catch { /* skip */ }
            }
          }
          aiAnalysis = fullText || 'Inferencia completada';
        } else {
          const detail = await ollamaResponse.text().catch(() => '');
          console.warn(`[Telemetry] Ollama ${ollamaResponse.status}. Body: ${detail.slice(0, 200)}`);
          throw new Error('Motor LLM no disponible');
        }
      } catch (llmError) {
        console.error('Error en inferencia LLM:', llmError);
        // Fallback: Análisis basado en reglas simples
        const invernaderoHum = parseFloat(invernaderoHumData.state);
        const invernaderoTemp = parseFloat(invernaderoTempData.state);

        if (invernaderoHum < 40) {
          aiAnalysis = '⚠️ Riesgo de estrés hídrico en Invernadero 1. Humedad crítica (<40%). Recomiendo riego inmediato.';
        } else if (invernaderoTemp > 30) {
          aiAnalysis = '🔥 Alerta térmica en Invernadero 1. Temperatura elevada (>30°C). Active ventilación si está disponible.';
        } else if (invernaderoHum > 80) {
          aiAnalysis = '💧 Exceso de humedad en Invernadero 1. (>80%). Monitoree desarrollo de hongos patógenos.';
        } else {
          aiAnalysis = '✅ Condiciones agroecológicas estables. Mantenga monitoreo constante de sensores.';
        }
      }
      setAiAlert(aiAnalysis);

    } catch (err) {
      setError(err.message);

      // Inyectar tarea de revisión física con idempotencia persistente por (telemetria_global, fallo_general).
      try {
        const sensorId = 'telemetria_global';
        const alertType = 'fallo_general';
        const lastTrigger = await assetCache.getAlertCooldown(sensorId, alertType);
        if (Date.now() - lastTrigger >= COOLDOWN_MS) {
          const taskPayload = {
            data: {
              type: 'log--activity',
              attributes: {
                name: 'Revisión física de sensor offline',
                timestamp: Math.floor(Date.now() / 1000),
                status: 'pending',
                notes: { value: `Error de telemetría: "${err.message}". Revisar alimentación y conectividad de sensores Zigbee en Home Assistant. Verificar también disponibilidad de Ollama.` },
              },
              relationships: {
                location: {
                  data: [{ type: 'asset--land', id: FARM_CONFIG.LOCATION_ID }],
                },
              },
            },
          };

          await assetCache.commitAlertWithCooldown(sensorId, alertType, {
            id: crypto.randomUUID(),
            type: 'activity',
            endpoint: '/api/log/activity',
            payload: taskPayload,
            method: 'POST',
          });

          window.dispatchEvent(new CustomEvent('taskAdded'));
        } else {
          console.warn(`[Telemetry] Fallo general suprimido por cooldown.`);
        }
      } catch (txErr) {
        console.error('Error inyectando tarea de revisión:', txErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await fetchTelemetryAndAnalyze();
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl mb-8">
      <h3 className="text-2xl font-black mb-4 flex items-center gap-2">
        <span className="w-3 h-3 bg-green-500 rounded-full motion-safe:animate-pulse"></span>
        Observabilidad Agronómica (Alpha)
      </h3>

      {error && (
        <div className="p-4 mb-4 rounded-xl bg-red-900/30 border border-red-500 text-red-200 font-mono text-xs">
          <div className="font-bold mb-2 flex items-center gap-2">
            ⚠️ ERROR DE CONECTIVIDAD
          </div>
          <div className="space-y-1">
            <div className="flex gap-2">
              <span className="text-red-400 font-bold">DETALLE:</span>
              <span>{error}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-red-400 font-bold">ACCIÓN:</span>
              <span>Verifique que Nginx tenga configurado el proxy hacia Home Assistant</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center p-4 bg-slate-800 rounded-2xl">
          <div>
            <span className="text-slate-400 font-bold uppercase tracking-wider text-xs block">Invernadero 1</span>
            <span className="text-slate-300 text-sm">Arteco ZS-304Z</span>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-xs block">Hum</span>
              <span className={`text-2xl font-black ${getHumidityColor(sensors.invernaderoHumidity)}`}>
                {sensors.invernaderoHumidity || '---'}%
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-xs block">Temp</span>
              <span className={`text-2xl font-black ${getTemperatureColor(sensors.invernaderoTemperature)}`}>
                {sensors.invernaderoTemperature || '---'}°C
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center p-4 bg-slate-800 rounded-2xl">
          <div>
            <span className="text-slate-400 font-bold uppercase tracking-wider text-xs block">Tabaco</span>
            <span className="text-slate-300 text-sm">Hobeian ZG-303Z</span>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-xs block">Hum</span>
              <span className={`text-2xl font-black ${getHumidityColor(sensors.tabacoHumidity)}`}>
                {sensors.tabacoHumidity || '---'}%
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-xs block">Temp</span>
              <span className={`text-2xl font-black ${getTemperatureColor(sensors.tabacoTemperature)}`}>
                {sensors.tabacoTemperature || '---'}°C
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={`p-5 rounded-xl relative overflow-hidden border-l-8 ${loading ? 'bg-blue-900/20 border-blue-500' : 'bg-purple-900/20 border-purple-500'}`}>
        <div className="absolute top-0 right-0 p-2 opacity-10">
          <Info size={64} className="text-blue-400" />
        </div>
        <div className="flex justify-between items-start mb-2">
          <span className="font-black text-blue-400 block text-xs uppercase tracking-widest">Inferencia de IA</span>
          {!loading && aiAlert && (
            <span className="text-green-400 text-xs font-bold bg-green-900/30 px-2 py-1 rounded">● ACTIVO</span>
          )}
        </div>
        {loading ? (
          <div className="flex gap-2 items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full motion-safe:animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full motion-safe:animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full motion-safe:animate-bounce delay-150"></div>
            <span className="text-slate-400 text-sm italic font-medium">Analizando datos agronómicos...</span>
          </div>
        ) : (
          <div className="space-y-2">
            {aiAlert ? (
              <div>
                <p className="text-lg leading-relaxed text-slate-200">
                  {aiAlert}
                </p>
                {renderActionButton()}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-400">
                <span className="text-xl">⚠️</span>
                <span className="text-sm">Sistema de inferencia en modo de espera</span>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={fetchTelemetryAndAnalyze}
        disabled={loading}
        className="mt-6 w-full p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 transition-all border border-slate-600 font-bold text-slate-300 flex items-center justify-center gap-3 disabled:opacity-50"
      >
        <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Sincronizar Telemetría
      </button>
    </div>
  );
}
