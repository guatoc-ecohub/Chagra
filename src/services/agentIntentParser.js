/**
 * agentIntentParser.js — Detecta intenciones accionables del usuario en texto.
 *
 * Analiza el input del usuario para detectar si quiere realizar una accion
 * en Chagra (crear log, registrar cosecha, agendar riego, etc.)
 */

const ACTION_PATTERNS = [
  {
    id: 'registrar_cosecha',
    patterns: [
      /(?:reg(?:istr(?:ar|e|o))?[:\s]+(?:(?:la\s+)?cosecha|(?:\d+)\s*(?:kg|kilos?|libras?|unidades?|piezas?)(?:\s+de)?\s*\w+))/i,
      /(?:cosech(?:ar?|e|aste))/i,
      /(?:recolect(?:ar?|e|aste))/i,
      /(?:recog(?:i|iste|er)\s+(?:las?|el|los)\s+\w+)/i,
    ],
    toolName: 'crear_log',
    logType: 'log--harvest',
    extract: (text) => {
      const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(kg|kilos?|libras?|unidades?|piezas?|g)/i);
      const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
      const unit = qtyMatch ? qtyMatch[2].toLowerCase().replace(/kilo(s)?/, 'kg').replace(/libras?/, 'lb').replace(/piezas?/, 'unidades') : 'unidades';
      const plantMatch = text.match(/(?:de|del)\s+(\w+)/i);
      return { quantity: qty, unit, plantHint: plantMatch ? plantMatch[1] : null };
    },
  },
  {
    id: 'registrar_riego',
    patterns: [
      /(?:reg(?:istr(?:ar|e|o))?[:\s]+(?:el\s+)?riego)/i,
      /(?:reg(?:ué?|ar?|aste)\s+(?:las?|el|los)\s+\w+)/i,
      /(?:regar\s+(?:las?|el|los)\s+\w+)/i,
    ],
    toolName: 'crear_log',
    logType: 'log--input',
    extract: (text) => {
      const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(ml|L|litros?|galones?|baldes?)/i);
      return {
        quantity: qtyMatch ? parseFloat(qtyMatch[1]) : null,
        unit: qtyMatch ? qtyMatch[2].toLowerCase().replace(/litros?/, 'L').replace(/galones?/, 'L').replace(/baldes?/, 'L') : 'L',
        notes: 'Riego registrado via asistente de voz',
      };
    },
  },
  {
    id: 'registrar_observacion',
    patterns: [
      /(?:observ(?:ar?|é|aste|ación))/i,
      /(?:not(?:ar?|é|aste))/i,
      /(?:vi\s+(?:que|como|un|una|el|la|los|las))/i,
    ],
    toolName: 'crear_log',
    logType: 'log--observation',
    extract: (text) => {
      const cleanText = text.replace(/^(?:observ(?:ar?|é|aste|ación)|not(?:ar?|é|aste)|vi\s+)/i, '').trim();
      return { notes: cleanText || 'Observación registrada via asistente' };
    },
  },
  {
    id: 'registrar_aplicacion',
    patterns: [
      /(?:aplic(?:ar?|é|aste))/i,
      /(?:aplicaci[oó]n\s+de)/i,
      /(?:fertiliz(?:ar?|é|aste))/i,
      /(?:abon(?:ar?|é|aste))/i,
    ],
    toolName: 'crear_log',
    logType: 'log--input',
    extract: (text) => {
      const productMatch = text.match(/(?:de\s+)?(\w+(?:\s+\w+)?)/i);
      return {
        notes: `Aplicación: ${productMatch ? productMatch[1] : 'producto no especificado'}`,
        quantity: null,
        unit: null,
      };
    },
  },
];

/**
 * Analiza el texto del usuario y detecta si hay una intencion accionable.
 * @param {string} text - Texto del usuario
 * @returns {{ intent: Object|null, confidence: number }}
 */
export function parseIntent(text) {
  if (!text || typeof text !== 'string') return { intent: null, confidence: 0 };

  for (const action of ACTION_PATTERNS) {
    for (const pattern of action.patterns) {
      if (pattern.test(text)) {
        const params = action.extract(text);
        return {
          intent: {
            id: action.id,
            toolName: action.toolName,
            logType: action.logType,
            parameters: params,
            originalText: text,
          },
          confidence: 0.8,
        };
      }
    }
  }

  return { intent: null, confidence: 0 };
}

/**
 * Formatea los parametros detectados para mostrar en el modal de confirmacion.
 * @param {Object} intent
 * @returns {string}
 */
export function formatIntentDescription(intent) {
  const { id, parameters } = intent;

  switch (id) {
    case 'registrar_cosecha':
      return `Registrar cosecha de ${parameters.quantity} ${parameters.unit}${parameters.plantHint ? ` de ${parameters.plantHint}` : ''}`;
    case 'registrar_riego':
      return `Registrar riego${parameters.quantity ? ` (${parameters.quantity} ${parameters.unit})` : ''}`;
    case 'registrar_observacion':
      return `Registrar observación: "${parameters.notes}"`;
    case 'registrar_aplicacion':
      return `Registrar aplicación: ${parameters.notes}`;
    default:
      return `Ejecutar acción: ${id}`;
  }
}

export default {
  parseIntent,
  formatIntentDescription,
};