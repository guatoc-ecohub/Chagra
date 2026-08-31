interface Window {
  webkitAudioContext: typeof AudioContext;
  // Convención de gate visual Chagra: entry points standalone (p. ej.
  // src/speciesViewer/main.js) marcan si el arranque WebGL tuvo éxito para
  // que un headless browser lo lea vía page.evaluate().
  __ARRANQUE_OK?: boolean;
  __ARRANQUE_FALLO?: string | null;
}
