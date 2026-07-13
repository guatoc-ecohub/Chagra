import { normalizeTerm } from '../../services/red';

/**
 * contactoPublico — matching best-effort entre un vecino sugerido por el
 * matchmaking y las ofertas del mercado donde ese vecino expuso (opt-in) un
 * teléfono público. Vive aparte del componente (regla react-refresh) y es
 * PURO, para poderse testear sin UI.
 *
 * Privacidad (inviolable, services/red/README.md): la red NUNCA filtra un
 * número que el par no haya hecho público en el mercado. Por eso el matching
 * solo mira ofertas reales (no demo) CON teléfono, y si no hay coincidencia
 * devuelve null — el caller degrada al mensaje sugerido, nunca adivina.
 *
 * @param {import('../../services/red/types.js').PeerMatch} peer
 * @param {Array<Object>} ofertas - registros de marketplace_ofertas.
 * @returns {Object|null} la oferta con contacto público, o null.
 */
export function encontrarContactoPublico(peer, ofertas) {
  if (!peer || !Array.isArray(ofertas)) return null;
  const productoNorm = normalizeTerm(peer.producto);
  if (!productoNorm) return null;
  const candidatas = ofertas.filter((o) => (
    o && !o.demo && o.contactoTel
    && normalizeTerm(o.producto) === productoNorm
  ));
  if (candidatas.length === 0) return null;
  const veredaNorm = normalizeTerm(peer.vereda);
  const mismaVereda = candidatas.find((o) => veredaNorm && normalizeTerm(o.vereda) === veredaNorm);
  return mismaVereda || candidatas[0];
}
