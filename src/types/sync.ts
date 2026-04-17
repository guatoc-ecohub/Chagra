export type SyncStatus = "idle" | "syncing" | "error" | "offline";

export interface TransactionRecord {
  // IndexedDB genera autoIncrement cuando no hay id; el código también
  // persiste UUIDs (crypto.randomUUID()) para poder correlacionar el
  // pending con el log/asset optimista creado en otros stores.
  id?: number | string;
  timestamp: number;
  synced: boolean;
  retries: number;
  type: string;
  payload: unknown;   // tipado en payloadService al construir
  error?: string | null;
  endpoint?: string;
  method?: string;
  remoteId?: string;
  lastError?: string | null;
  _quantityMeta?: {
    label?: string;
    value?: number | string;
    unit?: string;
    measure?: string;
  };
}

export interface TaskRecord {
  id: string;
  timestamp: number;
  status: "pending" | "done" | "error";
  type: string;
  payload: unknown;
}
