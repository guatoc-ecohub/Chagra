import { sendToFarmOS, fetchFromFarmOS } from './apiService';
import { openDB, STORES } from '../db/dbCore';
import { logCache } from '../db/logCache';
import { newId } from '../utils/id';
import { getCompletedTaskIds } from '../utils/taskCompletionParser';

const STORE_NAME = 'pending_transactions';
const TASKS_STORE_NAME = 'pending_tasks';
const VOICE_STORE_NAME = STORES.PENDING_VOICE;

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

class SyncManager {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
  }

  // Hotfix 11.6: delega la apertura a dbCore (singleton). Preserva la
  // interfaz pública initDB() para no romper callers existentes.
  async initDB() {
    this.db = await openDB();
    // Ejecutar migración de tareas legacy si es necesario
    await this.migrateLegacyTasks();
  }

  /**
   * Fase 5 ADR-019: Migrar registros de pending_tasks (snapshot) a log--task (entidades).
   */
  async migrateLegacyTasks() {
    if (!this.db) return;
    const migrationFlag = 'chagra:migration:taskLogV1';
    if (localStorage.getItem(migrationFlag)) return;

    try {
      const legacyTasks = await new Promise((resolve, reject) => {
        const tx = this.db.transaction([TASKS_STORE_NAME], 'readonly');
        const req = tx.objectStore(TASKS_STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      if (legacyTasks.length > 0) {
        console.info(`[Migration] Promocionando ${legacyTasks.length} tareas legacy a log--task…`);
        for (const task of legacyTasks) {
          const logTask = {
            id: task.id || newId('log--task'),
            type: 'log--task',
            status: task.status || 'pending',
            timestamp: task.timestamp || Math.floor(Date.now() / 1000),
            name: task.title || task.name || 'Tarea migrada',
            attributes: {
              name: task.title || task.name || 'Tarea migrada',
              status: task.status || 'pending',
              timestamp: task.timestamp || Math.floor(Date.now() / 1000),
              notes: {
                value: `[MIGRATION] ${task.description || ''}`,
                format: 'plain_text'
              }
            },
            relationships: task.originalData?.relationships || { asset: { data: [] } },
            _pending: false,
            _migrated: true
          };
          await logCache.put(logTask);
        }
      }

      localStorage.setItem(migrationFlag, 'completed');
      console.info('[Migration] Tareas migradas con éxito.');
    } catch (err) {
      console.warn('[Migration] Error migrando tareas (no crítico, se reintentará FarmOS pull):', err);
    }
  }

  // Guardar transacción pendiente
  async saveTransaction(transactionData) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const transactionRecord = {
        ...transactionData,
        timestamp: Date.now(),
        synced: false
      };

      const request = store.add(transactionRecord);

      request.onsuccess = () => resolve(transactionRecord);
      request.onerror = () => reject(request.error);
    });
  }

  // Obtener transacciones pendientes (getAll + filtro en memoria para evitar dependencia de índice)
  async getPendingTransactions() {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const all = request.result || [];
        resolve(all.filter(r => !r.synced));
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Eliminar transacción sincronizada
  async deleteTransaction(id) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Marcar retries en una transacción
  async markRetry(id, errorMsg) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const record = getReq.result;
        if (!record) return resolve();
        record.retries = (record.retries || 0) + 1;
        record.lastError = errorMsg;
        store.put(record);
        transaction.oncomplete = () => resolve(record.retries);
        transaction.onerror = () => reject(transaction.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  // Sincronizar todas las transacciones pendientes
  async syncAll() {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      const pendingTransactions = await this.getPendingTransactions();

      for (const transaction of pendingTransactions) {
        // Saltar transacciones que superaron el máximo de reintentos
        const currentRetries = transaction.retries || 0;
        if (currentRetries >= MAX_RETRIES) {
          failed++;
          continue;
        }

        // Backoff exponencial: esperar antes de reintentar transacciones fallidas
        if (currentRetries > 0) {
          const backoffMs = BASE_BACKOFF_MS * Math.pow(2, currentRetries - 1);
          await new Promise((r) => setTimeout(r, backoffMs));
        }

        try {
          await this.syncTransaction(transaction);
          await this.deleteTransaction(transaction.id);
          synced++;
          console.info(`[SyncManager] Transacción ${transaction.id} completada y purgada.`);
          window.dispatchEvent(new CustomEvent('syncCompleted', {
            detail: {
              type: transaction.type,
              id: transaction.id,
              remoteId: transaction.remoteId,
            },
          }));
        } catch (error) {
          if (error.status && error.status >= 400 && error.status < 500) {
            console.error(`[SyncManager] Error no recuperable HTTP ${error.status}. Descartando transacción ${transaction.id}.`, error);
            await this.deleteTransaction(transaction.id);
            failed++;
            const name = transaction.payload?.data?.attributes?.name || transaction.type;
            window.dispatchEvent(new CustomEvent('syncError', {
              detail: { message: `Transacción "${name}" descartada (HTTP ${error.status}).` },
            }));
          } else {
            const retries = await this.markRetry(transaction.id, error.message);
            console.warn(`[SyncManager] Fallo de red/servidor en transacción ${transaction.id} (intento ${retries}/${MAX_RETRIES}). Marcando para reintento.`, error);
            if (retries >= MAX_RETRIES) {
              failed++;
              const name = transaction.payload?.data?.attributes?.name || transaction.type;
              window.dispatchEvent(new CustomEvent('syncError', {
                detail: { message: `Fallo permanente al sincronizar "${name}". Verifique conexión con FarmOS.` },
              }));
            }
          }
        }
      }

      if (failed === 0 && synced > 0) {
        window.dispatchEvent(new CustomEvent('syncComplete', { detail: { synced } }));
        // Nota Hotfix 10.5: el refresco de assets ya no se dispara aquí.
        // Cada tx exitosa emite 'syncCompleted' y el store escucha para
        // ejecutar pulls dirigidos por tipo (ver useAssetStore.js).

        // Fase 20.2: auto-purge de media stale (>7 días, logs ya sincronizados)
        try {
          const { mediaCache } = await import('../db/mediaCache');
          mediaCache.purgeStale().catch((e) =>
            console.warn('[SyncManager] Purge de media stale fallido:', e)
          );
        } catch { /* noop */ }

        // Fase 11.2: pull preventivo de logs recientes tras tanda exitosa.
        try {
          const { useLogStore } = await import('../store/useLogStore');
          useLogStore.getState().pullRecentLogs(fetchFromFarmOS).catch((e) =>
            console.warn('[SyncManager] Pull de logs post-sync fallido:', e)
          );
        } catch (e) {
          console.warn('[SyncManager] No se pudo cargar useLogStore:', e);
        }
      }
    } catch (error) {
      console.error('Error en proceso de sincronización:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Sincronizar una transacción individual.
  // Si la transacción tiene media asociada en media_cache (Fase 20.2),
  // ejecuta upload del binario primero y luego vincula el file al log.
  async syncTransaction(transaction) {
    const targetEndpoint = transaction.endpoint || this.resolveLegacyEndpoint(transaction);

    if (!targetEndpoint) {
      throw new Error(`Endpoint no resuelto para transacción tipo: ${transaction.type}`);
    }

    // Pre-paso: si la transacción incluye quantity metadata, crear la entidad
    // quantity--standard primero y vincularla al payload del log.
    if (transaction._quantityMeta) {
      const qm = transaction._quantityMeta;
      const qtyPayload = {
        data: {
          type: 'quantity--standard',
          attributes: {
            label: qm.label,
            value: { decimal: String(qm.value) },
            measure: qm.measure || 'volume',
          },
        },
      };
      const qtyResult = await sendToFarmOS('/api/quantity/standard', qtyPayload, 'POST');
      const qtyId = qtyResult?.data?.id;
      if (qtyId) {
        transaction.payload.data.relationships = transaction.payload.data.relationships || {};
        transaction.payload.data.relationships.quantity = {
          data: [{ type: 'quantity--standard', id: qtyId }],
        };
      }
    }

    // Paso principal: enviar el payload del log/asset
    const result = await sendToFarmOS(targetEndpoint, transaction.payload, transaction.method || 'POST');

    // Fase 20.2: si hay media asociada, subir binarios y vincular al log
    try {
      const { mediaCache } = await import('../db/mediaCache');
      const logId = transaction.remoteId || transaction.id;
      const mediaItems = await mediaCache.getByLogId(logId);

      if (mediaItems.length > 0) {
        const fileUuids = [];
        const diagnoses = [];

        for (const item of mediaItems) {
          // Paso A: POST /api/file/upload con FormData
          const formData = new FormData();
          const filename = `evidence_${logId}_${item.id}.webp`;
          formData.append('file', item.blob, filename);

          const fileResult = await sendToFarmOS('/api/file/upload', formData, 'POST');
          const fileUuid = fileResult?.data?.id;
          if (fileUuid) {
            fileUuids.push({ type: 'file--file', id: fileUuid });
            console.info(`[Sync] Media ${item.id} subida como file ${fileUuid}.`);
          }

          if (item.ai_diagnosis) diagnoses.push(item.ai_diagnosis);
        }

        // Paso B: PATCH del log vinculando TODOS los files + diagnóstico en notas
        if (fileUuids.length > 0) {
          const logType = transaction.payload?.data?.type || 'log--activity';
          const logSuffix = logType.split('--')[1] || 'activity';

          const patchAttrs = {};
          if (diagnoses.length > 0) {
            const diagText = diagnoses.map((d) =>
              `[IA] Score: ${d.score}/100. ${d.issues.join('; ')}. Rec: ${d.treatment_suggestion}`
            ).join('\n');
            patchAttrs.notes = { value: diagText, format: 'plain_text' };
          }

          await sendToFarmOS(`/api/log/${logSuffix}/${logId}`, {
            data: {
              type: logType,
              id: logId,
              ...(Object.keys(patchAttrs).length > 0 ? { attributes: patchAttrs } : {}),
              relationships: {
                file: { data: fileUuids },
              },
            },
          }, 'PATCH');
        }

        // Limpiar binarios del cache local tras éxito
        await mediaCache.removeByLogId(logId);
      }
    } catch (mediaErr) {
      // Error de media no bloquea la sincronización del log principal
      console.warn('[Sync] Error subiendo media (no bloqueante):', mediaErr.message);
    }

    return result;
  }

  // Helper de retrocompatibilidad: resuelve endpoint por type cuando la transacción
  // fue encolada sin endpoint explícito (formato anterior a Fase 12).
  resolveLegacyEndpoint(transaction) {
    const type = transaction.type;
    switch (type) {
      case 'log--planting':
      case 'planting':
        return '/api/log/planting';
      case 'log--seeding':
      case 'seeding':
        return '/api/log/seeding';
      case 'log--harvest':
      case 'harvest':
        return '/api/log/harvest';
      case 'log--input':
      case 'input':
        return '/api/log/input';
      case 'log--maintenance':
      case 'maintenance':
        return '/api/log/maintenance';
      case 'log--observation':
      case 'observation':
      case 'log':
        return '/api/log/observation';
      case 'log--activity':
      case 'activity':
        return '/api/log/activity';
      case 'asset_plant':
        return '/api/asset/plant';
      case 'asset_structure':
        return '/api/asset/structure';
      case 'asset_equipment':
        return '/api/asset/equipment';
      case 'asset_material':
        return '/api/asset/material';
      case 'delete_plant':
        return `/api/asset/plant/${transaction.remoteId || transaction.id}`;
      case 'delete_equipment':
        return `/api/asset/equipment/${transaction.remoteId || transaction.id}`;
      case 'delete_structure':
        return `/api/asset/structure/${transaction.remoteId || transaction.id}`;
      case 'delete_material':
        return `/api/asset/material/${transaction.remoteId || transaction.id}`;
      default:
        return null;
    }
  }

  // Iniciar monitoreo de conexión
  startNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncAll();
      this.notifyPendingVoiceRecordings();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // ─── Voice recordings (v0.5.0) ─────────────────────────────────────────
  // Persistencia de audios capturados cuando Whisper/Ollama no responden.
  // El procesamiento (transcripción + extracción) queda delegado al módulo
  // VoiceCapture, que obliga revisión humana antes de encolar en
  // pending_transactions. Este manager solo notifica disponibilidad.

  async saveVoiceRecording(blob, metadata = {}) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([VOICE_STORE_NAME], 'readwrite');
      const store = tx.objectStore(VOICE_STORE_NAME);
      const record = {
        blob,
        mimeType: blob.type || 'audio/webm',
        size: blob.size,
        durationMs: metadata.durationMs || 0,
        status: metadata.status || 'pending',
        lastError: metadata.lastError || null,
        createdAt: Date.now(),
      };
      const req = store.add(record);
      req.onsuccess = () => resolve({ ...record, id: req.result });
      req.onerror = () => reject(req.error);
    });
  }

  async getPendingVoiceRecordings() {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([VOICE_STORE_NAME], 'readonly');
      const store = tx.objectStore(VOICE_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteVoiceRecording(id) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([VOICE_STORE_NAME], 'readwrite');
      const store = tx.objectStore(VOICE_STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async notifyPendingVoiceRecordings() {
    try {
      const pending = await this.getPendingVoiceRecordings();
      if (pending.length > 0) {
        window.dispatchEvent(new CustomEvent('voiceRecordingsPending', {
          detail: { count: pending.length },
        }));
      }
    } catch (err) {
      console.warn('[SyncManager] No se pudo verificar voice recordings pendientes:', err.message);
    }
  }

  // Obtener estadísticas de sincronización
  async getSyncStats() {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve({ pendingCount: request.result, isOnline: this.isOnline, isSyncing: this.isSyncing });
      request.onerror = () => reject(request.error);
    });
  }

  // Obtener tareas pendientes del store unificado (Fase 5 ADR-019)
  async getPendingTasks() {
    // Redirigir al store unificado filtrando por status=pending
    const allLogs = await logCache.getByType('log--task');
    const completedIds = getCompletedTaskIds(allLogs);

    return allLogs
      .filter(l => l.status === 'pending' && !completedIds.has(l.id))
      .map(l => ({
        ...l,
        title: l.name,
        deadline: this.calculateDeadlineFromTimestamp(l.timestamp),
        severity: this.calculateSeverityFromNotes(l.attributes?.notes?.value || '')
      }));
  }

  // Guardar tareas pendientes en IndexedDB mediante el store unificado.
  async savePendingTasks(tasks) {
    // Wrapper para compatibilidad legacy. Mapea al nuevo bulkPut.
    for (const task of tasks) {
      const normalized = task.originalData || {
        id: task.id,
        type: 'log--task',
        attributes: {
          name: task.title,
          status: task.status,
          timestamp: task.timestamp,
        }
      };
      await logCache.put(normalized);
    }
    return tasks;
  }

  // Fetch tareas pendientes desde FarmOS API
  async fetchPendingTasksFromFarmOS() {
    if (!this.isOnline) {
      console.warn('Sin conexión, usando tareas caché en IndexedDB');
      return this.getPendingTasks();
    }

    try {
      const now = new Date();
      const oneWeekAgo = Math.floor((now.getTime() - (7 * 24 * 60 * 60 * 1000)) / 1000);
      const oneWeekFuture = Math.floor((now.getTime() + (7 * 24 * 60 * 60 * 1000)) / 1000);

      const endpoint = '/api/log/activity?' +
        'include=quantity&' +
        'filter[date_range][condition][path]=timestamp&' +
        'filter[date_range][condition][operator]=BETWEEN&' +
        'filter[date_range][condition][value][0]=' + oneWeekAgo + '&' +
        'filter[date_range][condition][value][1]=' + oneWeekFuture;

      const response = await fetchFromFarmOS(endpoint);

      if (response.data && Array.isArray(response.data)) {
        // Normalizar y guardar como log--task en el store unificado
        const normalized = response.data.map(remote => ({
          ...remote,
          type: 'log--task' // Forzamos el tipo para el cache local
        }));
        await logCache.bulkPut('log--task', normalized, response.included);
      }

      return this.getPendingTasks();
    } catch (error) {
      console.error('Error obteniendo tareas de FarmOS:', error);
      return this.getPendingTasks();
    }
  }

  // Helpers extraídos para limpieza del modelo (Fase 5)
  calculateSeverityFromNotes(notesText) {
    if (!notesText) return 'medium';
    const notesLower = notesText.toLowerCase();
    if (notesLower.includes('emergencia') || notesLower.includes('crítico') || notesLower.includes('urgente')) return 'critical';
    if (notesLower.includes('importante') || notesLower.includes('prioridad')) return 'high';
    if (notesLower.includes('preventivo') || notesLower.includes('rutinario') || notesLower.includes('monitoreo')) return 'low';
    return 'medium';
  }

  calculateDeadlineFromTimestamp(timestamp) {
    const tsValue = typeof timestamp === 'number' ? timestamp * 1000 : Date.parse(timestamp) || 0;
    if (!tsValue) return 'Pendiente';
    const taskDate = new Date(tsValue);
    const nowDate = new Date();
    const daysDiff = Math.floor((nowDate - taskDate) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      const absDaysDiff = Math.abs(daysDiff);
      if (absDaysDiff === 0) return `Hoy ${taskDate.getHours().toString().padStart(2, '0')}:${taskDate.getMinutes().toString().padStart(2, '0')}`;
      if (absDaysDiff === 1) return 'Mañana';
      return absDaysDiff <= 7 ? `En ${absDaysDiff} días` : 'Próximamente';
    } else if (daysDiff === 0) {
      return `Hoy ${taskDate.getHours().toString().padStart(2, '0')}:${taskDate.getMinutes().toString().padStart(2, '0')}`;
    } else if (daysDiff === 1) {
      return 'Vencido (Ayer)';
    }
    return `Vencido hace ${daysDiff} días`;
  }
}

// Singleton
export const syncManager = new SyncManager();