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

  // ── Sondas del arnés de medición del descenso (gate paso 7, PR #3103) ──────
  // EscenaDescensoSierra y el vendor de flora cuelgan sondas en window para que
  // el arnés del Pixel las lea vía page.evaluate(). Viven solo mientras la
  // escena está montada (el cleanup las borra); nadie en la app las lee.
  // CSM del descenso: forma de retorno de crearCSM() (vendor/csmSylva.js).
  __csm?: { activa: boolean; update(camera: unknown): void; dispose(): void; stats(): unknown };
  // API de floraDescenso.crearFloraDescenso(), para el censo del arnés.
  __floraDescenso?: {
    actualizar(estado: unknown): void;
    conteo(): { instancias: number; drawCalls: number; porBanda: Record<string, number> };
    dispose(): void;
    meshes: Record<string, unknown>;
    capacidades: Record<string, number>;
  };
  // Renderer real montado (el arnés estampa el renderer, no el esperado).
  __r?: import('three').WebGLRenderer;
  // El namespace three vivo: el gate verifica el ShaderChunk en ejecución.
  __THREE?: typeof import('three');
  // Sonda de DPR: dimensiones y contadores reales del frame en curso.
  __pr?: () => { dpr: number; css: number[]; buffer: number[]; drawCalls: number; triangulos: number };
  // Tiempo de GPU real (finish + readPixels de 1 px), por si el rAF miente.
  __gpuMs?: (n?: number) => { n: number; min: number; p50: number; p95: number; max: number };
}
