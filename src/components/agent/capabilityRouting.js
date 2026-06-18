/**
 * capabilityRouting.js — routing ÚNICO de un pick de la MANO de Chagra.
 *
 * El home (AgentHero) y la conversación (AgentScreen) muestran la MISMA mano
 * (AgentRedMenu, sobre el mismo CAPABILITY_MANIFEST). Este módulo es la ÚNICA
 * definición de qué hace un pick: antes vivía duplicado dentro de AgentHero
 * (`pickCapability`). Puro respecto al cap; delega la acción a los handlers que
 * provee cada consumidor.
 *
 * Vive en archivo aparte (no en AgentShell.jsx) para no romper react-refresh
 * (only-export-components): los componentes solo exportan componentes.
 */

/**
 * @param {object} cap — entrada del CAPABILITY_MANIFEST seleccionada.
 * @param {object} handlers
 * @param {(prompt:string)=>void} [handlers.onAsk] — enviar una pregunta.
 * @param {(view:string)=>void} [handlers.onNav] — navegar a otra vista.
 * @param {()=>void} [handlers.onPhoto] — abrir el selector de foto.
 * @returns {boolean} true si se ejecutó una acción; false si fue no-op.
 */
export function mapCapabilityPick(cap, { onAsk, onNav, onPhoto } = {}) {
  if (!cap) return false;
  const r = cap.heroRoute || cap.route;
  if (cap.status === 'soon' || !r || r.kind === 'unavailable') return false;
  if (r.kind === 'ask') {
    onAsk?.(r.prompt);
    return true;
  }
  if (r.kind === 'nav') {
    onNav?.(r.view);
    return true;
  }
  if (r.kind === 'photo') {
    onPhoto?.();
    return true;
  }
  return false;
}

export default mapCapabilityPick;
