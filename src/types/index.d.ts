/**
 * Tipos centrales de Chagra (queue/043 TypeScript-lite).
 *
 * NO se compila a JS. Solo declaraciones para que `checkJs: true` valide
 * shapes en JSDoc anotaciones de archivos `.js`/`.jsx`.
 *
 * Convenciones:
 * - Asset shapes coinciden con respuesta JSON:API de FarmOS + shape
 *   optimista local (asset._pending=true antes del primer sync).
 * - Logs respetan invariantes ADR-019 (append-only, encoding [*] en notes).
 * - Schema Species/Biopreparado del catálogo SQLite v3.x.
 *
 * Cuando agregues feature que cambie un shape, EDITA este archivo PRIMERO
 * y dejá que tsc --noEmit te diga qué archivos rompen el contrato.
 */

declare global {
  // ───────────────────────────────────────────────
  // Asset (FarmOS asset--*)
  // ───────────────────────────────────────────────

  type ChagraAssetType = 'plant' | 'land' | 'structure' | 'material' | 'equipment';
  type ChagraPlantStatus =
    | 'seedling'
    | 'growing'
    | 'flowering'
    | 'fruiting'
    | 'harvested'
    | 'dormant'
    | 'dead'
    | 'unknown';

  interface AssetNotes {
    value: string;
    format?: 'plain_text' | 'markdown' | 'html';
  }

  interface AssetGeometry {
    /** WKT — POINT(lon lat) o POLYGON((lon lat, ...)) */
    value: string;
  }

  interface AssetAttributes {
    name: string;
    status?: string;
    notes?: AssetNotes;
    intrinsic_geometry?: AssetGeometry;
    inventory_value?: number | string;
    inventory_unit?: string;
    /** Solo para asset--land — sub_type. ADR-019. */
    land_type?: 'field' | 'bed' | 'greenhouse' | 'paddock' | 'building';
    /** Unix timestamp segundos. */
    created?: number;
  }

  interface JsonApiRef {
    type: string;
    id: string;
  }

  interface AssetRelationships {
    location?: { data: JsonApiRef[] };
    parent?: { data: JsonApiRef[] };
    plant_type?: { data: Array<{ type: string; attributes?: { name: string }; id?: string }> };
  }

  /**
   * Asset shape unificado (FarmOS sync + optimistic local).
   *
   * - `id` SIEMPRE existe (UUID local antes de sync, server ID post-sync).
   * - `_pending=true` = aún no confirmado por FarmOS API.
   * - `attributes` puede ser undefined en algunos paths legacy — valida con `?.`.
   */
  interface Asset {
    id: string;
    type: `asset--${ChagraAssetType}`;
    /** Shorthand sin prefijo, set en algunos paths del store (no canónico JSON:API). */
    asset_type?: ChagraAssetType;
    attributes?: AssetAttributes;
    relationships?: AssetRelationships;
    _pending?: boolean;
    _createdAt?: number;
  }

  // ───────────────────────────────────────────────
  // Log (FarmOS log--*) — ADR-019 append-only
  // ───────────────────────────────────────────────

  type ChagraLogType =
    | 'log--seeding'
    | 'log--harvest'
    | 'log--input'
    | 'log--task'
    | 'log--observation';

  interface LogQuantity {
    type: 'quantity--standard';
    attributes: {
      measure: 'count' | 'weight' | 'volume' | 'length' | 'area' | 'time' | 'rate';
      value: { decimal: string };
      label?: string;
      unit?: string;
    };
  }

  interface LogAttributes {
    name: string;
    /** ISO 8601 string o unix timestamp. */
    timestamp: string | number;
    status?: string;
    notes?: AssetNotes;
    /** WKT. Algunas observaciones lo embeben en attributes en lugar de relationships. */
    geometry?: string;
    quantity?: LogQuantity[];
  }

  interface LogRelationships {
    asset?: { data: JsonApiRef[] };
    location?: { data: JsonApiRef[] };
    quantity?: { data: LogQuantity[] };
  }

  /**
   * Log shape — append-only invariante ADR-019.
   *
   * Markers parseables conocidos en notes.value (separados por newline):
   * - [INVASIVE_REPORT]    — ver InvasiveObservationLog
   * - [PHOTO_ATTACHMENT]   — foto adjunta a log existente (target_log_id, photo_ref)
   * - [PLANT_LOST]         — cementerio, razón + fecha
   * - [TASK_COMPLETION]    — task marcado completed
   * - [REFLECTION]         — reflexión spine educativo (queue/034)
   */
  interface Log {
    id?: string;
    type: ChagraLogType;
    attributes: LogAttributes;
    relationships?: LogRelationships;
    _pending?: boolean;
    _photoRefId?: number | null;
    _attachmentTargetLogId?: string;
    /** Para uso interno del store; FarmOS ignora. */
    asset_id?: string | null;
    timestamp?: number;
    name?: string;
    status?: string;
  }

  // ───────────────────────────────────────────────
  // FarmOS API payloads
  // ───────────────────────────────────────────────

  /**
   * Wrapper JSON:API estándar para POST/PATCH a FarmOS.
   * `_photoRefId` es shadow field para encadenar persist photo + emit log.
   */
  interface FarmOSPayload {
    data: {
      type: string;
      id?: string;
      attributes: Record<string, unknown>;
      relationships?: Record<string, unknown>;
    };
    _photoRefId?: number | null;
  }

  /**
   * Pending transaction encolada por addAsset/addAssetsBulk para sync diferido.
   */
  interface PendingTx {
    id: string;
    type: string;
    endpoint: string;
    payload: FarmOSPayload;
    method: 'POST' | 'PATCH' | 'DELETE';
    remoteId?: string;
    synced?: boolean;
    retries?: number;
    timestamp?: number;
  }

  // ───────────────────────────────────────────────
  // Catálogo Chagra (SQLite WASM data blobs)
  // ───────────────────────────────────────────────

  type ThermalZone = 'cálido' | 'templado' | 'frío' | 'páramo' | 'glacial';

  interface AltitudRange {
    optimo_min: number;
    optimo_max: number;
  }

  interface FailureMode {
    razon: string;
    cuando?: string;
    mitigacion?: string;
    frecuencia: 'muy_comun' | 'comun' | 'ocasional';
  }

  interface CycleDays {
    min?: number;
    tipico: number;
    max?: number;
  }

  /**
   * Species shape del catálogo Chagra v3.x. Se evolutionará con ADR-031 (v3.3).
   */
  interface Species {
    id: string;
    nombre_comun: string;
    nombre_cientifico: string;
    category:
      | 'cultivos_principales'
      | 'especies_invasoras'
      | 'sustitutos_nativos'
      | string;
    estrato?: 'emergente' | 'alto' | 'medio' | 'bajo';
    thermal_zones?: ThermalZone[];
    altitud_msnm?: AltitudRange;
    cycle_months?: number;
    sources_ids?: string[];
    /** Solo para invasoras: IDs de sustitutos nativos curados. */
    especies_nativas_sustitutas?: string[];
    /** ADR-030 (schema v3.2). */
    tracking_mode?: 'individual' | 'aggregate';
    /** ADR-031 (schema v3.3) — pendiente. */
    difficulty?: 'starter' | 'intermediate' | 'advanced';
    tiempo_a_cosecha_dias?: CycleDays;
    failure_modes?: FailureMode[];
  }

  /**
   * Biopreparado del catálogo agroecológico.
   */
  interface Biopreparado {
    id: string;
    nombre: string;
    tipo: string;
    proposito?: string[];
    ingredientes?: string[];
    proceso_resumen?: string;
    tiempo_elaboracion_dias?: number;
    vida_util_dias?: number;
  }

  // ───────────────────────────────────────────────
  // Photo / Media cache (IndexedDB)
  // ───────────────────────────────────────────────

  interface PhotoRecord {
    id?: number;
    blob: Blob;
    mime: string;
    size: number;
    assetId?: string | null;
    logId?: string | null;
    speciesSlug?: string | null;
    createdAt: string;
    capturedAt?: string;
    gps?: { lat: number; lon: number } | null;
    notes?: string | null;
    isUserOverride?: boolean;
  }

  /**
   * Resultado de getPhotoUrl / getPhotoForLog. `revoke()` libera ObjectURL.
   * `source='missing'` cuando no hay foto disponible.
   */
  interface PhotoUrlResult {
    url: string | null;
    blob?: Blob | null;
    source: 'user' | 'catalog' | 'placeholder' | 'missing' | 'specific' | 'error';
    revoke?: () => void;
  }

  // ───────────────────────────────────────────────
  // AI service results
  // ───────────────────────────────────────────────

  interface FoliageDiagnosis {
    score: number;
    issues: string[];
    treatment_suggestion?: string;
    treatment?: string;
  }

  interface SpeciesRecognition {
    common_name_es: string;
    scientific_name?: string;
    confidence: number;
    alternatives?: Array<string | { name?: string; common_name_es?: string }>;
  }
}

export {};
