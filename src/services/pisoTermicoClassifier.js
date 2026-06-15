import PISOS from '../data/piso-termico.json';

/**
 * Clasifica el piso termico colombiano segun altitud.
 * @param {number} altitudMsnm
 * @returns {object|null}
 */
export function clasificarPisoTermico(altitudMsnm) {
  if (typeof altitudMsnm !== 'number' || altitudMsnm < 0) return null;
  const piso = PISOS.pisos.find((p) => {
    const msnm = p.msnm || '';
    // "0-1000", ">3000", "<0"
    if (msnm.startsWith('>')) return altitudMsnm > Number(msnm.slice(1));
    if (msnm.startsWith('<')) return altitudMsnm < Number(msnm.slice(1));
    const [min, max] = msnm.split('-').map(Number);
    if (!isNaN(min) && !isNaN(max)) return altitudMsnm >= min && altitudMsnm <= max;
    if (!isNaN(min)) return altitudMsnm >= min;
    return false;
  });
  return piso || null;
}
