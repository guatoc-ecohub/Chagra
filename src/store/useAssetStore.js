import { create } from 'zustand';
import { assetCache, openDB, STORES } from '../db/assetCache';
import { logCache } from '../db/logCache';
import { useLogStore } from './useLogStore';
import { newId } from '../utils/id';
import { savePayload, updatePayload } from '../services/payloadService';

/**
 * Store global de Activos (Zustand)
 * Patrón Offline-First: memoria (Zustand) ← IndexedDB ← FarmOS API
 *
 * Tipos de activos FarmOS v2:
 *   - structure: Invernaderos, Composteras, Infraestructura bioclimática
 *   - equipment: Azadones, Carretillas, Herramientas manuales
 *   - material:  Biol, Lombricompost, Insumos orgánicos
 */

const useAssetStore = create((set, get) => ({
  // Estado
  plants: [],
  structures: [],
  equipment: [],
  materials: [],
  lands: [], // Fase 17: zonas (field/greenhouse/bed) para jerarquía espacial
  taxonomyTerms: [],
  lastSync: null,
  isLoading: false,
  error: null,

  // Estado de navegación: activo seleccionado para vista de detalle (Fase 12.1)
  selectedAssetId: null,
  setSelectedAsset: (id) => set({ selectedAssetId: id }),
  clearSelectedAsset: () => set({ selectedAssetId: null }),

  // Cargar desde IndexedDB al iniciar (rehidratación offline)
  hydrate: async () => {
    try {
      const [plants, structures, equipment, materials, lands, taxonomyTerms] = await Promise.all([
        assetCache.getByType('plant'),
        assetCache.getByType('structure'),
        assetCache.getByType('equipment'),
        assetCache.getByType('material'),
        assetCache.getByType('land'),
        assetCache.getAllTaxonomyTerms(),
      ]);
      const lastSync = await assetCache.getLastSync();
      set({ plants, structures, equipment, materials, lands, taxonomyTerms, lastSync });
    } catch (err) {
      console.error('Error rehidratando asset store desde IndexedDB:', err);
    }
  },

  // Sincronizar desde FarmOS API → IndexedDB → Zustand.
  // Si se pasa assetType, solo refresca ese tipo (pull dirigido tras syncCompleted).
  syncFromServer: async (fetchFn, assetType = null) => {
    set({ isLoading: true, error: null });
    const targets = assetType
      ? [assetType]
      : ['plant', 'structure', 'equipment', 'material', 'land'];
    const typeToKey = {
      plant: 'plants',
      structure: 'structures',
      equipment: 'equipment',
      material: 'materials',
      land: 'lands',
    };
    try {
      const results = await Promise.all(targets.map(async (t) => {
        const res = await fetchFn(`/api/asset/${t}`);
        const list = res.data || [];
        await assetCache.bulkPut(t, list);
        return { key: typeToKey[t], data: await assetCache.getByType(t) };
      }));
      const partialUpdate = {};
      for (const r of results) partialUpdate[r.key] = r.data;
      await assetCache.setLastSync(Date.now());
      set({
        ...partialUpdate,
        lastSync: Date.now(),
        isLoading: false,
      });
    } catch (err) {
      console.error('Error sincronizando activos:', err);
      set({ error: err.message, isLoading: false });
      // Fallback: mantener datos de IndexedDB ya cargados via hydrate()
    }
  },

  // Sincronizar taxonomy terms desde FarmOS API
  syncTaxonomyTerms: async (fetchFn) => {
    try {
      const [plantTypes, materialTypes] = await Promise.all([
        fetchFn('/api/taxonomy_term/plant_type'),
        fetchFn('/api/taxonomy_term/material_type'),
      ]);

      const terms = [
        ...(plantTypes.data || []),
        ...(materialTypes.data || []),
      ];

      await assetCache.bulkPutTaxonomyTerms(terms);
      set({ taxonomyTerms: terms });
    } catch (err) {
      console.error('Error sincronizando taxonomy terms:', err);
    }
  },

  // Crear asset con commit atómico: IDB (assets + pending_transactions) en una sola tx
  addAsset: async (assetType, asset, pendingTxs = []) => {
    try {
      await assetCache.commitOptimisticUpdate([{ assetType, asset }], pendingTxs);
      set((state) => {
        const key = assetType === 'plant' ? 'plants'
          : assetType === 'structure' ? 'structures'
          : assetType === 'equipment' ? 'equipment'
          : 'materials';
        return { [key]: [...state[key], asset] };
      });
      navigator.serviceWorker?.controller?.postMessage({ type: 'SYNC_REQUESTED' });
    } catch (error) {
      console.error('[Store] Fallo en addAsset atómico:', error);
      throw error;
    }
  },

  // ADR-030 Bloque A: bulk creation atómica para `tracking_mode: individual`
  // con qty>1 (siembra batch de N plantas individuales con UUIDs únicos).
  // Garantiza atomicidad — si falla cualquier parte, ningún asset queda
  // medio-creado.
  addAssetsBulk: async (assetType, assets, pendingTxs = []) => {
    if (!Array.isArray(assets) || assets.length === 0) {
      throw new Error('addAssetsBulk requiere un array de assets no vacío');
    }
    try {
      const updates = assets.map((asset) => ({ assetType, asset }));
      await assetCache.commitOptimisticUpdate(updates, pendingTxs);
      set((state) => {
        const key = assetType === 'plant' ? 'plants'
          : assetType === 'structure' ? 'structures'
          : assetType === 'equipment' ? 'equipment'
          : 'materials';
        return { [key]: [...state[key], ...assets] };
      });
      navigator.serviceWorker?.controller?.postMessage({ type: 'SYNC_REQUESTED' });
    } catch (error) {
      console.error('[Store] Fallo en addAssetsBulk atómico:', error);
      throw error;
    }
  },

  // Actualizar asset con commit atómico
  updateAsset: async (assetType, asset, pendingTxs = []) => {
    try {
      await assetCache.commitOptimisticUpdate([{ assetType, asset }], pendingTxs);
      set((state) => {
        const key = assetType === 'plant' ? 'plants'
          : assetType === 'structure' ? 'structures'
          : assetType === 'equipment' ? 'equipment'
          : 'materials';
        return { [key]: state[key].map((a) => a.id === asset.id ? asset : a) };
      });
      navigator.serviceWorker?.controller?.postMessage({ type: 'SYNC_REQUESTED' });
    } catch (error) {
      console.error('[Store] Fallo en updateAsset atómico:', error);
      throw error;
    }
  },

  // Eliminar asset con borrado físico + encolado del DELETE en una sola tx IDB
  removeAsset: async (assetType, assetId) => {
    try {
      const pendingTx = {
        id: crypto.randomUUID(),
        remoteId: assetId,
        type: `delete_${assetType}`,
        endpoint: `/api/asset/${assetType}/${assetId}`,
        method: 'DELETE',
        payload: null
      };

      const db = await openDB();
      const tx = db.transaction([STORES.ASSETS, STORES.PENDING_TX], 'readwrite');
      tx.objectStore(STORES.ASSETS).delete(assetId);
      tx.objectStore(STORES.PENDING_TX).put({
        ...pendingTx,
        synced: false,
        retries: 0,
        timestamp: Date.now()
      });

      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onabort = () => reject(tx.error);
        tx.onerror = () => reject(tx.error);
      });

      set((state) => {
        const key = assetType === 'plant' ? 'plants'
          : assetType === 'structure' ? 'structures'
          : assetType === 'equipment' ? 'equipment'
          : 'materials';
        return { [key]: state[key].filter((a) => a.id !== assetId) };
      });
      navigator.serviceWorker?.controller?.postMessage({ type: 'SYNC_REQUESTED' });
    } catch (error) {
      console.error('[Store] Fallo en removeAsset atómico:', error);
      throw error;
    }
  },

  // Registrar una cosecha (log--harvest) con actualización optimista atómica
  addHarvestLog: async (assetId, harvestData) => {
    const logId = crypto.randomUUID();
    const payload = {
      data: {
        type: "log--harvest",
        id: logId,
        attributes: {
          name: `Cosecha: ${harvestData.cropName} - ${new Date().toISOString().split('T')[0]}`,
          timestamp: Math.floor(Date.now() / 1000),
          status: "done",
          notes: harvestData.notes || "",
        },
        relationships: {
          asset: { data: [{ type: "asset--plant", id: assetId }] },
          quantity: {
            data: [{
              type: "quantity--standard",
              attributes: {
                measure: "weight",
                value: parseFloat(harvestData.yield) || 0,
                label: harvestData.unit
              }
            }]
          }
        }
      }
    };

    const currentPlant = get().plants.find((p) => p.id === assetId);
    if (!currentPlant) throw new Error("Planta no encontrada en el store local");

    // ADR-019 Regla 2 (Fase 2): la cosecha vive SOLO como log--harvest (encolado
    // abajo). Antes mutábamos asset.latestHarvest y asset.status='harvested',
    // pero esos campos eran derivables y no tenían consumidores reales en el
    // código (grep -rn confirma cero references). Violaban la regla "vistas
    // derivadas no se almacenan como campo de Asset". El estado "cosechada"
    // se deriva de exists(log--harvest where relationships.asset includes
    // plant.id) — patrón ya usado por AssetTimeline.jsx que es la hoja de
    // vida derivada de la planta.
    const harvestQuantity = {
      value: parseFloat(harvestData.yield) || 0,
      unit: harvestData.unit,
      label: 'weight',
      measure: 'weight',
    };
    const pendingTx = {
      id: logId,
      type: 'log--harvest',
      endpoint: '/api/log/harvest',
      payload,
      method: 'POST'
    };

    // 0. Escritura optimista en el caché de logs (Hotfix 11.3)
    // Pseudo-atómico respecto al commit siguiente: si el commit falla,
    // el log optimista quedará huérfano pero será purgado por el GC de
    // logCache.bulkPut en el próximo pull, ya que no habrá pending_tx asociada.
    const optimisticLog = {
      id: logId,
      type: 'log--harvest',
      asset_id: assetId,
      timestamp: Math.floor(Date.now() / 1000),
      name: payload.data.attributes.name,
      quantity: harvestQuantity,
      status: 'pending',
      attributes: { ...payload.data.attributes, quantity: harvestQuantity },
      relationships: payload.data.relationships,
      _pending: true,
    };

    try {
      await logCache.put(optimisticLog);
      useLogStore.getState().loadLogsForAsset(assetId);
    } catch (logErr) {
      console.warn('[Store] Fallo al persistir log optimista (no bloqueante):', logErr);
    }

    try {
      // 1. Commit atómico — solo encola pending_tx; no mutamos el asset.
      await assetCache.commitOptimisticUpdate(
        [],
        [pendingTx]
      );

      // 2. Sin mutación de asset → no actualizamos plants en Zustand.
      //    El log optimista de arriba ya alimentó useLogStore para que la
      //    timeline (AssetTimeline.jsx) re-renderice al instante.

      // 3. Emitir evento para forzar ciclo de sync en background sin bloquear
      if (typeof window !== 'undefined') {
        navigator.serviceWorker?.controller?.postMessage({ type: 'SYNC_REQUESTED' });
      }
    } catch (error) {
      console.error('[Transaction] Fallo al aplicar mutación atómica:', error);
      throw error; // UI debe atrapar esto y revertir estado visual de carga
    }
  },

  // Registrar una aplicación de insumo (log--input) — Fase 11.7 / refactor 13.1.
  // Operación atómica: crea el log + descuenta el stock del material en bodega
  // + encola la pending_tx de red, todo en una sola transacción IDB.
  addInputLog: async (assetId, inputData) => {
    const logId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    // 1. Resolver el material en bodega (matching por nombre canónico)
    const materialName = inputData.name?.replace(/^Aplicación de /, '') || '';
    const { materials } = get();
    const materialAsset = materials.find(
      (m) => (m.attributes?.name || m.name) === materialName
    );

    // 2. Lógica de descuento con conversión de unidades
    const assetUpdates = [];
    const extraPendingTxs = [];
    if (materialAsset) {
      let deduction = parseFloat(inputData.value) || 0;
      const invUnit = materialAsset.attributes?.inventory_unit || materialAsset.unit || inputData.unit;

      // Conversión a la unidad del inventario
      if (inputData.unit === 'ml' && invUnit === 'l') deduction /= 1000;
      if (inputData.unit === 'g' && invUnit === 'kg') deduction /= 1000;
      if (inputData.unit === 'l' && invUnit === 'ml') deduction *= 1000;
      if (inputData.unit === 'kg' && invUnit === 'g') deduction *= 1000;

      const currentStock = parseFloat(materialAsset.attributes?.inventory_value) || 0;
      const newStock = Math.max(0, currentStock - deduction);
      // ADR-019 Fase 4: timestamp LWW field-level para inventory_value.
      // Permite que dos dispositivos editando offline reconcilien sin que
      // el último PATCH ciegamente sobrescriba al primero al recuperar red.
      const inventoryTs = Date.now();

      const updatedMaterial = {
        ...materialAsset,
        attributes: {
          ...materialAsset.attributes,
          inventory_value: newStock,
          inventory_value_updated_at: inventoryTs,
          inventory_unit: invUnit,
        },
        _pending: true,
      };

      assetUpdates.push(updatedMaterial);

      // Hotfix 13.3 + ADR-019 Fase 4: PATCH idempotente con timestamp LWW.
      // El servidor (cuando FarmOS exponga el campo) o el bulkPut local
      // comparan timestamps al merge; si local > remote, local preserva.
      extraPendingTxs.push({
        id: crypto.randomUUID(),
        type: 'asset_material',
        remoteId: materialAsset.id,
        endpoint: `/api/asset/material/${materialAsset.id}`,
        method: 'PATCH',
        payload: {
          data: {
            type: 'asset--material',
            id: materialAsset.id,
            attributes: {
              inventory_value: newStock,
              inventory_value_updated_at: inventoryTs,
            },
          },
        },
      });
    }

    // 3. Payload JSON:API del log (quantity se resuelve en syncManager)
    const payload = {
      data: {
        type: 'log--input',
        id: logId,
        attributes: {
          name: inputData.name || 'Aplicación de insumo',
          timestamp,
          status: 'done',
          notes: inputData.notes
            ? { value: inputData.notes, format: 'default' }
            : null,
        },
        relationships: {
          asset: { data: [{ type: 'asset--plant', id: assetId }] },
        },
      },
    };

    const inputQuantity = {
      value: parseFloat(inputData.value) || 0,
      unit: inputData.unit || 'ml',
      label: inputData.label || 'Cantidad',
      measure: null,
    };
    const optimisticLog = {
      id: logId,
      type: 'log--input',
      asset_id: assetId,
      timestamp,
      name: payload.data.attributes.name,
      quantity: inputQuantity,
      status: 'done',
      attributes: { ...payload.data.attributes, quantity: inputQuantity },
      relationships: payload.data.relationships,
      _pending: true,
    };

    // 4. Escritura optimista del log (store separado, pseudo-atómica)
    try {
      await logCache.put(optimisticLog);
      useLogStore.getState().loadLogsForAsset(assetId);
    } catch (logErr) {
      console.warn('[Store] Fallo al persistir log de insumo optimista (no bloqueante):', logErr);
    }

    const pendingTx = {
      id: logId,
      type: 'log--input',
      endpoint: '/api/log/input',
      payload,
      method: 'POST',
      _quantityMeta: {
        label: inputData.label || 'Cantidad',
        value: parseFloat(inputData.value) || 0,
        unit: inputData.unit || 'ml',
        measure: 'volume',
      },
    };

    // 5. Commit atómico: stock descontado + pending_txs (log + PATCH material)
    try {
      await assetCache.commitOptimisticUpdate(
        assetUpdates.map((asset) => ({ assetType: 'material', asset })),
        [pendingTx, ...extraPendingTxs]
      );

      // 6. Reflejo inmediato en Zustand del nuevo stock
      if (assetUpdates.length > 0) {
        set((state) => ({
          materials: state.materials.map((m) =>
            m.id === assetUpdates[0].id ? assetUpdates[0] : m
          ),
        }));
      }

      if (typeof window !== 'undefined') {
        navigator.serviceWorker?.controller?.postMessage({ type: 'SYNC_REQUESTED' });
      }
    } catch (error) {
      console.error('[Transaction] Fallo al aplicar log de insumo:', error);
      throw error;
    }
  },

  // Abastecimiento de material (Fase 13.4 / refactor 13.6) — alineado con biofábrica Restrepo:
  // el refill representa una cocinada/producción del insumo, no una compra.
  // Commit atómico: actualiza stock local + encola PATCH al servidor.
  // Soporta conversión bidireccional de unidades (l↔ml, kg↔g).
  refillMaterial: async (materialId, amount, selectedUnit = null) => {
    const material = get().materials.find((m) => m.id === materialId);
    if (!material) throw new Error('Material no encontrado en bodega');

    const invUnit = material.attributes?.inventory_unit || material.unit || selectedUnit;
    let converted = parseFloat(amount) || 0;
    if (selectedUnit && invUnit && selectedUnit !== invUnit) {
      if (selectedUnit === 'l' && invUnit === 'ml') converted *= 1000;
      else if (selectedUnit === 'kg' && invUnit === 'g') converted *= 1000;
      else if (selectedUnit === 'ml' && invUnit === 'l') converted /= 1000;
      else if (selectedUnit === 'g' && invUnit === 'kg') converted /= 1000;
    }

    const currentStock = parseFloat(material.attributes?.inventory_value) || 0;
    const newStock = currentStock + converted;
    // ADR-019 Fase 4: timestamp LWW field-level (ver addInputLog para detalle).
    const inventoryTs = Date.now();

    const updatedMaterial = {
      ...material,
      attributes: {
        ...material.attributes,
        inventory_value: newStock,
        inventory_value_updated_at: inventoryTs,
      },
      _pending: true,
    };

    const pendingTx = {
      id: crypto.randomUUID(),
      type: 'asset_material',
      remoteId: material.id,
      endpoint: `/api/asset/material/${material.id}`,
      method: 'PATCH',
      payload: {
        data: {
          type: 'asset--material',
          id: material.id,
          attributes: {
            inventory_value: newStock,
            inventory_value_updated_at: inventoryTs,
          },
        },
      },
    };

    try {
      await assetCache.commitOptimisticUpdate(
        [{ assetType: 'material', asset: updatedMaterial }],
        [pendingTx]
      );

      set((state) => ({
        materials: state.materials.map((m) => (m.id === materialId ? updatedMaterial : m)),
      }));

      if (typeof window !== 'undefined') {
        navigator.serviceWorker?.controller?.postMessage({ type: 'SYNC_REQUESTED' });
      }
    } catch (error) {
      console.error('[Store] Fallo en refillMaterial:', error);
      throw error;
    }
  },

  // ADR-019 Fase 5: Crear una nueva tarea como log--task pendiente.
  // El bundle log--task usa ULID conforme ADR-019 (lex-orderable, optimiza
  // indexación IndexedDB). Reemplaza el patrón anterior de pending_tasks
  // como snapshot del servidor — ahora las tareas son entidades de primera
  // clase que se pueden crear offline y se sincronizan via la cola normal
  // de pending_transactions.
  //
  // taskData: { name, notes, assetIds[], locationId, due }
  // Retorna { success, message } de savePayload (encolado offline o exitoso online).
  addTaskLog: async (taskData) => {
    const logId = newId('log--task');
    const ts = new Date().toISOString().split('.')[0] + '+00:00';

    const relationships = {};
    if (taskData.assetIds?.length) {
      relationships.asset = {
        data: taskData.assetIds.map((id) => ({ type: 'asset--plant', id })),
      };
    }
    if (taskData.locationId) {
      relationships.location = {
        data: [{ type: 'asset--land', id: taskData.locationId }],
      };
    }

    const payload = {
      data: {
        type: 'log--task',
        id: logId,
        attributes: {
          name: taskData.name || 'Tarea',
          timestamp: taskData.due || ts,
          status: 'pending',
          ...(taskData.notes && {
            notes: { value: taskData.notes, format: 'plain_text' },
          }),
        },
        ...(Object.keys(relationships).length > 0 && { relationships }),
      },
    };

    // Optimistic local: el log aparece en la timeline al instante.
    const optimisticLog = {
      id: logId,
      type: 'log--task',
      asset_id: taskData.assetIds?.[0] || null,
      timestamp: Math.floor(Date.now() / 1000),
      name: payload.data.attributes.name,
      status: 'pending',
      attributes: payload.data.attributes,
      relationships,
      _pending: true,
    };

    try {
      await logCache.put(optimisticLog);
      if (taskData.assetIds?.[0]) {
        useLogStore.getState().loadLogsForAsset(taskData.assetIds[0]);
      }
    } catch (logErr) {
      console.warn('[Store] Fallo persistir log--task optimista (no bloqueante):', logErr);
    }

    return savePayload('task', payload);
  },

  // updateTaskLog — editar tarea pendiente (Lili #106). Solo permite edit
  // de tareas con _pending=true (no sincronizadas aún) o pending status en
  // backend. Mismo patrón optimistic local que addTaskLog: actualiza
  // logCache inmediato + envía PATCH al backend.
  //
  // taskData: { name?, notes?, due?, status? } — cualquier subset.
  updateTaskLog: async (logId, taskData) => {
    const existing = await logCache.get(logId);
    if (!existing) {
      console.warn('[Store] updateTaskLog: log no encontrado', logId);
      return { success: false, message: 'Tarea no encontrada' };
    }

    const updatedAttributes = {
      ...existing.attributes,
      ...(taskData.name !== undefined && { name: taskData.name }),
      ...(taskData.due !== undefined && { timestamp: taskData.due }),
      ...(taskData.status !== undefined && { status: taskData.status }),
      ...(taskData.notes !== undefined && {
        notes: { value: taskData.notes, format: 'plain_text' },
      }),
    };

    const payload = {
      data: {
        type: 'log--task',
        id: logId,
        attributes: updatedAttributes,
      },
    };

    const updatedLog = {
      ...existing,
      name: updatedAttributes.name,
      status: updatedAttributes.status,
      attributes: updatedAttributes,
    };

    try {
      await logCache.put(updatedLog);
      if (updatedLog.asset_id) {
        useLogStore.getState().loadLogsForAsset(updatedLog.asset_id);
      }
    } catch (logErr) {
      console.warn('[Store] Fallo persistir log--task actualizado:', logErr);
    }

    return updatePayload('task', logId, payload);
  },

  // ADR-019 Fase 5: Completar una tarea sin mutar el log original (Regla 1).
  // Crea un SEGUNDO log--task con marker [TASK_COMPLETION] en notes.value
  // apuntando al log--task original via target_task_id. Patrón consistente
  // con [AI_REVIEW] de Fase 3 — la timeline cruza ambos logs y muestra el
  // estado actual sin necesidad de mutar el primero.
  //
  // verdict: 'completed' | 'cancelled' | 'rescheduled'
  // attachPhotoToLog — Lili #88: agregar foto a un evento de timeline existente
  // (siembras, cosechas, observaciones, aplicaciones, etc.) sin mutar el log
  // original (Regla 1 ADR-019).
  //
  // Crea un nuevo log--task con marker [PHOTO_ATTACHMENT] + target_log_id
  // referencia al log original. La foto se guarda en photoService como
  // siempre y se referencia via _photoRefId. La timeline cruza ambos para
  // mostrar la foto inline en el evento original.
  //
  // Patrón consistente con [TASK_COMPLETION] arriba — append-only, no muta.
  attachPhotoToLog: async (targetLogId, photoBlob, notes = '') => {
    if (!photoBlob) {
      return { success: false, message: 'Foto vacía' };
    }
    const logId = newId('log--task');
    const ts = new Date().toISOString().split('.')[0] + '+00:00';

    let photoRefId = null;
    try {
      const { savePhoto } = await import('../services/photoService');
      const saved = await savePhoto({
        blob: photoBlob,
        speciesSlug: null,
        meta: {
          capturedAt: new Date().toISOString(),
          attachedToLog: targetLogId,
        },
      });
      photoRefId = saved?.id || saved?._photoRefId || null;
    } catch (err) {
      console.error('[Store] Error guardando foto attachment:', err);
      return { success: false, message: 'Error guardando foto local' };
    }

    const noteLines = [
      '[PHOTO_ATTACHMENT]',
      `target_log_id: ${targetLogId}`,
      `photo_ref: ${photoRefId || 'pending'}`,
      `attached_at: ${new Date().toISOString()}`,
    ];
    if (notes) noteLines.push('', '--- Nota ---', notes);

    const payload = {
      _photoRefId: photoRefId,
      data: {
        type: 'log--task',
        id: logId,
        attributes: {
          name: `Foto adjunta a evento`,
          timestamp: ts,
          status: 'done',
          notes: { value: noteLines.join('\n'), format: 'plain_text' },
        },
      },
    };

    const optimisticLog = {
      id: logId,
      type: 'log--task',
      asset_id: null,
      timestamp: Math.floor(Date.now() / 1000),
      name: payload.data.attributes.name,
      status: 'done',
      attributes: payload.data.attributes,
      _pending: true,
      _photoRefId: photoRefId,
      _attachmentTargetLogId: targetLogId,
    };

    try {
      await logCache.put(optimisticLog);
    } catch (logErr) {
      console.warn('[Store] Fallo persistir photo attachment log:', logErr);
    }

    return savePayload('task', payload);
  },

  completeTaskLog: async (originalTaskId, verdict = 'completed', notes = '') => {
    const logId = newId('log--task');
    const ts = new Date().toISOString().split('.')[0] + '+00:00';

    const noteLines = [
      '[TASK_COMPLETION]',
      `target_task_id: ${originalTaskId}`,
      `verdict: ${verdict}`,
      `completed_at: ${new Date().toISOString()}`,
    ];
    if (notes) noteLines.push('', '--- Nota ---', notes);

    const payload = {
      data: {
        type: 'log--task',
        id: logId,
        attributes: {
          name: `Tarea ${verdict === 'completed' ? 'completada' : verdict}`,
          timestamp: ts,
          status: 'done',
          notes: { value: noteLines.join('\n'), format: 'plain_text' },
        },
      },
    };

    // Optimistic local: igual que addTaskLog, persistir en logCache para
    // que aparezca en timeline + selectores derivados al instante. Sin
    // esto el log de completado queda solo en pending_transactions hasta
    // sync, y la UI sigue mostrando la tarea como pending.
    const optimisticLog = {
      id: logId,
      type: 'log--task',
      asset_id: null,
      timestamp: Math.floor(Date.now() / 1000),
      name: payload.data.attributes.name,
      status: 'done',
      attributes: payload.data.attributes,
      _pending: true,
    };

    try {
      await logCache.put(optimisticLog);
    } catch (logErr) {
      console.warn('[Store] Fallo persistir completion log optimista:', logErr);
    }

    return savePayload('task', payload);
  },

  // Obtener todos los assets como lista plana
  getAllAssets: () => {
    const { plants, structures, equipment, materials } = get();
    return [...plants, ...structures, ...equipment, ...materials];
  },
}));

// Listener global: al recibir confirmación de sincronización exitosa,
// liberar el flag _pending del asset y disparar un pull dirigido que lo
// sobrescriba con el objeto oficial del servidor (Hotfix 10.3 — Opción C).
//
// Bug fix v0.6.5: logs que crean assets inline (seeding con asset--plant
// anidado, planting, input con materiales inline) también deben disparar
// pull de los assets relacionados. Sin esto, la planta creada por voz
// existe en FarmOS pero no aparece en el store hasta un refresh manual.
if (typeof window !== 'undefined') {
  // Tipos de log que pueden crear assets inline como side-effect. Al
  // completar la sync exitosa, refrescamos el store del tipo de asset
  // asociado para que aparezca en Activos/Home sin refresh manual.
  const LOG_TO_ASSET_TYPE = {
    seeding: 'plant',
    planting: 'plant',
    harvest: 'plant',
    input: 'plant',
  };

  window.addEventListener('syncCompleted', async (event) => {
    const { type, id } = event.detail || {};
    if (!type) return;

    const isAssetOp = type.startsWith('asset_') || type.startsWith('delete_');
    const logAssetType = LOG_TO_ASSET_TYPE[type];
    if (!isAssetOp && !logAssetType) return;

    try {
      // 'asset_plant'/'delete_plant' → 'plant'. Para logs, mapa directo.
      const assetType = isAssetOp ? type.split('_')[1] : logAssetType;

      // 1. Liberación del flag _pending del asset local confirmado
      // (solo aplica a asset_ / delete_ — logs no tienen asset local).
      if (isAssetOp) {
        const localAsset = await assetCache.getAsset(id);
        if (localAsset) {
          await assetCache.put(localAsset.asset_type || assetType, { ...localAsset, _pending: false });
          console.log(`[Sync] Activo ${id} liberado para actualización oficial.`);
        }
      } else {
        console.log(`[Sync] Log ${type}/${id} sincronizado — pull ${assetType} para captar inlines.`);
      }

      // 2. Pull dirigido al tipo afectado (no refresca los 4 tipos)
      const { fetchFromFarmOS } = await import('../services/apiService');
      await useAssetStore.getState().syncFromServer(fetchFromFarmOS, assetType);
    } catch (err) {
      console.error('[Sync-Listener] Error en post-procesamiento:', err);
    }
  });
}

export default useAssetStore;
