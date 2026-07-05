/**
 * Helpers de respuesta del AgentScreen.
 *
 * Mantienen la correccion post-LLM como bloque de prefijo, sin duplicarla si
 * ya entro antes en el mismo turno.
 */

/**
 * Antepone un bloque de correccion a la respuesta, de forma idempotente.
 *
 * @param {string} responseText
 * @param {string} correctionBlock
 * @returns {string}
 */
export function prependCorrectionBlock(responseText, correctionBlock) {
  const response = typeof responseText === 'string' ? responseText : '';
  const block = typeof correctionBlock === 'string' ? correctionBlock.trim() : '';
  if (!block) return response;
  if (!response) return block;
  if (response.startsWith(block)) return response;
  return `${block}\n\n${response}`;
}
