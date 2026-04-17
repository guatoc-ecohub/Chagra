import { sendToFarmOS, fetchFromFarmOS } from './apiService';
import { openDB, STORES } from '../db/dbCore';

const STORE_NAME = 'pending_transactions';
const TASKS_STORE_NAME = 'pending_tasks';
const VOICE_STORE_NAME = STORES.PENDING_VOICE;

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

interface PendingTransactionRecord {
  id?: number | string;
  type: string;
  timestamp?: number;
  synced?: boolean;
  retries?: number;
  lastError?: string;
  payload?: {
    data?: {
      type?: string;
      id?: string;
      attributes?: Record<string, unknown>;
      relationships?: Record<string, { data?: unknown }>;
    };
    endpoint?: string;
    [key: string]: unknown;
  };
  endpoint?: string;
  method?: string;
  remoteId?: string;
  _quantityMeta?: {
    label?: string;
    value?: number | string;
    measure?: string;
    unit?: string;
  };
  [key: string]: unknown;
}

interface VoiceMetadata {
  durationMs?: number;
  status?: string;
  lastError?: string | null;
}

interface TaskRecord {
  id: string;
  title: string;
  deadline: string;
  severity: string;
  status: string;
  timestamp: number;
  originalData: unknown;
  [key: string]: unknown;
}

interface FarmOSLogResponse {
  data?: Array<{
    id: string;
    attributes?: {
      name?: string;
      timestamp?: string | number;
      status?: string;
      notes?: string | { value?: string } | null;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

class SyncManager {
  db: IDBDatabase | null = null;
  isOnline: boolean = navigator.onLine;
  isSyncing: boolean = false;

  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
  }

  // Hotfix 11.6: delega la apertura a dbCore (singleton). Preserva la
  // interfaz pública initDB() para no romper callers existentes.
  async initDB(): Promise<void> {
    this.db = await openDB();
  }

  // Guardar transacción pendiente
  async saveTransaction(transactionData: Partial<PendingTransactionRecord>): Promise<PendingTransactionRecord> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const transactionRecord: PendingTransactionRecord = {
        ...transactionData,
        type: transactionData.type ?? 'unknown',
        timestamp: Date.now(),
        synced: false,
      };

      const request = store.add(transactionRecord);

      request.onsuccess = () => resolve(transactionRecord);
      request.onerror = () => reject(request.error);
    });
  }

  // Obtener transacciones pendientes ordenadas por timestamp (no por clave IDB).
  // El orden importa: el asset debe sincronizarse antes que el log que lo referencia.
  async getPendingTransactions(): Promise<PendingTransactionRecord[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const all = (request.result as PendingTransactionRecord[]) || [];
        const pending = all.filter((r) => !r.synced);
        pending.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        resolve(pending);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Eliminar transacción sincronizada
  async deleteTransaction(id: number | string): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id as IDBValidKey);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Marcar retries en una transacción
  async markRetry(id: number | string, errorMsg: string): Promise<number | void> {
    if (!this.db) await this.initDB();

    return new Promise<number | void>((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(id as IDBValidKey);

      getReq.onsuccess = () => {
        const record = getReq.result as PendingTransactionRecord | undefined;
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
  async syncAll(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      const pendingTransactions = await this.getPendingTransactions();

      for (const transaction of pendingTransactions) {
        const currentRetries = transaction.retries || 0;
        if (currentRetries >= MAX_RETRIES) {
          failed++;
          continue;
        }

        if (currentRetries > 0) {
          const backoffMs = BASE_BACKOFF_MS * Math.pow(2, currentRetries - 1);
          await new Promise((r) => setTimeout(r, backoffMs));
        }

        try {
          await this.syncTransaction(transaction);
          if (transaction.id !== undefined) await this.deleteTransaction(transaction.id);
          synced++;
          console.info(`[SyncManager] Transacción ${transaction.id} completada y purgada.`);
          window.dispatchEvent(
            new CustomEvent('syncCompleted', {
              detail: {
                type: transaction.type,
                id: transaction.id,
                remoteId: transaction.remoteId,
              },
            })
          );
        } catch (error) {
          const err = error as { status?: number; message?: string };
          // 422 = datos inválidos (no reintentable). 404 = endpoint no encontrado
          // (puede ser módulo deshabilitado o ID incorrecto — se reintenta).
          const isUnrecoverable = err.status === 422 || err.status === 409;
          if (isUnrecoverable) {
            console.error(
              `[SyncManager] Error no recuperable HTTP ${err.status}. Descartando transacción ${transaction.id}.`,
              error
            );
            if (transaction.id !== undefined) await this.deleteTransaction(transaction.id);
            failed++;
            const name = transaction.payload?.data?.attributes?.['name'] || transaction.type;
            window.dispatchEvent(
              new CustomEvent('syncError', {
                detail: { message: `Transacción "${name}" descartada (HTTP ${err.status}).` },
              })
            );
          } else {
            const retries = transaction.id !== undefined
              ? await this.markRetry(transaction.id, err.message || 'unknown')
              : 0;
            console.warn(
              `[SyncManager] Fallo de red/servidor en transacción ${transaction.id} (intento ${retries}/${MAX_RETRIES}). Marcando para reintento.`,
              error
            );
            if ((retries ?? 0) >= MAX_RETRIES) {
              failed++;
              const name = transaction.payload?.data?.attributes?.['name'] || transaction.type;
              window.dispatchEvent(
                new CustomEvent('syncError', {
                  detail: {
                    message: `Fallo permanente al sincronizar "${name}". Verifique conexión con FarmOS.`,
                  },
                })
              );
            }
          }
        }
      }

      if (failed === 0 && synced > 0) {
        window.dispatchEvent(new CustomEvent('syncComplete', { detail: { synced } }));

        try {
          const { mediaCache } = await import('../db/mediaCache');
          mediaCache.purgeStale().catch((e) =>
            console.warn('[SyncManager] Purge de media stale fallido:', e)
          );
        } catch (_e) {
          /* noop */
        }

        try {
          const { useLogStore } = await import('../store/useLogStore');
          useLogStore
            .getState()
            .pullRecentLogs(fetchFromFarmOS as (endpoint: string) => Promise<{ data?: unknown[]; included?: unknown[] }>)
            .catch((e: unknown) =>
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
  async syncTransaction(transaction: PendingTransactionRecord): Promise<unknown> {
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
      const qtyResult = (await sendToFarmOS('/api/quantity/standard', qtyPayload, 'POST')) as {
        data?: { id?: string };
      };
      const qtyId = qtyResult?.data?.id;
      if (qtyId && transaction.payload) {
        transaction.payload.data = transaction.payload.data || {};
        transaction.payload.data.relationships = transaction.payload.data.relationships || {};
        transaction.payload.data.relationships['quantity'] = {
          data: [{ type: 'quantity--standard', id: qtyId }],
        };
      }
    }

    // Paso principal: enviar el payload del log/asset
    const result = await sendToFarmOS(
      targetEndpoint,
      transaction.payload,
      transaction.method || 'POST'
    );

    // Fase 20.2: si hay media asociada, subir binarios y vincular al log
    try {
      const { mediaCache } = await import('../db/mediaCache');
      const logId = (transaction.remoteId || String(transaction.id ?? '')) as string;
      const mediaItems = await mediaCache.getByLogId(logId);

      if (mediaItems.length > 0) {
        const fileUuids: Array<{ type: string; id: string }> = [];
        const diagnoses: Array<{ score: number; issues: string[]; treatment_suggestion: string }> = [];

        for (const item of mediaItems) {
          // Paso A: POST /api/file/upload con FormData
          const formData = new FormData();
          const filename = `evidence_${logId}_${item.id}.webp`;
          formData.append('file', item.blob, filename);

          const fileResult = (await sendToFarmOS('/api/file/upload', formData, 'POST')) as {
            data?: { id?: string };
          };
          const fileUuid = fileResult?.data?.id;
          if (fileUuid) {
            fileUuids.push({ type: 'file--file', id: fileUuid });
            console.info(`[Sync] Media ${item.id} subida como file ${fileUuid}.`);
          }

          if (item.ai_diagnosis)
            diagnoses.push(
              item.ai_diagnosis as { score: number; issues: string[]; treatment_suggestion: string }
            );
        }

        // Paso B: PATCH del log vinculando TODOS los files + diagnóstico en notas
        if (fileUuids.length > 0) {
          const logType = transaction.payload?.data?.type || 'log--activity';
          const logSuffix = logType.split('--')[1] || 'activity';

          const patchAttrs: Record<string, unknown> = {};
          if (diagnoses.length > 0) {
            const diagText = diagnoses
              .map(
                (d) =>
                  `[IA] Score: ${d.score}/100. ${d.issues.join('; ')}. Rec: ${d.treatment_suggestion}`
              )
              .join('\n');
            patchAttrs['notes'] = { value: diagText, format: 'plain_text' };
          }

          await sendToFarmOS(
            `/api/log/${logSuffix}/${logId}`,
            {
              data: {
                type: logType,
                id: logId,
                ...(Object.keys(patchAttrs).length > 0 ? { attributes: patchAttrs } : {}),
                relationships: {
                  file: { data: fileUuids },
                },
              },
            },
            'PATCH'
          );
        }

        // Limpiar binarios del cache local tras éxito
        await mediaCache.removeByLogId(logId);
      }
    } catch (mediaErr) {
      console.warn('[Sync] Error subiendo media (no bloqueante):', (mediaErr as Error).message);
    }

    return result;
  }

  // Helper de retrocompatibilidad: resuelve endpoint por type cuando la transacción
  // fue encolada sin endpoint explícito (formato anterior a Fase 12).
  resolveLegacyEndpoint(transaction: PendingTransactionRecord): string | null {
    const type = transaction.type;
    switch (type) {
      case 'log--planting':
      case 'planting':
        return '/api/log/seeding';
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
  startNetworkMonitoring(): void {
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
  async saveVoiceRecording(blob: Blob, metadata: VoiceMetadata = {}): Promise<Record<string, unknown>> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([VOICE_STORE_NAME], 'readwrite');
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

  async getPendingVoiceRecordings(): Promise<Array<Record<string, unknown>>> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([VOICE_STORE_NAME], 'readonly');
      const store = tx.objectStore(VOICE_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as Array<Record<string, unknown>>) || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteVoiceRecording(id: number | string): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction([VOICE_STORE_NAME], 'readwrite');
      const store = tx.objectStore(VOICE_STORE_NAME);
      const req = store.delete(id as IDBValidKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async notifyPendingVoiceRecordings(): Promise<void> {
    try {
      const pending = await this.getPendingVoiceRecordings();
      if (pending.length > 0) {
        window.dispatchEvent(
          new CustomEvent('voiceRecordingsPending', {
            detail: { count: pending.length },
          })
        );
      }
    } catch (err) {
      console.warn(
        '[SyncManager] No se pudo verificar voice recordings pendientes:',
        (err as Error).message
      );
    }
  }

  // Obtener estadísticas de sincronización
  async getSyncStats(): Promise<{ pendingCount: number; isOnline: boolean; isSyncing: boolean }> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () =>
        resolve({ pendingCount: request.result, isOnline: this.isOnline, isSyncing: this.isSyncing });
      request.onerror = () => reject(request.error);
    });
  }

  // Obtener tareas pendientes de IndexedDB (caché offline)
  async getPendingTasks(): Promise<TaskRecord[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TASKS_STORE_NAME], 'readonly');
      const store = transaction.objectStore(TASKS_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve((request.result as TaskRecord[]) || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Guardar tareas pendientes en IndexedDB mediante upsert por id.
  async savePendingTasks(tasks: TaskRecord[]): Promise<TaskRecord[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TASKS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(TASKS_STORE_NAME);
      const now = Date.now();

      for (const task of tasks) {
        store.put({ ...task, cachedAt: now });
      }

      transaction.oncomplete = () => resolve(tasks);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  // Fetch tareas pendientes desde FarmOS API
  async fetchPendingTasksFromFarmOS(): Promise<TaskRecord[]> {
    if (!this.isOnline) {
      console.warn('Sin conexión, usando tareas caché en IndexedDB');
      return this.getPendingTasks();
    }

    try {
      const now = new Date();
      const oneWeekAgo = Math.floor((now.getTime() - 7 * 24 * 60 * 60 * 1000) / 1000);
      const oneWeekFuture = Math.floor((now.getTime() + 7 * 24 * 60 * 60 * 1000) / 1000);

      const endpoint =
        '/api/log/activity?' +
        'filter[date_range][condition][path]=timestamp&' +
        'filter[date_range][condition][operator]=BETWEEN&' +
        'filter[date_range][condition][value][0]=' +
        oneWeekAgo +
        '&' +
        'filter[date_range][condition][value][1]=' +
        oneWeekFuture;
      console.log(`🔍 Consultando endpoint FarmOS: ${import.meta.env.VITE_FARMOS_URL}${endpoint}`);
      const response = (await fetchFromFarmOS(endpoint)) as FarmOSLogResponse;

      const tasks: TaskRecord[] = [];

      if (response.data && Array.isArray(response.data)) {
        console.log(`📦 Respuesta de FarmOS: ${response.data.length} registros encontrados`);
        response.data.forEach((log) => {
          const attributes = log.attributes || {};
          const timestamp = attributes.timestamp || '';
          const logStatus = attributes.status || 'pending';

          const notesRaw = attributes.notes;
          const notesText =
            typeof notesRaw === 'object' && notesRaw !== null && 'value' in notesRaw && notesRaw.value
              ? notesRaw.value
              : typeof notesRaw === 'string'
                ? notesRaw
                : '';

          let severity = 'medium';
          if (notesText) {
            const notesLower = notesText.toLowerCase();
            if (
              notesLower.includes('emergencia') ||
              notesLower.includes('crítico') ||
              notesLower.includes('urgente')
            ) {
              severity = 'critical';
            } else if (notesLower.includes('importante') || notesLower.includes('prioridad')) {
              severity = 'high';
            } else if (
              notesLower.includes('preventivo') ||
              notesLower.includes('rutinario') ||
              notesLower.includes('monitoreo')
            ) {
              severity = 'low';
            }
          }

          const tsValue =
            typeof timestamp === 'number' ? timestamp * 1000 : Date.parse(String(timestamp)) || 0;
          const taskDate = new Date(tsValue);
          const nowDate = new Date();
          const daysDiff = Math.floor(
            (nowDate.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          let deadline = '';
          if (daysDiff < 0) {
            const absDaysDiff = Math.abs(daysDiff);
            if (absDaysDiff === 0) {
              const hours = taskDate.getHours().toString().padStart(2, '0');
              const minutes = taskDate.getMinutes().toString().padStart(2, '0');
              deadline = `Hoy ${hours}:${minutes}`;
            } else if (absDaysDiff === 1) {
              deadline = 'Mañana';
            } else if (absDaysDiff <= 7) {
              deadline = `En ${absDaysDiff} días`;
            } else {
              deadline = 'Próximamente';
            }
          } else if (daysDiff === 0) {
            const hours = taskDate.getHours().toString().padStart(2, '0');
            const minutes = taskDate.getMinutes().toString().padStart(2, '0');
            deadline = `Hoy ${hours}:${minutes}`;
          } else if (daysDiff === 1) {
            deadline = 'Vencido (Ayer)';
          } else {
            deadline = `Vencido hace ${daysDiff} días`;
          }

          tasks.push({
            id: log.id,
            title: attributes.name || 'Tarea sin título',
            deadline: deadline,
            severity: logStatus === 'done' ? 'completed' : severity,
            status: logStatus,
            timestamp:
              typeof timestamp === 'number'
                ? timestamp
                : Math.floor(Date.parse(String(timestamp)) / 1000) || 0,
            originalData: log,
          });
        });
      } else {
        console.log('⚠️ Respuesta de FarmOS vacía o sin data:', response);
      }

      await this.savePendingTasks(tasks);

      return tasks;
    } catch (error) {
      console.error('Error obteniendo tareas de FarmOS:', error);

      console.log('Usando tareas caché en IndexedDB');
      return this.getPendingTasks();
    }
  }
}

// Singleton
export const syncManager = new SyncManager();
