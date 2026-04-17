import type { FarmOSAssetType } from "./farmos";

export type { FarmOSAssetType };

// AssetType interno de Chagra (subset de FarmOS pero con nombres cortos)
export type AssetType = "plant" | "structure" | "equipment" | "material" | "land";

export interface ChagraAsset {
  id: string;
  name: string;
  asset_type: AssetType;
  cached_at: number;
  status?: "active" | "archived";
  notes?: string | null;
  farmos_id?: string;
  location?: string | null;
  image_url?: string | null;
}

export interface TaxonomyTerm {
  id: string;
  name: string;
  type: string;
  description?: string | null;
}

/**
 * Shape JSON:API enriquecido que usan los componentes UI para leer campos
 * de FarmOS preservados en el cache (attributes / relationships / banderas
 * de sincronización optimista). No todos los registros en Zustand exponen
 * estas propiedades; los accesos deben ser defensivos.
 */
export type FarmOSEnrichedAsset = ChagraAsset & {
  type?: string;
  attributes?: {
    name?: string;
    status?: string;
    notes?: { value?: string } | string | null;
    inventory_value?: number | string | null;
    inventory_unit?: string | null;
    intrinsic_geometry?: { value?: string } | string | null;
    land_type?: string;
    sub_type?: string;
    timestamp?: number;
    created?: number;
    [key: string]: unknown;
  };
  relationships?: Record<string, { data?: unknown } | unknown>;
  unit?: string | null;
  _pending?: boolean;
  _createdAt?: number;
  [key: string]: unknown;
};
