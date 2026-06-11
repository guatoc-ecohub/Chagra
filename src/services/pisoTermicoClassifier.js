import PISOS from '../data/piso-termico.json';

export function clasificarPisoTermico(altitudMsnm) {
  if (typeof altitudMsnm !== 'number' || altitudMsnm < 0) return null;
  const piso = PISOS.pisos.find((p) => {
    const [min, max] = p.msnm.split('-').map(Number);
    if (max) return altitudMsnm >= min && altitudMsnm <= max;
    return altitudMsnm >= min; // paramo: >3000
  });
  return piso || null;
}
