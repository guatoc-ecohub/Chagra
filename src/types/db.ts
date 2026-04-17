// Nombres de stores de ChagraDB v6
export const STORE_NAMES = {
  ASSETS: "assets",
  TAXONOMY: "taxonomy_terms",
  SYNC_META: "sync_meta",
  LOGS: "logs",
  PENDING_TX: "pending_transactions",
  PENDING_TASKS: "pending_tasks",
  MEDIA_CACHE: "media_cache",
  PENDING_VOICE: "pending_voice_recordings",
} as const;

export type StoreName = typeof STORE_NAMES[keyof typeof STORE_NAMES];

export interface SyncMeta {
  key: string;
  value: string | number | null;
}
