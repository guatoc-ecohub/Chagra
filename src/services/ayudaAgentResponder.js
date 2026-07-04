/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * ayudaAgentResponder.js — Arma la RESPUESTA GROUNDED del agente para preguntas
 * «¿cómo uso X?» / «¿qué puede hacer Chagra?».
 *
 * Toma la consulta (ya detectada como META por metaAyudaIntent) y la resuelve
 * contra el manifiesto de ayuda (ayudaFunciones). La respuesta se compone
 * DETERMINÍSTICAMENTE desde el manifiesto — sin LLM — así que NUNCA inventa una
 * función que no existe (anti-alucinación por construcción).
 *
 * Devuelve `{ content, ayudaAction }`:
 *   - content: texto en español colombiano para la burbuja del agente.
 *   - ayudaAction: acción de deep-link para el botón «Abrir …» (o null). El
 *     AgentScreen la adjunta al mensaje y ChatHistory pinta el botón, que navega
 *     con el mecanismo existente (onNavigate → HASH_VIEW_ROUTES).
 *
 * IMPORTANTE — español colombiano (tú/usted), NUNCA voseo argentino.
 */

import { matchAyudaFuncion, listAyudaFunciones } from '../data/ayudaFunciones.js';

/** Etiquetas amables por grupo del manifiesto. */
const GRUPO_LABEL = Object.freeze({
  cultivo: '🌿 Tus cultivos',
  cuidar: '🐛 Cuidar y sanar',
  planear: '📅 Planear',
  vender: '🛒 Vender',
  restaurar: '🌳 Restaurar',
  aprender: '📚 Aprender',
  observar: '🔍 Observar',
  registrar: '📝 Registrar',
  otras: 'Otras funciones',
});

/**
 * Construye la acción de deep-link para una función, o null si no es navegable.
 * @param {import('../data/ayudaFunciones.js').AyudaFuncion} f
 * @returns {{ label: string, view?: string, prompt?: string, tipo: string }|null}
 */
function buildAction(f) {
  if (!f || !f.accion) return null;
  if (f.accion.tipo === 'nav' && f.accion.view) {
    return { tipo: 'nav', label: `Abrir ${f.nombre}`, view: f.accion.view };
  }
  if (f.accion.tipo === 'ask' && f.accion.prompt) {
    return { tipo: 'ask', label: `Preguntar: ${f.nombre}`, prompt: f.accion.prompt };
  }
  return null;
}

/**
 * Texto de una función matcheada.
 * @param {import('../data/ayudaFunciones.js').AyudaFuncion} f
 * @param {import('../data/ayudaFunciones.js').AyudaFuncion[]} alternativas
 * @returns {string}
 */
function formatFuncion(f, alternativas) {
  const pasos = f.como_se_usa.map((p, i) => `${i + 1}. ${p}`).join('\n');
  let out = `**${f.nombre}** — ${f.que_hace}\n\n`;
  out += `Cómo se usa:\n${pasos}\n`;
  if (f.cuando_sirve && f.cuando_sirve !== f.que_hace) {
    out += `\nCuándo te sirve: ${f.cuando_sirve}\n`;
  }
  if (alternativas && alternativas.length > 0) {
    const otras = alternativas.map((a) => a.nombre).join(', ');
    out += `\nSi buscabas otra cosa, también tengo: ${otras}.`;
  }
  return out.trim();
}

/**
 * Texto del catálogo completo de funciones (para «¿qué puede hacer Chagra?»).
 * @returns {string}
 */
function formatCapabilities() {
  const { total, grupos } = listAyudaFunciones();
  let out = `Chagra te ayuda con ${total} funciones. Estas son las principales:\n`;
  for (const [grupo, funcs] of Object.entries(grupos)) {
    const label = GRUPO_LABEL[grupo] || grupo;
    const items = funcs.map((f) => `- ${f.nombre}: ${f.que_hace}`).join('\n');
    out += `\n${label}\n${items}\n`;
  }
  out += '\nPregúntame «¿cómo uso ...?» por cualquiera de estas para que te guíe paso a paso.';
  return out.trim();
}

/**
 * buildAyudaResponse — respuesta groundeada para una consulta META.
 *
 * @param {{ isMeta: boolean, kind?: string, consulta?: string }} meta - salida
 *   de detectMetaAyudaIntent.
 * @returns {{ content: string, ayudaAction: object|null } | null} null si no es
 *   META (el caller sigue el flujo normal).
 */
export function buildAyudaResponse(meta) {
  if (!meta || !meta.isMeta) return null;
  const consulta = meta.consulta || '';

  // Catálogo completo si preguntó por capacidades y NO nombró una función
  // concreta resoluble.
  if (meta.kind === 'capabilities') {
    const m = matchAyudaFuncion(consulta);
    // Si además nombró una función concreta con match fuerte, guiamos a esa;
    // si no, damos el catálogo.
    if (!m.found) {
      return { content: formatCapabilities(), ayudaAction: null };
    }
    // "qué puede hacer con el mapa" → describe el mapa; pero el caso típico
    // ("qué puede hacer chagra") no matchea función → catálogo.
    return { content: formatCapabilities(), ayudaAction: null };
  }

  // how-to: resolver la función concreta.
  const matchHowto = matchAyudaFuncion(consulta);
  if (matchHowto.found) {
    return {
      content: formatFuncion(matchHowto.funcion, matchHowto.alternativas),
      ayudaAction: buildAction(matchHowto.funcion),
    };
  }

  // HONESTO — no hay función que matchee: NO inventamos. Ofrecemos las reales.
  // tsc corre con strict:false (jsconfig.json): el narrowing de CFA no reduce
  // el branch `found:false` de la unión tras el `if` de arriba (limitación
  // conocida sin strictNullChecks). Cast explícito, ya validado por el `if`.
  const { sugerencias } = /** @type {{ found: false, sugerencias: import('../data/ayudaFunciones.js').AyudaFuncion[] }} */ (matchHowto);
  const sugeridas = (sugerencias || []).map((s) => s.nombre).join(', ');
  const content =
    'Todavía no tengo esa función en Chagra. ' +
    (sugeridas
      ? `Lo que sí puedo hacer, por ejemplo: ${sugeridas}. Dime cuál te sirve y te guío.`
      : 'Escríbeme «¿qué puede hacer Chagra?» y te muestro todo lo que tengo.');
  return { content, ayudaAction: null };
}

export default { buildAyudaResponse };
