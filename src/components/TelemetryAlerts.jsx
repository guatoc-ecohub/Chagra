import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { assetCache } from '../db/assetCache';
import { FARM_CONFIG } from '../config/defaults';
import Sparkline from './common/Sparkline';
import AIStreamPanel from './common/AIStreamPanel';
import { streamOllama } from '../services/ollamaStream';

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
  const [aiStatus, setAiStatus] = useState('idle'); // idle | thinking | done | error
  const [sensorHistory, setSensorHistory] = useState({});
  const [aiMeta, setAiMeta] = useState(null); // { model, evalDuration, totalDuration }
  // Texto acumulado del LLM durante el analisis agronomico (streaming NDJSON).
  // Se muestra con efecto typewriter mientras aiStatus === 'thinking'.
  const [liveAnalysis, setLiveAnalysis] = useState('');
  // Texto final consolidado de la IA tras terminar el stream. Se separa de
  // aiAlert (que solo contiene reglas deterministas) para que el AIStreamPanel
  // lo renderice en su propio bloque cyberpunk diferenciado.
  const [aiFinalText, setAiFinalText] = useState('');

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

  const fetchTelemetryAndAnalyze = async (parentSignal) => {
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
    setLiveAnalysis('');
    setAiFinalText('');
    setAiMeta(null);

    try {
      // 1. Ingesta de Datos Domóticos (Home Assistant) - IDs Zigbee físicos
      const haHeaders = { 'Authorization': `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' };
      const haOpts = { method: 'GET', headers: haHeaders, signal: parentSignal };
      const [invernaderoHum, invernaderoTemp, tabacoHum, tabacoTemp] = await Promise.all([
        fetch(`${HA_URL}/states/sensor.matera_cocina_humidity`, haOpts),
        fetch(`${HA_URL}/states/sensor.matera_cocina_temperature`, haOpts),
        fetch(`${HA_URL}/states/sensor.hobeian_zg_303z_humidity`, haOpts),
        fetch(`${HA_URL}/states/sensor.hobeian_zg_303z_temperature`, haOpts)
      ]);

      if (!invernaderoHum.ok || !invernaderoTemp.ok || !tabacoHum.ok || !tabacoTemp.ok) {
        const failedSensor = !invernaderoHum.ok ? 'Zona A Humedad' :
                          !invernaderoTemp.ok ? 'Zona A Temperatura' :
                          !tabacoHum.ok ? 'Matera Tabaco Humedad' :
                          'Matera Tabaco Temperatura';
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
        { name: 'Zona A Humedad', data: invernaderoHumData, key: 'Matera Cocina' },
        { name: 'Zona A Temperatura', data: invernaderoTempData, key: 'Matera Cocina' },
        { name: 'Matera Tabaco Humedad', data: tabacoHumData, key: 'Matera Tabaco' },
        { name: 'Matera Tabaco Temperatura', data: tabacoTempData, key: 'Matera Tabaco' },
      ];

      const unavailableSensors = sensorReadings.filter(s =>
        !s.data.state || s.data.state === 'unavailable' || s.data.state === 'unknown'
      );

      // Nota prependible al análisis cuando hay sensores offline parciales.
      let offlineNotice = '';

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

        // Persistimos el aviso de conectividad pero no hacemos early-return:
        // si al menos un sensor responde, seguimos al análisis + IA para no
        // perder visibilidad agronómica sobre la parte operativa.
        const namesOffline = unavailableSensors.map(s => s.name).join(', ');
        offlineNotice = `⚠️ ${unavailableSensors.length} sensor(es) offline (${namesOffline}). Tarea de revisión despachada.\n`;

        setSensors({
          invernaderoHumidity: invernaderoHumData.state !== 'unavailable' ? invernaderoHumData.state : null,
          invernaderoTemperature: invernaderoTempData.state !== 'unavailable' ? invernaderoTempData.state : null,
          tabacoHumidity: tabacoHumData.state !== 'unavailable' ? tabacoHumData.state : null,
          tabacoTemperature: tabacoTempData.state !== 'unavailable' ? tabacoTempData.state : null,
        });

        // Si TODOS los sensores están caídos, sí hacemos early return — no hay
        // datos agronómicos que analizar.
        if (unavailableSensors.length === sensorReadings.length) {
          setAiAlert(offlineNotice);
          setLoading(false);
          return;
        }
      }

      setSensors({
        invernaderoHumidity: invernaderoHumData.state,
        invernaderoTemperature: invernaderoTempData.state,
        tabacoHumidity: tabacoHumData.state,
        tabacoTemperature: tabacoTempData.state
      });

      // Histórico 24h — HA History API (no bloquea análisis)
      const historyStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const entityIds = [
        'sensor.matera_cocina_humidity',
        'sensor.matera_cocina_temperature',
        'sensor.hobeian_zg_303z_humidity',
        'sensor.hobeian_zg_303z_temperature'
      ];
      try {
        const histResp = await fetch(
          `${HA_URL}/history/period/${historyStart}?filter_entity_id=${entityIds.join(',')}&minimal_response&no_attributes`,
          { headers: { 'Authorization': `Bearer ${HA_TOKEN}`, 'Content-Type': 'application/json' }, signal: parentSignal }
        );
        if (histResp.ok) {
          const histData = await histResp.json();
          const histMap = {};
          for (const series of histData) {
            if (series.length > 0) histMap[series[0].entity_id] = series;
          }
          setSensorHistory(histMap);
        }
      } catch (histErr) {
        console.warn('[Telemetry] Histórico 24h no disponible:', histErr.message);
      }

      // 2. Análisis determinista por reglas (siempre se ejecuta)
      const inv1Hum = parseFloat(invernaderoHumData.state);
      const inv1Temp = parseFloat(invernaderoTempData.state);
      const tabHum = parseFloat(tabacoHumData.state);
      const tabTemp = parseFloat(tabacoTempData.state);

      const alerts = [];

      // Invernadero - Zona A (ex Invernadero 1; sensor renombrado a matera_cocina)
      if (inv1Hum < 40) alerts.push(`🚨 ALERTA: Humedad crítica en Zona A (${inv1Hum}%). Riego inmediato requerido.`);
      if (inv1Hum > 80) alerts.push(`💧 Exceso de humedad en Zona A (${inv1Hum}%). Riesgo de hongos patógenos. Ventilar.`);
      if (inv1Temp > 30) alerts.push(`🔥 Temperatura elevada en Zona A (${inv1Temp}°C). Activar ventilación.`);
      if (inv1Temp < 5) alerts.push(`❄️ Temperatura baja en Zona A (${inv1Temp}°C). Riesgo de helada. Proteger cultivos.`);

      // Matera Tabaco (ubicada en cocina)
      if (tabHum < 40) alerts.push(`🚨 ALERTA: Humedad crítica en Matera Tabaco (${tabHum}%). Riego inmediato requerido.`);
      if (tabHum > 80) alerts.push(`💧 Exceso de humedad en Matera Tabaco (${tabHum}%). Riesgo de hongos. Monitorear.`);
      if (tabTemp > 30) alerts.push(`🔥 Temperatura elevada en Matera Tabaco (${tabTemp}°C). Activar ventilación.`);
      if (tabTemp < 5) alerts.push(`❄️ Temperatura baja en Matera Tabaco (${tabTemp}°C). Riesgo de helada.`);

      // Baseline si todo está en rango
      const ruleAnalysis = alerts.length > 0
        ? alerts.join('\n')
        : `✅ Condiciones estables. Zona A: ${inv1Hum}%H/${inv1Temp}°C. Matera Tabaco: ${tabHum}%H/${tabTemp}°C.`;

      // Mostrar reglas INMEDIATAMENTE — sin esperar IA. Prepeende aviso de
      // sensores offline (si hay alguno) para que quede visible incluso si la
      // IA después falla o tarda.
      if (parentSignal?.aborted) return;
      setAiAlert(`${offlineNotice}${ruleAnalysis}`);
      setLoading(false);
      setAiStatus('thinking');
      setLiveAnalysis('');

      // 3. Enriquecimiento con IA en background vía streaming NDJSON (v0.6.0):
      // cada token de qwen3 aparece en vivo en `liveAnalysis` con efecto
      // typewriter, y el último chunk (done:true) entrega el metadata para aiMeta.
      try {
        const ollamaTimeout = setTimeout(() => { if (!parentSignal?.aborted) setAiStatus('error'); }, 45000);
        const userPrompt = (() => {
          const fmt = (h, t) => isNaN(h) && isNaN(t) ? 'sin datos (sensor offline)'
            : isNaN(h) ? `${t}°C (humedad sin dato)`
            : isNaN(t) ? `${h}% humedad (temp sin dato)`
            : `${h}% humedad, ${t}°C`;
          const alertsLine = alerts.length > 0
            ? 'Alertas: ' + alerts.map(a => a.replace(/[^\w\s%°.,()/áéíóú]/g, '')).join('. ')
            : 'Sin alertas.';
          return `Datos actuales de sensores:\n- Invernadero Zona A: ${fmt(inv1Hum, inv1Temp)}\n- Matera Tabaco (cocina): ${fmt(tabHum, tabTemp)}\n${offlineNotice ? offlineNotice.trim() + '\n' : ''}${alertsLine}\nDiagnóstico y acción en 2 líneas.`;
        })();

        const content = await streamOllama(
          `${OLLAMA_URL}/api/chat`,
          {
            model: 'qwen3.5:4b',
            think: false,
            messages: [
              { role: 'system', content: 'Asistente agronómico para finca agroecológica andina (2400msnm). PROHIBIDO recomendar agroquímicos sintéticos. Solo biopreparados orgánicos (biol, caldo sulfocálcico, caldo bordelés, purín de ortiga, compost tea, microorganismos de montaña, Trichoderma). Responde conciso en español, 2 líneas máximo.' },
              { role: 'user', content: userPrompt },
            ],
            options: { num_predict: 200, temperature: 0.3 },
          },
          (_chunk, full) => {
            if (!parentSignal?.aborted) setLiveAnalysis(full);
          },
          {
            signal: parentSignal,
            onDone: (parsed) => {
              if (parentSignal?.aborted) return;
              setAiMeta({
                model: parsed.model || 'qwen3.5:4b',
                totalDuration: parsed.total_duration ? (parsed.total_duration / 1e9).toFixed(1) : null,
                evalCount: parsed.eval_count || null,
                promptTokens: parsed.prompt_eval_count || null,
              });
            },
          },
        );
        clearTimeout(ollamaTimeout);
        if (parentSignal?.aborted) return;

        const trimmed = (content || '').trim();
        if (trimmed.length > 10) {
          // aiAlert queda con solo reglas; el texto de IA va a aiFinalText y
          // se renderiza abajo en su propio panel cyberpunk (AIStreamPanel).
          setAiFinalText(trimmed);
          setAiStatus('done');
        } else {
          console.warn('[Telemetry] IA sin contenido suficiente. Length:', trimmed.length);
          setAiStatus('empty');
        }
      } catch (llmErr) {
        if (parentSignal?.aborted) return;
        console.warn('[Telemetry] IA no disponible:', llmErr.message);
        setAiStatus('error');
      }

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
    const ctrl = new AbortController();
    fetchTelemetryAndAnalyze(ctrl.signal);
    return () => ctrl.abort();
  }, []);

  return (
    <div className="p-6 rounded-3xl bg-slate-900 border border-morpho/30 shadow-neon-morpho mb-8">
      <h3 className="text-2xl font-black mb-4 flex items-center gap-2">
        <span className="w-3 h-3 bg-muzo rounded-full motion-safe:animate-pulse"></span>
        Observabilidad Agronómica
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
        <div className="p-4 bg-slate-800 rounded-2xl">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-xs block">Invernadero — Zona A</span>
              <span className="text-slate-300 text-sm">Matera Cocina</span>
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
          <div className="flex gap-3 mt-2 pt-2 border-t border-slate-700/50">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-slate-500 text-2xs font-mono shrink-0">H%</span>
              <Sparkline data={sensorHistory['sensor.matera_cocina_humidity']} color="#3b82f6" />
            </div>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-slate-500 text-2xs font-mono shrink-0">T°</span>
              <Sparkline data={sensorHistory['sensor.matera_cocina_temperature']} color="#f97316" />
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-800 rounded-2xl">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-xs block">Matera Tabaco</span>
              <span className="text-slate-300 text-sm">Cocina · Hobeian ZG-303Z</span>
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
          <div className="flex gap-3 mt-2 pt-2 border-t border-slate-700/50">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-slate-500 text-2xs font-mono shrink-0">H%</span>
              <Sparkline data={sensorHistory['sensor.hobeian_zg_303z_humidity']} color="#3b82f6" />
            </div>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-slate-500 text-2xs font-mono shrink-0">T°</span>
              <Sparkline data={sensorHistory['sensor.hobeian_zg_303z_temperature']} color="#f97316" />
            </div>
          </div>
        </div>
      </div>

      <div className={`p-5 rounded-xl relative overflow-hidden border-l-8 shadow-neon-morpho ${loading ? 'bg-morpho/5 border-morpho' : 'bg-orchid/5 border-orchid'}`}>
        <div className="absolute top-0 right-0 p-2 opacity-10">
          <Info size={64} className="text-morpho" />
        </div>
        <div className="flex justify-between items-start mb-2">
          <span className="font-black text-morpho block text-xs uppercase tracking-widest">Analisis Agronomico</span>
          <div className="flex items-center gap-2">
            {aiStatus === 'thinking' && (
              <span className="text-orchid text-2xs font-bold bg-orchid/10 px-2 py-1 rounded flex items-center gap-1 border border-orchid/30">
                <div className="w-1.5 h-1.5 bg-orchid rounded-full motion-safe:animate-pulse"></div>
                IA analizando...
              </span>
            )}
            {aiStatus === 'done' && aiMeta && (
              <span className="text-muzo text-2xs font-bold bg-muzo/10 px-2 py-1 rounded border border-muzo/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-muzo rounded-full inline-block"></span>
                {aiMeta.model}
                {aiMeta.totalDuration && <span className="text-slate-400 font-normal ml-1">{aiMeta.totalDuration}s</span>}
                {aiMeta.evalCount && <span className="text-slate-500 font-normal">/{aiMeta.evalCount}tk</span>}
              </span>
            )}
            {aiStatus === 'done' && !aiMeta && (
              <span className="text-muzo text-2xs font-bold bg-muzo/10 px-2 py-1 rounded border border-muzo/30">● IA completada</span>
            )}
            {aiStatus === 'error' && (
              <span className="text-frog text-2xs font-bold bg-frog/10 px-2 py-1 rounded border border-frog/30">IA no disponible</span>
            )}
            {aiStatus === 'empty' && (
              <span className="text-slate-400 text-2xs font-bold bg-slate-800 px-2 py-1 rounded border border-slate-700">IA sin aporte</span>
            )}
            {!loading && aiAlert && (
              <span className="text-muzo text-2xs font-bold bg-muzo/10 px-2 py-1 rounded border border-muzo/30">Reglas activas</span>
            )}
          </div>
        </div>
        {loading ? (
          <div className="flex gap-2 items-center">
            <div className="w-2 h-2 bg-morpho rounded-full motion-safe:animate-bounce"></div>
            <div className="w-2 h-2 bg-morpho rounded-full motion-safe:animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-morpho rounded-full motion-safe:animate-bounce delay-150"></div>
            <span className="text-slate-400 text-sm italic font-medium">Analizando datos agronómicos...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {aiAlert ? (
              <>
                {/* Reglas deterministas (monoespaciadas, sin efectos IA) */}
                <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">
                  {aiAlert}
                </p>

                {/* Bloque de IA (streaming + final) con efectos cyberpunk.
                    Se muestra durante thinking (con liveAnalysis) y permanece
                    visible en done (con aiFinalText consolidado). El panel
                    dispara un spark flash al transicionar active→false. */}
                {(aiStatus === 'thinking' || (aiStatus === 'done' && aiFinalText)) && (
                  <AIStreamPanel
                    text={aiStatus === 'thinking' ? liveAnalysis : aiFinalText}
                    active={aiStatus === 'thinking'}
                    label={aiStatus === 'thinking' ? 'IA generando' : 'Análisis IA'}
                    accent="orchid"
                    meta={aiMeta && (
                      <span className="tabular-nums">
                        {aiMeta.model}
                        {aiMeta.totalDuration && <> · {aiMeta.totalDuration}s</>}
                        {aiMeta.evalCount && <> · {aiMeta.evalCount}tk</>}
                      </span>
                    )}
                  />
                )}

                {renderActionButton()}
              </>
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
        onClick={() => fetchTelemetryAndAnalyze()}
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
