import sipsaProductMap from '../data/sipsaProductMap.json';

const fold = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

export function resolveSipsaProduct(nombreSipsa) {
  const key = fold(nombreSipsa);
  return sipsaProductMap[key] || null;
}
