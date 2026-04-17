import type { components } from "./farmos.gen";

// Tipos de assets FarmOS
export type FarmOSAssetPlant = components["schemas"]["asset--plant"];
export type FarmOSAssetStructure = components["schemas"]["asset--structure"];
export type FarmOSAssetEquipment = components["schemas"]["asset--equipment"];
export type FarmOSAssetLand = components["schemas"]["asset--land"];
export type FarmOSAssetMaterial = components["schemas"]["asset--material"];

export type FarmOSAsset =
  | FarmOSAssetPlant
  | FarmOSAssetStructure
  | FarmOSAssetEquipment
  | FarmOSAssetLand
  | FarmOSAssetMaterial;

// Tipos de logs FarmOS
export type FarmOSLogHarvest = components["schemas"]["log--harvest"];
export type FarmOSLogSeeding = components["schemas"]["log--seeding"];
export type FarmOSLogInput = components["schemas"]["log--input"];
export type FarmOSLogMaintenance = components["schemas"]["log--maintenance"];
export type FarmOSLogObservation = components["schemas"]["log--observation"];

export type FarmOSLog =
  | FarmOSLogHarvest
  | FarmOSLogSeeding
  | FarmOSLogInput
  | FarmOSLogMaintenance
  | FarmOSLogObservation;

// Tipos de taxonomía
export type FarmOSTaxonomyTermPlantType =
  components["schemas"]["taxonomy_term--plant_type"];
export type FarmOSTaxonomyTermLogCategory =
  components["schemas"]["taxonomy_term--log_category"];
export type FarmOSTaxonomyTerm =
  | FarmOSTaxonomyTermPlantType
  | FarmOSTaxonomyTermLogCategory;

// Helper para extraer tipo de asset desde JSON:API type string
export type FarmOSAssetType =
  | "asset--plant"
  | "asset--structure"
  | "asset--equipment"
  | "asset--land"
  | "asset--material";

export type FarmOSLogType =
  | "log--harvest"
  | "log--seeding"
  | "log--input"
  | "log--maintenance"
  | "log--observation";
