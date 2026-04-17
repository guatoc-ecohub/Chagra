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
