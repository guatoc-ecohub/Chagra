export type VoiceRecordingStatus = "pending" | "processing" | "done" | "error";

export interface VoiceRecording {
  id?: number;        // autoIncrement IndexedDB
  createdAt: number;
  status: VoiceRecordingStatus;
  blob?: Blob;
  transcript?: string | null;
  entities?: ExtractedEntities | null;
  error?: string | null;
}

export interface ExtractedEntities {
  asset_name?: string | null;
  log_type?: string | null;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  location?: string | null;
  timestamp?: number | null;
}
