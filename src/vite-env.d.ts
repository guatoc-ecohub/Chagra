/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FARMOS_URL?: string;
  readonly VITE_FARMOS_CLIENT_ID?: string;
  readonly VITE_HA_ACCESS_TOKEN?: string;
  readonly VITE_DEFAULT_LOCATION_ID?: string;
  readonly VITE_DEFAULT_FARM_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
