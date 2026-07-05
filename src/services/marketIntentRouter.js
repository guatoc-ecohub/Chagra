/**
 * marketIntentRouter.js — routing determinístico de intención de PRECIO/MERCADO.
 *
 * Por qué existe: el bug histórico "papa precio" (ver cabecera de
 * `chipIntentRouter.js`) es que una pregunta de PRECIO ("a cómo está la
 * papa") puede terminar respondida como si fuera agronómica (viabilidad,
 * ficha de especie, variedades) porque el planner NLU del sidecar (LLM
 * chico) o `planKnowledgeIntent` (que también dispara con la especie ya
 * resuelta) deciden el tool sin saber que la intención real es de mercado.
 *
 * La detección de intención YA existe y está bien testeada
 * (`classifyQueryIntent` en outputGuards.js, A12) — pero antes de este router
 * solo se usaba para decidir si correr los guards de SIEMBRA, nunca para
 * decidir qué TOOL llamar. Este módulo cierra ese hueco: replica el patrón
 * PURO/SÍNCRONO/cero-red de `knowledgeIntentRouter`/`agentNluFallback` y
 * devuelve el plan determinístico `get_precio_sipsa` (acción `latest_price`)
 * cuando la intención es de precio.
 *
 * El caller (AgentScreen) debe ejecutar este plan ANTES de
 * `planKnowledgeIntent`/`planNlu`/`planNluFallback` — así una consulta de
 * precio NUNCA llega a un planner que pueda misroutearla. El resultado
 * (available:true/false) ya tiene su propio manejo determinista aguas abajo
 * en `agentService.js`: `buildPriceAnswer` CANTA el número real (dato vivo de
 * la tabla `chagra.sipsa_precios`, feed diario DANE — NUNCA la tabla estática
 * `precioReferencia.js`), y `buildPriceDeclineContext` declina honesto +
 * orienta a SIPSA/DANE/Corabastos cuando no hay dato. Este router solo
 * garantiza que el TOOL correcto sea el que se ejecuta.
 *
 * Extracción del `producto`: prioridad a la ESPECIE ya resuelta por
 * `resolveEntities` (el texto que el usuario mencionó literalmente,
 * `mentioned`, preserva variedades como "papa criolla" vs "papa negra" que
 * SIPSA cotiza distinto — más específico que el `nombre_comun` genérico del
 * grafo). Sin entidad resuelta, se extrae por regex: se recorta el fraseo de
 * intención de precio/mercado y los artículos, dejando el sustantivo. Sin
 * producto reconocible, no dispara (el flujo normal decide).
 */

import { classifyQueryIntent } from './outputGuards.js';

/** ¿La entidad resuelta es una especie/cultivo (no plaga, no biopreparado)? */
function _isSpecies(e) {
  if (!e || typeof e !== 'object') return false;
  const kind = String(e.kind || '').toLowerCase();
  if (!kind) return true; // sin kind = asumimos especie (laxo, igual que knowledgeIntentRouter)
  return kind === 'species' || kind === 'planta' || kind === 'especie' || kind === 'cultivo';
}

/**
 * Normaliza a minúsculas SIN tildes (criterio del resto del pipeline) y sin
 * signos de interrogación/exclamación (¿¡?! no aportan al producto y, como
 * los de apertura españoles no tienen contraparte al final, ensucian la
 * extracción si solo se recorta el borde final del texto).
 */
function _norm(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿¡?!]/g, '');
}

// Fraseo de intención de precio/mercado a recortar para aislar el PRODUCTO.
// Deliberadamente amplio (espejo de PRICE_INTENT_PATTERNS en outputGuards.js):
// sobra recortar de más (el residuo se limpia con los artículos) a dejar
// basura que el tool no pueda mapear a un producto SIPSA real.
const PRICE_PHRASING_RE =
  /\b(a\s+como\s+(esta|estan|va|van|vale|valen)|cuanto\s+(vale|valen|cuesta|cuestan|sale|salen|pagan|esta\s+pagando)|que\s+precio(\s+tiene[n]?)?|precio[s]?\s+(de|del)?|mercado\s+de|plaza\s+de\s+mercado|donde\s+(puedo\s+)?(vendo|vender|comprar|compro)|a\s+quien\s+(le\s+)?(vendo|vender)|vendo|vender|venta\s+de|comprar|compra\s+de|comprador\s+de|comercializ\w*|cosecha\s+para\s+(vender|venta)(\s+de)?|bulto[s]?\s+(de|a)|arroba[s]?\s+(de|a)|carga[s]?\s+(de|a))\b/g;
const LEADING_ARTICLE_RE = /^(el|la|los|las|un|una|unos|unas|mi|del|al|de)\s+/;
const TRAILING_PUNCT_RE = /[¿?¡!.,]+$/;

/**
 * Extrae el nombre del producto de una frase de precio, quitando el fraseo de
 * intención y los artículos colgantes. Best-effort: si no queda nada útil,
 * devuelve null (el caller no dispara sin producto reconocible).
 *
 * @param {string} text
 * @returns {string|null}
 */
function _extractProducto(text) {
  let t = _norm(text).replace(TRAILING_PUNCT_RE, '').trim();
  t = t.replace(PRICE_PHRASING_RE, ' ').replace(/\s+/g, ' ').trim();
  // Puede quedar un artículo colgante ("precio de" recortado deja "la papa");
  // se recorta hasta dos veces por si hay doble artículo residual.
  t = t.replace(LEADING_ARTICLE_RE, '').replace(LEADING_ARTICLE_RE, '').trim();
  return t || null;
}

/**
 * Deriva un plan determinístico `{ tool:'get_precio_sipsa', args, source }`
 * para una consulta de PRECIO/MERCADO, o `null` si la intención no es de
 * precio o no se pudo identificar un producto.
 *
 * @param {string} userMessage — texto crudo del usuario.
 * @param {Array<object>|null} [resolvedEntities] - entidades canónicas ya
 *   resueltas por `resolveEntities` ({ kind, canonical_id, mentioned,
 *   nombre_comun, ... }).
 * @returns {null | { tool: 'get_precio_sipsa', args: { action: 'latest_price', producto: string }, source: string }}
 */
export function planMarketIntent(userMessage, resolvedEntities = null) {
  if (typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    return null;
  }
  if (classifyQueryIntent(userMessage) !== 'precio') return null;

  const entities = Array.isArray(resolvedEntities) ? resolvedEntities : [];
  const speciesEntity = entities.find(
    (e) => _isSpecies(e) && (e.mentioned || e.nombre_comun || e.canonical_id),
  );
  const producto = speciesEntity
    ? String(speciesEntity.mentioned || speciesEntity.nombre_comun || speciesEntity.canonical_id).trim()
    : _extractProducto(userMessage);
  if (!producto) return null;

  return {
    tool: 'get_precio_sipsa',
    args: { action: 'latest_price', producto },
    source: speciesEntity ? 'market_precio_entidad' : 'market_precio_texto',
  };
}

// Export interno para testabilidad de los regex sin reflectar la closure.
export const __TEST__ = { PRICE_PHRASING_RE, LEADING_ARTICLE_RE, _extractProducto, _norm };
