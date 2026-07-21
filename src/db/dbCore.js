/**
 * dbCore — Singleton de acceso a ChagraDB (IndexedDB).
 *
 * Único punto de apertura para toda la aplicación. Reemplaza a las aperturas
 * manuales previas en assetCache.js y syncManager.js, evitando race conditions
 * de `onupgradeneeded` duplicado y garantizando una sola versión activa.
 *
 * Esquema v12 (2026-05-12):
 *   - assets               (keyPath: id; indexes: asset_type, cached_at)
 *   - taxonomy_terms       (keyPath: id; indexes: type)
 *   - sync_meta            (keyPath: key)
 *   - pending_transactions (keyPath: id, autoIncrement; indexes: timestamp, type)
 *   - pending_tasks        (keyPath: id; indexes: timestamp, status)
 *   - logs                 (keyPath: id; indexes: asset_id, timestamp, type,
 *                           asset_id_timestamp) — v9: índice compuesto para
 *                           queries timeline ordenadas sin sort en memoria)
 *                           (v8 ADR-027.viii: incluye log--split para modo individual/aggregate)
 *   - media_cache          (v11: keyPath: id, autoIncrement; indexes: logId,
 *                           createdAt, lastAccessedAt; LRU eviction support)
 *   - pending_voice_recordings (v0.5.0: keyPath: id, autoIncrement)
 *   - inventory_events     (v7 ADR-027.i+ii: keyPath: id ULID; indexes:
 *                           item_id, timestamp, event_type, idempotency_key)
 *   - inventory_stock_snapshot (v7: materialized view, keyPath: item_id)
 *   - voice_telemetry      (v10 ADR-030 Regla 8: IDB para telemetría voz)
 *   - conversation_memory (v12 057.3: IDB para memoria conversacional persistente)
 *                           keyPath: id; indexes: operator_id, timestamp)
 *   - llm_telemetry        (v13 2026-05-17: telemetría privacy-safe de calls LLM
 *                           para Eco-Oracle Dashboard ADR-023. Captura solo
 *                           metadata — modelo, latencia, tokens, processor
 *                           gpu/cpu — NUNCA prompt ni respuesta. keyPath: id;
 *                           indexes: model, flujo, created_at, status, synced)
 *   - rag_telemetry        (v14 2026-05-19 L1.10: telemetría RAG-by-surface.
 *                           Captura por evento de retrieve: surface (pantalla),
 *                           query (hash truncado por privacidad), topScore,
 *                           latencyMs, resultCount, error. Sampleable vía
 *                           VITE_RAG_TELEMETRY_RATE. keyPath: id; indexes:
 *                           surface, created_at, has_results, error_kind)
 */

export const DB_NAME = 'ChagraDB';
export const DB_VERSION = 27;

export const STORES = {
  ASSETS: 'assets',
  TAXONOMY: 'taxonomy_terms',
  SYNC_META: 'sync_meta',
  LOGS: 'logs',
  PENDING_TX: 'pending_transactions',
  PENDING_TASKS: 'pending_tasks', // @deprecated: usar LOGS con type='log--task'
  MEDIA_CACHE: 'media_cache',
  PENDING_VOICE: 'pending_voice_recordings',
  INVENTORY_EVENTS: 'inventory_events',
  INVENTORY_STOCK: 'inventory_stock_snapshot',
  PLANS: 'plans',
  VOICE_TELEMETRY: 'voice_telemetry',
  CONVERSATION_MEMORY: 'conversation_memory',
  LLM_TELEMETRY: 'llm_telemetry',
  RAG_TELEMETRY: 'rag_telemetry',
  FAILED_TX: 'failed_transactions',
  VISION_QUEUE: 'vision_queue',
  FARM_PROCESSES: 'farm_processes', // v18: ADR-047 agregado de ciclo de cultivo
  FARM_PROCESS_EVENTS: 'farm_process_events', // v18: eventos del ciclo de cultivo
  // v17 (compositor multimodal del home): outbox DURABLE de consultas al
  // agente disparadas desde el dashboard. El item (texto / blob de audio /
  // foto / adjunto + metadata) se persiste ANTES de navegar al AgentScreen,
  // sobrevive a un "atrás" o a un cierre de app a mitad de camino, y se
  // procesa exactamente UNA vez (claim atómico anti-duplicado). NUNCA se
  // pierde el dato del usuario — ese es el contrato.
  AGENT_OUTBOX: 'agent_outbox',
  // v20: agent_requests — cola durable de requests al agente + telemetría rica.
  // Cada item incluye prompt, ruta, modelo, grounding (entities, tools, RAG),
  // latencias (t_first_token_ms, t_total_ms, queue_wait_ms), response, tokens,
  // retries y status (queued/sending/done/failed/offline). Permite debuggear
  // inteligencia+velocidad de Chagra y garantiza que ninguna pregunta se pierda.
  AGENT_REQUESTS: 'agent_requests',
  // v21: rag_corpus_cache — índice RAG construido (docs pre-tokenizados + IDF)
  // persistido para que sobreviva recargas OFFLINE en frío. El SW ya cachea los
  // bytes crudos de /cycle-content/* (capa de red), pero re-parsear+re-tokenizar
  // las 491 fichas en cada arranque cuesta CPU en teléfonos rurales. Esto
  // persiste el índice YA construido (capa de cómputo) → arranque offline
  // instantáneo sin re-tokenizar. keyPath 'key' (un único registro 'corpus').
  RAG_CORPUS_CACHE: 'rag_corpus_cache',
  // v22: glaciar_reportes — reportes OFFLINE de puntos glaciares capturados
  // por guías de glaciar (módulo demo). Cada reporte guarda GPS (lat/lng/
  // altitud/precisión), foto (dataURL para sobrevivir recargas), el formulario
  // de diagnóstico de dureza del hielo + peligros y el estado de seguridad
  // derivado. La idea es repetir el MISMO punto GPS en el tiempo →
  // trazabilidad del cambio climático (repeat photography). keyPath 'id'
  // (string ULID-like generado en cliente). Índices: createdAt (timeline),
  // estado (filtrar por 🟢/🟡/🔴), guia (por persona).
  GLACIAR_REPORTES: 'glaciar_reportes',
  // v24: glaciar_draft — autosave del BORRADOR en curso del reporte glaciar
  // (un único registro KV, keyPath 'key'). Antes vivía en sessionStorage, pero
  // CodeQL lo marcaba como clear-text storage de datos sensibles (lat/lng GPS).
  // En IndexedDB no dispara esa regla y además sobrevive al cierre/descarte de
  // la pestaña por iOS (sessionStorage NO), así que recupera mejor ante crash.
  // No es el reporte final (eso vive en glaciar_reportes): es el work-in-progress
  // que se restaura al volver y se borra al guardar el reporte con éxito.
  GLACIAR_DRAFT: 'glaciar_draft',
  // v25: pilot_telemetry — telemetría anónima de pilotos. Registra eventos de
  // uso (onboarding, módulos, preguntas al agente, feedback, sync) sin PII.
  // keyPath: id; indexes: event_type, created_at, synced.
  PILOT_TELEMETRY: 'pilot_telemetry',
  // v26: marketplace_ofertas — ofertas del marketplace agroecológico (circuitos
  // cortos). Cada oferta (producto, cantidad, unidad, precio, finca/vereda,
  // contacto, foto opcional dataURL) se publica y persiste LOCAL, sobrevive
  // recargas sin red (offline-first, igual que glaciar_reportes). No requiere
  // backend nuevo: el contacto es directo (WhatsApp/teléfono), sin transacción
  // dentro de la app. keyPath 'id' (string generado en cliente). Índices:
  // createdAt (timeline), categoria (filtro), municipio (filtro por ubicación).
  MARKETPLACE_OFERTAS: 'marketplace_ofertas',
  // v27: red_transactions — TRATOS cerrados de la RED humana (campesino ↔
  // campesino). Cada trato es el HECHO verificable del que se derivan el grafo
  // social (productor–cultivo–vereda) y la reputación ganada — subproducto de
  // transacciones del mercado que ya ocurren (ver services/red/). Append-only
  // (fuente de verdad; grafo/reputación son cache reconstruible, ADR-019).
  // Local-first: el dato crudo se queda en el dispositivo; solo cruza a la red
  // lo marcado opt-in (shareLevel ≥ 2). keyPath 'id' (string cliente). Índices:
  // createdAt (timeline), productorHash (reputación por productor), producto
  // (matchmaking por cultivo), vereda (cercanía), shareLevel (compuerta).
  RED_TRANSACTIONS: 'red_transactions',
};

let dbInstance = null;
let connectionPromise = null;

export const openDB = async () => {
  if (dbInstance) return dbInstance;
  if (connectionPromise) return connectionPromise;

  connectionPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (/** @type {IDBVersionChangeEvent} */ event) => {
      const req = /** @type {IDBOpenDBRequest} */ (event.target);
      const db = req.result;
      console.info(`[DB] Upgrading schema to v${DB_VERSION}…`);

      // pending_transactions (cola de salida — autoincrement + string uuids)
      if (!db.objectStoreNames.contains(STORES.PENDING_TX)) {
        const store = db.createObjectStore(STORES.PENDING_TX, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }

      // pending_tasks (snapshot offline de tareas FarmOS)
      if (!db.objectStoreNames.contains(STORES.PENDING_TASKS)) {
        const store = db.createObjectStore(STORES.PENDING_TASKS, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      // assets (cache de activos FarmOS)
      if (!db.objectStoreNames.contains(STORES.ASSETS)) {
        const store = db.createObjectStore(STORES.ASSETS, { keyPath: 'id' });
        store.createIndex('asset_type', 'asset_type', { unique: false });
        store.createIndex('cached_at', 'cached_at', { unique: false });
      }

      // taxonomy_terms
      if (!db.objectStoreNames.contains(STORES.TAXONOMY)) {
        const store = db.createObjectStore(STORES.TAXONOMY, { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
      }

      // sync_meta (timestamps y cooldowns)
      if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
        db.createObjectStore(STORES.SYNC_META, { keyPath: 'key' });
      }

      // logs (timeline de eventos por activo — Fase 11)
      if (!db.objectStoreNames.contains(STORES.LOGS)) {
        const store = db.createObjectStore(STORES.LOGS, { keyPath: 'id' });
        store.createIndex('asset_id', 'asset_id', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }

      // v5: media_cache — binarios de evidencia fotográfica asociados a logs
      if (!db.objectStoreNames.contains(STORES.MEDIA_CACHE)) {
        const store = db.createObjectStore(STORES.MEDIA_CACHE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('logId', 'logId', { unique: false });
        store.createIndex('assetId', 'assetId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // v6: pending_voice_recordings — blobs de audio capturados offline o
      // con fallo de transcripción/extracción, pendientes de reprocesamiento.
      if (!db.objectStoreNames.contains(STORES.PENDING_VOICE)) {
        const store = db.createObjectStore(STORES.PENDING_VOICE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      // v7: inventory_events — log append-only ADR-019 + ADR-027.i+ii.
      // Append-only inmutable. Reconciliación post-sync por timestamp +
      // device_id_lex_hash + sequence_number.
      if (!db.objectStoreNames.contains(STORES.INVENTORY_EVENTS)) {
        const store = db.createObjectStore(STORES.INVENTORY_EVENTS, { keyPath: 'id' });
        store.createIndex('item_id', 'payload.item_id', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('event_type', 'event_type', { unique: false });
        store.createIndex('idempotency_key', 'idempotency_key', { unique: false });
      }

      // v7: inventory_stock_snapshot — materialized view derivada de
      // inventory_events. Reconstruible desde scratch en cualquier momento
      // (cumple ADR-019 — log es source of truth, esto es solo cache O(1)).
      if (!db.objectStoreNames.contains(STORES.INVENTORY_STOCK)) {
        db.createObjectStore(STORES.INVENTORY_STOCK, { keyPath: 'item_id' });
      }

      // v8: plans — generated feeding plans
      if (!db.objectStoreNames.contains(STORES.PLANS)) {
        const store = db.createObjectStore(STORES.PLANS, { keyPath: 'id' });
        store.createIndex('asset_id', 'asset_id', { unique: false });
        store.createIndex('species_slug', 'species_slug', { unique: false });
      }

      // v9: índice compuesto asset_id+timestamp en logs para queries
      // timeline ordenadas sin sort en memoria (Issue #244).
      // Migration transparente v8→v9: preserva indexes existentes.
      if (event.oldVersion < 9) {
        const logsStore = req.transaction.objectStore(STORES.LOGS);
        if (!logsStore.indexNames.contains('asset_id_timestamp')) {
          logsStore.createIndex('asset_id_timestamp', ['asset_id', 'timestamp'], { unique: false });
        }
      }

      // v10: voice_telemetry — ADR-030 Regla 8 (NO localStorage).
      // Instrumentación para analizar uso de voz vs touch por flujo.
      if (event.oldVersion < 10) {
        if (!db.objectStoreNames.contains(STORES.VOICE_TELEMETRY)) {
          const store = db.createObjectStore(STORES.VOICE_TELEMETRY, { keyPath: 'id' });
          store.createIndex('flujo', 'flujo', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
        }
      }

      // v11: LRU eviction para media_cache (056.4).
      // Agregar lastAccessedAt a media_cache existente.
      if (event.oldVersion < 11 && db.objectStoreNames.contains(STORES.MEDIA_CACHE)) {
        const mediaStore = req.transaction.objectStore(STORES.MEDIA_CACHE);
        if (!mediaStore.indexNames.contains('lastAccessedAt')) {
          mediaStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        }
      }

      // v12: conversation_memory para 057.3 (memoria conversacional persistente).
      // Store para persistir contexto entre turnos de chat.
      if (event.oldVersion < 12) {
        if (!db.objectStoreNames.contains(STORES.CONVERSATION_MEMORY)) {
          const store = db.createObjectStore(STORES.CONVERSATION_MEMORY, { keyPath: 'id' });
          store.createIndex('operator_id', 'operator_id', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      }

      // v13: llm_telemetry — metadata privacy-safe de cada call LLM
      // (ollamaStream + openaiStream). Captura solo modelo, latencia, tokens,
      // processor gpu/cpu — NUNCA prompt ni respuesta. Alimenta Eco-Oracle
      // Dashboard (ADR-023) sección LLM + GPU.
      if (event.oldVersion < 13) {
        if (!db.objectStoreNames.contains(STORES.LLM_TELEMETRY)) {
          const store = db.createObjectStore(STORES.LLM_TELEMETRY, { keyPath: 'id' });
          store.createIndex('model', 'model', { unique: false });
          store.createIndex('flujo', 'flujo', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
        }
      }

      // v15: failed_transactions — quarantine bucket post-rechazo HTTP del
      // servidor. Reemplaza el `deleteTransaction()` silencioso que purgaba
      // pendientes con 4xx. El user ve un banner "X transacciones bloqueadas"
      // y puede revisar/reintentar/descartar manualmente. Spec en
      // Chagra-strategy/ops/specs/sync-error-handling-spec.md.
      if (event.oldVersion < 15) {
        if (!db.objectStoreNames.contains(STORES.FAILED_TX)) {
          const store = db.createObjectStore(STORES.FAILED_TX, { keyPath: 'id', autoIncrement: true });
          store.createIndex('original_tx_id', 'original_tx_id', { unique: false });
          store.createIndex('error_status', 'error_status', { unique: false });
          store.createIndex('failed_at', 'failed_at', { unique: false });
          store.createIndex('error_class', 'error_class', { unique: false });
        }
      }

      // v14: rag_telemetry — telemetría RAG-by-surface (L1.10).
      // Captura por cada llamada a `ragRetriever.retrieve`: superficie de
      // origen (agente, foliage, voice, species…), latencia, topScore,
      // resultCount y error_kind. Privacy: el `query` se persiste truncado
      // (primeros 60 chars) — no se hace hash porque el corpus es público y
      // las queries del usuario no contienen PII relevante a este contexto.
      // Aún así, evita persistir queries largas para no acumular texto libre.
      if (event.oldVersion < 14) {
        if (!db.objectStoreNames.contains(STORES.RAG_TELEMETRY)) {
          const store = db.createObjectStore(STORES.RAG_TELEMETRY, { keyPath: 'id' });
          store.createIndex('surface', 'surface', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('has_results', 'has_results', { unique: false });
          store.createIndex('error_kind', 'error_kind', { unique: false });
        }
      }

      // v16: vision_queue (V-07 #228) — cola offline de fotos de visión.
      // Cuando el operario captura una foto para diagnóstico foliar o ID de
      // especie SIN conexión, el blob + metadata se encolan aquí en vez de
      // perderse. Al volver la conexión, visionQueueService.flushVisionQueue()
      // corre la inferencia y deja el resultado en el propio registro.
      // Blobs grandes → IndexedDB (NO localStorage). keyPath autoIncrement.
      if (event.oldVersion < 16) {
        if (!db.objectStoreNames.contains(STORES.VISION_QUEUE)) {
          const store = db.createObjectStore(STORES.VISION_QUEUE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('kind', 'kind', { unique: false });
        }
      }

      // v17: agent_outbox — cola DURABLE de consultas multimodales al agente
      // disparadas desde el compositor del dashboard (AgentHero). Antes de
      // navegar al AgentScreen, el item (texto / audio / foto / adjunto) se
      // persiste con status='queued'. Si el usuario da "atrás" o CIERRA la
      // app a mitad → al volver el item sigue intacto con su estado y NO se
      // pierde ni se duplica (claim atómico via status='processing'). Blobs
      // grandes → IndexedDB (NO localStorage). keyPath autoIncrement.
      if (event.oldVersion < 17) {
        if (!db.objectStoreNames.contains(STORES.AGENT_OUTBOX)) {
          const store = db.createObjectStore(STORES.AGENT_OUTBOX, { keyPath: 'id', autoIncrement: true });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('kind', 'kind', { unique: false });
        }
      }

      // v18: ADR-047 farm_process aggregate — ciclos de cultivo + eventos
      if (event.oldVersion < 18) {
        if (!db.objectStoreNames.contains(STORES.FARM_PROCESSES)) {
          const fpStore = db.createObjectStore(STORES.FARM_PROCESSES, { keyPath: 'process_id' });
          fpStore.createIndex('status', 'attributes.status', { unique: false });
          fpStore.createIndex('process_type', 'attributes.process_type', { unique: false });
          fpStore.createIndex('subject_kind', 'attributes.subject_kind', { unique: false });
          fpStore.createIndex('location_land_asset_id', 'attributes.location_land_asset_id', { unique: false });
          fpStore.createIndex('updated_at', 'attributes.updated_at', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.FARM_PROCESS_EVENTS)) {
          const fpeStore = db.createObjectStore(STORES.FARM_PROCESS_EVENTS, { keyPath: 'event_id' });
          fpeStore.createIndex('process_id', 'process_id', { unique: false });
          fpeStore.createIndex('event_type', 'event_type', { unique: false });
          fpeStore.createIndex('occurred_at', 'occurred_at', { unique: false });
          fpeStore.createIndex('idempotency_key', 'idempotency_key', { unique: false });
          fpeStore.createIndex('asset_id', 'asset_id', { unique: false });
        }
      }

      // v19: BUGFIX — el índice process_id de farm_process_events apuntaba a
      // nivel raíz ('process_id'), pero los eventos guardan el id dentro de
      // attributes.process_id (ver farmEventService.js). Resultado:
      // index('process_id').getAll(id) devolvía 0. Corrección: eliminar el
      // índice viejo y recrearlo con keyPath 'attributes.process_id'.
      // La migración es segura e idempotente: los datos existentes ya tienen
      // attributes.process_id, el nuevo índice los indexa automáticamente.
      if (event.oldVersion < 19) {
        const fpeStore = req.transaction.objectStore(STORES.FARM_PROCESS_EVENTS);
        if (fpeStore && fpeStore.indexNames.contains('process_id')) {
          fpeStore.deleteIndex('process_id');
        }
        if (fpeStore && !fpeStore.indexNames.contains('process_id')) {
          fpeStore.createIndex('process_id', 'attributes.process_id', { unique: false });
        }
      }

      // v20: agent_requests — cola durable de requests al agente + telemetría rica.
      // Alimenta el dashboard de debug de Chagra (inteligencia + velocidad) y
      // garantiza que ninguna pregunta se pierda. Schema:
      //   { id, ts_submit, prompt, route, model, grounding: {entities, tools,
      //     rag_chunks, nlu_route, grounded_status}, latency: {t_first_token_ms,
      //     t_total_ms, queue_wait_ms}, response, tokens_in, tokens_out, retries,
      //     status: queued/sending/done/failed/offline, ts_done }
      // keyPath autoIncrement (como vision_queue). Índices para drainPending
      // (status, ts_submit) y queries (model, route).
      if (event.oldVersion < 20) {
        if (!db.objectStoreNames.contains(STORES.AGENT_REQUESTS)) {
          const store = db.createObjectStore(STORES.AGENT_REQUESTS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('ts_submit', 'ts_submit', { unique: false });
          store.createIndex('model', 'model', { unique: false });
          store.createIndex('route', 'route', { unique: false });
        }
      }

      // v21: rag_corpus_cache — índice RAG construido persistido (offline-first
      // de campo). Un único registro KV (keyPath 'key', valor 'corpus') con los
      // docs pre-tokenizados + IDF serializados. Permite que una recarga OFFLINE
      // en frío arranque con grounding sin re-tokenizar las 491 fichas.
      if (event.oldVersion < 21) {
        if (!db.objectStoreNames.contains(STORES.RAG_CORPUS_CACHE)) {
          db.createObjectStore(STORES.RAG_CORPUS_CACHE, { keyPath: 'key' });
        }
      }

      // v22: glaciar_reportes — reportes offline de puntos glaciares (módulo
      // demo para guías de glaciar). Offline-first: el reporte completo (GPS +
      // foto dataURL + diagnóstico + estado de seguridad) se persiste local y
      // sobrevive recargas sin red. keyPath 'id' (string generado en cliente).
      if (event.oldVersion < 22) {
        if (!db.objectStoreNames.contains(STORES.GLACIAR_REPORTES)) {
          const store = db.createObjectStore(STORES.GLACIAR_REPORTES, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('estado', 'estado', { unique: false });
          store.createIndex('guia', 'guia', { unique: false });
        }
      }

      // v23: índice `puntoId` en glaciar_reportes — trazabilidad del FRENTE del
      // hielo. Un punto fijo (punto_id estable) repetido en el tiempo cuenta el
      // retroceso del glaciar: agrupar todos los reportes del mismo punto.
      // Migración aditiva (no toca registros existentes): solo agrega el índice.
      if (event.oldVersion < 23) {
        if (db.objectStoreNames.contains(STORES.GLACIAR_REPORTES)) {
          const store = req.transaction.objectStore(STORES.GLACIAR_REPORTES);
          if (!store.indexNames.contains('puntoId')) {
            store.createIndex('puntoId', 'puntoId', { unique: false });
          }
        }
      }

      // v24: glaciar_draft — autosave del borrador en curso del reporte glaciar.
      // Un único registro KV (keyPath 'key', valor 'borrador') con el form +
      // coords del reporte que se está digitando. Reemplaza el autosave previo
      // en sessionStorage (CodeQL js/clear-text-storage-of-sensitive-data por el
      // GPS lat/lng). IndexedDB no dispara esa regla y sobrevive al descarte de
      // la pestaña por iOS al abrir la cámara → mejor recuperación ante crash.
      if (event.oldVersion < 24) {
        if (!db.objectStoreNames.contains(STORES.GLACIAR_DRAFT)) {
          db.createObjectStore(STORES.GLACIAR_DRAFT, { keyPath: 'key' });
        }
      }

      // v25: pilot_telemetry — eventos anónimos de uso piloto. Schema:
      // { id, event_type, metadata, created_at, synced }. Sin PII: NO
      // user_id, NO nombres, NO coords GPS, NO texto de conversación.
      if (event.oldVersion < 25) {
        if (!db.objectStoreNames.contains(STORES.PILOT_TELEMETRY)) {
          const store = db.createObjectStore(STORES.PILOT_TELEMETRY, { keyPath: 'id' });
          store.createIndex('event_type', 'event_type', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
        }
      }

      // v26: marketplace_ofertas — ofertas del marketplace agroecológico
      // (circuitos cortos / mercados campesinos). El productor publica un
      // producto de su finca (cantidad, unidad, precio que él pone, ubicación,
      // foto opcional) y se persiste OFFLINE-first: sobrevive recargas sin red.
      // El contacto al vendedor es directo (WhatsApp/teléfono), sin transacción
      // dentro de la app. keyPath 'id' (string generado en cliente). Índices:
      // createdAt (timeline), categoria (filtro), municipio (filtro ubicación).
      if (event.oldVersion < 26) {
        if (!db.objectStoreNames.contains(STORES.MARKETPLACE_OFERTAS)) {
          const store = db.createObjectStore(STORES.MARKETPLACE_OFERTAS, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('categoria', 'categoria', { unique: false });
          store.createIndex('municipio', 'municipio', { unique: false });
        }
      }

      // v27: red_transactions — tratos cerrados de la red humana. Cada registro
      // es un HECHO append-only (quién entregó qué, en qué vereda, con qué
      // fiabilidad/calidad) del que se derivan el grafo social y la reputación
      // (services/red/). Local-first + opt-in: solo cruza a la red lo marcado
      // shareLevel ≥ 2. keyPath 'id'. Índices para reputación/matchmaking.
      if (event.oldVersion < 27) {
        if (!db.objectStoreNames.contains(STORES.RED_TRANSACTIONS)) {
          const store = db.createObjectStore(STORES.RED_TRANSACTIONS, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('productorHash', 'productorHash', { unique: false });
          store.createIndex('producto', 'producto', { unique: false });
          store.createIndex('vereda', 'vereda', { unique: false });
          store.createIndex('shareLevel', 'shareLevel', { unique: false });
        }
      }
    };

    request.onsuccess = (/** @type {Event} */ event) => {
      const req = /** @type {IDBOpenDBRequest} */ (event.target);
      dbInstance = req.result;
      connectionPromise = null;

      // Cerrar la conexión si otra pestaña solicita un upgrade futuro,
      // evitando bloqueos durante el onblocked de nuevas versiones.
      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
        console.warn('[DB] Version change detected. Connection closed.');
      };

      resolve(dbInstance);
    };

    request.onerror = (/** @type {Event} */ event) => {
      connectionPromise = null;
      reject(/** @type {IDBOpenDBRequest} */ (event.target).error);
    };

    request.onblocked = () => {
      console.warn('[DB] Open request blocked — another connection holds the DB.');
    };
  });

  return connectionPromise;
};
