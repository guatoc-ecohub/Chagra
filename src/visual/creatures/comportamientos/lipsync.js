/* Fachada pública del contrato de lip-sync sin AudioContext ni DOM. */
export {
  VISEMA,
  UMBRAL_RMS,
  DEBOUNCE_MS,
  visemaDesdeRMS,
  rmsDeMuestras,
  crearDebounceVisema,
  visemaFallback,
} from '../lipSyncCore.js';
