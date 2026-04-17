export type SyncStatus = "idle" | "syncing" | "error" | "offline";

export interface TransactionRecord {
  id?: number;        // autoIncrement IndexedDB
  timestamp: number;
  synced: boolean;
  retries: number;
  type: string;
  payload: unknown;   // tipado en payloadService al construir
  error?: string | null;
}

export interface TaskRecord {
  id: string;
  timestamp: number;
  status: "pending" | "done" | "error";
  type: string;
  payload: unknown;
}
