export type LogType =
  | "log--harvest"
  | "log--seeding"
  | "log--input"
  | "log--maintenance"
  | "log--observation";

export type LogStatus = "pending" | "done";

export interface ChagraLog {
  id: string;
  name: string;
  log_type: LogType;
  timestamp: number;
  status: LogStatus;
  asset_id?: string | null;
  notes?: string | null;
  quantity?: number | null;
  unit?: string | null;
  location?: string | null;
  worker?: string | null;
  synced: boolean;
  cached_at: number;
}
