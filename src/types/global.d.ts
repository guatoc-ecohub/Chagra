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
  /** Hook de gate del manto de la helada en el descenso de la Sierra (EscenaDescensoSierra.jsx::Ladera). */
  __escarcha?: {
    k: number;
    optica: number | null;
    fxTiene: boolean;
    shader: boolean;
    msnm: number;
    parche: { frag: boolean; vert: boolean } | null;
  };
  /** Solo gate: fuerza el uniform del manto (0..1) para el A/B en la misma carga. */
  __escarchaForzar?: number | null;
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

  // ── Sondas del vendor de flora (sierra/vendor/flora) ──────────────────────
  // Mismo contrato de gate: el vendor cuelga censo/estado para el arnés y las
  // borra quien las colgó. Tipos según lo que cada módulo asigna.
  // FollajeMasa: estado de la oclusión horneada (estado() + ajuste en vivo).
  __aoHorneado?: { estado: () => Record<string, unknown>; fuerza: (fuerza: number, directo: number) => number };
  // vientoMundos: reloj del viento (t avanza ⇒ árbol vivo) y fuerza actual.
  __vientoVM?: { t: number; f: number };
  // flora-eztree-bake: si la hoja procedural está activa para este bake.
  __floraHoja?: { activa: boolean };
  // flora.js: censo del verde extendido (conteos sembrados por rodal).
  __verdeExt?: { r1LaderaCerca: number; r2Hueco: number; r3Subparamo: number; matorral: number; pasto: number };
  // flora.js: contrato de inspección de la variación por especie.
  __floraSpecies?: {
    activa: boolean;
    semilla: number;
    perfiles: { nombre: string; ancho: number; profundidad: number; instancias: number }[];
    lejanas: { nombre: string; instancias: number }[];
  };
}
