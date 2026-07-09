/**
 * semaforoConfianza.js — SEMÁFORO DE CONFIANZA por-respuesta + procedencia
 * por-afirmación (MODO CIENTÍFICO, lever "hacer visible el moat
 * anti-alucinación").
 *
 * Lógica PURA (cero React, cero red) que decide el nivel verde/ámbar/rojo de
 * una respuesta del agente a partir de la metadata que el turno YA trae:
 *
 *   - `grounding_semaphore`  → semáforo REAL que el sidecar computó con
 *     grounding-policy.ts (answer→verde, hedge→ámbar, abstain→rojo). Cuando
 *     viene, es la BASE: la UI nunca contradice lo que el agente decidió.
 *   - `grounding_provenance` → array [{entity_id, confidence, source,
 *     validation_level}] por entidad resuelta contra el grafo AGE. Primer
 *     paso CLIENT-SIDE: refina la base con el nivel de curaduría del dato
 *     (expert_reviewed / verificado_openalex ≠ claude_draft ≠ disputado).
 *
 * REGLA DE COMBINACIÓN (conservadora, honesta): el nivel final es el PEOR
 * entre el semáforo del sidecar y el nivel de curaduría de la procedencia.
 * El cliente puede DEGRADAR (un "answer" con datos claude_draft baja a
 * ámbar: "está en el catálogo pero aún en revisión") pero JAMÁS sube un
 * rojo/ámbar del sidecar a verde — la política del agente manda.
 *
 * PUNTO DE ENGANCHE BACKEND: cuando el sidecar empiece a emitir un score
 * por-turno ya combinado (validation_level incluido), basta con que llegue
 * en `grounding_semaphore` — este módulo lo respeta como base y el refine
 * client-side se vuelve no-op si los niveles coinciden. No hay que tocar la
 * UI (SemaforoConfianza.jsx solo consume `computeSemaforoTurno`).
 *
 * Vocabulario `validation_level` (enum canónico del catálogo, ver
 * scripts/validate-catalog.mjs AMB-26): claude_draft, powo_validated,
 * agrosavia_verified, expert_reviewed, published. Las aristas del grafo
 * además traen `disputed` y `verificado_openalex` (booleans) — se aceptan
 * como señales si el sidecar las propaga en el item de procedencia.
 *
 * Wording: español de Colombia, cálido y campesino. El ROJO se lee como
 * HONESTIDAD ("se lo digo de frente"), no como error del sistema.
 */

/** Orden del semáforo: menor = más confiable. */
const RANGO = { verde: 0, ambar: 1, rojo: 2 };

/** Niveles de curaduría que cuentan como VERIFICADOS (tier verde). */
const NIVELES_VERIFICADOS = new Set([
  'expert_reviewed',
  'published',
  'agrosavia_verified',
  'powo_validated',
  'verificado_openalex',
  'openalex_verified',
]);

/** Borrador generado por IA, aún sin revisión humana/institucional. */
const NIVELES_BORRADOR = new Set(['claude_draft']);

/** Fuentes en desacuerdo (aristas disputed del grafo — no se borran, se marcan). */
const NIVELES_DISPUTA = new Set(['disputed', 'en_disputa']);

/**
 * Primer paso CLIENT-SIDE: nivel del semáforo según la CURADURÍA de la
 * procedencia (validation_level + source por afirmación). No mira la
 * política del sidecar — eso lo combina computeSemaforoTurno.
 *
 * Reglas (espejo del encargo del operador):
 *   VERDE  → toda la procedencia está verificada (expert_reviewed,
 *            published, agrosavia_verified, powo_validated u OpenAlex).
 *   ÁMBAR  → hay disputa entre fuentes, hay borradores claude_draft, la
 *            verificación es parcial (mezcla), o solo hay UNA fuente
 *            trazable sin revisión.
 *   ROJO   → sin procedencia, o nada trazable ni revisado (sin verificar).
 *
 * Total y defensiva: acepta cualquier input (no-array, items basura) sin
 * lanzar. La forma esperada de cada item es {entity_id, confidence, source,
 * validation_level, disputed?, verificado_openalex?}.
 *
 * @param {*} provenance
 * @returns {{ nivel: 'verde'|'ambar'|'rojo', motivo: string }}
 */
export function nivelDeProvenance(provenance) {
  const items = Array.isArray(provenance)
    ? provenance.filter((p) => p && typeof p === 'object')
    : [];
  if (items.length === 0) {
    return { nivel: 'rojo', motivo: 'sin_respaldo' };
  }

  let verificados = 0;
  let borradores = 0;
  let disputados = 0;
  let sinNivel = 0;
  let trazables = 0;

  for (const item of items) {
    const vl = typeof item.validation_level === 'string'
      ? item.validation_level.trim().toLowerCase()
      : '';
    const enDisputa = item.disputed === true || NIVELES_DISPUTA.has(vl);
    const openalex = item.verificado_openalex === true;

    if (enDisputa) disputados += 1;
    else if (openalex || NIVELES_VERIFICADOS.has(vl)) verificados += 1;
    else if (NIVELES_BORRADOR.has(vl)) borradores += 1;
    else sinNivel += 1;

    if (typeof item.source === 'string' && item.source.trim().length > 0) {
      trazables += 1;
    }
  }

  // Disputa manda sobre verde: si las fuentes no coinciden, se avisa.
  if (disputados > 0) return { nivel: 'ambar', motivo: 'fuentes_en_disputa' };
  // Todo verificado → verde (aunque sea una sola afirmación: un dato
  // expert_reviewed ES un dato revisado — el "1 sola fuente = ámbar" del
  // encargo aplica a datos SIN revisión).
  if (verificados === items.length) return { nivel: 'verde', motivo: 'verificado' };
  // Mezcla con al menos algo verificado → ámbar honesto (parcial).
  if (verificados > 0) return { nivel: 'ambar', motivo: 'verificacion_parcial' };
  // Solo borradores IA → ámbar (está en el catálogo, pero aún en revisión).
  if (borradores > 0) return { nivel: 'ambar', motivo: 'borrador_en_revision' };
  // Nada revisado, pero al menos hay fuente trazable → ámbar "una sola fuente".
  if (trazables > 0) return { nivel: 'ambar', motivo: 'una_sola_fuente' };
  // Nada revisado, nada trazable → rojo honesto.
  return { nivel: 'rojo', motivo: 'sin_verificar' };
}

/**
 * Semáforo del TURNO completo. Combina (peor-de-los-dos):
 *   1. base = `metadata.grounding_semaphore` (decisión REAL del sidecar) si
 *      viene válida; si no, se deriva de `grounding_policy` (answer/hedge/
 *      abstain); si tampoco, la base es el nivel de la procedencia.
 *   2. refine = nivelDeProvenance(grounding_provenance) — solo puede
 *      DEGRADAR la base, nunca subirla.
 *
 * Devuelve null si el turno no trae NINGUNA señal de grounding (mensajes
 * viejos, turnos offline, sidecar apagado) — la UI no pinta semáforo y los
 * sellos existentes (SourceBadge) siguen contando la historia.
 *
 * @param {Object|null|undefined} metadata - metadata del mensaje assistant.
 * @returns {null | {
 *   nivel: 'verde'|'ambar'|'rojo',
 *   motivo: string,
 *   origen: 'sidecar'|'cliente'|'sidecar+cliente',
 *   policy: string|null,
 *   reason: string|null,
 *   provenance: Array<Object>,
 * }}
 */
export function computeSemaforoTurno(metadata) {
  const md = metadata && typeof metadata === 'object' ? metadata : {};

  const backendRaw = typeof md.grounding_semaphore === 'string'
    ? md.grounding_semaphore.trim().toLowerCase()
    : '';
  const backend = RANGO[backendRaw] !== undefined ? backendRaw : null;

  const policy = typeof md.grounding_policy === 'string' ? md.grounding_policy : null;
  const policyNivel = policy === 'answer'
    ? 'verde'
    : policy === 'hedge'
      ? 'ambar'
      : policy === 'abstain'
        ? 'rojo'
        : null;

  const provenance = Array.isArray(md.grounding_provenance)
    ? md.grounding_provenance.filter((p) => p && typeof p === 'object')
    : null;

  // Sin señal de grounding de ningún tipo → sin semáforo (graceful).
  if (!backend && !policyNivel && !provenance) return null;

  const base = backend || policyNivel;
  const refine = provenance ? nivelDeProvenance(provenance) : null;

  /** @type {'verde'|'ambar'|'rojo'} */
  let nivel;
  /** @type {string} */
  let motivo;
  /** @type {'sidecar'|'cliente'|'sidecar+cliente'} */
  let origen;
  if (base && refine) {
    // Peor-de-los-dos: el refine de curaduría solo degrada, nunca sube.
    if (RANGO[refine.nivel] > RANGO[base]) {
      nivel = refine.nivel;
      motivo = refine.motivo;
      origen = 'sidecar+cliente';
    } else {
      nivel = base;
      motivo = base === 'verde' ? 'verificado' : base === 'ambar' ? 'respaldo_parcial' : 'sin_respaldo';
      // Si la curaduría coincide con la base, su motivo es más específico.
      if (refine.nivel === base) motivo = refine.motivo;
      origen = backend ? 'sidecar' : 'cliente';
    }
  } else if (base) {
    nivel = base;
    motivo = base === 'verde' ? 'verificado' : base === 'ambar' ? 'respaldo_parcial' : 'sin_respaldo';
    origen = backend ? 'sidecar' : 'cliente';
  } else {
    nivel = refine.nivel;
    motivo = refine.motivo;
    origen = 'cliente';
  }

  return {
    nivel,
    motivo,
    origen,
    policy,
    reason: typeof md.grounding_reason === 'string' ? md.grounding_reason : null,
    provenance: provenance || [],
  };
}

/**
 * Copy del semáforo por nivel — cálido, campesino, honesto. El rojo se
 * enuncia como rasgo de confianza ("se lo digo de frente"), no como falla.
 */
export const SEMAFORO_COPY = {
  verde: {
    label: 'Dato respaldado',
    explica: 'Esto viene del catálogo Chagra y pasó revisión contra fuentes de confianza. No es solo palabra del modelo. Aun así, su terreno manda: ante la duda, confírmelo con su técnico.',
  },
  ambar: {
    label: 'Verifique antes de aplicar',
    explica: 'Hay respaldo, pero no completo: parte del dato aún está en revisión o las fuentes no coinciden del todo. Úselo como referencia y confírmelo antes de aplicarlo en su cultivo.',
  },
  rojo: {
    label: 'Sin verificar — se lo decimos de frente',
    explica: 'Para esto no encontramos respaldo verificado en el catálogo. Preferimos decírselo de frente antes que inventarle: consúltelo con un agrónomo o técnico de confianza.',
  },
};

/**
 * Detalle del MOTIVO (la línea fina dentro del panel de procedencia).
 * Claves = motivos que emiten nivelDeProvenance / computeSemaforoTurno.
 */
export const MOTIVO_COPY = {
  verificado: 'Todas las afirmaciones fuertes tienen fuente revisada.',
  verificacion_parcial: 'Una parte del dato está verificada; otra parte sigue en revisión.',
  borrador_en_revision: 'El dato está en el catálogo, pero aún es borrador en revisión.',
  fuentes_en_disputa: 'Las fuentes consultadas no están de acuerdo entre sí — se lo mostramos tal cual.',
  una_sola_fuente: 'Solo respalda este dato una fuente, sin revisión adicional todavía.',
  respaldo_parcial: 'El respaldo del catálogo para este dato es parcial.',
  sin_respaldo: 'El agente no encontró anclaje en el catálogo para este tema.',
  sin_verificar: 'Ninguna afirmación de esta respuesta tiene fuente verificada.',
};

/* ── Procedencia por-afirmación: helpers de presentación ────────────────── */

/**
 * Mapa institucional de fuentes conocidas. Se matchea por substring
 * case-insensitive contra el `source` crudo del grafo (que es texto libre:
 * "Agrosavia", una URL, un DOI, "SIPSA-DANE 2025", etc.).
 */
const FUENTES_CONOCIDAS = [
  { patron: /openalex/i, label: 'Verificado OpenAlex' },
  { patron: /agrosavia/i, label: 'Agrosavia' },
  { patron: /sipsa|dane/i, label: 'SIPSA · DANE' },
  { patron: /ideam/i, label: 'IDEAM' },
  { patron: /powo|kew/i, label: 'POWO · Kew Gardens' },
  { patron: /\bfao\b/i, label: 'FAO' },
  { patron: /\bica\b/i, label: 'ICA' },
  { patron: /cipav/i, label: 'CIPAV' },
];

/**
 * Describe la fuente de una afirmación para el chip del panel.
 * - source vacío/null → "Catálogo Chagra (grafo)" (la entidad SÍ se resolvió
 *   contra AGE; lo que falta es la cita puntual).
 * - URL http(s) → label institucional (o el hostname) + url clickeable.
 * - DOI (10.xxxx/...) → label "DOI …" + link a doi.org.
 * - Texto libre → label institucional si matchea, o el texto tal cual.
 *
 * @param {string|null|undefined} source
 * @returns {{ label: string, url: string|null }}
 */
export function describeFuente(source) {
  const raw = typeof source === 'string' ? source.trim() : '';
  if (!raw) return { label: 'Catálogo Chagra (grafo)', url: null };

  // DOI directo (10.xxxx/...) o URL doi.org.
  const doiMatch = raw.match(/\b(10\.\d{4,9}\/[^\s"']+)/);
  if (doiMatch) {
    return { label: `DOI ${doiMatch[1]}`, url: `https://doi.org/${doiMatch[1]}` };
  }

  const conocida = FUENTES_CONOCIDAS.find((f) => f.patron.test(raw));

  if (/^https?:\/\//i.test(raw)) {
    let label = conocida ? conocida.label : raw;
    if (!conocida) {
      try {
        label = new URL(raw).hostname.replace(/^www\./, '');
      } catch (_) {
        label = raw;
      }
    }
    return { label, url: raw };
  }

  return { label: conocida ? conocida.label : raw, url: null };
}

/**
 * Etiqueta humana + nivel de color del chip de `validation_level`.
 * @param {string|null|undefined} validationLevel
 * @returns {{ label: string, nivel: 'verde'|'ambar' }}
 */
export function nivelValidacionInfo(validationLevel) {
  const vl = typeof validationLevel === 'string'
    ? validationLevel.trim().toLowerCase()
    : '';
  switch (vl) {
    case 'expert_reviewed':
      return { label: 'Revisado por experto', nivel: 'verde' };
    case 'published':
      return { label: 'Publicación científica', nivel: 'verde' };
    case 'agrosavia_verified':
      return { label: 'Verificado Agrosavia', nivel: 'verde' };
    case 'powo_validated':
      return { label: 'Validado POWO (Kew)', nivel: 'verde' };
    case 'verificado_openalex':
    case 'openalex_verified':
      return { label: 'Verificado OpenAlex', nivel: 'verde' };
    case 'disputed':
    case 'en_disputa':
      return { label: 'Fuentes en desacuerdo', nivel: 'ambar' };
    case 'claude_draft':
      return { label: 'Borrador IA · en revisión', nivel: 'ambar' };
    default:
      return { label: 'Aún sin revisión', nivel: 'ambar' };
  }
}

/**
 * Humaniza un entity_id slug del grafo ("coffea-arabica" → "Coffea arabica").
 * @param {string|null|undefined} entityId
 * @returns {string}
 */
export function humanizarEntidad(entityId) {
  const raw = typeof entityId === 'string' ? entityId.trim() : '';
  if (!raw) return 'Dato del turno';
  const texto = raw.replace(/[-_]+/g, ' ').trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Confianza 0..1 → porcentaje entero 0..100 (clamp defensivo: acepta
 * cualquier input; null/undefined/''/no-numérico → null, fuera de rango se
 * recorta a [0,100]).
 * @param {*} confidence
 * @returns {number|null}
 */
export function confianzaPorcentaje(confidence) {
  if (confidence == null || confidence === '') return null;
  const n = Number(confidence);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(1, Math.max(0, n)) * 100);
}
