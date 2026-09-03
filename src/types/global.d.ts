interface Window {
  webkitAudioContext: typeof AudioContext;
  // Convención de gate visual Chagra: entry points standalone (p. ej.
  // src/speciesViewer/main.js) marcan si el arranque WebGL tuvo éxito para
  // que un headless browser lo lea vía page.evaluate().
  __ARRANQUE_OK?: boolean;
  __ARRANQUE_FALLO?: string | null;
  // Hooks OPCIONALES de depuración visual: un harness headless puede colgar
  // aquí su tick de render y su control del loop. El cielo Sylva los invoca
  // (hook.frame / hook.pausar) solo si existen; nadie en la app los define.
  __tick?: () => void;
  __loop?: (correr: boolean) => void;
}
