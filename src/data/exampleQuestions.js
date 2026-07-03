/**
 * exampleQuestions.js — FUENTE ÚNICA de las PREGUNTAS-EJEMPLO del agente
 * (chips/sugerencias que el usuario campesino solo clickea).
 *
 * Son el PUNTO DE ACCESO #1: si un chip de ejemplo produce respuesta vacía,
 * error o alucinación, perdemos al usuario en el primer toque. Por eso las
 * preguntas viven en UN solo lugar (este módulo de datos, no React) que:
 *   - consumen los componentes de UI (QuickChipsBar, SuggestedActions, AgentHero), y
 *   - cubre el test permanente del punto de acceso #1
 *     (tests/unit/exampleQuestions.entrypoint.test.jsx).
 *
 * Tenerlas acá (y no inline en cada componente) garantiza que NO puedan
 * divergir entre la UI y el test: el test importa exactamente estos arrays.
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino (memoria
 * feedback-spanish-dialect) — el test valida cada string contra el filtro de
 * voseo.
 */

/**
 * QuickChipsBar — atajo de pantalla-nueva del agente (UX-5 / issue #286).
 * Aparece SOLO con el chat vacío, JUSTO sobre el input. Pasa por el NLU normal
 * vía AgentScreen.handleSuggestion → handleSubmit.
 */
export const QUICK_CHIPS_BAR_QUESTIONS = Object.freeze([
  '¿Qué siembro este mes?',
  'Tengo plaga en mis plantas',
  'Receta de biopreparado para tomate',
]);

/**
 * SuggestedActions — chips de re-engagement con icono. Cada item es
 * { text, icon }; `text` es lo que se envía como pregunta.
 */
export const SUGGESTED_ACTIONS_CHIPS = Object.freeze([
  { text: '¿Cuándo planto tomates?', icon: '🌱' },
  { text: 'Mi planta tiene manchas amarillas', icon: '🔍' },
  { text: 'Registra que regué las lechugas', icon: '💧' },
  { text: 'Consejos para el invernadero', icon: '🏠' },
]);

/**
 * AgentHero (home) — el compositor del dashboard, el PRIMER lugar donde el
 * usuario ve preguntas-ejemplo, antes incluso de entrar al AgentScreen. Cada
 * item es { icon, label, prompt }; `prompt` es la pregunta que se envía.
 */
export const AGENT_HERO_CHIPS = Object.freeze([
  { icon: '🌱', label: '¿Qué siembro?', prompt: '¿Qué puedo sembrar este mes en mi zona?' },
  { icon: '🐛', label: 'Plagas', prompt: '¿Cómo controlo plagas sin químicos?' },
  { icon: '🌧️', label: 'Clima', prompt: 'Dame el reporte del clima de mi zona.' },
  // ── Grounding tools (antes solo por texto libre) ──────────────────────
  { icon: '🧬', label: 'Variedades', prompt: '¿Qué variedades registradas por ICA o AGROSAVIA hay para mi cultivo?' },
  { icon: '📊', label: 'Fenología', prompt: '¿Cuáles son las etapas de desarrollo de mi planta y qué plagas aparecen en cada una?' },
  { icon: '🌡️', label: 'Grado día', prompt: '¿Cómo van los grados día acumulados para mi cultivo?' },
  { icon: '🐝', label: 'Polinización', prompt: '¿Qué poliniza mi cultivo y cuántas colmenas por hectárea necesita?' },
  { icon: '📋', label: 'Documento soporte DIAN', prompt: 'Necesito el documento soporte DIAN para mi finca.' },
  { icon: '⚖️', label: 'Alerta normativa páramo', prompt: '¿Qué dice la Ley 1930 de 2018 sobre sembrar o hacer quemas en el páramo?' },
  { icon: '🌳', label: 'Restauración', prompt: 'Quiero restaurar un terreno con árboles nativos. ¿Qué especies siembro y en qué orden?' },
  { icon: '🐄', label: 'Silvopastoril', prompt: 'Quiero un arreglo silvopastoril con forraje y árboles para mi ganado.' },
  { icon: '☠️', label: 'Toxicidad', prompt: '¿Una planta es tóxica para animales o personas o se puede aprovechar?' },
  { icon: '📜', label: 'Saberes tradicionales', prompt: 'Explícame un saber tradicional agroecológico, como el uso de un producto local o una práctica de la finca.' },
]);

/** Textos planos de SuggestedActions (lo que se envía al agente). */
export const SUGGESTED_ACTIONS_QUESTIONS = Object.freeze(
  SUGGESTED_ACTIONS_CHIPS.map((c) => c.text),
);

/** Prompts planos del home AgentHero (lo que se envía al agente). */
export const AGENT_HERO_QUESTIONS = Object.freeze(AGENT_HERO_CHIPS.map((c) => c.prompt));

/**
 * Lista plana, deduplicada, de TODAS las preguntas-ejemplo clickables. Es la
 * que recorre el test del entrypoint (una aserción de pipeline por pregunta).
 */
export const ALL_EXAMPLE_QUESTIONS = Object.freeze(
  Array.from(
    new Set([
      ...QUICK_CHIPS_BAR_QUESTIONS,
      ...SUGGESTED_ACTIONS_QUESTIONS,
      ...AGENT_HERO_QUESTIONS,
    ]),
  ),
);
